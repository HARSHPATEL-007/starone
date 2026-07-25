interface ExportOptions {
  entityType: string;
  tenantId: string;
  fields?: string[];
  format: "csv" | "json";
  filters?: Record<string, any>;
}

export class ExportService {
  async exportData(options: ExportOptions): Promise<{ data: string; filename: string; contentType: string }> {
    const { DataStore } = await import("./DataStore");
    const records = await this.fetchRecords(DataStore, options);
    const fields = options.fields || this.getDefaultFields(options.entityType);
    const flattened = records.map((r: any) => this.flattenRecord(r, fields));

    if (options.format === "json") {
      return {
        data: JSON.stringify(flattened, null, 2),
        filename: `${options.entityType}_export_${Date.now()}.json`,
        contentType: "application/json",
      };
    }

    const header = fields.map((f) => this.escapeCsv(f)).join(",");
    const rows = flattened.map((r: any) => fields.map((f) => this.escapeCsv(String(r[f] ?? ""))).join(","));
    return {
      data: "\uFEFF" + [header, ...rows].join("\n"),
      filename: `${options.entityType}_export_${Date.now()}.csv`,
      contentType: "text/csv; charset=utf-8",
    };
  }

  private async fetchRecords(DataStore: any, options: ExportOptions): Promise<any[]> {
    const filter: any = { tenantId: options.tenantId, ...(options.filters || {}) };

    switch (options.entityType) {
      case "campaigns": {
        const result = await DataStore.findCampaigns(filter, {}, 0, 1000);
        return "campaigns" in result ? result.campaigns : result;
      }
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
      for (const part of parts) {
        if (value == null || typeof value !== "object") { value = ""; break; }
        value = value[part];
      }
      result[field] = Array.isArray(value) ? value.join("; ") : value ?? "";
    }
    return result;
  }

  private escapeCsv(value: any): string {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

export const exportService = new ExportService();
