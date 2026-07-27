import { Router, Request, Response, NextFunction } from "express";
import { anomalyDetectionService } from "../services/AnomalyDetectionService";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/detect",
  asyncHandler(async (req: Request, res: Response) => {
    const { metric, entityId, values, config } = req.body;
    if (!metric || !entityId || !values?.length) return res.status(400).json({ error: "metric, entityId, and values required" });
    const result = anomalyDetectionService.detect(metric, entityId, values, config);
    sendSuccess(res, result, { points: result.points.length, flagged: result.summary.flaggedCount });
  }),
);

router.post(
  "/multivariate",
  asyncHandler(async (req: Request, res: Response) => {
    const { metric, entityId, timeSeries, alpha } = req.body;
    if (!metric || !entityId || !timeSeries?.length) return res.status(400).json({ error: "metric, entityId, and timeSeries required" });
    const result = anomalyDetectionService.detectMultivariate(metric, entityId, timeSeries, alpha || 0.01);
    sendSuccess(res, result, { points: result.scores.length, flagged: result.summary.totalFlagged });
  }),
);

router.post(
  "/drift",
  asyncHandler(async (req: Request, res: Response) => {
    const { metric, entityId, values, windowSize, alpha } = req.body;
    if (!metric || !entityId || !values?.length) return res.status(400).json({ error: "metric, entityId, and values required" });
    const result = anomalyDetectionService.detectDrift(metric, entityId, values, windowSize || 14, alpha || 0.05);
    sendSuccess(res, result);
  }),
);

router.post(
  "/scan-campaign",
  asyncHandler(async (req: Request, res: Response) => {
    const { campaignId, metrics, config } = req.body;
    if (!campaignId || !metrics) return res.status(400).json({ error: "campaignId and metrics required" });
    const result = anomalyDetectionService.scanCampaign(campaignId, metrics, config);
    sendSuccess(res, result, { metrics: Object.keys(result.results).length });
  }),
);

router.post(
  "/ensemble",
  asyncHandler(async (req: Request, res: Response) => {
    const { metric, entityId, values, config } = req.body;
    if (!metric || !entityId || !values?.length) return res.status(400).json({ error: "metric, entityId, and values required" });
    const result = anomalyDetectionService.ensembleDetect(metric, entityId, values, config);
    sendSuccess(res, result, { points: result.points.length, flagged: result.summary.flaggedCount });
  }),
);

export default router;
