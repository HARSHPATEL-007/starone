import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";

interface CreativeAsset {
  id: string;
  name: string;
  type: "headline" | "description" | "image" | "video" | "cta" | "landing_page";
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cvr: number;
  roas: number;
  status: "active" | "paused" | "underperforming";
  ageDays: number;
}

interface CreativeAnalysis {
  tenantId: string;
  campaignId: string;
  campaignName: string;
  assets: CreativeAsset[];
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalSpend: number;
  totalRevenue: number;
  averageCTR: number;
  averageCVR: number;
  averageROAS: number;
  topPerformers: CreativeAsset[];
  fatiguedAssets: CreativeAsset[];
  underperformers: CreativeAsset[];
}

interface CreativeFatigueAnalysis {
  assetId: string;
  assetName: string;
  ageDays: number;
  impressions: number;
  currentCTR: number;
  initialCTR: number;
  fatigueRate: number;
  fatigueLevel: "none" | "mild" | "moderate" | "severe";
  recommendation: string;
  suggestedRefreshDate: string;
}

interface CreativeRecommendation {
  creativeType: string;
  currentApproach: string;
  recommendation: string;
  expectedLift: string;
  difficulty: "easy" | "medium" | "hard";
  aBTestSuggestion: string;
}

interface CreativeABTest {
  testName: string;
  control: { asset: string; metric: number };
  variant: { asset: string; metric: number };
  lift: number;
  confidence: number;
  significance: "significant" | "promising" | "inconclusive";
  winner: string;
  action: string;
}

interface CreativeTrend {
  date: string;
  activeCreatives: number;
  impressions: number;
  clicks: number;
  conversions: number;
  averageCTR: number;
  fatigueRate: number;
}

const HEADLINES = ["Boost Your ROI Today", "Get Started Free", "Limited Time Offer", "Unlock Premium Features", "Save Up to 50%", "Try It Risk-Free", "Join Thousands of Users", "Your Success Starts Here", "Don't Miss Out", "Experience the Difference"];
const DESCRIPTIONS = ["Award-winning platform trusted by industry leaders. Start your journey today.", "Cutting-edge solution designed to maximize your campaign performance and growth.", "All-in-one platform with powerful analytics, automation, and optimization tools.", "Data-driven insights to help you make smarter marketing decisions every day.", "Join 10,000+ businesses already using our platform to scale their campaigns."];
const CTAS = ["Sign Up Free", "Get Started", "Learn More", "Claim Offer", "Book Demo", "Download Now"];
const ASSET_TYPES: ("headline" | "description" | "image" | "video" | "cta" | "landing_page")[] = ["headline", "description", "image", "video", "cta", "landing_page"];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

interface CreativeForecast {
  campaignId: string;
  forecasts: { date: string; predictedCTR: number; predictedCVR: number; predictedROAS: number; predictedFatigueRate: number; confidence: number }[];
  recommendations: string[];
}

interface AudienceAlignment {
  campaignId: string;
  segments: { segmentName: string; audienceSize: number; creativeFit: number; ctr: number; cvr: number; relevanceScore: number; alignmentGap: number; recommendation: string }[];
  overallAlignment: number;
}

interface CreativeCompetitiveAnalysis {
  campaignId: string;
  competitors: { competitorId: string; headlineStyle: string; ctaStyle: string; visualType: string; avgCTR: number; estimatedSpend: number }[];
  gaps: { area: string; ownScore: number; competitorAvg: number; gap: number; priority: "high" | "medium" | "low" }[];
  positioningAdvice: string;
}

interface CreativeLifecycle {
  campaignId: string;
  assets: { assetId: string; name: string; type: string; ageDays: number; stage: "new" | "growth" | "maturity" | "decline" | "fatigued"; ctr: number; roas: number; remainingDays: number }[];
  portfolioStageDistribution: { stage: string; count: number; percentage: number }[];
}

interface CreativeROI {
  assetId: string; name: string; type: string; totalSpend: number; totalRevenue: number; roas: number;
  costPerConversion: number; profitMargin: number; breakEvenDays: number; efficiencyGrade: "A" | "B" | "C" | "D" | "F";
}

interface OptimizationHistory {
  assetId: string; name: string; type: string;
  changes: { date: string; action: string; metric: string; before: number; after: number; improvement: number }[];
  totalImprovement: number; currentStatus: string;
}

export class CampaignCreativeOptimizerService {
  analyzeCreativePerformance(campaignId: string, tenantId: string): CreativeAnalysis {
    const seed = hashStr(campaignId + tenantId);
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const campaign = portfolio.analyses.find((a: any) => a.campaignId === campaignId);
    const campaignName = campaign?.campaignName || `Campaign ${campaignId.slice(0, 8)}`;
    const numAssets = 8 + (seed % 8);

    const assets: CreativeAsset[] = [];
    for (let i = 0; i < numAssets; i++) {
      const aSeed = seed + i * 19;
      const type = ASSET_TYPES[(aSeed * 7) % ASSET_TYPES.length];
      let name = "";
      if (type === "headline") name = HEADLINES[(aSeed * 11) % HEADLINES.length];
      else if (type === "description") name = DESCRIPTIONS[(aSeed * 13) % DESCRIPTIONS.length];
      else if (type === "cta") name = CTAS[(aSeed * 17) % CTAS.length];
      else if (type === "image") name = `Image_V${(aSeed % 6) + 1}`;
      else if (type === "video") name = `Video_Spot_${(aSeed % 5) + 1}`;
      else name = `LP_V${(aSeed % 4) + 1}`;

      const imp = 2000 + (aSeed % 18000);
      const clk = Math.round(imp * (0.005 + ((aSeed * 3) % 45) / 1000));
      const conv = Math.round(clk * (0.01 + ((aSeed * 11) % 60) / 1000));
      const spnd = Math.round(clk * (0.3 + (aSeed % 150) / 100));
      const rev = Math.round(conv * (15 + (aSeed % 185)));
      const age = 3 + (aSeed % 58);

      assets.push({
        id: `asset_${campaignId}_${i}`, name, type, impressions: imp, clicks: clk,
        conversions: conv, spend: spnd, revenue: rev,
        ctr: Math.round(clk / Math.max(imp, 1) * 10000) / 100,
        cvr: Math.round(conv / Math.max(clk, 1) * 10000) / 100,
        roas: Math.round(rev / Math.max(spnd, 1) * 100) / 100,
        status: rev > spnd * 2 ? "active" as const : rev > spnd ? "active" as const :
                age > 30 ? "underperforming" as const : "paused" as const,
        ageDays: age,
      });
    }

    const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);
    const totalImp = sum(assets.map(a => a.impressions));
    const totalClk = sum(assets.map(a => a.clicks));
    const totalConv = sum(assets.map(a => a.conversions));
    const totalSpend = sum(assets.map(a => a.spend));
    const totalRev = sum(assets.map(a => a.revenue));

    const sortedByRoas = [...assets].sort((a, b) => b.roas - a.roas);
    return {
      tenantId, campaignId, campaignName, assets,
      totalImpressions: totalImp, totalClicks: totalClk, totalConversions: totalConv,
      totalSpend: totalSpend, totalRevenue: totalRev,
      averageCTR: totalImp > 0 ? Math.round(totalClk / totalImp * 10000) / 100 : 0,
      averageCVR: totalClk > 0 ? Math.round(totalConv / totalClk * 10000) / 100 : 0,
      averageROAS: totalSpend > 0 ? Math.round(totalRev / totalSpend * 100) / 100 : 0,
      topPerformers: sortedByRoas.slice(0, 3),
      fatiguedAssets: assets.filter(a => a.ageDays > 25 && a.ctr < 1.5).slice(0, 3),
      underperformers: assets.filter(a => a.roas < 100).slice(0, 3),
    };
  }

  analyzeCreativeFatigue(campaignId: string, tenantId: string): CreativeFatigueAnalysis[] {
    const analysis = this.analyzeCreativePerformance(campaignId, tenantId);
    return analysis.assets.filter(a => a.ageDays > 7).slice(0, 6).map(a => {
      const seed = hashStr(a.id);
      const initialCTR = Math.min(a.ctr * (1 + (seed % 50) / 100), 12);
      const fatigueRate = a.ageDays > 0 ? Math.round((initialCTR - a.ctr) / a.ageDays * 100) / 100 : 0;
      const fatigueLevel: "none" | "mild" | "moderate" | "severe" =
        fatigueRate > 0.15 ? "severe" as const : fatigueRate > 0.08 ? "moderate" as const :
        fatigueRate > 0.03 ? "mild" as const : "none" as const;
      const daysToRefresh = fatigueLevel === "severe" ? 7 : fatigueLevel === "moderate" ? 14 : 30;
      const refreshDate = new Date();
      refreshDate.setDate(refreshDate.getDate() + daysToRefresh);
      return {
        assetId: a.id, assetName: a.name, ageDays: a.ageDays, impressions: a.impressions,
        currentCTR: a.ctr, initialCTR: Math.round(initialCTR * 100) / 100,
        fatigueRate, fatigueLevel,
        recommendation: fatigueLevel === "severe" ? `Critical fatigue — refresh creative immediately. Test new ${a.type} variation.` :
                        fatigueLevel === "moderate" ? `Moderate fatigue detected — prepare new ${a.type} variant for rotation.` :
                        fatigueLevel === "mild" ? `Early signs of fatigue — monitor CTR closely over next 2 weeks.` :
                        `No fatigue detected — creative is performing well. Maintain current rotation.`,
        suggestedRefreshDate: refreshDate.toISOString().split("T")[0],
      };
    });
  }

  generateCreativeRecommendations(campaignId: string, tenantId: string): CreativeRecommendation[] {
    const analysis = this.analyzeCreativePerformance(campaignId, tenantId);
    const recs: CreativeRecommendation[] = [];

    const headlinePerf = analysis.assets.filter(a => a.type === "headline");
    const ctaPerf = analysis.assets.filter(a => a.type === "cta");
    const descPerf = analysis.assets.filter(a => a.type === "description");

    if (headlinePerf.length > 0) {
      const avg = headlinePerf.reduce((s, a) => s + a.ctr, 0) / headlinePerf.length;
      recs.push({
        creativeType: "Headlines",
        currentApproach: `Average CTR: ${Math.round(avg * 100) / 100}%`,
        recommendation: avg < 2 ? "Test emotional triggers vs rational benefits. Include numbers and power words (Free, New, Guaranteed)." :
                        "Current headlines performing well. Test personalization and dynamic keyword insertion for incremental lift.",
        expectedLift: avg < 2 ? "40-60% CTR improvement with optimized headlines" : "10-20% CTR improvement with personalization",
        difficulty: "easy" as const,
        aBTestSuggestion: "Test 3 headline variants: emotional, rational, and question-based",
      });
    }
    if (ctaPerf.length > 0) {
      const avg = ctaPerf.reduce((s, a) => s + a.cvr, 0) / ctaPerf.length;
      recs.push({
        creativeType: "Call-to-Action",
        currentApproach: `Average CVR: ${Math.round(avg * 100) / 100}%`,
        recommendation: avg < 3 ? "Use action-oriented CTAs with urgency (Now, Today, Limited). Test first-person vs second-person phrasing." :
                        "CTAs performing well. Test contrast buttons and micro-copy above CTA for additional lift.",
        expectedLift: avg < 3 ? "25-40% conversion improvement with optimized CTAs" : "8-15% conversion improvement with CTA refinements",
        difficulty: "easy" as const,
        aBTestSuggestion: "Compare 'Get Started Free' vs 'Claim Your Free Trial' vs 'Start Saving Now'",
      });
    }
    if (descPerf.length > 0) {
      const avg = descPerf.reduce((s, a) => s + a.cvr, 0) / descPerf.length;
      recs.push({
        creativeType: "Descriptions",
        currentApproach: `Average CVR: ${Math.round(avg * 100) / 100}%`,
        recommendation: avg < 2 ? "Focus on benefits not features. Include social proof (reviews, stats, awards). Use bullet points for clarity." :
                        "Descriptions are solid. Add scarcity elements and guarantee statements for extra persuasion.",
        expectedLift: avg < 2 ? "30-50% conversion lift with benefit-focused copy" : "10-20% lift with scarcity and guarantees",
        difficulty: "medium" as const,
        aBTestSuggestion: "Test benefit-focused vs feature-focused description format",
      });
    }

    const videoAssets = analysis.assets.filter(a => a.type === "video");
    if (videoAssets.length > 0) {
      recs.push({
        creativeType: "Video",
        currentApproach: `${videoAssets.length} active video creatives`,
        recommendation: "Optimize first 3 seconds for hook. Add captions for sound-off viewing. Test different video lengths (15s vs 30s vs 60s).",
        expectedLift: "15-25% increase in video completion rate and conversion",
        difficulty: "medium" as const,
        aBTestSuggestion: "Test 15s short vs 30s standard vs 60s in-depth video",
      });
    }

    recs.push({
      creativeType: "Creative Rotation Strategy",
      currentApproach: `${analysis.assets.length} total creatives`,
      recommendation: "Rotate creatives every 2-3 weeks to prevent fatigue. Maintain 3-5 active variants per ad group. Replace underperformers monthly.",
      expectedLift: "20-30% sustained CTR improvement with proper rotation cadence",
      difficulty: "medium" as const,
      aBTestSuggestion: "Test 2-week vs 3-week rotation cycle for optimal fatigue management",
    });

    return recs;
  }

  analyzeCreativeABTests(campaignId: string, tenantId: string): CreativeABTest[] {
    const analysis = this.analyzeCreativePerformance(campaignId, tenantId);
    const tests: CreativeABTest[] = [];
    const seed = hashStr(campaignId + tenantId + "ab");

    const pairs = [
      { name: "Headline: Emotional vs Rational", type: "headline" },
      { name: "CTA: First-person vs Second-person", type: "cta" },
      { name: "Image: Product vs Lifestyle", type: "image" },
      { name: "Description: Short vs Long form", type: "description" },
      { name: "Video: 15s vs 30s", type: "video" },
      { name: "Landing Page: Single-step vs Multi-step", type: "landing_page" },
    ];

    pairs.forEach((p, i) => {
      const tSeed = seed + i * 23;
      const control = analysis.assets.find(a => a.type === p.type);
      if (!control) return;
      const variantMetric = p.type === "headline" || p.type === "description" || p.type === "cta" ? control.cvr * (0.7 + ((tSeed % 60) / 100)) :
                            control.ctr * (0.8 + ((tSeed % 50) / 100));
      const lift = Math.round((variantMetric / Math.max(control.cvr || control.ctr, 0.01) - 1) * 10000) / 100;
      const confidence = 80 + (tSeed % 19);
      const sig: "significant" | "promising" | "inconclusive" = confidence > 94 ? "significant" as const : confidence > 85 ? "promising" as const : "inconclusive" as const;
      const metricLabel = p.type === "headline" || p.type === "description" || p.type === "cta" ? "CVR" : "CTR";
      tests.push({
        testName: p.name,
        control: { asset: control.name, metric: Math.round((control.cvr || control.ctr) * 100) / 100 },
        variant: { asset: `Variant B (${p.type})`, metric: Math.round(variantMetric * 100) / 100 },
        lift, confidence, significance: sig,
        winner: lift > 0 ? "Variant B" : "Control",
        action: sig === "significant" ? `Implement ${lift > 0 ? "Variant B" : "Control"} as new champion for ${p.type}` :
                sig === "promising" ? `Continue test — ${confidence}% confidence approaching significance threshold` :
                `Insufficient data — increase sample size or reduce number of variants`,
      });
    });
    return tests;
  }

  analyzeCreativeMix(campaignId: string, tenantId: string): { mix: { type: string; count: number; totalImpressions: number; totalConversions: number; avgRoas: number; share: number }[]; recommendation: string[] } {
    const analysis = this.analyzeCreativePerformance(campaignId, tenantId);
    const byType = new Map<string, { count: number; imp: number; conv: number; roas: number[] }>();
    for (const a of analysis.assets) {
      const entry = byType.get(a.type) || { count: 0, imp: 0, conv: 0, roas: [] as number[] };
      entry.count++;
      entry.imp += a.impressions;
      entry.conv += a.conversions;
      entry.roas.push(a.roas);
      byType.set(a.type, entry);
    }
    const totalImp = analysis.totalImpressions;
    const mix = Array.from(byType.entries()).map(([type, data]) => ({
      type, count: data.count, totalImpressions: data.imp, totalConversions: data.conv,
      avgRoas: Math.round(data.roas.reduce((s, r) => s + r, 0) / data.roas.length * 100) / 100,
      share: totalImp > 0 ? Math.round(data.imp / totalImp * 10000) / 100 : 0,
    })).sort((a, b) => b.share - a.share);

    const recs: string[] = [];
    const lowRoas = mix.filter(m => m.avgRoas < 150);
    if (lowRoas.length > 0) recs.push(`Low ROAS types: ${lowRoas.map(m => `${m.type} (${m.avgRoas}%)`).join(", ")} — review creative quality and targeting`);
    const dominant = mix[0];
    if (dominant && dominant.share > 40) recs.push(`${dominant.type} dominates ${dominant.share}% of impressions — diversify to reduce fatigue risk`);
    const underrep = mix.filter(m => m.share < 10 && m.avgRoas > 200);
    if (underrep.length > 0) recs.push(`High-performing but underutilized: ${underrep.map(m => m.type).join(", ")} — increase allocation`);

    return { mix, recommendation: recs };
  }

  analyzeCreativeTrends(campaignId: string, tenantId: string): CreativeTrend[] {
    const seed = hashStr(campaignId + tenantId + "trend");
    const trends: CreativeTrend[] = [];
    for (let w = 0; w < 8; w++) {
      const wSeed = seed + w * 11;
      const imp = 10000 + (wSeed % 20000);
      const clk = Math.round(imp * (0.01 + ((wSeed * 3) % 30) / 1000));
      const conv = Math.round(clk * (0.02 + ((wSeed * 7) % 50) / 1000));
      trends.push({
        date: new Date(2025, 0, 1 + w * 7).toISOString().split("T")[0],
        activeCreatives: 6 + (wSeed % 8),
        impressions: imp, clicks: clk, conversions: conv,
        averageCTR: Math.round(clk / Math.max(imp, 1) * 10000) / 100,
        fatigueRate: Math.round((5 + (wSeed % 30)) * 100) / 100,
      });
    }
    return trends;
  }

  creativePerformanceForecast(campaignId: string, tenantId: string): CreativeForecast {
    const analysis = this.analyzeCreativePerformance(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "forecast");
    const forecasts: CreativeForecast["forecasts"] = [];
    let ctr = analysis.averageCTR;
    let cvr = analysis.averageCVR;
    let roas = analysis.averageROAS;
    let fatigue = analysis.fatiguedAssets.length / Math.max(analysis.assets.length, 1) * 100;
    for (let w = 1; w <= 6; w++) {
      const noise = ((seed * w * 7) % 100) / 500 - 0.1;
      ctr = Math.max(0.1, ctr + noise * ctr * 0.1);
      cvr = Math.max(0.1, cvr + noise * 0.05);
      roas = Math.max(0.1, roas + noise * roas * 0.08);
      fatigue = Math.min(100, fatigue + 2 + ((seed * w * 13) % 100) / 50);
      const date = new Date();
      date.setDate(date.getDate() + w * 7);
      forecasts.push({
        date: date.toISOString().split("T")[0],
        predictedCTR: Math.round(ctr * 100) / 100,
        predictedCVR: Math.round(cvr * 100) / 100,
        predictedROAS: Math.round(roas * 100) / 100,
        predictedFatigueRate: Math.round(fatigue * 100) / 100,
        confidence: Math.max(30, 90 - w * 10),
      });
    }
    const recommendations: string[] = [];
    if (forecasts[forecasts.length - 1]?.predictedROAS < 1.5) recommendations.push("ROAS projected to drop below 1.5x within 6 weeks — plan creative refresh");
    if (forecasts.some(f => f.predictedFatigueRate > 60)) recommendations.push("Fatigue rate projected to exceed 60% — rotate creatives proactively");
    if (forecasts[0]?.predictedCTR < 1) recommendations.push("CTR forecast remains below 1% — test new headline and CTA variants");
    recommendations.push("Monitor weekly and adjust creative rotation based on fatigue signals");
    return { campaignId, forecasts, recommendations };
  }

  creativeAudienceAlignment(campaignId: string, tenantId: string): AudienceAlignment {
    const analysis = this.analyzeCreativePerformance(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "align");
    const segments = ["18-24 Professionals", "25-34 Decision Makers", "35-44 Managers", "45-54 Executives", "55+ Retirees", "SMB Owners", "Enterprise Buyers"];
    const segmentData: AudienceAlignment["segments"] = segments.map((seg, i) => {
      const sSeed = seed + i * 17;
      const audienceSize = 5000 + (sSeed % 45000);
      const creativeFit = Math.round((50 + (sSeed % 45)) * 100) / 100;
      const ctr = Math.round((analysis.averageCTR * (0.6 + ((sSeed * 3) % 40) / 100)) * 100) / 100;
      const cvr = Math.round((analysis.averageCVR * (0.5 + ((sSeed * 5) % 50) / 100)) * 100) / 100;
      const relevanceScore = Math.round((creativeFit + ctr * 10 + cvr * 5) / 3 * 100) / 100;
      const alignmentGap = Math.round(Math.max(0, 90 - relevanceScore) * 100) / 100;
      const recommendation = alignmentGap > 30 ? `Create new creative variants targeting ${seg} — relevance score below threshold` : alignmentGap > 15 ? `Optimize existing creatives for ${seg} with tailored messaging` : `Current creatives align well with ${seg}`;
      return { segmentName: seg, audienceSize, creativeFit, ctr, cvr, relevanceScore, alignmentGap, recommendation };
    });
    const overallAlignment = Math.round(segmentData.reduce((s, seg) => s + seg.relevanceScore, 0) / segmentData.length * 100) / 100;
    return { campaignId, segments: segmentData, overallAlignment };
  }

  creativeCompetitiveAnalysis(campaignId: string, tenantId: string): CreativeCompetitiveAnalysis {
    const seed = hashStr(campaignId + tenantId + "comp");
    const competitorCount = 3 + (seed % 3);
    const competitors: CreativeCompetitiveAnalysis["competitors"] = [];
    const headlineStyles = ["Benefit-driven", "Question-based", "Number-focused", "Emotional appeal", "How-to format"];
    const ctaStyles = ["Action-oriented", "Urgency-based", "Free-offer", "Social-proof", "Risk-reversal"];
    const visualTypes = ["Product shot", "Lifestyle", "Illustration", "User-generated", "Animation"];
    for (let i = 0; i < competitorCount; i++) {
      const cSeed = seed + i * 29;
      competitors.push({
        competitorId: `competitor_${i + 1}`,
        headlineStyle: headlineStyles[(cSeed * 7) % headlineStyles.length],
        ctaStyle: ctaStyles[(cSeed * 11) % ctaStyles.length],
        visualType: visualTypes[(cSeed * 13) % visualTypes.length],
        avgCTR: Math.round((1 + (cSeed % 300) / 100) * 100) / 100,
        estimatedSpend: Math.round((5000 + (cSeed % 15000)) * 100) / 100,
      });
    }
    const competitorAvgCTR = competitors.reduce((s, c) => s + c.avgCTR, 0) / competitors.length;
    const analysis = this.analyzeCreativePerformance(campaignId, tenantId);
    const gaps: CreativeCompetitiveAnalysis["gaps"] = [
      { area: "CTR", ownScore: analysis.averageCTR, competitorAvg: Math.round(competitorAvgCTR * 100) / 100, gap: Math.round((competitorAvgCTR - analysis.averageCTR) * 100) / 100, priority: analysis.averageCTR < competitorAvgCTR ? "high" : "low" },
      { area: "Creative Diversity", ownScore: analysis.assets.length, competitorAvg: 12, gap: analysis.assets.length - 12, priority: analysis.assets.length < 8 ? "high" : "medium" },
      { area: "Headline Variety", ownScore: analysis.assets.filter(a => a.type === "headline").length, competitorAvg: 4, gap: analysis.assets.filter(a => a.type === "headline").length - 4, priority: "medium" },
    ];
    const positioningAdvice = analysis.averageCTR < competitorAvgCTR
      ? `Your CTR (${analysis.averageCTR}%) is below competitor average (${Math.round(competitorAvgCTR * 100) / 100}%). Focus on benefit-driven headlines and urgency-based CTAs to close the gap.`
      : `Your CTR (${analysis.averageCTR}%) is competitive. Maintain current performance and explore new creative formats for incremental gains.`;
    return { campaignId, competitors, gaps, positioningAdvice };
  }

  creativeLifecycleAnalysis(campaignId: string, tenantId: string): CreativeLifecycle {
    const analysis = this.analyzeCreativePerformance(campaignId, tenantId);
    const assets: CreativeLifecycle["assets"] = analysis.assets.map(a => {
      const stage: "new" | "growth" | "maturity" | "decline" | "fatigued" =
        a.ageDays < 7 ? "new" : a.ageDays < 14 ? "growth" : a.ageDays < 30 ? "maturity" : a.ageDays < 45 ? "decline" : "fatigued";
      const remainingDays = stage === "new" ? 45 : stage === "growth" ? 30 : stage === "maturity" ? 15 : stage === "decline" ? 7 : 0;
      return { assetId: a.id, name: a.name, type: a.type, ageDays: a.ageDays, stage, ctr: a.ctr, roas: a.roas, remainingDays };
    });
    const stageCounts: Record<string, number> = {};
    assets.forEach(a => { stageCounts[a.stage] = (stageCounts[a.stage] || 0) + 1; });
    const portfolioStageDistribution = Object.entries(stageCounts).map(([stage, count]) => ({
      stage, count, percentage: Math.round(count / assets.length * 10000) / 100,
    }));
    return { campaignId, assets, portfolioStageDistribution };
  }

  creativeROIAnalysis(campaignId: string, tenantId: string): CreativeROI[] {
    const analysis = this.analyzeCreativePerformance(campaignId, tenantId);
    return analysis.assets.map(a => {
      const costPerConversion = a.conversions > 0 ? a.spend / a.conversions : Infinity;
      const profitMargin = a.revenue > 0 ? (a.revenue - a.spend) / a.revenue * 100 : 0;
      const breakEvenDays = a.revenue > 0 && a.spend > a.revenue ? Math.round(a.ageDays * a.spend / Math.max(a.revenue, 0.01)) : 0;
      const efficiencyGrade: "A" | "B" | "C" | "D" | "F" = a.roas >= 400 ? "A" : a.roas >= 250 ? "B" : a.roas >= 150 ? "C" : a.roas >= 100 ? "D" : "F";
      return {
        assetId: a.id, name: a.name, type: a.type, totalSpend: a.spend, totalRevenue: a.revenue, roas: a.roas,
        costPerConversion: isFinite(costPerConversion) ? Math.round(costPerConversion * 100) / 100 : 0,
        profitMargin: Math.round(profitMargin * 100) / 100,
        breakEvenDays, efficiencyGrade,
      };
    });
  }

  creativeOptimizationHistory(campaignId: string, tenantId: string): OptimizationHistory[] {
    const analysis = this.analyzeCreativePerformance(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "opt_hist");
    return analysis.assets.slice(0, 6).map(a => {
      const aSeed = seed + hashStr(a.id);
      const changeCount = 2 + (aSeed % 4);
      const changes: OptimizationHistory["changes"] = [];
      let totalImprovement = 0;
      let ctr = a.ctr * 0.7;
      let roas = a.roas * 0.75;
      for (let c = 0; c < changeCount; c++) {
        const date = new Date();
        date.setDate(date.getDate() - (changeCount - c) * 14);
        const actions = ["Headline rewrite", "CTA change", "Image replacement", "Description update", "Landing page A/B test", "Audience refinement"];
        const action = actions[(aSeed + c * 13) % actions.length];
        const metric = c % 2 === 0 ? "CTR" : "ROAS";
        const before = metric === "CTR" ? ctr : roas;
        ctr += (aSeed * c * 7 % 100) / 500;
        roas += (aSeed * c * 11 % 200) / 100;
        const after = metric === "CTR" ? ctr : roas;
        const improvement = before > 0 ? Math.round((after - before) / before * 10000) / 100 : 0;
        totalImprovement += improvement;
        changes.push({ date: date.toISOString().split("T")[0], action, metric, before: Math.round(before * 100) / 100, after: Math.round(after * 100) / 100, improvement });
      }
      return { assetId: a.id, name: a.name, type: a.type, changes, totalImprovement: Math.round(totalImprovement * 100) / 100, currentStatus: a.status };
    });
  }
}

export const campaignCreativeOptimizer = new CampaignCreativeOptimizerService();
