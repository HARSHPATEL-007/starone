import { DataStore } from "../services/DataStore";
import { decisionEngine } from "./DecisionEngine";

export interface KeywordPerformance {
  keyword: string;
  matchType: string;
  volume: number;
  difficulty: number;
  cpc: number;
  bid: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  roas: number;
  ctr: number;
  cvr: number;
  status: string;
  opportunityScore: number;
  efficiency: number;
}

export interface KeywordOpportunity {
  keyword: string;
  matchType: string;
  volume: number;
  difficulty: number;
  opportunityScore: number;
  rationale: string;
  recommendedBid: number;
}

export interface KeywordTrendCluster {
  label: string;
  keywords: string[];
  avgVolume: number;
  avgDifficulty: number;
  avgEfficiency: number;
  direction: "rising" | "falling" | "stable";
}

export interface KeywordInsightsDashboard {
  generatedAt: string;
  totalKeywords: number;
  activeKeywords: number;
  pausedKeywords: number;
  keywordPerformance: KeywordPerformance[];
  opportunities: KeywordOpportunity[];
  trendClusters: KeywordTrendCluster[];
  topPerformer: { keyword: string; roas: number } | null;
  worstPerformer: { keyword: string; roas: number } | null;
  portfolioHealth: number;
  portfolioBand: string;
  recommendations: string[];
}

export class KeywordInsightsOrchestrator {
  async analyze(tenantId: string): Promise<KeywordInsightsDashboard> {
    const keywords = await DataStore.findKeywords({ tenantId });

    const activeKeywords = keywords.filter((k) => k.status === "active");
    const pausedKeywords = keywords.filter((k) => k.status === "paused");

    const keywordPerformance: KeywordPerformance[] = keywords.map((k) => {
      const perf = k.performance || {};
      const impressions = perf.impressions || 0;
      const clicks = perf.clicks || 0;
      const conversions = perf.conversions || 0;
      const spend = perf.spend || 0;
      const revenue = perf.revenue || 0;

      const roas = spend > 0 ? revenue / spend : 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;
      const efficiency = roas > 0 ? Math.min(100, roas * 25) : 0;

      const volumeScore = Math.min(100, (k.volume || 0) / 200);
      const difficultyDiscount = 1 - ((k.difficulty || 0) / 100);
      const perfScore = efficiency / 100;
      const opportunityScore = Math.round(volumeScore * difficultyDiscount * 0.4 + perfScore * 0.6 * 100);

      return {
        keyword: k.keyword, matchType: k.matchType, volume: k.volume || 0, difficulty: k.difficulty || 0,
        cpc: k.cpc || 0, bid: k.bid || 0, impressions, clicks, conversions, spend, revenue,
        roas: Math.round(roas * 100) / 100, ctr: Math.round(ctr * 100) / 100, cvr: Math.round(cvr * 100) / 100,
        status: k.status, opportunityScore, efficiency: Math.round(efficiency * 100) / 100,
      };
    });

    const sortedByOpp = [...keywordPerformance].sort((a, b) => b.opportunityScore - a.opportunityScore);
    const opportunities: KeywordOpportunity[] = sortedByOpp
      .filter((k) => k.opportunityScore > 50 && k.status === "active")
      .slice(0, 5)
      .map((k) => ({
        keyword: k.keyword, matchType: k.matchType, volume: k.volume, difficulty: k.difficulty,
        opportunityScore: k.opportunityScore,
        rationale: k.efficiency > 60 ? `Strong efficiency (${k.efficiency}) with ${k.volume.toLocaleString()} monthly searches. Increase bid to capture more volume.` : `High volume (${k.volume.toLocaleString()}) with manageable difficulty (${k.difficulty}/100). Optimize for better efficiency.`,
        recommendedBid: Math.round(Math.max(k.cpc, k.bid * 1.15) * 100) / 100,
      }));

    const clusterSizes = ["small", "medium", "large"];
    const trendClusters: KeywordTrendCluster[] = clusterSizes.map((size) => {
      const clusterKeywords = keywordPerformance.filter((k) => {
        const v = k.volume;
        if (size === "small") return v < 2000;
        if (size === "medium") return v >= 2000 && v < 8000;
        return v >= 8000;
      });
      const avgEff = clusterKeywords.length > 0 ? clusterKeywords.reduce((s, k) => s + k.efficiency, 0) / clusterKeywords.length : 0;
      return {
        label: `${size}-volume keywords`,
        keywords: clusterKeywords.map((k) => k.keyword),
        avgVolume: clusterKeywords.length > 0 ? Math.round(clusterKeywords.reduce((s, k) => s + k.volume, 0) / clusterKeywords.length) : 0,
        avgDifficulty: clusterKeywords.length > 0 ? Math.round(clusterKeywords.reduce((s, k) => s + k.difficulty, 0) / clusterKeywords.length) : 0,
        avgEfficiency: Math.round(avgEff * 100) / 100,
        direction: avgEff > 60 ? "rising" : avgEff < 30 ? "falling" : "stable",
      };
    });

    const sortedByRoas = [...keywordPerformance].sort((a, b) => b.roas - a.roas);
    const topPerformer = sortedByRoas.length > 0 && sortedByRoas[0].roas > 0 ? { keyword: sortedByRoas[0].keyword, roas: sortedByRoas[0].roas } : null;
    const worstPerformer = sortedByRoas.length > 0 && sortedByRoas[sortedByRoas.length - 1].roas >= 0 ? { keyword: sortedByRoas[sortedByRoas.length - 1].keyword, roas: sortedByRoas[sortedByRoas.length - 1].roas } : null;

    const avgEfficiency = keywordPerformance.length > 0 ? keywordPerformance.reduce((s, k) => s + k.efficiency, 0) / keywordPerformance.length : 0;
    const portfolioHealth = Math.round(Math.max(0, Math.min(100, avgEfficiency)));
    const portfolioBand = decisionEngine.label(decisionEngine.band(portfolioHealth));

    const recommendations: string[] = [];
    if (opportunities.length > 0) recommendations.push(`Top opportunity: "${opportunities[0].keyword}" (score ${opportunities[0].opportunityScore}). ${opportunities[0].rationale}`);
    const lowEff = keywordPerformance.filter((k) => k.efficiency < 20 && k.status === "active");
    if (lowEff.length > 0) recommendations.push(`${lowEff.length} active keyword(s) with efficiency < 20. Consider pausing or refining: ${lowEff.slice(0, 3).map((k) => k.keyword).join(", ")}.`);
    const highDiff = keywordPerformance.filter((k) => k.difficulty > 75 && k.status === "active");
    if (highDiff.length > 0) recommendations.push(`${highDiff.length} keyword(s) have difficulty > 75. Focus on long-tail alternatives with lower competition.`);
    if (pausedKeywords.length > 5) recommendations.push(`${pausedKeywords.length} paused keywords. Review and archive or reactivate.`);
    if (keywordPerformance.length === 0) recommendations.push("No keywords found. Add keywords to start tracking performance.");

    return {
      generatedAt: new Date().toISOString(), totalKeywords: keywords.length,
      activeKeywords: activeKeywords.length, pausedKeywords: pausedKeywords.length,
      keywordPerformance, opportunities, trendClusters, topPerformer, worstPerformer,
      portfolioHealth, portfolioBand, recommendations,
    };
  }
}

export const keywordInsightsOrchestrator = new KeywordInsightsOrchestrator();
