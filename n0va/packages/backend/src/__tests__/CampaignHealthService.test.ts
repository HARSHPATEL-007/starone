import { describe, it, expect, beforeAll } from "vitest";
import { CampaignHealthService } from "../services/CampaignHealthService";
import { DataStore } from "../services/DataStore";

const service = new CampaignHealthService();
const T = "health-test-tenant";

beforeAll(async () => {
  const mem = DataStore.mem();
  mem.insert("campaigns", {
    _id: "h-camp-1", name: "Health Campaign 1", tenantId: T, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 14000, remaining: 1000 },
    startDate: "2025-01-01", endDate: "2025-12-31", platforms: ["meta"],
  });
  mem.insert("campaigns", {
    _id: "h-camp-2", name: "Health Campaign 2", tenantId: T, status: "active",
    budget: { daily: 200, lifetime: 6000, spent: 1000, remaining: 5000 },
    startDate: "2025-05-01", endDate: "2025-10-01", platforms: ["google"],
  });
  const dates: string[] = [];
  const d = new Date("2025-06-01");
  for (let i = 0; i < 14; i++) {
    dates.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }
  for (const date of dates) {
    DataStore.mem().insert("metrics", { campaignId: "h-camp-1", tenantId: T, date, impressions: 2000 + Math.floor(Math.random() * 1000), clicks: 20 + Math.floor(Math.random() * 40), conversions: 1 + Math.floor(Math.random() * 5), spend: 50 + Math.floor(Math.random() * 100), revenue: 100 + Math.floor(Math.random() * 300) });
    DataStore.mem().insert("metrics", { campaignId: "h-camp-2", tenantId: T, date, impressions: 5000 + Math.floor(Math.random() * 2000), clicks: 100 + Math.floor(Math.random() * 100), conversions: 5 + Math.floor(Math.random() * 10), spend: 30 + Math.floor(Math.random() * 50), revenue: 200 + Math.floor(Math.random() * 500) });
  }
});

describe("CampaignHealthService - healthStatusQuickView", () => {
  it("returns portfolio health overview", async () => {
    const r = await service.healthStatusQuickView(T);
    expect(typeof r.totalCampaigns).toBe("number");
    expect(typeof r.averageScore).toBe("number");
    expect(typeof r.criticalCount).toBe("number");
    expect(typeof r.warningCount).toBe("number");
    expect(typeof r.healthyCount).toBe("number");
    expect(typeof r.topIssue).toBe("string");
    expect(r.trendSummary).toHaveProperty("up");
    expect(r.trendSummary).toHaveProperty("down");
    expect(r.trendSummary).toHaveProperty("stable");
    expect(Array.isArray(r.quickRecommendations)).toBe(true);
  });
});

describe("CampaignHealthService - healthAlertDigest", () => {
  it("returns consolidated alert digest", async () => {
    const r = await service.healthAlertDigest(T);
    expect(typeof r.totalAlerts).toBe("number");
    expect(Array.isArray(r.criticalAlerts)).toBe(true);
    expect(Array.isArray(r.warningAlerts)).toBe(true);
    expect(Array.isArray(r.infoAlerts)).toBe(true);
    expect(typeof r.mostUrgentCampaign).toBe("string");
    for (const alert of r.criticalAlerts) {
      expect(alert).toHaveProperty("campaignName");
      expect(alert).toHaveProperty("message");
    }
  });
});

describe("CampaignHealthService - healthBatchResolveIssues", () => {
  it("batch resolves health issues", async () => {
    const r = await service.healthBatchResolveIssues(T, [], ["budget_exhausted"]);
    expect(typeof r.totalProcessed).toBe("number");
    expect(typeof r.campaignsAffected).toBe("number");
    expect(typeof r.issuesResolved).toBe("number");
  });
});
