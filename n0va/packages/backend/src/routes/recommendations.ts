import { Router, Request, Response, NextFunction } from "express";
import { recommendationEngine } from "../services/RecommendationEngineService";
import { DataStore } from "../services/DataStore";
import { sendSuccess } from "./route-utils";

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
    const byType = recs.reduce((acc: Record<string, number>, r: any) => { const t = r.type || "general"; acc[t] = (acc[t] || 0) + 1; return acc; }, {} as Record<string, number>);
    const avgImpact = recs.length > 0 ? parseFloat((recs.reduce((s: number, r: any) => s + (r.impact || r.priority || 0), 0) / recs.length).toFixed(1)) : 0;
    sendSuccess(res, recs, { total: recs.length, byType, avgImpact, generatedAt: new Date().toISOString() });
  })
);

router.get(
  "/cross-campaign",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const campaigns = await loadCampaigns(tenantId);
    const recs = recommendationEngine.generateCrossCampaignRecommendations(campaigns);
    sendSuccess(res, recs, { total: recs.length, campaignCount: campaigns.length });
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
    sendSuccess(res, recs, { campaignId: id, campaignName: campaign.name, total: recs.length });
  })
);

router.get(
  "/all",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const campaigns = await loadCampaigns(tenantId);
    const perCampaign = campaigns.flatMap((c) => recommendationEngine.generateCampaignRecommendations(c));
    const crossCampaign = recommendationEngine.generateCrossCampaignRecommendations(campaigns);
    sendSuccess(res, { recommendations: perCampaign, crossCampaign }, { total: perCampaign.length + crossCampaign.length, campaignCount: campaigns.length });
  })
);

export default router;
