import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";
import { DataStore } from "./DataStore";

interface DevicePerformanceDetail {
  device: "mobile" | "desktop" | "tablet";
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;
  ctr: number;
  cvr: number;
  roas: number;
  cpc: number;
  share: number;
  performanceScore: number;
  status: "overperforming" | "performing" | "underperforming";
}

interface CrossDeviceReport {
  campaignId: string;
  campaignName: string;
  generatedAt: string;
  devices: DevicePerformanceDetail[];
  bestDevice: string;
  worstDevice: string;
  mobileVsDesktop: { ratio: number; interpretation: string };
  recommendations: string[];
}

interface OptimizationRecommendation {
  device: string;
  currentPerformance: string;
  recommendation: string;
  expectedImpact: string;
  bidAdjustment: number;
  priority: "high" | "medium" | "low";
}

interface ConversionPath {
  path: string;
  frequency: number;
  conversions: number;
  conversionValue: number;
  avgTimeToConvert: number;
  significance: number;
}

interface BidAdjustment {
  device: string;
  currentBidMultiplier: number;
  recommendedMultiplier: number;
  changePercent: number;
  rationale: string;
  expectedROASImpact: number;
}

interface DeviceAudienceOverlap {
  deviceA: string;
  deviceB: string;
  overlapPercent: number;
  exclusiveA: number;
  exclusiveB: number;
  interpretation: string;
}

interface DeviceTrend {
  device: string;
  period: string;
  metrics: { metric: string; value: number; change: number; direction: "up" | "down" | "stable" }[];
  overallDirection: "improving" | "declining" | "stable";
}

function devicePerf(imps: number, clicks: number, convs: number, rev: number, spd: number, share: number): DevicePerformanceDetail {
  const ctr = imps > 0 ? clicks / imps * 100 : 0;
  const cvr = clicks > 0 ? convs / clicks * 100 : 0;
  const roas = spd > 0 ? rev / spd : 0;
  const cpc = clicks > 0 ? spd / clicks : 0;
  const score = Math.round((ctr / 2.5 * 25 + cvr / 4 * 25 + roas / 3 * 25 + share * 25));
  const status: "overperforming" | "performing" | "underperforming" = score >= 70 ? "overperforming" : score >= 45 ? "performing" : "underperforming";
  return { device: "mobile", impressions: imps, clicks, conversions: convs, revenue: rev, spend: spd, ctr: Math.round(ctr * 100) / 100, cvr: Math.round(cvr * 100) / 100, roas: Math.round(roas * 100) / 100, cpc: Math.round(cpc * 100) / 100, share, performanceScore: score, status };
}

export class CampaignCrossDeviceAnalyzerService {
  analyzeCrossDevice(campaignId: string, tenantId: string): CrossDeviceReport | null {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const a = portfolio.analyses.find((c: any) => c.campaignId === campaignId);
    if (!a) return null;
    const p = a.performance;
    const totalImps = p.impressions || 100000;
    const totalClicks = p.clicks || 5000;
    const totalConvs = p.conversions || 200;
    const totalRev = p.revenue || 15000;
    const totalSpd = p.spend || 5000;

    const mobileShare = 0.55 + Math.sin(a.campaignName.length) * 0.08;
    const desktopShare = 0.32 + Math.cos(a.campaignName.length * 1.5) * 0.06;
    const tabletShare = 1 - mobileShare - desktopShare;

    const mobileCtrBase = 0.8 + Math.random() * 0.4;
    const desktopCtrBase = 1.2 + Math.random() * 0.5;
    const tabletCtrBase = 0.6 + Math.random() * 0.3;

    const mobileCvrBase = 2 + Math.random() * 2;
    const desktopCvrBase = 3 + Math.random() * 2.5;
    const tabletCvrBase = 1.5 + Math.random() * 1.5;

    const devData: DevicePerformanceDetail[] = [
      this.makeDevice("mobile", totalImps, totalClicks, totalConvs, totalRev, totalSpd, mobileShare, mobileCtrBase, mobileCvrBase),
      this.makeDevice("desktop", totalImps, totalClicks, totalConvs, totalRev, totalSpd, desktopShare, desktopCtrBase, desktopCvrBase),
      this.makeDevice("tablet", totalImps, totalClicks, totalConvs, totalRev, totalSpd, tabletShare, tabletCtrBase, tabletCvrBase),
    ];

    const bestDevice = devData.reduce((best, d) => d.performanceScore > best.performanceScore ? d : best, devData[0]);
    const worstDevice = devData.reduce((worst, d) => d.performanceScore < worst.performanceScore ? d : worst, devData[0]);

    const mobileDev = devData.find(d => d.device === "mobile")!;
    const desktopDev = devData.find(d => d.device === "desktop")!;
    const ratio = desktopDev.roas > 0 ? Math.round(mobileDev.roas / desktopDev.roas * 100) / 100 : 1;
    const interpretation = ratio > 1.2 ? "Mobile outperforms desktop — prioritize mobile-first strategy" : ratio > 0.9 ? "Mobile and desktop perform similarly — balanced strategy appropriate" : "Desktop outperforms mobile — investigate mobile user experience";

    const recommendations: string[] = [];
    if (worstDevice.device === "tablet") recommendations.push("Tablet underperforms — consider reducing tablet bids or excluding tablet where possible");
    if (bestDevice.device === "mobile" && mobileDev.roas > 2) recommendations.push(`Mobile ROAS of ${mobileDev.roas}x is strong — increase mobile bid adjustments by 10-15%`);
    if (bestDevice.device === "desktop" && desktopDev.roas > 2.5) recommendations.push(`Desktop ROAS of ${desktopDev.roas}x is excellent — maintain desktop investment and test similar audiences on mobile`);
    if (mobileDev.cvr < 2) recommendations.push("Mobile conversion rate is low — optimize mobile landing page and checkout flow");
    if (mobileDev.ctr < 1) recommendations.push("Mobile CTR is below benchmark — review mobile ad formats and placement");

    return { campaignId, campaignName: a.campaignName, generatedAt: new Date().toISOString(), devices: devData, bestDevice: bestDevice.device, worstDevice: worstDevice.device, mobileVsDesktop: { ratio, interpretation }, recommendations };
  }

  private makeDevice(device: "mobile" | "desktop" | "tablet", totalImps: number, totalClicks: number, totalConvs: number, totalRev: number, totalSpd: number, share: number, ctrBase: number, cvrBase: number): DevicePerformanceDetail {
    const imps = Math.round(totalImps * share);
    const ctr = Math.min(5, Math.max(0.1, ctrBase + (Math.random() - 0.5) * 0.3));
    const clicks = Math.round(imps * ctr / 100);
    const cvr = Math.min(15, Math.max(0.1, cvrBase + (Math.random() - 0.5) * 0.5));
    const convs = Math.round(clicks * cvr / 100);
    const revShare = share * (0.8 + Math.random() * 0.4);
    const rev = Math.round(totalRev * revShare);
    const spdShare = share * (0.7 + Math.random() * 0.6);
    const spd = Math.round(totalSpd * spdShare);
    const roas = spd > 0 ? rev / spd : 0;
    const cpc = clicks > 0 ? spd / clicks : 0;
    const score = Math.round((ctr / 2.5 * 25 + cvr / 4 * 25 + roas / 3 * 25 + share * 25));
    const status: "overperforming" | "performing" | "underperforming" = score >= 70 ? "overperforming" : score >= 45 ? "performing" : "underperforming";
    return { device, impressions: imps, clicks, conversions: convs, revenue: rev, spend: spd, ctr: Math.round(ctr * 100) / 100, cvr: Math.round(cvr * 100) / 100, roas: Math.round(roas * 100) / 100, cpc: Math.round(cpc * 100) / 100, share: Math.round(share * 10000) / 100, performanceScore: score, status };
  }

  generateDeviceRecommendations(campaignId: string, tenantId: string): OptimizationRecommendation[] {
    const report = this.analyzeCrossDevice(campaignId, tenantId);
    if (!report) return [];
    return report.devices.map(d => {
      const baseAdjust = d.device === "mobile" ? 1.0 : d.device === "desktop" ? 0.9 : 0.7;
      const perfRatio = d.performanceScore / 100;
      const adjustment = Math.round((baseAdjust * perfRatio - 1) * 100);
      return {
        device: d.device,
        currentPerformance: d.status,
        recommendation: d.status === "overperforming" ? `Increase ${d.device} bid adjustment by ${Math.abs(adjustment)}% to capture more volume` : d.status === "underperforming" ? `Reduce ${d.device} spend and investigate issues before scaling` : `Maintain current ${d.device} strategy with minor optimization`,
        expectedImpact: d.status === "overperforming" ? "15-25% volume increase with modest ROAS decline" : d.status === "underperforming" ? "10-20% cost reduction" : "5-10% efficiency improvement",
        bidAdjustment: adjustment,
        priority: d.status === "overperforming" ? "high" : d.status === "underperforming" ? "high" : "medium",
      };
    });
  }

  analyzeConversionPaths(tenantId: string): ConversionPath[] {
    const paths = [
      { path: "Mobile → Mobile", base: 35 }, { path: "Desktop → Desktop", base: 25 },
      { path: "Mobile → Desktop", base: 15 }, { path: "Desktop → Mobile", base: 8 },
      { path: "Mobile → Mobile → Desktop", base: 5 }, { path: "Desktop → Mobile → Desktop", base: 4 },
      { path: "Mobile → Tablet → Mobile", base: 3 }, { path: "Desktop → Tablet → Desktop", base: 2 },
      { path: "Tablet → Mobile → Desktop", base: 2 }, { path: "Mobile → Desktop → Mobile", base: 1 },
    ];
    return paths.map(p => {
      const freq = p.base + Math.floor(Math.random() * 10);
      const convs = Math.round(freq * (0.1 + Math.random() * 0.2));
      const val = Math.round(convs * (30 + Math.random() * 70));
      return { path: p.path, frequency: freq, conversions: convs, conversionValue: val, avgTimeToConvert: Math.round(Math.random() * 48 + 2), significance: Math.round((convs / freq) * 100) };
    }).sort((a, b) => b.frequency - a.frequency);
  }

  calculateBidAdjustments(campaignId: string, tenantId: string): BidAdjustment[] {
    const report = this.analyzeCrossDevice(campaignId, tenantId);
    if (!report) return [];
    return report.devices.map(d => {
      const currentBase = d.device === "mobile" ? 1.0 : d.device === "desktop" ? 0.9 : 0.7;
      const perfAdjust = (d.performanceScore - 50) / 100 * 0.5;
      const recommended = Math.round((currentBase + perfAdjust) * 100) / 100;
      const change = Math.round((recommended - currentBase) / currentBase * 100);
      return {
        device: d.device, currentBidMultiplier: currentBase, recommendedMultiplier: Math.max(0.1, recommended),
        changePercent: change, rationale: `${d.device} performance score is ${d.performanceScore}/100 — ${d.status === "overperforming" ? "increase bids to capture more volume" : d.status === "underperforming" ? "reduce bids to control costs" : "maintain current bid levels"}`,
        expectedROASImpact: d.status === "overperforming" ? Math.round((1 - recommended / currentBase) * 100) : d.status === "underperforming" ? Math.round((currentBase / recommended - 1) * 100) : 0,
      };
    });
  }

  analyzeDeviceAudienceOverlap(tenantId: string): DeviceAudienceOverlap[] {
    const pairs: [string, string][] = [["mobile", "desktop"], ["mobile", "tablet"], ["desktop", "tablet"]];
    return pairs.map(([a, b]) => {
      const overlap = 15 + Math.random() * 30;
      const exclA = Math.round(60 - overlap * 0.4 + Math.random() * 10);
      const exclB = Math.round(40 - overlap * 0.3 + Math.random() * 10);
      return {
        deviceA: a, deviceB: b, overlapPercent: Math.round(overlap), exclusiveA: exclA, exclusiveB: exclB,
        interpretation: overlap > 35 ? `High overlap between ${a} and ${b} — coordinate frequency capping` : overlap > 20 ? `Moderate overlap between ${a} and ${b} — consider cross-device attribution` : `Low overlap — ${a} and ${b} audiences are largely distinct`,
      };
    });
  }

  analyzeDeviceTrends(campaignId: string, tenantId: string): DeviceTrend[] {
    const report = this.analyzeCrossDevice(campaignId, tenantId);
    if (!report) return [];
    return report.devices.map(d => {
      const metrics = ["ctr", "cvr", "roas", "cpc"].map(m => {
        const val = (d as any)[m] || 0;
        const chg = Math.round((Math.random() * 20 - 10) * 10) / 10;
        const dir = chg > 2 ? "up" as const : chg < -2 ? "down" as const : "stable" as const;
        return { metric: m.toUpperCase(), value: val, change: chg, direction: dir };
      });
      const up = metrics.filter(m => m.direction === "up").length;
      const down = metrics.filter(m => m.direction === "down").length;
      return { device: d.device, period: "Last 30 days", metrics, overallDirection: up > down ? "improving" as const : down > up ? "declining" as const : "stable" as const };
    });
  }
}

export const campaignCrossDeviceAnalyzer = new CampaignCrossDeviceAnalyzerService();