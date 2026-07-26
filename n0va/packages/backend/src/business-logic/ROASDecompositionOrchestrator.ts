import { Metric } from "../models/Metric";
import { Campaign } from "../models/Campaign";
import { decisionEngine } from "./DecisionEngine";

export interface DecompositionComponent {
  name: string;
  label: string;
  contribution: number;
  contributionPct: number;
  currentValue: number;
  benchmark: number;
  gap: number;
  optimizationPotential: "high" | "medium" | "low";
  trend: "improving" | "declining" | "stable";
}

export interface DecompositionTrend {
  period: string;
  roas: number;
  components: { name: string; contribution: number }[];
}

export interface ROASDecompositionReport {
  generatedAt: string;
  campaignId: string;
  campaignName: string;
  overallROAS: number;
  components: DecompositionComponent[];
  trends: DecompositionTrend[];
  primaryDriver: DecompositionComponent | null;
  primaryDrag: DecompositionComponent | null;
  optimizationScore: number;
  optimizationBand: string;
  recommendations: string[];
}

export class ROASDecompositionOrchestrator {
  async decompose(campaignId: string, tenantId: string): Promise<ROASDecompositionReport> {
    const mongoose = require("mongoose");
    const cid = new mongoose.Types.ObjectId(campaignId);
    const campaign = await Campaign.findById(cid).lean() as any;
    if (!campaign || campaign.tenantId?.toString() !== tenantId) throw new Error("Campaign not found");

    const metrics = await Metric.find({ campaignId: cid, tenantId: new mongoose.Types.ObjectId(tenantId) }).sort({ date: 1 }).lean() as any[];
    if (metrics.length === 0) throw new Error("No metrics data for decomposition");

    const totalSpend = metrics.reduce((s: number, m: any) => s + (m.spend || 0), 0);
    const totalRevenue = metrics.reduce((s: number, m: any) => s + (m.revenue || 0), 0);
    const overallROAS = totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0;

    const platformData: Record<string, { spend: number; revenue: number }> = {};
    const audienceData: Record<string, { spend: number; revenue: number }> = {};
    const dailyData: Record<string, { spend: number; revenue: number }> = {};

    for (const m of metrics) {
      const p = m.platform || "unknown";
      if (!platformData[p]) platformData[p] = { spend: 0, revenue: 0 };
      platformData[p].spend += m.spend || 0;
      platformData[p].revenue += m.revenue || 0;

      const d = m.date ? new Date(m.date).toISOString().slice(0, 10) : "unknown";
      if (!dailyData[d]) dailyData[d] = { spend: 0, revenue: 0 };
      dailyData[d].spend += m.spend || 0;
      dailyData[d].revenue += m.revenue || 0;
    }

    const allPlatforms = Object.keys(platformData);
    const avgPlatformROAS = allPlatforms.reduce((s, p) => s + (platformData[p].spend > 0 ? platformData[p].revenue / platformData[p].spend : 0), 0) / Math.max(1, allPlatforms.length);

    const channelContrib = allPlatforms.map(p => {
      const roas = platformData[p].spend > 0 ? platformData[p].revenue / platformData[p].spend : 0;
      return { name: p, spend: platformData[p].spend, roas };
    });
    const bestChannelROAS = Math.max(...channelContrib.map(c => c.roas));
    const channelScore = avgPlatformROAS > 0 ? Math.min(100, Math.round((bestChannelROAS / avgPlatformROAS) * 50)) : 50;

    const sortedDates = Object.keys(dailyData).sort();
    const dailyROAS = sortedDates.map(d => dailyData[d].spend > 0 ? dailyData[d].revenue / dailyData[d].spend : 0);
    const firstHalf = dailyROAS.slice(0, Math.floor(dailyROAS.length / 2));
    const secondHalf = dailyROAS.slice(Math.floor(dailyROAS.length / 2));
    const fAvg = firstHalf.reduce((s, v) => s + v, 0) / Math.max(1, firstHalf.length);
    const sAvg = secondHalf.reduce((s, v) => s + v, 0) / Math.max(1, secondHalf.length);
    const roasTrend = sAvg > fAvg * 1.1 ? "improving" : sAvg < fAvg * 0.9 ? "declining" : "stable";

    const trendStrength = Math.abs(sAvg - fAvg) / Math.max(1, fAvg);
    const trendScore = roasTrend === "improving" ? Math.min(100, 50 + trendStrength * 100) : roasTrend === "declining" ? Math.max(0, 50 - trendStrength * 100) : 50;

    const creativeIds = [...new Set(metrics.map((m: any) => m.creativeId?.toString()).filter(Boolean))];
    const creativePerf: Record<string, { spend: number; revenue: number }> = {};
    for (const m of metrics) {
      const crId = m.creativeId?.toString();
      if (crId) {
        if (!creativePerf[crId]) creativePerf[crId] = { spend: 0, revenue: 0 };
        creativePerf[crId].spend += m.spend || 0;
        creativePerf[crId].revenue += m.revenue || 0;
      }
    }
    const creativeROASScores = Object.values(creativePerf).map(c => c.spend > 0 ? c.revenue / c.spend : 0);
    const bestCreativeROAS = creativeROASScores.length > 0 ? Math.max(...creativeROASScores) : overallROAS;
    const avgCreativeROAS = creativeROASScores.length > 0 ? creativeROASScores.reduce((s, v) => s + v, 0) / creativeROASScores.length : overallROAS;
    const creativeScore = avgCreativeROAS > 0 ? Math.min(100, Math.round((bestCreativeROAS / avgCreativeROAS) * 50)) : 50;

    const weeklySpend: Record<string, number> = {};
    for (const m of metrics) {
      if (m.date) {
        const d = new Date(m.date);
        const weekKey = `${d.getFullYear()}-W${Math.ceil((d.getDate() + (new Date(d.getFullYear(), d.getMonth(), 1).getDay())) / 7)}`;
        weeklySpend[weekKey] = (weeklySpend[weekKey] || 0) + (m.spend || 0);
      }
    }
    const weeklySpendArr = Object.values(weeklySpend);
    const spendVolatility = weeklySpendArr.length > 2 ? decisionEngine.zScore(Math.max(...weeklySpendArr), weeklySpendArr.reduce((s, v) => s + v, 0) / weeklySpendArr.length, Math.sqrt(weeklySpendArr.reduce((s, v) => s + (v - weeklySpendArr.reduce((a, b) => a + b, 0) / weeklySpendArr.length) ** 2, 0) / weeklySpendArr.length)) : 0;
    const timingScore = Math.max(0, Math.min(100, Math.round((1 - Math.min(1, Math.abs(spendVolatility) * 0.2)) * 100)));

    const channelEfficiency = overallROAS > 0 && avgPlatformROAS > 0 ? Math.round((overallROAS / avgPlatformROAS) * 50) : 50;
    const seasonalityScore = 60;

    const components: DecompositionComponent[] = [
      { name: "channel", label: "Channel Mix", contribution: Math.round(channelEfficiency * overallROAS * 100) / 100, contributionPct: channelEfficiency, currentValue: avgPlatformROAS, benchmark: bestChannelROAS, gap: Math.round((bestChannelROAS - avgPlatformROAS) * 100) / 100, optimizationPotential: gapFromROAS(bestChannelROAS - avgPlatformROAS, overallROAS), trend: roasTrend },
      { name: "audience", label: "Audience Targeting", contribution: Math.round(channelScore * overallROAS * 0.9 * 100) / 100, contributionPct: channelScore, currentValue: overallROAS, benchmark: overallROAS * 1.3, gap: Math.round(overallROAS * 0.3 * 100) / 100, optimizationPotential: "high", trend: "stable" },
      { name: "creative", label: "Creative Quality", contribution: Math.round(creativeScore * overallROAS * 0.9 * 100) / 100, contributionPct: creativeScore, currentValue: avgCreativeROAS, benchmark: bestCreativeROAS, gap: Math.round((bestCreativeROAS - avgCreativeROAS) * 100) / 100, optimizationPotential: gapFromROAS(bestCreativeROAS - avgCreativeROAS, overallROAS), trend: "stable" },
      { name: "seasonality", label: "Seasonality / Timing", contribution: Math.round(seasonalityScore * overallROAS * 0.5 * 100) / 100, contributionPct: seasonalityScore, currentValue: seasonalityScore, benchmark: 70, gap: 70 - seasonalityScore, optimizationPotential: "medium", trend: roasTrend },
      { name: "timing", label: "Pacing / Spend Timing", contribution: Math.round(timingScore * overallROAS * 0.5 * 100) / 100, contributionPct: timingScore, currentValue: timingScore, benchmark: 75, gap: 75 - timingScore, optimizationPotential: timingScore < 60 ? "high" : "low", trend: "stable" },
    ];

    components.sort((a, b) => b.contributionPct - a.contributionPct);
    const primaryDriver = components[0] || null;
    const sortedByGap = [...components].sort((a, b) => b.gap - a.gap);
    const primaryDrag = sortedByGap[0] || null;

    const monthlyGroups: Record<string, { spend: number; revenue: number }> = {};
    for (const m of metrics) {
      if (m.date) {
        const mk = new Date(m.date).toISOString().slice(0, 7);
        if (!monthlyGroups[mk]) monthlyGroups[mk] = { spend: 0, revenue: 0 };
        monthlyGroups[mk].spend += m.spend || 0;
        monthlyGroups[mk].revenue += m.revenue || 0;
      }
    }
    const sortedMonths = Object.keys(monthlyGroups).sort();
    const trends: DecompositionTrend[] = sortedMonths.map(m => {
      const roas = monthlyGroups[m].spend > 0 ? Math.round((monthlyGroups[m].revenue / monthlyGroups[m].spend) * 100) / 100 : 0;
      return { period: m, roas, components: components.map(c => ({ name: c.name, contribution: Math.round(c.contributionPct * roas / 100 * 100) / 100 })) };
    });

    const optimizationScore = Math.round((channelEfficiency + creativeScore + timingScore + seasonalityScore + channelScore) / 5);
    const optimizationBand = decisionEngine.label(decisionEngine.band(optimizationScore));

    const recommendations: string[] = [];
    if (primaryDrag) recommendations.push(`Primary drag: ${primaryDrag.label} (gap ${primaryDrag.gap}). Focus optimization here for greatest ROAS impact.`);
    if (channelEfficiency < 60) recommendations.push("Channel mix underperforming — reallocate budget to top-performing platforms.");
    if (creativeScore < 60 && creativeROASScores.length > 1) recommendations.push("Creative variance detected — standardize top-performing creative elements.");
    if (timingScore < 60) recommendations.push("Spend timing inconsistent — implement smoother daily pacing.");
    if (roasTrend === "declining") recommendations.push("ROAS trend is declining — investigate recent changes in targeting, creative, or market conditions.");
    if (primaryDriver) recommendations.push(`Primary driver: ${primaryDriver.label} (contribution ${primaryDriver.contributionPct}%). Protect and build on this strength.`);

    return {
      generatedAt: new Date().toISOString(), campaignId, campaignName: campaign.name || campaignId,
      overallROAS, components, trends, primaryDriver, primaryDrag,
      optimizationScore, optimizationBand, recommendations,
    };
  }
}

function gapFromROAS(gap: number, overallROAS: number): "high" | "medium" | "low" {
  if (overallROAS <= 0) return "medium";
  const ratio = Math.abs(gap) / overallROAS;
  return ratio > 0.3 ? "high" : ratio > 0.1 ? "medium" : "low";
}

export const roasDecompositionOrchestrator = new ROASDecompositionOrchestrator();
