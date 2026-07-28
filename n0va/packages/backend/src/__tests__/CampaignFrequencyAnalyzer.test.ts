import { describe, it, expect, beforeAll } from "vitest";
import { campaignFrequencyAnalyzer } from "../services/CampaignFrequencyAnalyzerService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_freq_tenant";
const TEST_CAMPAIGN = "test_freq_camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "FrequencyAnalyzer Test", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN + "_b", name: "Frequency Test B", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 300, lifetime: 9000, spent: 3000, remaining: 6000, currency: "USD" },
    metrics: { impressions: 30000, clicks: 1200, conversions: 60, revenue: 9000, spend: 3000 },
    startDate: "2025-02-01", endDate: "2025-12-31",
  });
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN + "_c", name: "Frequency Test C", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 200, lifetime: 6000, spent: 2000, remaining: 4000, currency: "USD" },
    metrics: { impressions: 20000, clicks: 800, conversions: 40, revenue: 6000, spend: 2000 },
    startDate: "2025-03-01", endDate: "2025-12-31",
  });
});

describe("CampaignFrequencyAnalyzer - analyzeFrequencyDistribution", () => {
  it("returns frequency distribution with buckets", () => {
    const report = campaignFrequencyAnalyzer.analyzeFrequencyDistribution(TEST_CAMPAIGN, TEST_TENANT);
    expect(report).not.toBeNull();
    expect(report!.campaignId).toBe(TEST_CAMPAIGN);
    expect(report!.frequencyBuckets.length).toBe(6);
    expect(report!.averageFrequency).toBeGreaterThan(0);
    expect(report!.optimalFrequency).toBeGreaterThan(0);
    expect(report!.wearOutFrequency).toBeGreaterThan(0);
    for (const b of report!.frequencyBuckets) {
      expect(b).toHaveProperty("range");
      expect(b).toHaveProperty("conversions");
      expect(b).toHaveProperty("conversionRate");
      expect(b).toHaveProperty("status");
    }
    expect(Array.isArray(report!.recommendations)).toBe(true);
  });

  it("returns null for unknown campaign", () => {
    expect(campaignFrequencyAnalyzer.analyzeFrequencyDistribution("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignFrequencyAnalyzer - generateFrequencyOptimizationRecommendations", () => {
  it("returns optimization recommendations per campaign", () => {
    const recs = campaignFrequencyAnalyzer.generateFrequencyOptimizationRecommendations(TEST_TENANT);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(r).toHaveProperty("campaignName");
      expect(r).toHaveProperty("currentAverage");
      expect(r).toHaveProperty("targetFrequency");
      expect(r).toHaveProperty("recommendation");
      expect(r).toHaveProperty("priority");
    }
  });
});

describe("CampaignFrequencyAnalyzer - analyzeWearOutCurve", () => {
  it("returns wear-out analysis across frequency buckets", () => {
    const curve = campaignFrequencyAnalyzer.analyzeWearOutCurve(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(curve)).toBe(true);
    expect(curve.length).toBe(6);
    for (const c of curve) {
      expect(c).toHaveProperty("frequency");
      expect(c).toHaveProperty("conversionRate");
      expect(c).toHaveProperty("phase");
      expect(c).toHaveProperty("description");
    }
  });
});

describe("CampaignFrequencyAnalyzer - calculateFrequencyCapping", () => {
  it("returns frequency cap recommendations per channel", () => {
    const caps = campaignFrequencyAnalyzer.calculateFrequencyCapping(TEST_TENANT);
    expect(Array.isArray(caps)).toBe(true);
    expect(caps.length).toBe(5);
    for (const c of caps) {
      expect(c).toHaveProperty("channel");
      expect(c).toHaveProperty("currentMaxFrequency");
      expect(c).toHaveProperty("recommendedCap");
      expect(c).toHaveProperty("rationale");
    }
  });
});

describe("CampaignFrequencyAnalyzer - analyzeCrossCampaignFrequency", () => {
  it("returns cross-campaign frequency overlap sorted by waste", () => {
    const results = campaignFrequencyAnalyzer.analyzeCrossCampaignFrequency(TEST_TENANT);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty("campaignPair");
      expect(r).toHaveProperty("audienceOverlap");
      expect(r).toHaveProperty("wastePercent");
      expect(r).toHaveProperty("recommendation");
    }
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].wastePercent).toBeGreaterThanOrEqual(results[i].wastePercent);
    }
  });
});

describe("CampaignFrequencyAnalyzer - predictFrequencyImpact", () => {
  it("returns impact predictions for frequency scenarios", () => {
    const predictions = campaignFrequencyAnalyzer.predictFrequencyImpact(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(predictions)).toBe(true);
    expect(predictions.length).toBe(5);
    for (const p of predictions) {
      expect(p).toHaveProperty("currentFrequency");
      expect(p).toHaveProperty("proposedFrequency");
      expect(p).toHaveProperty("predictedImpressionChange");
      expect(p).toHaveProperty("predictedConversionChange");
      expect(p).toHaveProperty("confidence");
    }
  });
});
