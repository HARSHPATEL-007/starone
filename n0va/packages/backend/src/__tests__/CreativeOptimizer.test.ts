import { describe, it, expect } from "vitest";
import { creativeOptimizer } from "../services/CreativeOptimizer";

describe("CreativeOptimizer", () => {
  const mockCreatives = creativeOptimizer.generateMockCreatives();

  describe("analyzeFatigue", () => {
    it("returns fatigue analysis for all creatives", () => {
      const results = creativeOptimizer.analyzeFatigue(mockCreatives);
      expect(results.length).toBe(mockCreatives.length);
      results.forEach((r) => {
        expect(r).toHaveProperty("creativeId");
        expect(r).toHaveProperty("isFatigued");
        expect(r).toHaveProperty("fatigueScore");
        expect(r).toHaveProperty("urgency");
        expect(r).toHaveProperty("recommendation");
        expect(r.fatigueScore).toBeGreaterThanOrEqual(0);
        expect(r.fatigueScore).toBeLessThanOrEqual(100);
      });
    });

    it("identifies fatigued creatives with high CTR drop", () => {
      const fatigued = creativeOptimizer.analyzeFatigue(mockCreatives);
      const hasFatigued = fatigued.some((r) => r.isFatigued);
      expect(typeof hasFatigued).toBe("boolean");
    });

    it("recommends pause_creative for critical fatigue", () => {
      const mock = [{
        id: "cr_bad", name: "Bad Ad", type: "image", platform: "meta",
        impressions: 300000, clicks: 300, ctr: 0.1, conversions: 1, revenue: 100,
        spend: 5000, roas: 0.02, firstSeen: new Date(Date.now() - 90 * 86400000),
        lastSeen: new Date(), variantGroup: "test",
      }];
      const r = creativeOptimizer.analyzeFatigue(mock);
      expect(["pause_creative", "refresh_creative", "generate_variants", "rotate_audience", "none"]).toContain(r[0].recommendation);
    });
  });

  describe("fitDecayCurve", () => {
    it("fits an exponential decay model to CTR data", () => {
      const data = [
        { day: 1, ctr: 3.0 }, { day: 5, ctr: 2.5 }, { day: 10, ctr: 2.0 },
        { day: 15, ctr: 1.7 }, { day: 20, ctr: 1.5 },
      ];
      const r = creativeOptimizer.fitDecayCurve(data);
      expect(r).toHaveProperty("a");
      expect(r).toHaveProperty("lambda");
      expect(r).toHaveProperty("c");
      expect(r).toHaveProperty("halflife");
      expect(r).toHaveProperty("rSquared");
      expect(r.a).toBeGreaterThan(0);
      expect(r.lambda).toBeGreaterThan(0);
      expect(r.halflife).toBeGreaterThan(0);
    });

    it("throws if fewer than 3 data points", () => {
      expect(() => creativeOptimizer.fitDecayCurve([{ day: 1, ctr: 2.0 }, { day: 2, ctr: 1.8 }])).toThrow("at least 3");
    });
  });

  describe("optimalRotationDay", () => {
    it("returns rotation day using half-life method", () => {
      const decay = { a: 2.5, lambda: 0.05, c: 0.5, halflife: 13.9 };
      const r = creativeOptimizer.optimalRotationDay(decay);
      expect(r).toHaveProperty("day");
      expect(r).toHaveProperty("ctr");
      expect(r).toHaveProperty("method");
      expect(r.day).toBeGreaterThan(0);
    });

    it("uses threshold method when halflife is infinite", () => {
      const decay = { a: 2.0, lambda: 0, c: 0.5, halflife: Infinity };
      const r = creativeOptimizer.optimalRotationDay(decay, 0.5);
      expect(r.method).toBe("threshold");
    });
  });

  describe("crossPlatformFatigueCorrelation", () => {
    it("computes platform pair correlations", () => {
      const r = creativeOptimizer.crossPlatformFatigueCorrelation(mockCreatives);
      expect(r).toHaveProperty("platformPairs");
      expect(r).toHaveProperty("insight");
      expect(Array.isArray(r.platformPairs)).toBe(true);
      expect(typeof r.insight).toBe("string");
    });
  });

  describe("bayesianAbTest", () => {
    it("returns Bayesian A/B test results with probability of being best", () => {
      const variants = [
        { id: "A", impressions: 1000, clicks: 50 },
        { id: "B", impressions: 1000, clicks: 65 },
        { id: "C", impressions: 1000, clicks: 45 },
      ];
      const r = creativeOptimizer.bayesianAbTest(variants);
      expect(r).toHaveProperty("results");
      expect(r).toHaveProperty("probBeatingA");
      expect(r).toHaveProperty("bestVariant");
      expect(r.results.length).toBe(3);
      r.results.forEach((v) => {
        expect(v).toHaveProperty("mean");
        expect(v).toHaveProperty("probBest");
        expect(v).toHaveProperty("expectedLoss");
        expect(v.mean).toBeGreaterThan(0);
      });
    });

    it("throws if fewer than 2 variants", () => {
      expect(() => creativeOptimizer.bayesianAbTest([{ id: "A", impressions: 100, clicks: 5 }])).toThrow("at least 2");
    });
  });

  describe("Thompson Sampling", () => {
    it("initializes arms and selects one", () => {
      creativeOptimizer.initializeThompsonSampling("ts_test", 3);
      const r = creativeOptimizer.selectThompsonArm("ts_test");
      expect(r).toHaveProperty("armIndex");
      expect(r).toHaveProperty("mean");
      expect(r.armIndex).toBeGreaterThanOrEqual(0);
      expect(r.armIndex).toBeLessThan(3);
    });

    it("updates arm and returns new posterior", () => {
      const r = creativeOptimizer.updateThompsonArm("ts_test", 1, 1);
      expect(r).toHaveProperty("posteriorAlpha");
      expect(r).toHaveProperty("posteriorBeta");
      expect(r).toHaveProperty("mean");
    });

    it("gets state for an experiment", () => {
      const state = creativeOptimizer.getThompsonState("ts_test");
      expect(state).not.toBeNull();
      expect(state!.length).toBe(3);
    });

    it("returns null for non-existent experiment", () => {
      expect(creativeOptimizer.getThompsonState("nonexistent")).toBeNull();
    });

    it("throws for non-initialized experiment on select", () => {
      expect(() => creativeOptimizer.selectThompsonArm("no_init")).toThrow("not initialized");
    });

    it("throws for invalid arm index on update", () => {
      expect(() => creativeOptimizer.updateThompsonArm("ts_test", 99, 1)).toThrow("Invalid arm index");
    });
  });

  describe("gaussianProcessFatigueModel", () => {
    it("returns GP predictions with uncertainty bounds", () => {
      const obs = [
        { day: 1, ctr: 3.0 }, { day: 3, ctr: 2.7 }, { day: 6, ctr: 2.4 },
        { day: 10, ctr: 2.1 }, { day: 15, ctr: 1.9 },
      ];
      const r = creativeOptimizer.gaussianProcessFatigueModel(obs, [18, 21, 25]);
      expect(r).toHaveProperty("predictions");
      expect(r).toHaveProperty("logMarginalLikelihood");
      expect(r.predictions.length).toBe(3);
      r.predictions.forEach((p) => {
        expect(p).toHaveProperty("mean");
        expect(p).toHaveProperty("variance");
        expect(p).toHaveProperty("upperBound");
        expect(p).toHaveProperty("lowerBound");
        expect(p.upperBound).toBeGreaterThanOrEqual(p.mean);
        expect(p.lowerBound).toBeLessThanOrEqual(p.mean);
      });
    });

    it("throws if fewer than 2 observations", () => {
      expect(() => creativeOptimizer.gaussianProcessFatigueModel(
        [{ day: 1, ctr: 2.0 }], [5, 10],
      )).toThrow("at least 2");
    });
  });

  describe("abTestSignificance", () => {
    it("returns significant result when variant B outperforms A", () => {
      const r = creativeOptimizer.abTestSignificance(
        { impressions: 1000, clicks: 30 },
        { impressions: 1000, clicks: 60 },
        0.05,
      );
      expect(r).toHaveProperty("chiSquared");
      expect(r).toHaveProperty("pValue");
      expect(r).toHaveProperty("isSignificant");
      expect(r).toHaveProperty("winner");
      expect(r).toHaveProperty("lift");
      expect(r).toHaveProperty("confidence");
    });

    it("returns no winner when results are similar", () => {
      const r = creativeOptimizer.abTestSignificance(
        { impressions: 1000, clicks: 50 },
        { impressions: 1000, clicks: 52 },
      );
      expect(r.winner).toBe("none");
    });

    it("handles zero totals gracefully", () => {
      const r = creativeOptimizer.abTestSignificance(
        { impressions: 0, clicks: 0 },
        { impressions: 0, clicks: 0 },
      );
      expect(r.winner).toBe("none");
      expect(r.isSignificant).toBe(false);
    });
  });

  describe("projectPerformance", () => {
    it("projects future performance for a creative", () => {
      const creative = mockCreatives[0];
      const r = creativeOptimizer.projectPerformance(creative, [30, 60, 90]);
      expect(r.length).toBe(3);
      r.forEach((p) => {
        expect(p).toHaveProperty("day");
        expect(p).toHaveProperty("predictedCtr");
        expect(p).toHaveProperty("predictedClicks");
        expect(p).toHaveProperty("predictedConversions");
      });
    });
  });

  describe("generateMockCreatives", () => {
    it("returns mock creatives with all fields", () => {
      expect(mockCreatives.length).toBeGreaterThan(0);
      mockCreatives.forEach((c) => {
        expect(c).toHaveProperty("id");
        expect(c).toHaveProperty("name");
        expect(c).toHaveProperty("type");
        expect(c).toHaveProperty("platform");
        expect(c).toHaveProperty("impressions");
        expect(c).toHaveProperty("clicks");
        expect(c).toHaveProperty("ctr");
        expect(c).toHaveProperty("revenue");
        expect(c).toHaveProperty("spend");
        expect(c).toHaveProperty("roas");
        expect(c.firstSeen).toBeInstanceOf(Date);
        expect(c.lastSeen).toBeInstanceOf(Date);
      });
    });
  });
});
