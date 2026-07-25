interface CampaignWithMetrics {
  id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
  budget: { daily: number; lifetime: number; spent: number; remaining: number; currency: string };
  metrics?: { spend: number; impressions: number; clicks: number; conversions: number; revenue: number; roas?: number };
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

interface PidState {
  integral: number;
  prevError: number;
  lastAdjustment: number;
  timestamps: number[];
}

interface KalmanState {
  estimate: number;
  errorCov: number;
  processNoise: number;
  measurementNoise: number;
}

interface SmoothedTrend {
  level: number;
  trend: number;
  forecast: number[];
}

interface PortfolioAllocation {
  campaignId: string;
  campaignName: string;
  currentShare: number;
  optimalShare: number;
  roas: number;
  budgetDelta: number;
  priority: number;
}

interface SpendAnomaly {
  campaignId: string;
  campaignName: string;
  timestamp: string;
  actualSpend: number;
  expectedSpend: number;
  deviation: number;
  severity: "low" | "medium" | "high" | "critical";
  direction: "spike" | "drop";
}

export class BudgetPacingService {
  // ─── PID Controller State ───────────────────────────────────────────

  private pidStates: Map<string, PidState> = new Map();

  /**
   * PID feedback controller for budget pacing.
   * Adjusts daily budget target to correct for pacing error.
   *
   * error = budgetUsed% - timeElapsed% (positive = ahead, negative = behind)
   * output = Kp * error + Ki * integral + Kd * derivative
   */
  pidAdjust(
    campaignId: string,
    error: number,
    dt: number,
    kp = 0.8,
    ki = 0.15,
    kd = 0.1,
    outputMin = -0.5,
    outputMax = 0.5,
  ): { adjustment: number; p: number; i: number; d: number; newTargetRate: number } {
    if (!this.pidStates.has(campaignId)) {
      this.pidStates.set(campaignId, { integral: 0, prevError: 0, lastAdjustment: Date.now(), timestamps: [] });
    }
    const state = this.pidStates.get(campaignId)!;
    state.timestamps.push(Date.now());

    state.integral += error * dt;
    state.integral = Math.max(-1, Math.min(1, state.integral)); // anti-windup

    const derivative = dt > 0 ? (error - state.prevError) / dt : 0;
    const p = kp * error;
    const i = ki * state.integral;
    const d = kd * derivative;
    const output = p + i + d;
    const adjustment = Math.max(outputMin, Math.min(outputMax, output));

    state.prevError = error;
    state.lastAdjustment = Date.now();

    return {
      adjustment: Math.round(adjustment * 10000) / 100,
      p: Math.round(p * 10000) / 100,
      i: Math.round(i * 10000) / 100,
      d: Math.round(d * 10000) / 100,
      newTargetRate: Math.round((1 + adjustment) * 10000) / 100,
    };
  }

  getPidState(campaignId: string): PidState | null {
    return this.pidStates.get(campaignId) || null;
  }

  resetPid(campaignId: string): void {
    this.pidStates.delete(campaignId);
  }

  // ─── Kalman Filter for Spend Prediction ─────────────────────────────

  private kalmanStates: Map<string, KalmanState> = new Map();

  /**
   * 1D Kalman filter for smooth spend estimation.
   */
  kalmanFilterSpend(
    campaignId: string,
    measurement: number,
    processNoise = 0.01,
    measurementNoise = 0.1,
  ): { filtered: number; gain: number; uncertainty: number } {
    if (!this.kalmanStates.has(campaignId)) {
      this.kalmanStates.set(campaignId, {
        estimate: measurement,
        errorCov: 1,
        processNoise,
        measurementNoise,
      });
    }
    const state = this.kalmanStates.get(campaignId)!;

    // Predict
    const predictedEstimate = state.estimate;
    const predictedCov = state.errorCov + state.processNoise;

    // Update
    const kalmanGain = predictedCov / (predictedCov + state.measurementNoise);
    const filteredEstimate = predictedEstimate + kalmanGain * (measurement - predictedEstimate);
    const filteredCov = (1 - kalmanGain) * predictedCov;

    state.estimate = filteredEstimate;
    state.errorCov = filteredCov;

    return {
      filtered: Math.round(filteredEstimate * 100) / 100,
      gain: Math.round(kalmanGain * 1000) / 1000,
      uncertainty: Math.round(filteredCov * 1000) / 1000,
    };
  }

  resetKalman(campaignId: string): void {
    this.kalmanStates.delete(campaignId);
  }

  // ─── Exponential Smoothing with Trend (Holt's Linear) ───────────────

  private smoothStates: Map<string, SmoothedTrend> = new Map();

  holtSmooth(
    campaignId: string,
    observation: number,
    alpha = 0.3,
    beta = 0.1,
    forecastHorizon = 7,
  ): SmoothedTrend {
    if (!this.smoothStates.has(campaignId)) {
      this.smoothStates.set(campaignId, {
        level: observation,
        trend: 0,
        forecast: [],
      });
      return this.smoothStates.get(campaignId)!;
    }
    const state = this.smoothStates.get(campaignId)!;
    const prevLevel = state.level;
    state.level = alpha * observation + (1 - alpha) * (state.level + state.trend);
    state.trend = beta * (state.level - prevLevel) + (1 - beta) * state.trend;
    state.forecast = Array.from({ length: forecastHorizon }, (_, i) => state.level + (i + 1) * state.trend);
    return { level: Math.round(state.level * 100) / 100, trend: Math.round(state.trend * 100) / 100, forecast: state.forecast.map((v) => Math.round(v * 100) / 100) };
  }

  // ─── Portfolio Rebalancing ──────────────────────────────────────────

  /**
   * Optimize budget allocation across campaigns using a simple
   * Lagrange-multiplier approach: allocate proportionally to sqrt(ROAS * remaining budget).
   * This approximates a risk-adjusted optimal portfolio under
   * diminishing returns (power-law marginal response).
   */
  optimizePortfolio(campaigns: CampaignWithMetrics[]): {
    allocations: PortfolioAllocation[];
    totalBudget: number;
    projectedTotalROAS: number;
  } {
    const active = campaigns.filter((c) => c.status === "active" && c.budget.remaining > 0 && c.metrics?.roas);
    const totalRemaining = active.reduce((s, c) => s + c.budget.remaining, 0);
    if (active.length === 0 || totalRemaining === 0) {
      return { allocations: [], totalBudget: 0, projectedTotalROAS: 0 };
    }

    // Compute allocation weights: w_i = sqrt(ROAS_i * remaining_i) / sum(sqrt(...))
    const weights: { campaign: CampaignWithMetrics; weight: number; roas: number }[] = [];
    let weightSum = 0;
    for (const c of active) {
      const roas = c.metrics?.roas || 1;
      const w = Math.sqrt(Math.max(0.1, roas) * Math.max(1, c.budget.remaining));
      weights.push({ campaign: c, weight: w, roas });
      weightSum += w;
    }

    const allocations: PortfolioAllocation[] = [];
    for (const w of weights) {
      const idealShare = weightSum > 0 ? w.weight / weightSum : 1 / weights.length;
      const currentShare = totalRemaining > 0 ? w.campaign.budget.remaining / totalRemaining : 0;
      allocations.push({
        campaignId: w.campaign.id,
        campaignName: w.campaign.name,
        currentShare: Math.round(currentShare * 10000) / 100,
        optimalShare: Math.round(idealShare * 10000) / 100,
        roas: Math.round(w.roas * 100) / 100,
        budgetDelta: Math.round((idealShare - currentShare) * totalRemaining * 100) / 100,
        priority: Math.round(idealShare * 100),
      });
    }

    allocations.sort((a, b) => b.priority - a.priority);

    const projectedTotalROAS = allocations.length > 0
      ? Math.round(allocations.reduce((s, a) => s + a.roas * a.optimalShare, 0) * 100) / 100
      : 0;

    return { allocations, totalBudget: Math.round(totalRemaining * 100) / 100, projectedTotalROAS };
  }

  // ─── Spend Anomaly Detection ────────────────────────────────────────

  private spendHistory: Map<string, number[]> = new Map();

  detectSpendAnomalies(
    campaign: CampaignWithMetrics,
    newSpend: number,
    zScoreThreshold = 2.5,
  ): SpendAnomaly | null {
    if (!this.spendHistory.has(campaign.id)) {
      this.spendHistory.set(campaign.id, []);
    }
    const history = this.spendHistory.get(campaign.id)!;
    history.push(newSpend);
    if (history.length > 30) history.shift();

    if (history.length < 5) return null;

    const mean = history.reduce((s, v) => s + v, 0) / history.length;
    const variance = history.reduce((s, v) => s + (v - mean) ** 2, 0) / history.length;
    const std = Math.sqrt(variance);
    if (std === 0) return null;

    const zScore = (newSpend - mean) / std;
    if (Math.abs(zScore) < zScoreThreshold) return null;

    const deviation = Math.round(((newSpend - mean) / mean) * 10000) / 100;
    const absDev = Math.abs(deviation);
    const severity: "low" | "medium" | "high" | "critical" =
      absDev > 100 ? "critical" : absDev > 60 ? "high" : absDev > 30 ? "medium" : "low";

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      timestamp: new Date().toISOString(),
      actualSpend: Math.round(newSpend * 100) / 100,
      expectedSpend: Math.round(mean * 100) / 100,
      deviation,
      severity,
      direction: zScore > 0 ? "spike" : "drop",
    };
  }

  // ─── Original pacing methods below ──────────────────────────────────

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
