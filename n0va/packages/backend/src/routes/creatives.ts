import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { status, type } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    const creatives = await DataStore.findCreatives(filter);
    res.json(creatives);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, type, headline, body, cta, assetUrl, tags } = req.body;
    if (!name || !type) throw new AppError(400, "Missing required fields: name, type");

    const creative = await DataStore.createCreative({
      tenantId,
      name,
      type,
      status: "draft",
      headline,
      body,
      cta,
      assetUrl,
      tags: tags || [],
      platformVariants: {},
      performance: { impressions: 0, clicks: 0, ctr: 0 },
      createdBy: req.user!.userId,
    });

    res.status(201).json(creative);
  })
);

router.patch(
  "/:id/status",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { status } = req.body;

    const updated = await DataStore.updateCreative(id, tenantId, { status });
    if (!updated) throw new AppError(404, "Creative not found");
    res.json(updated);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const creative = await DataStore.findCreativeById(id, tenantId);
    if (!creative) throw new AppError(404, "Creative not found");
    res.json(creative);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { name, headline, body, cta, tags, status } = req.body;
    const update: Record<string, any> = {};
    if (name) update.name = name;
    if (headline !== undefined) update.headline = headline;
    if (body !== undefined) update.body = body;
    if (cta !== undefined) update.cta = cta;
    if (tags) update.tags = tags;
    if (status) update.status = status;
    const updated = await DataStore.updateCreative(id, tenantId, update);
    if (!updated) throw new AppError(404, "Creative not found");
    res.json(updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    if (DataStore.usingMemory()) {
      const ok = DataStore["mem"]().delete("creatives", (c: any) => c._id === id && c.tenantId === tenantId);
      if (!ok) throw new AppError(404, "Creative not found");
    }
    res.status(204).send();
  })
);

export default router;
