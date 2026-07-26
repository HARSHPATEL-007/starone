import { Router, Request, Response, NextFunction } from "express";
import { campaignHealthPredictorService } from "../services/CampaignHealthPredictorService";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/health-score",
  asyncHandler(async (req: Request, res: Response) => {
    const { metrics } = req.body;
    if (!metrics || !Array.isArray(metrics)) return res.status(400).json({ error: "metrics array required" });
    const result = campaignHealthPredictorService.computeHealthScore(metrics);
    sendSuccess(res, result);
  }),
);

router.post(
  "/risk-factors",
  asyncHandler(async (req: Request, res: Response) => {
    const { metrics } = req.body;
    if (!metrics || !Array.isArray(metrics)) return res.status(400).json({ error: "metrics array required" });
    const result = campaignHealthPredictorService.identifyRiskFactors(metrics);
    sendSuccess(res, result, { count: result.length });
  }),
);

router.post(
  "/early-warning",
  asyncHandler(async (req: Request, res: Response) => {
    const { metrics } = req.body;
    if (!metrics || !Array.isArray(metrics)) return res.status(400).json({ error: "metrics array required" });
    const result = campaignHealthPredictorService.computeEarlyWarning(metrics);
    sendSuccess(res, result);
  }),
);

router.post(
  "/survival-analysis",
  asyncHandler(async (req: Request, res: Response) => {
    const { metrics } = req.body;
    if (!metrics || !Array.isArray(metrics)) return res.status(400).json({ error: "metrics array required" });
    const result = campaignHealthPredictorService.computeSurvivalAnalysis(metrics);
    sendSuccess(res, result);
  }),
);

router.post(
  "/report",
  asyncHandler(async (req: Request, res: Response) => {
    const { campaignId, metrics } = req.body;
    if (!campaignId || !metrics) return res.status(400).json({ error: "campaignId and metrics required" });
    const result = campaignHealthPredictorService.generateReport(campaignId, metrics);
    sendSuccess(res, result);
  }),
);

router.get(
  "/sample-metrics",
  asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;
    const metrics = campaignHealthPredictorService.generateSampleMetrics(days);
    sendSuccess(res, metrics, { count: metrics.length });
  }),
);

export default router;
