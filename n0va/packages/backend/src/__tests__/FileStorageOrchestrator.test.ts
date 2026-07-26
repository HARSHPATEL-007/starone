import { describe, it, expect, beforeAll } from "vitest";
import { FileStorageOrchestrator } from "../business-logic/FileStorageOrchestrator";
import { MemoryStore } from "../services/MemoryStore";

const orchestrator = new FileStorageOrchestrator();
const TENANT_ID = "tenant_001";

describe("FileStorageOrchestrator", () => {
  beforeAll(() => {
    MemoryStore.getInstance();
  });

  describe("getDashboard", () => {
    it("returns dashboard with all required fields", () => {
      const result = orchestrator.getDashboard(TENANT_ID);
      expect(result).toHaveProperty("totalFiles");
      expect(result).toHaveProperty("totalSize");
      expect(result).toHaveProperty("formattedTotalSize");
      expect(result).toHaveProperty("distribution");
      expect(result).toHaveProperty("duplicates");
      expect(result).toHaveProperty("optimizationScore");
      expect(result).toHaveProperty("forecast");
      expect(result).toHaveProperty("healthBand");
      expect(result).toHaveProperty("recommendations");
    });

    it("returns totalFiles >= 0", () => {
      const result = orchestrator.getDashboard(TENANT_ID);
      expect(result.totalFiles).toBeGreaterThanOrEqual(0);
    });

    it("returns healthBand as a valid band", () => {
      const result = orchestrator.getDashboard(TENANT_ID);
      const validBands = ["Excellent", "Good", "Fair", "Poor", "Critical"];
      expect(validBands).toContain(result.healthBand);
    });

    it("returns recommendations array", () => {
      const result = orchestrator.getDashboard(TENANT_ID);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("returns distribution with byType and byEntity", () => {
      const result = orchestrator.getDashboard(TENANT_ID);
      expect(result.distribution).toHaveProperty("byType");
      expect(result.distribution).toHaveProperty("byEntity");
    });

    it("returns forecast with required fields", () => {
      const result = orchestrator.getDashboard(TENANT_ID);
      expect(result.forecast).toHaveProperty("currentUsage");
      expect(result.forecast).toHaveProperty("dailyGrowthRate");
      expect(result.forecast).toHaveProperty("projected30Days");
      expect(result.forecast).toHaveProperty("projected90Days");
      expect(result.forecast).toHaveProperty("recommendation");
    });
  });
});
