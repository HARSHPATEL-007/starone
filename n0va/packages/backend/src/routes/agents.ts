import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { agentService } from "../services/AgentService";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!DataStore.usingMemory()) {
      const agents = await agentService.findByTenant(tenantId);
      res.json(agents);
    } else {
      const agents = await DataStore.findAgents({ tenantId });
      res.json(agents);
    }
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const agents = await DataStore.findAgents({ tenantId });
    const agent = agents.find((a: any) => a._id === req.params.id);
    if (!agent) throw new AppError(404, "Agent not found");
    res.json(agent);
  })
);

router.get(
  "/defaults",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(agentService.getDefaultAgents());
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, type, frequency, config, hitlThreshold } = req.body;
    if (!name || !type) throw new AppError(400, "Missing required fields: name, type");

    if (!DataStore.usingMemory()) {
      const agent = await agentService.create({
        tenantId,
        name,
        type,
        frequency: frequency || "every_4_hours",
        config: config || {},
        hitlThreshold,
        createdBy: req.user!.userId,
      });
      res.status(201).json(agent);
    } else {
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
    }
  })
);

router.patch(
  "/:id/status",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { status } = req.body;
    if (!status) throw new AppError(400, "Missing status field");

    if (!DataStore.usingMemory()) {
      const agent = await agentService.updateStatus(id, tenantId, status);
      if (!agent) throw new AppError(404, "Agent not found");
      res.json(agent);
    } else {
      const agent = await DataStore.updateAgent(id, tenantId, { status });
      if (!agent) throw new AppError(404, "Agent not found");
      res.json(agent);
    }
  })
);

router.patch(
  "/:id/record-run",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { success, error, actionsCount } = req.body;

    if (!DataStore.usingMemory()) {
      const agent = await agentService.recordRun(id, tenantId, success !== false, error, actionsCount || 0);
      if (!agent) throw new AppError(404, "Agent not found");
      res.json(agent);
    } else {
      const update: Record<string, any> = {
        $inc: {
          "metrics.runs": 1,
          "metrics.actionsTaken": actionsCount || 0,
          "metrics.successes": success !== false ? 1 : 0,
          "metrics.failures": success !== false ? 0 : 1,
        },
        lastRun: new Date().toISOString(),
      };
      if (error) update.lastError = error;
      const updated = await DataStore.updateAgent(id, tenantId, update);
      if (!updated) throw new AppError(404, "Agent not found");
      res.json(updated);
    }
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    if (!DataStore.usingMemory()) {
      const deleted = await agentService.delete(id, tenantId);
      if (!deleted) throw new AppError(404, "Agent not found");
    } else {
      const deleted = await DataStore.deleteAgent(id, tenantId);
      if (!deleted) throw new AppError(404, "Agent not found");
    }
    res.status(204).send();
  })
);

export default router;
