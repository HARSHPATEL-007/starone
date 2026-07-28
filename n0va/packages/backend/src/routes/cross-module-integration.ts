import { Router, Request, Response, NextFunction } from "express";
import { crossModuleIntegrationService } from "../services/CrossModuleIntegrationService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/matrix", asyncHandler(async (req, res) => {
  const { action } = req.query;
  const result = crossModuleIntegrationService.getIntegrationMatrix(action as string || undefined);
  sendSuccess(res, result);
}));

router.get("/module/:module/actions", asyncHandler(async (req, res) => {
  const result = crossModuleIntegrationService.getActionsForModule(req.params.module);
  sendSuccess(res, result);
}));

router.get("/action/:action/targets", asyncHandler(async (req, res) => {
  const result = crossModuleIntegrationService.getTargetsForAction(req.params.action);
  sendSuccess(res, result);
}));

router.post("/execute", asyncHandler(async (req, res) => {
  const { sourceAction, sourceEntity } = req.body;
  const result = crossModuleIntegrationService.executeAction(req.user!.tenantId, sourceAction, sourceEntity);
  sendSuccess(res, result);
}));

router.get("/history", asyncHandler(async (req, res) => {
  const result = crossModuleIntegrationService.getActionHistory(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/dashboard", asyncHandler(async (req, res) => {
  const result = crossModuleIntegrationService.getDashboard(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/action/:action/summary", asyncHandler(async (req, res) => {
  const result = crossModuleIntegrationService.summarizeImpact(req.params.action);
  sendSuccess(res, result || { error: "Action not found" });
}));

export default router;
