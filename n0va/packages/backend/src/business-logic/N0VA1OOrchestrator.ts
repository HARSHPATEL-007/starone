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
}

export const n0va1oOrchestrator = new N0VA1OOrchestrator();
