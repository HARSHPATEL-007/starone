import { DataStore } from "./DataStore";

export class CampaignSnapshotService {
  async captureSnapshot(tenantId: string, campaignId: string, name: string, description?: string): Promise<any> {
    const campaign = await DataStore.findCampaignById(campaignId, tenantId);
    if (!campaign) throw new Error("Campaign not found");

    const metrics = await DataStore.findMetrics({ campaignId, tenantId });
    const total = metrics.length;
    const totals = metrics.reduce(
      (acc: any, m: any) => {
        acc.impressions += m.impressions || 0;
        acc.clicks += m.clicks || 0;
        acc.conversions += m.conversions || 0;
        acc.spend += m.spend || 0;
        acc.revenue += m.revenue || 0;
        return acc;
      },
      { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 }
    );

    const aggregated = {
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      totalConversions: totals.conversions,
      totalSpend: totals.spend,
      totalRevenue: totals.revenue,
      avgCtr: totals.impressions > 0 ? parseFloat(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0,
      avgCpc: totals.clicks > 0 ? parseFloat((totals.spend / totals.clicks).toFixed(2)) : 0,
      avgRoas: totals.spend > 0 ? parseFloat((totals.revenue / totals.spend).toFixed(2)) : 0,
      avgCvr: totals.clicks > 0 ? parseFloat(((totals.conversions / totals.clicks) * 100).toFixed(2)) : 0,
      metricCount: total,
    };

    const snapshot = DataStore.mem().insert("campaign_snapshots", {
      tenantId,
      campaignId,
      campaignName: campaign.name,
      name,
      description: description || "",
      capturedAt: new Date().toISOString(),
      metrics: aggregated,
      budget: campaign.budget || {},
      status: campaign.status,
      platforms: campaign.platforms || [],
      metricIds: metrics.map((m: any) => m._id),
    });

    return snapshot;
  }

  async compareSnapshots(snapshotId1: string, snapshotId2: string, tenantId: string): Promise<any> {
    const s1 = DataStore.mem().findOne("campaign_snapshots", (s: any) => s._id === snapshotId1 && s.tenantId === tenantId);
    const s2 = DataStore.mem().findOne("campaign_snapshots", (s: any) => s._id === snapshotId2 && s.tenantId === tenantId);

    if (!s1 || !s2) throw new Error("One or both snapshots not found");

    const keys = ["totalImpressions", "totalClicks", "totalConversions", "totalSpend", "totalRevenue"];
    const rateKeys = ["avgCtr", "avgCpc", "avgRoas", "avgCvr"];
    const diff: Record<string, any> = {};

    for (const key of keys) {
      const before = s1.metrics[key] || 0;
      const after = s2.metrics[key] || 0;
      const change = after - before;
      const changePercent = before !== 0 ? parseFloat(((change / before) * 100).toFixed(2)) : 0;
      diff[key] = { before, after, change, changePercent };
    }

    for (const key of rateKeys) {
      const before = s1.metrics[key] || 0;
      const after = s2.metrics[key] || 0;
      const change = after - before;
      const changePercent = before !== 0 ? parseFloat(((change / before) * 100).toFixed(2)) : 0;
      diff[key] = { before, after, change, changePercent };
    }

    diff.budget = {
      before: s1.budget,
      after: s2.budget,
      spendChange: (s2.budget?.spent || 0) - (s1.budget?.spent || 0),
    };

    diff.statusChange = { before: s1.status, after: s2.status };

    const overallImprovement =
      diff.totalConversions.change > 0 &&
      diff.avgRoas.change > 0 &&
      diff.totalSpend.change <= 0
        ? "strong improvement"
        : diff.totalConversions.change > 0 && diff.avgRoas.change > 0
          ? "improvement"
          : diff.totalConversions.change < 0 && diff.avgRoas.change < 0
            ? "decline"
            : "mixed";

    return {
      snapshot1: s1,
      snapshot2: s2,
      diff,
      summary: { overall: overallImprovement },
    };
  }

  async getSnapshotTimeline(tenantId: string, campaignId: string): Promise<any[]> {
    const snapshots = DataStore.mem().find(
      "campaign_snapshots",
      (s: any) => s.tenantId === tenantId && s.campaignId === campaignId
    );
    return snapshots.sort((a: any, b: any) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
  }
}

export const campaignSnapshotService = new CampaignSnapshotService();
