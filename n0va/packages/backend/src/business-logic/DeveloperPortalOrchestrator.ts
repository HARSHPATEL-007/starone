import { developerPortalService } from "../services/DeveloperPortalService";
import { decisionEngine } from "./DecisionEngine";

export interface APIKeyHealth {
  totalKeys: number;
  activeKeys: number;
  revokedKeys: number;
  totalRequests: number;
  avgAge: number;
  avgUsagePerActive: number;
  keysDueRotation: number;
  healthBand: string;
}

export interface PortalDashboard {
  apiHealth: APIKeyHealth;
  activeKeysSummary: { id: string; name: string; age: number; usageCount: number; scopes: string[]; rotationDue: boolean; risk: string }[];
  usageAnomalies: { keyId: string; name: string; averageDaily: number; recentDaily: number; zScore: number; flagged: boolean; severity: string }[];
  permissionConflicts: { conflicts: { scope1: string; scope2: string; description: string }[]; keysAtRisk: string[] };
  rateLimitForecasts: { keyId: string; name: string; dailyAverage: number; projectedDaily: number; estimatedDaysToLimit: number; withinLimit: boolean }[];
  topRecommendations: string[];
  healthBand: string;
}

export class DeveloperPortalOrchestrator {
  getDashboard(tenantId: string): PortalDashboard {
    const keys = developerPortalService.listKeys(tenantId);
    const stats = developerPortalService.getApiUsageStats(tenantId);
    const rotations = developerPortalService.getKeyRotationRecommendations(tenantId);
    const anomalies = developerPortalService.detectUsageAnomaly(tenantId);
    const conflicts = developerPortalService.detectPermissionConflicts(tenantId);
    const forecasts = developerPortalService.forecastRateLimitHit(tenantId);

    const revokedKeys = stats.totalKeys - stats.activeKeys;
    const totalAge = rotations.reduce((s, r) => s + r.age, 0);
    const avgAge = rotations.length > 0 ? Math.round(totalAge / rotations.length * 10) / 10 : 0;
    const activeUsageTotal = rotations.filter(r => true).reduce((s, r) => s + r.usageCount, 0);
    const avgUsagePerActive = stats.activeKeys > 0 ? Math.round(activeUsageTotal / stats.activeKeys) : 0;
    const keysDueRotation = rotations.filter(r => r.rotationDue).length;

    const rotationRisk = keysDueRotation / Math.max(1, keys.length);
    const anomalyRatio = anomalies.filter(a => a.flagged).length / Math.max(1, anomalies.length);
    const conflictRatio = conflicts.keysAtRisk.length / Math.max(1, keys.length);
    const healthScore = Math.round(Math.max(0, Math.min(100, (1 - rotationRisk * 0.4 - anomalyRatio * 0.3 - conflictRatio * 0.3) * 100)));
    const healthBand = decisionEngine.label(decisionEngine.band(healthScore));

    const topRecommendations: string[] = [];
    if (keysDueRotation > 0) topRecommendations.push(`${keysDueRotation} key(s) due for rotation. Review and rotate to maintain security posture.`);
    const flaggedAnomalies = anomalies.filter(a => a.flagged);
    if (flaggedAnomalies.length > 0) topRecommendations.push(`${flaggedAnomalies.length} usage anomaly(s) detected on keys: ${flaggedAnomalies.map(a => a.name).join(", ")}.`);
    if (conflicts.keysAtRisk.length > 0) topRecommendations.push(`Permission conflicts found on ${conflicts.keysAtRisk.length} key(s). Review scope assignments.`);
    const nearLimitKeys = forecasts.filter(f => !f.withinLimit);
    if (nearLimitKeys.length > 0) topRecommendations.push(`${nearLimitKeys.length} key(s) projected to hit rate limit within 30 days: ${nearLimitKeys.map(k => k.name).join(", ")}.`);

    return {
      apiHealth: { totalKeys: stats.totalKeys, activeKeys: stats.activeKeys, revokedKeys, totalRequests: stats.totalRequests, avgAge, avgUsagePerActive, keysDueRotation, healthBand },
      activeKeysSummary: rotations.map(r => ({ id: r.keyId, name: r.name, age: r.age, usageCount: r.usageCount, scopes: developerPortalService.listKeys(tenantId).find(k => k.id === r.keyId)?.scopes || [], rotationDue: r.rotationDue, risk: r.risk })),
      usageAnomalies: anomalies, permissionConflicts: conflicts, rateLimitForecasts: forecasts,
      topRecommendations, healthBand,
    };
  }
}

export const developerPortalOrchestrator = new DeveloperPortalOrchestrator();
