interface CampaignData {
  id: string;
  name: string;
  status: string;
  type: string;
  platforms: string[];
  budget: { daily: number; lifetime: number; spent: number; remaining: number; currency: string };
  metrics?: { impressions: number; clicks: number; conversions: number; spend: number; revenue: number; ctr: number; cpc: number; roas: number; cvr: number };
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

interface Recommendation {
  id: string;
  type: "budget" | "creative" | "audience" | "platform" | "scheduling" | "cross_campaign" | "optimization";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  campaignId?: string;
  campaignName?: string;
  action?: string;
  metric?: string;
  currentValue?: number;
  suggestedValue?: number;
  potentialGain?: string;
}

export class RecommendationEngineService {
  generateCampaignRecommendations(campaign: CampaignData): Recommendation[] {
    const recs: Recommendation[] = [];
    if (!campaign.metrics) return recs;

    const { metrics, budget } = campaign;

    if (budget.spent > 0 && budget.lifetime > 0) {
      const utilization = (budget.spent / budget.lifetime) * 100;
      if (utilization >= 85) {
        recs.push(this.makeRec("budget", "Campaign budget nearly exhausted", `${campaign.name} has used ${utilization.toFixed(0)}% of its budget. Consider increasing the lifetime budget or pausing low-performing ad sets.`, "high", "low", campaign.id, campaign.name, "increase_budget", "budget_utilization", utilization, 90));
      }
      if (utilization <= 30 && isNearEnd(campaign.endDate)) {
        recs.push(this.makeRec("budget", "Budget underutilized near end date", `${campaign.name} has only used ${utilization.toFixed(0)}% of budget but is ending soon. Increase spend or redistribute to other campaigns.`, "medium", "medium", campaign.id, campaign.name, "redistribute_budget", "budget_utilization", utilization, 70));
      }
    }

    if (metrics.roas < 2.0) {
      recs.push(this.makeRec("optimization", "Low ROAS — optimize targeting", `${campaign.name} ROAS is ${metrics.roas.toFixed(2)}x. Refine audience targeting, adjust bids, or pause underperforming platforms.`, "high", "medium", campaign.id, campaign.name, "optimize_targeting", "roas", metrics.roas, 3.0, `+${((3.0 / metrics.roas - 1) * 100).toFixed(0)}% revenue`));
    }

    if (metrics.cvr < 2.5) {
      recs.push(this.makeRec("optimization", "Low conversion rate — improve landing pages", `${campaign.name} CVR is ${metrics.cvr.toFixed(1)}%. Test landing page variants, simplify forms, or improve CTAs.`, "medium", "medium", campaign.id, campaign.name, "optimize_landing_pages", "cvr", metrics.cvr, 3.5));
    }

    if (metrics.ctr < 1.5) {
      recs.push(this.makeRec("creative", "Low CTR — refresh creatives", `${campaign.name} CTR is ${metrics.ctr.toFixed(2)}%. Test new headlines, visuals, or CTAs to improve engagement.`, "medium", "low", campaign.id, campaign.name, "refresh_creatives", "ctr", metrics.ctr, 2.5));
    }

    if (metrics.cpc > 1.5) {
      recs.push(this.makeRec("budget", "High CPC — review bidding strategy", `${campaign.name} CPC is $${metrics.cpc.toFixed(2)}. Consider switching bid strategies or narrowing audience targeting.`, "medium", "medium", campaign.id, campaign.name, "review_bidding", "cpc", metrics.cpc, 1.0));
    }

    const dailyBudget = budget.daily || budget.lifetime / 30;
    const dailySpend = metrics.spend / 30;
    if (dailySpend > 0 && dailySpend < dailyBudget * 0.5) {
      recs.push(this.makeRec("budget", "Under-spending — increase daily budget", `${campaign.name} spends $${dailySpend.toFixed(0)}/day vs $${dailyBudget.toFixed(0)} budget. Increase spend to capture more impressions.`, "medium", "low", campaign.id, campaign.name, "increase_daily_budget", "daily_spend", dailySpend, dailyBudget));
    }

    if (campaign.platforms.length === 1) {
      recs.push(this.makeRec("platform", "Single platform — consider expanding", `${campaign.name} only runs on ${campaign.platforms[0]}. Expanding to additional platforms could increase reach.`, "low", "high", campaign.id, campaign.name, "expand_platforms"));
    }

    return recs;
  }

  generateCrossCampaignRecommendations(campaigns: CampaignData[]): Recommendation[] {
    const recs: Recommendation[] = [];
    const active = campaigns.filter((c) => c.status === "active" && c.metrics);

    if (active.length < 2) return recs;

    const bestRoas = [...active].sort((a, b) => (b.metrics?.roas || 0) - (a.metrics?.roas || 0));
    const worstRoas = [...active].sort((a, b) => (a.metrics?.roas || Infinity) - (b.metrics?.roas || Infinity));

    if (bestRoas[0].metrics!.roas > worstRoas[0].metrics!.roas * 2) {
      const gain = ((bestRoas[0].metrics!.roas - worstRoas[0].metrics!.roas) / worstRoas[0].metrics!.roas * 100).toFixed(0);
      recs.push({
        id: `cross_roas_${Date.now()}`,
        type: "cross_campaign",
        title: "Shift budget from low to high ROAS campaigns",
        description: `${worstRoas[0].name} (ROAS ${worstRoas[0].metrics!.roas.toFixed(2)}x) is underperforming vs ${bestRoas[0].name} (ROAS ${bestRoas[0].metrics!.roas.toFixed(2)}x). Reallocate 20% budget for potential ${gain}% gain.`,
        impact: "high", effort: "medium",
        campaignId: worstRoas[0].id, campaignName: worstRoas[0].name,
        action: "shift_budget", metric: "roas",
        currentValue: worstRoas[0].metrics!.roas, suggestedValue: bestRoas[0].metrics!.roas,
        potentialGain: `+${gain}% ROAS`,
      });
    }

    const platformCount: Record<string, { campaigns: number; totalSpend: number; totalRevenue: number }> = {};
    active.forEach((c) => {
      c.platforms.forEach((p) => {
        if (!platformCount[p]) platformCount[p] = { campaigns: 0, totalSpend: 0, totalRevenue: 0 };
        platformCount[p].campaigns++;
        platformCount[p].totalSpend += c.metrics?.spend || 0;
        platformCount[p].totalRevenue += c.metrics?.revenue || 0;
      });
    });

    Object.entries(platformCount).forEach(([platform, data]) => {
      if (data.totalSpend > 0) {
        const roas = data.totalRevenue / data.totalSpend;
        const overall = active.reduce((s, c) => s + (c.metrics?.revenue || 0), 0) / active.reduce((s, c) => s + (c.metrics?.spend || 0), 1);
        if (roas < overall * 0.6) {
          recs.push({
            id: `platform_under_${platform}_${Date.now()}`,
            type: "platform",
            title: `${platform} underperforming across campaigns`,
            description: `${platform} ROAS (${roas.toFixed(2)}x) is 40%+ below the cross-campaign average (${overall.toFixed(2)}x) across ${data.campaigns} campaigns. Review ${platform}-specific strategy.`,
            impact: "high", effort: "medium",
            action: "review_platform_strategy", metric: "platform_roas",
            currentValue: roas, suggestedValue: overall,
          });
        }
      }
    });

    const lowestCvr = [...active].sort((a, b) => (a.metrics?.cvr || 0) - (b.metrics?.cvr || 0))[0];
    const highestCvr = [...active].sort((a, b) => (b.metrics?.cvr || 0) - (a.metrics?.cvr || 0))[0];
    if (lowestCvr && highestCvr && lowestCvr.metrics!.cvr < highestCvr.metrics!.cvr * 0.5) {
      recs.push({
        id: `cvr_insight_${Date.now()}`,
        type: "cross_campaign",
        title: "Conversion rate optimization opportunity",
        description: `${lowestCvr.name} CVR (${lowestCvr.metrics!.cvr.toFixed(1)}%) is less than half of ${highestCvr.name} (${highestCvr.metrics!.cvr.toFixed(1)}%). Apply ${highestCvr.name}'s audience/targeting strategy to ${lowestCvr.name}.`,
        impact: "medium", effort: "high",
        campaignId: lowestCvr.id, campaignName: lowestCvr.name,
        action: "apply_best_practices", metric: "cvr",
        currentValue: lowestCvr.metrics!.cvr, suggestedValue: highestCvr.metrics!.cvr,
      });
    }

    return recs;
  }

  private makeRec(
    type: Recommendation["type"], title: string, description: string,
    impact: Recommendation["impact"], effort: Recommendation["effort"],
    campaignId?: string, campaignName?: string, action?: string,
    metric?: string, currentValue?: number, suggestedValue?: number, potentialGain?: string,
  ): Recommendation {
    return { id: `rec_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type, title, description, impact, effort, campaignId, campaignName, action, metric, currentValue, suggestedValue, potentialGain };
  }
}

function isNearEnd(endDate?: string): boolean {
  if (!endDate) return false;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diffDays = (end - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 14;
}

export const recommendationEngine = new RecommendationEngineService();
