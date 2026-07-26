import { DataStore } from "./DataStore";

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
}

function cpa(spend: number, conversions: number): number {
  return conversions > 0 ? spend / conversions : Infinity;
}

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export const campaignScorecardService = new CampaignScorecardService();
