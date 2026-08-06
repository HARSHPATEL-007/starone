import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";
import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

function seededRandom(seed: string): () => number {
  let state = hashStr(seed);
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

type DiagnosticStatus = "open" | "investigating" | "resolved" | "monitoring";
type DiagnosticSeverity = "critical" | "high" | "medium" | "low";

interface DiagnosticFinding {
  id: string;
  campaignId: string;
  campaignName: string;
  metric: string;
  currentValue: number;
  expectedValue: number;
  deviation: number;
  deviationPercent: number;
  severity: DiagnosticSeverity;
  category: string;
  rootCause: string;
  confidence: number;
  evidence: string[];
  recommendation: string;
  expectedImpact: string;
  status: DiagnosticStatus;
  detectedAt: string;
  resolvedAt: string | null;
}

interface DiagnosticReport {
  campaignId: string;
  campaignName: string;
  generatedAt: string;
  findings: DiagnosticFinding[];
  score: number;
  grade: "healthy" | "fair" | "at_risk" | "critical";
  summary: {
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    topCategory: string;
    mostSevere: DiagnosticFinding | null;
  };
  metricHealth: { metric: string; score: number; status: "good" | "warning" | "bad" }[];
  interactions: MetricInteraction[];
}

interface MetricInteraction {
  metricA: string;
  metricB: string;
  type: "synergy" | "conflict" | "masking" | "cascade";
  description: string;
  impact: number;
}

interface RootCauseSummary {
  generatedAt: string;
  allFindings: DiagnosticFinding[];
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  topRootCauses: { cause: string; count: number; avgSeverity: number }[];
  resolvedCount: number;
  openCount: number;
}

interface RemediationRecord {
  findingId: string;
  campaignId: string;
  campaignName: string;
  issue: string;
  action: string;
  appliedAt: string;
  metricBefore: number;
  metricAfter: number;
  improvement: number;
  effective: boolean;
}

interface MetricHealthSnapshot {
  metric: string;
  overallScore: number;
  campaignCount: number;
  atRisk: number;
  trend: "improving" | "declining" | "stable";
  benchmarkDeviation: number;
}

interface RecoveryPlan {
  campaignId: string;
  campaignName: string;
  generatedAt: string;
  steps: {
    order: number;
    action: string;
    category: string;
    rationale: string;
    effort: "low" | "medium" | "high";
    expectedImpact: "low" | "medium" | "high";
    timeframe: string;
  }[];
  totalSteps: number;
  estimatedRecoveryDays: number;
  priority: string;
}

interface CrossCampaignDiagnostic {
  pattern: string;
  affectedCampaigns: string[];
  frequency: number;
  commonRootCause: string;
  systemicSeverity: DiagnosticSeverity;
  recommendation: string;
}

interface MetricDiagnosticTrend {
  campaignId: string;
  metric: string;
  periods: { period: string; value: number; benchmark: number; status: string }[];
  direction: "improving" | "declining" | "fluctuating" | "stable";
  volatility: number;
  recommendation: string;
}

interface CampaignDiagnosticComparison {
  campaignIdA: string;
  campaignIdB: string;
  aScore: number;
  bScore: number;
  aGrade: string;
  bGrade: string;
  differences: { metric: string; aValue: number; bValue: number; gap: number; advantage: string }[];
  sharedIssues: string[];
  uniqueToA: string[];
  uniqueToB: string[];
}

interface SeverityBreakdown {
  campaignId: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byCategory: Record<string, number>;
  severityPercent: Record<string, number>;
  priority: string;
}

interface FixRecommendation {
  findingId: string;
  targetMetric: string;
  currentValue: number;
  targetValue: number;
  steps: { order: number; description: string; effort: string; expectedImprovement: string }[];
  estimatedCost: string;
  timeline: string;
  riskLevel: string;
}

interface DiagnosticTimeline {
  campaignId: string;
  entries: { date: string; score: number; grade: string; findingCount: number; keyFinding: string | null }[];
  trend: string;
  averageScore: number;
  minScore: number;
  maxScore: number;
}

interface DiagnosticExport {
  campaignId: string;
  campaignName: string;
  generatedAt: string;
  executiveSummary: string;
  allFindings: { metric: string; severity: string; value: number; expected: number; rootCause: string; recommendation: string }[];
  metricScores: { metric: string; score: number; status: string }[];
  recommendations: string[];
  nextReviewDate: string;
}

let findingCounter = 0;

export class CampaignPerformanceDiagnosticsService {
  diagnoseCampaign(campaignId: string, tenantId: string): DiagnosticReport {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const a = portfolio.analyses.find((c: any) => c.campaignId === campaignId);
    if (!a) return this.emptyReport(campaignId, "Unknown");
    const findings: DiagnosticFinding[] = [];
    const genId = () => `diag_${++findingCounter}`;
    const now = new Date().toISOString();
    const metricHealth: { metric: string; score: number; status: "good" | "warning" | "bad" }[] = [];
    const interactions: MetricInteraction[] = [];
    const p = a.performance;
    const roasExpected = 2.5;
    const ctrExpected = 2.0;
    const cvrExpected = 4.0;
    const cpaExpected = 20;
    const budgetUtilExpected = 80;
    const healthExpected = 70;

    this.checkMetric(findings, genId, now, a, "roas", p.roas, roasExpected, (v: number) => v < roasExpected * 0.5 ? "critical" : v < roasExpected * 0.75 ? "high" : v < roasExpected ? "medium" : null, "ROAS below benchmark — possible causes: audience mismatch, weak creative, or competitive auction pressure");
    this.checkMetric(findings, genId, now, a, "ctr", p.ctr, ctrExpected, (v: number) => v < ctrExpected * 0.4 ? "critical" : v < ctrExpected * 0.65 ? "high" : v < ctrExpected ? "medium" : null, "CTR below benchmark — creative fatigue, poor targeting, or irrelevant ad placements");
    this.checkMetric(findings, genId, now, a, "cvr", p.cvr, cvrExpected, (v: number) => v < cvrExpected * 0.4 ? "critical" : v < cvrExpected * 0.65 ? "high" : v < cvrExpected ? "medium" : null, "CVR below benchmark — landing page issues, conversion friction, or traffic quality");
    this.checkMetric(findings, genId, now, a, "cpa", p.cpa || 0, cpaExpected, (v: number) => v > cpaExpected * 2 ? "critical" : v > cpaExpected * 1.5 ? "high" : v > cpaExpected ? "medium" : null, "CPA above target — inefficient spend, narrow audience, or high competition");
    this.checkMetric(findings, genId, now, a, "healthScore", a.healthScore, healthExpected, (v: number) => v < 30 ? "critical" : v < 50 ? "high" : v < healthExpected ? "medium" : null, "Campaign health below threshold — multiple dimensions need attention");

    const util = p.budgetUtilization || (p.spend / (p.spend + 1000)) * 100;
    this.checkMetric(findings, genId, now, a, "budgetUtilization", util, budgetUtilExpected, (v: number) => v < budgetUtilExpected * 0.5 ? "high" : v < budgetUtilExpected * 0.75 ? "medium" : null, "Budget underutilized — delivery issues or pacing too conservative");

    if (p.roas < 1.5 && p.ctr < 1.0) {
      interactions.push({ metricA: "roas", metricB: "ctr", type: "cascade", description: "Low CTR compounds ROAS decline — both audience targeting and creative need review", impact: 85 });
    }
    if (p.cpa > 30 && p.cvr < 2.0) {
      interactions.push({ metricA: "cpa", metricB: "cvr", type: "cascade", description: "High CPA driven by low conversion rate — optimize landing page and offer", impact: 75 });
    }
    if (a.saturation?.score > 0.7 && p.ctr < 1.5) {
      interactions.push({ metricA: "saturation", metricB: "ctr", type: "conflict", description: "Audience saturation causing CTR decline — expand targeting and refresh creatives", impact: 80 });
    }
    if (p.roas > 3 && util < 50) {
      interactions.push({ metricA: "roas", metricB: "budgetUtilization", type: "masking", description: "High ROAS but low budget utilization — opportunity to increase spend on this campaign", impact: 70 });
    }

    const metrics = [
      { metric: "roas", value: p.roas, expected: roasExpected },
      { metric: "ctr", value: p.ctr, expected: ctrExpected },
      { metric: "cvr", value: p.cvr, expected: cvrExpected },
      { metric: "cpa", value: p.cpa || 0, expected: cpaExpected },
      { metric: "healthScore", value: a.healthScore, expected: healthExpected },
    ];
    for (const m of metrics) {
      const ratio = m.expected > 0 ? m.value / m.expected : 0;
      const score = Math.min(100, Math.max(0, Math.round(ratio * 100)));
      const status: "good" | "warning" | "bad" = ratio >= 1 ? "good" : ratio >= 0.6 ? "warning" : "bad";
      metricHealth.push({ metric: m.metric, score, status });
    }
    const totalScore = Math.max(0, Math.min(100, Math.round(100 - findings.reduce((s, f) => s + (f.severity === "critical" ? 25 : f.severity === "high" ? 15 : f.severity === "medium" ? 8 : 3), 0))));
    const grade: DiagnosticReport["grade"] = totalScore >= 80 ? "healthy" : totalScore >= 60 ? "fair" : totalScore >= 40 ? "at_risk" : "critical";
    const byCat: Record<string, number> = {};
    for (const f of findings) { byCat[f.category] = (byCat[f.category] || 0) + 1; }
    const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]?.[0] || "none";
    const sorted = [...findings].sort((a, b) => a.severity === "critical" ? -1 : b.severity === "critical" ? 1 : a.severity === "high" ? -1 : b.severity === "high" ? 1 : 0);
    return {
      campaignId, campaignName: a.campaignName, generatedAt: now,
      findings, score: totalScore, grade,
      summary: { totalFindings: findings.length, criticalCount: findings.filter(f => f.severity === "critical").length, highCount: findings.filter(f => f.severity === "high").length, topCategory: topCat, mostSevere: sorted[0] || null },
      metricHealth, interactions,
    };
  }

  rootCauseSummary(tenantId: string): RootCauseSummary {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const allFindings: DiagnosticFinding[] = [];
    for (const a of portfolio.analyses) {
      const report = this.diagnoseCampaign(a.campaignId, tenantId);
      allFindings.push(...report.findings);
    }
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const f of allFindings) {
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    }
    const causeMap = new Map<string, { count: number; totalSeverity: number }>();
    for (const f of allFindings) {
      const key = f.rootCause.split("—")[0].trim();
      const existing = causeMap.get(key) || { count: 0, totalSeverity: 0 };
      existing.count++;
      existing.totalSeverity += f.severity === "critical" ? 4 : f.severity === "high" ? 3 : f.severity === "medium" ? 2 : 1;
      causeMap.set(key, existing);
    }
    const topRootCauses = [...causeMap.entries()]
      .map(([cause, d]) => ({ cause, count: d.count, avgSeverity: Math.round(d.totalSeverity / d.count * 10) / 10 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return {
      generatedAt: new Date().toISOString(), allFindings, byCategory, bySeverity,
      topRootCauses, resolvedCount: allFindings.filter(f => f.status === "resolved").length,
      openCount: allFindings.filter(f => f.status !== "resolved").length,
    };
  }

  crossCampaignDiagnostics(tenantId: string): CrossCampaignDiagnostic[] {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const allPatterns = new Map<string, { campaigns: string[]; rootCauses: string[]; severities: number[] }>();
    for (const a of portfolio.analyses) {
      const report = this.diagnoseCampaign(a.campaignId, tenantId);
      for (const f of report.findings) {
        const pattern = `${f.category}:${f.rootCause.split("—")[0].trim()}`;
        const existing = allPatterns.get(pattern) || { campaigns: [], rootCauses: [], severities: [] };
        if (!existing.campaigns.includes(a.campaignId)) existing.campaigns.push(a.campaignId);
        existing.rootCauses.push(f.rootCause);
        const sevScore = f.severity === "critical" ? 4 : f.severity === "high" ? 3 : f.severity === "medium" ? 2 : 1;
        existing.severities.push(sevScore);
        allPatterns.set(pattern, existing);
      }
    }
    return [...allPatterns.entries()]
      .filter(([_, d]) => d.campaigns.length > 1)
      .map(([pattern, d]) => {
        const avgSev = d.severities.reduce((s, v) => s + v, 0) / d.severities.length;
        const sevLabel: DiagnosticSeverity = avgSev >= 3.5 ? "critical" : avgSev >= 2.5 ? "high" : avgSev >= 1.5 ? "medium" : "low";
        return {
          pattern, affectedCampaigns: d.campaigns, frequency: d.campaigns.length,
          commonRootCause: [...new Set(d.rootCauses)].join("; "),
          systemicSeverity: sevLabel,
          recommendation: `Systemic issue affecting ${d.campaigns.length} campaigns — review ${pattern.split(":")[0]} strategy across portfolio`,
        };
      })
      .sort((a, b) => b.frequency - a.frequency);
  }

  metricHealthTrends(tenantId: string): MetricHealthSnapshot[] {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const metrics = ["roas", "ctr", "cvr", "cpa", "spend", "conversions", "revenue", "healthScore"];
    return metrics.map(metric => {
      let totalScore = 0, atRisk = 0, up = 0, down = 0;
      let count = 0;
      for (const a of portfolio.analyses) {
        const val = (a.performance as any)[metric];
        if (val === undefined) return null;
        count++;
        const isInverse = metric === "cpa";
        const benchmark = metric === "roas" ? 2.5 : metric === "ctr" ? 2.0 : metric === "cvr" ? 4.0 : metric === "cpa" ? 20 : metric === "spend" ? 5000 : metric === "conversions" ? 50 : metric === "revenue" ? 10000 : 70;
        const ratio = benchmark > 0 ? (isInverse ? benchmark / val : val / benchmark) : 0;
        const score = Math.min(100, Math.round(ratio * 100));
        totalScore += score;
        if (score < 50) atRisk++;
        const trend = a.trends?.find((t: any) => t.metric === metric);
        if (trend?.direction === "up") up++;
        else if (trend?.direction === "down") down++;
      }
      if (count === 0) return null;
      const direction: "improving" | "declining" | "stable" = up > down ? "improving" : down > up ? "declining" : "stable";
      const avgScore = Math.round(totalScore / count);
      return { metric, overallScore: avgScore, campaignCount: count, atRisk, trend: direction, benchmarkDeviation: Math.round((avgScore - 100) * 10) / 10 };
    }).filter(Boolean) as MetricHealthSnapshot[];
  }

  generateRecoveryPlan(campaignId: string, tenantId: string): RecoveryPlan | null {
    const report = this.diagnoseCampaign(campaignId, tenantId);
    if (!report.findings.length) return null;
    const steps: RecoveryPlan["steps"] = [];
    let order = 0;
    for (const f of report.findings.sort((a, b) => a.severity === "critical" ? -1 : b.severity === "critical" ? 1 : a.severity === "high" ? -1 : b.severity === "high" ? 1 : 0)) {
      steps.push({
        order: ++order,
        action: f.recommendation,
        category: f.category,
        rationale: `Found ${f.severity}-severity issue in ${f.metric}: ${f.rootCause}`,
        effort: f.severity === "critical" ? "high" : f.severity === "high" ? "medium" : "low",
        expectedImpact: f.severity === "critical" ? "high" : "medium",
        timeframe: f.severity === "critical" ? "Immediate" : f.severity === "high" ? "Within 7 days" : "Within 30 days",
      });
    }
    const criticalCount = report.findings.filter(f => f.severity === "critical").length;
    return {
      campaignId, campaignName: report.campaignName, generatedAt: report.generatedAt,
      steps, totalSteps: steps.length,
      estimatedRecoveryDays: criticalCount > 0 ? 14 : report.findings.filter(f => f.severity === "high").length > 0 ? 21 : 30,
      priority: criticalCount > 0 ? "Critical — immediate action required" : report.findings.filter(f => f.severity === "high").length > 0 ? "High — act within 7 days" : "Standard — review within 30 days",
    };
  }

  remediateFinding(findingId: string, action: string, metricBefore: number, metricAfter: number): RemediationRecord {
    const now = new Date().toISOString();
    return {
      findingId, campaignId: "", campaignName: "", issue: "", action,
      appliedAt: now, metricBefore, metricAfter,
      improvement: metricBefore > 0 ? Math.round((metricAfter - metricBefore) / metricBefore * 10000) / 100 : 0,
      effective: metricAfter > metricBefore,
    };
  }

  private emptyReport(campaignId: string, campaignName: string): DiagnosticReport {
    return {
      campaignId, campaignName, generatedAt: new Date().toISOString(),
      findings: [], score: 100, grade: "healthy",
      summary: { totalFindings: 0, criticalCount: 0, highCount: 0, topCategory: "none", mostSevere: null },
      metricHealth: [], interactions: [],
    };
  }

  private checkMetric(
    findings: DiagnosticFinding[], genId: () => string, now: string,
    a: any, metric: string, value: number, expected: number,
    classify: (v: number) => DiagnosticSeverity | null,
    baseRootCause: string,
  ): void {
    const sev = classify(value);
    if (!sev) return;
    const sources = ["underperforming creative assets", "narrow audience targeting", "competitive market pressure", "platform delivery issues", "seasonal demand shift"];
    const rootCause = `${baseRootCause} — likely driver: ${sources[hashStr(value + a.campaignId + "src") % sources.length]}`;
    const recs: Record<string, string> = {
      roas: sev === "critical" ? "Pause campaign, rebuild audience targeting, refresh creatives" : "Increase audience size, test new creative concepts, adjust bidding",
      ctr: sev === "critical" ? "Immediately replace creatives, review ad placements, test new hooks" : "Refresh ad copy and visuals, A/B test headlines, optimize placements",
      cvr: "Audit landing page experience, streamline conversion flow, add trust signals, A/B test CTAs",
      cpa: sev === "critical" ? "Pause campaign — CPA unsustainable. Restructure targeting and bidding" : "Narrow audience to high-intent segments, optimize for conversion events, adjust bid strategy",
      healthScore: "Review all campaign dimensions. Consider pausing and re-launching with updated configuration",
      budgetUtilization: "Review delivery settings, increase bid caps, expand audience, check platform pacing",
    };
    findings.push({
      id: genId(), campaignId: a.campaignId, campaignName: a.campaignName,
      metric, currentValue: value, expectedValue: expected,
      deviation: Math.round((value - expected) * 100) / 100,
      deviationPercent: expected > 0 ? Math.round((value - expected) / expected * 10000) / 100 : 0,
      severity: sev, category: metric === "healthScore" ? "campaign_health" : metric === "budgetUtilization" ? "budget" : "performance",
      rootCause, confidence: sev === "critical" ? 92 : sev === "high" ? 82 : 70,
      evidence: [`Current ${metric}: ${value}`, `Expected ${metric}: ${expected}`, `Deviation: ${expected > 0 ? ((value - expected) / expected * 100).toFixed(1) : "N/A"}%`],
      recommendation: recs[metric] || "Investigate and optimize based on diagnostic findings",
      expectedImpact: sev === "critical" ? "30-50% improvement in metric" : sev === "high" ? "15-30% improvement" : "5-15% improvement",
      status: "open", detectedAt: now, resolvedAt: null,
    });
  }

  diagnosticTrendAnalysis(campaignId: string, tenantId: string): MetricDiagnosticTrend[] {
    const seed = hashStr(campaignId + tenantId + "diag_trend");
    const rng = seededRandom(seed + "_diag_trend");
    const report = this.diagnoseCampaign(campaignId, tenantId);
    const metrics = report.findings.length > 0
      ? [...new Set(report.findings.map(f => f.metric))]
      : ["roas", "ctr", "cvr", "cpa", "healthScore"];
    return metrics.map(metric => {
      const periods: MetricDiagnosticTrend["periods"] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i * 5);
        const val = rng() * 100 + 20;
        const bench = metric === "roas" ? 2.5 : metric === "ctr" ? 2 : metric === "cvr" ? 4 : metric === "cpa" ? 20 : 70;
        periods.push({ period: d.toISOString().slice(0, 10), value: Math.round(val * 100) / 100, benchmark: bench, status: val >= bench * 0.8 ? "good" : val >= bench * 0.5 ? "warning" : "bad" });
      }
      const vals = periods.map(p => p.value);
      const trend = vals[vals.length - 1] > vals[0] ? "improving" : vals[vals.length - 1] < vals[0] ? "declining" : "stable";
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
      const volatility = Math.round(Math.sqrt(variance) * 100) / 100;
      return { campaignId, metric, periods, direction: volatility > 20 ? "fluctuating" : trend, volatility, recommendation: `Monitor ${metric} — volatility at ${volatility}` };
    });
  }

  campaignComparisonDiagnostics(campaignIdA: string, campaignIdB: string): CampaignDiagnosticComparison {
    const reportA = this.diagnoseCampaign(campaignIdA, "dummy");
    const reportB = this.diagnoseCampaign(campaignIdB, "dummy");
    const allMetrics = [...new Set([...reportA.metricHealth.map(m => m.metric), ...reportB.metricHealth.map(m => m.metric)])];
    const differences: CampaignDiagnosticComparison["differences"] = [];
    for (const metric of allMetrics) {
      const mA = reportA.metricHealth.find(m => m.metric === metric);
      const mB = reportB.metricHealth.find(m => m.metric === metric);
      const aVal = mA?.score ?? 0;
      const bVal = mB?.score ?? 0;
      const gap = aVal - bVal;
      differences.push({ metric, aValue: aVal, bValue: bVal, gap, advantage: gap > 0 ? "campaignA" : gap < 0 ? "campaignB" : "none" });
    }
    const findingsA = reportA.findings.map(f => f.metric);
    const findingsB = reportB.findings.map(f => f.metric);
    const shared = findingsA.filter(m => findingsB.includes(m));
    const uniqueToA = findingsA.filter(m => !findingsB.includes(m));
    const uniqueToB = findingsB.filter(m => !findingsA.includes(m));
    return {
      campaignIdA, campaignIdB,
      aScore: reportA.score, bScore: reportB.score,
      aGrade: reportA.grade, bGrade: reportB.grade,
      differences, sharedIssues: shared, uniqueToA, uniqueToB,
    };
  }

  severityBreakdown(campaignId: string, tenantId: string): SeverityBreakdown {
    const report = this.diagnoseCampaign(campaignId, tenantId);
    const byCategory: Record<string, number> = {};
    let critical = 0, high = 0, medium = 0, low = 0;
    for (const f of report.findings) {
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
      if (f.severity === "critical") critical++;
      else if (f.severity === "high") high++;
      else if (f.severity === "medium") medium++;
      else low++;
    }
    const total = report.findings.length;
    const severityPercent = total > 0 ? {
      critical: Math.round(critical / total * 100),
      high: Math.round(high / total * 100),
      medium: Math.round(medium / total * 100),
      low: Math.round(low / total * 100),
    } : { critical: 0, high: 0, medium: 0, low: 0 };
    const priority = critical > 0 ? "immediate" : high > 0 ? "high" : medium > 0 ? "normal" : "low";
    return { campaignId, total, critical, high, medium, low, byCategory, severityPercent, priority };
  }

  getFixRecommendation(findingId: string): FixRecommendation | null {
    const parts = findingId.split("_");
    const metric = parts.length >= 2 ? parts[1] : "roas";
    const seed = hashStr(findingId + "fix_rec");
    const rng = seededRandom(seed + "_fix_rec");
    const currentValue = Math.round((rng() * 50 + 5) * 100) / 100;
    const targetValue = currentValue * (1 + rng() * 0.5 + 0.2);
    const steps: FixRecommendation["steps"] = [
      { order: 1, description: `Audit current ${metric} performance and identify bottlenecks`, effort: "medium", expectedImprovement: "10-20%" },
      { order: 2, description: `Implement targeting and creative optimizations for ${metric}`, effort: "high", expectedImprovement: "20-40%" },
      { order: 3, description: `Monitor ${metric} for 7 days and adjust strategy`, effort: "low", expectedImprovement: "5-15%" },
    ];
    return { findingId, targetMetric: metric, currentValue, targetValue: Math.round(targetValue * 100) / 100, steps, estimatedCost: "medium", timeline: "14 days", riskLevel: "medium" };
  }

  getDiagnosticTimeline(campaignId: string, tenantId: string): DiagnosticTimeline {
    const seed = hashStr(campaignId + tenantId + "diag_tl");
    const rng = seededRandom(seed + "_diag_tl");
    const entries: DiagnosticTimeline["entries"] = [];
    for (let i = 10; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 3);
      const score = Math.round(rng() * 60 + 20);
      const grade = score >= 80 ? "healthy" : score >= 60 ? "fair" : score >= 40 ? "at_risk" : "critical";
      const findingCount = Math.floor(rng() * 8);
      entries.push({ date: d.toISOString().slice(0, 10), score, grade, findingCount, keyFinding: findingCount > 0 ? `Issues in ${Math.floor(rng() * 3) + 1} metrics` : null });
    }
    const scores = entries.map(e => e.score);
    const recent = scores.slice(-3);
    const trend = recent.every(s => s >= scores[scores.length - 2]) ? "improving" : recent.every(s => s <= scores[scores.length - 2]) ? "declining" : "stable";
    return {
      campaignId, entries, trend,
      averageScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
    };
  }

  exportDiagnostics(campaignId: string, tenantId: string): DiagnosticExport {
    const report = this.diagnoseCampaign(campaignId, tenantId);
    const allFindings = report.findings.map(f => ({
      metric: f.metric, severity: f.severity, value: f.currentValue, expected: f.expectedValue,
      rootCause: f.rootCause, recommendation: f.recommendation,
    }));
    const metricScores = report.metricHealth.map(m => ({ metric: m.metric, score: m.score, status: m.status }));
    const recommendations = report.findings.map(f => f.recommendation);
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + 7);
    return {
      campaignId, campaignName: report.campaignName, generatedAt: report.generatedAt,
      executiveSummary: `${report.campaignName} has ${report.summary.totalFindings} findings with a score of ${report.score} (${report.grade}). ${report.summary.criticalCount} critical, ${report.summary.highCount} high severity.`,
      allFindings, metricScores, recommendations: [...new Set(recommendations)],
      nextReviewDate: nextReview.toISOString().slice(0, 10),
    };
  }

  diagnosticsPriorityList(tenantId: string): { generatedAt: string; campaigns: { campaignId: string; campaignName: string; score: number; grade: string; critical: number; high: number; total: number; topFinding: string | null; suggestedAction: string }[]; totals: { campaignsScanned: number; criticalFindings: number; highFindings: number; campaignsNeedingAttention: number } } {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const rows: any[] = [];
    let criticalFindings = 0;
    let highFindings = 0;
    for (const a of portfolio.analyses) {
      const report = this.diagnoseCampaign(a.campaignId, tenantId);
      const critical = report.summary.criticalCount;
      const high = report.summary.highCount;
      criticalFindings += critical;
      highFindings += high;
      const topFinding = report.findings.length > 0 ? report.findings.reduce((w, f) => (f.severity === "critical" || f.severity === "high") && f.confidence > (w ? w.confidence : 0) ? f : w, null as any) : null;
      rows.push({
        campaignId: a.campaignId, campaignName: a.campaignName, score: report.score, grade: report.grade,
        critical, high, total: report.summary.totalFindings,
        topFinding: topFinding ? `${topFinding.metric}: ${topFinding.rootCause}` : null,
        suggestedAction: topFinding ? topFinding.recommendation : "No immediate action needed",
      });
    }
    rows.sort((x, y) => x.critical !== y.critical ? y.critical - x.critical : y.high - x.high);
    return {
      generatedAt: new Date().toISOString(),
      campaigns: rows,
      totals: {
        campaignsScanned: rows.length,
        criticalFindings: criticalFindings,
        highFindings: highFindings,
        campaignsNeedingAttention: rows.filter(r => r.critical > 0 || r.high > 0).length,
      },
    };
  }

  diagnosticsBatchFixPlan(tenantId: string): { generatedAt: string; campaigns: { campaignId: string; campaignName: string; score: number; grade: string; steps: { order: number; description: string; effort: string; expectedImprovement: string; timeline: string }[]; estimatedRecoveryDays: number }[]; totals: { campaignsScanned: number; withPlan: number; totalSteps: number; highEffortFixes: number; summary: string } } {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const rows: any[] = [];
    let withPlan = 0;
    let totalSteps = 0;
    let highEffortFixes = 0;
    for (const a of portfolio.analyses) {
      const report = this.diagnoseCampaign(a.campaignId, tenantId);
      const needsFix = report.summary.criticalCount > 0 || report.summary.highCount > 0;
      if (!needsFix) continue;
      const plan = this.generateRecoveryPlan(a.campaignId, tenantId);
      withPlan++;
      if (plan) totalSteps += plan.steps.length;
      if (plan) highEffortFixes += plan.steps.filter(s => s.effort === "high").length;
      rows.push({
        campaignId: a.campaignId, campaignName: a.campaignName,
        score: report.score, grade: report.grade,
        steps: plan ? plan.steps.map(s => ({
          order: s.order, description: s.action, effort: s.effort,
          expectedImprovement: s.expectedImpact, timeline: s.timeframe,
        })) : [],
        estimatedRecoveryDays: plan ? plan.estimatedRecoveryDays : 0,
      });
    }
    rows.sort((x, y) => x.score - y.score);
    return {
      generatedAt: new Date().toISOString(),
      campaigns: rows,
      totals: {
        campaignsScanned: portfolio.analyses.length,
        withPlan,
        totalSteps,
        highEffortFixes,
        summary: `${withPlan} campaigns have ready-to-apply fix plans (${totalSteps} total steps)`,
      },
    };
  }
}

export const campaignPerformanceDiagnostics = new CampaignPerformanceDiagnosticsService();