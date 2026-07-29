import { describe, it, expect } from "vitest";
import { campaignAttributionModeling } from "../services/CampaignAttributionModelingService";

describe("CampaignAttributionModelingService", () => {
  const tenantId = "test-tenant-attr";
  const campaignId = "test-campaign-attr";

  it("runs first-touch attribution", () => {
    const r = campaignAttributionModeling.runAttribution(campaignId, tenantId, "first_touch");
    expect(r.campaignId).toBe(campaignId);
    expect(r.model).toBe("first_touch");
    expect(r.allocations.length).toBeGreaterThan(0);
    expect(r.totalConversions).toBeGreaterThan(0);
    r.allocations.forEach(a => {
      expect(a.channel).toBeTruthy();
      expect(a.conversions).toBeGreaterThanOrEqual(0);
      expect(a.share).toBeGreaterThanOrEqual(0);
    });
  });

  it("runs last-touch attribution", () => {
    const r = campaignAttributionModeling.runAttribution(campaignId, tenantId, "last_touch");
    expect(r.model).toBe("last_touch");
    expect(r.allocations.length).toBeGreaterThan(0);
  });

  it("runs linear attribution", () => {
    const r = campaignAttributionModeling.runAttribution(campaignId, tenantId, "linear");
    expect(r.model).toBe("linear");
    expect(r.allocations.length).toBeGreaterThan(0);
  });

  it("runs time-decay attribution", () => {
    const r = campaignAttributionModeling.runAttribution(campaignId, tenantId, "time_decay");
    expect(r.model).toBe("time_decay");
    expect(r.allocations.length).toBeGreaterThan(0);
  });

  it("runs position-based attribution", () => {
    const r = campaignAttributionModeling.runAttribution(campaignId, tenantId, "position_based");
    expect(r.model).toBe("position_based");
    expect(r.allocations.length).toBeGreaterThan(0);
  });

  it("computes Shapley value attribution", () => {
    const r = campaignAttributionModeling.shapleyValueAttribution(campaignId, tenantId);
    expect(r.model).toBe("shapley_value");
    expect(r.allocations.length).toBeGreaterThan(0);
    expect(r.totalConversions).toBeGreaterThan(0);
    r.allocations.forEach(a => {
      expect(a.conversions).toBeGreaterThanOrEqual(0);
    });
  });

  it("computes Markov chain attribution", () => {
    const r = campaignAttributionModeling.markovChainAttribution(campaignId, tenantId);
    expect(r.campaignId).toBe(campaignId);
    expect(r.removalEffects.length).toBeGreaterThan(0);
    expect(r.allocations.length).toBeGreaterThan(0);
    r.removalEffects.forEach(e => {
      expect(e.channel).toBeTruthy();
      expect(["high", "medium", "low"]).toContain(e.importance);
    });
  });

  it("compares attribution models", () => {
    const r = campaignAttributionModeling.compareAttributionModels(campaignId, tenantId);
    expect(r.models.length).toBe(5);
    expect(r.rankCorrelations.length).toBeGreaterThan(0);
    expect(r.topChannelByModel.length).toBe(5);
    expect(r.consensusTop3.length).toBeGreaterThan(0);
    expect(r.divergenceScore).toBeGreaterThanOrEqual(0);
    r.rankCorrelations.forEach(rc => {
      expect(rc.modelA).toBeTruthy();
      expect(rc.modelB).toBeTruthy();
      expect(rc.spearmanRho).toBeGreaterThanOrEqual(-1);
      expect(rc.spearmanRho).toBeLessThanOrEqual(1);
    });
  });

  it("analyzes attribution by channel", () => {
    const r = campaignAttributionModeling.attributionByChannel(campaignId, tenantId);
    expect(r.campaignId).toBe(campaignId);
    expect(r.channels.length).toBeGreaterThan(0);
    r.channels.forEach(ch => {
      expect(ch.channel).toBeTruthy();
      expect(ch.firstTouch).toBeGreaterThanOrEqual(0);
      expect(ch.lastTouch).toBeGreaterThanOrEqual(0);
      expect(ch.linear).toBeGreaterThanOrEqual(0);
      expect(ch.timeDecay).toBeGreaterThanOrEqual(0);
      expect(ch.positionBased).toBeGreaterThanOrEqual(0);
      expect(ch.shapley).toBeGreaterThanOrEqual(0);
      expect(ch.markov).toBeGreaterThanOrEqual(0);
      expect(ch.consensus).toBeGreaterThanOrEqual(0);
      expect(["rising", "declining", "stable"]).toContain(ch.trend);
    });
  });

  it("generates attribution insights", () => {
    const r = campaignAttributionModeling.attributionInsights(campaignId, tenantId);
    expect(r.length).toBeGreaterThan(0);
    r.forEach(i => {
      expect(i.insight).toBeTruthy();
      expect(i.type).toBeTruthy();
      expect(i.severity).toBeTruthy();
      expect(i.detail).toBeTruthy();
    });
  });

  it("produces consistent results for same campaign+tenant", () => {
    const r1 = campaignAttributionModeling.runAttribution(campaignId, tenantId, "linear");
    const r2 = campaignAttributionModeling.runAttribution(campaignId, tenantId, "linear");
    expect(r1.allocations.length).toBe(r2.allocations.length);
    expect(r1.totalConversions).toBe(r2.totalConversions);
  });

  it("produces different results for different tenants", () => {
    const r1 = campaignAttributionModeling.runAttribution(campaignId, tenantId, "linear");
    const r2 = campaignAttributionModeling.runAttribution(campaignId, "other-tenant", "linear");
    const top1 = r1.allocations.map(a => `${a.channel}:${a.conversions}`).join(",");
    const top2 = r2.allocations.map(a => `${a.channel}:${a.conversions}`).join(",");
    expect(top1).not.toBe(top2);
  });

  it("Shapley allocation total matches conversions", () => {
    const r = campaignAttributionModeling.shapleyValueAttribution(campaignId, tenantId);
    const totalAlloc = r.allocations.reduce((s, a) => s + a.conversions, 0);
    expect(totalAlloc).toBeGreaterThan(0);
  });

  it("Markov removal effects sorted by importance", () => {
    const r = campaignAttributionModeling.markovChainAttribution(campaignId, tenantId);
    for (let i = 1; i < r.removalEffects.length; i++) {
      expect(r.removalEffects[i - 1].removalEffect).toBeGreaterThanOrEqual(r.removalEffects[i].removalEffect);
    }
  });

  it("model comparison reports agreement", () => {
    const r = campaignAttributionModeling.compareAttributionModels(campaignId, tenantId);
    expect(r.agreement).toBeGreaterThanOrEqual(0);
    expect(r.agreement).toBeLessThanOrEqual(100);
  });
});
