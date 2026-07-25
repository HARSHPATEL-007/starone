import { Router, Request, Response, NextFunction } from "express";
import { influencerService } from "../services/InfluencerService";
import { AppError } from "../middleware/errorHandler";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/platforms", asyncHandler(async (_req, res) => res.json(influencerService.getPlatforms())));
router.get("/search", asyncHandler(async (req, res) => { const { category, platform, minFollowers, maxPrice, location } = req.query; res.json(influencerService.search({ category: category as string, platform: platform as string, minFollowers: minFollowers ? Number(minFollowers) : undefined, maxPrice: maxPrice ? Number(maxPrice) : undefined, location: location as string })); }));
router.get("/campaign-list", asyncHandler(async (req, res) => res.json(influencerService.getAllCampaignInfluencers(req.user!.tenantId))));
router.get("/campaign/:campaignId", asyncHandler(async (req, res) => res.json(influencerService.getCampaignInfluencers(req.params.campaignId))));
router.post("/campaign", asyncHandler(async (req, res) => { const { campaignId, influencerId, influencerName, influencerHandle, platform, deliverables, compensation } = req.body; if (!campaignId || !influencerId) throw new AppError(400, "Missing required fields"); res.status(201).json(influencerService.addToCampaign(req.user!.tenantId, { campaignId, influencerId, influencerName, influencerHandle, platform, deliverables, compensation })); }));
router.patch("/campaign/:id", asyncHandler(async (req, res) => { const { status, performance } = req.body; const ci = influencerService.updateInfluencerStatus(req.user!.tenantId, req.params.id, status, performance); if (!ci) throw new AppError(404, "Campaign influencer not found"); res.json(ci); }));

export default router;
