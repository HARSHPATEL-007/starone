import { describe, it, expect, beforeAll } from "vitest";
import { CampaignOptimizerService } from "../services/CampaignOptimizerService";
import { DataStore } from "../services/DataStore";

const service = new CampaignOptimizerService();
const T = "opt-test-tenant";

beforeAll(() => {
  const mem = DataStore.mem();
  mem.insert("campaigns", {
    _id: "opt-camp-1", name: "Opt Campaign 1", tenantId: T, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 2000, remaining: 13000, currency: "USD" },
    metrics: { impressions: 30000, clicks: 1200, conversions: 60, revenue: 9000, spend: 2000, roas: 4.5, ctr: 4.0, cvr: 5.0 },
    startDate: "2025-01-01", endDate: "2025-12-31", platforms: ["meta"],
  });
});

describe("CampaignOptimizer - quickOptimizationActions", () => {
  it("returns top quick action items", () => {
    const r = service.quickOptimizationActions(T);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeLessThanOrEqual(3);
    for (const item of r) {
      expect(item).toHaveProperty("applied");
      expect(item).toHaveProperty("suggestionId");
      expect(item).toHaveProperty("action");
      expect(item).toHaveProperty("result");
      expect(typeof item.estimatedValue).toBe("number");
      expect(item).toHaveProperty("executionTime");
    }
  });
});

describe("CampaignOptimizer - autoApplyHighConfidence", () => {
  it("batch applies high-confidence suggestions", () => {
    const r = service.autoApplyHighConfidence(T, 85);
    expect(typeof r.totalAttempted).toBe("number");
    expect(typeof r.succeeded).toBe("number");
    expect(typeof r.failed).toBe("number");
    expect(typeof r.totalPotentialValue).toBe("number");
    expect(Array.isArray(r.details)).toBe(true);
  });
});

describe("CampaignOptimizer - dismissLowValueSuggestions", () => {
  it("dismisses low-value suggestions", () => {
    const r = service.dismissLowValueSuggestions(T, "low");
    expect(typeof r.dismissed).toBe("number");
    expect(Array.isArray(r.suggestionIds)).toBe(true);
  });
});

describe("CampaignOptimizer - oneClickFix", () => {
  it("returns top one-click fix or null", () => {
    const r = service.oneClickFix(T);
    if (r !== null) {
      expect(r).toHaveProperty("campaignId");
      expect(r).toHaveProperty("issue");
      expect(r).toHaveProperty("oneClickAction");
      expect(r).toHaveProperty("expectedImprovement");
      expect(typeof r.confidence).toBe("number");
    }
  });
});

describe("CampaignOptimizer - optimizationPortfolioSummary", () => {
  it("returns portfolio-level summary", () => {
    const r = service.optimizationPortfolioSummary(T);
    expect(r.tenantId).toBe(T);
    expect(typeof r.totalSuggestions).toBe("number");
    expect(typeof r.highImpact).toBe("number");
    expect(typeof r.totalPotentialValue).toBe("number");
    expect(typeof r.avgConfidence).toBe("number");
    expect(Array.isArray(r.topCampaigns)).toBe(true);
    expect(typeof r.quickWins).toBe("number");
    expect(Array.isArray(r.recommendedActions)).toBe(true);
  });
});

describe("CampaignOptimizer - scheduleOptimization", () => {
  it("schedules an optimization for later execution", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const r = service.scheduleOptimization(T, "budget_under_opt-camp-1", future);
    expect(r.tenantId).toBe(T);
    expect(r.suggestionId).toBe("budget_under_opt-camp-1");
    expect(r.applyAt).toBe(future);
    expect(r.status).toBe("pending");
    expect(r).toHaveProperty("scheduledAt");
    expect(r).toHaveProperty("id");
  });
});
