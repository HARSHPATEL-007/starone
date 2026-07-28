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
});
