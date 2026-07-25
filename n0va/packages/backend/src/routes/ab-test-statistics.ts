import { Router, Request, Response, NextFunction } from "express";
import { statisticalABTestService } from "../services/StatisticalABTestService";
import { AppError } from "../middleware/errorHandler";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post("/test", asyncHandler(async (req, res) => {
  const { controlImpressions, controlConversions, variantImpressions, variantConversions } = req.body;
  if (controlImpressions === undefined || controlConversions === undefined || variantImpressions === undefined || variantConversions === undefined) {
    throw new AppError(400, "controlImpressions, controlConversions, variantImpressions, variantConversions required");
  }
  res.json(statisticalABTestService.test({ controlImpressions, controlConversions, variantImpressions, variantConversions }));
}));

router.post("/sample-size", asyncHandler(async (req, res) => {
  const { baselineRate, minimumDetectableEffect, significanceLevel, power } = req.body;
  if (baselineRate === undefined || minimumDetectableEffect === undefined) throw new AppError(400, "baselineRate, minimumDetectableEffect required");
  res.json({ requiredSampleSize: statisticalABTestService.sampleSize({ baselineRate, minimumDetectableEffect, significanceLevel, power }) });
}));

router.post("/estimate-duration", asyncHandler(async (req, res) => {
  const { dailyVisitors, baselineRate, minimumDetectableEffect, significanceLevel, power, trafficAllocation } = req.body;
  if (!dailyVisitors || baselineRate === undefined || minimumDetectableEffect === undefined) throw new AppError(400, "dailyVisitors, baselineRate, minimumDetectableEffect required");
  res.json(statisticalABTestService.estimateDuration(dailyVisitors, { baselineRate, minimumDetectableEffect, significanceLevel, power }, trafficAllocation));
}));

export default router;
