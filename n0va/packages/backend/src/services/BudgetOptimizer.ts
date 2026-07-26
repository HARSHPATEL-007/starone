interface CampaignPerformance {
  id: string;
  name: string;
  platform: string;
  dailyBudget: number;
  lifetimeBudget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpc: number;
  ctr: number;
  status: string;
}

interface BudgetRecommendation {
  campaignId: string;
  campaignName: string;
  platform: string;
  currentDaily: number;
  recommendedDaily: number;
  currentLifetime: number;
  recommendedLifetime: number;
  changePercent: number;
  reasoning: string;
  expectedImpact: {
    roasChange: string;
    conversionChange: string;
    confidence: "low" | "medium" | "high";
  };
  urgency: "low" | "medium" | "high" | "critical";
}

interface BudgetAllocationPlan {
  recommendations: BudgetRecommendation[];
  totalCurrentBudget: number;
  totalRecommendedBudget: number;
  totalChangePercent: number;
  expectedPortfolioRoas: number;
  strategy: "aggressive" | "balanced" | "conservative";
}

export class BudgetOptimizer {
  optimize(
    campaigns: CampaignPerformance[],
    strategy: "aggressive" | "balanced" | "conservative" = "balanced"
  ): BudgetAllocationPlan {
    const recommendations: BudgetRecommendation[] = [];
    let totalCurrent = 0;
    let totalRecommended = 0;

    const thresholds = {
      aggressive: { roasTarget: 2.0, maxShift: 50, minCtr: 1.5 },
      balanced: { roasTarget: 2.5, maxShift: 30, minCtr: 2.0 },
      conservative: { roasTarget: 3.0, maxShift: 15, minCtr: 2.5 },
    };

    const config = thresholds[strategy];

    for (const campaign of campaigns) {
      if (campaign.status === "paused" || campaign.status === "archived") continue;
      totalCurrent += campaign.dailyBudget;

      let recommendation = this.evaluateCampaign(campaign, config);
      if (recommendation) {
        recommendations.push(recommendation);
        totalRecommended += recommendation.recommendedDaily;
      } else {
        totalRecommended += campaign.dailyBudget;
      }
    }

    const expectedPortfolioRoas = this.calculateExpectedRoas(campaigns, recommendations);

    return {
      recommendations,
      totalCurrentBudget: totalCurrent,
      totalRecommendedBudget: totalRecommended,
      totalChangePercent: totalCurrent > 0 ? ((totalRecommended - totalCurrent) / totalCurrent) * 100 : 0,
      expectedPortfolioRoas,
      strategy,
    };
  }

  private evaluateCampaign(
    campaign: CampaignPerformance,
    config: { roasTarget: number; maxShift: number; minCtr: number }
  ): BudgetRecommendation | null {
    const meetsRoasTarget = campaign.roas >= config.roasTarget;
    const meetsCtrTarget = campaign.ctr >= config.minCtr;
    const budgetUtilization = campaign.lifetimeBudget > 0 ? (campaign.spent / campaign.lifetimeBudget) * 100 : 0;

    let recommendedDaily = campaign.dailyBudget;
    let changePercent = 0;
    let reasoning = "";
    let urgency: "low" | "medium" | "high" | "critical" = "low";
    let expectedRoasChange = "0%";
    let expectedConvChange = "0%";
    let confidence: "low" | "medium" | "high" = "medium";

    if (meetsRoasTarget && meetsCtrTarget && budgetUtilization < 80) {
      const increasePercent = Math.min(config.maxShift, 20);
      recommendedDaily = campaign.dailyBudget * (1 + increasePercent / 100);
      changePercent = increasePercent;
      reasoning = `Strong ROAS (${campaign.roas.toFixed(2)}x) and CTR (${campaign.ctr.toFixed(2)}%). Increasing budget to capture more conversions.`;
      expectedRoasChange = `-${(increasePercent * 0.1).toFixed(0)}%`;
      expectedConvChange = `+${increasePercent}%`;
      confidence = "high";
      urgency = "medium";
    } else if (meetsRoasTarget && !meetsCtrTarget) {
      const maintainPercent = 0;
      recommendedDaily = campaign.dailyBudget;
      reasoning = `Good ROAS (${campaign.roas.toFixed(2)}x) but CTR (${campaign.ctr.toFixed(2)}%) below threshold. Maintain budget while optimizing creative.`;
      expectedRoasChange = "0%";
      expectedConvChange = "0%";
      confidence = "medium";
      urgency = "low";
    } else if (!meetsRoasTarget && campaign.roas > 1.5) {
      const reductionPercent = Math.min(config.maxShift, 15);
      recommendedDaily = campaign.dailyBudget * (1 - reductionPercent / 100);
      changePercent = -reductionPercent;
      reasoning = `Below target ROAS (${campaign.roas.toFixed(2)}x). Reducing budget by ${reductionPercent}% to optimize spend efficiency.`;
      expectedRoasChange = `+${(reductionPercent * 0.15).toFixed(0)}%`;
      expectedConvChange = `-${(reductionPercent * 0.5).toFixed(0)}%`;
      confidence = "medium";
      urgency = "medium";
    } else if (campaign.roas <= 1.0 || campaign.roas <= 1.5 && budgetUtilization > 90) {
      const reductionPercent = Math.min(config.maxShift, 40);
      recommendedDaily = campaign.dailyBudget * (1 - reductionPercent / 100);
      changePercent = -reductionPercent;
      reasoning = `Poor ROAS (${campaign.roas.toFixed(2)}x). Significantly reducing budget or pausing. Consider pausing campaign.`;
      expectedRoasChange = `+${(reductionPercent * 0.2).toFixed(0)}%`;
      expectedConvChange = `-${reductionPercent}%`;
      confidence = "high";
      urgency = "high";

      if (campaign.roas < 0.5) {
        recommendedDaily = 0;
        changePercent = -100;
        reasoning = `Critical ROAS (${campaign.roas.toFixed(2)}x). Recommend pausing immediately.`;
        urgency = "critical";
      }
    }

    if (recommendedDaily === campaign.dailyBudget) return null;

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      platform: campaign.platform,
      currentDaily: campaign.dailyBudget,
      recommendedDaily: Math.round(recommendedDaily),
      currentLifetime: campaign.lifetimeBudget,
      recommendedLifetime: Math.round(campaign.lifetimeBudget * (recommendedDaily / campaign.dailyBudget)),
      changePercent: Math.round(changePercent),
      reasoning,
      expectedImpact: {
        roasChange: expectedRoasChange,
        conversionChange: expectedConvChange,
        confidence,
      },
      urgency,
    };
  }

  private calculateExpectedRoas(
    campaigns: CampaignPerformance[],
    recommendations: BudgetRecommendation[]
  ): number {
    const active = campaigns.filter((c) => c.status === "active");
    if (active.length === 0) return 0;

    const totalRevenue = active.reduce((s, c) => s + c.revenue, 0);
    const adjustedSpend = active.reduce((s, c) => {
      const rec = recommendations.find((r) => r.campaignId === c.id);
      const newBudget = rec ? rec.recommendedDaily : c.dailyBudget;
      const utilizationRatio = c.lifetimeBudget > 0 ? c.spent / c.lifetimeBudget : 0.5;
      return s + newBudget * utilizationRatio;
    }, 0);

    return adjustedSpend > 0 ? totalRevenue / adjustedSpend : 0;
  }

  // ─── Marginal Efficiency Frontier ────────────────────────────────────

  /**
   * Compute the marginal efficiency frontier for a set of campaigns.
   * Models the relationship between additional spend and expected incremental return
   * using a power-law decay: marginalROAS = baseROAS * (spend_ratio)^(-elasticity).
   */
  marginalEfficiencyFrontier(
    campaigns: CampaignPerformance[],
    elasticity = 0.3,
  ): {
    campaignId: string; campaignName: string; currentSpend: number; currentRoas: number;
    marginalRoas: number; efficiencyRank: number; optimalSpend: number;
    points: { spend: number; expectedRoas: number; expectedReturn: number }[];
  }[] {
    return campaigns
      .filter((c) => c.status === "active" && c.roas > 0)
      .map((c) => {
        const spendRange = Array.from({ length: 20 }, (_, i) => c.dailyBudget * (0.25 + i * 0.075));
        const points = spendRange.map((spend) => {
          const ratio = spend / Math.max(c.dailyBudget, 1);
          const marginalRoas = c.roas * Math.pow(ratio, -elasticity);
          const expectedReturn = spend * marginalRoas;
          return { spend: Math.round(spend), expectedRoas: Math.round(marginalRoas * 100) / 100, expectedReturn: Math.round(expectedReturn) };
        });

        // Optimal spend is where marginal ROAS = 1.0 (breakeven)
        const optimalPoint = points.find((p) => p.expectedRoas <= 1.0) || points[points.length - 1];
        const marginalRoas = c.roas * Math.pow(1.1, -elasticity); // +10% spend marginal

        return {
          campaignId: c.id,
          campaignName: c.name,
          currentSpend: c.dailyBudget,
          currentRoas: c.roas,
          marginalRoas: Math.round(marginalRoas * 100) / 100,
          efficiencyRank: 0,
          optimalSpend: optimalPoint.spend,
          points,
        };
      })
      .sort((a, b) => b.marginalRoas - a.marginalRoas)
      .map((item, idx) => ({ ...item, efficiencyRank: idx + 1 }));
  }

  // ─── Budget Elasticity ──────────────────────────────────────────────

  /**
   * Estimate budget elasticity for each campaign: the % change in conversions
   * for a 1% change in budget. Uses the relationship:
   * elasticity = ln(conv_ratio) / ln(spend_ratio)  (estimated from historical)
   */
  budgetElasticity(campaigns: CampaignPerformance[]): {
    campaignId: string; campaignName: string; elasticity: number;
    returnsToScale: "increasing" | "constant" | "diminishing";
    saturationPoint: number;
  }[] {
    return campaigns
      .filter((c) => c.status === "active" && c.spent > 0 && c.conversions > 0)
      .map((c) => {
        // Estimate from current data: implied elasticity = ln(conv/cost) trend
        // Simplified: use conversion rate as a proxy
        const cvr = c.clicks > 0 ? c.conversions / c.clicks : 0;
        const cpcEfficiency = c.cpc > 0 ? 1 / c.cpc : 0;
        // Elasticity = base (0.6) adjusted by efficiency signals
        const baseElasticity = 0.6;
        const efficiencyFactor = Math.min(0.3, Math.max(-0.3, (cvr - 0.05) * 2));
        const elasticity = Math.max(0.1, Math.min(1.0, baseElasticity + efficiencyFactor));

        const returnsToScale: "increasing" | "constant" | "diminishing" =
          elasticity > 0.8 ? "increasing" : elasticity > 0.4 ? "constant" : "diminishing";

        // Saturation point: spend level where marginal return drops to 20% of initial
        const saturationPoint = Math.round(c.dailyBudget * (1 / Math.max(0.2, 1 - elasticity)));

        return {
          campaignId: c.id,
          campaignName: c.name,
          elasticity: Math.round(elasticity * 100) / 100,
          returnsToScale,
          saturationPoint,
        };
      });
  }

  // ─── Dynamic Maturity-Adjusted Thresholds ───────────────────────────

  /**
   * Adjust optimization thresholds based on campaign maturity (days running).
   * Early campaigns get looser thresholds, mature campaigns get tighter.
   */
  maturityAdjustedThresholds(
    campaigns: CampaignPerformance[],
  ): {
    campaignId: string; campaignName: string; daysRunning: number; maturityPhase: "learning" | "growth" | "mature" | "declining";
    adjustedRoasTarget: number; adjustedMinCtr: number; confidenceMultiplier: number; recommendation: string;
  }[] {
    return campaigns.map((c) => {
      const daysRunning = c.lifetimeBudget > 0 && c.dailyBudget > 0
        ? Math.round(c.spent / c.dailyBudget)
        : 14;
      let maturityPhase: "learning" | "growth" | "mature" | "declining";
      let roasMultiplier: number;
      let ctrMultiplier: number;
      let confidenceMultiplier: number;

      if (daysRunning < 7) {
        maturityPhase = "learning";
        roasMultiplier = 0.6; // Accept lower ROAS during learning
        ctrMultiplier = 0.7;
        confidenceMultiplier = 0.5;
      } else if (daysRunning < 30) {
        maturityPhase = "growth";
        roasMultiplier = 0.85;
        ctrMultiplier = 0.85;
        confidenceMultiplier = 0.75;
      } else if (daysRunning < 90) {
        maturityPhase = "mature";
        roasMultiplier = 1.0;
        ctrMultiplier = 1.0;
        confidenceMultiplier = 1.0;
      } else {
        maturityPhase = "declining";
        roasMultiplier = 1.15; // Need higher ROAS for declining campaigns
        ctrMultiplier = 1.1;
        confidenceMultiplier = 1.2;
      }

      const baseRoas = 2.5;
      const adjustedRoasTarget = Math.round(baseRoas * roasMultiplier * 100) / 100;
      const adjustedMinCtr = Math.round(2.0 * ctrMultiplier * 100) / 100;

      const recommendation = maturityPhase === "learning"
        ? "Allow budget for learning phase; avoid aggressive cuts before day 7."
        : maturityPhase === "growth"
          ? "Monitor closely; consider incremental increases if KPIs trending positively."
          : maturityPhase === "mature"
            ? "Apply standard optimization thresholds; look for scaling opportunities."
            : "Consider refreshing campaign or transitioning budget to newer campaigns.";

      return {
        campaignId: c.id,
        campaignName: c.name,
        daysRunning,
        maturityPhase,
        adjustedRoasTarget,
        adjustedMinCtr,
        confidenceMultiplier: Math.round(confidenceMultiplier * 100) / 100,
        recommendation,
      };
    });
  }

  // ─── Multi-Period Optimization ──────────────────────────────────────

  /**
   * Allocate budget across time periods (e.g., weeks) within a campaign's remaining duration.
   * Uses front-loading or smoothing strategies based on ROAS pattern.
   */
  multiPeriodAllocation(
    campaign: CampaignPerformance,
    remainingDays: number,
    periods: number = 4,
    strategy: "even" | "front_load" | "back_load" | "roas_weighted" = "roas_weighted",
  ): { period: number; days: number; allocation: number; expectedSpend: number; note: string }[] {
    const totalRemaining = campaign.lifetimeBudget - campaign.spent;
    const daysPerPeriod = remainingDays / periods;
    const baseAllocation = totalRemaining / periods;

    if (strategy === "even") {
      return Array.from({ length: periods }, (_, i) => ({
        period: i + 1,
        days: Math.round(daysPerPeriod),
        allocation: Math.round(baseAllocation),
        expectedSpend: Math.round(baseAllocation),
        note: "Even distribution",
      }));
    }

    // ROAS-weighted: allocate more to periods with higher expected ROAS
    // (simulate declining ROAS over time: roas_t = baseROAS * exp(-0.1 * t))
    const weights = Array.from({ length: periods }, (_, i) => {
      if (strategy === "front_load") return periods - i;
      if (strategy === "back_load") return i + 1;
      return Math.exp(-0.1 * i); // roas_weighted
    });
    const totalWeight = weights.reduce((s, w) => s + w, 0);

    return weights.map((w, i) => ({
      period: i + 1,
      days: Math.round(daysPerPeriod),
      allocation: Math.round((w / totalWeight) * totalRemaining),
      expectedSpend: Math.round((w / totalWeight) * totalRemaining * (1 - 0.05 * i)),
      note: strategy === "front_load" && i === 0 ? "Front-loaded for rapid testing" :
            strategy === "back_load" && i === periods - 1 ? "Back-loaded for optimized delivery" :
            strategy === "roas_weighted" ? `ROAS weight: ${Math.round(w * 100)}%` : "Even split",
    }));
  }

  generateMockCampaigns(): CampaignPerformance[] {
    return [
      { id: "c1", name: "Q3 Enterprise SaaS Push", platform: "meta", dailyBudget: 5000, lifetimeBudget: 150000, spent: 45200, impressions: 245000, clicks: 4200, conversions: 89, revenue: 125000, roas: 2.76, cpc: 2.38, ctr: 1.71, status: "active" },
      { id: "c2", name: "Brand Awareness", platform: "google", dailyBudget: 3000, lifetimeBudget: 90000, spent: 28100, impressions: 189000, clicks: 3100, conversions: 45, revenue: 68000, roas: 2.42, cpc: 3.10, ctr: 1.64, status: "active" },
      { id: "c3", name: "Retargeting - Cart", platform: "meta", dailyBudget: 1500, lifetimeBudget: 45000, spent: 12300, impressions: 89000, clicks: 1900, conversions: 67, revenue: 42000, roas: 3.41, cpc: 1.83, ctr: 2.13, status: "active" },
      { id: "c4", name: "Prospecting APAC", platform: "linkedin", dailyBudget: 2000, lifetimeBudget: 60000, spent: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, roas: 0, cpc: 0, ctr: 0, status: "draft" },
      { id: "c5", name: "Holiday Flash Sale", platform: "tiktok", dailyBudget: 8000, lifetimeBudget: 80000, spent: 32000, impressions: 156000, clicks: 2800, conversions: 34, revenue: 24000, roas: 0.75, cpc: 4.57, ctr: 1.79, status: "paused" },
      { id: "c6", name: "LinkedIn TL", platform: "linkedin", dailyBudget: 2500, lifetimeBudget: 75000, spent: 18900, impressions: 67000, clicks: 890, conversions: 23, revenue: 52000, roas: 2.75, cpc: 5.62, ctr: 1.33, status: "active" },
      { id: "c7", name: "Webinar Signups", platform: "google", dailyBudget: 1000, lifetimeBudget: 30000, spent: 8400, impressions: 45000, clicks: 1200, conversions: 78, revenue: 19500, roas: 2.32, cpc: 1.08, ctr: 2.67, status: "active" },
    ];
  }
}

export const budgetOptimizer = new BudgetOptimizer();
