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

interface QuickOptimizationResult {
  applied: boolean;
  suggestionId: string;
  action: string;
  result: string;
  estimatedValue: number;
  executionTime: string;
}

interface BatchApplyResult {
  totalAttempted: number;
  succeeded: number;
  failed: number;
  totalPotentialValue: number;
  details: { suggestionId: string; status: string; message: string }[];
}

interface ScheduledOptimization {
  id: string;
  tenantId: string;
  suggestionId: string;
  campaignId: string;
  action: string;
  scheduledAt: string;
  applyAt: string;
  status: "pending" | "executed" | "cancelled";
  result?: string;
}

interface OptimizationQuickFix {
  campaignId: string;
  campaignName: string;
  issue: string;
  oneClickAction: string;
  expectedImprovement: string;
  confidence: number;
  parameters: Record<string, unknown>;
}

interface OptimizationPortfolioSummary {
  tenantId: string;
  totalSuggestions: number;
  highImpact: number;
  totalPotentialValue: number;
  avgConfidence: number;
  topCampaigns: { campaignId: string; campaignName: string; suggestions: number; topImpact: string }[];
  quickWins: number;
  recommendedActions: string[];
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

    // Score all suggestions with multi-dimensional opportunity scoring
    return this.scoreOpportunities(suggestions, campaigns);
  }

  // ─── Multi-Dimensional Opportunity Scoring ──────────────────────────

  /**
   * Score each optimization opportunity across 4 dimensions:
   *  - Impact magnitude (potential value / spend)
   *  - Confidence (data support level)
   *  - Urgency (time sensitivity)
   *  - Effort (inverse — low effort = higher score)
   */
  scoreOpportunities(suggestions: OptimizationSuggestion[], campaigns: any[]): OptimizationSuggestion[] {
    const maxPotential = Math.max(1, ...suggestions.map((s) => s.potentialValue));
    return suggestions.map((s) => {
      const impactScore = s.potentialValue / maxPotential;

      const confidenceMap: Record<string, number> = { high: 1.0, medium: 0.6, low: 0.3 };
      const confidenceScore = confidenceMap[s.impact] || 0.5;

      const effortMap: Record<string, number> = { easy: 1.0, medium: 0.5, hard: 0.2 };
      const effortScore = effortMap[s.effort] || 0.5;

      // Composite opportunity score (0-100)
      const opportunityScore = Math.round(
        (impactScore * 0.35 + confidenceScore * 0.25 + (s.confidence / 100) * 0.25 + effortScore * 0.15) * 100
      );

      return { ...s, _opportunityScore: opportunityScore };
    }).sort((a, b) => (b as any)._opportunityScore - (a as any)._opportunityScore);
  }

  // ─── Platform Optimization Scoring ──────────────────────────────────

  /**
   * Score which platform to prioritize for budget allocation based on
   * campaign goals, historical performance, and platform-specific strengths.
   */
  platformOptimizationScore(
    platform: string,
    campaignGoal: string,
    historicalRoas: number,
    audienceSize: number,
    budgetTier: string,
  ): {
    platform: string; score: number; strengths: string[]; weaknesses: string[]; recommendation: string;
  } {
    const platformProfiles: Record<string, { strengths: string[]; weaknesses: string[]; goalFit: Record<string, number>; budgetTiers: Record<string, number> }> = {
      meta: {
        strengths: ["precise audience targeting", "visual storytelling", "retargeting"],
        weaknesses: ["rising CPM costs", "iOS attribution challenges"],
        goalFit: { brand: 0.9, conversions: 0.85, leads: 0.7, engagement: 0.95, sales: 0.8 },
        budgetTiers: { low: 0.7, medium: 0.85, high: 0.9 },
      },
      google: {
        strengths: ["high-intent search traffic", "broad reach", "measurable ROI"],
        weaknesses: ["competitive keywords", "complex setup"],
        goalFit: { brand: 0.6, conversions: 0.95, leads: 0.9, engagement: 0.5, sales: 0.95 },
        budgetTiers: { low: 0.6, medium: 0.8, high: 0.95 },
      },
      linkedin: {
        strengths: ["B2B targeting", "professional audience", "high-quality leads"],
        weaknesses: ["high CPC", "smaller audience scale"],
        goalFit: { brand: 0.7, conversions: 0.5, leads: 0.95, engagement: 0.6, sales: 0.5 },
        budgetTiers: { low: 0.5, medium: 0.7, high: 0.85 },
      },
      tiktok: {
        strengths: ["high engagement rates", "viral potential", "young audience"],
        weaknesses: ["less mature ad platform", "limited B2B capability"],
        goalFit: { brand: 0.95, conversions: 0.6, leads: 0.3, engagement: 0.95, sales: 0.5 },
        budgetTiers: { low: 0.8, medium: 0.75, high: 0.7 },
      },
    };

    const profile = platformProfiles[platform];
    if (!profile) {
      return { platform, score: 0.5, strengths: [], weaknesses: [], recommendation: "Unknown platform — proceed with testing budget." };
    }

    // Compute score: goal fit + budget tier + ROAS signal
    const goalKey = this.normalizeGoal(campaignGoal);
    const goalFit = profile.goalFit[goalKey] || 0.5;
    const budgetFit = profile.budgetTiers[budgetTier] || 0.7;
    const roasSignal = Math.min(1, Math.max(0, (historicalRoas - 1) / 4));

    const score = Math.round((goalFit * 0.4 + budgetFit * 0.3 + roasSignal * 0.3) * 100) / 100;

    const recommendation = score >= 0.8
      ? `${platform} is strongly aligned with your ${campaignGoal} campaign. Allocate primary budget here.`
      : score >= 0.6
        ? `${platform} is a viable option for ${campaignGoal}. Consider allocating a portion of budget for testing.`
        : `${platform} has weak alignment with ${campaignGoal}. Only use if other channels are exhausted.`;

    return { platform, score, strengths: profile.strengths, weaknesses: profile.weaknesses, recommendation };
  }

  // ─── Diminishing Returns Estimation ─────────────────────────────────

  /**
   * Fit a power-law curve: conversions = a * spend^b where b < 1 means diminishing returns.
   * Uses log-log regression.
   */
  estimateDiminishingReturns(
    dataPoints: { spend: number; conversions: number }[],
  ): { a: number; b: number; rSquared: number; saturationSpend: number; interpretation: string } {
    if (dataPoints.length < 3) {
      return { a: 1, b: 0.7, rSquared: 0, saturationSpend: dataPoints[dataPoints.length - 1]?.spend || 0, interpretation: "Insufficient data. Defaulting to moderate diminishing returns (b=0.7)." };
    }

    const n = dataPoints.length;
    const logX = dataPoints.map((d) => Math.log(Math.max(d.spend, 0.01)));
    const logY = dataPoints.map((d) => Math.log(Math.max(d.conversions, 0.01)));
    const mx = logX.reduce((s, v) => s + v, 0) / n;
    const my = logY.reduce((s, v) => s + v, 0) / n;

    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (logX[i] - mx) * (logY[i] - my);
      den += (logX[i] - mx) ** 2;
    }

    const b = den > 0 ? num / den : 0.7;
    const a = Math.exp(my - b * mx);

    // R-squared
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
      const pred = a * Math.pow(dataPoints[i].spend, b);
      ssRes += (dataPoints[i].conversions - pred) ** 2;
      ssTot += (dataPoints[i].conversions - my) ** 2;
    }
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    // Saturation spend: point where marginal conversion < 0.1
    const saturationSpend = b > 0 && b < 1 ? Math.pow(0.1 / (a * b), 1 / (b - 1)) : dataPoints[n - 1]?.spend || 0;

    const interpretation = b >= 0.9
      ? "Near-linear returns. Aggressive scaling is justified."
      : b >= 0.7
        ? "Moderate diminishing returns. Budget increases still yield meaningful conversions."
        : b >= 0.4
          ? "Strong diminishing returns. Focus on efficiency over scale."
          : "Severe saturation. Further spend increases are unlikely to generate meaningful conversions.";

    return {
      a: Math.round(a * 100) / 100,
      b: Math.round(b * 1000) / 1000,
      rSquared: Math.round(rSquared * 100) / 100,
      saturationSpend: Math.round(saturationSpend),
      interpretation,
    };
  }

  // ─── Optimal Timing ─────────────────────────────────────────────────

  /**
   * Determine the best time-based optimization window based on
   * campaign data patterns.
   */
  optimalTiming(campaigns: any[]): {
    bestDayOfWeek: string; bestHourOfDay: number; windowScore: number;
    dayScores: { day: string; score: number }[];
    hourScores: { hour: number; score: number }[];
  } {
    // Simulated day-of-week and hour-of-day patterns
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayScores = days.map((day, i) => {
      // Weekdays peak Tue-Thu, weekends lower
      const base = i >= 1 && i <= 4 ? 0.8 : 0.5;
      const noise = Math.random() * 0.2;
      return { day, score: Math.round((base + noise) * 100) / 100 };
    });

    const hourScores = Array.from({ length: 24 }, (_, hour) => {
      // Business hours peak 9-17
      const base = hour >= 9 && hour <= 17 ? 0.85 : hour >= 18 && hour <= 22 ? 0.65 : 0.3;
      const noise = Math.random() * 0.15;
      return { hour, score: Math.round((base + noise) * 100) / 100 };
    });

    const bestDay = dayScores.reduce((best, d) => d.score > best.score ? d : best, dayScores[0]);
    const bestHour = hourScores.reduce((best, h) => h.score > best.score ? h : best, hourScores[0]);

    return {
      bestDayOfWeek: bestDay.day,
      bestHourOfDay: bestHour.hour,
      windowScore: Math.round((bestDay.score + bestHour.score) / 2 * 100) / 100,
      dayScores,
      hourScores,
    };
  }

  // ─── Conversion Probability Modeling ────────────────────────────────

  /**
   * Estimate conversion probability for a campaign based on current signals.
   * Uses logistic function: P = 1 / (1 + exp(-linear_combination)).
   */
  conversionProbability(campaign: any): {
    probability: number; score: number; factors: { name: string; value: number; impact: number }[];
  } {
    const factors: { name: string; value: number; impact: number }[] = [];
    let logit = 0;

    // Factor 1: CTR signal (higher = better)
    const ctr = campaign.metrics?.ctr || 0;
    const ctrScore = Math.min(2, ctr / 2);
    factors.push({ name: "CTR", value: ctr, impact: Math.round(ctrScore * 100) / 100 });
    logit += ctrScore * 0.3;

    // Factor 2: Budget utilization (optimal = 40-80%)
    const util = campaign.budget?.lifetime > 0 ? (campaign.budget.spent / campaign.budget.lifetime) * 100 : 50;
    const utilScore = util >= 40 && util <= 80 ? 1.5 : util < 40 ? 0.8 : 0.5;
    factors.push({ name: "Budget Utilization", value: Math.round(util), impact: utilScore });
    logit += utilScore * 0.2;

    // Factor 3: Platform diversity (more = better)
    const platformCount = (campaign.platforms || []).length;
    const platformScore = Math.min(1.5, platformCount * 0.5);
    factors.push({ name: "Platform Diversity", value: platformCount, impact: platformScore });
    logit += platformScore * 0.15;

    // Factor 4: Campaign maturity (sweet spot 14-60 days)
    const daysRunning = campaign.startDate
      ? Math.max(0, (Date.now() - new Date(campaign.startDate).getTime()) / 86400000)
      : 30;
    const maturityScore = daysRunning >= 14 && daysRunning <= 60 ? 2.0 : daysRunning > 60 ? 1.0 : 0.5;
    factors.push({ name: "Campaign Maturity", value: Math.round(daysRunning), impact: maturityScore });
    logit += maturityScore * 0.2;

    // Factor 5: ROAS trend
    const roas = campaign.metrics?.roas || 0;
    const roasScore = Math.min(2, roas / 2);
    factors.push({ name: "ROAS", value: roas, impact: Math.round(roasScore * 100) / 100 });
    logit += roasScore * 0.15;

    // Sigmoid
    const probability = 1 / (1 + Math.exp(-logit + 2));
    const score = Math.round(Math.min(100, Math.max(0, (probability - 0.1) * 125)));

    return {
      probability: Math.round(probability * 100) / 100,
      score,
      factors,
    };
  }

  getDashboard(tenantId: string) {
    const suggestions = this.generateOptimizations(tenantId);
    const byImpact = { high: suggestions.filter(s => s.impact === "high" && !s.applied && !s.dismissed).length,
      medium: suggestions.filter(s => s.impact === "medium" && !s.applied && !s.dismissed).length,
      low: suggestions.filter(s => s.impact === "low" && !s.applied && !s.dismissed).length };
    const totalPotentialValue = suggestions.filter(s => !s.applied && !s.dismissed).reduce((sum, s) => sum + s.potentialValue, 0);
    return { suggestions, counts: byImpact, totalPotentialValue, totalOpen: byImpact.high + byImpact.medium + byImpact.low };
  }

  private normalizeGoal(goal: string): string {
    const g = goal.toLowerCase();
    if (g.includes("brand") || g.includes("awareness")) return "brand";
    if (g.includes("conversion") || g.includes("purchase") || g.includes("sales")) return "conversions";
    if (g.includes("lead") || g.includes("signup") || g.includes("form")) return "leads";
    if (g.includes("engage") || g.includes("interaction")) return "engagement";
    return "conversions";
  }

  quickOptimizationActions(tenantId: string): QuickOptimizationResult[] {
    const suggestions = this.generateOptimizations(tenantId);
    const top = suggestions.filter(s => !s.applied && !s.dismissed).slice(0, 3);
    return top.map(s => ({
      applied: true,
      suggestionId: s.id,
      action: s.actions[0]?.label || "No action available",
      result: `Applied: ${s.title}`,
      estimatedValue: Math.round(s.potentialValue),
      executionTime: s.effort === "easy" ? "5 min" : s.effort === "medium" ? "15 min" : "30 min",
    }));
  }

  autoApplyHighConfidence(tenantId: string, minConfidence: number = 85): BatchApplyResult {
    const suggestions = this.generateOptimizations(tenantId);
    const eligible = suggestions.filter(s => !s.applied && !s.dismissed && s.confidence >= minConfidence && s.effort === "easy");
    const details: BatchApplyResult["details"] = [];
    let succeeded = 0, failed = 0, totalValue = 0;
    for (const s of eligible) {
      const store = DataStore["mem"]();
      const existing = store.findOne("optimization_suggestions", (x: any) => x.id === s.id);
      if (existing) {
        store.update("optimization_suggestions", (x: any) => x.id === s.id, { applied: true, appliedAt: new Date().toISOString() });
      }
      succeeded++;
      totalValue += s.potentialValue;
      details.push({ suggestionId: s.id, status: "applied", message: `Auto-applied: ${s.title}` });
    }
    return { totalAttempted: eligible.length, succeeded, failed, totalPotentialValue: Math.round(totalValue), details };
  }

  dismissLowValueSuggestions(tenantId: string, maxImpact: "low" | "medium" = "low"): { dismissed: number; suggestionIds: string[] } {
    const suggestions = this.generateOptimizations(tenantId);
    const toDismiss = suggestions.filter(s => !s.applied && !s.dismissed && (s.impact === maxImpact || (maxImpact === "low" && s.impact === "low")));
    const store = DataStore["mem"]();
    let dismissed = 0;
    const ids: string[] = [];
    for (const s of toDismiss) {
      const existing = store.findOne("optimization_suggestions", (x: any) => x.id === s.id);
      if (existing) {
        store.update("optimization_suggestions", (x: any) => x.id === s.id, { dismissed: true, dismissedAt: new Date().toISOString() });
      }
      dismissed++;
      ids.push(s.id);
    }
    return { dismissed, suggestionIds: ids };
  }

  oneClickFix(tenantId: string): OptimizationQuickFix | null {
    const suggestions = this.generateOptimizations(tenantId);
    const critical = suggestions.filter(s => !s.applied && !s.dismissed && s.impact === "high" && s.effort === "easy");
    if (critical.length === 0) return null;
    const top = critical[0];
    return {
      campaignId: top.campaignId,
      campaignName: top.campaignName,
      issue: top.title,
      oneClickAction: top.actions[0]?.label || "Apply optimization",
      expectedImprovement: `$${Math.round(top.potentialValue)} potential value`,
      confidence: top.confidence,
      parameters: top.actions[0]?.params || {},
    };
  }

  optimizationPortfolioSummary(tenantId: string): OptimizationPortfolioSummary {
    const suggestions = this.generateOptimizations(tenantId);
    const open = suggestions.filter(s => !s.applied && !s.dismissed);
    const byCampaign = new Map<string, { name: string; count: number; topImpact: string }>();
    for (const s of open) {
      const existing = byCampaign.get(s.campaignId) || { name: s.campaignName, count: 0, topImpact: "low" };
      existing.count++;
      const impactOrder = ["high", "medium", "low"];
      if (impactOrder.indexOf(s.impact) < impactOrder.indexOf(existing.topImpact)) existing.topImpact = s.impact;
      byCampaign.set(s.campaignId, existing);
    }
    const quickWins = open.filter(s => s.effort === "easy").length;
    const avgConf = open.length > 0 ? Math.round(open.reduce((s, x) => s + x.confidence, 0) / open.length) : 0;
    const totalVal = open.reduce((s, x) => s + x.potentialValue, 0);
    const recs: string[] = [];
    if (open.filter(s => s.impact === "high").length > 3) recs.push("Focus on high-impact items first — batch apply top 3");
    if (quickWins > 5) recs.push(`${quickWins} quick wins available — auto-apply with confidence > 80%`);
    if (avgConf > 75) recs.push("High average confidence — consider auto-apply for easy items");
    if (totalVal > 10000) recs.push(`$${Math.round(totalVal)} in potential value at stake — prioritize weekly review`);
    return {
      tenantId, totalSuggestions: open.length, highImpact: open.filter(s => s.impact === "high").length,
      totalPotentialValue: Math.round(totalVal), avgConfidence: avgConf,
      topCampaigns: [...byCampaign.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5).map(([id, info]) => ({ campaignId: id, campaignName: info.name, suggestions: info.count, topImpact: info.topImpact })),
      quickWins, recommendedActions: recs,
    };
  }

  scheduleOptimization(tenantId: string, suggestionId: string, applyAt: string): ScheduledOptimization {
    const store = DataStore["mem"]();
    const id = `sched_opt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const sched: ScheduledOptimization = {
      id, tenantId, suggestionId, campaignId: "", action: "",
      scheduledAt: new Date().toISOString(), applyAt, status: "pending",
    };
    store.insert("scheduled_optimizations", sched);
    return sched;
  }
}
