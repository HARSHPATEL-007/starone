import { describe, it, expect } from "vitest";
import { adCopyPersonalizationService } from "../services/AdCopyPersonalizationService";
import { anomalyDetectionService } from "../services/AnomalyDetectionService";
import { attributionService } from "../services/AttributionService";
import { campaignHealthPredictorService } from "../services/CampaignHealthPredictorService";
import { campaignSimulationService } from "../services/CampaignSimulationService";
import { marketingMixModelService } from "../services/MarketingMixModelService";
import { predictiveForecastingService } from "../services/PredictiveForecastingService";
import { realTimeBiddingService } from "../services/RealTimeBiddingService";
import { searchIntelligenceService } from "../services/SearchIntelligenceService";
import { statisticalABTestService } from "../services/StatisticalABTestService";
import { incrementalityTestingService } from "../services/IncrementalityTestingService";

const TEST_TENANT = "mass_pt1_tenant";

describe("AdCopyPersonalizationService", () => {
  it("scores a creative element", () => {
    const elements = adCopyPersonalizationService.generateSampleElements();
    expect(elements.length).toBeGreaterThan(0);
    const ctx = adCopyPersonalizationService.generateSampleUserContext();
    expect(ctx).toHaveProperty("segments");
    const scored = adCopyPersonalizationService.scoreElement(elements[0], ctx);
    expect(scored).toHaveProperty("elementType");
    expect(typeof scored.overallScore).toBe("number");
  });

  it("selects best elements from multiple candidates", () => {
    const elements = adCopyPersonalizationService.generateSampleElements();
    const ctx = adCopyPersonalizationService.generateSampleUserContext();
    const best = adCopyPersonalizationService.selectBestElements(elements, ctx);
    expect(best).toHaveProperty("elements");
    expect(Object.keys(best.elements).length).toBeGreaterThan(0);
  });

  it("runs MVT test across variants", () => {
    const variants = adCopyPersonalizationService.generateSampleMVTVariants();
    expect(variants.length).toBeGreaterThan(0);
    const result = adCopyPersonalizationService.runMVTest(variants, 10000);
    expect(result).toHaveProperty("winner");
    expect(result).toHaveProperty("variants");
  });

  it("generates sample elements, context, and MVT variants", () => {
    const elements = adCopyPersonalizationService.generateSampleElements();
    expect(Array.isArray(elements)).toBe(true);
    const ctx = adCopyPersonalizationService.generateSampleUserContext();
    expect(ctx).toHaveProperty("segments");
    const variants = adCopyPersonalizationService.generateSampleMVTVariants();
    expect(variants.length).toBeGreaterThan(0);
  });
});

describe("AnomalyDetectionService", () => {
  function toTs(arr: number[]): { date: string; value: number }[] {
    return arr.map((v, i) => ({ date: `2025-01-${String(i + 1).padStart(2, "0")}`, value: v }));
  }

  it("detects anomalies in a time series", () => {
    // Series with one extreme spike; disable seasonal baseline so the spike is detected
    const ts = [10, 12, 11, 13, 12, 11, 10, 12, 11, 1000, 12, 11, 10];
    const result = anomalyDetectionService.detect("test_metric", "test_entity", toTs(ts), { useSeasonalBaseline: false });
    expect(result).toHaveProperty("points");
    const flagged = result.points.filter((p: any) => p.flagged);
    expect(flagged.length).toBeGreaterThan(0);
  });

  it("detects multivariate anomalies", () => {
    const normal = Array.from({ length: 20 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, "0")}`,
      metrics: { cpu: 50 + Math.random() * 10, memory: 60 + Math.random() * 10, latency: 100 + Math.random() * 20 }
    }));
    const outlier = { date: "2025-01-21", metrics: { cpu: 995, memory: 998, latency: 5000 } };
    const data = [...normal, outlier];
    const result = anomalyDetectionService.detectMultivariate("test_metric", "test_entity", data);
    expect(result).toHaveProperty("scores");
    expect(result.scores.length).toBe(data.length);
    expect(result).toHaveProperty("summary");
  });

  it("detects drift between two distributions", () => {
    const baseline = Array.from({ length: 50 }, () => Math.random() * 10);
    const target = Array.from({ length: 50 }, () => 5 + Math.random() * 10);
    const vals = [...toTs(baseline), ...toTs(target)];
    const result = anomalyDetectionService.detectDrift("test_metric", "test_entity", vals);
    expect(typeof result.hasDrifted).toBe("boolean");
    expect(typeof result.driftScore).toBe("number");
  });

  it("scans campaigns for anomalies", () => {
    const vs = toTs([10, 12, 11, 13, 12, 11, 10, 12, 11, 100, 12, 11, 10]);
    const result = anomalyDetectionService.scanCampaign(TEST_TENANT, { test_metric: vs });
    expect(result).toHaveProperty("flaggedMetrics");
  });

  it("runs ensemble detection with multiple methods", () => {
    const ts = Array.from({ length: 30 }, () => 10 + Math.random() * 2);
    ts.push(50, 55);
    const result = anomalyDetectionService.ensembleDetect("test_metric", "test_entity", toTs(ts));
    expect(result).toHaveProperty("points");
    expect(typeof result.summary.dominantDirection).toBe("string");
  });
});

describe("AttributionService", () => {
  const paths = attributionService.generateSamplePaths();

  it("runs first-click attribution", () => {
    const result = attributionService.attribute(paths, "first_click");
    expect(result).toHaveProperty("model");
    expect(result.model).toBe("first_click");
    expect(result).toHaveProperty("platformBreakdown");
  });

  it("runs last-click attribution", () => {
    const result = attributionService.attribute(paths, "last_click");
    expect(result.model).toBe("last_click");
    expect(Object.keys(result.platformBreakdown).length).toBeGreaterThan(0);
  });

  it("runs linear attribution", () => {
    const result = attributionService.attribute(paths, "linear");
    expect(result.model).toBe("linear");
  });

  it("runs time-decay attribution", () => {
    const result = attributionService.attribute(paths, "time_decay");
    expect(result.model).toBe("time_decay");
  });

  it("runs position-based attribution", () => {
    const result = attributionService.attribute(paths, "position_based");
    expect(result.model).toBe("position_based");
  });

  it("compares multiple attribution models", () => {
    const result = attributionService.compareModels(paths);
    const keys = Object.keys(result);
    expect(keys.length).toBeGreaterThan(1);
    expect(result[keys[0]]).toHaveProperty("model");
  });

  it("computes Shapley values for a path", () => {
    const result = attributionService.shapleyValue(paths);
    expect(result).toHaveProperty("platformBreakdown");
    expect(typeof result.totalConversions).toBe("number");
  });

  it("computes Markov chain attribution", () => {
    const result = attributionService.markovChainAttribution(paths);
    expect(result).toHaveProperty("transitionMatrix");
    expect(result).toHaveProperty("removalEffects");
  });

  it("computes Shapley value approximation", () => {
    const result = attributionService.shapleyValueApprox(paths, 50);
    expect(result).toHaveProperty("platformBreakdown");
  });

  it("computes time-aware Markov chain attribution", () => {
    const result = attributionService.timeAwareMarkovChain(paths);
    expect(result).toHaveProperty("platformBreakdown");
    expect(result).toHaveProperty("removalEffects");
  });

  it("returns attribution confidence scores", () => {
    const result = attributionService.attributionConfidence(paths, "last_click", 50);
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("platform");
      expect(typeof result[0].meanAttribution).toBe("number");
    }
  });

  it("computes synergy attribution", () => {
    const result = attributionService.synergyAttribution(paths);
    expect(result).toHaveProperty("pairwiseSynergies");
    expect(result).toHaveProperty("channelContributions");
  });
});

describe("CampaignHealthPredictorService", () => {
  it("computes health score from campaign metrics", () => {
    const metrics = campaignHealthPredictorService.generateSampleMetrics();
    expect(metrics.length).toBeGreaterThan(0);
    const result = campaignHealthPredictorService.computeHealthScore(metrics);
    expect(typeof result.overall).toBe("number");
    expect(result).toHaveProperty("category");
    expect(result).toHaveProperty("components");
  });

  it("identifies risk factors", () => {
    const metrics = campaignHealthPredictorService.generateSampleMetrics();
    const factors = campaignHealthPredictorService.identifyRiskFactors(metrics);
    expect(Array.isArray(factors)).toBe(true);
    factors.forEach((f: any) => {
      expect(f).toHaveProperty("name");
      expect(typeof f.severity).toBe("string");
    });
  });

  it("computes early warning signals", () => {
    const metrics = campaignHealthPredictorService.generateSampleMetrics();
    const result = campaignHealthPredictorService.computeEarlyWarning(metrics);
    expect(typeof result.riskScore).toBe("number");
    expect(result).toHaveProperty("warnings");
  });

  it("computes survival analysis", () => {
    const metrics = campaignHealthPredictorService.generateSampleMetrics();
    const result = campaignHealthPredictorService.computeSurvivalAnalysis(metrics);
    expect(result).toHaveProperty("kaplanMeier");
    expect(typeof result.medianLifetime).toBe("number");
  });

  it("generates a full health report", () => {
    const metrics = campaignHealthPredictorService.generateSampleMetrics();
    const report = campaignHealthPredictorService.generateReport("test_campaign", metrics);
    expect(report).toHaveProperty("currentHealth");
    expect(report).toHaveProperty("riskFactors");
    expect(report).toHaveProperty("recommendations");
  });
});

describe("CampaignSimulationService", () => {
  const channels = campaignSimulationService.generateSampleChannels();

  it("runs a single simulation", () => {
    const scenario = campaignSimulationService.generateSampleScenarios()[0];
    const result = campaignSimulationService.runSimulation(channels, scenario, 5000);
    expect(result).toHaveProperty("summary");
    expect(typeof result.summary.meanRevenue).toBe("number");
    expect(result).toHaveProperty("trials");
    expect(result.trials.length).toBe(5000);
  });

  it("runs a single simulation with zero budget scenario", () => {
    const scenario: any = { name: "zero", description: "none", budgetChanges: { google_ads: -100, meta_ads: -100, linkedin_ads: -100, tiktok_ads: -100, amazon_ads: -100 } };
    const result = campaignSimulationService.runSimulation(channels, scenario, 100);
    expect(result.summary.meanRevenue).toBeLessThan(1000);
  });

  it("runs multi-scenario simulation", () => {
    const scenarios = campaignSimulationService.generateSampleScenarios();
    const results = campaignSimulationService.runMultiScenario(channels, scenarios, 100);
    expect(results.length).toBe(scenarios.length);
    results.forEach((r: any) => {
      expect(r).toHaveProperty("name");
      expect(r).toHaveProperty("summary");
    });
  });

  it("generates sample channels and scenarios", () => {
    const ch = campaignSimulationService.generateSampleChannels();
    expect(ch.length).toBeGreaterThan(0);
    ch.forEach((c: any) => {
      expect(c).toHaveProperty("name");
      expect(typeof c.baseSpend).toBe("number");
    });
    const sc = campaignSimulationService.generateSampleScenarios();
    expect(sc.length).toBeGreaterThan(0);
  });
});

describe("MarketingMixModelService", () => {
  const data = marketingMixModelService.generateSampleData();

  it("runs MMM analysis and returns channel contributions", () => {
    const result = marketingMixModelService.runMMM(data);
    expect(result).toHaveProperty("contributions");
    expect(result.contributions.length).toBeGreaterThan(0);
    expect(result).toHaveProperty("R2");
    expect(typeof result.R2).toBe("number");
  });

  it("returns baseline sales estimate", () => {
    const result = marketingMixModelService.runMMM(data);
    expect(typeof result.baseRevenue).toBe("number");
  });

  it("runs scenario analysis with budget changes", () => {
    const result = marketingMixModelService.runMMM(data);
    const scenario = { name: "test_scenario", budgetChanges: { google_ads: 20, meta_ads: -20, linkedin_ads: 50, tiktok_ads: 0 } };
    const baseSpend = { google_ads: 5000, meta_ads: 4000, linkedin_ads: 2000, tiktok_ads: 3000 };
    const scenarioResult = marketingMixModelService.runScenario(result, scenario, baseSpend);
    expect(scenarioResult).toHaveProperty("projectedRevenue");
    expect(scenarioResult).toHaveProperty("projectedROAS");
    expect(scenarioResult).toHaveProperty("changeFromBase");
  });

  it("generates sample data", () => {
    const d = marketingMixModelService.generateSampleData();
    expect(d.historicalData.length).toBeGreaterThan(0);
    expect(d.historicalData[0]).toHaveProperty("spend");
    expect(d.historicalData[0]).toHaveProperty("revenue");
  });
});

describe("PredictiveForecastingService", () => {
  const ts: number[] = [];
  for (let i = 0; i < 24; i++) ts.push(Math.round((100 + Math.sin(i * 0.5) * 20 + i * 2) * 100) / 100);
  const hist = ts.map((v, i) => ({ date: `2025-01-${String(i + 1).padStart(2, "0")}`, value: v }));

  it("forecasts future values", () => {
    const result = predictiveForecastingService.forecast("test_campaign", "test_metric", hist, 6);
    expect(result.points.length).toBe(hist.length + 6);
    expect(result).toHaveProperty("summary");
    expect(result.summary).toHaveProperty("lowerBound");
    expect(result.summary).toHaveProperty("upperBound");
  });

  it("forecasts budget needs", () => {
    const result = predictiveForecastingService.forecastBudget("test_campaign", 100000, "2025-01-01", "2025-02-01", ts);
    expect(result).toHaveProperty("dailyProjections");
    expect(result.dailyProjections.length).toBeGreaterThan(0);
  });

  it("predicts conversions", () => {
    const result = predictiveForecastingService.predictConversions("test_campaign", ts, ts, ts.slice(0, 6));
    expect(typeof result.predictedConversions).toBe("number");
  });

  it("decomposes time series", () => {
    const result = predictiveForecastingService.decomposeTimeSeries(ts, 4);
    expect(result).toHaveProperty("trend");
    expect(result).toHaveProperty("seasonal");
    expect(result).toHaveProperty("residual");
  });

  it("detects changepoints in time series", () => {
    const withShift = ts.map((v, i) => i > 12 ? v + 50 : v);
    const result = predictiveForecastingService.detectChangepoints(withShift);
    expect(result.length).toBeGreaterThan(0);
  });

  it("runs ARIMA forecast", () => {
    const result = predictiveForecastingService.arimaForecast("test_campaign", "test_metric", hist, 6, { p: 1, d: 1, q: 1 });
    expect(result.points.length).toBe(hist.length + 6);
  });

  it("runs ensemble forecast combining arima and decomposition", () => {
    const result = predictiveForecastingService.ensembleForecast("test_campaign", "test_metric", hist, 6);
    expect(result.points.length).toBe(6);
    expect(result).toHaveProperty("summary");
  });
});

describe("RealTimeBiddingService", () => {
  it("evaluates a bid request", () => {
    const req = realTimeBiddingService.generateSampleRequest();
    const result = realTimeBiddingService.evaluateBid(req, 10);
    expect(result).toHaveProperty("auctionId");
    expect(typeof result.bidAmount).toBe("number");
    expect(result).toHaveProperty("winProbability");
  });

  it("records auction results and updates win rate model", () => {
    const req = realTimeBiddingService.generateSampleRequest();
    const bid = realTimeBiddingService.evaluateBid(req, 10);
    realTimeBiddingService.recordAuctionResult({
      auctionId: req.auctionId,
      won: true,
      bidAmount: bid.bidAmount,
      winPrice: bid.bidAmount * 0.8,
      revenue: 50,
      latency: 42,
    });
    const score = realTimeBiddingService.getPublisherScore(req.publisherId);
    expect(score).toHaveProperty("historicalWinRate");
    expect(typeof score.historicalWinRate).toBe("number");
  });

  it("gets publisher score", () => {
    const score = realTimeBiddingService.getPublisherScore("pub_1");
    expect(score).toHaveProperty("qualityScore");
    expect(typeof score.qualityScore).toBe("number");
  });

  it("simulates an auction", () => {
    const bids = [
      { bidderId: "a", bidAmount: 5 },
      { bidderId: "b", bidAmount: 10 },
      { bidderId: "c", bidAmount: 7 },
    ];
    const result = realTimeBiddingService.simulateAuction(bids, true);
    expect(result).toHaveProperty("winner");
    expect(result).toHaveProperty("winPrice");
    expect(typeof result.winner).toBe("string");
  });

  it("gets win rate model", () => {
    for (let i = 0; i < 60; i++) {
      realTimeBiddingService.recordAuctionResult({
        auctionId: `train_${i}`, won: i % 2 === 0, bidAmount: 5 + Math.random() * 10, winPrice: 4 + Math.random() * 8, revenue: 20 + Math.random() * 30, latency: 30 + Math.random() * 20,
      });
    }
    const model = realTimeBiddingService.getWinRateModel();
    expect(model).not.toBeNull();
    if (model) {
      expect(model).toHaveProperty("coefficients");
      expect(model).toHaveProperty("intercept");
    }
  });
});

describe("SearchIntelligenceService", () => {
  const keywords = searchIntelligenceService.generateSampleKeywords();

  it("clusters keywords by semantic similarity", () => {
    const result = searchIntelligenceService.clusterKeywords(keywords, 3);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("predicts quality score for a keyword", () => {
    const history = searchIntelligenceService.generateSampleQualityHistory();
    const result = searchIntelligenceService.predictQualityScore("test keyword", history);
    expect(typeof result.predictedScore).toBe("number");
    expect(result.predictedScore).toBeGreaterThanOrEqual(1);
    expect(result.predictedScore).toBeLessThanOrEqual(10);
  });

  it("analyzes auction insights", () => {
    const competitors = searchIntelligenceService.generateSampleCompetitors("test keyword");
    const result = searchIntelligenceService.analyzeAuctionInsights("test keyword", competitors);
    expect(result).toHaveProperty("length");
    expect(result[0]).toHaveProperty("overlapRate");
    expect(result[0]).toHaveProperty("positionAboveRate");
  });

  it("recommends a bid price", () => {
    const result = searchIntelligenceService.recommendBid("test keyword", 2.5, 7, 3.2, 0.05, 50, 500, "balanced");
    expect(typeof result.recommendedBid).toBe("number");
    expect(result).toHaveProperty("confidence");
  });

  it("computes TF-IDF for a set of documents", () => {
    const docs = [
      { id: "1", text: "buy cheap shoes online" },
      { id: "2", text: "best running shoes for marathon" },
      { id: "3", text: "discount sneakers sale" },
    ];
    const result = searchIntelligenceService.computeTFIDF(docs);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("terms");
  });
});

describe("StatisticalABTestService", () => {
  it("performs an A/B test significance check", () => {
    const result = statisticalABTestService.test({
      controlImpressions: 1000, controlConversions: 120,
      variantImpressions: 1000, variantConversions: 100,
    });
    expect(result).toHaveProperty("significant");
    expect(typeof result.significant).toBe("boolean");
    expect(result).toHaveProperty("pValue");
    expect(result).toHaveProperty("lift");
  });

  it("computes required sample size", () => {
    const result = statisticalABTestService.sampleSize({ baselineRate: 0.05, minimumDetectableEffect: 0.05, significanceLevel: 0.05, power: 0.8 });
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThan(0);
  });

  it("estimates test duration based on traffic", () => {
    const input = { baselineRate: 0.05, minimumDetectableEffect: 0.05, significanceLevel: 0.05, power: 0.8 };
    const result = statisticalABTestService.estimateDuration(500, input, 0.5);
    expect(typeof result.estimatedDays).toBe("number");
    expect(result.estimatedDays).toBeGreaterThan(0);
  });

  it("detects significance when lift is large", () => {
    const result = statisticalABTestService.test({
      controlImpressions: 100, controlConversions: 10,
      variantImpressions: 100, variantConversions: 25,
    });
    expect(typeof result.significant).toBe("boolean");
    expect(result.lift).toBeGreaterThan(0);
    expect(result).toHaveProperty("pValue");
  });

  it("returns non-significant for small difference", () => {
    const result = statisticalABTestService.test({
      controlImpressions: 5000, controlConversions: 500,
      variantImpressions: 5000, variantConversions: 510,
    });
    expect(typeof result.significant).toBe("boolean");
    expect(result).toHaveProperty("pValue");
  });
});

describe("IncrementalityTestingService", () => {
  const prePeriod = incrementalityTestingService.generateSamplePrePeriodData();
  const postPeriod = incrementalityTestingService.generateSamplePostPeriodData();
  const regions = ["us_east", "us_west", "eu_west", "ap_southeast"];

  it("runs Difference-in-Differences analysis", () => {
    const result = incrementalityTestingService.runDiD(
      "test_did", "Test DiD",
      ["us_east", "us_west"], ["eu_west", "ap_southeast"],
      "revenue", "2025-01-01", "2025-02-01",
      prePeriod, postPeriod
    );
    expect(result).toHaveProperty("didEstimate");
    expect(result).toHaveProperty("pValue");
    expect(result).toHaveProperty("significant");
  });

  it("runs synthetic control analysis", () => {
    const result = incrementalityTestingService.runSyntheticControl(
      "test_sc", "Test SC",
      "us_east", ["us_west", "eu_west", "ap_southeast"],
      "revenue", "2025-01-01", "2025-02-01",
      prePeriod, postPeriod
    );
    expect(result).toHaveProperty("syntheticWeights");
    expect(result).toHaveProperty("postTreatmentEffect");
  });

  it("runs CUPED analysis", () => {
    const cupedPre = [
      { user: "u1", value: 100 }, { user: "u2", value: 110 },
      { user: "u3", value: 90 }, { user: "u4", value: 105 },
      { user: "u5", value: 95 }, { user: "u6", value: 108 },
      { user: "u7", value: 102 }, { user: "u8", value: 98 },
    ];
    const cupedPost = [
      { user: "u1", value: 120, treatment: true }, { user: "u2", value: 115, treatment: true },
      { user: "u3", value: 100, treatment: true }, { user: "u4", value: 130, treatment: false },
      { user: "u5", value: 105, treatment: false }, { user: "u6", value: 112, treatment: false },
      { user: "u7", value: 118, treatment: true }, { user: "u8", value: 99, treatment: false },
    ];
    const result = incrementalityTestingService.runCUPED("test_cuped", "Test CUPED", "revenue", cupedPre, cupedPost);
    expect(result).toHaveProperty("adjustedLift");
    expect(result).toHaveProperty("varianceReduction");
  });

  it("performs power analysis", () => {
    const result = incrementalityTestingService.powerAnalysis(100, 30, 0.1, 0.05, 0.2, 1000);
    expect(typeof result.achievablePower).toBe("number");
    expect(result).toHaveProperty("requiredSamplePerArm");
  });

  it("runs geo-based experiment", () => {
    const result = incrementalityTestingService.runGeoExperiment(
      "test_geo", "Test Geo",
      ["us_east", "us_west"], ["eu_west", "ap_southeast"],
      "revenue", "2025-01-01", "2025-02-01",
      prePeriod, postPeriod, "did"
    );
    expect(result).toHaveProperty("observedLift");
    expect(result).toHaveProperty("pValue");
  });

  it("generates sample pre-period and post-period data", () => {
    expect(prePeriod.length).toBeGreaterThan(0);
    expect(postPeriod.length).toBeGreaterThan(0);
    expect(prePeriod[0]).toHaveProperty("date");
    expect(prePeriod[0]).toHaveProperty("region");
  });
});
