import { Router, Request, Response, NextFunction } from "express";
import { campaignSaturationService } from "../services/CampaignSaturationService";
import { AppError } from "../middleware/errorHandler";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/:campaignId", asyncHandler(async (req, res) => {
  const result = campaignSaturationService.analyze(req.params.campaignId, req.user!.tenantId);
  if (!result) throw new AppError(404, "Campaign not found");
  res.json(result);
}));

router.get("/", asyncHandler(async (_req, res) => {
  res.json(campaignSaturationService.analyzeAll(_req.user!.tenantId));
}));

export default router;
