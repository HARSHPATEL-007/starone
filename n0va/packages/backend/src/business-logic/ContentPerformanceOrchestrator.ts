import { Metric } from "../models/Metric";
import { Creative } from "../models/Creative";
import { Campaign } from "../models/Campaign";
import { decisionEngine } from "./DecisionEngine";

export interface FormatPerformance {
  format: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cvr: number;
  cpa: number;
  roas: number;
  efficiencyScore: number;
  creativeCount: number;
  trend: "improving" | "declining" | "stable";
}

export interface ContentGap {
  format: string;
  platform: string;
  expectedROAS: number;
  currentROAS: number;
  gap: number;
  recommendation: string;
}

export interface CreativeFatigueTrend {
  creativeId: string;
  creativeName: string;
  format: string;
  daysActive: number;
  fatigueScore: number;
  fatigueLevel: "fresh" | "moderate" | "fatigued" | "stale";
  impressionsPerDay: number;
  ctrTrend: "improving" | "declining" | "stable";
  recommendation: string;
}

export interface ContentPerformanceReport {
  generatedAt: string;
  formatPerformance: FormatPerformance[];
  topFormat: FormatPerformance | null;
  worstFormat: FormatPerformance | null;
  contentGaps: ContentGap[];
  fatigueTrends: CreativeFatigueTrend[];
  fatiguedCount: number;
  formatConcentration: { hhi: number; interpretation: string };
  recommendations: string[];
}

export class ContentPerformanceOrchestrator {
  async analyze(tenantId: string): Promise<ContentPerformanceReport> {
    const mongoose = require("mongoose");
    const metrics = await Metric.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).sort({ date: -1 }).limit(20000).lean() as any[];
    const creatives = await Creative.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean() as any[];

    const formatMap: Record<string, { impressions: number; clicks: number; conversions: number; spend: number; revenue: number; creatives: Set<string>; dailyCTR: Record<string, number[]> }> = {};
    for (const m of metrics) {
      const fmt = m.format || m.creativeType || "unknown";
      if (!formatMap[fmt]) formatMap[fmt] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, creatives: new Set(), dailyCTR: {} };
      formatMap[fmt].impressions += m.impressions || 0;
      formatMap[fmt].clicks += m.clicks || 0;
      formatMap[fmt].conversions += m.conversions || 0;
      formatMap[fmt].spend += m.spend || 0;
      formatMap[fmt].revenue += m.revenue || 0;
      if (m.creativeId) formatMap[fmt].creatives.add(m.creativeId.toString());
      if (m.date) {
        const day = new Date(m.date).toISOString().slice(0, 10);
        if (!formatMap[fmt].dailyCTR[day]) formatMap[fmt].dailyCTR[day] = [];
        if (m.impressions && m.impressions > 0) formatMap[fmt].dailyCTR[day].push((m.clicks || 0) / m.impressions);
      }
    }

    const totalSpendAll = Object.values(formatMap).reduce((s, v) => s + v.spend, 0);
    const formatPerformance: FormatPerformance[] = Object.entries(formatMap).map(([format, data]) => {
      const ctr = data.impressions > 0 ? Math.round((data.clicks / data.impressions) * 10000) / 100 : 0;
      const cvr = data.clicks > 0 ? Math.round((data.conversions / data.clicks) * 10000) / 100 : 0;
      const cpa = data.conversions > 0 ? Math.round((data.spend / data.conversions) * 100) / 100 : 0;
      const roas = data.spend > 0 ? Math.round((data.revenue / data.spend) * 100) / 100 : 0;
      const efficiencyScore = Math.round((roas * 40 + cvr * 30 + ctr * 30) * 100) / 100;

      const dayKeys = Object.keys(data.dailyCTR).sort();
      let trend: "improving" | "declining" | "stable" = "stable";
      if (dayKeys.length >= 4) {
        const half = Math.floor(dayKeys.length / 2);
        const firstHalf = dayKeys.slice(0, half).flatMap(d => data.dailyCTR[d]);
        const secondHalf = dayKeys.slice(half).flatMap(d => data.dailyCTR[d]);
        const fAvg = firstHalf.reduce((s, v) => s + v, 0) / Math.max(1, firstHalf.length);
        const sAvg = secondHalf.reduce((s, v) => s + v, 0) / Math.max(1, secondHalf.length);
        trend = sAvg > fAvg * 1.1 ? "improving" : sAvg < fAvg * 0.9 ? "declining" : "stable";
      }

      return { format, impressions: data.impressions, clicks: data.clicks, conversions: data.conversions, spend: data.spend, revenue: data.revenue, ctr, cvr, cpa, roas, efficiencyScore, creativeCount: data.creatives.size, trend };
    });

    formatPerformance.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
    const topFormat = formatPerformance[0] || null;
    const worstFormat = formatPerformance.length > 1 ? formatPerformance[formatPerformance.length - 1] : null;

    const formatSpendShares = formatPerformance.map(f => f.spend);
    const hhi = decisionEngine.hhi(formatSpendShares);
    let fmtConcentration: string;
    if (hhi > 2500) fmtConcentration = "Highly format-concentrated — diversify content types.";
    else if (hhi > 1500) fmtConcentration = "Moderate format concentration. Consider testing new formats.";
    else fmtConcentration = "Well-diversified content mix.";

    const knownFormats = formatPerformance.map(f => f.format);
    const platforms = [...new Set(metrics.map((m: any) => m.platform).filter(Boolean))];
    const contentGaps: ContentGap[] = [];
    const premiumFormats = ["video", "carousel", "story", "display", "native"];
    for (const pf of premiumFormats) {
      if (!knownFormats.includes(pf)) {
        const expectedROAS = topFormat ? Math.round(topFormat.roas * 0.85 * 100) / 100 : 1.5;
        contentGaps.push({ format: pf, platform: "all", expectedROAS, currentROAS: 0, gap: expectedROAS, recommendation: `No "${pf}" content found. Create ${pf} assets to capture untapped audience segments.` });
      }
    }
    for (const f of formatPerformance) {
      if (f.roas < 1 && f.spend > 100) {
        contentGaps.push({ format: f.format, platform: "all", expectedROAS: 2, currentROAS: f.roas, gap: Math.round((2 - f.roas) * 100) / 100, recommendation: `"${f.format}" ROAS ${f.roas}x below 2x target. Review format strategy or reduce allocation.` });
      }
    }

    const fatigueTrends: CreativeFatigueTrend[] = creatives.map(c => {
      const perf = c.performance || {};
      const daysActive = c.createdAt ? Math.round((Date.now() - new Date(c.createdAt).getTime()) / 86400000) : 30;
      const ips = c.impressionsPerDay || perf.impressions ? Math.round((perf.impressions || 0) / Math.max(1, daysActive)) : 0;
      const ctr = perf.impressions && perf.impressions > 0 ? Math.round(((perf.clicks || 0) / perf.impressions) * 10000) / 100 : 0;

      const fatigueScore = Math.min(100, Math.round((daysActive / 60) * 30 + (ips > 10000 ? 40 : ips > 5000 ? 25 : 10) + (ctr < 0.5 ? 30 : ctr < 1 ? 15 : 0)));
      const fatigueLevel: "fresh" | "moderate" | "fatigued" | "stale" = fatigueScore < 25 ? "fresh" : fatigueScore < 50 ? "moderate" : fatigueScore < 75 ? "fatigued" : "stale";

      let ctrTrend: "improving" | "declining" | "stable" = "stable";
      if (daysActive > 7) {
        ctrTrend = ctr < 0.5 ? "declining" : ctr > 2 ? "improving" : "stable";
      }

      let recommendation: string;
      if (fatigueLevel === "stale") recommendation = "Retire this creative — audience fatigue is critical. Replace with fresh variant.";
      else if (fatigueLevel === "fatigued") recommendation = "Rotate out or refresh creative. Consider A/B test with new copy/visuals.";
      else if (fatigueLevel === "moderate") recommendation = "Monitor CTR closely. Prepare replacement creative for next rotation.";
      else recommendation = "Creative performing well. Continue monitoring.";

      return { creativeId: c._id.toString(), creativeName: c.name || c.title || c._id.toString(), format: c.format || c.type || "unknown", daysActive, fatigueScore, fatigueLevel, impressionsPerDay: ips, ctrTrend, recommendation };
    });

    fatigueTrends.sort((a, b) => b.fatigueScore - a.fatigueScore);
    const fatiguedCount = fatigueTrends.filter(f => f.fatigueLevel === "fatigued" || f.fatigueLevel === "stale").length;

    const recommendations: string[] = [];
    if (topFormat) recommendations.push(`Top format: "${topFormat.format}" (efficiency ${topFormat.efficiencyScore}). Increase investment in this format.`);
    if (worstFormat && worstFormat.roas < 1) recommendations.push(`Underperforming format: "${worstFormat.format}" (ROAS ${worstFormat.roas}x). Reduce or pause.`);
    if (fatiguedCount > 0) recommendations.push(`${fatiguedCount} creative(s) fatigued or stale. Schedule refresh rotation.`);
    if (contentGaps.length > 0) recommendations.push(`${contentGaps.length} content gap(s) identified. Prioritize filling missing formats.`);
    recommendations.push(fmtConcentration);

    return {
      generatedAt: new Date().toISOString(), formatPerformance, topFormat, worstFormat, contentGaps: contentGaps.slice(0, 10),
      fatigueTrends: fatigueTrends.slice(0, 20), fatiguedCount,
      formatConcentration: { hhi, interpretation: fmtConcentration }, recommendations,
    };
  }
}

export const contentPerformanceOrchestrator = new ContentPerformanceOrchestrator();
