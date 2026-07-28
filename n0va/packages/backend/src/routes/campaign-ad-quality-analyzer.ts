import { Router, Request, Response, NextFunction } from "express";
import { campaignAdQualityAnalyzer } from "../services/CampaignAdQualityAnalyzerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/analyze", asyncHandler(async (req, res) => {
  const result = campaignAdQualityAnalyzer.analyzeAdQuality(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/quality-score", asyncHandler(async (req, res) => {
  const result = campaignAdQualityAnalyzer.estimateQualityScore(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/relevance", asyncHandler(async (req, res) => {
  const result = campaignAdQualityAnalyzer.analyzeRelevance(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/improvement-plan", asyncHandler(async (req, res) => {
  const target = req.query.target ? parseInt(req.query.target as string, 10) : undefined;
  const result = campaignAdQualityAnalyzer.generateImprovementPlan(req.params.campaignId, req.user!.tenantId, target);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/competitive", asyncHandler(async (req, res) => {
  const result = campaignAdQualityAnalyzer.competitiveAdQuality(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/trends", asyncHandler(async (req, res) => {
  const result = campaignAdQualityAnalyzer.trackQualityTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

export default router;