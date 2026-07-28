import { Router, Request, Response, NextFunction } from "express";
import { campaignCreativeOptimizer } from "../services/CampaignCreativeOptimizerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/performance", asyncHandler(async (req, res) => {
  const result = campaignCreativeOptimizer.analyzeCreativePerformance(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/fatigue", asyncHandler(async (req, res) => {
  const result = campaignCreativeOptimizer.analyzeCreativeFatigue(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/recommendations", asyncHandler(async (req, res) => {
  const result = campaignCreativeOptimizer.generateCreativeRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/ab-tests", asyncHandler(async (req, res) => {
  const result = campaignCreativeOptimizer.analyzeCreativeABTests(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/mix", asyncHandler(async (req, res) => {
  const result = campaignCreativeOptimizer.analyzeCreativeMix(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/trends", asyncHandler(async (req, res) => {
  const result = campaignCreativeOptimizer.analyzeCreativeTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
