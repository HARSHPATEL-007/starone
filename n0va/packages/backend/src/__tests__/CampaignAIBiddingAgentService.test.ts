import { describe, it, expect } from "vitest";
import { CampaignAIBiddingAgentService } from "../services/CampaignAIBiddingAgentService";

const agent = new CampaignAIBiddingAgentService();

const C = "test-campaign";
const T = "test-tenant";

describe("CampaignAIBiddingAgentService - bidCompetitorAnalysis", () => {
  it("returns competitor analysis with positioning", () => {
    const r = agent.bidCompetitorAnalysis(C, T);
    expect(r.campaignId).toBe(C);
    expect(Array.isArray(r.competitors)).toBe(true);
    expect(r.competitors.length).toBeGreaterThanOrEqual(3);
    for (const c of r.competitors) {
      expect(c).toHaveProperty("competitorId");
      expect(c).toHaveProperty("estimatedBid");
      expect(c).toHaveProperty("shareOfVoice");
      expect(c).toHaveProperty("overlapRate");
      expect(c).toHaveProperty("avgPosition");
      expect(["low", "medium", "high"]).toContain(c.aggressiveness);
    }
    expect(r.marketConcentration).toBeGreaterThanOrEqual(0);
    expect(["low", "medium", "high"]).toContain(r.competitivePressure);
    expect(typeof r.recommendedPositioning).toBe("string");
  });
});

describe("CampaignAIBiddingAgentService - bidHistoricalTrends", () => {
  it("returns trend analysis with channel summaries", () => {
    const r = agent.bidHistoricalTrends(C, T);
    expect(r.campaignId).toBe(C);
    expect(Array.isArray(r.trends)).toBe(true);
    expect(r.trends.length).toBe(60);
    expect(Array.isArray(r.channelSummary)).toBe(true);
    expect(r.channelSummary.length).toBe(5);
    for (const s of r.channelSummary) {
      expect(s).toHaveProperty("channel");
      expect(s).toHaveProperty("avgBid");
      expect(s).toHaveProperty("bidVolatility");
      expect(["rising", "declining", "stable"]).toContain(s.trend);
      expect(["increase", "decrease", "maintain"]).toContain(s.suggestedDirection);
    }
    expect(["aggressive", "conservative", "mixed"]).toContain(r.overallDirection);
  });
});

describe("CampaignAIBiddingAgentService - bidOpportunityAnalysis", () => {
  it("returns prioritized opportunities", () => {
    const r = agent.bidOpportunityAnalysis(C, T);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(5);
    for (const o of r) {
      expect(o).toHaveProperty("channel");
      expect(o).toHaveProperty("currentBid");
      expect(o).toHaveProperty("recommendedBid");
      expect(o).toHaveProperty("expectedWinRateImprovement");
      expect(o).toHaveProperty("expectedVolumeIncrease");
      expect(o).toHaveProperty("expectedCostImpact");
      expect(o).toHaveProperty("roi");
      expect(["high", "medium", "low"]).toContain(o.priority);
      expect(typeof o.rationale).toBe("string");
    }
    expect(r[0].roi).toBeGreaterThanOrEqual(r[r.length - 1].roi);
  });
});

describe("CampaignAIBiddingAgentService - bidPortfolioOptimization", () => {
  it("returns allocation recommendations", () => {
    const campaigns = [
      { campaignId: "c1", currentBids: [{ channel: "Search", bid: 1.5 }, { channel: "Social", bid: 2.0 }], budget: 5000, performance: { roas: 3.5, conversions: 100 } },
      { campaignId: "c2", currentBids: [{ channel: "Display", bid: 0.8 }], budget: 2000, performance: { roas: 1.2, conversions: 30 } },
    ];
    const r = agent.bidPortfolioOptimization(campaigns);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(3);
    for (const a of r) {
      expect(a).toHaveProperty("campaignId");
      expect(a).toHaveProperty("channel");
      expect(a).toHaveProperty("currentAllocation");
      expect(a).toHaveProperty("recommendedAllocation");
      expect(a).toHaveProperty("expectedROAS");
      expect(a).toHaveProperty("marginalROI");
      expect(["budget", "volume", "efficiency", "none"]).toContain(a.constraint);
    }
  });
});

describe("CampaignAIBiddingAgentService - bidAnomalyDetection", () => {
  it("returns detected anomalies", () => {
    const r = agent.bidAnomalyDetection(C, T);
    expect(Array.isArray(r)).toBe(true);
    if (r.length > 0) {
      for (const a of r) {
        expect(a).toHaveProperty("date");
        expect(a).toHaveProperty("channel");
        expect(a).toHaveProperty("metric");
        expect(a).toHaveProperty("observedValue");
        expect(a).toHaveProperty("expectedValue");
        expect(a).toHaveProperty("zScore");
        expect(["low", "medium", "high"]).toContain(a.severity);
        expect(typeof a.probableCause).toBe("string");
      }
    }
  });
});

describe("CampaignAIBiddingAgentService - bidScenarioComparison", () => {
  it("returns comparison across scenarios", () => {
    const scenarios = [
      { name: "Aggressive", adjustments: [{ channel: "Search", newBid: 3.0 }, { channel: "Social", newBid: 2.5 }] },
      { name: "Conservative", adjustments: [{ channel: "Search", newBid: 1.0 }, { channel: "Social", newBid: 1.5 }] },
    ];
    const r = agent.bidScenarioComparison(C, T, scenarios);
    expect(Array.isArray(r.scenarios)).toBe(true);
    expect(r.scenarios.length).toBe(2);
    for (const s of r.scenarios) {
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("projectedROAS");
      expect(s).toHaveProperty("projectedConversions");
      expect(s).toHaveProperty("projectedSpend");
      expect(s).toHaveProperty("projectedRevenue");
      expect(["low", "medium", "high"]).toContain(s.risk);
      expect(s.confidence).toBeGreaterThanOrEqual(0);
    }
    expect(typeof r.bestScenario).toBe("string");
    expect(Array.isArray(r.ranking)).toBe(true);
    expect(r.ranking.length).toBe(2);
  });
});
