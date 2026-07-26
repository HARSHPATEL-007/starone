import { MemoryStore } from "./MemoryStore";
import crypto from "crypto";

export interface AttributionTouchpoint {
  channel: string;
  campaignId: string;
  creativeId?: string;
  keyword?: string;
  timestamp: string;
  cost: number;
  type: string;
  weight: number;
}

export interface AttributionPath {
  pathId: string;
  conversionId: string;
  campaignIds: string[];
  touchpoints: AttributionTouchpoint[];
  totalCost: number;
  conversionValue: number;
  attributedValue: number;
  model: string;
}

export interface ChannelCredit {
  channel: string;
  touches: number;
  totalCost: number;
  attributedConversions: number;
  attributedRevenue: number;
  assistedConversions: number;
  roi: number;
  creditShare: number;
}

export interface AttributionDashboard {
  model: string;
  totalConversions: number;
  totalRevenue: number;
  totalCost: number;
  overallROAS: number;
  channelCredits: ChannelCredit[];
  topPaths: AttributionPath[];
  windowSettings: { clickWindow: number; viewWindow: number };
}

export class EnhancedAttributionService {
  private paths: AttributionPath[] = [];
  private mem(): MemoryStore { return MemoryStore.getInstance(); }

  private assignWeights(touchpoints: AttributionTouchpoint[], model: string): AttributionTouchpoint[] {
    if (model === "first_click") { touchpoints[0].weight = 1; for (let i = 1; i < touchpoints.length; i++) touchpoints[i].weight = 0; }
    else if (model === "last_click") { touchpoints[touchpoints.length - 1].weight = 1; for (let i = 0; i < touchpoints.length - 1; i++) touchpoints[i].weight = 0; }
    else if (model === "linear") { const w = 1 / touchpoints.length; for (const t of touchpoints) t.weight = w; }
    else if (model === "time_decay") {
      const total = touchpoints.reduce((s, t, i) => s + Math.exp(i * 0.5), 0);
      for (let i = 0; i < touchpoints.length; i++) touchpoints[i].weight = Math.exp(i * 0.5) / total;
    } else if (model === "position_based") {
      if (touchpoints.length === 1) touchpoints[0].weight = 1;
      else if (touchpoints.length === 2) { touchpoints[0].weight = 0.5; touchpoints[1].weight = 0.5; }
      else {
        touchpoints[0].weight = 0.4; touchpoints[touchpoints.length - 1].weight = 0.4;
        const middle = 0.2 / (touchpoints.length - 2);
        for (let i = 1; i < touchpoints.length - 1; i++) touchpoints[i].weight = middle;
      }
    }
    return touchpoints;
  }

  createPath(conversionId: string, campaignIds: string[], touchpoints: AttributionTouchpoint[], conversionValue: number, model: string): AttributionPath {
    const weighted = this.assignWeights([...touchpoints], model);
    const totalCost = weighted.reduce((s, t) => s + t.cost, 0);
    const attributedValue = model === "data_driven"
      ? this.dataDrivenAttribution(weighted, conversionValue)
      : weighted.reduce((s, t) => s + t.weight * conversionValue, 0);
    const path: AttributionPath = {
      pathId: `attr_${crypto.randomBytes(6).toString("hex")}`,
      conversionId, campaignIds, touchpoints: weighted, totalCost, conversionValue, attributedValue, model,
    };
    this.paths.push(path);
    this.mem().insert("enhanced_attribution_paths", { ...path, conversionId, model });
    return path;
  }

  private dataDrivenAttribution(touchpoints: AttributionTouchpoint[], conversionValue: number): number {
    if (touchpoints.length === 0) return 0;
    const weights = touchpoints.map((t, i) => (1 + Math.log(i + 1)) * (t.type === "click" || t.type === "email_click" ? 1.5 : 1));
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    return touchpoints.reduce((s, t, i) => s + (weights[i] / totalWeight) * conversionValue, 0);
  }

  getChannelDashboard(tenantId: string, model: string): AttributionDashboard {
    const tenantPaths = this.mem().find("enhanced_attribution_paths", (p: any) => p.model === model) as any[];
    const topPaths = tenantPaths.slice(-10).reverse() as AttributionPath[];
    const channelMap = new Map<string, { touches: number; cost: number; conversions: number; revenue: number; assisted: number }>();
    for (const path of tenantPaths) {
      for (const t of (path as any).touchpoints || []) {
        if (!channelMap.has(t.channel)) channelMap.set(t.channel, { touches: 0, cost: 0, conversions: 0, revenue: 0, assisted: 0 });
        const c = channelMap.get(t.channel)!; c.touches++; c.cost += t.cost || 0;
        c.revenue += (t.weight || 0) * (path.conversionValue || 0);
        if ((t.weight || 0) > 0.3) c.conversions++; else if ((t.weight || 0) > 0) c.assisted++;
      }
    }
    const totalRevenue = tenantPaths.reduce((s: number, p: any) => s + (p.attributedValue || 0), 0);
    const totalCost = tenantPaths.reduce((s: number, p: any) => s + (p.totalCost || 0), 0);
    const channelCredits = Array.from(channelMap.entries()).map(([channel, data]) => ({
      channel, touches: data.touches, totalCost: Math.round(data.cost * 100) / 100,
      attributedConversions: data.conversions, attributedRevenue: Math.round(data.revenue * 100) / 100,
      assistedConversions: data.assisted,
      roi: data.cost > 0 ? Math.round((data.revenue / data.cost) * 100) / 100 : 0,
      creditShare: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 10000) / 100 : 0,
    })).sort((a, b) => b.attributedRevenue - a.attributedRevenue);
    return {
      model, totalConversions: tenantPaths.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      overallROAS: totalCost > 0 ? Math.round((totalRevenue / totalCost) * 100) / 100 : 0,
      channelCredits, topPaths,
      windowSettings: { clickWindow: 30, viewWindow: 1 },
    };
  }

  getModelComparison(tenantId: string): Record<string, { totalRevenue: number; totalCost: number; roas: number; topChannel: string }> {
    const models = ["first_click", "last_click", "linear", "time_decay", "position_based"];
    const result: Record<string, any> = {};
    for (const model of models) {
      const dash = this.getChannelDashboard(tenantId, model);
      result[model] = { totalRevenue: dash.totalRevenue, totalCost: dash.totalCost, roas: dash.overallROAS, topChannel: dash.channelCredits[0]?.channel || "none" };
    }
    return result;
  }

  simulateIncrementalityTest(tenantId: string, campaignId: string, testDays: number): Record<string, unknown> {
    const controlRevenue = Math.round(Math.random() * 50000 + 10000);
    const exposedRevenue = Math.round(Math.random() * 80000 + 30000);
    const incrementality = exposedRevenue - controlRevenue;
    const liftPercent = controlRevenue > 0 ? Math.round((incrementality / controlRevenue) * 10000) / 100 : 0;
    return { campaignId, testDays, controlRevenue, exposedRevenue, incrementalRevenue: incrementality, liftPercent, significance: liftPercent > 10 ? "significant" : "not_significant" };
  }
}

export const enhancedAttributionService = new EnhancedAttributionService();
