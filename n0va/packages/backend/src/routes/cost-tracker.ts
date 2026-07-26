import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendPaginated, computePagination, safeInt } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { category, dateFrom, dateTo } = req.query;
    const page = safeInt(req.query.page, 1);
    const limit = safeInt(req.query.limit, 20);
    const filter: Record<string, any> = { tenantId };
    if (category) filter.category = category;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom as string);
      if (dateTo) filter.date.$lte = new Date(dateTo as string);
    }
    const costs = await DataStore.findCosts(filter);
    const arr = Array.isArray(costs) ? costs : [];
    const total = arr.length;
    const paginated = arr.slice((page - 1) * limit, page * limit);
    const totalPlanned = arr.reduce((s: number, c: any) => s + (c.planned || 0), 0);
    const totalActual = arr.reduce((s: number, c: any) => s + (c.actual || 0), 0);
    const totalVariance = totalPlanned - totalActual;
    const variancePct = totalPlanned > 0 ? Math.round((totalVariance / totalPlanned) * 10000) / 100 : 0;
    const categoryDist: Record<string, { planned: number; actual: number; count: number }> = {};
    for (const c of arr) {
      const cat = c.category || "uncategorized";
      if (!categoryDist[cat]) categoryDist[cat] = { planned: 0, actual: 0, count: 0 };
      categoryDist[cat].planned += c.planned || 0;
      categoryDist[cat].actual += c.actual || 0;
      categoryDist[cat].count += 1;
    }
    const meta: Record<string, unknown> = { totalPlanned, totalActual, totalVariance, variancePercentage: variancePct, categorySummary: categoryDist, totalEntries: total };
    sendPaginated(res, paginated, computePagination(page, limit, total), meta);
  })
);

router.get(
  "/categories",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const costs = await DataStore.findCosts({ tenantId });
    const grouped: Record<string, any> = {};
    for (const c of costs) {
      const cat = c.category || "uncategorized";
      if (!grouped[cat]) grouped[cat] = { category: cat, totalPlanned: 0, totalActual: 0, totalVariance: 0, count: 0 };
      grouped[cat].totalPlanned += c.planned || 0;
      grouped[cat].totalActual += c.actual || 0;
      grouped[cat].totalVariance += (c.planned || 0) - (c.actual || 0);
      grouped[cat].count += 1;
    }
    const enriched = Object.values(grouped).map((g: any) => ({
      ...g, variancePercentage: g.totalPlanned > 0 ? Math.round(((g.totalPlanned - g.totalActual) / g.totalPlanned) * 10000) / 100 : 0,
    }));
    const totalPlanned = enriched.reduce((s: number, g: any) => s + g.totalPlanned, 0);
    const totalActual = enriched.reduce((s: number, g: any) => s + g.totalActual, 0);
    sendSuccess(res, enriched, { totalPlanned, totalActual, totalVariance: totalPlanned - totalActual });
  })
);

router.get(
  "/daily",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const costs = await DataStore.findCosts({ tenantId, date: { $gte: thirtyDaysAgo } });
    const dailyMap: Record<string, any> = {};
    for (const c of costs) {
      const day = c.date ? new Date(c.date).toISOString().slice(0, 10) : "unknown";
      if (!dailyMap[day]) dailyMap[day] = { date: day, planned: 0, actual: 0 };
      dailyMap[day].planned += c.planned || 0;
      dailyMap[day].actual += c.actual || 0;
    }
    const sorted = Object.values(dailyMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
    const totalPlanned = sorted.reduce((s: number, d: any) => s + d.planned, 0);
    const totalActual = sorted.reduce((s: number, d: any) => s + d.actual, 0);
    sendSuccess(res, sorted, { daysWithData: sorted.length, totalPlanned, totalActual, totalVariance: totalPlanned - totalActual });
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const costs = await DataStore.findCosts({ tenantId });
    const arr = Array.isArray(costs) ? costs : [];
    const uniqueCategories = [...new Set(arr.map((c: any) => c.category).filter(Boolean))];
    const dates = arr.map((c: any) => new Date(c.date)).filter((d: Date) => !isNaN(d.getTime())).sort((a: Date, b: Date) => a.getTime() - b.getTime());
    const dateRange = dates.length >= 2 ? { from: dates[0].toISOString().split("T")[0], to: dates[dates.length - 1].toISOString().split("T")[0] } : null;
    const totalPlanned = arr.reduce((s: number, c: any) => s + (c.planned || 0), 0);
    const totalActual = arr.reduce((s: number, c: any) => s + (c.actual || 0), 0);
    const totalVariance = totalPlanned - totalActual;
    const catSpend: Record<string, number> = {};
    for (const c of arr) {
      const cat = c.category || "uncategorized";
      catSpend[cat] = (catSpend[cat] || 0) + (c.actual || 0);
    }
    const topCategories = Object.entries(catSpend).sort(([, a], [, b]) => b - a).slice(0, 10).map(([category, actual]) => ({ category, actual }));
    sendSuccess(res, {
      totalCostRecords: arr.length,
      uniqueCategories: uniqueCategories.length,
      dateRange,
      totalPlanned,
      totalActual,
      totalVariance,
      topCategories,
    });
  })
);

export default router;
