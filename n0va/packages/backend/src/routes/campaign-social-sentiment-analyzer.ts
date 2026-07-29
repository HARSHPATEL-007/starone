import { Router, Request, Response, NextFunction } from "express";
import { campaignSocialSentimentAnalyzer } from "../services/CampaignSocialSentimentAnalyzerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/sentiment", asyncHandler(async (req, res) => {
  const result = campaignSocialSentimentAnalyzer.analyzeSentiment(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/trending-topics", asyncHandler(async (req, res) => {
  const result = campaignSocialSentimentAnalyzer.analyzeTrendingTopics(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/influencer-impact", asyncHandler(async (req, res) => {
  const result = campaignSocialSentimentAnalyzer.analyzeInfluencerImpact(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/platform-sentiment", asyncHandler(async (req, res) => {
  const result = campaignSocialSentimentAnalyzer.analyzePlatformSentiment(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/emotional-tone", asyncHandler(async (req, res) => {
  const result = campaignSocialSentimentAnalyzer.analyzeEmotionalTone(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/sentiment-trends", asyncHandler(async (req, res) => {
  const result = campaignSocialSentimentAnalyzer.analyzeSentimentTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
