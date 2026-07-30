import { Router, Request, Response, NextFunction } from "express";
import { campaignDaypartingOptimizer } from "../services/CampaignDaypartingOptimizerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/analyze", asyncHandler(async (req, res) => {
  const result = campaignDaypartingOptimizer.analyzeDayparting(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/schedule", asyncHandler(async (req, res) => {
  const result = campaignDaypartingOptimizer.recommendSchedule(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/plan", asyncHandler(async (req, res) => {
  const result = campaignDaypartingOptimizer.generateDaypartingPlan(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/time-patterns", asyncHandler(async (req, res) => {
  const result = campaignDaypartingOptimizer.detectTimePatterns(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/schedule-conflicts", asyncHandler(async (req, res) => {
  const result = campaignDaypartingOptimizer.findScheduleConflicts(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/timezone-performance", asyncHandler(async (req, res) => {
  const result = campaignDaypartingOptimizer.analyzeTimezonePerformance(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/forecast", asyncHandler(async (req, res) => {
  const result = campaignDaypartingOptimizer.daypartingForecast(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/hourly-trends", asyncHandler(async (req, res) => {
  const result = campaignDaypartingOptimizer.hourlyTrendAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/roi-analysis", asyncHandler(async (req, res) => {
  const result = campaignDaypartingOptimizer.daypartingROIAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/slot-optimization", asyncHandler(async (req, res) => {
  const result = campaignDaypartingOptimizer.timeSlotOptimization(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/weekend-vs-weekday", asyncHandler(async (req, res) => {
  const result = campaignDaypartingOptimizer.weekendVsWeekdayAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/heatmap", asyncHandler(async (req, res) => {
  const result = campaignDaypartingOptimizer.hourlyHeatmap(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

export default router;