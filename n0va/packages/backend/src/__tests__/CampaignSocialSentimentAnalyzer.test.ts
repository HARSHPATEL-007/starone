import { describe, it, expect } from "vitest";
import { campaignSocialSentimentAnalyzer } from "../services/CampaignSocialSentimentAnalyzerService";

describe("CampaignSocialSentimentAnalyzerService", () => {
  const tenantId = "test-tenant-sent";
  const campaignId = "test-campaign-sent";

  it("analyzes sentiment", () => {
    const analysis = campaignSocialSentimentAnalyzer.analyzeSentiment(campaignId, tenantId);
    expect(analysis.tenantId).toBe(tenantId);
    expect(analysis.campaignId).toBe(campaignId);
    expect(analysis.totalMentions).toBeGreaterThan(0);
    expect(analysis.totalReach).toBeGreaterThan(0);
    expect(analysis.positivePercent).toBeGreaterThan(0);
    expect(analysis.averageSentimentScore).toBeGreaterThanOrEqual(-1);
    expect(analysis.averageSentimentScore).toBeLessThanOrEqual(1);
    expect(analysis.dominantEmotion).toBeTruthy();
    expect(analysis.overallAssessment).toBeTruthy();
    analysis.mentions.forEach(m => {
      expect(m.id).toBeTruthy();
      expect(m.platform).toBeTruthy();
      expect(["positive", "negative", "neutral", "mixed"]).toContain(m.sentiment);
    });
  });

  it("analyzes trending topics", () => {
    const topics = campaignSocialSentimentAnalyzer.analyzeTrendingTopics(campaignId, tenantId);
    expect(topics.length).toBe(6);
    topics.forEach(t => {
      expect(t.topic).toBeTruthy();
      expect(t.momentum).toBeGreaterThan(0);
      expect(t.relatedKeywords.length).toBeGreaterThan(0);
      expect(t.recommendation).toBeTruthy();
    });
  });

  it("analyzes influencer impact", () => {
    const infs = campaignSocialSentimentAnalyzer.analyzeInfluencerImpact(campaignId, tenantId);
    expect(infs.length).toBe(6);
    infs.forEach(i => {
      expect(i.influencer).toBeTruthy();
      expect(i.followerCount).toBeGreaterThan(0);
      expect(i.mentionCount).toBeGreaterThan(0);
      expect(i.brandAffinity).toBeGreaterThanOrEqual(0);
      expect(i.collaborationPotential).toBeTruthy();
    });
  });

  it("analyzes platform sentiment", () => {
    const platforms = campaignSocialSentimentAnalyzer.analyzePlatformSentiment(campaignId, tenantId);
    expect(platforms.length).toBeGreaterThan(0);
    platforms.forEach(p => {
      expect(p.platform).toBeTruthy();
      expect(p.mentions).toBeGreaterThan(0);
      expect(p.positivePercent).toBeGreaterThanOrEqual(0);
      expect(p.recommendation).toBeTruthy();
    });
  });

  it("analyzes emotional tone", () => {
    const tones = campaignSocialSentimentAnalyzer.analyzeEmotionalTone(campaignId, tenantId);
    expect(tones.length).toBe(8);
    tones.forEach(t => {
      expect(t.emotion).toBeTruthy();
      expect(t.percentage).toBeGreaterThanOrEqual(0);
      expect(["up", "down", "stable"]).toContain(t.trending);
      expect(t.interpretation).toBeTruthy();
    });
  });

  it("analyzes sentiment trends", () => {
    const trends = campaignSocialSentimentAnalyzer.analyzeSentimentTrends(campaignId, tenantId);
    expect(trends.length).toBe(8);
    trends.forEach(t => {
      expect(t.date).toBeTruthy();
      expect(t.mentions).toBeGreaterThan(0);
      expect(t.avgSentiment).toBeGreaterThanOrEqual(-1);
      expect(t.avgSentiment).toBeLessThanOrEqual(1);
    });
  });

  it("produces consistent results", () => {
    const a1 = campaignSocialSentimentAnalyzer.analyzeSentiment(campaignId, tenantId);
    const a2 = campaignSocialSentimentAnalyzer.analyzeSentiment(campaignId, tenantId);
    expect(a1.totalMentions).toBe(a2.totalMentions);
    expect(a1.positivePercent).toBe(a2.positivePercent);
    expect(a1.averageSentimentScore).toBe(a2.averageSentimentScore);
  });
});
