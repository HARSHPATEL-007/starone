import { describe, it, expect, beforeAll } from "vitest";
import { CampaignAIBiddingAgentService } from "../services/CampaignAIBiddingAgentService";
import { CampaignSnapshotService } from "../services/CampaignSnapshotService";
import { CampaignSaturationService } from "../services/CampaignSaturationService";
import { CampaignPerformanceDiagnosticsService } from "../services/CampaignPerformanceDiagnosticsService";
import { CampaignCreativeOptimizerService } from "../services/CampaignCreativeOptimizerService";
import { DataStore } from "../services/DataStore";

const biddingAgent = new CampaignAIBiddingAgentService();
const snapshotService = new CampaignSnapshotService();
const saturation = new CampaignSaturationService();
const diagnostics = new CampaignPerformanceDiagnosticsService();
const creativeOptimizer = new CampaignCreativeOptimizerService();
const T = "batch-actions-test";

beforeAll(() => {
  const mem = DataStore.mem();
  mem.insert("campaigns", { _id: "bat-1", name: "Batch 1", tenantId: T, status: "active", type: "search", platforms: ["meta"], budget: { daily: 500, lifetime: 15000, spent: 12000, remaining: 3000 }, startDate: "2025-01-01", endDate: "2025-12-31" });
  mem.insert("campaigns", { _id: "bat-2", name: "Batch 2", tenantId: T, status: "active", type: "display", platforms: ["google"], budget: { daily: 200, lifetime: 6000, spent: 1000, remaining: 5000 }, startDate: "2025-05-01", endDate: "2025-10-01" });
  mem.insert("campaigns", { _id: "bat-3", name: "Batch 3", tenantId: T, status: "paused", type: "video", platforms: ["tiktok"], budget: { daily: 100, lifetime: 3000, spent: 2900, remaining: 100 }, startDate: "2025-03-01", endDate: "2025-09-01" });
  for (let i = 0; i < 6; i++) {
    mem.insert("metrics", { campaignId: ["bat-1", "bat-2", "bat-3"][i % 3], tenantId: T, date: `2025-07-${String(1 + i).padStart(2, "0")}`, impressions: 2000 + i * 100, clicks: 40 + i * 5, conversions: 2 + i, spend: 50 + i * 10, revenue: 120 + i * 30 });
  }
});

describe("CampaignAIBiddingAgentService - biddingBatchApplyAdjustments", () => {
  it("returns one-click bid adjustments across campaigns", () => {
    const r = biddingAgent.biddingBatchApplyAdjustments(T);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(typeof r.aggregateImpact.campaignsUpdated).toBe("number");
    expect(typeof r.aggregateImpact.totalAdjustments).toBe("number");
    expect(typeof r.aggregateImpact.avgCPCChange).toBe("number");
    expect(typeof r.aggregateImpact.avgWinRateChange).toBe("number");
    expect(typeof r.aggregateImpact.avgSpendChange).toBe("number");
    expect(typeof r.summary).toBe("string");
    expect(typeof r.generatedAt).toBe("string");
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignId");
      expect(Array.isArray(c.adjustments)).toBe(true);
      if (c.adjustments.length > 0) {
        expect(c.adjustments[0]).toHaveProperty("channel");
        expect(c.adjustments[0]).toHaveProperty("recommendedBid");
        expect(c.adjustments[0]).toHaveProperty("priority");
      }
    }
  });

  it("includes low-priority adjustments when priorityOnly is false", () => {
    const r = biddingAgent.biddingBatchApplyAdjustments(T, false);
    expect(typeof r.aggregateImpact.totalAdjustments).toBe("number");
    expect(r.aggregateImpact.totalAdjustments).toBeGreaterThanOrEqual(r.campaigns.length);
  });
});

describe("CampaignSnapshotService - snapshotBatchCapture", () => {
  it("captures a snapshot for every campaign in tenant", async () => {
    const r = await snapshotService.snapshotBatchCapture(T, "Test Capture");
    expect(r.total).toBe(3);
    expect(r.captured.length).toBe(3);
    expect(Array.isArray(r.failed)).toBe(true);
    expect(typeof r.summary).toBe("string");
    for (const c of r.captured) {
      expect(c).toHaveProperty("campaignId");
      expect(c).toHaveProperty("snapshotId");
      expect(c).toHaveProperty("capturedAt");
    }
    const stored = DataStore.mem().find("campaign_snapshots", (s: any) => s.tenantId === T);
    expect(stored.length).toBeGreaterThanOrEqual(3);
  });
});

describe("CampaignSaturationService - saturationBatchMitigation", () => {
  it("returns prioritized mitigation actions for saturated campaigns", () => {
    const r = saturation.saturationBatchMitigation(T);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(typeof r.totals.scanned).toBe("number");
    expect(typeof r.totals.requiringAction).toBe("number");
    expect(typeof r.totals.highPriorityActions).toBe("number");
    expect(typeof r.totals.summary).toBe("string");
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignId");
      expect(c).toHaveProperty("saturationLevel");
      expect(Array.isArray(c.actions)).toBe(true);
      if (c.actions.length > 0) {
        expect(c.actions[0]).toHaveProperty("action");
        expect(c.actions[0]).toHaveProperty("expectedImpact");
        expect(c.actions[0]).toHaveProperty("priority");
      }
      expect(typeof c.projectedImprovement).toBe("number");
    }
  });
});

describe("CampaignPerformanceDiagnosticsService - diagnosticsBatchFixPlan", () => {
  it("returns ready-to-apply fix plans for campaigns needing attention", () => {
    const r = diagnostics.diagnosticsBatchFixPlan(T);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(typeof r.totals.campaignsScanned).toBe("number");
    expect(typeof r.totals.withPlan).toBe("number");
    expect(typeof r.totals.totalSteps).toBe("number");
    expect(typeof r.totals.highEffortFixes).toBe("number");
    expect(typeof r.totals.summary).toBe("string");
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignId");
      expect(c).toHaveProperty("score");
      expect(c).toHaveProperty("grade");
      expect(Array.isArray(c.steps)).toBe(true);
      if (c.steps.length > 0) {
        expect(c.steps[0]).toHaveProperty("order");
        expect(c.steps[0]).toHaveProperty("description");
        expect(c.steps[0]).toHaveProperty("effort");
      }
    }
  });
});

describe("CampaignCreativeOptimizerService - creativeBatchRefreshPlan", () => {
  it("returns refresh plan for fatigued creatives", () => {
    const r = creativeOptimizer.creativeBatchRefreshPlan(T);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(typeof r.totals.campaignsScanned).toBe("number");
    expect(typeof r.totals.assetsToRefresh).toBe("number");
    expect(typeof r.totals.severeAssets).toBe("number");
    expect(typeof r.totals.summary).toBe("string");
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignId");
      expect(Array.isArray(c.assets)).toBe(true);
      if (c.assets.length > 0) {
        expect(c.assets[0]).toHaveProperty("assetId");
        expect(c.assets[0]).toHaveProperty("fatigueLevel");
        expect(c.assets[0]).toHaveProperty("suggestedRefreshDate");
      }
      expect(c).toHaveProperty("topRefresh");
    }
  });
});
