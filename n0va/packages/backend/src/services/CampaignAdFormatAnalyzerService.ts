import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";

interface FormatPerformanceDetail {
  format: string;
  category: string;
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

interface FormatReport {
  campaignId: string;
  campaignName: string;
  generatedAt: string;
  formats: FormatPerformanceDetail[];
  bestFormat: string;
  worstFormat: string;
  categorySummary: { category: string; totalRevenue: number; avgROAS: number; formatCount: number }[];
  formatMix: { format: string; currentShare: number; recommendedShare: number; change: number }[];
  recommendations: string[];
}

interface FormatRecommendation {
  format: string;
  category: string;
  currentPerformance: string;
  recommendation: string;
  expectedImpact: string;
  bidAdjustment: number;
  priority: "high" | "medium" | "low";
}

interface FormatOpportunity {
  format: string;
  category: string;
  description: string;
  adoptionRate: number;
  projectedROAS: number;
  implementationDifficulty: "easy" | "moderate" | "hard";
  recommendation: string;
  projectedMonthlyRevenue: number;
}

interface FormatBidAdjustment {
  format: string;
  category: string;
  currentBidMultiplier: number;
  recommendedMultiplier: number;
  changePercent: number;
  rationale: string;
  expectedROASImpact: number;
}

interface AudienceFormatPreference {
  format: string;
  category: string;
  audienceScore: number;
  engagementRate: number;
  completionRate: number;
  preferredBySegment: string[];
  recommendation: string;
}

interface FormatTrend {
  format: string;
  category: string;
  metrics: { metric: string; value: number; change: number; direction: "up" | "down" | "stable" }[];
  overallDirection: "improving" | "declining" | "stable";
}

interface FormatCrossDeviceEntry {
  format: string;
  mobileCtr: number;
  mobileCvr: number;
  desktopCtr: number;
  desktopCvr: number;
  tabletCtr: number;
  tabletCvr: number;
  bestDevice: string;
  crossDeviceConsistency: number;
  recommendation: string;
}

interface FormatCreativeEntry {
  format: string;
  creativeVersions: number;
  topPerformerVersion: string;
  avgCtrByVersion: { version: string; ctr: number }[];
  creativeFatigueIndex: number;
  refreshRecommended: boolean;
  recommendation: string;
}

interface FormatSegmentEntry {
  format: string;
  segment: string;
  affinityScore: number;
  conversionRate: number;
  engagementRate: number;
  shareOfWallet: number;
  recommendation: string;
}

interface FormatCompetitiveEntry {
  format: string;
  ourUsage: number;
  competitorAvgUsage: number;
  usageGap: number;
  ourROAS: number;
  competitorAvgROAS: number;
  roasGap: number;
  competitiveAdvantage: "strong_advantage" | "slight_advantage" | "parity" | "slight_disadvantage" | "strong_disadvantage";
  recommendation: string;
}

interface FormatROIEntry {
  format: string;
  totalSpend: number;
  totalRevenue: number;
  directROAS: number;
  attributedROAS: number;
  diminishingReturnPoint: number;
  marginalROI: number;
  efficiencyGrade: "A" | "B" | "C" | "D" | "F";
}

interface FormatLifecycleEntry {
  format: string;
  lifecycleStage: "introduction" | "growth" | "maturity" | "decline";
  marketAdoption: number;
  yearOverYearChange: number;
  projectedRelevance: number;
  investmentStrategy: string;
  riskLevel: "low" | "medium" | "high";
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const FORMAT_TEMPLATES = [
  { format: "Text Ad", category: "Search" },
  { format: "Responsive Search", category: "Search" },
  { format: "Display Banner", category: "Display" },
  { format: "Native Ad", category: "Display" },
  { format: "Image Ad", category: "Social" },
  { format: "Carousel Ad", category: "Social" },
  { format: "Video (6-15s)", category: "Video" },
  { format: "Video (15-30s)", category: "Video" },
  { format: "In-Stream Video", category: "Video" },
  { format: "Story Ad", category: "Social" },
  { format: "Collection Ad", category: "Social" },
  { format: "Audio Ad", category: "Audio" },
  { format: "Sponsored Content", category: "Content" },
  { format: "Shopping Ad", category: "Retail" },
  { format: "Dynamic Remarketing", category: "Display" },
  { format: "Interactive Ad", category: "Display" },
];

export class CampaignAdFormatAnalyzerService {
  analyzeFormatPerformance(campaignId: string, tenantId: string): FormatReport | null {
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

    const formats: FormatPerformanceDetail[] = FORMAT_TEMPLATES.map((ft, i) => {
      const fSeed = seed + hashStr(ft.format);
      const share = 0.015 + ((fSeed * 17) % 70) / 1000;
      const imps = Math.round(totalImps * share);
      const ctrBase = 0.3 + ((fSeed * 7) % 70) / 50;
      const clicks = Math.round(imps * Math.min(6, ctrBase) / 100);
      const cvrBase = 0.3 + ((fSeed * 13) % 120) / 50;
      const convs = Math.round(clicks * Math.min(18, cvrBase) / 100);
      const revShare = share * (0.4 + ((fSeed * 19) % 60) / 100);
      const rev = Math.round(totalRev * revShare);
      const spdShare = share * (0.3 + ((fSeed * 11) % 70) / 100);
      const spd = Math.round(totalSpd * spdShare);
      const ctr = imps > 0 ? Math.round(clicks / imps * 10000) / 100 : 0;
      const cvr = clicks > 0 ? Math.round(convs / clicks * 10000) / 100 : 0;
      const roas = spd > 0 ? Math.round(rev / spd * 100) / 100 : 0;
      const cpc = clicks > 0 ? Math.round(spd / clicks * 100) / 100 : 0;
      const score = Math.round((ctr / 2 * 15) + (cvr / 4 * 25) + (roas / 2.5 * 35) + (share * 100 * 25));
      const status: "overperforming" | "performing" | "underperforming" = score >= 65 ? "overperforming" : score >= 40 ? "performing" : "underperforming";
      return {
        format: ft.format, category: ft.category, impressions: imps, clicks, conversions: convs, revenue: rev, spend: spd,
        ctr, cvr, roas, cpc, share: Math.round(share * 10000) / 100, performanceScore: Math.min(100, score), status,
      };
    });

    formats.sort((a, b) => b.performanceScore - a.performanceScore);
    const bestFormat = formats[0]?.format || "N/A";
    const worstFormat = formats[formats.length - 1]?.format || "N/A";

    const catMap = new Map<string, { rev: number; spd: number; count: number }>();
    for (const f of formats) {
      const ex = catMap.get(f.category) || { rev: 0, spd: 0, count: 0 };
      ex.rev += f.revenue; ex.spd += f.spend; ex.count++;
      catMap.set(f.category, ex);
    }
    const categorySummary = Array.from(catMap.entries()).map(([cat, d]) => ({
      category: cat, totalRevenue: d.rev, avgROAS: d.spd > 0 ? Math.round(d.rev / d.spd * 100) / 100 : 0, formatCount: d.count,
    })).sort((a, b) => b.avgROAS - a.avgROAS);

    const totalShare = formats.reduce((s, f) => s + f.share, 0);
    const formatMix = formats.map(f => {
      const perfRatio = f.performanceScore / 100;
      const recShare = Math.round((f.share / totalShare) * (0.5 + perfRatio * 0.8) * 10000) / 100;
      const change = Math.round((recShare - f.share) * 100) / 100;
      return { format: f.format, currentShare: f.share, recommendedShare: recShare, change };
    }).sort((a, b) => b.recommendedShare - a.recommendedShare);

    const recommendations: string[] = [];
    const top3 = formats.slice(0, 3);
    recommendations.push(`Best formats: ${top3.map(f => `${f.format} (${f.performanceScore})`).join(", ")} — increase allocation by ${formatMix.slice(0, 3).reduce((s, m) => s + Math.max(0, m.change), 0).toFixed(1)}% combined`);
    const worst = formats[formats.length - 1];
    if (worst && worst.performanceScore < 30) recommendations.push(`${worst.format} significantly underperforming (score: ${worst.performanceScore}) — consider removing from rotation or A/B testing creative refresh`);
    const videoFormats = formats.filter(f => f.category === "Video");
    if (videoFormats.some(v => v.roas > 1.5)) recommendations.push("Video formats outperforming benchmarks — increase video investment by 15-20% and test longer-form content");
    const displayFormats = formats.filter(f => f.category === "Display");
    if (displayFormats.some(d => d.roas < 0.8)) recommendations.push("Display formats underperforming — review creative quality and targeting precision for display placements");
    recommendations.push("Run A/B test comparing current format mix against a video-optimized mix to validate format strategy");

    return { campaignId, campaignName: a.campaignName, generatedAt: new Date().toISOString(), formats, bestFormat, worstFormat, categorySummary, formatMix, recommendations };
  }

  recommendFormatMix(campaignId: string, tenantId: string): FormatRecommendation[] {
    const report = this.analyzeFormatPerformance(campaignId, tenantId);
    if (!report) return [];
    return report.formats.map(f => {
      const perfRatio = f.performanceScore / 100;
      const adjustment = Math.round((perfRatio * 1.2 - 1) * 100);
      return {
        format: f.format, category: f.category, currentPerformance: f.status,
        recommendation: f.status === "overperforming" ? `Increase ${f.format} allocation by ${Math.abs(adjustment)}% — strong ROAS of ${f.roas}x` : f.status === "underperforming" ? `Reduce ${f.format} allocation by ${Math.abs(adjustment)}% — improve creative or pausing` : `Maintain ${f.format} at current allocation with minor optimization`,
        expectedImpact: f.status === "overperforming" ? "12-20% revenue increase" : f.status === "underperforming" ? "15-25% efficiency improvement" : "3-7% incremental gain",
        bidAdjustment: adjustment,
        priority: f.status === "overperforming" ? "high" as const : f.status === "underperforming" ? "high" as const : "medium" as const,
      };
    });
  }

  identifyFormatOpportunities(tenantId: string): FormatOpportunity[] {
    const seed = hashStr(tenantId);
    const opportunities = [
      { format: "YouTube Shorts", cat: "Video", desc: "Short-form vertical video growing rapidly", adopt: 0.35, diff: "easy" as const },
      { format: "TikTok In-Feed", cat: "Social", desc: "High-engagement native video ads", adopt: 0.42, diff: "easy" as const },
      { format: "Instagram Reels", cat: "Social", desc: "Reels outperforming Stories for reach", adopt: 0.48, diff: "easy" as const },
      { format: "Connected TV", cat: "Video", desc: "CTV ad spend growing 25% YoY", adopt: 0.28, diff: "moderate" as const },
      { format: "Audio (Podcast)", cat: "Audio", desc: "Podcast ad revenue growing steadily", adopt: 0.22, diff: "easy" as const },
      { format: "AR Ad", cat: "Social", desc: "Augmented reality interactive ads", adopt: 0.12, diff: "hard" as const },
      { format: "Shoppable Video", cat: "Social", desc: "Direct purchase from video content", adopt: 0.18, diff: "moderate" as const },
      { format: "Digital Out-of-Home", cat: "Display", desc: "Programmatic DOOH expanding", adopt: 0.08, diff: "hard" as const },
      { format: "Gaming/In-Game", cat: "Display", desc: "In-game advertising growing with gaming audiences", adopt: 0.15, diff: "moderate" as const },
      { format: "Interactive Display", cat: "Display", desc: "Rich media expandable ads", adopt: 0.2, diff: "moderate" as const },
      { format: "Newsletter Sponsorship", cat: "Content", desc: "Targeted newsletter ads with high engagement", adopt: 0.25, diff: "easy" as const },
      { format: "CTV/OTT Programmatic", cat: "Video", desc: "Programmatic connected TV inventory", adopt: 0.3, diff: "moderate" as const },
    ];
    return opportunities.map(o => {
      const opSeed = seed + hashStr(o.format);
      const roas = 1.5 + (o.diff === "easy" ? 1.0 : o.diff === "moderate" ? 0.5 : 0.2) + ((opSeed * 7) % 80) / 100;
      const projRev = Math.round(((opSeed % 30) + 20) * (o.diff === "easy" ? 1000 : o.diff === "moderate" ? 500 : 200));
      return {
        format: o.format, category: o.cat, description: o.desc, adoptionRate: o.adopt,
        projectedROAS: Math.round(roas * 100) / 100, implementationDifficulty: o.diff,
        recommendation: o.diff === "easy" ? `Quick win — launch test campaign with $1000-2000 budget to validate ${o.format} performance` : o.diff === "moderate" ? `Medium-term opportunity — plan structured test over 4-6 weeks with $3000-5000 budget` : `Strategic investment — requires more resources; consider phased rollout or partner integration`,
        projectedMonthlyRevenue: projRev,
      };
    }).sort((a, b) => b.projectedROAS - a.projectedROAS);
  }

  calculateFormatBidAdjustments(campaignId: string, tenantId: string): FormatBidAdjustment[] {
    const report = this.analyzeFormatPerformance(campaignId, tenantId);
    if (!report) return [];
    return report.formats.map(f => {
      const currentBase = 1.0 + (f.performanceScore - 50) / 100 * 0.3;
      const perfAdjust = (f.performanceScore - 50) / 100 * 0.5;
      const recommended = Math.round(Math.max(0.1, currentBase + perfAdjust) * 100) / 100;
      const change = Math.round((recommended - currentBase) / currentBase * 100);
      return {
        format: f.format, category: f.category, currentBidMultiplier: Math.round(currentBase * 100) / 100,
        recommendedMultiplier: recommended, changePercent: change,
        rationale: `${f.format} (${f.category}) score ${f.performanceScore}/100, ROAS ${f.roas}x — ${f.status === "overperforming" ? "increase bids" : f.status === "underperforming" ? "reduce bids" : "maintain bids"} for format-level optimization`,
        expectedROASImpact: f.status === "overperforming" ? Math.round((1 - recommended / currentBase) * 100) : f.status === "underperforming" ? Math.round((currentBase / recommended - 1) * 100) : 0,
      };
    });
  }

  analyzeAudienceFormatPreference(tenantId: string): AudienceFormatPreference[] {
    const seed = hashStr(tenantId);
    const segments = ["High-Value Buyers", "Mobile-First", "Young Adults", "Professionals", "Budget Shoppers"];
    return FORMAT_TEMPLATES.slice(0, 12).map((ft, i) => {
      const fSeed = seed + hashStr(ft.format);
      const audienceScore = 30 + ((fSeed * 17) % 60);
      const engagementRate = Math.round((20 + ((fSeed * 13) % 60)) * 100) / 100;
      const completionRate = ft.category === "Video" ? Math.round((40 + ((fSeed * 23) % 45)) * 100) / 100 : Math.round((60 + ((fSeed * 19) % 30)) * 100) / 100;
      const topSegments = segments.filter((_, si) => (fSeed + si * 31) % 3 === 0).slice(0, 2);
      return {
        format: ft.format, category: ft.category, audienceScore, engagementRate, completionRate,
        preferredBySegment: topSegments.length > 0 ? topSegments : ["General Audience"],
        recommendation: audienceScore > 70 ? `${ft.format} strongly preferred by ${topSegments.join(", ")} — prioritize in campaign mix` : audienceScore > 50 ? `${ft.format} has moderate audience fit — use as secondary format` : `${ft.format} has lower audience affinity — limit allocation or test creative refresh`,
      };
    }).sort((a, b) => b.audienceScore - a.audienceScore);
  }

  analyzeFormatTrends(campaignId: string, tenantId: string): FormatTrend[] {
    const report = this.analyzeFormatPerformance(campaignId, tenantId);
    if (!report) return [];
    return report.formats.slice(0, 10).map(f => {
      const seed = hashStr(f.format + tenantId);
      const metrics = ["ctr", "cvr", "roas", "cpc"].map((m, mi) => {
        const val = (f as any)[m] || 0;
        const chg = Math.round((((seed + mi * 17) % 21 - 10) + ((seed + mi * 23) % 18 - 9)) * 10) / 10;
        const dir: "up" | "down" | "stable" = chg > 3 ? "up" : chg < -3 ? "down" : "stable";
        return { metric: m.toUpperCase(), value: val, change: chg, direction: dir };
      });
      const up = metrics.filter(m => m.direction === "up").length;
      const down = metrics.filter(m => m.direction === "down").length;
      return { format: f.format, category: f.category, metrics, overallDirection: up > down ? "improving" as const : down > up ? "declining" as const : "stable" as const };
    });
  }

  formatCrossDeviceAnalysis(campaignId: string, tenantId: string): FormatCrossDeviceEntry[] {
    const report = this.analyzeFormatPerformance(campaignId, tenantId);
    if (!report) return [];
    const devSeed = hashStr(campaignId + tenantId + "crossdev");
    const devices = ["Mobile", "Desktop", "Tablet"];
    return report.formats.slice(0, 10).map((f, fi) => {
      const baseCtr = f.ctr;
      const baseCvr = f.cvr;
      const mobileCtr = Math.round(baseCtr * (0.9 + ((devSeed + fi * 13) % 20) / 100) * 100) / 100;
      const mobileCvr = Math.round(baseCvr * (0.8 + ((devSeed + fi * 17) % 25) / 100) * 100) / 100;
      const desktopCtr = Math.round(baseCtr * (1.0 + ((devSeed + fi * 19) % 15) / 100) * 100) / 100;
      const desktopCvr = Math.round(baseCvr * (1.1 + ((devSeed + fi * 23) % 15) / 100) * 100) / 100;
      const tabletCtr = Math.round(baseCtr * (0.85 + ((devSeed + fi * 29) % 20) / 100) * 100) / 100;
      const tabletCvr = Math.round(baseCvr * (0.9 + ((devSeed + fi * 31) % 20) / 100) * 100) / 100;
      const devCtrs = [mobileCtr, desktopCtr, tabletCtr];
      const bestDev = devices[devCtrs.indexOf(Math.max(...devCtrs))];
      const consistency = Math.round((100 - Math.max(mobileCtr, desktopCtr, tabletCtr) + Math.min(mobileCtr, desktopCtr, tabletCtr)) * 10) / 10;
      return {
        format: f.format, mobileCtr, mobileCvr, desktopCtr, desktopCvr, tabletCtr, tabletCvr,
        bestDevice: bestDev, crossDeviceConsistency: Math.max(0, consistency),
        recommendation: consistency > 85 ? `${f.format} performs consistently across devices — use unified strategy` : `${f.format} performs best on ${bestDev} — optimize creatives for ${bestDev.toLowerCase()} experience`,
      };
    });
  }

  formatCreativeEffectiveness(campaignId: string, tenantId: string): FormatCreativeEntry[] {
    const report = this.analyzeFormatPerformance(campaignId, tenantId);
    if (!report) return [];
    const crSeed = hashStr(campaignId + tenantId + "creative");
    return report.formats.slice(0, 10).map((f, fi) => {
      const versions = 2 + ((crSeed + fi * 13) % 5);
      const versions_list = Array.from({ length: versions }, (_, vi) => `v${vi + 1}`);
      const avgCtrs = versions_list.map((v, vi) => ({ version: v, ctr: Math.round(f.ctr * (0.7 + ((crSeed + fi * 17 + vi * 13) % 40) / 100) * 100) / 100 }));
      const topVersion = avgCtrs.reduce((best, curr) => curr.ctr > best.ctr ? curr : best, avgCtrs[0]);
      const fatigue = 20 + ((crSeed + fi * 19) % 60);
      return {
        format: f.format, creativeVersions: versions, topPerformerVersion: topVersion.version,
        avgCtrByVersion: avgCtrs, creativeFatigueIndex: fatigue,
        refreshRecommended: fatigue > 60,
        recommendation: fatigue > 60 ? `${f.format} creative fatigue high (${fatigue}%) — refresh creatives to prevent CTR decline` : `${f.format} fatigue manageable (${fatigue}%) — rotate creatives every 2-3 weeks`,
      };
    });
  }

  formatAudienceSegmentMapping(campaignId: string, tenantId: string): FormatSegmentEntry[] {
    const report = this.analyzeFormatPerformance(campaignId, tenantId);
    if (!report) return [];
    const segSeed = hashStr(campaignId + tenantId + "segments");
    const segments = ["High-Value Buyers", "Mobile-First", "Young Adults", "Professionals", "Budget Shoppers", "Loyal Customers"];
    const entries: FormatSegmentEntry[] = [];
    for (const f of report.formats.slice(0, 8)) {
      for (const seg of segments) {
        const pairSeed = segSeed + hashStr(f.format + seg);
        const affinity = 20 + ((pairSeed * 17) % 70);
        const cvr = (0.5 + ((pairSeed * 13) % 80) / 20 * f.cvr / 100) * f.cvr;
        const engagement = 15 + ((pairSeed * 19) % 70);
        const sow = 3 + ((pairSeed * 23) % 30);
        entries.push({
          format: f.format, segment: seg, affinityScore: affinity,
          conversionRate: Math.round(cvr * 100) / 100,
          engagementRate: Math.round(engagement * 100) / 100,
          shareOfWallet: sow,
          recommendation: affinity > 70 ? `${f.format} has strong ${seg} affinity (${affinity}) — increase allocation by ${Math.round(sow * 0.5)}%` : `${f.format} moderate fit for ${seg} — test creative variations to improve relevance`,
        });
      }
    }
    return entries.sort((a, b) => b.affinityScore - a.affinityScore);
  }

  formatCompetitiveAnalysis(tenantId: string): FormatCompetitiveEntry[] {
    const seed = hashStr(tenantId + "competitive");
    const formatCategories = [
      { format: "Text Ad", ourUsage: 85, compUsage: 78, ourROAS: 2.1, compROAS: 1.9 },
      { format: "Video", ourUsage: 45, compUsage: 55, ourROAS: 2.8, compROAS: 2.2 },
      { format: "Display Banner", ourUsage: 60, compUsage: 72, ourROAS: 1.5, compROAS: 1.8 },
      { format: "Social", ourUsage: 55, compUsage: 65, ourROAS: 2.3, compROAS: 2.0 },
      { format: "Audio", ourUsage: 15, compUsage: 22, ourROAS: 1.8, compROAS: 1.6 },
      { format: "Native", ourUsage: 25, compUsage: 30, ourROAS: 2.5, compROAS: 2.1 },
    ];
    return formatCategories.map((fc, ci) => {
      const usageGap = fc.ourUsage - fc.compUsage;
      const roasGap = fc.ourROAS - fc.compROAS;
      const adv: FormatCompetitiveEntry["competitiveAdvantage"] = roasGap > 0.4 ? "strong_advantage" : roasGap > 0.1 ? "slight_advantage" : roasGap > -0.1 ? "parity" : roasGap > -0.4 ? "slight_disadvantage" : "strong_disadvantage";
      return {
        format: fc.format, ourUsage: fc.ourUsage, competitorAvgUsage: fc.compUsage, usageGap,
        ourROAS: fc.ourROAS, competitorAvgROAS: fc.compROAS, roasGap: Math.round(roasGap * 100) / 100,
        competitiveAdvantage: adv,
        recommendation: adv === "strong_advantage" ? `${fc.format} is a competitive moat — invest aggressively to widen gap` : adv === "slight_advantage" ? `${fc.format} has marginal edge — optimize to maintain advantage` : adv === "parity" ? `${fc.format} at competitive parity — differentiate through creative quality` : `${fc.format} behind competitors — analyze competitor approach and close gap`,
      };
    });
  }

  formatROIAttribution(campaignId: string, tenantId: string): FormatROIEntry[] {
    const report = this.analyzeFormatPerformance(campaignId, tenantId);
    if (!report) return [];
    const roiSeed = hashStr(campaignId + tenantId + "roi");
    return report.formats.slice(0, 12).map((f, fi) => {
      const directROAS = f.roas;
      const attrROAS = Math.round(directROAS * (1.1 + ((roiSeed + fi * 13) % 30) / 100) * 100) / 100;
      const dimPoint = Math.round((5 + ((roiSeed + fi * 17) % 25)) * 100) / 100;
      const marginal = Math.round(((roiSeed + fi * 19) % 30) / 10 * 100) / 100;
      const efficiency: FormatROIEntry["efficiencyGrade"] = attrROAS > 3 ? "A" : attrROAS > 2 ? "B" : attrROAS > 1.5 ? "C" : attrROAS > 1 ? "D" : "F";
      return {
        format: f.format, totalSpend: f.spend, totalRevenue: f.revenue,
        directROAS, attributedROAS: attrROAS, diminishingReturnPoint: dimPoint,
        marginalROI: marginal, efficiencyGrade: efficiency,
      };
    });
  }

  formatLifecycleAnalysis(tenantId: string): FormatLifecycleEntry[] {
    const seed = hashStr(tenantId + "lifecycle");
    const lifecycleFormats = [
      { format: "Text Ad", stage: "maturity" as const, adopt: 95, yoy: -3 },
      { format: "Responsive Search", stage: "maturity" as const, adopt: 88, yoy: 5 },
      { format: "Display Banner", stage: "maturity" as const, adopt: 92, yoy: -2 },
      { format: "Native Ad", stage: "growth" as const, adopt: 65, yoy: 12 },
      { format: "Video (6-15s)", stage: "growth" as const, adopt: 72, yoy: 18 },
      { format: "Video (15-30s)", stage: "maturity" as const, adopt: 80, yoy: 3 },
      { format: "Story Ad", stage: "growth" as const, adopt: 55, yoy: 22 },
      { format: "Audio Ad", stage: "growth" as const, adopt: 35, yoy: 25 },
      { format: "AR Ad", stage: "introduction" as const, adopt: 12, yoy: 40 },
      { format: "Connected TV", stage: "growth" as const, adopt: 28, yoy: 30 },
      { format: "Interactive Ad", stage: "introduction" as const, adopt: 18, yoy: 35 },
      { format: "Digital Out-of-Home", stage: "introduction" as const, adopt: 8, yoy: 20 },
    ];
    return lifecycleFormats.map((lf, li) => {
      const relevance = Math.min(100, Math.max(1, Math.round(lf.adopt * (0.5 + ((seed + li * 17) % 30) / 100))));
      const risk: "low" | "medium" | "high" = lf.stage === "introduction" ? "high" : lf.stage === "growth" ? "medium" : lf.stage === "maturity" ? "low" : "high";
      const strategy = lf.stage === "introduction" ? "Experiment with small budget — monitor metrics before scaling" : lf.stage === "growth" ? "Increase investment — growing formats offer first-mover advantage" : lf.stage === "maturity" ? "Optimize for efficiency — mature formats require precise targeting" : "Reduce exposure — declining formats need replacement strategy";
      return {
        format: lf.format, lifecycleStage: lf.stage, marketAdoption: lf.adopt,
        yearOverYearChange: lf.yoy, projectedRelevance: relevance,
        investmentStrategy: strategy, riskLevel: risk,
      };
    });
  }
}

export const campaignAdFormatAnalyzer = new CampaignAdFormatAnalyzerService();
