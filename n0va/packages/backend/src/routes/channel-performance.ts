import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;

    const metrics = await DataStore.findMetrics({ tenantId });
    const campaigns = await DataStore.findCampaigns({ tenantId });

    const platformMap: Record<string, { impressions: number; clicks: number; conversions: number; spend: number; revenue: number; campaigns: Set<string> }> = {};

    for (const m of metrics) {
      const platform = m.platform || "unknown";
      if (!platformMap[platform]) {
        platformMap[platform] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, campaigns: new Set() };
      }
      platformMap[platform].impressions += m.impressions || 0;
      platformMap[platform].clicks += m.clicks || 0;
      platformMap[platform].conversions += m.conversions || 0;
      platformMap[platform].spend += m.spend || 0;
      platformMap[platform].revenue += m.revenue || 0;
      if (m.campaignId) platformMap[platform].campaigns.add(String(m.campaignId));
    }

    const channels = Object.entries(platformMap).map(([platform, data]) => ({
      platform,
      impressions: data.impressions,
      clicks: data.clicks,
      conversions: data.conversions,
      spend: parseFloat(data.spend.toFixed(2)),
      revenue: parseFloat(data.revenue.toFixed(2)),
      ctr: data.impressions > 0 ? parseFloat(((data.clicks / data.impressions) * 100).toFixed(2)) : 0,
      cpc: data.clicks > 0 ? parseFloat((data.spend / data.clicks).toFixed(2)) : 0,
      cvr: data.clicks > 0 ? parseFloat(((data.conversions / data.clicks) * 100).toFixed(2)) : 0,
      roas: data.spend > 0 ? parseFloat((data.revenue / data.spend).toFixed(2)) : 0,
      campaignCount: data.campaigns.size,
    }));

    const totals = {
      impressions: channels.reduce((s, c) => s + c.impressions, 0),
      clicks: channels.reduce((s, c) => s + c.clicks, 0),
      conversions: channels.reduce((s, c) => s + c.conversions, 0),
      spend: parseFloat(channels.reduce((s, c) => s + c.spend, 0).toFixed(2)),
      revenue: parseFloat(channels.reduce((s, c) => s + c.revenue, 0).toFixed(2)),
      ctr: 0,
      cpc: 0,
      cvr: 0,
      roas: 0,
      campaignCount: campaigns.campaigns.length,
    };
    totals.ctr = totals.impressions > 0 ? parseFloat(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0;
    totals.cpc = totals.clicks > 0 ? parseFloat((totals.spend / totals.clicks).toFixed(2)) : 0;
    totals.cvr = totals.clicks > 0 ? parseFloat(((totals.conversions / totals.clicks) * 100).toFixed(2)) : 0;
    totals.roas = totals.spend > 0 ? parseFloat((totals.revenue / totals.spend).toFixed(2)) : 0;

    const dailyMetrics = await DataStore.findDailyMetrics(tenantId, 90);
    const dateMap: Record<string, any> = {};
    for (const d of dailyMetrics) {
      const dateStr = d.date ? new Date(d.date).toISOString().split("T")[0] : "unknown";
      const platform = d.platform || "unknown";
      if (!dateMap[dateStr]) dateMap[dateStr] = { date: dateStr };
      if (!dateMap[dateStr][platform]) dateMap[dateStr][platform] = { impressions: 0, clicks: 0, spend: 0 };
      dateMap[dateStr][platform].impressions += d.impressions || 0;
      dateMap[dateStr][platform].clicks += d.clicks || 0;
      dateMap[dateStr][platform].spend += d.spend || 0;
    }
    const dailyTrend = Object.values(dateMap).sort((a: any, b: any) => a.date.localeCompare(b.date));

    res.json({ channels, totals, dailyTrend });
  })
);

export default router;
