import { Router, Request, Response, NextFunction } from "express";
import { campaignAudienceExpansion } from "../services/CampaignAudienceExpansionService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/lookalike", asyncHandler(async (req, res) => {
  const seed = req.query.seedAudienceId as string | undefined;
  const result = campaignAudienceExpansion.findLookalikeAudiences(req.user!.tenantId, seed);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/recommendations", asyncHandler(async (req, res) => {
  const result = campaignAudienceExpansion.generateExpansionRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/similarity", asyncHandler(async (req, res) => {
  const audienceA = req.query.audienceA as string;
  const audienceB = req.query.audienceB as string;
  if (!audienceA || !audienceB) { sendSuccess(res, { error: "audienceA and audienceB query params required" }); return; }
  const result = campaignAudienceExpansion.computeAudienceSimilarity(audienceA, audienceB, req.user!.tenantId);
  sendSuccess(res, result || { error: "Could not compute similarity" });
}));

router.get("/quality", asyncHandler(async (req, res) => {
  const seed = req.query.seedAudienceId as string;
  const expanded = req.query.expandedAudienceId as string;
  if (!seed || !expanded) { sendSuccess(res, { error: "seedAudienceId and expandedAudienceId query params required" }); return; }
  const result = campaignAudienceExpansion.assessExpansionQuality(seed, expanded, req.user!.tenantId);
  sendSuccess(res, result || { error: "Could not assess quality" });
}));

router.get("/unification", asyncHandler(async (req, res) => {
  const platformA = req.query.platformA as string | undefined;
  const platformB = req.query.platformB as string | undefined;
  const result = campaignAudienceExpansion.crossPlatformUnification(req.user!.tenantId, platformA, platformB);
  sendSuccess(res, result);
}));

router.get("/performance", asyncHandler(async (req, res) => {
  const audienceId = req.query.audienceId as string;
  if (!audienceId) { sendSuccess(res, { error: "audienceId query param required" }); return; }
  const result = campaignAudienceExpansion.trackExpansionPerformance(audienceId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Audience not found" });
}));

router.get("/source-analysis", asyncHandler(async (req, res) => {
  const result = campaignAudienceExpansion.audienceSourceAnalysis(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/overlap-analysis", asyncHandler(async (req, res) => {
  const ids = req.query.audienceIds as string | string[] | undefined;
  const audienceIds = Array.isArray(ids) ? ids : ids ? ids.split(",") : [];
  if (audienceIds.length < 2) { sendSuccess(res, { error: "At least 2 audienceIds required (comma-separated)" }); return; }
  const result = campaignAudienceExpansion.audienceOverlapAnalysis(audienceIds, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/segmentation-suggestions", asyncHandler(async (req, res) => {
  const result = campaignAudienceExpansion.audienceSegmentationSuggestions(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/value-forecast", asyncHandler(async (req, res) => {
  const audienceId = req.query.audienceId as string;
  if (!audienceId) { sendSuccess(res, { error: "audienceId query param required" }); return; }
  const result = campaignAudienceExpansion.audienceValueForecasting(audienceId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Audience not found" });
}));

router.get("/saturation-analysis", asyncHandler(async (req, res) => {
  const result = campaignAudienceExpansion.audienceSaturationAnalysis(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/composition-analysis", asyncHandler(async (req, res) => {
  const result = campaignAudienceExpansion.audienceCompositionAnalysis(req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;