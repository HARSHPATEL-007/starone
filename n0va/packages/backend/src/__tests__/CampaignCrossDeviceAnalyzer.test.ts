import { describe, it, expect, beforeAll } from "vitest";
import { campaignCrossDeviceAnalyzer } from "../services/CampaignCrossDeviceAnalyzerService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_cda_tenant";
const TEST_CAMPAIGN = "test_cda_camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "CrossDevice Test", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
});

describe("CampaignCrossDeviceAnalyzer - analyzeCrossDevice", () => {
  it("returns device-level performance breakdown", () => {
    const report = campaignCrossDeviceAnalyzer.analyzeCrossDevice(TEST_CAMPAIGN, TEST_TENANT);
    expect(report).not.toBeNull();
    expect(report!.campaignId).toBe(TEST_CAMPAIGN);
    expect(report!.devices.length).toBe(3);
    const deviceTypes = report!.devices.map(d => d.device).sort();
    expect(deviceTypes).toEqual(["desktop", "mobile", "tablet"]);
    for (const d of report!.devices) {
      expect(d).toHaveProperty("ctr");
      expect(d).toHaveProperty("cvr");
      expect(d).toHaveProperty("roas");
      expect(d).toHaveProperty("performanceScore");
      expect(d).toHaveProperty("status");
    }
    expect(report!.bestDevice).toBeTruthy();
    expect(report!.worstDevice).toBeTruthy();
    expect(Array.isArray(report!.recommendations)).toBe(true);
    expect(report!.mobileVsDesktop).toHaveProperty("ratio");
  });

  it("returns null for unknown campaign", () => {
    expect(campaignCrossDeviceAnalyzer.analyzeCrossDevice("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignCrossDeviceAnalyzer - generateDeviceRecommendations", () => {
  it("returns optimization recommendations per device", () => {
    const recs = campaignCrossDeviceAnalyzer.generateDeviceRecommendations(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBe(3);
    for (const r of recs) {
      expect(r).toHaveProperty("device");
      expect(r).toHaveProperty("recommendation");
      expect(r).toHaveProperty("bidAdjustment");
      expect(r).toHaveProperty("priority");
    }
  });
});

describe("CampaignCrossDeviceAnalyzer - analyzeConversionPaths", () => {
  it("returns cross-device conversion paths sorted by frequency", () => {
    const paths = campaignCrossDeviceAnalyzer.analyzeConversionPaths(TEST_TENANT);
    expect(Array.isArray(paths)).toBe(true);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(p).toHaveProperty("path");
      expect(p).toHaveProperty("frequency");
      expect(p).toHaveProperty("conversions");
      expect(p).toHaveProperty("conversionValue");
    }
    for (let i = 1; i < paths.length; i++) {
      expect(paths[i - 1].frequency).toBeGreaterThanOrEqual(paths[i].frequency);
    }
  });
});

describe("CampaignCrossDeviceAnalyzer - calculateBidAdjustments", () => {
  it("returns bid adjustment recommendations per device", () => {
    const adj = campaignCrossDeviceAnalyzer.calculateBidAdjustments(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(adj)).toBe(true);
    expect(adj.length).toBe(3);
    for (const a of adj) {
      expect(a).toHaveProperty("device");
      expect(a).toHaveProperty("currentBidMultiplier");
      expect(a).toHaveProperty("recommendedMultiplier");
      expect(a).toHaveProperty("rationale");
    }
  });
});

describe("CampaignCrossDeviceAnalyzer - analyzeDeviceAudienceOverlap", () => {
  it("returns overlap analysis across device pairs", () => {
    const overlap = campaignCrossDeviceAnalyzer.analyzeDeviceAudienceOverlap(TEST_TENANT);
    expect(Array.isArray(overlap)).toBe(true);
    expect(overlap.length).toBe(3);
    for (const o of overlap) {
      expect(o).toHaveProperty("deviceA");
      expect(o).toHaveProperty("deviceB");
      expect(o).toHaveProperty("overlapPercent");
      expect(o).toHaveProperty("interpretation");
    }
  });
});

describe("CampaignCrossDeviceAnalyzer - analyzeDeviceTrends", () => {
  it("returns trend analysis for each device", () => {
    const trends = campaignCrossDeviceAnalyzer.analyzeDeviceTrends(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(trends)).toBe(true);
    expect(trends.length).toBe(3);
    for (const t of trends) {
      expect(t).toHaveProperty("device");
      expect(t).toHaveProperty("overallDirection");
      expect(Array.isArray(t.metrics)).toBe(true);
      expect(t.metrics.length).toBeGreaterThan(0);
      for (const m of t.metrics) {
        expect(m).toHaveProperty("metric");
        expect(m).toHaveProperty("direction");
      }
    }
  });
});
