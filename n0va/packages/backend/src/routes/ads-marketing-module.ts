import { Router, Request, Response, NextFunction } from "express";
import { adsMarketingModule } from "../services/AdsMarketingModuleService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/health", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.moduleHealth();
  sendSuccess(res, result);
}));

router.get("/stats", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.moduleStats(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/campaign/:campaignId/health", asyncHandler(async (req, res) => {
  const result = await adsMarketingModule.fullCampaignHealth(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/campaign/:campaignId/optimize", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.optimizationCycle(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/lifecycle", asyncHandler(async (req, res) => {
  const result = await adsMarketingModule.runFullLifecycle(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/campaign/:campaignId/analysis", asyncHandler(async (req, res) => {
  const result = await adsMarketingModule.crossServiceAnalysis(req.params.campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/dashboard", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.executiveDashboard(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/portfolio-overview", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.portfolioHealthOverview(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/report", asyncHandler(async (req, res) => {
  const result = adsMarketingModule.generateUnifiedReport(req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
