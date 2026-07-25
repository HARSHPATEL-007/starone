import { Router, Request, Response, NextFunction } from "express";
import { campaignSummary } from "../services/CampaignSummaryService";
import { DataStore } from "../services/DataStore";

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
    res.json(summaries);
  })
);

router.get(
  "/portfolio",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const campaigns = await loadCampaigns(tenantId);
    const portfolio = campaignSummary.generatePortfolioSummary(campaigns);
    res.json(portfolio);
  })
);

router.get(
  "/campaign/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const c = await DataStore.findCampaignById(req.params.id, tenantId) as any;
    if (!c) return res.status(404).json({ error: "Campaign not found" });
    const metrics = (await DataStore.findMetrics({ tenantId, campaignId: req.params.id })) as any[];
    const campaign = {
      name: c.name, status: c.status, type: c.type || "performance",
      platforms: c.platforms || [],
      budget: c.budget || { daily: 0, lifetime: 0, spent: 0, remaining: 0 },
      metrics: metrics[0], startDate: c.startDate, endDate: c.endDate, tags: c.tags,
    };
    const summary = campaignSummary.generateSummary(campaign);
    res.json(summary);
  })
);

export default router;
