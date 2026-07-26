import { MemoryStore } from "./MemoryStore";
import crypto from "crypto";

export interface BudgetAllocation {
  platform: string;
  allocated: number;
  recommended: number;
  predictedROAS: number;
  confidence: number;
  rationale: string;
}

export interface SpendPacing {
  platform: string;
  dailyBudget: number;
  spentToday: number;
  spentThisPeriod: number;
  paceRatio: number;
  status: "ahead" | "on_track" | "behind";
  projectedOverspend: number;
}

export interface ROASPrediction {
  platform: string;
  historicalROAS: number;
  predictedROAS: number;
  lowerBound: number;
  upperBound: number;
  seasonalityFactor: number;
  trend: "improving" | "declining" | "stable";
}

export interface OptimizationAdvice {
  platform: string;
  currentBudget: number;
  recommendedBudget: number;
  expectedROAS: number;
  expectedConversions: number;
  priority: "critical" | "high" | "medium" | "low";
  rationale: string;
}

const PLATFORM_BASE_ROAS: Record<string, number> = {
  google_ads: 4.2, meta_ads: 3.8, linkedin_ads: 2.1, tiktok_ads: 3.5,
  snapchat_ads: 2.8, twitter_ads: 2.4, pinterest_ads: 3.0, amazon_ads: 5.1,
};

const PLATFORM_SEASONALITY: Record<string, number> = {
  google_ads: 1.0, meta_ads: 1.1, linkedin_ads: 0.9, tiktok_ads: 1.3,
  snapchat_ads: 1.2, twitter_ads: 0.8, pinterest_ads: 1.1, amazon_ads: 1.4,
};

export class BudgetOptimizerService {
  private allocations: BudgetAllocation[] = [];

  private mem(): MemoryStore { return MemoryStore.getInstance(); }

  predictROAS(platform: string, recentROAS?: number): ROASPrediction {
    const base = PLATFORM_BASE_ROAS[platform] || 2.5;
    const seasonality = PLATFORM_SEASONALITY[platform] || 1.0;
    const historical = recentROAS || base;
    const variance = (Math.random() - 0.5) * 0.4;
    const predicted = historical * seasonality * (1 + variance);

    return {
      platform, historicalROAS: base, predictedROAS: Math.round(predicted * 100) / 100,
      lowerBound: Math.round(predicted * 0.8 * 100) / 100,
      upperBound: Math.round(predicted * 1.2 * 100) / 100,
      seasonalityFactor: seasonality,
      trend: predicted > historical ? "improving" : predicted < historical ? "declining" : "stable",
    };
  }

  optimizeBudget(platforms: { name: string; currentBudget: number; recentROAS?: number }[], totalBudget: number, urgency?: string): BudgetAllocation[] {
    const predictions = platforms.map((p) => ({
      platform: p.name, currentBudget: p.currentBudget,
      prediction: this.predictROAS(p.name, p.recentROAS),
    }));

    const totalPredictedROAS = predictions.reduce((s, p) => s + p.prediction.predictedROAS, 0);
    const urgencyMultiplier = urgency === "aggressive" ? 1.3 : urgency === "conservative" ? 0.8 : 1.0;

    this.allocations = predictions.map((p) => {
      const roasShare = totalPredictedROAS > 0 ? p.prediction.predictedROAS / totalPredictedROAS : 1 / predictions.length;
      const recommended = Math.round(totalBudget * roasShare * urgencyMultiplier * 100) / 100;
      const confidence = Math.round(Math.min(95, 50 + Math.abs(p.prediction.predictedROAS - p.prediction.historicalROAS) * 10));

      let rationale: string;
      if (recommended > p.currentBudget) rationale = `${p.platform}: predicted ROAS ${p.prediction.predictedROAS}x justifies +${Math.round((recommended / p.currentBudget - 1) * 100)}% budget increase`;
      else if (recommended < p.currentBudget) rationale = `${p.platform}: reduce budget ${Math.round((1 - recommended / p.currentBudget) * 100)}% — ROAS trend ${p.prediction.trend}`;
      else rationale = `${p.platform}: maintain current budget — ROAS ${p.prediction.predictedROAS}x stable`;

      return {
        platform: p.platform, allocated: p.currentBudget, recommended,
        predictedROAS: p.prediction.predictedROAS, confidence, rationale,
      };
    });

    const totalRecommended = this.allocations.reduce((s, a) => s + a.recommended, 0);
    if (totalRecommended > totalBudget) {
      const scale = totalBudget / totalRecommended;
      this.allocations = this.allocations.map((a) => ({ ...a, recommended: Math.round(a.recommended * scale * 100) / 100 }));
    }

    return this.allocations;
  }

  getSpendPacing(tenantId: string, dailyBudgets: Record<string, number>): SpendPacing[] {
    const spending = this.mem().find("swarm_executions", (e: any) =>
      e.tenantId === tenantId && e.action === "spend_update" || e.action === "budget_update"
    ) as any[];

    const today = new Date().toISOString().split("T")[0];
    const todaySpending = spending.filter((s: any) => (s.startedAt || "").startsWith(today));

    return Object.entries(dailyBudgets).map(([platform, dailyBudget]) => {
      const spentToday = todaySpending.filter((s: any) => s.platform === platform).reduce((sum: number, s: any) => sum + (s.params?.amount || 0), 0);
      const spentThisPeriod = spending.filter((s: any) => s.platform === platform).reduce((sum: number, s: any) => sum + (s.params?.amount || 0), 0);
      const paceRatio = dailyBudget > 0 ? spentToday / dailyBudget : 0;
      const status: "ahead" | "on_track" | "behind" = paceRatio > 1.1 ? "ahead" : paceRatio < 0.8 ? "behind" : "on_track";
      const projectedOverspend = status === "ahead" ? Math.round((spentToday - dailyBudget) * 30) : 0;

      return { platform, dailyBudget, spentToday, spentThisPeriod, paceRatio: Math.round(paceRatio * 100) / 100, status, projectedOverspend };
    });
  }

  getOptimizationAdvice(tenantId: string, platforms: { name: string; currentBudget: number; recentROAS?: number }[], totalBudget: number): OptimizationAdvice[] {
    const allocations = this.optimizeBudget(platforms, totalBudget);
    return allocations.map((a) => {
      const diff = a.recommended - a.allocated;
      const pctDiff = a.allocated > 0 ? (diff / a.allocated) * 100 : 0;
      let priority: "critical" | "high" | "medium" | "low";
      if (Math.abs(pctDiff) > 30) priority = "critical";
      else if (Math.abs(pctDiff) > 15) priority = "high";
      else if (Math.abs(pctDiff) > 5) priority = "medium";
      else priority = "low";

      const expectedConversions = a.predictedROAS > 0 ? Math.round(a.recommended * a.predictedROAS * 0.1) : 0;
      return {
        platform: a.platform, currentBudget: a.allocated, recommendedBudget: a.recommended,
        expectedROAS: a.predictedROAS, expectedConversions, priority,
        rationale: a.rationale,
      };
    });
  }

  getBudgetForecast(tenantId: string, platforms: string[], totalBudget: number, days: number): Record<string, unknown> {
    const dailyAllocation = Math.round(totalBudget / days * 100) / 100;
    const predictions = platforms.map((p) => this.predictROAS(p));
    const avgROAS = predictions.reduce((s, p) => s + p.predictedROAS, 0) / predictions.length;
    const expectedRevenue = Math.round(dailyAllocation * avgROAS * days);

    return {
      totalBudget, days, dailyBudget: dailyAllocation,
      platforms: predictions,
      avgPredictedROAS: Math.round(avgROAS * 100) / 100,
      expectedRevenue,
      expectedROI: Math.round((expectedRevenue / totalBudget) * 100) / 100,
      projectedAt: new Date(Date.now() + days * 86400000).toISOString(),
    };
  }
}

export const budgetOptimizerService = new BudgetOptimizerService();
