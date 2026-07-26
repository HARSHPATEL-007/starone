import { Metric } from "../models/Metric";
import { Campaign } from "../models/Campaign";
import { decisionEngine } from "./DecisionEngine";

export interface KPIEntry {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePct: number;
  direction: "up" | "down" | "stable";
  status: "on_target" | "needs_attention" | "off_track";
}

export interface TopPerformer {
  campaignId: string;
  campaignName: string;
  metric: string;
  value: number;
}

export interface ExecutiveSummaryReport {
  generatedAt: string;
  portfolioName: string;
  totalCampaigns: number;
  activeCampaigns: number;
  periodDays: number;
  kpis: KPIEntry[];
  topCampaignsByROAS: TopPerformer[];
  bottomCampaignsByROAS: TopPerformer[];
  topPlatformsBySpend: { platform: string; spend: number; share: number }[];
  notableChanges: string[];
  healthScore: number;
  healthBand: string;
  recommendations: string[];
}

export class ExecutiveSummaryOrchestrator {
  async generate(tenantId: string, days = 30): Promise<ExecutiveSummaryReport> {
    const mongoose = require("mongoose");
    const since = new Date(Date.now() - days * 86400000);
    const priorSince = new Date(Date.now() - days * 2 * 86400000);

    const recentMetrics = await Metric.find({ tenantId: new mongoose.Types.ObjectId(tenantId), date: { $gte: since } }).lean() as any[];
    const priorMetrics = await Metric.find({ tenantId: new mongoose.Types.ObjectId(tenantId), date: { $gte: priorSince, $lt: since } }).lean() as any[];
    const campaigns = await Campaign.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean() as any[];

    const aggMetrics = (ms: any[]) => {
      const r = ms.reduce((acc: any, m: any) => { acc.impressions += m.impressions || 0; acc.clicks += m.clicks || 0; acc.conversions += m.conversions || 0; acc.spend += m.spend || 0; acc.revenue += m.revenue || 0; return acc; }, { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });
      r.roas = r.spend > 0 ? r.revenue / r.spend : 0;
      r.ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
      r.cvr = r.clicks > 0 ? (r.conversions / r.clicks) * 100 : 0;
      r.cpa = r.conversions > 0 ? r.spend / r.conversions : 0;
      return r;
    };

    const current = aggMetrics(recentMetrics);
    const previous = aggMetrics(priorMetrics);

    const kpis: KPIEntry[] = [
      { metric: "Total Spend", current: Math.round(current.spend * 100) / 100, previous: Math.round(previous.spend * 100) / 100, change: Math.round((current.spend - previous.spend) * 100) / 100, changePct: previous.spend > 0 ? Math.round(((current.spend - previous.spend) / previous.spend) * 10000) / 100 : 0, direction: "stable", status: "on_target" },
      { metric: "Total Revenue", current: Math.round(current.revenue * 100) / 100, previous: Math.round(previous.revenue * 100) / 100, change: Math.round((current.revenue - previous.revenue) * 100) / 100, changePct: previous.revenue > 0 ? Math.round(((current.revenue - previous.revenue) / previous.revenue) * 10000) / 100 : 0, direction: "stable", status: "on_target" },
      { metric: "ROAS", current: Math.round(current.roas * 100) / 100, previous: Math.round(previous.roas * 100) / 100, change: Math.round((current.roas - previous.roas) * 100) / 100, changePct: previous.roas > 0 ? Math.round(((current.roas - previous.roas) / previous.roas) * 10000) / 100 : 0, direction: "stable", status: "on_target" },
      { metric: "Conversions", current: Math.round(current.conversions), previous: Math.round(previous.conversions), change: Math.round(current.conversions - previous.conversions), changePct: previous.conversions > 0 ? Math.round(((current.conversions - previous.conversions) / previous.conversions) * 10000) / 100 : 0, direction: "stable", status: "on_target" },
      { metric: "CTR (%)", current: Math.round(current.ctr * 100) / 100, previous: Math.round(previous.ctr * 100) / 100, change: Math.round((current.ctr - previous.ctr) * 100) / 100, changePct: previous.ctr > 0 ? Math.round(((current.ctr - previous.ctr) / previous.ctr) * 10000) / 100 : 0, direction: "stable", status: "on_target" },
      { metric: "CVR (%)", current: Math.round(current.cvr * 100) / 100, previous: Math.round(previous.cvr * 100) / 100, change: Math.round((current.cvr - previous.cvr) * 100) / 100, changePct: previous.cvr > 0 ? Math.round(((current.cvr - previous.cvr) / previous.cvr) * 10000) / 100 : 0, direction: "stable", status: "on_target" },
      { metric: "CPA ($)", current: Math.round(current.cpa * 100) / 100, previous: Math.round(previous.cpa * 100) / 100, change: Math.round((current.cpa - previous.cpa) * 100) / 100, changePct: previous.cpa > 0 ? Math.round(((current.cpa - previous.cpa) / previous.cpa) * 10000) / 100 : 0, direction: "stable", status: "on_target" },
      { metric: "Impressions", current: current.impressions, previous: previous.impressions, change: current.impressions - previous.impressions, changePct: previous.impressions > 0 ? Math.round(((current.impressions - previous.impressions) / previous.impressions) * 10000) / 100 : 0, direction: "stable", status: "on_target" },
    ];

    for (const kpi of kpis) {
      kpi.direction = kpi.changePct > 10 ? "up" : kpi.changePct < -10 ? "down" : "stable";
      const isGood = ["Total Revenue", "ROAS", "Conversions", "CTR (%)", "CVR (%)", "Impressions"].includes(kpi.metric);
      if (isGood) {
        kpi.status = kpi.changePct > -10 ? "on_target" : kpi.changePct > -25 ? "needs_attention" : "off_track";
      } else {
        kpi.status = kpi.changePct < 10 ? "on_target" : kpi.changePct < 25 ? "needs_attention" : "off_track";
      }
    }

    const byCampaign: Record<string, { spend: number; revenue: number }> = {};
    for (const m of recentMetrics) {
      const cid = m.campaignId?.toString();
      if (!cid) continue;
      if (!byCampaign[cid]) byCampaign[cid] = { spend: 0, revenue: 0 };
      byCampaign[cid].spend += m.spend || 0;
      byCampaign[cid].revenue += m.revenue || 0;
    }

    const withROAS = Object.entries(byCampaign)
      .map(([cid, data]) => ({ campaignId: cid, campaignName: campaigns.find((c: any) => c._id.toString() === cid)?.name || cid, roas: data.spend > 0 ? data.revenue / data.spend : 0, spend: data.spend }))
      .filter(c => c.spend > 0)
      .sort((a, b) => b.roas - a.roas);

    const topCampaignsByROAS: TopPerformer[] = withROAS.slice(0, 5).map(c => ({ campaignId: c.campaignId, campaignName: c.campaignName, metric: "ROAS", value: Math.round(c.roas * 100) / 100 }));
    const bottomCampaignsByROAS: TopPerformer[] = withROAS.slice(-5).reverse().map(c => ({ campaignId: c.campaignId, campaignName: c.campaignName, metric: "ROAS", value: Math.round(c.roas * 100) / 100 }));

    const platformSpend: Record<string, number> = {};
    for (const m of recentMetrics) {
      const p = m.platform || "unknown";
      platformSpend[p] = (platformSpend[p] || 0) + (m.spend || 0);
    }
    const totalPlatformSpend = Object.values(platformSpend).reduce((s, v) => s + v, 0);
    const topPlatformsBySpend = Object.entries(platformSpend)
      .map(([platform, spend]) => ({ platform, spend, share: totalPlatformSpend > 0 ? Math.round((spend / totalPlatformSpend) * 10000) / 100 : 0 }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    const notableChanges: string[] = [];
    for (const kpi of kpis) {
      if (Math.abs(kpi.changePct) > 20) {
        notableChanges.push(`${kpi.metric} ${kpi.direction === "up" ? "increased" : "decreased"} by ${Math.abs(kpi.changePct)}% (${kpi.current} vs ${kpi.previous} prior period).`);
      }
    }
    const activeCampaigns = campaigns.filter((c: any) => c.status === "active").length;
    if (activeCampaigns < campaigns.length * 0.5 && campaigns.length > 5) notableChanges.push(`Only ${activeCampaigns} of ${campaigns.length} campaigns active — ${Math.round((1 - activeCampaigns / campaigns.length) * 100)}% inactive.`);

    const spendScore = current.spend > 0 && previous.spend > 0 ? Math.min(100, Math.round((current.roas / Math.max(0.1, previous.roas)) * 50)) : 50;
    const roasScore = Math.min(100, Math.round(current.roas * 25));
    const volumeScore = current.conversions > 0 && previous.conversions > 0 ? Math.min(100, Math.round((current.conversions / previous.conversions) * 50)) : 50;
    const ctrScore = Math.min(100, Math.round(current.ctr * 20));
    const healthScore = Math.round((spendScore * 0.3 + roasScore * 0.35 + volumeScore * 0.2 + ctrScore * 0.15));
    const healthBand = decisionEngine.label(decisionEngine.band(healthScore));

    const recommendations: string[] = [];
    const roasKPI = kpis.find(k => k.metric === "ROAS");
    if (roasKPI && roasKPI.status === "off_track") recommendations.push("ROAS declining significantly. Conduct full portfolio review — focus on high-ROAS campaigns.");
    const cpaKPI = kpis.find(k => k.metric === "CPA ($)");
    if (cpaKPI && cpaKPI.direction === "up" && cpaKPI.changePct > 15) recommendations.push("CPA increasing. Investigate conversion rate drops or rising costs.");
    if (topCampaignsByROAS.length > 0) recommendations.push(`Top campaign: "${topCampaignsByROAS[0].campaignName}" (ROAS ${topCampaignsByROAS[0].value}x). Analyze and replicate winning factors.`);
    if (bottomCampaignsByROAS.length > 0 && bottomCampaignsByROAS[0].value < 1) recommendations.push(`Bottom campaign: "${bottomCampaignsByROAS[0].campaignName}" (ROAS ${bottomCampaignsByROAS[0].value}x). Review or pause.`);
    const highestPlatform = topPlatformsBySpend[0];
    if (highestPlatform && highestPlatform.share > 60) recommendations.push(`Heavy concentration on ${highestPlatform.platform} (${highestPlatform.share}% of spend). Diversify to reduce risk.`);
    recommendations.push(`Overall health: ${healthBand} (${healthScore}/100). ${healthScore >= 70 ? "Portfolio performing well." : healthScore >= 50 ? "Room for improvement." : "Immediate attention needed."}`);

    return {
      generatedAt: new Date().toISOString(), portfolioName: "N0VA Ads Portfolio",
      totalCampaigns: campaigns.length, activeCampaigns, periodDays: days,
      kpis, topCampaignsByROAS, bottomCampaignsByROAS, topPlatformsBySpend,
      notableChanges, healthScore, healthBand, recommendations,
    };
  }
}

export const executiveSummaryOrchestrator = new ExecutiveSummaryOrchestrator();
