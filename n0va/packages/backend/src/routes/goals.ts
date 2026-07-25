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
    const { status, type } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    const goals = await DataStore.findGoals(filter);
    res.json(goals);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const goal = await DataStore.findGoalById(id, tenantId);
    if (!goal) throw new AppError(404, "Goal not found");
    res.json(goal);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, type, target, deadline } = req.body;
    if (!name || !type || !target || !deadline) throw new AppError(400, "Missing required fields: name, type, target, deadline");
    const goal = await DataStore.createGoal({
      tenantId,
      name,
      type,
      target,
      deadline: new Date(deadline),
      current: 0,
      progress: 0,
      status: "active",
      owner: req.user!.userId,
      createdBy: req.user!.userId,
    });
    res.status(201).json(goal);
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
    res.json(updated);
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
