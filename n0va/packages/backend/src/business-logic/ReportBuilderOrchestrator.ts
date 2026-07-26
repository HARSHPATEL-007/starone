import { DataStore } from "../services/DataStore";
import { reportBuilderService } from "../services/ReportBuilderService";
import { decisionEngine } from "./DecisionEngine";

export interface ReportInsightSummary {
  type: string;
  title: string;
  description: string;
  severity: string;
  metric: string;
  value: number;
}

export interface CrossReportTrend {
  metric: string;
  trend: "up" | "down" | "flat";
  changePct: number;
  volatility: number;
  significance: "high" | "medium" | "low";
}

export interface ReportIntelligence {
  generatedAt: string;
  reportCount: number;
  allInsights: ReportInsightSummary[];
  crossReportTrends: CrossReportTrend[];
  topAnomalies: ReportInsightSummary[];
  topPositive: ReportInsightSummary[];
  topNegative: ReportInsightSummary[];
  metricRanking: { metric: string; totalValue: number; avgValue: number; direction: string }[];
  recommendations: string[];
}

export class ReportBuilderOrchestrator {
  analyze(tenantId: string): ReportIntelligence {
    const reports = reportBuilderService.getReports(tenantId);
    const allInsights: ReportInsightSummary[] = [];
    for (const r of reports) {
      try {
        const generated = reportBuilderService.generateReportData(tenantId, r.id);
        for (const ins of generated.insights || []) {
          allInsights.push({
            type: ins.type, title: ins.title, description: ins.description,
            severity: ins.severity, metric: ins.metric, value: ins.value,
          });
        }
      } catch {}
    }
    const standalone = reportBuilderService.generateInsights(tenantId);
    for (const ins of standalone) {
      allInsights.push({
        type: ins.type, title: ins.title, description: ins.description,
        severity: ins.severity, metric: ins.metric, value: ins.value,
      });
    }
    const metricGroups: Record<string, { values: number[]; directions: string[] }> = {};
    for (const ins of allInsights) {
      if (!metricGroups[ins.metric]) metricGroups[ins.metric] = { values: [], directions: [] };
      metricGroups[ins.metric].values.push(ins.value);
      metricGroups[ins.metric].directions.push(ins.description.includes("increase") || ins.description.includes("improved") || ins.description.includes("spiked") ? "up" : ins.description.includes("declined") || ins.description.includes("dropped") || ins.description.includes("decrease") ? "down" : "stable");
    }
    const crossReportTrends: CrossReportTrend[] = Object.entries(metricGroups)
      .filter(([, g]) => g.values.length >= 2)
      .map(([metric, g]) => {
        const avgVal = g.values.reduce((s, v) => s + Math.abs(v), 0) / g.values.length;
        const upCount = g.directions.filter(d => d === "up").length;
        const downCount = g.directions.filter(d => d === "down").length;
        const trend: "up" | "down" | "flat" = upCount > downCount * 2 ? "up" : downCount > upCount * 2 ? "down" : "flat";
        const variance = g.values.length > 1 ? g.values.reduce((s, v) => s + (v - avgVal) ** 2, 0) / g.values.length : 0;
        const volatility = Math.round(Math.sqrt(variance) * 10) / 10;
        const significance: "high" | "medium" | "low" = g.values.length > 5 ? "high" : g.values.length > 2 ? "medium" : "low";
        return { metric, trend, changePct: Math.round(avgVal * 100) / 100, volatility, significance };
      });
    const anomalies = allInsights.filter(i => i.type === "anomaly" || i.severity === "negative");
    const positive = allInsights.filter(i => i.severity === "positive");
    const negative = allInsights.filter(i => i.severity === "negative" || i.type === "anomaly");
    const metricRanking = Object.entries(metricGroups).map(([metric, g]) => ({
      metric, totalValue: Math.round(g.values.reduce((s, v) => s + Math.abs(v), 0)), avgValue: Math.round((g.values.reduce((s, v) => s + Math.abs(v), 0) / g.values.length) * 100) / 100, direction: crossReportTrends.find(t => t.metric === metric)?.trend || "stable",
    })).sort((a, b) => b.totalValue - a.totalValue);
    const recommendations: string[] = [];
    if (negative.length > 0) recommendations.push(`${negative.length} negative signals detected — investigate top anomaly: "${negative[0]?.title}".`);
    if (anomalies.length > 0) recommendations.push(`${anomalies.length} anomaly/ies found — review for unexpected metric shifts.`);
    if (crossReportTrends.filter(t => t.significance === "high").length > 0) recommendations.push("High-significance trends detected across reports — actionable insights available.");
    if (reports.length === 0) recommendations.push("No reports configured — create scheduled reports for automated monitoring.");
    return {
      generatedAt: new Date().toISOString(), reportCount: reports.length, allInsights,
      crossReportTrends,
      topAnomalies: anomalies.slice(0, 5), topPositive: positive.slice(0, 5), topNegative: negative.slice(0, 5),
      metricRanking: metricRanking.slice(0, 10), recommendations,
    };
  }
}

export const reportBuilderOrchestrator = new ReportBuilderOrchestrator();
