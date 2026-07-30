import { Router, Request, Response, NextFunction } from "express";
import { campaignInsightsEngine } from "../services/CampaignInsightsEngineService";
import { sendSuccess } from "./route-utils";
import { AppError } from "../middleware/errorHandler";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/dashboard", asyncHandler(async (req, res) => {
  const result = campaignInsightsEngine.generateDashboard(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/analyze", asyncHandler(async (req, res) => {
  const result = campaignInsightsEngine.analyzeCampaign(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/trends", asyncHandler(async (req, res) => {
  const result = campaignInsightsEngine.analyzeTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/correlations", asyncHandler(async (req, res) => {
  const result = campaignInsightsEngine.findCorrelations(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/budget-efficiency", asyncHandler(async (req, res) => {
  const result = campaignInsightsEngine.calculateBudgetEfficiency(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/cross-attribution", asyncHandler(async (req, res) => {
  const result = campaignInsightsEngine.crossCampaignAttribution(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/predictive-alerts", asyncHandler(async (req, res) => {
  const result = campaignInsightsEngine.generatePredictiveAlerts(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/acknowledge-batch", asyncHandler(async (req, res) => {
  const { insightIds, action } = req.body;
  const result = campaignInsightsEngine.insightAcknowledgeBatch(req.user!.tenantId, insightIds, action || "acknowledge");
  sendSuccess(res, result);
}));

router.get("/priority-summary", asyncHandler(async (req, res) => {
  const result = campaignInsightsEngine.insightPrioritySummary(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/export", asyncHandler(async (req, res) => {
  const format = (req.query.format as string) || "json";
  const result = campaignInsightsEngine.insightExport(req.user!.tenantId, format as any);
  sendSuccess(res, result);
}));

router.get("/trend-forecast", asyncHandler(async (req, res) => {
  const metric = (req.query.metric as string) || "roas";
  const days = parseInt(req.query.days as string) || 30;
  const result = campaignInsightsEngine.insightTrendForecast(req.user!.tenantId, metric, days);
  sendSuccess(res, result);
}));

router.get("/campaign-ranking", asyncHandler(async (req, res) => {
  const result = campaignInsightsEngine.insightCampaignRanking(req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;