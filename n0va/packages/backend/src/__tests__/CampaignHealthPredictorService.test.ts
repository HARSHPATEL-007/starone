import { describe, it, expect } from "vitest";
import { CampaignHealthPredictorService } from "../services/CampaignHealthPredictorService";

const service = new CampaignHealthPredictorService();

const mkMetrics = (days: number = 30) => {
  const metrics: any[] = [];
  for (let d = 1; d <= days; d++) {
    const decay = Math.max(0.5, 1 - d * 0.008);
    metrics.push({
      day: d,
      impressions: Math.round(5000 * decay),
      clicks: Math.round(5000 * decay * 0.03),
      conversions: Math.round(5000 * decay * 0.03 * 0.05),
      spend: Math.round(5000 * decay * 0.03 * 1.5 * 100) / 100,
      revenue: Math.round(5000 * decay * 0.03 * 0.05 * 80 * 100) / 100,
    });
  }
  return metrics;
};

describe("CampaignHealthPredictorService - healthTrendForecast", () => {
  it("returns forecast with bounds and trend", () => {
    const metrics = mkMetrics(30);
    const r = service.healthTrendForecast(metrics, 7);
    expect(Array.isArray(r.forecast)).toBe(true);
    expect(r.forecast.length).toBe(7);
    for (const f of r.forecast) {
      expect(f).toHaveProperty("day");
      expect(f).toHaveProperty("predictedHealth");
      expect(f).toHaveProperty("lowerBound");
      expect(f).toHaveProperty("upperBound");
      expect(f.predictedHealth).toBeGreaterThanOrEqual(0);
      expect(f.predictedHealth).toBeLessThanOrEqual(100);
      expect(f.upperBound).toBeGreaterThanOrEqual(f.lowerBound);
    }
    expect(r.confidenceLevel).toBeGreaterThan(0);
    expect(["improving", "declining", "stable"]).toContain(r.trend);
    expect(typeof r.predictedCategory).toBe("string");
  });

  it("returns fallback for short metrics", () => {
    const r = service.healthTrendForecast(mkMetrics(1), 7);
    expect(r.forecast.length).toBe(7);
  });
});

describe("CampaignHealthPredictorService - healthDimensionBreakdown", () => {
  it("returns dimension breakdown for campaigns", () => {
    const r = service.healthDimensionBreakdown([
      { campaignId: "c1", metrics: mkMetrics(30) },
      { campaignId: "c2", metrics: mkMetrics(15) },
    ]);
    expect(r.length).toBe(2);
    for (const entry of r) {
      expect(entry).toHaveProperty("campaignId");
      expect(entry.overall).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(entry.dimensions)).toBe(true);
      expect(entry.dimensions.length).toBe(5);
      for (const d of entry.dimensions) {
        expect(d).toHaveProperty("name");
        expect(d).toHaveProperty("score");
        expect(d).toHaveProperty("percentile");
        expect(d).toHaveProperty("status");
      }
      expect(typeof entry.weakestDimension).toBe("string");
      expect(typeof entry.strongestDimension).toBe("string");
    }
  });

  it("returns empty for empty input", () => {
    expect(service.healthDimensionBreakdown([])).toEqual([]);
  });
});

describe("CampaignHealthPredictorService - healthAnomalyDetection", () => {
  it("detects anomalies in metrics", () => {
    const metrics = mkMetrics(30);
    const r = service.healthAnomalyDetection(metrics);
    expect(Array.isArray(r)).toBe(true);
    if (r.length > 0) {
      for (const a of r) {
        expect(a).toHaveProperty("day");
        expect(a).toHaveProperty("metric");
        expect(a).toHaveProperty("actualValue");
        expect(a).toHaveProperty("expectedValue");
        expect(a).toHaveProperty("severity");
        expect(["low", "medium", "high"]).toContain(a.severity);
        expect(typeof a.likelyCause).toBe("string");
      }
    }
  });

  it("returns empty for too few metrics", () => {
    const r = service.healthAnomalyDetection(mkMetrics(3));
    expect(r).toEqual([]);
  });
});

describe("CampaignHealthPredictorService - healthImprovementPlan", () => {
  it("returns improvement steps for poor health", () => {
    const health = { overall: 45, category: "poor" as const, components: { efficiency: 35, engagement: 60, conversion: 30, pacing: 70, stability: 80 } };
    const risks = [{ name: "CTR Decline", severity: "high" as const, impact: 40, description: "Test", recommendation: "Fix CTR" }];
    const r = service.healthImprovementPlan(health, risks);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
    for (const s of r) {
      expect(s).toHaveProperty("order");
      expect(s).toHaveProperty("dimension");
      expect(s).toHaveProperty("action");
      expect(s).toHaveProperty("rationale");
      expect(s).toHaveProperty("effort");
      expect(s).toHaveProperty("expectedLift");
      expect(s).toHaveProperty("timeframe");
    }
    const criticalStep = r.find(s => s.dimension === "cross_dimension");
    expect(criticalStep).toBeDefined();
  });

  it("returns maintenance plan for healthy campaign", () => {
    const health = { overall: 90, category: "excellent" as const, components: { efficiency: 85, engagement: 88, conversion: 82, pacing: 90, stability: 95 } };
    const r = service.healthImprovementPlan(health, []);
    expect(r.length).toBeGreaterThanOrEqual(1);
  });
});

describe("CampaignHealthPredictorService - healthPeerComparison", () => {
  it("returns comparison with peers", () => {
    const r = service.healthPeerComparison("c1", mkMetrics(30), [
      { campaignId: "p1", metrics: mkMetrics(20) },
      { campaignId: "p2", metrics: mkMetrics(15) },
    ]);
    expect(r.campaignId).toBe("c1");
    expect(r.overallHealth).toBeGreaterThanOrEqual(0);
    expect(r.peerAverage).toBeGreaterThanOrEqual(0);
    expect(r.percentile).toBeGreaterThanOrEqual(0);
    expect(r.rank).toBeGreaterThanOrEqual(1);
    expect(r.peerCount).toBe(2);
    expect(Array.isArray(r.dimensionGaps)).toBe(true);
    expect(r.dimensionGaps.length).toBe(5);
    for (const g of r.dimensionGaps) {
      expect(g).toHaveProperty("dimension");
      expect(g).toHaveProperty("ownScore");
      expect(g).toHaveProperty("peerAvg");
    }
    expect(typeof r.verdict).toBe("string");
  });

  it("handles no peers", () => {
    const r = service.healthPeerComparison("c1", mkMetrics(30), []);
    expect(r.peerCount).toBe(0);
    expect(typeof r.verdict).toBe("string");
  });
});

describe("CampaignHealthPredictorService - healthBenchmark", () => {
  it("returns benchmark results", () => {
    const r = service.healthBenchmark(mkMetrics(30));
    expect(Array.isArray(r.benchmarks)).toBe(true);
    expect(r.benchmarks.length).toBeGreaterThan(0);
    for (const b of r.benchmarks) {
      expect(b).toHaveProperty("metric");
      expect(b).toHaveProperty("value");
      expect(b).toHaveProperty("benchmark");
      expect(b).toHaveProperty("deviation");
      expect(["excellent", "above_average", "average", "below_average", "poor"]).toContain(b.rating);
    }
    expect(typeof r.overallRating).toBe("string");
    expect(r.percentileRank).toBeGreaterThanOrEqual(0);
  });

  it("accepts custom benchmarks", () => {
    const custom = [
      { metric: "ctr", excellent: 5, good: 3, fair: 2, poor: 1 },
    ];
    const r = service.healthBenchmark(mkMetrics(30), custom);
    expect(r.benchmarks.length).toBe(1);
    expect(r.benchmarks[0].metric).toBe("ctr");
  });
});
