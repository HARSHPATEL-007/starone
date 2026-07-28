import { Router, Request, Response, NextFunction } from "express";
import { campaignFrequencyAnalyzer } from "../services/CampaignFrequencyAnalyzerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/frequency-distribution", asyncHandler(async (req, res) => {
  const result = campaignFrequencyAnalyzer.analyzeFrequencyDistribution(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/optimization-recommendations", asyncHandler(async (req, res) => {
  const result = campaignFrequencyAnalyzer.generateFrequencyOptimizationRecommendations(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/wear-out-curve", asyncHandler(async (req, res) => {
  const result = campaignFrequencyAnalyzer.analyzeWearOutCurve(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/frequency-capping", asyncHandler(async (req, res) => {
  const result = campaignFrequencyAnalyzer.calculateFrequencyCapping(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/cross-campaign-frequency", asyncHandler(async (req, res) => {
  const result = campaignFrequencyAnalyzer.analyzeCrossCampaignFrequency(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/frequency-impact", asyncHandler(async (req, res) => {
  const result = campaignFrequencyAnalyzer.predictFrequencyImpact(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
