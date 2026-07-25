import { Router, Request, Response, NextFunction } from "express";
import { recommendationEngine } from "../services/RecommendationEngineService";
import { DataStore } from "../services/DataStore";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

async function loadCampaigns(tenantId: string) {
  const result = await DataStore.findCampaigns({ tenantId }, { createdAt: -1 }, 0, 100);
  const campaigns = ("campaigns" in result ? (result as any).campaigns : result) as any[];
  const metrics = await DataStore.findMetrics({ tenantId });
  return campaigns.map((c: any) => ({
    ...c,
    metrics: (metrics as any[]).find((m: any) => m.campaignId === c._id || m.campaignId === c.id),
  }));
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const campaigns = await loadCampaigns(tenantId);
    const recs = campaigns.flatMap((c) => recommendationEngine.generateCampaignRecommendations(c));
    res.json(recs);
  })
);

router.get(
  "/cross-campaign",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const campaigns = await loadCampaigns(tenantId);
    const recs = recommendationEngine.generateCrossCampaignRecommendations(campaigns);
    res.json(recs);
  })
);

router.get(
  "/campaign/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const campaign = await DataStore.findCampaignById(id, tenantId) as any;
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    const metrics = (await DataStore.findMetrics({ tenantId, campaignId: id })) as any[];
    const full = { ...campaign, metrics: metrics && metrics[0] ? metrics[0] : undefined };
    const recs = recommendationEngine.generateCampaignRecommendations(full);
    res.json(recs);
  })
);

router.get(
  "/all",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const campaigns = await loadCampaigns(tenantId);
    const perCampaign = campaigns.flatMap((c) => recommendationEngine.generateCampaignRecommendations(c));
    const crossCampaign = recommendationEngine.generateCrossCampaignRecommendations(campaigns);
    res.json({ recommendations: perCampaign, crossCampaign, total: perCampaign.length + crossCampaign.length });
  })
);

export default router;
