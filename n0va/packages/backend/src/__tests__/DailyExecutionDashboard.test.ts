import { describe, it, expect, beforeAll } from "vitest";
import { CampaignGoalTrackerService } from "../services/CampaignGoalTrackerService";
import { CampaignBudgetSimulatorService } from "../services/CampaignBudgetSimulatorService";
import { AdsMarketingModuleService } from "../services/AdsMarketingModuleService";
import { DataStore } from "../services/DataStore";

const goalTracker = new CampaignGoalTrackerService();
const budgetSimulator = new CampaignBudgetSimulatorService();
const moduleService = new AdsMarketingModuleService();
const T = "daily-dash-test";

beforeAll(() => {
  const mem = DataStore.mem();
  mem.insert("campaigns", { _id: "dash-1", name: "Dash 1", tenantId: T, status: "active", type: "search", platforms: ["meta"], budget: { daily: 500, lifetime: 15000, spent: 12000, remaining: 3000 }, startDate: "2025-01-01", endDate: "2025-12-31" });
  mem.insert("campaigns", { _id: "dash-2", name: "Dash 2", tenantId: T, status: "active", type: "display", platforms: ["google"], budget: { daily: 200, lifetime: 6000, spent: 1000, remaining: 5000 }, startDate: "2025-05-01", endDate: "2025-10-01" });
  mem.insert("campaigns", { _id: "dash-3", name: "Dash 3", tenantId: T, status: "paused", type: "video", platforms: ["tiktok"], budget: { daily: 100, lifetime: 3000, spent: 2900, remaining: 100 }, startDate: "2025-03-01", endDate: "2025-09-01" });
  for (let i = 0; i < 6; i++) {
    mem.insert("metrics", { campaignId: ["dash-1", "dash-2", "dash-3"][i % 3], tenantId: T, date: `2025-07-${String(1 + i).padStart(2, "0")}`, impressions: 2000 + i * 100, clicks: 40 + i * 5, conversions: 2 + i, spend: 50 + i * 10, revenue: 120 + i * 30 });
  }
});

describe("CampaignGoalTrackerService - goalBatchStatus", () => {
  it("returns batch goal status with attainment predictions", () => {
    const r = goalTracker.goalBatchStatus(T);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(r.campaigns.length).toBeGreaterThanOrEqual(1);
    expect(typeof r.totals.scanned).toBe("number");
    expect(typeof r.totals.onTrack).toBe("number");
    expect(typeof r.totals.atRisk).toBe("number");
    expect(typeof r.totals.behind).toBe("number");
    expect(typeof r.totals.projectedToMiss).toBe("number");
    expect(typeof r.totals.summary).toBe("string");
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignId");
      expect(c).toHaveProperty("overallStatus");
      expect(typeof c.compositeProgress).toBe("number");
      expect(typeof c.willAttainCount).toBe("number");
      expect(typeof c.totalGoals).toBe("number");
      expect(typeof c.topRecommendation).toBe("string");
    }
  });
});

describe("CampaignBudgetSimulatorService - budgetRebalancePlan", () => {
  it("returns one-click budget reallocation plan", () => {
    const r = budgetSimulator.budgetRebalancePlan(T);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(r.campaigns.length).toBe(3);
    expect(typeof r.totals.scanned).toBe("number");
    expect(typeof r.totals.toIncrease).toBe("number");
    expect(typeof r.totals.toDecrease).toBe("number");
    expect(typeof r.totals.totalShift).toBe("number");
    expect(typeof r.totals.summary).toBe("string");
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignId");
      expect(typeof c.currentBudget).toBe("number");
      expect(typeof c.recommendedBudget).toBe("number");
      expect(typeof c.delta).toBe("number");
      expect(typeof c.expectedROAS).toBe("number");
      expect(["increase", "decrease", "hold"]).toContain(c.direction);
    }
  });
});

describe("AdsMarketingModuleService - dailyExecutionDashboard", () => {
  it("returns aggregated one-call dashboard with all sections", async () => {
    const r = await moduleService.dailyExecutionDashboard(T);
    expect(typeof r.generatedAt).toBe("string");
    expect(typeof r.morningReport).toBe("string");
    expect(typeof r.healthVerdict).toBe("string");
    expect(typeof r.atRiskCampaigns).toBe("number");
    expect(typeof r.actionsReady).toBe("number");
    expect(r.sections.realTime).toBeDefined();
    expect(r.sections.diagnostics).toBeDefined();
    expect(r.sections.creative).toBeDefined();
    expect(r.sections.saturation).toBeDefined();
    expect(r.sections.bidding).toBeDefined();
    expect(r.sections.summary).toBeDefined();
    expect(r.sections.goals).toBeDefined();
    expect(r.sections.scorecard).toBeDefined();
    expect(r.sections.budget).toBeDefined();
    expect(r.sections.snapshot).toBeDefined();
    expect(r.readyActions.bidAdjustments).toHaveProperty("count");
    expect(r.readyActions.saturationMitigation).toHaveProperty("count");
    expect(r.readyActions.fixPlans).toHaveProperty("count");
    expect(r.readyActions.creativeRefresh).toHaveProperty("count");
    expect(r.readyActions.budgetRebalance).toHaveProperty("count");
    expect(r.readyActions.goalFollowUp).toHaveProperty("count");
    expect(Array.isArray(r.topActions)).toBe(true);
  });
});
