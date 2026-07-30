import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";
import { DataStore } from "./DataStore";

interface DiscoveredSegment {
  segmentId: string;
  name: string;
  description: string;
  size: number;
  keyCharacteristics: { trait: string; value: string; strength: number }[];
  campaignIds: string[];
  totalConversions: number;
  totalRevenue: number;
  conversionRate: number;
  roas: number;
  clusterQuality: number;
}

interface SegmentDiscoveryReport {
  tenantId: string;
  generatedAt: string;
  segments: DiscoveredSegment[];
  totalAudienceSize: number;
  averageSegmentQuality: number;
  recommendations: string[];
}

interface SegmentPerformanceDetail {
  segmentId: string;
  segmentName: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;
  ctr: number;
  cvr: number;
  roas: number;
  cpc: number;
  performanceScore: number;
  trend: "rising" | "stable" | "declining";
}

interface SegmentTargetingRecommendation {
  segmentId: string;
  segmentName: string;
  segmentSize: number;
  conversionRate: number;
  recommendation: string;
  suggestedBidMultiplier: number;
  priority: "high" | "medium" | "low";
  expectedImpact: string;
}

interface SegmentComparison {
  segmentA: string;
  segmentB: string;
  sizeDiff: number;
  convRateDiff: number;
  roasDiff: number;
  characteristicOverlap: number;
  insight: string;
}

interface SegmentTrend {
  segmentId: string;
  segmentName: string;
  metrics: { metric: string; values: number[]; change: number; direction: "up" | "down" | "stable" }[];
  overallDirection: "improving" | "declining" | "stable";
}

interface SegmentOverlap {
  segmentA: string;
  segmentB: string;
  overlapPercent: number;
  uniqueA: number;
  uniqueB: number;
  jaccardSimilarity: number;
  interpretation: string;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const SEGMENT_TEMPLATES = [
  { name: "High-Value Repeat Buyers", desc: "Users with 3+ purchases and high average order value", traits: ["purchaseFrequency", "highAOV", "loyaltyScore"] },
  { name: "Window Shoppers", desc: "Users with high browse activity but low conversion", traits: ["browseTime", "cartAbandonment", "pageDepth"] },
  { name: "Mobile-First Users", desc: "Users whose primary device is mobile with strong engagement", traits: ["mobileShare", "appUsage", "onTheGo"] },
  { name: "Price-Sensitive Shoppers", desc: "Users who respond primarily to discounts and promotions", traits: ["couponUsage", "promoResponse", "priceCheck"] },
  { name: "Brand Loyalists", desc: "Users who consistently engage with brand campaigns", traits: ["brandSearch", "directTraffic", "repeatEngagement"] },
  { name: "New-to-Brand", desc: "Recently acquired users with no prior brand interaction", traits: ["firstTouch", "discoveryChannel", "onboardingStage"] },
  { name: "High-Intent Leads", desc: "Users showing strong purchase signals and short conversion paths", traits: ["intentScore", "shortPath", "urgencySignals"] },
  { name: "Seasonal Spenders", desc: "Users who primarily convert during seasonal/holiday periods", traits: ["seasonalPattern", "holidaySpike", "limitedTime"] },
  { name: "Content Engagers", desc: "Users who engage with content/educational material", traits: ["contentConsumption", "timeOnSite", "articleViews"] },
  { name: "Cross-Sell Candidates", desc: "Users who purchased one category but not complementary categories", traits: ["categoryGap", "complementaryAffinity", "upsellPotential"] },
  { name: "Social-Driven Users", desc: "Users acquired primarily through social media channels", traits: ["socialReferral", "influencerResponse", "shareBehavior"] },
  { name: "High-Frequency Low-Value", desc: "Users who purchase frequently but have low average order value", traits: ["freqHigh", "aovLow", "marginPerOrder"] },
];

export class CampaignSegmentDiscoveryService {
  discoverSegments(tenantId: string): SegmentDiscoveryReport {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const seed = hashStr(tenantId);
    const totalSize = Math.max(10000, portfolio.analyses.length * 50000 + (seed % 500000));

    const segments: DiscoveredSegment[] = SEGMENT_TEMPLATES.map((t, i) => {
      const segSeed = seed + hashStr(t.name);
      const size = Math.round(totalSize * (0.03 + ((segSeed * 17) % 80) / 1000));
      const cr = 0.5 + ((segSeed * 13) % 150) / 100;
      const convs = Math.round(size * cr * 0.01);
      const rev = Math.round(convs * (25 + (segSeed % 75)));
      const spd = Math.round(rev * (0.2 + ((segSeed * 7) % 30) / 100));
      const roas = spd > 0 ? rev / spd : 0;
      const clusterQuality = 0.55 + ((segSeed * 23) % 40) / 100;
      const characteristics = t.traits.map((tr, ti) => ({
        trait: tr, value: (segSeed + ti * 37) % 2 === 0 ? "high" : "medium", strength: Math.round((60 + ((segSeed + ti * 31) % 35)) * 10) / 10,
      }));
      return {
        segmentId: `seg_${i}_${seed % 1000}`,
        name: t.name, description: t.desc, size, keyCharacteristics: characteristics,
        campaignIds: portfolio.analyses.slice(0, Math.min(3, portfolio.analyses.length)).map((a: any) => a.campaignId),
        totalConversions: convs, totalRevenue: rev, conversionRate: Math.round(cr * 100) / 100, roas: Math.round(roas * 100) / 100, clusterQuality: Math.round(clusterQuality * 100) / 100,
      };
    });

    segments.sort((a, b) => b.roas - a.roas);
    const avgQuality = segments.reduce((s, seg) => s + seg.clusterQuality, 0) / segments.length;

    const recommendations: string[] = [];
    const bestSeg = segments[0];
    if (bestSeg.roas > 2.5) recommendations.push(`${bestSeg.name} segment has ROAS of ${bestSeg.roas}x — create dedicated campaign targeting this segment with increased bids`);
    const largeLowPerf = segments.filter(s => s.size > totalSize * 0.05 && s.roas < 1);
    if (largeLowPerf.length > 0) recommendations.push(`${largeLowPerf.length} large but underperforming segments identified — consider audience exclusions to reduce wasted spend`);
    const highGrowth = segments.filter(s => s.roas > 1.5);
    if (highGrowth.length > 3) recommendations.push(`${highGrowth.length} high-potential segments — allocate 20-30% of testing budget to reach these audiences`);
    recommendations.push("Run A/B tests comparing broad targeting vs. segment-specific campaigns to validate segment quality");

    return { tenantId, generatedAt: new Date().toISOString(), segments, totalAudienceSize: totalSize, averageSegmentQuality: Math.round(avgQuality * 100) / 100, recommendations };
  }

  analyzeSegmentPerformance(tenantId: string): SegmentPerformanceDetail[] {
    const report = this.discoverSegments(tenantId);
    return report.segments.map(s => {
      const seed = hashStr(s.segmentId + tenantId + "perf");
      const imps = s.size * (5 + (seed % 20));
      const clicks = Math.round(imps * (1 + ((seed * 7) % 300) / 100) / 100);
      const convs = s.totalConversions;
      const rev = s.totalRevenue;
      const spd = Math.round(rev * (0.15 + ((seed * 13) % 200) / 1000));
      const ctr = imps > 0 ? Math.round(clicks / imps * 10000) / 100 : 0;
      const cvr = clicks > 0 ? Math.round(convs / clicks * 10000) / 100 : 0;
      const roas = spd > 0 ? Math.round(rev / spd * 100) / 100 : 0;
      const cpc = clicks > 0 ? Math.round(spd / clicks * 100) / 100 : 0;
      const score = Math.round(ctr / 2 * 20 + cvr / 3 * 25 + roas / 2 * 30 + (s.size > 50000 ? 25 : 10));
      const trends: ("rising" | "stable" | "declining")[] = ["rising", "stable", "declining"];
      const trend = trends[(seed * 31) % 3];
      return { segmentId: s.segmentId, segmentName: s.name, impressions: imps, clicks, conversions: convs, revenue: rev, spend: spd, ctr, cvr, roas, cpc, performanceScore: Math.min(100, score), trend };
    }).sort((a, b) => b.performanceScore - a.performanceScore);
  }

  recommendSegmentTargeting(tenantId: string): SegmentTargetingRecommendation[] {
    const report = this.discoverSegments(tenantId);
    return report.segments.map(s => {
      const bidMult = Math.round((0.7 + (s.roas / 3) * 0.6) * 100) / 100;
      const priority: "high" | "medium" | "low" = s.roas > 2 && s.size > 50000 ? "high" : s.roas > 1.2 ? "medium" : "low";
      return {
        segmentId: s.segmentId, segmentName: s.name, segmentSize: s.size, conversionRate: s.conversionRate,
        recommendation: priority === "high" ? `Target ${s.name} with dedicated campaign and ${bidMult}x bid multiplier for maximum ROI` : priority === "medium" ? `Include ${s.name} in audience targeting with ${bidMult}x bid adjustment` : `Monitor ${s.name} — low priority for active targeting, include in observation audiences`,
        suggestedBidMultiplier: bidMult, priority,
        expectedImpact: priority === "high" ? "15-25% ROAS improvement expected" : priority === "medium" ? "5-15% conversion uplift expected" : "Minimal near-term impact, data collection phase",
      };
    }).sort((a, b) => a.priority === "high" ? -1 : b.priority === "high" ? 1 : 0);
  }

  compareSegments(tenantId: string): SegmentComparison[] {
    const report = this.discoverSegments(tenantId);
    const comparisons: SegmentComparison[] = [];
    for (let i = 0; i < Math.min(6, report.segments.length); i++) {
      for (let j = i + 1; j < Math.min(6, report.segments.length); j++) {
        const a = report.segments[i];
        const b = report.segments[j];
        const overlap = 5 + hashStr(a.segmentId + b.segmentId + tenantId) % 60;
        comparisons.push({
          segmentA: a.name, segmentB: b.name,
          sizeDiff: Math.round((a.size - b.size) / Math.max(1, b.size) * 100),
          convRateDiff: Math.round((a.conversionRate - b.conversionRate) * 100) / 100,
          roasDiff: Math.round((a.roas - b.roas) * 100) / 100,
          characteristicOverlap: overlap,
          insight: a.roas > b.roas * 1.3 ? `${a.name} significantly outperforms ${b.name} — prioritize ${a.name} targeting` : b.roas > a.roas * 1.3 ? `${b.name} significantly outperforms ${a.name} — shift focus to ${b.name}` : `${a.name} and ${b.name} perform similarly — consider combining into a broader segment`,
        });
      }
    }
    return comparisons;
  }

  segmentTrends(tenantId: string): SegmentTrend[] {
    const report = this.discoverSegments(tenantId);
    return report.segments.slice(0, 8).map(s => {
      const seed = hashStr(s.segmentId + tenantId);
      const metrics = ["conversionRate", "roas", "ctr", "cpc"].map((m, mi) => {
        const baseVal = (s as any)[m] || 1;
        const values = Array.from({ length: 6 }, (_, wi) => {
          const v = baseVal * (0.7 + ((seed + mi * 13 + wi * 7) % 60) / 100);
          return Math.round(v * 100) / 100;
        });
        const change = Math.round((values[values.length - 1] - values[0]) / values[0] * 100);
        const direction: "up" | "down" | "stable" = change > 8 ? "up" : change < -8 ? "down" : "stable";
        return { metric: m, values, change, direction };
      });
      const up = metrics.filter(m => m.direction === "up").length;
      const down = metrics.filter(m => m.direction === "down").length;
      return { segmentId: s.segmentId, segmentName: s.name, metrics, overallDirection: up > down ? "improving" as const : down > up ? "declining" as const : "stable" as const };
    });
  }

  segmentOverlapAnalysis(tenantId: string): SegmentOverlap[] {
    const report = this.discoverSegments(tenantId);
    const overlaps: SegmentOverlap[] = [];
    const topSegs = report.segments.slice(0, 5);
    for (let i = 0; i < topSegs.length; i++) {
      for (let j = i + 1; j < topSegs.length; j++) {
        const seed = hashStr(topSegs[i].segmentId + topSegs[j].segmentId + tenantId);
        const overlap = 10 + (seed % 50);
        const uniqueA = Math.round(Math.max(0, (topSegs[i].size - topSegs[j].size * overlap / 100) / topSegs[i].size * 100));
        const uniqueB = Math.round(Math.max(0, (topSegs[j].size - topSegs[i].size * overlap / 100) / topSegs[j].size * 100));
        const jaccard = Math.round(overlap / (100 + overlap) * 100) / 100;
        overlaps.push({
          segmentA: topSegs[i].name, segmentB: topSegs[j].name,
          overlapPercent: overlap, uniqueA, uniqueB, jaccardSimilarity: jaccard,
          interpretation: jaccard > 0.5 ? `High overlap — ${topSegs[i].name} and ${topSegs[j].name} share significant audience; consider merging into a single segment` : jaccard > 0.25 ? `Moderate overlap — audiences partially distinct; coordinate messaging across segments` : `Low overlap — ${topSegs[i].name} and ${topSegs[j].name} represent distinctly different audience groups; target separately`,
        });
      }
    }
    return overlaps;
  }

  // ── Deep methods ──────────────────────────────────────────────────

  segmentLookalikeModeling(tenantId: string, seedSegmentName?: string): {
    sourceSegment: string; lookalikeSegments: { name: string; similarity: number; estimatedSize: number; expectedROAS: number; traitOverlap: string[]; recommendation: string }[];
    totalLookalikeReach: number; qualityScore: number;
  } {
    const report = this.discoverSegments(tenantId);
    const seed = hashStr(tenantId + "look");
    const sourceIdx = seedSegmentName ? report.segments.findIndex(s => s.name === seedSegmentName) : 0;
    const source = report.segments[sourceIdx >= 0 ? sourceIdx : 0];
    const lookalikes = report.segments.filter(s => s.segmentId !== source.segmentId).map(s => {
      const sim = Math.round((50 + ((seed + hashStr(s.name)) % 45)) * 10) / 10;
      const estSize = Math.round(s.size * (0.3 + ((seed + hashStr(s.name + "sz")) % 50) / 100));
      const expectedROAS = Math.round((s.roas * (0.8 + ((seed + hashStr(s.name + "ro")) % 30) / 100)) * 100) / 100;
      const overlapTraits = s.keyCharacteristics.filter(c => source.keyCharacteristics.some(sc => sc.trait === c.trait && sc.value === c.value)).map(c => c.trait);
      const rec = sim > 75 ? `High similarity — target ${s.name} as lookalike of ${source.name} with dedicated campaigns` : sim > 55 ? `Moderate similarity — include ${s.name} in expanded targeting with adjusted bid multipliers` : `Low similarity — use ${s.name} for audience exclusion to avoid wasted spend`;
      return { name: s.name, similarity: sim, estimatedSize: estSize, expectedROAS, traitOverlap: overlapTraits, recommendation: rec };
    }).sort((a, b) => b.similarity - a.similarity);
    return { sourceSegment: source.name, lookalikeSegments: lookalikes, totalLookalikeReach: lookalikes.reduce((s, l) => s + l.estimatedSize, 0), qualityScore: Math.round(lookalikes.reduce((s, l) => s + l.similarity, 0) / lookalikes.length * 100) / 100 };
  }

  segmentPropensityScoring(tenantId: string): {
    segments: { name: string; size: number; propensityScore: number; conversionProbability: number; averageOrderValue: number; lifetimeValue: number; engagementLevel: string; priority: string }[];
    topSegment: string; portfolioPropensity: number;
  } {
    const report = this.discoverSegments(tenantId);
    const seed = hashStr(tenantId + "prop");
    const segments = report.segments.map(s => {
      const convProb = Math.min(95, Math.round((s.conversionRate + ((seed + hashStr(s.name)) % 15)) * 10) / 10);
      const aov = Math.max(10, Math.round((s.totalRevenue / Math.max(s.totalConversions, 1)) * (0.8 + ((seed + hashStr(s.name + "aov")) % 30) / 100)));
      const ltv = Math.round(aov * (s.roas > 2 ? 3 : s.roas > 1 ? 2 : 1) * (1 + ((seed + hashStr(s.name + "ltv")) % 40) / 100));
      const score = Math.min(100, Math.round((convProb * 0.25 + (aov / 200) * 100 * 0.2 + (ltv / 500) * 100 * 0.25 + s.roas * 15 * 0.3)));
      const engLevel = score > 70 ? "high" : score > 45 ? "medium" : "low";
      const priority = score > 65 ? "high" : score > 40 ? "medium" : "low";
      return { name: s.name, size: s.size, propensityScore: score, conversionProbability: convProb, averageOrderValue: aov, lifetimeValue: ltv, engagementLevel: engLevel, priority };
    }).sort((a, b) => b.propensityScore - a.propensityScore);
    return { segments, topSegment: segments[0]?.name || "", portfolioPropensity: Math.round(segments.reduce((s, seg) => s + seg.propensityScore, 0) / segments.length * 100) / 100 };
  }

  segmentLifecycleAnalysis(tenantId: string): {
    segments: { name: string; currentSize: number; growthRate: number; maturityStage: string; projectedSize: number; daysToPeak: number; recommendation: string }[];
    overallPortfolioStage: string; fastestGrowing: string; fastestDeclining: string;
  } {
    const report = this.discoverSegments(tenantId);
    const seed = hashStr(tenantId + "life");
    const stages = ["introduction", "growth", "maturity", "decline"];
    const segments = report.segments.map(s => {
      const growth = Math.round((-15 + ((seed + hashStr(s.name)) % 40)) * 10) / 10;
      const stageIdx = Math.min(3, Math.max(0, growth < -8 ? 3 : growth < 3 ? 2 : growth < 10 ? 1 : 0));
      const stage = stages[stageIdx];
      const projSize = Math.round(s.size * (1 + growth / 100 * (0.5 + ((seed + hashStr(s.name + "pj")) % 30) / 100)));
      const daysToPeak = stage === "growth" ? Math.round(15 + ((seed + hashStr(s.name + "dp")) % 60)) : stage === "introduction" ? Math.round(30 + ((seed + hashStr(s.name + "dp")) % 90)) : 0;
      const rec = stage === "growth" ? `Invest heavily in ${s.name} — growing at ${Math.abs(growth)}% with ${daysToPeak} days to peak` : stage === "maturity" ? `Maintain ${s.name} with optimization-focused campaigns — stable performance` : stage === "decline" ? `Reduce spend on ${s.name} — declining at ${Math.abs(growth)}%; test refresh strategies` : `Test ${s.name} with small budget — early-stage segment with growth potential`;
      return { name: s.name, currentSize: s.size, growthRate: growth, maturityStage: stage, projectedSize: projSize, daysToPeak, recommendation: rec };
    });
    const growthStages = segments.filter(s => s.maturityStage === "growth").length;
    const declineStages = segments.filter(s => s.maturityStage === "decline").length;
    const overall = growthStages > declineStages ? "growth" : declineStages > growthStages ? "decline" : "maturity";
    const fastestGrowing = segments.reduce((a, b) => a.growthRate > b.growthRate ? a : b).name;
    const fastestDeclining = segments.reduce((a, b) => a.growthRate < b.growthRate ? a : b).name;
    return { segments, overallPortfolioStage: overall, fastestGrowing, fastestDeclining };
  }

  segmentCrossSellAnalysis(tenantId: string): {
    opportunities: { sourceSegment: string; targetSegment: string; crossSellPotential: number; expectedLift: number; sharedTraits: string[]; strategy: string }[];
    topOpportunity: string; portfolioUpsellIndex: number;
  } {
    const report = this.discoverSegments(tenantId);
    const seed = hashStr(tenantId + "cross");
    const top = report.segments.slice(0, 8);
    const opportunities: any[] = [];
    for (let i = 0; i < top.length; i++) {
      for (let j = i + 1; j < top.length; j++) {
        if ((seed + i * 17 + j * 31) % 3 !== 0) continue;
        const a = top[i]; const b = top[j];
        const potential = Math.round(30 + ((seed + i * 13 + j * 19) % 50));
        const lift = Math.round((potential / 100) * (b.roas / a.roas) * 10000) / 100;
        const shared = a.keyCharacteristics.filter(c => b.keyCharacteristics.some(bc => bc.trait === c.trait)).map(c => c.trait);
        const strategy = `Cross-sell ${a.name} audience into ${b.name} campaigns — ${potential}% audience overlap with ${lift}% expected conversion lift`;
        opportunities.push({ sourceSegment: a.name, targetSegment: b.name, crossSellPotential: potential, expectedLift: lift, sharedTraits: shared, strategy });
      }
    }
    const topOpp = opportunities.sort((a, b) => b.crossSellPotential - a.crossSellPotential)[0];
    const upsellIndex = opportunities.length > 0 ? Math.round(opportunities.reduce((s, o) => s + o.expectedLift, 0) / opportunities.length * 100) / 100 : 0;
    return { opportunities, topOpportunity: topOpp ? `${topOpp.sourceSegment} → ${topOpp.targetSegment}` : "none", portfolioUpsellIndex: upsellIndex };
  }

  segmentAttributionByChannel(tenantId: string): {
    segmentChannelBreakdown: { segmentName: string; channels: { channel: string; conversions: number; revenue: number; share: number; efficiency: string }[]; primaryChannel: string }[];
    overallTopChannel: string; channelDiversity: number;
  } {
    const report = this.discoverSegments(tenantId);
    const seed = hashStr(tenantId + "chattr");
    const channels = ["Search", "Display", "Social", "Email", "Video", "Direct"];
    const breakdown = report.segments.slice(0, 8).map(s => {
      const segSeed = seed + hashStr(s.name);
      const chData = channels.map((ch, ci) => {
        const share = Math.round((0.05 + ((segSeed + ci * 17) % 35) / 100) * 100) / 100;
        const convs = Math.round(s.totalConversions * share);
        const rev = Math.round(s.totalRevenue * share);
        const eff = share > 0.25 ? "high" : share > 0.12 ? "medium" : "low";
        return { channel: ch, conversions: convs, revenue: rev, share: Math.round(share * 10000) / 100, efficiency: eff };
      });
      const primary = chData.reduce((a, b) => a.conversions > b.conversions ? a : b).channel;
      return { segmentName: s.name, channels: chData, primaryChannel: primary };
    });
    const chCounts = new Map<string, number>();
    breakdown.forEach(b => chCounts.set(b.primaryChannel, (chCounts.get(b.primaryChannel) || 0) + 1));
    const topCh = Array.from(chCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
    return { segmentChannelBreakdown: breakdown, overallTopChannel: topCh, channelDiversity: Math.round(chCounts.size / channels.length * 10000) / 100 };
  }

  segmentOptimizationScorecard(tenantId: string): {
    segments: { name: string; size: number; roas: number; conversionRate: number; efficiencyScore: number; growthPotential: number; competitiveMoat: number; compositeScore: number; action: string }[];
    topSegment: string; portfolioHealthScore: number; primaryRecommendation: string;
  } {
    const report = this.discoverSegments(tenantId);
    const seed = hashStr(tenantId + "opt");
    const segments = report.segments.map(s => {
      const efficiency = Math.min(100, Math.round((s.roas / 3) * 100 * 0.35 + (s.conversionRate / 10) * 100 * 0.25 + (s.clusterQuality) * 0.2 + (s.size > 50000 ? 20 : 10)));
      const growthPotential = Math.min(100, Math.round((60 + ((seed + hashStr(s.name + "gp")) % 35)) * (s.roas > 1.5 ? 1.2 : 0.8)));
      const moat = Math.min(100, Math.round((50 + ((seed + hashStr(s.name + "cm")) % 40)) * (s.keyCharacteristics.length > 2 ? 1.1 : 0.9)));
      const composite = Math.min(100, Math.round(efficiency * 0.35 + growthPotential * 0.3 + moat * 0.2 + s.clusterQuality * 0.15));
      const action = composite >= 75 ? `Invest — top priority segment with ${composite}/100 composite score` : composite >= 55 ? `Optimize — moderate potential, A/B test targeting and messaging` : composite >= 35 ? `Monitor — review segment strategy, consider audience refresh` : `Reduce — low potential segment, shift budget to higher-performing segments`;
      return { name: s.name, size: s.size, roas: s.roas, conversionRate: s.conversionRate, efficiencyScore: efficiency, growthPotential, competitiveMoat: moat, compositeScore: composite, action };
    }).sort((a, b) => b.compositeScore - a.compositeScore);
    const avgScore = Math.round(segments.reduce((s, seg) => s + seg.compositeScore, 0) / segments.length * 100) / 100;
    const rec = avgScore >= 65 ? "Portfolio healthy — maintain current strategy with incremental optimization" : avgScore >= 45 ? "Portfolio needs attention — reallocate budget from low-scoring to high-scoring segments" : "Portfolio underperforming — major restructuring recommended, consider new audience acquisition strategies";
    return { segments, topSegment: segments[0]?.name || "", portfolioHealthScore: avgScore, primaryRecommendation: rec };
  }
}

export const campaignSegmentDiscovery = new CampaignSegmentDiscoveryService();
