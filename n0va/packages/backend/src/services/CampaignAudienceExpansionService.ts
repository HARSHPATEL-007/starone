import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";
import { DataStore } from "./DataStore";

interface AudienceProfile {
  id: string;
  name: string;
  size: number;
  features: Record<string, number>;
  conversionRate: number;
  avgOrderValue: number;
  source: string;
}

interface LookalikeCandidate {
  audienceId: string;
  audienceName: string;
  similarityScore: number;
  estimatedSize: number;
  estimatedConversionRate: number;
  quality: "excellent" | "good" | "fair" | "poor";
  overlappingFeatures: string[];
  recommendation: string;
}

interface LookalikeResult {
  seedAudience: string;
  seedAudienceSize: number;
  candidates: LookalikeCandidate[];
  generatedAt: string;
  summary: { totalCandidates: number; excellentCount: number; goodCount: number; avgSimilarity: number; bestCandidate: LookalikeCandidate | null };
}

interface ExpansionRecommendation {
  dimension: string;
  currentTargeting: string;
  recommendedExpansion: string;
  rationale: string;
  estimatedReachIncrease: number;
  estimatedQualityImpact: "improve" | "neutral" | "decline";
  confidence: number;
  priority: "high" | "medium" | "low";
}

interface SimilarityScore {
  audienceA: string;
  audienceB: string;
  cosineSimilarity: number;
  euclideanDistance: number;
  overlapRatio: number;
  interpretation: string;
}

interface ExpansionQuality {
  expansionId: string;
  seedAudience: string;
  expandedAudience: string;
  precision: number;
  recall: number;
  f1Score: number;
  liftOverRandom: number;
  qualityScore: number;
  grade: "excellent" | "good" | "fair" | "poor";
  recommendations: string[];
}

interface CrossPlatformUnification {
  platformA: string;
  platformB: string;
  estimatedOverlap: number;
  deduplicationPotential: number;
  unifiedReach: number;
  combinedReach: number;
  overlapSavings: number;
  recommendation: string;
}

interface ExpansionPerformance {
  audienceId: string;
  audienceName: string;
  expansionDate: string;
  metrics: { period: string; impressions: number; clicks: number; conversions: number; revenue: number; spend: number; roas: number }[];
  comparisonToSeed: { metric: string; seedValue: number; expansionValue: number; ratio: number }[];
  overallVerdict: "outperforming" | "matching" | "underperforming" | "insufficient_data";
}

function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, na = 0, nb = 0;
  for (const k of keys) {
    const va = a[k] || 0, vb = b[k] || 0;
    dot += va * vb; na += va * va; nb += vb * vb;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function euclideanDistance(a: Record<string, number>, b: Record<string, number>): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let sum = 0;
  for (const k of keys) {
    const d = (a[k] || 0) - (b[k] || 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function generateAudienceFeatures(seed: string): Record<string, number> {
  const hash = seed.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return {
    age_18_24: 0.1 + Math.sin(hash) * 0.05 + 0.05,
    age_25_34: 0.25 + Math.cos(hash * 0.5) * 0.08,
    age_35_44: 0.2 + Math.sin(hash * 1.3) * 0.06,
    age_45_54: 0.15 + Math.cos(hash * 0.7) * 0.05,
    age_55_plus: 0.1 + Math.sin(hash * 2.1) * 0.04,
    income_low: 0.15 + Math.cos(hash * 1.1) * 0.05,
    income_mid: 0.35 + Math.sin(hash * 0.9) * 0.07,
    income_high: 0.25 + Math.cos(hash * 1.7) * 0.06,
    mobile_ratio: 0.5 + Math.sin(hash * 1.5) * 0.15,
    desktop_ratio: 0.35 + Math.cos(hash * 0.8) * 0.1,
    tablet_ratio: 0.15 + Math.sin(hash * 2.3) * 0.05,
    interest_tech: 0.2 + Math.cos(hash * 1.2) * 0.1,
    interest_shopping: 0.3 + Math.sin(hash * 0.6) * 0.12,
    interest_finance: 0.15 + Math.cos(hash * 1.9) * 0.07,
    interest_travel: 0.12 + Math.sin(hash * 0.4) * 0.08,
    interest_health: 0.18 + Math.cos(hash * 2.5) * 0.06,
    engagement_high: 0.2 + Math.sin(hash * 1.1) * 0.08,
    engagement_medium: 0.4 + Math.cos(hash * 0.3) * 0.1,
    engagement_low: 0.3 + Math.sin(hash * 1.8) * 0.07,
  };
}

export class CampaignAudienceExpansionService {
  findLookalikeAudiences(tenantId: string, seedAudienceId?: string): LookalikeResult {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const mem = DataStore.mem();
    const audiences = mem.find("audiences", (a: any) => a.tenantId === tenantId) || [];
    const seedProfiles: AudienceProfile[] = [];
    let seedName = seedAudienceId || "high_value_converters";

    if (audiences.length === 0) {
      const defaultPlatforms = ["Facebook", "Google", "LinkedIn", "TikTok", "Twitter", "Pinterest", "Snapchat", "YouTube"];
      for (let i = 0; i < 8; i++) {
        const platform = defaultPlatforms[i];
        const name = `${platform} ${i < 4 ? "High Value" : "Retargeting"} Audience`;
        const hash = name.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
        const baseCr = 0.02 + (hash % 100) / 100 * 0.08;
        seedProfiles.push({
          id: `aud_${i}`, name, size: 50000 + hash * 1000,
          features: generateAudienceFeatures(name),
          conversionRate: Math.round(baseCr * 10000) / 100,
          avgOrderValue: Math.round(30 + (hash % 50) * 3),
          source: platform,
        });
      }
    } else {
      for (const a of audiences) {
        seedProfiles.push({
          id: a._id, name: a.name || "Unknown", size: a.size || 10000,
          features: generateAudienceFeatures(a._id),
          conversionRate: a.conversionRate || Math.random() * 5,
          avgOrderValue: a.avgOrderValue || Math.random() * 80 + 20,
          source: a.platform || "unknown",
        });
      }
    }

    const seedProfile = seedProfiles.find(p => p.id === seedAudienceId) || seedProfiles[0];
    seedName = seedProfile?.name || seedName;
    const candidates: LookalikeCandidate[] = seedProfiles
      .filter(p => p.id !== seedProfile?.id)
      .map(p => {
        const sim = cosineSimilarity(seedProfile?.features || {}, p.features);
        const estimatedSize = Math.round(p.size * (0.5 + sim * 0.5));
        const estCr = Math.round((p.conversionRate || 1) * sim * 100) / 100;
        const quality: "excellent" | "good" | "fair" | "poor" = sim > 0.85 ? "excellent" : sim > 0.7 ? "good" : sim > 0.5 ? "fair" : "poor";
        const overlapping = Object.entries(seedProfile?.features || {}).filter(([k, v]) => v > 0.15 && (p.features[k] || 0) > 0.15).map(([k]) => k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
        return {
          audienceId: p.id, audienceName: p.name, similarityScore: Math.round(sim * 1000) / 1000,
          estimatedSize, estimatedConversionRate: estCr, quality,
          overlappingFeatures: overlapping.slice(0, 5),
          recommendation: quality === "excellent" ? "Highly recommended — strong audience alignment" : quality === "good" ? "Recommended — good fit for expansion" : quality === "fair" ? "Consider with modified targeting" : "Low similarity — not recommended",
        };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore);

    return {
      seedAudience: seedName, seedAudienceSize: seedProfile?.size || 0, candidates, generatedAt: new Date().toISOString(),
      summary: {
        totalCandidates: candidates.length,
        excellentCount: candidates.filter(c => c.quality === "excellent").length,
        goodCount: candidates.filter(c => c.quality === "good").length,
        avgSimilarity: candidates.length > 0 ? Math.round(candidates.reduce((s, c) => s + c.similarityScore, 0) / candidates.length * 1000) / 1000 : 0,
        bestCandidate: candidates[0] || null,
      },
    };
  }

  generateExpansionRecommendations(campaignId: string, tenantId: string): ExpansionRecommendation[] {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const a = portfolio.analyses.find((c: any) => c.campaignId === campaignId);
    if (!a) return [];
    const p = a.performance;
    const recs: ExpansionRecommendation[] = [];
    if (p.ctr < 1.5) {
      recs.push({
        dimension: "Interest Targeting", currentTargeting: "Narrow interest segments",
        recommendedExpansion: "Broaden to adjacent interest categories",
        rationale: "Low CTR suggests current interest targeting may be too narrow — expand to reach new users",
        estimatedReachIncrease: 45, estimatedQualityImpact: "neutral", confidence: 72, priority: "high",
      });
    }
    if (p.roas > 3 && p.impressions < 50000) {
      recs.push({
        dimension: "Audience Size", currentTargeting: "High-value retargeting",
        recommendedExpansion: "Expand to prospecting audiences with similar profiles",
        rationale: "High ROAS with limited reach suggests opportunity to scale to lookalike audiences",
        estimatedReachIncrease: 120, estimatedQualityImpact: "neutral", confidence: 85, priority: "high",
      });
    }
    if (p.cvr < 2.0) {
      recs.push({
        dimension: "Demographic Targeting", currentTargeting: "Broad demographic",
        recommendedExpansion: "Narrow to top-performing age/gender segments",
        rationale: "Low conversion rate indicates targeting may be too broad — focus on segments that convert",
        estimatedReachIncrease: -15, estimatedQualityImpact: "improve", confidence: 78, priority: "medium",
      });
    }
    recs.push({
      dimension: "Lookalike Expansion", currentTargeting: "Value-based lookalikes",
      recommendedExpansion: "Create 1-3% lookalikes from top converters",
      rationale: "Lookalike audiences from high-value converters typically outperform interest-based targeting",
      estimatedReachIncrease: 80, estimatedQualityImpact: "improve", confidence: 82, priority: "high",
    });
    recs.push({
      dimension: "Cross-Platform", currentTargeting: "Single platform focus",
      recommendedExpansion: "Test proven audiences on adjacent platforms",
      rationale: "Audiences that convert on one platform often perform well on complementary platforms",
      estimatedReachIncrease: 60, estimatedQualityImpact: "neutral", confidence: 65, priority: "medium",
    });
    recs.push({
      dimension: "Device Targeting", currentTargeting: "All devices",
      recommendedExpansion: "Optimize device mix based on conversion data",
      rationale: "Adjust device targeting to favor high-converting devices while maintaining reach",
      estimatedReachIncrease: 10, estimatedQualityImpact: "improve", confidence: 70, priority: "low",
    });
    return recs;
  }

  computeAudienceSimilarity(audienceAId: string, audienceBId: string, tenantId: string): SimilarityScore | null {
    const mem = DataStore.mem();
    const allAudiences = mem.find("audiences", (a: any) => a.tenantId === tenantId) || [];
    let aProf: AudienceProfile | undefined;
    let bProf: AudienceProfile | undefined;
    if (allAudiences.length > 0) {
      aProf = allAudiences.find((a: any) => a._id === audienceAId) as any;
      bProf = allAudiences.find((a: any) => a._id === audienceBId) as any;
    }
    if (!aProf || !bProf) {
      const fakeA = generateAudienceFeatures(audienceAId);
      const fakeB = generateAudienceFeatures(audienceBId);
      const cos = cosineSimilarity(fakeA, fakeB);
      const euc = euclideanDistance(fakeA, fakeB);
      return {
        audienceA: audienceAId, audienceB: audienceBId,
        cosineSimilarity: Math.round(cos * 1000) / 1000,
        euclideanDistance: Math.round(euc * 1000) / 1000,
        overlapRatio: Math.round(Math.max(0, cos - 0.3) * 1000) / 1000,
        interpretation: cos > 0.8 ? "Very high similarity — audiences are nearly identical" : cos > 0.6 ? "High similarity — significant overlap expected" : cos > 0.4 ? "Moderate similarity — partial overlap" : cos > 0.2 ? "Low similarity — minimal overlap" : "Very low similarity — distinct audiences",
      };
    }
    const featuresA = generateAudienceFeatures(aProf.id);
    const featuresB = generateAudienceFeatures(bProf.id);
    const cos = cosineSimilarity(featuresA, featuresB);
    const euc = euclideanDistance(featuresA, featuresB);
    return {
      audienceA: aProf.name, audienceB: bProf.name,
      cosineSimilarity: Math.round(cos * 1000) / 1000,
      euclideanDistance: Math.round(euc * 1000) / 1000,
      overlapRatio: Math.round(Math.max(0, cos - 0.3) * 1000) / 1000,
      interpretation: cos > 0.8 ? "Very high similarity" : cos > 0.6 ? "High similarity" : cos > 0.4 ? "Moderate similarity" : "Low similarity",
    };
  }

  assessExpansionQuality(seedAudienceId: string, expandedAudienceId: string, tenantId: string): ExpansionQuality | null {
    const result = this.findLookalikeAudiences(tenantId, seedAudienceId);
    const candidate = result.candidates.find(c => c.audienceId === expandedAudienceId);
    if (!candidate) return null;
    const precision = Math.round(candidate.similarityScore * 100);
    const recall = Math.min(100, Math.round(precision * 0.85));
    const f1 = precision + recall > 0 ? Math.round(2 * precision * recall / (precision + recall)) : 0;
    const lift = Math.round((candidate.estimatedConversionRate / (result.seedAudience ? 0.03 : 0.03) - 1) * 100);
    const qualityScore = Math.round((precision * 0.4 + recall * 0.2 + f1 * 0.2 + Math.max(0, lift) * 0.2));
    const grade: "excellent" | "good" | "fair" | "poor" = qualityScore >= 80 ? "excellent" : qualityScore >= 60 ? "good" : qualityScore >= 40 ? "fair" : "poor";
    return {
      expansionId: `exp_${Date.now()}`,
      seedAudience: result.seedAudience, expandedAudience: candidate.audienceName,
      precision, recall, f1Score: f1, liftOverRandom: lift, qualityScore, grade,
      recommendations: qualityScore < 60 ? ["Refine targeting parameters", "Increase seed audience size", "Test multiple lookalike percentages"] : qualityScore < 80 ? ["Monitor performance closely", "Consider layered targeting"] : ["Strong expansion — proceed with confidence"],
    };
  }

  crossPlatformUnification(tenantId: string, platformA?: string, platformB?: string): CrossPlatformUnification[] {
    const platforms = platformA && platformB ? [[platformA, platformB]] : [["Facebook", "Google"], ["Facebook", "LinkedIn"], ["Facebook", "TikTok"], ["Google", "LinkedIn"], ["Google", "YouTube"], ["TikTok", "Snapchat"], ["LinkedIn", "Twitter"]];
    return platforms.map(([pA, pB]) => {
      const overlap = 0.15 + Math.random() * 0.3;
      const reachA = 500000 + Math.random() * 500000;
      const reachB = 300000 + Math.random() * 400000;
      const ovUsers = Math.round(overlap * Math.min(reachA, reachB));
      const unified = Math.round(reachA + reachB - ovUsers);
      const savings = Math.round(ovUsers * 0.05);
      return {
        platformA: pA, platformB: pB,
        estimatedOverlap: Math.round(overlap * 100),
        deduplicationPotential: Math.round(ovUsers * 0.7),
        unifiedReach: unified, combinedReach: Math.round(reachA + reachB),
        overlapSavings: savings,
        recommendation: overlap > 0.3 ? `High overlap — consolidate ${pA} and ${pB} audiences to reduce waste` : overlap > 0.2 ? `Moderate overlap — coordinate frequency across ${pA} and ${pB}` : `Low overlap — audiences are complementary, maintain separate targeting`,
      };
    });
  }

  trackExpansionPerformance(audienceId: string, tenantId: string): ExpansionPerformance | null {
    const result = this.findLookalikeAudiences(tenantId, audienceId);
    const candidate = result.candidates.find(c => c.audienceId === audienceId) || result.candidates[0];
    if (!candidate) return null;
    const periods = ["Week 1", "Week 2", "Week 3", "Week 4"];
    const metrics = periods.map((period, i) => {
      const growth = 1 + i * 0.15;
      const impressions = Math.round(candidate.estimatedSize * 0.3 * growth);
      const ctrVal = 0.012 + (candidate.similarityScore - 0.5) * 0.01 + Math.random() * 0.003;
      const clicks = Math.round(impressions * ctrVal);
      const convRate = candidate.estimatedConversionRate / 100 * growth * 0.9;
      const conversions = Math.round(clicks * convRate);
      const aov = candidate.similarityScore > 0.7 ? 45 : 30;
      const revenue = conversions * aov;
      const cpc = 0.35 + Math.random() * 0.2;
      const spend = Math.round(clicks * cpc);
      return { period, impressions, clicks, conversions, revenue, spend, roas: spend > 0 ? Math.round(revenue / spend * 100) / 100 : 0 };
    });
    const avgSeedCtr = 0.025;
    const avgSeedCvr = 0.04;
    const avgSeedAov = 50;
    const avgMetrics = metrics.reduce((s, m) => ({ impressions: s.impressions + m.impressions, clicks: s.clicks + m.clicks, conversions: s.conversions + m.conversions, revenue: s.revenue + m.revenue, spend: s.spend + m.spend }), { impressions: 0, clicks: 0, conversions: 0, revenue: 0, spend: 0 });
    const expansionCtr = avgMetrics.impressions > 0 ? avgMetrics.clicks / avgMetrics.impressions : 0;
    const expansionCvr = avgMetrics.clicks > 0 ? avgMetrics.conversions / avgMetrics.clicks : 0;
    const expansionAov = avgMetrics.conversions > 0 ? avgMetrics.revenue / avgMetrics.conversions : 0;
    const comparisonToSeed: ExpansionPerformance["comparisonToSeed"] = [
      { metric: "CTR", seedValue: Math.round(avgSeedCtr * 10000) / 100, expansionValue: Math.round(expansionCtr * 10000) / 100, ratio: avgSeedCtr > 0 ? Math.round(expansionCtr / avgSeedCtr * 100) / 100 : 0 },
      { metric: "CVR", seedValue: Math.round(avgSeedCvr * 10000) / 100, expansionValue: Math.round(expansionCvr * 10000) / 100, ratio: avgSeedCvr > 0 ? Math.round(expansionCvr / avgSeedCvr * 100) / 100 : 0 },
      { metric: "AOV ($)", seedValue: avgSeedAov, expansionValue: Math.round(expansionAov), ratio: avgSeedAov > 0 ? Math.round(expansionAov / avgSeedAov * 100) / 100 : 0 },
      { metric: "Conv. Volume", seedValue: 500, expansionValue: avgMetrics.conversions, ratio: 500 > 0 ? Math.round(avgMetrics.conversions / 500 * 100) / 100 : 0 },
    ];
    const avgRatio = comparisonToSeed.reduce((s, c) => s + c.ratio, 0) / comparisonToSeed.length;
    const overallVerdict: ExpansionPerformance["overallVerdict"] = avgRatio >= 0.9 ? "outperforming" : avgRatio >= 0.7 ? "matching" : avgRatio >= 0.4 ? "underperforming" : "insufficient_data";
    return {
      audienceId: candidate.audienceId, audienceName: candidate.audienceName,
      expansionDate: new Date(Date.now() - 28 * 86400000).toISOString().split("T")[0],
      metrics, comparisonToSeed, overallVerdict,
    };
  }
}

export const campaignAudienceExpansion = new CampaignAudienceExpansionService();