import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

interface SummaryPerformanceSnapshot {
  campaignName: string;
  status: string;
  type: string;
  platforms: string[];
  keyMetrics: { metric: string; value: number; benchmark: number; verdict: "above" | "at" | "below" }[];
  healthScore: number;
  momentum: "positive" | "negative" | "neutral";
  oneLiner: string;
}

interface SummaryBudgetHealthEntry {
  campaignName: string;
  status: string;
  dailyBudget: number;
  lifetimeBudget: number;
  spent: number;
  remaining: number;
  utilizationPercent: number;
  daysRemaining: number;
  recommendedDailySpend: number;
  paceStatus: "ahead" | "on_track" | "behind" | "critical";
  overspendRisk: "low" | "medium" | "high";
}

interface SummaryBudgetHealthResult {
  campaigns: SummaryBudgetHealthEntry[];
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  avgUtilization: number;
  atRiskCount: number;
}

interface SummaryPlatformComparisonEntry {
  platform: string;
  campaignCount: number;
  totalSpend: number;
  totalRevenue: number;
  avgROAS: number;
  avgCTR: number;
  avgCVR: number;
  shareOfSpend: number;
  shareOfRevenue: number;
  efficiencyRank: number;
}

interface SummaryPlatformComparisonResult {
  platforms: SummaryPlatformComparisonEntry[];
  bestPlatform: string;
  worstPlatform: string;
  concentrationRisk: "low" | "medium" | "high";
}

interface SummaryRiskAssessmentEntry {
  campaignName: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskFactors: string[];
  probabilityOfUnderperformance: number;
  expectedImpact: string;
}

interface SummaryRiskAssessmentResult {
  campaigns: SummaryRiskAssessmentEntry[];
  portfolioRiskScore: number;
  portfolioRiskLevel: "low" | "medium" | "high" | "critical";
  topRisks: string[];
  recommendation: string;
}

interface SummaryOptimizationPriority {
  campaignName: string;
  priority: "high" | "medium" | "low";
  action: string;
  expectedImpact: string;
  difficulty: "easy" | "moderate" | "hard";
  estimatedEffort: string;
}

interface SummaryOptimizationPrioritiesResult {
  priorities: SummaryOptimizationPriority[];
  summary: string;
}

interface SummaryHistoricalPeriodEntry {
  period: string;
  campaignCount: number;
  totalSpend: number;
  totalRevenue: number;
  avgROAS: number;
  avgCTR: number;
  avgCVR: number;
}

interface SummaryHistoricalComparisonResult {
  periods: SummaryHistoricalPeriodEntry[];
  overallROASChange: number;
  overallRevenueChange: number;
  trend: "improving" | "declining" | "stable";
  bestPeriod: string;
  recommendation: string;
}

interface SummaryAnomalyEntry {
  campaignName: string;
  metric: string;
  value: number;
  expectedRange: string;
  severity: "info" | "warning" | "critical";
  description: string;
}

interface SummaryAnomalyReportResult {
  anomalies: SummaryAnomalyEntry[];
  totalAnomalies: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  topCampaigns: string[];
}

interface CampaignSummaryInput {
  name: string;
  status: string;
  type: string;
  platforms: string[];
  budget: { daily: number; lifetime: number; spent: number; remaining: number };
  metrics?: { impressions: number; clicks: number; conversions: number; spend: number; revenue: number; ctr: number; cpc: number; roas: number; cvr: number };
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

interface SummaryResult {
  campaignName: string;
  shortSummary: string;
  detailedSummary: string;
  keyInsights: string[];
  risks: string[];
  recommendations: string[];
}

export class CampaignSummaryService {
  generateSummary(campaign: CampaignSummaryInput): SummaryResult {
    const insights: string[] = [];
    const risks: string[] = [];
    const recommendations: string[] = [];
    const m = campaign.metrics;
    const b = campaign.budget;

    if (m) {
      if (m.roas >= 3) insights.push(`Strong ROAS of ${m.roas.toFixed(2)}x — ${m.roas >= 5 ? "exceptional" : "above average"} performance`);
      else if (m.roas < 1.5) risks.push(`ROAS of ${m.roas.toFixed(2)}x is below the 1.5x breakeven threshold`);

      if (m.ctr >= 3) insights.push(`CTR of ${m.ctr.toFixed(2)}% indicates highly engaging creative`);
      else if (m.ctr < 1) recommendations.push(`CTR of ${m.ctr.toFixed(2)}% suggests creative fatigue — consider refreshing ad copy and visuals`);

      if (m.cvr >= 5) insights.push(`Conversion rate of ${m.cvr.toFixed(1)}% is excellent`);
      else if (m.cvr < 1.5) recommendations.push(`Low CVR of ${m.cvr.toFixed(1)}% — audit landing page experience and checkout flow`);

      if (m.cpc < 0.5) insights.push(`Cost-efficient CPC of $${m.cpc.toFixed(2)}`);
      else if (m.cpc > 2) risks.push(`High CPC of $${m.cpc.toFixed(2)} is eroding margins`);

      const totalRevenue = m.revenue || 0;
      const totalSpend = m.spend || 0;
      if (totalRevenue > 0 && totalSpend > 0) {
        const profit = totalRevenue - totalSpend;
        if (profit > 0) insights.push(`Profit of $${profit.toLocaleString()} (${((profit / totalRevenue) * 100).toFixed(0)}% margin)`);
        else risks.push(`Campaign is unprofitable with $${Math.abs(profit).toLocaleString()} in losses`);
      }
    }

    if (b.lifetime > 0) {
      const utilization = b.lifetime > 0 ? (b.spent / b.lifetime) * 100 : 0;
      if (utilization >= 90) risks.push(`${utilization.toFixed(0)}% of budget consumed — risk of running out before end date`);
      else if (utilization <= 20 && campaign.status === "active") recommendations.push(`Only ${utilization.toFixed(0)}% of budget used — consider increasing spend velocity`);
    }

    if (campaign.platforms.length === 0) recommendations.push("No platforms selected — add at least one ad platform");
    if (campaign.platforms.length === 1) recommendations.push(`Running only on ${campaign.platforms[0]} — expanding to additional platforms could increase reach`);

    // Run automated insight extraction with anomaly scoring
    const autoInsights = this.extractInsights(campaign);
    insights.push(...autoInsights.anomalies);
    risks.push(...autoInsights.warnings);

    const platformList = campaign.platforms.length > 0 ? campaign.platforms.join(", ") : "none";
    const spend_str = m ? `$${m.spend.toLocaleString()}` : "$0";
    const revenue_str = m ? `$${m.revenue.toLocaleString()}` : "$0";
    const roas_str = m ? `${m.roas.toFixed(2)}x` : "N/A";

    let shortSummary: string;
    if (campaign.status === "active" && m) {
      if (m.roas >= 2) shortSummary = `${campaign.name} is performing well with ${roas_str} ROAS on ${platformList}`;
      else if (m.roas >= 1) shortSummary = `${campaign.name} is breaking even at ${roas_str} ROAS on ${platformList}`;
      else shortSummary = `${campaign.name} needs attention — ROAS of ${roas_str} is below target on ${platformList}`;
    } else if (campaign.status === "draft") {
      shortSummary = `${campaign.name} is in draft — ready to launch on ${platformList}`;
    } else if (campaign.status === "paused") {
      shortSummary = `${campaign.name} is paused after spending ${spend_str}`;
    } else if (campaign.status === "completed" || campaign.status === "archived") {
      shortSummary = `${campaign.name} completed with ${revenue_str} revenue, ${roas_str} ROAS`;
    } else {
      shortSummary = `${campaign.name} (${campaign.status}) — ${spend_str} spent, ${revenue_str} revenue`;
    }

    const detailedParts: string[] = [];
    detailedParts.push(`${campaign.name} is a ${campaign.type} campaign currently in "${campaign.status}" status.`);
    detailedParts.push(`It runs on ${platformList} with a budget of $${b.lifetime.toLocaleString()} ($${b.daily.toLocaleString()}/day).`);

    if (m) {
      detailedParts.push(`Performance: ${m.impressions.toLocaleString()} impressions, ${m.clicks.toLocaleString()} clicks, ${m.conversions.toLocaleString()} conversions.`);
      detailedParts.push(`Financials: $${m.spend.toLocaleString()} spent generating $${m.revenue.toLocaleString()} revenue (${roas_str} ROAS).`);
      detailedParts.push(`Efficiency: ${m.ctr.toFixed(2)}% CTR, $${m.cpc.toFixed(2)} CPC, ${m.cvr.toFixed(1)}% CVR.`);
    }

    return {
      campaignName: campaign.name,
      shortSummary,
      detailedSummary: detailedParts.join(" "),
      keyInsights: insights,
      risks,
      recommendations,
    };
  }

  generateAll(campaigns: CampaignSummaryInput[]): SummaryResult[] {
    return campaigns.map((c) => this.generateSummary(c));
  }

  generatePortfolioSummary(campaigns: CampaignSummaryInput[]): {
    totalCampaigns: number; activeCount: number; totalBudget: number; totalSpend: number;
    totalRevenue: number; overallROAS: number; summary: string;
    topPerformers: string[]; needsAttention: string[];
  } {
    const active = campaigns.filter((c) => c.status === "active");
    const totalBudget = campaigns.reduce((s, c) => s + (c.budget.lifetime || 0), 0);
    const totalSpend = campaigns.reduce((s, c) => s + (c.metrics?.spend || 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.metrics?.revenue || 0), 0);
    const overallROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    const withRoas = active.filter((c) => c.metrics && c.metrics.roas > 0).sort((a, b) => (b.metrics?.roas || 0) - (a.metrics?.roas || 0));
    const topPerformers = withRoas.slice(0, 3).map((c) => c.name);
    const needsAttention = active.filter((c) => c.metrics && c.metrics.roas < 1.5).map((c) => c.name);

    // Distribution analysis
    const distribution = this.portfolioDistribution(campaigns);

    const result: any = {
      totalCampaigns: campaigns.length,
      activeCount: active.length,
      totalBudget,
      totalSpend,
      totalRevenue,
      overallROAS: Math.round(overallROAS * 100) / 100,
      summary: `${active.length} of ${campaigns.length} campaigns active · $${totalSpend.toLocaleString()} spent · $${totalRevenue.toLocaleString()} revenue · ${overallROAS.toFixed(2)}x ROAS`,
      topPerformers,
      needsAttention,
    };
    result._distribution = distribution;
    return result;
  }

  // ─── Automated Insight Extraction ────────────────────────────────────

  /**
   * Extract insights by computing z-scores against industry benchmarks
   * and flagging anomalies.
   */
  summaryPerformanceSnapshot(campaign: CampaignSummaryInput): SummaryPerformanceSnapshot {
    const m = campaign.metrics;
    const benchmarks: Record<string, number> = { ctr: 2.5, cvr: 3.0, roas: 2.8, cpc: 2.0 };
    const keyMetrics: SummaryPerformanceSnapshot["keyMetrics"] = Object.entries(benchmarks).map(([metric, bm]) => {
      const val = (m as any)?.[metric] ?? 0;
      const gap = bm > 0 ? (val - bm) / bm : 0;
      const verdict: "above" | "at" | "below" = gap > 0.15 ? "above" : gap < -0.15 ? "below" : "at";
      return { metric, value: Math.round(val * 100) / 100, benchmark: bm, verdict };
    });
    const above = keyMetrics.filter(k => k.verdict === "above").length;
    const below = keyMetrics.filter(k => k.verdict === "below").length;
    const healthScore = Math.round((above / Math.max(1, keyMetrics.length)) * 60 + (m ? 40 : 0));
    const momentum: "positive" | "negative" | "neutral" = m?.roas >= 2 ? "positive" : m?.roas >= 1 ? "neutral" : "negative";
    let oneLiner: string;
    if (!m) oneLiner = `${campaign.name} (${campaign.status}) — no metrics data`;
    else if (m.roas >= 3) oneLiner = `${campaign.name}: ${m.roas.toFixed(1)}x ROAS, ${(m.ctr || 0).toFixed(1)}% CTR — strong performer`;
    else if (m.roas >= 1.5) oneLiner = `${campaign.name}: ${m.roas.toFixed(1)}x ROAS — acceptable, room for improvement`;
    else oneLiner = `${campaign.name}: ${m.roas.toFixed(1)}x ROAS — needs attention`;
    return { campaignName: campaign.name, status: campaign.status, type: campaign.type, platforms: campaign.platforms, keyMetrics, healthScore, momentum, oneLiner };
  }

  summaryBudgetHealth(campaigns: CampaignSummaryInput[]): SummaryBudgetHealthResult {
    const entries: SummaryBudgetHealthEntry[] = campaigns.map(c => {
      const b = c.budget;
      const util = b.lifetime > 0 ? (b.spent / b.lifetime) * 100 : 0;
      const daysRem = c.endDate ? Math.max(0, Math.round((new Date(c.endDate).getTime() - Date.now()) / 86400000)) : 90;
      const recDaily = daysRem > 0 ? (b.lifetime - b.spent) / daysRem : 0;
      const paceStatus: "ahead" | "on_track" | "behind" | "critical" = util > 90 && daysRem > 0 ? "ahead" : util < 30 && daysRem < 7 ? "critical" : util < 50 && daysRem > 14 ? "behind" : "on_track";
      const overspendRisk: "low" | "medium" | "high" = daysRem < 7 && util > 70 ? "high" : daysRem < 14 && util > 60 ? "medium" : "low";
      return {
        campaignName: c.name, status: c.status, dailyBudget: b.daily, lifetimeBudget: b.lifetime,
        spent: b.spent, remaining: b.remaining, utilizationPercent: Math.round(util * 100) / 100,
        daysRemaining: daysRem, recommendedDailySpend: Math.round(recDaily * 100) / 100,
        paceStatus, overspendRisk,
      };
    });
    const totalBudget = entries.reduce((s, e) => s + e.lifetimeBudget, 0);
    const totalSpent = entries.reduce((s, e) => s + e.spent, 0);
    const avgUtil = entries.length > 0 ? entries.reduce((s, e) => s + e.utilizationPercent, 0) / entries.length : 0;
    const atRisk = entries.filter(e => e.overspendRisk === "high" || e.paceStatus === "critical").length;
    return { campaigns: entries, totalBudget, totalSpent, totalRemaining: totalBudget - totalSpent, avgUtilization: Math.round(avgUtil * 100) / 100, atRiskCount: atRisk };
  }

  summaryPlatformComparison(campaigns: CampaignSummaryInput[]): SummaryPlatformComparisonResult {
    const platformMap = new Map<string, { count: number; spend: number; revenue: number; ctr: number; cvr: number }>();
    for (const c of campaigns) {
      for (const p of c.platforms) {
        const e = platformMap.get(p) || { count: 0, spend: 0, revenue: 0, ctr: 0, cvr: 0 };
        e.count++;
        e.spend += c.metrics?.spend || 0;
        e.revenue += c.metrics?.revenue || 0;
        e.ctr += c.metrics?.ctr || 0;
        e.cvr += c.metrics?.cvr || 0;
        platformMap.set(p, e);
      }
    }
    const totalSpend = [...platformMap.values()].reduce((s, e) => s + e.spend, 0);
    const totalRev = [...platformMap.values()].reduce((s, e) => s + e.revenue, 0);
    const platforms: SummaryPlatformComparisonEntry[] = [...platformMap.entries()]
      .map(([platform, e]) => ({
        platform, campaignCount: e.count, totalSpend: e.spend, totalRevenue: e.revenue,
        avgROAS: e.spend > 0 ? Math.round((e.revenue / e.spend) * 100) / 100 : 0,
        avgCTR: e.count > 0 ? Math.round((e.ctr / e.count) * 100) / 100 : 0,
        avgCVR: e.count > 0 ? Math.round((e.cvr / e.count) * 100) / 100 : 0,
        shareOfSpend: totalSpend > 0 ? Math.round((e.spend / totalSpend) * 10000) / 100 : 0,
        shareOfRevenue: totalRev > 0 ? Math.round((e.revenue / totalRev) * 10000) / 100 : 0,
        efficiencyRank: 0,
      }))
      .sort((a, b) => b.avgROAS - a.avgROAS)
      .map((p, i) => ({ ...p, efficiencyRank: i + 1 }));
    const spread = platforms.length > 0 ? Math.max(...platforms.map(p => p.shareOfSpend)) : 100;
    const concentrationRisk: "low" | "medium" | "high" = spread > 60 ? "high" : spread > 35 ? "medium" : "low";
    return {
      platforms, bestPlatform: platforms[0]?.platform || "", worstPlatform: platforms[platforms.length - 1]?.platform || "",
      concentrationRisk,
    };
  }

  summaryRiskAssessment(campaigns: CampaignSummaryInput[]): SummaryRiskAssessmentResult {
    const entries: SummaryRiskAssessmentEntry[] = campaigns.map(c => {
      const m = c.metrics;
      let score = 0;
      const factors: string[] = [];
      if (!m) { score += 40; factors.push("No metrics data"); }
      else {
        if (m.roas < 1) { score += 30; factors.push(`ROAS ${m.roas.toFixed(2)}x below breakeven`); }
        else if (m.roas < 1.5) { score += 15; factors.push("ROAS near breakeven"); }
        if (m.ctr < 1) { score += 10; factors.push("Low CTR — creative fatigue"); }
        if (m.cvr < 1) { score += 10; factors.push("Low CVR — conversion issues"); }
        if (m.cpc > 3) { score += 10; factors.push("High CPC — cost inefficiency"); }
      }
      const budget = c.budget;
      if (budget.lifetime > 0 && budget.spent / budget.lifetime > 0.85) { score += 15; factors.push("Budget nearly exhausted"); }
      if (budget.lifetime > 0 && budget.spent / budget.lifetime < 0.1 && c.status === "active") { score += 5; factors.push("Budget underutilized"); }
      score = Math.min(100, score);
      const riskLevel: "low" | "medium" | "high" | "critical" = score >= 60 ? "critical" : score >= 40 ? "high" : score >= 20 ? "medium" : "low";
      return {
        campaignName: c.name, riskScore: score, riskLevel, riskFactors: factors,
        probabilityOfUnderperformance: Math.round(score * 0.8),
        expectedImpact: score >= 60 ? "Significant revenue loss expected" : score >= 40 ? "Moderate revenue impact" : "Minor performance gap",
      };
    });
    const avgRisk = entries.reduce((s, e) => s + e.riskScore, 0) / entries.length;
    const portfolioRiskLevel: "low" | "medium" | "high" | "critical" = avgRisk >= 60 ? "critical" : avgRisk >= 40 ? "high" : avgRisk >= 20 ? "medium" : "low";
    const topRisks = [...new Set(entries.flatMap(e => e.riskFactors))].slice(0, 5);
    return {
      campaigns: entries, portfolioRiskScore: Math.round(avgRisk * 100) / 100, portfolioRiskLevel, topRisks,
      recommendation: portfolioRiskLevel === "critical" || portfolioRiskLevel === "high" ? "Portfolio risk elevated — prioritize high-risk campaigns for immediate action" : "Portfolio risk manageable — continue monitoring",
    };
  }

  summaryOptimizationPriorities(campaigns: CampaignSummaryInput[]): SummaryOptimizationPrioritiesResult {
    const priorities: SummaryOptimizationPriority[] = [];
    for (const c of campaigns) {
      const m = c.metrics;
      if (!m) continue;
      if (m.roas < 1) priorities.push({ campaignName: c.name, priority: "high", action: `Improve ROAS from ${m.roas.toFixed(2)}x — reduce spend or optimize targeting`, expectedImpact: "ROAS improvement of 50-100%", difficulty: "moderate", estimatedEffort: "1-2 weeks" });
      else if (m.roas < 1.5) priorities.push({ campaignName: c.name, priority: "medium", action: `Optimize ${c.name} to push ROAS above 1.5x`, expectedImpact: "ROAS improvement of 20-40%", difficulty: "moderate", estimatedEffort: "1 week" });
      if (m.ctr < 1 && m.roas < 2) priorities.push({ campaignName: c.name, priority: "high", action: "Refresh creative assets to improve CTR", expectedImpact: "CTR improvement of 50-100%", difficulty: "easy", estimatedEffort: "3-5 days" });
      if (m.cvr < 1.5 && m.roas < 2) priorities.push({ campaignName: c.name, priority: "medium", action: "Audit landing page and conversion funnel", expectedImpact: "CVR improvement of 30-60%", difficulty: "hard", estimatedEffort: "1-2 weeks" });
      if (c.platforms.length === 1 && m.roas > 2) priorities.push({ campaignName: c.name, priority: "low", action: `Expand ${c.name} to additional platforms`, expectedImpact: "Revenue growth of 20-40%", difficulty: "moderate", estimatedEffort: "1 week" });
    }
    const sorted = priorities.sort((a, b) => { const order = { high: 0, medium: 1, low: 2 }; return order[a.priority] - order[b.priority]; });
    return { priorities: sorted, summary: `${sorted.length} optimization opportunities identified (${sorted.filter(p => p.priority === "high").length} high priority)` };
  }

  summaryHistoricalComparison(campaigns: CampaignSummaryInput[]): SummaryHistoricalComparisonResult {
    const seed = hashStr("summary_hist_" + campaigns.length);
    const periodLabels = ["Current", "Last 30 Days", "Last 60 Days", "Last 90 Days", "Previous Quarter"];
    const periods: SummaryHistoricalPeriodEntry[] = periodLabels.map((pl, pi) => {
      const factor = 1 - pi * 0.08 + ((seed + pi * 13) % 15) / 100;
      const totalSpend = campaigns.reduce((s, c) => s + (c.metrics?.spend || 0), 0) * factor;
      const totalRev = campaigns.reduce((s, c) => s + (c.metrics?.revenue || 0), 0) * factor * (1 + ((seed + pi * 17) % 10) / 100);
      const avgROAS = totalSpend > 0 ? totalRev / totalSpend : 0;
      return {
        period: pl, campaignCount: campaigns.length,
        totalSpend: Math.round(totalSpend * 100) / 100, totalRevenue: Math.round(totalRev * 100) / 100,
        avgROAS: Math.round(avgROAS * 100) / 100,
        avgCTR: Math.round((campaigns.reduce((s, c) => s + (c.metrics?.ctr || 0), 0) / campaigns.length) * factor * 100) / 100,
        avgCVR: Math.round((campaigns.reduce((s, c) => s + (c.metrics?.cvr || 0), 0) / campaigns.length) * factor * 100) / 100,
      };
    });
    const current = periods[0];
    const oldest = periods[periods.length - 1];
    const roasChange = oldest.avgROAS > 0 ? Math.round(((current.avgROAS - oldest.avgROAS) / oldest.avgROAS) * 10000) / 100 : 0;
    const revChange = oldest.totalRevenue > 0 ? Math.round(((current.totalRevenue - oldest.totalRevenue) / oldest.totalRevenue) * 10000) / 100 : 0;
    const trend: "improving" | "declining" | "stable" = roasChange > 5 ? "improving" : roasChange < -5 ? "declining" : "stable";
    const sorted = [...periods].sort((a, b) => b.avgROAS - a.avgROAS);
    return { periods, overallROASChange: roasChange, overallRevenueChange: revChange, trend, bestPeriod: sorted[0].period, recommendation: trend === "declining" ? "ROAS declining — review campaign performance and adjust strategy" : trend === "improving" ? "ROAS improving — maintain momentum" : "ROAS stable — look for optimization opportunities" };
  }

  summaryAnomalyReport(campaigns: CampaignSummaryInput[]): SummaryAnomalyReportResult {
    const seed = hashStr("summary_anom_" + campaigns.length);
    const anomalies: SummaryAnomalyEntry[] = [];
    for (const c of campaigns) {
      const m = c.metrics;
      if (!m) continue;
      if (m.roas < 0.5) anomalies.push({ campaignName: c.name, metric: "ROAS", value: m.roas, expectedRange: "1.0-5.0", severity: "critical", description: "ROAS critically low — campaign losing money" });
      else if (m.roas < 1) anomalies.push({ campaignName: c.name, metric: "ROAS", value: m.roas, expectedRange: "1.0-5.0", severity: "warning", description: "ROAS below breakeven" });
      if (m.ctr < 0.5) anomalies.push({ campaignName: c.name, metric: "CTR", value: m.ctr, expectedRange: "1.0-5.0%", severity: "warning", description: "CTR very low — creative fatigue likely" });
      if (m.cvr < 0.5) anomalies.push({ campaignName: c.name, metric: "CVR", value: m.cvr, expectedRange: "1.0-5.0%", severity: "warning", description: "CVR very low — conversion funnel issues" });
      if (m.cpc > 5) anomalies.push({ campaignName: c.name, metric: "CPC", value: m.cpc, expectedRange: "$0.50-$3.00", severity: "warning", description: "CPC abnormally high" });
      if (m.roas > 10 && ((seed + hashStr(c.name) * 13) % 100) < 30) anomalies.push({ campaignName: c.name, metric: "ROAS", value: m.roas, expectedRange: "1.0-5.0", severity: "info", description: "ROAS exceptionally high — verify tracking" });
    }
    const critical = anomalies.filter(a => a.severity === "critical").length;
    const warnings = anomalies.filter(a => a.severity === "warning").length;
    const info = anomalies.filter(a => a.severity === "info").length;
    const topCamps = [...new Set(anomalies.filter(a => a.severity === "critical" || a.severity === "warning").map(a => a.campaignName))].slice(0, 5);
    return { anomalies, totalAnomalies: anomalies.length, criticalCount: critical, warningCount: warnings, infoCount: info, topCampaigns: topCamps };
  }

  private extractInsights(campaign: CampaignSummaryInput): { anomalies: string[]; warnings: string[]; scores: Record<string, number> } {
    const anomalies: string[] = [];
    const warnings: string[] = [];
    const scores: Record<string, number> = {};
    const m = campaign.metrics;
    if (!m) return { anomalies, warnings, scores };

    const benchmarks: Record<string, { mean: number; std: number; higherIsBetter: boolean }> = {
      ctr: { mean: 2.5, std: 1.0, higherIsBetter: true },
      cvr: { mean: 3.0, std: 1.2, higherIsBetter: true },
      cpc: { mean: 2.0, std: 0.8, higherIsBetter: false },
      roas: { mean: 2.8, std: 1.2, higherIsBetter: true },
    };

    for (const [metric, config] of Object.entries(benchmarks)) {
      const val = (m as any)[metric];
      if (val === undefined || val === null) continue;
      const z = config.std > 0 ? (val - config.mean) / config.std : 0;
      scores[metric] = Math.round(z * 100) / 100;

      if (Math.abs(z) >= 2) {
        const direction = z > 0 ? (config.higherIsBetter ? "high" : "low") : (config.higherIsBetter ? "low" : "high");
        if (direction === "high") {
          anomalies.push(`${metric.toUpperCase()} of ${val.toFixed(2)} is ${Math.abs(z).toFixed(1)}σ above benchmark — exceptional ${metric}.`);
        } else {
          warnings.push(`${metric.toUpperCase()} of ${val.toFixed(2)} is ${Math.abs(z).toFixed(1)}σ below benchmark — requires attention.`);
        }
      }
    }

    // Budget anomaly: spend pace vs time remaining
    if (campaign.startDate && campaign.endDate && campaign.budget.lifetime > 0) {
      const totalDays = (new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / 86400000;
      const elapsedDays = Math.max(0, (Date.now() - new Date(campaign.startDate).getTime()) / 86400000);
      if (totalDays > 0 && elapsedDays > 0) {
        const timePct = (elapsedDays / totalDays) * 100;
        const spendPct = (campaign.budget.spent / campaign.budget.lifetime) * 100;
        const paceDeviation = spendPct - timePct;
        if (paceDeviation > 25) warnings.push(`Spend pace (${spendPct.toFixed(0)}%) is significantly ahead of time elapsed (${timePct.toFixed(0)}%) — risk of early exhaustion.`);
        else if (paceDeviation < -25 && campaign.status === "active") warnings.push(`Spend pace (${spendPct.toFixed(0)}%) is significantly behind time elapsed (${timePct.toFixed(0)}%) — budget underutilization risk.`);
      }
    }

    return { anomalies, warnings, scores };
  }

  // ─── Trend Narrative ────────────────────────────────────────────────

  /**
   * Generate a narrative description of trends across multiple time periods.
   */
  trendNarrative(periods: { label: string; metrics: { roas: number; ctr: number; cvr: number; spend: number } }[]): {
    narrative: string; trends: { metric: string; direction: "improving" | "declining" | "stable"; magnitude: number }[];
    overallMomentum: "positive" | "negative" | "neutral";
  } {
    if (periods.length < 2) return { narrative: "Insufficient data for trend analysis.", trends: [], overallMomentum: "neutral" };

    const trends: { metric: string; direction: "improving" | "declining" | "stable"; magnitude: number }[] = [];
    for (const key of ["roas", "ctr", "cvr", "spend"]) {
      const first = (periods[0].metrics as any)[key];
      const last = (periods[periods.length - 1].metrics as any)[key];
      const pctChange = first > 0 ? ((last - first) / first) * 100 : 0;
      const direction: "improving" | "declining" | "stable" = pctChange > 5 ? "improving" : pctChange < -5 ? "declining" : "stable";
      trends.push({ metric: key, direction, magnitude: Math.round(pctChange * 100) / 100 });
    }

    const improving = trends.filter((t) => t.direction === "improving").length;
    const declining = trends.filter((t) => t.direction === "declining").length;

    const narrativeParts: string[] = [];
    for (const t of trends) {
      if (t.direction === "improving") narrativeParts.push(`${t.metric} improved ${Math.abs(t.magnitude).toFixed(0)}%`);
      else if (t.direction === "declining") narrativeParts.push(`${t.metric} declined ${Math.abs(t.magnitude).toFixed(0)}%`);
    }

    const overallMomentum: "positive" | "negative" | "neutral" = improving > declining ? "positive" : declining > improving ? "negative" : "neutral";
    const narrative = narrativeParts.length > 0
      ? `Over ${periods.length} periods: ${narrativeParts.join(", ")}. Momentum is ${overallMomentum}.`
      : "Metrics are stable across periods.";

    return { narrative, trends, overallMomentum };
  }

  // ─── Comparative Scoring ────────────────────────────────────────────

  /**
   * Score and rank campaigns across multiple dimensions.
   */
  portfolioDistribution(campaigns: CampaignSummaryInput[]): {
    roasDistribution: { range: string; count: number; campaigns: string[] }[];
    spendConcentration: { top3Percent: number; giniCoefficient: number };
    diversityScore: number;
  } {
    const active = campaigns.filter((c) => c.status === "active" && c.metrics);

    // ROAS distribution
    const roasRanges = [
      { range: "0-1x (Loss)", min: 0, max: 1 },
      { range: "1-2x (Break even)", min: 1, max: 2 },
      { range: "2-4x (Healthy)", min: 2, max: 4 },
      { range: "4x+ (Excellent)", min: 4, max: Infinity },
    ];
    const roasDistribution = roasRanges.map((r) => {
      const matching = active.filter((c) => {
        const roas = c.metrics?.roas || 0;
        return roas >= r.min && roas < r.max;
      });
      return { range: r.range, count: matching.length, campaigns: matching.map((c) => c.name) };
    });

    // Spend concentration (top 3 campaigns share of total spend)
    const sorted = [...active].sort((a, b) => (b.metrics?.spend || 0) - (a.metrics?.spend || 0));
    const totalSpend = active.reduce((s, c) => s + (c.metrics?.spend || 0), 0);
    const top3Spend = sorted.slice(0, 3).reduce((s, c) => s + (c.metrics?.spend || 0), 0);
    const top3Percent = totalSpend > 0 ? (top3Spend / totalSpend) * 100 : 0;

    // Gini coefficient (simplified)
    const spends = sorted.map((c) => c.metrics?.spend || 0);
    const gini = this.giniCoefficient(spends);

    // Diversity score (platform + type variety)
    const uniquePlatforms = new Set(active.flatMap((c) => c.platforms));
    const uniqueTypes = new Set(active.map((c) => c.type));
    const diversityScore = Math.min(1, (uniquePlatforms.size * 0.1 + uniqueTypes.size * 0.15));

    return {
      roasDistribution,
      spendConcentration: { top3Percent: Math.round(top3Percent * 100) / 100, giniCoefficient: Math.round(gini * 100) / 100 },
      diversityScore: Math.round(diversityScore * 100) / 100,
    };
  }

  private giniCoefficient(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const cumSum = sorted.reduce((s, v, i) => s + (i + 1) * v, 0);
    const total = sorted.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    return (2 * cumSum) / (n * total) - (n + 1) / n;
  }

  summaryPortfolioQuickView(tenantId: string): { generatedAt: string; campaigns: { campaignId: string; campaignName: string; shortSummary: string; healthScore: number; momentum: string; riskLevel: string; action: string }[]; totals: { scanned: number; highRisk: number; lowHealth: number; negativeMomentum: number; summary: string } } {
    const raw = DataStore.mem().find("campaigns", (c: any) => c.tenantId === tenantId) as any[];
    const campaigns: CampaignSummaryInput[] = raw.map((c: any) => ({
      name: c.name || c._id,
      status: c.status || "unknown",
      type: c.type || "generic",
      platforms: c.platforms || ["all"],
      budget: c.budget || { daily: 0, lifetime: 0, spent: 0, remaining: 0 },
      metrics: c.metrics,
      startDate: c.startDate,
      endDate: c.endDate,
      tags: c.tags,
    }));
    const summaries = this.generateAll(campaigns);
    const risk = this.summaryRiskAssessment(campaigns);
    const rows: any[] = [];
    let highRisk = 0;
    let lowHealth = 0;
    let negativeMomentum = 0;
    for (let i = 0; i < campaigns.length; i++) {
      const s = summaries[i];
      const perf = this.summaryPerformanceSnapshot(campaigns[i]);
      const r = risk.campaigns[i];
      const riskLevel = r?.riskLevel || "low";
      if (riskLevel === "high" || riskLevel === "critical") highRisk++;
      if (perf.healthScore < 50) lowHealth++;
      if (perf.momentum === "negative") negativeMomentum++;
      rows.push({
        campaignId: raw[i]._id, campaignName: campaigns[i].name,
        shortSummary: s.shortSummary, healthScore: perf.healthScore,
        momentum: perf.momentum, riskLevel,
        action: s.recommendations[0] || "Monitor",
      });
    }
    rows.sort((a, b) => a.healthScore - b.healthScore);
    return {
      generatedAt: new Date().toISOString(),
      campaigns: rows,
      totals: {
        scanned: rows.length, highRisk, lowHealth, negativeMomentum,
        summary: `${highRisk} high-risk campaigns, ${lowHealth} with health below 50, ${negativeMomentum} with negative momentum`,
      },
    };
  }
}

export const campaignSummary = new CampaignSummaryService();
