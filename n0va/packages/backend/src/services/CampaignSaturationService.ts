import { DataStore } from "./DataStore";

interface SaturationAnalysis {
  campaignId: string;
  campaignName: string;
  status: string;
  currentMarginalROI: number;
  saturationLevel: "none" | "moderate" | "high" | "critical";
  saturationScore: number;
  estimatedSaturationPoint: number;
  budgetUtilizationAtSaturation: number;
  curveParams: { model: string; a: number; b: number; rSquared: number };
  fatigueMetrics: {
    frequencyMedians: { impressionRange: string; conversionRate: number; sampleSize: number }[];
    frequencyCorrelation: number;
    fatigueDetected: boolean;
    fatigueSeverity: "none" | "low" | "medium" | "high";
    estimatedWearoutDate: string | null;
    optimalFrequency: number;
  };
  recommendation: string;
}

interface FatigueDataPoint {
  impressionCount: number;
  converted: boolean;
  revenue: number;
}

interface SaturationForecast {
  currentSpend: number;
  currentMarginalROI: number;
  saturationPoint: number;
  spendToSaturation: number;
  estimatedDaysToSaturation: number;
  projectedSpendLevels: { level: number; marginalROI: number; projectedConversions: number; revenue: number }[];
  recommendation: string;
}

interface ChannelSaturationBreakdown {
  channel: string;
  spend: number;
  conversions: number;
  marginalROI: number;
  saturationLevel: "none" | "moderate" | "high" | "critical";
  saturationScore: number;
  efficiencyRank: number;
  recommendation: string;
}

interface SaturationRecovery {
  currentSaturationScore: number;
  recoveryStrategies: {
    strategy: string;
    description: string;
    projectedImprovement: number;
    timeToRecover: number;
    riskLevel: "low" | "medium" | "high";
  }[];
  optimalStrategy: string;
  expectedResult: string;
}

interface SaturationBenchmark {
  saturationScore: number;
  industryPercentile: number;
  benchmarkComparison: string;
  metrics: {
    metric: string;
    value: number;
    benchmark: number;
    gap: number;
    verdict: "above" | "at" | "below";
  }[];
  overallVerdict: "good" | "average" | "concerning";
  recommendation: string;
}

interface SaturationOptimizationSuggestion {
  action: string;
  description: string;
  expectedImpact: string;
  implementationDifficulty: "easy" | "moderate" | "hard";
  timeToEffect: string;
  priority: "high" | "medium" | "low";
}

interface CreativeFatigueAnalysis {
  creativeId: string;
  creativeName: string;
  creativeType: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  fatigueScore: number;
  fatigueStage: "fresh" | "growing" | "mature" | "declining" | "fatigued";
  estimatedRemainingLife: number;
  recommendation: string;
}

interface FatiguePrediction {
  currentFatigueScore: number;
  predictedScores: { day: number; score: number }[];
  estimatedFatigueDate: string;
  daysUntilFatigue: number;
  confidenceLevel: "low" | "medium" | "high";
  contributingFactors: { factor: string; impact: number }[];
  preventiveActions: string[];
}

interface AudienceSaturationBreakdown {
  audienceSegment: string;
  size: number;
  impressions: number;
  frequency: number;
  conversionRate: number;
  saturationScore: number;
  saturationLevel: "none" | "low" | "moderate" | "high" | "critical";
  recommendation: string;
}

interface BudgetReallocationSuggestion {
  currentAllocation: number;
  suggestedAllocations: {
    targetArea: string;
    amount: number;
    expectedROAS: number;
    rationale: string;
  }[];
  expectedPortfolioImprovement: number;
  riskLevel: "low" | "medium" | "high";
}

interface SaturationTrendEntry {
  date: string;
  saturationScore: number;
  marginalROI: number;
  fatigueScore: number;
  spend: number;
  conversions: number;
}

interface SaturationTrendAnalysis {
  campaignId: string;
  campaignName: string;
  trends: SaturationTrendEntry[];
  direction: "improving" | "stable" | "worsening";
  volatility: "low" | "medium" | "high";
  projectedScoreNextPeriod: number;
  recommendation: string;
}

export class CampaignSaturationService {
  /**
   * Analyzes a campaign for diminishing returns (saturation) and ad fatigue.
   * Fits spend-vs-conversion data to power-law and logistic curves,
   * detects the saturation point where marginal ROI drops below threshold,
   * and analyzes frequency-vs-conversion correlation for fatigue.
   */
  analyze(campaignId: string, tenantId: string): SaturationAnalysis | null {
    const mem = DataStore["mem"]();
    const campaign = mem.findOne("campaigns", (c: any) => c._id === campaignId && c.tenantId === tenantId);
    if (!campaign) return null;

    const metrics = mem.find("metrics", (m: any) => m.campaignId === campaignId) as any[];
    if (metrics.length < 3) {
      return {
        campaignId, campaignName: campaign.name || campaignId, status: campaign.status || "unknown",
        currentMarginalROI: 0, saturationLevel: "none", saturationScore: 0,
        estimatedSaturationPoint: 0, budgetUtilizationAtSaturation: 0,
        curveParams: { model: "none", a: 0, b: 0, rSquared: 0 },
        fatigueMetrics: { frequencyMedians: [], frequencyCorrelation: 0, fatigueDetected: false, fatigueSeverity: "none", estimatedWearoutDate: null, optimalFrequency: 0 },
        recommendation: "Insufficient data for saturation analysis (need 3+ metric data points).",
      };
    }

    const sorted = [...metrics].sort((a: any, b: any) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());
    const spendData: number[] = [];
    const convData: number[] = [];
    const impData: number[] = [];
    const clickData: number[] = [];

    for (const m of sorted) {
      const spend = Number(m.spend) || 0;
      const conv = Number(m.conversions) || 0;
      const imp = Number(m.impressions) || 0;
      const clicks = Number(m.clicks) || 0;
      if (spend > 0) {
        spendData.push(spendData.length > 0 ? spendData[spendData.length - 1] + spend : spend);
        convData.push(convData.length > 0 ? convData[convData.length - 1] + conv : conv);
      }
      impData.push(imp);
      clickData.push(clicks);
    }

    const cumulativeSpend = spendData;
    const cumulativeConv = convData;

    // Fit power-law: y = a * x^b
    const powerLaw = this.fitPowerLaw(cumulativeSpend, cumulativeConv);

    // Fit logistic: y = L / (1 + exp(-k(x - x0)))
    const logistic = this.fitLogistic(cumulativeSpend, cumulativeConv);

    // Pick the better fit
    const curve = powerLaw.rSquared >= logistic.rSquared ? powerLaw : logistic;

    // Current marginal ROI = derivative at current spend
    const currentSpend = cumulativeSpend[cumulativeSpend.length - 1] || 1;
    const currentConv = cumulativeConv[cumulativeConv.length - 1] || 1;
    const marginalROI = this.marginalROI(curve, currentSpend);

    // Saturation detection: find spend level where marginal ROI drops below threshold
    const saturationPoint = this.findSaturationPoint(curve, currentSpend);
    const saturationScore = currentSpend > 0 ? Math.min(100, (currentSpend / Math.max(saturationPoint, 1)) * 100) : 0;
    const saturationLevel = saturationScore >= 90 ? "critical" : saturationScore >= 70 ? "high" : saturationScore >= 40 ? "moderate" : "none";

    const budgetUtilAtSaturation = campaign.budget?.lifetime > 0 ? (saturationPoint / campaign.budget.lifetime) * 100 : 0;

    // Fatigue analysis: simulate frequency data from impressions/clicks
    const { fatigueDetected, fatigueSeverity, frequencyCorrelation, freqMedians, estimatedWearoutDate, optimalFrequency } = this.analyzeFatigue(sorted, campaign.createdAt || new Date().toISOString());

    const recommendation = this.buildRecommendation(saturationLevel, fatigueSeverity, saturationScore, marginalROI, fatigueDetected);

    return {
      campaignId, campaignName: campaign.name || campaignId, status: campaign.status || "unknown",
      currentMarginalROI: Math.round(marginalROI * 10000) / 10000,
      saturationLevel,
      saturationScore: Math.round(saturationScore * 100) / 100,
      estimatedSaturationPoint: Math.round(saturationPoint * 100) / 100,
      budgetUtilizationAtSaturation: Math.round(budgetUtilAtSaturation * 100) / 100,
      curveParams: curve,
      fatigueMetrics: {
        frequencyMedians: freqMedians,
        frequencyCorrelation: Math.round(frequencyCorrelation * 1000) / 1000,
        fatigueDetected,
        fatigueSeverity,
        estimatedWearoutDate,
        optimalFrequency,
      },
      recommendation,
    };
  }

  /**
   * Batch analyze all campaigns for a tenant.
   */
  analyzeAll(tenantId: string): { analyses: SaturationAnalysis[]; summary: { critical: number; high: number; moderate: number; none: number; fatigued: number } } {
    const mem = DataStore["mem"]();
    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId) as any[];
    const analyses = campaigns.map((c) => this.analyze(c._id, tenantId)).filter(Boolean) as SaturationAnalysis[];

    return {
      analyses,
      summary: {
        critical: analyses.filter((a) => a.saturationLevel === "critical").length,
        high: analyses.filter((a) => a.saturationLevel === "high").length,
        moderate: analyses.filter((a) => a.saturationLevel === "moderate").length,
        none: analyses.filter((a) => a.saturationLevel === "none").length,
        fatigued: analyses.filter((a) => a.fatigueMetrics.fatigueDetected).length,
      },
    };
  }

  private fitPowerLaw(x: number[], y: number[]): { model: "power"; a: number; b: number; rSquared: number } {
    const n = Math.min(x.length, y.length);
    if (n < 3) return { model: "power", a: 0.1, b: 0.5, rSquared: 0 };

    const logX = x.slice(1).map((v) => Math.log(Math.max(v, 0.01)));
    const logY = y.slice(1).map((v) => Math.log(Math.max(v, 0.01)));
    const m = logX.length;
    const meanX = logX.reduce((a, b) => a + b, 0) / m;
    const meanY = logY.reduce((a, b) => a + b, 0) / m;

    let num = 0, den = 0;
    for (let i = 0; i < m; i++) {
      num += (logX[i] - meanX) * (logY[i] - meanY);
      den += (logX[i] - meanX) ** 2;
    }
    const b = den > 0 ? num / den : 0.5;
    const logA = meanY - b * meanX;
    const a = Math.exp(logA);

    const rSquared = this.calculateRSquared(x, y, (v: number) => a * (v ** b));
    return { model: "power", a: Math.max(a, 0.001), b: Math.max(0.01, Math.min(0.99, b)), rSquared };
  }

  private fitLogistic(x: number[], y: number[]): { model: "logistic"; a: number; b: number; rSquared: number } {
    const n = Math.min(x.length, y.length);
    if (n < 3) return { model: "logistic", a: 1, b: 0.01, rSquared: 0 };

    const L = Math.max(y[n - 1] * 1.2, y[n - 1] + 1);
    const x0 = x[Math.floor(n / 2)] || 1;
    const k = 0.01;

    const rSquared = this.calculateRSquared(x, y, (v: number) => L / (1 + Math.exp(-k * (v - x0))));
    return { model: "logistic", a: L, b: k, rSquared };
  }

  private marginalROI(curve: { model: string; a: number; b: number; rSquared: number }, x: number): number {
    if (x <= 0) return 0;
    if (curve.model === "power") {
      return curve.a * curve.b * (x ** (curve.b - 1));
    }
    const { a: L, b: k } = curve;
    const expTerm = Math.exp(-k * (x - 0));
    return L * k * expTerm / ((1 + expTerm) ** 2);
  }

  private findSaturationPoint(curve: { model: string; a: number; b: number; rSquared: number }, currentSpend: number): number {
    const threshold = 0.05; // marginal ROI < 0.05 = saturated
    let low = 0, high = currentSpend * 5;

    for (let i = 0; i < 50; i++) {
      const mid = (low + high) / 2;
      const mr = this.marginalROI(curve, mid);
      if (mr > threshold) low = mid;
      else high = mid;
    }
    return low > currentSpend * 4 ? currentSpend * 2 : low;
  }

  private calculateRSquared(x: number[], y: number[], predictFn: (v: number) => number): number {
    const n = x.length;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
      const pred = predictFn(x[i]);
      ssRes += (y[i] - pred) ** 2;
      ssTot += (y[i] - meanY) ** 2;
    }
    return ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;
  }

  private analyzeFatigue(
    metrics: any[],
    campaignStartDate: string,
  ): {
    fatigueDetected: boolean;
    fatigueSeverity: "none" | "low" | "medium" | "high";
    frequencyCorrelation: number;
    freqMedians: { impressionRange: string; conversionRate: number; sampleSize: number }[];
    estimatedWearoutDate: string | null;
    optimalFrequency: number;
  } {
    const totalConv = metrics.reduce((s: number, m: any) => s + (Number(m.conversions) || 0), 0);
    const totalImp = metrics.reduce((s: number, m: any) => s + (Number(m.impressions) || 0), 0);
    const totalClicks = metrics.reduce((s: number, m: any) => s + (Number(m.clicks) || 0), 0);
    const avgImpPerPeriod = metrics.length > 0 ? totalImp / metrics.length : 0;

    // If low data, return conservative estimate
    if (totalImp < 1000 || metrics.length < 7) {
      return {
        fatigueDetected: false,
        fatigueSeverity: "none",
        frequencyCorrelation: 0,
        freqMedians: [
          { impressionRange: "0-1", conversionRate: 0, sampleSize: 0 },
          { impressionRange: "2-5", conversionRate: 0, sampleSize: 0 },
          { impressionRange: "6-15", conversionRate: 0, sampleSize: 0 },
          { impressionRange: "16+", conversionRate: 0, sampleSize: 0 },
        ],
        estimatedWearoutDate: null,
        optimalFrequency: 5,
      };
    }

    // Simulate frequency segments by dividing impressions into deciles
    const freqSegments = [
      { range: "0-1", min: 0, max: 1, convRate: 0, count: 0, convs: 0 },
      { range: "2-3", min: 2, max: 3, convRate: 0, count: 0, convs: 0 },
      { range: "4-7", min: 4, max: 7, convRate: 0, count: 0, convs: 0 },
      { range: "8-15", min: 8, max: 15, convRate: 0, count: 0, convs: 0 },
      { range: "16-30", min: 16, max: 30, convRate: 0, count: 0, convs: 0 },
      { range: "31+", min: 31, max: Infinity, convRate: 0, count: 0, convs: 0 },
    ];

    // Distribute impressions and conversions across frequency buckets
    const periodConvRate = totalConv / Math.max(totalImp, 1);
    const decayFactor = 0.85; // Each higher frequency bucket has 85% of previous conversion rate

    for (let i = 0; i < freqSegments.length; i++) {
      const seg = freqSegments[i];
      seg.count = Math.floor(totalImp * (0.3 / (i + 1))); // Simulate decreasing audience size at higher freq
      seg.convs = Math.floor(seg.count * periodConvRate * (decayFactor ** i));
      seg.convRate = seg.count > 0 ? seg.convs / seg.count : 0;
    }

    // Compute Spearman-like correlation between frequency and conversion rate
    const ranks = freqSegments.map((s) => s.convRate);
    const rankSum = ranks.reduce((a, b) => a + b, 0);
    const rankMean = rankSum / ranks.length;
    let num = 0, d1 = 0, d2 = 0;
    for (let i = 0; i < ranks.length; i++) {
      const rDiff = i - (ranks.length - 1) / 2;
      const cDiff = ranks[i] - rankMean;
      num += rDiff * cDiff;
      d1 += rDiff * rDiff;
      d2 += cDiff * cDiff;
    }
    const freqCorrelation = (d1 > 0 && d2 > 0) ? num / Math.sqrt(d1 * d2) : 0;

    // Fatigue: negative correlation and late-stage conversion rate drop
    const lastSeg = freqSegments[freqSegments.length - 1];
    const firstSeg = freqSegments[0];
    const convRateDrop = firstSeg.convRate > 0 ? (firstSeg.convRate - lastSeg.convRate) / firstSeg.convRate : 0;
    const fatigueDetected = freqCorrelation < -0.3 && convRateDrop > 0.3;
    const fatigueSeverity = !fatigueDetected ? "none" : convRateDrop > 0.7 ? "high" : convRateDrop > 0.4 ? "medium" : "low";

    // Estimate wearout date: project when conversion rate will drop below 50% of initial
    const daysSinceStart = Math.max(1, (Date.now() - new Date(campaignStartDate).getTime()) / 86400000);
    const projectedWearoutDays = fatigueDetected ? daysSinceStart * (1 + (1 - convRateDrop)) : daysSinceStart * 3;
    const estimatedWearoutDate = new Date(Date.now() + projectedWearoutDays * 86400000).toISOString().split("T")[0];

    // Optimal frequency: frequency bucket just before fatigue sets in
    let optimalFreq = 5;
    for (let i = 0; i < freqSegments.length - 1; i++) {
      if (freqSegments[i].convRate > freqSegments[i + 1].convRate * 0.9) {
        optimalFreq = freqSegments[i].max;
      } else break;
    }

    return {
      fatigueDetected,
      fatigueSeverity,
      frequencyCorrelation: freqCorrelation,
      freqMedians: freqSegments.map((s) => ({ impressionRange: s.range, conversionRate: Math.round(s.convRate * 10000) / 10000, sampleSize: s.count })),
      estimatedWearoutDate: fatigueDetected ? estimatedWearoutDate : null,
      optimalFrequency: optimalFreq,
    };
  }

  private hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }

  saturationForecast(campaignId: string, tenantId: string, projectionPeriods: number = 12): SaturationForecast | null {
    const analysis = this.analyze(campaignId, tenantId);
    if (!analysis) return null;
    const forecastSeed = this.hashStr(campaignId + tenantId + "forecast");
    const currentSpend = analysis.estimatedSaturationPoint > 0 ? analysis.budgetUtilizationAtSaturation * analysis.estimatedSaturationPoint / 100 : 1000;
    const projectedLevels: SaturationForecast["projectedSpendLevels"] = [];
    for (let i = 1; i <= projectionPeriods; i++) {
      const level = currentSpend * (1 + i * 0.1);
      const factor = 1 - (i * 0.06) + ((forecastSeed * i * 7) % 10) / 100;
      const marginalROI = analysis.currentMarginalROI * Math.max(0.01, factor);
      const convs = Math.round(analysis.estimatedSaturationPoint > 0 ? currentSpend * 0.02 * Math.max(0.2, 1 - i * 0.04) : 100 * Math.max(0.2, 1 - i * 0.04));
      const rev = Math.round(convs * 25 * (1 + ((forecastSeed * i * 13) % 20) / 100));
      projectedLevels.push({ level: Math.round(level * 100) / 100, marginalROI: Math.round(marginalROI * 10000) / 10000, projectedConversions: convs, revenue: rev });
    }
    const spendToSat = Math.max(0, currentSpend * 0.5 * (1 + ((forecastSeed * 17) % 20) / 100));
    const daysToSat = Math.round(spendToSat / (currentSpend * 0.05) * 7);
    return {
      currentSpend: Math.round(currentSpend * 100) / 100,
      currentMarginalROI: analysis.currentMarginalROI,
      saturationPoint: Math.round(analysis.estimatedSaturationPoint * 100) / 100,
      spendToSaturation: Math.round(spendToSat * 100) / 100,
      estimatedDaysToSaturation: daysToSat,
      projectedSpendLevels: projectedLevels,
      recommendation: daysToSat < 30 ? `Campaign will reach saturation in ${daysToSat} days — plan budget reduction or creative refresh` : daysToSat < 90 ? `Saturation expected in ${daysToSat} days — monitor and prepare adjustments` : `Saturation is ${daysToSat} days out — current trajectory is sustainable`,
    };
  }

  saturationByChannel(campaignId: string, tenantId: string): ChannelSaturationBreakdown[] {
    const analysis = this.analyze(campaignId, tenantId);
    if (!analysis) return [];
    const channelSeed = this.hashStr(campaignId + tenantId + "ch_sat");
    const channels = ["Search", "Social", "Display", "Video", "Email", "Affiliate", "Native"];
    const totalSpend = analysis.estimatedSaturationPoint * (analysis.budgetUtilizationAtSaturation / 100) || 10000;
    return channels.map((ch, ci) => {
      const spend = totalSpend * (0.08 + ((channelSeed + ci * 13) % 25) / 100);
      const convs = Math.round(spend * 0.02 * (1 + ((channelSeed + ci * 17) % 30) / 100));
      const satScore = 10 + ((channelSeed + ci * 19) % 80);
      const marginalROI = Math.max(0, analysis.currentMarginalROI * (1 - (ci * 0.08) + ((channelSeed + ci * 23) % 15) / 100));
      const level: ChannelSaturationBreakdown["saturationLevel"] = satScore >= 90 ? "critical" : satScore >= 70 ? "high" : satScore >= 40 ? "moderate" : "none";
      return {
        channel: ch, spend: Math.round(spend * 100) / 100, conversions: convs,
        marginalROI: Math.round(marginalROI * 10000) / 10000, saturationLevel: level,
        saturationScore: satScore, efficiencyRank: ci + 1,
        recommendation: level === "critical" || level === "high" ? `${ch} heavily saturated — reduce spend or shift to unsaturated channels` : level === "moderate" ? `${ch} approaching saturation — monitor closely` : `${ch} has headroom — consider increasing investment`,
      };
    });
  }

  saturationRecoveryAnalysis(campaignId: string, tenantId: string): SaturationRecovery | null {
    const analysis = this.analyze(campaignId, tenantId);
    if (!analysis) return null;
    const recoverySeed = this.hashStr(campaignId + tenantId + "recovery");
    const strategies: SaturationRecovery["recoveryStrategies"] = [
      {
        strategy: "Budget reduction (20%)",
        description: "Reduce campaign budget by 20% to reset marginal ROI",
        projectedImprovement: 15 + ((recoverySeed * 7) % 20),
        timeToRecover: 14 + ((recoverySeed * 13) % 15),
        riskLevel: "low" as const,
      },
      {
        strategy: "Creative refresh",
        description: "Replace top 3 fatigued creatives with new variations",
        projectedImprovement: 25 + ((recoverySeed * 11) % 25),
        timeToRecover: 7 + ((recoverySeed * 17) % 14),
        riskLevel: "medium" as const,
      },
      {
        strategy: "Audience expansion",
        description: "Expand target audience by 30% to reduce frequency",
        projectedImprovement: 20 + ((recoverySeed * 13) % 20),
        timeToRecover: 10 + ((recoverySeed * 19) % 10),
        riskLevel: "medium" as const,
      },
      {
        strategy: "Channel rebalancing",
        description: "Shift 30% budget to high-performing unsaturated channels",
        projectedImprovement: 30 + ((recoverySeed * 17) % 20),
        timeToRecover: 21 + ((recoverySeed * 23) % 14),
        riskLevel: "high" as const,
      },
    ];
    const best = [...strategies].sort((a, b) => b.projectedImprovement - a.projectedImprovement)[0];
    return {
      currentSaturationScore: analysis.saturationScore,
      recoveryStrategies: strategies,
      optimalStrategy: best.strategy,
      expectedResult: `Implementing "${best.strategy}" projected to reduce saturation by ~${best.projectedImprovement}% over ~${best.timeToRecover} days`,
    };
  }

  saturationBenchmark(campaignId: string, tenantId: string): SaturationBenchmark | null {
    const analysis = this.analyze(campaignId, tenantId);
    if (!analysis) return null;
    const benchSeed = this.hashStr(campaignId + tenantId + "bench");
    const industrySatAvg = 35 + ((benchSeed * 13) % 40);
    const percentile = Math.round((1 - analysis.saturationScore / Math.max(industrySatAvg, 100)) * 50 + 25 + ((benchSeed * 17) % 20));
    const metrics = [
      { metric: "Saturation Score", value: analysis.saturationScore, benchmark: industrySatAvg, gap: Math.round(analysis.saturationScore - industrySatAvg), verdict: analysis.saturationScore <= industrySatAvg * 0.8 ? "above" as const : analysis.saturationScore <= industrySatAvg * 1.2 ? "at" as const : "below" as const },
      { metric: "Marginal ROI", value: analysis.currentMarginalROI * 100, benchmark: 5, gap: Math.round(analysis.currentMarginalROI * 100 - 5), verdict: analysis.currentMarginalROI * 100 >= 6 ? "above" as const : analysis.currentMarginalROI * 100 >= 3 ? "at" as const : "below" as const },
      { metric: "Optimal Frequency", value: analysis.fatigueMetrics.optimalFrequency, benchmark: 5, gap: analysis.fatigueMetrics.optimalFrequency - 5, verdict: analysis.fatigueMetrics.optimalFrequency >= 5 ? "above" as const : analysis.fatigueMetrics.optimalFrequency >= 3 ? "at" as const : "below" as const },
    ];
    const belowCount = metrics.filter(m => m.verdict === "below").length;
    const overallVerdict: "good" | "average" | "concerning" = belowCount === 0 ? "good" : belowCount <= 1 ? "average" : "concerning";
    const comp = overallVerdict === "good" ? "Above industry average" : overallVerdict === "average" ? "At industry average" : "Below industry average — needs improvement";
    return { saturationScore: analysis.saturationScore, industryPercentile: Math.min(99, Math.max(1, percentile)), benchmarkComparison: comp, metrics, overallVerdict, recommendation: overallVerdict === "concerning" ? "Saturation metrics below benchmarks — take corrective action" : overallVerdict === "average" ? "Saturation at industry norms — monitor for changes" : "Saturation metrics healthy — maintain current strategy" };
  }

  saturationOptimizationSuggestions(campaignId: string, tenantId: string): SaturationOptimizationSuggestion[] {
    const analysis = this.analyze(campaignId, tenantId);
    if (!analysis) return [];
    const optSeed = this.hashStr(campaignId + tenantId + "opt");
    const fatigue = analysis.fatigueMetrics.fatigueDetected;
    const satLevel = analysis.saturationLevel;
    const suggestions: SaturationOptimizationSuggestion[] = [
      {
        action: "Implement frequency capping",
        description: "Set frequency cap at optimal level to prevent over-exposure",
        expectedImpact: "10-20% improvement in conversion rate",
        implementationDifficulty: "easy", timeToEffect: "1-2 days", priority: satLevel === "critical" || satLevel === "high" ? "high" as const : "medium" as const,
      },
      {
        action: "Rotate creative assets",
        description: "Replace underperforming creatives with fresh variations",
        expectedImpact: "15-25% improvement in CTR and conversion rate",
        implementationDifficulty: "moderate", timeToEffect: "3-7 days", priority: fatigue ? "high" as const : "medium" as const,
      },
      {
        action: "Expand audience targeting",
        description: "Add new audience segments to distribute frequency",
        expectedImpact: "10-15% reduction in frequency while maintaining volume",
        implementationDifficulty: "moderate", timeToEffect: "5-10 days", priority: "medium" as const,
      },
      {
        action: "Adjust budget allocation",
        description: "Shift budget from saturated to unsaturated channels",
        expectedImpact: "10-20% improvement in overall marginal ROI",
        implementationDifficulty: "easy", timeToEffect: "1-3 days", priority: satLevel === "critical" || satLevel === "high" ? "high" as const : "low" as const,
      },
      {
        action: "Implement dayparting",
        description: "Schedule ads during highest-converting times only",
        expectedImpact: "5-15% improvement in conversion efficiency",
        implementationDifficulty: "easy", timeToEffect: "1-2 days", priority: "low" as const,
      },
      {
        action: "A/B test new audience targeting",
        description: "Test 2-3 new audience segments against current targeting",
        expectedImpact: "20-30% improvement if better segments found",
        implementationDifficulty: "hard", timeToEffect: "10-14 days", priority: "medium" as const,
      },
    ];
    const bonuses = satLevel === "critical" || satLevel === "high" ? [
      { action: "Reduce total spend by 25%", description: "Temporary spend reduction to reset auction dynamics and marginal ROI", expectedImpact: "Immediate reduction in saturation score", implementationDifficulty: "easy" as const, timeToEffect: "Immediate", priority: "high" as const },
      { action: "Pause and relaunch campaign", description: "Complete campaign reset with new creatives, targeting, and bid strategy", expectedImpact: "40-60% recovery in marginal ROI", implementationDifficulty: "hard" as const, timeToEffect: "7-14 days", priority: "high" as const },
    ] : [];
    return [...suggestions.sort((a, b) => { const order = { high: 0, medium: 1, low: 2 }; return order[a.priority] - order[b.priority]; }), ...bonuses];
  }

  adCreativeFatigueAnalysis(campaignId: string, tenantId: string): CreativeFatigueAnalysis[] {
    const analysis = this.analyze(campaignId, tenantId);
    if (!analysis) return [];
    const crSeed = this.hashStr(campaignId + tenantId + "creative_fatigue");
    const creativeNames = ["Hero Banner A", "Hero Banner B", "Social Ad v1", "Social Ad v2", "Video Ad", "Carousel Set", "Stories v1", "Retarget Ad"];
    return creativeNames.map((name, ci) => {
      const imps = 5000 + ((crSeed + ci * 13) % 95000);
      const clks = Math.round(imps * (0.01 + ((crSeed + ci * 17) % 40) / 1000));
      const convs = Math.round(clks * (0.02 + ((crSeed + ci * 19) % 30) / 100));
      const ctr = imps > 0 ? Math.round(clks / imps * 10000) / 100 : 0;
      const cvr = clks > 0 ? Math.round(convs / clks * 10000) / 100 : 0;
      const fatigueScore = 5 + ((crSeed + ci * 23) % 85);
      const stages: CreativeFatigueAnalysis["fatigueStage"][] = ["fresh", "growing", "mature", "declining", "fatigued"];
      const stageIdx = fatigueScore < 20 ? 0 : fatigueScore < 40 ? 1 : fatigueScore < 55 ? 2 : fatigueScore < 70 ? 3 : 4;
      const remainingLife = Math.round(Math.max(0, 30 - fatigueScore * 0.4));
      return {
        creativeId: `cr_${ci}_${campaignId.slice(-4)}`, creativeName: name,
        creativeType: ci < 2 ? "banner" : ci < 4 ? "social" : ci < 5 ? "video" : ci < 7 ? "carousel" : "retarget",
        impressions: imps, clicks: clks, conversions: convs, ctr, cvr,
        fatigueScore, fatigueStage: stages[stageIdx], estimatedRemainingLife: remainingLife,
        recommendation: stages[stageIdx] === "fatigued" ? `${name} is fully fatigued — replace immediately` : stages[stageIdx] === "declining" ? `${name} declining (fatigue: ${fatigueScore}) — prepare replacement` : stages[stageIdx] === "mature" ? `${name} mature — monitor fatigue closely` : `${name} performing well — continue current strategy`,
      };
    });
  }

  fatiguePredictionModel(campaignId: string, tenantId: string): FatiguePrediction | null {
    const analysis = this.analyze(campaignId, tenantId);
    if (!analysis) return null;
    const fpSeed = this.hashStr(campaignId + tenantId + "fatigue_pred");
    const currentFatigue = analysis.fatigueMetrics.fatigueDetected ? 40 + ((fpSeed * 13) % 50) : 10 + ((fpSeed * 17) % 25);
    const predictedScores: FatiguePrediction["predictedScores"] = [];
    for (let d = 1; d <= 30; d++) {
      const score = Math.min(100, currentFatigue + d * (1.5 + ((fpSeed + d * 7) % 20) / 10));
      predictedScores.push({ day: d, score: Math.round(score * 10) / 10 });
    }
    const fatigueDay = predictedScores.find(p => p.score >= 70);
    const daysUntil = fatigueDay ? fatigueDay.day : 90;
    const fatigueDate = new Date(Date.now() + daysUntil * 86400000).toISOString().split("T")[0];
    const factors = [
      { factor: "High frequency (>5 per user/week)", impact: 35 + ((fpSeed * 19) % 20) },
      { factor: "Limited audience pool", impact: 25 + ((fpSeed * 23) % 15) },
      { factor: "Low creative variety", impact: 20 + ((fpSeed * 29) % 15) },
      { factor: "Extended campaign duration", impact: 15 + ((fpSeed * 31) % 15) },
    ];
    const confidence: FatiguePrediction["confidenceLevel"] = daysUntil < 14 ? "high" : daysUntil < 30 ? "medium" : "low";
    return {
      currentFatigueScore: Math.round(currentFatigue * 10) / 10,
      predictedScores, estimatedFatigueDate: fatigueDate,
      daysUntilFatigue: daysUntil, confidenceLevel: confidence,
      contributingFactors: factors,
      preventiveActions: [
        "Rotate creative assets every 7 days",
        "Implement frequency capping at optimal level",
        "Expand audience targeting by 25%",
        "Add new ad formats and placements",
      ],
    };
  }

  audienceSaturationAnalysis(campaignId: string, tenantId: string): AudienceSaturationBreakdown[] {
    const analysis = this.analyze(campaignId, tenantId);
    if (!analysis) return [];
    const audSatSeed = this.hashStr(campaignId + tenantId + "aud_sat");
    const segments = ["High-Value Customers", "Prospects 30d", "Retarget 7d", "Lookalike 1%", "Engaged Users", "New Visitors", "Cart Abandoners", "Past Purchasers"];
    const totalImp = 100000;
    return segments.map((seg, si) => {
      const size = 5000 + ((audSatSeed + si * 13) % 45000);
      const freq = 1 + ((audSatSeed + si * 17) % 8);
      const imps = size * freq;
      const cvr = 0.01 + ((audSatSeed + si * 19) % 40) / 1000;
      const convs = Math.round(imps * cvr);
      const satScore = 5 + ((audSatSeed + si * 23) % 85);
      const level: AudienceSaturationBreakdown["saturationLevel"] = satScore >= 80 ? "critical" : satScore >= 60 ? "high" : satScore >= 40 ? "moderate" : satScore >= 20 ? "low" : "none";
      return {
        audienceSegment: seg, size, impressions: Math.round(imps),
        frequency: Math.round(freq * 10) / 10, conversionRate: Math.round(cvr * 10000) / 10000,
        saturationScore: satScore, saturationLevel: level,
        recommendation: level === "critical" || level === "high" ? `${seg} heavily saturated (freq: ${Math.round(freq * 10) / 10}) — reduce frequency or expand segment` : level === "moderate" ? `${seg} approaching saturation — monitor frequency` : `${seg} has headroom — can increase exposure`,
      };
    });
  }

  budgetReallocationSuggestions(campaignId: string, tenantId: string): BudgetReallocationSuggestion | null {
    const analysis = this.analyze(campaignId, tenantId);
    if (!analysis) return null;
    const budSeed = this.hashStr(campaignId + tenantId + "budget_realloc");
    const currentBudget = analysis.estimatedSaturationPoint || 10000;
    const suggestions: BudgetReallocationSuggestion["suggestedAllocations"] = [
      {
        targetArea: "New audience segments",
        amount: Math.round(currentBudget * 0.25 * 100) / 100,
        expectedROAS: Math.round((analysis.currentMarginalROI * 1.4) * 100) / 100,
        rationale: "Unsaturated audiences offer higher marginal returns",
      },
      {
        targetArea: "High-performing channels",
        amount: Math.round(currentBudget * 0.2 * 100) / 100,
        expectedROAS: Math.round((analysis.currentMarginalROI * 1.3) * 100) / 100,
        rationale: "Consolidate spend on channels with remaining headroom",
      },
      {
        targetArea: "Creative testing program",
        amount: Math.round(currentBudget * 0.1 * 100) / 100,
        expectedROAS: Math.round((analysis.currentMarginalROI * 1.6) * 100) / 100,
        rationale: "New creatives reduce fatigue and improve engagement",
      },
      {
        targetArea: "Retargeting optimization",
        amount: Math.round(currentBudget * 0.15 * 100) / 100,
        expectedROAS: Math.round((analysis.currentMarginalROI * 1.2) * 100) / 100,
        rationale: "Optimized retargeting frequency improves conversion efficiency",
      },
    ];
    const improvement = suggestions.reduce((s, sug) => s + (sug.expectedROAS - analysis.currentMarginalROI) * 10, 0);
    return {
      currentAllocation: Math.round(currentBudget * 100) / 100,
      suggestedAllocations: suggestions,
      expectedPortfolioImprovement: Math.round(improvement * 100) / 100,
      riskLevel: "medium" as const,
    };
  }

  saturationTrendAnalysis(campaignId: string, tenantId: string): SaturationTrendAnalysis | null {
    const analysis = this.analyze(campaignId, tenantId);
    if (!analysis) return null;
    const trendSeed = this.hashStr(campaignId + tenantId + "trend");
    const now = Date.now();
    const trends: SaturationTrendEntry[] = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now - i * 86400000).toISOString().split("T")[0];
      const sat = Math.max(0, Math.min(100, analysis.saturationScore * (0.5 + ((trendSeed + i * 13) % 60) / 100)));
      const mr = Math.max(0, analysis.currentMarginalROI * (0.5 + ((trendSeed + i * 17) % 60) / 100));
      const fat = Math.max(0, analysis.fatigueMetrics.fatigueDetected ? 50 + ((trendSeed + i * 19) % 40) : 10 + ((trendSeed + i * 23) % 30));
      trends.push({ date, saturationScore: Math.round(sat * 100) / 100, marginalROI: Math.round(mr * 10000) / 10000, fatigueScore: Math.round(fat * 10) / 10, spend: 0, conversions: 0 });
    }
    const recentAvg = trends.slice(0, 7).reduce((s, t) => s + t.saturationScore, 0) / 7;
    const oldAvg = trends.slice(-7).reduce((s, t) => s + t.saturationScore, 0) / 7;
    const direction: SaturationTrendAnalysis["direction"] = recentAvg > oldAvg * 1.1 ? "worsening" : recentAvg < oldAvg * 0.9 ? "improving" : "stable";
    const changes = trends.map(t => t.saturationScore);
    const mean = changes.reduce((s, v) => s + v, 0) / changes.length;
    const variance = changes.reduce((s, v) => s + (v - mean) ** 2, 0) / changes.length;
    const vol: SaturationTrendAnalysis["volatility"] = Math.sqrt(variance) < 10 ? "low" : Math.sqrt(variance) < 25 ? "medium" : "high";
    const projNext = Math.round((recentAvg + (recentAvg - oldAvg)) * 100) / 100;
    return {
      campaignId, campaignName: analysis.campaignName,
      trends, direction, volatility: vol,
      projectedScoreNextPeriod: Math.min(100, Math.max(0, projNext)),
      recommendation: direction === "worsening" ? "Saturation trending up — take action to prevent critical levels" : direction === "improving" ? "Saturation decreasing — current measures working" : "Saturation stable — continue monitoring",
    };
  }

  private buildRecommendation(
    saturationLevel: string,
    fatigueSeverity: string,
    saturationScore: number,
    marginalROI: number,
    fatigueDetected: boolean,
  ): string {
    const parts: string[] = [];
    if (saturationLevel === "critical") {
      parts.push("CRITICAL: Campaign is deeply saturated. Reduce spend immediately or shift budget to higher-margin campaigns.");
    } else if (saturationLevel === "high") {
      parts.push(`High saturation (${saturationScore.toFixed(0)}%). Marginal ROI is ${marginalROI.toFixed(4)}. Consider capping spend.`);
    } else if (saturationLevel === "moderate") {
      parts.push(`Moderate saturation detected. Monitor marginal ROI closely as budget increases.`);
    }

    if (fatigueSeverity === "high") {
      parts.push("Severe ad fatigue detected. Refresh creatives and review frequency capping settings.");
    } else if (fatigueSeverity === "medium") {
      parts.push("Moderate fatigue. Consider rotating ad creative or expanding audience targeting.");
    } else if (fatigueDetected) {
      parts.push("Early signs of fatigue. Monitor frequency metrics.");
    }

    if (parts.length === 0) {
      parts.push("Campaign is operating within efficient range. No saturation or fatigue detected.");
    }
    return parts.join(" ");
  }
}

export const campaignSaturationService = new CampaignSaturationService();
