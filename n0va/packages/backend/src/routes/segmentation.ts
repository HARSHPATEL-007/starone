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
    const { type, status } = req.query;
    const page = safeInt(req.query.page, 1);
    const limit = safeInt(req.query.limit, 20);
    const filter: Record<string, any> = { tenantId };
    if (type) filter.type = type;
    if (status) filter.status = status;
    const segments = await DataStore.findSegments(filter);
    const arr = Array.isArray(segments) ? segments : [];
    const total = arr.length;
    const paginated = arr.slice((page - 1) * limit, page * limit);
    const typeCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    for (const s of arr) {
      typeCounts[s.type || "unknown"] = (typeCounts[s.type || "unknown"] || 0) + 1;
      statusCounts[s.status || "unknown"] = (statusCounts[s.status || "unknown"] || 0) + 1;
    }
    const totalSize = arr.reduce((s: number, seg: any) => s + (seg.size || 0), 0);
    const meta: Record<string, unknown> = { typeDistribution: typeCounts, statusDistribution: statusCounts, totalAudienceSize: totalSize };
    sendPaginated(res, paginated, computePagination(page, limit, total), meta);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, type, criteria } = req.body;
    if (!name || !type || !criteria) throw new AppError(400, "Missing required fields: name, type, criteria");
    const segment = await DataStore.createSegment({
      tenantId, name, type, criteria, status: "active", size: 0,
      createdBy: req.user!.userId, createdAt: new Date(),
    });
    sendCreated(res, segment);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const segments = await DataStore.findSegments({ tenantId });
    const segment = Array.isArray(segments) ? segments.find((s: any) => s._id === id) : null;
    if (!segment) throw new AppError(404, "Segment not found");
    sendSuccess(res, segment);
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
    const updated = await DataStore.updateSegment(id, tenantId, update);
    if (!updated) throw new AppError(404, "Segment not found");
    sendSuccess(res, updated);
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

export default router;
