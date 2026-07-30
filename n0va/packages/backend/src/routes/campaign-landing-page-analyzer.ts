import { Router, Request, Response, NextFunction } from "express";
import { campaignLandingPageAnalyzer } from "../services/CampaignLandingPageAnalyzerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/analysis", asyncHandler(async (req, res) => {
  const result = campaignLandingPageAnalyzer.analyzeLandingPages(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/speed-impact", asyncHandler(async (req, res) => {
  const result = campaignLandingPageAnalyzer.analyzeSpeedImpact(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/content-gaps", asyncHandler(async (req, res) => {
  const result = campaignLandingPageAnalyzer.analyzeContentGaps(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/page-segmentation", asyncHandler(async (req, res) => {
  const result = campaignLandingPageAnalyzer.analyzePageSegmentation(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/layout-recommendations", asyncHandler(async (req, res) => {
  const result = campaignLandingPageAnalyzer.generateLayoutRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/trends", asyncHandler(async (req, res) => {
  const result = campaignLandingPageAnalyzer.analyzeLandingPageTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/ab-test-analysis", asyncHandler(async (req, res) => {
  const result = campaignLandingPageAnalyzer.landingPageABTestAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/form-analysis", asyncHandler(async (req, res) => {
  const result = campaignLandingPageAnalyzer.landingPageFormAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/heatmap-prediction", asyncHandler(async (req, res) => {
  const result = campaignLandingPageAnalyzer.landingPageHeatmapPrediction(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/accessibility-audit", asyncHandler(async (req, res) => {
  const result = campaignLandingPageAnalyzer.landingPageAccessibilityAudit(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/conversion-path-analysis", asyncHandler(async (req, res) => {
  const result = campaignLandingPageAnalyzer.landingPageConversionPathAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/competitive-benchmark", asyncHandler(async (req, res) => {
  const result = campaignLandingPageAnalyzer.landingPageCompetitiveBenchmark(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
