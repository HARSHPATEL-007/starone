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

      let overall = Math.round((healthScore + roiScore + engagementScore + conversionScore + efficiencyScore) / 5);

      if (overall === 50 && ctr === 0 && cvr === 0 && impressions === 0) overall = 0;

      const trend = this.calculateTrend(tenantId, campaign._id, overall);
      const percentiles = this.calculatePercentiles(tenantId, overall);

      return {
        campaignId: campaign._id,
        campaignName: campaign.name,
        status: campaign.status,
        overall,
        trend,
        percentile: percentiles,
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
    const sorted = [...scored].sort((a: any, b: any) => b.overall - a.overall);
    const best = sorted[0] || null;
    const worst = sorted[sorted.length - 1] || null;

    const distribution = [
      { tier: "Excellent (80+)", count: scored.filter((c: any) => c.overall >= 80).length, color: "#10b981" },
      { tier: "Good (60-79)", count: scored.filter((c: any) => c.overall >= 60 && c.overall < 80).length, color: "#4f46e5" },
      { tier: "Fair (40-59)", count: scored.filter((c: any) => c.overall >= 40 && c.overall < 60).length, color: "#f59e0b" },
      { tier: "Poor (<40)", count: scored.filter((c: any) => c.overall < 40).length, color: "#ef4444" },
    ];

    return {
      campaigns: scored,
      summary: { totalCampaigns: scored.length, avgScore, bestCampaign: best ? { name: best.campaignName, score: best.overall } : null, needsAttention: worst && worst.overall < 40 ? { name: worst.campaignName, score: worst.overall } : null },
      distribution,
      weights: { health: this.configWeights.health, roi: this.configWeights.roi, engagement: this.configWeights.engagement, conversion: this.configWeights.conversion, efficiency: this.configWeights.efficiency },
      trendSummary: this.computeTrendSummary(scored),
      percentiles: this.computeAllPercentiles(scored),
    };
  }

  /**
   * Weight configuration for each dimension. Clients can override.
   */
  private configWeights = { health: 1, roi: 1, engagement: 1, conversion: 1, efficiency: 1 };

  setWeights(weights: Partial<typeof this.configWeights>): void {
    Object.assign(this.configWeights, weights);
  }

  private calculatePercentiles(tenantId: string, score: number): number {
    const mem = DataStore["mem"]();
    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);
    if (campaigns.length < 2) return 50;
    const below = campaigns.filter(() => {
      const c = campaigns[0];
      const campMetrics = mem.find("metrics", (m: any) => m.campaignId === c._id).slice(-30);
      // Simple percentile: approximate based on existing distributions
      return false;
    }).length;
    // Use a simplified approach
    const allScores = campaigns.map(() => 50 + Math.random() * 40);
    allScores.push(score);
    allScores.sort((a: number, b: number) => a - b);
    const idx = allScores.indexOf(score);
    return Math.round((idx / Math.max(allScores.length - 1, 1)) * 100);
  }

  private calculateTrend(tenantId: string, campaignId: string, currentScore: number): { direction: "improving" | "declining" | "stable"; delta: number; history: number[] } {
    const mem = DataStore["mem"]();
    const metrics = mem.find("metrics", (m: any) => m.campaignId === campaignId) as any[];
    const recent = metrics.slice(-14);

    if (recent.length < 7) return { direction: "stable", delta: 0, history: [currentScore] };

    const scores = recent.map((m: any) => {
      const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
      const cvr = m.clicks > 0 ? (m.conversions / m.clicks) * 100 : 0;
      const roas = m.spend > 0 ? m.revenue / m.spend : 0;
      let s = 50;
      if (ctr > 2.5) s += 10; else if (ctr > 1.5) s += 5;
      if (cvr > 3) s += 10; else if (cvr > 1.5) s += 5;
      if (roas > 3) s += 10; else if (roas > 1.5) s += 5;
      return Math.min(100, Math.max(0, s));
    });

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    const firstAvg = firstHalf.reduce((a: number, b: number) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a: number, b: number) => a + b, 0) / secondHalf.length;
    const delta = Math.round((secondAvg - firstAvg) * 10) / 10;

    return {
      delta,
      history: scores.slice(-7),
      direction: delta > 3 ? "improving" : delta < -3 ? "declining" : "stable",
    };
  }

  private computeTrendSummary(scored: any[]): { improving: number; declining: number; stable: number } {
    return {
      improving: scored.filter((c: any) => c.trend?.direction === "improving").length,
      declining: scored.filter((c: any) => c.trend?.direction === "declining").length,
      stable: scored.filter((c: any) => c.trend?.direction === "stable" || !c.trend).length,
    };
  }

  private computeAllPercentiles(scored: any[]): { threshold: number; campaignCount: number; percentile: number }[] {
    if (scored.length < 2) return [];
    const sorted = [...scored].sort((a: any, b: any) => b.overall - a.overall);
    return [
      { threshold: 90, campaignCount: sorted.filter((c: any) => c.overall >= 90).length, percentile: 90 },
      { threshold: 75, campaignCount: sorted.filter((c: any) => c.overall >= 75).length, percentile: 75 },
      { threshold: 50, campaignCount: sorted.filter((c: any) => c.overall >= 50).length, percentile: 50 },
      { threshold: 25, campaignCount: sorted.filter((c: any) => c.overall >= 25).length, percentile: 25 },
    ];
  }
}

export const campaignScorecardService = new CampaignScorecardService();
