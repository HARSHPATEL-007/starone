interface CampaignSummaryInput {
  name: string;
  status: string;
  type: string;
  platforms: string[];
  budget: { daily: number; lifetime: number; spent: number; remaining: number };
  metrics?: { impressions: number; clicks: number; conversions: number; spend: number; revenue: number; ctr: number; cpc: number; roas: number; cvr: number };
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

interface SummaryResult {
  campaignName: string;
  shortSummary: string;
  detailedSummary: string;
  keyInsights: string[];
  risks: string[];
  recommendations: string[];
}

export class CampaignSummaryService {
  generateSummary(campaign: CampaignSummaryInput): SummaryResult {
    const insights: string[] = [];
    const risks: string[] = [];
    const recommendations: string[] = [];
    const m = campaign.metrics;
    const b = campaign.budget;

    if (m) {
      if (m.roas >= 3) insights.push(`Strong ROAS of ${m.roas.toFixed(2)}x — ${m.roas >= 5 ? "exceptional" : "above average"} performance`);
      else if (m.roas < 1.5) risks.push(`ROAS of ${m.roas.toFixed(2)}x is below the 1.5x breakeven threshold`);

      if (m.ctr >= 3) insights.push(`CTR of ${m.ctr.toFixed(2)}% indicates highly engaging creative`);
      else if (m.ctr < 1) recommendations.push(`CTR of ${m.ctr.toFixed(2)}% suggests creative fatigue — consider refreshing ad copy and visuals`);

      if (m.cvr >= 5) insights.push(`Conversion rate of ${m.cvr.toFixed(1)}% is excellent`);
      else if (m.cvr < 1.5) recommendations.push(`Low CVR of ${m.cvr.toFixed(1)}% — audit landing page experience and checkout flow`);

      if (m.cpc < 0.5) insights.push(`Cost-efficient CPC of $${m.cpc.toFixed(2)}`);
      else if (m.cpc > 2) risks.push(`High CPC of $${m.cpc.toFixed(2)} is eroding margins`);

      const totalRevenue = m.revenue || 0;
      const totalSpend = m.spend || 0;
      if (totalRevenue > 0 && totalSpend > 0) {
        const profit = totalRevenue - totalSpend;
        if (profit > 0) insights.push(`Profit of $${profit.toLocaleString()} (${((profit / totalRevenue) * 100).toFixed(0)}% margin)`);
        else risks.push(`Campaign is unprofitable with $${Math.abs(profit).toLocaleString()} in losses`);
      }
    }

    if (b.lifetime > 0) {
      const utilization = b.lifetime > 0 ? (b.spent / b.lifetime) * 100 : 0;
      if (utilization >= 90) risks.push(`${utilization.toFixed(0)}% of budget consumed — risk of running out before end date`);
      else if (utilization <= 20 && campaign.status === "active") recommendations.push(`Only ${utilization.toFixed(0)}% of budget used — consider increasing spend velocity`);
    }

    if (campaign.platforms.length === 0) recommendations.push("No platforms selected — add at least one ad platform");
    if (campaign.platforms.length === 1) recommendations.push(`Running only on ${campaign.platforms[0]} — expanding to additional platforms could increase reach`);

    const platformList = campaign.platforms.length > 0 ? campaign.platforms.join(", ") : "none";
    const spend_str = m ? `$${m.spend.toLocaleString()}` : "$0";
    const revenue_str = m ? `$${m.revenue.toLocaleString()}` : "$0";
    const roas_str = m ? `${m.roas.toFixed(2)}x` : "N/A";

    let shortSummary: string;
    if (campaign.status === "active" && m) {
      if (m.roas >= 2) shortSummary = `${campaign.name} is performing well with ${roas_str} ROAS on ${platformList}`;
      else if (m.roas >= 1) shortSummary = `${campaign.name} is breaking even at ${roas_str} ROAS on ${platformList}`;
      else shortSummary = `${campaign.name} needs attention — ROAS of ${roas_str} is below target on ${platformList}`;
    } else if (campaign.status === "draft") {
      shortSummary = `${campaign.name} is in draft — ready to launch on ${platformList}`;
    } else if (campaign.status === "paused") {
      shortSummary = `${campaign.name} is paused after spending ${spend_str}`;
    } else if (campaign.status === "completed" || campaign.status === "archived") {
      shortSummary = `${campaign.name} completed with ${revenue_str} revenue, ${roas_str} ROAS`;
    } else {
      shortSummary = `${campaign.name} (${campaign.status}) — ${spend_str} spent, ${revenue_str} revenue`;
    }

    const detailedParts: string[] = [];
    detailedParts.push(`${campaign.name} is a ${campaign.type} campaign currently in "${campaign.status}" status.`);
    detailedParts.push(`It runs on ${platformList} with a budget of $${b.lifetime.toLocaleString()} ($${b.daily.toLocaleString()}/day).`);

    if (m) {
      detailedParts.push(`Performance: ${m.impressions.toLocaleString()} impressions, ${m.clicks.toLocaleString()} clicks, ${m.conversions.toLocaleString()} conversions.`);
      detailedParts.push(`Financials: $${m.spend.toLocaleString()} spent generating $${m.revenue.toLocaleString()} revenue (${roas_str} ROAS).`);
      detailedParts.push(`Efficiency: ${m.ctr.toFixed(2)}% CTR, $${m.cpc.toFixed(2)} CPC, ${m.cvr.toFixed(1)}% CVR.`);
    }

    return {
      campaignName: campaign.name,
      shortSummary,
      detailedSummary: detailedParts.join(" "),
      keyInsights: insights,
      risks,
      recommendations,
    };
  }

  generateAll(campaigns: CampaignSummaryInput[]): SummaryResult[] {
    return campaigns.map((c) => this.generateSummary(c));
  }

  generatePortfolioSummary(campaigns: CampaignSummaryInput[]): {
    totalCampaigns: number; activeCount: number; totalBudget: number; totalSpend: number;
    totalRevenue: number; overallROAS: number; summary: string;
    topPerformers: string[]; needsAttention: string[];
  } {
    const active = campaigns.filter((c) => c.status === "active");
    const totalBudget = campaigns.reduce((s, c) => s + (c.budget.lifetime || 0), 0);
    const totalSpend = campaigns.reduce((s, c) => s + (c.metrics?.spend || 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.metrics?.revenue || 0), 0);
    const overallROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    const withRoas = active.filter((c) => c.metrics && c.metrics.roas > 0).sort((a, b) => (b.metrics?.roas || 0) - (a.metrics?.roas || 0));
    const topPerformers = withRoas.slice(0, 3).map((c) => c.name);
    const needsAttention = active.filter((c) => c.metrics && c.metrics.roas < 1.5).map((c) => c.name);

    return {
      totalCampaigns: campaigns.length,
      activeCount: active.length,
      totalBudget,
      totalSpend,
      totalRevenue,
      overallROAS: Math.round(overallROAS * 100) / 100,
      summary: `${active.length} of ${campaigns.length} campaigns active · $${totalSpend.toLocaleString()} spent · $${totalRevenue.toLocaleString()} revenue · ${overallROAS.toFixed(2)}x ROAS`,
      topPerformers,
      needsAttention,
    };
  }
}

export const campaignSummary = new CampaignSummaryService();
