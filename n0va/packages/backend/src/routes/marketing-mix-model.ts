import { Router, Request, Response, NextFunction } from "express";
import { marketingMixModelService } from "../services/MarketingMixModelService";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/run",
  asyncHandler(async (req: Request, res: Response) => {
    const { channels, historicalData, adstockParams, saturationParams } = req.body;
    if (!channels || !historicalData) return res.status(400).json({ error: "channels and historicalData are required" });
    const result = marketingMixModelService.runMMM({ channels, historicalData, adstockParams, saturationParams });
    sendSuccess(res, result, { channelCount: channels.length, dataPoints: historicalData.length });
  }),
);

router.post(
  "/scenario",
  asyncHandler(async (req: Request, res: Response) => {
    const { mmmResult, scenario, baseSpend } = req.body;
    if (!mmmResult || !scenario || !baseSpend) return res.status(400).json({ error: "mmmResult, scenario, and baseSpend are required" });
    const result = marketingMixModelService.runScenario(mmmResult, scenario, baseSpend);
    sendSuccess(res, result);
  }),
);

router.get(
  "/sample-data",
  asyncHandler(async (_req: Request, res: Response) => {
    const data = marketingMixModelService.generateSampleData();
    sendSuccess(res, data, { channels: data.channels.length, weeks: data.historicalData.length });
  }),
);

export default router;
