import { Router, Request, Response, NextFunction } from "express";
import { enhancedAttributionService } from "../services/EnhancedAttributionService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.post("/path", asyncHandler(async (req, res) => {
  const { conversionId, campaignIds, touchpoints, conversionValue, model } = req.body;
  const result = enhancedAttributionService.createPath(conversionId, campaignIds || [], touchpoints || [], conversionValue || 0, model || "last_click");
  sendSuccess(res, result);
}));

router.get("/dashboard/:model", asyncHandler(async (req, res) => {
  const result = enhancedAttributionService.getChannelDashboard(req.user!.tenantId, req.params.model);
  sendSuccess(res, result);
}));

router.get("/compare", asyncHandler(async (req, res) => {
  const result = enhancedAttributionService.getModelComparison(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/simulate", asyncHandler(async (req, res) => {
  const { campaignId, testDays } = req.body;
  const result = enhancedAttributionService.simulateIncrementalityTest(req.user!.tenantId, campaignId, testDays || 30);
  sendSuccess(res, result);
}));

export default router;
