import { describe, it, expect, beforeAll } from "vitest";
import { campaignGoalTracker } from "../services/CampaignGoalTrackerService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_goal_tenant";
const TEST_CAMPAIGN = "test_goal_camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "GoalTracker Test", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
});

describe("CampaignGoalTracker - trackGoalProgress", () => {
  it("returns goal progress report with 6 metrics", () => {
    const report = campaignGoalTracker.trackGoalProgress(TEST_CAMPAIGN, TEST_TENANT);
    expect(report).not.toBeNull();
    expect(report!.campaignId).toBe(TEST_CAMPAIGN);
    expect(report!.goals.length).toBe(6);
    const metricNames = report!.goals.map(g => g.metric);
    expect(metricNames).toContain("impressions");
    expect(metricNames).toContain("clicks");
    expect(metricNames).toContain("conversions");
    expect(metricNames).toContain("revenue");
    expect(metricNames).toContain("roas");
    expect(metricNames).toContain("ctr");
    for (const g of report!.goals) {
      expect(g).toHaveProperty("target");
      expect(g).toHaveProperty("current");
      expect(g).toHaveProperty("progress");
      expect(g).toHaveProperty("status");
      expect(g).toHaveProperty("projected");
      expect(g).toHaveProperty("daysRemaining");
    }
    expect(report!.overallStatus).toMatch(/ahead|on-track|at-risk|behind/);
    expect(report!.healthScore).toBeGreaterThan(0);
    expect(Array.isArray(report!.recommendations)).toBe(true);
  });

  it("returns null for unknown campaign", () => {
    expect(campaignGoalTracker.trackGoalProgress("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignGoalTracker - predictGoalAttainment", () => {
  it("returns attainment predictions per metric", () => {
    const preds = campaignGoalTracker.predictGoalAttainment(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(preds)).toBe(true);
    expect(preds.length).toBe(6);
    for (const p of preds) {
      expect(p).toHaveProperty("metric");
      expect(p).toHaveProperty("target");
      expect(p).toHaveProperty("projectedValue");
      expect(p).toHaveProperty("projectedAttainment");
      expect(p).toHaveProperty("willAttain");
    }
  });
});

describe("CampaignGoalTracker - recommendGoalAdjustments", () => {
  it("returns adjustment recommendations per metric", () => {
    const recs = campaignGoalTracker.recommendGoalAdjustments(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBe(6);
    for (const r of recs) {
      expect(r).toHaveProperty("metric");
      expect(r).toHaveProperty("currentTarget");
      expect(r).toHaveProperty("recommendedTarget");
      expect(r).toHaveProperty("rationale");
      expect(r).toHaveProperty("priority");
    }
  });
});

describe("CampaignGoalTracker - analyzeGoalConflicts", () => {
  it("returns goal conflict analysis", () => {
    const analysis = campaignGoalTracker.analyzeGoalConflicts(TEST_CAMPAIGN, TEST_TENANT);
    expect(analysis.campaignId).toBe(TEST_CAMPAIGN);
    expect(Array.isArray(analysis.conflicts)).toBe(true);
    expect(analysis.overallConflictScore).toBeGreaterThanOrEqual(0);
    for (const c of analysis.conflicts) {
      expect(c).toHaveProperty("goalA");
      expect(c).toHaveProperty("goalB");
      expect(c).toHaveProperty("severity");
      expect(c).toHaveProperty("resolution");
    }
  });
});

describe("CampaignGoalTracker - compareGoalPerformance", () => {
  it("returns goal comparison across campaigns", () => {
    const comps = campaignGoalTracker.compareGoalPerformance(TEST_TENANT);
    expect(Array.isArray(comps)).toBe(true);
    expect(comps.length).toBeGreaterThan(0);
    for (const c of comps) {
      expect(c).toHaveProperty("campaignName");
      expect(c).toHaveProperty("metric");
      expect(c).toHaveProperty("target");
      expect(c).toHaveProperty("current");
      expect(c).toHaveProperty("progress");
      expect(c).toHaveProperty("rank");
      expect(c).toHaveProperty("percentile");
    }
  });
});

describe("CampaignGoalTracker - goalTrendForecast", () => {
  it("returns 8-week trend forecasts per metric", () => {
    const forecasts = campaignGoalTracker.goalTrendForecast(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(forecasts)).toBe(true);
    expect(forecasts.length).toBe(6);
    for (const f of forecasts) {
      expect(f).toHaveProperty("metric");
      expect(f).toHaveProperty("target");
      expect(Array.isArray(f.historicalValues)).toBe(true);
      expect(f.historicalValues.length).toBe(8);
      expect(Array.isArray(f.projectedValues)).toBe(true);
      expect(f.projectedValues.length).toBe(8);
      expect(f).toHaveProperty("weeklyGrowthRate");
      expect(f).toHaveProperty("willMeetDeadline");
    }
  });
});
