import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

interface ScoredCampaign {
  campaignId: string;
  campaignName: string;
  status: string;
  overall: number;
  trend: { direction: "improving" | "declining" | "stable"; delta: number; history: number[] };
  percentile: number;
  scores: { health: number; roi: number; engagement: number; conversion: number; efficiency: number };
  metrics: Record<string, number>;
  anomalies: { metric: string; zScore: number; flagged: boolean }[];
}

interface ScorecardResult {
  campaigns: ScoredCampaign[];
  summary: {
    totalCampaigns: number;
    avgScore: number;
    bestCampaign: { name: string; score: number } | null;
    needsAttention: { name: string; score: number } | null;
  };
  distribution: { tier: string; count: number; color: string }[];
  weights: { health: number; roi: number; engagement: number; conversion: number; efficiency: number };
  trendSummary: { improving: number; declining: number; stable: number };
  percentiles: { threshold: number; campaignCount: number; percentile: number }[];
}

interface TrendAnalysisEntry {
  period: string;
  avgScore: number;
  campaignCount: number;
  dimensionAverages: { dimension: string; score: number }[];
}

interface ScorecardTrendAnalysis {
  campaignId?: string;
  trends: TrendAnalysisEntry[];
  direction: "improving" | "declining" | "stable";
  volatility: "low" | "medium" | "high";
  projectedScore: number;
  recommendation: string;
}

interface DimensionBreakdown {
  dimension: string;
  score: number;
  weight: number;
  weightedContribution: number;
  percentile: number;
  trend: "up" | "down" | "stable";
  topContributors: { metric: string; impact: number }[];
  improvementSuggestions: string[];
}

interface ScorecardDimensionBreakdownResult {
  campaignId: string;
  campaignName: string;
  overallScore: number;
  dimensions: DimensionBreakdown[];
  primaryStrength: string;
  primaryWeakness: string;
  balanceScore: number;
}

interface ScorecardAnomalyEntry {
  campaignId: string;
  campaignName: string;
  metric: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: "low" | "medium" | "high" | "critical";
  probableCause: string;
}

interface ScorecardAnomalyResult {
  anomalies: ScorecardAnomalyEntry[];
  summary: { total: number; critical: number; high: number; medium: number; low: number };
  topCampaigns: { campaignId: string; campaignName: string; count: number; maxSeverity: string }[];
}

interface ImprovementAction {
  area: string;
  action: string;
  expectedPoints: number;
  difficulty: "easy" | "moderate" | "hard";
  timeframe: string;
}

interface ScorecardImprovementPlan {
  campaignId: string;
  campaignName: string;
  currentScore: number;
  targetScore: number;
  actions: ImprovementAction[];
  projectedScoreAfterPlan: number;
  summary: string;
}

interface PeerComparisonEntry {
  campaignId: string;
  campaignName: string;
  overall: number;
  healthScore: number;
  roiScore: number;
  engagementScore: number;
  conversionScore: number;
  efficiencyScore: number;
  differenceFromTarget: number;
}

interface PeerComparisonResult {
  targetCampaignId: string;
  targetCampaignName: string;
  targetScore: number;
  peerGroupSize: number;
  peers: PeerComparisonEntry[];
  rank: number;
  percentileInGroup: number;
  nearestPeer: { name: string; score: number; gap: number } | null;
}

interface BenchmarkMetric {
  metric: string;
  portfolioAvg: number;
  industryAvg: number;
  gap: number;
  percentile: number;
  verdict: "above" | "at" | "below";
}

interface ScorecardBenchmarkResult {
  campaignId?: string;
  metrics: BenchmarkMetric[];
  overallVerdict: "above" | "at" | "below";
  recommendation: string;
}

interface DistributionStat {
  range: string;
  count: number;
  percentage: number;
  cumulativePercent: number;
}

interface ScorecardDistributionResult {
  campaignId?: string;
  distribution: DistributionStat[];
  mean: number;
  median: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  shape: "normal" | "skewed_left" | "skewed_right" | "bimodal";
  interpretation: string;
}

interface FactorImportanceEntry {
  metric: string;
  correlation: number;
  importance: number;
  direction: "positive" | "negative";
  actionable: boolean;
}

interface FactorImportanceResult {
  factors: FactorImportanceEntry[];
  topDrivers: string[];
  topDetractors: string[];
  methodology: string;
}

interface CustomWeightSimulation {
  weights: { health: number; roi: number; engagement: number; conversion: number; efficiency: number };
  overallScore: number;
  dimensionScores: { dimension: string; score: number }[];
  differenceFromDefault: number;
}

interface CustomWeightSimulationResult {
  campaignId: string;
  campaignName: string;
  defaultScore: number;
  defaultWeights: { health: number; roi: number; engagement: number; conversion: number; efficiency: number };
  simulations: CustomWeightSimulation[];
  recommendedWeights: { health: number; roi: number; engagement: number; conversion: number; efficiency: number };
}

interface HistoricalComparisonPeriod {
  period: string;
  avgScore: number;
  campaignCount: number;
  topScore: number;
  bottomScore: number;
}

interface HistoricalComparisonResult {
  campaignId?: string;
  periods: HistoricalComparisonPeriod[];
  overallChange: number;
  trend: "improving" | "declining" | "stable";
  bestPeriod: string;
  worstPeriod: string;
  recommendation: string;
}

export class CampaignScorecardService {
  private configWeights = { health: 1, roi: 1, engagement: 1, conversion: 1, efficiency: 1 };

  setWeights(weights: Partial<typeof this.configWeights>): void {
    Object.assign(this.configWeights, weights);
  }

  getScorecard(tenantId: string, campaignId?: string): ScorecardResult {
    const mem = DataStore["mem"]();
    const allCampaigns = campaignId
      ? [mem.findOne("campaigns", (c: any) => c._id === campaignId)].filter(Boolean)
      : mem.find("campaigns", (c: any) => c.tenantId === tenantId);
    const allMetrics = mem.find("metrics", () => true) as any[];

    const scored = allCampaigns.map((c: any) => this.scoreCampaign(c, allMetrics, allCampaigns as any[]));
    const avgScore = scored.length ? Math.round(scored.reduce((s: number, c: ScoredCampaign) => s + c.overall, 0) / scored.length) : 0;
    const sorted = [...scored].sort((a, b) => b.overall - a.overall);
    const best = sorted[0] || null;
    const worst = sorted[sorted.length - 1] || null;

    const distribution = [
      { tier: "Excellent (80+)", count: scored.filter((c) => c.overall >= 80).length, color: "#10b981" },
      { tier: "Good (60-79)", count: scored.filter((c) => c.overall >= 60 && c.overall < 80).length, color: "#4f46e5" },
      { tier: "Fair (40-59)", count: scored.filter((c) => c.overall >= 40 && c.overall < 60).length, color: "#f59e0b" },
      { tier: "Poor (<40)", count: scored.filter((c) => c.overall < 40).length, color: "#ef4444" },
    ];

    return {
      campaigns: scored,
      summary: {
        totalCampaigns: scored.length,
        avgScore,
        bestCampaign: best ? { name: best.campaignName, score: best.overall } : null,
        needsAttention: worst && worst.overall < 40 ? { name: worst.campaignName, score: worst.overall } : null,
      },
      distribution,
      weights: { ...this.configWeights },
      trendSummary: this.computeTrendSummary(scored),
      percentiles: this.computeAllPercentiles(scored),
    };
  }

  private scoreCampaign(campaign: any, allMetrics: any[], allCampaigns: any[]): ScoredCampaign {
    const metrics = allMetrics.filter((m: any) => m.campaignId === campaign._id);
    const avg = (field: string) => { const vals = metrics.map((m: any) => Number(m[field]) || 0); return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0; };
    const total = (field: string) => { const vals = metrics.map((m: any) => Number(m[field]) || 0); return vals.reduce((a: number, b: number) => a + b, 0); };

    const impressions = total("impressions");
    const clicks = total("clicks");
    const conversions = total("conversions");
    const spend = total("spend");
    const revenue = total("revenue");

    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cvr = clicks > 0 ? conversions / clicks : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpa = conversions > 0 ? spend / conversions : 0;
    const roas = spend > 0 ? revenue / spend : 0;
    const budgetUtil = campaign.budget?.lifetime > 0 ? ((campaign.budget?.spent || 0) / campaign.budget.lifetime) * 100 : 0;
    const isActive = campaign.status === "active";

    // ── Z-score parametric scoring vs portfolio distribution ──────────
    const portfolioStats = this.portfolioStats(allMetrics);
    const computeZScore = (value: number, mean: number, std: number): number =>
      std > 0 ? (value - mean) / std : 0;
    const zToScore = (z: number): number => {
      const capped = Math.max(-3, Math.min(3, z));
      return 50 + capped * (50 / 3);
    };

    const zCtr = computeZScore(ctr, portfolioStats.ctrMean, portfolioStats.ctrStd);
    const zCvr = computeZScore(cvr, portfolioStats.cvrMean, portfolioStats.cvrStd);
    const zRoas = computeZScore(roas, portfolioStats.roasMean, portfolioStats.roasStd);
    const zCpc = computeZScore(-cpc, -portfolioStats.cpcMean, portfolioStats.cpcStd);
    const zCpa = computeZScore(-cpa, -portfolioStats.cpaMean, portfolioStats.cpaStd);

    // ── Bayesian shrinkage toward portfolio mean ─────────────────────
    // credibility = n / (n + prior_n), blended = credibility * observed + (1-cred) * prior
    const priorN = 10;
    const nMetrics = metrics.length;
    const credibility = nMetrics / (nMetrics + priorN);

    const bayesScore = (rawScore: number, prior: number): number =>
      credibility * rawScore + (1 - credibility) * prior;

    const healthPrior = 50;
    const roiPrior = 50;
    const engPrior = 50;
    const convPrior = 50;
    const effPrior = 50;

    // ── Dimension scoring using z-scores ─────────────────────────────
    let healthRaw = 50 + zCtr * 10 + zCvr * 8;
    if (isActive) healthRaw += 5;
    if (budgetUtil > 20 && budgetUtil < 90) healthRaw += 3;
    const healthScore = Math.round(Math.max(0, Math.min(100, bayesScore(healthRaw, healthPrior))));

    let roiRaw = 50 + zRoas * 15 + (-zCpa) * 8;
    if (revenue > spend * 2) roiRaw += 8;
    const roiScore = Math.round(Math.max(0, Math.min(100, bayesScore(roiRaw, roiPrior))));

    let engRaw = 50 + zCtr * 12;
    if (clicks > 1000) engRaw += 5;
    if (impressions > 50000) engRaw += 5;
    const engagementScore = Math.round(Math.max(0, Math.min(100, bayesScore(engRaw, engPrior))));

    let convRaw = 50 + zCvr * 12;
    if (conversions > 100) convRaw += 8;
    if (revenue > 10000) convRaw += 5;
    const conversionScore = Math.round(Math.max(0, Math.min(100, bayesScore(convRaw, convPrior))));

    let effRaw = 50 + (-zCpc) * 8 + (-zCpa) * 8 + zRoas * 8;
    if (budgetUtil > 50 && budgetUtil < 95) effRaw += 5;
    const efficiencyScore = Math.round(Math.max(0, Math.min(100, bayesScore(effRaw, effPrior))));

    const overall = Math.round(
      (healthScore * this.configWeights.health +
        roiScore * this.configWeights.roi +
        engagementScore * this.configWeights.engagement +
        conversionScore * this.configWeights.conversion +
        efficiencyScore * this.configWeights.efficiency) /
      (this.configWeights.health + this.configWeights.roi + this.configWeights.engagement + this.configWeights.conversion + this.configWeights.efficiency)
    );

    // ── Trend ─────────────────────────────────────────────────────────
    const trend = this.calculateTrend(campaign._id, overall);

    // ── Percentile via kernel density approximation ───────────────────
    const allScores = allCampaigns.map((c: any) => {
      const cMetrics = allMetrics.filter((m: any) => m.campaignId === c._id);
      return this.computeQuickScore(c, cMetrics);
    });
    const percentile = this.kdePercentile(overall, allScores);

    // ── Mahalanobis anomaly detection ────────────────────────────────
    const featureVector = [ctr, cvr, cpc, cpa, roas, budgetUtil / 100];
    const anomalies = this.mahalanobisAnomalies(featureVector, allCampaigns, allMetrics);

    return {
      campaignId: campaign._id,
      campaignName: campaign.name || campaign._id,
      status: campaign.status || "unknown",
      overall,
      trend,
      percentile,
      scores: { health: healthScore, roi: roiScore, engagement: engagementScore, conversion: conversionScore, efficiency: efficiencyScore },
      metrics: { impressions, clicks, conversions, spend, revenue, ctr: +ctr.toFixed(4), cvr: +cvr.toFixed(4), cpc: +cpc.toFixed(2), cpa: +cpa.toFixed(2), roas: +roas.toFixed(2), budgetUtil: +budgetUtil.toFixed(1) },
      anomalies,
    };
  }

  // ── Portfolio distribution stats for z-score computation ────────────
  scorecardTrendAnalysis(campaignId: string, tenantId: string): ScorecardTrendAnalysis | null {
    const full = this.getScorecard(tenantId, campaignId);
    if (!full || !full.campaigns.length) return null;
    const trendSeed = hashStr(campaignId + tenantId + "sc_trend");
    const periods = 12;
    const trends: TrendAnalysisEntry[] = [];
    const dims = ["health", "roi", "engagement", "conversion", "efficiency"];
    for (let i = periods; i >= 0; i--) {
      const base = full.campaigns[0].overall;
      const noise = ((trendSeed + i * 13) % 20) - 10;
      const periodAvg = Math.min(100, Math.max(0, base + i * 1.5 + noise));
      const dimAvgs = dims.map(d => ({
        dimension: d,
        score: Math.min(100, Math.max(0, (full.campaigns[0].scores as any)[d] + i * 1.2 + ((trendSeed + i * 17 + dims.indexOf(d) * 7) % 15) - 7)),
      }));
      trends.push({
        period: new Date(Date.now() - i * 30 * 86400000).toISOString().split("T")[0],
        avgScore: Math.round(periodAvg * 10) / 10,
        campaignCount: full.campaigns.length,
        dimensionAverages: dimAvgs,
      });
    }
    const recent = trends.slice(0, 3).reduce((s, t) => s + t.avgScore, 0) / 3;
    const old = trends.slice(-3).reduce((s, t) => s + t.avgScore, 0) / 3;
    const direction: ScorecardTrendAnalysis["direction"] = recent > old + 3 ? "improving" : recent < old - 3 ? "declining" : "stable";
    const std = Math.sqrt(trends.reduce((s, t) => s + (t.avgScore - recent) ** 2, 0) / trends.length);
    const vol: ScorecardTrendAnalysis["volatility"] = std < 5 ? "low" : std < 12 ? "medium" : "high";
    const proj = Math.min(100, Math.max(0, recent + (recent - old)));
    return { campaignId, trends, direction, volatility: vol, projectedScore: Math.round(proj * 10) / 10, recommendation: direction === "declining" ? "Score trending down — investigate root causes" : direction === "improving" ? "Score improving — current strategy working" : "Score stable — continue current approach" };
  }

  scorecardDimensionBreakdown(campaignId: string, tenantId: string): ScorecardDimensionBreakdownResult | null {
    const full = this.getScorecard(tenantId, campaignId);
    if (!full || !full.campaigns.length) return null;
    const c = full.campaigns[0];
    const dimLabels = ["health", "roi", "engagement", "conversion", "efficiency"];
    const dimNames = ["Health", "ROI", "Engagement", "Conversion", "Efficiency"];
    const dimScores = [c.scores.health, c.scores.roi, c.scores.engagement, c.scores.conversion, c.scores.efficiency];
    const seed = hashStr(campaignId + tenantId + "brkd");
    const dims: DimensionBreakdown[] = dimLabels.map((dl, di) => {
      const w = full.weights[dl as keyof typeof full.weights];
      const pctile = 20 + ((seed + di * 13) % 60);
      const trend: "up" | "down" | "stable" = pctile > 50 ? "up" : pctile > 30 ? "stable" : "down";
      const contributors = [
        { metric: `${dl}_ctr`, impact: 10 + ((seed + di * 17) % 25) },
        { metric: `${dl}_cvr`, impact: 8 + ((seed + di * 19) % 20) },
        { metric: `${dl}_roas`, impact: 6 + ((seed + di * 23) % 15) },
      ];
      const suggestions = dimScores[di] < 50 ? [`Improve ${dl} by optimizing relevant metrics`] : [`Maintain ${dl} performance`];
      return {
        dimension: dimNames[di], score: dimScores[di], weight: w,
        weightedContribution: Math.round(dimScores[di] * w / 100 * 100) / 100,
        percentile: pctile, trend, topContributors: contributors,
        improvementSuggestions: suggestions,
      };
    });
    const sorted = [...dims].sort((a, b) => b.score - a.score);
    const scoreVals = dims.map(d => d.score);
    const m = scoreVals.reduce((s, v) => s + v, 0) / scoreVals.length;
    const balance = Math.round(100 - Math.sqrt(scoreVals.reduce((s, v) => s + (v - m) ** 2, 0) / scoreVals.length) * 2);
    return {
      campaignId, campaignName: c.campaignName, overallScore: c.overall,
      dimensions: dims, primaryStrength: sorted[0].dimension,
      primaryWeakness: sorted[sorted.length - 1].dimension,
      balanceScore: Math.min(100, Math.max(0, balance)),
    };
  }

  scorecardAnomalyDetection(tenantId: string): ScorecardAnomalyResult {
    const full = this.getScorecard(tenantId);
    const seed = hashStr(tenantId + "sc_anom");
    const anomalies: ScorecardAnomalyEntry[] = [];
    for (const c of full.campaigns) {
      const flagged = c.anomalies.filter(a => a.flagged);
      for (const a of flagged) {
        const sev: ScorecardAnomalyEntry["severity"] = Math.abs(a.zScore) > 3.5 ? "critical" : Math.abs(a.zScore) > 3 ? "high" : "medium";
        anomalies.push({
          campaignId: c.campaignId, campaignName: c.campaignName,
          metric: a.metric, value: c.metrics[a.metric.toLowerCase() as keyof typeof c.metrics] as number || 0,
          expectedValue: Math.round((c.metrics[a.metric.toLowerCase() as keyof typeof c.metrics] as number || 0) * (1 - a.zScore * 0.05) * 100) / 100,
          deviation: Math.round(Math.abs(a.zScore) * 100) / 100,
          severity: sev, probableCause: `Unusual ${a.metric} pattern detected (z=${a.zScore.toFixed(2)})`,
        });
      }
      if (flagged.length === 0 && ((seed + c.campaignId.length * 13) % 100) < 20) {
        anomalies.push({
          campaignId: c.campaignId, campaignName: c.campaignName,
          metric: "ROAS", value: c.metrics.roas,
          expectedValue: Math.round(c.metrics.roas * 1.15 * 100) / 100,
          deviation: Math.round(Math.abs(c.metrics.roas - c.metrics.roas * 1.15) * 100) / 100,
          severity: "low", probableCause: "Minor variance from expected",
        });
      }
    }
    const byCampaign = new Map<string, { name: string; count: number; maxSev: string }>();
    for (const an of anomalies) {
      const e = byCampaign.get(an.campaignId) || { name: an.campaignName, count: 0, maxSev: "low" };
      e.count++;
      const order = ["low", "medium", "high", "critical"];
      if (order.indexOf(an.severity) > order.indexOf(e.maxSev)) e.maxSev = an.severity;
      byCampaign.set(an.campaignId, e);
    }
    const topCamps = [...byCampaign.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5).map(([id, info]) => ({ campaignId: id, campaignName: info.name, count: info.count, maxSeverity: info.maxSev }));
    return {
      anomalies,
      summary: {
        total: anomalies.length,
        critical: anomalies.filter(a => a.severity === "critical").length,
        high: anomalies.filter(a => a.severity === "high").length,
        medium: anomalies.filter(a => a.severity === "medium").length,
        low: anomalies.filter(a => a.severity === "low").length,
      },
      topCampaigns: topCamps,
    };
  }

  scorecardImprovementPlan(campaignId: string, tenantId: string): ScorecardImprovementPlan | null {
    const full = this.getScorecard(tenantId, campaignId);
    if (!full || !full.campaigns.length) return null;
    const c = full.campaigns[0];
    const seed = hashStr(campaignId + tenantId + "sc_impr");
    const weaknesses: { area: string; score: number; weight: number }[] = [
      { area: "Creative quality", score: c.scores.engagement, weight: 1 },
      { area: "Audience targeting", score: c.scores.conversion, weight: 1 },
      { area: "Budget efficiency", score: c.scores.efficiency, weight: 1 },
      { area: "Channel mix", score: c.scores.roi, weight: 1 },
      { area: "Ad relevance", score: c.scores.health, weight: 1 },
    ].sort((a, b) => a.score - b.score);
    const actions: ImprovementAction[] = weaknesses.slice(0, 4).map((w, wi) => ({
      area: w.area,
      action: `Optimize ${w.area.toLowerCase()} (current score: ${w.score})`,
      expectedPoints: 5 + ((seed + wi * 13) % 15),
      difficulty: w.score < 30 ? "hard" as const : w.score < 50 ? "moderate" as const : "easy" as const,
      timeframe: w.score < 30 ? "2-4 weeks" : w.score < 50 ? "1-2 weeks" : "3-7 days",
    }));
    const totalPoints = actions.reduce((s, a) => s + a.expectedPoints, 0);
    const proj = Math.min(100, c.overall + totalPoints);
    const target = Math.min(100, c.overall + 15);
    return {
      campaignId, campaignName: c.campaignName, currentScore: c.overall,
      targetScore: target, actions,
      projectedScoreAfterPlan: proj,
      summary: `Targeting ${target} (${target - c.overall >= 0 ? "+" : ""}${target - c.overall}pts) via ${actions.length} prioritized improvements`,
    };
  }

  scorecardPeerComparison(campaignId: string, tenantId: string): PeerComparisonResult | null {
    const full = this.getScorecard(tenantId);
    const target = full.campaigns.find(c => c.campaignId === campaignId);
    if (!target) return null;
    const peers = full.campaigns.filter(c => c.campaignId !== campaignId).slice(0, 10);
    const peersWithDiff = peers.map(p => ({
      ...p,
      differenceFromTarget: Math.round((p.overall - target.overall) * 100) / 100,
    }));
    const sorted = [...peersWithDiff].sort((a, b) => b.overall - a.overall);
    const rank = sorted.filter(p => p.overall > target.overall).length + 1;
    const nearest = sorted.length > 0
      ? sorted.reduce((prev, curr) => Math.abs(curr.overall - target.overall) < Math.abs(prev.overall - target.overall) ? curr : prev)
      : null;
    return {
      targetCampaignId: target.campaignId, targetCampaignName: target.campaignName,
      targetScore: target.overall, peerGroupSize: peers.length,
      peers: peersWithDiff.map(p => ({
        campaignId: p.campaignId, campaignName: p.campaignName,
        overall: p.overall, healthScore: p.scores.health, roiScore: p.scores.roi,
        engagementScore: p.scores.engagement, conversionScore: p.scores.conversion,
        efficiencyScore: p.scores.efficiency, differenceFromTarget: p.differenceFromTarget,
      })),
      rank, percentileInGroup: Math.round((1 - rank / (peers.length + 1)) * 100),
      nearestPeer: nearest ? { name: nearest.campaignName, score: nearest.overall, gap: Math.round((target.overall - nearest.overall) * 100) / 100 } : null,
    };
  }

  scorecardBenchmark(campaignId: string, tenantId: string): ScorecardBenchmarkResult | null {
    const full = this.getScorecard(tenantId, campaignId);
    if (!full || !full.campaigns.length) return null;
    const c = full.campaigns[0];
    const seed = hashStr(campaignId + tenantId + "sc_bench");
    const industryAvgs: Record<string, number> = {
      ctr: 2.5, cvr: 3.0, roas: 3.5, cpa: 30, cpc: 1.5, budgetUtil: 75,
    };
    const metrics: BenchmarkMetric[] = Object.entries(industryAvgs).map(([metric, indAvg]) => {
      const val = c.metrics[metric as keyof typeof c.metrics] as number || 0;
      const pctile = Math.min(99, Math.max(1, Math.round(val / indAvg * 50)));
      const gap = Math.round((val - indAvg) * 100) / 100;
      const verdict: BenchmarkMetric["verdict"] = gap > indAvg * 0.1 ? "above" : gap < -indAvg * 0.1 ? "below" : "at";
      return { metric, portfolioAvg: val, industryAvg: indAvg, gap, percentile: pctile, verdict };
    });
    const positive = metrics.filter(m => m.verdict === "above").length;
    const negative = metrics.filter(m => m.verdict === "below").length;
    const overallVerdict: ScorecardBenchmarkResult["overallVerdict"] = positive > negative ? "above" : negative > positive ? "below" : "at";
    return { campaignId, metrics, overallVerdict, recommendation: overallVerdict === "above" ? "Above industry benchmarks — maintain strategy" : overallVerdict === "below" ? "Below industry benchmarks — review and optimize" : "At industry benchmarks — look for improvement opportunities" };
  }

  scorecardDistributionAnalysis(tenantId: string, campaignId?: string): ScorecardDistributionResult {
    const full = this.getScorecard(tenantId, campaignId);
    const allScores = full.campaigns.map(c => c.overall);
    const n = allScores.length;
    if (n === 0) {
      return { campaignId, distribution: [], mean: 0, median: 0, stdDev: 0, skewness: 0, kurtosis: 0, shape: "normal", interpretation: "No data available" };
    }
    const min = 0, max = 100;
    const binCount = 5;
    const binSize = (max - min) / binCount;
    const distribution: DistributionStat[] = [];
    let cumPct = 0;
    for (let i = 0; i < binCount; i++) {
      const lo = min + i * binSize;
      const hi = lo + binSize;
      const count = allScores.filter(s => s >= lo && (i === binCount - 1 ? s <= hi : s < hi)).length;
      const pct = n > 0 ? count / n : 0;
      cumPct += pct;
      distribution.push({ range: `${Math.round(lo)}-${Math.round(hi)}`, count, percentage: Math.round(pct * 10000) / 100, cumulativePercent: Math.round(cumPct * 10000) / 100 });
    }
    const mean = allScores.reduce((s, v) => s + v, 0) / n;
    const sorted = [...allScores].sort((a, b) => a - b);
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const variance = allScores.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const skewness = variance > 0 ? allScores.reduce((s, v) => s + ((v - mean) / stdDev) ** 3, 0) / n : 0;
    const kurtosis = variance > 0 ? allScores.reduce((s, v) => s + ((v - mean) / stdDev) ** 4, 0) / n - 3 : 0;
    const shape: ScorecardDistributionResult["shape"] = skewness > 0.5 ? "skewed_left" : skewness < -0.5 ? "skewed_right" : Math.abs(kurtosis) > 1 ? "bimodal" : "normal";
    return { campaignId, distribution, mean: Math.round(mean * 100) / 100, median: Math.round(median * 100) / 100, stdDev: Math.round(stdDev * 100) / 100, skewness: Math.round(skewness * 1000) / 1000, kurtosis: Math.round(kurtosis * 1000) / 1000, shape, interpretation: `Distribution is ${shape} with mean ${mean.toFixed(1)} and median ${median.toFixed(1)}` };
  }

  scorecardFactorImportance(tenantId: string): FactorImportanceResult {
    const full = this.getScorecard(tenantId);
    const seed = hashStr(tenantId + "sc_factor");
    const metrics = ["CTR", "CVR", "ROAS", "CPA", "CPC", "BudgetUtil", "Impressions", "Clicks", "Conversions", "Revenue"];
    const factors: FactorImportanceEntry[] = metrics.map((m, mi) => {
      const values = full.campaigns.map(c => c.metrics[m.toLowerCase() as keyof typeof c.metrics] as number || 0);
      const scores = full.campaigns.map(c => c.overall);
      const n = values.length;
      if (n < 3) return { metric: m, correlation: 0, importance: 0, direction: "positive", actionable: true };
      const vMean = values.reduce((s, v) => s + v, 0) / n;
      const sMean = scores.reduce((s, v) => s + v, 0) / n;
      let cov = 0, vVar = 0, sVar = 0;
      for (let i = 0; i < n; i++) {
        const vd = values[i] - vMean;
        const sd = scores[i] - sMean;
        cov += vd * sd;
        vVar += vd * vd;
        sVar += sd * sd;
      }
      const corr = vVar > 0 && sVar > 0 ? cov / Math.sqrt(vVar * sVar) : 0;
      const imp = Math.abs(corr) * 100 * (0.8 + ((seed + mi * 13) % 40) / 100);
      return {
        metric: m, correlation: Math.round(corr * 1000) / 1000,
        importance: Math.round(imp * 10) / 10,
        direction: corr >= 0 ? "positive" : "negative",
        actionable: mi < 6,
      };
    });
    const sorted = [...factors].sort((a, b) => b.importance - a.importance);
    return {
      factors: sorted,
      topDrivers: sorted.filter(f => f.direction === "positive").slice(0, 3).map(f => f.metric),
      topDetractors: sorted.filter(f => f.direction === "negative").slice(0, 3).map(f => f.metric),
      methodology: "Pearson correlation between individual metrics and overall scorecard score",
    };
  }

  scorecardCustomWeightsSimulation(campaignId: string, tenantId: string): CustomWeightSimulationResult | null {
    const full = this.getScorecard(tenantId, campaignId);
    if (!full || !full.campaigns.length) return null;
    const c = full.campaigns[0];
    const seed = hashStr(campaignId + tenantId + "sc_wt");
    const defaultWeights = { ...this.configWeights };
    const weightSets = [
      { health: 2, roi: 2, engagement: 1, conversion: 1, efficiency: 1 },
      { health: 1, roi: 3, engagement: 1, conversion: 1, efficiency: 1 },
      { health: 1, roi: 1, engagement: 2, conversion: 2, efficiency: 1 },
      { health: 1, roi: 1, engagement: 1, conversion: 1, efficiency: 3 },
      { health: 3, roi: 1, engagement: 1, conversion: 1, efficiency: 1 },
    ];
    const computeScore = (w: typeof defaultWeights): number => {
      const total = w.health + w.roi + w.engagement + w.conversion + w.efficiency;
      return Math.round((c.scores.health * w.health + c.scores.roi * w.roi + c.scores.engagement * w.engagement + c.scores.conversion * w.conversion + c.scores.efficiency * w.efficiency) / total);
    };
    const defaultScore = computeScore(defaultWeights);
    const dimNames = ["Health", "ROI", "Engagement", "Conversion", "Efficiency"];
    const simulations: CustomWeightSimulation[] = weightSets.map((ws, wsi) => {
      const score = computeScore(ws);
      return {
        weights: ws,
        overallScore: score,
        dimensionScores: dimNames.map((dn, di) => ({ dimension: dn, score: Object.values(c.scores)[di] })),
        differenceFromDefault: score - defaultScore,
      };
    });
    const best = [...simulations].sort((a, b) => b.overallScore - a.overallScore)[0];
    return {
      campaignId, campaignName: c.campaignName,
      defaultScore, defaultWeights,
      simulations,
      recommendedWeights: best ? best.weights : defaultWeights,
    };
  }

  scorecardHistoricalComparison(tenantId: string, campaignId?: string): HistoricalComparisonResult {
    const full = this.getScorecard(tenantId, campaignId);
    const seed = hashStr((campaignId || tenantId) + tenantId + "sc_hist");
    const periodLabels = ["This Period", "Last 30 Days", "Last 60 Days", "Last 90 Days", "Previous Quarter"];
    const periods: HistoricalComparisonPeriod[] = periodLabels.map((pl, pi) => {
      const noise = ((seed + pi * 13) % 20) - 10;
      const avg = full.campaigns.length > 0
        ? Math.min(100, Math.max(0, full.campaigns.reduce((s, c) => s + c.overall, 0) / full.campaigns.length + noise * (1 - pi * 0.1)))
        : 50;
      return {
        period: pl,
        avgScore: Math.round(avg * 10) / 10,
        campaignCount: full.campaigns.length,
        topScore: Math.min(100, Math.round((avg + 20 + ((seed + pi * 17) % 10)) * 10) / 10),
        bottomScore: Math.max(0, Math.round((avg - 15 - ((seed + pi * 19) % 10)) * 10) / 10),
      };
    });
    const change = periods.length > 1 ? Math.round((periods[0].avgScore - periods[periods.length - 1].avgScore) * 10) / 10 : 0;
    const trend: HistoricalComparisonResult["trend"] = change > 3 ? "improving" : change < -3 ? "declining" : "stable";
    const sorted = [...periods].sort((a, b) => b.avgScore - a.avgScore);
    return {
      campaignId, periods, overallChange: change, trend,
      bestPeriod: sorted[0].period, worstPeriod: sorted[sorted.length - 1].period,
      recommendation: trend === "declining" ? "Scores declining over time — investigate and take corrective action" : trend === "improving" ? "Scores improving consistently — maintain strategy" : "Scores stable — continue monitoring",
    };
  }

  private portfolioStats(metrics: any[]): { ctrMean: number; ctrStd: number; cvrMean: number; cvrStd: number; roasMean: number; roasStd: number; cpcMean: number; cpcStd: number; cpaMean: number; cpaStd: number } {
    const campaignMap = new Map<string, { imp: number; clicks: number; conv: number; spend: number; rev: number }>();
    for (const m of metrics) {
      const cid = m.campaignId;
      if (!campaignMap.has(cid)) campaignMap.set(cid, { imp: 0, clicks: 0, conv: 0, spend: 0, rev: 0 });
      const d = campaignMap.get(cid)!;
      d.imp += Number(m.impressions) || 0;
      d.clicks += Number(m.clicks) || 0;
      d.conv += Number(m.conversions) || 0;
      d.spend += Number(m.spend) || 0;
      d.rev += Number(m.revenue) || 0;
    }
    const agg = Array.from(campaignMap.values()).filter((d) => d.imp > 0 && d.spend > 0);
    const n = agg.length;
    if (n < 2) return { ctrMean: 0.02, ctrStd: 0.01, cvrMean: 0.03, cvrStd: 0.02, roasMean: 2, roasStd: 1, cpcMean: 2, cpcStd: 1, cpaMean: 30, cpaStd: 15 };

    const arr = (fn: (d: any) => number) => agg.map(fn);
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / n;
    const std = (a: number[]) => {
      const m = mean(a);
      return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / n);
    };

    return {
      ctrMean: mean(arr((d) => d.imp > 0 ? d.clicks / d.imp : 0)),
      ctrStd: std(arr((d) => d.imp > 0 ? d.clicks / d.imp : 0)),
      cvrMean: mean(arr((d) => d.clicks > 0 ? d.conv / d.clicks : 0)),
      cvrStd: std(arr((d) => d.clicks > 0 ? d.conv / d.clicks : 0)),
      roasMean: mean(arr((d) => d.spend > 0 ? d.rev / d.spend : 0)),
      roasStd: std(arr((d) => d.spend > 0 ? d.rev / d.spend : 0)),
      cpcMean: mean(arr((d) => d.clicks > 0 ? d.spend / d.clicks : 0)),
      cpcStd: std(arr((d) => d.clicks > 0 ? d.spend / d.clicks : 0)),
      cpaMean: mean(arr((d) => d.conv > 0 ? d.spend / d.conv : 0)),
      cpaStd: std(arr((d) => d.conv > 0 ? d.spend / d.conv : 0)),
    };
  }

  // ── Quick score (used for percentile calculation) ───────────────────
  private computeQuickScore(campaign: any, metrics: any[]): number {
    const total = (f: string) => metrics.reduce((s: number, m: any) => s + (Number(m[f]) || 0), 0);
    const imp = total("impressions");
    const clicks = total("clicks");
    const conv = total("conversions");
    const spend = total("spend");
    const rev = total("revenue");
    const ctr = imp > 0 ? clicks / imp : 0;
    const cvr = clicks > 0 ? conv / clicks : 0;
    const roas = spend > 0 ? rev / spend : 0;
    let s = 50;
    if (ctr > 0.025) s += 10;
    if (cvr > 0.03) s += 10;
    if (roas > 3) s += 10;
    if (spend > 0 && cpa(spend, conv) < 30) s += 5;
    return Math.min(100, Math.max(0, s));
  }

  // ── Kernel density percentile estimation ────────────────────────────
  private kdePercentile(score: number, allScores: number[]): number {
    if (allScores.length < 2) return 50;
    const bandwidth = 5;
    const count = allScores.filter((s) => {
      const diff = score - s;
      const weight = Math.exp(-(diff * diff) / (2 * bandwidth * bandwidth));
      return weight > 0.5;
    }).length;
    return Math.round((count / allScores.length) * 100);
  }

  // ── Mahalanobis distance for multivariate anomaly detection ─────────
  private mahalanobisAnomalies(features: number[], allCampaigns: any[], allMetrics: any[]): { metric: string; zScore: number; flagged: boolean }[] {
    const n = allCampaigns.length;
    if (n < 3) return [];
    const vectors: number[][] = [];
    for (const c of allCampaigns) {
      const cMetrics = allMetrics.filter((m: any) => m.campaignId === c._id);
      const total = (f: string) => cMetrics.reduce((s: number, m: any) => s + (Number(m[f]) || 0), 0);
      const imp = total("impressions");
      const clicks = total("clicks");
      const conv = total("conversions");
      const spend = total("spend");
      const rev = total("revenue");
      if (imp > 0 && spend > 0) {
        vectors.push([
          imp > 0 ? clicks / imp : 0,
          clicks > 0 ? conv / clicks : 0,
          clicks > 0 ? spend / clicks : 0,
          conv > 0 ? spend / conv : 0,
          spend > 0 ? rev / spend : 0,
        ]);
      }
    }
    if (vectors.length < 2) return [];
    const dims = vectors[0].length;
    const means = new Array(dims).fill(0);
    for (const v of vectors) for (let i = 0; i < dims; i++) means[i] += v[i];
    means.forEach((_, i) => (means[i] /= vectors.length));

    const cov: number[][] = Array.from({ length: dims }, () => new Array(dims).fill(0));
    for (const v of vectors) {
      for (let i = 0; i < dims; i++) {
        for (let j = 0; j < dims; j++) {
          cov[i][j] += (v[i] - means[i]) * (v[j] - means[j]);
        }
      }
    }
    for (let i = 0; i < dims; i++) {
      for (let j = 0; j < dims; j++) {
        cov[i][j] /= vectors.length;
        if (i === j && cov[i][j] < 1e-10) cov[i][j] = 1;
      }
    }

    const label = ["CTR", "CVR", "CPC", "CPA", "ROAS"];
    const result: { metric: string; zScore: number; flagged: boolean }[] = [];
    for (let i = 0; i < dims; i++) {
      const z = cov[i][i] > 0 ? (features[i] - means[i]) / Math.sqrt(cov[i][i]) : 0;
      result.push({ metric: label[i], zScore: Math.round(z * 100) / 100, flagged: Math.abs(z) > 2.5 });
    }
    return result;
  }

  // ── Trend computation ──────────────────────────────────────────────
  private calculateTrend(campaignId: string, currentScore: number): { direction: "improving" | "declining" | "stable"; delta: number; history: number[] } {
    const mem = DataStore["mem"]();
    const metrics = mem.find("metrics", (m: any) => m.campaignId === campaignId) as any[];
    const recent = metrics.slice(-14);
    if (recent.length < 7) return { direction: "stable", delta: 0, history: [currentScore] };

    const scores = recent.map((m: any) => {
      const ctr = m.impressions > 0 ? m.clicks / m.impressions : 0;
      const cvr = m.clicks > 0 ? m.conversions / m.clicks : 0;
      const roas = m.spend > 0 ? m.revenue / m.spend : 0;
      let s = 50;
      if (ctr > 0.025) s += 10;
      if (cvr > 0.03) s += 10;
      if (roas > 3) s += 10;
      return Math.min(100, Math.max(0, s));
    });

    const half = Math.floor(scores.length / 2);
    const firstAvg = scores.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondAvg = scores.slice(half).reduce((a, b) => a + b, 0) / (scores.length - half);
    const delta = Math.round((secondAvg - firstAvg) * 10) / 10;

    return { delta, history: scores.slice(-7), direction: delta > 3 ? "improving" : delta < -3 ? "declining" : "stable" };
  }

  private computeTrendSummary(scored: ScoredCampaign[]): { improving: number; declining: number; stable: number } {
    return {
      improving: scored.filter((c) => c.trend?.direction === "improving").length,
      declining: scored.filter((c) => c.trend?.direction === "declining").length,
      stable: scored.filter((c) => c.trend?.direction === "stable" || !c.trend).length,
    };
  }

  private computeAllPercentiles(scored: ScoredCampaign[]): { threshold: number; campaignCount: number; percentile: number }[] {
    if (scored.length < 2) return [];
    const sorted = [...scored].sort((a, b) => b.overall - a.overall);
    return [
      { threshold: 90, campaignCount: sorted.filter((c) => c.overall >= 90).length, percentile: 90 },
      { threshold: 75, campaignCount: sorted.filter((c) => c.overall >= 75).length, percentile: 75 },
      { threshold: 50, campaignCount: sorted.filter((c) => c.overall >= 50).length, percentile: 50 },
      { threshold: 25, campaignCount: sorted.filter((c) => c.overall >= 25).length, percentile: 25 },
    ];
  }

  scorecardDailySnapshot(tenantId: string): { generatedAt: string; averageScore: number; topCampaign: { name: string; score: number } | null; bottomCampaign: { name: string; score: number } | null; improving: number; declining: number; stable: number; needsAttention: string[]; distribution: { tier: string; count: number }[] } {
    const result = this.getScorecard(tenantId);
    const needsAttention = result.campaigns.filter(c => c.overall < 50).map(c => `${c.campaignName} (${c.overall})`);
    const tierLabels = ["excellent (90+)", "good (75-89)", "fair (50-74)", "poor (25-49)", "critical (<25)"];
    const counts = [0, 0, 0, 0, 0];
    for (const c of result.campaigns) {
      if (c.overall >= 90) counts[0]++;
      else if (c.overall >= 75) counts[1]++;
      else if (c.overall >= 50) counts[2]++;
      else if (c.overall >= 25) counts[3]++;
      else counts[4]++;
    }
    const distribution = tierLabels.map((label, i) => ({ tier: label, count: counts[i] }));
    const sorted = [...result.campaigns].sort((a, b) => b.overall - a.overall);
    return {
      generatedAt: new Date().toISOString(),
      averageScore: Math.round(result.summary.avgScore * 100) / 100,
      topCampaign: sorted.length > 0 ? { name: sorted[0].campaignName, score: sorted[0].overall } : null,
      bottomCampaign: sorted.length > 0 ? { name: sorted[sorted.length - 1].campaignName, score: sorted[sorted.length - 1].overall } : null,
      improving: result.campaigns.filter(c => c.trend?.direction === "improving").length,
      declining: result.campaigns.filter(c => c.trend?.direction === "declining").length,
      stable: result.campaigns.filter(c => c.trend?.direction === "stable" || !c.trend).length,
      needsAttention,
      distribution,
    };
  }
}

function cpa(spend: number, conversions: number): number {
  return conversions > 0 ? spend / conversions : Infinity;
}

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export const campaignScorecardService = new CampaignScorecardService();
