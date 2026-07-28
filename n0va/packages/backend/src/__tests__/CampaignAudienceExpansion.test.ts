import { describe, it, expect, beforeAll } from "vitest";
import { campaignAudienceExpansion } from "../services/CampaignAudienceExpansionService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_cae_tenant";
const TEST_CAMPAIGN = "test_cae_camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "Audience Expansion Test", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
  DataStore.mem().insert("campaigns", {
    _id: "test_cae_camp2", name: "Audience Expansion Test 2", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 300, lifetime: 9000, spent: 3000, remaining: 6000, currency: "USD" },
    metrics: { impressions: 30000, clicks: 900, conversions: 30, revenue: 4500, spend: 3000 },
    startDate: "2025-03-01", endDate: "2025-09-30",
  });
});

describe("CampaignAudienceExpansion - findLookalikeAudiences", () => {
  it("returns lookalike candidates sorted by similarity", () => {
    const result = campaignAudienceExpansion.findLookalikeAudiences(TEST_TENANT);
    expect(result).toHaveProperty("seedAudience");
    expect(result).toHaveProperty("generatedAt");
    expect(Array.isArray(result.candidates)).toBe(true);
    expect(result.candidates.length).toBeGreaterThan(0);
    for (const c of result.candidates) {
      expect(c).toHaveProperty("audienceName");
      expect(c).toHaveProperty("similarityScore");
      expect(c).toHaveProperty("quality");
      expect(c).toHaveProperty("recommendation");
    }
    for (let i = 1; i < result.candidates.length; i++) {
      expect(result.candidates[i - 1].similarityScore).toBeGreaterThanOrEqual(result.candidates[i].similarityScore);
    }
    expect(result.summary).toHaveProperty("totalCandidates");
    expect(result.summary).toHaveProperty("bestCandidate");
  });
});

describe("CampaignAudienceExpansion - generateExpansionRecommendations", () => {
  it("returns expansion recommendations for a campaign", () => {
    const recs = campaignAudienceExpansion.generateExpansionRecommendations(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(r).toHaveProperty("dimension");
      expect(r).toHaveProperty("recommendedExpansion");
      expect(r).toHaveProperty("rationale");
      expect(r).toHaveProperty("estimatedReachIncrease");
      expect(r).toHaveProperty("priority");
    }
  });

  it("returns empty array for unknown campaign", () => {
    const recs = campaignAudienceExpansion.generateExpansionRecommendations("nonexistent", TEST_TENANT);
    expect(recs).toEqual([]);
  });
});

describe("CampaignAudienceExpansion - computeAudienceSimilarity", () => {
  it("returns similarity metrics between two audiences", () => {
    const sim = campaignAudienceExpansion.computeAudienceSimilarity("aud_facebook", "aud_google", TEST_TENANT);
    expect(sim).not.toBeNull();
    expect(sim!.cosineSimilarity).toBeGreaterThanOrEqual(-1);
    expect(sim!.cosineSimilarity).toBeLessThanOrEqual(1);
    expect(sim!.euclideanDistance).toBeGreaterThanOrEqual(0);
    expect(sim!.interpretation).toBeTruthy();
  });
});

describe("CampaignAudienceExpansion - assessExpansionQuality", () => {
  it("returns quality assessment for an expansion", () => {
    const result = campaignAudienceExpansion.findLookalikeAudiences(TEST_TENANT);
    if (result.candidates.length > 0) {
      const q = campaignAudienceExpansion.assessExpansionQuality(result.seedAudience, result.candidates[0].audienceId, TEST_TENANT);
      expect(q).not.toBeNull();
      expect(q!.precision).toBeGreaterThan(0);
      expect(q!.recall).toBeGreaterThan(0);
      expect(q!.f1Score).toBeGreaterThan(0);
      expect(q!.grade).toBeTruthy();
      expect(Array.isArray(q!.recommendations)).toBe(true);
    }
  });

  it("returns null for invalid audience pair", () => {
    const q = campaignAudienceExpansion.assessExpansionQuality("nonexistent", "also_nonexistent", TEST_TENANT);
    expect(q).toBeNull();
  });
});

describe("CampaignAudienceExpansion - crossPlatformUnification", () => {
  it("returns unification analysis across platform pairs", () => {
    const result = campaignAudienceExpansion.crossPlatformUnification(TEST_TENANT);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    for (const r of result) {
      expect(r).toHaveProperty("platformA");
      expect(r).toHaveProperty("platformB");
      expect(r).toHaveProperty("estimatedOverlap");
      expect(r).toHaveProperty("unifiedReach");
      expect(r).toHaveProperty("recommendation");
    }
  });
});

describe("CampaignAudienceExpansion - trackExpansionPerformance", () => {
  it("returns performance tracking for an audience", () => {
    const result = campaignAudienceExpansion.findLookalikeAudiences(TEST_TENANT);
    if (result.candidates.length > 0) {
      const perf = campaignAudienceExpansion.trackExpansionPerformance(result.candidates[0].audienceId, TEST_TENANT);
      expect(perf).not.toBeNull();
      expect(perf!.audienceName).toBeTruthy();
      expect(Array.isArray(perf!.metrics)).toBe(true);
      expect(perf!.metrics.length).toBeGreaterThan(0);
      expect(Array.isArray(perf!.comparisonToSeed)).toBe(true);
      expect(perf!.comparisonToSeed.length).toBeGreaterThan(0);
      expect(perf!.overallVerdict).toBeTruthy();
    }
  });
});
