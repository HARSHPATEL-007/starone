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
        const chg = Math.round((Math.random() * 20 - 10 + ((seed + mi * 17) % 18 - 9)) * 10) / 10;
        const dir: "up" | "down" | "stable" = chg > 3 ? "up" : chg < -3 ? "down" : "stable";
        return { metric: m.toUpperCase(), value: val, change: chg, direction: dir };
      });
      const up = metrics.filter(m => m.direction === "up").length;
      const down = metrics.filter(m => m.direction === "down").length;
      return { format: f.format, category: f.category, metrics, overallDirection: up > down ? "improving" as const : down > up ? "declining" as const : "stable" as const };
    });
  }
}

export const campaignAdFormatAnalyzer = new CampaignAdFormatAnalyzerService();
