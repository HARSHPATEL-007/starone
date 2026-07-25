interface CampaignWithMetrics {
  id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
  budget: { daily: number; lifetime: number; spent: number; remaining: number; currency: string };
  metrics?: { spend: number; impressions: number; clicks: number; conversions: number; revenue: number };
}

interface PacingResult {
  campaignId: string;
  campaignName: string;
  status: string;
  pacing: {
    timeElapsedPercent: number;
    budgetUsedPercent: number;
    budgetUsed: number;
    budgetTotal: number;
    budgetRemaining: number;
    dailyBudget: number;
    daysElapsed: number;
    daysTotal: number;
    daysRemaining: number;
    avgDailySpend: number;
    projectedEndSpend: number;
    projectedEndVsBudget: "under" | "on_track" | "over";
    projectedOverspend: number;
    dailySpendTarget: number;
    dailySpendVariance: number;
    status: "ahead" | "on_track" | "behind" | "critical" | "completed";
    spendVelocity: number;
  };
}

export class BudgetPacingService {
  calculatePacing(campaign: CampaignWithMetrics): PacingResult | null {
    const now = Date.now();
    const start = campaign.startDate ? new Date(campaign.startDate).getTime() : now - 30 * 86400000;
    const end = campaign.endDate ? new Date(campaign.endDate).getTime() : now + 30 * 86400000;

    if (now < start) return null;

    const daysTotal = Math.max(1, (end - start) / 86400000);
    const daysElapsed = Math.max(0, Math.min(daysTotal, (now - start) / 86400000));
    const daysRemaining = Math.max(0, daysTotal - daysElapsed);
    const timeElapsedPercent = Math.min(100, (daysElapsed / daysTotal) * 100);

    const lifetimeBudget = campaign.budget.lifetime || campaign.budget.daily * daysTotal;
    const budgetUsed = campaign.budget.spent || 0;
    const budgetRemaining = Math.max(0, lifetimeBudget - budgetUsed);
    const budgetUsedPercent = lifetimeBudget > 0 ? (budgetUsed / lifetimeBudget) * 100 : 0;

    const dailyBudget = campaign.budget.daily || lifetimeBudget / daysTotal;
    const dailySpendTarget = daysElapsed > 0 ? (lifetimeBudget / daysTotal) * daysElapsed : 0;
    const avgDailySpend = daysElapsed > 0 ? budgetUsed / daysElapsed : 0;
    const dailySpendVariance = dailySpendTarget > 0 ? ((budgetUsed - dailySpendTarget) / dailySpendTarget) * 100 : 0;

    const projectedEndSpend = avgDailySpend * daysTotal;
    const projectedEndVsBudget = projectedEndSpend <= lifetimeBudget * 1.05 ? (projectedEndSpend >= lifetimeBudget * 0.95 ? "on_track" : "under") : "over";
    const projectedOverspend = Math.max(0, projectedEndSpend - lifetimeBudget);

    const spendVelocity = campaign.metrics?.spend && campaign.metrics.spend > 0
      ? campaign.metrics.spend / daysElapsed
      : avgDailySpend;

    let status: PacingResult["pacing"]["status"];
    const diff = budgetUsedPercent - timeElapsedPercent;
    if (budgetUsedPercent >= 100 && timeElapsedPercent < 95) status = "critical";
    else if (diff > 15) status = "ahead";
    else if (diff < -15) status = "behind";
    else if (timeElapsedPercent >= 98 && budgetUsedPercent >= 98) status = "completed";
    else status = "on_track";

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      pacing: {
        timeElapsedPercent: Math.round(timeElapsedPercent * 10) / 10,
        budgetUsedPercent: Math.round(budgetUsedPercent * 10) / 10,
        budgetUsed,
        budgetTotal: lifetimeBudget,
        budgetRemaining,
        dailyBudget,
        daysElapsed: Math.round(daysElapsed),
        daysTotal: Math.round(daysTotal),
        daysRemaining: Math.round(daysRemaining),
        avgDailySpend: Math.round(avgDailySpend * 100) / 100,
        projectedEndSpend: Math.round(projectedEndSpend * 100) / 100,
        projectedEndVsBudget,
        projectedOverspend: Math.round(projectedOverspend * 100) / 100,
        dailySpendTarget: Math.round(dailySpendTarget * 100) / 100,
        dailySpendVariance: Math.round(dailySpendVariance * 10) / 10,
        status,
        spendVelocity: Math.round(spendVelocity * 100) / 100,
      },
    };
  }

  calculateAll(campaigns: CampaignWithMetrics[]): PacingResult[] {
    return campaigns.map((c) => this.calculatePacing(c)).filter(Boolean) as PacingResult[];
  }

  getSummary(pacingResults: PacingResult[]): {
    total: number; onTrack: number; ahead: number; behind: number; critical: number; completed: number;
    totalBudget: number; totalSpent: number; totalProjected: number; totalOverspend: number;
    avgPacingDiff: number;
  } {
    const result = {
      total: pacingResults.length,
      onTrack: 0, ahead: 0, behind: 0, critical: 0, completed: 0,
      totalBudget: 0, totalSpent: 0, totalProjected: 0, totalOverspend: 0,
      avgPacingDiff: 0,
    };

    pacingResults.forEach((p) => {
      if (p.pacing.status === "on_track") result.onTrack++;
      else if (p.pacing.status === "ahead") result.ahead++;
      else if (p.pacing.status === "behind") result.behind++;
      else if (p.pacing.status === "critical") result.critical++;
      else if (p.pacing.status === "completed") result.completed++;
      result.totalBudget += p.pacing.budgetTotal;
      result.totalSpent += p.pacing.budgetUsed;
      result.totalProjected += p.pacing.projectedEndSpend;
      result.totalOverspend += p.pacing.projectedOverspend;
    });

    result.avgPacingDiff = pacingResults.length > 0
      ? pacingResults.reduce((s, p) => s + (p.pacing.budgetUsedPercent - p.pacing.timeElapsedPercent), 0) / pacingResults.length
      : 0;

    return result;
  }
}

export const budgetPacing = new BudgetPacingService();
