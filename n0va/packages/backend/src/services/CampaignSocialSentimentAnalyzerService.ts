import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";

interface Mention {
  id: string;
  source: string;
  platform: string;
  content: string;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  sentimentScore: number;
  engagement: number;
  reach: number;
  date: string;
  influencerFollowerCount: number;
  topic: string;
}

interface SentimentAnalysis {
  tenantId: string;
  campaignId: string;
  campaignName: string;
  mentions: Mention[];
  totalMentions: number;
  totalReach: number;
  totalEngagement: number;
  positivePercent: number;
  negativePercent: number;
  neutralPercent: number;
  mixedPercent: number;
  averageSentimentScore: number;
  dominantEmotion: string;
  topPositiveTopics: { topic: string; mentions: number }[];
  topNegativeTopics: { topic: string; mentions: number }[];
  overallAssessment: string;
}

interface TrendingTopic {
  topic: string;
  mentionCount: number;
  sentiment: number;
  momentum: number;
  relatedKeywords: string[];
  platforms: string[];
  recommendation: string;
}

interface InfluencerMention {
  influencer: string;
  followerCount: number;
  platform: string;
  mentionCount: number;
  sentiment: string;
  avgEngagement: number;
  reach: number;
  brandAffinity: number;
  collaborationPotential: string;
}

interface PlatformSentiment {
  platform: string;
  mentions: number;
  reach: number;
  positivePercent: number;
  negativePercent: number;
  avgSentiment: number;
  dominantEmotion: string;
  recommendation: string;
}

interface EmotionalTone {
  emotion: string;
  percentage: number;
  mentionCount: number;
  trending: "up" | "down" | "stable";
  interpretation: string;
}

interface SentimentTrend {
  date: string;
  mentions: number;
  positivePercent: number;
  negativePercent: number;
  avgSentiment: number;
  topTopic: string;
}

interface SentimentKeywordAnalysis {
  campaignId: string;
  keywords: { keyword: string; mentionCount: number; sentiment: number; frequency: number; context: string }[];
  topPositiveKeyword: string;
  topNegativeKeyword: string;
  avgKeywordSentiment: number;
}

interface CompetitorSentimentComparison {
  campaignId: string;
  brandSentiment: number;
  competitors: { name: string; sentiment: number; shareOfVoice: number; topTopic: string }[];
  rank: number;
  totalCompetitors: number;
  advantage: string;
}

interface SentimentAlertThreshold {
  campaignId: string;
  thresholds: { metric: string; currentValue: number; threshold: number; breached: boolean; severity: string; alert: string }[];
  breachCount: number;
  overallStatus: string;
}

interface SentimentActionableInsight {
  campaignId: string;
  insights: { area: string; insight: string; suggestedAction: string; priority: string; expectedImpact: string }[];
  totalInsights: number;
  topPriority: string;
}

interface ShareOfVoice {
  campaignId: string;
  totalMentions: number;
  brandMentions: number;
  share: number;
  competitors: { name: string; mentions: number; share: number; sentiment: number }[];
  trend: string;
  recommendation: string;
}

interface SentimentForecast {
  campaignId: string;
  periods: { period: string; predictedScore: number; confidence: string; range: { low: number; high: number } }[];
  overallOutlook: string;
  riskLevel: string;
  keyDriver: string;
}

const TOPICS = [
  "Product Quality", "Customer Service", "Pricing", "Brand Reputation",
  "Feature Requests", "User Experience", "Competitor Comparison", "Industry News",
  "Marketing Campaign", "Partnerships", "Community Engagement", "Innovation",
];

const PLATFORMS = ["Twitter/X", "LinkedIn", "Reddit", "Facebook", "Instagram", "YouTube", "TikTok", "Industry Forums"];

const INFLUENCERS = [
  { name: "TechReviewPro", platform: "YouTube", followers: 250000 },
  { name: "DigitalSarah", platform: "Twitter/X", followers: 45000 },
  { name: "GrowthHackerMike", platform: "LinkedIn", followers: 85000 },
  { name: "MarketingMaven", platform: "Instagram", followers: 120000 },
  { name: "IndustryWatcher", platform: "Industry Forums", followers: 15000 },
  { name: "AdInsider", platform: "Reddit", followers: 30000 },
];

const EMOTIONS = ["Joy", "Trust", "Anticipation", "Surprise", "Sadness", "Anger", "Fear", "Disgust"];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function seededRandom(seed: string): () => number {
  let state = hashStr(seed);
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

export class CampaignSocialSentimentAnalyzerService {
  analyzeSentiment(campaignId: string, tenantId: string): SentimentAnalysis {
    const seed = hashStr(campaignId + tenantId);
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const campaign = portfolio.analyses.find((a: any) => a.campaignId === campaignId);
    const campaignName = campaign?.campaignName || `Campaign ${campaignId.slice(0, 8)}`;
    const numMentions = 20 + (seed % 30);

    const sentiments: ("positive" | "negative" | "neutral" | "mixed")[] = ["positive", "negative", "neutral", "mixed"];
    const mentions: Mention[] = [];
    const topicCounts = new Map<string, number>();
    const negTopicCounts = new Map<string, number>();
    let totalReach = 0;
    let totalEng = 0;
    let scoreSum = 0;

    for (let i = 0; i < numMentions; i++) {
      const mSeed = seed + i * 29;
      const sentiment = sentiments[(mSeed * 7) % sentiments.length];
      const score = sentiment === "positive" ? 0.3 + ((mSeed % 70) / 100) :
                    sentiment === "negative" ? -(0.2 + ((mSeed % 60) / 100)) :
                    sentiment === "mixed" ? ((mSeed % 40) - 20) / 100 : ((mSeed % 40) - 20) / 100;
      const platform = PLATFORMS[(mSeed * 11) % PLATFORMS.length];
      const topic = TOPICS[(mSeed * 13) % TOPICS.length];
      const reach = 100 + (mSeed % 9900);
      const eng = Math.round(reach * (0.001 + ((mSeed * 3) % 50) / 1000));
      const infl = mSeed % 5 === 0 ? INFLUENCERS[(mSeed * 17) % INFLUENCERS.length].followers : 0;
      totalReach += reach;
      totalEng += eng;
      scoreSum += score;

      if (sentiment === "positive") topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      if (sentiment === "negative") negTopicCounts.set(topic, (negTopicCounts.get(topic) || 0) + 1);

      mentions.push({
        id: `mention_${campaignId}_${i}`, source: ["Organic", "Sponsored", "Share", "Review"][mSeed % 4],
        platform, content: `[${topic}] ${sentiment === "positive" ? "Great experience with" : sentiment === "negative" ? "Disappointed with" : "Thoughts on"} ${campaignName} ${["#campaign", "#marketing", "#advertising", ""][mSeed % 4]}`,
        sentiment, sentimentScore: Math.round(score * 1000) / 1000,
        engagement: eng, reach, date: new Date(2025, 0, 1 + (mSeed % 90)).toISOString().split("T")[0],
        influencerFollowerCount: infl, topic,
      });
    }

    const posCount = mentions.filter(m => m.sentiment === "positive").length;
    const negCount = mentions.filter(m => m.sentiment === "negative").length;
    const neuCount = mentions.filter(m => m.sentiment === "neutral").length;
    const mixCount = mentions.filter(m => m.sentiment === "mixed").length;

    const sortedPos = Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1]);
    const sortedNeg = Array.from(negTopicCounts.entries()).sort((a, b) => b[1] - a[1]);

    let overall = "";
    const avgScore = numMentions > 0 ? scoreSum / numMentions : 0;
    if (avgScore > 0.15) overall = `Strong positive sentiment (avg ${Math.round(avgScore * 1000) / 10}/10) — campaign resonating well with audience`;
    else if (avgScore > 0) overall = `Slightly positive sentiment — opportunities to amplify positive topics: ${sortedPos.slice(0, 2).map(t => t[0]).join(", ")}`;
    else if (avgScore > -0.1) overall = `Neutral sentiment — low engagement; consider refreshing creative and messaging`;
    else overall = `Concerning negative sentiment — address top complaint areas: ${sortedNeg.slice(0, 2).map(t => t[0]).join(", ")}`;

    const dominantEmotion = avgScore > 0.2 ? "Joy" : avgScore > 0 ? "Trust" : avgScore > -0.1 ? "Anticipation" : "Anger";

    return {
      tenantId, campaignId, campaignName, mentions, totalMentions: numMentions, totalReach, totalEngagement: totalEng,
      positivePercent: numMentions > 0 ? Math.round(posCount / numMentions * 10000) / 100 : 0,
      negativePercent: numMentions > 0 ? Math.round(negCount / numMentions * 10000) / 100 : 0,
      neutralPercent: numMentions > 0 ? Math.round(neuCount / numMentions * 10000) / 100 : 0,
      mixedPercent: numMentions > 0 ? Math.round(mixCount / numMentions * 10000) / 100 : 0,
      averageSentimentScore: Math.round(avgScore * 1000) / 1000,
      dominantEmotion, overallAssessment: overall,
      topPositiveTopics: sortedPos.slice(0, 3).map(([t, c]) => ({ topic: t, mentions: c })),
      topNegativeTopics: sortedNeg.slice(0, 3).map(([t, c]) => ({ topic: t, mentions: c })),
    };
  }

  analyzeTrendingTopics(campaignId: string, tenantId: string): TrendingTopic[] {
    const analysis = this.analyzeSentiment(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "trending");
    return TOPICS.slice(0, 6).map((topic, i) => {
      const tSeed = seed + i * 17;
      const topicMentions = analysis.mentions.filter(m => m.topic === topic);
      const avgSent = topicMentions.length > 0 ? topicMentions.reduce((s, m) => s + m.sentimentScore, 0) / topicMentions.length : 0;
      return {
        topic, mentionCount: topicMentions.length,
        sentiment: Math.round(avgSent * 100) / 100,
        momentum: Math.round((5 + (tSeed % 30)) * 100) / 100,
        relatedKeywords: [`${topic} trends`, `${topic} 2025`, `${topic} best practices`, `${topic} tips`],
        platforms: [PLATFORMS[(tSeed * 7) % PLATFORMS.length], PLATFORMS[(tSeed * 11) % PLATFORMS.length]],
        recommendation: avgSent > 0.1 ? `Leverage positive ${topic.toLowerCase()} sentiment in upcoming campaigns` :
                        avgSent < -0.1 ? `Address negative ${topic.toLowerCase()} feedback with targeted response campaign` :
                        `Monitor ${topic.toLowerCase()} — create content to drive conversation`,
      };
    });
  }

  analyzeInfluencerImpact(campaignId: string, tenantId: string): InfluencerMention[] {
    const analysis = this.analyzeSentiment(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "infl");
    return INFLUENCERS.map((inf, i) => {
      const iSeed = seed + i * 23;
      const inflMentions = analysis.mentions.filter(m => m.influencerFollowerCount > 0 && (iSeed % 5 === i % 5));
      const count = Math.max(1, inflMentions.length + (iSeed % 3));
      const avgEng = 50 + (iSeed % 450);
      const reach = inf.followers * avgEng / 100;
      return {
        influencer: inf.name, followerCount: inf.followers, platform: inf.platform,
        mentionCount: count,
        sentiment: iSeed % 3 === 0 ? "positive" : iSeed % 3 === 1 ? "neutral" : "mixed",
        avgEngagement: avgEng, reach: Math.round(reach),
        brandAffinity: 40 + (iSeed % 50),
        collaborationPotential: iSeed % 4 === 0 ? "High — strong audience alignment and engagement" :
                               iSeed % 4 === 1 ? "Medium — explore targeted partnership for specific campaign" :
                               iSeed % 4 === 2 ? "Low — consider micro-influencers in same niche instead" :
                               "Monitor — growing relevance, revisit in 3 months",
      };
    });
  }

  analyzePlatformSentiment(campaignId: string, tenantId: string): PlatformSentiment[] {
    const analysis = this.analyzeSentiment(campaignId, tenantId);
    const byPlatform = new Map<string, Mention[]>();
    for (const m of analysis.mentions) {
      const arr = byPlatform.get(m.platform) || [];
      arr.push(m);
      byPlatform.set(m.platform, arr);
    }
    return Array.from(byPlatform.entries()).map(([platform, mentions]) => {
      const pos = mentions.filter(m => m.sentiment === "positive").length;
      const neg = mentions.filter(m => m.sentiment === "negative").length;
      const avgSent = mentions.reduce((s, m) => s + m.sentimentScore, 0) / mentions.length;
      const totals = mentions.reduce((acc, m) => ({ reach: acc.reach + m.reach, eng: acc.eng + m.engagement }), { reach: 0, eng: 0 });
      return {
        platform, mentions: mentions.length, reach: totals.reach,
        positivePercent: mentions.length > 0 ? Math.round(pos / mentions.length * 10000) / 100 : 0,
        negativePercent: mentions.length > 0 ? Math.round(neg / mentions.length * 10000) / 100 : 0,
        avgSentiment: Math.round(avgSent * 1000) / 1000,
        dominantEmotion: avgSent > 0.15 ? "Joy" : avgSent > 0.05 ? "Trust" : avgSent > -0.05 ? "Anticipation" : avgSent > -0.15 ? "Sadness" : "Anger",
        recommendation: avgSent > 0.1 ? `${platform} shows positive sentiment — increase posting frequency and engagement` :
                        avgSent < -0.1 ? `${platform} has negative sentiment — audit recent posts and respond to criticism` :
                        `${platform} sentiment is neutral — test different content formats to drive conversation`,
      };
    }).sort((a, b) => b.mentions - a.mentions);
  }

  analyzeEmotionalTone(campaignId: string, tenantId: string): EmotionalTone[] {
    const analysis = this.analyzeSentiment(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "emotion");
    const dirs: ("up" | "down" | "stable")[] = ["up", "down", "stable"];
    return EMOTIONS.map((emotion, i) => {
      const eSeed = seed + i * 19;
      const mentions = analysis.mentions.filter(m => {
        const idx = Math.abs(hashStr(m.content)) % EMOTIONS.length;
        return idx === i;
      }).length;
      const pct = analysis.totalMentions > 0 ? mentions / analysis.totalMentions * 100 : 0;
      return {
        emotion, percentage: Math.round(pct * 100) / 100, mentionCount: mentions,
        trending: dirs[(eSeed * 7) % dirs.length],
        interpretation: emotion === "Joy" && pct > 20 ? "Strong positive emotional response — reinforces brand loyalty" :
                        emotion === "Anger" && pct > 15 ? "Elevated anger levels — investigate triggers and respond" :
                        emotion === "Trust" && pct > 15 ? "Trust is building — continue transparent communication" :
                        emotion === "Fear" && pct > 10 ? "Anxiety detected — provide reassuring messaging" :
                        `${emotion} is within normal range — continue monitoring`,
      };
    });
  }

  analyzeSentimentTrends(campaignId: string, tenantId: string): SentimentTrend[] {
    const analysis = this.analyzeSentiment(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "sentrend");
    const trends: SentimentTrend[] = [];
    for (let w = 0; w < 8; w++) {
      const wSeed = seed + w * 17;
      const mentions = 15 + (wSeed % 35);
      const pos = 30 + ((wSeed * 7) % 50);
      const neg = 5 + ((wSeed * 11) % 25);
      trends.push({
        date: new Date(2025, 0, 1 + w * 7).toISOString().split("T")[0],
        mentions, positivePercent: Math.round(pos * 100) / 100,
        negativePercent: Math.round(neg * 100) / 100,
        avgSentiment: Math.round(((pos - neg) / 100) * 1000) / 1000,
        topTopic: TOPICS[(wSeed * 13) % TOPICS.length],
      });
    }
    return trends;
  }

  sentimentKeywordAnalysis(campaignId: string, tenantId: string): SentimentKeywordAnalysis {
    const analysis = this.analyzeSentiment(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "keyword");
    const keywords: SentimentKeywordAnalysis["keywords"] = [];
    const wordPool = ["quality", "price", "support", "value", "innovation", "trust", "service", "experience", "design", "features"];
    let topPosKw = "", topNegKw = "", maxPos = -Infinity, minNeg = Infinity;
    let totalSent = 0;
    for (let i = 0; i < wordPool.length; i++) {
      const kwSeed = seed + i * 13;
      const mentionCount = 5 + (kwSeed % 25);
      const sentiment = Math.round(((kwSeed % 100) / 100) * 2 - 1);
      const frequency = Math.round((mentionCount / analysis.totalMentions) * 10000) / 100;
      const contexts = ["positive customer reviews", "neutral discussions", "negative feedback", "comparative mentions"];
      keywords.push({ keyword: wordPool[i], mentionCount, sentiment, frequency, context: contexts[kwSeed % contexts.length] });
      totalSent += sentiment;
      if (sentiment > maxPos) { maxPos = sentiment; topPosKw = wordPool[i]; }
      if (sentiment < minNeg) { minNeg = sentiment; topNegKw = wordPool[i]; }
    }
    return {
      campaignId, keywords, topPositiveKeyword: topPosKw,
      topNegativeKeyword: topNegKw,
      avgKeywordSentiment: Math.round(totalSent / wordPool.length * 100) / 100,
    };
  }

  sentimentCompetitorComparison(campaignId: string, tenantId: string): CompetitorSentimentComparison {
    const analysis = this.analyzeSentiment(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "comp");
    const competitors = ["CompetitorA", "CompetitorB", "CompetitorC", "CompetitorD"];
    const compResults = competitors.map((name, i) => {
      const cSeed = seed + i * 17;
      return { name, sentiment: Math.round(((cSeed % 100) / 100) * 2 - 1), shareOfVoice: 10 + (cSeed % 30), topTopic: TOPICS[(cSeed * 13) % TOPICS.length] };
    });
    const brandSentiment = analysis.averageSentimentScore;
    const all = [{ name: "Brand", sentiment: brandSentiment, shareOfVoice: 0, topTopic: "" }, ...compResults];
    const sorted = [...all].sort((a, b) => b.sentiment - a.sentiment);
    const rank = sorted.findIndex(s => s.name === "Brand") + 1;
    const better = sorted.filter(s => s.sentiment > brandSentiment && s.name !== "Brand");
    const advantage = better.length === 0 ? "Leading — no competitor has higher sentiment" : `Trailing ${better.length} competitor(s) — investigate their strategy`;
    return {
      campaignId, brandSentiment: Math.round(brandSentiment * 100) / 100,
      competitors: compResults, rank, totalCompetitors: competitors.length, advantage,
    };
  }

  sentimentAlertThresholds(campaignId: string, tenantId: string): SentimentAlertThreshold {
    const analysis = this.analyzeSentiment(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "alert_thresh");
    const rng = seededRandom(seed + "_alert_thresh");
    const thresholds: SentimentAlertThreshold["thresholds"] = [
      { metric: "avg_sentiment", currentValue: analysis.averageSentimentScore, threshold: 0.2, breached: analysis.averageSentimentScore < 0.2, severity: analysis.averageSentimentScore < 0.2 ? "warning" : "ok", alert: analysis.averageSentimentScore < 0.2 ? "Average sentiment below safe threshold" : "Sentiment within acceptable range" },
      { metric: "negative_percent", currentValue: analysis.negativePercent, threshold: 25, breached: analysis.negativePercent > 25, severity: analysis.negativePercent > 25 ? "critical" : "ok", alert: analysis.negativePercent > 25 ? "Negative sentiment percentage exceeds 25% threshold" : "Negative percentage within limits" },
      { metric: "mention_volume", currentValue: analysis.totalMentions, threshold: 15, breached: analysis.totalMentions < 15, severity: analysis.totalMentions < 15 ? "warning" : "ok", alert: analysis.totalMentions < 15 ? "Mention volume low — consider boosting brand awareness campaigns" : "Mention volume adequate" },
      { metric: "positive_ratio", currentValue: analysis.positivePercent, threshold: 30, breached: analysis.positivePercent < 30, severity: analysis.positivePercent < 30 ? "warning" : "ok", alert: analysis.positivePercent < 30 ? "Positive sentiment ratio below 30% — investigate causes" : "Positive ratio healthy" },
    ];
    const breachCount = thresholds.filter(t => t.breached).length;
    const overallStatus = breachCount === 0 ? "all_clear" : breachCount <= 2 ? "attention" : "critical";
    return { campaignId, thresholds, breachCount, overallStatus };
  }

  sentimentActionableInsights(campaignId: string, tenantId: string): SentimentActionableInsight {
    const analysis = this.analyzeSentiment(campaignId, tenantId);
    const insights: SentimentActionableInsight["insights"] = [];
    if (analysis.positivePercent > 40) {
      insights.push({ area: "positive_sentiment", insight: `High positive sentiment at ${analysis.positivePercent}%`, suggestedAction: "Amplify through testimonials and user-generated content campaigns", priority: "medium", expectedImpact: "15-25% increase in engagement" });
    }
    if (analysis.negativePercent > 20) {
      insights.push({ area: "negative_sentiment", insight: `Elevated negative sentiment at ${analysis.negativePercent}%`, suggestedAction: "Launch targeted response campaign addressing top complaints", priority: "high", expectedImpact: "30-50% reduction in negative mentions" });
    }
    if (analysis.averageSentimentScore < 0) {
      insights.push({ area: "overall_sentiment", insight: `Overall sentiment is negative (${analysis.averageSentimentScore})`, suggestedAction: "Audit recent campaigns and messaging; consider brand refresh", priority: "critical", expectedImpact: "Recovery to neutral within 30 days" });
    }
    if (analysis.topNegativeTopics.length > 0) {
      const topNeg = analysis.topNegativeTopics[0];
      insights.push({ area: "top_negative_topic", insight: `Top negative topic: ${topNeg.topic} (${topNeg.mentions} mentions)`, suggestedAction: `Create dedicated content addressing ${topNeg.topic} concerns`, priority: "high", expectedImpact: "20-35% improvement in topic sentiment" });
    }
    if (analysis.topPositiveTopics.length > 0) {
      const topPos = analysis.topPositiveTopics[0];
      insights.push({ area: "top_positive_topic", insight: `Top positive topic: ${topPos.topic} (${topPos.mentions} mentions)`, suggestedAction: `Feature ${topPos.topic} in upcoming campaign creatives`, priority: "medium", expectedImpact: "10-20% increase in positive mentions" });
    }
    if (analysis.totalMentions < 20) {
      insights.push({ area: "low_visibility", insight: `Low mention count (${analysis.totalMentions}) — brand visibility is limited`, suggestedAction: "Increase social media posting frequency and influencer partnerships", priority: "medium", expectedImpact: "40-60% increase in brand mentions" });
    }
    const priorities = ["critical", "high", "medium", "low"];
    const sorted = [...insights].sort((a, b) => priorities.indexOf(a.priority) - priorities.indexOf(b.priority));
    return { campaignId, insights, totalInsights: insights.length, topPriority: sorted[0]?.priority ?? "none" };
  }

  sentimentShareOfVoice(campaignId: string, tenantId: string): ShareOfVoice {
    const analysis = this.analyzeSentiment(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "sov");
    const brandMentions = analysis.totalMentions;
    const competitors = ["CompetitorA", "CompetitorB", "CompetitorC"];
    const compMentions = competitors.map((name, i) => {
      const cSeed = seed + i * 19;
      return { name, mentions: 15 + (cSeed % 40), share: 0, sentiment: Math.round(((cSeed % 100) / 100) * 2 - 1) };
    });
    const totalIndustryMentions = brandMentions + compMentions.reduce((s, c) => s + c.mentions, 0);
    const share = totalIndustryMentions > 0 ? Math.round(brandMentions / totalIndustryMentions * 10000) / 100 : 0;
    const compWithShare = compMentions.map(c => ({ ...c, share: totalIndustryMentions > 0 ? Math.round(c.mentions / totalIndustryMentions * 10000) / 100 : 0 }));
    return {
      campaignId, totalMentions: totalIndustryMentions, brandMentions, share, competitors: compWithShare,
      trend: share > 25 ? "growing" : share > 15 ? "stable" : "declining",
      recommendation: share > 25 ? "Strong position — defend by maintaining quality engagement" : share > 15 ? "Competitive position — look for share growth opportunities" : "Low visibility — aggressive awareness campaign needed",
    };
  }

  sentimentForecast(campaignId: string, tenantId: string): SentimentForecast {
    const analysis = this.analyzeSentiment(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "forecast_sent");
    const rng = seededRandom(seed + "_forecast_sent");
    const periods: SentimentForecast["periods"] = [];
    let projected = analysis.averageSentimentScore;
    for (let i = 1; i <= 6; i++) {
      const change = (rng() - 0.45) * 0.15;
      projected += change;
      projected = Math.max(-1, Math.min(1, projected));
      const d = new Date();
      d.setDate(d.getDate() + i * 7);
      const confidence = i <= 2 ? "high" : i <= 4 ? "medium" : "low";
      const halfRange = confidence === "high" ? 0.1 : confidence === "medium" ? 0.2 : 0.35;
      periods.push({
        period: d.toISOString().slice(0, 10),
        predictedScore: Math.round(projected * 1000) / 1000,
        confidence,
        range: { low: Math.round(Math.max(-1, projected - halfRange) * 1000) / 1000, high: Math.round(Math.min(1, projected + halfRange) * 1000) / 1000 },
      });
    }
    const lastScore = periods[periods.length - 1]?.predictedScore ?? 0;
    const firstScore = periods[0]?.predictedScore ?? 0;
    const overallOutlook = lastScore > firstScore + 0.1 ? "improving" : lastScore < firstScore - 0.1 ? "declining" : "stable";
    const riskLevel = lastScore < 0 ? "high" : lastScore < 0.1 ? "medium" : "low";
    return { campaignId, periods, overallOutlook, riskLevel, keyDriver: "campaign sentiment trajectory" };
  }
}

export const campaignSocialSentimentAnalyzer = new CampaignSocialSentimentAnalyzerService();
