import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { source, campaign } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (source) filter.source = source;
    if (campaign) filter.campaign = campaign;
    const links = await DataStore.findUtmLinks(filter);
    sendSuccess(res, links, { count: links.length, source: source || null, campaign: campaign || null });
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { baseUrl, source, medium, campaign, content, term } = req.body;
    if (!baseUrl) throw new AppError(400, "Missing required field: baseUrl");
    const url = new URL(baseUrl);
    if (source) url.searchParams.set("utm_source", source);
    if (medium) url.searchParams.set("utm_medium", medium);
    if (campaign) url.searchParams.set("utm_campaign", campaign);
    if (content) url.searchParams.set("utm_content", content);
    if (term) url.searchParams.set("utm_term", term);
    const fullUrl = url.toString();
    const parsed = { source, medium, campaign, content, term, baseUrl };
    const link = await DataStore.createUtmLink({
      tenantId,
      baseUrl,
      source,
      medium,
      campaign,
      content,
      term,
      url: fullUrl,
      clicks: 0,
      conversions: 0,
      createdBy: req.user!.userId,
    });
    sendCreated(res, { url: fullUrl, parsed, link });
  })
);

router.get(
  "/performance",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const links = await DataStore.findUtmLinks({ tenantId });
    const bySource: Record<string, any> = {};
    const byCampaign: Record<string, any> = {};
    for (const l of links) {
      const src = l.source || "unknown";
      const camp = l.campaign || "unknown";
      if (!bySource[src]) bySource[src] = { source: src, clicks: 0, conversions: 0 };
      bySource[src].clicks += l.clicks || 0;
      bySource[src].conversions += l.conversions || 0;
      if (!byCampaign[camp]) byCampaign[camp] = { campaign: camp, clicks: 0, conversions: 0 };
      byCampaign[camp].clicks += l.clicks || 0;
      byCampaign[camp].conversions += l.conversions || 0;
    }
    sendSuccess(res, {
      bySource: Object.values(bySource),
      byCampaign: Object.values(byCampaign),
    });
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const links = DataStore.mem().find("utm_links", (l: any) => l.tenantId === tenantId);
    const totalLinks = links.length;
    const clicksTotal = links.reduce((sum: number, l: any) => sum + (l.clicks || 0), 0);
    const conversionsTotal = links.reduce((sum: number, l: any) => sum + (l.conversions || 0), 0);
    const totalCvr = clicksTotal > 0 ? parseFloat(((conversionsTotal / clicksTotal) * 100).toFixed(2)) : 0;
    const sources = [...new Set(links.map((l: any) => l.source).filter(Boolean))];
    const campaigns = [...new Set(links.map((l: any) => l.campaign).filter(Boolean))];
    sendSuccess(res, { totalLinks, clicksTotal, conversionsTotal, totalCvr, sources, campaigns });
  })
);

export default router;
