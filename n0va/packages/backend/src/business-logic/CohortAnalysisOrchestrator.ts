import { Metric } from "../models/Metric";
import { Campaign } from "../models/Campaign";
import { decisionEngine } from "./DecisionEngine";

export interface CohortDefinition {
  name: string;
  type: "campaign_type" | "platform" | "start_month" | "campaign_age" | "status";
  groups: { label: string; count: number; totalSpend: number; totalRevenue: number; avgROAS: number }[];
}

export interface RetentionCurvePoint {
  day: number;
  cohortLabel: string;
  value: number;
  cumulativeValue: number;
  retentionRate: number;
}

export interface CohortAnalysisReport {
  generatedAt: string;
  cohorts: CohortDefinition[];
  bestPerformingCohort: { type: string; label: string; roas: number } | null;
  worstPerformingCohort: { type: string; label: string; roas: number } | null;
  retentionCurves: RetentionCurvePoint[];
  cumulativePerformance: { period: string; totalSpend: number; totalRevenue: number; roas: number; campaignCount: number; newCampaigns: number }[];
  recommendations: string[];
}

export class CohortAnalysisOrchestrator {
  async analyze(tenantId: string): Promise<CohortAnalysisReport> {
    const mongoose = require("mongoose");
    const campaigns = await Campaign.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean() as any[];
    const metrics = await Metric.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).sort({ date: 1 }).lean() as any[];

    const byCampaign: Record<string, { spend: number; revenue: number; impressions: number; clicks: number; conversions: number; dates: Date[] }> = {};
    for (const m of metrics) {
      const cid = m.campaignId?.toString();
      if (!cid) continue;
      if (!byCampaign[cid]) byCampaign[cid] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0, dates: [] };
      byCampaign[cid].spend += m.spend || 0;
      byCampaign[cid].revenue += m.revenue || 0;
      byCampaign[cid].impressions += m.impressions || 0;
      byCampaign[cid].clicks += m.clicks || 0;
      byCampaign[cid].conversions += m.conversions || 0;
      if (m.date) byCampaign[cid].dates.push(new Date(m.date));
    }

    const cohorts: CohortDefinition[] = [];

    const typeGroups: Record<string, { spend: number; revenue: number; count: number }> = {};
    const platformGroups: Record<string, { spend: number; revenue: number; count: number }> = {};
    const monthGroups: Record<string, { spend: number; revenue: number; count: number }> = {};
    const statusGroups: Record<string, { spend: number; revenue: number; count: number }> = {};

    for (const c of campaigns) {
      const cid = c._id.toString();
      const data = byCampaign[cid] || { spend: 0, revenue: 0 };
      const type = c.type || "unknown";
      if (!typeGroups[type]) typeGroups[type] = { spend: 0, revenue: 0, count: 0 };
      typeGroups[type].spend += data.spend;
      typeGroups[type].revenue += data.revenue;
      typeGroups[type].count++;

      const platforms = c.platforms || [];
      for (const p of (Array.isArray(platforms) ? platforms : [platforms])) {
        if (!platformGroups[p]) platformGroups[p] = { spend: 0, revenue: 0, count: 0 };
        platformGroups[p].spend += data.spend;
        platformGroups[p].revenue += data.revenue;
        platformGroups[p].count++;
      }

      if (c.createdAt) {
        const m = new Date(c.createdAt).toISOString().slice(0, 7);
        if (!monthGroups[m]) monthGroups[m] = { spend: 0, revenue: 0, count: 0 };
        monthGroups[m].spend += data.spend;
        monthGroups[m].revenue += data.revenue;
        monthGroups[m].count++;
      }

      const st = c.status || "unknown";
      if (!statusGroups[st]) statusGroups[st] = { spend: 0, revenue: 0, count: 0 };
      statusGroups[st].spend += data.spend;
      statusGroups[st].revenue += data.revenue;
      statusGroups[st].count++;
    }

    const toCohort = (label: string, g: { spend: number; revenue: number; count: number }) => ({
      label, count: g.count, totalSpend: Math.round(g.spend * 100) / 100,
      totalRevenue: Math.round(g.revenue * 100) / 100,
      avgROAS: g.spend > 0 ? Math.round((g.revenue / g.spend) * 100) / 100 : 0,
    });

    cohorts.push({ name: "By Campaign Type", type: "campaign_type", groups: Object.entries(typeGroups).map(([k, v]) => toCohort(k, v)).sort((a, b) => b.avgROAS - a.avgROAS) });
    cohorts.push({ name: "By Platform", type: "platform", groups: Object.entries(platformGroups).map(([k, v]) => toCohort(k, v)).sort((a, b) => b.avgROAS - a.avgROAS) });
    cohorts.push({ name: "By Start Month", type: "start_month", groups: Object.entries(monthGroups).map(([k, v]) => toCohort(k, v)).sort((a, b) => a.label.localeCompare(b.label)) });
    cohorts.push({ name: "By Status", type: "status", groups: Object.entries(statusGroups).map(([k, v]) => toCohort(k, v)).sort((a, b) => b.avgROAS - a.avgROAS) });

    const allCohortGroups = cohorts.flatMap(c => c.groups);
    const bestGroup = allCohortGroups.reduce((best, g) => g.avgROAS > (best?.avgROAS || 0) ? g : best, null as typeof allCohortGroups[0] | null);
    const worstGroup = allCohortGroups.reduce((worst, g) => g.count > 1 && g.avgROAS < (worst?.avgROAS || Infinity) ? g : worst, null as typeof allCohortGroups[0] | null);

    const campaignAges: Record<string, { days: number; spend: number; revenue: number }> = {};
    for (const c of campaigns) {
      const cid = c._id.toString();
      const data = byCampaign[cid];
      if (!data || data.dates.length === 0) continue;
      const sorted = data.dates.sort((a, b) => a.getTime() - b.getTime());
      const firstDate = sorted[0];
      const daysActive = Math.max(1, Math.round((Date.now() - firstDate.getTime()) / 86400000));
      campaignAges[cid] = { days: daysActive, spend: data.spend, revenue: data.revenue };
    }

    const maxDays = Math.min(90, Math.max(...Object.values(campaignAges).map(a => a.days), 1));
    const retentionCurves: RetentionCurvePoint[] = [];
    for (let day = 1; day <= maxDays; day += Math.max(1, Math.ceil(maxDays / 30))) {
      const activeInWindow = Object.values(campaignAges).filter(a => a.days >= day);
      const totalSpend = activeInWindow.reduce((s, a) => s + a.spend, 0);
      const totalRevenue = activeInWindow.reduce((s, a) => s + a.revenue, 0);
      const totalCampaigns = Object.keys(campaignAges).length;
      retentionCurves.push({
        day, cohortLabel: `Day ${day}`,
        value: activeInWindow.length,
        cumulativeValue: activeInWindow.reduce((s, a) => s + a.revenue, 0),
        retentionRate: totalCampaigns > 0 ? Math.round((activeInWindow.length / totalCampaigns) * 10000) / 100 : 0,
      });
    }

    const monthBuckets: Record<string, { spend: number; revenue: number; campaignSet: Set<string> }> = {};
    for (const m of metrics) {
      if (!m.date || !m.campaignId) continue;
      const mk = new Date(m.date).toISOString().slice(0, 7);
      if (!monthBuckets[mk]) monthBuckets[mk] = { spend: 0, revenue: 0, campaignSet: new Set() };
      monthBuckets[mk].spend += m.spend || 0;
      monthBuckets[mk].revenue += m.revenue || 0;
      monthBuckets[mk].campaignSet.add(m.campaignId.toString());
    }

    const sortedMonths = Object.keys(monthBuckets).sort();
    const cumulativePerformance = sortedMonths.map(m => {
      const data = monthBuckets[m];
      return {
        period: m, totalSpend: Math.round(data.spend * 100) / 100,
        totalRevenue: Math.round(data.revenue * 100) / 100,
        roas: data.spend > 0 ? Math.round((data.revenue / data.spend) * 100) / 100 : 0,
        campaignCount: data.campaignSet.size, newCampaigns: 0,
      };
    });

    for (let i = 0; i < cumulativePerformance.length; i++) {
      const prev = cumulativePerformance[i - 1];
      if (prev) {
        const prevCampaigns = monthBuckets[sortedMonths[i - 1]]?.campaignSet || new Set();
        cumulativePerformance[i].newCampaigns = monthBuckets[sortedMonths[i]].campaignSet.size - prevCampaigns.size;
        if (cumulativePerformance[i].newCampaigns < 0) cumulativePerformance[i].newCampaigns = 0;
      } else {
        cumulativePerformance[i].newCampaigns = monthBuckets[sortedMonths[i]].campaignSet.size;
      }
    }

    const recommendations: string[] = [];
    const byTypeCohort = cohorts.find(c => c.type === "campaign_type");
    if (byTypeCohort && byTypeCohort.groups.length >= 2) {
      const bestType = byTypeCohort.groups[0];
      const worstType = byTypeCohort.groups[byTypeCohort.groups.length - 1];
      if (bestType.avgROAS > worstType.avgROAS * 1.5) {
        recommendations.push(`Campaign type "${bestType.label}" outperforms "${worstType.label}" by ${Math.round((bestType.avgROAS / worstType.avgROAS - 1) * 100)}% in ROAS. Shift budget toward top-performing types.`);
      }
    }
    const byPlatform = cohorts.find(c => c.type === "platform");
    if (byPlatform && byPlatform.groups.length >= 2) {
      const bestP = byPlatform.groups[0];
      const worstP = byPlatform.groups[byPlatform.groups.length - 1];
      if (bestP.avgROAS > worstP.avgROAS * 1.3) {
        recommendations.push(`Platform "${bestP.label}" ROAS ${bestP.avgROAS}x vs "${worstP.label}" ROAS ${worstP.avgROAS}x. Rebalance platform allocation.`);
      }
    }
    if (cumulativePerformance.length >= 3) {
      const recent = cumulativePerformance.slice(-3);
      const roasTrend = recent.map(r => r.roas);
      const avgRecent = roasTrend.reduce((s, v) => s + v, 0) / roasTrend.length;
      const older = cumulativePerformance.slice(0, 3);
      const avgOlder = older.reduce((s, r) => s + r.roas, 0) / older.length;
      if (avgRecent > avgOlder * 1.15) recommendations.push(`Portfolio ROAS improving — up ${Math.round((avgRecent / avgOlder - 1) * 100)}% over recent months.`);
      else if (avgRecent < avgOlder * 0.85) recommendations.push(`Portfolio ROAS declining — down ${Math.round((1 - avgRecent / avgOlder) * 100)}%. Investigate underperformance.`);
    }

    return {
      generatedAt: new Date().toISOString(), cohorts, cumulativePerformance,
      bestPerformingCohort: bestGroup ? { type: "various", label: bestGroup.label, roas: bestGroup.avgROAS } : null,
      worstPerformingCohort: worstGroup ? { type: "various", label: worstGroup.label, roas: worstGroup.avgROAS } : null,
      retentionCurves, recommendations,
    };
  }
}

export const cohortAnalysisOrchestrator = new CohortAnalysisOrchestrator();
