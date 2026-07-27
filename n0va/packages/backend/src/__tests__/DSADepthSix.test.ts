import { describe, it, expect } from "vitest";
import { dsAlgorithmService } from "../services/DSAlgorithmService";

describe("Depth 6 - Advanced Data Structures", () => {
  describe("sqrtDecomposition", () => {
    it("answers range sum queries with sqrt decomposition", () => {
      const r = dsAlgorithmService.sqrtDecomposition([1, 2, 3, 4, 5, 6, 7, 8], [
        { type: "sum", l: 0, r: 7 }, { type: "sum", l: 2, r: 5 }, { type: "min", l: 0, r: 7 },
        { type: "update", l: 0, r: 0, value: 10 },
      ]);
      expect(r.type).toBe("sqrtDecomposition");
      expect(r.size).toBe(8);
      expect(r.blockSize).toBeGreaterThan(0);
      expect(r.operations[0].result).toBe(36);
    });
  });

  describe("waveletTree", () => {
    it("answers kth and range count queries", () => {
      const r = dsAlgorithmService.waveletTree([3, 1, 4, 1, 5, 9, 2, 6], [
        { type: "kth", l: 0, r: 7, k: 2 }, { type: "rangeCount", l: 0, r: 7, low: 2, high: 5 },
      ]);
      expect(r.type).toBe("waveletTree");
      expect(r.array.length).toBe(8);
      expect(r.operations.length).toBe(2);
    });
  });

  describe("dancingLinks", () => {
    it("finds exact cover solutions", () => {
      const r = dsAlgorithmService.dancingLinks([
        [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0],
      ]);
      expect(r.type).toBe("dancingLinks");
      expect(r.solutionCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("linkCutTree", () => {
    it("handles link, cut, and connected queries", () => {
      const r = dsAlgorithmService.linkCutTree([
        { type: "link", u: "a", v: "b" }, { type: "link", u: "b", v: "c" },
        { type: "connected", u: "a", v: "c" }, { type: "cut", u: "b", v: "c" },
        { type: "connected", u: "a", v: "c" },
      ]);
      expect(r.type).toBe("linkCutTree");
      expect(r.operations[2].result).toBe(true);
      expect(r.operations[4].result).toBe(false);
    });
  });

  describe("vanEmdeBoas", () => {
    it("supports insert, delete, member, predecessor, successor", () => {
      const r = dsAlgorithmService.vanEmdeBoas(16, [
        { type: "insert", key: 5 }, { type: "insert", key: 10 },
        { type: "member", key: 5 }, { type: "predecessor", key: 8 },
        { type: "successor", key: 8 }, { type: "min" },
        { type: "delete", key: 5 }, { type: "member", key: 5 },
      ]);
      expect(r.type).toBe("vanEmdeBoas");
      expect(r.universe).toBe(16);
      expect(r.operations[2].result).toBe(true);
      expect(r.operations[7].result).toBe(false);
    });
  });

  describe("pairingHeap", () => {
    it("handles insert, extractMin, peek, size", () => {
      const r = dsAlgorithmService.pairingHeap([
        { type: "insert", value: 5 }, { type: "insert", value: 3 },
        { type: "insert", value: 7 }, { type: "peek" },
        { type: "extractMin" }, { type: "peek" }, { type: "size" },
      ]);
      expect(r.type).toBe("pairingHeap");
      expect(r.operations[3].value).toBe(3);
      expect(r.operations[4].value).toBe(3);
      expect(r.operations[5].value).toBe(5);
    });
  });

  describe("intervalMapStabbing", () => {
    it("finds interval values for query points", () => {
      const r = dsAlgorithmService.intervalMapStabbing(
        [{ low: 1, high: 5, value: "A" }, { low: 6, high: 10, value: "B" }],
        [3, 7, 11]
      );
      expect(r.type).toBe("intervalMap");
      expect(r.queries[0].result).toBe("A");
      expect(r.queries[1].result).toBe("B");
      expect(r.queries[2].result).toBeNull();
    });
  });
});

describe("Depth 6 - Advanced Algorithms", () => {
  describe("blossomMatching", () => {
    it("finds maximum matching in general graph", () => {
      const r = dsAlgorithmService.blossomMatching(
        ["a", "b", "c", "d"],
        [["a", "b"], ["b", "c"], ["c", "d"], ["a", "d"]]
      );
      expect(r.algorithm).toBe("blossom");
      expect(r.cardinality).toBeGreaterThanOrEqual(2);
    });
  });

  describe("gomoryHuTree", () => {
    it("computes Gomory-Hu cut tree", () => {
      const r = dsAlgorithmService.gomoryHuTree(
        ["a", "b", "c"],
        [{ from: "a", to: "b", weight: 10 }, { from: "b", to: "c", weight: 5 }]
      );
      expect(r.algorithm).toBe("gomoryHu");
      expect(r.tree.length).toBeGreaterThan(0);
    });
  });

  describe("fftMultiply", () => {
    it("multiplies two polynomials via FFT", () => {
      const r = dsAlgorithmService.fftMultiply([1, 2, 3], [4, 5, 6]);
      expect(r.algorithm).toBe("fftMultiply");
      expect(r.product).toEqual([4, 13, 28, 27, 18]);
    });
  });

  describe("kargerMinCut", () => {
    it("finds a minimum cut via Karger's algorithm", () => {
      const r = dsAlgorithmService.kargerMinCut(
        ["a", "b", "c", "d"],
        [{ from: "a", to: "b", weight: 1 }, { from: "a", to: "c", weight: 1 },
         { from: "a", to: "d", weight: 1 }, { from: "b", to: "c", weight: 10 },
         { from: "c", to: "d", weight: 10 }],
        20
      );
      expect(r.algorithm).toBe("kargerMinCut");
      expect(r.cutWeight).toBeGreaterThan(0);
      expect(r.trials).toBe(20);
    });
  });

  describe("nQueensSolver", () => {
    it("solves N-Queens for n=4", () => {
      const r = dsAlgorithmService.nQueensSolver(4);
      expect(r.algorithm).toBe("nQueens");
      expect(r.solutionCount).toBe(2);
      expect(r.solutions.length).toBe(2);
    });
  });

  describe("majorityElementMoore", () => {
    it("finds majority element using Boyer-Moore", () => {
      const r = dsAlgorithmService.majorityElementMoore([3, 3, 4, 2, 3, 3, 3]);
      expect(r.algorithm).toBe("majorityElement");
      expect(r.majority).toBe(3);
    });

    it("returns null when no majority element", () => {
      const r = dsAlgorithmService.majorityElementMoore([1, 2, 3, 4]);
      expect(r.majority).toBeNull();
    });
  });
});

describe("Depth 6 - String / DP", () => {
  describe("suffixAutomaton", () => {
    it("finds pattern occurrences in text", () => {
      const r = dsAlgorithmService.suffixAutomaton("banana", ["ana", "na", "b"]);
      expect(r.type).toBe("suffixAutomaton");
      expect(r.states).toBeGreaterThan(0);
      expect(r.operations.length).toBe(3);
    });
  });

  describe("lyndonFactorization", () => {
    it("computes Lyndon factorization", () => {
      const r = dsAlgorithmService.lyndonFactorization("abcab");
      expect(r.algorithm).toBe("lyndon");
      expect(r.factors.length).toBeGreaterThan(0);
      expect(r.factors.join("")).toBe("abcab");
    });
  });

  describe("runLengthEncoding", () => {
    it("encodes and decodes RLE", () => {
      const r = dsAlgorithmService.runLengthEncoding("aaabbcccc");
      expect(r.type).toBe("runLengthEncoding");
      expect(r.encoded).toEqual([{ char: "a", count: 3 }, { char: "b", count: 2 }, { char: "c", count: 4 }]);
      expect(r.decoded).toBe("aaabbcccc");
    });

    it("handles empty string", () => {
      const r = dsAlgorithmService.runLengthEncoding("");
      expect(r.encoded).toEqual([]);
    });
  });

  describe("soundexPhonetic", () => {
    it("computes Soundex code for a word", () => {
      const r = dsAlgorithmService.soundexPhonetic("Washington");
      expect(r.algorithm).toBe("soundex");
      expect(r.code).toBe("W252");
    });

    it("pads short codes with zeros", () => {
      const r = dsAlgorithmService.soundexPhonetic("Lee");
      expect(r.code).toBe("L000");
    });
  });

  describe("dpRodCutting", () => {
    it("finds optimal rod cutting", () => {
      const r = dsAlgorithmService.dpRodCutting([1, 5, 8, 9, 10, 17, 17, 20], 8);
      expect(r.algorithm).toBe("rodCutting");
      expect(r.maxValue).toBe(22);
    });
  });

  describe("dpOptimalBST", () => {
    it("finds optimal BST expected cost", () => {
      const r = dsAlgorithmService.dpOptimalBST(["A", "B", "C", "D"], [4, 2, 1, 3]);
      expect(r.algorithm).toBe("optimalBST");
      expect(r.expectedCost).toBeLessThan(30);
    });
  });
});

describe("Depth 6 - Enhanced Existing", () => {
  describe("multiSetBag", () => {
    it("handles add, remove, count, contains, mode", () => {
      const r = dsAlgorithmService.multiSetBag([
        { type: "add", value: 5 }, { type: "add", value: 5 }, { type: "add", value: 3 },
        { type: "count", value: 5 }, { type: "contains", value: 3 },
        { type: "remove", value: 5 }, { type: "mode" },
      ]);
      expect(r.type).toBe("multiSetBag");
      expect(r.operations[3].result).toBe(2);
      expect(r.operations[4].result).toBe(true);
    });
  });

  describe("fenwickTreeRangePoint", () => {
    it("supports range update and point query", () => {
      const r = dsAlgorithmService.fenwickTreeRangePoint(10, [
        { type: "rangeUpdate", l: 1, r: 5, value: 3 },
        { type: "rangeUpdate", l: 3, r: 8, value: 2 },
        { type: "pointQuery", idx: 2 }, { type: "pointQuery", idx: 6 },
      ]);
      expect(r.type).toBe("fenwickTreeRangePoint");
      expect(r.size).toBe(10);
      expect(r.operations[2].result).toBe(3);
      expect(r.operations[3].result).toBe(2);
    });
  });

  describe("unionBySize", () => {
    it("performs union by size operations", () => {
      const r = dsAlgorithmService.unionBySize([
        { type: "union", a: 0, b: 1 }, { type: "union", a: 2, b: 3 },
        { type: "find", a: 0 }, { type: "connected", a: 0, b: 1 },
        { type: "connected", a: 0, b: 2 },
      ]);
      expect(r.type).toBe("unionBySize");
      expect(r.operations[3].result).toBe(true);
      expect(r.operations[4].result).toBe(false);
    });
  });

  describe("binaryTrieXor", () => {
    it("finds max XOR for queries", () => {
      const r = dsAlgorithmService.binaryTrieXor([3, 10, 5, 25, 2, 8], [
        { xorWith: 5 }, { xorWith: 10 },
      ]);
      expect(r.type).toBe("binaryTrieXor");
      expect(r.queries[0].maxXor).toBe(28);
    });
  });
});

describe("Depth 6 - Marketing Depth", () => {
  describe("holtWintersForecast", () => {
    it("forecasts with Holt-Winters", () => {
      const r = dsAlgorithmService.holtWintersForecast([10, 12, 14, 10, 13, 15, 17, 13], 0.3, 0.1, 0.1, 4, 4);
      expect(r.algorithm).toBe("holtWinters");
      expect(r.forecast.length).toBe(4);
    });
  });

  describe("garchVolatility", () => {
    it("computes GARCH(1,1) conditional variance", () => {
      const r = dsAlgorithmService.garchVolatility([0.01, -0.02, 0.03, -0.01, 0.02], 0.01, 0.1, 0.8);
      expect(r.algorithm).toBe("garch");
      expect(r.conditionalVariance.length).toBe(5);
    });
  });

  describe("bayesianABTest", () => {
    it("computes Bayesian A/B test probability", () => {
      const r = dsAlgorithmService.bayesianABTest(
        { successes: 50, trials: 1000 },
        { successes: 80, trials: 1000 },
        500
      );
      expect(r.algorithm).toBe("bayesianAB");
      expect(r.control.mean).toBeGreaterThan(0);
      expect(r.treatment.mean).toBeGreaterThan(r.control.mean);
    });
  });

  describe("confidenceIntervalCalc", () => {
    it("computes Wilson confidence interval", () => {
      const r = dsAlgorithmService.confidenceIntervalCalc(50, 1000, 0.95);
      expect(r.algorithm).toBe("confidenceInterval");
      expect(r.lower).toBeLessThan(r.upper);
      expect(r.rate).toBe(0.05);
    });
  });

  describe("tTestTwoSample", () => {
    it("performs two-sample t-test", () => {
      const r = dsAlgorithmService.tTestTwoSample([1, 2, 3, 4, 5], [3, 4, 5, 6, 7]);
      expect(r.algorithm).toBe("tTest");
      expect(r.tStatistic).toBeLessThan(0);
    });
  });

  describe("monteCarloCLV", () => {
    it("estimates CLV via Monte Carlo simulation", () => {
      const r = dsAlgorithmService.monteCarloCLV(50, 4, 0.3, 0.1, 200);
      expect(r.algorithm).toBe("monteCarloCLV");
      expect(r.meanCLV).toBeGreaterThan(0);
    });
  });

  describe("adstockModel", () => {
    it("computes adstock with carryover effect", () => {
      const r = dsAlgorithmService.adstockModel([100, 200, 150, 300], 0.5, 2);
      expect(r.algorithm).toBe("adstock");
      expect(r.adstocked.length).toBe(4);
      expect(r.adstocked[0]).toBe(100);
    });
  });

  describe("efficientFrontierAlloc", () => {
    it("finds efficient frontier portfolios", () => {
      const r = dsAlgorithmService.efficientFrontierAlloc(
        ["A", "B"], [0.1, 0.15], [0.2, 0.3], [[1, 0.3], [0.3, 1]], 5
      );
      expect(r.algorithm).toBe("efficientFrontier");
      expect(r.portfolios.length).toBeLessThanOrEqual(6);
      expect(r.optimalPortfolio.sharpe).toBeGreaterThan(0);
    });
  });

  describe("mediaSaturationCurve", () => {
    it("fits media saturation curve", () => {
      const r = dsAlgorithmService.mediaSaturationCurve(
        [10, 20, 40, 80, 160],
        [5, 9, 15, 20, 22]
      );
      expect(r.algorithm).toBe("mediaSaturation");
      expect(r.fitted.length).toBe(5);
      expect(r.saturationPoint).toBeGreaterThan(0);
    });
  });

  describe("timeDecayAttribution", () => {
    it("attributes conversions with time decay", () => {
      const r = dsAlgorithmService.timeDecayAttribution([
        { channel: "email", time: 0 },
        { channel: "search", time: 2 },
        { channel: "social", time: 5 },
      ], 0.5);
      expect(r.algorithm).toBe("timeDecayAttribution");
      expect(r.attributed.length).toBe(3);
    });
  });
});
