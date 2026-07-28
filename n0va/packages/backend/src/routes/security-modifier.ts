import { Router, Request, Response, NextFunction } from "express";
import { securityModifierService } from "../services/SecurityModifierService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.post("/apply-schema", asyncHandler(async (req, res) => {
  const { action, params } = req.body;
  const result = securityModifierService.applySchemaModifier(action, params || {});
  sendSuccess(res, result);
}));

router.post("/before-execution-hook", asyncHandler(async (req, res) => {
  const { name, guardrails, brandSafety, utmParams } = req.body;
  const hook = securityModifierService.createBeforeExecutionHook(name, guardrails || [], !!brandSafety, !!utmParams);
  sendSuccess(res, hook);
}));

router.post("/check-execution", asyncHandler(async (req, res) => {
  const { hook, action, params } = req.body;
  const result = securityModifierService.applyBeforeExecution(hook, action, params || {});
  sendSuccess(res, result);
}));

router.post("/after-execution", asyncHandler(async (req, res) => {
  const { payload, maxSize } = req.body;
  const result = securityModifierService.createAfterExecutionResponse(payload, maxSize || 1048576);
  sendSuccess(res, result);
}));

router.post("/hitl", asyncHandler(async (req, res) => {
  const { actionId, actionDescription, value, threshold } = req.body;
  const result = securityModifierService.createHITLInterrogation(actionId, actionDescription, value, threshold);
  sendSuccess(res, result);
}));

router.post("/hitl/:id/resolve", asyncHandler(async (req, res) => {
  const { approved, digitalSignature } = req.body;
  const result = securityModifierService.resolveHITLInterrogation(req.params.id, !!approved, digitalSignature);
  sendSuccess(res, result || { error: "Interrogation not found" });
}));

router.post("/hitl/:id/escalate", asyncHandler(async (req, res) => {
  const result = securityModifierService.escalateHITLInterrogation(req.params.id);
  sendSuccess(res, result || { error: "Interrogation not found" });
}));

router.get("/hitl/pending", asyncHandler(async (req, res) => {
  const result = securityModifierService.getPendingInterrogations();
  sendSuccess(res, result);
}));

router.get("/modifiers", asyncHandler(async (req, res) => {
  const result = securityModifierService.getSecurityModifiers();
  sendSuccess(res, result);
}));

export default router;
