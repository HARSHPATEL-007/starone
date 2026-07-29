import { describe, it, expect } from "vitest";
import { campaignAIBiddingAgent } from "../services/CampaignAIBiddingAgentService";

describe("CampaignAIBiddingAgentService", () => {
  const tenantId = "test-tenant-bid";
  const campaignId = "test-campaign-bid";

  it("returns bidding dashboard", () => {
    const d = campaignAIBiddingAgent.getBiddingDashboard(campaignId, tenantId);
    expect(d.campaignId).toBe(campaignId);
    expect(d.currentBids.length).toBeGreaterThan(0);
    d.currentBids.forEach(b => {
      expect(b.channel).toBeTruthy();
      expect(b.currentBid).toBeGreaterThan(0);
      expect(b.winRate).toBeGreaterThan(0);
      expect(b.avgPosition).toBeGreaterThan(0);
    });
    expect(d.auctionHealth.totalAuctions).toBeGreaterThan(0);
    expect(d.aggregateStats.totalSpend).toBeGreaterThan(0);
    expect(Array.isArray(d.riskIndicators)).toBe(true);
  });

  it("analyzes auction insights", () => {
    const a = campaignAIBiddingAgent.analyzeAuctionInsights(campaignId, tenantId);
    expect(a.campaignId).toBe(campaignId);
    expect(a.channels.length).toBeGreaterThan(0);
    a.channels.forEach(ch => {
      expect(ch.auctionVolume).toBeGreaterThan(0);
      expect(ch.winRate).toBeGreaterThan(0);
      expect(ch.avgBid).toBeGreaterThan(0);
      expect(ch.suggestedBidRange.low).toBeLessThan(ch.suggestedBidRange.high);
      expect(["rising", "declining", "stable"]).toContain(ch.trend);
    });
    expect(a.auctionLandscape.totalMarketSize).toBeGreaterThan(0);
    expect(a.auctionLandscape.bidDensity).toBeTruthy();
  });

  it("recommends bid adjustments", () => {
    const r = campaignAIBiddingAgent.recommendBidAdjustments(campaignId, tenantId);
    expect(r.campaignId).toBe(campaignId);
    expect(r.adjustments.length).toBeGreaterThan(0);
    r.adjustments.forEach(a => {
      expect(a.channel).toBeTruthy();
      expect(a.currentBid).toBeGreaterThan(0);
      expect(a.recommendedBid).toBeGreaterThan(0);
      expect(a.rationale).toBeTruthy();
      expect(a.confidence).toBeGreaterThan(0);
      expect(["high", "medium", "low"]).toContain(a.priority);
    });
    expect(r.aggregateImpact.expectedCPCChange).toBeDefined();
    expect(r.signalsConsidered.length).toBeGreaterThan(0);
  });

  it("simulates bid scenario", () => {
    const scenario = { name: "Test Increase", adjustments: [{ channel: "Search", newBid: 2.5 }, { channel: "Social", newBid: 1.8 }] };
    const s = campaignAIBiddingAgent.simulateBidScenario(campaignId, tenantId, scenario);
    expect(s.campaignId).toBe(campaignId);
    expect(s.scenario).toBe("Test Increase");
    expect(s.adjustments.length).toBe(2);
    expect(s.projectedOutcome.impressions).toBeGreaterThan(0);
    expect(s.projectedOutcome.clicks).toBeGreaterThan(0);
    expect(s.projectedOutcome.roas).toBeGreaterThan(0);
    expect(s.vsCurrent.impressionsDelta).toBeDefined();
    expect(s.confidence).toBeGreaterThan(0);
    expect(["low", "medium", "high"]).toContain(s.risk);
  });

  it("analyzes bid efficiency", () => {
    const e = campaignAIBiddingAgent.analyzeBidEfficiency(campaignId, tenantId);
    expect(e.campaignId).toBe(campaignId);
    expect(e.bidCurve.length).toBeGreaterThan(0);
    e.bidCurve.forEach(p => {
      expect(p.bid).toBeGreaterThan(0);
      expect(p.estimatedConversions).toBeGreaterThan(0);
    });
    expect(e.optimalBid).toBeGreaterThan(0);
    expect(e.efficiencyScore).toBeGreaterThan(0);
    expect(e.recommendations.length).toBeGreaterThan(0);
    e.recommendations.forEach(r => {
      expect(r.action).toBeTruthy();
      expect(r.expectedImprovement).toBeTruthy();
    });
  });

  it("generates bid strategy", () => {
    const s = campaignAIBiddingAgent.generateBidStrategy(campaignId, tenantId, "maximize_roas");
    expect(s.campaignId).toBe(campaignId);
    expect(s.strategyName).toBeTruthy();
    expect(s.channels.length).toBeGreaterThan(0);
    s.channels.forEach(ch => {
      expect(ch.targetBid).toBeGreaterThan(0);
      expect(ch.maxBid).toBeGreaterThan(ch.targetBid);
      expect(ch.bidAdjustmentRules.length).toBeGreaterThan(0);
    });
    expect(s.rules.length).toBeGreaterThan(0);
    expect(s.targets.length).toBe(4);
    expect(["manual", "semi_automated", "fully_automated"]).toContain(s.automationLevel);
    expect(s.expectedOutcome.cpcReduction).toBeGreaterThan(0);
  });

  it("generates different strategies for different goals", () => {
    const roas = campaignAIBiddingAgent.generateBidStrategy(campaignId, tenantId, "maximize_roas");
    const conv = campaignAIBiddingAgent.generateBidStrategy(campaignId, tenantId, "maximize_conversions");
    expect(roas.strategyName).not.toBe(conv.strategyName);
  });

  it("produces consistent results for same campaign+tenant", () => {
    const d1 = campaignAIBiddingAgent.getBiddingDashboard(campaignId, tenantId);
    const d2 = campaignAIBiddingAgent.getBiddingDashboard(campaignId, tenantId);
    expect(d1.currentBids.length).toBe(d2.currentBids.length);
    expect(d1.auctionHealth.totalAuctions).toBe(d2.auctionHealth.totalAuctions);
  });

  it("produces different results for different tenants", () => {
    const d1 = campaignAIBiddingAgent.getBiddingDashboard(campaignId, tenantId);
    const d2 = campaignAIBiddingAgent.getBiddingDashboard(campaignId, "other-tenant");
    const bids1 = d1.currentBids.map(b => b.currentBid).join(",");
    const bids2 = d2.currentBids.map(b => b.currentBid).join(",");
    expect(bids1).not.toBe(bids2);
  });

  it("bid adjustments sorted by change magnitude", () => {
    const r = campaignAIBiddingAgent.recommendBidAdjustments(campaignId, tenantId);
    for (let i = 1; i < r.adjustments.length; i++) {
      expect(Math.abs(r.adjustments[i - 1].changePercent)).toBeGreaterThanOrEqual(Math.abs(r.adjustments[i].changePercent));
    }
  });

  it("bid curve shows diminishing returns", () => {
    const e = campaignAIBiddingAgent.analyzeBidEfficiency(campaignId, tenantId);
    const mid = Math.floor(e.bidCurve.length / 2);
    const last = e.bidCurve.length - 1;
    if (e.bidCurve[last].marginalROI < e.bidCurve[mid].marginalROI) {
      expect(e.diminishingReturnsPoint).toBeGreaterThan(0);
    }
  });

  it("risk indicators reflect dashboard state", () => {
    const d = campaignAIBiddingAgent.getBiddingDashboard(campaignId, tenantId);
    if (d.riskIndicators.length > 0) {
      d.riskIndicators.forEach(r => {
        expect(r.indicator).toBeTruthy();
        expect(["low", "medium", "high"]).toContain(r.severity);
        expect(r.message).toBeTruthy();
      });
    }
  });
});
