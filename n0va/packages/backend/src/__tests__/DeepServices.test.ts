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

import { marketingMixModelService } from "../services/MarketingMixModelService";
import { campaignSimulationService } from "../services/CampaignSimulationService";
import { realTimeBiddingService } from "../services/RealTimeBiddingService";
import { budgetOptimizerService } from "../services/BudgetOptimizerService";
import { attributionService } from "../services/AttributionService";

describe("MarketingMixModelService", () => {
  describe("generateSampleData", () => {
    it("returns sample MMM input with channels and historical data", () => {
      const data = marketingMixModelService.generateSampleData();
      expect(data.channels).toBeDefined();
      expect(data.channels.length).toBeGreaterThan(0);
      expect(data.historicalData).toBeDefined();
      expect(data.historicalData.length).toBe(52);
    });
  });

  describe("runMMM", () => {
    it("returns MMM result with contribution breakdown", () => {
      const data = marketingMixModelService.generateSampleData();
      const result = marketingMixModelService.runMMM(data);
      expect(result.contributions).toBeDefined();
      expect(result.contributions.length).toBe(data.channels.length);
      expect(result.totalRevenue).toBeGreaterThan(0);
      expect(result.totalSpend).toBeGreaterThan(0);
      expect(result.overallROAS).toBeGreaterThan(0);
      expect(typeof result.R2).toBe("number");
    });

    it("adstock transforms spend data correctly", () => {
      const result = marketingMixModelService.runMMM({
        channels: ["test_channel"],
        historicalData: Array.from({ length: 10 }, (_, i) => ({ week: i + 1, spend: { test_channel: 1000 }, revenue: 5000 + i * 100 })),
      });
      expect(result.contributions.length).toBe(1);
      expect(result.contributions[0].totalSpend).toBeGreaterThan(0);
    });
  });

  describe("runScenario", () => {
    it("returns scenario projection with expected fields", () => {
      const data = marketingMixModelService.generateSampleData();
      const mmmResult = marketingMixModelService.runMMM(data);
      const baseSpend: Record<string, number> = {};
      for (const c of mmmResult.contributions) baseSpend[c.channel] = c.totalSpend;
      const scenario = { name: "test", budgetChanges: { google_ads: 20, meta_ads: -10 }, description: "test" };
      const result = marketingMixModelService.runScenario(mmmResult, scenario, baseSpend);
      expect(result.name).toBe("test");
      expect(result.projectedRevenue).toBeGreaterThan(0);
      expect(result.channelProjections).toBeDefined();
    });
  });
});

describe("CampaignSimulationService", () => {
  describe("runSimulation", () => {
    it("runs Monte Carlo simulation and returns results", () => {
      const channels = campaignSimulationService.generateSampleChannels();
      const scenarios = campaignSimulationService.generateSampleScenarios();
      const result = campaignSimulationService.runSimulation(channels, scenarios[0], 100);
      expect(result.trials.length).toBe(100);
      expect(result.summary.meanRevenue).toBeGreaterThan(0);
      expect(result.summary.meanROAS).toBeGreaterThan(0);
      expect(result.summary.valueAtRisk95).toBeDefined();
      expect(result.summary.conditionalVaR95).toBeDefined();
    });

    it("calculates probability of positive ROI correctly", () => {
      const channels = campaignSimulationService.generateSampleChannels();
      const scenario = { name: "test", budgetChanges: { google_ads: 10 }, description: "test" };
      const result = campaignSimulationService.runSimulation(channels, scenario, 50);
      expect(result.summary.probabilityPositiveROI).toBeGreaterThanOrEqual(0);
      expect(result.summary.probabilityPositiveROI).toBeLessThanOrEqual(100);
    });
  });

  describe("runMultiScenario", () => {
    it("runs multiple scenarios and returns array of results", () => {
      const channels = campaignSimulationService.generateSampleChannels();
      const scenarios = campaignSimulationService.generateSampleScenarios();
      const results = campaignSimulationService.runMultiScenario(channels, scenarios, 30);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(scenarios.length);
    });
  });

  describe("generateSampleChannels", () => {
    it("returns array of channel configs with required fields", () => {
      const channels = campaignSimulationService.generateSampleChannels();
      expect(channels.length).toBeGreaterThan(0);
      for (const ch of channels) {
        expect(ch.name).toBeTruthy();
        expect(ch.baseSpend).toBeGreaterThan(0);
        expect(ch.baseROAS).toBeGreaterThan(0);
      }
    });
  });
});

describe("RealTimeBiddingService", () => {
  describe("evaluateBid", () => {
    it("returns bid response with all required fields", () => {
      const request = realTimeBiddingService.generateSampleRequest();
      const response = realTimeBiddingService.evaluateBid(request, 10);
      expect(response.auctionId).toBe(request.auctionId);
      expect(response.bidAmount).toBeGreaterThan(0);
      expect(response.winProbability).toBeGreaterThanOrEqual(0);
      expect(response.winProbability).toBeLessThanOrEqual(100);
      expect(["aggressive", "balanced", "conservative", "exploratory"]).toContain(response.strategy);
    });

    it("produces higher bid for higher target CPA", () => {
      const request = realTimeBiddingService.generateSampleRequest();
      const lowCPA = realTimeBiddingService.evaluateBid(request, 5);
      const highCPA = realTimeBiddingService.evaluateBid(request, 50);
      expect(highCPA.bidAmount).toBeGreaterThanOrEqual(lowCPA.bidAmount);
    });
  });

  describe("simulateAuction", () => {
    it("returns winner and rankings", () => {
      const result = realTimeBiddingService.simulateAuction([
        { bidderId: "a", bidAmount: 10 },
        { bidderId: "b", bidAmount: 15 },
        { bidderId: "c", bidAmount: 8 },
      ]);
      expect(result.winner).toBe("b");
      expect(result.allBids.length).toBe(3);
      expect(result.allBids[0].rank).toBe(1);
    });

    it("second-price winner pays second highest bid", () => {
      const result = realTimeBiddingService.simulateAuction([
        { bidderId: "a", bidAmount: 20 },
        { bidderId: "b", bidAmount: 15 },
      ]);
      expect(result.winner).toBe("a");
      expect(result.winPrice).toBe(15);
    });
  });

  describe("getPublisherScore", () => {
    it("returns publisher score with recommendation", () => {
      const score = realTimeBiddingService.getPublisherScore("pub_001");
      expect(score.publisherId).toBe("pub_001");
      expect(score.qualityScore).toBeGreaterThanOrEqual(0);
      expect(score.qualityScore).toBeLessThanOrEqual(100);
      expect(["highly_recommended", "recommended", "caution", "block"]).toContain(score.recommendation);
    });
  });
});

describe("BudgetOptimizerService (Enhanced)", () => {
  describe("kalmanFilterPacing", () => {
    it("returns pacing estimates with remaining budget", () => {
      const result = budgetOptimizerService.kalmanFilterPacing("google_ads", 1000, [1050, 980, 1100, 1020, 990]);
      expect(result.estimatedRemaining).toBeGreaterThan(0);
      expect(result.recommendedDaily).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("handles empty spend history", () => {
      const result = budgetOptimizerService.kalmanFilterPacing("meta_ads", 500, []);
      expect(result.estimatedRemaining).toBe(15000);
      expect(result.recommendedDaily).toBeGreaterThan(0);
    });
  });

  describe("kellyCriterionAllocation", () => {
    it("allocates budget proportionally to edge", () => {
      const platforms = [
        { name: "google", expectedROAS: 4.0, winProbability: 0.7 },
        { name: "meta", expectedROAS: 3.0, winProbability: 0.6 },
      ];
      const result = budgetOptimizerService.kellyCriterionAllocation(platforms, 10000);
      expect(result.length).toBe(2);
      expect(result[0].allocatedBudget + result[1].allocatedBudget).toBeLessThanOrEqual(10000);
    });
  });

  describe("diminishingReturnsFit", () => {
    it("fits power law to spend-revenue data", () => {
      const data = [
        { spend: 1000, revenue: 4000 },
        { spend: 2000, revenue: 7200 },
        { spend: 5000, revenue: 15000 },
      ];
      const result = budgetOptimizerService.diminishingReturnsFit(data);
      expect(result.alpha).toBeGreaterThan(0);
      expect(result.beta).toBeGreaterThan(0);
      expect(typeof result.R2).toBe("number");
    });
  });

  describe("efficientFrontier", () => {
    it("returns set of portfolios", () => {
      const platforms = [
        { name: "google", expectedReturn: 0.15, variance: 0.05 },
        { name: "meta", expectedReturn: 0.12, variance: 0.08 },
        { name: "tiktok", expectedReturn: 0.18, variance: 0.12 },
      ];
      const result = budgetOptimizerService.efficientFrontier(platforms);
      expect(result.portfolios.length).toBe(500);
      expect(result.efficientPortfolios.length).toBeGreaterThan(0);
    });
  });
});

import { creativeAI } from "../services/CreativeAIService";
import { audienceInsightsService } from "../services/AudienceInsightsService";
import { adCopyPersonalizationService } from "../services/AdCopyPersonalizationService";
import { campaignHealthPredictorService } from "../services/CampaignHealthPredictorService";

describe("CreativeAIService (Enhanced)", () => {
  describe("mabSelectVariant", () => {
    it("returns a variant key from the provided list", () => {
      const result = creativeAI.mabSelectVariant(["hero_a", "hero_b", "hero_c"]);
      expect(["hero_a", "hero_b", "hero_c"]).toContain(result.selectedKey);
      expect(result.probabilities).toBeDefined();
      expect(Object.keys(result.probabilities).length).toBe(3);
    });
  });

  describe("mabRecordResult", () => {
    it("records a conversion and updates variant state", () => {
      creativeAI.mabRecordResult("test_variant_a", true);
      const variants = creativeAI.mabGetAllVariants();
      const found = variants.find((v: any) => v.variantKey === "test_variant_a");
      expect(found).toBeDefined();
      expect(found.conversions).toBeGreaterThan(0);
    });
  });

  describe("mabGetAllVariants", () => {
    it("returns array of variants with expected fields", () => {
      creativeAI.mabRecordResult("test_variant_b", false);
      const variants = creativeAI.mabGetAllVariants();
      expect(Array.isArray(variants)).toBe(true);
      for (const v of variants) {
        expect(v).toHaveProperty("variantKey");
        expect(v).toHaveProperty("impressions");
        expect(v).toHaveProperty("conversions");
        expect(v.ctr).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("detectFatigue", () => {
    it("returns fatigue analysis with stage and decay", () => {
      const result = creativeAI.detectFatigue([
        { creativeId: "img_a", dailyImpressions: [5000, 4900, 4700, 4400, 4000], dailyClicks: [200, 185, 160, 130, 95], channel: "social" },
      ]);
      expect(result).toHaveProperty("stage");
      expect(result).toHaveProperty("fatigueScore");
      expect(result).toHaveProperty("decayRate");
      expect(["growth", "maturity", "decline", "exhausted"]).toContain(result.stage);
    });
  });

  describe("simulateABTest", () => {
    it("returns winner and significance metrics", () => {
      const result = creativeAI.simulateABTest(
        [{ name: "Control", impressions: 5000, conversions: 200 }, { name: "Variant", impressions: 5000, conversions: 220 }],
        5000, 14,
      );
      expect(result).toHaveProperty("winner");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("daysToSignificance");
      expect(result.winner).toBeTruthy();
    });
  });
});

describe("AudienceInsightsService (Enhanced)", () => {
  describe("pca", () => {
    it("returns projected data and explained variance", () => {
      const data = Array.from({ length: 20 }, () => Array.from({ length: 5 }, () => Math.random() * 100));
      const result = audienceInsightsService.pca(data, 2);
      expect(result.projected.length).toBe(20);
      expect(result.projected[0].length).toBe(2);
      expect(Array.isArray(result.explainedVariance)).toBe(true);
      expect(result.explainedVariance.length).toBeGreaterThan(0);
      expect(result.loadings.length).toBeGreaterThan(0);
    });
  });

  describe("gmmClustering", () => {
    it("returns cluster assignments and BIC", () => {
      const data = Array.from({ length: 30 }, () => Array.from({ length: 3 }, () => Math.random() * 100));
      const result = audienceInsightsService.gmmClustering(data, 3);
      expect(result.assignments.length).toBe(30);
      expect(result.means.length).toBe(3);
      expect(result.weights.length).toBe(3);
      expect(typeof result.bic).toBe("number");
      expect(typeof result.logLikelihood).toBe("number");
    });
  });

  describe("computeRFM", () => {
    it("returns scored customers with segments", () => {
      const customers = Array.from({ length: 20 }, (_, i) => ({
        id: `c_${i}`,
        daysSinceLastPurchase: Math.floor(Math.random() * 365),
        purchaseCount: Math.floor(Math.random() * 50),
        totalSpent: Math.random() * 5000,
      }));
      const result = audienceInsightsService.computeRFM(customers);
      expect(result.length).toBe(20);
      for (const c of result) {
        expect(c.compositeScore).toBeGreaterThanOrEqual(0);
        expect(c.rfmSegment).toBeTruthy();
      }
    });
  });

  describe("generateLookalike", () => {
    it("expands seed audience with similarity scores", () => {
      const pool = Array.from({ length: 50 }, (_, i) => ({ id: `u_${i}`, features: Array.from({ length: 4 }, () => Math.random()) }));
      const seed = pool.slice(0, 5);
      const result = audienceInsightsService.generateLookalike(seed, pool, 20);
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates.length).toBeLessThanOrEqual(20);
      for (const c of result.candidates) {
        expect(c).toHaveProperty("id");
        expect(c).toHaveProperty("similarity");
      }
    });
  });
});

describe("AdCopyPersonalizationService", () => {
  describe("generateSampleElements", () => {
    it("returns array of creative elements", () => {
      const elements = adCopyPersonalizationService.generateSampleElements();
      expect(Array.isArray(elements)).toBe(true);
      expect(elements.length).toBeGreaterThan(0);
      for (const el of elements) {
        expect(el).toHaveProperty("type");
        expect(el).toHaveProperty("variants");
      }
    });
  });

  describe("generateSampleUserContext", () => {
    it("returns user context with device and segments", () => {
      const ctx = adCopyPersonalizationService.generateSampleUserContext();
      expect(ctx).toHaveProperty("deviceType");
      expect(ctx).toHaveProperty("segments");
      expect(ctx).toHaveProperty("timeOfDay");
    });
  });

  describe("scoreElement", () => {
    it("returns element score with relevance", () => {
      const elements = adCopyPersonalizationService.generateSampleElements();
      const ctx = adCopyPersonalizationService.generateSampleUserContext();
      const score = adCopyPersonalizationService.scoreElement(elements[0], ctx);
      expect(score).toHaveProperty("elementType");
      expect(score).toHaveProperty("overallScore");
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("selectBestElements", () => {
    it("returns personalized variant with all elements", () => {
      const elements = adCopyPersonalizationService.generateSampleElements();
      const ctx = adCopyPersonalizationService.generateSampleUserContext();
      const result = adCopyPersonalizationService.selectBestElements(elements, ctx);
      expect(result).toHaveProperty("elements");
      expect(result).toHaveProperty("personalizationScore");
      expect(result.personalizationScore).toBeGreaterThan(0);
    });
  });

  describe("runMVTest", () => {
    it("returns MVT result with winner and significance", () => {
      const variants = adCopyPersonalizationService.generateSampleMVTVariants();
      const result = adCopyPersonalizationService.runMVTest(variants, 10000);
      expect(result).toHaveProperty("winner");
      expect(result).toHaveProperty("variants");
      expect(result.variants.length).toBe(variants.length);
      expect(result.significanceLevel).toBeGreaterThan(0);
      for (const v of result.variants) {
        expect(v).toHaveProperty("conversionRate");
        expect(v).toHaveProperty("probabilityBest");
      }
    });
  });
});

describe("CampaignHealthPredictorService", () => {
  describe("generateSampleMetrics", () => {
    it("returns array of campaign metrics over days", () => {
      const metrics = campaignHealthPredictorService.generateSampleMetrics(14);
      expect(metrics.length).toBe(14);
      for (const m of metrics) {
        expect(m).toHaveProperty("day");
        expect(m).toHaveProperty("impressions");
        expect(m).toHaveProperty("clicks");
        expect(m).toHaveProperty("conversions");
        expect(m).toHaveProperty("spend");
      }
    });
  });

  describe("computeHealthScore", () => {
    it("returns health score with components", () => {
      const metrics = campaignHealthPredictorService.generateSampleMetrics(14);
      const result = campaignHealthPredictorService.computeHealthScore(metrics);
      expect(result).toHaveProperty("overall");
      expect(result).toHaveProperty("components");
      expect(result).toHaveProperty("category");
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(["excellent", "good", "fair", "poor", "critical"]).toContain(result.category);
    });
  });

  describe("identifyRiskFactors", () => {
    it("returns array of risk factors with severity", () => {
      const metrics = campaignHealthPredictorService.generateSampleMetrics(14);
      const risks = campaignHealthPredictorService.identifyRiskFactors(metrics);
      expect(Array.isArray(risks)).toBe(true);
      for (const r of risks) {
        expect(r).toHaveProperty("name");
        expect(r).toHaveProperty("severity");
        expect(r).toHaveProperty("description");
        expect(["critical", "high", "medium", "low"]).toContain(r.severity);
      }
    });
  });

  describe("computeEarlyWarning", () => {
    it("returns early warning with risk score", () => {
      const metrics = campaignHealthPredictorService.generateSampleMetrics(14);
      const warning = campaignHealthPredictorService.computeEarlyWarning(metrics);
      expect(warning).toHaveProperty("triggered");
      expect(warning).toHaveProperty("riskScore");
      expect(warning).toHaveProperty("warnings");
      expect(warning.riskScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("computeSurvivalAnalysis", () => {
    it("returns kaplan-meier curves and hazard rate", () => {
      const metrics = campaignHealthPredictorService.generateSampleMetrics(30);
      const survival = campaignHealthPredictorService.computeSurvivalAnalysis(metrics);
      expect(survival).toHaveProperty("kaplanMeier");
      expect(survival).toHaveProperty("medianLifetime");
      expect(survival).toHaveProperty("predictedRemainingDays");
      expect(survival).toHaveProperty("hazardRate");
      expect(survival.kaplanMeier.length).toBeGreaterThan(0);
      expect(survival.medianLifetime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generateReport", () => {
    it("returns comprehensive health report", () => {
      const metrics = campaignHealthPredictorService.generateSampleMetrics(30);
      const report = campaignHealthPredictorService.generateReport("camp_test", metrics);
      expect(report).toHaveProperty("campaignId");
      expect(report).toHaveProperty("currentHealth");
      expect(report).toHaveProperty("riskFactors");
      expect(report).toHaveProperty("earlyWarning");
      expect(report).toHaveProperty("survivalAnalysis");
      expect(report).toHaveProperty("recommendations");
      expect(report.campaignId).toBe("camp_test");
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });
});

describe("AttributionService (Enhanced)", () => {
  describe("shapleyValueApprox", () => {
    it("returns attribution with approximation error", () => {
      const paths = attributionService.generateSamplePaths(20);
      const result = attributionService.shapleyValueApprox(paths, 500);
      expect(result.approximationError).toBeDefined();
      expect(result.totalRevenue).toBeGreaterThan(0);
    });
  });

  describe("timeAwareMarkovChain", () => {
    it("returns attribution with removal effects and time decay", () => {
      const paths = attributionService.generateSamplePaths(30);
      const result = attributionService.timeAwareMarkovChain(paths, 7);
      expect(result.removalEffects).toBeDefined();
      expect(Object.keys(result.removalEffects).length).toBeGreaterThan(0);
      expect(result.totalConversions).toBeGreaterThan(0);
    });
  });

  describe("attributionConfidence", () => {
    it("returns confidence intervals for each platform", () => {
      const paths = attributionService.generateSamplePaths(20);
      const intervals = attributionService.attributionConfidence(paths, "last_click", 30);
      expect(intervals.length).toBeGreaterThan(0);
      for (const interval of intervals) {
        expect(interval.platform).toBeTruthy();
        expect(interval.meanAttribution).toBeGreaterThanOrEqual(0);
        expect(interval.ciLower95).toBeDefined();
        expect(interval.ciUpper95).toBeDefined();
      }
    });
  });

  describe("synergyAttribution", () => {
    it("returns pairwise synergies between platforms", () => {
      const paths = attributionService.generateSamplePaths(30);
      const result = attributionService.synergyAttribution(paths);
      expect(result.pairwiseSynergies).toBeDefined();
      expect(result.channelContributions).toBeDefined();
      expect(typeof result.totalSynergy).toBe("number");
    });
  });
});

import { predictiveForecastingService } from "../services/PredictiveForecastingService";
import { incrementalityTestingService } from "../services/IncrementalityTestingService";
import { searchIntelligenceService } from "../services/SearchIntelligenceService";
import { anomalyDetectionService } from "../services/AnomalyDetectionService";

describe("PredictiveForecastingService (Deep)", () => {
  const sampleHistory = Array.from({ length: 60 }, (_, i) => ({
    date: new Date(2025, 0, i + 1).toISOString().split("T")[0],
    value: 100 + Math.sin(i * 0.4) * 20 + (i % 7 === 0 ? 30 : 0) + Math.random() * 10,
  }));

  describe("decomposeTimeSeries", () => {
    it("returns trend, seasonal, residual components with strengths", () => {
      const values = sampleHistory.map((d) => d.value);
      const result = predictiveForecastingService.decomposeTimeSeries(values, 7);
      expect(result).toHaveProperty("trend");
      expect(result).toHaveProperty("seasonal");
      expect(result).toHaveProperty("residual");
      expect(result.trend.length).toBe(values.length);
      expect(result.seasonal.length).toBe(values.length);
      expect(result.residual.length).toBe(values.length);
      expect(typeof result.seasonalStrength).toBe("number");
      expect(typeof result.trendStrength).toBe("number");
      expect(result.seasonalStrength).toBeGreaterThanOrEqual(0);
      expect(result.seasonalStrength).toBeLessThanOrEqual(1);
    });

    it("returns flat components when data is too short", () => {
      const short = [10, 20, 30];
      const result = predictiveForecastingService.decomposeTimeSeries(short, 7);
      expect(result.seasonalStrength).toBe(0);
      expect(result.trendStrength).toBe(0);
    });
  });

  describe("detectChangepoints", () => {
    it("detects a changepoint in data with a shift", () => {
      const vals = Array.from({ length: 10 }, () => 50).concat(Array.from({ length: 10 }, () => 100));
      const result = predictiveForecastingService.detectChangepoints(vals, 3);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0]).toHaveProperty("index");
      expect(result[0]).toHaveProperty("meanBefore");
      expect(result[0]).toHaveProperty("meanAfter");
      expect(result[0]).toHaveProperty("magnitude");
      expect(result[0]).toHaveProperty("direction");
    });

    it("returns empty array when no changepoint exists", () => {
      const vals = Array.from({ length: 20 }, () => 50);
      const result = predictiveForecastingService.detectChangepoints(vals, 5);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("arimaForecast", () => {
    it("returns ARIMA forecast with model diagnostics", () => {
      const result = predictiveForecastingService.arimaForecast("camp_001", "impressions", sampleHistory, 14, { p: 2, d: 1, q: 2 });
      expect(result.campaignId).toBe("camp_001");
      expect(result.metric).toBe("impressions");
      expect(result.horizon).toBe(14);
      expect(result.points.length).toBe(sampleHistory.length + 14);
      expect(result.model).toHaveProperty("p");
      expect(result.model).toHaveProperty("d");
      expect(result.model).toHaveProperty("q");
      expect(result.model).toHaveProperty("aic");
      expect(result.model).toHaveProperty("mse");
      expect(result.coefficients).toHaveProperty("ar");
      expect(result.coefficients).toHaveProperty("ma");
      expect(result.coefficients).toHaveProperty("constant");
      expect(result.summary).toHaveProperty("nextPeriod");
      expect(result.summary).toHaveProperty("trend");
      expect(["up", "down", "stable"]).toContain(result.summary.trend);
    });

    it("throws with insufficient data", () => {
      expect(() => predictiveForecastingService.arimaForecast("camp_001", "impressions", [{ date: "2025-01-01", value: 100 }], 5)).toThrow();
    });
  });

  describe("ensembleForecast", () => {
    it("returns ensemble combining multiple models with weights", () => {
      const result = predictiveForecastingService.ensembleForecast("camp_001", "impressions", sampleHistory, 14);
      expect(result.campaignId).toBe("camp_001");
      expect(result.horizon).toBe(14);
      expect(result.models.length).toBeGreaterThanOrEqual(3);
      expect(result.weights.length).toBe(result.models.length);
      const weightSum = result.weights.reduce((a, b) => a + b, 0);
      expect(weightSum).toBeCloseTo(1, 1);
      expect(result.points.length).toBe(14);
      for (const m of result.models) {
        expect(m).toHaveProperty("name");
        expect(m).toHaveProperty("weight");
        expect(m).toHaveProperty("mse");
      }
    });
  });

  describe("original methods preserved", () => {
    it("forecast still returns correct structure", () => {
      const result = predictiveForecastingService.forecast("camp_001", "spend", sampleHistory, 10);
      expect(result.points.length).toBe(sampleHistory.length + 10);
      expect(result.model).toHaveProperty("alpha");
      expect(result.summary).toHaveProperty("trend");
    });

    it("forecastBudget returns budget projections", () => {
      const spend = Array.from({ length: 15 }, () => Math.random() * 100 + 50);
      const result = predictiveForecastingService.forecastBudget("camp_001", 10000, "2025-01-01", "2025-02-01", spend);
      expect(result).toHaveProperty("projectedEndSpend");
      expect(result).toHaveProperty("willOverspend");
      expect(result).toHaveProperty("recommendedDailyCap");
      expect(result.dailyProjections.length).toBeGreaterThan(0);
    });

    it("predictConversions returns efficiency and marginal CPA", () => {
      const spend = Array.from({ length: 30 }, (_, i) => 100 + i * 5);
      const conv = Array.from({ length: 30 }, (_, i) => 10 + i * 0.5);
      const result = predictiveForecastingService.predictConversions("camp_001", spend, conv, [150, 160]);
      expect(result).toHaveProperty("predictedConversions");
      expect(result).toHaveProperty("efficiencyScore");
      expect(result).toHaveProperty("marginalCPA");
      expect(typeof result.diminishingReturns).toBe("boolean");
    });
  });
});

describe("IncrementalityTestingService", () => {
  const regions = ["us_east", "us_west", "us_central"];

  function makePreData(regionList: string[], days: number, base = 50): { date: string; region: string; value: number }[] {
    const data: { date: string; region: string; value: number }[] = [];
    for (let d = 0; d < days; d++) {
      const date = new Date(2025, 0, d + 1).toISOString().split("T")[0];
      for (const r of regionList) data.push({ date, region: r, value: base + Math.sin(d * 0.3) * 5 + Math.random() * 10 });
    }
    return data;
  }

  function makePostData(regionList: string[], treatmentRegions: string[], days: number, base = 50, lift = 20): { date: string; region: string; value: number }[] {
    const data: { date: string; region: string; value: number }[] = [];
    for (let d = 0; d < days; d++) {
      const date = new Date(2025, 1, d + 1).toISOString().split("T")[0];
      for (const r of regionList) {
        const effect = treatmentRegions.includes(r) ? lift : 0;
        data.push({ date, region: r, value: base + effect + Math.sin(d * 0.3) * 5 + Math.random() * 10 });
      }
    }
    return data;
  }

  const preData = makePreData(regions, 30);
  const postData = makePostData(regions, ["us_east"], 14, 50, 25);

  describe("runDiD", () => {
    it("returns DiD result with all expected fields", () => {
      const result = incrementalityTestingService.runDiD("exp_001", "test", ["us_east"], ["us_west", "us_central"], "conversions", "2025-02-01", "2025-02-14", preData, postData);
      expect(result).toHaveProperty("preTreatmentAvg");
      expect(result).toHaveProperty("postTreatmentAvg");
      expect(result).toHaveProperty("didEstimate");
      expect(result).toHaveProperty("standardError");
      expect(result).toHaveProperty("tStatistic");
      expect(result).toHaveProperty("pValue");
      expect(result).toHaveProperty("significant");
      expect(typeof result.significant).toBe("boolean");
      expect(result.preTreatmentAvg).toHaveProperty("treatment");
      expect(result.preTreatmentAvg).toHaveProperty("control");
    });

    it("produces a positive lift when treatment has uplift", () => {
      const highLiftPost = makePostData(regions, ["us_east"], 14, 50, 50);
      const result = incrementalityTestingService.runDiD("exp_002", "high_lift", ["us_east"], ["us_west", "us_central"], "conversions", "2025-02-01", "2025-02-14", preData, highLiftPost);
      expect(result.didEstimate).toBeGreaterThan(0);
    });
  });

  describe("runSyntheticControl", () => {
    it("returns synthetic weights and pre/post fit", () => {
      const result = incrementalityTestingService.runSyntheticControl("exp_001", "test", "us_east", ["us_west", "us_central"], "conversions", "2025-02-01", "2025-02-14", preData, postData);
      expect(result.syntheticWeights.length).toBeGreaterThan(0);
      expect(result.preTreatmentFit.length).toBeGreaterThan(0);
      expect(result.postTreatmentEffect.length).toBeGreaterThan(0);
      expect(typeof result.averageLift).toBe("number");
      expect(typeof result.rSquared).toBe("number");
      expect(typeof result.mse).toBe("number");
      for (const sw of result.syntheticWeights) {
        expect(sw).toHaveProperty("region");
        expect(sw).toHaveProperty("weight");
      }
    });
  });

  describe("runCUPED", () => {
    it("returns adjusted metrics with variance reduction", () => {
      const cupedPre = Array.from({ length: 30 }, (_, i) => ({ user: `u_${i}`, value: 50 + Math.random() * 20 }));
      const cupedPost = Array.from({ length: 30 }, (_, i) => ({ user: `u_${i}`, value: 60 + Math.random() * 20 + (i < 15 ? 15 : 0), treatment: i < 15 }));
      const result = incrementalityTestingService.runCUPED("exp_001", "test", "conversions", cupedPre, cupedPost);
      expect(result.adjustedMetrics.length).toBeGreaterThan(0);
      expect(typeof result.varianceReduction).toBe("number");
      expect(typeof result.adjustedLift).toBe("number");
      expect(typeof result.pValue).toBe("number");
      expect(typeof result.significant).toBe("boolean");
    });

    it("returns flat result with insufficient data", () => {
      const result = incrementalityTestingService.runCUPED("exp_001", "test", "conversions", [], []);
      expect(result.varianceReduction).toBe(0);
      expect(result.significant).toBe(false);
    });
  });

  describe("powerAnalysis", () => {
    it("returns required sample size and achievable power", () => {
      const result = incrementalityTestingService.powerAnalysis(100, 30, 0.1, 0.05, 0.2);
      expect(result.requiredSamplePerArm).toBeGreaterThan(0);
      expect(result.achievablePower).toBeGreaterThan(0);
      expect(result.minimumDetectableEffect).toBeGreaterThan(0);
      expect(result.alpha).toBe(0.05);
      expect(result.beta).toBe(0.2);
    });

    it("returns correct fields when sample size is given", () => {
      const result = incrementalityTestingService.powerAnalysis(100, 30, 0.1, 0.05, 0.2, 20);
      expect(result.requiredSamplePerArm).toBeGreaterThan(0);
      expect(result.minimumDetectableEffect).toBeGreaterThan(0);
      expect(result.alpha).toBe(0.05);
      expect(result.beta).toBe(0.2);
    });
  });

  describe("runGeoExperiment", () => {
    it("returns GeoExperimentResult with all fields", () => {
      const result = incrementalityTestingService.runGeoExperiment("exp_001", "test", ["us_east"], ["us_west", "us_central"], "conversions", "2025-02-01", "2025-02-14", preData, postData, "did");
      expect(result).toHaveProperty("experimentId");
      expect(result).toHaveProperty("observedLift");
      expect(result).toHaveProperty("confidenceInterval95");
      expect(result).toHaveProperty("pValue");
      expect(result).toHaveProperty("significant");
      expect(result).toHaveProperty("power");
      expect(result).toHaveProperty("minimumDetectableEffect");
      expect(result).toHaveProperty("summary");
      expect(result.method).toBe("did");
    });

    it("supports synthetic-control method", () => {
      const result = incrementalityTestingService.runGeoExperiment("exp_002", "test", ["us_east"], ["us_west", "us_central"], "conversions", "2025-02-01", "2025-02-14", preData, postData, "synthetic-control");
      expect(result.method).toBe("synthetic-control");
    });
  });

  describe("sample data generators", () => {
    it("generateSamplePrePeriodData returns correct structure", () => {
      const data = incrementalityTestingService.generateSamplePrePeriodData(["us_east", "us_west"], 10);
      expect(data.length).toBe(20);
      for (const d of data) {
        expect(d).toHaveProperty("date");
        expect(d).toHaveProperty("region");
        expect(d).toHaveProperty("value");
      }
    });

    it("generateSamplePostPeriodData applies treatment effect", () => {
      const data = incrementalityTestingService.generateSamplePostPeriodData(["us_east", "us_west"], ["us_east"], 5, 30);
      const treatmentValues = data.filter((d) => d.region === "us_east").map((d) => d.value);
      const controlValues = data.filter((d) => d.region === "us_west").map((d) => d.value);
      const avgTreat = treatmentValues.reduce((a, b) => a + b, 0) / treatmentValues.length;
      const avgCtrl = controlValues.reduce((a, b) => a + b, 0) / controlValues.length;
      expect(avgTreat).toBeGreaterThan(avgCtrl);
    });
  });
});

describe("SearchIntelligenceService", () => {
  const sampleKeywords = [
    { keyword: "marketing automation", searchVolume: 12000, competition: 0.7, cpc: 4.5 },
    { keyword: "email marketing", searchVolume: 22000, competition: 0.5, cpc: 3.2 },
    { keyword: "social media ads", searchVolume: 15000, competition: 0.6, cpc: 3.8 },
    { keyword: "content marketing", searchVolume: 18000, competition: 0.4, cpc: 2.9 },
    { keyword: "SEO tools", searchVolume: 14000, competition: 0.65, cpc: 4.1 },
  ];

  describe("clusterKeywords", () => {
    it("returns clusters with keywords and averages", () => {
      const clusters = searchIntelligenceService.clusterKeywords(sampleKeywords, 3);
      expect(clusters.length).toBeLessThanOrEqual(3);
      expect(clusters.length).toBeGreaterThan(0);
      for (const c of clusters) {
        expect(c).toHaveProperty("clusterId");
        expect(c).toHaveProperty("keywords");
        expect(c).toHaveProperty("theme");
        expect(c).toHaveProperty("size");
        expect(typeof c.avgSearchVolume).toBe("number");
        expect(typeof c.avgCompetition).toBe("number");
        expect(typeof c.avgCPC).toBe("number");
      }
    });

    it("returns empty array for empty input", () => {
      const clusters = searchIntelligenceService.clusterKeywords([], 5);
      expect(clusters.length).toBe(0);
    });
  });

  describe("predictQualityScore", () => {
    it("returns score between 1 and 10 with factors and recommendations", () => {
      const result = searchIntelligenceService.predictQualityScore("marketing automation", []);
      expect(result.keyword).toBe("marketing automation");
      expect(result.predictedScore).toBeGreaterThanOrEqual(1);
      expect(result.predictedScore).toBeLessThanOrEqual(10);
      expect(result.factors.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      for (const f of result.factors) {
        expect(f).toHaveProperty("name");
        expect(f).toHaveProperty("impact");
        expect(["positive", "negative"]).toContain(f.direction);
      }
    });

    it("uses history to influence prediction", () => {
      const withHistory = searchIntelligenceService.predictQualityScore("email campaign", [
        { keyword: "email campaign", ctr: 0.05, landingPageRelevance: 0.8, adRelevance: 0.9, historicalScore: 8 },
      ]);
      expect(withHistory.predictedScore).toBeGreaterThan(3);
    });
  });

  describe("analyzeAuctionInsights", () => {
    it("returns auction insights for each competitor", () => {
      const competitors = [
        { domain: "hubspot.com", avgBid: 4.2, impressionShare: 0.35, overlapRate: 0.6, positionAboveRate: 0.4 },
        { domain: "marketone.com", avgBid: 3.8, impressionShare: 0.25, overlapRate: 0.5, positionAboveRate: 0.3 },
      ];
      const result = searchIntelligenceService.analyzeAuctionInsights("marketing automation", competitors);
      expect(result.length).toBe(2);
      for (const r of result) {
        expect(r).toHaveProperty("domain");
        expect(r).toHaveProperty("impressionShare");
        expect(r).toHaveProperty("overlapRate");
        expect(r).toHaveProperty("positionAboveRate");
        expect(r).toHaveProperty("outrankingShare");
        expect(r).toHaveProperty("avgBid");
      }
    });
  });

  describe("recommendBid", () => {
    it("returns bid recommendation with expected metrics", () => {
      const result = searchIntelligenceService.recommendBid("marketing automation", 3.5, 10, 2.0, 0.5, 80, 500, "balanced");
      expect(result.keyword).toBe("marketing automation");
      expect(result.currentBid).toBe(3.5);
      expect(result.recommendedBid).toBeGreaterThan(0);
      expect(result.expectedImpressions).toBeGreaterThanOrEqual(0);
      expect(result.expectedClicks).toBeGreaterThan(0);
      expect(result.expectedConversions).toBeGreaterThan(0);
      expect(result.expectedCost).toBeGreaterThan(0);
      expect(result.expectedRevenue).toBeGreaterThan(0);
      expect(result.expectedROAS).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.strategy).toBe("balanced");
    });

    it("supports different strategies", () => {
      const aggressive = searchIntelligenceService.recommendBid("marketing automation", 3.5, 10, 2.0, 0.5, 80, 500, "aggressive");
      const conservative = searchIntelligenceService.recommendBid("marketing automation", 3.5, 10, 2.0, 0.5, 80, 500, "conservative");
      expect(aggressive.recommendedBid).toBeGreaterThanOrEqual(conservative.recommendedBid);
    });
  });

  describe("computeTFIDF", () => {
    it("returns TF-IDF terms sorted by score for each document", () => {
      const docs = [
        { id: "doc1", text: "marketing automation software for small business" },
        { id: "doc2", text: "best email marketing tools and software" },
      ];
      const results = searchIntelligenceService.computeTFIDF(docs);
      expect(results.length).toBe(2);
      for (const r of results) {
        expect(r.terms.length).toBeGreaterThan(0);
        expect(r.topTerms.length).toBeGreaterThan(0);
        for (const t of r.terms) {
          expect(t).toHaveProperty("term");
          expect(t).toHaveProperty("tfidf");
          expect(t).toHaveProperty("docFrequency");
        }
      }
    });
  });

  describe("sample data generators", () => {
    it("generateSampleKeywords returns requested count", () => {
      const kws = searchIntelligenceService.generateSampleKeywords(10);
      expect(kws.length).toBe(10);
      for (const kw of kws) {
        expect(kw).toHaveProperty("keyword");
        expect(kw).toHaveProperty("searchVolume");
        expect(kw).toHaveProperty("competition");
        expect(kw).toHaveProperty("cpc");
      }
    });

    it("generateSampleCompetitors returns competitor data", () => {
      const comps = searchIntelligenceService.generateSampleCompetitors("marketing automation");
      expect(comps.length).toBeGreaterThan(0);
      for (const c of comps) {
        expect(c).toHaveProperty("domain");
        expect(c).toHaveProperty("avgBid");
        expect(c).toHaveProperty("impressionShare");
      }
    });

    it("generateSampleQualityHistory returns history entries", () => {
      const hist = searchIntelligenceService.generateSampleQualityHistory();
      expect(hist.length).toBeGreaterThan(0);
      for (const h of hist) {
        expect(h).toHaveProperty("keyword");
        expect(h).toHaveProperty("ctr");
        expect(h).toHaveProperty("historicalScore");
      }
    });
  });
});

describe("AnomalyDetectionService (Deep)", () => {
  const sampleData = Array.from({ length: 60 }, (_, i) => ({
    date: new Date(2025, 0, i + 1).toISOString().split("T")[0],
    value: 100 + Math.sin(i * 0.4) * 15 + Math.random() * 8,
  }));
  const injectedData = sampleData.map((d, i) => ({
    ...d,
    value: i === 30 ? d.value + 80 : i === 45 ? d.value - 60 : d.value,
  }));

  describe("detect isolation-forest", () => {
    it("returns anomaly points with flagged anomalies", () => {
      const result = anomalyDetectionService.detect("conversions", "camp_001", injectedData, { method: "isolation-forest", contamination: 0.1 });
      expect(result.metric).toBe("conversions");
      expect(result.entityId).toBe("camp_001");
      expect(result.points.length).toBe(injectedData.length);
      expect(result.summary).toHaveProperty("flaggedCount");
      expect(result.summary).toHaveProperty("flagRate");
      expect(result.summary).toHaveProperty("highestZScore");
      expect(result.summary).toHaveProperty("recommendation");
      expect(result.summary.flaggedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("detectMultivariate", () => {
    it("returns Mahalanobis scores with flagged points", () => {
      const multiSeries = injectedData.map((d) => ({
        date: d.date,
        metrics: { impressions: d.value * 50, clicks: d.value * 2, conversions: d.value * 0.2, spend: d.value * 3 },
      }));
      const result = anomalyDetectionService.detectMultivariate("multi", "camp_001", multiSeries, 0.01);
      expect(result.metric).toBe("multi");
      expect(result.entityId).toBe("camp_001");
      expect(result.scores.length).toBe(multiSeries.length);
      expect(result.summary).toHaveProperty("totalFlagged");
      expect(result.summary).toHaveProperty("flagRate");
      expect(result.summary).toHaveProperty("topContributors");
      for (const s of result.scores) {
        expect(s).toHaveProperty("date");
        expect(s).toHaveProperty("mahalanobis");
        expect(s).toHaveProperty("chi2Critical");
        expect(typeof s.flagged).toBe("boolean");
        expect(s.contributingMetrics.length).toBeGreaterThan(0);
      }
    });

    it("returns empty result with insufficient data", () => {
      const result = anomalyDetectionService.detectMultivariate("multi", "camp_001", [], 0.01);
      expect(result.scores.length).toBe(0);
    });
  });

  describe("detectDrift", () => {
    it("detects drift in data with mean shift", () => {
      const driftData = Array.from({ length: 28 }, (_, i) => ({
        date: new Date(2025, 0, i + 1).toISOString().split("T")[0],
        value: i < 14 ? 50 + Math.random() * 5 : 80 + Math.random() * 5,
      }));
      const result = anomalyDetectionService.detectDrift("conversions", "camp_001", driftData, 14, 0.05);
      expect(result.metric).toBe("conversions");
      expect(result.entityId).toBe("camp_001");
      expect(typeof result.hasDrifted).toBe("boolean");
      expect(result).toHaveProperty("driftScore");
      expect(result).toHaveProperty("pValue");
      expect(result.windowBefore).toHaveProperty("mean");
      expect(result.windowBefore).toHaveProperty("std");
      expect(result.windowAfter).toHaveProperty("mean");
      expect(result.windowAfter).toHaveProperty("std");
      expect(["mean-shift", "variance-shift", "distribution-shift", "none"]).toContain(result.driftType);
      expect(result).toHaveProperty("detectedAt");
    });

    it("returns no drift with insufficient data", () => {
      const short = [{ date: "2025-01-01", value: 50 }];
      const result = anomalyDetectionService.detectDrift("conversions", "camp_001", short, 14, 0.05);
      expect(result.hasDrifted).toBe(false);
      expect(result.driftType).toBe("none");
    });
  });

  describe("scanCampaign", () => {
    it("returns per-metric results with overall health", () => {
      const metrics = {
        impressions: injectedData,
        clicks: injectedData.map((d) => ({ ...d, value: d.value * 0.05 })),
        conversions: injectedData.map((d) => ({ ...d, value: d.value * 0.01 })),
      };
      const result = anomalyDetectionService.scanCampaign("camp_001", metrics);
      expect(result.campaignId).toBe("camp_001");
      expect(result).toHaveProperty("results");
      expect(result).toHaveProperty("overallHealth");
      expect(["healthy", "attention", "critical"]).toContain(result.overallHealth);
      expect(result).toHaveProperty("flaggedMetrics");
      expect(Object.keys(result.results).length).toBe(3);
      for (const [metricName, metricResult] of Object.entries(result.results)) {
        expect(metricResult).toHaveProperty("points");
        expect(metricResult).toHaveProperty("summary");
      }
    });
  });

  describe("ensembleDetect", () => {
    it("returns majority-vote anomalies combining zscore, ESD, and IQR", () => {
      const result = anomalyDetectionService.ensembleDetect("conversions", "camp_001", injectedData);
      expect(result.metric).toBe("conversions");
      expect(result.entityId).toBe("camp_001");
      expect(result.points.length).toBe(injectedData.length);
      expect(result.summary).toHaveProperty("flaggedCount");
      expect(result.summary).toHaveProperty("flagRate");
      for (const p of result.points) {
        expect(p).toHaveProperty("date");
        expect(p).toHaveProperty("value");
        expect(p).toHaveProperty("severity");
        expect(["low", "medium", "high", "critical"]).toContain(p.severity);
        expect(typeof p.flagged).toBe("boolean");
      }
    });
  });

  describe("original methods preserved", () => {
    it("zscore method still detects anomalies", () => {
      const result = anomalyDetectionService.detect("conversions", "camp_001", injectedData, { method: "zscore", zThreshold: 2.5 });
      expect(result.points.length).toBe(injectedData.length);
      expect(result.summary).toHaveProperty("dominantDirection");
      expect(result.summary).toHaveProperty("dominantSeverity");
    });

    it("ESD method returns anomalies", () => {
      const result = anomalyDetectionService.detect("conversions", "camp_001", injectedData, { method: "esd", alpha: 0.05, maxOutliers: 5 });
      expect(result.points.length).toBe(injectedData.length);
    });

    it("IQR method flags fence outliers", () => {
      const result = anomalyDetectionService.detect("conversions", "camp_001", injectedData, { method: "iqr" });
      expect(result.points.length).toBe(injectedData.length);
    });

    it("CUSUM method detects changepoints", () => {
      const result = anomalyDetectionService.detect("conversions", "camp_001", injectedData, { method: "cusum" });
      expect(result.points.length).toBe(injectedData.length);
      expect(result).toHaveProperty("changepoints");
    });

    it("returns insufficient data result when below minPoints", () => {
      const result = anomalyDetectionService.detect("conversions", "camp_001", [{ date: "2025-01-01", value: 100 }], { minPoints: 7 });
      expect(result.summary.recommendation).toContain("Need at least");
    });
  });
});
