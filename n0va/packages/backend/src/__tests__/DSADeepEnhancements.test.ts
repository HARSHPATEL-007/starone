import { describe, it, expect } from "vitest";
import { dsAlgorithmService } from "../services/DSAlgorithmService";

describe("Deep DSA - Advanced Data Structures", () => {
  describe("avlTreeOperations", () => {
    it("inserts and maintains balance", () => {
      const r = dsAlgorithmService.avlTreeOperations([
        { action: "insert", key: 10 }, { action: "insert", key: 20 }, { action: "insert", key: 30 },
        { action: "insert", key: 15 }, { action: "insert", key: 5 },
      ]);
      expect(r.type).toBe("avl");
      expect(r.finalKeys).toEqual([5, 10, 15, 20, 30]);
      expect(r.operations.length).toBe(5);
    });

    it("searches for existing and missing keys", () => {
      const r = dsAlgorithmService.avlTreeOperations([
        { action: "insert", key: 10 }, { action: "insert", key: 20 }, { action: "search", key: 10 }, { action: "search", key: 99 },
      ]);
      expect(r.operations[2].found).toBe(true);
      expect(r.operations[3].found).toBe(false);
    });

    it("deletes keys and rebalances", () => {
      const r = dsAlgorithmService.avlTreeOperations([
        { action: "insert", key: 10 }, { action: "insert", key: 20 }, { action: "insert", key: 30 },
        { action: "delete", key: 20 },
      ]);
      expect(r.finalKeys).toEqual([10, 30]);
    });
  });

  describe("dequeSlidingWindow", () => {
    it("computes sliding window max/min", () => {
      const r = dsAlgorithmService.dequeSlidingWindow([1, 3, -1, -3, 5, 3, 6, 7], 3);
      expect(r.type).toBe("dequeSlidingWindow");
      expect(r.operations.length).toBe(8);
    });
  });

  describe("sparseTableRangeQueries", () => {
    it("computes range min queries", () => {
      const r = dsAlgorithmService.sparseTableRangeQueries([4, 2, 7, 1, 9, 3, 8, 5], [{ l: 1, r: 4, type: "min" }, { l: 0, r: 7, type: "min" }]);
      expect(r.type).toBe("sparseTable");
      expect(r.operations.length).toBe(2);
      expect(r.operations[0].result).toBe(1);
      expect(r.operations[1].result).toBe(1);
    });
  });

  describe("countingBloomFilter", () => {
    it("adds, tests, and removes items", () => {
      const r = dsAlgorithmService.countingBloomFilter([
        { item: "user_1", action: "add" }, { item: "user_2", action: "add" },
        { item: "user_1", action: "test" }, { item: "user_3", action: "test" },
        { item: "user_1", action: "remove" }, { item: "user_1", action: "test" },
      ]);
      expect(r.operations.length).toBe(6);
      expect(r.operations[2].probablyPresent).toBe(true);
    });
  });

  describe("priorityQueueDecreaseKey", () => {
    it("supports push, pop, and decrease-key", () => {
      const r = dsAlgorithmService.priorityQueueDecreaseKey([
        { action: "push", key: "a", priority: 5 }, { action: "push", key: "b", priority: 3 },
        { action: "push", key: "c", priority: 8 }, { action: "decrease-key", key: "c", priority: 2 },
        { action: "pop" }, { action: "pop" },
      ]);
      expect(r.type).toBe("decreaseKeyPQ");
      expect(r.operations.length).toBe(6);
      expect(r.operations[3].action).toBe("decrease-key");
    });
  });

  describe("rollbackDsuOperations", () => {
    it("tracks union and query operations", () => {
      const r = dsAlgorithmService.rollbackDsuOperations([
        { action: "union", a: "a", b: "b" }, { action: "union", a: "b", b: "c" },
        { action: "query", a: "a", b: "c" }, { action: "query", a: "a", b: "d" },
      ]);
      expect(r.type).toBe("rollbackDsu");
      expect(r.finalSets).toBeGreaterThan(0);
    });
  });
});

describe("Deep DSA - Advanced Graph Algorithms", () => {
  describe("bellmanFord", () => {
    it("finds shortest paths with negative edges", () => {
      const r = dsAlgorithmService.bellmanFord(["A", "B", "C", "D"], [["A", "B", 4], ["A", "C", 3], ["B", "C", -2], ["B", "D", 2], ["C", "D", 3]], "A");
      expect(r.distances["A"]).toBe(0);
      expect(r.distances["C"]).toBeLessThanOrEqual(2);
      expect(r.hasNegativeCycle).toBe(false);
    });

    it("detects negative cycles", () => {
      const r = dsAlgorithmService.bellmanFord(["A", "B", "C"], [["A", "B", 1], ["B", "C", -2], ["C", "A", -1]], "A");
      expect(r.hasNegativeCycle).toBe(true);
    });
  });

  describe("floydWarshall", () => {
    it("computes all-pairs shortest paths", () => {
      const r = dsAlgorithmService.floydWarshall(["A", "B", "C"], [["A", "B", 3], ["B", "C", 2], ["A", "C", 10]]);
      expect(r.distances[0][2]).toBeLessThanOrEqual(5);
    });
  });

  describe("kruskalMst", () => {
    it("finds minimum spanning tree", () => {
      const r = dsAlgorithmService.kruskalMst(["A", "B", "C", "D"], [["A", "B", 4], ["B", "C", 2], ["C", "D", 5], ["A", "D", 8], ["A", "C", 1]]);
      expect(r.totalWeight).toBe(8);
      expect(r.mstEdges.length).toBe(3);
    });
  });

  describe("maxFlowEdmondsKarp", () => {
    it("computes max flow", () => {
      const r = dsAlgorithmService.maxFlowEdmondsKarp(["S", "A", "B", "T"], [["S", "A", 10], ["S", "B", 5], ["A", "B", 15], ["A", "T", 5], ["B", "T", 10]], "S", "T");
      expect(r.maxFlow).toBe(15);
    });
  });

  describe("aStarSearch", () => {
    it("finds path using heuristic", () => {
      const r = dsAlgorithmService.aStarSearch(["A", "B", "C", "D", "E"], [["A", "B", 2], ["B", "C", 3], ["A", "C", 6], ["C", "D", 1], ["D", "E", 2]], "A", "E", { A: 4, B: 3, C: 2, D: 1, E: 0 });
      expect(r.path.length).toBeGreaterThan(0);
      expect(r.path[0]).toBe("A");
      expect(r.path[r.path.length - 1]).toBe("E");
    });
  });

  describe("tarjanScc", () => {
    it("finds strongly connected components", () => {
      const r = dsAlgorithmService.tarjanScc(["A", "B", "C", "D", "E"], [["A", "B"], ["B", "A"], ["B", "C"], ["C", "D"], ["D", "C"], ["C", "E"]]);
      expect(r.sccCount).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("Deep DSA - String / DP", () => {
  describe("manacherLongestPalindrome", () => {
    it("finds longest palindrome", () => {
      const r = dsAlgorithmService.manacherLongestPalindrome("babad");
      expect(r.length).toBeGreaterThanOrEqual(3);
      expect(r.longestPalindrome.length).toBe(r.length);
    });
  });

  describe("suffixArrayLcp", () => {
    it("computes suffix array and LCP", () => {
      const r = dsAlgorithmService.suffixArrayLcp("banana");
      expect(r.suffixArray.length).toBe(6);
      expect(r.lcpArray.length).toBe(5);
      expect(r.uniqueSubstrings).toBeGreaterThan(0);
    });
  });

  describe("matrixChainMultiplication", () => {
    it("computes minimum operations", () => {
      const r = dsAlgorithmService.matrixChainMultiplication([10, 20, 30, 40]);
      expect(r.output.minOps).toBeGreaterThan(0);
    });
  });

  describe("editDistanceFull", () => {
    it("returns full alignment", () => {
      const r = dsAlgorithmService.editDistanceFull("kitten", "sitting");
      expect(r.distance).toBe(3);
      expect(r.alignment.length).toBeGreaterThan(0);
    });
  });
});

describe("Deep DSA - Marketing-Specific", () => {
  describe("pidBudgetPacing", () => {
    it("computes PID adjustment", () => {
      const r = dsAlgorithmService.pidBudgetPacing(80, 100, { spend: [70, 75, 80], kp: 0.5, ki: 0.1, kd: 0.05 });
      expect(r.algorithm).toBe("pidBudgetPacing");
      expect(r.output.pacingRate).toBeGreaterThan(0);
    });
  });

  describe("shapleyValueAttribution", () => {
    it("distributes credit across channels", () => {
      const r = dsAlgorithmService.shapleyValueAttribution(["email", "social", "search"], [
        { channel: "email", value: 100, interactions: ["email"] },
        { channel: "social", value: 200, interactions: ["social", "search"] },
      ]);
      expect(r.channelCount).toBe(3);
      expect(Object.keys(r.output).length).toBe(3);
      expect(r.totalValue).toBe(300);
    });
  });

  describe("minCostFlowAllocation", () => {
    it("allocates budget minimizing cost", () => {
      const r = dsAlgorithmService.minCostFlowAllocation(100, ["A", "B"], [["A", "B", 2, 100]]);
      expect(r.algorithm).toBe("minCostFlow");
      expect(r.output.utilizedBudget).toBeGreaterThan(0);
    });
  });

  describe("slidingWindowFrequencyCap", () => {
    it("blocks events exceeding cap", () => {
      const now = Date.now();
      const r = dsAlgorithmService.slidingWindowFrequencyCap([
        { timestamp: now, id: "u1" }, { timestamp: now + 100, id: "u1" }, { timestamp: now + 200, id: "u1" },
      ], 1000, 2);
      expect(r.output.blocked).toBe(1);
      expect(r.output.allowed).toBe(2);
    });
  });

  describe("jaccardAudienceOverlap", () => {
    it("computes pairwise Jaccard similarity", () => {
      const r = dsAlgorithmService.jaccardAudienceOverlap([
        { name: "SegA", members: ["a", "b", "c", "d"] },
        { name: "SegB", members: ["c", "d", "e", "f"] },
      ]);
      expect(r.output.pairs.length).toBe(1);
      expect(r.output.pairs[0].jaccard).toBeGreaterThan(0);
    });
  });

  describe("cosineSimilarityLookalike", () => {
    it("scores candidates by similarity", () => {
      const r = dsAlgorithmService.cosineSimilarityLookalike([1, 0, 1], [
        { id: "u1", features: [1, 0, 1] }, { id: "u2", features: [0, 1, 0] },
      ]);
      expect(r.output.scores.length).toBe(2);
      expect(r.output.scores[0].similarity).toBeGreaterThan(r.output.scores[1].similarity);
    });
  });

  describe("exponentialSmoothingForecast", () => {
    it("produces forecast with error metrics", () => {
      const r = dsAlgorithmService.exponentialSmoothingForecast([10, 12, 15, 14, 18], 0.3, 0.1, 3);
      expect(r.output.forecast.length).toBe(3);
      expect(r.output.mse).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("Deep DSA - Enhanced Existing DS", () => {
  describe("trieEnhanced", () => {
    it("supports autocomplete, delete, longestPrefix", () => {
      const r = dsAlgorithmService.trieEnhanced(["hello", "help", "world", "health", "hell"], [
        { action: "search", param: "hello" }, { action: "startsWith", param: "hel" },
        { action: "autocomplete", param: "hel" }, { action: "longestPrefix", param: "hello" },
      ]);
      expect(r.operations[0].result).toBe(true);
      expect(r.operations[1].result).toBe(true);
      expect(Array.isArray(r.operations[2].result)).toBe(true);
      expect(typeof r.operations[3].result).toBe("string");
    });
  });

  describe("segmentTreeLazy", () => {
    it("applies range updates and range queries", () => {
      const r = dsAlgorithmService.segmentTreeLazy([1, 2, 3, 4, 5],
        [{ l: 1, r: 3, add: 5 }],
        [{ l: 0, r: 4 }],
      );
      expect(r.type).toBe("segmentLazy");
      expect(r.queries[0].result).toBe(30);
    });
  });

  describe("fenwick2D", () => {
    it("computes 2D range sums", () => {
      const r = dsAlgorithmService.fenwick2D([[1, 2, 3], [4, 5, 6], [7, 8, 9]], [{ x1: 0, y1: 0, x2: 1, y2: 1 }]);
      expect(r.type).toBe("fenwick2D");
      expect(r.queries[0].result).toBe(12);
    });
  });

  describe("bidirectionalDijkstra", () => {
    it("finds path faster with bidirectional search", () => {
      const r = dsAlgorithmService.bidirectionalDijkstra(["A", "B", "C", "D", "E"],
        [["A", "B", 2], ["B", "C", 3], ["C", "D", 1], ["D", "E", 4], ["A", "E", 12]], "A", "E");
      expect(r.path.length).toBeGreaterThan(0);
      expect(r.path[0]).toBe("A");
      expect(r.path[r.path.length - 1]).toBe("E");
    });
  });
});
