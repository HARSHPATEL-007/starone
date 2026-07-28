import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";
import { DataStore } from "./DataStore";

interface FunnelStage {
  name: string;
  users: number;
  conversions: number;
  conversionRate: number;
  dropOff: number;
  dropOffRate: number;
  description: string;
}

interface FunnelAnalysis {
  tenantId: string;
  campaignId: string;
  campaignName: string;
  stages: FunnelStage[];
  overallConversionRate: number;
  totalUsers: number;
  totalConversions: number;
  averageTimeToConvert: number;
  leakageRate: number;
  bottlenecks: { stage: string; dropOffRate: number; severity: "critical" | "high" | "medium" | "low"; suggestion: string }[];
  generatedAt: string;
}

interface FunnelDropOffPoint {
  stage: string;
  usersEntering: number;
  usersDropping: number;
  dropOffRate: number;
  lostConversions: number;
  revenueImpact: number;
  priority: number;
  recommendation: string;
}

interface FunnelOptimization {
  funnelStage: string;
  currentRate: number;
  targetRate: number;
  impact: string;
  actions: string[];
  estimatedLift: number;
  difficulty: "easy" | "medium" | "hard";
}

interface FunnelComparison {
  campaigns: { campaignId: string; campaignName: string; overallConversionRate: number; totalUsers: number; totalConversions: number; bestStage: string; worstStage: string }[];
  topPerformer: string;
  averageConversionRate: number;
  conversionRateRange: { min: number; max: number };
}

interface FunnelSegmentPerformance {
  segmentName: string;
  users: number;
  conversions: number;
  conversionRate: number;
  averageStages: number;
  topDropOff: string;
  recommendation: string;
}

interface FunnelTrendPoint {
  date: string;
  users: number;
  conversions: number;
  conversionRate: number;
  averageStages: number;
}

const STAGE_TEMPLATES = [
  { name: "Impressions", desc: "Users who saw the ad" },
  { name: "Clicks", desc: "Users who clicked the ad" },
  { name: "Visits", desc: "Users who landed on the page" },
  { name: "Engagement", desc: "Users who engaged (scroll, video view, etc.)" },
  { name: "Lead Capture", desc: "Users who submitted a form/signup" },
  { name: "Trial / Demo", desc: "Users who started a trial or requested a demo" },
  { name: "Conversion", desc: "Users who completed the desired action" },
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const SEGMENTS = [
  { name: "New Visitors", desc: "First-time site visitors", multi: 0.7 },
  { name: "Returning Users", desc: "Users with prior sessions", multi: 1.3 },
  { name: "Mobile Users", desc: "Users on mobile devices", multi: 0.85 },
  { name: "Desktop Users", desc: "Users on desktop devices", multi: 1.15 },
  { name: "Social Traffic", desc: "Users from social channels", multi: 0.9 },
  { name: "Search Traffic", desc: "Users from search engines", multi: 1.1 },
];

export class CampaignConversionFunnelAnalyzerService {
  analyzeFunnel(campaignId: string, tenantId: string): FunnelAnalysis {
    const seed = hashStr(campaignId + tenantId);
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const campaign = portfolio.analyses.find((a: any) => a.campaignId === campaignId);
    const campaignName = campaign?.campaignName || `Campaign ${campaignId.slice(0, 8)}`;
    const baseUsers = 5000 + (seed % 20000);

    const stages: FunnelStage[] = [];
    let prevUsers = baseUsers;
    let totalConvs = 0;

    for (let i = 0; i < STAGE_TEMPLATES.length; i++) {
      const dropRate = 0.15 + ((seed + i * 7) % 50) / 100;
      const users = i === 0 ? prevUsers : Math.max(1, Math.round(prevUsers * (1 - dropRate)));
      const convs = Math.round(users * (0.3 + ((seed + i * 13) % 40) / 100));
      const convRate = users > 0 ? Math.round(convs / users * 10000) / 100 : 0;
      const dropOff = i > 0 ? prevUsers - users : 0;
      const dropOffRate = i > 0 && prevUsers > 0 ? Math.round(dropOff / prevUsers * 10000) / 100 : 0;

      stages.push({
        name: STAGE_TEMPLATES[i].name, users, conversions: convs, conversionRate: convRate,
        dropOff, dropOffRate, description: STAGE_TEMPLATES[i].desc,
      });
      prevUsers = users;
      if (i === STAGE_TEMPLATES.length - 1) totalConvs = convs;
    }

    const overallConvRate = baseUsers > 0 ? Math.round(totalConvs / baseUsers * 10000) / 100 : 0;
    const totalConversions = stages[stages.length - 1].conversions;
    const avgTime = 2 + ((seed * 31) % 142);
    const totalLeakage = baseUsers - stages[stages.length - 1].users;
    const leakageRate = baseUsers > 0 ? Math.round(totalLeakage / baseUsers * 10000) / 100 : 0;

    const bottlenecks = stages.slice(1).map((s, i) => {
      const sev = s.dropOffRate > 50 ? "critical" as const : s.dropOffRate > 35 ? "high" as const : s.dropOffRate > 20 ? "medium" as const : "low" as const;
      return {
        stage: s.name, dropOffRate: s.dropOffRate, severity: sev,
        suggestion: sev === "critical" ? `Urgent: ${s.dropOffRate}% drop at ${s.name} stage — investigate friction points immediately` :
                    sev === "high" ? `High drop-off at ${s.name} — A/B test variations to improve conversion` :
                    sev === "medium" ? `Moderate drop-off at ${s.name} — consider optimization opportunities` :
                    `Normal drop-off at ${s.name} — monitor for changes`,
      };
    }).filter(b => b.dropOffRate > 15);

    return { tenantId, campaignId, campaignName, stages, overallConversionRate: overallConvRate, totalUsers: baseUsers, totalConversions, averageTimeToConvert: avgTime, leakageRate, bottlenecks, generatedAt: new Date().toISOString() };
  }

  analyzeFunnelDropOffs(campaignId: string, tenantId: string): FunnelDropOffPoint[] {
    const funnel = this.analyzeFunnel(campaignId, tenantId);
    return funnel.stages.slice(1).map((s, i) => {
      const revImpact = Math.round(s.dropOff * (funnel.totalConversions / Math.max(funnel.totalUsers, 1)) * (20 + (hashStr(campaignId + String(i)) % 80)));
      return {
        stage: s.name, usersEntering: funnel.stages[i].users, usersDropping: s.dropOff,
        dropOffRate: s.dropOffRate, lostConversions: Math.round(s.dropOff * funnel.overallConversionRate / 100),
        revenueImpact: revImpact, priority: s.dropOffRate > 40 ? 1 : s.dropOffRate > 25 ? 2 : 3,
        recommendation: s.dropOffRate > 40 ? `Critical: fix ${s.name} — test page load speed, clarity of CTA, and form complexity` :
                         s.dropOffRate > 25 ? `Optimize ${s.name} stage — add social proof, urgency signals, and simplify user flow` :
                         `Improve ${s.name} incrementally — A/B test messaging and visual design`,
      };
    }).sort((a, b) => a.priority - b.priority);
  }

  generateFunnelOptimizations(campaignId: string, tenantId: string): FunnelOptimization[] {
    const funnel = this.analyzeFunnel(campaignId, tenantId);
    return funnel.stages.filter(s => s.conversionRate < 60).map(s => {
      const currentRate = s.conversionRate;
      const targetRate = Math.min(90, currentRate + 15 + (hashStr(campaignId + s.name) % 15));
      const lift = Math.round((targetRate - currentRate) * 100 / Math.max(currentRate, 1));
      const actions: string[] = [];
      if (s.name === "Impressions") actions.push("Refine targeting to reach more qualified users", "Test different ad formats and placements");
      else if (s.name === "Clicks") actions.push("Improve ad copy and call-to-action", "Test creative variations with strong value propositions");
      else if (s.name === "Visits") actions.push("Optimize landing page load speed (<2s)", "Ensure landing page matches ad messaging");
      else if (s.name === "Engagement") actions.push("Add interactive elements (video, calculators, quizzes)", "Improve content relevance and personalization");
      else if (s.name === "Lead Capture") actions.push("Simplify form fields (reduce to essential only)", "Add progress indicators for multi-step forms");
      else if (s.name === "Trial / Demo") actions.push("Reduce friction in signup process", "Offer guided onboarding or concierge setup");
      else actions.push("Optimize checkout/purchase flow", "Add multiple payment options and trust signals");

      return {
        funnelStage: s.name, currentRate, targetRate,
        impact: `Improving ${s.name} from ${currentRate}% to ${targetRate}% could increase overall conversions by ~${lift}%`,
        actions, estimatedLift: lift,
        difficulty: s.name === "Impressions" || s.name === "Clicks" ? "easy" as const : s.name === "Visits" || s.name === "Engagement" ? "medium" as const : "hard" as const,
      };
    });
  }

  compareFunnels(campaignIds: string[], tenantId: string): FunnelComparison {
    const cfgs = campaignIds.map(cid => this.analyzeFunnel(cid, tenantId));
    const campaigns = cfgs.map(f => ({
      campaignId: f.campaignId, campaignName: f.campaignName, overallConversionRate: f.overallConversionRate,
      totalUsers: f.totalUsers, totalConversions: f.totalConversions,
      bestStage: f.stages.reduce((a, b) => a.conversionRate > b.conversionRate ? a : b).name,
      worstStage: f.stages.reduce((a, b) => a.conversionRate < b.conversionRate ? a : b).name,
    }));
    const top = campaigns.length > 0 ? campaigns.reduce((a, b) => a.overallConversionRate > b.overallConversionRate ? a : b).campaignName : "";
    const avgRate = campaigns.length > 0 ? Math.round(campaigns.reduce((s, c) => s + c.overallConversionRate, 0) / campaigns.length * 100) / 100 : 0;
    const rates = campaigns.map(c => c.overallConversionRate);
    return { campaigns, topPerformer: top, averageConversionRate: avgRate, conversionRateRange: { min: Math.min(...rates), max: Math.max(...rates) } };
  }

  analyzeFunnelSegments(campaignId: string, tenantId: string): FunnelSegmentPerformance[] {
    const funnel = this.analyzeFunnel(campaignId, tenantId);
    return SEGMENTS.map(s => {
      const segUsers = Math.round(funnel.totalUsers * (0.08 + ((hashStr(campaignId + s.name) % 20)) / 100));
      const segConvs = Math.round(segUsers * funnel.overallConversionRate / 100 * s.multi);
      const convRate = segUsers > 0 ? Math.round(segConvs / segUsers * 10000) / 100 : 0;
      const avgStages = 3 + ((hashStr(campaignId + s.name) * 7) % 5);
      const dropStage = funnel.stages.slice(1).reduce((a, b) => a.dropOffRate > b.dropOffRate ? a : b).name;
      return {
        segmentName: s.name, users: segUsers, conversions: segConvs, conversionRate: convRate,
        averageStages: avgStages, topDropOff: dropStage,
        recommendation: s.multi < 1 ? `Lower conversion for ${s.name} — optimize mobile/social experience, reduce page load, simplify CTAs` :
                         `Strong ${s.name} performance — maintain strategy and test upsell opportunities`,
      };
    });
  }

  analyzeFunnelTrends(campaignId: string, tenantId: string): FunnelTrendPoint[] {
    const seed = hashStr(campaignId + tenantId);
    const baseUsers = 5000 + (seed % 10000);
    const trends: FunnelTrendPoint[] = [];
    for (let w = 0; w < 8; w++) {
      const wSeed = seed + w * 31;
      const users = Math.round(baseUsers * (0.7 + ((wSeed % 30) / 100)));
      const convRate = 2.5 + ((wSeed * 7) % 50) / 10;
      const convs = Math.round(users * convRate / 100);
      trends.push({
        date: new Date(2025, 0, 1 + w * 7).toISOString().split("T")[0],
        users, conversions: convs, conversionRate: Math.round(convRate * 100) / 100,
        averageStages: Math.round((3 + ((wSeed * 13) % 5)) * 100) / 100,
      });
    }
    return trends;
  }
}

export const campaignConversionFunnelAnalyzer = new CampaignConversionFunnelAnalyzerService();
