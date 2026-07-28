import { describe, it, expect } from "vitest";
import { campaignCreativeOptimizer } from "../services/CampaignCreativeOptimizerService";

describe("CampaignCreativeOptimizerService", () => {
  const tenantId = "test-tenant-creative";
  const campaignId = "test-campaign-creative";

  it("analyzes creative performance", () => {
    const analysis = campaignCreativeOptimizer.analyzeCreativePerformance(campaignId, tenantId);
    expect(analysis.tenantId).toBe(tenantId);
    expect(analysis.campaignId).toBe(campaignId);
    expect(analysis.assets.length).toBeGreaterThanOrEqual(8);
    expect(analysis.totalImpressions).toBeGreaterThan(0);
    expect(analysis.totalClicks).toBeGreaterThan(0);
    expect(analysis.averageCTR).toBeGreaterThan(0);
    expect(analysis.topPerformers.length).toBe(3);
    analysis.assets.forEach(a => {
      expect(a.name).toBeTruthy();
      expect(a.type).toBeTruthy();
      expect(a.impressions).toBeGreaterThan(0);
      expect(a.roas).toBeGreaterThanOrEqual(0);
    });
  });

  it("analyzes creative fatigue", () => {
    const fatigue = campaignCreativeOptimizer.analyzeCreativeFatigue(campaignId, tenantId);
    expect(fatigue.length).toBeGreaterThan(0);
    fatigue.forEach(f => {
      expect(f.assetId).toBeTruthy();
      expect(f.ageDays).toBeGreaterThan(0);
      expect(f.currentCTR).toBeGreaterThanOrEqual(0);
      expect(f.initialCTR).toBeGreaterThanOrEqual(f.currentCTR);
      expect(["none", "mild", "moderate", "severe"]).toContain(f.fatigueLevel);
      expect(f.recommendation).toBeTruthy();
      expect(f.suggestedRefreshDate).toBeTruthy();
    });
  });

  it("generates creative recommendations", () => {
    const recs = campaignCreativeOptimizer.generateCreativeRecommendations(campaignId, tenantId);
    expect(recs.length).toBeGreaterThan(0);
    recs.forEach(r => {
      expect(r.creativeType).toBeTruthy();
      expect(r.currentApproach).toBeTruthy();
      expect(r.recommendation).toBeTruthy();
      expect(r.expectedLift).toBeTruthy();
      expect(["easy", "medium", "hard"]).toContain(r.difficulty);
    });
  });

  it("analyzes creative AB tests", () => {
    const tests = campaignCreativeOptimizer.analyzeCreativeABTests(campaignId, tenantId);
    expect(tests.length).toBeGreaterThan(0);
    tests.forEach(t => {
      expect(t.testName).toBeTruthy();
      expect(t.control.asset).toBeTruthy();
      expect(t.variant.asset).toBeTruthy();
      expect(t.winner).toBeTruthy();
      expect(t.action).toBeTruthy();
      expect(["significant", "promising", "inconclusive"]).toContain(t.significance);
    });
  });

  it("analyzes creative mix", () => {
    const mix = campaignCreativeOptimizer.analyzeCreativeMix(campaignId, tenantId);
    expect(mix.mix.length).toBeGreaterThan(1);
    mix.mix.forEach(m => {
      expect(m.type).toBeTruthy();
      expect(m.count).toBeGreaterThan(0);
      expect(m.share).toBeGreaterThan(0);
    });
  });

  it("analyzes creative trends", () => {
    const trends = campaignCreativeOptimizer.analyzeCreativeTrends(campaignId, tenantId);
    expect(trends.length).toBe(8);
    trends.forEach(t => {
      expect(t.date).toBeTruthy();
      expect(t.impressions).toBeGreaterThan(0);
      expect(t.activeCreatives).toBeGreaterThan(0);
      expect(t.averageCTR).toBeGreaterThan(0);
    });
  });

  it("produces consistent results for same campaign+tenant", () => {
    const a1 = campaignCreativeOptimizer.analyzeCreativePerformance(campaignId, tenantId);
    const a2 = campaignCreativeOptimizer.analyzeCreativePerformance(campaignId, tenantId);
    expect(a1.assets.length).toBe(a2.assets.length);
    expect(a1.totalImpressions).toBe(a2.totalImpressions);
    expect(a1.averageROAS).toBe(a2.averageROAS);
  });
});
