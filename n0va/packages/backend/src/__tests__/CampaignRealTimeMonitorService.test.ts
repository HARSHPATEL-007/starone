import { describe, it, expect, beforeAll } from "vitest";
import { CampaignRealTimeMonitorService } from "../services/CampaignRealTimeMonitorService";
import { DataStore } from "../services/DataStore";

const service = new CampaignRealTimeMonitorService();
const T = "mon-test-tenant";
const C = "mon-test-camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: C, name: "RTM Test Campaign", tenantId: T, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
});

describe("CampaignRealTimeMonitor - getRealTimeComparison", () => {
  it("returns benchmark comparison snapshot", () => {
    const r = service.getRealTimeComparison(C, T);
    expect(r.campaignId).toBe(C);
    expect(Array.isArray(r.currentSnapshot)).toBe(true);
    expect(r.currentSnapshot.length).toBeGreaterThan(0);
    for (const s of r.currentSnapshot) {
      expect(s).toHaveProperty("metric");
      expect(s).toHaveProperty("value");
      expect(s).toHaveProperty("benchmark");
      expect(s).toHaveProperty("deviation");
      expect(["above", "below", "on_par"]).toContain(s.status);
    }
    expect(["outperforming", "underperforming", "on_track"]).toContain(r.overallStatus);
    expect(r.comparisonPeriod).toBe("last_30_days");
  });
});

describe("CampaignRealTimeMonitor - detectSpikes", () => {
  it("returns spike detection results", () => {
    const r = service.detectSpikes(C, T);
    expect(r.campaignId).toBe(C);
    expect(Array.isArray(r.spikes)).toBe(true);
    expect(r.spikeCount).toBeGreaterThanOrEqual(0);
    for (const s of r.spikes) {
      expect(s).toHaveProperty("metric");
      expect(s).toHaveProperty("timestamp");
      expect(s).toHaveProperty("value");
      expect(s.expectedRange).toHaveProperty("low");
      expect(s.expectedRange).toHaveProperty("high");
      expect(s).toHaveProperty("magnitude");
      expect(s).toHaveProperty("possibleCause");
    }
  });
});

describe("CampaignRealTimeMonitor - analyzeMetricCorrelations", () => {
  it("returns metric correlation pairs", () => {
    const r = service.analyzeMetricCorrelations(C, T);
    expect(r.campaignId).toBe(C);
    expect(Array.isArray(r.correlations)).toBe(true);
    expect(r.correlations.length).toBeGreaterThan(0);
    for (const c of r.correlations) {
      expect(c).toHaveProperty("metricA");
      expect(c).toHaveProperty("metricB");
      expect(c).toHaveProperty("pearsonR");
      expect(c).toHaveProperty("lagMinutes");
      expect(c).toHaveProperty("relationship");
    }
    expect(typeof r.strongestCorrelation).toBe("string");
  });
});

describe("CampaignRealTimeMonitor - getRealTimeBreakdown", () => {
  it("returns dimension breakdown", () => {
    const r = service.getRealTimeBreakdown(C, T);
    expect(r.campaignId).toBe(C);
    expect(Array.isArray(r.dimensions)).toBe(true);
    expect(r.dimensions.length).toBeGreaterThan(0);
    for (const d of r.dimensions) {
      expect(d).toHaveProperty("dimension");
      expect(d).toHaveProperty("value");
      expect(d).toHaveProperty("impressions");
      expect(d).toHaveProperty("efficiency");
    }
    expect(typeof r.topDimension).toBe("string");
    expect(typeof r.worstDimension).toBe("string");
  });
});

describe("CampaignRealTimeMonitor - getAlertHistory", () => {
  it("returns alert history with stats", () => {
    const r = service.getAlertHistory(C, T);
    expect(r.campaignId).toBe(C);
    expect(Array.isArray(r.alerts)).toBe(true);
    expect(r.totalAlerts).toBeGreaterThanOrEqual(0);
    expect(r.openAlerts).toBeGreaterThanOrEqual(0);
    expect(r.avgResponseTime).toBeGreaterThanOrEqual(0);
  });
});

describe("CampaignRealTimeMonitor - getRealTimeDashboard", () => {
  it("returns aggregated dashboard", () => {
    const r = service.getRealTimeDashboard(C, T);
    expect(r.campaignId).toBe(C);
    expect(r.metrics).toHaveProperty("ctr");
    expect(r.metrics).toHaveProperty("cvr");
    expect(r.metrics).toHaveProperty("roas");
    expect(typeof r.anomalyCount).toBe("number");
    expect(typeof r.forecastedROAS).toBe("number");
    expect(typeof r.healthScore).toBe("number");
    expect(r.lastUpdated).toBeTruthy();
  });
});
