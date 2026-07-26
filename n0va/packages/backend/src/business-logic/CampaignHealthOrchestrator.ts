import { campaignHealthService, CampaignHealthScore } from "../services/CampaignHealthService";
import { decisionEngine } from "./DecisionEngine";

export interface HealthDimensionTrend {
  dimension: string;
  currentAvg: number;
  priorAvg: number;
  delta: number;
  direction: string;
}

export interface IssueCluster {
  issueType: string;
  severity: string;
  campaignCount: number;
  sampleMessage: string;
  campaignIds: string[];
}

export interface CampaignHealthDashboard {
  portfolioAvg: number;
  dimensionTrends: HealthDimensionTrend[];
  distribution: { excellent: number; good: number; fair: number; poor: number; critical: number };
  trend: { improving: number; stable: number; declining: number };
  issueClusters: IssueCluster[];
  topCampaigns: { campaignId: string; campaignName: string; overall: number; trend: string }[];
  bottomCampaigns: { campaignId: string; campaignName: string; overall: number; trend: string }[];
  healthBand: string;
  recommendations: string[];
}

export class CampaignHealthOrchestrator {
  async getPortfolioDashboard(tenantId: string): Promise<CampaignHealthDashboard> {
    const scores = await campaignHealthService.scoreAll(tenantId);

    const portfolioAvg = scores.length > 0 ? Math.round(scores.reduce((s, c) => s + c.overall, 0) / scores.length) : 0;

    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 };
    const trend = { improving: 0, stable: 0, declining: 0 };
    const dimFields: (keyof CampaignHealthScore)[] = ["budget", "performance", "engagement", "efficiency"];
    for (const s of scores) {
      const b = decisionEngine.band(s.overall);
      distribution[b]++;
      if (s.trend === "up") trend.improving++;
      else if (s.trend === "down") trend.declining++;
      else trend.stable++;
    }

    const dimensionTrends: HealthDimensionTrend[] = dimFields.map(dim => {
      const values = scores.map(s => s[dim] as number);
      const half = Math.floor(values.length / 2) || 1;
      const recent = values.slice(half).reduce((s, v) => s + v, 0) / Math.max(values.length - half, 1);
      const prior = values.slice(0, half).reduce((s, v) => s + v, 0) / Math.max(half, 1);
      const delta = Math.round((recent - prior) * 100) / 100;
      return { dimension: dim, currentAvg: Math.round(recent), priorAvg: Math.round(prior), delta, direction: delta > 3 ? "improving" : delta < -3 ? "declining" : "stable" };
    });

    const issueMap = new Map<string, { severity: string; count: number; message: string; ids: string[] }>();
    for (const s of scores) {
      for (const issue of s.issues) {
        const key = issue.type;
        if (!issueMap.has(key)) issueMap.set(key, { severity: issue.severity, count: 0, message: issue.message, ids: [] });
        const entry = issueMap.get(key)!;
        entry.count++;
        entry.ids.push(s.campaignId);
      }
    }
    const issueClusters: IssueCluster[] = Array.from(issueMap.entries()).map(([type, data]) => ({
      issueType: type, severity: data.severity, campaignCount: data.count, sampleMessage: data.message, campaignIds: data.ids,
    })).sort((a, b) => b.campaignCount - a.campaignCount);

    const sorted = [...scores].sort((a, b) => b.overall - a.overall);
    const topCampaigns = sorted.slice(0, 5).map(s => ({ campaignId: s.campaignId, campaignName: s.campaignName, overall: s.overall, trend: s.trend }));
    const bottomCampaigns = sorted.slice(-5).reverse().map(s => ({ campaignId: s.campaignId, campaignName: s.campaignName, overall: s.overall, trend: s.trend }));

    const recommendations: string[] = [];
    const criticalIssues = issueClusters.filter(i => i.severity === "critical");
    if (criticalIssues.length > 0) recommendations.push(`${criticalIssues.length} critical issue type(s) affecting ${criticalIssues.reduce((s, i) => s + i.campaignCount, 0)} campaign(s). Immediate attention required.`);
    if (trend.declining > trend.improving) recommendations.push("More campaigns declining than improving. Review top decliners for common patterns.");
    const weakDim = dimensionTrends.filter(d => d.direction === "declining");
    if (weakDim.length > 0) recommendations.push(`Declining dimensions: ${weakDim.map(d => d.dimension).join(", ")}.`);
    if (scores.length === 0) recommendations.push("No campaign health data available. Create and run campaigns to generate health scores.");

    return { portfolioAvg, dimensionTrends, distribution, trend, issueClusters, topCampaigns, bottomCampaigns, healthBand: decisionEngine.label(decisionEngine.band(portfolioAvg)), recommendations };
  }
}

export const campaignHealthOrchestrator = new CampaignHealthOrchestrator();
