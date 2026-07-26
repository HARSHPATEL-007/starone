import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import { agentSwarmOrchestrator } from "../business-logic/AgentSwarmOrchestrator";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const dashboard = await agentSwarmOrchestrator.getDashboard(req.user!.tenantId);
    sendSuccess(res, dashboard);
  })
);

router.post(
  "/orchestrate/execute",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { agentName, agentType, action, platform, params, hitlThreshold } = req.body;
    if (!agentName || !agentType || !action || !platform) {
      throw new AppError(400, "Missing required fields: agentName, agentType, action, platform");
    }
    const result = await agentSwarmOrchestrator.executeAction(tenantId, agentName, agentType, action, platform, params || {}, hitlThreshold);
    sendSuccess(res, result);
  })
);

router.get(
  "/orchestrate/hitl",
  asyncHandler(async (req: Request, res: Response) => {
    const queue = await agentSwarmOrchestrator.getHITLQueue();
    sendSuccess(res, queue, { count: queue.length });
  })
);

router.post(
  "/orchestrate/hitl/:id/resolve",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { approved, approver } = req.body;
    if (approved === undefined || !approver) throw new AppError(400, "Missing required fields: approved, approver");
    const result = await agentSwarmOrchestrator.resolveHITL(id, approved, approver);
    if (!result) throw new AppError(404, "HITL request not found");
    sendSuccess(res, result);
  })
);

router.get(
  "/orchestrate/executions",
  asyncHandler(async (req: Request, res: Response) => {
    const history = await agentSwarmOrchestrator.getExecutionHistory(req.user!.tenantId);
    sendSuccess(res, history, { count: history.length });
  })
);

export default router;
