import { DataStore } from "../services/DataStore";
import { anomalyDetectionService } from "../services/AnomalyDetectionService";
import { decisionEngine } from "./DecisionEngine";

export interface CampaignAnomalySummary {
  campaignId: string;
  campaignName: string;
  overallHealth: "healthy" | "attention" | "critical";
  flaggedMetrics: string[];
  totalFlags: number;
  highestSeverity: string;
  topAnomalies: { metric: string; date: string; zScore: number; direction: string; severity: string }[];
  changepoints: number;
}

export interface CrossCampaignPattern {
  pattern: string;
  campaigns: string[];
  metric: string;
  direction: "spike" | "drop" | "normal";
  avgZScore: number;
  severity: string;
}

export interface AnomalyInvestigationReport {
  generatedAt: string;
  campaignSummaries: CampaignAnomalySummary[];
  crossCampaignPatterns: CrossCampaignPattern[];
  portfolioHealth: "healthy" | "attention" | "critical";
  totalAnomalies: number;
  totalChangepoints: number;
  metricsWithMostAnomalies: { metric: string; count: number }[];
  alerts: { campaignId: string; campaignName: string; metric: string; severity: string; recommendation: string }[];
  recommendations: string[];
}

export class AnomalyDetectionOrchestrator {
  async investigate(tenantId: string): Promise<AnomalyInvestigationReport> {
    const result = await DataStore.findCampaigns({ tenantId });
    const campaigns = ("campaigns" in result ? (result as any).campaigns : result) as any[];
    const metrics = await DataStore.findMetrics({ tenantId });
    const metricsArr = Array.isArray(metrics) ? metrics : [];
    const campaignSummaries: CampaignAnomalySummary[] = [];
    let totalAnomalies = 0;
    let totalChangepoints = 0;
    const allAlerts: { campaignId: string; campaignName: string; metric: string; severity: string; recommendation: string }[] = [];
    const metricAnomalyCounts: Record<string, number> = {};
    const patternSignals: { pattern: string; campaignId: string; campaignName: string; metric: string; direction: string; zScore: number; severity: string }[] = [];

    for (const c of campaigns) {
      const campaignMetrics = metricsArr.filter((m: any) => m.campaignId === (c._id || c.id));
      if (campaignMetrics.length < 5) continue;
      const metricGroups: Record<string, { date: string; value: number }[]> = {};
      for (const m of campaignMetrics) {
        const date = m.date ? new Date(m.date).toISOString().split("T")[0] : "unknown";
        for (const field of ["impressions", "clicks", "conversions", "spend", "revenue", "ctr"] as const) {
          if (!metricGroups[field]) metricGroups[field] = [];
          metricGroups[field].push({ date, value: Number(m[field]) || 0 });
        }
      }
      const scan = anomalyDetectionService.scanCampaign(c._id || c.id, metricGroups);
      const topAnomalies: { metric: string; date: string; zScore: number; direction: string; severity: string }[] = [];
      for (const [metric, res] of Object.entries(scan.results)) {
        const flagged = res.points.filter(p => p.flagged);
        for (const p of flagged.slice(0, 3)) {
          topAnomalies.push({ metric, date: p.date, zScore: p.zScore, direction: p.direction, severity: p.severity });
        }
        metricAnomalyCounts[metric] = (metricAnomalyCounts[metric] || 0) + res.summary.flaggedCount;
        totalAnomalies += res.summary.flaggedCount;
        totalChangepoints += res.changepoints?.length || 0;
        if (res.summary.flaggedCount > 0) {
          allAlerts.push({
            campaignId: c._id || c.id, campaignName: c.name,
            metric, severity: res.summary.dominantSeverity,
            recommendation: res.summary.recommendation,
          });
          const flaggedPoints = res.points.filter(p => p.flagged);
          for (const fp of flaggedPoints.slice(0, 2)) {
            patternSignals.push({
              pattern: `${metric}_${fp.direction}`, campaignId: c._id || c.id,
              campaignName: c.name, metric, direction: fp.direction,
              zScore: fp.zScore, severity: fp.severity,
            });
          }
        }
      }
      campaignSummaries.push({
        campaignId: c._id || c.id, campaignName: c.name, overallHealth: scan.overallHealth,
        flaggedMetrics: scan.flaggedMetrics, totalFlags: topAnomalies.length,
        highestSeverity: scan.overallHealth === "critical" ? "critical" : scan.overallHealth === "attention" ? "high" : "low",
        topAnomalies: topAnomalies.slice(0, 5), changepoints: totalChangepoints,
      });
    }

    const patternGroups: Record<string, { campaigns: Set<string>; metric: string; direction: string; zScores: number[]; severity: string }> = {};
    for (const s of patternSignals) {
      const key = `${s.metric}_${s.direction}`;
      if (!patternGroups[key]) patternGroups[key] = { campaigns: new Set(), metric: s.metric, direction: s.direction, zScores: [], severity: s.severity };
      patternGroups[key].campaigns.add(s.campaignName);
      patternGroups[key].zScores.push(s.zScore);
      if (s.severity === "critical" || (s.severity === "high" && patternGroups[key].severity !== "critical")) patternGroups[key].severity = s.severity;
    }
    const crossCampaignPatterns: CrossCampaignPattern[] = Object.entries(patternGroups)
      .filter(([, g]) => g.campaigns.size >= 2)
      .map(([pattern, g]) => ({
        pattern, campaigns: Array.from(g.campaigns), metric: g.metric, direction: g.direction as any,
        avgZScore: Math.round(g.zScores.reduce((s, z) => s + Math.abs(z), 0) / g.zScores.length * 100) / 100,
        severity: g.severity,
      }));

    const portfolioCritical = campaignSummaries.some(s => s.overallHealth === "critical") ? "critical"
      : campaignSummaries.some(s => s.overallHealth === "attention") ? "attention" : "healthy";

    const sortedMetrics = Object.entries(metricAnomalyCounts).sort((a, b) => b[1] - a[1]);
    const recommendations: string[] = [];
    if (crossCampaignPatterns.length > 0) {
      recommendations.push(`${crossCampaignPatterns.length} cross-campaign pattern(s) detected — systemic issue may be affecting multiple campaigns.`);
    }
    if (portfolioCritical === "critical") recommendations.push("Portfolio health is CRITICAL — immediate investigation recommended across all campaigns.");
    if (sortedMetrics.length > 0 && sortedMetrics[0][1] > 3) {
      recommendations.push(`Most anomalies in "${sortedMetrics[0][0]}" (${sortedMetrics[0][1]} flags) — focus investigation here.`);
    }
    if (totalChangepoints > 0) recommendations.push(`${totalChangepoints} structural change point(s) detected — campaign settings or external factors may have shifted.`);

    return {
      generatedAt: new Date().toISOString(), campaignSummaries, crossCampaignPatterns,
      portfolioHealth: portfolioCritical, totalAnomalies, totalChangepoints,
      metricsWithMostAnomalies: sortedMetrics.slice(0, 5).map(([metric, count]) => ({ metric, count })),
      alerts: allAlerts.slice(0, 20), recommendations,
    };
  }
}

export const anomalyDetectionOrchestrator = new AnomalyDetectionOrchestrator();
