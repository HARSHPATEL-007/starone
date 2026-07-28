import { describe, it, expect, beforeAll } from "vitest";
import { campaignAdPlacementAnalyzer } from "../services/CampaignAdPlacementAnalyzerService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_pl_tenant";
const TEST_CAMPAIGN = "test_pl_camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "PlacementAnalyzer Test", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
});

describe("CampaignAdPlacementAnalyzer - analyzePlacementPerformance", () => {
  it("returns placement performance breakdown", () => {
    const report = campaignAdPlacementAnalyzer.analyzePlacementPerformance(TEST_CAMPAIGN, TEST_TENANT);
    expect(report).not.toBeNull();
    expect(report!.campaignId).toBe(TEST_CAMPAIGN);
    expect(report!.placements.length).toBe(18);
    for (const pl of report!.placements) {
      expect(pl).toHaveProperty("publisher");
      expect(pl).toHaveProperty("category");
      expect(pl).toHaveProperty("format");
      expect(pl).toHaveProperty("ctr");
      expect(pl).toHaveProperty("cvr");
      expect(pl).toHaveProperty("roas");
      expect(pl).toHaveProperty("performanceScore");
      expect(pl).toHaveProperty("status");
    }
    expect(report!.bestPlacement).toBeTruthy();
    expect(report!.worstPlacement).toBeTruthy();
    expect(Array.isArray(report!.categorySummary)).toBe(true);
    expect(report!.categorySummary.length).toBeGreaterThan(0);
    for (const cs of report!.categorySummary) {
      expect(cs).toHaveProperty("category");
      expect(cs).toHaveProperty("avgROAS");
      expect(cs).toHaveProperty("placementCount");
    }
    expect(Array.isArray(report!.recommendations)).toBe(true);
  });

  it("returns null for unknown campaign", () => {
    expect(campaignAdPlacementAnalyzer.analyzePlacementPerformance("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignAdPlacementAnalyzer - generatePlacementRecommendations", () => {
  it("returns recommendations per placement", () => {
    const recs = campaignAdPlacementAnalyzer.generatePlacementRecommendations(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBe(18);
    for (const r of recs) {
      expect(r).toHaveProperty("publisher");
      expect(r).toHaveProperty("format");
      expect(r).toHaveProperty("recommendation");
      expect(r).toHaveProperty("bidAdjustment");
      expect(r).toHaveProperty("priority");
    }
  });
});

describe("CampaignAdPlacementAnalyzer - identifyPlacementOpportunities", () => {
  it("returns untapped placement opportunities", () => {
    const opps = campaignAdPlacementAnalyzer.identifyPlacementOpportunities(TEST_TENANT);
    expect(Array.isArray(opps)).toBe(true);
    expect(opps.length).toBe(12);
    for (const o of opps) {
      expect(o).toHaveProperty("publisher");
      expect(o).toHaveProperty("category");
      expect(o).toHaveProperty("estimatedReach");
      expect(o).toHaveProperty("projectedROAS");
      expect(o).toHaveProperty("entryDifficulty");
      expect(o).toHaveProperty("recommendation");
    }
    for (let i = 1; i < opps.length; i++) {
      expect(opps[i - 1].projectedROAS).toBeGreaterThanOrEqual(opps[i].projectedROAS);
    }
  });
});

describe("CampaignAdPlacementAnalyzer - calculatePlacementBidAdjustments", () => {
  it("returns bid adjustments per placement", () => {
    const adj = campaignAdPlacementAnalyzer.calculatePlacementBidAdjustments(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(adj)).toBe(true);
    expect(adj.length).toBe(18);
    for (const a of adj) {
      expect(a).toHaveProperty("publisher");
      expect(a).toHaveProperty("format");
      expect(a).toHaveProperty("currentBidMultiplier");
      expect(a).toHaveProperty("recommendedMultiplier");
      expect(a).toHaveProperty("rationale");
    }
  });
});

describe("CampaignAdPlacementAnalyzer - analyzePlacementOverlap", () => {
  it("returns overlap between placement categories", () => {
    const overlap = campaignAdPlacementAnalyzer.analyzePlacementOverlap(TEST_TENANT);
    expect(Array.isArray(overlap)).toBe(true);
    expect(overlap.length).toBe(10);
    for (const o of overlap) {
      expect(o).toHaveProperty("publisherA");
      expect(o).toHaveProperty("publisherB");
      expect(o).toHaveProperty("overlapPercent");
      expect(o).toHaveProperty("interpretation");
    }
  });
});

describe("CampaignAdPlacementAnalyzer - analyzePlacementTrends", () => {
  it("returns trends for top placements", () => {
    const trends = campaignAdPlacementAnalyzer.analyzePlacementTrends(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(trends)).toBe(true);
    expect(trends.length).toBe(10);
    for (const t of trends) {
      expect(t).toHaveProperty("publisher");
      expect(t).toHaveProperty("format");
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
