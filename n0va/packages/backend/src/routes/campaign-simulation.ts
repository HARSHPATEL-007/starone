import { Router, Request, Response, NextFunction } from "express";
import { campaignSimulationService } from "../services/CampaignSimulationService";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/simulate",
  asyncHandler(async (req: Request, res: Response) => {
    const { channels, scenario, trials, seed } = req.body;
    if (!channels || !scenario) return res.status(400).json({ error: "channels and scenario are required" });
    if (!Array.isArray(channels)) return res.status(400).json({ error: "channels must be an array" });
    const result = campaignSimulationService.runSimulation(channels, scenario, trials || 1000, seed);
    sendSuccess(res, result, { trials: result.trials.length, scenarioCount: 1 });
  }),
);

router.post(
  "/multi-scenario",
  asyncHandler(async (req: Request, res: Response) => {
    const { channels, scenarios, trials } = req.body;
    if (!channels || !scenarios) return res.status(400).json({ error: "channels and scenarios are required" });
    if (!Array.isArray(scenarios)) return res.status(400).json({ error: "scenarios must be an array" });
    const results = campaignSimulationService.runMultiScenario(channels, scenarios, trials || 500);
    sendSuccess(res, results, { scenarioCount: results.length });
  }),
);

router.get(
  "/sample-channels",
  asyncHandler(async (_req: Request, res: Response) => {
    const channels = campaignSimulationService.generateSampleChannels();
    sendSuccess(res, channels, { count: channels.length });
  }),
);

router.get(
  "/sample-scenarios",
  asyncHandler(async (_req: Request, res: Response) => {
    const scenarios = campaignSimulationService.generateSampleScenarios();
    sendSuccess(res, scenarios, { count: scenarios.length });
  }),
);

export default router;
