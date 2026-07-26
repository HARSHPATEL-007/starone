import { Campaign } from "../models/Campaign";

export interface BudgetAlert {
  campaignId: string;
  name: string;
  severity: "critical" | "warning" | "info";
  utilization: number;
  remaining: number;
  dailyBurnRate: number;
  daysRemaining: number;
  message: string;
  action: string;
}

export interface BudgetMonitorReport {
  generatedAt: string;
  totalCampaigns: number;
  alerts: BudgetAlert[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  portfolioUtilization: number;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  projectedOverspendCount: number;
}

export class BudgetAlertOrchestrator {
  async monitor(tenantId: string): Promise<BudgetMonitorReport> {
    const mongoose = require("mongoose");
    const campaigns = await Campaign.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
    const now = Date.now();
    const alerts: BudgetAlert[] = [];
    let projectedOverspend = 0;

    for (const c of campaigns) {
      const campaign = c as any;
      const budget = campaign.budget || {};
      const lifetime = budget.lifetime || 0;
      const spent = budget.spent || 0;
      const remaining = Math.max(0, lifetime - spent);
      const utilization = lifetime > 0 ? Math.round((spent / lifetime) * 10000) / 100 : 0;

      const startTime = campaign.startDate ? new Date(campaign.startDate).getTime() : campaign.createdAt ? new Date(campaign.createdAt).getTime() : now;
      const daysElapsed = Math.max(1, (now - startTime) / 86400000);
      const dailyBurnRate = Math.round((spent / daysElapsed) * 100) / 100;

      const endTime = campaign.endDate ? new Date(campaign.endDate).getTime() : now + 30 * 86400000;
      const daysRemaining = Math.max(0, Math.round((endTime - now) / 86400000));
      const projectedBurn = dailyBurnRate * (daysRemaining || 30);
      const willOverspend = projectedBurn > remaining && remaining > 0;

      if (willOverspend) projectedOverspend++;

      if (utilization >= 95 || (spent > lifetime && lifetime > 0)) {
        alerts.push({ campaignId: (campaign._id?.toString() || campaign.id), name: campaign.name || "Unnamed", severity: "critical", utilization, remaining, dailyBurnRate, daysRemaining, message: `Budget critically exhausted (${utilization}% used).`, action: "Increase budget immediately or pause campaign." });
      } else if (utilization >= 80) {
        alerts.push({ campaignId: (campaign._id?.toString() || campaign.id), name: campaign.name || "Unnamed", severity: "warning", utilization, remaining, dailyBurnRate, daysRemaining, message: `Budget nearly exhausted (${utilization}% used). ${daysRemaining} days remaining at $${dailyBurnRate}/day.`, action: "Consider increasing budget or reducing daily spend." });
      } else if (willOverspend && utilization >= 60) {
        alerts.push({ campaignId: (campaign._id?.toString() || campaign.id), name: campaign.name || "Unnamed", severity: "warning", utilization, remaining, dailyBurnRate, daysRemaining, message: `Projected to overspend by $${Math.round(projectedBurn - remaining)} before end date.`, action: "Reduce daily budget or increase lifetime budget." });
      } else if (utilization >= 50 && daysRemaining <= Math.round(daysElapsed * 0.5)) {
        alerts.push({ campaignId: (campaign._id?.toString() || campaign.id), name: campaign.name || "Unnamed", severity: "info", utilization, remaining, dailyBurnRate, daysRemaining, message: `Mid-budget checkpoint: ${utilization}% used with ${daysRemaining} days remaining.`, action: "Monitor pacing — on track." });
      } else if (campaign.status === "active" && spent === 0 && lifetime > 0 && daysElapsed > 3) {
        alerts.push({ campaignId: (campaign._id?.toString() || campaign.id), name: campaign.name || "Unnamed", severity: "warning", utilization: 0, remaining: lifetime, dailyBurnRate: 0, daysRemaining, message: "Active campaign with zero spend after 3+ days.", action: "Check platform connection, creative approval, and targeting." });
      }
    }

    const totalBudget = campaigns.reduce((s: number, c: any) => s + (c.budget?.lifetime || 0), 0);
    const totalSpent = campaigns.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0);

    return {
      generatedAt: new Date().toISOString(), totalCampaigns: campaigns.length, alerts,
      criticalCount: alerts.filter(a => a.severity === "critical").length,
      warningCount: alerts.filter(a => a.severity === "warning").length,
      infoCount: alerts.filter(a => a.severity === "info").length,
      portfolioUtilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 10000) / 100 : 0,
      totalBudget, totalSpent, totalRemaining: Math.max(0, totalBudget - totalSpent),
      projectedOverspendCount: projectedOverspend,
    };
  }

  async getCriticalAlerts(tenantId: string): Promise<BudgetAlert[]> {
    const report = await this.monitor(tenantId);
    return report.alerts.filter(a => a.severity === "critical" || a.severity === "warning").sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return (order[a.severity] || 3) - (order[b.severity] || 3);
    });
  }
}

export const budgetAlertOrchestrator = new BudgetAlertOrchestrator();
