import { campaignOptimizerService } from "../services/CampaignOptimizerService";
import { DataStore } from "../services/DataStore";
import { decisionEngine } from "./DecisionEngine";

export interface OptimizationOpportunity {
  id: string;
  type: string;
  campaignId: string;
  campaignName: string;
  title: string;
  impact: string;
  effort: string;
  opportunityScore: number;
  band: string;
}

export interface PlatformScore {
  platform: string;
  campaignGoal: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface ConversionProbabilitySummary {
  campaignId: string;
  campaignName: string;
  probability: number;
  score: number;
  factors: { name: string; value: number; impact: number }[];
  status: string;
}

export interface TimingRecommendation {
  bestDayOfWeek: string;
  bestHourOfDay: number;
  windowScore: number;
  dayScores: { day: string; score: number }[];
  hourScores: { hour: number; score: number }[];
}

export interface OptimizerDashboard {
  opportunities: OptimizationOpportunity[];
  platformScores: PlatformScore[];
  conversionProbabilities: ConversionProbabilitySummary[];
  timing: TimingRecommendation | null;
  topOpportunity: OptimizationOpportunity | null;
  totalOpportunityValue: number;
  healthBand: string;
  recommendations: string[];
}

export class CampaignOptimizerOrchestrator {
  getDashboard(tenantId: string): OptimizerDashboard {
    const suggestions = campaignOptimizerService.generateOptimizations(tenantId);
    const platforms = campaignOptimizerService.getPlatformConfigs();
    const mem = DataStore.mem();
    const campaigns: any[] = mem.find("campaigns", (c: any) => c.tenantId === tenantId && c.status === "active");

    const opportunities: OptimizationOpportunity[] = suggestions.map(s => ({
      id: s.id, type: s.type, campaignId: s.campaignId,
      campaignName: s.campaignName, title: s.title,
      impact: s.impact, effort: s.effort,
      opportunityScore: (s as any)._opportunityScore || 50,
      band: decisionEngine.label(decisionEngine.band((s as any)._opportunityScore || 50)),
    })).sort((a, b) => b.opportunityScore - a.opportunityScore);

    const platformScores: PlatformScore[] = [];
    for (const c of campaigns) {
      for (const p of platforms) {
        const result = campaignOptimizerService.platformOptimizationScore(
          p.platform, c.goal || "conversions", c.metrics?.roas || 1.5,
          c.targetAudience?.size || 100000, c.budget?.daily > 500 ? "high" : c.budget?.daily > 100 ? "medium" : "low"
        );
        platformScores.push({
          platform: result.platform, campaignGoal: c.goal || "conversions",
          score: result.score, strengths: result.strengths,
          weaknesses: result.weaknesses, recommendation: result.recommendation,
        });
      }
    }

    const conversionProbabilities: ConversionProbabilitySummary[] = campaigns.map(c => {
      const result = campaignOptimizerService.conversionProbability(c);
      return {
        campaignId: c._id, campaignName: c.name,
        probability: result.probability, score: result.score,
        factors: result.factors,
        status: result.probability > 0.7 ? "high_confidence" : result.probability > 0.4 ? "medium_confidence" : "low_confidence",
      };
    });

    const timing = campaigns.length > 0 ? campaignOptimizerService.optimalTiming(campaigns) : null;
    const topOpportunity = opportunities.length > 0 ? opportunities[0] : null;
    const totalOpportunityValue = suggestions.reduce((s, sug) => s + sug.potentialValue, 0);

    const healthBand = decisionEngine.label(
      decisionEngine.band(opportunities.length > 0 ? opportunities[0].opportunityScore : 50, { excellent: 85, good: 70, fair: 50, poor: 30 })
    );

    const recommendations: string[] = [];
    if (topOpportunity) recommendations.push(`Top opportunity: "${topOpportunity.title}" (score ${topOpportunity.opportunityScore}/100, ${topOpportunity.impact} impact, ${topOpportunity.effort} effort).`);
    const highImpact = opportunities.filter(o => o.impact === "high");
    if (highImpact.length > 0) recommendations.push(`${highImpact.length} high-impact optimization(s) available.`);
    const bestPlatform = platformScores.length > 0 ? platformScores.reduce((a, b) => a.score > b.score ? a : b) : null;
    if (bestPlatform) recommendations.push(`Best platform fit: ${bestPlatform.platform} for ${bestPlatform.campaignGoal} goal (score ${bestPlatform.score}).`);
    if (timing) recommendations.push(`Optimal window: ${timing.bestDayOfWeek}s at ${timing.bestHourOfDay}:00 (score ${timing.windowScore}).`);

    return { opportunities, platformScores, conversionProbabilities, timing, topOpportunity, totalOpportunityValue, healthBand, recommendations };
  }
}

export const campaignOptimizerOrchestrator = new CampaignOptimizerOrchestrator();
