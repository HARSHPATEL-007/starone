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
