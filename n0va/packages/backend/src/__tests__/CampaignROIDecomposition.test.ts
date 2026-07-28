import { describe, it, expect, beforeAll } from "vitest";
import { campaignROIDecomposition } from "../services/CampaignROIDecompositionService";
import { DataStore } from "../services/DataStore";

const TEST_TENANT = "test_roi_tenant";
const TEST_CAMPAIGN = "test_roi_camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: TEST_CAMPAIGN, name: "ROI Decomp Test", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
  DataStore.mem().insert("campaigns", {
    _id: "test_roi_camp2", name: "ROI Decomp Test 2", tenantId: TEST_TENANT, status: "active",
    budget: { daily: 300, lifetime: 9000, spent: 3000, remaining: 6000, currency: "USD" },
    metrics: { impressions: 30000, clicks: 900, conversions: 30, revenue: 4500, spend: 3000 },
    startDate: "2025-03-01", endDate: "2025-09-30",
  });
});

describe("CampaignROIDecomposition - decomposeROI", () => {
  it("returns ROI decomposition with factors", () => {
    const result = campaignROIDecomposition.decomposeROI(TEST_CAMPAIGN, TEST_TENANT);
    expect(result).not.toBeNull();
    expect(result!.campaignId).toBe(TEST_CAMPAIGN);
    expect(result!.totalROAS).toBeGreaterThan(0);
    expect(result!.factors.length).toBeGreaterThan(0);
    for (const f of result!.factors) {
      expect(f).toHaveProperty("name");
      expect(f).toHaveProperty("contribution");
      expect(f).toHaveProperty("direction");
      expect(f).toHaveProperty("description");
    }
    expect(result!.summary).toHaveProperty("primaryDriver");
    expect(result!.summary).toHaveProperty("diversification");
    expect(result!.summary).toHaveProperty("recommendation");
  });

  it("returns null for unknown campaign", () => {
    expect(campaignROIDecomposition.decomposeROI("nonexistent", TEST_TENANT)).toBeNull();
  });
});

describe("CampaignROIDecomposition - attributeFactors", () => {
  it("returns factor attribution with percent breakdown", () => {
    const attr = campaignROIDecomposition.attributeFactors(TEST_CAMPAIGN, TEST_TENANT);
    expect(attr).not.toBeNull();
    expect(attr!.campaignId).toBe(TEST_CAMPAIGN);
    expect(attr!.attributions.length).toBeGreaterThan(0);
    const totalPct = attr!.attributions.reduce((s, a) => s + a.percentOfTotal, 0);
    expect(totalPct).toBeCloseTo(100, -1);
  });
});

describe("CampaignROIDecomposition - analyzeMarginalReturns", () => {
  it("returns marginal return curve with optimal spend", () => {
    const mr = campaignROIDecomposition.analyzeMarginalReturns(TEST_CAMPAIGN, TEST_TENANT);
    expect(mr).not.toBeNull();
    expect(mr!.campaignId).toBe(TEST_CAMPAIGN);
    expect(mr!.points.length).toBeGreaterThan(0);
    expect(mr!.optimalSpend).toBeGreaterThan(0);
    for (const p of mr!.points) {
      expect(p).toHaveProperty("spend");
      expect(p).toHaveProperty("marginalROAS");
      expect(p).toHaveProperty("marginalRevenue");
    }
  });
});

describe("CampaignROIDecomposition - analyzeSensitivity", () => {
  it("returns sensitivity analysis with elasticity", () => {
    const sens = campaignROIDecomposition.analyzeSensitivity(TEST_CAMPAIGN, TEST_TENANT);
    expect(sens).not.toBeNull();
    expect(sens!.campaignId).toBe(TEST_CAMPAIGN);
    expect(sens!.baseROAS).toBeGreaterThan(0);
    expect(sens!.variables.length).toBeGreaterThan(0);
    expect(sens!.mostSensitiveVariable).toBeTruthy();
    for (const v of sens!.variables) {
      expect(v).toHaveProperty("variable");
      expect(v).toHaveProperty("change");
      expect(v).toHaveProperty("roasImpact");
      expect(v).toHaveProperty("elasticity");
    }
  });
});

describe("CampaignROIDecomposition - forecastByFactor", () => {
  it("returns factor-level ROI forecast", () => {
    const forecast = campaignROIDecomposition.forecastByFactor(TEST_CAMPAIGN, TEST_TENANT);
    expect(forecast).not.toBeNull();
    expect(forecast!.campaignId).toBe(TEST_CAMPAIGN);
    expect(forecast!.baselineROAS).toBeGreaterThan(0);
    expect(forecast!.totalProjectedROAS).toBeGreaterThan(0);
    expect(forecast!.factorForecasts.length).toBeGreaterThan(0);
    for (const ff of forecast!.factorForecasts) {
      expect(ff).toHaveProperty("factor");
      expect(ff).toHaveProperty("currentContribution");
      expect(ff).toHaveProperty("projectedContribution");
      expect(ff).toHaveProperty("confidence");
    }
  });
});

describe("CampaignROIDecomposition - decompositionTrends", () => {
  it("returns trend data for all campaigns", () => {
    const trends = campaignROIDecomposition.decompositionTrends(TEST_TENANT);
    expect(Array.isArray(trends)).toBe(true);
    expect(trends.length).toBeGreaterThan(0);
    for (const t of trends) {
      expect(t).toHaveProperty("campaignId");
      expect(Array.isArray(t.periods)).toBe(true);
      expect(t.periods.length).toBeGreaterThan(0);
      expect(t.trend).toHaveProperty("improving");
      expect(t.trend).toHaveProperty("declining");
    }
  });
});
