import { Campaign, ICampaign } from "../models/Campaign";
import { Metric } from "../models/Metric";
import { Creative } from "../models/Creative";
import { budgetOptimizer } from "../services/BudgetOptimizer";
import { campaignOptimizerService } from "../services/CampaignOptimizerService";

export interface PerformanceAdvice {
  campaignId: string;
  name: string;
  currentRoas: number;
  currentCtr: number;
  budgetUtilization: number;
  recommendationType: "budget" | "creative" | "targeting" | "timing" | "platform";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  expectedImpact: string;
  actionUrl?: string;
}

export interface PortfolioAdviceReport {
  generatedAt: string;
  adviceCount: number;
  highPriorityCount: number;
  advices: PerformanceAdvice[];
  summary: string;
}

export class PortfolioAdviceOrchestrator {
  async generateAdvice(tenantId: string): Promise<PortfolioAdviceReport> {
    const mongoose = require("mongoose");
    const campaigns = await Campaign.find({ tenantId: new mongoose.Types.ObjectId(tenantId), status: "active" }).lean();
    const allMetrics = await Metric.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
    const allCreatives = await Creative.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();

    const advices: PerformanceAdvice[] = [];
    const campaignMetrics: Record<string, any[]> = {};
    for (const m of allMetrics) {
      const cid = (m as any).campaignId?.toString();
      if (!campaignMetrics[cid]) campaignMetrics[cid] = [];
      campaignMetrics[cid].push(m);
    }

    for (const c of campaigns) {
      const campaign = c as any;
      const cid = campaign._id?.toString() || campaign.id;
      const metrics = campaignMetrics[cid] || [];
      const budget = campaign.budget || { lifetime: 0, spent: 0 };
      const utilization = budget.lifetime > 0 ? Math.round((budget.spent / budget.lifetime) * 100) : 0;

      const agg = metrics.reduce((acc: any, m: any) => { acc.impressions += m.impressions || 0; acc.clicks += m.clicks || 0; acc.conversions += m.conversions || 0; acc.spend += m.spend || 0; acc.revenue += m.revenue || 0; return acc; }, { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });
      const ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) : 0;
      const roas = agg.spend > 0 ? (agg.revenue / agg.spend) : 0;
      const cvr = agg.clicks > 0 ? (agg.conversions / agg.clicks) : 0;

      if (roas < 1 && agg.spend > 500) {
        advices.push({ campaignId: cid, name: campaign.name, currentRoas: roas, currentCtr: ctr * 100, budgetUtilization: utilization, recommendationType: "budget", priority: "high", title: "Low ROAS — consider budget reallocation", description: `ROAS of ${roas.toFixed(2)}x below breakeven. Consider reallocating budget to higher-performing campaigns.`, expectedImpact: "Potential 20-40% improvement in portfolio ROAS" });
      }

      if (agg.impressions > 5000 && ctr < 0.005) {
        advices.push({ campaignId: cid, name: campaign.name, currentRoas: roas, currentCtr: ctr * 100, budgetUtilization: utilization, recommendationType: "creative", priority: "high", title: "Low CTR — refresh creatives", description: `CTR of ${(ctr * 100).toFixed(2)}% is below 0.5% threshold with ${agg.impressions.toLocaleString()} impressions. Creative fatigue likely.`, expectedImpact: "CTR improvement of 50-200% with fresh creatives" });
      }

      if (agg.spend > 1000 && cvr < 0.01) {
        advices.push({ campaignId: cid, name: campaign.name, currentRoas: roas, currentCtr: ctr * 100, budgetUtilization: utilization, recommendationType: "targeting", priority: "medium", title: "Low conversion rate — review targeting", description: `CVR of ${(cvr * 100).toFixed(2)}% is below 1%. Consider refining audience targeting or landing page experience.`, expectedImpact: "Conversion rate improvement of 30-100%" });
      }

      if (utilization > 85 && campaign.status === "active") {
        advices.push({ campaignId: cid, name: campaign.name, currentRoas: roas, currentCtr: ctr * 100, budgetUtilization: utilization, recommendationType: "budget", priority: "medium", title: "Budget nearly exhausted", description: `${utilization}% of budget used. Increase lifetime budget to maintain delivery.`, expectedImpact: "Prevents campaign from stopping mid-cycle" });
      }

      if (utilization < 10 && budget.lifetime > 1000 && campaign.status === "active" && agg.spend > 0) {
        advices.push({ campaignId: cid, name: campaign.name, currentRoas: roas, currentCtr: ctr * 100, budgetUtilization: utilization, recommendationType: "budget", priority: "low", title: "Low budget utilization", description: `Only ${utilization}% of budget used. Consider reducing campaign duration or increasing daily spend.`, expectedImpact: "Better budget efficiency" });
      }

      if (agg.impressions > 10000 && roas > 3) {
        advices.push({ campaignId: cid, name: campaign.name, currentRoas: roas, currentCtr: ctr * 100, budgetUtilization: utilization, recommendationType: "budget", priority: "high", title: "High performer — increase budget", description: `ROAS of ${roas.toFixed(2)}x with strong delivery. Increasing budget could capture additional profitable conversions.`, expectedImpact: "Incremental revenue at current ROAS" });
      }
    }

    const platformCreativeCounts: Record<string, number> = {};
    for (const cr of allCreatives) {
      const p = (cr as any).platform || "unknown";
      platformCreativeCounts[p] = (platformCreativeCounts[p] || 0) + 1;
    }
    const inactiveCreatives = allCreatives.filter((cr: any) => cr.status !== "active" && cr.status !== "approved").length;
    if (inactiveCreatives > 0) {
      advices.push({ campaignId: "portfolio", name: "Portfolio", currentRoas: 0, currentCtr: 0, budgetUtilization: 0, recommendationType: "creative", priority: "low", title: `${inactiveCreatives} creative(s) need attention`, description: `${inactiveCreatives} creative(s) are in non-active status. Review and approve or archive.`, expectedImpact: "Cleaner creative library" });
    }

    advices.sort((a: any, b: any) => { const order: Record<string, number> = { high: 0, medium: 1, low: 2 }; return (order[a.priority] || 3) - (order[b.priority] || 3); });

    const highPriority = advices.filter(a => a.priority === "high").length;
    const budgetAdvices = advices.filter(a => a.recommendationType === "budget").length;
    const creativeAdvices = advices.filter(a => a.recommendationType === "creative").length;

    return {
      generatedAt: new Date().toISOString(), adviceCount: advices.length, highPriorityCount: highPriority,
      advices,
      summary: `${advices.length} recommendation(s) generated. ${highPriority} high priority. ${budgetAdvices} budget-related, ${creativeAdvices} creative-related.`,
    };
  }
}

export const portfolioAdviceOrchestrator = new PortfolioAdviceOrchestrator();
