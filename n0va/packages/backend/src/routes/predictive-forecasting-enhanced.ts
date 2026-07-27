import { Router, Request, Response, NextFunction } from "express";
import { predictiveForecastingService } from "../services/PredictiveForecastingService";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/decompose",
  asyncHandler(async (req: Request, res: Response) => {
    const { values, seasonLength } = req.body;
    if (!values || !Array.isArray(values)) return res.status(400).json({ error: "values array required" });
    const result = predictiveForecastingService.decomposeTimeSeries(values, seasonLength || 7);
    sendSuccess(res, result, { dataPoints: values.length });
  }),
);

router.post(
  "/changepoints",
  asyncHandler(async (req: Request, res: Response) => {
    const { values, minSegmentSize } = req.body;
    if (!values || !Array.isArray(values)) return res.status(400).json({ error: "values array required" });
    const result = predictiveForecastingService.detectChangepoints(values, minSegmentSize || 5);
    sendSuccess(res, result, { changepointsFound: result.length });
  }),
);

router.post(
  "/arima",
  asyncHandler(async (req: Request, res: Response) => {
    const { campaignId, metric, history, horizon, options } = req.body;
    if (!campaignId || !metric || !history?.length) return res.status(400).json({ error: "campaignId, metric, and history required" });
    const result = predictiveForecastingService.arimaForecast(campaignId, metric, history, horizon, options);
    sendSuccess(res, result, { horizon });
  }),
);

router.post(
  "/ensemble",
  asyncHandler(async (req: Request, res: Response) => {
    const { campaignId, metric, history, horizon, options } = req.body;
    if (!campaignId || !metric || !history?.length) return res.status(400).json({ error: "campaignId, metric, and history required" });
    const result = predictiveForecastingService.ensembleForecast(campaignId, metric, history, horizon, options);
    sendSuccess(res, result, { models: result.models.length });
  }),
);

export default router;
