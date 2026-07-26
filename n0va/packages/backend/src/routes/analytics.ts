import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { roiCalculatorService } from "../services/ROICalculatorService";
import { roiCalculatorOrchestrator } from "../business-logic/ROICalculatorOrchestrator";
import { sendSuccess, safeInt } from "./route-utils";
import { cohortAnalysisOrchestrator } from "../business-logic/CohortAnalysisOrchestrator";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/overview",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const dayCount = safeInt(req.query.days, 30);

    const campaigns = await DataStore.findCampaigns({ tenantId });
    const totalBudget = campaigns.campaigns.reduce((s: number, c: any) => s + (c.budget?.lifetime || 0), 0);
    const totalSpent = campaigns.campaigns.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0);
    const activeCount = campaigns.campaigns.filter((c: any) => c.status === "active").length;
    const dailyMetrics = DataStore.findDailyMetrics(tenantId, dayCount);

    const agg = await DataStore.aggregateMetrics([
      { $match: { tenantId } },
      { $group: { _id: null, totalImpressions: { $sum: "$impressions" }, totalClicks: { $sum: "$clicks" }, totalConversions: { $sum: "$conversions" }, totalSpend: { $sum: "$spend" }, totalRevenue: { $sum: "$revenue" } } },
    ]);
    const metrics = Array.isArray(agg) && agg.length > 0 ? agg[0] : { totalImpressions: 0, totalClicks: 0, totalConversions: 0, totalSpend: 0, totalRevenue: 0, avgCtr: 0, avgRoas: 0 };

    const utilization = totalBudget > 0 ? parseFloat(((totalSpent / totalBudget) * 100).toFixed(1)) : 0;
    const ctr = metrics.totalImpressions > 0 ? parseFloat(((metrics.totalClicks / metrics.totalImpressions) * 100).toFixed(2)) : 0;
    const roas = metrics.totalSpend > 0 ? parseFloat((metrics.totalRevenue / metrics.totalSpend).toFixed(2)) : 0;
    const cpa = metrics.totalConversions > 0 ? parseFloat((metrics.totalSpend / metrics.totalConversions).toFixed(2)) : 0;

    const dailyArray: any[] = Array.isArray(dailyMetrics) ? dailyMetrics : [];
    const spendTrend = dailyArray.length >= 7
      ? (() => { const recent = dailyArray.slice(-7).reduce((s: number, d: any) => s + (d.spend || 0), 0) / 7; const prior = dailyArray.slice(-14, -7).reduce((s: number, d: any) => s + (d.spend || 0), 0) / 7; return recent > prior * 1.1 ? "increasing" : recent < prior * 0.9 ? "decreasing" : "stable"; })()
      : "insufficient_data";

    sendSuccess(res, {
      totalCampaigns: campaigns.campaigns.length, activeCampaigns: activeCount,
      totalBudget, totalSpent, remaining: totalBudget - totalSpent, utilization,
      metrics: { ...metrics, ctr, roas, cpa },
      dailyMetrics: dailyArray,
      health: { spendTrend, activeRatio: campaigns.campaigns.length > 0 ? parseFloat(((activeCount / campaigns.campaigns.length) * 100).toFixed(1)) : 0 },
    });
  })
);

router.get(
  "/campaign/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const dayCount = safeInt(req.query.days, 30);
    const from = new Date(Date.now() - dayCount * 86400000);
    const metrics = await DataStore.findMetrics({ tenantId, campaignId: id, date: { $gte: from } });

    const byPlatform: Record<string, any[]> = {};
    for (const m of metrics) {
      if (!byPlatform[m.platform]) byPlatform[m.platform] = [];
      byPlatform[m.platform].push(m);
    }

    const platformSummary = Object.entries(byPlatform).map(([platform, ms]) => {
      const impressions = ms.reduce((s, m: any) => s + (m.impressions || 0), 0);
      const clicks = ms.reduce((s, m: any) => s + (m.clicks || 0), 0);
      const conversions = ms.reduce((s, m: any) => s + (m.conversions || 0), 0);
      const spend = ms.reduce((s, m: any) => s + (m.spend || 0), 0);
      const revenue = ms.reduce((s, m: any) => s + (m.revenue || 0), 0);
      return { platform, impressions, clicks, conversions, spend, revenue, ctr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0, roas: spend > 0 ? parseFloat((revenue / spend).toFixed(2)) : 0, cpa: conversions > 0 ? parseFloat((spend / conversions).toFixed(2)) : 0 };
    });

    const daily = metrics.reduce((acc: any[], m: any) => {
      const day = String(m.date).substring(0, 10);
      let entry = acc.find((e: any) => e.date === day);
      if (!entry) { entry = { date: day, impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 }; acc.push(entry); }
      entry.impressions += m.impressions || 0; entry.clicks += m.clicks || 0; entry.conversions += m.conversions || 0; entry.spend += m.spend || 0; entry.revenue += m.revenue || 0;
      return acc;
    }, []);

    const totals = platformSummary.reduce((acc: any, p: any) => { acc.impressions += p.impressions; acc.clicks += p.clicks; acc.conversions += p.conversions; acc.spend += p.spend; acc.revenue += p.revenue; return acc; }, { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });
    const maxPlatform = platformSummary.sort((a: any, b: any) => b.spend - a.spend)[0];

    sendSuccess(res, { daily, byPlatform: platformSummary, totals: { ...totals, ctr: totals.impressions > 0 ? parseFloat(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0, roas: totals.spend > 0 ? parseFloat((totals.revenue / totals.spend).toFixed(2)) : 0, cpa: totals.conversions > 0 ? parseFloat((totals.spend / totals.conversions).toFixed(2)) : 0 }, topPlatform: maxPlatform ? { name: maxPlatform.platform, share: totals.spend > 0 ? parseFloat(((maxPlatform.spend / totals.spend) * 100).toFixed(1)) : 0 } : null });
  })
);

router.get(
  "/cross-platform",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const dayCount = safeInt(req.query.days, 30);
    const from = new Date(Date.now() - dayCount * 86400000);
    const metrics = await DataStore.findMetrics({ tenantId, date: { $gte: from } });

    const byPlatform: Record<string, any> = {};
    for (const m of metrics) {
      const p = m.platform;
      if (!byPlatform[p]) byPlatform[p] = { platform: p, impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
      byPlatform[p].impressions += m.impressions || 0; byPlatform[p].clicks += m.clicks || 0; byPlatform[p].conversions += m.conversions || 0; byPlatform[p].spend += m.spend || 0; byPlatform[p].revenue += m.revenue || 0;
    }
    const platformArray = Object.values(byPlatform) as any[];
    const totalSpendAll = platformArray.reduce((s: number, p: any) => s + p.spend, 0);
    for (const p of platformArray) {
      p.ctr = p.impressions > 0 ? parseFloat(((p.clicks / p.impressions) * 100).toFixed(2)) : 0;
      p.roas = p.spend > 0 ? parseFloat((p.revenue / p.spend).toFixed(2)) : 0;
      p.cpc = p.clicks > 0 ? parseFloat((p.spend / p.clicks).toFixed(2)) : 0;
      p.cpa = p.conversions > 0 ? parseFloat((p.spend / p.conversions).toFixed(2)) : 0;
      p.shareOfSpend = totalSpendAll > 0 ? parseFloat(((p.spend / totalSpendAll) * 100).toFixed(1)) : 0;
      p.efficiencyScore = p.roas > 0 && p.cpa > 0 ? parseFloat(((p.roas * 50) - (p.cpa * 0.5) + (p.ctr * 10)).toFixed(1)) : 0;
    }
    platformArray.sort((a: any, b: any) => b.efficiencyScore - a.efficiencyScore);

    const campaignMetrics = await DataStore.findCampaigns({ tenantId });
    const budgets = campaignMetrics.campaigns.map((c: any) => ({ name: c.name, budget: c.budget?.lifetime || 0, spent: c.budget?.spent || 0, remaining: (c.budget?.lifetime || 0) - (c.budget?.spent || 0), status: c.status }));
    const utilization = budgets.reduce((s: number, b: any) => s + b.budget, 0) > 0 ? parseFloat((budgets.reduce((s: number, b: any) => s + b.spent, 0) / budgets.reduce((s: number, b: any) => s + b.budget, 0) * 100).toFixed(1)) : 0;

    sendSuccess(res, { platforms: platformArray, budgetOverview: budgets, meta: { totalSpend: totalSpendAll, platformCount: platformArray.length, daysAnalyzed: dayCount, portfolioUtilization: utilization, topPlatform: platformArray[0]?.platform || null } });
  })
);

router.get(
  "/audience/overlap",
  asyncHandler(async (_req: Request, res: Response) => {
    const audiences = generateMockAudiences();
    const overlaps = generateMockOverlaps(audiences);
    const maxOverlap = overlaps.reduce((max: any, o: any) => o.overlapSize > (max?.overlapSize || 0) ? o : max, overlaps[0]);
    const avgOverlap = overlaps.length > 0 ? parseFloat((overlaps.reduce((s: number, o: any) => s + o.overlapPercentage, 0) / overlaps.length).toFixed(1)) : 0;
    sendSuccess(res, overlaps, { audienceCount: audiences.length, pairCount: overlaps.length, avgOverlap, maxOverlap: maxOverlap ? { pair: `${maxOverlap.audienceA} x ${maxOverlap.audienceB}`, percentage: maxOverlap.overlapPercentage } : null });
  })
);

router.get(
  "/cohorts",
  asyncHandler(async (req: Request, res: Response) => {
    const report = await cohortAnalysisOrchestrator.analyze(req.user!.tenantId);
    sendSuccess(res, report);
  })
);

router.get("/roi/scenarios", asyncHandler(async (req: Request, res: Response) => {
  const scenarios = roiCalculatorService.generateComparisonScenarios();
  sendSuccess(res, scenarios, { count: scenarios.length });
}));

router.post("/roi/calculate", asyncHandler(async (req: Request, res: Response) => {
  const { totalSpend, totalRevenue, leadsGenerated, conversionRate, averageDealSize, platformFees, creativeCosts, laborCosts, timeframeDays, campaignName } = req.body;
  if (totalSpend === undefined || totalRevenue === undefined) return res.status(400).json({ error: "totalSpend and totalRevenue are required" });
  const dashboard = roiCalculatorOrchestrator.getDashboard({
    campaignName: campaignName || "Custom Scenario", totalSpend: Number(totalSpend), totalRevenue: Number(totalRevenue),
    leadsGenerated: Number(leadsGenerated) || 0, conversionRate: Number(conversionRate) || 0, averageDealSize: Number(averageDealSize) || 0,
    platformFees: Number(platformFees) || 0, creativeCosts: Number(creativeCosts) || 0, laborCosts: Number(laborCosts) || 0, timeframeDays: Number(timeframeDays) || 90,
  });
  sendSuccess(res, dashboard);
}));

function generateMockAudiences() {
  return [
    { id: "aud_001", name: "Website Visitors", description: "All site visitors in last 30 days", size: 125000, source: "web", tags: ["retargeting", "all"] },
    { id: "aud_002", name: "High Intent", description: "Users who viewed pricing or added to cart", size: 32000, source: "web", tags: ["high-value", "purchase-intent"] },
    { id: "aud_003", name: "Past Purchasers", description: "Users who completed a purchase", size: 18000, source: "crm", tags: ["retargeting", "loyalty"] },
    { id: "aud_004", name: "Newsletter Subscribers", description: "Email newsletter subscribers", size: 45000, source: "email", tags: ["email", "engagement"] },
    { id: "aud_005", name: "Social Followers", description: "Instagram and Twitter followers", size: 67000, source: "social", tags: ["social", "awareness"] },
    { id: "aud_006", name: "Lookalike: Purchasers", description: "Lookalike audience based on past purchasers", size: 85000, source: "platform", tags: ["lookalike", "prospecting"] },
    { id: "aud_007", name: "Mobile App Users", description: "Users who installed the mobile app", size: 28000, source: "mobile", tags: ["mobile", "engagement"] },
    { id: "aud_008", name: "Cart Abandoners", description: "Users who added to cart but didn't purchase", size: 12000, source: "web", tags: ["retargeting", "high-value"] },
    { id: "aud_009", name: "Blog Readers", description: "Users who read at least 3 blog posts", size: 22000, source: "web", tags: ["content", "awareness"] },
    { id: "aud_010", name: "VIP Customers", description: "Customers with LTV above $500", size: 4500, source: "crm", tags: ["loyalty", "high-value"] },
  ];
}

function generateMockOverlaps(audiences: any[]) {
  const overlaps: any[] = [];
  for (let i = 0; i < audiences.length; i++) {
    for (let j = i + 1; j < audiences.length; j++) {
      const baseOverlap = Math.random() * 40 + 5;
      const overlapSize = Math.round(audiences[i].size * (baseOverlap / 100));
      const uniqueA = Math.max(0, 100 - baseOverlap - Math.random() * 20);
      const uniqueB = Math.max(0, 100 - baseOverlap - uniqueA);
      overlaps.push({ audienceA: audiences[i].id, audienceB: audiences[j].id, overlapSize, overlapPercentage: parseFloat(baseOverlap.toFixed(1)), uniqueToA: parseFloat(uniqueA.toFixed(1)), uniqueToB: parseFloat(uniqueB.toFixed(1)) });
    }
  }
  return overlaps;
}

export default router;
