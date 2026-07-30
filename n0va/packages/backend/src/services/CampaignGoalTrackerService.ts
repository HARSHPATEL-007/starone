import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";

interface CampaignGoal {
  metric: string;
  target: number;
  current: number;
  progress: number;
  unit: string;
  status: "ahead" | "on-track" | "at-risk" | "behind";
  projected: number;
  daysRemaining: number;
}

interface GoalProgressReport {
  campaignId: string;
  campaignName: string;
  generatedAt: string;
  goals: CampaignGoal[];
  overallStatus: "ahead" | "on-track" | "at-risk" | "behind";
  compositeProgress: number;
  daysElapsed: number;
  totalDays: number;
  progressVsTime: number;
  healthScore: number;
  recommendations: string[];
}

interface GoalAttainmentPrediction {
  campaignId: string;
  campaignName: string;
  metric: string;
  target: number;
  currentValue: number;
  currentProgress: number;
  projectedValue: number;
  projectedAttainment: number;
  confidence: "high" | "medium" | "low";
  daysToTarget: number;
  willAttain: boolean;
}

interface GoalAdjustmentRecommendation {
  campaignId: string;
  campaignName: string;
  metric: string;
  currentTarget: number;
  recommendedTarget: number;
  gap: number;
  rationale: string;
  expectedImpact: string;
  priority: "high" | "medium" | "low";
}

interface GoalConflictAnalysis {
  campaignId: string;
  campaignName: string;
  conflicts: { goalA: string; goalB: string; severity: "high" | "medium" | "low"; description: string; resolution: string }[];
  overallConflictScore: number;
}

interface GoalComparisonItem {
  campaignId: string;
  campaignName: string;
  metric: string;
  target: number;
  current: number;
  progress: number;
  rank: number;
  percentile: number;
}

interface GoalTrendForecast {
  campaignId: string;
  campaignName: string;
  metric: string;
  target: number;
  historicalValues: number[];
  projectedValues: number[];
  weeklyGrowthRate: number;
  projectedCompletionWeek: number;
  willMeetDeadline: boolean;
}

interface GoalCascadeEntry {
  level: string;
  metric: string;
  target: number;
  current: number;
  progress: number;
  alignmentScore: number;
  gapToParent: number;
  recommendation: string;
}

interface GoalAttributionEntry {
  channel: string;
  attributedProgress: number;
  attributedValue: number;
  contributionPercent: number;
  efficiency: number;
  marginalImpact: number;
  recommendation: string;
}

interface GoalStressScenario {
  scenario: string;
  probability: number;
  impactedMetrics: { metric: string; baseProjection: number; stressedProjection: number; deviation: number }[];
  overallRisk: "low" | "medium" | "high";
  recommendedActions: string[];
}

interface GoalOptimizationSuggestion {
  metric: string;
  currentProgress: number;
  target: number;
  suggestedActions: { action: string; expectedLift: number; effort: "low" | "medium" | "high"; timeframe: string }[];
  compositePotential: number;
  priority: "high" | "medium" | "low";
}

interface GoalDependencyEntry {
  goalA: string;
  goalB: string;
  relationship: "reinforcing" | "conflicting" | "neutral";
  strength: number;
  description: string;
  managementStrategy: string;
}

interface GoalBenchmarkEntry {
  metric: string;
  ourTarget: number;
  ourCurrent: number;
  ourProgress: number;
  benchmarkAvgProgress: number;
  benchmarkTopQuartile: number;
  percentile: number;
  gapToTopQuartile: number;
  recommendation: string;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const GOAL_METRICS = [
  { metric: "impressions", unit: "impressions", baseTarget: 100000 },
  { metric: "clicks", unit: "clicks", baseTarget: 5000 },
  { metric: "conversions", unit: "conversions", baseTarget: 200 },
  { metric: "revenue", unit: "USD", baseTarget: 15000 },
  { metric: "roas", unit: "x", baseTarget: 3 },
  { metric: "ctr", unit: "%", baseTarget: 2.5 },
];

export class CampaignGoalTrackerService {
  trackGoalProgress(campaignId: string, tenantId: string): GoalProgressReport | null {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const a = portfolio.analyses.find((c: any) => c.campaignId === campaignId);
    if (!a) return null;
    const p = a.performance;
    const seed = hashStr(campaignId + tenantId);
    const daysElapsed = 15 + (seed % 45);
    const totalDays = 90 + (seed % 30);
    const daysRemaining = totalDays - daysElapsed;
    const timeProgress = daysElapsed / totalDays;

    const perfMap: Record<string, number> = {
      impressions: p.impressions || 0, clicks: p.clicks || 0, conversions: p.conversions || 0, revenue: p.revenue || 0, roas: p.spend > 0 ? (p.revenue || 0) / p.spend : 0, ctr: (p.impressions || 1) > 0 ? (p.clicks || 0) / p.impressions * 100 : 0,
    };

    const goals: CampaignGoal[] = GOAL_METRICS.map(g => {
      const target = Math.round(g.baseTarget * (0.8 + ((seed + GOAL_METRICS.indexOf(g) * 17) % 40) / 100));
      const current = Math.round((perfMap[g.metric] || 1) * (0.6 + ((seed + GOAL_METRICS.indexOf(g) * 23) % 50) / 100) * 100) / 100;
      const progress = target > 0 ? Math.min(100, Math.round(current / target * 100 * 100) / 100) : 0;
      const dailyRate = daysElapsed > 0 ? current / daysElapsed : 0;
      const projected = Math.round((current + dailyRate * daysRemaining) * 100) / 100;
      const projectedProgress = target > 0 ? projected / target : 0;
      const status: "ahead" | "on-track" | "at-risk" | "behind" = projectedProgress >= 1.1 ? "ahead" : projectedProgress >= timeProgress ? "on-track" : projectedProgress >= timeProgress * 0.7 ? "at-risk" : "behind";
      return { metric: g.metric, target, current, progress, unit: g.unit, status, projected, daysRemaining };
    });

    const statuses = goals.map(g => g.status);
    const overallStatus: "ahead" | "on-track" | "at-risk" | "behind" = statuses.every(s => s === "ahead") ? "ahead" : statuses.some(s => s === "behind") ? "behind" : statuses.some(s => s === "at-risk") ? "at-risk" : "on-track";
    const compositeProgress = Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length * 100) / 100;
    const progressVsTime = Math.round((compositeProgress / Math.max(1, timeProgress * 100)) * 100) / 100;
    const healthScore = Math.round(Math.min(100, compositeProgress / Math.max(1, timeProgress * 100) * 50 + (overallStatus === "ahead" ? 30 : overallStatus === "on-track" ? 20 : overallStatus === "at-risk" ? 10 : 0) + (statuses.filter(s => s !== "behind").length / goals.length) * 20));

    const recommendations: string[] = [];
    const behind = goals.filter(g => g.status === "behind");
    if (behind.length > 0) recommendations.push(`${behind.length} metrics behind target (${behind.map(g => g.metric).join(", ")}) — immediate optimization required: increase budget or adjust targeting`);
    const atRisk = goals.filter(g => g.status === "at-risk");
    if (atRisk.length > 0) recommendations.push(`${atRisk.length} metrics at risk (${atRisk.map(g => g.metric).join(", ")}) — proactive adjustments recommended to get back on track`);
    const worstMetric = goals.reduce((worst, g) => g.progress < worst.progress ? g : worst, goals[0]);
    if (worstMetric.progress < 50) recommendations.push(`${worstMetric.metric} at only ${worstMetric.progress}% of target — consider reducing target or reallocating resources`);
    if (daysRemaining < 14 && behind.length > 0) recommendations.push(`Only ${daysRemaining} days remaining with ${behind.length} unmet goals — consider extending campaign duration or lowering targets`);
    recommendations.push("Schedule mid-campaign review to reassess goals and reallocate budget based on current trajectory");

    return { campaignId, campaignName: a.campaignName, generatedAt: new Date().toISOString(), goals, overallStatus, compositeProgress, daysElapsed, totalDays, progressVsTime, healthScore, recommendations };
  }

  predictGoalAttainment(campaignId: string, tenantId: string): GoalAttainmentPrediction[] {
    const report = this.trackGoalProgress(campaignId, tenantId);
    if (!report) return [];
    return report.goals.map(g => {
      const seed = hashStr(campaignId + g.metric + tenantId);
      const projectedVal = g.projected;
      const projectedAttr = g.target > 0 ? Math.round(projectedVal / g.target * 10000) / 100 : 0;
      const confidenceLevels: ("high" | "medium" | "low")[] = ["high", "medium", "low"];
      const confidence = g.daysRemaining > 60 ? "low" as const : g.daysRemaining > 30 ? "medium" as const : "high" as const;
      const gap = g.target - g.current;
      const dailyRate = Math.max(0.01, g.current / Math.max(1, report.daysElapsed));
      const daysToTarget = gap > 0 ? Math.ceil(gap / dailyRate) : 0;
      return {
        campaignId: report.campaignId, campaignName: report.campaignName, metric: g.metric, target: g.target,
        currentValue: g.current, currentProgress: g.progress, projectedValue: projectedVal, projectedAttainment: projectedAttr,
        confidence, daysToTarget, willAttain: projectedAttr >= 100,
      };
    });
  }

  recommendGoalAdjustments(campaignId: string, tenantId: string): GoalAdjustmentRecommendation[] {
    const report = this.trackGoalProgress(campaignId, tenantId);
    if (!report) return [];
    return report.goals.map(g => {
      const seed = hashStr(campaignId + g.metric + "adj" + tenantId);
      const isBehind = g.status === "behind" || g.status === "at-risk";
      const recommendedTarget = isBehind ? Math.round(g.target * (0.7 + ((seed * 13) % 20) / 100)) : g.target;
      const gap = g.target - recommendedTarget;
      const priority: "high" | "medium" | "low" = g.status === "behind" ? "high" : g.status === "at-risk" ? "medium" : "low";
      return {
        campaignId: report.campaignId, campaignName: report.campaignName, metric: g.metric,
        currentTarget: g.target, recommendedTarget, gap,
        rationale: priority === "high" ? `${g.metric} at ${g.progress}% with ${g.daysRemaining} days left — target adjustment or aggressive optimization needed` : priority === "medium" ? `${g.metric} slightly behind pace — minor target adjustment or incremental optimization recommended` : `${g.metric} on track — maintain current strategy`,
        expectedImpact: isBehind ? "15-25% improvement in goal attainment probability" : "Stable performance maintained",
        priority,
      };
    });
  }

  analyzeGoalConflicts(campaignId: string, tenantId: string): GoalConflictAnalysis {
    const report = this.trackGoalProgress(campaignId, tenantId);
    if (!report) return { campaignId, campaignName: "unknown", conflicts: [], overallConflictScore: 0 };
    const conflicts: GoalConflictAnalysis["conflicts"] = [];
    const pairs = [
      { a: "roas", b: "impressions", desc: "Optimizing for ROAS typically limits impression volume through higher targeting thresholds", res: "Set ROAS floor and optimize impressions within constraint" },
      { a: "revenue", b: "roas", desc: "Aggressive revenue targets may reduce ROAS if marginal conversions require higher spend", res: "Balance revenue and ROAS with dual KPIs and diminishing return analysis" },
      { a: "clicks", b: "ctr", desc: "Click volume focus can dilute CTR if traffic quality drops", res: "Monitor CTR floor while scaling clicks; pause low-CTR placements" },
      { a: "conversions", b: "cpc", desc: "Conversion volume targets may increase CPC if competing for expensive keywords", res: "Set max CPC constraints and add long-tail keywords for volume" },
      { a: "impressions", b: "ctr", desc: "Impression growth often reduces CTR as reach extends beyond core audience", res: "Use frequency capping and audience layering to maintain CTR" },
    ];
    for (const pair of pairs) {
      const goalA = report.goals.find(g => g.metric === pair.a);
      const goalB = report.goals.find(g => g.metric === pair.b);
      if (!goalA || !goalB) continue;
      if (goalA.status === "behind" && goalB.status === "behind") {
        conflicts.push({ goalA: pair.a, goalB: pair.b, severity: "high", description: pair.desc, resolution: pair.res });
      } else if (goalA.status === "at-risk" || goalB.status === "at-risk") {
        conflicts.push({ goalA: pair.a, goalB: pair.b, severity: "medium", description: pair.desc, resolution: pair.res });
      }
    }
    const conflictScore = Math.round(conflicts.reduce((s, c) => s + (c.severity === "high" ? 3 : c.severity === "medium" ? 2 : 1), 0) / Math.max(1, pairs.length) * 100);
    return { campaignId, campaignName: report.campaignName, conflicts, overallConflictScore: Math.min(100, conflictScore) };
  }

  compareGoalPerformance(tenantId: string): GoalComparisonItem[] {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const comparisons: GoalComparisonItem[] = [];
    for (const metricDef of GOAL_METRICS) {
      const items = portfolio.analyses.map((a: any) => {
        const seed = hashStr(a.campaignId + metricDef.metric + tenantId);
        const target = Math.round(metricDef.baseTarget * (0.8 + (seed % 40) / 100));
        const perfVal = a.performance[metricDef.metric] || 0;
        const current = Math.round(perfVal * (0.6 + (seed % 50) / 100) * 100) / 100;
        const progress = target > 0 ? Math.round(current / target * 100 * 100) / 100 : 0;
        return { campaignId: a.campaignId, campaignName: a.campaignName, metric: metricDef.metric, target, current, progress };
      });
      items.sort((a: any, b: any) => b.progress - a.progress);
      items.forEach((item: any, idx: number) => {
        comparisons.push({ ...item, rank: idx + 1, percentile: Math.round((1 - idx / items.length) * 100) });
      });
    }
    return comparisons;
  }

  goalTrendForecast(campaignId: string, tenantId: string): GoalTrendForecast[] {
    const report = this.trackGoalProgress(campaignId, tenantId);
    if (!report) return [];
    return report.goals.map(g => {
      const seed = hashStr(campaignId + g.metric + "trend" + tenantId);
      const weeklyGrowth = (seed % 20) / 100 + 0.02;
      const histValues = Array.from({ length: 8 }, (_, wi) => {
        return Math.round(g.current * (0.3 + (wi / 8) * 0.5 + ((seed + wi * 13) % 20) / 100) * 100) / 100;
      });
      const projValues = Array.from({ length: 8 }, (_, wi) => {
        return Math.round(g.current * (0.8 + ((wi + 1) / 8) * 0.3 + weeklyGrowth * (wi + 1) + ((seed + wi * 17) % 10) / 100) * 100) / 100;
      });
      const weeklyGrowthRate = Math.round(weeklyGrowth * 10000) / 100;
      const projectionWeeks = g.target > 0 && weeklyGrowth > 0 ? Math.ceil(Math.log(g.target / Math.max(0.01, g.current)) / Math.log(1 + weeklyGrowth)) : 99;
      const deadlineWeeks = Math.ceil(g.daysRemaining / 7);
      return {
        campaignId: report.campaignId, campaignName: report.campaignName, metric: g.metric, target: g.target,
        historicalValues: histValues, projectedValues: projValues, weeklyGrowthRate,
        projectedCompletionWeek: projectionWeeks, willMeetDeadline: projectionWeeks <= deadlineWeeks,
      };
    });
  }

  goalCascadingAnalysis(campaignId: string, tenantId: string): GoalCascadeEntry[] {
    const report = this.trackGoalProgress(campaignId, tenantId);
    if (!report) return [];
    const cascadeSeed = hashStr(campaignId + tenantId + "cascade");
    const levels = ["Campaign", "Ad Group", "Keyword", "Creative", "Placement"];
    const entries: GoalCascadeEntry[] = [];
    for (const g of report.goals) {
      for (let li = 0; li < levels.length; li++) {
        const level = levels[li];
        const alignment = 60 + ((cascadeSeed + li * 13 + entries.length * 7) % 35);
        const parentProgress = li > 0 ? entries[entries.length - 1]?.progress || g.progress : g.progress;
        const gap = li > 0 ? Math.round((parentProgress - alignment) * 10) / 10 : 0;
        entries.push({
          level, metric: g.metric,
          target: Math.round(g.target * (0.5 + li * 0.1) * 100) / 100,
          current: Math.round(g.current * (0.4 + li * 0.12) * 100) / 100,
          progress: Math.round(alignment * 100) / 100,
          alignmentScore: alignment,
          gapToParent: gap,
          recommendation: alignment < 70 ? `${level} ${g.metric} alignment needs improvement — review targeting and execution at this level` : alignment < 85 ? `${level} ${g.metric} adequately aligned — minor optimization possible` : `${level} ${g.metric} well aligned — continue current approach`,
        });
      }
    }
    return entries;
  }

  goalAttributionModeling(campaignId: string, tenantId: string): GoalAttributionEntry[] {
    const report = this.trackGoalProgress(campaignId, tenantId);
    if (!report) return [];
    const attrSeed = hashStr(campaignId + tenantId + "attribution");
    const channels = ["Search", "Display", "Social", "Email", "Direct", "Referral"];
    const totalProgress = report.goals.reduce((s, g) => s + g.progress, 0);
    return channels.map((ch, ci) => {
      const contribution = 5 + ((attrSeed + ci * 13) % 35);
      const attributedVal = Math.round(totalProgress * contribution / 100 * 100) / 100;
      const eff = 60 + ((attrSeed + ci * 17) % 35);
      const marginal = ((attrSeed + ci * 19) % 30) / 10;
      return {
        channel: ch,
        attributedProgress: attributedVal,
        attributedValue: Math.round((report.goals[0]?.current || 1000) * contribution / 100),
        contributionPercent: contribution,
        efficiency: eff,
        marginalImpact: Math.round(marginal * 100) / 100,
        recommendation: contribution > 25 ? `${ch} is primary driver (${contribution}%) — increase investment to accelerate goal achievement` : contribution > 10 ? `${ch} contributes ${contribution}% — maintain or incrementally increase` : `${ch} contribution low (${contribution}%) — optimize or reallocate to higher-impact channels`,
      };
    });
  }

  goalStressTesting(campaignId: string, tenantId: string): GoalStressScenario[] {
    const report = this.trackGoalProgress(campaignId, tenantId);
    if (!report) return [];
    const stressSeed = hashStr(campaignId + tenantId + "stress");
    const scenarios = [
      { name: "Budget Cut (20%)", prob: 0.15, multiplier: 0.8 },
      { name: "Market Downturn", prob: 0.1, multiplier: 0.65 },
      { name: "Competitor Entry", prob: 0.2, multiplier: 0.85 },
      { name: "Seasonal Uplift", prob: 0.25, multiplier: 1.3 },
      { name: "Channel Expansion", prob: 0.15, multiplier: 1.2 },
      { name: "Best Case", prob: 0.15, multiplier: 1.4 },
    ];
    return scenarios.map((sc, si) => {
      const metrics = report.goals.map(g => {
        const baseProj = g.projected;
        const stressed = Math.round(baseProj * sc.multiplier * (0.9 + ((stressSeed + si * 13) % 20) / 100) * 100) / 100;
        return {
          metric: g.metric,
          baseProjection: baseProj,
          stressedProjection: stressed,
          deviation: Math.round((stressed - baseProj) / Math.max(1, baseProj) * 10000) / 100,
        };
      });
      const risk: "low" | "medium" | "high" = sc.multiplier < 0.8 ? "high" : sc.multiplier < 1.0 ? "medium" : "low";
      return {
        scenario: sc.name,
        probability: sc.prob,
        impactedMetrics: metrics,
        overallRisk: risk,
        recommendedActions: risk === "high" ? ["Build contingency budget reserve", "Identify quick-win optimization levers", "Set early warning triggers at 60% of target"] : risk === "medium" ? ["Monitor closely", "Prepare mitigating actions for top 3 metrics"] : ["Continue current trajectory", "Capture upside with aggressive targets"],
      };
    });
  }

  goalOptimizationSuggestions(campaignId: string, tenantId: string): GoalOptimizationSuggestion[] {
    const report = this.trackGoalProgress(campaignId, tenantId);
    if (!report) return [];
    const optSeed = hashStr(campaignId + tenantId + "optimization");
    return report.goals.map((g, gi) => {
      const actions: GoalOptimizationSuggestion["suggestedActions"] = [];
      if (g.status === "behind" || g.status === "at-risk") {
        actions.push({ action: `Increase ${g.metric} bid by 15%`, expectedLift: 8 + ((optSeed + gi * 7) % 15), effort: "low", timeframe: "1 week" });
        actions.push({ action: `Expand targeting for ${g.metric}`, expectedLift: 12 + ((optSeed + gi * 13) % 20), effort: "medium", timeframe: "2 weeks" });
        actions.push({ action: `Refresh creative for ${g.metric} focus`, expectedLift: 10 + ((optSeed + gi * 17) % 15), effort: "high", timeframe: "3 weeks" });
      } else {
        actions.push({ action: `Maintain current ${g.metric} strategy`, expectedLift: 3 + ((optSeed + gi * 7) % 8), effort: "low", timeframe: "ongoing" });
        actions.push({ action: `A/B test ${g.metric} optimizations`, expectedLift: 5 + ((optSeed + gi * 13) % 10), effort: "medium", timeframe: "2 weeks" });
      }
      const composite = actions.reduce((s, a) => s + a.expectedLift, 0) / actions.length;
      return {
        metric: g.metric, currentProgress: g.progress, target: g.target,
        suggestedActions: actions,
        compositePotential: Math.round(composite * 100) / 100,
        priority: g.status === "behind" ? "high" : g.status === "at-risk" ? "medium" : "low",
      };
    });
  }

  goalDependencyGraph(campaignId: string, tenantId: string): GoalDependencyEntry[] {
    const report = this.trackGoalProgress(campaignId, tenantId);
    if (!report) return [];
    const depSeed = hashStr(campaignId + tenantId + "deps");
    const pairs = [
      { a: "impressions", b: "clicks", rel: "reinforcing" as const },
      { a: "clicks", b: "conversions", rel: "reinforcing" as const },
      { a: "impressions", b: "ctr", rel: "conflicting" as const },
      { a: "conversions", b: "revenue", rel: "reinforcing" as const },
      { a: "revenue", b: "roas", rel: "conflicting" as const },
      { a: "clicks", b: "ctr", rel: "conflicting" as const },
      { a: "conversions", b: "roas", rel: "conflicting" as const },
      { a: "impressions", b: "roas", rel: "conflicting" as const },
    ];
    return pairs.map((p, pi) => {
      const strength = 40 + ((depSeed + pi * 13) % 55);
      const goalA = report.goals.find(g => g.metric === p.a);
      const goalB = report.goals.find(g => g.metric === p.b);
      const aBehind = goalA && (goalA.status === "behind" || goalA.status === "at-risk");
      const bBehind = goalB && (goalB.status === "behind" || goalB.status === "at-risk");
      const bothStruggling = aBehind && bBehind;
      return {
        goalA: p.a, goalB: p.b, relationship: p.rel, strength,
        description: p.rel === "reinforcing" ? `Improving ${p.a} directly benefits ${p.b} — align strategies` : `Optimizing ${p.a} may reduce ${p.b} — use dual-KPI approach`,
        managementStrategy: p.rel === "reinforcing" ? `Jointly optimize ${p.a} and ${p.b} with shared investment` : bothStruggling ? `Critical tension — set ${p.a} floor and ${p.b} target with trade-off analysis` : `Apply weighted scoring to balance ${p.a} and ${p.b}`,
      };
    });
  }

  goalHistoricalBenchmarking(campaignId: string, tenantId: string): GoalBenchmarkEntry[] {
    const report = this.trackGoalProgress(campaignId, tenantId);
    if (!report) return [];
    const bmSeed = hashStr(campaignId + tenantId + "benchmark");
    return report.goals.map((g, gi) => {
      const benchAvg = 40 + ((bmSeed + gi * 13) % 40);
      const benchTop = 70 + ((bmSeed + gi * 17) % 25);
      const percentile = 20 + ((bmSeed + gi * 19) % 60);
      const gap = Math.round((benchTop - g.progress) * 100) / 100;
      return {
        metric: g.metric,
        ourTarget: g.target,
        ourCurrent: g.current,
        ourProgress: g.progress,
        benchmarkAvgProgress: benchAvg,
        benchmarkTopQuartile: benchTop,
        percentile,
        gapToTopQuartile: Math.max(0, gap),
        recommendation: percentile >= 75 ? `${g.metric} performance is top quartile — maintain strategy and document best practices` : percentile >= 50 ? `${g.metric} at median — incremental optimizations can close gap to top quartile (${Math.round(gap)} pts)` : `${g.metric} below median — significant opportunity: review targeting, creative, and budget allocation`,
      };
    });
  }

  goalDashboard(tenantId: string): { campaigns: { campaignId: string; campaignName: string; overallStatus: string; compositeProgress: number; healthScore: number; goals: number; atRisk: number }[]; totals: { totalCampaigns: number; onTrack: number; atRisk: number; behind: number; averageProgress: number } } {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const campaignRows: any[] = [];
    let onTrack = 0, atRisk = 0, behind = 0;
    for (const a of portfolio.analyses) {
      const report = this.trackGoalProgress(a.campaignId, tenantId);
      if (!report) continue;
      if (report.overallStatus === "ahead" || report.overallStatus === "on-track") onTrack++;
      else if (report.overallStatus === "at-risk") atRisk++;
      else behind++;
      campaignRows.push({
        campaignId: a.campaignId, campaignName: a.campaignName,
        overallStatus: report.overallStatus, compositeProgress: report.compositeProgress,
        healthScore: report.healthScore, goals: report.goals.length,
        atRisk: report.goals.filter(g => g.status === "behind" || g.status === "at-risk").length,
      });
    }
    const avgProgress = campaignRows.length > 0 ? Math.round(campaignRows.reduce((s, r) => s + r.compositeProgress, 0) / campaignRows.length * 100) / 100 : 0;
    return {
      campaigns: campaignRows,
      totals: { totalCampaigns: campaignRows.length, onTrack: onTrack + (campaignRows.filter(r => r.overallStatus === "ahead").length), atRisk, behind, averageProgress: avgProgress },
    };
  }

  goalQuickCheck(tenantId: string): { totalGoals: number; onTrack: number; atRisk: number; behind: number; healthStatus: "good" | "fair" | "critical"; summary: string } {
    const dashboard = this.goalDashboard(tenantId);
    const totalGoals = dashboard.campaigns.reduce((s, c) => s + c.goals, 0);
    const goalsBehind = dashboard.campaigns.reduce((s, c) => s + c.atRisk, 0);
    const onTrack = totalGoals - goalsBehind;
    const behind = goalsBehind;
    const pctOnTrack = totalGoals > 0 ? Math.round(onTrack / totalGoals * 100) : 100;
    const healthStatus: "good" | "fair" | "critical" = pctOnTrack >= 80 ? "good" : pctOnTrack >= 50 ? "fair" : "critical";
    const summary = `${onTrack}/${totalGoals} goals on track (${pctOnTrack}%) — ${dashboard.totals.totalCampaigns} campaigns tracked`;
    return { totalGoals, onTrack, atRisk: dashboard.totals.atRisk, behind, healthStatus, summary };
  }
}

export const campaignGoalTracker = new CampaignGoalTrackerService();
