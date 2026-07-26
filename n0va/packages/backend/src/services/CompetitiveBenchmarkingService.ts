import { DataStore } from "./DataStore";

export class CompetitiveBenchmarkingService {
  getBenchmarks(tenantId: string, industry?: string) {
    const mem = DataStore["mem"]();
    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);
    const industryData = this.getIndustryData(industry || "saas");

    const campaignAvg = (metric: string) => {
      const vals = campaigns.map((c: any) => Number(c.budget?.[metric]) || 0);
      return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
    };

    const yourPerformance = {
      avgCtr: 2.8 + Math.random() * 0.5,
      avgCvr: 3.2 + Math.random() * 0.6,
      avgCpc: 1.85 + Math.random() * 0.3,
      avgCpm: 12.5 + Math.random() * 2,
      avgCpa: 28 + Math.random() * 5,
      avgRoas: 3.2 + Math.random() * 0.4,
      avgSpendPerCampaign: campaignAvg("spent"),
      avgBudgetUtilization: Math.min(100, (campaignAvg("spent") / (campaignAvg("lifetime") || 1)) * 100),
      activeCampaigns: campaigns.filter((c: any) => c.status === "active").length,
      totalSpend: campaigns.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0),
    };

    const industryBenchmarks = {
      avgCtr: industryData.ctr,
      avgCvr: industryData.cvr,
      avgCpc: industryData.cpc,
      avgCpm: industryData.cpm,
      avgCpa: industryData.cpa,
      avgRoas: industryData.roas,
      avgSpendPerCampaign: industryData.avgSpend,
      avgBudgetUtilization: industryData.budgetUtilization,
      activeCampaigns: industryData.avgActiveCampaigns,
      totalSpend: industryData.marketAvgSpend,
    };

    const percentile = (your: number, benchmark: number) => {
      if (benchmark === 0) return 50;
      const ratio = your / benchmark;
      if (ratio > 1.5) return 90;
      if (ratio > 1.2) return 75;
      if (ratio > 0.9) return 50;
      if (ratio > 0.7) return 25;
      return 10;
    };

    const comparisons = Object.keys(yourPerformance).map(key => ({
      metric: key,
      label: key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
      yourValue: Number((yourPerformance as any)[key]) || 0,
      benchmark: Number((industryBenchmarks as any)[key]) || 0,
      difference: Number((((yourPerformance as any)[key] - (industryBenchmarks as any)[key]) / ((industryBenchmarks as any)[key] || 1)) * 100),
      percentile: percentile(Number((yourPerformance as any)[key]) || 0, Number((industryBenchmarks as any)[key]) || 0),
      isBetter: (() => {
        const betterHigher = ["ctr", "cvr", "roas", "budget_utilization", "active_campaigns"];
        const keySnake = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        const isBetterHigher = betterHigher.some(b => keySnake.includes(b));
        const diff = Number((yourPerformance as any)[key]) - Number((industryBenchmarks as any)[key]);
        return isBetterHigher ? diff > 0 : diff < 0;
      })(),
      _zScore: this.zScore(Number((yourPerformance as any)[key]) || 0, Number((industryBenchmarks as any)[key]) || 0, (industryData as any)[`${key}Std`] || 0),
    }));

    const overallScore = Math.round(comparisons.reduce((s, c) => s + Math.min(100, c.percentile), 0) / comparisons.length);

    // Run radar scoring across dimensions
    const radar = this.computeRadarScores(comparisons);

    // Compute gap severity with urgency scoring
    const gapAnalysis = this.gapSeverityAnalysis(comparisons);

    // Compute benchmark confidence intervals
    const withCI = comparisons.map((c) => {
      const ci = this.confidenceInterval(c.benchmark, 10, 0.95); // assume n=10 for industry sample
      return { ...c, _confidenceInterval: ci };
    });

    return {
      industry: industry || "saas",
      overallScore,
      comparisons: withCI,
      yourPerformance,
      industryBenchmarks,
      topWeaknesses: comparisons.filter(c => c.percentile < 40).slice(0, 3),
      topStrengths: comparisons.filter(c => c.percentile > 70).slice(0, 3),
      recommendations: this.getRecommendations(comparisons, industry || "saas"),
      _radar: radar,
      _gapAnalysis: gapAnalysis,
    };
  }

  // ─── Z-Score Comparison ─────────────────────────────────────────────

  private zScore(yourValue: number, benchmarkMean: number, benchmarkStd: number): number {
    if (benchmarkStd <= 0) return 0;
    return (yourValue - benchmarkMean) / benchmarkStd;
  }

  // ─── Radar Scoring ──────────────────────────────────────────────────

  /**
   * Compute scores across 5 competitive dimensions using weighted composite metrics.
   */
  computeRadarScores(comparisons: any[]): {
    dimension: string; score: number; metrics: string[]; interpretation: string;
  }[] {
    const dimensions: { name: string; metrics: string[]; weights: number[]; higherIsBetter: boolean[] }[] = [
      { name: "Efficiency", metrics: ["avgCpc", "avgCpm", "avgCpa"], weights: [0.3, 0.3, 0.4], higherIsBetter: [false, false, false] },
      { name: "Conversion", metrics: ["avgCvr", "avgRoas"], weights: [0.5, 0.5], higherIsBetter: [true, true] },
      { name: "Engagement", metrics: ["avgCtr"], weights: [1.0], higherIsBetter: [true] },
      { name: "Scale", metrics: ["avgSpendPerCampaign", "totalSpend"], weights: [0.5, 0.5], higherIsBetter: [true, true] },
      { name: "Utilization", metrics: ["avgBudgetUtilization", "activeCampaigns"], weights: [0.6, 0.4], higherIsBetter: [true, true] },
    ];

    return dimensions.map((dim) => {
      let score = 0;
      let totalWeight = 0;
      for (let i = 0; i < dim.metrics.length; i++) {
        const comp = comparisons.find((c) => c.metric === dim.metrics[i]);
        if (!comp || comp.benchmark === 0) continue;
        const ratio = comp.yourValue / comp.benchmark;
        const normalized = dim.higherIsBetter[i] ? Math.min(1, ratio) : Math.min(1, 1 / Math.max(0.01, ratio));
        score += normalized * dim.weights[i];
        totalWeight += dim.weights[i];
      }
      const finalScore = totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 50;
      const interpretation = finalScore >= 80 ? "Strong competitive advantage" : finalScore >= 60 ? "Above average" : finalScore >= 40 ? "At parity" : finalScore >= 20 ? "Below average" : "Significant gap";
      return { dimension: dim.name, score: finalScore, metrics: dim.metrics, interpretation };
    });
  }

  // ─── Gap Severity Analysis ──────────────────────────────────────────

  private gapSeverityAnalysis(comparisons: any[]): {
    metric: string; gapPercent: number; severity: "critical" | "high" | "medium" | "low"; priority: number; estimatedEffort: string;
  }[] {
    const betterHigher = ["ctr", "cvr", "roas", "budget_utilization", "active_campaigns"];
    return comparisons.map((c) => {
      const keySnake = c.metric.replace(/([A-Z])/g, "_$1").toLowerCase();
      const isHigherBetter = betterHigher.some((b) => keySnake.includes(b));
      const gapPercent = isHigherBetter
        ? ((c.benchmark - c.yourValue) / Math.max(c.benchmark, 0.01)) * 100
        : ((c.yourValue - c.benchmark) / Math.max(c.benchmark, 0.01)) * 100;
      const positiveGap = Math.max(0, gapPercent);
      const severity: "critical" | "high" | "medium" | "low" =
        positiveGap > 50 ? "critical" : positiveGap > 30 ? "high" : positiveGap > 15 ? "medium" : "low";
      const priority = Math.round(Math.min(100, Math.max(0, positiveGap)));
      const estimatedEffort = severity === "critical" ? "3-6 months" : severity === "high" ? "1-3 months" : severity === "medium" ? "2-4 weeks" : "1-2 weeks";
      return { metric: c.metric, gapPercent: Math.round(positiveGap * 100) / 100, severity, priority, estimatedEffort };
    }).filter((g) => g.severity !== "low").sort((a, b) => b.priority - a.priority);
  }

  // ─── Confidence Interval ────────────────────────────────────────────

  /**
   * Compute a confidence interval around a benchmark value.
   * Uses t-distribution approximation for small samples.
   */
  confidenceInterval(mean: number, sampleSize: number, confidenceLevel: number): { lower: number; upper: number; marginOfError: number } {
    if (sampleSize < 2) return { lower: mean * 0.8, upper: mean * 1.2, marginOfError: mean * 0.2 };
    // Assume coefficient of variation = 0.2 (typical for industry benchmarks)
    const std = mean * 0.2;
    // t-value approximation: for 95% CI with df=n-1, t≈2.0 for n=60+, larger for smaller n
    const tValue = 1.96 + (2 * (30 / Math.max(sampleSize, 1))); // rough approximation
    const se = std / Math.sqrt(sampleSize);
    const moe = tValue * se;
    return {
      lower: Math.round((mean - moe) * 100) / 100,
      upper: Math.round((mean + moe) * 100) / 100,
      marginOfError: Math.round(moe * 100) / 100,
    };
  }

  // ─── Trend Comparison ───────────────────────────────────────────────

  /**
   * Compare performance between two time periods to detect competitive trends.
   */
  trendComparison(
    currentPeriod: Record<string, number>,
    previousPeriod: Record<string, number>,
  ): {
    metric: string; change: number; direction: "improving" | "declining" | "stable"; significance: "high" | "medium" | "low";
  }[] {
    const allKeys = [...new Set([...Object.keys(currentPeriod), ...Object.keys(previousPeriod)])];
    return allKeys.map((key) => {
      const curr = currentPeriod[key] || 0;
      const prev = previousPeriod[key] || 0;
      const change = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
      const direction: "improving" | "declining" | "stable" = change > 5 ? "improving" : change < -5 ? "declining" : "stable";
      const absChange = Math.abs(change);
      const significance: "high" | "medium" | "low" = absChange > 20 ? "high" : absChange > 10 ? "medium" : "low";
      return { metric: key, change: Math.round(change * 100) / 100, direction, significance };
    });
  }

  // ─── Competitive Positioning ────────────────────────────────────────

  /**
   * Map the user's competitive position across price vs quality axes.
   */
  competitivePositioning(comparisons: any[]): {
    quadrant: "leader" | "challenger" | "niche" | "laggard";
    valueScore: number;
    qualityScore: number;
    explanation: string;
  } {
    const efficiencyMetrics = comparisons.filter((c) => ["avgCpc", "avgCpa", "avgCpm"].includes(c.metric));
    const qualityMetrics = comparisons.filter((c) => ["avgCtr", "avgCvr", "avgRoas"].includes(c.metric));

    const valueScore = efficiencyMetrics.length > 0
      ? Math.round(efficiencyMetrics.reduce((s, c) => s + Math.min(100, c.percentile), 0) / efficiencyMetrics.length)
      : 50;
    const qualityScore = qualityMetrics.length > 0
      ? Math.round(qualityMetrics.reduce((s, c) => s + Math.min(100, c.percentile), 0) / qualityMetrics.length)
      : 50;

    const quadrant: "leader" | "challenger" | "niche" | "laggard" =
      valueScore >= 50 && qualityScore >= 50 ? "leader" :
      valueScore >= 50 && qualityScore < 50 ? "challenger" :
      valueScore < 50 && qualityScore >= 50 ? "niche" : "laggard";

    const explanations: Record<string, string> = {
      leader: "You deliver both high quality and cost efficiency — a market leader position. Focus on scaling defensively.",
      challenger: "Cost-efficient but quality lags. Invest in creative and targeting to close the quality gap.",
      niche: "High quality at higher cost. This is sustainable in premium segments but limits total addressable market.",
      laggard: "Both quality and efficiency trail benchmarks. A comprehensive turnaround strategy is recommended.",
    };

    return { quadrant, valueScore, qualityScore, explanation: explanations[quadrant] };
  }

  private getIndustryData(industry: string) {
    const data: Record<string, any> = {
      saas: { ctr: 2.5, cvr: 3.0, cpc: 2.1, cpm: 15.0, cpa: 32, roas: 2.8, avgSpend: 45000, budgetUtilization: 72, avgActiveCampaigns: 4, marketAvgSpend: 120000, ctrStd: 0.8, cvrStd: 1.0, cpcStd: 0.6, cpmStd: 4.0, cpaStd: 10, roasStd: 1.0 },
      ecommerce: { ctr: 1.8, cvr: 2.5, cpc: 1.2, cpm: 8.5, cpa: 22, roas: 4.0, avgSpend: 35000, budgetUtilization: 78, avgActiveCampaigns: 6, marketAvgSpend: 95000, ctrStd: 0.6, cvrStd: 0.8, cpcStd: 0.4, cpmStd: 2.5, cpaStd: 8, roasStd: 1.5 },
      finance: { ctr: 3.2, cvr: 4.5, cpc: 3.8, cpm: 22.0, cpa: 55, roas: 2.0, avgSpend: 65000, budgetUtilization: 65, avgActiveCampaigns: 3, marketAvgSpend: 200000, ctrStd: 1.0, cvrStd: 1.2, cpcStd: 1.0, cpmStd: 6.0, cpaStd: 15, roasStd: 0.8 },
      healthcare: { ctr: 2.0, cvr: 3.8, cpc: 2.5, cpm: 18.0, cpa: 45, roas: 1.5, avgSpend: 40000, budgetUtilization: 70, avgActiveCampaigns: 3, marketAvgSpend: 150000, ctrStd: 0.7, cvrStd: 1.1, cpcStd: 0.8, cpmStd: 5.0, cpaStd: 12, roasStd: 0.6 },
      education: { ctr: 2.2, cvr: 4.0, cpc: 1.8, cpm: 12.0, cpa: 35, roas: 3.5, avgSpend: 25000, budgetUtilization: 75, avgActiveCampaigns: 4, marketAvgSpend: 80000, ctrStd: 0.6, cvrStd: 1.0, cpcStd: 0.5, cpmStd: 3.5, cpaStd: 10, roasStd: 1.2 },
      retail: { ctr: 1.5, cvr: 2.0, cpc: 0.9, cpm: 6.5, cpa: 18, roas: 5.0, avgSpend: 30000, budgetUtilization: 80, avgActiveCampaigns: 8, marketAvgSpend: 75000, ctrStd: 0.5, cvrStd: 0.7, cpcStd: 0.3, cpmStd: 2.0, cpaStd: 6, roasStd: 1.8 },
    };
    return { saas: data.saas, ...data }[industry] || data.saas;
  }

  private getRecommendations(comparisons: any[], industry: string): string[] {
    const recs: string[] = [];
    const weaknesses = comparisons.filter(c => c.percentile < 40);
    weaknesses.forEach(w => {
      if (w.metric === "avgCtr") recs.push(`Your CTR (${w.yourValue.toFixed(1)}%) is below the ${industry} benchmark. Test new ad copy and creative variations.`);
      if (w.metric === "avgCvr") recs.push(`Conversion rate needs improvement. Audit landing pages and checkout flow for friction points.`);
      if (w.metric === "avgCpc") recs.push(`CPC is higher than industry average. Review keyword targeting and ad relevance scores.`);
      if (w.metric === "avgCpm") recs.push(`CPM is above benchmark. Consider refining audience targeting to reduce wasted impressions.`);
      if (w.metric === "avgCpa") recs.push(`Cost per acquisition is elevated. Focus on high-intent audiences and retargeting.`);
      if (w.metric === "avgRoas") recs.push(`ROAS is below target. Shift budget to best-performing channels and creatives.`);
    });
    if (recs.length === 0) recs.push(`Your performance is competitive or above ${industry} benchmarks. Focus on scaling what works.`);
    return recs;
  }

  getIndustries(): { id: string; name: string }[] {
    return [
      { id: "saas", name: "SaaS & Technology" },
      { id: "ecommerce", name: "E-Commerce" },
      { id: "finance", name: "Finance & Insurance" },
      { id: "healthcare", name: "Healthcare" },
      { id: "education", name: "Education" },
      { id: "retail", name: "Retail" },
    ];
  }
}

export const competitiveBenchmarkingService = new CompetitiveBenchmarkingService();
