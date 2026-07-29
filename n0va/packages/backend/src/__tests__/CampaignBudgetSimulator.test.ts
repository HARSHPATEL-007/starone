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

describe("CampaignBudgetSimulator - budgetOptimizationAllocation", () => {
  it("allocates budget across campaigns", () => {
    const result = campaignBudgetSimulator.budgetOptimizationAllocation([
      { campaignId: "camp-a", budget: 5000, expectedROAS: 3, roasVariance: 0.3, expectedConversions: 100, convVariance: 0.2 },
      { campaignId: "camp-b", budget: 3000, expectedROAS: 2, roasVariance: 0.2, expectedConversions: 60, convVariance: 0.15 },
      { campaignId: "camp-c", budget: 2000, expectedROAS: 4, roasVariance: 0.4, expectedConversions: 80, convVariance: 0.25 },
    ], 15000);
    expect(result.allocations.length).toBe(3);
    expect(result.totalExpectedRevenue).toBeGreaterThan(0);
    expect(result.totalExpectedROAS).toBeGreaterThan(0);
    expect(result.efficiencyScore).toBeGreaterThan(0);
    result.allocations.forEach(a => {
      expect(a.campaignId).toBeTruthy();
      expect(a.allocatedBudget).toBeGreaterThan(0);
      expect(a.expectedRevenue).toBeGreaterThan(0);
      expect(a.marginalEfficiency).toBeGreaterThan(0);
      expect(a.share).toBeGreaterThan(0);
      expect(a.share).toBeLessThanOrEqual(1);
    });
  });

  it("deterministic allocation for same inputs", () => {
    const campaigns = [
      { campaignId: "det-a", budget: 5000, expectedROAS: 3, roasVariance: 0.3, expectedConversions: 100, convVariance: 0.2 },
      { campaignId: "det-b", budget: 3000, expectedROAS: 2, roasVariance: 0.2, expectedConversions: 60, convVariance: 0.15 },
    ];
    const r1 = campaignBudgetSimulator.budgetOptimizationAllocation(campaigns, 10000);
    const r2 = campaignBudgetSimulator.budgetOptimizationAllocation(campaigns, 10000);
    expect(r1.totalExpectedRevenue).toBe(r2.totalExpectedRevenue);
    expect(r1.allocations[0].allocatedBudget).toBe(r2.allocations[0].allocatedBudget);
  });
});

describe("CampaignBudgetSimulator - budgetScenarioComparison", () => {
  it("compares scenarios and identifies best/worst", () => {
    const result = campaignBudgetSimulator.budgetScenarioComparison([
      { name: "Conservative", budget: 5000, expectedROAS: 2, roasVariance: 0.2, expectedConversions: 100, convVariance: 0.15 },
      { name: "Moderate", budget: 10000, expectedROAS: 3, roasVariance: 0.3, expectedConversions: 200, convVariance: 0.2 },
      { name: "Aggressive", budget: 20000, expectedROAS: 4, roasVariance: 0.5, expectedConversions: 400, convVariance: 0.3 },
    ], 2000);
    expect(result.scenarios.length).toBe(3);
    expect(result.bestScenario).toBeTruthy();
    expect(result.worstScenario).toBeTruthy();
    result.scenarios.forEach(s => {
      expect(s.name).toBeTruthy();
      expect(s.meanRevenue).toBeGreaterThan(0);
      expect(s.meanROAS).toBeGreaterThan(0);
      expect(s.probProfit).toBeGreaterThan(0);
      expect(s.probAboveTarget).toBeGreaterThan(0);
    });
  });
});

describe("CampaignBudgetSimulator - budgetRiskAssessment", () => {
  it("computes risk metrics", () => {
    const result = campaignBudgetSimulator.budgetRiskAssessment({ campaignId: "risk-test", budget: 10000, expectedROAS: 2.5, roasVariance: 0.4, expectedConversions: 200, convVariance: 0.3 }, 3000);
    expect(result.valueAtRisk95).toBeGreaterThanOrEqual(0);
    expect(result.conditionalVaR95).toBeGreaterThanOrEqual(0);
    expect(result.downsideDeviation).toBeGreaterThanOrEqual(0);
    expect(result.probabilityOfLoss).toBeGreaterThanOrEqual(0);
    expect(result.sharpeRatio).toBeDefined();
    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(result.riskAdjustedROAS).toBeGreaterThan(0);
  });
});

describe("CampaignBudgetSimulator - budgetSensitivityAnalysis", () => {
  it("returns sensitivity curve with optimal budget", () => {
    const result = campaignBudgetSimulator.budgetSensitivityAnalysis(
      { campaignId: "sens-test", budget: 10000, expectedROAS: 3, roasVariance: 0.3, expectedConversions: 200, convVariance: 0.2 },
      { min: 5000, max: 20000, steps: 6 }, 1500,
    );
    expect(result.points.length).toBe(6);
    expect(result.optimalBudget).toBeGreaterThan(0);
    expect(result.elasticity).toBeDefined();
    result.points.forEach(p => {
      expect(p.budget).toBeGreaterThan(0);
      expect(p.expectedRevenue).toBeGreaterThan(0);
      expect(p.expectedROAS).toBeGreaterThan(0);
    });
    expect(result.points[0].budget).toBe(5000);
    expect(result.points[result.points.length - 1].budget).toBe(20000);
  });
});

describe("CampaignBudgetSimulator - budgetWhatIfSimulation", () => {
  it("compares current vs projected budget", () => {
    const result = campaignBudgetSimulator.budgetWhatIfSimulation(
      { campaignId: "whatif-test", budget: 10000, expectedROAS: 3, roasVariance: 0.3, expectedConversions: 200, convVariance: 0.2 },
      15000, 2000,
    );
    expect(result.current.budget).toBe(10000);
    expect(result.projected.budget).toBe(15000);
    expect(result.delta.revenueChange).toBeDefined();
    expect(result.delta.roasChange).toBeDefined();
    expect(result.delta.conversionsChange).toBeDefined();
    expect(result.recommendation).toBeTruthy();
    expect(result.recommendation.length).toBeGreaterThan(20);
  });
});

describe("CampaignBudgetSimulator - budgetROICurve", () => {
  it("generates ROI curve with saturation point", () => {
    const result = campaignBudgetSimulator.budgetROICurve(
      { campaignId: "roi-test", budget: 10000, expectedROAS: 3, roasVariance: 0.3, expectedConversions: 200, convVariance: 0.2 },
      3, 8, 1500,
    );
    expect(result.curve.length).toBe(8);
    expect(result.optimalBudget).toBeGreaterThan(0);
    expect(result.saturationPoint).toBeGreaterThan(0);
    expect(result.diminishingReturnsThreshold).toBeGreaterThan(0);
    expect(result.maxProfitBudget).toBeGreaterThan(0);
    result.curve.forEach(p => {
      expect(p.budget).toBeGreaterThan(0);
      expect(p.revenue).toBeGreaterThan(0);
      expect(p.roas).toBeGreaterThan(0);
      expect(p.marginalROAS).toBeGreaterThanOrEqual(0);
      expect(["high", "medium", "low"]).toContain(p.efficiency);
    });
  });
});

describe("CampaignBudgetSimulator - deterministic deep methods", () => {
  it("scenario comparison is deterministic", () => {
    const configs = [
      { name: "A", budget: 5000, expectedROAS: 2, roasVariance: 0.2, expectedConversions: 100, convVariance: 0.15 },
      { name: "B", budget: 10000, expectedROAS: 3, roasVariance: 0.3, expectedConversions: 200, convVariance: 0.2 },
    ];
    const r1 = campaignBudgetSimulator.budgetScenarioComparison(configs, 2000);
    const r2 = campaignBudgetSimulator.budgetScenarioComparison(configs, 2000);
    expect(r1.bestScenario).toBe(r2.bestScenario);
    expect(r1.worstScenario).toBe(r2.worstScenario);
  });

  it("risk assessment is deterministic", () => {
    const config = { campaignId: "det-risk", budget: 10000, expectedROAS: 2.5, roasVariance: 0.4, expectedConversions: 200, convVariance: 0.3 };
    const r1 = campaignBudgetSimulator.budgetRiskAssessment(config, 3000);
    const r2 = campaignBudgetSimulator.budgetRiskAssessment(config, 3000);
    expect(r1.valueAtRisk95).toBe(r2.valueAtRisk95);
    expect(r1.sharpeRatio).toBe(r2.sharpeRatio);
  });
});