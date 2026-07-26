import { Metric } from "../models/Metric";
import { Campaign } from "../models/Campaign";
import { decisionEngine } from "./DecisionEngine";

export interface PlatformPerformance {
  platform: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  roas: number;
  cpa: number;
  shareOfSpend: number;
  efficiencyScore: number;
  campaignCount: number;
  trend: "improving" | "declining" | "stable";
}

export interface ChannelOptimizationReport {
  generatedAt: string;
  platforms: PlatformPerformance[];
  topPlatform: PlatformPerformance | null;
  worstPlatform: PlatformPerformance | null;
  concentration: { hhi: number; gini: number; interpretation: string };
  reallocationSuggestions: { from: string; to: string; amount: number; rationale: string; expectedRoasImprovement: number }[];
  recommendations: string[];
}

export class ChannelOptimizationOrchestrator {
  async analyze(tenantId: string, days = 90): Promise<ChannelOptimizationReport> {
    const mongoose = require("mongoose");
    const since = new Date(Date.now() - days * 86400000);
    const metrics = await Metric.find({ tenantId: new mongoose.Types.ObjectId(tenantId), date: { $gte: since } }).lean() as any[];
    const campaigns = await Campaign.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean() as any[];

    const platformMap: Record<string, { impressions: number; clicks: number; conversions: number; spend: number; revenue: number; campaigns: Set<string>; dates: Date[] }> = {};
    for (const m of metrics) {
      const p = m.platform || "unknown";
      if (!platformMap[p]) platformMap[p] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, campaigns: new Set(), dates: [] };
      platformMap[p].impressions += m.impressions || 0;
      platformMap[p].clicks += m.clicks || 0;
      platformMap[p].conversions += m.conversions || 0;
      platformMap[p].spend += m.spend || 0;
      platformMap[p].revenue += m.revenue || 0;
      if (m.campaignId) platformMap[p].campaigns.add(m.campaignId.toString());
      if (m.date) platformMap[p].dates.push(new Date(m.date));
    }

    const totalSpendAll = Object.values(platformMap).reduce((s, v) => s + v.spend, 0);

    const platforms: PlatformPerformance[] = Object.entries(platformMap).map(([platform, data]) => {
      const ctr = data.impressions > 0 ? Math.round((data.clicks / data.impressions) * 10000) / 100 : 0;
      const roas = data.spend > 0 ? Math.round((data.revenue / data.spend) * 100) / 100 : 0;
      const cpa = data.conversions > 0 ? Math.round((data.spend / data.conversions) * 100) / 100 : 0;
      const shareOfSpend = totalSpendAll > 0 ? Math.round((data.spend / totalSpendAll) * 10000) / 100 : 0;
      const efficiencyScore = Math.round((roas * 40 + (100 - Math.min(100, cpa * 0.5)) * 0.3 + ctr * 0.3) * 100) / 100;

      const sorted = data.dates.sort((a, b) => a.getTime() - b.getTime());
      let trend: "improving" | "declining" | "stable" = "stable";
      if (sorted.length >= 4) {
        const half = Math.floor(sorted.length / 2);
        const firstHalf = metrics.filter((m: any) => m.platform === platform && sorted.indexOf(new Date(m.date)) < half).reduce((s: number, m: any) => s + (m.roas || 0), 0) / Math.max(1, half);
        const secondHalf = metrics.filter((m: any) => m.platform === platform && sorted.indexOf(new Date(m.date)) >= half).reduce((s: number, m: any) => s + (m.roas || 0), 0) / Math.max(1, sorted.length - half);
        trend = secondHalf > firstHalf * 1.1 ? "improving" : secondHalf < firstHalf * 0.9 ? "declining" : "stable";
      }

      return { platform, impressions: data.impressions, clicks: data.clicks, conversions: data.conversions, spend: data.spend, revenue: data.revenue, ctr, roas, cpa, shareOfSpend, efficiencyScore, campaignCount: data.campaigns.size, trend };
    });

    platforms.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
    const topPlatform = platforms[0] || null;
    const worstPlatform = platforms.length > 1 ? platforms[platforms.length - 1] : null;

    const spendShares = platforms.map(p => p.spend);
    const hhi = decisionEngine.hhi(spendShares);
    const giniCoeff = decisionEngine.gini(spendShares);
    let concentrationInterpretation = "Diversified";
    if (hhi > 2500) concentrationInterpretation = "Highly concentrated — risk of single-platform dependency.";
    else if (hhi > 1500) concentrationInterpretation = "Moderately concentrated. Consider diversification.";
    else concentrationInterpretation = "Well-diversified across platforms.";

    const reallocationSuggestions: { from: string; to: string; amount: number; rationale: string; expectedRoasImprovement: number }[] = [];
    if (worstPlatform && topPlatform && worstPlatform.spend > 100) {
      const reallocationAmount = Math.round(worstPlatform.spend * 0.3);
      const expectedImprovement = Math.round(((topPlatform.roas - worstPlatform.roas) / worstPlatform.roas) * 100);
      if (expectedImprovement > 0) {
        reallocationSuggestions.push({ from: worstPlatform.platform, to: topPlatform.platform, amount: reallocationAmount, rationale: `${worstPlatform.platform} ROAS ${worstPlatform.roas}x vs ${topPlatform.platform} ROAS ${topPlatform.roas}x.`, expectedRoasImprovement: expectedImprovement });
      }
    }

    const recommendations: string[] = [];
    if (worstPlatform) recommendations.push(`${worstPlatform.platform} underperforming (ROAS ${worstPlatform.roas}x, efficiency ${worstPlatform.efficiencyScore}). Consider reducing spend.`);
    if (topPlatform) recommendations.push(`${topPlatform.platform} is top performer (efficiency ${topPlatform.efficiencyScore}). Consider increasing allocation.`);
    if (concentrationInterpretation.includes("concentrated")) recommendations.push(concentrationInterpretation);
    const declining = platforms.filter(p => p.trend === "declining");
    if (declining.length > 0) recommendations.push(`${declining.length} platform(s) showing declining trend: ${declining.map(p => p.platform).join(", ")}.`);
    const improving = platforms.filter(p => p.trend === "improving");
    if (improving.length > 0) recommendations.push(`${improving[0].platform} showing improving trend — capitalize with increased investment.`);

    return { generatedAt: new Date().toISOString(), platforms, topPlatform, worstPlatform, concentration: { hhi, gini: giniCoeff, interpretation: concentrationInterpretation }, reallocationSuggestions, recommendations };
  }
}

export const channelOptimizationOrchestrator = new ChannelOptimizationOrchestrator();
