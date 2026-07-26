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
}

export const campaignSummary = new CampaignSummaryService();
