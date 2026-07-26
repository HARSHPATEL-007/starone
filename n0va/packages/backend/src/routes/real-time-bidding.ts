import { Router, Request, Response, NextFunction } from "express";
import { realTimeBiddingService } from "../services/RealTimeBiddingService";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/evaluate-bid",
  asyncHandler(async (req: Request, res: Response) => {
    const { request, targetCPA } = req.body;
    if (!request) return res.status(400).json({ error: "request is required" });
    if (targetCPA === undefined || targetCPA === null) return res.status(400).json({ error: "targetCPA is required" });
    const response = realTimeBiddingService.evaluateBid(request, targetCPA);
    sendSuccess(res, response);
  }),
);

router.post(
  "/record-result",
  asyncHandler(async (req: Request, res: Response) => {
    const { result } = req.body;
    if (!result) return res.status(400).json({ error: "result is required" });
    realTimeBiddingService.recordAuctionResult(result);
    sendSuccess(res, { recorded: true });
  }),
);

router.post(
  "/simulate-auction",
  asyncHandler(async (req: Request, res: Response) => {
    const { bids, secondPrice } = req.body;
    if (!bids || !Array.isArray(bids)) return res.status(400).json({ error: "bids array is required" });
    const result = realTimeBiddingService.simulateAuction(bids, secondPrice !== false);
    sendSuccess(res, result, { bidderCount: bids.length });
  }),
);

router.get(
  "/publisher-score/:publisherId",
  asyncHandler(async (req: Request, res: Response) => {
    const { publisherId } = req.params;
    if (!publisherId) return res.status(400).json({ error: "publisherId is required" });
    const score = realTimeBiddingService.getPublisherScore(publisherId);
    sendSuccess(res, score);
  }),
);

router.get(
  "/win-rate-model",
  asyncHandler(async (_req: Request, res: Response) => {
    const model = realTimeBiddingService.getWinRateModel();
    sendSuccess(res, model || { status: "not_trained", trainingSamples: 0 });
  }),
);

router.get(
  "/sample-request",
  asyncHandler(async (_req: Request, res: Response) => {
    const request = realTimeBiddingService.generateSampleRequest();
    sendSuccess(res, request);
  }),
);

export default router;
