import { Router, Request, Response, NextFunction } from "express";
import { anomalyDetectionService } from "../services/AnomalyDetectionService";
import { anomalyDetectionOrchestrator } from "../business-logic/AnomalyDetectionOrchestrator";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "./route-utils";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post("/detect", asyncHandler(async (req, res) => {
  const { metric, entityId, values, config } = req.body;
  if (!metric || !entityId || !values?.length) throw new AppError(400, "metric, entityId, and values required");
  const result = anomalyDetectionService.detect(metric, entityId, values, config);
  const arr = Array.isArray(result) ? result : (result as any)?.anomalies || [];
  const anomalyCount = Array.isArray(arr) ? arr.filter((a: any) => a.isAnomaly).length : 0;
  sendSuccess(res, result, { totalDataPoints: arr.length, anomaliesDetected: anomalyCount });
}));

router.post("/scan-campaign", asyncHandler(async (req, res) => {
  const { campaignId, metrics, config } = req.body;
  if (!campaignId || !metrics) throw new AppError(400, "campaignId and metrics required");
  const result = anomalyDetectionService.scanCampaign(campaignId, metrics, config);
  sendSuccess(res, result);
}));

router.get("/orchestrate/investigate", asyncHandler(async (req, res) => {
  const report = await anomalyDetectionOrchestrator.investigate(req.user!.tenantId);
  sendSuccess(res, report);
}));

export default router;
