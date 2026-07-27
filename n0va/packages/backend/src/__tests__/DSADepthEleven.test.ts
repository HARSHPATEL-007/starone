import { describe, it, expect } from "vitest";
import { dsAlgorithmService } from "../services/DSAlgorithmService";

describe("Depth 11 - Number Theory & Combinatorics", () => {
  describe("sieveOfEratosthenes", () => {
    it("finds all primes up to limit", () => {
      const r = dsAlgorithmService.sieveOfEratosthenes(30);
      expect(r.algorithm).toBe("sieveOfEratosthenes");
      expect(r.primeCount).toBeGreaterThan(0);
      expect(r.primes.length).toBe(r.primeCount);
      expect(r.primes).toContain(2);
      expect(r.primes).toContain(3);
      expect(r.primes).toContain(5);
    });
  });

  describe("extendedEuclidean", () => {
    it("computes gcd and Bézout coefficients", () => {
      const r = dsAlgorithmService.extendedEuclidean(48, 18);
      expect(r.algorithm).toBe("extendedEuclidean");
      expect(r.gcd).toBe(6);
      expect(r.a * r.x + r.b * r.y).toBe(r.gcd);
    });
  });

  describe("chineseRemainderTheorem", () => {
    it("solves CRT system", () => {
      const r = dsAlgorithmService.chineseRemainderTheorem([2, 3, 2], [3, 5, 7]);
      expect(r.algorithm).toBe("chineseRemainderTheorem");
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.moduli.length).toBe(3);
    });
  });

  describe("binomialCoefficient", () => {
    it("computes C(n,k)", () => {
      const r = dsAlgorithmService.binomialCoefficient(10, 3);
      expect(r.algorithm).toBe("binomialCoefficient");
      expect(r.value).toBe(120);
    });
  });

  describe("catalanNumber", () => {
    it("computes nth Catalan number", () => {
      const r = dsAlgorithmService.catalanNumber(5);
      expect(r.algorithm).toBe("catalanNumber");
      expect(r.value).toBe(42);
    });
  });

  describe("stirlingSecond", () => {
    it("computes Stirling numbers of the second kind", () => {
      const r = dsAlgorithmService.stirlingSecond(5, 2);
      expect(r.algorithm).toBe("stirlingSecond");
      expect(r.value).toBeGreaterThan(0);
    });
  });

  describe("integerPartitions", () => {
    it("counts integer partitions", () => {
      const r = dsAlgorithmService.integerPartitions(10);
      expect(r.algorithm).toBe("integerPartitions");
      expect(r.count).toBe(42);
    });
  });
});

describe("Depth 11 - Root Finding & Optimization", () => {
  describe("bisectionMethod", () => {
    it("finds root of x² - 4 = 0", () => {
      const r = dsAlgorithmService.bisectionMethod((x: number) => x * x - 4, 0, 5);
      expect(r.algorithm).toBe("bisectionMethod");
      expect(Math.abs(r.root - 2)).toBeLessThan(0.01);
      expect(r.converged).toBe(true);
      expect(r.iterations).toBeGreaterThan(0);
    });
  });

  describe("newtonRaphson", () => {
    it("finds root via Newton-Raphson", () => {
      const f = (x: number) => x * x - 4;
      const fp = (x: number) => 2 * x;
      const r = dsAlgorithmService.newtonRaphson(f, fp, 5);
      expect(r.algorithm).toBe("newtonRaphson");
      expect(Math.abs(r.root - 2)).toBeLessThan(0.01);
      expect(r.converged).toBe(true);
    });
  });

  describe("secantMethod", () => {
    it("finds root via secant method", () => {
      const r = dsAlgorithmService.secantMethod((x: number) => x * x - 4, 1, 5);
      expect(r.algorithm).toBe("secantMethod");
      expect(Math.abs(r.root - 2)).toBeLessThan(0.01);
      expect(r.converged).toBe(true);
    });
  });

  describe("simulatedAnnealingOpt", () => {
    it("minimizes sphere function", () => {
      const r = dsAlgorithmService.simulatedAnnealingOpt(
        (x: number[]) => x[0] * x[0] + x[1] * x[1],
        [[-5, 5], [-5, 5]],
        100, 0.95, 500
      );
      expect(r.algorithm).toBe("simulatedAnnealingOpt");
      expect(r.bestSolution.length).toBe(2);
      expect(typeof r.bestValue).toBe("number");
      expect(r.finalTemp).toBeGreaterThan(0);
      expect(r.steps).toBe(500);
    });
  });

  describe("geneticAlgorithmOpt", () => {
    it("optimizes with genetic algorithm", () => {
      const r = dsAlgorithmService.geneticAlgorithmOpt(
        (x: number[]) => x[0] * x[0] + x[1] * x[1],
        [[-5, 5], [-5, 5]],
        50, 50, 0.1, 0.8
      );
      expect(r.algorithm).toBe("geneticAlgorithmOpt");
      expect(r.bestSolution.length).toBe(2);
      expect(typeof r.bestValue).toBe("number");
      expect(r.generations).toBe(50);
    });
  });

  describe("particleSwarm", () => {
    it("optimizes with particle swarm", () => {
      const r = dsAlgorithmService.particleSwarm(
        (x: number[]) => x[0] * x[0] + x[1] * x[1],
        [[-5, 5], [-5, 5]],
        20, 50
      );
      expect(r.algorithm).toBe("particleSwarm");
      expect(r.bestPosition.length).toBe(2);
      expect(typeof r.bestValue).toBe("number");
      expect(r.iterations).toBe(50);
    });
  });

  describe("hillClimbing", () => {
    it("optimizes with hill climbing", () => {
      const r = dsAlgorithmService.hillClimbing(
        (x: number[]) => x[0] * x[0] + x[1] * x[1],
        [[-5, 5], [-5, 5]],
        100, 0.1
      );
      expect(r.algorithm).toBe("hillClimbing");
      expect(r.bestSolution.length).toBe(2);
      expect(typeof r.bestValue).toBe("number");
      expect(r.iterations).toBe(100);
    });
  });
});

describe("Depth 11 - Sequence & Text", () => {
  describe("smithWaterman", () => {
    it("performs local sequence alignment", () => {
      const r = dsAlgorithmService.smithWaterman("GATTACA", "GCATGCU");
      expect(r.algorithm).toBe("smithWaterman");
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(typeof r.alignmentA).toBe("string");
      expect(typeof r.alignmentB).toBe("string");
      expect(r.scoreMatrix.length).toBeGreaterThan(0);
    });
  });

  describe("needlemanWunsch", () => {
    it("performs global sequence alignment", () => {
      const r = dsAlgorithmService.needlemanWunsch("GATTACA", "GCATGCU");
      expect(r.algorithm).toBe("needlemanWunsch");
      expect(typeof r.score).toBe("number");
      expect(typeof r.alignmentA).toBe("string");
      expect(typeof r.alignmentB).toBe("string");
      expect(r.scoreMatrix.length).toBeGreaterThan(0);
    });
  });

  describe("damerauLevenshteinDist", () => {
    it("computes Damerau-Levenshtein distance", () => {
      const r = dsAlgorithmService.damerauLevenshteinDist("kitten", "sitting");
      expect(r.algorithm).toBe("damerauLevenshteinDist");
      expect(r.distance).toBeGreaterThan(0);
    });
  });

  describe("nGramModel", () => {
    it("builds n-gram language model", () => {
      const r = dsAlgorithmService.nGramModel("the cat in the hat", 2);
      expect(r.algorithm).toBe("nGramModel");
      expect(r.n).toBe(2);
      expect(r.totalNgrams).toBeGreaterThan(0);
      expect(r.uniqueNgrams).toBeGreaterThan(0);
      expect(Object.keys(r.probabilities).length).toBe(r.uniqueNgrams);
    });
  });

  describe("tfidfVectorize", () => {
    it("computes TF-IDF matrix", () => {
      const r = dsAlgorithmService.tfidfVectorize([
        "the cat in the hat",
        "the dog on the log",
      ]);
      expect(r.algorithm).toBe("tfidfVectorize");
      expect(r.documentCount).toBe(2);
      expect(r.vocabulary.length).toBeGreaterThan(0);
      expect(r.tfidfMatrix.length).toBe(2);
    });
  });

  describe("aprioriItemsets", () => {
    it("finds frequent itemsets", () => {
      const r = dsAlgorithmService.aprioriItemsets(
        [["a", "b", "c"], ["a", "b"], ["a", "c"], ["b", "c"]],
        0.3
      );
      expect(r.algorithm).toBe("aprioriItemsets");
      expect(r.totalTransactions).toBe(4);
      expect(r.frequentItemsets.length).toBeGreaterThan(0);
    });
  });

  describe("kernalDensityEstimate", () => {
    it("estimates density with Gaussian kernel", () => {
      const r = dsAlgorithmService.kernalDensityEstimate(
        [1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5],
        1.0
      );
      expect(r.algorithm).toBe("kernalDensityEstimate");
      expect(r.n).toBe(5);
      expect(r.estimates.length).toBe(5);
    });
  });
});

describe("Depth 11 - Anomaly Detection & Advanced Stats", () => {
  describe("isolationForest", () => {
    it("detects anomalies with isolation forest", () => {
      const r = dsAlgorithmService.isolationForest(
        [[1, 2], [1, 3], [2, 2], [10, 10]],
        10, 4
      );
      expect(r.algorithm).toBe("isolationForest");
      expect(r.nSamples).toBe(4);
      expect(r.anomalyScores.length).toBe(4);
      expect(r.predictions.length).toBe(4);
      expect(r.threshold).toBeGreaterThan(0);
    });
  });

  describe("localOutlierFactor", () => {
    it("computes LOF scores", () => {
      const r = dsAlgorithmService.localOutlierFactor(
        [[1, 2], [1, 3], [2, 2], [10, 10]],
        2
      );
      expect(r.algorithm).toBe("localOutlierFactor");
      expect(r.nSamples).toBe(4);
      expect(r.lofScores.length).toBe(4);
      expect(r.predictions.length).toBe(4);
    });
  });

  describe("zScoreAnomaly", () => {
    it("detects anomalies via z-score", () => {
      const r = dsAlgorithmService.zScoreAnomaly([1, 2, 1, 2, 1, 2, 100], 2);
      expect(r.algorithm).toBe("zScoreAnomaly");
      expect(typeof r.mean).toBe("number");
      expect(typeof r.stdDev).toBe("number");
      expect(r.nAnomalies).toBeGreaterThan(0);
      expect(r.anomalies.length).toBe(r.nAnomalies);
    });
  });

  describe("jackknifeResample", () => {
    it("computes jackknife estimates", () => {
      const r = dsAlgorithmService.jackknifeResample(
        [1, 2, 3, 4, 5],
        (s: number[]) => s.reduce((a, b) => a + b, 0) / s.length
      );
      expect(r.algorithm).toBe("jackknifeResample");
      expect(r.n).toBe(5);
      expect(r.jackknifeEstimates.length).toBe(5);
      expect(typeof r.bias).toBe("number");
      expect(typeof r.standardError).toBe("number");
    });
  });

  describe("welchTtest", () => {
    it("performs Welch's t-test", () => {
      const r = dsAlgorithmService.welchTtest([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]);
      expect(r.algorithm).toBe("welchTtest");
      expect(typeof r.tStatistic).toBe("number");
      expect(r.degreesOfFreedom).toBeGreaterThan(0);
      expect(r.pValue).toBeGreaterThanOrEqual(0);
      expect(typeof r.meanA).toBe("number");
      expect(typeof r.meanB).toBe("number");
    });
  });

  describe("truncatedNormalSample", () => {
    it("samples from truncated normal distribution", () => {
      const r = dsAlgorithmService.truncatedNormalSample(0, 1, -1, 1, 100);
      expect(r.algorithm).toBe("truncatedNormalSample");
      expect(r.samples.length).toBe(100);
      expect(r.lower).toBe(-1);
      expect(r.upper).toBe(1);
      expect(typeof r.actualMean).toBe("number");
      expect(typeof r.actualStd).toBe("number");
    });
  });

  describe("multivariateNormalSample", () => {
    it("samples from multivariate normal distribution", () => {
      const r = dsAlgorithmService.multivariateNormalSample(
        [0, 0],
        [[1, 0], [0, 1]],
        100
      );
      expect(r.algorithm).toBe("multivariateNormalSample");
      expect(r.dimension).toBe(2);
      expect(r.n).toBe(100);
      expect(r.samples.length).toBe(100);
      expect(r.mean.length).toBe(2);
    });
  });
});

describe("Depth 11 - Clustering & Dimensionality", () => {
  describe("meanShiftCluster", () => {
    it("clusters with mean shift", () => {
      const r = dsAlgorithmService.meanShiftCluster(
        [[1, 1], [1.1, 1.1], [5, 5], [5.1, 5.1]],
        1
      );
      expect(r.algorithm).toBe("meanShiftCluster");
      expect(r.nClusters).toBeGreaterThan(0);
      expect(r.labels.length).toBe(4);
      expect(r.clusterCenters.length).toBe(r.nClusters);
    });
  });

  describe("affinityPropagation", () => {
    it("clusters with affinity propagation", () => {
      const r = dsAlgorithmService.affinityPropagation(
        [[1, 1], [1.1, 1.1], [5, 5], [5.1, 5.1]],
        0.5, 100
      );
      expect(r.algorithm).toBe("affinityPropagation");
      expect(r.nClusters).toBeGreaterThan(0);
      expect(r.labels.length).toBe(4);
      expect(r.exemplars.length).toBe(r.nClusters);
      expect(r.iterations).toBeGreaterThan(0);
    });
  });

  describe("opticsCluster", () => {
    it("performs OPTICS clustering", () => {
      const r = dsAlgorithmService.opticsCluster(
        [[1, 1], [1.1, 1.1], [5, 5], [5.1, 5.1]],
        0.5, 2
      );
      expect(r.algorithm).toBe("opticsCluster");
      expect(r.n).toBe(4);
      expect(r.reachabilityDistances.length).toBe(4);
      expect(r.coreDistances.length).toBe(4);
      expect(r.ordering.length).toBe(4);
    });
  });

  describe("spectralCluster", () => {
    it("clusters with spectral clustering", () => {
      const r = dsAlgorithmService.spectralCluster(
        [[1, 1], [1.1, 1.1], [5, 5], [5.1, 5.1]],
        2
      );
      expect(r.algorithm).toBe("spectralCluster");
      expect(r.nClusters).toBe(2);
      expect(r.labels.length).toBe(4);
      expect(r.eigenvalues.length).toBeGreaterThan(0);
    });
  });

  describe("gaussianMixtureCluster", () => {
    it("fits Gaussian mixture model", () => {
      const r = dsAlgorithmService.gaussianMixtureCluster(
        [[1, 1], [1.1, 1.1], [5, 5], [5.1, 5.1]],
        2, 50
      );
      expect(r.algorithm).toBe("gaussianMixtureCluster");
      expect(r.nComponents).toBe(2);
      expect(r.labels.length).toBe(4);
      expect(r.means.length).toBe(2);
      expect(r.covariances.length).toBe(2);
      expect(r.weights.length).toBe(2);
      expect(typeof r.logLikelihood).toBe("number");
    });
  });

  describe("fuzzyCMeans", () => {
    it("clusters with fuzzy C-means", () => {
      const r = dsAlgorithmService.fuzzyCMeans(
        [[1, 1], [1.1, 1.1], [5, 5], [5.1, 5.1]],
        2, 2, 50
      );
      expect(r.algorithm).toBe("fuzzyCMeans");
      expect(r.nClusters).toBe(2);
      expect(r.labels.length).toBe(4);
      expect(r.centers.length).toBe(2);
      expect(r.membershipMatrix.length).toBe(4);
      expect(r.iterations).toBeGreaterThan(0);
    });
  });

  describe("miniBatchKMeans", () => {
    it("clusters with mini-batch k-means", () => {
      const r = dsAlgorithmService.miniBatchKMeans(
        [[1, 1], [1.1, 1.1], [5, 5], [5.1, 5.1], [9, 9]],
        3, 5, 50
      );
      expect(r.algorithm).toBe("miniBatchKMeans");
      expect(r.k).toBe(3);
      expect(r.labels.length).toBe(5);
      expect(r.centroids.length).toBe(3);
      expect(r.iterations).toBe(50);
      expect(r.inertia).toBeGreaterThanOrEqual(0);
    });
  });
});
