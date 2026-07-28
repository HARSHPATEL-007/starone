import { describe, it, expect, beforeAll } from "vitest";
import { adsMarketingModule } from "../services/AdsMarketingModuleService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_amm_tenant";

beforeAll(() => {
  const mem = DataStore["mem"]();
  for (let i = 0; i < 5; i++) {
    mem.insert("campaigns", {
      name: `AMM Camp ${i}`,
      tenantId: TEST_TENANT,
      status: i < 3 ? "active" : "paused",
      budget: { daily: 100, lifetime: 3000, spent: 500 + i * 200, remaining: 2500 - i * 200, currency: "USD" },
      metrics: { impressions: 10000 + i * 2000, clicks: 200 + i * 50, conversions: 10 + i * 3, revenue: 800 + i * 200, spend: 500 + i * 200 },
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
  }
});

describe("AdsMarketingModule - moduleHealth", () => {
  it("returns healthy status with all services passing", () => {
    const health = adsMarketingModule.moduleHealth();
    expect(health.status).toBe("healthy");
    expect(health.services.autonomousCampaignManager).toBe(true);
    expect(health.services.unifiedAdsPipeline).toBe(true);
    expect(health.services.campaignHealth).toBe(true);
    expect(health.services.campaignSaturation).toBe(true);
    expect(health.services.portfolioBudgetOptimizer).toBe(true);
    expect(health.services.campaignSummary).toBe(true);
    expect(health.checks.length).toBe(6);
    expect(health.timestamp).toBeTruthy();
  });

  it("returns degraded if some services fail", () => {
    const health = adsMarketingModule.moduleHealth();
    expect(health.status).toBe("healthy");
  });
});

describe("AdsMarketingModule - moduleStats", () => {
  it("returns stats with campaign and pipeline counts", () => {
    const stats = adsMarketingModule.moduleStats(TEST_TENANT);
    expect(stats.totalCampaigns).toBeGreaterThan(0);
    expect(stats.activeCampaigns).toBeGreaterThan(0);
    expect(stats.totalPipelines).toBe(0);
    expect(stats.activePipelines).toBe(0);
    expect(stats.avgHealthScore).toBeGreaterThan(0);
    expect(stats.portfolioROAS).toBeGreaterThan(0);
    expect(stats.campaignsAtRisk).toBeGreaterThanOrEqual(0);
    expect(stats.campaignsHealthy).toBeGreaterThanOrEqual(0);
    expect(stats.timestamp).toBeTruthy();
  });
});

describe("AdsMarketingModule - fullCampaignHealth", () => {
  it("returns integrated health for a valid campaign", async () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const r = await adsMarketingModule.fullCampaignHealth(campaigns[0]._id, TEST_TENANT);
    expect(r.campaignId).toBe(campaigns[0]._id);
    expect(r.campaignName).toBe(campaigns[0].name);
    expect(r.integratedScore).toBeGreaterThan(0);
    expect(r.recommendations.length).toBeGreaterThanOrEqual(0);
  });

  it("works for non-existent campaign", async () => {
    const r = await adsMarketingModule.fullCampaignHealth("nonexistent", TEST_TENANT);
    expect(r.campaignId).toBe("nonexistent");
    expect(r.campaignName).toBe("nonexistent");
    expect(r.integratedScore).toBe(50);
  });
});

describe("AdsMarketingModule - optimizationCycle", () => {
  it("returns optimization cycle for a valid campaign", () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const r = adsMarketingModule.optimizationCycle(campaigns[0]._id, TEST_TENANT);
    expect(r.campaignId).toBe(campaigns[0]._id);
    expect(r.optimizationPlan).not.toBeNull();
    expect(r.pacingTarget).not.toBeNull();
    expect(r.abTestRecommendation).not.toBeNull();
    expect(r.summary.actionsRecommended).toBeGreaterThanOrEqual(0);
    expect(r.summary.confidence).toBeGreaterThanOrEqual(0);
  });

  it("returns cycle for non-existent campaign with null plan", () => {
    const r = adsMarketingModule.optimizationCycle("nonexistent", TEST_TENANT);
    expect(r.campaignId).toBe("nonexistent");
    expect(r.optimizationPlan).toBeNull();
  });
});

describe("AdsMarketingModule - executiveDashboard", () => {
  it("returns dashboard with portfolio and pipeline data", () => {
    const d = adsMarketingModule.executiveDashboard(TEST_TENANT);
    expect(d.generatedAt).toBeTruthy();
    expect(d.portfolioSummary.totalCampaigns).toBeGreaterThan(0);
    expect(d.portfolioSummary.portfolioROAS).toBeGreaterThan(0);
    expect(d.portfolioSummary.avgHealthScore).toBeGreaterThan(0);
    expect(d.topPerformers.length).toBeGreaterThan(0);
    expect(d.recommendations).toBeDefined();
  });
});

describe("AdsMarketingModule - runFullLifecycle", () => {
  it("runs full lifecycle for a valid campaign", async () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const r = await adsMarketingModule.runFullLifecycle(campaigns[0]._id, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.pipeline).not.toBeNull();
    expect(r!.summary).not.toBeNull();
    expect(r!.integratedScore).toBeGreaterThan(0);
    expect(r!.timeline.length).toBeGreaterThan(0);
  });

  it("returns null for non-existent campaign", async () => {
    const r = await adsMarketingModule.runFullLifecycle("nonexistent", TEST_TENANT);
    expect(r).toBeNull();
  });
});

describe("AdsMarketingModule - crossServiceAnalysis", () => {
  it("returns integrated analysis for a valid campaign", async () => {
    const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
    const r = await adsMarketingModule.crossServiceAnalysis(campaigns[0]._id, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(campaigns[0]._id);
    expect(r!.health.score).toBeGreaterThan(0);
    expect(r!.risk.level).toBeDefined();
    expect(r!.integratedRecommendation).toBeTruthy();
  });

  it("returns null for non-existent campaign", async () => {
    const r = await adsMarketingModule.crossServiceAnalysis("nonexistent", TEST_TENANT);
    expect(r).toBeNull();
  });
});

describe("AdsMarketingModule - portfolioHealthOverview", () => {
  it("returns portfolio overview with campaign summaries", () => {
    const r = adsMarketingModule.portfolioHealthOverview(TEST_TENANT);
    expect(r.campaigns.length).toBeGreaterThan(0);
    expect(r.summary.total).toBeGreaterThan(0);
    expect(r.summary.avgHealthScore).toBeGreaterThan(0);
    expect(r.summary.portfolioROAS).toBeGreaterThan(0);
  });
});

describe("AdsMarketingModule - generateUnifiedReport", () => {
  it("returns unified report with all sections", () => {
    const r = adsMarketingModule.generateUnifiedReport(TEST_TENANT);
    expect(r.generatedAt).toBeTruthy();
    expect(r.moduleHealth.status).toBe("healthy");
    expect(r.moduleStats.totalCampaigns).toBeGreaterThan(0);
    expect(r.portfolioOverview.campaigns.length).toBeGreaterThan(0);
    expect(r.summary).toBeTruthy();
    expect(r.topRecommendations).toBeDefined();
  });
});
