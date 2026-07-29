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

router.get("/campaign/:campaignId/format-performance", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.formatPerformance(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/format-recommendations", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.formatMixRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/format-opportunities", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.formatOpportunities(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/format-bid-adjustments", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.formatBidAdjustments(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/audience-format-preference", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.formatAudiencePreference(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/format-trends", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.formatTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/customer-journeys", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.customerJourneys(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/journey-common-paths", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.journeyCommonPaths(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/journey-segments", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.journeySegments(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/journey-optimizations", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.journeyOptimizations(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/journey-drop-offs", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.journeyDropOffs(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/journey-time-buckets", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.journeyTimeBuckets(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/funnel-analysis", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.funnelAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/funnel-drop-offs", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.funnelDropOffs(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/funnel-optimizations", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.funnelOptimizations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/funnel-comparison", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.funnelComparison(req.body.campaignIds, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/funnel-segments", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.funnelSegments(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/funnel-trends", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.funnelTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/keyword-analysis", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.keywordAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/keyword-gaps", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.keywordGaps(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/keyword-clusters", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.keywordClusters(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/keyword-bid-recommendations", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.keywordBidRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/keyword-trends", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.keywordTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/search-term-overlap", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.searchTermOverlap(req.body.campaignId, req.body.tenantIdA || req.user!.tenantId, req.body.tenantIdB || req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/creative-performance", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.creativePerformance(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/creative-fatigue", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.creativeFatigue(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/creative-recommendations", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.creativeRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/creative-ab-tests", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.creativeABTests(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/creative-mix", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.creativeMix(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/creative-trends", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.creativeTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/landing-page-analysis", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.landingPageAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/landing-page-speed-impact", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.pageSpeedImpact(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/landing-page-content-gaps", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.pageContentGaps(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/landing-page-segmentation", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.pageSegmentation(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/landing-page-layout-recommendations", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.pageLayoutRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/landing-page-trends", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.landingPageTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/sentiment-analysis", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.sentimentAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/trending-topics", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.trendingTopics(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/influencer-impact", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.influencerImpact(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/platform-sentiment", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.platformSentiment(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/emotional-tone", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.emotionalTone(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/sentiment-trends", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.sentimentTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/retargeting-audiences", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.retargetingAudiences(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/retargeting-funnel", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.retargetingFunnel(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/retargeting-channels", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.retargetingChannels(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/retargeting-bid-recommendations", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.retargetingBidRecommendations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/cross-channel-retargeting", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.crossChannelRetargeting(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/retargeting-trends", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.retargetingTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/live-metrics", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.liveMetrics(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/anomalies", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.anomalies(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/metric-velocity", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.metricVelocity(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/budget-pacing", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.budgetPacing(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/live-alerts", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.liveAlerts(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/performance-forecast", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.performanceForecast(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution", asyncHandler(async (req, res) => {
  const model = (req.query.model as string) || "linear";
  const result = adsMarketingModule.attribution(req.params.campaignId, req.user!.tenantId, model);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution/shapley", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.attributionShapley(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution/markov", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.attributionMarkov(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution/compare", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.attributionCompare(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution/channels", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.attributionChannels(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution/insights", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.attributionInsights(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
