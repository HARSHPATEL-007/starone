import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/overview",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { days = "30" } = req.query;
    const dayCount = parseInt(days as string, 10);

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

    res.json({
      totalCampaigns: campaigns.campaigns.length,
      activeCampaigns: activeCount,
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      metrics,
      dailyMetrics,
    });
  })
);

router.get(
  "/campaign/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { days = "30" } = req.query;

    const from = new Date(Date.now() - parseInt(days as string, 10) * 86400000);
    const metrics = await DataStore.findMetrics({
      tenantId,
      campaignId: id,
      date: { $gte: from },
    });

    const byPlatform: Record<string, any[]> = {};
    for (const m of metrics) {
      if (!byPlatform[m.platform]) byPlatform[m.platform] = [];
      byPlatform[m.platform].push(m);
    }

    const platformSummary = Object.entries(byPlatform).map(([platform, ms]) => ({
      platform,
      impressions: ms.reduce((s, m: any) => s + (m.impressions || 0), 0),
      clicks: ms.reduce((s, m: any) => s + (m.clicks || 0), 0),
      conversions: ms.reduce((s, m: any) => s + (m.conversions || 0), 0),
      spend: ms.reduce((s, m: any) => s + (m.spend || 0), 0),
      revenue: ms.reduce((s, m: any) => s + (m.revenue || 0), 0),
      ctr: 0,
      roas: 0,
    }));

    for (const ps of platformSummary) {
      ps.ctr = ps.impressions > 0 ? parseFloat(((ps.clicks / ps.impressions) * 100).toFixed(2)) : 0;
      ps.roas = ps.spend > 0 ? parseFloat((ps.revenue / ps.spend).toFixed(2)) : 0;
    }

    const daily = metrics.reduce((acc: any[], m: any) => {
      const day = String(m.date).substring(0, 10);
      let entry = acc.find((e: any) => e.date === day);
      if (!entry) {
        entry = { date: day, impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
        acc.push(entry);
      }
      entry.impressions += m.impressions || 0;
      entry.clicks += m.clicks || 0;
      entry.conversions += m.conversions || 0;
      entry.spend += m.spend || 0;
      entry.revenue += m.revenue || 0;
      return acc;
    }, []);

    res.json({ daily, byPlatform: platformSummary });
  })
);

router.get(
  "/cross-platform",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { days = "30" } = req.query;
    const from = new Date(Date.now() - parseInt(days as string, 10) * 86400000);

    const metrics = await DataStore.findMetrics({ tenantId, date: { $gte: from } });
    const byPlatform: Record<string, any> = {};
    for (const m of metrics) {
      const p = m.platform;
      if (!byPlatform[p]) byPlatform[p] = { platform: p, impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
      byPlatform[p].impressions += m.impressions || 0;
      byPlatform[p].clicks += m.clicks || 0;
      byPlatform[p].conversions += m.conversions || 0;
      byPlatform[p].spend += m.spend || 0;
      byPlatform[p].revenue += m.revenue || 0;
    }
    for (const p of Object.values(byPlatform) as any[]) {
      p.ctr = p.impressions > 0 ? parseFloat(((p.clicks / p.impressions) * 100).toFixed(2)) : 0;
      p.roas = p.spend > 0 ? parseFloat((p.revenue / p.spend).toFixed(2)) : 0;
      p.cpc = p.clicks > 0 ? parseFloat((p.spend / p.clicks).toFixed(2)) : 0;
    }

    const campaignMetrics = await DataStore.findCampaigns({ tenantId });
    const budgets = campaignMetrics.campaigns.map((c: any) => ({
      name: c.name,
      budget: c.budget?.lifetime || 0,
      spent: c.budget?.spent || 0,
      remaining: (c.budget?.lifetime || 0) - (c.budget?.spent || 0),
      status: c.status,
    }));

    res.json({ platforms: Object.values(byPlatform), budgetOverview: budgets });
  })
);

export default router;
