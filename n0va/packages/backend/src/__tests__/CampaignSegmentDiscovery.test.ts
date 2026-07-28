import { describe, it, expect, beforeAll } from "vitest";
import { campaignSegmentDiscovery } from "../services/CampaignSegmentDiscoveryService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_seg_tenant";
const TEST_CAMPAIGN = "test_seg_camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "SegmentDiscovery Test", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
});

describe("CampaignSegmentDiscovery - discoverSegments", () => {
  it("returns discovered segments sorted by ROAS", () => {
    const report = campaignSegmentDiscovery.discoverSegments(TEST_TENANT);
    expect(report.tenantId).toBe(TEST_TENANT);
    expect(report.segments.length).toBe(12);
    expect(report.totalAudienceSize).toBeGreaterThan(0);
    expect(report.averageSegmentQuality).toBeGreaterThan(0);
    for (const s of report.segments) {
      expect(s).toHaveProperty("segmentId");
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("size");
      expect(Array.isArray(s.keyCharacteristics)).toBe(true);
      expect(s).toHaveProperty("conversionRate");
      expect(s).toHaveProperty("roas");
      expect(s).toHaveProperty("clusterQuality");
    }
    for (let i = 1; i < report.segments.length; i++) {
      expect(report.segments[i - 1].roas).toBeGreaterThanOrEqual(report.segments[i].roas);
    }
    expect(Array.isArray(report.recommendations)).toBe(true);
  });
});

describe("CampaignSegmentDiscovery - analyzeSegmentPerformance", () => {
  it("returns performance details per segment", () => {
    const perf = campaignSegmentDiscovery.analyzeSegmentPerformance(TEST_TENANT);
    expect(Array.isArray(perf)).toBe(true);
    expect(perf.length).toBe(12);
    for (const p of perf) {
      expect(p).toHaveProperty("segmentName");
      expect(p).toHaveProperty("conversions");
      expect(p).toHaveProperty("revenue");
      expect(p).toHaveProperty("roas");
      expect(p).toHaveProperty("performanceScore");
      expect(p).toHaveProperty("trend");
    }
  });
});

describe("CampaignSegmentDiscovery - recommendSegmentTargeting", () => {
  it("returns targeting recommendations sorted by priority", () => {
    const recs = campaignSegmentDiscovery.recommendSegmentTargeting(TEST_TENANT);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBe(12);
    for (const r of recs) {
      expect(r).toHaveProperty("segmentName");
      expect(r).toHaveProperty("segmentSize");
      expect(r).toHaveProperty("conversionRate");
      expect(r).toHaveProperty("recommendation");
      expect(r).toHaveProperty("suggestedBidMultiplier");
      expect(r).toHaveProperty("priority");
    }
  });
});

describe("CampaignSegmentDiscovery - compareSegments", () => {
  it("returns pairwise segment comparisons", () => {
    const comps = campaignSegmentDiscovery.compareSegments(TEST_TENANT);
    expect(Array.isArray(comps)).toBe(true);
    expect(comps.length).toBeGreaterThan(0);
    for (const c of comps) {
      expect(c).toHaveProperty("segmentA");
      expect(c).toHaveProperty("segmentB");
      expect(c).toHaveProperty("roasDiff");
      expect(c).toHaveProperty("insight");
    }
  });
});

describe("CampaignSegmentDiscovery - segmentTrends", () => {
  it("returns 6-week trend data per segment", () => {
    const trends = campaignSegmentDiscovery.segmentTrends(TEST_TENANT);
    expect(Array.isArray(trends)).toBe(true);
    expect(trends.length).toBe(8);
    for (const t of trends) {
      expect(t).toHaveProperty("segmentName");
      expect(t).toHaveProperty("overallDirection");
      expect(Array.isArray(t.metrics)).toBe(true);
      for (const m of t.metrics) {
        expect(m).toHaveProperty("metric");
        expect(Array.isArray(m.values)).toBe(true);
        expect(m.values.length).toBe(6);
        expect(m).toHaveProperty("direction");
      }
    }
  });
});

describe("CampaignSegmentDiscovery - segmentOverlapAnalysis", () => {
  it("returns overlap analysis between top segments", () => {
    const overlap = campaignSegmentDiscovery.segmentOverlapAnalysis(TEST_TENANT);
    expect(Array.isArray(overlap)).toBe(true);
    expect(overlap.length).toBeGreaterThan(0);
    for (const o of overlap) {
      expect(o).toHaveProperty("segmentA");
      expect(o).toHaveProperty("segmentB");
      expect(o).toHaveProperty("overlapPercent");
      expect(o).toHaveProperty("jaccardSimilarity");
      expect(o).toHaveProperty("interpretation");
    }
  });
});
