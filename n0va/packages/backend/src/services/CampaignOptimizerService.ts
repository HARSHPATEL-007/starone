import { DataStore } from "./DataStore";

interface OptimizationSuggestion {
  id: string;
  type: "budget_reallocation" | "platform_shift" | "bid_adjustment" | "audience_refinement" | "creative_refresh" | "schedule_optimization" | "landing_page" | "keyword_expansion";
  campaignId: string;
  campaignName: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "easy" | "medium" | "hard";
  confidence: number;
  potentialValue: number;
  currentValue: number;
  metrics?: Record<string, number>;
  actions: { label: string; api: string; params: Record<string, unknown> }[];
  applied: boolean;
  dismissed: boolean;
}

export class CampaignOptimizerService {
  getPlatformConfigs() {
    return [
      { platform: "meta", name: "Meta Ads", icon: "facebook", tier: "core", capabilities: ["audience", "creative", "retargeting", "lookalike"] },
      { platform: "google", name: "Google Ads", icon: "google", tier: "core", capabilities: ["search", "display", "youtube", "shopping"] },
      { platform: "linkedin", name: "LinkedIn Ads", icon: "linkedin", tier: "core", capabilities: ["audience", "sponsored_content", "inmail"] },
      { platform: "tiktok", name: "TikTok Ads", icon: "tiktok", tier: "growth", capabilities: ["in_feed", "brand_takeover", "spark_ads"] },
      { platform: "snapchat", name: "Snapchat Ads", icon: "snapchat", tier: "growth", capabilities: ["story", "filter", "commercial"] },
      { platform: "pinterest", name: "Pinterest Ads", icon: "pinterest", tier: "niche", capabilities: ["pin", "shopping", "video_pin"] },
      { platform: "twitter", name: "X Ads", icon: "twitter", tier: "niche", capabilities: ["promoted_tweets", "trend_takeover"] },
    ];
  }

  generateOptimizations(tenantId: string): OptimizationSuggestion[] {
    const mem = DataStore["mem"]();
    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId && c.status === "active");
    const suggestions: OptimizationSuggestion[] = [];

    for (const campaign of campaigns) {
      if (campaign.budget?.spent > 0 && campaign.budget?.lifetime) {
        const spentRatio = campaign.budget.spent / campaign.budget.lifetime;
        const remaining = campaign.budget.lifetime - campaign.budget.spent;
        const daysElapsed = campaign.startDate ? (Date.now() - new Date(campaign.startDate).getTime()) / 86400000 : 30;
        const daysTotal = campaign.endDate ? (new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / 86400000 : 90;
        const expectedRatio = Math.min(daysElapsed / daysTotal, 1);

        if (spentRatio < expectedRatio * 0.7 && remaining > 5000) {
          suggestions.push({
            id: `budget_under_${campaign._id}`,
            type: "budget_reallocation",
            campaignId: campaign._id,
            campaignName: campaign.name,
            title: "Budget Underutilized",
            description: `Campaign has spent ${(spentRatio * 100).toFixed(0)}% of budget but ${(expectedRatio * 100).toFixed(0)}% of time has elapsed. Consider increasing spend pace.`,
            impact: "high",
            effort: "easy",
            confidence: 85,
            potentialValue: remaining * 0.15,
            currentValue: campaign.budget.spent,
            metrics: { spentRatio, expectedRatio, remaining, dailyBudget: campaign.budget.daily },
            actions: [{ label: "Increase daily budget by 20%", api: "campaigns/updateBudget", params: { id: campaign._id, budget: { daily: Math.round(campaign.budget.daily * 1.2), lifetime: campaign.budget.lifetime } } }],
            applied: false, dismissed: false,
          });
        }

        if (spentRatio > expectedRatio * 1.3 && campaign.budget.daily > 1000) {
          suggestions.push({
            id: `budget_over_${campaign._id}`,
            type: "budget_reallocation",
            campaignId: campaign._id,
            campaignName: campaign.name,
            title: "Budget Burning Fast",
            description: `Campaign has spent ${(spentRatio * 100).toFixed(0)}% of budget but only ${(expectedRatio * 100).toFixed(0)}% of time has passed. Reduce daily budget to avoid early exhaustion.`,
            impact: "high",
            effort: "easy",
            confidence: 90,
            potentialValue: campaign.budget.remaining,
            currentValue: campaign.budget.spent,
            metrics: { spentRatio, expectedRatio, remaining: campaign.budget.remaining },
            actions: [{ label: "Reduce daily budget by 20%", api: "campaigns/updateBudget", params: { id: campaign._id, budget: { daily: Math.round(campaign.budget.daily * 0.8), lifetime: campaign.budget.lifetime } } }],
            applied: false, dismissed: false,
          });
        }
      }

      const platforms = campaign.platforms || [];
      if (platforms.length === 1 && platforms[0] === "meta") {
        suggestions.push({
          id: `platform_expand_${campaign._id}`,
          type: "platform_shift",
          campaignId: campaign._id,
          campaignName: campaign.name,
          title: "Expand to Google Ads",
          description: `${campaign.name} only runs on Meta. Adding Google Search could capture high-intent traffic at potentially lower CPA.`,
          impact: "high",
          effort: "medium",
          confidence: 70,
          potentialValue: campaign.budget.lifetime * 0.25,
          currentValue: campaign.budget.spent,
          actions: [{ label: "Add Google Ads to campaign", api: "campaigns/update", params: { id: campaign._id, platforms: [...platforms, "google"] } }],
          applied: false, dismissed: false,
        });
      }

      if (platforms.includes("google") && !platforms.includes("youtube")) {
        suggestions.push({
          id: `youtube_${campaign._id}`,
          type: "platform_shift",
          campaignId: campaign._id,
          campaignName: campaign.name,
          title: "Add YouTube Video Ads",
          description: "Google campaigns with YouTube achieve 30% higher engagement rates on average. Add YouTube to your platform mix.",
          impact: "medium",
          effort: "medium",
          confidence: 65,
          potentialValue: campaign.budget.daily * 30 * 0.1,
          currentValue: 0,
          actions: [{ label: "See YouTube setup guide", api: "campaigns/update", params: { id: campaign._id, platforms: [...new Set([...platforms, "youtube"])] } }],
          applied: false, dismissed: false,
        });
      }

      const daysSinceStart = campaign.startDate ? Math.floor((Date.now() - new Date(campaign.startDate).getTime()) / 86400000) : 30;
      if (daysSinceStart > 21) {
        suggestions.push({
          id: `audience_refine_${campaign._id}`,
          type: "audience_refinement",
          campaignId: campaign._id,
          campaignName: campaign.name,
          title: "Refine Audience Targeting",
          description: `Campaign has been running for ${daysSinceStart} days. Use performance data to create lookalike audiences from high-converting segments.`,
          impact: "medium",
          effort: "medium",
          confidence: 75,
          potentialValue: campaign.budget.daily * 15,
          currentValue: campaign.budget.spent,
          metrics: { daysRunning: daysSinceStart },
          actions: [{ label: "Create lookalike audience", api: "audiences/create", params: { name: `${campaign.name} Lookalike`, type: "lookalike", sourceCampaign: campaign._id } }],
          applied: false, dismissed: false,
        });
      }

      if (campaign.goal?.toLowerCase().includes("webinar") || campaign.goal?.toLowerCase().includes("signup")) {
        suggestions.push({
          id: `landing_${campaign._id}`,
          type: "landing_page",
          campaignId: campaign._id,
          campaignName: campaign.name,
          title: "A/B Test Landing Pages",
          description: "Campaign focused on conversions. A/B testing landing pages can improve conversion rates by 20-40%.",
          impact: "high",
          effort: "medium",
          confidence: 80,
          potentialValue: campaign.budget.lifetime * 0.1,
          currentValue: 0,
          actions: [{ label: "Create A/B test", api: "ab-testing/create", params: { campaignId: campaign._id, type: "landing_page", name: `${campaign.name} LP Test` } }],
          applied: false, dismissed: false,
        });
      }
    }

    const activeCampaigns = campaigns.filter((c: any) => c.status === "active");
    if (activeCampaigns.length >= 2) {
      const totalBudget = activeCampaigns.reduce((s: number, c: any) => s + (c.budget?.daily || 0), 0);
      const totalSpent = activeCampaigns.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0);
      const avgSpendRatio = totalSpent / (totalBudget * 30 || 1);
      if (avgSpendRatio < 0.5) {
        suggestions.push({
          id: `consolidate_budget`,
          type: "budget_reallocation",
          campaignId: "all",
          campaignName: "Portfolio-Wide",
          title: "Consolidate Underperforming Budgets",
          description: `Across ${activeCampaigns.length} active campaigns, only ${(avgSpendRatio * 100).toFixed(0)}% of allocated budget is being spent. Consolidate into top performers.`,
          impact: "high",
          effort: "hard",
          confidence: 60,
          potentialValue: totalBudget * 30 * 0.2,
          currentValue: totalSpent,
          metrics: { activeCampaigns: activeCampaigns.length, totalBudget: totalBudget * 30, totalSpent },
          actions: [{ label: "Analyze portfolio", api: "optimizer/portfolio", params: { tenantId } }],
          applied: false, dismissed: false,
        });
      }
    }

    return suggestions;
  }

  getDashboard(tenantId: string) {
    const suggestions = this.generateOptimizations(tenantId);
    const byImpact = { high: suggestions.filter(s => s.impact === "high" && !s.applied && !s.dismissed).length,
      medium: suggestions.filter(s => s.impact === "medium" && !s.applied && !s.dismissed).length,
      low: suggestions.filter(s => s.impact === "low" && !s.applied && !s.dismissed).length };
    const totalPotentialValue = suggestions.filter(s => !s.applied && !s.dismissed).reduce((sum, s) => sum + s.potentialValue, 0);
    return { suggestions, counts: byImpact, totalPotentialValue, totalOpen: byImpact.high + byImpact.medium + byImpact.low };
  }
}

export const campaignOptimizerService = new CampaignOptimizerService();
