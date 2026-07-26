import { Router, Request, Response, NextFunction } from "express";
import { statisticalABTestService } from "../services/StatisticalABTestService";
import { statisticalABTestOrchestrator } from "../business-logic/StatisticalABTestOrchestrator";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, safeFloat } from "./route-utils";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post("/test", asyncHandler(async (req, res) => {
  const { controlImpressions, controlConversions, variantImpressions, variantConversions } = req.body;
  if (controlImpressions === undefined || controlConversions === undefined || variantImpressions === undefined || variantConversions === undefined) {
    throw new AppError(400, "controlImpressions, controlConversions, variantImpressions, variantConversions required");
  }
  const result = statisticalABTestService.test({ controlImpressions, controlConversions, variantImpressions, variantConversions });
  sendSuccess(res, result);
}));

router.post("/sample-size", asyncHandler(async (req, res) => {
  const { baselineRate, minimumDetectableEffect, significanceLevel, power } = req.body;
  if (baselineRate === undefined || minimumDetectableEffect === undefined) throw new AppError(400, "baselineRate, minimumDetectableEffect required");
  const requiredSampleSize = statisticalABTestService.sampleSize({ baselineRate, minimumDetectableEffect, significanceLevel, power });
  sendSuccess(res, { requiredSampleSize });
}));

router.post("/estimate-duration", asyncHandler(async (req, res) => {
  const { dailyVisitors, baselineRate, minimumDetectableEffect, significanceLevel, power, trafficAllocation } = req.body;
  if (!dailyVisitors || baselineRate === undefined || minimumDetectableEffect === undefined) throw new AppError(400, "dailyVisitors, baselineRate, minimumDetectableEffect required");
  const duration = statisticalABTestService.estimateDuration(dailyVisitors, { baselineRate, minimumDetectableEffect, significanceLevel, power }, trafficAllocation);
  sendSuccess(res, duration);
}));

router.get("/orchestrate/dashboard", asyncHandler(async (req, res) => {
  const baseRate = safeFloat(req.query.baselineRate, 0);
  const mde = safeFloat(req.query.mde, 0);
  const visitors = safeFloat(req.query.dailyVisitors, 5000);
  const dashboard = statisticalABTestOrchestrator.getDashboard(baseRate > 0 ? baseRate : undefined, mde > 0 ? mde : undefined, visitors);
  sendSuccess(res, dashboard, { healthBand: dashboard.healthBand, significantRate: `${dashboard.significantRate}%`, averagePower: dashboard.averagePower });
}));

export default router;
