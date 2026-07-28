import { Router, Request, Response, NextFunction } from "express";
import { campaignInsightsEngine } from "../services/CampaignInsightsEngineService";
import { sendSuccess } from "./route-utils";

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

export default router;