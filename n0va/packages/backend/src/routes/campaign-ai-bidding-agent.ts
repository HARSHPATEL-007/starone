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

router.get("/campaign/:campaignId/competitor-analysis", asyncHandler(async (req, res) => {
  const result = campaignAIBiddingAgent.bidCompetitorAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/historical-trends", asyncHandler(async (req, res) => {
  const result = campaignAIBiddingAgent.bidHistoricalTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/opportunity-analysis", asyncHandler(async (req, res) => {
  const result = campaignAIBiddingAgent.bidOpportunityAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/portfolio-optimization", asyncHandler(async (req, res) => {
  const { campaigns } = req.body;
  if (!campaigns || !Array.isArray(campaigns)) return res.status(400).json({ error: "campaigns array required" });
  const result = campaignAIBiddingAgent.bidPortfolioOptimization(campaigns);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/bid-anomalies", asyncHandler(async (req, res) => {
  const result = campaignAIBiddingAgent.bidAnomalyDetection(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/campaign/:campaignId/scenario-comparison", asyncHandler(async (req, res) => {
  const { scenarios } = req.body;
  if (!scenarios || !Array.isArray(scenarios)) return res.status(400).json({ error: "scenarios array required" });
  const result = campaignAIBiddingAgent.bidScenarioComparison(req.params.campaignId, req.user!.tenantId, scenarios);
  sendSuccess(res, result);
}));

export default router;
