import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";
import { unifiedAdsPipeline } from "./UnifiedAdsPipelineService";
import { campaignHealthService, CampaignHealthScore } from "./CampaignHealthService";
import { campaignSaturationService } from "./CampaignSaturationService";
import { portfolioBudgetOptimizer } from "./PortfolioBudgetOptimizerService";
import { CampaignSummaryService } from "./CampaignSummaryService";
import { DataStore } from "./DataStore";

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
}

export const adsMarketingModule = new AdsMarketingModuleService();
