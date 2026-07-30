import { Router, Request, Response, NextFunction } from "express";
import { campaignScorecardService } from "../services/CampaignScorecardService";
import { campaignScorecardOrchestrator } from "../business-logic/CampaignScorecardOrchestrator";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "./route-utils";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/", asyncHandler(async (req, res) => {
  const { campaignId } = req.query;
  const scorecard = campaignScorecardService.getScorecard(req.user!.tenantId, campaignId as string);
  const meta: Record<string, unknown> = {};
  if (scorecard && typeof scorecard === "object") {
    const sc = scorecard as any;
    if (sc.overallScore !== undefined) meta.overallScore = sc.overallScore;
    if (sc.campaignName) meta.campaignName = sc.campaignName;
  }
  sendSuccess(res, scorecard, Object.keys(meta).length > 0 ? meta : undefined);
}));

router.post("/weights", asyncHandler(async (req, res) => {
  campaignScorecardService.setWeights(req.body);
  sendSuccess(res, { ok: true });
}));

router.get("/orchestrate", asyncHandler(async (req, res) => {
  const report = campaignScorecardOrchestrator.analyze(req.user!.tenantId);
  sendSuccess(res, report);
}));

router.get("/:campaignId/trends", asyncHandler(async (req, res) => {
  const result = campaignScorecardService.scorecardTrendAnalysis(req.params.campaignId, req.user!.tenantId);
  if (!result) throw new AppError(404, "Campaign not found");
  sendSuccess(res, result);
}));

router.get("/:campaignId/dimensions", asyncHandler(async (req, res) => {
  const result = campaignScorecardService.scorecardDimensionBreakdown(req.params.campaignId, req.user!.tenantId);
  if (!result) throw new AppError(404, "Campaign not found");
  sendSuccess(res, result);
}));

router.get("/anomalies", asyncHandler(async (req, res) => {
  const result = campaignScorecardService.scorecardAnomalyDetection(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/:campaignId/improvement-plan", asyncHandler(async (req, res) => {
  const result = campaignScorecardService.scorecardImprovementPlan(req.params.campaignId, req.user!.tenantId);
  if (!result) throw new AppError(404, "Campaign not found");
  sendSuccess(res, result);
}));

router.get("/:campaignId/peer-comparison", asyncHandler(async (req, res) => {
  const result = campaignScorecardService.scorecardPeerComparison(req.params.campaignId, req.user!.tenantId);
  if (!result) throw new AppError(404, "Campaign not found");
  sendSuccess(res, result);
}));

router.get("/:campaignId/benchmark", asyncHandler(async (req, res) => {
  const result = campaignScorecardService.scorecardBenchmark(req.params.campaignId, req.user!.tenantId);
  if (!result) throw new AppError(404, "Campaign not found");
  sendSuccess(res, result);
}));

router.get("/distribution", asyncHandler(async (req, res) => {
  const { campaignId } = req.query;
  const result = campaignScorecardService.scorecardDistributionAnalysis(req.user!.tenantId, campaignId as string);
  sendSuccess(res, result);
}));

router.get("/factor-importance", asyncHandler(async (req, res) => {
  const result = campaignScorecardService.scorecardFactorImportance(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/:campaignId/weight-simulation", asyncHandler(async (req, res) => {
  const result = campaignScorecardService.scorecardCustomWeightsSimulation(req.params.campaignId, req.user!.tenantId);
  if (!result) throw new AppError(404, "Campaign not found");
  sendSuccess(res, result);
}));

router.get("/historical", asyncHandler(async (req, res) => {
  const { campaignId } = req.query;
  const result = campaignScorecardService.scorecardHistoricalComparison(req.user!.tenantId, campaignId as string);
  sendSuccess(res, result);
}));

export default router;
