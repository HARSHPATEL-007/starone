import { describe, it, expect } from "vitest";
import { CampaignAttributionModelingService } from "../services/CampaignAttributionModelingService";

const service = new CampaignAttributionModelingService();
const C = "test-campaign";
const T = "test-tenant";

describe("CampaignAttributionModelingService - attributionCustomModel", () => {
  it("returns custom attribution with config", () => {
    const config = { weights: [{ position: "first", weight: 0.5 }, { position: "last", weight: 0.5 }, { position: "middle", weight: 0.2 }], decayFactor: 0.3 };
    const r = service.attributionCustomModel(C, T, config);
    expect(r.campaignId).toBe(C);
    expect(r.model).toBe("custom");
    expect(r.totalConversions).toBeGreaterThan(0);
    expect(Array.isArray(r.allocations)).toBe(true);
    for (const a of r.allocations) {
      expect(a).toHaveProperty("channel");
      expect(a).toHaveProperty("conversions");
      expect(a).toHaveProperty("share");
      expect(a).toHaveProperty("value");
    }
  });
});

describe("CampaignAttributionModelingService - attributionChannelContribution", () => {
  it("returns channel contributions with roles", () => {
    const r = service.attributionChannelContribution(C, T);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
    for (const c of r) {
      expect(c).toHaveProperty("channel");
      expect(c).toHaveProperty("directConversions");
      expect(c).toHaveProperty("assistedConversions");
      expect(c).toHaveProperty("assistedValue");
      expect(c).toHaveProperty("incrementalLift");
      expect(c).toHaveProperty("synergyScore");
      expect(["primary", "assister", "both", "minor"]).toContain(c.role);
    }
  });
});

describe("CampaignAttributionModelingService - attributionROIDistribution", () => {
  it("returns ROI distribution across models", () => {
    const r = service.attributionROIDistribution(C, T);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(5);
    for (const m of r) {
      expect(m).toHaveProperty("model");
      expect(Array.isArray(m.channels)).toBe(true);
      expect(m.channels.length).toBeGreaterThan(0);
      for (const ch of m.channels) {
        expect(ch).toHaveProperty("channel");
        expect(ch).toHaveProperty("roas");
        expect(ch).toHaveProperty("share");
      }
      expect(m.totalROAS).toBeGreaterThan(0);
      expect(m.concentration).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("CampaignAttributionModelingService - attributionTimeToConvert", () => {
  it("returns time analysis per channel", () => {
    const r = service.attributionTimeToConvert(C, T);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
    for (const t of r) {
      expect(t).toHaveProperty("channel");
      expect(t).toHaveProperty("avgHoursToConvert");
      expect(t).toHaveProperty("medianHoursToConvert");
      expect(t).toHaveProperty("stdHours");
      expect(t).toHaveProperty("touchpointCount");
      expect(t).toHaveProperty("conversionWindow");
      expect(t.conversionWindow).toHaveProperty("min");
      expect(t.conversionWindow).toHaveProperty("max");
      expect(t).toHaveProperty("efficiency");
    }
  });
});

describe("CampaignAttributionModelingService - attributionCrossCampaign", () => {
  it("returns cross-campaign attribution", () => {
    const r = service.attributionCrossCampaign([C, "campaign-2"], T);
    expect(Array.isArray(r.campaigns)).toBe(true);
    expect(r.campaigns.length).toBe(2);
    for (const c of r.campaigns) {
      expect(c).toHaveProperty("campaignId");
      expect(Array.isArray(c.channels)).toBe(true);
    }
    expect(Array.isArray(r.overlappingChannels)).toBe(true);
    expect(r.deduplicatedTotal).toBeLessThanOrEqual(r.rawTotal);
  });
});

describe("CampaignAttributionModelingService - attributionWhatIf", () => {
  it("returns what-if scenarios", () => {
    const r = service.attributionWhatIf(C, T);
    expect(r.campaignId).toBe(C);
    expect(Array.isArray(r.scenarios)).toBe(true);
    expect(r.scenarios.length).toBeGreaterThanOrEqual(4);
    for (const s of r.scenarios) {
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("projectedConversions");
      expect(s).toHaveProperty("projectedRevenue");
      expect(s).toHaveProperty("projectedROAS");
      expect(s).toHaveProperty("changeFromCurrent");
      expect(["low", "medium", "high"]).toContain(s.risk);
    }
    expect(typeof r.bestScenario).toBe("string");
  });
});
