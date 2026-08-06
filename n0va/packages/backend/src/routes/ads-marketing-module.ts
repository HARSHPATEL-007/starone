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

router.get("/campaign/:campaignId/health-detailed-breakdown", asyncHandler(async (req, res) => {
  const result = await adsMarketingModule.healthDetailedBreakdown(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/health-trend-forecast", asyncHandler(async (req, res) => {
  const periods = req.query.periods ? parseInt(req.query.periods as string, 10) : 4;
  const result = await adsMarketingModule.healthTrendForecast(req.params.campaignId, req.user!.tenantId, periods);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/health-benchmark", asyncHandler(async (req, res) => {
  const result = await adsMarketingModule.healthBenchmarkComparison(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/health-improvement-plan", asyncHandler(async (req, res) => {
  const result = await adsMarketingModule.healthImprovementPlan(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/health-driver-attribution", asyncHandler(async (req, res) => {
  const result = await adsMarketingModule.healthDriverAttribution(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/health-ranking", asyncHandler(async (req, res) => {
  const result = await adsMarketingModule.campaignHealthRanking(req.user!.tenantId);
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

router.post("/budget-optimization-allocation", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.budgetOptimizationAllocation(req.user!.tenantId, req.body.totalBudget);
  sendSuccess(res, result);
}));

router.get("/budget-scenario-comparison", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.budgetScenarioComparison(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/budget-risk-assessment", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.budgetRiskAssessment(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/campaign/:campaignId/budget-sensitivity", asyncHandler(async (req, res) => {
  const { minBudget, maxBudget, steps } = req.body;
  const result = adsMarketingModule.budgetSensitivityAnalysis(req.params.campaignId, req.user!.tenantId, minBudget, maxBudget, steps);
  sendSuccess(res, result);
}));

router.post("/campaign/:campaignId/budget-what-if", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.budgetWhatIfSimulation(req.params.campaignId, req.user!.tenantId, req.body.whatIfBudget);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/budget-roi-curve", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.budgetROICurve(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/budget-quick-simulation", asyncHandler(async (req, res) => {
  const { campaignId, percentageChange, runs } = req.body;
  const result = adsMarketingModule.budgetQuickSimulation(req.user!.tenantId, campaignId, percentageChange, runs);
  sendSuccess(res, result);
}));

router.get("/budget-portfolio-overview", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.budgetPortfolioOverview(req.user!.tenantId);
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

router.get("/campaign/:campaignId/funnel-velocity", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.funnelVelocity(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/funnel-leakage-prediction", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.funnelLeakagePrediction(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/funnel-attribution", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.funnelAttribution(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/campaign/:campaignId/funnel-scenario-simulation", asyncHandler(async (req, res) => {
  const { targetStage, improvementPct } = req.body;
  const result = adsMarketingModule.funnelScenarioSimulation(req.params.campaignId, req.user!.tenantId, targetStage, improvementPct);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/funnel-channel-breakdown", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.funnelChannelBreakdown(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/funnel-health-score", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.funnelHealthScore(req.params.campaignId, req.user!.tenantId);
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
  const result = adsMarketingModule.campaignPerformanceForecast(req.params.campaignId, req.user!.tenantId);
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

router.get("/campaign/:campaignId/bidding-dashboard", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.biddingDashboard(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/auction-insights", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.auctionInsights(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/bid-adjustments", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.bidAdjustments(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/campaign/:campaignId/bid-scenario", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.bidScenario(req.params.campaignId, req.user!.tenantId, req.body);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/bid-efficiency", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.bidEfficiency(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/bid-strategy", asyncHandler(async (req, res) => {
  const goal = req.query.goal as string;
  const result = adsMarketingModule.bidStrategy(req.params.campaignId, req.user!.tenantId, goal);
  sendSuccess(res, result);
}));

router.post("/batch-update-status", asyncHandler(async (req, res) => {
  const result = await adsMarketingModule.batchUpdateCampaignStatus(req.user!.tenantId, req.body.updates);
  sendSuccess(res, result);
}));

router.post("/batch-update-budget", asyncHandler(async (req, res) => {
  const result = await adsMarketingModule.batchUpdateCampaignBudget(req.user!.tenantId, req.body.updates);
  sendSuccess(res, result);
}));

router.get("/daily-ops-overview", asyncHandler(async (req, res) => {
  const result = await adsMarketingModule.dailyOpsOverview(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/goal-dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.goalDashboard(req.user!.tenantId));
}));

router.get("/goal-quick-check", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.goalQuickCheck(req.user!.tenantId));
}));

router.get("/scorecard-daily-snapshot", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.scorecardDailySnapshot(req.user!.tenantId));
}));

router.get("/real-time-portfolio-summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.realTimePortfolioSummary(req.user!.tenantId));
}));

router.post("/real-time-batch-resolve-alerts", asyncHandler(async (req, res) => {
  const { campaignId, alertIds, action } = req.body;
  sendSuccess(res, adsMarketingModule.realTimeBatchResolveAlerts(campaignId, req.user!.tenantId, alertIds || [], action || "resolve"));
}));

router.get("/diagnostics-priority-list", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.diagnosticsPriorityList(req.user!.tenantId));
}));

router.get("/funnel-portfolio-health", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.funnelPortfolioHealth(req.user!.tenantId));
}));

router.post("/health-predictor-quick-view", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.healthPredictorQuickView(req.body.campaignInputs || []));
}));

router.get("/creative-portfolio-health", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.creativePortfolioHealth(req.user!.tenantId));
}));

router.get("/saturation-portfolio-overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.saturationPortfolioOverview(req.user!.tenantId));
}));

router.get("/bidding-portfolio-overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.biddingPortfolioOverview(req.user!.tenantId));
}));

router.get("/snapshot-portfolio-summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.snapshotPortfolioSummary(req.user!.tenantId));
}));

router.get("/summary-portfolio-quick-view", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.summaryPortfolioQuickView(req.user!.tenantId));
}));

router.post("/bidding-batch-apply-adjustments", asyncHandler(async (req, res) => {
  const { priorityOnly } = req.body;
  sendSuccess(res, adsMarketingModule.biddingBatchApplyAdjustments(req.user!.tenantId, priorityOnly !== false));
}));

router.post("/snapshot-batch-capture", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.snapshotBatchCapture(req.user!.tenantId, req.body.name));
}));

router.get("/saturation-batch-mitigation", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.saturationBatchMitigation(req.user!.tenantId));
}));

router.get("/diagnostics-batch-fix-plan", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.diagnosticsBatchFixPlan(req.user!.tenantId));
}));

router.get("/creative-batch-refresh-plan", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.creativeBatchRefreshPlan(req.user!.tenantId));
}));

router.get("/goal-batch-status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.goalBatchStatus(req.user!.tenantId));
}));

router.get("/budget-rebalance-plan", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.budgetRebalancePlan(req.user!.tenantId));
}));

router.get("/daily-execution-dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, await adsMarketingModule.dailyExecutionDashboard(req.user!.tenantId));
}));

router.get("/command-center-summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.commandCenterSummary(req.user!.tenantId));
}));

router.get("/daily-briefing", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.dailyBriefing(req.user!.tenantId));
}));

router.post("/parse-voice-command", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.parseVoiceCommand(req.body.text || ""));
}));

router.get("/quick-actions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.quickActions(req.user!.tenantId));
}));

router.get("/approval-settings", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.approvalGetSettings(req.user!.tenantId));
}));

router.post("/approval-settings", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.approvalUpdateSettings(req.user!.tenantId, req.body.updates || {}));
}));

router.post("/approval-evaluate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.approvalEvaluate(req.user!.tenantId, req.body.action || {}));
}));

router.post("/approval-evaluate-batch", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.approvalEvaluateBatch(req.user!.tenantId, req.body.actions || []));
}));

router.post("/approval-approve-all", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.approvalApproveAll(req.user!.tenantId, req.body.actions || []));
}));

router.post("/approval-decide", asyncHandler(async (req, res) => {
  const { actionId, decision } = req.body;
  sendSuccess(res, adsMarketingModule.approvalDecide(req.user!.tenantId, actionId, decision || "approve"));
}));

router.get("/approval-decision-log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.approvalDecisionLog(req.user!.tenantId));
}));

router.post("/triage-alert", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.triageAlert(req.body.alert || {}));
}));

router.post("/triage-batch", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.triageBatch(req.body.alerts || []));
}));

router.post("/triage-execute", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.triageExecute(req.user!.tenantId, req.body.alert || {}));
}));

router.get("/triage-history", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.triageHistory(req.user!.tenantId));
}));

router.get("/campaign-templates", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.templateList());
}));

router.get("/campaign-templates/launch-history", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.templateLaunchHistory(req.user!.tenantId));
}));

router.get("/campaign-templates/:templateId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.templateGet(req.params.templateId));
}));

router.post("/campaign-templates/instantiate", asyncHandler(async (req, res) => {
  const { templateId, inputs } = req.body;
  sendSuccess(res, adsMarketingModule.templateInstantiate(templateId, inputs || {}));
}));

router.post("/campaign-templates/launch", asyncHandler(async (req, res) => {
  const { templateId, inputs } = req.body;
  sendSuccess(res, adsMarketingModule.templateLaunch(req.user!.tenantId, templateId, inputs || {}));
}));

router.post("/audiences/build", asyncHandler(async (req, res) => {
  const { name, segments, options } = req.body;
  sendSuccess(res, adsMarketingModule.audienceBuild(req.user!.tenantId, name || "", segments || [], options || {}));
}));

router.post("/audiences/sync", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.audienceSyncToPlatforms(req.user!.tenantId, req.body.audienceId || ""));
}));

router.get("/audiences/quality", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.audienceQualityScoring(req.user!.tenantId));
}));

router.get("/audiences/ltv-ranking", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.audienceLtvRanking(req.user!.tenantId));
}));

router.post("/audiences/auto-actions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.audienceApplyAutoActions(req.user!.tenantId));
}));

router.get("/audiences/sync-status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.audienceSyncStatus(req.user!.tenantId));
}));

router.post("/autopilot/enable", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.autopilotEnable(req.user!.tenantId, req.body.config || {}));
}));

router.get("/autopilot/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.autopilotStatus(req.user!.tenantId));
}));

router.post("/autopilot/cycle", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.autopilotRunCycle(req.user!.tenantId));
}));

router.get("/autopilot/alerts", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.autopilotSpendAlerts(req.user!.tenantId));
}));

router.get("/autopilot/daily-summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.autopilotDailySummary(req.user!.tenantId));
}));

router.get("/weekly-review", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.weeklyReview(req.user!.tenantId));
}));

router.get("/monthly-strategy-deck", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.monthlyStrategyDeck(req.user!.tenantId));
}));

router.get("/ai-optimization-log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.aiOptimizationLog(req.user!.tenantId));
}));

router.post("/launch-wizard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.launchWizard(req.user!.tenantId, req.body.request || {}));
}));

router.post("/campaigns/duplicate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.duplicateCampaign(req.user!.tenantId, req.body.campaignId || ""));
}));

router.post("/campaigns/mirror", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mirrorCampaign(req.user!.tenantId, req.body.campaignId || "", req.body.platforms || []));
}));

router.get("/campaigns/:campaignId/launch-readiness", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.launchReadiness(req.user!.tenantId, req.params.campaignId));
}));

router.post("/creatives/generate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.creativeGenerate(req.user!.tenantId, req.body.description || "", req.body.count || 3));
}));

router.get("/creatives/fatigue", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.creativeDetectFatigue(req.user!.tenantId));
}));

router.post("/creatives/auto-refresh", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.creativeRunAutoRefresh(req.user!.tenantId));
}));

router.post("/assets/upload", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.assetUpload(req.user!.tenantId, req.body.asset || {}));
}));

router.get("/assets/library-status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.assetLibraryStatus(req.user!.tenantId));
}));

router.get("/quick-fixes", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.quickFixes(req.user!.tenantId));
}));

router.post("/quick-fixes/apply", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.applyQuickFix(req.user!.tenantId, req.body.fixId || ""));
}));

router.post("/quick-fixes/fix-all", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.fixAll(req.user!.tenantId));
}));

router.post("/campaigns/workflow", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.campaignWorkflow(req.user!.tenantId, req.body.campaignId || ""));
}));

router.get("/workflow-log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.workflowLog(req.user!.tenantId));
}));

router.get("/fraud-protection-status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.fraudProtectionStatus(req.user!.tenantId));
}));

router.get("/placements/monitor", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.placementMonitor(req.user!.tenantId));
}));

router.post("/placements/auto-pause", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.placementAutoPause(req.user!.tenantId));
}));

router.get("/brand-safety/crisis", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.crisisResponse(req.user!.tenantId));
}));

router.post("/brand-safety/escalate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.escalateToLegal(req.user!.tenantId, req.body.crisisId || ""));
}));

router.post("/brand-safety/resume", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.resumeOnSafeInventory(req.user!.tenantId, req.body.crisisId || ""));
}));

router.get("/guardian-log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.guardianLog(req.user!.tenantId));
}));

router.get("/attribution-report", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.attributionReport(req.user!.tenantId));
}));

router.post("/attribution-query", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.attributionQuery(req.user!.tenantId, req.body.query || ""));
}));

router.get("/cross-platform-performance", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.crossPlatformPerformance(req.user!.tenantId));
}));

// ── N0VA MAIL (Round 15) ────────────────────────────────────────────────
router.get("/mail/mailboxes", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMailboxes(req.user!.tenantId));
}));

router.post("/mail/mailboxes", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateMailbox(req.user!.tenantId, req.body || {}));
}));

router.get("/mail/mailboxes/:mailboxId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMailbox(req.user!.tenantId, req.params.mailboxId));
}));

router.patch("/mail/mailboxes/:mailboxId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUpdateMailbox(req.user!.tenantId, req.params.mailboxId, req.body || {}));
}));

router.delete("/mail/mailboxes/:mailboxId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteMailbox(req.user!.tenantId, req.params.mailboxId));
}));

router.get("/mail/mailboxes/:mailboxId/quota", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMailboxQuota(req.user!.tenantId, req.params.mailboxId));
}));

router.get("/mail/storage-analytics", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailStorageAnalytics(req.user!.tenantId));
}));

router.get("/mail/messages", asyncHandler(async (req, res) => {
  const opts: Record<string, any> = {};
  for (const key of ["mailboxId", "folder", "label", "from", "to", "startDate", "endDate", "limit"]) {
    if (req.query[key] !== undefined) opts[key] = req.query[key];
  }
  if (req.query.unread === "true") opts.unread = true;
  if (req.query.starred === "true") opts.starred = true;
  if (req.query.hasAttachment === "true") opts.hasAttachment = true;
  sendSuccess(res, adsMarketingModule.mailMessages(req.user!.tenantId, opts));
}));

router.get("/mail/messages/:messageId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMessage(req.user!.tenantId, req.params.messageId));
}));

router.post("/mail/messages/send", asyncHandler(async (req, res) => {
  const { mailboxId, ...input } = req.body || {};
  sendSuccess(res, adsMarketingModule.mailSend(req.user!.tenantId, mailboxId, input));
}));

router.post("/mail/messages/draft", asyncHandler(async (req, res) => {
  const { mailboxId, ...input } = req.body || {};
  sendSuccess(res, adsMarketingModule.mailSaveDraft(req.user!.tenantId, mailboxId, input));
}));

router.post("/mail/messages/:messageId/send", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSendDraft(req.user!.tenantId, req.params.messageId));
}));

router.post("/mail/messages/receive", asyncHandler(async (req, res) => {
  const { mailboxId, ...input } = req.body || {};
  sendSuccess(res, adsMarketingModule.mailReceive(req.user!.tenantId, mailboxId, input));
}));

router.post("/mail/messages/:messageId/read", asyncHandler(async (req, res) => {
  const read = req.body && req.body.read !== undefined ? !!req.body.read : true;
  sendSuccess(res, adsMarketingModule.mailMarkRead(req.user!.tenantId, req.params.messageId, read));
}));

router.post("/mail/messages/:messageId/star", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailToggleStar(req.user!.tenantId, req.params.messageId));
}));

router.post("/mail/messages/:messageId/move", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMove(req.user!.tenantId, req.params.messageId, req.body.folder || "inbox"));
}));

router.post("/mail/messages/:messageId/archive", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailArchive(req.user!.tenantId, req.params.messageId));
}));

router.post("/mail/messages/:messageId/trash", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTrash(req.user!.tenantId, req.params.messageId));
}));

router.post("/mail/messages/:messageId/restore", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRestore(req.user!.tenantId, req.params.messageId));
}));

router.delete("/mail/messages/:messageId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteMessage(req.user!.tenantId, req.params.messageId));
}));

router.post("/mail/messages/:messageId/labels", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailApplyLabel(req.user!.tenantId, req.params.messageId, req.body.label || ""));
}));

router.delete("/mail/messages/:messageId/labels/:label", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRemoveLabel(req.user!.tenantId, req.params.messageId, req.params.label));
}));

router.get("/mail/folders", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFolders(req.user!.tenantId, req.query.mailboxId as string | undefined));
}));

router.post("/mail/folders", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateFolder(req.user!.tenantId, req.body || {}));
}));

router.delete("/mail/folders/:folderId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteFolder(req.user!.tenantId, req.params.folderId));
}));

router.get("/mail/unread-summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUnreadSummary(req.user!.tenantId));
}));

router.get("/mail/rules", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRules(req.user!.tenantId));
}));

router.get("/mail/rules/templates", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRuleTemplates());
}));

router.post("/mail/rules/templates/:templateId/instantiate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailInstantiateRuleTemplate(req.user!.tenantId, req.params.templateId));
}));

router.get("/mail/rules/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRulesDashboard(req.user!.tenantId));
}));

router.get("/mail/rules/:ruleId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRule(req.user!.tenantId, req.params.ruleId));
}));

router.post("/mail/rules", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateRule(req.user!.tenantId, req.body || {}));
}));

router.patch("/mail/rules/:ruleId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUpdateRule(req.user!.tenantId, req.params.ruleId, req.body || {}));
}));

router.post("/mail/rules/:ruleId/toggle", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailToggleRule(req.user!.tenantId, req.params.ruleId, req.body ? req.body.enabled : undefined));
}));

router.delete("/mail/rules/:ruleId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteRule(req.user!.tenantId, req.params.ruleId));
}));

router.post("/mail/rules/:ruleId/evaluate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailEvaluateRule(req.user!.tenantId, req.params.ruleId, req.body.messageId || ""));
}));

router.post("/mail/rules/:ruleId/script-run", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRunScriptRule(req.user!.tenantId, req.params.ruleId, req.body.messageId || ""));
}));

router.post("/mail/rules/test", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTestRule(req.user!.tenantId, req.body.ruleId || "", req.body.sample || {}));
}));

router.post("/mail/evaluate-all", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailEvaluateAllRules(req.user!.tenantId, req.body.messageId || ""));
}));

router.get("/mail/search", asyncHandler(async (req, res) => {
  const opts: Record<string, any> = {};
  for (const key of ["query", "mailboxId", "folder", "label", "from", "to", "startDate", "endDate"]) {
    if (req.query[key] !== undefined) opts[key] = req.query[key];
  }
  if (req.query.unread === "true") opts.unread = true;
  if (req.query.hasAttachment === "true") opts.hasAttachment = true;
  if (req.query.priority) opts.priority = req.query.priority;
  sendSuccess(res, adsMarketingModule.mailSearch(req.user!.tenantId, opts));
}));

router.post("/mail/search/semantic", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSemanticSearch(req.user!.tenantId, req.body.query || ""));
}));

router.get("/mail/search/suggestions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSearchSuggestions(req.user!.tenantId, (req.query.q as string) || ""));
}));

router.get("/mail/search/stats", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSearchStats(req.user!.tenantId));
}));

router.post("/mail/ai/enrich/:messageId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailEnrich(req.user!.tenantId, req.params.messageId));
}));

router.post("/mail/ai/smart-reply/:messageId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSmartReply(req.user!.tenantId, req.params.messageId));
}));

router.post("/mail/ai/summarize-thread/:threadId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSummarizeThread(req.user!.tenantId, req.params.threadId));
}));

router.post("/mail/ai/meeting-prep/:threadId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMeetingPrep(req.user!.tenantId, req.params.threadId));
}));

router.get("/mail/ai/intelligence", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntelligence(req.user!.tenantId));
}));

// ── N0VA MAIL Round 17: contacts / agent / compliance / voice ───────────
router.get("/mail/contacts", asyncHandler(async (req, res) => {
  const opts: Record<string, any> = {};
  for (const key of ["query", "group", "limit", "sort"]) {
    if (req.query[key] !== undefined) opts[key] = req.query[key];
  }
  sendSuccess(res, adsMarketingModule.mailContacts(req.user!.tenantId, opts));
}));

router.get("/mail/contacts/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailContactsDashboard(req.user!.tenantId));
}));

router.get("/mail/contacts/groups", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailContactGroups(req.user!.tenantId));
}));

router.get("/mail/contacts/most-contacted", asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 5;
  sendSuccess(res, adsMarketingModule.mailMostContacted(req.user!.tenantId, limit));
}));

router.post("/mail/contacts", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateContact(req.user!.tenantId, req.body || {}));
}));

// Round 40: contacts bulk tools (GET routes MUST precede /mail/contacts/:contactId)
router.get("/mail/contacts/bulk-dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailContactBulkDashboard(req.user!.tenantId));
}));

router.get("/mail/contacts/bulk-log", asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
  sendSuccess(res, adsMarketingModule.mailContactBulkLog(req.user!.tenantId, limit));
}));

router.get("/mail/contacts/export", asyncHandler(async (req, res) => {
  const opts: Record<string, any> = {};
  if (req.query.format !== undefined) opts.format = req.query.format;
  if (req.query.group !== undefined) opts.group = req.query.group;
  sendSuccess(res, adsMarketingModule.mailContactExport(req.user!.tenantId, opts));
}));

router.post("/mail/contacts/import", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailContactImport(req.user!.tenantId, req.body || {}));
}));

router.post("/mail/contacts/merge", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailContactMerge(req.user!.tenantId, req.body || {}));
}));

router.post("/mail/contacts/dedupe", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailContactDedupe(req.user!.tenantId));
}));

router.post("/mail/contacts/bulk-tag", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailContactBulkTag(req.user!.tenantId, req.body || {}));
}));

router.post("/mail/contacts/bulk-delete", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailContactBulkDelete(req.user!.tenantId, req.body || {}));
}));

router.get("/mail/contacts/:contactId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailContact(req.user!.tenantId, req.params.contactId));
}));

router.patch("/mail/contacts/:contactId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUpdateContact(req.user!.tenantId, req.params.contactId, req.body || {}));
}));

router.delete("/mail/contacts/:contactId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteContact(req.user!.tenantId, req.params.contactId));
}));

router.get("/mail/contacts/:contactId/profile", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailContactProfile(req.user!.tenantId, req.params.contactId));
}));

router.get("/mail/agent/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentStatus(req.user!.tenantId));
}));

router.get("/mail/agent/log", asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
  sendSuccess(res, adsMarketingModule.mailAgentLog(req.user!.tenantId, limit));
}));

router.post("/mail/agent/cycle", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRunAgentCycle(req.user!.tenantId, req.body?.mailboxId || undefined));
}));

router.get("/mail/agent/ooo/:mailboxId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailOutOfOfficeStatus(req.user!.tenantId, req.params.mailboxId));
}));

router.post("/mail/agent/ooo/:mailboxId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSetOutOfOffice(req.user!.tenantId, req.params.mailboxId, req.body || {}));
}));

router.get("/mail/agent/scheduled", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailListScheduled(req.user!.tenantId, req.query.mailboxId ? String(req.query.mailboxId) : undefined));
}));

router.post("/mail/agent/scheduled", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailScheduleSend(req.user!.tenantId, req.body?.mailboxId || undefined, req.body || {}));
}));

router.post("/mail/agent/scheduled/:scheduleId/cancel", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCancelSchedule(req.user!.tenantId, req.params.scheduleId));
}));

router.post("/mail/agent/tasks/extract/:messageId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailExtractTasks(req.user!.tenantId, req.params.messageId));
}));

router.get("/mail/agent/tasks", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailListTasks(req.user!.tenantId));
}));

router.post("/mail/agent/tasks/:taskId/complete", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCompleteTask(req.user!.tenantId, req.params.taskId));
}));

router.get("/mail/compliance/summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailComplianceSummary(req.user!.tenantId));
}));

router.get("/mail/compliance/policies", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRetentionPolicies(req.user!.tenantId));
}));

router.post("/mail/compliance/policies", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSetRetentionPolicy(req.user!.tenantId, req.body || {}));
}));

router.delete("/mail/compliance/policies/:policyId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteRetentionPolicy(req.user!.tenantId, req.params.policyId));
}));

router.post("/mail/compliance/retention/apply", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailApplyRetention(req.user!.tenantId));
}));

router.get("/mail/compliance/holds", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailListHolds(req.user!.tenantId));
}));

router.post("/mail/compliance/holds", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPlaceHold(req.user!.tenantId, req.body || {}));
}));

router.post("/mail/compliance/holds/:holdId/release", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailReleaseHold(req.user!.tenantId, req.params.holdId));
}));

router.get("/mail/compliance/hold-status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailHoldStatus(req.user!.tenantId));
}));

router.get("/mail/compliance/audit", asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 30;
  sendSuccess(res, adsMarketingModule.mailAuditLog(req.user!.tenantId, limit));
}));

router.post("/mail/compliance/pii/scan", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailScanPii(req.user!.tenantId));
}));

router.get("/mail/compliance/hold-calendar", asyncHandler(async (req, res) => {
  const month = typeof req.query.month === "string" ? req.query.month : undefined;
  sendSuccess(res, adsMarketingModule.mailComplianceHoldCalendar(req.user!.tenantId, month));
}));

router.get("/mail/compliance/reports", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailComplianceReports(req.user!.tenantId));
}));

router.get("/mail/compliance/report/:framework", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailComplianceReport(req.user!.tenantId, req.params.framework));
}));

router.post("/mail/compliance/report/:framework/export", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailComplianceExportReport(req.user!.tenantId, req.params.framework));
}));

router.post("/mail/voice/parse", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailParseVoiceCommand(req.user!.tenantId, req.body?.command || ""));
}));

router.post("/mail/voice/execute", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailExecuteVoiceCommand(req.user!.tenantId, req.body?.command || ""));
}));

router.get("/mail/voice/help", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailVoiceHelp());
}));

router.get("/mail/templates", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTemplates(req.user!.tenantId));
}));

router.get("/mail/templates/stats", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTemplateStats(req.user!.tenantId));
}));

router.get("/mail/templates/usage", asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
  sendSuccess(res, adsMarketingModule.mailTemplateUsageLog(req.user!.tenantId, limit));
}));

router.post("/mail/templates/send", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSendFromTemplate(req.user!.tenantId, req.body?.mailboxId || "", req.body || {}));
}));

router.post("/mail/templates/bulk", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSendBulkTemplate(req.user!.tenantId, req.body?.mailboxId || "", req.body || {}));
}));

router.post("/mail/templates/render", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRenderTemplate(req.user!.tenantId, req.body?.templateId || "", (req.body?.variables || {})));
}));

router.get("/mail/templates/:templateId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTemplate(req.user!.tenantId, req.params.templateId));
}));

router.post("/mail/templates", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateTemplate(req.user!.tenantId, req.body || {}));
}));

router.patch("/mail/templates/:templateId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUpdateTemplate(req.user!.tenantId, req.params.templateId, req.body || {}));
}));

router.delete("/mail/templates/:templateId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteTemplate(req.user!.tenantId, req.params.templateId));
}));

router.get("/mail/signatures", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSignatures(req.user!.tenantId));
}));

router.get("/mail/signatures/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSignaturesDashboard(req.user!.tenantId));
}));

router.get("/mail/signatures/default", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDefaultSignature(req.user!.tenantId));
}));

router.get("/mail/signatures/:mailboxId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSignature(req.user!.tenantId, req.params.mailboxId));
}));

router.put("/mail/signatures/:mailboxId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUpdateSignature(req.user!.tenantId, req.params.mailboxId, req.body || {}));
}));

router.post("/mail/signatures/:mailboxId/toggle", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailToggleSignature(req.user!.tenantId, req.params.mailboxId, !!req.body?.enabled));
}));

router.post("/mail/signatures/:mailboxId/preview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSignaturePreview(req.user!.tenantId, req.params.mailboxId, req.body?.body || ""));
}));

router.get("/mail/spam/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSpamStatus(req.user!.tenantId));
}));

router.get("/mail/spam/quarantine", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuarantine(req.user!.tenantId, req.query || {}));
}));

router.post("/mail/spam/scan/:messageId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailScanMessage(req.user!.tenantId, req.params.messageId));
}));

router.post("/mail/spam/scan-all", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailScanAll(req.user!.tenantId));
}));

router.post("/mail/spam/:messageId/report", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailReportSpam(req.user!.tenantId, req.params.messageId));
}));

router.post("/mail/spam/:messageId/not-spam", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailReportNotSpam(req.user!.tenantId, req.params.messageId));
}));

router.get("/mail/spam/blocked", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBlockedSenders(req.user!.tenantId));
}));

router.post("/mail/spam/blocked", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBlockSender(req.user!.tenantId, req.body || {}));
}));

router.delete("/mail/spam/blocked/:email", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUnblockSender(req.user!.tenantId, decodeURIComponent(req.params.email)));
}));

router.get("/mail/spam/allowed", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAllowedSenders(req.user!.tenantId));
}));

router.post("/mail/spam/allowed", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAllowSender(req.user!.tenantId, req.body || {}));
}));

router.delete("/mail/spam/allowed/:email", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRemoveAllowedSender(req.user!.tenantId, decodeURIComponent(req.params.email)));
}));

router.get("/mail/spam/log", asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
  sendSuccess(res, adsMarketingModule.mailSpamLog(req.user!.tenantId, limit));
}));

router.post("/mail/messages/:messageId/snooze", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSnooze(req.user!.tenantId, req.params.messageId, req.body?.until || ""));
}));

router.post("/mail/messages/:messageId/unsnooze", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUnsnooze(req.user!.tenantId, req.params.messageId));
}));

router.get("/mail/followups/snoozed", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailListSnoozed(req.user!.tenantId));
}));

router.post("/mail/messages/:messageId/awaiting", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarkAwaitingResponse(req.user!.tenantId, req.params.messageId, req.body?.deadline || undefined));
}));

router.post("/mail/messages/:messageId/responded", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarkResponded(req.user!.tenantId, req.params.messageId));
}));

router.get("/mail/followups", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailListFollowUps(req.user!.tenantId, req.query || {}));
}));

router.get("/mail/followups/summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFollowUpSummary(req.user!.tenantId));
}));

router.get("/mail/followups/suggestions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFollowUpSuggestions(req.user!.tenantId));
}));

router.post("/mail/followups", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateFollowUp(req.user!.tenantId, req.body?.messageId || "", req.body || {}));
}));

router.post("/mail/followups/:followUpId/complete", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCompleteFollowUp(req.user!.tenantId, req.params.followUpId));
}));

router.delete("/mail/followups/:followUpId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteFollowUp(req.user!.tenantId, req.params.followUpId));
}));

router.get("/mail/analytics/overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAnalyticsOverview(req.user!.tenantId));
}));

router.get("/mail/analytics/trend", asyncHandler(async (req, res) => {
  const days = req.query.days ? parseInt(String(req.query.days), 10) : 14;
  sendSuccess(res, adsMarketingModule.mailAnalyticsTrend(req.user!.tenantId, days));
}));

router.get("/mail/analytics/categories", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAnalyticsCategories(req.user!.tenantId));
}));

router.get("/mail/analytics/senders", asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 5;
  sendSuccess(res, adsMarketingModule.mailAnalyticsSenders(req.user!.tenantId, limit));
}));

router.get("/mail/analytics/response-times", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAnalyticsResponseTimes(req.user!.tenantId));
}));

router.get("/mail/analytics/hours", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAnalyticsHours(req.user!.tenantId));
}));

router.get("/mail/analytics/folders", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAnalyticsFolders(req.user!.tenantId));
}));

router.get("/mail/analytics/mailboxes", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAnalyticsMailboxes(req.user!.tenantId));
}));

router.get("/mail/analytics/executive", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAnalyticsExecutive(req.user!.tenantId));
}));

router.get("/mail/attachments", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAttachments(req.user!.tenantId, req.query || {}));
}));

router.get("/mail/attachments/stats", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAttachmentStats(req.user!.tenantId));
}));

router.get("/mail/attachments/:attachmentId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAttachment(req.user!.tenantId, req.params.attachmentId));
}));

router.post("/mail/attachments/:attachmentId/scan", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailScanAttachment(req.user!.tenantId, req.params.attachmentId));
}));

router.post("/mail/attachments/:attachmentId/quarantine", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuarantineAttachment(req.user!.tenantId, req.params.attachmentId));
}));

router.get("/mail/collab/presence", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPresence(req.user!.tenantId));
}));

router.get("/mail/collab/summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollaborationSummary(req.user!.tenantId));
}));

router.get("/mail/collab/comments/message/:messageId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCommentsForMessage(req.user!.tenantId, req.params.messageId));
}));

router.get("/mail/collab/comments/thread/:threadId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCommentsForThread(req.user!.tenantId, req.params.threadId));
}));

router.post("/mail/collab/comments", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAddComment(req.user!.tenantId, req.body.messageId, req.body));
}));

router.delete("/mail/collab/comments/:commentId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteComment(req.user!.tenantId, req.params.commentId));
}));

router.get("/mail/collab/reactions/:messageId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMessageReactions(req.user!.tenantId, req.params.messageId));
}));

router.post("/mail/collab/reactions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAddReaction(req.user!.tenantId, req.body.messageId, req.body));
}));

router.delete("/mail/collab/reactions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRemoveReaction(req.user!.tenantId, req.body.messageId, req.body));
}));

router.get("/mail/collab/state/:messageId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollaborationState(req.user!.tenantId, req.params.messageId));
}));

router.get("/mail/collab/drafts", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSharedDrafts(req.user!.tenantId, req.query || {}));
}));

router.post("/mail/collab/drafts", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateSharedDraft(req.user!.tenantId, req.body.mailboxId, req.body));
}));

router.put("/mail/collab/drafts/:draftId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUpdateSharedDraft(req.user!.tenantId, req.params.draftId, req.body || {}));
}));

router.delete("/mail/collab/drafts/:draftId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteSharedDraft(req.user!.tenantId, req.params.draftId));
}));

router.get("/mail/predict/response/:threadId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailResponseTimePrediction(req.user!.tenantId, req.params.threadId));
}));

router.get("/mail/predict/outcome/:messageId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailOutcomePrediction(req.user!.tenantId, req.params.messageId));
}));

router.get("/mail/predict/churn/:threadId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailChurnRisk(req.user!.tenantId, req.params.threadId));
}));

router.get("/mail/predict/intent/:messageId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntentPrediction(req.user!.tenantId, req.params.messageId));
}));

router.get("/mail/predict/relationship/:contact", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRelationshipHealth(req.user!.tenantId, req.params.contact));
}));

router.get("/mail/predict/optimal-time", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailOptimalSendTime(req.user!.tenantId));
}));

router.get("/mail/predict/workload", asyncHandler(async (req, res) => {
  const days = req.query.days ? parseInt(String(req.query.days), 10) : 7;
  sendSuccess(res, adsMarketingModule.mailWorkloadForecast(req.user!.tenantId, days));
}));

router.get("/mail/predict/nudges", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailNudgeSuggestions(req.user!.tenantId));
}));

router.get("/mail/predict/send-time", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSendTimeSuggestion(req.user!.tenantId));
}));

router.get("/mail/predict/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPredictiveDashboard(req.user!.tenantId));
}));

router.post("/mail/campaigns", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateCampaign(req.user!.tenantId, req.body.mailboxId, req.body));
}));

router.get("/mail/campaigns/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCampaignsDashboard(req.user!.tenantId));
}));

router.get("/mail/campaigns", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCampaigns(req.user!.tenantId));
}));

router.get("/mail/campaigns/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCampaignLog(req.user!.tenantId));
}));

router.get("/mail/campaigns/:campaignId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCampaign(req.user!.tenantId, req.params.campaignId));
}));

router.delete("/mail/campaigns/:campaignId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteCampaign(req.user!.tenantId, req.params.campaignId));
}));

router.post("/mail/campaigns/:campaignId/launch", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailLaunchCampaign(req.user!.tenantId, req.params.campaignId));
}));

router.post("/mail/campaigns/:campaignId/approve", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailApproveCampaign(req.user!.tenantId, req.params.campaignId, (req.body || {}).approver));
}));

router.post("/mail/campaigns/:campaignId/reject", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRejectCampaign(req.user!.tenantId, req.params.campaignId, (req.body || {}).reason));
}));

router.post("/mail/campaigns/:campaignId/pause", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPauseCampaign(req.user!.tenantId, req.params.campaignId));
}));

router.post("/mail/campaigns/:campaignId/resume", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailResumeCampaign(req.user!.tenantId, req.params.campaignId));
}));

router.get("/mail/campaigns/:campaignId/stats", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCampaignStats(req.user!.tenantId, req.params.campaignId));
}));

router.get("/mail/campaigns/:campaignId/responses", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCampaignResponseHandling(req.user!.tenantId, req.params.campaignId));
}));

router.get("/mail/discovery/summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDiscoverySummary(req.user!.tenantId));
}));

router.post("/mail/discovery/search", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDiscoverySearch(req.user!.tenantId, (req.body || {}).scope || {}, (req.body || {}).opts || {}));
}));

router.get("/mail/discovery/searches", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSavedSearches(req.user!.tenantId));
}));

router.post("/mail/discovery/searches", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSaveSearch(req.user!.tenantId, req.body || {}));
}));

router.get("/mail/discovery/searches/:searchId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRunSavedSearch(req.user!.tenantId, req.params.searchId));
}));

router.delete("/mail/discovery/searches/:searchId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteSavedSearch(req.user!.tenantId, req.params.searchId));
}));

router.get("/mail/discovery/exports", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailExports(req.user!.tenantId));
}));

router.post("/mail/discovery/exports", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateExport(req.user!.tenantId, req.body || {}));
}));

router.get("/mail/discovery/exports/:exportId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailExport(req.user!.tenantId, req.params.exportId));
}));

router.delete("/mail/discovery/exports/:exportId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteExport(req.user!.tenantId, req.params.exportId));
}));

router.get("/mail/discovery/concept-search", asyncHandler(async (req, res) => {
  const query = typeof req.query.query === "string" ? req.query.query : "";
  const opts = { limit: typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 300 };
  sendSuccess(res, adsMarketingModule.mailDiscoveryConceptSearch(req.user!.tenantId, query, opts));
}));

router.post("/mail/discovery/privileges", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDiscoveryMarkPrivileged(req.user!.tenantId, req.body?.messageId || "", req.body || {}));
}));

router.get("/mail/discovery/privileges", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDiscoveryListPrivileges(req.user!.tenantId));
}));

router.delete("/mail/discovery/privileges/:messageId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDiscoveryRemovePrivilege(req.user!.tenantId, req.params.messageId));
}));

router.get("/mail/discovery/privilege-summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDiscoveryPrivilegeSummary(req.user!.tenantId));
}));

router.get("/mail/discovery/export-chain", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDiscoveryExportAuditChain(req.user!.tenantId));
}));

router.post("/mail/domains", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRegisterDomain(req.user!.tenantId, req.body || {}));
}));

router.get("/mail/domains/monitor", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailReputationMonitor(req.user!.tenantId));
}));

router.get("/mail/domains/summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDomainSummary(req.user!.tenantId));
}));

router.get("/mail/domains/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDomainLog(req.user!.tenantId));
}));

router.get("/mail/domains", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDomains(req.user!.tenantId));
}));

router.get("/mail/domains/:domainId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDomain(req.user!.tenantId, req.params.domainId));
}));

router.delete("/mail/domains/:domainId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteDomain(req.user!.tenantId, req.params.domainId));
}));

router.post("/mail/domains/:domainId/verify", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailVerifyDomain(req.user!.tenantId, req.params.domainId));
}));

router.get("/mail/domains/:domainId/health", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDomainHealth(req.user!.tenantId, req.params.domainId));
}));

router.post("/mail/domains/:domainId/policies", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSetDomainPolicy(req.user!.tenantId, req.params.domainId, req.body || {}));
}));

router.post("/mail/messages/batch", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBatchOps(req.user!.tenantId, req.body.operation, req.body.messageIds || [], req.body));
}));

router.post("/mail/rules/ai-generate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAiGenerateRule(req.user!.tenantId, req.body.naturalLanguage, req.body || {}));
}));

router.post("/mail/voice-notes", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateVoiceNote(req.user!.tenantId, req.body || {}));
}));

router.get("/mail/voice-notes", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailVoiceNotes(req.user!.tenantId, req.query || {}));
}));

router.get("/mail/voice-notes/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailVoiceNoteDashboard(req.user!.tenantId));
}));

router.get("/mail/voice-notes/:noteId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailVoiceNote(req.user!.tenantId, req.params.noteId));
}));

router.delete("/mail/voice-notes/:noteId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteVoiceNote(req.user!.tenantId, req.params.noteId));
}));

router.post("/mail/multimodal/videos", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAttachVideo(req.user!.tenantId, req.body || {}));
}));

router.post("/mail/multimodal/recordings", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAttachScreenRecording(req.user!.tenantId, req.body || {}));
}));

router.post("/mail/multimodal/snippets", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAttachCodeSnippet(req.user!.tenantId, req.body || {}));
}));

router.get("/mail/multimodal/blocks", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailContentBlocks(req.user!.tenantId, req.query || {}));
}));

router.get("/mail/multimodal/blocks/:blockId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailContentBlock(req.user!.tenantId, req.params.blockId));
}));

router.delete("/mail/multimodal/blocks/:blockId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteContentBlock(req.user!.tenantId, req.params.blockId));
}));

router.get("/mail/multimodal/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMultimodalDashboard(req.user!.tenantId));
}));

router.post("/mail/polls", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreatePoll(req.user!.tenantId, req.body || {}));
}));

router.get("/mail/polls", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPolls(req.user!.tenantId));
}));

router.get("/mail/polls/:pollId/results", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPollResults(req.user!.tenantId, req.params.pollId));
}));

router.post("/mail/polls/:pollId/vote", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailVotePoll(req.user!.tenantId, req.params.pollId, req.body.optionIndex, req.body.voter || "user_001"));
}));

router.post("/mail/polls/:pollId/close", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailClosePoll(req.user!.tenantId, req.params.pollId));
}));

router.get("/mail/neural/overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailNeuralOverview(req.user!.tenantId, typeof req.query.mailboxId === "string" ? req.query.mailboxId : undefined));
}));

router.get("/mail/neural/suggestions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailNeuralSuggestions(req.user!.tenantId, req.query.limit ? parseInt(String(req.query.limit), 10) : undefined));
}));

router.get("/mail/neural/tasks", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailNeuralTasks(req.user!.tenantId));
}));

router.get("/mail/neural/unsubscribe", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailNeuralUnsubscribe(req.user!.tenantId));
}));

router.post("/mail/neural/archive", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailNeuralArchive(req.user!.tenantId, req.body || {}));
}));

router.get("/mail/neural/health", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailNeuralHealth(req.user!.tenantId));
}));

router.get("/mail/neural/escalations", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailNeuralEscalations(req.user!.tenantId));
}));

router.post("/mail/neural/learning", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailNeuralLearning(req.user!.tenantId, req.body.action, req.body.item || {}));
}));

router.get("/mail/neural/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailNeuralDashboard(req.user!.tenantId, typeof req.query.mailboxId === "string" ? req.query.mailboxId : undefined));
}));

router.post("/mail/rules/sweep", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSweepRules(req.user!.tenantId));
}));

router.post("/mail/schedules/:scheduleId/send-now", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSendScheduleNow(req.user!.tenantId, req.params.scheduleId));
}));

router.get("/mail/command-center", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCommandCenter(req.user!.tenantId));
}));

router.post("/mail/command-center/follow-ups/:followUpId/complete", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCommandCompleteFollowUp(req.user!.tenantId, req.params.followUpId));
}));

router.post("/mail/command-center/schedules/:scheduleId/send-now", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCommandSendScheduledNow(req.user!.tenantId, req.params.scheduleId));
}));

router.post("/mail/command-center/campaigns/:campaignId/approve", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCommandApproveCampaign(req.user!.tenantId, req.params.campaignId, typeof req.body.approver === "string" ? req.body.approver : undefined));
}));

router.post("/mail/command-center/campaigns/:campaignId/reject", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCommandRejectCampaign(req.user!.tenantId, req.params.campaignId, typeof req.body.reason === "string" ? req.body.reason : undefined));
}));

router.post("/mail/command-center/rules-sweep", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCommandRunRulesSweep(req.user!.tenantId));
}));

router.post("/mail/command-center/spam-rescan", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCommandRescanSpam(req.user!.tenantId));
}));

router.post("/mail/command-center/agent-cycle", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCommandRunAgentCycle(req.user!.tenantId, typeof req.query.mailboxId === "string" ? req.query.mailboxId : undefined));
}));

router.post("/mail/command-center/smart-archive", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCommandSmartArchive(req.user!.tenantId, typeof req.body.olderThanDays === "number" ? req.body.olderThanDays : undefined));
}));

router.get("/mail/ops/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailOpsDashboard(req.user!.tenantId));
}));

router.get("/mail/ops/incidents", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailOpsIncidents(req.user!.tenantId));
}));

router.post("/mail/ops/incidents", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailOpsCreateIncident(req.user!.tenantId, req.body || {}));
}));

router.post("/mail/ops/incidents/:incidentId/ack", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailOpsAckIncident(req.user!.tenantId, req.params.incidentId));
}));

router.post("/mail/ops/incidents/:incidentId/resolve", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailOpsResolveIncident(req.user!.tenantId, req.params.incidentId));
}));

router.post("/mail/ops/incidents/:incidentId/escalate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailOpsEscalateIncident(req.user!.tenantId, req.params.incidentId));
}));

router.get("/mail/ops/incident-log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailOpsIncidentLog(req.user!.tenantId));
}));

router.post("/mail/ops/retry-queue", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailOpsRetryQueue(req.user!.tenantId));
}));

router.post("/mail/ops/housekeeping", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailOpsHousekeeping(req.user!.tenantId));
}));

router.post("/mail/ops/checkpoint", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailOpsCheckpoint(req.user!.tenantId, typeof req.body.label === "string" ? req.body.label : undefined));
}));

router.post("/mail/ops/threat-rule", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailOpsThreatRule(req.user!.tenantId));
}));

router.get("/mail/ops/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailOpsLog(req.user!.tenantId));
}));

router.get("/mail/storage/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailStorageDashboard(req.user!.tenantId));
}));

router.put("/mail/storage/policy", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailStorageSetPolicy(req.user!.tenantId, req.body || {}));
}));

router.post("/mail/storage/tiering", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailStorageRunTiering(req.user!.tenantId));
}));

router.get("/mail/storage/suggestions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailStorageSuggestions(req.user!.tenantId));
}));

router.post("/mail/storage/suggestions/apply-all", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailStorageApplyAllCleanups(req.user!.tenantId));
}));

router.post("/mail/storage/suggestions/:suggestionId/apply", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailStorageApplyCleanup(req.user!.tenantId, req.params.suggestionId));
}));

router.get("/mail/search-operators", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSearchOperatorReference());
}));

router.post("/mail/search-operators/parse", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSearchParse(req.body.query || ""));
}));

router.get("/mail/search-operators/search", asyncHandler(async (req, res) => {
  const { query, mailboxId } = req.query;
  sendSuccess(res, adsMarketingModule.mailSearchOperators(req.user!.tenantId, typeof query === "string" ? query : "", typeof mailboxId === "string" ? { mailboxId } : {}));
}));

router.get("/mail/search-operators/examples", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSearchExamples(req.user!.tenantId));
}));

router.get("/mail/search-operators/recent", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSearchRecentQueries(req.user!.tenantId));
}));

router.post("/mail/search-operators/clear", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSearchClearHistory(req.user!.tenantId));
}));

router.get("/mail/search-operators/stats", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSearchOperatorStats(req.user!.tenantId));
}));

router.get("/mail/abuse/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAbuseDashboard(req.user!.tenantId));
}));

router.get("/mail/abuse/overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAbuseOverview(req.user!.tenantId));
}));

router.post("/mail/abuse/scan", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAbuseScan(req.user!.tenantId, req.body.message));
}));

router.post("/mail/abuse/bec-scan", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAbuseBecScan(req.user!.tenantId, req.body.message));
}));

router.post("/mail/abuse/dlp-scan", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAbuseDlpScan(req.user!.tenantId, req.body.message));
}));

router.get("/mail/abuse/rate-limit", asyncHandler(async (req, res) => {
  const { senderEmail } = req.query;
  sendSuccess(res, adsMarketingModule.mailAbuseRateLimit(req.user!.tenantId, typeof senderEmail === "string" ? senderEmail : ""));
}));

router.get("/mail/abuse/impossible-travel", asyncHandler(async (req, res) => {
  const { userId, city } = req.query;
  sendSuccess(res, adsMarketingModule.mailAbuseImpossibleTravel(req.user!.tenantId, typeof userId === "string" ? userId : "user_001", typeof city === "string" ? city : undefined));
}));

router.get("/mail/abuse/pattern-anomaly", asyncHandler(async (req, res) => {
  const { mailboxId } = req.query;
  sendSuccess(res, adsMarketingModule.mailAbusePatternAnomaly(req.user!.tenantId, typeof mailboxId === "string" ? mailboxId : undefined));
}));

router.get("/mail/abuse/honeypots", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAbuseHoneypotStatus(req.user!.tenantId));
}));

router.post("/mail/abuse/threat-response", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAbuseThreatResponse(req.user!.tenantId, req.body.action || "", req.body.target));
}));

router.get("/mail/abuse/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAbuseLog(req.user!.tenantId));
}));

router.get("/mail/webhooks/events", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWebhookEvents());
}));

router.get("/mail/webhooks/overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWebhookOverview(req.user!.tenantId));
}));

router.get("/mail/webhooks/stats", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWebhookStats(req.user!.tenantId));
}));

router.get("/mail/webhooks/deliveries", asyncHandler(async (req, res) => {
  const { webhookId } = req.query;
  sendSuccess(res, adsMarketingModule.mailWebhookDeliveries(req.user!.tenantId, typeof webhookId === "string" ? webhookId : undefined));
}));

router.post("/mail/webhooks/trigger", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWebhookTrigger(req.user!.tenantId, req.body.event || "", req.body.payload || {}));
}));

router.get("/mail/webhooks", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWebhookList(req.user!.tenantId));
}));

router.post("/mail/webhooks", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWebhookCreate(req.user!.tenantId, req.body));
}));

router.put("/mail/webhooks/:webhookId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWebhookUpdate(req.user!.tenantId, req.params.webhookId, req.body));
}));

router.delete("/mail/webhooks/:webhookId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWebhookDelete(req.user!.tenantId, req.params.webhookId));
}));

router.post("/mail/webhooks/:webhookId/test", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWebhookTest(req.user!.tenantId, req.params.webhookId));
}));

router.get("/mail/agents/personas", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentPersonas());
}));

router.get("/mail/agents/tools", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentToolCatalog());
}));

router.post("/mail/agents/discover", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentToolDiscover(req.user!.tenantId, req.body.query || ""));
}));

router.get("/mail/agents/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentDashboard(req.user!.tenantId));
}));

router.get("/mail/agents/sessions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentSessions(req.user!.tenantId));
}));

router.get("/mail/agents/hitl", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentHitlQueue(req.user!.tenantId));
}));

router.get("/mail/agents/audit", asyncHandler(async (req, res) => {
  const { agentId } = req.query;
  sendSuccess(res, adsMarketingModule.mailAgentAuditLog(req.user!.tenantId, typeof agentId === "string" ? agentId : undefined));
}));

router.get("/mail/agents", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentList(req.user!.tenantId));
}));

router.post("/mail/agents", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentRegister(req.user!.tenantId, req.body));
}));

router.get("/mail/agents/:agentId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentGet(req.user!.tenantId, req.params.agentId));
}));

router.put("/mail/agents/:agentId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentUpdate(req.user!.tenantId, req.params.agentId, req.body));
}));

router.post("/mail/agents/:agentId/deactivate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentDeactivate(req.user!.tenantId, req.params.agentId));
}));

router.post("/mail/agents/:agentId/sessions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentCreateSession(req.user!.tenantId, req.params.agentId, req.body));
}));

router.post("/mail/agents/sessions/:sessionId/end", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentEndSession(req.user!.tenantId, req.params.sessionId));
}));

router.post("/mail/agents/hitl/:hitlId/resolve", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentResolveHitl(req.user!.tenantId, req.params.hitlId, req.body.decision || ""));
}));

router.post("/mail/agents/:agentId/actions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAgentAction(req.user!.tenantId, req.params.agentId, req.body));
}));

router.get("/mail/integrations/catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationCatalog(req.user!.tenantId));
}));

router.get("/mail/integrations/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationSyncStatus(req.user!.tenantId));
}));

router.get("/mail/integrations/syncs", asyncHandler(async (req, res) => {
  const { connectionId } = req.query;
  sendSuccess(res, adsMarketingModule.mailIntegrationSyncHistory(req.user!.tenantId, typeof connectionId === "string" ? connectionId : undefined));
}));

router.get("/mail/integrations/log", asyncHandler(async (req, res) => {
  const { connectorId } = req.query;
  sendSuccess(res, adsMarketingModule.mailIntegrationLog(req.user!.tenantId, typeof connectorId === "string" ? connectorId : undefined));
}));

router.get("/mail/integrations/alerts", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationAlerts(req.user!.tenantId));
}));

router.get("/mail/integrations/overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationOverview(req.user!.tenantId));
}));

router.get("/mail/integrations/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationDashboard(req.user!.tenantId));
}));

router.get("/mail/integrations/bridges", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationBridges(req.user!.tenantId));
}));

router.post("/mail/integrations/bridges", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationCreateBridge(req.user!.tenantId, req.body));
}));

router.delete("/mail/integrations/bridges/:bridgeId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationDeleteBridge(req.user!.tenantId, req.params.bridgeId));
}));

router.post("/mail/integrations/bridges/:bridgeId/trigger", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationTriggerBridge(req.user!.tenantId, req.params.bridgeId));
}));

router.get("/mail/integrations", asyncHandler(async (req, res) => {
  const { connectorId } = req.query;
  sendSuccess(res, adsMarketingModule.mailIntegrationConnections(req.user!.tenantId, typeof connectorId === "string" ? connectorId : undefined));
}));

router.post("/mail/integrations/connect", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationConnect(req.user!.tenantId, req.body));
}));

router.post("/mail/integrations/:connectionId/disconnect", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationDisconnect(req.user!.tenantId, req.params.connectionId));
}));

router.post("/mail/integrations/:connectionId/authorize", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationAuthorize(req.user!.tenantId, req.params.connectionId));
}));

router.post("/mail/integrations/:connectionId/refresh", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationRefresh(req.user!.tenantId, req.params.connectionId));
}));

router.put("/mail/integrations/:connectionId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationUpdate(req.user!.tenantId, req.params.connectionId, req.body));
}));

router.post("/mail/integrations/:connectionId/sync", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationSyncNow(req.user!.tenantId, req.params.connectionId));
}));

router.post("/mail/integrations/:connectionId/actions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationAction(req.user!.tenantId, req.params.connectionId, req.body.action || "", req.body.params));
}));

router.get("/mail/billing/plans", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingPlans());
}));

router.get("/mail/billing/summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingSummary(req.user!.tenantId));
}));

router.get("/mail/billing/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingDashboard(req.user!.tenantId));
}));

router.get("/mail/billing/forecast", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingForecast(req.user!.tenantId));
}));

router.post("/mail/billing/upgrade", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingUpgrade(req.user!.tenantId, req.body.plan || ""));
}));

router.post("/mail/billing/downgrade", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingDowngrade(req.user!.tenantId, req.body.plan || ""));
}));

router.post("/mail/billing/auto-renew", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingSetAutoRenew(req.user!.tenantId, !!req.body.enabled));
}));

router.post("/mail/billing/cancel", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingCancelSubscription(req.user!.tenantId));
}));

router.get("/mail/billing/addons", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingAddons(req.user!.tenantId));
}));

router.get("/mail/billing/addons/active", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingListAddons(req.user!.tenantId));
}));

router.post("/mail/billing/addons/:addonId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingAddAddon(req.user!.tenantId, req.params.addonId));
}));

router.delete("/mail/billing/addons/:addonId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingRemoveAddon(req.user!.tenantId, req.params.addonId));
}));

router.get("/mail/billing/overage", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingOverageStatus(req.user!.tenantId));
}));

router.put("/mail/billing/overage", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingOveragePolicy(req.user!.tenantId, req.body));
}));

router.post("/mail/billing/overage/invoice", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingOverageInvoice(req.user!.tenantId));
}));

router.get("/mail/billing/contracts", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingContracts(req.user!.tenantId));
}));

router.post("/mail/billing/contracts", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingCreateContract(req.user!.tenantId, req.body));
}));

router.get("/mail/billing/contracts/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingContractStatus(req.user!.tenantId));
}));

router.post("/mail/billing/contracts/cancel", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingCancelContract(req.user!.tenantId));
}));

router.get("/mail/billing/alerts", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingUsageAlerts(req.user!.tenantId));
}));

router.put("/mail/billing/alerts", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingSetAlertThresholds(req.user!.tenantId, req.body));
}));

router.get("/mail/billing/credits", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingCredits(req.user!.tenantId));
}));

router.get("/mail/billing/invoices", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingInvoices(req.user!.tenantId));
}));

router.post("/mail/billing/invoices", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingCreateInvoice(req.user!.tenantId, req.body));
}));

router.get("/mail/billing/invoices/:invoiceId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingInvoice(req.user!.tenantId, req.params.invoiceId));
}));

router.post("/mail/billing/invoices/:invoiceId/pay", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingPayInvoice(req.user!.tenantId, req.params.invoiceId));
}));

router.get("/mail/billing/payment-methods", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingPaymentMethods(req.user!.tenantId));
}));

router.post("/mail/billing/payment-methods", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingAddPaymentMethod(req.user!.tenantId, req.body));
}));

router.delete("/mail/billing/payment-methods/:methodId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingRemovePaymentMethod(req.user!.tenantId, req.params.methodId));
}));

router.get("/mail/billing/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingLog(req.user!.tenantId));
}));

router.get("/mail/notifications", asyncHandler(async (req, res) => {
  const { unreadOnly, type, limit } = req.query;
  sendSuccess(res, adsMarketingModule.mailNotifications(req.user!.tenantId, {
    unreadOnly: unreadOnly === "true",
    type: typeof type === "string" ? type : undefined,
    limit: typeof limit === "string" ? Number(limit) : undefined,
  }));
}));

router.post("/mail/notifications", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateNotification(req.user!.tenantId, req.body));
}));

router.post("/mail/notifications/collect", asyncHandler(async (req, res) => {
  const { now } = req.query;
  sendSuccess(res, adsMarketingModule.mailCollectAlerts(req.user!.tenantId, {
    now: typeof now === "string" ? now : undefined,
  }));
}));

router.post("/mail/notifications/read-all", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarkAllNotificationsRead(req.user!.tenantId));
}));

router.delete("/mail/notifications/clear", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailClearNotifications(req.user!.tenantId));
}));

router.get("/mail/notifications/settings", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailNotificationSettings(req.user!.tenantId));
}));

router.put("/mail/notifications/settings", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUpdateNotificationSettings(req.user!.tenantId, req.body));
}));

router.get("/mail/notifications/center", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailNotificationCenter(req.user!.tenantId));
}));

router.post("/mail/notifications/:notificationId/read", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarkNotificationRead(req.user!.tenantId, req.params.notificationId));
}));

router.delete("/mail/notifications/:notificationId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteNotification(req.user!.tenantId, req.params.notificationId));
}));

// ---- Round 32: quantum security ----
router.get("/mail/quantum/algorithms", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumAlgorithms());
}));

router.get("/mail/quantum/overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumOverview(req.user!.tenantId));
}));

router.get("/mail/quantum/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumDashboard(req.user!.tenantId));
}));

router.get("/mail/quantum/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumLog(req.user!.tenantId));
}));

router.get("/mail/quantum/chain", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumChain(req.user!.tenantId));
}));

router.get("/mail/quantum/keys", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumKeys(req.user!.tenantId));
}));

router.post("/mail/quantum/keys", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumCreateKey(req.user!.tenantId, req.body));
}));

router.get("/mail/quantum/keys/:keyId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumKey(req.user!.tenantId, req.params.keyId));
}));

router.post("/mail/quantum/keys/:keyId/rotate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumRotateKey(req.user!.tenantId, req.params.keyId));
}));

router.post("/mail/quantum/keys/:keyId/revoke", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumRevokeKey(req.user!.tenantId, req.params.keyId));
}));

router.get("/mail/quantum/qkd-channels", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumQkdChannels(req.user!.tenantId));
}));

router.post("/mail/quantum/qkd-channels", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumCreateQkd(req.user!.tenantId, req.body));
}));

router.post("/mail/quantum/qkd-channels/:channelId/simulate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumSimulateQkd(req.user!.tenantId, req.params.channelId));
}));

router.get("/mail/quantum/qkd-exchanges", asyncHandler(async (req, res) => {
  const { channelId } = req.query;
  sendSuccess(res, adsMarketingModule.mailQuantumQkdExchanges(req.user!.tenantId, typeof channelId === "string" ? channelId : undefined));
}));

router.post("/mail/quantum/encrypt", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumEncrypt(req.user!.tenantId, req.body));
}));

router.post("/mail/quantum/messages/:messageId/decrypt", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumDecrypt(req.user!.tenantId, req.params.messageId));
}));

router.get("/mail/quantum/certificates", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumCertificates(req.user!.tenantId));
}));

router.post("/mail/quantum/certificates", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumIssueCert(req.user!.tenantId, req.body));
}));

router.get("/mail/quantum/certificates/:certId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumCert(req.user!.tenantId, req.params.certId));
}));

router.post("/mail/quantum/certificates/:certId/revoke", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumRevokeCert(req.user!.tenantId, req.params.certId));
}));

router.post("/mail/quantum/certificates/:certId/renew", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumRenewCert(req.user!.tenantId, req.params.certId));
}));

// ---- Round 32: collaboration v2 ----
router.get("/mail/collab2/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2Dashboard(req.user!.tenantId));
}));

router.get("/mail/collab2/approvals", asyncHandler(async (req, res) => {
  const { status } = req.query;
  sendSuccess(res, adsMarketingModule.mailCollab2Approvals(req.user!.tenantId, typeof status === "string" ? status : undefined));
}));

router.post("/mail/collab2/approvals", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2CreateApproval(req.user!.tenantId, req.body));
}));

router.get("/mail/collab2/approvals/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2ApprovalDashboard(req.user!.tenantId));
}));

router.post("/mail/collab2/approvals/:approvalId/approve", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2Approve(req.user!.tenantId, req.params.approvalId, req.body));
}));

router.post("/mail/collab2/approvals/:approvalId/reject", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2Reject(req.user!.tenantId, req.params.approvalId, req.body));
}));

router.post("/mail/collab2/approvals/:approvalId/withdraw", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2Withdraw(req.user!.tenantId, req.params.approvalId));
}));

router.get("/mail/collab2/delegations", asyncHandler(async (req, res) => {
  const { mailboxId, grantee } = req.query;
  sendSuccess(res, adsMarketingModule.mailCollab2Delegations(req.user!.tenantId, {
    mailboxId: typeof mailboxId === "string" ? mailboxId : undefined,
    grantee: typeof grantee === "string" ? grantee : undefined,
  }));
}));

router.post("/mail/collab2/delegations", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2Delegate(req.user!.tenantId, req.body));
}));

router.post("/mail/collab2/delegations/:delegationId/accept", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2AcceptDelegation(req.user!.tenantId, req.params.delegationId));
}));

router.post("/mail/collab2/delegations/:delegationId/revoke", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2RevokeDelegation(req.user!.tenantId, req.params.delegationId));
}));

router.get("/mail/collab2/delegation-summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2DelegationSummary(req.user!.tenantId));
}));

router.get("/mail/collab2/roles", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2Roles(req.user!.tenantId));
}));

router.post("/mail/collab2/roles", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2AssignRole(req.user!.tenantId, req.body));
}));

router.get("/mail/collab2/roles/matrix", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2RoleMatrix());
}));

router.delete("/mail/collab2/roles/:roleId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2RemoveRole(req.user!.tenantId, req.params.roleId));
}));

router.get("/mail/collab2/team-dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2TeamDashboard(req.user!.tenantId));
}));

router.post("/mail/collab2/mentions/detect", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2MentionDetect(req.user!.tenantId, req.body && req.body.text));
}));

router.get("/mail/collab2/mentions", asyncHandler(async (req, res) => {
  const { unreadOnly, contextType, limit } = req.query;
  sendSuccess(res, adsMarketingModule.mailCollab2Mentions(req.user!.tenantId, {
    unreadOnly: unreadOnly === "true",
    contextType: typeof contextType === "string" ? contextType : undefined,
    limit: typeof limit === "string" ? Number(limit) : undefined,
  }));
}));

router.post("/mail/collab2/mentions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2CreateMention(req.user!.tenantId, req.body));
}));

router.post("/mail/collab2/mentions/:mentionId/read", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2MarkMentionRead(req.user!.tenantId, req.params.mentionId));
}));

router.get("/mail/collab2/mentions-summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCollab2MentionsSummary(req.user!.tenantId));
}));

router.post("/mail/integrations/:connectionId/oauth/start", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationOauthStart(req.user!.tenantId, req.params.connectionId));
}));

router.post("/mail/integrations/:connectionId/oauth/callback", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationOauthCallback(req.user!.tenantId, req.params.connectionId, req.body));
}));

router.post("/mail/integrations/:connectionId/oauth/refresh", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationOauthRefresh(req.user!.tenantId, req.params.connectionId));
}));

router.post("/mail/integrations/:connectionId/oauth/revoke", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationOauthRevoke(req.user!.tenantId, req.params.connectionId));
}));

router.get("/mail/integrations/:connectionId/oauth/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailIntegrationOauthStatus(req.user!.tenantId, req.params.connectionId));
}));

router.get("/mail/migrations", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMigrations(req.user!.tenantId));
}));

router.post("/mail/migrations", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailStartMigration(req.user!.tenantId, req.body));
}));

router.get("/mail/migrations/summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMigrationSummary(req.user!.tenantId));
}));

router.get("/mail/migrations/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMigrationLog(req.user!.tenantId, typeof req.query.limit === "string" ? Number(req.query.limit) : undefined));
}));

router.get("/mail/migrations/:migrationId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMigrationStatus(req.user!.tenantId, req.params.migrationId));
}));

router.post("/mail/migrations/:migrationId/scan", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMigrationScan(req.user!.tenantId, req.params.migrationId));
}));

router.post("/mail/migrations/:migrationId/preview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMigrationPreview(req.user!.tenantId, req.params.migrationId));
}));

router.post("/mail/migrations/:migrationId/import", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMigrationImport(req.user!.tenantId, req.params.migrationId));
}));

router.delete("/mail/migrations/:migrationId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteMigration(req.user!.tenantId, req.params.migrationId));
}));

router.get("/mail/threads/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailThreadDashboard(req.user!.tenantId));
}));

router.get("/mail/threads/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailThreadLog(req.user!.tenantId, typeof req.query.limit === "string" ? Number(req.query.limit) : undefined));
}));

router.get("/mail/threads", asyncHandler(async (req, res) => {
  const q = req.query;
  sendSuccess(res, adsMarketingModule.mailThreadList(req.user!.tenantId, {
    mailboxId: typeof q.mailboxId === "string" ? q.mailboxId : undefined,
    folder: typeof q.folder === "string" ? q.folder : undefined,
    state: typeof q.state === "string" ? q.state : undefined,
    tag: typeof q.tag === "string" ? q.tag : undefined,
    priority: typeof q.priority === "string" ? q.priority : undefined,
    unreadOnly: q.unreadOnly === "true",
    starredOnly: q.starredOnly === "true",
    pinnedOnly: q.pinnedOnly === "true",
    search: typeof q.search === "string" ? q.search : undefined,
  }));
}));

router.post("/mail/threads/merge", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailThreadMerge(req.user!.tenantId, req.body.targetThreadId, req.body.sourceThreadId));
}));

router.get("/mail/threads/:threadId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailThreadWorkspace(req.user!.tenantId, req.params.threadId));
}));

router.post("/mail/threads/:threadId/state", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailThreadSetState(req.user!.tenantId, req.params.threadId, req.body.state));
}));

router.post("/mail/threads/:threadId/pin", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailThreadPin(req.user!.tenantId, req.params.threadId));
}));

router.post("/mail/threads/:threadId/unpin", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailThreadUnpin(req.user!.tenantId, req.params.threadId));
}));

router.post("/mail/threads/:threadId/tags", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailThreadTag(req.user!.tenantId, req.params.threadId, req.body.tag));
}));

router.delete("/mail/threads/:threadId/tags/:tag", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailThreadUntag(req.user!.tenantId, req.params.threadId, req.params.tag));
}));

router.post("/mail/threads/:threadId/priority", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailThreadPriority(req.user!.tenantId, req.params.threadId, req.body.priority));
}));

router.get("/mail/billing/coupons", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingCoupons());
}));

router.get("/mail/billing/coupons/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingCouponStatus(req.user!.tenantId));
}));

router.post("/mail/billing/coupons", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingApplyCoupon(req.user!.tenantId, req.body.code));
}));

router.delete("/mail/billing/coupons", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingRemoveCoupon(req.user!.tenantId));
}));

router.get("/mail/billing/tax-rate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingTaxRate(req.user!.tenantId));
}));

router.put("/mail/billing/tax-rate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBillingSetTaxRate(req.user!.tenantId, req.body.pct));
}));

router.get("/mail/automations/triggers", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAutomationTriggers());
}));

router.get("/mail/automations/actions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAutomationActions());
}));

router.get("/mail/automations/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAutomationDashboard(req.user!.tenantId));
}));

router.get("/mail/automations/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAutomationLog(req.user!.tenantId));
}));

router.post("/mail/automations/due", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAutomationDueRuns(req.user!.tenantId));
}));

router.get("/mail/automations", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAutomations(req.user!.tenantId));
}));

router.post("/mail/automations", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateAutomation(req.user!.tenantId, req.body));
}));

router.post("/mail/automations/:automationId/run", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRunAutomation(req.user!.tenantId, req.params.automationId, req.body.messageId));
}));

router.post("/mail/automations/:automationId/test", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTestAutomation(req.user!.tenantId, req.params.automationId, req.body));
}));

router.get("/mail/automations/:automationId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAutomation(req.user!.tenantId, req.params.automationId));
}));

router.put("/mail/automations/:automationId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUpdateAutomation(req.user!.tenantId, req.params.automationId, req.body));
}));

router.post("/mail/automations/:automationId/toggle", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailToggleAutomation(req.user!.tenantId, req.params.automationId));
}));

router.delete("/mail/automations/:automationId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteAutomation(req.user!.tenantId, req.params.automationId));
}));

router.get("/mail/deliverability/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeliverabilityDashboard(req.user!.tenantId));
}));

router.get("/mail/deliverability/bounce-stats", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBounceStats(req.user!.tenantId));
}));

router.get("/mail/deliverability/bounces", asyncHandler(async (req, res) => {
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  sendSuccess(res, adsMarketingModule.mailBounces(req.user!.tenantId, type));
}));

router.post("/mail/deliverability/bounces", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRecordBounce(req.user!.tenantId, req.body));
}));

router.post("/mail/deliverability/complaints", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRecordComplaint(req.user!.tenantId, req.body));
}));

router.get("/mail/deliverability/suppression", asyncHandler(async (req, res) => {
  const reason = typeof req.query.reason === "string" ? req.query.reason : undefined;
  sendSuccess(res, adsMarketingModule.mailSuppressionList(req.user!.tenantId, reason));
}));

router.post("/mail/deliverability/suppression", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSuppressEmail(req.user!.tenantId, req.body));
}));

router.delete("/mail/deliverability/suppression/:email", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUnsuppressEmail(req.user!.tenantId, decodeURIComponent(req.params.email)));
}));

router.get("/mail/deliverability/suppression/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSuppressionStatus(req.user!.tenantId, String(req.query.email || "")));
}));

router.get("/mail/deliverability/reputation", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSendingReputation(req.user!.tenantId));
}));

router.get("/mail/deliverability/hygiene", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailListHygiene(req.user!.tenantId));
}));

router.get("/mail/sequences/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSequencesDashboard(req.user!.tenantId));
}));

router.post("/mail/sequences/advance", asyncHandler(async (req, res) => {
  const sequenceId = typeof req.body.sequenceId === "string" ? req.body.sequenceId : undefined;
  sendSuccess(res, adsMarketingModule.mailAdvanceSequence(req.user!.tenantId, sequenceId));
}));

router.get("/mail/sequences", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSequences(req.user!.tenantId));
}));

router.post("/mail/sequences", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateSequence(req.user!.tenantId, req.body));
}));

router.post("/mail/sequences/:sequenceId/enroll", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailEnrollContact(req.user!.tenantId, req.params.sequenceId, req.body.email));
}));

router.post("/mail/sequences/:sequenceId/enroll-many", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailEnrollMany(req.user!.tenantId, req.params.sequenceId, req.body.emails));
}));

router.get("/mail/sequences/:sequenceId/progress", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSequenceProgress(req.user!.tenantId, req.params.sequenceId));
}));

router.get("/mail/sequences/:sequenceId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSequence(req.user!.tenantId, req.params.sequenceId));
}));

router.put("/mail/sequences/:sequenceId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUpdateSequence(req.user!.tenantId, req.params.sequenceId, req.body));
}));

router.post("/mail/sequences/:sequenceId/toggle", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailToggleSequence(req.user!.tenantId, req.params.sequenceId));
}));

router.delete("/mail/sequences/:sequenceId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteSequence(req.user!.tenantId, req.params.sequenceId));
}));

router.post("/mail/enrollments/:enrollmentId/pause", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPauseEnrollment(req.user!.tenantId, req.params.enrollmentId));
}));

router.post("/mail/enrollments/:enrollmentId/resume", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailResumeEnrollment(req.user!.tenantId, req.params.enrollmentId));
}));

router.post("/mail/enrollments/:enrollmentId/unenroll", asyncHandler(async (req, res) => {
  const reason = typeof req.body.reason === "string" ? req.body.reason : undefined;
  sendSuccess(res, adsMarketingModule.mailUnenrollContact(req.user!.tenantId, req.params.enrollmentId, reason));
}));

router.get("/mail/unsubscribe/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUnsubscribeDashboard(req.user!.tenantId));
}));

router.get("/mail/unsubscribe/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUnsubscribeLog(req.user!.tenantId));
}));

router.get("/mail/unsubscribe/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUnsubscribeStatus(req.user!.tenantId, String(req.query.email || "")));
}));

router.post("/mail/unsubscribe/link", asyncHandler(async (req, res) => {
  const category = typeof req.body.category === "string" ? req.body.category : undefined;
  sendSuccess(res, adsMarketingModule.mailUnsubscribeLink(req.user!.tenantId, req.body.email, category));
}));

router.post("/mail/unsubscribe", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUnsubscribe(req.user!.tenantId, req.body));
}));

router.get("/mail/preferences/:email", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPreferences(req.user!.tenantId, decodeURIComponent(req.params.email)));
}));

router.put("/mail/preferences/:email", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUpdatePreferences(req.user!.tenantId, decodeURIComponent(req.params.email), req.body));
}));

router.get("/mail/tickets/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTicketDashboard(req.user!.tenantId));
}));

router.get("/mail/tickets/sla", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTicketSla(req.user!.tenantId));
}));

router.get("/mail/tickets/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTicketLog(req.user!.tenantId));
}));

router.get("/mail/tickets", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTickets(req.user!.tenantId, {
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    priority: typeof req.query.priority === "string" ? req.query.priority : undefined,
    assignee: typeof req.query.assignee === "string" ? req.query.assignee : undefined,
    tag: typeof req.query.tag === "string" ? req.query.tag : undefined,
    search: typeof req.query.search === "string" ? req.query.search : undefined,
  }));
}));

router.post("/mail/tickets", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateTicket(req.user!.tenantId, req.body));
}));

router.get("/mail/tickets/:ticketId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTicket(req.user!.tenantId, req.params.ticketId));
}));

router.put("/mail/tickets/:ticketId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUpdateTicket(req.user!.tenantId, req.params.ticketId, req.body));
}));

router.post("/mail/tickets/:ticketId/assign", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAssignTicket(req.user!.tenantId, req.params.ticketId, req.body.assignee));
}));

router.post("/mail/tickets/:ticketId/priority", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTicketPriority(req.user!.tenantId, req.params.ticketId, req.body.priority));
}));

router.post("/mail/tickets/:ticketId/tags", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTicketTag(req.user!.tenantId, req.params.ticketId, req.body.tag));
}));

router.delete("/mail/tickets/:ticketId/tags/:tag", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTicketUntag(req.user!.tenantId, req.params.ticketId, decodeURIComponent(req.params.tag)));
}));

router.post("/mail/tickets/:ticketId/notes", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTicketNote(req.user!.tenantId, req.params.ticketId, req.body.note, req.body.author));
}));

router.post("/mail/tickets/:ticketId/resolve", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailResolveTicket(req.user!.tenantId, req.params.ticketId));
}));

router.post("/mail/tickets/:ticketId/reopen", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailReopenTicket(req.user!.tenantId, req.params.ticketId));
}));

router.post("/mail/tickets/:ticketId/escalate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailEscalateTicket(req.user!.tenantId, req.params.ticketId));
}));

router.get("/mail/tickets/:ticketId/events", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailTicketEvents(req.user!.tenantId, req.params.ticketId));
}));

router.get("/mail/backups/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBackupsDashboard(req.user!.tenantId));
}));

router.get("/mail/backups/schedule", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBackupSchedule(req.user!.tenantId));
}));

router.put("/mail/backups/schedule", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailSetBackupSchedule(req.user!.tenantId, req.body));
}));

router.get("/mail/backups", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBackups(req.user!.tenantId));
}));

router.post("/mail/backups", asyncHandler(async (req, res) => {
  const label = typeof req.body.label === "string" ? req.body.label : undefined;
  sendSuccess(res, adsMarketingModule.mailCreateBackup(req.user!.tenantId, label));
}));

router.get("/mail/backups/:backupId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBackup(req.user!.tenantId, req.params.backupId));
}));

router.delete("/mail/backups/:backupId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteBackup(req.user!.tenantId, req.params.backupId));
}));

router.post("/mail/backups/:backupId/restore", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRestoreBackup(req.user!.tenantId, req.params.backupId));
}));

router.get("/mail/api-keys/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailApiKeyDashboard(req.user!.tenantId));
}));

router.get("/mail/api-keys/verify", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailVerifyApiKey(req.user!.tenantId, String(req.query.key || "")));
}));

router.get("/mail/api-keys", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailApiKeys(req.user!.tenantId));
}));

router.post("/mail/api-keys", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateApiKey(req.user!.tenantId, req.body));
}));

router.get("/mail/api-keys/:apiKeyId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailApiKey(req.user!.tenantId, req.params.apiKeyId));
}));

router.get("/mail/api-keys/:apiKeyId/usage", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailApiKeyUsage(req.user!.tenantId, req.params.apiKeyId));
}));

router.post("/mail/api-keys/:apiKeyId/revoke", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRevokeApiKey(req.user!.tenantId, req.params.apiKeyId));
}));

router.delete("/mail/api-keys/:apiKeyId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRevokeApiKey(req.user!.tenantId, req.params.apiKeyId));
}));

router.get("/mail/biometrics/signals", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBiometricSignals());
}));

router.get("/mail/biometrics/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBiometricDashboard(req.user!.tenantId));
}));

router.get("/mail/biometrics/baseline", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBiometricBaseline(req.user!.tenantId));
}));

router.get("/mail/biometrics/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBiometricLog(req.user!.tenantId));
}));

router.post("/mail/biometrics/record", asyncHandler(async (req, res) => {
  const value = typeof req.body.value === "number" ? req.body.value : undefined;
  sendSuccess(res, adsMarketingModule.mailBiometricRecord(req.user!.tenantId, String(req.body.sessionId || ""), String(req.body.signalId || ""), value));
}));

router.get("/mail/biometrics/sessions/:sessionId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBiometricSession(req.user!.tenantId, req.params.sessionId));
}));

router.post("/mail/biometrics/sessions/:sessionId/evaluate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailBiometricEvaluate(req.user!.tenantId, req.params.sessionId));
}));

router.get("/mail/zero-trust/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailZeroTrustDashboard(req.user!.tenantId));
}));

router.get("/mail/zero-trust/overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailZeroTrustOverview(req.user!.tenantId));
}));

router.get("/mail/zero-trust/layers", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailZeroTrustLayers(req.user!.tenantId));
}));

router.get("/mail/zero-trust/devices", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailZeroTrustDevices(req.user!.tenantId));
}));

router.post("/mail/zero-trust/devices", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailZeroTrustEnroll(req.user!.tenantId, req.body));
}));

router.get("/mail/zero-trust/devices/:deviceId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailZeroTrustPosture(req.user!.tenantId, req.params.deviceId));
}));

router.post("/mail/zero-trust/access", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailZeroTrustAccess(req.user!.tenantId, req.body));
}));

router.get("/mail/zero-trust/honeytokens", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailZeroTrustHoneytokens(req.user!.tenantId));
}));

router.post("/mail/zero-trust/honeytokens/:tokenId/hit", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailZeroTrustHoneytokenHit(req.user!.tenantId, req.params.tokenId));
}));

router.get("/mail/zero-trust/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailZeroTrustLog(req.user!.tenantId));
}));

router.get("/mail/ai-governance/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAiGovernanceDashboard(req.user!.tenantId));
}));

router.get("/mail/ai-governance/models", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAiGovernanceModels(req.user!.tenantId));
}));

router.post("/mail/ai-governance/models", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAiGovernanceRegister(req.user!.tenantId, req.body));
}));

router.post("/mail/ai-governance/models/:modelId/review", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAiGovernanceReview(req.user!.tenantId, req.params.modelId, String(req.body.decision || "")));
}));

router.post("/mail/ai-governance/scan-input", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAiGovernanceScanInput(req.user!.tenantId, String(req.body.text || "")));
}));

router.post("/mail/ai-governance/scan-output", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAiGovernanceScanOutput(req.user!.tenantId, String(req.body.text || "")));
}));

router.get("/mail/ai-governance/rate-limit", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAiGovernanceRateLimit(req.user!.tenantId, String(req.query.userId || "")));
}));

router.get("/mail/ai-governance/shadow-ai", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAiGovernanceShadow(req.user!.tenantId));
}));

router.post("/mail/ai-governance/red-team", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAiGovernanceRedTeam(req.user!.tenantId));
}));

router.get("/mail/ai-governance/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAiGovernanceLog(req.user!.tenantId));
}));

router.get("/mail/performance/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPerformanceDashboard(req.user!.tenantId));
}));

router.get("/mail/performance/caching", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPerformanceCaching(req.user!.tenantId));
}));

router.post("/mail/performance/cache/flush", asyncHandler(async (req, res) => {
  const layerId = typeof req.body.layerId === "string" ? req.body.layerId : undefined;
  sendSuccess(res, adsMarketingModule.mailPerformanceFlushCache(req.user!.tenantId, layerId));
}));

router.get("/mail/performance/query-optimization", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPerformanceQueryOptimization(req.user!.tenantId));
}));

router.post("/mail/performance/explain", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPerformanceExplainQuery(req.user!.tenantId, String(req.body.query || "")));
}));

router.get("/mail/performance/scalability", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPerformanceScalability(req.user!.tenantId));
}));

router.get("/mail/performance/edge", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPerformanceEdge(req.user!.tenantId));
}));

router.get("/mail/performance/sustainability", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPerformanceSustainability(req.user!.tenantId));
}));

router.get("/mail/performance/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPerformanceLog(req.user!.tenantId));
}));

router.get("/mail/chaos/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailChaosDashboard(req.user!.tenantId));
}));

router.get("/mail/chaos/catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailChaosCatalog(req.user!.tenantId));
}));

router.get("/mail/chaos/experiments", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailChaosExperiments(req.user!.tenantId));
}));

router.post("/mail/chaos/experiments", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailChaosRun(req.user!.tenantId, String(req.body.experimentId || "")));
}));

router.get("/mail/chaos/resilience", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailChaosResilience(req.user!.tenantId));
}));

router.get("/mail/chaos/game-days", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailChaosGameDays(req.user!.tenantId));
}));

router.post("/mail/chaos/experiments/:runId/abort", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailChaosAbort(req.user!.tenantId, req.params.runId));
}));

router.get("/mail/chaos/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailChaosLog(req.user!.tenantId));
}));

router.get("/mail/focus/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFocusDashboard(req.user!.tenantId));
}));

router.get("/mail/focus/modes", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFocusModes());
}));

router.get("/mail/focus/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFocusStatus(req.user!.tenantId));
}));

router.post("/mail/focus/activate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFocusActivate(req.user!.tenantId, String(req.body.mode || ""), req.body.durationMin !== undefined ? Number(req.body.durationMin) : undefined));
}));

router.post("/mail/focus/sessions/:sessionId/end", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFocusEnd(req.user!.tenantId, req.params.sessionId));
}));

router.post("/mail/focus/sessions/:sessionId/extend", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFocusExtend(req.user!.tenantId, req.params.sessionId, Number(req.body.minutes || 0)));
}));

router.get("/mail/focus/tiers", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFocusTiers(req.user!.tenantId));
}));

router.get("/mail/focus/batch", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFocusBatch(req.user!.tenantId));
}));

router.post("/mail/focus/batch-intelligence", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFocusBatchIntelligence(req.user!.tenantId, req.body.messageIds || []));
}));

router.post("/mail/focus/batch-intelligence/execute", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFocusExecuteBatches(req.user!.tenantId, req.body.actions || []));
}));

router.get("/mail/focus/friction", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFocusFriction(req.user!.tenantId));
}));

router.post("/mail/focus/friction", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFocusFriction(req.user!.tenantId, req.body.input || undefined));
}));

router.get("/mail/focus/roi", asyncHandler(async (req, res) => {
  const users = typeof req.query.users === "string" ? Number(req.query.users) : 1;
  const hourlyRate = typeof req.query.hourlyRate === "string" ? Number(req.query.hourlyRate) : 75;
  sendSuccess(res, adsMarketingModule.mailFocusRoi(req.user!.tenantId, users, hourlyRate));
}));

router.get("/mail/focus/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailFocusLog(req.user!.tenantId));
}));

router.get("/mail/composer/catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailComposerCatalog());
}));

router.get("/mail/composer/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailComposerDashboard(req.user!.tenantId));
}));

router.get("/mail/composer/drafts", asyncHandler(async (req, res) => {
  const status = typeof req.query.status === "string" && req.query.status.length > 0 ? req.query.status : undefined;
  sendSuccess(res, adsMarketingModule.mailComposerDrafts(req.user!.tenantId, status));
}));

router.get("/mail/composer/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailComposerLog(req.user!.tenantId));
}));

router.post("/mail/composer/draft", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailComposerDraft(req.user!.tenantId, String(req.body.messageId || ""), req.body.opts || req.body || undefined));
}));

router.post("/mail/composer/drafts/:draftId/regenerate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailComposerRegenerate(req.user!.tenantId, req.params.draftId));
}));

router.post("/mail/composer/drafts/:draftId/dislike", asyncHandler(async (req, res) => {
  const feedback = typeof req.body.feedback === "string" ? req.body.feedback : undefined;
  sendSuccess(res, adsMarketingModule.mailComposerDislike(req.user!.tenantId, req.params.draftId, feedback));
}));

router.post("/mail/composer/drafts/:draftId/edits", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailComposerSaveEdits(req.user!.tenantId, req.params.draftId, req.body.patch || req.body || undefined));
}));

router.post("/mail/composer/drafts/:draftId/send", asyncHandler(async (req, res) => {
  const mailboxId = typeof req.body.mailboxId === "string" ? req.body.mailboxId : undefined;
  sendSuccess(res, adsMarketingModule.mailComposerSend(req.user!.tenantId, req.params.draftId, mailboxId));
}));

router.get("/mail/composer/drafts/:draftId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailComposerDraftById(req.user!.tenantId, req.params.draftId));
}));

router.delete("/mail/composer/drafts/:draftId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailComposerDelete(req.user!.tenantId, req.params.draftId));
}));

router.get("/mail/residency/regions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailResidencyRegions());
}));

router.get("/mail/residency/policies", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailResidencyPolicies(req.user!.tenantId));
}));

router.post("/mail/residency/policies", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailResidencySetPolicy(req.user!.tenantId, req.body.dataClass, req.body.regionId, typeof req.body.strict === "boolean" ? req.body.strict : false));
}));

router.get("/mail/residency/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailResidencyStatus(req.user!.tenantId));
}));

router.get("/mail/residency/flow", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailResidencyFlow(req.user!.tenantId));
}));

router.get("/mail/residency/locks", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailResidencyLocks(req.user!.tenantId));
}));

router.post("/mail/residency/locks", asyncHandler(async (req, res) => {
  const note = typeof req.body.note === "string" ? req.body.note : undefined;
  sendSuccess(res, adsMarketingModule.mailResidencyLock(req.user!.tenantId, req.body.regionId, note));
}));

router.post("/mail/residency/locks/:lockId/release", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailResidencyReleaseLock(req.user!.tenantId, req.params.lockId));
}));

router.post("/mail/residency/breach", asyncHandler(async (req, res) => {
  const detail = typeof req.body.detail === "string" ? req.body.detail : undefined;
  sendSuccess(res, adsMarketingModule.mailResidencyBreach(req.user!.tenantId, req.body.regionId, detail));
}));

router.get("/mail/residency/certificate", asyncHandler(async (req, res) => {
  const regionId = typeof req.query.regionId === "string" ? req.query.regionId : undefined;
  sendSuccess(res, adsMarketingModule.mailResidencyCertificate(req.user!.tenantId, regionId));
}));

router.get("/mail/residency/report", asyncHandler(async (req, res) => {
  const regionId = typeof req.query.regionId === "string" ? req.query.regionId : undefined;
  sendSuccess(res, adsMarketingModule.mailResidencyReport(req.user!.tenantId, regionId));
}));

router.get("/mail/residency/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailResidencyLog(req.user!.tenantId));
}));

router.get("/mail/residency/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailResidencyDashboard(req.user!.tenantId));
}));

router.get("/mail/white-label/presets", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWhiteLabelPresets());
}));

router.get("/mail/white-label/branding", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWhiteLabelBranding(req.user!.tenantId));
}));

router.put("/mail/white-label/branding", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWhiteLabelUpdate(req.user!.tenantId, req.body || {}));
}));

router.get("/mail/white-label/models", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWhiteLabelModels());
}));

router.get("/mail/white-label/deployment", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWhiteLabelDeployment(req.user!.tenantId));
}));

router.post("/mail/white-label/deployment", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWhiteLabelSelectDeployment(req.user!.tenantId, req.body.modelId));
}));

router.get("/mail/white-label/sla", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWhiteLabelSla(req.user!.tenantId));
}));

router.put("/mail/white-label/sla", asyncHandler(async (req, res) => {
  const penalty = typeof req.body.penalty === "number" ? req.body.penalty : undefined;
  sendSuccess(res, adsMarketingModule.mailWhiteLabelSetSla(req.user!.tenantId, req.body.slaPct, penalty));
}));

router.get("/mail/white-label/candidate-domains", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWhiteLabelCandidateDomains(req.user!.tenantId));
}));

router.post("/mail/white-label/bind-domain", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWhiteLabelBindDomain(req.user!.tenantId, req.body.domainId));
}));

router.get("/mail/white-label/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWhiteLabelStatus(req.user!.tenantId));
}));

router.get("/mail/white-label/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWhiteLabelLog(req.user!.tenantId));
}));

router.get("/mail/white-label/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailWhiteLabelDashboard(req.user!.tenantId));
}));

router.get("/mail/marketplace/categories", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarketplaceCategories());
}));

router.get("/mail/marketplace/catalog", asyncHandler(async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  sendSuccess(res, adsMarketingModule.mailMarketplaceCatalog(req.user!.tenantId, category));
}));

router.post("/mail/marketplace/listings", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarketplaceSubmit(req.user!.tenantId, req.body || {}));
}));

router.get("/mail/marketplace/pending", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarketplacePending(req.user!.tenantId));
}));

router.post("/mail/marketplace/listings/:listingId/approve", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarketplaceApprove(req.user!.tenantId, req.params.listingId));
}));

router.post("/mail/marketplace/listings/:listingId/reject", asyncHandler(async (req, res) => {
  const reason = typeof req.body.reason === "string" ? req.body.reason : undefined;
  sendSuccess(res, adsMarketingModule.mailMarketplaceReject(req.user!.tenantId, req.params.listingId, reason));
}));

router.post("/mail/marketplace/listings/:listingId/install", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarketplaceInstall(req.user!.tenantId, req.params.listingId));
}));

router.post("/mail/marketplace/listings/:listingId/uninstall", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarketplaceUninstall(req.user!.tenantId, req.params.listingId));
}));

router.get("/mail/marketplace/installed", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarketplaceInstalled(req.user!.tenantId));
}));

router.post("/mail/marketplace/listings/:listingId/rate", asyncHandler(async (req, res) => {
  const review = typeof req.body.review === "string" ? req.body.review : undefined;
  sendSuccess(res, adsMarketingModule.mailMarketplaceRate(req.user!.tenantId, req.params.listingId, req.body.rating, review));
}));

router.get("/mail/marketplace/programs", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarketplacePrograms());
}));

router.post("/mail/marketplace/programs", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarketplaceJoinProgram(req.user!.tenantId, req.body.programId));
}));

router.get("/mail/marketplace/revenue", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarketplaceRevenue(req.user!.tenantId));
}));

router.get("/mail/marketplace/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarketplaceDashboard(req.user!.tenantId));
}));

router.get("/mail/marketplace/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailMarketplaceLog(req.user!.tenantId));
}));

router.get("/mail/dev/sdks", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevSdks());
}));

router.get("/mail/dev/metrics", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevMetrics(req.user!.tenantId));
}));

router.get("/mail/dev/sandbox-keys", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevSandboxKeys(req.user!.tenantId));
}));

router.post("/mail/dev/sandbox-keys", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevCreateSandboxKey(req.user!.tenantId, req.body || {}));
}));

router.post("/mail/dev/sandbox-keys/:keyId/promote", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevPromoteSandboxKey(req.user!.tenantId, req.params.keyId));
}));

router.post("/mail/dev/sandbox-keys/:keyId/revoke", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevRevokeSandboxKey(req.user!.tenantId, req.params.keyId));
}));

router.get("/mail/dev/sandbox-keys/:keyId/verify", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevVerifySandboxKey(req.user!.tenantId, req.params.keyId));
}));

router.get("/mail/dev/api-usage", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevApiUsage(req.user!.tenantId));
}));

router.get("/mail/dev/latency", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevLatency(req.user!.tenantId));
}));

router.get("/mail/dev/rate-limit", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevRateLimit(req.user!.tenantId));
}));

router.get("/mail/dev/webhooks", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevWebhooks(req.user!.tenantId));
}));

router.post("/mail/dev/webhooks/test", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevTestWebhook(req.user!.tenantId, String(req.body.url || "")));
}));

router.get("/mail/dev/spec", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevSpec(req.user!.tenantId));
}));

router.get("/mail/dev/explorer", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevExplorer(req.user!.tenantId));
}));

router.get("/mail/dev/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevLog(req.user!.tenantId));
}));

router.get("/mail/dev/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDevDashboard(req.user!.tenantId));
}));

router.post("/mail/quantum/voice/:voiceNoteId/encrypt", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumEncryptVoice(req.user!.tenantId, req.params.voiceNoteId));
}));

router.post("/mail/quantum/voice/:encryptedId/decrypt", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumDecryptVoice(req.user!.tenantId, req.params.encryptedId));
}));

router.get("/mail/quantum/voice/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailQuantumVoiceStatus(req.user!.tenantId));
}));

router.get("/mail/predict/graph", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPredictGraph(req.user!.tenantId));
}));

router.get("/mail/predict/next-contacts", asyncHandler(async (req, res) => {
  const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined;
  sendSuccess(res, adsMarketingModule.mailPredictNextContacts(req.user!.tenantId, limit));
}));

router.get("/mail/predict/best-time", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPredictBestTime(req.user!.tenantId, String(req.query.contact || "")));
}));

router.get("/mail/predict/graph-dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailPredictGraphDashboard(req.user!.tenantId));
}));

// Round 40: aliases & forwarding
router.get("/mail/aliases", asyncHandler(async (req, res) => {
  const opts: Record<string, any> = {};
  for (const key of ["status", "mailboxId"]) {
    if (req.query[key] !== undefined) opts[key] = req.query[key];
  }
  sendSuccess(res, adsMarketingModule.mailAliases(req.user!.tenantId, opts));
}));

router.post("/mail/aliases", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateAlias(req.user!.tenantId, req.body || {}));
}));

router.get("/mail/aliases/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAliasDashboard(req.user!.tenantId));
}));

router.get("/mail/aliases/log", asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
  sendSuccess(res, adsMarketingModule.mailAliasLog(req.user!.tenantId, limit));
}));

router.post("/mail/aliases/resolve", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailResolveAlias(req.user!.tenantId, String((req.body || {}).address || "")));
}));

router.get("/mail/aliases/forwarding", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailListForwarding(req.user!.tenantId));
}));

router.post("/mail/aliases/forwarding/:mailboxId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailEnableForwarding(req.user!.tenantId, req.params.mailboxId, req.body || {}));
}));

router.get("/mail/aliases/forwarding/:mailboxId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailForwarding(req.user!.tenantId, req.params.mailboxId));
}));

router.delete("/mail/aliases/forwarding/:mailboxId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDisableForwarding(req.user!.tenantId, req.params.mailboxId));
}));

router.get("/mail/aliases/:aliasId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailAlias(req.user!.tenantId, req.params.aliasId));
}));

router.post("/mail/aliases/:aliasId/toggle", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailToggleAlias(req.user!.tenantId, req.params.aliasId));
}));

router.delete("/mail/aliases/:aliasId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteAlias(req.user!.tenantId, req.params.aliasId));
}));

router.get("/mail/labels", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailLabels(req.user!.tenantId));
}));

router.post("/mail/labels", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailCreateLabel(req.user!.tenantId, req.body));
}));

router.get("/mail/labels/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailLabelDashboard(req.user!.tenantId));
}));

router.get("/mail/labels/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailLabelLog(req.user!.tenantId, typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined));
}));

router.put("/mail/labels/:labelId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailUpdateLabel(req.user!.tenantId, req.params.labelId, req.body));
}));

router.post("/mail/labels/:labelId/apply", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailLabelApply(req.user!.tenantId, req.params.labelId, typeof req.body.messageId === "string" ? req.body.messageId : ""));
}));

router.post("/mail/labels/:labelId/remove", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailLabelRemove(req.user!.tenantId, req.params.labelId, typeof req.body.messageId === "string" ? req.body.messageId : ""));
}));

router.get("/mail/labels/:labelId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailLabel(req.user!.tenantId, req.params.labelId));
}));

router.delete("/mail/labels/:labelId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailDeleteLabel(req.user!.tenantId, req.params.labelId));
}));

router.get("/mail/realtime/overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRealtimeOverview(req.user!.tenantId));
}));

router.get("/mail/realtime/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRealtimeLog(req.user!.tenantId, typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined));
}));

router.post("/mail/realtime/typing", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRealtimeTyping(req.user!.tenantId, req.body || {}));
}));

router.post("/mail/realtime/presence", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRealtimePresence(req.user!.tenantId, req.body || {}));
}));

router.post("/mail/realtime/cursor", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.mailRealtimeCursor(req.user!.tenantId, req.body || {}));
}));

// ---- N0VA1O gateway (Round 44) ----

router.get("/n0va1o/gateway-catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oGatewayCatalog(req.user!.tenantId));
}));

router.get("/n0va1o/catalog/search", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oCatalogSearch(req.user!.tenantId, typeof req.query.q === "string" ? req.query.q : "", typeof req.query.category === "string" ? req.query.category : undefined));
}));

router.get("/n0va1o/categories", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oCategoryCatalog());
}));

router.get("/n0va1o/plans", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oPlanCatalog(req.user!.tenantId));
}));

router.post("/n0va1o/plans", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSetPlan(req.user!.tenantId, typeof req.body?.plan === "string" ? req.body.plan : ""));
}));

router.get("/n0va1o/usage", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oUsageStatus(req.user!.tenantId));
}));

router.get("/n0va1o/overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oGatewayOverview(req.user!.tenantId));
}));

router.get("/n0va1o/auth/catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAuthCatalog());
}));

router.post("/n0va1o/auth/agents", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRegisterAgent(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/auth/agents", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAgents(req.user!.tenantId));
}));

router.get("/n0va1o/auth/agents/:agentId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAgent(req.user!.tenantId, req.params.agentId));
}));

router.delete("/n0va1o/auth/agents/:agentId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDeactivateAgent(req.user!.tenantId, req.params.agentId));
}));

router.post("/n0va1o/auth/tokens", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oMintJitToken(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/auth/tokens", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTokens(req.user!.tenantId, typeof req.query.agentId === "string" ? req.query.agentId : undefined));
}));

router.get("/n0va1o/auth/tokens/:tokenId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTokenStatus(req.user!.tenantId, req.params.tokenId));
}));

router.delete("/n0va1o/auth/tokens/:tokenId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRevokeToken(req.user!.tenantId, req.params.tokenId));
}));

router.post("/n0va1o/auth/tokens/:tokenId/rotate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRotateToken(req.user!.tenantId, req.params.tokenId));
}));

router.post("/n0va1o/auth/connections", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oCreateConnection(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/auth/connections", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oConnections(req.user!.tenantId, typeof req.query.status === "string" ? req.query.status : undefined));
}));

router.get("/n0va1o/auth/connections/:connectionId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oConnection(req.user!.tenantId, req.params.connectionId));
}));

router.post("/n0va1o/auth/connections/:connectionId/authorize", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAuthorizeConnection(req.user!.tenantId, req.params.connectionId));
}));

router.post("/n0va1o/auth/connections/:connectionId/disconnect", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDisconnectConnection(req.user!.tenantId, req.params.connectionId));
}));

router.post("/n0va1o/auth/accounts", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAddAccount(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/auth/accounts", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAccounts(req.user!.tenantId, typeof req.query.connectionId === "string" ? req.query.connectionId : undefined));
}));

router.post("/n0va1o/auth/accounts/:accountId/switch", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSwitchAccount(req.user!.tenantId, req.params.accountId));
}));

router.get("/n0va1o/auth/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAuthDashboard(req.user!.tenantId));
}));

router.get("/n0va1o/auth/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAuthLog(req.user!.tenantId, typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined));
}));

router.get("/n0va1o/routing/mcp", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oMcpCatalog());
}));

router.get("/n0va1o/routing/tools/discover", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDiscoverTools(req.user!.tenantId, typeof req.query.query === "string" ? req.query.query : "", {
    limit: typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined,
    maxTools: typeof req.query.maxTools === "string" ? parseInt(req.query.maxTools, 10) : undefined,
    contextWindowSize: typeof req.query.contextWindowSize === "string" ? parseInt(req.query.contextWindowSize, 10) : undefined,
    preferredLatency: typeof req.query.preferredLatency === "string" ? parseInt(req.query.preferredLatency, 10) : undefined,
    riskTolerance: typeof req.query.riskTolerance === "string" ? req.query.riskTolerance : undefined,
  }));
}));

router.post("/n0va1o/routing/translate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTranslateRequest(req.user!.tenantId, req.body || {}));
}));

router.post("/n0va1o/routing/policies", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oCreateRoutingPolicy(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/routing/policies", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRoutingPolicies(req.user!.tenantId));
}));

router.get("/n0va1o/routing/policies/:teamId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRoutingPolicy(req.user!.tenantId, req.params.teamId));
}));

router.put("/n0va1o/routing/policies/:teamId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oUpdateRoutingPolicy(req.user!.tenantId, req.params.teamId, req.body || {}));
}));

router.delete("/n0va1o/routing/policies/:teamId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDeleteRoutingPolicy(req.user!.tenantId, req.params.teamId));
}));

router.post("/n0va1o/routing/tools/evaluate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oEvaluateToolAccess(req.user!.tenantId, req.body || {}));
}));

router.post("/n0va1o/routing/access-requests", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRequestAccess(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/routing/access-requests", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAccessRequests(req.user!.tenantId, typeof req.query.status === "string" ? req.query.status : undefined));
}));

router.post("/n0va1o/routing/access-requests/:requestId/resolve", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oResolveAccessRequest(req.user!.tenantId, req.params.requestId, typeof req.body?.decision === "string" ? req.body.decision : "approved"));
}));

router.get("/n0va1o/routing/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRoutingLog(req.user!.tenantId, typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined));
}));

router.get("/n0va1o/routing/overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRoutingOverview(req.user!.tenantId));
}));

router.get("/n0va1o/exec/sandbox-catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSandboxCatalog());
}));

router.post("/n0va1o/exec/sandboxes", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSpawnSandbox(req.user!.tenantId, req.body || {}));
}));

router.post("/n0va1o/exec/sandboxes/:sandboxId/exec", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oExecInSandbox(req.user!.tenantId, req.params.sandboxId, req.body || {}));
}));

router.post("/n0va1o/exec/sandboxes/:sandboxId/terminate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTerminateSandbox(req.user!.tenantId, req.params.sandboxId));
}));

router.get("/n0va1o/exec/sandboxes", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSandboxes(req.user!.tenantId, typeof req.query.status === "string" ? req.query.status : undefined));
}));

router.get("/n0va1o/exec/sandboxes/:sandboxId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSandbox(req.user!.tenantId, req.params.sandboxId));
}));

router.post("/n0va1o/exec/files", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oPutFile(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/exec/files", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oFiles(req.user!.tenantId));
}));

router.get("/n0va1o/exec/files/:fileId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oFile(req.user!.tenantId, req.params.fileId));
}));

router.delete("/n0va1o/exec/files/:fileId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDeleteFile(req.user!.tenantId, req.params.fileId));
}));

router.get("/n0va1o/exec/vfs", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oVfsOverview(req.user!.tenantId));
}));

router.get("/n0va1o/exec/recipe-catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRecipeCatalog());
}));

router.post("/n0va1o/exec/recipes", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oCompileRecipe(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/exec/recipes", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRecipes(req.user!.tenantId));
}));

router.get("/n0va1o/exec/recipes/:recipeId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRecipe(req.user!.tenantId, req.params.recipeId));
}));

router.post("/n0va1o/exec/recipes/:recipeId/execute", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oExecuteRecipe(req.user!.tenantId, req.params.recipeId));
}));

router.get("/n0va1o/exec/executions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oExecutions(req.user!.tenantId, typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined));
}));

router.get("/n0va1o/exec/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oExecLog(req.user!.tenantId, typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined));
}));

router.get("/n0va1o/exec/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oExecDashboard(req.user!.tenantId));
}));

router.get("/n0va1o/triggers/catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTriggerCatalog());
}));

router.post("/n0va1o/triggers", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oCreateTrigger(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/triggers", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTriggers(req.user!.tenantId));
}));
router.post("/n0va1o/triggers/ingest", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oIngestWebhook(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/triggers/ingest-overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oIngestOverview(req.user!.tenantId));
}));

router.post("/n0va1o/triggers/fire", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oFireEvent(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/triggers/deliveries", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDeliveries(req.user!.tenantId, typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined));
}));

router.get("/n0va1o/triggers/stats", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTriggerStats(req.user!.tenantId));
}));

router.get("/n0va1o/triggers/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTriggerLog(req.user!.tenantId, typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined));
}));

router.get("/n0va1o/triggers/overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTriggerOverview(req.user!.tenantId));
}));

router.get("/n0va1o/triggers/:triggerId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTrigger(req.user!.tenantId, req.params.triggerId));
}));

router.post("/n0va1o/triggers/:triggerId/toggle", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oToggleTrigger(req.user!.tenantId, req.params.triggerId));
}));

router.delete("/n0va1o/triggers/:triggerId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDeleteTrigger(req.user!.tenantId, req.params.triggerId));
}));

router.get("/n0va1o/gov/zero-trust", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oZeroTrustStatus(req.user!.tenantId));
}));

router.get("/n0va1o/gov/modifiers/catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSchemaModifierCatalog());
}));

router.post("/n0va1o/gov/modifiers", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oCreateModifier(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/gov/modifiers", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oModifiers(req.user!.tenantId));
}));

router.delete("/n0va1o/gov/modifiers/:modifierId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDeleteModifier(req.user!.tenantId, req.params.modifierId));
}));

router.post("/n0va1o/gov/evaluate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oEvaluateCall(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/gov/hitl", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oHitlQueue(req.user!.tenantId));
}));

router.get("/n0va1o/gov/hitl/:hitlId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oHitl(req.user!.tenantId, req.params.hitlId));
}));

router.post("/n0va1o/gov/hitl/:hitlId/resolve", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oResolveHitl(req.user!.tenantId, req.params.hitlId, typeof req.body?.decision === "string" ? req.body.decision : "approved", req.body || {}));
}));

router.get("/n0va1o/gov/hitl-status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oHitlStatus(req.user!.tenantId));
}));

router.post("/n0va1o/gov/audit", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAppendAudit(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/gov/audit", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAuditLog(req.user!.tenantId, typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined));
}));

router.get("/n0va1o/gov/audit/verify", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oVerifyAuditChain(req.user!.tenantId));
}));

router.get("/n0va1o/gov/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oGovernanceDashboard(req.user!.tenantId));
}));

router.get("/n0va1o/plugins/catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oPluginCatalog());
}));

router.get("/n0va1o/plugins", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oPluginStatus(req.user!.tenantId));
}));

router.post("/n0va1o/plugins/:slotId/toggle", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTogglePlugin(req.user!.tenantId, req.params.slotId));
}));

router.post("/n0va1o/plugins/cycle", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRunPluginCycle(req.user!.tenantId));
}));

router.get("/n0va1o/plugins/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oPluginLog(req.user!.tenantId, typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined));
}));

router.get("/n0va1o/plugins/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oPluginDashboard(req.user!.tenantId));
}));

router.get("/n0va1o/catalog/throughput", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oThroughputStatus(req.user!.tenantId));
}));

router.get("/n0va1o/catalog/latency", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oLatencyBenchmarks(req.user!.tenantId));
}));

router.get("/n0va1o/catalog/auth-methods", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAuthMethodCatalog());
}));

router.post("/n0va1o/auth/sessions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oCreateSession(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/auth/sessions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oListSessions(req.user!.tenantId, typeof req.query.status === "string" ? req.query.status : undefined));
}));

router.get("/n0va1o/auth/sessions/:sessionId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oGetSession(req.user!.tenantId, req.params.sessionId));
}));

router.post("/n0va1o/auth/sessions/:sessionId/end", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oEndSession(req.user!.tenantId, req.params.sessionId));
}));

router.get("/n0va1o/exec/files/:fileId/chunk", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oVfsChunkRead(req.user!.tenantId, req.params.fileId, typeof req.query.offset === "string" ? parseInt(req.query.offset, 10) : 0, typeof req.query.length === "string" ? parseInt(req.query.length, 10) : 100));
}));

router.post("/n0va1o/exec/files/:fileId/grep", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oVfsGrepSearch(req.user!.tenantId, req.params.fileId, String(req.body?.pattern || "")));
}));

router.post("/n0va1o/exec/files/:fileId/pandas", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oVfsPandasQuery(req.user!.tenantId, req.params.fileId, String(req.body?.query || "")));
}));

router.get("/n0va1o/exec/files/:fileId/stats", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oVfsSummarizeStats(req.user!.tenantId, req.params.fileId));
}));

router.post("/n0va1o/exec/files/:fileId/awk", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oVfsAwkProcess(req.user!.tenantId, req.params.fileId, String(req.body?.program || "")));
}));

router.post("/n0va1o/exec/files/:fileId/convert", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oVfsConvertFormat(req.user!.tenantId, req.params.fileId, String(req.body?.targetFormat || "")));
}));

router.post("/n0va1o/exec/files/:fileId/stream", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oVfsStreamExport(req.user!.tenantId, req.params.fileId, req.body || {}));
}));

router.post("/n0va1o/audit/directory/pulse", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSimulateDirectoryPulse(req.user!.tenantId, String(req.body?.email || "")));
}));

router.post("/n0va1o/gov/modifiers/run", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRunModifierPipeline(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/gov/modifiers/pipeline-status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oModifierPipelineStatus(req.user!.tenantId));
}));

router.get("/n0va1o/compliance/frameworks", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oComplianceFrameworkCatalog());
}));

router.get("/n0va1o/compliance/mapping", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oComplianceMapping(req.user!.tenantId));
}));

router.get("/n0va1o/compliance/evidence/:framework", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oComplianceEvidence(req.user!.tenantId, req.params.framework));
}));

router.get("/n0va1o/compliance/reports", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oComplianceReports(req.user!.tenantId));
}));

router.get("/n0va1o/compliance/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oComplianceDashboard(req.user!.tenantId));
}));

router.get("/n0va1o/compliance/audit-trail/:agentId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAgentAuditTrail(req.user!.tenantId, req.params.agentId));
}));

router.get("/n0va1o/compliance/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oComplianceLog(req.user!.tenantId, typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined));
}));

router.get("/n0va1o/cli/catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oCliCatalog());
}));

router.get("/n0va1o/cli/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oCliStatus(req.user!.tenantId));
}));

router.post("/n0va1o/cli/install", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oInstallCli(req.user!.tenantId, req.body || {}));
}));

router.post("/n0va1o/cli/auth", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAuthenticateCli(req.user!.tenantId, req.body || {}));
}));

router.post("/n0va1o/cli/auth/:sessionId/complete", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oCompleteCliAuth(req.user!.tenantId, req.params.sessionId));
}));

router.get("/n0va1o/cli/sessions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oCliSessions(req.user!.tenantId, typeof req.query.status === "string" ? req.query.status : undefined));
}));

router.post("/n0va1o/cli/sessions/:sessionId/end", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oEndCliSession(req.user!.tenantId, req.params.sessionId));
}));

router.get("/n0va1o/cli/discover", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oCliDiscover(req.user!.tenantId, typeof req.query.q === "string" ? req.query.q : ""));
}));

router.post("/n0va1o/cli/exec", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oExecuteCliCommand(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/cli/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oCliDashboard(req.user!.tenantId));
}));

router.get("/n0va1o/cli/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oCliLog(req.user!.tenantId, typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined));
}));

router.get("/n0va1o/audit/policy", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAuditPolicy(req.user!.tenantId));
}));

router.put("/n0va1o/audit/policy", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSetAuditPolicy(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/audit/export", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oExportAuditCsv(req.user!.tenantId, typeof req.query.kind === "string" ? req.query.kind : "audit", typeof req.query.framework === "string" ? req.query.framework : undefined));
}));

router.get("/n0va1o/audit/retention", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRetentionStatus(req.user!.tenantId));
}));

router.post("/n0va1o/audit/retention/apply", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oApplyRetention(req.user!.tenantId));
}));

router.get("/n0va1o/audit/directory", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDirectoryGroups(req.user!.tenantId));
}));

router.post("/n0va1o/audit/directory/sync", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSyncDirectory(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/audit/directory/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDirectoryDashboard(req.user!.tenantId));
}));

router.get("/n0va1o/audit/directory/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDirectoryLog(req.user!.tenantId, typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined));
}));

router.get("/n0va1o/audit/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAuditDashboard(req.user!.tenantId));
}));

router.get("/n0va1o/audit/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAuditCenterLog(req.user!.tenantId, typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined));
}));

router.get("/n0va1o/sdk/catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSdkCatalog());
}));

router.post("/n0va1o/sdk/snippet", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSdkSnippet(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/sdk/install-guide", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSdkInstallGuide(req.user!.tenantId, typeof req.query.language === "string" ? req.query.language : "python"));
}));

router.get("/n0va1o/sdk/version", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSdkCheckVersion(req.user!.tenantId, typeof req.query.language === "string" ? req.query.language : "python"));
}));

router.get("/n0va1o/sdk/projects", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSdkProjects(req.user!.tenantId));
}));

router.post("/n0va1o/sdk/projects", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSdkCreateProject(req.user!.tenantId, req.body || {}));
}));

router.post("/n0va1o/sdk/usage", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSdkRecordUsage(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/sdk/usage", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSdkUsage(req.user!.tenantId));
}));

router.get("/n0va1o/sdk/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSdkDashboard(req.user!.tenantId));
}));

router.get("/n0va1o/sdk/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oSdkLog(req.user!.tenantId));
}));

router.get("/n0va1o/deploy/catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDeployCatalog());
}));

router.post("/n0va1o/deploy", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDeployCreate(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/deploy", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDeployments(req.user!.tenantId));
}));

router.get("/n0va1o/deploy/health", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDeployHealth(req.user!.tenantId));
}));

router.get("/n0va1o/deploy/onboarding", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oOnboarding(req.user!.tenantId));
}));

router.post("/n0va1o/deploy/migrate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oMigrateConnections(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/deploy/troubleshoot-catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTroubleshootCatalog());
}));

router.post("/n0va1o/deploy/troubleshoot", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTroubleshoot(req.user!.tenantId, typeof req.body?.issue === "string" ? req.body.issue : ""));
}));

router.post("/n0va1o/deploy/issues/:issueId/resolve", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oResolveIssue(req.user!.tenantId, req.params.issueId));
}));

router.get("/n0va1o/deploy/issues", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oIssues(req.user!.tenantId));
}));

router.get("/n0va1o/deploy/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDeployDashboard(req.user!.tenantId));
}));

router.get("/n0va1o/deploy/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDeployLog(req.user!.tenantId));
}));

router.post("/n0va1o/deploy/:deploymentId/provision", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDeployProvision(req.user!.tenantId, req.params.deploymentId));
}));

router.get("/n0va1o/deploy/:deploymentId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDeployment(req.user!.tenantId, req.params.deploymentId));
}));

router.delete("/n0va1o/deploy/:deploymentId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oDeployDelete(req.user!.tenantId, req.params.deploymentId));
}));

router.get("/n0va1o/observe/catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oObserveCatalog());
}));

router.post("/n0va1o/observe/telemetry", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTelemetry(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/observe/telemetry/stats", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTelemetryStats(req.user!.tenantId));
}));

router.post("/n0va1o/observe/traces", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTrace(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/observe/traces", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTraces(req.user!.tenantId, typeof req.query.status === "string" ? req.query.status : undefined));
}));

router.get("/n0va1o/observe/traces/:traceId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oGetTrace(req.user!.tenantId, req.params.traceId));
}));

router.post("/n0va1o/observe/errors", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oReportError(req.user!.tenantId, req.body || {}));
}));

router.post("/n0va1o/observe/errors/:errorId/retry", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRetryDecision(req.params.errorId, typeof req.body?.attempt === "number" ? req.body.attempt : 1));
}));

router.post("/n0va1o/observe/errors/:errorId/resolve", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oResolveError(req.params.errorId));
}));

router.get("/n0va1o/observe/errors", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oErrors(req.user!.tenantId, typeof req.query.status === "string" ? req.query.status : undefined));
}));

router.get("/n0va1o/observe/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oObserveDashboard(req.user!.tenantId));
}));

router.get("/n0va1o/observe/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oObserveLog(req.user!.tenantId));
}));

router.get("/n0va1o/modifiers/types", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oModifierTypes());
}));

router.get("/n0va1o/modifiers/catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oModifierCatalog());
}));

router.get("/n0va1o/routing/translation-catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oTranslationCatalog());
}));


router.get("/n0va1o/auth/accounts/health", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAccountHealth(req.user!.tenantId));
}));

router.post("/n0va1o/auth/accounts/health/refresh", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oRefreshAccountHealth(req.user!.tenantId));
}));

router.get("/n0va1o/auth/accounts/lru", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oAccountLru(req.user!.tenantId, {}));
}));

router.post("/n0va1o/auth/accounts/evict", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oEvictAccounts(req.user!.tenantId, req.body || {}));
}));

router.post("/n0va1o/auth/oauth/authorize", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oOauthAuthorizeUrl(req.user!.tenantId, req.body || {}));
}));

router.post("/n0va1o/auth/oauth/callback", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oOauthCallback(req.user!.tenantId, req.body || {}));
}));

router.post("/n0va1o/auth/oauth/:connectionId/refresh", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oOauthRefresh(req.user!.tenantId, req.params.connectionId));
}));

router.post("/n0va1o/auth/oauth/:connectionId/revoke", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oOauthRevoke(req.user!.tenantId, req.params.connectionId));
}));

router.get("/n0va1o/auth/oauth/:connectionId/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oOauthStatus(req.user!.tenantId, req.params.connectionId));
}));

router.get("/n0va1o/migration/catalog", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oMigrationCatalog());
}));

router.post("/n0va1o/migration/start", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oMigrationStart(req.user!.tenantId, req.body || {}));
}));

router.get("/n0va1o/migrations", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oMigrations(req.user!.tenantId));
}));

router.get("/n0va1o/migrations/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oMigrationDashboard(req.user!.tenantId));
}));

router.get("/n0va1o/migrations/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oMigrationLog(req.user!.tenantId, typeof req.query.limit === "string" ? Number(req.query.limit) : undefined));
}));

router.get("/n0va1o/migrations/:migrationId/plan", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oMigrationPlan(req.user!.tenantId, req.params.migrationId));
}));

router.post("/n0va1o/migrations/:migrationId/phases/:phaseId/run", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oMigrationRunPhase(req.user!.tenantId, req.params.migrationId, req.params.phaseId));
}));

router.get("/n0va1o/migrations/:migrationId/status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oMigrationStatus(req.user!.tenantId, req.params.migrationId));
}));

router.get("/n0va1o/migrations/:migrationId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oMigration(req.user!.tenantId, req.params.migrationId));
}));

router.delete("/n0va1o/migrations/:migrationId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.n0va1oMigrationDelete(req.user!.tenantId, req.params.migrationId));
}));

// ---- N0VA CHAT ----
const tenant = (req: Request) => req.user!.tenantId;
const uid = (req: Request) => (req.query.userId as string) || req.user?.userId || "user_001";

router.get("/chat/overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatOverview(tenant(req), uid(req)));
}));

router.get("/chat/rooms", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatListRooms(tenant(req), req.query));
}));
router.get("/chat/rooms/my", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatMyRooms(tenant(req), uid(req)));
}));
router.get("/chat/rooms/templates", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatRoomTemplates(tenant(req)));
}));
router.post("/chat/rooms/templates/instantiate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatInstantiateTemplate(tenant(req), req.body.templateId, req.body));
}));
router.get("/chat/room/:roomId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatRoom(tenant(req), req.params.roomId));
}));
router.post("/chat/rooms", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatCreateRoom(tenant(req), req.body));
}));
router.patch("/chat/room/:roomId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatUpdateRoom(tenant(req), req.params.roomId, req.body));
}));
router.post("/chat/room/:roomId/archive", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatArchiveRoom(tenant(req), req.params.roomId, req.query));
}));
router.post("/chat/room/:roomId/restore", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatRestoreRoom(tenant(req), req.params.roomId));
}));
router.post("/chat/room/:roomId/members", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAddMember(tenant(req), req.params.roomId, req.body.userId, req.body.role || "member"));
}));
router.delete("/chat/room/:roomId/members/:userId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatRemoveMember(tenant(req), req.params.roomId, req.params.userId));
}));
router.patch("/chat/room/:roomId/members/:userId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatSetMemberRole(tenant(req), req.params.roomId, req.params.userId, req.body.role));
}));
router.post("/chat/room/:roomId/read", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatMarkRoomRead(tenant(req), req.params.roomId, uid(req)));
}));
router.post("/chat/rooms/sweep", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatArchiveSweep(tenant(req)));
}));
router.get("/chat/room/:roomId/hyper-context", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatRoomHyperContext(tenant(req), req.params.roomId));
}));

router.get("/chat/room/:roomId/messages", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatMessages(tenant(req), req.params.roomId, req.query));
}));
router.post("/chat/room/:roomId/messages", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatSendMessage(tenant(req), req.params.roomId, { ...req.body, userId: req.body.userId || uid(req) }));
}));
router.get("/chat/message/:messageId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatMessage(tenant(req), req.params.messageId));
}));
router.patch("/chat/message/:messageId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatEditMessage(tenant(req), req.params.messageId, req.body));
}));
router.delete("/chat/message/:messageId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatDeleteMessage(tenant(req), req.params.messageId, req.query));
}));
router.post("/chat/message/:messageId/reactions", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatReact(tenant(req), req.params.messageId, req.body.emoji, req.body.userId || uid(req)));
}));
router.delete("/chat/message/:messageId/reactions/:emoji", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatUnreact(tenant(req), req.params.messageId, req.params.emoji, req.body.userId || uid(req)));
}));
router.post("/chat/message/:messageId/thread", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatReplyThread(tenant(req), req.params.messageId, req.body));
}));
router.get("/chat/message/:messageId/thread", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatThread(tenant(req), req.params.messageId, req.query));
}));
router.get("/chat/message/:messageId/thread-summary", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatThreadSummary(tenant(req), req.params.messageId));
}));
router.post("/chat/message/:messageId/thread-resolve", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatThreadResolve(tenant(req), req.params.messageId, req.body.resolved !== false));
}));
router.post("/chat/message/:messageId/decision", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatMarkDecision(tenant(req), req.params.messageId, req.body));
}));
router.post("/chat/message/:messageId/pin", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatPin(tenant(req), req.params.messageId, req.body.pinned !== false));
}));
router.get("/chat/pinned", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatPinned(tenant(req), req.query.roomId as string | undefined));
}));

router.get("/chat/presence/:userId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatPresence(tenant(req), req.params.userId));
}));
router.get("/chat/presence", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatPresenceList(tenant(req), req.query.userIds ? String(req.query.userIds).split(",") : undefined));
}));
router.post("/chat/presence/update", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatUpdatePresence(tenant(req), req.body.userId || uid(req), req.body));
}));
router.post("/chat/presence/custom-status", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatCustomStatus(tenant(req), req.body.userId || uid(req), req.body.statusText));
}));
router.post("/chat/presence/devices", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatRegisterDevice(tenant(req), req.body.userId || uid(req), req.body.device));
}));
router.post("/chat/presence/focus", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatFocusMode(tenant(req), req.body.userId || uid(req), req.body));
}));
router.post("/chat/presence/calendar", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatCalendarStatus(tenant(req), req.body.userId || uid(req), req.body));
}));
router.get("/chat/presence/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatPresenceDashboard(tenant(req)));
}));

router.get("/chat/search", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatSearch(tenant(req), req.query));
}));
router.get("/chat/search/operators", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatParseQuery(req.query.q as string || ""));
}));
router.get("/chat/search/semantic", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatSemanticSearch(tenant(req), req.query.q as string || "", req.query));
}));
router.post("/chat/search/saved", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatSaveSearch(tenant(req), req.body));
}));
router.get("/chat/search/saved", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatSavedSearches(tenant(req)));
}));
router.delete("/chat/search/saved/:savedId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatDeleteSavedSearch(tenant(req), req.params.savedId));
}));
router.get("/chat/search/stats", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatSearchStats(tenant(req)));
}));

router.get("/chat/huddles", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatHuddles(tenant(req), req.query.roomId as string | undefined));
}));
router.post("/chat/huddles", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatStartHuddle(tenant(req), req.body.roomId, req.body));
}));
router.get("/chat/huddle/:huddleId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatHuddle(tenant(req), req.params.huddleId));
}));
router.post("/chat/huddle/:huddleId/join", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatJoinHuddle(tenant(req), req.params.huddleId, req.body.userId || uid(req)));
}));
router.post("/chat/huddle/:huddleId/leave", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatLeaveHuddle(tenant(req), req.params.huddleId, req.body.userId || uid(req)));
}));
router.post("/chat/huddle/:huddleId/end", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatEndHuddle(tenant(req), req.params.huddleId));
}));
router.post("/chat/huddle/:huddleId/recording/start", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatStartRecording(tenant(req), req.params.huddleId));
}));
router.post("/chat/huddle/:huddleId/recording/stop", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatStopRecording(tenant(req), req.params.huddleId));
}));
router.get("/chat/huddle/:huddleId/recording", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatRecording(tenant(req), req.params.huddleId));
}));
router.get("/chat/huddles/wall", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatHuddleWall(tenant(req)));
}));

router.get("/chat/bots", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatListBots(tenant(req)));
}));
router.get("/chat/bot/:botId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatGetBot(tenant(req), req.params.botId));
}));
router.post("/chat/bots", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatCreateBot(tenant(req), req.body));
}));
router.patch("/chat/bot/:botId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatUpdateBot(tenant(req), req.params.botId, req.body));
}));
router.post("/chat/bot/:botId/toggle", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatToggleBot(tenant(req), req.params.botId, req.body.enabled !== false));
}));
router.delete("/chat/bot/:botId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatDeleteBot(tenant(req), req.params.botId));
}));
router.get("/chat/bot/commands", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatBotCommands());
}));
router.post("/chat/bot/dispatch", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatBotDispatch(tenant(req), req.body.roomId, req.body.userId || uid(req), req.body.command));
}));
router.get("/chat/bots/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatBotDashboard(tenant(req)));
}));

router.get("/chat/notifications", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatNotificationsList(tenant(req)));
}));
router.post("/chat/notifications", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatNotificationsCreate(tenant(req), req.body));
}));
router.patch("/chat/notifications/:ruleId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatNotificationsUpdate(tenant(req), req.params.ruleId, req.body));
}));
router.post("/chat/notifications/:ruleId/toggle", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatNotificationsToggle(tenant(req), req.params.ruleId, req.body.enabled !== false));
}));
router.delete("/chat/notifications/:ruleId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatNotificationsDelete(tenant(req), req.params.ruleId));
}));
router.post("/chat/notifications/evaluate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatNotificationsEvaluateAll(tenant(req), req.body.message));
}));
router.post("/chat/notifications/digest", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatNotificationsDigest(tenant(req), req.body.userId || uid(req), req.body));
}));
router.get("/chat/notifications/settings", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatNotificationsSettings(tenant(req), uid(req)));
}));
router.patch("/chat/notifications/settings", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatNotificationsUpdateSettings(tenant(req), req.body.userId || uid(req), req.body));
}));
router.get("/chat/notifications/inbox", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatNotificationsInbox(tenant(req), uid(req), req.query));
}));

router.get("/chat/compliance/policies", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatCompliancePolicies(tenant(req)));
}));
router.get("/chat/compliance/policy/:policyId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatCompliancePolicy(tenant(req), req.params.policyId));
}));
router.patch("/chat/compliance/policy/:policyId", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatComplianceUpdatePolicy(tenant(req), req.params.policyId, req.body));
}));
router.post("/chat/compliance/evaluate", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatComplianceEvaluate(tenant(req), req.body.message));
}));
router.get("/chat/compliance/violations", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatComplianceViolations(tenant(req), req.query));
}));
router.post("/chat/compliance/violations/:violationId/resolve", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatComplianceResolve(tenant(req), req.params.violationId, req.body.action || "manual"));
}));
router.get("/chat/compliance/audit", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatComplianceAudit(tenant(req), req.query.q as string || "", req.query));
}));
router.get("/chat/compliance/holds", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatComplianceHolds(tenant(req)));
}));
router.post("/chat/compliance/holds", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatCompliancePlaceHold(tenant(req), req.body));
}));
router.post("/chat/compliance/holds/:holdId/release", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatComplianceReleaseHold(tenant(req), req.params.holdId));
}));
router.get("/chat/compliance/overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatComplianceOverview(tenant(req)));
}));

router.get("/chat/analytics/volume", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAnalyticsVolume(tenant(req), req.query));
}));
router.get("/chat/analytics/top-rooms", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAnalyticsTopRooms(tenant(req), req.query));
}));
router.get("/chat/analytics/users", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAnalyticsUsers(tenant(req), req.query));
}));
router.get("/chat/analytics/response-time", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAnalyticsResponse(tenant(req)));
}));
router.get("/chat/analytics/sentiment", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAnalyticsSentiment(tenant(req), req.query));
}));
router.get("/chat/analytics/report", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAnalyticsReport(tenant(req)));
}));
router.get("/chat/analytics/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAnalyticsDashboard(tenant(req)));
}));

router.get("/chat/commands", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatCommandsList());
}));
router.post("/chat/commands/run", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatCommandRun(tenant(req), req.body.userId || uid(req), req.body.command, req.body));
}));

router.get("/chat/admin", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAdminList(tenant(req)));
}));
router.post("/chat/admin/assign", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAdminAssign(tenant(req), req.body.userId, req.body.role, req.body));
}));
router.get("/chat/admin/settings", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAdminSettings(tenant(req)));
}));
router.patch("/chat/admin/settings", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAdminUpdateSettings(tenant(req), req.body));
}));
router.get("/chat/admin/member/:userId/access", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAdminMemberAccess(tenant(req), req.params.userId));
}));
router.get("/chat/admin/export", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAdminExportAudit(tenant(req), req.query));
}));
router.post("/chat/admin/users/:userId/suspend", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAdminSuspend(tenant(req), req.params.userId, req.body));
}));
router.post("/chat/admin/users/:userId/restore", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAdminRestore(tenant(req), req.params.userId));
}));
router.get("/chat/admin/dashboard", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatAdminDashboard(tenant(req)));
}));

router.get("/chat/realtime/overview", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatRealtimeOverview(tenant(req)));
}));
router.get("/chat/realtime/log", asyncHandler(async (req, res) => {
  sendSuccess(res, adsMarketingModule.chatRealtimeLog(tenant(req), req.query.limit ? parseInt(req.query.limit as string, 10) : 25));
}));

export default router;
