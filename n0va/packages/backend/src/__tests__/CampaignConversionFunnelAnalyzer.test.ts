import { describe, it, expect } from "vitest";
import { campaignConversionFunnelAnalyzer } from "../services/CampaignConversionFunnelAnalyzerService";

describe("CampaignConversionFunnelAnalyzerService", () => {
  const tenantId = "test-tenant-funnel";
  const campaignId = "test-campaign-001";

  it("analyzes conversion funnel", () => {
    const funnel = campaignConversionFunnelAnalyzer.analyzeFunnel(campaignId, tenantId);
    expect(funnel.tenantId).toBe(tenantId);
    expect(funnel.campaignId).toBe(campaignId);
    expect(funnel.stages.length).toBe(7);
    expect(funnel.totalUsers).toBeGreaterThan(0);
    expect(funnel.totalConversions).toBeGreaterThan(0);
    expect(funnel.overallConversionRate).toBeGreaterThan(0);
    expect(funnel.averageTimeToConvert).toBeGreaterThan(0);
    funnel.stages.forEach(s => {
      expect(s.name).toBeTruthy();
      expect(s.users).toBeGreaterThanOrEqual(0);
      expect(s.conversionRate).toBeGreaterThanOrEqual(0);
    });
  });

  it("identifies bottlenecks", () => {
    const funnel = campaignConversionFunnelAnalyzer.analyzeFunnel(campaignId, tenantId);
    expect(funnel.bottlenecks.length).toBeGreaterThan(0);
    funnel.bottlenecks.forEach(b => {
      expect(b.stage).toBeTruthy();
      expect(b.dropOffRate).toBeGreaterThan(0);
      expect(["critical", "high", "medium", "low"]).toContain(b.severity);
      expect(b.suggestion).toBeTruthy();
    });
  });

  it("analyzes funnel drop-offs", () => {
    const dropOffs = campaignConversionFunnelAnalyzer.analyzeFunnelDropOffs(campaignId, tenantId);
    expect(dropOffs.length).toBe(6);
    dropOffs.forEach(d => {
      expect(d.stage).toBeTruthy();
      expect(d.usersEntering).toBeGreaterThan(0);
      expect(d.dropOffRate).toBeGreaterThan(0);
      expect(d.revenueImpact).toBeGreaterThan(0);
      expect(d.recommendation).toBeTruthy();
    });
  });

  it("generates funnel optimizations", () => {
    const opts = campaignConversionFunnelAnalyzer.generateFunnelOptimizations(campaignId, tenantId);
    expect(opts.length).toBeGreaterThan(0);
    opts.forEach(o => {
      expect(o.funnelStage).toBeTruthy();
      expect(o.currentRate).toBeGreaterThan(0);
      expect(o.targetRate).toBeGreaterThan(o.currentRate);
      expect(o.impact).toBeTruthy();
      expect(o.actions.length).toBeGreaterThan(0);
      expect(["easy", "medium", "hard"]).toContain(o.difficulty);
    });
  });

  it("compares funnels across campaigns", () => {
    const comp = campaignConversionFunnelAnalyzer.compareFunnels(["camp-a", "camp-b", "camp-c"], tenantId);
    expect(comp.campaigns.length).toBe(3);
    expect(comp.topPerformer).toBeTruthy();
    expect(comp.averageConversionRate).toBeGreaterThan(0);
    expect(comp.conversionRateRange.min).toBeGreaterThanOrEqual(0);
    expect(comp.conversionRateRange.max).toBeGreaterThan(0);
    comp.campaigns.forEach(c => {
      expect(c.campaignId).toBeTruthy();
      expect(c.overallConversionRate).toBeGreaterThan(0);
      expect(c.bestStage).toBeTruthy();
      expect(c.worstStage).toBeTruthy();
    });
  });

  it("analyzes funnel segments", () => {
    const segs = campaignConversionFunnelAnalyzer.analyzeFunnelSegments(campaignId, tenantId);
    expect(segs.length).toBe(6);
    segs.forEach(s => {
      expect(s.segmentName).toBeTruthy();
      expect(s.users).toBeGreaterThan(0);
      expect(s.conversionRate).toBeGreaterThanOrEqual(0);
      expect(s.topDropOff).toBeTruthy();
      expect(s.recommendation).toBeTruthy();
    });
  });

  it("analyzes funnel trends", () => {
    const trends = campaignConversionFunnelAnalyzer.analyzeFunnelTrends(campaignId, tenantId);
    expect(trends.length).toBe(8);
    trends.forEach(t => {
      expect(t.date).toBeTruthy();
      expect(t.users).toBeGreaterThan(0);
      expect(t.conversionRate).toBeGreaterThan(0);
      expect(t.averageStages).toBeGreaterThan(0);
    });
  });

  it("produces consistent funnel for same campaign+tenant", () => {
    const f1 = campaignConversionFunnelAnalyzer.analyzeFunnel(campaignId, tenantId);
    const f2 = campaignConversionFunnelAnalyzer.analyzeFunnel(campaignId, tenantId);
    expect(f1.stages.length).toBe(f2.stages.length);
    expect(f1.totalUsers).toBe(f2.totalUsers);
    expect(f1.overallConversionRate).toBe(f2.overallConversionRate);
  });

  it("bottleneck suggestions are actionable", () => {
    const funnel = campaignConversionFunnelAnalyzer.analyzeFunnel(campaignId, tenantId);
    funnel.bottlenecks.filter(b => b.severity === "critical" || b.severity === "high").forEach(b => {
      expect(b.suggestion.length).toBeGreaterThan(20);
      expect(b.suggestion).toContain(b.stage);
    });
  });
});
