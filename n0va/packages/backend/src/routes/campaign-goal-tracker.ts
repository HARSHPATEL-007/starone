import { Router, Request, Response, NextFunction } from "express";
import { campaignGoalTracker } from "../services/CampaignGoalTrackerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/progress", asyncHandler(async (req, res) => {
  const result = campaignGoalTracker.trackGoalProgress(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/attainment", asyncHandler(async (req, res) => {
  const result = campaignGoalTracker.predictGoalAttainment(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/adjustments", asyncHandler(async (req, res) => {
  const result = campaignGoalTracker.recommendGoalAdjustments(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/conflicts", asyncHandler(async (req, res) => {
  const result = campaignGoalTracker.analyzeGoalConflicts(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/compare", asyncHandler(async (req, res) => {
  const result = campaignGoalTracker.compareGoalPerformance(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/trend-forecast", asyncHandler(async (req, res) => {
  const result = campaignGoalTracker.goalTrendForecast(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
