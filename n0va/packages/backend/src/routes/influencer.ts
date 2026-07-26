import { Router, Request, Response, NextFunction } from "express";
import { influencerService } from "../services/InfluencerService";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "./route-utils";
import { influencerROIOrchestrator } from "../business-logic/InfluencerROIOrchestrator";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/platforms", asyncHandler(async (_req, res) => {
  const platforms = influencerService.getPlatforms();
  sendSuccess(res, platforms, { count: platforms.length });
}));

router.get("/search", asyncHandler(async (req, res) => {
  const { category, platform, minFollowers, maxPrice, location } = req.query;
  const results = influencerService.search({
    category: category as string, platform: platform as string,
    minFollowers: minFollowers ? Number(minFollowers) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    location: location as string,
  });
  sendSuccess(res, results, { count: results.length, query: { category, platform, minFollowers, maxPrice, location } });
}));

router.get("/campaign-list", asyncHandler(async (req, res) => {
  const list = influencerService.getAllCampaignInfluencers(req.user!.tenantId);
  sendSuccess(res, list, { count: list.length });
}));

router.get("/campaign/:campaignId", asyncHandler(async (req, res) => {
  const infs = influencerService.getCampaignInfluencers(req.params.campaignId);
  sendSuccess(res, infs, { campaignId: req.params.campaignId, count: infs.length });
}));

router.post("/campaign", asyncHandler(async (req, res) => {
  const { campaignId, influencerId, influencerName, influencerHandle, platform, deliverables, compensation } = req.body;
  if (!campaignId || !influencerId) throw new AppError(400, "Missing required fields");
  const result = influencerService.addToCampaign(req.user!.tenantId, { campaignId, influencerId, influencerName, influencerHandle, platform, deliverables, compensation });
  sendSuccess(res, result, { action: "added" });
}));

router.patch("/campaign/:id", asyncHandler(async (req, res) => {
  const { status, performance } = req.body;
  const ci = influencerService.updateInfluencerStatus(req.user!.tenantId, req.params.id, status, performance);
  if (!ci) throw new AppError(404, "Campaign influencer not found");
  sendSuccess(res, ci, { action: "updated" });
}));

router.get(
  "/roi/report",
  asyncHandler(async (req: Request, res: Response) => {
    const report = await influencerROIOrchestrator.analyze(req.user!.tenantId);
    sendSuccess(res, report);
  })
);

export default router;
