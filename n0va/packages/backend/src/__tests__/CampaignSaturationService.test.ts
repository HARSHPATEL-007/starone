import { describe, it, expect, beforeAll } from "vitest";
import { campaignSaturationService } from "../services/CampaignSaturationService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_sat_tenant";
const TEST_CAMPAIGN = "test_sat_camp";

beforeAll(() => {
  const mem = DataStore.mem();
  for (let i = 0; i < 12; i++) {
    mem.insert("campaigns", {
      _id: `sat_camp_${i}`, name: `Saturation Campaign ${i}`, tenantId: TEST_TENANT,
      status: i < 8 ? "active" : "paused",
      budget: { daily: 200 + i * 50, lifetime: 30000 + i * 5000, spent: 5000 + i * 1000, remaining: 25000 + i * 4000, currency: "USD" },
      metrics: { impressions: 50000 + i * 5000, clicks: 2000 + i * 200, conversions: 100 + i * 10, revenue: 15000 + i * 1500, spend: 5000 + i * 500 },
      startDate: "2025-01-01", endDate: "2025-12-31",
    });
  }
  mem.insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "Saturation Test", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 8000, remaining: 7000, currency: "USD" },
    metrics: { impressions: 80000, clicks: 3200, conversions: 160, revenue: 24000, spend: 8000 },
    startDate: "2025-03-01", endDate: "2025-09-30",
  });
  for (let i = 0; i < 14; i++) {
    mem.insert("metrics", {
      campaignId: TEST_CAMPAIGN, date: new Date(2025, 2 + Math.floor(i / 2), 1 + (i % 2) * 15).toISOString(),
      impressions: 5000 + i * 200 + Math.round(Math.random() * 1000),
      clicks: 150 + i * 10 + Math.round(Math.random() * 50),
      conversions: 8 + i + Math.round(Math.random() * 3),
      spend: 400 + i * 20 + Math.round(Math.random() * 100),
      revenue: 1000 + i * 100 + Math.round(Math.random() * 200),
    });
  }
  mem.insert("metrics", {
    campaignId: "sat_camp_0", date: "2025-01-01",
    impressions: 10000, clicks: 400, conversions: 20, spend: 1000, revenue: 3000,
  });
});

describe("CampaignSaturationService - analyze", () => {
  it("returns saturation analysis for existing campaign", () => {
    const r = campaignSaturationService.analyze(TEST_CAMPAIGN, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(TEST_CAMPAIGN);
    expect(r).toHaveProperty("currentMarginalROI");
    expect(r).toHaveProperty("saturationLevel");
    expect(r).toHaveProperty("saturationScore");
    expect(r).toHaveProperty("estimatedSaturationPoint");
    expect(r).toHaveProperty("budgetUtilizationAtSaturation");
    expect(r).toHaveProperty("curveParams");
    expect(r).toHaveProperty("fatigueMetrics");
    expect(r).toHaveProperty("recommendation");
    expect(r!.fatigueMetrics).toHaveProperty("frequencyMedians");
    expect(r!.fatigueMetrics).toHaveProperty("frequencyCorrelation");
    expect(r!.fatigueMetrics).toHaveProperty("fatigueDetected");
    expect(r!.fatigueMetrics).toHaveProperty("fatigueSeverity");
    expect(r!.fatigueMetrics).toHaveProperty("optimalFrequency");
    expect(["none", "moderate", "high", "critical"]).toContain(r!.saturationLevel);
  });

  it("returns null for unknown campaign", () => {
    expect(campaignSaturationService.analyze("nonexistent", TEST_TENANT)).toBeNull();
  });

  it("handles low data campaigns gracefully", () => {
    const r = campaignSaturationService.analyze("sat_camp_0", TEST_TENANT);
    expect(r).not.toBeNull();
    expect(["none", "moderate", "high", "critical"]).toContain(r!.saturationLevel);
  });
});

describe("CampaignSaturationService - analyzeAll", () => {
  it("returns analyses for all tenant campaigns", () => {
    const r = campaignSaturationService.analyzeAll(TEST_TENANT);
    expect(r).toHaveProperty("analyses");
    expect(r).toHaveProperty("summary");
    expect(Array.isArray(r.analyses)).toBe(true);
    expect(r.analyses.length).toBeGreaterThanOrEqual(1);
    expect(r.summary).toHaveProperty("critical");
    expect(r.summary).toHaveProperty("high");
    expect(r.summary).toHaveProperty("moderate");
    expect(r.summary).toHaveProperty("none");
    expect(r.summary).toHaveProperty("fatigued");
  });

  it("returns empty for unknown tenant", () => {
    const r = campaignSaturationService.analyzeAll("nonexistent_tenant");
    expect(r.analyses.length).toBe(0);
  });
});

describe("CampaignSaturationService - saturationForecast", () => {
  it("returns forecast with projected spend levels", () => {
    const r = campaignSaturationService.saturationForecast(TEST_CAMPAIGN, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.currentMarginalROI).toBeGreaterThan(0);
    expect(r!.spendToSaturation).toBeGreaterThan(0);
    expect(r!.estimatedDaysToSaturation).toBeGreaterThan(0);
    expect(Array.isArray(r!.projectedSpendLevels)).toBe(true);
    expect(r!.projectedSpendLevels.length).toBeGreaterThan(0);
    for (const pl of r!.projectedSpendLevels) {
      expect(pl).toHaveProperty("level");
      expect(pl).toHaveProperty("marginalROI");
      expect(pl).toHaveProperty("projectedConversions");
      expect(pl).toHaveProperty("revenue");
    }
    expect(typeof r!.recommendation).toBe("string");
  });

  it("respects custom projection periods", () => {
    const r = campaignSaturationService.saturationForecast(TEST_CAMPAIGN, TEST_TENANT, 6);
    expect(r!.projectedSpendLevels.length).toBe(6);
  });

  it("returns null for unknown campaign", () => {
    expect(campaignSaturationService.saturationForecast("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignSaturationService - saturationByChannel", () => {
  it("returns saturation breakdown by channel", () => {
    const r = campaignSaturationService.saturationByChannel(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(7);
    for (const c of r) {
      expect(c).toHaveProperty("channel");
      expect(c).toHaveProperty("spend");
      expect(c).toHaveProperty("conversions");
      expect(c).toHaveProperty("marginalROI");
      expect(c).toHaveProperty("saturationLevel");
      expect(c).toHaveProperty("saturationScore");
      expect(c).toHaveProperty("efficiencyRank");
      expect(c).toHaveProperty("recommendation");
      expect(["none", "moderate", "high", "critical"]).toContain(c.saturationLevel);
    }
  });
});

describe("CampaignSaturationService - saturationRecoveryAnalysis", () => {
  it("returns recovery strategies", () => {
    const r = campaignSaturationService.saturationRecoveryAnalysis(TEST_CAMPAIGN, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.currentSaturationScore).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(r!.recoveryStrategies)).toBe(true);
    expect(r!.recoveryStrategies.length).toBeGreaterThanOrEqual(4);
    for (const s of r!.recoveryStrategies) {
      expect(s).toHaveProperty("strategy");
      expect(s).toHaveProperty("description");
      expect(s).toHaveProperty("projectedImprovement");
      expect(s).toHaveProperty("timeToRecover");
      expect(s).toHaveProperty("riskLevel");
      expect(["low", "medium", "high"]).toContain(s.riskLevel);
    }
    expect(typeof r!.optimalStrategy).toBe("string");
    expect(typeof r!.expectedResult).toBe("string");
  });

  it("returns null for unknown campaign", () => {
    expect(campaignSaturationService.saturationRecoveryAnalysis("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignSaturationService - saturationBenchmark", () => {
  it("returns benchmark comparison", () => {
    const r = campaignSaturationService.saturationBenchmark(TEST_CAMPAIGN, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.saturationScore).toBeGreaterThanOrEqual(0);
    expect(r!.industryPercentile).toBeGreaterThanOrEqual(1);
    expect(r!.industryPercentile).toBeLessThanOrEqual(99);
    expect(typeof r!.benchmarkComparison).toBe("string");
    expect(Array.isArray(r!.metrics)).toBe(true);
    expect(r!.metrics.length).toBeGreaterThan(0);
    for (const m of r!.metrics) {
      expect(m).toHaveProperty("metric");
      expect(m).toHaveProperty("value");
      expect(m).toHaveProperty("benchmark");
      expect(m).toHaveProperty("verdict");
      expect(["above", "at", "below"]).toContain(m.verdict);
    }
    expect(["good", "average", "concerning"]).toContain(r!.overallVerdict);
    expect(typeof r!.recommendation).toBe("string");
  });
});

describe("CampaignSaturationService - saturationOptimizationSuggestions", () => {
  it("returns prioritized optimization suggestions", () => {
    const r = campaignSaturationService.saturationOptimizationSuggestions(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThanOrEqual(6);
    for (const s of r) {
      expect(s).toHaveProperty("action");
      expect(s).toHaveProperty("description");
      expect(s).toHaveProperty("expectedImpact");
      expect(s).toHaveProperty("implementationDifficulty");
      expect(s).toHaveProperty("timeToEffect");
      expect(s).toHaveProperty("priority");
      expect(["easy", "moderate", "hard"]).toContain(s.implementationDifficulty);
      expect(["high", "medium", "low"]).toContain(s.priority);
    }
  });
});

describe("CampaignSaturationService - adCreativeFatigueAnalysis", () => {
  it("returns fatigue analysis for all creatives", () => {
    const r = campaignSaturationService.adCreativeFatigueAnalysis(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(8);
    for (const cr of r) {
      expect(cr).toHaveProperty("creativeId");
      expect(cr).toHaveProperty("creativeName");
      expect(cr).toHaveProperty("creativeType");
      expect(cr).toHaveProperty("impressions");
      expect(cr).toHaveProperty("clicks");
      expect(cr).toHaveProperty("conversions");
      expect(cr).toHaveProperty("ctr");
      expect(cr).toHaveProperty("cvr");
      expect(cr).toHaveProperty("fatigueScore");
      expect(cr).toHaveProperty("fatigueStage");
      expect(cr).toHaveProperty("estimatedRemainingLife");
      expect(cr).toHaveProperty("recommendation");
      expect(["fresh", "growing", "mature", "declining", "fatigued"]).toContain(cr.fatigueStage);
    }
  });
});

describe("CampaignSaturationService - fatiguePredictionModel", () => {
  it("returns fatigue prediction with daily scores", () => {
    const r = campaignSaturationService.fatiguePredictionModel(TEST_CAMPAIGN, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.currentFatigueScore).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(r!.predictedScores)).toBe(true);
    expect(r!.predictedScores.length).toBe(30);
    for (const ps of r!.predictedScores) {
      expect(ps).toHaveProperty("day");
      expect(ps).toHaveProperty("score");
    }
    expect(typeof r!.estimatedFatigueDate).toBe("string");
    expect(r!.daysUntilFatigue).toBeGreaterThan(0);
    expect(["low", "medium", "high"]).toContain(r!.confidenceLevel);
    expect(Array.isArray(r!.contributingFactors)).toBe(true);
    expect(r!.contributingFactors.length).toBeGreaterThan(0);
    for (const f of r!.contributingFactors) {
      expect(f).toHaveProperty("factor");
      expect(f).toHaveProperty("impact");
    }
    expect(Array.isArray(r!.preventiveActions)).toBe(true);
    expect(r!.preventiveActions.length).toBeGreaterThan(0);
  });

  it("returns null for unknown campaign", () => {
    expect(campaignSaturationService.fatiguePredictionModel("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignSaturationService - audienceSaturationAnalysis", () => {
  it("returns saturation per audience segment", () => {
    const r = campaignSaturationService.audienceSaturationAnalysis(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(8);
    for (const seg of r) {
      expect(seg).toHaveProperty("audienceSegment");
      expect(seg).toHaveProperty("size");
      expect(seg).toHaveProperty("impressions");
      expect(seg).toHaveProperty("frequency");
      expect(seg).toHaveProperty("conversionRate");
      expect(seg).toHaveProperty("saturationScore");
      expect(seg).toHaveProperty("saturationLevel");
      expect(seg).toHaveProperty("recommendation");
      expect(["none", "low", "moderate", "high", "critical"]).toContain(seg.saturationLevel);
    }
  });
});

describe("CampaignSaturationService - budgetReallocationSuggestions", () => {
  it("returns reallocation suggestions", () => {
    const r = campaignSaturationService.budgetReallocationSuggestions(TEST_CAMPAIGN, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.currentAllocation).toBeGreaterThan(0);
    expect(Array.isArray(r!.suggestedAllocations)).toBe(true);
    expect(r!.suggestedAllocations.length).toBeGreaterThan(0);
    for (const s of r!.suggestedAllocations) {
      expect(s).toHaveProperty("targetArea");
      expect(s).toHaveProperty("amount");
      expect(s).toHaveProperty("expectedROAS");
      expect(s).toHaveProperty("rationale");
    }
    expect(r!.expectedPortfolioImprovement).toBeGreaterThanOrEqual(0);
    expect(["low", "medium", "high"]).toContain(r!.riskLevel);
  });

  it("returns null for unknown campaign", () => {
    expect(campaignSaturationService.budgetReallocationSuggestions("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignSaturationService - saturationTrendAnalysis", () => {
  it("returns trend analysis with direction and volatility", () => {
    const r = campaignSaturationService.saturationTrendAnalysis(TEST_CAMPAIGN, TEST_TENANT);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(TEST_CAMPAIGN);
    expect(Array.isArray(r!.trends)).toBe(true);
    expect(r!.trends.length).toBe(31);
    for (const t of r!.trends) {
      expect(t).toHaveProperty("date");
      expect(t).toHaveProperty("saturationScore");
      expect(t).toHaveProperty("marginalROI");
      expect(t).toHaveProperty("fatigueScore");
    }
    expect(["improving", "stable", "worsening"]).toContain(r!.direction);
    expect(["low", "medium", "high"]).toContain(r!.volatility);
    expect(r!.projectedScoreNextPeriod).toBeGreaterThanOrEqual(0);
    expect(r!.projectedScoreNextPeriod).toBeLessThanOrEqual(100);
    expect(typeof r!.recommendation).toBe("string");
  });

  it("returns null for unknown campaign", () => {
    expect(campaignSaturationService.saturationTrendAnalysis("nonexistent", TEST_TENANT)).toBeNull();
  });
});
