import { Router, Request, Response, NextFunction } from "express";
import { campaignCrossDeviceAnalyzer } from "../services/CampaignCrossDeviceAnalyzerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/analyze", asyncHandler(async (req, res) => {
  const result = campaignCrossDeviceAnalyzer.analyzeCrossDevice(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/recommendations", asyncHandler(async (req, res) => {
  const result = campaignCrossDeviceAnalyzer.generateDeviceRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/conversion-paths", asyncHandler(async (req, res) => {
  const result = campaignCrossDeviceAnalyzer.analyzeConversionPaths(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/bid-adjustments", asyncHandler(async (req, res) => {
  const result = campaignCrossDeviceAnalyzer.calculateBidAdjustments(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/audience-overlap", asyncHandler(async (req, res) => {
  const result = campaignCrossDeviceAnalyzer.analyzeDeviceAudienceOverlap(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/trends", asyncHandler(async (req, res) => {
  const result = campaignCrossDeviceAnalyzer.analyzeDeviceTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/device-graph", asyncHandler(async (req, res) => {
  const result = campaignCrossDeviceAnalyzer.deviceGraphAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/attribution-modeling", asyncHandler(async (req, res) => {
  const result = campaignCrossDeviceAnalyzer.crossDeviceAttributionModeling(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/affinity-scoring", asyncHandler(async (req, res) => {
  const result = campaignCrossDeviceAnalyzer.deviceAffinityScoring(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/journey-sequencing", asyncHandler(async (req, res) => {
  const result = campaignCrossDeviceAnalyzer.deviceJourneySequencing(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/performance-forecast", asyncHandler(async (req, res) => {
  const result = campaignCrossDeviceAnalyzer.devicePerformanceForecast(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/optimization-simulator", asyncHandler(async (req, res) => {
  const result = campaignCrossDeviceAnalyzer.deviceOptimizationSimulator(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

export default router;