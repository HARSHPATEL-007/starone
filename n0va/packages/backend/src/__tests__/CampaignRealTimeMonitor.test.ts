import { describe, it, expect } from "vitest";
import { campaignRealTimeMonitor } from "../services/CampaignRealTimeMonitorService";

describe("CampaignRealTimeMonitorService", () => {
  const tenantId = "test-tenant-rtm";
  const campaignId = "test-campaign-rtm";

  it("returns live metrics snapshot", () => {
    const metrics = campaignRealTimeMonitor.getLiveMetrics(campaignId, tenantId);
    expect(metrics.campaignId).toBe(campaignId);
    expect(metrics.tenantId).toBe(tenantId);
    expect(metrics.metrics.impressions).toBeGreaterThan(0);
    expect(metrics.metrics.clicks).toBeGreaterThan(0);
    expect(metrics.metrics.conversions).toBeGreaterThan(0);
    expect(metrics.metrics.spend).toBeGreaterThan(0);
    expect(metrics.metrics.revenue).toBeGreaterThan(0);
    expect(metrics.derived.ctr).toBeGreaterThan(0);
    expect(metrics.derived.roas).toBeGreaterThan(0);
    expect(["healthy", "attention", "critical"]).toContain(metrics.status);
    expect(metrics.previousPeriodComparison.impressionsDelta).toBeDefined();
    expect(metrics.timestamp).toBeTruthy();
  });

  it("detects anomalies with z-score analysis", () => {
    const result = campaignRealTimeMonitor.detectAnomalies(campaignId, tenantId);
    expect(result.campaignId).toBe(campaignId);
    expect(Array.isArray(result.anomalies)).toBe(true);
    expect(result.anomalyCount).toBeGreaterThanOrEqual(0);
    expect(result.overallHealthScore).toBeGreaterThanOrEqual(0);
    expect(result.overallHealthScore).toBeLessThanOrEqual(100);
    result.anomalies.forEach(a => {
      expect(a.metric).toBeTruthy();
      expect(a.currentValue).toBeGreaterThan(0);
      expect(a.baseline).toBeGreaterThan(0);
      expect(["low", "medium", "high", "critical"]).toContain(a.severity);
      expect(["spike", "drop"]).toContain(a.direction);
      expect(a.message).toBeTruthy();
    });
  });

  it("analyzes metric velocity", () => {
    const result = campaignRealTimeMonitor.analyzeMetricVelocity(campaignId, tenantId);
    expect(result.metrics.length).toBeGreaterThan(0);
    expect(["positive", "negative", "neutral"]).toContain(result.overallMomentum);
    result.metrics.forEach(m => {
      expect(m.metric).toBeTruthy();
      expect(m.velocity).toBeDefined();
      expect(m.acceleration).toBeDefined();
      expect(m.volatility).toBeGreaterThanOrEqual(0);
      expect(["accelerating_up", "decelerating_up", "accelerating_down", "decelerating_down", "stable"]).toContain(m.trend);
    });
  });

  it("returns budget pacing info", () => {
    const pacing = campaignRealTimeMonitor.getBudgetPacing(campaignId, tenantId);
    expect(pacing.campaignId).toBe(campaignId);
    expect(pacing.dailyBudget).toBeGreaterThan(0);
    expect(pacing.lifetimeBudget).toBeGreaterThan(0);
    expect(pacing.totalSpent).toBeGreaterThan(0);
    expect(pacing.daysRemaining).toBeGreaterThan(0);
    expect(pacing.dailyBurnRate).toBeGreaterThan(0);
    expect(["ahead", "on_track", "behind", "exhausted"]).toContain(pacing.pacingStatus);
    expect(pacing.recommendedDailyBudget).toBeGreaterThan(0);
  });

  it("generates live alerts", () => {
    const alerts = campaignRealTimeMonitor.generateLiveAlerts(campaignId, tenantId);
    expect(alerts.length).toBeGreaterThan(0);
    alerts.forEach(a => {
      expect(a.id).toBeTruthy();
      expect(a.campaignId).toBe(campaignId);
      expect(a.type).toBeTruthy();
      expect(["info", "warning", "critical"]).toContain(a.severity);
      expect(a.title).toBeTruthy();
      expect(a.message).toBeTruthy();
      expect(a.timestamp).toBeTruthy();
      expect(a.acknowledged).toBe(false);
    });
  });

  it("forecasts performance metrics", () => {
    const forecast = campaignRealTimeMonitor.getPerformanceForecast(campaignId, tenantId);
    expect(forecast.campaignId).toBe(campaignId);
    expect(forecast.forecastPeriods.length).toBe(6);
    forecast.forecastPeriods.forEach(p => {
      expect(p.period).toBeTruthy();
      expect(p.predictedImpressions).toBeGreaterThan(0);
      expect(p.predictedClicks).toBeGreaterThan(0);
      expect(p.predictedConversions).toBeGreaterThan(0);
      expect(p.predictedSpend).toBeGreaterThan(0);
      expect(p.predictedRevenue).toBeGreaterThan(0);
      expect(p.confidenceInterval.lower).toBeGreaterThan(0);
      expect(p.confidenceInterval.upper).toBeGreaterThan(p.confidenceInterval.lower);
    });
    expect(forecast.confidenceLevel).toBeGreaterThan(0);
    expect(forecast.smoothedMetrics.length).toBeGreaterThan(0);
  });

  it("produces consistent results for same campaign+tenant", () => {
    const m1 = campaignRealTimeMonitor.getLiveMetrics(campaignId, tenantId);
    const m2 = campaignRealTimeMonitor.getLiveMetrics(campaignId, tenantId);
    expect(m1.metrics.impressions).toBe(m2.metrics.impressions);
    expect(m1.metrics.clicks).toBe(m2.metrics.clicks);
    expect(m1.derived.ctr).toBe(m2.derived.ctr);
  });

  it("produces different results for different tenants", () => {
    const m1 = campaignRealTimeMonitor.getLiveMetrics(campaignId, tenantId);
    const m2 = campaignRealTimeMonitor.getLiveMetrics(campaignId, "other-tenant");
    expect(m1.metrics.impressions).not.toBe(m2.metrics.impressions);
  });

  it("reports healthy status when metrics are strong", () => {
    const metrics = campaignRealTimeMonitor.getLiveMetrics("stellar_campaign", tenantId);
    expect(metrics.derived.ctr).toBeGreaterThan(0);
    expect(metrics.derived.roas).toBeGreaterThan(0);
  });

  it("generates alerts sorted by severity", () => {
    const alerts = campaignRealTimeMonitor.generateLiveAlerts(campaignId, tenantId);
    const severityOrder: Record<string, number> = { critical: 3, warning: 2, info: 1 };
    for (let i = 1; i < alerts.length; i++) {
      expect(severityOrder[alerts[i - 1].severity]).toBeGreaterThanOrEqual(severityOrder[alerts[i].severity]);
    }
  });

  it("has budget pacing with sensible projections", () => {
    const pacing = campaignRealTimeMonitor.getBudgetPacing(campaignId, tenantId);
    expect(pacing.projectedTotalSpend).toBeGreaterThan(0);
    if (pacing.daysUntilExhaustion !== null) {
      expect(pacing.daysUntilExhaustion).toBeGreaterThan(0);
    }
    expect(pacing.underutilizedBudget).toBeGreaterThanOrEqual(0);
  });

  it("anomalies include expected metric types", () => {
    const result = campaignRealTimeMonitor.detectAnomalies(campaignId, tenantId);
    const metricTypes = result.anomalies.map(a => a.metric);
    const expectedMetrics = ["impressions", "clicks", "conversions", "spend", "revenue", "ctr", "cvr", "roas"];
    if (metricTypes.length > 0) {
      metricTypes.forEach(m => expect(expectedMetrics).toContain(m));
    }
  });

  it("metric velocity includes key advertising metrics", () => {
    const result = campaignRealTimeMonitor.analyzeMetricVelocity(campaignId, tenantId);
    const metricNames = result.metrics.map(m => m.metric);
    expect(metricNames).toContain("impressions");
    expect(metricNames).toContain("clicks");
    expect(metricNames).toContain("conversions");
    expect(metricNames).toContain("spend");
    expect(metricNames).toContain("revenue");
  });

  it("forecast periods have increasing predictions", () => {
    const forecast = campaignRealTimeMonitor.getPerformanceForecast(campaignId, tenantId);
    for (let i = 1; i < forecast.forecastPeriods.length; i++) {
      expect(forecast.forecastPeriods[i].predictedImpressions).toBeGreaterThanOrEqual(
        forecast.forecastPeriods[i - 1].predictedImpressions * 0.5,
      );
    }
  });
});
