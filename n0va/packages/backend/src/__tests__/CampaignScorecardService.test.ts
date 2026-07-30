import { describe, it, expect, beforeAll } from "vitest";
import { campaignScorecardService } from "../services/CampaignScorecardService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_sc_tenant";
const TEST_CAMPAIGN = "test_sc_camp";

beforeAll(() => {
  const mem = DataStore.mem();
  for (let i = 0; i < 8; i++) {
    mem.insert("campaigns", {
      _id: `sc_camp_${i}`, name: `Scorecard Camp ${i}`, tenantId: TEST_TENANT,
      status: i < 6 ? "active" : "paused",
      budget: { daily: 200 + i * 50, lifetime: 30000 + i * 5000, spent: 5000 + i * 1000, remaining: 25000 + i * 4000, currency: "USD" },
    });
    for (let j = 0; j < 10; j++) {
      mem.insert("metrics", {
        campaignId: `sc_camp_${i}`, date: new Date(2025, 0, j + 1).toISOString(),
        impressions: 5000 + i * 1000 + j * 200,
        clicks: 200 + i * 40 + j * 10,
        conversions: 10 + i * 3 + j,
        spend: 400 + i * 50 + j * 20,
        revenue: 1200 + i * 300 + j * 80,
      });
    }
  }
  mem.insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "Scorecard Test", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 8000, remaining: 7000, currency: "USD" },
  });
  for (let j = 0; j < 14; j++) {
    mem.insert("metrics", {
      campaignId: TEST_CAMPAIGN, date: new Date(2025, 0, j + 1).toISOString(),
      impressions: 8000 + j * 300, clicks: 350 + j * 15,
      conversions: 18 + j * 2, spend: 600 + j * 30, revenue: 2000 + j * 150,
    });
  }
});

describe("CampaignScorecardService - getScorecard", () => {
  it("returns scorecard with all campaigns", () => {
    const r = campaignScorecardService.getScorecard(TEST_TENANT);
    expect(r).toHaveProperty("campaigns");
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(r.campaigns.length).toBe(9);
    expect(r).toHaveProperty("summary");
    expect(r.summary).toHaveProperty("totalCampaigns");
    expect(r.summary).toHaveProperty("avgScore");
    expect(r).toHaveProperty("distribution");
    expect(Array.isArray(r.distribution)).toBe(true);
    expect(r).toHaveProperty("weights");
    expect(r).toHaveProperty("trendSummary");
    expect(r).toHaveProperty("percentiles");
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignId");
      expect(c).toHaveProperty("campaignName");
      expect(c).toHaveProperty("overall");
      expect(c).toHaveProperty("scores");
      expect(c.scores).toHaveProperty("health");
      expect(c.scores).toHaveProperty("roi");
      expect(c.scores).toHaveProperty("engagement");
      expect(c.scores).toHaveProperty("conversion");
      expect(c.scores).toHaveProperty("efficiency");
    }
  });

  it("returns scorecard for single campaign", () => {
    const r = campaignScorecardService.getScorecard(TEST_TENANT, TEST_CAMPAIGN);
    expect(r.campaigns.length).toBe(1);
    expect(r.campaigns[0].campaignId).toBe(TEST_CAMPAIGN);
  });
});

describe("CampaignScorecardService - setWeights", () => {
  it("updates weights and persists", () => {
    campaignScorecardService.setWeights({ roi: 3, health: 2 });
    const r = campaignScorecardService.getScorecard(TEST_TENANT, TEST_CAMPAIGN);
    expect(r.weights.roi).toBe(3);
    expect(r.weights.health).toBe(2);
    campaignScorecardService.setWeights({ health: 1, roi: 1, engagement: 1, conversion: 1, efficiency: 1 });
  });
});

describe("CampaignScorecardService - scorecardTrendAnalysis", () => {
  it("returns trend analysis with projection", () => {
    const r = campaignScorecardService.scorecardTrendAnalysis(TEST_CAMPAIGN, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(TEST_CAMPAIGN);
    expect(Array.isArray(r!.trends)).toBe(true);
    expect(r!.trends.length).toBe(13);
    for (const t of r!.trends) {
      expect(t).toHaveProperty("period");
      expect(t).toHaveProperty("avgScore");
      expect(t).toHaveProperty("dimensionAverages");
      expect(t.dimensionAverages.length).toBe(5);
    }
    expect(["improving", "declining", "stable"]).toContain(r!.direction);
    expect(["low", "medium", "high"]).toContain(r!.volatility);
    expect(r!.projectedScore).toBeGreaterThanOrEqual(0);
    expect(typeof r!.recommendation).toBe("string");
  });

  it("returns null for unknown campaign", () => {
    expect(campaignScorecardService.scorecardTrendAnalysis("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignScorecardService - scorecardDimensionBreakdown", () => {
  it("returns dimension breakdown with balance score", () => {
    const r = campaignScorecardService.scorecardDimensionBreakdown(TEST_CAMPAIGN, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(TEST_CAMPAIGN);
    expect(Array.isArray(r!.dimensions)).toBe(true);
    expect(r!.dimensions.length).toBe(5);
    for (const d of r!.dimensions) {
      expect(d).toHaveProperty("dimension");
      expect(d).toHaveProperty("score");
      expect(d).toHaveProperty("weight");
      expect(d).toHaveProperty("weightedContribution");
      expect(d).toHaveProperty("percentile");
      expect(d).toHaveProperty("trend");
      expect(Array.isArray(d.topContributors)).toBe(true);
      expect(Array.isArray(d.improvementSuggestions)).toBe(true);
    }
    expect(typeof r!.primaryStrength).toBe("string");
    expect(typeof r!.primaryWeakness).toBe("string");
    expect(r!.balanceScore).toBeGreaterThanOrEqual(0);
  });
});

describe("CampaignScorecardService - scorecardAnomalyDetection", () => {
  it("returns anomalies across campaigns", () => {
    const r = campaignScorecardService.scorecardAnomalyDetection(TEST_TENANT);
    expect(r).toHaveProperty("anomalies");
    expect(Array.isArray(r.anomalies)).toBe(true);
    expect(r).toHaveProperty("summary");
    expect(r.summary).toHaveProperty("total");
    expect(r.summary).toHaveProperty("critical");
    expect(r.summary).toHaveProperty("high");
    expect(r.summary).toHaveProperty("medium");
    expect(r.summary).toHaveProperty("low");
    expect(Array.isArray(r.topCampaigns)).toBe(true);
    for (const a of r.anomalies) {
      expect(a).toHaveProperty("campaignId");
      expect(a).toHaveProperty("metric");
      expect(a).toHaveProperty("severity");
      expect(["low", "medium", "high", "critical"]).toContain(a.severity);
    }
  });
});

describe("CampaignScorecardService - scorecardImprovementPlan", () => {
  it("returns improvement plan with actions", () => {
    const r = campaignScorecardService.scorecardImprovementPlan(TEST_CAMPAIGN, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(TEST_CAMPAIGN);
    expect(r!.currentScore).toBeGreaterThanOrEqual(0);
    expect(r!.targetScore).toBeGreaterThan(r!.currentScore);
    expect(Array.isArray(r!.actions)).toBe(true);
    expect(r!.actions.length).toBeGreaterThan(0);
    for (const a of r!.actions) {
      expect(a).toHaveProperty("area");
      expect(a).toHaveProperty("action");
      expect(a).toHaveProperty("expectedPoints");
      expect(a).toHaveProperty("difficulty");
      expect(["easy", "moderate", "hard"]).toContain(a.difficulty);
      expect(a).toHaveProperty("timeframe");
    }
    expect(r!.projectedScoreAfterPlan).toBeGreaterThanOrEqual(r!.currentScore);
  });
});

describe("CampaignScorecardService - scorecardPeerComparison", () => {
  it("returns peer group comparison with rank", () => {
    const r = campaignScorecardService.scorecardPeerComparison(TEST_CAMPAIGN, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.targetCampaignId).toBe(TEST_CAMPAIGN);
    expect(r!.peerGroupSize).toBeGreaterThan(0);
    expect(Array.isArray(r!.peers)).toBe(true);
    expect(r!.peers.length).toBeGreaterThan(0);
    for (const p of r!.peers) {
      expect(p).toHaveProperty("campaignId");
      expect(p).toHaveProperty("overall");
      expect(p).toHaveProperty("differenceFromTarget");
    }
    expect(r!.rank).toBeGreaterThan(0);
    expect(r!.percentileInGroup).toBeGreaterThanOrEqual(0);
    expect(r!.percentileInGroup).toBeLessThanOrEqual(100);
  });
});

describe("CampaignScorecardService - scorecardBenchmark", () => {
  it("returns benchmark against industry averages", () => {
    const r = campaignScorecardService.scorecardBenchmark(TEST_CAMPAIGN, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(TEST_CAMPAIGN);
    expect(Array.isArray(r!.metrics)).toBe(true);
    expect(r!.metrics.length).toBeGreaterThan(0);
    for (const m of r!.metrics) {
      expect(m).toHaveProperty("metric");
      expect(m).toHaveProperty("portfolioAvg");
      expect(m).toHaveProperty("industryAvg");
      expect(m).toHaveProperty("verdict");
      expect(["above", "at", "below"]).toContain(m.verdict);
    }
    expect(["above", "at", "below"]).toContain(r!.overallVerdict);
  });
});

describe("CampaignScorecardService - scorecardDistributionAnalysis", () => {
  it("returns distribution stats", () => {
    const r = campaignScorecardService.scorecardDistributionAnalysis(TEST_TENANT);
    expect(Array.isArray(r.distribution)).toBe(true);
    expect(r.distribution.length).toBe(5);
    for (const d of r.distribution) {
      expect(d).toHaveProperty("range");
      expect(d).toHaveProperty("count");
      expect(d).toHaveProperty("percentage");
    }
    expect(r.mean).toBeGreaterThan(0);
    expect(r.median).toBeGreaterThan(0);
    expect(r.stdDev).toBeGreaterThanOrEqual(0);
    expect(typeof r.interpretation).toBe("string");
  });

  it("returns distribution for single campaign", () => {
    const r = campaignScorecardService.scorecardDistributionAnalysis(TEST_TENANT, TEST_CAMPAIGN);
    expect(r.campaignId).toBe(TEST_CAMPAIGN);
  });
});

describe("CampaignScorecardService - scorecardFactorImportance", () => {
  it("returns factor importance ranking", () => {
    const r = campaignScorecardService.scorecardFactorImportance(TEST_TENANT);
    expect(r).toHaveProperty("factors");
    expect(Array.isArray(r.factors)).toBe(true);
    expect(r.factors.length).toBeGreaterThan(0);
    for (const f of r.factors) {
      expect(f).toHaveProperty("metric");
      expect(f).toHaveProperty("correlation");
      expect(f).toHaveProperty("importance");
      expect(f).toHaveProperty("direction");
      expect(["positive", "negative"]).toContain(f.direction);
    }
    expect(Array.isArray(r.topDrivers)).toBe(true);
    expect(Array.isArray(r.topDetractors)).toBe(true);
    expect(typeof r.methodology).toBe("string");
  });
});

describe("CampaignScorecardService - scorecardCustomWeightsSimulation", () => {
  it("returns weight simulation results", () => {
    const r = campaignScorecardService.scorecardCustomWeightsSimulation(TEST_CAMPAIGN, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(TEST_CAMPAIGN);
    expect(r!.defaultScore).toBeGreaterThan(0);
    expect(r!.defaultWeights).toHaveProperty("health");
    expect(Array.isArray(r!.simulations)).toBe(true);
    expect(r!.simulations.length).toBe(5);
    for (const s of r!.simulations) {
      expect(s).toHaveProperty("weights");
      expect(s).toHaveProperty("overallScore");
      expect(Array.isArray(s.dimensionScores)).toBe(true);
    }
    expect(r!.recommendedWeights).toHaveProperty("health");
  });
});

describe("CampaignScorecardService - scorecardHistoricalComparison", () => {
  it("returns historical comparison periods", () => {
    const r = campaignScorecardService.scorecardHistoricalComparison(TEST_TENANT);
    expect(Array.isArray(r.periods)).toBe(true);
    expect(r.periods.length).toBe(5);
    for (const p of r.periods) {
      expect(p).toHaveProperty("period");
      expect(p).toHaveProperty("avgScore");
      expect(p).toHaveProperty("topScore");
      expect(p).toHaveProperty("bottomScore");
    }
    expect(r.overallChange).toBeGreaterThanOrEqual(-100);
    expect(r.overallChange).toBeLessThanOrEqual(100);
    expect(["improving", "declining", "stable"]).toContain(r.trend);
    expect(typeof r.bestPeriod).toBe("string");
    expect(typeof r.worstPeriod).toBe("string");
  });

  it("returns historical for single campaign", () => {
    const r = campaignScorecardService.scorecardHistoricalComparison(TEST_TENANT, TEST_CAMPAIGN);
    expect(r.campaignId).toBe(TEST_CAMPAIGN);
  });
});
