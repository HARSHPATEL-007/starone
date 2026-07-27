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

interface DecomposedComponents {
  trend: number[];
  seasonal: number[];
  residual: number[];
  seasonalStrength: number;
  trendStrength: number;
}

interface Changepoint {
  index: number;
  date: string;
  meanBefore: number;
  meanAfter: number;
  magnitude: number;
  direction: "up" | "down";
}

interface ARIMAResult {
  campaignId: string;
  metric: string;
  horizon: number;
  points: ForecastPoint[];
  model: { p: number; d: number; q: number; aic: number; mse: number };
  coefficients: { ar: number[]; ma: number[]; constant: number };
  summary: {
    nextPeriod: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
    trend: "up" | "down" | "stable";
  };
}

interface EnsembleForecastResult {
  campaignId: string;
  metric: string;
  horizon: number;
  models: { name: string; weight: number; mse: number }[];
  points: ForecastPoint[];
  weights: number[];
  summary: {
    nextPeriod: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
    trend: "up" | "down" | "stable";
  };
}

export class PredictiveForecastingService {
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
    const avgVal = values.reduce((a, b) => a + b, 0) / values.length;
    const trend_direction: "up" | "down" | "stable" = trendValue > 0.05 * avgVal ? "up" : trendValue < -0.05 * avgVal ? "down" : "stable";

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

    const result = this.forecast(campaignId, "spend", dailySpend.map((v, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return { date: d.toISOString().split("T")[0], value: v };
    }), remainingDays);

    const projectedEndSpend = result.summary.projectedTotal;
    const projectedUtilization = Math.round((projectedEndSpend / totalBudget) * 10000) / 100;
    const willOverspend = projectedEndSpend > totalBudget;
    const willUnderutilize = projectedEndSpend < totalBudget * 0.7;

    const cache: { date: string; predictedSpend: number; cumulative: number; remaining: number }[] = [];
    const dailyProjections = result.points.slice(-remainingDays).map((p) => {
      const cum = cache.length > 0 ? cache[cache.length - 1].cumulative : spentSoFar;
      const entry = { date: p.date, predictedSpend: p.predicted, cumulative: cum + p.predicted, remaining: totalBudget - cum - p.predicted };
      cache.push(entry);
      return entry;
    });

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

  decomposeTimeSeries(values: number[], seasonLength: number = 7): DecomposedComponents {
    const n = values.length;
    if (n < seasonLength * 2) {
      const mean = values.reduce((a, b) => a + b, 0) / n;
      return { trend: values.map(() => mean), seasonal: new Array(n).fill(0), residual: values.map((v) => v - mean), seasonalStrength: 0, trendStrength: 0 };
    }

    const trend: number[] = [];
    const halfWindow = Math.min(Math.floor(n / 4), 7);
    for (let i = 0; i < n; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(n, i + halfWindow + 1);
      trend.push(values.slice(start, end).reduce((a, b) => a + b, 0) / (end - start));
    }

    const detrended = values.map((v, i) => v - trend[i]);

    const seasonal = new Array(n).fill(0);
    const seasonCounts = new Array(seasonLength).fill(0);
    const seasonSums = new Array(seasonLength).fill(0);
    for (let i = 0; i < n; i++) {
      seasonSums[i % seasonLength] += detrended[i];
      seasonCounts[i % seasonLength]++;
    }
    const seasonalPattern = seasonSums.map((s, i) => (seasonCounts[i] > 0 ? s / seasonCounts[i] : 0));
    const patternMean = seasonalPattern.reduce((a, b) => a + b, 0) / seasonLength;
    const centeredPattern = seasonalPattern.map((s) => s - patternMean);

    for (let i = 0; i < n; i++) {
      seasonal[i] = centeredPattern[i % seasonLength];
    }

    const residual = values.map((v, i) => v - trend[i] - seasonal[i]);

    const totalVar = values.reduce((s, v) => s + (v - values.reduce((a, b) => a + b, 0) / n) ** 2, 0);
    const residualVar = residual.reduce((s, v) => s + v * v, 0);
    const seasonalVar = seasonal.reduce((s, v) => s + v * v, 0);
    const trendVar = trend.reduce((s, v) => s + (v - trend.reduce((a, b) => a + b, 0) / n) ** 2, 0);

    const seasonalStrength = totalVar > 0 ? Math.min(1, Math.max(0, 1 - residualVar / (seasonalVar + residualVar + 1e-10))) : 0;
    const trendStrength = totalVar > 0 ? Math.min(1, Math.max(0, 1 - residualVar / (trendVar + residualVar + 1e-10))) : 0;

    return { trend, seasonal, residual, seasonalStrength, trendStrength };
  }

  detectChangepoints(values: number[], minSegmentSize: number = 5): Changepoint[] {
    const n = values.length;
    if (n < minSegmentSize * 2 + 2) return [];

    const changepoints: Changepoint[] = [];
    const overallMean = values.reduce((a, b) => a + b, 0) / n;

    let cumsum = 0;
    let maxCumsum = 0;
    let candidateIdx = -1;

    for (let i = 0; i < n; i++) {
      cumsum += values[i] - overallMean;
      if (Math.abs(cumsum) > Math.abs(maxCumsum) && i >= minSegmentSize && i <= n - minSegmentSize) {
        maxCumsum = cumsum;
        candidateIdx = i;
      }
    }

    if (candidateIdx >= minSegmentSize && candidateIdx <= n - minSegmentSize) {
      const before = values.slice(0, candidateIdx + 1);
      const after = values.slice(candidateIdx + 1);
      const meanBefore = before.reduce((a, b) => a + b, 0) / before.length;
      const meanAfter = after.reduce((a, b) => a + b, 0) / after.length;
      const magnitude = Math.abs(meanAfter - meanBefore);
      const direction: "up" | "down" = meanAfter > meanBefore ? "up" : "down";

      if (magnitude > 0.05 * Math.abs(overallMean)) {
        changepoints.push({
          index: candidateIdx,
          date: String(candidateIdx),
          meanBefore: Math.round(meanBefore * 100) / 100,
          meanAfter: Math.round(meanAfter * 100) / 100,
          magnitude: Math.round(magnitude * 100) / 100,
          direction,
        });
      }
    }

    return changepoints;
  }

  arimaForecast(
    campaignId: string,
    metric: string,
    history: HistoricalPoint[],
    horizon: number = 30,
    options?: { p?: number; d?: number; q?: number; confidence?: number },
  ): ARIMAResult {
    const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let values = sorted.map((p) => p.value);
    const n = values.length;
    if (n < 4) throw new Error("Need at least 4 data points for ARIMA");

    const p = options?.p ?? 2;
    const d = options?.d ?? 1;
    const q = options?.q ?? 2;
    const confidence = options?.confidence ?? 0.95;
    const z = confidence >= 0.99 ? 2.576 : confidence >= 0.95 ? 1.96 : 1.645;

    let differenced = [...values];
    for (let di = 0; di < d; di++) {
      differenced = differenced.slice(1).map((v, i) => v - differenced[i]);
    }
    const diffN = differenced.length;

    const mean = differenced.reduce((a, b) => a + b, 0) / diffN;
    const centered = differenced.map((v) => v - mean);

    const arCoeffs: number[] = new Array(p).fill(0);
    if (p > 0 && diffN > p * 2) {
      for (let i = 0; i < p; i++) {
        let num = 0, den = 0;
        for (let j = p; j < diffN; j++) {
          num += centered[j] * centered[j - i - 1];
          den += centered[j - i - 1] ** 2;
        }
        arCoeffs[i] = den > 0 ? num / den : 0;
      }
    }

    const maCoeffs: number[] = new Array(q).fill(0);
    const residuals: number[] = new Array(diffN).fill(0);
    for (let i = 0; i < diffN; i++) {
      let predicted = mean;
      for (let j = 0; j < Math.min(p, i); j++) {
        predicted += arCoeffs[j] * centered[i - j - 1];
      }
      for (let j = 0; j < Math.min(q, i); j++) {
        predicted += maCoeffs[j] * residuals[i - j - 1];
      }
      residuals[i] = centered[i] - predicted + mean;
    }

    const mse = residuals.reduce((s, r) => s + r * r, 0) / diffN;
    const numParams = p + q + 1;
    const aic = diffN > 0 ? diffN * Math.log(mse) + 2 * numParams : 0;

    const fitted: number[] = [];
    let cumError = 0;
    for (let i = 0; i < n; i++) {
      if (i < d) {
        fitted.push(values[i]);
        continue;
      }
      const diffIdx = i - d;
      let pred = mean;
      for (let j = 0; j < Math.min(p, diffIdx); j++) {
        pred += arCoeffs[j] * centered[diffIdx - j - 1];
      }
      for (let j = 0; j < Math.min(q, diffIdx); j++) {
        pred += maCoeffs[j] * residuals[diffIdx - j - 1];
      }

      let accumulated = pred + mean;
      for (let di = 0; di < d; di++) {
        accumulated += i - di - 1 >= 0 ? values[i - di - 1] : 0;
      }
      fitted.push(Math.max(0, accumulated));
      const err = values[i] - fitted[i];
      cumError += err * err;
    }
    const fitMse = cumError / n;
    const rmse = Math.sqrt(fitMse);

    const lastDate = new Date(sorted[sorted.length - 1].date);
    const points: ForecastPoint[] = sorted.map((p, i) => ({
      date: p.date,
      actual: p.value,
      predicted: Math.max(0, Math.round(fitted[i] * 100) / 100),
      lowerBound: Math.max(0, Math.round((fitted[i] - z * rmse) * 100) / 100),
      upperBound: Math.round((fitted[i] + z * rmse) * 100) / 100,
    }));

    const future: ForecastPoint[] = [];
    const lastValues = values.slice(-Math.max(p, d));
    for (let i = 1; i <= horizon; i++) {
      const d2 = new Date(lastDate);
      d2.setDate(d2.getDate() + i);
      const dateStr = d2.toISOString().split("T")[0];

      let pred = mean;
      const recentVals = [...lastValues, ...future.map((f) => f.predicted)];
      const centeredRecent = recentVals.map((v) => v - mean);

      for (let j = 0; j < Math.min(p, recentVals.length); j++) {
        pred += arCoeffs[j] * (centeredRecent[centeredRecent.length - j - 1] || 0);
      }
      for (let j = 0; j < Math.min(q, residuals.length); j++) {
        pred += maCoeffs[j] * (residuals[residuals.length - j - 1] || 0);
      }

      let accumulated = pred + mean;
      for (let di = 0; di < d; di++) {
        accumulated += recentVals[recentVals.length - di - 1] || 0;
      }
      accumulated = Math.max(0, accumulated);

      future.push({
        date: dateStr,
        predicted: Math.round(accumulated * 100) / 100,
        lowerBound: Math.max(0, Math.round((accumulated - z * rmse) * 100) / 100),
        upperBound: Math.round((accumulated + z * rmse) * 100) / 100,
      });
    }

    const recentAvg = values.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, values.length);
    const earlyAvg = values.slice(0, Math.min(7, values.length)).reduce((a, b) => a + b, 0) / Math.min(7, values.length);
    const trend_dir: "up" | "down" | "stable" = recentAvg > earlyAvg * 1.05 ? "up" : recentAvg < earlyAvg * 0.95 ? "down" : "stable";

    return {
      campaignId,
      metric,
      horizon,
      points: [...points, ...future],
      model: { p, d, q, aic: Math.round(aic * 100) / 100, mse: Math.round(fitMse * 100) / 100 },
      coefficients: {
        ar: arCoeffs.map((c) => Math.round(c * 1000) / 1000),
        ma: maCoeffs.map((c) => Math.round(c * 1000) / 1000),
        constant: Math.round(mean * 100) / 100,
      },
      summary: {
        nextPeriod: future[0]?.predicted || 0,
        lowerBound: future[0]?.lowerBound || 0,
        upperBound: future[0]?.upperBound || 0,
        confidence,
        trend: trend_dir,
      },
    };
  }

  ensembleForecast(
    campaignId: string,
    metric: string,
    history: HistoricalPoint[],
    horizon: number = 30,
    options?: { confidence?: number },
  ): EnsembleForecastResult {
    const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const values = sorted.map((p) => p.value);
    const n = values.length;
    const confidence = options?.confidence ?? 0.95;

    const models: { name: string; weight: number; mse: number }[] = [];
    let predictions: number[][] = [];

    try {
      const hw = this.forecast(campaignId, metric, history, horizon, { confidence });
      const hwMse = hw.model.mse;
      const hwFcst = hw.points.slice(-horizon).map((p) => p.predicted);
      const hwWeight = hwMse > 0 ? 1 / hwMse : 1;
      models.push({ name: "holt-winters", weight: hwWeight, mse: hwMse });
      predictions.push(hwFcst);
    } catch { models.push({ name: "holt-winters", weight: 0.1, mse: 999 }); predictions.push(new Array(horizon).fill(0)); }

    try {
      const ar = this.arimaForecast(campaignId, metric, history, horizon, { p: 2, d: 1, q: 2, confidence });
      const arMse = ar.model.mse;
      const arFcst = ar.points.slice(-horizon).map((p) => p.predicted);
      const arWeight = arMse > 0 ? 1 / arMse : 1;
      models.push({ name: "arima", weight: arWeight, mse: arMse });
      predictions.push(arFcst);
    } catch { models.push({ name: "arima", weight: 0.1, mse: 999 }); predictions.push(new Array(horizon).fill(0)); }

    const naiveFcst = new Array(horizon).fill(values[values.length - 1]);
    const naiveMse = values.slice(1).reduce((s, v, i) => s + (v - values[i]) ** 2, 0) / Math.max(1, values.length - 1);
    models.push({ name: "naive", weight: naiveMse > 0 ? 1 / naiveMse : 0.1, mse: naiveMse });
    predictions.push(naiveFcst);

    if (n >= 14) {
      const weeklyAvg = values.slice(-7).reduce((a, b) => a + b, 0) / 7;
      const seasonalNaive = new Array(horizon).fill(0).map((_, i) => {
        const idx = Math.max(0, values.length - 7 + (i % 7));
        return values[idx] || weeklyAvg;
      });
      const snMse = values.slice(7).reduce((s, v, i) => s + (v - values[i]) ** 2, 0) / Math.max(1, values.length - 7);
      models.push({ name: "seasonal-naive", weight: snMse > 0 ? 1 / snMse : 0.1, mse: snMse });
      predictions.push(seasonalNaive);
    }

    const totalWeight = models.reduce((s, m) => s + m.weight, 0);
    const normalizedModels = models.map((m) => ({ ...m, weight: totalWeight > 0 ? m.weight / totalWeight : 1 / models.length }));

    const lastDate = new Date(sorted[sorted.length - 1].date);
    const ensemblePoints: ForecastPoint[] = [];

    const latestValues = values.slice(-7);
    const recentMean = latestValues.reduce((a, b) => a + b, 0) / latestValues.length;
    const residualStd = Math.sqrt(latestValues.reduce((s, v) => s + (v - recentMean) ** 2, 0) / latestValues.length);
    const z = confidence >= 0.99 ? 2.576 : confidence >= 0.95 ? 1.96 : 1.645;

    for (let i = 0; i < horizon; i++) {
      const d3 = new Date(lastDate);
      d3.setDate(d3.getDate() + i + 1);
      const dateStr = d3.toISOString().split("T")[0];

      let ensemblePred = 0;
      for (let m = 0; m < predictions.length; m++) {
        ensemblePred += normalizedModels[m].weight * predictions[m][i];
      }
      const spread = residualStd * Math.sqrt(1 + i * 0.1);

      ensemblePoints.push({
        date: dateStr,
        predicted: Math.max(0, Math.round(ensemblePred * 100) / 100),
        lowerBound: Math.max(0, Math.round((ensemblePred - z * spread) * 100) / 100),
        upperBound: Math.round((ensemblePred + z * spread) * 100) / 100,
      });
    }

    const allPreds = values.slice(-7).concat(ensemblePoints.slice(0, 7).map((p) => p.predicted));
    const epAvg = allPreds.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const epEarly = allPreds.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
    const trend_dir: "up" | "down" | "stable" = epAvg > epEarly * 1.05 ? "up" : epAvg < epEarly * 0.95 ? "down" : "stable";

    return {
      campaignId,
      metric,
      horizon,
      models: normalizedModels.map((m) => ({ name: m.name, weight: Math.round(m.weight * 1000) / 1000, mse: Math.round(m.mse * 100) / 100 })),
      points: ensemblePoints,
      weights: normalizedModels.map((m) => Math.round(m.weight * 1000) / 1000),
      summary: {
        nextPeriod: ensemblePoints[0]?.predicted || 0,
        lowerBound: ensemblePoints[0]?.lowerBound || 0,
        upperBound: ensemblePoints[0]?.upperBound || 0,
        confidence,
        trend: trend_dir,
      },
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
    const overallMean = values.reduce((a, b) => a + b, 0) / n;
    for (let i = 0; i < seasonLength; i++) {
      let sum = 0, count = 0;
      for (let j = 0; j < cycles; j++) {
        sum += values[j * seasonLength + i];
        count++;
      }
      seasonal[i] = count > 0 ? sum / count - overallMean : 0;
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
