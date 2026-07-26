import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendCreated, sendPaginated, computePagination, safeInt, safeFloat, validateRequired } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { status, matchType, search } = req.query;
    const page = safeInt(req.query.page, 1);
    const limit = safeInt(req.query.limit, 20);
    const filter: Record<string, any> = { tenantId };
    if (status) filter.status = status;
    if (matchType) filter.matchType = matchType;
    if (search) filter.keyword = { $regex: search, $options: "i" };
    const keywords = await DataStore.findKeywords(filter);
    const arr = Array.isArray(keywords) ? keywords : [];
    const total = arr.length;
    const paginated = arr.slice((page - 1) * limit, page * limit);
    const active = arr.filter((k: any) => k.status === "active");
    const totalBid = active.reduce((s: number, k: any) => s + (k.bid || 0), 0);
    const matchTypeDist: Record<string, number> = {};
    for (const k of arr) matchTypeDist[k.matchType || "unknown"] = (matchTypeDist[k.matchType || "unknown"] || 0) + 1;
    const meta: Record<string, unknown> = { activeCount: active.length, totalBid: Math.round(totalBid * 100) / 100, matchTypeDistribution: matchTypeDist };
    sendPaginated(res, paginated, computePagination(page, limit, total), meta);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { keyword, matchType, volume, cpc } = req.body;
    if (!keyword || !matchType || volume === undefined || cpc === undefined)
      throw new AppError(400, "Missing required fields: keyword, matchType, volume, cpc");
    const kw = await DataStore.createKeyword({
      tenantId, keyword, matchType, volume, cpc, bid: 0, status: "active",
      createdBy: req.user!.userId,
    });
    sendCreated(res, kw);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { bid, status, matchType } = req.body;
    const update: Record<string, any> = {};
    if (bid !== undefined) update.bid = bid;
    if (status) update.status = status;
    if (matchType) update.matchType = matchType;
    const updated = await DataStore.updateKeyword(id, tenantId, update);
    if (!updated) throw new AppError(404, "Keyword not found");
    sendSuccess(res, updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const deleted = await DataStore.deleteKeyword(id, tenantId);
    if (!deleted) throw new AppError(404, "Keyword not found");
    res.status(204).send();
  })
);

router.post(
  "/:id/bid",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { bid } = req.body;
    if (bid === undefined || bid === null) throw new AppError(400, "Missing bid amount");
    const updated = await DataStore.updateKeyword(id, tenantId, { bid });
    if (!updated) throw new AppError(404, "Keyword not found");
    const suggestedBid = Math.round((bid as number) * 1.15 * 100) / 100;
    sendSuccess(res, updated, { suggestedOptimalBid: suggestedBid, note: "Suggested bid is 15% above current — review before applying." });
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const keywords = await DataStore.findKeywords({ tenantId });
    const arr = Array.isArray(keywords) ? keywords : [];
    const byMatchType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalVolume = 0, totalDifficulty = 0, totalCPC = 0, totalImpressions = 0, totalClicks = 0, totalConversions = 0;
    for (const k of arr) {
      byMatchType[k.matchType || "unknown"] = (byMatchType[k.matchType || "unknown"] || 0) + 1;
      byStatus[k.status || "unknown"] = (byStatus[k.status || "unknown"] || 0) + 1;
      totalVolume += k.volume || 0;
      totalDifficulty += k.difficulty || 0;
      totalCPC += k.cpc || 0;
      totalImpressions += k.impressions || 0;
      totalClicks += k.clicks || 0;
      totalConversions += k.conversions || 0;
    }
    const avgDifficulty = arr.length > 0 ? parseFloat((totalDifficulty / arr.length).toFixed(2)) : 0;
    const avgCPC = arr.length > 0 ? parseFloat((totalCPC / arr.length).toFixed(2)) : 0;
    sendSuccess(res, {
      totalKeywords: arr.length,
      byMatchType,
      byStatus,
      totalVolume,
      avgDifficulty,
      avgCPC,
      totalImpressions,
      totalClicks,
      totalConversions,
    });
  })
);

export default router;
