import { describe, it, expect } from "vitest";
import { DecisionEngine } from "../business-logic/DecisionEngine";

const engine = new DecisionEngine();

describe("DecisionEngine", () => {
  describe("band", () => {
    it("returns excellent for score >= 90", () => {
      expect(engine.band(95)).toBe("excellent");
      expect(engine.band(90)).toBe("excellent");
    });
    it("returns good for score 70-89", () => {
      expect(engine.band(85)).toBe("good");
      expect(engine.band(70)).toBe("good");
    });
    it("returns fair for score 50-69", () => {
      expect(engine.band(60)).toBe("fair");
      expect(engine.band(50)).toBe("fair");
    });
    it("returns poor for score 25-49", () => {
      expect(engine.band(30)).toBe("poor");
      expect(engine.band(25)).toBe("poor");
    });
    it("returns critical for score < 25", () => {
      expect(engine.band(10)).toBe("critical");
      expect(engine.band(0)).toBe("critical");
    });
    it("accepts custom thresholds", () => {
      expect(engine.band(80, { excellent: 80, good: 60, fair: 40, poor: 20 })).toBe("excellent");
      expect(engine.band(50, { excellent: 80, good: 60, fair: 40, poor: 20 })).toBe("fair");
    });
  });

  describe("label", () => {
    it("returns capitalized label for each band", () => {
      expect(engine.label("excellent")).toBe("Excellent");
      expect(engine.label("good")).toBe("Good");
      expect(engine.label("fair")).toBe("Fair");
      expect(engine.label("poor")).toBe("Poor");
      expect(engine.label("critical")).toBe("Critical");
    });
  });

  describe("weightedScore", () => {
    it("computes weighted average correctly", () => {
      const result = engine.weightedScore([
        { value: 100, weight: 2 },
        { value: 50, weight: 1 },
      ]);
      expect(result).toBe(83.33);
    });
    it("clamps values to min/max", () => {
      const result = engine.weightedScore([
        { value: 150, weight: 1, max: 100 },
        { value: -10, weight: 1, min: 0 },
      ]);
      expect(result).toBe(50);
    });
    it("returns 0 for zero weight sum", () => {
      expect(engine.weightedScore([])).toBe(0);
    });
  });

  describe("sigmoid", () => {
    it("returns ~0.5 at midpoint", () => {
      const result = engine.sigmoid(0, 0, 1);
      expect(result).toBeCloseTo(0.5, 1);
    });
    it("approaches 1 for large positive x", () => {
      expect(engine.sigmoid(10, 0, 1)).toBeCloseTo(1, 3);
    });
    it("approaches 0 for large negative x", () => {
      expect(engine.sigmoid(-10, 0, 1)).toBeCloseTo(0, 3);
    });
  });

  describe("percentileRank", () => {
    it("returns 50 for empty array", () => {
      expect(engine.percentileRank([], 100)).toBe(50);
    });
    it("returns correct percentile", () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      expect(engine.percentileRank(values, 50)).toBe(40);
      expect(engine.percentileRank(values, 100)).toBe(90);
      expect(engine.percentileRank(values, 5)).toBe(0);
    });
  });

  describe("zScore", () => {
    it("returns 0 when value equals mean", () => {
      expect(engine.zScore(100, 100, 10)).toBe(0);
    });
    it("returns positive z-score for value above mean", () => {
      expect(engine.zScore(120, 100, 10)).toBe(2);
    });
    it("returns 0 for zero standard deviation", () => {
      expect(engine.zScore(100, 100, 0)).toBe(0);
    });
  });

  describe("normalCdf", () => {
    it("returns ~0.5 at x=0", () => {
      expect(engine.normalCdf(0)).toBeCloseTo(0.5, 1);
    });
    it("returns near 1 for large x", () => {
      expect(engine.normalCdf(5)).toBeGreaterThan(0.999);
    });
    it("returns near 0 for large negative x", () => {
      expect(engine.normalCdf(-5)).toBeLessThan(0.001);
    });
  });

  describe("scoreAndBand", () => {
    it("returns object with score, band, and label", () => {
      const result = engine.scoreAndBand("test-item", 85);
      expect(result.item).toBe("test-item");
      expect(result.score).toBe(85);
      expect(result.band).toBe("good");
      expect(result.label).toBe("Good");
    });
  });

  describe("cagr", () => {
    it("returns correct CAGR", () => {
      const result = engine.cagr(100, 200, 3);
      expect(result).toBeCloseTo(0.2599, 2);
    });
    it("returns 0 for invalid inputs", () => {
      expect(engine.cagr(0, 100, 3)).toBe(0);
      expect(engine.cagr(100, 200, 0)).toBe(0);
    });
  });

  describe("movingAverage", () => {
    it("computes simple moving average", () => {
      const result = engine.movingAverage([1, 2, 3, 4, 5, 6], 3);
      expect(result.length).toBe(6);
      expect(result[2]).toBeCloseTo(2, 0);
      expect(result[5]).toBeCloseTo(5, 0);
    });
  });

  describe("forecastLinear", () => {
    it("returns flat forecast for single value", () => {
      const result = engine.forecastLinear([100], 3);
      expect(result.values).toEqual([100, 100, 100]);
      expect(result.slope).toBe(0);
    });
    it("computes linear forecast for trend", () => {
      const result = engine.forecastLinear([10, 20, 30, 40], 2);
      expect(result.values.length).toBe(2);
      expect(result.values[0]).toBeGreaterThan(40);
      expect(result.slope).toBeGreaterThan(0);
      expect(result.rSquared).toBeGreaterThan(0.9);
    });
    it("returns zero values for negative forecast", () => {
      const result = engine.forecastLinear([100, 50, 0], 2);
      expect(result.values.every((v) => v >= 0)).toBe(true);
    });
  });

  describe("hhi", () => {
    it("returns 10000 for monopoly", () => {
      expect(engine.hhi([100])).toBe(10000);
    });
    it("returns lower values for diversified shares", () => {
      const monopoly = engine.hhi([100]);
      const diversified = engine.hhi([25, 25, 25, 25]);
      expect(diversified).toBeLessThan(monopoly);
    });
    it("returns 0 for empty or zero shares", () => {
      expect(engine.hhi([])).toBe(0);
      expect(engine.hhi([0, 0])).toBe(0);
    });
  });

  describe("gini", () => {
    it("returns 0 for perfect equality", () => {
      expect(engine.gini([100, 100, 100])).toBe(0);
    });
    it("returns positive value for inequality", () => {
      expect(engine.gini([1, 100])).toBeGreaterThan(0);
    });
    it("returns 0 for empty or zero values", () => {
      expect(engine.gini([])).toBe(0);
      expect(engine.gini([0, 0])).toBe(0);
    });
  });

  describe("comparePeriods", () => {
    it("compares two period values", () => {
      const result = engine.comparePeriods(
        { revenue: 200, clicks: 100 },
        { revenue: 100, clicks: 80 },
        ["revenue", "clicks"]
      );
      expect(result[0].field).toBe("revenue");
      expect(result[0].changePercent).toBe(100);
      expect(result[0].direction).toBe("up");
      expect(result[1].field).toBe("clicks");
      expect(result[1].direction).toBe("up");
    });
    it("handles zero prior value", () => {
      const result = engine.comparePeriods(
        { revenue: 100 },
        { revenue: 0 },
        ["revenue"]
      );
      expect(result[0].changePercent).toBe(0);
    });
    it("marks stable when change <= 10%", () => {
      const result = engine.comparePeriods(
        { metric: 105 },
        { metric: 100 },
        ["metric"]
      );
      expect(result[0].direction).toBe("stable");
    });
  });
});
