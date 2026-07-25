import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

function aggMetrics(metrics: any[]) {
  const n = metrics.length || 1;
  const totalImpressions = metrics.reduce((s, m) => s + (m.impressions || 0), 0);
  const totalClicks = metrics.reduce((s, m) => s + (m.clicks || 0), 0);
  const totalConversions = metrics.reduce((s, m) => s + (m.conversions || 0), 0);
  const totalSpend = metrics.reduce((s, m) => s + (m.spend || 0), 0);
  const totalRevenue = metrics.reduce((s, m) => s + (m.revenue || 0), 0);
  return {
    totalImpressions,
    totalClicks,
    totalConversions,
    totalSpend,
    totalRevenue,
    avgCtr: totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
    avgCpc: totalClicks > 0 ? parseFloat((totalSpend / totalClicks).toFixed(2)) : 0,
    avgRoas: totalSpend > 0 ? parseFloat((totalRevenue / totalSpend).toFixed(2)) : 0,
  };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { ids } = req.query;
    if (!ids || typeof ids !== "string") throw new AppError(400, "Query param 'ids' (comma-separated campaign IDs) is required");

    const campaignIds = ids.split(",").map((s) => s.trim()).filter(Boolean);
    if (campaignIds.length === 0) throw new AppError(400, "At least one campaign ID is required");

    const campaigns: any[] = [];
    const allMetrics: Record<string, any[]> = {};

    for (const id of campaignIds) {
      const campaign = await DataStore.findCampaignById(id, tenantId);
      if (!campaign) throw new AppError(404, `Campaign not found: ${id}`);
      const metrics = await DataStore.findMetrics({ campaignId: id, tenantId });
      allMetrics[id] = metrics;
      campaigns.push({ ...campaign.toObject ? campaign.toObject() : campaign, metrics: aggMetrics(metrics) });
    }

    const dateMap: Record<string, any> = {};
    for (const id of campaignIds) {
      for (const m of allMetrics[id] || []) {
        const d = m.date ? new Date(m.date).toISOString().split("T")[0] : "unknown";
        if (!dateMap[d]) dateMap[d] = { date: d };
        dateMap[d][id] = { impressions: m.impressions || 0, clicks: m.clicks || 0, spend: m.spend || 0 };
      }
    }
    const dailySeries = Object.values(dateMap).sort((a: any, b: any) => a.date.localeCompare(b.date));

    const all = Object.values(allMetrics).flat();
    const totals = aggMetrics(all);

    res.json({ campaigns, dailySeries, totals });
  })
);

router.get(
  "/dimensions",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(["impressions", "clicks", "conversions", "spend", "revenue", "ctr", "cpc", "cvr", "roas"]);
  })
);

export default router;
