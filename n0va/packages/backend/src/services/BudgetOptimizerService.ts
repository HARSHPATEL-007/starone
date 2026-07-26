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

  kalmanFilterPacing(
    platform: string,
    dailyBudget: number,
    spentHistory: number[],
    observationNoise: number = 0.1,
    processNoise: number = 0.01,
  ): { estimatedRemaining: number; predictedBurnRate: number; recommendedDaily: number; confidence: number } {
    let x = dailyBudget / 30;
    let P = 1;
    const Q = processNoise;
    const R = observationNoise;

    for (const spent of spentHistory) {
      x = x;
      P = P + Q;
      const K = P / (P + R);
      x = x + K * (spent - x);
      P = (1 - K) * P;
    }

    const daysRemaining = 30 - spentHistory.length;
    const estimatedRemaining = Math.max(0, 30 * dailyBudget - spentHistory.reduce((s, v) => s + v, 0));
    const predictedBurnRate = Math.max(0, x);
    const daysLeft = Math.max(1, daysRemaining);
    const rawDaily = estimatedRemaining / daysLeft;
    const fullPeriodSpend = (spentHistory.reduce((s, v) => s + v, 0) + rawDaily * daysLeft);
    const overUnder = fullPeriodSpend / (30 * dailyBudget);
    const recommendedDaily = Math.round((rawDaily / Math.max(1, overUnder)) * 100) / 100;
    const confidence = Math.round(Math.min(95, (1 - Math.sqrt(P)) * 100) * 100) / 100;

    return {
      estimatedRemaining: Math.round(estimatedRemaining * 100) / 100,
      predictedBurnRate: Math.round(predictedBurnRate * 100) / 100,
      recommendedDaily,
      confidence,
    };
  }

  kellyCriterionAllocation(
    platforms: { name: string; expectedROAS: number; winProbability: number }[],
    totalBudget: number,
  ): { platform: string; fraction: number; allocatedBudget: number; expectedValue: number }[] {
    const fractions = platforms.map((p) => {
      const b = p.expectedROAS - 1;
      const pWin = p.winProbability;
      const q = 1 - pWin;
      if (b <= 0 || pWin <= 0) return { platform: p.name, fraction: 0 };
      const fStar = Math.max(0, (b * pWin - q) / b);
      return { platform: p.name, fraction: fStar };
    });

    const totalFraction = fractions.reduce((s, f) => s + f.fraction, 0);
    const normalized = totalFraction > 0
      ? fractions.map((f) => ({
          ...f,
          fraction: Math.round((f.fraction / totalFraction) * 10000) / 100,
          allocatedBudget: Math.round((f.fraction / totalFraction) * totalBudget * 100) / 100,
          expectedValue: Math.round((f.fraction / totalFraction) * totalBudget * (f.fraction > 0 ? 1 : 0) * 100) / 100,
        }))
      : fractions.map((f) => ({
          ...f,
          fraction: 0,
          allocatedBudget: 0,
          expectedValue: 0,
        }));

    return normalized;
  }

  efficientFrontier(
    platforms: { name: string; expectedReturn: number; variance: number }[],
    covarianceMatrix?: number[][],
  ): { portfolios: { risk: number; return_: number; allocations: Record<string, number> }[]; efficientPortfolios: { risk: number; return_: number; allocations: Record<string, number> }[] } {
    const n = platforms.length;
    const covMat = covarianceMatrix ?? this.estimateCovariance(platforms);
    const portfolios: { risk: number; return_: number; allocations: Record<string, number> }[] = [];

    for (let iteration = 0; iteration < 500; iteration++) {
      let weights = platforms.map(() => Math.random());
      const sum = weights.reduce((s, w) => s + w, 0);
      weights = weights.map((w) => w / sum);

      let portReturn = 0;
      let portVariance = 0;
      for (let i = 0; i < n; i++) {
        portReturn += weights[i] * platforms[i].expectedReturn;
        for (let j = 0; j < n; j++) {
          portVariance += weights[i] * weights[j] * (covMat[i]?.[j] ?? 0);
        }
      }

      const allocations: Record<string, number> = {};
      platforms.forEach((p, i) => { allocations[p.name] = Math.round(weights[i] * 10000) / 100; });

      portfolios.push({
        risk: Math.round(Math.sqrt(portVariance) * 100) / 100,
        return_: Math.round(portReturn * 100) / 100,
        allocations,
      });
    }

    const sorted = [...portfolios].sort((a, b) => a.risk - b.risk);
    const efficient: typeof portfolios = [];
    let maxReturn = -Infinity;
    for (const p of sorted) {
      if (p.return_ > maxReturn) {
        maxReturn = p.return_;
        efficient.push(p);
      }
    }

    const maxReturnPortfolio = portfolios.reduce((a, b) => a.return_ > b.return_ ? a : b);
    const minRiskPortfolio = portfolios.reduce((a, b) => a.risk < b.risk ? a : b);

    return { portfolios, efficientPortfolios: [minRiskPortfolio, ...efficient.slice(-20), maxReturnPortfolio] };
  }

  private estimateCovariance(platforms: { name: string; expectedReturn: number; variance: number }[]): number[][] {
    const n = platforms.length;
    const mat: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          mat[i][j] = platforms[i].variance;
        } else {
          const correlation = 0.3 + Math.random() * 0.4;
          mat[i][j] = correlation * Math.sqrt(platforms[i].variance * platforms[j].variance);
        }
      }
    }
    return mat;
  }

  diminishingReturnsFit(
    channelHistory: { spend: number; revenue: number }[],
  ): { alpha: number; beta: number; R2: number; saturationPoint: number; maxEfficientSpend: number } {
    const n = channelHistory.length;
    if (n < 3) {
      return { alpha: 1, beta: 0.5, R2: 0, saturationPoint: 0, maxEfficientSpend: 0 };
    }

    const logSpend = channelHistory.map((p) => Math.log(Math.max(1, p.spend)));
    const logRev = channelHistory.map((p) => Math.log(Math.max(1, p.revenue)));
    const meanX = logSpend.reduce((s, v) => s + v, 0) / n;
    const meanY = logRev.reduce((s, v) => s + v, 0) / n;

    let numBeta = 0;
    let denBeta = 0;
    for (let i = 0; i < n; i++) {
      numBeta += (logSpend[i] - meanX) * (logRev[i] - meanY);
      denBeta += (logSpend[i] - meanX) ** 2;
    }

    const beta = denBeta > 0 ? numBeta / denBeta : 0.5;
    const alpha = Math.exp(meanY - beta * meanX);

    const predicted = channelHistory.map((p) => alpha * Math.pow(p.spend, beta));
    const meanRev = channelHistory.reduce((s, p) => s + p.revenue, 0) / n;
    const ssRes = channelHistory.reduce((s, p, i) => s + (p.revenue - predicted[i]) ** 2, 0);
    const ssTot = channelHistory.reduce((s, p) => s + (p.revenue - meanRev) ** 2, 0);
    const R2 = ssTot > 0 ? Math.round((1 - ssRes / ssTot) * 10000) / 100 : 0;

    const marginalRevenue = (spend: number) => alpha * beta * Math.pow(spend, beta - 1);
    let low = 1;
    let high = 1e7;
    for (let iter = 0; iter < 50; iter++) {
      const mid = (low + high) / 2;
      if (marginalRevenue(mid) > 1) low = mid;
      else high = mid;
    }
    const maxEfficientSpend = Math.round(low * 100) / 100;
    const saturationPoint = Math.round(Math.pow(1 / (alpha * beta), 1 / (beta - 1)) * 100) / 100;

    return {
      alpha: Math.round(alpha * 10000) / 10000,
      beta: Math.round(beta * 10000) / 10000,
      R2, saturationPoint, maxEfficientSpend,
    };
  }
}

export const budgetOptimizerService = new BudgetOptimizerService();
