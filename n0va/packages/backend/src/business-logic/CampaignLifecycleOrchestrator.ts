import { Campaign } from "../models/Campaign";
import { Metric } from "../models/Metric";
import { decisionEngine } from "./DecisionEngine";

export type CampaignStage = "draft" | "active" | "paused" | "completed" | "archived";
export type PhaseType = "pre-launch" | "launch" | "scale" | "optimize" | "wind-down" | "post-mortem";

export interface PhaseAssessment {
  phase: PhaseType;
  score: number;
  band: string;
  checks: { name: string; passed: boolean; weight: number; detail: string }[];
  readiness: "ready" | "needs-attention" | "blocked";
}

export interface StageTransition {
  from: string;
  to: string;
  score: number;
  risk: "low" | "medium" | "high";
  requiredActions: string[];
  recommended: boolean;
}

export interface LifecycleRecommendation {
  campaignId: string;
  campaignName: string;
  currentStage: CampaignStage;
  currentPhase: PhaseType;
  daysInPhase: number;
  phaseAssessment: PhaseAssessment;
  suggestedTransitions: StageTransition[];
  phaseSpecificAdvice: string[];
  lifecycleHealth: number;
  lifecycleBand: string;
}

export interface LifecyclePortfolioReport {
  generatedAt: string;
  campaignLifecycles: LifecycleRecommendation[];
  phaseDistribution: Record<string, number>;
  stuckCampaigns: { id: string; name: string; phase: string; daysInPhase: number }[];
  recommendations: string[];
}

export class CampaignLifecycleOrchestrator {
  private readonly PHASE_SEQUENCE: PhaseType[] = ["pre-launch", "launch", "scale", "optimize", "wind-down", "post-mortem"];

  async assessCampaign(campaignId: string, tenantId: string): Promise<LifecycleRecommendation> {
    const mongoose = require("mongoose");
    const cid = new mongoose.Types.ObjectId(campaignId);
    const campaign = await Campaign.findById(cid).lean() as any;
    if (!campaign || campaign.tenantId?.toString() !== tenantId) throw new Error("Campaign not found");

    const metrics = await Metric.find({ campaignId: cid, tenantId: new mongoose.Types.ObjectId(tenantId) }).sort({ date: 1 }).lean() as any[];

    const stage = (campaign.status || "draft") as CampaignStage;
    const daysActive = campaign.startDate ? Math.round((Date.now() - new Date(campaign.startDate).getTime()) / 86400000) : 0;
    const daysSinceCreation = campaign.createdAt ? Math.round((Date.now() - new Date(campaign.createdAt).getTime()) / 86400000) : 0;

    const totalSpend = metrics.reduce((s: number, m: any) => s + (m.spend || 0), 0);
    const totalRevenue = metrics.reduce((s: number, m: any) => s + (m.revenue || 0), 0);
    const totalImpressions = metrics.reduce((s: number, m: any) => s + (m.impressions || 0), 0);
    const totalClicks = metrics.reduce((s: number, m: any) => s + (m.clicks || 0), 0);
    const totalConversions = metrics.reduce((s: number, m: any) => s + (m.conversions || 0), 0);

    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const cvr = totalClicks > 0 ? totalConversions / totalClicks : 0;

    let phase: PhaseType;
    if (stage === "draft") phase = "pre-launch";
    else if (daysActive < 7) phase = "launch";
    else if (daysActive < 30 && roas > 0.5) phase = "scale";
    else if (daysActive < 60 && roas > 1) phase = "optimize";
    else if (stage === "completed" || daysActive >= 60) phase = "wind-down";
    else phase = "optimize";

    const daysInPhase = phase === "pre-launch" ? daysSinceCreation : daysActive;

    const phaseIdx = this.PHASE_SEQUENCE.indexOf(phase);
    const daysInStage = daysActive;

    const checks: { name: string; passed: boolean; weight: number; detail: string }[] = [];
    let totalScore = 0, maxScore = 0;

    if (phase === "pre-launch") {
      const pc1 = { name: "Budget allocated", passed: (campaign.budget || 0) > 0, weight: 20, detail: `Budget: $${campaign.budget || 0}` }; checks.push(pc1); if (pc1.passed) totalScore += pc1.weight; maxScore += pc1.weight;
      const pc2 = { name: "Creatives assigned", passed: !!(campaign.creativeIds?.length || campaign.creatives?.length), weight: 20, detail: `Creatives: ${campaign.creativeIds?.length || campaign.creatives?.length || 0}` }; checks.push(pc2); if (pc2.passed) totalScore += pc2.weight; maxScore += pc2.weight;
      const pc3 = { name: "Targeting configured", passed: !!(campaign.targeting || campaign.audienceIds?.length), weight: 20, detail: "Targeting: " + (campaign.targeting ? "configured" : "missing") }; checks.push(pc3); if (pc3.passed) totalScore += pc3.weight; maxScore += pc3.weight;
      const pc4 = { name: "Start date set", passed: !!campaign.startDate, weight: 15, detail: campaign.startDate ? `Start: ${new Date(campaign.startDate).toISOString().slice(0, 10)}` : "Not set" }; checks.push(pc4); if (pc4.passed) totalScore += pc4.weight; maxScore += pc4.weight;
      const pc5 = { name: "Goals defined", passed: !!(campaign.goals?.length || campaign.kpiTargets), weight: 15, detail: campaign.goals?.length ? `${campaign.goals.length} goal(s)` : "None" }; checks.push(pc5); if (pc5.passed) totalScore += pc5.weight; maxScore += pc5.weight;
      const pc6 = { name: "Platforms connected", passed: !!(campaign.platforms?.length || campaign.channels?.length), weight: 10, detail: `Platforms: ${campaign.platforms?.length || campaign.channels?.length || 0}` }; checks.push(pc6); if (pc6.passed) totalScore += pc6.weight; maxScore += pc6.weight;
    } else {
      const c1 = { name: "Positive ROAS", passed: roas >= 0.8, weight: 25, detail: `ROAS: ${Math.round(roas * 100) / 100}x` }; checks.push(c1); if (c1.passed) totalScore += c1.weight; maxScore += c1.weight;
      const c2 = { name: "CTR above 0.5%", passed: ctr >= 0.005, weight: 15, detail: `CTR: ${Math.round(ctr * 10000) / 100}%` }; checks.push(c2); if (c2.passed) totalScore += c2.weight; maxScore += c2.weight;
      const c3 = { name: "Budget utilization", passed: (campaign.budget || 0) <= 0 || totalSpend / campaign.budget >= 0.5, weight: 20, detail: `Spent $${Math.round(totalSpend)} of $${Math.round(campaign.budget || 0)}` }; checks.push(c3); if (c3.passed) totalScore += c3.weight; maxScore += c3.weight;
      const c4 = { name: "Sufficient data", passed: metrics.length >= 10, weight: 10, detail: `${metrics.length} metric records` }; checks.push(c4); if (c4.passed) totalScore += c4.weight; maxScore += c4.weight;
      const c5 = { name: "Not over budget", passed: !campaign.budget || totalSpend <= campaign.budget * 1.1, weight: 15, detail: `Budget: $${Math.round(campaign.budget || 0)} vs spend: $${Math.round(totalSpend)}` }; checks.push(c5); if (c5.passed) totalScore += c5.weight; maxScore += c5.weight;
      const c6 = { name: "Conversion rate > 0", passed: cvr > 0, weight: 15, detail: `CVR: ${Math.round(cvr * 10000) / 100}%` }; checks.push(c6); if (c6.passed) totalScore += c6.weight; maxScore += c6.weight;
    }

    const score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const band = decisionEngine.label(decisionEngine.band(score));
    const readiness: "ready" | "needs-attention" | "blocked" = score >= 70 ? "ready" : score >= 40 ? "needs-attention" : "blocked";

    const suggestedTransitions: StageTransition[] = [];
    const nextPhases = this.PHASE_SEQUENCE.slice(phaseIdx + 1, phaseIdx + 3);

    for (const next of nextPhases) {
      let risk: "low" | "medium" | "high";
      let requiredActions: string[] = [];
      if (score >= 70) { risk = "low"; }
      else if (score >= 40) { risk = "medium"; requiredActions = checks.filter(c => !c.passed).map(c => c.name); }
      else { risk = "high"; requiredActions = checks.filter(c => !c.passed).map(c => c.detail); }
      suggestedTransitions.push({
        from: phase, to: next, score, risk,
        requiredActions: requiredActions.slice(0, 5),
        recommended: score >= 65 && risk !== "high",
      });
    }

    const phaseSpecificAdvice: string[] = [];
    if (phase === "pre-launch") {
      if (!checks[0].passed) phaseSpecificAdvice.push("Allocate budget before launch.");
      if (!checks[1].passed) phaseSpecificAdvice.push("Assign at least one creative asset.");
      if (!checks[2].passed) phaseSpecificAdvice.push("Configure audience targeting.");
      phaseSpecificAdvice.push("Review launch checklist before activating.");
    } else if (phase === "launch") {
      phaseSpecificAdvice.push("Monitor first 7 days closely for early signals.");
      if (totalSpend === 0) phaseSpecificAdvice.push("No spend detected — check platform connection and delivery.");
      phaseSpecificAdvice.push("Set up conversion tracking if not already active.");
    } else if (phase === "scale") {
      if (roas > 2) phaseSpecificAdvice.push(`Strong ROAS ${Math.round(roas * 100) / 100}x — consider increasing budget 20-30%.`);
      else if (roas < 1) phaseSpecificAdvice.push(`ROAS ${Math.round(roas * 100) / 100}x below target. Optimize before scaling.`);
      phaseSpecificAdvice.push("Test audience expansion and lookalike segments.");
    } else if (phase === "optimize") {
      if (ctr < 0.005) phaseSpecificAdvice.push("Low CTR — refresh creative and test new copy.");
      if (cvr < 0.01) phaseSpecificAdvice.push("Low conversion rate — review landing page and offer.");
      phaseSpecificAdvice.push("Run A/B tests on audiences, creatives, and bidding.");
    } else if (phase === "wind-down") {
      phaseSpecificAdvice.push("Document key learnings and winning creatives.");
      phaseSpecificAdvice.push("Export performance data for post-mortem analysis.");
      phaseSpecificAdvice.push("Archive campaign when complete.");
    }

    return {
      campaignId, campaignName: campaign.name || campaignId, currentStage: stage, currentPhase: phase,
      daysInPhase, phaseAssessment: { phase, score, band, checks, readiness },
      suggestedTransitions, phaseSpecificAdvice,
      lifecycleHealth: score, lifecycleBand: band,
    };
  }

  async assessPortfolio(tenantId: string): Promise<LifecyclePortfolioReport> {
    const mongoose = require("mongoose");
    const campaigns = await Campaign.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean() as any[];
    const campaignIds = campaigns.map(c => c._id.toString());

    const results = await Promise.allSettled(campaignIds.map(id => this.assessCampaign(id, tenantId)));
    const lifecycles = results.filter((r): r is PromiseFulfilledResult<LifecycleRecommendation> => r.status === "fulfilled").map(r => r.value);

    const phaseDistribution: Record<string, number> = {};
    for (const lc of lifecycles) {
      phaseDistribution[lc.currentPhase] = (phaseDistribution[lc.currentPhase] || 0) + 1;
    }

    const stuckCampaigns = lifecycles
      .filter(lc => lc.phaseAssessment.readiness === "blocked" && lc.daysInPhase > 14)
      .map(lc => ({ id: lc.campaignId, name: lc.campaignName, phase: lc.currentPhase, daysInPhase: lc.daysInPhase }))
      .sort((a, b) => b.daysInPhase - a.daysInPhase);

    const readyToTransition = lifecycles.filter(lc => lc.suggestedTransitions.some(t => t.recommended)).length;

    const recommendations: string[] = [];
    if (stuckCampaigns.length > 0) recommendations.push(`${stuckCampaigns.length} campaign(s) stuck in phase >14 days. Review and take action.`);
    if (readyToTransition > 0) recommendations.push(`${readyToTransition} campaign(s) ready for next lifecycle phase.`);
    const preLaunch = lifecycles.filter(l => l.currentPhase === "pre-launch");
    if (preLaunch.length > 0) recommendations.push(`${preLaunch.length} campaign(s) in pre-launch. Complete launch checklist.`);
    const windDown = lifecycles.filter(l => l.currentPhase === "wind-down");
    if (windDown.length > 0) recommendations.push(`${windDown.length} campaign(s) winding down. Archive and document learnings.`);

    return {
      generatedAt: new Date().toISOString(), campaignLifecycles: lifecycles,
      phaseDistribution, stuckCampaigns: stuckCampaigns.slice(0, 20), recommendations,
    };
  }
}

export const campaignLifecycleOrchestrator = new CampaignLifecycleOrchestrator();
