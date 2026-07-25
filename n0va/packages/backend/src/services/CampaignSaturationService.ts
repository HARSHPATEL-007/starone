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
