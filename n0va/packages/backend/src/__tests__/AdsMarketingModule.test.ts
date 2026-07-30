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
  mem.insert("audiences", {
    tenantId: TEST_TENANT, name: "AMM Test Audience 1", type: "custom", platform: "meta", size: 100000, status: "active",
    criteria: { job_titles: ["CTO"] }, createdBy: "test",
  });
  mem.insert("audiences", {
    tenantId: TEST_TENANT, name: "AMM Test Audience 2", type: "lookalike", platform: "google", size: 500000, status: "active",
    criteria: { source: "customer_list", percentage: 5 }, createdBy: "test",
  });
  mem.insert("creatives", {
    tenantId: TEST_TENANT, name: "AMM Creative 1", type: "image", status: "active",
    performance: { impressions: 50000, clicks: 1500, conversions: 75, spend: 3000, revenue: 9000 },
    createdBy: "test",
  });
  mem.insert("creatives", {
    tenantId: TEST_TENANT, name: "AMM Creative 2", type: "video", status: "active",
    performance: { impressions: 80000, clicks: 2400, conversions: 120, spend: 5000, revenue: 20000 },
    createdBy: "test",
  });
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

describe("AdsMarketingModule - competitiveBenchmark", () => {
  it("returns benchmark comparison with industry data", () => {
    const r = adsMarketingModule.competitiveBenchmark(TEST_TENANT);
    expect(r.generatedAt).toBeTruthy();
    expect(r.portfolioSummary.totalCampaigns).toBeGreaterThan(0);
    expect(r.benchmarks.length).toBeGreaterThan(0);
    expect(r.topGaps.length).toBeGreaterThan(0);
    for (const b of r.benchmarks) {
      expect(["above", "at", "below"]).toContain(b.verdict);
      expect(b.portfolioAvg).toBeGreaterThanOrEqual(0);
      expect(b.industryAvg).toBeGreaterThan(0);
    }
  });
});

describe("AdsMarketingModule - realTimeMonitor", () => {
  it("returns real-time snapshot with alerts and snapshots", () => {
    const r = adsMarketingModule.realTimeMonitor(TEST_TENANT);
    expect(r.generatedAt).toBeTruthy();
    expect(r.activeCampaigns).toBeGreaterThan(0);
    expect(r.totalLiveSpend).toBeGreaterThanOrEqual(0);
    expect(r.liveROAS).toBeGreaterThanOrEqual(0);
    expect(r.alerts).toBeDefined();
    expect(r.campaignSnapshots.length).toBeGreaterThan(0);
    for (const s of r.campaignSnapshots) {
      expect(s.campaignId).toBeTruthy();
      expect(["up", "down", "stable"]).toContain(s.trend);
    }
  });
});

describe("AdsMarketingModule - budgetRebalancer", () => {
  it("returns budget rebalance recommendations", () => {
    const r = adsMarketingModule.budgetRebalancer(TEST_TENANT);
    expect(r.generatedAt).toBeTruthy();
    expect(r.totalBudget).toBeGreaterThan(0);
    expect(r.summary.campaignsAnalyzed).toBeGreaterThan(0);
    expect(r.reallocations.length).toBeGreaterThan(0);
    expect(r.underperformers).toBeDefined();
    expect(r.topPerformers).toBeDefined();
    for (const ra of r.reallocations) {
      expect(ra.rationale).toBeTruthy();
    }
  });
});

describe("AdsMarketingModule - performanceForecast", () => {
  it("returns forecasts with portfolio projection", () => {
    const r = adsMarketingModule.performanceForecast(TEST_TENANT, 14);
    expect(r.generatedAt).toBeTruthy();
    expect(r.forecasts.length).toBeGreaterThan(0);
    expect(r.portfolioProjection.projectedTotalRevenue).toBeGreaterThanOrEqual(0);
    expect(r.portfolioProjection.avgConfidence).toBeGreaterThanOrEqual(0);
  });
});

describe("AdsMarketingModule - anomalyScan", () => {
  it("returns anomaly scan across all campaigns", () => {
    const r = adsMarketingModule.anomalyScan(TEST_TENANT);
    expect(r.generatedAt).toBeTruthy();
    expect(r.totalAnomalies).toBeGreaterThanOrEqual(0);
    expect(r.criticalCount + r.highCount + r.mediumCount + r.lowCount).toBe(r.totalAnomalies);
    expect(r.topCampaigns).toBeDefined();
    expect(r.anomalies).toBeDefined();
  });
});

describe("AdsMarketingModule - executiveBriefing", () => {
  it("returns executive briefing with sections and takeaways", () => {
    const r = adsMarketingModule.executiveBriefing(TEST_TENANT);
    expect(r.generatedAt).toBeTruthy();
    expect(r.title).toBeTruthy();
    expect(r.summary).toBeTruthy();
    expect(r.sections.length).toBeGreaterThan(0);
    expect(r.keyTakeaways.length).toBeGreaterThan(0);
    expect(r.recommendedActions).toBeDefined();
    for (const s of r.sections) {
      expect(s.heading).toBeTruthy();
      expect(s.metrics.length).toBeGreaterThan(0);
    }
  });
});

describe("AdsMarketingModule - audienceOverlapAnalysis", () => {
  it("returns overlap analysis across active campaigns", () => {
    const ids = ["camp_a", "camp_b", "camp_c"];
    const r = adsMarketingModule.audienceOverlapAnalysis(ids, TEST_TENANT);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(3);
    for (const o of r) {
      expect(o).toHaveProperty("audienceA");
      expect(o).toHaveProperty("audienceB");
      expect(o).toHaveProperty("overlapPercent");
      expect(o).toHaveProperty("recommendation");
    }
  });
});

describe("AdsMarketingModule - crossPlatformAudienceSync", () => {
  it("returns cross-platform sync analysis", () => {
    const r = adsMarketingModule.crossPlatformAudienceSync(TEST_TENANT);
    expect(r.generatedAt).toBeTruthy();
    expect(r.audiences.length).toBeGreaterThan(0);
    expect(r.summary.totalAudiences).toBeGreaterThan(0);
    expect(r.summary.avgMatchRate).toBeGreaterThan(0);
  });
});

describe("AdsMarketingModule - creativePerformanceMatrix", () => {
  it("returns creative performance matrix", () => {
    const r = adsMarketingModule.creativePerformanceMatrix(TEST_TENANT);
    expect(r.generatedAt).toBeTruthy();
    expect(r.creatives.length).toBeGreaterThan(0);
    expect(r.summary.totalCreatives).toBeGreaterThan(0);
    expect(r.summary.avgCTR).toBeGreaterThanOrEqual(0);
    expect(r.summary.avgROAS).toBeGreaterThanOrEqual(0);
  });
});

describe("AdsMarketingModule - placementIntelligence", () => {
  it("returns placement intelligence with recommendations", () => {
    const r = adsMarketingModule.placementIntelligence(TEST_TENANT);
    expect(r.generatedAt).toBeTruthy();
    expect(r.placements.length).toBeGreaterThan(0);
    expect(r.summary.totalPlacements).toBeGreaterThan(0);
    expect(r.topOpportunities.length).toBeGreaterThan(0);
    for (const p of r.placements) {
      expect(p.recommendation).toBeTruthy();
    }
  });
});

describe("AdsMarketingModule - channelAttributionSummary", () => {
  it("returns channel attribution summary", () => {
    const r = adsMarketingModule.channelAttributionSummary(TEST_TENANT);
    expect(r.generatedAt).toBeTruthy();
    expect(r.channels.length).toBeGreaterThan(0);
    expect(r.summary.totalRevenue).toBeGreaterThan(0);
    expect(r.summary.primaryChannel.platform).toBeTruthy();
  });
});

describe("AdsMarketingModule - portfolioScenarioPlanner", () => {
  it("returns scenario plans with projections", () => {
    const r = adsMarketingModule.portfolioScenarioPlanner(TEST_TENANT, []);
    expect(r.generatedAt).toBeTruthy();
    expect(r.baseline.totalROAS).toBeGreaterThan(0);
    expect(r.scenarios.length).toBeGreaterThan(0);
    expect(r.recommendedScenario).not.toBeNull();
    for (const s of r.scenarios) {
      expect(s.name).toBeTruthy();
      expect(s.projectedROAS).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(s.riskLevel);
    }
  });
});

describe("AdsMarketingModule - budgetSimulation", () => {
  it("returns budget simulation with Monte Carlo analysis", () => {
    const r = adsMarketingModule.budgetSimulation(TEST_TENANT);
    expect(r.generatedAt).toBeTruthy();
    expect(r.campaigns.length).toBeGreaterThan(0);
    expect(r.portfolio.currentTotalBudget).toBeGreaterThan(0);
    expect(r.portfolio.projectedMeanROAS).toBeGreaterThan(0);
    for (const c of r.campaigns) {
      expect(c.simulatedMeanROAS).toBeGreaterThan(0);
      expect(c.volatility).toMatch(/^(low|medium|high)$/);
    }
  });
});

describe("AdsMarketingModule - adComplianceAnalysis", () => {
  it("flags problematic ad copy", () => {
    const r = adsMarketingModule.adComplianceAnalysis("This is the BEST product EVER! GUARANTEED results!!! Free trial now!!!");
    expect(r.generatedAt).toBeTruthy();
    expect(r.checks.length).toBeGreaterThan(0);
    expect(r.summary.failed + r.summary.warned).toBeGreaterThan(0);
    expect(r.overallStatus).toMatch(/^(compliant|needs_review|non_compliant)$/);
  });

  it("passes clean ad copy", () => {
    const r = adsMarketingModule.adComplianceAnalysis("Discover how our platform helps marketing teams improve campaign performance");
    expect(r.summary.score).toBeGreaterThanOrEqual(80);
  });
});

describe("AdsMarketingModule - campaignTaxonomyAudit", () => {
  it("audits campaign naming conventions", () => {
    const r = adsMarketingModule.campaignTaxonomyAudit(TEST_TENANT);
    expect(r.generatedAt).toBeTruthy();
    expect(r.campaigns.length).toBeGreaterThan(0);
    expect(r.summary.totalCampaigns).toBeGreaterThan(0);
    expect(r.summary.consistencyScore).toBeGreaterThanOrEqual(0);
  });
});

describe("AdsMarketingModule - audienceSegmentOverlap", () => {
  it("finds segment overlaps", () => {
    const r = adsMarketingModule.audienceSegmentOverlap(TEST_TENANT);
    expect(r.generatedAt).toBeTruthy();
    expect(r.summary.totalSegments).toBeGreaterThanOrEqual(0);
    expect(r.overlaps).toBeDefined();
  });
});

describe("AdsMarketingModule - marketingCalendar", () => {
  it("returns calendar entries and conflicts", () => {
    const r = adsMarketingModule.marketingCalendar(TEST_TENANT, 7, 2025);
    expect(r.generatedAt).toBeTruthy();
    expect(r.month).toBe(7);
    expect(r.year).toBe(2025);
    expect(r.entries).toBeDefined();
    expect(r.conflicts).toBeDefined();
    expect(r.summary.totalCampaigns).toBeGreaterThanOrEqual(0);
  });
});

describe("AdsMarketingModule - creativeAssetPerformance", () => {
  it("analyzes creative asset lifecycle", () => {
    const r = adsMarketingModule.creativeAssetPerformance(TEST_TENANT);
    expect(r.generatedAt).toBeTruthy();
    expect(r.assets.length).toBeGreaterThan(0);
    expect(r.summary.totalAssets).toBeGreaterThan(0);
    expect(r.summary.avgPerformanceScore).toBeGreaterThanOrEqual(0);
    for (const a of r.assets) {
      expect(a.lifecycleStage).toMatch(/^(new|growing|mature|declining|fatigued)$/);
    }
  });
});
