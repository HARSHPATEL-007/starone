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
