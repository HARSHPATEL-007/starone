import { describe, it, expect } from "vitest";
import { dsAlgorithmService } from "../services/DSAlgorithmService";

describe("Depth 8 - Advanced Data Structures", () => {
  describe("hllCardinality", () => {
    it("estimates cardinality with HyperLogLog", () => {
      const r = dsAlgorithmService.hllCardinality([1, 2, 3, 4, 5, 1, 2, 3], 64);
      expect(r.algorithm).toBe("hllCardinality");
      expect(r.cardinality).toBeGreaterThan(0);
      expect(r.registers.length).toBe(64);
    });
  });

  describe("countMinSketch", () => {
    it("estimates frequency via Count-Min Sketch", () => {
      const r = dsAlgorithmService.countMinSketch([
        { type: "add", item: "apple", count: 10 },
        { type: "add", item: "banana", count: 5 },
        { type: "estimate", item: "apple" },
        { type: "estimate", item: "banana" },
        { type: "estimate", item: "cherry" },
      ]);
      expect(r.algorithm).toBe("countMinSketch");
      expect(r.operations[2].estimate).toBeGreaterThan(0);
    });
  });

  describe("weightedBloomFilter", () => {
    it("adds and tests items with weighted hashing", () => {
      const r = dsAlgorithmService.weightedBloomFilter([
        { type: "add", item: "foo", weight: 2 },
        { type: "add", item: "bar" },
        { type: "test", item: "foo" },
        { type: "test", item: "baz" },
      ]);
      expect(r.algorithm).toBe("weightedBloomFilter");
      expect(r.results[2].present).toBe(true);
    });
  });

  describe("segmentTreeBeats", () => {
    it("applies range min/max/add/sum operations", () => {
      const r = dsAlgorithmService.segmentTreeBeats([1, 5, 3, 7, 2], [
        { type: "min", l: 0, r: 2, val: 3 },
        { type: "max", l: 2, r: 4, val: 6 },
        { type: "sum", l: 0, r: 4 },
      ]);
      expect(r.algorithm).toBe("segmentTreeBeats");
      expect(r.operations[2].sum).toBeGreaterThan(0);
    });
  });

  describe("lcaBinaryLifting", () => {
    it("computes LCA and distances", () => {
      const r = dsAlgorithmService.lcaBinaryLifting(
        ["A", "B", "C", "D"],
        [["A", "B"], ["A", "C"], ["B", "D"]],
        [["D", "C"], ["D", "B"]]
      );
      expect(r.algorithm).toBe("lcaBinaryLifting");
      expect(r.queries.length).toBe(2);
    });
  });

  describe("dynamicLIS", () => {
    it("tracks LIS length after each insertion", () => {
      const r = dsAlgorithmService.dynamicLIS([3, 1, 4, 1, 5, 9]);
      expect(r.algorithm).toBe("dynamicLIS");
      expect(r.lisLengths[r.lisLengths.length - 1]).toBeGreaterThan(0);
    });
  });

  describe("rangeModeQuery", () => {
    it("finds mode in subranges", () => {
      const r = dsAlgorithmService.rangeModeQuery([1, 2, 2, 3, 3, 3], [
        { l: 0, r: 2 },
        { l: 3, r: 5 },
      ]);
      expect(r.algorithm).toBe("rangeModeQuery");
      expect(r.queries[1].mode).toBe(3);
    });
  });
});

describe("Depth 8 - Advanced Algorithms", () => {
  describe("kuhnMunkres", () => {
    it("solves assignment problem", () => {
      const r = dsAlgorithmService.kuhnMunkres([
        [4, 1, 3],
        [2, 0, 5],
        [3, 2, 2],
      ]);
      expect(r.algorithm).toBe("kuhnMunkres");
      expect(r.assignment.length).toBeGreaterThan(0);
    });
  });

  describe("tabuSearch", () => {
    it("searches 2D landscape", () => {
      const fitness = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => Math.random()));
      const r = dsAlgorithmService.tabuSearch(fitness, { tabuSize: 5, maxIter: 20 });
      expect(r.algorithm).toBe("tabuSearch");
      expect(r.path.length).toBeGreaterThan(0);
    });
  });

  describe("iterativeDeepening", () => {
    it("finds path via IDDFS", () => {
      const r = dsAlgorithmService.iterativeDeepening(
        [{ from: "A", to: "B" }, { from: "B", to: "C" }, { from: "C", to: "D" }],
        "A", "D", 5
      );
      expect(r.algorithm).toBe("iterativeDeepening");
      expect(r.found).toBe(true);
    });
  });

  describe("geneticAlgorithm", () => {
    it("evolves toward maximum", () => {
      const r = dsAlgorithmService.geneticAlgorithm({ populationSize: 30, generations: 20 });
      expect(r.algorithm).toBe("geneticAlgorithm");
      expect(r.fitnessHistory.length).toBeGreaterThan(0);
    });
  });

  describe("antColony", () => {
    it("finds tour in TSP instance", () => {
      const dist = [
        [0, 2, 9, 10],
        [1, 0, 6, 4],
        [15, 7, 0, 8],
        [6, 3, 12, 0],
      ];
      const r = dsAlgorithmService.antColony(dist, { nAnts: 4, nIterations: 10 });
      expect(r.algorithm).toBe("antColony");
      expect(r.bestLength).toBeGreaterThan(0);
    });
  });

  describe("edmondsKarp", () => {
    it("computes max flow", () => {
      const cap = [
        [0, 10, 10, 0],
        [0, 0, 2, 10],
        [0, 0, 0, 10],
        [0, 0, 0, 0],
      ];
      const r = dsAlgorithmService.edmondsKarp(cap, 0, 3);
      expect(r.algorithm).toBe("edmondsKarp");
      expect(r.maxFlow).toBeGreaterThan(0);
    });
  });

  describe("twoSat", () => {
    it("solves satisfiable 2-SAT instance", () => {
      const r = dsAlgorithmService.twoSat(3, [
        { a: 0, b: 1 }, { a: -1, b: 2 }, { a: -2, b: -0 },
      ].map(c => ({ a: c.a < 0 ? c.a + 3 : c.a, b: c.b < 0 ? c.b + 3 : c.b })));
      expect(r.algorithm).toBe("twoSat");
      expect(r.satisfiable).toBe(true);
    });
  });
});

describe("Depth 8 - String / DP", () => {
  describe("wordBreak", () => {
    it("segments string from dictionary", () => {
      const r = dsAlgorithmService.wordBreak("leetcode", ["leet", "code"]);
      expect(r.algorithm).toBe("wordBreak");
      expect(r.canBreak).toBe(true);
      expect(r.segmentation.length).toBeGreaterThan(0);
    });
  });

  describe("interleavingString", () => {
    it("checks interleaving property", () => {
      const r = dsAlgorithmService.interleavingString("aab", "axy", "aaxaby");
      expect(r.algorithm).toBe("interleavingString");
    });
  });

  describe("palindromeQueries", () => {
    it("checks substring palindromes", () => {
      const r = dsAlgorithmService.palindromeQueries("racecar", [
        { l: 0, r: 2 }, { l: 0, r: 6 },
      ]);
      expect(r.algorithm).toBe("palindromeQueries");
      expect(r.queries[1].isPalindrome).toBe(true);
    });
  });

  describe("damLevDistance", () => {
    it("computes Damerau-Levenshtein distance", () => {
      const r = dsAlgorithmService.damLevDistance("kitten", "sitting");
      expect(r.algorithm).toBe("damLevDistance");
      expect(r.distance).toBeGreaterThan(0);
      expect(r.similarity).toBeGreaterThan(0);
    });
  });

  describe("burstBalloon", () => {
    it("computes max coins", () => {
      const r = dsAlgorithmService.burstBalloon([3, 1, 5, 8]);
      expect(r.algorithm).toBe("burstBalloon");
      expect(r.maxCoins).toBeGreaterThan(0);
    });
  });

  describe("booleanParenthesization", () => {
    it("counts ways to get true", () => {
      const r = dsAlgorithmService.booleanParenthesization("T|F&T", true);
      expect(r.algorithm).toBe("booleanParenthesization");
      expect(r.ways).toBeGreaterThan(0);
    });
  });

  describe("countDistinctSubseq", () => {
    it("counts distinct subsequences", () => {
      const r = dsAlgorithmService.countDistinctSubseq("abc");
      expect(r.algorithm).toBe("countDistinctSubseq");
      expect(r.count).toBeGreaterThan(0);
    });
  });
});

describe("Depth 8 - Enhanced Existing", () => {
  describe("treapSplitMerge", () => {
    it("handles insert, delete, kth operations", () => {
      const r = dsAlgorithmService.treapSplitMerge([5, 3, 7], [
        { type: "insert", key: 4 },
        { type: "kth", index: 2 },
        { type: "delete", key: 7 },
      ]);
      expect(r.algorithm).toBe("treapSplitMerge");
      expect(r.operations.length).toBe(3);
    });
  });

  describe("dsuRollback", () => {
    it("supports union and query", () => {
      const r = dsAlgorithmService.dsuRollback([
        { type: "union", a: 0, b: 1 },
        { type: "query", a: 0, b: 1 },
        { type: "query", a: 0, b: 2 },
      ]);
      expect(r.algorithm).toBe("dsuRollback");
      expect(r.operations[1].same).toBe(true);
      expect(r.operations[2].same).toBe(false);
    });
  });

  describe("rangeKthQuery", () => {
    it("finds kth smallest in range", () => {
      const r = dsAlgorithmService.rangeKthQuery([1, 5, 2, 6, 3, 7], [
        { l: 0, r: 3, k: 2 },
        { l: 2, r: 5, k: 3 },
      ]);
      expect(r.algorithm).toBe("rangeKthQuery");
      expect(r.queries.length).toBe(2);
    });
  });

  describe("matrixMedian", () => {
    it("finds median of sorted matrix", () => {
      const r = dsAlgorithmService.matrixMedian([
        [1, 3, 5],
        [2, 6, 9],
        [3, 6, 9],
      ]);
      expect(r.algorithm).toBe("matrixMedian");
      expect(r.median).toBeGreaterThan(0);
    });
  });

  describe("nextGreaterElement", () => {
    it("finds next greater for each element", () => {
      const r = dsAlgorithmService.nextGreaterElement([2, 1, 3, 5, 4]);
      expect(r.algorithm).toBe("nextGreaterElement");
      expect(r.nge[0]).toBe(3);
      expect(r.nge[2]).toBe(5);
    });
  });

  describe("maxSlidingWindow", () => {
    it("finds max in each sliding window", () => {
      const r = dsAlgorithmService.maxSlidingWindow([1, 3, -1, -3, 5, 3, 6, 7], 3);
      expect(r.algorithm).toBe("maxSlidingWindow");
      expect(r.maxValues[0]).toBe(3);
      expect(r.maxValues[r.maxValues.length - 1]).toBe(7);
    });
  });

  describe("skylineProblem", () => {
    it("computes skyline key points", () => {
      const r = dsAlgorithmService.skylineProblem([
        { l: 0, r: 2, h: 3 },
        { l: 1, r: 3, h: 2 },
      ]);
      expect(r.algorithm).toBe("skylineProblem");
      expect(r.skyline.length).toBeGreaterThan(0);
    });
  });
});

describe("Depth 8 - Marketing Depth", () => {
  describe("inverseProbabilityWeighting", () => {
    it("estimates ATE via IPW", () => {
      const r = dsAlgorithmService.inverseProbabilityWeighting(
        [1, 1, 0, 0], [10, 12, 8, 9], [0.8, 0.7, 0.3, 0.2]
      );
      expect(r.algorithm).toBe("inverseProbabilityWeighting");
      expect(r.totalN).toBe(4);
    });
  });

  describe("syntheticControl", () => {
    it("finds donor weights to match treated", () => {
      const treated = [10, 12, 15, 18, 22];
      const donors = [
        [9, 11, 14, 17, 20],
        [11, 13, 16, 19, 24],
      ];
      const r = dsAlgorithmService.syntheticControl(treated, donors);
      expect(r.algorithm).toBe("syntheticControl");
      expect(r.weights.length).toBeGreaterThan(0);
    });
  });

  describe("survivalAnalysis", () => {
    it("computes Kaplan-Meier survival function", () => {
      const r = dsAlgorithmService.survivalAnalysis([1, 3, 5, 7, 9], [1, 1, 0, 1, 0]);
      expect(r.algorithm).toBe("survivalAnalysis");
      expect(r.survivalFunction.length).toBeGreaterThan(0);
    });
  });

  describe("propensityScoreMatching", () => {
    it("matches treated to control units", () => {
      const treatment = [[1, 2], [2, 3]];
      const control = [[1, 1], [2, 2], [3, 3]];
      const r = dsAlgorithmService.propensityScoreMatching(treatment, control);
      expect(r.algorithm).toBe("propensityScoreMatching");
      expect(r.matchedPairs.length).toBeGreaterThan(0);
    });
  });

  describe("marketBasketAnalysis", () => {
    it("finds frequent itemsets and rules", () => {
      const transactions = [
        ["milk", "bread", "eggs"],
        ["milk", "bread"],
        ["bread", "eggs"],
        ["milk", "eggs"],
        ["milk", "bread", "butter"],
      ];
      const r = dsAlgorithmService.marketBasketAnalysis(transactions);
      expect(r.algorithm).toBe("marketBasketAnalysis");
      expect(r.totalTransactions).toBe(5);
    });
  });

  describe("priceElasticity", () => {
    it("estimates price elasticity of demand", () => {
      const r = dsAlgorithmService.priceElasticity(
        [10, 12, 15, 20, 25],
        [100, 90, 75, 55, 40]
      );
      expect(r.algorithm).toBe("priceElasticity");
      expect(typeof r.elasticity).toBe("number");
    });
  });

  describe("cohortRetention", () => {
    it("computes retention curves per cohort", () => {
      const r = dsAlgorithmService.cohortRetention([
        { period: "2024-01", total: 100, retained: [80, 60, 45] },
        { period: "2024-02", total: 120, retained: [95, 70, 50] },
      ]);
      expect(r.algorithm).toBe("cohortRetention");
      expect(r.cohorts.length).toBe(2);
      expect(r.avgRetentionCurve.length).toBeGreaterThan(0);
    });
  });
});
