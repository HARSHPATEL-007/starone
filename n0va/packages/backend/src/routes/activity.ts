import { Router, Request, Response, NextFunction } from "express";
import { MemoryStore } from "../services/MemoryStore";
import { io } from "../index";
import { sendSuccess, sendCreated, sendPaginated, computePagination, safeInt } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

function store() {
  return MemoryStore.getInstance();
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, entityId, action } = req.query;
    const page = safeInt(req.query.page, 1);
    const limit = safeInt(req.query.limit, 20);
    let activities: any[] = store().find("activities", (a: any) => a.tenantId === tenantId);
    if (entityType) activities = activities.filter((a: any) => a.entityType === entityType);
    if (entityId) activities = activities.filter((a: any) => a.entityId === entityId);
    if (action) activities = activities.filter((a: any) => a.action === action);
    activities.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const total = activities.length;
    const paginated = activities.slice((page - 1) * limit, page * limit);
    const actionDist: Record<string, number> = {};
    const entityTypeDist: Record<string, number> = {};
    for (const a of activities) {
      actionDist[a.action] = (actionDist[a.action] || 0) + 1;
      entityTypeDist[a.entityType] = (entityTypeDist[a.entityType] || 0) + 1;
    }
    const meta: Record<string, unknown> = { totalActivities: total, actionDistribution: actionDist, entityTypeDistribution: entityTypeDist };
    sendPaginated(res, paginated, computePagination(page, limit, total), meta);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { action, entityType, entityId, entityName, details, userName } = req.body;
    const activity = store().insert("activities", {
      tenantId, action, entityType, entityId, entityName, details,
      userId: req.user!.userId, userName: userName || req.user!.userId,
      timestamp: new Date().toISOString(),
    });
    io.to(`tenant:${tenantId}`).emit("activity:new", activity);
    sendCreated(res, activity);
  })
);

export default router;
