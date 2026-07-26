import { campaignSummary } from "../services/CampaignSummaryService";
import { DataStore } from "../services/DataStore";
import { decisionEngine } from "./DecisionEngine";

export interface CampaignInsightDigest {
  campaignName: string;
  shortSummary: string;
  insightCount: number;
  riskCount: number;
  recommendationCount: number;
  healthBand: string;
}

export interface PortfolioNarrative {
  totalCampaigns: number;
  activeCount: number;
  overallROAS: number;
  summary: string;
  topPerformers: string[];
  needsAttention: string[];
  momentum: string;
  roasDistribution: { range: string; count: number }[];
  spendConcentration: number;
  diversityScore: number;
}

export interface SummaryDashboard {
  campaignDigests: CampaignInsightDigest[];
  portfolio: PortfolioNarrative;
  atRiskCampaigns: string[];
  topRisks: string[];
  topRecommendations: string[];
  healthBand: string;
}

export class CampaignSummaryOrchestrator {
  async getPortfolioSummary(tenantId: string): Promise<SummaryDashboard> {
    const campaigns = await DataStore.findCampaigns({ tenantId });
    const campaignsArr = ("campaigns" in campaigns && Array.isArray((campaigns as any).campaigns) ? (campaigns as any).campaigns : Array.isArray(campaigns) ? campaigns : []) as any[];
    const metrics = (await DataStore.findMetrics({ tenantId })) as any[];
    const metricsArr = Array.isArray(metrics) ? metrics : [];

    const inputs = campaignsArr.map((c: any) => {
      const m = metricsArr.find((mt: any) => mt.campaignId === (c._id || c.id));
      return {
        name: c.name || "Unknown", status: c.status || "draft", type: c.type || "performance",
        platforms: c.platforms || [],
        budget: c.budget || { daily: 0, lifetime: 0, spent: 0, remaining: 0 },
        metrics: m ? {
          impressions: Number(m.impressions) || 0, clicks: Number(m.clicks) || 0,
          conversions: Number(m.conversions) || 0, spend: Number(m.spend) || 0,
          revenue: Number(m.revenue) || 0, ctr: Number(m.ctr) || 0, cpc: Number(m.cpc) || 0,
          roas: Number(m.roas) || 0, cvr: Number(m.cvr) || 0,
        } : undefined,
        startDate: c.startDate, endDate: c.endDate, tags: c.tags,
      };
    });

    const summaries = campaignSummary.generateAll(inputs);
    const portfolio = campaignSummary.generatePortfolioSummary(inputs);
    const trendPeriods = [{ label: "first", metrics: { roas: 1.5, ctr: 2.0, cvr: 2.5, spend: 1000 } }];
    for (const c of inputs) {
      if (c.metrics) {
        trendPeriods.push({ label: c.name, metrics: { roas: c.metrics.roas, ctr: c.metrics.ctr, cvr: c.metrics.cvr, spend: c.metrics.spend } });
      }
    }
    const trend = trendPeriods.length > 2 ? campaignSummary.trendNarrative(trendPeriods) : null;
    const dist = (portfolio as any)._distribution as any;

    const campaignDigests: CampaignInsightDigest[] = summaries.map(s => ({
      campaignName: s.campaignName,
      shortSummary: s.shortSummary,
      insightCount: s.keyInsights.length,
      riskCount: s.risks.length,
      recommendationCount: s.recommendations.length,
      healthBand: decisionEngine.label(decisionEngine.band(s.risks.length === 0 ? 80 : s.risks.length <= 2 ? 60 : 40)),
    }));

    const allRisks = summaries.flatMap(s => s.risks);
    const riskFreq: Record<string, number> = {};
    for (const r of allRisks) riskFreq[r] = (riskFreq[r] || 0) + 1;
    const topRisks = Object.entries(riskFreq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([risk]) => risk);

    const allRecs = summaries.flatMap(s => s.recommendations);
    const recFreq: Record<string, number> = {};
    for (const r of allRecs) recFreq[r] = (recFreq[r] || 0) + 1;
    const topRecommendations = Object.entries(recFreq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([rec]) => rec);

    const atRiskCampaigns = summaries.filter(s => s.risks.length >= 2).map(s => s.campaignName);

    return {
      campaignDigests,
      portfolio: {
        totalCampaigns: portfolio.totalCampaigns,
        activeCount: portfolio.activeCount,
        overallROAS: portfolio.overallROAS,
        summary: portfolio.summary,
        topPerformers: portfolio.topPerformers,
        needsAttention: portfolio.needsAttention,
        momentum: trend?.overallMomentum || "neutral",
        roasDistribution: dist?.roasDistribution?.map((r: any) => ({ range: r.range, count: r.count })) || [],
        spendConcentration: dist?.spendConcentration?.top3Percent || 0,
        diversityScore: dist?.diversityScore || 0,
      },
      atRiskCampaigns,
      topRisks,
      topRecommendations,
      healthBand: decisionEngine.label(decisionEngine.band(Math.round(portfolio.overallROAS * 25 + portfolio.activeCount * 2))),
    };
  }
}

export const campaignSummaryOrchestrator = new CampaignSummaryOrchestrator();
