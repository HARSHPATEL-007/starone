import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { ABTestService } from "../services/ABTestService";
import { budgetOptimizer } from "../services/BudgetOptimizer";
import { budgetPacing } from "../services/BudgetPacingService";
import { campaignOptimizerService } from "../services/CampaignOptimizerService";
import { campaignScorecardService } from "../services/CampaignScorecardService";
import { campaignIssueService } from "../services/CampaignIssueService";
import { campaignSnapshotService } from "../services/CampaignSnapshotService";
import { fraudDetectionService } from "../services/FraudDetectionService";
import { roiCalculatorService } from "../services/ROICalculatorService";
import { competitiveBenchmarkingService } from "../services/CompetitiveBenchmarkingService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "deeper_mktg";
const TEST_CAMPAIGN_IDS: string[] = [];

beforeAll(() => {
  const mem = DataStore["mem"]();
  for (let i = 0; i < 5; i++) {
    const id = `dcamp_${i}`;
    TEST_CAMPAIGN_IDS.push(id);
    mem.insert("campaigns", {
      _id: id, name: `Deeper Camp ${i}`, tenantId: TEST_TENANT,
      status: i === 4 ? "paused" : "active",
      type: ["search", "social", "display", "video", "search"][i],
      platforms: i === 0 ? ["meta"] : ["meta", "google", "linkedin"],
      goal: i % 2 === 0 ? "conversions" : "brand",
      startDate: new Date(Date.now() - 45 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 75 * 86400000).toISOString(),
      budget: { daily: 100 + i * 50, lifetime: 3000 + i * 1000, spent: 500 + i * 300, remaining: 2500 + i * 700, currency: "USD" },
      metrics: { impressions: 10000 + i * 3000, clicks: 200 + i * 60, conversions: 10 + i * 5, spend: 500 + i * 200, revenue: 800 + i * 400, ctr: 2.0 + i * 0.2, cpc: 2.5 - i * 0.3, roas: 1.8 + i * 0.3, cvr: 5.0 + i * 1.0 },
    });
  }
  for (let i = 0; i < 15; i++) {
    mem.insert("metrics", {
      campaignId: TEST_CAMPAIGN_IDS[i % 4],
      tenantId: TEST_TENANT,
      date: new Date(Date.now() - i * 86400000).toISOString(),
      impressions: 800 + Math.floor(Math.random() * 400),
      clicks: 20 + Math.floor(Math.random() * 30),
      conversions: 1 + Math.floor(Math.random() * 5),
      spend: 40 + Math.floor(Math.random() * 30),
      revenue: 80 + Math.floor(Math.random() * 120),
    });
  }
});

beforeEach(() => {
  fraudDetectionService["flags"].clear();
  fraudDetectionService["placements"].clear();
  fraudDetectionService["clickHistory"].clear();
  fraudDetectionService["spendHistory"].clear();
  fraudDetectionService["adaptiveThresholdHistory"].clear();
  fraudDetectionService["forestTrees"] = [];
  (fraudDetectionService as any).isForestTrained = false;
  budgetPacing["pidStates"].clear();
  budgetPacing["kalmanStates"].clear();
  budgetPacing["smoothStates"].clear();
  budgetPacing["spendHistory"].clear();
});

// ─── ABTestService ──────────────────────────────────────────────────────

describe("ABTestService", () => {
  describe("chiSquaredPValue", () => {
    it("returns 1 when conversions equal", () => {
      const p = ABTestService.chiSquaredPValue({ impressions: 1000, conversions: 50 }, { impressions: 1000, conversions: 50 });
      expect(p).toBeGreaterThan(0.9);
    });

    it("returns small p for large difference", () => {
      const p = ABTestService.chiSquaredPValue({ impressions: 1000, conversions: 10 }, { impressions: 1000, conversions: 200 });
      expect(p).toBeLessThan(0.01);
    });

    it("returns 1 for zero impressions", () => {
      expect(ABTestService.chiSquaredPValue({ impressions: 0, conversions: 0 }, { impressions: 1000, conversions: 50 })).toBe(1);
    });
  });

  describe("computeSignificance", () => {
    it("returns null winner for few variants", () => {
      const r = ABTestService.computeSignificance([{ impressions: 1000, conversions: 50 }]);
      expect(r.winner).toBeNull();
      expect(r.confidence).toBe(0);
    });

    it("detects winner with strong signal", () => {
      const r = ABTestService.computeSignificance([
        { impressions: 1000, conversions: 30, name: "Control" },
        { impressions: 1000, conversions: 180, name: "Variant" },
      ]);
      expect(r.confidence).toBeGreaterThan(90);
    });
  });

  describe("computeBayesianProbability", () => {
    it("returns ~0.5 for identical variants", () => {
      const p = ABTestService.computeBayesianProbability({ impressions: 500, conversions: 25 }, { impressions: 500, conversions: 25 });
      expect(p).toBeGreaterThan(0.3);
      expect(p).toBeLessThan(0.7);
    });

    it("returns high prob for superior variant", () => {
      const p = ABTestService.computeBayesianProbability({ impressions: 500, conversions: 10 }, { impressions: 500, conversions: 100 });
      expect(p).toBeGreaterThan(0.9);
    });
  });

  describe("generateMockVariant", () => {
    it("produces valid variant data", () => {
      const v = ABTestService.generateMockVariant("Test", 10000, 1.0);
      expect(v.name).toBe("Test");
      expect(v.impressions).toBeGreaterThan(0);
      expect(v.clicks).toBeGreaterThan(0);
      expect(v.conversions).toBeGreaterThan(0);
    });
  });

  describe("generateRecommendation", () => {
    it("suggests continuing test when no winner", () => {
      const r = ABTestService.generateRecommendation([{ name: "Control", cvr: 0.05 }], null, 80);
      expect(r).toContain("No significant winner");
    });

    it("recommends winner when confidence high", () => {
      const variants = [{ name: "Control", impressions: 1000, conversions: 30, cvr: 0.03 }, { name: "B", impressions: 1000, conversions: 180, cvr: 0.18 }];
      const r = ABTestService.generateRecommendation(variants, "B", 95);
      expect(r).toContain("B");
    });
  });
});

// ─── BudgetOptimizer (Legacy) ──────────────────────────────────────────

describe("BudgetOptimizer", () => {
  const sampleCampaigns = [
    { id: "b1", name: "Search", platform: "google", dailyBudget: 5000, lifetimeBudget: 150000, spent: 45200, impressions: 245000, clicks: 4200, conversions: 89, revenue: 125000, roas: 2.76, cpc: 2.38, ctr: 1.71, status: "active" },
    { id: "b2", name: "Social", platform: "meta", dailyBudget: 3000, lifetimeBudget: 90000, spent: 28100, impressions: 189000, clicks: 3100, conversions: 45, revenue: 68000, roas: 2.42, cpc: 3.10, ctr: 1.64, status: "active" },
    { id: "b3", name: "Retarget", platform: "meta", dailyBudget: 1500, lifetimeBudget: 45000, spent: 12300, impressions: 89000, clicks: 1900, conversions: 67, revenue: 42000, roas: 3.41, cpc: 1.83, ctr: 2.13, status: "active" },
    { id: "b4", name: "Poor Perform", platform: "tiktok", dailyBudget: 8000, lifetimeBudget: 80000, spent: 64000, impressions: 156000, clicks: 2800, conversions: 34, revenue: 24000, roas: 0.75, cpc: 4.57, ctr: 1.79, status: "active" },
  ];

  describe("optimize", () => {
    it("returns recommendations with balanced strategy", () => {
      const r = budgetOptimizer.optimize(sampleCampaigns, "balanced");
      expect(r.recommendations.length).toBeGreaterThan(0);
      expect(r.totalCurrentBudget).toBeGreaterThan(0);
      expect(r.strategy).toBe("balanced");
      expect(expectedPortfolioRoas(r)).toBeGreaterThan(0);
    });

    it("filters out paused campaigns", () => {
      const withPaused = [...sampleCampaigns, { ...sampleCampaigns[0], id: "p1", status: "paused" }];
      const r = budgetOptimizer.optimize(withPaused, "conservative");
      const allIds = r.recommendations.map((rec) => rec.campaignId);
      expect(allIds).not.toContain("p1");
    });

    it("recommends increase for strong performers", () => {
      const r = budgetOptimizer.optimize(sampleCampaigns, "aggressive");
      const retarget = r.recommendations.find((rec) => rec.campaignId === "b3");
      expect(retarget).toBeDefined();
      expect(retarget!.expectedImpact.confidence).toBe("high");
    });

    it("recommends high urgency for poor ROAS", () => {
      const r = budgetOptimizer.optimize(sampleCampaigns, "aggressive");
      const poor = r.recommendations.find((rec) => rec.campaignId === "b4");
      expect(poor).toBeDefined();
      expect(["high", "critical"]).toContain(poor!.urgency);
    });
  });

  describe("marginalEfficiencyFrontier", () => {
    it("returns frontier points for active campaigns", () => {
      const r = budgetOptimizer.marginalEfficiencyFrontier(sampleCampaigns, 0.3);
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].efficiencyRank).toBeGreaterThan(0);
      expect(r[0].points.length).toBe(20);
    });
  });

  describe("budgetElasticity", () => {
    it("estimates elasticity per campaign", () => {
      const r = budgetOptimizer.budgetElasticity(sampleCampaigns);
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].elasticity).toBeGreaterThan(0);
      expect(["increasing", "constant", "diminishing"]).toContain(r[0].returnsToScale);
    });
  });

  describe("maturityAdjustedThresholds", () => {
    it("returns maturity phase for each campaign", () => {
      const r = budgetOptimizer.maturityAdjustedThresholds(sampleCampaigns);
      expect(r.length).toBe(sampleCampaigns.length);
      expect(r[0].maturityPhase).toBeTruthy();
      expect(r[0].adjustedRoasTarget).toBeGreaterThan(0);
    });
  });

  describe("multiPeriodAllocation", () => {
    it("distributes budget across periods with even strategy", () => {
      const r = budgetOptimizer.multiPeriodAllocation(sampleCampaigns[0], 90, 4, "even");
      expect(r.length).toBe(4);
      expect(r[0].allocation).toBeGreaterThan(0);
    });

    it("front-loads with front_load strategy", () => {
      const r = budgetOptimizer.multiPeriodAllocation(sampleCampaigns[0], 90, 4, "front_load");
      expect(r[0].allocation).toBeGreaterThan(r[3].allocation);
    });
  });

  describe("generateMockCampaigns", () => {
    it("returns 7 mock campaigns", () => {
      const r = budgetOptimizer.generateMockCampaigns();
      expect(r.length).toBe(7);
      expect(r[0].name).toBeTruthy();
    });
  });
});

// ─── BudgetPacingService ───────────────────────────────────────────────

describe("BudgetPacingService", () => {
  const sampleCampaign = {
    id: "pace_1", name: "Paced Campaign", status: "active",
    startDate: new Date(Date.now() - 20 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 40 * 86400000).toISOString(),
    budget: { daily: 200, lifetime: 12000, spent: 3500, remaining: 8500, currency: "USD" },
    metrics: { spend: 3500, impressions: 70000, clicks: 1400, conversions: 70, revenue: 8400, roas: 2.4 },
  };

  describe("calculatePacing", () => {
    it("returns pacing result for active campaign", () => {
      const r = budgetPacing.calculatePacing(sampleCampaign);
      expect(r).not.toBeNull();
      expect(r!.campaignId).toBe("pace_1");
      expect(r!.pacing.timeElapsedPercent).toBeGreaterThan(0);
      expect(r!.pacing.budgetUsedPercent).toBeGreaterThan(0);
      expect(r!.pacing.daysElapsed).toBeGreaterThan(0);
    });

    it("returns null for future campaign", () => {
      const future = { ...sampleCampaign, startDate: new Date(Date.now() + 30 * 86400000).toISOString() };
      expect(budgetPacing.calculatePacing(future)).toBeNull();
    });
  });

  describe("calculateAll", () => {
    it("returns results for all campaigns", () => {
      const r = budgetPacing.calculateAll([sampleCampaign, { ...sampleCampaign, id: "pace_2", name: "Camp 2" }]);
      expect(r.length).toBe(2);
    });
  });

  describe("getSummary", () => {
    it("aggregates pacing results", () => {
      const results = budgetPacing.calculateAll([sampleCampaign, { ...sampleCampaign, id: "pace_2" }]);
      const s = budgetPacing.getSummary(results);
      expect(s.total).toBe(2);
      expect(s.totalBudget).toBeGreaterThan(0);
    });
  });

  describe("pidAdjust", () => {
    it("returns PID adjustment", () => {
      const r = budgetPacing.pidAdjust("pid_test", 0.2, 1);
      expect(r.adjustment).not.toBe(0);
      expect(typeof r.newTargetRate).toBe("number");
    });

    it("tracks state across calls", () => {
      budgetPacing.pidAdjust("pid_test", 0.2, 1);
      const r2 = budgetPacing.pidAdjust("pid_test", -0.1, 1);
      expect(r2.p).not.toBe(0);
      expect(budgetPacing.getPidState("pid_test")).not.toBeNull();
    });

    it("resets PID state", () => {
      budgetPacing.pidAdjust("pid_reset", 0.5, 1);
      budgetPacing.resetPid("pid_reset");
      expect(budgetPacing.getPidState("pid_reset")).toBeNull();
    });
  });

  describe("kalmanFilterSpend", () => {
    it("returns filtered estimate", () => {
      const r = budgetPacing.kalmanFilterSpend("kalm_test", 150);
      expect(r.filtered).toBeGreaterThan(0);
      expect(r.gain).toBeGreaterThan(0);
    });

    it("converges with more measurements", () => {
      budgetPacing.kalmanFilterSpend("kalm_conv", 100);
      const r2 = budgetPacing.kalmanFilterSpend("kalm_conv", 105);
      expect(r2.uncertainty).toBeLessThan(1);
    });

    it("resets Kalman state", () => {
      budgetPacing.kalmanFilterSpend("kalm_reset", 100);
      budgetPacing.resetKalman("kalm_reset");
      const r = budgetPacing.kalmanFilterSpend("kalm_reset", 150);
      expect(r.gain).toBeGreaterThan(0.5);
    });
  });

  describe("holtSmooth", () => {
    it("initializes on first call", () => {
      const r = budgetPacing.holtSmooth("holt_test", 100);
      expect(r.level).toBe(100);
      expect(r.trend).toBe(0);
    });

    it("produces forecast on second call", () => {
      budgetPacing.holtSmooth("holt_test", 100);
      const r = budgetPacing.holtSmooth("holt_test", 110);
      expect(r.forecast.length).toBe(7);
    });
  });

  describe("optimizePortfolio", () => {
    it("returns allocations for active campaigns", () => {
      const r = budgetPacing.optimizePortfolio([sampleCampaign, { ...sampleCampaign, id: "pace_3", metrics: { roas: 3.0, spend: 2000 } as any }]);
      expect(r.allocations.length).toBeGreaterThan(0);
      expect(r.projectedTotalROAS).toBeGreaterThan(0);
    });

    it("returns empty for no active campaigns", () => {
      const r = budgetPacing.optimizePortfolio([{ ...sampleCampaign, status: "paused" }]);
      expect(r.allocations.length).toBe(0);
    });
  });

  describe("detectSpendAnomalies", () => {
    it("returns null with insufficient history", () => {
      expect(budgetPacing.detectSpendAnomalies(sampleCampaign, 200)).toBeNull();
    });

    it("detects spike with sufficient history", () => {
      for (let i = 0; i < 10; i++) budgetPacing.detectSpendAnomalies(sampleCampaign, 100);
      const r = budgetPacing.detectSpendAnomalies(sampleCampaign, 500);
      expect(r).not.toBeNull();
      if (r) {
        expect(r.direction).toBe("spike");
        expect(r.campaignId).toBe("pace_1");
      }
    });
  });
});

// ─── CampaignOptimizerService ──────────────────────────────────────────

describe("CampaignOptimizerService", () => {
  describe("generateOptimizations", () => {
    it("returns optimization suggestions for tenant", () => {
      const suggestions = campaignOptimizerService.generateOptimizations(TEST_TENANT);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBeTruthy();
      expect(suggestions[0].impact).toBeTruthy();
    });

    it("suggestions have required fields", () => {
      const suggestions = campaignOptimizerService.generateOptimizations(TEST_TENANT);
      for (const s of suggestions) {
        expect(s.id).toBeTruthy();
        expect(s.title).toBeTruthy();
        expect(s.potentialValue).toBeGreaterThanOrEqual(0);
        expect(s.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe("getPlatformConfigs", () => {
    it("returns platform configurations", () => {
      const configs = campaignOptimizerService.getPlatformConfigs();
      expect(configs.length).toBeGreaterThan(0);
      expect(configs[0].platform).toBeTruthy();
      expect(configs[0].capabilities.length).toBeGreaterThan(0);
    });
  });

  describe("platformOptimizationScore", () => {
    it("scores meta for conversions", () => {
      const r = campaignOptimizerService.platformOptimizationScore("meta", "conversions", 2.5, 100000, "high");
      expect(r.score).toBeGreaterThan(0);
      expect(r.recommendation).toBeTruthy();
      expect(r.strengths.length).toBeGreaterThan(0);
    });

    it("returns default for unknown platform", () => {
      const r = campaignOptimizerService.platformOptimizationScore("unknown", "conversions", 1, 1000, "low");
      expect(r.score).toBe(0.5);
    });
  });

  describe("estimateDiminishingReturns", () => {
    it("returns power-law params with sufficient data", () => {
      const data = [{ spend: 100, conversions: 10 }, { spend: 200, conversions: 18 }, { spend: 400, conversions: 30 }, { spend: 800, conversions: 45 }];
      const r = campaignOptimizerService.estimateDiminishingReturns(data);
      expect(r.a).toBeGreaterThan(0);
      expect(r.b).toBeGreaterThan(0);
      expect(r.interpretation).toBeTruthy();
    });

    it("returns defaults with insufficient data", () => {
      const r = campaignOptimizerService.estimateDiminishingReturns([{ spend: 100, conversions: 10 }]);
      expect(r.b).toBe(0.7);
    });
  });

  describe("optimalTiming", () => {
    it("returns day and hour recommendations", () => {
      const r = campaignOptimizerService.optimalTiming([]);
      expect(r.bestDayOfWeek).toBeTruthy();
      expect(typeof r.bestHourOfDay).toBe("number");
      expect(r.dayScores.length).toBe(7);
      expect(r.hourScores.length).toBe(24);
    });
  });

  describe("conversionProbability", () => {
    it("returns probability with factors", () => {
      const campaign = {
        metrics: { ctr: 2.5, roas: 2.0 },
        budget: { spent: 500, lifetime: 3000 },
        platforms: ["google", "meta"],
        startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
      };
      const r = campaignOptimizerService.conversionProbability(campaign);
      expect(r.probability).toBeGreaterThan(0);
      expect(r.factors.length).toBe(5);
      expect(r.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getDashboard", () => {
    it("returns dashboard summary", () => {
      const d = campaignOptimizerService.getDashboard(TEST_TENANT);
      expect(d.counts).toBeDefined();
      expect(d.totalPotentialValue).toBeGreaterThanOrEqual(0);
      expect(d.totalOpen).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── CampaignScorecardService ──────────────────────────────────────────

describe("CampaignScorecardService", () => {
  beforeAll(() => {
    campaignScorecardService.setWeights({ health: 1, roi: 1, engagement: 1, conversion: 1, efficiency: 1 });
  });

  describe("getScorecard", () => {
    it("returns full scorecard for tenant", () => {
      const sc = campaignScorecardService.getScorecard(TEST_TENANT);
      expect(sc.campaigns.length).toBeGreaterThan(0);
      expect(sc.summary.totalCampaigns).toBeGreaterThan(0);
      expect(sc.summary.avgScore).toBeGreaterThan(0);
      expect(sc.weights).toBeDefined();
    });

    it("returns single campaign when campaignId provided", () => {
      const sc = campaignScorecardService.getScorecard(TEST_TENANT, TEST_CAMPAIGN_IDS[0]);
      expect(sc.campaigns.length).toBe(1);
      expect(sc.campaigns[0].campaignId).toBe(TEST_CAMPAIGN_IDS[0]);
    });

    it("returns distribution tiers", () => {
      const sc = campaignScorecardService.getScorecard(TEST_TENANT);
      expect(sc.distribution.length).toBe(4);
      const totalFromTiers = sc.distribution.reduce((s, t) => s + t.count, 0);
      expect(totalFromTiers).toBe(sc.campaigns.length);
    });

    it("returns trend summary and percentiles", () => {
      const sc = campaignScorecardService.getScorecard(TEST_TENANT);
      expect(sc.trendSummary).toBeDefined();
      expect(sc.percentiles.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("setWeights", () => {
    it("updates config weights", () => {
      campaignScorecardService.setWeights({ roi: 2 });
      const sc = campaignScorecardService.getScorecard(TEST_TENANT);
      expect(sc.weights.roi).toBe(2);
      campaignScorecardService.setWeights({ roi: 1 });
    });
  });
});

// ─── CampaignIssueService ──────────────────────────────────────────────

describe("CampaignIssueService", () => {
  describe("getIssues", () => {
    it("returns seed issues for tenant", () => {
      const issues = campaignIssueService.getIssues(TEST_TENANT);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].title).toBeTruthy();
      expect(issues[0].tenantId).toBe(TEST_TENANT);
    });

    it("filters by campaignId", () => {
      const all = campaignIssueService.getIssues(TEST_TENANT);
      if (all.length > 0) {
        const filtered = campaignIssueService.getIssues(TEST_TENANT, all[0].campaignId);
        expect(filtered.every((i) => i.campaignId === all[0].campaignId)).toBe(true);
      }
    });
  });

  describe("createIssue", () => {
    it("creates and returns a new issue", () => {
      const issue = campaignIssueService.createIssue(TEST_TENANT, {
        campaignId: TEST_CAMPAIGN_IDS[0], campaignName: "Test", title: "New Issue", severity: "high", category: "budget",
      });
      expect(issue.id).toBeTruthy();
      expect(issue.title).toBe("New Issue");
      expect(issue.status).toBe("open");
    });
  });

  describe("updateIssue", () => {
    it("updates an existing issue", () => {
      const issue = campaignIssueService.createIssue(TEST_TENANT, {
        campaignId: TEST_CAMPAIGN_IDS[0], campaignName: "Test", title: "Update Me",
      });
      const storedId = DataStore["mem"]().findOne("campaign_issues", (i: any) => i.title === "Update Me")?._id;
      const updated = campaignIssueService.updateIssue(TEST_TENANT, storedId, { status: "resolved" });
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe("resolved");
      expect(updated!.resolvedAt).toBeTruthy();
    });

    it("returns null for non-existent issue", () => {
      const r = campaignIssueService.updateIssue(TEST_TENANT, "nonexistent", { status: "resolved" });
      expect(r).toBeNull();
    });
  });

  describe("deleteIssue", () => {
    it("deletes an existing issue", () => {
      const issue = campaignIssueService.createIssue(TEST_TENANT, {
        campaignId: TEST_CAMPAIGN_IDS[0], campaignName: "Test", title: "Delete Me",
      });
      const storedId = DataStore["mem"]().findOne("campaign_issues", (i: any) => i.title === "Delete Me")?._id;
      expect(campaignIssueService.deleteIssue(TEST_TENANT, storedId)).toBe(true);
    });

    it("returns false for non-existent issue", () => {
      expect(campaignIssueService.deleteIssue(TEST_TENANT, "nonexistent")).toBe(false);
    });
  });

  describe("getStats", () => {
    it("returns aggregated stats with predictions", () => {
      const stats = campaignIssueService.getStats(TEST_TENANT);
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byStatus).toBeDefined();
      expect(stats.bySeverity).toBeDefined();
      expect(stats._resolutionPrediction).toBeDefined();
      expect(stats._rootCauses).toBeDefined();
      expect(stats._slaRisk).toBeDefined();
    });
  });

  describe("detectIssues", () => {
    it("auto-detects issues from campaign metrics", () => {
      DataStore["mem"]().insert("campaigns", {
        _id: "bad_roas_camp", name: "Poor ROAS", tenantId: TEST_TENANT, status: "active",
        startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        budget: { daily: 500, lifetime: 15000, spent: 12000, remaining: 3000 },
        metrics: { roas: 0.8, ctr: 0.5, cpc: 4.5, impressions: 6000, clicks: 30, conversions: 2, spend: 12000, revenue: 9600 },
      });
      const detected = campaignIssueService.detectIssues(TEST_TENANT);
      expect(detected.issues.length).toBeGreaterThan(0);
      expect(detected._detectionScores.length).toBeGreaterThan(0);
    });
  });

  describe("predictResolutionTime", () => {
    it("predicts resolution time for open issues", () => {
      const issues = campaignIssueService.getIssues(TEST_TENANT);
      const r = campaignIssueService.predictResolutionTime(issues);
      expect(r.openIssues.length).toBeGreaterThanOrEqual(0);
      expect(r.avgPredictedHours).toBeGreaterThan(0);
    });
  });

  describe("rootCauseAnalysis", () => {
    it("identifies systemic patterns", () => {
      const issues = campaignIssueService.getIssues(TEST_TENANT);
      const r = campaignIssueService.rootCauseAnalysis(issues);
      expect(r.patterns.length).toBeGreaterThan(0);
      expect(r.mostFrequentCategory).toBeTruthy();
    });
  });

  describe("slaBreachProbability", () => {
    it("identifies at-risk issues", () => {
      const issues = campaignIssueService.getIssues(TEST_TENANT);
      const r = campaignIssueService.slaBreachProbability(issues);
      expect(r.totalAtRisk).toBeGreaterThanOrEqual(0);
      expect(r.avgProbability).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── CampaignSnapshotService ───────────────────────────────────────────

describe("CampaignSnapshotService", () => {
  describe("captureSnapshot", () => {
    it("captures a snapshot of campaign metrics", async () => {
      const snap = await campaignSnapshotService.captureSnapshot(TEST_TENANT, TEST_CAMPAIGN_IDS[0], "Week 1 Review", "Initial state");
      expect(snap).not.toBeNull();
      expect(snap.name).toBe("Week 1 Review");
      expect(snap.metrics.totalImpressions).toBeGreaterThan(0);
      expect(snap.campaignId).toBe(TEST_CAMPAIGN_IDS[0]);
    });

    it("throws for non-existent campaign", async () => {
      await expect(campaignSnapshotService.captureSnapshot(TEST_TENANT, "nonexistent", "Test", "desc")).rejects.toThrow("Campaign not found");
    });
  });

  describe("compareSnapshots", () => {
    it("compares two snapshots", async () => {
      const s1 = await campaignSnapshotService.captureSnapshot(TEST_TENANT, TEST_CAMPAIGN_IDS[0], "Before", "first");
      const s2 = await campaignSnapshotService.captureSnapshot(TEST_TENANT, TEST_CAMPAIGN_IDS[0], "After", "second");
      const cmp = await campaignSnapshotService.compareSnapshots(s1._id, s2._id, TEST_TENANT);
      expect(cmp.diff).toBeDefined();
      expect(cmp.summary.overall).toBeTruthy();
      expect(cmp.diff.totalImpressions).toBeDefined();
    });
  });

  describe("getSnapshotTimeline", () => {
    it("returns snapshot timeline sorted by date", async () => {
      await campaignSnapshotService.captureSnapshot(TEST_TENANT, TEST_CAMPAIGN_IDS[1], "Timeline Test", "");
      const snaps = await campaignSnapshotService.getSnapshotTimeline(TEST_TENANT, TEST_CAMPAIGN_IDS[1]);
      expect(snaps.length).toBeGreaterThan(0);
    });
  });
});

// ─── FraudDetectionService ─────────────────────────────────────────────

describe("FraudDetectionService", () => {
  describe("evaluatePlacement", () => {
    it("evaluates a clean placement", () => {
      const r = fraudDetectionService.evaluatePlacement("pl_clean", "google", {
        ivtPercent: 2, viewabilityPercent: 95, brandSafetyScore: 92, botProbability: 0.05, clickVelocity: 5,
      }, "cmp_001");
      expect(r.flags.length).toBe(0);
      expect(r.overallRisk).toBeLessThan(50);
    });

    it("flags high-risk placement", () => {
      const r = fraudDetectionService.evaluatePlacement("pl_bad", "meta", {
        ivtPercent: 85, viewabilityPercent: 20, brandSafetyScore: 30, botProbability: 0.9, clickVelocity: 60,
      }, "cmp_002");
      expect(r.flags.length).toBeGreaterThan(2);
      expect(r.overallRisk).toBeGreaterThan(50);
    });
  });

  describe("cusumChangepoint", () => {
    it("detects no shift in stable data", () => {
      const data = Array.from({ length: 20 }, () => 100);
      const r = fraudDetectionService.cusumChangepoint(data);
      expect(r.detected).toBe(false);
    });

    it("detects shift in data with step change", () => {
      const data = [...Array.from({ length: 10 }, () => 50), ...Array.from({ length: 10 }, () => 150)];
      const r = fraudDetectionService.cusumChangepoint(data);
      expect(r.detected).toBe(true);
      expect(r.changepoint).toBeGreaterThanOrEqual(8);
      expect(r.changepoint).toBeLessThanOrEqual(12);
    });
  });

  describe("benfordTest", () => {
    it("passes Benford-conforming data", () => {
      const amounts = Array.from({ length: 50 }, (_, i) => {
        const d = Math.random();
        if (d < 0.301) return Math.floor(Math.random() * 100 + 1);
        if (d < 0.477) return Math.floor(Math.random() * 100 + 100);
        if (d < 0.602) return Math.floor(Math.random() * 100 + 200);
        if (d < 0.699) return Math.floor(Math.random() * 100 + 300);
        return Math.floor(Math.random() * 100 + 400);
      });
      const r = fraudDetectionService.benfordTest(amounts);
      expect(typeof r.anomalous).toBe("boolean");
      expect(r.mad).toBeGreaterThanOrEqual(0);
      expect(r.observedDistribution.length).toBe(9);
    });

    it("flags non-Benford data", () => {
      const amounts = Array.from({ length: 25 }, () => Math.floor(Math.random() * 50 + 1));
      const r = fraudDetectionService.benfordTest(amounts);
      expect(r.mad).toBeDefined();
    });

    it("returns non-anomalous for too few samples", () => {
      const r = fraudDetectionService.benfordTest([1, 2, 3]);
      expect(r.anomalous).toBe(false);
    });
  });

  describe("poissonAnomaly", () => {
    it("detects anomalous click arrival rate", () => {
      const timestamps = [1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009];
      const r = fraudDetectionService.poissonAnomaly(timestamps, "cmp_poisson");
      expect(r.anomalous).toBe(false);
    });
  });

  describe("entropyAnomaly", () => {
    it("detects too-concentrated geo distribution", () => {
      const geo = Array.from({ length: 20 }, () => "US");
      const r = fraudDetectionService.entropyAnomaly(geo);
      expect(r.anomalous).toBe(true);
    });

    it("passes diverse geo distribution", () => {
      const geo = ["US", "UK", "DE", "FR", "JP", "AU", "CA", "BR", "IN", "MX", "US", "UK", "DE", "FR", "JP", "AU", "CA", "BR", "IN", "MX"];
      const r = fraudDetectionService.entropyAnomaly(geo);
      expect(r.entropy).toBeGreaterThan(2);
    });

    it("returns non-anomalous for too few samples", () => {
      const r = fraudDetectionService.entropyAnomaly(["US"]);
      expect(r.anomalous).toBe(false);
    });
  });

  describe("Random Forest", () => {
    it("trains and predicts", () => {
      const data = fraudDetectionService.generateTrainingData(50);
      const r = fraudDetectionService.trainRandomForest(data);
      expect(r.treeCount).toBe(20);
      expect(r.accuracy).toBeGreaterThanOrEqual(0);

      const pred = fraudDetectionService.forestPredict(data[0].features);
      expect([0, 1]).toContain(pred);

      const prob = fraudDetectionService.forestPredictProbability(data[0].features);
      expect(prob.probability).toBeGreaterThanOrEqual(0);
      expect(["fraud", "legitimate"]).toContain(prob.classification);
    });
  });

  describe("adaptive thresholds", () => {
    it("adapts threshold based on feedback", () => {
      const r1 = fraudDetectionService.adaptThreshold("thr_test", 0.5, true);
      expect(r1.direction).toBe("unchanged");

      for (let i = 0; i < 8; i++) fraudDetectionService.adaptThreshold("thr_test", 0.5, false);
      const r2 = fraudDetectionService.adaptThreshold("thr_test", 0.5, false);
      expect(["unchanged", "loosened"]).toContain(r2.direction);

      const state = fraudDetectionService.getAdaptiveThresholdState("thr_test");
      expect(state).not.toBeNull();
      if (state) expect(state.accuracy).toBeLessThan(80);
    });
  });

  describe("computeRealTimeThreatScore", () => {
    it("computes threat score from signals", () => {
      const now = Date.now();
      const signals = [
        { name: "IVT", score: 85, weight: 0.3, timestamp: now - 60000 },
        { name: "Click Velocity", score: 70, weight: 0.2, timestamp: now - 120000 },
      ];
      const r = fraudDetectionService.computeRealTimeThreatScore(signals);
      expect(r.overallScore).toBeGreaterThan(0);
      expect(r.dominantSignal).toBeTruthy();
      expect(r.severity).toBeTruthy();
    });
  });

  describe("resolveFlag and helpers", () => {
    it("generates sample alert", () => {
      const flag = fraudDetectionService.generateSampleAlert("cmp_flags");
      expect(flag.id).toBeTruthy();
      expect(flag.campaignId).toBe("cmp_flags");
    });

    it("retrieves campaign flags", () => {
      fraudDetectionService.generateSampleAlert("cmp_get");
      const flags = fraudDetectionService.getCampaignFlags("cmp_get");
      expect(flags.length).toBeGreaterThan(0);
    });

    it("resolves a flag", () => {
      const flag = fraudDetectionService.generateSampleAlert("cmp_resolve");
      const resolved = fraudDetectionService.resolveFlag(flag.id);
      expect(resolved).toBe(true);
    });

    it("returns health summary", () => {
      fraudDetectionService.evaluatePlacement("pl_h1", "google", { ivtPercent: 90, viewabilityPercent: 10 }, "cmp_h");
      const health = fraudDetectionService.getHealthSummary();
      expect(health.totalFlags).toBeGreaterThan(0);
      expect(health.activeFlags).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getPlacementRisk", () => {
    it("returns stored placement risk", () => {
      const risk = fraudDetectionService.getPlacementRisk("nonexistent");
      expect(risk).toBeUndefined();
    });
  });
});

// ─── ROICalculatorService ──────────────────────────────────────────────

describe("ROICalculatorService", () => {
  const sampleInput = {
    campaignName: "Test Campaign",
    totalSpend: 50000,
    totalRevenue: 150000,
    leadsGenerated: 1200,
    conversionRate: 5,
    averageDealSize: 2500,
    platformFees: 5000,
    creativeCosts: 10000,
    laborCosts: 15000,
    timeframeDays: 90,
  };

  describe("calculate", () => {
    it("returns comprehensive ROI result", () => {
      const r = roiCalculatorService.calculate(sampleInput);
      expect(r.roas).toBe(3);
      expect(r.roi).toBeGreaterThan(0);
      expect(r.isProfitable).toBe(true);
      expect(r.customersAcquired).toBe(60);
      expect(r.cpa).toBeGreaterThan(0);
      expect(r.cpl).toBeGreaterThan(0);
      expect(r.paybackDays).toBeGreaterThan(0);
      expect(r.breakdown.totalCosts).toBeGreaterThan(0);
    });

    it("returns unprofitable for negative margin", () => {
      const r = roiCalculatorService.calculate({ ...sampleInput, totalRevenue: 10000 });
      expect(r.isProfitable).toBe(false);
      expect(r.profitMargin).toBeLessThan(0);
    });
  });

  describe("compare", () => {
    it("compares multiple scenarios", () => {
      const r = roiCalculatorService.compare([sampleInput, { ...sampleInput, campaignName: "B", totalSpend: 30000 }]);
      expect(r.length).toBe(2);
      expect(r[0].campaignName).toBe("Test Campaign");
      expect(r[1].campaignName).toBe("B");
    });
  });

  describe("generateSample", () => {
    it("generates sample with defaults", () => {
      const r = roiCalculatorService.generateSample({});
      expect(r.campaignName).toBe("Q3 Campaign");
      expect(r.isProfitable).toBe(true);
    });

    it("overrides with custom input", () => {
      const r = roiCalculatorService.generateSample({ campaignName: "Custom", totalSpend: 10, totalRevenue: 5 });
      expect(r.campaignName).toBe("Custom");
      expect(r.isProfitable).toBe(false);
    });
  });

  describe("generateComparisonScenarios", () => {
    it("returns three scenarios", () => {
      const r = roiCalculatorService.generateComparisonScenarios();
      expect(r.length).toBe(3);
      expect(r[0].campaignName).toBe("Conservative");
      expect(r[2].campaignName).toBe("Aggressive");
    });
  });

  describe("monteCarlo", () => {
    it("runs monte carlo simulation", () => {
      const r = roiCalculatorService.monteCarlo(sampleInput, 500);
      expect(r.meanRoi).not.toBe(0);
      expect(r.probabilityProfit).toBeGreaterThan(0);
      expect(r.medianRoi).toBeGreaterThan(r.percentile10);
      expect(r.percentile90).toBeGreaterThan(r.percentile10);
    });
  });

  describe("sensitivityAnalysis", () => {
    it("returns ranked variable impacts", () => {
      const r = roiCalculatorService.sensitivityAnalysis(sampleInput, 20);
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].variable).toBeTruthy();
      expect(r[0].impact).toBeTruthy();
      const sorted = r.every((v, i) => i === 0 || v.range <= r[i - 1].range);
      expect(sorted).toBe(true);
    });
  });

  describe("breakeven", () => {
    it("computes breakeven revenue", () => {
      const r = roiCalculatorService.breakeven(sampleInput);
      expect(r.breakevenRevenue).toBeGreaterThan(0);
      expect(r.isProfitable).toBe(true);
      expect(r.marginOfSafety).toBeGreaterThan(0);
    });
  });

  describe("attributionWeightedROI", () => {
    it("returns models with channel contributions", () => {
      const now = Date.now();
      const touchpoints = [
        { channel: "google", spend: 2000, conversions: 10, position: 1, timestamp: now - 500000 },
        { channel: "meta", spend: 1500, conversions: 8, position: 2, timestamp: now - 300000 },
        { channel: "email", spend: 500, conversions: 5, position: 3, timestamp: now - 100000 },
      ];
      const r = roiCalculatorService.attributionWeightedROI(touchpoints, 50000);
      expect(r.length).toBe(3);
      expect(r.map((m) => m.model)).toEqual(["linear", "time_decay", "position_based"]);
      expect(r[0].channelContributions.length).toBeGreaterThan(0);
    });
  });

  describe("scenarioComparison", () => {
    it("compares two scenarios with bootstrap", () => {
      const r = roiCalculatorService.scenarioComparison(
        { ...sampleInput, campaignName: "A" },
        { ...sampleInput, campaignName: "B", totalRevenue: 100000 },
        300,
      );
      expect(r.meanRoiA).toBeGreaterThan(r.meanRoiB);
      expect(r.probabilityABetter).toBeGreaterThan(50);
    });
  });
});

// ─── CompetitiveBenchmarkingService ────────────────────────────────────

describe("CompetitiveBenchmarkingService", () => {
  describe("getBenchmarks", () => {
    it("returns benchmarks for tenant", () => {
      const r = competitiveBenchmarkingService.getBenchmarks(TEST_TENANT, "saas");
      expect(r.industry).toBe("saas");
      expect(r.overallScore).toBeGreaterThan(0);
      expect(r.comparisons.length).toBeGreaterThan(0);
      expect(r.yourPerformance).toBeDefined();
      expect(r.industryBenchmarks).toBeDefined();
    });

    it("returns recommendations and radar", () => {
      const r = competitiveBenchmarkingService.getBenchmarks(TEST_TENANT, "ecommerce");
      expect(r.recommendations.length).toBeGreaterThan(0);
      expect(r._radar.length).toBe(5);
      expect(r._gapAnalysis.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("computeRadarScores", () => {
    it("returns radar dimension scores", () => {
      const comparisons = Array.from({ length: 10 }, (_, i) => ({
        metric: ["avgCpc", "avgCpm", "avgCpa", "avgCvr", "avgRoas", "avgCtr", "avgSpendPerCampaign", "totalSpend", "avgBudgetUtilization", "activeCampaigns"][i],
        yourValue: 50 + i * 5,
        benchmark: 50,
      }));
      const r = competitiveBenchmarkingService.computeRadarScores(comparisons);
      expect(r.length).toBe(5);
      expect(r[0].dimension).toBeTruthy();
      expect(r[0].score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("confidenceInterval", () => {
    it("returns CI for given sample size", () => {
      const r = competitiveBenchmarkingService.confidenceInterval(100, 30, 0.95);
      expect(r.lower).toBeLessThan(r.upper);
      expect(r.marginOfError).toBeGreaterThan(0);
    });
  });

  describe("trendComparison", () => {
    it("detects improving/deteriorating metrics", () => {
      const r = competitiveBenchmarkingService.trendComparison(
        { ctr: 3.0, cvr: 5.0, cpc: 2.0, roas: 4.0 },
        { ctr: 2.0, cvr: 4.0, cpc: 2.5, roas: 3.0 },
      );
      expect(r.length).toBe(4);
      expect(r.filter((m) => m.direction === "improving").length).toBeGreaterThan(0);
    });
  });

  describe("competitivePositioning", () => {
    it("maps to quadrant", () => {
      const comparisons = [
        { metric: "avgCpc", percentile: 70 },
        { metric: "avgCpa", percentile: 65 },
        { metric: "avgCpm", percentile: 60 },
        { metric: "avgCtr", percentile: 75 },
        { metric: "avgCvr", percentile: 80 },
        { metric: "avgRoas", percentile: 85 },
      ];
      const r = competitiveBenchmarkingService.competitivePositioning(comparisons);
      expect(["leader", "challenger", "niche", "laggard"]).toContain(r.quadrant);
      expect(r.explanation).toBeTruthy();
    });
  });

  describe("getIndustries", () => {
    it("returns industry list", () => {
      const r = competitiveBenchmarkingService.getIndustries();
      expect(r.length).toBe(6);
      expect(r[0].id).toBe("saas");
    });
  });
});

function expectedPortfolioRoas(result: any): number {
  return result.expectedPortfolioRoas;
}
