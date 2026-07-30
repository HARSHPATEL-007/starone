import { describe, it, expect } from "vitest";
import { CampaignSocialSentimentAnalyzerService } from "../services/CampaignSocialSentimentAnalyzerService";

const service = new CampaignSocialSentimentAnalyzerService();
const T = "sent-test-tenant";
const C = "sent-test-camp";

describe("CampaignSocialSentimentAnalyzer - sentimentKeywordAnalysis", () => {
  it("returns keyword-level sentiment breakdown", () => {
    const r = service.sentimentKeywordAnalysis(C, T);
    expect(r.campaignId).toBe(C);
    expect(Array.isArray(r.keywords)).toBe(true);
    expect(r.keywords.length).toBeGreaterThan(0);
    for (const k of r.keywords) {
      expect(k).toHaveProperty("keyword");
      expect(k).toHaveProperty("mentionCount");
      expect(k).toHaveProperty("sentiment");
      expect(k).toHaveProperty("frequency");
      expect(k).toHaveProperty("context");
    }
    expect(typeof r.topPositiveKeyword).toBe("string");
    expect(typeof r.topNegativeKeyword).toBe("string");
    expect(typeof r.avgKeywordSentiment).toBe("number");
  });
});

describe("CampaignSocialSentimentAnalyzer - sentimentCompetitorComparison", () => {
  it("returns competitive sentiment ranking", () => {
    const r = service.sentimentCompetitorComparison(C, T);
    expect(r.campaignId).toBe(C);
    expect(typeof r.brandSentiment).toBe("number");
    expect(Array.isArray(r.competitors)).toBe(true);
    expect(r.competitors.length).toBeGreaterThan(0);
    for (const c of r.competitors) {
      expect(c).toHaveProperty("name");
      expect(c).toHaveProperty("sentiment");
      expect(c).toHaveProperty("shareOfVoice");
      expect(c).toHaveProperty("topTopic");
    }
    expect(r.rank).toBeGreaterThanOrEqual(1);
    expect(r.totalCompetitors).toBeGreaterThanOrEqual(1);
    expect(typeof r.advantage).toBe("string");
  });
});

describe("CampaignSocialSentimentAnalyzer - sentimentAlertThresholds", () => {
  it("returns threshold monitoring results", () => {
    const r = service.sentimentAlertThresholds(C, T);
    expect(r.campaignId).toBe(C);
    expect(Array.isArray(r.thresholds)).toBe(true);
    expect(r.thresholds.length).toBeGreaterThan(0);
    for (const t of r.thresholds) {
      expect(t).toHaveProperty("metric");
      expect(t).toHaveProperty("currentValue");
      expect(t).toHaveProperty("threshold");
      expect(typeof t.breached).toBe("boolean");
      expect(["warning", "critical", "ok"]).toContain(t.severity);
      expect(typeof t.alert).toBe("string");
    }
    expect(typeof r.breachCount).toBe("number");
    expect(["all_clear", "attention", "critical"]).toContain(r.overallStatus);
  });
});

describe("CampaignSocialSentimentAnalyzer - sentimentActionableInsights", () => {
  it("returns prioritized actionable insights", () => {
    const r = service.sentimentActionableInsights(C, T);
    expect(r.campaignId).toBe(C);
    expect(Array.isArray(r.insights)).toBe(true);
    expect(r.totalInsights).toBeGreaterThanOrEqual(0);
    for (const ins of r.insights) {
      expect(ins).toHaveProperty("area");
      expect(ins).toHaveProperty("insight");
      expect(ins).toHaveProperty("suggestedAction");
      expect(["critical", "high", "medium", "low"]).toContain(ins.priority);
      expect(ins).toHaveProperty("expectedImpact");
    }
    expect(["critical", "high", "medium", "low", "none"]).toContain(r.topPriority);
  });
});

describe("CampaignSocialSentimentAnalyzer - sentimentShareOfVoice", () => {
  it("returns share of voice analysis", () => {
    const r = service.sentimentShareOfVoice(C, T);
    expect(r.campaignId).toBe(C);
    expect(typeof r.totalMentions).toBe("number");
    expect(typeof r.brandMentions).toBe("number");
    expect(typeof r.share).toBe("number");
    expect(Array.isArray(r.competitors)).toBe(true);
    for (const c of r.competitors) {
      expect(c).toHaveProperty("name");
      expect(c).toHaveProperty("mentions");
      expect(c).toHaveProperty("share");
      expect(c).toHaveProperty("sentiment");
    }
    expect(["growing", "stable", "declining"]).toContain(r.trend);
    expect(typeof r.recommendation).toBe("string");
  });
});

describe("CampaignSocialSentimentAnalyzer - sentimentForecast", () => {
  it("returns sentiment forecast periods", () => {
    const r = service.sentimentForecast(C, T);
    expect(r.campaignId).toBe(C);
    expect(Array.isArray(r.periods)).toBe(true);
    expect(r.periods.length).toBe(6);
    for (const p of r.periods) {
      expect(p).toHaveProperty("period");
      expect(p).toHaveProperty("predictedScore");
      expect(["high", "medium", "low"]).toContain(p.confidence);
      expect(p.range).toHaveProperty("low");
      expect(p.range).toHaveProperty("high");
    }
    expect(["improving", "declining", "stable"]).toContain(r.overallOutlook);
    expect(["high", "medium", "low"]).toContain(r.riskLevel);
    expect(typeof r.keyDriver).toBe("string");
  });
});
