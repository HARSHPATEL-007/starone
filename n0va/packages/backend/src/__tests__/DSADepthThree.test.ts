import { describe, it, expect } from "vitest";
import { dsAlgorithmService } from "../services/DSAlgorithmService";

describe("Depth 3 - Deeper Data Structures", () => {
  describe("skipListOperations", () => {
    it("inserts and searches for keys", () => {
      const r = dsAlgorithmService.skipListOperations([
        { action: "insert", key: 10, value: "a" },
        { action: "insert", key: 20, value: "b" },
        { action: "insert", key: 5, value: "c" },
        { action: "search", key: 10 },
        { action: "search", key: 99 },
      ]);
      expect(r.type).toBe("skipList");
      expect(r.operations.length).toBe(5);
      expect(r.operations[3].found).toBe(true);
      expect(r.operations[4].found).toBe(false);
    });

    it("deletes keys", () => {
      const r = dsAlgorithmService.skipListOperations([
        { action: "insert", key: 10 },
        { action: "insert", key: 20 },
        { action: "delete", key: 10 },
        { action: "search", key: 10 },
      ]);
      expect(r.operations[3].found).toBe(false);
    });
  });

  describe("redBlackTreeOperations", () => {
    it("inserts and maintains sorted order", () => {
      const r = dsAlgorithmService.redBlackTreeOperations([
        { action: "insert", key: 10 },
        { action: "insert", key: 20 },
        { action: "insert", key: 30 },
        { action: "insert", key: 5 },
        { action: "insert", key: 15 },
      ]);
      expect(r.type).toBe("redBlackTree");
      expect(r.finalKeys).toEqual([5, 10, 15, 20, 30]);
      expect(r.operations.length).toBe(5);
    });

    it("searches for existing and missing keys", () => {
      const r = dsAlgorithmService.redBlackTreeOperations([
        { action: "insert", key: 10 },
        { action: "search", key: 10 },
        { action: "search", key: 99 },
      ]);
      expect(r.operations[1].found).toBe(true);
      expect(r.operations[2].found).toBe(false);
    });
  });

  describe("intervalTreeOperations", () => {
    it("finds overlapping intervals", () => {
      const r = dsAlgorithmService.intervalTreeOperations(
        [
          { low: 1, high: 5, id: "A" },
          { low: 3, high: 8, id: "B" },
          { low: 10, high: 15, id: "C" },
        ],
        [{ low: 4, high: 6 }, { low: 12, high: 14 }],
      );
      expect(r.type).toBe("intervalTree");
      expect(r.intervals).toBe(3);
      expect(r.queryResults.length).toBe(2);
      expect(r.queryResults[0].overlapping.length).toBe(2);
      expect(r.queryResults[1].overlapping.length).toBe(1);
    });
  });

  describe("treapOperations", () => {
    it("inserts and searches", () => {
      const r = dsAlgorithmService.treapOperations([
        { action: "insert", key: 10 },
        { action: "insert", key: 20 },
        { action: "insert", key: 5 },
        { action: "search", key: 10 },
        { action: "search", key: 99 },
      ]);
      expect(r.type).toBe("treap");
      expect(r.finalKeys).toEqual([5, 10, 20]);
      expect(r.operations[3].found).toBe(true);
      expect(r.operations[4].found).toBe(false);
    });

    it("deletes keys", () => {
      const r = dsAlgorithmService.treapOperations([
        { action: "insert", key: 10 },
        { action: "insert", key: 20 },
        { action: "delete", key: 10 },
        { action: "search", key: 10 },
      ]);
      expect(r.operations[3].found).toBe(false);
      expect(r.finalKeys).toEqual([20]);
    });
  });

  describe("fibonacciHeapOperations", () => {
    it("inserts and extracts min", () => {
      const r = dsAlgorithmService.fibonacciHeapOperations([
        { action: "insert", key: 10, value: "a" },
        { action: "insert", key: 5, value: "b" },
        { action: "insert", key: 15, value: "c" },
        { action: "extract-min" },
        { action: "extract-min" },
      ]);
      expect(r.type).toBe("fibonacciHeap");
      expect(r.operations.length).toBe(5);
      expect(r.operations[3].key).toBe(5);
      expect(r.operations[4].key).toBe(10);
    });

    it("handles empty extract-min", () => {
      const r = dsAlgorithmService.fibonacciHeapOperations([
        { action: "extract-min" },
      ]);
      expect(r.operations[0].key).toBeUndefined();
    });
  });

  describe("radixTreeOperations", () => {
    it("inserts words and searches", () => {
      const r = dsAlgorithmService.radixTreeOperations(
        ["apple", "app", "apricot", "banana"],
        ["apple", "app", "apt", "banana"],
      );
      expect(r.type).toBe("radixTree");
      expect(r.words).toBe(4);
      expect(r.searchResults[0].found).toBe(true);
      expect(r.searchResults[1].found).toBe(true);
      expect(r.searchResults[2].found).toBe(false);
      expect(r.searchResults[3].found).toBe(true);
    });
  });
});

describe("Depth 3 - Deeper Algorithms", () => {
  describe("dinicMaxFlow", () => {
    it("computes max flow", () => {
      const r = dsAlgorithmService.dinicMaxFlow(
        ["S", "A", "B", "T"],
        [["S", "A", 10], ["S", "B", 5], ["A", "B", 15], ["A", "T", 5], ["B", "T", 10]],
        "S", "T",
      );
      expect(r.algorithm).toBe("dinic");
      expect(r.maxFlow).toBe(15);
      expect(r.flowEdges.length).toBeGreaterThan(0);
    });

    it("returns zero flow for disconnected graph", () => {
      const r = dsAlgorithmService.dinicMaxFlow(
        ["S", "A", "T"],
        [["S", "A", 10]],
        "S", "T",
      );
      expect(r.maxFlow).toBe(0);
    });
  });

  describe("hungarianAlgorithm", () => {
    it("finds minimum cost assignment", () => {
      const r = dsAlgorithmService.hungarianAlgorithm([
        [4, 2, 8],
        [3, 6, 9],
        [5, 7, 1],
      ]);
      expect(r.algorithm).toBe("hungarian");
      expect(r.assignment.length).toBeGreaterThan(0);
      expect(r.cost).toBeGreaterThan(0);
    });

    it("handles empty matrix", () => {
      const r = dsAlgorithmService.hungarianAlgorithm([]);
      expect(r.cost).toBe(0);
      expect(r.assignment).toEqual([]);
    });
  });

  describe("hopcroftKarpBipartite", () => {
    it("finds maximum matching", () => {
      const r = dsAlgorithmService.hopcroftKarpBipartite(
        ["U1", "U2", "U3"],
        ["V1", "V2", "V3"],
        [["U1", "V1"], ["U1", "V2"], ["U2", "V2"], ["U2", "V3"], ["U3", "V3"]],
      );
      expect(r.algorithm).toBe("hopcroftKarp");
      expect(r.cardinality).toBeGreaterThanOrEqual(2);
    });
  });

  describe("johnsonsAlgorithm", () => {
    it("computes all-pairs shortest paths", () => {
      const r = dsAlgorithmService.johnsonsAlgorithm(
        ["A", "B", "C"],
        [["A", "B", 3], ["B", "C", 2], ["A", "C", 10]],
      );
      expect(r.algorithm).toBe("johnson");
      expect(r.hasNegativeCycle).toBe(false);
      expect(r.distances.length).toBe(3);
      expect(r.distances[0][2]).toBeLessThanOrEqual(5);
    });

    it("detects negative cycles", () => {
      const r = dsAlgorithmService.johnsonsAlgorithm(
        ["A", "B", "C"],
        [["A", "B", 1], ["B", "C", -3], ["C", "A", -1]],
      );
      expect(r.hasNegativeCycle).toBe(true);
    });
  });

  describe("medianOfMedians", () => {
    it("finds k-th smallest element", () => {
      const r = dsAlgorithmService.medianOfMedians([3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5], 4);
      expect(r.algorithm).toBe("medianOfMedians");
      expect(r.value).toBe(3);
    });

    it("returns null for out-of-range k", () => {
      const r = dsAlgorithmService.medianOfMedians([1, 2, 3], 10);
      expect(r.value).toBeNull();
    });
  });

  describe("hpFilter", () => {
    it("decomposes trend and cycle", () => {
      const r = dsAlgorithmService.hpFilter([10, 12, 15, 14, 18, 20, 22, 25], 1600);
      expect(r.algorithm).toBe("hpFilter");
      expect(r.output.trend.length).toBe(8);
      expect(r.output.cycle.length).toBe(8);
    });

    it("handles short arrays", () => {
      const r = dsAlgorithmService.hpFilter([10, 20]);
      expect(r.output.trend).toEqual([10, 20]);
      expect(r.output.cycle).toEqual([0, 0]);
    });
  });
});

describe("Depth 3 - String / DP", () => {
  describe("longestCommonSubstring", () => {
    it("finds common substring", () => {
      const r = dsAlgorithmService.longestCommonSubstring("abcdef", "zcdem");
      expect(r.algorithm).toBe("longestCommonSubstring");
      expect(r.substring).toBe("cde");
      expect(r.length).toBe(3);
    });

    it("returns empty for no common substring", () => {
      const r = dsAlgorithmService.longestCommonSubstring("abc", "xyz");
      expect(r.length).toBe(0);
      expect(r.substring).toBe("");
    });
  });

  describe("jaroWinklerSimilarity", () => {
    it("computes similarity for similar strings", () => {
      const r = dsAlgorithmService.jaroWinklerSimilarity("MARTHA", "MARHTA");
      expect(r.algorithm).toBe("jaroWinkler");
      expect(r.similarity).toBeGreaterThan(0.8);
      expect(r.matches).toBeGreaterThan(0);
    });

    it("returns 1 for identical strings", () => {
      const r = dsAlgorithmService.jaroWinklerSimilarity("campaign", "campaign");
      expect(r.similarity).toBe(1);
      expect(r.winkler).toBe(1);
    });

    it("returns 0 for no matches", () => {
      const r = dsAlgorithmService.jaroWinklerSimilarity("abc", "xyz");
      expect(r.similarity).toBe(0);
    });
  });

  describe("hammingDistance", () => {
    it("computes distance for equal-length strings", () => {
      const r = dsAlgorithmService.hammingDistance("karolin", "kathrin");
      expect(r.algorithm).toBe("hammingDistance");
      expect(r.distance).toBe(3);
      expect(r.sameLength).toBe(true);
    });

    it("handles different length strings", () => {
      const r = dsAlgorithmService.hammingDistance("abc", "abcdef");
      expect(r.sameLength).toBe(false);
      expect(r.distance).toBe(3);
    });
  });

  describe("palindromePartitioning", () => {
    it("finds min cuts for palindrome partitioning", () => {
      const r = dsAlgorithmService.palindromePartitioning("aab");
      expect(r.algorithm).toBe("palindromePartitioning");
      expect(r.minCuts).toBe(1);
    });

    it("returns 0 cuts for already palindrome", () => {
      const r = dsAlgorithmService.palindromePartitioning("aba");
      expect(r.minCuts).toBe(0);
    });

    it("handles empty string", () => {
      const r = dsAlgorithmService.palindromePartitioning("");
      expect(r.minCuts).toBe(0);
    });
  });

  describe("eggDrop", () => {
    it("computes minimum trials", () => {
      const r = dsAlgorithmService.eggDrop(2, 10);
      expect(r.algorithm).toBe("eggDrop");
      expect(r.minTrials).toBeGreaterThan(0);
      expect(r.minTrials).toBeLessThanOrEqual(10);
    });

    it("computes trivial case", () => {
      const r = dsAlgorithmService.eggDrop(1, 5);
      expect(r.minTrials).toBe(5);
    });
  });

  describe("travelingSalesmanDp", () => {
    it("finds minimum tour cost", () => {
      const r = dsAlgorithmService.travelingSalesmanDp(
        4,
        [
          [0, 10, 15, 20],
          [10, 0, 35, 25],
          [15, 35, 0, 30],
          [20, 25, 30, 0],
        ],
      );
      expect(r.algorithm).toBe("travelingSalesman");
      expect(r.minCost).toBeGreaterThan(0);
      expect(r.path.length).toBe(5);
    });

    it("handles single city", () => {
      const r = dsAlgorithmService.travelingSalesmanDp(0, []);
      expect(r.minCost).toBe(0);
    });
  });
});

describe("Depth 3 - Enhanced Existing DS", () => {
  describe("medianHeapOperations", () => {
    it("tracks median of streaming values", () => {
      const r = dsAlgorithmService.medianHeapOperations([5, 3, 8, 1, 9, 2, 7]);
      expect(r.type).toBe("medianHeap");
      expect(r.operations.length).toBe(7);
      expect(r.operations[0].median).toBe(5);
      expect(r.operations[6].median).toBeLessThanOrEqual(8);
    });
  });

  describe("trieWildcardSearch", () => {
    it("matches patterns with wildcards", () => {
      const r = dsAlgorithmService.trieWildcardSearch(
        ["cat", "car", "bar", "bat", "cab"],
        [{ pattern: "c?t", wildcard: "?" }, { pattern: "???", wildcard: "?" }],
      );
      expect(r.type).toBe("trieWildcard");
      expect(r.searchResults[0].matches).toContain("cat");
      expect(r.searchResults[1].matches.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("fenwickRangeUpdate", () => {
    it("applies range updates and point queries", () => {
      const r = dsAlgorithmService.fenwickRangeUpdate(
        [1, 2, 3, 4, 5],
        [{ l: 1, r: 3, add: 5 }],
        [{ idx: 0 }, { idx: 1 }, { idx: 4 }],
      );
      expect(r.type).toBe("fenwickRangeUpdate");
      expect(r.queryResults[0].value).toBe(1);
      expect(r.queryResults[1].value).toBe(7);
      expect(r.queryResults[2].value).toBe(5);
    });
  });

  describe("segmentTreeAdvanced", () => {
    it("supports sum, min, max with lazy updates", () => {
      const r = dsAlgorithmService.segmentTreeAdvanced(
        [1, 2, 3, 4, 5],
        [
          { type: "query", l: 0, r: 4, opType: "sum" },
          { type: "query", l: 1, r: 3, opType: "min" },
          { type: "query", l: 0, r: 4, opType: "max" },
        ],
      );
      expect(r.type).toBe("segmentTreeAdvanced");
      expect(r.results[0].result).toBe(15);
      expect(r.results[1].result).toBe(2);
      expect(r.results[2].result).toBe(5);
    });

    it("applies range updates", () => {
      const r = dsAlgorithmService.segmentTreeAdvanced(
        [1, 2, 3, 4, 5],
        [
          { type: "update", l: 0, r: 2, add: 10 },
          { type: "query", l: 0, r: 4, opType: "sum" },
        ],
      );
      expect(r.results[0].result).toBe(45);
    });
  });

  describe("bloomFilterUnionIntersect", () => {
    it("computes union and intersection of bloom filters", () => {
      const r = dsAlgorithmService.bloomFilterUnionIntersect([
        { items: ["a", "b", "c"], falsePositiveRate: 0.01 },
        { items: ["b", "c", "d"], falsePositiveRate: 0.01 },
      ]);
      expect(r.type).toBe("bloomFilterUnionIntersect");
      expect(r.filterCount).toBe(2);
      expect(r.unionTest.length).toBeGreaterThan(0);
      expect(r.intersectTest.length).toBeGreaterThan(0);
    });
  });

  describe("lfuCacheOperations", () => {
    it("evicts least frequently used item", () => {
      const r = dsAlgorithmService.lfuCacheOperations(3, [
        { action: "put", key: "a", value: 1 },
        { action: "put", key: "b", value: 2 },
        { action: "put", key: "c", value: 3 },
        { action: "get", key: "a" },
        { action: "get", key: "a" },
        { action: "put", key: "d", value: 4 },
      ]);
      expect(r.type).toBe("lfuCache");
      expect(r.operations.length).toBe(6);
      const evicted = r.operations.filter((o) => o.evicted);
      expect(evicted.length).toBe(1);
    });

    it("handles cache miss", () => {
      const r = dsAlgorithmService.lfuCacheOperations(2, [
        { action: "put", key: "x", value: 10 },
        { action: "get", key: "y" },
      ]);
      expect(r.operations[1].value).toBeUndefined();
    });
  });
});

describe("Depth 3 - Marketing Depth", () => {
  describe("vcgPayments", () => {
    it("computes VCG payments for auction winners", () => {
      const r = dsAlgorithmService.vcgPayments(
        [{ id: "A", bid: 100 }, { id: "B", bid: 80 }, { id: "C", bid: 60 }],
        2, 2,
      );
      expect(r.algorithm).toBe("vcgPayments");
      const output = r.output as Record<string, unknown>;
      expect((output.winners as string[]).length).toBe(2);
      expect((output.winners as string[])[0]).toBe("A");
      expect((output.payments as Record<string, number>)["A"]).toBeGreaterThanOrEqual(0);
    });
  });

  describe("markovChainAttribution", () => {
    it("attributies conversion credit across channels", () => {
      const r = dsAlgorithmService.markovChainAttribution(
        ["email", "social", "search"],
        [
          { interactions: ["email", "social"], conversion: true },
          { interactions: ["search"], conversion: true },
          { interactions: ["email"], conversion: false },
        ],
      );
      expect(r.algorithm).toBe("markovChainAttribution");
      const output = r.output as Record<string, unknown>;
      expect(Object.keys(output.attribution as Record<string, number>).length).toBe(3);
      const sum = Object.values(output.attribution as Record<string, number>).reduce((s, v) => s + v, 0);
      expect(sum).toBeCloseTo(1, 1);
    });
  });

  describe("bangBangPacing", () => {
    it("recommends hold when on pace", () => {
      const r = dsAlgorithmService.bangBangPacing(
        [25, 25, 25], 100, 3, 10, 0.1,
      );
      expect(r.algorithm).toBe("bangBangPacing");
      const output = r.output as Record<string, unknown>;
      expect(["hold", "slow", "boost"]).toContain(output.action);
    });

    it("recommends boost when behind pace", () => {
      const r = dsAlgorithmService.bangBangPacing(
        [5, 5, 5], 100, 3, 10, 0.1,
      );
      const output = r.output as Record<string, unknown>;
      expect(output.action).toBe("boost");
    });
  });

  describe("pageRankAudience", () => {
    it("computes PageRank scores on audience graph", () => {
      const r = dsAlgorithmService.pageRankAudience(
        [
          { id: "user1", type: "user" },
          { id: "user2", type: "user" },
          { id: "aud1", type: "audience" },
          { id: "camp1", type: "campaign" },
        ],
        [["user1", "aud1", 1], ["user2", "aud1", 1], ["aud1", "camp1", 1]],
        0.85, 10,
      );
      expect(r.algorithm).toBe("pageRankAudience");
      const output = r.output as Record<string, unknown>;
      expect(Object.keys(output.scores as Record<string, number>).length).toBe(4);
      expect(output.topAudiences).toBeDefined();
    });
  });

  describe("submodularMaximization", () => {
    it("selects items maximizing marginal gain under budget", () => {
      const r = dsAlgorithmService.submodularMaximization(
        [
          { id: "A", value: 10, cost: 5, overlaps: [] },
          { id: "B", value: 20, cost: 10, overlaps: ["A"] },
          { id: "C", value: 15, cost: 8, overlaps: [] },
        ],
        15,
      );
      expect(r.algorithm).toBe("submodularMaximization");
      const output = r.output as Record<string, unknown>;
      expect((output.selected as string[]).length).toBeGreaterThan(0);
      expect(output.usedBudget).toBeLessThanOrEqual(15);
    });
  });

  describe("adSequencingDp", () => {
    it("selects optimal ad sequence", () => {
      const r = dsAlgorithmService.adSequencingDp(
        10,
        [{ id: "ad1", value: 5, cost: 3 }, { id: "ad2", value: 9, cost: 5 }, { id: "ad3", value: 6, cost: 4 }],
      );
      expect(r.algorithm).toBe("adSequencingDp");
      const output = r.output as Record<string, unknown>;
      expect((output.sequence as string[]).length).toBeGreaterThan(0);
      expect(output.maxValue).toBeGreaterThan(0);
    });
  });

  describe("optimalStopping", () => {
    it("selects candidate above look phase threshold", () => {
      const r = dsAlgorithmService.optimalStopping([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
      expect(r.algorithm).toBe("optimalStopping");
      const output = r.output as Record<string, unknown>;
      expect(output.selectedIndex).toBeGreaterThanOrEqual(0);
      expect(output.selectedValue).toBeGreaterThanOrEqual(30);
    });

    it("handles empty candidate list", () => {
      const r = dsAlgorithmService.optimalStopping([]);
      const output = r.output as Record<string, unknown>;
      expect(output.selectedIndex).toBe(-1);
    });
  });

  describe("littleLawInventory", () => {
    it("computes Little's Law metrics", () => {
      const r = dsAlgorithmService.littleLawInventory(10, 2.5);
      expect(r.algorithm).toBe("littleLawInventory");
      const output = r.output as Record<string, unknown>;
      expect(output.avgInventory).toBe(25);
      expect(output.avgWaitTime).toBe(2.5);
      expect(output.throughput).toBe(10);
    });
  });

  describe("thompsonSampling", () => {
    it("scores variants via sampling", () => {
      const r = dsAlgorithmService.thompsonSampling(
        [{ id: "A", alpha: 10, beta: 2 }, { id: "B", alpha: 5, beta: 5 }],
        500,
      );
      expect(r.algorithm).toBe("thompsonSampling");
      const output = r.output as Record<string, unknown>;
      expect(Object.keys(output.scores as Record<string, number>).length).toBe(2);
      expect((output.scores as Record<string, number>)["A"]).toBeGreaterThan(0.5);
    });
  });

  describe("differentialPrivacy", () => {
    it("adds Laplace noise to protect privacy", () => {
      const r = dsAlgorithmService.differentialPrivacy([10, 20, 30, 40, 50], 1, 1);
      expect(r.algorithm).toBe("differentialPrivacy");
      const output = r.output as Record<string, unknown>;
      expect(output.trueMean).toBe(30);
      expect(output.privateMean).not.toBe(output.trueMean);
    });

    it("handles single value", () => {
      const r = dsAlgorithmService.differentialPrivacy([42], 0.5, 1);
      const output = r.output as Record<string, unknown>;
      expect(output.trueMean).toBe(42);
      expect(output.epsilon).toBe(0.5);
    });
  });
});
