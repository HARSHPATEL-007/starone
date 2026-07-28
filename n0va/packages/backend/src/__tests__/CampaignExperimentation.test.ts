import { describe, it, expect } from "vitest";
import { campaignExperimentation } from "../services/CampaignExperimentationService";

const TEST_TENANT = "test_ce_tenant";

describe("CampaignExperimentation - CRUD", () => {
  it("creates an A/B test experiment with default variants", () => {
    const exp = campaignExperimentation.createExperiment(TEST_TENANT, {
      name: "Headline A/B Test",
      description: "Test two headline variants for ROAS impact",
      type: "ab_test",
      hypothesis: "Headline variant B will outperform A by 15%",
      primaryMetric: "revenue",
      confidenceLevel: 0.95,
    });
    expect(exp.id).toBeTruthy();
    expect(exp.name).toBe("Headline A/B Test");
    expect(exp.status).toBe("draft");
    expect(exp.variants.length).toBe(2);
    expect(exp.variants[0].type).toBe("control");
    expect(exp.variants[1].type).toBe("treatment");
  });

  it("creates an experiment with custom variants", () => {
    const exp = campaignExperimentation.createExperiment(TEST_TENANT, {
      name: "Geo Holdout US West",
      description: "Hold out US West region to measure incrementality",
      type: "geo_holdout",
      hypothesis: "Excluding US West reduces revenue by <5%",
      primaryMetric: "revenue",
      confidenceLevel: 0.90,
      variants: [
        { name: "Control (All Regions)", type: "control", config: { regions: ["US-East", "US-Central", "US-West"] } },
        { name: "Treatment (Excl West)", type: "treatment", config: { regions: ["US-East", "US-Central"] } },
      ],
    });
    expect(exp.variants.length).toBe(2);
    expect(exp.variants[0].name).toBe("Control (All Regions)");
  });

  it("lists experiments", () => {
    const list = campaignExperimentation.listExperiments(TEST_TENANT);
    expect(list.length).toBe(2);
  });

  it("gets a single experiment", () => {
    const list = campaignExperimentation.listExperiments(TEST_TENANT);
    const exp = campaignExperimentation.getExperiment(list[0].id, TEST_TENANT);
    expect(exp).not.toBeNull();
    expect(exp!.id).toBe(list[0].id);
  });

  it("updates an experiment", () => {
    const list = campaignExperimentation.listExperiments(TEST_TENANT);
    const updated = campaignExperimentation.updateExperiment(list[0].id, TEST_TENANT, { name: "Updated Headline Test" });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Updated Headline Test");
  });

  it("deletes an experiment", () => {
    const before = campaignExperimentation.listExperiments(TEST_TENANT);
    const deleted = campaignExperimentation.deleteExperiment(before[0].id, TEST_TENANT);
    expect(deleted).toBe(true);
    const after = campaignExperimentation.listExperiments(TEST_TENANT);
    expect(after.length).toBe(before.length - 1);
  });
});

describe("CampaignExperimentation - Lifecycle", () => {
  it("starts a draft experiment", () => {
    const exp = campaignExperimentation.createExperiment(TEST_TENANT, {
      name: "Budget Split Test",
      description: "Test 70/30 vs 50/50 budget split",
      type: "budget_split",
      hypothesis: "70/30 split improves overall ROAS",
      primaryMetric: "roas",
      confidenceLevel: 0.95,
    });
    const started = campaignExperimentation.startExperiment(exp.id, TEST_TENANT);
    expect(started).not.toBeNull();
    expect(started!.status).toBe("running");
    expect(started!.startDate).toBeTruthy();
  });

  it("records metrics for experiment variants", () => {
    const list = campaignExperimentation.listExperiments(TEST_TENANT, "running");
    if (list.length === 0) return;
    const exp = list[0];
    for (const v of exp.variants) {
      for (let d = 1; d <= 5; d++) {
        campaignExperimentation.recordMetrics(exp.id, TEST_TENANT, v.id, `2026-07-${String(d).padStart(2, "0")}`, {
          impressions: 10000 + d * 1000,
          clicks: 500 + d * 50,
          conversions: 25 + d * 3,
          spend: 1000 + d * 100,
          revenue: 3000 + d * 500,
        });
      }
    }
    const updated = campaignExperimentation.getExperiment(exp.id, TEST_TENANT);
    expect(updated).not.toBeNull();
    for (const v of updated!.variants) {
      expect(v.metrics.length).toBe(5);
    }
  });

  it("completes an experiment with computed results", () => {
    const list = campaignExperimentation.listExperiments(TEST_TENANT, "running");
    if (list.length === 0) return;
    const completed = campaignExperimentation.completeExperiment(list[0].id, TEST_TENANT);
    expect(completed).not.toBeNull();
    expect(completed!.status).toBe("completed");
    expect(completed!.results).not.toBeNull();
    expect(completed!.results!.significant).toBeDefined();
    expect(completed!.results!.pValue).toBeGreaterThanOrEqual(0);
    expect(completed!.results!.pValue).toBeLessThanOrEqual(1);
    expect(completed!.results!.lift).toBeDefined();
    expect(completed!.results!.recommendedAction).toBeTruthy();
  });
});

describe("CampaignExperimentation - Summary", () => {
  it("returns experiment summary with stats", () => {
    const summary = campaignExperimentation.getExperimentSummary(TEST_TENANT);
    expect(summary.total).toBeGreaterThanOrEqual(0);
    expect(summary.byType).toBeDefined();
    expect(summary.byStatus).toBeDefined();
    expect(summary.recentExperiments).toBeDefined();
  });
});

describe("CampaignExperimentation - Edge Cases", () => {
  it("returns null for non-existent experiment", () => {
    const r = campaignExperimentation.getExperiment("nonexistent", TEST_TENANT);
    expect(r).toBeNull();
  });

  it("returns false deleting non-existent experiment", () => {
    const r = campaignExperimentation.deleteExperiment("nonexistent", TEST_TENANT);
    expect(r).toBe(false);
  });

  it("cannot start a running experiment", () => {
    const list = campaignExperimentation.listExperiments(TEST_TENANT, "running");
    if (list.length > 0) {
      const started = campaignExperimentation.startExperiment(list[0].id, TEST_TENANT);
      expect(started).toBeNull();
    }
  });

  it("handles tenant isolation", () => {
    const list = campaignExperimentation.listExperiments("other_tenant");
    expect(list.length).toBe(0);
  });
});