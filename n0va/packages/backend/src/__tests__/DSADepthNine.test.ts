import { describe, it, expect } from "vitest";
import { dsAlgorithmService } from "../services/DSAlgorithmService";

describe("Depth 9 - Campaign Intelligence & Attribution", () => {
  describe("campaignAttributionShapley", () => {
    it("computes Shapley attribution for campaigns", () => {
      const r = dsAlgorithmService.campaignAttributionShapley(
        ["email", "social", "search"],
        [{ channel: "email", value: 10, interactions: ["email", "search"] }]
      );
      expect(r.algorithm).toBe("campaignAttributionShapley");
      expect(Object.keys(r.attribution).length).toBe(3);
    });
  });

  describe("budgetPacingKalman", () => {
    it("filters spend with Kalman filter", () => {
      const r = dsAlgorithmService.budgetPacingKalman([100, 95, 110, 105, 98], 100);
      expect(r.algorithm).toBe("budgetPacingKalman");
      expect(r.filtered.length).toBe(5);
    });
  });

  describe("creativePerformanceForecast", () => {
    it("forecasts creative metrics", () => {
      const r = dsAlgorithmService.creativePerformanceForecast([10, 12, 15, 13, 16], 0.3, 0.1, 3);
      expect(r.algorithm).toBe("creativePerformanceForecast");
      expect(r.forecast.length).toBe(3);
    });
  });

  describe("campaignSaturationTimeDecay", () => {
    it("fits saturation curve with time decay", () => {
      const r = dsAlgorithmService.campaignSaturationTimeDecay([100, 200, 150, 300], [10, 18, 14, 25], 0.3);
      expect(r.algorithm).toBe("campaignSaturationTimeDecay");
      expect(r.fitted.length).toBeGreaterThan(0);
    });
  });

  describe("adFrequencyOptimizer", () => {
    it("finds optimal frequency", () => {
      const r = dsAlgorithmService.adFrequencyOptimizer([1, 2, 3, 4, 5], [0.1, 0.2, 0.3, 0.25, 0.15], 5);
      expect(r.algorithm).toBe("adFrequencyOptimizer");
      expect(r.optimalFrequency).toBeGreaterThan(0);
    });
  });

  describe("conversionAttributionMarkov", () => {
    it("computes Markov chain attribution", () => {
      const r = dsAlgorithmService.conversionAttributionMarkov([
        { channels: ["email", "search"], conversion: true },
        { channels: ["social"], conversion: false },
      ]);
      expect(r.algorithm).toBe("conversionAttributionMarkov");
      expect(r.paths).toBe(2);
    });
  });

  describe("customerJourneyClustering", () => {
    it("clusters customer journeys", () => {
      const r = dsAlgorithmService.customerJourneyClustering([
        { id: "u1", touchpoints: ["email", "search"], conversions: 1 },
        { id: "u2", touchpoints: ["social"], conversions: 0 },
        { id: "u3", touchpoints: ["email", "social", "search"], conversions: 2 },
      ], 2);
      expect(r.algorithm).toBe("customerJourneyClustering");
      expect(r.clusters.length).toBe(3);
    });
  });
});

describe("Depth 9 - Audience & Segmentation", () => {
  describe("audienceLookalikeScoring", () => {
    it("scores lookalike candidates", () => {
      const r = dsAlgorithmService.audienceLookalikeScoring([1, 0, 1], [[1, 0, 1], [0, 1, 0], [1, 1, 0]]);
      expect(r.algorithm).toBe("audienceLookalikeScoring");
      expect(r.scores.length).toBe(3);
    });
  });

  describe("sentimentTimeSeries", () => {
    it("smooths sentiment scores", () => {
      const r = dsAlgorithmService.sentimentTimeSeries([0.8, 0.6, 0.9, 0.5, 0.7], 3);
      expect(r.algorithm).toBe("sentimentTimeSeries");
      expect(r.smoothed.length).toBe(5);
    });
  });

  describe("customerLtvMonteCarlo", () => {
    it("simulates LTV distribution", () => {
      const r = dsAlgorithmService.customerLtvMonteCarlo([[10, 20], [5, 15, 25], [30]], 200);
      expect(r.algorithm).toBe("customerLtvMonteCarlo");
      expect(r.meanLtv).toBeGreaterThan(0);
    });
  });

  describe("rfmSegmentation", () => {
    it("scores and segments customers by RFM", () => {
      const r = dsAlgorithmService.rfmSegmentation([
        { id: "c1", recency: 1, frequency: 10, monetary: 500 },
        { id: "c2", recency: 30, frequency: 2, monetary: 50 },
      ]);
      expect(r.algorithm).toBe("rfmSegmentation");
      expect(r.segments.length).toBe(2);
    });
  });

  describe("audienceOverlapAnalysis", () => {
    it("computes Jaccard overlap between audiences", () => {
      const r = dsAlgorithmService.audienceOverlapAnalysis([
        { name: "A", members: ["u1", "u2", "u3"] },
        { name: "B", members: ["u2", "u3", "u4"] },
      ]);
      expect(r.algorithm).toBe("audienceOverlapAnalysis");
      expect(r.overlapMatrix.length).toBe(1);
    });
  });

  describe("personaAffinityMatrix", () => {
    it("computes persona-channel affinities", () => {
      const r = dsAlgorithmService.personaAffinityMatrix(
        [{ name: "bargain", attributes: { price: 1, quality: 0 } }],
        [{ name: "email", scores: { price: 0.8, quality: 0.2 } }]
      );
      expect(r.algorithm).toBe("personaAffinityMatrix");
      expect(r.matrix.length).toBeGreaterThan(0);
    });
  });

  describe("predictiveLeadScoring", () => {
    it("trains logistic model and scores leads", () => {
      const r = dsAlgorithmService.predictiveLeadScoring([
        { features: [1, 2], converted: 1 },
        { features: [0, 1], converted: 0 },
        { features: [2, 3], converted: 1 },
        { features: [0, 0], converted: 0 },
      ]);
      expect(r.algorithm).toBe("predictiveLeadScoring");
      expect(r.predictions.length).toBe(4);
    });
  });
});

describe("Depth 9 - Bidding & Budget Optimization", () => {
  describe("adaptiveBidStrategy", () => {
    it("adjusts bids based on target ROAS", () => {
      const r = dsAlgorithmService.adaptiveBidStrategy([1, 2, 1.5, 2.5], [0.1, 0.2, 0.15, 0.25], 5);
      expect(r.algorithm).toBe("adaptiveBidStrategy");
      expect(r.adjustedBids.length).toBe(4);
    });
  });

  describe("budgetReallocator", () => {
    it("reallocates budget by marginal ROI", () => {
      const r = dsAlgorithmService.budgetReallocator([
        { name: "search", currentBudget: 100, marginalRoi: 3, maxBudget: 200 },
        { name: "social", currentBudget: 100, marginalRoi: 2, maxBudget: 150 },
      ], 250);
      expect(r.algorithm).toBe("budgetReallocator");
      expect(r.allocations.length).toBe(2);
    });
  });

  describe("pacingControlChart", () => {
    it("detects spend pacing anomalies", () => {
      const r = dsAlgorithmService.pacingControlChart([100, 100, 200, 100, 100], 100);
      expect(r.algorithm).toBe("pacingControlChart");
      expect(r.cumulativeSum.length).toBe(5);
    });
  });

  describe("multiTouchAttributionTimeDecay", () => {
    it("attributes conversions with time decay", () => {
      const r = dsAlgorithmService.multiTouchAttributionTimeDecay([
        { channels: ["email", "search"], conversion: true, timeToConvert: 5 },
      ], 7);
      expect(r.algorithm).toBe("multiTouchAttributionTimeDecay");
      expect(Object.keys(r.attribution).length).toBeGreaterThan(0);
    });
  });

  describe("campaignOptimizerEvolutionary", () => {
    it("evolves optimal campaign allocation", () => {
      const r = dsAlgorithmService.campaignOptimizerEvolutionary([
        { name: "search", budget: 100, roas: 3, risk: 0.2 },
        { name: "social", budget: 100, roas: 2, risk: 0.5 },
      ], 10);
      expect(r.algorithm).toBe("campaignOptimizerEvolutionary");
      expect(Object.keys(r.bestAllocation).length).toBe(2);
    });
  });

  describe("costCurveFitting", () => {
    it("fits power law cost curve", () => {
      const r = dsAlgorithmService.costCurveFitting([100, 200, 300, 400], [10, 18, 24, 28]);
      expect(r.algorithm).toBe("costCurveFitting");
      expect(r.fitted.length).toBeGreaterThan(0);
    });
  });

  describe("marginalROICalculation", () => {
    it("computes marginal ROI per channel", () => {
      const r = dsAlgorithmService.marginalROICalculation([
        { channel: "search", spend: 100, conversions: 10, conversionValue: 50 },
        { channel: "social", spend: 50, conversions: 4, conversionValue: 40 },
      ]);
      expect(r.algorithm).toBe("marginalROICalculation");
      expect(r.marginalRois.length).toBe(2);
    });
  });
});

describe("Depth 9 - Marketing Analytics", () => {
  describe("mediaMixDecomposer", () => {
    it("decomposes media mix with ridge regression", () => {
      const r = dsAlgorithmService.mediaMixDecomposer([
        { channel: "tv", spend: [100, 200, 150] },
        { channel: "digital", spend: [50, 80, 60] },
      ], [20, 35, 25]);
      expect(r.algorithm).toBe("mediaMixDecomposer");
      expect(r.channels.length).toBe(2);
    });
  });

  describe("incrementalLiftAnalysis", () => {
    it("tests lift significance", () => {
      const r = dsAlgorithmService.incrementalLiftAnalysis([5, 6, 4, 7], [8, 9, 10, 7]);
      expect(r.algorithm).toBe("incrementalLiftAnalysis");
      expect(typeof r.significant).toBe("boolean");
    });
  });

  describe("campaignHealthComposite", () => {
    it("computes composite health score", () => {
      const r = dsAlgorithmService.campaignHealthComposite([
        { kpi: "ctr", value: 0.05, weight: 1, threshold: 0.03 },
        { kpi: "cvr", value: 0.02, weight: 2, threshold: 0.01 },
      ]);
      expect(r.algorithm).toBe("campaignHealthComposite");
      expect(r.compositeScore).toBeGreaterThan(0);
    });
  });

  describe("anomalyDetectionMarketing", () => {
    it("detects KPI anomalies", () => {
      const r = dsAlgorithmService.anomalyDetectionMarketing([10, 12, 11, 13, 50, 12, 11], 3, 2);
      expect(r.algorithm).toBe("anomalyDetectionMarketing");
      expect(r.anomalies.length).toBeGreaterThan(0);
    });
  });

  describe("keywordClustering", () => {
    it("clusters keywords by embeddings", () => {
      const r = dsAlgorithmService.keywordClustering([
        { term: "shoes", embeddings: [1, 0, 0] },
        { term: "boots", embeddings: [1, 0.1, 0] },
        { term: "hats", embeddings: [0, 1, 0] },
      ], 2);
      expect(r.algorithm).toBe("keywordClustering");
      expect(r.clusters.length).toBe(3);
    });
  });

  describe("adCopyEffectiveness", () => {
    it("evaluates ad copy Bayesian posteriors", () => {
      const r = dsAlgorithmService.adCopyEffectiveness([
        { variant: "A", impressions: 1000, clicks: 50, conversions: 5 },
        { variant: "B", impressions: 1000, clicks: 60, conversions: 8 },
      ]);
      expect(r.algorithm).toBe("adCopyEffectiveness");
      expect(r.results.length).toBe(2);
    });
  });

  describe("competitivePriceIndex", () => {
    it("computes competitive price positioning", () => {
      const r = dsAlgorithmService.competitivePriceIndex([100, 200], [[95, 190], [105, 210]]);
      expect(r.algorithm).toBe("competitivePriceIndex");
      expect(r.priceIndex.length).toBe(2);
    });
  });
});

describe("Depth 9 - Forecasting & Prediction", () => {
  describe("demandForecastSeasonal", () => {
    it("forecasts with seasonal decomposition", () => {
      const r = dsAlgorithmService.demandForecastSeasonal(
        [100, 120, 110, 130, 105, 125, 115, 135], 4, 3
      );
      expect(r.algorithm).toBe("demandForecastSeasonal");
      expect(r.forecast.length).toBe(3);
    });
  });

  describe("churnPredictionTree", () => {
    it("builds decision tree for churn", () => {
      const r = dsAlgorithmService.churnPredictionTree(
        [[1, 2], [0, 1], [2, 3], [0, 0]],
        [1, 0, 1, 0]
      );
      expect(r.algorithm).toBe("churnPredictionTree");
      expect(r.accuracy).toBeGreaterThan(0);
    });
  });

  describe("revenueForecastMonteCarlo", () => {
    it("projects revenue with Monte Carlo", () => {
      const r = dsAlgorithmService.revenueForecastMonteCarlo([100, 105, 110, 108, 115], 200, 4);
      expect(r.algorithm).toBe("revenueForecastMonteCarlo");
      expect(r.meanForecast.length).toBe(4);
    });
  });

  describe("campaignLiftPrediction", () => {
    it("estimates campaign lift with confidence", () => {
      const r = dsAlgorithmService.campaignLiftPrediction({
        prePeriod: [10, 12, 11],
        postPeriod: [15, 18, 16],
        control: [11, 12, 10],
      });
      expect(r.algorithm).toBe("campaignLiftPrediction");
      expect(typeof r.significant).toBe("boolean");
    });
  });

  describe("customerAcquisitionCost", () => {
    it("computes CAC by channel", () => {
      const r = dsAlgorithmService.customerAcquisitionCost(
        [{ channel: "search", spend: 500, customers: 10 },
         { channel: "social", spend: 300, customers: 5 }],
        [{ channel: "search", mix: 0.6 }, { channel: "social", mix: 0.4 }]
      );
      expect(r.algorithm).toBe("customerAcquisitionCost");
      expect(r.cacByChannel.length).toBe(2);
    });
  });

  describe("attributionFunnelAnalysis", () => {
    it("analyzes funnel stages with assisted conversions", () => {
      const r = dsAlgorithmService.attributionFunnelAnalysis([
        { stage: "visit", users: 1000, conversions: 100, assistedBy: ["search"] },
        { stage: "signup", users: 200, conversions: 50, assistedBy: ["email"] },
      ]);
      expect(r.algorithm).toBe("attributionFunnelAnalysis");
      expect(r.stageMetrics.length).toBe(2);
    });
  });

  describe("marketingRoiDecomposition", () => {
    it("decomposes ROI into incremental, brand, direct", () => {
      const r = dsAlgorithmService.marketingRoiDecomposition([
        { name: "campaign1", spend: 100, incrementalConversions: 10, brandConversions: 5, directConversions: 3, conversionValue: 50 },
      ]);
      expect(r.algorithm).toBe("marketingRoiDecomposition");
      expect(r.decomposition.length).toBe(1);
    });
  });
});
