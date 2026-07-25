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
}

interface DetectionConfig {
  zThreshold?: number;
  minPoints?: number;
  smoothingWindow?: number;
  useSeasonalBaseline?: boolean;
  seasonLength?: number;
}

export class AnomalyDetectionService {
  /**
   * Detects anomalies using z-score deviation from a moving average baseline.
   * Optionally uses seasonal (day-of-week) baseline for weekly patterns.
   */
  detect(
    metric: string,
    entityId: string,
    values: { date: string; value: number }[],
    config?: DetectionConfig,
  ): AnomalyResult {
    const sorted = [...values].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const zThreshold = config?.zThreshold ?? 2.5;
    const minPoints = config?.minPoints ?? 7;
    const smoothingWindow = config?.smoothingWindow ?? 7;
    const useSeasonal = config?.useSeasonalBaseline ?? true;
    const seasonLength = config?.seasonLength ?? 7;

    const n = sorted.length;
    if (n < minPoints) {
      return {
        metric,
        entityId,
        points: sorted.map((p) => ({
          date: p.date,
          value: p.value,
          expected: p.value,
          deviation: 0,
          zScore: 0,
          severity: "low",
          direction: "normal",
          flagged: false,
        })),
        summary: {
          totalPoints: n,
          flaggedCount: 0,
          flagRate: 0,
          highestZScore: 0,
          dominantDirection: "normal",
          dominantSeverity: "low",
          recommendation: `Need at least ${minPoints} data points for anomaly detection (have ${n}).`,
        },
      };
    }

    const values_only = sorted.map((p) => p.value);
    const seasonalBaseline = useSeasonal ? this.buildSeasonalBaseline(values_only, seasonLength) : null;

    const points: AnomalyPoint[] = [];
    let flaggedCount = 0;
    let highestZScore = 0;
    let spikeCount = 0;
    let dropCount = 0;

    for (let i = 0; i < n; i++) {
      const window = values_only.slice(Math.max(0, i - smoothingWindow), i);
      if (window.length < 3) {
        points.push({
          date: sorted[i].date,
          value: sorted[i].value,
          expected: sorted[i].value,
          deviation: 0,
          zScore: 0,
          severity: "low",
          direction: "normal",
          flagged: false,
        });
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

      points.push({
        date: sorted[i].date,
        value: sorted[i].value,
        expected: Math.round(expected * 100) / 100,
        deviation: Math.round(deviation * 100) / 100,
        zScore: Math.round(zScore * 100) / 100,
        severity,
        direction,
        flagged,
      });
    }

    const flagRate = Math.round((flaggedCount / n) * 10000) / 100;
    const dominantDirection: "spike" | "drop" | "normal" = spikeCount > dropCount ? "spike" : dropCount > spikeCount ? "drop" : "normal";
    const dominantSeverity = this.dominantSeverity(points);

    const recommendation = this.buildRecommendation(flaggedCount, n, dominantDirection, dominantSeverity, zThreshold);

    return {
      metric,
      entityId,
      points,
      summary: {
        totalPoints: n,
        flaggedCount,
        flagRate,
        highestZScore: Math.round(highestZScore * 100) / 100,
        dominantDirection,
        dominantSeverity,
        recommendation,
      },
    };
  }

  /**
   * Multi-metric anomaly scan for a campaign — checks spend, CTR, CVR, CPA simultaneously.
   */
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

    const overallHealth = totalAnomalies === 0 ? "healthy" : totalAnomalies <= 3 ? "attention" : "critical";

    return { campaignId, results, overallHealth, flaggedMetrics };
  }

  private buildSeasonalBaseline(values: number[], seasonLength: number): number[] {
    const n = values.length;
    const overallMean = values.reduce((a, b) => a + b, 0) / n;
    const baseline = new Array(seasonLength).fill(0);
    const counts = new Array(seasonLength).fill(0);

    for (let i = 0; i < n; i++) {
      const idx = i % seasonLength;
      baseline[idx] += values[i] - overallMean;
      counts[idx]++;
    }

    for (let i = 0; i < seasonLength; i++) {
      baseline[i] = counts[i] > 0 ? baseline[i] / counts[i] : 0;
    }
    return baseline;
  }

  private dominantSeverity(points: AnomalyPoint[]): string {
    const flagged = points.filter((p) => p.flagged);
    if (flagged.length === 0) return "low";
    const critical = flagged.filter((p) => p.severity === "critical").length;
    const high = flagged.filter((p) => p.severity === "high").length;
    if (critical >= 1) return "critical";
    if (high >= 1) return "high";
    return "medium";
  }

  private buildRecommendation(
    flaggedCount: number,
    totalPoints: number,
    direction: string,
    severity: string,
    zThreshold: number,
  ): string {
    if (flaggedCount === 0) {
      return "No anomalies detected. All metrics within normal variance bounds.";
    }
    if (severity === "critical") {
      return `CRITICAL: ${flaggedCount} anomalies found (${direction === "spike" ? "unusual spikes" : "sharp drops"} detected). Immediate investigation recommended.`;
    }
    if (severity === "high") {
      return `HIGH: ${flaggedCount} significant anomalies detected. Trend is ${direction === "spike" ? "upward spikes" : "downward drops"}. Review campaign settings.`;
    }
    return `${flaggedCount} anomalies detected (z=${zThreshold.toFixed(1)} threshold). ${direction === "spike" ? "Monitor for escalation" : "Check for underlying issues"}.`;
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();
