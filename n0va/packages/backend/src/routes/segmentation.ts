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
    const { type, status } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (type) filter.type = type;
    if (status) filter.status = status;
    const segments = await DataStore.findSegments(filter);
    res.json(segments);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, type, criteria } = req.body;
    if (!name || !type || !criteria) throw new AppError(400, "Missing required fields: name, type, criteria");
    const segment = await DataStore.createSegment({
      tenantId,
      name,
      type,
      criteria,
      status: "active",
      count: 0,
      createdBy: req.user!.userId,
    });
    res.status(201).json(segment);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { name, type, criteria, status } = req.body;
    const update: Record<string, any> = {};
    if (name) update.name = name;
    if (type) update.type = type;
    if (criteria) update.criteria = criteria;
    if (status) update.status = status;
    const updated = await DataStore.updateSegment(id, tenantId, update);
    if (!updated) throw new AppError(404, "Segment not found");
    res.json(updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const deleted = await DataStore.deleteSegment(id, tenantId);
    if (!deleted) throw new AppError(404, "Segment not found");
    res.status(204).send();
  })
);

router.get(
  "/:id/analysis",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const segment = await DataStore.findSegments({ _id: id, tenantId });
    if (!segment || segment.length === 0) throw new AppError(404, "Segment not found");
    const s = segment[0];
    res.json({
      segmentId: id,
      name: s.name,
      type: s.type,
      count: s.count || 0,
      criteria: s.criteria,
      status: s.status,
    });
  })
);

export default router;
