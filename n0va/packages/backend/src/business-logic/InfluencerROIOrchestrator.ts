import { Metric } from "../models/Metric";
import { Campaign } from "../models/Campaign";
import { influencerService } from "../services/InfluencerService";
import { decisionEngine } from "./DecisionEngine";

export interface InfluencerPerformance {
  influencerId: string;
  name: string;
  handle: string;
  platform: string;
  followers: number;
  engagementRate: number;
  totalSpend: number;
  totalRevenue: number;
  roas: number;
  costPerEngagement: number;
  costPerConversion: number;
  categoryAlignment: number;
  audienceOverlap: number;
  qualityScore: number;
  qualityBand: string;
  campaignCount: number;
}

export interface PlatformBenchmark {
  platform: string;
  avgROAS: number;
  avgEngagementRate: number;
  avgCPE: number;
  influencerCount: number;
}

export interface InfluencerROIReport {
  generatedAt: string;
  influencers: InfluencerPerformance[];
  topPerformers: InfluencerPerformance[];
  underperformers: InfluencerPerformance[];
  platformBenchmarks: PlatformBenchmark[];
  bestPlatform: PlatformBenchmark | null;
  worstPlatform: PlatformBenchmark | null;
  portfolioInfluencerROAS: number;
  portfolioSpend: number;
  portfolioRevenue: number;
  recommendations: string[];
}

export class InfluencerROIOrchestrator {
  async analyze(tenantId: string): Promise<InfluencerROIReport> {
    const mongoose = require("mongoose");
    const campaignInfluencers = influencerService.getAllCampaignInfluencers(tenantId);
    const influencers = influencerService.search({});

    const campaignIds = [...new Set(campaignInfluencers.map((ci: any) => ci.campaignId).filter(Boolean))];
    const campaigns = await Campaign.find({ _id: { $in: campaignIds.map((id: string) => new mongoose.Types.ObjectId(id)) }, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean() as any[];
    const campaignMap: Record<string, any> = {};
    for (const c of campaigns) campaignMap[c._id.toString()] = c;

    const influencerIds = [...new Set(campaignInfluencers.map((ci: any) => ci.influencerId).filter(Boolean))];
    const infMap: Record<string, any> = {};
    for (const inf of influencers) infMap[inf.id] = inf;

    const byInfluencer: Record<string, { spend: number; revenue: number; campaigns: Set<string>; conversions: number; engagements: number }> = {};
    for (const ci of campaignInfluencers) {
      const infId = ci.influencerId;
      if (!infId) continue;
      if (!byInfluencer[infId]) byInfluencer[infId] = { spend: 0, revenue: 0, campaigns: new Set(), conversions: 0, engagements: 0 };
      byInfluencer[infId].spend += ci.compensation || 0;
      byInfluencer[infId].revenue += ci.performance?.revenue || 0;
      byInfluencer[infId].conversions += ci.performance?.conversions || 0;
      byInfluencer[infId].engagements += ci.performance?.engagements || 0;
      byInfluencer[infId].campaigns.add(ci.campaignId);
    }

    const metrics = await Metric.find({ tenantId: new mongoose.Types.ObjectId(tenantId), campaignId: { $in: campaignIds.map((id: string) => new mongoose.Types.ObjectId(id)) } }).lean() as any[];

    const infPerformance: InfluencerPerformance[] = Object.entries(byInfluencer).map(([infId, data]) => {
      const inf = infMap[infId];
      const metricsForCampaigns = metrics.filter(m => data.campaigns.has(m.campaignId?.toString()));
      const totalCampaignSpend = metricsForCampaigns.reduce((s: number, m: any) => s + (m.spend || 0), 0);
      const totalCampaignRevenue = metricsForCampaigns.reduce((s: number, m: any) => s + (m.revenue || 0), 0);
      const impressions = metricsForCampaigns.reduce((s: number, m: any) => s + (m.impressions || 0), 0);

      const roas = data.spend > 0 ? Math.round((data.revenue / data.spend) * 100) / 100 : 0;
      const cpe = data.engagements > 0 ? Math.round((data.spend / data.engagements) * 100) / 100 : 0;
      const cpc = data.conversions > 0 ? Math.round((data.spend / data.conversions) * 100) / 100 : 0;

      const followers = inf?.followers || 0;
      const engagementRate = inf?.engagementRate || 0;
      const categoryAlignment = followers > 0 ? Math.min(100, Math.round((engagementRate / 5) * 50 + Math.min(1, data.campaigns.size / 5) * 30 + (roas / 5) * 20)) : 30;
      const audienceOverlap = followers > 100000 ? 30 : followers > 10000 ? 15 : 5;
      const qualityScore = Math.round((Math.min(100, roas * 20) * 0.35 + categoryAlignment * 0.25 + (100 - Math.min(100, cpe * 2)) * 0.2 + Math.min(100, engagementRate * 20) * 0.2));
      const qualityBand = decisionEngine.label(decisionEngine.band(qualityScore));

      return {
        influencerId: infId, name: inf?.name || ciName(infId, campaignInfluencers), handle: inf?.handle || "",
        platform: inf?.platform || "unknown", followers, engagementRate,
        totalSpend: data.spend, totalRevenue: data.revenue, roas, costPerEngagement: cpe,
        costPerConversion: cpc, categoryAlignment, audienceOverlap, qualityScore, qualityBand,
        campaignCount: data.campaigns.size,
      };
    });

    function ciName(id: string, list: any[]): string {
      const found = list.find((ci: any) => ci.influencerId === id);
      return found?.influencerName || id;
    }

    infPerformance.sort((a, b) => b.qualityScore - a.qualityScore);
    const topPerformers = infPerformance.filter(i => i.roas >= 2).slice(0, 5);
    const underperformers = infPerformance.filter(i => i.roas < 1 && i.totalSpend > 0).sort((a, b) => a.roas - b.roas);

    const platformGroups: Record<string, { roas: number; engagementRate: number; cpe: number; count: number }> = {};
    for (const inf of infPerformance) {
      if (!platformGroups[inf.platform]) platformGroups[inf.platform] = { roas: 0, engagementRate: 0, cpe: 0, count: 0 };
      platformGroups[inf.platform].roas += inf.roas;
      platformGroups[inf.platform].engagementRate += inf.engagementRate;
      platformGroups[inf.platform].cpe += inf.costPerEngagement;
      platformGroups[inf.platform].count++;
    }
    const platformBenchmarks: PlatformBenchmark[] = Object.entries(platformGroups).map(([platform, data]) => ({
      platform, influencerCount: data.count,
      avgROAS: Math.round((data.roas / data.count) * 100) / 100,
      avgEngagementRate: Math.round((data.engagementRate / data.count) * 100) / 100,
      avgCPE: Math.round((data.cpe / data.count) * 100) / 100,
    }));
    platformBenchmarks.sort((a, b) => b.avgROAS - a.avgROAS);

    const bestPlatform = platformBenchmarks[0] || null;
    const worstPlatform = platformBenchmarks.length > 1 ? platformBenchmarks[platformBenchmarks.length - 1] : null;

    const portfolioSpend = infPerformance.reduce((s, i) => s + i.totalSpend, 0);
    const portfolioRevenue = infPerformance.reduce((s, i) => s + i.totalRevenue, 0);
    const portfolioInfluencerROAS = portfolioSpend > 0 ? Math.round((portfolioRevenue / portfolioSpend) * 100) / 100 : 0;

    const recommendations: string[] = [];
    if (topPerformers.length > 0) recommendations.push(`Top influencer: "${topPerformers[0].name}" (ROAS ${topPerformers[0].roas}x, quality ${topPerformers[0].qualityScore}). Prioritize for future campaigns.`);
    if (underperformers.length > 0) recommendations.push(`${underperformers.length} influencer(s) with ROAS <1x. Review performance before renewing contracts.`);
    if (bestPlatform) recommendations.push(`Best platform: ${bestPlatform.platform} (avg ROAS ${bestPlatform.avgROAS}x). Focus influencer recruitment here.`);
    if (worstPlatform && bestPlatform && worstPlatform.avgROAS < bestPlatform.avgROAS * 0.5) recommendations.push(`Platform "${worstPlatform.platform}" underperforming (${worstPlatform.avgROAS}x vs ${bestPlatform.avgROAS}x). Reduce investment.`);

    return {
      generatedAt: new Date().toISOString(), influencers: infPerformance,
      topPerformers, underperformers, platformBenchmarks, bestPlatform, worstPlatform,
      portfolioInfluencerROAS, portfolioSpend, portfolioRevenue, recommendations,
    };
  }
}

export const influencerROIOrchestrator = new InfluencerROIOrchestrator();
