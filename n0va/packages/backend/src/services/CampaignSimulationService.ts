function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export interface ChannelConfig {
  name: string;
  baseSpend: number;
  baseROAS: number;
  roasVolatility: number;
  saturationHalf: number;
  maxSpend: number;
}

export interface SimulationScenario {
  name: string;
  budgetChanges: Record<string, number>;
  description: string;
}

export interface SimulationTrial {
  trial: number;
  channelResults: { channel: string; spend: number; revenue: number; roas: number }[];
  totalSpend: number;
  totalRevenue: number;
  overallROAS: number;
  probabilityOfSuccess: number;
}

export interface SimulationResult {
  name: string;
  description: string;
  trials: SimulationTrial[];
  summary: {
    meanRevenue: number;
    medianRevenue: number;
    stdRevenue: number;
    minRevenue: number;
    maxRevenue: number;
    meanROAS: number;
    medianROAS: number;
    probabilityPositiveROI: number;
    valueAtRisk95: number;
    conditionalVaR95: number;
    channelBreakdown: { channel: string; meanSpend: number; meanRevenue: number; meanROAS: number; contributionPct: number }[];
  };
  baseComparison: {
    baseRevenue: number;
    scenarioRevenue: number;
    uplift: number;
    upliftProbability: number;
  };
}

export interface SensitivityPoint {
  budgetChangePercent: number;
  meanROAS: number;
  meanRevenue: number;
  probabilityPositive: number;
}

export interface SensitivityAnalysisResult {
  channel: string;
  baseSpend: number;
  baseROAS: number;
  points: SensitivityPoint[];
  optimalChange: number;
  elasticity: number;
}

export interface BudgetOptimizationAllocation {
  channel: string;
  currentBudget: number;
  recommendedBudget: number;
  budgetDelta: number;
  projectedROAS: number;
  projectedRevenue: number;
  marginalBenefit: number;
}

export interface BudgetOptimizationResult {
  allocations: BudgetOptimizationAllocation[];
  totalCurrentBudget: number;
  totalRecommendedBudget: number;
  projectedTotalRevenue: number;
  projectedTotalROAS: number;
  improvementOverCurrent: number;
}

export interface RiskAssessmentDetail {
  scenario: string;
  probabilityOfLoss: number;
  expectedShortfall: number;
  valueAtRisk95: number;
  worstCaseRevenue: number;
  bestCaseRevenue: number;
  revenueStdDev: number;
  riskScore: "low" | "medium" | "high" | "extreme";
}

export interface MultiScenarioRiskResult {
  assessments: RiskAssessmentDetail[];
  safestScenario: string;
  riskiestScenario: string;
}

export interface ChannelEfficiencyPoint {
  spend: number;
  marginalROAS: number;
  cumulativeROAS: number;
  saturationLevel: number;
}

export interface ChannelEfficiencyResult {
  channel: string;
  baseSpend: number;
  currentMarginalROAS: number;
  saturationPoint: number;
  efficiencyCurve: ChannelEfficiencyPoint[];
  recommendation: string;
}

export interface ForecastTrial {
  trial: number;
  revenue: number;
  roas: number;
}

export interface MonteCarloForecastResult {
  channel: string;
  currentSpend: number;
  meanForecastRevenue: number;
  medianForecastRevenue: number;
  stdDevRevenue: number;
  confidenceInterval90: { lower: number; upper: number };
  confidenceInterval95: { lower: number; upper: number };
  probabilityAboveTarget: number;
}

export interface ElasticityPoint {
  budgetMultiplier: number;
  revenueMultiplier: number;
  elasticity: number;
}

export interface BudgetElasticityResult {
  channel: string;
  baseSpend: number;
  elasticityPoints: ElasticityPoint[];
  avgElasticity: number;
  interpretation: string;
}

export interface OptimalMixAllocation {
  channel: string;
  budget: number;
  share: number;
  projectedRevenue: number;
  projectedROAS: number;
}

export interface OptimalChannelMixResult {
  targetROAS: number;
  totalBudget: number;
  allocations: OptimalMixAllocation[];
  projectedTotalRevenue: number;
  projectedOverallROAS: number;
  confidenceLevel: "low" | "medium" | "high";
}

export interface ScenarioSummaryEntry {
  name: string;
  description: string;
  meanROAS: number;
  meanRevenue: number;
  probabilityPositive: number;
  riskLevel: "low" | "medium" | "high";
  valueAtRisk: number;
}

export interface SimulationSummaryResult {
  scenarios: ScenarioSummaryEntry[];
  bestScenario: string;
  worstScenario: string;
  recommendation: string;
}

export class CampaignSimulationService {
  runSimulation(
    channels: ChannelConfig[],
    scenario: SimulationScenario,
    trials: number = 1000,
    seed: number = 42,
  ): SimulationResult {
    const rng = this.mulberry32(seed);
    const trialResults: SimulationTrial[] = [];

    let baseRevenue = 0;
    for (const ch of channels) {
      const baseSpend = ch.baseSpend;
      const contribution = baseSpend * ch.baseROAS;
      baseRevenue += contribution;
    }

    let successCount = 0;

    for (let t = 0; t < trials; t++) {
      const channelResults: { channel: string; spend: number; revenue: number; roas: number }[] = [];
      let totalSpend = 0;
      let totalRevenue = 0;

      for (const ch of channels) {
        const pctChange = (scenario.budgetChanges[ch.name] ?? 0) / 100;
        const newSpend = Math.min(ch.baseSpend * (1 + pctChange), ch.maxSpend);
        const normalizedSpend = newSpend / ch.saturationHalf;
        const saturation = normalizedSpend / (1 + normalizedSpend);
        const noise = (rng() - 0.5) * 2 * ch.roasVolatility;
        const effectiveROAS = ch.baseROAS * (1 - saturation * 0.5) * (1 + noise);
        const revenue = newSpend * Math.max(0, effectiveROAS);
        const roas = newSpend > 0 ? revenue / newSpend : 0;

        channelResults.push({
          channel: ch.name,
          spend: Math.round(newSpend * 100) / 100,
          revenue: Math.round(revenue * 100) / 100,
          roas: Math.round(roas * 100) / 100,
        });
        totalSpend += newSpend;
        totalRevenue += revenue;
      }

      const overallROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
      const probSuccess = totalRevenue > totalSpend ? 1 : 0;
      if (totalRevenue > totalSpend) successCount++;

      trialResults.push({
        trial: t + 1,
        channelResults,
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        overallROAS: Math.round(overallROAS * 100) / 100,
        probabilityOfSuccess: probSuccess,
      });
    }

    const revenues = trialResults.map((r) => r.totalRevenue);
    const roasValues = trialResults.map((r) => r.overallROAS);
    const sortedRevs = [...revenues].sort((a, b) => a - b);

    const meanRevenue = revenues.reduce((s, v) => s + v, 0) / trials;
    const medianRevenue = sortedRevs[Math.floor(trials / 2)];
    const stdRevenue = Math.sqrt(revenues.reduce((s, v) => s + (v - meanRevenue) ** 2, 0) / trials);
    const minRevenue = sortedRevs[0];
    const maxRevenue = sortedRevs[trials - 1];
    const meanROAS = roasValues.reduce((s, v) => s + v, 0) / trials;
    const sortedROAS = [...roasValues].sort((a, b) => a - b);
    const medianROAS = sortedROAS[Math.floor(trials / 2)];

    const var95Idx = Math.floor(trials * 0.05);
    const valueAtRisk95 = sortedRevs[var95Idx];
    const conditionalVaR95 = sortedRevs.slice(0, var95Idx).reduce((s, v) => s + v, 0) / Math.max(1, var95Idx);

    const channelBreakdown = channels.map((ch) => {
      const spends = trialResults.map((r) => r.channelResults.find((cr) => cr.channel === ch.name)!.spend);
      const revenues_total = trialResults.map((r) => r.channelResults.find((cr) => cr.channel === ch.name)!.revenue);
      const meanSpend = spends.reduce((s, v) => s + v, 0) / trials;
      const meanRev = revenues_total.reduce((s, v) => s + v, 0) / trials;
      const meanROAS_ = meanSpend > 0 ? meanRev / meanSpend : 0;
      const contributionPct = meanRevenue > 0 ? (meanRev / meanRevenue) * 100 : 0;
      return {
        channel: ch.name,
        meanSpend: Math.round(meanSpend * 100) / 100,
        meanRevenue: Math.round(meanRev * 100) / 100,
        meanROAS: Math.round(meanROAS_ * 100) / 100,
        contributionPct: Math.round(contributionPct * 100) / 100,
      };
    });

    const scenarioRevenue = trialResults.reduce((s, r) => s + r.totalRevenue, 0) / trials;
    const uplift = baseRevenue > 0 ? ((scenarioRevenue - baseRevenue) / baseRevenue) * 100 : 0;

    return {
      name: scenario.name,
      description: scenario.description,
      trials: trialResults,
      summary: {
        meanRevenue: Math.round(meanRevenue * 100) / 100,
        medianRevenue: Math.round(medianRevenue * 100) / 100,
        stdRevenue: Math.round(stdRevenue * 100) / 100,
        minRevenue: Math.round(minRevenue * 100) / 100,
        maxRevenue: Math.round(maxRevenue * 100) / 100,
        meanROAS: Math.round(meanROAS * 100) / 100,
        medianROAS: Math.round(medianROAS * 100) / 100,
        probabilityPositiveROI: Math.round((successCount / trials) * 10000) / 100,
        valueAtRisk95: Math.round(valueAtRisk95 * 100) / 100,
        conditionalVaR95: Math.round(conditionalVaR95 * 100) / 100,
        channelBreakdown,
      },
      baseComparison: {
        baseRevenue: Math.round(baseRevenue * 100) / 100,
        scenarioRevenue: Math.round(scenarioRevenue * 100) / 100,
        uplift: Math.round(uplift * 100) / 100,
        upliftProbability: Math.round((successCount / trials) * 10000) / 100,
      },
    };
  }

  runMultiScenario(
    channels: ChannelConfig[],
    scenarios: SimulationScenario[],
    trials: number = 500,
  ): SimulationResult[] {
    return scenarios.map((s) => this.runSimulation(channels, s, trials));
  }

  generateSampleChannels(): ChannelConfig[] {
    return [
      { name: "google_ads", baseSpend: 15000, baseROAS: 4.2, roasVolatility: 0.15, saturationHalf: 30000, maxSpend: 50000 },
      { name: "meta_ads", baseSpend: 12000, baseROAS: 3.8, roasVolatility: 0.2, saturationHalf: 25000, maxSpend: 40000 },
      { name: "linkedin_ads", baseSpend: 5000, baseROAS: 2.1, roasVolatility: 0.1, saturationHalf: 10000, maxSpend: 20000 },
      { name: "tiktok_ads", baseSpend: 8000, baseROAS: 3.5, roasVolatility: 0.3, saturationHalf: 15000, maxSpend: 30000 },
      { name: "amazon_ads", baseSpend: 10000, baseROAS: 5.1, roasVolatility: 0.12, saturationHalf: 20000, maxSpend: 35000 },
    ];
  }

  generateSampleScenarios(): SimulationScenario[] {
    return [
      {
        name: "aggressive_growth",
        description: "Increase budgets across all channels by 30% to drive maximum revenue",
        budgetChanges: { google_ads: 30, meta_ads: 30, linkedin_ads: 30, tiktok_ads: 30, amazon_ads: 30 },
      },
      {
        name: "efficiency_focus",
        description: "Cut low-ROAS channels, invest in high-performers",
        budgetChanges: { google_ads: 20, meta_ads: 10, linkedin_ads: -30, tiktok_ads: -10, amazon_ads: 25 },
      },
      {
        name: "conservative",
        description: "Slight budget reduction across the board for capital preservation",
        budgetChanges: { google_ads: -5, meta_ads: -10, linkedin_ads: -15, tiktok_ads: -10, amazon_ads: -5 },
      },
      {
        name: "tiktok_experiment",
        description: "Aggressive investment in TikTok with modest cuts elsewhere",
        budgetChanges: { google_ads: -10, meta_ads: -5, linkedin_ads: -20, tiktok_ads: 80, amazon_ads: 0 },
      },
    ];
  }

  sensitivityAnalysis(channel: ChannelConfig, seed: number = 42): SensitivityAnalysisResult {
    const rng = this.mulberry32(seed);
    const changePcts = [-50, -30, -20, -10, 0, 10, 20, 30, 50, 75, 100];
    const points: SensitivityPoint[] = [];
    for (const pct of changePcts) {
      let totalROAS = 0, totalRev = 0, posCount = 0;
      const trials = 500;
      for (let t = 0; t < trials; t++) {
        const newSpend = Math.min(channel.baseSpend * (1 + pct / 100), channel.maxSpend);
        const ns = newSpend / channel.saturationHalf;
        const sat = ns / (1 + ns);
        const noise = (rng() - 0.5) * 2 * channel.roasVolatility;
        const effROAS = channel.baseROAS * (1 - sat * 0.5) * (1 + noise);
        const rev = newSpend * Math.max(0, effROAS);
        totalROAS += newSpend > 0 ? rev / newSpend : 0;
        totalRev += rev;
        if (rev > newSpend) posCount++;
      }
      points.push({ budgetChangePercent: pct, meanROAS: Math.round((totalROAS / trials) * 100) / 100, meanRevenue: Math.round((totalRev / trials) * 100) / 100, probabilityPositive: Math.round((posCount / trials) * 10000) / 100 });
    }
    const best = [...points].sort((a, b) => b.meanROAS - a.meanROAS)[0];
    const mid = points[Math.floor(points.length / 2)];
    const first = points[0];
    const elas = mid.meanROAS > 0 && first.meanROAS > 0 ? Math.abs((mid.meanROAS - first.meanROAS) / first.meanROAS) / Math.abs((mid.budgetChangePercent - first.budgetChangePercent) / Math.max(1, first.budgetChangePercent)) : 0;
    return { channel: channel.name, baseSpend: channel.baseSpend, baseROAS: channel.baseROAS, points, optimalChange: best.budgetChangePercent, elasticity: Math.round(elas * 100) / 100 };
  }

  budgetOptimization(channels: ChannelConfig[], totalBudget: number, seed: number = 42): BudgetOptimizationResult {
    const rng = this.mulberry32(seed);
    const totalBase = channels.reduce((s, c) => s + c.baseSpend, 0);
    const factor = totalBudget / totalBase;
    const allocations: BudgetOptimizationAllocation[] = [];
    let totalRec = 0, totalProjRev = 0, totalCurRev = 0;
    for (const ch of channels) {
      const curBudget = ch.baseSpend;
      const recBudget = Math.min(ch.baseSpend * factor, ch.maxSpend);
      const ns = recBudget / ch.saturationHalf;
      const sat = ns / (1 + ns);
      let avgROAS = 0, avgRev = 0;
      for (let t = 0; t < 200; t++) {
        const noise = (rng() - 0.5) * 2 * ch.roasVolatility;
        const effROAS = ch.baseROAS * (1 - sat * 0.5) * (1 + noise);
        const rev = recBudget * Math.max(0, effROAS);
        avgROAS += recBudget > 0 ? rev / recBudget : 0;
        avgRev += rev;
      }
      avgROAS /= 200;
      avgRev /= 200;
      const curNs = curBudget / ch.saturationHalf;
      const curSat = curNs / (1 + curNs);
      const curEffROAS = ch.baseROAS * (1 - curSat * 0.5);
      const curRev = curBudget * curEffROAS;
      totalCurRev += curRev;
      totalRec += recBudget;
      totalProjRev += avgRev;
      allocations.push({
        channel: ch.name, currentBudget: curBudget, recommendedBudget: Math.round(recBudget * 100) / 100,
        budgetDelta: Math.round((recBudget - curBudget) * 100) / 100,
        projectedROAS: Math.round(avgROAS * 100) / 100, projectedRevenue: Math.round(avgRev * 100) / 100,
        marginalBenefit: Math.round(((avgRev - curRev) / Math.max(1, recBudget - curBudget)) * 100) / 100,
      });
    }
    const projTotalROAS = totalRec > 0 ? totalProjRev / totalRec : 0;
    const curTotalROAS = totalBase > 0 ? totalCurRev / totalBase : 0;
    const improv = curTotalROAS > 0 ? ((projTotalROAS - curTotalROAS) / curTotalROAS) * 100 : 0;
    return { allocations, totalCurrentBudget: totalBase, totalRecommendedBudget: Math.round(totalRec * 100) / 100, projectedTotalRevenue: Math.round(totalProjRev * 100) / 100, projectedTotalROAS: Math.round(projTotalROAS * 100) / 100, improvementOverCurrent: Math.round(improv * 100) / 100 };
  }

  riskAssessment(channels: ChannelConfig[], scenarios: SimulationScenario[], seed: number = 42): MultiScenarioRiskResult {
    const assessments: RiskAssessmentDetail[] = [];
    for (const sc of scenarios) {
      const result = this.runSimulation(channels, sc, 2000, seed + hashStr(sc.name));
      const sorted = result.trials.map(t => t.totalRevenue).sort((a, b) => a - b);
      const lossCount = result.trials.filter(t => t.totalRevenue < t.totalSpend).length;
      const probLoss = (lossCount / result.trials.length) * 100;
      const varIdx = Math.floor(result.trials.length * 0.05);
      const esIdx = Math.floor(result.trials.length * 0.05);
      const riskScore: "low" | "medium" | "high" | "extreme" = probLoss < 10 ? "low" : probLoss < 25 ? "medium" : probLoss < 50 ? "high" : "extreme";
      assessments.push({
        scenario: sc.name, probabilityOfLoss: Math.round(probLoss * 100) / 100,
        expectedShortfall: Math.round(sorted.slice(0, esIdx).reduce((s, v) => s + v, 0) / Math.max(1, esIdx) * 100) / 100,
        valueAtRisk95: Math.round(sorted[varIdx] * 100) / 100,
        worstCaseRevenue: Math.round(sorted[0] * 100) / 100, bestCaseRevenue: Math.round(sorted[sorted.length - 1] * 100) / 100,
        revenueStdDev: result.summary.stdRevenue, riskScore,
      });
    }
    const sortedAsc = [...assessments].sort((a, b) => a.probabilityOfLoss - b.probabilityOfLoss);
    const sortedDesc = [...assessments].sort((a, b) => b.probabilityOfLoss - a.probabilityOfLoss);
    return { assessments, safestScenario: sortedAsc[0]?.scenario || "", riskiestScenario: sortedDesc[0]?.scenario || "" };
  }

  channelEfficiency(channel: ChannelConfig, seed: number = 42): ChannelEfficiencyResult {
    const rng = this.mulberry32(seed);
    const spendLevels = [];
    const step = Math.max(100, channel.maxSpend / 20);
    for (let s = step; s <= channel.maxSpend * 1.5; s += step) spendLevels.push(s);
    if (!spendLevels.includes(channel.baseSpend)) spendLevels.push(channel.baseSpend);
    spendLevels.sort((a, b) => a - b);
    const curve: ChannelEfficiencyPoint[] = [];
    for (const sp of spendLevels) {
      const ns = sp / channel.saturationHalf;
      const sat = ns / (1 + ns);
      let avgROAS = 0;
      for (let t = 0; t < 100; t++) {
        const noise = (rng() - 0.5) * 2 * channel.roasVolatility;
        const effROAS = channel.baseROAS * (1 - sat * 0.5) * (1 + noise);
        avgROAS += effROAS;
      }
      avgROAS /= 100;
      const cumROAS = channel.baseROAS * (1 - sat * 0.5);
      curve.push({ spend: Math.round(sp * 100) / 100, marginalROAS: Math.round(avgROAS * 100) / 100, cumulativeROAS: Math.round(cumROAS * 100) / 100, saturationLevel: Math.round(sat * 100) });
    }
    const satPoint = curve.find(p => p.marginalROAS < 1) || curve[curve.length - 1];
    const curPoint = curve.find(p => Math.abs(p.spend - channel.baseSpend) < step * 0.5) || curve[0];
    return {
      channel: channel.name, baseSpend: channel.baseSpend,
      currentMarginalROAS: curPoint.marginalROAS,
      saturationPoint: satPoint.spend, efficiencyCurve: curve,
      recommendation: curPoint.marginalROAS < 1 ? `${channel.name} is past saturation point — reduce spend` : curPoint.marginalROAS < 2 ? `${channel.name} approaching saturation — monitor closely` : `${channel.name} has headroom — consider increasing spend`,
    };
  }

  monteCarloForecast(channel: ChannelConfig, budget: number, trials: number = 5000, seed: number = 42): MonteCarloForecastResult {
    const rng = this.mulberry32(seed + hashStr(channel.name));
    const revenues: number[] = [];
    const roasValues: number[] = [];
    for (let t = 0; t < trials; t++) {
      const ns = budget / channel.saturationHalf;
      const sat = ns / (1 + ns);
      const noise = (rng() - 0.5) * 2 * channel.roasVolatility;
      const effROAS = channel.baseROAS * (1 - sat * 0.5) * (1 + noise);
      const rev = budget * Math.max(0, effROAS);
      revenues.push(rev);
      roasValues.push(budget > 0 ? rev / budget : 0);
    }
    const sorted = [...revenues].sort((a, b) => a - b);
    const mean = revenues.reduce((s, v) => s + v, 0) / trials;
    const median = sorted[Math.floor(trials / 2)];
    const std = Math.sqrt(revenues.reduce((s, v) => s + (v - mean) ** 2, 0) / trials);
    const idx90 = Math.floor(trials * 0.05);
    const idx95 = Math.floor(trials * 0.025);
    const aboveTarget = roasValues.filter(r => r > 1).length;
    return {
      channel: channel.name, currentSpend: budget,
      meanForecastRevenue: Math.round(mean * 100) / 100, medianForecastRevenue: Math.round(median * 100) / 100, stdDevRevenue: Math.round(std * 100) / 100,
      confidenceInterval90: { lower: Math.round(sorted[idx90] * 100) / 100, upper: Math.round(sorted[trials - 1 - idx90] * 100) / 100 },
      confidenceInterval95: { lower: Math.round(sorted[idx95] * 100) / 100, upper: Math.round(sorted[trials - 1 - idx95] * 100) / 100 },
      probabilityAboveTarget: Math.round((aboveTarget / trials) * 10000) / 100,
    };
  }

  budgetElasticity(channel: ChannelConfig, seed: number = 42): BudgetElasticityResult {
    const rng = this.mulberry32(seed);
    const mults = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];
    const baseRev = channel.baseSpend * channel.baseROAS;
    const points: ElasticityPoint[] = [];
    for (const mult of mults) {
      const budget = channel.baseSpend * mult;
      const ns = budget / channel.saturationHalf;
      const sat = ns / (1 + ns);
      let avgRev = 0;
      for (let t = 0; t < 200; t++) {
        const noise = (rng() - 0.5) * 2 * channel.roasVolatility;
        const effROAS = channel.baseROAS * (1 - sat * 0.5) * (1 + noise);
        avgRev += budget * Math.max(0, effROAS);
      }
      avgRev /= 200;
      const revMult = baseRev > 0 ? avgRev / baseRev : 0;
      const elas = revMult > 0 ? Math.log(revMult) / Math.log(mult) : 0;
      points.push({ budgetMultiplier: mult, revenueMultiplier: Math.round(revMult * 100) / 100, elasticity: Math.round(elas * 100) / 100 });
    }
    const avgElas = points.reduce((s, p) => s + p.elasticity, 0) / points.length;
    return { channel: channel.name, baseSpend: channel.baseSpend, elasticityPoints: points, avgElasticity: Math.round(avgElas * 100) / 100, interpretation: avgElas > 1 ? "Revenue-elastic — budget increases yield proportionally higher revenue" : avgElas > 0.5 ? "Moderately elastic — some room for budget growth" : "Inelastic — diminishing returns, focus on efficiency" };
  }

  optimalChannelMix(channels: ChannelConfig[], totalBudget: number, targetROAS: number, seed: number = 42): OptimalChannelMixResult {
    const rng = this.mulberry32(seed);
    const weights = channels.map(() => 0.5 + rng() * 0.5);
    const totalW = weights.reduce((s, w) => s + w, 0);
    const normalized = weights.map(w => w / totalW);
    const allocations: OptimalMixAllocation[] = [];
    let totalProjRev = 0;
    for (let i = 0; i < channels.length; i++) {
      const ch = channels[i];
      const budget = totalBudget * normalized[i];
      const clamped = Math.min(budget, ch.maxSpend);
      const ns = clamped / ch.saturationHalf;
      const sat = ns / (1 + ns);
      let avgROAS = 0, avgRev = 0;
      for (let t = 0; t < 200; t++) {
        const noise = (rng() - 0.5) * 2 * ch.roasVolatility;
        const effROAS = ch.baseROAS * (1 - sat * 0.5) * (1 + noise);
        const rev = clamped * Math.max(0, effROAS);
        avgROAS += clamped > 0 ? rev / clamped : 0;
        avgRev += rev;
      }
      avgROAS /= 200;
      avgRev /= 200;
      totalProjRev += avgRev;
      allocations.push({ channel: ch.name, budget: Math.round(clamped * 100) / 100, share: Math.round(normalized[i] * 10000) / 100, projectedRevenue: Math.round(avgRev * 100) / 100, projectedROAS: Math.round(avgROAS * 100) / 100 });
    }
    const projROAS = totalBudget > 0 ? totalProjRev / totalBudget : 0;
    const conf: "low" | "medium" | "high" = Math.abs(projROAS - targetROAS) / targetROAS < 0.1 ? "high" : Math.abs(projROAS - targetROAS) / targetROAS < 0.25 ? "medium" : "low";
    return { targetROAS, totalBudget, allocations, projectedTotalRevenue: Math.round(totalProjRev * 100) / 100, projectedOverallROAS: Math.round(projROAS * 100) / 100, confidenceLevel: conf };
  }

  simulationSummary(channels: ChannelConfig[], scenarios: SimulationScenario[], seed: number = 42): SimulationSummaryResult {
    const entries: ScenarioSummaryEntry[] = scenarios.map(sc => {
      const result = this.runSimulation(channels, sc, 500, seed + hashStr(sc.name));
      const sorted = result.trials.map(t => t.totalRevenue).sort((a, b) => a - b);
      const var95 = sorted[Math.floor(sorted.length * 0.05)];
      const riskLevel: "low" | "medium" | "high" = result.summary.probabilityPositiveROI > 80 ? "low" : result.summary.probabilityPositiveROI > 50 ? "medium" : "high";
      return {
        name: sc.name, description: sc.description, meanROAS: result.summary.meanROAS,
        meanRevenue: result.summary.meanRevenue, probabilityPositive: result.summary.probabilityPositiveROI,
        riskLevel, valueAtRisk: Math.round(var95 * 100) / 100,
      };
    });
    const best = [...entries].sort((a, b) => b.meanROAS - a.meanROAS)[0];
    const worst = [...entries].sort((a, b) => a.meanROAS - b.meanROAS)[0];
    return {
      scenarios: entries,
      bestScenario: best?.name || "",
      worstScenario: worst?.name || "",
      recommendation: best ? `Recommended: "${best.name}" — highest mean ROAS (${best.meanROAS}x) with ${best.riskLevel} risk` : "No scenarios evaluated",
    };
  }

  private mulberry32(a: number): () => number {
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}

export const campaignSimulationService = new CampaignSimulationService();
