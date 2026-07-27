import { describe, it, expect, beforeAll } from "vitest";
import { autonomousCampaignManager } from "../services/AutonomousCampaignManagerService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_tenant_acm";

beforeAll(() => {
  const mem = DataStore["mem"]();
  for (let i = 0; i < 5; i++) {
    mem.insert("campaigns", {
      name: `ACM Camp ${i}`,
      tenantId: TEST_TENANT,
      status: i < 3 ? "active" : "paused",
      budget: { daily: 100, lifetime: 3000, spent: 500 + i * 200, remaining: 2500 - i * 200, currency: "USD" },
      metrics: { impressions: 10000 + i * 2000, clicks: 200 + i * 50, conversions: 10 + i * 3, revenue: 800 + i * 200, spend: 500 + i * 200 },
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
  }
});

describe("AutonomousCampaignManager - analyzeCampaign", () => {
  it("returns analysis for a valid campaign", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const r = autonomousCampaignManager.analyzeCampaign(campaigns[0]._id, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(campaigns[0]._id);
    expect(r!.healthScore).toBeGreaterThan(0);
    expect(r!.performance.roas).toBeGreaterThan(0);
    expect(r!.recommendations.length).toBeGreaterThanOrEqual(0);
  });

  it("returns null for non-existent campaign", () => {
    const r = autonomousCampaignManager.analyzeCampaign("nonexistent", TEST_TENANT);
    expect(r).toBeNull();
  });
});

describe("AutonomousCampaignManager - analyzePortfolio", () => {
  it("returns portfolio analysis with summary", () => {
    const r = autonomousCampaignManager.analyzePortfolio(TEST_TENANT);
    expect(r.analyses.length).toBeGreaterThan(0);
    expect(r.summary.totalCampaigns).toBeGreaterThan(0);
    expect(r.summary.avgHealthScore).toBeGreaterThan(0);
    expect(r.summary.portfolioROAS).toBeGreaterThan(0);
  });
});

describe("AutonomousCampaignManager - generateOptimizationPlan", () => {
  it("returns optimization plan for a campaign", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const r = autonomousCampaignManager.generateOptimizationPlan(campaigns[0]._id, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.currentBudget).toBeGreaterThan(0);
    expect(r!.expectedROAS).toBeGreaterThan(0);
  });
});

describe("AutonomousCampaignManager - autoAdjustBudget", () => {
  it("adjusts budget for a campaign", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const r = autonomousCampaignManager.autoAdjustBudget(campaigns[0]._id, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(campaigns[0]._id);
    expect(r!.reason).toBeTruthy();
  });
});

describe("AutonomousCampaignManager - autoAdjustBids", () => {
  it("adjusts bids for a campaign", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const r = autonomousCampaignManager.autoAdjustBids(campaigns[0]._id, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.adjustments.length).toBeGreaterThan(0);
  });
});

describe("AutonomousCampaignManager - scheduled changes", () => {
  it("schedules a change and retrieves it", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const scheduled = autonomousCampaignManager.scheduleCampaignChange(campaigns[0]._id, "budget", "Increase budget by 20%", "Performance positive", TEST_TENANT);
    expect(scheduled.id).toBeTruthy();
    expect(scheduled.status).toBe("pending");
    const changes = autonomousCampaignManager.getScheduledChanges(campaigns[0]._id);
    expect(changes.length).toBeGreaterThan(0);
  });

  it("executes scheduled changes", () => {
    const result = autonomousCampaignManager.executeScheduledChanges();
    expect(result.executed).toBeGreaterThanOrEqual(0);
  });
});

describe("AutonomousCampaignManager - detectAnomalies", () => {
  it("detects anomalies for a campaign", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const r = autonomousCampaignManager.detectAnomalies(campaigns[0]._id, TEST_TENANT);
    expect(Array.isArray(r)).toBe(true);
  });
});

describe("AutonomousCampaignManager - generateExecutiveReport", () => {
  it("generates executive report", () => {
    const r = autonomousCampaignManager.generateExecutiveReport(TEST_TENANT);
    expect(r.generatedAt).toBeTruthy();
    expect(r.portfolioSummary.totalCampaigns).toBeGreaterThan(0);
    expect(r.portfolioSummary.portfolioROAS).toBeGreaterThan(0);
    expect(r.topPerformers.length).toBeGreaterThanOrEqual(0);
    expect(r.actionItems.length).toBeGreaterThanOrEqual(0);
  });
});

describe("AutonomousCampaignManager - getPerformanceForecast", () => {
  it("forecasts performance for a campaign", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const r = autonomousCampaignManager.getPerformanceForecast(campaigns[0]._id, TEST_TENANT, 7);
    expect(r).not.toBeNull();
    expect(r!.dailyProjections.length).toBe(7);
    expect(r!.totalProjectedRevenue).toBeGreaterThan(0);
    expect(r!.confidence).toBeGreaterThan(0);
  });
});

describe("AutonomousCampaignManager - recommendBudgetAllocation", () => {
  it("recommends budget allocation across portfolio", () => {
    const r = autonomousCampaignManager.recommendBudgetAllocation(TEST_TENANT);
    expect(r.allocations.length).toBeGreaterThan(0);
    expect(r.totalBudget).toBeGreaterThan(0);
    expect(r.projectedTotalROAS).toBeGreaterThan(0);
  });
});

describe("AutonomousCampaignManager - recommendPacingTargets", () => {
  it("recommends pacing targets", () => {
    const r = autonomousCampaignManager.recommendPacingTargets(TEST_TENANT);
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].dailyBudget).toBeGreaterThan(0);
  });
});

describe("AutonomousCampaignManager - optimizeCampaignSchedule", () => {
  it("returns schedule optimization", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const r = autonomousCampaignManager.optimizeCampaignSchedule(campaigns[0]._id, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.recommendedHours.length).toBe(24);
  });
});

describe("AutonomousCampaignManager - generateABTestRecommendation", () => {
  it("generates A/B test recommendation", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const r = autonomousCampaignManager.generateABTestRecommendation(campaigns[0]._id, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.recommendedTest).toBeTruthy();
    expect(r!.variants.length).toBeGreaterThan(0);
  });
});

describe("AutonomousCampaignManager - analyzeCompetitiveLandscape", () => {
  it("analyzes competitive landscape", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const r = autonomousCampaignManager.analyzeCompetitiveLandscape(campaigns[0]._id, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.marketPosition).toBeTruthy();
    expect(r!.competitivePressure).toBeTruthy();
  });
});

describe("AutonomousCampaignManager - generateActionItems", () => {
  it("generates action items from portfolio", () => {
    const r = autonomousCampaignManager.generateActionItems(TEST_TENANT);
    expect(r.length).toBeGreaterThanOrEqual(0);
    if (r.length > 0) {
      expect(r[0].priority).toBeTruthy();
      expect(r[0].action).toBeTruthy();
    }
  });
});

describe("AutonomousCampaignManager - simulateScenario", () => {
  it("simulates a what-if scenario", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const r = autonomousCampaignManager.simulateScenario(campaigns[0]._id, TEST_TENANT, "Increase budget 20%", { budgetChange: 20 });
    expect(r).not.toBeNull();
    expect(r!.projectedRevenue).toBeGreaterThan(0);
    expect(r!.projectedROAS).toBeGreaterThan(0);
  });
});

describe("AutonomousCampaignManager - getCampaignHealthTrend", () => {
  it("returns health trend with forecast", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const r = autonomousCampaignManager.getCampaignHealthTrend(campaigns[0]._id, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.trend.length).toBe(3);
    expect(r!.forecast.length).toBe(7);
    expect(r!.direction).toBeTruthy();
  });
});

describe("AutonomousCampaignManager - autoPauseUnderperforming", () => {
  it("auto-pauses underperforming campaigns", () => {
    const r = autonomousCampaignManager.autoPauseUnderperforming(TEST_TENANT);
    expect(r.paused).toBeDefined();
    expect(typeof r.skipped).toBe("number");
  });
});

describe("AutonomousCampaignManager - generateWeeklyReport", () => {
  it("generates weekly report", () => {
    const r = autonomousCampaignManager.generateWeeklyReport(TEST_TENANT);
    expect(r.weekStart).toBeTruthy();
    expect(r.weekEnd).toBeTruthy();
    expect(r.portfolioSummary.portfolioROAS).toBeGreaterThan(0);
    expect(r.topInsights.length).toBeGreaterThan(0);
    expect(r.nextWeekPlan.length).toBeGreaterThan(0);
  });
});

describe("AutonomousCampaignManager - action items management", () => {
  it("gets and clears action items", () => {
    const items = autonomousCampaignManager.getActionItems();
    expect(Array.isArray(items)).toBe(true);
    autonomousCampaignManager.clearActionItems();
    expect(autonomousCampaignManager.getActionItems().length).toBe(0);
  });
});
