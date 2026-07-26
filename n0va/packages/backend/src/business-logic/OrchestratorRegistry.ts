import { campaignSummaryOrchestrator } from "./CampaignSummaryOrchestrator";
import { campaignHealthOrchestrator } from "./CampaignHealthOrchestrator";
import { campaignScorecardOrchestrator } from "./CampaignScorecardOrchestrator";
import { campaignSnapshotOrchestrator } from "./CampaignSnapshotOrchestrator";
import { campaignPacingOrchestrator } from "./CampaignPacingOrchestrator";
import { campaignLifecycleOrchestrator } from "./CampaignLifecycleOrchestrator";
import { campaignLaunchOrchestrator } from "./CampaignLaunchOrchestrator";
import { campaignOptimizerOrchestrator } from "./CampaignOptimizerOrchestrator";
import { campaignSaturationOrchestrator } from "./CampaignSaturationOrchestrator";
import { campaignIssueOrchestrator } from "./CampaignIssueOrchestrator";
import { budgetOptimizationOrchestrator } from "./BudgetOptimizationOrchestrator";
import { budgetAlertOrchestrator } from "./BudgetAlertOrchestrator";
import { creativeAIOrchestrator } from "./CreativeAIOrchestrator";
import { creativeLifecycleOrchestrator } from "./CreativeLifecycleOrchestrator";
import { creativeVersionOrchestrator } from "./CreativeVersionOrchestrator";
import { audienceInsightsOrchestrator } from "./AudienceInsightsOrchestrator";
import { audienceOptimizationOrchestrator } from "./AudienceOptimizationOrchestrator";
import { attributionOrchestrator } from "./AttributionOrchestrator";
import { crossCampaignAttributionOrchestrator } from "./CrossCampaignAttributionOrchestrator";
import { funnelAnalysisOrchestrator } from "./FunnelAnalysisOrchestrator";
import { cohortAnalysisOrchestrator } from "./CohortAnalysisOrchestrator";
import { anomalyDetectionOrchestrator } from "./AnomalyDetectionOrchestrator";
import { predictiveForecastOrchestrator } from "./PredictiveForecastOrchestrator";
import { portfolioHealthOrchestrator } from "./PortfolioHealthOrchestrator";
import { portfolioAdviceOrchestrator } from "./PortfolioAdviceOrchestrator";
import { recommendationOrchestrator } from "./RecommendationOrchestrator";
import { roasDecompositionOrchestrator } from "./ROASDecompositionOrchestrator";
import { roiCalculatorOrchestrator } from "./ROICalculatorOrchestrator";
import { executiveSummaryOrchestrator } from "./ExecutiveSummaryOrchestrator";
import { influencerROIOrchestrator } from "./InfluencerROIOrchestrator";
import { leadScoringOrchestrator } from "./LeadScoringOrchestrator";
import { agentOrchestrator } from "./AgentOrchestrator";
import { notificationOrchestrator } from "./NotificationOrchestrator";
import { abTestAdvisorOrchestrator } from "./ABTestAdvisorOrchestrator";
import { statisticalABTestOrchestrator } from "./StatisticalABTestOrchestrator";
import { reportBuilderOrchestrator } from "./ReportBuilderOrchestrator";
import { exportOrchestrator } from "./ExportOrchestrator";
import { contentPerformanceOrchestrator } from "./ContentPerformanceOrchestrator";
import { competitiveBenchmarkingOrchestrator } from "./CompetitiveBenchmarkingOrchestrator";
import { channelOptimizationOrchestrator } from "./ChannelOptimizationOrchestrator";
import { fraudResponseOrchestrator } from "./FraudResponseOrchestrator";
import { schedulerOrchestrator } from "./SchedulerOrchestrator";
import { workflowBuilderOrchestrator } from "./WorkflowBuilderOrchestrator";
import { ruleEngineOrchestrator } from "./RuleEngineOrchestrator";
import { webhookOrchestrator } from "./WebhookOrchestrator";
import { playbookExecutionOrchestrator } from "./PlaybookExecutionOrchestrator";
import { cdpOrchestrator } from "./CDPOrchestrator";
import { landingPageOrchestrator } from "./LandingPageOrchestrator";
import { entityStoreOrchestrator } from "./EntityStoreOrchestrator";
import { fileStorageOrchestrator } from "./FileStorageOrchestrator";
import { developerPortalOrchestrator } from "./DeveloperPortalOrchestrator";
import { adminOrchestrator } from "./AdminOrchestrator";
import { n0va1oOrchestrator } from "./N0VA1OOrchestrator";
import { unifiedIntelligenceOrchestrator } from "./UnifiedIntelligenceOrchestrator";
import { channelMixOptimizerOrchestrator } from "./ChannelMixOptimizerOrchestrator";
import { keywordInsightsOrchestrator } from "./KeywordInsightsOrchestrator";
import { formAnalyticsOrchestrator } from "./FormAnalyticsOrchestrator";
import { decisionEngine } from "./DecisionEngine";

export interface OrchestratorEntry {
  name: string;
  domain: string;
  methods: string[];
  sync: boolean;
}

export class OrchestratorRegistry {
  private entries: OrchestratorEntry[] = [];

  register(name: string, domain: string, methods: string[], sync: boolean = false): void {
    this.entries.push({ name, domain, methods, sync });
  }

  getAll(): OrchestratorEntry[] {
    return this.entries;
  }

  getByDomain(domain: string): OrchestratorEntry[] {
    return this.entries.filter((e) => e.domain === domain);
  }

  getCount(): number {
    return this.entries.length;
  }

  getHealth(): { total: number; sync: number; async: number; domains: number; status: string } {
    const sync = this.entries.filter((e) => e.sync).length;
    const async = this.entries.filter((e) => !e.sync).length;
    const domains = new Set(this.entries.map((e) => e.domain)).size;
    return { total: this.entries.length, sync, async, domains, status: "healthy" };
  }
}

export const orchestratorRegistry = new OrchestratorRegistry();

const SYNC = true;
const ASYNC = false;

orchestratorRegistry.register("CampaignSummaryOrchestrator", "campaign", ["getSummary"], ASYNC);
orchestratorRegistry.register("CampaignHealthOrchestrator", "campaign", ["getPortfolioDashboard", "getCampaignHealthDetail"], ASYNC);
orchestratorRegistry.register("CampaignScorecardOrchestrator", "campaign", ["analyze"], ASYNC);
orchestratorRegistry.register("CampaignSnapshotOrchestrator", "campaign", ["getCampaignSnapshotDashboard", "captureAllActiveSnapshots"], ASYNC);
orchestratorRegistry.register("CampaignPacingOrchestrator", "campaign", ["getPacingAnalysis", "getPacingAlerts"], ASYNC);
orchestratorRegistry.register("CampaignLifecycleOrchestrator", "campaign", ["getLifecycleStage", "transitionStage", "getCampaignTimeline"], ASYNC);
orchestratorRegistry.register("CampaignLaunchOrchestrator", "campaign", ["launchCampaign", "validateLaunch", "getLaunchChecklist"], ASYNC);
orchestratorRegistry.register("CampaignOptimizerOrchestrator", "campaign", ["optimizeBudget", "getOptimizationSuggestions"], ASYNC);
orchestratorRegistry.register("CampaignSaturationOrchestrator", "campaign", ["getSaturationAnalysis", "getSaturationCurve"], ASYNC);
orchestratorRegistry.register("CampaignIssueOrchestrator", "campaign", ["getIssues", "getIssueTimeline", "resolveIssue"], ASYNC);
orchestratorRegistry.register("BudgetOptimizationOrchestrator", "budget", ["optimize"], ASYNC);
orchestratorRegistry.register("BudgetAlertOrchestrator", "budget", ["getAlerts", "getAlertSummary"], ASYNC);
orchestratorRegistry.register("ChannelMixOptimizerOrchestrator", "budget", ["analyze"], ASYNC);
orchestratorRegistry.register("CreativeAIOrchestrator", "creative", ["getCrossPlatformAnalysis", "getOptimizedVariant", "analyzeCreativeText"], SYNC);
orchestratorRegistry.register("CreativeLifecycleOrchestrator", "creative", ["getLifecycleStage", "transitionCreative", "getCreativeTimeline"], ASYNC);
orchestratorRegistry.register("CreativeVersionOrchestrator", "creative", ["getDashboard", "getVersionHeatmap"], SYNC);
orchestratorRegistry.register("AudienceInsightsOrchestrator", "audience", ["getInsights", "getAudienceOverlap"], ASYNC);
orchestratorRegistry.register("AudienceOptimizationOrchestrator", "audience", ["optimize", "getSuggestions"], ASYNC);
orchestratorRegistry.register("AttributionOrchestrator", "analytics", ["getAttribution", "getChannelCredit"], ASYNC);
orchestratorRegistry.register("CrossCampaignAttributionOrchestrator", "analytics", ["getCrossAttribution", "getIncrementalLift"], ASYNC);
orchestratorRegistry.register("FunnelAnalysisOrchestrator", "analytics", ["getFunnel", "getStageBreakdown"], ASYNC);
orchestratorRegistry.register("CohortAnalysisOrchestrator", "analytics", ["getCohorts", "getRetentionCurve"], ASYNC);
orchestratorRegistry.register("AnomalyDetectionOrchestrator", "analytics", ["detect", "getAnomalyTimeline"], ASYNC);
orchestratorRegistry.register("PredictiveForecastOrchestrator", "analytics", ["forecast", "getConfidenceInterval"], ASYNC);
orchestratorRegistry.register("PortfolioHealthOrchestrator", "portfolio", ["getHealth", "getRiskAssessment"], ASYNC);
orchestratorRegistry.register("PortfolioAdviceOrchestrator", "portfolio", ["getAdvice", "getPrioritizedActions"], SYNC);
orchestratorRegistry.register("RecommendationOrchestrator", "portfolio", ["getRecommendations", "getActionItems"], ASYNC);
orchestratorRegistry.register("ROASDecompositionOrchestrator", "portfolio", ["decompose", "getDriverBreakdown"], ASYNC);
orchestratorRegistry.register("ROICalculatorOrchestrator", "portfolio", ["calculate", "getROIBreakdown"], ASYNC);
orchestratorRegistry.register("ExecutiveSummaryOrchestrator", "portfolio", ["generate"], ASYNC);
orchestratorRegistry.register("InfluencerROIOrchestrator", "portfolio", ["calculate", "getInfluencerRanking"], ASYNC);
orchestratorRegistry.register("LeadScoringOrchestrator", "portfolio", ["score", "getTopLeads"], ASYNC);
orchestratorRegistry.register("AgentOrchestrator", "automation", ["getAgentStatus", "executeAgent", "getAgentMetrics"], ASYNC);
orchestratorRegistry.register("NotificationOrchestrator", "automation", ["getDeliveryDashboard", "getChannelTrend"], SYNC);
orchestratorRegistry.register("ABTestAdvisorOrchestrator", "experimentation", ["getAdvice", "getTestDesign"], SYNC);
orchestratorRegistry.register("StatisticalABTestOrchestrator", "experimentation", ["getDashboard", "getScenarioAnalysis", "getTestDesignAdvisor"], SYNC);
orchestratorRegistry.register("ReportBuilderOrchestrator", "analytics", ["build", "getReportTemplate", "scheduleReport"], ASYNC);
orchestratorRegistry.register("ExportOrchestrator", "analytics", ["exportData", "getExportFormats", "scheduleExport"], ASYNC);
orchestratorRegistry.register("ContentPerformanceOrchestrator", "content", ["getPerformance", "getContentInsights"], ASYNC);
orchestratorRegistry.register("CompetitiveBenchmarkingOrchestrator", "analytics", ["getBenchmarks", "getCompetitorComparison"], ASYNC);
orchestratorRegistry.register("ChannelOptimizationOrchestrator", "budget", ["optimize", "getChannelMix"], ASYNC);
orchestratorRegistry.register("FraudResponseOrchestrator", "fraud", ["getFlags", "resolveFlag", "getFraudSummary"], ASYNC);
orchestratorRegistry.register("SchedulerOrchestrator", "automation", ["getJobs", "createJob", "pauseJob"], ASYNC);
orchestratorRegistry.register("WorkflowBuilderOrchestrator", "automation", ["getWorkflows", "createWorkflow", "executeWorkflow"], ASYNC);
orchestratorRegistry.register("RuleEngineOrchestrator", "automation", ["evaluate", "getRules", "createRule"], ASYNC);
orchestratorRegistry.register("WebhookOrchestrator", "automation", ["getWebhooks", "createWebhook", "getDeliveryLog"], ASYNC);
orchestratorRegistry.register("PlaybookExecutionOrchestrator", "automation", ["execute", "getPlaybooks", "getExecutionStatus"], ASYNC);
orchestratorRegistry.register("CDPOrchestrator", "audience", ["getUnifiedProfile", "getDataSources", "resolveIdentity"], ASYNC);
orchestratorRegistry.register("LandingPageOrchestrator", "content", ["getDashboard", "getPagePerformance"], SYNC);
orchestratorRegistry.register("EntityStoreOrchestrator", "infrastructure", ["getDashboard", "getEntityTypeDetail"], ASYNC);
orchestratorRegistry.register("FileStorageOrchestrator", "infrastructure", ["getDashboard"], SYNC);
orchestratorRegistry.register("DeveloperPortalOrchestrator", "infrastructure", ["getDashboard"], SYNC);
orchestratorRegistry.register("AdminOrchestrator", "infrastructure", ["getTenantHealth", "getRevenueAnalytics", "getCohortRetention"], ASYNC);
orchestratorRegistry.register("N0VA1OOrchestrator", "infrastructure", ["getGatewayDashboard", "getPlatformActionReport", "getLatencyProfiles"], SYNC);
orchestratorRegistry.register("UnifiedIntelligenceOrchestrator", "cross-domain", ["getCrossDomainIntelligence"], ASYNC);
orchestratorRegistry.register("KeywordInsightsOrchestrator", "analytics", ["analyze"], ASYNC);
orchestratorRegistry.register("FormAnalyticsOrchestrator", "analytics", ["analyze"], ASYNC);
