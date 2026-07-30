import { describe, it, expect, beforeAll } from "vitest";
import { CampaignROIDecompositionService } from "../services/CampaignROIDecompositionService";
import { DataStore } from "../services/DataStore";

const service = new CampaignROIDecompositionService();
const T = "roi-service-test-tenant";
const C = "roi-service-camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: C, name: "ROI Service Campaign", tenantId: T, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
});

describe("CampaignROIDecomposition - roiBenchmark", () => {
  it("returns benchmark comparison with percentile", () => {
    const r = service.roiBenchmark(C, T);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(C);
    expect(Array.isArray(r!.benchmarks)).toBe(true);
    expect(r!.benchmarks.length).toBeGreaterThan(0);
    for (const b of r!.benchmarks) {
      expect(b).toHaveProperty("factor");
      expect(b).toHaveProperty("ownValue");
      expect(b).toHaveProperty("peerAvg");
      expect(b).toHaveProperty("percentile");
      expect(["strong", "average", "weak"]).toContain(b.rating);
    }
    expect(r!.overallPercentile).toBeGreaterThanOrEqual(0);
    expect(r!.topGap).toHaveProperty("factor");
  });
});

describe("CampaignROIDecomposition - roiScenarioSimulation", () => {
  it("returns scenario projections", () => {
    const r = service.roiScenarioSimulation(C, T);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
    for (const s of r) {
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("projectedROAS");
      expect(s).toHaveProperty("projectedROI");
      expect(s).toHaveProperty("delta");
      expect(["high", "medium", "low"]).toContain(s.feasibility);
    }
  });
});

describe("CampaignROIDecomposition - roiChannelBreakdown", () => {
  it("returns channel-level ROI breakdown", () => {
    const r = service.roiChannelBreakdown(C, T);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(C);
    expect(Array.isArray(r!.channels)).toBe(true);
    expect(r!.channels.length).toBe(5);
    for (const ch of r!.channels) {
      expect(ch).toHaveProperty("channel");
      expect(ch).toHaveProperty("spend");
      expect(ch).toHaveProperty("roas");
      expect(ch).toHaveProperty("contribution");
    }
    expect(typeof r!.bestChannel).toBe("string");
    expect(typeof r!.worstChannel).toBe("string");
    expect(typeof r!.concentrationRisk).toBe("string");
  });
});

describe("CampaignROIDecomposition - roiOptimizationTargets", () => {
  it("returns prioritized optimization targets", () => {
    const r = service.roiOptimizationTargets(C, T);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
    for (const t of r) {
      expect(t).toHaveProperty("factor");
      expect(t).toHaveProperty("currentValue");
      expect(t).toHaveProperty("targetValue");
      expect(t).toHaveProperty("potentialROASGain");
      expect(["low", "medium", "high"]).toContain(t.effort);
      expect(t).toHaveProperty("priority");
    }
  });
});

describe("CampaignROIDecomposition - roiAttributionShift", () => {
  it("returns attribution shift over periods", () => {
    const r = service.roiAttributionShift(C, T);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(C);
    expect(Array.isArray(r!.periods)).toBe(true);
    expect(r!.periods.length).toBe(5);
    for (const p of r!.periods) {
      expect(p).toHaveProperty("period");
      expect(p).toHaveProperty("primaryDriver");
      expect(p).toHaveProperty("primaryDrag");
      expect(p).toHaveProperty("roas");
    }
    expect(typeof r!.shiftTrend).toBe("string");
    expect(typeof r!.recommendation).toBe("string");
  });
});

describe("CampaignROIDecomposition - roiFactorCorrelations", () => {
  it("returns factor correlation matrix", () => {
    const r = service.roiFactorCorrelations(C, T);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
    for (const c of r) {
      expect(c).toHaveProperty("factorA");
      expect(c).toHaveProperty("factorB");
      expect(c).toHaveProperty("correlation");
      expect(["strong", "moderate", "weak"]).toContain(c.strength);
      expect(["positive", "negative"]).toContain(c.direction);
      expect(typeof c.interpretation).toBe("string");
    }
  });
});
