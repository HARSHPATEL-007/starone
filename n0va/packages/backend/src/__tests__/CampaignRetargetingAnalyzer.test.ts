import { describe, it, expect } from "vitest";
import { campaignRetargetingAnalyzer } from "../services/CampaignRetargetingAnalyzerService";

describe("CampaignRetargetingAnalyzerService", () => {
  const tenantId = "test-tenant-rt";
  const campaignId = "test-campaign-rt";

  it("analyzes retargeting audiences", () => {
    const analysis = campaignRetargetingAnalyzer.analyzeRetargetingAudiences(campaignId, tenantId);
    expect(analysis.tenantId).toBe(tenantId);
    expect(analysis.campaignId).toBe(campaignId);
    expect(analysis.audiences.length).toBeGreaterThanOrEqual(5);
    expect(analysis.totalAudienceSize).toBeGreaterThan(0);
    expect(analysis.averageConversionRate).toBeGreaterThan(0);
    expect(analysis.averageFrequency).toBeGreaterThan(0);
    expect(analysis.topAudiences.length).toBe(3);
    expect(analysis.recommendations.length).toBeGreaterThan(0);
    analysis.audiences.forEach(a => {
      expect(a.name).toBeTruthy();
      expect(a.size).toBeGreaterThan(0);
      expect(a.conversionRate).toBeGreaterThan(0);
    });
  });

  it("analyzes retargeting funnel", () => {
    const funnel = campaignRetargetingAnalyzer.analyzeRetargetingFunnel(campaignId, tenantId);
    expect(funnel.length).toBe(6);
    funnel.forEach(s => {
      expect(s.stage).toBeTruthy();
      expect(s.users).toBeGreaterThan(0);
      expect(s.description).toBeTruthy();
    });
  });

  it("analyzes retargeting channels", () => {
    const channels = campaignRetargetingAnalyzer.analyzeRetargetingChannels(campaignId, tenantId);
    expect(channels.length).toBe(6);
    channels.forEach(c => {
      expect(c.channel).toBeTruthy();
      expect(c.audienceReached).toBeGreaterThan(0);
      expect(c.roas).toBeGreaterThan(0);
      expect(c.effectiveness).toBeTruthy();
    });
  });

  it("generates retargeting bid recommendations", () => {
    const recs = campaignRetargetingAnalyzer.generateRetargetingBidRecommendations(campaignId, tenantId);
    expect(recs.length).toBeGreaterThan(0);
    recs.forEach(r => {
      expect(r.audience).toBeTruthy();
      expect(r.currentBid).toBeGreaterThan(0);
      expect(r.suggestedBid).toBeGreaterThan(0);
      expect(r.reason).toBeTruthy();
      expect(["high", "medium", "low"]).toContain(r.priority);
    });
  });

  it("analyzes cross-channel retargeting", () => {
    const xch = campaignRetargetingAnalyzer.analyzeCrossChannelRetargeting(campaignId, tenantId);
    expect(xch.length).toBe(5);
    xch.forEach(x => {
      expect(x.channels.length).toBeGreaterThan(0);
      expect(x.audienceOverlap).toBeGreaterThan(0);
      expect(x.uniqueReach).toBeGreaterThan(0);
      expect(x.recommendation).toBeTruthy();
    });
  });

  it("analyzes retargeting trends", () => {
    const trends = campaignRetargetingAnalyzer.analyzeRetargetingTrends(campaignId, tenantId);
    expect(trends.length).toBe(8);
    trends.forEach(t => {
      expect(t.date).toBeTruthy();
      expect(t.audienceSize).toBeGreaterThan(0);
      expect(t.conversionRate).toBeGreaterThan(0);
      expect(t.frequency).toBeGreaterThan(0);
    });
  });

  it("produces consistent results", () => {
    const a1 = campaignRetargetingAnalyzer.analyzeRetargetingAudiences(campaignId, tenantId);
    const a2 = campaignRetargetingAnalyzer.analyzeRetargetingAudiences(campaignId, tenantId);
    expect(a1.audiences.length).toBe(a2.audiences.length);
    expect(a1.totalAudienceSize).toBe(a2.totalAudienceSize);
    expect(a1.averageConversionRate).toBe(a2.averageConversionRate);
  });

  it("returns segment performance breakdown", () => {
    const perf = campaignRetargetingAnalyzer.retargetingSegmentPerformance(campaignId, tenantId);
    expect(Array.isArray(perf)).toBe(true);
    expect(perf.length).toBeGreaterThan(0);
    for (const p of perf) {
      expect(p).toHaveProperty("segment");
      expect(p).toHaveProperty("size");
      expect(p).toHaveProperty("conversionRate");
      expect(p).toHaveProperty("roas");
      expect(["improving", "stable", "declining"]).toContain(p.trend);
    }
  });

  it("returns frequency distribution with fatigue risk", () => {
    const freq = campaignRetargetingAnalyzer.retargetingFrequencyAnalysis(campaignId, tenantId);
    expect(Array.isArray(freq)).toBe(true);
    expect(freq.length).toBe(5);
    for (const f of freq) {
      expect(f).toHaveProperty("frequencyBucket");
      expect(f).toHaveProperty("users");
      expect(f).toHaveProperty("conversionRate");
      expect(f).toHaveProperty("fatigueRisk");
      expect(f).toHaveProperty("recommendation");
    }
  });

  it("returns lift measurement versus control group", () => {
    const lift = campaignRetargetingAnalyzer.retargetingLiftMeasurement(campaignId, tenantId);
    expect(Array.isArray(lift)).toBe(true);
    expect(lift.length).toBe(5);
    for (const l of lift) {
      expect(l).toHaveProperty("metric");
      expect(l).toHaveProperty("testGroup");
      expect(l).toHaveProperty("controlGroup");
      expect(l).toHaveProperty("lift");
      expect(l).toHaveProperty("significance");
      expect(l).toHaveProperty("interpretation");
    }
  });

  it("returns creative-level performance analysis", () => {
    const creative = campaignRetargetingAnalyzer.retargetingCreativePerformance(campaignId, tenantId);
    expect(Array.isArray(creative)).toBe(true);
    expect(creative.length).toBeGreaterThan(0);
    for (const c of creative) {
      expect(c).toHaveProperty("creativeName");
      expect(c).toHaveProperty("audience");
      expect(c).toHaveProperty("ctr");
      expect(c).toHaveProperty("roas");
      expect(c).toHaveProperty("effectivenessScore");
      expect(["top_performer", "average", "underperforming"]).toContain(c.status);
    }
  });

  it("returns full ROI calculation with breakdowns", () => {
    const roi = campaignRetargetingAnalyzer.retargetingROICalculator(campaignId, tenantId);
    expect(roi.campaignId).toBe(campaignId);
    expect(roi.totalSpend).toBeGreaterThan(0);
    expect(roi.totalRevenue).toBeGreaterThan(0);
    expect(roi.grossROI).toBeGreaterThan(0);
    expect(Array.isArray(roi.attributedRevenue)).toBe(true);
    expect(Array.isArray(roi.costBreakdown)).toBe(true);
    expect(Array.isArray(roi.revenueBreakdown)).toBe(true);
    expect(roi.paybackDays).toBeGreaterThan(0);
  });

  it("returns predictive modeling with projections", () => {
    const pred = campaignRetargetingAnalyzer.retargetingPredictiveModeling(campaignId, tenantId);
    expect(pred.campaignId).toBe(campaignId);
    expect(pred.currentMetrics).toHaveProperty("audienceSize");
    expect(pred.currentMetrics).toHaveProperty("decayRate");
    expect(Array.isArray(pred.projections)).toBe(true);
    expect(pred.projections.length).toBe(6);
    for (const p of pred.projections) {
      expect(p).toHaveProperty("period");
      expect(p).toHaveProperty("projectedAudienceSize");
      expect(p).toHaveProperty("projectedRevenue");
      expect(p).toHaveProperty("confidence");
    }
    expect(pred.predictedLTV).toBeGreaterThan(0);
    expect(pred.audienceExpirationDate).toBeTruthy();
    expect(pred.recommendation).toBeTruthy();
  });
});
