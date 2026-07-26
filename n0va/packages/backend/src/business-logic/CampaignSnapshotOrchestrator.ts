import { campaignSnapshotService } from "../services/CampaignSnapshotService";
import { DataStore } from "../services/DataStore";
import { decisionEngine } from "./DecisionEngine";

export interface SnapshotHealthTrend {
  snapshotId: string;
  snapshotName: string;
  capturedAt: string;
  healthIndex: number;
  rating: string;
}

export interface SnapshotRegression {
  snapshotIdA: string;
  snapshotIdB: string;
  regressedMetrics: { metric: string; changePercent: number; isSignificant: boolean }[];
  overallDirection: string;
}

export interface SnapshotDashboard {
  campaignId: string;
  snapshotCount: number;
  healthTrend: SnapshotHealthTrend[];
  regressions: SnapshotRegression[];
  latestHealth: number;
  forecastOutlook: string;
  healthBand: string;
}

export class CampaignSnapshotOrchestrator {
  async getCampaignSnapshotDashboard(tenantId: string, campaignId: string): Promise<SnapshotDashboard> {
    const timeline = await campaignSnapshotService.getSnapshotTimeline(tenantId, campaignId);
    if (!Array.isArray(timeline) || timeline.length === 0) {
      return { campaignId, snapshotCount: 0, healthTrend: [], regressions: [], latestHealth: 0, forecastOutlook: "No snapshots available", healthBand: "Critical" };
    }

    const healthTrend: SnapshotHealthTrend[] = timeline.map((s: any) => {
      const index = s._healthIndex || { score: 50, rating: "fair" };
      return { snapshotId: s._id, snapshotName: s.name, capturedAt: s.capturedAt, healthIndex: index.score, rating: index.rating };
    }).reverse();

    const regressions: SnapshotRegression[] = [];
    for (let i = 0; i < timeline.length - 1; i++) {
      try {
        const comparison = await campaignSnapshotService.compareSnapshots(timeline[i]._id, timeline[i + 1]._id, tenantId);
        const diff = comparison?.diff || {};
        const regressed: { metric: string; changePercent: number; isSignificant: boolean }[] = [];
        for (const [metric, data] of Object.entries(diff)) {
          const d = data as any;
          if (d && typeof d === "object" && d.changePercent !== undefined && d.changePercent < 0) {
            regressed.push({ metric, changePercent: Math.round(d.changePercent * 100) / 100, isSignificant: d._significance?.isSignificant || false });
          }
        }
        regressions.push({
          snapshotIdA: timeline[i]._id, snapshotIdB: timeline[i + 1]._id,
          regressedMetrics: regressed,
          overallDirection: comparison?.summary?._healthIndex?.score !== undefined
            ? (comparison.summary._healthIndex.score > 50 ? "improving" : "declining") : "stable",
        });
      } catch {}
    }

    const latestComparison = timeline.length >= 2
      ? await campaignSnapshotService.compareSnapshots(timeline[timeline.length - 2]._id, timeline[timeline.length - 1]._id, tenantId).catch(() => null)
      : null;
    const latestHealth = latestComparison?.summary?._healthIndex?.score ?? 50;
    const forecastOutlook = latestComparison?.summary?._forecast?.expectedOutcome || "neutral";
    const healthBand = decisionEngine.label(decisionEngine.band(latestHealth));

    return { campaignId, snapshotCount: timeline.length, healthTrend, regressions, latestHealth, forecastOutlook, healthBand };
  }

  async captureAllActiveSnapshots(tenantId: string, namePrefix = "auto"): Promise<{ campaignId: string; snapshotId: string; campaignName: string }[]> {
    const result = await DataStore.findCampaigns({ tenantId });
    const campaigns = ("campaigns" in result ? (result as any).campaigns : result) as any[];
    const active = campaigns.filter((c: any) => c.status === "active");
    const results: { campaignId: string; snapshotId: string; campaignName: string }[] = [];

    for (const c of active) {
      try {
        const snapshot = await campaignSnapshotService.captureSnapshot(tenantId, c._id, `${namePrefix}_${new Date().toISOString().split("T")[0]}`);
        results.push({ campaignId: c._id, snapshotId: snapshot._id, campaignName: c.name || "Unknown" });
      } catch {}
    }
    return results;
  }
}

export const campaignSnapshotOrchestrator = new CampaignSnapshotOrchestrator();
