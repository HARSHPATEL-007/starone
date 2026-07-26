import { describe, it, expect } from "vitest";
import { EntityStoreOrchestrator } from "../business-logic/EntityStoreOrchestrator";

const orchestrator = new EntityStoreOrchestrator();
const TENANT_ID = "tenant_001";

describe("EntityStoreOrchestrator", () => {
  describe("getDashboard", () => {
    it("returns dashboard with all required structure", async () => {
      const result = await orchestrator.getDashboard(TENANT_ID);
      expect(result).toHaveProperty("totalRecords");
      expect(result).toHaveProperty("entityTypes");
      expect(result.entityTypes.length).toBeGreaterThan(0);
      expect(result).toHaveProperty("typeBreakdown");
      expect(result).toHaveProperty("recentActivity");
      expect(result).toHaveProperty("healthBand");
      expect(result).toHaveProperty("recommendations");
    });

    it("returns typeBreakdown entries with expected fields", async () => {
      const result = await orchestrator.getDashboard(TENANT_ID);
      for (const t of result.typeBreakdown) {
        expect(t).toHaveProperty("entityType");
        expect(t).toHaveProperty("count");
        expect(t).toHaveProperty("percentOfTotal");
        expect(t.count).toBeGreaterThanOrEqual(0);
        expect(t.percentOfTotal).toBeGreaterThanOrEqual(0);
      }
    });

    it("returns healthBand as a valid band", async () => {
      const result = await orchestrator.getDashboard(TENANT_ID);
      const validBands = ["Excellent", "Good", "Fair", "Poor", "Critical"];
      expect(validBands).toContain(result.healthBand);
    });

    it("returns recommendations array", async () => {
      const result = await orchestrator.getDashboard(TENANT_ID);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("returns recentActivity for each entity type", async () => {
      const result = await orchestrator.getDashboard(TENANT_ID);
      expect(result.recentActivity.length).toBeGreaterThan(0);
      for (const act of result.recentActivity) {
        expect(act).toHaveProperty("entityType");
        expect(act).toHaveProperty("count");
        expect(act).toHaveProperty("lastCreated");
      }
    });
  });
});
