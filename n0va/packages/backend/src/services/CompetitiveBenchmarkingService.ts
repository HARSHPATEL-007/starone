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
    }));

    const overallScore = Math.round(comparisons.reduce((s, c) => s + Math.min(100, c.percentile), 0) / comparisons.length);

    return {
      industry: industry || "saas",
      overallScore,
      comparisons,
      yourPerformance,
      industryBenchmarks,
      topWeaknesses: comparisons.filter(c => c.percentile < 40).slice(0, 3),
      topStrengths: comparisons.filter(c => c.percentile > 70).slice(0, 3),
      recommendations: this.getRecommendations(comparisons, industry || "saas"),
    };
  }

  private getIndustryData(industry: string) {
    const data: Record<string, any> = {
      saas: { ctr: 2.5, cvr: 3.0, cpc: 2.1, cpm: 15.0, cpa: 32, roas: 2.8, avgSpend: 45000, budgetUtilization: 72, avgActiveCampaigns: 4, marketAvgSpend: 120000 },
      ecommerce: { ctr: 1.8, cvr: 2.5, cpc: 1.2, cpm: 8.5, cpa: 22, roas: 4.0, avgSpend: 35000, budgetUtilization: 78, avgActiveCampaigns: 6, marketAvgSpend: 95000 },
      finance: { ctr: 3.2, cvr: 4.5, cpc: 3.8, cpm: 22.0, cpa: 55, roas: 2.0, avgSpend: 65000, budgetUtilization: 65, avgActiveCampaigns: 3, marketAvgSpend: 200000 },
      healthcare: { ctr: 2.0, cvr: 3.8, cpc: 2.5, cpm: 18.0, cpa: 45, roas: 1.5, avgSpend: 40000, budgetUtilization: 70, avgActiveCampaigns: 3, marketAvgSpend: 150000 },
      education: { ctr: 2.2, cvr: 4.0, cpc: 1.8, cpm: 12.0, cpa: 35, roas: 3.5, avgSpend: 25000, budgetUtilization: 75, avgActiveCampaigns: 4, marketAvgSpend: 80000 },
      retail: { ctr: 1.5, cvr: 2.0, cpc: 0.9, cpm: 6.5, cpa: 18, roas: 5.0, avgSpend: 30000, budgetUtilization: 80, avgActiveCampaigns: 8, marketAvgSpend: 75000 },
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
