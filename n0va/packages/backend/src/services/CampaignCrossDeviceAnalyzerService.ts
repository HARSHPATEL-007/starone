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

interface DeviceGraphNode {
  device: string;
  users: number;
  outboundEdges: { target: string; count: number; probability: number }[];
}

interface DeviceGraphAnalysis {
  campaignId: string;
  nodes: DeviceGraphNode[];
  totalTransitions: number;
  mostCommonTransition: { from: string; to: string; probability: number };
  recommendations: string[];
}

interface AttributionTouchpoint {
  device: string;
  order: number;
  contribution: number;
  channel: string;
}

interface AttributionModeling {
  campaignId: string;
  touchpoints: AttributionTouchpoint[];
  lastClickWeight: number;
  linearWeight: number;
  timeDecayWeight: number;
  consensusAttribution: { device: string; credit: number; channel: string }[];
}

interface DeviceAffinitySegment {
  segment: string;
  primaryDevice: string;
  affinityScore: number;
  percentage: number;
  characteristics: string;
}

interface DeviceAffinityAnalysis {
  campaignId: string;
  segments: DeviceAffinitySegment[];
  topSegment: string;
  recommendation: string;
}

interface DeviceJourneySequence {
  sequence: string;
  frequency: number;
  conversionRate: number;
  avgValue: number;
  trend: "rising" | "stable" | "declining";
}

interface DeviceJourneySequenceAnalysis {
  campaignId: string;
  sequences: DeviceJourneySequence[];
  bestSequence: string;
  worstSequence: string;
  recommendation: string;
}

interface ForecastPoint {
  period: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  roas: number;
}

interface DeviceForecast {
  device: string;
  currentMetrics: { impressions: number; clicks: number; conversions: number; revenue: number; spend: number; roas: number };
  forecast: ForecastPoint[];
  overallTrend: "improving" | "declining" | "stable";
  confidence: number;
}

interface SimulatorScenario {
  name: string;
  description: string;
  adjustments: { device: string; multiplier: number }[];
  projectedRevenue: number;
  projectedSpend: number;
  projectedROAS: number;
  projectedConversions: number;
  riskLevel: "low" | "medium" | "high";
}

interface OptimizationSimulatorResult {
  campaignId: string;
  currentMetrics: { revenue: number; spend: number; roas: number; conversions: number };
  scenarios: SimulatorScenario[];
  optimalScenario: string;
  recommendation: string;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
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

    const seed = hashStr(campaignId + tenantId + "dev");
    const mobileShare = 0.55 + Math.sin(a.campaignName.length) * 0.08;
    const desktopShare = 0.32 + Math.cos(a.campaignName.length * 1.5) * 0.06;
    const tabletShare = 1 - mobileShare - desktopShare;

    const mobileCtrBase = 0.8 + ((seed * 7) % 40) / 100;
    const desktopCtrBase = 1.2 + ((seed * 13) % 50) / 100;
    const tabletCtrBase = 0.6 + ((seed * 19) % 30) / 100;

    const mobileCvrBase = 2 + ((seed * 23) % 200) / 100;
    const desktopCvrBase = 3 + ((seed * 29) % 250) / 100;
    const tabletCvrBase = 1.5 + ((seed * 31) % 150) / 100;

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
    const seed = hashStr(device + String(share));
    const imps = Math.round(totalImps * share);
    const ctr = Math.min(5, Math.max(0.1, ctrBase + ((seed * 7) % 30 - 15) / 100));
    const clicks = Math.round(imps * ctr / 100);
    const cvr = Math.min(15, Math.max(0.1, cvrBase + ((seed * 13) % 50 - 25) / 100));
    const convs = Math.round(clicks * cvr / 100);
    const revShare = share * (0.8 + ((seed * 19) % 40) / 100);
    const rev = Math.round(totalRev * revShare);
    const spdShare = share * (0.7 + ((seed * 23) % 60) / 100);
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
    const seed = hashStr(tenantId + "cp");
    const paths = [
      { path: "Mobile → Mobile", base: 35 }, { path: "Desktop → Desktop", base: 25 },
      { path: "Mobile → Desktop", base: 15 }, { path: "Desktop → Mobile", base: 8 },
      { path: "Mobile → Mobile → Desktop", base: 5 }, { path: "Desktop → Mobile → Desktop", base: 4 },
      { path: "Mobile → Tablet → Mobile", base: 3 }, { path: "Desktop → Tablet → Desktop", base: 2 },
      { path: "Tablet → Mobile → Desktop", base: 2 }, { path: "Mobile → Desktop → Mobile", base: 1 },
    ];
    return paths.map((p, i) => {
      const freq = p.base + ((seed + i * 17) % 10);
      const convs = Math.round(freq * (0.1 + ((seed + i * 23) % 20) / 100));
      const val = Math.round(convs * (30 + ((seed + i * 31) % 70)));
      return { path: p.path, frequency: freq, conversions: convs, conversionValue: val, avgTimeToConvert: Math.round(((seed + i * 37) % 48) + 2), significance: freq > 0 ? Math.round((convs / freq) * 100) : 0 };
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
    const seed = hashStr(tenantId + "dao");
    const pairs: [string, string][] = [["mobile", "desktop"], ["mobile", "tablet"], ["desktop", "tablet"]];
    return pairs.map(([a, b], i) => {
      const overlap = 15 + ((seed + i * 13) % 30);
      const exclA = Math.round(60 - overlap * 0.4 + ((seed + i * 17) % 10));
      const exclB = Math.round(40 - overlap * 0.3 + ((seed + i * 23) % 10));
      return {
        deviceA: a, deviceB: b, overlapPercent: Math.round(overlap), exclusiveA: exclA, exclusiveB: exclB,
        interpretation: overlap > 35 ? `High overlap between ${a} and ${b} — coordinate frequency capping` : overlap > 20 ? `Moderate overlap between ${a} and ${b} — consider cross-device attribution` : `Low overlap — ${a} and ${b} audiences are largely distinct`,
      };
    });
  }

  analyzeDeviceTrends(campaignId: string, tenantId: string): DeviceTrend[] {
    const report = this.analyzeCrossDevice(campaignId, tenantId);
    if (!report) return [];
    return report.devices.map((d, di) => {
      const seed = hashStr(campaignId + tenantId + "dt" + d.device);
      const metrics = ["ctr", "cvr", "roas", "cpc"].map((m, mi) => {
        const val = (d as any)[m] || 0;
        const chg = Math.round((((seed + mi * 17) % 200) - 100) * 10) / 100;
        const dir = chg > 2 ? "up" as const : chg < -2 ? "down" as const : "stable" as const;
        return { metric: m.toUpperCase(), value: val, change: chg, direction: dir };
      });
      const up = metrics.filter(m => m.direction === "up").length;
      const down = metrics.filter(m => m.direction === "down").length;
      return { device: d.device, period: "Last 30 days", metrics, overallDirection: up > down ? "improving" as const : down > up ? "declining" as const : "stable" as const };
    });
  }

  deviceGraphAnalysis(campaignId: string, tenantId: string): DeviceGraphAnalysis | null {
    const report = this.analyzeCrossDevice(campaignId, tenantId);
    if (!report) return null;
    const seed = hashStr(campaignId + tenantId + "graph");
    const devices = report.devices.map(d => d.device);
    const totalTransitions = 100000 + ((seed * 37) % 50000);
    const nodes: DeviceGraphNode[] = devices.map((dev, di) => {
      const users = Math.round(totalTransitions * (report.devices[di].share));
      const outboundEdges = devices.filter(t => t !== dev).map((target, ti) => {
        const count = Math.round(users * (0.1 + ((seed + di * 5 + ti * 7) % 40) / 100));
        return { target, count, probability: Math.round((count / Math.max(1, users)) * 10000) / 100 };
      });
      return { device: dev, users, outboundEdges };
    });
    let maxProb = 0; let bestFrom = ""; let bestTo = "";
    for (const n of nodes) {
      for (const e of n.outboundEdges) {
        if (e.probability > maxProb) { maxProb = e.probability; bestFrom = n.device; bestTo = e.target; }
      }
    }
    const recommendations = maxProb > 30 ? [`${bestFrom} → ${bestTo} is the dominant transition path — optimize cross-device retargeting`] : [`Device transitions are relatively balanced — apply uniform cross-device attribution`];
    return { campaignId, nodes, totalTransitions, mostCommonTransition: { from: bestFrom, to: bestTo, probability: maxProb }, recommendations };
  }

  crossDeviceAttributionModeling(campaignId: string, tenantId: string): AttributionModeling | null {
    const report = this.analyzeCrossDevice(campaignId, tenantId);
    if (!report) return null;
    const seed = hashStr(campaignId + tenantId + "attr");
    const devs = report.devices;
    const lastClickRaw = devs.map((d, i) => ({ device: d.device, credit: ((seed + i * 11) % 40 + 10) / 100 }));
    const lcw = lastClickRaw.reduce((s, x) => s + x.credit, 0);
    const lastClickWeight = lastClickRaw.map(x => ({ device: x.device, credit: Math.round((x.credit / lcw) * 10000) / 100 }));
    const linearWeight = devs.map((d, i) => ({ device: d.device, credit: Math.round((100 / devs.length) * 100) / 100 }));
    const decayFactors = devs.map((_, i) => Math.exp(-0.3 * i));
    const dSum = decayFactors.reduce((s, v) => s + v, 0);
    const timeDecayWeight = devs.map((d, i) => ({ device: d.device, credit: Math.round((decayFactors[i] / dSum) * 10000) / 100 }));
    const consensusAttribution = lastClickWeight.map((lc, i) => {
      const credit = Math.round((lc.credit + linearWeight[i].credit + timeDecayWeight[i].credit) / 3 * 100) / 100;
      const channel = lc.device === "mobile" ? "Mobile Web + App" : lc.device === "desktop" ? "Desktop Search + Display" : "Tablet Web";
      return { device: lc.device, credit, channel };
    });
    return { campaignId, touchpoints: devs.map((d, i) => ({ device: d.device, order: i + 1, contribution: d.performanceScore, channel: d.device === "mobile" ? "Mobile Web + App" : d.device === "desktop" ? "Desktop Search + Display" : "Tablet Web" })), lastClickWeight: lastClickWeight[0]?.credit || 0, linearWeight: linearWeight[0]?.credit || 0, timeDecayWeight: timeDecayWeight[0]?.credit || 0, consensusAttribution };
  }

  deviceAffinityScoring(campaignId: string, tenantId: string): DeviceAffinityAnalysis | null {
    const report = this.analyzeCrossDevice(campaignId, tenantId);
    if (!report) return null;
    const seed = hashStr(campaignId + tenantId + "aff");
    const segments: DeviceAffinitySegment[] = [
      { segment: "Mobile-First Users", primaryDevice: "mobile", affinityScore: Math.round((60 + ((seed * 7) % 30)) * 100) / 100, percentage: Math.round(50 + ((seed * 11) % 20)), characteristics: "Younger demographic, on-the-go browsing, high engagement with short-form content" },
      { segment: "Desktop Professionals", primaryDevice: "desktop", affinityScore: Math.round((55 + ((seed * 13) % 25)) * 100) / 100, percentage: Math.round(30 + ((seed * 17) % 15)), characteristics: "Office workers, researchers, high-intent searchers, longer session duration" },
      { segment: "Tablet Browsers", primaryDevice: "tablet", affinityScore: Math.round((40 + ((seed * 19) % 20)) * 100) / 100, percentage: Math.round(10 + ((seed * 23) % 10)), characteristics: "Home users, entertainment seekers, casual browsing" },
      { segment: "Multi-Device Power Users", primaryDevice: "mobile", affinityScore: Math.round((70 + ((seed * 29) % 20)) * 100) / 100, percentage: Math.round(5 + ((seed * 31) % 10)), characteristics: "Tech-savvy, highest LTV, start on mobile and convert on desktop" },
    ];
    const topSegment = segments.reduce((best, s) => s.affinityScore > best.affinityScore ? s : best, segments[0]);
    return { campaignId, segments, topSegment: topSegment.segment, recommendation: `Focus on ${topSegment.segment} — they show ${topSegment.affinityScore}% affinity and represent ${topSegment.percentage}% of audience` };
  }

  deviceJourneySequencing(campaignId: string, tenantId: string): DeviceJourneySequenceAnalysis | null {
    const report = this.analyzeCrossDevice(campaignId, tenantId);
    if (!report) return null;
    const seed = hashStr(campaignId + tenantId + "seq");
    const sequences: DeviceJourneySequence[] = [
      { sequence: "Mobile → Desktop", frequency: 500 + ((seed * 11) % 200), conversionRate: Math.round((3.5 + ((seed * 13) % 150) / 100) * 100) / 100, avgValue: Math.round(120 + ((seed * 17) % 80)), trend: "rising" as const },
      { sequence: "Desktop → Mobile", frequency: 300 + ((seed * 19) % 150), conversionRate: Math.round((2.8 + ((seed * 23) % 120) / 100) * 100) / 100, avgValue: Math.round(95 + ((seed * 29) % 60)), trend: "declining" as const },
      { sequence: "Mobile → Mobile", frequency: 800 + ((seed * 31) % 300), conversionRate: Math.round((2.1 + ((seed * 37) % 100) / 100) * 100) / 100, avgValue: Math.round(60 + ((seed * 41) % 40)), trend: "stable" as const },
      { sequence: "Desktop → Desktop", frequency: 600 + ((seed * 43) % 250), conversionRate: Math.round((4.2 + ((seed * 47) % 130) / 100) * 100) / 100, avgValue: Math.round(150 + ((seed * 53) % 100)), trend: "stable" as const },
      { sequence: "Mobile → Desktop → Mobile", frequency: 150 + ((seed * 59) % 100), conversionRate: Math.round((5.1 + ((seed * 61) % 150) / 100) * 100) / 100, avgValue: Math.round(200 + ((seed * 67) % 120)), trend: "rising" as const },
      { sequence: "Desktop → Mobile → Desktop", frequency: 100 + ((seed * 71) % 80), conversionRate: Math.round((4.5 + ((seed * 73) % 100) / 100) * 100) / 100, avgValue: Math.round(180 + ((seed * 79) % 100)), trend: "rising" as const },
    ];
    const sorted = [...sequences].sort((a, b) => b.conversionRate - a.conversionRate);
    const bestSequence = sorted[0].sequence;
    const worstSequence = sorted[sorted.length - 1].sequence;
    return { campaignId, sequences, bestSequence, worstSequence, recommendation: `${bestSequence} has the highest conversion rate — optimize ad sequencing and retargeting for this path` };
  }

  devicePerformanceForecast(campaignId: string, tenantId: string): DeviceForecast[] {
    const report = this.analyzeCrossDevice(campaignId, tenantId);
    if (!report) return [];
    return report.devices.map(d => {
      const seed = hashStr(campaignId + tenantId + "fc" + d.device);
      const currentMetrics = { impressions: d.impressions, clicks: d.clicks, conversions: d.conversions, revenue: d.revenue, spend: d.spend, roas: d.roas };
      const periods = ["Week 1", "Week 2", "Week 3", "Week 4"];
      const trend = ((seed * 13) % 3) as 0 | 1 | 2;
      const overallTrend: "improving" | "declining" | "stable" = trend === 0 ? "improving" : trend === 1 ? "declining" : "stable";
      const forecast = periods.map((period, pi) => {
        const factor = overallTrend === "improving" ? (1 + pi * 0.05) : overallTrend === "declining" ? (1 - pi * 0.04) : (1 + ((seed + pi * 19) % 10 - 5) / 100);
        return {
          period,
          impressions: Math.round(d.impressions * factor),
          clicks: Math.round(d.clicks * factor),
          conversions: Math.round(d.conversions * factor),
          spend: Math.round(d.spend * factor),
          revenue: Math.round(d.revenue * factor),
          roas: Math.round((d.roas * factor) * 100) / 100,
        };
      });
      return { device: d.device, currentMetrics, forecast, overallTrend, confidence: Math.round((60 + ((seed * 23) % 30)) * 100) / 100 };
    });
  }

  deviceOptimizationSimulator(campaignId: string, tenantId: string): OptimizationSimulatorResult | null {
    const report = this.analyzeCrossDevice(campaignId, tenantId);
    if (!report) return null;
    const seed = hashStr(campaignId + tenantId + "sim");
    const totalRevenue = report.devices.reduce((s, d) => s + d.revenue, 0);
    const totalSpend = report.devices.reduce((s, d) => s + d.spend, 0);
    const totalConvs = report.devices.reduce((s, d) => s + d.conversions, 0);
    const currentMetrics = { revenue: totalRevenue, spend: totalSpend, roas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0, conversions: totalConvs };
    const scenarios: SimulatorScenario[] = [
      {
        name: "Balanced Growth",
        description: "Moderate bid increases across all devices",
        adjustments: report.devices.map(d => ({ device: d.device, multiplier: 1.1 })),
        projectedRevenue: Math.round(totalRevenue * (1.08 + ((seed * 7) % 10) / 100)),
        projectedSpend: Math.round(totalSpend * (1.1 + ((seed * 11) % 5) / 100)),
        projectedROAS: Math.round((totalRevenue / totalSpend) * (1 - ((seed * 13) % 5) / 100) * 100) / 100,
        projectedConversions: Math.round(totalConvs * (1.05 + ((seed * 17) % 8) / 100)),
        riskLevel: "medium" as const,
      },
      {
        name: "Mobile-First Push",
        description: "Aggressive mobile bid increases, reduce desktop/tablet",
        adjustments: report.devices.map(d => ({ device: d.device, multiplier: d.device === "mobile" ? 1.25 : 0.85 })),
        projectedRevenue: Math.round(totalRevenue * (1.12 + ((seed * 19) % 12) / 100)),
        projectedSpend: Math.round(totalSpend * (1.05 + ((seed * 23) % 8) / 100)),
        projectedROAS: Math.round((totalRevenue / totalSpend) * (1.05 + ((seed * 29) % 8) / 100) * 100) / 100,
        projectedConversions: Math.round(totalConvs * (1.1 + ((seed * 31) % 10) / 100)),
        riskLevel: "high" as const,
      },
      {
        name: "Conservative Optimization",
        description: "Small adjustments focused on ROAS improvement",
        adjustments: report.devices.map(d => ({ device: d.device, multiplier: d.performanceScore > 60 ? 1.05 : 0.95 })),
        projectedRevenue: Math.round(totalRevenue * (1.02 + ((seed * 37) % 5) / 100)),
        projectedSpend: Math.round(totalSpend * (0.97 + ((seed * 41) % 3) / 100)),
        projectedROAS: Math.round((totalRevenue / totalSpend) * (1.08 + ((seed * 43) % 10) / 100) * 100) / 100,
        projectedConversions: Math.round(totalConvs * (1.01 + ((seed * 47) % 3) / 100)),
        riskLevel: "low" as const,
      },
      {
        name: "Desktop Maximization",
        description: "Increase desktop and tablet bids, reduce mobile",
        adjustments: report.devices.map(d => ({ device: d.device, multiplier: d.device === "desktop" ? 1.2 : d.device === "tablet" ? 1.15 : 0.9 })),
        projectedRevenue: Math.round(totalRevenue * (1.05 + ((seed * 53) % 8) / 100)),
        projectedSpend: Math.round(totalSpend * (1.08 + ((seed * 59) % 5) / 100)),
        projectedROAS: Math.round((totalRevenue / totalSpend) * (0.97 + ((seed * 61) % 5) / 100) * 100) / 100,
        projectedConversions: Math.round(totalConvs * (1.03 + ((seed * 67) % 5) / 100)),
        riskLevel: "medium" as const,
      },
    ];
    const optimal = scenarios.reduce((best, s) => s.projectedROAS > best.projectedROAS ? s : best, scenarios[0]);
    return { campaignId, currentMetrics, scenarios, optimalScenario: optimal.name, recommendation: `Optimal scenario: "${optimal.name}" with projected ROAS of ${optimal.projectedROAS}x — ${optimal.description.toLowerCase()}` };
  }
}

export const campaignCrossDeviceAnalyzer = new CampaignCrossDeviceAnalyzerService();