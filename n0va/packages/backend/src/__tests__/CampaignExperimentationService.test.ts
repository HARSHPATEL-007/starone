import { describe, it, expect, beforeAll } from "vitest";
import { CampaignExperimentationService } from "../services/CampaignExperimentationService";
import { DataStore } from "../services/DataStore";

const service = new CampaignExperimentationService();
const T = "exp-test-tenant";

beforeAll(() => {
  const mem = DataStore.mem();
  mem.insert("campaigns", {
    _id: "exp-camp-1", name: "Exp Campaign 1", tenantId: T, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 2000, remaining: 13000 },
    metrics: { impressions: 30000, clicks: 1200, conversions: 60, revenue: 9000, spend: 2000, roas: 4.5, ctr: 4.0, cvr: 5.0 },
    startDate: "2025-01-01", endDate: "2025-12-31", platforms: ["meta"],
  });
  const e1 = service.createExperiment(T, { name: "Test A/B", description: "Test", type: "ab_test", hypothesis: "X improves Y", primaryMetric: "conversions", confidenceLevel: 0.95 });
  if (e1) service.startExperiment(e1.id, T);
  const e2 = service.createExperiment(T, { name: "Draft Test", description: "Draft", type: "ab_test", hypothesis: "Z improves W", primaryMetric: "revenue", confidenceLevel: 0.9 });
});

describe("CampaignExperimentation - experimentDashboard", () => {
  it("returns dashboard overview", () => {
    const r = service.experimentDashboard(T);
    expect(typeof r.total).toBe("number");
    expect(typeof r.running).toBe("number");
    expect(typeof r.completed).toBe("number");
    expect(typeof r.draft).toBe("number");
    expect(typeof r.avgLift).toBe("number");
    expect(typeof r.significantCount).toBe("number");
    expect(Array.isArray(r.runningList)).toBe(true);
    expect(Array.isArray(r.pendingReview)).toBe(true);
    for (const item of r.runningList) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("daysRunning");
    }
  });
});

describe("CampaignExperimentation - experimentQuickStart", () => {
  it("creates and starts an experiment in one call", () => {
    const r = service.experimentQuickStart(T, { name: "Quick Start Test", type: "ab_test", hypothesis: "Quick test", primaryMetric: "clicks" });
    expect(r).not.toBeNull();
    expect(r!.status).toBe("running");
    expect(r!.name).toBe("Quick Start Test");
  });
});

describe("CampaignExperimentation - experimentBatchComplete", () => {
  it("batch completes multiple running experiments", () => {
    const all = service.listExperiments(T);
    const runningIds = all.filter(e => e.status === "running").map(e => e.id);
    const r = service.experimentBatchComplete(T, runningIds);
    expect(r.total).toBe(runningIds.length);
    expect(r.succeeded).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(r.errors)).toBe(true);
  });
});
