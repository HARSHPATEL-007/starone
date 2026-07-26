import { creativeAI, GeneratedVariant } from "../services/CreativeAIService";
import { decisionEngine } from "./DecisionEngine";

export interface CrossPlatformCreativeScore {
  platform: string;
  tone: string;
  avgQualityScore: number;
  avgEstimatedCtr: number;
  avgEstimatedCvr: number;
  avgEngagementPotential: number;
  score: number;
}

export interface ToneEffectiveness {
  tone: string;
  avgQuality: number;
  totalVariants: number;
  bestPlatform: string;
}

export interface CreativeAIDashboard {
  platformScores: CrossPlatformCreativeScore[];
  toneEffectiveness: ToneEffectiveness[];
  bestOverall: { platform: string; tone: string; score: number } | null;
  recommendations: string[];
}

export class CreativeAIOrchestrator {
  getCrossPlatformAnalysis(input: {
    productDescription: string;
    targetAudience: string;
  }): CreativeAIDashboard {
    const platforms = ["meta", "google", "linkedin", "tiktok", "snapchat"] as const;
    const tones = ["professional", "casual", "urgent", "humorous", "luxury", "empathetic", "authoritative", "playful"] as const;

    const platformScores: CrossPlatformCreativeScore[] = [];
    const toneMap = new Map<string, { qualitySum: number; count: number; platformScores: Map<string, number> }>();

    for (const platform of platforms) {
      for (const tone of tones) {
        const variants = creativeAI.generateVariants({
          productDescription: input.productDescription,
          targetAudience: input.targetAudience,
          tone: tone as any,
          platform: platform as any,
          count: 2,
        });

        let qualitySum = 0, ctrSum = 0, cvrSum = 0, engagementSum = 0;
        for (const v of variants) {
          const perf = creativeAI.predictPerformance({
            headline: v.headline, body: v.body, cta: v.cta,
            platform: platform as any, tone: tone as any,
          });
          qualitySum += perf.qualityScore;
          ctrSum += perf.estimatedCtr;
          cvrSum += perf.estimatedCvr;
          engagementSum += perf.engagementPotential;
        }
        const n = variants.length || 1;
        const avgQuality = Math.round(qualitySum / n);
        const avgCtr = Math.round(ctrSum / n * 100) / 100;
        const avgCvr = Math.round(cvrSum / n * 100) / 100;
        const avgEngagement = Math.round(engagementSum / n);

        const score = Math.min(100, Math.round(avgQuality * 0.4 + avgCtr * 8 + avgCvr * 8 + avgEngagement * 0.2));

        platformScores.push({ platform, tone, avgQualityScore: avgQuality, avgEstimatedCtr: avgCtr, avgEstimatedCvr: avgCvr, avgEngagementPotential: avgEngagement, score });

        if (!toneMap.has(tone)) toneMap.set(tone, { qualitySum: 0, count: 0, platformScores: new Map() });
        const entry = toneMap.get(tone)!;
        entry.qualitySum += avgQuality;
        entry.count++;
        entry.platformScores.set(platform, score);
      }
    }

    const toneEffectiveness: ToneEffectiveness[] = Array.from(toneMap.entries()).map(([tone, data]) => {
      let bestPlatform = "";
      let bestScore = 0;
      for (const [plat, s] of data.platformScores) {
        if (s > bestScore) { bestScore = s; bestPlatform = plat; }
      }
      return {
        tone, avgQuality: Math.round(data.qualitySum / data.count),
        totalVariants: data.count, bestPlatform,
      };
    }).sort((a, b) => b.avgQuality - a.avgQuality);

    const sorted = [...platformScores].sort((a, b) => b.score - a.score);
    const bestOverall = sorted.length > 0 ? { platform: sorted[0].platform, tone: sorted[0].tone, score: sorted[0].score } : null;

    const recommendations: string[] = [];
    if (bestOverall) recommendations.push(`Best creative combination: ${bestOverall.platform} × ${bestOverall.tone} (score ${bestOverall.score}/100).`);
    const topTone = toneEffectiveness[0];
    if (topTone) recommendations.push(`Most effective tone: "${topTone.tone}" (avg quality ${topTone.avgQuality}) — best on ${topTone.bestPlatform}.`);
    const weakTones = toneEffectiveness.filter(t => t.avgQuality < 50);
    if (weakTones.length > 0) recommendations.push(`${weakTones.length} tone(s) score below 50 quality. Avoid these for current product/audience.`);

    return { platformScores, toneEffectiveness, bestOverall, recommendations };
  }

  getOptimizedVariant(input: {
    productDescription: string;
    targetAudience: string;
    platform: string;
    tone?: string;
  }): {
    bestVariant: GeneratedVariant;
    performance: ReturnType<typeof creativeAI.predictPerformance>;
    alternatives: { variant: GeneratedVariant; score: number }[];
  } {
    return creativeAI.optimizeVariant({
      productDescription: input.productDescription,
      targetAudience: input.targetAudience,
      platform: input.platform as any,
      tone: input.tone as any,
    });
  }

  analyzeCreativeText(text: string): {
    wordCount: number;
    fleschReadingEase: number;
    fleschKincaidGrade: number;
    sentiment: string;
    emotionalTone: string;
    readingTime: number;
    suggestions: string[];
  } {
    const analysis = creativeAI.analyzeText(text);
    const suggestions: string[] = [];
    if (analysis.fleschKincaidGrade > 10) suggestions.push("Reading level is advanced. Consider simplifying language.");
    if (analysis.fleschReadingEase < 50) suggestions.push("Text is difficult to read. Use shorter sentences.");
    if (analysis.sentiment === "negative") suggestions.push("Sentiment is negative. Use more positive framing.");
    return { ...analysis, suggestions };
  }
}

export const creativeAIOrchestrator = new CreativeAIOrchestrator();
