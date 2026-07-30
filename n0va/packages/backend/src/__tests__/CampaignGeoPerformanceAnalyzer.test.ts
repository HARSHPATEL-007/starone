import { describe, it, expect, beforeAll } from "vitest";
import { campaignGeoPerformanceAnalyzer } from "../services/CampaignGeoPerformanceAnalyzerService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_geo_tenant";
const TEST_CAMPAIGN = "test_geo_camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "GeoPerformance Test", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
});

describe("CampaignGeoPerformanceAnalyzer - analyzeGeoPerformance", () => {
  it("returns geographic performance breakdown with multiple locations", () => {
    const report = campaignGeoPerformanceAnalyzer.analyzeGeoPerformance(TEST_CAMPAIGN, TEST_TENANT);
    expect(report).not.toBeNull();
    expect(report!.campaignId).toBe(TEST_CAMPAIGN);
    expect(report!.locations.length).toBeGreaterThan(0);
    for (const loc of report!.locations) {
      expect(loc).toHaveProperty("country");
      expect(loc).toHaveProperty("region");
      expect(loc).toHaveProperty("city");
      expect(loc).toHaveProperty("ctr");
      expect(loc).toHaveProperty("cvr");
      expect(loc).toHaveProperty("roas");
      expect(loc).toHaveProperty("performanceScore");
      expect(loc).toHaveProperty("status");
    }
    expect(report!.topRegion).toBeTruthy();
    expect(report!.bottomRegion).toBeTruthy();
    expect(Array.isArray(report!.countrySummary)).toBe(true);
    expect(report!.countrySummary.length).toBeGreaterThan(0);
    for (const cs of report!.countrySummary) {
      expect(cs).toHaveProperty("country");
      expect(cs).toHaveProperty("roas");
      expect(cs).toHaveProperty("locationCount");
    }
    expect(Array.isArray(report!.recommendations)).toBe(true);
  });

  it("returns null for unknown campaign", () => {
    expect(campaignGeoPerformanceAnalyzer.analyzeGeoPerformance("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignGeoPerformanceAnalyzer - generateGeoOptimizationRecommendations", () => {
  it("returns geo optimization recommendations per region", () => {
    const recs = campaignGeoPerformanceAnalyzer.generateGeoOptimizationRecommendations(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(r).toHaveProperty("location");
      expect(r).toHaveProperty("country");
      expect(r).toHaveProperty("recommendation");
      expect(r).toHaveProperty("bidAdjustment");
      expect(r).toHaveProperty("priority");
    }
  });
});

describe("CampaignGeoPerformanceAnalyzer - identifyGeoExpansionOpportunities", () => {
  it("returns expansion opportunities sorted by projected ROAS", () => {
    const opps = campaignGeoPerformanceAnalyzer.identifyGeoExpansionOpportunities(TEST_TENANT);
    expect(Array.isArray(opps)).toBe(true);
    expect(opps.length).toBeGreaterThan(0);
    for (const o of opps) {
      expect(o).toHaveProperty("country");
      expect(o).toHaveProperty("region");
      expect(o).toHaveProperty("estimatedMarketSize");
      expect(o).toHaveProperty("competitionLevel");
      expect(o).toHaveProperty("projectedROAS");
      expect(o).toHaveProperty("entryDifficulty");
      expect(o).toHaveProperty("recommendation");
    }
    for (let i = 1; i < opps.length; i++) {
      expect(opps[i - 1].projectedROAS).toBeGreaterThanOrEqual(opps[i].projectedROAS);
    }
  });
});

describe("CampaignGeoPerformanceAnalyzer - calculateGeoBidAdjustments", () => {
  it("returns bid adjustment recommendations per region", () => {
    const adj = campaignGeoPerformanceAnalyzer.calculateGeoBidAdjustments(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(adj)).toBe(true);
    expect(adj.length).toBeGreaterThan(0);
    for (const a of adj) {
      expect(a).toHaveProperty("location");
      expect(a).toHaveProperty("country");
      expect(a).toHaveProperty("currentBidMultiplier");
      expect(a).toHaveProperty("recommendedMultiplier");
      expect(a).toHaveProperty("rationale");
    }
  });
});

describe("CampaignGeoPerformanceAnalyzer - analyzeGeoAudienceOverlap", () => {
  it("returns country-to-country audience overlap", () => {
    const overlap = campaignGeoPerformanceAnalyzer.analyzeGeoAudienceOverlap(TEST_TENANT);
    expect(Array.isArray(overlap)).toBe(true);
    expect(overlap.length).toBeGreaterThan(0);
    for (const o of overlap) {
      expect(o).toHaveProperty("countryA");
      expect(o).toHaveProperty("countryB");
      expect(o).toHaveProperty("overlapPercent");
      expect(o).toHaveProperty("interpretation");
    }
  });
});

describe("CampaignGeoPerformanceAnalyzer - analyzeGeoTrends", () => {
  it("returns trend analysis per region", () => {
    const trends = campaignGeoPerformanceAnalyzer.analyzeGeoTrends(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(trends)).toBe(true);
    expect(trends.length).toBeGreaterThan(0);
    for (const t of trends) {
      expect(t).toHaveProperty("location");
      expect(t).toHaveProperty("country");
      expect(t).toHaveProperty("overallDirection");
      expect(Array.isArray(t.metrics)).toBe(true);
      expect(t.metrics.length).toBeGreaterThan(0);
      for (const m of t.metrics) {
        expect(m).toHaveProperty("metric");
        expect(m).toHaveProperty("direction");
      }
    }
  });
});

describe("CampaignGeoPerformanceAnalyzer - geoRegionClustering", () => {
  it("returns region clusters with performance profiles", () => {
    const clusters = campaignGeoPerformanceAnalyzer.geoRegionClustering(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(clusters)).toBe(true);
    expect(clusters.length).toBeGreaterThan(0);
    for (const c of clusters) {
      expect(c).toHaveProperty("clusterId");
      expect(c).toHaveProperty("name");
      expect(c).toHaveProperty("regions");
      expect(Array.isArray(c.regions)).toBe(true);
      expect(c.regions.length).toBeGreaterThan(0);
      expect(c).toHaveProperty("avgCtr");
      expect(c).toHaveProperty("avgCvr");
      expect(c).toHaveProperty("avgRoas");
      expect(c).toHaveProperty("performanceProfile");
      expect(Array.isArray(c.recommendations)).toBe(true);
    }
    expect(clusters[0].avgRoas).toBeGreaterThanOrEqual(0);
  });
});

describe("CampaignGeoPerformanceAnalyzer - geoTimeZoneAnalysis", () => {
  it("returns timezone-based performance analysis", () => {
    const tz = campaignGeoPerformanceAnalyzer.geoTimeZoneAnalysis(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(tz)).toBe(true);
    expect(tz.length).toBeGreaterThan(0);
    for (const t of tz) {
      expect(t).toHaveProperty("timezone");
      expect(t).toHaveProperty("countries");
      expect(Array.isArray(t.countries)).toBe(true);
      expect(t.countries.length).toBeGreaterThan(0);
      expect(t).toHaveProperty("bestPerformanceHour");
      expect(t).toHaveProperty("avgCtrByHour");
      expect(t.avgCtrByHour.length).toBe(24);
      expect(t).toHaveProperty("optimalAdSchedule");
      expect(Array.isArray(t.optimalAdSchedule)).toBe(true);
      expect(t.optimalAdSchedule.length).toBeGreaterThan(0);
      expect(Array.isArray(t.recommendations)).toBe(true);
      expect(t.recommendations.length).toBeGreaterThan(0);
    }
  });
});

describe("CampaignGeoPerformanceAnalyzer - geoLocalizationScore", () => {
  it("returns localization scores per region sorted ascending", () => {
    const scores = campaignGeoPerformanceAnalyzer.geoLocalizationScore(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(scores)).toBe(true);
    expect(scores.length).toBeGreaterThan(0);
    for (const s of scores) {
      expect(s).toHaveProperty("country");
      expect(s).toHaveProperty("region");
      expect(s).toHaveProperty("overallScore");
      expect(s).toHaveProperty("adCopyLocalization");
      expect(s).toHaveProperty("landingPageLocalization");
      expect(s).toHaveProperty("culturalRelevance");
      expect(s).toHaveProperty("languageAccuracy");
      expect(s).toHaveProperty("imageryRelevance");
      expect(Array.isArray(s.improvementSuggestions)).toBe(true);
      expect(s.improvementSuggestions.length).toBeGreaterThan(0);
    }
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1].overallScore).toBeLessThanOrEqual(scores[i].overallScore);
    }
  });
});

describe("CampaignGeoPerformanceAnalyzer - geoCrossBorderAnalysis", () => {
  it("returns cross-border analysis between country pairs", () => {
    const cb = campaignGeoPerformanceAnalyzer.geoCrossBorderAnalysis(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(cb)).toBe(true);
    expect(cb.length).toBeGreaterThan(0);
    for (const e of cb) {
      expect(e).toHaveProperty("countryPair");
      expect(e).toHaveProperty("originatingCountry");
      expect(e).toHaveProperty("targetCountry");
      expect(e).toHaveProperty("crossBorderTraffic");
      expect(e).toHaveProperty("crossBorderConversions");
      expect(e).toHaveProperty("conversionRate");
      expect(e).toHaveProperty("averageOrderValue");
      expect(Array.isArray(e.recommendations)).toBe(true);
      expect(e.recommendations.length).toBeGreaterThan(0);
    }
  });
});

describe("CampaignGeoPerformanceAnalyzer - geoPredictiveExpansion", () => {
  it("returns predictive expansion entries sorted by ROAS", () => {
    const pred = campaignGeoPerformanceAnalyzer.geoPredictiveExpansion(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(pred)).toBe(true);
    expect(pred.length).toBeGreaterThan(0);
    for (const p of pred) {
      expect(p).toHaveProperty("country");
      expect(p).toHaveProperty("region");
      expect(p).toHaveProperty("currentSimilarityScore");
      expect(p).toHaveProperty("predictedCtr");
      expect(p).toHaveProperty("predictedCvr");
      expect(p).toHaveProperty("predictedRoas");
      expect(p).toHaveProperty("confidenceLevel");
      expect(["high", "medium", "low"]).toContain(p.confidenceLevel);
      expect(p).toHaveProperty("recommendedBudget");
      expect(p).toHaveProperty("riskLevel");
      expect(["low", "medium", "high"]).toContain(p.riskLevel);
    }
    for (let i = 1; i < pred.length; i++) {
      expect(pred[i - 1].predictedRoas).toBeGreaterThanOrEqual(pred[i].predictedRoas);
    }
  });
});

describe("CampaignGeoPerformanceAnalyzer - geoCompetitiveLandscape", () => {
  it("returns competitive landscape per region", () => {
    const comp = campaignGeoPerformanceAnalyzer.geoCompetitiveLandscape(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(comp)).toBe(true);
    expect(comp.length).toBeGreaterThan(0);
    for (const c of comp) {
      expect(c).toHaveProperty("country");
      expect(c).toHaveProperty("region");
      expect(c).toHaveProperty("competitiveDensity");
      expect(["low", "medium", "high"]).toContain(c.competitiveDensity);
      expect(c).toHaveProperty("estimatedCompetitors");
      expect(c).toHaveProperty("marketShare");
      expect(c).toHaveProperty("adPriceIndex");
      expect(c).toHaveProperty("saturationLevel");
      expect(["low", "medium", "high"]).toContain(c.saturationLevel);
      expect(Array.isArray(c.barriersToEntry)).toBe(true);
      expect(c.barriersToEntry.length).toBeGreaterThan(0);
      expect(c).toHaveProperty("strategicPosition");
    }
  });
});
