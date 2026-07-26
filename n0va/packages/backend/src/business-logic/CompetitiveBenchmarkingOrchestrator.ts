import { DataStore } from "../services/DataStore";
import { competitiveBenchmarkingService } from "../services/CompetitiveBenchmarkingService";
import { decisionEngine } from "./DecisionEngine";

export interface CompetitiveTrend {
  metric: string;
  yourValue: number;
  benchmark: number;
  gapPct: number;
  direction: "ahead" | "behind" | "at_parity";
  urgency: number;
}

export interface DimensionBattleCard {
  dimension: string;
  yourScore: number;
  benchmarkScore: number;
  advantage: "lead" | "trail" | "parity";
  gapWidth: number;
  recommendedAction: string;
}

export interface BenchmarkingIntelligence {
  generatedAt: string;
  industry: string;
  overallScore: number;
  quadrant: string;
  competitiveTrends: CompetitiveTrend[];
  battleCard: DimensionBattleCard[];
  improvementPlan: { priority: number; action: string; expectedGain: string; effort: string }[];
  topThreats: string[];
  topOpportunities: string[];
  recommendations: string[];
}

export class CompetitiveBenchmarkingOrchestrator {
  analyze(tenantId: string, industry?: string): BenchmarkingIntelligence {
    const benchmarks = competitiveBenchmarkingService.getBenchmarks(tenantId, industry);
    const trendMap: Record<string, { yourValue: number; benchmark: number }> = {};
    for (const c of benchmarks.comparisons) {
      trendMap[c.metric] = { yourValue: c.yourValue, benchmark: c.benchmark };
    }
    const competitiveTrends: CompetitiveTrend[] = Object.entries(trendMap).map(([metric, d]) => {
      const gapPct = d.benchmark > 0 ? Math.round(((d.yourValue - d.benchmark) / d.benchmark) * 10000) / 100 : 0;
      const direction: "ahead" | "behind" | "at_parity" = gapPct > 10 ? "ahead" : gapPct < -10 ? "behind" : "at_parity";
      const urgency = direction === "behind" ? Math.min(100, Math.max(10, Math.abs(Math.round(gapPct)))) : 0;
      return { metric, yourValue: d.yourValue, benchmark: d.benchmark, gapPct, direction, urgency };
    });
    const betterHigher = ["ctr", "cvr", "roas", "spend", "active_campaigns", "budget_utilization"];
    const dims = [
      { name: "Efficiency", metrics: ["avgCpc", "avgCpm", "avgCpa"] },
      { name: "Conversion", metrics: ["avgCvr", "avgRoas"] },
      { name: "Engagement", metrics: ["avgCtr"] },
      { name: "Scale", metrics: ["avgSpendPerCampaign", "totalSpend"] },
      { name: "Utilization", metrics: ["avgBudgetUtilization", "activeCampaigns"] },
    ];
    const battleCard: DimensionBattleCard[] = dims.map(dim => {
      let yourScore = 0, benchScore = 0, count = 0;
      for (const m of dim.metrics) {
        const t = competitiveTrends.find(ct => ct.metric === m);
        if (t) {
          const isHB = betterHigher.some(bh => m.toLowerCase().includes(bh.replace(/_/g, "")));
          const norm = Math.max(0.01, t.benchmark);
          yourScore += isHB ? Math.min(100, (t.yourValue / norm) * 50) : Math.min(100, (norm / Math.max(0.01, t.yourValue)) * 50);
          benchScore += 50;
          count++;
        }
      }
      const yAvg = count > 0 ? Math.round(yourScore / count) : 50;
      const bAvg = count > 0 ? Math.round(benchScore / count) : 50;
      const diff = yAvg - bAvg;
      return {
        dimension: dim.name, yourScore: yAvg, benchmarkScore: bAvg,
        advantage: diff > 10 ? "lead" : diff < -10 ? "trail" : "parity",
        gapWidth: diff, recommendedAction: diff < -10 ? `Improve ${dim.name.toLowerCase()} — focus on underperforming metrics` : diff > 10 ? `Maintain ${dim.name.toLowerCase()} advantage` : `Monitor ${dim.name.toLowerCase()} for changes`,
      };
    });
    const weaknesses = competitiveTrends.filter(t => t.direction === "behind").sort((a, b) => b.urgency - a.urgency);
    const strengths = competitiveTrends.filter(t => t.direction === "ahead").sort((a, b) => b.gapPct - a.gapPct);
    const improvementPlan = weaknesses.slice(0, 5).map((w, i) => ({
      priority: i + 1, action: `Improve ${w.metric} by ${Math.abs(w.gapPct).toFixed(0)}% to reach benchmark`,
      expectedGain: `+${Math.abs(w.gapPct).toFixed(0)}% ${w.metric}`,
      effort: w.urgency > 40 ? "high" : w.urgency > 20 ? "medium" : "low",
    }));
    const topThreats = weaknesses.slice(0, 3).map(w => `${w.metric} is ${Math.abs(w.gapPct).toFixed(0)}% below benchmark`);
    const topOpportunities = strengths.slice(0, 3).map(s => `${s.metric} is ${s.gapPct.toFixed(0)}% ahead of benchmark — leverage in messaging`);
    const recommendations: string[] = [];
    if (benchmarks.overallScore < 50) recommendations.push("Overall competitive score below 50 — comprehensive improvement plan needed.");
    if (benchmarks.topWeaknesses.length > 0) recommendations.push(`Critical weakness: ${benchmarks.topWeaknesses[0]?.label} (${benchmarks.topWeaknesses[0]?.percentile}th percentile).`);
    if (benchmarks.topStrengths.length > 0) recommendations.push(`Top strength: ${benchmarks.topStrengths[0]?.label} (${benchmarks.topStrengths[0]?.percentile}th percentile).`);
    return {
      generatedAt: new Date().toISOString(), industry: industry || "saas", overallScore: benchmarks.overallScore,
      quadrant: quadrantForScore(benchmarks.overallScore), competitiveTrends, battleCard,
      improvementPlan, topThreats, topOpportunities, recommendations,
    };
  }
}

function quadrantForScore(score: number): string {
  if (score >= 70) return "leader";
  if (score >= 50) return "challenger";
  if (score >= 30) return "niche";
  return "laggard";
}

export const competitiveBenchmarkingOrchestrator = new CompetitiveBenchmarkingOrchestrator();
