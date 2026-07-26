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

export interface EntityTypeDetail {
  entityType: string;
  totalRecords: number;
  attributeCoverage: { field: string; coverage: number; type: string }[];
  attributeCorrelations: { field1: string; field2: string; coOccurrence: number }[];
  creationTrend: { date: string; count: number }[];
  staleDays: number | null;
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

  async getEntityTypeDetail(tenantId: string, entityType: string): Promise<EntityTypeDetail> {
    const records = await entityStore.list(tenantId, entityType);
    const totalRecords = records.length;

    const attrMap = new Map<string, { count: number; types: Set<string> }>();
    for (const r of records) {
      for (const [key, value] of Object.entries(r)) {
        if (key === "_id") continue;
        if (!attrMap.has(key)) attrMap.set(key, { count: 0, types: new Set() });
        const entry = attrMap.get(key)!;
        entry.count++;
        entry.types.add(typeof value);
      }
    }

    const attributeCoverage = Array.from(attrMap.entries())
      .map(([field, info]) => ({
        field,
        coverage: totalRecords > 0 ? Math.round((info.count / totalRecords) * 100) : 0,
        type: Array.from(info.types).join(" | "),
      }))
      .sort((a, b) => b.coverage - a.coverage);

    const fields = attributeCoverage.map((a) => a.field);
    const attributeCorrelations: { field1: string; field2: string; coOccurrence: number }[] = [];
    for (let i = 0; i < Math.min(fields.length, 5); i++) {
      for (let j = i + 1; j < Math.min(fields.length, 5); j++) {
        const f1 = fields[i], f2 = fields[j];
        const both = records.filter((r: any) => r[f1] !== undefined && r[f2] !== undefined).length;
        attributeCorrelations.push({
          field1: f1, field2: f2,
          coOccurrence: totalRecords > 0 ? Math.round((both / totalRecords) * 100) : 0,
        });
      }
    }

    const dateMap = new Map<string, number>();
    for (const r of records) {
      const d = r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : (r.uploadedAt ? new Date(r.uploadedAt).toISOString().split("T")[0] : null);
      if (d) dateMap.set(d, (dateMap.get(d) || 0) + 1);
    }
    const creationTrend = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const dates = records
      .map((r: any) => r.createdAt || r.uploadedAt)
      .filter(Boolean)
      .sort()
      .reverse();
    const staleDays = dates.length > 0
      ? Math.round((Date.now() - new Date(dates[0]).getTime()) / 86400000)
      : null;

    const recommendations: string[] = [];
    if (totalRecords === 0) {
      recommendations.push(`No records for entity type "${entityType}". Create your first record to start tracking.`);
    } else {
      const sparse = attributeCoverage.filter((a) => a.coverage < 60);
      if (sparse.length > 0) recommendations.push(`Sparse attributes: ${sparse.map((a) => a.field).join(", ")}. Consider standardizing data collection.`);
      if (staleDays !== null && staleDays > 30) recommendations.push(`No new records in ${staleDays} days. Entity type may be stale.`);
      if (creationTrend.length >= 7) {
        const recent = creationTrend.slice(-7).reduce((s, d) => s + d.count, 0);
        const prior = creationTrend.slice(-14, -7).reduce((s, d) => s + d.count, 0);
        if (prior > 0 && recent < prior * 0.5) recommendations.push("Creation rate has dropped >50% in the last week. Investigate pipeline health.");
      }
    }

    return { entityType, totalRecords, attributeCoverage, attributeCorrelations, creationTrend, staleDays, recommendations };
  }
}

export const entityStoreOrchestrator = new EntityStoreOrchestrator();
