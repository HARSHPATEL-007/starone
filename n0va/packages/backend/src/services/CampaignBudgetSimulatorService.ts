import { DataStore } from "./DataStore";

interface SimulationConfig {
  campaignId: string;
  budget: number;
  expectedROAS: number;
  roasVariance: number;
  expectedConversions: number;
  convVariance: number;
}

interface SimulationRun {
  revenue: number;
  conversions: number;
  roas: number;
  cpa: number;
}

interface SimulationResult {
  campaignId: string;
  campaignName: string;
  budget: number;
  runs: number;
  simulations: SimulationRun[];
  stats: {
    meanRevenue: number;
    medianRevenue: number;
    stdDevRevenue: number;
    minRevenue: number;
    maxRevenue: number;
    meanROAS: number;
    medianROAS: number;
    meanConversions: number;
    p10Revenue: number;
    p25Revenue: number;
    p75Revenue: number;
    p90Revenue: number;
    probabilityPositiveROAS: number;
    probabilityAboveTarget: number;
  };
  distribution: { bucket: string; count: number; probability: number }[];
}

interface SimulationScenario {
  name: string;
  description: string;
  configs: SimulationConfig[];
  portfolioResult: {
    totalBudget: number;
    meanTotalRevenue: number;
    meanTotalROAS: number;
    meanTotalConversions: number;
    p10Revenue: number;
    p90Revenue: number;
    probabilityProfit: number;
  };
}

interface BudgetSimulatorSummary {
  totalSimulations: number;
  totalScenarios: number;
  recentScenarios: SimulationScenario[];
}

let simCounter = 0;
let scenarioCounter = 0;

export class CampaignBudgetSimulatorService {
  simulateCampaign(config: SimulationConfig, runs: number = 10000): SimulationResult {
    const simulations: SimulationRun[] = [];
    const seed = config.campaignId.length + config.budget;
    for (let i = 0; i < runs; i++) {
      const roasNoise = this.randomNormal(0, config.roasVariance || 0.3, seed + i);
      const actualROAS = Math.max(0, (config.expectedROAS || 2) + roasNoise);
      const revenue = config.budget * actualROAS;

      const convNoise = this.randomNormal(0, config.convVariance || 0.2, seed + i + 10000);
      const actualConvs = Math.max(0, (config.expectedConversions || 100) + convNoise * (config.expectedConversions || 100));
      const cpa = actualConvs > 0 ? config.budget / actualConvs : Infinity;

      simulations.push({ revenue, conversions: Math.round(actualConvs), roas: actualROAS, cpa });
    }

    const revenues = simulations.map(s => s.revenue).sort((a, b) => a - b);
    const roas = simulations.map(s => s.roas).sort((a, b) => a - b);
    const convs = simulations.map(s => s.conversions);
    const n = simulations.length;

    const meanRevenue = revenues.reduce((s, v) => s + v, 0) / n;
    const medianRevenue = revenues[Math.floor(n / 2)];
    const stdDevRevenue = Math.sqrt(revenues.reduce((s, v) => s + (v - meanRevenue) ** 2, 0) / n);
    const minRevenue = revenues[0];
    const maxRevenue = revenues[n - 1];
    const meanROAS = roas.reduce((s, v) => s + v, 0) / n;
    const medianROAS = roas[Math.floor(n / 2)];
    const meanConversions = convs.reduce((s, v) => s + v, 0) / n;
    const p10 = revenues[Math.floor(n * 0.1)];
    const p25 = revenues[Math.floor(n * 0.25)];
    const p75 = revenues[Math.floor(n * 0.75)];
    const p90 = revenues[Math.floor(n * 0.9)];
    const posROAS = simulations.filter(s => s.roas > 0).length / n;
    const aboveTarget = simulations.filter(s => s.roas >= config.expectedROAS).length / n;

    const distribution = this.buildDistribution(revenues, n);

    const runCount = Math.min(runs, 100);
    return {
      campaignId: config.campaignId,
      campaignName: config.campaignId,
      budget: config.budget,
      runs: n,
      simulations: simulations.slice(0, runCount),
      stats: {
        meanRevenue: Math.round(meanRevenue * 100) / 100,
        medianRevenue: Math.round(medianRevenue * 100) / 100,
        stdDevRevenue: Math.round(stdDevRevenue * 100) / 100,
        minRevenue: Math.round(minRevenue * 100) / 100,
        maxRevenue: Math.round(maxRevenue * 100) / 100,
        meanROAS: Math.round(meanROAS * 100) / 100,
        medianROAS: Math.round(medianROAS * 100) / 100,
        meanConversions: Math.round(meanConversions * 100) / 100,
        p10Revenue: Math.round(p10 * 100) / 100,
        p25Revenue: Math.round(p25 * 100) / 100,
        p75Revenue: Math.round(p75 * 100) / 100,
        p90Revenue: Math.round(p90 * 100) / 100,
        probabilityPositiveROAS: Math.round(posROAS * 10000) / 100,
        probabilityAboveTarget: Math.round(aboveTarget * 10000) / 100,
      },
      distribution,
    };
  }

  runScenario(tenantId: string, configs: SimulationConfig[], runs: number = 5000): SimulationScenario {
    const mem = DataStore.mem();
    const results: SimulationResult[] = [];
    for (const cfg of configs) {
      const campaign = mem.findOne("campaigns", (c: any) => c._id === cfg.campaignId && c.tenantId === tenantId);
      const result = this.simulateCampaign(cfg, runs);
      result.campaignName = campaign?.name || cfg.campaignId;
      results.push(result);
    }
    const totalBudget = configs.reduce((s, c) => s + c.budget, 0);
    const totalRev = results.reduce((s, r) => s + r.stats.meanRevenue, 0);
    const totalConvs = results.reduce((s, r) => s + r.stats.meanConversions, 0);
    const allRevenues = results.flatMap(r => r.simulations.map(s => s.revenue)).sort((a, b) => a - b);
    const n = allRevenues.length;
    const p10Rev = n > 0 ? allRevenues[Math.floor(n * 0.1)] : 0;
    const p90Rev = n > 0 ? allRevenues[Math.floor(n * 0.9)] : 0;
    const profitCount = results.reduce((s, r) => s + r.simulations.filter(sim => sim.roas > 1).length, 0);
    const totalSims = results.reduce((s, r) => s + r.simulations.length, 0);
    const scenario: SimulationScenario = {
      name: `Scenario ${++scenarioCounter}`,
      description: `Simulation of ${configs.length} campaigns with ${runs} runs each`,
      configs,
      portfolioResult: {
        totalBudget,
        meanTotalRevenue: Math.round(totalRev * 100) / 100,
        meanTotalROAS: totalBudget > 0 ? Math.round(totalRev / totalBudget * 100) / 100 : 0,
        meanTotalConversions: Math.round(totalConvs),
        p10Revenue: Math.round(p10Rev * 100) / 100,
        p90Revenue: Math.round(p90Rev * 100) / 100,
        probabilityProfit: totalSims > 0 ? Math.round(profitCount / totalSims * 10000) / 100 : 0,
      },
    };
    mem.insert("budget_simulations", {
      tenantId, scenario, createdAt: new Date().toISOString(),
    });
    return scenario;
  }

  getHistory(tenantId: string): SimulationScenario[] {
    return DataStore.mem().find("budget_simulations", (s: any) => s.tenantId === tenantId).map((s: any) => s.scenario);
  }

  getSummary(tenantId: string): BudgetSimulatorSummary {
    const history = this.getHistory(tenantId);
    const totalSims = history.reduce((s, h) => s + h.configs.reduce((c, cfg) => c + 1, 0), 0);
    return {
      totalSimulations: totalSims,
      totalScenarios: history.length,
      recentScenarios: history.slice(-5),
    };
  }

  private randomNormal(mean: number, stdDev: number, seed: number): number {
    const u1 = this.hash(seed) % 10000 / 10000;
    const u2 = this.hash(seed + 1) % 10000 / 10000;
    if (u1 === 0) return mean;
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
  }

  private hash(n: number): number {
    const s = ((n * 9301 + 49297) % 233280);
    return Math.abs(s);
  }

  private buildDistribution(values: number[], n: number): { bucket: string; count: number; probability: number }[] {
    const min = values[0];
    const max = values[n - 1];
    const range = max - min || 1;
    const bucketCount = 10;
    const bucketSize = range / bucketCount;
    const buckets = new Array(bucketCount).fill(0);
    for (const v of values) {
      const idx = Math.min(bucketCount - 1, Math.floor((v - min) / bucketSize));
      buckets[idx]++;
    }
    return buckets.map((count, i) => ({
      bucket: `$${Math.round(min + i * bucketSize).toLocaleString()}-$${Math.round(min + (i + 1) * bucketSize).toLocaleString()}`,
      count,
      probability: Math.round(count / n * 10000) / 100,
    }));
  }

  // ── Deep methods ──────────────────────────────────────────────────

  budgetOptimizationAllocation(campaigns: { campaignId: string; budget: number; expectedROAS: number; roasVariance: number; expectedConversions: number; convVariance: number }[], totalBudget: number): {
    allocations: { campaignId: string; allocatedBudget: number; expectedRevenue: number; expectedROAS: number; marginalEfficiency: number; share: number }[];
    totalExpectedRevenue: number; totalExpectedROAS: number; efficiencyScore: number;
  } {
    const seed = totalBudget + campaigns.length;
    const baseEfficiency = campaigns.map((c, i) => {
      const eff = c.expectedROAS / (1 + c.roasVariance) * (1 + ((seed + i * 13) % 20) / 100);
      return { ...c, efficiency: Math.round(eff * 100) / 100 };
    }).sort((a, b) => b.efficiency - a.efficiency);

    const totalEfficiency = baseEfficiency.reduce((s, c) => s + c.efficiency, 0);
    const allocations = baseEfficiency.map((c, i) => {
      const rawShare = c.efficiency / totalEfficiency;
      const noise = ((seed + i * 29) % 10) / 100;
      const share = Math.round(Math.max(0.05, Math.min(0.5, rawShare + noise)) * 100) / 100;
      const allocated = Math.round(totalBudget * share * 100) / 100;
      const expectedRevenue = Math.round(allocated * c.expectedROAS * 100) / 100;
      return { campaignId: c.campaignId, allocatedBudget: allocated, expectedRevenue, expectedROAS: c.expectedROAS, marginalEfficiency: c.efficiency, share };
    });

    const totalRev = allocations.reduce((s, a) => s + a.expectedRevenue, 0);
    return { allocations, totalExpectedRevenue: totalRev, totalExpectedROAS: totalBudget > 0 ? Math.round(totalRev / totalBudget * 100) / 100 : 0, efficiencyScore: Math.round(baseEfficiency.reduce((s, c) => s + c.efficiency, 0) / campaigns.length * 100) / 100 };
  }

  budgetScenarioComparison(configs: { name: string; budget: number; expectedROAS: number; roasVariance: number; expectedConversions: number; convVariance: number }[], runs: number = 3000): {
    scenarios: { name: string; meanRevenue: number; medianRevenue: number; stdDev: number; meanROAS: number; meanConversions: number; p10: number; p90: number; probProfit: number; probAboveTarget: number }[];
    bestScenario: string; worstScenario: string;
  } {
    const results = configs.map(cfg => {
      const result = this.simulateCampaign({ campaignId: cfg.name, budget: cfg.budget, expectedROAS: cfg.expectedROAS, roasVariance: cfg.roasVariance, expectedConversions: cfg.expectedConversions, convVariance: cfg.convVariance }, runs);
      return { name: cfg.name, meanRevenue: result.stats.meanRevenue, medianRevenue: result.stats.medianRevenue, stdDev: result.stats.stdDevRevenue, meanROAS: result.stats.meanROAS, meanConversions: result.stats.meanConversions, p10: result.stats.p10Revenue, p90: result.stats.p90Revenue, probProfit: result.stats.probabilityPositiveROAS, probAboveTarget: result.stats.probabilityAboveTarget };
    });
    const best = results.reduce((a, b) => a.meanROAS > b.meanROAS ? a : b);
    const worst = results.reduce((a, b) => a.meanROAS < b.meanROAS ? a : b);
    return { scenarios: results, bestScenario: best.name, worstScenario: worst.name };
  }

  budgetRiskAssessment(config: SimulationConfig, runs: number = 5000): {
    valueAtRisk95: number; conditionalVaR95: number; downsideDeviation: number; probabilityOfLoss: number; expectedShortfall: number; sharpeRatio: number; maxDrawdown: number; riskAdjustedROAS: number;
  } {
    const result = this.simulateCampaign(config, runs);
    const sorted = result.simulations.map(s => s.revenue).sort((a, b) => a - b);
    const n = sorted.length;
    const idx95 = Math.floor(n * 0.05);
    const valueAtRisk95 = config.budget > 0 ? Math.max(0, Math.round((config.budget - sorted[idx95]) / config.budget * 10000) / 100) : 0;
    const cvarSlice = sorted.slice(0, idx95);
    const conditionalVaR95 = cvarSlice.length > 0 ? Math.max(0, Math.round((config.budget - cvarSlice.reduce((s, v) => s + v, 0) / cvarSlice.length) / config.budget * 10000) / 100) : 0;
    const meanRev = sorted.reduce((s, v) => s + v, 0) / n;
    const downside = sorted.filter(v => v < meanRev).map(v => (meanRev - v) ** 2);
    const downsideDeviation = downside.length > 0 ? Math.round(Math.sqrt(downside.reduce((s, v) => s + v, 0) / downside.length) * 100) / 100 : 0;
    const probLoss = Math.round(result.simulations.filter(s => s.revenue < config.budget).length / n * 10000) / 100;
    const lossValues = result.simulations.filter(s => s.revenue < config.budget).map(s => s.revenue);
    const expectedShortfall = lossValues.length > 0 ? Math.round((config.budget - lossValues.reduce((s, v) => s + v, 0) / lossValues.length) / config.budget * 10000) / 100 : 0;
    const excess = result.simulations.map(s => s.roas - 1);
    const meanExcess = excess.reduce((s, v) => s + v, 0) / n;
    const stdExcess = Math.sqrt(excess.reduce((s, v) => s + (v - meanExcess) ** 2, 0) / n);
    const sharpeRatio = stdExcess > 0 ? Math.round(meanExcess / stdExcess * 100) / 100 : 0;
    const maxDD = Math.max(0, Math.round((1 - sorted[0] / (sorted[n - 1] || 1)) * 10000) / 100);
    const riskAdjROAS = downsideDeviation > 0 ? Math.round((config.expectedROAS - 1) / (downsideDeviation / 100) * 100) / 100 : config.expectedROAS;
    return { valueAtRisk95, conditionalVaR95, downsideDeviation, probabilityOfLoss: probLoss, expectedShortfall, sharpeRatio, maxDrawdown: maxDD, riskAdjustedROAS: riskAdjROAS };
  }

  budgetSensitivityAnalysis(config: SimulationConfig, budgetRange: { min: number; max: number; steps: number }, runs: number = 2000): {
    points: { budget: number; expectedRevenue: number; expectedROAS: number; expectedConversions: number; stdDev: number; probProfit: number }[];
    optimalBudget: number; elasticity: number;
  } {
    const step = (budgetRange.max - budgetRange.min) / Math.max(budgetRange.steps - 1, 1);
    const points: { budget: number; expectedRevenue: number; expectedROAS: number; expectedConversions: number; stdDev: number; probProfit: number }[] = [];
    for (let b = budgetRange.min; b <= budgetRange.max + 0.01; b += step) {
      const cfg = { ...config, budget: Math.round(b * 100) / 100 };
      const result = this.simulateCampaign(cfg, runs);
      points.push({ budget: cfg.budget, expectedRevenue: result.stats.meanRevenue, expectedROAS: result.stats.meanROAS, expectedConversions: result.stats.meanConversions, stdDev: result.stats.stdDevRevenue, probProfit: result.stats.probabilityPositiveROAS });
    }
    const best = points.reduce((a, b) => a.expectedROAS > b.expectedROAS ? a : b);
    const mid = points[Math.floor(points.length / 2)];
    const elasticity = mid && mid.budget > 0 ? Math.round((points[points.length - 1].expectedRevenue - points[0].expectedRevenue) / points[0].expectedRevenue / ((budgetRange.max - budgetRange.min) / config.budget) * 100) / 100 : 0;
    return { points, optimalBudget: best.budget, elasticity };
  }

  budgetWhatIfSimulation(currentConfig: SimulationConfig, whatIfBudget: number, runs: number = 3000): {
    current: { budget: number; expectedRevenue: number; expectedROAS: number; expectedConversions: number; probProfit: number };
    projected: { budget: number; expectedRevenue: number; expectedROAS: number; expectedConversions: number; probProfit: number };
    delta: { revenueChange: number; roasChange: number; conversionsChange: number; profitChange: number };
    recommendation: string;
  } {
    const currentResult = this.simulateCampaign(currentConfig, runs);
    const projectedConfig = { ...currentConfig, budget: whatIfBudget };
    const projectedResult = this.simulateCampaign(projectedConfig, runs);
    const current = { budget: currentConfig.budget, expectedRevenue: currentResult.stats.meanRevenue, expectedROAS: currentResult.stats.meanROAS, expectedConversions: currentResult.stats.meanConversions, probProfit: currentResult.stats.probabilityPositiveROAS };
    const projected = { budget: whatIfBudget, expectedRevenue: projectedResult.stats.meanRevenue, expectedROAS: projectedResult.stats.meanROAS, expectedConversions: projectedResult.stats.meanConversions, probProfit: projectedResult.stats.probabilityPositiveROAS };
    const revenueChange = Math.round((projected.expectedRevenue - current.expectedRevenue) / (current.expectedRevenue || 1) * 10000) / 100;
    const roasChange = Math.round((projected.expectedROAS - current.expectedROAS) * 100) / 100;
    const conversionsChange = Math.round((projected.expectedConversions - current.expectedConversions) / (current.expectedConversions || 1) * 10000) / 100;
    const profitChange = projected.expectedRevenue - projected.budget - (current.expectedRevenue - current.budget);
    const rec = profitChange > 0 && roasChange >= -0.5
      ? `Increasing budget to $${whatIfBudget.toLocaleString()} is projected to increase profit by $${Math.round(profitChange).toLocaleString()} with ${roasChange >= 0 ? "stable or improving" : "slightly reduced"} ROAS`
      : `The projected ROAS decline of ${Math.abs(roasChange).toFixed(1)}x may not justify the budget increase to $${whatIfBudget.toLocaleString()} — consider a smaller increment`;
    return { current, projected, delta: { revenueChange, roasChange, conversionsChange, profitChange: Math.round(profitChange * 100) / 100 }, recommendation: rec };
  }

  budgetROICurve(config: SimulationConfig, maxBudgetMultiplier: number = 3, steps: number = 10, runs: number = 2000): {
    curve: { budget: number; revenue: number; roas: number; profit: number; marginalROAS: number; efficiency: string }[];
    optimalBudget: number; saturationPoint: number; diminishingReturnsThreshold: number; maxProfitBudget: number;
  } {
    const baseBudget = config.budget;
    const step = (baseBudget * maxBudgetMultiplier - baseBudget) / Math.max(steps - 1, 1);
    const curve: { budget: number; revenue: number; roas: number; profit: number; marginalROAS: number; efficiency: string }[] = [];
    let prevRevenue = 0;
    for (let i = 0; i < steps; i++) {
      const b = Math.round((baseBudget + i * step) * 100) / 100;
      const cfg = { ...config, budget: b };
      const result = this.simulateCampaign(cfg, runs);
      const marginalROAS = i > 0 && (b - curve[i - 1].budget) > 0 ? Math.round((result.stats.meanRevenue - prevRevenue) / (b - curve[i - 1].budget) * 100) / 100 : result.stats.meanROAS;
      const eff = marginalROAS > 2 ? "high" : marginalROAS > 1 ? "medium" : "low";
      curve.push({ budget: b, revenue: result.stats.meanRevenue, roas: result.stats.meanROAS, profit: Math.round((result.stats.meanRevenue - b) * 100) / 100, marginalROAS, efficiency: eff });
      prevRevenue = result.stats.meanRevenue;
    }
    const optimal = curve.reduce((a, b) => a.roas > b.roas ? a : b);
    const satIdx = curve.findIndex(p => p.marginalROAS < 1);
    const satPoint = satIdx >= 0 ? curve[satIdx].budget : curve[curve.length - 1].budget;
    const diminishing = curve.find(p => p.marginalROAS < 1.5)?.budget || curve[curve.length - 1].budget;
    const maxProfit = curve.reduce((a, b) => a.profit > b.profit ? a : b);
    return { curve, optimalBudget: optimal.budget, saturationPoint: satPoint, diminishingReturnsThreshold: diminishing, maxProfitBudget: maxProfit.budget };
  }
}

export const campaignBudgetSimulator = new CampaignBudgetSimulatorService();