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

router.get("/campaign/:campaignId/goal-cascading", asyncHandler(async (req, res) => {
  const result = campaignGoalTracker.goalCascadingAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/goal-attribution", asyncHandler(async (req, res) => {
  const result = campaignGoalTracker.goalAttributionModeling(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/goal-stress-testing", asyncHandler(async (req, res) => {
  const result = campaignGoalTracker.goalStressTesting(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/goal-optimization", asyncHandler(async (req, res) => {
  const result = campaignGoalTracker.goalOptimizationSuggestions(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/goal-dependency-graph", asyncHandler(async (req, res) => {
  const result = campaignGoalTracker.goalDependencyGraph(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/goal-benchmarking", asyncHandler(async (req, res) => {
  const result = campaignGoalTracker.goalHistoricalBenchmarking(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
