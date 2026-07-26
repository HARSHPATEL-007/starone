import { entityStore } from "../services/EntityStore";
import { decisionEngine } from "./DecisionEngine";

export interface EntityTypeSummary {
  entityType: string;
  count: number;
  fields: string[];
  sampleData: Record<string, unknown>;
}

export interface EntityStoreDashboard {
  totalRecords: number;
  entityTypes: string[];
  typeBreakdown: { entityType: string; count: number; percentOfTotal: number }[];
  recentActivity: { entityType: string; count: number; lastCreated: string | null }[];
  healthBand: string;
  recommendations: string[];
}

export class EntityStoreOrchestrator {
  async getDashboard(tenantId: string): Promise<EntityStoreDashboard> {
    const allTypes = [
      "campaign", "creative", "audience", "agent", "rule",
      "template", "report", "content", "form", "segment",
    ];
    const typeBreakdown: { entityType: string; count: number; percentOfTotal: number }[] = [];
    const recentActivity: { entityType: string; count: number; lastCreated: string | null }[] = [];
    let totalRecords = 0;

    for (const entityType of allTypes) {
      try {
        const records = await entityStore.list(tenantId, entityType);
        const count = records.length;
        totalRecords += count;

        const times = records
          .filter((r: any) => r.createdAt || r.uploadedAt)
          .map((r: any) => r.createdAt || r.uploadedAt)
          .sort()
          .reverse();

        typeBreakdown.push({ entityType, count, percentOfTotal: 0 });
        recentActivity.push({ entityType, count, lastCreated: times.length > 0 ? times[0] : null });
      } catch {
        typeBreakdown.push({ entityType, count: 0, percentOfTotal: 0 });
        recentActivity.push({ entityType, count: 0, lastCreated: null });
      }
    }

    for (const t of typeBreakdown) {
      t.percentOfTotal = totalRecords > 0 ? Math.round((t.count / totalRecords) * 100) : 0;
    }

    const activeTypes = typeBreakdown.filter(t => t.count > 0).length;
    const gini = totalRecords > 0
      ? decisionEngine.gini(typeBreakdown.map(t => t.count))
      : 0;
    const healthScore = totalRecords > 0
      ? Math.round(Math.max(0, Math.min(100, activeTypes * 8 + Math.max(0, (1 - gini) * 30) + (totalRecords > 10 ? 15 : 0))))
      : 0;
    const healthBand = decisionEngine.label(decisionEngine.band(healthScore));

    const recommendations: string[] = [];
    const emptyTypes = typeBreakdown.filter(t => t.count === 0);
    if (emptyTypes.length > 4) recommendations.push(`${emptyTypes.length} entity type(s) have zero records. Seed data or remove unused types.`);
    if (gini > 0.5) recommendations.push("Entity type distribution is uneven (Gini > 0.5). Consider balancing data collection across types.");
    if (totalRecords === 0) recommendations.push("No entity records found. Create at least one record to start tracking.");
    const activeRecently = recentActivity.filter(r => r.lastCreated !== null).length;
    if (activeRecently === 0 && totalRecords > 0) recommendations.push("No recent creation activity detected. Entity store may be stale.");
    if (totalRecords > 0 && activeTypes === 1) recommendations.push(`Only one entity type has records (${typeBreakdown.filter(t => t.count > 0)[0]?.entityType}). Expand to other types for richer analysis.`);

    return { totalRecords, entityTypes: allTypes, typeBreakdown, recentActivity, healthBand, recommendations };
  }
}

export const entityStoreOrchestrator = new EntityStoreOrchestrator();
