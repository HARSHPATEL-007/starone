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
});
