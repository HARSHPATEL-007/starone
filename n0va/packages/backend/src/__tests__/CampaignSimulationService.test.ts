import { describe, it, expect } from "vitest";
import { campaignSimulationService } from "../services/CampaignSimulationService";

const sampleChannels = () => campaignSimulationService.generateSampleChannels();
const sampleScenarios = () => campaignSimulationService.generateSampleScenarios();

describe("CampaignSimulationService - runSimulation", () => {
  it("returns simulation result with trials", () => {
    const channels = sampleChannels();
    const scenarios = sampleScenarios();
    const r = campaignSimulationService.runSimulation(channels, scenarios[0], 100, 42);
    expect(r).toHaveProperty("name");
    expect(r).toHaveProperty("trials");
    expect(r.trials.length).toBe(100);
    expect(r).toHaveProperty("summary");
    expect(r.summary).toHaveProperty("meanRevenue");
    expect(r.summary).toHaveProperty("meanROAS");
    expect(r.summary).toHaveProperty("probabilityPositiveROI");
    expect(r.summary).toHaveProperty("channelBreakdown");
    expect(r.summary.channelBreakdown.length).toBe(channels.length);
    expect(r).toHaveProperty("baseComparison");
    expect(r.baseComparison).toHaveProperty("uplift");
    for (const t of r.trials) {
      expect(t).toHaveProperty("trial");
      expect(t).toHaveProperty("totalRevenue");
      expect(t).toHaveProperty("overallROAS");
      expect(Array.isArray(t.channelResults)).toBe(true);
    }
  });

  it("produces deterministic results with same seed", () => {
    const channels = sampleChannels();
    const scenarios = sampleScenarios();
    const r1 = campaignSimulationService.runSimulation(channels, scenarios[0], 50, 42);
    const r2 = campaignSimulationService.runSimulation(channels, scenarios[0], 50, 42);
    expect(r1.summary.meanRevenue).toBe(r2.summary.meanRevenue);
    expect(r1.summary.meanROAS).toBe(r2.summary.meanROAS);
  });
});

describe("CampaignSimulationService - runMultiScenario", () => {
  it("returns results for multiple scenarios", () => {
    const channels = sampleChannels();
    const scenarios = sampleScenarios();
    const r = campaignSimulationService.runMultiScenario(channels, scenarios, 50);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(scenarios.length);
    for (const s of r) {
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("trials");
      expect(s.trials.length).toBe(50);
    }
  });
});

describe("CampaignSimulationService - generateSampleChannels", () => {
  it("returns sample channel configurations", () => {
    const r = campaignSimulationService.generateSampleChannels();
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(5);
    for (const c of r) {
      expect(c).toHaveProperty("name");
      expect(c).toHaveProperty("baseSpend");
      expect(c).toHaveProperty("baseROAS");
      expect(c).toHaveProperty("roasVolatility");
      expect(c).toHaveProperty("saturationHalf");
      expect(c).toHaveProperty("maxSpend");
    }
  });
});

describe("CampaignSimulationService - generateSampleScenarios", () => {
  it("returns sample scenarios", () => {
    const r = campaignSimulationService.generateSampleScenarios();
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThanOrEqual(3);
    for (const s of r) {
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("description");
      expect(s).toHaveProperty("budgetChanges");
    }
  });
});

describe("CampaignSimulationService - sensitivityAnalysis", () => {
  it("returns sensitivity points for a channel", () => {
    const channel = sampleChannels()[0];
    const r = campaignSimulationService.sensitivityAnalysis(channel, 42);
    expect(r.channel).toBe(channel.name);
    expect(Array.isArray(r.points)).toBe(true);
    expect(r.points.length).toBeGreaterThan(0);
    for (const p of r.points) {
      expect(p).toHaveProperty("budgetChangePercent");
      expect(p).toHaveProperty("meanROAS");
      expect(p).toHaveProperty("meanRevenue");
      expect(p).toHaveProperty("probabilityPositive");
    }
    expect(r.optimalChange).toBeGreaterThanOrEqual(-50);
    expect(r.elasticity).toBeGreaterThanOrEqual(0);
  });
});

describe("CampaignSimulationService - budgetOptimization", () => {
  it("returns optimized budget allocation", () => {
    const channels = sampleChannels();
    const totalBudget = channels.reduce((s, c) => s + c.baseSpend, 0) * 1.2;
    const r = campaignSimulationService.budgetOptimization(channels, totalBudget, 42);
    expect(Array.isArray(r.allocations)).toBe(true);
    expect(r.allocations.length).toBe(channels.length);
    for (const a of r.allocations) {
      expect(a).toHaveProperty("channel");
      expect(a).toHaveProperty("currentBudget");
      expect(a).toHaveProperty("recommendedBudget");
      expect(a).toHaveProperty("projectedROAS");
      expect(a).toHaveProperty("projectedRevenue");
    }
    expect(r.totalCurrentBudget).toBeGreaterThan(0);
    expect(r.totalRecommendedBudget).toBeGreaterThan(0);
    expect(r.improvementOverCurrent).not.toBeNaN();
  });
});

describe("CampaignSimulationService - riskAssessment", () => {
  it("returns risk assessment for scenarios", () => {
    const channels = sampleChannels();
    const scenarios = sampleScenarios();
    const r = campaignSimulationService.riskAssessment(channels, scenarios, 42);
    expect(Array.isArray(r.assessments)).toBe(true);
    expect(r.assessments.length).toBe(scenarios.length);
    for (const a of r.assessments) {
      expect(a).toHaveProperty("scenario");
      expect(a).toHaveProperty("probabilityOfLoss");
      expect(a).toHaveProperty("valueAtRisk95");
      expect(a).toHaveProperty("riskScore");
      expect(["low", "medium", "high", "extreme"]).toContain(a.riskScore);
    }
    expect(typeof r.safestScenario).toBe("string");
    expect(typeof r.riskiestScenario).toBe("string");
  });
});

describe("CampaignSimulationService - channelEfficiency", () => {
  it("returns efficiency curve for a channel", () => {
    const channel = sampleChannels()[0];
    const r = campaignSimulationService.channelEfficiency(channel, 42);
    expect(r.channel).toBe(channel.name);
    expect(Array.isArray(r.efficiencyCurve)).toBe(true);
    expect(r.efficiencyCurve.length).toBeGreaterThan(0);
    for (const p of r.efficiencyCurve) {
      expect(p).toHaveProperty("spend");
      expect(p).toHaveProperty("marginalROAS");
      expect(p).toHaveProperty("cumulativeROAS");
      expect(p).toHaveProperty("saturationLevel");
    }
    expect(r.currentMarginalROAS).toBeGreaterThan(0);
    expect(r.saturationPoint).toBeGreaterThan(0);
    expect(typeof r.recommendation).toBe("string");
  });
});

describe("CampaignSimulationService - monteCarloForecast", () => {
  it("returns forecast with confidence intervals", () => {
    const channel = sampleChannels()[0];
    const r = campaignSimulationService.monteCarloForecast(channel, channel.baseSpend, 500, 42);
    expect(r.channel).toBe(channel.name);
    expect(r.meanForecastRevenue).toBeGreaterThan(0);
    expect(r.medianForecastRevenue).toBeGreaterThan(0);
    expect(r.stdDevRevenue).toBeGreaterThan(0);
    expect(r.confidenceInterval90).toHaveProperty("lower");
    expect(r.confidenceInterval90).toHaveProperty("upper");
    expect(r.confidenceInterval95).toHaveProperty("lower");
    expect(r.confidenceInterval95).toHaveProperty("upper");
    expect(r.confidenceInterval90.lower).toBeLessThanOrEqual(r.confidenceInterval90.upper);
    expect(r.probabilityAboveTarget).toBeGreaterThanOrEqual(0);
    expect(r.probabilityAboveTarget).toBeLessThanOrEqual(100);
  });
});

describe("CampaignSimulationService - budgetElasticity", () => {
  it("returns elasticity curve for a channel", () => {
    const channel = sampleChannels()[0];
    const r = campaignSimulationService.budgetElasticity(channel, 42);
    expect(r.channel).toBe(channel.name);
    expect(Array.isArray(r.elasticityPoints)).toBe(true);
    expect(r.elasticityPoints.length).toBeGreaterThan(0);
    for (const p of r.elasticityPoints) {
      expect(p).toHaveProperty("budgetMultiplier");
      expect(p).toHaveProperty("revenueMultiplier");
      expect(p).toHaveProperty("elasticity");
    }
    expect(r.avgElasticity).not.toBeNaN();
    expect(typeof r.interpretation).toBe("string");
  });
});

describe("CampaignSimulationService - optimalChannelMix", () => {
  it("returns optimal mix for target ROAS", () => {
    const channels = sampleChannels();
    const totalBudget = channels.reduce((s, c) => s + c.baseSpend, 0);
    const r = campaignSimulationService.optimalChannelMix(channels, totalBudget, 3.5, 42);
    expect(r.targetROAS).toBe(3.5);
    expect(r.totalBudget).toBe(totalBudget);
    expect(Array.isArray(r.allocations)).toBe(true);
    expect(r.allocations.length).toBe(channels.length);
    for (const a of r.allocations) {
      expect(a).toHaveProperty("channel");
      expect(a).toHaveProperty("budget");
      expect(a).toHaveProperty("share");
      expect(a).toHaveProperty("projectedROAS");
    }
    expect(r.projectedOverallROAS).toBeGreaterThan(0);
    expect(["low", "medium", "high"]).toContain(r.confidenceLevel);
  });
});

describe("CampaignSimulationService - simulationSummary", () => {
  it("returns summary with best/worst scenario", () => {
    const channels = sampleChannels();
    const scenarios = sampleScenarios();
    const r = campaignSimulationService.simulationSummary(channels, scenarios, 42);
    expect(Array.isArray(r.scenarios)).toBe(true);
    expect(r.scenarios.length).toBe(scenarios.length);
    for (const s of r.scenarios) {
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("meanROAS");
      expect(s).toHaveProperty("meanRevenue");
      expect(s).toHaveProperty("probabilityPositive");
      expect(s).toHaveProperty("riskLevel");
      expect(["low", "medium", "high"]).toContain(s.riskLevel);
    }
    expect(typeof r.bestScenario).toBe("string");
    expect(typeof r.worstScenario).toBe("string");
    expect(typeof r.recommendation).toBe("string");
  });
});
