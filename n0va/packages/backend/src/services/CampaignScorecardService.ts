import { DataStore } from "./DataStore";

export class CampaignScorecardService {
  getScorecard(tenantId: string, campaignId?: string) {
    const mem = DataStore["mem"]();
    const campaigns = campaignId
      ? [mem.findOne("campaigns", (c: any) => c._id === campaignId)].filter(Boolean)
      : mem.find("campaigns", (c: any) => c.tenantId === tenantId);
    const metrics = mem.find("metrics", () => true);
    const recentMetrics = metrics.slice(-30);

    const scoreCampaign = (campaign: any) => {
      const campMetrics = recentMetrics.filter((m: any) => m.campaignId === campaign._id);
      const avg = (field: string) => { const vals = campMetrics.map((m: any) => Number(m[field]) || 0); return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0; };
      const total = (field: string) => { const vals = campMetrics.map((m: any) => Number(m[field]) || 0); return vals.reduce((a: number, b: number) => a + b, 0); };

      const impressions = total("impressions");
      const clicks = total("clicks");
      const conversions = total("conversions");
      const spend = total("spend");
      const revenue = total("revenue");

      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const cpa = conversions > 0 ? spend / conversions : 0;
      const roas = spend > 0 ? revenue / spend : 0;
      const budgetUtil = campaign.budget?.lifetime > 0 ? ((campaign.budget?.spent || 0) / campaign.budget.lifetime) * 100 : 0;
      const isActive = campaign.status === "active";

      const healthScore = (() => {
        let score = 50;
        if (ctr > 2.5) score += 10; else if (ctr > 1.5) score += 5;
        if (cvr > 3) score += 10; else if (cvr > 1.5) score += 5;
        if (roas > 3) score += 10; else if (roas > 1.5) score += 5;
        if (cpc < 2) score += 5;
        if (cpa < 30) score += 5;
        if (budgetUtil > 20 && budgetUtil < 90) score += 5;
        if (isActive) score += 5;
        return Math.min(100, Math.max(0, score));
      })();

      const roiScore = (() => {
        let score = 50;
        if (roas > 4) score += 20; else if (roas > 2) score += 10;
        if (cpa < 20) score += 15; else if (cpa < 40) score += 8;
        if (revenue > spend * 2) score += 15;
        return Math.min(100, Math.max(0, score));
      })();

      const engagementScore = (() => {
        let score = 50;
        if (ctr > 3) score += 20; else if (ctr > 2) score += 10;
        if (clicks > 1000) score += 10;
        if (impressions > 50000) score += 10;
        if (avg("engagement") || 0 > 3) score += 10;
        return Math.min(100, Math.max(0, score));
      })();

      const conversionScore = (() => {
        let score = 50;
        if (cvr > 5) score += 20; else if (cvr > 3) score += 10;
        if (conversions > 100) score += 15; else if (conversions > 30) score += 8;
        if (revenue > 10000) score += 15;
        return Math.min(100, Math.max(0, score));
      })();

      const efficiencyScore = (() => {
        let score = 50;
        if (cpc < 1) score += 15; else if (cpc < 2) score += 8;
        if (cpa < 15) score += 15; else if (cpa < 30) score += 8;
        if (budgetUtil > 50 && budgetUtil < 95) score += 10;
        if (roas > 3) score += 10;
        return Math.min(100, Math.max(0, score));
      })();

      const overall = Math.round((healthScore + roiScore + engagementScore + conversionScore + efficiencyScore) / 5);

      return {
        campaignId: campaign._id,
        campaignName: campaign.name,
        status: campaign.status,
        overall,
        scores: {
          health: healthScore,
          roi: roiScore,
          engagement: engagementScore,
          conversion: conversionScore,
          efficiency: efficiencyScore,
        },
        metrics: { impressions, clicks, conversions, spend, revenue, ctr: +ctr.toFixed(2), cvr: +cvr.toFixed(2), cpc: +cpc.toFixed(2), cpa: +cpa.toFixed(2), roas: +roas.toFixed(2), budgetUtil: +budgetUtil.toFixed(1) },
      };
    };

    const scored = campaigns.map(scoreCampaign);
    const avgScore = scored.length ? Math.round(scored.reduce((s: number, c: any) => s + c.overall, 0) / scored.length) : 0;
    const best = scored.length ? scored.reduce((best: any, c: any) => c.overall > (best?.overall || 0) ? c : best, scored[0]) : null;
    const worst = scored.length ? scored.reduce((worst: any, c: any) => c.overall < (worst?.overall || 100) ? c : worst, scored[0]) : null;

    return {
      campaigns: scored,
      summary: { totalCampaigns: scored.length, avgScore, bestCampaign: best ? { name: best.campaignName, score: best.overall } : null, needsAttention: worst && worst.overall < 40 ? { name: worst.campaignName, score: worst.overall } : null },
      distribution: [
        { tier: "Excellent (80+)", count: scored.filter((c: any) => c.overall >= 80).length, color: "#10b981" },
        { tier: "Good (60-79)", count: scored.filter((c: any) => c.overall >= 60 && c.overall < 80).length, color: "#4f46e5" },
        { tier: "Fair (40-59)", count: scored.filter((c: any) => c.overall >= 40 && c.overall < 60).length, color: "#f59e0b" },
        { tier: "Poor (<40)", count: scored.filter((c: any) => c.overall < 40).length, color: "#ef4444" },
      ],
    };
  }
}

export const campaignScorecardService = new CampaignScorecardService();
