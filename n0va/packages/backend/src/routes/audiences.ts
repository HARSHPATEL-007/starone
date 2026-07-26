import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { sendPaginated, sendSuccess, sendCreated, safeInt, computePagination, pickAllowed } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { platform, type, status, search } = req.query;
    const page = safeInt(req.query.page, 1);
    const limit = safeInt(req.query.limit, 20);
    const filter: Record<string, any> = { tenantId };
    if (platform) filter.platform = platform;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: "i" };
    const audiences = await DataStore.findAudiences(filter);
    const items = Array.isArray(audiences) ? audiences : (audiences as any).audiences || [];
    const total = Array.isArray(audiences) ? audiences.length : (audiences as any).total || items.length;
    const pagination = computePagination(page, limit, total);
    const activeCount = items.filter((a: any) => a.status === "active").length;
    const platformCount = new Set(items.map((a: any) => a.platform)).size;
    sendPaginated(res, items, pagination, { activeCount, platformCount, typeDistribution: items.reduce((acc: Record<string, number>, a: any) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {} as Record<string, number>) });
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, description, type, platform, criteria, tags } = req.body;
    if (!name || !type || !platform) throw new AppError(400, "Missing required fields: name, type, platform");
    const audience = await DataStore.createAudience({
      tenantId, name, description, type, platform, size: 0, status: "building",
      criteria: criteria || {}, tags: tags || [],
      performance: { impressions: 0, conversions: 0, spend: 0, revenue: 0, roas: 0 },
      createdBy: req.user!.userId,
    });
    sendCreated(res, audience);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const audience = await DataStore.findAudienceById(id, tenantId);
    if (!audience) throw new AppError(404, "Audience not found");
    const efficiency = audience.performance?.spend > 0 ? parseFloat(((audience.performance.revenue || 0) / audience.performance.spend).toFixed(2)) : 0;
    const cpa = audience.performance?.conversions > 0 ? parseFloat(((audience.performance.spend || 0) / audience.performance.conversions).toFixed(2)) : 0;
    sendSuccess(res, { ...audience, _efficiency: efficiency, _cpa: cpa });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const allowed = ["name", "description", "criteria", "status"];
    const update = pickAllowed(req.body, allowed);
    const updated = await DataStore.updateAudience(id, tenantId, update);
    if (!updated) throw new AppError(404, "Audience not found");
    sendSuccess(res, updated, { updatedFields: Object.keys(update) });
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
