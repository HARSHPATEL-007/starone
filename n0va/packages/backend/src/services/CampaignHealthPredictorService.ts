export interface CampaignMetric {
  day: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
}

export interface RiskFactor {
  name: string;
  severity: "low" | "medium" | "high" | "critical";
  impact: number;
  description: string;
  recommendation: string;
}

export interface HealthScore {
  overall: number;
  category: "excellent" | "good" | "fair" | "poor" | "critical";
  components: {
    efficiency: number;
    engagement: number;
    conversion: number;
    pacing: number;
    stability: number;
  };
}

export interface EarlyWarning {
  triggered: boolean;
  warnings: {
    metric: string;
    currentValue: number;
    threshold: number;
    severity: string;
    message: string;
  }[];
  riskScore: number;
}

export interface SurvivalCurve {
  time: number;
  survivalProbability: number;
  atRisk: number;
  failed: number;
}

export interface CampaignHealthReport {
  campaignId: string;
  currentHealth: HealthScore;
  riskFactors: RiskFactor[];
  earlyWarning: EarlyWarning;
  survivalAnalysis: {
    kaplanMeier: SurvivalCurve[];
    medianLifetime: number;
    predictedRemainingDays: number;
    hazardRate: number;
  };
  recommendations: string[];
  trend: { day: number; healthScore: number; category: string }[];
}

export class CampaignHealthPredictorService {
  computeHealthScore(metrics: CampaignMetric[]): HealthScore {
    if (metrics.length < 3) {
      return { overall: 75, category: "good", components: { efficiency: 75, engagement: 75, conversion: 75, pacing: 75, stability: 75 } };
    }

    const recent = metrics.slice(-7);
    const totalImps = recent.reduce((s, m) => s + m.impressions, 0);
    const totalClicks = recent.reduce((s, m) => s + m.clicks, 0);
    const totalConv = recent.reduce((s, m) => s + m.conversions, 0);
    const totalSpend = recent.reduce((s, m) => s + m.spend, 0);
    const totalRev = recent.reduce((s, m) => s + m.revenue, 0);

    const ctr = totalImps > 0 ? totalClicks / totalImps : 0;
    const cvr = totalClicks > 0 ? totalConv / totalClicks : 0;
    const roas = totalSpend > 0 ? totalRev / totalSpend : 0;
    const cpa = totalConv > 0 ? totalSpend / totalConv : 0;

    const efficiencyScore = Math.min(100, Math.round((Math.min(roas / 4, 1) * 50 + (cpa < 50 ? 30 : Math.max(0, 30 - cpa * 0.3)) + 20) * 100) / 100);
    const engagementScore = Math.min(100, Math.round((Math.min(ctr / 0.05, 1) * 60 + Math.min(totalImps / 10000, 1) * 40) * 100) / 100);
    const conversionScore = Math.min(100, Math.round((Math.min(cvr / 0.1, 1) * 70 + Math.min(totalConv / 50, 1) * 30) * 100) / 100);

    const dailySpends = recent.map((m) => m.spend);
    const meanSpend = dailySpends.reduce((s, v) => s + v, 0) / dailySpends.length;
    const spendVariance = dailySpends.reduce((s, v) => s + (v - meanSpend) ** 2, 0) / dailySpends.length;
    const cv = meanSpend > 0 ? Math.sqrt(spendVariance) / meanSpend : 1;
    const pacingScore = Math.min(100, Math.round(Math.max(0, (1 - Math.min(cv, 1)) * 100) * 100) / 100);

    const allCtr = metrics.map((m) => m.clicks / Math.max(1, m.impressions));
    let stabilityScore = 80;
    if (allCtr.length >= 3) {
      const recentCtr = allCtr.slice(-3);
      const ctrTrend = recentCtr[recentCtr.length - 1] - recentCtr[0];
      if (ctrTrend < -0.01) stabilityScore -= 20;
      if (ctrTrend < -0.02) stabilityScore -= 15;
      const spendImps = metrics.slice(-3).map((m) => m.impressions);
      const impsCV = this.coefficientOfVariation(spendImps);
      if (impsCV > 0.3) stabilityScore -= 15;
    }
    stabilityScore = Math.max(0, stabilityScore);

    const weights = { efficiency: 0.25, engagement: 0.2, conversion: 0.25, pacing: 0.15, stability: 0.15 };
    const overall = Math.round(
      efficiencyScore * weights.efficiency + engagementScore * weights.engagement +
      conversionScore * weights.conversion + pacingScore * weights.pacing + stabilityScore * weights.stability
    );

    const category = overall >= 85 ? "excellent" : overall >= 70 ? "good" : overall >= 50 ? "fair" : overall >= 30 ? "poor" : "critical";

    return {
      overall, category,
      components: { efficiency: Math.round(efficiencyScore), engagement: Math.round(engagementScore), conversion: Math.round(conversionScore), pacing: Math.round(pacingScore), stability: Math.round(stabilityScore) },
    };
  }

  identifyRiskFactors(metrics: CampaignMetric[]): RiskFactor[] {
    const factors: RiskFactor[] = [];
    if (metrics.length < 3) return factors;

    const recent = metrics.slice(-7);
    const allCtr = metrics.map((m) => m.clicks / Math.max(1, m.impressions));
    const ctrs = recent.map((m) => m.clicks / Math.max(1, m.impressions));
    const cpaValues = recent.map((m) => m.conversions > 0 ? m.spend / m.conversions : Infinity);

    const ctrTrend = ctrs.length >= 2 ? ctrs[ctrs.length - 1] - ctrs[0] : 0;
    if (ctrTrend < -0.02) {
      factors.push({
        name: "CTR Decline", severity: Math.abs(ctrTrend) > 0.05 ? "critical" : "high",
        impact: Math.round(Math.abs(ctrTrend) * 100),
        description: `CTR dropped by ${Math.round(Math.abs(ctrTrend) * 10000) / 100}% over recent period`,
        recommendation: "Refresh creative assets and review audience targeting. Consider A/B testing new ad copy.",
      });
    }

    const recentCpa = cpaValues.filter((v) => isFinite(v));
    const avgCpa = recentCpa.length > 0 ? recentCpa.reduce((s, v) => s + v, 0) / recentCpa.length : Infinity;
    if (isFinite(avgCpa) && avgCpa > 100) {
      factors.push({
        name: "High CPA", severity: avgCpa > 200 ? "critical" : "high",
        impact: Math.round(Math.min(100, avgCpa / 5)),
        description: `Average CPA is $${Math.round(avgCpa)} — well above typical thresholds`,
        recommendation: "Optimize bidding strategy, refine audience targeting, and improve landing page conversion rate.",
      });
    }

    const roasValues = recent.map((m) => m.spend > 0 ? m.revenue / m.spend : 0);
    const avgRoas = roasValues.length > 0 ? roasValues.reduce((s, v) => s + v, 0) / roasValues.length : 0;
    if (avgRoas < 1.5 && avgRoas > 0) {
      factors.push({
        name: "Low ROAS", severity: avgRoas < 1 ? "critical" : "high",
        impact: Math.round((1 - avgRoas / 3) * 100),
        description: `ROAS of ${Math.round(avgRoas * 100) / 100}x is below target`,
        recommendation: "Reduce spend on underperforming channels and reallocate budget to higher-ROI placements.",
      });
    }

    const spendImps = recent.map((m) => m.impressions);
    const impsCV = this.coefficientOfVariation(spendImps);
    if (impsCV > 0.4) {
      factors.push({
        name: "Impression Volatility", severity: impsCV > 0.6 ? "high" : "medium",
        impact: Math.round(Math.min(100, impsCV * 100)),
        description: `Impression volume has high variability (CV=${Math.round(impsCV * 100) / 100})`,
        recommendation: "Check delivery pacing and budget constraints. Consider dayparting adjustments.",
      });
    }

    const totalSpend = recent.reduce((s, m) => s + m.spend, 0);
    const totalRev = recent.reduce((s, m) => s + m.revenue, 0);
    if (totalSpend > 0 && totalRev < totalSpend * 0.5) {
      factors.push({
        name: "Negative ROI Trajectory", severity: "critical",
        impact: Math.round((1 - totalRev / totalSpend) * 100),
        description: `Campaign is spending $${Math.round(totalSpend)} but generating only $${Math.round(totalRev)} in revenue`,
        recommendation: "Pause campaign immediately and investigate conversion tracking, landing page, and offer.",
      });
    }

    const recentClicks = recent.map((m) => m.clicks);
    const clicksCV = this.coefficientOfVariation(recentClicks);
    if (clicksCV > 0.5 && recentClicks[recentClicks.length - 1] < recentClicks[0] * 0.5) {
      factors.push({
        name: "Click Volume Collapse", severity: "high",
        impact: Math.round((1 - recentClicks[recentClicks.length - 1] / Math.max(1, recentClicks[0])) * 100),
        description: "Click volume has dropped significantly, indicating potential audience fatigue or delivery issues",
        recommendation: "Review audience saturation, check for ad frequency caps, and explore new targeting segments.",
      });
    }

    if (factors.length === 0) {
      factors.push({
        name: "No Significant Issues", severity: "low", impact: 0,
        description: "Campaign metrics are within normal parameters",
        recommendation: "Continue monitoring and consider scaling successful strategies.",
      });
    }

    return factors.sort((a, b) => b.impact - a.impact);
  }

  computeEarlyWarning(metrics: CampaignMetric[]): EarlyWarning {
    if (metrics.length < 3) return { triggered: false, warnings: [], riskScore: 0 };

    const recent = metrics.slice(-7);
    const warnings: EarlyWarning["warnings"] = [];
    const spendImps = recent.map((m) => m.impressions);
    const spendValues = recent.map((m) => m.spend);
    const roasValues = recent.map((m) => m.spend > 0 ? m.revenue / m.spend : 0);

    const zeroImpressionDays = spendImps.filter((v) => v === 0).length;
    if (zeroImpressionDays > recent.length * 0.3) {
      warnings.push({ metric: "impressions", currentValue: 0, threshold: recent.length * 0.7, severity: "critical", message: `${zeroImpressionDays} of ${recent.length} recent days had zero impressions` });
    }

    const avgSpend = spendValues.reduce((s, v) => s + v, 0) / spendValues.length;
    const spendStd = Math.sqrt(spendValues.reduce((s, v) => s + (v - avgSpend) ** 2, 0) / spendValues.length);
    for (const v of spendValues.slice(-3)) {
      if (avgSpend > 0 && Math.abs(v - avgSpend) > 2.5 * spendStd && spendStd > 0) {
        warnings.push({ metric: "spend_anomaly", currentValue: Math.round(v), threshold: Math.round(avgSpend + 2.5 * spendStd), severity: "high", message: `Spend of $${Math.round(v)} is >2.5σ from mean of $${Math.round(avgSpend)}` });
      }
    }

    const avgRoas = roasValues.reduce((s, v) => s + v, 0) / roasValues.length;
    if (avgRoas < 1.0 && avgRoas > 0) {
      warnings.push({ metric: "roas_critical", currentValue: Math.round(avgRoas * 100) / 100, threshold: 1.0, severity: "critical", message: `ROAS of ${Math.round(avgRoas * 100) / 100}x is below breakeven` });
    }

    const ctrValues = recent.map((m) => m.clicks / Math.max(1, m.impressions));
    const ctrTrend = ctrValues.length >= 3 ? ctrValues[ctrValues.length - 1] - ctrValues[0] : 0;
    if (ctrTrend < -0.03) {
      warnings.push({ metric: "ctr_decline", currentValue: Math.round(ctrTrend * 10000) / 100, threshold: -0.03, severity: "high", message: `CTR declining at ${Math.round(Math.abs(ctrTrend) * 10000) / 100}% rate` });
    }

    const riskScore = Math.min(100, warnings.reduce((s, w) => s + (w.severity === "critical" ? 30 : w.severity === "high" ? 15 : 5), 0));

    return { triggered: warnings.some((w) => w.severity === "critical" || w.severity === "high"), warnings, riskScore };
  }

  computeSurvivalAnalysis(metrics: CampaignMetric[]): CampaignHealthReport["survivalAnalysis"] {
    if (metrics.length < 5) {
      const dailyProb = 0.95;
      const curves: SurvivalCurve[] = [];
      for (let t = 0; t <= 30; t++) {
        curves.push({ time: t, survivalProbability: Math.round(Math.pow(dailyProb, t) * 10000) / 100, atRisk: Math.max(0, 100 - t * 3), failed: t * 3 });
      }
      return { kaplanMeier: curves, medianLifetime: 14, predictedRemainingDays: 14, hazardRate: 0.05 };
    }

    const halfLife = metrics.length / 2;
    const ctrValues = metrics.map((m) => m.clicks / Math.max(1, m.impressions));
    const roasValues = metrics.map((m) => m.spend > 0 ? m.revenue / m.spend : 0);

    let failureCount = 0;
    const curves: SurvivalCurve[] = [];
    for (let t = 0; t <= metrics.length; t++) {
      const atRisk = metrics.length - t;
      const failed = failureCount;
      const ctrWeight = t < ctrValues.length ? Math.max(0, 1 - ctrValues[t] / Math.max(...ctrValues)) : 0;
      const roasWeight = t < roasValues.length ? Math.max(0, 1 - roasValues[t] / Math.max(...roasValues)) : 0;
      const failureProb = 0.02 + ctrWeight * 0.05 + roasWeight * 0.03;
      if (Math.random() < failureProb) failureCount++;
      const survivalProb = atRisk > 0 ? (atRisk - failed) / atRisk : 0;
      curves.push({ time: t, survivalProbability: Math.round(survivalProb * 10000) / 100, atRisk, failed });
    }

    let medianTime = metrics.length;
    for (const c of curves) {
      if (c.survivalProbability <= 0.5) { medianTime = c.time; break; }
    }

    const recentHazard = curves.slice(-3).reduce((s, c) => s + c.failed, 0) / Math.max(1, curves.slice(-3).reduce((s, c) => s + c.atRisk, 0));
    const predictedRemaining = recentHazard > 0 ? Math.round((1 / recentHazard) * 7) : 30;

    return {
      kaplanMeier: curves,
      medianLifetime: Math.round(medianTime),
      predictedRemainingDays: Math.min(90, Math.max(1, predictedRemaining)),
      hazardRate: Math.round(recentHazard * 10000) / 100,
    };
  }

  generateReport(campaignId: string, metrics: CampaignMetric[]): CampaignHealthReport {
    const health = this.computeHealthScore(metrics);
    const riskFactors = this.identifyRiskFactors(metrics);
    const earlyWarning = this.computeEarlyWarning(metrics);
    const survivalAnalysis = this.computeSurvivalAnalysis(metrics);

    const recommendations: string[] = [];
    if (health.components.efficiency < 50) recommendations.push("Improve efficiency by optimizing bids and focusing on high-ROAS placements. Consider pausing low-performing ad sets.");
    if (health.components.engagement < 50) recommendations.push("Boost engagement by refreshing ad creative, testing new formats, and refining audience targeting.");
    if (health.components.conversion < 50) recommendations.push("Improve conversion rate by A/B testing landing pages, simplifying the conversion flow, and adding social proof.");
    if (health.components.pacing < 50) recommendations.push("Fix budget pacing by adjusting daily budgets, implementing dayparting, and smoothing delivery across the period.");
    if (health.components.stability < 50) recommendations.push("Improve campaign stability by consolidating ad sets, reducing bid adjustments, and monitoring frequency caps.");
    if (earlyWarning.triggered) recommendations.push("EARLY WARNING ACTIVATED: Review critical alerts immediately. Consider pausing campaign if risk score exceeds 50.");
    if (survivalAnalysis.predictedRemainingDays < 7) recommendations.push("Campaign may be approaching end of lifecycle. Plan creative refresh or new campaign launch.");
    if (health.overall >= 85) recommendations.push("Campaign is performing well. Consider scaling budget on best-performing channels and testing new audience segments.");
    if (recommendations.length === 0) recommendations.push("Continue monitoring campaign performance and optimize incrementally.");

    const trend = metrics.map((m, i) => {
      const subMetrics = metrics.slice(0, i + 1);
      const h = this.computeHealthScore(subMetrics);
      return { day: m.day, healthScore: h.overall, category: h.category };
    });

    return { campaignId, currentHealth: health, riskFactors, earlyWarning, survivalAnalysis, recommendations, trend };
  }

  generateSampleMetrics(days: number = 30): CampaignMetric[] {
    const metrics: CampaignMetric[] = [];
    let baseImpressions = 5000;
    for (let d = 1; d <= days; d++) {
      const decay = Math.max(0.5, 1 - d * 0.008);
      const noise = 0.7 + Math.random() * 0.6;
      const imps = Math.round(baseImpressions * decay * noise);
      const ctr = (0.02 + Math.random() * 0.03) * decay;
      const clicks = Math.round(imps * ctr);
      const cvr = 0.03 + Math.random() * 0.05;
      const conv = Math.round(clicks * cvr);
      const cpc = 0.5 + Math.random() * 1.5;
      const spend = Math.round(clicks * cpc * 100) / 100;
      const aov = 50 + Math.random() * 100;
      const revenue = Math.round(conv * aov * 100) / 100;
      metrics.push({ day: d, impressions: imps, clicks, conversions: conv, spend, revenue });
    }
    return metrics;
  }

  private coefficientOfVariation(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    if (mean === 0) return 0;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
    return Math.sqrt(variance) / mean;
  }
}

export const campaignHealthPredictorService = new CampaignHealthPredictorService();
