import { DataStore } from "./DataStore";

export class CampaignSnapshotService {
  async captureSnapshot(tenantId: string, campaignId: string, name: string, description?: string): Promise<any> {
    const campaign = await DataStore.findCampaignById(campaignId, tenantId);
    if (!campaign) throw new Error("Campaign not found");

    const metrics = await DataStore.findMetrics({ campaignId, tenantId });
    const total = metrics.length;
    const totals = metrics.reduce(
      (acc: any, m: any) => {
        acc.impressions += m.impressions || 0;
        acc.clicks += m.clicks || 0;
        acc.conversions += m.conversions || 0;
        acc.spend += m.spend || 0;
        acc.revenue += m.revenue || 0;
        return acc;
      },
      { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 }
    );

    const aggregated = {
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      totalConversions: totals.conversions,
      totalSpend: totals.spend,
      totalRevenue: totals.revenue,
      avgCtr: totals.impressions > 0 ? parseFloat(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0,
      avgCpc: totals.clicks > 0 ? parseFloat((totals.spend / totals.clicks).toFixed(2)) : 0,
      avgRoas: totals.spend > 0 ? parseFloat((totals.revenue / totals.spend).toFixed(2)) : 0,
      avgCvr: totals.clicks > 0 ? parseFloat(((totals.conversions / totals.clicks) * 100).toFixed(2)) : 0,
      metricCount: total,
    };

    const snapshot = DataStore.mem().insert("campaign_snapshots", {
      tenantId,
      campaignId,
      campaignName: campaign.name,
      name,
      description: description || "",
      capturedAt: new Date().toISOString(),
      metrics: aggregated,
      budget: campaign.budget || {},
      status: campaign.status,
      platforms: campaign.platforms || [],
      metricIds: metrics.map((m: any) => m._id),
    });

    return snapshot;
  }

  async compareSnapshots(snapshotId1: string, snapshotId2: string, tenantId: string): Promise<any> {
    const s1 = DataStore.mem().findOne("campaign_snapshots", (s: any) => s._id === snapshotId1 && s.tenantId === tenantId);
    const s2 = DataStore.mem().findOne("campaign_snapshots", (s: any) => s._id === snapshotId2 && s.tenantId === tenantId);

    if (!s1 || !s2) throw new Error("One or both snapshots not found");

    const keys = ["totalImpressions", "totalClicks", "totalConversions", "totalSpend", "totalRevenue"];
    const rateKeys = ["avgCtr", "avgCpc", "avgRoas", "avgCvr"];
    const diff: Record<string, any> = {};

    for (const key of keys) {
      const before = s1.metrics[key] || 0;
      const after = s2.metrics[key] || 0;
      const change = after - before;
      const changePercent = before !== 0 ? parseFloat(((change / before) * 100).toFixed(2)) : 0;
      // Add statistical significance
      const significance = this.statisticalSignificance(before, after, s1.metrics.metricCount || 10, s2.metrics.metricCount || 10);
      diff[key] = { before, after, change, changePercent, _significance: significance };
    }

    for (const key of rateKeys) {
      const before = s1.metrics[key] || 0;
      const after = s2.metrics[key] || 0;
      const change = after - before;
      const changePercent = before !== 0 ? parseFloat(((change / before) * 100).toFixed(2)) : 0;
      diff[key] = { before, after, change, changePercent };
    }

    diff.budget = {
      before: s1.budget,
      after: s2.budget,
      spendChange: (s2.budget?.spent || 0) - (s1.budget?.spent || 0),
    };

    diff.statusChange = { before: s1.status, after: s2.status };

    // Trend decomposition on the deltas
    const trendDecomp = this.trendDecomposition(Object.values(diff).filter((v: any) => typeof v.change === "number").map((v: any) => v.changePercent || v.change));

    // Compute composite health index
    const healthIndex = this.compositeHealthIndex(diff);

    const overallImprovement =
      diff.totalConversions.change > 0 &&
      diff.avgRoas.change > 0 &&
      diff.totalSpend.change <= 0
        ? "strong improvement"
        : diff.totalConversions.change > 0 && diff.avgRoas.change > 0
          ? "improvement"
          : diff.totalConversions.change < 0 && diff.avgRoas.change < 0
            ? "decline"
            : "mixed";

    // Forecast comparison (project next period)
    const forecast = this.forecastComparison(s1.metrics, s2.metrics);

    return {
      snapshot1: s1,
      snapshot2: s2,
      diff,
      summary: { overall: overallImprovement, _healthIndex: healthIndex, _trendDecomposition: trendDecomp, _forecast: forecast },
    };
  }

  async getSnapshotTimeline(tenantId: string, campaignId: string): Promise<any[]> {
    const snapshots = DataStore.mem().find(
      "campaign_snapshots",
      (s: any) => s.tenantId === tenantId && s.campaignId === campaignId
    );
    return snapshots.sort((a: any, b: any) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
  }

  // ─── Statistical Significance ────────────────────────────────────────

  /**
   * Quick statistical significance test using normal approximation.
   * Returns whether the change between two metric values is significant
   * given the sample sizes and estimated variance.
   */
  private statisticalSignificance(
    before: number, after: number,
    n1: number, n2: number,
    alpha = 0.05,
  ): { zScore: number; pValue: number; isSignificant: boolean; interpretation: string } {
    if (before === after || n1 < 2 || n2 < 2) {
      return { zScore: 0, pValue: 1, isSignificant: false, interpretation: "Insufficient data to determine significance." };
    }
    // Assume coefficient of variation = 0.2
    const cv = 0.2;
    const se1 = (before * cv) / Math.sqrt(n1);
    const se2 = (after * cv) / Math.sqrt(n2);
    const se = Math.sqrt(se1 * se1 + se2 * se2);
    if (se === 0) return { zScore: 0, pValue: 1, isSignificant: false, interpretation: "No variance — cannot test significance." };

    const zScore = (after - before) / se;
    // Two-tailed p-value using standard normal approximation
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    const isSignificant = pValue < alpha;

    const interpretation = isSignificant
      ? `Change is statistically significant (p=${pValue.toFixed(3)}, z=${zScore.toFixed(2)})`
      : `Change is not statistically significant (p=${pValue.toFixed(3)}, z=${zScore.toFixed(2)})`;

    return {
      zScore: Math.round(zScore * 100) / 100,
      pValue: Math.round(pValue * 1000) / 1000,
      isSignificant,
      interpretation,
    };
  }

  // ─── Trend Decomposition ──────────────────────────────────────────────

  /**
   * Decompose a series of metric changes into level, trend components.
   * Uses simple exponential smoothing to extract the underlying signal.
   */
  private trendDecomposition(changes: number[]): {
    overallTrend: "improving" | "declining" | "stable";
    trendStrength: number;
    volatility: number;
    acceleration: number;
  } {
    if (changes.length === 0) return { overallTrend: "stable", trendStrength: 0, volatility: 0, acceleration: 0 };

    const mean = changes.reduce((s, v) => s + v, 0) / changes.length;
    const variance = changes.reduce((s, v) => s + (v - mean) ** 2, 0) / changes.length;
    const volatility = Math.sqrt(variance);

    // Simple exponential smoothing to get trend
    let level = changes[0];
    let trend = 0;
    const alpha = 0.3, beta = 0.1;
    for (let i = 1; i < changes.length; i++) {
      const prevLevel = level;
      level = alpha * changes[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }

    const overallTrend: "improving" | "declining" | "stable" = level > 5 ? "improving" : level < -5 ? "declining" : "stable";
    const trendStrength = Math.min(1, Math.abs(level) / 20);
    const acceleration = Math.round(trend * 100) / 100;

    return { overallTrend, trendStrength: Math.round(trendStrength * 100) / 100, volatility: Math.round(volatility * 100) / 100, acceleration };
  }

  // ─── Composite Health Index ───────────────────────────────────────────

  /**
   * Compute a 0-100 health index from the snapshot diff, weighting
   * key metrics by their business impact.
   */
  private compositeHealthIndex(diff: Record<string, any>): {
    score: number; factors: { metric: string; contribution: number; direction: string }[];
    rating: "excellent" | "good" | "fair" | "poor" | "critical";
  } {
    const weights: Record<string, { weight: number; higherIsBetter: boolean }> = {
      totalConversions: { weight: 0.25, higherIsBetter: true },
      avgRoas: { weight: 0.2, higherIsBetter: true },
      avgCtr: { weight: 0.15, higherIsBetter: true },
      avgCvr: { weight: 0.15, higherIsBetter: true },
      totalSpend: { weight: 0.15, higherIsBetter: false },
      avgCpc: { weight: 0.1, higherIsBetter: false },
    };

    let score = 50; // start at neutral
    const factors: { metric: string; contribution: number; direction: string }[] = [];

    for (const [metric, config] of Object.entries(weights)) {
      const data = diff[metric];
      if (!data || data.change === undefined) continue;

      const maxChange = 50; // cap at ±50% contribution
      const normalizedChange = Math.max(-maxChange, Math.min(maxChange, data.changePercent || data.change));
      const contribution = (normalizedChange / maxChange) * config.weight * (config.higherIsBetter ? 1 : -1);
      score += contribution * 50; // scale to index points
      factors.push({
        metric,
        contribution: Math.round(contribution * 100) / 100,
        direction: normalizedChange > 0 ? (config.higherIsBetter ? "positive" : "negative") : (config.higherIsBetter ? "negative" : "positive"),
      });
    }

    const finalScore = Math.round(Math.max(0, Math.min(100, score)));
    const rating: "excellent" | "good" | "fair" | "poor" | "critical" =
      finalScore >= 80 ? "excellent" : finalScore >= 60 ? "good" : finalScore >= 40 ? "fair" : finalScore >= 20 ? "poor" : "critical";

    return { score: finalScore, factors, rating };
  }

  // ─── Forecast Comparison ──────────────────────────────────────────────

  /**
   * Project next period metrics based on trend between two snapshots.
   * Uses linear extrapolation for volume metrics and mean-reversion for rates.
   */
  private forecastComparison(metricsA: any, metricsB: any): {
    forecastPeriod: string;
    projectedMetrics: { metric: string; currentValue: number; projectedValue: number; projectedChange: number; confidence: "high" | "medium" | "low" }[];
    expectedOutcome: "positive" | "negative" | "neutral";
  } {
    const volumeKeys = ["totalImpressions", "totalClicks", "totalConversions", "totalSpend", "totalRevenue"];
    const rateKeys = ["avgCtr", "avgCpc", "avgRoas", "avgCvr"];

    const projected: { metric: string; currentValue: number; projectedValue: number; projectedChange: number; confidence: "high" | "medium" | "low" }[] = [];

    for (const key of volumeKeys) {
      const valA = metricsA[key] || 0;
      const valB = metricsB[key] || 0;
      const diff = valB - valA;
      const growthRate = valA > 0 ? diff / valA : 0.1;
      const projectedValue = valB * (1 + growthRate * 0.7); // dampen extrapolation
      const pctChange = valB > 0 ? ((projectedValue - valB) / valB) * 100 : 0;
      projected.push({
        metric: key, currentValue: Math.round(valB), projectedValue: Math.round(projectedValue),
        projectedChange: Math.round(pctChange * 100) / 100,
        confidence: valA > 0 && valB > 0 ? "medium" : "low",
      });
    }

    for (const key of rateKeys) {
      const valA = metricsA[key] || 0;
      const valB = metricsB[key] || 0;
      // Mean-reversion: projected moves 30% toward the mean of A and B
      const meanReversionRate = 0.3;
      const mean = (valA + valB) / 2;
      const projectedValue = valB + meanReversionRate * (mean - valB);
      const pctChange = valB > 0 ? ((projectedValue - valB) / valB) * 100 : 0;
      projected.push({
        metric: key, currentValue: Math.round(valB * 100) / 100, projectedValue: Math.round(projectedValue * 100) / 100,
        projectedChange: Math.round(pctChange * 100) / 100,
        confidence: "medium",
      });
    }

    const positiveSignals = projected.filter((p) => p.projectedChange > 0 && !["totalSpend", "avgCpc"].includes(p.metric)).length;
    const negativeSignals = projected.filter((p) => p.projectedChange < 0 && !["totalSpend", "avgCpc"].includes(p.metric)).length;
    const expectedOutcome: "positive" | "negative" | "neutral" = positiveSignals > negativeSignals + 1 ? "positive" : negativeSignals > positiveSignals + 1 ? "negative" : "neutral";

    return { forecastPeriod: "Next period", projectedMetrics: projected, expectedOutcome };
  }

  // ─── Standard Normal CDF ──────────────────────────────────────────────

  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
  }
}

export const campaignSnapshotService = new CampaignSnapshotService();
