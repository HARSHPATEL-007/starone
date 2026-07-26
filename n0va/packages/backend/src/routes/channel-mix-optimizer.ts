import { Router, Request, Response, NextFunction } from "express";
import { channelMixOptimizerOrchestrator } from "../business-logic/ChannelMixOptimizerOrchestrator";
import { sendSuccess } from "./route-utils";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/", asyncHandler(async (req, res) => {
  const report = await channelMixOptimizerOrchestrator.analyze(req.user!.tenantId);
  sendSuccess(res, report);
}));

router.get("/orchestrate", asyncHandler(async (req, res) => {
  const report = await channelMixOptimizerOrchestrator.analyze(req.user!.tenantId);
  sendSuccess(res, report);
}));

export default router;
