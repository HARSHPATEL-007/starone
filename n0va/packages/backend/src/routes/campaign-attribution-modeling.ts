import { Router, Request, Response, NextFunction } from "express";
import { campaignAttributionModeling } from "../services/CampaignAttributionModelingService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/attribution", asyncHandler(async (req, res) => {
  const model = (req.query.model as "first_touch" | "last_touch" | "linear" | "time_decay" | "position_based") || "linear";
  const result = campaignAttributionModeling.runAttribution(req.params.campaignId, req.user!.tenantId, model);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution/shapley", asyncHandler(async (req, res) => {
  const result = campaignAttributionModeling.shapleyValueAttribution(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution/markov", asyncHandler(async (req, res) => {
  const result = campaignAttributionModeling.markovChainAttribution(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution/compare", asyncHandler(async (req, res) => {
  const result = campaignAttributionModeling.compareAttributionModels(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution/channels", asyncHandler(async (req, res) => {
  const result = campaignAttributionModeling.attributionByChannel(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution/insights", asyncHandler(async (req, res) => {
  const result = campaignAttributionModeling.attributionInsights(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
