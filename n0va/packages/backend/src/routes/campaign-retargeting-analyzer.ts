import { Router, Request, Response, NextFunction } from "express";
import { campaignRetargetingAnalyzer } from "../services/CampaignRetargetingAnalyzerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/audiences", asyncHandler(async (req, res) => {
  const result = campaignRetargetingAnalyzer.analyzeRetargetingAudiences(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/funnel", asyncHandler(async (req, res) => {
  const result = campaignRetargetingAnalyzer.analyzeRetargetingFunnel(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/channels", asyncHandler(async (req, res) => {
  const result = campaignRetargetingAnalyzer.analyzeRetargetingChannels(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/bid-recommendations", asyncHandler(async (req, res) => {
  const result = campaignRetargetingAnalyzer.generateRetargetingBidRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/cross-channel", asyncHandler(async (req, res) => {
  const result = campaignRetargetingAnalyzer.analyzeCrossChannelRetargeting(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/trends", asyncHandler(async (req, res) => {
  const result = campaignRetargetingAnalyzer.analyzeRetargetingTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/segment-performance", asyncHandler(async (req, res) => {
  const result = campaignRetargetingAnalyzer.retargetingSegmentPerformance(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/frequency-analysis", asyncHandler(async (req, res) => {
  const result = campaignRetargetingAnalyzer.retargetingFrequencyAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/lift-measurement", asyncHandler(async (req, res) => {
  const result = campaignRetargetingAnalyzer.retargetingLiftMeasurement(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/creative-performance", asyncHandler(async (req, res) => {
  const result = campaignRetargetingAnalyzer.retargetingCreativePerformance(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/roi-calculator", asyncHandler(async (req, res) => {
  const result = campaignRetargetingAnalyzer.retargetingROICalculator(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/predictive-modeling", asyncHandler(async (req, res) => {
  const result = campaignRetargetingAnalyzer.retargetingPredictiveModeling(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
