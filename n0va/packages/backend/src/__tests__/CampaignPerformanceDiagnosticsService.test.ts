import { describe, it, expect } from "vitest";
import { CampaignPerformanceDiagnosticsService } from "../services/CampaignPerformanceDiagnosticsService";

const service = new CampaignPerformanceDiagnosticsService();

describe("CampaignPerformanceDiagnostics - diagnosticTrendAnalysis", () => {
  it("returns trend data for diagnosed metrics", () => {
    const r = service.diagnosticTrendAnalysis("test-camp-1", "test-tenant");
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
    for (const t of r) {
      expect(t).toHaveProperty("campaignId");
      expect(t).toHaveProperty("metric");
      expect(Array.isArray(t.periods)).toBe(true);
      expect(t.periods.length).toBeGreaterThan(0);
      for (const p of t.periods) {
        expect(p).toHaveProperty("period");
        expect(p).toHaveProperty("value");
        expect(p).toHaveProperty("benchmark");
        expect(p).toHaveProperty("status");
      }
      expect(["improving", "declining", "fluctuating", "stable"]).toContain(t.direction);
      expect(typeof t.volatility).toBe("number");
      expect(typeof t.recommendation).toBe("string");
    }
  });
});

describe("CampaignPerformanceDiagnostics - campaignComparisonDiagnostics", () => {
  it("returns comparison between two campaigns", () => {
    const r = service.campaignComparisonDiagnostics("test-camp-1", "test-camp-2");
    expect(r.campaignIdA).toBe("test-camp-1");
    expect(r.campaignIdB).toBe("test-camp-2");
    expect(typeof r.aScore).toBe("number");
    expect(typeof r.bScore).toBe("number");
    expect(Array.isArray(r.differences)).toBe(true);
    expect(Array.isArray(r.sharedIssues)).toBe(true);
    expect(Array.isArray(r.uniqueToA)).toBe(true);
    expect(Array.isArray(r.uniqueToB)).toBe(true);
  });
});

describe("CampaignPerformanceDiagnostics - severityBreakdown", () => {
  it("returns severity distribution", () => {
    const r = service.severityBreakdown("test-camp-1", "test-tenant");
    expect(r.campaignId).toBe("test-camp-1");
    expect(typeof r.total).toBe("number");
    expect(typeof r.critical).toBe("number");
    expect(typeof r.high).toBe("number");
    expect(typeof r.medium).toBe("number");
    expect(typeof r.low).toBe("number");
    expect(r.severityPercent).toHaveProperty("critical");
    expect(["immediate", "high", "normal", "low"]).toContain(r.priority);
  });
});

describe("CampaignPerformanceDiagnostics - getFixRecommendation", () => {
  it("returns fix recommendation for a finding", () => {
    const r = service.getFixRecommendation("diag_42");
    expect(r).not.toBeNull();
    expect(r!.findingId).toBe("diag_42");
    expect(typeof r!.targetMetric).toBe("string");
    expect(typeof r!.currentValue).toBe("number");
    expect(typeof r!.targetValue).toBe("number");
    expect(Array.isArray(r!.steps)).toBe(true);
    expect(r!.steps.length).toBeGreaterThan(0);
    for (const s of r!.steps) {
      expect(s).toHaveProperty("description");
      expect(s).toHaveProperty("effort");
      expect(s).toHaveProperty("expectedImprovement");
    }
    expect(r!.estimatedCost).toBeTruthy();
    expect(r!.timeline).toBeTruthy();
    expect(r!.riskLevel).toBeTruthy();
  });
});

describe("CampaignPerformanceDiagnostics - getDiagnosticTimeline", () => {
  it("returns chronological diagnostic history", () => {
    const r = service.getDiagnosticTimeline("test-camp-1", "test-tenant");
    expect(r.campaignId).toBe("test-camp-1");
    expect(Array.isArray(r.entries)).toBe(true);
    expect(r.entries.length).toBeGreaterThan(0);
    for (const e of r.entries) {
      expect(e).toHaveProperty("date");
      expect(e).toHaveProperty("score");
      expect(e).toHaveProperty("grade");
      expect(e).toHaveProperty("findingCount");
    }
    expect(["improving", "declining", "stable"]).toContain(r.trend);
    expect(typeof r.averageScore).toBe("number");
    expect(typeof r.minScore).toBe("number");
    expect(typeof r.maxScore).toBe("number");
  });
});

describe("CampaignPerformanceDiagnostics - exportDiagnostics", () => {
  it("returns export-ready diagnostic summary", () => {
    const r = service.exportDiagnostics("test-camp-1", "test-tenant");
    expect(r.campaignId).toBe("test-camp-1");
    expect(typeof r.executiveSummary).toBe("string");
    expect(Array.isArray(r.allFindings)).toBe(true);
    for (const f of r.allFindings) {
      expect(f).toHaveProperty("metric");
      expect(f).toHaveProperty("severity");
      expect(f).toHaveProperty("recommendation");
    }
    expect(Array.isArray(r.metricScores)).toBe(true);
    expect(Array.isArray(r.recommendations)).toBe(true);
    expect(typeof r.nextReviewDate).toBe("string");
  });
});
