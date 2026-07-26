import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendCreated, sendPaginated, computePagination, safeInt } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { type, status, search } = req.query;
    const page = safeInt(req.query.page, 1);
    const limit = safeInt(req.query.limit, 20);
    const filter: Record<string, any> = { tenantId };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: "i" };
    const assets = await DataStore.findContentAssets(filter);
    const arr = Array.isArray(assets) ? assets : [];
    const total = arr.length;
    const paginated = arr.slice((page - 1) * limit, page * limit);
    const typeDist: Record<string, number> = {};
    const statusDist: Record<string, number> = {};
    for (const a of arr) {
      typeDist[a.type || "unknown"] = (typeDist[a.type || "unknown"] || 0) + 1;
      statusDist[a.status || "unknown"] = (statusDist[a.status || "unknown"] || 0) + 1;
    }
    const meta: Record<string, unknown> = { typeDistribution: typeDist, statusDistribution: statusDist };
    sendPaginated(res, paginated, computePagination(page, limit, total), meta);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const asset = await DataStore.findContentAssetById(id, tenantId);
    if (!asset) throw new AppError(404, "Content asset not found");
    sendSuccess(res, asset);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { title, type } = req.body;
    if (!title || !type) throw new AppError(400, "Missing required fields: title, type");
    const asset = await DataStore.createContentAsset({
      tenantId, title, type, status: "draft", createdBy: req.user!.userId,
    });
    sendCreated(res, asset);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const update = req.body;
    delete update.tenantId;
    delete update._id;
    const updated = await DataStore.updateContentAsset(id, tenantId, update);
    if (!updated) throw new AppError(404, "Content asset not found");
    sendSuccess(res, updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const deleted = await DataStore.deleteContentAsset(id, tenantId);
    if (!deleted) throw new AppError(404, "Content asset not found");
    res.status(204).send();
  })
);

export default router;
