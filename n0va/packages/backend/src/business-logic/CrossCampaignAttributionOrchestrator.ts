import { Metric } from "../models/Metric";
import { Campaign } from "../models/Campaign";
import { decisionEngine } from "./DecisionEngine";

export interface CampaignTouchpoint {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  firstTouch: number;
  lastTouch: number;
  linearShare: number;
}

export interface PairwiseInteraction {
  campaignA: { id: string; name: string; spend: number; roas: number };
  campaignB: { id: string; name: string; spend: number; roas: number };
  overlapScore: number;
  interactionType: "cannibalizing" | "halo" | "independent";
  interactionStrength: "strong" | "moderate" | "weak";
  estimatedImpact: number;
  recommendation: string;
}

export interface AttributionMatrix {
  campaignA: string;
  campaignB: string;
  campaignAIsolatedROAS: number;
  campaignBIsolatedROAS: number;
  combinedROAS: number;
  synergy: number;
  synergyType: string;
}

export interface CrossCampaignReport {
  generatedAt: string;
  pairwiseInteractions: PairwiseInteraction[];
  attributionMatrices: AttributionMatrix[];
  netIncrementalImpact: number;
  totalCannibalizationLoss: number;
  totalHaloGain: number;
  recommendations: string[];
}

export class CrossCampaignAttributionOrchestrator {
  async analyze(tenantId: string, campaignIds?: string[]): Promise<CrossCampaignReport> {
    const mongoose = require("mongoose");
    const filter: any = { tenantId: new mongoose.Types.ObjectId(tenantId) };
    let campaigns: any[] = await Campaign.find(filter).lean() as any[];
    if (campaignIds && campaignIds.length > 0) {
      const objIds = campaignIds.map(id => new mongoose.Types.ObjectId(id));
      campaigns = campaigns.filter((c: any) => objIds.some((oid: any) => oid.equals(c._id)));
    }
    if (campaigns.length < 2) throw new Error("At least 2 campaigns required for cross-campaign analysis");

    const metrics = await Metric.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).sort({ date: -1 }).limit(20000).lean() as any[];
    const cmap: Record<string, any> = {};
    for (const c of campaigns) cmap[c._id.toString()] = c;

    const campaignPerf: Record<string, { spend: number; revenue: number; impressions: number; clicks: number; conversions: number }> = {};
    for (const c of campaigns) {
      const cid = c._id.toString();
      campaignPerf[cid] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
    }
    for (const m of metrics) {
      const cid = m.campaignId?.toString();
      if (cid && campaignPerf[cid]) {
        campaignPerf[cid].spend += m.spend || 0;
        campaignPerf[cid].revenue += m.revenue || 0;
        campaignPerf[cid].impressions += m.impressions || 0;
        campaignPerf[cid].clicks += m.clicks || 0;
        campaignPerf[cid].conversions += m.conversions || 0;
      }
    }

    const dateAlignment: Record<string, Record<string, { spend: number; revenue: number }>> = {};
    for (const m of metrics) {
      const cid = m.campaignId?.toString();
      if (cid && campaignPerf[cid]) {
        const d = m.date ? new Date(m.date).toISOString().slice(0, 10) : "unknown";
        if (!dateAlignment[cid]) dateAlignment[cid] = {};
        if (!dateAlignment[cid][d]) dateAlignment[cid][d] = { spend: 0, revenue: 0 };
        dateAlignment[cid][d].spend += m.spend || 0;
        dateAlignment[cid][d].revenue += m.revenue || 0;
      }
    }

    const campaignIdsList = Object.keys(campaignPerf);
    const pairwiseInteractions: PairwiseInteraction[] = [];
    const attributionMatrices: AttributionMatrix[] = [];

    for (let i = 0; i < campaignIdsList.length; i++) {
      for (let j = i + 1; j < campaignIdsList.length; j++) {
        const aId = campaignIdsList[i], bId = campaignIdsList[j];
        const aName = cmap[aId]?.name || aId, bName = cmap[bId]?.name || bId;

        const aDates = new Set(Object.keys(dateAlignment[aId] || {}));
        const bDates = new Set(Object.keys(dateAlignment[bId] || {}));
        const commonDates = [...aDates].filter(d => bDates.has(d));
        const totalDays = Math.max(aDates.size, bDates.size, 1);
        const overlapScore = Math.round((commonDates.length / totalDays) * 100);

        const aPerf = campaignPerf[aId], bPerf = campaignPerf[bId];
        const aRoas = aPerf.spend > 0 ? aPerf.revenue / aPerf.spend : 0;
        const bRoas = bPerf.spend > 0 ? bPerf.revenue / bPerf.spend : 0;

        const combinedSpend = aPerf.spend + bPerf.spend;
        const combinedRevenue = aPerf.revenue + bPerf.revenue;
        const combinedRoas = combinedSpend > 0 ? combinedRevenue / combinedSpend : 0;
        const weightedIsolatedRoas = (aRoas * aPerf.spend + bRoas * bPerf.spend) / Math.max(1, combinedSpend);

        const synergy = combinedRoas - weightedIsolatedRoas;
        const synergyPct = weightedIsolatedRoas > 0 ? Math.round((synergy / weightedIsolatedRoas) * 10000) / 100 : 0;

        let interactionType: "cannibalizing" | "halo" | "independent";
        let interactionStrength: "strong" | "moderate" | "weak";
        if (synergyPct < -10 && overlapScore > 30) {
          interactionType = "cannibalizing";
          interactionStrength = Math.abs(synergyPct) > 25 ? "strong" : "moderate";
        } else if (synergyPct > 10 && overlapScore > 20) {
          interactionType = "halo";
          interactionStrength = synergyPct > 25 ? "strong" : "moderate";
        } else {
          interactionType = "independent";
          interactionStrength = "weak";
        }

        const estimatedImpact = Math.round(synergy * combinedSpend * 100) / 100;
        let recommendation: string;
        if (interactionType === "cannibalizing") recommendation = `Reduce overlap between "${aName}" and "${bName}" (${overlapScore}% date overlap). Consider consolidating or differentiating targeting.`;
        else if (interactionType === "halo") recommendation = `Pair "${aName}" and "${bName}" shows ${synergyPct}% synergy. Consider running them concurrently in future campaigns.`;
        else recommendation = `Campaigns "${aName}" and "${bName}" appear independent. No action needed.`;

        pairwiseInteractions.push({
          campaignA: { id: aId, name: aName, spend: aPerf.spend, roas: Math.round(aRoas * 100) / 100 },
          campaignB: { id: bId, name: bName, spend: bPerf.spend, roas: Math.round(bRoas * 100) / 100 },
          overlapScore, interactionType, interactionStrength,
          estimatedImpact, recommendation,
        });

        attributionMatrices.push({
          campaignA: aName, campaignB: bName,
          campaignAIsolatedROAS: Math.round(aRoas * 100) / 100,
          campaignBIsolatedROAS: Math.round(bRoas * 100) / 100,
          combinedROAS: Math.round(combinedRoas * 100) / 100,
          synergy: Math.round(synergy * 100) / 100,
          synergyType: interactionType,
        });
      }
    }

    pairwiseInteractions.sort((a, b) => Math.abs(b.estimatedImpact) - Math.abs(a.estimatedImpact));
    const cannibalizing = pairwiseInteractions.filter(p => p.interactionType === "cannibalizing");
    const halo = pairwiseInteractions.filter(p => p.interactionType === "halo");
    const totalCannibalizationLoss = cannibalizing.reduce((s, p) => s + Math.abs(p.estimatedImpact), 0);
    const totalHaloGain = halo.reduce((s, p) => s + Math.max(0, p.estimatedImpact), 0);
    const netIncrementalImpact = totalHaloGain - totalCannibalizationLoss;

    const recommendations: string[] = [];
    if (cannibalizing.length > 0) {
      const worst = cannibalizing[0];
      recommendations.push(`CRITICAL: "${worst.campaignA.name}" is cannibalizing "${worst.campaignB.name}" (impact: ${worst.estimatedImpact}). Consolidate immediately.`);
    }
    if (halo.length > 0) {
      const best = halo[0];
      recommendations.push(`OPPORTUNITY: "${best.campaignA.name}" + "${best.campaignB.name}" synergy of ${best.estimatedImpact}. Plan concurrent runs.`);
    }
    if (netIncrementalImpact > 0) recommendations.push(`Net halo effect of $${Math.round(netIncrementalImpact)} positive — portfolio synergy > cannibalization.`);
    else recommendations.push(`Net cannibalization loss of $${Math.abs(Math.round(netIncrementalImpact))} — review campaign portfolio for consolidation opportunities.`);

    return {
      generatedAt: new Date().toISOString(),
      pairwiseInteractions: pairwiseInteractions.slice(0, 20),
      attributionMatrices: attributionMatrices.slice(0, 20),
      netIncrementalImpact: Math.round(netIncrementalImpact * 100) / 100,
      totalCannibalizationLoss: Math.round(totalCannibalizationLoss * 100) / 100,
      totalHaloGain: Math.round(totalHaloGain * 100) / 100,
      recommendations,
    };
  }
}

export const crossCampaignAttributionOrchestrator = new CrossCampaignAttributionOrchestrator();
