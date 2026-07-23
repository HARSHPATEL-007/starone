import { Router, Request, Response, NextFunction } from "express";
import { fraudDetectionService } from "../services/FraudDetectionService";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/health",
  asyncHandler(async (_req: Request, res: Response) => {
    const summary = fraudDetectionService.getHealthSummary();
    res.json(summary);
  })
);

router.post(
  "/evaluate",
  asyncHandler(async (req: Request, res: Response) => {
    const { placementId, platform, metrics, campaignId } = req.body;
    if (!placementId || !platform || !metrics) {
      res.status(400).json({ error: "Missing required fields: placementId, platform, metrics" });
      return;
    }
    const result = fraudDetectionService.evaluatePlacement(placementId, platform, metrics, campaignId);
    res.json(result);
  })
);

router.get(
  "/flags/:campaignId",
  asyncHandler(async (req: Request, res: Response) => {
    const { campaignId } = req.params;
    const flags = fraudDetectionService.getCampaignFlags(campaignId);
    res.json(flags);
  })
);

router.post(
  "/flags/:flagId/resolve",
  asyncHandler(async (req: Request, res: Response) => {
    const { flagId } = req.params;
    const resolved = fraudDetectionService.resolveFlag(flagId);
    if (!resolved) {
      res.status(404).json({ error: "Flag not found" });
      return;
    }
    res.json({ success: true, flagId });
  })
);

router.post(
  "/sample",
  asyncHandler(async (req: Request, res: Response) => {
    const { campaignId } = req.body;
    const flag = fraudDetectionService.generateSampleAlert(campaignId);
    res.json(flag);
  })
);

router.post(
  "/simulate",
  asyncHandler(async (_req: Request, res: Response) => {
    const placements = [
      { placementId: "pl_news_site_a", platform: "meta", metrics: { ivtPercent: 85, viewabilityPercent: 45, brandSafetyScore: 92, botProbability: 0.7, clickVelocity: 35 }, campaignId: "camp_001" },
      { placementId: "pl_blog_network_b", platform: "google", metrics: { ivtPercent: 15, viewabilityPercent: 78, brandSafetyScore: 95, botProbability: 0.1, clickVelocity: 3 }, campaignId: "camp_001" },
      { placementId: "pl_news_site_c", platform: "meta", metrics: { ivtPercent: 92, viewabilityPercent: 30, brandSafetyScore: 45, botProbability: 0.85, clickVelocity: 70 }, campaignId: "camp_001" },
      { placementId: "pl_forum_d", platform: "linkedin", metrics: { ivtPercent: 5, viewabilityPercent: 92, brandSafetyScore: 88, botProbability: 0.05, clickVelocity: 1 }, campaignId: "camp_002" },
      { placementId: "pl_video_network_e", platform: "tiktok", metrics: { ivtPercent: 45, viewabilityPercent: 62, brandSafetyScore: 72, botProbability: 0.3, clickVelocity: 12 }, campaignId: "camp_002" },
    ];
    const results = placements.map((p) => fraudDetectionService.evaluatePlacement(p.placementId, p.platform, p.metrics, p.campaignId));
    res.json({ evaluated: results.length, placements: results, summary: fraudDetectionService.getHealthSummary() });
  })
);

export default router;
