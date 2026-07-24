import { DataStore } from "./DataStore";

export interface CampaignHealthScore {
  campaignId: string;
  campaignName: string;
  overall: number;
  budget: number;
  performance: number;
  engagement: number;
  efficiency: number;
  issues: { type: string; severity: "critical" | "warning" | "info"; message: string }[];
  trend: "up" | "down" | "stable";
}

export class CampaignHealthService {
  async score(campaignId: string, tenantId: string): Promise<CampaignHealthScore | null> {
    const campaign = await DataStore.findCampaignById(campaignId, tenantId);
    if (!campaign) return null;

    const metrics = await DataStore.findMetrics({ campaignId, tenantId });
    const campaignMetrics = Array.isArray(metrics) ? metrics : [];

    const totalImpressions = campaignMetrics.reduce((s: number, m: any) => s + (m.impressions || 0), 0);
    const totalClicks = campaignMetrics.reduce((s: number, m: any) => s + (m.clicks || 0), 0);
    const totalConversions = campaignMetrics.reduce((s: number, m: any) => s + (m.conversions || 0), 0);
    const totalSpend = campaignMetrics.reduce((s: number, m: any) => s + (m.spend || 0), 0);
    const totalRevenue = campaignMetrics.reduce((s: number, m: any) => s + (m.revenue || 0), 0);

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cvr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const budgetUtilization = campaign.budget?.lifetime > 0
      ? (campaign.budget.spent / campaign.budget.lifetime) * 100
      : 0;

    const issues: CampaignHealthScore["issues"] = [];

    let budgetScore = 100;
    if (budgetUtilization > 90) {
      budgetScore = 50;
      issues.push({ type: "budget_exhausted", severity: "critical", message: `Budget ${budgetUtilization.toFixed(0)}% utilized` });
    } else if (budgetUtilization > 75) {
      budgetScore = 70;
      issues.push({ type: "budget_high", severity: "warning", message: `Budget ${budgetUtilization.toFixed(0)}% utilized` });
    } else if (budgetUtilization < 10 && campaign.status === "active") {
      budgetScore = 60;
      issues.push({ type: "budget_underused", severity: "warning", message: "Budget severely underutilized" });
    }

    let perfScore = 100;
    if (roas < 1) {
      perfScore = 40;
      issues.push({ type: "negative_roas", severity: "critical", message: `ROAS ${roas.toFixed(2)}x — below breakeven` });
    } else if (roas < 2) {
      perfScore = 65;
      issues.push({ type: "low_roas", severity: "warning", message: `ROAS ${roas.toFixed(2)}x — below target` });
    }

    let engagementScore = 100;
    if (ctr < 0.5) {
      engagementScore = 40;
      issues.push({ type: "low_ctr", severity: "critical", message: `CTR ${ctr.toFixed(2)}% — critically low` });
    } else if (ctr < 1.5) {
      engagementScore = 70;
      issues.push({ type: "below_avg_ctr", severity: "warning", message: `CTR ${ctr.toFixed(2)}% — below average` });
    }

    let efficiencyScore = 100;
    if (cpc > 5) {
      efficiencyScore = 50;
      issues.push({ type: "high_cpc", severity: "warning", message: `CPC $${cpc.toFixed(2)} — above threshold` });
    }
    if (cvr < 1 && totalClicks > 100) {
      efficiencyScore = Math.min(efficiencyScore, 45);
      issues.push({ type: "low_cvr", severity: "critical", message: `CVR ${cvr.toFixed(2)}% — conversion bottleneck` });
    }

    const overall = Math.round((budgetScore + perfScore + engagementScore + efficiencyScore) / 4);

    const recent = campaignMetrics.slice(-7);
    const recentCtr = recent.length > 0
      ? recent.reduce((s: number, m: any) => s + ((m.impressions || 0) > 0 ? ((m.clicks || 0) / (m.impressions || 1)) * 100 : 0), 0) / recent.length
      : 0;
    const older = campaignMetrics.slice(0, Math.max(0, campaignMetrics.length - 7));
    const olderCtr = older.length > 0
      ? older.reduce((s: number, m: any) => s + ((m.impressions || 0) > 0 ? ((m.clicks || 0) / (m.impressions || 1)) * 100 : 0), 0) / older.length
      : 0;
    const trend: "up" | "down" | "stable" = recentCtr > olderCtr * 1.05 ? "up" : recentCtr < olderCtr * 0.95 ? "down" : "stable";

    return {
      campaignId: campaign._id,
      campaignName: campaign.name || "Unknown",
      overall,
      budget: budgetScore,
      performance: perfScore,
      engagement: engagementScore,
      efficiency: efficiencyScore,
      issues,
      trend,
    };
  }

  async scoreAll(tenantId: string): Promise<CampaignHealthScore[]> {
    const { campaigns } = await DataStore.findCampaigns({ tenantId }, { createdAt: -1 }, 0, 100);
    const results = await Promise.allSettled(
      campaigns.map((c: any) => this.score(c._id, tenantId))
    );
    return results
      .filter((r) => r.status === "fulfilled" && r.value)
      .map((r: any) => r.value);
  }

  async generateSampleScores(tenantId: string): Promise<CampaignHealthScore[]> {
    const names = ["Q3 Product Launch", "Summer Sale", "Brand Awareness", "Retargeting Q3", "Prospecting Campaign"];
    return names.map((name, i) => {
      const overall = Math.floor(Math.random() * 40) + 55;
      const issues: CampaignHealthScore["issues"] = [];
      if (overall < 65) issues.push({ type: "needs_attention", severity: "critical", message: `${name} requires immediate optimization` });
      if (overall < 80 && Math.random() > 0.5) issues.push({ type: "optimization", severity: "warning", message: "CTR below industry benchmark" });
      return {
        campaignId: `sample_${i}`,
        campaignName: name,
        overall,
        budget: Math.floor(Math.random() * 40) + 60,
        performance: Math.floor(Math.random() * 40) + 60,
        engagement: Math.floor(Math.random() * 40) + 60,
        efficiency: Math.floor(Math.random() * 40) + 60,
        issues,
        trend: (["up", "down", "stable"] as const)[Math.floor(Math.random() * 3)],
      };
    });
  }
}

export const campaignHealthService = new CampaignHealthService();
