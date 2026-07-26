export type FraudSeverity = "low" | "medium" | "high" | "critical";
export type FraudCategory = "ivt" | "bot" | "click_fraud" | "impression_fraud" | "viewability" | "brand_safety" | "geo_anomaly" | "frequency_anomaly" | "cusum_changepoint" | "benford_anomaly" | "poisson_anomaly" | "entropy_anomaly";

interface FraudFlag {
  id: string;
  campaignId: string;
  platform: string;
  placementId?: string;
  category: FraudCategory;
  severity: FraudSeverity;
  score: number;
  description: string;
  details: Record<string, unknown>;
  detectedAt: Date;
  autoPaused: boolean;
  resolvedAt?: Date;
}

interface PlacementRisk {
  placementId: string;
  platform: string;
  ivtScore: number;
  viewabilityScore: number;
  brandSafetyScore: number;
  overallRisk: number;
  flags: FraudFlag[];
  ensembleScore: number;
  signalBreakdown: { signal: string; score: number; weight: number }[];
}

interface FraudHealthSummary {
  totalFlags: number;
  activeFlags: number;
  autoPaused: number;
  criticalFlags: number;
  highFlags: number;
  mediumFlags: number;
  lowFlags: number;
  topCategories: { category: string; count: number }[];
  riskByPlatform: Record<string, { avgIvt: number; avgViewability: number; avgBrandSafety: number; overallRisk: number }>;
}

export class FraudDetectionService {
  private flags = new Map<string, FraudFlag[]>();
  private placements = new Map<string, PlacementRisk>();
  private clickHistory = new Map<string, number[]>();
  private spendHistory = new Map<string, number[]>();

  evaluatePlacement(
    placementId: string,
    platform: string,
    metrics: {
      ivtPercent?: number;
      viewabilityPercent?: number;
      brandSafetyScore?: number;
      botProbability?: number;
      clickVelocity?: number;
      impressionFrequency?: number;
      geoDistribution?: string[];
      spendAmounts?: number[];
      clickTimestamps?: number[];
    },
    campaignId: string = "unknown"
  ): PlacementRisk {
    const flags: FraudFlag[] = [];
    const tenantFlags = this.flags.get(campaignId) || [];
    const signals: { signal: string; score: number; weight: number }[] = [];

    // ── Original threshold checks ─────────────────────────────────────
    if (metrics.ivtPercent !== undefined && metrics.ivtPercent > 30) {
      const severity = metrics.ivtPercent > 90 ? "critical" : metrics.ivtPercent > 70 ? "high" : metrics.ivtPercent > 50 ? "medium" : "low";
      flags.push(this.makeFlag("ivt", campaignId, platform, placementId, severity, metrics.ivtPercent, `Invalid traffic detected at ${metrics.ivtPercent.toFixed(1)}%`, { ivtPercent: metrics.ivtPercent }, metrics.ivtPercent > 90));
      signals.push({ signal: "IVT", score: Math.min(100, metrics.ivtPercent), weight: 0.2 });
    }

    if (metrics.viewabilityPercent !== undefined && metrics.viewabilityPercent < 50) {
      flags.push(this.makeFlag("viewability", campaignId, platform, placementId, metrics.viewabilityPercent < 30 ? "high" : "medium", 100 - metrics.viewabilityPercent, `Low viewability: ${metrics.viewabilityPercent.toFixed(1)}%`, { viewabilityPercent: metrics.viewabilityPercent }, metrics.viewabilityPercent < 20));
      signals.push({ signal: "Viewability", score: 100 - metrics.viewabilityPercent, weight: 0.1 });
    }

    if (metrics.brandSafetyScore !== undefined && metrics.brandSafetyScore < 70) {
      const severity = metrics.brandSafetyScore < 40 ? "critical" : metrics.brandSafetyScore < 55 ? "high" : "medium";
      flags.push(this.makeFlag("brand_safety", campaignId, platform, placementId, severity, 100 - metrics.brandSafetyScore, `Brand safety risk: score ${metrics.brandSafetyScore.toFixed(0)}/100`, { brandSafetyScore: metrics.brandSafetyScore }, metrics.brandSafetyScore < 35));
      signals.push({ signal: "Brand Safety", score: 100 - metrics.brandSafetyScore, weight: 0.1 });
    }

    if (metrics.botProbability !== undefined && metrics.botProbability > 0.5) {
      const severity = metrics.botProbability > 0.8 ? "critical" : "high";
      flags.push(this.makeFlag("bot", campaignId, platform, placementId, severity, metrics.botProbability * 100, `Bot traffic detected (probability: ${(metrics.botProbability * 100).toFixed(0)}%)`, { botProbability: metrics.botProbability }, metrics.botProbability > 0.8));
      signals.push({ signal: "Bot Probability", score: metrics.botProbability * 100, weight: 0.15 });
    }

    if (metrics.clickVelocity !== undefined && metrics.clickVelocity > 20) {
      const severity = metrics.clickVelocity > 50 ? "critical" : "high";
      flags.push(this.makeFlag("click_fraud", campaignId, platform, placementId, severity, metrics.clickVelocity, `Abnormal click velocity: ${metrics.clickVelocity.toFixed(0)} clicks/minute`, { clickVelocity: metrics.clickVelocity }, metrics.clickVelocity > 50));
      signals.push({ signal: "Click Velocity", score: Math.min(100, metrics.clickVelocity * 2), weight: 0.15 });
    }

    // ── CUSUM changepoint detection for click velocity & spend ────────
    if (metrics.clickTimestamps && metrics.clickTimestamps.length >= 10) {
      const cusumResult = this.cusumChangepoint(metrics.clickTimestamps);
      if (cusumResult.detected) {
        flags.push(this.makeFlag("cusum_changepoint", campaignId, platform, placementId, cusumResult.severity, cusumResult.score, `CUSUM detected click rate shift at index ${cusumResult.changepoint}`, { changepoint: cusumResult.changepoint, meanBefore: cusumResult.meanBefore, meanAfter: cusumResult.meanAfter }, cusumResult.severity === "critical"));
        signals.push({ signal: "CUSUM Changepoint", score: cusumResult.score, weight: 0.1 });
      }
    }

    // ── Benford's law conformity test for spend amounts ────────────────
    if (metrics.spendAmounts && metrics.spendAmounts.length >= 20) {
      const benfordResult = this.benfordTest(metrics.spendAmounts);
      if (benfordResult.anomalous) {
        flags.push(this.makeFlag("benford_anomaly", campaignId, platform, placementId, benfordResult.severity, benfordResult.score, `Benford's law deviation: MAD=${benfordResult.mad.toFixed(3)}`, { mad: benfordResult.mad, leadingDigitDistribution: benfordResult.observedDistribution }, benfordResult.severity === "critical"));
        signals.push({ signal: "Benford Anomaly", score: benfordResult.score, weight: 0.1 });
      }
    }

    // ── Poisson process arrival rate anomaly ──────────────────────────
    if (metrics.clickTimestamps && metrics.clickTimestamps.length >= 10) {
      const poissonResult = this.poissonAnomaly(metrics.clickTimestamps, campaignId);
      if (poissonResult.anomalous) {
        flags.push(this.makeFlag("poisson_anomaly", campaignId, platform, placementId, poissonResult.severity, poissonResult.score, `Poisson arrival rate anomaly: λ=${poissonResult.lambda.toFixed(2)}, p=${poissonResult.pValue.toFixed(4)}`, { lambda: poissonResult.lambda, pValue: poissonResult.pValue, expectedRate: poissonResult.expectedRate }, false));
        signals.push({ signal: "Poisson Anomaly", score: poissonResult.score, weight: 0.1 });
      }
    }

    // ── Entropy-based geo-distribution analysis ───────────────────────
    if (metrics.geoDistribution && metrics.geoDistribution.length >= 5) {
      const entropyResult = this.entropyAnomaly(metrics.geoDistribution);
      if (entropyResult.anomalous) {
        flags.push(this.makeFlag("entropy_anomaly", campaignId, platform, placementId, entropyResult.severity, entropyResult.score, `Geo-distribution entropy anomaly: H=${entropyResult.entropy.toFixed(2)} vs expected ${entropyResult.expectedEntropy.toFixed(2)}`, { entropy: entropyResult.entropy, expectedEntropy: entropyResult.expectedEntropy, distribution: entropyResult.distribution }, false));
        signals.push({ signal: "Geo Entropy", score: entropyResult.score, weight: 0.1 });
      }
    }

    // ── Save flags ────────────────────────────────────────────────────
    if (flags.length > 0) {
      tenantFlags.push(...flags);
      this.flags.set(campaignId, tenantFlags);
    }

    // ── Ensemble fraud score ──────────────────────────────────────────
    const totalWeight = signals.reduce((s, x) => s + x.weight, 0);
    const ensembleScore = totalWeight > 0
      ? signals.reduce((s, x) => s + x.score * x.weight, 0) / totalWeight
      : 0;

    const ivtScore = metrics.ivtPercent || 0;
    const viewabilityScore = metrics.viewabilityPercent || 100;
    const brandSafetyScore = metrics.brandSafetyScore || 100;
    const overallRisk = Math.max(
      ivtScore, 100 - viewabilityScore, 100 - brandSafetyScore,
      (metrics.botProbability || 0) * 100,
      Math.min(100, (metrics.clickVelocity || 0) * 2),
      ensembleScore,
    );

    const risk: PlacementRisk = {
      placementId, platform, ivtScore, viewabilityScore, brandSafetyScore,
      overallRisk: Math.min(100, overallRisk),
      flags, ensembleScore: Math.round(ensembleScore * 100) / 100, signalBreakdown: signals,
    };

    this.placements.set(placementId, risk);
    return risk;
  }

  // ─── CUSUM Change-Point Detection ─────────────────────────────────--
  /**
   * Detects a shift in the mean of a time series using cumulative sum (CUSUM).
   * Returns the changepoint index, means before/after, and severity.
   */
  cusumChangepoint(data: number[]): { detected: boolean; changepoint: number; meanBefore: number; meanAfter: number; score: number; severity: FraudSeverity } {
    const n = data.length;
    if (n < 5) return { detected: false, changepoint: -1, meanBefore: 0, meanAfter: 0, score: 0, severity: "low" };

    const overallMean = data.reduce((a, b) => a + b, 0) / n;
    const cumsum = new Array(n).fill(0);
    let s = 0;
    let maxS = 0;
    let changepoint = -1;
    for (let i = 0; i < n; i++) {
      s += data[i] - overallMean;
      cumsum[i] = s;
      if (Math.abs(s) > Math.abs(maxS)) { maxS = s; changepoint = i; }
    }

    if (changepoint < 2 || changepoint >= n - 2) {
      return { detected: false, changepoint: -1, meanBefore: 0, meanAfter: 0, score: 0, severity: "low" };
    }

    const before = data.slice(0, changepoint + 1);
    const after = data.slice(changepoint + 1);
    const meanBefore = before.reduce((a, b) => a + b, 0) / before.length;
    const meanAfter = after.reduce((a, b) => a + b, 0) / after.length;
    const diff = Math.abs(meanAfter - meanBefore);
    const relativeShift = overallMean > 0 ? diff / overallMean : diff;

    const detected = relativeShift > 0.5;
    const score = Math.min(100, relativeShift * 100);
    const severity: FraudSeverity = relativeShift > 2 ? "critical" : relativeShift > 1.2 ? "high" : relativeShift > 0.5 ? "medium" : "low";

    return { detected, changepoint, meanBefore, meanAfter, score: Math.round(score * 100) / 100, severity };
  }

  // ─── Benford's Law Test ─────────────────────────────────────────────
  /**
   * Tests whether the leading digits of spend amounts follow Benford's law.
   * Uses the mean absolute deviation (MAD) from the expected distribution.
   * MAD > 0.015 indicates anomalous (non-conforming) data.
   */
  benfordTest(amounts: number[]): { anomalous: boolean; mad: number; observedDistribution: number[]; score: number; severity: FraudSeverity } {
    const benfordExpected = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];
    const leadingDigits = amounts.map((a) => {
      const s = Math.abs(a).toFixed(0);
      return parseInt(s.charAt(0), 10);
    }).filter((d) => d >= 1 && d <= 9);

    const n = leadingDigits.length;
    if (n < 20) return { anomalous: false, mad: 0, observedDistribution: benfordExpected, score: 0, severity: "low" };

    const observed = new Array(9).fill(0);
    for (const d of leadingDigits) observed[d - 1]++;

    const observedFreq = observed.map((c) => c / n);
    let mad = 0;
    for (let i = 0; i < 9; i++) mad += Math.abs(observedFreq[i] - benfordExpected[i]);
    mad /= 9;

    const anomalous = mad > 0.015;
    const score = Math.min(100, Math.round(mad * 1000));
    const severity: FraudSeverity = mad > 0.03 ? "critical" : mad > 0.025 ? "high" : mad > 0.015 ? "medium" : "low";

    return { anomalous, mad: Math.round(mad * 10000) / 10000, observedDistribution: observedFreq.map((v) => Math.round(v * 10000) / 10000), score, severity };
  }

  // ─── Poisson Process Arrival Rate Anomaly ───────────────────────────
  /**
   * Models click inter-arrival times as a Poisson process.
   * Flags if the observed rate deviates significantly from the historical baseline.
   */
  poissonAnomaly(timestamps: number[], campaignId: string): { anomalous: boolean; lambda: number; expectedRate: number; pValue: number; score: number; severity: FraudSeverity } {
    if (timestamps.length < 5) return { anomalous: false, lambda: 0, expectedRate: 0, pValue: 1, score: 0, severity: "low" };

    const sorted = [...timestamps].sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] > sorted[i - 1]) intervals.push(sorted[i] - sorted[i - 1]);
    }
    if (intervals.length < 4) return { anomalous: false, lambda: 0, expectedRate: 0, pValue: 1, score: 0, severity: "low" };

    const lambda = intervals.length / intervals.reduce((a, b) => a + b, 0);

    const key = `${campaignId}_${this.clickHistory.size}`;
    const history = this.clickHistory.get(key) || [];
    history.push(...intervals);
    const recentHistory = history.slice(-100);
    this.clickHistory.set(key, recentHistory);

    const expectedRate = recentHistory.length > 0
      ? recentHistory.length / recentHistory.reduce((a, b) => a + b, 0)
      : lambda;

    const rateRatio = expectedRate > 0 ? lambda / expectedRate : 1;
    const pValue = Math.exp(-Math.abs(rateRatio - 1) * 10);
    const anomalous = pValue < 0.05 && Math.abs(rateRatio - 1) > 0.5;
    const score = Math.min(100, Math.round(Math.abs(rateRatio - 1) * 100));
    const severity: FraudSeverity = Math.abs(rateRatio - 1) > 2 ? "critical" : Math.abs(rateRatio - 1) > 1 ? "high" : Math.abs(rateRatio - 1) > 0.5 ? "medium" : "low";

    return { anomalous, lambda: Math.round(lambda * 10000) / 10000, expectedRate: Math.round(expectedRate * 10000) / 10000, pValue: Math.round(pValue * 10000) / 10000, score, severity };
  }

  // ─── Entropy-based Geo-Distribution Analysis ────────────────────────
  /**
   * Computes the Shannon entropy of the geo distribution.
   * Low entropy (too concentrated) or high entropy (too uniform) can indicate fraud.
   */
  entropyAnomaly(geoDistribution: string[]): { anomalous: boolean; entropy: number; expectedEntropy: number; distribution: Record<string, number>; score: number; severity: FraudSeverity } {
    const n = geoDistribution.length;
    if (n < 5) return { anomalous: false, entropy: 0, expectedEntropy: 0, distribution: {}, score: 0, severity: "low" };

    const counts: Record<string, number> = {};
    for (const g of geoDistribution) counts[g] = (counts[g] || 0) + 1;

    const probs = Object.values(counts).map((c) => c / n);
    const entropy = -probs.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);

    const k = Object.keys(counts).length;
    const maxEntropy = k > 1 ? Math.log2(k) : 1;
    const expectedEntropy = maxEntropy * 0.7;
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

    // Too concentrated (low entropy) or too uniform (high entropy) both suspicious
    const anomalous = normalizedEntropy < 0.3 || normalizedEntropy > 0.95;
    const deviation = Math.abs(normalizedEntropy - 0.7);
    const score = Math.min(100, Math.round(deviation * 150));
    const severity: FraudSeverity = deviation > 0.5 ? "critical" : deviation > 0.3 ? "high" : deviation > 0.15 ? "medium" : "low";

    return {
      anomalous, entropy: Math.round(entropy * 100) / 100,
      expectedEntropy: Math.round(expectedEntropy * 100) / 100,
      distribution: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Math.round(v / n * 10000) / 100])),
      score, severity,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  private makeFlag(category: FraudCategory, campaignId: string, platform: string, placementId: string | undefined, severity: FraudSeverity, score: number, description: string, details: Record<string, unknown>, autoPaused: boolean): FraudFlag {
    return {
      id: `flag_${category}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      campaignId, platform, placementId, category, severity, score,
      description, details, detectedAt: new Date(), autoPaused,
    };
  }

  getPlacementRisk(placementId: string): PlacementRisk | undefined {
    return this.placements.get(placementId);
  }

  getCampaignFlags(campaignId: string): FraudFlag[] {
    return this.flags.get(campaignId) || [];
  }

  resolveFlag(flagId: string): boolean {
    for (const [, f] of this.flags) {
      const flag = f.find((fl) => fl.id === flagId);
      if (flag) { flag.resolvedAt = new Date(); return true; }
    }
    return false;
  }

  getHealthSummary(): FraudHealthSummary {
    let totalFlags = 0, activeFlags = 0, autoPaused = 0, critical = 0, high = 0, medium = 0, low = 0;
    const categoryCount: Record<string, number> = {};
    const platformRisk: Record<string, { ivt: number[]; viewability: number[]; brandSafety: number[] }> = {};

    for (const [, f] of this.flags) {
      for (const flag of f) {
        totalFlags++;
        if (!flag.resolvedAt) activeFlags++;
        if (flag.autoPaused) autoPaused++;
        if (flag.severity === "critical") critical++;
        else if (flag.severity === "high") high++;
        else if (flag.severity === "medium") medium++;
        else low++;
        categoryCount[flag.category] = (categoryCount[flag.category] || 0) + 1;
      }
    }

    for (const [, placement] of this.placements) {
      if (!platformRisk[placement.platform]) {
        platformRisk[placement.platform] = { ivt: [], viewability: [], brandSafety: [] };
      }
      platformRisk[placement.platform].ivt.push(placement.ivtScore);
      platformRisk[placement.platform].viewability.push(placement.viewabilityScore);
      platformRisk[placement.platform].brandSafety.push(placement.brandSafetyScore);
    }

    const riskByPlatform: Record<string, { avgIvt: number; avgViewability: number; avgBrandSafety: number; overallRisk: number }> = {};
    for (const [p, risks] of Object.entries(platformRisk)) {
      const avgIvt = risks.ivt.reduce((s, v) => s + v, 0) / Math.max(1, risks.ivt.length);
      const avgView = risks.viewability.reduce((s, v) => s + v, 0) / Math.max(1, risks.viewability.length);
      const avgBs = risks.brandSafety.reduce((s, v) => s + v, 0) / Math.max(1, risks.brandSafety.length);
      riskByPlatform[p] = { avgIvt, avgViewability: avgView, avgBrandSafety: avgBs, overallRisk: Math.max(avgIvt, 100 - avgView, 100 - avgBs) };
    }

    return {
      totalFlags, activeFlags, autoPaused,
      criticalFlags: critical, highFlags: high, mediumFlags: medium, lowFlags: low,
      topCategories: Object.entries(categoryCount).sort(([, a], [, b]) => b - a).slice(0, 5).map(([category, count]) => ({ category, count })),
      riskByPlatform,
    };
  }

  generateSampleAlert(campaignId: string = "camp_001"): FraudFlag {
    const flag: FraudFlag = {
      id: `flag_sample_${Date.now()}`,
      campaignId,
      platform: ["meta", "google", "linkedin", "tiktok"][Math.floor(Math.random() * 4)],
      placementId: `pl_${Math.random().toString(36).substr(2, 8)}`,
      category: ["ivt", "bot", "viewability", "brand_safety", "cusum_changepoint", "benford_anomaly"][Math.floor(Math.random() * 6)] as FraudCategory,
      severity: ["low", "medium", "high", "critical"][Math.floor(Math.random() * 4)] as FraudSeverity,
      score: Math.floor(Math.random() * 100),
      description: "Sample fraud alert for testing",
      details: {},
      detectedAt: new Date(),
      autoPaused: Math.random() > 0.7,
    };
    const tenantFlags = this.flags.get(campaignId) || [];
    tenantFlags.push(flag);
    this.flags.set(campaignId, tenantFlags);
    return flag;
  }
}

export const fraudDetectionService = new FraudDetectionService();
