import { describe, it, expect, beforeAll } from "vitest";
import { CampaignDaypartingOptimizerService } from "../services/CampaignDaypartingOptimizerService";
import { DataStore } from "../services/DataStore";

const service = new CampaignDaypartingOptimizerService();
const T = "dpt-service-test-tenant";
const C = "dpt-service-camp";

beforeAll(() => {
  DataStore.mem().insert("campaigns", {
    _id: C, name: "DPT Service Campaign", tenantId: T, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 5000, remaining: 10000, currency: "USD" },
    metrics: { impressions: 50000, clicks: 2000, conversions: 100, revenue: 15000, spend: 5000 },
    startDate: "2025-01-01", endDate: "2025-12-31",
  });
});

describe("CampaignDaypartingOptimizerService - daypartingForecast", () => {
  it("returns forecast with best/worst windows", () => {
    const r = service.daypartingForecast(C, T);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(C);
    expect(Array.isArray(r!.forecasts)).toBe(true);
    expect(r!.forecasts.length).toBeGreaterThan(0);
    for (const f of r!.forecasts) {
      expect(f).toHaveProperty("day");
      expect(f).toHaveProperty("hour");
      expect(f).toHaveProperty("predictedPerformance");
      expect(f).toHaveProperty("confidence");
    }
    expect(typeof r!.bestWindow).toBe("string");
    expect(typeof r!.worstWindow).toBe("string");
  });
});

describe("CampaignDaypartingOptimizerService - hourlyTrendAnalysis", () => {
  it("returns hourly trends with actions", () => {
    const r = service.hourlyTrendAnalysis(C, T);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
    for (const h of r) {
      expect(h).toHaveProperty("hour");
      expect(h).toHaveProperty("avgPerformance");
      expect(h).toHaveProperty("consistency");
      expect(["rising", "declining", "stable"]).toContain(h.trend);
      expect(typeof h.recommendedAction).toBe("string");
    }
  });
});

describe("CampaignDaypartingOptimizerService - daypartingROIAnalysis", () => {
  it("returns ROI analysis by window", () => {
    const r = service.daypartingROIAnalysis(C, T);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(C);
    expect(Array.isArray(r!.windows)).toBe(true);
    expect(r!.windows.length).toBe(5);
    for (const w of r!.windows) {
      expect(w).toHaveProperty("label");
      expect(w).toHaveProperty("spend");
      expect(w).toHaveProperty("revenue");
      expect(w).toHaveProperty("roas");
    }
    expect(r!.savingsOpportunity).toBeGreaterThanOrEqual(0);
  });
});

describe("CampaignDaypartingOptimizerService - timeSlotOptimization", () => {
  it("returns slot-level bid recommendations", () => {
    const r = service.timeSlotOptimization(C, T);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(C);
    expect(Array.isArray(r!.slots)).toBe(true);
    expect(r!.slots.length).toBeGreaterThan(0);
    for (const s of r!.slots) {
      expect(s).toHaveProperty("day");
      expect(s).toHaveProperty("hour");
      expect(s).toHaveProperty("currentBidMultiplier");
      expect(s).toHaveProperty("recommendedBidMultiplier");
      expect(s).toHaveProperty("expectedROAS");
    }
    expect(r!.aggregateImprovement).toBeGreaterThanOrEqual(0);
  });
});

describe("CampaignDaypartingOptimizerService - weekendVsWeekdayAnalysis", () => {
  it("returns comparison between weekend and weekday", () => {
    const r = service.weekendVsWeekdayAnalysis(C, T);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(C);
    expect(r!.weekday).toHaveProperty("avgPerformance");
    expect(r!.weekday).toHaveProperty("topHour");
    expect(r!.weekend).toHaveProperty("avgPerformance");
    expect(r!.weekend).toHaveProperty("topHour");
    expect(r!.gap).toHaveProperty("performanceGap");
    expect(r!.gap).toHaveProperty("roasGap");
    expect(typeof r!.recommendation).toBe("string");
  });
});

describe("CampaignDaypartingOptimizerService - hourlyHeatmap", () => {
  it("returns full grid with peak and low slots", () => {
    const r = service.hourlyHeatmap(C, T);
    expect(r).not.toBeNull();
    expect(r!.campaignId).toBe(C);
    expect(Array.isArray(r!.grid)).toBe(true);
    expect(r!.grid.length).toBe(168);
    for (const cell of r!.grid.slice(0, 10)) {
      expect(cell).toHaveProperty("day");
      expect(cell).toHaveProperty("hour");
      expect(cell).toHaveProperty("performance");
      expect(cell).toHaveProperty("bidMultiplier");
    }
    expect(r!.peakSlot).toHaveProperty("day");
    expect(r!.peakSlot).toHaveProperty("performance");
    expect(r!.lowSlot).toHaveProperty("day");
    expect(r!.lowSlot).toHaveProperty("performance");
    expect(r!.peakSlot.performance).toBeGreaterThanOrEqual(r!.lowSlot.performance);
  });
});
