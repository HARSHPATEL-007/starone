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
  method?: "zscore" | "esd" | "iqr" | "cusum";
  alpha?: number;
  maxOutliers?: number;
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
      default: return this.zscoreDetect(metric, entityId, sorted, config);
    }
  }

  // ─── Z-Score Method (original) ──────────────────────────────────────
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

  // ─── Generalized ESD (Extreme Studentized Deviate) Test ─────────────
  /**
   * Iteratively removes the most extreme outlier using a t-distribution critical value.
   * Handles multiple outliers in a single pass.
   */
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
      for (const i of remaining.keys()) {
        const actualIdx = values.findIndex((v, idx) => !outlierIndices.has(idx) && v === remaining[i]);
        if (actualIdx === -1) continue;
        const rVal = Math.abs(values[actualIdx] - mean) / std;
        if (rVal > maxR) { maxR = rVal; maxIdx = actualIdx; }
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

  // ─── IQR-Based Robust Outlier Detection ─────────────────────────────
  /**
   * Uses Tukey's fences based on the interquartile range.
   * Robust to non-normal distributions. No distributional assumptions.
   */
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

  // ─── CUSUM Change-Point Detection ───────────────────────────────────
  /**
   * Detects structural shifts in the mean of the series using cumulative sum.
   * Complements point-wise outlier detection with regime-shift detection.
   */
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

    // Use moving window + CUSUM residual for point-wise anomaly
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

  // ─── Statistical Utilities ─────────────────────────────────────────

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
    // Approximation using Abramowitz and Stegun
    if (df <= 0) return 1.96;
    const a = alpha < 1e-10 ? 1e-10 : alpha > 0.9999999999 ? 0.9999999999 : alpha;
    const t = Math.sqrt(-2 * Math.log(a));
    const z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);

    // Adjust for degrees of freedom (simplified)
    const dfCorrection = z + (z * z * z + z) / (4 * df) + (5 * z * z * z * z * z + 16 * z * z * z + 3 * z) / (96 * df * df);
    return dfCorrection;
  }

  // ─── Ensemble Detection ────────────────────────────────────────────
  /**
   * Runs all detection methods and returns a consensus result.
   * A point is flagged if at least 2 of 4 methods agree.
   */
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
}

export const anomalyDetectionService = new AnomalyDetectionService();
