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
    const { status, type } = req.query;
    const page = safeInt(req.query.page, 1);
    const limit = safeInt(req.query.limit, 20);
    const filter: Record<string, any> = { tenantId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    const goals = await DataStore.findGoals(filter);
    const arr = Array.isArray(goals) ? goals : [];
    const total = arr.length;
    const paginated = arr.slice((page - 1) * limit, page * limit);
    const active = arr.filter((g: any) => g.status === "active");
    const onTrack = active.filter((g: any) => (g.progress || 0) >= 50);
    const typeDistribution: Record<string, number> = {};
    for (const g of arr) typeDistribution[g.type || "unknown"] = (typeDistribution[g.type || "unknown"] || 0) + 1;
    const avgProgress = arr.length > 0 ? Math.round(arr.reduce((s: number, g: any) => s + (g.progress || 0), 0) / arr.length * 100) / 100 : 0;
    const meta: Record<string, unknown> = { activeCount: active.length, onTrackCount: onTrack.length, avgProgress, typeDistribution };
    sendPaginated(res, paginated, computePagination(page, limit, total), meta);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const goal = await DataStore.findGoalById(id, tenantId);
    if (!goal) throw new AppError(404, "Goal not found");
    const daysSinceCreation = goal.createdAt ? Math.round((Date.now() - new Date(goal.createdAt).getTime()) / 86400000) : 0;
    const projectedCompletion = goal.progress > 0 && daysSinceCreation > 0 ? Math.round(daysSinceCreation / (goal.progress / 100)) : null;
    const meta: Record<string, unknown> = {};
    if (projectedCompletion) meta.projectedDaysToCompletion = projectedCompletion;
    meta.daysElapsed = daysSinceCreation;
    sendSuccess(res, goal, meta);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, type, target, deadline } = req.body;
    if (!name || !type || !target || !deadline) throw new AppError(400, "Missing required fields: name, type, target, deadline");
    const goal = await DataStore.createGoal({
      tenantId, name, type, target, deadline: new Date(deadline), current: 0, progress: 0, status: "active",
      owner: req.user!.userId, createdBy: req.user!.userId,
    });
    sendCreated(res, goal);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { name, target, current, progress, status, owner } = req.body;
    const update: Record<string, any> = {};
    if (name) update.name = name;
    if (target !== undefined) update.target = target;
    if (current !== undefined) update.current = current;
    if (progress !== undefined) update.progress = progress;
    if (status) update.status = status;
    if (owner) update.owner = owner;
    const updated = await DataStore.updateGoal(id, tenantId, update);
    if (!updated) throw new AppError(404, "Goal not found");
    sendSuccess(res, updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const deleted = await DataStore.deleteGoal(id, tenantId);
    if (!deleted) throw new AppError(404, "Goal not found");
    res.status(204).send();
  })
);

export default router;
