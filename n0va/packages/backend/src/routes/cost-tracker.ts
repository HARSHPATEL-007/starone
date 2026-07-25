import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { category, dateFrom, dateTo } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (category) filter.category = category;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom as string);
      if (dateTo) filter.date.$lte = new Date(dateTo as string);
    }
    const costs = await DataStore.findCosts(filter);
    const summary = costs.reduce(
      (acc: any, c: any) => {
        acc.totalPlanned += c.planned || 0;
        acc.totalActual += c.actual || 0;
        acc.totalVariance += (c.planned || 0) - (c.actual || 0);
        return acc;
      },
      { totalPlanned: 0, totalActual: 0, totalVariance: 0 }
    );
    res.json({ costs, summary });
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
    res.json(Object.values(grouped));
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
    res.json(Object.values(dailyMap).sort((a: any, b: any) => a.date.localeCompare(b.date)));
  })
);

export default router;
