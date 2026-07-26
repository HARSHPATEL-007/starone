import { Campaign } from "../models/Campaign";
import { Metric } from "../models/Metric";
import { decisionEngine } from "./DecisionEngine";

export interface PacingAlert {
  campaignId: string;
  campaignName: string;
  alertType: "overspend" | "underspend" | "acceleration" | "stall" | "completion_risk";
  severity: "critical" | "warning" | "info";
  message: string;
  currentBurnRate: number;
  recommendedBurnRate: number;
  daysRemaining: number;
}

export interface CampaignPacingDetail {
  campaignId: string;
  campaignName: string;
  status: string;
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  budgetTotal: number;
  budgetSpent: number;
  budgetRemaining: number;
  budgetUtilPct: number;
  timeElapsedPct: number;
  expectedBurnPct: number;
  dailyBudget: number;
  avgDailySpend: number;
  dailySpendTarget: number;
  dailySpendVariance: number;
  fiveDayTrend: ("up" | "down" | "flat")[];
  spendVelocity: number;
  projectedEndSpend: number;
  projectedOverspend: number;
  pacingStatus: "ahead" | "on_track" | "behind" | "critical" | "completed";
}

export interface PacingPortfolioReport {
  generatedAt: string;
  campaigns: CampaignPacingDetail[];
  alerts: PacingAlert[];
  criticalCount: number;
  onTrackCount: number;
  portfolioBurnRate: number;
  portfolioDailyBudget: number;
  recommendations: string[];
}

export class CampaignPacingOrchestrator {
  async analyzeCampaign(campaignId: string, tenantId: string): Promise<CampaignPacingDetail> {
    const mongoose = require("mongoose");
    const cid = new mongoose.Types.ObjectId(campaignId);
    const campaign = await Campaign.findById(cid).lean() as any;
    if (!campaign || campaign.tenantId?.toString() !== tenantId) throw new Error("Campaign not found");

    const metrics = await Metric.find({ campaignId: cid, tenantId: new mongoose.Types.ObjectId(tenantId) }).sort({ date: 1 }).lean() as any[];

    const startDate = campaign.startDate ? new Date(campaign.startDate) : campaign.createdAt ? new Date(campaign.createdAt) : new Date(Date.now() - 30 * 86400000);
    const endDate = campaign.endDate ? new Date(campaign.endDate) : new Date(Date.now() + 30 * 86400000);
    const daysElapsed = Math.max(0, Math.round((Date.now() - startDate.getTime()) / 86400000));
    const daysTotal = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
    const daysRemaining = Math.max(0, daysTotal - daysElapsed);

    const budgetTotal = campaign.budget?.lifetime || campaign.budget || 0;
    const budgetSpent = campaign.budget?.spent || metrics.reduce((s: number, m: any) => s + (m.spend || 0), 0);
    const budgetRemaining = Math.max(0, budgetTotal - budgetSpent);
    const budgetUtilPct = budgetTotal > 0 ? Math.round((budgetSpent / budgetTotal) * 10000) / 100 : 0;
    const timeElapsedPct = Math.min(100, Math.round((daysElapsed / daysTotal) * 10000) / 100);
    const expectedBurnPct = Math.round(timeElapsedPct * 100) / 100;

    const dailyBudget = campaign.budget?.daily || (daysTotal > 0 ? budgetTotal / daysTotal : 0);
    const avgDailySpend = daysElapsed > 0 ? Math.round((budgetSpent / daysElapsed) * 100) / 100 : 0;

    const dailySpends: Record<string, number> = {};
    for (const m of metrics) {
      if (m.date) {
        const d = new Date(m.date).toISOString().slice(0, 10);
        dailySpends[d] = (dailySpends[d] || 0) + (m.spend || 0);
      }
    }
    const sortedDays = Object.keys(dailySpends).sort();
    const recent5 = sortedDays.slice(-5).map(d => dailySpends[d]);
    const fiveDayTrend: ("up" | "down" | "flat")[] = [];
    for (let i = 1; i < recent5.length; i++) {
      if (recent5[i] > recent5[i - 1] * 1.15) fiveDayTrend.push("up");
      else if (recent5[i] < recent5[i - 1] * 0.85) fiveDayTrend.push("down");
      else fiveDayTrend.push("flat");
    }

    const spendVelocity = recent5.length >= 3 ? (recent5[recent5.length - 1] - recent5[0]) / Math.max(1, recent5.length - 1) : 0;
    const projectedEndSpend = avgDailySpend * daysTotal;
    const projectedOverspend = Math.max(0, projectedEndSpend - budgetTotal);
    const dailySpendTarget = daysRemaining > 0 ? budgetRemaining / daysRemaining : budgetRemaining;
    const dailySpendVariance = dailySpendTarget > 0 ? Math.round(((avgDailySpend - dailySpendTarget) / dailySpendTarget) * 10000) / 100 : 0;

    let pacingStatus: "ahead" | "on_track" | "behind" | "critical" | "completed";
    if (budgetUtilPct >= 100 || campaign.status === "completed") pacingStatus = "completed";
    else if (budgetUtilPct > 90 && daysRemaining > 0) pacingStatus = "critical";
    else if (budgetUtilPct - expectedBurnPct > 15) pacingStatus = "ahead";
    else if (expectedBurnPct - budgetUtilPct > 20) pacingStatus = "behind";
    else pacingStatus = "on_track";

    return {
      campaignId, campaignName: campaign.name || campaignId, status: campaign.status || "unknown",
      daysElapsed, daysTotal, daysRemaining, budgetTotal, budgetSpent, budgetRemaining,
      budgetUtilPct, timeElapsedPct, expectedBurnPct, dailyBudget, avgDailySpend,
      dailySpendTarget: Math.round(dailySpendTarget * 100) / 100,
      dailySpendVariance, fiveDayTrend,
      spendVelocity: Math.round(spendVelocity * 100) / 100,
      projectedEndSpend: Math.round(projectedEndSpend * 100) / 100,
      projectedOverspend: Math.round(projectedOverspend * 100) / 100, pacingStatus,
    };
  }

  async analyzePortfolio(tenantId: string): Promise<PacingPortfolioReport> {
    const mongoose = require("mongoose");
    const campaigns = await Campaign.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean() as any[];
    const campaignIds = campaigns.map(c => c._id.toString());

    const results = await Promise.allSettled(campaignIds.map(id => this.analyzeCampaign(id, tenantId)));
    const details = results.filter((r): r is PromiseFulfilledResult<CampaignPacingDetail> => r.status === "fulfilled").map(r => r.value);

    const alerts: PacingAlert[] = [];
    for (const d of details) {
      if (d.pacingStatus === "critical") {
        alerts.push({ campaignId: d.campaignId, campaignName: d.campaignName, alertType: "overspend", severity: "critical", message: `Campaign "${d.campaignName}" has spent ${d.budgetUtilPct}% of budget with ${d.daysRemaining} days remaining.`, currentBurnRate: d.avgDailySpend, recommendedBurnRate: d.dailySpendTarget, daysRemaining: d.daysRemaining });
      }
      if (d.pacingStatus === "behind") {
        alerts.push({ campaignId: d.campaignId, campaignName: d.campaignName, alertType: "underspend", severity: "warning", message: `Campaign "${d.campaignName}" is underspending (${d.budgetUtilPct}% spent vs ${d.timeElapsedPct}% time elapsed).`, currentBurnRate: d.avgDailySpend, recommendedBurnRate: d.dailySpendTarget, daysRemaining: d.daysRemaining });
      }
      if (d.fiveDayTrend.filter(t => t === "up").length >= 3 && d.daysRemaining > 0) {
        alerts.push({ campaignId: d.campaignId, campaignName: d.campaignName, alertType: "acceleration", severity: "info", message: `Spend accelerating — 3 of last 5 days trending up. May overshoot budget.`, currentBurnRate: d.avgDailySpend, recommendedBurnRate: d.dailySpendTarget, daysRemaining: d.daysRemaining });
      }
      if (d.fiveDayTrend.filter(t => t === "down").length >= 4 && d.daysRemaining > 0 && d.budgetRemaining > 0) {
        alerts.push({ campaignId: d.campaignId, campaignName: d.campaignName, alertType: "stall", severity: "warning", message: `Spend stalling — 4 of last 5 days trending down. Check delivery issues.`, currentBurnRate: d.avgDailySpend, recommendedBurnRate: d.dailySpendTarget, daysRemaining: d.daysRemaining });
      }
    }

    alerts.sort((a, b) => ({ critical: 3, warning: 2, info: 1 }[a.severity]) - ({ critical: 3, warning: 2, info: 1 }[b.severity]));
    const criticalCount = alerts.filter(a => a.severity === "critical").length;
    const onTrackCount = details.filter(d => d.pacingStatus === "on_track").length;
    const portfolioBurnRate = details.reduce((s, d) => s + d.avgDailySpend, 0);
    const portfolioDailyBudget = details.reduce((s, d) => s + d.dailyBudget, 0);
    const totalBudgetRemaining = details.reduce((s, d) => s + d.budgetRemaining, 0);

    const recommendations: string[] = [];
    if (criticalCount > 0) recommendations.push(`${criticalCount} campaign(s) at critical pacing — immediate budget review needed.`);
    const behind = details.filter(d => d.pacingStatus === "behind");
    if (behind.length > 0) recommendations.push(`${behind.length} campaign(s) behind pace. Consider accelerating spend or reallocating budget.`);
    if (portfolioBurnRate > portfolioDailyBudget * 1.1) recommendations.push("Portfolio burning above daily budget. Reduce spend across non-critical campaigns.");
    else if (portfolioBurnRate < portfolioDailyBudget * 0.8) recommendations.push("Portfolio burning below daily budget. Under-delivering — check campaign activation.");
    const trackPct = details.length > 0 ? Math.round((onTrackCount / details.length) * 100) : 0;
    recommendations.push(`${onTrackCount}/${details.length} campaigns on track (${trackPct}%). Total remaining budget: $${Math.round(totalBudgetRemaining).toLocaleString()}.`);

    return {
      generatedAt: new Date().toISOString(), campaigns: details, alerts,
      criticalCount, onTrackCount, portfolioBurnRate: Math.round(portfolioBurnRate * 100) / 100,
      portfolioDailyBudget, recommendations,
    };
  }
}

export const campaignPacingOrchestrator = new CampaignPacingOrchestrator();
