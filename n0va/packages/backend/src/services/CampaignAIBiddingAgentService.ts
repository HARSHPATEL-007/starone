import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

function seededRandom(seed: string): () => number {
  let state = hashStr(seed);
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

interface BidDashboard {
  campaignId: string;
  timestamp: string;
  currentBids: { channel: string; currentBid: number; minBid: number; maxBid: number; suggestedBid: number; winRate: number; avgPosition: number }[];
  aggregateStats: { totalSpend: number; totalConversions: number; avgCPC: number; avgCPA: number; overallWinRate: number; budgetUtilization: number };
  auctionHealth: { totalAuctions: number; wonAuctions: number; lostAuctions: number; averageCompetitors: number; averageBidPrice: number };
  riskIndicators: { indicator: string; severity: "low" | "medium" | "high"; message: string }[];
}

interface AuctionInsight {
  campaignId: string;
  channels: { channel: string; auctionVolume: number; winRate: number; avgBid: number; avgWinningBid: number; competitionLevel: number; competitorCount: number; suggestedBidRange: { low: number; high: number }; trend: "rising" | "declining" | "stable" }[];
  auctionLandscape: { totalMarketSize: number; estimatedShare: number; averageCPCBid: number; averageCPMBid: number; bidDensity: string };
}

interface BidAdjustment {
  campaignId: string;
  adjustments: { channel: string; currentBid: number; recommendedBid: number; change: number; changePercent: number; rationale: string; confidence: number; priority: "high" | "medium" | "low" }[];
  aggregateImpact: { expectedCPCChange: number; expectedWinRateChange: number; expectedSpendChange: number; expectedConversionChange: number; expectedRevenueChange: number };
  signalsConsidered: string[];
}

interface BidSimulation {
  campaignId: string;
  scenario: string;
  adjustments: { channel: string; originalBid: number; simulatedBid: number; change: number }[];
  projectedOutcome: { impressions: number; clicks: number; conversions: number; spend: number; revenue: number; cpc: number; cpa: number; roas: number };
  vsCurrent: { impressionsDelta: number; clicksDelta: number; conversionsDelta: number; spendDelta: number; revenueDelta: number; roasDelta: number };
  confidence: number;
  risk: "low" | "medium" | "high";
}

interface BidEfficiency {
  campaignId: string;
  bidCurve: { bid: number; estimatedConversions: number; estimatedSpend: number; marginalROI: number }[];
  optimalBid: number;
  currentEfficiency: number;
  efficiencyScore: number;
  wasteEstimate: number;
  diminishingReturnsPoint: number;
  recommendations: { action: string; expectedImprovement: string; priority: "high" | "medium" | "low" }[];
}

interface BidStrategy {
  campaignId: string;
  strategyName: string;
  goal: string;
  channels: { channel: string; strategy: string; targetBid: number; maxBid: number; bidAdjustmentRules: { condition: string; adjustment: number; description: string }[]; automated: boolean }[];
  rules: { rule: string; priority: number; description: string }[];
  targets: { metric: string; current: number; target: number; timeframe: string }[];
  automationLevel: "manual" | "semi_automated" | "fully_automated";
  expectedOutcome: { cpcReduction: number; winRateIncrease: number; roasImprovement: number; efficiencyGain: number };
}

interface CompetitorAnalysis {
  campaignId: string;
  competitors: { competitorId: string; estimatedBid: number; shareOfVoice: number; overlapRate: number; avgPosition: number; aggressiveness: "low" | "medium" | "high" }[];
  marketConcentration: number;
  competitivePressure: "low" | "medium" | "high";
  recommendedPositioning: string;
}

interface BidTrendPoint {
  date: string;
  channel: string;
  bid: number;
  winRate: number;
  cpc: number;
  impressionShare: number;
}

interface BidTrendAnalysis {
  campaignId: string;
  trends: BidTrendPoint[];
  channelSummary: { channel: string; avgBid: number; bidVolatility: number; trend: "rising" | "declining" | "stable"; suggestedDirection: "increase" | "decrease" | "maintain" }[];
  overallDirection: "aggressive" | "conservative" | "mixed";
}

interface BidOpportunity {
  channel: string;
  currentBid: number;
  recommendedBid: number;
  expectedWinRateImprovement: number;
  expectedVolumeIncrease: number;
  expectedCostImpact: number;
  roi: number;
  priority: "high" | "medium" | "low";
  rationale: string;
}

interface PortfolioBidAllocation {
  campaignId: string;
  channel: string;
  currentAllocation: number;
  recommendedAllocation: number;
  expectedROAS: number;
  marginalROI: number;
  constraint: "budget" | "volume" | "efficiency" | "none";
}

interface BidAnomaly {
  date: string;
  channel: string;
  metric: string;
  observedValue: number;
  expectedValue: number;
  zScore: number;
  severity: "low" | "medium" | "high";
  probableCause: string;
}

interface ScenarioComparison {
  scenarios: { name: string; projectedROAS: number; projectedConversions: number; projectedSpend: number; projectedRevenue: number; risk: "low" | "medium" | "high"; confidence: number }[];
  bestScenario: string;
  ranking: string[];
}

export class CampaignAIBiddingAgentService {
  private getSeed(campaignId: string, tenantId: string): string {
    return `bid_agent_${campaignId}_${tenantId}`;
  }

  getBiddingDashboard(campaignId: string, tenantId: string): BidDashboard {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_dash");
    const channels = ["Search", "Display", "Social", "Video", "Shopping"];
    const currentBids = channels.map(ch => {
      const baseBid = rng() * 3 + 0.5;
      const minBid = Math.round(baseBid * 0.6 * 100) / 100;
      const maxBid = Math.round(baseBid * 1.8 * 100) / 100;
      const suggestedBid = Math.round((baseBid * (rng() * 0.3 + 0.85)) * 100) / 100;
      const winRate = Math.round((rng() * 0.4 + 0.3) * 10000) / 100;
      const avgPosition = Math.round((rng() * 3 + 1) * 100) / 100;
      return { channel: ch, currentBid: Math.round(baseBid * 100) / 100, minBid, maxBid, suggestedBid, winRate, avgPosition };
    });
    const totalSpend = Math.round((rng() * 5000 + 1000) * 100) / 100;
    const totalConversions = Math.floor(rng() * 100 + 20);
    const avgCPC = totalConversions > 0 ? Math.round((totalSpend / totalConversions) * 100) / 100 : 0;
    const totalClicks = Math.floor(rng() * 2000 + 500);
    const avgCPA = totalConversions > 0 ? Math.round((totalSpend / totalConversions) * 100) / 100 : 0;
    const overallWinRate = Math.round((rng() * 0.3 + 0.4) * 10000) / 100;
    const budgetUtilization = Math.round((rng() * 0.4 + 0.5) * 10000) / 100;
    const totalAuctions = Math.floor(rng() * 50000 + 10000);
    const wonAuctions = Math.floor(totalAuctions * (rng() * 0.3 + 0.3));
    const lostAuctions = totalAuctions - wonAuctions;
    const averageCompetitors = Math.round((rng() * 5 + 3) * 100) / 100;
    const averageBidPrice = Math.round((rng() * 2 + 0.5) * 100) / 100;

    const riskIndicators: BidDashboard["riskIndicators"] = [];
    const lowWinRateBids = currentBids.filter(b => b.winRate < 30);
    if (lowWinRateBids.length > 1) {
      riskIndicators.push({ indicator: "Low win rate on multiple channels", severity: "high", message: `${lowWinRateBids.length} channels have win rates below 30% — bids may need significant adjustment` });
    }
    if (budgetUtilization > 90) {
      riskIndicators.push({ indicator: "High budget utilization", severity: "medium", message: "Budget nearly exhausted — consider increasing lifetime budget" });
    } else if (budgetUtilization < 30) {
      riskIndicators.push({ indicator: "Low budget utilization", severity: "medium", message: "Budget severely underutilized — consider increasing bid aggressiveness" });
    }
    if (averageBidPrice > 2.5) {
      riskIndicators.push({ indicator: "High average bid price", severity: "low", message: `Average bid of $${averageBidPrice.toFixed(2)} is above market median` });
    }

    return {
      campaignId, timestamp: new Date().toISOString(), currentBids,
      aggregateStats: { totalSpend, totalConversions, avgCPC: Math.round(avgCPC * 100) / 100, avgCPA, overallWinRate, budgetUtilization },
      auctionHealth: { totalAuctions, wonAuctions, lostAuctions, averageCompetitors, averageBidPrice },
      riskIndicators,
    };
  }

  analyzeAuctionInsights(campaignId: string, tenantId: string): AuctionInsight {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_auction");
    const channels = ["Search", "Display", "Social", "Video", "Shopping"];
    const channelData = channels.map(ch => {
      const auctionVolume = Math.floor(rng() * 20000 + 5000);
      const winRate = Math.round((rng() * 0.35 + 0.3) * 10000) / 100;
      const avgBid = Math.round((rng() * 2 + 0.5) * 100) / 100;
      const avgWinningBid = Math.round((avgBid * (rng() * 0.3 + 0.9)) * 100) / 100;
      const competitionLevel = Math.round((rng() * 0.6 + 0.2) * 10000) / 100;
      const competitorCount = Math.floor(rng() * 8 + 2);
      const low = Math.round(avgBid * 0.7 * 100) / 100;
      const high = Math.round(avgBid * 1.3 * 100) / 100;
      const trend: "rising" | "declining" | "stable" = rng() > 0.6 ? "rising" : rng() > 0.3 ? "declining" : "stable";
      return { channel: ch + "_auctions", auctionVolume, winRate, avgBid, avgWinningBid, competitionLevel, competitorCount, suggestedBidRange: { low, high }, trend };
    });
    channelData.forEach(cd => { cd.channel = cd.channel.replace("_auctions", ""); });
    const totalMarketSize = Math.floor(rng() * 500000 + 100000);
    const estimatedShare = Math.round((rng() * 0.1 + 0.02) * 10000) / 100;
    const averageCPCBid = Math.round((rng() * 1.5 + 0.5) * 100) / 100;
    const averageCPMBid = Math.round((rng() * 10 + 5) * 100) / 100;
    const densityBuckets = ["Low", "Medium", "High"];
    const bidDensity = densityBuckets[Math.floor(rng() * densityBuckets.length)] + " competition density";
    return { campaignId, channels: channelData, auctionLandscape: { totalMarketSize, estimatedShare, averageCPCBid, averageCPMBid, bidDensity } };
  }

  recommendBidAdjustments(campaignId: string, tenantId: string): BidAdjustment {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_adj");
    const channels = ["Search", "Display", "Social", "Video", "Shopping"];
    const adjustments = channels.map(ch => {
      const currentBid = Math.round((rng() * 3 + 0.5) * 100) / 100;
      const direction = rng() > 0.5 ? 1 : -1;
      const pctChange = Math.round((rng() * 0.2 + 0.05) * 10000) / 100;
      const recommendedBid = Math.round(currentBid * (1 + direction * pctChange / 100) * 100) / 100;
      const change = Math.round((recommendedBid - currentBid) * 100) / 100;
      const changePercent = currentBid > 0 ? Math.round((change / currentBid) * 10000) / 100 : 0;
      const rationales = [
        "Win rate below 30% threshold — increase bid to improve auction position",
        "Conversion rate trending up — increase bid to capture incremental conversions",
        "Competition level rising — bid adjustment needed to maintain position",
        "ROAS above target — opportunity to increase spend at current efficiency",
        "Impression share declining — bid increase recommended to recover visibility",
        "High efficiency at current bid — maintain or slightly increase",
      ];
      const rationale = rationales[Math.floor(rng() * rationales.length)];
      const confidence = Math.round((rng() * 0.3 + 0.6) * 10000) / 100;
      const priority: "high" | "medium" | "low" = Math.abs(changePercent) > 15 ? "high" : Math.abs(changePercent) > 8 ? "medium" : "low";
      return { channel: ch, currentBid, recommendedBid, change, changePercent, rationale, confidence, priority };
    });
    adjustments.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    const avgCPCChange = adjustments.reduce((s, a) => s + (a.changePercent > 0 ? -0.5 : 0.3), 0) / adjustments.length * 10;
    const avgWinRateChange = adjustments.reduce((s, a) => s + (a.changePercent > 0 ? 3 : -2), 0);
    const avgSpendChange = adjustments.reduce((s, a) => s + Math.abs(a.changePercent) * 0.5, 0);
    const avgConvChange = adjustments.reduce((s, a) => s + (a.changePercent > 0 ? 2 : -1.5), 0);
    const avgRevChange = avgConvChange * (rng() * 20 + 10);
    const signals = ["Auction win rate", "Competition level", "Conversion trend", "ROAS performance", "Impression share", "Budget utilization", "Historical bid efficiency"];
    const signalsConsidered = signals.filter(() => rng() > 0.3);
    return {
      campaignId, adjustments,
      aggregateImpact: {
        expectedCPCChange: Math.round(avgCPCChange * 100) / 100,
        expectedWinRateChange: Math.round(avgWinRateChange * 100) / 100,
        expectedSpendChange: Math.round(avgSpendChange * 100) / 100,
        expectedConversionChange: Math.round(avgConvChange * 100) / 100,
        expectedRevenueChange: Math.round(avgRevChange * 100) / 100,
      },
      signalsConsidered,
    };
  }

  simulateBidScenario(campaignId: string, tenantId: string, scenario: { name: string; adjustments: { channel: string; newBid: number }[] }): BidSimulation {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_sim_" + scenario.name);
    const dashboard = this.getBiddingDashboard(campaignId, tenantId);
    const adjustments = scenario.adjustments.map(adj => {
      const chData = dashboard.currentBids.find(b => b.channel === adj.channel);
      const originalBid = chData?.currentBid || adj.newBid;
      return { channel: adj.channel, originalBid, simulatedBid: adj.newBid, change: Math.round((adj.newBid - originalBid) * 100) / 100 };
    });
    const totalBidChange = adjustments.reduce((s, a) => s + (a.simulatedBid / Math.max(a.originalBid, 0.01) - 1), 0) / Math.max(adjustments.length, 1);
    const factor = 1 + totalBidChange * 0.5;
    const baseImpressions = Math.floor(rng() * 50000 + 20000);
    const baseClicks = Math.floor(baseImpressions * (rng() * 0.02 + 0.01));
    const baseConversions = Math.floor(baseClicks * (rng() * 0.05 + 0.02));
    const baseSpend = Math.round((baseClicks * (rng() * 1.5 + 0.5)) * 100) / 100;
    const baseRevenue = Math.round((baseConversions * (rng() * 30 + 10)) * 100) / 100;
    const simImpressions = Math.floor(baseImpressions * Math.max(0.5, factor));
    const simClicks = Math.floor(baseClicks * Math.max(0.5, factor * 0.9));
    const simConversions = Math.floor(baseConversions * Math.max(0.5, factor * 0.8));
    const simSpend = Math.round((baseSpend * (1 + totalBidChange * 0.7)) * 100) / 100;
    const simRevenue = Math.round((baseRevenue * Math.max(0.5, factor * 0.85)) * 100) / 100;
    const simCpc = simClicks > 0 ? Math.round((simSpend / simClicks) * 100) / 100 : 0;
    const simCpa = simConversions > 0 ? Math.round((simSpend / simConversions) * 100) / 100 : 0;
    const simRoas = simSpend > 0 ? Math.round((simRevenue / simSpend) * 100) / 100 : 0;
    const currentCpc = baseClicks > 0 ? Math.round((baseSpend / baseClicks) * 100) / 100 : 0;
    const currentCpa = baseConversions > 0 ? Math.round((baseSpend / baseConversions) * 100) / 100 : 0;
    const currentRoas = baseSpend > 0 ? Math.round((baseRevenue / baseSpend) * 100) / 100 : 0;
    const confidence = Math.round((rng() * 0.2 + 0.7) * 10000) / 100;
    const risk: "low" | "medium" | "high" = Math.abs(totalBidChange) > 0.3 ? "high" : Math.abs(totalBidChange) > 0.15 ? "medium" : "low";
    return {
      campaignId, scenario: scenario.name, adjustments,
      projectedOutcome: { impressions: simImpressions, clicks: simClicks, conversions: simConversions, spend: simSpend, revenue: simRevenue, cpc: simCpc, cpa: simCpa, roas: simRoas },
      vsCurrent: {
        impressionsDelta: baseImpressions > 0 ? Math.round(((simImpressions - baseImpressions) / baseImpressions) * 10000) / 100 : 0,
        clicksDelta: baseClicks > 0 ? Math.round(((simClicks - baseClicks) / baseClicks) * 10000) / 100 : 0,
        conversionsDelta: baseConversions > 0 ? Math.round(((simConversions - baseConversions) / baseConversions) * 10000) / 100 : 0,
        spendDelta: baseSpend > 0 ? Math.round(((simSpend - baseSpend) / baseSpend) * 10000) / 100 : 0,
        revenueDelta: baseRevenue > 0 ? Math.round(((simRevenue - baseRevenue) / baseRevenue) * 10000) / 100 : 0,
        roasDelta: Math.round((simRoas - currentRoas) * 100) / 100,
      },
      confidence, risk,
    };
  }

  analyzeBidEfficiency(campaignId: string, tenantId: string): BidEfficiency {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_eff");
    const optimalBid = Math.round((rng() * 2 + 0.5) * 100) / 100;
    const bidCurve: BidEfficiency["bidCurve"] = [];
    for (let b = 0.25; b <= 5.25; b += 0.5) {
      const bid = Math.round(b * 100) / 100;
      const convFactor = Math.min(1, Math.pow(bid / optimalBid, 0.6));
      const estimatedConversions = Math.round(convFactor * (rng() * 30 + 10));
      const estimatedSpend = Math.round((bid * estimatedConversions * (rng() * 0.2 + 0.8)) * 100) / 100;
      const marginalROI = bid > 0 ? Math.round(((estimatedConversions * (rng() * 10 + 5)) / estimatedSpend) * 100) / 100 : 0;
      bidCurve.push({ bid, estimatedConversions, estimatedSpend, marginalROI });
    }
    const currentBid = Math.round((rng() * 2 + 0.5) * 100) / 100;
    const currentPoint = bidCurve.find(b => Math.abs(b.bid - currentBid) < 0.3) || bidCurve[Math.floor(bidCurve.length / 2)];
    const currentEfficiency = currentPoint.marginalROI;
    const efficiencyScore = Math.round((currentEfficiency / Math.max(...bidCurve.map(b => b.marginalROI), 1)) * 10000) / 100;
    const waste = Math.max(0, Math.round((currentPoint.estimatedSpend - currentPoint.estimatedConversions * 5) * 100) / 100);
    const diminishingPoint = bidCurve.find(b => b.marginalROI < 1.5);
    const diminishingReturnsPoint = diminishingPoint?.bid || optimalBid * 2;
    const recommendations: BidEfficiency["recommendations"] = [];
    if (currentBid > optimalBid * 1.3) {
      recommendations.push({ action: `Reduce bid from $${currentBid.toFixed(2)} to $${optimalBid.toFixed(2)}`, expectedImprovement: `${Math.round(Math.abs(currentEfficiency - currentPoint.marginalROI) * 10)}% efficiency gain`, priority: "high" });
    }
    if (currentBid < optimalBid * 0.7) {
      recommendations.push({ action: `Increase bid from $${currentBid.toFixed(2)} to $${optimalBid.toFixed(2)}`, expectedImprovement: `${Math.round(Math.abs(currentPoint.estimatedConversions - bidCurve.find(b => b.bid === optimalBid)?.estimatedConversions || 0))}% more conversions`, priority: "high" });
    }
    recommendations.push({ action: "Set bid ceiling at diminishing returns point", expectedImprovement: "Prevents waste above optimal bid threshold", priority: "medium" });
    recommendations.push({ action: "Monitor marginal ROI weekly and adjust bid floor", expectedImprovement: "Maintains efficiency over time", priority: "low" });
    return { campaignId, bidCurve, optimalBid, currentEfficiency, efficiencyScore, wasteEstimate: waste, diminishingReturnsPoint, recommendations };
  }

  generateBidStrategy(campaignId: string, tenantId: string, goal: string = "maximize_roas"): BidStrategy {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_strat");
    const channels = ["Search", "Display", "Social", "Video", "Shopping"];
    const strategyNames: Record<string, string> = {
      maximize_roas: "ROAS Maximizer",
      maximize_conversions: "Conversion Maximizer",
      balanced: "Balanced Growth",
      aggressive: "Market Share Aggressor",
      conservative: "Conservative Efficiency",
    };
    const strategyName = strategyNames[goal] || "Balanced Growth";
    const channelStrategies: BidStrategy["channels"] = channels.map(ch => {
      const targetBid = Math.round((rng() * 2 + 0.5) * 100) / 100;
      const maxBid = Math.round(targetBid * (rng() * 0.5 + 1.3) * 100) / 100;
      const rules = [
        { condition: "Win rate < 30%", adjustment: Math.round(rng() * 15 + 5), description: "Increase bid to improve win rate" },
        { condition: "ROAS > 3x", adjustment: Math.round(rng() * 10 + 5), description: "Increase bid to capture more high-value traffic" },
        { condition: "Impression share < 60%", adjustment: Math.round(rng() * 10 + 5), description: "Increase bid to recover lost impressions" },
      ];
      return { channel: ch, strategy: goal === "maximize_conversions" ? "aggressive" : goal === "conservative" ? "conservative" : "balanced", targetBid, maxBid, bidAdjustmentRules: rules, automated: rng() > 0.3 };
    });
    const rules = [
      { rule: "Never exceed max bid cap", priority: 1, description: "Hard ceiling on all bid adjustments" },
      { rule: "Auto-reduce bids when ROAS drops below 1.0x", priority: 2, description: "Prevents unprofitable spend" },
      { rule: "Increase bids for high-converting placements", priority: 3, description: "Focus budget on best performing inventory" },
      { rule: "Reduce bids during low-conversion hours", priority: 4, description: "Dayparting-aware bid management" },
      { rule: "Maintain minimum 60% impression share for top campaigns", priority: 5, description: "Visibility protection for priority campaigns" },
    ];
    const targets: BidStrategy["targets"] = [
      { metric: "CPC", current: Math.round((rng() * 1.5 + 0.5) * 100) / 100, target: Math.round((rng() * 0.5 + 0.5) * 100) / 100, timeframe: "30 days" },
      { metric: "Win Rate", current: Math.round((rng() * 20 + 30) * 100) / 100, target: Math.round((rng() * 10 + 50) * 100) / 100, timeframe: "30 days" },
      { metric: "ROAS", current: Math.round((rng() * 1 + 1.5) * 100) / 100, target: Math.round((rng() * 0.5 + 2.5) * 100) / 100, timeframe: "30 days" },
      { metric: "Cost per Conversion", current: Math.round((rng() * 10 + 5) * 100) / 100, target: Math.round((rng() * 5 + 5) * 100) / 100, timeframe: "30 days" },
    ];
    const automationLevel: "manual" | "semi_automated" | "fully_automated" = goal === "aggressive" ? "fully_automated" : goal === "conservative" ? "manual" : "semi_automated";
    const expectedOutcome = {
      cpcReduction: Math.round((rng() * 10 + 5) * 100) / 100,
      winRateIncrease: Math.round((rng() * 10 + 5) * 100) / 100,
      roasImprovement: Math.round((rng() * 0.3 + 0.2) * 100) / 100,
      efficiencyGain: Math.round((rng() * 15 + 5) * 100) / 100,
    };
    return { campaignId, strategyName, goal, channels: channelStrategies, rules, targets, automationLevel, expectedOutcome };
  }

  bidCompetitorAnalysis(campaignId: string, tenantId: string): CompetitorAnalysis {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_comp");
    const competitorCount = Math.floor(rng() * 5) + 3;
    const competitors: CompetitorAnalysis["competitors"] = [];
    for (let i = 0; i < competitorCount; i++) {
      const estimatedBid = Math.round((rng() * 2 + 0.3) * 100) / 100;
      const shareOfVoice = Math.round((rng() * 0.25 + 0.02) * 10000) / 100;
      const overlapRate = Math.round((rng() * 0.5 + 0.1) * 10000) / 100;
      const avgPosition = Math.round((rng() * 4 + 1) * 100) / 100;
      const aggressiveness: "low" | "medium" | "high" = estimatedBid > 2.5 ? "high" : estimatedBid > 1.5 ? "medium" : "low";
      competitors.push({ competitorId: `comp_${i + 1}`, estimatedBid, shareOfVoice, overlapRate, avgPosition, aggressiveness });
    }
    competitors.sort((a, b) => b.shareOfVoice - a.shareOfVoice);
    const totalShare = competitors.reduce((s, c) => s + c.shareOfVoice, 0);
    const marketConcentration = Math.round(competitors.slice(0, 3).reduce((s, c) => s + c.shareOfVoice, 0) / Math.max(totalShare, 1) * 100);
    const aggressiveCount = competitors.filter(c => c.aggressiveness === "high").length;
    const competitivePressure: "low" | "medium" | "high" = aggressiveCount > 2 ? "high" : aggressiveCount > 1 ? "medium" : "low";
    const topComp = competitors[0];
    const recommendedPositioning = topComp
      ? `Target bids ${topComp.estimatedBid > 1.5 ? "below" : "at or slightly above"} top competitor ($${topComp.estimatedBid.toFixed(2)}) — focus on niche keywords with lower competition`
      : "Market leader position — maintain competitive bids across all channels";
    return { campaignId, competitors, marketConcentration, competitivePressure, recommendedPositioning };
  }

  bidHistoricalTrends(campaignId: string, tenantId: string): BidTrendAnalysis {
    const seed = this.getSeed(campaignId, tenantId);
    const channels = ["Search", "Display", "Social", "Video", "Shopping"];
    const points = 12;
    const trends: BidTrendPoint[] = [];
    for (const ch of channels) {
      const chSeed = seededRandom(seed + "_trend_" + ch);
      let bid = chSeed() * 2 + 0.5;
      for (let w = 0; w < points; w++) {
        bid = Math.max(0.1, bid + (chSeed() - 0.5) * 0.3);
        const winRate = Math.round((chSeed() * 0.4 + 0.2) * 10000) / 100;
        const cpc = Math.round((bid * (chSeed() * 0.3 + 0.7)) * 100) / 100;
        const impShare = Math.round((chSeed() * 0.4 + 0.3) * 10000) / 100;
        const date = new Date(2025, 0, 1 + w * 7);
        trends.push({ date: date.toISOString().split("T")[0], channel: ch, bid: Math.round(bid * 100) / 100, winRate, cpc, impressionShare: impShare });
      }
    }
    const channelSummary: BidTrendAnalysis["channelSummary"] = channels.map(ch => {
      const chPoints = trends.filter(t => t.channel === ch);
      const bids = chPoints.map(t => t.bid);
      const avgBid = bids.reduce((s, v) => s + v, 0) / bids.length;
      const variance = bids.reduce((s, v) => s + (v - avgBid) ** 2, 0) / bids.length;
      const bidVolatility = Math.round(Math.sqrt(variance) / avgBid * 100) / 100;
      const firstBid = chPoints[0]?.bid || 0;
      const lastBid = chPoints[chPoints.length - 1]?.bid || 0;
      const trend: "rising" | "declining" | "stable" = lastBid - firstBid > 0.3 ? "rising" : lastBid - firstBid < -0.3 ? "declining" : "stable";
      const suggestedDirection: "increase" | "decrease" | "maintain" = trend === "rising" ? "maintain" : trend === "declining" ? "increase" : "maintain";
      return { channel: ch, avgBid: Math.round(avgBid * 100) / 100, bidVolatility, trend, suggestedDirection };
    });
    const risingCount = channelSummary.filter(c => c.trend === "rising").length;
    const decliningCount = channelSummary.filter(c => c.trend === "declining").length;
    const overallDirection: "aggressive" | "conservative" | "mixed" = risingCount > decliningCount + 1 ? "aggressive" : decliningCount > risingCount + 1 ? "conservative" : "mixed";
    return { campaignId, trends, channelSummary, overallDirection };
  }

  bidOpportunityAnalysis(campaignId: string, tenantId: string): BidOpportunity[] {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_opp");
    const channels = ["Search", "Display", "Social", "Video", "Shopping"];
    return channels.map(ch => {
      const currentBid = Math.round((rng() * 2 + 0.5) * 100) / 100;
      const direction = rng() > 0.4 ? 1 : -1;
      const pctAdj = Math.round((rng() * 0.3 + 0.05) * 10000) / 100;
      const recommendedBid = Math.round(currentBid * (1 + direction * pctAdj / 100) * 100) / 100;
      const expectedWinRateImprovement = Math.round((rng() * 15 + 3) * 100) / 100;
      const expectedVolumeIncrease = Math.round((rng() * 20 + 5) * 100) / 100;
      const expectedCostImpact = Math.round((rng() * 10 + 2) * 100) / 100;
      const roi = Math.round((expectedWinRateImprovement * 2 - expectedCostImpact) * 100) / 100;
      const priority: "high" | "medium" | "low" = roi > 20 ? "high" : roi > 10 ? "medium" : "low";
      const rationales = [
        "Win rate below channel average — increase bid to capture missed opportunities",
        "High conversion channel underinvested — increase allocation",
        "Competition decreasing — opportunity to capture share at lower cost",
        "Impression share declining — bid increase needed to maintain visibility",
        "ROAS well above target — room to scale bids profitably",
        "Low marginal ROI — reduce bid to improve efficiency",
      ];
      const rationale = rationales[Math.floor(rng() * rationales.length)];
      return { channel: ch, currentBid, recommendedBid, expectedWinRateImprovement, expectedVolumeIncrease, expectedCostImpact, roi, priority, rationale };
    }).sort((a, b) => b.roi - a.roi);
  }

  bidPortfolioOptimization(campaigns: { campaignId: string; currentBids: { channel: string; bid: number }[]; budget: number; performance: { roas: number; conversions: number } }[]): PortfolioBidAllocation[] {
    const allocations: PortfolioBidAllocation[] = [];
    for (const c of campaigns) {
      const totalRoas = c.performance.roas;
      for (const bid of c.currentBids) {
        const currentAlloc = bid.bid / Math.max(c.budget, 1) * 100;
        const efficiencyFactor = totalRoas > 2 ? 1.2 : totalRoas > 1 ? 1 : 0.8;
        const recommendedBid = Math.round(bid.bid * efficiencyFactor * 100) / 100;
        const recAlloc = recommendedBid / Math.max(c.budget, 1) * 100;
        const expectedROAS = Math.round(totalRoas * efficiencyFactor * 100) / 100;
        const marginalROI = Math.round((expectedROAS - totalRoas) * 100) / 100;
        let constraint: "budget" | "volume" | "efficiency" | "none" = "none";
        if (recAlloc > currentAlloc * 1.2) constraint = "budget";
        else if (expectedROAS < 1) constraint = "efficiency";
        allocations.push({
          campaignId: c.campaignId, channel: bid.channel,
          currentAllocation: Math.round(currentAlloc * 100) / 100,
          recommendedAllocation: Math.round(recAlloc * 100) / 100,
          expectedROAS, marginalROI, constraint,
        });
      }
    }
    return allocations.sort((a, b) => b.expectedROAS - a.expectedROAS);
  }

  bidAnomalyDetection(campaignId: string, tenantId: string): BidAnomaly[] {
    const seed = this.getSeed(campaignId, tenantId);
    const rng = seededRandom(seed + "_anom");
    const channels = ["Search", "Display", "Social", "Video", "Shopping"];
    const anomalies: BidAnomaly[] = [];
    for (const ch of channels) {
      const baseBid = rng() * 2 + 0.5;
      const baseWinRate = rng() * 0.4 + 0.3;
      const bids: number[] = [];
      const winRates: number[] = [];
      for (let w = 0; w < 10; w++) {
        bids.push(baseBid + (rng() - 0.5) * 0.3);
        winRates.push(baseWinRate + (rng() - 0.5) * 0.1);
      }
      const bidMean = bids.reduce((s, v) => s + v, 0) / bids.length;
      const bidStd = Math.sqrt(bids.reduce((s, v) => s + (v - bidMean) ** 2, 0) / bids.length);
      const wrMean = winRates.reduce((s, v) => s + v, 0) / winRates.length;
      const wrStd = Math.sqrt(winRates.reduce((s, v) => s + (v - wrMean) ** 2, 0) / winRates.length);
      const checks: { metric: string; val: number; mean: number; std: number }[] = [
        { metric: "bid", val: bids[bids.length - 1], mean: bidMean, std: bidStd },
        { metric: "winRate", val: winRates[winRates.length - 1], mean: wrMean, std: wrStd },
      ];
      for (const c of checks) {
        const z = c.std > 0 ? Math.abs(c.val - c.mean) / c.std : 0;
        if (z > 1.8) {
          const severity: "low" | "medium" | "high" = z > 3 ? "high" : z > 2.5 ? "medium" : "low";
          const causes = ["Bid strategy change by competitor", "Platform auction dynamic shift", "Budget pacing adjustment", "Audience targeting change", "Creative performance fluctuation"];
          anomalies.push({
            date: new Date().toISOString().split("T")[0], channel: ch, metric: c.metric,
            observedValue: Math.round(c.val * 10000) / 10000,
            expectedValue: Math.round(c.mean * 10000) / 10000,
            zScore: Math.round(z * 100) / 100, severity,
            probableCause: causes[Math.floor(rng() * causes.length)],
          });
        }
      }
    }
    return anomalies;
  }

  bidScenarioComparison(campaignId: string, tenantId: string, scenarios: { name: string; adjustments: { channel: string; newBid: number }[] }[]): ScenarioComparison {
    const results = scenarios.map(s => {
      const sim = this.simulateBidScenario(campaignId, tenantId, s);
      return {
        name: s.name,
        projectedROAS: sim.projectedOutcome.roas,
        projectedConversions: sim.projectedOutcome.conversions,
        projectedSpend: sim.projectedOutcome.spend,
        projectedRevenue: sim.projectedOutcome.revenue,
        risk: sim.risk,
        confidence: sim.confidence,
      };
    });
    const sorted = [...results].sort((a, b) => b.projectedROAS - a.projectedROAS);
    const bestScenario = sorted[0]?.name || "";
    const ranking = results.sort((a, b) => b.projectedROAS - a.projectedROAS).map(r => r.name);
    return { scenarios: results, bestScenario, ranking };
  }

  biddingPortfolioOverview(tenantId: string): { generatedAt: string; campaigns: { campaignId: string; campaignName: string; overallWinRate: number; budgetUtilization: number; riskLevel: string; avgCPC: number; bidEfficiency: number; recommendedAction: string }[]; totals: { scanned: number; highRisk: number; lowEfficiency: number; overBudget: number; summary: string } } {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const rows: any[] = [];
    let highRisk = 0;
    let lowEfficiency = 0;
    let overBudget = 0;
    for (const a of portfolio.analyses) {
      const dash = this.getBiddingDashboard(a.campaignId, tenantId);
      const eff = this.analyzeBidEfficiency(a.campaignId, tenantId);
      const risks = dash.riskIndicators.filter(r => r.severity === "high").length;
      const inefficiency = eff.efficiencyScore < 60;
      const overBudgeted = dash.aggregateStats.budgetUtilization > 90;
      if (risks > 0) highRisk++;
      if (inefficiency) lowEfficiency++;
      if (overBudgeted) overBudget++;
      rows.push({
        campaignId: a.campaignId, campaignName: a.campaignName,
        overallWinRate: Math.round(dash.aggregateStats.overallWinRate * 100) / 100,
        budgetUtilization: Math.round(dash.aggregateStats.budgetUtilization * 100) / 100,
        riskLevel: risks > 0 ? "high" : dash.riskIndicators.length > 0 ? "medium" : "low",
        avgCPC: Math.round(dash.aggregateStats.avgCPC * 100) / 100,
        bidEfficiency: Math.round(eff.efficiencyScore * 100) / 100,
        recommendedAction: risks > 0 ? "Review high-risk bid indicators immediately" : inefficiency ? "Rebalance bids toward efficiency curve" : overBudgeted ? "Cap spend — budget utilization over 90%" : "Keep current bid strategy",
      });
    }
    rows.sort((x, y) => y.bidEfficiency - x.bidEfficiency);
    return {
      generatedAt: new Date().toISOString(),
      campaigns: rows,
      totals: {
        scanned: rows.length,
        highRisk,
        lowEfficiency,
        overBudget,
        summary: `${highRisk} high-risk campaigns, ${lowEfficiency} with low bid efficiency, ${overBudget} over 90% budget utilization`,
      },
    };
  }

  biddingBatchApplyAdjustments(tenantId: string, priorityOnly: boolean = true): { generatedAt: string; campaigns: { campaignId: string; campaignName: string; adjustments: { channel: string; currentBid: number; recommendedBid: number; changePercent: number; rationale: string; confidence: number; priority: string }[]; expectedCPCChange: number; expectedWinRateChange: number; expectedSpendChange: number }[]; aggregateImpact: { campaignsUpdated: number; totalAdjustments: number; avgCPCChange: number; avgWinRateChange: number; avgSpendChange: number }; summary: string } {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const rows: any[] = [];
    let totalAdjustments = 0;
    let sumCPC = 0;
    let sumWin = 0;
    let sumSpend = 0;
    let campaignsUpdated = 0;
    for (const a of portfolio.analyses) {
      const adj = this.recommendBidAdjustments(a.campaignId, tenantId);
      const selected = priorityOnly ? adj.adjustments.filter(x => x.priority === "high" || x.priority === "medium") : adj.adjustments;
      if (selected.length === 0) continue;
      campaignsUpdated++;
      totalAdjustments += selected.length;
      sumCPC += adj.aggregateImpact.expectedCPCChange;
      sumWin += adj.aggregateImpact.expectedWinRateChange;
      sumSpend += adj.aggregateImpact.expectedSpendChange;
      rows.push({
        campaignId: a.campaignId, campaignName: a.campaignName,
        adjustments: selected.map(x => ({
          channel: x.channel, currentBid: x.currentBid, recommendedBid: x.recommendedBid,
          changePercent: Math.round(x.changePercent * 100) / 100, rationale: x.rationale,
          confidence: Math.round(x.confidence * 100) / 100, priority: x.priority,
        })),
        expectedCPCChange: Math.round(adj.aggregateImpact.expectedCPCChange * 100) / 100,
        expectedWinRateChange: Math.round(adj.aggregateImpact.expectedWinRateChange * 100) / 100,
        expectedSpendChange: Math.round(adj.aggregateImpact.expectedSpendChange * 100) / 100,
      });
    }
    const n = Math.max(1, campaignsUpdated);
    return {
      generatedAt: new Date().toISOString(),
      campaigns: rows,
      aggregateImpact: {
        campaignsUpdated,
        totalAdjustments,
        avgCPCChange: Math.round((sumCPC / n) * 100) / 100,
        avgWinRateChange: Math.round((sumWin / n) * 100) / 100,
        avgSpendChange: Math.round((sumSpend / n) * 100) / 100,
      },
      summary: `One-click apply: ${totalAdjustments} bid adjustments across ${campaignsUpdated} campaigns`,
    };
  }
}

export const campaignAIBiddingAgent = new CampaignAIBiddingAgentService();
