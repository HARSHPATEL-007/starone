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
