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
    const { competitor, dateFrom, dateTo } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (competitor) filter.competitor = competitor;
    if (dateFrom) filter.date = { ...filter.date, $gte: new Date(dateFrom as string) };
    if (dateTo) filter.date = { ...filter.date, $lte: new Date(dateTo as string) };
    const entries = await DataStore.findCompetitiveIntel(filter);
    res.json(entries);
  })
);

router.get(
  "/summary",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const entries = await DataStore.findCompetitiveIntel({ tenantId });
    const summary: Record<string, { totalSpend: number; totalImpressions: number; shareOfVoiceSum: number; count: number; estimatedRevenue: number }> = {};
    for (const e of entries) {
      if (!summary[e.competitor]) {
        summary[e.competitor] = { totalSpend: 0, totalImpressions: 0, shareOfVoiceSum: 0, count: 0, estimatedRevenue: 0 };
      }
      summary[e.competitor].totalSpend += e.spend || 0;
      summary[e.competitor].totalImpressions += e.impressions || 0;
      summary[e.competitor].shareOfVoiceSum += e.shareOfVoice || 0;
      summary[e.competitor].count += 1;
      summary[e.competitor].estimatedRevenue += e.estimatedRevenue || 0;
    }
    const result = Object.entries(summary).map(([competitor, data]) => ({
      competitor,
      totalSpend: data.totalSpend,
      totalImpressions: data.totalImpressions,
      avgShareOfVoice: data.count > 0 ? parseFloat((data.shareOfVoiceSum / data.count).toFixed(2)) : 0,
      totalEstimatedRevenue: data.estimatedRevenue,
    }));
    res.json(result);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { competitor, spend, impressions } = req.body;
    if (!competitor || spend === undefined || impressions === undefined) {
      throw new AppError(400, "Missing required fields: competitor, spend, impressions");
    }
    const entry = await DataStore.createCompetitiveIntel({
      tenantId,
      competitor,
      spend,
      impressions,
      shareOfVoice: 0,
      estimatedRevenue: 0,
      date: new Date(),
    });
    res.status(201).json(entry);
  })
);

export default router;
