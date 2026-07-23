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
    const agents = await DataStore.findAgents({ tenantId });
    res.json(agents);
  })
);

router.get(
  "/defaults",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json([
      { name: "Budget Agent", type: "budget", frequency: "every_4_hours", config: { maxShiftPercent: 30, minRoas: 2.5 }, hitlThreshold: 10000, description: "Monitors spend pacing and reallocates budget across platforms" },
      { name: "Creative Agent", type: "creative", frequency: "every_6_hours", config: { fatigueThreshold: 20, generateVariants: true }, description: "Detects creative fatigue and generates new variants" },
      { name: "Audience Agent", type: "audience", frequency: "daily", config: { minLtvScore: 0.7, maxSegmentSize: 2000000 }, description: "Analyzes segment performance and expands lookalikes" },
      { name: "Bid Agent", type: "bid", frequency: "every_2_hours", config: { cpcCap: 5.0, dayparting: true }, description: "Optimizes bids per platform and adjusts for seasonality" },
      { name: "Fraud Agent", type: "fraud", frequency: "realtime", config: { ivtThreshold: 90, autoPause: true }, description: "Monitors invalid traffic and auto-pauses suspicious placements" },
    ]);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, type, frequency, config, hitlThreshold } = req.body;
    if (!name || !type) throw new AppError(400, "Missing required fields: name, type");

    const agent = await DataStore.createAgent({
      tenantId,
      name,
      type,
      status: "idle",
      frequency: frequency || "every_4_hours",
      config: config || {},
      metrics: { runs: 0, successes: 0, failures: 0, actionsTaken: 0 },
      hitlThreshold,
      createdBy: req.user!.userId,
    });

    res.status(201).json(agent);
  })
);

router.patch(
  "/:id/status",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { status } = req.body;
    if (!status) throw new AppError(400, "Missing status field");
    const agent = await DataStore.updateAgent(id, tenantId, { status });
    if (!agent) throw new AppError(404, "Agent not found");
    res.json(agent);
  })
);

router.patch(
  "/:id/record-run",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { success, error, actionsCount } = req.body;

    const update: Record<string, any> = {
      $inc: {
        "metrics.runs": 1,
        "metrics.actionsTaken": actionsCount || 0,
        "metrics.successes": success ? 1 : 0,
        "metrics.failures": success ? 0 : 1,
      },
      lastRun: new Date().toISOString(),
    };
    if (error) update.lastError = error;

    const agent = DataStore.findAgents({ tenantId }).then((agents: any[]) => agents.find((a: any) => a._id === id));
    if (!agent) throw new AppError(404, "Agent not found");

    const updated = await DataStore.updateAgent(id, tenantId, update);
    res.json(updated || (await agent));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const deleted = await DataStore.deleteAgent(id, tenantId);
    if (!deleted) throw new AppError(404, "Agent not found");
    res.status(204).send();
  })
);

export default router;
