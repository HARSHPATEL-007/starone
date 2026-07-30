import { describe, it, expect, beforeAll } from "vitest";
import { CampaignCustomerJourneyService } from "../services/CampaignCustomerJourneyService";
import { DataStore } from "../services/DataStore";

const service = new CampaignCustomerJourneyService();
const T = "cj-test-tenant";

beforeAll(() => {
  const mem = DataStore.mem();
  mem.insert("campaigns", {
    _id: "cj-camp-1", name: "CJ Campaign", tenantId: T, status: "active",
    budget: { daily: 500, lifetime: 15000, spent: 2000, remaining: 13000 },
    metrics: { impressions: 30000, clicks: 1200, conversions: 60, revenue: 9000, spend: 2000, roas: 4.5, ctr: 4.0, cvr: 5.0 },
    startDate: "2025-01-01", endDate: "2025-12-31", platforms: ["meta"],
  });
});

describe("CampaignCustomerJourney - journeySummaryDashboard", () => {
  it("returns a consolidated journey dashboard", () => {
    const r = service.journeySummaryDashboard(T);
    expect(typeof r.totalJourneys).toBe("number");
    expect(typeof r.overallConversionRate).toBe("number");
    expect(typeof r.avgTouchpoints).toBe("number");
    expect(typeof r.avgPathHours).toBe("number");
    expect(Array.isArray(r.dropOffHotspots)).toBe(true);
    expect(Array.isArray(r.timeDistribution)).toBe(true);
    expect(Array.isArray(r.quickActions)).toBe(true);
    if (r.topPath) {
      expect(r.topPath).toHaveProperty("path");
      expect(r.topPath).toHaveProperty("frequency");
      expect(r.topPath).toHaveProperty("conversionRate");
    }
    for (const hotspot of r.dropOffHotspots) {
      expect(typeof hotspot.position).toBe("number");
      expect(typeof hotspot.dropOffRate).toBe("number");
    }
    for (const tb of r.timeDistribution) {
      expect(tb).toHaveProperty("bucket");
      expect(typeof tb.journeyCount).toBe("number");
    }
  });
});
