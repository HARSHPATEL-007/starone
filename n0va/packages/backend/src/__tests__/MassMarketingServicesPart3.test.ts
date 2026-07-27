import { describe, it, expect, beforeAll } from "vitest";
import { audienceInsightsService } from "../services/AudienceInsightsService";
import { cdpService } from "../services/CDPService";
import { influencerService } from "../services/InfluencerService";
import { landingPageBuilderService } from "../services/LandingPageBuilderService";
import { playbookExecutionService } from "../services/PlaybookExecutionService";
import { reportBuilderService } from "../services/ReportBuilderService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "mass_pt3_tenant";
const TEST_CAMPAIGN = "mass_pt3_campaign";

beforeAll(() => {
  const mem = DataStore["mem"]();

  for (let i = 0; i < 3; i++) {
    mem.insert("campaigns", {
      name: `Mass Camp ${i}`, tenantId: TEST_TENANT, status: "active",
      budget: { daily: 100, lifetime: 3000, spent: 500 + i * 200, remaining: 2500 - i * 200, currency: "USD" },
      metrics: { impressions: 10000 + i * 2000, clicks: 200 + i * 50, conversions: 10 + i * 3, revenue: 800 + i * 200, spend: 500 + i * 200 },
      startDate: "2025-01-01", endDate: "2025-12-31",
    });
  }
  for (let i = 0; i < 10; i++) {
    mem.insert("metrics", {
      campaignId: TEST_CAMPAIGN, tenantId: TEST_TENANT,
      impressions: 1000 + i * 100, clicks: 50 + i * 5, conversions: 2 + i,
      spend: 100 + i * 10, date: `2025-0${(i % 9) + 1}-01`,
    });
  }
});

describe("AudienceInsightsService", () => {
  it("gets audience insights", () => {
    const result = audienceInsightsService.getInsights(TEST_TENANT);
    expect(result).toHaveProperty("totalAudiences");
    expect(result).toHaveProperty("demographics");
  });

  it("gets lookalike insights", () => {
    const result = audienceInsightsService.getLookalikeInsights(TEST_TENANT);
    expect(result).toHaveProperty("suggestions");
    expect(result).toHaveProperty("recommendation");
  });

  it("performs K-means clustering", () => {
    const data = [[1, 2], [2, 1], [10, 11], [11, 10], [1, 1], [10, 10]];
    const result = audienceInsightsService.kMeansClustering(data, 2);
    expect(result.clusters.length).toBe(data.length);
    expect(result).toHaveProperty("centroids");
    expect(result).toHaveProperty("inertia");
  });

  it("computes segment overlap", () => {
    const result = audienceInsightsService.computeSegmentOverlap([{ tags: ["a", "b"] }, { tags: ["b", "c"] }]);
    expect(result.length).toBe(1);
    expect(typeof result[0].jaccard).toBe("number");
    expect(typeof result[0].overlapSize).toBe("number");
  });

  it("computes propensity score", () => {
    const campaigns = [{ budget: { spent: 100 } }];
    const result = audienceInsightsService.computePropensityScore({ name: "test", size: 100 }, campaigns);
    expect(typeof result.propensity).toBe("number");
    expect(result.propensity).toBeGreaterThanOrEqual(0);
  });

  it("performs PCA", () => {
    const data = [[2.5, 2.4], [0.5, 0.7], [2.2, 2.9], [1.9, 2.2], [3.1, 3.0], [2.3, 2.7]];
    const result = audienceInsightsService.pca(data, 1);
    expect(result.projected.length).toBe(data.length);
    expect(result.projected[0].length).toBe(1);
  });

  it("performs GMM clustering", () => {
    const data = [[1, 1], [1.5, 2], [8, 9], [9, 8], [1.2, 1.5], [8.5, 8.5]];
    const result = audienceInsightsService.gmmClustering(data, 2);
    expect(result).toHaveProperty("assignments");
    expect(result).toHaveProperty("means");
  });

  it("computes RFM", () => {
    const customers = [
      { id: "c1", daysSinceLastPurchase: 10, purchaseCount: 5, totalSpent: 500 },
      { id: "c2", daysSinceLastPurchase: 60, purchaseCount: 2, totalSpent: 100 },
    ];
    const result = audienceInsightsService.computeRFM(customers);
    expect(result.length).toBe(2);
    expect(result[0]).toHaveProperty("rScore");
    expect(result[0]).toHaveProperty("fScore");
    expect(result[0]).toHaveProperty("mScore");
  });

  it("generates lookalike audience", () => {
    const result = audienceInsightsService.generateLookalike(
      [{ features: { age: 30, income: 70000 } }],
      [{ features: { age: 25, income: 50000 } }, { features: { age: 35, income: 80000 } }],
      5,
    );
    expect(result).toHaveProperty("candidates");
    expect(result.candidates.length).toBeGreaterThan(0);
  });
});

describe("CDPService", () => {
  it("gets CDP stats", () => {
    const stats = cdpService.getStats(TEST_TENANT);
    expect(stats).toHaveProperty("totalProfiles");
    expect(stats.totalProfiles).toBeGreaterThan(0);
    expect(stats).toHaveProperty("totalEvents");
  });

  it("gets profiles", () => {
    const profiles = cdpService.getProfiles(TEST_TENANT);
    expect(profiles.length).toBeGreaterThan(0);
  });

  it("gets a single profile", () => {
    const profile = cdpService.getProfile(TEST_TENANT, "cdp_1");
    expect(profile).not.toBeUndefined();
    expect(profile!.id).toBe("cdp_1");
  });

  it("updates a profile", () => {
    const result = cdpService.updateProfile(TEST_TENANT, "cdp_1", { name: "Updated Name" });
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Updated Name");
  });

  it("returns undefined for non-existent profile", () => {
    expect(cdpService.getProfile(TEST_TENANT, "nonexistent")).toBeUndefined();
  });

  it("gets events", () => {
    const events = cdpService.getEvents(TEST_TENANT);
    expect(events.length).toBeGreaterThan(0);
  });

  it("gets event types", () => {
    const types = cdpService.getEventTypes(TEST_TENANT);
    expect(types.length).toBeGreaterThan(0);
  });

  it("tracks a new event", () => {
    const event = cdpService.trackEvent(TEST_TENANT, { profileId: "cdp_1", type: "click" });
    expect(event).toHaveProperty("id");
    expect(event.type).toBe("click");
  });

  it("gets/updates/deletes segments", () => {
    const segments = cdpService.getSegments(TEST_TENANT);
    expect(segments.length).toBeGreaterThan(0);
    const updated = cdpService.updateSegment(TEST_TENANT, segments[0].id, { name: "Updated Seg" });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Updated Seg");
    const deleted = cdpService.deleteSegment(TEST_TENANT, segments[0].id);
    expect(deleted).toBe(true);
  });

  it("gets event type stats", () => {
    const stats = cdpService.getEventTypeStats(TEST_TENANT);
    expect(stats.length).toBeGreaterThan(0);
    expect(stats[0]).toHaveProperty("type");
  });

  it("resolves identities", () => {
    const result = cdpService.resolveIdentities(TEST_TENANT);
    expect(result).toHaveProperty("matches");
    expect(result).toHaveProperty("resolved");
  });

  it("merges two profiles", () => {
    const merged = cdpService.mergeProfiles(TEST_TENANT, "cdp_1", "cdp_2");
    expect(merged).not.toBeNull();
    expect(merged).toHaveProperty("id");
  });

  it("generates lookalike profiles", () => {
    const result = cdpService.generateLookalike(TEST_TENANT, ["cdp_1", "cdp_3"]);
    expect(result).toHaveProperty("candidates");
    expect(result.seedCount).toBeGreaterThan(0);
  });

  it("predicts LTV", () => {
    const prediction = cdpService.predictLTV(TEST_TENANT, "cdp_1");
    expect(prediction).toHaveProperty("predictedLTV6Months");
    expect(typeof prediction.currentLTV).toBe("number");
  });

  it("batch predicts LTV", () => {
    const result = cdpService.batchPredictLTV(TEST_TENANT);
    expect(result).toHaveProperty("predictions");
    expect(result).toHaveProperty("summary");
    expect(result.predictions.length).toBeGreaterThan(0);
  });
});

describe("InfluencerService", () => {
  it("searches influencers", () => {
    const results = influencerService.search({ niche: "tech" });
    expect(results.length).toBeGreaterThan(0);
  });

  it("adds to campaign", () => {
    const ci = influencerService.addToCampaign(TEST_TENANT, {
      campaignId: TEST_CAMPAIGN, influencerId: "inf_t1",
      influencerName: "Test", influencerHandle: "@t",
      platform: "instagram", deliverables: ["post"], compensation: 500,
    });
    expect(ci).toHaveProperty("id");
    expect(ci.campaignId).toBe(TEST_CAMPAIGN);
  });

  it("updates status", () => {
    const ci = influencerService.addToCampaign(TEST_TENANT, {
      campaignId: TEST_CAMPAIGN, influencerId: "inf_upd",
      influencerName: "Upd", influencerHandle: "@upd",
      platform: "youtube", deliverables: ["v"], compensation: 1000,
    });
    const updated = influencerService.updateInfluencerStatus(TEST_TENANT, ci.id, "approved");
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("approved");
  });

  it("gets platforms", () => {
    const platforms = influencerService.getPlatforms();
    expect(platforms.length).toBeGreaterThan(0);
  });

  it("computes audience quality", () => {
    const r = influencerService.computeAudienceQuality({ followers: 50000, engagementRate: 0.03, fakeFollowers: 0.05 });
    expect(typeof r.qualityScore).toBe("number");
  });

  it("detects fake followers", () => {
    const r = influencerService.detectFakeFollowers({
      followers: 100000, engagementRate: 0.001, platform: "instagram",
      priceRange: { min: 10, max: 50 }, avgViews: 500,
      metrics: { totalCampaigns: 50 }, category: ["fashion"],
      name: "", handle: "", bio: "", avatarUrl: "",
      audienceDemographics: { ageGroups: {}, topCountries: [], genderSplit: {} },
    });
    expect(r).toHaveProperty("probability");
  });

  it("predicts ROI", () => {
    const r = influencerService.predictROI(
      { followers: 50000, engagementRate: 0.03, platform: "instagram", priceRange: { min: 100, max: 500 }, category: ["fashion"], name: "", handle: "", bio: "", avatarUrl: "", avgViews: 0, audienceDemographics: { ageGroups: {}, topCountries: [], genderSplit: {} }, metrics: { totalCampaigns: 0 } },
      [],
    );
    expect(r).toHaveProperty("predictedROI");
  });

  it("computes optimal price", () => {
    const r = influencerService.computeOptimalPrice(
      { followers: 50000, engagementRate: 0.03, platform: "instagram", priceRange: { min: 200, max: 800 }, avgViews: 25000, category: ["fashion"], name: "", handle: "", bio: "", avatarUrl: "", audienceDemographics: { ageGroups: {}, topCountries: [], genderSplit: {} }, metrics: { totalCampaigns: 0 } },
    );
    expect(r).toHaveProperty("optimalPrice");
  });

  it("computes brand fit", () => {
    const r = influencerService.computeBrandFit(
      { category: ["fashion", "lifestyle"], name: "", handle: "", bio: "", avatarUrl: "", followers: 0, engagementRate: 0, platform: "", priceRange: { min: 0, max: 0 }, avgViews: 0, audienceDemographics: { ageGroups: {}, topCountries: [], genderSplit: {} }, metrics: { totalCampaigns: 0 } },
      ["fashion", "beauty"],
    );
    expect(r.matchedCategories).toContain("fashion");
  });

  it("ranks influencers", () => {
    const r = influencerService.rankInfluencers(["fashion"], []);
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]).toHaveProperty("rank");
  });
});

describe("LandingPageBuilderService", () => {
  it("gets templates", () => {
    const t = landingPageBuilderService.getTemplates();
    expect(t.length).toBeGreaterThan(0);
  });

  it("creates a page", () => {
    const p = landingPageBuilderService.createPage(TEST_TENANT, { name: "New LP", slug: "new-lp", template: "tpl_default", campaignId: TEST_CAMPAIGN });
    expect(p).toHaveProperty("id");
    expect(p.name).toBe("New LP");
  });

  it("gets pages", () => {
    landingPageBuilderService.createPage(TEST_TENANT, { name: "Another", slug: "another", template: "tpl_default" });
    const pages = landingPageBuilderService.getPages(TEST_TENANT);
    expect(pages.length).toBeGreaterThanOrEqual(2);
  });

  it("gets a specific page", () => {
    const pages = landingPageBuilderService.getPages(TEST_TENANT);
    const page = landingPageBuilderService.getPage(TEST_TENANT, pages[0].id);
    expect(page).not.toBeUndefined();
    expect(page!.id).toBe(pages[0].id);
  });

  it("updates a page", () => {
    const pages = landingPageBuilderService.getPages(TEST_TENANT);
    const updated = landingPageBuilderService.updatePage(TEST_TENANT, pages[0].id, { name: "Updated LP" });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Updated LP");
  });

  it("publishes a page", () => {
    const pages = landingPageBuilderService.getPages(TEST_TENANT);
    const result = landingPageBuilderService.publishPage(TEST_TENANT, pages[0].id);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("published");
  });

  it("deletes a page", () => {
    const page = landingPageBuilderService.createPage(TEST_TENANT, { name: "Del", slug: "del", template: "tpl_default" });
    expect(landingPageBuilderService.deletePage(TEST_TENANT, page.id)).toBe(true);
  });

  it("predicts conversion", () => {
    const r = landingPageBuilderService.predictConversion({
      sections: [{ type: "hero", content: { headline: "Great Offer", cta: "Buy Now" } }],
    });
    expect(typeof r.predictedCvr).toBe("number");
    expect(r).toHaveProperty("confidence");
  });

  it("computes SEO score", () => {
    const r = landingPageBuilderService.seoScore({
      seo: { title: "Best Shoes Online - Buy Now", description: "Find the best shoes at great prices. Shop our collection today!", keywords: ["shoes", "footwear", "sneakers"] },
    });
    expect(typeof r.overallScore).toBe("number");
  });

  it("optimizes elements", () => {
    const r = landingPageBuilderService.optimizeElements({
      sections: [{ type: "hero", content: { headline: "Old Headline", cta: "Click Here" } }],
    } as any);
    expect(r).toHaveProperty("elements");
    expect(r).toHaveProperty("overallOptimizationScore");
  });

  it("suggests variants", () => {
    const r = landingPageBuilderService.suggestVariants({
      sections: [{ type: "hero", content: { headline: "Original", cta: "Buy" } }],
    } as any);
    expect(r.variants.length).toBeGreaterThan(0);
  });

  it("projects performance", () => {
    const page = landingPageBuilderService.createPage(TEST_TENANT, { name: "Proj", slug: "proj", template: "tpl_default" });
    const r = landingPageBuilderService.projectPerformance(page);
    expect(r).toHaveProperty("current");
    expect(r).toHaveProperty("projected30Days");
  });
});

describe("PlaybookExecutionService", () => {
  it("gets step templates", () => {
    const t = playbookExecutionService.getStepTemplates("onboarding", TEST_TENANT);
    expect(t.length).toBeGreaterThan(0);
  });

  it("creates an execution", () => {
    const exec = playbookExecutionService.createExecution(TEST_TENANT, {
      playbookId: "pb_1", playbookName: "Test",
      campaignId: TEST_CAMPAIGN,
      steps: [{ type: "review", name: "R" }, { type: "approve", name: "A" }],
      createdBy: "tester",
    });
    expect(exec).toHaveProperty("id");
    expect(exec.status).toBe("draft");
  });

  it("gets executions", () => {
    const execs = playbookExecutionService.getExecutions(TEST_TENANT);
    expect(execs.length).toBeGreaterThan(0);
  });

  it("gets a specific execution", () => {
    const execs = playbookExecutionService.getExecutions(TEST_TENANT);
    const exec = playbookExecutionService.getExecution(TEST_TENANT, execs[0].id);
    expect(exec).not.toBeUndefined();
    expect(exec!.id).toBe(execs[0].id);
  });

  it("starts and completes steps", () => {
    const exec = playbookExecutionService.createExecution(TEST_TENANT, {
      playbookId: "pb_2", playbookName: "Start",
      steps: [{ type: "setup", name: "Setup" }], createdBy: "tester",
    });
    const started = playbookExecutionService.startExecution(TEST_TENANT, exec.id);
    if (started) {
      expect(started.status).toBe("running");
      const completed = playbookExecutionService.completeStep(TEST_TENANT, exec.id, exec.steps[0].id);
      expect(completed).not.toBeNull();
    }
  });

  it("fails a step", () => {
    const exec = playbookExecutionService.createExecution(TEST_TENANT, {
      playbookId: "pb_3", playbookName: "Fail",
      steps: [{ type: "a", name: "A" }], createdBy: "tester",
    });
    const started = playbookExecutionService.startExecution(TEST_TENANT, exec.id);
    if (started) {
      const failed = playbookExecutionService.failStep(TEST_TENANT, exec.id, exec.steps[0].id, "Error");
      expect(failed).not.toBeNull();
    }
  });

  it("deletes an execution", () => {
    const exec = playbookExecutionService.createExecution(TEST_TENANT, {
      playbookId: "pb_5", playbookName: "Del",
      steps: [{ type: "x", name: "X" }], createdBy: "tester",
    });
    expect(playbookExecutionService.deleteExecution(TEST_TENANT, exec.id)).toBe(true);
  });

  it("computes critical path", () => {
    const exec = playbookExecutionService.createExecution(TEST_TENANT, {
      playbookId: "pb_6", playbookName: "CP",
      steps: [{ type: "a", name: "A" }, { type: "b", name: "B", dependsOn: ["step_0"] }], createdBy: "tester",
    });
    const result = playbookExecutionService.computeCriticalPath(exec);
    expect(result).toHaveProperty("path");
    expect(result).toHaveProperty("totalDuration");
  });

  it("estimates completion", () => {
    const exec = playbookExecutionService.createExecution(TEST_TENANT, {
      playbookId: "pb_7", playbookName: "Est",
      steps: [{ type: "review", name: "R" }, { type: "approve", name: "A" }], createdBy: "tester",
    });
    const r = playbookExecutionService.estimateCompletion(exec);
    expect(typeof r.expected).toBe("number");
  });

  it("estimates success probability", () => {
    const r = playbookExecutionService.estimateSuccessProbability("review");
    expect(r).toHaveProperty("probability");
  });

  it("analyzes rollback impact", () => {
    const exec = playbookExecutionService.createExecution(TEST_TENANT, {
      playbookId: "pb_8", playbookName: "RB",
      steps: [{ type: "a", name: "A" }, { type: "b", name: "B" }], createdBy: "tester",
    });
    const r = playbookExecutionService.analyzeRollbackImpact(exec, exec.steps[0].id);
    expect(r).toHaveProperty("affectedSteps");
  });
});

describe("ReportBuilderService", () => {
  it("gets default widgets", () => {
    const w = reportBuilderService.getDefaultWidgets();
    expect(w.length).toBeGreaterThan(0);
  });

  it("creates a report", () => {
    const r = reportBuilderService.createReport(TEST_TENANT, { name: "My Report", dateRange: "last_30_days" });
    expect(r).toHaveProperty("id");
    expect(r.name).toBe("My Report");
  });

  it("gets reports", () => {
    reportBuilderService.createReport(TEST_TENANT, { name: "R2", dateRange: "last_7_days" });
    const reports = reportBuilderService.getReports(TEST_TENANT);
    expect(reports.length).toBeGreaterThanOrEqual(2);
  });

  it("gets a specific report", () => {
    const reports = reportBuilderService.getReports(TEST_TENANT);
    const r = reportBuilderService.getReport(TEST_TENANT, reports[0].id);
    expect(r).not.toBeUndefined();
  });

  it("updates a report", () => {
    const reports = reportBuilderService.getReports(TEST_TENANT);
    const updated = reportBuilderService.updateReport(TEST_TENANT, reports[0].id, { name: "Updated" });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Updated");
  });

  it("deletes a report", () => {
    const r = reportBuilderService.createReport(TEST_TENANT, { name: "Del", dateRange: "custom", startDate: "2025-01-01", endDate: "2025-12-31" });
    expect(reportBuilderService.deleteReport(TEST_TENANT, r.id)).toBe(true);
  });

  it("generates report data", () => {
    const r = reportBuilderService.createReport(TEST_TENANT, {
      name: "Data", dateRange: "last_30_days",
      widgets: [{ id: "w1", title: "Conv", type: "metric_card", metric: "conversions", config: {} }],
    });
    const data = reportBuilderService.generateReportData(TEST_TENANT, r.id);
    expect(data).toHaveProperty("widgets");
  });

  it("computes trend line", () => {
    const r = reportBuilderService.computeTrendLine([{ label: "Jan", value: 10 }, { label: "Feb", value: 12 }]);
    expect(r).toHaveProperty("slope");
  });

  it("computes moving average", () => {
    const r = reportBuilderService.movingAverage([{ label: "d1", value: 10 }, { label: "d2", value: 12 }, { label: "d3", value: 15 }], 3);
    expect(r.length).toBe(3);
  });

  it("forecasts", () => {
    const r = reportBuilderService.forecast("impressions", [{ label: "Jan", value: 100 }, { label: "Feb", value: 120 }, { label: "Mar", value: 150 }, { label: "Apr", value: 140 }], 3);
    expect(r).toHaveProperty("points");
    expect(r.points.length).toBe(3);
  });

  it("generates insights", () => {
    const r = reportBuilderService.generateInsights(TEST_TENANT);
    expect(Array.isArray(r)).toBe(true);
  });

  it("schedules/removes", () => {
    const r = reportBuilderService.createReport(TEST_TENANT, { name: "Sched", dateRange: "last_30_days" });
    const scheduled = reportBuilderService.scheduleReport(TEST_TENANT, r.id, { frequency: "weekly", time: "09:00", dayOfWeek: 1, recipients: ["a@test.com"], format: "pdf" });
    expect(scheduled).not.toBeNull();
    const removed = reportBuilderService.removeSchedule(TEST_TENANT, r.id);
    expect(removed).not.toBeNull();
    expect(removed!.schedule).toBeUndefined();
  });

  it("returns available metrics", () => {
    expect(reportBuilderService.getAvailableMetrics().length).toBeGreaterThan(0);
  });

  it("returns chart types", () => {
    expect(reportBuilderService.getChartTypes().length).toBeGreaterThan(0);
  });
});
