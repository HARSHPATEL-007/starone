import { Router, Request, Response, NextFunction } from "express";
import { budgetOptimizerService } from "../services/BudgetOptimizerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.post("/predict-roas", asyncHandler(async (req, res) => {
  const { platform, recentROAS } = req.body;
  const result = budgetOptimizerService.predictROAS(platform, recentROAS);
  sendSuccess(res, result);
}));

router.post("/optimize", asyncHandler(async (req, res) => {
  const { platforms, totalBudget, urgency } = req.body;
  const result = budgetOptimizerService.optimizeBudget(platforms || [], totalBudget, urgency);
  sendSuccess(res, result);
}));

router.post("/spend-pacing", asyncHandler(async (req, res) => {
  const { dailyBudgets } = req.body;
  const result = budgetOptimizerService.getSpendPacing(req.user!.tenantId, dailyBudgets || {});
  sendSuccess(res, result);
}));

router.post("/optimization-advice", asyncHandler(async (req, res) => {
  const { platforms, totalBudget } = req.body;
  const result = budgetOptimizerService.getOptimizationAdvice(req.user!.tenantId, platforms || [], totalBudget);
  sendSuccess(res, result);
}));

router.post("/forecast", asyncHandler(async (req, res) => {
  const { platforms, totalBudget, days } = req.body;
  const result = budgetOptimizerService.getBudgetForecast(req.user!.tenantId, platforms || [], totalBudget, days || 30);
  sendSuccess(res, result);
}));

router.post("/kalman-pacing", asyncHandler(async (req, res) => {
  const { platform, dailyBudget, spentHistory, observationNoise, processNoise } = req.body;
  const result = budgetOptimizerService.kalmanFilterPacing(platform, dailyBudget, spentHistory || [], observationNoise, processNoise);
  sendSuccess(res, result);
}));

router.post("/kelly-allocate", asyncHandler(async (req, res) => {
  const { platforms, totalBudget } = req.body;
  const result = budgetOptimizerService.kellyCriterionAllocation(platforms || [], totalBudget);
  sendSuccess(res, result);
}));

router.post("/efficient-frontier", asyncHandler(async (req, res) => {
  const { platforms, covarianceMatrix } = req.body;
  const result = budgetOptimizerService.efficientFrontier(platforms || [], covarianceMatrix);
  sendSuccess(res, result);
}));

router.post("/diminishing-returns", asyncHandler(async (req, res) => {
  const { channelHistory } = req.body;
  const result = budgetOptimizerService.diminishingReturnsFit(channelHistory || []);
  sendSuccess(res, result);
}));

export default router;
