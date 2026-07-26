import { describe, it, expect } from "vitest";
import { predictiveBiddingService } from "../services/PredictiveBiddingService";
import { customerLifetimeValueService, CustomerTransaction } from "../services/CustomerLifetimeValueService";
import { naturalLanguageInsightService } from "../services/NaturalLanguageInsightService";

describe("PredictiveBiddingService", () => {
  describe("getConfig", () => {
    it("returns default Q-learning configuration", () => {
      const config = predictiveBiddingService.getConfig();
      expect(config.learningRate).toBe(0.1);
      expect(config.discountFactor).toBe(0.9);
      expect(config.explorationRate).toBeGreaterThan(0);
      expect(config.stateBins).toBe(5);
    });
  });

  describe("recommendBid", () => {
    it("returns a bid recommendation with expected fields", () => {
      const state = predictiveBiddingService.generateSampleBidState("meta");
      const rec = predictiveBiddingService.recommendBid(state, "test_campaign_1");
      expect(rec).toHaveProperty("platformId");
      expect(rec).toHaveProperty("campaignId");
      expect(rec).toHaveProperty("recommendedBid");
      expect(rec).toHaveProperty("currentBid");
      expect(rec).toHaveProperty("action");
      expect(rec).toHaveProperty("qValue");
      expect(rec).toHaveProperty("confidence");
      expect(rec).toHaveProperty("expectedClicks");
      expect(rec).toHaveProperty("expectedCost");
    });

    it("recommends a bid with 8 possible actions", () => {
      const state = predictiveBiddingService.generateSampleBidState("google");
      const rec = predictiveBiddingService.recommendBid(state, "test_campaign_2");
      expect(["aggressive_reduce", "moderate_reduce", "slight_reduce", "maintain", "slight_increase", "moderate_increase", "aggressive_increase", "double_bid"]).toContain(rec.action);
    });

    it("returns confidence between 0 and 1", () => {
      const state = predictiveBiddingService.generateSampleBidState("linkedin");
      const rec = predictiveBiddingService.recommendBid(state, "test_campaign_3");
      expect(rec.confidence).toBeGreaterThanOrEqual(0);
      expect(rec.confidence).toBeLessThanOrEqual(1);
    });

    it("generates sample bid state with all fields", () => {
      const state = predictiveBiddingService.generateSampleBidState("tiktok");
      expect(state).toHaveProperty("platformId");
      expect(state).toHaveProperty("campaignId");
      expect(state).toHaveProperty("currentBid");
      expect(state).toHaveProperty("remainingBudget");
      expect(state).toHaveProperty("impressionsRemaining");
      expect(state).toHaveProperty("hourInDay");
      expect(state).toHaveProperty("dayOfWeek");
      expect(state.platformId).toBe("tiktok");
    });
  });

  describe("applyReward", () => {
    it("updates Q-value and returns temporal difference", () => {
      const state = predictiveBiddingService.generateSampleBidState("meta");
      const result = predictiveBiddingService.applyReward("test_campaign_4", state, 3, 1.5);
      expect(result).toHaveProperty("qValue");
      expect(result).toHaveProperty("temporalDifference");
      expect(result).toHaveProperty("updatedQ");
      expect(result).toHaveProperty("learningRate");
      expect(result).toHaveProperty("discountFactor");
    });
  });

  describe("simulateEpisode", () => {
    it("runs a full episode and learns a strategy", () => {
      const state = predictiveBiddingService.generateSampleBidState("google");
      const result = predictiveBiddingService.simulateEpisode("test_campaign_5", state, 5);
      expect(result).toHaveProperty("episodeReward");
      expect(result).toHaveProperty("steps");
      expect(result).toHaveProperty("learnedStrategy");
      expect(result.steps.length).toBe(5);
      expect(["aggressive", "moderate", "conservative"]).toContain(result.learnedStrategy);
    });

    it("each step has action, state, and reward", () => {
      const state = predictiveBiddingService.generateSampleBidState("meta");
      const result = predictiveBiddingService.simulateEpisode("test_campaign_6", state, 3);
      for (const step of result.steps) {
        expect(step).toHaveProperty("action");
        expect(step).toHaveProperty("state");
        expect(step).toHaveProperty("reward");
      }
    });
  });

  describe("getQTableSnapshot", () => {
    it("returns Q-table entries after training", () => {
      const state = predictiveBiddingService.generateSampleBidState("linkedin");
      predictiveBiddingService.applyReward("test_campaign_7", state, 1, 0.8);
      const snapshot = predictiveBiddingService.getQTableSnapshot("test_campaign_7");
      expect(Array.isArray(snapshot)).toBe(true);
      if (snapshot.length > 0) {
        expect(snapshot[0]).toHaveProperty("state");
        expect(snapshot[0]).toHaveProperty("qValues");
        expect(snapshot[0]).toHaveProperty("bestAction");
      }
    });

    it("returns empty array for unknown campaign", () => {
      const snapshot = predictiveBiddingService.getQTableSnapshot("nonexistent");
      expect(snapshot).toEqual([]);
    });
  });

  describe("getActionHistory", () => {
    it("returns action history for a campaign", () => {
      const state = predictiveBiddingService.generateSampleBidState("meta");
      predictiveBiddingService.applyReward("test_campaign_8", state, 2, 1.0);
      const history = predictiveBiddingService.getActionHistory("test_campaign_8");
      expect(Array.isArray(history)).toBe(true);
    });
  });
});

describe("CustomerLifetimeValueService", () => {
  describe("predictCLV", () => {
    it("returns a CLV prediction with all required fields", () => {
      const customer: CustomerTransaction = {
        customerId: "cust_1",
        customerName: "Alice Johnson",
        firstPurchase: "2024-01-15",
        lastPurchase: "2025-06-01",
        frequency: 12,
        monetaryValue: 150,
        recency: 30,
        tenure: 365,
      };
      const prediction = customerLifetimeValueService.predictCLV(customer);
      expect(prediction).toHaveProperty("customerId");
      expect(prediction).toHaveProperty("customerName");
      expect(prediction).toHaveProperty("predictedTransactions");
      expect(prediction).toHaveProperty("predictedMonetaryValue");
      expect(prediction).toHaveProperty("predictedCLV");
      expect(prediction).toHaveProperty("probabilityAlive");
      expect(prediction).toHaveProperty("confidenceInterval");
      expect(prediction).toHaveProperty("segment");
    });

    it("predicts higher CLV for high-frequency customers", () => {
      const highFreq: CustomerTransaction = {
        customerId: "cust_2", customerName: "Bob Smith",
        firstPurchase: "2023-01-01", lastPurchase: "2025-06-01",
        frequency: 50, monetaryValue: 200, recency: 10, tenure: 700,
      };
      const lowFreq: CustomerTransaction = {
        customerId: "cust_3", customerName: "Carol Williams",
        firstPurchase: "2024-06-01", lastPurchase: "2024-08-01",
        frequency: 2, monetaryValue: 100, recency: 300, tenure: 365,
      };
      const highPred = customerLifetimeValueService.predictCLV(highFreq);
      const lowPred = customerLifetimeValueService.predictCLV(lowFreq);
      expect(highPred.predictedCLV).toBeGreaterThan(lowPred.predictedCLV);
    });

    it("classifies zero-frequency customers as new", () => {
      const newCustomer: CustomerTransaction = {
        customerId: "cust_4", customerName: "New User",
        firstPurchase: "2025-06-10", lastPurchase: "2025-06-10",
        frequency: 0, monetaryValue: 0, recency: 0, tenure: 1,
      };
      const prediction = customerLifetimeValueService.predictCLV(newCustomer);
      expect(prediction.segment).toBe("new");
    });

    it("probabilityAlive is between 0 and 1", () => {
      const customer: CustomerTransaction = {
        customerId: "cust_5", customerName: "Test User",
        firstPurchase: "2024-01-01", lastPurchase: "2025-06-01",
        frequency: 5, monetaryValue: 100, recency: 60, tenure: 400,
      };
      const prediction = customerLifetimeValueService.predictCLV(customer);
      expect(prediction.probabilityAlive).toBeGreaterThanOrEqual(0);
      expect(prediction.probabilityAlive).toBeLessThanOrEqual(1);
    });

    it("confidence interval has lower bound <= upper bound", () => {
      const customer: CustomerTransaction = {
        customerId: "cust_6", customerName: "Test User",
        firstPurchase: "2024-01-01", lastPurchase: "2025-06-01",
        frequency: 8, monetaryValue: 120, recency: 45, tenure: 500,
      };
      const prediction = customerLifetimeValueService.predictCLV(customer);
      expect(prediction.confidenceInterval[0]).toBeLessThanOrEqual(prediction.confidenceInterval[1]);
    });
  });

  describe("batchPredictCLV", () => {
    it("predicts CLV for multiple customers", () => {
      const customers = customerLifetimeValueService.generateSampleCustomers(5);
      const predictions = customerLifetimeValueService.batchPredictCLV(customers);
      expect(predictions.length).toBe(5);
      for (const p of predictions) {
        expect(p).toHaveProperty("predictedCLV");
      }
    });
  });

  describe("cohortAnalysis", () => {
    it("groups customers by cohort period", () => {
      const customers = customerLifetimeValueService.generateSampleCustomers(20);
      const cohorts = customerLifetimeValueService.cohortAnalysis(customers);
      expect(Array.isArray(cohorts)).toBe(true);
      if (cohorts.length > 0) {
        expect(cohorts[0]).toHaveProperty("cohortName");
        expect(cohorts[0]).toHaveProperty("customerCount");
        expect(cohorts[0]).toHaveProperty("averageCLV");
        expect(cohorts[0]).toHaveProperty("retentionRate");
        expect(cohorts[0]).toHaveProperty("revenueShare");
      }
    });

    it("sorts cohorts by period ascending", () => {
      const customers = customerLifetimeValueService.generateSampleCustomers(30);
      const cohorts = customerLifetimeValueService.cohortAnalysis(customers);
      for (let i = 1; i < cohorts.length; i++) {
        expect(cohorts[i].period.localeCompare(cohorts[i - 1].period)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("segmentCustomers", () => {
    it("returns segments with recommendations", () => {
      const customers = customerLifetimeValueService.generateSampleCustomers(25);
      const segments = customerLifetimeValueService.segmentCustomers(customers);
      expect(Array.isArray(segments)).toBe(true);
      for (const s of segments) {
        expect(s).toHaveProperty("segment");
        expect(s).toHaveProperty("count");
        expect(s).toHaveProperty("averageCLV");
        expect(s).toHaveProperty("recommendations");
        expect(Array.isArray(s.recommendations)).toBe(true);
      }
    });

    it("sorts segments by total value descending", () => {
      const customers = customerLifetimeValueService.generateSampleCustomers(30);
      const segments = customerLifetimeValueService.segmentCustomers(customers);
      for (let i = 1; i < segments.length; i++) {
        expect(segments[i].totalValue).toBeLessThanOrEqual(segments[i - 1].totalValue);
      }
    });
  });

  describe("generateSampleCustomers", () => {
    it("generates the requested number of customers", () => {
      const customers = customerLifetimeValueService.generateSampleCustomers(15);
      expect(customers.length).toBe(15);
      expect(customers[0]).toHaveProperty("customerId");
      expect(customers[0]).toHaveProperty("customerName");
      expect(customers[0]).toHaveProperty("frequency");
    });
  });
});

describe("NaturalLanguageInsightService", () => {
  describe("analyzeSentiment", () => {
    it("returns positive for positive text", () => {
      const result = naturalLanguageInsightService.analyzeSentiment("This is an amazing and innovative product. I love it!");
      expect(result.label).toBe("positive");
      expect(result.score).toBeGreaterThan(0);
    });

    it("returns negative for negative text", () => {
      const result = naturalLanguageInsightService.analyzeSentiment("This is a terrible and disappointing experience. Waste of money.");
      expect(result.label).toBe("negative");
      expect(result.score).toBeLessThan(0);
    });

    it("returns neutral for factual text", () => {
      const result = naturalLanguageInsightService.analyzeSentiment("The product was released on Tuesday. It costs $49.99.");
      expect(result.label).toBe("neutral");
    });

    it("returns confidence between 0 and 1", () => {
      const result = naturalLanguageInsightService.analyzeSentiment("Great product, highly recommended!");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("returns aspects with terms", () => {
      const result = naturalLanguageInsightService.analyzeSentiment("The amazing product works perfectly with excellent support");
      expect(result).toHaveProperty("aspects");
      expect(Array.isArray(result.aspects)).toBe(true);
    });
  });

  describe("extractKeywords", () => {
    it("extracts keywords from text", () => {
      const result = naturalLanguageInsightService.extractKeywords("Discover the future of marketing AI platform with advanced analytics");
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.keywords[0]).toHaveProperty("word");
      expect(result.keywords[0]).toHaveProperty("score");
      expect(result.keywords[0]).toHaveProperty("frequency");
    });

    it("extracts bigrams from text", () => {
      const result = naturalLanguageInsightService.extractKeywords("best marketing platform for business growth and customer engagement");
      expect(result).toHaveProperty("bigrams");
    });

    it("has dominant topic", () => {
      const result = naturalLanguageInsightService.extractKeywords("Save money with our discount offers and best deals");
      expect(result).toHaveProperty("dominantTopic");
      expect(result).toHaveProperty("topicDistribution");
    });
  });

  describe("computeReadability", () => {
    it("computes Flesch-Kincaid score", () => {
      const result = naturalLanguageInsightService.computeReadability("This is a very simple sentence. It is easy to read.");
      expect(result).toHaveProperty("fleschKincaid");
      expect(result).toHaveProperty("gradeLevel");
      expect(result).toHaveProperty("wordCount", 11);
      expect(result).toHaveProperty("sentenceCount", 2);
    });

    it("identifies difficult text", () => {
      const result = naturalLanguageInsightService.computeReadability("The aforementioned computational methodology demonstrates significant improvements in quantitative analysis of heterogeneous data streams.");
      expect(result.gradeLevel).toBe("very_difficult");
      expect(result.complexWordPercentage).toBeGreaterThan(50);
    });

    it("identifies easy text", () => {
      const result = naturalLanguageInsightService.computeReadability("Buy now. Save big. It is easy and fast.");
      expect(result.fleschKincaid).toBeLessThan(8);
    });
  });

  describe("analyzeTone", () => {
    it("detects urgent tone", () => {
      const result = naturalLanguageInsightService.analyzeTone("Limited time offer! Act now before it's too late. Hurry!");
      expect(result).toHaveProperty("dominantTone");
      expect(result).toHaveProperty("toneScores");
      expect(result.dominantTone).toBe("urgent");
      expect(result.toneScores.urgent).toBeGreaterThan(0);
    });

    it("returns tone scores for all categories", () => {
      const result = naturalLanguageInsightService.analyzeTone("Our professional solution helps businesses grow with expert guidance.");
      const expectedTones = ["urgent", "professional", "friendly", "persuasive", "informative", "humorous", "authoritative"];
      for (const tone of expectedTones) {
        expect(result.toneScores).toHaveProperty(tone);
      }
    });

    it("detects call-to-action strength", () => {
      const result = naturalLanguageInsightService.analyzeTone("Sign up now and get started with your free trial today!");
      expect(result.callToActionStrength).toBeGreaterThan(0.3);
    });

    it("detects formality level", () => {
      const result = naturalLanguageInsightService.analyzeTone("Therefore, we recommend proceeding with the aforementioned strategy.");
      expect(result.formality).toBeGreaterThan(0.5);
    });
  });

  describe("optimizeCopy", () => {
    it("returns full copy optimization with suggestions", () => {
      const result = naturalLanguageInsightService.optimizeCopy("This is okay but could be better.");
      expect(result).toHaveProperty("originalText");
      expect(result).toHaveProperty("sentiment");
      expect(result).toHaveProperty("keywords");
      expect(result).toHaveProperty("readability");
      expect(result).toHaveProperty("tone");
      expect(result).toHaveProperty("suggestions");
      expect(result).toHaveProperty("predictedCTRLift");
    });

    it("provides actionable suggestions", () => {
      const result = naturalLanguageInsightService.optimizeCopy("Buy product.");
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("predictedCTRLift is a number", () => {
      const result = naturalLanguageInsightService.optimizeCopy("Discover the amazing new AI platform. Start your free trial today!");
      expect(typeof result.predictedCTRLift).toBe("number");
    });
  });

  describe("generateSampleCopy", () => {
    it("returns an array of sample copy texts", () => {
      const samples = naturalLanguageInsightService.generateSampleCopy();
      expect(Array.isArray(samples)).toBe(true);
      expect(samples.length).toBe(5);
      for (const s of samples) {
        expect(typeof s).toBe("string");
        expect(s.length).toBeGreaterThan(10);
      }
    });
  });
});
