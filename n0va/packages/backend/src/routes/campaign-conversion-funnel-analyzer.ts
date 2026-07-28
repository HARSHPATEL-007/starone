import { Router, Request, Response, NextFunction } from "express";
import { campaignConversionFunnelAnalyzer } from "../services/CampaignConversionFunnelAnalyzerService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/campaign/:campaignId/funnel", asyncHandler(async (req, res) => {
  const result = campaignConversionFunnelAnalyzer.analyzeFunnel(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/drop-offs", asyncHandler(async (req, res) => {
  const result = campaignConversionFunnelAnalyzer.analyzeFunnelDropOffs(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/optimizations", asyncHandler(async (req, res) => {
  const result = campaignConversionFunnelAnalyzer.generateFunnelOptimizations(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/compare", asyncHandler(async (req, res) => {
  const result = campaignConversionFunnelAnalyzer.compareFunnels(req.body.campaignIds, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/segments", asyncHandler(async (req, res) => {
  const result = campaignConversionFunnelAnalyzer.analyzeFunnelSegments(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/trends", asyncHandler(async (req, res) => {
  const result = campaignConversionFunnelAnalyzer.analyzeFunnelTrends(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
