import { describe, it, expect, beforeAll } from "vitest";
import { campaignAdFormatAnalyzer } from "../services/CampaignAdFormatAnalyzerService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_fmt_tenant";
const TEST_CAMPAIGN = "test_fmt_camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "FormatAnalyzer Test", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
});

describe("CampaignAdFormatAnalyzer - analyzeFormatPerformance", () => {
  it("returns format performance breakdown with mix recommendations", () => {
    const report = campaignAdFormatAnalyzer.analyzeFormatPerformance(TEST_CAMPAIGN, TEST_TENANT);
    expect(report).not.toBeNull();
    expect(report!.campaignId).toBe(TEST_CAMPAIGN);
    expect(report!.formats.length).toBe(16);
    for (const f of report!.formats) {
      expect(f).toHaveProperty("format");
      expect(f).toHaveProperty("category");
      expect(f).toHaveProperty("ctr");
      expect(f).toHaveProperty("cvr");
      expect(f).toHaveProperty("roas");
      expect(f).toHaveProperty("performanceScore");
      expect(f).toHaveProperty("status");
    }
    expect(report!.bestFormat).toBeTruthy();
    expect(report!.worstFormat).toBeTruthy();
    expect(Array.isArray(report!.categorySummary)).toBe(true);
    expect(report!.categorySummary.length).toBeGreaterThan(0);
    expect(Array.isArray(report!.formatMix)).toBe(true);
    expect(report!.formatMix.length).toBe(16);
    for (const m of report!.formatMix) {
      expect(m).toHaveProperty("format");
      expect(m).toHaveProperty("currentShare");
      expect(m).toHaveProperty("recommendedShare");
    }
    expect(Array.isArray(report!.recommendations)).toBe(true);
  });

  it("returns null for unknown campaign", () => {
    expect(campaignAdFormatAnalyzer.analyzeFormatPerformance("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignAdFormatAnalyzer - recommendFormatMix", () => {
  it("returns format mix recommendations", () => {
    const recs = campaignAdFormatAnalyzer.recommendFormatMix(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBe(16);
    for (const r of recs) {
      expect(r).toHaveProperty("format");
      expect(r).toHaveProperty("category");
      expect(r).toHaveProperty("recommendation");
      expect(r).toHaveProperty("bidAdjustment");
      expect(r).toHaveProperty("priority");
    }
  });
});

describe("CampaignAdFormatAnalyzer - identifyFormatOpportunities", () => {
  it("returns format opportunities sorted by projected ROAS", () => {
    const opps = campaignAdFormatAnalyzer.identifyFormatOpportunities(TEST_TENANT);
    expect(Array.isArray(opps)).toBe(true);
    expect(opps.length).toBe(12);
    for (const o of opps) {
      expect(o).toHaveProperty("format");
      expect(o).toHaveProperty("category");
      expect(o).toHaveProperty("projectedROAS");
      expect(o).toHaveProperty("implementationDifficulty");
      expect(o).toHaveProperty("recommendation");
    }
    for (let i = 1; i < opps.length; i++) {
      expect(opps[i - 1].projectedROAS).toBeGreaterThanOrEqual(opps[i].projectedROAS);
    }
  });
});

describe("CampaignAdFormatAnalyzer - calculateFormatBidAdjustments", () => {
  it("returns bid adjustments per format", () => {
    const adj = campaignAdFormatAnalyzer.calculateFormatBidAdjustments(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(adj)).toBe(true);
    expect(adj.length).toBe(16);
    for (const a of adj) {
      expect(a).toHaveProperty("format");
      expect(a).toHaveProperty("category");
      expect(a).toHaveProperty("currentBidMultiplier");
      expect(a).toHaveProperty("recommendedMultiplier");
      expect(a).toHaveProperty("rationale");
    }
  });
});

describe("CampaignAdFormatAnalyzer - analyzeAudienceFormatPreference", () => {
  it("returns audience preference scores per format", () => {
    const prefs = campaignAdFormatAnalyzer.analyzeAudienceFormatPreference(TEST_TENANT);
    expect(Array.isArray(prefs)).toBe(true);
    expect(prefs.length).toBe(12);
    for (const p of prefs) {
      expect(p).toHaveProperty("format");
      expect(p).toHaveProperty("category");
      expect(p).toHaveProperty("audienceScore");
      expect(p).toHaveProperty("engagementRate");
      expect(p).toHaveProperty("preferredBySegment");
      expect(p).toHaveProperty("recommendation");
    }
  });
});

describe("CampaignAdFormatAnalyzer - analyzeFormatTrends", () => {
  it("returns trend analysis for top formats", () => {
    const trends = campaignAdFormatAnalyzer.analyzeFormatTrends(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(trends)).toBe(true);
    expect(trends.length).toBe(10);
    for (const t of trends) {
      expect(t).toHaveProperty("format");
      expect(t).toHaveProperty("category");
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

describe("CampaignAdFormatAnalyzer - formatCrossDeviceAnalysis", () => {
  it("returns cross-device performance per format", () => {
    const results = campaignAdFormatAnalyzer.formatCrossDeviceAnalysis(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty("format");
      expect(r).toHaveProperty("mobileCtr");
      expect(r).toHaveProperty("desktopCtr");
      expect(r).toHaveProperty("bestDevice");
      expect(r).toHaveProperty("crossDeviceConsistency");
      expect(r).toHaveProperty("recommendation");
    }
  });
});

describe("CampaignAdFormatAnalyzer - formatCreativeEffectiveness", () => {
  it("returns creative effectiveness per format", () => {
    const results = campaignAdFormatAnalyzer.formatCreativeEffectiveness(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty("format");
      expect(r).toHaveProperty("creativeVersions");
      expect(r).toHaveProperty("topPerformerVersion");
      expect(Array.isArray(r.avgCtrByVersion)).toBe(true);
      expect(r.avgCtrByVersion.length).toBeGreaterThan(0);
      expect(r).toHaveProperty("creativeFatigueIndex");
      expect(r).toHaveProperty("refreshRecommended");
    }
  });
});

describe("CampaignAdFormatAnalyzer - formatAudienceSegmentMapping", () => {
  it("returns format-to-segment affinity scores", () => {
    const results = campaignAdFormatAnalyzer.formatAudienceSegmentMapping(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty("format");
      expect(r).toHaveProperty("segment");
      expect(r).toHaveProperty("affinityScore");
      expect(r).toHaveProperty("conversionRate");
      expect(r).toHaveProperty("engagementRate");
      expect(r).toHaveProperty("recommendation");
    }
  });
});

describe("CampaignAdFormatAnalyzer - formatCompetitiveAnalysis", () => {
  it("returns competitive format comparison", () => {
    const results = campaignAdFormatAnalyzer.formatCompetitiveAnalysis(TEST_TENANT);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty("format");
      expect(r).toHaveProperty("ourUsage");
      expect(r).toHaveProperty("competitorAvgUsage");
      expect(r).toHaveProperty("usageGap");
      expect(r).toHaveProperty("ourROAS");
      expect(r).toHaveProperty("competitorAvgROAS");
      expect(r).toHaveProperty("competitiveAdvantage");
      expect(r).toHaveProperty("recommendation");
    }
  });
});

describe("CampaignAdFormatAnalyzer - formatROIAttribution", () => {
  it("returns ROI attribution per format", () => {
    const results = campaignAdFormatAnalyzer.formatROIAttribution(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty("format");
      expect(r).toHaveProperty("totalSpend");
      expect(r).toHaveProperty("totalRevenue");
      expect(r).toHaveProperty("directROAS");
      expect(r).toHaveProperty("attributedROAS");
      expect(r).toHaveProperty("diminishingReturnPoint");
      expect(r).toHaveProperty("efficiencyGrade");
      expect(["A", "B", "C", "D", "F"]).toContain(r.efficiencyGrade);
    }
  });
});

describe("CampaignAdFormatAnalyzer - formatLifecycleAnalysis", () => {
  it("returns format lifecycle stage analysis", () => {
    const results = campaignAdFormatAnalyzer.formatLifecycleAnalysis(TEST_TENANT);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty("format");
      expect(r).toHaveProperty("lifecycleStage");
      expect(["introduction", "growth", "maturity", "decline"]).toContain(r.lifecycleStage);
      expect(r).toHaveProperty("marketAdoption");
      expect(r).toHaveProperty("yearOverYearChange");
      expect(r).toHaveProperty("projectedRelevance");
      expect(r).toHaveProperty("investmentStrategy");
      expect(r).toHaveProperty("riskLevel");
    }
  });
});
