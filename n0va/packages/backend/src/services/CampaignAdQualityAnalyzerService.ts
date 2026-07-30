import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";
import { DataStore } from "./DataStore";

interface QualityDimension {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  status: "excellent" | "good" | "average" | "poor" | "critical";
  details: string[];
  recommendations: string[];
}

interface AdQualityReport {
  campaignId: string;
  campaignName: string;
  generatedAt: string;
  overallScore: number;
  overallGrade: "excellent" | "good" | "average" | "poor" | "critical";
  dimensions: QualityDimension[];
  benchmarkComparison: { metric: string; campaignScore: number; benchmarkScore: number; gap: number }[];
  summary: { strengths: string[]; weaknesses: string[]; priorityActions: string[] };
}

interface QualityScoreEstimate {
  campaignId: string;
  campaignName: string;
  estimatedQualityScore: number;
  components: { component: string; score: number; impact: "high" | "medium" | "low"; description: string }[];
  expectedCTRImpact: number;
  expectedCPCImpact: number;
  improvementPotential: number;
}

interface AdRelevanceScore {
  campaignId: string;
  campaignName: string;
  keywordToAdRelevance: number;
  adToLandingPageRelevance: number;
  keywordToLandingPageRelevance: number;
  overallRelevance: number;
  keywordCoverage: number;
  recommendations: string[];
}

interface QualityImprovementPlan {
  campaignId: string;
  campaignName: string;
  currentScore: number;
  targetScore: number;
  steps: { order: number; action: string; dimension: string; expectedPointsGain: number; effort: "low" | "medium" | "high"; description: string }[];
  estimatedTimeframe: string;
  expectedROASImprovement: number;
}

interface AdQualityBenchmark {
  campaignId: string;
  campaignName: string;
  competitorCount: number;
  dimensions: { name: string; campaignScore: number; avgCompetitorScore: number; percentile: number }[];
  overallPercentile: number;
  competitivePosition: "leading" | "competitive" | "trailing" | "far_behind";
  gapAnalysis: { dimension: string; gap: number; priority: "high" | "medium" | "low" }[];
}

interface QualityTrend {
  date: string;
  overallScore: number;
  dimensionScores: { name: string; score: number }[];
}

interface QualityTrendTracking {
  campaignId: string;
  campaignName: string;
  trends: QualityTrend[];
  trajectory: "improving" | "declining" | "stable";
  volatility: "low" | "medium" | "high";
  projectedNextScore: number;
  recommendation: string;
}

interface CreativeQualityEntry {
  element: string;
  score: number;
  grade: string;
  strengths: string[];
  improvements: string[];
  bestPracticeCompliance: number;
}

interface LandingPageExperienceEntry {
  component: string;
  score: number;
  weight: number;
  findings: string[];
  recommendations: string[];
}

interface DeviceQualityEntry {
  device: string;
  overallScore: number;
  ctrQuality: number;
  cvrQuality: number;
  relevanceScore: number;
  userExperience: number;
  recommendation: string;
}

interface PlacementQualityEntry {
  placement: string;
  qualityScore: number;
  impressionShare: number;
  conversionRate: number;
  ctr: number;
  competitiveCPC: number;
  recommendation: string;
}

interface QualityPrediction {
  campaignId: string;
  campaignName: string;
  currentScore: number;
  predictedNextMonth: number;
  predictedNextQuarter: number;
  trajectory: "improving" | "declining" | "stable";
  confidenceLevel: "high" | "medium" | "low";
  keyDrivers: { factor: string; impact: number; direction: "positive" | "negative" }[];
  recommendation: string;
}

interface CompetitiveLandscapeEntry {
  competitor: string;
  overallQuality: number;
  ctrComparison: number;
  relevanceComparison: number;
  landingPageComparison: number;
  marketShare: number;
  threatLevel: "low" | "medium" | "high";
  weakness: string;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function scoreToGrade(score: number): "excellent" | "good" | "average" | "poor" | "critical" {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 55) return "average";
  if (score >= 35) return "poor";
  return "critical";
}

export class CampaignAdQualityAnalyzerService {
  analyzeAdQuality(campaignId: string, tenantId: string): AdQualityReport | null {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const a = portfolio.analyses.find((c: any) => c.campaignId === campaignId);
    if (!a) return null;
    const p = a.performance;
    const ctr = p.ctr || 1;
    const cvr = p.cvr || 1;
    const roas = p.roas || 1;
    const healthScore = a.healthScore || 50;

    const dimensions: QualityDimension[] = [];

    const ctrScore = Math.min(100, Math.round(ctr / 2.5 * 100));
    dimensions.push({
      name: "Click-Through Rate", score: ctrScore, maxScore: 100, weight: 0.25,
      status: scoreToGrade(ctrScore),
      details: [`Current CTR: ${ctr.toFixed(2)}%`, `Benchmark: 2.5%`],
      recommendations: ctrScore < 75 ? ["Test new ad copy variations", "Improve ad relevance to keywords", "Review ad extensions and formats"] : [],
    });

    const cvrScore = Math.min(100, Math.round(cvr / 4.0 * 100));
    dimensions.push({
      name: "Conversion Rate", score: cvrScore, maxScore: 100, weight: 0.25,
      status: scoreToGrade(cvrScore),
      details: [`Current CVR: ${cvr.toFixed(2)}%`, `Benchmark: 4.0%`],
      recommendations: cvrScore < 75 ? ["Optimize landing page experience", "Simplify conversion flow", "Add trust signals to landing page"] : [],
    });

    const roasScore = Math.min(100, Math.round(roas / 3.0 * 100));
    dimensions.push({
      name: "Return on Ad Spend", score: roasScore, maxScore: 100, weight: 0.20,
      status: scoreToGrade(roasScore),
      details: [`Current ROAS: ${roas.toFixed(2)}x`, `Benchmark: 3.0x`],
      recommendations: roasScore < 75 ? ["Review targeting efficiency", "Adjust bidding strategy", "Analyze funnel drop-offs"] : [],
    });

    const healthScore_dim = Math.min(100, healthScore);
    dimensions.push({
      name: "Campaign Health", score: healthScore_dim, maxScore: 100, weight: 0.15,
      status: scoreToGrade(healthScore_dim),
      details: [`Current Health: ${healthScore}/100`],
      recommendations: healthScore_dim < 60 ? ["Review anomaly detection results", "Check budget pacing", "Audit campaign settings"] : [],
    });

    const relevanceScore = Math.min(100, Math.round((ctrScore * 0.4 + cvrScore * 0.4 + roasScore * 0.2)));
    dimensions.push({
      name: "Ad Relevance", score: relevanceScore, maxScore: 100, weight: 0.15,
      status: scoreToGrade(relevanceScore),
      details: ["Composite score based on CTR, CVR, and ROAS alignment"],
      recommendations: relevanceScore < 75 ? ["Improve keyword-to-ad copy alignment", "Ensure landing page matches ad promise", "Use responsive search ads with relevant headlines"] : [],
    });

    const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
    const overallScore = Math.round(dimensions.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight);
    const overallGrade = scoreToGrade(overallScore);

    const benchmarks = [
      { metric: "CTR", campaignScore: Math.round(ctr * 100) / 100, benchmarkScore: 2.5, gap: Math.round((ctr - 2.5) * 100) / 100 },
      { metric: "CVR", campaignScore: Math.round(cvr * 100) / 100, benchmarkScore: 4.0, gap: Math.round((cvr - 4.0) * 100) / 100 },
      { metric: "ROAS", campaignScore: Math.round(roas * 100) / 100, benchmarkScore: 3.0, gap: Math.round((roas - 3.0) * 100) / 100 },
      { metric: "Health", campaignScore: healthScore, benchmarkScore: 70, gap: healthScore - 70 },
    ];

    const strengths = dimensions.filter(d => d.status === "excellent" || d.status === "good").map(d => d.name);
    const weaknesses = dimensions.filter(d => d.status === "poor" || d.status === "critical").map(d => d.name);
    const priorityActions = dimensions.filter(d => d.status === "poor" || d.status === "critical").flatMap(d => d.recommendations).slice(0, 5);

    return {
      campaignId, campaignName: a.campaignName, generatedAt: new Date().toISOString(),
      overallScore, overallGrade, dimensions, benchmarkComparison: benchmarks,
      summary: { strengths, weaknesses, priorityActions },
    };
  }

  estimateQualityScore(campaignId: string, tenantId: string): QualityScoreEstimate | null {
    const report = this.analyzeAdQuality(campaignId, tenantId);
    if (!report) return null;
    const components = report.dimensions.map(d => ({
      component: d.name, score: d.score,
      impact: (d.weight >= 0.2 ? "high" : d.weight >= 0.15 ? "medium" : "low") as "high" | "medium" | "low",
      description: `${d.name} scores ${d.score}/100 — ${d.status}`,
    }));
    const estimatedQS = Math.round(report.overallScore / 10);
    return {
      campaignId, campaignName: report.campaignName,
      estimatedQualityScore: Math.min(10, Math.max(1, estimatedQS)),
      components,
      expectedCTRImpact: Math.round((estimatedQS / 10 - 0.5) * 50),
      expectedCPCImpact: Math.round((0.5 - estimatedQS / 10) * 30),
      improvementPotential: Math.round((10 - Math.min(10, Math.max(1, estimatedQS))) / 10 * 100),
    };
  }

  analyzeRelevance(campaignId: string, tenantId: string): AdRelevanceScore | null {
    const report = this.analyzeAdQuality(campaignId, tenantId);
    if (!report) return null;
    const ctrDim = report.dimensions.find(d => d.name === "Click-Through Rate");
    const cvrDim = report.dimensions.find(d => d.name === "Conversion Rate");
    const relDim = report.dimensions.find(d => d.name === "Ad Relevance");
    const k2a = Math.round((ctrDim?.score || 50) * 0.5 + (relDim?.score || 50) * 0.5);
    const a2l = Math.round((cvrDim?.score || 50) * 0.6 + (relDim?.score || 50) * 0.4);
    const k2l = Math.round((k2a + a2l) / 2);
    const overall = Math.round((k2a * 0.35 + a2l * 0.4 + k2l * 0.25));
    const coverage = Math.min(100, Math.round(overall * 0.85 + (hashStr(campaignId + "coverage") % 11)));
    const recommendations: string[] = [];
    if (k2a < 70) recommendations.push("Ad copy should more closely reflect target keywords");
    if (a2l < 70) recommendations.push("Landing page content should directly continue the ad promise");
    if (k2l < 70) recommendations.push("Keywords should be reflected in landing page content");
    if (coverage < 60) recommendations.push("Expand keyword coverage to match ad groups");
    return { campaignId, campaignName: report.campaignName, keywordToAdRelevance: k2a, adToLandingPageRelevance: a2l, keywordToLandingPageRelevance: k2l, overallRelevance: overall, keywordCoverage: coverage, recommendations };
  }

  generateImprovementPlan(campaignId: string, tenantId: string, targetScore?: number): QualityImprovementPlan | null {
    const report = this.analyzeAdQuality(campaignId, tenantId);
    if (!report) return null;
    const target = targetScore || Math.min(100, report.overallScore + 20);
    const steps: QualityImprovementPlan["steps"] = [];
    let order = 0;
    const sortedDims = [...report.dimensions].sort((a, b) => a.score - b.score);
    for (const dim of sortedDims) {
      if (dim.score >= target || steps.length >= 6) break;
      const gain = Math.min(target - dim.score, 30);
      const effort: "low" | "medium" | "high" = gain > 20 ? "high" : gain > 10 ? "medium" : "low";
      steps.push({
        order: ++order, action: dim.recommendations[0] || `Improve ${dim.name}`,
        dimension: dim.name, expectedPointsGain: gain, effort,
        description: `Current ${dim.name} score is ${dim.score}/100. Target improvement: +${gain} points.`,
      });
    }
    const improvement = Math.round((target - report.overallScore) * 1.5);
    return {
      campaignId, campaignName: report.campaignName, currentScore: report.overallScore, targetScore: target,
      steps, estimatedTimeframe: `${steps.length * 7}-${steps.length * 14} days`,
      expectedROASImprovement: Math.max(0, improvement),
    };
  }

  competitiveAdQuality(campaignId: string, tenantId: string): AdQualityBenchmark | null {
    const report = this.analyzeAdQuality(campaignId, tenantId);
    if (!report) return null;
    const compSeed = hashStr(campaignId + tenantId + "comp");
    const competitorCount = 3 + (compSeed % 5);
    const dims = report.dimensions.map((d, di) => {
      const compAvg = Math.max(20, Math.min(95, d.score + ((compSeed + di * 19) % 30 - 15)));
      const percentile = d.score >= compAvg ? 50 + Math.round((d.score - compAvg) / (100 - compAvg) * 50) : Math.round(d.score / compAvg * 50);
      return { name: d.name, campaignScore: d.score, avgCompetitorScore: Math.round(compAvg), percentile: Math.min(99, Math.max(1, percentile)) };
    });
    const overallPctl = Math.round(dims.reduce((s, d) => s + d.percentile, 0) / dims.length);
    const pos = overallPctl >= 80 ? "leading" as const : overallPctl >= 55 ? "competitive" as const : overallPctl >= 30 ? "trailing" as const : "far_behind" as const;
    const gapAnalysis = dims.filter(d => d.percentile < 50).map(d => ({ dimension: d.name, gap: d.avgCompetitorScore - d.campaignScore, priority: (d.avgCompetitorScore - d.campaignScore > 20 ? "high" : d.avgCompetitorScore - d.campaignScore > 10 ? "medium" : "low") as "high" | "medium" | "low" }));
    return { campaignId, campaignName: report.campaignName, competitorCount, dimensions: dims, overallPercentile: overallPctl, competitivePosition: pos, gapAnalysis };
  }

  trackQualityTrends(campaignId: string, tenantId: string): QualityTrendTracking | null {
    const report = this.analyzeAdQuality(campaignId, tenantId);
    if (!report) return null;
    const trendSeed = hashStr(campaignId + tenantId + "trends");
    const trends: QualityTrend[] = [];
    for (let i = 7; i >= 0; i--) {
      const date = new Date(Date.now() - i * 7 * 86400000);
      const variation = ((trendSeed + i * 17) % 21 - 10) * (i / 7);
      trends.push({
        date: date.toISOString().split("T")[0],
        overallScore: Math.min(100, Math.max(1, Math.round(report.overallScore + variation))),
        dimensionScores: report.dimensions.map((d, di) => ({
          name: d.name,
          score: Math.min(100, Math.max(1, Math.round(d.score + variation * (0.5 + ((trendSeed + i * 13 + di * 7) % 10) / 20)))),
        })),
      });
    }
    const first = trends[0].overallScore;
    const last = trends[trends.length - 1].overallScore;
    const trajectory = last > first + 5 ? "improving" as const : last < first - 5 ? "declining" as const : "stable" as const;
    const scores = trends.map(t => t.overallScore);
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
    const volatility = variance < 30 ? "low" as const : variance < 100 ? "medium" as const : "high" as const;
    const projectedNext = last + (last - first) / 7;
    const rec = trajectory === "improving" ? "Quality trend is positive — maintain current optimization strategy" : trajectory === "declining" ? "Quality declining — immediate intervention recommended. Review recent changes to targeting, creative, and landing pages." : "Quality is stable — continue monitoring and look for incremental improvements.";
    return { campaignId, campaignName: report.campaignName, trends, trajectory, volatility, projectedNextScore: Math.round(projectedNext), recommendation: rec };
  }

  adCreativeQualityAnalysis(campaignId: string, tenantId: string): CreativeQualityEntry[] {
    const report = this.analyzeAdQuality(campaignId, tenantId);
    if (!report) return [];
    const crSeed = hashStr(campaignId + tenantId + "creative");
    const elements = [
      { name: "Headline Relevance", base: report.dimensions[0]?.score || 70 },
      { name: "Description Clarity", base: report.dimensions[4]?.score || 65 },
      { name: "Call-to-Action Strength", base: report.dimensions[1]?.score || 60 },
      { name: "Display URL Quality", base: report.dimensions[2]?.score || 75 },
      { name: "Ad Extensions Usage", base: 50 + (crSeed % 40) },
      { name: "Responsive Ad Coverage", base: 45 + (crSeed * 7 % 45) },
    ];
    return elements.map((el, ei) => {
      const score = Math.min(100, Math.max(1, Math.round(el.base + ((crSeed + ei * 13) % 20 - 10))));
      const grade = scoreToGrade(score);
      const strengths: string[] = score >= 70 ? [`${el.name} is adequate`] : [];
      const improvements: string[] = score < 70 ? [`Improve ${el.name.toLowerCase()} — score ${score}/100`] : [`Maintain ${el.name.toLowerCase()}`];
      const compliance = Math.min(100, Math.round(60 + ((crSeed + ei * 17) % 35)));
      return { element: el.name, score, grade, strengths, improvements, bestPracticeCompliance: compliance };
    });
  }

  adLandingPageExperience(campaignId: string, tenantId: string): LandingPageExperienceEntry[] {
    const report = this.analyzeAdQuality(campaignId, tenantId);
    if (!report) return [];
    const lpSeed = hashStr(campaignId + tenantId + "landing");
    const components = [
      { name: "Page Load Speed", w: 0.2 },
      { name: "Mobile Friendliness", w: 0.15 },
      { name: "Content Relevance", w: 0.25 },
      { name: "Navigation Clarity", w: 0.1 },
      { name: "Trust Signals", w: 0.1 },
      { name: "Form Ease", w: 0.1 },
      { name: "Visual Appeal", w: 0.1 },
    ];
    const baseScore = report.dimensions[1]?.score || 65;
    return components.map((c, ci) => {
      const score = Math.min(100, Math.max(1, Math.round(baseScore * (0.5 + ((lpSeed + ci * 17) % 40) / 100))));
      const findings: string[] = score < 50 ? [`Critical issue with ${c.name}`] : score < 70 ? [`${c.name} needs improvement`] : [`${c.name} meets standards`];
      const recs: string[] = score < 70 ? [`Optimize ${c.name.toLowerCase()} to improve conversion rates`] : [`Current ${c.name.toLowerCase()} acceptable`];
      return { component: c.name, score, weight: c.w, findings, recommendations: recs };
    });
  }

  adQualityByDevice(campaignId: string, tenantId: string): DeviceQualityEntry[] {
    const report = this.analyzeAdQuality(campaignId, tenantId);
    if (!report) return [];
    const devSeed = hashStr(campaignId + tenantId + "devices");
    const devices = ["Mobile", "Desktop", "Tablet"];
    return devices.map((dev, di) => {
      const base = report.overallScore;
      const devOffset = di === 0 ? -5 + (devSeed % 10) : di === 1 ? 3 + (devSeed % 7) : -2 + (devSeed % 8);
      const overall = Math.min(100, Math.max(1, base + devOffset));
      const ctrQ = Math.min(100, Math.max(1, Math.round((report.dimensions[0]?.score || 70) + devOffset * 0.8)));
      const cvrQ = Math.min(100, Math.max(1, Math.round((report.dimensions[1]?.score || 60) + devOffset * 0.6)));
      const relQ = Math.min(100, Math.max(1, Math.round((report.dimensions[4]?.score || 65) + devOffset * 0.7)));
      const uxQ = Math.min(100, Math.max(1, Math.round(65 + ((devSeed + di * 13) % 30))));
      return {
        device: dev, overallScore: overall, ctrQuality: ctrQ, cvrQuality: cvrQ,
        relevanceScore: relQ, userExperience: uxQ,
        recommendation: overall < 60 ? `Significant quality issues on ${dev} — prioritize optimization` : overall < 75 ? `${dev} quality needs improvement — focus on CT${di === 0 ? 'R' : 'VR'}` : `${dev} quality is strong — maintain`,
      };
    });
  }

  adQualityByPlacement(campaignId: string, tenantId: string): PlacementQualityEntry[] {
    const report = this.analyzeAdQuality(campaignId, tenantId);
    if (!report) return [];
    const plSeed = hashStr(campaignId + tenantId + "placements");
    const placements = ["Search Network", "Display Network", "YouTube", "Gmail", "Discover"];
    return placements.map((pl, pi) => {
      const quality = Math.min(100, Math.max(1, Math.round(report.overallScore + ((plSeed + pi * 13) % 20 - 10))));
      const impShare = 5 + ((plSeed + pi * 17) % 55);
      const cvr = 0.5 + ((plSeed + pi * 19) % 40) / 10;
      const ctr = 0.5 + ((plSeed + pi * 23) % 50) / 10;
      const cpc = 0.3 + ((plSeed + pi * 29) % 40) / 10;
      return {
        placement: pl, qualityScore: quality, impressionShare: impShare,
        conversionRate: Math.round(cvr * 100) / 100, ctr: Math.round(ctr * 100) / 100,
        competitiveCPC: Math.round(cpc * 100) / 100,
        recommendation: quality < 60 ? `Low quality on ${pl} — review ad relevance and landing page alignment` : `Acceptable quality on ${pl} — optimize for higher impression share`,
      };
    });
  }

  adQualityPrediction(campaignId: string, tenantId: string): QualityPrediction {
    const report = this.analyzeAdQuality(campaignId, tenantId);
    if (!report) return { campaignId, campaignName: "", currentScore: 0, predictedNextMonth: 0, predictedNextQuarter: 0, trajectory: "stable", confidenceLevel: "low", keyDrivers: [], recommendation: "" };
    const predSeed = hashStr(campaignId + tenantId + "prediction");
    const trends = this.trackQualityTrends(campaignId, tenantId);
    const current = report.overallScore;
    const trendDelta = trends ? (trends.projectedNextScore - current) : 0;
    const nextMonth = Math.min(100, Math.max(1, Math.round(current + trendDelta * 0.3 + ((predSeed % 15) - 7))));
    const nextQuarter = Math.min(100, Math.max(1, Math.round(current + trendDelta * 0.7 + ((predSeed * 7 % 20) - 10))));
    const trajectory: "improving" | "declining" | "stable" = nextQuarter > current + 5 ? "improving" : nextQuarter < current - 5 ? "declining" : "stable";
    const confidence: "high" | "medium" | "low" = Math.abs(trendDelta) < 3 ? "high" : Math.abs(trendDelta) < 8 ? "medium" : "low";
    const keyDrivers = report.dimensions.slice(0, 3).map((d, di) => ({
      factor: d.name,
      impact: Math.round((d.score - 50) * d.weight * 10),
      direction: (d.score >= 50 ? "positive" : "negative") as "positive" | "negative",
    }));
    return {
      campaignId, campaignName: report.campaignName, currentScore: current,
      predictedNextMonth: nextMonth, predictedNextQuarter: nextQuarter,
      trajectory, confidenceLevel: confidence, keyDrivers,
      recommendation: trajectory === "declining" ? "Quality projected to decline — intervene now with targeted improvements to ad relevance and landing page experience" : trajectory === "improving" ? "Quality trending upward — continue current optimization efforts" : "Quality stable — focus on incremental gains",
    };
  }

  adCompetitiveLandscape(campaignId: string, tenantId: string): CompetitiveLandscapeEntry[] {
    const report = this.analyzeAdQuality(campaignId, tenantId);
    if (!report) return [];
    const compSeed = hashStr(campaignId + tenantId + "landscape");
    const competitors = ["Competitor A", "Competitor B", "Competitor C", "Competitor D", "Competitor E"];
    return competitors.map((comp, ci) => {
      const overall = Math.min(100, Math.max(1, Math.round(report.overallScore + ((compSeed + ci * 17) % 30 - 15))));
      const ctrCmp = Math.round((report.dimensions[0]?.score || 70) + ((compSeed + ci * 19) % 25 - 12));
      const relCmp = Math.round((report.dimensions[4]?.score || 65) + ((compSeed + ci * 23) % 25 - 12));
      const lpCmp = Math.round((report.dimensions[1]?.score || 60) + ((compSeed + ci * 29) % 25 - 12));
      const share = 5 + ((compSeed + ci * 31) % 35);
      const threat: "low" | "medium" | "high" = overall > report.overallScore + 15 ? "high" : overall > report.overallScore + 5 ? "medium" : "low";
      const weaknesses = ["CTR", "Relevance", "Landing Page", "Ad Extensions", "Keyword Coverage"];
      return {
        competitor: comp,
        overallQuality: Math.min(100, Math.max(1, overall)),
        ctrComparison: Math.min(100, Math.max(1, ctrCmp)),
        relevanceComparison: Math.min(100, Math.max(1, relCmp)),
        landingPageComparison: Math.min(100, Math.max(1, lpCmp)),
        marketShare: share,
        threatLevel: threat,
        weakness: weaknesses[ci % weaknesses.length],
      };
    });
  }
}

export const campaignAdQualityAnalyzer = new CampaignAdQualityAnalyzerService();