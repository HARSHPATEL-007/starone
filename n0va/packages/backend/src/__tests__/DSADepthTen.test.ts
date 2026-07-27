import { describe, it, expect } from "vitest";
import { dsAlgorithmService } from "../services/DSAlgorithmService";

describe("Depth 10 - Advanced Graph", () => {
  describe("stoerWagner", () => {
    it("computes global min cut", () => {
      const r = dsAlgorithmService.stoerWagner([
        [0, 4, 2, 0],
        [4, 0, 3, 1],
        [2, 3, 0, 5],
        [0, 1, 5, 0],
      ]);
      expect(r.algorithm).toBe("stoerWagner");
      expect(r.minCut).toBeGreaterThanOrEqual(0);
    });
  });

  describe("minCostFlow", () => {
    it("computes min cost flow", () => {
      const cap = [
        [0, 10, 10, 0],
        [0, 0, 0, 10],
        [0, 0, 0, 10],
        [0, 0, 0, 0],
      ];
      const cst = [
        [0, 1, 2, 0],
        [0, 0, 0, 1],
        [0, 0, 0, 2],
        [0, 0, 0, 0],
      ];
      const r = dsAlgorithmService.minCostFlow(cap, cst, 0, 3, 5);
      expect(r.algorithm).toBe("minCostFlow");
      expect(r.flow).toBeGreaterThan(0);
    });
  });

  describe("kCenters", () => {
    it("finds k centers using farthest-first", () => {
      const r = dsAlgorithmService.kCenters(
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 3 }],
        2
      );
      expect(r.algorithm).toBe("kCenters");
      expect(r.centers.length).toBe(2);
    });
  });

  describe("maxBipMatch", () => {
    it("finds maximum bipartite matching", () => {
      const r = dsAlgorithmService.maxBipMatch(
        [{ u: 0, v: 0 }, { u: 0, v: 1 }, { u: 1, v: 1 }],
        2, 2
      );
      expect(r.algorithm).toBe("maxBipMatch");
      expect(r.size).toBeGreaterThan(0);
    });
  });

  describe("dominatorTree", () => {
    it("computes immediate dominators", () => {
      const r = dsAlgorithmService.dominatorTree(
        [[1, 2], [3], [3], []],
        0
      );
      expect(r.algorithm).toBe("dominatorTree");
      expect(r.idom.length).toBe(4);
    });
  });

  describe("boruvkaMst", () => {
    it("finds MST via Boruvka", () => {
      const r = dsAlgorithmService.boruvkaMst(
        [{ u: 0, v: 1, w: 1 }, { u: 1, v: 2, w: 2 }, { u: 0, v: 2, w: 3 }],
        3
      );
      expect(r.algorithm).toBe("boruvkaMst");
      expect(r.totalWeight).toBeGreaterThan(0);
    });
  });

  describe("treeCentroidDecomp", () => {
    it("finds tree centroid", () => {
      const r = dsAlgorithmService.treeCentroidDecomp(
        [{ u: 0, v: 1 }, { u: 1, v: 2 }, { u: 1, v: 3 }],
        4
      );
      expect(r.algorithm).toBe("treeCentroidDecomp");
      expect(r.centroid).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("Depth 10 - String & Geometry", () => {
  describe("manacherPalindromes", () => {
    it("finds all palindromic substrings", () => {
      const r = dsAlgorithmService.manacherPalindromes("ababa");
      expect(r.algorithm).toBe("manacherPalindromes");
      expect(r.count).toBeGreaterThan(0);
    });
  });

  describe("suffixArrayLinear", () => {
    it("builds suffix array and LCP", () => {
      const r = dsAlgorithmService.suffixArrayLinear("banana");
      expect(r.algorithm).toBe("suffixArrayLinear");
      expect(r.suffixArray.length).toBe(6);
    });
  });

  describe("rollingHashSearch", () => {
    it("finds pattern positions via rolling hash", () => {
      const r = dsAlgorithmService.rollingHashSearch("abcabcabc", ["abc", "bc"]);
      expect(r.algorithm).toBe("rollingHashSearch");
      expect(r.matches.length).toBe(2);
    });
  });

  describe("ahocorasickMatch", () => {
    it("finds pattern positions via Aho-Corasick", () => {
      const r = dsAlgorithmService.ahocorasickMatch("helloworld", ["hello", "world"]);
      expect(r.algorithm).toBe("ahocorasickMatch");
      expect(r.matches.length).toBe(2);
    });
  });

  describe("closestPairPoints", () => {
    it("finds closest pair of points", () => {
      const r = dsAlgorithmService.closestPairPoints([
        { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0.1, y: 0.1 },
      ]);
      expect(r.algorithm).toBe("closestPairPoints");
      expect(r.distance).toBeGreaterThan(0);
    });
  });

  describe("rotatingCalipers", () => {
    it("computes width and diameter", () => {
      const r = dsAlgorithmService.rotatingCalipers([
        { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 },
      ]);
      expect(r.algorithm).toBe("rotatingCalipers");
      expect(r.diameter).toBeGreaterThan(0);
    });
  });

  describe("halfplaneIntersect", () => {
    it("finds feasible intersection point", () => {
      const r = dsAlgorithmService.halfplaneIntersect([
        { a: 1, b: 0, c: 1 },
        { a: 0, b: 1, c: 1 },
        { a: -1, b: 0, c: 0 },
        { a: 0, b: -1, c: 0 },
      ]);
      expect(r.algorithm).toBe("halfplaneIntersect");
      expect(typeof r.feasible).toBe("boolean");
    });
  });
});

describe("Depth 10 - Math & Number Theory", () => {
  describe("fastFourierTransform", () => {
    it("multiplies polynomials", () => {
      const r = dsAlgorithmService.fastFourierTransform([1, 2, 3], [4, 5, 6]);
      expect(r.algorithm).toBe("fastFourierTransform");
      expect(r.product.length).toBeGreaterThan(0);
    });
  });

  describe("matrixExponentiation", () => {
    it("raises matrix to power", () => {
      const r = dsAlgorithmService.matrixExponentiation([[1, 1], [1, 0]], 3);
      expect(r.algorithm).toBe("matrixExponentiation");
      expect(r.result.length).toBe(2);
    });
  });

  describe("linearDiophantine", () => {
    it("solves ax + by = c", () => {
      const r = dsAlgorithmService.linearDiophantine(2, 3, 7);
      expect(r.algorithm).toBe("linearDiophantine");
      expect(r.hasSolution).toBe(true);
    });
  });

  describe("chineseRemainder", () => {
    it("solves CRT system", () => {
      const r = dsAlgorithmService.chineseRemainder([{ r: 2, m: 3 }, { r: 3, m: 5 }, { r: 2, m: 7 }]);
      expect(r.algorithm).toBe("chineseRemainder");
      expect(r.hasSolution).toBe(true);
    });
  });

  describe("berlekampMassey", () => {
    it("finds linear recurrence", () => {
      const r = dsAlgorithmService.berlekampMassey([1, 1, 2, 3, 5, 8, 13]);
      expect(r.algorithm).toBe("berlekampMassey");
      expect(r.order).toBeGreaterThan(0);
    });
  });

  describe("millRabinPrimality", () => {
    it("tests primality", () => {
      const r = dsAlgorithmService.millRabinPrimality(17, 5);
      expect(r.algorithm).toBe("millRabinPrimality");
      expect(r.isPrime).toBe(true);
    });
  });

  describe("pollardRhoFactor", () => {
    it("factors a composite number", () => {
      const r = dsAlgorithmService.pollardRhoFactor(84);
      expect(r.algorithm).toBe("pollardRhoFactor");
      expect(r.factors.length).toBeGreaterThan(0);
    });
  });
});

describe("Depth 10 - DP & Optimization", () => {
  describe("divideAndConquerDP", () => {
    it("solves DP with divide and conquer", () => {
      const r = dsAlgorithmService.divideAndConquerDP(
        [[0, 1, 2], [1, 0, 3], [2, 3, 0]],
        2
      );
      expect(r.algorithm).toBe("divideAndConquerDP");
      expect(r.minCost).toBeGreaterThan(0);
    });
  });

  describe("bitmaskDP", () => {
    it("solves TSP with bitmask DP", () => {
      const r = dsAlgorithmService.bitmaskDP([
        [0, 10, 15, 20],
        [10, 0, 35, 25],
        [15, 35, 0, 30],
        [20, 25, 30, 0],
      ]);
      expect(r.algorithm).toBe("bitmaskDP");
      expect(r.minCost).toBeGreaterThan(0);
    });
  });

  describe("convexHullTrick", () => {
    it("evaluates lines at query points", () => {
      const r = dsAlgorithmService.convexHullTrick(
        [{ m: 1, b: 0 }, { m: -1, b: 3 }],
        [0, 1, 2]
      );
      expect(r.algorithm).toBe("convexHullTrick");
      expect(r.evaluations.length).toBe(3);
    });
  });

  describe("knuthDP", () => {
    it("solves optimal BST problem", () => {
      const r = dsAlgorithmService.knuthDP([4, 2, 6, 3]);
      expect(r.algorithm).toBe("knuthDP");
      expect(r.minCost).toBeGreaterThan(0);
    });
  });

  describe("dpWithProfile", () => {
    it("finds max sum with profile DP", () => {
      const r = dsAlgorithmService.dpWithProfile([[1, 2], [3, 4]]);
      expect(r.algorithm).toBe("dpWithProfile");
      expect(r.maxSum).toBeGreaterThan(0);
    });
  });

  describe("maxRectHistogram", () => {
    it("finds largest rectangle in histogram", () => {
      const r = dsAlgorithmService.maxRectHistogram([2, 1, 5, 6, 2, 3]);
      expect(r.algorithm).toBe("maxRectHistogram");
      expect(r.maxArea).toBe(10);
    });
  });

  describe("longestPathDAG", () => {
    it("finds longest path in DAG", () => {
      const r = dsAlgorithmService.longestPathDAG(
        [{ from: 0, to: 1, weight: 2 }, { from: 1, to: 2, weight: 3 }, { from: 0, to: 2, weight: 4 }],
        3
      );
      expect(r.algorithm).toBe("longestPathDAG");
      expect(r.longestLength).toBeGreaterThan(0);
    });
  });
});

describe("Depth 10 - Data Science & Analytics", () => {
  describe("kernelDensityEstimate", () => {
    it("estimates density with Gaussian kernel", () => {
      const r = dsAlgorithmService.kernelDensityEstimate([1, 2, 3, 4, 5], 1.0, 10);
      expect(r.algorithm).toBe("kernelDensityEstimate");
      expect(r.density.length).toBe(11);
    });
  });

  describe("pcaWhitening", () => {
    it("performs PCA whitening", () => {
      const r = dsAlgorithmService.pcaWhitening([[1, 2], [3, 4], [5, 6]]);
      expect(r.algorithm).toBe("pcaWhitening");
      expect(r.whitened.length).toBe(3);
    });
  });

  describe("knnRegression", () => {
    it("predicts with k-nearest neighbors", () => {
      const r = dsAlgorithmService.knnRegression(
        [[1], [2], [3], [4]],
        [2, 4, 6, 8],
        [[1.5], [3.5]],
        2
      );
      expect(r.algorithm).toBe("knnRegression");
      expect(r.predictions.length).toBe(2);
    });
  });

  describe("arimaForecast", () => {
    it("forecasts with ARIMA model", () => {
      const r = dsAlgorithmService.arimaForecast(
        [10, 12, 15, 13, 16, 18, 20],
        { p: 1, d: 0, q: 1 },
        3
      );
      expect(r.algorithm).toBe("arimaForecast");
      expect(r.forecast.length).toBe(3);
    });
  });

  describe("decisionTreeRegressor", () => {
    it("builds and predicts with decision tree", () => {
      const r = dsAlgorithmService.decisionTreeRegressor(
        [[1, 2], [2, 3], [3, 4]],
        [10, 20, 30],
        [[1.5, 2.5]]
      );
      expect(r.algorithm).toBe("decisionTreeRegressor");
      expect(r.predictions.length).toBe(1);
    });
  });

  describe("quantileRegression", () => {
    it("fits quantile regression model", () => {
      const r = dsAlgorithmService.quantileRegression(
        [[1], [2], [3], [4]],
        [2, 4, 6, 8],
        0.5,
        [[1.5], [3.5]]
      );
      expect(r.algorithm).toBe("quantileRegression");
      expect(r.predictions.length).toBe(2);
    });
  });

  describe("gaussianProcess", () => {
    it("fits GP and predicts with uncertainty", () => {
      const r = dsAlgorithmService.gaussianProcess(
        [1, 2, 3, 4],
        [2, 4, 6, 8],
        [1.5, 3.5],
        1.0, 1.0, 0.1
      );
      expect(r.algorithm).toBe("gaussianProcess");
      expect(r.mean.length).toBe(2);
    });
  });
});
