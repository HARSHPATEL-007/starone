import { Router, Request, Response, NextFunction } from "express";
import { schedulerService } from "../services/SchedulerService";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const actions = schedulerService.list(tenantId);
    res.json(actions);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const action = schedulerService.get(req.params.id);
    if (!action) throw new AppError(404, "Scheduled action not found");
    res.json(action);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { campaignId, type, executeAt, params } = req.body;

    if (!campaignId || !type || !executeAt) {
      throw new AppError(400, "Missing required fields: campaignId, type, executeAt");
    }

    const validTypes = ["launch", "pause", "archive", "budget_change", "status_change"];
    if (!validTypes.includes(type)) {
      throw new AppError(400, `Invalid type. Must be one of: ${validTypes.join(", ")}`);
    }

    const executeDate = new Date(executeAt);
    if (executeDate.getTime() <= Date.now()) {
      throw new AppError(400, "executeAt must be in the future");
    }

    const action = schedulerService.schedule({
      tenantId,
      campaignId,
      type,
      executeAt: executeDate,
      params,
      createdBy: req.user!.userId,
    });

    res.status(201).json(action);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const cancelled = schedulerService.cancel(req.params.id);
    if (!cancelled) throw new AppError(404, "Scheduled action not found");
    res.status(204).send();
  })
);

export default router;
