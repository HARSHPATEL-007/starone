import { Router, Request, Response, NextFunction } from "express";
import { campaignAdFormatAnalyzer } from "../services/CampaignAdFormatAnalyzerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/format-performance", asyncHandler(async (req, res) => {
  const result = campaignAdFormatAnalyzer.analyzeFormatPerformance(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/format-recommendations", asyncHandler(async (req, res) => {
  const result = campaignAdFormatAnalyzer.recommendFormatMix(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/format-opportunities", asyncHandler(async (req, res) => {
  const result = campaignAdFormatAnalyzer.identifyFormatOpportunities(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/format-bid-adjustments", asyncHandler(async (req, res) => {
  const result = campaignAdFormatAnalyzer.calculateFormatBidAdjustments(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/audience-format-preference", asyncHandler(async (req, res) => {
  const result = campaignAdFormatAnalyzer.analyzeAudienceFormatPreference(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/format-trends", asyncHandler(async (req, res) => {
  const result = campaignAdFormatAnalyzer.analyzeFormatTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
