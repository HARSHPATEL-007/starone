import { describe, it, expect, beforeAll } from "vitest";
import { campaignBudgetSimulator } from "../services/CampaignBudgetSimulatorService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_cbs_tenant";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    name: "CBS Test Campaign", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
});

describe("CampaignBudgetSimulator - simulateCampaign", () => {
  it("returns simulation results with stats and distribution", () => {
    const result = campaignBudgetSimulator.simulateCampaign({
      campaignId: "test_camp", budget: 5000, expectedROAS: 3, roasVariance: 0.3,
      expectedConversions: 100, convVariance: 0.2,
    }, 5000);
    expect(result.runs).toBe(5000);
    expect(result.stats.meanROAS).toBeGreaterThan(0);
    expect(result.stats.medianROAS).toBeGreaterThan(0);
    expect(result.stats.meanRevenue).toBeGreaterThan(0);
    expect(result.stats.probabilityPositiveROAS).toBeGreaterThan(0);
    expect(result.stats.probabilityAboveTarget).toBeGreaterThan(0);
    expect(result.distribution.length).toBe(10);
    expect(result.simulations.length).toBeLessThanOrEqual(100);
  });

  it("handles low variance gracefully", () => {
    const result = campaignBudgetSimulator.simulateCampaign({
      campaignId: "low_var", budget: 1000, expectedROAS: 2, roasVariance: 0.05,
      expectedConversions: 50, convVariance: 0.05,
    }, 1000);
    expect(result.stats.meanROAS).toBeCloseTo(2, 0);
    expect(result.stats.stdDevRevenue).toBeLessThan(result.stats.meanRevenue);
  });
});

describe("CampaignBudgetSimulator - scenario", () => {
  it("runs multi-campaign scenario", () => {
    const scenario = campaignBudgetSimulator.runScenario(TEST_TENANT, [
      { campaignId: "test_camp", budget: 5000, expectedROAS: 3, roasVariance: 0.3, expectedConversions: 100, convVariance: 0.2 },
      { campaignId: "test_camp2", budget: 3000, expectedROAS: 2, roasVariance: 0.2, expectedConversions: 60, convVariance: 0.15 },
    ], 2000);
    expect(scenario.name).toBeTruthy();
    expect(scenario.portfolioResult.totalBudget).toBe(8000);
    expect(scenario.portfolioResult.meanTotalRevenue).toBeGreaterThan(0);
    expect(scenario.portfolioResult.meanTotalROAS).toBeGreaterThan(0);
    expect(scenario.portfolioResult.probabilityProfit).toBeGreaterThan(0);
  });
});

describe("CampaignBudgetSimulator - history and summary", () => {
  it("returns simulation history", () => {
    const history = campaignBudgetSimulator.getHistory(TEST_TENANT);
    expect(history.length).toBeGreaterThan(0);
  });

  it("returns summary", () => {
    const summary = campaignBudgetSimulator.getSummary(TEST_TENANT);
    expect(summary.totalScenarios).toBeGreaterThan(0);
    expect(summary.recentScenarios.length).toBeGreaterThan(0);
  });
});