import { ConversionPath, IConversionPath } from "../models/ConversionPath";
import { Metric } from "../models/Metric";
import { decisionEngine } from "./DecisionEngine";

export interface AttributionReport {
  generatedAt: string;
  totalConversions: number;
  totalRevenue: number;
  totalPathCost: number;
  models: {
    firstTouch: AttributionModelResult;
    lastTouch: AttributionModelResult;
    linear: AttributionModelResult;
    positionBased: AttributionModelResult;
  };
  recommendedModel: string;
  campaignContributions: { campaignId: string; campaignName: string; firstTouch: number; lastTouch: number; linear: number; positionBased: number; avgContribution: number }[];
  platformMix: { platform: string; touchpoints: number; totalRevenue: number; share: number }[];
  conversionPathStats: { avgPathLength: number; avgTouchpoints: number; avgTimeToConversion: number; topChannels: { channel: string; count: number }[] };
}

export interface AttributionModelResult {
  model: string;
  attributedRevenue: number;
  attributedConversions: number;
  topCampaigns: { campaignId: string; campaignName: string; attributedRevenue: number; share: number }[];
}

export class AttributionOrchestrator {
  async generateReport(tenantId: string, days = 90): Promise<AttributionReport> {
    const mongoose = require("mongoose");
    const since = new Date(Date.now() - days * 86400000);
    const paths = await ConversionPath.find({ tenantId, conversionDate: { $gte: since } }).lean() as any[];
    const metrics = await Metric.find({ tenantId: new mongoose.Types.ObjectId(tenantId), date: { $gte: since } }).lean() as any[];

    const totals = paths.reduce((acc: any, p: any) => { acc.revenue += p.totalRevenue || 0; acc.cost += (p.touchpoints || []).reduce((s: number, t: any) => s + (t.cost || 0), 0); return acc; }, { revenue: 0, cost: 0 });

    const models = ["firstTouch", "lastTouch", "linear", "positionBased"] as const;
    const modelResults: Record<string, { revenue: number; conversions: number; campaignMap: Map<string, { name: string; revenue: number }> }> = {};
    for (const m of models) {
      modelResults[m] = { revenue: 0, conversions: 0, campaignMap: new Map() };
    }

    for (const p of paths) {
      const tps = p.touchpoints || [];
      if (tps.length === 0) continue;
      const campaignGroups: Record<string, { id: string; name: string; tps: any[] }> = {};
      for (const t of tps) {
        if (!campaignGroups[t.campaignId]) campaignGroups[t.campaignId] = { id: t.campaignId, name: t.campaignName, tps: [] };
        campaignGroups[t.campaignId].tps.push(t);
      }
      const groups = Object.values(campaignGroups);

      for (const model of models) {
        const mr = modelResults[model];
        const first = tps[0];
        const last = tps[tps.length - 1];
        const middle = tps.slice(1, -1);

        for (const g of groups) {
          let share = 0;
          if (model === "firstTouch") share = g.tps.includes(first) ? 1 : 0;
          else if (model === "lastTouch") share = g.tps.includes(last) ? 1 : 0;
          else if (model === "linear") share = g.tps.length / tps.length;
          else if (model === "positionBased") { let s = 0; if (g.tps.includes(first)) s += 0.4; if (g.tps.includes(last)) s += 0.4; s += 0.2 * (g.tps.filter(t => middle.includes(t)).length / Math.max(1, middle.length)); share = s; }

          const attrRevenue = p.totalRevenue * share;
          mr.revenue += attrRevenue;
          if (share > 0) mr.conversions += share;
          if (!mr.campaignMap.has(g.id)) mr.campaignMap.set(g.id, { name: g.name, revenue: 0 });
          mr.campaignMap.get(g.id)!.revenue += attrRevenue;
        }
      }
    }

    const buildModelResult = (model: string, mr: typeof modelResults[string]): AttributionModelResult => {
      const sorted = Array.from(mr.campaignMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10);
      const total = sorted.reduce((s, [, v]) => s + v.revenue, 0);
      return { model, attributedRevenue: Math.round(mr.revenue * 100) / 100, attributedConversions: Math.round(mr.conversions), topCampaigns: sorted.map(([campaignId, v]) => ({ campaignId, campaignName: v.name, attributedRevenue: Math.round(v.revenue * 100) / 100, share: total > 0 ? Math.round((v.revenue / total) * 10000) / 100 : 0 })) };
    };

    const firstTouch = buildModelResult("firstTouch", modelResults.firstTouch);
    const lastTouch = buildModelResult("lastTouch", modelResults.lastTouch);
    const linear = buildModelResult("linear", modelResults.linear);
    const positionBased = buildModelResult("positionBased", modelResults.positionBased);

    const modelScores = [
      { name: "firstTouch", score: firstTouch.attributedConversions * 0.3 + firstTouch.topCampaigns.reduce((s, c) => s + c.share, 0) * 0.1 },
      { name: "lastTouch", score: lastTouch.attributedConversions * 0.3 + lastTouch.topCampaigns.reduce((s, c) => s + c.share, 0) * 0.1 },
      { name: "linear", score: linear.attributedConversions * 0.3 + linear.topCampaigns.reduce((s, c) => s + c.share, 0) * 0.1 },
      { name: "positionBased", score: positionBased.attributedConversions * 0.3 + positionBased.topCampaigns.reduce((s, c) => s + c.share, 0) * 0.1 },
    ];
    modelScores.sort((a, b) => b.score - a.score);

    const allCampaignIds = new Set<string>();
    for (const m of [firstTouch, lastTouch, linear, positionBased]) { for (const c of m.topCampaigns) allCampaignIds.add(c.campaignId); }
    const campaignContributions = Array.from(allCampaignIds).map(cid => {
      const ft = firstTouch.topCampaigns.find(c => c.campaignId === cid);
      const lt = lastTouch.topCampaigns.find(c => c.campaignId === cid);
      const ln = linear.topCampaigns.find(c => c.campaignId === cid);
      const pb = positionBased.topCampaigns.find(c => c.campaignId === cid);
      const vals = [ft?.attributedRevenue || 0, lt?.attributedRevenue || 0, ln?.attributedRevenue || 0, pb?.attributedRevenue || 0];
      return { campaignId: cid, campaignName: ft?.campaignName || lt?.campaignName || ln?.campaignName || pb?.campaignName || cid, firstTouch: ft?.attributedRevenue || 0, lastTouch: lt?.attributedRevenue || 0, linear: ln?.attributedRevenue || 0, positionBased: pb?.attributedRevenue || 0, avgContribution: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 100) / 100 };
    });

    const platformMixData: Record<string, { touchpoints: number; revenue: number }> = {};
    for (const p of paths) { for (const t of p.touchpoints || []) { if (!platformMixData[t.platform]) platformMixData[t.platform] = { touchpoints: 0, revenue: 0 }; platformMixData[t.platform].touchpoints++; platformMixData[t.platform].revenue += t.revenue || 0; } }
    const totalRevenue = Object.values(platformMixData).reduce((s, v) => s + v.revenue, 0);
    const platformMix = Object.entries(platformMixData).map(([platform, v]) => ({ platform, touchpoints: v.touchpoints, totalRevenue: Math.round(v.revenue * 100) / 100, share: totalRevenue > 0 ? Math.round((v.revenue / totalRevenue) * 10000) / 100 : 0 })).sort((a, b) => b.touchpoints - a.touchpoints);

    const avgPathLength = paths.length > 0 ? Math.round(paths.reduce((s: number, p: any) => s + p.touchpoints.length, 0) / paths.length * 100) / 100 : 0;
    const daysToConversion = paths.filter((p: any) => p.touchpoints.length >= 2).map((p: any) => Math.round((new Date(p.conversionDate).getTime() - new Date(p.touchpoints[0].timestamp).getTime()) / 86400000));
    const avgTimeToConversion = daysToConversion.length > 0 ? Math.round(daysToConversion.reduce((s: number, d: number) => s + d, 0) / daysToConversion.length * 10) / 10 : 0;
    const channelCounts: Record<string, number> = {};
    for (const p of paths) { for (const t of p.touchpoints || []) { channelCounts[t.channel] = (channelCounts[t.channel] || 0) + 1; } }
    const topChannels = Object.entries(channelCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([channel, count]) => ({ channel, count }));

    return {
      generatedAt: new Date().toISOString(), totalConversions: paths.length, totalRevenue: Math.round(totals.revenue * 100) / 100, totalPathCost: Math.round(totals.cost * 100) / 100,
      models: { firstTouch, lastTouch, linear, positionBased },
      recommendedModel: modelScores[0]?.name || "linear",
      campaignContributions: campaignContributions.sort((a, b) => b.avgContribution - a.avgContribution),
      platformMix, conversionPathStats: { avgPathLength, avgTouchpoints: avgPathLength, avgTimeToConversion, topChannels },
    };
  }
}

export const attributionOrchestrator = new AttributionOrchestrator();
