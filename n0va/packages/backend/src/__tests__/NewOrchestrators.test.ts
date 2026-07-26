import { describe, it, expect, beforeAll } from "vitest";
import { ChannelMixOptimizerOrchestrator } from "../business-logic/ChannelMixOptimizerOrchestrator";
import { KeywordInsightsOrchestrator } from "../business-logic/KeywordInsightsOrchestrator";
import { FormAnalyticsOrchestrator } from "../business-logic/FormAnalyticsOrchestrator";
import { MemoryStore } from "../services/MemoryStore";

const TENANT_ID = "tenant_001";

describe("ChannelMixOptimizerOrchestrator", () => {
  const orchestrator = new ChannelMixOptimizerOrchestrator();

  beforeAll(() => { MemoryStore.getInstance(); });

  describe("analyze", () => {
    it("returns dashboard with platform performance data", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      expect(result).toHaveProperty("platformPerformance");
      expect(Array.isArray(result.platformPerformance)).toBe(true);
      expect(result).toHaveProperty("mixAdvice");
      expect(result).toHaveProperty("concentration");
      expect(result).toHaveProperty("diversificationScore");
      expect(result).toHaveProperty("recommendations");
    });

    it("returns platformPerformance sorted by efficiency descending", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      for (let i = 1; i < result.platformPerformance.length; i++) {
        expect(result.platformPerformance[i - 1].efficiencyScore).toBeGreaterThanOrEqual(result.platformPerformance[i].efficiencyScore);
      }
    });

    it("returns concentration with hhi and gini", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      expect(result.concentration.hhi).toBeGreaterThanOrEqual(0);
      expect(result.concentration.gini).toBeGreaterThanOrEqual(0);
      expect(result.concentration.interpretation).toBeTruthy();
    });

    it("returns mixAdvice for each platform", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      expect(result.mixAdvice.length).toBe(result.platformPerformance.length);
      for (const advice of result.mixAdvice) {
        expect(advice).toHaveProperty("platform");
        expect(advice).toHaveProperty("currentAllocation");
        expect(advice).toHaveProperty("recommendedAllocation");
        expect(advice).toHaveProperty("rationale");
        expect(advice).toHaveProperty("priority");
      }
    });
  });
});

describe("KeywordInsightsOrchestrator", () => {
  const orchestrator = new KeywordInsightsOrchestrator();

  beforeAll(() => { MemoryStore.getInstance(); });

  describe("analyze", () => {
    it("returns dashboard with keyword performance data", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      expect(result).toHaveProperty("totalKeywords");
      expect(result).toHaveProperty("activeKeywords");
      expect(result).toHaveProperty("keywordPerformance");
      expect(result).toHaveProperty("opportunities");
      expect(result).toHaveProperty("trendClusters");
      expect(result).toHaveProperty("portfolioHealth");
      expect(result).toHaveProperty("portfolioBand");
      expect(result).toHaveProperty("recommendations");
    });

    it("returns keywordPerformance with computed metrics", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      for (const kw of result.keywordPerformance) {
        expect(kw).toHaveProperty("keyword");
        expect(kw).toHaveProperty("roas");
        expect(kw).toHaveProperty("ctr");
        expect(kw).toHaveProperty("opportunityScore");
        expect(kw).toHaveProperty("efficiency");
      }
    });

    it("returns trendClusters for volume groups", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      const labels = result.trendClusters.map((c) => c.label);
      expect(labels).toContain("small-volume keywords");
      expect(labels).toContain("medium-volume keywords");
      expect(labels).toContain("large-volume keywords");
    });

    it("returns portfolioBand as valid band", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      const validBands = ["Excellent", "Good", "Fair", "Poor", "Critical"];
      expect(validBands).toContain(result.portfolioBand);
    });
  });
});

describe("FormAnalyticsOrchestrator", () => {
  const orchestrator = new FormAnalyticsOrchestrator();

  beforeAll(() => { MemoryStore.getInstance(); });

  describe("analyze", () => {
    it("returns dashboard with form performance data", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      expect(result).toHaveProperty("totalForms");
      expect(result).toHaveProperty("activeForms");
      expect(result).toHaveProperty("totalSubmissions");
      expect(result).toHaveProperty("overallConversionRate");
      expect(result).toHaveProperty("formPerformance");
      expect(result).toHaveProperty("submissionTrend");
      expect(result).toHaveProperty("conversionFunnel");
      expect(result).toHaveProperty("healthScore");
      expect(result).toHaveProperty("healthBand");
      expect(result).toHaveProperty("recommendations");
    });

    it("returns formPerformance for each form", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      for (const form of result.formPerformance) {
        expect(form).toHaveProperty("formName");
        expect(form).toHaveProperty("conversionRate");
        expect(form).toHaveProperty("healthScore");
      }
    });

    it("returns conversionFunnel with stages", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      expect(result.conversionFunnel.length).toBeGreaterThan(0);
      for (const stage of result.conversionFunnel) {
        expect(stage).toHaveProperty("stage");
        expect(stage).toHaveProperty("count");
        expect(stage).toHaveProperty("dropOff");
      }
    });

    it("returns healthBand as valid band", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      const validBands = ["Excellent", "Good", "Fair", "Poor", "Critical"];
      expect(validBands).toContain(result.healthBand);
    });
  });
});
