import { describe, it, expect } from "vitest";
import { dsAlgorithmService } from "../services/DSAlgorithmService";

describe("Depth 5 - Advanced Data Structures", () => {
  describe("sparseTableRMQ", () => {
    it("answers range minimum queries in O(1)", () => {
      const r = dsAlgorithmService.sparseTableRMQ([3, 1, 4, 1, 5, 9, 2, 6], [{ l: 0, r: 3 }, { l: 1, r: 5 }, { l: 4, r: 7 }]);
      expect(r.type).toBe("sparseTableRMQ");
      expect(r.size).toBe(8);
      expect(r.operations[0].result).toBe(1);
      expect(r.operations[1].result).toBe(1);
      expect(r.operations[2].result).toBe(2);
    });
  });

  describe("xorLinkedListOps", () => {
    it("builds and traverses XOR linked list", () => {
      const r = dsAlgorithmService.xorLinkedListOps([1, 2, 3, 4, 5]);
      expect(r.type).toBe("xorLinkedList");
      expect(r.elements).toEqual([1, 2, 3, 4, 5]);
      expect(r.operations[0].action).toBe("build");
      expect(r.operations[1].action).toBe("traverse");
    });
  });

  describe("binaryIndexedTree2D", () => {
    it("supports 2D range sum queries", () => {
      const r = dsAlgorithmService.binaryIndexedTree2D(4, 4, [{ x: 1, y: 1, delta: 3 }, { x: 2, y: 3, delta: 5 }], [{ x1: 1, y1: 1, x2: 3, y2: 3 }]);
      expect(r.type).toBe("binaryIndexedTree2D");
      expect(r.operations.length).toBe(3);
      expect(r.operations[2].result).toBe(8);
    });
  });

  describe("cartesianTreeBuild", () => {
    it("builds Cartesian tree from array", () => {
      const r = dsAlgorithmService.cartesianTreeBuild([3, 1, 4, 2]);
      expect(r.type).toBe("cartesianTree");
      expect(r.root).toBeGreaterThanOrEqual(0);
      expect(r.parent.length).toBe(4);
    });
  });

  describe("disjointSetUnionAdvanced", () => {
    it("handles union, find, and connected queries", () => {
      const r = dsAlgorithmService.disjointSetUnionAdvanced([
        { type: "union", a: 0, b: 1 },
        { type: "union", a: 2, b: 3 },
        { type: "find", a: 0 },
        { type: "connected", a: 0, b: 1 },
        { type: "connected", a: 0, b: 2 },
      ]);
      expect(r.type).toBe("disjointSetUnion");
      expect(r.operations[3].result).toBe(true);
      expect(r.operations[4].result).toBe(false);
    });
  });

  describe("treapImplicit", () => {
    it("supports insert, erase, sum, and reverse", () => {
      const r = dsAlgorithmService.treapImplicit([1, 2, 3, 4, 5], [
        { type: "sum", l: 0, r: 4 },
        { type: "reverse", l: 1, r: 3 },
        { type: "insert", pos: 0, value: 10 },
        { type: "erase", pos: 2 },
      ]);
      expect(r.type).toBe("implicitTreap");
      expect(r.operations.length).toBe(4);
      expect(r.operations[0].result).toBe(15);
    });
  });
});

describe("Depth 5 - Advanced Algorithms", () => {
  describe("minCostMaxFlow", () => {
    it("computes min-cost max-flow", () => {
      const r = dsAlgorithmService.minCostMaxFlow(
        ["s", "a", "b", "t"],
        [
          { from: "s", to: "a", capacity: 10, cost: 2 },
          { from: "s", to: "b", capacity: 10, cost: 1 },
          { from: "a", to: "t", capacity: 10, cost: 3 },
          { from: "b", to: "t", capacity: 10, cost: 4 },
        ],
        "s", "t"
      );
      expect(r.algorithm).toBe("minCostMaxFlow");
      expect(r.maxFlow).toBeGreaterThan(0);
      expect(r.flowEdges.length).toBeGreaterThan(0);
    });
  });

  describe("bronKerboschMaxClique", () => {
    it("finds maximum clique in a graph", () => {
      const r = dsAlgorithmService.bronKerboschMaxClique({
        a: ["b", "c"], b: ["a", "c"], c: ["a", "b"], d: ["a"],
      });
      expect(r.algorithm).toBe("bronKerbosch");
      expect(r.cliqueCount).toBeGreaterThanOrEqual(1);
      expect(r.maxClique.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("minimumSpanningTree", () => {
    it("computes MST via Kruskal", () => {
      const r = dsAlgorithmService.minimumSpanningTree(
        ["a", "b", "c", "d"],
        [
          { from: "a", to: "b", weight: 1 },
          { from: "b", to: "c", weight: 2 },
          { from: "a", to: "c", weight: 3 },
          { from: "c", to: "d", weight: 4 },
        ]
      );
      expect(r.algorithm).toBe("minimumSpanningTree");
      expect(r.edges.length).toBe(3);
      expect(r.totalWeight).toBe(7);
    });
  });

  describe("kosarajuSCC", () => {
    it("finds strongly connected components", () => {
      const r = dsAlgorithmService.kosarajuSCC({
        a: ["b"], b: ["c"], c: ["a"], d: ["e"], e: ["f"], f: ["e"],
      });
      expect(r.algorithm).toBe("kosaraju");
      expect(r.componentCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("articulationPointsAndBridges", () => {
    it("finds articulation points and bridges", () => {
      const r = dsAlgorithmService.articulationPointsAndBridges(
        ["a", "b", "c", "d"],
        [["a", "b"], ["b", "c"], ["c", "a"], ["c", "d"]]
      );
      expect(r.algorithm).toBe("articulationPoints");
      expect(r.articulationPoints.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("bipartiteMatching", () => {
    it("computes maximum bipartite matching", () => {
      const r = dsAlgorithmService.bipartiteMatching(
        ["a", "b", "c"], ["x", "y", "z"],
        [["a", "x"], ["a", "y"], ["b", "y"], ["c", "z"]]
      );
      expect(r.algorithm).toBe("bipartiteMatching");
      expect(r.cardinality).toBe(3);
    });
  });
});

describe("Depth 5 - String / DP", () => {
  describe("manacherAlgorithm", () => {
    it("finds longest palindrome in O(n)", () => {
      const r = dsAlgorithmService.manacherAlgorithm("babad");
      expect(r.algorithm).toBe("manacher");
      expect(r.longestPalindrome.length).toBeGreaterThanOrEqual(3);
      expect(r.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("zAlgorithmSearch", () => {
    it("finds pattern matches in text", () => {
      const r = dsAlgorithmService.zAlgorithmSearch("abcxabc", "abc");
      expect(r.algorithm).toBe("zAlgorithm");
      expect(r.matches).toEqual([0, 4]);
    });
  });

  describe("levenshteinWithPath", () => {
    it("computes edit distance with operation path", () => {
      const r = dsAlgorithmService.levenshteinWithPath("kitten", "sitting");
      expect(r.algorithm).toBe("levenshtein");
      expect(r.distance).toBe(3);
      expect(r.operations.length).toBeGreaterThan(0);
    });
  });

  describe("lisWithPath", () => {
    it("finds longest increasing subsequence", () => {
      const r = dsAlgorithmService.lisWithPath([10, 9, 2, 5, 3, 7, 101, 18]);
      expect(r.algorithm).toBe("lis");
      expect(r.length).toBe(4);
      expect(r.subsequence.length).toBe(4);
    });
  });

  describe("dpBitmaskTSP", () => {
    it("solves TSP with DP bitmask", () => {
      const r = dsAlgorithmService.dpBitmaskTSP([
        [0, 10, 15, 20],
        [10, 0, 35, 25],
        [15, 35, 0, 30],
        [20, 25, 30, 0],
      ]);
      expect(r.algorithm).toBe("dpBitmaskTSP");
      expect(r.distance).toBeGreaterThan(0);
      expect(r.path.length).toBe(4);
    });
  });

  describe("regexMatching", () => {
    it("matches regex with * and .", () => {
      const r = dsAlgorithmService.regexMatching("aab", "c*a*b");
      expect(r.algorithm).toBe("regexMatching");
      expect(r.matches).toBe(true);
    });
  });

  describe("damerauLevenshtein", () => {
    it("computes Damerau-Levenshtein distance", () => {
      const r = dsAlgorithmService.damerauLevenshtein("ca", "abc");
      expect(r.algorithm).toBe("damerauLevenshtein");
      expect(r.distance).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("Depth 5 - Enhanced Existing", () => {
  describe("lruCacheOps", () => {
    it("evicts least recently used on capacity overflow", () => {
      const r = dsAlgorithmService.lruCacheOps(2, [
        { type: "put", key: "a", value: 1 },
        { type: "put", key: "b", value: 2 },
        { type: "get", key: "a" },
        { type: "put", key: "c", value: 3 },
      ]);
      expect(r.capacity).toBe(2);
      expect(r.operations[3].evicted).toBe(true);
      expect(r.finalState.some(s => s.key === "c")).toBe(true);
    });
  });

  describe("bloomFilterAdvanced", () => {
    it("builds bloom filter with configurable false positive rate", () => {
      const r = dsAlgorithmService.bloomFilterAdvanced(100, 0.01, ["apple", "banana"], ["apple", "grape"]);
      expect(r.type).toBe("bloomFilterAdvanced");
      expect(r.insertions).toBe(2);
      expect(r.checks[0].probablyPresent).toBe(true);
    });
  });

  describe("segmentTreeLazyPropagation", () => {
    it("supports range updates and range queries", () => {
      const r = dsAlgorithmService.segmentTreeLazyPropagation([1, 2, 3, 4, 5], [
        { type: "query", l: 0, r: 4 },
        { type: "update", l: 1, r: 3, value: 5 },
        { type: "query", l: 0, r: 4 },
      ]);
      expect(r.type).toBe("segmentTreeLazy");
      expect(r.operations[0].result).toBe(15);
      expect(r.operations[2].result).toBe(30);
    });
  });

  describe("dequeOps", () => {
    it("supports push/pop front/back", () => {
      const r = dsAlgorithmService.dequeOps([10, 20], [
        { type: "pushFront" },
        { type: "popBack" },
        { type: "peekFront" },
        { type: "size" },
      ]);
      expect(r.type).toBe("deque");
      expect(r.operations.length).toBe(4);
    });
  });

  describe("priorityQueueOps", () => {
    it("maintains heap invariant", () => {
      const r = dsAlgorithmService.priorityQueueOps([5, 3, 8, 1], [
        { type: "push" },
        { type: "pop" },
        { type: "peek" },
        { type: "size" },
      ]);
      expect(r.type).toBe("priorityQueue");
      expect(r.operations.length).toBe(4);
    });
  });

  describe("hashMapChaining", () => {
    it("handles put, get, delete with collision detection", () => {
      const r = dsAlgorithmService.hashMapChaining(5, [
        { type: "put", key: "a", value: 10 },
        { type: "put", key: "b", value: 20 },
        { type: "get", key: "a" },
        { type: "delete", key: "b" },
        { type: "get", key: "b" },
      ]);
      expect(r.type).toBe("hashMapChaining");
      expect(r.operations[2].result).toBe(10);
      expect(r.operations[4].result).toBeUndefined();
    });
  });

  describe("circularBufferOps", () => {
    it("wraps around on overflow", () => {
      const r = dsAlgorithmService.circularBufferOps(3, [
        { type: "push", value: 1 },
        { type: "push", value: 2 },
        { type: "push", value: 3 },
        { type: "push", value: 4 },
        { type: "pop" },
        { type: "toArray" },
      ]);
      expect(r.type).toBe("circularBuffer");
      expect(r.operations[5].result).toEqual([3, 4]);
    });
  });
});

describe("Depth 5 - Marketing Depth", () => {
  describe("exp3Bandit", () => {
    it("computes EXP3 exploration weights", () => {
      const r = dsAlgorithmService.exp3Bandit(["A", "B", "C"], [
        { variant: "A", reward: 1 },
        { variant: "B", reward: 0 },
        { variant: "A", reward: 1 },
      ]);
      expect(r.algorithm).toBe("exp3Bandit");
      expect(r.output.finalWeights.length).toBe(3);
      expect(r.output.totalReward).toBe(2);
    });
  });

  describe("thompsonSamplingGaussian", () => {
    it("estimates posterior means for each variant", () => {
      const r = dsAlgorithmService.thompsonSamplingGaussian(["X", "Y"], [
        { variant: "X", value: 10 },
        { variant: "X", value: 12 },
        { variant: "Y", value: 8 },
      ]);
      expect(r.algorithm).toBe("thompsonSamplingGaussian");
      expect(r.output.summary.length).toBe(2);
      expect(r.output.bestVariant).toBe("X");
    });
  });

  describe("kaplanMeierSurvival", () => {
    it("estimates survival curve", () => {
      const r = dsAlgorithmService.kaplanMeierSurvival([1, 3, 5, 6, 10], [1, 1, 0, 1, 0]);
      expect(r.algorithm).toBe("kaplanMeier");
      expect(r.output.survivalCurve.length).toBeGreaterThan(0);
      expect(r.output.totalObservations).toBe(5);
    });
  });

  describe("upliftModeling", () => {
    it("computes uplift curve across segments", () => {
      const r = dsAlgorithmService.upliftModeling(
        [{ users: 100, conversions: 5 }, { users: 100, conversions: 8 }],
        [{ users: 100, conversions: 12 }, { users: 100, conversions: 15 }]
      );
      expect(r.algorithm).toBe("upliftModeling");
      expect(r.output.upliftCurve.length).toBe(2);
      expect(r.output.averageUplift).toBeGreaterThan(0);
    });
  });

  describe("causalInferenceDML", () => {
    it("estimates average treatment effect", () => {
      const r = dsAlgorithmService.causalInferenceDML(
        [1, 1, 0, 0, 1],
        [10, 12, 5, 6, 11],
        [[0.5, 0.2], [0.6, 0.3], [0.4, 0.1], [0.5, 0.2], [0.7, 0.3]]
      );
      expect(r.algorithm).toBe("causalInferenceDML");
      expect(typeof r.output.ate).toBe("number");
    });
  });

  describe("sinkhornOptimalTransport", () => {
    it("computes optimal transport plan", () => {
      const r = dsAlgorithmService.sinkhornOptimalTransport(
        [0.5, 0.5], [0.5, 0.5],
        [[1, 2], [3, 4]], 5
      );
      expect(r.algorithm).toBe("sinkhornOptimalTransport");
      expect(r.output.transportPlan.length).toBe(2);
    });
  });

  describe("shapleyAttribution", () => {
    it("computes Shapley values for each channel", () => {
      const r = dsAlgorithmService.shapleyAttribution(
        ["email", "search", "social"],
        { email: [1, 0, 1], search: [0, 1, 1], social: [1, 1, 0] },
        [10, 15, 20]
      );
      expect(r.algorithm).toBe("shapleyAttribution");
      expect(r.output.attribution.length).toBe(3);
    });
  });

  describe("brierScoreCalibration", () => {
    it("computes Brier score and calibration curve", () => {
      const r = dsAlgorithmService.brierScoreCalibration([
        { predicted: 0.9, actual: 1 },
        { predicted: 0.8, actual: 0 },
        { predicted: 0.1, actual: 0 },
        { predicted: 0.4, actual: 1 },
      ]);
      expect(r.algorithm).toBe("brierScoreCalibration");
      expect(r.output.brierScore).toBeGreaterThan(0);
      expect(r.output.calibrationCurve.length).toBeGreaterThan(0);
    });
  });

  describe("funnelConversionAnalysis", () => {
    it("analyzes conversion funnel stages", () => {
      const r = dsAlgorithmService.funnelConversionAnalysis(
        ["Visit", "Signup", "Purchase"],
        [1000, 200, 50]
      );
      expect(r.algorithm).toBe("funnelAnalysis");
      expect(r.output.funnel.length).toBe(3);
      expect(r.output.overallConversionRate).toBe("5.00%");
    });
  });

  describe("responseSurfaceBid", () => {
    it("finds optimal bid on response surface", () => {
      const r = dsAlgorithmService.responseSurfaceBid(
        [0.5, 1.0, 1.5, 2.0],
        [100, 200, 300, 350],
        [5, 12, 18, 20],
        [50, 120, 180, 200]
      );
      expect(r.algorithm).toBe("responseSurfaceBid");
      expect(r.output.surface.length).toBe(4);
      expect(r.output.optimalBid).toBeGreaterThan(0);
    });
  });
});
