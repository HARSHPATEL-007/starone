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

export default router;
