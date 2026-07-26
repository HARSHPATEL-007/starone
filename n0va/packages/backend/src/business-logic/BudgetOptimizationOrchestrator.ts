import { Campaign } from "../models/Campaign";
import { Metric } from "../models/Metric";
import { decisionEngine } from "./DecisionEngine";

export interface CampaignMarginalReturn {
  campaignId: string;
  campaignName: string;
  currentSpend: number;
  currentRevenue: number;
  currentROAS: number;
  marginalROAS: number;
  elasticity: number;
  saturationPoint: number;
  optimalSpend: number;
  optimalROAS: number;
  underInvested: boolean;
  overInvested: boolean;
}

export interface AllocationSuggestion {
  campaignId: string;
  campaignName: string;
  currentBudget: number;
  suggestedBudget: number;
  delta: number;
  deltaPct: number;
  expectedRevenueChange: number;
  expectedROAS: number;
  rationale: string;
  priority: "high" | "medium" | "low";
}

export interface ScenarioComparison {
  label: string;
  totalBudget: number;
  totalExpectedRevenue: number;
  totalExpectedROAS: number;
  description: string;
}

export interface BudgetOptimizationReport {
  generatedAt: string;
  campaignReturns: CampaignMarginalReturn[];
  allocationSuggestions: AllocationSuggestion[];
  currentBudget: number;
  suggestedTotalBudget: number;
  currentExpectedRevenue: number;
  optimizedExpectedRevenue: number;
  improvementPct: number;
  scenarios: ScenarioComparison[];
  concentration: { hhi: number; gini: number; interpretation: string };
  recommendations: string[];
}

export class BudgetOptimizationOrchestrator {
  async optimize(tenantId: string, totalBudget?: number): Promise<BudgetOptimizationReport> {
    const mongoose = require("mongoose");
    const campaigns = await Campaign.find({ tenantId: new mongoose.Types.ObjectId(tenantId), status: { $in: ["active", "paused"] } }).lean() as any[];
    if (campaigns.length === 0) throw new Error("No active campaigns found");

    const campaignIds = campaigns.map(c => c._id.toString());
    const metrics = await Metric.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).sort({ date: -1 }).limit(50000).lean() as any[];

    const campaignMetrics: Record<string, { spend: number; revenue: number; impressions: number; clicks: number; conversions: number; dailyROAS: number[] }> = {};
    for (const c of campaigns) {
      const cid = c._id.toString();
      campaignMetrics[cid] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0, dailyROAS: [] };
    }
    for (const m of metrics) {
      const cid = m.campaignId?.toString();
      if (cid && campaignMetrics[cid]) {
        campaignMetrics[cid].spend += m.spend || 0;
        campaignMetrics[cid].revenue += m.revenue || 0;
        campaignMetrics[cid].impressions += m.impressions || 0;
        campaignMetrics[cid].clicks += m.clicks || 0;
        campaignMetrics[cid].conversions += m.conversions || 0;
        if (m.date) {
          const day = new Date(m.date).toISOString().slice(0, 10);
          const dayKey = `${cid}_${day}`;
        }
      }
    }

    const dailyByCampaign: Record<string, Record<string, { spend: number; revenue: number }>> = {};
    for (const c of campaigns) dailyByCampaign[c._id.toString()] = {};
    for (const m of metrics) {
      const cid = m.campaignId?.toString();
      if (cid && dailyByCampaign[cid]) {
        const d = m.date ? new Date(m.date).toISOString().slice(0, 10) : "unknown";
        if (!dailyByCampaign[cid][d]) dailyByCampaign[cid][d] = { spend: 0, revenue: 0 };
        dailyByCampaign[cid][d].spend += m.spend || 0;
        dailyByCampaign[cid][d].revenue += m.revenue || 0;
      }
    }

    const campaignReturns: CampaignMarginalReturn[] = Object.entries(campaignMetrics).map(([cid, data]) => {
      const campaign = campaigns.find(c => c._id.toString() === cid)!;
      const budget = campaign.budget || data.spend || 0;
      const roas = data.spend > 0 ? data.revenue / data.spend : 0;

      const dailyDays = Object.values(dailyByCampaign[cid] || {});
      const sortedDays = dailyDays.sort((a, b) => a.spend - b.spend);
      let marginalROAS = roas;
      if (sortedDays.length >= 4) {
        const lowSpendDays = sortedDays.slice(0, Math.floor(sortedDays.length / 2));
        const highSpendDays = sortedDays.slice(Math.floor(sortedDays.length / 2));
        const lowROAS = lowSpendDays.reduce((s, d) => s + (d.spend > 0 ? d.revenue / d.spend : 0), 0) / lowSpendDays.length;
        const highROAS = highSpendDays.reduce((s, d) => s + (d.spend > 0 ? d.revenue / d.spend : 0), 0) / highSpendDays.length;
        marginalROAS = highROAS > 0 ? highROAS : roas;
      }

      const saturationRatio = budget > 0 ? Math.min(1, data.spend / budget) : 0.5;
      const elasticity = marginalROAS > 0 ? Math.min(2, Math.max(0.1, (data.spend > 0 ? data.revenue / data.spend : 0) / marginalROAS)) : 0.5;
      const saturationPoint = Math.round(budget * (roas > 1.5 ? 1.2 : roas > 0.8 ? 1.0 : 0.8));

      const optimalMultiplier = Math.max(0.3, Math.min(2.5, (marginalROAS - 0.5) * 1.5));
      const optimalSpend = Math.round(budget * optimalMultiplier);
      const optimalROAS = Math.round(roas * (1 - Math.max(0, (optimalSpend - budget) / budget) * 0.15) * 100) / 100;

      const underInvested = roas > 1.5 && data.spend >= budget * 0.9;
      const overInvested = roas < 0.8 && data.spend > 0;

      return {
        campaignId: cid, campaignName: campaign.name || cid,
        currentSpend: data.spend, currentRevenue: data.revenue,
        currentROAS: Math.round(roas * 100) / 100, marginalROAS: Math.round(marginalROAS * 100) / 100,
        elasticity: Math.round(elasticity * 100) / 100,
        saturationPoint, optimalSpend, optimalROAS, underInvested, overInvested,
      };
    });

    const currentBudget = campaignReturns.reduce((s, c) => s + c.currentSpend, 0);
    const currentExpectedRevenue = campaignReturns.reduce((s, c) => s + c.currentRevenue, 0);
    const suggestedTotalBudget = campaignReturns.reduce((s, c) => s + c.optimalSpend, 0);
    const optimizedExpectedRevenue = campaignReturns.reduce((s, c) => s + c.optimalSpend * c.optimalROAS, 0);
    const improvementPct = currentBudget > 0 ? Math.round(((optimizedExpectedRevenue - currentExpectedRevenue) / currentExpectedRevenue) * 10000) / 100 : 0;

    const totalOptimalROAS = suggestedTotalBudget > 0 ? Math.round((optimizedExpectedRevenue / suggestedTotalBudget) * 100) / 100 : 0;

    const sortedReturns = [...campaignReturns].sort((a, b) => (b.currentROAS - a.currentROAS));

    const allocationSuggestions: AllocationSuggestion[] = sortedReturns.map(cr => {
      const delta = cr.optimalSpend - cr.currentSpend;
      const deltaPct = cr.currentSpend > 0 ? Math.round((delta / cr.currentSpend) * 10000) / 100 : 0;
      const expectedRevenueChange = Math.round((cr.optimalSpend * cr.optimalROAS - cr.currentRevenue) * 100) / 100;
      let priority: "high" | "medium" | "low";
      let rationale: string;
      if (delta > 0 && cr.currentROAS > 1.5) {
        priority = "high"; rationale = `Strong ROAS ${cr.currentROAS}x — increase budget ${deltaPct}% for incremental revenue.`;
      } else if (delta < 0 && cr.currentROAS < 0.8) {
        priority = "high"; rationale = `Low ROAS ${cr.currentROAS}x — reduce budget to improve efficiency.`;
      } else if (Math.abs(deltaPct) > 30) {
        priority = "medium"; rationale = `Significant reallocation (${deltaPct}%) recommended based on marginal returns.`;
      } else {
        priority = "low"; rationale = `Minor adjustment (${deltaPct}%) for optimal allocation.`;
      }
      return { campaignId: cr.campaignId, campaignName: cr.campaignName, currentBudget: cr.currentSpend, suggestedBudget: cr.optimalSpend, delta: Math.round(delta), deltaPct, expectedRevenueChange, expectedROAS: cr.optimalROAS, rationale, priority };
    });

    allocationSuggestions.sort((a, b) => (b.delta > 0 ? 1 : -1) - (a.delta > 0 ? 1 : -1));

    const scenarios: ScenarioComparison[] = [
      { label: "Current", totalBudget: currentBudget, totalExpectedRevenue: currentExpectedRevenue, totalExpectedROAS: currentBudget > 0 ? Math.round((currentExpectedRevenue / currentBudget) * 100) / 100 : 0, description: "Current budget allocation — no changes." },
      { label: "Optimized", totalBudget: suggestedTotalBudget, totalExpectedRevenue: Math.round(optimizedExpectedRevenue * 100) / 100, totalExpectedROAS: totalOptimalROAS, description: `Optimized allocation — ${improvementPct >= 0 ? "+" : ""}${improvementPct}% revenue improvement.` },
    ];

    if (totalBudget && totalBudget > 0) {
      const constrainedRevenue = campaignReturns.reduce((s, cr) => {
        const share = cr.currentSpend / Math.max(1, currentBudget);
        const constrainedSpend = totalBudget * share;
        return s + constrainedSpend * cr.currentROAS;
      }, 0);
      scenarios.push({ label: "Constrained", totalBudget, totalExpectedRevenue: Math.round(constrainedRevenue * 100) / 100, totalExpectedROAS: totalBudget > 0 ? Math.round((constrainedRevenue / totalBudget) * 100) / 100 : 0, description: `Fixed budget of $${totalBudget.toLocaleString()} — proportional allocation.` });
    }

    const spendShares = campaignReturns.map(c => c.currentSpend);
    const hhi = decisionEngine.hhi(spendShares);
    const giniCoeff = decisionEngine.gini(spendShares);
    let concentrationInterpretation: string;
    if (hhi > 2500) concentrationInterpretation = "Highly concentrated — single-campaign dependency risk.";
    else if (hhi > 1500) concentrationInterpretation = "Moderately concentrated. Diversify across more campaigns.";
    else concentrationInterpretation = "Well-diversified campaign portfolio.";

    const recommendations: string[] = [];
    const highPriority = allocationSuggestions.filter(a => a.priority === "high");
    if (highPriority.length > 0) recommendations.push(`${highPriority.length} high-priority reallocation(s). Prioritize: ${highPriority.slice(0, 3).map(a => `"${a.campaignName}" (${a.delta > 0 ? "+" : ""}${a.deltaPct}%)`).join(", ")}.`);
    const underInvested = campaignReturns.filter(c => c.underInvested);
    if (underInvested.length > 0) recommendations.push(`${underInvested.length} campaign(s) under-invested (ROAS >1.5x, near budget cap). Increase budget.`);
    const overInvested = campaignReturns.filter(c => c.overInvested);
    if (overInvested.length > 0) recommendations.push(`${overInvested.length} campaign(s) over-invested (ROAS <0.8x). Reduce or pause.`);
    recommendations.push(concentrationInterpretation);
    if (improvementPct > 10) recommendations.push(`Optimization could improve revenue by ${improvementPct}% through budget reallocation.`);

    return {
      generatedAt: new Date().toISOString(), campaignReturns, allocationSuggestions,
      currentBudget, suggestedTotalBudget, currentExpectedRevenue,
      optimizedExpectedRevenue: Math.round(optimizedExpectedRevenue * 100) / 100,
      improvementPct, scenarios, concentration: { hhi, gini: giniCoeff, interpretation: concentrationInterpretation }, recommendations,
    };
  }
}

export const budgetOptimizationOrchestrator = new BudgetOptimizationOrchestrator();
