import { Creative } from "../models/Creative";
import { Metric } from "../models/Metric";
import { creativeOptimizer } from "../services/CreativeOptimizer";
import { decisionEngine } from "./DecisionEngine";

export interface CreativeHealth {
  creativeId: string;
  name: string;
  type: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: number;
  fatigueScore: number;
  fatigueLevel: "fresh" | "moderate" | "fatigued" | "stale";
  daysSinceLastUse: number;
  recommendation: "none" | "refresh" | "rotate" | "retire";
  urgency: "none" | "low" | "medium" | "high";
}

export interface CreativeRefreshPlan {
  generatedAt: string;
  totalCreatives: number;
  activeCount: number;
  fatiguedCount: number;
  needsRefreshCount: number;
  avgFatigueScore: number;
  creativeHealth: CreativeHealth[];
  recommendations: { creativeName: string; action: string; priority: string }[];
}

export class CreativeLifecycleOrchestrator {
  async assessCreativeHealth(tenantId: string): Promise<CreativeRefreshPlan> {
    const mongoose = require("mongoose");
    const creatives = await Creative.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean() as any[];
    const recentMetrics = await Metric.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).sort({ date: -1 }).limit(5000).lean() as any[];

    const creativeMetrics: Record<string, { impressions: number; clicks: number; lastUsed: Date | null }> = {};
    for (const m of recentMetrics) {
      const key = m.campaignId?.toString() || "unknown";
      if (!creativeMetrics[key]) creativeMetrics[key] = { impressions: 0, clicks: 0, lastUsed: null };
      creativeMetrics[key].impressions += m.impressions || 0;
      creativeMetrics[key].clicks += m.clicks || 0;
      if (!creativeMetrics[key].lastUsed || new Date(m.date) > creativeMetrics[key].lastUsed) creativeMetrics[key].lastUsed = new Date(m.date);
    }

    const now = Date.now();
    const creativeHealth: CreativeHealth[] = creatives.map(c => {
      const ctr = c.performance?.impressions > 0 ? c.performance.clicks / c.performance.impressions : 0;
      const lastUsed = creativeMetrics[c._id.toString()]?.lastUsed || c.updatedAt || c.createdAt;
      const daysSinceLastUse = Math.round((now - new Date(lastUsed).getTime()) / 86400000);
      const fatigueScore = c.performance?.impressions
        ? Math.min(100, Math.round((100 - ctr * 5000) + Math.max(0, 30 - daysSinceLastUse) * 2 + Math.log10(Math.max(1, c.performance.impressions)) * 8))
        : c.status === "active" ? 30 : 10;
      const band = decisionEngine.band(100 - fatigueScore, { excellent: 80, good: 60, fair: 40, poor: 20 });
      const fatigueLevel: "fresh" | "moderate" | "fatigued" | "stale" = band === "excellent" ? "fresh" : band === "good" ? "moderate" : band === "fair" ? "fatigued" : "stale";

      let recommendation: "none" | "refresh" | "rotate" | "retire" = "none";
      let urgency: "none" | "low" | "medium" | "high" = "none";
      if (fatigueScore >= 80) { recommendation = "retire"; urgency = "high"; }
      else if (fatigueScore >= 65) { recommendation = "refresh"; urgency = "medium"; }
      else if (fatigueScore >= 50) { recommendation = "rotate"; urgency = "low"; }

      return { creativeId: c._id.toString(), name: c.name, type: c.type, status: c.status, impressions: c.performance?.impressions || 0, clicks: c.performance?.clicks || 0, ctr, fatigueScore, fatigueLevel, daysSinceLastUse, recommendation, urgency };
    });

    const avgFatigue = creativeHealth.length > 0 ? Math.round(creativeHealth.reduce((s, ch) => s + ch.fatigueScore, 0) / creativeHealth.length) : 0;
    const fatiguedCount = creativeHealth.filter(ch => ch.fatigueLevel === "fatigued" || ch.fatigueLevel === "stale").length;
    const needsRefreshCount = creativeHealth.filter(ch => ch.recommendation !== "none").length;

    const recommendations: { creativeName: string; action: string; priority: string }[] = [];
    for (const ch of creativeHealth) {
      if (ch.recommendation === "retire") recommendations.push({ creativeName: ch.name, action: `Retire creative — fatigue score ${ch.fatigueScore}/100. Create replacement.`, priority: "high" });
      else if (ch.recommendation === "refresh") recommendations.push({ creativeName: ch.name, action: `Refresh creative — fatigue score ${ch.fatigueScore}/100. Update copy/visuals.`, priority: "medium" });
      else if (ch.recommendation === "rotate") recommendations.push({ creativeName: ch.name, action: `Rotate creative to different campaign/platform.`, priority: "low" });
    }

    return {
      generatedAt: new Date().toISOString(), totalCreatives: creatives.length,
      activeCount: creatives.filter(c => c.status === "active").length,
      fatiguedCount, needsRefreshCount, avgFatigueScore: avgFatigue,
      creativeHealth, recommendations,
    };
  }

  async getReplacementSuggestions(creativeId: string, tenantId: string): Promise<{ creativeName: string; similarCreatives: { id: string; name: string; type: string; ctr: number }[]; suggestedTypes: string[] }> {
    const mongoose = require("mongoose");
    const creative = await Creative.findById(new mongoose.Types.ObjectId(creativeId)).lean() as any;
    if (!creative) throw new Error("Creative not found");
    const siblings = await Creative.find({ tenantId: new mongoose.Types.ObjectId(tenantId), type: creative.type, status: "approved", _id: { $ne: creative._id } }).sort({ "performance.ctr": -1 }).limit(5).lean() as any[];
    return { creativeName: creative.name, similarCreatives: siblings.map(s => ({ id: s._id.toString(), name: s.name, type: s.type, ctr: s.performance?.ctr || 0 })), suggestedTypes: ["image", "video", "carousel", "text"].filter(t => t !== creative.type) };
  }

  async getCreativePortfolioSummary(tenantId: string): Promise<{ total: number; byType: Record<string, number>; byStatus: Record<string, number>; avgCtr: number; activeCTR: number; topCreatives: { name: string; ctr: number; impressions: number }[] }> {
    const mongoose = require("mongoose");
    const creatives = await Creative.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean() as any[];
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalCtr = 0, ctrCount = 0, activeCtr = 0, activeCount = 0;
    for (const c of creatives) {
      byType[c.type] = (byType[c.type] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      if (c.performance?.ctr) { totalCtr += c.performance.ctr; ctrCount++; }
      if (c.status === "active" && c.performance?.ctr) { activeCtr += c.performance.ctr; activeCount++; }
    }
    const top = [...creatives].filter(c => c.performance?.impressions > 100).sort((a, b) => (b.performance?.ctr || 0) - (a.performance?.ctr || 0)).slice(0, 10);
    return { total: creatives.length, byType, byStatus, avgCtr: ctrCount > 0 ? Math.round((totalCtr / ctrCount) * 10000) / 10000 : 0, activeCTR: activeCount > 0 ? Math.round((activeCtr / activeCount) * 10000) / 10000 : 0, topCreatives: top.map(c => ({ name: c.name, ctr: c.performance?.ctr || 0, impressions: c.performance?.impressions || 0 })) };
  }
}

export const creativeLifecycleOrchestrator = new CreativeLifecycleOrchestrator();
