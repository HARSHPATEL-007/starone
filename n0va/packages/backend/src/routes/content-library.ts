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
    const { type, status, search } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: "i" };
    const assets = await DataStore.findContentAssets(filter);
    res.json(assets);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const asset = await DataStore.findContentAssetById(id, tenantId);
    if (!asset) throw new AppError(404, "Content asset not found");
    res.json(asset);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { title, type } = req.body;
    if (!title || !type) throw new AppError(400, "Missing required fields: title, type");
    const asset = await DataStore.createContentAsset({
      tenantId,
      title,
      type,
      status: "draft",
      createdBy: req.user!.userId,
    });
    res.status(201).json(asset);
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
    res.json(updated);
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
