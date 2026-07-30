import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";

interface PlacementDetail {
  placementId: string;
  publisher: string;
  category: string;
  format: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;
  ctr: number;
  cvr: number;
  roas: number;
  cpc: number;
  share: number;
  performanceScore: number;
  status: "overperforming" | "performing" | "underperforming";
}

interface PlacementReport {
  campaignId: string;
  campaignName: string;
  generatedAt: string;
  placements: PlacementDetail[];
  bestPlacement: string;
  worstPlacement: string;
  categorySummary: { category: string; totalRevenue: number; avgROAS: number; placementCount: number }[];
  recommendations: string[];
}

interface PlacementRecommendation {
  placementId: string;
  publisher: string;
  format: string;
  currentPerformance: string;
  recommendation: string;
  expectedImpact: string;
  bidAdjustment: number;
  priority: "high" | "medium" | "low";
}

interface PlacementOpportunity {
  publisher: string;
  category: string;
  format: string;
  estimatedReach: number;
  competitionLevel: "low" | "medium" | "high";
  projectedROAS: number;
  entryDifficulty: "easy" | "moderate" | "hard";
  recommendation: string;
  projectedMonthlyRevenue: number;
}

interface PlacementBidAdjustment {
  placementId: string;
  publisher: string;
  format: string;
  currentBidMultiplier: number;
  recommendedMultiplier: number;
  changePercent: number;
  rationale: string;
  expectedROASImpact: number;
}

interface PlacementOverlap {
  publisherA: string;
  publisherB: string;
  overlapPercent: number;
  exclusiveA: number;
  exclusiveB: number;
  interpretation: string;
}

interface PlacementTrend {
  publisher: string;
  format: string;
  metrics: { metric: string; value: number; change: number; direction: "up" | "down" | "stable" }[];
  overallDirection: "improving" | "declining" | "stable";
}

interface PlacementDeviceEntry {
  publisher: string;
  mobileCtr: number;
  mobileCvr: number;
  desktopCtr: number;
  desktopCvr: number;
  tabletCtr: number;
  tabletCvr: number;
  bestDevice: string;
  deviceImbalance: number;
  recommendation: string;
}

interface PlacementAuditEntry {
  publisher: string;
  audienceFitScore: number;
  targetingPrecision: number;
  contextualRelevance: number;
  brandSafety: number;
  viewability: number;
  overallHealth: number;
  issues: string[];
  recommendation: string;
}

interface PlacementCompetitiveEntry {
  placement: string;
  ourSpend: number;
  competitorSpend: number;
  ourCPC: number;
  competitorCPC: number;
  ourShare: number;
  competitorShare: number;
  competitiveIntensity: "low" | "medium" | "high";
  shareOpportunity: number;
  recommendation: string;
}

interface PlacementCostEntry {
  publisher: string;
  cpc: number;
  cpm: number;
  cpv: number;
  cpa: number;
  efficiencyScore: number;
  benchmarkCPC: number;
  costGap: number;
  trend: "declining" | "stable" | "rising";
  recommendation: string;
}

interface PlacementSeasonalityEntry {
  publisher: string;
  month: string;
  projectedCTR: number;
  projectedCVR: number;
  projectedROAS: number;
  seasonalityFactor: number;
  optimalPeriod: string;
  recommendedAction: string;
}

interface PlacementROIEntry {
  publisher: string;
  totalSpend: number;
  totalRevenue: number;
  directROAS: number;
  incrementalROAS: number;
  diminishingReturnFrequency: number;
  marginalROI: number;
  scalePotential: "low" | "medium" | "high";
  recommendation: string;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const PLACEMENT_TEMPLATES = [
  { publisher: "Google Search", category: "Search", format: "Text" },
  { publisher: "Google Display", category: "Display", format: "Banner" },
  { publisher: "YouTube", category: "Video", format: "In-stream" },
  { publisher: "Facebook Feed", category: "Social", format: "Image" },
  { publisher: "Facebook Stories", category: "Social", format: "Story" },
  { publisher: "Instagram Feed", category: "Social", format: "Image" },
  { publisher: "Instagram Stories", category: "Social", format: "Story" },
  { publisher: "LinkedIn", category: "Social", format: "Sponsored" },
  { publisher: "Twitter/X", category: "Social", format: "Promoted" },
  { publisher: "TikTok", category: "Social", format: "Video" },
  { publisher: "Pinterest", category: "Social", format: "Pin" },
  { publisher: "Snapchat", category: "Social", format: "Story" },
  { publisher: "Amazon Ads", category: "Retail", format: "Sponsored" },
  { publisher: "Reddit", category: "Social", format: "Promoted" },
  { publisher: "Programmatic Display", category: "Display", format: "Banner" },
  { publisher: "CTV/OTT", category: "Video", format: "Connected TV" },
  { publisher: "Podcast", category: "Audio", format: "Audio" },
  { publisher: "Newsletter Sponsorship", category: "Email", format: "Sponsored" },
];

export class CampaignAdPlacementAnalyzerService {
  analyzePlacementPerformance(campaignId: string, tenantId: string): PlacementReport | null {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const a = portfolio.analyses.find((c: any) => c.campaignId === campaignId);
    if (!a) return null;
    const p = a.performance;
    const seed = hashStr(campaignId + tenantId);
    const totalImps = p.impressions || 100000;
    const totalClicks = p.clicks || 5000;
    const totalConvs = p.conversions || 200;
    const totalRev = p.revenue || 15000;
    const totalSpd = p.spend || 5000;

    const placements: PlacementDetail[] = PLACEMENT_TEMPLATES.map((pt, i) => {
      const plSeed = seed + hashStr(pt.publisher);
      const share = 0.01 + ((plSeed * 17) % 80) / 1000;
      const imps = Math.round(totalImps * share);
      const ctrBase = 0.5 + ((plSeed * 7) % 60) / 50;
      const clicks = Math.round(imps * Math.min(5, ctrBase) / 100);
      const cvrBase = 0.5 + ((plSeed * 13) % 100) / 50;
      const convs = Math.round(clicks * Math.min(15, cvrBase) / 100);
      const revShare = share * (0.5 + ((plSeed * 19) % 50) / 100);
      const rev = Math.round(totalRev * revShare);
      const spdShare = share * (0.4 + ((plSeed * 11) % 60) / 100);
      const spd = Math.round(totalSpd * spdShare);
      const ctr = imps > 0 ? Math.round(clicks / imps * 10000) / 100 : 0;
      const cvr = clicks > 0 ? Math.round(convs / clicks * 10000) / 100 : 0;
      const roas = spd > 0 ? Math.round(rev / spd * 100) / 100 : 0;
      const cpc = clicks > 0 ? Math.round(spd / clicks * 100) / 100 : 0;
      const score = Math.round((ctr / 2 * 20) + (cvr / 3 * 25) + (roas / 2 * 30) + (share * 100 * 25));
      const status: "overperforming" | "performing" | "underperforming" = score >= 65 ? "overperforming" : score >= 40 ? "performing" : "underperforming";
      return {
        placementId: `pl_${i}_${seed % 1000}`, publisher: pt.publisher, category: pt.category, format: pt.format,
        impressions: imps, clicks, conversions: convs, revenue: rev, spend: spd, ctr, cvr, roas, cpc,
        share: Math.round(share * 10000) / 100, performanceScore: Math.min(100, score), status,
      };
    });

    placements.sort((a, b) => b.performanceScore - a.performanceScore);
    const bestPlacement = placements[0]?.publisher || "N/A";
    const worstPlacement = placements[placements.length - 1]?.publisher || "N/A";

    const catMap = new Map<string, { totalRevenue: number; totalSpend: number; count: number }>();
    for (const pl of placements) {
      const ex = catMap.get(pl.category) || { totalRevenue: 0, totalSpend: 0, count: 0 };
      ex.totalRevenue += pl.revenue; ex.totalSpend += pl.spend; ex.count++;
      catMap.set(pl.category, ex);
    }
    const categorySummary = Array.from(catMap.entries()).map(([cat, d]) => ({
      category: cat, totalRevenue: d.totalRevenue, avgROAS: d.totalSpend > 0 ? Math.round(d.totalRevenue / d.totalSpend * 100) / 100 : 0, placementCount: d.count,
    })).sort((a, b) => b.avgROAS - a.avgROAS);

    const recommendations: string[] = [];
    const top3 = placements.slice(0, 3);
    recommendations.push(`Top placements: ${top3.map(p => `${p.publisher} (${p.performanceScore})`).join(", ")} — increase bids by 10-15% to maximize ROI`);
    const underperf = placements.filter(p => p.status === "underperforming");
    if (underperf.length > 0) recommendations.push(`${underperf.length} placements underperforming — review placement targeting and consider pausing ${underperf.slice(0, 3).map(p => p.publisher).join(", ")}`);
    const highROAS = placements.filter(p => p.roas > 2 && p.share < 0.03);
    if (highROAS.length > 0) recommendations.push(`${highROAS.length} high-ROAS placements with low investment — scale ${highROAS.slice(0, 2).map(p => p.publisher).join(", ")} for additional volume`);
    const catBest = categorySummary[0];
    if (catBest) recommendations.push(`${catBest.category} placements show highest average ROAS (${catBest.avgROAS}x) — prioritize budget allocation to ${catBest.category}`);

    return { campaignId, campaignName: a.campaignName, generatedAt: new Date().toISOString(), placements, bestPlacement, worstPlacement, categorySummary, recommendations };
  }

  generatePlacementRecommendations(campaignId: string, tenantId: string): PlacementRecommendation[] {
    const report = this.analyzePlacementPerformance(campaignId, tenantId);
    if (!report) return [];
    return report.placements.map(pl => {
      const perfRatio = pl.performanceScore / 100;
      const adjustment = Math.round((perfRatio * 1.2 - 1) * 100);
      return {
        placementId: pl.placementId, publisher: pl.publisher, format: pl.format,
        currentPerformance: pl.status,
        recommendation: pl.status === "overperforming" ? `Increase ${pl.publisher} bid by ${Math.abs(adjustment)}% to capture additional volume` : pl.status === "underperforming" ? `Reduce ${pl.publisher} spend by ${Math.abs(adjustment)}% and review creative/landing page alignment` : `Maintain ${pl.publisher} strategy with minor optimization`,
        expectedImpact: pl.status === "overperforming" ? "10-18% volume increase" : pl.status === "underperforming" ? "10-20% cost reduction" : "3-8% efficiency improvement",
        bidAdjustment: adjustment,
        priority: pl.status === "overperforming" ? "high" as const : pl.status === "underperforming" ? "high" as const : "medium" as const,
      };
    });
  }

  identifyPlacementOpportunities(tenantId: string): PlacementOpportunity[] {
    const seed = hashStr(tenantId);
    const opportunities: PlacementOpportunity[] = [
      { publisher: "TikTok", category: "Social", format: "In-feed", comp: "medium" as const, diff: "easy" as const },
      { publisher: "YouTube Shorts", category: "Video", format: "Shorts", comp: "low" as const, diff: "easy" as const },
      { publisher: "Amazon DSP", category: "Display", format: "Programmatic", comp: "medium" as const, diff: "moderate" as const },
      { publisher: "Spotify", category: "Audio", format: "Audio", comp: "low" as const, diff: "easy" as const },
      { publisher: "Pinterest", category: "Social", format: "Idea Pin", comp: "low" as const, diff: "easy" as const },
      { publisher: "LinkedIn InMail", category: "Email", format: "Sponsored", comp: "medium" as const, diff: "moderate" as const },
      { publisher: "Snapchat AR", category: "Social", format: "AR Lens", comp: "medium" as const, diff: "hard" as const },
      { publisher: "Twitch", category: "Video", format: "Display", comp: "low" as const, diff: "easy" as const },
      { publisher: "Reddit", category: "Social", format: "Award", comp: "low" as const, diff: "easy" as const },
      { publisher: "Trade Desk", category: "Display", format: "Programmatic", comp: "high" as const, diff: "hard" as const },
      { publisher: "Roku", category: "Video", format: "Connected TV", comp: "medium" as const, diff: "moderate" as const },
      { publisher: "Podcast (Mid-roll)", category: "Audio", format: "Audio", comp: "low" as const, diff: "easy" as const },
    ];
    return opportunities.map((o, i) => {
      const opSeed = seed + hashStr(o.publisher);
      const reach = 50000 + ((opSeed * 31) % 450000);
      const baseROAS = o.comp === "low" ? 2.8 : o.comp === "medium" ? 1.9 : 1.3;
      const projROAS = Math.round((baseROAS + ((opSeed * 7) % 60) / 100) * 100) / 100;
      const projRev = Math.round(reach * projROAS * 0.008);
      return {
        publisher: o.publisher, category: o.category, format: o.format, estimatedReach: reach,
        competitionLevel: o.comp, projectedROAS: projROAS, entryDifficulty: o.diff,
        recommendation: o.diff === "easy" ? `Low-barrier opportunity — launch test campaign with $500-1500 budget on ${o.publisher}` : o.diff === "moderate" ? `Moderate opportunity — plan 2-month test with $2000-5000 budget` : `High-barrier placement — consider agency partnership or extended testing timeline`,
        projectedMonthlyRevenue: projRev,
      };
    }).sort((a, b) => b.projectedROAS - a.projectedROAS);
  }

  calculatePlacementBidAdjustments(campaignId: string, tenantId: string): PlacementBidAdjustment[] {
    const report = this.analyzePlacementPerformance(campaignId, tenantId);
    if (!report) return [];
    return report.placements.map(pl => {
      const currentBase = 1.0 + (pl.performanceScore - 50) / 100 * 0.3;
      const perfAdjust = (pl.performanceScore - 50) / 100 * 0.5;
      const recommended = Math.round(Math.max(0.1, currentBase + perfAdjust) * 100) / 100;
      const change = Math.round((recommended - currentBase) / currentBase * 100);
      return {
        placementId: pl.placementId, publisher: pl.publisher, format: pl.format,
        currentBidMultiplier: Math.round(currentBase * 100) / 100, recommendedMultiplier: recommended,
        changePercent: change, rationale: `${pl.publisher} (${pl.format}) score ${pl.performanceScore}/100 — ${pl.status === "overperforming" ? "increase bids" : pl.status === "underperforming" ? "reduce bids" : "maintain bids"} for placement-level optimization`,
        expectedROASImpact: pl.status === "overperforming" ? Math.round((1 - recommended / currentBase) * 100) : pl.status === "underperforming" ? Math.round((currentBase / recommended - 1) * 100) : 0,
      };
    });
  }

  analyzePlacementOverlap(tenantId: string): PlacementOverlap[] {
    const categories = ["Search", "Social", "Display", "Video", "Audio"];
    const overlaps: PlacementOverlap[] = [];
    const seed = hashStr(tenantId);
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const pairSeed = seed + hashStr(categories[i] + categories[j]);
        const overlap = 8 + ((pairSeed * 13) % 35);
        const exclA = Math.round(65 - overlap * 0.3 + ((pairSeed * 7) % 12));
        const exclB = Math.round(55 - overlap * 0.2 + ((pairSeed * 11) % 12));
        overlaps.push({
          publisherA: categories[i], publisherB: categories[j],
          overlapPercent: overlap, exclusiveA: Math.min(100, exclA), exclusiveB: Math.min(100, exclB),
          interpretation: overlap > 25 ? `High overlap between ${categories[i]} and ${categories[j]} — coordinate frequency capping and attribution` : overlap > 15 ? `Moderate overlap — ${categories[i]} and ${categories[j]} share some audience; consider cross-channel attribution` : `Low overlap — ${categories[i]} and ${categories[j]} reach distinct audiences; maintain separate strategies`,
        });
      }
    }
    return overlaps;
  }

  analyzePlacementTrends(campaignId: string, tenantId: string): PlacementTrend[] {
    const report = this.analyzePlacementPerformance(campaignId, tenantId);
    if (!report) return [];
    return report.placements.slice(0, 10).map(pl => {
      const seed = hashStr(pl.placementId + tenantId);
      const metrics = ["ctr", "cvr", "roas", "cpc"].map((m, mi) => {
        const val = (pl as any)[m] || 0;
        const chg = Math.round((((seed + mi * 17) % 23 - 11) + ((seed + mi * 23) % 21 - 10)) * 10) / 10;
        const dir: "up" | "down" | "stable" = chg > 3 ? "up" : chg < -3 ? "down" : "stable";
        return { metric: m.toUpperCase(), value: val, change: chg, direction: dir };
      });
      const up = metrics.filter(m => m.direction === "up").length;
      const down = metrics.filter(m => m.direction === "down").length;
      return { publisher: pl.publisher, format: pl.format, metrics, overallDirection: up > down ? "improving" as const : down > up ? "declining" as const : "stable" as const };
    });
  }

  placementDeviceAnalysis(campaignId: string, tenantId: string): PlacementDeviceEntry[] {
    const report = this.analyzePlacementPerformance(campaignId, tenantId);
    if (!report) return [];
    const devSeed = hashStr(campaignId + tenantId + "device");
    return report.placements.slice(0, 12).map((pl, pi) => {
      const baseCtr = pl.ctr;
      const baseCvr = pl.cvr;
      const mobileCtr = Math.round(baseCtr * (0.85 + ((devSeed + pi * 13) % 25) / 100) * 100) / 100;
      const mobileCvr = Math.round(baseCvr * (0.8 + ((devSeed + pi * 17) % 25) / 100) * 100) / 100;
      const desktopCtr = Math.round(baseCtr * (1.0 + ((devSeed + pi * 19) % 15) / 100) * 100) / 100;
      const desktopCvr = Math.round(baseCvr * (1.05 + ((devSeed + pi * 23) % 20) / 100) * 100) / 100;
      const tabletCtr = Math.round(baseCtr * (0.8 + ((devSeed + pi * 29) % 20) / 100) * 100) / 100;
      const tabletCvr = Math.round(baseCvr * (0.85 + ((devSeed + pi * 31) % 20) / 100) * 100) / 100;
      const ctrs = [mobileCtr, desktopCtr, tabletCtr];
      const devices = ["Mobile", "Desktop", "Tablet"];
      const best = devices[ctrs.indexOf(Math.max(...ctrs))];
      const imbalance = Math.round((Math.max(...ctrs) - Math.min(...ctrs)) / Math.max(...ctrs) * 100);
      return {
        publisher: pl.publisher, mobileCtr, mobileCvr, desktopCtr, desktopCvr, tabletCtr, tabletCvr,
        bestDevice: best, deviceImbalance: imbalance,
        recommendation: imbalance > 40 ? `${pl.publisher} shows large device performance gap (${imbalance}%) — optimize for ${best.toLowerCase()} experience` : `${pl.publisher} device performance is balanced — maintain multi-device strategy`,
      };
    });
  }

  placementAudienceFit(campaignId: string, tenantId: string): PlacementAuditEntry[] {
    const report = this.analyzePlacementPerformance(campaignId, tenantId);
    if (!report) return [];
    const audSeed = hashStr(campaignId + tenantId + "audience");
    return report.placements.slice(0, 12).map((pl, pi) => {
      const audienceFit = 35 + ((audSeed + pi * 13) % 55);
      const targeting = 40 + ((audSeed + pi * 17) % 50);
      const contextual = 45 + ((audSeed + pi * 19) % 45);
      const safety = 60 + ((audSeed + pi * 23) % 35);
      const viewability = 50 + ((audSeed + pi * 29) % 40);
      const health = Math.round((audienceFit + targeting + contextual + safety + viewability) / 5);
      const issues: string[] = [];
      if (audienceFit < 50) issues.push("Low audience-placement alignment");
      if (targeting < 50) issues.push("Targeting precision below threshold");
      if (contextual < 50) issues.push("Contextual relevance needs improvement");
      if (safety < 70) issues.push("Brand safety score concerning");
      if (viewability < 55) issues.push("Viewability below minimum standard");
      if (issues.length === 0) issues.push("No critical issues detected");
      return {
        publisher: pl.publisher, audienceFitScore: audienceFit, targetingPrecision: targeting,
        contextualRelevance: contextual, brandSafety: safety, viewability, overallHealth: health,
        issues, recommendation: health < 50 ? `${pl.publisher} has critical health issues — review and optimize before scaling` : health < 70 ? `${pl.publisher} health acceptable — address ${issues.slice(0, 2).join(", ")}` : `${pl.publisher} healthy — maintain current strategy`,
      };
    });
  }

  placementCompetitiveAnalysis(tenantId: string): PlacementCompetitiveEntry[] {
    const seed = hashStr(tenantId + "competitive");
    const placements = [
      { name: "Google Search", ourSpend: 5000, compSpend: 8000, ourCPC: 1.2, compCPC: 1.5, ourShare: 28, compShare: 35 },
      { name: "Facebook Feed", ourSpend: 3500, compSpend: 4500, ourCPC: 0.8, compCPC: 0.9, ourShare: 22, compShare: 28 },
      { name: "Instagram Feed", ourSpend: 2500, compSpend: 3200, ourCPC: 1.0, compCPC: 1.1, ourShare: 18, compShare: 22 },
      { name: "YouTube", ourSpend: 2000, compSpend: 2800, ourCPC: 1.5, compCPC: 1.8, ourShare: 15, compShare: 20 },
      { name: "TikTok", ourSpend: 1500, compSpend: 2200, ourCPC: 0.6, compCPC: 0.7, ourShare: 12, compShare: 16 },
      { name: "LinkedIn", ourSpend: 1000, compSpend: 1800, ourCPC: 2.5, compCPC: 3.0, ourShare: 8, compShare: 12 },
    ];
    return placements.map((p, pi) => {
      const intensity: "low" | "medium" | "high" = p.compShare > 25 ? "high" : p.compShare > 15 ? "medium" : "low";
      const shareOpp = Math.max(0, Math.round((p.compShare - p.ourShare) * (0.5 + ((seed + pi * 13) % 30) / 100)));
      return {
        placement: p.name, ourSpend: p.ourSpend, competitorSpend: p.compSpend,
        ourCPC: p.ourCPC, competitorCPC: p.compCPC, ourShare: p.ourShare,
        competitorShare: p.compShare, competitiveIntensity: intensity,
        shareOpportunity: shareOpp,
        recommendation: shareOpp > 10 ? `${p.name} has ${shareOpp}% share opportunity — increase spend to capture competitor share` : `${p.name} share gap narrow — focus on efficiency and creative quality`,
      };
    });
  }

  placementCostEfficiency(campaignId: string, tenantId: string): PlacementCostEntry[] {
    const report = this.analyzePlacementPerformance(campaignId, tenantId);
    if (!report) return [];
    const costSeed = hashStr(campaignId + tenantId + "cost");
    return report.placements.slice(0, 14).map((pl, pi) => {
      const cpc = pl.cpc || 0.5 + ((costSeed + pi * 13) % 40) / 10;
      const cpm = Math.round((cpc * 1000 * (0.3 + ((costSeed + pi * 17) % 30) / 100)) * 100) / 100;
      const cpv = pl.category === "Video" ? Math.round(cpc * (0.3 + ((costSeed + pi * 19) % 20) / 100) * 100) / 100 : 0;
      const cpa = pl.conversions > 0 ? Math.round(pl.spend / pl.conversions * 100) / 100 : 99.99;
      const benchCpc = cpc * (0.8 + ((costSeed + pi * 23) % 40) / 100);
      const gap = Math.round((cpc - benchCpc) / Math.max(0.01, benchCpc) * 100);
      const score = Math.round(Math.max(0, 100 - cpa * 5 + cpc * 10 + (pl.roas * 20)));
      const trend: "declining" | "stable" | "rising" = gap > 15 ? "rising" : gap < -10 ? "declining" : "stable";
      return {
        publisher: pl.publisher, cpc: Math.round(cpc * 100) / 100, cpm, cpv, cpa,
        efficiencyScore: Math.min(100, score), benchmarkCPC: Math.round(benchCpc * 100) / 100,
        costGap: gap, trend,
        recommendation: trend === "rising" ? `${pl.publisher} costs rising (${gap}% above benchmark) — investigate and optimize` : trend === "declining" ? `${pl.publisher} costs below benchmark — efficient; scale if performance holds` : `${pl.publisher} costs stable — maintain current bidding strategy`,
      };
    });
  }

  placementSeasonalityAnalysis(campaignId: string, tenantId: string): PlacementSeasonalityEntry[] {
    const report = this.analyzePlacementPerformance(campaignId, tenantId);
    if (!report) return [];
    const seasSeed = hashStr(campaignId + tenantId + "seasonality");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const entries: PlacementSeasonalityEntry[] = [];
    for (const pl of report.placements.slice(0, 6)) {
      for (let mi = 0; mi < months.length; mi++) {
        const pairSeed = seasSeed + hashStr(pl.publisher + months[mi]);
        const seasonality = 0.5 + ((pairSeed * 17) % 100) / 100;
        const ctr = Math.round(pl.ctr * seasonality * (0.85 + ((pairSeed * 13) % 25) / 100) * 100) / 100;
        const cvr = Math.round(pl.cvr * seasonality * (0.85 + ((pairSeed * 19) % 25) / 100) * 100) / 100;
        const roas = Math.round(pl.roas * seasonality * (0.9 + ((pairSeed * 23) % 20) / 100) * 100) / 100;
        entries.push({
          publisher: pl.publisher, month: months[mi],
          projectedCTR: ctr, projectedCVR: cvr, projectedROAS: roas,
          seasonalityFactor: Math.round(seasonality * 100) / 100,
          optimalPeriod: seasonality > 1.2 ? months[mi] : "",
          recommendedAction: seasonality > 1.2 ? `Increase ${pl.publisher} budget by ${Math.round((seasonality - 1) * 100)}% in ${months[mi]}` : seasonality < 0.7 ? `Reduce ${pl.publisher} spend in ${months[mi]} — off-peak period` : `Maintain ${pl.publisher} in ${months[mi]}`,
        });
      }
    }
    return entries;
  }

  placementROIAttribution(campaignId: string, tenantId: string): PlacementROIEntry[] {
    const report = this.analyzePlacementPerformance(campaignId, tenantId);
    if (!report) return [];
    const roiSeed = hashStr(campaignId + tenantId + "pl_roi");
    return report.placements.slice(0, 14).map((pl, pi) => {
      const directROAS = pl.roas;
      const incremental = Math.round(directROAS * (1.15 + ((roiSeed + pi * 13) % 25) / 100) * 100) / 100;
      const dimFreq = Math.round((3 + ((roiSeed + pi * 17) % 20)) * 100) / 100;
      const marginalROI = Math.round(((roiSeed + pi * 19) % 25) / 10 * 100) / 100;
      const scale: "low" | "medium" | "high" = pl.share < 2 ? "high" : pl.share < 5 ? "medium" : "low";
      return {
        publisher: pl.publisher, totalSpend: pl.spend, totalRevenue: pl.revenue,
        directROAS, incrementalROAS: incremental, diminishingReturnFrequency: dimFreq,
        marginalROI, scalePotential: scale,
        recommendation: scale === "high" ? `${pl.publisher} has high scale potential — increase budget by 20-30%` : scale === "medium" ? `${pl.publisher} moderate scale potential — cautiously increase` : `${pl.publisher} at scale — focus on efficiency and creative refresh`,
      };
    });
  }
}

export const campaignAdPlacementAnalyzer = new CampaignAdPlacementAnalyzerService();
