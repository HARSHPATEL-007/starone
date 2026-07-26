import { DataStore } from "../services/DataStore";
import { decisionEngine } from "./DecisionEngine";

export interface PlatformPerformance {
  platform: string;
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  ctr: number;
  cpc: number;
  cvr: number;
  shareOfSpend: number;
  shareOfRevenue: number;
  efficiencyScore: number;
  trend: "improving" | "declining" | "stable";
}

export interface ChannelMixAdvice {
  platform: string;
  currentAllocation: number;
  recommendedAllocation: number;
  delta: number;
  rationale: string;
  expectedImpact: string;
  priority: "high" | "medium" | "low";
}

export interface ChannelMixDashboard {
  generatedAt: string;
  platformPerformance: PlatformPerformance[];
  mixAdvice: ChannelMixAdvice[];
  concentration: { hhi: number; gini: number; interpretation: string };
  topPlatform: string | null;
  worstPlatform: string | null;
  diversificationScore: number;
  recommendations: string[];
}

export class ChannelMixOptimizerOrchestrator {
  async analyze(tenantId: string): Promise<ChannelMixDashboard> {
    const metrics = await DataStore.findMetrics({ tenantId });
    const platformMap = new Map<string, { spend: number; revenue: number; impressions: number; clicks: number; conversions: number }>();

    for (const m of metrics) {
      const platform = m.platform || "unknown";
      if (!platformMap.has(platform)) platformMap.set(platform, { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 });
      const p = platformMap.get(platform)!;
      p.spend += m.spend || 0;
      p.revenue += m.revenue || 0;
      p.impressions += m.impressions || 0;
      p.clicks += m.clicks || 0;
      p.conversions += m.conversions || 0;
    }

    const totalSpend = Array.from(platformMap.values()).reduce((s, p) => s + p.spend, 0);
    const totalRevenue = Array.from(platformMap.values()).reduce((s, p) => s + p.revenue, 0);

    const platformPerformance: PlatformPerformance[] = Array.from(platformMap.entries()).map(([platform, data]) => {
      const roas = data.spend > 0 ? data.revenue / data.spend : 0;
      const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
      const cpc = data.clicks > 0 ? data.spend / data.clicks : 0;
      const cvr = data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0;
      const shareOfSpend = totalSpend > 0 ? (data.spend / totalSpend) * 100 : 0;
      const shareOfRevenue = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0;

      const roasScore = Math.min(100, (roas / 5) * 100);
      const ctrScore = Math.min(100, (ctr / 10) * 100);
      const cvrScore = Math.min(100, (cvr / 20) * 100);
      const efficiencyScore = Math.round((roasScore * 0.5 + ctrScore * 0.25 + cvrScore * 0.25) * 100) / 100;

      const trend: "improving" | "declining" | "stable" = efficiencyScore > 70 ? "improving" : efficiencyScore < 40 ? "declining" : "stable";

      return { platform, spend: data.spend, revenue: data.revenue, impressions: data.impressions, clicks: data.clicks, conversions: data.conversions, roas: Math.round(roas * 100) / 100, ctr: Math.round(ctr * 100) / 100, cpc: Math.round(cpc * 100) / 100, cvr: Math.round(cvr * 100) / 100, shareOfSpend: Math.round(shareOfSpend * 100) / 100, shareOfRevenue: Math.round(shareOfRevenue * 100) / 100, efficiencyScore, trend };
    });

    platformPerformance.sort((a, b) => b.efficiencyScore - a.efficiencyScore);

    const spendShares = platformPerformance.map((p) => p.spend);
    const hhi = decisionEngine.hhi(spendShares);
    const giniCoeff = decisionEngine.gini(spendShares);
    let interpretation: string;
    if (hhi > 2500) interpretation = "Highly concentrated — single-platform dependency risk.";
    else if (hhi > 1500) interpretation = "Moderately concentrated. Consider diversifying across more platforms.";
    else interpretation = "Well-diversified portfolio.";

    const totalPlatforms = platformPerformance.length;
    const evenShare = 100 / Math.max(1, totalPlatforms);
    const deviation = platformPerformance.reduce((s, p) => s + Math.abs(p.shareOfSpend - evenShare), 0);
    const diversificationScore = Math.round(Math.max(0, 100 - deviation / 2));

    const mixAdvice: ChannelMixAdvice[] = platformPerformance.map((p) => {
      const effRatio = p.roas > 0 ? p.efficiencyScore / Math.max(1, p.shareOfSpend) : 0;
      const avgEffRatio = platformPerformance.reduce((s, x) => s + (x.roas > 0 ? x.efficiencyScore / Math.max(1, x.shareOfSpend) : 0), 0) / Math.max(1, platformPerformance.length);
      const overInvested = p.shareOfSpend > p.shareOfRevenue && effRatio < avgEffRatio * 0.8;
      const underInvested = p.shareOfRevenue > p.shareOfSpend && effRatio > avgEffRatio * 1.2;

      let recommendedAllocation = p.shareOfSpend;
      let rationale: string;
      let priority: "high" | "medium" | "low";

      if (overInvested) {
        recommendedAllocation = Math.round(Math.max(5, p.shareOfSpend - 10));
        rationale = `${p.platform} over-invested relative to returns. Shift ${Math.round(p.shareOfSpend - recommendedAllocation)}% to higher-efficiency platforms.`;
        priority = "high";
      } else if (underInvested) {
        recommendedAllocation = Math.round(Math.min(50, p.shareOfSpend + 10));
        rationale = `${p.platform} under-invested — strong returns. Increase allocation by ${Math.round(recommendedAllocation - p.shareOfSpend)}%.`;
        priority = "high";
      } else if (p.efficiencyScore < 30) {
        recommendedAllocation = Math.round(p.shareOfSpend * 0.7);
        rationale = `${p.platform} has low efficiency (${p.efficiencyScore}). Consider reducing investment.`;
        priority = "medium";
      } else {
        rationale = `${p.platform} allocation is reasonable given efficiency (${p.efficiencyScore}). Monitor and maintain.`;
        priority = "low";
      }

      const delta = recommendedAllocation - p.shareOfSpend;
      const expectedImpact = delta > 0 ? `+${Math.round(delta * 0.5)}% estimated revenue increase` : `${Math.round(Math.abs(delta) * 0.3)}% estimated cost savings`;

      return { platform: p.platform, currentAllocation: p.shareOfSpend, recommendedAllocation, delta: Math.round(delta * 100) / 100, rationale, expectedImpact, priority };
    });

    const recommendations: string[] = [];
    const highPriority = mixAdvice.filter((a) => a.priority === "high");
    if (highPriority.length > 0) recommendations.push(`${highPriority.length} high-priority reallocation(s): ${highPriority.map((a) => `${a.platform} (${a.delta > 0 ? "+" : ""}${a.delta}%)`).join(", ")}.`);
    if (hhi > 1500) recommendations.push(interpretation);
    if (diversificationScore < 50) recommendations.push(`Low diversification score (${diversificationScore}). Spread budget more evenly across platforms.`);
    const declining = platformPerformance.filter((p) => p.trend === "declining");
    if (declining.length > 0) recommendations.push(`Declining platforms: ${declining.map((p) => p.platform).join(", ")}. Investigate and optimize.`);
    if (totalPlatforms <= 1) recommendations.push("Only 1 active platform. Expanding to additional platforms reduces risk and unlocks new audiences.");

    return {
      generatedAt: new Date().toISOString(), platformPerformance, mixAdvice,
      concentration: { hhi, gini: giniCoeff, interpretation },
      topPlatform: platformPerformance[0]?.platform || null,
      worstPlatform: platformPerformance[platformPerformance.length - 1]?.platform || null,
      diversificationScore, recommendations,
    };
  }
}

export const channelMixOptimizerOrchestrator = new ChannelMixOptimizerOrchestrator();
