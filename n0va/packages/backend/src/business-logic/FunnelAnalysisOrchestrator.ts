import { Metric } from "../models/Metric";
import { Campaign } from "../models/Campaign";
import { decisionEngine } from "./DecisionEngine";

export interface FunnelStage {
  name: string;
  count: number;
  value: number;
  conversionRate: number;
  dropOff: number;
  dropOffRate: number;
}

export interface FunnelReport {
  generatedAt: string;
  campaignId?: string;
  stages: FunnelStage[];
  topDropOff: { from: string; to: string; dropOffRate: number } | null;
  overallConversionRate: number;
  totalEntered: number;
  totalConverted: number;
  totalValue: number;
  recommendations: string[];
}

export class FunnelAnalysisOrchestrator {
  async analyzeCampaignFunnel(campaignId: string, tenantId: string): Promise<FunnelReport> {
    const mongoose = require("mongoose");
    const metrics = await Metric.find({ campaignId: new mongoose.Types.ObjectId(campaignId), tenantId: new mongoose.Types.ObjectId(tenantId) }).lean() as any[];

    const totals = metrics.reduce((acc: any, m: any) => { acc.impressions += m.impressions || 0; acc.clicks += m.clicks || 0; acc.conversions += m.conversions || 0; acc.revenue += m.revenue || 0; return acc; }, { impressions: 0, clicks: 0, conversions: 0, revenue: 0 });

    const impressionsIn = totals.impressions;
    const clicksIn = totals.clicks;
    const conversionsIn = totals.conversions;

    const stages: FunnelStage[] = [
      { name: "Impressions", count: impressionsIn, value: 0, conversionRate: 100, dropOff: 0, dropOffRate: 0 },
      { name: "Clicks", count: clicksIn, value: 0, conversionRate: impressionsIn > 0 ? Math.round((clicksIn / impressionsIn) * 10000) / 100 : 0, dropOff: impressionsIn - clicksIn, dropOffRate: impressionsIn > 0 ? Math.round(((impressionsIn - clicksIn) / impressionsIn) * 10000) / 100 : 0 },
      { name: "Conversions", count: conversionsIn, value: Math.round(totals.revenue * 100) / 100, conversionRate: clicksIn > 0 ? Math.round((conversionsIn / clicksIn) * 10000) / 100 : 0, dropOff: clicksIn - conversionsIn, dropOffRate: clicksIn > 0 ? Math.round(((clicksIn - conversionsIn) / clicksIn) * 10000) / 100 : 0 },
    ];

    let maxDropOffIdx = -1, maxDropOff = 0;
    for (let i = 1; i < stages.length; i++) {
      if (stages[i].dropOffRate > maxDropOff) { maxDropOff = stages[i].dropOffRate; maxDropOffIdx = i; }
    }

    const topDropOff = maxDropOffIdx > 0 ? { from: stages[maxDropOffIdx - 1].name, to: stages[maxDropOffIdx].name, dropOffRate: maxDropOff } : null;
    const overallConversionRate = impressionsIn > 0 ? Math.round((conversionsIn / impressionsIn) * 10000) / 100 : 0;

    const recommendations: string[] = [];
    if (stages[1].dropOffRate > 80) recommendations.push(`High drop-off at Impression→Click stage (${stages[1].dropOffRate}%). Review creative relevance and targeting.`);
    if (stages[2].dropOffRate > 80) recommendations.push(`High drop-off at Click→Conversion stage (${stages[2].dropOffRate}%). Optimize landing page and conversion flow.`);
    if (overallConversionRate < 1) recommendations.push(`Overall conversion rate of ${overallConversionRate}% is below 1% benchmark. Consider full funnel audit.`);

    return {
      generatedAt: new Date().toISOString(), campaignId, stages, topDropOff, overallConversionRate,
      totalEntered: impressionsIn, totalConverted: conversionsIn, totalValue: Math.round(totals.revenue * 100) / 100, recommendations,
    };
  }

  async analyzePortfolioFunnel(tenantId: string): Promise<FunnelReport> {
    const metrics = await Metric.find({ tenantId: new (require("mongoose").Types.ObjectId)(tenantId) }).lean() as any[];
    const campaigns = await Campaign.find({ tenantId: new (require("mongoose").Types.ObjectId)(tenantId) }).lean();

    const totals = metrics.reduce((acc: any, m: any) => { acc.impressions += m.impressions || 0; acc.clicks += m.clicks || 0; acc.conversions += m.conversions || 0; acc.revenue += m.revenue || 0; return acc; }, { impressions: 0, clicks: 0, conversions: 0, revenue: 0 });

    const stages: FunnelStage[] = [
      { name: "Impressions", count: totals.impressions, value: 0, conversionRate: 100, dropOff: 0, dropOffRate: 0 },
      { name: "Clicks", count: totals.clicks, value: 0, conversionRate: totals.impressions > 0 ? Math.round((totals.clicks / totals.impressions) * 10000) / 100 : 0, dropOff: totals.impressions - totals.clicks, dropOffRate: totals.impressions > 0 ? Math.round(((totals.impressions - totals.clicks) / totals.impressions) * 10000) / 100 : 0 },
      { name: "Conversions", count: totals.conversions, value: Math.round(totals.revenue * 100) / 100, conversionRate: totals.clicks > 0 ? Math.round((totals.conversions / totals.clicks) * 10000) / 100 : 0, dropOff: totals.clicks - totals.conversions, dropOffRate: totals.clicks > 0 ? Math.round(((totals.clicks - totals.conversions) / totals.clicks) * 10000) / 100 : 0 },
    ];

    const overallConversionRate = totals.impressions > 0 ? Math.round((totals.conversions / totals.impressions) * 10000) / 100 : 0;

    const recommendations: string[] = [];
    if (stages[1].dropOffRate > 80) recommendations.push(`Portfolio-wide impression-to-click drop-off of ${stages[1].dropOffRate}%. Review creative strategy across campaigns.`);
    if (stages[2].dropOffRate > 80) recommendations.push(`Portfolio-wide click-to-conversion drop-off of ${stages[2].dropOffRate}%. Audit landing pages and conversion paths.`);
    recommendations.push(`Portfolio funnel spans ${campaigns.length} campaigns with ${totals.impressions.toLocaleString()} total impressions.`);

    return {
      generatedAt: new Date().toISOString(), stages, topDropOff: null, overallConversionRate,
      totalEntered: totals.impressions, totalConverted: totals.conversions, totalValue: Math.round(totals.revenue * 100) / 100, recommendations,
    };
  }
}

export const funnelAnalysisOrchestrator = new FunnelAnalysisOrchestrator();
