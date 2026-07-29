import { describe, it, expect, beforeAll } from "vitest";
import { campaignHealthService } from "../services/CampaignHealthService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_health_deep";
let testCampaignId: string;

beforeAll(() => {
  const mem = DataStore["mem"]();
  const c = mem.insert("campaigns", { name: "Health Deep Campaign", tenantId: TEST_TENANT, status: "active", budget: { daily: 100, lifetime: 3000, spent: 1500 } });
  testCampaignId = c._id;
  for (let i = 0; i < 14; i++) {
    mem.insert("metrics", { campaignId: c._id, tenantId: TEST_TENANT, spend: 100 + i * 5, clicks: 200 + i * 3, impressions: 5000 + i * 200, conversions: 15 + i, revenue: 300 + i * 20, date: `2025-${String(i + 1).padStart(2, "0")}-01` });
  }
});

describe("CampaignHealthService - detailedHealthBreakdown", () => {
  it("returns breakdown with dimensions", async () => {
    const r = await campaignHealthService.detailedHealthBreakdown(testCampaignId, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(testCampaignId);
    expect(r!.dimensions.length).toBeGreaterThanOrEqual(4);
    expect(r!.dimensions[0].name).toBeTruthy();
    expect(r!.dimensions[0].score).toBeGreaterThanOrEqual(0);
    expect(r!.dimensions[0].status).toMatch(/^(good|fair|poor|critical)$/);
    expect(r!.dimensions[0].metrics.length).toBeGreaterThan(0);
    expect(r!.generatedAt).toBeTruthy();
  });

  it("returns null for unknown campaign", async () => {
    const r = await campaignHealthService.detailedHealthBreakdown("nonexistent", TEST_TENANT);
    expect(r).toBeNull();
  });
});

describe("CampaignHealthService - healthTrendForecast", () => {
  it("returns forecast with periods", async () => {
    const r = await campaignHealthService.healthTrendForecast(testCampaignId, TEST_TENANT, 4);
    expect(r).not.toBeNull();
    expect(r!.forecast.length).toBe(4);
    expect(r!.forecast[0].period).toBe(1);
    expect(r!.forecast[0].projectedScore).toBeGreaterThanOrEqual(0);
    expect(r!.forecast[0].confidenceLower).toBeLessThanOrEqual(r!.forecast[0].confidenceUpper);
    expect(r!.currentScore).toBeGreaterThanOrEqual(0);
    expect(r!.trendDirection).toMatch(/^(up|down|stable)$/);
  });

  it("returns null for unknown campaign", async () => {
    const r = await campaignHealthService.healthTrendForecast("nonexistent", TEST_TENANT, 4);
    expect(r).toBeNull();
  });

  it("respects custom period count", async () => {
    const r = await campaignHealthService.healthTrendForecast(testCampaignId, TEST_TENANT, 8);
    expect(r!.forecast.length).toBe(8);
  });
});

describe("CampaignHealthService - benchmarkComparison", () => {
  it("returns benchmark with percentile", async () => {
    const r = await campaignHealthService.benchmarkComparison(testCampaignId, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(typeof r!.percentile).toBe("number");
    expect(r!.percentile).toBeGreaterThanOrEqual(0);
    expect(r!.portfolioAverage).toBeGreaterThanOrEqual(0);
    expect(r!.dimensions.length).toBeGreaterThanOrEqual(4);
    expect(r!.topWeakness).toBeTruthy();
    expect(r!.topStrength).toBeTruthy();
  });

  it("returns null for unknown campaign", async () => {
    const r = await campaignHealthService.benchmarkComparison("nonexistent", TEST_TENANT);
    expect(r).toBeNull();
  });
});

describe("CampaignHealthService - healthImprovementPlan", () => {
  it("returns actions for a campaign", async () => {
    const r = await campaignHealthService.healthImprovementPlan(testCampaignId, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.actions.length).toBeGreaterThanOrEqual(0);
    expect(r!.totalActions).toBe(r!.actions.length);
    expect(r!.projectedScoreAfter).toBeGreaterThanOrEqual(r!.currentScore);
    expect(r!.generatedAt).toBeTruthy();
  });

  it("returns null for unknown campaign", async () => {
    const r = await campaignHealthService.healthImprovementPlan("nonexistent", TEST_TENANT);
    expect(r).toBeNull();
  });
});

describe("CampaignHealthService - campaignHealthRanking", () => {
  it("returns ranking with quartile breakdown", async () => {
    const r = await campaignHealthService.campaignHealthRanking(TEST_TENANT);
    expect(r.totalCampaigns).toBeGreaterThan(0);
    expect(r.rankings.length).toBeGreaterThan(0);
    expect(r.rankings[0].rank).toBe(1);
    expect(r.rankings[0].score).toBeGreaterThanOrEqual(0);
    expect(r.rankings[0].quartile).toBeGreaterThanOrEqual(1);
    expect(r.quartileBreakdown.q1 + r.quartileBreakdown.q2 + r.quartileBreakdown.q3 + r.quartileBreakdown.q4).toBe(r.totalCampaigns);
    expect(r.topCampaign).toBeTruthy();
  });
});

describe("CampaignHealthService - healthDriverAttribution", () => {
  it("returns drivers with contributions", async () => {
    const r = await campaignHealthService.healthDriverAttribution(testCampaignId, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.drivers.length).toBeGreaterThanOrEqual(4);
    expect(r!.drivers[0].name).toBeTruthy();
    expect(r!.drivers[0].contribution).toBeGreaterThanOrEqual(0);
    expect(r!.drivers[0].direction).toMatch(/^(positive|neutral|negative)$/);
    expect(r!.totalScore).toBeGreaterThanOrEqual(0);
    expect(r!.primaryDriver).toBeTruthy();
  });

  it("returns null for unknown campaign", async () => {
    const r = await campaignHealthService.healthDriverAttribution("nonexistent", TEST_TENANT);
    expect(r).toBeNull();
  });
});
