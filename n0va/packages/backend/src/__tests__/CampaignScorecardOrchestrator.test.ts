import { describe, it, expect, beforeAll } from "vitest";
import { CampaignScorecardOrchestrator } from "../business-logic/CampaignScorecardOrchestrator";
import { MemoryStore } from "../services/MemoryStore";

const orchestrator = new CampaignScorecardOrchestrator();
const TENANT_ID = "tenant_001";

describe("CampaignScorecardOrchestrator", () => {
  beforeAll(() => {
    MemoryStore.getInstance();
  });

  describe("analyze", () => {
    it("returns portfolio intelligence with all fields", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      expect(result).toHaveProperty("generatedAt");
      expect(result.generatedAt).toBeTruthy();
      expect(result).toHaveProperty("scorecard");
      expect(result).toHaveProperty("dimensionTrends");
      expect(result).toHaveProperty("topImprovers");
      expect(result).toHaveProperty("topDecliners");
      expect(result).toHaveProperty("percentileDistribution");
      expect(result).toHaveProperty("volatility");
      expect(result).toHaveProperty("recommendations");
    });

    it("returns dimensionTrends for standard dimensions", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      const dimensions = result.dimensionTrends.map((d) => d.dimension);
      expect(dimensions).toContain("health");
      expect(dimensions).toContain("roi");
      expect(dimensions).toContain("engagement");
      expect(dimensions).toContain("conversion");
      expect(dimensions).toContain("efficiency");
    });

    it("returns volatility >= 0", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      expect(result.volatility).toBeGreaterThanOrEqual(0);
    });

    it("returns recommendations array", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("returns topImprovers sorted by delta descending", async () => {
      const result = await orchestrator.analyze(TENANT_ID);
      for (let i = 1; i < result.topImprovers.length; i++) {
        expect(result.topImprovers[i - 1].delta).toBeGreaterThanOrEqual(result.topImprovers[i].delta);
      }
    });
  });
});
