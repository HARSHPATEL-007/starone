import { exportService } from "../services/ExportService";
import { decisionEngine } from "./DecisionEngine";

export interface EntityDataQualityReport {
  entityType: string;
  totalRecords: number;
  completeness: number;
  overallQuality: number;
  issues: string[];
  healthBand: string;
}

export interface CrossEntityAudit {
  reports: EntityDataQualityReport[];
  avgQuality: number;
  worstEntity: string | null;
  bestEntity: string | null;
  totalRecords: number;
  atRiskEntities: string[];
  healthBand: string;
  recommendations: string[];
}

export class ExportOrchestrator {
  async crossEntityAudit(tenantId: string): Promise<CrossEntityAudit> {
    const entityTypes = ["campaigns", "creatives", "audiences", "agents", "goals", "keywords", "costs"];
    const reports: EntityDataQualityReport[] = [];

    for (const entityType of entityTypes) {
      try {
        const quality = await exportService.assessDataQuality(entityType, tenantId);
        reports.push({
          entityType: quality.entityType,
          totalRecords: quality.totalRecords,
          completeness: quality.completeness,
          overallQuality: quality.overallQuality,
          issues: quality.issues,
          healthBand: decisionEngine.label(decisionEngine.band(quality.overallQuality)),
        });
      } catch {
        reports.push({ entityType, totalRecords: 0, completeness: 0, overallQuality: 0, issues: ["Failed to assess"], healthBand: "Critical" });
      }
    }

    const avgQuality = reports.length > 0 ? Math.round(reports.reduce((s, r) => s + r.overallQuality, 0) / reports.length) : 0;
    const sorted = [...reports].sort((a, b) => a.overallQuality - b.overallQuality);
    const worstEntity = sorted.length > 0 && sorted[0].overallQuality < 100 ? sorted[0].entityType : null;
    const bestEntity = sorted.length > 0 ? sorted[sorted.length - 1].entityType : null;
    const totalRecords = reports.reduce((s, r) => s + r.totalRecords, 0);
    const atRiskEntities = reports.filter(r => r.overallQuality < 60).map(r => r.entityType);

    const recommendations: string[] = [];
    if (atRiskEntities.length > 0) recommendations.push(`Data quality at risk for: ${atRiskEntities.join(", ")}. Review field completeness.`);
    if (worstEntity) recommendations.push(`Worst data quality: "${worstEntity}" (${sorted[0].overallQuality}/100). Consider data cleanup.`);
    if (avgQuality < 70) recommendations.push("Overall data quality is below target. Implement validation rules before import.");
    if (avgQuality >= 90) recommendations.push("Data quality is excellent across all entity types.");

    return { reports, avgQuality, worstEntity, bestEntity, totalRecords, atRiskEntities, healthBand: decisionEngine.label(decisionEngine.band(avgQuality)), recommendations };
  }

  async statisticalOverview(tenantId: string): Promise<{
    entityType: string;
    recordCount: number;
    numericFields: string[];
    categoricalFields: string[];
    topCategorical: { field: string; topValue: string; frequency: number }[];
  }[]> {
    const entityTypes = ["campaigns", "creatives", "audiences", "goals"];
    const results: any[] = [];
    for (const entityType of entityTypes) {
      try {
        const summary = await exportService.generateStatisticalSummary(entityType, tenantId);
        results.push({
          entityType,
          recordCount: summary.recordCount,
          numericFields: Object.keys(summary.numericFields),
          categoricalFields: Object.keys(summary.categoricalFields),
          topCategorical: Object.entries(summary.categoricalFields).map(([field, data]: [string, any]) => ({
            field, topValue: data.topValue, frequency: data.topFrequency,
          })),
        });
      } catch {
        results.push({ entityType, recordCount: 0, numericFields: [], categoricalFields: [], topCategorical: [] });
      }
    }
    return results;
  }
}

export const exportOrchestrator = new ExportOrchestrator();
