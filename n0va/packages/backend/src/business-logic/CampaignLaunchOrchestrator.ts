import { Campaign, ICampaign } from "../models/Campaign";
import { Creative } from "../models/Creative";
import { fraudDetectionService } from "../services/FraudDetectionService";
import { webhookService } from "../services/WebhookService";
import { io } from "../index";

export interface LaunchValidation {
  canLaunch: boolean;
  score: number;
  checks: {
    name: { passed: boolean; reason?: string };
    budget: { passed: boolean; reason?: string; details?: { daily: number; lifetime: number; spent: number } };
    platforms: { passed: boolean; reason?: string; platforms: string[] };
    dates: { passed: boolean; reason?: string; startDate?: Date; endDate?: Date; durationDays?: number };
    creatives: { passed: boolean; reason?: string; count: number; approved: number };
    audiences: { passed: boolean; reason?: string; count: number };
  };
  recommendations: string[];
  estimatedDailyBudget: number;
  estimatedDurationDays: number;
}

export interface LaunchResult {
  campaign: ICampaign;
  validation: LaunchValidation;
  actions: { action: string; status: string; detail?: string }[];
}

export class CampaignLaunchOrchestrator {
  async validate(tenantId: string, campaignData: any, userId: string): Promise<LaunchValidation> {
    const durationDays = campaignData.startDate && campaignData.endDate ? Math.ceil((new Date(campaignData.endDate).getTime() - new Date(campaignData.startDate).getTime()) / 86400000) : undefined;
    const checks = {
      name: { passed: !!campaignData.name && campaignData.name.trim().length > 0, reason: !campaignData.name ? "Campaign name is required" : undefined as string | undefined },
      budget: {
        passed: campaignData.budget?.lifetime > 0,
        reason: !campaignData.budget?.lifetime || campaignData.budget.lifetime <= 0 ? "Lifetime budget must be > 0" : undefined as string | undefined,
        details: { daily: campaignData.budget?.daily || 0, lifetime: campaignData.budget?.lifetime || 0, spent: 0 },
      },
      platforms: {
        passed: Array.isArray(campaignData.platforms) && campaignData.platforms.length > 0,
        reason: !Array.isArray(campaignData.platforms) || campaignData.platforms.length === 0 ? "At least one platform is required" : undefined as string | undefined,
        platforms: campaignData.platforms || [],
      },
      dates: {
        passed: !!campaignData.startDate && !!campaignData.endDate && new Date(campaignData.endDate) > new Date(campaignData.startDate),
        reason: !campaignData.startDate ? "Start date is required" : !campaignData.endDate ? "End date is required" : "End date must be after start date",
        startDate: campaignData.startDate, endDate: campaignData.endDate,
        durationDays,
      },
      creatives: { passed: true, reason: undefined as string | undefined, count: 0, approved: 0 },
      audiences: { passed: true, reason: undefined as string | undefined, count: 0 },
    };

    if (campaignData.creatives && Array.isArray(campaignData.creatives) && campaignData.creatives.length > 0) {
      const creativeDocs = await Creative.find({ _id: { $in: campaignData.creatives }, tenantId: new (require("mongoose").Types.ObjectId)(tenantId) });
      checks.creatives.count = creativeDocs.length;
      checks.creatives.approved = creativeDocs.filter((c: any) => c.status === "approved").length;
      checks.creatives.passed = checks.creatives.count > 0;
      checks.creatives.reason = checks.creatives.count === 0 ? "No valid creatives found" : checks.creatives.approved === 0 && checks.creatives.count > 0 ? `0/${checks.creatives.count} creatives approved` : undefined;
    }

    if (campaignData.audiences && Array.isArray(campaignData.audiences)) {
      checks.audiences.count = campaignData.audiences.length;
      checks.audiences.passed = checks.audiences.count > 0;
      checks.audiences.reason = checks.audiences.count === 0 ? "At least one audience is recommended" : undefined;
    }

    const allPassed = Object.values(checks).every((c: any) => c.passed);
    const passedCount = Object.values(checks).filter((c: any) => c.passed).length;
    const totalChecks = Object.values(checks).length;
    const score = Math.round((passedCount / totalChecks) * 100);

    const recommendations: string[] = [];
    if (!checks.creatives.passed) recommendations.push("Add approved creatives before launch.");
    if (!checks.audiences.passed) recommendations.push("Target at least one audience segment.");
    if (!checks.budget.passed) recommendations.push("Set a lifetime budget greater than 0.");
    if (!checks.dates.passed) recommendations.push("Configure valid start and end dates.");
    if (!checks.platforms.passed) recommendations.push("Select at least one advertising platform.");
    if (checks.creatives.count > 0 && checks.creatives.approved !== checks.creatives.count) recommendations.push(`${checks.creatives.approved}/${checks.creatives.count} creatives approved — ensure all creatives are approved.`);
    if (checks.budget.details && checks.budget.details.lifetime > 0 && durationDays) {
      const dailyBudget = Math.round(checks.budget.details.lifetime / durationDays);
      if (dailyBudget < 10) recommendations.push(`Daily budget of ~$${dailyBudget} may be too low for meaningful delivery.`);
    }

    return { canLaunch: allPassed, score, checks, recommendations, estimatedDailyBudget: 0, estimatedDurationDays: durationDays || 30 };
  }

  async launch(tenantId: string, campaignData: any, userId: string): Promise<LaunchResult> {
    const validation = await this.validate(tenantId, campaignData, userId);
    const actions: { action: string; status: string; detail?: string }[] = [];

    if (!validation.canLaunch) {
      return { campaign: null as any, validation, actions: [{ action: "launch_blocked", status: "failed", detail: `Validation score ${validation.score}% — minimum 100% required` }] };
    }

    const mongoose = require("mongoose");
    const { DataStore } = require("../services/DataStore");
    let campaign: any;

    if (DataStore.usingMemory()) {
      campaign = await DataStore.createCampaign({
        tenantId, name: campaignData.name, type: campaignData.type || "performance", status: "active",
        budget: { daily: campaignData.budget?.daily || 0, lifetime: campaignData.budget?.lifetime || 0, currency: campaignData.budget?.currency || "USD", spent: 0, remaining: campaignData.budget?.lifetime || 0 },
        platforms: campaignData.platforms || [], goal: campaignData.goal, startDate: campaignData.startDate, endDate: campaignData.endDate,
        audiences: campaignData.audiences || [], creatives: campaignData.creatives || [], tags: campaignData.tags || [], kpis: {},
        hyperContext: { linkedTasks: [], linkedDocs: [], linkedSheets: [], linkedCalendar: [] },
        createdBy: userId,
      });
    } else {
      const { campaignService: cs } = require("../services/CampaignService");
      campaign = await cs.create({ tenantId, name: campaignData.name, type: campaignData.type || "performance", budget: campaignData.budget, platforms: campaignData.platforms || [], goal: campaignData.goal, startDate: campaignData.startDate, endDate: campaignData.endDate, createdBy: userId });
    }

    actions.push({ action: "campaign_created", status: "success", detail: `Campaign "${campaign.name}" created and launched.` });
    actions.push({ action: "status_set", status: "success", detail: "Status set to active." });

    try {
      webhookService.emit({ type: "campaign.launched", tenantId, source: "api", payload: { campaignId: campaign._id?.toString() || campaign.id, name: campaign.name, platforms: campaignData.platforms } });
      actions.push({ action: "webhook_emitted", status: "success", detail: "campaign.launched event sent." });
    } catch { actions.push({ action: "webhook_emitted", status: "warning", detail: "Failed to emit webhook." }); }

    try {
      if (io) io.to(`tenant:${tenantId}`).emit("campaign:launched", { campaignId: campaign._id, name: campaign.name });
      actions.push({ action: "socket_emitted", status: "success" });
    } catch { actions.push({ action: "socket_emitted", status: "warning", detail: "Failed to emit socket event." }); }

    if (campaignData.creatives?.length) {
      await Creative.updateMany({ _id: { $in: campaignData.creatives }, tenantId: new mongoose.Types.ObjectId(tenantId) }, { $set: { status: "active" } });
      actions.push({ action: "creatives_activated", status: "success", detail: `${campaignData.creatives.length} creatives set to active.` });
    }

    return { campaign, validation, actions };
  }

  async validateExistingCampaign(campaignId: string, tenantId: string): Promise<LaunchValidation> {
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) throw new Error("Campaign not found");
    return this.validate(tenantId, campaign, campaign.createdBy?.toString() || "");
  }
}

export const campaignLaunchOrchestrator = new CampaignLaunchOrchestrator();
