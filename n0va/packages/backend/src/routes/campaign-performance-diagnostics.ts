import { Router, Request, Response, NextFunction } from "express";
import { campaignPerformanceDiagnostics } from "../services/CampaignPerformanceDiagnosticsService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/diagnose", asyncHandler(async (req, res) => {
  const result = campaignPerformanceDiagnostics.diagnoseCampaign(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/root-causes", asyncHandler(async (req, res) => {
  const result = campaignPerformanceDiagnostics.rootCauseSummary(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/cross-campaign", asyncHandler(async (req, res) => {
  const result = campaignPerformanceDiagnostics.crossCampaignDiagnostics(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/metric-health", asyncHandler(async (req, res) => {
  const result = campaignPerformanceDiagnostics.metricHealthTrends(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/recovery-plan", asyncHandler(async (req, res) => {
  const result = campaignPerformanceDiagnostics.generateRecoveryPlan(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "No findings to generate plan" });
}));

router.post("/remediate", asyncHandler(async (req, res) => {
  const { findingId, action, metricBefore, metricAfter } = req.body;
  const result = campaignPerformanceDiagnostics.remediateFinding(findingId, action, metricBefore, metricAfter);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/trend-analysis", asyncHandler(async (req, res) => {
  const result = campaignPerformanceDiagnostics.diagnosticTrendAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/compare/:campaignIdA/:campaignIdB", asyncHandler(async (req, res) => {
  const result = campaignPerformanceDiagnostics.campaignComparisonDiagnostics(req.params.campaignIdA, req.params.campaignIdB);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/severity-breakdown", asyncHandler(async (req, res) => {
  const result = campaignPerformanceDiagnostics.severityBreakdown(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/fix-recommendation/:findingId", asyncHandler(async (req, res) => {
  const result = campaignPerformanceDiagnostics.getFixRecommendation(req.params.findingId);
  sendSuccess(res, result || { error: "Finding not found" });
}));

router.get("/campaign/:campaignId/timeline", asyncHandler(async (req, res) => {
  const result = campaignPerformanceDiagnostics.getDiagnosticTimeline(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/export", asyncHandler(async (req, res) => {
  const result = campaignPerformanceDiagnostics.exportDiagnostics(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;