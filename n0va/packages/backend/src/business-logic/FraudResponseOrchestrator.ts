import { Campaign } from "../models/Campaign";
import { FraudFlag, IFraudFlag } from "../models/FraudFlag";
import { fraudDetectionService } from "../services/FraudDetectionService";
import { webhookService } from "../services/WebhookService";
import { io } from "../index";

export interface FraudAction {
  type: "flag_created" | "auto_pause" | "alert_sent" | "escalation";
  detail: string;
  status: "success" | "skipped" | "failed";
  timestamp: string;
}

export interface FraudResponseResult {
  placementId: string;
  campaignId: string;
  platform: string;
  flags: IFraudFlag[];
  riskScore: number;
  actions: FraudAction[];
  requiresHumanReview: boolean;
}

export class FraudResponseOrchestrator {
  async evaluateAndRespond(
    tenantId: string,
    placementId: string,
    platform: string,
    metrics: any,
    campaignId: string
  ): Promise<FraudResponseResult> {
    const actions: FraudAction[] = [];
    const result = fraudDetectionService.evaluatePlacement(placementId, platform, metrics, campaignId);
    const riskScore = result.flags.reduce((s: number, f: any) => s + f.score, 0) / Math.max(1, result.flags.length);
    const maxSeverity = result.flags.reduce((max: string, f: any) => {
      const order: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
      return (order[f.severity] || 0) > (order[max] || 0) ? f.severity : max;
    }, "low");

    if (result.flags.length > 0) {
      try {
        await FraudFlag.insertMany(result.flags.map((f: any) => ({ tenantId, campaignId, platform, placementId, category: f.category, severity: f.severity, score: f.score, description: f.description, details: f.details, detectedAt: f.detectedAt || new Date(), autoPaused: f.autoPaused || false })));
        actions.push({ type: "flag_created", detail: `${result.flags.length} fraud flag(s) created.`, status: "success", timestamp: new Date().toISOString() });
      } catch {
        actions.push({ type: "flag_created", detail: "Failed to persist fraud flags.", status: "failed", timestamp: new Date().toISOString() });
      }
    }

    const shouldAutoPause = result.flags.some((f: any) => f.autoPaused || f.severity === "critical") || riskScore > 70;
    if (shouldAutoPause) {
      try {
        const mongoose = require("mongoose");
        await Campaign.findByIdAndUpdate(new mongoose.Types.ObjectId(campaignId), { $set: { status: "paused" } });
        actions.push({ type: "auto_pause", detail: `Campaign ${campaignId} auto-paused due to high fraud risk (score: ${riskScore.toFixed(1)}).`, status: "success", timestamp: new Date().toISOString() });
      } catch {
        actions.push({ type: "auto_pause", detail: "Failed to auto-pause campaign.", status: "failed", timestamp: new Date().toISOString() });
      }
    }

    try {
      webhookService.emit({ type: "fraud.detected", tenantId, source: "system", payload: { placementId, campaignId, platform, flagCount: result.flags.length, riskScore: Math.round(riskScore), maxSeverity, actions: actions.filter(a => a.status === "success").map(a => a.type) } });
      actions.push({ type: "alert_sent", detail: `Fraud alert sent for ${placementId}.`, status: "success", timestamp: new Date().toISOString() });
    } catch {
      actions.push({ type: "alert_sent", detail: "Failed to send fraud alert.", status: "failed", timestamp: new Date().toISOString() });
    }

    if (io) {
      try { io.to(`tenant:${tenantId}`).emit("fraud:detected", { placementId, campaignId, platform, riskScore, maxSeverity, flagCount: result.flags.length }); } catch {}
    }

    const requiresHumanReview = maxSeverity === "critical" || result.flags.filter((f: any) => f.severity === "high").length >= 2;
    if (requiresHumanReview) {
      actions.push({ type: "escalation", detail: "Critical/high fraud flags require human review.", status: "success", timestamp: new Date().toISOString() });
    }

    return { placementId, campaignId, platform, flags: result.flags as any, riskScore, actions, requiresHumanReview };
  }

  async batchEvaluate(tenantId: string, placements: { placementId: string; platform: string; metrics: any; campaignId: string }[]): Promise<FraudResponseResult[]> {
    return Promise.all(placements.map(p => this.evaluateAndRespond(tenantId, p.placementId, p.platform, p.metrics, p.campaignId)));
  }

  async getPendingReviews(tenantId: string): Promise<IFraudFlag[]> {
    const flags = await FraudFlag.find({
      tenantId,
      resolvedAt: null,
      severity: { $in: ["critical", "high"] },
    }).sort({ detectedAt: -1 }).lean();
    return flags as any;
  }
}

export const fraudResponseOrchestrator = new FraudResponseOrchestrator();
