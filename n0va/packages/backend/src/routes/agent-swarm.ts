import { Router, Request, Response, NextFunction } from "express";
import { agentSwarmService } from "../services/AgentSwarmService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/status", asyncHandler(async (req, res) => {
  const result = agentSwarmService.getSwarmStatus(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/execute", asyncHandler(async (req, res) => {
  const { agentName, agentType, action, platform, params, hitlThreshold } = req.body;
  const result = await agentSwarmService.executeAgentAction(req.user!.tenantId, agentName, agentType, action, platform, params || {}, hitlThreshold);
  sendSuccess(res, result);
}));

router.get("/hitl", asyncHandler(async (req, res) => {
  const result = agentSwarmService.getHITLQueue();
  sendSuccess(res, result, { count: result.length });
}));

router.post("/hitl/:id/resolve", asyncHandler(async (req, res) => {
  const { approved, approver } = req.body;
  const result = await agentSwarmService.resolveHITL(req.params.id, !!approved, approver);
  sendSuccess(res, result || { error: "HITL request not found" });
}));

export default router;
