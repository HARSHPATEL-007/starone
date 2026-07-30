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

describe("CampaignSegmentDiscovery - segmentLookalikeModeling", () => {
  it("generates lookalike segments from seed", () => {
    const look = campaignSegmentDiscovery.segmentLookalikeModeling(TEST_TENANT);
    expect(look.sourceSegment).toBeTruthy();
    expect(look.lookalikeSegments.length).toBeGreaterThan(0);
    expect(look.totalLookalikeReach).toBeGreaterThan(0);
    expect(look.qualityScore).toBeGreaterThan(0);
    look.lookalikeSegments.forEach(l => {
      expect(l.name).toBeTruthy();
      expect(l.similarity).toBeGreaterThan(0);
      expect(l.estimatedSize).toBeGreaterThan(0);
      expect(l.recommendation).toBeTruthy();
    });
  });
});

describe("CampaignSegmentDiscovery - segmentPropensityScoring", () => {
  it("scores segments by conversion propensity", () => {
    const prop = campaignSegmentDiscovery.segmentPropensityScoring(TEST_TENANT);
    expect(prop.segments.length).toBeGreaterThan(0);
    expect(prop.topSegment).toBeTruthy();
    expect(prop.portfolioPropensity).toBeGreaterThan(0);
    prop.segments.forEach(s => {
      expect(s.propensityScore).toBeGreaterThan(0);
      expect(s.conversionProbability).toBeGreaterThan(0);
      expect(s.lifetimeValue).toBeGreaterThan(0);
      expect(["high", "medium", "low"]).toContain(s.priority);
    });
  });
});

describe("CampaignSegmentDiscovery - segmentLifecycleAnalysis", () => {
  it("analyzes segment lifecycle stages", () => {
    const life = campaignSegmentDiscovery.segmentLifecycleAnalysis(TEST_TENANT);
    expect(life.segments.length).toBeGreaterThan(0);
    expect(life.overallPortfolioStage).toBeTruthy();
    expect(life.fastestGrowing).toBeTruthy();
    expect(life.fastestDeclining).toBeTruthy();
    life.segments.forEach(s => {
      expect(["introduction", "growth", "maturity", "decline"]).toContain(s.maturityStage);
      expect(s.recommendation).toBeTruthy();
    });
  });
});

describe("CampaignSegmentDiscovery - segmentCrossSellAnalysis", () => {
  it("identifies cross-sell opportunities", () => {
    const cross = campaignSegmentDiscovery.segmentCrossSellAnalysis(TEST_TENANT);
    expect(cross.opportunities.length).toBeGreaterThan(0);
    expect(cross.topOpportunity).toBeTruthy();
    expect(cross.portfolioUpsellIndex).toBeGreaterThan(0);
    cross.opportunities.forEach(o => {
      expect(o.sourceSegment).toBeTruthy();
      expect(o.targetSegment).toBeTruthy();
      expect(o.crossSellPotential).toBeGreaterThan(0);
      expect(o.strategy).toBeTruthy();
    });
  });
});

describe("CampaignSegmentDiscovery - segmentAttributionByChannel", () => {
  it("attributes segment performance to channels", () => {
    const attr = campaignSegmentDiscovery.segmentAttributionByChannel(TEST_TENANT);
    expect(attr.segmentChannelBreakdown.length).toBeGreaterThan(0);
    expect(attr.overallTopChannel).toBeTruthy();
    expect(attr.channelDiversity).toBeGreaterThan(0);
    attr.segmentChannelBreakdown.forEach(s => {
      expect(s.segmentName).toBeTruthy();
      expect(s.primaryChannel).toBeTruthy();
      expect(s.channels.length).toBeGreaterThan(0);
    });
  });
});

describe("CampaignSegmentDiscovery - segmentOptimizationScorecard", () => {
  it("generates optimization scorecard", () => {
    const sc = campaignSegmentDiscovery.segmentOptimizationScorecard(TEST_TENANT);
    expect(sc.segments.length).toBeGreaterThan(0);
    expect(sc.topSegment).toBeTruthy();
    expect(sc.portfolioHealthScore).toBeGreaterThan(0);
    expect(sc.primaryRecommendation).toBeTruthy();
    sc.segments.forEach(s => {
      expect(s.compositeScore).toBeGreaterThan(0);
      expect(s.action).toBeTruthy();
    });
  });
});

describe("CampaignSegmentDiscovery - deterministic", () => {
  it("discoverSegments is deterministic", () => {
    const r1 = campaignSegmentDiscovery.discoverSegments(TEST_TENANT);
    const r2 = campaignSegmentDiscovery.discoverSegments(TEST_TENANT);
    expect(r1.segments.length).toBe(r2.segments.length);
    expect(r1.segments[0].name).toBe(r2.segments[0].name);
    expect(r1.segments[0].roas).toBe(r2.segments[0].roas);
  });

  it("deep methods are deterministic", () => {
    const p1 = campaignSegmentDiscovery.segmentPropensityScoring(TEST_TENANT);
    const p2 = campaignSegmentDiscovery.segmentPropensityScoring(TEST_TENANT);
    expect(p1.topSegment).toBe(p2.topSegment);
    expect(p1.portfolioPropensity).toBe(p2.portfolioPropensity);

    const c1 = campaignSegmentDiscovery.segmentCrossSellAnalysis(TEST_TENANT);
    const c2 = campaignSegmentDiscovery.segmentCrossSellAnalysis(TEST_TENANT);
    expect(c1.topOpportunity).toBe(c2.topOpportunity);
  });
});
