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

export default router;