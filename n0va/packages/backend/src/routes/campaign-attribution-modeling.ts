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

router.post("/campaign/:campaignId/attribution/custom", asyncHandler(async (req, res) => {
  const { config } = req.body;
  if (!config || !config.weights) return res.status(400).json({ error: "config with weights required" });
  const result = campaignAttributionModeling.attributionCustomModel(req.params.campaignId, req.user!.tenantId, config);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution/channel-contribution", asyncHandler(async (req, res) => {
  const result = campaignAttributionModeling.attributionChannelContribution(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution/roi-distribution", asyncHandler(async (req, res) => {
  const result = campaignAttributionModeling.attributionROIDistribution(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution/time-to-convert", asyncHandler(async (req, res) => {
  const result = campaignAttributionModeling.attributionTimeToConvert(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/attribution/cross-campaign", asyncHandler(async (req, res) => {
  const { campaignIds } = req.body;
  if (!campaignIds || !Array.isArray(campaignIds)) return res.status(400).json({ error: "campaignIds array required" });
  const result = campaignAttributionModeling.attributionCrossCampaign(campaignIds, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/attribution/what-if", asyncHandler(async (req, res) => {
  const result = campaignAttributionModeling.attributionWhatIf(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
