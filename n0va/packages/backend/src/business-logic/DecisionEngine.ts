export type ScoreBand = "excellent" | "good" | "fair" | "poor" | "critical";

export interface ScoredDecision<T> {
  item: T;
  score: number;
  band: ScoreBand;
  label: string;
}

export class DecisionEngine {
  band(score: number, thresholds?: { excellent?: number; good?: number; fair?: number; poor?: number }): ScoreBand {
    const t = { excellent: 90, good: 70, fair: 50, poor: 25, ...thresholds };
    if (score >= t.excellent) return "excellent";
    if (score >= t.good) return "good";
    if (score >= t.fair) return "fair";
    if (score >= t.poor) return "poor";
    return "critical";
  }

  label(band: ScoreBand): string {
    const labels: Record<ScoreBand, string> = { excellent: "Excellent", good: "Good", fair: "Fair", poor: "Poor", critical: "Critical" };
    return labels[band];
  }

  weightedScore(components: { value: number; weight: number; min?: number; max?: number }[]): number {
    let total = 0, weightSum = 0;
    for (const c of components) {
      let v = c.value;
      if (c.min !== undefined) v = Math.max(c.min, v);
      if (c.max !== undefined) v = Math.min(c.max, v);
      total += v * c.weight;
      weightSum += c.weight;
    }
    return weightSum > 0 ? Math.round((total / weightSum) * 100) / 100 : 0;
  }

  sigmoid(x: number, midpoint = 0, steepness = 1): number {
    return 1 / (1 + Math.exp(-steepness * (x - midpoint)));
  }

  percentileRank(values: number[], value: number): number {
    if (values.length === 0) return 50;
    const countBelow = values.filter(v => v < value).length;
    return Math.round((countBelow / values.length) * 10000) / 100;
  }

  zScore(value: number, mean: number, stdDev: number): number {
    return stdDev > 0 ? (value - mean) / stdDev : 0;
  }

  normalCdf(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x) / Math.sqrt(2);
    const t = 1 / (1 + p * absX);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return 0.5 * (1 + sign * y);
  }

  scoreAndBand<T>(item: T, score: number): ScoredDecision<T> {
    return { item, score, band: this.band(score), label: this.label(this.band(score)) };
  }

  cagr(initialValue: number, finalValue: number, periods: number): number {
    if (initialValue <= 0 || periods <= 0) return 0;
    return Math.pow(finalValue / initialValue, 1 / periods) - 1;
  }

  movingAverage(values: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = values.slice(start, i + 1);
      result.push(slice.reduce((s, v) => s + v, 0) / slice.length);
    }
    return result;
  }

  forecastLinear(values: number[], steps: number): { values: number[]; slope: number; intercept: number; rSquared: number } {
    const n = values.length;
    if (n < 2) return { values: Array(steps).fill(values[0] || 0), slope: 0, intercept: values[0] || 0, rSquared: 0 };
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { const xd = i - xMean; num += xd * (values[i] - yMean); den += xd * xd; }
    const slope = den !== 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;
    const projected: number[] = [];
    for (let i = 1; i <= steps; i++) projected.push(Math.max(0, intercept + slope * (n - 1 + i)));
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) { const f = intercept + slope * i; ssRes += (values[i] - f) ** 2; ssTot += (values[i] - yMean) ** 2; }
    return { values: projected, slope: Math.round(slope * 10000) / 10000, intercept: Math.round(intercept * 10000) / 10000, rSquared: ssTot > 0 ? Math.round((1 - ssRes / ssTot) * 10000) / 10000 : 0 };
  }

  hhi(shares: number[]): number {
    const total = shares.reduce((s, v) => s + v, 0);
    if (total <= 0) return 0;
    return Math.round(shares.reduce((s, v) => s + Math.pow(v / total * 100, 2), 0) * 100) / 100;
  }

  gini(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    if (n === 0 || sorted[n - 1] === 0) return 0;
    let cum = 0;
    for (let i = 0; i < n; i++) cum += sorted[i] * (i + 1);
    return Math.round(((2 * cum) / (n * sorted.reduce((s, v) => s + v, 0)) - (n + 1) / n) * 10000) / 10000;
  }

  comparePeriods<T extends Record<string, number>>(recent: T, prior: T, fields: (keyof T)[]): { field: string; recent: number; prior: number; change: number; changePercent: number; direction: "up" | "down" | "stable" }[] {
    return fields.map(f => {
      const r = recent[f] || 0;
      const p = prior[f] || 0;
      const change = r - p;
      const changePercent = p > 0 ? Math.round((change / p) * 10000) / 100 : 0;
      const direction = changePercent > 10 ? "up" : changePercent < -10 ? "down" : "stable";
      return { field: f as string, recent: r, prior: p, change: Math.round(change * 100) / 100, changePercent, direction };
    });
  }
}

export const decisionEngine = new DecisionEngine();
