import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { sendSuccess, safeInt } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

function linearProjection(values: number[], steps: number): { values: number[]; slope: number; rSquared: number } {
  const n = values.length;
  if (n < 2) return { values: Array(steps).fill(values[0] || 0), slope: 0, rSquared: 0 };
  const xMean = (n - 1) / 2;
  let yMean = 0;
  for (let i = 0; i < n; i++) yMean += values[i];
  yMean /= n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { const xDiff = i - xMean; num += xDiff * (values[i] - yMean); den += xDiff * xDiff; }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  const projected: number[] = [];
  for (let i = 1; i <= steps; i++) projected.push(Math.max(0, intercept + slope * (n - 1 + i)));
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) { const fitted = intercept + slope * i; ssRes += (values[i] - fitted) ** 2; ssTot += (values[i] - yMean) ** 2; }
  const rSquared = ssTot > 0 ? parseFloat((1 - ssRes / ssTot).toFixed(4)) : 0;
  return { values: projected, slope: parseFloat(slope.toFixed(4)), rSquared };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { campaignId } = req.query;
    const daily = await DataStore.findDailyMetrics(tenantId, 30);
    let filtered = daily;
    if (campaignId && typeof campaignId === "string") filtered = daily.filter((d: any) => String(d.campaignId) === campaignId);
    const padded = filtered.length >= 2 ? filtered : filtered.concat(Array.from({ length: 2 - filtered.length }, (_, i) => ({ date: new Date().toISOString(), impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 })));

    const avgDailySpend = padded.reduce((s: number, d: any) => s + (d.spend || 0), 0) / padded.length;
    const avgDailyImpressions = padded.reduce((s: number, d: any) => s + (d.impressions || 0), 0) / padded.length;
    const avgDailyClicks = padded.reduce((s: number, d: any) => s + (d.clicks || 0), 0) / padded.length;
    const avgDailyConversions = padded.reduce((s: number, d: any) => s + (d.conversions || 0), 0) / padded.length;

    const spendProj = linearProjection(padded.map((d: any) => d.spend || 0), 14);
    const impressionsProj = linearProjection(padded.map((d: any) => d.impressions || 0), 14);
    const clicksProj = linearProjection(padded.map((d: any) => d.clicks || 0), 14);
    const conversionsProj = linearProjection(padded.map((d: any) => d.conversions || 0), 14);

    const lastDate = new Date(padded[padded.length - 1]?.date || new Date());
    const projected: any[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(lastDate); d.setDate(d.getDate() + i + 1);
      projected.push({ date: d.toISOString().split("T")[0], spend: parseFloat(spendProj.values[i].toFixed(2)), impressions: Math.round(impressionsProj.values[i]), clicks: Math.round(clicksProj.values[i]), conversions: Math.round(conversionsProj.values[i]), upperBound: parseFloat((spendProj.values[i] * 1.15).toFixed(2)), lowerBound: parseFloat((spendProj.values[i] * 0.85).toFixed(2)) });
    }

    let totalBudget = 0, totalSpent = 0;
    if (campaignId && typeof campaignId === "string") {
      const campaign = await DataStore.findCampaignById(campaignId, tenantId);
      if (campaign) { totalBudget = campaign.budget?.lifetime || 0; totalSpent = campaign.budget?.spent || 0; }
    } else {
      const allCampaigns = await DataStore.findCampaigns({ tenantId });
      totalBudget = allCampaigns.campaigns.reduce((s: number, c: any) => s + (c.budget?.lifetime || 0), 0);
      totalSpent = allCampaigns.campaigns.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0);
    }
    const remaining = Math.max(0, totalBudget - totalSpent);
    const dailyBurnRate = parseFloat(avgDailySpend.toFixed(2));
    const daysRemaining = dailyBurnRate > 0 ? Math.round(remaining / dailyBurnRate) : 999;
    const projectedEndDate = new Date(); projectedEndDate.setDate(projectedEndDate.getDate() + daysRemaining);

    const recentCount = Math.min(padded.length, 7);
    const recentAvg = padded.slice(-recentCount).reduce((s: number, d: any) => s + (d.spend || 0), 0) / recentCount;
    const priorAvg = padded.slice(0, recentCount).reduce((s: number, d: any) => s + (d.spend || 0), 0) / recentCount;
    const trend = recentAvg > priorAvg * 1.1 ? "increasing" : recentAvg < priorAvg * 0.9 ? "decreasing" : "stable";
    const volatility = padded.length > 1 ? parseFloat((padded.reduce((s: number, d: any) => s + Math.abs((d.spend || 0) - avgDailySpend), 0) / (padded.length * Math.max(1, avgDailySpend))).toFixed(4)) : 0;

    sendSuccess(res, {
      historical: filtered, projected,
      budget: { total: totalBudget, spent: totalSpent, remaining, utilization: totalBudget > 0 ? parseFloat(((totalSpent / totalBudget) * 100).toFixed(1)) : 0, dailyBurnRate, daysRemaining, projectedEndDate: projectedEndDate.toISOString().split("T")[0], willExceed: daysRemaining <= 14 },
      summary: { avgDailySpend: parseFloat(avgDailySpend.toFixed(2)), avgDailyImpressions: Math.round(avgDailyImpressions), avgDailyClicks: Math.round(avgDailyClicks), avgDailyConversions: Math.round(avgDailyConversions), trend, volatility, modelFit: spendProj.rSquared, dailySlope: spendProj.slope },
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
      campaigns = []; for (const id of campaignIds) { const c = await DataStore.findCampaignById(id, tenantId); if (c) campaigns.push(c); }
    } else { const result = await DataStore.findCampaigns({ tenantId }); campaigns = result.campaigns; }

    const metricsList: any[] = [];
    for (const c of campaigns) { const ms = await DataStore.findMetrics({ campaignId: c._id, tenantId }); metricsList.push(...ms); }
    const daily = await DataStore.findDailyMetrics(tenantId, 30);
    const dailyFiltered = campaignIds && Array.isArray(campaignIds) && campaignIds.length > 0 ? daily.filter((d: any) => campaignIds.includes(String(d.campaignId))) : daily;

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
    const projectedRoas = projectedSpend > 0 ? projectedRevenue / projectedSpend : 0;
    const projectedCpa = projectedConversions > 0 ? projectedSpend / projectedConversions : 0;

    const dailyAvgSpend = dailyFiltered.length > 0 ? dailyFiltered.reduce((s: number, d: any) => s + (d.spend || 0), 0) / dailyFiltered.length : 0;
    const remainingBudget = campaigns.reduce((s: number, c: any) => s + ((c.budget?.remaining || c.budget?.lifetime || 0) - (c.budget?.spent || 0)), 0);
    const incrementalRevenue = projectedRevenue - currentRevenue;
    const incrementalCost = projectedSpend - currentSpend;
    const marginalRoas = incrementalCost > 0 ? parseFloat((incrementalRevenue / incrementalCost).toFixed(2)) : 0;
    const roi = projectedSpend > 0 ? parseFloat((((projectedRevenue - projectedSpend) / projectedSpend) * 100).toFixed(1)) : 0;

    sendSuccess(res, {
      scenario: { budgetChange, revenueTarget, cpaTarget },
      current: { spend: currentSpend, revenue: currentRevenue, conversions: currentConversions, impressions: currentImpressions, clicks: currentClicks, roas: parseFloat(currentRoas.toFixed(2)), cpa: parseFloat(currentCpa.toFixed(2)), roi: currentSpend > 0 ? parseFloat((((currentRevenue - currentSpend) / currentSpend) * 100).toFixed(1)) : 0 },
      projected: { spend: parseFloat(projectedSpend.toFixed(2)), revenue: parseFloat(projectedRevenue.toFixed(2)), conversions: Math.round(projectedConversions), impressions: Math.round(projectedImpressions), clicks: Math.round(projectedClicks), roas: parseFloat(projectedRoas.toFixed(2)), cpa: parseFloat(projectedCpa.toFixed(2)), roi },
      delta: { spend: parseFloat((projectedSpend - currentSpend).toFixed(2)), revenue: parseFloat(incrementalRevenue.toFixed(2)), conversions: Math.round(projectedConversions - currentConversions), impressions: Math.round(projectedImpressions - currentImpressions), clicks: Math.round(projectedClicks - currentClicks) },
      efficiency: { marginalRoas, incrementalRevenue: parseFloat(incrementalRevenue.toFixed(2)), incrementalCost: parseFloat(incrementalCost.toFixed(2)), currentEfficiency: currentCpa > 0 ? parseFloat((currentRoas / currentCpa).toFixed(4)) : 0 },
      budgetImpact: { currentDailyBurn: parseFloat(dailyAvgSpend.toFixed(2)), projectedDailyBurn: parseFloat((dailyAvgSpend * scale).toFixed(2)), remainingBudget, daysRemaining: dailyAvgSpend > 0 ? Math.round(remainingBudget / (dailyAvgSpend * scale)) : 999 },
    });
  })
);

export default router;
