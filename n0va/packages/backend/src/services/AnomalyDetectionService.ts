interface AnomalyPoint {
  date: string;
  value: number;
  expected: number;
  deviation: number;
  zScore: number;
  severity: "low" | "medium" | "high" | "critical";
  direction: "spike" | "drop" | "normal";
  flagged: boolean;
}

interface AnomalyResult {
  metric: string;
  entityId: string;
  points: AnomalyPoint[];
  summary: {
    totalPoints: number;
    flaggedCount: number;
    flagRate: number;
    highestZScore: number;
    dominantDirection: "spike" | "drop" | "normal";
    dominantSeverity: string;
    recommendation: string;
  };
  changepoints?: { index: number; meanBefore: number; meanAfter: number; severity: string }[];
}

interface DetectionConfig {
  zThreshold?: number;
  minPoints?: number;
  smoothingWindow?: number;
  useSeasonalBaseline?: boolean;
  seasonLength?: number;
  method?: "zscore" | "esd" | "iqr" | "cusum" | "isolation-forest" | "multivariate" | "drift";
  alpha?: number;
  maxOutliers?: number;
  contamination?: number;
}

interface IsolationForestResult {
  anomalyScore: number;
  pathLength: number;
  averagePathLength: number;
  isOutlier: boolean;
}

interface MultivariateAnomalyResult {
  metric: string;
  entityId: string;
  timestamps: string[];
  scores: { date: string; mahalanobis: number; chi2Critical: number; flagged: boolean; contributingMetrics: string[] }[];
  summary: { totalFlagged: number; flagRate: number; topContributors: string[] };
}

interface DriftDetectionResult {
  metric: string;
  entityId: string;
  hasDrifted: boolean;
  driftScore: number;
  pValue: number;
  windowBefore: { mean: number; std: number; size: number };
  windowAfter: { mean: number; std: number; size: number };
  driftType: "mean-shift" | "variance-shift" | "distribution-shift" | "none";
  detectedAt: string;
}

export class AnomalyDetectionService {
  detect(
    metric: string,
    entityId: string,
    values: { date: string; value: number }[],
    config?: DetectionConfig,
  ): AnomalyResult {
    const sorted = [...values].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const method = config?.method || "zscore";
    const minPoints = config?.minPoints ?? 7;

    if (sorted.length < minPoints) {
      return this.insufficientData(metric, entityId, sorted, minPoints);
    }

    switch (method) {
      case "esd": return this.esdDetect(metric, entityId, sorted, config);
      case "iqr": return this.iqrDetect(metric, entityId, sorted, config);
      case "cusum": return this.cusumDetect(metric, entityId, sorted, config);
      case "isolation-forest": return this.isolationForestDetect(metric, entityId, sorted, config);
      default: return this.zscoreDetect(metric, entityId, sorted, config);
    }
  }

  detectMultivariate(
    metric: string,
    entityId: string,
    timeSeries: { date: string; metrics: Record<string, number> }[],
    alpha: number = 0.01,
  ): MultivariateAnomalyResult {
    const n = timeSeries.length;
    if (n < 5) return { metric, entityId, timestamps: [], scores: [], summary: { totalFlagged: 0, flagRate: 0, topContributors: [] } };

    const metricNames = [...new Set(timeSeries.flatMap((t) => Object.keys(t.metrics)))];
    const values = timeSeries.map((t) => metricNames.map((m) => t.metrics[m] || 0));

    const means = metricNames.map((_, j) => values.reduce((s, row) => s + row[j], 0) / n);
    const centered = values.map((row) => row.map((v, j) => v - means[j]));

    const cov: number[][] = metricNames.map(() => new Array(metricNames.length).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < metricNames.length; j++) {
        for (let k = 0; k < metricNames.length; k++) {
          cov[j][k] += centered[i][j] * centered[i][k];
        }
      }
    }
    for (let j = 0; j < metricNames.length; j++) {
      for (let k = 0; k < metricNames.length; k++) {
        cov[j][k] /= (n - 1);
        if (j === k && cov[j][k] < 1e-10) cov[j][k] = 1e-10;
      }
    }

    const invCov = this.invertMatrix(cov);

    const chi2Critical = this.chi2Critical(metricNames.length, alpha);
    const scores: { date: string; mahalanobis: number; chi2Critical: number; flagged: boolean; contributingMetrics: string[] }[] = [];
    let totalFlagged = 0;
    const contributorCounts = new Map<string, number>();

    for (let t = 0; t < n; t++) {
      const diff = centered[t];
      let md2 = 0;
      for (let i = 0; i < metricNames.length; i++) {
        for (let j = 0; j < metricNames.length; j++) {
          md2 += diff[i] * invCov[i][j] * diff[j];
        }
      }
      const md = Math.sqrt(md2);

      const contributions = metricNames.map((name, i) => ({ name, val: Math.abs(diff[i] * Math.sqrt(invCov[i][i])) }));
      contributions.sort((a, b) => b.val - a.val);
      const topContribs = contributions.slice(0, 3).map((c) => c.name);
      for (const tc of topContribs) contributorCounts.set(tc, (contributorCounts.get(tc) || 0) + 1);

      const flagged = md > Math.sqrt(chi2Critical);
      if (flagged) totalFlagged++;

      scores.push({
        date: timeSeries[t].date,
        mahalanobis: Math.round(md * 100) / 100,
        chi2Critical: Math.round(chi2Critical * 100) / 100,
        flagged,
        contributingMetrics: topContribs,
      });
    }

    const sortedContribs = [...contributorCounts.entries()].sort((a, b) => b[1] - a[1]);

    return {
      metric,
      entityId,
      timestamps: timeSeries.map((t) => t.date),
      scores,
      summary: {
        totalFlagged,
        flagRate: Math.round((totalFlagged / n) * 10000) / 100,
        topContributors: sortedContribs.map(([name]) => name),
      },
    };
  }

  detectDrift(
    metric: string,
    entityId: string,
    values: { date: string; value: number }[],
    windowSize: number = 14,
    alpha: number = 0.05,
  ): DriftDetectionResult {
    const sorted = [...values].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const n = sorted.length;
    if (n < windowSize * 2) {
      return {
        metric, entityId, hasDrifted: false, driftScore: 0, pValue: 1,
        windowBefore: { mean: 0, std: 0, size: 0 },
        windowAfter: { mean: 0, std: 0, size: 0 },
        driftType: "none",
        detectedAt: sorted[n - 1]?.date || "",
      };
    }

    const before = sorted.slice(0, windowSize).map((p) => p.value);
    const after = sorted.slice(-windowSize).map((p) => p.value);

    const meanBefore = before.reduce((a, b) => a + b, 0) / windowSize;
    const meanAfter = after.reduce((a, b) => a + b, 0) / windowSize;
    const stdBefore = Math.sqrt(before.reduce((s, v) => s + (v - meanBefore) ** 2, 0) / windowSize);
    const stdAfter = Math.sqrt(after.reduce((s, v) => s + (v - meanAfter) ** 2, 0) / windowSize);

    const pooledStd = Math.sqrt((stdBefore ** 2 + stdAfter ** 2) / 2);
    const tStat = pooledStd > 0 ? (meanAfter - meanBefore) / (pooledStd * Math.sqrt(2 / windowSize)) : 0;
    const df = 2 * windowSize - 2;
    const pValue = 2 * (1 - this.tCdf(Math.abs(tStat), df));

    const varianceRatio = stdBefore > 0 ? stdAfter / stdBefore : 1;
    const meanShift = Math.abs(meanAfter - meanBefore);
    const relativeShift = Math.abs(meanBefore) > 0 ? meanShift / Math.abs(meanBefore) : meanShift;

    let driftType: "mean-shift" | "variance-shift" | "distribution-shift" | "none";
    const hasDrifted = pValue < alpha || varianceRatio > 1.5 || varianceRatio < 0.5;

    if (hasDrifted) {
      if (relativeShift > 0.1 && pValue < alpha) driftType = "mean-shift";
      else if (varianceRatio > 1.5 || varianceRatio < 0.5) driftType = "variance-shift";
      else driftType = "distribution-shift";
    } else {
      driftType = "none";
    }

    return {
      metric,
      entityId,
      hasDrifted,
      driftScore: Math.max(0, Math.min(1, (1 - pValue) * (1 + relativeShift) / 2)),
      pValue: Math.round(pValue * 10000) / 10000,
      windowBefore: { mean: Math.round(meanBefore * 100) / 100, std: Math.round(stdBefore * 100) / 100, size: windowSize },
      windowAfter: { mean: Math.round(meanAfter * 100) / 100, std: Math.round(stdAfter * 100) / 100, size: windowSize },
      driftType,
      detectedAt: sorted[n - 1].date,
    };
  }

  scanCampaign(
    campaignId: string,
    metrics: Record<string, { date: string; value: number }[]>,
    config?: DetectionConfig,
  ): {
    campaignId: string;
    results: Record<string, AnomalyResult>;
    overallHealth: "healthy" | "attention" | "critical";
    flaggedMetrics: string[];
  } {
    const results: Record<string, AnomalyResult> = {};
    let totalAnomalies = 0;
    const flaggedMetrics: string[] = [];

    for (const [metric, data] of Object.entries(metrics)) {
      const result = this.detect(metric, campaignId, data, config);
      results[metric] = result;
      if (result.summary.flaggedCount > 0) {
        totalAnomalies += result.summary.flaggedCount;
        flaggedMetrics.push(metric);
      }
    }

    const totalChanges = Object.values(results).reduce((s, r) => s + (r.changepoints?.length || 0), 0);
    const overallHealth = totalAnomalies === 0 && totalChanges === 0 ? "healthy" : totalAnomalies <= 3 ? "attention" : "critical";

    return { campaignId, results, overallHealth, flaggedMetrics };
  }

  private isolationForestDetect(metric: string, entityId: string, sorted: { date: string; value: number }[], config?: DetectionConfig): AnomalyResult {
    const values = sorted.map((p) => p.value);
    const n = values.length;
    const contamination = config?.contamination ?? 0.1;
    const numTrees = 100;
    const sampleSize = Math.min(n, 256);

    const anomalyScores: { index: number; score: number }[] = [];
    const avgPathLength = this.isolationForestAveragePathLength(sampleSize);

    for (let idx = 0; idx < n; idx++) {
      let totalPathLength = 0;
      for (let t = 0; t < numTrees; t++) {
        const sampleIndices = new Set<number>();
        while (sampleIndices.size < sampleSize) {
          sampleIndices.add(Math.floor(Math.random() * n));
        }
        const sample = [...sampleIndices].map((i) => values[i]);
        const minVal = Math.min(...sample);
        const maxVal = Math.max(...sample);
        totalPathLength += this.isolationTreePathLength(values[idx], minVal, maxVal, 0, Math.ceil(Math.log2(sampleSize)));
      }
      const avgPath = totalPathLength / numTrees;
      const score = Math.pow(2, -avgPath / avgPathLength);
      anomalyScores.push({ index: idx, score: Math.round(score * 10000) / 10000 });
    }

    const threshold = this.percentile(anomalyScores.map((a) => a.score), 1 - contamination);
    const zThreshold = config?.zThreshold ?? 2.5;

    const points: AnomalyPoint[] = sorted.map((p, i) => {
      const aScore = anomalyScores[i].score;
      const isOutlier = aScore > threshold;
      const window = values.slice(Math.max(0, i - 7), i);
      const expected = window.length > 0 ? window.reduce((a, b) => a + b, 0) / window.length : values.reduce((a, b) => a + b, 0) / n;
      const std = Math.sqrt(values.reduce((s, v) => s + (v - expected) ** 2, 0) / n);
      const zScore = std > 0 ? (p.value - expected) / std : 0;

      return {
        date: p.date,
        value: p.value,
        expected: Math.round(expected * 100) / 100,
        deviation: Math.round((p.value - expected) * 100) / 100,
        zScore: Math.round(zScore * 100) / 100,
        severity: isOutlier ? "high" : "low",
        direction: isOutlier ? (p.value > expected ? "spike" : "drop") : "normal",
        flagged: isOutlier,
      };
    });

    const flaggedCount = points.filter((p) => p.flagged).length;
    return this.buildResult(metric, entityId, points, flaggedCount, 0, 0, 0, zThreshold, sorted.length);
  }

  private isolationForestAveragePathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - 2 * (n - 1) / n;
  }

  private isolationTreePathLength(value: number, min: number, max: number, depth: number, maxDepth: number): number {
    if (depth >= maxDepth || min >= max) return depth;
    const split = min + Math.random() * (max - min);
    if (value < split) return this.isolationTreePathLength(value, min, split, depth + 1, maxDepth);
    return this.isolationTreePathLength(value, split, max, depth + 1, maxDepth);
  }

  private zscoreDetect(metric: string, entityId: string, sorted: { date: string; value: number }[], config?: DetectionConfig): AnomalyResult {
    const zThreshold = config?.zThreshold ?? 2.5;
    const smoothingWindow = config?.smoothingWindow ?? 7;
    const useSeasonal = config?.useSeasonalBaseline ?? true;
    const seasonLength = config?.seasonLength ?? 7;
    const values_only = sorted.map((p) => p.value);
    const seasonalBaseline = useSeasonal ? this.buildSeasonalBaseline(values_only, seasonLength) : null;

    const points: AnomalyPoint[] = [];
    let flaggedCount = 0, highestZScore = 0, spikeCount = 0, dropCount = 0;

    for (let i = 0; i < sorted.length; i++) {
      const window = values_only.slice(Math.max(0, i - smoothingWindow), i);
      if (window.length < 3) {
        points.push({ date: sorted[i].date, value: sorted[i].value, expected: sorted[i].value, deviation: 0, zScore: 0, severity: "low", direction: "normal", flagged: false });
        continue;
      }

      let expected: number;
      if (seasonalBaseline && useSeasonal) {
        const seasonalIdx = i % seasonLength;
        const seasonalOffset = seasonalBaseline[seasonalIdx];
        const windowMean = window.reduce((a, b) => a + b, 0) / window.length;
        expected = windowMean + seasonalOffset;
      } else {
        expected = window.reduce((a, b) => a + b, 0) / window.length;
      }

      const std = Math.sqrt(window.reduce((sum, v) => sum + (v - expected) ** 2, 0) / window.length);
      const actualStd = Math.max(std, expected * 0.01);
      const zScore = actualStd > 0 ? (sorted[i].value - expected) / actualStd : 0;
      const deviation = sorted[i].value - expected;
      const absZ = Math.abs(zScore);
      const flagged = absZ > zThreshold;

      let severity: "low" | "medium" | "high" | "critical";
      if (absZ >= 4) severity = "critical";
      else if (absZ >= 3) severity = "high";
      else if (absZ >= zThreshold) severity = "medium";
      else severity = "low";

      const direction: "spike" | "drop" | "normal" = zScore > zThreshold ? "spike" : zScore < -zThreshold ? "drop" : "normal";

      if (flagged) flaggedCount++;
      if (zScore > zThreshold) spikeCount++;
      if (zScore < -zThreshold) dropCount++;
      if (absZ > highestZScore) highestZScore = absZ;

      points.push({ date: sorted[i].date, value: sorted[i].value, expected: Math.round(expected * 100) / 100, deviation: Math.round(deviation * 100) / 100, zScore: Math.round(zScore * 100) / 100, severity, direction, flagged });
    }

    return this.buildResult(metric, entityId, points, flaggedCount, spikeCount, dropCount, highestZScore, zThreshold, sorted.length);
  }

  private esdDetect(metric: string, entityId: string, sorted: { date: string; value: number }[], config?: DetectionConfig): AnomalyResult {
    const values = sorted.map((p) => p.value);
    const alpha = config?.alpha ?? 0.05;
    const maxOutliers = config?.maxOutliers ?? Math.min(5, Math.floor(values.length * 0.1));
    const n = values.length;

    const outlierIndices = new Set<number>();

    for (let r = 1; r <= maxOutliers; r++) {
      const remaining = values.filter((_, i) => !outlierIndices.has(i));
      if (remaining.length < 3) break;

      const mean = remaining.reduce((a, b) => a + b, 0) / remaining.length;
      const std = Math.sqrt(remaining.reduce((s, v) => s + (v - mean) ** 2, 0) / remaining.length);
      if (std === 0) break;

      let maxR = 0;
      let maxIdx = -1;
      for (let i = 0; i < values.length; i++) {
        if (outlierIndices.has(i)) continue;
        const rVal = Math.abs(values[i] - mean) / std;
        if (rVal > maxR) { maxR = rVal; maxIdx = i; }
      }

      if (maxIdx === -1) break;

      const tCritical = this.tDistributionCriticalValue(n - r - 1, alpha / (2 * (n - r + 1)));
      const lambda = ((n - r) * tCritical) / Math.sqrt((n - r - 1 + tCritical * tCritical) * (n - r + 1));

      if (maxR > lambda) {
        outlierIndices.add(maxIdx);
      } else break;
    }

    const zThreshold = config?.zThreshold ?? 2.5;
    const points: AnomalyPoint[] = sorted.map((p, i) => {
      const isOutlier = outlierIndices.has(i);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
      const z = std > 0 ? (p.value - mean) / std : 0;

      return {
        date: p.date, value: p.value,
        expected: Math.round(mean * 100) / 100,
        deviation: Math.round((p.value - mean) * 100) / 100,
        zScore: Math.round(z * 100) / 100,
        severity: isOutlier ? (Math.abs(z) >= 4 ? "critical" : Math.abs(z) >= 3 ? "high" : "medium") : "low",
        direction: isOutlier ? (p.value > mean ? "spike" : "drop") : "normal",
        flagged: isOutlier,
      };
    });

    return this.buildResult(metric, entityId, points, outlierIndices.size, 0, 0, 0, zThreshold, sorted.length);
  }

  private iqrDetect(metric: string, entityId: string, sorted: { date: string; value: number }[], config?: DetectionConfig): AnomalyResult {
    const values = sorted.map((p) => p.value);
    const n = values.length;

    const sortedVals = [...values].sort((a, b) => a - b);
    const q1 = this.percentile(sortedVals, 0.25);
    const q3 = this.percentile(sortedVals, 0.75);
    const iqr = q3 - q1;
    const multiplier = 1.5;
    const lowerFence = q1 - multiplier * iqr;
    const upperFence = q3 + multiplier * iqr;
    const median = this.percentile(sortedVals, 0.5);

    const mad = this.medianAbsoluteDeviation(sortedVals, median);
    const modifiedZThreshold = 3.5;

    const points: AnomalyPoint[] = sorted.map((p, i) => {
      const isExtreme = p.value < lowerFence || p.value > upperFence;
      const modZ = mad > 0 ? 0.6745 * (p.value - median) / mad : 0;
      const zScore = values.length > 1 ? (p.value - (values.reduce((a, b) => a + b, 0) / n)) / Math.sqrt(values.reduce((s, v) => s + (v - (values.reduce((a, b) => a + b, 0) / n)) ** 2, 0) / n) : 0;

      return {
        date: p.date, value: p.value,
        expected: Math.round(median * 100) / 100,
        deviation: Math.round((p.value - median) * 100) / 100,
        zScore: Math.round(zScore * 100) / 100,
        severity: isExtreme && Math.abs(modZ) > modifiedZThreshold ? "high" : isExtreme ? "medium" : "low",
        direction: p.value > upperFence ? "spike" : p.value < lowerFence ? "drop" : "normal",
        flagged: isExtreme,
      };
    });

    const flaggedCount = points.filter((p) => p.flagged).length;
    return this.buildResult(metric, entityId, points, flaggedCount, 0, 0, 0, 2.5, sorted.length);
  }

  private cusumDetect(metric: string, entityId: string, sorted: { date: string; value: number }[], config?: DetectionConfig): AnomalyResult {
    const values = sorted.map((p) => p.value);
    const n = values.length;
    const overallMean = values.reduce((a, b) => a + b, 0) / n;

    const cumsum = new Array(n).fill(0);
    let s = 0;
    let maxS = 0;
    let changepoint = -1;

    for (let i = 0; i < n; i++) {
      s += values[i] - overallMean;
      cumsum[i] = s;
      if (Math.abs(s) > Math.abs(maxS)) { maxS = s; changepoint = i; }
    }

    const changepoints: { index: number; meanBefore: number; meanAfter: number; severity: string }[] = [];

    if (changepoint >= 2 && changepoint < n - 2) {
      const before = values.slice(0, changepoint + 1);
      const after = values.slice(changepoint + 1);
      const meanBefore = before.reduce((a, b) => a + b, 0) / before.length;
      const meanAfter = after.reduce((a, b) => a + b, 0) / after.length;
      const relativeShift = overallMean > 0 ? Math.abs(meanAfter - meanBefore) / overallMean : Math.abs(meanAfter - meanBefore);

      changepoints.push({
        index: changepoint,
        meanBefore: Math.round(meanBefore * 100) / 100,
        meanAfter: Math.round(meanAfter * 100) / 100,
        severity: relativeShift > 1.5 ? "critical" : relativeShift > 0.8 ? "high" : "medium",
      });
    }

    const zThreshold = config?.zThreshold ?? 2.5;
    const smoothingWindow = config?.smoothingWindow ?? 7;
    const points: AnomalyPoint[] = [];
    let flaggedCount = 0, spikeCount = 0, dropCount = 0, highestZScore = 0;

    for (let i = 0; i < n; i++) {
      const window = values.slice(Math.max(0, i - smoothingWindow), i);
      if (window.length < 3) {
        points.push({ date: sorted[i].date, value: values[i], expected: values[i], deviation: 0, zScore: 0, severity: "low", direction: "normal", flagged: false });
        continue;
      }

      const expected = window.reduce((a, b) => a + b, 0) / window.length;
      const std = Math.sqrt(window.reduce((sum, v) => sum + (v - expected) ** 2, 0) / window.length);
      const actualStd = Math.max(std, expected * 0.01);
      const zScore = actualStd > 0 ? (values[i] - expected) / actualStd : 0;
      const deviation = values[i] - expected;
      const absZ = Math.abs(zScore);
      const flagged = absZ > zThreshold;

      let severity: "low" | "medium" | "high" | "critical";
      if (absZ >= 4) severity = "critical";
      else if (absZ >= 3) severity = "high";
      else if (absZ >= zThreshold) severity = "medium";
      else severity = "low";

      const direction: "spike" | "drop" | "normal" = zScore > zThreshold ? "spike" : zScore < -zThreshold ? "drop" : "normal";

      if (flagged) flaggedCount++;
      if (zScore > zThreshold) spikeCount++;
      if (zScore < -zThreshold) dropCount++;
      if (absZ > highestZScore) highestZScore = absZ;

      points.push({ date: sorted[i].date, value: values[i], expected: Math.round(expected * 100) / 100, deviation: Math.round(deviation * 100) / 100, zScore: Math.round(zScore * 100) / 100, severity, direction, flagged });
    }

    const result = this.buildResult(metric, entityId, points, flaggedCount, spikeCount, dropCount, highestZScore, zThreshold, n);
    result.changepoints = changepoints;
    return result;
  }

  ensembleDetect(metric: string, entityId: string, values: { date: string; value: number }[], config?: DetectionConfig): AnomalyResult {
    const results = [
      this.zscoreDetect(metric, entityId, values, config),
      this.esdDetect(metric, entityId, values, { ...config, maxOutliers: config?.maxOutliers ?? 5 }),
      this.iqrDetect(metric, entityId, values, config),
    ];

    const points: AnomalyPoint[] = values.map((v, i) => {
      const flags = results.map((r) => r.points[i]?.flagged || false);
      const flaggedCount = flags.filter(Boolean).length;
      const avgZ = results.reduce((s, r) => s + Math.abs(r.points[i]?.zScore || 0), 0) / results.length;
      const sevs = results.map((r) => r.points[i]?.severity || "low");

      return {
        date: v.date, value: v.value,
        expected: results[0].points[i]?.expected || v.value,
        deviation: results[0].points[i]?.deviation || 0,
        zScore: results[0].points[i]?.zScore || 0,
        severity: sevs.includes("critical") ? "critical" : sevs.includes("high") ? "high" : flaggedCount >= 2 ? "medium" : "low",
        direction: flaggedCount >= 2 ? (results[0].points[i]?.direction || "normal") : "normal",
        flagged: flaggedCount >= 2,
      };
    });

    const flaggedCount = points.filter((p) => p.flagged).length;
    return this.buildResult(metric, entityId, points, flaggedCount, 0, 0, 0, 2.5, values.length);
  }

  private buildSeasonalBaseline(values: number[], seasonLength: number): number[] {
    const n = values.length;
    const overallMean = values.reduce((a, b) => a + b, 0) / n;
    const baseline = new Array(seasonLength).fill(0);
    const counts = new Array(seasonLength).fill(0);
    for (let i = 0; i < n; i++) {
      baseline[i % seasonLength] += values[i] - overallMean;
      counts[i % seasonLength]++;
    }
    for (let i = 0; i < seasonLength; i++) baseline[i] = counts[i] > 0 ? baseline[i] / counts[i] : 0;
    return baseline;
  }

  private insufficientData(metric: string, entityId: string, sorted: { date: string; value: number }[], minPoints: number): AnomalyResult {
    return {
      metric, entityId,
      points: sorted.map((p) => ({ date: p.date, value: p.value, expected: p.value, deviation: 0, zScore: 0, severity: "low", direction: "normal", flagged: false })),
      summary: {
        totalPoints: sorted.length, flaggedCount: 0, flagRate: 0, highestZScore: 0,
        dominantDirection: "normal", dominantSeverity: "low",
        recommendation: `Need at least ${minPoints} data points for anomaly detection (have ${sorted.length}).`,
      },
    };
  }

  private buildResult(metric: string, entityId: string, points: AnomalyPoint[], flaggedCount: number, spikeCount: number, dropCount: number, highestZScore: number, zThreshold: number, n: number): AnomalyResult {
    const flagRate = Math.round((flaggedCount / Math.max(n, 1)) * 10000) / 100;
    const dominantDirection: "spike" | "drop" | "normal" = spikeCount > dropCount ? "spike" : dropCount > spikeCount ? "drop" : "normal";
    const dominantSeverity = this.dominantSeverity(points);
    const recommendation = this.buildRecommendation(flaggedCount, n, dominantDirection, dominantSeverity, zThreshold);

    return {
      metric, entityId, points,
      summary: {
        totalPoints: n, flaggedCount, flagRate,
        highestZScore: Math.round(Math.max(highestZScore, ...points.map((p) => Math.abs(p.zScore))) * 100) / 100,
        dominantDirection, dominantSeverity, recommendation,
      },
    };
  }

  private dominantSeverity(points: AnomalyPoint[]): string {
    const flagged = points.filter((p) => p.flagged);
    if (flagged.length === 0) return "low";
    if (flagged.some((p) => p.severity === "critical")) return "critical";
    if (flagged.some((p) => p.severity === "high")) return "high";
    return "medium";
  }

  private buildRecommendation(flaggedCount: number, totalPoints: number, direction: string, severity: string, zThreshold: number): string {
    if (flaggedCount === 0) return "No anomalies detected. All metrics within normal variance bounds.";
    if (severity === "critical") return `CRITICAL: ${flaggedCount} anomalies found (${direction === "spike" ? "unusual spikes" : "sharp drops"} detected). Immediate investigation recommended.`;
    if (severity === "high") return `HIGH: ${flaggedCount} significant anomalies detected. Trend is ${direction === "spike" ? "upward spikes" : "downward drops"}. Review campaign settings.`;
    return `${flaggedCount} anomalies detected (z=${zThreshold.toFixed(1)} threshold). ${direction === "spike" ? "Monitor for escalation" : "Check for underlying issues"}.`;
  }

  private percentile(sorted: number[], p: number): number {
    const idx = p * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  private medianAbsoluteDeviation(values: number[], median: number): number {
    const devs = values.map((v) => Math.abs(v - median));
    devs.sort((a, b) => a - b);
    return this.percentile(devs, 0.5);
  }

  private tDistributionCriticalValue(df: number, alpha: number): number {
    if (df <= 0) return 1.96;
    const a = alpha < 1e-10 ? 1e-10 : alpha > 0.9999999999 ? 0.9999999999 : alpha;
    const t = Math.sqrt(-2 * Math.log(a));
    const z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
    const dfCorrection = z + (z * z * z + z) / (4 * df) + (5 * z * z * z * z * z + 16 * z * z * z + 3 * z) / (96 * df * df);
    return dfCorrection;
  }

  private tCdf(x: number, df: number): number {
    const a = df / 2;
    const b = 0.5;
    const tVal = x / Math.sqrt(df + x * x);
    return this.regularizedIncompleteBeta(tVal, a, b);
  }

  private regularizedIncompleteBeta(x: number, a: number, b: number): number {
    if (x < 0 || x > 1) return 0;
    if (x === 0 || x === 1) return x;
    const bt = Math.exp(this.lgamma(a + b) - this.lgamma(a) - this.lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * this.contFrac(a, b, x) / a;
    return 1 - bt * this.contFrac(b, a, 1 - x) / b;
  }

  private contFrac(a: number, b: number, x: number): number {
    let result = 1;
    for (let m = 1; m <= 100; m++) {
      const num = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
      result = 1 + num / result;
    }
    return 1 / result;
  }

  private lgamma(x: number): number {
    const g = 7;
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - this.lgamma(1 - x);
    x -= 1;
    let a = c[0];
    for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
    const t = x + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }

  private invertMatrix(m: number[][]): number[][] {
    const n = m.length;
    const aug = m.map((row, i) => {
      const r = [...row];
      for (let j = 0; j < n; j++) r.push(i === j ? 1 : 0);
      return r;
    });

    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-12) return m.map((_, i) => m.map((_, j) => i === j ? 1 : 0));

      for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }

    return aug.map((row) => row.slice(n));
  }

  private chi2Critical(df: number, alpha: number): number {
    const z = this.tCdfInv(1 - alpha, 1000);
    const c = df;
    return c + z * Math.sqrt(2 * c) + (2 / 3) * (z * z - 1);
  }

  private tCdfInv(p: number, df: number = 1000): number {
    let low = -10, high = 10;
    for (let i = 0; i < 50; i++) {
      const x = (low + high) / 2;
      if (this.tCdf(x, df) < p) low = x;
      else high = x;
    }
    return (low + high) / 2;
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();
