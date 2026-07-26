import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { fraudDetectionService } from "../services/FraudDetectionService";
import { FraudFlag } from "../models/FraudFlag";
import { sendSuccess } from "./route-utils";

const router = Router();

function isConnected(): boolean { return mongoose.connection.readyState === 1; }
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/health",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (isConnected()) {
      const allFlags = await FraudFlag.find({ tenantId }).lean();
      const totalFlags = allFlags.length;
      const activeFlags = allFlags.filter((f: any) => !f.resolvedAt).length;
      const autoPaused = allFlags.filter((f: any) => f.autoPaused).length;
      const criticalFlags = allFlags.filter((f: any) => f.severity === "critical").length;
      const highFlags = allFlags.filter((f: any) => f.severity === "high").length;
      const mediumFlags = allFlags.filter((f: any) => f.severity === "medium").length;
      const lowFlags = allFlags.filter((f: any) => f.severity === "low").length;
      const categoryCount: Record<string, number> = {};
      const platformRisk: Record<string, number> = {};
      for (const f of allFlags) { categoryCount[(f as any).category] = (categoryCount[(f as any).category] || 0) + 1; platformRisk[(f as any).platform] = (platformRisk[(f as any).platform] || 0) + 1; }
      const resolutionRate = totalFlags > 0 ? parseFloat((((totalFlags - activeFlags) / totalFlags) * 100).toFixed(1)) : 0;
      return sendSuccess(res, { totalFlags, activeFlags, autoPaused, criticalFlags, highFlags, mediumFlags, lowFlags, resolutionRate, topCategories: Object.entries(categoryCount).sort(([, a], [, b]) => b - a).slice(0, 5).map(([category, count]) => ({ category, count })), riskByPlatform: Object.entries(platformRisk).map(([platform, count]) => ({ platform, count })).sort((a, b) => b.count - a.count) });
    }
    const summary = fraudDetectionService.getHealthSummary();
    sendSuccess(res, summary);
  })
);

router.post(
  "/evaluate",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { placementId, platform, metrics, campaignId } = req.body;
    if (!placementId || !platform || !metrics) return res.status(400).json({ error: "Missing required fields: placementId, platform, metrics" });
    const result = fraudDetectionService.evaluatePlacement(placementId, platform, metrics, campaignId);
    if (isConnected() && result.flags.length > 0) { await FraudFlag.insertMany(result.flags.map((f: any) => ({ tenantId, campaignId: f.campaignId, platform: f.platform, placementId: f.placementId, category: f.category, severity: f.severity, score: f.score, description: f.description, details: f.details, detectedAt: f.detectedAt, autoPaused: f.autoPaused }))); }
    const totalScore = result.flags.reduce((s: number, f: any) => s + f.score, 0);
    const avgSeverity = result.flags.length > 0 ? parseFloat((totalScore / result.flags.length).toFixed(2)) : 0;
    sendSuccess(res, result, { flagCount: result.flags.length, avgSeverity, hasCritical: result.flags.some((f: any) => f.severity === "critical") });
  })
);

router.get(
  "/flags/:campaignId",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { campaignId } = req.params;
    if (isConnected()) { const flags = await FraudFlag.find({ tenantId, campaignId }).sort({ detectedAt: -1 }).lean(); return sendSuccess(res, flags, { campaignId, count: flags.length }); }
    const flags = fraudDetectionService.getCampaignFlags(campaignId);
    sendSuccess(res, flags, { campaignId, count: flags.length });
  })
);

router.get(
  "/flags",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { campaignId, severity } = req.query;
    if (isConnected()) {
      const query: any = { tenantId };
      if (campaignId) query.campaignId = campaignId;
      if (severity) query.severity = severity;
      const flags = await FraudFlag.find(query).sort({ detectedAt: -1 }).limit(200).lean();
      const activeCount = flags.filter((f: any) => !f.resolvedAt).length;
      return sendSuccess(res, flags, { total: flags.length, activeCount, severityBreakdown: flags.reduce((acc: Record<string, number>, f: any) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, {}) });
    }
    sendSuccess(res, []);
  })
);

router.post(
  "/flags/:flagId/resolve",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { flagId } = req.params;
    if (isConnected()) {
      const result = await FraudFlag.findOneAndUpdate({ _id: flagId, tenantId }, { $set: { resolvedAt: new Date() } }, { new: true });
      if (!result) return res.status(404).json({ error: "Flag not found" });
      return sendSuccess(res, { success: true, flagId, resolvedAt: result.resolvedAt });
    }
    const resolved = fraudDetectionService.resolveFlag(flagId);
    if (!resolved) return res.status(404).json({ error: "Flag not found" });
    sendSuccess(res, { success: true, flagId });
  })
);

router.post(
  "/sample",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { campaignId } = req.body;
    const flag = fraudDetectionService.generateSampleAlert(campaignId);
    if (isConnected()) { await FraudFlag.create({ tenantId, campaignId: flag.campaignId, platform: flag.platform, placementId: flag.placementId, category: flag.category, severity: flag.severity, score: flag.score, description: flag.description, details: flag.details, detectedAt: flag.detectedAt, autoPaused: flag.autoPaused }); }
    sendSuccess(res, flag, { generated: true });
  })
);

router.post(
  "/simulate",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const placements = [
      { placementId: "pl_news_site_a", platform: "meta", metrics: { ivtPercent: 85, viewabilityPercent: 45, brandSafetyScore: 92, botProbability: 0.7, clickVelocity: 35 }, campaignId: "camp_001" },
      { placementId: "pl_blog_network_b", platform: "google", metrics: { ivtPercent: 15, viewabilityPercent: 78, brandSafetyScore: 95, botProbability: 0.1, clickVelocity: 3 }, campaignId: "camp_001" },
      { placementId: "pl_news_site_c", platform: "meta", metrics: { ivtPercent: 92, viewabilityPercent: 30, brandSafetyScore: 45, botProbability: 0.85, clickVelocity: 70 }, campaignId: "camp_001" },
      { placementId: "pl_forum_d", platform: "linkedin", metrics: { ivtPercent: 5, viewabilityPercent: 92, brandSafetyScore: 88, botProbability: 0.05, clickVelocity: 1 }, campaignId: "camp_002" },
      { placementId: "pl_video_network_e", platform: "tiktok", metrics: { ivtPercent: 45, viewabilityPercent: 62, brandSafetyScore: 72, botProbability: 0.3, clickVelocity: 12 }, campaignId: "camp_002" },
    ];
    const results = placements.map((p) => fraudDetectionService.evaluatePlacement(p.placementId, p.platform, p.metrics, p.campaignId));
    if (isConnected()) {
      const allFlags = results.flatMap((r) => r.flags);
      if (allFlags.length > 0) { await FraudFlag.insertMany(allFlags.map((f: any) => ({ tenantId, campaignId: f.campaignId, platform: f.platform, placementId: f.placementId, category: f.category, severity: f.severity, score: f.score, description: f.description, details: f.details, detectedAt: f.detectedAt, autoPaused: f.autoPaused }))); }
    }
    const totalFlagged = results.filter(r => r.flags.length > 0).length;
    const totalFlags = results.reduce((s, r) => s + r.flags.length, 0);
    sendSuccess(res, { evaluated: results.length, placements: results, summary: fraudDetectionService.getHealthSummary() }, { totalFlagged, totalFlags, flagRate: parseFloat(((totalFlags / (results.length * 5)) * 100).toFixed(1)) });
  })
);

export default router;
