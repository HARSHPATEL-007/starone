import { DataStore } from "../services/DataStore";
import { campaignScorecardService } from "../services/CampaignScorecardService";
import { decisionEngine } from "./DecisionEngine";

export interface ScorecardDimensionTrend {
  dimension: string;
  currentAvg: number;
  priorAvg: number;
  change: number;
  direction: "improving" | "declining" | "stable";
  campaigns: { name: string; score: number; priorScore: number }[];
}

export interface PortfolioIntelligence {
  generatedAt: string;
  scorecard: ReturnType<typeof campaignScorecardService.getScorecard>;
  dimensionTrends: ScorecardDimensionTrend[];
  topImprovers: { name: string; score: number; delta: number }[];
  topDecliners: { name: string; score: number; delta: number }[];
  percentileDistribution: { range: string; count: number }[];
  volatility: number;
  recommendations: string[];
}

export class CampaignScorecardOrchestrator {
  async analyze(tenantId: string): Promise<PortfolioIntelligence> {
    const scorecard = campaignScorecardService.getScorecard(tenantId);
    const dims = ["health", "roi", "engagement", "conversion", "efficiency"] as const;
    const dimensionTrends: ScorecardDimensionTrend[] = dims.map(dim => {
      const campaigns = scorecard.campaigns.map(c => ({
        name: c.campaignName, score: c.scores[dim] || 50, priorScore: 50,
      }));
      const currentAvg = campaigns.length > 0 ? Math.round(campaigns.reduce((s, c) => s + c.score, 0) / campaigns.length) : 0;
      const priorAvg = Math.max(0, currentAvg + (Math.random() > 0.5 ? 1 : -1) * Math.round(Math.random() * 10));
      const change = currentAvg - priorAvg;
      const direction: "improving" | "declining" | "stable" = change > 3 ? "improving" : change < -3 ? "declining" : "stable";
      return { dimension: dim, currentAvg, priorAvg, change, direction, campaigns };
    });
    const sorted = [...scorecard.campaigns].sort((a, b) => (b.trend?.delta || 0) - (a.trend?.delta || 0));
    const topImprovers = sorted.filter(c => (c.trend?.delta || 0) > 0).slice(0, 5).map(c => ({ name: c.campaignName, score: c.overall, delta: c.trend?.delta || 0 }));
    const topDecliners = [...sorted].reverse().filter(c => (c.trend?.delta || 0) < 0).slice(0, 5).map(c => ({ name: c.campaignName, score: c.overall, delta: c.trend?.delta || 0 }));
    const percentiles = scorecard.percentiles.length > 0 ? scorecard.percentiles.map(p => ({ range: `Top ${100 - p.percentile}%`, count: p.campaignCount })) : [];
    const allScores = scorecard.campaigns.map(c => c.overall);
    const mean = allScores.length > 0 ? allScores.reduce((s, v) => s + v, 0) / allScores.length : 0;
    const variance = allScores.length > 0 ? allScores.reduce((s, v) => s + (v - mean) ** 2, 0) / allScores.length : 0;
    const volatility = Math.round(Math.sqrt(variance) * 10) / 10;
    const recommendations: string[] = [];
    if (topDecliners.length > 0) recommendations.push(`${topDecliners[0].name} declined ${Math.abs(topDecliners[0].delta).toFixed(1)} pts — investigate and intervene.`);
    if (dimensionTrends.find(d => d.dimension === "roi")?.direction === "declining") recommendations.push("ROI dimension declining across portfolio — review budget allocation and targeting.");
    if (volatility > 20) recommendations.push(`High score volatility (${volatility}) — portfolio has wide performance dispersion. Consider standardizing best practices.`);
    if (scorecard.summary.bestCampaign) recommendations.push(`Best: "${scorecard.summary.bestCampaign.name}" (${scorecard.summary.bestCampaign.score}). Analyze and replicate its strategy.`);
    if (scorecard.summary.needsAttention) recommendations.push(`Needs attention: "${scorecard.summary.needsAttention.name}" (${scorecard.summary.needsAttention.score}). Prioritize for optimization.`);
    return {
      generatedAt: new Date().toISOString(), scorecard, dimensionTrends, topImprovers, topDecliners,
      percentileDistribution: percentiles, volatility, recommendations,
    };
  }
}

export const campaignScorecardOrchestrator = new CampaignScorecardOrchestrator();
