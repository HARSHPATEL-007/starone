import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import { enhancedAttributionOrchestrator } from "../business-logic/EnhancedAttributionOrchestrator";
import { budgetOptimizerOrchestrator } from "../business-logic/BudgetOptimizerOrchestrator";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

// ─── Attribution ──────────────────────────────────────────────────

router.get(
  "/attribution/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const model = (req.query.model as string) || "last_click";
    const dash = await enhancedAttributionOrchestrator.getDashboard(req.user!.tenantId, model);
    sendSuccess(res, dash);
  })
);

router.post(
  "/attribution/path",
  asyncHandler(async (req: Request, res: Response) => {
    const { conversionId, campaignIds, touchpoints, conversionValue, model } = req.body;
    if (!conversionId || !campaignIds || !touchpoints) throw new AppError(400, "Missing required fields: conversionId, campaignIds, touchpoints");
    const path = await enhancedAttributionOrchestrator.createPath(conversionId, campaignIds, touchpoints, conversionValue || 0, model || "last_click");
    sendSuccess(res, path);
  })
);

router.get(
  "/attribution/models",
  asyncHandler(async (req: Request, res: Response) => {
    const comparison = await enhancedAttributionOrchestrator.getModelComparison(req.user!.tenantId);
    sendSuccess(res, comparison);
  })
);

router.post(
  "/attribution/incrementality",
  asyncHandler(async (req: Request, res: Response) => {
    const { campaignId, testDays } = req.body;
    if (!campaignId) throw new AppError(400, "Missing required field: campaignId");
    const result = await enhancedAttributionOrchestrator.simulateIncrementality(req.user!.tenantId, campaignId, testDays || 30);
    sendSuccess(res, result);
  })
);

router.get(
  "/attribution/channels",
  asyncHandler(async (req: Request, res: Response) => {
    const model = (req.query.model as string) || "last_click";
    const credits = await enhancedAttributionOrchestrator.getChannelCredits(req.user!.tenantId, model);
    sendSuccess(res, credits, { count: credits.length });
  })
);

// ─── Budget Optimizer ─────────────────────────────────────────────

router.post(
  "/budget/predict",
  asyncHandler(async (req: Request, res: Response) => {
    const { platform, recentROAS } = req.body;
    if (!platform) throw new AppError(400, "Missing required field: platform");
    const prediction = await budgetOptimizerOrchestrator.predictROAS(platform, recentROAS);
    sendSuccess(res, prediction);
  })
);

router.post(
  "/budget/optimize",
  asyncHandler(async (req: Request, res: Response) => {
    const { platforms, totalBudget, urgency } = req.body;
    if (!platforms || !totalBudget) throw new AppError(400, "Missing required fields: platforms, totalBudget");
    const allocation = await budgetOptimizerOrchestrator.optimizeBudget(platforms, totalBudget, urgency);
    sendSuccess(res, allocation);
  })
);

router.post(
  "/budget/pacing",
  asyncHandler(async (req: Request, res: Response) => {
    const { dailyBudgets } = req.body;
    if (!dailyBudgets) throw new AppError(400, "Missing required field: dailyBudgets");
    const pacing = await budgetOptimizerOrchestrator.getSpendPacing(req.user!.tenantId, dailyBudgets);
    sendSuccess(res, pacing);
  })
);

router.post(
  "/budget/advice",
  asyncHandler(async (req: Request, res: Response) => {
    const { platforms, totalBudget } = req.body;
    if (!platforms || !totalBudget) throw new AppError(400, "Missing required fields: platforms, totalBudget");
    const advice = await budgetOptimizerOrchestrator.getAdvice(req.user!.tenantId, platforms, totalBudget);
    sendSuccess(res, advice);
  })
);

router.post(
  "/budget/forecast",
  asyncHandler(async (req: Request, res: Response) => {
    const { platforms, totalBudget, days } = req.body;
    if (!platforms || !totalBudget || !days) throw new AppError(400, "Missing required fields: platforms, totalBudget, days");
    const forecast = await budgetOptimizerOrchestrator.getForecast(req.user!.tenantId, platforms, totalBudget, days);
    sendSuccess(res, forecast);
  })
);

export default router;
