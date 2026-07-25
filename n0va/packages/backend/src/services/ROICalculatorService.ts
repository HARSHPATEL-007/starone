export interface ROIInput {
  campaignName: string;
  totalSpend: number;
  totalRevenue: number;
  leadsGenerated: number;
  conversionRate: number;
  averageDealSize: number;
  platformFees: number;
  creativeCosts: number;
  laborCosts: number;
  timeframeDays: number;
}

export interface ROIResult {
  campaignName: string;
  roas: number;
  roi: number;
  netProfit: number;
  totalCost: number;
  totalRevenue: number;
  cpa: number;
  cpl: number;
  customersAcquired: number;
  paybackDays: number;
  profitMargin: number;
  isProfitable: boolean;
  breakdown: {
    revenue: number;
    adSpend: number;
    platformFees: number;
    creativeCosts: number;
    laborCosts: number;
    totalCosts: number;
    netProfit: number;
  };
}

export class ROICalculatorService {
  calculate(input: ROIInput): ROIResult {
    const totalAdCost = input.totalSpend + input.platformFees;
    const totalCosts = totalAdCost + input.creativeCosts + input.laborCosts;
    const netProfit = input.totalRevenue - totalCosts;

    const customersAcquired = Math.round(input.leadsGenerated * (input.conversionRate / 100));
    const cpa = customersAcquired > 0 ? totalCosts / customersAcquired : 0;
    const cpl = input.leadsGenerated > 0 ? totalCosts / input.leadsGenerated : 0;

    const roas = input.totalSpend > 0 ? input.totalRevenue / input.totalSpend : 0;
    const roi = totalCosts > 0 ? ((input.totalRevenue - totalCosts) / totalCosts) * 100 : 0;
    const profitMargin = input.totalRevenue > 0 ? (netProfit / input.totalRevenue) * 100 : 0;

    const dailyNet = input.timeframeDays > 0 ? netProfit / input.timeframeDays : 0;
    const paybackDays = dailyNet > 0 ? Math.round(totalCosts / dailyNet) : 0;

    return {
      campaignName: input.campaignName,
      roas: parseFloat(roas.toFixed(2)),
      roi: parseFloat(roi.toFixed(1)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      totalCost: parseFloat(totalCosts.toFixed(2)),
      totalRevenue: parseFloat(input.totalRevenue.toFixed(2)),
      cpa: parseFloat(cpa.toFixed(2)),
      cpl: parseFloat(cpl.toFixed(2)),
      customersAcquired,
      paybackDays,
      profitMargin: parseFloat(profitMargin.toFixed(1)),
      isProfitable: netProfit > 0,
      breakdown: {
        revenue: input.totalRevenue,
        adSpend: input.totalSpend,
        platformFees: input.platformFees,
        creativeCosts: input.creativeCosts,
        laborCosts: input.laborCosts,
        totalCosts,
        netProfit,
      },
    };
  }

  compare(inputs: ROIInput[]): ROIResult[] {
    return inputs.map((i) => this.calculate(i));
  }

  generateSample(input: Partial<ROIInput>): ROIResult {
    const defaults: ROIInput = {
      campaignName: "Q3 Campaign",
      totalSpend: 50000,
      totalRevenue: 150000,
      leadsGenerated: 1200,
      conversionRate: 5,
      averageDealSize: 2500,
      platformFees: 5000,
      creativeCosts: 10000,
      laborCosts: 15000,
      timeframeDays: 90,
      ...input,
    };
    return this.calculate(defaults);
  }

  generateComparisonScenarios(): ROIResult[] {
    return [
      this.calculate({
        campaignName: "Conservative",
        totalSpend: 30000,
        totalRevenue: 75000,
        leadsGenerated: 600,
        conversionRate: 4,
        averageDealSize: 2500,
        platformFees: 3000,
        creativeCosts: 5000,
        laborCosts: 10000,
        timeframeDays: 90,
      }),
      this.calculate({
        campaignName: "Balanced",
        totalSpend: 50000,
        totalRevenue: 150000,
        leadsGenerated: 1200,
        conversionRate: 5,
        averageDealSize: 2500,
        platformFees: 5000,
        creativeCosts: 10000,
        laborCosts: 15000,
        timeframeDays: 90,
      }),
      this.calculate({
        campaignName: "Aggressive",
        totalSpend: 100000,
        totalRevenue: 350000,
        leadsGenerated: 2500,
        conversionRate: 6,
        averageDealSize: 2800,
        platformFees: 10000,
        creativeCosts: 20000,
        laborCosts: 25000,
        timeframeDays: 90,
      }),
    ];
  }

  // ─── Monte Carlo Simulation ──────────────────────────────────────────

  /**
   * Run Monte Carlo simulation to estimate ROI range and probability.
   * Perturbs spend, revenue, leads, and conversion rate with normal noise.
   */
  monteCarlo(
    input: ROIInput,
    iterations = 1000,
    stdDevPct = 0.15,
  ): {
    meanRoi: number; medianRoi: number; stdRoi: number; minRoi: number; maxRoi: number;
    probabilityProfit: number; probabilityRoiAbove: number; percentile10: number; percentile90: number;
    roasMean: number; roasStd: number;
  } {
    const rois: number[] = [];
    const roases: number[] = [];
    let profitable = 0;
    let roiAboveTarget = 0;

    for (let i = 0; i < iterations; i++) {
      const sample = this.perturbInput(input, stdDevPct);
      const result = this.calculate(sample);
      rois.push(result.roi);
      roases.push(result.roas);
      if (result.isProfitable) profitable++;
      if (result.roi > 0) roiAboveTarget++;
    }

    rois.sort((a, b) => a - b);
    roases.sort((a, b) => a - b);

    const meanRoi = rois.reduce((s, v) => s + v, 0) / iterations;
    const variance = rois.reduce((s, v) => s + (v - meanRoi) ** 2, 0) / iterations;
    const stdRoi = Math.sqrt(variance);

    return {
      meanRoi: Math.round(meanRoi * 100) / 100,
      medianRoi: Math.round(rois[Math.floor(iterations / 2)] * 100) / 100,
      stdRoi: Math.round(stdRoi * 100) / 100,
      minRoi: Math.round(rois[0] * 100) / 100,
      maxRoi: Math.round(rois[iterations - 1] * 100) / 100,
      probabilityProfit: Math.round((profitable / iterations) * 10000) / 100,
      probabilityRoiAbove: Math.round((roiAboveTarget / iterations) * 10000) / 100,
      percentile10: Math.round(rois[Math.floor(iterations * 0.1)] * 100) / 100,
      percentile90: Math.round(rois[Math.floor(iterations * 0.9)] * 100) / 100,
      roasMean: Math.round(roases.reduce((s, v) => s + v, 0) / iterations * 100) / 100,
      roasStd: Math.round(Math.sqrt(roases.reduce((s, v) => s + (v - roases.reduce((ss, vv) => ss + vv, 0) / iterations) ** 2, 0) / iterations) * 100) / 100,
    };
  }

  private perturbInput(input: ROIInput, stdDevPct: number): ROIInput {
    const gaussian = (): number => {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    return {
      ...input,
      totalSpend: Math.max(1, input.totalSpend * (1 + gaussian() * stdDevPct)),
      totalRevenue: Math.max(0, input.totalRevenue * (1 + gaussian() * stdDevPct)),
      leadsGenerated: Math.max(1, Math.round(input.leadsGenerated * (1 + gaussian() * stdDevPct))),
      conversionRate: Math.max(0.1, input.conversionRate * (1 + gaussian() * stdDevPct * 0.5)),
    };
  }

  // ─── Sensitivity Analysis ────────────────────────────────────────────

  /**
   * Tornado-chart-style sensitivity: vary each input ±X% and measure ROI impact.
   */
  sensitivityAnalysis(
    input: ROIInput,
    variationPct = 20,
  ): {
    variable: string; baseValue: number; lowValue: number; highValue: number;
    lowRoi: number; highRoi: number; range: number; impact: "high" | "medium" | "low";
  }[] {
    const base = this.calculate(input);
    const variables: { key: keyof ROIInput; label: string }[] = [
      { key: "totalSpend", label: "Ad Spend" },
      { key: "totalRevenue", label: "Revenue" },
      { key: "leadsGenerated", label: "Leads" },
      { key: "conversionRate", label: "Conversion Rate" },
      { key: "averageDealSize", label: "Avg Deal Size" },
      { key: "platformFees", label: "Platform Fees" },
      { key: "creativeCosts", label: "Creative Costs" },
      { key: "laborCosts", label: "Labor Costs" },
    ];

    const results: { variable: string; baseValue: number; lowValue: number; highValue: number; lowRoi: number; highRoi: number; range: number; impact: "high" | "medium" | "low" }[] = [];
    const maxRange = Math.max(1, base.roi);

    for (const v of variables) {
      const baseVal = input[v.key] as number;
      if (typeof baseVal !== "number" || baseVal === 0) continue;

      const lowInput = { ...input, [v.key]: baseVal * (1 - variationPct / 100) };
      const highInput = { ...input, [v.key]: baseVal * (1 + variationPct / 100) };
      const lowResult = this.calculate(lowInput);
      const highResult = this.calculate(highInput);
      const range = Math.abs(lowResult.roi - highResult.roi);

      results.push({
        variable: v.label,
        baseValue: Math.round(baseVal * 100) / 100,
        lowValue: Math.round(baseVal * (1 - variationPct / 100) * 100) / 100,
        highValue: Math.round(baseVal * (1 + variationPct / 100) * 100) / 100,
        lowRoi: Math.round(lowResult.roi * 100) / 100,
        highRoi: Math.round(highResult.roi * 100) / 100,
        range: Math.round(range * 100) / 100,
        impact: range / maxRange > 0.3 ? "high" : range / maxRange > 0.1 ? "medium" : "low",
      });
    }

    return results.sort((a, b) => b.range - a.range);
  }

  // ─── Breakeven Analysis ──────────────────────────────────────────────

  /**
   * Compute the breakeven point: the minimum revenue needed for profitability.
   */
  breakeven(input: ROIInput): {
    breakevenRevenue: number;
    currentMargin: number;
    revenueDeficit: number;
    isProfitable: boolean;
    marginOfSafety: number;
    daysToBreakeven: number;
  } {
    const totalCosts = input.totalSpend + input.platformFees + input.creativeCosts + input.laborCosts;
    const breakevenRevenue = totalCosts;
    const currentMargin = input.totalRevenue > 0 ? ((input.totalRevenue - totalCosts) / input.totalRevenue) * 100 : 0;
    const revenueDeficit = Math.max(0, breakevenRevenue - input.totalRevenue);
    const isProfitable = input.totalRevenue > breakevenRevenue;
    const marginOfSafety = input.totalRevenue > 0 ? ((input.totalRevenue - breakevenRevenue) / input.totalRevenue) * 100 : 0;

    // Days to breakeven: if daily net > 0, how long to recover costs
    const dailyNet = input.timeframeDays > 0 ? (input.totalRevenue - totalCosts) / input.timeframeDays : 0;
    const daysToBreakeven = dailyNet > 0 ? Math.ceil(totalCosts / dailyNet) : input.timeframeDays;

    return {
      breakevenRevenue: Math.round(breakevenRevenue * 100) / 100,
      currentMargin: Math.round(currentMargin * 100) / 100,
      revenueDeficit: Math.round(revenueDeficit * 100) / 100,
      isProfitable,
      marginOfSafety: Math.round(marginOfSafety * 100) / 100,
      daysToBreakeven,
    };
  }

  // ─── Attribution-Weighted ROI ────────────────────────────────────────

  /**
   * Recalculate ROI using different attribution models.
   */
  attributionWeightedROI(
    touchpoints: { channel: string; spend: number; conversions: number; position: number; timestamp: number }[],
    totalRevenue: number,
  ): {
    model: string;
    channelContributions: { channel: string; attributedConversions: number; attributedRevenue: number; roas: number }[];
    totalAttributedConversions: number;
  }[] {
    const channels = [...new Set(touchpoints.map((t) => t.channel))];
    const sorted = [...touchpoints].sort((a, b) => a.timestamp - b.timestamp);
    const totalConversions = touchpoints.reduce((s, t) => s + t.conversions, 0);

    const models: { name: string; weightFn: (tp: typeof touchpoints, idx: number) => number }[] = [
      {
        name: "linear",
        weightFn: (tps) => 1 / Math.max(1, tps.length),
      },
      {
        name: "time_decay",
        weightFn: (tps, idx) => {
          if (tps.length <= 1) return 1;
          const totalWeight = tps.reduce((s, _, i) => s + Math.exp(0.5 * i), 0);
          return Math.exp(0.5 * idx) / totalWeight;
        },
      },
      {
        name: "position_based",
        weightFn: (tps, idx) => {
          if (tps.length <= 2) return 1 / tps.length;
          if (idx === 0) return 0.4;     // first touch
          if (idx === tps.length - 1) return 0.4; // last touch
          return 0.2 / (tps.length - 2);  // middle touches share 20%
        },
      },
    ];

    return models.map((model) => {
      const channelContribs: Record<string, { conversions: number; revenue: number; spend: number }> = {};
      for (const ch of channels) {
        channelContribs[ch] = { conversions: 0, revenue: 0, spend: 0 };
      }

      // Group touchpoints by conversion path (consecutive touchpoints per channel sequence)
      // Simplified: weight each touchpoint and attribute proportionally
      for (let i = 0; i < sorted.length; i++) {
        const tp = sorted[i];
        const weight = model.weightFn(sorted, i);
        const attributedConversions = tp.conversions * weight;
        const attributedRevenue = totalRevenue * (tp.conversions / Math.max(1, totalConversions)) * weight;
        channelContribs[tp.channel].conversions += attributedConversions;
        channelContribs[tp.channel].revenue += attributedRevenue;
        channelContribs[tp.channel].spend += tp.spend * weight;
      }

      const channelContributions = channels.map((ch) => {
        const data = channelContribs[ch];
        return {
          channel: ch,
          attributedConversions: Math.round(data.conversions * 100) / 100,
          attributedRevenue: Math.round(data.revenue * 100) / 100,
          roas: data.spend > 0 ? Math.round((data.revenue / data.spend) * 100) / 100 : 0,
        };
      });

      return {
        model: model.name,
        channelContributions,
        totalAttributedConversions: Math.round(channelContributions.reduce((s, c) => s + c.attributedConversions, 0) * 100) / 100,
      };
    });
  }

  // ─── Scenario Comparison with Statistical Testing ───────────────────

  /**
   * Compare two scenarios using a simple bootstrap test.
   */
  scenarioComparison(
    scenarioA: ROIInput,
    scenarioB: ROIInput,
    bootstrapSamples = 500,
  ): {
    winner: "A" | "B" | "none";
    meanRoiA: number; meanRoiB: number;
    pValue: number; probabilityABetter: number;
    meanDifference: number; confidenceInterval: [number, number];
  } {
    const resultsA: number[] = [];
    const resultsB: number[] = [];

    for (let i = 0; i < bootstrapSamples; i++) {
      resultsA.push(this.calculate(this.perturbInput(scenarioA, 0.1)).roi);
      resultsB.push(this.calculate(this.perturbInput(scenarioB, 0.1)).roi);
    }

    const meanA = resultsA.reduce((s, v) => s + v, 0) / bootstrapSamples;
    const meanB = resultsB.reduce((s, v) => s + v, 0) / bootstrapSamples;
    const diffs = resultsA.map((a, i) => a - resultsB[i]);
    diffs.sort((a, b) => a - b);

    const countABetter = resultsA.filter((a, i) => a > resultsB[i]).length;
    const pValue = Math.min(countABetter, bootstrapSamples - countABetter) / (bootstrapSamples / 2);

    return {
      winner: pValue < 0.05 ? (meanA > meanB ? "A" : "B") : "none",
      meanRoiA: Math.round(meanA * 100) / 100,
      meanRoiB: Math.round(meanB * 100) / 100,
      pValue: Math.round(pValue * 1000) / 1000,
      probabilityABetter: Math.round((countABetter / bootstrapSamples) * 10000) / 100,
      meanDifference: Math.round((meanA - meanB) * 100) / 100,
      confidenceInterval: [
        Math.round(diffs[Math.floor(bootstrapSamples * 0.025)] * 100) / 100,
        Math.round(diffs[Math.floor(bootstrapSamples * 0.975)] * 100) / 100,
      ],
    };
  }
}

export const roiCalculatorService = new ROICalculatorService();
