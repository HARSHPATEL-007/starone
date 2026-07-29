import { Router, Request, Response, NextFunction } from "express";
import { campaignAIBiddingAgent } from "../services/CampaignAIBiddingAgentService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/bidding-dashboard", asyncHandler(async (req, res) => {
  const result = campaignAIBiddingAgent.getBiddingDashboard(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/auction-insights", asyncHandler(async (req, res) => {
  const result = campaignAIBiddingAgent.analyzeAuctionInsights(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/bid-adjustments", asyncHandler(async (req, res) => {
  const result = campaignAIBiddingAgent.recommendBidAdjustments(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/campaign/:campaignId/bid-scenario", asyncHandler(async (req, res) => {
  const result = campaignAIBiddingAgent.simulateBidScenario(req.params.campaignId, req.user!.tenantId, req.body);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/bid-efficiency", asyncHandler(async (req, res) => {
  const result = campaignAIBiddingAgent.analyzeBidEfficiency(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/bid-strategy", asyncHandler(async (req, res) => {
  const goal = (req.query.goal as string) || "maximize_roas";
  const result = campaignAIBiddingAgent.generateBidStrategy(req.params.campaignId, req.user!.tenantId, goal);
  sendSuccess(res, result);
}));

export default router;
