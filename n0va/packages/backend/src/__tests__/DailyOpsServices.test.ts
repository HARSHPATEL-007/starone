import { describe, it, expect, beforeAll } from "vitest";
import { CampaignGoalTrackerService } from "../services/CampaignGoalTrackerService";
import { CampaignScorecardService } from "../services/CampaignScorecardService";
import { DataStore } from "../services/DataStore";

const goalTracker = new CampaignGoalTrackerService();
const scorecardService = new CampaignScorecardService();
const T = "daily-ops-test";

beforeAll(() => {
  const mem = DataStore.mem();
  mem.insert("campaigns", { _id: "dops-1", name: "Daily Ops 1", tenantId: T, status: "active", type: "search", platforms: ["meta"], budget: { daily: 500, lifetime: 15000, spent: 12000, remaining: 3000 }, startDate: "2025-01-01", endDate: "2025-12-31" });
  mem.insert("campaigns", { _id: "dops-2", name: "Daily Ops 2", tenantId: T, status: "active", type: "display", platforms: ["google"], budget: { daily: 200, lifetime: 6000, spent: 4000, remaining: 2000 }, startDate: "2025-03-01", endDate: "2025-06-01" });
  mem.insert("campaigns", { _id: "dops-3", name: "Daily Ops 3", tenantId: T, status: "paused", type: "social", platforms: ["linkedin"], budget: { daily: 300, lifetime: 9000, spent: 5000, remaining: 4000 }, startDate: "2025-02-01", endDate: "2025-08-31" });
  for (let i = 0; i < 5; i++) {
    mem.insert("metrics", { campaignId: i % 2 === 0 ? "dops-1" : "dops-2", tenantId: T, date: `2025-06-${String(10 + i).padStart(2, "0")}`, impressions: 3000 + i * 100, clicks: 80 + i * 10, conversions: 4 + i, spend: 100 + i * 20, revenue: 200 + i * 50 });
  }
});

describe("CampaignGoalTrackerService - goalDashboard", () => {
  it("returns cross-campaign goal dashboard", () => {
    const r = goalTracker.goalDashboard(T);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(typeof r.totals.totalCampaigns).toBe("number");
    expect(typeof r.totals.onTrack).toBe("number");
    expect(typeof r.totals.averageProgress).toBe("number");
    if (r.campaigns.length > 0) {
      expect(r.campaigns[0]).toHaveProperty("campaignId");
      expect(r.campaigns[0]).toHaveProperty("overallStatus");
      expect(r.campaigns[0]).toHaveProperty("compositeProgress");
    }
  });
});

describe("CampaignGoalTrackerService - goalQuickCheck", () => {
  it("returns quick goals status summary", () => {
    const r = goalTracker.goalQuickCheck(T);
    expect(typeof r.totalGoals).toBe("number");
    expect(typeof r.onTrack).toBe("number");
    expect(typeof r.summary).toBe("string");
    expect(["good", "fair", "critical"]).toContain(r.healthStatus);
  });
});

describe("CampaignScorecardService - scorecardDailySnapshot", () => {
  it("returns daily scorecard snapshot", () => {
    const r = scorecardService.scorecardDailySnapshot(T);
    expect(typeof r.generatedAt).toBe("string");
    expect(typeof r.averageScore).toBe("number");
    expect(Array.isArray(r.needsAttention)).toBe(true);
    expect(Array.isArray(r.distribution)).toBe(true);
    expect(typeof r.improving).toBe("number");
    expect(typeof r.declining).toBe("number");
    expect(typeof r.stable).toBe("number");
  });
});
