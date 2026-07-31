import { describe, it, expect, beforeAll } from "vitest";
import { CampaignCreativeOptimizerService } from "../services/CampaignCreativeOptimizerService";
import { CampaignSaturationService } from "../services/CampaignSaturationService";
import { CampaignAIBiddingAgentService } from "../services/CampaignAIBiddingAgentService";
import { CampaignSnapshotService } from "../services/CampaignSnapshotService";
import { CampaignSummaryService } from "../services/CampaignSummaryService";
import { DataStore } from "../services/DataStore";

const creativeOptimizer = new CampaignCreativeOptimizerService();
const saturation = new CampaignSaturationService();
const biddingAgent = new CampaignAIBiddingAgentService();
const snapshotService = new CampaignSnapshotService();
const summaryService = new CampaignSummaryService();
const T = "portfolio-quick-test";

beforeAll(() => {
  const mem = DataStore.mem();
  mem.insert("campaigns", { _id: "pq-1", name: "Portfolio 1", tenantId: T, status: "active", type: "search", platforms: ["meta"], budget: { daily: 500, lifetime: 15000, spent: 12000, remaining: 3000 }, startDate: "2025-01-01", endDate: "2025-12-31" });
  mem.insert("campaigns", { _id: "pq-2", name: "Portfolio 2", tenantId: T, status: "active", type: "display", platforms: ["google"], budget: { daily: 200, lifetime: 6000, spent: 1000, remaining: 5000 }, startDate: "2025-05-01", endDate: "2025-10-01" });
  for (let i = 0; i < 5; i++) {
    mem.insert("metrics", { campaignId: i % 2 === 0 ? "pq-1" : "pq-2", tenantId: T, date: `2025-07-${String(1 + i).padStart(2, "0")}`, impressions: 2000 + i * 100, clicks: 40 + i * 5, conversions: 2 + i, spend: 50 + i * 10, revenue: 120 + i * 30 });
  }
  for (const cid of ["pq-1", "pq-2"]) {
    mem.insert("campaign_snapshots", { _id: `snap-${cid}-1`, tenantId: T, campaignId: cid, name: "Initial", description: "test", capturedAt: "2025-07-01T00:00:00.000Z", metrics: { impressions: 2100, clicks: 45, conversions: 3, spend: 60, revenue: 150, ctr: 2.1, cpc: 1.33, roas: 2.5, cvr: 6.7 } });
    mem.insert("campaign_snapshots", { _id: `snap-${cid}-2`, tenantId: T, campaignId: cid, name: "Latest", description: "test", capturedAt: "2025-07-10T00:00:00.000Z", metrics: { impressions: 2200, clicks: 48, conversions: 4, spend: 65, revenue: 170, ctr: 2.2, cpc: 1.35, roas: 2.6, cvr: 8.3 } });
  }
});

describe("CampaignCreativeOptimizerService - creativePortfolioHealth", () => {
  it("returns cross-campaign creative fatigue summary", () => {
    const r = creativeOptimizer.creativePortfolioHealth(T);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(r.campaigns.length).toBeGreaterThanOrEqual(1);
    expect(typeof r.totals.campaignsScanned).toBe("number");
    expect(typeof r.totals.refreshNeeded).toBe("number");
    expect(typeof r.totals.fatiguedAssets).toBe("number");
    expect(typeof r.totals.summary).toBe("string");
    expect(typeof r.generatedAt).toBe("string");
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignId");
      expect(c).toHaveProperty("campaignName");
      expect(c).toHaveProperty("avgFatigueScore");
      expect(c).toHaveProperty("status");
      expect(c).toHaveProperty("topRecommendation");
    }
  });
});

describe("CampaignSaturationService - saturationPortfolioOverview", () => {
  it("returns saturation overview sorted by score", () => {
    const r = saturation.saturationPortfolioOverview(T);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(typeof r.totals.scanned).toBe("number");
    expect(typeof r.totals.criticalOrHigh).toBe("number");
    expect(typeof r.totals.fatigued).toBe("number");
    expect(typeof r.totals.projectedRisers).toBe("number");
    expect(typeof r.totals.summary).toBe("string");
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignId");
      expect(c).toHaveProperty("saturationScore");
      expect(c).toHaveProperty("saturationLevel");
      expect(typeof c.fatigueDetected).toBe("boolean");
      expect(typeof c.projectedScore).toBe("number");
      expect(typeof c.recommendation).toBe("string");
    }
  });
});

describe("CampaignAIBiddingAgentService - biddingPortfolioOverview", () => {
  it("returns bidding summary across campaigns", () => {
    const r = biddingAgent.biddingPortfolioOverview(T);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(typeof r.totals.scanned).toBe("number");
    expect(typeof r.totals.highRisk).toBe("number");
    expect(typeof r.totals.lowEfficiency).toBe("number");
    expect(typeof r.totals.overBudget).toBe("number");
    expect(typeof r.totals.summary).toBe("string");
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignId");
      expect(c).toHaveProperty("overallWinRate");
      expect(c).toHaveProperty("budgetUtilization");
      expect(c).toHaveProperty("riskLevel");
      expect(typeof c.bidEfficiency).toBe("number");
      expect(typeof c.recommendedAction).toBe("string");
    }
  });
});

describe("CampaignSnapshotService - snapshotPortfolioSummary", () => {
  it("returns snapshot coverage and health across campaigns", async () => {
    const r = await snapshotService.snapshotPortfolioSummary(T);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(r.totals.withSnapshots).toBe(2);
    expect(typeof r.totals.scanned).toBe("number");
    expect(typeof r.totals.healthy).toBe("number");
    expect(typeof r.totals.atRisk).toBe("number");
    expect(typeof r.totals.declining).toBe("number");
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignId");
      expect(c).toHaveProperty("snapshotCount");
      expect(typeof c.healthScore).toBe("number");
      expect(c).toHaveProperty("rating");
      expect(c).toHaveProperty("trendDirection");
    }
  });
});

describe("CampaignSummaryService - summaryPortfolioQuickView", () => {
  it("returns per-campaign quick summaries sorted by health", () => {
    const r = summaryService.summaryPortfolioQuickView(T);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(r.campaigns.length).toBe(2);
    expect(typeof r.totals.scanned).toBe("number");
    expect(typeof r.totals.highRisk).toBe("number");
    expect(typeof r.totals.lowHealth).toBe("number");
    expect(typeof r.totals.negativeMomentum).toBe("number");
    expect(typeof r.totals.summary).toBe("string");
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignId");
      expect(c).toHaveProperty("campaignName");
      expect(typeof c.shortSummary).toBe("string");
      expect(typeof c.healthScore).toBe("number");
      expect(c).toHaveProperty("momentum");
      expect(c).toHaveProperty("riskLevel");
      expect(typeof c.action).toBe("string");
    }
  });
});
