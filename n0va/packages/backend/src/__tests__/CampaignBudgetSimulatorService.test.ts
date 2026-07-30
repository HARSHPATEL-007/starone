import { describe, it, expect, beforeAll } from "vitest";
import { CampaignBudgetSimulatorService } from "../services/CampaignBudgetSimulatorService";

const service = new CampaignBudgetSimulatorService();
const config = { campaignId: "bs-test", budget: 5000, expectedROAS: 3, roasVariance: 0.3, expectedConversions: 100, convVariance: 0.2 };

describe("CampaignBudgetSimulatorService - budgetQuickSimulation", () => {
  it("returns quick what-if with increase direction", () => {
    const r = service.budgetQuickSimulation(config, 20);
    expect(r.direction).toBe("increase");
    expect(typeof r.changeAmount).toBe("number");
    expect(r.original).toHaveProperty("stats");
    expect(r.simulated).toHaveProperty("stats");
    expect(r.original.runs).toBeGreaterThan(0);
    expect(r.simulated.runs).toBeGreaterThan(0);
  });

  it("returns quick what-if with decrease direction", () => {
    const r = service.budgetQuickSimulation(config, -15);
    expect(r.direction).toBe("decrease");
    expect(typeof r.changeAmount).toBe("number");
  });

  it("handles zero change", () => {
    const r = service.budgetQuickSimulation(config, 0);
    expect(r.direction).toBe("unchanged");
  });
});

describe("CampaignBudgetSimulatorService - budgetPortfolioOverview", () => {
  it("returns portfolio overview (no data case)", () => {
    const r = service.budgetPortfolioOverview("nonexistent-tenant");
    expect(typeof r.totalCampaigns).toBe("number");
    expect(typeof r.simulationsRun).toBe("number");
    expect(typeof r.topRecommendation).toBe("string");
    expect(r.budgetDistribution).toHaveProperty("underfunded");
    expect(r.budgetDistribution).toHaveProperty("optimal");
    expect(r.budgetDistribution).toHaveProperty("overfunded");
    expect(typeof r.summary).toBe("string");
  });
});
