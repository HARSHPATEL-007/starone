import { describe, it, expect, beforeAll } from "vitest";
import { campaignPerformanceDiagnostics } from "../services/CampaignPerformanceDiagnosticsService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_cpd_tenant";
const TEST_CAMPAIGN = "test_cpd_camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "CPD Test Campaign", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 1000, lifetime: 30000, spent: 15000, remaining: 15000, currency: "USD" },
    metrics: { impressions: 80000, clicks: 1600, conversions: 48, revenue: 12000, spend: 15000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
  DataStore.mem().insert("campaigns", {
    _id: "test_cpd_camp2", name: "CPD Test Campaign 2", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 8000, remaining: 7000, currency: "USD" },
    metrics: { impressions: 60000, clicks: 2400, conversions: 120, revenue: 24000, spend: 8000 },
    startDate: "2025-02-01", endDate: "2025-11-30",
  });
});

describe("CampaignPerformanceDiagnostics - diagnoseCampaign", () => {
  it("returns diagnostic report with findings for a campaign", () => {
    const report = campaignPerformanceDiagnostics.diagnoseCampaign(TEST_CAMPAIGN, TEST_TENANT);
    expect(report).toHaveProperty("campaignId", TEST_CAMPAIGN);
    expect(report).toHaveProperty("campaignName");
    expect(report).toHaveProperty("generatedAt");
    expect(report).toHaveProperty("score");
    expect(report).toHaveProperty("grade");
    expect(Array.isArray(report.findings)).toBe(true);
    expect(report).toHaveProperty("metricHealth");
    expect(report).toHaveProperty("interactions");
    if (report.findings.length > 0) {
      const f = report.findings[0];
      expect(f).toHaveProperty("id");
      expect(f).toHaveProperty("metric");
      expect(f).toHaveProperty("severity");
      expect(f).toHaveProperty("rootCause");
      expect(f).toHaveProperty("confidence");
      expect(f).toHaveProperty("recommendation");
      expect(f).toHaveProperty("evidence");
    }
  });

  it("returns empty report for unknown campaign", () => {
    const report = campaignPerformanceDiagnostics.diagnoseCampaign("nonexistent", TEST_TENANT);
    expect(report.findings).toEqual([]);
    expect(report.score).toBe(100);
    expect(report.grade).toBe("healthy");
  });
});

describe("CampaignPerformanceDiagnostics - rootCauseSummary", () => {
  it("returns aggregated root cause summary", () => {
    const summary = campaignPerformanceDiagnostics.rootCauseSummary(TEST_TENANT);
    expect(summary).toHaveProperty("generatedAt");
    expect(Array.isArray(summary.allFindings)).toBe(true);
    expect(summary).toHaveProperty("byCategory");
    expect(summary).toHaveProperty("bySeverity");
    expect(Array.isArray(summary.topRootCauses)).toBe(true);
    expect(summary).toHaveProperty("openCount");
  });
});

describe("CampaignPerformanceDiagnostics - crossCampaignDiagnostics", () => {
  it("returns systemic patterns affecting multiple campaigns", () => {
    const patterns = campaignPerformanceDiagnostics.crossCampaignDiagnostics(TEST_TENANT);
    expect(Array.isArray(patterns)).toBe(true);
    for (const p of patterns) {
      expect(p).toHaveProperty("pattern");
      expect(p).toHaveProperty("affectedCampaigns");
      expect(p).toHaveProperty("frequency");
      expect(p).toHaveProperty("systemicSeverity");
      expect(p).toHaveProperty("recommendation");
    }
  });
});

describe("CampaignPerformanceDiagnostics - metricHealthTrends", () => {
  it("returns metric health snapshots across campaigns", () => {
    const trends = campaignPerformanceDiagnostics.metricHealthTrends(TEST_TENANT);
    expect(Array.isArray(trends)).toBe(true);
    expect(trends.length).toBeGreaterThan(0);
    for (const t of trends) {
      expect(t).toHaveProperty("metric");
      expect(t).toHaveProperty("overallScore");
      expect(t).toHaveProperty("campaignCount");
      expect(t).toHaveProperty("atRisk");
      expect(t).toHaveProperty("trend");
    }
  });
});

describe("CampaignPerformanceDiagnostics - generateRecoveryPlan", () => {
  it("returns recovery plan for campaign with findings", () => {
    const plan = campaignPerformanceDiagnostics.generateRecoveryPlan(TEST_CAMPAIGN, TEST_TENANT);
    if (plan) {
      expect(plan).toHaveProperty("campaignId", TEST_CAMPAIGN);
      expect(Array.isArray(plan.steps)).toBe(true);
      expect(plan).toHaveProperty("totalSteps");
      expect(plan).toHaveProperty("estimatedRecoveryDays");
      expect(plan).toHaveProperty("priority");
      if (plan.steps.length > 0) {
        expect(plan.steps[0]).toHaveProperty("action");
        expect(plan.steps[0]).toHaveProperty("category");
        expect(plan.steps[0]).toHaveProperty("rationale");
        expect(plan.steps[0]).toHaveProperty("expectedImpact");
      }
    }
  });

  it("returns null for campaign with no findings", () => {
    const plan = campaignPerformanceDiagnostics.generateRecoveryPlan("nonexistent", TEST_TENANT);
    expect(plan).toBeNull();
  });
});

describe("CampaignPerformanceDiagnostics - remediateFinding", () => {
  it("returns remediation record with improvement calculation", () => {
    const record = campaignPerformanceDiagnostics.remediateFinding("finding_1", "Optimized targeting", 1.5, 2.8);
    expect(record).toHaveProperty("findingId", "finding_1");
    expect(record).toHaveProperty("action", "Optimized targeting");
    expect(record).toHaveProperty("metricBefore", 1.5);
    expect(record).toHaveProperty("metricAfter", 2.8);
    expect(record.improvement).toBeGreaterThan(0);
    expect(record.effective).toBe(true);
  });

  it("marks as ineffective when metric declines", () => {
    const record = campaignPerformanceDiagnostics.remediateFinding("finding_2", "Test action", 2.0, 1.5);
    expect(record.effective).toBe(false);
    expect(record.improvement).toBeLessThan(0);
  });
});
