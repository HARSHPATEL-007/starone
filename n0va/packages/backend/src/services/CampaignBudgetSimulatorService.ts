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
}

export const campaignBudgetSimulator = new CampaignBudgetSimulatorService();