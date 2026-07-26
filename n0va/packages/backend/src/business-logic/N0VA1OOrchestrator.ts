import { N0VA1OService } from "../services/N0VA1OService";
import { decisionEngine } from "./DecisionEngine";

const n0va1oService = new N0VA1OService();

export interface GatewayHealthDashboard {
  overallHealth: string;
  overallHealthScore: number;
  healthBand: string;
  platformCount: number;
  platforms: Record<string, {
    successRate: number;
    avgLatency: number;
    p95Latency: number;
    callCount: number;
    circuitOpen: boolean;
    healthScore: number;
  }>;
  degradedPlatforms: string[];
  warnings: string[];
  recommendations: string[];
}

export interface PlatformActionReport {
  actionPatterns: Record<string, number>;
  topActions: string[];
  uniquePlatforms: string[];
  platformDiversity: number;
  platformHealthSummary: { platform: string; callCount: number; successRate: number; circuitBreaker: string }[];
  overallReliability: number;
}

export interface PlatformLatencyProfile {
  platform: string;
  avgLatency: number;
  p95Latency: number;
  latencyGrade: string;
  callCount: number;
  latencyTrend: "improving" | "degrading" | "stable";
}

export class N0VA1OOrchestrator {
  getGatewayDashboard(): GatewayHealthDashboard {
    const performance = n0va1oService.getPlatformPerformance();
    const gatewayHealth = n0va1oService.getGatewayHealth();
    const platforms = n0va1oService.getPlatforms();

    const platformCount = Object.keys(performance).length;
    const healthScores = Object.values(performance).map((p: any) => p.healthScore || 0);
    const overallHealthScore = healthScores.length > 0
      ? Math.round(healthScores.reduce((s, v) => s + v, 0) / healthScores.length)
      : 0;
    const overallHealth = gatewayHealth?.status || "unknown";
    const healthBand = decisionEngine.label(decisionEngine.band(overallHealthScore));

    const degradedPlatforms: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    for (const [platform, perf] of Object.entries(performance)) {
      const p = perf as any;
      if (p.circuitOpen) {
        degradedPlatforms.push(platform);
        warnings.push(`Circuit breaker OPEN for ${platform} — auto-reset in progress`);
        recommendations.push(`Investigate ${platform} connectivity. Check credentials and API status.`);
      } else if (p.healthScore < 50) {
        degradedPlatforms.push(platform);
        warnings.push(`${platform} health score is ${p.healthScore}/100 — degraded performance`);
        recommendations.push(`Review ${platform} latency (avg ${p.avgLatency}ms, p95 ${p.p95Latency}ms). Consider reducing call frequency.`);
      }
      if (p.successRate < 90) {
        recommendations.push(`${platform} success rate is ${p.successRate}%. Review error handling and retry strategy.`);
      }
    }

    if (platformCount === 0) {
      recommendations.push("No platform activity recorded. Execute an action to initialize platform health tracking.");
    }

    return {
      overallHealth,
      overallHealthScore,
      healthBand,
      platformCount,
      platforms: performance as any,
      degradedPlatforms,
      warnings,
      recommendations,
    };
  }

  getPlatformActionReport(): PlatformActionReport {
    const performance = n0va1oService.getPlatformPerformance();
    const platforms = n0va1oService.getPlatforms();

    const platformEntries = Object.entries(performance);
    const platformHealthSummary = platformEntries.map(([platform, p]) => ({
      platform,
      callCount: p.callCount,
      successRate: p.successRate,
      circuitBreaker: p.circuitOpen ? "OPEN" : p.successRate < 90 ? "DEGRADED" : "CLOSED",
    }));

    const actionPatterns: Record<string, number> = {};
    let totalActions = 0;
    for (const [, p] of platformEntries) {
      const actionName = `${p.callCount > 100 ? "high" : p.callCount > 20 ? "medium" : "low"}-traffic`;
      actionPatterns[actionName] = (actionPatterns[actionName] || 0) + p.callCount;
      totalActions += p.callCount;
    }
    if (totalActions === 0) actionPatterns["no_activity"] = 1;

    const topActions = Object.entries(actionPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action]) => action);

    const totalRate = platformHealthSummary.reduce((s, p) => s + p.successRate, 0);
    const overallReliability = platformHealthSummary.length > 0 ? Math.round(totalRate / platformHealthSummary.length) : 0;

    return {
      actionPatterns, topActions, overallReliability,
      uniquePlatforms: platformEntries.map(([p]) => p),
      platformDiversity: platformEntries.length,
      platformHealthSummary,
    };
  }

  getLatencyProfiles(): PlatformLatencyProfile[] {
    const performance = n0va1oService.getPlatformPerformance();
    return Object.entries(performance).map(([platform, p]) => {
      const ratio = p.avgLatency > 0 ? p.p95Latency / p.avgLatency : 1;
      const latencyGrade = p.avgLatency < 200 ? "fast" : p.avgLatency < 800 ? "moderate" : p.avgLatency < 2000 ? "slow" : "degraded";
      const latencyTrend: "improving" | "degrading" | "stable" = ratio > 2 ? "degrading" : ratio < 1.2 ? "stable" : "improving";
      return { platform, avgLatency: p.avgLatency, p95Latency: p.p95Latency, latencyGrade, callCount: p.callCount, latencyTrend };
    }).sort((a, b) => a.avgLatency - b.avgLatency);
  }
}

export const n0va1oOrchestrator = new N0VA1OOrchestrator();
