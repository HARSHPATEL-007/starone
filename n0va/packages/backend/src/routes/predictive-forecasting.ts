import { Router, Request, Response, NextFunction } from "express";
import { predictiveForecastingService } from "../services/PredictiveForecastingService";
import { AppError } from "../middleware/errorHandler";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post("/forecast", asyncHandler(async (req, res) => {
  const { campaignId, metric, history, horizon, options } = req.body;
  if (!campaignId || !metric || !history?.length) throw new AppError(400, "campaignId, metric, and history required");
  res.json(predictiveForecastingService.forecast(campaignId, metric, history, horizon, options));
}));

router.post("/budget", asyncHandler(async (req, res) => {
  const { campaignId, totalBudget, startDate, endDate, dailySpend } = req.body;
  if (!campaignId || !totalBudget || !startDate || !endDate) throw new AppError(400, "campaignId, totalBudget, startDate, endDate required");
  res.json(predictiveForecastingService.forecastBudget(campaignId, totalBudget, startDate, endDate, dailySpend || []));
}));

router.post("/conversions", asyncHandler(async (req, res) => {
  const { campaignId, spendHistory, conversionHistory, futureSpend } = req.body;
  if (!campaignId || !spendHistory?.length || !conversionHistory?.length) throw new AppError(400, "campaignId, spendHistory, conversionHistory required");
  res.json(predictiveForecastingService.predictConversions(campaignId, spendHistory, conversionHistory, futureSpend || []));
}));

export default router;
