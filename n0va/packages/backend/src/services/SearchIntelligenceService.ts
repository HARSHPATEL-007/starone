interface KeywordCluster {
  clusterId: number;
  keywords: string[];
  theme: string;
  size: number;
  avgSearchVolume: number;
  avgCompetition: number;
  avgCPC: number;
}

interface QualityScorePrediction {
  keyword: string;
  predictedScore: number;
  factors: { name: string; impact: number; direction: "positive" | "negative" }[];
  recommendations: string[];
}

interface AuctionInsight {
  keyword: string;
  domain: string;
  impressionShare: number;
  overlapRate: number;
  positionAboveRate: number;
  outrankingShare: number;
  avgBid: number;
}

interface BidRecommendation {
  keyword: string;
  currentBid: number;
  recommendedBid: number;
  expectedImpressions: number;
  expectedClicks: number;
  expectedConversions: number;
  expectedCost: number;
  expectedRevenue: number;
  expectedROAS: number;
  confidence: number;
  strategy: "aggressive" | "balanced" | "conservative";
}

interface TFIDFResult {
  terms: { term: string; tfidf: number; docFrequency: number }[];
  topTerms: string[];
}

export class SearchIntelligenceService {
  clusterKeywords(keywords: { keyword: string; searchVolume: number; competition: number; cpc: number }[], nClusters: number = 5): KeywordCluster[] {
    if (keywords.length === 0) return [];

    const n = Math.min(nClusters, keywords.length);
    const vectors = keywords.map((k) => [k.searchVolume / 100000, k.competition, k.cpc / 10]);

    const centroids: number[][] = [];
    const indices = new Set<number>();
    while (centroids.length < n) {
      const idx = Math.floor(Math.random() * vectors.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        centroids.push([...vectors[idx]]);
      }
    }

    let assignments: number[] = new Array(vectors.length).fill(0);
    for (let iter = 0; iter < 50; iter++) {
      for (let i = 0; i < vectors.length; i++) {
        let minDist = Infinity;
        let bestCluster = 0;
        for (let c = 0; c < n; c++) {
          const dist = vectors[i].reduce((s, v, j) => s + (v - centroids[c][j]) ** 2, 0);
          if (dist < minDist) { minDist = dist; bestCluster = c; }
        }
        assignments[i] = bestCluster;
      }

      for (let c = 0; c < n; c++) {
        const members = vectors.filter((_, i) => assignments[i] === c);
        if (members.length === 0) continue;
        const dims = members[0].length;
        for (let j = 0; j < dims; j++) {
          centroids[c][j] = members.reduce((s, m) => s + m[j], 0) / members.length;
        }
      }
    }

    const clusters: KeywordCluster[] = [];
    for (let c = 0; c < n; c++) {
      const members = keywords.filter((_, i) => assignments[i] === c);
      if (members.length === 0) continue;
      const theme = members.length > 0 ? members[0].keyword.split(" ").slice(0, 2).join(" ") : "unknown";
      clusters.push({
        clusterId: c,
        keywords: members.map((k) => k.keyword),
        theme,
        size: members.length,
        avgSearchVolume: Math.round(members.reduce((s, m) => s + m.searchVolume, 0) / members.length),
        avgCompetition: Math.round(members.reduce((s, m) => s + m.competition, 0) / members.length * 100) / 100,
        avgCPC: Math.round(members.reduce((s, m) => s + m.cpc, 0) / members.length * 100) / 100,
      });
    }
    return clusters;
  }

  predictQualityScore(keyword: string, history: { keyword: string; ctr: number; landingPageRelevance: number; adRelevance: number; historicalScore: number }[]): QualityScorePrediction {
    const n = history.length;
    const avgCTR = n > 0 ? history.reduce((s, h) => s + h.ctr, 0) / n : 0;
    const avgLandingRelevance = n > 0 ? history.reduce((s, h) => s + h.landingPageRelevance, 0) / n : 0;
    const avgAdRelevance = n > 0 ? history.reduce((s, h) => s + h.adRelevance, 0) / n : 0;
    const avgScore = n > 0 ? history.reduce((s, h) => s + h.historicalScore, 0) / n : 5;

    const keywordLength = keyword.split(" ").length;
    const hasBrand = keyword.toLowerCase().includes("brand");
    const exactMatchBonus = keywordLength <= 3 ? 1.5 : 0;

    const ctrFactor = Math.min(avgCTR * 20, 3);
    const landingFactor = avgLandingRelevance * 3;
    const adFactor = avgAdRelevance * 3;
    const baseScore = avgScore * 0.6;
    const lengthPenalty = keywordLength > 5 ? -1 : keywordLength > 3 ? -0.5 : 0;
    const brandBonus = hasBrand ? 1 : 0;

    const predictedScore = Math.max(1, Math.min(10, Math.round((baseScore + ctrFactor + landingFactor + adFactor + exactMatchBonus + brandBonus + lengthPenalty) * 10) / 10));

    const factors = [
      { name: "Expected CTR", impact: Math.round(ctrFactor * 10) / 10, direction: (ctrFactor > 0.5 ? "positive" : "negative") as "positive" | "negative" },
      { name: "Landing Page Relevance", impact: Math.round(landingFactor * 10) / 10, direction: (landingFactor > 1 ? "positive" : "negative") as "positive" | "negative" },
      { name: "Ad Relevance", impact: Math.round(adFactor * 10) / 10, direction: (adFactor > 1 ? "positive" : "negative") as "positive" | "negative" },
      { name: "Historical Baseline", impact: Math.round((avgScore * 0.6) * 10) / 10, direction: "positive" as "positive" },
    ];

    if (hasBrand) factors.push({ name: "Brand Match", impact: 1, direction: "positive" });
    if (keywordLength > 3) factors.push({ name: "Keyword Length", impact: lengthPenalty, direction: "negative" });

    const recommendations: string[] = [];
    if (avgCTR < 0.03) recommendations.push("Improve ad copy to increase expected CTR");
    if (avgLandingRelevance < 0.5) recommendations.push("Improve landing page relevance to keyword");
    if (avgAdRelevance < 0.5) recommendations.push("Align ad copy more closely with keyword intent");
    if (keywordLength > 4) recommendations.push("Consider shorter, more focused keyword phrases");
    if (!hasBrand) recommendations.push("Include brand terms for quality score lift");

    return { keyword, predictedScore, factors, recommendations };
  }

  analyzeAuctionInsights(keyword: string, competitors: { domain: string; avgBid: number; impressionShare: number; overlapRate: number; positionAboveRate: number }[]): AuctionInsight[] {
    return competitors.map((c) => ({
      keyword,
      domain: c.domain,
      impressionShare: Math.round(c.impressionShare * 100) / 100,
      overlapRate: Math.round(c.overlapRate * 100) / 100,
      positionAboveRate: Math.round(c.positionAboveRate * 100) / 100,
      outrankingShare: Math.round((1 - c.positionAboveRate) * 100) / 100,
      avgBid: Math.round(c.avgBid * 100) / 100,
    }));
  }

  recommendBid(
    keyword: string,
    currentBid: number,
    qualityScore: number,
    avgCPC: number,
    conversionRate: number,
    avgOrderValue: number,
    dailyBudget: number,
    strategy: "aggressive" | "balanced" | "conservative" = "balanced",
  ): BidRecommendation {
    const strategyMultipliers = { aggressive: 1.3, balanced: 1.0, conservative: 0.7 };
    const multiplier = strategyMultipliers[strategy];

    const baseBid = avgCPC * (qualityScore / 5) * multiplier;

    const valuePerConversion = conversionRate > 0 ? avgOrderValue * conversionRate : 0;
    const maxBid = valuePerConversion > 0 ? valuePerConversion * 0.5 : baseBid * 2;

    const recommendedBid = Math.min(maxBid, Math.max(baseBid, currentBid * 0.5));
    const bidChange = (recommendedBid - currentBid) / currentBid;

    const expectedImpressions = Math.max(1, Math.round(dailyBudget / recommendedBid * (qualityScore / 10)));
    const expectedClicks = Math.round(expectedImpressions * (0.01 + qualityScore * 0.005));
    const expectedConversions = Math.round(expectedClicks * conversionRate);
    const expectedCost = Math.round(recommendedBid * expectedClicks * 100) / 100;
    const expectedRevenue = Math.round(expectedConversions * avgOrderValue * 100) / 100;
    const expectedROAS = expectedCost > 0 ? Math.round((expectedRevenue / expectedCost) * 100) / 100 : 0;

    const confidence = Math.min(1, qualityScore / 10 + conversionRate);

    return {
      keyword,
      currentBid: Math.round(currentBid * 100) / 100,
      recommendedBid: Math.round(recommendedBid * 100) / 100,
      expectedImpressions,
      expectedClicks,
      expectedConversions,
      expectedCost,
      expectedRevenue,
      expectedROAS,
      confidence: Math.round(confidence * 100) / 100,
      strategy,
    };
  }

  computeTFIDF(documents: { id: string; text: string }[]): TFIDFResult[] {
    const termDocFreq = new Map<string, number>();
    const docTerms: Map<string, Map<string, number>> = new Map();

    for (const doc of documents) {
      const tokens = doc.text.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
      const termFreq = new Map<string, number>();
      const seen = new Set<string>();

      for (const token of tokens) {
        termFreq.set(token, (termFreq.get(token) || 0) + 1);
        if (!seen.has(token)) {
          termDocFreq.set(token, (termDocFreq.get(token) || 0) + 1);
          seen.add(token);
        }
      }
      docTerms.set(doc.id, termFreq);
    }

    const nd = documents.length;
    const results: TFIDFResult[] = [];

    for (const [docId, terms] of docTerms) {
      const totalTerms = [...terms.values()].reduce((a, b) => a + b, 0);
      const tfidfEntries = [...terms.entries()].map(([term, tf]) => {
        const tfNorm = tf / totalTerms;
        const idf = Math.log((nd + 1) / (1 + (termDocFreq.get(term) || 0))) + 1;
        const tfidf = tfNorm * idf;
        return { term, tfidf: Math.round(tfidf * 10000) / 10000, docFrequency: termDocFreq.get(term) || 0 };
      });

      tfidfEntries.sort((a, b) => b.tfidf - a.tfidf);
      results.push({
        terms: tfidfEntries,
        topTerms: tfidfEntries.slice(0, 10).map((t) => t.term),
      });
    }

    return results;
  }

  generateSampleKeywords(count: number = 20): { keyword: string; searchVolume: number; competition: number; cpc: number }[] {
    const topics = ["marketing automation", "email campaign", "social media ads", "PPC management", "SEO tools",
      "landing page", "conversion rate", "A/B testing", "lead generation", "content marketing",
      "retargeting", "display ads", "video marketing", "influencer marketing", "affiliate program",
      "brand awareness", "customer acquisition", "ROI tracking", "ad spend", "audience targeting"];
    return Array.from({ length: count }, (_, i) => ({
      keyword: topics[i % topics.length] + (i >= topics.length ? ` ${Math.ceil(i / topics.length)}` : ""),
      searchVolume: Math.floor(Math.random() * 50000) + 500,
      competition: Math.round(Math.random() * 100) / 100,
      cpc: Math.round((Math.random() * 8 + 0.5) * 100) / 100,
    }));
  }

  generateSampleCompetitors(keyword: string): { domain: string; avgBid: number; impressionShare: number; overlapRate: number; positionAboveRate: number }[] {
    const domains = ["competitor_a.com", "competitor_b.com", "competitor_c.com", "competitor_d.com", "competitor_e.com"];
    return domains.map((d) => ({
      domain: d,
      avgBid: Math.round((Math.random() * 5 + 1) * 100) / 100,
      impressionShare: Math.round(Math.random() * 60 + 10) / 100,
      overlapRate: Math.round(Math.random() * 0.8 + 0.1 * 100) / 100,
      positionAboveRate: Math.round(Math.random() * 0.7 * 100) / 100,
    }));
  }

  generateSampleQualityHistory(): { keyword: string; ctr: number; landingPageRelevance: number; adRelevance: number; historicalScore: number }[] {
    return [
      { keyword: "marketing automation", ctr: 0.045, landingPageRelevance: 0.7, adRelevance: 0.8, historicalScore: 7 },
      { keyword: "email campaign", ctr: 0.038, landingPageRelevance: 0.6, adRelevance: 0.7, historicalScore: 6 },
      { keyword: "social media ads", ctr: 0.052, landingPageRelevance: 0.8, adRelevance: 0.9, historicalScore: 8 },
    ];
  }
}

export const searchIntelligenceService = new SearchIntelligenceService();
