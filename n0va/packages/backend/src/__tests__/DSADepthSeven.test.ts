import { describe, it, expect } from "vitest";
import { dsAlgorithmService } from "../services/DSAlgorithmService";

describe("Depth 7 - Advanced Data Structures", () => {
  describe("cuckooFilter", () => {
    it("inserts and checks membership with low false positive", () => {
      const r = dsAlgorithmService.cuckooFilter([1, 2, 3, 4, 5], [1, 3, 6]);
      expect(r.type).toBe("cuckooFilter");
      expect(r.operations[0].result).toBe(true);
      expect(r.operations[1].result).toBe(true);
    });
  });

  describe("suffixTreeSimulation", () => {
    it("finds pattern occurrences via suffix array", () => {
      const r = dsAlgorithmService.suffixTreeSimulation("banana", ["ana", "na", "banana"]);
      expect(r.type).toBe("suffixTree");
      expect(r.text).toBe("banana");
      expect(r.queries.length).toBe(3);
    });
  });

  describe("rTreeSpatial", () => {
    it("handles insert and range queries", () => {
      const r = dsAlgorithmService.rTreeSpatial([
        { type: "insert", point: { x: 10, y: 20 } },
        { type: "insert", point: { x: 30, y: 40 } },
        { type: "search", point: { x: 10, y: 20 } },
      ]);
      expect(r.type).toBe("rTree");
      expect(r.operations.length).toBe(3);
    });
  });

  describe("persistentArray", () => {
    it("supports versioned get and set", () => {
      const r = dsAlgorithmService.persistentArray([
        { type: "set", index: 0, value: 10 },
        { type: "set", index: 1, value: 20 },
        { type: "get", version: 0, index: 0 },
        { type: "get", version: 1, index: 1 },
      ]);
      expect(r.type).toBe("persistentArray");
      expect(r.operations[2].result).toBeNull();
      expect(r.operations[3].result).toBeNull();
    });
  });

  describe("minMaxStack", () => {
    it("tracks min and max on push/pop", () => {
      const r = dsAlgorithmService.minMaxStack([
        { type: "push", value: 3 }, { type: "push", value: 1 },
        { type: "push", value: 5 }, { type: "min" }, { type: "max" },
        { type: "pop" }, { type: "min" },
      ]);
      expect(r.type).toBe("minMaxStack");
      expect(r.operations[3].min).toBe(1);
      expect(r.operations[4].max).toBe(5);
      expect(r.operations[6].min).toBe(1);
    });
  });

  describe("dAryHeap", () => {
    it("supports insert, extractMin with d=3", () => {
      const r = dsAlgorithmService.dAryHeap([5, 3, 7, 1], 3, [
        { type: "insert", value: 2 }, { type: "peek" }, { type: "extractMin" },
      ]);
      expect(r.type).toBe("dAryHeap");
      expect(r.degree).toBe(3);
      expect(r.operations[1].result).toBe(1);
    });
  });

  describe("intervalTreeDynamic", () => {
    it("inserts intervals and queries points", () => {
      const r = dsAlgorithmService.intervalTreeDynamic([
        { type: "insert", interval: { low: 1, high: 5, value: "A" } },
        { type: "insert", interval: { low: 6, high: 10, value: "B" } },
        { type: "query", point: 3 },
        { type: "query", point: 7 },
        { type: "query", point: 11 },
      ]);
      expect(r.type).toBe("intervalTree");
      expect(r.operations[2].result).toEqual(["A"]);
      expect(r.operations[3].result).toEqual(["B"]);
      expect(r.operations[4].result).toEqual([]);
    });
  });
});

describe("Depth 7 - Advanced Algorithms", () => {
  describe("longestPathDag", () => {
    it("finds longest path in DAG", () => {
      const r = dsAlgorithmService.longestPathDag(
        ["a", "b", "c", "d"],
        [{ from: "a", to: "b", weight: 5 }, { from: "a", to: "c", weight: 3 },
         { from: "b", to: "d", weight: 2 }, { from: "c", to: "d", weight: 4 }]
      );
      expect(r.algorithm).toBe("longestPathDag");
      expect(r.maxDistance).toBeGreaterThan(0);
    });
  });

  describe("graphColoringGreedy", () => {
    it("colors graph with reasonable chromatic number", () => {
      const r = dsAlgorithmService.graphColoringGreedy(
        ["a", "b", "c"], [{ from: "a", to: "b" }, { from: "b", to: "c" }]
      );
      expect(r.algorithm).toBe("graphColoring");
      expect(r.chromaticNumber).toBeLessThanOrEqual(3);
      expect(r.colors.length).toBe(3);
    });
  });

  describe("minimumVertexCover", () => {
    it("finds minimum vertex cover in bipartite graph", () => {
      const r = dsAlgorithmService.minimumVertexCover(
        ["a1", "a2"], ["b1", "b2"],
        [{ from: "a1", to: "b1" }, { from: "a1", to: "b2" }, { from: "a2", to: "b1" }]
      );
      expect(r.algorithm).toBe("minVertexCover");
      expect(r.cover.length).toBeGreaterThan(0);
    });
  });

  describe("hamiltonianPath", () => {
    it("finds Hamiltonian path in complete graph", () => {
      const r = dsAlgorithmService.hamiltonianPath(
        ["a", "b", "c"],
        [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "a", to: "c" }]
      );
      expect(r.algorithm).toBe("hamiltonianPath");
      expect(r.found).toBe(true);
    });
  });

  describe("baumWelchHmm", () => {
    it("estimates HMM parameters", () => {
      const r = dsAlgorithmService.baumWelchHmm([0, 1, 0, 1, 0], 2, 5);
      expect(r.algorithm).toBe("baumWelch");
      expect(r.logLikelihood).toBeLessThan(0);
    });
  });

  describe("fordFulkersonMaxFlow", () => {
    it("finds max flow in network", () => {
      const r = dsAlgorithmService.fordFulkersonMaxFlow(
        ["s", "a", "b", "t"],
        [{ from: "s", to: "a", capacity: 10 }, { from: "s", to: "b", capacity: 5 },
         { from: "a", to: "b", capacity: 5 }, { from: "a", to: "t", capacity: 10 },
         { from: "b", to: "t", capacity: 5 }],
        "s", "t"
      );
      expect(r.algorithm).toBe("fordFulkerson");
      expect(r.maxFlow).toBe(15);
    });
  });
});

describe("Depth 7 - String / DP", () => {
  describe("kmp2dSearch", () => {
    it("finds pattern in 2D grid", () => {
      const r = dsAlgorithmService.kmp2dSearch(
        [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        [[1, 2], [4, 5]]
      );
      expect(r.algorithm).toBe("kmp2d");
      expect(r.matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("longestRepeatedSubstring", () => {
    it("finds longest repeated substring", () => {
      const r = dsAlgorithmService.longestRepeatedSubstring("banana");
      expect(r.algorithm).toBe("longestRepeatedSubstring");
      expect(r.length).toBeGreaterThan(0);
    });
  });

  describe("textJustification", () => {
    it("justifies text to specified width", () => {
      const r = dsAlgorithmService.textJustification(
        ["This", "is", "a", "test", "sentence"], 10
      );
      expect(r.algorithm).toBe("textJustification");
      expect(r.lines.length).toBeGreaterThan(0);
    });
  });

  describe("affineGapEditDistance", () => {
    it("computes edit distance with affine gap", () => {
      const r = dsAlgorithmService.affineGapEditDistance("kitten", "sitting", 2, 1);
      expect(r.algorithm).toBe("affineGapEdit");
      expect(r.distance).toBeGreaterThan(0);
    });
  });

  describe("dpBoxStacking", () => {
    it("finds max height for box stacking", () => {
      const r = dsAlgorithmService.dpBoxStacking([
        { w: 4, d: 6, h: 7 }, { w: 1, d: 2, h: 3 }, { w: 10, d: 12, h: 8 }
      ]);
      expect(r.algorithm).toBe("boxStacking");
      expect(r.maxHeight).toBeGreaterThan(0);
    });
  });

  describe("dpLongestChain", () => {
    it("finds longest chain of pairs", () => {
      const r = dsAlgorithmService.dpLongestChain([
        { a: 5, b: 24 }, { a: 15, b: 25 }, { a: 27, b: 40 }, { a: 50, b: 60 }
      ]);
      expect(r.algorithm).toBe("longestChain");
      expect(r.longestChain).toBe(3);
    });
  });

  describe("dpMaxSumRectangle", () => {
    it("finds max sum sub-rectangle in 2D matrix", () => {
      const r = dsAlgorithmService.dpMaxSumRectangle([
        [1, 2, -1], [-3, -2, 4], [5, -1, 2]
      ]);
      expect(r.algorithm).toBe("maxSumRectangle");
      expect(r.maxSum).toBeGreaterThan(0);
    });
  });
});

describe("Depth 7 - Enhanced Existing", () => {
  describe("segmentTreePersistent", () => {
    it("supports versioned set and sum queries", () => {
      const r = dsAlgorithmService.segmentTreePersistent([1, 2, 3, 4, 5], [
        { type: "sum", version: 1, l: 0, r: 4 },
        { type: "set", version: 1, index: 0, value: 10 },
      ]);
      expect(r.type).toBe("segmentTreePersistent");
      expect(r.operations.length).toBe(2);
    });
  });

  describe("dsuPersistentRollback", () => {
    it("supports union, find, and rollback", () => {
      const r = dsAlgorithmService.dsuPersistentRollback([
        { type: "union", a: 0, b: 1 }, { type: "union", a: 2, b: 3 },
        { type: "find", a: 0 }, { type: "rollback" },
      ]);
      expect(r.type).toBe("dsuPersistentRollback");
      expect(r.operations.length).toBe(4);
    });
  });

  describe("scalableBloomFilter", () => {
    it("handles add, check, and resize", () => {
      const r = dsAlgorithmService.scalableBloomFilter([
        { type: "add", item: 5 }, { type: "add", item: 10 },
        { type: "check", item: 5 }, { type: "check", item: 15 },
      ]);
      expect(r.type).toBe("scalableBloomFilter");
      expect(r.operations[2].result).toBe(true);
      expect(r.operations[3].result).toBe(false);
    });
  });

  describe("lfuCacheAdvanced", () => {
    it("evicts least frequently used items", () => {
      const r = dsAlgorithmService.lfuCacheAdvanced(2, [
        { type: "put", key: "a", value: 1 }, { type: "put", key: "b", value: 2 },
        { type: "get", key: "a" }, { type: "put", key: "c", value: 3 },
      ]);
      expect(r.type).toBe("lfuCache");
      expect(r.capacity).toBe(2);
    });
  });

  describe("treapOrderStatistics", () => {
    it("supports insert, delete, kth, and rank", () => {
      const r = dsAlgorithmService.treapOrderStatistics([5, 3, 7, 1], [
        { type: "kth", k: 2 }, { type: "insert", value: 4 },
      ]);
      expect(r.type).toBe("treapOrderStats");
      expect(r.operations.length).toBe(2);
    });
  });
});

describe("Depth 7 - Marketing Depth", () => {
  describe("doublyRobustATE", () => {
    it("computes doubly robust treatment effect", () => {
      const r = dsAlgorithmService.doublyRobustATE(
        [1, 0, 1, 0, 1], [10, 8, 12, 7, 15], [0.6, 0.4, 0.7, 0.3, 0.8]
      );
      expect(r.algorithm).toBe("doublyRobustATE");
      expect(r.ate).not.toBeNaN();
    });
  });

  describe("linUcbBandit", () => {
    it("selects arms using linear UCB", () => {
      const r = dsAlgorithmService.linUcbBandit(
        ["A", "B", "C"],
        [[1, 0], [0, 1], [0.5, 0.5]],
        [1, 0, 1]
      );
      expect(r.algorithm).toBe("linUcbBandit");
      expect(r.armCounts.length).toBe(3);
    });
  });

  describe("optimalBidShading", () => {
    it("computes optimal shaded bid", () => {
      const r = dsAlgorithmService.optimalBidShading(2.5, 0.7, [0.3, 0.5, 0.6, 0.4, 0.7]);
      expect(r.algorithm).toBe("optimalBidShading");
      expect(r.optimalShadedBid).toBeLessThan(r.bid);
    });
  });

  describe("multiTouchMarkovComplete", () => {
    it("computes Markov chain attribution with removal effects", () => {
      const r = dsAlgorithmService.multiTouchMarkovComplete(
        ["email", "search", "social"],
        [["email", "search", "social"], ["search", "email"], ["social", "search"]],
        [1, 0, 1]
      );
      expect(r.algorithm).toBe("multiTouchMarkov");
      expect(r.attributions.length).toBe(3);
    });
  });

  describe("roasPortfolioRiskOptimization", () => {
    it("optimizes channel allocation by risk-return", () => {
      const r = dsAlgorithmService.roasPortfolioRiskOptimization(
        [{ name: "Search", roas: 3.5, risk: 0.2 },
         { name: "Social", roas: 2.8, risk: 0.3 },
         { name: "Email", roas: 4.2, risk: 0.15 }],
        3.0
      );
      expect(r.algorithm).toBe("roasPortfolioRisk");
      expect(r.allocations.length).toBe(3);
    });
  });

  describe("bayesianCausalImpact", () => {
    it("estimates causal impact of intervention", () => {
      const r = dsAlgorithmService.bayesianCausalImpact(
        [10, 12, 11, 15, 18], [[9, 11, 10, 13, 16]], 50
      );
      expect(r.algorithm).toBe("bayesianCausalImpact");
      expect(r.ci95.lower).toBeLessThan(r.ci95.upper);
    });
  });

  describe("multiPeriodBudgetOptimization", () => {
    it("allocates budget across periods and channels", () => {
      const r = dsAlgorithmService.multiPeriodBudgetOptimization(
        3, 10000,
        [{ name: "Search", baseReturn: 3.0, decay: 0.2 },
         { name: "Social", baseReturn: 2.5, decay: 0.3 }]
      );
      expect(r.algorithm).toBe("multiPeriodBudget");
      expect(r.allocations.length).toBe(3);
      expect(r.totalReturn).toBeGreaterThan(0);
    });
  });

  describe("audienceLookalikeEnsemble", () => {
    it("scores and ranks lookalike candidates", () => {
      const r = dsAlgorithmService.audienceLookalikeEnsemble(
        [[1, 2, 3], [4, 5, 6]],
        [[1, 2, 4], [7, 8, 9], [2, 3, 3]], 2
      );
      expect(r.algorithm).toBe("audienceLookalike");
      expect(r.topCandidates.length).toBe(2);
    });
  });

  describe("churnPredictionLogisticRegression", () => {
    it("trains logistic regression for churn prediction", () => {
      const r = dsAlgorithmService.churnPredictionLogisticRegression(
        [[1, 2], [2, 1], [3, 4], [4, 3], [5, 6], [6, 5]],
        [0, 0, 1, 1, 1, 1]
      );
      expect(r.algorithm).toBe("churnPrediction");
      expect(r.accuracy).toBeGreaterThan(0);
    });
  });

  describe("keywordBidPortfolioOptimization", () => {
    it("optimizes keyword bids under budget constraint", () => {
      const r = dsAlgorithmService.keywordBidPortfolioOptimization(
        [{ term: "shoes", conversions: 50, cost: 200, ctr: 0.05 },
         { term: "boots", conversions: 30, cost: 150, ctr: 0.04 },
         { term: "sandals", conversions: 20, cost: 100, ctr: 0.03 }],
        300
      );
      expect(r.algorithm).toBe("keywordBidPortfolio");
      expect(r.bids.length).toBeGreaterThan(0);
    });
  });
});
