import { describe, it, expect, beforeAll } from "vitest";
import { campaignSaturationService } from "../services/CampaignSaturationService";
import { portfolioBudgetOptimizerService } from "../services/PortfolioBudgetOptimizerService";
import { campaignHealthService } from "../services/CampaignHealthService";
import { leadScoringService } from "../services/LeadScoringService";
import { recommendationEngine } from "../services/RecommendationEngineService";
import { campaignSummary } from "../services/CampaignSummaryService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_mktg_services";

beforeAll(() => {
  const mem = DataStore["mem"]();
  for (let i = 0; i < 3; i++) {
    mem.insert("campaigns", {
      name: `Mktg Camp ${i}`,
      tenantId: TEST_TENANT,
      status: "active",
      budget: { daily: 100, lifetime: 3000, spent: 500 + i * 200, remaining: 2500 - i * 200, currency: "USD" },
      metrics: { impressions: 10000 + i * 2000, clicks: 200 + i * 50, conversions: 10 + i * 3, revenue: 800 + i * 200, spend: 500 + i * 200 },
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
  }
});

describe("CampaignSaturationService", () => {
  describe("analyze", () => {
    it("returns saturation analysis for a campaign", async () => {
      const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
      const r = campaignSaturationService.analyze(campaigns[0]._id, TEST_TENANT);
      expect(r).not.toBeNull();
      expect(r!.campaignId).toBe(campaigns[0]._id);
      expect(r!.saturationLevel).toBeTruthy();
      expect(r!.saturationScore).toBeGreaterThanOrEqual(0);
      expect(typeof r!.fatigueMetrics.fatigueDetected).toBe("boolean");
      expect(r!.recommendation).toBeTruthy();
    });

    it("returns null for non-existent campaign", () => {
      const r = campaignSaturationService.analyze("nonexistent_campaign", TEST_TENANT);
      expect(r).toBeNull();
    });
  });

  describe("analyzeAll", () => {
    it("returns analyses for all campaigns", () => {
      const r = campaignSaturationService.analyzeAll(TEST_TENANT);
      expect(r.analyses.length).toBeGreaterThan(0);
      expect(typeof r.summary.critical).toBe("number");
    });
  });
});

describe("PortfolioBudgetOptimizerService", () => {
  const sampleInput = {
    totalBudget: 10000,
    campaigns: [
      { campaignId: "c1", name: "Search", currentBudget: 3000, currentConversions: 150, currentRevenue: 9000, history: [{ spend: 1000, conversions: 50 }, { spend: 2000, conversions: 100 }] },
      { campaignId: "c2", name: "Social", currentBudget: 4000, currentConversions: 200, currentRevenue: 12000, history: [{ spend: 2000, conversions: 100 }, { spend: 2000, conversions: 100 }] },
      { campaignId: "c3", name: "Display", currentBudget: 3000, currentConversions: 80, currentRevenue: 4000, history: [{ spend: 1500, conversions: 40 }, { spend: 1500, conversions: 40 }] },
    ],
    objective: "revenue" as const,
  };

  describe("allocate", () => {
    it("allocates budget across campaigns", () => {
      const r = portfolioBudgetOptimizerService.allocate(sampleInput);
      expect(r.allocations.length).toBe(3);
      expect(r.summary.totalExpectedRevenue).toBeGreaterThan(0);
      const totalAllocated = r.allocations.reduce((s, a) => s + a.allocatedBudget, 0);
      expect(totalAllocated).toBeLessThanOrEqual(sampleInput.totalBudget * 1.01);
    });
  });

  describe("efficientFrontier", () => {
    it("returns efficient frontier points", () => {
      const r = portfolioBudgetOptimizerService.efficientFrontier(sampleInput);
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].totalBudget).toBeGreaterThan(0);
    });
  });
});

describe("CampaignHealthService", () => {
  describe("score", () => {
    it("returns health score for a campaign", async () => {
      const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
      const r = await campaignHealthService.score(campaigns[0]._id, TEST_TENANT);
      expect(r).not.toBeNull();
      expect(r!.campaignId).toBe(campaigns[0]._id);
      expect(r!.overall).toBeGreaterThanOrEqual(0);
      expect(r!.budget).toBeGreaterThanOrEqual(0);
      expect(r!.trend).toBeTruthy();
    });
  });

  describe("scoreAll", () => {
    it("scores all campaigns", async () => {
      const r = await campaignHealthService.scoreAll(TEST_TENANT);
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].overall).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generateSampleScores", () => {
    it("generates sample health scores", async () => {
      const r = await campaignHealthService.generateSampleScores(TEST_TENANT);
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].campaignName).toBeTruthy();
    });
  });
});

describe("LeadScoringService", () => {
  describe("generateSampleModel", () => {
    it("generates a sample lead scoring model", () => {
      const model = leadScoringService.generateSampleModel();
      expect(model.id).toBeTruthy();
      expect(model.rules.length).toBeGreaterThan(0);
    });
  });

  describe("generateSampleLeads", () => {
    it("generates sample leads with scores", () => {
      const model = leadScoringService.generateSampleModel();
      const leads = leadScoringService.generateSampleLeads(model);
      expect(leads.length).toBeGreaterThan(0);
      expect(leads[0].score).toBeGreaterThanOrEqual(0);
      expect(["hot", "warm", "cold"]).toContain(leads[0].classification);
    });
  });

  describe("calculateScore", () => {
    it("scores a single lead", () => {
      const model = leadScoringService.generateSampleModel();
      const lead = { email: "test@example.com", company: "Acme Inc", revenue: 50000, industry: "tech" };
      const score = leadScoringService.calculateScore(lead, model);
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.leadId).toBeTruthy();
    });
  });

  describe("scoreAllLeads", () => {
    it("scores multiple leads", () => {
      const model = leadScoringService.generateSampleModel();
      const leads = [{ email: "a@b.com", revenue: 1000 }, { email: "c@d.com", revenue: 50000 }];
      const scores = leadScoringService.scoreAllLeads(leads, model);
      expect(scores.length).toBe(2);
    });
  });

  describe("trainModel", () => {
    it("trains a logistic regression model", () => {
      const data = leadScoringService.generateTrainingData(50);
      const r = leadScoringService.trainModel("test_lr", data, { learningRate: 0.1, epochs: 20 });
      expect(r.model.name).toBe("test_lr");
      expect(r.accuracy).toBeGreaterThanOrEqual(0);
      expect(r.featureCount).toBeGreaterThan(0);
    });
  });

  describe("predictProbability", () => {
    it("predicts probability using trained model", () => {
      const data = leadScoringService.generateTrainingData(50);
      leadScoringService.trainModel("test_pred_lr", data, { learningRate: 0.1, epochs: 20 });
      const features = data[0].features;
      const prob = leadScoringService.predictProbability("test_pred_lr", features);
      expect(prob).toBeGreaterThanOrEqual(0);
      expect(prob).toBeLessThanOrEqual(1);
    });
  });

  describe("predictClass", () => {
    it("returns classification with score", () => {
      const data = leadScoringService.generateTrainingData(50);
      leadScoringService.trainModel("test_cls_lr", data, { learningRate: 0.1, epochs: 20 });
      const features = data[0].features;
      const r = leadScoringService.predictClass("test_cls_lr", features);
      expect(["hot", "warm", "cold"]).toContain(r.classification);
      expect(r.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("listModels", () => {
    it("lists trained models", () => {
      const models = leadScoringService.listModels();
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe("trainXGBoost and predict", () => {
    it("trains and predicts with XGBoost", () => {
      const data = leadScoringService.generateTrainingData(50);
      const r = leadScoringService.trainXGBoost("test_xgb", data, { learningRate: 0.3, nEstimators: 10, maxDepth: 3 });
      expect(r.model.name).toBe("test_xgb");
      expect(r.accuracy).toBeGreaterThanOrEqual(0);
      const features = data[0].features;
      const pred = leadScoringService.predictXGBoost("test_xgb", features);
      expect(pred.probability).toBeGreaterThanOrEqual(0);
      expect(["hot", "warm", "cold"]).toContain(pred.classification);
    });
  });

  describe("trainLeadRandomForest and predict", () => {
    it("trains and predicts with Random Forest", () => {
      const data = leadScoringService.generateTrainingData(50);
      const r = leadScoringService.trainLeadRandomForest("test_rf", data, { nEstimators: 10, maxDepth: 3 });
      expect(r.model.name).toBe("test_rf");
      expect(r.accuracy).toBeGreaterThanOrEqual(0);
      const features = data[0].features;
      const pred = leadScoringService.predictRandomForest("test_rf", features);
      expect(pred.probability).toBeGreaterThanOrEqual(0);
    });
  });

  describe("predictEnsemble", () => {
    it("predicts using ensemble", () => {
      const data = leadScoringService.generateTrainingData(50);
      leadScoringService.trainModel("test_ens_lr", data, { learningRate: 0.1, epochs: 20 });
      leadScoringService.trainLeadRandomForest("test_ens_rf", data, { nEstimators: 10 });
      leadScoringService.trainXGBoost("test_ens_xgb", data, { nEstimators: 10 });
      const features = data[0].features;
      const pred = leadScoringService.predictEnsemble(features);
      expect(pred.probability).toBeGreaterThanOrEqual(0);
      expect(pred.modelContributions.length).toBeGreaterThan(0);
    });
  });

  describe("runGridSearch", () => {
    it("runs grid search for hyperparameter tuning", () => {
      const data = leadScoringService.generateTrainingData(30);
      const r = leadScoringService.runGridSearch(data, "logistic_regression", { learningRate: [0.01, 0.1], epochs: [5, 10] }, "accuracy");
      expect(r.bestScore).toBeGreaterThanOrEqual(0);
      expect(r.trials).toBeGreaterThan(0);
    });
  });

  describe("generatePolynomialFeatures", () => {
    it("generates polynomial features", () => {
      const r = leadScoringService.generatePolynomialFeatures([1, 2, 3], 2);
      expect(r.length).toBeGreaterThan(3);
    });
  });
});

describe("RecommendationEngineService", () => {
  const sampleCampaign: any = {
    id: "rec_c1", name: "Test Campaign", status: "active", type: "search",
    platforms: ["google"], budget: { daily: 100, lifetime: 3000, spent: 500, remaining: 2500, currency: "USD" },
    metrics: { impressions: 10000, clicks: 200, conversions: 15, spend: 500, revenue: 1200, ctr: 2, cpc: 2.5, roas: 2.4, cvr: 7.5 },
    startDate: "2025-01-01", endDate: "2025-12-31", tags: ["test"],
  };
  const sampleCampaigns = [sampleCampaign, { ...sampleCampaign, id: "rec_c2", name: "Camp 2", metrics: { ...sampleCampaign.metrics, roas: 1.2, ctr: 1.5 } }];

  describe("generateCampaignRecommendations", () => {
    it("generates recommendations for a campaign", () => {
      const r = recommendationEngine.generateCampaignRecommendations(sampleCampaign);
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].type).toBeTruthy();
      expect(r[0].impact).toBeTruthy();
    });
  });

  describe("generateCrossCampaignRecommendations", () => {
    it("returns recommendations array (may be empty if campaigns similar)", () => {
      const r = recommendationEngine.generateCrossCampaignRecommendations(sampleCampaigns);
      expect(Array.isArray(r)).toBe(true);
    });
  });

  describe("collaborativeFilteringRecommendations", () => {
    it("returns similar campaigns or empty array", () => {
      const r = recommendationEngine.collaborativeFilteringRecommendations(sampleCampaigns, "cosine", 2);
      expect(Array.isArray(r)).toBe(true);
      if (r.length > 0) {
        expect(r[0].predictedMetrics.roas).toBeGreaterThan(0);
      }
    });
  });

  describe("threshold tuning", () => {
    it("tunes a threshold", () => {
      const r = recommendationEngine.tuneThreshold("test_threshold", 0.5, true);
      expect(typeof r.adjustedThreshold).toBe("number");
      expect(r.direction).toBeTruthy();
    });

    it("retrieves and checks threshold state", () => {
      let state = recommendationEngine.getThresholdState("test_threshold");
      if (!state) {
        recommendationEngine.tuneThreshold("test_threshold", 0.5, true);
        state = recommendationEngine.getThresholdState("test_threshold")!;
      }
      expect(state).not.toBeNull();
      expect(state.threshold).toBeGreaterThan(0);
    });
  });

  describe("bandit methods", () => {
    it("registers and selects Thompson sampling arms", () => {
      recommendationEngine.registerThompsonArm("ts_arm_1", "Variant A");
      recommendationEngine.registerThompsonArm("ts_arm_2", "Variant B");
      const arm = recommendationEngine.selectThompsonArm();
      expect(arm.armId).toBeTruthy();
      expect(arm.probability).toBeGreaterThan(0);
    });

    it("rewards an arm", () => {
      const r = recommendationEngine.rewardThompsonArm("ts_arm_1", 1);
      expect(r.posteriorAlpha).toBeGreaterThan(0);
      expect(r.probability).toBeGreaterThan(0);
    });

    it("returns Thompson state", () => {
      const state = recommendationEngine.getThompsonState();
      expect(state.length).toBeGreaterThan(0);
    });

    it("registers and selects standard bandit arms", () => {
      recommendationEngine.registerArm("bandit_a", "Arm A");
      recommendationEngine.registerArm("bandit_b", "Arm B");
      const arm = recommendationEngine.selectArm("ucb1");
      expect(arm.armId).toBeTruthy();
      recommendationEngine.rewardArm(arm.armId, 1);
      const state = recommendationEngine.banditState();
      expect(state.arms.length).toBeGreaterThan(0);
      expect(state.totalPlays).toBeGreaterThan(0);
    });
  });

  describe("LinUCB", () => {
    it("initializes and selects arms", () => {
      recommendationEngine.initializeLinUCB("linucb_test", 2);
      const r = recommendationEngine.selectLinUCBArm("linucb_test", [
        { armId: "l_arm1", context: [0.5, 0.5] }, { armId: "l_arm2", context: [0.8, 0.2] },
      ]);
      expect(r.armId).toBeTruthy();
      expect(r.ucb).toBeGreaterThan(0);
    });

    it("rewards an arm", () => {
      const r = recommendationEngine.rewardLinUCBArm("linucb_test", [0.5, 0.5], 1);
      expect(r.theta.length).toBe(2);
    });

    it("gets LinUCB state", () => {
      const state = recommendationEngine.getLinUCBState("linucb_test");
      expect(state).not.toBeNull();
      expect(state!.d).toBe(2);
    });
  });

  describe("generateBanditRecommendations", () => {
    it("generates bandit-informed recommendations", () => {
      const r = recommendationEngine.generateBanditRecommendations(sampleCampaigns);
      expect(r.recommendations.length).toBeGreaterThan(0);
      expect(r.banditSelection.armId).toBeTruthy();
    });
  });
});

describe("CampaignSummaryService", () => {
  const sampleInput: any = {
    name: "Summary Camp", status: "active", type: "search",
    platforms: ["google"], budget: { daily: 100, lifetime: 3000, spent: 500, remaining: 2500 },
    metrics: { impressions: 10000, clicks: 200, conversions: 15, spend: 500, revenue: 1200, ctr: 2, cpc: 2.5, roas: 2.4, cvr: 7.5 },
    startDate: "2025-01-01", endDate: "2025-12-31", tags: ["test"],
  };
  const sampleInputs = [
    sampleInput,
    { ...sampleInput, name: "Camp 2", metrics: { ...sampleInput.metrics, roas: 1.0, revenue: 400, spend: 400 } },
    { ...sampleInput, name: "Camp 3", metrics: { ...sampleInput.metrics, roas: 3.5, revenue: 2100, spend: 600 } },
  ];

  describe("generateSummary", () => {
    it("generates a campaign summary", () => {
      const r = campaignSummary.generateSummary(sampleInput);
      expect(r.campaignName).toBe("Summary Camp");
      expect(r.shortSummary).toBeTruthy();
      expect(r.keyInsights.length).toBeGreaterThan(0);
      expect(r.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("generateAll", () => {
    it("generates summaries for all campaigns", () => {
      const r = campaignSummary.generateAll(sampleInputs);
      expect(r.length).toBe(3);
      expect(r[0].campaignName).toBeTruthy();
    });
  });

  describe("generatePortfolioSummary", () => {
    it("generates portfolio-level summary", () => {
      const r = campaignSummary.generatePortfolioSummary(sampleInputs);
      expect(r.totalCampaigns).toBe(3);
      expect(r.overallROAS).toBeGreaterThan(0);
      expect(r.summary).toBeTruthy();
      expect(r.topPerformers.length).toBeGreaterThan(0);
    });
  });

  describe("trendNarrative", () => {
    it("generates trend narrative from periods", () => {
      const periods = [
        { label: "Week 1", metrics: { roas: 2.0, ctr: 2.5, cvr: 5.0, spend: 500 } },
        { label: "Week 2", metrics: { roas: 2.5, ctr: 3.0, cvr: 6.0, spend: 600 } },
      ];
      const r = campaignSummary.trendNarrative(periods);
      expect(r.narrative).toBeTruthy();
      expect(r.trends.length).toBeGreaterThan(0);
      expect(r.overallMomentum).toBeTruthy();
    });
  });

  describe("portfolioDistribution", () => {
    it("calculates portfolio distribution metrics", () => {
      const r = campaignSummary.portfolioDistribution(sampleInputs);
      expect(r.roasDistribution.length).toBeGreaterThan(0);
      expect(r.spendConcentration.giniCoefficient).toBeGreaterThanOrEqual(0);
      expect(r.diversityScore).toBeGreaterThanOrEqual(0);
    });
  });
});
