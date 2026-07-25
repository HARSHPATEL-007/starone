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
    const { status, matchType, search } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (status) filter.status = status;
    if (matchType) filter.matchType = matchType;
    if (search) filter.keyword = { $regex: search, $options: "i" };
    const keywords = await DataStore.findKeywords(filter);
    res.json(keywords);
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
      tenantId,
      keyword,
      matchType,
      volume,
      cpc,
      bid: 0,
      status: "active",
      createdBy: req.user!.userId,
    });
    res.status(201).json(kw);
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
    res.json(updated);
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
    res.json(updated);
  })
);

export default router;
