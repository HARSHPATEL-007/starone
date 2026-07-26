import { Router, Request, Response, NextFunction } from "express";
import { budgetPacing } from "../services/BudgetPacingService";
import { DataStore } from "../services/DataStore";
import { sendSuccess, safeInt } from "./route-utils";
import { campaignPacingOrchestrator } from "../business-logic/CampaignPacingOrchestrator";
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
    id: c._id || c.id,
    name: c.name,
    status: c.status,
    startDate: c.startDate,
    endDate: c.endDate,
    budget: c.budget || { daily: 0, lifetime: 0, spent: 0, remaining: 0, currency: "USD" },
    metrics: (metrics as any[]).find((m: any) => m.campaignId === (c._id || c.id)),
  }));
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const campaigns = await loadCampaigns(tenantId);
    const results = budgetPacing.calculateAll(campaigns);
    const statusDist: Record<string, number> = {};
    for (const r of results) statusDist[r.status || "unknown"] = (statusDist[r.status || "unknown"] || 0) + 1;
    const atRisk = results.filter((r: any) => r.status === "danger" || r.status === "warning").length;
    sendSuccess(res, results, { count: results.length, statusDistribution: statusDist, atRisk });
  })
);

router.get(
  "/summary",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const campaigns = await loadCampaigns(tenantId);
    const results = budgetPacing.calculateAll(campaigns);
    const summary = budgetPacing.getSummary(results);
    sendSuccess(res, { results, summary });
  })
);

router.get(
  "/campaign/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const campaign = await DataStore.findCampaignById(req.params.id, tenantId) as any;
    if (!campaign) throw new AppError(404, "Campaign not found");
    const metrics = (await DataStore.findMetrics({ tenantId, campaignId: req.params.id })) as any[];
    const full = {
      id: campaign._id || campaign.id, name: campaign.name, status: campaign.status,
      startDate: campaign.startDate, endDate: campaign.endDate,
      budget: campaign.budget || { daily: 0, lifetime: 0, spent: 0, remaining: 0, currency: "USD" },
      metrics: metrics[0],
    };
    const result = budgetPacing.calculatePacing(full);
    sendSuccess(res, result);
  })
);

router.get(
  "/orchestrate/portfolio",
  asyncHandler(async (req: Request, res: Response) => {
    const report = await campaignPacingOrchestrator.analyzePortfolio(req.user!.tenantId);
    sendSuccess(res, report);
  })
);

router.get(
  "/orchestrate/campaign/:id",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const detail = await campaignPacingOrchestrator.analyzeCampaign(req.params.id, req.user!.tenantId);
      sendSuccess(res, detail);
    } catch (e: any) {
      res.status(404).json({ error: e.message });
    }
  })
);

export default router;
