import { Router, Request, Response, NextFunction } from "express";
import { campaignGeoPerformanceAnalyzer } from "../services/CampaignGeoPerformanceAnalyzerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/geo-performance", asyncHandler(async (req, res) => {
  const result = campaignGeoPerformanceAnalyzer.analyzeGeoPerformance(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/geo-recommendations", asyncHandler(async (req, res) => {
  const result = campaignGeoPerformanceAnalyzer.generateGeoOptimizationRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/expansion-opportunities", asyncHandler(async (req, res) => {
  const result = campaignGeoPerformanceAnalyzer.identifyGeoExpansionOpportunities(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/geo-bid-adjustments", asyncHandler(async (req, res) => {
  const result = campaignGeoPerformanceAnalyzer.calculateGeoBidAdjustments(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/geo-audience-overlap", asyncHandler(async (req, res) => {
  const result = campaignGeoPerformanceAnalyzer.analyzeGeoAudienceOverlap(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/geo-trends", asyncHandler(async (req, res) => {
  const result = campaignGeoPerformanceAnalyzer.analyzeGeoTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
