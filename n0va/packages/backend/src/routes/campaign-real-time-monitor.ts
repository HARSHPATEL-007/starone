import { Router, Request, Response, NextFunction } from "express";
import { campaignRealTimeMonitor } from "../services/CampaignRealTimeMonitorService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/live-metrics", asyncHandler(async (req, res) => {
  const result = campaignRealTimeMonitor.getLiveMetrics(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/anomalies", asyncHandler(async (req, res) => {
  const result = campaignRealTimeMonitor.detectAnomalies(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/velocity", asyncHandler(async (req, res) => {
  const result = campaignRealTimeMonitor.analyzeMetricVelocity(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/budget-pacing", asyncHandler(async (req, res) => {
  const result = campaignRealTimeMonitor.getBudgetPacing(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/live-alerts", asyncHandler(async (req, res) => {
  const result = campaignRealTimeMonitor.generateLiveAlerts(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/forecast", asyncHandler(async (req, res) => {
  const result = campaignRealTimeMonitor.getPerformanceForecast(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/comparison", asyncHandler(async (req, res) => {
  const result = campaignRealTimeMonitor.getRealTimeComparison(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/spikes", asyncHandler(async (req, res) => {
  const result = campaignRealTimeMonitor.detectSpikes(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/correlations", asyncHandler(async (req, res) => {
  const result = campaignRealTimeMonitor.analyzeMetricCorrelations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/breakdown", asyncHandler(async (req, res) => {
  const result = campaignRealTimeMonitor.getRealTimeBreakdown(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/alert-history", asyncHandler(async (req, res) => {
  const result = campaignRealTimeMonitor.getAlertHistory(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/dashboard", asyncHandler(async (req, res) => {
  const result = campaignRealTimeMonitor.getRealTimeDashboard(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
