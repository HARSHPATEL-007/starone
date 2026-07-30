import { Router, Request, Response, NextFunction } from "express";
import { campaignROIDecomposition } from "../services/CampaignROIDecompositionService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/decompose", asyncHandler(async (req, res) => {
  const result = campaignROIDecomposition.decomposeROI(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/attribution", asyncHandler(async (req, res) => {
  const result = campaignROIDecomposition.attributeFactors(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/marginal-returns", asyncHandler(async (req, res) => {
  const result = campaignROIDecomposition.analyzeMarginalReturns(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/sensitivity", asyncHandler(async (req, res) => {
  const result = campaignROIDecomposition.analyzeSensitivity(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/forecast-by-factor", asyncHandler(async (req, res) => {
  const result = campaignROIDecomposition.forecastByFactor(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/decomposition-trends", asyncHandler(async (req, res) => {
  const result = campaignROIDecomposition.decompositionTrends(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/benchmark", asyncHandler(async (req, res) => {
  const result = campaignROIDecomposition.roiBenchmark(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/scenario-simulation", asyncHandler(async (req, res) => {
  const result = campaignROIDecomposition.roiScenarioSimulation(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/channel-breakdown", asyncHandler(async (req, res) => {
  const result = campaignROIDecomposition.roiChannelBreakdown(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/optimization-targets", asyncHandler(async (req, res) => {
  const result = campaignROIDecomposition.roiOptimizationTargets(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution-shift", asyncHandler(async (req, res) => {
  const result = campaignROIDecomposition.roiAttributionShift(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/factor-correlations", asyncHandler(async (req, res) => {
  const result = campaignROIDecomposition.roiFactorCorrelations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;