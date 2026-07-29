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
}

export const campaignSocialSentimentAnalyzer = new CampaignSocialSentimentAnalyzerService();
