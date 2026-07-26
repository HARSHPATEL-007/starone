import { audienceInsightsService } from "../services/AudienceInsightsService";
import { decisionEngine } from "./DecisionEngine";

export interface ClusterLabel {
  clusterId: number;
  label: string;
  size: number;
  avgEngagement: number;
  avgConversion: number;
  avgCpa: number;
  memberNames: string[];
}

export interface PropensityRanking {
  audienceId: string;
  name: string;
  propensity: number;
  confidence: number;
  similarCampaigns: number;
  band: string;
}

export interface AudienceOverlapWarning {
  pair: [string, string];
  jaccard: number;
  recommendation: string;
}

export interface AudienceDashboard {
  totalAudiences: number;
  totalReach: number;
  clusters: ClusterLabel[];
  topPropensity: PropensityRanking[];
  bottomPropensity: PropensityRanking[];
  overlapWarnings: AudienceOverlapWarning[];
  topAudience: string;
  recommendations: string[];
}

const CLUSTER_LABELS = ["High-Value Engagers", "Growth Potential", "Cost-Efficient Scalers"];

export class AudienceInsightsOrchestrator {
  getDashboard(tenantId: string): AudienceDashboard {
    const insights = audienceInsightsService.getInsights(tenantId);
    const audiences: any[] = (insights as any).audiencePerformance || [];
    const clusters = insights._clusters as any;
    const overlaps = (insights._overlaps || []) as any[];
    const propensities = (insights._propensities || []) as any[];

    const clusterData: ClusterLabel[] = clusters?.clusters
      ? Array.from(new Set(clusters.clusters as number[])).sort().map((cId: number) => {
          const memberIndices = (clusters.clusters as number[]).map((c: number, i: number) => c === cId ? i : -1).filter(i => i >= 0);
          const members = memberIndices.map(i => audiences[i]).filter(Boolean);
          return {
            clusterId: cId,
            label: CLUSTER_LABELS[cId] || `Cluster ${cId}`,
            size: members.length,
            avgEngagement: members.length > 0 ? Math.round(members.reduce((s: number, m: any) => s + parseFloat(m.engagement || 0), 0) / members.length * 10) / 10 : 0,
            avgConversion: members.length > 0 ? Math.round(members.reduce((s: number, m: any) => s + parseFloat(m.conversionRate || 0), 0) / members.length * 10) / 10 : 0,
            avgCpa: members.length > 0 ? Math.round(members.reduce((s: number, m: any) => s + (m.cpa || 0), 0) / members.length) : 0,
            memberNames: members.map((m: any) => m.name || "Unknown"),
          };
        })
      : [];

    const propensityRankings: PropensityRanking[] = propensities.map((p: any) => ({
      audienceId: p.audienceId, name: p.name, propensity: p.propensity,
      confidence: p.confidence, similarCampaigns: p.similarCampaigns,
      band: decisionEngine.label(decisionEngine.band(p.propensity * 10, { excellent: 80, good: 60, fair: 40, poor: 20 })),
    })).sort((a: any, b: any) => b.propensity - a.propensity);

    const topPropensity = propensityRankings.slice(0, 5);
    const bottomPropensity = [...propensityRankings].reverse().slice(0, 5);

    const overlapWarnings: AudienceOverlapWarning[] = overlaps
      .filter((o: any) => o.jaccard > 0.6)
      .map((o: any) => ({
        pair: o.pair, jaccard: o.jaccard,
        recommendation: `High overlap (${(o.jaccard * 100).toFixed(0)}%) between "${o.pair[0]}" and "${o.pair[1]}". Consider merging or suppressing one to reduce audience cannibalization.`,
      }));

    const recommendations: string[] = [];
    if (clusterData.length > 0) {
      const topCluster = clusterData.sort((a, b) => b.avgConversion - a.avgConversion)[0];
      recommendations.push(`Best-performing cluster: "${topCluster.label}" (${topCluster.size} audiences, avg conversion ${topCluster.avgConversion}%).`);
    }
    if (overlapWarnings.length > 0) recommendations.push(`${overlapWarnings.length} high-overlap pair(s) detected. Review audience deduplication strategy.`);
    if (topPropensity.length > 0) recommendations.push(`Top propensity audience: "${topPropensity[0].name}" (score ${topPropensity[0].propensity}). Prioritize for targeting.`);

    return {
      totalAudiences: insights.totalAudiences || 0,
      totalReach: insights.totalReach || 0,
      clusters: clusterData,
      topPropensity,
      bottomPropensity,
      overlapWarnings,
      topAudience: insights.topAudience || "None",
      recommendations,
    };
  }
}

export const audienceInsightsOrchestrator = new AudienceInsightsOrchestrator();
