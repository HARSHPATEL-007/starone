import { Router, Request, Response, NextFunction } from "express";
import { campaignKeywordAnalyzer } from "../services/CampaignKeywordAnalyzerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/keywords", asyncHandler(async (req, res) => {
  const result = campaignKeywordAnalyzer.analyzeKeywords(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/gaps", asyncHandler(async (req, res) => {
  const result = campaignKeywordAnalyzer.identifyKeywordGaps(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/clusters", asyncHandler(async (req, res) => {
  const result = campaignKeywordAnalyzer.clusterKeywords(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/bid-recommendations", asyncHandler(async (req, res) => {
  const result = campaignKeywordAnalyzer.generateBidRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/trends", asyncHandler(async (req, res) => {
  const result = campaignKeywordAnalyzer.analyzeKeywordTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/search-term-overlap", asyncHandler(async (req, res) => {
  const { campaignId, tenantIdA, tenantIdB } = req.body;
  const result = campaignKeywordAnalyzer.analyzeSearchTermOverlap(campaignId, tenantIdA || req.user!.tenantId, tenantIdB || req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/performance-forecast", asyncHandler(async (req, res) => {
  const result = campaignKeywordAnalyzer.keywordPerformanceForecast(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/competitive-analysis", asyncHandler(async (req, res) => {
  const result = campaignKeywordAnalyzer.keywordCompetitiveAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/match-type-analysis", asyncHandler(async (req, res) => {
  const result = campaignKeywordAnalyzer.keywordMatchTypeAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/seasonality-analysis", asyncHandler(async (req, res) => {
  const result = campaignKeywordAnalyzer.keywordSeasonalityAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/semantic-clustering", asyncHandler(async (req, res) => {
  const result = campaignKeywordAnalyzer.keywordSemanticClustering(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/roi-attribution", asyncHandler(async (req, res) => {
  const result = campaignKeywordAnalyzer.keywordROIAttribution(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
