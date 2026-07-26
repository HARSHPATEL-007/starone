import { Router, Request, Response, NextFunction } from "express";
import { keywordInsightsOrchestrator } from "../business-logic/KeywordInsightsOrchestrator";
import { sendSuccess } from "./route-utils";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/", asyncHandler(async (req, res) => {
  const report = await keywordInsightsOrchestrator.analyze(req.user!.tenantId);
  sendSuccess(res, report);
}));

router.get("/orchestrate", asyncHandler(async (req, res) => {
  const report = await keywordInsightsOrchestrator.analyze(req.user!.tenantId);
  sendSuccess(res, report);
}));

export default router;
