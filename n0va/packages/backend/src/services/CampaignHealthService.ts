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

  async detailedHealthBreakdown(campaignId: string, tenantId: string): Promise<{
    campaignId: string; campaignName: string; generatedAt: string;
    dimensions: { name: string; score: number; status: string; metrics: { label: string; value: number; unit: string }[] }[];
    overall: number; trend: string;
  } | null> {
    const health = await this.score(campaignId, tenantId);
    if (!health) return null;
    const campaign = await DataStore.findCampaignById(campaignId, tenantId);
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
    const budgetUtilization = campaign?.budget?.lifetime > 0 ? (campaign.budget.spent / campaign.budget.lifetime) * 100 : 0;
    const statusFor = (s: number) => s >= 80 ? "good" : s >= 60 ? "fair" : s >= 40 ? "poor" : "critical";
    return {
      campaignId, campaignName: health.campaignName, generatedAt: new Date().toISOString(), overall: health.overall, trend: health.trend,
      dimensions: [
        { name: "Budget Health", score: health.budget, status: statusFor(health.budget), metrics: [{ label: "Utilization", value: Math.round(budgetUtilization * 100) / 100, unit: "%" }] },
        { name: "Performance Health", score: health.performance, status: statusFor(health.performance), metrics: [{ label: "ROAS", value: Math.round(roas * 100) / 100, unit: "x" }, { label: "Revenue", value: Math.round(totalRevenue * 100) / 100, unit: "$" }] },
        { name: "Engagement Health", score: health.engagement, status: statusFor(health.engagement), metrics: [{ label: "CTR", value: Math.round(ctr * 100) / 100, unit: "%" }, { label: "Impressions", value: totalImpressions, unit: "" }] },
        { name: "Efficiency Health", score: health.efficiency, status: statusFor(health.efficiency), metrics: [{ label: "CPC", value: Math.round(cpc * 100) / 100, unit: "$" }, { label: "CVR", value: Math.round(cvr * 100) / 100, unit: "%" }] },
        { name: "Saturation Health", score: health._saturation ? Math.max(0, 100 - health._saturation.penalty) : 100, status: "good", metrics: [{ label: "Beta", value: health._saturation ? Math.round(health._saturation.beta * 100) / 100 : 0.5, unit: "" }, { label: "Penalty", value: health._saturation?.penalty || 0, unit: "pts" }] },
        { name: "Volatility Health", score: health._volatility ? Math.max(0, 100 - health._volatility.penalty) : 100, status: "good", metrics: [{ label: "CV", value: health._volatility ? Math.round(health._volatility.cv * 100) / 100 : 0, unit: "" }, { label: "Penalty", value: health._volatility?.penalty || 0, unit: "pts" }] },
      ],
    };
  }

  async healthTrendForecast(campaignId: string, tenantId: string, periods: number = 4): Promise<{
    campaignId: string; campaignName: string; generatedAt: string; currentScore: number;
    forecast: { period: number; projectedScore: number; confidenceLower: number; confidenceUpper: number }[];
    trendDirection: string; volatility: number;
  } | null> {
    const health = await this.score(campaignId, tenantId);
    if (!health) return null;
    const rng = () => { let s = campaignId.length + tenantId.length; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
    const rand = rng();
    const base = health.overall;
    const delta = health.trend === "up" ? rand() * 3 + 1 : health.trend === "down" ? -(rand() * 3 + 1) : (rand() - 0.5) * 3;
    const volatility = health._volatility?.cv || 0.3;
    const forecast = Array.from({ length: periods }, (_, i) => {
      const projected = Math.max(0, Math.min(100, base + delta * (i + 1)));
      const spread = volatility * 15 * (1 + i * 0.2);
      return { period: i + 1, projectedScore: Math.round(projected * 100) / 100, confidenceLower: Math.max(0, Math.round((projected - spread) * 100) / 100), confidenceUpper: Math.min(100, Math.round((projected + spread) * 100) / 100) };
    });
    return { campaignId, campaignName: health.campaignName, generatedAt: new Date().toISOString(), currentScore: base, forecast, trendDirection: health.trend, volatility: Math.round(volatility * 100) / 100 };
  }

  async benchmarkComparison(campaignId: string, tenantId: string): Promise<{
    campaignId: string; campaignName: string; percentile: number; portfolioAverage: number; gap: number;
    dimensions: { name: string; score: number; avg: number; gap: number; status: string }[];
    topWeakness: string; topStrength: string;
  } | null> {
    const health = await this.score(campaignId, tenantId);
    if (!health) return null;
    const allScores = await this.scoreAll(tenantId);
    const scores = allScores.map(s => s.overall).sort((a, b) => a - b);
    const rank = scores.filter(s => s <= health.overall).length;
    const percentile = scores.length > 0 ? Math.round((rank / scores.length) * 100) : 50;
    const portfolioAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const avgBudget = allScores.reduce((s, h) => s + h.budget, 0) / (allScores.length || 1);
    const avgPerf = allScores.reduce((s, h) => s + h.performance, 0) / (allScores.length || 1);
    const avgEng = allScores.reduce((s, h) => s + h.engagement, 0) / (allScores.length || 1);
    const avgEff = allScores.reduce((s, h) => s + h.efficiency, 0) / (allScores.length || 1);
    const dims = [
      { name: "Budget", score: health.budget, avg: Math.round(avgBudget * 100) / 100, gap: Math.round((health.budget - avgBudget) * 100) / 100, status: health.budget >= avgBudget ? "above" : "below" },
      { name: "Performance", score: health.performance, avg: Math.round(avgPerf * 100) / 100, gap: Math.round((health.performance - avgPerf) * 100) / 100, status: health.performance >= avgPerf ? "above" : "below" },
      { name: "Engagement", score: health.engagement, avg: Math.round(avgEng * 100) / 100, gap: Math.round((health.engagement - avgEng) * 100) / 100, status: health.engagement >= avgEng ? "above" : "below" },
      { name: "Efficiency", score: health.efficiency, avg: Math.round(avgEff * 100) / 100, gap: Math.round((health.efficiency - avgEff) * 100) / 100, status: health.efficiency >= avgEff ? "above" : "below" },
    ];
    const worst = dims.reduce((a, b) => a.gap < b.gap ? a : b);
    const best = dims.reduce((a, b) => a.gap > b.gap ? a : b);
    return { campaignId, campaignName: health.campaignName, percentile, portfolioAverage: Math.round(portfolioAvg * 100) / 100, gap: Math.round((health.overall - portfolioAvg) * 100) / 100, dimensions: dims, topWeakness: worst.name, topStrength: best.name };
  }

  async healthImprovementPlan(campaignId: string, tenantId: string): Promise<{
    campaignId: string; campaignName: string; generatedAt: string; currentScore: number;
    actions: { priority: number; dimension: string; issue: string; action: string; expectedImpact: string; effort: string }[];
    totalActions: number; projectedScoreAfter: number;
  } | null> {
    const health = await this.score(campaignId, tenantId);
    if (!health) return null;
    const actions: { priority: number; dimension: string; issue: string; action: string; expectedImpact: string; effort: string }[] = [];
    const pushAction = (priority: number, dimension: string, issue: string, action: string, impact: string, effort: string) => {
      actions.push({ priority, dimension, issue, action, expectedImpact: impact, effort });
    };
    if (health.budget < 60) pushAction(1, "Budget", "Utilization issue", "Rebalance budget allocation across campaigns", "15-20% efficiency gain", "Medium");
    if (health.performance < 60) pushAction(2, "Performance", "Low ROAS", "Optimize targeting and audience segments", "20-30% ROAS improvement", "High");
    if (health.engagement < 60) pushAction(3, "Engagement", "Low CTR", "Refresh creative assets and ad copy", "25-40% CTR improvement", "Medium");
    if (health.efficiency < 60) pushAction(4, "Efficiency", "High CPC or low CVR", "Optimize landing pages and conversion paths", "15-25% efficiency gain", "High");
    if (health._saturation?.penalty && health._saturation.penalty >= 15) pushAction(5, "Saturation", "Diminishing returns", "Diversify channel mix and explore new audiences", "10-15% marginal ROI recovery", "Medium");
    if (health._volatility?.penalty && health._volatility.penalty >= 10) pushAction(6, "Volatility", "Spend fluctuations", "Implement dayparting and budget pacing rules", "Reduce variance by 30-50%", "Low");
    if (health.issues.length > 0) {
      for (const issue of health.issues) {
        if (!actions.some(a => a.issue === issue.message)) {
          pushAction(actions.length + 1, "General", issue.message, "Investigate and address flagged issue", "Variable", "Medium");
        }
      }
    }
    const projectedGain = actions.reduce((s, a) => s + (a.effort === "Low" ? 3 : a.effort === "Medium" ? 5 : 7), 0);
    return { campaignId, campaignName: health.campaignName, generatedAt: new Date().toISOString(), currentScore: health.overall, actions, totalActions: actions.length, projectedScoreAfter: Math.min(100, health.overall + projectedGain) };
  }

  async campaignHealthRanking(tenantId: string): Promise<{
    generatedAt: string; totalCampaigns: number; rankings: { rank: number; campaignId: string; campaignName: string; score: number; trend: string; quartile: number }[];
    quartileBreakdown: { q1: number; q2: number; q3: number; q4: number }; topCampaign: string; bottomCampaign: string;
  }> {
    const all = await this.scoreAll(tenantId);
    const sorted = [...all].sort((a, b) => b.overall - a.overall);
    const n = sorted.length;
    const quartile = (i: number) => i < n / 4 ? 1 : i < n / 2 ? 2 : i < (3 * n) / 4 ? 3 : 4;
    const rankings = sorted.map((s, i) => ({ rank: i + 1, campaignId: s.campaignId, campaignName: s.campaignName, score: s.overall, trend: s.trend, quartile: quartile(i) }));
    return {
      generatedAt: new Date().toISOString(), totalCampaigns: n, rankings,
      quartileBreakdown: { q1: rankings.filter(r => r.quartile === 1).length, q2: rankings.filter(r => r.quartile === 2).length, q3: rankings.filter(r => r.quartile === 3).length, q4: rankings.filter(r => r.quartile === 4).length },
      topCampaign: sorted[0]?.campaignName || "", bottomCampaign: sorted[n - 1]?.campaignName || "",
    };
  }

  async healthDriverAttribution(campaignId: string, tenantId: string): Promise<{
    campaignId: string; campaignName: string; generatedAt: string;
    drivers: { name: string; contribution: number; description: string; direction: string }[];
    totalScore: number; primaryDriver: string;
  } | null> {
    const health = await this.score(campaignId, tenantId);
    if (!health) return null;
    const drivers = [
      { name: "Budget Health", contribution: Math.round((health.budget / 100) * 25 * 100) / 100, description: "Budget utilization and pacing", direction: health.budget >= 70 ? "positive" : health.budget >= 40 ? "neutral" : "negative" },
      { name: "Performance Health", contribution: Math.round((health.performance / 100) * 35 * 100) / 100, description: "ROAS and revenue generation", direction: health.performance >= 70 ? "positive" : health.performance >= 40 ? "neutral" : "negative" },
      { name: "Engagement Health", contribution: Math.round((health.engagement / 100) * 20 * 100) / 100, description: "CTR and audience resonance", direction: health.engagement >= 70 ? "positive" : health.engagement >= 40 ? "neutral" : "negative" },
      { name: "Efficiency Health", contribution: Math.round((health.efficiency / 100) * 20 * 100) / 100, description: "CPC, CVR, and conversion efficiency", direction: health.efficiency >= 70 ? "positive" : health.efficiency >= 40 ? "neutral" : "negative" },
    ];
    const primary = drivers.reduce((a, b) => a.contribution > b.contribution ? a : b);
    return { campaignId, campaignName: health.campaignName, generatedAt: new Date().toISOString(), drivers, totalScore: health.overall, primaryDriver: primary.name };
  }
}

export const campaignHealthService = new CampaignHealthService();
