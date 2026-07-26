import { Router, Request, Response, NextFunction } from "express";
import { campaignSaturationService } from "../services/CampaignSaturationService";
import { campaignSaturationOrchestrator } from "../business-logic/CampaignSaturationOrchestrator";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "./route-utils";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/:campaignId", asyncHandler(async (req, res) => {
  const result = campaignSaturationService.analyze(req.params.campaignId, req.user!.tenantId);
  if (!result) throw new AppError(404, "Campaign not found");
  sendSuccess(res, result);
}));

router.get("/", asyncHandler(async (req, res) => {
  const results = campaignSaturationService.analyzeAll(req.user!.tenantId);
  const arr = Array.isArray(results) ? results : [];
  const meta: Record<string, unknown> = { totalCampaigns: arr.length };
  const withDiminishingReturns = arr.filter((r: any) => r && (r.diminishingReturns || r.saturationScore > 70));
  if (withDiminishingReturns.length > 0) meta.campaignsWithDiminishingReturns = withDiminishingReturns.length;
  const avgSaturation = arr.length > 0 ? Math.round(arr.reduce((s: number, r: any) => s + (r.saturationScore || 0), 0) / arr.length * 100) / 100 : 0;
  meta.avgSaturationScore = avgSaturation;
  sendSuccess(res, arr, meta);
}));

router.get("/portfolio/intelligence", asyncHandler(async (req, res) => {
  const report = campaignSaturationOrchestrator.analyzePortfolio(req.user!.tenantId);
  sendSuccess(res, report);
}));

export default router;
