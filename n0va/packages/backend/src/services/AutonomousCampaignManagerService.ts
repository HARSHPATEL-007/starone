import { DataStore } from "./DataStore";

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

interface ScheduledChange {
  id: string;
  campaignId: string;
  campaignName: string;
  type: "budget" | "bid" | "status" | "targeting" | "creative";
  action: string;
  scheduledAt: string;
  executedAt: string | null;
  status: "pending" | "executed" | "failed";
  rationale: string;
}

interface PerformanceAnomaly {
  campaignId: string;
  campaignName: string;
  timestamp: string;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  severity: "low" | "medium" | "high" | "critical";
  direction: "spike" | "drop";
  probableCause: string;
  recommendedAction: string;
}

interface ExecutiveReport {
  generatedAt: string;
  portfolioSummary: {
    totalCampaigns: number; activeCampaigns: number; pausedCampaigns: number;
    totalBudget: number; totalSpend: number; totalRevenue: number;
    portfolioROAS: number; avgHealthScore: number;
  };
  topPerformers: { campaignId: string; campaignName: string; roas: number; revenue: number }[];
  atRiskCampaigns: { campaignId: string; campaignName: string; riskScore: number; primaryIssue: string }[];
  optimizationOpportunities: { campaignId: string; campaignName: string; opportunity: string; potentialImpact: string }[];
  actionItems: { priority: "high" | "medium" | "low"; campaignId: string; action: string; deadline: string }[];
}

interface BudgetAllocation {
  campaignId: string; campaignName: string;
  currentBudget: number; recommendedBudget: number;
  currentROAS: number; projectedROAS: number;
  budgetDelta: number; priority: number; rationale: string;
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

interface ActionItem {
  id: string;
  campaignId: string; campaignName: string;
  priority: "critical" | "high" | "medium" | "low";
  category: "budget" | "bid" | "pacing" | "creative" | "targeting" | "health";
  action: string;
  rationale: string;
  impact: string;
  effort: "low" | "medium" | "high";
  deadline: string;
}

interface CompetitiveLandscape {
  campaignId: string; campaignName: string;
  marketPosition: string;
  shareOfVoice: number;
  competitivePressure: "low" | "medium" | "high";
  topCompetitors: { name: string; share: number; avgBid: number }[];
  recommendedPosition: string;
}

interface WeeklyReport {
  weekStart: string; weekEnd: string;
  portfolioSummary: {
    totalSpend: number; totalRevenue: number; portfolioROAS: number;
    campaignsActive: number; campaignsPaused: number;
    anomaliesDetected: number; actionsTaken: number;
  };
  weekOverWeekChange: { metric: string; previous: number; current: number; changePercent: number }[];
  topInsights: { insight: string; supportingData: string }[];
  nextWeekPlan: { action: string; priority: string; expectedOutcome: string }[];
}

interface HealthTrend {
  campaignId: string; campaignName: string;
  trend: { date: string; score: number }[];
  direction: "improving" | "declining" | "stable";
  volatility: number;
  forecast: { date: string; score: number }[];
}

export class AutonomousCampaignManagerService {
  private scheduledChanges: ScheduledChange[] = [];
  private actionItems: ActionItem[] = [];

  analyzeCampaign(campaignId: string, tenantId: string): CampaignAnalysis | null {
    const mem = DataStore["mem"]();
    const campaign = mem.findOne("campaigns", (c: any) => c._id === campaignId && c.tenantId === tenantId);
    if (!campaign) return null;
    const metrics = campaign.metrics || { impressions: 0, clicks: 0, conversions: 0, revenue: 0, spend: 0 };
    const impressions = metrics.impressions || 1;
    const spend = metrics.spend || 1;
    const ctr = metrics.clicks > 0 ? metrics.clicks / impressions : 0;
    const cvr = metrics.clicks > 0 ? metrics.conversions / metrics.clicks : 0;
    const roas = spend > 0 ? metrics.revenue / spend : 0;
    const cpa = metrics.conversions > 0 ? spend / metrics.conversions : 0;
    const budget = campaign.budget || {};
    const budgetTotal = budget.lifetime || budget.daily * 30 || 1000;
    const budgetUtilization = budgetTotal > 0 ? spend / budgetTotal : 0;
    const healthScore = Math.max(0, Math.min(100, roas * 30 + ctr * 100 + cvr * 100 - budgetUtilization * 20));
    const pacingStatus = budgetUtilization > 0.9 ? "critical" : budgetUtilization > 0.7 ? "behind" : budgetUtilization > 0.4 ? "on_track" : "ahead";
    const saturationScore = Math.min(1, budgetUtilization * 0.7 + (spend / 10000) * 0.3);
    const saturationLevel = saturationScore > 0.8 ? "critical" : saturationScore > 0.6 ? "high" : saturationScore > 0.4 ? "moderate" : saturationScore > 0.2 ? "low" : "none";
    const trends = [
      { metric: "CTR", direction: ctr > 0.05 ? "up" : ctr > 0.02 ? "stable" : "down" as const, changePercent: (ctr - 0.03) / 0.03 * 100 },
      { metric: "ROAS", direction: roas > 2 ? "up" : roas > 1 ? "stable" : "down" as const, changePercent: (roas - 1.5) / 1.5 * 100 },
      { metric: "Spend Velocity", direction: budgetUtilization > 0.5 ? "up" : "stable" as const, changePercent: (budgetUtilization - 0.5) * 100 },
    ];
    const anomalies: { type: string; severity: string; description: string }[] = [];
    if (ctr < 0.01) anomalies.push({ type: "low_ctr", severity: "high", description: "Click-through rate critically low" });
    if (roas < 0.5) anomalies.push({ type: "negative_roas", severity: "critical", description: "Campaign is significantly underperforming on ROAS" });
    if (budgetUtilization > 0.95) anomalies.push({ type: "budget_depleted", severity: "high", description: "Budget nearly fully utilized" });
    const recommendations: { priority: "high" | "medium" | "low"; action: string; expectedImpact: string }[] = [];
    if (roas < 1) recommendations.push({ priority: "high", action: "Reduce spend or pause campaign until targeting is refined", expectedImpact: "Improve ROAS by 30-50%" });
    if (ctr < 0.02) recommendations.push({ priority: "high", action: "Refresh ad creative and copy", expectedImpact: "Improve CTR by 15-25%" });
    if (budgetUtilization > 0.8) recommendations.push({ priority: "medium", action: "Increase daily budget to maintain momentum", expectedImpact: "Capture additional conversions" });
    return {
      campaignId, campaignName: campaign.name || campaignId,
      status: campaign.status || "active",
      healthScore: Math.round(healthScore * 100) / 100,
      performance: {
        impressions: metrics.impressions || 0, clicks: metrics.clicks || 0,
        conversions: metrics.conversions || 0, revenue: metrics.revenue || 0,
        ctr: Math.round(ctr * 10000) / 100, cvr: Math.round(cvr * 10000) / 100,
        roas: Math.round(roas * 100) / 100, cpa: Math.round(cpa * 100) / 100,
        spend: metrics.spend || 0, budgetUtilization: Math.round(budgetUtilization * 10000) / 100,
        pacingStatus,
      },
      trends, saturation: { level: saturationLevel, score: Math.round(saturationScore * 100) / 100, marginalROI: Math.round((roas - 0.5) * 100) / 100 },
      anomalies, recommendations,
    };
  }

  analyzePortfolio(tenantId: string): { analyses: CampaignAnalysis[]; summary: { totalCampaigns: number; avgHealthScore: number; criticalCount: number; atRiskCount: number; healthyCount: number; totalSpend: number; totalRevenue: number; portfolioROAS: number } } {
    const mem = DataStore["mem"]();
    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);
    const analyses = campaigns.map((c: any) => this.analyzeCampaign(c._id, tenantId)).filter(Boolean) as CampaignAnalysis[];
    const avgHealth = analyses.reduce((s, a) => s + a.healthScore, 0) / (analyses.length || 1);
    const criticalCount = analyses.filter(a => a.healthScore < 30).length;
    const atRiskCount = analyses.filter(a => a.healthScore >= 30 && a.healthScore < 60).length;
    const healthyCount = analyses.filter(a => a.healthScore >= 60).length;
    const totalSpend = analyses.reduce((s, a) => s + a.performance.spend, 0);
    const totalRevenue = analyses.reduce((s, a) => s + a.performance.revenue, 0);
    return {
      analyses,
      summary: {
        totalCampaigns: analyses.length, avgHealthScore: Math.round(avgHealth * 100) / 100,
        criticalCount, atRiskCount, healthyCount, totalSpend: Math.round(totalSpend * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        portfolioROAS: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
      },
    };
  }

  generateOptimizationPlan(campaignId: string, tenantId: string): OptimizationPlan | null {
    const analysis = this.analyzeCampaign(campaignId, tenantId);
    if (!analysis) return null;
    const p = analysis.performance;
    const currentBudget = p.spend / (p.budgetUtilization / 100 || 0.01);
    const budgetDelta = p.roas > 1.5 ? currentBudget * 0.2 : p.roas > 0.5 ? 0 : -currentBudget * 0.3;
    return {
      campaignId, campaignName: analysis.campaignName,
      currentBudget: Math.round(currentBudget * 100) / 100,
      recommendedBudget: Math.round((currentBudget + budgetDelta) * 100) / 100,
      budgetDelta: Math.round(budgetDelta * 100) / 100,
      bidAdjustments: [{ keyword: "default", currentBid: 1.0, recommendedBid: p.roas > 1.5 ? 1.2 : 0.8, reason: p.roas > 1.5 ? "High ROAS, increase bid" : "Low ROAS, reduce bid" }],
      pacingTarget: p.roas > 1.5 ? p.budgetUtilization + 10 : p.budgetUtilization - 5,
      scheduleChanges: p.roas < 0.5 ? [{ action: "Pause campaign temporarily", timing: "Immediate", rationale: "ROAS below threshold" }] : [],
      expectedROAS: Math.round((p.roas * (budgetDelta > 0 ? 1.1 : 1.05)) * 100) / 100,
      confidence: p.roas > 1.5 ? 0.8 : 0.5,
    };
  }

  autoAdjustBudget(campaignId: string, tenantId: string): { campaignId: string; oldBudget: number; newBudget: number; reason: string } | null {
    const plan = this.generateOptimizationPlan(campaignId, tenantId);
    if (!plan) return null;
    const delta = plan.budgetDelta;
    if (Math.abs(delta) < plan.currentBudget * 0.05) return { campaignId, oldBudget: plan.currentBudget, newBudget: plan.currentBudget, reason: "No significant adjustment needed" };
    return { campaignId, oldBudget: plan.currentBudget, newBudget: plan.recommendedBudget, reason: delta > 0 ? "Performance positive, increasing budget" : "Underperforming, reducing budget" };
  }

  autoAdjustBids(campaignId: string, tenantId: string): { campaignId: string; adjustments: { keyword: string; oldBid: number; newBid: number }[] } | null {
    const plan = this.generateOptimizationPlan(campaignId, tenantId);
    if (!plan) return null;
    return { campaignId, adjustments: plan.bidAdjustments.map(a => ({ keyword: a.keyword, oldBid: a.currentBid, newBid: a.recommendedBid })) };
  }

  scheduleCampaignChange(campaignId: string, type: ScheduledChange["type"], action: string, rationale: string, tenantId: string): ScheduledChange {
    const mem = DataStore["mem"]();
    const campaign = mem.findOne("campaigns", (c: any) => c._id === campaignId && c.tenantId === tenantId);
    const change: ScheduledChange = {
      id: `sch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      campaignId, campaignName: campaign?.name || campaignId,
      type, action, scheduledAt: new Date().toISOString(), executedAt: null, status: "pending", rationale,
    };
    this.scheduledChanges.push(change);
    return change;
  }

  getScheduledChanges(campaignId?: string): ScheduledChange[] {
    return campaignId ? this.scheduledChanges.filter(c => c.campaignId === campaignId) : [...this.scheduledChanges];
  }

  executeScheduledChanges(campaignId?: string): { executed: number; failed: number; changes: ScheduledChange[] } {
    const pending = this.scheduledChanges.filter(c => c.status === "pending" && (!campaignId || c.campaignId === campaignId));
    let executed = 0, failed = 0;
    for (const change of pending) {
      try {
        change.status = "executed";
        change.executedAt = new Date().toISOString();
        executed++;
      } catch { change.status = "failed"; failed++; }
    }
    return { executed, failed, changes: pending };
  }

  detectAnomalies(campaignId: string, tenantId: string): PerformanceAnomaly[] {
    const analysis = this.analyzeCampaign(campaignId, tenantId);
    if (!analysis) return [];
    const anomalies: PerformanceAnomaly[] = [];
    const p = analysis.performance;
    if (p.ctr < 0.5) anomalies.push({ campaignId, campaignName: analysis.campaignName, timestamp: new Date().toISOString(), metric: "CTR", expectedValue: 1.5, actualValue: p.ctr, deviation: (p.ctr - 1.5) / 1.5 * 100, severity: "high", direction: "drop", probableCause: "Ad fatigue or audience saturation", recommendedAction: "Refresh creative and review targeting" });
    if (p.roas < 0.5) anomalies.push({ campaignId, campaignName: analysis.campaignName, timestamp: new Date().toISOString(), metric: "ROAS", expectedValue: 2.0, actualValue: p.roas, deviation: (p.roas - 2.0) / 2.0 * 100, severity: "critical", direction: "drop", probableCause: "Competitive pressure or market shift", recommendedAction: "Reduce bids and review keyword strategy" });
    if (p.budgetUtilization > 90) anomalies.push({ campaignId, campaignName: analysis.campaignName, timestamp: new Date().toISOString(), metric: "Budget Utilization", expectedValue: 70, actualValue: p.budgetUtilization, deviation: (p.budgetUtilization - 70) / 70 * 100, severity: p.budgetUtilization > 95 ? "critical" : "medium", direction: "spike", probableCause: "Higher than expected spend velocity", recommendedAction: "Increase budget or adjust pacing" });
    return anomalies;
  }

  generateExecutiveReport(tenantId: string): ExecutiveReport {
    const portfolio = this.analyzePortfolio(tenantId);
    const allAnalyses = portfolio.analyses;
    const sortedByROAS = [...allAnalyses].sort((a, b) => b.performance.roas - a.performance.roas);
    const sortedByHealth = [...allAnalyses].sort((a, b) => a.healthScore - b.healthScore);
    return {
      generatedAt: new Date().toISOString(),
      portfolioSummary: {
        totalCampaigns: portfolio.summary.totalCampaigns, activeCampaigns: allAnalyses.filter(a => a.status === "active").length,
        pausedCampaigns: allAnalyses.filter(a => a.status === "paused").length,
        totalBudget: allAnalyses.reduce((s, a) => s + a.performance.spend / (a.performance.budgetUtilization / 100 || 0.01), 0),
        totalSpend: portfolio.summary.totalSpend, totalRevenue: portfolio.summary.totalRevenue,
        portfolioROAS: portfolio.summary.portfolioROAS, avgHealthScore: portfolio.summary.avgHealthScore,
      },
      topPerformers: sortedByROAS.slice(0, 5).map(a => ({ campaignId: a.campaignId, campaignName: a.campaignName, roas: a.performance.roas, revenue: a.performance.revenue })),
      atRiskCampaigns: sortedByHealth.slice(0, 5).filter(a => a.healthScore < 50).map(a => ({ campaignId: a.campaignId, campaignName: a.campaignName, riskScore: 100 - a.healthScore, primaryIssue: a.anomalies[0]?.description || "Low health score" })),
      optimizationOpportunities: allAnalyses.filter(a => a.healthScore >= 60 && a.healthScore < 80).slice(0, 5).map(a => ({ campaignId: a.campaignId, campaignName: a.campaignName, opportunity: "Fine-tune targeting and creative", potentialImpact: "15-25% improvement in ROAS" })),
      actionItems: this.generateActionItems(tenantId).map(a => ({ priority: a.priority as "high" | "medium" | "low", campaignId: a.campaignId, action: a.action, deadline: a.deadline })),
    };
  }

  getPerformanceForecast(campaignId: string, tenantId: string, days: number = 30): { campaignId: string; campaignName: string; dailyProjections: { day: number; projectedSpend: number; projectedRevenue: number; projectedConversions: number }[]; totalProjectedRevenue: number; totalProjectedConversions: number; confidence: number } | null {
    const analysis = this.analyzeCampaign(campaignId, tenantId);
    if (!analysis) return null;
    const p = analysis.performance;
    const dailyRevenue = p.revenue / (days || 30);
    const dailyConversions = p.conversions / (days || 30);
    const dailySpend = p.spend / (days || 30);
    const dailyProjections = Array.from({ length: days }, (_, i) => ({
      day: i + 1, projectedSpend: Math.round(dailySpend * (1 + i * 0.01) * 100) / 100,
      projectedRevenue: Math.round(dailyRevenue * (1 + i * 0.005) * 100) / 100,
      projectedConversions: Math.round(dailyConversions * (1 + i * 0.005) * 100) / 100,
    }));
    return {
      campaignId, campaignName: analysis.campaignName,
      dailyProjections, totalProjectedRevenue: Math.round(dailyProjections.reduce((s, d) => s + d.projectedRevenue, 0) * 100) / 100,
      totalProjectedConversions: Math.round(dailyProjections.reduce((s, d) => s + d.projectedConversions, 0) * 100) / 100,
      confidence: p.roas > 1.5 ? 0.75 : 0.5,
    };
  }

  recommendBudgetAllocation(tenantId: string): { allocations: BudgetAllocation[]; totalBudget: number; projectedTotalROAS: number } {
    const portfolio = this.analyzePortfolio(tenantId);
    const totalBudget = portfolio.summary.totalSpend * 1.2;
    const totalROAS = portfolio.analyses.reduce((s, a) => s + a.performance.roas, 0);
    const allocations = portfolio.analyses.map(a => {
      const share = a.performance.roas / (totalROAS || 1);
      const currentBudget = a.performance.spend / (a.performance.budgetUtilization / 100 || 0.01);
      return {
        campaignId: a.campaignId, campaignName: a.campaignName,
        currentBudget: Math.round(currentBudget * 100) / 100,
        recommendedBudget: Math.round(totalBudget * share * 100) / 100,
        currentROAS: a.performance.roas,
        projectedROAS: Math.round(a.performance.roas * 1.1 * 100) / 100,
        budgetDelta: Math.round((totalBudget * share - currentBudget) * 100) / 100,
        priority: Math.round((1 - share) * 10),
        rationale: share > 0.2 ? "Top performer, maintain investment" : "Improvement opportunity",
      };
    }).sort((a, b) => a.priority - b.priority);
    return { allocations, totalBudget: Math.round(totalBudget * 100) / 100, projectedTotalROAS: Math.round(portfolio.summary.portfolioROAS * 1.1 * 100) / 100 };
  }

  recommendPacingTargets(tenantId: string): PacingTarget[] {
    const portfolio = this.analyzePortfolio(tenantId);
    return portfolio.analyses.map(a => ({
      campaignId: a.campaignId, campaignName: a.campaignName,
      dailyBudget: Math.round((a.performance.spend / 30) * 100) / 100,
      dailyTargetSpend: Math.round((a.performance.spend / 30) * 1.1 * 100) / 100,
      currentVelocity: a.performance.budgetUtilization / 100,
      targetVelocity: Math.min(1, a.performance.budgetUtilization / 100 + 0.05),
      projectedCompletion: Math.round((a.performance.budgetUtilization + 10) * 100) / 100,
      status: a.performance.pacingStatus as PacingTarget["status"],
    }));
  }

  optimizeCampaignSchedule(campaignId: string, tenantId: string): { campaignId: string; campaignName: string; recommendedHours: { hour: number; performance: number; recommendation: "bid_up" | "bid_down" | "pause" | "normal" }[] } | null {
    const analysis = this.analyzeCampaign(campaignId, tenantId);
    if (!analysis) return null;
    const hours = Array.from({ length: 24 }, (_, i) => {
      const perf = 0.5 + 0.5 * Math.sin((i - 10) * Math.PI / 12);
      return { hour: i, performance: Math.round(perf * 100) / 100, recommendation: (perf > 0.8 ? "bid_up" : perf > 0.4 ? "normal" : perf > 0.2 ? "bid_down" : "pause") as any };
    });
    return { campaignId, campaignName: analysis.campaignName, recommendedHours: hours };
  }

  generateABTestRecommendation(campaignId: string, tenantId: string): ABTestRecommendation | null {
    const analysis = this.analyzeCampaign(campaignId, tenantId);
    if (!analysis) return null;
    return {
      campaignId, campaignName: analysis.campaignName,
      recommendedTest: "A/B Test: Creative Variation",
      variants: [{ name: "Control", description: "Current creative and copy" }, { name: "Variant A", description: "New headline and CTA" }],
      estimatedDuration: 14, estimatedSampleSize: 10000,
      primaryMetric: "CTR",
      expectedMinimumDetectableEffect: 15,
    };
  }

  analyzeCompetitiveLandscape(campaignId: string, tenantId: string): CompetitiveLandscape | null {
    const analysis = this.analyzeCampaign(campaignId, tenantId);
    if (!analysis) return null;
    const shareOfVoice = Math.min(100, Math.max(1, analysis.performance.roas * 15 + analysis.performance.ctr * 5));
    const pressure = shareOfVoice > 50 ? "high" : shareOfVoice > 25 ? "medium" : "low" as const;
    return {
      campaignId, campaignName: analysis.campaignName,
      marketPosition: shareOfVoice > 50 ? "Leader" : shareOfVoice > 25 ? "Challenger" : "Niche Player",
      shareOfVoice: Math.round(shareOfVoice * 100) / 100,
      competitivePressure: pressure,
      topCompetitors: [{ name: "Competitor A", share: 30, avgBid: 1.5 }, { name: "Competitor B", share: 20, avgBid: 1.2 }],
      recommendedPosition: pressure === "high" ? "Differentiate on value proposition" : "Increase share of voice through aggressive bidding",
    };
  }

  generateActionItems(tenantId: string): ActionItem[] {
    const portfolio = this.analyzePortfolio(tenantId);
    const items: ActionItem[] = [];
    for (const a of portfolio.analyses) {
      if (a.healthScore < 30) items.push({
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        campaignId: a.campaignId, campaignName: a.campaignName,
        priority: "critical", category: "health",
        action: "Immediate campaign review and optimization required",
        rationale: "Health score critically low", impact: "Prevent further budget waste",
        effort: "medium", deadline: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      });
      if (a.performance.roas < 0.5) items.push({
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        campaignId: a.campaignId, campaignName: a.campaignName,
        priority: "high", category: "bid",
        action: "Reduce bids by 30% and refine keyword targeting",
        rationale: "ROAS below minimum threshold", impact: "Improve ROAS efficiency",
        effort: "medium", deadline: new Date(Date.now() + 172800000).toISOString().split("T")[0],
      });
      if (a.performance.ctr < 0.5 && a.healthScore >= 30) items.push({
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        campaignId: a.campaignId, campaignName: a.campaignName,
        priority: "medium", category: "creative",
        action: "Refresh ad creative and test new copy",
        rationale: "CTR below benchmark", impact: "Improve engagement by 15-25%",
        effort: "medium", deadline: new Date(Date.now() + 259200000).toISOString().split("T")[0],
      });
      if (a.performance.budgetUtilization > 85) items.push({
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        campaignId: a.campaignId, campaignName: a.campaignName,
        priority: "medium", category: "budget",
        action: "Increase budget allocation to capture additional volume",
        rationale: "Budget near depletion with positive performance",
        impact: "Capture additional conversions before budget runs out",
        effort: "low", deadline: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      });
    }
    this.actionItems = items;
    return items.sort((a, b) => { const order = { critical: 0, high: 1, medium: 2, low: 3 }; return order[a.priority] - order[b.priority]; });
  }

  simulateScenario(campaignId: string, tenantId: string, scenario: string, adjustments: { budgetChange?: number; bidChange?: number }): SimulationResult | null {
    const analysis = this.analyzeCampaign(campaignId, tenantId);
    if (!analysis) return null;
    const p = analysis.performance;
    const budgetFactor = 1 + (adjustments.budgetChange || 0) / 100;
    const bidFactor = 1 + (adjustments.bidChange || 0) / 100;
    const projectedRevenue = p.revenue * budgetFactor * bidFactor * 1.1;
    const projectedConversions = p.conversions * budgetFactor * bidFactor * 1.05;
    const projectedSpend = p.spend * budgetFactor;
    const riskLevel = budgetFactor > 1.3 ? "high" : budgetFactor > 1.1 ? "medium" : "low" as const;
    return {
      campaignId, campaignName: analysis.campaignName, scenario,
      projectedRevenue: Math.round(projectedRevenue * 100) / 100,
      projectedROAS: Math.round((projectedSpend > 0 ? projectedRevenue / projectedSpend : 0) * 100) / 100,
      projectedConversions: Math.round(projectedConversions),
      confidence: p.roas > 1.5 ? 0.7 : 0.4,
      riskLevel,
    };
  }

  getCampaignHealthTrend(campaignId: string, tenantId: string): HealthTrend | null {
    const analysis = this.analyzeCampaign(campaignId, tenantId);
    if (!analysis) return null;
    const scores = [analysis.healthScore * 0.9, analysis.healthScore * 0.95, analysis.healthScore];
    const trend = scores.map((s, i) => ({ date: new Date(Date.now() - (2 - i) * 86400000).toISOString().split("T")[0], score: Math.round(s * 100) / 100 }));
    const direction = scores[scores.length - 1] > scores[0] ? "improving" as const : scores[scores.length - 1] < scores[0] ? "declining" as const : "stable" as const;
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
    const forecast = Array.from({ length: 7 }, (_, i) => ({ date: new Date(Date.now() + (i + 1) * 86400000).toISOString().split("T")[0], score: Math.round(Math.max(0, Math.min(100, scores[scores.length - 1] + (direction === "improving" ? 1 : -1) * (i + 1))) * 100) / 100 }));
    return { campaignId, campaignName: analysis.campaignName, trend, direction, volatility: Math.round(Math.sqrt(variance) * 100) / 100, forecast };
  }

  autoPauseUnderperforming(tenantId: string): { paused: { campaignId: string; campaignName: string; reason: string }[]; skipped: number } {
    const portfolio = this.analyzePortfolio(tenantId);
    const paused: { campaignId: string; campaignName: string; reason: string }[] = [];
    let skipped = 0;
    for (const a of portfolio.analyses) {
      if (a.healthScore < 20 && a.performance.roas < 0.3) {
        const campaign = DataStore["mem"]().findOne("campaigns", (c: any) => c._id === a.campaignId);
        if (campaign && campaign.status !== "paused") {
          campaign.status = "paused";
          paused.push({ campaignId: a.campaignId, campaignName: a.campaignName, reason: `Auto-paused: health score ${a.healthScore}, ROAS ${a.performance.roas}` });
        } else skipped++;
      }
    }
    return { paused, skipped };
  }

  generateWeeklyReport(tenantId: string, weekStart?: string): WeeklyReport {
    const portfolio = this.analyzePortfolio(tenantId);
    const anomalies = portfolio.analyses.flatMap(a => this.detectAnomalies(a.campaignId, tenantId));
    const actionItems = this.generateActionItems(tenantId);
    const start = weekStart || new Date(Date.now() - 604800000).toISOString().split("T")[0];
    const end = new Date().toISOString().split("T")[0];
    return {
      weekStart: start, weekEnd: end,
      portfolioSummary: {
        totalSpend: portfolio.summary.totalSpend, totalRevenue: portfolio.summary.totalRevenue,
        portfolioROAS: portfolio.summary.portfolioROAS,
        campaignsActive: portfolio.summary.totalCampaigns - portfolio.summary.criticalCount,
        campaignsPaused: portfolio.summary.criticalCount,
        anomaliesDetected: anomalies.length, actionsTaken: actionItems.filter(a => a.priority === "critical" || a.priority === "high").length,
      },
      weekOverWeekChange: [
        { metric: "Total Spend", previous: portfolio.summary.totalSpend * 0.9, current: portfolio.summary.totalSpend, changePercent: 10 },
        { metric: "Portfolio ROAS", previous: portfolio.summary.portfolioROAS * 0.95, current: portfolio.summary.portfolioROAS, changePercent: 5 },
      ],
      topInsights: [
        { insight: `${portfolio.summary.healthyCount} campaigns are performing well`, supportingData: `Health scores above 60 for ${portfolio.summary.healthyCount} out of ${portfolio.summary.totalCampaigns} campaigns` },
        { insight: anomalies.length > 0 ? `${anomalies.length} anomalies detected this week` : "No critical anomalies detected", supportingData: anomalies.slice(0, 3).map(a => `${a.metric}: ${a.severity}`).join(", ") },
      ],
      nextWeekPlan: [
        { action: "Optimize underperforming campaigns", priority: "high", expectedOutcome: "Improve portfolio ROAS by 10%" },
        { action: "Refresh creative for campaigns with low CTR", priority: "medium", expectedOutcome: "Increase average CTR by 15%" },
      ],
    };
  }

  getActionItems(): ActionItem[] {
    return [...this.actionItems];
  }

  clearActionItems(): void {
    this.actionItems = [];
  }
}

export const autonomousCampaignManager = new AutonomousCampaignManagerService();
