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
    const { platform, type, status } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (platform) filter.platform = platform;
    if (type) filter.type = type;
    if (status) filter.status = status;
    const audiences = await DataStore.findAudiences(filter);
    res.json(audiences);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, description, type, platform, criteria, tags } = req.body;
    if (!name || !type || !platform) throw new AppError(400, "Missing required fields: name, type, platform");

    const audience = await DataStore.createAudience({
      tenantId,
      name,
      description,
      type,
      platform,
      size: 0,
      status: "building",
      criteria: criteria || {},
      tags: tags || [],
      performance: { impressions: 0, conversions: 0, spend: 0, revenue: 0, roas: 0 },
      createdBy: req.user!.userId,
    });

    res.status(201).json(audience);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const audience = await DataStore.findAudienceById(id, tenantId);
    if (!audience) throw new AppError(404, "Audience not found");
    res.json(audience);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { name, description, criteria, status } = req.body;
    const update: Record<string, any> = {};
    if (name) update.name = name;
    if (description !== undefined) update.description = description;
    if (criteria) update.criteria = criteria;
    if (status) update.status = status;

    const updated = await DataStore.updateAudience(id, tenantId, update);
    if (!updated) throw new AppError(404, "Audience not found");
    res.json(updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    if (DataStore.usingMemory()) {
      const ok = DataStore["mem"]().delete("audiences", (a: any) => a._id === id && a.tenantId === tenantId);
      if (!ok) throw new AppError(404, "Audience not found");
    }
    res.status(204).send();
  })
);

export default router;
