import { creativeVersionService } from "../services/CreativeVersionService";
import { decisionEngine } from "./DecisionEngine";

export interface CreativeVersionDashboard {
  creativeId: string;
  totalVersions: number;
  currentVersion: number;
  versionVelocity: string;
  mostActiveAuthor: string;
  totalMajorChanges: number;
  totalMinorChanges: number;
  totalPatchChanges: number;
  rollbackRisk: { riskScore: number; riskLevel: string; estimatedRevertTime: string } | null;
  changeFootprint: { totalChanges: number; footprintScore: number; normalizedScore: number; dominantChangeType: string } | null;
  activityBand: string;
}

export interface VersionHistorySummary {
  versionHistory: { version: number; semver: string; changeDescription: string; changedBy: string; createdAt: string }[];
  versionHeatmap: { date: string; count: number }[];
  averageChangesPerVersion: number;
  healthBand: string;
  recommendations: string[];
}

export class CreativeVersionOrchestrator {
  getDashboard(creativeId: string, tenantId: string): CreativeVersionDashboard {
    const semantic = creativeVersionService.semanticAnalysis(creativeId, tenantId);
    const versions = creativeVersionService.getVersions(creativeId, tenantId);

    let rollbackRisk: CreativeVersionDashboard["rollbackRisk"] = null;
    if (versions.length >= 2) {
      try {
        const risk = creativeVersionService.analyzeRollback(creativeId, tenantId, versions[versions.length - 1].version);
        rollbackRisk = { riskScore: risk.riskScore, riskLevel: risk.riskLevel, estimatedRevertTime: risk.estimatedRevertTime };
      } catch {}
    }

    let changeFootprint: CreativeVersionDashboard["changeFootprint"] = null;
    if (versions.length >= 2) {
      try {
        const footprint = creativeVersionService.changeFootprint(versions[0].id, versions[versions.length - 1].id, tenantId);
        changeFootprint = { totalChanges: footprint.totalChanges, footprintScore: footprint.footprintScore, normalizedScore: footprint.normalizedScore, dominantChangeType: footprint.dominantChangeType };
      } catch {}
    }

    const activityScore = Math.min(100, semantic.totalVersions * 10 + (changeFootprint?.footprintScore || 0) * 2);
    const activityBand = decisionEngine.label(decisionEngine.band(activityScore));

    return {
      creativeId, totalVersions: semantic.totalVersions, currentVersion: semantic.currentVersion,
      versionVelocity: semantic.versionVelocity, mostActiveAuthor: semantic.mostActiveAuthor,
      totalMajorChanges: semantic.totalMajorChanges, totalMinorChanges: semantic.totalMinorChanges,
      totalPatchChanges: semantic.totalPatchChanges, rollbackRisk, changeFootprint, activityBand,
    };
  }

  getVersionHistorySummary(creativeId: string, tenantId: string): VersionHistorySummary {
    const semantic = creativeVersionService.semanticAnalysis(creativeId, tenantId);
    const versions = creativeVersionService.getVersions(creativeId, tenantId);

    const versionHeatmap: Record<string, number> = {};
    for (const v of versions) {
      const date = v.createdAt.split("T")[0];
      versionHeatmap[date] = (versionHeatmap[date] || 0) + 1;
    }

    const avgChangesPerVersion = versions.length > 0
      ? Math.round((semantic.totalMajorChanges + semantic.totalMinorChanges + semantic.totalPatchChanges) / versions.length * 100) / 100
      : 0;

    let versionFootprint: { totalChanges: number; footprintScore: number; normalizedScore: number; dominantChangeType: string } | null = null;
    let versionRollbackRisk: { riskScore: number; riskLevel: string; estimatedRevertTime: string } | null = null;
    if (versions.length >= 2) {
      try {
        const fp = creativeVersionService.changeFootprint(versions[0].id, versions[versions.length - 1].id, tenantId);
        versionFootprint = { totalChanges: fp.totalChanges, footprintScore: fp.footprintScore, normalizedScore: fp.normalizedScore, dominantChangeType: fp.dominantChangeType };
      } catch {}
      try {
        const rsk = creativeVersionService.analyzeRollback(creativeId, tenantId, versions[versions.length - 1].version);
        versionRollbackRisk = { riskScore: rsk.riskScore, riskLevel: rsk.riskLevel, estimatedRevertTime: rsk.estimatedRevertTime };
      } catch {}
    }

    const totalChanges = (versionFootprint?.footprintScore ?? 0);
    const healthScore = versions.length >= 1 ? Math.min(100, 50 + (versions.length >= 2 ? 20 : 0) + (totalChanges > 0 ? 15 : 0) - (totalChanges > 30 ? 20 : 0)) : 0;
    const healthBand = decisionEngine.label(decisionEngine.band(healthScore));

    const recommendations: string[] = [];
    if (versions.length === 0) recommendations.push("No versions recorded. Create the first version to start tracking changes.");
    if (semantic.totalMajorChanges > 5) recommendations.push(`${semantic.totalMajorChanges} major changes detected. Consider stabilizing the creative before broader rollout.`);
    if (semantic.versionVelocity.includes("h") && parseInt(semantic.versionVelocity) < 6) recommendations.push("Version velocity is very high. Consider a review gate to prevent rapid breaking changes.");
    if (versionRollbackRisk?.riskScore && versionRollbackRisk.riskScore > 60) recommendations.push(`Rollback risk is high (${versionRollbackRisk.riskScore}). Document current state before further changes.`);

    return {
      versionHistory: semantic.versionHistory,
      versionHeatmap: Object.entries(versionHeatmap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
      averageChangesPerVersion: avgChangesPerVersion,
      healthBand, recommendations,
    };
  }
}

export const creativeVersionOrchestrator = new CreativeVersionOrchestrator();
