interface CampaignReturnCurve {
  campaignId: string;
  name: string;
  currentBudget: number;
  currentConversions: number;
  currentRevenue: number;
  alpha: number;
  beta: number;
}

interface AllocationInput {
  totalBudget: number;
  campaigns: {
    campaignId: string;
    name: string;
    currentBudget: number;
    currentConversions: number;
    currentRevenue: number;
    minBudget?: number;
    maxBudget?: number;
    history?: { spend: number; conversions: number }[];
  }[];
  objective?: "conversions" | "revenue";
}

interface AllocationResult {
  totalBudget: number;
  objective: string;
  allocations: {
    campaignId: string;
    name: string;
    currentBudget: number;
    allocatedBudget: number;
    delta: number;
    deltaPercent: number;
    expectedConversions: number;
    expectedRevenue: number;
    marginalROI: number;
    efficiency: number;
    constraint: "active" | "min_bound" | "max_bound" | "none";
  }[];
  summary: {
    totalExpectedConversions: number;
    totalExpectedRevenue: number;
    weightedAvgMarginalROI: number;
    reallocationIntensity: number;
    campaignsIncreased: number;
    campaignsDecreased: number;
    campaignsUnchanged: number;
    budgetUtilization: number;
  };
  iterations: number;
  converged: boolean;
}

export class PortfolioBudgetOptimizerService {
  /**
   * Portfolio-level budget allocation using convex optimization.
   * Models each campaign's conversion curve as y = alpha * x^beta (power law)
   * and solves the constrained maximization via Lagrangian dual + bisection.
   */
  allocate(input: AllocationInput): AllocationResult {
    const { totalBudget, campaigns, objective = "conversions" } = input;
    if (campaigns.length === 0) throw new Error("At least one campaign required");
    if (totalBudget <= 0) throw new Error("Total budget must be > 0");

    // Fit marginal return curves for each campaign
    const curves: CampaignReturnCurve[] = campaigns.map((c) => {
      const { alpha, beta } = this.fitPowerCurve(c);
      return {
        campaignId: c.campaignId,
        name: c.name,
        currentBudget: c.currentBudget,
        currentConversions: c.currentConversions,
        currentRevenue: c.currentRevenue,
        alpha,
        beta,
      };
    });

    const currentTotal = campaigns.reduce((s, c) => s + c.currentBudget, 0);
    const scale = totalBudget / Math.max(currentTotal, 1);

    // Solve via Lagrangian: allocate budget to equalize marginal returns
    // For y = alpha * x^beta, marginal = alpha * beta * x^(beta-1)
    // Set marginal_i = lambda for all i -> x_i = (lambda / (alpha_i * beta_i))^(1/(beta_i-1))
    // Bisect on lambda to find lambda* where sum x_i = totalBudget

    const allBetaGt1 = curves.every((c) => c.beta >= 1);
    const allBetaLt1 = curves.every((c) => c.beta <= 1);

    let lambdaLow = 0.001;
    let lambdaHigh = 1000;
    let allocations: { campaignId: string; name: string; currentBudget: number; allocatedBudget: number; delta: number; deltaPercent: number; expectedConversions: number; expectedRevenue: number; marginalROI: number; efficiency: number; constraint: "active" | "min_bound" | "max_bound" | "none" }[] = [];
    let converged = false;
    let iterations = 0;
    const maxIterations = 100;

    // For edge cases where curves don't allow equalization, fall back to proportional
    if ((allBetaGt1 && currentTotal > totalBudget) || (allBetaLt1 && currentTotal < totalBudget)) {
      // Proportional scaling
      allocations = curves.map((c) => {
        const rawAlloc = c.currentBudget * scale;
        const alloc = Math.max(rawAlloc, 0);
        const delta = alloc - c.currentBudget;
        const expectedConversions = this.predictConversions(c, alloc);
        const expectedRevenue = this.predictRevenue(c, alloc);
        const marginalROI = this.marginalReturn(c, alloc);
        const efficiency = alloc > 0 ? expectedConversions / alloc : 0;
        return {
          campaignId: c.campaignId, name: c.name, currentBudget: c.currentBudget,
          allocatedBudget: Math.round(alloc * 100) / 100,
          delta: Math.round(delta * 100) / 100,
          deltaPercent: Math.round((delta / Math.max(c.currentBudget, 0.01)) * 10000) / 100,
          expectedConversions: Math.round(expectedConversions),
          expectedRevenue: Math.round(expectedRevenue * 100) / 100,
          marginalROI: Math.round(marginalROI * 10000) / 10000,
          efficiency: Math.round(efficiency * 10000) / 10000,
          constraint: "none",
        };
      });
      converged = true;
    } else {
      // Bisect on lambda
      for (let iter = 0; iter < maxIterations; iter++) {
        iterations = iter + 1;
        const lambda = (lambdaLow + lambdaHigh) / 2;
        let totalAllocated = 0;
        const trial: typeof allocations = [];

        for (const c of curves) {
          const rawX = this.optimalBudget(c, lambda);
          const minB = campaigns.find((cc) => cc.campaignId === c.campaignId)?.minBudget ?? 0;
          const maxB = campaigns.find((cc) => cc.campaignId === c.campaignId)?.maxBudget ?? Infinity;
          const clampedX = Math.max(minB, Math.min(maxB, rawX));
          let constraint: "active" | "min_bound" | "max_bound" | "none" = "none";
          if (clampedX <= minB + 0.01) constraint = "min_bound";
          else if (clampedX >= maxB - 0.01) constraint = "max_bound";
          else constraint = "active";

          totalAllocated += clampedX;
          const delta = clampedX - c.currentBudget;
          const expectedConversions = this.predictConversions(c, clampedX);
          const expectedRevenue = this.predictRevenue(c, clampedX);
          const marginalROI = this.marginalReturn(c, clampedX);
          const efficiency = clampedX > 0 ? expectedConversions / clampedX : 0;

          trial.push({
            campaignId: c.campaignId, name: c.name,
            currentBudget: c.currentBudget,
            allocatedBudget: Math.round(clampedX * 100) / 100,
            delta: Math.round(delta * 100) / 100,
            deltaPercent: Math.round((delta / Math.max(c.currentBudget, 0.01)) * 10000) / 100,
            expectedConversions: Math.round(expectedConversions),
            expectedRevenue: Math.round(expectedRevenue * 100) / 100,
            marginalROI: Math.round(marginalROI * 10000) / 10000,
            efficiency: Math.round(efficiency * 10000) / 10000,
            constraint,
          });
        }

        const diff = totalAllocated - totalBudget;
        if (Math.abs(diff) < totalBudget * 0.001) {
          allocations = trial;
          converged = true;
          break;
        }
        if (diff > 0) lambdaHigh = lambda;
        else lambdaLow = lambda;
        allocations = trial;
      }
    }

    // Normalize to exactly match totalBudget
    const allocatedTotal = allocations.reduce((s, a) => s + a.allocatedBudget, 0);
    if (allocatedTotal !== totalBudget && allocatedTotal > 0) {
      const ratio = totalBudget / allocatedTotal;
      allocations = allocations.map((a) => {
        const adjusted = a.allocatedBudget * ratio;
        const delta = adjusted - a.currentBudget;
        const expectedConversions = this.predictConversions(
          curves.find((c) => c.campaignId === a.campaignId)!,
          adjusted,
        );
        const expectedRevenue = this.predictRevenue(
          curves.find((c) => c.campaignId === a.campaignId)!,
          adjusted,
        );
        return { ...a, allocatedBudget: Math.round(adjusted * 100) / 100, delta: Math.round(delta * 100) / 100, expectedConversions, expectedRevenue };
      });
    }

    const inc = allocations.filter((a) => a.delta > 0).length;
    const dec = allocations.filter((a) => a.delta < 0).length;
    const unc = allocations.filter((a) => Math.abs(a.delta) < 0.01).length;
    const totalExpectedConv = allocations.reduce((s, a) => s + a.expectedConversions, 0);
    const totalExpectedRev = allocations.reduce((s, a) => s + a.expectedRevenue, 0);
    const avgMarginal = allocations.reduce((s, a) => s + a.marginalROI, 0) / Math.max(allocations.length, 1);
    const absPctSum = allocations.reduce((s, a) => s + Math.abs(a.deltaPercent), 0);
    const reallocationIntensity = Math.round(Math.min(100, absPctSum / Math.max(allocations.length, 1) * 10) * 10) / 10;

    return {
      totalBudget,
      objective,
      allocations,
      summary: {
        totalExpectedConversions: Math.round(totalExpectedConv),
        totalExpectedRevenue: Math.round(totalExpectedRev * 100) / 100,
        weightedAvgMarginalROI: Math.round(avgMarginal * 10000) / 10000,
        reallocationIntensity,
        campaignsIncreased: inc,
        campaignsDecreased: dec,
        campaignsUnchanged: unc,
        budgetUtilization: Math.round((allocatedTotal / totalBudget) * 10000) / 100,
      },
      iterations,
      converged,
    };
  }

  /**
   * Fit power-law curve y = alpha * x^beta using linearized least squares.
   * log(y) = log(alpha) + beta * log(x)
   */
  private fitPowerCurve(campaign: AllocationInput["campaigns"][0]): { alpha: number; beta: number } {
    if (campaign.history && campaign.history.length >= 3) {
      const points = campaign.history.filter((p) => p.spend > 0 && p.conversions > 0);
      if (points.length >= 3) {
        const n = points.length;
        const logX = points.map((p) => Math.log(p.spend));
        const logY = points.map((p) => Math.log(p.conversions));
        const meanLogX = logX.reduce((a, b) => a + b, 0) / n;
        const meanLogY = logY.reduce((a, b) => a + b, 0) / n;
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) {
          num += (logX[i] - meanLogX) * (logY[i] - meanLogY);
          den += (logX[i] - meanLogX) ** 2;
        }
        const beta = den > 0 ? num / den : 0.5;
        const logAlpha = meanLogY - beta * meanLogX;
        const alpha = Math.exp(logAlpha);
        return { alpha: Math.max(alpha, 0.001), beta: Math.max(0.01, Math.min(0.99, beta)) };
      }
    }

    // Fallback: estimate from single data point using default elasticity
    const { currentBudget, currentConversions } = campaign;
    if (currentBudget > 0 && currentConversions > 0) {
      const convRate = currentConversions / currentBudget;
      const beta = 0.5;
      const alpha = currentConversions / (currentBudget ** beta);
      return { alpha: Math.max(alpha, 0.001), beta: 0.5 };
    }
    return { alpha: 0.1, beta: 0.5 };
  }

  private optimalBudget(curve: CampaignReturnCurve, lambda: number): number {
    // From marginal condition: alpha * beta * x^(beta-1) = lambda
    // x = (lambda / (alpha * beta))^(1/(beta-1))
    const effectiveBeta = Math.max(0.01, Math.min(0.99, curve.beta));
    const mb = curve.alpha * effectiveBeta;
    if (mb === 0) return 0;
    const ratio = lambda / mb;
    const exponent = 1 / (effectiveBeta - 1);
    const x = ratio ** exponent;
    return isFinite(x) ? Math.max(0, x) : 0;
  }

  private predictConversions(curve: CampaignReturnCurve, budget: number): number {
    return Math.max(0, curve.alpha * (budget ** curve.beta));
  }

  private predictRevenue(curve: CampaignReturnCurve, budget: number): number {
    const conversions = this.predictConversions(curve, budget);
    const avgOrderValue = curve.currentRevenue / Math.max(curve.currentConversions, 1);
    return conversions * avgOrderValue;
  }

  private marginalReturn(curve: CampaignReturnCurve, budget: number): number {
    if (budget <= 0) return 0;
    const effectiveBeta = Math.max(0.01, Math.min(0.99, curve.beta));
    return curve.alpha * effectiveBeta * (budget ** (effectiveBeta - 1));
  }

  /**
   * Computes the efficient frontier: allocation results for budget levels from 50% to 150%.
   */
  efficientFrontier(input: AllocationInput): { budgetLevel: number; totalBudget: number; totalConversions: number; totalRevenue: number; avgMarginalROI: number }[] {
    const baseBudget = input.totalBudget;
    const levels: number[] = [];
    for (let pct = 50; pct <= 150; pct += 10) {
      levels.push(pct);
    }
    return levels.map((pct) => {
      const result = this.allocate({ ...input, totalBudget: baseBudget * pct / 100 });
      return {
        budgetLevel: pct,
        totalBudget: Math.round(baseBudget * pct / 100 * 100) / 100,
        totalConversions: result.summary.totalExpectedConversions,
        totalRevenue: result.summary.totalExpectedRevenue,
        avgMarginalROI: result.summary.weightedAvgMarginalROI,
      };
    });
  }
}

export const portfolioBudgetOptimizerService = new PortfolioBudgetOptimizerService();
