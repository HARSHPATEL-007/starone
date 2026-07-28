import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";

interface KeywordMetric {
  keyword: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
  ctr: number;
  cvr: number;
  cpc: number;
  roas: number;
  qualityScore: number;
  competition: "low" | "medium" | "high";
}

interface KeywordAnalysis {
  tenantId: string;
  campaignId: string;
  campaignName: string;
  keywords: KeywordMetric[];
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalCost: number;
  totalRevenue: number;
  averageCTR: number;
  averageCVR: number;
  averageCPC: number;
  averageROAS: number;
  topKeywords: KeywordMetric[];
  underperformers: KeywordMetric[];
  opportunities: KeywordMetric[];
}

interface KeywordGap {
  topic: string;
  volume: number;
  difficulty: number;
  relevanceScore: number;
  opportunity: string;
  estimatedTraffic: number;
  suggestedKeywords: string[];
}

interface KeywordCluster {
  clusterName: string;
  keywords: string[];
  volume: number;
  avgCpc: number;
  totalConversions: number;
  combinedRoas: number;
  recommendation: string;
}

interface KeywordRecommendation {
  keyword: string;
  currentBid: number;
  suggestedBid: number;
  reason: string;
  expectedImpact: string;
  priority: "high" | "medium" | "low";
}

interface KeywordTrend {
  date: string;
  impressions: number;
  clicks: number;
  avgPosition: number;
  topKeyword: string;
}

const KEYWORD_POOL = [
  "brand awareness", "product launch", "target audience", "marketing ROI", "lead generation",
  "conversion optimization", "digital strategy", "social media ads", "PPC management",
  "content marketing", "email campaign", "retargeting ads", "A/B testing", "audience segmentation",
  "landing page optimization", "ad creative", "campaign analytics", "budget allocation",
  "customer acquisition", "brand loyalty", "market research", "competitive analysis",
  "influencer marketing", "video advertising", "display network", "search advertising",
  "mobile marketing", "cross-channel strategy", "customer journey", "funnel optimization",
  "programmatic buying", "native advertising", "remarketing lists", "lookalike audiences",
  "customer lifetime value", "attribution modeling", "seasonal promotion", "geo-targeting",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const COMP_LEVELS: ("low" | "medium" | "high")[] = ["low", "medium", "high"];

export class CampaignKeywordAnalyzerService {
  analyzeKeywords(campaignId: string, tenantId: string): KeywordAnalysis {
    const seed = hashStr(campaignId + tenantId);
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const campaign = portfolio.analyses.find((a: any) => a.campaignId === campaignId);
    const campaignName = campaign?.campaignName || `Campaign ${campaignId.slice(0, 8)}`;
    const numKw = 12 + (seed % 8);

    const keywords: KeywordMetric[] = [];
    for (let i = 0; i < numKw; i++) {
      const kwSeed = seed + i * 17;
      const kw = KEYWORD_POOL[(kwSeed * 7) % KEYWORD_POOL.length];
      const impressions = 500 + (kwSeed % 9500);
      const clicks = Math.round(impressions * (0.01 + ((kwSeed * 3) % 90) / 1000));
      const convs = Math.round(clicks * (0.02 + ((kwSeed * 11) % 80) / 1000));
      const cost = Math.round(clicks * (0.5 + ((kwSeed * 13) % 200) / 100));
      const revenue = Math.round(convs * (10 + (kwSeed % 190)));
      keywords.push({
        keyword: kw, impressions, clicks, conversions: convs, cost, revenue,
        ctr: Math.round(clicks / Math.max(impressions, 1) * 10000) / 100,
        cvr: Math.round(convs / Math.max(clicks, 1) * 10000) / 100,
        cpc: Math.round(cost / Math.max(clicks, 1) * 100) / 100,
        roas: Math.round(revenue / Math.max(cost, 1) * 100) / 100,
        qualityScore: 3 + ((kwSeed * 23) % 8),
        competition: COMP_LEVELS[(kwSeed * 31) % COMP_LEVELS.length],
      });
    }

    const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);
    const totalImp = sum(keywords.map(k => k.impressions));
    const totalClk = sum(keywords.map(k => k.clicks));
    const totalCnv = sum(keywords.map(k => k.conversions));
    const totalCst = sum(keywords.map(k => k.cost));
    const totalRev = sum(keywords.map(k => k.revenue));

    const sortedByConv = [...keywords].sort((a, b) => b.conversions - a.conversions);
    const sortedByRoas = [...keywords].sort((a, b) => a.roas - b.roas);

    return {
      tenantId, campaignId, campaignName, keywords,
      totalImpressions: totalImp, totalClicks: totalClk, totalConversions: totalCnv,
      totalCost: totalCst, totalRevenue: totalRev,
      averageCTR: totalImp > 0 ? Math.round(totalClk / totalImp * 10000) / 100 : 0,
      averageCVR: totalClk > 0 ? Math.round(totalCnv / totalClk * 10000) / 100 : 0,
      averageCPC: totalClk > 0 ? Math.round(totalCst / totalClk * 100) / 100 : 0,
      averageROAS: totalCst > 0 ? Math.round(totalRev / totalCst * 100) / 100 : 0,
      topKeywords: sortedByConv.slice(0, 3),
      underperformers: sortedByRoas.filter(k => k.roas < 100).slice(0, 3),
      opportunities: keywords.filter(k => k.roas > 200 && k.qualityScore < 7).slice(0, 3),
    };
  }

  identifyKeywordGaps(campaignId: string, tenantId: string): KeywordGap[] {
    const seed = hashStr(campaignId + tenantId + "gap");
    const topics = [
      { topic: "Long-tail brand variations", kw: ["brand + near me", "brand reviews", "brand pricing", "brand alternatives", "brand vs competitor"] },
      { topic: "Problem/solution keywords", kw: ["how to fix X", "X solution", "X alternatives", "best way to X", "X help"] },
      { topic: "Comparison keywords", kw: ["X vs Y", "X or Y", "X compared to Y", "switch from X to Y", "X better than Y"] },
      { topic: "Buying-intent modifiers", kw: ["buy X online", "X discount", "X coupon", "X deals", "cheap X"] },
      { topic: "Industry trends", kw: ["X trends 2025", "future of X", "X statistics", "X market size", "X growth"] },
      { topic: "Use case keywords", kw: ["X for small business", "X for enterprise", "X case study", "X examples", "X success stories"] },
    ];
    return topics.map((t, i) => {
      const tSeed = seed + i * 31;
      return {
        topic: t.topic,
        volume: 100 + (tSeed % 900),
        difficulty: 20 + (tSeed % 60),
        relevanceScore: 60 + (tSeed % 35),
        opportunity: t.topic.includes("Long-tail") ? `Add ${t.topic} to capture bottom-funnel intent` :
                     t.topic.includes("Problem") ? `Target ${t.topic} to attract problem-aware prospects` :
                     t.topic.includes("Comparison") ? `Create ${t.topic} content to capture comparison shoppers` :
                     t.topic.includes("Buying") ? `Bid on ${t.topic} for high-intent conversions` :
                     `Build content around ${t.topic} for top-of-funnel reach`,
        estimatedTraffic: 50 + (tSeed % 450),
        suggestedKeywords: t.kw.map(k => k.replace("X", "digital marketing")),
      };
    });
  }

  clusterKeywords(campaignId: string, tenantId: string): KeywordCluster[] {
    const analysis = this.analyzeKeywords(campaignId, tenantId);
    const clusters: KeywordCluster[] = [];
    const kws = analysis.keywords;
    const clusterSize = Math.max(2, Math.floor(kws.length / 3));

    const clusterNames = ["Brand & Awareness", "Performance & Conversion", "Niche & Long-tail"];
    for (let c = 0; c < 3; c++) {
      const start = c * clusterSize;
      const end = c === 2 ? kws.length : start + clusterSize;
      const group = kws.slice(start, end);
      if (group.length === 0) continue;
      clusters.push({
        clusterName: clusterNames[c],
        keywords: group.map(k => k.keyword),
        volume: Math.round(group.reduce((s, k) => s + k.impressions, 0) / group.length),
        avgCpc: Math.round(group.reduce((s, k) => s + k.cpc, 0) / group.length * 100) / 100,
        totalConversions: group.reduce((s, k) => s + k.conversions, 0),
        combinedRoas: Math.round(group.reduce((s, k) => s + k.roas, 0) / group.length * 100) / 100,
        recommendation: c === 0 ? "Maintain brand keyword bids — strong ROAS with room for expanded match types" :
                        c === 1 ? "Increase bids on high-converting keywords, pause underperformers below 2x ROAS" :
                        "Add negative keywords to filter irrelevant traffic, expand with broad match modifier",
      });
    }
    return clusters;
  }

  generateBidRecommendations(campaignId: string, tenantId: string): KeywordRecommendation[] {
    const analysis = this.analyzeKeywords(campaignId, tenantId);
    return analysis.keywords.filter(k => k.roas < 150 || k.qualityScore < 6).slice(0, 5).map(k => {
      const suggested = k.roas < 100 ? Math.round(k.cpc * 0.7 * 100) / 100 :
                        k.roas < 150 ? Math.round(k.cpc * 0.85 * 100) / 100 :
                        Math.round(k.cpc * 1.15 * 100) / 100;
      const reason = k.roas < 100 ? `Low ROAS (${k.roas}%) — reduce bid to improve efficiency` :
                     k.qualityScore < 6 ? `Quality Score ${k.qualityScore} — adjust bid while improving ad relevance` :
                     `Opportunity to increase bid for expanding keyword`;
      return {
        keyword: k.keyword, currentBid: k.cpc, suggestedBid: suggested,
        reason, expectedImpact: k.roas < 100 ? `${Math.round((1 - suggested / k.cpc) * 100)}% cost reduction expected` :
                                 `${Math.round((suggested / k.cpc - 1) * 100)}% impression increase expected`,
        priority: k.roas < 100 ? "high" as const : k.qualityScore < 5 ? "high" as const : "medium" as const,
      };
    });
  }

  analyzeKeywordTrends(campaignId: string, tenantId: string): KeywordTrend[] {
    const seed = hashStr(campaignId + tenantId + "trend");
    const trends: KeywordTrend[] = [];
    for (let w = 0; w < 8; w++) {
      const wSeed = seed + w * 13;
      trends.push({
        date: new Date(2025, 0, 1 + w * 7).toISOString().split("T")[0],
        impressions: 2000 + (wSeed % 8000),
        clicks: 40 + (wSeed % 360),
        avgPosition: 1 + ((wSeed * 7) % 8),
        topKeyword: KEYWORD_POOL[(wSeed * 23) % KEYWORD_POOL.length],
      });
    }
    return trends;
  }

  analyzeSearchTermOverlap(campaignId: string, tenantIdA: string, tenantIdB: string): { sharedKeywords: number; uniqueToA: number; uniqueToB: number; overlapRate: number; recommendation: string } {
    const a = this.analyzeKeywords(campaignId, tenantIdA);
    const b = this.analyzeKeywords(campaignId, tenantIdB);
    const kwA = new Set(a.keywords.map(k => k.keyword));
    const kwB = new Set(b.keywords.map(k => k.keyword));
    const shared = [...kwA].filter(k => kwB.has(k)).length;
    const uniqueA = kwA.size - shared;
    const uniqueB = kwB.size - shared;
    const overlapRate = Math.max(kwA.size, kwB.size) > 0 ? Math.round(shared / Math.max(kwA.size, kwB.size) * 10000) / 100 : 0;
    return {
      sharedKeywords: shared, uniqueToA: uniqueA, uniqueToB: uniqueB, overlapRate,
      recommendation: overlapRate > 50 ? `High overlap (${overlapRate}%) — coordinate keyword strategy between tenants to avoid bid competition` :
                      overlapRate > 25 ? `Moderate overlap — review shared keywords for differentiated bidding strategies` :
                      `Low overlap — tenants target distinct keyword sets; maintain separate strategies`,
    };
  }
}

export const campaignKeywordAnalyzer = new CampaignKeywordAnalyzerService();
