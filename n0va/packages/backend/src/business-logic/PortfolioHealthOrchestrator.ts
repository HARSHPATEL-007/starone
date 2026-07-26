import { Campaign } from "../models/Campaign";
import { Metric } from "../models/Metric";
import { Creative } from "../models/Creative";

export interface CampaignHealthReport {
  campaignId: string;
  name: string;
  status: string;
  healthScore: number;
  budgetUtilization: number;
  ctr: number;
  roas: number;
  trend: "improving" | "declining" | "stable" | "insufficient_data";
  issues: string[];
}

export interface PortfolioHealthReport {
  generatedAt: string;
  totalCampaigns: number;
  activeCount: number;
  avgHealthScore: number;
  healthDistribution: { healthy: number; atRisk: number; critical: number };
  topPerformers: CampaignHealthReport[];
  atRiskCampaigns: CampaignHealthReport[];
  aggregateMetrics: { totalImpressions: number; totalClicks: number; totalConversions: number; totalSpend: number; totalRevenue: number; avgCtr: number; avgRoas: number; totalBudget: number; totalSpent: number; portfolioUtilization: number };
  recommendations: string[];
}

export class PortfolioHealthOrchestrator {
  async assessCampaignHealth(campaign: any, metrics: any[]): Promise<CampaignHealthReport> {
    const budget = campaign.budget || { lifetime: 0, spent: 0 };
    const budgetUtil = budget.lifetime > 0 ? Math.round((budget.spent / budget.lifetime) * 10000) / 100 : 0;

    const agg = metrics.reduce((acc: any, m: any) => { acc.impressions += m.impressions || 0; acc.clicks += m.clicks || 0; acc.conversions += m.conversions || 0; acc.spend += m.spend || 0; acc.revenue += m.revenue || 0; return acc; }, { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });
    const ctr = agg.impressions > 0 ? Math.round((agg.clicks / agg.impressions) * 10000) / 100 : 0;
    const roas = agg.spend > 0 ? Math.round((agg.revenue / agg.spend) * 100) / 100 : 0;

    const issues: string[] = [];
    if (budgetUtil > 90) issues.push("Budget nearly exhausted (>90% utilized).");
    else if (budgetUtil > 75) issues.push("Budget running low (>75% utilized).");
    if (budget.spent > budget.lifetime && budget.lifetime > 0) issues.push("Over budget.");
    if (campaign.status === "active" && budgetUtil === 0 && agg.impressions === 0) issues.push("Active but no delivery — possible configuration issue.");
    if (roas < 1 && agg.spend > 100) issues.push(`ROAS of ${roas}x below breakeven (1.0x).`);
    if (ctr < 0.5 && agg.impressions > 1000) issues.push(`CTR of ${ctr}% below 0.5% threshold.`);
    if (!campaign.startDate) issues.push("No start date configured.");
    if (!campaign.endDate) issues.push("No end date configured.");

    const statusScore = campaign.status === "active" ? 30 : campaign.status === "paused" ? 15 : 5;
    const budgetScore = Math.max(0, 30 - Math.abs(50 - budgetUtil) * 0.6);
    const deliveryScore = agg.impressions > 0 ? Math.min(30, Math.log10(agg.impressions) * 5) : 0;
    const perfScore = roas >= 1 ? Math.min(10, roas * 3) : Math.max(-10, (roas - 1) * 10);
    const healthScore = Math.max(0, Math.min(100, Math.round(statusScore + budgetScore + deliveryScore + perfScore)));

    const sorted = [...metrics].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let trend: "improving" | "declining" | "stable" | "insufficient_data" = "insufficient_data";
    if (sorted.length >= 4) {
      const half = Math.floor(sorted.length / 2);
      const firstHalf = sorted.slice(0, half).reduce((s: number, m: any) => s + (m.roas || 0), 0) / half;
      const secondHalf = sorted.slice(half).reduce((s: number, m: any) => s + (m.roas || 0), 0) / (sorted.length - half);
      trend = secondHalf > firstHalf * 1.1 ? "improving" : secondHalf < firstHalf * 0.9 ? "declining" : "stable";
    }

    return { campaignId: campaign._id?.toString() || campaign.id, name: campaign.name || "Unnamed", status: campaign.status || "unknown", healthScore, budgetUtilization: budgetUtil, ctr, roas, trend, issues };
  }

  async generatePortfolioReport(tenantId: string): Promise<PortfolioHealthReport> {
    const campaigns = await Campaign.find({ tenantId: new (require("mongoose").Types.ObjectId)(tenantId) }).lean();
    const allMetrics = await Metric.find({ tenantId: new (require("mongoose").Types.ObjectId)(tenantId) }).lean();

    const campaignMetrics: Record<string, any[]> = {};
    for (const m of allMetrics) {
      const cid = (m as any).campaignId?.toString();
      if (!campaignMetrics[cid]) campaignMetrics[cid] = [];
      campaignMetrics[cid].push(m);
    }

    const reports: CampaignHealthReport[] = [];
    for (const c of campaigns) {
      const metrics = campaignMetrics[(c as any)._id?.toString()] || [];
      reports.push(await this.assessCampaignHealth(c, metrics));
    }

    const activeReports = reports.filter(r => r.status === "active");
    const healthy = reports.filter(r => r.healthScore >= 70);
    const atRisk = reports.filter(r => r.healthScore >= 40 && r.healthScore < 70);
    const critical = reports.filter(r => r.healthScore < 40);
    const avgScore = reports.length > 0 ? Math.round(reports.reduce((s, r) => s + r.healthScore, 0) / reports.length) : 0;
    const topPerformers = [...reports].sort((a, b) => b.healthScore - a.healthScore).slice(0, 5);
    const atRiskCampaigns = [...reports].sort((a, b) => a.healthScore - b.healthScore).filter(r => r.healthScore < 70).slice(0, 10);

    const agg = allMetrics.reduce((acc: any, m: any) => { acc.impressions += m.impressions || 0; acc.clicks += m.clicks || 0; acc.conversions += m.conversions || 0; acc.spend += m.spend || 0; acc.revenue += m.revenue || 0; return acc; }, { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });
    const totalBudget = campaigns.reduce((s: number, c: any) => s + (c.budget?.lifetime || 0), 0);
    const totalSpent = campaigns.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0);

    const recommendations: string[] = [];
    if (atRisk.length > 0) recommendations.push(`${atRisk.length} campaign(s) at risk (score 40-69). Review budget pacing and creative performance.`);
    if (critical.length > 0) recommendations.push(`${critical.length} campaign(s) in critical condition (score < 40). Immediate attention required.`);
    if (topPerformers.length > 0) recommendations.push(`Top performer: "${topPerformers[0].name}" (score: ${topPerformers[0].healthScore}). Analyze and replicate winning patterns.`);
    const declining = reports.filter(r => r.trend === "declining");
    if (declining.length > 0) recommendations.push(`${declining.length} campaign(s) showing declining ROAS trend. Consider budget reallocation.`);

    return {
      generatedAt: new Date().toISOString(), totalCampaigns: campaigns.length, activeCount: activeReports.length,
      avgHealthScore: avgScore,
      healthDistribution: { healthy: healthy.length, atRisk: atRisk.length, critical: critical.length },
      topPerformers, atRiskCampaigns,
      aggregateMetrics: { ...agg, avgCtr: agg.impressions > 0 ? Math.round((agg.clicks / agg.impressions) * 10000) / 100 : 0, avgRoas: agg.spend > 0 ? Math.round((agg.revenue / agg.spend) * 100) / 100 : 0, totalBudget, totalSpent, portfolioUtilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 10000) / 100 : 0 },
      recommendations,
    };
  }
}

export const portfolioHealthOrchestrator = new PortfolioHealthOrchestrator();
