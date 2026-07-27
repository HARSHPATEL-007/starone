import { describe, it, expect } from "vitest";
import { dsAlgorithmService } from "../services/DSAlgorithmService";

describe("Depth 4 - Advanced Data Structures", () => {
  describe("bTreeOperations", () => {
    it("inserts and searches keys", () => {
      const r = dsAlgorithmService.bTreeOperations([
        { action: "insert", key: 10 },
        { action: "insert", key: 20 },
        { action: "insert", key: 5 },
        { action: "search", key: 10 },
        { action: "search", key: 99 },
      ], 3);
      expect(r.type).toBe("bTree");
      expect(r.finalKeys).toContain(10);
      expect(r.finalKeys).toContain(5);
      expect(r.operations[3].found).toBe(true);
      expect(r.operations[4].found).toBe(false);
    });
  });

  describe("kdTreeNearestNeighbor", () => {
    it("finds nearest point to target", () => {
      const r = dsAlgorithmService.kdTreeNearestNeighbor(
        [{ x: 1, y: 2, id: "a" }, { x: 5, y: 5, id: "b" }, { x: 0, y: 1, id: "c" }],
        { x: 0, y: 0 },
      );
      expect(r.type).toBe("kdTree");
      expect(r.nearest!.id).toBe("c");
      expect(r.nodesExplored).toBeGreaterThan(0);
    });

    it("handles empty points", () => {
      const r = dsAlgorithmService.kdTreeNearestNeighbor([], { x: 0, y: 0 });
      expect(r.nearest).toBeNull();
    });
  });

  describe("quadTreeRegionQuery", () => {
    it("returns points within region", () => {
      const r = dsAlgorithmService.quadTreeRegionQuery(
        [{ x: 1, y: 1, id: "a" }, { x: 5, y: 5, id: "b" }, { x: 2, y: 2, id: "c" }],
        { x1: 0, y1: 0, x2: 3, y2: 3 },
      );
      expect(r.type).toBe("quadTree");
      expect(r.count).toBe(2);
    });
  });

  describe("cartesianTreeOperations", () => {
    it("builds min-heap ordered cartesian tree", () => {
      const r = dsAlgorithmService.cartesianTreeOperations([3, 1, 4, 2, 5]);
      expect(r.type).toBe("cartesianTree");
      expect(r.root).toBeGreaterThanOrEqual(0);
      expect(r.tree.length).toBe(5);
    });

    it("handles empty array", () => {
      const r = dsAlgorithmService.cartesianTreeOperations([]);
      expect(r.root).toBe(-1);
    });
  });

  describe("bitArrayOperations", () => {
    it("counts ones, zeros, and parity", () => {
      const r = dsAlgorithmService.bitArrayOperations([1, 0, 1, 1, 0, 0, 1]);
      expect(r.type).toBe("bitArray");
      expect(r.countOnes).toBe(4);
      expect(r.countZeros).toBe(3);
      expect(r.parity).toBe(0);
    });
  });
});

describe("Depth 4 - Advanced Algorithms", () => {
  describe("stoerWagnerMinCut", () => {
    it("computes global minimum cut", () => {
      const r = dsAlgorithmService.stoerWagnerMinCut(
        ["A", "B", "C", "D"],
        [["A", "B", 3], ["B", "C", 4], ["C", "D", 5], ["A", "D", 2], ["B", "D", 1]],
      );
      expect(r.algorithm).toBe("stoerWagner");
      expect(r.minCut).toBeGreaterThanOrEqual(1);
    });
  });

  describe("galeShapleyMatching", () => {
    it("finds stable matching", () => {
      const r = dsAlgorithmService.galeShapleyMatching(
        [{ id: "A", pref: ["X", "Y"] }, { id: "B", pref: ["Y", "X"] }],
        [{ id: "X", pref: ["B", "A"] }, { id: "Y", pref: ["A", "B"] }],
      );
      expect(r.algorithm).toBe("galeShapley");
      expect(r.matches.length).toBe(2);
    });
  });

  describe("pushRelabelMaxFlow", () => {
    it("computes max flow via push-relabel", () => {
      const r = dsAlgorithmService.pushRelabelMaxFlow(
        ["S", "A", "B", "T"],
        [["S", "A", 10], ["S", "B", 5], ["A", "B", 15], ["A", "T", 5], ["B", "T", 10]],
        "S", "T",
      );
      expect(r.algorithm).toBe("pushRelabel");
      expect(r.maxFlow).toBe(15);
    });
  });

  describe("simulatedAnnealing", () => {
    it("optimizes via simulated annealing", () => {
      const r = dsAlgorithmService.simulatedAnnealing(
        [3, 1, 4, 2, 5],
        (sol: number[]) => sol.reduce((s, v, i) => s + Math.abs(v - i), 0),
        10, 0.1, 0.8,
      );
      expect(r.algorithm).toBe("simulatedAnnealing");
      expect(r.bestCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe("beamSearch", () => {
    it("finds path using beam search", () => {
      const expand = (s: string) => {
        const next: Record<string, { state: string; cost: number }[]> = {
          A: [{ state: "B", cost: 2 }, { state: "C", cost: 4 }],
          B: [{ state: "D", cost: 3 }],
          C: [{ state: "D", cost: 1 }],
        };
        return next[s] || [];
      };
      const r = dsAlgorithmService.beamSearch("A", "D", expand, 2);
      expect(r.algorithm).toBe("beamSearch");
      expect(r.path[r.path.length - 1]).toBe("D");
    });
  });

  describe("eulerianPath", () => {
    it("finds Eulerian path when exists", () => {
      const r = dsAlgorithmService.eulerianPath(
        ["A", "B", "C"],
        [["A", "B"], ["B", "C"], ["C", "A"]],
      );
      expect(r.algorithm).toBe("eulerianPath");
      expect(r.hasPath).toBe(true);
      expect(r.path.length).toBe(4);
    });
  });

  describe("chinesePostman", () => {
    it("computes route inspection cost", () => {
      const r = dsAlgorithmService.chinesePostman(
        ["A", "B", "C"],
        [["A", "B", 2], ["B", "C", 3], ["C", "A", 4]],
      );
      expect(r.algorithm).toBe("chinesePostman");
      expect(r.totalCost).toBeGreaterThan(0);
    });
  });
});

describe("Depth 4 - String / DP", () => {
  describe("ahoCorasickSearch", () => {
    it("finds multiple pattern matches", () => {
      const r = dsAlgorithmService.ahoCorasickSearch("hello world hello", ["hello", "world"]);
      expect(r.algorithm).toBe("ahoCorasick");
      expect(r.matches.length).toBe(3);
    });
  });

  describe("burrowsWheelerTransform", () => {
    it("computes BWT and inverse", () => {
      const r = dsAlgorithmService.burrowsWheelerTransform("banana");
      expect(r.algorithm).toBe("burrowsWheeler");
      expect(r.transformed.length).toBe(6);
      expect(r.inverse).toBe("banana");
    });
  });

  describe("needlemanWunschAlignment", () => {
    it("computes global alignment with score", () => {
      const r = dsAlgorithmService.needlemanWunschAlignment("GATTACA", "GCATGCA");
      expect(r.algorithm).toBe("needlemanWunsch");
      expect(r.score).toBeGreaterThan(0);
      expect(r.alignedA.length).toBe(r.alignedB.length);
    });
  });

  describe("minWindowSubstring", () => {
    it("finds minimum window containing all chars", () => {
      const r = dsAlgorithmService.minWindowSubstring("ADOBECODEBANC", "ABC");
      expect(r.algorithm).toBe("minWindowSubstring");
      expect(r.window).toBe("BANC");
      expect(r.found).toBe(true);
    });

    it("returns empty when impossible", () => {
      const r = dsAlgorithmService.minWindowSubstring("abc", "xyz");
      expect(r.found).toBe(false);
    });
  });

  describe("longestPalindromicSubsequence", () => {
    it("finds LPS length and subsequence", () => {
      const r = dsAlgorithmService.longestPalindromicSubsequence("bbbab");
      expect(r.algorithm).toBe("longestPalindromicSubseq");
      expect(r.length).toBe(4);
    });
  });

  describe("balloonBurst", () => {
    it("computes max coins from bursting", () => {
      const r = dsAlgorithmService.balloonBurst([3, 1, 5, 8]);
      expect(r.algorithm).toBe("balloonBurst");
      expect(r.maxCoins).toBeGreaterThan(0);
    });

    it("handles empty array", () => {
      const r = dsAlgorithmService.balloonBurst([]);
      expect(r.maxCoins).toBe(0);
    });
  });

  describe("wildcardMatching", () => {
    it("matches with * and ? wildcards", () => {
      const r = dsAlgorithmService.wildcardMatching("adceb", "*a*b");
      expect(r.algorithm).toBe("wildcardMatching");
      expect(r.matches).toBe(true);
    });

    it("handles pattern with only * that matches everything", () => {
      const r = dsAlgorithmService.wildcardMatching("abc", "*");
      expect(r.matches).toBe(true);
    });
  });
});

describe("Depth 4 - Enhanced Existing", () => {
  describe("persistentSegmentTree", () => {
    it("supports versioned updates and queries", () => {
      const r = dsAlgorithmService.persistentSegmentTree(
        [1, 2, 3, 4, 5],
        [
          { type: "query", l: 0, r: 4 },
          { type: "update", l: 1, r: 3, add: 5 },
          { type: "query", l: 0, r: 4, version: 0 },
          { type: "query", l: 0, r: 4, version: 1 },
        ],
      );
      expect(r.type).toBe("persistentSegmentTree");
      expect(r.versions).toBe(2);
      expect(r.results[0].result).toBe(15);
      expect(r.results[1].result).toBe(15);
      expect(r.results[2].result).toBe(30);
    });
  });

  describe("minMaxHeapOperations", () => {
    it("tracks min and max of inserted values", () => {
      const r = dsAlgorithmService.minMaxHeapOperations([5, 3, 8, 1, 9]);
      expect(r.type).toBe("minMaxHeap");
      expect(r.operations.length).toBe(5);
      expect(r.operations[0].min).toBe(5);
      expect(r.operations[0].max).toBe(5);
      expect(r.operations[4].min).toBe(1);
    });
  });

  describe("orderStatisticTree", () => {
    it("returns sorted order and k-th statistics", () => {
      const r = dsAlgorithmService.orderStatisticTree([5, 3, 8, 1, 9]);
      expect(r.type).toBe("orderStatisticTree");
      expect(r.sorted).toEqual([1, 3, 5, 8, 9]);
      expect(r.orderStats[0].value).toBe(1);
    });
  });

  describe("concurrentLRUCache", () => {
    it("wraps LRU with concurrent semantics", () => {
      const r = dsAlgorithmService.concurrentLRUCache(3, [
        { action: "put", key: "a", value: 1 },
        { action: "put", key: "b", value: 2 },
        { action: "put", key: "c", value: 3 },
        { action: "put", key: "d", value: 4 },
      ]);
      expect(r.type).toBe("concurrentLRU");
      expect(r.operations.length).toBe(4);
    });
  });

  describe("ropeStringOperations", () => {
    it("supports substring, insert, delete", () => {
      const r = dsAlgorithmService.ropeStringOperations("hello world", [
        { action: "substring", start: 0, end: 5 },
        { action: "insert", start: 5, text: " beautiful" },
        { action: "delete", start: 6, end: 16 },
      ]);
      expect(r.type).toBe("ropeString");
      expect(r.operations.length).toBe(3);
      expect(r.operations[0].result).toBe("hello");
      expect(r.result).toContain("hello");
    });
  });
});

describe("Depth 4 - Marketing Depth", () => {
  describe("multiTouchAttribution", () => {
    it("distributes credit using linear model", () => {
      const r = dsAlgorithmService.multiTouchAttribution([
        { channel: "email", interactions: ["email", "social"], converted: true },
        { channel: "social", interactions: ["social"], converted: true },
      ], "linear");
      expect(r.algorithm).toBe("multiTouchAttribution");
      const output = r.output as Record<string, unknown>;
      expect(output.totalConversions).toBe(2);
    });

    it("supports time decay model", () => {
      const r = dsAlgorithmService.multiTouchAttribution([
        { channel: "email", interactions: ["email", "search", "social"], converted: true },
      ], "timeDecay");
      const output = r.output as Record<string, unknown>;
      expect(output.totalConversions).toBe(1);
    });
  });

  describe("budgetSmoothing", () => {
    it("smooths budget values with moving average", () => {
      const r = dsAlgorithmService.budgetSmoothing([100, 200, 150, 300, 250], 3);
      const output = r.output as Record<string, unknown>;
      expect((output.smoothed as number[]).length).toBe(5);
    });
  });

  describe("adFatigueSaturation", () => {
    it("computes response rates and peak", () => {
      const r = dsAlgorithmService.adFatigueSaturation([1000, 2000, 3000, 4000], [100, 150, 180, 200]);
      const output = r.output as Record<string, unknown>;
      expect((output.saturations as number[]).length).toBe(4);
      expect(output.peakIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe("churnHeuristic", () => {
    it("scores users by churn risk", () => {
      const r = dsAlgorithmService.churnHeuristic([
        { id: "u1", daysSinceLastVisit: 300, totalVisits: 2, avgSessionMinutes: 1.5 },
        { id: "u2", daysSinceLastVisit: 5, totalVisits: 50, avgSessionMinutes: 15 },
      ]);
      const output = r.output as Record<string, unknown>;
      expect((output.scores as unknown[]).length).toBe(2);
      expect(output.highRiskCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("chiSquareSignificance", () => {
    it("computes significance test between control and variant", () => {
      const r = dsAlgorithmService.chiSquareSignificance(
        { conversions: 100, total: 1000 },
        { conversions: 150, total: 1000 },
      );
      const output = r.output as Record<string, unknown>;
      expect(output.chiSquared).toBeGreaterThan(0);
      expect(typeof output.significant).toBe("boolean");
    });
  });

  describe("bidLandscapeForecast", () => {
    it("forecasts win rates at different bid levels", () => {
      const r = dsAlgorithmService.bidLandscapeForecast(
        [{ bid: 1.0, won: false }, { bid: 1.5, won: true }, { bid: 2.0, won: true }, { bid: 0.5, won: false }],
        3,
      );
      const output = r.output as Record<string, unknown>;
      expect((output.winRates as unknown[]).length).toBeGreaterThan(0);
      expect(output.suggestedBid).toBeGreaterThan(0);
    });
  });

  describe("incrementalityTest", () => {
    it("computes lift from control vs treatment", () => {
      const r = dsAlgorithmService.incrementalityTest(
        { conversions: 50, exposed: 1000 },
        { conversions: 80, exposed: 1000 },
      );
      const output = r.output as Record<string, unknown>;
      expect(output.lift).toBeGreaterThan(0);
      expect(output.incrementalConversions).toBeGreaterThan(0);
    });
  });

  describe("clvCalculation", () => {
    it("computes customer lifetime value", () => {
      const r = dsAlgorithmService.clvCalculation(50, 12, 0.2, 0.1);
      const output = r.output as Record<string, unknown>;
      expect(output.simpleCLV).toBeGreaterThan(0);
      expect(output.discountedCLV).toBeGreaterThan(0);
    });
  });

  describe("reachFrequencyEstimate", () => {
    it("estimates reach and impressions from budget", () => {
      const r = dsAlgorithmService.reachFrequencyEstimate(10000, 10, 3);
      const output = r.output as Record<string, unknown>;
      expect(output.estimatedImpressions).toBe(1000000);
      expect(output.estimatedReach).toBe(333333);
    });
  });

  describe("marketingMixModel", () => {
    it("computes ROI per channel", () => {
      const r = dsAlgorithmService.marketingMixModel(
        [{ name: "TV", spend: 5000 }, { name: "Digital", spend: 3000 }],
        [15000, 9000],
      );
      const output = r.output as Record<string, unknown>;
      expect((output.channels as unknown[]).length).toBe(2);
      expect(output.overallROI).toBe(2);
    });
  });
});
