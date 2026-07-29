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

  // ── Deep funnel methods ────────────────────────────────────────────

  it("analyzes funnel velocity", () => {
    const v = campaignConversionFunnelAnalyzer.funnelVelocityAnalysis(campaignId, tenantId);
    expect(v.campaignId).toBe(campaignId);
    expect(v.campaignName).toBeTruthy();
    expect(v.overallThroughput).toBeGreaterThan(0);
    expect(v.slowestStage).toBeTruthy();
    expect(v.fastestStage).toBeTruthy();
    expect(v.stages.length).toBeGreaterThanOrEqual(7);
    v.stages.forEach(s => {
      expect(s.name).toBeTruthy();
      expect(s.avgTimeHours).toBeGreaterThan(0);
      expect(s.velocity).toBeGreaterThanOrEqual(0);
      expect(s.acceleration).toBeDefined();
      expect(s.throughput).toBeGreaterThan(0);
    });
  });

  it("predicts funnel leakage", () => {
    const lp = campaignConversionFunnelAnalyzer.funnelLeakagePrediction(campaignId, tenantId);
    expect(lp.campaignId).toBe(campaignId);
    expect(lp.campaignName).toBeTruthy();
    expect(lp.predictions.length).toBeGreaterThan(0);
    lp.predictions.forEach(p => {
      expect(p.stage).toBeTruthy();
      expect(p.leakRate).toBeGreaterThanOrEqual(0);
      expect(["high", "medium", "low"]).toContain(p.confidence);
      expect(p.impact).toBeTruthy();
    });
    expect(lp.totalPredictedLeak).toBeGreaterThan(0);
    expect(lp.highestLeakStage).toBeTruthy();
  });

  it("performs funnel attribution", () => {
    const attr = campaignConversionFunnelAnalyzer.funnelAttribution(campaignId, tenantId);
    expect(attr.campaignId).toBe(campaignId);
    expect(attr.campaignName).toBeTruthy();
    expect(attr.channels.length).toBeGreaterThanOrEqual(6);
    expect(attr.totalConversions).toBeGreaterThan(0);
    expect(attr.topChannel).toBeTruthy();
    attr.channels.forEach(c => {
      expect(c.name).toBeTruthy();
      expect(c.assistedConversions).toBeGreaterThanOrEqual(0);
      expect(c.creditedConversions).toBeGreaterThanOrEqual(0);
      expect(c.assistRate).toBeGreaterThanOrEqual(0);
      expect(c.role).toBeTruthy();
    });
  });

  it("simulates funnel scenarios", () => {
    const sim = campaignConversionFunnelAnalyzer.funnelScenarioSimulation(campaignId, tenantId, "Awareness", 0.15);
    expect(sim.campaignId).toBe(campaignId);
    expect(sim.campaignName).toBeTruthy();
    expect(sim.currentConversionRate).toBeGreaterThan(0);
    expect(sim.simulatedConversionRate).toBeGreaterThan(0);
    expect(sim.improvement).toBeGreaterThan(0);
    expect(sim.additionalConversions).toBeGreaterThan(0);
    expect(sim.projectedRevenueLift).toBeGreaterThan(0);
    expect(sim.stages.length).toBeGreaterThan(0);
    sim.stages.forEach(s => {
      expect(s.name).toBeTruthy();
      expect(s.currentUsers).toBeGreaterThan(0);
      expect(s.simulatedUsers).toBeGreaterThanOrEqual(s.currentUsers);
    });
  });

  it("breaks down funnel by channel", () => {
    const cb = campaignConversionFunnelAnalyzer.funnelChannelBreakdown(campaignId, tenantId);
    expect(cb.campaignId).toBe(campaignId);
    expect(cb.campaignName).toBeTruthy();
    expect(cb.channels.length).toBeGreaterThanOrEqual(6);
    expect(cb.topChannelPerStage.length).toBeGreaterThan(0);
    cb.topChannelPerStage.forEach(ts => {
      expect(ts.stage).toBeTruthy();
      expect(ts.topChannel).toBeTruthy();
    });
    cb.channels.forEach(c => {
      expect(c.name).toBeTruthy();
      expect(c.stages.length).toBeGreaterThan(0);
      expect(c.totalConversions).toBeGreaterThanOrEqual(0);
      expect(c.bestStage).toBeTruthy();
      c.stages.forEach(s => {
        expect(s.stage).toBeTruthy();
        expect(s.users).toBeGreaterThan(0);
        expect(s.conversionRate).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it("computes funnel health score", () => {
    const hs = campaignConversionFunnelAnalyzer.funnelHealthScore(campaignId, tenantId);
    expect(hs.campaignId).toBe(campaignId);
    expect(hs.campaignName).toBeTruthy();
    expect(hs.score).toBeGreaterThanOrEqual(0);
    expect(hs.score).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D", "F"]).toContain(hs.grade);
    expect(hs.dimensions.length).toBeGreaterThan(0);
    expect(hs.bottlenecks.length).toBeGreaterThanOrEqual(0);
    expect(hs.recommendations.length).toBeGreaterThan(0);
    hs.dimensions.forEach(d => {
      expect(d.name).toBeTruthy();
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
      expect(["good", "fair", "poor"]).toContain(d.status);
      expect(d.weight).toBeGreaterThan(0);
    });
  });

  it("funnel velocity is deterministic", () => {
    const v1 = campaignConversionFunnelAnalyzer.funnelVelocityAnalysis(campaignId, tenantId);
    const v2 = campaignConversionFunnelAnalyzer.funnelVelocityAnalysis(campaignId, tenantId);
    expect(v1.slowestStage).toBe(v2.slowestStage);
    expect(v1.fastestStage).toBe(v2.fastestStage);
    expect(v1.overallThroughput).toBe(v2.overallThroughput);
  });

  it("funnel health score is deterministic", () => {
    const h1 = campaignConversionFunnelAnalyzer.funnelHealthScore(campaignId, tenantId);
    const h2 = campaignConversionFunnelAnalyzer.funnelHealthScore(campaignId, tenantId);
    expect(h1.score).toBe(h2.score);
    expect(h1.grade).toBe(h2.grade);
  });
});
