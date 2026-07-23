import { Router, Request, Response, NextFunction } from "express";
import { MemoryStore } from "../services/MemoryStore";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

function store() {
  return MemoryStore.getInstance();
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, entityId, action, limit = "50" } = req.query;
    let activities = store().find("activities", (a: any) => a.tenantId === tenantId);
    if (entityType) activities = activities.filter((a: any) => a.entityType === entityType);
    if (entityId) activities = activities.filter((a: any) => a.entityId === entityId);
    if (action) activities = activities.filter((a: any) => a.action === action);
    activities.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(activities.slice(0, parseInt(limit as string, 10)));
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { action, entityType, entityId, entityName, details, userName } = req.body;
    const activity = store().insert("activities", {
      tenantId,
      action,
      entityType,
      entityId,
      entityName,
      details,
      userId: req.user!.userId,
      userName: userName || req.user!.userId,
      timestamp: new Date().toISOString(),
    });
    res.status(201).json(activity);
  })
);

export default router;
