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

router.get("/campaign/:campaignId/geo-region-clustering", asyncHandler(async (req, res) => {
  const result = campaignGeoPerformanceAnalyzer.geoRegionClustering(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/geo-timezone-analysis", asyncHandler(async (req, res) => {
  const result = campaignGeoPerformanceAnalyzer.geoTimeZoneAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/geo-localization-scores", asyncHandler(async (req, res) => {
  const result = campaignGeoPerformanceAnalyzer.geoLocalizationScore(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/geo-cross-border", asyncHandler(async (req, res) => {
  const result = campaignGeoPerformanceAnalyzer.geoCrossBorderAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/geo-predictive-expansion", asyncHandler(async (req, res) => {
  const result = campaignGeoPerformanceAnalyzer.geoPredictiveExpansion(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/geo-competitive-landscape", asyncHandler(async (req, res) => {
  const result = campaignGeoPerformanceAnalyzer.geoCompetitiveLandscape(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
