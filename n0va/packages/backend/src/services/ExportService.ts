interface ExportOptions {
  entityType: string;
  tenantId: string;
  fields?: string[];
  format: "csv" | "json";
  filters?: Record<string, any>;
  sample?: { method: "none" | "random" | "stratified" | "systematic"; size?: number };
}

interface DataQualityReport {
  entityType: string;
  totalRecords: number;
  completeness: number;
  fieldCompleteness: Record<string, { present: number; missing: number; rate: number }>;
  fieldTypes: Record<string, { type: string; uniqueValues: number; nullCount: number }>;
  overallQuality: number;
  issues: string[];
}

interface StatisticalSummary {
  entityType: string;
  recordCount: number;
  numericFields: Record<string, { min: number; max: number; mean: number; median: number; std: number; p25: number; p75: number; skewness: number }>;
  categoricalFields: Record<string, { uniqueValues: number; topValue: string; topFrequency: number; entropy: number }>;
}

export class ExportService {
  async exportData(options: ExportOptions): Promise<{ data: string; filename: string; contentType: string }> {
    const { DataStore } = await import("./DataStore");
    const records = await this.fetchRecords(DataStore, options);

    // Apply sampling if requested
    const sampled = options.sample && options.sample.method !== "none"
      ? this.sampleRecords(records, options.sample)
      : records;

    const fields = options.fields || this.getDefaultFields(options.entityType);
    const flattened = sampled.map((r: any) => this.flattenRecord(r, fields));

    if (options.format === "json") {
      return { data: JSON.stringify(flattened, null, 2), filename: `${options.entityType}_export_${Date.now()}.json`, contentType: "application/json" };
    }

    const header = fields.map((f) => this.escapeCsv(f)).join(",");
    const rows = flattened.map((r: any) => fields.map((f) => this.escapeCsv(String(r[f] ?? ""))).join(","));
    return { data: "\uFEFF" + [header, ...rows].join("\n"), filename: `${options.entityType}_export_${Date.now()}.csv`, contentType: "text/csv; charset=utf-8" };
  }

  // ─── Sampling Strategies ─────────────────────────────────────────────

  private sampleRecords(records: any[], sample: { method: string; size?: number }): any[] {
    const n = records.length;
    const targetSize = sample.size ? Math.min(n, sample.size) : Math.min(n, 1000);

    if (targetSize >= n) return records;

    switch (sample.method) {
      case "random": {
        const shuffled = [...records];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, targetSize);
      }
      case "systematic": {
        const step = Math.max(1, Math.floor(n / targetSize));
        const start = Math.floor(Math.random() * step);
        const result: any[] = [];
        for (let i = start; i < n && result.length < targetSize; i += step) result.push(records[i]);
        return result;
      }
      case "stratified": {
        // Stratify by status if available
        const strata = new Map<string, any[]>();
        for (const r of records) {
          const key = String(r.status || r.type || "unknown");
          if (!strata.has(key)) strata.set(key, []);
          strata.get(key)!.push(r);
        }
        const result: any[] = [];
        const perStratum = Math.max(1, Math.floor(targetSize / strata.size));
        for (const [, group] of strata) {
          const shuffled = [...group].sort(() => Math.random() - 0.5);
          result.push(...shuffled.slice(0, perStratum));
        }
        return result.slice(0, targetSize);
      }
      default:
        return records.slice(0, targetSize);
    }
  }

  // ─── Data Quality Scoring ────────────────────────────────────────────

  async assessDataQuality(entityType: string, tenantId: string): Promise<DataQualityReport> {
    const { DataStore } = await import("./DataStore");
    const records = await this.fetchRecords(DataStore, { entityType, tenantId, format: "json" });
    const n = records.length;
    if (n === 0) return { entityType, totalRecords: 0, completeness: 0, fieldCompleteness: {}, fieldTypes: {}, overallQuality: 0, issues: ["No records found"] };

    const fields = this.getDefaultFields(entityType);
    const fieldCompleteness: Record<string, { present: number; missing: number; rate: number }> = {};
    const fieldTypes: Record<string, { type: string; uniqueValues: number; nullCount: number }> = {};
    const issues: string[] = [];

    for (const f of fields) {
      let present = 0, nullCount = 0;
      const values = new Set<unknown>();
      const numericValues: number[] = [];

      for (const r of records) {
        const flattened = this.flattenRecord(r, [f]);
        const val = flattened[f];
        if (val !== null && val !== undefined && val !== "" && val !== "N/A") {
          present++;
          values.add(val);
          const num = Number(val);
          if (!isNaN(num)) numericValues.push(num);
        } else {
          nullCount++;
        }
      }

      const isNumeric = numericValues.length > n * 0.5;
      const type = isNumeric ? "numeric" : "categorical";
      fieldCompleteness[f] = { present, missing: nullCount, rate: Math.round((present / n) * 10000) / 100 };
      fieldTypes[f] = { type, uniqueValues: values.size, nullCount };

      if (fieldCompleteness[f].rate < 50) issues.push(`Field "${f}" has low completeness (${fieldCompleteness[f].rate}%).`);
    }

    const completeness = Math.round(fields.reduce((s, f) => s + fieldCompleteness[f].rate, 0) / fields.length * 100) / 100;
    const overallQuality = Math.round(completeness * 0.7 + (1 - issues.length / Math.max(fields.length, 1)) * 0.3 * 100);

    if (issues.length === 0) issues.push("All fields have acceptable completeness.");

    return { entityType, totalRecords: n, completeness, fieldCompleteness, fieldTypes, overallQuality, issues };
  }

  // ─── Statistical Summaries ───────────────────────────────────────────

  async generateStatisticalSummary(entityType: string, tenantId: string): Promise<StatisticalSummary> {
    const { DataStore } = await import("./DataStore");
    const records = await this.fetchRecords(DataStore, { entityType, tenantId, format: "json" });
    const fields = this.getDefaultFields(entityType);
    const n = records.length;

    const numericFields: Record<string, any> = {};
    const categoricalFields: Record<string, any> = {};

    for (const f of fields) {
      const values: number[] = [];
      const categories = new Map<string, number>();
      let stringCount = 0;

      for (const r of records) {
        const flattened = this.flattenRecord(r, [f]);
        const val = flattened[f];
        const num = Number(val);
        if (!isNaN(num) && val !== null && val !== "" && val !== true && val !== false) {
          values.push(num);
        } else if (val !== null && val !== undefined && val !== "") {
          const key = String(val);
          categories.set(key, (categories.get(key) || 0) + 1);
          stringCount++;
        }
      }

      if (values.length >= n * 0.5 && values.length > 2) {
        const sorted = [...values].sort((a, b) => a - b);
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const median = values.length % 2 === 0
          ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
          : sorted[Math.floor(values.length / 2)];
        const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
        const std = Math.sqrt(variance);
        const skewness = std > 0 ? values.reduce((s, v) => s + ((v - mean) / std) ** 3, 0) / values.length : 0;

        numericFields[f] = {
          min: Math.round(Math.min(...values) * 100) / 100,
          max: Math.round(Math.max(...values) * 100) / 100,
          mean: Math.round(mean * 100) / 100,
          median: Math.round(median * 100) / 100,
          std: Math.round(std * 100) / 100,
          p25: Math.round(this.percentile(sorted, 0.25) * 100) / 100,
          p75: Math.round(this.percentile(sorted, 0.75) * 100) / 100,
          skewness: Math.round(skewness * 100) / 100,
        };
      } else if (categories.size > 0) {
        const total = Array.from(categories.values()).reduce((s, v) => s + v, 0);
        const topEntry = Array.from(categories.entries()).sort((a, b) => b[1] - a[1])[0];
        const entropy = -Array.from(categories.values()).reduce((s, v) => {
          const p = v / total;
          return s + (p > 0 ? p * Math.log2(p) : 0);
        }, 0);

        categoricalFields[f] = {
          uniqueValues: categories.size,
          topValue: topEntry?.[0] || "",
          topFrequency: Math.round((topEntry?.[1] || 0) / total * 10000) / 100,
          entropy: Math.round(entropy * 100) / 100,
        };
      }
    }

    return { entityType, recordCount: n, numericFields, categoricalFields };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  private async fetchRecords(DataStore: any, options: ExportOptions): Promise<any[]> {
    const filter: any = { tenantId: options.tenantId, ...(options.filters || {}) };
    switch (options.entityType) {
      case "campaigns": { const r = await DataStore.findCampaigns(filter, {}, 0, 1000); return "campaigns" in r ? r.campaigns : r; }
      case "creatives": return DataStore.findCreatives(filter);
      case "audiences": return DataStore.findAudiences(filter);
      case "agents": return DataStore.findAgents(filter);
      case "goals": return DataStore.findGoals(filter);
      case "keywords": return DataStore.findKeywords(filter);
      case "landing_pages": return DataStore.findLandingPages(filter);
      case "segments": return DataStore.findSegments(filter);
      case "utm_links": return DataStore.findUtmLinks(filter);
      case "media_kits": return DataStore.findMediaKits(filter);
      case "competitive_intel": return DataStore.findCompetitiveIntel(filter);
      case "content_assets": return DataStore.findContentAssets(filter);
      case "marketing_forms": return DataStore.findMarketingForms(filter);
      case "customer_journeys": return DataStore.findCustomerJourneys(filter);
      case "costs": return DataStore.findCosts(filter);
      case "funnel_data": return DataStore.findFunnelData(filter);
      default: return [];
    }
  }

  private getDefaultFields(entityType: string): string[] {
    const defaults: Record<string, string[]> = {
      campaigns: ["name", "status", "type", "platforms", "budget.daily", "budget.lifetime", "budget.spent", "budget.remaining", "startDate", "endDate", "goal", "createdAt"],
      creatives: ["name", "type", "status", "headline", "body", "cta", "assetUrl", "tags", "createdAt"],
      audiences: ["name", "type", "platform", "status", "size", "description", "tags", "createdAt"],
      agents: ["name", "type", "status", "schedule", "lastRun", "successCount", "failureCount", "createdAt"],
      goals: ["name", "type", "target", "current", "unit", "status", "deadline", "createdAt"],
      keywords: ["keyword", "matchType", "searchVolume", "difficulty", "cpc", "position", "status", "createdAt"],
      costs: ["date", "category", "planned", "actual", "variance", "notes"],
    };
    return defaults[entityType] || ["name", "status", "createdAt"];
  }

  private flattenRecord(record: any, fields: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    for (const field of fields) {
      const parts = field.split(".");
      let value = record;
      for (const part of parts) { if (value == null || typeof value !== "object") { value = ""; break; } value = value[part]; }
      result[field] = Array.isArray(value) ? value.join("; ") : value ?? "";
    }
    return result;
  }

  private escapeCsv(value: any): string {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) return `"${str.replace(/"/g, '""')}"`;
    return str;
  }

  private percentile(sorted: number[], p: number): number {
    const idx = p * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }
}

export const exportService = new ExportService();
