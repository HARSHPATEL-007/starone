import { Router, Request, Response, NextFunction } from "express";
import { campaignScorecardService } from "../services/CampaignScorecardService";
import { AppError } from "../middleware/errorHandler";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/", asyncHandler(async (req, res) => { const { campaignId } = req.query; res.json(campaignScorecardService.getScorecard(req.user!.tenantId, campaignId as string)); }));
router.post("/weights", asyncHandler(async (req, res) => { campaignScorecardService.setWeights(req.body); res.json({ ok: true }); }));

export default router;
