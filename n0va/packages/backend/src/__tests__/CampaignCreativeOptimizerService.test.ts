import { describe, it, expect } from "vitest";
import { CampaignCreativeOptimizerService } from "../services/CampaignCreativeOptimizerService";

const service = new CampaignCreativeOptimizerService();
const C = "test-campaign";
const T = "test-tenant";

describe("CampaignCreativeOptimizerService - creativePerformanceForecast", () => {
  it("returns forecast with recommendations", () => {
    const r = service.creativePerformanceForecast(C, T);
    expect(r.campaignId).toBe(C);
    expect(Array.isArray(r.forecasts)).toBe(true);
    expect(r.forecasts.length).toBe(6);
    for (const f of r.forecasts) {
      expect(f).toHaveProperty("date");
      expect(f).toHaveProperty("predictedCTR");
      expect(f).toHaveProperty("predictedCVR");
      expect(f).toHaveProperty("predictedROAS");
      expect(f).toHaveProperty("predictedFatigueRate");
      expect(f.confidence).toBeGreaterThanOrEqual(0);
    }
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});

describe("CampaignCreativeOptimizerService - creativeAudienceAlignment", () => {
  it("returns alignment per segment", () => {
    const r = service.creativeAudienceAlignment(C, T);
    expect(r.campaignId).toBe(C);
    expect(Array.isArray(r.segments)).toBe(true);
    expect(r.segments.length).toBeGreaterThan(0);
    for (const s of r.segments) {
      expect(s).toHaveProperty("segmentName");
      expect(s).toHaveProperty("audienceSize");
      expect(s).toHaveProperty("creativeFit");
      expect(s).toHaveProperty("ctr");
      expect(s).toHaveProperty("cvr");
      expect(s).toHaveProperty("relevanceScore");
      expect(s).toHaveProperty("alignmentGap");
      expect(typeof s.recommendation).toBe("string");
    }
    expect(r.overallAlignment).toBeGreaterThanOrEqual(0);
  });
});

describe("CampaignCreativeOptimizerService - creativeCompetitiveAnalysis", () => {
  it("returns competitor comparison with gaps", () => {
    const r = service.creativeCompetitiveAnalysis(C, T);
    expect(Array.isArray(r.competitors)).toBe(true);
    expect(r.competitors.length).toBeGreaterThanOrEqual(3);
    for (const c of r.competitors) {
      expect(c).toHaveProperty("competitorId");
      expect(c).toHaveProperty("headlineStyle");
      expect(c).toHaveProperty("ctaStyle");
      expect(c).toHaveProperty("avgCTR");
    }
    expect(Array.isArray(r.gaps)).toBe(true);
    expect(r.gaps.length).toBeGreaterThan(0);
    for (const g of r.gaps) {
      expect(g).toHaveProperty("area");
      expect(g).toHaveProperty("ownScore");
      expect(g).toHaveProperty("gap");
    }
    expect(typeof r.positioningAdvice).toBe("string");
  });
});

describe("CampaignCreativeOptimizerService - creativeLifecycleAnalysis", () => {
  it("returns lifecycle stages for assets", () => {
    const r = service.creativeLifecycleAnalysis(C, T);
    expect(Array.isArray(r.assets)).toBe(true);
    expect(r.assets.length).toBeGreaterThan(0);
    for (const a of r.assets) {
      expect(a).toHaveProperty("assetId");
      expect(a).toHaveProperty("name");
      expect(a).toHaveProperty("stage");
      expect(["new", "growth", "maturity", "decline", "fatigued"]).toContain(a.stage);
      expect(a).toHaveProperty("remainingDays");
    }
    expect(Array.isArray(r.portfolioStageDistribution)).toBe(true);
    const totalPct = r.portfolioStageDistribution.reduce((s, d) => s + d.percentage, 0);
    expect(Math.round(totalPct)).toBe(100);
  });
});

describe("CampaignCreativeOptimizerService - creativeROIAnalysis", () => {
  it("returns ROI metrics per asset", () => {
    const r = service.creativeROIAnalysis(C, T);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
    for (const a of r) {
      expect(a).toHaveProperty("assetId");
      expect(a).toHaveProperty("name");
      expect(a).toHaveProperty("totalRevenue");
      expect(a).toHaveProperty("roas");
      expect(a).toHaveProperty("profitMargin");
      expect(["A", "B", "C", "D", "F"]).toContain(a.efficiencyGrade);
    }
  });
});

describe("CampaignCreativeOptimizerService - creativeOptimizationHistory", () => {
  it("returns optimization change history", () => {
    const r = service.creativeOptimizationHistory(C, T);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
    for (const h of r) {
      expect(h).toHaveProperty("assetId");
      expect(h).toHaveProperty("name");
      expect(Array.isArray(h.changes)).toBe(true);
      expect(h.changes.length).toBeGreaterThan(0);
      for (const c of h.changes) {
        expect(c).toHaveProperty("date");
        expect(c).toHaveProperty("action");
        expect(c).toHaveProperty("metric");
        expect(c).toHaveProperty("before");
        expect(c).toHaveProperty("after");
        expect(c).toHaveProperty("improvement");
      }
      expect(h).toHaveProperty("totalImprovement");
      expect(h).toHaveProperty("currentStatus");
    }
  });
});
