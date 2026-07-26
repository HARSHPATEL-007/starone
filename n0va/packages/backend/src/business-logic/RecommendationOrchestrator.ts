import { DataStore } from "../services/DataStore";
import { recommendationEngine, Recommendation } from "../services/RecommendationEngineService";
import { decisionEngine } from "./DecisionEngine";

export interface ImpactEstimate {
  recommendationId: string;
  title: string;
  type: string;
  estimatedRevenueUplift: number;
  estimatedCostReduction: number;
  netImpact: number;
  confidence: number;
  timeToImplement: string;
}

export interface RecommendationPriority {
  recommendation: Recommendation;
  impact: ImpactEstimate;
  priorityScore: number;
  band: string;
}

export interface AdaptiveThreshold {
  thresholdId: string;
  currentValue: number;
  adjustedValue: number;
  successRate: number;
  direction: string;
}

export interface OrchestratedRecommendationReport {
  generatedAt: string;
  campaignRecs: Recommendation[];
  crossCampaignRecs: Recommendation[];
  banditRecs: { recommendations: Recommendation[]; banditSelection: { armId: string; label: string } };
  prioritizedRecs: RecommendationPriority[];
  topPicks: RecommendationPriority[];
  impactSummary: { totalEstimatedUplift: number; totalCostReduction: number; avgConfidence: number };
  adaptiveThresholds: AdaptiveThreshold[];
  recommendations: string[];
}

export class RecommendationOrchestrator {
  async generate(tenantId: string): Promise<OrchestratedRecommendationReport> {
    const result = await DataStore.findCampaigns({ tenantId });
    const campaigns = ("campaigns" in result ? (result as any).campaigns : result) as any[];
    const metrics = await DataStore.findMetrics({ tenantId });
    const metricsArr = Array.isArray(metrics) ? metrics : [];
    const campaignData = campaigns.map((c: any) => {
      const m = metricsArr.find((mt: any) => mt.campaignId === (c._id || c.id));
      return {
        id: c._id || c.id, name: c.name, status: c.status, type: c.type || "performance",
        platforms: c.platforms || [],
        budget: c.budget || { daily: 0, lifetime: 0, spent: 0, remaining: 0, currency: "USD" },
        metrics: m ? {
          impressions: Number(m.impressions) || 0, clicks: Number(m.clicks) || 0,
          conversions: Number(m.conversions) || 0, spend: Number(m.spend) || 0,
          revenue: Number(m.revenue) || 0, ctr: Number(m.ctr) || 0,
          cpc: Number(m.cpc) || 0, roas: Number(m.roas) || 0, cvr: Number(m.cvr) || 0,
        } : undefined,
        startDate: c.startDate, endDate: c.endDate, tags: c.tags,
      };
    });

    const allCampaignRecs: Recommendation[] = [];
    for (const c of campaignData) {
      const recs = recommendationEngine.generateCampaignRecommendations(c);
      allCampaignRecs.push(...recs);
    }
    const crossRecs = recommendationEngine.generateCrossCampaignRecommendations(campaignData);
    const banditRecs = recommendationEngine.generateBanditRecommendations(campaignData);

    const impactEstimates: ImpactEstimate[] = [...allCampaignRecs, ...crossRecs].map(rec => {
      const baseUplift = rec.type === "budget" ? 5000 : rec.type === "optimization" ? 3000 : rec.type === "creative" ? 2000 : rec.type === "platform" ? 4000 : 1500;
      const baseCostReduction = rec.type === "budget" ? 2000 : rec.type === "optimization" ? 1000 : rec.type === "creative" ? 500 : rec.type === "platform" ? 3000 : 800;
      const impactMultiplier = rec.impact === "high" ? 1.5 : rec.impact === "medium" ? 1.0 : 0.5;
      const effortPenalty = rec.effort === "high" ? 0.7 : rec.effort === "medium" ? 0.85 : 1.0;
      return {
        recommendationId: rec.id, title: rec.title, type: rec.type,
        estimatedRevenueUplift: Math.round(baseUplift * impactMultiplier * effortPenalty),
        estimatedCostReduction: Math.round(baseCostReduction * impactMultiplier * effortPenalty),
        netImpact: Math.round((baseUplift + baseCostReduction) * impactMultiplier * effortPenalty),
        confidence: Math.round((impactMultiplier * 0.4 + effortPenalty * 0.3 + (rec.impact === "high" ? 0.3 : 0.15)) * 100),
        timeToImplement: rec.effort === "low" ? "1-3 days" : rec.effort === "medium" ? "1-2 weeks" : "2-4 weeks",
      };
    });

    const impactMap = new Map(impactEstimates.map(e => [e.recommendationId, e]));
    const prioritizedRecs: RecommendationPriority[] = [...allCampaignRecs, ...crossRecs].map(rec => {
      const impact = impactMap.get(rec.id) || { recommendationId: rec.id, title: rec.title, type: rec.type, estimatedRevenueUplift: 0, estimatedCostReduction: 0, netImpact: 0, confidence: 50, timeToImplement: "unknown" };
      const priorityScore = Math.round((impact.netImpact / 100) * 0.5 + impact.confidence * 0.3 + (rec.impact === "high" ? 30 : rec.impact === "medium" ? 15 : 5));
      return { recommendation: rec, impact, priorityScore: Math.min(100, priorityScore), band: decisionEngine.label(decisionEngine.band(Math.min(100, priorityScore))) };
    });
    prioritizedRecs.sort((a, b) => b.priorityScore - a.priorityScore);

    const totalUplift = impactEstimates.reduce((s, e) => s + e.estimatedRevenueUplift, 0);
    const totalCostReduction = impactEstimates.reduce((s, e) => s + e.estimatedCostReduction, 0);
    const avgConfidence = impactEstimates.length > 0 ? Math.round(impactEstimates.reduce((s, e) => s + e.confidence, 0) / impactEstimates.length) : 0;

    const thresholds: AdaptiveThreshold[] = [];
    for (const key of ["roas_threshold", "ctr_threshold", "cvr_threshold", "cpc_threshold"]) {
      const currentVal = key === "roas_threshold" ? 2.0 : key === "ctr_threshold" ? 1.5 : key === "cvr_threshold" ? 2.5 : 1.5;
      for (let i = 0; i < 15; i++) {
        const hit = Math.random() > 0.6;
        recommendationEngine.tuneThreshold(key, currentVal, hit, 0.3, 0.05, 0.1, 100);
      }
      const state = recommendationEngine.getThresholdState(key);
      if (state) {
        thresholds.push({
          thresholdId: key, currentValue: currentVal,
          adjustedValue: state.threshold, successRate: state.successRate,
          direction: state.threshold > currentVal ? "tightened" : state.threshold < currentVal ? "loosened" : "unchanged",
        });
      }
    }

    const recommendations: string[] = [];
    if (prioritizedRecs.length > 0) recommendations.push(`Top pick: "${prioritizedRecs[0].recommendation.title}" (score ${prioritizedRecs[0].priorityScore}/100, impact $${prioritizedRecs[0].impact.netImpact}).`);
    const highImpact = prioritizedRecs.filter(r => r.recommendation.impact === "high");
    if (highImpact.length > 0) recommendations.push(`${highImpact.length} high-impact recommendations available — prioritize for maximum ROI.`);
    if (crossRecs.length > 0) recommendations.push(`${crossRecs.length} cross-campaign opportunities found — portfolio-level optimizations available.`);
    recommendations.push(`Bandit strategy selected: "${banditRecs.banditSelection.label}" — adaptive recommendation engine is running.`);

    return {
      generatedAt: new Date().toISOString(), campaignRecs: allCampaignRecs, crossCampaignRecs: crossRecs,
      banditRecs, prioritizedRecs, topPicks: prioritizedRecs.slice(0, 5),
      impactSummary: { totalEstimatedUplift: totalUplift, totalCostReduction, avgConfidence },
      adaptiveThresholds: thresholds, recommendations,
    };
  }
}

export const recommendationOrchestrator = new RecommendationOrchestrator();
