import { Router, Request, Response, NextFunction } from "express";
import { enhancedAgentService } from "../services/EnhancedAgentService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/definitions", asyncHandler(async (req, res) => {
  const result = enhancedAgentService.getAgentDefinitions();
  sendSuccess(res, result);
}));

router.get("/definitions/:type", asyncHandler(async (req, res) => {
  const result = enhancedAgentService.getAgentDefinition(req.params.type);
  sendSuccess(res, result || { error: "Agent type not found" });
}));

router.get("/schedules", asyncHandler(async (req, res) => {
  const result = enhancedAgentService.computeSchedules(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/status", asyncHandler(async (req, res) => {
  const result = enhancedAgentService.getDetailedStatus(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/compliance", asyncHandler(async (req, res) => {
  const result = enhancedAgentService.getComplianceStatus(req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
