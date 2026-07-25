interface ForecastPoint {
  date: string;
  actual?: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

interface ForecastResult {
  campaignId: string;
  metric: string;
  horizon: number;
  points: ForecastPoint[];
  model: { alpha: number; beta: number; gamma: number; mse: number };
  summary: {
    nextPeriod: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
    trend: "up" | "down" | "stable";
    projectedTotal: number;
    daysToThreshold?: { threshold: number; days: number };
  };
}

interface HistoricalPoint {
  date: string;
  value: number;
}

export class PredictiveForecastingService {
  /**
   * Triple Exponential Smoothing (Holt-Winters) for seasonal data.
   * Falls back to double/single smoothing when seasonality cannot be detected.
   */
  forecast(
    campaignId: string,
    metric: string,
    history: HistoricalPoint[],
    horizon: number = 30,
    options?: { alpha?: number; beta?: number; gamma?: number; seasonLength?: number; confidence?: number },
  ): ForecastResult {
    const n = history.length;
    if (n < 2) throw new Error("Need at least 2 historical data points");

    const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const values = sorted.map((p) => p.value);
    const alpha = options?.alpha ?? 0.3;
    const beta = options?.beta ?? 0.1;
    const gamma = options?.gamma ?? 0.1;
    const seasonLength = options?.seasonLength ?? this.detectSeasonality(values, 7);
    const confidence = options?.confidence ?? 0.95;

    const z = confidence >= 0.99 ? 2.576 : confidence >= 0.95 ? 1.96 : 1.645;

    let level = values[0];
    let trend = values.length > 1 ? values[1] - values[0] : 0;
    if (trend === 0) trend = 0.01;

    let seasonal: number[] = [];
    if (seasonLength > 1 && n >= 2 * seasonLength) {
      seasonal = this.initSeasonal(values, seasonLength);
    }

    const fitted: number[] = [];
    let mse = 0;

    for (let i = 0; i < n; i++) {
      let forecast: number;
      if (seasonal.length > 0) {
        const s = seasonal[i % seasonLength];
        forecast = level + trend + s;
        const newLevel = alpha * (values[i] - s) + (1 - alpha) * (level + trend);
        const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
        seasonal[i % seasonLength] = gamma * (values[i] - newLevel) + (1 - gamma) * s;
        level = newLevel;
        trend = newTrend;
      } else if (trend !== 0) {
        forecast = level + trend;
        level = alpha * values[i] + (1 - alpha) * (level + trend);
        trend = beta * (level - (i > 0 ? (fitted[i - 1] ?? level) : level - trend)) + (1 - beta) * trend;
      } else {
        forecast = level;
        level = alpha * values[i] + (1 - alpha) * level;
      }
      fitted.push(forecast);
      const err = values[i] - forecast;
      mse += err * err;
    }
    mse /= n;
    const rmse = Math.sqrt(mse);

    const lastDate = new Date(sorted[sorted.length - 1].date);
    const points: ForecastPoint[] = sorted.map((p, i) => ({
      date: p.date,
      actual: p.value,
      predicted: Math.max(0, Math.round(fitted[i] * 100) / 100),
      lowerBound: Math.max(0, Math.round((fitted[i] - z * rmse) * 100) / 100),
      upperBound: Math.round((fitted[i] + z * rmse) * 100) / 100,
    }));

    const future: ForecastPoint[] = [];
    let nextLevel = level;
    let nextTrend = trend;

    for (let i = 1; i <= horizon; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      let pred: number;
      if (seasonal.length > 0) {
        const s = seasonal[(n + i - 1) % seasonLength];
        pred = nextLevel + nextTrend + s;
        const newLevel = alpha * (pred - s) + (1 - alpha) * (nextLevel + nextTrend);
        nextTrend = beta * (newLevel - nextLevel) + (1 - beta) * nextTrend;
        nextLevel = newLevel;
      } else {
        pred = nextLevel + nextTrend;
        nextLevel = alpha * pred + (1 - alpha) * (nextLevel + nextTrend);
        nextTrend = beta * (nextLevel - (nextLevel - nextTrend)) + (1 - beta) * nextTrend;
      }
      pred = Math.max(0, pred);
      future.push({
        date: dateStr,
        predicted: Math.round(pred * 100) / 100,
        lowerBound: Math.max(0, Math.round((pred - z * rmse) * 100) / 100),
        upperBound: Math.round((pred + z * rmse) * 100) / 100,
      });
    }

    const nextPeriod = future[0].predicted;
    const totalActual = values.reduce((a, b) => a + b, 0);
    const totalFuture = future.reduce((a, p) => a + p.predicted, 0);
    const projectedTotal = totalActual + totalFuture;

    const trendValue = values.length >= 7
      ? values.slice(-7).reduce((a, b) => a + b, 0) / 7 - values.slice(0, 7).reduce((a, b) => a + b, 0) / 7
      : 0;
    const trend_direction: "up" | "down" | "stable" = trendValue > 0.05 * (values.reduce((a, b) => a + b, 0) / values.length) ? "up" : trendValue < -0.05 * (values.reduce((a, b) => a + b, 0) / values.length) ? "down" : "stable";

    const totalSpend = values.reduce((a, b) => a + b, 0);
    const avgDaily = totalSpend / n;
    const projectedDaily = future.reduce((a, p) => a + p.predicted, 0) / horizon;

    return {
      campaignId,
      metric,
      horizon,
      points: [...points, ...future],
      model: { alpha, beta, gamma, mse: Math.round(mse * 100) / 100 },
      summary: {
        nextPeriod,
        lowerBound: future[0].lowerBound,
        upperBound: future[0].upperBound,
        confidence,
        trend: trend_direction,
        projectedTotal: Math.round(projectedTotal * 100) / 100,
      },
    };
  }

  forecastBudget(
    campaignId: string,
    totalBudget: number,
    startDate: string,
    endDate: string,
    dailySpend: number[],
  ): {
    projectedEndSpend: number;
    projectedUtilization: number;
    willOverspend: boolean;
    willUnderutilize: boolean;
    recommendedDailyCap: number;
    daysRemaining: number;
    dailyProjections: { date: string; predictedSpend: number; cumulative: number; remaining: number }[];
  } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (86400000));
    const elapsedDays = dailySpend.length;
    const remainingDays = totalDays - elapsedDays;
    const spentSoFar = dailySpend.reduce((a, b) => a + b, 0);

    const avgDaily = dailySpend.length > 0 ? spentSoFar / dailySpend.length : 0;

    const result = this.forecast(campaignId, "spend", dailySpend.map((v, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return { date: d.toISOString().split("T")[0], value: v };
    }), remainingDays);

    const projectedEndSpend = result.summary.projectedTotal;
    const projectedUtilization = Math.round((projectedEndSpend / totalBudget) * 10000) / 100;
    const willOverspend = projectedEndSpend > totalBudget;
    const willUnderutilize = projectedEndSpend < totalBudget * 0.7;

    const dailyProjections = result.points.slice(-remainingDays).map((p) => {
      const cumIdx = dailyProjectionsCache.length > 0 ? dailyProjectionsCache[dailyProjectionsCache.length - 1].cumulative : spentSoFar;
      return { date: p.date, predictedSpend: p.predicted, cumulative: cumIdx + p.predicted, remaining: totalBudget - cumIdx - p.predicted };
    });
    const dailyProjectionsCache: { date: string; predictedSpend: number; cumulative: number; remaining: number }[] = [];

    return {
      projectedEndSpend: Math.round(projectedEndSpend * 100) / 100,
      projectedUtilization,
      willOverspend,
      willUnderutilize,
      recommendedDailyCap: Math.round(((totalBudget - spentSoFar) / Math.max(remainingDays, 1)) * 100) / 100,
      daysRemaining: remainingDays,
      dailyProjections,
    };
  }

  predictConversions(
    campaignId: string,
    spendHistory: number[],
    conversionHistory: number[],
    futureSpend: number[],
  ): { predictedConversions: number; efficiencyScore: number; marginalCPA: number; diminishingReturns: boolean } {
    const n = Math.min(spendHistory.length, conversionHistory.length);
    if (n < 3) return { predictedConversions: 0, efficiencyScore: 0, marginalCPA: 0, diminishingReturns: false };

    const spendX = spendHistory.slice(0, n);
    const convY = conversionHistory.slice(0, n);
    const sumX = spendX.reduce((a, b) => a + b, 0);
    const sumY = convY.reduce((a, b) => a + b, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;

    const slope = spendX.reduce((num, x, i) => num + (x - meanX) * (convY[i] - meanY), 0)
      / Math.max(spendX.reduce((den, x) => den + (x - meanX) ** 2, 0), 1);

    const intercept = meanY - slope * meanX;
    const rSquared = this.calculateRSquared(spendX, convY, slope, intercept, meanY);

    const predictedFromFuture = futureSpend.map((s) => Math.max(0, slope * s + intercept));
    const totalPredicted = predictedFromFuture.reduce((a, b) => a + b, 0);
    const totalFutureCost = futureSpend.reduce((a, b) => a + b, 0);

    const marginalCPA = totalFutureCost > 0 && totalPredicted > 0 ? totalFutureCost / totalPredicted : 0;

    const recentSlope = n >= 5
      ? this.calculateSlope(spendX.slice(-5), convY.slice(-5))
      : slope;

    return {
      predictedConversions: Math.round(totalPredicted),
      efficiencyScore: Math.round(rSquared * 100),
      marginalCPA: Math.round(marginalCPA * 100) / 100,
      diminishingReturns: recentSlope < slope * 0.7,
    };
  }

  private detectSeasonality(values: number[], minSeason: number): number {
    const n = values.length;
    if (n < 2 * minSeason) return 1;
    let bestPeriod = 1;
    let bestAcf = 0;
    for (let p = minSeason; p <= Math.min(n / 2, 28); p++) {
      const acf = this.autocorrelation(values, p);
      if (acf > bestAcf) { bestAcf = acf; bestPeriod = p; }
    }
    return bestAcf > 0.3 ? bestPeriod : 1;
  }

  private autocorrelation(values: number[], lag: number): number {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n - lag; i++) {
      num += (values[i] - mean) * (values[i + lag] - mean);
    }
    for (let i = 0; i < n; i++) {
      den += (values[i] - mean) ** 2;
    }
    return den === 0 ? 0 : num / den;
  }

  private initSeasonal(values: number[], seasonLength: number): number[] {
    const n = values.length;
    const seasonal: number[] = new Array(seasonLength).fill(0);
    const cycles = Math.floor(n / seasonLength);
    if (cycles < 2) return seasonal;
    for (let i = 0; i < seasonLength; i++) {
      let sum = 0, count = 0;
      for (let j = 0; j < cycles; j++) {
        sum += values[j * seasonLength + i];
        count++;
      }
      seasonal[i] = sum / count - values.slice(0, n).reduce((a, b) => a + b, 0) / n;
    }
    return seasonal;
  }

  private calculateSlope(x: number[], y: number[]): number {
    const n = x.length;
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;
    return x.reduce((num, xi, i) => num + (xi - mx) * (y[i] - my), 0)
      / Math.max(x.reduce((den, xi) => den + (xi - mx) ** 2, 0), 1);
  }

  private calculateRSquared(x: number[], y: number[], slope: number, intercept: number, meanY: number): number {
    const ssRes = x.reduce((sum, xi, i) => sum + (y[i] - (slope * xi + intercept)) ** 2, 0);
    const ssTot = y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0);
    return ssTot === 0 ? 0 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));
  }
}

export const predictiveForecastingService = new PredictiveForecastingService();
