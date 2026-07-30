import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

interface SnapshotTrendEntry {
  snapshotId: string;
  capturedAt: string;
  name: string;
  metrics: Record<string, number>;
  compositeScore: number;
}

interface SnapshotPerformanceTrendResult {
  campaignId: string;
  campaignName: string;
  snapshots: SnapshotTrendEntry[];
  direction: "improving" | "declining" | "stable";
  volatility: "low" | "medium" | "high";
  recommendation: string;
}

interface SnapshotAnomalyEntry {
  snapshotId: string;
  snapshotName: string;
  capturedAt: string;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  severity: "low" | "medium" | "high";
}

interface SnapshotAnomalyResult {
  anomalies: SnapshotAnomalyEntry[];
  summary: { total: number; high: number; medium: number; low: number };
}

interface SnapshotForecastEntry {
  metric: string;
  currentValue: number;
  forecastedValue: number;
  confidence: "high" | "medium" | "low";
  direction: "up" | "down" | "stable";
}

interface SnapshotForecastResult {
  campaignId: string;
  campaignName: string;
  forecasts: SnapshotForecastEntry[];
  overallOutlook: "positive" | "negative" | "neutral";
}

interface SnapshotHealthResult {
  campaignId: string;
  campaignName: string;
  healthScore: number;
  rating: "excellent" | "good" | "fair" | "poor" | "critical";
  dimensions: { name: string; score: number; weight: number }[];
  topIssues: string[];
}

interface SnapshotMetricDetail {
  metric: string;
  value: number;
  changeFromPrevious: number;
  changePercent: number;
  benchmark: number;
  percentile: number;
  status: "good" | "warning" | "critical";
}

interface SnapshotMetricBreakdownResult {
  snapshotId: string;
  snapshotName: string;
  capturedAt: string;
  campaignId: string;
  metrics: SnapshotMetricDetail[];
  overallHealth: number;
}

interface SnapshotChangeItem {
  metric: string;
  before: number;
  after: number;
  change: number;
  changePercent: number;
  direction: "improved" | "declined" | "stable";
  significance: string;
}

interface SnapshotChangeSummaryResult {
  snapshot1: { id: string; name: string; capturedAt: string };
  snapshot2: { id: string; name: string; capturedAt: string };
  changes: SnapshotChangeItem[];
  overallVerdict: string;
}

interface SnapshotBenchmarkMetric {
  metric: string;
  value: number;
  benchmark: number;
  gap: number;
  verdict: "above" | "at" | "below";
}

interface SnapshotBenchmarkResult {
  snapshotId: string;
  snapshotName: string;
  benchmarks: SnapshotBenchmarkMetric[];
  overallVerdict: "above" | "at" | "below";
  recommendation: string;
}

interface RegressionEntry {
  metric: string;
  beforeValue: number;
  afterValue: number;
  decline: number;
  declinePercent: number;
  severity: "minor" | "moderate" | "severe";
}

interface SnapshotRegressionReportResult {
  snapshot1: { id: string; name: string; capturedAt: string };
  snapshot2: { id: string; name: string; capturedAt: string };
  regressions: RegressionEntry[];
  improvements: RegressionEntry[];
  summary: string;
}

interface SnapshotExportSection {
  heading: string;
  content: Record<string, any>;
}

interface SnapshotExportResult {
  snapshotId: string;
  snapshotName: string;
  campaignId: string;
  campaignName: string;
  capturedAt: string;
  sections: SnapshotExportSection[];
  generatedAt: string;
}

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

  async snapshotPerformanceTrend(tenantId: string, campaignId: string): Promise<SnapshotPerformanceTrendResult | null> {
    const campaign = await DataStore.findCampaignById(campaignId, tenantId);
    if (!campaign) return null;
    const snapshots = DataStore.mem().find("campaign_snapshots", (s: any) => s.tenantId === tenantId && s.campaignId === campaignId);
    if (!snapshots.length) return null;
    const sorted = snapshots.sort((a: any, b: any) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
    const trendSeed = hashStr(campaignId + tenantId + "ss_trend");
    const entries: SnapshotTrendEntry[] = [];
    for (const s of sorted) {
      const m = s.metrics || {};
      const score = Math.round(
        ((m.totalConversions || 0) * 0.3 + (m.totalRevenue || 0) * 0.01 + (m.avgRoas || 0) * 10 + (m.avgCvr || 0) * 5) / 10
      );
      entries.push({
        snapshotId: s._id, capturedAt: s.capturedAt, name: s.name,
        metrics: { impressions: m.totalImpressions || 0, clicks: m.totalClicks || 0, conversions: m.totalConversions || 0, spend: m.totalSpend || 0, revenue: m.totalRevenue || 0, ctr: m.avgCtr || 0, cvr: m.avgCvr || 0, roas: m.avgRoas || 0 },
        compositeScore: Math.min(100, Math.max(0, score)),
      });
    }
    if (entries.length < 2) return { campaignId, campaignName: campaign.name, snapshots: entries, direction: "stable", volatility: "low", recommendation: "Insufficient snapshots for trend analysis" };
    const recentScore = entries[entries.length - 1].compositeScore;
    const firstScore = entries[0].compositeScore;
    const direction: "improving" | "declining" | "stable" = recentScore > firstScore + 5 ? "improving" : recentScore < firstScore - 5 ? "declining" : "stable";
    const scores = entries.map(e => e.compositeScore);
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    const std = Math.sqrt(scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length);
    const vol: "low" | "medium" | "high" = std < 8 ? "low" : std < 18 ? "medium" : "high";
    return { campaignId, campaignName: campaign.name, snapshots: entries, direction, volatility: vol, recommendation: direction === "declining" ? "Performance declining across snapshots — investigate root causes" : direction === "improving" ? "Consistent improvement across snapshots" : "Performance stable across snapshots" };
  }

  async snapshotAnomalyDetection(tenantId: string, campaignId: string): Promise<SnapshotAnomalyResult> {
    const snapshots = DataStore.mem().find("campaign_snapshots", (s: any) => s.tenantId === tenantId && s.campaignId === campaignId);
    const sorted = snapshots.sort((a: any, b: any) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
    const seed = hashStr(campaignId + tenantId + "ss_anom");
    const anomalies: SnapshotAnomalyEntry[] = [];
    const volumeKeys = ["totalImpressions", "totalClicks", "totalConversions", "totalSpend", "totalRevenue"];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].metrics || {};
      const curr = sorted[i].metrics || {};
      for (const key of volumeKeys) {
        const prevVal = prev[key] || 0;
        const currVal = curr[key] || 0;
        if (prevVal === 0) continue;
        const expectedGrowth = (seed + i * 13 + volumeKeys.indexOf(key) * 7) % 30;
        const expectedVal = prevVal * (1 + expectedGrowth / 100);
        const deviation = currVal > 0 ? Math.abs(currVal - expectedVal) / expectedVal : 0;
        if (deviation > 0.3) {
          const sev: "low" | "medium" | "high" = deviation > 0.6 ? "high" : deviation > 0.4 ? "medium" : "low";
          anomalies.push({
            snapshotId: sorted[i]._id, snapshotName: sorted[i].name, capturedAt: sorted[i].capturedAt,
            metric: key, expectedValue: Math.round(expectedVal), actualValue: currVal,
            deviation: Math.round(deviation * 100), severity: sev,
          });
        }
      }
    }
    const high = anomalies.filter(a => a.severity === "high").length;
    const med = anomalies.filter(a => a.severity === "medium").length;
    const low = anomalies.filter(a => a.severity === "low").length;
    return { anomalies, summary: { total: anomalies.length, high, medium: med, low } };
  }

  async snapshotForecast(tenantId: string, campaignId: string): Promise<SnapshotForecastResult | null> {
    const campaign = await DataStore.findCampaignById(campaignId, tenantId);
    if (!campaign) return null;
    const snapshots = DataStore.mem().find("campaign_snapshots", (s: any) => s.tenantId === tenantId && s.campaignId === campaignId);
    const sorted = snapshots.sort((a: any, b: any) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
    if (sorted.length < 2) {
      const m = sorted[0]?.metrics || {};
      return { campaignId, campaignName: campaign.name, forecasts: Object.entries(m).filter(([k]) => k.startsWith("total") || k.startsWith("avg")).map(([k, v]) => ({ metric: k, currentValue: v as number, forecastedValue: v as number, confidence: "low" as const, direction: "stable" as const })), overallOutlook: "neutral" as const };
    }
    const latest = sorted[sorted.length - 1].metrics || {};
    const prev = sorted[sorted.length - 2].metrics || {};
    const forecasts: SnapshotForecastEntry[] = [];
    const allKeys = Object.keys(latest).filter(k => k.startsWith("total") || k.startsWith("avg"));
    let positiveCount = 0, negativeCount = 0;
    for (const key of allKeys) {
      const curr = latest[key] || 0;
      const past = prev[key] || 0;
      const growth = past > 0 ? curr / past : 1.05;
      const nextVal = curr * Math.max(0.8, Math.min(1.3, growth * 0.9 + (((hashStr(key + tenantId) * 13) % 10) / 100)));
      const conf: "high" | "medium" | "low" = past > 0 && curr > 0 ? "medium" : "low";
      const dir: "up" | "down" | "stable" = nextVal > curr * 1.03 ? "up" : nextVal < curr * 0.97 ? "down" : "stable";
      if (dir === "up") positiveCount++;
      else if (dir === "down") negativeCount++;
      forecasts.push({ metric: key, currentValue: Math.round(curr * 100) / 100, forecastedValue: Math.round(nextVal * 100) / 100, confidence: conf, direction: dir });
    }
    const outlook: "positive" | "negative" | "neutral" = positiveCount > negativeCount + 2 ? "positive" : negativeCount > positiveCount + 2 ? "negative" : "neutral";
    return { campaignId, campaignName: campaign.name, forecasts, overallOutlook: outlook };
  }

  async snapshotHealthScore(tenantId: string, campaignId: string): Promise<SnapshotHealthResult | null> {
    const campaign = await DataStore.findCampaignById(campaignId, tenantId);
    if (!campaign) return null;
    const snapshots = DataStore.mem().find("campaign_snapshots", (s: any) => s.tenantId === tenantId && s.campaignId === campaignId);
    const latest = snapshots.sort((a: any, b: any) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())[0];
    const m = latest?.metrics || {};
    const dimensions = [
      { name: "Conversion Efficiency", score: Math.min(100, Math.max(0, ((m.avgCvr || 0) / 5) * 100)), weight: 0.25 },
      { name: "ROAS", score: Math.min(100, Math.max(0, ((m.avgRoas || 0) / 5) * 100)), weight: 0.25 },
      { name: "Engagement", score: Math.min(100, Math.max(0, ((m.avgCtr || 0) / 5) * 100)), weight: 0.2 },
      { name: "Cost Efficiency", score: Math.min(100, Math.max(0, 100 - ((m.avgCpc || 0) / 10) * 100)), weight: 0.15 },
      { name: "Volume", score: Math.min(100, Math.max(0, ((m.totalConversions || 0) / 500) * 100)), weight: 0.15 },
    ];
    const healthScore = Math.round(dimensions.reduce((s, d) => s + d.score * d.weight, 0));
    const rating: "excellent" | "good" | "fair" | "poor" | "critical" = healthScore >= 80 ? "excellent" : healthScore >= 60 ? "good" : healthScore >= 40 ? "fair" : healthScore >= 20 ? "poor" : "critical";
    const topIssues = dimensions.filter(d => d.score < 40).map(d => `${d.name} is low (${d.score})`);
    if (topIssues.length === 0) topIssues.push("No critical issues detected");
    return { campaignId, campaignName: campaign.name, healthScore, rating, dimensions, topIssues };
  }

  async snapshotMetricBreakdown(tenantId: string, snapshotId: string): Promise<SnapshotMetricBreakdownResult | null> {
    const snap = DataStore.mem().findOne("campaign_snapshots", (s: any) => s._id === snapshotId && s.tenantId === tenantId);
    if (!snap) return null;
    const m = snap.metrics || {};
    const seed = hashStr(snapshotId + tenantId + "ss_brk");
    const benchmarks: Record<string, number> = { totalImpressions: 50000, totalClicks: 2000, totalConversions: 100, totalSpend: 5000, totalRevenue: 15000, avgCtr: 2.5, avgCpc: 2.0, avgRoas: 3.0, avgCvr: 3.0 };
    const metrics: SnapshotMetricDetail[] = Object.entries(m).map(([key, val], mi) => {
      const v = val as number;
      const bm = benchmarks[key] || v;
      const pctile = Math.min(99, Math.max(1, Math.round(v / bm * 50)));
      const status: "good" | "warning" | "critical" = key === "avgCpc" || key === "totalSpend" ? (v > bm * 1.2 ? "warning" : v > bm * 1.5 ? "critical" : "good") : (v < bm * 0.5 ? "critical" : v < bm * 0.8 ? "warning" : "good");
      return { metric: key, value: Math.round(v * 100) / 100, changeFromPrevious: 0, changePercent: 0, benchmark: bm, percentile: pctile, status };
    });
    const overallHealth = Math.round(metrics.filter(m => m.status === "good").length / Math.max(1, metrics.length) * 100);
    return { snapshotId, snapshotName: snap.name, capturedAt: snap.capturedAt, campaignId: snap.campaignId, metrics, overallHealth };
  }

  async snapshotChangeSummary(tenantId: string, snapshotId1: string, snapshotId2: string): Promise<SnapshotChangeSummaryResult | null> {
    const s1 = DataStore.mem().findOne("campaign_snapshots", (s: any) => s._id === snapshotId1 && s.tenantId === tenantId);
    const s2 = DataStore.mem().findOne("campaign_snapshots", (s: any) => s._id === snapshotId2 && s.tenantId === tenantId);
    if (!s1 || !s2) return null;
    const m1 = s1.metrics || {};
    const m2 = s2.metrics || {};
    const allKeys = [...new Set([...Object.keys(m1), ...Object.keys(m2)])].filter(k => k.startsWith("total") || k.startsWith("avg"));
    const changes: SnapshotChangeItem[] = [];
    for (const key of allKeys) {
      const before = m1[key] || 0;
      const after = m2[key] || 0;
      const change = after - before;
      const cp = before > 0 ? Math.round(change / before * 10000) / 100 : 0;
      const dir: "improved" | "declined" | "stable" = (key === "avgCpc" || key === "totalSpend") ? (change < 0 ? "improved" : change > 0 ? "declined" : "stable") : (change > 0 ? "improved" : change < 0 ? "declined" : "stable");
      const sig = this.statisticalSignificance(before, after, s1.metrics.metricCount || 10, s2.metrics.metricCount || 10);
      changes.push({ metric: key, before: Math.round(before * 100) / 100, after: Math.round(after * 100) / 100, change: Math.round(change * 100) / 100, changePercent: cp, direction: dir, significance: sig.interpretation });
    }
    const improved = changes.filter(c => c.direction === "improved").length;
    const declined = changes.filter(c => c.direction === "declined").length;
    const verdict = improved > declined + 1 ? "Overall improvement" : declined > improved + 1 ? "Overall decline" : "Mixed results";
    return { snapshot1: { id: s1._id, name: s1.name, capturedAt: s1.capturedAt }, snapshot2: { id: s2._id, name: s2.name, capturedAt: s2.capturedAt }, changes, overallVerdict: verdict };
  }

  async snapshotBenchmark(tenantId: string, snapshotId: string): Promise<SnapshotBenchmarkResult | null> {
    const snap = DataStore.mem().findOne("campaign_snapshots", (s: any) => s._id === snapshotId && s.tenantId === tenantId);
    if (!snap) return null;
    const m = snap.metrics || {};
    const industry: Record<string, number> = { totalImpressions: 50000, totalClicks: 2000, totalConversions: 100, totalRevenue: 15000, avgCtr: 2.5, avgCpc: 2.0, avgRoas: 3.0, avgCvr: 3.0 };
    const benchmarks: SnapshotBenchmarkMetric[] = Object.entries(industry).map(([metric, bm]) => {
      const val = m[metric] || 0;
      const gap = Math.round((val - bm) * 100) / 100;
      const verdict: "above" | "at" | "below" = gap > bm * 0.1 ? "above" : gap < -bm * 0.1 ? "below" : "at";
      return { metric, value: Math.round(val * 100) / 100, benchmark: bm, gap, verdict };
    });
    const above = benchmarks.filter(b => b.verdict === "above").length;
    const below = benchmarks.filter(b => b.verdict === "below").length;
    const overallVerdict: "above" | "at" | "below" = above > below + 1 ? "above" : below > above + 1 ? "below" : "at";
    return { snapshotId, snapshotName: snap.name, benchmarks, overallVerdict, recommendation: overallVerdict === "above" ? "Snapshot metrics above industry benchmarks" : overallVerdict === "below" ? "Snapshot metrics below industry benchmarks — review and optimize" : "Snapshot metrics at industry benchmarks" };
  }

  async snapshotRegressionReport(tenantId: string, snapshotId1: string, snapshotId2: string): Promise<SnapshotRegressionReportResult | null> {
    const s1 = DataStore.mem().findOne("campaign_snapshots", (s: any) => s._id === snapshotId1 && s.tenantId === tenantId);
    const s2 = DataStore.mem().findOne("campaign_snapshots", (s: any) => s._id === snapshotId2 && s.tenantId === tenantId);
    if (!s1 || !s2) return null;
    const m1 = s1.metrics || {};
    const m2 = s2.metrics || {};
    const keys = Object.keys(m1).filter(k => k.startsWith("total") || k.startsWith("avg"));
    const regressions: RegressionEntry[] = [];
    const improvements: RegressionEntry[] = [];
    for (const key of keys) {
      const before = m1[key] || 0;
      const after = m2[key] || 0;
      if (before === 0) continue;
      const change = after - before;
      const cp = change / before;
      const isNegative = (key === "avgCpc" || key === "totalSpend") ? change > 0 : change < 0;
      const entry: RegressionEntry = {
        metric: key, beforeValue: Math.round(before * 100) / 100, afterValue: Math.round(after * 100) / 100,
        decline: Math.round(Math.abs(change) * 100) / 100,
        declinePercent: Math.round(Math.abs(cp) * 10000) / 100,
        severity: Math.abs(cp) > 0.3 ? "severe" : Math.abs(cp) > 0.15 ? "moderate" : "minor",
      };
      if (isNegative) regressions.push(entry);
      else improvements.push(entry);
    }
    const regSorted = regressions.sort((a, b) => b.declinePercent - a.declinePercent);
    const impSorted = improvements.sort((a, b) => b.declinePercent - a.declinePercent);
    const summary = regSorted.length > 0 ? `${regSorted.length} regression(s) detected, most severe: ${regSorted[0].metric} (${regSorted[0].declinePercent}% decline)` : "No regressions detected";
    return { snapshot1: { id: s1._id, name: s1.name, capturedAt: s1.capturedAt }, snapshot2: { id: s2._id, name: s2.name, capturedAt: s2.capturedAt }, regressions: regSorted, improvements: impSorted, summary };
  }

  async snapshotExport(tenantId: string, snapshotId: string): Promise<SnapshotExportResult | null> {
    const snap = DataStore.mem().findOne("campaign_snapshots", (s: any) => s._id === snapshotId && s.tenantId === tenantId);
    if (!snap) return null;
    const m = snap.metrics || {};
    const sections: SnapshotExportSection[] = [
      { heading: "Overview", content: { campaignId: snap.campaignId, campaignName: snap.campaignName, name: snap.name, capturedAt: snap.capturedAt, status: snap.status, platforms: snap.platforms } },
      { heading: "Volume Metrics", content: { impressions: m.totalImpressions, clicks: m.totalClicks, conversions: m.totalConversions, spend: m.totalSpend, revenue: m.totalRevenue, metricCount: m.metricCount } },
      { heading: "Rate Metrics", content: { ctr: m.avgCtr, cpc: m.avgCpc, roas: m.avgRoas, cvr: m.avgCvr } },
      { heading: "Budget", content: snap.budget || {} },
    ];
    return { snapshotId, snapshotName: snap.name, campaignId: snap.campaignId, campaignName: snap.campaignName, capturedAt: snap.capturedAt, sections, generatedAt: new Date().toISOString() };
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
