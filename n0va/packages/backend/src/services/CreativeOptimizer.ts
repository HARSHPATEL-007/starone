interface CreativePerformance {
  id: string;
  name: string;
  type: string;
  platform: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  revenue: number;
  spend: number;
  roas: number;
  firstSeen: Date;
  lastSeen: Date;
  variantGroup?: string;
}

interface FatigueAnalysis {
  creativeId: string;
  creativeName: string;
  type: string;
  currentCtr: number;
  baselineCtr: number;
  ctrDropPercent: number;
  isFatigued: boolean;
  fatigueScore: number;
  daysSinceFirstRun: number;
  totalImpressions: number;
  recommendation: "none" | "refresh_creative" | "rotate_audience" | "pause_creative" | "generate_variants";
  urgency: "low" | "medium" | "high" | "critical";
}

export class CreativeOptimizer {
  private readonly fatigueThreshold = 20;
  private readonly minImpressionThreshold = 5000;
  private readonly maxImpressionsBeforeFatigue = 200000;

  analyzeFatigue(creatives: CreativePerformance[]): FatigueAnalysis[] {
    return creatives.map((c) => this.analyzeSingleCreative(c));
  }

  private analyzeSingleCreative(c: CreativePerformance): FatigueAnalysis {
    const daysSinceFirstRun = Math.max(1, (Date.now() - c.firstSeen.getTime()) / 86400000);
    const baselineCtr = this.estimateBaselineCtr(c);
    const ctrDrop = baselineCtr > 0 ? ((baselineCtr - c.ctr) / baselineCtr) * 100 : 0;
    const impressionRatio = Math.min(1, c.impressions / this.maxImpressionsBeforeFatigue);

    let fatigueScore = 0;
    fatigueScore += Math.max(0, ctrDrop) * 0.4;
    fatigueScore += impressionRatio * 25;
    fatigueScore += Math.min(20, daysSinceFirstRun * 2);
    fatigueScore += c.ctr < 0.5 ? 20 : c.ctr < 1.0 ? 10 : 0;

    const isFatigued = ctrDrop > this.fatigueThreshold || fatigueScore > 50;
    const recommendation = this.getRecommendation(isFatigued, ctrDrop, fatigueScore, c.impressions);
    const urgency = fatigueScore > 80 ? "critical" : fatigueScore > 60 ? "high" : fatigueScore > 40 ? "medium" : "low";

    return {
      creativeId: c.id,
      creativeName: c.name,
      type: c.type,
      currentCtr: parseFloat(c.ctr.toFixed(2)),
      baselineCtr: parseFloat(baselineCtr.toFixed(2)),
      ctrDropPercent: parseFloat(ctrDrop.toFixed(1)),
      isFatigued,
      fatigueScore: parseFloat(fatigueScore.toFixed(1)),
      daysSinceFirstRun: Math.round(daysSinceFirstRun),
      totalImpressions: c.impressions,
      recommendation,
      urgency,
    };
  }

  private estimateBaselineCtr(c: CreativePerformance): number {
    const typeBaselines: Record<string, number> = {
      image: 2.5,
      video: 3.0,
      carousel: 2.8,
      text: 1.5,
    };

    const platformBaselines: Record<string, number> = {
      meta: 2.0,
      google: 2.5,
      linkedin: 1.2,
      tiktok: 3.5,
      snapchat: 2.0,
      twitter: 1.5,
    };

    const typeBaseline = typeBaselines[c.type] || 2.0;
    const platformBaseline = platformBaselines[c.platform] || 2.0;
    const blended = (typeBaseline + platformBaseline) / 2;

    if (c.impressions < this.minImpressionThreshold) return blended;
    return c.ctr + c.ctr * 0.15;
  }

  private getRecommendation(
    isFatigued: boolean,
    ctrDrop: number,
    fatigueScore: number,
    impressions: number
  ): FatigueAnalysis["recommendation"] {
    if (!isFatigued) return "none";
    if (ctrDrop > 40 || fatigueScore > 80) return "pause_creative";
    if (impressions > this.maxImpressionsBeforeFatigue) return "refresh_creative";
    if (ctrDrop > 25) return "generate_variants";
    return "rotate_audience";
  }

  // ─── Exponential Decay Curve Fitting ────────────────────────────────

  /**
   * Fit an exponential decay model to CTR-over-time data for a creative.
   * Model: CTR(t) = a * exp(-lambda * t) + c
   * Where:
   *   a = initial CTR above floor
   *   lambda = decay rate (higher = faster fatigue)
   *   c = asymptotic floor CTR
   */
  fitDecayCurve(dataPoints: { day: number; ctr: number }[]): {
    a: number; lambda: number; c: number; halflife: number; rSquared: number;
  } {
    const n = dataPoints.length;
    if (n < 3) throw new Error("Need at least 3 data points to fit decay curve");

    // Initial guess: c = min(ctr), a = max(ctr) - c, lambda = 0.05
    const ctrValues = dataPoints.map((d) => d.ctr);
    const c0 = Math.min(...ctrValues);
    const a0 = Math.max(...ctrValues) - c0;
    const lambda0 = 0.05;

    // Gradient descent to minimize sum of squared errors
    let a = a0, lambda = lambda0, c = c0;
    const lr = 0.001;
    const epochs = 500;
    const eps = 1e-8;

    for (let epoch = 0; epoch < epochs; epoch++) {
      let da = 0, dlambda = 0, dc = 0;
      for (const dp of dataPoints) {
        const t = dp.day;
        const expTerm = Math.exp(-lambda * t);
        const pred = a * expTerm + c;
        const error = pred - dp.ctr;
        const clipExp = Math.max(eps, expTerm);
        da += error * clipExp;
        dlambda += error * a * (-t) * clipExp;
        dc += error;
      }
      a -= lr * (da / n);
      lambda -= lr * (dlambda / n);
      c -= lr * (dc / n);
      if (a < eps) a = eps;
      if (lambda < eps) lambda = eps;
      if (c < eps) c = eps;
    }

    // Half-life: time for a*exp(-lambda*t) to drop by 50%
    const halflife = lambda > 0 ? Math.log(2) / lambda : Infinity;

    // R-squared
    const meanCtr = ctrValues.reduce((s, v) => s + v, 0) / n;
    let ssRes = 0, ssTot = 0;
    for (const dp of dataPoints) {
      const pred = a * Math.exp(-lambda * dp.day) + c;
      ssRes += (dp.ctr - pred) ** 2;
      ssTot += (dp.ctr - meanCtr) ** 2;
    }
    const rSquared = ssTot > eps ? 1 - ssRes / ssTot : 1;

    return {
      a: Math.round(a * 1000) / 1000,
      lambda: Math.round(lambda * 1000) / 1000,
      c: Math.round(c * 1000) / 1000,
      halflife: Math.round(halflife * 10) / 10,
      rSquared: Math.round(rSquared * 1000) / 1000,
    };
  }

  /**
   * Recommend optimal rotation day using the decay model.
   * The optimal rotation point is when CTR drops below a threshold
   * of the initial (baseline - floor) range, or at the half-life.
   */
  optimalRotationDay(
    decayParams: { a: number; lambda: number; c: number; halflife: number },
    threshold = 0.5,
  ): { day: number; ctr: number; method: "halflife" | "threshold" } {
    // Method 1: half-life
    if (decayParams.halflife < Infinity) {
      const ctrAtHalflife = decayParams.a * Math.exp(-decayParams.lambda * decayParams.halflife) + decayParams.c;
      return { day: Math.round(decayParams.halflife), ctr: Math.round(ctrAtHalflife * 100) / 100, method: "halflife" };
    }

    // Method 2: threshold-based (find day where CTR drops to threshold * a + c)
    const targetCtr = threshold * decayParams.a + decayParams.c;
    const day = decayParams.lambda > 0
      ? -Math.log((targetCtr - decayParams.c) / Math.max(decayParams.a, 0.001)) / decayParams.lambda
      : Infinity;
    return {
      day: Math.round(Math.min(day, 365)),
      ctr: Math.round(targetCtr * 100) / 100,
      method: "threshold",
    };
  }

  // ─── Cross-Platform Fatigue Correlation ─────────────────────────────

  /**
   * Compute Pearson correlation of CTR trends across platforms for the same variant group.
   * High correlation suggests fatigue is content-driven (not platform-driven).
   */
  crossPlatformFatigueCorrelation(creatives: CreativePerformance[]): {
    platformPairs: { p1: string; p2: string; correlation: number; sharedVariant: string }[];
    insight: string;
  } {
    const grouped = new Map<string, Map<string, number[]>>();
    for (const c of creatives) {
      const vg = c.variantGroup || "default";
      if (!grouped.has(vg)) grouped.set(vg, new Map());
      grouped.get(vg)!.set(c.platform, [...(grouped.get(vg)!.get(c.platform) || []), c.ctr]);
    }

    const platformPairs: { p1: string; p2: string; correlation: number; sharedVariant: string }[] = [];
    for (const [vg, platformData] of grouped) {
      const platforms = Array.from(platformData.keys());
      for (let i = 0; i < platforms.length; i++) {
        for (let j = i + 1; j < platforms.length; j++) {
          const p1 = platforms[i], p2 = platforms[j];
          const vals1 = platformData.get(p1)!, vals2 = platformData.get(p2)!;
          const minLen = Math.min(vals1.length, vals2.length);
          if (minLen < 3) continue;
          const corr = this.pearson(vals1.slice(0, minLen), vals2.slice(0, minLen));
          platformPairs.push({ p1, p2, correlation: Math.round(corr * 100) / 100, sharedVariant: vg });
        }
      }
    }

    const avgCorr = platformPairs.length > 0
      ? Math.round(platformPairs.reduce((s, p) => s + p.correlation, 0) / platformPairs.length * 100) / 100
      : 0;
    const insight = avgCorr > 0.6
      ? `Fatigue is content-driven (avg cross-platform correlation: ${avgCorr}). Refreshing creative copy will benefit all platforms simultaneously.`
      : avgCorr < 0.2
        ? `Fatigue is platform-driven (avg cross-platform correlation: ${avgCorr}). Optimize per-platform delivery settings rather than creative copy.`
        : `Moderate cross-platform correlation (${avgCorr}). A mixed strategy of creative refresh + platform optimization is recommended.`;

    return { platformPairs, insight };
  }

  // ─── Multi-Variant A/B Significance ─────────────────────────────────

  /**
   * Chi-squared test for 2x2 contingency table comparing two creative variants.
   * Returns whether variant B is significantly better than variant A.
   */
  abTestSignificance(
    variantA: { impressions: number; clicks: number },
    variantB: { impressions: number; clicks: number },
    alpha = 0.05,
  ): {
    chiSquared: number; pValue: number; isSignificant: boolean;
    winner: "A" | "B" | "none"; lift: number; confidence: number;
  } {
    const aClick = variantA.clicks, aTotal = variantA.impressions;
    const bClick = variantB.clicks, bTotal = variantB.impressions;
    const aNoClick = aTotal - aClick;
    const bNoClick = bTotal - bClick;
    const total = aTotal + bTotal;
    const totalClick = aClick + bClick;
    const totalNoClick = aNoClick + bNoClick;

    if (total === 0 || totalClick === 0 || totalNoClick === 0) {
      return { chiSquared: 0, pValue: 1, isSignificant: false, winner: "none", lift: 0, confidence: 0 };
    }

    // Expected values under null
    const eAClick = (aTotal * totalClick) / total;
    const eANoClick = (aTotal * totalNoClick) / total;
    const eBClick = (bTotal * totalClick) / total;
    const eBNoClick = (bTotal * totalNoClick) / total;

    const chiSq =
      ((aClick - eAClick) ** 2) / Math.max(eAClick, 0.001) +
      ((aNoClick - eANoClick) ** 2) / Math.max(eANoClick, 0.001) +
      ((bClick - eBClick) ** 2) / Math.max(eBClick, 0.001) +
      ((bNoClick - eBNoClick) ** 2) / Math.max(eBNoClick, 0.001);

    // Chi-squared CDF with 1 degree of freedom using regularized gamma
    const pValue = 1 - this.regularizedGamma(0.5, chiSq / 2);
    const ctrA = aTotal > 0 ? aClick / aTotal : 0;
    const ctrB = bTotal > 0 ? bClick / bTotal : 0;
    const lift = ctrA > 0 ? (ctrB - ctrA) / ctrA : 0;
    const confidence = 1 - pValue;

    return {
      chiSquared: Math.round(chiSq * 100) / 100,
      pValue: Math.round(pValue * 100) / 100,
      isSignificant: pValue < alpha,
      winner: pValue < alpha ? (ctrB > ctrA ? "B" : "A") : "none",
      lift: Math.round(lift * 10000) / 100,
      confidence: Math.round(confidence * 10000) / 100,
    };
  }

  // ─── Performance Projection ─────────────────────────────────────────

  /**
   * Project future performance of a creative based on decay model.
   */
  projectPerformance(
    creative: CreativePerformance,
    futureDays: number[],
  ): { day: number; predictedCtr: number; predictedClicks: number; predictedConversions: number }[] {
    const daysSinceFirstRun = Math.max(1, (Date.now() - creative.firstSeen.getTime()) / 86400000);
    const syntheticData = [
      { day: 1, ctr: creative.ctr * 1.15 },
      { day: Math.round(daysSinceFirstRun / 3), ctr: creative.ctr * 1.08 },
      { day: Math.round(daysSinceFirstRun / 2), ctr: creative.ctr * 1.03 },
      { day: Math.round(daysSinceFirstRun), ctr: creative.ctr },
    ];

    try {
      const decay = this.fitDecayCurve(syntheticData);
      return futureDays.map((day) => {
        const predictedCtr = decay.a * Math.exp(-decay.lambda * day) + decay.c;
        const predictedClicks = Math.round(creative.impressions * predictedCtr / 100);
        const predictedConversions = Math.round(predictedClicks * (creative.conversions / Math.max(creative.clicks, 1)));
        return {
          day,
          predictedCtr: Math.round(predictedCtr * 100) / 100,
          predictedClicks,
          predictedConversions,
        };
      });
    } catch {
      return futureDays.map((day) => ({
        day,
        predictedCtr: Math.round(creative.ctr * Math.exp(-0.01 * day) * 100) / 100,
        predictedClicks: Math.round(creative.clicks * Math.exp(-0.01 * day)),
        predictedConversions: Math.round(creative.conversions * Math.exp(-0.01 * day)),
      }));
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private pearson(x: number[], y: number[]): number {
    const n = x.length;
    const mx = x.reduce((s, v) => s + v, 0) / n;
    const my = y.reduce((s, v) => s + v, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - mx, dy = y[i] - my;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    const den = Math.sqrt(denX * denY);
    return den > 0 ? num / den : 0;
  }

  private regularizedGamma(a: number, x: number): number {
    // Series expansion for lower regularized gamma P(a, x)
    if (x <= 0) return 0;
    let sum = 1 / a;
    let term = 1 / a;
    for (let k = 1; k < 100; k++) {
      term *= x / (a + k);
      sum += term;
      if (Math.abs(term) < 1e-10) break;
    }
    const logGamma = a > 0 ? (a - 0.5) * Math.log(a) - a + 0.918938533 + 0.0833333 / a - 0.0027778 / (a * a * a) : 0;
    const gammaA = Math.exp(logGamma);
    const val = Math.exp(-x) * Math.pow(x, a) * sum / gammaA;
    return Math.max(0, Math.min(1, val));
  }

  generateMockCreatives(): CreativePerformance[] {
    const now = Date.now();
    const day = 86400000;
    return [
      { id: "cr_1", name: "Enterprise Hero Image", type: "image", platform: "meta", impressions: 145000, clicks: 4200, ctr: 2.9, conversions: 45, revenue: 125000, spend: 15000, roas: 8.33, firstSeen: new Date(now - 45 * day), lastSeen: new Date(), variantGroup: "enterprise_v1" },
      { id: "cr_2", name: "Product Demo Video 30s", type: "video", platform: "google", impressions: 89000, clicks: 3100, ctr: 3.48, conversions: 23, revenue: 52000, spend: 8900, roas: 5.84, firstSeen: new Date(now - 30 * day), lastSeen: new Date(), variantGroup: "demo_v1" },
      { id: "cr_3", name: "Customer Success Carousel", type: "carousel", platform: "linkedin", impressions: 67000, clicks: 1900, ctr: 2.84, conversions: 12, revenue: 34000, spend: 6700, roas: 5.07, firstSeen: new Date(now - 60 * day), lastSeen: new Date(), variantGroup: "social_proof_v1" },
      { id: "cr_4", name: "Black Friday Offer", type: "image", platform: "meta", impressions: 12000, clicks: 180, ctr: 1.5, conversions: 2, revenue: 2000, spend: 3500, roas: 0.57, firstSeen: new Date(now - 5 * day), lastSeen: new Date(), variantGroup: "holiday_v1" },
      { id: "cr_5", name: "Whitepaper Download", type: "text", platform: "linkedin", impressions: 34000, clicks: 280, ctr: 0.82, conversions: 34, revenue: 85000, spend: 3400, roas: 25.0, firstSeen: new Date(now - 20 * day), lastSeen: new Date(), variantGroup: "whitepaper_v1" },
      { id: "cr_6", name: "Summer Sale Banner", type: "image", platform: "google", impressions: 98000, clicks: 980, ctr: 1.0, conversions: 8, revenue: 12000, spend: 4900, roas: 2.45, firstSeen: new Date(now - 50 * day), lastSeen: new Date(), variantGroup: "summer_v1" },
    ];
  }
}

export const creativeOptimizer = new CreativeOptimizer();
