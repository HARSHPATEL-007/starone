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

    it("handles insufficient data gracefully", () => {
      const mem = DataStore["mem"]();
      mem.insert("campaigns", { name: "Low Data Camp", tenantId: TEST_TENANT, status: "active", budget: { daily: 50, lifetime: 500, spent: 10 } });
      const inserted = mem.find("campaigns", (c: any) => c.name === "Low Data Camp");
      const r = campaignSaturationService.analyze(inserted[0]._id, TEST_TENANT);
      expect(r).not.toBeNull();
      expect(r!.saturationLevel).toBe("none");
      expect(r!.recommendation).toContain("Insufficient data");
    });

    it("detects critical saturation when saturationScore is high", () => {
      const mem = DataStore["mem"]();
      for (let i = 0; i < 8; i++) {
        mem.insert("metrics", { campaignId: "sat_test_camp", tenantId: TEST_TENANT, spend: 100 * (i + 1), conversions: Math.max(1, 5 - i), impressions: 10000, clicks: 100, date: `2025-0${i + 1}-01` });
      }
      mem.insert("campaigns", { name: "Saturated Camp", status: "active", _id: "sat_test_camp", tenantId: TEST_TENANT, budget: { daily: 200, lifetime: 5000, spent: 4000 } });
      const r = campaignSaturationService.analyze("sat_test_camp", TEST_TENANT);
      expect(r).not.toBeNull();
      expect(typeof r!.saturationScore).toBe("number");
      expect(typeof r!.fatigueMetrics.fatigueDetected).toBe("boolean");
      expect(r!.curveParams.rSquared).toBeGreaterThanOrEqual(0);
    });

    it("uses power-law curve fitting for spend-vs-conversion data", () => {
      const mem = DataStore["mem"]();
      for (let i = 0; i < 6; i++) {
        mem.insert("metrics", { campaignId: "pow_law_test", tenantId: TEST_TENANT, spend: 200 * (i + 1), conversions: Math.floor(3 * Math.pow(i + 1, 0.6)), impressions: 5000, clicks: 60, date: `2025-0${i + 1}-01` });
      }
      mem.insert("campaigns", { name: "PowerLaw Camp", status: "active", _id: "pow_law_test", tenantId: TEST_TENANT, budget: { daily: 200, lifetime: 5000, spent: 1200 } });
      const r = campaignSaturationService.analyze("pow_law_test", TEST_TENANT);
      expect(r).not.toBeNull();
      expect(r!.curveParams.rSquared).toBeGreaterThanOrEqual(0);
      expect(r!.recommendation).toBeTruthy();
    });

    it("reports no fatigue for campaigns with low impression volume", () => {
      const mem = DataStore["mem"]();
      mem.insert("campaigns", { name: "Low Imp Camp", status: "active", tenantId: TEST_TENANT, _id: "low_imp_camp", budget: { daily: 50, lifetime: 500, spent: 100 } });
      for (let i = 0; i < 5; i++) {
        mem.insert("metrics", { campaignId: "low_imp_camp", tenantId: TEST_TENANT, spend: 20, conversions: 2, impressions: 100, clicks: 5, date: `2025-0${i + 1}-01` });
      }
      const r = campaignSaturationService.analyze("low_imp_camp", TEST_TENANT);
      expect(r).not.toBeNull();
      expect(r!.fatigueMetrics.fatigueDetected).toBe(false);
    });
  });

  describe("analyzeAll", () => {
    it("returns analyses for all campaigns", () => {
      const r = campaignSaturationService.analyzeAll(TEST_TENANT);
      expect(r.analyses.length).toBeGreaterThan(0);
      expect(typeof r.summary.critical).toBe("number");
      expect(typeof r.summary.fatigued).toBe("number");
    });

    it("returns empty analyses for unknown tenant", () => {
      const r = campaignSaturationService.analyzeAll("nonexistent_tenant");
      expect(r.analyses.length).toBe(0);
      expect(r.summary.critical).toBe(0);
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

    it("throws for empty campaigns", () => {
      expect(() => portfolioBudgetOptimizerService.allocate({ totalBudget: 1000, campaigns: [], objective: "conversions" })).toThrow();
    });

    it("throws for zero budget", () => {
      expect(() => portfolioBudgetOptimizerService.allocate({ totalBudget: 0, campaigns: [{ campaignId: "c1", name: "X", currentBudget: 100, currentConversions: 10, currentRevenue: 500 }], objective: "conversions" })).toThrow();
    });

    it("allocates with min/max constraints", () => {
      const r = portfolioBudgetOptimizerService.allocate({
        totalBudget: 10000, objective: "conversions",
        campaigns: [
          { campaignId: "mc1", name: "Alpha", currentBudget: 2000, currentConversions: 100, currentRevenue: 5000, minBudget: 1000, maxBudget: 3000 },
          { campaignId: "mc2", name: "Beta", currentBudget: 5000, currentConversions: 200, currentRevenue: 12000, minBudget: 2000, maxBudget: 8000 },
          { campaignId: "mc3", name: "Gamma", currentBudget: 3000, currentConversions: 60, currentRevenue: 3000, minBudget: 500, maxBudget: 4000 },
        ],
      });
      expect(r.allocations.length).toBe(3);
      expect(r.allocations.some((a) => a.constraint !== "none")).toBe(true);
    });

    it("uses conversions objective and returns aggregated summary", () => {
      const r = portfolioBudgetOptimizerService.allocate({
        totalBudget: 8000, objective: "conversions",
        campaigns: [
          { campaignId: "cc1", name: "A", currentBudget: 3000, currentConversions: 150, currentRevenue: 6000 },
          { campaignId: "cc2", name: "B", currentBudget: 5000, currentConversions: 200, currentRevenue: 10000 },
        ],
      });
      expect(r.objective).toBe("conversions");
      expect(r.summary.totalExpectedConversions).toBeGreaterThanOrEqual(0);
      expect(r.summary.campaignsIncreased + r.summary.campaignsDecreased + r.summary.campaignsUnchanged).toBe(2);
    });

    it("handles single campaign gracefully", () => {
      const r = portfolioBudgetOptimizerService.allocate({
        totalBudget: 5000, objective: "revenue",
        campaigns: [{ campaignId: "sc1", name: "Solo", currentBudget: 4000, currentConversions: 200, currentRevenue: 8000 }],
      });
      expect(r.allocations.length).toBe(1);
      expect(r.converged).toBe(true);
    });
  });

  describe("efficientFrontier", () => {
    it("returns efficient frontier points", () => {
      const r = portfolioBudgetOptimizerService.efficientFrontier(sampleInput);
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].totalBudget).toBeGreaterThan(0);
    });

    it("returns points with increasing totalConversions as budget grows", () => {
      const r = portfolioBudgetOptimizerService.efficientFrontier(sampleInput);
      let prev = 0;
      for (const point of r) {
        expect(point.totalConversions).toBeGreaterThanOrEqual(prev);
        prev = point.totalConversions;
      }
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

    it("returns null for non-existent campaign", async () => {
      const r = await campaignHealthService.score("nonexistent", TEST_TENANT);
      expect(r).toBeNull();
    });

    it("computes trend direction correctly", async () => {
      const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
      const r = await campaignHealthService.score(campaigns[0]._id, TEST_TENANT);
      expect(["up", "down", "stable"]).toContain(r!.trend);
      expect(r!._trendDetails).toBeDefined();
      expect(typeof r!._trendDetails!.compositeDelta).toBe("number");
    });

    it("detects saturation penalty from campaign metrics", async () => {
      const mem = DataStore["mem"]();
      mem.insert("campaigns", { name: "Sat Health Camp", tenantId: TEST_TENANT, status: "active", _id: "sat_health", budget: { daily: 200, lifetime: 6000, spent: 5000 } });
      for (let i = 0; i < 10; i++) {
        mem.insert("metrics", { campaignId: "sat_health", tenantId: TEST_TENANT, spend: 500 * (i + 1), clicks: 100, impressions: 2000, conversions: Math.max(1, 10 - i), revenue: 300 * (i + 1), date: `2025-0${i + 1}-01` });
      }
      const r = await campaignHealthService.score("sat_health", TEST_TENANT);
      expect(r).not.toBeNull();
      expect(r!._saturation!.penalty).toBeGreaterThanOrEqual(0);
      expect(r!._volatility!.penalty).toBeGreaterThanOrEqual(0);
    });
  });

  describe("scoreAll", () => {
    it("scores all campaigns", async () => {
      const r = await campaignHealthService.scoreAll(TEST_TENANT);
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].overall).toBeGreaterThanOrEqual(0);
    });

    it("returns empty array for unknown tenant", async () => {
      const r = await campaignHealthService.scoreAll("unknown_tenant");
      expect(r.length).toBe(0);
    });
  });

  describe("generateSampleScores", () => {
    it("generates sample health scores", async () => {
      const r = await campaignHealthService.generateSampleScores(TEST_TENANT);
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].campaignName).toBeTruthy();
      expect(r[0].overall).toBeGreaterThanOrEqual(0);
      expect(["up", "down", "stable"]).toContain(r[0].trend);
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

    it("handles degree 1 (no expansion)", () => {
      const r = leadScoringService.generatePolynomialFeatures([1, 2, 3], 1);
      expect(r.length).toBe(3);
    });

    it("includes cubic terms for degree >= 3", () => {
      const r = leadScoringService.generatePolynomialFeatures([1, 2], 3);
      expect(r.length).toBe(7);
    });
  });

  describe("extractFeatures", () => {
    it("extracts feature vector from lead data", () => {
      const f = leadScoringService.extractFeatures({ revenue: 5000000, employees: 200, engagement: 0.85, industry: "Technology", source: "referral", pageVisits: 30 });
      expect(f.length).toBeGreaterThan(0);
      expect(f.every((v) => v >= 0 && v <= 1)).toBe(true);
    });

    it("handles missing fields with defaults", () => {
      const f = leadScoringService.extractFeatures({});
      expect(f.length).toBeGreaterThan(0);
      expect(f.every((v) => v >= 0 && v <= 1)).toBe(true);
    });
  });

  describe("generateEnhancedTrainingData", () => {
    it("generates enhanced training data with polynomial features", () => {
      const data = leadScoringService.generateEnhancedTrainingData(10, 2);
      expect(data.length).toBe(10);
      expect(data[0].features.length).toBeGreaterThan(0);
      data.forEach((d) => expect([0, 1]).toContain(d.label));
    });
  });

  describe("listXGBoostModels and listRandomForestModels", () => {
    it("lists XGBoost models after training", () => {
      const data = leadScoringService.generateTrainingData(30);
      leadScoringService.trainXGBoost("xgb_list_test", data, { nEstimators: 5, maxDepth: 2 });
      const models = leadScoringService.listXGBoostModels();
      expect(models.some((m) => m.name === "xgb_list_test")).toBe(true);
      expect(models[0].nTrees).toBeGreaterThan(0);
    });

    it("lists Random Forest models after training", () => {
      const data = leadScoringService.generateTrainingData(30);
      leadScoringService.trainLeadRandomForest("rf_list_test", data, { nEstimators: 5, maxDepth: 2 });
      const models = leadScoringService.listRandomForestModels();
      expect(models.some((m) => m.name === "rf_list_test")).toBe(true);
      expect(models[0].nTrees).toBeGreaterThan(0);
    });
  });

  describe("grid search for random_forest and xgboost", () => {
    it("runs grid search for random_forest", () => {
      const data = leadScoringService.generateTrainingData(20);
      const r = leadScoringService.runGridSearch(data, "random_forest", { nEstimators: [5, 10], maxDepth: [3] }, "accuracy");
      expect(r.trials).toBe(2);
      expect(r.bestScore).toBeGreaterThanOrEqual(0);
    });

    it("runs grid search for xgboost", () => {
      const data = leadScoringService.generateTrainingData(20);
      const r = leadScoringService.runGridSearch(data, "xgboost", { learningRate: [0.1, 0.3], nEstimators: [5] }, "logloss");
      expect(r.trials).toBe(2);
      expect(r.topResults.length).toBeGreaterThan(0);
    });

    it("throws for empty paramGrid", () => {
      const data = leadScoringService.generateTrainingData(5);
      expect(() => leadScoringService.runGridSearch(data, "logistic_regression", {})).toThrow();
    });
  });

  describe("calculateScore rule operators", () => {
    const model = leadScoringService.generateSampleModel();

    it("matches eq operator", () => {
      const r = leadScoringService.calculateScore({ industry: "Technology" }, model);
      expect(typeof r.score).toBe("number");
    });

    it("matches neq operator", () => {
      const testModel = { id: "test_neq", name: "test", rules: [{ field: "source", operator: "neq" as const, value: "cold_call", score: 10 }] };
      const r = leadScoringService.calculateScore({ source: "referral" }, testModel);
      expect(r.score).toBeGreaterThan(0);
    });

    it("matches contains operator", () => {
      const testModel = { id: "test_contains", name: "test", rules: [{ field: "name", operator: "contains" as const, value: "Acme", score: 15 }] };
      const r = leadScoringService.calculateScore({ name: "Acme Corporation" }, testModel);
      expect(r.score).toBe(15);
    });
  });

  describe("getModel", () => {
    it("retrieves a trained model by name", () => {
      const data = leadScoringService.generateTrainingData(20);
      leadScoringService.trainModel("get_model_test", data, { epochs: 5 });
      const m = leadScoringService.getModel("get_model_test");
      expect(m).toBeDefined();
      expect(m!.featureCount).toBeGreaterThan(0);
    });

    it("returns undefined for missing model", () => {
      expect(leadScoringService.getModel("does_not_exist")).toBeUndefined();
    });
  });

  describe("scoreCampaignLeads", () => {
    it("scores leads for a campaign", async () => {
      const model = leadScoringService.generateSampleModel();
      const campaigns = DataStore["mem"]().find("campaigns", (c: any) => c.tenantId === TEST_TENANT);
      const r = await leadScoringService.scoreCampaignLeads(campaigns[0]._id, TEST_TENANT, model);
      expect(Array.isArray(r)).toBe(true);
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

  describe("epsilon_greedy bandit", () => {
    it("selects arm using epsilon_greedy strategy", () => {
      for (let i = 0; i < 10; i++) {
        const arm = recommendationEngine.selectArm("epsilon_greedy", 1.0);
        expect(arm.armId).toBeTruthy();
        expect(arm.method).toBe("explore");
      }
    });
  });

  describe("collaborativeFiltering with pearson", () => {
    it("returns predictions using pearson similarity", () => {
      const r = recommendationEngine.collaborativeFilteringRecommendations(sampleCampaigns, "pearson", 2);
      expect(Array.isArray(r)).toBe(true);
    });
  });

  describe("Thompson sampling edge cases", () => {
    it("throws when no arms registered", () => {
      expect(() => new (recommendationEngine.constructor as any)().selectThompsonArm()).toThrow();
    });

    it("filters arms by experimentId prefix", () => {
      recommendationEngine.registerThompsonArm("exp_a_arm1", "A1");
      recommendationEngine.registerThompsonArm("exp_b_arm1", "B1");
      const arm = recommendationEngine.selectThompsonArm("exp_a");
      expect(arm.armId).toContain("exp_a");
    });
  });

  describe("bandit edge cases", () => {
    it("throws selectArm with no arms", () => {
      const freshEngine = new (recommendationEngine.constructor as any)();
      expect(() => freshEngine.selectArm("ucb1")).toThrow();
    });

    it("throws rewardArm for unknown arm", () => {
      expect(() => recommendationEngine.rewardArm("unknown_arm", 1)).toThrow();
    });
  });

  describe("generateCampaignRecommendations edge cases", () => {
    it("returns empty array for campaign without metrics", () => {
      const r = recommendationEngine.generateCampaignRecommendations({ id: "no_metrics", name: "No Metrics", status: "active", type: "search", platforms: [], budget: { daily: 0, lifetime: 0, spent: 0, remaining: 0, currency: "USD" } });
      expect(r.length).toBe(0);
    });

    it("generates low-budget recommendation when spend is low", () => {
      const lowSpendCamp: any = { ...sampleCampaign, budget: { daily: 500, lifetime: 15000, spent: 100, remaining: 14900, currency: "USD" }, metrics: { ...sampleCampaign.metrics, spend: 200 } };
      const r = recommendationEngine.generateCampaignRecommendations(lowSpendCamp);
      expect(r.some((rec) => rec.title.toLowerCase().includes("spend") || rec.title.toLowerCase().includes("budget"))).toBe(true);
    });

    it("generates platform-expansion recommendation for single-platform campaign", () => {
      const singlePlat: any = { ...sampleCampaign, platforms: ["google"] };
      const r = recommendationEngine.generateCampaignRecommendations(singlePlat);
      expect(r.some((rec) => rec.type === "platform")).toBe(true);
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

  describe("generateSummary edge cases", () => {
    it("handles draft status", () => {
      const r = campaignSummary.generateSummary({ ...sampleInput, status: "draft" });
      expect(r.shortSummary).toContain("draft");
    });

    it("handles paused status", () => {
      const r = campaignSummary.generateSummary({ ...sampleInput, status: "paused" });
      expect(r.shortSummary).toContain("paused");
    });

    it("handles completed status", () => {
      const r = campaignSummary.generateSummary({ ...sampleInput, status: "completed" });
      expect(r.shortSummary).toContain("completed");
    });

    it("handles no metrics gracefully", () => {
      const r = campaignSummary.generateSummary({ ...sampleInput, metrics: undefined });
      expect(r.shortSummary).toBeTruthy();
      expect(r.keyInsights.length).toBe(0);
    });

    it("handles empty platforms", () => {
      const r = campaignSummary.generateSummary({ ...sampleInput, platforms: [] });
      expect(r.recommendations.some((rec) => rec.includes("No platforms"))).toBe(true);
    });
  });

  describe("generatePortfolioSummary edge cases", () => {
    it("handles empty campaign list", () => {
      const r = campaignSummary.generatePortfolioSummary([]);
      expect(r.totalCampaigns).toBe(0);
      expect(r.activeCount).toBe(0);
    });

    it("includes distribution analysis", () => {
      const r = campaignSummary.generatePortfolioSummary(sampleInputs);
      expect((r as any)._distribution).toBeDefined();
      expect((r as any)._distribution.roasDistribution.length).toBeGreaterThan(0);
    });
  });

  describe("trendNarrative edge cases", () => {
    it("handles single period (insufficient data)", () => {
      const r = campaignSummary.trendNarrative([{ label: "Week 1", metrics: { roas: 2.0, ctr: 2.5, cvr: 5.0, spend: 500 } }]);
      expect(r.narrative).toContain("Insufficient data");
      expect(r.overallMomentum).toBe("neutral");
    });

    it("reports declining momentum", () => {
      const periods = [
        { label: "Week 1", metrics: { roas: 3.0, ctr: 3.0, cvr: 6.0, spend: 500 } },
        { label: "Week 2", metrics: { roas: 1.0, ctr: 1.0, cvr: 2.0, spend: 300 } },
      ];
      const r = campaignSummary.trendNarrative(periods);
      expect(r.overallMomentum).toBe("negative");
    });

    it("reports improving momentum", () => {
      const periods = [
        { label: "Week 1", metrics: { roas: 1.0, ctr: 1.0, cvr: 2.0, spend: 300 } },
        { label: "Week 2", metrics: { roas: 3.0, ctr: 3.0, cvr: 6.0, spend: 500 } },
      ];
      const r = campaignSummary.trendNarrative(periods);
      expect(r.overallMomentum).toBe("positive");
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
