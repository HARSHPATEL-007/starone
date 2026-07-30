import { describe, it, expect } from "vitest";
import { campaignLandingPageAnalyzer } from "../services/CampaignLandingPageAnalyzerService";

describe("CampaignLandingPageAnalyzerService", () => {
  const tenantId = "test-tenant-lp";
  const campaignId = "test-campaign-lp";

  it("analyzes landing pages", () => {
    const analysis = campaignLandingPageAnalyzer.analyzeLandingPages(campaignId, tenantId);
    expect(analysis.tenantId).toBe(tenantId);
    expect(analysis.campaignId).toBe(campaignId);
    expect(analysis.pages.length).toBeGreaterThanOrEqual(4);
    expect(analysis.totalVisitors).toBeGreaterThan(0);
    expect(analysis.totalConversions).toBeGreaterThan(0);
    expect(analysis.averageConversionRate).toBeGreaterThan(0);
    expect(analysis.averageScore).toBeGreaterThan(0);
    expect(analysis.topPages.length).toBe(2);
    analysis.pages.forEach(p => {
      expect(p.name).toBeTruthy();
      expect(p.url).toBeTruthy();
      expect(p.visitors).toBeGreaterThan(0);
      expect(p.conversionRate).toBeGreaterThan(0);
    });
  });

  it("analyzes speed impact", () => {
    const impacts = campaignLandingPageAnalyzer.analyzeSpeedImpact(campaignId, tenantId);
    expect(impacts.length).toBeGreaterThan(0);
    impacts.forEach(i => {
      expect(i.pageName).toBeTruthy();
      expect(i.currentSpeed).toBeGreaterThan(0);
      expect(i.targetSpeed).toBeGreaterThan(0);
      expect(i.estimatedConversionLift).toBeGreaterThan(0);
      expect(i.recommendation).toBeTruthy();
    });
  });

  it("analyzes content gaps", () => {
    const gaps = campaignLandingPageAnalyzer.analyzeContentGaps(campaignId, tenantId);
    expect(gaps.length).toBe(8);
    gaps.forEach(g => {
      expect(g.element).toBeTruthy();
      expect(g.currentState).toBeTruthy();
      expect(g.bestPractice).toBeTruthy();
      expect(g.impact).toBeTruthy();
      expect(["high", "medium", "low"]).toContain(g.priority);
    });
  });

  it("analyzes page segmentation", () => {
    const segs = campaignLandingPageAnalyzer.analyzePageSegmentation(campaignId, tenantId);
    expect(segs.length).toBe(6);
    segs.forEach(s => {
      expect(s.segmentName).toBeTruthy();
      expect(s.visitors).toBeGreaterThan(0);
      expect(s.conversionRate).toBeGreaterThanOrEqual(0);
      expect(s.bounceRate).toBeGreaterThanOrEqual(0);
    });
  });

  it("generates layout recommendations", () => {
    const recs = campaignLandingPageAnalyzer.generateLayoutRecommendations(campaignId, tenantId);
    expect(recs.length).toBe(6);
    recs.forEach(r => {
      expect(r.section).toBeTruthy();
      expect(r.currentLayout).toBeTruthy();
      expect(r.suggestedLayout).toBeTruthy();
      expect(r.expectedLift).toBeTruthy();
    });
  });

  it("analyzes landing page trends", () => {
    const trends = campaignLandingPageAnalyzer.analyzeLandingPageTrends(campaignId, tenantId);
    expect(trends.length).toBe(8);
    trends.forEach(t => {
      expect(t.date).toBeTruthy();
      expect(t.visitors).toBeGreaterThan(0);
      expect(t.conversionRate).toBeGreaterThan(0);
      expect(t.avgLoadSpeed).toBeGreaterThan(0);
      expect(t.avgScore).toBeGreaterThan(0);
    });
  });

  it("produces consistent results for same campaign+tenant", () => {
    const a1 = campaignLandingPageAnalyzer.analyzeLandingPages(campaignId, tenantId);
    const a2 = campaignLandingPageAnalyzer.analyzeLandingPages(campaignId, tenantId);
    expect(a1.pages.length).toBe(a2.pages.length);
    expect(a1.totalVisitors).toBe(a2.totalVisitors);
    expect(a1.averageScore).toBe(a2.averageScore);
  });

  it("identifies critical issues", () => {
    const analysis = campaignLandingPageAnalyzer.analyzeLandingPages(campaignId, tenantId);
    expect(analysis.criticalIssues.length).toBeGreaterThan(0);
    analysis.criticalIssues.forEach(ci => {
      expect(ci.page).toBeTruthy();
      expect(ci.issue).toBeTruthy();
      expect(ci.priority).toBeTruthy();
    });
  });

  it("returns A/B test analysis with variants", () => {
    const ab = campaignLandingPageAnalyzer.landingPageABTestAnalysis(campaignId, tenantId);
    expect(ab.campaignId).toBe(campaignId);
    expect(Array.isArray(ab.variants)).toBe(true);
    expect(ab.variants.length).toBeGreaterThan(0);
    for (const v of ab.variants) {
      expect(v).toHaveProperty("variantName");
      expect(v).toHaveProperty("conversionRate");
      expect(v).toHaveProperty("improvement");
      expect(v).toHaveProperty("confidence");
    }
    expect(ab.winningVariant).toBeTruthy();
    expect(ab.recommendation).toBeTruthy();
  });

  it("returns form field analysis with recommendations", () => {
    const form = campaignLandingPageAnalyzer.landingPageFormAnalysis(campaignId, tenantId);
    expect(form.campaignId).toBe(campaignId);
    expect(Array.isArray(form.fields)).toBe(true);
    expect(form.fields.length).toBeGreaterThan(0);
    expect(form.overallCompletionRate).toBeGreaterThan(0);
    for (const f of form.fields) {
      expect(f).toHaveProperty("fieldName");
      expect(f).toHaveProperty("completionRate");
      expect(f).toHaveProperty("abandonmentRate");
      expect(f).toHaveProperty("priority");
    }
    expect(Array.isArray(form.recommendations)).toBe(true);
  });

  it("returns heatmap prediction zones", () => {
    const heat = campaignLandingPageAnalyzer.landingPageHeatmapPrediction(campaignId, tenantId);
    expect(Array.isArray(heat)).toBe(true);
    expect(heat.length).toBe(8);
    for (const h of heat) {
      expect(h).toHaveProperty("zone");
      expect(h).toHaveProperty("predictedAttention");
      expect(h).toHaveProperty("expectedCTR");
      expect(h).toHaveProperty("recommendation");
    }
  });

  it("returns accessibility audit with score and issues", () => {
    const a11y = campaignLandingPageAnalyzer.landingPageAccessibilityAudit(campaignId, tenantId);
    expect(a11y.campaignId).toBe(campaignId);
    expect(a11y.score).toBeGreaterThanOrEqual(0);
    expect(a11y.grade).toBeTruthy();
    expect(Array.isArray(a11y.issues)).toBe(true);
    expect(a11y.issues.length).toBeGreaterThan(0);
    for (const i of a11y.issues) {
      expect(i).toHaveProperty("issue");
      expect(i).toHaveProperty("wcagCriterion");
      expect(i).toHaveProperty("severity");
      expect(i).toHaveProperty("fix");
    }
    expect(Array.isArray(a11y.topFixes)).toBe(true);
  });

  it("returns conversion path analysis with drop-off points", () => {
    const cp = campaignLandingPageAnalyzer.landingPageConversionPathAnalysis(campaignId, tenantId);
    expect(cp.campaignId).toBe(campaignId);
    expect(Array.isArray(cp.path)).toBe(true);
    expect(cp.path.length).toBeGreaterThan(0);
    expect(cp.overallConversionRate).toBeGreaterThanOrEqual(0);
    for (const s of cp.path) {
      expect(s).toHaveProperty("step");
      expect(s).toHaveProperty("entrants");
      expect(s).toHaveProperty("dropOffRate");
    }
    expect(cp.biggestDropOff).toHaveProperty("step");
    expect(cp.biggestDropOff).toHaveProperty("recommendation");
  });

  it("returns competitive benchmark with industry comparison", () => {
    const bench = campaignLandingPageAnalyzer.landingPageCompetitiveBenchmark(campaignId, tenantId);
    expect(bench.campaignId).toBe(campaignId);
    expect(Array.isArray(bench.benchmarks)).toBe(true);
    expect(bench.benchmarks.length).toBeGreaterThan(0);
    for (const b of bench.benchmarks) {
      expect(b).toHaveProperty("metric");
      expect(b).toHaveProperty("pageValue");
      expect(b).toHaveProperty("industryAverage");
      expect(b).toHaveProperty("percentile");
      expect(["above", "at", "below"]).toContain(b.status);
    }
    expect(bench.overallScore).toBeGreaterThan(0);
    expect(bench.overallGrade).toBeTruthy();
  });
});
