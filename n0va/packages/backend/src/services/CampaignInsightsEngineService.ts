import { DataStore } from "./DataStore";
import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";

function hashStr(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); hash = ((hash << 5) - hash) + c; hash |= 0; }
  return Math.abs(hash);
}

function seededRandom(seed: string): () => number {
  let h = hashStr(seed);
  return () => { h = (h * 16807) % 2147483647; return (h - 1) / 2147483646; };
}

type InsightCategory = "performance" | "health" | "trend" | "saturation" | "anomaly" | "budget" | "opportunity" | "risk";
type InsightSeverity = "info" | "low" | "medium" | "high" | "critical";
type InsightStatus = "active" | "acknowledged" | "resolved";

interface CampaignInsight {
  id: string;
  tenantId: string;
  campaignId: string;
  campaignName: string;
  category: InsightCategory;
  severity: InsightSeverity;
  status: InsightStatus;
  title: string;
  message: string;
  metricValue: number;
  thresholdValue: number;
  confidence: number;
  supportingData: Record<string, any>;
  recommendation: string;
  generatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

interface InsightsDashboard {
  generatedAt: string;
  summary: {
    totalInsights: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    criticalCount: number;
    highCount: number;
    avgConfidence: number;
    topCampaign: { campaignId: string; campaignName: string; insightCount: number } | null;
  };
  insights: CampaignInsight[];
  recommendations: { campaignId: string; campaignName: string; action: string; priority: string; expectedImpact: string }[];
  trends: { metric: string; direction: "improving" | "declining" | "stable"; campaignCount: number; avgChange: number }[];
}

interface CorrelationAnalysis {
  generatedAt: string;
  correlations: {
    metricA: string; metricB: string;
    correlationCoefficient: number;
    strength: "strong" | "moderate" | "weak" | "none";
    direction: "positive" | "negative";
    significance: number;
    description: string;
  }[];
  summary: { totalCorrelations: number; strongCorrelations: number; avgSignificance: number };
}

interface TrendAnalysis {
  campaignId: string; campaignName: string;
  period: string; metrics: string[];
  trends: {
    metric: string; currentValue: number; previousValue: number;
    changePercent: number; direction: "improving" | "declining" | "stable";
    significance: number; volatility: "low" | "medium" | "high";
    projection: { nextValue: number; confidence: number };
  }[];
  overallAssessment: string;
}

interface BudgetEfficiencyScore {
  campaignId: string; campaignName: string;
  budget: number; spend: number; revenue: number;
  roas: number; efficiencyScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  benchmark: number;
  gap: number; recommendation: string;
}

interface CrossCampaignAttribution {
  campaignId: string; campaignName: string; campaignType: string;
  directConversions: number; assistedConversions: number;
  assistedRevenue: number; crossoverCampaigns: { campaignId: string; campaignName: string; overlapScore: number }[];
  attributionShare: number; incrementalValue: number;
}

interface PredictiveAlert {
  campaignId: string; campaignName: string;
  metric: string; currentTrend: string;
  predictedValue: number; currentValue: number;
  daysToThreshold: number; riskLevel: "low" | "medium" | "high" | "critical";
  confidence: number; suggestedAction: string;
}

interface PredictiveAlertSummary {
  generatedAt: string;
  alerts: PredictiveAlert[];
  summary: { totalAlerts: number; criticalAlerts: number; highAlerts: number; avgConfidence: number; mostUrgent: PredictiveAlert | null };
}

let insightCounter = 0;

export class CampaignInsightsEngineService {
  analyzeCampaign(campaignId: string, tenantId: string): CampaignInsight[] {
    const mem = DataStore.mem();
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const campaign = portfolio.analyses.find((a: any) => a.campaignId === campaignId);
    if (!campaign) return [];
    const insights: CampaignInsight[] = [];
    const genId = () => `insight_${++insightCounter}`;
    const now = new Date().toISOString();

    if (campaign.healthScore < 40) {
      insights.push({
        id: genId(), tenantId, campaignId, campaignName: campaign.campaignName,
        category: "health", severity: "critical", status: "active",
        title: "Critically low health score",
        message: `Campaign health score is ${campaign.healthScore}/100`,
        metricValue: campaign.healthScore, thresholdValue: 40,
        confidence: 95, supportingData: { anomalies: campaign.anomalies },
        recommendation: "Immediate intervention required — review all campaign parameters", generatedAt: now, acknowledgedAt: null, resolvedAt: null,
      });
    } else if (campaign.healthScore < 60) {
      insights.push({
        id: genId(), tenantId, campaignId, campaignName: campaign.campaignName,
        category: "health", severity: "high", status: "active",
        title: "Below-average health score",
        message: `Campaign health score is ${campaign.healthScore}/100`,
        metricValue: campaign.healthScore, thresholdValue: 60,
        confidence: 85, supportingData: { issues: campaign.anomalies?.slice(0, 3) },
        recommendation: "Review campaign settings and optimize targeting", generatedAt: now, acknowledgedAt: null, resolvedAt: null,
      });
    }

    if (campaign.performance.roas < 1) {
      insights.push({
        id: genId(), tenantId, campaignId, campaignName: campaign.campaignName,
        category: "performance", severity: "critical", status: "active",
        title: "Negative ROAS",
        message: `ROAS is ${campaign.performance.roas.toFixed(2)}x — below breakeven`,
        metricValue: campaign.performance.roas, thresholdValue: 1,
        confidence: 98, supportingData: { spend: campaign.performance.spend, revenue: campaign.performance.revenue },
        recommendation: "Pause campaign or drastically reduce spend until optimized", generatedAt: now, acknowledgedAt: null, resolvedAt: null,
      });
    } else if (campaign.performance.roas < 1.5) {
      insights.push({
        id: genId(), tenantId, campaignId, campaignName: campaign.campaignName,
        category: "performance", severity: "high", status: "active",
        title: "Below-target ROAS",
        message: `ROAS is ${campaign.performance.roas.toFixed(2)}x`,
        metricValue: campaign.performance.roas, thresholdValue: 1.5,
        confidence: 80, supportingData: {},
        recommendation: "Optimize targeting, creative, and bidding strategy", generatedAt: now, acknowledgedAt: null, resolvedAt: null,
      });
    }

    const deficit = campaign.saturation.score || 0;
    if (deficit > 0.6) {
      insights.push({
        id: genId(), tenantId, campaignId, campaignName: campaign.campaignName,
        category: "saturation", severity: "high", status: "active",
        title: "High audience saturation",
        message: `Saturation score is ${(deficit * 100).toFixed(0)}%`,
        metricValue: deficit * 100, thresholdValue: 60,
        confidence: 88, supportingData: { level: campaign.saturation.level, marginalROI: campaign.saturation.marginalROI },
        recommendation: "Reduce frequency and expand audience targeting", generatedAt: now, acknowledgedAt: null, resolvedAt: null,
      });
    }

    for (const anomaly of campaign.anomalies || []) {
      insights.push({
        id: genId(), tenantId, campaignId, campaignName: campaign.campaignName,
        category: "anomaly", severity: (anomaly.severity as InsightSeverity) || "medium",
        status: "active", title: `${anomaly.type || "Metric"} anomaly detected`,
        message: anomaly.description,
        metricValue: anomaly.actualValue || 0, thresholdValue: anomaly.expectedValue || 0,
        confidence: 90, supportingData: { deviation: anomaly.deviation, probableCause: anomaly.probableCause },
        recommendation: anomaly.recommendedAction || "Investigate anomaly cause", generatedAt: now, acknowledgedAt: null, resolvedAt: null,
      });
    }

    return insights;
  }

  generateDashboard(tenantId: string): InsightsDashboard {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const allInsights: CampaignInsight[] = [];
    for (const a of portfolio.analyses) {
      const ins = this.analyzeCampaign(a.campaignId, tenantId);
      allInsights.push(...ins);
    }
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const ins of allInsights) {
      byCategory[ins.category] = (byCategory[ins.category] || 0) + 1;
      bySeverity[ins.severity] = (bySeverity[ins.severity] || 0) + 1;
    }
    const avgConf = allInsights.length > 0 ? allInsights.reduce((s, i) => s + i.confidence, 0) / allInsights.length : 0;
    const byCampaign = new Map<string, { name: string; count: number }>();
    for (const ins of allInsights) {
      const existing = byCampaign.get(ins.campaignId) || { name: ins.campaignName, count: 0 };
      existing.count++;
      byCampaign.set(ins.campaignId, existing);
    }
    const topCamp = [...byCampaign.entries()].sort((a, b) => b[1].count - a[1].count)[0];
    const actionItems = autonomousCampaignManager.generateActionItems(tenantId);
    const recommendations = actionItems.slice(0, 5).map(a => ({
      campaignId: a.campaignId, campaignName: a.campaignName,
      action: a.action, priority: a.priority, expectedImpact: a.impact || "Improved performance",
    }));
    const trendMetrics = ["roas", "ctr", "cvr", "cpa", "spend"];
    const trends: InsightsDashboard["trends"] = trendMetrics.map(metric => {
      let up = 0, down = 0, stable = 0, totalChange = 0;
      for (const a of portfolio.analyses) {
        const t = a.trends?.find((tr: any) => tr.metric === metric);
        if (!t) { stable++; continue; }
        if (t.direction === "up") up++;
        else if (t.direction === "down") down++;
        else stable++;
        totalChange += Math.abs(t.changePercent || 0);
      }
      const direction: "improving" | "declining" | "stable" = up > down ? "improving" : down > up ? "declining" : "stable";
      return { metric, direction, campaignCount: up + down + stable, avgChange: totalChange / Math.max(1, up + down + stable) };
    });
    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalInsights: allInsights.length, byCategory, bySeverity,
        criticalCount: bySeverity.critical || 0, highCount: bySeverity.high || 0,
        avgConfidence: Math.round(avgConf * 100) / 100,
        topCampaign: topCamp ? { campaignId: topCamp[0], campaignName: topCamp[1].name, insightCount: topCamp[1].count } : null,
      },
      insights: allInsights,
      recommendations,
      trends,
    };
  }

  findCorrelations(tenantId: string): CorrelationAnalysis {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const metrics = ["roas", "ctr", "cvr", "cpa", "spend", "revenue", "conversions", "impressions", "clicks", "budgetUtilization", "healthScore"];
    const data: Record<string, number[]> = {};
    for (const m of metrics) data[m] = [];
    for (const a of portfolio.analyses) {
      data.roas.push(a.performance.roas);
      data.ctr.push(a.performance.ctr);
      data.cvr.push(a.performance.cvr);
      data.cpa.push(a.performance.cpa || 0);
      data.spend.push(a.performance.spend);
      data.revenue.push(a.performance.revenue);
      data.conversions.push(a.performance.conversions);
      data.impressions.push(a.performance.impressions);
      data.clicks.push(a.performance.clicks);
      data.budgetUtilization.push(a.performance.budgetUtilization || 50);
      data.healthScore.push(a.healthScore);
    }
    const correlations: CorrelationAnalysis["correlations"] = [];
    const pairs = [["roas", "ctr"], ["roas", "cvr"], ["roas", "spend"], ["ctr", "cvr"], ["spend", "revenue"], ["healthScore", "roas"], ["healthScore", "cpa"], ["conversions", "revenue"], ["impressions", "clicks"], ["budgetUtilization", "roas"]];
    for (const [mA, mB] of pairs) {
      const arrA = data[mA]; const arrB = data[mB];
      if (arrA.length < 2 || arrB.length < 2) continue;
      const r = this.pearsonCorrelation(arrA, arrB);
      const absR = Math.abs(r);
      const strength: "strong" | "moderate" | "weak" | "none" = absR > 0.7 ? "strong" : absR > 0.4 ? "moderate" : absR > 0.1 ? "weak" : "none";
      const direction = r >= 0 ? "positive" : "negative";
      const sig = Math.min(100, Math.round(absR * 100));
      const desc = `${mA.toUpperCase()} and ${mB.toUpperCase()} show ${strength} ${direction} correlation (r=${r.toFixed(3)})`;
      correlations.push({ metricA: mA, metricB: mB, correlationCoefficient: Math.round(r * 1000) / 1000, strength, direction, significance: sig, description: desc });
    }
    const strongC = correlations.filter(c => c.strength === "strong").length;
    const avgSig = correlations.length > 0 ? correlations.reduce((s, c) => s + c.significance, 0) / correlations.length : 0;
    return { generatedAt: new Date().toISOString(), correlations, summary: { totalCorrelations: correlations.length, strongCorrelations: strongC, avgSignificance: Math.round(avgSig * 100) / 100 } };
  }

  analyzeTrends(campaignId: string, tenantId: string): TrendAnalysis | null {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const a = portfolio.analyses.find((c: any) => c.campaignId === campaignId);
    if (!a) return null;
    const metrics = ["roas", "ctr", "cvr", "cpa", "spend", "revenue"];
    const trends: TrendAnalysis["trends"] = metrics.map(m => {
      const trend = a.trends?.find((t: any) => t.metric === m);
      const curVal = (a.performance as any)[m] || 0;
      const prevVal = curVal * (1 - (trend?.changePercent || 0) / 100);
      const dir = trend?.direction === "up" ? "improving" as const : trend?.direction === "down" ? "declining" as const : "stable" as const;
      const projNext = curVal * (1 + (trend?.changePercent || 0) / 100);
      if (trend) {
        trends.push({
          metric: m, currentValue: curVal, previousValue: Math.round(prevVal * 100) / 100,
          changePercent: trend.changePercent, direction: dir,
          significance: Math.min(100, Math.abs(trend.changePercent) * 2),
          volatility: Math.abs(trend.changePercent) > 20 ? "high" : Math.abs(trend.changePercent) > 10 ? "medium" : "low",
          projection: { nextValue: Math.round(projNext * 100) / 100, confidence: Math.max(0, 100 - Math.abs(trend.changePercent) * 2) },
        });
      }
      return null;
    }).filter(Boolean) as TrendAnalysis["trends"];
    const declining = trends.filter(t => t.direction === "declining");
    const improving = trends.filter(t => t.direction === "improving");
    let assessment = `Campaign ${a.campaignName}: `;
    assessment += declining.length > 0 ? `${declining.length} metric(s) declining — needs attention. ` : "All metrics stable or improving. ";
    assessment += improving.length > 0 ? `${improving.length} metric(s) showing positive trends. ` : "";
    assessment += a.healthScore < 50 ? "Overall health is critical." : a.healthScore < 70 ? "Overall health is moderate." : "Overall health is good.";
    return { campaignId, campaignName: a.campaignName, period: "30 days", metrics, trends, overallAssessment: assessment };
  }

  calculateBudgetEfficiency(tenantId: string): BudgetEfficiencyScore[] {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    return portfolio.analyses.map(a => {
      const roas = a.performance.roas;
      const spend = a.performance.spend;
      const budgetUtil = a.performance.budgetUtilization || 50;
      const score = Math.round((Math.min(roas, 5) / 5 * 40 + Math.min(budgetUtil, 100) / 100 * 30 + (a.healthScore / 100) * 30));
      const grade: "A" | "B" | "C" | "D" | "F" = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
      const benchmark = 2.5;
      const gap = Math.round((benchmark - roas) * 100) / 100;
      return {
        campaignId: a.campaignId, campaignName: a.campaignName,
        budget: a.performance.spend / (budgetUtil / 100 || 0.01), spend, revenue: a.performance.revenue,
        roas, efficiencyScore: score, grade, benchmark, gap,
        recommendation: gap > 0 ? `ROAS gap of ${gap.toFixed(2)}x vs benchmark — ${grade === "F" ? "consider pausing" : grade === "D" ? "needs major optimization" : "review targeting and creative"}` : "Meets or exceeds benchmark — maintain strategy",
      };
    }).sort((a, b) => a.efficiencyScore - b.efficiencyScore);
  }

  crossCampaignAttribution(tenantId: string): CrossCampaignAttribution[] {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const convTotal = portfolio.analyses.reduce((s, a) => s + a.performance.conversions, 0) || 100;
    return portfolio.analyses.map(a => {
      const rng = seededRandom(a.campaignId + tenantId + "_attribution");
      const share = a.performance.conversions / convTotal;
      const assist = Math.round(a.performance.conversions * (0.1 + rng() * 0.2));
      const crossover = portfolio.analyses
        .filter(o => o.campaignId !== a.campaignId && rng() > 0.5)
        .slice(0, 2)
        .map(o => ({ campaignId: o.campaignId, campaignName: o.campaignName, overlapScore: Math.round(rng() * 40 + 10) }));
      return {
        campaignId: a.campaignId, campaignName: a.campaignName, campaignType: a.status,
        directConversions: a.performance.conversions, assistedConversions: assist,
        assistedRevenue: Math.round(a.performance.revenue * 0.15),
        crossoverCampaigns: crossover, attributionShare: Math.round(share * 10000) / 100,
        incrementalValue: Math.round(a.performance.revenue * 0.12),
      };
    });
  }

  generatePredictiveAlerts(tenantId: string): PredictiveAlertSummary {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const alerts: PredictiveAlert[] = [];
    for (const a of portfolio.analyses) {
      for (const trend of a.trends || []) {
        if (trend.direction !== "down") continue;
        const severity = Math.abs(trend.changePercent);
        const riskLevel: "low" | "medium" | "high" | "critical" = severity > 30 ? "critical" : severity > 20 ? "high" : severity > 10 ? "medium" : "low";
        const curVal = (a.performance as any)[trend.metric] || 0;
        const predicted = curVal * (1 + severity / 100 * 1.5);
        alerts.push({
          campaignId: a.campaignId, campaignName: a.campaignName,
          metric: trend.metric, currentTrend: trend.direction,
          predictedValue: Math.round(predicted * 100) / 100,
          currentValue: curVal, daysToThreshold: Math.max(1, Math.round(30 / severity * 10)),
          riskLevel, confidence: Math.min(95, Math.round(100 - severity)),
          suggestedAction: riskLevel === "critical" ? "Immediate intervention required" : riskLevel === "high" ? "Schedule review this week" : "Monitor closely",
        });
      }
    }
    const sorted = [...alerts].sort((a, b) => a.daysToThreshold - b.daysToThreshold);
    return {
      generatedAt: new Date().toISOString(),
      alerts,
      summary: {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.riskLevel === "critical").length,
        highAlerts: alerts.filter(a => a.riskLevel === "high").length,
        avgConfidence: alerts.length > 0 ? Math.round(alerts.reduce((s, a) => s + a.confidence, 0) / alerts.length) : 0,
        mostUrgent: sorted[0] || null,
      },
    };
  }

  insightAcknowledgeBatch(tenantId: string, insightIds: string[], action: "acknowledge" | "resolve"): { total: number; succeeded: number; failed: number } {
    const mem = DataStore.mem();
    let succeeded = 0, failed = 0;
    const now = new Date().toISOString();
    for (const id of insightIds) {
      const existing = mem.findOne("insights", (i: any) => i.id === id && i.tenantId === tenantId);
      if (!existing) { failed++; continue; }
      const updated = {
        ...existing,
        status: action === "acknowledge" ? "acknowledged" as const : "resolved" as const,
        [action === "acknowledge" ? "acknowledgedAt" : "resolvedAt"]: now,
      };
      mem.update("insights", (i: any) => i.id === id, updated);
      succeeded++;
    }
    return { total: insightIds.length, succeeded, failed };
  }

  insightPrioritySummary(tenantId: string): {
    immediate: { id: string; title: string; campaignName: string; severity: string; category: string; recommendation: string }[];
    today: { id: string; title: string; campaignName: string; severity: string; category: string }[];
    thisWeek: { id: string; title: string; campaignName: string; severity: string; category: string }[];
    resolved: number;
  } {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const allInsights: CampaignInsight[] = [];
    for (const a of portfolio.analyses) {
      const ins = this.analyzeCampaign(a.campaignId, tenantId);
      allInsights.push(...ins);
    }
    const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    const sorted = [...allInsights].sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));
    const immediate = sorted.filter(i => i.severity === "critical").slice(0, 5).map(i => ({ id: i.id, title: i.title, campaignName: i.campaignName, severity: i.severity, category: i.category, recommendation: i.recommendation }));
    const today = sorted.filter(i => i.severity === "high").slice(0, 5).map(i => ({ id: i.id, title: i.title, campaignName: i.campaignName, severity: i.severity, category: i.category }));
    const thisWeek = sorted.filter(i => i.severity === "medium" || i.severity === "low").slice(0, 5).map(i => ({ id: i.id, title: i.title, campaignName: i.campaignName, severity: i.severity, category: i.category }));
    return { immediate, today, thisWeek, resolved: allInsights.filter(i => i.status === "resolved").length };
  }

  insightExport(tenantId: string, format: "json" | "csv" = "json"): { generatedAt: string; campaignCount: number; totalInsights: number; data: any } {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const allInsights: CampaignInsight[] = [];
    for (const a of portfolio.analyses) {
      const ins = this.analyzeCampaign(a.campaignId, tenantId);
      allInsights.push(...ins);
    }
    const data = format === "csv"
      ? ["id,campaignId,campaignName,category,severity,title,metricValue,confidence,recommendation"]
        .concat(allInsights.map(i =>
          `"${i.id}","${i.campaignId}","${i.campaignName}","${i.category}","${i.severity}","${i.title.replace(/"/g, '""')}",${i.metricValue},${i.confidence},"${i.recommendation.replace(/"/g, '""')}"`
        )).join("\n")
      : {
          insights: allInsights.map(i => ({
            id: i.id, campaignId: i.campaignId, campaignName: i.campaignName,
            category: i.category, severity: i.severity, status: i.status,
            title: i.title, message: i.message, metricValue: i.metricValue,
            thresholdValue: i.thresholdValue, confidence: i.confidence,
            recommendation: i.recommendation, generatedAt: i.generatedAt,
          })),
          summary: {
            totalInsights: allInsights.length,
            bySeverity: { critical: allInsights.filter(i => i.severity === "critical").length, high: allInsights.filter(i => i.severity === "high").length, medium: allInsights.filter(i => i.severity === "medium").length, low: allInsights.filter(i => i.severity === "low").length },
            byCategory: [...new Set(allInsights.map(i => i.category))].reduce((acc, c) => ({ ...acc, [c]: allInsights.filter(i => i.category === c).length }), {} as Record<string, number>),
          },
        };
    return { generatedAt: new Date().toISOString(), campaignCount: portfolio.analyses.length, totalInsights: allInsights.length, data };
  }

  insightTrendForecast(tenantId: string, metric: string = "roas", days: number = 30): {
    metric: string; currentValue: number; projectedValue: number; direction: "up" | "down" | "stable";
    confidence: number; campaignsAbove: number; campaignsBelow: number;
  } {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    let totalCur = 0, totalProj = 0, above = 0, below = 0, count = 0;
    for (const a of portfolio.analyses) {
      const curVal = (a.performance as any)[metric] || 0;
      const trend = a.trends?.find((t: any) => t.metric === metric);
      const changePct = trend?.changePercent || 0;
      const projected = curVal * (1 + changePct / 100 * days / 30);
      totalCur += curVal; totalProj += projected;
      if (projected > curVal) above++; else if (projected < curVal) below++;
      count++;
    }
    const curAvg = count > 0 ? totalCur / count : 0;
    const projAvg = count > 0 ? totalProj / count : 0;
    const direction: "up" | "down" | "stable" = projAvg > curAvg * 1.02 ? "up" : projAvg < curAvg * 0.98 ? "down" : "stable";
    const confidence = count > 0 ? Math.round(90 - Math.abs(projAvg - curAvg) / (curAvg || 1) * 100) : 0;
    return { metric, currentValue: Math.round(curAvg * 100) / 100, projectedValue: Math.round(projAvg * 100) / 100, direction, confidence: Math.max(10, Math.min(99, confidence)), campaignsAbove: above, campaignsBelow: below };
  }

  insightCampaignRanking(tenantId: string): {
    rankings: { campaignId: string; campaignName: string; totalInsights: number; criticalCount: number; highCount: number; topCategory: string; priorityScore: number }[];
    summary: { totalCampaigns: number; avgInsightsPerCampaign: number; mostCriticalCampaign: string | null };
  } {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const rankings: { campaignId: string; campaignName: string; totalInsights: number; criticalCount: number; highCount: number; topCategory: string; priorityScore: number }[] = [];
    for (const a of portfolio.analyses) {
      const ins = this.analyzeCampaign(a.campaignId, tenantId);
      const criticalCount = ins.filter(i => i.severity === "critical").length;
      const highCount = ins.filter(i => i.severity === "high").length;
      const catCount: Record<string, number> = {};
      for (const i of ins) catCount[i.category] = (catCount[i.category] || 0) + 1;
      const topCategory = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "none";
      const priorityScore = criticalCount * 100 + highCount * 40 + ins.length * 10;
      rankings.push({ campaignId: a.campaignId, campaignName: a.campaignName, totalInsights: ins.length, criticalCount, highCount, topCategory, priorityScore });
    }
    rankings.sort((a, b) => b.priorityScore - a.priorityScore);
    const totalCampaigns = rankings.length;
    const avgInsights = totalCampaigns > 0 ? Math.round(rankings.reduce((s, r) => s + r.totalInsights, 0) / totalCampaigns * 10) / 10 : 0;
    const mostCritical = rankings.length > 0 && rankings[0].priorityScore > 0 ? rankings[0].campaignName : null;
    return { rankings, summary: { totalCampaigns, avgInsightsPerCampaign: avgInsights, mostCriticalCampaign: mostCritical } };
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const mx = x.reduce((s, v) => s + v, 0) / n;
    const my = y.reduce((s, v) => s + v, 0) / n;
    let num = 0, dx2 = 0, dy2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - mx, dy = y[i] - my;
      num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
    }
    return dx2 && dy2 ? num / Math.sqrt(dx2 * dy2) : 0;
  }
}

export const campaignInsightsEngine = new CampaignInsightsEngineService();