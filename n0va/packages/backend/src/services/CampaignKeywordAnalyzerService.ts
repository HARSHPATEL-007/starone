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

interface KeywordForecastPoint {
  period: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
  roas: number;
  avgPosition: number;
}

interface KeywordPerformanceForecast {
  campaignId: string;
  currentMetrics: { impressions: number; clicks: number; conversions: number; cost: number; revenue: number; roas: number };
  forecast: KeywordForecastPoint[];
  overallTrend: "improving" | "declining" | "stable";
  confidence: number;
}

interface CompetitiveKeywordMetric {
  keyword: string;
  yourBid: number;
  estCompetitorBid: number;
  competitorCount: number;
  winRate: number;
  impressionShare: number;
  competitivePressure: "low" | "medium" | "high";
  strategy: string;
}

interface MatchTypeDistribution {
  matchType: string;
  keywords: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
  roas: number;
  recommendation: string;
}

interface SeasonalPeriod {
  period: string;
  seasonalityIndex: number;
  predictedVolume: number;
  recommendedAction: string;
}

interface SeasonalityAnalysis {
  campaignId: string;
  seasonalPattern: SeasonalPeriod[];
  peakPeriod: string;
  troughPeriod: string;
  overallVolatility: "high" | "medium" | "low";
  recommendation: string;
}

interface SemanticCluster {
  clusterName: string;
  intent: "informational" | "navigational" | "commercial" | "transactional";
  keywords: string[];
  totalVolume: number;
  totalConversions: number;
  conversionRate: number;
  totalRevenue: number;
  effectiveness: string;
}

interface ROIAttributionGroup {
  groupName: string;
  keywords: number;
  totalCost: number;
  totalRevenue: number;
  roas: number;
  assistedConversions: number;
  assistedRevenue: number;
  attribution: string;
}

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

  keywordPerformanceForecast(campaignId: string, tenantId: string): KeywordPerformanceForecast {
    const analysis = this.analyzeKeywords(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "forecast");
    const currentMetrics = {
      impressions: analysis.totalImpressions, clicks: analysis.totalClicks,
      conversions: analysis.totalConversions, cost: analysis.totalCost,
      revenue: analysis.totalRevenue, roas: analysis.averageROAS,
    };
    const trendVal = (seed * 13) % 3;
    const overallTrend: "improving" | "declining" | "stable" = trendVal === 0 ? "improving" : trendVal === 1 ? "declining" : "stable";
    const periods = ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6"];
    let runningImps = analysis.totalImpressions; let runningClks = analysis.totalClicks;
    let runningConvs = analysis.totalConversions; let runningCost = analysis.totalCost;
    let runningRev = analysis.totalRevenue;
    const forecast = periods.map((period, i) => {
      const fSeed = seed + i * 19;
      const factor = overallTrend === "improving" ? (1 + 0.04 + (fSeed % 5) / 100 * (i + 1)) :
                     overallTrend === "declining" ? (1 - 0.03 - (fSeed % 4) / 100 * (i + 1)) :
                     (1 + ((fSeed % 10) - 5) / 100);
      runningImps = Math.round(runningImps * factor);
      runningClks = Math.round(runningClks * factor);
      runningConvs = Math.round(runningConvs * factor);
      runningCost = Math.round(runningCost * (1 + ((fSeed * 7) % 5 - 2) / 100));
      runningRev = Math.round(runningRev * factor);
      return {
        period, impressions: runningImps, clicks: runningClks, conversions: runningConvs,
        cost: runningCost, revenue: runningRev,
        roas: runningCost > 0 ? Math.round((runningRev / runningCost) * 100) / 100 : 0,
        avgPosition: Math.max(1, 3 + ((fSeed * 11) % 5 - 2)),
      };
    });
    const confidence = Math.round((65 + (seed % 25)) * 100) / 100;
    return { campaignId, currentMetrics, forecast, overallTrend, confidence };
  }

  keywordCompetitiveAnalysis(campaignId: string, tenantId: string): CompetitiveKeywordMetric[] {
    const analysis = this.analyzeKeywords(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "comp");
    return analysis.keywords.slice(0, 8).map((kw, i) => {
      const cSeed = seed + i * 37;
      const compCount = 3 + (cSeed % 12);
      const winRate = Math.round((30 + (cSeed % 50)) * 100) / 100;
      const impShare = Math.round((20 + (cSeed % 60)) * 100) / 100;
      const pressure: "low" | "medium" | "high" = compCount > 10 ? "high" : compCount > 6 ? "medium" : "low";
      const strategy = pressure === "high" ? `High competition (${compCount} competitors) — focus on long-tail variations and negative keywords` :
                       pressure === "medium" ? `Moderate competition — differentiate with ad copy and landing page relevance` :
                       `Low competition — capture share with aggressive bidding and broad match`;
      return {
        keyword: kw.keyword, yourBid: kw.cpc,
        estCompetitorBid: Math.round((kw.cpc * (0.9 + (cSeed % 30) / 100)) * 100) / 100,
        competitorCount: compCount, winRate, impressionShare: impShare,
        competitivePressure: pressure, strategy,
      };
    });
  }

  keywordMatchTypeAnalysis(campaignId: string, tenantId: string): MatchTypeDistribution[] {
    const analysis = this.analyzeKeywords(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "match");
    const matchTypes = ["Exact Match", "Phrase Match", "Broad Match", "Broad Match Modifier"];
    return matchTypes.map((mt, i) => {
      const mSeed = seed + i * 23;
      const share = [0.35, 0.30, 0.20, 0.15][i];
      const roasMul = [1.3, 1.1, 0.7, 0.9][i];
      const count = Math.max(1, Math.round(analysis.keywords.length * share * (0.7 + (mSeed % 50) / 100)));
      const imps = Math.round(analysis.totalImpressions * share * (0.8 + (mSeed % 40) / 100));
      const clks = Math.round(imps * analysis.averageCTR / 100 * (1 + (mSeed % 20 - 10) / 100));
      const convs = Math.round(clks * analysis.averageCVR / 100);
      const cost = Math.round(clks * analysis.averageCPC);
      const rev = Math.round(convs * (analysis.totalRevenue / Math.max(analysis.totalConversions, 1)) * roasMul);
      return {
        matchType: mt, keywords: count, impressions: imps, clicks: clks, conversions: convs,
        cost, revenue: rev, roas: cost > 0 ? Math.round((rev / cost) * 100) / 100 : 0,
        recommendation: i === 0 ? "Exact match drives highest ROAS — expand exact match coverage for top converters" :
                        i === 1 ? "Phrase match balances reach and relevance — maintain current bid strategy" :
                        i === 2 ? "Broad match has lowest ROAS — add more negative keywords and monitor search terms" :
                        "Broad match modifier offers good middle ground — test expanding BMM coverage",
      };
    });
  }

  keywordSeasonalityAnalysis(campaignId: string, tenantId: string): SeasonalityAnalysis {
    const seed = hashStr(campaignId + tenantId + "seas");
    const periods: SeasonalPeriod[] = [
      { period: "January", baseIdx: 0.8 }, { period: "February", baseIdx: 0.7 }, { period: "March", baseIdx: 0.9 },
      { period: "April", baseIdx: 1.0 }, { period: "May", baseIdx: 1.1 }, { period: "June", baseIdx: 1.2 },
      { period: "July", baseIdx: 1.0 }, { period: "August", baseIdx: 1.1 }, { period: "September", baseIdx: 1.3 },
      { period: "October", baseIdx: 1.2 }, { period: "November", baseIdx: 1.5 }, { period: "December", baseIdx: 1.4 },
    ].map((p, i) => {
      const pSeed = seed + i * 13;
      const idx = Math.round((p.baseIdx + ((pSeed % 20) - 10) / 100) * 100) / 100;
      return {
        period: p.period, seasonalityIndex: idx,
        predictedVolume: 1000 + Math.round(idx * 5000 + (pSeed % 2000)),
        recommendedAction: idx > 1.2 ? `Peak season — increase keyword bids by ${Math.round((idx - 1) * 100)}%, expand match types` :
                           idx < 0.8 ? `Low season — reduce bids by ${Math.round((1 - idx) * 100)}%, focus on efficiency` :
                           `Steady period — maintain current strategy with minor optimization`,
      };
    });
    const peak = periods.reduce((best, p) => p.seasonalityIndex > best.seasonalityIndex ? p : best, periods[0]);
    const trough = periods.reduce((worst, p) => p.seasonalityIndex < worst.seasonalityIndex ? p : worst, periods[0]);
    const values = periods.map(p => p.seasonalityIndex);
    const variance = values.reduce((s, v) => s + Math.pow(v - 1, 2), 0) / values.length;
    const volatility: "high" | "medium" | "low" = variance > 0.05 ? "high" : variance > 0.02 ? "medium" : "low";
    return { campaignId, seasonalPattern: periods, peakPeriod: peak.period, troughPeriod: trough.period, overallVolatility: volatility, recommendation: volatility === "high" ? `High seasonality detected — peak in ${peak.period}, trough in ${trough.period}. Implement seasonal bid adjustments.` : `Moderate seasonality — plan budget around ${peak.period} peak and ${trough.period} low.` };
  }

  keywordSemanticClustering(campaignId: string, tenantId: string): SemanticCluster[] {
    const analysis = this.analyzeKeywords(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "sem");
    const clusters: SemanticCluster[] = [
      { name: "Brand & Awareness", intent: "informational" as const, count: 3 },
      { name: "Product Research", intent: "commercial" as const, count: 4 },
      { name: "Purchase Intent", intent: "transactional" as const, count: 3 },
      { name: "Comparison & Evaluation", intent: "commercial" as const, count: 3 },
      { name: "Problem & Solution", intent: "informational" as const, count: 3 },
      { name: "Loyalty & Retention", intent: "navigational" as const, count: 2 },
    ];
    let kwIdx = 0;
    return clusters.map((c, i) => {
      const cSeed = seed + i * 29;
      const groupKws = analysis.keywords.slice(kwIdx, kwIdx + c.count);
      kwIdx += c.count;
      const totalVol = groupKws.reduce((s, kw) => s + kw.impressions, 0);
      const totalConvs = groupKws.reduce((s, kw) => s + kw.conversions, 0);
      const totalRev = groupKws.reduce((s, kw) => s + kw.revenue, 0);
      const cvr = groupKws.length > 0 ? Math.round((totalConvs / Math.max(groupKws.reduce((s, kw) => s + kw.clicks, 0), 1)) * 10000) / 100 : 0;
      const eff = c.intent === "transactional" ? `High purchase intent — ${cvr}% CVR, $${totalRev} revenue` :
                  c.intent === "commercial" ? `Research phase — nurture with detailed content, ${cvr}% CVR` :
                  `Awareness stage — focus on reach and engagement, low immediate conversion`;
      return { clusterName: c.name, intent: c.intent, keywords: groupKws.map(k => k.keyword), totalVolume: totalVol, totalConversions: totalConvs, conversionRate: cvr, totalRevenue: totalRev, effectiveness: eff };
    });
  }

  keywordROIAttribution(campaignId: string, tenantId: string): ROIAttributionGroup[] {
    const analysis = this.analyzeKeywords(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "roiattr");
    const groups = [
      { name: "Direct Conversion Keywords", share: 0.40, assistShare: 0.10 },
      { name: "Assisted Conversion Keywords", share: 0.25, assistShare: 0.35 },
      { name: "Brand Keywords", share: 0.20, assistShare: 0.05 },
      { name: "Discovery Keywords", share: 0.15, assistShare: 0.50 },
    ];
    let kwIdx = 0;
    return groups.map((g, i) => {
      const gSeed = seed + i * 41;
      const count = Math.max(2, Math.round(analysis.keywords.length * g.share * (0.8 + (gSeed % 40) / 100)));
      const groupKws = analysis.keywords.slice(kwIdx, kwIdx + count);
      kwIdx += count;
      const totalCost = groupKws.reduce((s, kw) => s + kw.cost, 0);
      const totalRev = groupKws.reduce((s, kw) => s + kw.revenue, 0);
      const roas = totalCost > 0 ? Math.round((totalRev / totalCost) * 100) / 100 : 0;
      const assistedConvs = Math.round(groupKws.reduce((s, kw) => s + kw.conversions, 0) * g.assistShare);
      const assistedRev = Math.round(totalRev * g.assistShare);
      const attr = g.name.includes("Direct") ? `Last-click: ${roas}x ROAS, assists add ${Math.round(g.assistShare * 100)}% more value` :
                   g.name.includes("Assisted") ? `Assist-heavy: ${roas}x direct ROAS, assisted conversions add ${Math.round(g.assistShare * 100)}% incremental revenue` :
                   g.name.includes("Brand") ? `Brand defense: ${roas}x ROAS — critical for protecting branded search share` :
                   `Top-of-funnel: ${roas}x ROAS directly, but enables ${Math.round(g.assistShare * 100)}% of conversions across other groups`;
      return { groupName: g.name, keywords: groupKws.length, totalCost, totalRevenue: totalRev, roas, assistedConversions: assistedConvs, assistedRevenue: assistedRev, attribution: attr };
    });
  }
}

export const campaignKeywordAnalyzer = new CampaignKeywordAnalyzerService();
