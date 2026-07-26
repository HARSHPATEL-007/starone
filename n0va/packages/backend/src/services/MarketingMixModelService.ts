export interface ChannelSpend {
  channel: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export interface AdstockParams {
  type: "geometric" | "delayed";
  decayRate: number;
  delay?: number;
}

export interface SaturationParams {
  type: "hill" | "adbudget" | "log";
  halfSaturation: number;
  slope: number;
}

export interface MMMInput {
  channels: string[];
  historicalData: { week: number; spend: Record<string, number>; revenue: number }[];
  adstockParams?: Record<string, AdstockParams>;
  saturationParams?: Record<string, SaturationParams>;
}

export interface ChannelContribution {
  channel: string;
  totalSpend: number;
  attributedRevenue: number;
  baseRevenue: number;
  incrementalRevenue: number;
  ROAS: number;
  marginalROAS: number;
  saturation: number;
  adstockEfficiency: number;
  shareOfSpend: number;
  shareOfRevenue: number;
}

export interface MMMResult {
  contributions: ChannelContribution[];
  totalRevenue: number;
  totalSpend: number;
  baseRevenue: number;
  incrementalRevenue: number;
  overallROAS: number;
  R2: number;
  adstockParams: Record<string, AdstockParams>;
  saturationParams: Record<string, SaturationParams>;
}

export interface ScenarioInput {
  name: string;
  budgetChanges: Record<string, number>;
}

export interface ScenarioResult {
  name: string;
  projectedRevenue: number;
  projectedROAS: number;
  channelProjections: { channel: string; spend: number; revenue: number; ROAS: number }[];
  changeFromBase: number;
}

export class MarketingMixModelService {
  private readonly DEFAULT_ADSTOCK: AdstockParams = { type: "geometric", decayRate: 0.5 };
  private readonly DEFAULT_SATURATION: SaturationParams = { type: "hill", halfSaturation: 10000, slope: 2.0 };

  private adstockTransform(spend: number[], params: AdstockParams): number[] {
    const result: number[] = [];
    for (let t = 0; t < spend.length; t++) {
      let value = spend[t];
      if (params.type === "geometric") {
        for (let k = 1; k <= t; k++) {
          value += spend[t - k] * Math.pow(params.decayRate, k);
        }
      } else if (params.type === "delayed") {
        const delay = params.delay ?? 1;
        for (let k = delay; k <= t; k++) {
          value += spend[t - k] * Math.pow(params.decayRate, k - delay + 1);
        }
      }
      result.push(Math.round(value * 100) / 100);
    }
    return result;
  }

  private saturationTransform(adstocked: number[], params: SaturationParams): number[] {
    return adstocked.map((x) => {
      if (params.type === "hill") {
        const xS = Math.max(x, 0);
        return xS > 0
          ? Math.round((xS ** params.slope / (xS ** params.slope + params.halfSaturation ** params.slope)) * 10000) / 10000
          : 0;
      }
      if (params.type === "adbudget") {
        return Math.round((1 - Math.exp(-x / params.halfSaturation)) * 10000) / 10000;
      }
      if (params.type === "log") {
        return x > 0 ? Math.round((Math.log(1 + x) / Math.log(1 + params.halfSaturation)) * 10000) / 10000 : 0;
      }
      return 0;
    });
  }

  private solveOLS(X: number[][], y: number[]): number[] {
    const n = X.length;
    const p = X[0].length;
    const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
    const Xty: number[] = new Array(p).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) {
        Xty[j] += X[i][j] * y[i];
        for (let k = 0; k < p; k++) {
          XtX[j][k] += X[i][j] * X[i][k];
        }
      }
    }
    for (let i = 0; i < p; i++) {
      XtX[i][i] += 1e-6;
    }
    return this.choleskySolve(XtX, Xty);
  }

  private choleskySolve(A: number[][], b: number[]): number[] {
    const n = A.length;
    const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
        if (i === j) L[i][j] = Math.sqrt(Math.max(A[i][i] - sum, 1e-10));
        else L[i][j] = (A[i][j] - sum) / L[j][j];
      }
    }
    const y: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let k = 0; k < i; k++) sum += L[i][k] * y[k];
      y[i] = (b[i] - sum) / L[i][i];
    }
    const x: number[] = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = 0;
      for (let k = i + 1; k < n; k++) sum += L[k][i] * x[k];
      x[i] = (y[i] - sum) / L[i][i];
    }
    return x;
  }

  private computeR2(actual: number[], predicted: number[]): number {
    const mean = actual.reduce((s, v) => s + v, 0) / actual.length;
    const ssRes = actual.reduce((s, v, i) => s + (v - predicted[i]) ** 2, 0);
    const ssTot = actual.reduce((s, v) => s + (v - mean) ** 2, 0);
    return ssTot > 0 ? Math.round((1 - ssRes / ssTot) * 10000) / 10000 : 0;
  }

  private estimateMarginalROAS(coefficient: number, saturationLevel: number, saturationParams: SaturationParams): number {
    if (saturationParams.type === "hill") {
      const s = saturationParams.slope;
      const h = saturationParams.halfSaturation;
      const derivative = (s * h ** s * saturationLevel ** (s - 1)) / ((saturationLevel ** s + h ** s) ** 2);
      return Math.round(coefficient * derivative * 100) / 100;
    }
    if (saturationParams.type === "adbudget") {
      const derivative = Math.exp(-saturationLevel / saturationParams.halfSaturation) / saturationParams.halfSaturation;
      return Math.round(coefficient * derivative * 100) / 100;
    }
    return Math.round((coefficient / (1 + saturationLevel)) * 100) / 100;
  }

  runMMM(input: MMMInput): MMMResult {
    const n = input.historicalData.length;
    const numChannels = input.channels.length;

    const spendMatrix: number[][] = input.channels.map(() => new Array(n).fill(0));
    for (let t = 0; t < n; t++) {
      for (let c = 0; c < numChannels; c++) {
        spendMatrix[c][t] = input.historicalData[t].spend[input.channels[c]] || 0;
      }
    }

    const adstockParams: Record<string, AdstockParams> = {};
    const saturationParams: Record<string, SaturationParams> = {};
    for (const ch of input.channels) {
      adstockParams[ch] = input.adstockParams?.[ch] ?? this.DEFAULT_ADSTOCK;
      saturationParams[ch] = input.saturationParams?.[ch] ?? this.DEFAULT_SATURATION;
    }

    const transformedMatrix: number[][] = input.channels.map((ch, c) => {
      const adstocked = this.adstockTransform(spendMatrix[c], adstockParams[ch]);
      return this.saturationTransform(adstocked, saturationParams[ch]);
    });

    const X: number[][] = transformedMatrix[0].map((_, t) => {
      const row: number[] = [1];
      for (let c = 0; c < numChannels; c++) {
        row.push(transformedMatrix[c][t]);
      }
      return row;
    });

    const y = input.historicalData.map((d) => d.revenue);
    const coefficients = this.solveOLS(X, y);
    const intercept = coefficients[0];
    const channelCoeffs = coefficients.slice(1);

    const totalSpend: Record<string, number> = {};
    for (const ch of input.channels) {
      totalSpend[ch] = Math.round(spendMatrix[input.channels.indexOf(ch)].reduce((s, v) => s + v, 0) * 100) / 100;
    }
    const totalRevenue = y.reduce((s, v) => s + v, 0);
    const totalSpendSum = Object.values(totalSpend).reduce((s, v) => s + v, 0);

    const contributions: ChannelContribution[] = input.channels.map((ch, c) => {
      const spend = totalSpend[ch];
      const carryover = transformedMatrix[c];
      const attributedRevenue = Math.round(carryover.reduce((s, v) => s + v * channelCoeffs[c], 0) * 100) / 100;
      const saturationLevel = carryover[carryover.length - 1];
      const marginalROAS = this.estimateMarginalROAS(channelCoeffs[c], saturationLevel, saturationParams[ch]);
      const basePerChannel = numChannels > 0 ? (intercept * n) / numChannels : intercept;
      const baseRevenue = Math.round(Math.max(0, Math.min(basePerChannel, attributedRevenue * 0.3)) * 100) / 100;
      const incrementalRevenue = Math.round((attributedRevenue - baseRevenue) * 100) / 100;
      const ROAS = spend > 0 ? Math.round((attributedRevenue / spend) * 100) / 100 : 0;
      const adstockEfficiency = spend > 0
        ? Math.round((carryover.reduce((s, v) => s + v, 0) / spendMatrix[c].reduce((s, v) => s + v, 0)) * 100) / 100
        : 0;

      return {
        channel: ch, totalSpend: spend, attributedRevenue, baseRevenue, incrementalRevenue,
        ROAS, marginalROAS, saturation: Math.round(saturationLevel * 10000) / 10000,
        adstockEfficiency,
        shareOfSpend: totalSpendSum > 0 ? Math.round((spend / totalSpendSum) * 10000) / 100 : 0,
        shareOfRevenue: totalRevenue > 0 ? Math.round((attributedRevenue / totalRevenue) * 10000) / 100 : 0,
      };
    });

    const predicted: number[] = X.map((row) => {
      let pred = intercept;
      for (let c = 0; c < numChannels; c++) pred += row[c + 1] * channelCoeffs[c];
      return pred;
    });

    const R2 = this.computeR2(y, predicted);
    const baseRevenue = Math.round(intercept * n * 100) / 100;
    const incrementalRevenue = Math.round(contributions.reduce((s, c) => s + c.incrementalRevenue, 0) * 100) / 100;

    return {
      contributions, totalRevenue, totalSpend: totalSpendSum, baseRevenue, incrementalRevenue,
      overallROAS: totalSpendSum > 0 ? Math.round((totalRevenue / totalSpendSum) * 100) / 100 : 0,
      R2, adstockParams, saturationParams,
    };
  }

  runScenario(mmmResult: MMMResult, scenario: ScenarioInput, baseSpend: Record<string, number>): ScenarioResult {
    const channelProjections = mmmResult.contributions.map((c) => {
      const pctChange = (scenario.budgetChanges[c.channel] ?? 0) / 100;
      const newSpend = baseSpend[c.channel] ?? 0;
      const spendMultiplier = 1 + pctChange;
      const saturationElasticity = Math.max(0, 1 - c.saturation);
      const revenueChange = spendMultiplier > 0
        ? c.attributedRevenue * (Math.pow(spendMultiplier, saturationElasticity * 0.5) - 1)
        : -c.attributedRevenue * 0.5;
      const projectedRevenue = Math.round(Math.max(0, c.attributedRevenue + revenueChange) * 100) / 100;
      const ROAS = newSpend * spendMultiplier > 0
        ? Math.round((projectedRevenue / (newSpend * spendMultiplier)) * 100) / 100
        : 0;
      return { channel: c.channel, spend: Math.round(newSpend * spendMultiplier * 100) / 100, revenue: projectedRevenue, ROAS };
    });

    const projectedRevenue = Math.round(channelProjections.reduce((s, p) => s + p.revenue, 0) * 100) / 100;
    const totalSpend = Math.round(channelProjections.reduce((s, p) => s + p.spend, 0) * 100) / 100;
    const baseRevenue = mmmResult.totalRevenue;
    const changeFromBase = baseRevenue > 0 ? Math.round(((projectedRevenue - baseRevenue) / baseRevenue) * 10000) / 100 : 0;

    return {
      name: scenario.name, projectedRevenue,
      projectedROAS: totalSpend > 0 ? Math.round((projectedRevenue / totalSpend) * 100) / 100 : 0,
      channelProjections, changeFromBase,
    };
  }

  generateSampleData(): MMMInput {
    const channels = ["google_ads", "meta_ads", "linkedin_ads", "tiktok_ads"];
    const historicalData: { week: number; spend: Record<string, number>; revenue: number }[] = [];
    for (let week = 1; week <= 52; week++) {
      const spend: Record<string, number> = {};
      for (const ch of channels) {
        const base = ch === "google_ads" ? 5000 : ch === "meta_ads" ? 4000 : ch === "linkedin_ads" ? 2000 : 3000;
        spend[ch] = Math.round(base * (1 + 0.3 * Math.sin(week / 8)) * (0.8 + Math.random() * 0.4) * 100) / 100;
      }
      const totalSpend = Object.values(spend).reduce((s, v) => s + v, 0);
      const revenue = Math.round((totalSpend * (3 + Math.random() * 2) + 5000 + Math.random() * 2000) * 100) / 100;
      historicalData.push({ week, spend, revenue });
    }
    return { channels, historicalData };
  }
}

export const marketingMixModelService = new MarketingMixModelService();
