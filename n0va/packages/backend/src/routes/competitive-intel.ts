import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { competitor, dateFrom, dateTo } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (competitor) filter.competitor = competitor;
    if (dateFrom) filter.date = { ...filter.date, $gte: new Date(dateFrom as string) };
    if (dateTo) filter.date = { ...filter.date, $lte: new Date(dateTo as string) };
    const entries = await DataStore.findCompetitiveIntel(filter);
    const competitorSet = new Set(entries.map((e: any) => e.competitor));
    sendSuccess(res, entries, { count: entries.length, uniqueCompetitors: competitorSet.size, competitors: Array.from(competitorSet) });
  })
);

router.get(
  "/summary",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const entries = await DataStore.findCompetitiveIntel({ tenantId });
    const summary: Record<string, { totalSpend: number; totalImpressions: number; shareOfVoiceSum: number; count: number; estimatedRevenue: number; dates: Date[] }> = {};
    for (const e of entries) {
      if (!summary[e.competitor]) summary[e.competitor] = { totalSpend: 0, totalImpressions: 0, shareOfVoiceSum: 0, count: 0, estimatedRevenue: 0, dates: [] };
      summary[e.competitor].totalSpend += e.spend || 0;
      summary[e.competitor].totalImpressions += e.impressions || 0;
      summary[e.competitor].shareOfVoiceSum += e.shareOfVoice || 0;
      summary[e.competitor].count += 1;
      summary[e.competitor].estimatedRevenue += e.estimatedRevenue || 0;
      summary[e.competitor].dates.push(new Date(e.date));
    }
    const totalMarketSpend = Object.values(summary).reduce((s, d) => s + d.totalSpend, 0);
    const result = Object.entries(summary).map(([competitor, data]) => {
      const avgShare = data.count > 0 ? parseFloat((data.shareOfVoiceSum / data.count).toFixed(2)) : 0;
      const avgSpend = data.count > 0 ? parseFloat((data.totalSpend / data.count).toFixed(2)) : 0;
      const roas = data.totalSpend > 0 ? parseFloat((data.estimatedRevenue / data.totalSpend).toFixed(2)) : 0;
      const dates = data.dates.sort((a, b) => a.getTime() - b.getTime());
      const dateRange = dates.length >= 2 ? { first: dates[0].toISOString().split("T")[0], last: dates[dates.length - 1].toISOString().split("T")[0] } : null;
      return { competitor, totalSpend: data.totalSpend, totalImpressions: data.totalImpressions, avgShareOfVoice: avgShare, avgDailySpend: avgSpend, totalEstimatedRevenue: data.estimatedRevenue, roas, marketShare: totalMarketSpend > 0 ? parseFloat(((data.totalSpend / totalMarketSpend) * 100).toFixed(1)) : 0, dateRange };
    });
    result.sort((a, b) => b.totalSpend - a.totalSpend);
    const topCompetitor = result[0] || null;
    sendSuccess(res, result, { totalCompetitors: result.length, totalMarketSpend, topCompetitor: topCompetitor?.competitor || null, topCompetitorShare: topCompetitor?.marketShare || 0 });
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { competitor, spend, impressions } = req.body;
    if (!competitor || spend === undefined || impressions === undefined) throw new AppError(400, "Missing required fields: competitor, spend, impressions");
    const entry = await DataStore.createCompetitiveIntel({ tenantId, competitor, spend, impressions, shareOfVoice: 0, estimatedRevenue: 0, date: new Date() });
    sendSuccess(res, entry, { action: "created" });
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const entries = await DataStore.findCompetitiveIntel({ tenantId });
    const competitors = [...new Set(entries.map((e: any) => e.competitor))];
    const dates = entries.map((e: any) => new Date(e.date)).filter((d: Date) => !isNaN(d.getTime())).sort((a: Date, b: Date) => a.getTime() - b.getTime());
    const dateRange = dates.length >= 2 ? { from: dates[0].toISOString().split("T")[0], to: dates[dates.length - 1].toISOString().split("T")[0] } : null;
    const avgShareOfVoice = entries.length > 0 ? parseFloat((entries.reduce((s: number, e: any) => s + (e.shareOfVoice || 0), 0) / entries.length).toFixed(2)) : 0;
    sendSuccess(res, {
      competitors,
      totalDataPoints: entries.length,
      dateRange,
      avgShareOfVoice,
    });
  })
);

export default router;
