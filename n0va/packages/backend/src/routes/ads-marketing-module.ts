import { Router, Request, Response, NextFunction } from "express";
import { adsMarketingModule } from "../services/AdsMarketingModuleService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/health", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.moduleHealth();
  sendSuccess(res, result);
}));

router.get("/stats", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.moduleStats(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/health", asyncHandler(async (req, res) => {
  const result = await adsMarketingModule.fullCampaignHealth(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/campaign/:campaignId/optimize", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.optimizationCycle(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/lifecycle", asyncHandler(async (req, res) => {
  const result = await adsMarketingModule.runFullLifecycle(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/analysis", asyncHandler(async (req, res) => {
  const result = await adsMarketingModule.crossServiceAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/dashboard", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.executiveDashboard(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/portfolio-overview", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.portfolioHealthOverview(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/report", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.generateUnifiedReport(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/competitive-benchmark", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.competitiveBenchmark(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/realtime-monitor", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.realTimeMonitor(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/budget-rebalance", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.budgetRebalancer(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/forecast", asyncHandler(async (req, res) => {
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
  const result = adsMarketingModule.performanceForecast(req.user!.tenantId, days);
  sendSuccess(res, result);
}));

router.get("/anomaly-scan", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.anomalyScan(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/executive-briefing", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.executiveBriefing(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/audience-overlap", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.audienceOverlapAnalysis(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/cross-platform-audience-sync", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.crossPlatformAudienceSync(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/creative-performance-matrix", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.creativePerformanceMatrix(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/placement-intelligence", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.placementIntelligence(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/channel-attribution-summary", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.channelAttributionSummary(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/portfolio-scenario-planner", asyncHandler(async (req, res) => {
  const scenarios = req.body.scenarios || [];
  const result = adsMarketingModule.portfolioScenarioPlanner(req.user!.tenantId, scenarios);
  sendSuccess(res, result);
}));

router.get("/budget-simulation", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.budgetSimulation(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/ad-compliance", asyncHandler(async (req, res) => {
  const adCopy = req.body.adCopy || "";
  const result = adsMarketingModule.adComplianceAnalysis(adCopy);
  sendSuccess(res, result);
}));

router.get("/taxonomy-audit", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.campaignTaxonomyAudit(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/segment-overlap", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.audienceSegmentOverlap(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/marketing-calendar", asyncHandler(async (req, res) => {
  const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
  const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
  const result = adsMarketingModule.marketingCalendar(req.user!.tenantId, month, year);
  sendSuccess(res, result);
}));

router.get("/creative-asset-performance", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.creativeAssetPerformance(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/insights-dashboard", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.insightsDashboard(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/correlation-analysis", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.campaignCorrelationAnalysis(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/trends", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.performanceTrendAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/budget-efficiency", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.budgetEfficiencyScore(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/cross-campaign-attribution", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.crossCampaignAttribution(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/predictive-alerts", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.predictiveAlertSummary(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/diagnose", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.diagnosticAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/root-causes", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.rootCauseSummary(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/cross-campaign-diagnostics", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.crossCampaignDiagnostics(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/metric-health", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.metricHealthTrends(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/recovery-plan", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.recoveryPlan(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "No findings to generate plan" });
}));

router.post("/remediate", asyncHandler(async (req, res) => {
  const { findingId, action, metricBefore, metricAfter } = req.body;
  const result = adsMarketingModule.remediationRecord(findingId, action, metricBefore, metricAfter);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/dayparting", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.daypartingAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/dayparting-schedule", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.daypartingSchedule(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/dayparting-plan", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.daypartingPlan(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/dayparting/time-patterns", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.daypartingTimePatterns(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/dayparting/schedule-conflicts", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.daypartingScheduleConflicts(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/dayparting/timezone-performance", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.daypartingTimezonePerformance(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/roi-decomposition", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.roiDecomposition(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/factor-attribution", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.factorAttribution(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/marginal-returns", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.marginalReturnAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/roi-sensitivity", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.roiSensitivity(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/roi-forecast", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.roiForecastByFactor(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/decomposition-trends", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.decompositionTrends(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/ad-quality", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.adQualityAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/quality-score", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.qualityScoreEstimate(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/relevance", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.adRelevanceScore(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/quality-improvement", asyncHandler(async (req, res) => {
  const target = req.query.target ? parseInt(req.query.target as string, 10) : undefined;
  const result = adsMarketingModule.qualityImprovementPlan(req.params.campaignId, req.user!.tenantId, target);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/competitive-quality", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.competitiveAdQuality(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/quality-trends", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.qualityTrendTracking(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/audience-expansion", asyncHandler(async (req, res) => {
  const seed = req.query.seedAudienceId as string | undefined;
  const result = adsMarketingModule.audienceExpansion(req.user!.tenantId, seed);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/expansion-recommendations", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.expansionRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/audience-similarity", asyncHandler(async (req, res) => {
  const audienceA = req.query.audienceA as string;
  const audienceB = req.query.audienceB as string;
  if (!audienceA || !audienceB) { sendSuccess(res, { error: "audienceA and audienceB required" }); return; }
  const result = adsMarketingModule.audienceSimilarity(audienceA, audienceB, req.user!.tenantId);
  sendSuccess(res, result || { error: "Could not compute similarity" });
}));

router.get("/expansion-quality", asyncHandler(async (req, res) => {
  const seed = req.query.seedAudienceId as string;
  const expanded = req.query.expandedAudienceId as string;
  if (!seed || !expanded) { sendSuccess(res, { error: "seedAudienceId and expandedAudienceId required" }); return; }
  const result = adsMarketingModule.expansionQuality(seed, expanded, req.user!.tenantId);
  sendSuccess(res, result || { error: "Could not assess quality" });
}));

router.get("/cross-platform-unification", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.crossPlatformUnification(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/expansion-performance", asyncHandler(async (req, res) => {
  const audienceId = req.query.audienceId as string;
  if (!audienceId) { sendSuccess(res, { error: "audienceId required" }); return; }
  const result = adsMarketingModule.expansionPerformance(audienceId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Audience not found" });
}));

router.get("/campaign/:campaignId/cross-device", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.crossDevicePerformance(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/device-recommendations", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.deviceOptimizationRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/cross-device-conversion-paths", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.crossDeviceConversionPaths(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/device-bid-adjustments", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.deviceBidAdjustments(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/device-audience-overlap", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.deviceAudienceOverlap(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/device-trends", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.deviceTrendAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/geo-performance", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.geoPerformance(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/geo-recommendations", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.geoOptimizationRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/geo-expansion-opportunities", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.geoExpansionOpportunities(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/geo-bid-adjustments", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.geoBidAdjustments(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/geo-audience-overlap", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.geoAudienceOverlap(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/geo-trends", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.geoTrendAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/frequency-distribution", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.frequencyDistribution(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/frequency-recommendations", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.frequencyRecommendations(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/wear-out-curve", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.wearOutAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/frequency-capping", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.frequencyCapping(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/cross-campaign-frequency", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.crossCampaignFrequency(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/frequency-impact", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.frequencyImpactPrediction(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/discovered-segments", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.discoveredSegments(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/segment-performance", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.segmentPerformance(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/segment-targeting", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.segmentTargetingRecommendations(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/segment-comparison", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.segmentComparison(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/segment-trends", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.segmentTrends(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/segment-overlap", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.segmentOverlap(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/goal-progress", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.goalProgress(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/goal-attainment", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.goalAttainmentPrediction(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/goal-adjustments", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.goalAdjustmentRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/goal-conflicts", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.goalConflictAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/goal-performance-comparison", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.goalPerformanceComparison(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/goal-trend-forecast", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.goalTrendForecast(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/placement-performance", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.placementPerformance(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/placement-recommendations", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.placementRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/placement-opportunities", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.placementOpportunities(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/placement-bid-adjustments", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.placementBidAdjustments(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/placement-overlap", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.placementOverlap(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/placement-trends", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.placementTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
