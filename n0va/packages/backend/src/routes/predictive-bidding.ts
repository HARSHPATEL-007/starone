import { Router, Request, Response, NextFunction } from "express";
import { predictiveBiddingService } from "../services/PredictiveBiddingService";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/config",
  asyncHandler(async (_req: Request, res: Response) => {
    const config = predictiveBiddingService.getConfig();
    const actions = predictiveBiddingService.actions;
    sendSuccess(res, { config, actions, actionCount: actions.length });
  }),
);

router.post(
  "/recommend",
  asyncHandler(async (req: Request, res: Response) => {
    const { state, campaignId } = req.body;
    if (!state) return res.status(400).json({ error: "state is required" });
    const rec = predictiveBiddingService.recommendBid(state, campaignId);
    sendSuccess(res, rec);
  }),
);

router.post(
  "/reward",
  asyncHandler(async (req: Request, res: Response) => {
    const { campaignId, state, actionIndex, reward } = req.body;
    if (!campaignId || !state || actionIndex === undefined || reward === undefined) {
      return res.status(400).json({ error: "campaignId, state, actionIndex, reward required" });
    }
    const result = predictiveBiddingService.applyReward(campaignId, state, actionIndex, reward);
    sendSuccess(res, result);
  }),
);

router.post(
  "/simulate",
  asyncHandler(async (req: Request, res: Response) => {
    const { campaignId, initialState, steps } = req.body;
    if (!campaignId || !initialState) return res.status(400).json({ error: "campaignId and initialState required" });
    const result = predictiveBiddingService.simulateEpisode(campaignId, initialState, steps || 10);
    sendSuccess(res, result);
  }),
);

router.get(
  "/qtable/:campaignId",
  asyncHandler(async (req: Request, res: Response) => {
    const snapshot = predictiveBiddingService.getQTableSnapshot(req.params.campaignId);
    sendSuccess(res, snapshot, { campaignId: req.params.campaignId, entryCount: snapshot.length });
  }),
);

router.get(
  "/history/:campaignId",
  asyncHandler(async (req: Request, res: Response) => {
    const history = predictiveBiddingService.getActionHistory(req.params.campaignId);
    sendSuccess(res, history, { campaignId: req.params.campaignId, actionCount: history.length });
  }),
);

router.post(
  "/sample-state",
  asyncHandler(async (req: Request, res: Response) => {
    const { platformId } = req.body;
    const state = predictiveBiddingService.generateSampleBidState(platformId);
    sendSuccess(res, state);
  }),
);

export default router;
