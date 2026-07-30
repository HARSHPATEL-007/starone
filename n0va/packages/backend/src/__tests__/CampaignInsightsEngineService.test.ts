import { describe, it, expect, beforeAll } from "vitest";
import { CampaignInsightsEngineService } from "../services/CampaignInsightsEngineService";
import { DataStore } from "../services/DataStore";

const service = new CampaignInsightsEngineService();
const T = "insights-engine-test-tenant";

beforeAll(() => {
  const mem = DataStore.mem();
  mem.insert("campaigns", {
    _id: "ie-camp-1", name: "IE Campaign 1", tenantId: T, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 2000, remaining: 13000 },
    metrics: { impressions: 30000, clicks: 1200, conversions: 60, revenue: 9000, spend: 2000, roas: 4.5, ctr: 4.0, cvr: 5.0 },
    startDate: "2025-01-01", endDate: "2025-12-31", platforms: ["meta"],
  });
  mem.insert("campaigns", {
    _id: "ie-camp-2", name: "IE Campaign 2", tenantId: T, status: "active",
    budget: { daily: 200, lifetime: 6000, spent: 4000, remaining: 2000 },
    metrics: { impressions: 50000, clicks: 400, conversions: 10, revenue: 800, spend: 4000, roas: 0.2, ctr: 0.8, cvr: 2.5 },
    startDate: "2025-06-01", endDate: "2025-08-01", platforms: ["google", "meta"],
  });
});

describe("CampaignInsightsEngine - insightAcknowledgeBatch", () => {
  it("batch acknowledges insights", () => {
    const result = service.insightAcknowledgeBatch(T, [], "acknowledge");
    expect(result.total).toBe(0);
    expect(result.succeeded).toBe(0);
  });
});

describe("CampaignInsightsEngine - insightPrioritySummary", () => {
  it("returns prioritized insights", () => {
    const r = service.insightPrioritySummary(T);
    expect(Array.isArray(r.immediate)).toBe(true);
    expect(Array.isArray(r.today)).toBe(true);
    expect(Array.isArray(r.thisWeek)).toBe(true);
    expect(typeof r.resolved).toBe("number");
    for (const item of r.immediate) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("severity");
      expect(item).toHaveProperty("recommendation");
    }
  });
});

describe("CampaignInsightsEngine - insightExport", () => {
  it("exports insights as json", () => {
    const r = service.insightExport(T, "json");
    expect(r.generatedAt).toBeTruthy();
    expect(typeof r.campaignCount).toBe("number");
    expect(typeof r.totalInsights).toBe("number");
    expect(r.data).toHaveProperty("insights");
    expect(r.data).toHaveProperty("summary");
    expect(r.data.summary).toHaveProperty("totalInsights");
  });

  it("exports insights as csv", () => {
    const r = service.insightExport(T, "csv");
    expect(typeof r.data).toBe("string");
    expect(r.data).toContain("id,campaignId");
  });
});

describe("CampaignInsightsEngine - insightTrendForecast", () => {
  it("returns trend forecast for a metric", () => {
    const r = service.insightTrendForecast(T, "roas", 30);
    expect(r.metric).toBe("roas");
    expect(typeof r.currentValue).toBe("number");
    expect(typeof r.projectedValue).toBe("number");
    expect(["up", "down", "stable"]).toContain(r.direction);
    expect(typeof r.confidence).toBe("number");
    expect(typeof r.campaignsAbove).toBe("number");
    expect(typeof r.campaignsBelow).toBe("number");
  });
});

describe("CampaignInsightsEngine - insightCampaignRanking", () => {
  it("returns campaigns ranked by insight priority", () => {
    const r = service.insightCampaignRanking(T);
    expect(Array.isArray(r.rankings)).toBe(true);
    expect(r.summary).toHaveProperty("totalCampaigns");
    expect(r.summary).toHaveProperty("avgInsightsPerCampaign");
    for (const rank of r.rankings) {
      expect(rank).toHaveProperty("campaignId");
      expect(rank).toHaveProperty("campaignName");
      expect(typeof rank.totalInsights).toBe("number");
      expect(typeof rank.priorityScore).toBe("number");
      expect(rank).toHaveProperty("topCategory");
    }
    for (let i = 1; i < r.rankings.length; i++) {
      expect(r.rankings[i - 1].priorityScore).toBeGreaterThanOrEqual(r.rankings[i].priorityScore);
    }
  });
});
