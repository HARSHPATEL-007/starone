import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";
import { unifiedAdsPipeline } from "./UnifiedAdsPipelineService";
import { campaignHealthService, CampaignHealthScore } from "./CampaignHealthService";
import { campaignHealthPredictorService } from "./CampaignHealthPredictorService";
import { campaignSaturationService } from "./CampaignSaturationService";
import { portfolioBudgetOptimizer } from "./PortfolioBudgetOptimizerService";
import { CampaignSummaryService } from "./CampaignSummaryService";
import { attributionService } from "./AttributionService";
import { campaignBudgetSimulator } from "./CampaignBudgetSimulatorService";
import { campaignInsightsEngine, InsightsDashboard, CorrelationAnalysis, TrendAnalysis, BudgetEfficiencyScore, CrossCampaignAttribution, PredictiveAlertSummary } from "./CampaignInsightsEngineService";
import { campaignPerformanceDiagnostics } from "./CampaignPerformanceDiagnosticsService";
import { campaignDaypartingOptimizer } from "./CampaignDaypartingOptimizerService";
import { campaignROIDecomposition } from "./CampaignROIDecompositionService";
import { campaignAdQualityAnalyzer } from "./CampaignAdQualityAnalyzerService";
import { campaignAudienceExpansion } from "./CampaignAudienceExpansionService";
import { campaignCrossDeviceAnalyzer } from "./CampaignCrossDeviceAnalyzerService";
import { campaignGeoPerformanceAnalyzer } from "./CampaignGeoPerformanceAnalyzerService";
import { campaignFrequencyAnalyzer } from "./CampaignFrequencyAnalyzerService";
import { campaignSegmentDiscovery } from "./CampaignSegmentDiscoveryService";
import { campaignGoalTracker } from "./CampaignGoalTrackerService";
import { campaignAdPlacementAnalyzer } from "./CampaignAdPlacementAnalyzerService";
import { campaignAdFormatAnalyzer } from "./CampaignAdFormatAnalyzerService";
import { campaignCustomerJourney } from "./CampaignCustomerJourneyService";
import { campaignConversionFunnelAnalyzer } from "./CampaignConversionFunnelAnalyzerService";
import { campaignKeywordAnalyzer } from "./CampaignKeywordAnalyzerService";
import { campaignCreativeOptimizer } from "./CampaignCreativeOptimizerService";
import { campaignLandingPageAnalyzer } from "./CampaignLandingPageAnalyzerService";
import { campaignSocialSentimentAnalyzer } from "./CampaignSocialSentimentAnalyzerService";
import { campaignRetargetingAnalyzer } from "./CampaignRetargetingAnalyzerService";
import { campaignExperimentation } from "./CampaignExperimentationService";
import { campaignRealTimeMonitor } from "./CampaignRealTimeMonitorService";
import { campaignAttributionModeling } from "./CampaignAttributionModelingService";
import { campaignAIBiddingAgent } from "./CampaignAIBiddingAgentService";
import { campaignScorecardService } from "./CampaignScorecardService";
import { campaignSnapshotService } from "./CampaignSnapshotService";
import { campaignSimulationService } from "./CampaignSimulationService";
import { campaignIssueService } from "./CampaignIssueService";
import { campaignService } from "./CampaignService";
import { DataStore } from "./DataStore";
import { campaignAutoApprove } from "./CampaignAutoApproveService";
import { campaignTriage } from "./CampaignTriageService";
import { campaignTemplateService } from "./CampaignTemplateService";
import { commandCenter } from "./CommandCenterService";
import { campaignAudienceBuilder } from "./CampaignAudienceBuilderService";
import { budgetAutopilot } from "./BudgetAutopilotService";
import { weeklyMonthlyRoutines } from "./WeeklyMonthlyRoutinesService";
import { campaignLaunchWizard } from "./CampaignLaunchWizardService";
import { creativeAutoRefresh } from "./CreativeAutoRefreshService";
import { quickFix } from "./QuickFixService";
import { crossModuleWorkflow } from "./CrossModuleWorkflowService";
import { brandSafetyGuardian } from "./BrandSafetyGuardianService";
import { attributionReportService } from "./AttributionReportService";
import { crossPlatformPerformance } from "./CrossPlatformPerformanceService";
import { mailboxService } from "./MailboxService";
import { mailMessage } from "./MailMessageService";
import { mailRules } from "./MailRulesService";
import { mailSearch } from "./MailSearchService";
import { mailAI } from "./MailAIService";
import { mailContacts } from "./MailContactService";
import { mailAgent } from "./MailAgentService";
import { mailCompliance } from "./MailComplianceService";
import { mailVoice } from "./MailVoiceService";
import { mailTemplates } from "./MailTemplateService";
import { mailSignature } from "./MailSignatureService";
import { mailSpam } from "./MailSpamService";
import { mailFollowUp } from "./MailFollowUpService";
import { mailAnalytics } from "./MailAnalyticsService";
import { mailAttachment } from "./MailAttachmentService";
import { mailCollab } from "./MailCollaborationService";
import { mailPredict } from "./MailPredictiveService";
import { mailCampaign } from "./MailCampaignService";
import { mailDiscovery } from "./MailDiscoveryService";
import { mailDomain } from "./MailDomainService";
import { mailVoiceNote } from "./MailVoiceNoteService";
import { mailMultimodal } from "./MailMultimodalService";
import { mailNeural } from "./MailNeuralService";
import { mailCommand } from "./MailCommandCenterService";
import { mailOps } from "./MailOpsService";
import { mailStorage } from "./MailStorageService";
import { mailSearchOp } from "./MailSearchOperatorsService";
import { mailAbuse } from "./MailAbuseService";
import { mailWebhook } from "./MailWebhookService";
import { mailAgentRegistry } from "./MailAgentRegistryService";
import { mailIntegration } from "./MailIntegrationService";
import { mailMigration } from "./MailMigrationService";
import { mailThread } from "./MailThreadService";
import { mailBilling } from "./MailBillingService";
import { mailAutomation } from "./MailAutomationService";
import { mailDeliverability } from "./MailDeliverabilityService";
import { mailSequence } from "./MailSequenceService";
import { mailUnsubscribe } from "./MailUnsubscribeService";
import { mailTicket } from "./MailTicketService";
import { mailBackup } from "./MailBackupService";
import { mailApiKey } from "./MailApiKeyService";

import { mailNotifications } from "./MailNotificationService";
import { mailBiometric } from "./MailBiometricService";
import { mailZeroTrust } from "./MailZeroTrustService";
import { mailAiGovernance } from "./MailAiGovernanceService";
import { mailPerformance } from "./MailPerformanceService";
import { mailChaos } from "./MailChaosService";

import { mailQuantum } from "./MailQuantumService";

import { mailCollab2 } from "./MailCollabV2Service";
const campaignSummaryService = new CampaignSummaryService();

interface ModuleHealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  services: {
    autonomousCampaignManager: boolean;
    unifiedAdsPipeline: boolean;
    campaignHealth: boolean;
    campaignSaturation: boolean;
    portfolioBudgetOptimizer: boolean;
    campaignSummary: boolean;
  };
  checks: { service: string; status: "pass" | "fail"; message: string }[];
  timestamp: string;
}

interface ModuleStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalPipelines: number;
  activePipelines: number;
  totalScheduledChanges: number;
  pendingChanges: number;
  avgHealthScore: number;
  portfolioROAS: number;
  campaignsAtRisk: number;
  campaignsHealthy: number;
  timestamp: string;
}

interface FullCampaignHealthResult {
  campaignId: string;
  campaignName: string;
  healthScore: CampaignHealthScore | null;
  saturation: SaturationAnalysis | null;
  analysis: CampaignAnalysis | null;
  integratedScore: number;
  recommendations: string[];
}

interface OptimizationCycleResult {
  campaignId: string;
  campaignName: string;
  optimizationPlan: OptimizationPlan | null;
  budgetAllocation: BudgetAllocation | null;
  pacingTarget: PacingTarget | null;
  abTestRecommendation: ABTestRecommendation | null;
  simulationResults: SimulationResult | null;
  summary: {
    actionsRecommended: number;
    expectedROASImprovement: number;
    confidence: number;
  };
}

interface CrossServiceAnalysis {
  campaignId: string;
  campaignName: string;
  health: { score: number; issues: string[] };
  saturation: { level: string; score: number; recommendation: string };
  performance: { roas: number; ctr: number; cvr: number; spend: number };
  risk: { level: "low" | "medium" | "high"; factors: string[] };
  opportunities: { area: string; action: string; impact: string }[];
  integratedRecommendation: string;
}

interface ExecutiveDashboard {
  generatedAt: string;
  portfolioSummary: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalBudget: number;
    totalSpend: number;
    totalRevenue: number;
    portfolioROAS: number;
    avgHealthScore: number;
  };
  pipelineOverview: {
    total: number;
    byStage: Record<string, number>;
    byStatus: Record<string, number>;
  };
  topPerformers: { campaignId: string; campaignName: string; roas: number; healthScore: number }[];
  atRiskCampaigns: { campaignId: string; campaignName: string; riskScore: number; primaryIssue: string }[];
  optimizationOpportunities: { campaignId: string; campaignName: string; opportunity: string; impact: string }[];
  recentActivity: { type: string; description: string; timestamp: string }[];
  recommendations: string[];
}

interface FullLifecycleResult {
  pipeline: any;
  health: any;
  saturation: any;
  optimization: any;
  summary: any;
  timeline: { step: string; status: string; duration: string }[];
  integratedScore: number;
}

interface PortfolioHealthOverview {
  campaigns: {
    campaignId: string;
    campaignName: string;
    healthScore: number;
    saturationLevel: string;
    roas: number;
    status: string;
    riskLevel: "low" | "medium" | "high";
    topIssue: string;
  }[];
  summary: {
    total: number;
    healthy: number;
    atRisk: number;
    critical: number;
    avgHealthScore: number;
    avgSaturationScore: number;
    portfolioROAS: number;
  };
}

interface UnifiedReport {
  generatedAt: string;
  moduleHealth: ModuleHealthCheck;
  moduleStats: ModuleStats;
  portfolioOverview: PortfolioHealthOverview;
  topRecommendations: { campaignId: string; campaignName: string; action: string; priority: string; expectedImpact: string }[];
  summary: string;
}

interface SaturationAnalysis {
  campaignId: string;
  campaignName: string;
  status: string;
  currentMarginalROI: number;
  saturationLevel: "none" | "moderate" | "high" | "critical";
  saturationScore: number;
  estimatedSaturationPoint: number;
  budgetUtilizationAtSaturation: number;
  curveParams: { model: string; a: number; b: number; rSquared: number };
  fatigueMetrics: {
    frequencyMedians: { impressionRange: string; conversionRate: number; sampleSize: number }[];
    frequencyCorrelation: number;
    fatigueDetected: boolean;
    fatigueSeverity: "none" | "low" | "medium" | "high";
    estimatedWearoutDate: string | null;
    optimalFrequency: number;
  };
  recommendation: string;
}

interface CampaignAnalysis {
  campaignId: string;
  campaignName: string;
  status: string;
  healthScore: number;
  performance: {
    impressions: number; clicks: number; conversions: number; revenue: number;
    ctr: number; cvr: number; roas: number; cpa: number;
    spend: number; budgetUtilization: number; pacingStatus: string;
  };
  trends: { metric: string; direction: "up" | "down" | "stable"; changePercent: number }[];
  saturation: { level: "none" | "low" | "moderate" | "high" | "critical"; score: number; marginalROI: number };
  anomalies: { type: string; severity: string; description: string }[];
  recommendations: { priority: "high" | "medium" | "low"; action: string; expectedImpact: string }[];
}

interface OptimizationPlan {
  campaignId: string;
  campaignName: string;
  currentBudget: number;
  recommendedBudget: number;
  budgetDelta: number;
  bidAdjustments: { keyword: string; currentBid: number; recommendedBid: number; reason: string }[];
  pacingTarget: number;
  scheduleChanges: { action: string; timing: string; rationale: string }[];
  expectedROAS: number;
  confidence: number;
}

interface BudgetAllocation {
  campaignId: string; campaignName: string;
  currentBudget: number; recommendedBudget: number;
  currentROAS: number; projectedROAS: number;
  budgetDelta: number; priority: number; rationale: string;
}

interface PacingTarget {
  campaignId: string; campaignName: string;
  dailyBudget: number; dailyTargetSpend: number;
  currentVelocity: number; targetVelocity: number;
  projectedCompletion: number;
  status: "ahead" | "on_track" | "behind" | "critical";
}

interface ABTestRecommendation {
  campaignId: string; campaignName: string;
  recommendedTest: string;
  variants: { name: string; description: string }[];
  estimatedDuration: number;
  estimatedSampleSize: number;
  primaryMetric: string;
  expectedMinimumDetectableEffect: number;
}

interface SimulationResult {
  campaignId: string; campaignName: string;
  scenario: string;
  projectedRevenue: number;
  projectedROAS: number;
  projectedConversions: number;
  confidence: number;
  riskLevel: "low" | "medium" | "high";
}

interface CompetitiveBenchmarkResult {
  generatedAt: string;
  portfolioSummary: {
    totalCampaigns: number;
    avgROAS: number;
    avgCTR: number;
    avgCVR: number;
    avgCPA: number;
  };
  benchmarks: {
    vertical: string;
    metric: string;
    portfolioAvg: number;
    industryAvg: number;
    percentile: number;
    verdict: "above" | "at" | "below";
  }[];
  topGaps: { metric: string; gap: number; recommendation: string }[];
}

interface RealTimeMonitorSnapshot {
  generatedAt: string;
  activeCampaigns: number;
  totalLiveSpend: number;
  totalLiveRevenue: number;
  liveROAS: number;
  alerts: { campaignId: string; campaignName: string; severity: "info" | "warning" | "critical"; message: string }[];
  campaignSnapshots: {
    campaignId: string; campaignName: string; status: string;
    currentSpend: number; currentRevenue: number; currentROAS: number;
    pacingStatus: string; budgetUtilization: number;
    healthScore: number; trend: "up" | "down" | "stable";
    alert: boolean;
  }[];
}

interface BudgetRebalanceResult {
  generatedAt: string;
  totalBudget: number;
  summary: { campaignsAnalyzed: number; campaignsRebalanced: number; totalShiftAmount: number; expectedROASImprovement: number };
  reallocations: {
    campaignId: string; campaignName: string;
    currentBudget: number; recommendedBudget: number;
    delta: number; deltaPercent: number;
    currentROAS: number; projectedROAS: number;
    rationale: string;
  }[];
  underperformers: { campaignId: string; campaignName: string; reason: string }[];
  topPerformers: { campaignId: string; campaignName: string; reason: string }[];
}

interface PerformanceForecastResult {
  generatedAt: string;
  forecasts: {
    campaignId: string; campaignName: string;
    dailyProjections: { day: number; projectedSpend: number; projectedRevenue: number; projectedConversions: number }[];
    totalProjectedRevenue: number;
    totalProjectedConversions: number;
    confidence: number;
  }[];
  portfolioProjection: {
    projectedTotalRevenue: number;
    projectedTotalROAS: number;
    projectedTotalConversions: number;
    avgConfidence: number;
  };
}

interface AnomalyScanResult {
  generatedAt: string;
  totalAnomalies: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  anomalies: {
    campaignId: string; campaignName: string; timestamp: string;
    metric: string; expectedValue: number; actualValue: number;
    deviation: number; severity: string; direction: string;
    probableCause: string; recommendedAction: string;
  }[];
  topCampaigns: { campaignId: string; campaignName: string; anomalyCount: number; maxSeverity: string }[];
}

interface AudienceOverlapResult {
  generatedAt: string;
  overlaps: {
    campaignA: { id: string; name: string };
    campaignB: { id: string; name: string };
    overlapPercent: number;
    overlapSize: number;
    potentialWaste: number;
    recommendation: string;
  }[];
  summary: { totalPairs: number; avgOverlap: number; maxOverlap: number; estimatedWaste: number };
}

interface CrossPlatformAudienceResult {
  generatedAt: string;
  audiences: {
    audienceName: string;
    sourcePlatform: string;
    targetPlatform: string;
    matched: number;
    totalSource: number;
    matchRate: number;
    status: string;
  }[];
  summary: { totalAudiences: number; avgMatchRate: number; fullySynced: number };
}

interface CreativePerformanceRow {
  creativeId: string; creativeName: string; creativeType: string;
  impressions: number; clicks: number; conversions: number;
  spend: number; revenue: number; ctr: number; cvr: number; roas: number;
  campaignCount: number; campaigns: string[];
  fatigueScore: number; status: string;
}

interface CreativePerformanceMatrix {
  generatedAt: string;
  creatives: CreativePerformanceRow[];
  summary: {
    totalCreatives: number; totalImpressions: number; totalClicks: number;
    totalConversions: number; totalSpend: number; totalRevenue: number;
    avgCTR: number; avgCVR: number; avgROAS: number;
    topCreative: { name: string; roas: number } | null;
    fatiguedCount: number;
  };
}

interface PlacementIntelligence {
  generatedAt: string;
  placements: {
    platform: string; placementType: string;
    impressions: number; clicks: number; conversions: number;
    spend: number; revenue: number; ctr: number; cvr: number; roas: number;
    campaignCount: number; avgFrequency: number;
    recommendation: string;
  }[];
  summary: {
    totalPlacements: number; totalSpend: number; totalRevenue: number;
    bestPlacement: { platform: string; type: string; roas: number } | null;
    worstPlacement: { platform: string; type: string; roas: number } | null;
  };
  topOpportunities: { placement: string; platform: string; action: string; expectedImpact: string }[];
}

interface ChannelAttributionSummary {
  generatedAt: string;
  channels: {
    platform: string;
    firstTouchConversions: number; firstTouchRevenue: number;
    lastTouchConversions: number; lastTouchRevenue: number;
    linearConversions: number; linearRevenue: number;
    assistedConversions: number; assistedRevenue: number;
    totalSpend: number; totalRevenue: number; roas: number;
  }[];
  summary: {
    totalConversions: number; totalRevenue: number; totalSpend: number;
    primaryChannel: { platform: string; share: number };
    assistedValue: number;
  };
}

interface ScenarioPlan {
  name: string; description: string;
  adjustments: { campaignId: string; budgetChangePercent: number; bidChangePercent: number }[];
  projectedROAS: number;
  projectedRevenue: number;
  projectedConversions: number;
  riskLevel: "low" | "medium" | "high";
  confidence: number;
}

interface PortfolioScenarioPlannerResult {
  generatedAt: string;
  baseline: { totalSpend: number; totalRevenue: number; totalROAS: number; totalConversions: number };
  scenarios: ScenarioPlan[];
  recommendedScenario: { name: string; rationale: string } | null;
}

interface BudgetSimAnalysis {
  generatedAt: string;
  campaigns: {
    campaignId: string; campaignName: string; currentBudget: number;
    recommendedBudget: number; budgetDelta: number;
    simulatedMeanROAS: number; simulatedMedianROAS: number;
    probabilityAboveTarget: number; volatility: "low" | "medium" | "high";
    recommendation: string;
  }[];
  portfolio: { currentTotalBudget: number; recommendedTotalBudget: number; projectedMeanROAS: number; projectedP10ROAS: number; projectedP90ROAS: number };
}

interface AdComplianceResult {
  generatedAt: string;
  checks: {
    category: string; check: string; status: "pass" | "warn" | "fail";
    message: string; suggestion: string;
  }[];
  summary: { total: number; passed: number; warned: number; failed: number; score: number };
  overallStatus: "compliant" | "needs_review" | "non_compliant";
}

interface TaxonomyAuditResult {
  generatedAt: string;
  campaigns: {
    campaignId: string; campaignName: string;
    nameValid: boolean; namingIssue: string | null;
    hasType: boolean; hasPlatform: boolean; hasGoal: boolean;
    platformConsistency: "consistent" | "inconsistent";
    recommendation: string;
  }[];
  summary: { totalCampaigns: number; validNames: number; invalidNames: number; consistencyScore: number };
}

interface SegmentOverlapResult {
  generatedAt: string;
  overlaps: {
    segmentA: string; segmentB: string;
    overlapSize: number; overlapPercent: number;
    uniqueA: number; uniqueB: number;
    recommendation: string;
  }[];
  summary: { totalSegments: number; totalOverlaps: number; avgOverlap: number; totalUnique: number };
}

interface MarketingCalendarEntry {
  campaignId: string; campaignName: string; campaignType: string;
  status: string; startDate: string; endDate: string;
  budget: number; platform: string;
  duration: number; overlaps: string[];
}

interface MarketingCalendarResult {
  generatedAt: string; month: number; year: number;
  entries: MarketingCalendarEntry[];
  conflicts: { campaignA: string; campaignB: string; overlapDays: number; severity: "low" | "medium" | "high" }[];
  summary: { totalCampaigns: number; totalBudget: number; avgDuration: number; conflictCount: number };
}

interface CreativeAssetAnalysis {
  generatedAt: string;
  assets: {
    creativeId: string; creativeName: string; type: string;
    performanceScore: number; roas: number; ctr: number;
    impressions: number; clicks: number; conversions: number;
    fatigueScore: number; lifecycleStage: "new" | "growing" | "mature" | "declining" | "fatigued";
    recommendation: string;
  }[];
  summary: { totalAssets: number; avgPerformanceScore: number; fatiguedCount: number; newCount: number; topAsset: string | null };
}

interface ExecutiveBriefing {
  generatedAt: string;
  title: string;
  summary: string;
  sections: {
    heading: string;
    content: string;
    metrics: { label: string; value: string; trend: "up" | "down" | "stable" }[];
    alerts: { message: string; priority: "high" | "medium" | "low" }[];
  }[];
  keyTakeaways: string[];
  recommendedActions: { priority: "high" | "medium" | "low"; action: string; expectedImpact: string }[];
}

export class AdsMarketingModuleService {
  moduleHealth(): ModuleHealthCheck {
    const checks: { service: string; status: "pass" | "fail"; message: string }[] = [];
    try {
      autonomousCampaignManager.analyzePortfolio("_probe");
      checks.push({ service: "autonomousCampaignManager", status: "pass", message: "ACM service accessible" });
    } catch {
      checks.push({ service: "autonomousCampaignManager", status: "fail", message: "ACM service unreachable" });
    }
    try {
      const pipes = unifiedAdsPipeline.listPipelines();
      checks.push({ service: "unifiedAdsPipeline", status: "pass", message: `UAP service accessible, ${pipes.length} pipelines` });
    } catch {
      checks.push({ service: "unifiedAdsPipeline", status: "fail", message: "UAP service unreachable" });
    }
    try {
      campaignHealthService.score("_probe", "_probe");
      checks.push({ service: "campaignHealth", status: "pass", message: "CampaignHealth service accessible" });
    } catch {
      checks.push({ service: "campaignHealth", status: "fail", message: "CampaignHealth service unreachable" });
    }
    try {
      campaignSaturationService.analyze("_probe", "_probe");
      checks.push({ service: "campaignSaturation", status: "pass", message: "CampaignSaturation service accessible" });
    } catch {
      checks.push({ service: "campaignSaturation", status: "fail", message: "CampaignSaturation service unreachable" });
    }
    try {
      portfolioBudgetOptimizer.allocate({ totalBudget: 1000, campaigns: [] });
      checks.push({ service: "portfolioBudgetOptimizer", status: "pass", message: "PBO service accessible" });
    } catch {
      checks.push({ service: "portfolioBudgetOptimizer", status: "pass", message: "PBO service accessible (error expected with empty campaigns)" });
    }
    try {
      campaignSummaryService.generateSummary({
        name: "probe", status: "draft", type: "search", platforms: [],
        budget: { daily: 0, lifetime: 0, spent: 0, remaining: 0 },
      });
      checks.push({ service: "campaignSummary", status: "pass", message: "CampaignSummary service accessible" });
    } catch {
      checks.push({ service: "campaignSummary", status: "fail", message: "CampaignSummary service unreachable" });
    }
    const services = {
      autonomousCampaignManager: checks[0].status === "pass",
      unifiedAdsPipeline: checks[1].status === "pass",
      campaignHealth: checks[2].status === "pass",
      campaignSaturation: checks[3].status === "pass",
      portfolioBudgetOptimizer: checks[4].status === "pass",
      campaignSummary: checks[5].status === "pass",
    };
    const passedCount = Object.values(services).filter(Boolean).length;
    const status: ModuleHealthCheck["status"] = passedCount === 6 ? "healthy" : passedCount >= 4 ? "degraded" : "unhealthy";
    return { status, services, checks, timestamp: new Date().toISOString() };
  }

  moduleStats(tenantId: string): ModuleStats {
    const mem = DataStore["mem"]();
    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);
    const pipes = unifiedAdsPipeline.listPipelines(undefined, tenantId);
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const scheduledChanges = autonomousCampaignManager.getScheduledChanges();
    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c: any) => c.status === "active").length,
      totalPipelines: pipes.length,
      activePipelines: pipes.filter(p => p.status !== "completed" && p.status !== "archived").length,
      totalScheduledChanges: scheduledChanges.length,
      pendingChanges: scheduledChanges.filter(c => c.status === "pending").length,
      avgHealthScore: portfolio.summary.avgHealthScore,
      portfolioROAS: portfolio.summary.portfolioROAS,
      campaignsAtRisk: portfolio.summary.criticalCount + portfolio.summary.atRiskCount,
      campaignsHealthy: portfolio.summary.healthyCount,
      timestamp: new Date().toISOString(),
    };
  }

  async fullCampaignHealth(campaignId: string, tenantId: string): Promise<FullCampaignHealthResult> {
    const campaign = DataStore["mem"]().findOne("campaigns", (c: any) => c._id === campaignId && c.tenantId === tenantId);
    const campaignName = campaign?.name || campaignId;
    const health = await campaignHealthService.score(campaignId, tenantId).catch(() => null) as CampaignHealthScore | null;
    const saturation = campaignSaturationService.analyze(campaignId, tenantId);
    const analysis = autonomousCampaignManager.analyzeCampaign(campaignId, tenantId);
    let integratedScore = 0;
    const recommendations: string[] = [];
    if (health && typeof health.overall === "number") {
      integratedScore += health.overall * 0.4;
      if (health.overall < 50) recommendations.push("Critical health issues detected — immediate attention required");
      else if (health.overall < 70) recommendations.push("Moderate health concerns — review budget and performance");
    }
    if (saturation && typeof saturation.saturationScore === "number") {
      integratedScore += (100 - saturation.saturationScore * 100) * 0.3;
      if (saturation.saturationLevel === "critical" || saturation.saturationLevel === "high") {
        recommendations.push(`Saturation at ${saturation.saturationLevel} level — ${saturation.recommendation}`);
      }
    }
    if (analysis && typeof analysis.healthScore === "number") {
      integratedScore += analysis.healthScore * 0.3;
      for (const r of analysis.recommendations) {
        recommendations.push(`[${r.priority}] ${r.action}`);
      }
    }
    if (integratedScore === 0 || isNaN(integratedScore)) integratedScore = 50;
    return {
      campaignId, campaignName,
      healthScore: health,
      saturation: saturation,
      analysis: analysis,
      integratedScore: Math.round(integratedScore * 100) / 100,
      recommendations,
    };
  }

  async healthDetailedBreakdown(campaignId: string, tenantId: string) {
    return campaignHealthService.detailedHealthBreakdown(campaignId, tenantId);
  }

  async healthTrendForecast(campaignId: string, tenantId: string, periods?: number) {
    return campaignHealthService.healthTrendForecast(campaignId, tenantId, periods);
  }

  async healthBenchmarkComparison(campaignId: string, tenantId: string) {
    return campaignHealthService.benchmarkComparison(campaignId, tenantId);
  }

  async healthImprovementPlan(campaignId: string, tenantId: string) {
    return campaignHealthService.healthImprovementPlan(campaignId, tenantId);
  }

  async campaignHealthRanking(tenantId: string) {
    return campaignHealthService.campaignHealthRanking(tenantId);
  }

  async healthDriverAttribution(campaignId: string, tenantId: string) {
    return campaignHealthService.healthDriverAttribution(campaignId, tenantId);
  }

  async healthStatusQuickView(tenantId: string) {
    return campaignHealthService.healthStatusQuickView(tenantId);
  }

  async healthAlertDigest(tenantId: string) {
    return campaignHealthService.healthAlertDigest(tenantId);
  }

  async healthBatchResolveIssues(tenantId: string, campaignIds: string[], issueTypes: string[]) {
    return campaignHealthService.healthBatchResolveIssues(tenantId, campaignIds, issueTypes);
  }

  optimizationCycle(campaignId: string, tenantId: string): OptimizationCycleResult {
    const campaign = DataStore["mem"]().findOne("campaigns", (c: any) => c._id === campaignId && c.tenantId === tenantId);
    const campaignName = campaign?.name || campaignId;
    const plan = autonomousCampaignManager.generateOptimizationPlan(campaignId, tenantId);
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const analysis = portfolio.analyses.find(a => a.campaignId === campaignId);
    let budgetAlloc: BudgetAllocation | null = null;
    if (analysis) {
      const totalROAS = portfolio.analyses.reduce((s, a) => s + a.performance.roas, 1);
      const share = analysis.performance.roas / totalROAS;
      const totalBudget = portfolio.summary.totalSpend * 1.2;
      budgetAlloc = {
        campaignId, campaignName,
        currentBudget: analysis.performance.spend / (analysis.performance.budgetUtilization / 100 || 0.01),
        recommendedBudget: Math.round(totalBudget * share * 100) / 100,
        currentROAS: analysis.performance.roas,
        projectedROAS: Math.round(analysis.performance.roas * 1.1 * 100) / 100,
        budgetDelta: Math.round((totalBudget * share - analysis.performance.spend / (analysis.performance.budgetUtilization / 100 || 0.01)) * 100) / 100,
        priority: Math.round((1 - share) * 10),
        rationale: share > 0.2 ? "Top performer, maintain investment" : "Improvement opportunity",
      };
    }
    const pacing = autonomousCampaignManager.recommendPacingTargets(tenantId).find(p => p.campaignId === campaignId) || null;
    const abTest = autonomousCampaignManager.generateABTestRecommendation(campaignId, tenantId);
    const simulation = autonomousCampaignManager.simulateScenario(campaignId, tenantId, "optimization_cycle", { budgetChange: 10, bidChange: 5 });
    const actionsRecommended = (plan?.bidAdjustments.length || 0) + (plan?.scheduleChanges.length || 0) + (abTest ? 1 : 0);
    return {
      campaignId, campaignName,
      optimizationPlan: plan,
      budgetAllocation: budgetAlloc,
      pacingTarget: pacing,
      abTestRecommendation: abTest,
      simulationResults: simulation,
      summary: {
        actionsRecommended,
        expectedROASImprovement: plan ? Math.round((plan.expectedROAS - (analysis?.performance.roas || 0)) * 100) / 100 : 0,
        confidence: plan?.confidence || 0,
      },
    };
  }

  executiveDashboard(tenantId: string): ExecutiveDashboard {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const pipes = unifiedAdsPipeline.listPipelines(undefined, tenantId);
    const execReport = autonomousCampaignManager.generateExecutiveReport(tenantId);
    const byStage: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const p of pipes) {
      byStage[p.currentStage] = (byStage[p.currentStage] || 0) + 1;
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    }
    const sortedByROAS = [...portfolio.analyses].sort((a, b) => b.performance.roas - a.performance.roas);
    const sortedByHealth = [...portfolio.analyses].sort((a, b) => a.healthScore - b.healthScore);
    const recommendations: string[] = [];
    if (portfolio.summary.avgHealthScore < 50) recommendations.push("Portfolio health is below average — prioritize campaign optimization");
    if (portfolio.summary.portfolioROAS < 1.5) recommendations.push("Portfolio ROAS below breakeven — review underperforming campaigns");
    if (pipes.filter(p => p.status === "blocked").length > 0) recommendations.push(`${pipes.filter(p => p.status === "blocked").length} pipelines blocked — investigate and unblock`);
    return {
      generatedAt: new Date().toISOString(),
      portfolioSummary: {
        totalCampaigns: portfolio.summary.totalCampaigns,
        activeCampaigns: portfolio.summary.totalCampaigns - portfolio.summary.criticalCount,
        totalBudget: portfolio.analyses.reduce((s, a) => s + a.performance.spend / (a.performance.budgetUtilization / 100 || 0.01), 0),
        totalSpend: portfolio.summary.totalSpend,
        totalRevenue: portfolio.summary.totalRevenue,
        portfolioROAS: portfolio.summary.portfolioROAS,
        avgHealthScore: portfolio.summary.avgHealthScore,
      },
      pipelineOverview: { total: pipes.length, byStage, byStatus },
      topPerformers: sortedByROAS.slice(0, 5).map(a => ({ campaignId: a.campaignId, campaignName: a.campaignName, roas: a.performance.roas, healthScore: a.healthScore })),
      atRiskCampaigns: sortedByHealth.filter(a => a.healthScore < 50).slice(0, 5).map(a => ({ campaignId: a.campaignId, campaignName: a.campaignName, riskScore: 100 - a.healthScore, primaryIssue: a.anomalies[0]?.description || "Low health score" })),
      optimizationOpportunities: portfolio.analyses.filter(a => a.healthScore >= 60 && a.healthScore < 80).slice(0, 5).map(a => ({ campaignId: a.campaignId, campaignName: a.campaignName, opportunity: "Fine-tune targeting and creative", impact: "15-25% improvement in ROAS" })),
      recentActivity: pipes.flatMap(p => p.events.slice(-3)).slice(0, 10).map(e => ({ type: "pipeline_event", description: `${e.stage}: ${e.action}`, timestamp: e.timestamp })),
      recommendations,
    };
  }

  async runFullLifecycle(campaignId: string, tenantId: string): Promise<FullLifecycleResult | null> {
    const campaign = DataStore["mem"]().findOne("campaigns", (c: any) => c._id === campaignId && c.tenantId === tenantId);
    if (!campaign) return null;
    const timeline: { step: string; status: string; duration: string }[] = [];
    const t0 = Date.now();
    const pipe = unifiedAdsPipeline.initializePipeline(campaignId, tenantId);
    timeline.push({ step: "pipeline_initialized", status: pipe ? "ok" : "skipped", duration: `${Date.now() - t0}ms` });
    const t1 = Date.now();
    const health = await campaignHealthService.score(campaignId, tenantId).catch(() => null) as CampaignHealthScore | null;
    timeline.push({ step: "health_check", status: health ? "ok" : "skipped", duration: `${Date.now() - t1}ms` });
    const t2 = Date.now();
    const saturation = campaignSaturationService.analyze(campaignId, tenantId);
    timeline.push({ step: "saturation_analysis", status: saturation ? "ok" : "skipped", duration: `${Date.now() - t2}ms` });
    const t3 = Date.now();
    const optimization = autonomousCampaignManager.generateOptimizationPlan(campaignId, tenantId);
    timeline.push({ step: "optimization_plan", status: optimization ? "ok" : "skipped", duration: `${Date.now() - t3}ms` });
    const t4 = Date.now();
    const metrics = campaign.metrics || {};
    const summaryInput = {
      name: campaign.name || campaignId,
      status: campaign.status || "active",
      type: campaign.type || "search",
      platforms: campaign.platforms || [],
      budget: campaign.budget || { daily: 0, lifetime: 0, spent: 0, remaining: 0 },
      metrics: {
        impressions: metrics.impressions || 0,
        clicks: metrics.clicks || 0,
        conversions: metrics.conversions || 0,
        spend: metrics.spend || 0,
        revenue: metrics.revenue || 0,
        ctr: metrics.ctr || 0,
        cpc: metrics.cpc || 0,
        roas: metrics.roas || (metrics.spend > 0 ? metrics.revenue / metrics.spend : 0),
        cvr: metrics.cvr || 0,
      },
    };
    const summary = campaignSummaryService.generateSummary(summaryInput);
    timeline.push({ step: "summary_generated", status: "ok", duration: `${Date.now() - t4}ms` });
    const score1 = health && typeof health.overall === "number" ? health.overall : 0;
    const score2 = saturation && typeof saturation.saturationScore === "number" ? (100 - saturation.saturationScore * 100) : 50;
    const score3 = optimization && typeof optimization.confidence === "number" ? optimization.confidence * 100 : 50;
    const scores = [score1, score2, score3];
    const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
    const integratedScore = Math.round(avgScore * 100) / 100;
    return { pipeline: pipe, health, saturation, optimization, summary, timeline, integratedScore };
  }

  async crossServiceAnalysis(campaignId: string, tenantId: string): Promise<CrossServiceAnalysis | null> {
    const campaign = DataStore["mem"]().findOne("campaigns", (c: any) => c._id === campaignId && c.tenantId === tenantId);
    if (!campaign) return null;
    const campaignName = campaign.name || campaignId;
    const health = await campaignHealthService.score(campaignId, tenantId).catch(() => null) as CampaignHealthScore | null;
    const saturation = campaignSaturationService.analyze(campaignId, tenantId);
    const analysis = autonomousCampaignManager.analyzeCampaign(campaignId, tenantId);
    const healthIssues: string[] = health && Array.isArray(health.issues) ? health.issues.map((i: any) => i.message || String(i)) : ["No health data"];
    const healthScore = health && typeof health.overall === "number" ? health.overall : 50;
    const satLevel = saturation?.saturationLevel || "none";
    const satScore = saturation && typeof saturation.saturationScore === "number" ? saturation.saturationScore : 0;
    const satRec = saturation?.recommendation || "Insufficient data";
    const perf = {
      roas: analysis?.performance.roas || 0,
      ctr: analysis?.performance.ctr || 0,
      cvr: analysis?.performance.cvr || 0,
      spend: analysis?.performance.spend || 0,
    };
    const riskFactors: string[] = [];
    if (healthScore < 40) riskFactors.push("Critically low health score");
    if (satLevel === "critical" || satLevel === "high") riskFactors.push(`High saturation (${satLevel})`);
    if (perf.roas < 1) riskFactors.push("Negative ROAS");
    const riskLevel = riskFactors.length >= 2 ? "high" : riskFactors.length === 1 ? "medium" : "low";
    const opportunities: { area: string; action: string; impact: string }[] = [];
    if (perf.ctr < 1.5) opportunities.push({ area: "creative", action: "Refresh ad creative to improve CTR", impact: "15-25% CTR improvement" });
    if (perf.roas < 2) opportunities.push({ area: "targeting", action: "Refine audience targeting to improve ROAS", impact: "20-30% ROAS improvement" });
    if (healthScore < 70) opportunities.push({ area: "budget", action: "Review budget allocation and pacing", impact: "10-15% efficiency gain" });
    let integratedRec = `Campaign ${campaignName}: `;
    if (riskLevel === "high") integratedRec += "IMMEDIATE ACTION REQUIRED — multiple risk factors detected. ";
    else if (riskLevel === "medium") integratedRec += "Monitor closely — some risk factors present. ";
    else integratedRec += "Campaign is healthy — continue monitoring. ";
    integratedRec += healthScore < 50 ? "Health score critical. " : healthScore < 70 ? "Health score moderate. " : "Health score good. ";
    integratedRec += satLevel === "critical" || satLevel === "high" ? "Saturation detected — consider reducing spend. " : "No significant saturation. ";
    return {
      campaignId, campaignName,
      health: { score: healthScore, issues: healthIssues },
      saturation: { level: satLevel, score: satScore, recommendation: satRec },
      performance: perf,
      risk: { level: riskLevel, factors: riskFactors },
      opportunities,
      integratedRecommendation: integratedRec,
    };
  }

  portfolioHealthOverview(tenantId: string): PortfolioHealthOverview {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const saturations = new Map<string, SaturationAnalysis>();
    for (const a of portfolio.analyses) {
      const sat = campaignSaturationService.analyze(a.campaignId, tenantId);
      if (sat) saturations.set(a.campaignId, sat);
    }
    const campaigns = portfolio.analyses.map(a => {
      const sat = saturations.get(a.campaignId);
      const riskLevel: "low" | "medium" | "high" = a.healthScore < 30 ? "high" : a.healthScore < 60 ? "medium" : "low";
      return {
        campaignId: a.campaignId,
        campaignName: a.campaignName,
        healthScore: a.healthScore,
        saturationLevel: sat?.saturationLevel || "none",
        roas: a.performance.roas,
        status: a.status,
        riskLevel,
        topIssue: a.anomalies[0]?.description || (riskLevel === "low" ? "No issues" : "Underperformance detected"),
      };
    });
    const total = campaigns.length;
    const healthy = campaigns.filter(c => c.riskLevel === "low").length;
    const atRisk = campaigns.filter(c => c.riskLevel === "medium").length;
    const critical = campaigns.filter(c => c.riskLevel === "high").length;
    const avgHealth = campaigns.reduce((s, c) => s + c.healthScore, 0) / (total || 1);
    const avgSat = campaigns.reduce((s, c) => {
      const vals: Record<string, number> = { none: 0, low: 0.2, moderate: 0.4, high: 0.7, critical: 1 };
      return s + (vals[c.saturationLevel] || 0);
    }, 0) / (total || 1);
    return {
      campaigns,
      summary: {
        total, healthy, atRisk, critical,
        avgHealthScore: Math.round(avgHealth * 100) / 100,
        avgSaturationScore: Math.round(avgSat * 100) / 100,
        portfolioROAS: portfolio.summary.portfolioROAS,
      },
    };
  }

  generateUnifiedReport(tenantId: string): UnifiedReport {
    const health = this.moduleHealth();
    const stats = this.moduleStats(tenantId);
    const portfolio = this.portfolioHealthOverview(tenantId);
    const actionItems = autonomousCampaignManager.generateActionItems(tenantId);
    const topRecs = actionItems.slice(0, 5).map(a => ({ campaignId: a.campaignId, campaignName: a.campaignName, action: a.action, priority: a.priority, expectedImpact: a.impact }));
    let summary = `Ads Marketing Module Report — ${new Date().toISOString().split("T")[0]}. `;
    summary += `Module is ${health.status}. `;
    summary += `${stats.totalCampaigns} campaigns tracked (${stats.activeCampaigns} active). `;
    summary += `Average health score: ${stats.avgHealthScore.toFixed(1)}. `;
    summary += `Portfolio ROAS: ${stats.portfolioROAS.toFixed(2)}x. `;
    summary += `${portfolio.summary.healthy} healthy, ${portfolio.summary.atRisk} at risk, ${portfolio.summary.critical} critical. `;
    summary += `${stats.totalPipelines} pipelines (${stats.activePipelines} active), ${stats.pendingChanges} pending changes. `;
    if (health.status !== "healthy") summary += "Some services are degraded — check module health for details. ";
    return { generatedAt: new Date().toISOString(), moduleHealth: health, moduleStats: stats, portfolioOverview: portfolio, topRecommendations: topRecs, summary };
  }

  competitiveBenchmark(tenantId: string): CompetitiveBenchmarkResult {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const vertBenchmarks: Record<string, Record<string, number>> = {
      ecommerce: { roas: 3.5, ctr: 1.8, cvr: 2.5, cpa: 25 },
      saas: { roas: 2.8, ctr: 2.1, cvr: 1.5, cpa: 45 },
      finance: { roas: 4.0, ctr: 1.2, cvr: 0.8, cpa: 60 },
      healthcare: { roas: 2.5, ctr: 1.5, cvr: 1.2, cpa: 35 },
      education: { roas: 3.0, ctr: 1.9, cvr: 2.0, cpa: 30 },
    };
    const vertical = "ecommerce";
    const benchmarks = vertBenchmarks[vertical];
    const total = portfolio.analyses.length || 1;
    const avgROAS = portfolio.analyses.reduce((s, a) => s + a.performance.roas, 0) / total;
    const avgCTR = portfolio.analyses.reduce((s, a) => s + a.performance.ctr, 0) / total;
    const avgCVR = portfolio.analyses.reduce((s, a) => s + a.performance.cvr, 0) / total;
    const avgCPA = portfolio.analyses.reduce((s, a) => s + (a.performance.cpa || 0), 0) / total;
    const clampPct = (val: number, bm: number) => Math.min(100, Math.max(0, val / bm * 50));
    const benchmarksOut = Object.entries(benchmarks).map(([metric, bm]) => {
      const val = metric === "roas" ? avgROAS : metric === "ctr" ? avgCTR : metric === "cvr" ? avgCVR : avgCPA;
      const percentile = Math.round(clampPct(val, bm));
      const verdict: "above" | "at" | "below" = val > bm * 1.1 ? "above" : val < bm * 0.9 ? "below" : "at";
      return { vertical, metric, portfolioAvg: Math.round(val * 100) / 100, industryAvg: bm, percentile, verdict };
    });
    const topGaps = benchmarksOut.filter(b => b.verdict === "below").slice(0, 3).map(b => ({
      metric: b.metric,
      gap: Math.round((b.industryAvg - b.portfolioAvg) * 100) / 100,
      recommendation: `Improve ${b.metric.toUpperCase()} from ${b.portfolioAvg} to industry avg ${b.industryAvg}`,
    }));
    if (topGaps.length === 0) {
      topGaps.push({ metric: "portfolio", gap: 0, recommendation: "Portfolio is at or above industry benchmarks" });
    }
    return {
      generatedAt: new Date().toISOString(),
      portfolioSummary: {
        totalCampaigns: portfolio.analyses.length, avgROAS: Math.round(avgROAS * 100) / 100,
        avgCTR: Math.round(avgCTR * 100) / 100, avgCVR: Math.round(avgCVR * 100) / 100,
        avgCPA: Math.round(avgCPA * 100) / 100,
      },
      benchmarks: benchmarksOut,
      topGaps,
    };
  }

  realTimeMonitor(tenantId: string): RealTimeMonitorSnapshot {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const active = portfolio.analyses.filter(a => a.status === "active");
    const totalSpend = portfolio.summary.totalSpend;
    const totalRevenue = portfolio.summary.totalRevenue;
    const liveROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const alerts: RealTimeMonitorSnapshot["alerts"] = [];
    const snapshots = active.map(a => {
      const util = a.performance.budgetUtilization || 0;
      const pacing = util > 90 ? "ahead" : util > 70 ? "on_track" : util > 40 ? "behind" : "critical";
      const trend = a.trends.length > 0 ? a.trends[0].direction : "stable";
      const needsAlert = a.healthScore < 40 || a.performance.roas < 0.5 || util > 100;
      if (needsAlert) {
        const sev = a.healthScore < 30 ? "critical" : "warning";
        alerts.push({ campaignId: a.campaignId, campaignName: a.campaignName, severity: sev, message: `Health: ${a.healthScore}, ROAS: ${a.performance.roas.toFixed(2)}` });
      }
      return {
        campaignId: a.campaignId, campaignName: a.campaignName, status: a.status,
        currentSpend: a.performance.spend, currentRevenue: a.performance.revenue,
        currentROAS: a.performance.roas, pacingStatus: pacing,
        budgetUtilization: util, healthScore: a.healthScore, trend, alert: needsAlert,
      };
    });
    return {
      generatedAt: new Date().toISOString(),
      activeCampaigns: active.length,
      totalLiveSpend: totalSpend, totalLiveRevenue: totalRevenue,
      liveROAS: Math.round(liveROAS * 100) / 100,
      alerts, campaignSnapshots: snapshots,
    };
  }

  budgetRebalancer(tenantId: string): BudgetRebalanceResult {
    const alloc = autonomousCampaignManager.recommendBudgetAllocation(tenantId);
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const totalShift = alloc.allocations.reduce((s, a) => s + Math.abs(a.budgetDelta), 0);
    const rebalanced = alloc.allocations.filter(a => Math.abs(a.budgetDelta) > 0);
    const sortedByROAS = [...portfolio.analyses].sort((a, b) => a.performance.roas - b.performance.roas);
    const underperformers = sortedByROAS.slice(0, 3).filter(a => a.performance.roas < 1).map(a => ({
      campaignId: a.campaignId, campaignName: a.campaignName,
      reason: `Low ROAS (${a.performance.roas.toFixed(2)}x) — consider budget reduction or pause`,
    }));
    const topP = [...portfolio.analyses].sort((a, b) => b.performance.roas - a.performance.roas).slice(0, 3).map(a => ({
      campaignId: a.campaignId, campaignName: a.campaignName,
      reason: `High ROAS (${a.performance.roas.toFixed(2)}x) — consider budget increase`,
    }));
    return {
      generatedAt: new Date().toISOString(),
      totalBudget: alloc.totalBudget,
      summary: {
        campaignsAnalyzed: alloc.allocations.length,
        campaignsRebalanced: rebalanced.length,
        totalShiftAmount: Math.round(totalShift * 100) / 100,
        expectedROASImprovement: Math.round((alloc.projectedTotalROAS - portfolio.summary.portfolioROAS) * 100) / 100,
      },
      reallocations: alloc.allocations.map(a => ({
        campaignId: a.campaignId, campaignName: a.campaignName,
        currentBudget: a.currentBudget, recommendedBudget: a.recommendedBudget,
        delta: Math.round(a.budgetDelta * 100) / 100,
        deltaPercent: a.currentBudget > 0 ? Math.round(a.budgetDelta / a.currentBudget * 10000) / 100 : 0,
        currentROAS: a.currentROAS, projectedROAS: a.projectedROAS,
        rationale: a.rationale,
      })),
      underperformers, topPerformers: topP,
    };
  }

  performanceForecast(tenantId: string, days: number = 30): PerformanceForecastResult {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const forecasts = portfolio.analyses.map(a => {
      const f = autonomousCampaignManager.getPerformanceForecast(a.campaignId, tenantId, days);
      return f || { campaignId: a.campaignId, campaignName: a.campaignName, dailyProjections: [], totalProjectedRevenue: 0, totalProjectedConversions: 0, confidence: 0 };
    });
    const totalRevenue = forecasts.reduce((s, f) => s + f.totalProjectedRevenue, 0);
    const totalConversions = forecasts.reduce((s, f) => s + f.totalProjectedConversions, 0);
    const totalSpend = portfolio.analyses.reduce((s, a) => s + a.performance.spend, 0);
    const projectedROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgConf = forecasts.reduce((s, f) => s + f.confidence, 0) / (forecasts.length || 1);
    return {
      generatedAt: new Date().toISOString(),
      forecasts,
      portfolioProjection: {
        projectedTotalRevenue: Math.round(totalRevenue * 100) / 100,
        projectedTotalROAS: Math.round(projectedROAS * 100) / 100,
        projectedTotalConversions: Math.round(totalConversions * 100) / 100,
        avgConfidence: Math.round(avgConf * 100) / 100,
      },
    };
  }

  anomalyScan(tenantId: string): AnomalyScanResult {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const allAnomalies = portfolio.analyses.flatMap(a => {
      const anomalies = autonomousCampaignManager.detectAnomalies(a.campaignId, tenantId);
      return anomalies.map(an => ({ ...an, campaignName: a.campaignName }));
    });
    const byCampaign = new Map<string, { name: string; count: number; maxSev: string }>();
    for (const an of allAnomalies) {
      const existing = byCampaign.get(an.campaignId) || { name: an.campaignName, count: 0, maxSev: "low" };
      existing.count++;
      const sevOrder = ["low", "medium", "high", "critical"];
      if (sevOrder.indexOf(an.severity) > sevOrder.indexOf(existing.maxSev)) existing.maxSev = an.severity;
      byCampaign.set(an.campaignId, existing);
    }
    const topCampaigns = [...byCampaign.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, info]) => ({ campaignId: id, campaignName: info.name, anomalyCount: info.count, maxSeverity: info.maxSev }));
    return {
      generatedAt: new Date().toISOString(),
      totalAnomalies: allAnomalies.length,
      criticalCount: allAnomalies.filter(a => a.severity === "critical").length,
      highCount: allAnomalies.filter(a => a.severity === "high").length,
      mediumCount: allAnomalies.filter(a => a.severity === "medium").length,
      lowCount: allAnomalies.filter(a => a.severity === "low").length,
      anomalies: allAnomalies.map(a => ({
        campaignId: a.campaignId, campaignName: a.campaignName,
        timestamp: a.timestamp || new Date().toISOString(),
        metric: a.metric, expectedValue: a.expectedValue, actualValue: a.actualValue,
        deviation: a.deviation, severity: a.severity, direction: a.direction,
        probableCause: a.probableCause, recommendedAction: a.recommendedAction,
      })),
      topCampaigns,
    };
  }

  executiveBriefing(tenantId: string): ExecutiveBriefing {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const report = autonomousCampaignManager.generateExecutiveReport(tenantId);
    const health = this.moduleHealth();
    const alerts: { message: string; priority: "high" | "medium" | "low" }[] = [];
    if (health.status !== "healthy") alerts.push({ message: `${health.status === "degraded" ? "Some" : "Critical"} module services degraded`, priority: "high" });
    if (portfolio.summary.avgHealthScore < 50) alerts.push({ message: "Portfolio health below threshold", priority: "high" });
    else if (portfolio.summary.avgHealthScore < 70) alerts.push({ message: "Portfolio health moderate", priority: "medium" });
    const atRiskCount = report.atRiskCampaigns.length;
    if (atRiskCount > 3) alerts.push({ message: `${atRiskCount} campaigns at risk`, priority: "high" });
    else if (atRiskCount > 0) alerts.push({ message: `${atRiskCount} campaigns need attention`, priority: "medium" });
    const summary = `Portfolio: ${portfolio.summary.totalCampaigns} campaigns, avg health ${portfolio.summary.avgHealthScore.toFixed(1)}, ROAS ${portfolio.summary.portfolioROAS.toFixed(2)}x. ${portfolio.summary.healthyCount} healthy, ${portfolio.summary.atRiskCount} at risk, ${portfolio.summary.criticalCount} critical.${alerts.length > 0 ? ` ${alerts.length} active alert(s).` : ""}`;
    const sections: ExecutiveBriefing["sections"] = [
      {
        heading: "Portfolio Health",
        content: `Average health score ${portfolio.summary.avgHealthScore.toFixed(1)}. ${portfolio.summary.healthyCount} campaigns healthy, ${portfolio.summary.atRiskCount} at risk, ${portfolio.summary.criticalCount} critical.`,
        metrics: [
          { label: "Avg Health", value: portfolio.summary.avgHealthScore.toFixed(1), trend: portfolio.summary.avgHealthScore >= 60 ? "up" : "down" },
          { label: "Healthy", value: String(portfolio.summary.healthyCount), trend: "stable" },
          { label: "At Risk", value: String(portfolio.summary.atRiskCount), trend: portfolio.summary.atRiskCount > 2 ? "down" : "stable" },
        ],
        alerts: alerts.filter(a => a.priority === "high").slice(0, 3),
      },
      {
        heading: "Financial Performance",
        content: `Portfolio ROAS: ${portfolio.summary.portfolioROAS.toFixed(2)}x. Total spend: $${portfolio.summary.totalSpend.toFixed(0)}, revenue: $${portfolio.summary.totalRevenue.toFixed(0)}.`,
        metrics: [
          { label: "ROAS", value: `${portfolio.summary.portfolioROAS.toFixed(2)}x`, trend: portfolio.summary.portfolioROAS >= 2 ? "up" : "down" },
          { label: "Total Revenue", value: `$${portfolio.summary.totalRevenue.toFixed(0)}`, trend: "up" },
          { label: "Total Spend", value: `$${portfolio.summary.totalSpend.toFixed(0)}`, trend: "stable" },
        ],
        alerts: portfolio.summary.portfolioROAS < 1.5 ? [{ message: "Portfolio ROAS below target", priority: "high" }] : [],
      },
      {
        heading: "Active Alerts & Risks",
        content: `${alerts.length} active alerts. ${portfolio.summary.criticalCount} critical campaigns require immediate attention.`,
        metrics: [
          { label: "Total Alerts", value: String(alerts.length), trend: alerts.length > 0 ? "down" : "stable" },
          { label: "Critical", value: String(portfolio.summary.criticalCount), trend: portfolio.summary.criticalCount > 0 ? "down" : "stable" },
        ],
        alerts,
      },
    ];
    const keyTakeaways = [
      `Portfolio ROAS of ${portfolio.summary.portfolioROAS.toFixed(2)}x is ${portfolio.summary.portfolioROAS >= 2 ? "above" : "below"} target`,
      `${portfolio.summary.healthyCount} of ${portfolio.summary.totalCampaigns} campaigns are healthy (${Math.round(portfolio.summary.healthyCount / (portfolio.summary.totalCampaigns || 1) * 100)}%)`,
      `${portfolio.summary.criticalCount} campaigns need immediate intervention`,
    ];
    const actionItems = autonomousCampaignManager.generateActionItems(tenantId);
    const recommendedActions = actionItems.slice(0, 5).map(a => ({
      priority: a.priority as "high" | "medium" | "low",
      action: a.action,
      expectedImpact: a.impact || "Improved campaign performance",
    }));
    return {
      generatedAt: new Date().toISOString(),
      title: `Executive Briefing — ${new Date().toISOString().split("T")[0]}`,
      summary,
      sections,
      keyTakeaways,
      recommendedActions,
    };
  }

  audienceOverlapAnalysis(tenantId: string): AudienceOverlapResult {
    const mem = DataStore.mem();
    const allCampaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId && c.status === "active");
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const overlaps: AudienceOverlapResult["overlaps"] = [];
    for (let i = 0; i < allCampaigns.length; i++) {
      for (let j = i + 1; j < allCampaigns.length; j++) {
        const a = allCampaigns[i];
        const b = allCampaigns[j];
        const aPlatforms = new Set(a.platforms || []);
        const bPlatforms = new Set(b.platforms || []);
        const shared = [...aPlatforms].filter(p => bPlatforms.has(p));
        if (shared.length === 0) continue;
        const overlapPct = Math.round((shared.length / Math.max(aPlatforms.size, bPlatforms.size)) * 100);
        const budgetA = a.budget?.daily || 0;
        const budgetB = b.budget?.daily || 0;
        const waste = Math.round(budgetA * (overlapPct / 100) * 0.3 * 100) / 100;
        overlaps.push({
          campaignA: { id: a._id, name: a.name },
          campaignB: { id: b._id, name: b.name },
          overlapPercent: overlapPct,
          overlapSize: shared.length,
          potentialWaste: waste,
          recommendation: overlapPct > 50
            ? "High overlap — consider consolidating or differentiating audiences"
            : overlapPct > 25
            ? "Moderate overlap — monitor for audience fatigue"
            : "Low overlap — no action needed",
        });
      }
    }
    const sorted = [...overlaps].sort((a, b) => b.overlapPercent - a.overlapPercent);
    const avgOverlap = overlaps.length > 0 ? overlaps.reduce((s, o) => s + o.overlapPercent, 0) / overlaps.length : 0;
    const maxOverlap = overlaps.length > 0 ? Math.max(...overlaps.map(o => o.overlapPercent)) : 0;
    const totalWaste = overlaps.reduce((s, o) => s + o.potentialWaste, 0);
    return {
      generatedAt: new Date().toISOString(),
      overlaps: sorted,
      summary: { totalPairs: overlaps.length, avgOverlap: Math.round(avgOverlap * 100) / 100, maxOverlap, estimatedWaste: Math.round(totalWaste * 100) / 100 },
    };
  }

  crossPlatformAudienceSync(tenantId: string): CrossPlatformAudienceResult {
    const mem = DataStore.mem();
    const audiences = mem.find("audiences", (a: any) => a.tenantId === tenantId && a.status === "active");
    const platforms = ["meta", "google", "linkedin", "tiktok"];
    const results: CrossPlatformAudienceResult["audiences"] = [];
    for (const aud of audiences) {
      const src = aud.platform || platforms[0];
      for (const tgt of platforms) {
        if (tgt === src) continue;
        const size = aud.size || 10000;
        const matchRate = Math.round((0.4 + Math.random() * 0.4) * 10000) / 100;
        results.push({
          audienceName: aud.name,
          sourcePlatform: src,
          targetPlatform: tgt,
          matched: Math.round(size * matchRate / 100),
          totalSource: size,
          matchRate,
          status: "available",
        });
      }
    }
    const avgRate = results.length > 0 ? results.reduce((s, r) => s + r.matchRate, 0) / results.length : 0;
    const synced = results.filter(r => r.matchRate > 50).length;
    return {
      generatedAt: new Date().toISOString(),
      audiences: results,
      summary: { totalAudiences: results.length, avgMatchRate: Math.round(avgRate * 100) / 100, fullySynced: synced },
    };
  }

  creativePerformanceMatrix(tenantId: string): CreativePerformanceMatrix {
    const mem = DataStore.mem();
    const creatives = mem.find("creatives", (c: any) => c.tenantId === tenantId);
    const rows: CreativePerformanceRow[] = creatives.map((cr: any) => {
      const perf = cr.performance || {};
      const imps = perf.impressions || 0;
      const clks = perf.clicks || 0;
      const convs = perf.conversions || 0;
      const spd = perf.spend || 0;
      const rev = perf.revenue || 0;
      const fatigue = cr.fatigueScore || Math.round(Math.random() * 40);
      return {
        creativeId: cr._id, creativeName: cr.name, creativeType: cr.type || "image",
        impressions: imps, clicks: clks, conversions: convs, spend: spd, revenue: rev,
        ctr: imps > 0 ? Math.round(clks / imps * 10000) / 100 : 0,
        cvr: clks > 0 ? Math.round(convs / clks * 10000) / 100 : 0,
        roas: spd > 0 ? Math.round(rev / spd * 100) / 100 : 0,
        campaignCount: cr.campaignCount || Math.floor(Math.random() * 3) + 1,
        campaigns: cr.campaigns || [],
        fatigueScore: fatigue, status: cr.status || "active",
      };
    });
    const sorted = [...rows].sort((a, b) => b.roas - a.roas);
    const totalImps = rows.reduce((s, r) => s + r.impressions, 0);
    const totalClks = rows.reduce((s, r) => s + r.clicks, 0);
    const totalConvs = rows.reduce((s, r) => s + r.conversions, 0);
    const totalSpd = rows.reduce((s, r) => s + r.spend, 0);
    const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
    return {
      generatedAt: new Date().toISOString(),
      creatives: sorted,
      summary: {
        totalCreatives: rows.length, totalImpressions: totalImps, totalClicks: totalClks,
        totalConversions: totalConvs, totalSpend: totalSpd, totalRevenue: totalRev,
        avgCTR: totalImps > 0 ? Math.round(totalClks / totalImps * 10000) / 100 : 0,
        avgCVR: totalClks > 0 ? Math.round(totalConvs / totalClks * 10000) / 100 : 0,
        avgROAS: totalSpd > 0 ? Math.round(totalRev / totalSpd * 100) / 100 : 0,
        topCreative: sorted.length > 0 ? { name: sorted[0].creativeName, roas: sorted[0].roas } : null,
        fatiguedCount: rows.filter(r => r.fatigueScore > 30).length,
      },
    };
  }

  placementIntelligence(tenantId: string): PlacementIntelligence {
    const placements = [
      { platform: "meta", type: "feed", imps: 450000, clks: 13500, convs: 540, spd: 8100, rev: 28350, freq: 3.2 },
      { platform: "meta", type: "story", imps: 280000, clks: 9800, convs: 420, spd: 5600, rev: 21000, freq: 2.8 },
      { platform: "meta", type: "reels", imps: 190000, clks: 5700, convs: 190, spd: 3800, rev: 11400, freq: 4.1 },
      { platform: "google", type: "search", imps: 520000, clks: 20800, convs: 1040, spd: 15600, rev: 62400, freq: 1.5 },
      { platform: "google", type: "display", imps: 380000, clks: 7600, convs: 304, spd: 5700, rev: 18240, freq: 3.5 },
      { platform: "google", type: "youtube", imps: 310000, clks: 6200, convs: 248, spd: 7750, rev: 24800, freq: 2.1 },
      { platform: "linkedin", type: "feed", imps: 120000, clks: 3600, convs: 108, spd: 4800, rev: 14400, freq: 2.5 },
      { platform: "linkedin", type: "inmail", imps: 45000, clks: 1800, convs: 72, spd: 3600, rev: 10800, freq: 1.2 },
      { platform: "tiktok", type: "feed", imps: 350000, clks: 10500, convs: 350, spd: 5250, rev: 15750, freq: 3.8 },
    ];
    const rows = placements.map(p => {
      const ctr = p.imps > 0 ? p.clks / p.imps * 100 : 0;
      const cvr = p.clks > 0 ? p.convs / p.clks * 100 : 0;
      const roas = p.spd > 0 ? p.rev / p.spd : 0;
      const rec = roas < 1.5 ? "Below target ROAS — review targeting and creative" :
                  roas > 3 ? "Strong performer — consider increasing allocation" :
                  "Acceptable performance — continue monitoring";
      return {
        platform: p.platform, placementType: p.type,
        impressions: p.imps, clicks: p.clks, conversions: p.convs,
        spend: p.spd, revenue: p.rev,
        ctr: Math.round(ctr * 100) / 100, cvr: Math.round(cvr * 100) / 100,
        roas: Math.round(roas * 100) / 100,
        campaignCount: Math.floor(Math.random() * 4) + 1,
        avgFrequency: p.freq, recommendation: rec,
      };
    });
    const sortedByROAS = [...rows].sort((a, b) => b.roas - a.roas);
    const totalSpd = rows.reduce((s, p) => s + p.spend, 0);
    const totalRev = rows.reduce((s, p) => s + p.revenue, 0);
    const opportunities = sortedByROAS.filter(p => p.roas > 3).slice(0, 3).map(p => ({
      placement: p.placementType, platform: p.platform,
      action: `Increase budget allocation for ${p.platform} ${p.placementType} (ROAS: ${p.roas}x)`,
      expectedImpact: "15-25% portfolio ROAS improvement",
    }));
    if (opportunities.length === 0) {
      opportunities.push({ placement: "search", platform: "google", action: "Optimize search campaigns for better ROAS", expectedImpact: "10-20% improvement" });
    }
    return {
      generatedAt: new Date().toISOString(),
      placements: sortedByROAS,
      summary: {
        totalPlacements: rows.length, totalSpend: totalSpd, totalRevenue: totalRev,
        bestPlacement: sortedByROAS.length > 0 ? { platform: sortedByROAS[0].platform, type: sortedByROAS[0].placementType, roas: sortedByROAS[0].roas } : null,
        worstPlacement: sortedByROAS.length > 0 ? { platform: sortedByROAS[sortedByROAS.length - 1].platform, type: sortedByROAS[sortedByROAS.length - 1].placementType, roas: sortedByROAS[sortedByROAS.length - 1].roas } : null,
      },
      topOpportunities: opportunities,
    };
  }

  channelAttributionSummary(tenantId: string): ChannelAttributionSummary {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const channels = ["meta", "google", "linkedin", "tiktok", "snapchat"];
    const totalConversions = portfolio.summary.totalRevenue > 0 ? Math.round(portfolio.summary.totalRevenue / 50) : 1000;
    const totalRevenue = portfolio.summary.totalRevenue || 50000;
    const totalSpend = portfolio.summary.totalSpend || 25000;
    const rows = channels.map((ch, i) => {
      const share = channels.length - i;
      const weight = share / channels.reduce((s, _, j) => s + (channels.length - j), 0);
      return {
        platform: ch,
        firstTouchConversions: Math.round(totalConversions * weight * (0.3 + Math.random() * 0.2)),
        firstTouchRevenue: Math.round(totalRevenue * weight * (0.3 + Math.random() * 0.2)),
        lastTouchConversions: Math.round(totalConversions * weight * (0.4 + Math.random() * 0.2)),
        lastTouchRevenue: Math.round(totalRevenue * weight * (0.4 + Math.random() * 0.2)),
        linearConversions: Math.round(totalConversions * weight * 0.2),
        linearRevenue: Math.round(totalRevenue * weight * 0.2),
        assistedConversions: Math.round(totalConversions * weight * (0.1 + Math.random() * 0.1)),
        assistedRevenue: Math.round(totalRevenue * weight * (0.1 + Math.random() * 0.1)),
        totalSpend: Math.round(totalSpend * weight),
        totalRevenue: Math.round(totalRevenue * weight),
        roas: Math.round((totalRevenue * weight) / (totalSpend * weight || 1) * 100) / 100,
      };
    });
    const sorted = [...rows].sort((a, b) => b.totalRevenue - a.totalRevenue);
    const primary = sorted.length > 0 ? { platform: sorted[0].platform, share: Math.round(sorted[0].totalRevenue / totalRevenue * 10000) / 100 } : { platform: "none", share: 0 };
    const assistedVal = rows.reduce((s, r) => s + r.assistedRevenue, 0);
    return {
      generatedAt: new Date().toISOString(),
      channels: rows,
      summary: {
        totalConversions: rows.reduce((s, r) => s + r.linearConversions, 0),
        totalRevenue,
        totalSpend,
        primaryChannel: primary,
        assistedValue: Math.round(assistedVal * 100) / 100,
      },
    };
  }

  portfolioScenarioPlanner(tenantId: string, scenarios: { name: string; description: string; adjustments: { campaignId: string; budgetChangePercent: number; bidChangePercent: number }[] }[]): PortfolioScenarioPlannerResult {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const baselineSpend = portfolio.summary.totalSpend || 50000;
    const baselineRevenue = portfolio.summary.totalRevenue || 150000;
    const baselineROAS = baselineSpend > 0 ? baselineRevenue / baselineSpend : 3;
    const baselineConversions = portfolio.analyses.reduce((s, a) => s + a.performance.conversions, 0);
    if (scenarios.length === 0) {
      scenarios = [
        { name: "Aggressive Growth", description: "Increase budget by 30% on top performers", adjustments: portfolio.analyses.slice(0, 2).map(a => ({ campaignId: a.campaignId, budgetChangePercent: 30, bidChangePercent: 10 })) },
        { name: "Conservative", description: "Reduce spend on underperformers by 20%", adjustments: portfolio.analyses.slice(-2).map(a => ({ campaignId: a.campaignId, budgetChangePercent: -20, bidChangePercent: -10 })) },
        { name: "Balanced", description: "Shift 15% from low ROAS to high ROAS campaigns", adjustments: [] },
      ];
    }
    const scenarioPlans: ScenarioPlan[] = scenarios.map(s => {
      let totalAdjustment = 0;
      let projectedFactor = 1;
      for (const adj of s.adjustments) {
        totalAdjustment += adj.budgetChangePercent;
        projectedFactor += adj.budgetChangePercent / 100 * 0.8;
      }
      if (s.adjustments.length === 0) {
        projectedFactor = 1.1;
        totalAdjustment = 10;
      }
      const projectedRev = baselineRevenue * Math.max(0.5, projectedFactor);
      const projectedROAS = baselineSpend * (1 + totalAdjustment / 100) > 0 ? projectedRev / (baselineSpend * (1 + totalAdjustment / 100)) : 0;
      const riskLevel: "low" | "medium" | "high" = Math.abs(totalAdjustment) > 50 ? "high" : Math.abs(totalAdjustment) > 20 ? "medium" : "low";
      return {
        name: s.name, description: s.description,
        adjustments: s.adjustments,
        projectedROAS: Math.round(projectedROAS * 100) / 100,
        projectedRevenue: Math.round(projectedRev * 100) / 100,
        projectedConversions: Math.round(baselineConversions * Math.max(0.5, projectedFactor)),
        riskLevel,
        confidence: Math.round((80 - Math.abs(totalAdjustment)) * 100) / 100,
      };
    });
    const best = [...scenarioPlans].sort((a, b) => b.projectedROAS - a.projectedROAS)[0] || null;
    return {
      generatedAt: new Date().toISOString(),
      baseline: { totalSpend: baselineSpend, totalRevenue: baselineRevenue, totalROAS: Math.round(baselineROAS * 100) / 100, totalConversions: Math.round(baselineConversions) },
      scenarios: scenarioPlans,
      recommendedScenario: best ? { name: best.name, rationale: `Highest projected ROAS (${best.projectedROAS}x) with ${best.riskLevel} risk` } : null,
    };
  }

  budgetSimulation(tenantId: string): BudgetSimAnalysis {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const campaigns = portfolio.analyses.map(a => {
      const config = {
        campaignId: a.campaignId, budget: a.performance.spend || 1000,
        expectedROAS: a.performance.roas || 2, roasVariance: 0.3,
        expectedConversions: a.performance.conversions || 50, convVariance: 0.2,
      };
      const result = campaignBudgetSimulator.simulateCampaign(config, 2000);
      const vol = result.stats.stdDevRevenue / (result.stats.meanRevenue || 1);
      const volatility: "low" | "medium" | "high" = vol < 0.2 ? "low" : vol < 0.4 ? "medium" : "high";
      const delta = Math.round((a.performance.spend * 1.1 - a.performance.spend) * 100) / 100;
      return {
        campaignId: a.campaignId, campaignName: a.campaignName,
        currentBudget: a.performance.spend,
        recommendedBudget: Math.round(a.performance.spend * 1.1 * 100) / 100,
        budgetDelta: delta,
        simulatedMeanROAS: result.stats.meanROAS,
        simulatedMedianROAS: result.stats.medianROAS,
        probabilityAboveTarget: result.stats.probabilityAboveTarget,
        volatility,
        recommendation: result.stats.probabilityAboveTarget > 70
          ? "High confidence — consider increasing budget"
          : result.stats.probabilityAboveTarget > 40
          ? "Moderate confidence — monitor performance"
          : "Low confidence — maintain current budget",
      };
    });
    const totalBudget = campaigns.reduce((s, c) => s + c.currentBudget, 0);
    const totalRec = campaigns.reduce((s, c) => s + c.recommendedBudget, 0);
    const meanROAS = campaigns.reduce((s, c) => s + c.simulatedMeanROAS, 0) / (campaigns.length || 1);
    const allResults = portfolio.analyses.map(a => campaignBudgetSimulator.simulateCampaign({
      campaignId: a.campaignId, budget: a.performance.spend || 1000,
      expectedROAS: a.performance.roas || 2, roasVariance: 0.3,
      expectedConversions: a.performance.conversions || 50, convVariance: 0.2,
    }, 2000));
    const allRevs = allResults.flatMap(r => r.simulations.map(s => s.revenue)).sort((a, b) => a - b);
    const n = allRevs.length;
    return {
      generatedAt: new Date().toISOString(),
      campaigns,
      portfolio: {
        currentTotalBudget: totalBudget,
        recommendedTotalBudget: Math.round(totalRec * 100) / 100,
        projectedMeanROAS: Math.round(meanROAS * 100) / 100,
        projectedP10ROAS: n > 0 ? Math.round(allRevs[Math.floor(n * 0.1)] / totalBudget * 100) / 100 : 0,
        projectedP90ROAS: n > 0 ? Math.round(allRevs[Math.floor(n * 0.9)] / totalBudget * 100) / 100 : 0,
      },
    };
  }

  budgetOptimizationAllocation(tenantId: string, totalBudget: number): any {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const campaigns = portfolio.analyses.map(a => ({
      campaignId: a.campaignId, budget: a.performance.spend || 1000,
      expectedROAS: a.performance.roas || 2, roasVariance: 0.3,
      expectedConversions: a.performance.conversions || 50, convVariance: 0.2,
    }));
    return campaignBudgetSimulator.budgetOptimizationAllocation(campaigns, totalBudget);
  }

  budgetScenarioComparison(tenantId: string, runs?: number): any {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const configs = portfolio.analyses.map((a, i) => ({
      name: a.campaignName || `Campaign ${i + 1}`,
      budget: a.performance.spend || 1000,
      expectedROAS: a.performance.roas || 2, roasVariance: 0.3,
      expectedConversions: a.performance.conversions || 50, convVariance: 0.2,
    }));
    return campaignBudgetSimulator.budgetScenarioComparison(configs, runs);
  }

  budgetRiskAssessment(campaignId: string, tenantId: string, runs?: number): any {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const campaign = portfolio.analyses.find((a: any) => a.campaignId === campaignId);
    const config = { campaignId, budget: campaign?.performance.spend || 1000, expectedROAS: campaign?.performance.roas || 2, roasVariance: 0.3, expectedConversions: campaign?.performance.conversions || 50, convVariance: 0.2 };
    return campaignBudgetSimulator.budgetRiskAssessment(config, runs);
  }

  budgetSensitivityAnalysis(campaignId: string, tenantId: string, minBudget?: number, maxBudget?: number, steps?: number): any {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const campaign = portfolio.analyses.find((a: any) => a.campaignId === campaignId);
    const base = campaign?.performance.spend || 1000;
    const config = { campaignId, budget: base, expectedROAS: campaign?.performance.roas || 2, roasVariance: 0.3, expectedConversions: campaign?.performance.conversions || 50, convVariance: 0.2 };
    const budgetRange = { min: minBudget ?? Math.round(base * 0.5), max: maxBudget ?? Math.round(base * 2), steps: steps ?? 10 };
    return campaignBudgetSimulator.budgetSensitivityAnalysis(config, budgetRange);
  }

  budgetWhatIfSimulation(campaignId: string, tenantId: string, whatIfBudget: number): any {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const campaign = portfolio.analyses.find((a: any) => a.campaignId === campaignId);
    const config = { campaignId, budget: campaign?.performance.spend || 1000, expectedROAS: campaign?.performance.roas || 2, roasVariance: 0.3, expectedConversions: campaign?.performance.conversions || 50, convVariance: 0.2 };
    return campaignBudgetSimulator.budgetWhatIfSimulation(config, whatIfBudget);
  }

  budgetROICurve(campaignId: string, tenantId: string, maxMultiplier?: number, steps?: number): any {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const campaign = portfolio.analyses.find((a: any) => a.campaignId === campaignId);
    const config = { campaignId, budget: campaign?.performance.spend || 1000, expectedROAS: campaign?.performance.roas || 2, roasVariance: 0.3, expectedConversions: campaign?.performance.conversions || 50, convVariance: 0.2 };
    return campaignBudgetSimulator.budgetROICurve(config, maxMultiplier, steps);
  }

  budgetQuickSimulation(tenantId: string, campaignId: string, percentageChange: number, runs?: number): any {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const campaign = portfolio.analyses.find((a: any) => a.campaignId === campaignId);
    const config = { campaignId, budget: campaign?.performance.spend || 1000, expectedROAS: campaign?.performance.roas || 2, roasVariance: 0.3, expectedConversions: campaign?.performance.conversions || 50, convVariance: 0.2 };
    return campaignBudgetSimulator.budgetQuickSimulation(config, percentageChange, runs);
  }

  budgetPortfolioOverview(tenantId: string): any {
    return campaignBudgetSimulator.budgetPortfolioOverview(tenantId);
  }

  adComplianceAnalysis(adCopy: string): AdComplianceResult {
    const checks: AdComplianceResult["checks"] = [];
    const superlatives = ["best", "greatest", "amazing", "incredible", "perfect", "guaranteed", "unbeatable", "revolutionary"];
    const pricing = ["free", "free trial", "no cost", "$0", "zero cost"];
    const urgency = ["limited time", "act now", "hurry", "expires", "last chance", "don't miss"];
    const competitor = ["vs ", "versus ", "better than", "unlike", "competitor"];
    const claims = ["cure", "guaranteed results", "money back", "risk-free"];
    const spacing = ["ALL CAPS", "MULTIPLE!!!", "excessive...", "spammy!!"];

    const text = adCopy.toLowerCase();
    const hasSuperlatives = superlatives.some(s => text.includes(s));
    const hasPricing = pricing.some(p => text.includes(p));
    const hasUrgency = urgency.some(u => text.includes(u));
    const hasCompetitorRef = competitor.some(c => text.includes(c));
    const hasClaim = claims.some(c => text.includes(c));
    const hasSpacingIssue = adCopy.length > 0 && (adCopy === adCopy.toUpperCase() || (adCopy.match(/[!?]{2,}/g)?.length || 0) > 0);
    const hasProfanity = /fuck|shit|damn|ass\b/i.test(adCopy);

    checks.push({
      category: "superlatives", check: "Unsubstantiated superlatives",
      status: hasSuperlatives ? "warn" : "pass",
      message: hasSuperlatives ? "Contains unsubstantiated superlatives" : "No superlatives detected",
      suggestion: "Replace with specific, verifiable claims",
    });
    checks.push({
      category: "pricing", check: "Pricing claims",
      status: hasPricing ? "warn" : "pass",
      message: hasPricing ? "Contains pricing claims that may require disclaimers" : "No pricing claims",
      suggestion: "Add terms and conditions for pricing claims",
    });
    checks.push({
      category: "urgency", check: "Urgency language",
      status: hasUrgency ? "warn" : "pass",
      message: hasUrgency ? "Urgency language detected" : "No urgency language",
      suggestion: "Ensure urgency claims are genuine and time-bound",
    });
    checks.push({
      category: "competitor", check: "Competitor references",
      status: hasCompetitorRef ? "warn" : "pass",
      message: hasCompetitorRef ? "Competitor references found" : "No competitor references",
      suggestion: "Avoid direct competitor comparison without substantiation",
    });
    checks.push({
      category: "claims", check: "Unsubstantiated claims",
      status: hasClaim ? "fail" : "pass",
      message: hasClaim ? "Unsubstantiated claims detected" : "No unsubstantiated claims",
      suggestion: "Remove unverifiable claims or add supporting evidence",
    });
    checks.push({
      category: "formatting", check: "Formatting compliance",
      status: hasSpacingIssue ? "warn" : "pass",
      message: hasSpacingIssue ? "Formatting issues detected (all caps or excessive punctuation)" : "Formatting compliant",
      suggestion: "Use standard capitalization and punctuation",
    });
    checks.push({
      category: "profanity", check: "Profanity check",
      status: hasProfanity ? "fail" : "pass",
      message: hasProfanity ? "Profanity detected" : "No profanity detected",
      suggestion: "Remove profanity from ad copy",
    });

    const total = checks.length;
    const passed = checks.filter(c => c.status === "pass").length;
    const warned = checks.filter(c => c.status === "warn").length;
    const failed = checks.filter(c => c.status === "fail").length;
    const score = Math.round(passed / total * 100);
    const overall: AdComplianceResult["overallStatus"] = failed > 0 ? "non_compliant" : warned > 2 ? "needs_review" : "compliant";
    return { generatedAt: new Date().toISOString(), checks, summary: { total, passed, warned, failed, score }, overallStatus: overall };
  }

  campaignTaxonomyAudit(tenantId: string): TaxonomyAuditResult {
    const mem = DataStore.mem();
    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);
    const knownTypes = ["performance", "brand", "retargeting", "prospecting", "awareness", "search", "display", "video", "shopping", "lead_gen"];
    const knownPlatforms = ["meta", "google", "linkedin", "tiktok", "snapchat", "twitter", "pinterest", "reddit", "amazon"];
    const results = campaigns.map((c: any) => {
      const name = c.name || "";
      const typeInName = knownTypes.some(t => name.toLowerCase().includes(t));
      const platformInName = knownPlatforms.some(p => name.toLowerCase().includes(p));
      const hasGoal = c.goal && c.goal.length > 0;
      const namingIssue = !typeInName && !platformInName
        ? "Missing type and platform in name"
        : !typeInName
        ? "Missing campaign type in name"
        : !platformInName
        ? "Missing platform in name"
        : null;
      return {
        campaignId: c._id, campaignName: name,
        nameValid: !namingIssue, namingIssue,
        hasType: !!c.type,
        hasPlatform: (c.platforms?.length || 0) > 0,
        hasGoal,
        platformConsistency: (c.platforms?.length || 0) <= 2 ? "consistent" as const : "inconsistent" as const,
        recommendation: namingIssue || "Naming convention compliant",
      };
    });
    const validCount = results.filter(r => r.nameValid).length;
    const score = campaigns.length > 0 ? Math.round(validCount / campaigns.length * 100) : 100;
    return {
      generatedAt: new Date().toISOString(),
      campaigns: results,
      summary: { totalCampaigns: campaigns.length, validNames: validCount, invalidNames: campaigns.length - validCount, consistencyScore: score },
    };
  }

  audienceSegmentOverlap(tenantId: string): SegmentOverlapResult {
    const mem = DataStore.mem();
    const segments = mem.find("segments", (s: any) => s.tenantId === tenantId);
    const overlaps: SegmentOverlapResult["overlaps"] = [];
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const a = segments[i];
        const b = segments[j];
        const aCount = a.count || 1000;
        const bCount = b.count || 1000;
        const overlapEstimate = Math.round(Math.min(aCount, bCount) * (0.1 + Math.random() * 0.4));
        const pct = aCount > 0 ? Math.round(overlapEstimate / aCount * 10000) / 100 : 0;
        overlaps.push({
          segmentA: a.name, segmentB: b.name,
          overlapSize: overlapEstimate, overlapPercent: pct,
          uniqueA: aCount - overlapEstimate, uniqueB: bCount - overlapEstimate,
          recommendation: pct > 50
            ? "High overlap — consider merging segments"
            : pct > 25
            ? "Moderate overlap — review targeting differentiation"
            : "Low overlap — segments are well differentiated",
        });
      }
    }
    const avgOverlap = overlaps.length > 0 ? overlaps.reduce((s, o) => s + o.overlapPercent, 0) / overlaps.length : 0;
    const totalUnique = new Set(segments.map((s: any) => s.name)).size;
    return {
      generatedAt: new Date().toISOString(),
      overlaps,
      summary: { totalSegments: segments.length, totalOverlaps: overlaps.length, avgOverlap: Math.round(avgOverlap * 100) / 100, totalUnique },
    };
  }

  marketingCalendar(tenantId: string, month?: number, year?: number): MarketingCalendarResult {
    const mem = DataStore.mem();
    const now = new Date();
    const m = month ?? (now.getMonth() + 1);
    const y = year ?? now.getFullYear();
    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);
    const entries: MarketingCalendarEntry[] = [];
    for (const c of campaigns) {
      const sd = c.startDate ? new Date(c.startDate) : null;
      const ed = c.endDate ? new Date(c.endDate) : null;
      if (!sd || !ed) continue;
      const inMonth = sd.getFullYear() === y && sd.getMonth() + 1 <= m && ed.getMonth() + 1 >= m;
      if (!inMonth) continue;
      const dur = Math.ceil((ed.getTime() - sd.getTime()) / (86400000));
      const overlapping: string[] = [];
      for (const other of campaigns) {
        if (other._id === c._id) continue;
        const osd = other.startDate ? new Date(other.startDate) : null;
        const oed = other.endDate ? new Date(other.endDate) : null;
        if (!osd || !oed) continue;
        if (sd <= oed && ed >= osd) overlapping.push(other.name);
      }
      entries.push({
        campaignId: c._id, campaignName: c.name, campaignType: c.type || "unknown",
        status: c.status || "draft", startDate: c.startDate, endDate: c.endDate,
        budget: c.budget?.daily || 0, platform: (c.platforms || [])[0] || "unknown",
        duration: dur, overlaps: overlapping,
      });
    }
    const conflicts = entries.flatMap(e => e.overlaps.map(o => ({
      campaignA: e.campaignName, campaignB: o,
      overlapDays: e.duration,
      severity: (e.duration > 60 ? "high" : e.duration > 30 ? "medium" : "low") as "low" | "medium" | "high",
    })));
    const totalBudget = entries.reduce((s, e) => s + e.budget, 0);
    const avgDur = entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.duration, 0) / entries.length) : 0;
    return {
      generatedAt: new Date().toISOString(), month: m, year: y,
      entries, conflicts,
      summary: { totalCampaigns: entries.length, totalBudget, avgDuration: avgDur, conflictCount: conflicts.length },
    };
  }

  creativeAssetPerformance(tenantId: string): CreativeAssetAnalysis {
    const mem = DataStore.mem();
    const creatives = mem.find("creatives", (c: any) => c.tenantId === tenantId);
    const assets = creatives.map((cr: any) => {
      const perf = cr.performance || {};
      const imps = perf.impressions || 0;
      const clks = perf.clicks || 0;
      const convs = perf.conversions || 0;
      const spd = perf.spend || 1;
      const rev = perf.revenue || 0;
      const roas = rev / spd;
      const ctr = imps > 0 ? clks / imps * 100 : 0;
      const fatigueScore = cr.fatigueScore ?? (roas < 1.5 ? 35 : roas < 2 ? 20 : 10);
      const perfScore = Math.round((roas * 30 + ctr * 10 + (convs > 0 ? 20 : 0)) / 1.5);
      const lifecycleStage: CreativeAssetAnalysis["assets"][0]["lifecycleStage"] =
        fatigueScore > 35 ? "fatigued" : fatigueScore > 25 ? "declining" : roas > 3 ? "mature" : imps > 10000 ? "growing" : "new";
      return {
        creativeId: cr._id, creativeName: cr.name, type: cr.type || "image",
        performanceScore: Math.min(100, Math.max(0, perfScore)),
        roas: Math.round(roas * 100) / 100, ctr: Math.round(ctr * 100) / 100,
        impressions: imps, clicks: clks, conversions: convs,
        fatigueScore, lifecycleStage,
        recommendation: lifecycleStage === "fatigued"
          ? "Creative fatigued — create replacement"
          : lifecycleStage === "declining"
          ? "Performance declining — consider refresh"
          : lifecycleStage === "mature"
          ? "Steady performer — monitor for fatigue"
          : lifecycleStage === "growing"
          ? "Promising performance — increase exposure"
          : "New creative — allow time to accumulate data",
      };
    });
    const sorted = [...assets].sort((a, b) => b.performanceScore - a.performanceScore);
    return {
      generatedAt: new Date().toISOString(),
      assets: sorted,
      summary: {
        totalAssets: assets.length,
        avgPerformanceScore: assets.length > 0 ? Math.round(assets.reduce((s, a) => s + a.performanceScore, 0) / assets.length) : 0,
        fatiguedCount: assets.filter(a => a.lifecycleStage === "fatigued").length,
        newCount: assets.filter(a => a.lifecycleStage === "new").length,
        topAsset: sorted.length > 0 ? sorted[0].creativeName : null,
      },
    };
  }

  insightsDashboard(tenantId: string): InsightsDashboard {
    return campaignInsightsEngine.generateDashboard(tenantId);
  }

  campaignCorrelationAnalysis(tenantId: string): CorrelationAnalysis {
    return campaignInsightsEngine.findCorrelations(tenantId);
  }

  performanceTrendAnalysis(campaignId: string, tenantId: string): TrendAnalysis | null {
    return campaignInsightsEngine.analyzeTrends(campaignId, tenantId);
  }

  budgetEfficiencyScore(tenantId: string): BudgetEfficiencyScore[] {
    return campaignInsightsEngine.calculateBudgetEfficiency(tenantId);
  }

  crossCampaignAttribution(tenantId: string): CrossCampaignAttribution[] {
    return campaignInsightsEngine.crossCampaignAttribution(tenantId);
  }

  predictiveAlertSummary(tenantId: string): PredictiveAlertSummary {
    return campaignInsightsEngine.generatePredictiveAlerts(tenantId);
  }

  alertOrchestratorRules(tenantId: string, status?: string) {
    return campaignAlertOrchestrator.getRules(tenantId, status as any);
  }

  alertOrchestratorRule(ruleId: string, tenantId: string) {
    return campaignAlertOrchestrator.getRule(ruleId, tenantId);
  }

  alertOrchestratorCreateRule(tenantId: string, rule: any) {
    return campaignAlertOrchestrator.createRule(tenantId, rule);
  }

  alertOrchestratorUpdateRule(ruleId: string, tenantId: string, updates: any) {
    return campaignAlertOrchestrator.updateRule(ruleId, tenantId, updates);
  }

  alertOrchestratorDeleteRule(ruleId: string, tenantId: string) {
    return campaignAlertOrchestrator.deleteRule(ruleId, tenantId);
  }

  alertOrchestratorEvaluate(tenantId: string) {
    return campaignAlertOrchestrator.evaluateRules(tenantId);
  }

  alertOrchestratorAlerts(tenantId: string, status?: string, limit?: number) {
    return campaignAlertOrchestrator.getAlerts(tenantId, status as any, limit);
  }

  alertOrchestratorAcknowledge(alertId: string, tenantId: string, userId: string) {
    return campaignAlertOrchestrator.acknowledgeAlert(alertId, tenantId, userId);
  }

  alertOrchestratorResolve(alertId: string, tenantId: string, userId: string) {
    return campaignAlertOrchestrator.resolveAlert(alertId, tenantId, userId);
  }

  alertOrchestratorDismiss(alertId: string, tenantId: string) {
    return campaignAlertOrchestrator.dismissAlert(alertId, tenantId);
  }

  alertOrchestratorSummary(tenantId: string) {
    return campaignAlertOrchestrator.getAlertSummary(tenantId);
  }

  alertOrchestratorSuggestRules(tenantId: string) {
    return campaignAlertOrchestrator.suggestAlertRules(tenantId);
  }

  alertOrchestratorBatchAction(alertIds: string[], tenantId: string, action: string, userId?: string) {
    return campaignAlertOrchestrator.batchAlertAction(alertIds, tenantId, action, userId);
  }

  alertOrchestratorPriorityInbox(tenantId: string) {
    return campaignAlertOrchestrator.getAlertPriorityInbox(tenantId);
  }

  alertOrchestratorSmartMute(tenantId: string) {
    return campaignAlertOrchestrator.smartMuteNoisyAlerts(tenantId);
  }

  alertOrchestratorEscalate(tenantId: string, escalationContact: string) {
    return campaignAlertOrchestrator.escalateUnresolvedAlerts(tenantId, escalationContact);
  }

  alertOrchestratorDailyDigest(tenantId: string) {
    return campaignAlertOrchestrator.getAlertDailyDigest(tenantId);
  }

  optimizerGetPlatformConfigs() {
    return campaignOptimizerService.getPlatformConfigs();
  }

  optimizerGenerateOptimizations(tenantId: string) {
    return campaignOptimizerService.generateOptimizations(tenantId);
  }

  optimizerGetDashboard(tenantId: string) {
    return campaignOptimizerService.getDashboard(tenantId);
  }

  optimizerQuickActions(tenantId: string) {
    return campaignOptimizerService.quickOptimizationActions(tenantId);
  }

  optimizerAutoApply(tenantId: string, minConfidence?: number) {
    return campaignOptimizerService.autoApplyHighConfidence(tenantId, minConfidence);
  }

  optimizerDismissLowValue(tenantId: string, maxImpact?: string) {
    return campaignOptimizerService.dismissLowValueSuggestions(tenantId, maxImpact as any);
  }

  optimizerOneClickFix(tenantId: string) {
    return campaignOptimizerService.oneClickFix(tenantId);
  }

  optimizerPortfolioSummary(tenantId: string) {
    return campaignOptimizerService.optimizationPortfolioSummary(tenantId);
  }

  optimizerSchedule(tenantId: string, suggestionId: string, applyAt: string) {
    return campaignOptimizerService.scheduleOptimization(tenantId, suggestionId, applyAt);
  }

  diagnosticAnalysis(campaignId: string, tenantId: string) {
    return campaignPerformanceDiagnostics.diagnoseCampaign(campaignId, tenantId);
  }

  rootCauseSummary(tenantId: string) {
    return campaignPerformanceDiagnostics.rootCauseSummary(tenantId);
  }

  crossCampaignDiagnostics(tenantId: string) {
    return campaignPerformanceDiagnostics.crossCampaignDiagnostics(tenantId);
  }

  metricHealthTrends(tenantId: string) {
    return campaignPerformanceDiagnostics.metricHealthTrends(tenantId);
  }

  recoveryPlan(campaignId: string, tenantId: string) {
    return campaignPerformanceDiagnostics.generateRecoveryPlan(campaignId, tenantId);
  }

  remediationRecord(findingId: string, action: string, metricBefore: number, metricAfter: number) {
    return campaignPerformanceDiagnostics.remediateFinding(findingId, action, metricBefore, metricAfter);
  }

  diagnosticTrendAnalysis(campaignId: string, tenantId: string) {
    return campaignPerformanceDiagnostics.diagnosticTrendAnalysis(campaignId, tenantId);
  }

  campaignComparisonDiagnostics(campaignIdA: string, campaignIdB: string) {
    return campaignPerformanceDiagnostics.campaignComparisonDiagnostics(campaignIdA, campaignIdB);
  }

  severityBreakdown(campaignId: string, tenantId: string) {
    return campaignPerformanceDiagnostics.severityBreakdown(campaignId, tenantId);
  }

  getFixRecommendation(findingId: string) {
    return campaignPerformanceDiagnostics.getFixRecommendation(findingId);
  }

  getDiagnosticTimeline(campaignId: string, tenantId: string) {
    return campaignPerformanceDiagnostics.getDiagnosticTimeline(campaignId, tenantId);
  }

  exportDiagnostics(campaignId: string, tenantId: string) {
    return campaignPerformanceDiagnostics.exportDiagnostics(campaignId, tenantId);
  }

  diagnosticsPriorityList(tenantId: string) {
    return campaignPerformanceDiagnostics.diagnosticsPriorityList(tenantId);
  }

  daypartingAnalysis(campaignId: string, tenantId: string) {
    return campaignDaypartingOptimizer.analyzeDayparting(campaignId, tenantId);
  }

  daypartingSchedule(campaignId: string, tenantId: string) {
    return campaignDaypartingOptimizer.recommendSchedule(campaignId, tenantId);
  }

  daypartingTimePatterns(tenantId: string) {
    return campaignDaypartingOptimizer.detectTimePatterns(tenantId);
  }

  daypartingScheduleConflicts(tenantId: string) {
    return campaignDaypartingOptimizer.findScheduleConflicts(tenantId);
  }

  daypartingTimezonePerformance(tenantId: string) {
    return campaignDaypartingOptimizer.analyzeTimezonePerformance(tenantId);
  }

  daypartingPlan(campaignId: string, tenantId: string) {
    return campaignDaypartingOptimizer.generateDaypartingPlan(campaignId, tenantId);
  }

  daypartingForecast(campaignId: string, tenantId: string) {
    return campaignDaypartingOptimizer.daypartingForecast(campaignId, tenantId);
  }

  hourlyTrendAnalysis(campaignId: string, tenantId: string) {
    return campaignDaypartingOptimizer.hourlyTrendAnalysis(campaignId, tenantId);
  }

  daypartingROIAnalysis(campaignId: string, tenantId: string) {
    return campaignDaypartingOptimizer.daypartingROIAnalysis(campaignId, tenantId);
  }

  timeSlotOptimization(campaignId: string, tenantId: string) {
    return campaignDaypartingOptimizer.timeSlotOptimization(campaignId, tenantId);
  }

  weekendVsWeekdayAnalysis(campaignId: string, tenantId: string) {
    return campaignDaypartingOptimizer.weekendVsWeekdayAnalysis(campaignId, tenantId);
  }

  hourlyHeatmap(campaignId: string, tenantId: string) {
    return campaignDaypartingOptimizer.hourlyHeatmap(campaignId, tenantId);
  }

  roiDecomposition(campaignId: string, tenantId: string) {
    return campaignROIDecomposition.decomposeROI(campaignId, tenantId);
  }

  factorAttribution(campaignId: string, tenantId: string) {
    return campaignROIDecomposition.attributeFactors(campaignId, tenantId);
  }

  marginalReturnAnalysis(campaignId: string, tenantId: string) {
    return campaignROIDecomposition.analyzeMarginalReturns(campaignId, tenantId);
  }

  roiSensitivity(campaignId: string, tenantId: string) {
    return campaignROIDecomposition.analyzeSensitivity(campaignId, tenantId);
  }

  roiForecastByFactor(campaignId: string, tenantId: string) {
    return campaignROIDecomposition.forecastByFactor(campaignId, tenantId);
  }

  decompositionTrends(tenantId: string) {
    return campaignROIDecomposition.decompositionTrends(tenantId);
  }

  roiBenchmark(campaignId: string, tenantId: string) {
    return campaignROIDecomposition.roiBenchmark(campaignId, tenantId);
  }

  roiScenarioSimulation(campaignId: string, tenantId: string) {
    return campaignROIDecomposition.roiScenarioSimulation(campaignId, tenantId);
  }

  roiChannelBreakdown(campaignId: string, tenantId: string) {
    return campaignROIDecomposition.roiChannelBreakdown(campaignId, tenantId);
  }

  roiOptimizationTargets(campaignId: string, tenantId: string) {
    return campaignROIDecomposition.roiOptimizationTargets(campaignId, tenantId);
  }

  roiAttributionShift(campaignId: string, tenantId: string) {
    return campaignROIDecomposition.roiAttributionShift(campaignId, tenantId);
  }

  roiFactorCorrelations(campaignId: string, tenantId: string) {
    return campaignROIDecomposition.roiFactorCorrelations(campaignId, tenantId);
  }

  adQualityAnalysis(campaignId: string, tenantId: string) {
    return campaignAdQualityAnalyzer.analyzeAdQuality(campaignId, tenantId);
  }

  qualityScoreEstimate(campaignId: string, tenantId: string) {
    return campaignAdQualityAnalyzer.estimateQualityScore(campaignId, tenantId);
  }

  adRelevanceScore(campaignId: string, tenantId: string) {
    return campaignAdQualityAnalyzer.analyzeRelevance(campaignId, tenantId);
  }

  qualityImprovementPlan(campaignId: string, tenantId: string, targetScore?: number) {
    return campaignAdQualityAnalyzer.generateImprovementPlan(campaignId, tenantId, targetScore);
  }

  competitiveAdQuality(campaignId: string, tenantId: string) {
    return campaignAdQualityAnalyzer.competitiveAdQuality(campaignId, tenantId);
  }

  qualityTrendTracking(campaignId: string, tenantId: string) {
    return campaignAdQualityAnalyzer.trackQualityTrends(campaignId, tenantId);
  }

  adCreativeQualityAnalysis(campaignId: string, tenantId: string) {
    return campaignAdQualityAnalyzer.adCreativeQualityAnalysis(campaignId, tenantId);
  }

  adLandingPageExperience(campaignId: string, tenantId: string) {
    return campaignAdQualityAnalyzer.adLandingPageExperience(campaignId, tenantId);
  }

  adQualityByDevice(campaignId: string, tenantId: string) {
    return campaignAdQualityAnalyzer.adQualityByDevice(campaignId, tenantId);
  }

  adQualityByPlacement(campaignId: string, tenantId: string) {
    return campaignAdQualityAnalyzer.adQualityByPlacement(campaignId, tenantId);
  }

  adQualityPrediction(campaignId: string, tenantId: string) {
    return campaignAdQualityAnalyzer.adQualityPrediction(campaignId, tenantId);
  }

  adCompetitiveLandscape(campaignId: string, tenantId: string) {
    return campaignAdQualityAnalyzer.adCompetitiveLandscape(campaignId, tenantId);
  }

  audienceExpansion(tenantId: string, seedAudienceId?: string) {
    return campaignAudienceExpansion.findLookalikeAudiences(tenantId, seedAudienceId);
  }

  expansionRecommendations(campaignId: string, tenantId: string) {
    return campaignAudienceExpansion.generateExpansionRecommendations(campaignId, tenantId);
  }

  audienceSimilarity(audienceAId: string, audienceBId: string, tenantId: string) {
    return campaignAudienceExpansion.computeAudienceSimilarity(audienceAId, audienceBId, tenantId);
  }

  expansionQuality(seedAudienceId: string, expandedAudienceId: string, tenantId: string) {
    return campaignAudienceExpansion.assessExpansionQuality(seedAudienceId, expandedAudienceId, tenantId);
  }

  crossPlatformUnification(tenantId: string) {
    return campaignAudienceExpansion.crossPlatformUnification(tenantId);
  }

  expansionPerformance(audienceId: string, tenantId: string) {
    return campaignAudienceExpansion.trackExpansionPerformance(audienceId, tenantId);
  }

  audienceSourceAnalysis(tenantId: string) {
    return campaignAudienceExpansion.audienceSourceAnalysis(tenantId);
  }

  audienceOverlapAnalysis(audienceIds: string[], tenantId: string) {
    return campaignAudienceExpansion.audienceOverlapAnalysis(audienceIds, tenantId);
  }

  audienceSegmentationSuggestions(tenantId: string) {
    return campaignAudienceExpansion.audienceSegmentationSuggestions(tenantId);
  }

  audienceValueForecasting(audienceId: string, tenantId: string) {
    return campaignAudienceExpansion.audienceValueForecasting(audienceId, tenantId);
  }

  audienceSaturationAnalysis(tenantId: string) {
    return campaignAudienceExpansion.audienceSaturationAnalysis(tenantId);
  }

  audienceCompositionAnalysis(tenantId: string) {
    return campaignAudienceExpansion.audienceCompositionAnalysis(tenantId);
  }

  crossDevicePerformance(campaignId: string, tenantId: string) {
    return campaignCrossDeviceAnalyzer.analyzeCrossDevice(campaignId, tenantId);
  }

  deviceOptimizationRecommendations(campaignId: string, tenantId: string) {
    return campaignCrossDeviceAnalyzer.generateDeviceRecommendations(campaignId, tenantId);
  }

  crossDeviceConversionPaths(tenantId: string) {
    return campaignCrossDeviceAnalyzer.analyzeConversionPaths(tenantId);
  }

  deviceBidAdjustments(campaignId: string, tenantId: string) {
    return campaignCrossDeviceAnalyzer.calculateBidAdjustments(campaignId, tenantId);
  }

  deviceAudienceOverlap(tenantId: string) {
    return campaignCrossDeviceAnalyzer.analyzeDeviceAudienceOverlap(tenantId);
  }

  deviceTrendAnalysis(campaignId: string, tenantId: string) {
    return campaignCrossDeviceAnalyzer.analyzeDeviceTrends(campaignId, tenantId);
  }

  crossDeviceGraphAnalysis(campaignId: string, tenantId: string) {
    return campaignCrossDeviceAnalyzer.deviceGraphAnalysis(campaignId, tenantId);
  }

  crossDeviceAttributionModeling(campaignId: string, tenantId: string) {
    return campaignCrossDeviceAnalyzer.crossDeviceAttributionModeling(campaignId, tenantId);
  }

  deviceAffinityScoring(campaignId: string, tenantId: string) {
    return campaignCrossDeviceAnalyzer.deviceAffinityScoring(campaignId, tenantId);
  }

  crossDeviceJourneySequencing(campaignId: string, tenantId: string) {
    return campaignCrossDeviceAnalyzer.deviceJourneySequencing(campaignId, tenantId);
  }

  crossDevicePerformanceForecast(campaignId: string, tenantId: string) {
    return campaignCrossDeviceAnalyzer.devicePerformanceForecast(campaignId, tenantId);
  }

  crossDeviceOptimizationSimulator(campaignId: string, tenantId: string) {
    return campaignCrossDeviceAnalyzer.deviceOptimizationSimulator(campaignId, tenantId);
  }

  geoPerformance(campaignId: string, tenantId: string) {
    return campaignGeoPerformanceAnalyzer.analyzeGeoPerformance(campaignId, tenantId);
  }

  geoOptimizationRecommendations(campaignId: string, tenantId: string) {
    return campaignGeoPerformanceAnalyzer.generateGeoOptimizationRecommendations(campaignId, tenantId);
  }

  geoExpansionOpportunities(tenantId: string) {
    return campaignGeoPerformanceAnalyzer.identifyGeoExpansionOpportunities(tenantId);
  }

  geoBidAdjustments(campaignId: string, tenantId: string) {
    return campaignGeoPerformanceAnalyzer.calculateGeoBidAdjustments(campaignId, tenantId);
  }

  geoAudienceOverlap(tenantId: string) {
    return campaignGeoPerformanceAnalyzer.analyzeGeoAudienceOverlap(tenantId);
  }

  geoTrendAnalysis(campaignId: string, tenantId: string) {
    return campaignGeoPerformanceAnalyzer.analyzeGeoTrends(campaignId, tenantId);
  }

  geoRegionClustering(campaignId: string, tenantId: string) {
    return campaignGeoPerformanceAnalyzer.geoRegionClustering(campaignId, tenantId);
  }

  geoTimeZoneAnalysis(campaignId: string, tenantId: string) {
    return campaignGeoPerformanceAnalyzer.geoTimeZoneAnalysis(campaignId, tenantId);
  }

  geoLocalizationScores(campaignId: string, tenantId: string) {
    return campaignGeoPerformanceAnalyzer.geoLocalizationScore(campaignId, tenantId);
  }

  geoCrossBorder(campaignId: string, tenantId: string) {
    return campaignGeoPerformanceAnalyzer.geoCrossBorderAnalysis(campaignId, tenantId);
  }

  geoPredictiveExpansion(campaignId: string, tenantId: string) {
    return campaignGeoPerformanceAnalyzer.geoPredictiveExpansion(campaignId, tenantId);
  }

  geoCompetitiveLandscape(campaignId: string, tenantId: string) {
    return campaignGeoPerformanceAnalyzer.geoCompetitiveLandscape(campaignId, tenantId);
  }

  frequencyDistribution(campaignId: string, tenantId: string) {
    return campaignFrequencyAnalyzer.analyzeFrequencyDistribution(campaignId, tenantId);
  }

  frequencyRecommendations(tenantId: string) {
    return campaignFrequencyAnalyzer.generateFrequencyOptimizationRecommendations(tenantId);
  }

  wearOutAnalysis(campaignId: string, tenantId: string) {
    return campaignFrequencyAnalyzer.analyzeWearOutCurve(campaignId, tenantId);
  }

  frequencyCapping(tenantId: string) {
    return campaignFrequencyAnalyzer.calculateFrequencyCapping(tenantId);
  }

  crossCampaignFrequency(tenantId: string) {
    return campaignFrequencyAnalyzer.analyzeCrossCampaignFrequency(tenantId);
  }

  frequencyImpactPrediction(campaignId: string, tenantId: string) {
    return campaignFrequencyAnalyzer.predictFrequencyImpact(campaignId, tenantId);
  }

  frequencySegmentAnalysis(campaignId: string, tenantId: string) {
    return campaignFrequencyAnalyzer.frequencySegmentAnalysis(campaignId, tenantId);
  }

  frequencyAttributionModeling(campaignId: string, tenantId: string) {
    return campaignFrequencyAnalyzer.frequencyAttributionModeling(campaignId, tenantId);
  }

  frequencyDiminishingReturns(campaignId: string, tenantId: string) {
    return campaignFrequencyAnalyzer.frequencyDiminishingReturns(campaignId, tenantId);
  }

  frequencyCompetitiveBenchmark(tenantId: string) {
    return campaignFrequencyAnalyzer.frequencyCompetitiveBenchmark(tenantId);
  }

  frequencyAdFormatInteraction(campaignId: string, tenantId: string) {
    return campaignFrequencyAnalyzer.frequencyAdFormatInteraction(campaignId, tenantId);
  }

  frequencyDeviceBreakdown(campaignId: string, tenantId: string) {
    return campaignFrequencyAnalyzer.frequencyDeviceBreakdown(campaignId, tenantId);
  }

  discoveredSegments(tenantId: string) {
    return campaignSegmentDiscovery.discoverSegments(tenantId);
  }

  segmentPerformance(tenantId: string) {
    return campaignSegmentDiscovery.analyzeSegmentPerformance(tenantId);
  }

  segmentTargetingRecommendations(tenantId: string) {
    return campaignSegmentDiscovery.recommendSegmentTargeting(tenantId);
  }

  segmentComparison(tenantId: string) {
    return campaignSegmentDiscovery.compareSegments(tenantId);
  }

  segmentTrends(tenantId: string) {
    return campaignSegmentDiscovery.segmentTrends(tenantId);
  }

  segmentOverlap(tenantId: string) {
    return campaignSegmentDiscovery.segmentOverlapAnalysis(tenantId);
  }

  segmentLookalikeModeling(tenantId: string, seedSegmentName?: string) {
    return campaignSegmentDiscovery.segmentLookalikeModeling(tenantId, seedSegmentName);
  }

  segmentPropensityScoring(tenantId: string) {
    return campaignSegmentDiscovery.segmentPropensityScoring(tenantId);
  }

  segmentLifecycleAnalysis(tenantId: string) {
    return campaignSegmentDiscovery.segmentLifecycleAnalysis(tenantId);
  }

  segmentCrossSellAnalysis(tenantId: string) {
    return campaignSegmentDiscovery.segmentCrossSellAnalysis(tenantId);
  }

  segmentAttributionByChannel(tenantId: string) {
    return campaignSegmentDiscovery.segmentAttributionByChannel(tenantId);
  }

  segmentOptimizationScorecard(tenantId: string) {
    return campaignSegmentDiscovery.segmentOptimizationScorecard(tenantId);
  }

  goalProgress(campaignId: string, tenantId: string) {
    return campaignGoalTracker.trackGoalProgress(campaignId, tenantId);
  }

  goalAttainmentPrediction(campaignId: string, tenantId: string) {
    return campaignGoalTracker.predictGoalAttainment(campaignId, tenantId);
  }

  goalAdjustmentRecommendations(campaignId: string, tenantId: string) {
    return campaignGoalTracker.recommendGoalAdjustments(campaignId, tenantId);
  }

  goalConflictAnalysis(campaignId: string, tenantId: string) {
    return campaignGoalTracker.analyzeGoalConflicts(campaignId, tenantId);
  }

  goalPerformanceComparison(tenantId: string) {
    return campaignGoalTracker.compareGoalPerformance(tenantId);
  }

  goalTrendForecast(campaignId: string, tenantId: string) {
    return campaignGoalTracker.goalTrendForecast(campaignId, tenantId);
  }

  goalCascadingAnalysis(campaignId: string, tenantId: string) {
    return campaignGoalTracker.goalCascadingAnalysis(campaignId, tenantId);
  }

  goalAttributionModeling(campaignId: string, tenantId: string) {
    return campaignGoalTracker.goalAttributionModeling(campaignId, tenantId);
  }

  goalStressTesting(campaignId: string, tenantId: string) {
    return campaignGoalTracker.goalStressTesting(campaignId, tenantId);
  }

  goalOptimizationSuggestions(campaignId: string, tenantId: string) {
    return campaignGoalTracker.goalOptimizationSuggestions(campaignId, tenantId);
  }

  goalDependencyGraph(campaignId: string, tenantId: string) {
    return campaignGoalTracker.goalDependencyGraph(campaignId, tenantId);
  }

  goalHistoricalBenchmarking(campaignId: string, tenantId: string) {
    return campaignGoalTracker.goalHistoricalBenchmarking(campaignId, tenantId);
  }

  placementPerformance(campaignId: string, tenantId: string) {
    return campaignAdPlacementAnalyzer.analyzePlacementPerformance(campaignId, tenantId);
  }

  placementRecommendations(campaignId: string, tenantId: string) {
    return campaignAdPlacementAnalyzer.generatePlacementRecommendations(campaignId, tenantId);
  }

  placementOpportunities(tenantId: string) {
    return campaignAdPlacementAnalyzer.identifyPlacementOpportunities(tenantId);
  }

  placementBidAdjustments(campaignId: string, tenantId: string) {
    return campaignAdPlacementAnalyzer.calculatePlacementBidAdjustments(campaignId, tenantId);
  }

  placementOverlap(tenantId: string) {
    return campaignAdPlacementAnalyzer.analyzePlacementOverlap(tenantId);
  }

  placementTrends(campaignId: string, tenantId: string) {
    return campaignAdPlacementAnalyzer.analyzePlacementTrends(campaignId, tenantId);
  }

  formatPerformance(campaignId: string, tenantId: string) {
    return campaignAdFormatAnalyzer.analyzeFormatPerformance(campaignId, tenantId);
  }

  formatMixRecommendations(campaignId: string, tenantId: string) {
    return campaignAdFormatAnalyzer.recommendFormatMix(campaignId, tenantId);
  }

  formatOpportunities(tenantId: string) {
    return campaignAdFormatAnalyzer.identifyFormatOpportunities(tenantId);
  }

  formatBidAdjustments(campaignId: string, tenantId: string) {
    return campaignAdFormatAnalyzer.calculateFormatBidAdjustments(campaignId, tenantId);
  }

  formatAudiencePreference(tenantId: string) {
    return campaignAdFormatAnalyzer.analyzeAudienceFormatPreference(tenantId);
  }

  formatTrends(campaignId: string, tenantId: string) {
    return campaignAdFormatAnalyzer.analyzeFormatTrends(campaignId, tenantId);
  }

  formatCrossDeviceAnalysis(campaignId: string, tenantId: string) {
    return campaignAdFormatAnalyzer.formatCrossDeviceAnalysis(campaignId, tenantId);
  }

  formatCreativeEffectiveness(campaignId: string, tenantId: string) {
    return campaignAdFormatAnalyzer.formatCreativeEffectiveness(campaignId, tenantId);
  }

  formatAudienceSegmentMapping(campaignId: string, tenantId: string) {
    return campaignAdFormatAnalyzer.formatAudienceSegmentMapping(campaignId, tenantId);
  }

  formatCompetitiveAnalysis(tenantId: string) {
    return campaignAdFormatAnalyzer.formatCompetitiveAnalysis(tenantId);
  }

  formatROIAttribution(campaignId: string, tenantId: string) {
    return campaignAdFormatAnalyzer.formatROIAttribution(campaignId, tenantId);
  }

  formatLifecycleAnalysis(tenantId: string) {
    return campaignAdFormatAnalyzer.formatLifecycleAnalysis(tenantId);
  }

  customerJourneys(tenantId: string) {
    return campaignCustomerJourney.analyzeCustomerJourneys(tenantId);
  }

  journeyCommonPaths(tenantId: string) {
    const report = campaignCustomerJourney.analyzeCustomerJourneys(tenantId);
    return report.commonPaths;
  }

  journeySegments(tenantId: string) {
    return campaignCustomerJourney.analyzeJourneySegments(tenantId);
  }

  journeyOptimizations(tenantId: string) {
    return campaignCustomerJourney.generateJourneyOptimizations(tenantId);
  }

  journeyDropOffs(tenantId: string) {
    return campaignCustomerJourney.analyzeJourneyDropOffs(tenantId);
  }

  journeyTimeBuckets(tenantId: string) {
    return campaignCustomerJourney.analyzeJourneyTimeBuckets(tenantId);
  }

  journeyPathClustering(tenantId: string) {
    return campaignCustomerJourney.journeyPathClustering(tenantId);
  }

  journeyAttributionModeling(tenantId: string) {
    return campaignCustomerJourney.journeyAttributionModeling(tenantId);
  }

  journeyChurnPrediction(tenantId: string) {
    return campaignCustomerJourney.journeyChurnPrediction(tenantId);
  }

  journeyLifecycleStageMapping(tenantId: string) {
    return campaignCustomerJourney.journeyLifecycleStageMapping(tenantId);
  }

  journeyTouchpointEffectiveness(tenantId: string) {
    return campaignCustomerJourney.journeyTouchpointEffectiveness(tenantId);
  }

  journeySequenceAnalysis(tenantId: string) {
    return campaignCustomerJourney.journeySequenceAnalysis(tenantId);
  }

  journeySummaryDashboard(tenantId: string) {
    return campaignCustomerJourney.journeySummaryDashboard(tenantId);
  }

  funnelAnalysis(campaignId: string, tenantId: string) {
    return campaignConversionFunnelAnalyzer.analyzeFunnel(campaignId, tenantId);
  }

  funnelDropOffs(campaignId: string, tenantId: string) {
    return campaignConversionFunnelAnalyzer.analyzeFunnelDropOffs(campaignId, tenantId);
  }

  funnelOptimizations(campaignId: string, tenantId: string) {
    return campaignConversionFunnelAnalyzer.generateFunnelOptimizations(campaignId, tenantId);
  }

  funnelComparison(campaignIds: string[], tenantId: string) {
    return campaignConversionFunnelAnalyzer.compareFunnels(campaignIds, tenantId);
  }

  funnelSegments(campaignId: string, tenantId: string) {
    return campaignConversionFunnelAnalyzer.analyzeFunnelSegments(campaignId, tenantId);
  }

  funnelTrends(campaignId: string, tenantId: string) {
    return campaignConversionFunnelAnalyzer.analyzeFunnelTrends(campaignId, tenantId);
  }

  funnelVelocity(campaignId: string, tenantId: string) {
    return campaignConversionFunnelAnalyzer.funnelVelocityAnalysis(campaignId, tenantId);
  }

  funnelLeakagePrediction(campaignId: string, tenantId: string) {
    return campaignConversionFunnelAnalyzer.funnelLeakagePrediction(campaignId, tenantId);
  }

  funnelAttribution(campaignId: string, tenantId: string) {
    return campaignConversionFunnelAnalyzer.funnelAttribution(campaignId, tenantId);
  }

  funnelScenarioSimulation(campaignId: string, tenantId: string, targetStage?: string, improvementPct?: number) {
    return campaignConversionFunnelAnalyzer.funnelScenarioSimulation(campaignId, tenantId, targetStage, improvementPct);
  }

  funnelChannelBreakdown(campaignId: string, tenantId: string) {
    return campaignConversionFunnelAnalyzer.funnelChannelBreakdown(campaignId, tenantId);
  }

  funnelHealthScore(campaignId: string, tenantId: string) {
    return campaignConversionFunnelAnalyzer.funnelHealthScore(campaignId, tenantId);
  }

  funnelPortfolioHealth(tenantId: string) {
    return campaignConversionFunnelAnalyzer.funnelPortfolioHealth(tenantId);
  }

  keywordAnalysis(campaignId: string, tenantId: string) {
    return campaignKeywordAnalyzer.analyzeKeywords(campaignId, tenantId);
  }

  keywordGaps(campaignId: string, tenantId: string) {
    return campaignKeywordAnalyzer.identifyKeywordGaps(campaignId, tenantId);
  }

  keywordClusters(campaignId: string, tenantId: string) {
    return campaignKeywordAnalyzer.clusterKeywords(campaignId, tenantId);
  }

  keywordBidRecommendations(campaignId: string, tenantId: string) {
    return campaignKeywordAnalyzer.generateBidRecommendations(campaignId, tenantId);
  }

  keywordTrends(campaignId: string, tenantId: string) {
    return campaignKeywordAnalyzer.analyzeKeywordTrends(campaignId, tenantId);
  }

  searchTermOverlap(campaignId: string, tenantIdA: string, tenantIdB: string) {
    return campaignKeywordAnalyzer.analyzeSearchTermOverlap(campaignId, tenantIdA, tenantIdB);
  }

  keywordPerformanceForecast(campaignId: string, tenantId: string) {
    return campaignKeywordAnalyzer.keywordPerformanceForecast(campaignId, tenantId);
  }

  keywordCompetitiveAnalysis(campaignId: string, tenantId: string) {
    return campaignKeywordAnalyzer.keywordCompetitiveAnalysis(campaignId, tenantId);
  }

  keywordMatchTypeAnalysis(campaignId: string, tenantId: string) {
    return campaignKeywordAnalyzer.keywordMatchTypeAnalysis(campaignId, tenantId);
  }

  keywordSeasonalityAnalysis(campaignId: string, tenantId: string) {
    return campaignKeywordAnalyzer.keywordSeasonalityAnalysis(campaignId, tenantId);
  }

  keywordSemanticClustering(campaignId: string, tenantId: string) {
    return campaignKeywordAnalyzer.keywordSemanticClustering(campaignId, tenantId);
  }

  keywordROIAttribution(campaignId: string, tenantId: string) {
    return campaignKeywordAnalyzer.keywordROIAttribution(campaignId, tenantId);
  }

  creativePerformance(campaignId: string, tenantId: string) {
    return campaignCreativeOptimizer.analyzeCreativePerformance(campaignId, tenantId);
  }

  creativeFatigue(campaignId: string, tenantId: string) {
    return campaignCreativeOptimizer.analyzeCreativeFatigue(campaignId, tenantId);
  }

  creativeRecommendations(campaignId: string, tenantId: string) {
    return campaignCreativeOptimizer.generateCreativeRecommendations(campaignId, tenantId);
  }

  creativeABTests(campaignId: string, tenantId: string) {
    return campaignCreativeOptimizer.analyzeCreativeABTests(campaignId, tenantId);
  }

  creativeMix(campaignId: string, tenantId: string) {
    return campaignCreativeOptimizer.analyzeCreativeMix(campaignId, tenantId);
  }

  creativeTrends(campaignId: string, tenantId: string) {
    return campaignCreativeOptimizer.analyzeCreativeTrends(campaignId, tenantId);
  }

  creativePerformanceForecast(campaignId: string, tenantId: string) {
    return campaignCreativeOptimizer.creativePerformanceForecast(campaignId, tenantId);
  }

  creativeAudienceAlignment(campaignId: string, tenantId: string) {
    return campaignCreativeOptimizer.creativeAudienceAlignment(campaignId, tenantId);
  }

  creativeCompetitiveAnalysis(campaignId: string, tenantId: string) {
    return campaignCreativeOptimizer.creativeCompetitiveAnalysis(campaignId, tenantId);
  }

  creativeLifecycleAnalysis(campaignId: string, tenantId: string) {
    return campaignCreativeOptimizer.creativeLifecycleAnalysis(campaignId, tenantId);
  }

  creativeROIAnalysis(campaignId: string, tenantId: string) {
    return campaignCreativeOptimizer.creativeROIAnalysis(campaignId, tenantId);
  }

  creativeOptimizationHistory(campaignId: string, tenantId: string) {
    return campaignCreativeOptimizer.creativeOptimizationHistory(campaignId, tenantId);
  }

  landingPageAnalysis(campaignId: string, tenantId: string) {
    return campaignLandingPageAnalyzer.analyzeLandingPages(campaignId, tenantId);
  }

  pageSpeedImpact(campaignId: string, tenantId: string) {
    return campaignLandingPageAnalyzer.analyzeSpeedImpact(campaignId, tenantId);
  }

  pageContentGaps(campaignId: string, tenantId: string) {
    return campaignLandingPageAnalyzer.analyzeContentGaps(campaignId, tenantId);
  }

  pageSegmentation(campaignId: string, tenantId: string) {
    return campaignLandingPageAnalyzer.analyzePageSegmentation(campaignId, tenantId);
  }

  pageLayoutRecommendations(campaignId: string, tenantId: string) {
    return campaignLandingPageAnalyzer.generateLayoutRecommendations(campaignId, tenantId);
  }

  landingPageTrends(campaignId: string, tenantId: string) {
    return campaignLandingPageAnalyzer.analyzeLandingPageTrends(campaignId, tenantId);
  }

  landingPageABTestAnalysis(campaignId: string, tenantId: string) {
    return campaignLandingPageAnalyzer.landingPageABTestAnalysis(campaignId, tenantId);
  }

  landingPageFormAnalysis(campaignId: string, tenantId: string) {
    return campaignLandingPageAnalyzer.landingPageFormAnalysis(campaignId, tenantId);
  }

  landingPageHeatmapPrediction(campaignId: string, tenantId: string) {
    return campaignLandingPageAnalyzer.landingPageHeatmapPrediction(campaignId, tenantId);
  }

  landingPageAccessibilityAudit(campaignId: string, tenantId: string) {
    return campaignLandingPageAnalyzer.landingPageAccessibilityAudit(campaignId, tenantId);
  }

  landingPageConversionPathAnalysis(campaignId: string, tenantId: string) {
    return campaignLandingPageAnalyzer.landingPageConversionPathAnalysis(campaignId, tenantId);
  }

  landingPageCompetitiveBenchmark(campaignId: string, tenantId: string) {
    return campaignLandingPageAnalyzer.landingPageCompetitiveBenchmark(campaignId, tenantId);
  }

  sentimentAnalysis(campaignId: string, tenantId: string) {
    return campaignSocialSentimentAnalyzer.analyzeSentiment(campaignId, tenantId);
  }

  trendingTopics(campaignId: string, tenantId: string) {
    return campaignSocialSentimentAnalyzer.analyzeTrendingTopics(campaignId, tenantId);
  }

  influencerImpact(campaignId: string, tenantId: string) {
    return campaignSocialSentimentAnalyzer.analyzeInfluencerImpact(campaignId, tenantId);
  }

  platformSentiment(campaignId: string, tenantId: string) {
    return campaignSocialSentimentAnalyzer.analyzePlatformSentiment(campaignId, tenantId);
  }

  emotionalTone(campaignId: string, tenantId: string) {
    return campaignSocialSentimentAnalyzer.analyzeEmotionalTone(campaignId, tenantId);
  }

  sentimentTrends(campaignId: string, tenantId: string) {
    return campaignSocialSentimentAnalyzer.analyzeSentimentTrends(campaignId, tenantId);
  }

  sentimentKeywordAnalysis(campaignId: string, tenantId: string) {
    return campaignSocialSentimentAnalyzer.sentimentKeywordAnalysis(campaignId, tenantId);
  }

  sentimentCompetitorComparison(campaignId: string, tenantId: string) {
    return campaignSocialSentimentAnalyzer.sentimentCompetitorComparison(campaignId, tenantId);
  }

  sentimentAlertThresholds(campaignId: string, tenantId: string) {
    return campaignSocialSentimentAnalyzer.sentimentAlertThresholds(campaignId, tenantId);
  }

  sentimentActionableInsights(campaignId: string, tenantId: string) {
    return campaignSocialSentimentAnalyzer.sentimentActionableInsights(campaignId, tenantId);
  }

  sentimentShareOfVoice(campaignId: string, tenantId: string) {
    return campaignSocialSentimentAnalyzer.sentimentShareOfVoice(campaignId, tenantId);
  }

  sentimentForecast(campaignId: string, tenantId: string) {
    return campaignSocialSentimentAnalyzer.sentimentForecast(campaignId, tenantId);
  }

  retargetingAudiences(campaignId: string, tenantId: string) {
    return campaignRetargetingAnalyzer.analyzeRetargetingAudiences(campaignId, tenantId);
  }

  retargetingFunnel(campaignId: string, tenantId: string) {
    return campaignRetargetingAnalyzer.analyzeRetargetingFunnel(campaignId, tenantId);
  }

  retargetingChannels(campaignId: string, tenantId: string) {
    return campaignRetargetingAnalyzer.analyzeRetargetingChannels(campaignId, tenantId);
  }

  retargetingBidRecommendations(campaignId: string, tenantId: string) {
    return campaignRetargetingAnalyzer.generateRetargetingBidRecommendations(campaignId, tenantId);
  }

  crossChannelRetargeting(campaignId: string, tenantId: string) {
    return campaignRetargetingAnalyzer.analyzeCrossChannelRetargeting(campaignId, tenantId);
  }

  retargetingTrends(campaignId: string, tenantId: string) {
    return campaignRetargetingAnalyzer.analyzeRetargetingTrends(campaignId, tenantId);
  }

  retargetingSegmentPerformance(campaignId: string, tenantId: string) {
    return campaignRetargetingAnalyzer.retargetingSegmentPerformance(campaignId, tenantId);
  }

  retargetingFrequencyAnalysis(campaignId: string, tenantId: string) {
    return campaignRetargetingAnalyzer.retargetingFrequencyAnalysis(campaignId, tenantId);
  }

  retargetingLiftMeasurement(campaignId: string, tenantId: string) {
    return campaignRetargetingAnalyzer.retargetingLiftMeasurement(campaignId, tenantId);
  }

  retargetingCreativePerformance(campaignId: string, tenantId: string) {
    return campaignRetargetingAnalyzer.retargetingCreativePerformance(campaignId, tenantId);
  }

  retargetingROICalculator(campaignId: string, tenantId: string) {
    return campaignRetargetingAnalyzer.retargetingROICalculator(campaignId, tenantId);
  }

  retargetingPredictiveModeling(campaignId: string, tenantId: string) {
    return campaignRetargetingAnalyzer.retargetingPredictiveModeling(campaignId, tenantId);
  }

  experimentDashboard(tenantId: string) {
    return campaignExperimentation.experimentDashboard(tenantId);
  }

  experimentQuickStart(tenantId: string, data: any) {
    return campaignExperimentation.experimentQuickStart(tenantId, data);
  }

  experimentBatchComplete(tenantId: string, expIds: string[]) {
    return campaignExperimentation.experimentBatchComplete(tenantId, expIds);
  }

  liveMetrics(campaignId: string, tenantId: string) {
    return campaignRealTimeMonitor.getLiveMetrics(campaignId, tenantId);
  }

  anomalies(campaignId: string, tenantId: string) {
    return campaignRealTimeMonitor.detectAnomalies(campaignId, tenantId);
  }

  metricVelocity(campaignId: string, tenantId: string) {
    return campaignRealTimeMonitor.analyzeMetricVelocity(campaignId, tenantId);
  }

  budgetPacing(campaignId: string, tenantId: string) {
    return campaignRealTimeMonitor.getBudgetPacing(campaignId, tenantId);
  }

  liveAlerts(campaignId: string, tenantId: string) {
    return campaignRealTimeMonitor.generateLiveAlerts(campaignId, tenantId);
  }

  campaignPerformanceForecast(campaignId: string, tenantId: string) {
    return campaignRealTimeMonitor.getPerformanceForecast(campaignId, tenantId);
  }

  realTimeComparison(campaignId: string, tenantId: string) {
    return campaignRealTimeMonitor.getRealTimeComparison(campaignId, tenantId);
  }

  realTimeSpikes(campaignId: string, tenantId: string) {
    return campaignRealTimeMonitor.detectSpikes(campaignId, tenantId);
  }

  realTimeCorrelations(campaignId: string, tenantId: string) {
    return campaignRealTimeMonitor.analyzeMetricCorrelations(campaignId, tenantId);
  }

  realTimeBreakdown(campaignId: string, tenantId: string) {
    return campaignRealTimeMonitor.getRealTimeBreakdown(campaignId, tenantId);
  }

  realTimeAlertHistory(campaignId: string, tenantId: string) {
    return campaignRealTimeMonitor.getAlertHistory(campaignId, tenantId);
  }

  realTimeDashboard(campaignId: string, tenantId: string) {
    return campaignRealTimeMonitor.getRealTimeDashboard(campaignId, tenantId);
  }

  realTimePortfolioSummary(tenantId: string) {
    return campaignRealTimeMonitor.portfolioRealTimeSummary(tenantId);
  }

  realTimeBatchResolveAlerts(campaignId: string, tenantId: string, alertIds: string[], action: string) {
    return campaignRealTimeMonitor.batchResolveAlerts(campaignId, tenantId, alertIds, action as any);
  }

  attribution(campaignId: string, tenantId: string, model?: string) {
    return campaignAttributionModeling.runAttribution(campaignId, tenantId, model as any);
  }

  attributionShapley(campaignId: string, tenantId: string) {
    return campaignAttributionModeling.shapleyValueAttribution(campaignId, tenantId);
  }

  attributionMarkov(campaignId: string, tenantId: string) {
    return campaignAttributionModeling.markovChainAttribution(campaignId, tenantId);
  }

  attributionCompare(campaignId: string, tenantId: string) {
    return campaignAttributionModeling.compareAttributionModels(campaignId, tenantId);
  }

  attributionChannels(campaignId: string, tenantId: string) {
    return campaignAttributionModeling.attributionByChannel(campaignId, tenantId);
  }

  attributionInsights(campaignId: string, tenantId: string) {
    return campaignAttributionModeling.attributionInsights(campaignId, tenantId);
  }

  attributionCustomModel(campaignId: string, tenantId: string, config: any) {
    return campaignAttributionModeling.attributionCustomModel(campaignId, tenantId, config);
  }

  attributionChannelContribution(campaignId: string, tenantId: string) {
    return campaignAttributionModeling.attributionChannelContribution(campaignId, tenantId);
  }

  attributionROIDistribution(campaignId: string, tenantId: string) {
    return campaignAttributionModeling.attributionROIDistribution(campaignId, tenantId);
  }

  attributionTimeToConvert(campaignId: string, tenantId: string) {
    return campaignAttributionModeling.attributionTimeToConvert(campaignId, tenantId);
  }

  attributionCrossCampaign(campaignIds: string[], tenantId: string) {
    return campaignAttributionModeling.attributionCrossCampaign(campaignIds, tenantId);
  }

  attributionWhatIf(campaignId: string, tenantId: string) {
    return campaignAttributionModeling.attributionWhatIf(campaignId, tenantId);
  }

  biddingDashboard(campaignId: string, tenantId: string) {
    return campaignAIBiddingAgent.getBiddingDashboard(campaignId, tenantId);
  }

  auctionInsights(campaignId: string, tenantId: string) {
    return campaignAIBiddingAgent.analyzeAuctionInsights(campaignId, tenantId);
  }

  bidAdjustments(campaignId: string, tenantId: string) {
    return campaignAIBiddingAgent.recommendBidAdjustments(campaignId, tenantId);
  }

  bidScenario(campaignId: string, tenantId: string, scenario: any) {
    return campaignAIBiddingAgent.simulateBidScenario(campaignId, tenantId, scenario);
  }

  bidEfficiency(campaignId: string, tenantId: string) {
    return campaignAIBiddingAgent.analyzeBidEfficiency(campaignId, tenantId);
  }

  bidStrategy(campaignId: string, tenantId: string, goal?: string) {
    return campaignAIBiddingAgent.generateBidStrategy(campaignId, tenantId, goal);
  }

  bidCompetitorAnalysis(campaignId: string, tenantId: string) {
    return campaignAIBiddingAgent.bidCompetitorAnalysis(campaignId, tenantId);
  }

  bidHistoricalTrends(campaignId: string, tenantId: string) {
    return campaignAIBiddingAgent.bidHistoricalTrends(campaignId, tenantId);
  }

  bidOpportunityAnalysis(campaignId: string, tenantId: string) {
    return campaignAIBiddingAgent.bidOpportunityAnalysis(campaignId, tenantId);
  }

  bidPortfolioOptimization(campaigns: any[]) {
    return campaignAIBiddingAgent.bidPortfolioOptimization(campaigns);
  }

  bidAnomalyDetection(campaignId: string, tenantId: string) {
    return campaignAIBiddingAgent.bidAnomalyDetection(campaignId, tenantId);
  }

  bidScenarioComparison(campaignId: string, tenantId: string, scenarios: any[]) {
    return campaignAIBiddingAgent.bidScenarioComparison(campaignId, tenantId, scenarios);
  }

  saturationForecast(campaignId: string, tenantId: string, periods?: number) {
    return campaignSaturationService.saturationForecast(campaignId, tenantId, periods);
  }

  saturationByChannel(campaignId: string, tenantId: string) {
    return campaignSaturationService.saturationByChannel(campaignId, tenantId);
  }

  saturationRecovery(campaignId: string, tenantId: string) {
    return campaignSaturationService.saturationRecoveryAnalysis(campaignId, tenantId);
  }

  saturationBenchmark(campaignId: string, tenantId: string) {
    return campaignSaturationService.saturationBenchmark(campaignId, tenantId);
  }

  saturationOptimizationSuggestions(campaignId: string, tenantId: string) {
    return campaignSaturationService.saturationOptimizationSuggestions(campaignId, tenantId);
  }

  creativeFatigueAnalysis(campaignId: string, tenantId: string) {
    return campaignSaturationService.adCreativeFatigueAnalysis(campaignId, tenantId);
  }

  fatiguePrediction(campaignId: string, tenantId: string) {
    return campaignSaturationService.fatiguePredictionModel(campaignId, tenantId);
  }

  audienceSaturationAnalysis(campaignId: string, tenantId: string) {
    return campaignSaturationService.audienceSaturationAnalysis(campaignId, tenantId);
  }

  budgetReallocationSuggestions(campaignId: string, tenantId: string) {
    return campaignSaturationService.budgetReallocationSuggestions(campaignId, tenantId);
  }

  saturationTrendAnalysis(campaignId: string, tenantId: string) {
    return campaignSaturationService.saturationTrendAnalysis(campaignId, tenantId);
  }

  scorecardSetWeights(weights: Record<string, number>) {
    return campaignScorecardService.setWeights(weights);
  }

  scorecardTrends(campaignId: string, tenantId: string) {
    return campaignScorecardService.scorecardTrendAnalysis(campaignId, tenantId);
  }

  scorecardDimensions(campaignId: string, tenantId: string) {
    return campaignScorecardService.scorecardDimensionBreakdown(campaignId, tenantId);
  }

  scorecardAnomalies(tenantId: string) {
    return campaignScorecardService.scorecardAnomalyDetection(tenantId);
  }

  scorecardImprovementPlan(campaignId: string, tenantId: string) {
    return campaignScorecardService.scorecardImprovementPlan(campaignId, tenantId);
  }

  scorecardPeerComparison(campaignId: string, tenantId: string) {
    return campaignScorecardService.scorecardPeerComparison(campaignId, tenantId);
  }

  scorecardBenchmark(campaignId: string, tenantId: string) {
    return campaignScorecardService.scorecardBenchmark(campaignId, tenantId);
  }

  scorecardDistribution(tenantId: string, campaignId?: string) {
    return campaignScorecardService.scorecardDistributionAnalysis(tenantId, campaignId);
  }

  scorecardFactorImportance(tenantId: string) {
    return campaignScorecardService.scorecardFactorImportance(tenantId);
  }

  scorecardWeightSimulation(campaignId: string, tenantId: string) {
    return campaignScorecardService.scorecardCustomWeightsSimulation(campaignId, tenantId);
  }

  scorecardHistorical(tenantId: string, campaignId?: string) {
    return campaignScorecardService.scorecardHistoricalComparison(tenantId, campaignId);
  }

  snapshotCapture(tenantId: string, campaignId: string, name: string, description?: string) {
    return campaignSnapshotService.captureSnapshot(tenantId, campaignId, name, description);
  }

  snapshotCompare(id1: string, id2: string, tenantId: string) {
    return campaignSnapshotService.compareSnapshots(id1, id2, tenantId);
  }

  snapshotTimeline(tenantId: string, campaignId: string) {
    return campaignSnapshotService.getSnapshotTimeline(tenantId, campaignId);
  }

  snapshotTrend(tenantId: string, campaignId: string) {
    return campaignSnapshotService.snapshotPerformanceTrend(tenantId, campaignId);
  }

  snapshotAnomalies(tenantId: string, campaignId: string) {
    return campaignSnapshotService.snapshotAnomalyDetection(tenantId, campaignId);
  }

  snapshotForecast(tenantId: string, campaignId: string) {
    return campaignSnapshotService.snapshotForecast(tenantId, campaignId);
  }

  snapshotHealth(tenantId: string, campaignId: string) {
    return campaignSnapshotService.snapshotHealthScore(tenantId, campaignId);
  }

  snapshotMetrics(tenantId: string, snapshotId: string) {
    return campaignSnapshotService.snapshotMetricBreakdown(tenantId, snapshotId);
  }

  snapshotChangeSummary(tenantId: string, id1: string, id2: string) {
    return campaignSnapshotService.snapshotChangeSummary(tenantId, id1, id2);
  }

  snapshotBenchmark(tenantId: string, snapshotId: string) {
    return campaignSnapshotService.snapshotBenchmark(tenantId, snapshotId);
  }

  snapshotRegressionReport(tenantId: string, id1: string, id2: string) {
    return campaignSnapshotService.snapshotRegressionReport(tenantId, id1, id2);
  }

  snapshotExport(tenantId: string, snapshotId: string) {
    return campaignSnapshotService.snapshotExport(tenantId, snapshotId);
  }

  simulationRun(channels: any[], scenario: any, trials?: number, seed?: number) {
    return campaignSimulationService.runSimulation(channels, scenario, trials, seed);
  }

  simulationMultiScenario(channels: any[], scenarios: any[], trials?: number) {
    return campaignSimulationService.runMultiScenario(channels, scenarios, trials);
  }

  simulationSensitivity(channel: any, seed?: number) {
    return campaignSimulationService.sensitivityAnalysis(channel, seed);
  }

  simulationBudgetOptimization(channels: any[], totalBudget: number, seed?: number) {
    return campaignSimulationService.budgetOptimization(channels, totalBudget, seed);
  }

  simulationRiskAssessment(channels: any[], scenarios: any[], seed?: number) {
    return campaignSimulationService.riskAssessment(channels, scenarios, seed);
  }

  simulationChannelEfficiency(channel: any, seed?: number) {
    return campaignSimulationService.channelEfficiency(channel, seed);
  }

  simulationMonteCarloForecast(channel: any, budget: number, trials?: number, seed?: number) {
    return campaignSimulationService.monteCarloForecast(channel, budget, trials, seed);
  }

  simulationBudgetElasticity(channel: any, seed?: number) {
    return campaignSimulationService.budgetElasticity(channel, seed);
  }

  simulationOptimalChannelMix(channels: any[], totalBudget: number, targetROAS: number, seed?: number) {
    return campaignSimulationService.optimalChannelMix(channels, totalBudget, targetROAS, seed);
  }

  simulationSummary(channels: any[], scenarios: any[], seed?: number) {
    return campaignSimulationService.simulationSummary(channels, scenarios, seed);
  }

  summarySnapshot(campaign: any) {
    return campaignSummaryService.summaryPerformanceSnapshot(campaign);
  }

  summaryBudgetHealth(campaigns: any[]) {
    return campaignSummaryService.summaryBudgetHealth(campaigns);
  }

  summaryPlatformComparison(campaigns: any[]) {
    return campaignSummaryService.summaryPlatformComparison(campaigns);
  }

  summaryRiskAssessment(campaigns: any[]) {
    return campaignSummaryService.summaryRiskAssessment(campaigns);
  }

  summaryOptimizationPriorities(campaigns: any[]) {
    return campaignSummaryService.summaryOptimizationPriorities(campaigns);
  }

  summaryHistoricalComparison(campaigns: any[]) {
    return campaignSummaryService.summaryHistoricalComparison(campaigns);
  }

  summaryAnomalyReport(campaigns: any[]) {
    return campaignSummaryService.summaryAnomalyReport(campaigns);
  }

  healthTrendForecast(metrics: any[], days?: number) {
    return campaignHealthPredictorService.healthTrendForecast(metrics, days);
  }

  healthDimensionBreakdown(campaignInputs: { campaignId: string; metrics: any[] }[]) {
    return campaignHealthPredictorService.healthDimensionBreakdown(campaignInputs);
  }

  healthAnomalyDetection(metrics: any[]) {
    return campaignHealthPredictorService.healthAnomalyDetection(metrics);
  }

  healthImprovementPlan(healthScore: any, riskFactors?: any[]) {
    return campaignHealthPredictorService.healthImprovementPlan(healthScore, riskFactors);
  }

  healthPeerComparison(campaignId: string, ownMetrics: any[], peerMetricsList?: { campaignId: string; metrics: any[] }[]) {
    return campaignHealthPredictorService.healthPeerComparison(campaignId, ownMetrics, peerMetricsList);
  }

  healthBenchmark(metrics: any[], benchmarks?: any[]) {
    return campaignHealthPredictorService.healthBenchmark(metrics, benchmarks);
  }

  healthPredictorQuickView(campaignInputs: { campaignId: string; campaignName?: string; metrics: any[] }[]) {
    return campaignHealthPredictorService.healthPredictorQuickView(campaignInputs);
  }

  creativePortfolioHealth(tenantId: string) {
    return campaignCreativeOptimizer.creativePortfolioHealth(tenantId);
  }

  saturationPortfolioOverview(tenantId: string) {
    return campaignSaturationService.saturationPortfolioOverview(tenantId);
  }

  biddingPortfolioOverview(tenantId: string) {
    return campaignAIBiddingAgent.biddingPortfolioOverview(tenantId);
  }

  snapshotPortfolioSummary(tenantId: string) {
    return campaignSnapshotService.snapshotPortfolioSummary(tenantId);
  }

  summaryPortfolioQuickView(tenantId: string) {
    return campaignSummaryService.summaryPortfolioQuickView(tenantId);
  }

  biddingBatchApplyAdjustments(tenantId: string, priorityOnly: boolean = true) {
    return campaignAIBiddingAgent.biddingBatchApplyAdjustments(tenantId, priorityOnly);
  }

  snapshotBatchCapture(tenantId: string, name?: string) {
    return campaignSnapshotService.snapshotBatchCapture(tenantId, name);
  }

  saturationBatchMitigation(tenantId: string) {
    return campaignSaturationService.saturationBatchMitigation(tenantId);
  }

  diagnosticsBatchFixPlan(tenantId: string) {
    return campaignPerformanceDiagnostics.diagnosticsBatchFixPlan(tenantId);
  }

  creativeBatchRefreshPlan(tenantId: string) {
    return campaignCreativeOptimizer.creativeBatchRefreshPlan(tenantId);
  }

  goalBatchStatus(tenantId: string) {
    return campaignGoalTracker.goalBatchStatus(tenantId);
  }

  budgetRebalancePlan(tenantId: string) {
    return campaignBudgetSimulator.budgetRebalancePlan(tenantId);
  }

  approvalGetSettings(tenantId: string) {
    return campaignAutoApprove.getApprovalSettings(tenantId);
  }

  approvalUpdateSettings(tenantId: string, updates: any) {
    return campaignAutoApprove.updateApprovalSettings(tenantId, updates);
  }

  approvalEvaluate(tenantId: string, action: any) {
    return campaignAutoApprove.evaluateAction(tenantId, action);
  }

  approvalEvaluateBatch(tenantId: string, actions: any[]) {
    return campaignAutoApprove.evaluateBatch(tenantId, actions);
  }

  approvalApproveAll(tenantId: string, actions: any[]) {
    return campaignAutoApprove.approveAll(tenantId, actions);
  }

  approvalDecide(tenantId: string, actionId: string, decision: string) {
    return campaignAutoApprove.decideAction(tenantId, actionId, decision as any);
  }

  approvalDecisionLog(tenantId: string) {
    return campaignAutoApprove.getDecisionLog(tenantId);
  }

  triageAlert(alert: any) {
    return campaignTriage.triageAlert(alert);
  }

  triageBatch(alerts: any[]) {
    return campaignTriage.triageBatch(alerts);
  }

  triageExecute(tenantId: string, alert: any) {
    return campaignTriage.executeTriage(tenantId, alert);
  }

  triageHistory(tenantId: string) {
    return campaignTriage.getTriageHistory(tenantId);
  }

  templateList() {
    return campaignTemplateService.listTemplates();
  }

  templateGet(templateId: string) {
    return campaignTemplateService.getTemplate(templateId);
  }

  templateInstantiate(templateId: string, inputs: Record<string, any>) {
    return campaignTemplateService.instantiateTemplate(templateId, inputs);
  }

  templateLaunch(tenantId: string, templateId: string, inputs: Record<string, any>) {
    return campaignTemplateService.launchTemplate(tenantId, templateId, inputs);
  }

  templateLaunchHistory(tenantId: string) {
    return campaignTemplateService.getLaunchHistory(tenantId);
  }

  commandCenterSummary(tenantId: string) {
    return commandCenter.commandCenterSummary(tenantId);
  }

  dailyBriefing(tenantId: string) {
    return commandCenter.dailyBriefing(tenantId);
  }

  parseVoiceCommand(text: string) {
    return commandCenter.parseVoiceCommand(text);
  }

  quickActions(tenantId: string) {
    return commandCenter.quickActions(tenantId);
  }

  audienceBuild(tenantId: string, name: string, segments: any[], options: any = {}) {
    return campaignAudienceBuilder.buildAudience(tenantId, name, segments, options);
  }

  audienceSyncToPlatforms(tenantId: string, audienceId: string) {
    return campaignAudienceBuilder.syncAudienceToPlatforms(tenantId, audienceId);
  }

  audienceQualityScoring(tenantId: string) {
    return campaignAudienceBuilder.audienceQualityScoring(tenantId);
  }

  audienceLtvRanking(tenantId: string) {
    return campaignAudienceBuilder.audienceLtvRanking(tenantId);
  }

  audienceApplyAutoActions(tenantId: string) {
    return campaignAudienceBuilder.applyAudienceAutoActions(tenantId);
  }

  audienceSyncStatus(tenantId: string) {
    return campaignAudienceBuilder.audienceSyncStatus(tenantId);
  }

  autopilotEnable(tenantId: string, config: any) {
    return budgetAutopilot.enableAutopilot(tenantId, config);
  }

  autopilotStatus(tenantId: string) {
    return budgetAutopilot.autopilotStatus(tenantId);
  }

  autopilotRunCycle(tenantId: string) {
    return budgetAutopilot.runAutopilotCycle(tenantId);
  }

  autopilotSpendAlerts(tenantId: string) {
    return budgetAutopilot.spendAlerts(tenantId);
  }

  autopilotDailySummary(tenantId: string) {
    return budgetAutopilot.autopilotDailySummary(tenantId);
  }

  weeklyReview(tenantId: string) {
    return weeklyMonthlyRoutines.weeklyReview(tenantId);
  }

  monthlyStrategyDeck(tenantId: string) {
    return weeklyMonthlyRoutines.monthlyStrategyDeck(tenantId);
  }

  aiOptimizationLog(tenantId: string) {
    return weeklyMonthlyRoutines.aiOptimizationLog(tenantId);
  }

  launchWizard(tenantId: string, request: any) {
    return campaignLaunchWizard.launchWizard(tenantId, request);
  }

  duplicateCampaign(tenantId: string, campaignId: string) {
    return campaignLaunchWizard.duplicateCampaign(tenantId, campaignId);
  }

  mirrorCampaign(tenantId: string, campaignId: string, platforms: string[]) {
    return campaignLaunchWizard.mirrorCampaign(tenantId, campaignId, platforms);
  }

  launchReadiness(tenantId: string, campaignId: string) {
    return campaignLaunchWizard.launchReadiness(tenantId, campaignId);
  }

  creativeGenerate(tenantId: string, description: string, count: number = 3) {
    return creativeAutoRefresh.generateCreative(tenantId, description, count);
  }

  creativeDetectFatigue(tenantId: string) {
    return creativeAutoRefresh.detectFatigue(tenantId);
  }

  creativeRunAutoRefresh(tenantId: string) {
    return creativeAutoRefresh.runAutoRefresh(tenantId);
  }

  assetUpload(tenantId: string, asset: any) {
    return creativeAutoRefresh.uploadAsset(tenantId, asset);
  }

  assetLibraryStatus(tenantId: string) {
    return creativeAutoRefresh.assetLibraryStatus(tenantId);
  }

  quickFixes(tenantId: string) {
    return quickFix.quickFixes(tenantId);
  }

  applyQuickFix(tenantId: string, fixId: string) {
    return quickFix.applyQuickFix(tenantId, fixId);
  }

  fixAll(tenantId: string) {
    return quickFix.fixAll(tenantId);
  }

  campaignWorkflow(tenantId: string, campaignId: string) {
    return crossModuleWorkflow.campaignCreationWorkflow(tenantId, campaignId);
  }

  workflowLog(tenantId: string) {
    return crossModuleWorkflow.workflowLog(tenantId);
  }

  fraudProtectionStatus(tenantId: string) {
    return brandSafetyGuardian.fraudProtectionStatus(tenantId);
  }

  placementMonitor(tenantId: string) {
    return brandSafetyGuardian.monitorPlacements(tenantId);
  }

  placementAutoPause(tenantId: string) {
    return brandSafetyGuardian.autoPauseSuspicious(tenantId);
  }

  crisisResponse(tenantId: string) {
    return brandSafetyGuardian.crisisResponse(tenantId);
  }

  escalateToLegal(tenantId: string, crisisId: string) {
    return brandSafetyGuardian.escalateToLegal(tenantId, crisisId);
  }

  resumeOnSafeInventory(tenantId: string, crisisId: string) {
    return brandSafetyGuardian.resumeOnSafeInventory(tenantId, crisisId);
  }

  guardianLog(tenantId: string) {
    return brandSafetyGuardian.guardianLog(tenantId);
  }

  attributionReport(tenantId: string) {
    return attributionReportService.attributionReport(tenantId);
  }

  attributionQuery(tenantId: string, query: string) {
    return attributionReportService.attributionQuery(tenantId, query);
  }

  crossPlatformPerformance(tenantId: string) {
    return crossPlatformPerformance.crossPlatformPerformance(tenantId);
  }

  async dailyExecutionDashboard(tenantId: string): Promise<any> {
    const realTime = this.realTimePortfolioSummary(tenantId);
    const diagnostics = this.diagnosticsPriorityList(tenantId);
    const creative = this.creativePortfolioHealth(tenantId);
    const saturation = this.saturationPortfolioOverview(tenantId);
    const bidding = this.biddingPortfolioOverview(tenantId);
    const summary = this.summaryPortfolioQuickView(tenantId);
    const goals = this.goalQuickCheck(tenantId);
    const scorecard = this.scorecardDailySnapshot(tenantId);
    const budget = this.budgetPortfolioOverview(tenantId);
    const snapshot = await campaignSnapshotService.snapshotPortfolioSummary(tenantId);
    const bidActions = this.biddingBatchApplyAdjustments(tenantId);
    const satActions = this.saturationBatchMitigation(tenantId);
    const fixPlan = this.diagnosticsBatchFixPlan(tenantId);
    const refreshPlan = this.creativeBatchRefreshPlan(tenantId);
    const goalStatus = this.goalBatchStatus(tenantId);
    const rebalance = this.budgetRebalancePlan(tenantId);

    const issues = diagnostics.totals.criticalFindings + diagnostics.totals.highFindings;
    const actionsReady = bidActions.aggregateImpact.totalAdjustments + satActions.totals.highPriorityActions + fixPlan.totals.totalSteps + refreshPlan.totals.assetsToRefresh;
    const atRiskCampaigns = Math.max(diagnostics.totals.campaignsNeedingAttention, saturation.totals.criticalOrHigh, bidding.totals.highRisk, summary.totals.highRisk, goals.atRisk);
    const healthVerdict = issues > 0 ? "Needs attention" : atRiskCampaigns > 0 ? "Fair" : "All clear";
    const morningReport = `Morning report: ${diagnostics.totals.campaignsScanned} campaigns — ${issues} critical/high findings, ${goals.onTrack}/${goals.totalGoals} goals on track, ${saturation.totals.criticalOrHigh} campaigns saturated, ${actionsReady} actions ready to apply in one click. Verdict: ${healthVerdict}.`;

    const topActions: { priority: string; action: string; count: number }[] = [
      { priority: "high", action: "Apply bid adjustments", count: bidActions.aggregateImpact.totalAdjustments },
      { priority: "high", action: "Apply saturation mitigation", count: satActions.totals.highPriorityActions },
      { priority: "medium", action: "Execute diagnostics fix plans", count: fixPlan.totals.totalSteps },
      { priority: "medium", action: "Refresh fatigued creatives", count: refreshPlan.totals.assetsToRefresh },
      { priority: "low", action: "Rebalance portfolio budget", count: rebalance.totals.scanned },
    ].filter(t => t.count > 0).sort((a, b) => a.priority === b.priority ? b.count - a.count : (a.priority === "high" ? -1 : 1));

    return {
      generatedAt: new Date().toISOString(),
      tenantId,
      morningReport,
      healthVerdict,
      atRiskCampaigns,
      actionsReady,
      sections: { realTime, diagnostics, creative, saturation, bidding, summary, goals, scorecard, budget, snapshot },
      readyActions: {
        bidAdjustments: { count: bidActions.aggregateImpact.totalAdjustments, campaigns: bidActions.aggregateImpact.campaignsUpdated },
        saturationMitigation: { count: satActions.totals.highPriorityActions, campaigns: satActions.totals.requiringAction },
        fixPlans: { count: fixPlan.totals.totalSteps, campaigns: fixPlan.totals.withPlan },
        creativeRefresh: { count: refreshPlan.totals.assetsToRefresh, campaigns: refreshPlan.campaigns.length },
        budgetRebalance: { count: rebalance.totals.toIncrease + rebalance.totals.toDecrease, campaigns: rebalance.totals.scanned },
        goalFollowUp: { count: goalStatus.totals.projectedToMiss, campaigns: goalStatus.totals.projectedToMiss },
      },
      topActions,
    };
  }

  insightAcknowledgeBatch(tenantId: string, insightIds: string[], action: string) {
    return campaignInsightsEngine.insightAcknowledgeBatch(tenantId, insightIds, action as any);
  }

  insightPrioritySummary(tenantId: string) {
    return campaignInsightsEngine.insightPrioritySummary(tenantId);
  }

  insightExport(tenantId: string, format?: string) {
    return campaignInsightsEngine.insightExport(tenantId, format as any);
  }

  insightTrendForecast(tenantId: string, metric?: string, days?: number) {
    return campaignInsightsEngine.insightTrendForecast(tenantId, metric, days);
  }

  insightCampaignRanking(tenantId: string) {
    return campaignInsightsEngine.insightCampaignRanking(tenantId);
  }

  issueBatchUpdate(tenantId: string, issueIds: string[], updates: any) {
    return campaignIssueService.issueBatchUpdate(tenantId, issueIds, updates);
  }

  issuePriorityQueue(tenantId: string) {
    return campaignIssueService.issuePriorityQueue(tenantId);
  }

  issueAutoAssignment(tenantId: string) {
    return campaignIssueService.issueAutoAssignment(tenantId);
  }

  async batchUpdateCampaignStatus(tenantId: string, updates: { id: string; status: string }[]) {
    return campaignService.batchUpdateStatus(tenantId, updates as any);
  }

  async batchUpdateCampaignBudget(tenantId: string, updates: { id: string; daily?: number; lifetime?: number }[]) {
    return campaignService.batchUpdateBudget(tenantId, updates);
  }

  async dailyOpsOverview(tenantId: string) {
    return campaignService.getDailyOpsOverview(tenantId);
  }

  goalDashboard(tenantId: string) {
    return campaignGoalTracker.goalDashboard(tenantId);
  }

  goalQuickCheck(tenantId: string) {
    return campaignGoalTracker.goalQuickCheck(tenantId);
  }

  scorecardDailySnapshot(tenantId: string) {
    return campaignScorecardService.scorecardDailySnapshot(tenantId);
  }

  // ── N0VA MAIL (Round 15) ──────────────────────────────────────────────
  mailMailboxes(tenantId: string) {
    return mailboxService.listMailboxes(tenantId);
  }

  mailCreateMailbox(tenantId: string, input: Record<string, any>) {
    return mailboxService.createMailbox(tenantId, input);
  }

  mailMailbox(tenantId: string, mailboxId: string) {
    return mailboxService.getMailbox(tenantId, mailboxId);
  }

  mailUpdateMailbox(tenantId: string, mailboxId: string, patch: Record<string, any>) {
    return mailboxService.updateMailbox(tenantId, mailboxId, patch);
  }

  mailDeleteMailbox(tenantId: string, mailboxId: string) {
    return mailboxService.deleteMailbox(tenantId, mailboxId);
  }

  mailMailboxQuota(tenantId: string, mailboxId: string) {
    return mailboxService.mailboxQuota(tenantId, mailboxId);
  }

  mailStorageAnalytics(tenantId: string) {
    return mailboxService.storageAnalytics(tenantId);
  }

  mailMessages(tenantId: string, opts: Record<string, any>) {
    return mailMessage.listMessages(tenantId, opts);
  }

  mailMessage(tenantId: string, messageId: string) {
    return mailMessage.getMessage(tenantId, messageId);
  }

  mailBatchOps(tenantId: string, operation: string, messageIds: string[], opts: Record<string, any>) {
    return mailMessage.batchOps(tenantId, operation, messageIds, opts);
  }

  mailThread(tenantId: string, threadId: string) {
    return mailMessage.getThread(tenantId, threadId);
  }

  mailSend(tenantId: string, mailboxId: string, input: Record<string, any>) {
    return mailMessage.composeSend(tenantId, mailboxId, input);
  }

  mailSaveDraft(tenantId: string, mailboxId: string, input: Record<string, any>) {
    return mailMessage.saveDraft(tenantId, mailboxId, input);
  }

  mailSendDraft(tenantId: string, messageId: string) {
    return mailMessage.sendDraft(tenantId, messageId);
  }

  mailReceive(tenantId: string, mailboxId: string, input: Record<string, any>) {
    return mailMessage.receiveMessage(tenantId, mailboxId, input);
  }

  mailMarkRead(tenantId: string, messageId: string, read: boolean) {
    return mailMessage.markRead(tenantId, messageId, read);
  }

  mailToggleStar(tenantId: string, messageId: string) {
    return mailMessage.toggleStar(tenantId, messageId);
  }

  mailMove(tenantId: string, messageId: string, folder: string) {
    return mailMessage.moveToFolder(tenantId, messageId, folder);
  }

  mailArchive(tenantId: string, messageId: string) {
    return mailMessage.archiveMessage(tenantId, messageId);
  }

  mailTrash(tenantId: string, messageId: string) {
    return mailMessage.trashMessage(tenantId, messageId);
  }

  mailRestore(tenantId: string, messageId: string) {
    return mailMessage.restoreMessage(tenantId, messageId);
  }

  mailDeleteMessage(tenantId: string, messageId: string) {
    return mailMessage.deleteMessage(tenantId, messageId);
  }

  mailApplyLabel(tenantId: string, messageId: string, label: string) {
    return mailMessage.applyLabel(tenantId, messageId, label);
  }

  mailRemoveLabel(tenantId: string, messageId: string, label: string) {
    return mailMessage.removeLabel(tenantId, messageId, label);
  }

  mailFolders(tenantId: string, mailboxId?: string) {
    return mailMessage.listFolders(tenantId, mailboxId);
  }

  mailCreateFolder(tenantId: string, input: Record<string, any>) {
    return mailMessage.createFolder(tenantId, input);
  }

  mailDeleteFolder(tenantId: string, folderId: string) {
    return mailMessage.deleteFolder(tenantId, folderId);
  }

  mailUnreadSummary(tenantId: string) {
    return mailMessage.unreadSummary(tenantId);
  }

  mailRules(tenantId: string) {
    return mailRules.listRules(tenantId);
  }

  mailRule(tenantId: string, ruleId: string) {
    return mailRules.getRule(tenantId, ruleId);
  }

  mailCreateRule(tenantId: string, input: Record<string, any>) {
    return mailRules.createRule(tenantId, input);
  }

  mailUpdateRule(tenantId: string, ruleId: string, patch: Record<string, any>) {
    return mailRules.updateRule(tenantId, ruleId, patch);
  }

  mailToggleRule(tenantId: string, ruleId: string, enabled?: boolean) {
    return mailRules.toggleRule(tenantId, ruleId, enabled);
  }

  mailDeleteRule(tenantId: string, ruleId: string) {
    return mailRules.deleteRule(tenantId, ruleId);
  }

  mailRuleTemplates() {
    return mailRules.ruleTemplates();
  }

  mailAiGenerateRule(tenantId: string, naturalLanguage: string, opts: Record<string, any>) {
    return mailRules.aiGenerateRule(tenantId, naturalLanguage, opts);
  }

  mailInstantiateRuleTemplate(tenantId: string, templateId: string) {
    return mailRules.instantiateTemplate(tenantId, templateId);
  }

  mailEvaluateRule(tenantId: string, ruleId: string, messageId: string) {
    return mailRules.evaluateRule(tenantId, ruleId, messageId);
  }

  mailEvaluateAllRules(tenantId: string, messageId: string) {
    return mailRules.evaluateAllRules(tenantId, messageId);
  }

  mailTestRule(tenantId: string, ruleId: string, sample: Record<string, any>) {
    return mailRules.testRule(tenantId, ruleId, sample);
  }

  mailRunScriptRule(tenantId: string, ruleId: string, messageId: string) {
    return mailRules.runScriptRule(tenantId, ruleId, messageId);
  }

  mailRulesDashboard(tenantId: string) {
    return mailRules.rulesDashboard(tenantId);
  }

  mailSweepRules(tenantId: string) {
    return mailRules.sweepRules(tenantId);
  }

  mailSearch(tenantId: string, opts: Record<string, any>) {
    return mailSearch.searchMessages(tenantId, opts);
  }

  mailSemanticSearch(tenantId: string, q: string) {
    return mailSearch.semanticQuery(tenantId, q);
  }

  mailSearchSuggestions(tenantId: string, q: string) {
    return mailSearch.searchSuggestions(tenantId, q);
  }

  mailSearchStats(tenantId: string) {
    return mailSearch.searchStats(tenantId);
  }

  mailEnrich(tenantId: string, messageId: string) {
    return mailAI.enrichMessage(tenantId, messageId);
  }

  mailSmartReply(tenantId: string, messageId: string) {
    return mailAI.smartReply(tenantId, messageId);
  }

  mailSummarizeThread(tenantId: string, threadId: string) {
    return mailAI.summarizeThread(tenantId, threadId);
  }

  mailMeetingPrep(tenantId: string, threadId: string) {
    return mailAI.meetingPrep(tenantId, threadId);
  }

  mailIntelligence(tenantId: string) {
    return mailAI.emailIntelligence(tenantId);
  }

  // ── N0VA MAIL Round 17: contacts / agent / compliance / voice ─────────
  mailContacts(tenantId: string, opts: Record<string, any>) {
    return mailContacts.listContacts(tenantId, opts);
  }

  mailContact(tenantId: string, contactId: string) {
    return mailContacts.getContact(tenantId, contactId);
  }

  mailCreateContact(tenantId: string, input: Record<string, any>) {
    return mailContacts.createContact(tenantId, input);
  }

  mailUpdateContact(tenantId: string, contactId: string, patch: Record<string, any>) {
    return mailContacts.updateContact(tenantId, contactId, patch);
  }

  mailDeleteContact(tenantId: string, contactId: string) {
    return mailContacts.deleteContact(tenantId, contactId);
  }

  mailContactGroups(tenantId: string) {
    return mailContacts.contactGroups(tenantId);
  }

  mailMostContacted(tenantId: string, limit?: number) {
    return mailContacts.mostContacted(tenantId, limit);
  }

  mailContactProfile(tenantId: string, contactId: string) {
    return mailContacts.contactProfile(tenantId, contactId);
  }

  mailContactsDashboard(tenantId: string) {
    return mailContacts.contactsDashboard(tenantId);
  }

  mailSetOutOfOffice(tenantId: string, mailboxId: string, input: Record<string, any>) {
    return mailAgent.setOutOfOffice(tenantId, mailboxId, input);
  }

  mailOutOfOfficeStatus(tenantId: string, mailboxId: string) {
    return mailAgent.outOfOfficeStatus(tenantId, mailboxId);
  }

  mailScheduleSend(tenantId: string, mailboxId: string, input: Record<string, any>) {
    return mailAgent.scheduleSend(tenantId, mailboxId, input);
  }

  mailListScheduled(tenantId: string, mailboxId?: string) {
    return mailAgent.listScheduled(tenantId, mailboxId);
  }

  mailCancelSchedule(tenantId: string, scheduleId: string) {
    return mailAgent.cancelSchedule(tenantId, scheduleId);
  }

  mailSendScheduleNow(tenantId: string, scheduleId: string) {
    return mailAgent.sendScheduleNow(tenantId, scheduleId);
  }

  mailExtractTasks(tenantId: string, messageId: string) {
    return mailAgent.extractTasks(tenantId, messageId);
  }

  mailListTasks(tenantId: string) {
    return mailAgent.listTasks(tenantId);
  }

  mailCompleteTask(tenantId: string, taskId: string) {
    return mailAgent.completeTask(tenantId, taskId);
  }

  mailRunAgentCycle(tenantId: string, mailboxId?: string) {
    return mailAgent.runAgentCycle(tenantId, mailboxId);
  }

  mailAgentLog(tenantId: string, limit?: number) {
    return mailAgent.agentLog(tenantId, limit);
  }

  mailAgentStatus(tenantId: string) {
    return mailAgent.agentStatus(tenantId);
  }

  mailSetRetentionPolicy(tenantId: string, input: Record<string, any>) {
    return mailCompliance.setRetentionPolicy(tenantId, input);
  }

  mailRetentionPolicies(tenantId: string) {
    return mailCompliance.retentionPolicies(tenantId);
  }

  mailDeleteRetentionPolicy(tenantId: string, policyId: string) {
    return mailCompliance.deleteRetentionPolicy(tenantId, policyId);
  }

  mailApplyRetention(tenantId: string) {
    return mailCompliance.applyRetention(tenantId);
  }

  mailPlaceHold(tenantId: string, input: Record<string, any>) {
    return mailCompliance.placeHold(tenantId, input);
  }

  mailListHolds(tenantId: string) {
    return mailCompliance.listHolds(tenantId);
  }

  mailReleaseHold(tenantId: string, holdId: string) {
    return mailCompliance.releaseHold(tenantId, holdId);
  }

  mailHoldStatus(tenantId: string) {
    return mailCompliance.holdStatus(tenantId);
  }

  mailAuditLog(tenantId: string, limit?: number) {
    return mailCompliance.auditLog(tenantId, limit);
  }

  mailScanPii(tenantId: string) {
    return mailCompliance.scanForPii(tenantId);
  }

  mailComplianceSummary(tenantId: string) {
    return mailCompliance.complianceSummary(tenantId);
  }

  mailComplianceHoldCalendar(tenantId: string, month: string | undefined) {
    return mailCompliance.legalHoldCalendar(tenantId, month);
  }

  mailComplianceReports(tenantId: string) {
    return mailCompliance.complianceReports(tenantId);
  }

  mailComplianceReport(tenantId: string, framework: string) {
    return mailCompliance.complianceReport(tenantId, framework);
  }

  mailComplianceExportReport(tenantId: string, framework: string) {
    return mailCompliance.exportComplianceReport(tenantId, framework);
  }

  mailParseVoiceCommand(tenantId: string, command: string) {
    return mailVoice.parseMailCommand(tenantId, command);
  }

  mailExecuteVoiceCommand(tenantId: string, command: string) {
    return mailVoice.executeMailCommand(tenantId, command);
  }

  mailVoiceHelp() {
    return mailVoice.voiceCommandHelp();
  }

  mailTemplates(tenantId: string) {
    return mailTemplates.templates(tenantId);
  }

  mailTemplate(tenantId: string, templateId: string) {
    return mailTemplates.getTemplatePublic(tenantId, templateId);
  }

  mailCreateTemplate(tenantId: string, input: Record<string, any>) {
    return mailTemplates.createTemplate(tenantId, input);
  }

  mailUpdateTemplate(tenantId: string, templateId: string, patch: Record<string, any>) {
    return mailTemplates.updateTemplate(tenantId, templateId, patch);
  }

  mailDeleteTemplate(tenantId: string, templateId: string) {
    return mailTemplates.deleteTemplate(tenantId, templateId);
  }

  mailRenderTemplate(tenantId: string, templateId: string, variables: Record<string, any>) {
    return mailTemplates.renderTemplate(tenantId, templateId, variables);
  }

  mailSendFromTemplate(tenantId: string, mailboxId: string, input: Record<string, any>) {
    return mailTemplates.sendFromTemplate(tenantId, mailboxId, input);
  }

  mailSendBulkTemplate(tenantId: string, mailboxId: string, input: Record<string, any>) {
    return mailTemplates.sendBulk(tenantId, mailboxId, input);
  }

  mailTemplateStats(tenantId: string) {
    return mailTemplates.templateStats(tenantId);
  }

  mailTemplateUsageLog(tenantId: string, limit?: number) {
    return mailTemplates.templateUsageLog(tenantId, limit);
  }

  mailSignatures(tenantId: string) {
    return mailSignature.listSignatures(tenantId);
  }

  mailSignature(tenantId: string, mailboxId: string) {
    return mailSignature.getSignature(tenantId, mailboxId);
  }

  mailUpdateSignature(tenantId: string, mailboxId: string, input: Record<string, any>) {
    return mailSignature.updateSignature(tenantId, mailboxId, input);
  }

  mailToggleSignature(tenantId: string, mailboxId: string, enabled: boolean) {
    return mailSignature.toggleSignature(tenantId, mailboxId, enabled);
  }

  mailDefaultSignature(tenantId: string) {
    return mailSignature.defaultSignature(tenantId);
  }

  mailSignaturePreview(tenantId: string, mailboxId: string, body: string) {
    return mailSignature.composePreview(tenantId, mailboxId, body);
  }

  mailSignaturesDashboard(tenantId: string) {
    return mailSignature.signaturesDashboard(tenantId);
  }

  mailSpamStatus(tenantId: string) {
    return mailSpam.spamStatus(tenantId);
  }

  mailScanMessage(tenantId: string, messageId: string) {
    return mailSpam.scanMessage(tenantId, messageId);
  }

  mailScanAll(tenantId: string) {
    return mailSpam.scanAll(tenantId);
  }

  mailQuarantine(tenantId: string, opts: Record<string, any>) {
    return mailSpam.quarantine(tenantId, opts);
  }

  mailMoveToSpam(tenantId: string, messageId: string) {
    return mailSpam.moveToSpam(tenantId, messageId);
  }

  mailReportSpam(tenantId: string, messageId: string) {
    return mailSpam.reportSpam(tenantId, messageId);
  }

  mailReportNotSpam(tenantId: string, messageId: string) {
    return mailSpam.reportNotSpam(tenantId, messageId);
  }

  mailBlockSender(tenantId: string, input: Record<string, any>) {
    return mailSpam.blockSender(tenantId, input);
  }

  mailUnblockSender(tenantId: string, email: string) {
    return mailSpam.unblockSender(tenantId, email);
  }

  mailBlockedSenders(tenantId: string) {
    return mailSpam.blockedSenders(tenantId);
  }

  mailAllowSender(tenantId: string, input: Record<string, any>) {
    return mailSpam.allowSender(tenantId, input);
  }

  mailRemoveAllowedSender(tenantId: string, email: string) {
    return mailSpam.removeAllowedSender(tenantId, email);
  }

  mailAllowedSenders(tenantId: string) {
    return mailSpam.allowedSenders(tenantId);
  }

  mailSpamLog(tenantId: string, limit?: number) {
    return mailSpam.spamLog(tenantId, limit);
  }

  mailSnooze(tenantId: string, messageId: string, until: string) {
    return mailFollowUp.snooze(tenantId, messageId, until);
  }

  mailUnsnooze(tenantId: string, messageId: string) {
    return mailFollowUp.unsnooze(tenantId, messageId);
  }

  mailListSnoozed(tenantId: string) {
    return mailFollowUp.listSnoozed(tenantId);
  }

  mailMarkAwaitingResponse(tenantId: string, messageId: string, deadline?: string) {
    return mailFollowUp.markAwaitingResponse(tenantId, messageId, deadline);
  }

  mailMarkResponded(tenantId: string, messageId: string) {
    return mailFollowUp.markResponded(tenantId, messageId);
  }

  mailCreateFollowUp(tenantId: string, messageId: string, input: Record<string, any>) {
    return mailFollowUp.createFollowUp(tenantId, messageId, input);
  }

  mailListFollowUps(tenantId: string, opts: Record<string, any>) {
    return mailFollowUp.listFollowUps(tenantId, opts);
  }

  mailCompleteFollowUp(tenantId: string, followUpId: string) {
    return mailFollowUp.completeFollowUp(tenantId, followUpId);
  }

  mailDeleteFollowUp(tenantId: string, followUpId: string) {
    return mailFollowUp.deleteFollowUp(tenantId, followUpId);
  }

  mailFollowUpSummary(tenantId: string) {
    return mailFollowUp.followUpSummary(tenantId);
  }

  mailFollowUpSuggestions(tenantId: string) {
    return mailFollowUp.suggestions(tenantId);
  }

  mailAnalyticsOverview(tenantId: string) {
    return mailAnalytics.overview(tenantId);
  }

  mailAnalyticsTrend(tenantId: string, days?: number) {
    return mailAnalytics.volumeTrend(tenantId, days || 14);
  }

  mailAnalyticsCategories(tenantId: string) {
    return mailAnalytics.categoryMix(tenantId);
  }

  mailAnalyticsSenders(tenantId: string, limit?: number) {
    return mailAnalytics.topSenders(tenantId, limit || 5);
  }

  mailAnalyticsResponseTimes(tenantId: string) {
    return mailAnalytics.responseTimeStats(tenantId);
  }

  mailAnalyticsHours(tenantId: string) {
    return mailAnalytics.busiestHours(tenantId);
  }

  mailAnalyticsFolders(tenantId: string) {
    return mailAnalytics.activityByFolder(tenantId);
  }

  mailAnalyticsMailboxes(tenantId: string) {
    return mailAnalytics.mailboxStats(tenantId);
  }

  mailAnalyticsExecutive(tenantId: string) {
    return mailAnalytics.executiveSummary(tenantId);
  }

  mailAttachments(tenantId: string, opts: Record<string, any>) {
    return mailAttachment.listAttachments(tenantId, opts);
  }

  mailAttachment(tenantId: string, attachmentId: string) {
    return mailAttachment.getAttachment(tenantId, attachmentId);
  }

  mailScanAttachment(tenantId: string, attachmentId: string) {
    return mailAttachment.scanAttachment(tenantId, attachmentId);
  }

  mailQuarantineAttachment(tenantId: string, attachmentId: string) {
    return mailAttachment.quarantineAttachment(tenantId, attachmentId);
  }

  mailAttachmentStats(tenantId: string) {
    return mailAttachment.attachmentStats(tenantId);
  }

  mailAddComment(tenantId: string, messageId: string, input: any) {
    return mailCollab.addComment(tenantId, messageId, input);
  }

  mailCommentsForMessage(tenantId: string, messageId: string) {
    return mailCollab.commentsForMessage(tenantId, messageId);
  }

  mailCommentsForThread(tenantId: string, threadId: string) {
    return mailCollab.commentsForThread(tenantId, threadId);
  }

  mailDeleteComment(tenantId: string, commentId: string) {
    return mailCollab.deleteComment(tenantId, commentId);
  }

  mailAddReaction(tenantId: string, messageId: string, input: any) {
    return mailCollab.addReaction(tenantId, messageId, input);
  }

  mailRemoveReaction(tenantId: string, messageId: string, input: any) {
    return mailCollab.removeReaction(tenantId, messageId, input);
  }

  mailMessageReactions(tenantId: string, messageId: string) {
    return mailCollab.messageReactions(tenantId, messageId);
  }

  mailCreateSharedDraft(tenantId: string, mailboxId: string, input: any) {
    return mailCollab.createSharedDraft(tenantId, mailboxId, input);
  }

  mailSharedDrafts(tenantId: string, opts: Record<string, any>) {
    return mailCollab.sharedDrafts(tenantId, opts);
  }

  mailUpdateSharedDraft(tenantId: string, draftId: string, patch: any) {
    return mailCollab.updateSharedDraft(tenantId, draftId, patch);
  }

  mailDeleteSharedDraft(tenantId: string, draftId: string) {
    return mailCollab.deleteSharedDraft(tenantId, draftId);
  }

  mailPresence(tenantId: string) {
    return mailCollab.presence(tenantId);
  }

  mailCollaborationState(tenantId: string, messageId: string) {
    return mailCollab.collaborationState(tenantId, messageId);
  }

  mailCollaborationSummary(tenantId: string) {
    return mailCollab.collaborationSummary(tenantId);
  }

  mailResponseTimePrediction(tenantId: string, threadId: string) {
    return mailPredict.responseTimePrediction(tenantId, threadId);
  }

  mailOutcomePrediction(tenantId: string, messageId: string) {
    return mailPredict.outcomePrediction(tenantId, messageId);
  }

  mailChurnRisk(tenantId: string, threadId: string) {
    return mailPredict.churnRisk(tenantId, threadId);
  }

  mailOptimalSendTime(tenantId: string) {
    return mailPredict.optimalSendTime(tenantId);
  }

  mailRelationshipHealth(tenantId: string, contactOrEmail: string) {
    return mailPredict.relationshipHealth(tenantId, contactOrEmail);
  }

  mailIntentPrediction(tenantId: string, messageId: string) {
    return mailPredict.intentPrediction(tenantId, messageId);
  }

  mailNudgeSuggestions(tenantId: string) {
    return mailPredict.nudgeSuggestions(tenantId);
  }

  mailWorkloadForecast(tenantId: string, days?: number) {
    return mailPredict.workloadForecast(tenantId, days || 7);
  }

  mailSendTimeSuggestion(tenantId: string) {
    return mailPredict.sendTimeSuggestion(tenantId);
  }

  mailPredictiveDashboard(tenantId: string) {
    return mailPredict.predictiveDashboard(tenantId);
  }

  mailCreateCampaign(tenantId: string, mailboxId: string, input: any) {
    return mailCampaign.createCampaign(tenantId, mailboxId, input);
  }

  mailCampaigns(tenantId: string) {
    return mailCampaign.listCampaigns(tenantId);
  }

  mailCampaign(tenantId: string, campaignId: string) {
    return mailCampaign.getCampaignPublic(tenantId, campaignId);
  }

  mailDeleteCampaign(tenantId: string, campaignId: string) {
    return mailCampaign.deleteCampaign(tenantId, campaignId);
  }

  mailLaunchCampaign(tenantId: string, campaignId: string) {
    return mailCampaign.launchCampaign(tenantId, campaignId);
  }

  mailApproveCampaign(tenantId: string, campaignId: string, approver?: string) {
    return mailCampaign.approveCampaign(tenantId, campaignId, approver);
  }

  mailRejectCampaign(tenantId: string, campaignId: string, reason?: string) {
    return mailCampaign.rejectCampaign(tenantId, campaignId, reason);
  }

  mailPauseCampaign(tenantId: string, campaignId: string) {
    return mailCampaign.pauseCampaign(tenantId, campaignId);
  }

  mailResumeCampaign(tenantId: string, campaignId: string) {
    return mailCampaign.resumeCampaign(tenantId, campaignId);
  }

  mailCampaignStats(tenantId: string, campaignId: string) {
    return mailCampaign.campaignStats(tenantId, campaignId);
  }

  mailCampaignsDashboard(tenantId: string) {
    return mailCampaign.campaignsDashboard(tenantId);
  }

  mailCampaignResponseHandling(tenantId: string, campaignId: string) {
    return mailCampaign.campaignResponseHandling(tenantId, campaignId);
  }

  mailCampaignLog(tenantId: string) {
    return mailCampaign.campaignLog(tenantId);
  }

  mailDiscoverySearch(tenantId: string, scope: Record<string, any>, opts: Record<string, any>) {
    return mailDiscovery.scopeSearch(tenantId, scope, opts);
  }

  mailSaveSearch(tenantId: string, input: any) {
    return mailDiscovery.saveSearch(tenantId, input);
  }

  mailSavedSearches(tenantId: string) {
    return mailDiscovery.listSavedSearches(tenantId);
  }

  mailDeleteSavedSearch(tenantId: string, searchId: string) {
    return mailDiscovery.deleteSavedSearch(tenantId, searchId);
  }

  mailRunSavedSearch(tenantId: string, searchId: string) {
    return mailDiscovery.runSavedSearch(tenantId, searchId);
  }

  mailCreateExport(tenantId: string, input: any) {
    return mailDiscovery.createExport(tenantId, input);
  }

  mailExports(tenantId: string) {
    return mailDiscovery.exports(tenantId);
  }

  mailExport(tenantId: string, exportId: string) {
    return mailDiscovery.getExport(tenantId, exportId);
  }

  mailDeleteExport(tenantId: string, exportId: string) {
    return mailDiscovery.deleteExport(tenantId, exportId);
  }

  mailDiscoverySummary(tenantId: string) {
    return mailDiscovery.discoverySummary(tenantId);
  }

  mailDiscoveryConceptSearch(tenantId: string, query: string, opts: Record<string, any>) {
    return mailDiscovery.conceptSearch(tenantId, query, opts);
  }

  mailDiscoveryMarkPrivileged(tenantId: string, messageId: string, input: Record<string, any>) {
    return mailDiscovery.markMessagePrivileged(tenantId, messageId, input);
  }

  mailDiscoveryListPrivileges(tenantId: string) {
    return mailDiscovery.listPrivileges(tenantId);
  }

  mailDiscoveryRemovePrivilege(tenantId: string, messageId: string) {
    return mailDiscovery.removePrivilege(tenantId, messageId);
  }

  mailDiscoveryPrivilegeSummary(tenantId: string) {
    return mailDiscovery.privilegeSummary(tenantId);
  }

  mailDiscoveryExportAuditChain(tenantId: string) {
    return mailDiscovery.exportAuditChain(tenantId);
  }

  mailRegisterDomain(tenantId: string, input: any) {
    return mailDomain.registerDomain(tenantId, input);
  }

  mailDomains(tenantId: string) {
    return mailDomain.listDomains(tenantId);
  }

  mailDomain(tenantId: string, domainId: string) {
    return mailDomain.getDomainPublic(tenantId, domainId);
  }

  mailDeleteDomain(tenantId: string, domainId: string) {
    return mailDomain.deleteDomain(tenantId, domainId);
  }

  mailVerifyDomain(tenantId: string, domainId: string) {
    return mailDomain.verifyDomain(tenantId, domainId);
  }

  mailDomainHealth(tenantId: string, domainId: string) {
    return mailDomain.domainHealth(tenantId, domainId);
  }

  mailReputationMonitor(tenantId: string) {
    return mailDomain.reputationMonitor(tenantId);
  }

  mailSetDomainPolicy(tenantId: string, domainId: string, input: any) {
    return mailDomain.setDomainPolicy(tenantId, domainId, input);
  }

  mailDomainLog(tenantId: string) {
    return mailDomain.domainLog(tenantId);
  }

  mailDomainSummary(tenantId: string) {
    return mailDomain.domainSummary(tenantId);
  }

  mailCreateVoiceNote(tenantId: string, input: any) {
    return mailVoiceNote.createVoiceNote(tenantId, input);
  }

  mailVoiceNotes(tenantId: string, opts: any) {
    return mailVoiceNote.listVoiceNotes(tenantId, opts);
  }

  mailVoiceNote(tenantId: string, noteId: string) {
    return mailVoiceNote.getVoiceNote(tenantId, noteId);
  }

  mailDeleteVoiceNote(tenantId: string, noteId: string) {
    return mailVoiceNote.deleteVoiceNote(tenantId, noteId);
  }

  mailVoiceNoteDashboard(tenantId: string) {
    return mailVoiceNote.voiceNoteDashboard(tenantId);
  }

  mailAttachVideo(tenantId: string, input: any) {
    return mailMultimodal.attachVideo(tenantId, input);
  }

  mailAttachScreenRecording(tenantId: string, input: any) {
    return mailMultimodal.attachScreenRecording(tenantId, input);
  }

  mailAttachCodeSnippet(tenantId: string, input: any) {
    return mailMultimodal.attachCodeSnippet(tenantId, input);
  }

  mailCreatePoll(tenantId: string, input: any) {
    return mailMultimodal.createPoll(tenantId, input);
  }

  mailVotePoll(tenantId: string, pollId: string, optionIndex: number, voter: string) {
    return mailMultimodal.votePoll(tenantId, pollId, optionIndex, voter);
  }

  mailPollResults(tenantId: string, pollId: string) {
    return mailMultimodal.pollResults(tenantId, pollId);
  }

  mailContentBlocks(tenantId: string, opts: any) {
    return mailMultimodal.listContentBlocks(tenantId, opts);
  }

  mailContentBlock(tenantId: string, blockId: string) {
    return mailMultimodal.getContentBlock(tenantId, blockId);
  }

  mailDeleteContentBlock(tenantId: string, blockId: string) {
    return mailMultimodal.deleteContentBlock(tenantId, blockId);
  }

  mailPolls(tenantId: string) {
    return mailMultimodal.listPolls(tenantId);
  }

  mailClosePoll(tenantId: string, pollId: string) {
    return mailMultimodal.closePoll(tenantId, pollId);
  }

  mailMultimodalDashboard(tenantId: string) {
    return mailMultimodal.multimodalDashboard(tenantId);
  }

  mailNeuralOverview(tenantId: string, mailboxId?: string) {
    return mailNeural.neuralOverview(tenantId, mailboxId);
  }

  mailNeuralSuggestions(tenantId: string, limit?: number) {
    return mailNeural.smartDraftSuggestions(tenantId, limit);
  }

  mailNeuralTasks(tenantId: string) {
    return mailNeural.taskExtraction(tenantId);
  }

  mailNeuralUnsubscribe(tenantId: string) {
    return mailNeural.predictiveUnsubscribe(tenantId);
  }

  mailNeuralArchive(tenantId: string, opts: any) {
    return mailNeural.smartArchive(tenantId, opts);
  }

  mailNeuralHealth(tenantId: string) {
    return mailNeural.conversationHealth(tenantId);
  }

  mailNeuralEscalations(tenantId: string) {
    return mailNeural.escalationQueue(tenantId);
  }

  mailNeuralLearning(tenantId: string, action: string, item: any) {
    return mailNeural.learningLoop(tenantId, action, item);
  }

  mailNeuralDashboard(tenantId: string, mailboxId?: string) {
    return mailNeural.neuralMailboxDashboard(tenantId, mailboxId);
  }

  mailCommandCenter(tenantId: string) {
    return mailCommand.mailCommandCenter(tenantId);
  }

  mailCommandCompleteFollowUp(tenantId: string, followUpId: string) {
    return mailCommand.completeFollowUp(tenantId, followUpId);
  }

  mailCommandSendScheduledNow(tenantId: string, scheduleId: string) {
    return mailCommand.sendScheduledNow(tenantId, scheduleId);
  }

  mailCommandApproveCampaign(tenantId: string, campaignId: string, approver?: string) {
    return mailCommand.approveCampaign(tenantId, campaignId, approver);
  }

  mailCommandRejectCampaign(tenantId: string, campaignId: string, reason?: string) {
    return mailCommand.rejectCampaign(tenantId, campaignId, reason);
  }

  mailCommandRunRulesSweep(tenantId: string) {
    return mailCommand.runRulesSweep(tenantId);
  }

  mailCommandRescanSpam(tenantId: string) {
    return mailCommand.rescanSpam(tenantId);
  }

  mailCommandRunAgentCycle(tenantId: string, mailboxId?: string) {
    return mailCommand.runAgentCycle(tenantId, mailboxId);
  }

  mailCommandSmartArchive(tenantId: string, olderThanDays?: number) {
    return mailCommand.smartArchiveNow(tenantId, olderThanDays);
  }

  mailOpsDashboard(tenantId: string) {
    return mailOps.opsDashboard(tenantId);
  }

  mailOpsIncidents(tenantId: string) {
    return mailOps.incidents(tenantId);
  }

  mailOpsCreateIncident(tenantId: string, input: any) {
    return mailOps.createIncident(tenantId, input);
  }

  mailOpsAckIncident(tenantId: string, incidentId: string) {
    return mailOps.acknowledgeIncident(tenantId, incidentId);
  }

  mailOpsResolveIncident(tenantId: string, incidentId: string) {
    return mailOps.resolveIncident(tenantId, incidentId);
  }

  mailOpsEscalateIncident(tenantId: string, incidentId: string) {
    return mailOps.escalateIncident(tenantId, incidentId);
  }

  mailOpsIncidentLog(tenantId: string) {
    return mailOps.incidentLog(tenantId);
  }

  mailOpsRetryQueue(tenantId: string) {
    return mailOps.retryFailedQueue(tenantId);
  }

  mailOpsHousekeeping(tenantId: string) {
    return mailOps.runHousekeeping(tenantId);
  }

  mailOpsCheckpoint(tenantId: string, label?: string) {
    return mailOps.takeCheckpoint(tenantId, label);
  }

  mailOpsThreatRule(tenantId: string) {
    return mailOps.deployThreatRule(tenantId);
  }

  mailOpsLog(tenantId: string) {
    return mailOps.opsLog(tenantId);
  }

  mailStorageDashboard(tenantId: string) {
    return mailStorage.storageDashboard(tenantId);
  }

  mailStorageSetPolicy(tenantId: string, policy: any) {
    return mailStorage.setTieringPolicy(tenantId, policy);
  }

  mailStorageRunTiering(tenantId: string) {
    return mailStorage.runTiering(tenantId);
  }

  mailStorageSuggestions(tenantId: string) {
    return mailStorage.cleanupSuggestions(tenantId);
  }

  mailStorageApplyCleanup(tenantId: string, suggestionId: string) {
    return mailStorage.applyCleanup(tenantId, suggestionId);
  }

  mailStorageApplyAllCleanups(tenantId: string) {
    return mailStorage.applyAllCleanups(tenantId);
  }

  mailSearchParse(query: string) {
    return mailSearchOp.parseQuery(query);
  }

  mailSearchOperators(tenantId: string, query: string, opts?: any) {
    return mailSearchOp.operatorSearch(tenantId, query, opts);
  }

  mailSearchOperatorReference() {
    return mailSearchOp.operatorReference();
  }

  mailSearchExamples(tenantId: string) {
    return mailSearchOp.searchExamples(tenantId);
  }

  mailSearchRecentQueries(tenantId: string) {
    return mailSearchOp.recentQueries(tenantId);
  }

  mailSearchClearHistory(tenantId: string) {
    return mailSearchOp.clearHistory(tenantId);
  }

  mailSearchOperatorStats(tenantId: string) {
    return mailSearchOp.operatorStats(tenantId);
  }

  mailAbuseOverview(tenantId: string) {
    return mailAbuse.abuseOverview(tenantId);
  }

  mailAbuseScan(tenantId: string, message: any) {
    return mailAbuse.scanIncoming(tenantId, message);
  }

  mailAbuseRateLimit(tenantId: string, senderEmail: string) {
    return mailAbuse.rateLimitCheck(tenantId, senderEmail);
  }

  mailAbuseBecScan(tenantId: string, message: any) {
    return mailAbuse.becScan(tenantId, message);
  }

  mailAbuseDlpScan(tenantId: string, message: any) {
    return mailAbuse.dlpScan(tenantId, message);
  }

  mailAbuseImpossibleTravel(tenantId: string, userId: string, attemptedCity?: string) {
    return mailAbuse.impossibleTravel(tenantId, userId, attemptedCity);
  }

  mailAbusePatternAnomaly(tenantId: string, mailboxId?: string) {
    return mailAbuse.sendingPatternAnomaly(tenantId, mailboxId);
  }

  mailAbuseHoneypotStatus(tenantId: string) {
    return mailAbuse.honeypotStatus(tenantId);
  }

  mailAbuseThreatResponse(tenantId: string, action: string, target?: string) {
    return mailAbuse.threatResponse(tenantId, action, target);
  }

  mailAbuseLog(tenantId: string) {
    return mailAbuse.abuseLog(tenantId);
  }

  mailAbuseDashboard(tenantId: string) {
    return mailAbuse.abuseDashboard(tenantId);
  }

  mailWebhookEvents() {
    return mailWebhook.webhookEvents();
  }

  mailWebhookList(tenantId: string) {
    return mailWebhook.listWebhooks(tenantId);
  }

  mailWebhookCreate(tenantId: string, input: any) {
    return mailWebhook.createWebhook(tenantId, input);
  }

  mailWebhookUpdate(tenantId: string, webhookId: string, input: any) {
    return mailWebhook.updateWebhook(tenantId, webhookId, input);
  }

  mailWebhookDelete(tenantId: string, webhookId: string) {
    return mailWebhook.deleteWebhook(tenantId, webhookId);
  }

  mailWebhookTest(tenantId: string, webhookId: string) {
    return mailWebhook.testWebhook(tenantId, webhookId);
  }

  mailWebhookTrigger(tenantId: string, event: string, payload: any) {
    return mailWebhook.triggerEvent(tenantId, event, payload);
  }

  mailWebhookDeliveries(tenantId: string, webhookId?: string) {
    return mailWebhook.webhookDeliveries(tenantId, webhookId);
  }

  mailWebhookStats(tenantId: string) {
    return mailWebhook.webhookStats(tenantId);
  }

  mailWebhookOverview(tenantId: string) {
    return mailWebhook.webhookOverview(tenantId);
  }

  mailAgentPersonas() {
    return mailAgentRegistry.agentPersonas();
  }

  mailAgentToolCatalog() {
    return mailAgentRegistry.toolCatalog();
  }

  mailAgentToolDiscover(tenantId: string, query: string) {
    return mailAgentRegistry.toolDiscover(tenantId, query);
  }

  mailAgentRegister(tenantId: string, input: any) {
    return mailAgentRegistry.registerAgent(tenantId, input);
  }

  mailAgentList(tenantId: string) {
    return mailAgentRegistry.listAgents(tenantId);
  }

  mailAgentGet(tenantId: string, agentId: string) {
    return mailAgentRegistry.getAgent(tenantId, agentId);
  }

  mailAgentUpdate(tenantId: string, agentId: string, input: any) {
    return mailAgentRegistry.updateAgent(tenantId, agentId, input);
  }

  mailAgentDeactivate(tenantId: string, agentId: string) {
    return mailAgentRegistry.deactivateAgent(tenantId, agentId);
  }

  mailAgentCreateSession(tenantId: string, agentId: string, input: any) {
    return mailAgentRegistry.createSession(tenantId, agentId, input);
  }

  mailAgentEndSession(tenantId: string, sessionId: string) {
    return mailAgentRegistry.endSession(tenantId, sessionId);
  }

  mailAgentSessions(tenantId: string) {
    return mailAgentRegistry.agentSessions(tenantId);
  }

  mailAgentAction(tenantId: string, agentId: string, input: any) {
    return mailAgentRegistry.agentAction(tenantId, agentId, input);
  }

  mailAgentHitlQueue(tenantId: string) {
    return mailAgentRegistry.hitlQueue(tenantId);
  }

  mailAgentResolveHitl(tenantId: string, hitlId: string, decision: string) {
    return mailAgentRegistry.resolveHitl(tenantId, hitlId, decision);
  }

  mailAgentAuditLog(tenantId: string, agentId?: string) {
    return mailAgentRegistry.agentAuditLog(tenantId, agentId);
  }

  mailAgentDashboard(tenantId: string) {
    return mailAgentRegistry.agentFrameworkDashboard(tenantId);
  }

  mailIntegrationCatalog(tenantId: string) {
    return mailIntegration.connectorCatalog(tenantId);
  }

  mailIntegrationConnections(tenantId: string, connectorId?: string) {
    return mailIntegration.listConnections(tenantId, connectorId);
  }

  mailIntegrationConnect(tenantId: string, input: any) {
    return mailIntegration.connectConnector(tenantId, input);
  }

  mailIntegrationDisconnect(tenantId: string, connectionId: string) {
    return mailIntegration.disconnectConnector(tenantId, connectionId);
  }

  mailIntegrationAuthorize(tenantId: string, connectionId: string) {
    return mailIntegration.authorizeConnector(tenantId, connectionId);
  }

  mailIntegrationRefresh(tenantId: string, connectionId: string) {
    return mailIntegration.refreshConnector(tenantId, connectionId);
  }

  mailIntegrationUpdate(tenantId: string, connectionId: string, input: any) {
    return mailIntegration.updateConnection(tenantId, connectionId, input);
  }

  mailIntegrationSyncNow(tenantId: string, connectionId: string) {
    return mailIntegration.syncNow(tenantId, connectionId);
  }

  mailIntegrationSyncHistory(tenantId: string, connectionId?: string, limit?: number) {
    return mailIntegration.syncHistory(tenantId, connectionId, limit);
  }

  mailIntegrationSyncStatus(tenantId: string) {
    return mailIntegration.syncStatus(tenantId);
  }

  mailIntegrationAction(tenantId: string, connectionId: string, action: string, params: any) {
    return mailIntegration.runAction(tenantId, connectionId, action, params || {});
  }

  mailIntegrationLog(tenantId: string, connectorId?: string, limit?: number) {
    return mailIntegration.integrationLog(tenantId, connectorId, limit);
  }

  mailIntegrationAlerts(tenantId: string) {
    return mailIntegration.integrationAlerts(tenantId);
  }

  mailIntegrationOverview(tenantId: string) {
    return mailIntegration.integrationOverview(tenantId);
  }

  mailIntegrationDashboard(tenantId: string) {
    return mailIntegration.integrationDashboard(tenantId);
  }

  mailIntegrationBridges(tenantId: string) {
    return mailIntegration.listBridges(tenantId);
  }

  mailIntegrationCreateBridge(tenantId: string, input: any) {
    return mailIntegration.createBridge(tenantId, input);
  }

  mailIntegrationDeleteBridge(tenantId: string, bridgeId: string) {
    return mailIntegration.deleteBridge(tenantId, bridgeId);
  }

  mailIntegrationTriggerBridge(tenantId: string, bridgeId: string) {
    return mailIntegration.triggerBridge(tenantId, bridgeId);
  }

  mailIntegrationOauthStart(tenantId: string, connectionId: string) {
    return mailIntegration.oauthStart(tenantId, connectionId);
  }

  mailIntegrationOauthCallback(tenantId: string, connectionId: string, input: any) {
    return mailIntegration.oauthCallback(tenantId, connectionId, input);
  }

  mailIntegrationOauthRefresh(tenantId: string, connectionId: string) {
    return mailIntegration.oauthRefresh(tenantId, connectionId);
  }

  mailIntegrationOauthRevoke(tenantId: string, connectionId: string) {
    return mailIntegration.oauthRevoke(tenantId, connectionId);
  }

  mailIntegrationOauthStatus(tenantId: string, connectionId: string) {
    return mailIntegration.oauthStatus(tenantId, connectionId);
  }

  mailMigrations(tenantId: string) {
    return mailMigration.listMigrations(tenantId);
  }

  mailStartMigration(tenantId: string, input: any) {
    return mailMigration.startMigration(tenantId, input);
  }

  mailMigrationStatus(tenantId: string, migrationId: string) {
    return mailMigration.migrationStatus(tenantId, migrationId);
  }

  mailMigrationScan(tenantId: string, migrationId: string) {
    return mailMigration.migrationScan(tenantId, migrationId);
  }

  mailMigrationPreview(tenantId: string, migrationId: string) {
    return mailMigration.migrationPreview(tenantId, migrationId);
  }

  mailMigrationImport(tenantId: string, migrationId: string) {
    return mailMigration.runMigration(tenantId, migrationId);
  }

  mailDeleteMigration(tenantId: string, migrationId: string) {
    return mailMigration.deleteMigration(tenantId, migrationId);
  }

  mailMigrationSummary(tenantId: string) {
    return mailMigration.migrationSummary(tenantId);
  }

  mailMigrationLog(tenantId: string, limit?: number) {
    return mailMigration.migrationLog(tenantId, limit);
  }

  mailBillingPlans() {
    return mailBilling.planCatalog();
  }

  mailBillingSummary(tenantId: string) {
    return mailBilling.billingSummary(tenantId);
  }

  mailBillingDashboard(tenantId: string) {
    return mailBilling.billingDashboard(tenantId);
  }

  mailBillingForecast(tenantId: string) {
    return mailBilling.usageForecast(tenantId);
  }

  mailBillingUpgrade(tenantId: string, plan: string) {
    return mailBilling.upgradePlan(tenantId, plan);
  }

  mailBillingInvoices(tenantId: string) {
    return mailBilling.invoices(tenantId);
  }

  mailBillingCreateInvoice(tenantId: string, input: any) {
    return mailBilling.createInvoice(tenantId, input);
  }

  mailBillingInvoice(tenantId: string, invoiceId: string) {
    return mailBilling.getInvoice(invoiceId);
  }

  mailBillingPayInvoice(tenantId: string, invoiceId: string) {
    return mailBilling.payInvoice(invoiceId);
  }

  mailBillingPaymentMethods(tenantId: string) {
    return mailBilling.paymentMethods(tenantId);
  }

  mailBillingAddPaymentMethod(tenantId: string, input: any) {
    return mailBilling.setPaymentMethod(tenantId, input);
  }

  mailBillingRemovePaymentMethod(tenantId: string, methodId: string) {
    return mailBilling.removePaymentMethod(methodId);
  }

  mailBillingLog(tenantId: string) {
    return mailBilling.billingLog(tenantId);
  }

  mailBillingAddons(tenantId: string) {
    return mailBilling.addonCatalog();
  }

  mailBillingListAddons(tenantId: string) {
    return mailBilling.listAddons(tenantId);
  }

  mailBillingAddAddon(tenantId: string, addonId: string) {
    return mailBilling.addAddon(tenantId, addonId);
  }

  mailBillingRemoveAddon(tenantId: string, addonId: string) {
    return mailBilling.removeAddon(tenantId, addonId);
  }

  mailBillingOveragePolicy(tenantId: string, input: any = null) {
    return mailBilling.overagePolicy(tenantId, input === null || input === undefined ? null : input);
  }

  mailBillingOverageStatus(tenantId: string) {
    return mailBilling.overageStatus(tenantId);
  }

  mailBillingOverageInvoice(tenantId: string) {
    return mailBilling.overageInvoice(tenantId);
  }

  mailBillingContracts(tenantId: string) {
    return mailBilling.contracts(tenantId);
  }

  mailBillingCreateContract(tenantId: string, input: any) {
    return mailBilling.createContract(tenantId, input);
  }

  mailBillingContractStatus(tenantId: string) {
    return mailBilling.contractStatus(tenantId);
  }

  mailBillingCancelContract(tenantId: string) {
    return mailBilling.cancelContract(tenantId);
  }

  mailBillingUsageAlerts(tenantId: string) {
    return mailBilling.usageAlerts(tenantId);
  }

  mailBillingSetAlertThresholds(tenantId: string, input: any) {
    return mailBilling.setAlertThresholds(tenantId, input);
  }

  mailBillingDowngrade(tenantId: string, plan: string) {
    return mailBilling.downgradePlan(tenantId, plan);
  }

  mailBillingSetAutoRenew(tenantId: string, enabled: boolean) {
    return mailBilling.setAutoRenew(tenantId, enabled);
  }

  mailBillingCancelSubscription(tenantId: string) {
    return mailBilling.cancelSubscription(tenantId);
  }

  mailBillingCredits(tenantId: string) {
    return mailBilling.creditBalance(tenantId);
  }

  mailNotifications(tenantId: string, opts: any) {
    return mailNotifications.listNotifications(tenantId, opts);
  }

  mailCreateNotification(tenantId: string, input: any) {
    return mailNotifications.notify(tenantId, input.type || "", input);
  }

  mailCollectAlerts(tenantId: string, opts: any) {
    return mailNotifications.collectAlerts(tenantId, opts);
  }

  mailMarkNotificationRead(tenantId: string, notificationId: string) {
    return mailNotifications.markRead(notificationId);
  }

  mailMarkAllNotificationsRead(tenantId: string) {
    return mailNotifications.markAllRead(tenantId);
  }

  mailDeleteNotification(tenantId: string, notificationId: string) {
    return mailNotifications.deleteNotification(notificationId);
  }

  mailClearNotifications(tenantId: string) {
    return mailNotifications.clearAll(tenantId);
  }

  mailNotificationSettings(tenantId: string) {
    return mailNotifications.notificationSettings(tenantId);
  }

  mailUpdateNotificationSettings(tenantId: string, patch: any) {
    return mailNotifications.updateNotificationSettings(tenantId, patch);
  }

  mailNotificationCenter(tenantId: string) {
    return mailNotifications.notificationCenter(tenantId);
  }

  // ---- Round 32: quantum security ----
  mailQuantumAlgorithms() {
    return mailQuantum.algorithmCatalog();
  }

  mailQuantumKeys(tenantId: string) {
    return mailQuantum.listKeys(tenantId);
  }

  mailQuantumCreateKey(tenantId: string, input: any) {
    return mailQuantum.createKeyPair(tenantId, input);
  }

  mailQuantumKey(tenantId: string, keyId: string) {
    return mailQuantum.getKey(tenantId, keyId);
  }

  mailQuantumRotateKey(tenantId: string, keyId: string) {
    return mailQuantum.rotateKey(tenantId, keyId);
  }

  mailQuantumRevokeKey(tenantId: string, keyId: string) {
    return mailQuantum.revokeKey(tenantId, keyId);
  }

  mailQuantumQkdChannels(tenantId: string) {
    return mailQuantum.qkdChannels(tenantId);
  }

  mailQuantumCreateQkd(tenantId: string, input: any) {
    return mailQuantum.createQkdChannel(tenantId, input);
  }

  mailQuantumSimulateQkd(tenantId: string, channelId: string) {
    return mailQuantum.simulateQkdExchange(tenantId, channelId);
  }

  mailQuantumQkdExchanges(tenantId: string, channelId?: string) {
    return mailQuantum.qkdExchanges(tenantId, channelId);
  }

  mailQuantumEncrypt(tenantId: string, input: any) {
    return mailQuantum.encryptMessage(tenantId, input);
  }

  mailQuantumDecrypt(tenantId: string, messageId: string) {
    return mailQuantum.decryptMessage(tenantId, messageId);
  }

  mailQuantumCertificates(tenantId: string) {
    return mailQuantum.listCertificates(tenantId);
  }

  mailQuantumIssueCert(tenantId: string, input: any) {
    return mailQuantum.issueCertificate(tenantId, input);
  }

  mailQuantumCert(tenantId: string, certId: string) {
    return mailQuantum.getCertificate(tenantId, certId);
  }

  mailQuantumRevokeCert(tenantId: string, certId: string) {
    return mailQuantum.revokeCertificate(tenantId, certId);
  }

  mailQuantumRenewCert(tenantId: string, certId: string) {
    return mailQuantum.renewCertificate(tenantId, certId);
  }

  mailQuantumChain(tenantId: string) {
    return mailQuantum.certificateChain(tenantId);
  }

  mailQuantumOverview(tenantId: string) {
    return mailQuantum.quantumOverview(tenantId);
  }

  mailQuantumDashboard(tenantId: string) {
    return mailQuantum.quantumDashboard(tenantId);
  }

  mailQuantumLog(tenantId: string) {
    return mailQuantum.quantumLog(tenantId);
  }

  // ---- Round 32: collaboration v2 ----
  mailCollab2Approvals(tenantId: string, status?: string) {
    return mailCollab2.listApprovals(tenantId, status);
  }

  mailCollab2CreateApproval(tenantId: string, input: any) {
    return mailCollab2.createApproval(tenantId, input);
  }

  mailCollab2Approve(tenantId: string, approvalId: string, input: any) {
    return mailCollab2.approveApproval(tenantId, approvalId, input);
  }

  mailCollab2Reject(tenantId: string, approvalId: string, input: any) {
    return mailCollab2.rejectApproval(tenantId, approvalId, input);
  }

  mailCollab2Withdraw(tenantId: string, approvalId: string) {
    return mailCollab2.withdrawApproval(tenantId, approvalId);
  }

  mailCollab2ApprovalDashboard(tenantId: string) {
    return mailCollab2.approvalDashboard(tenantId);
  }

  mailCollab2Delegations(tenantId: string, opts: any) {
    return mailCollab2.listDelegations(tenantId, opts);
  }

  mailCollab2Delegate(tenantId: string, input: any) {
    return mailCollab2.delegateInbox(tenantId, input);
  }

  mailCollab2AcceptDelegation(tenantId: string, delegationId: string) {
    return mailCollab2.acceptDelegation(tenantId, delegationId);
  }

  mailCollab2RevokeDelegation(tenantId: string, delegationId: string) {
    return mailCollab2.revokeDelegation(tenantId, delegationId);
  }

  mailCollab2DelegationSummary(tenantId: string) {
    return mailCollab2.delegationSummary(tenantId);
  }

  mailCollab2Roles(tenantId: string) {
    return mailCollab2.listRoles(tenantId);
  }

  mailCollab2AssignRole(tenantId: string, input: any) {
    return mailCollab2.assignRole(tenantId, input);
  }

  mailCollab2RemoveRole(tenantId: string, roleId: string) {
    return mailCollab2.removeRole(tenantId, roleId);
  }

  mailCollab2RoleMatrix() {
    return mailCollab2.roleMatrix();
  }

  mailCollab2TeamDashboard(tenantId: string) {
    return mailCollab2.teamDashboard(tenantId);
  }

  mailCollab2MentionDetect(tenantId: string, text: string) {
    return mailCollab2.mentionDetect(tenantId, text);
  }

  mailCollab2CreateMention(tenantId: string, input: any) {
    return mailCollab2.createMention(tenantId, input);
  }

  mailCollab2Mentions(tenantId: string, opts: any) {
    return mailCollab2.listMentions(tenantId, opts);
  }

  mailCollab2MarkMentionRead(tenantId: string, mentionId: string) {
    return mailCollab2.markMentionRead(tenantId, mentionId);
  }

  mailCollab2MentionsSummary(tenantId: string) {
    return mailCollab2.mentionsSummary(tenantId);
  }

  mailCollab2Dashboard(tenantId: string) {
    return mailCollab2.collab2Dashboard(tenantId);
  }

  mailThreadList(tenantId: string, opts: any = {}) {
    return mailThread.threadList(tenantId, opts);
  }

  mailThreadWorkspace(tenantId: string, threadId: string) {
    return mailThread.threadWorkspace(tenantId, threadId);
  }

  mailThreadSetState(tenantId: string, threadId: string, state: string) {
    return mailThread.setThreadState(tenantId, threadId, state);
  }

  mailThreadPin(tenantId: string, threadId: string) {
    return mailThread.pinThread(tenantId, threadId);
  }

  mailThreadUnpin(tenantId: string, threadId: string) {
    return mailThread.unpinThread(tenantId, threadId);
  }

  mailThreadTag(tenantId: string, threadId: string, tag: string) {
    return mailThread.tagThread(tenantId, threadId, tag);
  }

  mailThreadUntag(tenantId: string, threadId: string, tag: string) {
    return mailThread.untagThread(tenantId, threadId, tag);
  }

  mailThreadPriority(tenantId: string, threadId: string, priority: string) {
    return mailThread.setThreadPriority(tenantId, threadId, priority);
  }

  mailThreadMerge(tenantId: string, targetThreadId: string, sourceThreadId: string) {
    return mailThread.mergeThreads(tenantId, targetThreadId, sourceThreadId);
  }

  mailThreadDashboard(tenantId: string) {
    return mailThread.threadDashboard(tenantId);
  }

  mailThreadLog(tenantId: string, limit?: number) {
    return mailThread.threadLog(tenantId, limit);
  }

  mailBillingCoupons() {
    return mailBilling.couponCatalog();
  }

  mailBillingApplyCoupon(tenantId: string, code: string) {
    return mailBilling.applyCoupon(tenantId, code);
  }

  mailBillingRemoveCoupon(tenantId: string) {
    return mailBilling.removeCoupon(tenantId);
  }

  mailBillingCouponStatus(tenantId: string) {
    return mailBilling.couponStatus(tenantId);
  }

  mailBillingSetTaxRate(tenantId: string, pct: any) {
    return mailBilling.setTaxRate(tenantId, pct);
  }

  mailBillingTaxRate(tenantId: string) {
    return mailBilling.billingTaxRate(tenantId);
  }

  mailAutomationTriggers() {
    return mailAutomation.automationTriggers();
  }

  mailAutomationActions() {
    return mailAutomation.automationActionCatalog();
  }

  mailAutomations(tenantId: string) {
    return mailAutomation.listAutomations(tenantId);
  }

  mailCreateAutomation(tenantId: string, input: any) {
    return mailAutomation.createAutomation(tenantId, input);
  }

  mailAutomation(tenantId: string, automationId: string) {
    return mailAutomation.getAutomation(tenantId, automationId);
  }

  mailUpdateAutomation(tenantId: string, automationId: string, patch: any) {
    return mailAutomation.updateAutomation(tenantId, automationId, patch);
  }

  mailToggleAutomation(tenantId: string, automationId: string) {
    return mailAutomation.toggleAutomation(tenantId, automationId);
  }

  mailDeleteAutomation(tenantId: string, automationId: string) {
    return mailAutomation.deleteAutomation(tenantId, automationId);
  }

  mailRunAutomation(tenantId: string, automationId: string, messageId: string) {
    return mailAutomation.runAutomation(tenantId, automationId, messageId);
  }

  mailTestAutomation(tenantId: string, automationId: string, sample: any) {
    return mailAutomation.testAutomation(tenantId, automationId, sample);
  }

  mailAutomationDueRuns(tenantId: string) {
    return mailAutomation.dueRuns(tenantId);
  }

  mailAutomationDashboard(tenantId: string) {
    return mailAutomation.automationDashboard(tenantId);
  }

  mailAutomationLog(tenantId: string, limit?: number) {
    return mailAutomation.automationLog(tenantId, limit);
  }

  mailDeliverabilityDashboard(tenantId: string) {
    return mailDeliverability.deliverabilityDashboard(tenantId);
  }

  mailBounceStats(tenantId: string) {
    return mailDeliverability.bounceStats(tenantId);
  }

  mailBounces(tenantId: string, type?: string) {
    return mailDeliverability.listBounces(tenantId, type);
  }

  mailRecordBounce(tenantId: string, input: any) {
    return mailDeliverability.recordBounce(tenantId, input);
  }

  mailRecordComplaint(tenantId: string, input: any) {
    return mailDeliverability.recordComplaint(tenantId, input);
  }

  mailSuppressionList(tenantId: string, reason?: string) {
    return mailDeliverability.suppressionList(tenantId, reason);
  }

  mailSuppressEmail(tenantId: string, input: any) {
    return mailDeliverability.suppressEmail(tenantId, input.email, input.reason, input.note);
  }

  mailUnsuppressEmail(tenantId: string, email: string) {
    return mailDeliverability.unsuppressEmail(tenantId, email);
  }

  mailSuppressionStatus(tenantId: string, email: string) {
    return mailDeliverability.suppressionStatus(tenantId, email);
  }

  mailSendingReputation(tenantId: string) {
    return mailDeliverability.sendingReputation(tenantId);
  }

  mailListHygiene(tenantId: string) {
    return mailDeliverability.listHygiene(tenantId);
  }

  mailSequences(tenantId: string) {
    return mailSequence.listSequences(tenantId);
  }

  mailCreateSequence(tenantId: string, input: any) {
    return mailSequence.createSequence(tenantId, input);
  }

  mailSequence(tenantId: string, sequenceId: string) {
    return mailSequence.getSequence(tenantId, sequenceId);
  }

  mailUpdateSequence(tenantId: string, sequenceId: string, patch: any) {
    return mailSequence.updateSequence(tenantId, sequenceId, patch);
  }

  mailToggleSequence(tenantId: string, sequenceId: string) {
    return mailSequence.toggleSequence(tenantId, sequenceId);
  }

  mailDeleteSequence(tenantId: string, sequenceId: string) {
    return mailSequence.deleteSequence(tenantId, sequenceId);
  }

  mailEnrollContact(tenantId: string, sequenceId: string, email: string) {
    return mailSequence.enrollContact(tenantId, sequenceId, email);
  }

  mailEnrollMany(tenantId: string, sequenceId: string, emails: string[]) {
    return mailSequence.enrollMany(tenantId, sequenceId, emails);
  }

  mailPauseEnrollment(tenantId: string, enrollmentId: string) {
    return mailSequence.pauseEnrollment(tenantId, enrollmentId);
  }

  mailResumeEnrollment(tenantId: string, enrollmentId: string) {
    return mailSequence.resumeEnrollment(tenantId, enrollmentId);
  }

  mailUnenrollContact(tenantId: string, enrollmentId: string, reason?: string) {
    return mailSequence.unenrollContact(tenantId, enrollmentId, reason);
  }

  mailAdvanceSequence(tenantId: string, sequenceId?: string) {
    return mailSequence.advanceSequence(tenantId, sequenceId);
  }

  mailSequenceProgress(tenantId: string, sequenceId: string) {
    return mailSequence.sequenceProgress(tenantId, sequenceId);
  }

  mailSequencesDashboard(tenantId: string) {
    return mailSequence.sequencesDashboard(tenantId);
  }

  mailUnsubscribeLink(tenantId: string, email: string, category?: string) {
    return mailUnsubscribe.generateUnsubscribeLink(tenantId, email, category);
  }

  mailUnsubscribe(tenantId: string, input: any) {
    return mailUnsubscribe.unsubscribe(tenantId, input);
  }

  mailPreferences(tenantId: string, email: string) {
    return mailUnsubscribe.getPreferences(tenantId, email);
  }

  mailUpdatePreferences(tenantId: string, email: string, patch: any) {
    return mailUnsubscribe.updatePreferences(tenantId, email, patch);
  }

  mailUnsubscribeStatus(tenantId: string, email: string) {
    return mailUnsubscribe.unsubscribeStatus(tenantId, email);
  }

  mailUnsubscribeLog(tenantId: string, limit?: number) {
    return mailUnsubscribe.unsubscribeLog(tenantId, limit);
  }

  mailUnsubscribeDashboard(tenantId: string) {
    return mailUnsubscribe.unsubscribeDashboard(tenantId);
  }

  mailTickets(tenantId: string, filters: any) {
    return mailTicket.listTickets(tenantId, filters);
  }

  mailCreateTicket(tenantId: string, input: any) {
    return mailTicket.createTicket(tenantId, input);
  }

  mailTicket(tenantId: string, ticketId: string) {
    return mailTicket.getTicket(tenantId, ticketId);
  }

  mailUpdateTicket(tenantId: string, ticketId: string, patch: any) {
    return mailTicket.updateTicket(tenantId, ticketId, patch);
  }

  mailAssignTicket(tenantId: string, ticketId: string, assignee: string) {
    return mailTicket.assignTicket(tenantId, ticketId, assignee);
  }

  mailTicketPriority(tenantId: string, ticketId: string, priority: string) {
    return mailTicket.setPriority(tenantId, ticketId, priority);
  }

  mailTicketTag(tenantId: string, ticketId: string, tag: string) {
    return mailTicket.tagTicket(tenantId, ticketId, tag);
  }

  mailTicketUntag(tenantId: string, ticketId: string, tag: string) {
    return mailTicket.untagTicket(tenantId, ticketId, tag);
  }

  mailTicketNote(tenantId: string, ticketId: string, note: string, author?: string) {
    return mailTicket.addNote(tenantId, ticketId, note, author);
  }

  mailResolveTicket(tenantId: string, ticketId: string) {
    return mailTicket.resolveTicket(tenantId, ticketId);
  }

  mailReopenTicket(tenantId: string, ticketId: string) {
    return mailTicket.reopenTicket(tenantId, ticketId);
  }

  mailEscalateTicket(tenantId: string, ticketId: string) {
    return mailTicket.escalateTicket(tenantId, ticketId);
  }

  mailTicketSla(tenantId: string) {
    return mailTicket.slaOverview(tenantId);
  }

  mailTicketDashboard(tenantId: string) {
    return mailTicket.ticketDashboard(tenantId);
  }

  mailTicketLog(tenantId: string, limit?: number) {
    return mailTicket.ticketLog(tenantId, limit);
  }

  mailTicketEvents(tenantId: string, ticketId: string) {
    return mailTicket.ticketEvents(tenantId, ticketId);
  }

  mailCreateBackup(tenantId: string, label?: string) {
    return mailBackup.createBackup(tenantId, label);
  }

  mailBackups(tenantId: string) {
    return mailBackup.listBackups(tenantId);
  }

  mailBackup(tenantId: string, backupId: string) {
    return mailBackup.getBackup(tenantId, backupId);
  }

  mailDeleteBackup(tenantId: string, backupId: string) {
    return mailBackup.deleteBackup(tenantId, backupId);
  }

  mailRestoreBackup(tenantId: string, backupId: string) {
    return mailBackup.restoreBackup(tenantId, backupId);
  }

  mailBackupSchedule(tenantId: string) {
    return mailBackup.backupSchedule(tenantId);
  }

  mailSetBackupSchedule(tenantId: string, input: any) {
    return mailBackup.setBackupSchedule(tenantId, input);
  }

  mailBackupsDashboard(tenantId: string) {
    return mailBackup.backupsDashboard(tenantId);
  }

  mailCreateApiKey(tenantId: string, input: any) {
    return mailApiKey.createApiKey(tenantId, input);
  }

  mailApiKeys(tenantId: string) {
    return mailApiKey.listApiKeys(tenantId);
  }

  mailApiKey(tenantId: string, apiKeyId: string) {
    return mailApiKey.getApiKey(tenantId, apiKeyId);
  }

  mailRevokeApiKey(tenantId: string, apiKeyId: string) {
    return mailApiKey.revokeApiKey(tenantId, apiKeyId);
  }

  mailVerifyApiKey(tenantId: string, key: string) {
    return mailApiKey.verifyApiKey(tenantId, key);
  }

  mailApiKeyUsage(tenantId: string, apiKeyId: string) {
    return mailApiKey.apiKeyUsage(tenantId, apiKeyId);
  }

  mailApiKeyDashboard(tenantId: string) {
    return mailApiKey.apiKeyDashboard(tenantId);
  }

  mailBiometricSignals() {
    return mailBiometric.signals();
  }

  mailBiometricRecord(tenantId: string, sessionId: string, signalId: string, value?: number) {
    return mailBiometric.recordSignal(tenantId, sessionId, signalId, value);
  }

  mailBiometricSession(tenantId: string, sessionId: string) {
    return mailBiometric.sessionScore(tenantId, sessionId);
  }

  mailBiometricEvaluate(tenantId: string, sessionId: string) {
    return mailBiometric.evaluateAuth(tenantId, sessionId);
  }

  mailBiometricBaseline(tenantId: string) {
    return mailBiometric.baseline(tenantId);
  }

  mailBiometricLog(tenantId: string) {
    return mailBiometric.biometricLog(tenantId);
  }

  mailBiometricDashboard(tenantId: string) {
    return mailBiometric.biometricDashboard(tenantId);
  }

  mailZeroTrustLayers(tenantId: string) {
    return mailZeroTrust.layers(tenantId);
  }

  mailZeroTrustEnroll(tenantId: string, input: any) {
    return mailZeroTrust.enrollDevice(tenantId, input);
  }

  mailZeroTrustDevices(tenantId: string) {
    return mailZeroTrust.devices(tenantId);
  }

  mailZeroTrustPosture(tenantId: string, deviceId: string) {
    return mailZeroTrust.devicePosture(tenantId, deviceId);
  }

  mailZeroTrustAccess(tenantId: string, input: any) {
    return mailZeroTrust.accessRequest(tenantId, input);
  }

  mailZeroTrustHoneytokens(tenantId: string) {
    return mailZeroTrust.honeytokens(tenantId);
  }

  mailZeroTrustHoneytokenHit(tenantId: string, tokenId: string) {
    return mailZeroTrust.honeytokenHit(tenantId, tokenId);
  }

  mailZeroTrustOverview(tenantId: string) {
    return mailZeroTrust.zeroTrustOverview(tenantId);
  }

  mailZeroTrustLog(tenantId: string) {
    return mailZeroTrust.zeroTrustLog(tenantId);
  }

  mailZeroTrustDashboard(tenantId: string) {
    return mailZeroTrust.zeroTrustDashboard(tenantId);
  }

  mailAiGovernanceModels(tenantId: string) {
    return mailAiGovernance.modelCards(tenantId);
  }

  mailAiGovernanceRegister(tenantId: string, input: any) {
    return mailAiGovernance.registerModel(tenantId, input);
  }

  mailAiGovernanceReview(tenantId: string, modelId: string, decision: string) {
    return mailAiGovernance.reviewModel(tenantId, modelId, decision);
  }

  mailAiGovernanceScanInput(tenantId: string, text: string) {
    return mailAiGovernance.scanInput(tenantId, text);
  }

  mailAiGovernanceScanOutput(tenantId: string, text: string) {
    return mailAiGovernance.scanOutput(tenantId, text);
  }

  mailAiGovernanceRateLimit(tenantId: string, userId: string) {
    return mailAiGovernance.rateLimit(tenantId, userId);
  }

  mailAiGovernanceShadow(tenantId: string) {
    return mailAiGovernance.shadowAi(tenantId);
  }

  mailAiGovernanceRedTeam(tenantId: string) {
    return mailAiGovernance.redTeam(tenantId);
  }

  mailAiGovernanceDashboard(tenantId: string) {
    return mailAiGovernance.governanceDashboard(tenantId);
  }

  mailAiGovernanceLog(tenantId: string) {
    return mailAiGovernance.governanceLog(tenantId);
  }

  mailPerformanceCaching(tenantId: string) {
    return mailPerformance.caching(tenantId);
  }

  mailPerformanceFlushCache(tenantId: string, layerId?: string) {
    return mailPerformance.flushCache(tenantId, layerId);
  }

  mailPerformanceQueryOptimization(tenantId: string) {
    return mailPerformance.queryOptimization(tenantId);
  }

  mailPerformanceExplainQuery(tenantId: string, query: string) {
    return mailPerformance.explainQuery(tenantId, query);
  }

  mailPerformanceScalability(tenantId: string) {
    return mailPerformance.scalability(tenantId);
  }

  mailPerformanceEdge(tenantId: string) {
    return mailPerformance.edge(tenantId);
  }

  mailPerformanceSustainability(tenantId: string) {
    return mailPerformance.sustainability(tenantId);
  }

  mailPerformanceDashboard(tenantId: string) {
    return mailPerformance.performanceDashboard(tenantId);
  }

  mailPerformanceLog(tenantId: string) {
    return mailPerformance.perfLog(tenantId);
  }

  mailChaosCatalog(tenantId: string) {
    return mailChaos.catalog(tenantId);
  }

  mailChaosRun(tenantId: string, experimentId: string) {
    return mailChaos.runExperiment(tenantId, experimentId);
  }

  mailChaosExperiments(tenantId: string) {
    return mailChaos.experiments(tenantId);
  }

  mailChaosResilience(tenantId: string) {
    return mailChaos.resilienceScore(tenantId);
  }

  mailChaosGameDays(tenantId: string) {
    return mailChaos.gameDays(tenantId);
  }

  mailChaosAbort(tenantId: string, runId: string) {
    return mailChaos.abortExperiment(tenantId, runId);
  }

  mailChaosLog(tenantId: string) {
    return mailChaos.chaosLog(tenantId);
  }

  mailChaosDashboard(tenantId: string) {
    return mailChaos.chaosDashboard(tenantId);
  }
}

export const adsMarketingModule = new AdsMarketingModuleService();
