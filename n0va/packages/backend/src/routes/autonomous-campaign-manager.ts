import { Router, Request, Response, NextFunction } from "express";
import { autonomousCampaignManager } from "../services/AutonomousCampaignManagerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/analyze/:campaignId", asyncHandler(async (req, res) => {
  const result = autonomousCampaignManager.analyzeCampaign(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/portfolio", asyncHandler(async (req, res) => {
  const result = autonomousCampaignManager.analyzePortfolio(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/optimize/:campaignId", asyncHandler(async (req, res) => {
  const result = autonomousCampaignManager.generateOptimizationPlan(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.post("/auto-adjust-budget", asyncHandler(async (req, res) => {
  const { campaignId } = req.body;
  const result = autonomousCampaignManager.autoAdjustBudget(campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.post("/auto-adjust-bids", asyncHandler(async (req, res) => {
  const { campaignId } = req.body;
  const result = autonomousCampaignManager.autoAdjustBids(campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.post("/schedule-change", asyncHandler(async (req, res) => {
  const { campaignId, type, action, rationale } = req.body;
  const result = autonomousCampaignManager.scheduleCampaignChange(campaignId, type, action, rationale, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/scheduled-changes", asyncHandler(async (req, res) => {
  const { campaignId } = req.query;
  const result = autonomousCampaignManager.getScheduledChanges(campaignId as string | undefined);
  sendSuccess(res, result);
}));

router.post("/execute-scheduled", asyncHandler(async (req, res) => {
  const { campaignId } = req.body;
  const result = autonomousCampaignManager.executeScheduledChanges(campaignId);
  sendSuccess(res, result);
}));

router.get("/anomalies/:campaignId", asyncHandler(async (req, res) => {
  const result = autonomousCampaignManager.detectAnomalies(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/executive-report", asyncHandler(async (req, res) => {
  const result = autonomousCampaignManager.generateExecutiveReport(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/forecast/:campaignId", asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const result = autonomousCampaignManager.getPerformanceForecast(req.params.campaignId, req.user!.tenantId, days);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/budget-allocation", asyncHandler(async (req, res) => {
  const result = autonomousCampaignManager.recommendBudgetAllocation(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/pacing-targets", asyncHandler(async (req, res) => {
  const result = autonomousCampaignManager.recommendPacingTargets(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/schedule-optimization/:campaignId", asyncHandler(async (req, res) => {
  const result = autonomousCampaignManager.optimizeCampaignSchedule(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/ab-test-recommendation/:campaignId", asyncHandler(async (req, res) => {
  const result = autonomousCampaignManager.generateABTestRecommendation(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/competitive-landscape/:campaignId", asyncHandler(async (req, res) => {
  const result = autonomousCampaignManager.analyzeCompetitiveLandscape(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/action-items", asyncHandler(async (req, res) => {
  const result = autonomousCampaignManager.generateActionItems(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/simulate/:campaignId", asyncHandler(async (req, res) => {
  const { scenario, adjustments } = req.body;
  const result = autonomousCampaignManager.simulateScenario(req.params.campaignId, req.user!.tenantId, scenario, adjustments);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/health-trend/:campaignId", asyncHandler(async (req, res) => {
  const result = autonomousCampaignManager.getCampaignHealthTrend(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.post("/auto-pause", asyncHandler(async (req, res) => {
  const result = autonomousCampaignManager.autoPauseUnderperforming(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/weekly-report", asyncHandler(async (req, res) => {
  const { weekStart } = req.query;
  const result = autonomousCampaignManager.generateWeeklyReport(req.user!.tenantId, weekStart as string | undefined);
  sendSuccess(res, result);
}));

router.get("/action-items/list", asyncHandler(async (req, res) => {
  const result = autonomousCampaignManager.getActionItems();
  sendSuccess(res, result);
}));

router.post("/action-items/clear", asyncHandler(async (req, res) => {
  autonomousCampaignManager.clearActionItems();
  sendSuccess(res, { message: "Action items cleared" });
}));

export default router;
