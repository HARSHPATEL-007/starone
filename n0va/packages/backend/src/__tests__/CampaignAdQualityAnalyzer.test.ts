import { describe, it, expect, beforeAll } from "vitest";
import { campaignAdQualityAnalyzer } from "../services/CampaignAdQualityAnalyzerService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_aqa_tenant";
const TEST_CAMPAIGN = "test_aqa_camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "Ad Quality Test", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
  DataStore.mem().insert("campaigns", {
    _id: "test_aqa_camp2", name: "Ad Quality Test 2", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 300, lifetime: 9000, spent: 3000, remaining: 6000, currency: "USD" },
    metrics: { impressions: 30000, clicks: 900, conversions: 30, revenue: 4500, spend: 3000 },
    startDate: "2025-03-01", endDate: "2025-09-30",
  });
});

describe("CampaignAdQualityAnalyzer - analyzeAdQuality", () => {
  it("returns quality report with dimensions and summary", () => {
    const report = campaignAdQualityAnalyzer.analyzeAdQuality(TEST_CAMPAIGN, TEST_TENANT);
    expect(report).not.toBeNull();
    expect(report!.campaignId).toBe(TEST_CAMPAIGN);
    expect(report!.overallScore).toBeGreaterThan(0);
    expect(report!.dimensions.length).toBeGreaterThan(0);
    for (const d of report!.dimensions) {
      expect(d).toHaveProperty("name");
      expect(d).toHaveProperty("score");
      expect(d).toHaveProperty("status");
      expect(d).toHaveProperty("details");
    }
    expect(report!.summary).toHaveProperty("strengths");
    expect(report!.summary).toHaveProperty("weaknesses");
    expect(report!.summary).toHaveProperty("priorityActions");
    expect(Array.isArray(report!.benchmarkComparison)).toBe(true);
  });

  it("returns null for unknown campaign", () => {
    expect(campaignAdQualityAnalyzer.analyzeAdQuality("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignAdQualityAnalyzer - estimateQualityScore", () => {
  it("returns quality score 1-10 with components", () => {
    const qs = campaignAdQualityAnalyzer.estimateQualityScore(TEST_CAMPAIGN, TEST_TENANT);
    expect(qs).not.toBeNull();
    expect(qs!.estimatedQualityScore).toBeGreaterThanOrEqual(1);
    expect(qs!.estimatedQualityScore).toBeLessThanOrEqual(10);
    expect(qs!.components.length).toBeGreaterThan(0);
    for (const c of qs!.components) {
      expect(c).toHaveProperty("component");
      expect(c).toHaveProperty("score");
      expect(c).toHaveProperty("impact");
    }
    expect(qs!.improvementPotential).toBeGreaterThanOrEqual(0);
  });
});

describe("CampaignAdQualityAnalyzer - analyzeRelevance", () => {
  it("returns relevance scores across dimensions", () => {
    const rel = campaignAdQualityAnalyzer.analyzeRelevance(TEST_CAMPAIGN, TEST_TENANT);
    expect(rel).not.toBeNull();
    expect(rel!.campaignId).toBe(TEST_CAMPAIGN);
    expect(rel!.keywordToAdRelevance).toBeGreaterThan(0);
    expect(rel!.adToLandingPageRelevance).toBeGreaterThan(0);
    expect(rel!.overallRelevance).toBeGreaterThan(0);
    expect(Array.isArray(rel!.recommendations)).toBe(true);
  });
});

describe("CampaignAdQualityAnalyzer - generateImprovementPlan", () => {
  it("returns improvement plan with steps", () => {
    const plan = campaignAdQualityAnalyzer.generateImprovementPlan(TEST_CAMPAIGN, TEST_TENANT);
    expect(plan).not.toBeNull();
    expect(plan!.campaignId).toBe(TEST_CAMPAIGN);
    expect(plan!.currentScore).toBeGreaterThan(0);
    expect(plan!.targetScore).toBeGreaterThanOrEqual(plan!.currentScore);
    expect(Array.isArray(plan!.steps)).toBe(true);
    if (plan!.steps.length > 0) {
      expect(plan!.steps[0]).toHaveProperty("action");
      expect(plan!.steps[0]).toHaveProperty("dimension");
      expect(plan!.steps[0]).toHaveProperty("expectedPointsGain");
      expect(plan!.steps[0]).toHaveProperty("effort");
    }
    expect(plan!.expectedROASImprovement).toBeGreaterThan(0);
  });

  it("accepts custom target score", () => {
    const plan = campaignAdQualityAnalyzer.generateImprovementPlan(TEST_CAMPAIGN, TEST_TENANT, 95);
    expect(plan).not.toBeNull();
    expect(plan!.targetScore).toBe(95);
  });
});

describe("CampaignAdQualityAnalyzer - competitiveAdQuality", () => {
  it("returns competitive benchmark with percentile", () => {
    const comp = campaignAdQualityAnalyzer.competitiveAdQuality(TEST_CAMPAIGN, TEST_TENANT);
    expect(comp).not.toBeNull();
    expect(comp!.campaignId).toBe(TEST_CAMPAIGN);
    expect(comp!.competitorCount).toBeGreaterThan(0);
    expect(comp!.overallPercentile).toBeGreaterThan(0);
    expect(comp!.competitivePosition).toBeTruthy();
    expect(comp!.dimensions.length).toBeGreaterThan(0);
    for (const d of comp!.dimensions) {
      expect(d).toHaveProperty("name");
      expect(d).toHaveProperty("campaignScore");
      expect(d).toHaveProperty("percentile");
    }
  });
});

describe("CampaignAdQualityAnalyzer - trackQualityTrends", () => {
  it("returns trend tracking with trajectory and volatility", () => {
    const trends = campaignAdQualityAnalyzer.trackQualityTrends(TEST_CAMPAIGN, TEST_TENANT);
    expect(trends).not.toBeNull();
    expect(trends!.campaignId).toBe(TEST_CAMPAIGN);
    expect(trends!.trends.length).toBe(8);
    expect(trends!.trajectory).toBeTruthy();
    expect(trends!.volatility).toBeTruthy();
    expect(trends!.projectedNextScore).toBeGreaterThan(0);
    expect(trends!.recommendation).toBeTruthy();
  });
});

describe("CampaignAdQualityAnalyzer - adCreativeQualityAnalysis", () => {
  it("returns creative element quality scores", () => {
    const results = campaignAdQualityAnalyzer.adCreativeQualityAnalysis(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty("element");
      expect(r).toHaveProperty("score");
      expect(r).toHaveProperty("grade");
      expect(r).toHaveProperty("strengths");
      expect(Array.isArray(r.strengths)).toBe(true);
      expect(r).toHaveProperty("improvements");
      expect(Array.isArray(r.improvements)).toBe(true);
      expect(r).toHaveProperty("bestPracticeCompliance");
    }
  });
});

describe("CampaignAdQualityAnalyzer - adLandingPageExperience", () => {
  it("returns landing page experience components", () => {
    const results = campaignAdQualityAnalyzer.adLandingPageExperience(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty("component");
      expect(r).toHaveProperty("score");
      expect(r).toHaveProperty("weight");
      expect(r).toHaveProperty("findings");
      expect(Array.isArray(r.findings)).toBe(true);
      expect(r).toHaveProperty("recommendations");
      expect(Array.isArray(r.recommendations)).toBe(true);
    }
  });
});

describe("CampaignAdQualityAnalyzer - adQualityByDevice", () => {
  it("returns quality breakdown by device", () => {
    const results = campaignAdQualityAnalyzer.adQualityByDevice(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty("device");
      expect(r).toHaveProperty("overallScore");
      expect(r).toHaveProperty("ctrQuality");
      expect(r).toHaveProperty("cvrQuality");
      expect(r).toHaveProperty("relevanceScore");
      expect(r).toHaveProperty("userExperience");
      expect(r).toHaveProperty("recommendation");
    }
  });
});

describe("CampaignAdQualityAnalyzer - adQualityByPlacement", () => {
  it("returns quality breakdown by placement", () => {
    const results = campaignAdQualityAnalyzer.adQualityByPlacement(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty("placement");
      expect(r).toHaveProperty("qualityScore");
      expect(r).toHaveProperty("impressionShare");
      expect(r).toHaveProperty("conversionRate");
      expect(r).toHaveProperty("competitiveCPC");
      expect(r).toHaveProperty("recommendation");
    }
  });
});

describe("CampaignAdQualityAnalyzer - adQualityPrediction", () => {
  it("returns quality score prediction with key drivers", () => {
    const pred = campaignAdQualityAnalyzer.adQualityPrediction(TEST_CAMPAIGN, TEST_TENANT);
    expect(pred).toHaveProperty("campaignId");
    expect(pred).toHaveProperty("currentScore");
    expect(pred).toHaveProperty("predictedNextMonth");
    expect(pred).toHaveProperty("predictedNextQuarter");
    expect(pred).toHaveProperty("trajectory");
    expect(pred).toHaveProperty("confidenceLevel");
    expect(["high", "medium", "low"]).toContain(pred.confidenceLevel);
    expect(Array.isArray(pred.keyDrivers)).toBe(true);
    expect(pred.keyDrivers.length).toBeGreaterThan(0);
    for (const kd of pred.keyDrivers) {
      expect(kd).toHaveProperty("factor");
      expect(kd).toHaveProperty("impact");
      expect(kd).toHaveProperty("direction");
    }
    expect(pred).toHaveProperty("recommendation");
  });
});

describe("CampaignAdQualityAnalyzer - adCompetitiveLandscape", () => {
  it("returns competitive landscape with threat levels", () => {
    const results = campaignAdQualityAnalyzer.adCompetitiveLandscape(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty("competitor");
      expect(r).toHaveProperty("overallQuality");
      expect(r).toHaveProperty("ctrComparison");
      expect(r).toHaveProperty("relevanceComparison");
      expect(r).toHaveProperty("landingPageComparison");
      expect(r).toHaveProperty("marketShare");
      expect(r).toHaveProperty("threatLevel");
      expect(["low", "medium", "high"]).toContain(r.threatLevel);
      expect(r).toHaveProperty("weakness");
    }
  });
});
