import { describe, it, expect } from "vitest";
import { campaignKeywordAnalyzer } from "../services/CampaignKeywordAnalyzerService";

describe("CampaignKeywordAnalyzerService", () => {
  const tenantId = "test-tenant-kw";
  const campaignId = "test-campaign-kw";

  it("analyzes keywords", () => {
    const analysis = campaignKeywordAnalyzer.analyzeKeywords(campaignId, tenantId);
    expect(analysis.tenantId).toBe(tenantId);
    expect(analysis.campaignId).toBe(campaignId);
    expect(analysis.keywords.length).toBeGreaterThanOrEqual(12);
    expect(analysis.totalImpressions).toBeGreaterThan(0);
    expect(analysis.totalClicks).toBeGreaterThan(0);
    expect(analysis.averageCTR).toBeGreaterThan(0);
    expect(analysis.averageCPC).toBeGreaterThan(0);
    expect(analysis.topKeywords.length).toBe(3);
    analysis.keywords.forEach(k => {
      expect(k.keyword).toBeTruthy();
      expect(k.impressions).toBeGreaterThan(0);
      expect(k.cpc).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(k.competition);
    });
  });

  it("identifies keyword gaps", () => {
    const gaps = campaignKeywordAnalyzer.identifyKeywordGaps(campaignId, tenantId);
    expect(gaps.length).toBe(6);
    gaps.forEach(g => {
      expect(g.topic).toBeTruthy();
      expect(g.volume).toBeGreaterThan(0);
      expect(g.difficulty).toBeGreaterThanOrEqual(0);
      expect(g.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(g.suggestedKeywords.length).toBeGreaterThan(0);
    });
  });

  it("clusters keywords", () => {
    const clusters = campaignKeywordAnalyzer.clusterKeywords(campaignId, tenantId);
    expect(clusters.length).toBeGreaterThanOrEqual(1);
    clusters.forEach(c => {
      expect(c.clusterName).toBeTruthy();
      expect(c.keywords.length).toBeGreaterThan(0);
      expect(c.volume).toBeGreaterThan(0);
      expect(c.combinedRoas).toBeGreaterThanOrEqual(0);
      expect(c.recommendation).toBeTruthy();
    });
  });

  it("generates bid recommendations", () => {
    const recs = campaignKeywordAnalyzer.generateBidRecommendations(campaignId, tenantId);
    expect(recs.length).toBeGreaterThan(0);
    recs.forEach(r => {
      expect(r.keyword).toBeTruthy();
      expect(r.currentBid).toBeGreaterThan(0);
      expect(r.suggestedBid).toBeGreaterThan(0);
      expect(r.reason).toBeTruthy();
      expect(["high", "medium", "low"]).toContain(r.priority);
    });
  });

  it("analyzes keyword trends", () => {
    const trends = campaignKeywordAnalyzer.analyzeKeywordTrends(campaignId, tenantId);
    expect(trends.length).toBe(8);
    trends.forEach(t => {
      expect(t.date).toBeTruthy();
      expect(t.impressions).toBeGreaterThan(0);
      expect(t.clicks).toBeGreaterThan(0);
      expect(t.avgPosition).toBeGreaterThan(0);
      expect(t.topKeyword).toBeTruthy();
    });
  });

  it("analyzes search term overlap", () => {
    const overlap = campaignKeywordAnalyzer.analyzeSearchTermOverlap(campaignId, "tenant-a", "tenant-b");
    expect(overlap.sharedKeywords).toBeGreaterThanOrEqual(0);
    expect(overlap.uniqueToA).toBeGreaterThanOrEqual(0);
    expect(overlap.uniqueToB).toBeGreaterThanOrEqual(0);
    expect(overlap.overlapRate).toBeGreaterThanOrEqual(0);
    expect(overlap.recommendation).toBeTruthy();
  });

  it("produces consistent results for same campaign+tenant", () => {
    const a1 = campaignKeywordAnalyzer.analyzeKeywords(campaignId, tenantId);
    const a2 = campaignKeywordAnalyzer.analyzeKeywords(campaignId, tenantId);
    expect(a1.keywords.length).toBe(a2.keywords.length);
    expect(a1.totalImpressions).toBe(a2.totalImpressions);
    expect(a1.averageROAS).toBe(a2.averageROAS);
  });

  it("returns keyword performance forecast with projections", () => {
    const fc = campaignKeywordAnalyzer.keywordPerformanceForecast(campaignId, tenantId);
    expect(fc.campaignId).toBe(campaignId);
    expect(fc.currentMetrics).toHaveProperty("impressions");
    expect(fc.currentMetrics).toHaveProperty("roas");
    expect(Array.isArray(fc.forecast)).toBe(true);
    expect(fc.forecast.length).toBe(6);
    for (const f of fc.forecast) {
      expect(f).toHaveProperty("period");
      expect(f).toHaveProperty("roas");
      expect(f).toHaveProperty("avgPosition");
    }
    expect(["improving", "declining", "stable"]).toContain(fc.overallTrend);
    expect(fc.confidence).toBeGreaterThan(0);
  });

  it("returns competitive analysis for top keywords", () => {
    const comp = campaignKeywordAnalyzer.keywordCompetitiveAnalysis(campaignId, tenantId);
    expect(Array.isArray(comp)).toBe(true);
    expect(comp.length).toBeGreaterThan(0);
    for (const c of comp) {
      expect(c).toHaveProperty("keyword");
      expect(c).toHaveProperty("competitorCount");
      expect(c).toHaveProperty("winRate");
      expect(c).toHaveProperty("impressionShare");
      expect(["low", "medium", "high"]).toContain(c.competitivePressure);
    }
  });

  it("returns match type distribution analysis", () => {
    const mt = campaignKeywordAnalyzer.keywordMatchTypeAnalysis(campaignId, tenantId);
    expect(Array.isArray(mt)).toBe(true);
    expect(mt.length).toBe(4);
    for (const m of mt) {
      expect(m).toHaveProperty("matchType");
      expect(m).toHaveProperty("keywords");
      expect(m).toHaveProperty("roas");
      expect(m).toHaveProperty("recommendation");
    }
  });

  it("returns seasonality analysis with monthly pattern", () => {
    const seas = campaignKeywordAnalyzer.keywordSeasonalityAnalysis(campaignId, tenantId);
    expect(seas.campaignId).toBe(campaignId);
    expect(Array.isArray(seas.seasonalPattern)).toBe(true);
    expect(seas.seasonalPattern.length).toBe(12);
    for (const s of seas.seasonalPattern) {
      expect(s).toHaveProperty("period");
      expect(s).toHaveProperty("seasonalityIndex");
      expect(s).toHaveProperty("predictedVolume");
    }
    expect(seas.peakPeriod).toBeTruthy();
    expect(seas.troughPeriod).toBeTruthy();
    expect(["high", "medium", "low"]).toContain(seas.overallVolatility);
  });

  it("returns semantic clustering by intent", () => {
    const sem = campaignKeywordAnalyzer.keywordSemanticClustering(campaignId, tenantId);
    expect(Array.isArray(sem)).toBe(true);
    expect(sem.length).toBe(6);
    for (const s of sem) {
      expect(s).toHaveProperty("clusterName");
      expect(s).toHaveProperty("intent");
      expect(Array.isArray(s.keywords)).toBe(true);
      expect(s).toHaveProperty("totalVolume");
      expect(s).toHaveProperty("conversionRate");
      expect(s).toHaveProperty("effectiveness");
    }
  });

  it("returns ROI attribution across keyword groups", () => {
    const attr = campaignKeywordAnalyzer.keywordROIAttribution(campaignId, tenantId);
    expect(Array.isArray(attr)).toBe(true);
    expect(attr.length).toBe(4);
    for (const a of attr) {
      expect(a).toHaveProperty("groupName");
      expect(a).toHaveProperty("totalCost");
      expect(a).toHaveProperty("totalRevenue");
      expect(a).toHaveProperty("roas");
      expect(a).toHaveProperty("assistedConversions");
      expect(a).toHaveProperty("attribution");
    }
  });
});
