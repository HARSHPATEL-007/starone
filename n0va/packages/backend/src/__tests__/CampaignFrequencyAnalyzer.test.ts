import { describe, it, expect, beforeAll } from "vitest";
import { campaignFrequencyAnalyzer } from "../services/CampaignFrequencyAnalyzerService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_freq_tenant";
const TEST_CAMPAIGN = "test_freq_camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "FrequencyAnalyzer Test", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN + "_b", name: "Frequency Test B", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 300, lifetime: 9000, spent: 3000, remaining: 6000, currency: "USD" },
    metrics: { impressions: 30000, clicks: 1200, conversions: 60, revenue: 9000, spend: 3000 },
    startDate: "2025-02-01", endDate: "2025-12-31",
  });
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN + "_c", name: "Frequency Test C", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 200, lifetime: 6000, spent: 2000, remaining: 4000, currency: "USD" },
    metrics: { impressions: 20000, clicks: 800, conversions: 40, revenue: 6000, spend: 2000 },
    startDate: "2025-03-01", endDate: "2025-12-31",
  });
});

describe("CampaignFrequencyAnalyzer - analyzeFrequencyDistribution", () => {
  it("returns frequency distribution with buckets", () => {
    const report = campaignFrequencyAnalyzer.analyzeFrequencyDistribution(TEST_CAMPAIGN, TEST_TENANT);
    expect(report).not.toBeNull();
    expect(report!.campaignId).toBe(TEST_CAMPAIGN);
    expect(report!.frequencyBuckets.length).toBe(6);
    expect(report!.averageFrequency).toBeGreaterThan(0);
    expect(report!.optimalFrequency).toBeGreaterThan(0);
    expect(report!.wearOutFrequency).toBeGreaterThan(0);
    for (const b of report!.frequencyBuckets) {
      expect(b).toHaveProperty("range");
      expect(b).toHaveProperty("conversions");
      expect(b).toHaveProperty("conversionRate");
      expect(b).toHaveProperty("status");
    }
    expect(Array.isArray(report!.recommendations)).toBe(true);
  });

  it("returns null for unknown campaign", () => {
    expect(campaignFrequencyAnalyzer.analyzeFrequencyDistribution("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignFrequencyAnalyzer - generateFrequencyOptimizationRecommendations", () => {
  it("returns optimization recommendations per campaign", () => {
    const recs = campaignFrequencyAnalyzer.generateFrequencyOptimizationRecommendations(TEST_TENANT);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(r).toHaveProperty("campaignName");
      expect(r).toHaveProperty("currentAverage");
      expect(r).toHaveProperty("targetFrequency");
      expect(r).toHaveProperty("recommendation");
      expect(r).toHaveProperty("priority");
    }
  });
});

describe("CampaignFrequencyAnalyzer - analyzeWearOutCurve", () => {
  it("returns wear-out analysis across frequency buckets", () => {
    const curve = campaignFrequencyAnalyzer.analyzeWearOutCurve(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(curve)).toBe(true);
    expect(curve.length).toBe(6);
    for (const c of curve) {
      expect(c).toHaveProperty("frequency");
      expect(c).toHaveProperty("conversionRate");
      expect(c).toHaveProperty("phase");
      expect(c).toHaveProperty("description");
    }
  });
});

describe("CampaignFrequencyAnalyzer - calculateFrequencyCapping", () => {
  it("returns frequency cap recommendations per channel", () => {
    const caps = campaignFrequencyAnalyzer.calculateFrequencyCapping(TEST_TENANT);
    expect(Array.isArray(caps)).toBe(true);
    expect(caps.length).toBe(5);
    for (const c of caps) {
      expect(c).toHaveProperty("channel");
      expect(c).toHaveProperty("currentMaxFrequency");
      expect(c).toHaveProperty("recommendedCap");
      expect(c).toHaveProperty("rationale");
    }
  });
});

describe("CampaignFrequencyAnalyzer - analyzeCrossCampaignFrequency", () => {
  it("returns cross-campaign frequency overlap sorted by waste", () => {
    const results = campaignFrequencyAnalyzer.analyzeCrossCampaignFrequency(TEST_TENANT);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty("campaignPair");
      expect(r).toHaveProperty("audienceOverlap");
      expect(r).toHaveProperty("wastePercent");
      expect(r).toHaveProperty("recommendation");
    }
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].wastePercent).toBeGreaterThanOrEqual(results[i].wastePercent);
    }
  });
});

describe("CampaignFrequencyAnalyzer - predictFrequencyImpact", () => {
  it("returns impact predictions for frequency scenarios", () => {
    const predictions = campaignFrequencyAnalyzer.predictFrequencyImpact(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(predictions)).toBe(true);
    expect(predictions.length).toBe(5);
    for (const p of predictions) {
      expect(p).toHaveProperty("currentFrequency");
      expect(p).toHaveProperty("proposedFrequency");
      expect(p).toHaveProperty("predictedImpressionChange");
      expect(p).toHaveProperty("predictedConversionChange");
      expect(p).toHaveProperty("confidence");
    }
  });
});

describe("CampaignFrequencyAnalyzer - frequencySegmentAnalysis", () => {
  it("returns segment-level frequency breakdown", () => {
    const segments = campaignFrequencyAnalyzer.frequencySegmentAnalysis(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(segments)).toBe(true);
    expect(segments.length).toBeGreaterThan(0);
    for (const s of segments) {
      expect(s).toHaveProperty("segment");
      expect(s).toHaveProperty("userCount");
      expect(s).toHaveProperty("avgFrequency");
      expect(s).toHaveProperty("conversionRate");
      expect(s).toHaveProperty("status");
      expect(["under-exposed", "optimal", "over-exposed"]).toContain(s.status);
      expect(s).toHaveProperty("recommendation");
    }
  });
});

describe("CampaignFrequencyAnalyzer - frequencyAttributionModeling", () => {
  it("returns attribution-weighted frequency analysis per model", () => {
    const attr = campaignFrequencyAnalyzer.frequencyAttributionModeling(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(attr)).toBe(true);
    expect(attr.length).toBeGreaterThan(0);
    for (const a of attr) {
      expect(a).toHaveProperty("model");
      expect(a).toHaveProperty("attributedConversions");
      expect(a).toHaveProperty("attributedRevenue");
      expect(a).toHaveProperty("avgFrequency");
      expect(a).toHaveProperty("frequencyEfficiency");
      expect(a).toHaveProperty("recommendedCap");
    }
  });
});

describe("CampaignFrequencyAnalyzer - frequencyDiminishingReturns", () => {
  it("returns diminishing returns curve with saturation point", () => {
    const curve = campaignFrequencyAnalyzer.frequencyDiminishingReturns(TEST_CAMPAIGN, TEST_TENANT);
    expect(curve).toHaveProperty("campaignId");
    expect(curve).toHaveProperty("curvePoints");
    expect(Array.isArray(curve.curvePoints)).toBe(true);
    expect(curve.curvePoints.length).toBeGreaterThan(0);
    expect(curve).toHaveProperty("saturationPoint");
    expect(curve).toHaveProperty("optimalFrequency");
    expect(curve).toHaveProperty("wearOutFrequency");
    for (const p of curve.curvePoints) {
      expect(p).toHaveProperty("frequency");
      expect(p).toHaveProperty("marginalConversionRate");
      expect(p).toHaveProperty("cumulativeROAS");
    }
  });
});

describe("CampaignFrequencyAnalyzer - frequencyCompetitiveBenchmark", () => {
  it("returns competitive benchmarks per channel", () => {
    const bench = campaignFrequencyAnalyzer.frequencyCompetitiveBenchmark(TEST_TENANT);
    expect(Array.isArray(bench)).toBe(true);
    expect(bench.length).toBeGreaterThan(0);
    for (const b of bench) {
      expect(b).toHaveProperty("channel");
      expect(b).toHaveProperty("ourAvgFrequency");
      expect(b).toHaveProperty("benchmarkAvgFrequency");
      expect(b).toHaveProperty("ourConversionRate");
      expect(b).toHaveProperty("benchmarkConversionRate");
      expect(b).toHaveProperty("percentile");
      expect(b).toHaveProperty("gap");
      expect(b).toHaveProperty("recommendation");
    }
  });
});

describe("CampaignFrequencyAnalyzer - frequencyAdFormatInteraction", () => {
  it("returns frequency analysis per ad format", () => {
    const formats = campaignFrequencyAnalyzer.frequencyAdFormatInteraction(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(formats)).toBe(true);
    expect(formats.length).toBeGreaterThan(0);
    for (const f of formats) {
      expect(f).toHaveProperty("format");
      expect(f).toHaveProperty("avgFrequency");
      expect(f).toHaveProperty("userCount");
      expect(f).toHaveProperty("impressions");
      expect(f).toHaveProperty("conversionRate");
      expect(f).toHaveProperty("saturationPoint");
      expect(f).toHaveProperty("interactionScore");
      expect(f).toHaveProperty("crossFormatWaste");
      expect(f).toHaveProperty("recommendation");
    }
  });
});

describe("CampaignFrequencyAnalyzer - frequencyDeviceBreakdown", () => {
  it("returns frequency breakdown by device type", () => {
    const devices = campaignFrequencyAnalyzer.frequencyDeviceBreakdown(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(devices)).toBe(true);
    expect(devices.length).toBeGreaterThan(0);
    for (const d of devices) {
      expect(d).toHaveProperty("device");
      expect(d).toHaveProperty("avgFrequency");
      expect(d).toHaveProperty("userShare");
      expect(d).toHaveProperty("impressionShare");
      expect(d).toHaveProperty("conversionShare");
      expect(d).toHaveProperty("conversionRate");
      expect(d).toHaveProperty("optimalFrequency");
      expect(d).toHaveProperty("frequencyCap");
      expect(d).toHaveProperty("recommendation");
    }
  });
});
