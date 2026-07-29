function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

function seededRandom(seed: string): () => number {
  let state = hashStr(seed);
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

interface LiveMetricSnapshot {
  campaignId: string;
  tenantId: string;
  timestamp: string;
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    revenue: number;
  };
  derived: {
    ctr: number;
    cvr: number;
    cpc: number;
    roas: number;
    impressionsPerMinute: number;
  };
  status: "healthy" | "attention" | "critical";
  previousPeriodComparison: {
    impressionsDelta: number;
    clicksDelta: number;
    conversionsDelta: number;
    spendDelta: number;
    revenueDelta: number;
  };
}

interface AnomalyResult {
  campaignId: string;
  timestamp: string;
  anomalies: {
    metric: string;
    currentValue: number;
    baseline: number;
    zScore: number;
    severity: "low" | "medium" | "high" | "critical";
    direction: "spike" | "drop";
    message: string;
  }[];
  anomalyCount: number;
  overallHealthScore: number;
}

interface MetricVelocity {
  metric: string;
  currentValue: number;
  previousValue: number;
  velocity: number;
  acceleration: number;
  trend: "accelerating_up" | "decelerating_up" | "accelerating_down" | "decelerating_down" | "stable";
  volatility: number;
}

interface BudgetPacingInfo {
  campaignId: string;
  dailyBudget: number;
  lifetimeBudget: number;
  totalSpent: number;
  spendToday: number;
  daysRemaining: number;
  dailyBurnRate: number;
  projectedDailyBurnRate: number;
  projectedTotalSpend: number;
  projectedExhaustionDate: string | null;
  daysUntilExhaustion: number | null;
  pacingStatus: "ahead" | "on_track" | "behind" | "exhausted";
  recommendedDailyBudget: number;
  underutilizedBudget: number;
}

interface LiveAlert {
  id: string;
  campaignId: string;
  type: "budget" | "performance" | "anomaly" | "pacing" | "velocity";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: string;
  acknowledged: boolean;
}

interface PerformanceForecast {
  campaignId: string;
  forecastPeriods: {
    period: string;
    predictedImpressions: number;
    predictedClicks: number;
    predictedConversions: number;
    predictedSpend: number;
    predictedRevenue: number;
    confidenceInterval: { lower: number; upper: number };
  }[];
  confidenceLevel: number;
  smoothedMetrics: { metric: string; alpha: number; lastSmoothedValue: number }[];
}

export class CampaignRealTimeMonitorService {
  private getSeed(campaignId: string, tenantId: string): string {
    return `rtm_${campaignId}_${tenantId}`;
  }

  private baseMetrics(seed: string): { impressions: number; clicks: number; conversions: number; spend: number; revenue: number } {
    const rng = seededRandom(seed + "_base");
    const impressions = Math.floor(rng() * 5000) + 1000;
    const clicks = Math.floor(impressions * (rng() * 0.03 + 0.01));
    const conversions = Math.floor(clicks * (rng() * 0.08 + 0.02));
    const spend = Math.round((rng() * 500 + 100) * 100) / 100;
    const revenue = Math.round((spend * (rng() * 2 + 0.5)) * 100) / 100;
    return { impressions, clicks, conversions, spend, revenue };
  }

  getLiveMetrics(campaignId: string, tenantId: string): LiveMetricSnapshot {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_live");
    const now = new Date();
    const base = this.baseMetrics(seed + "_live_base");
    const impressions = base.impressions + Math.floor(rng() * 200 - 100);
    const clicks = base.clicks + Math.floor(rng() * 10 - 5);
    const conversions = base.conversions + Math.floor(rng() * 3 - 1);
    const spend = Math.round((base.spend + rng() * 20 - 10) * 100) / 100;
    const revenue = Math.round((base.revenue + rng() * 50 - 25) * 100) / 100;
    const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
    const cvr = clicks > 0 ? Math.round((conversions / clicks) * 10000) / 100 : 0;
    const cpc = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;
    const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0;
    const impressionsPerMinute = Math.round((impressions / 30) * 100) / 100;
    const prevBase = this.baseMetrics(seed + "_live_prev");
    const prevImpressions = prevBase.impressions;
    const prevClicks = prevBase.clicks;
    const prevConversions = prevBase.conversions;
    const prevSpend = prevBase.spend;
    const prevRevenue = prevBase.revenue;
    const impressionScore = ctr > 1 ? 1 : ctr > 0.5 ? 0.7 : 0.4;
    const roasScore = roas > 2 ? 1 : roas > 1 ? 0.7 : 0.4;
    const cvrScore = cvr > 3 ? 1 : cvr > 1 ? 0.7 : 0.4;
    const composite = (impressionScore + roasScore + cvrScore) / 3;
    const status: "healthy" | "attention" | "critical" = composite > 0.7 ? "healthy" : composite > 0.4 ? "attention" : "critical";
    return {
      campaignId, tenantId, timestamp: now.toISOString(),
      metrics: { impressions, clicks, conversions, spend, revenue },
      derived: { ctr, cvr, cpc, roas, impressionsPerMinute },
      status,
      previousPeriodComparison: {
        impressionsDelta: Math.round((impressions - prevImpressions) / Math.max(prevImpressions, 1) * 10000) / 100,
        clicksDelta: Math.round((clicks - prevClicks) / Math.max(prevClicks, 1) * 10000) / 100,
        conversionsDelta: Math.round((conversions - prevConversions) / Math.max(prevConversions, 1) * 10000) / 100,
        spendDelta: Math.round((spend - prevSpend) / Math.max(prevSpend, 1) * 10000) / 100,
        revenueDelta: Math.round((revenue - prevRevenue) / Math.max(prevRevenue, 1) * 10000) / 100,
      },
    };
  }

  detectAnomalies(campaignId: string, tenantId: string): AnomalyResult {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_anomaly");
    const now = new Date();
    const metrics = ["impressions", "clicks", "conversions", "spend", "revenue", "ctr", "cvr", "roas"];
    const current = this.baseMetrics(seed + "_anomaly_cur");
    const baseline = this.baseMetrics(seed + "_anomaly_base");
    const currentCtr = current.impressions > 0 ? current.clicks / current.impressions : 0;
    const currentCvr = current.clicks > 0 ? current.conversions / current.clicks : 0;
    const currentRoas = current.spend > 0 ? current.revenue / current.spend : 0;
    const baselineCtr = baseline.impressions > 0 ? baseline.clicks / baseline.impressions : 0;
    const baselineCvr = baseline.clicks > 0 ? baseline.conversions / baseline.clicks : 0;
    const baselineRoas = baseline.spend > 0 ? baseline.revenue / baseline.spend : 0;
    const metricValues: Record<string, { current: number; baseline: number }> = {
      impressions: { current: current.impressions, baseline: baseline.impressions },
      clicks: { current: current.clicks, baseline: baseline.clicks },
      conversions: { current: current.conversions, baseline: baseline.conversions },
      spend: { current: current.spend, baseline: baseline.spend },
      revenue: { current: current.revenue, baseline: baseline.revenue },
      ctr: { current: currentCtr * 100, baseline: baselineCtr * 100 },
      cvr: { current: currentCvr * 100, baseline: baselineCvr * 100 },
      roas: { current: currentRoas, baseline: baselineRoas },
    };
    const anomalies: AnomalyResult["anomalies"] = [];
    const higherIsBetter: Record<string, boolean> = {
      impressions: true, clicks: true, conversions: true, spend: false, revenue: true,
      ctr: true, cvr: true, roas: true,
    };
    for (const metric of metrics) {
      const { current: cv, baseline: bv } = metricValues[metric];
      const std = Math.max(bv * 0.15, 0.01);
      const zScore = std > 0 ? (cv - bv) / std : 0;
      if (Math.abs(zScore) > 1.5) {
        const absZ = Math.abs(zScore);
        const severity: "low" | "medium" | "high" | "critical" = absZ > 3 ? "critical" : absZ > 2.5 ? "high" : absZ > 2 ? "medium" : "low";
        const direction = zScore > 0 ? "spike" : "drop";
        const pctChange = bv > 0 ? Math.round(((cv - bv) / bv) * 10000) / 100 : 0;
        const isBad = (direction === "drop" && higherIsBetter[metric]) || (direction === "spike" && !higherIsBetter[metric]);
        const message = isBad
          ? `${metric} dropped ${Math.abs(pctChange)}% from baseline — monitoring recommended`
          : `${metric} spiked ${pctChange}% above baseline — may indicate positive trend`;
        anomalies.push({ metric, currentValue: Math.round(cv * 100) / 100, baseline: Math.round(bv * 100) / 100, zScore: Math.round(zScore * 100) / 100, severity, direction, message });
      }
    }
    const healthDeductions = anomalies.filter(a => a.severity === "critical" || a.severity === "high").length * 15 + anomalies.filter(a => a.severity === "medium").length * 8;
    const overallHealthScore = Math.max(0, Math.min(100, 100 - healthDeductions));
    return { campaignId, timestamp: now.toISOString(), anomalies, anomalyCount: anomalies.length, overallHealthScore };
  }

  analyzeMetricVelocity(campaignId: string, tenantId: string): { metrics: MetricVelocity[]; overallMomentum: "positive" | "negative" | "neutral"; fastestRiser: string | null; fastestFaller: string | null } {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_velocity");
    const metricDefs = [
      { metric: "impressions", current: Math.floor(rng() * 5000) + 1000, previous: Math.floor(rng() * 5000) + 1000 },
      { metric: "clicks", current: Math.floor(rng() * 300) + 50, previous: Math.floor(rng() * 300) + 50 },
      { metric: "conversions", current: Math.floor(rng() * 30) + 5, previous: Math.floor(rng() * 30) + 5 },
      { metric: "spend", current: Math.round((rng() * 500 + 100) * 100) / 100, previous: Math.round((rng() * 500 + 100) * 100) / 100 },
      { metric: "revenue", current: Math.round((rng() * 1500 + 200) * 100) / 100, previous: Math.round((rng() * 1500 + 200) * 100) / 100 },
      { metric: "ctr", current: Math.round((rng() * 3 + 0.5) * 100) / 100, previous: Math.round((rng() * 3 + 0.5) * 100) / 100 },
      { metric: "cvr", current: Math.round((rng() * 6 + 1) * 100) / 100, previous: Math.round((rng() * 6 + 1) * 100) / 100 },
      { metric: "roas", current: Math.round((rng() * 3 + 0.5) * 100) / 100, previous: Math.round((rng() * 3 + 0.5) * 100) / 100 },
    ];
    const results: MetricVelocity[] = [];
    let positiveCount = 0, negativeCount = 0;
    let maxRiser: { metric: string; velocity: number } | null = null;
    let maxFaller: { metric: string; velocity: number } | null = null;
    for (const md of metricDefs) {
      const velocity = md.previous > 0 ? Math.round(((md.current - md.previous) / md.previous) * 10000) / 100 : 0;
      const prevVel = rng() * 10 - 5;
      const acceleration = velocity - prevVel;
      const absVel = Math.abs(velocity);
      const trend: MetricVelocity["trend"] = velocity > 1 ? (acceleration > 0 ? "accelerating_up" : "decelerating_up") : velocity < -1 ? (acceleration < 0 ? "accelerating_down" : "decelerating_down") : "stable";
      const volatility = Math.round((rng() * 0.3) * 100) / 100;
      results.push({ metric: md.metric, currentValue: md.current, previousValue: md.previous, velocity, acceleration: Math.round(acceleration * 100) / 100, trend, volatility });
      if (velocity > 0) positiveCount++;
      else if (velocity < 0) negativeCount++;
      if (velocity > (maxRiser?.velocity ?? -Infinity)) maxRiser = { metric: md.metric, velocity };
      if (velocity < (maxFaller?.velocity ?? Infinity)) maxFaller = { metric: md.metric, velocity };
    }
    const overallMomentum = positiveCount > negativeCount + 1 ? "positive" : negativeCount > positiveCount + 1 ? "negative" : "neutral";
    return { metrics: results, overallMomentum, fastestRiser: maxRiser?.metric ?? null, fastestFaller: maxFaller?.metric ?? null };
  }

  getBudgetPacing(campaignId: string, tenantId: string): BudgetPacingInfo {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_pacing");
    const dailyBudget = Math.round((rng() * 500 + 100) * 100) / 100;
    const lifetimeBudget = dailyBudget * 30;
    const daysElapsed = Math.floor(rng() * 20) + 1;
    const totalSpent = Math.round((dailyBudget * daysElapsed * (rng() * 0.6 + 0.5)) * 100) / 100;
    const spendToday = Math.round((dailyBudget * (rng() * 0.5 + 0.5)) * 100) / 100;
    const daysRemaining = 30 - daysElapsed;
    const dailyBurnRate = daysElapsed > 0 ? Math.round((totalSpent / daysElapsed) * 100) / 100 : 0;
    const budgetLeft = lifetimeBudget - totalSpent;
    const projectedDailyBurnRate = Math.round((budgetLeft / Math.max(daysRemaining, 1)) * 100) / 100;
    const projectedTotalSpend = Math.round((totalSpent + dailyBurnRate * daysRemaining) * 100) / 100;
    let projectedExhaustionDate: string | null = null;
    let daysUntilExhaustion: number | null = null;
    if (dailyBurnRate > 0) {
      const daysLeft = budgetLeft / dailyBurnRate;
      daysUntilExhaustion = Math.round(daysLeft * 10) / 10;
      if (daysLeft < daysRemaining) {
        const exDate = new Date();
        exDate.setDate(exDate.getDate() + Math.ceil(daysLeft));
        projectedExhaustionDate = exDate.toISOString();
      }
    }
    const expectedBurnRate = lifetimeBudget / 30;
    const paceRatio = dailyBurnRate / Math.max(expectedBurnRate, 1);
    let pacingStatus: BudgetPacingInfo["pacingStatus"] = "on_track";
    if (daysRemaining <= 0 || totalSpent >= lifetimeBudget) pacingStatus = "exhausted";
    else if (paceRatio > 1.15) pacingStatus = "ahead";
    else if (paceRatio < 0.85) pacingStatus = "behind";
    const currentUtilization = lifetimeBudget > 0 ? (totalSpent / lifetimeBudget) * 100 : 0;
    const expectedUtilization = 30 > 0 ? ((30 - daysRemaining) / 30) * 100 : 0;
    const recommendedDailyBudget = daysRemaining > 0
      ? Math.round(((lifetimeBudget - totalSpent) / daysRemaining) * 100) / 100
      : dailyBudget;
    const underutilizedBudget = Math.max(0, Math.round((expectedUtilization - currentUtilization) * lifetimeBudget / 100 * 100) / 100);
    return {
      campaignId, dailyBudget, lifetimeBudget, totalSpent, spendToday,
      daysRemaining, dailyBurnRate, projectedDailyBurnRate, projectedTotalSpend,
      projectedExhaustionDate, daysUntilExhaustion, pacingStatus, recommendedDailyBudget, underutilizedBudget,
    };
  }

  generateLiveAlerts(campaignId: string, tenantId: string): LiveAlert[] {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_alerts");
    const now = new Date();
    const alerts: LiveAlert[] = [];
    const budgetBase = this.baseMetrics(seed + "_alerts_budget");
    const spendRatio = budgetBase.spend / Math.max(budgetBase.revenue, 1);
    if (spendRatio > 0.8) {
      alerts.push({
        id: `alert_budget_${hashStr(seed + "_budget_high")}`,
        campaignId, type: "budget", severity: "warning",
        title: "Budget burn rate high",
        message: `Spend-to-revenue ratio is ${Math.round(spendRatio * 100)}% — costs consuming revenue`,
        metric: "spend_ratio", currentValue: Math.round(spendRatio * 100) / 100, threshold: 0.8,
        timestamp: now.toISOString(), acknowledged: false,
      });
    }
    const pacing = this.getBudgetPacing(campaignId, tenantId);
    if (pacing.pacingStatus === "ahead") {
      alerts.push({
        id: `alert_pace_${hashStr(seed + "_ahead")}`,
        campaignId, type: "pacing", severity: "info",
        title: "Budget pacing ahead",
        message: `Spending $${pacing.dailyBurnRate}/day vs $${pacing.dailyBudget} budget — may exhaust early`,
        metric: "daily_burn_rate", currentValue: pacing.dailyBurnRate, threshold: pacing.dailyBudget,
        timestamp: now.toISOString(), acknowledged: false,
      });
    } else if (pacing.pacingStatus === "behind") {
      alerts.push({
        id: `alert_pace_${hashStr(seed + "_behind")}`,
        campaignId, type: "pacing", severity: "warning",
        title: "Budget pacing behind",
        message: `Spending $${pacing.dailyBurnRate}/day vs $${pacing.dailyBudget} budget — budget underutilization risk`,
        metric: "daily_burn_rate", currentValue: pacing.dailyBurnRate, threshold: pacing.dailyBudget,
        timestamp: now.toISOString(), acknowledged: false,
      });
    }
    const roas = budgetBase.revenue / Math.max(budgetBase.spend, 1);
    if (roas < 1) {
      alerts.push({
        id: `alert_perf_${hashStr(seed + "_low_roas")}`,
        campaignId, type: "performance", severity: "critical",
        title: "Negative ROAS detected",
        message: `ROAS is ${roas.toFixed(2)}x — below breakeven`,
        metric: "roas", currentValue: Math.round(roas * 100) / 100, threshold: 1,
        timestamp: now.toISOString(), acknowledged: false,
      });
    } else if (roas < 1.5) {
      alerts.push({
        id: `alert_perf_${hashStr(seed + "_low_roas_warn")}`,
        campaignId, type: "performance", severity: "warning",
        title: "ROAS below target",
        message: `ROAS is ${roas.toFixed(2)}x — below 1.5x target`,
        metric: "roas", currentValue: Math.round(roas * 100) / 100, threshold: 1.5,
        timestamp: now.toISOString(), acknowledged: false,
      });
    }
    const anomalyResult = this.detectAnomalies(campaignId, tenantId);
    for (const anomaly of anomalyResult.anomalies.filter(a => a.severity === "high" || a.severity === "critical")) {
      alerts.push({
        id: `alert_anomaly_${hashStr(seed + "_anom_" + anomaly.metric)}`,
        campaignId, type: "anomaly",
        severity: anomaly.severity === "critical" ? "critical" : "warning",
        title: `Anomaly detected: ${anomaly.metric}`,
        message: anomaly.message,
        metric: anomaly.metric, currentValue: anomaly.currentValue, threshold: anomaly.baseline,
        timestamp: now.toISOString(), acknowledged: false,
      });
    }
    const velocity = this.analyzeMetricVelocity(campaignId, tenantId);
    for (const mv of velocity.metrics) {
      if (mv.trend === "accelerating_down" && Math.abs(mv.velocity) > 10) {
        alerts.push({
          id: `alert_vel_${hashStr(seed + "_vel_" + mv.metric)}`,
          campaignId, type: "velocity", severity: "warning",
          title: `Rapid decline in ${mv.metric}`,
          message: `${mv.metric} dropped ${Math.abs(mv.velocity)}% — accelerating downward trend`,
          metric: mv.metric, currentValue: mv.currentValue, threshold: mv.previousValue,
          timestamp: now.toISOString(), acknowledged: false,
        });
      }
    }
    alerts.sort((a, b) => { const sev = { critical: 3, warning: 2, info: 1 }; return (sev[b.severity] ?? 0) - (sev[a.severity] ?? 0); });
    return alerts.slice(0, 10);
  }

  getPerformanceForecast(campaignId: string, tenantId: string): PerformanceForecast {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_forecast");
    const now = new Date();
    const alpha = 0.3;
    const baseMetrics = this.baseMetrics(seed + "_forecast_base");
    const smoothedImpressions = baseMetrics.impressions;
    const smoothedClicks = baseMetrics.clicks;
    const smoothedConversions = baseMetrics.conversions;
    const smoothedSpend = baseMetrics.spend;
    const smoothedRevenue = baseMetrics.revenue;
    const trendImpressions = Math.round((rng() * 100 + 50) * 100) / 100;
    const trendClicks = Math.round((rng() * 5 + 2) * 100) / 100;
    const trendConversions = Math.round((rng() * 0.5 + 0.2) * 100) / 100;
    const trendSpend = Math.round((rng() * 10 + 5) * 100) / 100;
    const trendRevenue = Math.round((rng() * 30 + 10) * 100) / 100;
    const periods: PerformanceForecast["forecastPeriods"] = [];
    const ciFactor = 0.15;
    let simImp = smoothedImpressions, simClk = smoothedClicks, simConv = smoothedConversions, simSpend = smoothedSpend, simRev = smoothedRevenue;
    for (let i = 1; i <= 6; i++) {
      const noise = (rng() - 0.5) * 0.1;
      simImp = Math.max(100, simImp + trendImpressions + simImp * noise);
      simClk = Math.max(5, simClk + trendClicks + simClk * noise);
      simConv = Math.max(1, simConv + trendConversions + simConv * noise);
      simSpend = Math.max(10, simSpend + trendSpend + simSpend * noise);
      simRev = Math.max(10, simRev + trendRevenue + simRev * noise);
      const ciBase = Math.max(simImp, simSpend);
      const periodDate = new Date(now);
      periodDate.setMinutes(periodDate.getMinutes() + i * 10);
      periods.push({
        period: periodDate.toISOString(),
        predictedImpressions: Math.round(simImp),
        predictedClicks: Math.round(simClk),
        predictedConversions: Math.round(simConv),
        predictedSpend: Math.round(simSpend * 100) / 100,
        predictedRevenue: Math.round(simRev * 100) / 100,
        confidenceInterval: {
          lower: Math.round(Math.max(0, simImp * (1 - ciFactor))),
          upper: Math.round(simImp * (1 + ciFactor)),
        },
      });
    }
    return {
      campaignId,
      forecastPeriods: periods,
      confidenceLevel: 0.85,
      smoothedMetrics: [
        { metric: "impressions", alpha, lastSmoothedValue: Math.round(smoothedImpressions) },
        { metric: "clicks", alpha, lastSmoothedValue: Math.round(smoothedClicks) },
        { metric: "conversions", alpha, lastSmoothedValue: Math.round(smoothedConversions) },
        { metric: "spend", alpha, lastSmoothedValue: Math.round(smoothedSpend * 100) / 100 },
        { metric: "revenue", alpha, lastSmoothedValue: Math.round(smoothedRevenue * 100) / 100 },
      ],
    };
  }
}

export const campaignRealTimeMonitor = new CampaignRealTimeMonitorService();
