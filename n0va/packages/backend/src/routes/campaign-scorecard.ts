import { Router, Request, Response, NextFunction } from "express";
import { campaignScorecardService } from "../services/CampaignScorecardService";
import { campaignScorecardOrchestrator } from "../business-logic/CampaignScorecardOrchestrator";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "./route-utils";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/", asyncHandler(async (req, res) => {
  const { campaignId } = req.query;
  const scorecard = campaignScorecardService.getScorecard(req.user!.tenantId, campaignId as string);
  const meta: Record<string, unknown> = {};
  if (scorecard && typeof scorecard === "object") {
    const sc = scorecard as any;
    if (sc.overallScore !== undefined) meta.overallScore = sc.overallScore;
    if (sc.campaignName) meta.campaignName = sc.campaignName;
  }
  sendSuccess(res, scorecard, Object.keys(meta).length > 0 ? meta : undefined);
}));

router.post("/weights", asyncHandler(async (req, res) => {
  campaignScorecardService.setWeights(req.body);
  sendSuccess(res, { ok: true });
}));

router.get("/orchestrate", asyncHandler(async (req, res) => {
  const report = campaignScorecardOrchestrator.analyze(req.user!.tenantId);
  sendSuccess(res, report);
}));

export default router;
