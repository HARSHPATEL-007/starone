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

  funnelVelocityAnalysis(campaignId: string, tenantId: string): {
    campaignId: string; campaignName: string; stages: { name: string; avgTimeHours: number; velocity: number; acceleration: number; throughput: number }[];
    overallThroughput: number; fastestStage: string; slowestStage: string;
  } {
    const funnel = this.analyzeFunnel(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId);
    let prevVelocity = 0;
    const stages = funnel.stages.map((s, i) => {
      const avgTimeHours = Math.round((2 + ((seed + i * 17) % 96)) * 100) / 100;
      const velocity = s.users > 0 ? Math.round((s.conversions / s.users) * 10000) / 100 : 0;
      const acceleration = i > 0 ? Math.round((velocity - prevVelocity) * 100) / 100 : 0;
      const throughput = Math.round(s.conversions / Math.max(avgTimeHours, 0.01) * 100) / 100;
      prevVelocity = velocity;
      return { name: s.name, avgTimeHours, velocity, acceleration, throughput };
    });
    const sortedTime = [...stages].sort((a, b) => a.avgTimeHours - b.avgTimeHours);
    const overallThroughput = stages[stages.length - 1]?.throughput || 0;
    return { campaignId, campaignName: funnel.campaignName, stages, overallThroughput, fastestStage: sortedTime[0]?.name || "", slowestStage: sortedTime[sortedTime.length - 1]?.name || "" };
  }

  funnelLeakagePrediction(campaignId: string, tenantId: string): {
    campaignId: string; campaignName: string; predictions: { stage: string; entering: number; predictedLeak: number; leakRate: number; confidence: string; impact: string }[];
    totalPredictedLeak: number; highestLeakStage: string;
  } {
    const funnel = this.analyzeFunnel(campaignId, tenantId);
    const seed = hashStr(campaignId + "leak" + tenantId);
    const predictions = funnel.stages.slice(0, -1).map((s, i) => {
      const entering = s.users;
      const leakRate = Math.round((35 + ((seed + i * 19) % 50)) * 100) / 100;
      const predictedLeak = Math.round(entering * leakRate / 100);
      const confLevels = ["high", "medium", "low"] as const;
      const confidence = confLevels[leakRate > 60 ? 2 : leakRate > 40 ? 1 : 0];
      const nextStage = funnel.stages[i + 1];
      const revPerUser = nextStage.conversions > 0 ? (funnel.stages[funnel.stages.length - 1].users * 10) / Math.max(entering, 1) : 0;
      const impact = `$${Math.round(predictedLeak * revPerUser).toLocaleString()}`;
      return { stage: s.name, entering, predictedLeak: Math.round(predictedLeak * 100) / 100, leakRate, confidence, impact };
    });
    const worst = predictions.reduce((a, b) => a.predictedLeak > b.predictedLeak ? a : b);
    return { campaignId, campaignName: funnel.campaignName, predictions, totalPredictedLeak: Math.round(predictions.reduce((s, p) => s + p.predictedLeak, 0) * 100) / 100, highestLeakStage: worst.stage };
  }

  funnelAttribution(campaignId: string, tenantId: string): {
    campaignId: string; campaignName: string; channels: { name: string; assistedConversions: number; creditedConversions: number; assistRate: number; role: string }[];
    totalConversions: number; topChannel: string;
  } {
    const funnel = this.analyzeFunnel(campaignId, tenantId);
    const seed = hashStr(campaignId + "attr" + tenantId);
    const totalConvs = funnel.totalConversions;
    const channels = [
      { name: "Search", role: "Bottom-funnel — captures high-intent demand", baseShare: 0.3 },
      { name: "Display", role: "Top-funnel — drives awareness and consideration", baseShare: 0.15 },
      { name: "Social", role: "Mid-funnel — engages and nurtures prospects", baseShare: 0.2 },
      { name: "Video", role: "Top/mid-funnel — educates and builds trust", baseShare: 0.15 },
      { name: "Email", role: "Mid/bottom-funnel — retargets and converts warm leads", baseShare: 0.12 },
      { name: "Direct", role: "Bottom-funnel — brand-driven conversions", baseShare: 0.08 },
    ];
    const result = channels.map((ch, i) => {
      const shareAdjust = ((seed + i * 11) % 30) / 100;
      const assistShare = ch.baseShare * (0.7 + shareAdjust);
      const creditShare = ch.baseShare * (0.8 + ((seed + i * 23) % 20) / 100);
      const assisted = Math.round(totalConvs * assistShare);
      const credited = Math.round(totalConvs * creditShare);
      return { name: ch.name, assistedConversions: assisted, creditedConversions: credited, assistRate: Math.round(assisted / Math.max(totalConvs, 1) * 10000) / 100, role: ch.role };
    });
    const top = result.reduce((a, b) => a.creditedConversions > b.creditedConversions ? a : b);
    return { campaignId, campaignName: funnel.campaignName, channels: result, totalConversions: totalConvs, topChannel: top.name };
  }

  funnelScenarioSimulation(campaignId: string, tenantId: string, targetStage?: string, improvementPct?: number): {
    campaignId: string; campaignName: string; currentConversionRate: number; simulatedConversionRate: number; improvement: number;
    stages: { name: string; currentUsers: number; simulatedUsers: number; currentConvRate: number; simulatedConvRate: number }[];
    additionalConversions: number; projectedRevenueLift: number;
  } {
    const funnel = this.analyzeFunnel(campaignId, tenantId);
    const seed = hashStr(campaignId + "sim" + tenantId);
    const improveStage = targetStage || funnel.stages[3]?.name || "Engagement";
    const improvePct = improvementPct || 20;
    const stageIdx = funnel.stages.findIndex(s => s.name === improveStage);
    const simStages = funnel.stages.map((s, i) => {
      let simUsers = s.users;
      let simConvRate = s.conversionRate;
      if (i >= stageIdx && stageIdx >= 0) {
        const boost = i === stageIdx ? improvePct / 100 : (improvePct / 100) * (0.5 + ((seed * (i - stageIdx)) % 20) / 100);
        simUsers = Math.round(s.users * (1 + boost));
        simConvRate = Math.round(Math.min(100, s.conversionRate * (1 + boost * 0.3)) * 100) / 100;
      }
      return { name: s.name, currentUsers: s.users, simulatedUsers: simUsers, currentConvRate: s.conversionRate, simulatedConvRate: simConvRate };
    });
    const currentTotalConv = funnel.totalConversions;
    const simTotalConv = simStages[simStages.length - 1]?.simulatedUsers || currentTotalConv;
    const additional = Math.max(0, simTotalConv - currentTotalConv);
    const revPerConv = 20 + ((seed * 13) % 80);
    return { campaignId, campaignName: funnel.campaignName, currentConversionRate: funnel.overallConversionRate, simulatedConversionRate: currentTotalConv > 0 ? Math.round(simTotalConv / funnel.totalUsers * 10000) / 100 : 0, improvement: currentTotalConv > 0 ? Math.round((simTotalConv - currentTotalConv) / currentTotalConv * 10000) / 100 : 0, stages: simStages, additionalConversions: additional, projectedRevenueLift: Math.round(additional * revPerConv * 100) / 100 };
  }

  funnelChannelBreakdown(campaignId: string, tenantId: string): {
    campaignId: string; campaignName: string; channels: { name: string; stages: { stage: string; users: number; conversions: number; conversionRate: number; contribution: number }[]; totalConversions: number; bestStage: string }[];
    topChannelPerStage: { stage: string; topChannel: string }[];
  } {
    const funnel = this.analyzeFunnel(campaignId, tenantId);
    const seed = hashStr(campaignId + "chbrk" + tenantId);
    const channelNames = ["Search", "Display", "Social", "Video", "Email", "Direct"];
    const channels = channelNames.map((chName, ci) => {
      const stages = funnel.stages.map((s, si) => {
        const share = 0.05 + ((seed + ci * 17 + si * 13) % 40) / 100;
        const users = Math.round(s.users * share);
        const convRate = Math.round((s.conversionRate * (0.7 + ((seed + ci * 23 + si * 19) % 40) / 100)) * 100) / 100;
        const convs = Math.round(users * convRate / 100);
        return { stage: s.name, users, conversions: convs, conversionRate: convRate, contribution: Math.round(share * 10000) / 100 };
      });
      const totalConvs = stages.reduce((s, st) => s + st.conversions, 0);
      const bestStage = stages.reduce((a, b) => a.conversionRate > b.conversionRate ? a : b).stage;
      return { name: chName, stages, totalConversions: totalConvs, bestStage };
    });
    const topPerStage = funnel.stages.map((s, si) => {
      const top = channels.reduce((a, b) => a.stages[si].conversionRate > b.stages[si].conversionRate ? a : b);
      return { stage: s.name, topChannel: top.name };
    });
    return { campaignId, campaignName: funnel.campaignName, channels, topChannelPerStage: topPerStage };
  }

  funnelHealthScore(campaignId: string, tenantId: string): {
    campaignId: string; campaignName: string; score: number; grade: string;
    dimensions: { name: string; score: number; weight: number; status: string }[];
    bottlenecks: string[]; recommendations: string[];
  } {
    const funnel = this.analyzeFunnel(campaignId, tenantId);
    const convRateScore = Math.min(100, Math.round(funnel.overallConversionRate * 10));
    const leakScore = Math.max(0, Math.round(100 - funnel.leakageRate));
    const bottleneckPenalty = Math.min(50, funnel.bottlenecks.filter(b => b.severity === "critical" || b.severity === "high").length * 15);
    const stageHealth = funnel.stages.map(s => {
      if (s.dropOffRate > 50) return 30;
      if (s.dropOffRate > 35) return 50;
      if (s.dropOffRate > 20) return 70;
      return 90;
    });
    const avgStageScore = Math.round(stageHealth.reduce((s, v) => s + v, 0) / stageHealth.length);
    const velocityDim = Math.min(100, Math.round(funnel.stages.reduce((s, st) => s + st.conversionRate, 0) / funnel.stages.length));
    const rawScore = Math.round(convRateScore * 0.25 + leakScore * 0.2 + avgStageScore * 0.3 + velocityDim * 0.25 - bottleneckPenalty * 0.15);
    const score = Math.max(0, Math.min(100, rawScore));
    const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";
    const dimensions = [
      { name: "Conversion Rate", score: convRateScore, weight: 0.25, status: convRateScore >= 70 ? "good" : convRateScore >= 45 ? "fair" : "poor" },
      { name: "Leakage Control", score: leakScore, weight: 0.2, status: leakScore >= 70 ? "good" : leakScore >= 45 ? "fair" : "poor" },
      { name: "Stage Health", score: avgStageScore, weight: 0.3, status: avgStageScore >= 70 ? "good" : avgStageScore >= 45 ? "fair" : "poor" },
      { name: "Velocity", score: velocityDim, weight: 0.25, status: velocityDim >= 70 ? "good" : velocityDim >= 45 ? "fair" : "poor" },
    ];
    const bottlenecks = funnel.bottlenecks.filter(b => b.severity === "critical" || b.severity === "high").map(b => `${b.stage} (${b.dropOffRate}% drop-off)`);
    const recommendations = bottlenecks.length > 0 ? [`Address ${bottlenecks.length} critical bottlenecks`, "A/B test underperforming stages", "Implement retargeting for drop-off points"] : ["Maintain current funnel performance", "Test incremental improvements in mid-funnel stages", "Monitor for emerging bottlenecks"];
    return { campaignId, campaignName: funnel.campaignName, score, grade, dimensions, bottlenecks, recommendations };
  }

  funnelPortfolioHealth(tenantId: string): { generatedAt: string; campaigns: { campaignId: string; campaignName: string; score: number; grade: string; overallConversionRate: number; bottleneckCount: number; criticalBottlenecks: string[] }[]; totals: { scanned: number; averageScore: number; campaignsNeedingAttention: number; topBottleneckStage: string | null } } {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const rows: any[] = [];
    for (const a of portfolio.analyses) {
      const funnel = this.analyzeFunnel(a.campaignId, tenantId);
      const health = this.funnelHealthScore(a.campaignId, tenantId);
      rows.push({
        campaignId: a.campaignId, campaignName: a.campaignName,
        score: health.score, grade: health.grade,
        overallConversionRate: Math.round(funnel.overallConversionRate * 100) / 100,
        bottleneckCount: funnel.bottlenecks.length,
        criticalBottlenecks: funnel.bottlenecks.filter(b => b.severity === "critical" || b.severity === "high").map(b => b.stage),
      });
    }
    rows.sort((x, y) => x.score - y.score);
    const avgScore = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length * 100) / 100 : 0;
    const stageCounts: Record<string, number> = {};
    for (const r of rows) for (const s of r.criticalBottlenecks) stageCounts[s] = (stageCounts[s] || 0) + 1;
    const topStage = Object.keys(stageCounts).length > 0 ? Object.keys(stageCounts).reduce((a, b) => stageCounts[a] > stageCounts[b] ? a : b) : null;
    return {
      generatedAt: new Date().toISOString(),
      campaigns: rows,
      totals: { scanned: rows.length, averageScore: avgScore, campaignsNeedingAttention: rows.filter(r => r.score < 65).length, topBottleneckStage: topStage },
    };
  }
}

export const campaignConversionFunnelAnalyzer = new CampaignConversionFunnelAnalyzerService();
