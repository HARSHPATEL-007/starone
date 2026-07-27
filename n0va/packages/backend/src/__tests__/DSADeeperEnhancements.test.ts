import { describe, it, expect } from "vitest";
import { dsAlgorithmService } from "../services/DSAlgorithmService";

describe("Deeper Enhancements - Data Structures", () => {
  describe("splayTreeOps", () => {
    it("inserts and splays elements", () => {
      const r = dsAlgorithmService.splayTreeOps([
        { action: "insert", key: 10 }, { action: "insert", key: 20 },
        { action: "search", key: 10 },
      ]);
      expect(r.algorithm).toBe("splayTreeOps");
      expect(r.operations.length).toBe(3);
    });
  });

  describe("huffmanCoding", () => {
    it("compresses and decompresses text", () => {
      const r = dsAlgorithmService.huffmanCoding("hello world");
      expect(r.algorithm).toBe("huffmanCoding");
      expect(r.decoded).toBe("hello world");
      expect(r.compressionRatio).toBeGreaterThan(0);
    });
  });

  describe("lzwCompression", () => {
    it("compresses and decompresses string", () => {
      const r = dsAlgorithmService.lzwCompression("TOBEORNOTTOBEORTOBEORNOT");
      expect(r.algorithm).toBe("lzwCompression");
      expect(r.decompressed).toBe("TOBEORNOTTOBEORTOBEORNOT");
    });
  });
});

describe("Deeper Enhancements - Regression & Classification", () => {
  describe("linearRegressionGD", () => {
    it("fits linear regression via gradient descent", () => {
      const r = dsAlgorithmService.linearRegressionGD([[1], [2], [3], [4]], [2, 4, 6, 8], 0.01, 100);
      expect(r.algorithm).toBe("linearRegressionGD");
      expect(r.predictions.length).toBe(4);
    });
  });

  describe("logisticRegressionGD", () => {
    it("fits logistic regression via gradient descent", () => {
      const r = dsAlgorithmService.logisticRegressionGD([[1], [2], [3], [4]], [0, 0, 1, 1], 0.01, 100);
      expect(r.algorithm).toBe("logisticRegressionGD");
      expect(r.predictions.length).toBe(4);
    });
  });

  describe("naiveBayesClassifier", () => {
    it("classifies with Gaussian Naive Bayes", () => {
      const r = dsAlgorithmService.naiveBayesClassifier(
        [[1, 2], [2, 3], [3, 4], [4, 5]],
        [0, 0, 1, 1],
        [[1.5, 2.5], [3.5, 4.5]]
      );
      expect(r.algorithm).toBe("naiveBayesClassifier");
      expect(r.predictions.length).toBe(2);
    });
  });

  describe("randomForestRegressor", () => {
    it("predicts with random forest ensemble", () => {
      const r = dsAlgorithmService.randomForestRegressor(
        [[1], [2], [3], [4]],
        [2, 4, 6, 8],
        [[1.5], [3.5]],
        5, 2
      );
      expect(r.algorithm).toBe("randomForestRegressor");
      expect(r.predictions.length).toBe(2);
    });
  });

  describe("knnClassifier", () => {
    it("classifies with k-nearest neighbors", () => {
      const r = dsAlgorithmService.knnClassifier(
        [[1, 1], [2, 2], [8, 8], [9, 9]],
        [0, 0, 1, 1],
        [[1.5, 1.5], [8.5, 8.5]],
        3
      );
      expect(r.algorithm).toBe("knnClassifier");
      expect(r.predictions.length).toBe(2);
    });
  });
});

describe("Deeper Enhancements - Time Series & Statistics", () => {
  describe("timeSeriesDecompose", () => {
    it("decomposes into trend, seasonal, residual", () => {
      const r = dsAlgorithmService.timeSeriesDecompose([10, 12, 11, 13, 10, 12, 11, 13], 4);
      expect(r.algorithm).toBe("timeSeriesDecompose");
      expect(r.trend.length).toBe(8);
    });
  });

  describe("bootstrapCI", () => {
    it("computes bootstrap confidence interval", () => {
      const r = dsAlgorithmService.bootstrapCI([1, 2, 3, 4, 5, 6, 7, 8], 100, 0.95);
      expect(r.algorithm).toBe("bootstrapCI");
      expect(r.ciLower).toBeLessThanOrEqual(r.ciUpper);
    });
  });

  describe("kolmogorovSmirnovTest", () => {
    it("computes KS statistic", () => {
      const r = dsAlgorithmService.kolmogorovSmirnovTest([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]);
      expect(r.algorithm).toBe("kolmogorovSmirnovTest");
      expect(r.ksStatistic).toBeGreaterThan(0);
    });
  });

  describe("pearsonCorrelation", () => {
    it("computes Pearson r", () => {
      const r = dsAlgorithmService.pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
      expect(r.algorithm).toBe("pearsonCorrelation");
      expect(Math.abs(r.r)).toBeGreaterThan(0.9);
    });
  });

  describe("spearmanRankCorrelation", () => {
    it("computes Spearman rho", () => {
      const r = dsAlgorithmService.spearmanRankCorrelation([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]);
      expect(r.algorithm).toBe("spearmanRankCorrelation");
      expect(Math.abs(r.rho)).toBeGreaterThan(0.9);
    });
  });
});

describe("Deeper Enhancements - Dimensionality & Clustering", () => {
  describe("pcaDecomposition", () => {
    it("reduces dimensionality with PCA", () => {
      const r = dsAlgorithmService.pcaDecomposition([[1, 2], [3, 4], [5, 6]], 1);
      expect(r.algorithm).toBe("pcaDecomposition");
      expect(r.projected[0].length).toBe(1);
    });
  });

  describe("factorAnalysis", () => {
    it("extracts latent factors", () => {
      const r = dsAlgorithmService.factorAnalysis([[1, 2, 3], [4, 5, 6], [7, 8, 9]], 2);
      expect(r.algorithm).toBe("factorAnalysis");
      expect(r.loadings.length).toBe(3);
    });
  });

  describe("kMedoidsClustering", () => {
    it("clusters with k-medoids (PAM)", () => {
      const r = dsAlgorithmService.kMedoidsClustering([[1, 1], [1, 2], [8, 8], [9, 9]], 2);
      expect(r.algorithm).toBe("kMedoidsClustering");
      expect(r.assignments.length).toBe(4);
    });
  });

  describe("dbscanCluster", () => {
    it("clusters with DBSCAN", () => {
      const r = dsAlgorithmService.dbscanCluster([[1, 1], [1, 2], [8, 8], [9, 9]], 2, 1);
      expect(r.algorithm).toBe("dbscanCluster");
      expect(r.clusters.length).toBe(4);
    });
  });

  describe("hierarchicalCluster", () => {
    it("clusters hierarchically", () => {
      const r = dsAlgorithmService.hierarchicalCluster([[1, 1], [1, 2], [8, 8], [9, 9]], 2);
      expect(r.algorithm).toBe("hierarchicalCluster");
      expect(r.assignments.length).toBe(4);
    });
  });
});

describe("Deeper Enhancements - Ensemble & Advanced ML", () => {
  describe("gaussianNaiveBayes", () => {
    it("classifies with GNB", () => {
      const r = dsAlgorithmService.gaussianNaiveBayes(
        [[1], [2], [3], [4]], [0, 0, 1, 1], [[1.5], [3.5]]
      );
      expect(r.algorithm).toBe("gaussianNaiveBayes");
      expect(r.predictions.length).toBe(2);
    });
  });

  describe("adaboostClassify", () => {
    it("boosts weak learners", () => {
      const r = dsAlgorithmService.adaboostClassify(
        [[1], [2], [3], [4]], [0, 0, 1, 1], [[1.5], [3.5]], 5
      );
      expect(r.algorithm).toBe("adaboostClassify");
      expect(r.predictions.length).toBe(2);
    });
  });

  describe("gradientBoostRegress", () => {
    it("boosts regression stumps", () => {
      const r = dsAlgorithmService.gradientBoostRegress(
        [[1], [2], [3], [4]], [2, 4, 6, 8], [[1.5], [3.5]], 5, 0.1
      );
      expect(r.algorithm).toBe("gradientBoostRegress");
      expect(r.predictions.length).toBe(2);
    });
  });

  describe("markovChainSim", () => {
    it("simulates Markov chain trajectory", () => {
      const r = dsAlgorithmService.markovChainSim([[0.9, 0.1], [0.3, 0.7]], 10, 0);
      expect(r.algorithm).toBe("markovChainSim");
      expect(r.trajectory.length).toBe(11);
    });
  });

  describe("monteCarloOption", () => {
    it("prices European options via MC", () => {
      const r = dsAlgorithmService.monteCarloOption(100, 100, 1, 0.2, 0.05, 1000);
      expect(r.algorithm).toBe("monteCarloOption");
      expect(r.callPrice).toBeGreaterThan(0);
    });
  });

  describe("baggingEnsemble", () => {
    it("averages bootstrap models", () => {
      const r = dsAlgorithmService.baggingEnsemble(
        [[1], [2], [3], [4]], [2, 4, 6, 8], [[1.5]], 5
      );
      expect(r.algorithm).toBe("baggingEnsemble");
      expect(r.predictions.length).toBe(1);
    });
  });

  describe("crossValidationKFold", () => {
    it("evaluates model with k-fold CV", () => {
      const r = dsAlgorithmService.crossValidationKFold(
        [[1], [2], [3], [4], [5], [6]], [2, 4, 6, 8, 10, 12], 3
      );
      expect(r.algorithm).toBe("crossValidationKFold");
      expect(r.folds.length).toBe(3);
    });
  });
});

describe("Deeper Enhancements - Regularized Regression", () => {
  describe("ridgeRegression", () => {
    it("fits ridge regression", () => {
      const r = dsAlgorithmService.ridgeRegression(
        [[1], [2], [3], [4]], [2, 4, 6, 8], 1.0, [[1.5], [3.5]]
      );
      expect(r.algorithm).toBe("ridgeRegression");
      expect(r.predictions.length).toBe(2);
    });
  });

  describe("lassoRegression", () => {
    it("fits lasso regression", () => {
      const r = dsAlgorithmService.lassoRegression(
        [[1], [2], [3], [4]], [2, 4, 6, 8], 0.1, [[1.5], [3.5]]
      );
      expect(r.algorithm).toBe("lassoRegression");
      expect(r.predictions.length).toBe(2);
    });
  });

  describe("elasticNetRegression", () => {
    it("fits elastic net regression", () => {
      const r = dsAlgorithmService.elasticNetRegression(
        [[1], [2], [3], [4]], [2, 4, 6, 8], 0.1, 0.5, [[1.5], [3.5]]
      );
      expect(r.algorithm).toBe("elasticNetRegression");
      expect(r.predictions.length).toBe(2);
    });
  });

  describe("mcmcSamplingMetropolis", () => {
    it("samples from distribution via MCMC", () => {
      const r = dsAlgorithmService.mcmcSamplingMetropolis("standardNormal", 200, 1.0);
      expect(r.algorithm).toBe("mcmcSamplingMetropolis");
      expect(r.samples.length).toBe(200);
    });
  });

  describe("expectationMaximization", () => {
    it("estimates GMM parameters via EM", () => {
      const r = dsAlgorithmService.expectationMaximization([1, 1.5, 2, 8, 8.5, 9], 2, 20);
      expect(r.algorithm).toBe("expectationMaximization");
      expect(r.means.length).toBe(2);
    });
  });
});
