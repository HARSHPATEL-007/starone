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

router.post("/sensitivity", asyncHandler(async (req, res) => {
  const { channel, seed } = req.body;
  if (!channel) return res.status(400).json({ error: "channel is required" });
  const result = campaignSimulationService.sensitivityAnalysis(channel, seed);
  sendSuccess(res, result);
}));

router.post("/budget-optimization", asyncHandler(async (req, res) => {
  const { channels, totalBudget, seed } = req.body;
  if (!channels || !totalBudget) return res.status(400).json({ error: "channels and totalBudget are required" });
  const result = campaignSimulationService.budgetOptimization(channels, totalBudget, seed);
  sendSuccess(res, result);
}));

router.post("/risk-assessment", asyncHandler(async (req, res) => {
  const { channels, scenarios, seed } = req.body;
  if (!channels || !scenarios) return res.status(400).json({ error: "channels and scenarios are required" });
  const result = campaignSimulationService.riskAssessment(channels, scenarios, seed);
  sendSuccess(res, result);
}));

router.post("/channel-efficiency", asyncHandler(async (req, res) => {
  const { channel, seed } = req.body;
  if (!channel) return res.status(400).json({ error: "channel is required" });
  const result = campaignSimulationService.channelEfficiency(channel, seed);
  sendSuccess(res, result);
}));

router.post("/monte-carlo-forecast", asyncHandler(async (req, res) => {
  const { channel, budget, trials, seed } = req.body;
  if (!channel || !budget) return res.status(400).json({ error: "channel and budget are required" });
  const result = campaignSimulationService.monteCarloForecast(channel, budget, trials, seed);
  sendSuccess(res, result);
}));

router.post("/budget-elasticity", asyncHandler(async (req, res) => {
  const { channel, seed } = req.body;
  if (!channel) return res.status(400).json({ error: "channel is required" });
  const result = campaignSimulationService.budgetElasticity(channel, seed);
  sendSuccess(res, result);
}));

router.post("/optimal-channel-mix", asyncHandler(async (req, res) => {
  const { channels, totalBudget, targetROAS, seed } = req.body;
  if (!channels || totalBudget === undefined || targetROAS === undefined) return res.status(400).json({ error: "channels, totalBudget, and targetROAS are required" });
  const result = campaignSimulationService.optimalChannelMix(channels, totalBudget, targetROAS, seed);
  sendSuccess(res, result);
}));

router.post("/simulation-summary", asyncHandler(async (req, res) => {
  const { channels, scenarios, seed } = req.body;
  if (!channels || !scenarios) return res.status(400).json({ error: "channels and scenarios are required" });
  const result = campaignSimulationService.simulationSummary(channels, scenarios, seed);
  sendSuccess(res, result);
}));

export default router;
