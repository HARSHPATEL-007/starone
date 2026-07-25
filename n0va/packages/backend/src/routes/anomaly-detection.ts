import { Router, Request, Response, NextFunction } from "express";
import { anomalyDetectionService } from "../services/AnomalyDetectionService";
import { AppError } from "../middleware/errorHandler";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post("/detect", asyncHandler(async (req, res) => {
  const { metric, entityId, values, config } = req.body;
  if (!metric || !entityId || !values?.length) throw new AppError(400, "metric, entityId, and values required");
  res.json(anomalyDetectionService.detect(metric, entityId, values, config));
}));

router.post("/scan-campaign", asyncHandler(async (req, res) => {
  const { campaignId, metrics, config } = req.body;
  if (!campaignId || !metrics) throw new AppError(400, "campaignId and metrics required");
  res.json(anomalyDetectionService.scanCampaign(campaignId, metrics, config));
}));

export default router;
