import { describe, it, expect } from "vitest";
import { CampaignSummaryService } from "../services/CampaignSummaryService";

const service = new CampaignSummaryService();

const makeCampaign = (name: string, overrides: Record<string, any> = {}) => ({
  name, status: "active", type: "search", platforms: ["google", "meta"],
  budget: { daily: 200, lifetime: 6000, spent: 3000, remaining: 3000 },
  metrics: { impressions: 50000, clicks: 2000, conversions: 100, spend: 3000, revenue: 12000, ctr: 4.0, cpc: 1.5, roas: 4.0, cvr: 5.0 },
  ...overrides,
});

describe("CampaignSummaryService - generateSummary", () => {
  it("returns summary with insights and recommendations", () => {
    const r = service.generateSummary(makeCampaign("Test Campaign"));
    expect(r).toHaveProperty("campaignName", "Test Campaign");
    expect(r).toHaveProperty("shortSummary");
    expect(r).toHaveProperty("detailedSummary");
    expect(Array.isArray(r.keyInsights)).toBe(true);
    expect(r.keyInsights.length).toBeGreaterThan(0);
    expect(Array.isArray(r.risks)).toBe(true);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});

describe("CampaignSummaryService - generateAll", () => {
  it("returns summaries for all campaigns", () => {
    const r = service.generateAll([makeCampaign("A"), makeCampaign("B")]);
    expect(r.length).toBe(2);
  });
});

describe("CampaignSummaryService - generatePortfolioSummary", () => {
  it("returns portfolio-level summary", () => {
    const r = service.generatePortfolioSummary([makeCampaign("A", { metrics: { ...makeCampaign("A").metrics, roas: 3 } }), makeCampaign("B", { metrics: { ...makeCampaign("B").metrics, roas: 1.2 } })]);
    expect(r).toHaveProperty("totalCampaigns", 2);
    expect(r).toHaveProperty("overallROAS");
    expect(Array.isArray(r.topPerformers)).toBe(true);
    expect(Array.isArray(r.needsAttention)).toBe(true);
    expect(r).toHaveProperty("summary");
  });
});

describe("CampaignSummaryService - trendNarrative", () => {
  it("returns trend analysis across periods", () => {
    const periods = [
      { label: "Jan", metrics: { roas: 2, ctr: 2, cvr: 2, spend: 1000 } },
      { label: "Feb", metrics: { roas: 3, ctr: 3, cvr: 3, spend: 1500 } },
    ];
    const r = service.trendNarrative(periods);
    expect(r).toHaveProperty("narrative");
    expect(Array.isArray(r.trends)).toBe(true);
    expect(r.trends.length).toBeGreaterThan(0);
    expect(["positive", "negative", "neutral"]).toContain(r.overallMomentum);
  });
});

describe("CampaignSummaryService - portfolioDistribution", () => {
  it("returns distribution stats", () => {
    const r = service.portfolioDistribution([makeCampaign("A"), makeCampaign("B", { metrics: { ...makeCampaign("B").metrics, roas: 0.8 } })]);
    expect(r).toHaveProperty("roasDistribution");
    expect(Array.isArray(r.roasDistribution)).toBe(true);
    expect(r.roasDistribution.length).toBe(4);
    expect(r).toHaveProperty("spendConcentration");
    expect(r.spendConcentration).toHaveProperty("giniCoefficient");
    expect(r).toHaveProperty("diversityScore");
  });
});

describe("CampaignSummaryService - summaryPerformanceSnapshot", () => {
  it("returns performance snapshot with health score", () => {
    const r = service.summaryPerformanceSnapshot(makeCampaign("Snapshot Test"));
    expect(r.campaignName).toBe("Snapshot Test");
    expect(Array.isArray(r.keyMetrics)).toBe(true);
    expect(r.keyMetrics.length).toBeGreaterThan(0);
    for (const m of r.keyMetrics) {
      expect(m).toHaveProperty("metric");
      expect(m).toHaveProperty("value");
      expect(m).toHaveProperty("verdict");
      expect(["above", "at", "below"]).toContain(m.verdict);
    }
    expect(r.healthScore).toBeGreaterThanOrEqual(0);
    expect(r.healthScore).toBeLessThanOrEqual(100);
    expect(["positive", "negative", "neutral"]).toContain(r.momentum);
    expect(typeof r.oneLiner).toBe("string");
  });
});

describe("CampaignSummaryService - summaryBudgetHealth", () => {
  it("returns budget health for all campaigns", () => {
    const r = service.summaryBudgetHealth([
      makeCampaign("A"),
      makeCampaign("B", { budget: { daily: 500, lifetime: 10000, spent: 9500, remaining: 500 } }),
    ]);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(r.campaigns.length).toBe(2);
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignName");
      expect(c).toHaveProperty("utilizationPercent");
      expect(c).toHaveProperty("paceStatus");
      expect(["ahead", "on_track", "behind", "critical"]).toContain(c.paceStatus);
      expect(c).toHaveProperty("overspendRisk");
    }
    expect(r.totalBudget).toBeGreaterThan(0);
    expect(r.atRiskCount).toBeGreaterThanOrEqual(0);
  });
});

describe("CampaignSummaryService - summaryPlatformComparison", () => {
  it("returns platform performance comparison", () => {
    const r = service.summaryPlatformComparison([makeCampaign("A"), makeCampaign("B", { platforms: ["google", "tiktok"] })]);
    expect(Array.isArray(r.platforms)).toBe(true);
    expect(r.platforms.length).toBeGreaterThan(0);
    for (const p of r.platforms) {
      expect(p).toHaveProperty("platform");
      expect(p).toHaveProperty("avgROAS");
      expect(p).toHaveProperty("shareOfSpend");
      expect(p).toHaveProperty("efficiencyRank");
    }
    expect(typeof r.bestPlatform).toBe("string");
    expect(["low", "medium", "high"]).toContain(r.concentrationRisk);
  });
});

describe("CampaignSummaryService - summaryRiskAssessment", () => {
  it("returns risk assessment for portfolio", () => {
    const r = service.summaryRiskAssessment([
      makeCampaign("A"),
      makeCampaign("B", { metrics: { ...makeCampaign("B").metrics, roas: 0.5, ctr: 0.3, cpc: 5 } }),
    ]);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(r.campaigns.length).toBe(2);
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignName");
      expect(c).toHaveProperty("riskScore");
      expect(c).toHaveProperty("riskLevel");
      expect(c).toHaveProperty("riskFactors");
      expect(["low", "medium", "high", "critical"]).toContain(c.riskLevel);
    }
    expect(r.portfolioRiskScore).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(r.topRisks)).toBe(true);
    expect(typeof r.recommendation).toBe("string");
  });
});

describe("CampaignSummaryService - summaryOptimizationPriorities", () => {
  it("returns prioritized optimization actions", () => {
    const r = service.summaryOptimizationPriorities([makeCampaign("Low ROAS", { metrics: { ...makeCampaign("Low ROAS").metrics, roas: 0.8, ctr: 0.5 } }), makeCampaign("OK")]);
    expect(Array.isArray(r.priorities)).toBe(true);
    expect(r.priorities.length).toBeGreaterThan(0);
    for (const p of r.priorities) {
      expect(p).toHaveProperty("campaignName");
      expect(p).toHaveProperty("priority");
      expect(p).toHaveProperty("action");
      expect(p).toHaveProperty("expectedImpact");
      expect(["high", "medium", "low"]).toContain(p.priority);
    }
    expect(typeof r.summary).toBe("string");
  });
});

describe("CampaignSummaryService - summaryHistoricalComparison", () => {
  it("returns historical period comparison", () => {
    const r = service.summaryHistoricalComparison([makeCampaign("A"), makeCampaign("B")]);
    expect(Array.isArray(r.periods)).toBe(true);
    expect(r.periods.length).toBe(5);
    for (const p of r.periods) {
      expect(p).toHaveProperty("period");
      expect(p).toHaveProperty("avgROAS");
    }
    expect(r.overallROASChange).not.toBeNaN();
    expect(["improving", "declining", "stable"]).toContain(r.trend);
    expect(typeof r.recommendation).toBe("string");
  });
});

describe("CampaignSummaryService - summaryAnomalyReport", () => {
  it("returns anomalies across campaigns", () => {
    const r = service.summaryAnomalyReport([
      makeCampaign("Bad", { metrics: { ...makeCampaign("Bad").metrics, roas: 0.3, ctr: 0.2, cpc: 6 } }),
      makeCampaign("Good"),
    ]);
    expect(Array.isArray(r.anomalies)).toBe(true);
    expect(r.totalAnomalies).toBeGreaterThan(0);
    expect(r).toHaveProperty("criticalCount");
    expect(r).toHaveProperty("warningCount");
    expect(Array.isArray(r.topCampaigns)).toBe(true);
    for (const a of r.anomalies) {
      expect(a).toHaveProperty("campaignName");
      expect(a).toHaveProperty("metric");
      expect(a).toHaveProperty("severity");
      expect(["info", "warning", "critical"]).toContain(a.severity);
    }
  });
});
