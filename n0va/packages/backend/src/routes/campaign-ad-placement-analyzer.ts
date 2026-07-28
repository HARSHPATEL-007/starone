import { Router, Request, Response, NextFunction } from "express";
import { campaignAdPlacementAnalyzer } from "../services/CampaignAdPlacementAnalyzerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/placement-performance", asyncHandler(async (req, res) => {
  const result = campaignAdPlacementAnalyzer.analyzePlacementPerformance(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/placement-recommendations", asyncHandler(async (req, res) => {
  const result = campaignAdPlacementAnalyzer.generatePlacementRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/placement-opportunities", asyncHandler(async (req, res) => {
  const result = campaignAdPlacementAnalyzer.identifyPlacementOpportunities(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/placement-bid-adjustments", asyncHandler(async (req, res) => {
  const result = campaignAdPlacementAnalyzer.calculatePlacementBidAdjustments(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/placement-overlap", asyncHandler(async (req, res) => {
  const result = campaignAdPlacementAnalyzer.analyzePlacementOverlap(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/placement-trends", asyncHandler(async (req, res) => {
  const result = campaignAdPlacementAnalyzer.analyzePlacementTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
