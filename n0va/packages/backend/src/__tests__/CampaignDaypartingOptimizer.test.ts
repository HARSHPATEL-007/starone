import { describe, it, expect, beforeAll } from "vitest";
import { campaignDaypartingOptimizer } from "../services/CampaignDaypartingOptimizerService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_cdo_tenant";
const TEST_CAMPAIGN = "test_cdo_camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "CDO Test Campaign", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
  DataStore.mem().insert("campaigns", {
    _id: "test_cdo_camp2", name: "CDO Test Campaign 2", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 300, lifetime: 9000, spent: 3000, remaining: 6000, currency: "USD" },
    metrics: { impressions: 30000, clicks: 900, conversions: 30, revenue: 4500, spend: 3000 },
    startDate: "2025-03-01", endDate: "2025-09-30",
  });
});

describe("CampaignDaypartingOptimizer - analyzeDayparting", () => {
  it("returns hourly and daily breakdown for a valid campaign", () => {
    const result = campaignDaypartingOptimizer.analyzeDayparting(TEST_CAMPAIGN, TEST_TENANT);
    expect(result).not.toBeNull();
    expect(result!.campaignId).toBe(TEST_CAMPAIGN);
    expect(result!.hourlyBreakdown.length).toBe(24);
    expect(result!.dayOfWeekBreakdown.length).toBe(7);
    expect(result!.optimalWindow).toBeDefined();
    expect(result!.worstWindow).toBeDefined();
    expect(result!.recommendation).toBeTruthy();
    for (const h of result!.hourlyBreakdown) {
      expect(h).toHaveProperty("hour");
      expect(h).toHaveProperty("performance");
      expect(h).toHaveProperty("recommendation");
    }
  });

  it("returns null for unknown campaign", () => {
    expect(campaignDaypartingOptimizer.analyzeDayparting("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignDaypartingOptimizer - recommendSchedule", () => {
  it("returns schedule recommendation with alternatives", () => {
    const result = campaignDaypartingOptimizer.recommendSchedule(TEST_CAMPAIGN, TEST_TENANT);
    expect(result).not.toBeNull();
    expect(result!.campaignId).toBe(TEST_CAMPAIGN);
    expect(result!.proposedSchedule.length).toBeGreaterThan(0);
    expect(result!.expectedImpact).toBeGreaterThan(0);
    expect(result!.confidence).toBeGreaterThan(0);
    expect(result!.alternativeSchedules.length).toBeGreaterThan(0);
    for (const alt of result!.alternativeSchedules) {
      expect(alt).toHaveProperty("name");
      expect(alt).toHaveProperty("schedule");
      expect(alt).toHaveProperty("expectedImpact");
    }
  });
});

describe("CampaignDaypartingOptimizer - detectTimePatterns", () => {
  it("returns detected time-based patterns", () => {
    const patterns = campaignDaypartingOptimizer.detectTimePatterns(TEST_TENANT);
    expect(Array.isArray(patterns)).toBe(true);
    expect(patterns.length).toBeGreaterThan(0);
    for (const p of patterns) {
      expect(p).toHaveProperty("pattern");
      expect(p).toHaveProperty("description");
      expect(p).toHaveProperty("strength");
      expect(p).toHaveProperty("confidence");
      expect(p).toHaveProperty("actionable");
    }
  });
});

describe("CampaignDaypartingOptimizer - findScheduleConflicts", () => {
  it("returns schedule conflicts between campaigns", () => {
    const conflicts = campaignDaypartingOptimizer.findScheduleConflicts(TEST_TENANT);
    expect(Array.isArray(conflicts)).toBe(true);
    for (const c of conflicts) {
      expect(c).toHaveProperty("campaignA");
      expect(c).toHaveProperty("campaignB");
      expect(c).toHaveProperty("overlappingHours");
      expect(c).toHaveProperty("severity");
      expect(c).toHaveProperty("impact");
      expect(c.overlappingHours.length).toBeGreaterThan(0);
    }
  });
});

describe("CampaignDaypartingOptimizer - analyzeTimezonePerformance", () => {
  it("returns timezone performance breakdown", () => {
    const tz = campaignDaypartingOptimizer.analyzeTimezonePerformance(TEST_TENANT);
    expect(Array.isArray(tz)).toBe(true);
    expect(tz.length).toBeGreaterThan(0);
    for (const t of tz) {
      expect(t).toHaveProperty("timezone");
      expect(t).toHaveProperty("offset");
      expect(t).toHaveProperty("avgPerformance");
      expect(t).toHaveProperty("bestPerformingHour");
      expect(t).toHaveProperty("worstPerformingHour");
    }
  });
});

describe("CampaignDaypartingOptimizer - generateDaypartingPlan", () => {
  it("returns dayparting plan with schedule and expected improvements", () => {
    const plan = campaignDaypartingOptimizer.generateDaypartingPlan(TEST_CAMPAIGN, TEST_TENANT);
    expect(plan).not.toBeNull();
    expect(plan!.campaignId).toBe(TEST_CAMPAIGN);
    expect(plan!.schedule.length).toBe(7);
    expect(plan!.expectedROASImprovement).toBeGreaterThan(0);
    expect(plan!.expectedCTRImprovement).toBeGreaterThan(0);
    expect(plan!.expectedSpendReduction).toBeGreaterThan(0);
    expect(plan!.summary).toBeTruthy();
    for (const d of plan!.schedule) {
      expect(d).toHaveProperty("day");
      expect(Array.isArray(d.hours)).toBe(true);
    }
  });
});
