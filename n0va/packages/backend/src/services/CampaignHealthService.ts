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
  _saturation?: { penalty: number; beta: number };
  _volatility?: { penalty: number; cv: number };
  _trendDetails?: { ctrDelta: number; roasDelta: number; convDelta: number; compositeDelta: number };
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

    // ─── Saturation-aware adjustment ──────────────────────────────────
    const sortedMetrics = [...campaignMetrics].sort((a: any, b: any) =>
      new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());
    const cumSpend: number[] = [];
    const cumConv: number[] = [];
    for (const m of sortedMetrics) {
      const s = Number(m.spend) || 0;
      const c = Number(m.conversions) || 0;
      cumSpend.push((cumSpend[cumSpend.length - 1] || 0) + s);
      cumConv.push((cumConv[cumSpend.length - 1] || 0) + c);
    }

    let saturationPenalty = 0;
    let betaVal = 0.5;
    if (cumSpend.length >= 5) {
      const n = cumSpend.length;
      const logX = cumSpend.slice(1).map((x) => Math.log(Math.max(x, 0.01)));
      const logY = cumConv.slice(1).map((y) => Math.log(Math.max(y, 0.01)));
      const mx = logX.reduce((a, b) => a + b, 0) / logX.length;
      const my = logY.reduce((a, b) => a + b, 0) / logY.length;
      let num = 0, den = 0;
      for (let i = 0; i < logX.length; i++) {
        num += (logX[i] - mx) * (logY[i] - my);
        den += (logX[i] - mx) ** 2;
      }
      betaVal = den > 0 ? num / den : 0.5;
      if (betaVal < 0.2) saturationPenalty = 30;
      else if (betaVal < 0.4) saturationPenalty = 15;
      else if (betaVal < 0.6) saturationPenalty = 5;
    }

    let volatilityPenalty = 0;
    let cvVal = 0;
    if (campaignMetrics.length >= 7) {
      const recentSpends = campaignMetrics.slice(-7).map((m: any) => Number(m.spend) || 0);
      const mean = recentSpends.reduce((a: number, b: number) => a + b, 0) / recentSpends.length;
      const variance = recentSpends.reduce((a: number, b: number) => a + (b - mean) ** 2, 0) / recentSpends.length;
      cvVal = mean > 0 ? Math.sqrt(variance) / mean : 0;
      if (cvVal > 1.5) volatilityPenalty = 20;
      else if (cvVal > 1.0) volatilityPenalty = 10;
      else if (cvVal > 0.5) volatilityPenalty = 5;
    }

    const overall = Math.max(0, Math.round((budgetScore + perfScore + engagementScore + efficiencyScore) / 4 - saturationPenalty - volatilityPenalty));

    if (saturationPenalty > 0) issues.push({ type: "diminishing_returns", severity: saturationPenalty >= 30 ? "critical" : "warning", message: `Saturation detected (beta=${betaVal.toFixed(2)}). Marginal ROI declining.` });
    if (volatilityPenalty > 15) issues.push({ type: "high_volatility", severity: "warning", message: "Spend volatility is high. Consider pacing adjustments." });

    // ─── Multi-metric trend detection ───────────────────────────────
    const recent = campaignMetrics.slice(-7);
    const older = campaignMetrics.slice(0, Math.max(0, campaignMetrics.length - 7));
    const recentCtr = recent.length > 0
      ? recent.reduce((s: number, m: any) => s + ((m.impressions || 0) > 0 ? ((m.clicks || 0) / (m.impressions || 1)) * 100 : 0), 0) / recent.length : 0;
    const olderCtr = older.length > 0
      ? older.reduce((s: number, m: any) => s + ((m.impressions || 0) > 0 ? ((m.clicks || 0) / (m.impressions || 1)) * 100 : 0), 0) / older.length : 0;

    const recentRoas = recent.length > 0
      ? recent.reduce((s: number, m: any) => s + ((m.spend || 0) > 0 ? ((m.revenue || 0) / (m.spend || 1)) : 0), 0) / recent.length : 0;
    const olderRoas = older.length > 0
      ? older.reduce((s: number, m: any) => s + ((m.spend || 0) > 0 ? ((m.revenue || 0) / (m.spend || 1)) : 0), 0) / older.length : 0;

    // Composite trend from CTR + ROAS + conversions
    const ctrDelta = olderCtr > 0 ? (recentCtr - olderCtr) / olderCtr : 0;
    const roasDelta = olderRoas > 0 ? (recentRoas - olderRoas) / olderRoas : 0;
    const convDelta = campaignMetrics.length >= 14
      ? (recent.reduce((s: number, m: any) => s + (Number(m.conversions) || 0), 0) - older.reduce((s: number, m: any) => s + (Number(m.conversions) || 0), 0)) / Math.max(older.reduce((s: number, m: any) => s + (Number(m.conversions) || 0), 0), 1) : 0;

    const compositeDelta = ctrDelta * 0.3 + roasDelta * 0.4 + convDelta * 0.3;
    const trend: "up" | "down" | "stable" = compositeDelta > 0.05 ? "up" : compositeDelta < -0.05 ? "down" : "stable";

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
      _saturation: { penalty: saturationPenalty, beta: betaVal },
      _volatility: { penalty: volatilityPenalty, cv: cvVal },
      _trendDetails: { ctrDelta: Math.round(ctrDelta * 1000) / 1000, roasDelta: Math.round(roasDelta * 1000) / 1000, convDelta: Math.round(convDelta * 1000) / 1000, compositeDelta: Math.round(compositeDelta * 1000) / 1000 },
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
