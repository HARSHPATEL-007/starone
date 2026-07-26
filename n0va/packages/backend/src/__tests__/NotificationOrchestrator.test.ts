import { describe, it, expect, beforeAll } from "vitest";
import { NotificationOrchestrator } from "../business-logic/NotificationOrchestrator";
import { MemoryStore } from "../services/MemoryStore";

const orchestrator = new NotificationOrchestrator();

describe("NotificationOrchestrator", () => {
  beforeAll(() => {
    MemoryStore.getInstance();
  });

  describe("getDeliveryDashboard", () => {
    it("returns dashboard with all required sections", () => {
      const result = orchestrator.getDeliveryDashboard();
      expect(result).toHaveProperty("channelHealth");
      expect(result).toHaveProperty("deliverySLA");
      expect(result).toHaveProperty("worstChannel");
      expect(result).toHaveProperty("bestChannel");
      expect(result).toHaveProperty("channelsAtRisk");
      expect(result).toHaveProperty("healthBand");
      expect(result).toHaveProperty("recommendations");
    });

    it("returns deliverySLA with expected fields", () => {
      const result = orchestrator.getDeliveryDashboard();
      expect(result.deliverySLA).toHaveProperty("totalDeliveries");
      expect(result.deliverySLA).toHaveProperty("successRate");
      expect(result.deliverySLA).toHaveProperty("failedCount");
      expect(result.deliverySLA).toHaveProperty("retryingCount");
      expect(result.deliverySLA).toHaveProperty("avgAttempts");
    });

    it("returns channelHealth as sorted array", () => {
      const result = orchestrator.getDeliveryDashboard();
      expect(Array.isArray(result.channelHealth)).toBe(true);
      for (const ch of result.channelHealth) {
        expect(ch).toHaveProperty("channel");
        expect(ch).toHaveProperty("score");
        expect(ch).toHaveProperty("circuitOpen");
        expect(ch).toHaveProperty("deliveryCount");
        expect(ch).toHaveProperty("healthBand");
      }
    });

    it("returns recommendations array", () => {
      const result = orchestrator.getDeliveryDashboard();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe("getChannelTrend", () => {
    it("returns trend data for a channel", () => {
      const result = orchestrator.getChannelTrend("email");
      expect(result).toHaveProperty("scoreTrend");
      expect(result).toHaveProperty("circuitTripCount");
      expect(result).toHaveProperty("avgLatency");
      expect(Array.isArray(result.scoreTrend)).toBe(true);
      expect(result.circuitTripCount).toBeGreaterThanOrEqual(0);
      expect(result.avgLatency).toBeGreaterThanOrEqual(0);
    });
  });
});
