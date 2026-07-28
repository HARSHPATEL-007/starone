import { Router, Request, Response, NextFunction } from "express";
import { campaignBudgetSimulator } from "../services/CampaignBudgetSimulatorService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.post("/simulate", asyncHandler(async (req, res) => {
  const { config, runs } = req.body;
  const result = campaignBudgetSimulator.simulateCampaign(config, runs || 5000);
  sendSuccess(res, result);
}));

router.post("/scenario", asyncHandler(async (req, res) => {
  const { configs, runs } = req.body;
  const scenario = campaignBudgetSimulator.runScenario(req.user!.tenantId, configs || [], runs || 5000);
  sendSuccess(res, scenario);
}));

router.get("/history", asyncHandler(async (req, res) => {
  const history = campaignBudgetSimulator.getHistory(req.user!.tenantId);
  sendSuccess(res, history);
}));

router.get("/summary", asyncHandler(async (req, res) => {
  const summary = campaignBudgetSimulator.getSummary(req.user!.tenantId);
  sendSuccess(res, summary);
}));

export default router;