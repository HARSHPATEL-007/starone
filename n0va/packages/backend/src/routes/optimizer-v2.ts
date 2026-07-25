import { Router, Request, Response, NextFunction } from "express";
import { campaignOptimizerService } from "../services/CampaignOptimizerService";
import { AppError } from "../middleware/errorHandler";
import { DataStore } from "../services/DataStore";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const dashboard = campaignOptimizerService.getDashboard(tenantId);
    res.json(dashboard);
  })
);

router.get(
  "/suggestions",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const suggestions = campaignOptimizerService.generateOptimizations(tenantId);
    res.json(suggestions);
  })
);

router.post(
  "/suggestions/:id/apply",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const suggestions = campaignOptimizerService.generateOptimizations(tenantId);
    const suggestion = suggestions.find(s => s.id === id);
    if (!suggestion) throw new AppError(404, "Suggestion not found");
    suggestion.applied = true;
    res.json({ success: true, suggestion });
  })
);

router.post(
  "/suggestions/:id/dismiss",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const suggestions = campaignOptimizerService.generateOptimizations(tenantId);
    const suggestion = suggestions.find(s => s.id === id);
    if (!suggestion) throw new AppError(404, "Suggestion not found");
    suggestion.dismissed = true;
    res.json({ success: true, suggestion });
  })
);

router.get(
  "/platforms",
  asyncHandler(async (_req: Request, res: Response) => {
    const configs = campaignOptimizerService.getPlatformConfigs();
    res.json(configs);
  })
);

router.post(
  "/portfolio",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const mem = DataStore["mem"]();
    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId && c.status === "active");
    const totalBudget = campaigns.reduce((s: number, c: any) => s + (c.budget?.lifetime || 0), 0);
    const totalSpent = campaigns.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0);
    const totalRemaining = campaigns.reduce((s: number, c: any) => s + (c.budget?.remaining || 0), 0);
    const avgSpendRate = totalBudget > 0 ? totalSpent / totalBudget : 0;
    res.json({ totalCampaigns: campaigns.length, totalBudget, totalSpent, totalRemaining, avgSpendRate, campaigns });
  })
);

export default router;
