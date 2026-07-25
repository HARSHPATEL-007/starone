import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

function linearProjection(values: number[], steps: number): number[] {
  const n = values.length;
  if (n < 2) return Array(steps).fill(values[0] || 0);
  const xMean = (n - 1) / 2;
  let yMean = 0;
  for (let i = 0; i < n; i++) yMean += values[i];
  yMean /= n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    num += xDiff * (values[i] - yMean);
    den += xDiff * xDiff;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  const projected: number[] = [];
  for (let i = 1; i <= steps; i++) {
    const v = intercept + slope * (n - 1 + i);
    projected.push(Math.max(0, v));
  }
  return projected;
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { campaignId } = req.query;

    const daily = await DataStore.findDailyMetrics(tenantId, 30);
    let filtered = daily;
    if (campaignId && typeof campaignId === "string") {
      filtered = daily.filter((d: any) => String(d.campaignId) === campaignId);
    }

    const padded = filtered.length >= 2 ? filtered : filtered.concat(Array.from({ length: 2 - filtered.length }, (_, i) => ({ date: new Date().toISOString(), impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 })));

    const avgDailySpend = padded.reduce((s: number, d: any) => s + (d.spend || 0), 0) / padded.length;
    const avgDailyImpressions = padded.reduce((s: number, d: any) => s + (d.impressions || 0), 0) / padded.length;
    const avgDailyClicks = padded.reduce((s: number, d: any) => s + (d.clicks || 0), 0) / padded.length;
    const avgDailyConversions = padded.reduce((s: number, d: any) => s + (d.conversions || 0), 0) / padded.length;

    const spendValues = padded.map((d: any) => d.spend || 0);
    const impressionsValues = padded.map((d: any) => d.impressions || 0);
    const clicksValues = padded.map((d: any) => d.clicks || 0);
    const conversionsValues = padded.map((d: any) => d.conversions || 0);

    const projectSpend = linearProjection(spendValues, 14);
    const projectImpressions = linearProjection(impressionsValues, 14);
    const projectClicks = linearProjection(clicksValues, 14);
    const projectConversions = linearProjection(conversionsValues, 14);

    const lastDate = new Date(padded[padded.length - 1]?.date || new Date());
    const projected: any[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i + 1);
      const pSpend = projectSpend[i];
      const pImp = projectImpressions[i];
      const pClicks = projectClicks[i];
      projected.push({
        date: d.toISOString().split("T")[0],
        spend: parseFloat(pSpend.toFixed(2)),
        impressions: Math.round(pImp),
        clicks: Math.round(pClicks),
        conversions: Math.round(projectConversions[i]),
        upperBound: parseFloat((pSpend * 1.15).toFixed(2)),
        lowerBound: parseFloat((pSpend * 0.85).toFixed(2)),
      });
    }

    let totalBudget = 0, totalSpent = 0;
    if (campaignId && typeof campaignId === "string") {
      const campaign = await DataStore.findCampaignById(campaignId, tenantId);
      if (campaign) {
        totalBudget = campaign.budget?.lifetime || 0;
        totalSpent = campaign.budget?.spent || 0;
      }
    } else {
      const allCampaigns = await DataStore.findCampaigns({ tenantId });
      totalBudget = allCampaigns.campaigns.reduce((s: number, c: any) => s + (c.budget?.lifetime || 0), 0);
      totalSpent = allCampaigns.campaigns.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0);
    }
    const remaining = Math.max(0, totalBudget - totalSpent);
    const dailyBurnRate = parseFloat(avgDailySpend.toFixed(2));
    const daysRemaining = dailyBurnRate > 0 ? Math.round(remaining / dailyBurnRate) : 999;
    const projectedEndDate = new Date();
    projectedEndDate.setDate(projectedEndDate.getDate() + daysRemaining);

    const recentCount = Math.min(padded.length, 7);
    const recentAvg = padded.slice(-recentCount).reduce((s: number, d: any) => s + (d.spend || 0), 0) / recentCount;
    const priorAvg = padded.slice(0, recentCount).reduce((s: number, d: any) => s + (d.spend || 0), 0) / recentCount;
    const trend = recentAvg > priorAvg ? "up" : recentAvg < priorAvg ? "down" : "stable";

    res.json({
      historical: filtered,
      projected,
      budget: {
        total: totalBudget,
        spent: totalSpent,
        remaining,
        utilization: totalBudget > 0 ? parseFloat(((totalSpent / totalBudget) * 100).toFixed(1)) : 0,
        dailyBurnRate,
        daysRemaining,
        projectedEndDate: projectedEndDate.toISOString().split("T")[0],
        willExceed: daysRemaining <= 14,
      },
      summary: { avgDailySpend: parseFloat(avgDailySpend.toFixed(2)), avgDailyImpressions: Math.round(avgDailyImpressions), avgDailyClicks: Math.round(avgDailyClicks), avgDailyConversions: Math.round(avgDailyConversions), trend },
    });
  })
);

router.post(
  "/scenario",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { campaignIds, budgetChange = 0, revenueTarget, cpaTarget } = req.body;

    let campaigns: any[];
    if (campaignIds && Array.isArray(campaignIds) && campaignIds.length > 0) {
      campaigns = [];
      for (const id of campaignIds) {
        const c = await DataStore.findCampaignById(id, tenantId);
        if (c) campaigns.push(c);
      }
    } else {
      const result = await DataStore.findCampaigns({ tenantId });
      campaigns = result.campaigns;
    }

    const metricsList: any[] = [];
    for (const c of campaigns) {
      const ms = await DataStore.findMetrics({ campaignId: c._id, tenantId });
      metricsList.push(...ms);
    }

    const daily = await DataStore.findDailyMetrics(tenantId, 30);
    const dailyFiltered = campaignIds && Array.isArray(campaignIds) && campaignIds.length > 0
      ? daily.filter((d: any) => campaignIds.includes(String(d.campaignId)))
      : daily;

    const currentSpend = metricsList.reduce((s, m) => s + (m.spend || 0), 0);
    const currentRevenue = metricsList.reduce((s, m) => s + (m.revenue || 0), 0);
    const currentConversions = metricsList.reduce((s, m) => s + (m.conversions || 0), 0);
    const currentImpressions = metricsList.reduce((s, m) => s + (m.impressions || 0), 0);
    const currentClicks = metricsList.reduce((s, m) => s + (m.clicks || 0), 0);
    const currentRoas = currentSpend > 0 ? currentRevenue / currentSpend : 0;
    const currentCpa = currentConversions > 0 ? currentSpend / currentConversions : 0;

    const scale = 1 + (budgetChange || 0) / 100;
    const projectedSpend = currentSpend * scale;
    const projectedRevenue = revenueTarget != null ? revenueTarget : currentRevenue * scale;
    const projectedConversions = cpaTarget != null && cpaTarget > 0 ? projectedSpend / cpaTarget : currentConversions * scale;
    const projectedImpressions = currentImpressions * scale;
    const projectedClicks = currentClicks * scale;

    const dailyAvgSpend = dailyFiltered.length > 0 ? dailyFiltered.reduce((s: number, d: any) => s + (d.spend || 0), 0) / dailyFiltered.length : 0;
    const remainingBudget = campaigns.reduce((s: number, c: any) => s + ((c.budget?.remaining || c.budget?.lifetime || 0) - (c.budget?.spent || 0)), 0);

    res.json({
      scenario: { budgetChange, revenueTarget, cpaTarget },
      current: { spend: currentSpend, revenue: currentRevenue, conversions: currentConversions, impressions: currentImpressions, clicks: currentClicks, roas: parseFloat(currentRoas.toFixed(2)), cpa: parseFloat(currentCpa.toFixed(2)) },
      projected: { spend: parseFloat(projectedSpend.toFixed(2)), revenue: parseFloat(projectedRevenue.toFixed(2)), conversions: Math.round(projectedConversions), impressions: Math.round(projectedImpressions), clicks: Math.round(projectedClicks), roas: projectedSpend > 0 ? parseFloat((projectedRevenue / projectedSpend).toFixed(2)) : 0, cpa: projectedConversions > 0 ? parseFloat((projectedSpend / projectedConversions).toFixed(2)) : 0 },
      budgetImpact: { currentDailyBurn: parseFloat(dailyAvgSpend.toFixed(2)), projectedDailyBurn: parseFloat((dailyAvgSpend * scale).toFixed(2)), remainingBudget, daysRemaining: dailyAvgSpend > 0 ? Math.round(remainingBudget / (dailyAvgSpend * scale)) : 999 },
    });
  })
);

export default router;
