import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { sendSuccess, sendPaginated, computePagination, safeInt } from "./route-utils";
import { channelOptimizationOrchestrator } from "../business-logic/ChannelOptimizationOrchestrator";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const page = safeInt(req.query.page, 1);
    const limit = safeInt(req.query.limit, 20);

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

    const totalSpendAll = Object.values(platformMap).reduce((s, v) => s + v.spend, 0);
    const enriched = Object.entries(platformMap).map(([platform, data]) => {
      const ctr = data.impressions > 0 ? Math.round((data.clicks / data.impressions) * 10000) / 100 : 0;
      const cpc = data.clicks > 0 ? Math.round((data.spend / data.clicks) * 100) / 100 : 0;
      const roas = data.spend > 0 ? Math.round((data.revenue / data.spend) * 100) / 100 : 0;
      const share = totalSpendAll > 0 ? Math.round((data.spend / totalSpendAll) * 10000) / 100 : 0;
      const efficiency = Math.round((roas * 40 + (100 - Math.min(100, cpc * 0.5)) * 0.3 + ctr * 0.3) * 100) / 100;
      return { platform, ...data, campaigns: data.campaigns.size, ctr, cpc, roas, shareOfSpend: share, efficiencyScore: efficiency };
    });
    enriched.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
    const total = enriched.length;
    const paginated = enriched.slice((page - 1) * limit, page * limit);
    const bestPlatform = enriched.length > 0 ? enriched[0].platform : null;
    const meta: Record<string, unknown> = { totalPlatforms: total, totalSpend: totalSpendAll, topPlatform: bestPlatform };
    sendPaginated(res, paginated, computePagination(page, limit, total), meta);
  })
);

router.get(
  "/orchestrate",
  asyncHandler(async (req: Request, res: Response) => {
    const days = safeInt(req.query.days, 90);
    const report = await channelOptimizationOrchestrator.analyze(req.user!.tenantId, days);
    sendSuccess(res, report);
  })
);

export default router;
