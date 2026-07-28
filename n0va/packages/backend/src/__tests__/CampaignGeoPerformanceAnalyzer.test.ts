import { describe, it, expect, beforeAll } from "vitest";
import { campaignGeoPerformanceAnalyzer } from "../services/CampaignGeoPerformanceAnalyzerService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_geo_tenant";
const TEST_CAMPAIGN = "test_geo_camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "GeoPerformance Test", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
});

describe("CampaignGeoPerformanceAnalyzer - analyzeGeoPerformance", () => {
  it("returns geographic performance breakdown with multiple locations", () => {
    const report = campaignGeoPerformanceAnalyzer.analyzeGeoPerformance(TEST_CAMPAIGN, TEST_TENANT);
    expect(report).not.toBeNull();
    expect(report!.campaignId).toBe(TEST_CAMPAIGN);
    expect(report!.locations.length).toBeGreaterThan(0);
    for (const loc of report!.locations) {
      expect(loc).toHaveProperty("country");
      expect(loc).toHaveProperty("region");
      expect(loc).toHaveProperty("city");
      expect(loc).toHaveProperty("ctr");
      expect(loc).toHaveProperty("cvr");
      expect(loc).toHaveProperty("roas");
      expect(loc).toHaveProperty("performanceScore");
      expect(loc).toHaveProperty("status");
    }
    expect(report!.topRegion).toBeTruthy();
    expect(report!.bottomRegion).toBeTruthy();
    expect(Array.isArray(report!.countrySummary)).toBe(true);
    expect(report!.countrySummary.length).toBeGreaterThan(0);
    for (const cs of report!.countrySummary) {
      expect(cs).toHaveProperty("country");
      expect(cs).toHaveProperty("roas");
      expect(cs).toHaveProperty("locationCount");
    }
    expect(Array.isArray(report!.recommendations)).toBe(true);
  });

  it("returns null for unknown campaign", () => {
    expect(campaignGeoPerformanceAnalyzer.analyzeGeoPerformance("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignGeoPerformanceAnalyzer - generateGeoOptimizationRecommendations", () => {
  it("returns geo optimization recommendations per region", () => {
    const recs = campaignGeoPerformanceAnalyzer.generateGeoOptimizationRecommendations(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(r).toHaveProperty("location");
      expect(r).toHaveProperty("country");
      expect(r).toHaveProperty("recommendation");
      expect(r).toHaveProperty("bidAdjustment");
      expect(r).toHaveProperty("priority");
    }
  });
});

describe("CampaignGeoPerformanceAnalyzer - identifyGeoExpansionOpportunities", () => {
  it("returns expansion opportunities sorted by projected ROAS", () => {
    const opps = campaignGeoPerformanceAnalyzer.identifyGeoExpansionOpportunities(TEST_TENANT);
    expect(Array.isArray(opps)).toBe(true);
    expect(opps.length).toBeGreaterThan(0);
    for (const o of opps) {
      expect(o).toHaveProperty("country");
      expect(o).toHaveProperty("region");
      expect(o).toHaveProperty("estimatedMarketSize");
      expect(o).toHaveProperty("competitionLevel");
      expect(o).toHaveProperty("projectedROAS");
      expect(o).toHaveProperty("entryDifficulty");
      expect(o).toHaveProperty("recommendation");
    }
    for (let i = 1; i < opps.length; i++) {
      expect(opps[i - 1].projectedROAS).toBeGreaterThanOrEqual(opps[i].projectedROAS);
    }
  });
});

describe("CampaignGeoPerformanceAnalyzer - calculateGeoBidAdjustments", () => {
  it("returns bid adjustment recommendations per region", () => {
    const adj = campaignGeoPerformanceAnalyzer.calculateGeoBidAdjustments(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(adj)).toBe(true);
    expect(adj.length).toBeGreaterThan(0);
    for (const a of adj) {
      expect(a).toHaveProperty("location");
      expect(a).toHaveProperty("country");
      expect(a).toHaveProperty("currentBidMultiplier");
      expect(a).toHaveProperty("recommendedMultiplier");
      expect(a).toHaveProperty("rationale");
    }
  });
});

describe("CampaignGeoPerformanceAnalyzer - analyzeGeoAudienceOverlap", () => {
  it("returns country-to-country audience overlap", () => {
    const overlap = campaignGeoPerformanceAnalyzer.analyzeGeoAudienceOverlap(TEST_TENANT);
    expect(Array.isArray(overlap)).toBe(true);
    expect(overlap.length).toBeGreaterThan(0);
    for (const o of overlap) {
      expect(o).toHaveProperty("countryA");
      expect(o).toHaveProperty("countryB");
      expect(o).toHaveProperty("overlapPercent");
      expect(o).toHaveProperty("interpretation");
    }
  });
});

describe("CampaignGeoPerformanceAnalyzer - analyzeGeoTrends", () => {
  it("returns trend analysis per region", () => {
    const trends = campaignGeoPerformanceAnalyzer.analyzeGeoTrends(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(trends)).toBe(true);
    expect(trends.length).toBeGreaterThan(0);
    for (const t of trends) {
      expect(t).toHaveProperty("location");
      expect(t).toHaveProperty("country");
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
