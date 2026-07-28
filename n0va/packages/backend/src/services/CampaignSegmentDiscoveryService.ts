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
        trait: tr, value: Math.random() > 0.5 ? "high" : "medium", strength: Math.round((60 + ((segSeed + ti * 31) % 35)) * 10) / 10,
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
      const imps = s.size * (5 + Math.floor(Math.random() * 20));
      const clicks = Math.round(imps * (1 + Math.random() * 3) / 100);
      const convs = s.totalConversions;
      const rev = s.totalRevenue;
      const spd = Math.round(rev * (0.15 + Math.random() * 0.2));
      const ctr = imps > 0 ? Math.round(clicks / imps * 10000) / 100 : 0;
      const cvr = clicks > 0 ? Math.round(convs / clicks * 10000) / 100 : 0;
      const roas = spd > 0 ? Math.round(rev / spd * 100) / 100 : 0;
      const cpc = clicks > 0 ? Math.round(spd / clicks * 100) / 100 : 0;
      const score = Math.round(ctr / 2 * 20 + cvr / 3 * 25 + roas / 2 * 30 + (s.size > 50000 ? 25 : 10));
      const trends: ("rising" | "stable" | "declining")[] = ["rising", "stable", "declining"];
      const trend = trends[Math.floor(Math.random() * 3)];
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
}

export const campaignSegmentDiscovery = new CampaignSegmentDiscoveryService();
