import { fileStorage } from "../services/FileStorageService";
import { decisionEngine } from "./DecisionEngine";

export interface FileStorageDashboard {
  totalFiles: number;
  totalSize: number;
  formattedTotalSize: string;
  distribution: { byType: Record<string, { count: number; totalSize: number; avgSize: number }>; byEntity: Record<string, { count: number; totalSize: number }> };
  duplicates: { duplicates: { original: string; duplicate: string; hash: string; size: number }[]; wastedBytes: number; wastedFormatted: string };
  optimizationScore: number;
  forecast: { currentUsage: number; dailyGrowthRate: number; projected30Days: number; projected90Days: number; daysUntilLimit: number | null; recommendation: string };
  healthBand: string;
  recommendations: string[];
}

export class FileStorageOrchestrator {
  getDashboard(tenantId: string): FileStorageDashboard {
    const distribution = fileStorage.getFileDistribution(tenantId);
    const duplicates = fileStorage.detectDuplicates(tenantId);
    const optimization = fileStorage.getStorageOptimizationScore(tenantId);
    const forecast = fileStorage.forecastStorageGrowth(tenantId);

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return "0 B";
      const k = 1024, sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    };

    const healthScore = optimization.score;
    const healthBand = decisionEngine.label(decisionEngine.band(healthScore));

    const recommendations = [...optimization.recommendations];
    if (forecast.daysUntilLimit !== null && forecast.daysUntilLimit < 90) {
      recommendations.push(`Storage limit projected in ${forecast.daysUntilLimit} days. Review cleanup or upgrade strategy.`);
    }
    if (distribution.totalFiles > 100 && distribution.byType["image/jpeg"]?.count > distribution.totalFiles * 0.5) {
      recommendations.push("JPEG files dominate storage. Consider WebP conversion for 25-35% space savings.");
    }

    return {
      totalFiles: distribution.totalFiles,
      totalSize: distribution.totalSize,
      formattedTotalSize: formatBytes(distribution.totalSize),
      distribution: { byType: distribution.byType, byEntity: distribution.byEntity },
      duplicates: { ...duplicates, wastedFormatted: formatBytes(duplicates.wastedBytes) },
      optimizationScore: optimization.score,
      forecast,
      healthBand,
      recommendations,
    };
  }
}

export const fileStorageOrchestrator = new FileStorageOrchestrator();
