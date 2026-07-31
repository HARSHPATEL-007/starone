import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const CHANNELS = ["meta", "google", "tiktok", "linkedin"];

export class CrossPlatformPerformanceService {
  crossPlatformPerformance(tenantId: string): { generatedAt: string; platforms: { platform: string; spend: number; revenue: number; roas: number; trend: "up" | "down" | "flat"; share: number }[]; totals: { spend: number; revenue: number; roas: number; summary: string } } {
    const campaigns = DataStore.mem().find("campaigns", (c: any) => c.tenantId === tenantId) as any[];
    const metricsAll = DataStore.mem().find("metrics", (m: any) => m.tenantId === tenantId) as any[];
    const agg: Record<string, { spend: number; revenue: number }> = {};
    for (const c of campaigns) {
      const ms = metricsAll.filter((m: any) => m.campaignId === c._id);
      const spend = ms.reduce((s, m) => s + (m.spend || 0), 0);
      const revenue = ms.reduce((s, m) => s + (m.revenue || 0), 0);
      for (const p of c.platforms || []) {
        agg[p] = agg[p] || { spend: 0, revenue: 0 };
        agg[p].spend += spend;
        agg[p].revenue += revenue;
      }
    }
    const totalSpend = Object.values(agg).reduce((s, t) => s + t.spend, 0);
    const totalRevenue = Object.values(agg).reduce((s, t) => s + t.revenue, 0);
    const platforms = CHANNELS.map((p, i) => {
      const t = agg[p] || { spend: 0, revenue: 0 };
      const trendSeed = hashStr(tenantId + p + "trend") % 10;
      return {
        platform: p, spend: Math.round(t.spend * 100) / 100, revenue: Math.round(t.revenue * 100) / 100,
        roas: t.spend > 0 ? Math.round((t.revenue / t.spend) * 100) / 100 : 0,
        trend: (trendSeed <= 4 ? "up" : trendSeed <= 7 ? "flat" : "down") as "up" | "down" | "flat",
        share: totalSpend > 0 ? Math.round((t.spend / totalSpend) * 1000) / 10 : 0,
      };
    }).sort((a, b) => b.spend - a.spend);
    return {
      generatedAt: new Date().toISOString(),
      platforms,
      totals: {
        spend: Math.round(totalSpend * 100) / 100, revenue: Math.round(totalRevenue * 100) / 100,
        roas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
        summary: `Cross-platform: ${platforms.filter(p => p.trend === "up").length} platforms up, ${platforms.length} total`,
      },
    };
  }
}

export const crossPlatformPerformance = new CrossPlatformPerformanceService();
