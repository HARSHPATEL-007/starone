import { Router, Request, Response, NextFunction } from "express";
import { campaignSummary } from "../services/CampaignSummaryService";
import { DataStore } from "../services/DataStore";
import { sendSuccess, safeInt } from "./route-utils";
import { executiveSummaryOrchestrator } from "../business-logic/ExecutiveSummaryOrchestrator";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

async function loadCampaigns(tenantId: string) {
  const result = await DataStore.findCampaigns({ tenantId }, { createdAt: -1 }, 0, 100);
  const campaigns = ("campaigns" in result ? (result as any).campaigns : result) as any[];
  const metrics = await DataStore.findMetrics({ tenantId });
  return campaigns.map((c: any) => ({
    name: c.name, status: c.status, type: c.type || "performance",
    platforms: c.platforms || [],
    budget: c.budget || { daily: 0, lifetime: 0, spent: 0, remaining: 0 },
    metrics: (metrics as any[]).find((m: any) => m.campaignId === (c._id || c.id)),
    startDate: c.startDate, endDate: c.endDate, tags: c.tags,
  }));
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const campaigns = await loadCampaigns(tenantId);
    const summaries = campaignSummary.generateAll(campaigns);
    const statusDist: Record<string, number> = {};
    for (const c of campaigns) statusDist[c.status || "unknown"] = (statusDist[c.status || "unknown"] || 0) + 1;
    sendSuccess(res, summaries, { count: summaries.length, statusDistribution: statusDist });
  })
);

router.get(
  "/portfolio",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const campaigns = await loadCampaigns(tenantId);
    const portfolio = campaignSummary.generatePortfolioSummary(campaigns);
    sendSuccess(res, portfolio);
  })
);

router.get(
  "/campaign/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const c = await DataStore.findCampaignById(req.params.id, tenantId) as any;
    if (!c) throw new AppError(404, "Campaign not found");
    const metrics = (await DataStore.findMetrics({ tenantId, campaignId: req.params.id })) as any[];
    const campaign = {
      name: c.name, status: c.status, type: c.type || "performance",
      platforms: c.platforms || [],
      budget: c.budget || { daily: 0, lifetime: 0, spent: 0, remaining: 0 },
      metrics: metrics[0], startDate: c.startDate, endDate: c.endDate, tags: c.tags,
    };
    const summary = campaignSummary.generateSummary(campaign);
    sendSuccess(res, summary);
  })
);

router.get(
  "/orchestrate/executive",
  asyncHandler(async (req: Request, res: Response) => {
    const days = safeInt(req.query.days, 30);
    const report = await executiveSummaryOrchestrator.generate(req.user!.tenantId, days);
    sendSuccess(res, report);
  })
);

export default router;
