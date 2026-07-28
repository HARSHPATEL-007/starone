import { describe, it, expect, beforeAll } from "vitest";
import { campaignInsightsEngine } from "../services/CampaignInsightsEngineService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_cie_tenant";
const TEST_CAMPAIGN = "test_cie_camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "CIE Test Campaign", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 60000, clicks: 2400, conversions: 120, revenue: 18000, spend: 6000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
  DataStore.mem().insert("campaigns", {
    _id: "test_cie_camp2", name: "CIE Test Campaign 2", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 300, lifetime: 9000, spent: 3000, remaining: 6000, currency: "USD" },
    metrics: { impressions: 30000, clicks: 900, conversions: 30, revenue: 4500, spend: 3000 },
    startDate: "2025-03-01", endDate: "2025-09-30",
  });
});

describe("CampaignInsightsEngine - analyzeCampaign", () => {
  it("returns insights array for a campaign", () => {
    const insights = campaignInsightsEngine.analyzeCampaign(TEST_CAMPAIGN, TEST_TENANT);
    expect(Array.isArray(insights)).toBe(true);
    for (const ins of insights) {
      expect(ins).toHaveProperty("id");
      expect(ins).toHaveProperty("category");
      expect(ins).toHaveProperty("severity");
      expect(ins).toHaveProperty("title");
      expect(ins).toHaveProperty("message");
      expect(ins).toHaveProperty("confidence");
      expect(ins).toHaveProperty("recommendation");
      expect(ins).toHaveProperty("generatedAt");
    }
  });

  it("returns empty for unknown campaign", () => {
    const insights = campaignInsightsEngine.analyzeCampaign("nonexistent", TEST_TENANT);
    expect(insights).toEqual([]);
  });
});

describe("CampaignInsightsEngine - generateDashboard", () => {
  it("returns dashboard with summary, insights, recommendations, trends", () => {
    const dash = campaignInsightsEngine.generateDashboard(TEST_TENANT);
    expect(dash).toHaveProperty("generatedAt");
    expect(dash.summary).toHaveProperty("totalInsights");
    expect(dash.summary).toHaveProperty("byCategory");
    expect(dash.summary).toHaveProperty("bySeverity");
    expect(dash.summary).toHaveProperty("avgConfidence");
    expect(Array.isArray(dash.insights)).toBe(true);
    expect(Array.isArray(dash.recommendations)).toBe(true);
    expect(Array.isArray(dash.trends)).toBe(true);
  });
});

describe("CampaignInsightsEngine - findCorrelations", () => {
  it("returns correlation analysis with pairs", () => {
    const analysis = campaignInsightsEngine.findCorrelations(TEST_TENANT);
    expect(analysis).toHaveProperty("generatedAt");
    expect(Array.isArray(analysis.correlations)).toBe(true);
    expect(analysis.summary.totalCorrelations).toBeGreaterThan(0);
    for (const c of analysis.correlations) {
      expect(c).toHaveProperty("metricA");
      expect(c).toHaveProperty("metricB");
      expect(c).toHaveProperty("correlationCoefficient");
      expect(c).toHaveProperty("strength");
      expect(c).toHaveProperty("direction");
    }
  });
});

describe("CampaignInsightsEngine - analyzeTrends", () => {
  it("returns trend analysis for a valid campaign", () => {
    const trends = campaignInsightsEngine.analyzeTrends(TEST_CAMPAIGN, TEST_TENANT);
    expect(trends).not.toBeNull();
    expect(trends!.campaignId).toBe(TEST_CAMPAIGN);
    expect(trends!.campaignName).toBeTruthy();
    expect(Array.isArray(trends!.trends)).toBe(true);
    expect(trends!.overallAssessment).toBeTruthy();
  });

  it("returns null for unknown campaign", () => {
    const trends = campaignInsightsEngine.analyzeTrends("nonexistent", TEST_TENANT);
    expect(trends).toBeNull();
  });
});

describe("CampaignInsightsEngine - calculateBudgetEfficiency", () => {
  it("returns sorted efficiency scores with grades", () => {
    const scores = campaignInsightsEngine.calculateBudgetEfficiency(TEST_TENANT);
    expect(Array.isArray(scores)).toBe(true);
    expect(scores.length).toBeGreaterThan(0);
    for (const s of scores) {
      expect(s).toHaveProperty("campaignId");
      expect(s).toHaveProperty("campaignName");
      expect(s).toHaveProperty("roas");
      expect(s).toHaveProperty("efficiencyScore");
      expect(s).toHaveProperty("grade");
      expect(s).toHaveProperty("recommendation");
    }
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1].efficiencyScore).toBeLessThanOrEqual(scores[i].efficiencyScore);
    }
  });
});

describe("CampaignInsightsEngine - crossCampaignAttribution", () => {
  it("returns attribution data for each campaign", () => {
    const attrib = campaignInsightsEngine.crossCampaignAttribution(TEST_TENANT);
    expect(Array.isArray(attrib)).toBe(true);
    expect(attrib.length).toBeGreaterThan(0);
    for (const a of attrib) {
      expect(a).toHaveProperty("campaignId");
      expect(a).toHaveProperty("directConversions");
      expect(a).toHaveProperty("assistedConversions");
      expect(a).toHaveProperty("attributionShare");
      expect(a).toHaveProperty("incrementalValue");
    }
  });
});

describe("CampaignInsightsEngine - generatePredictiveAlerts", () => {
  it("returns alert summary with categorized alerts", () => {
    const alerts = campaignInsightsEngine.generatePredictiveAlerts(TEST_TENANT);
    expect(alerts).toHaveProperty("generatedAt");
    expect(Array.isArray(alerts.alerts)).toBe(true);
    expect(alerts.summary).toHaveProperty("totalAlerts");
    expect(alerts.summary).toHaveProperty("avgConfidence");
  });
});
