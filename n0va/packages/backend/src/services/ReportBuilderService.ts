import { DataStore } from "./DataStore";

interface ReportWidget {
  id: string;
  type: "metric_card" | "line_chart" | "bar_chart" | "pie_chart" | "table" | "funnel" | "heatmap" | "comparison";
  title: string;
  metric?: string;
  dimension?: string;
  campaignIds?: string[];
  platform?: string;
  aggregation?: "sum" | "avg" | "count" | "min" | "max";
  comparison?: "none" | "previous_period" | "year_over_year";
  size: "small" | "medium" | "large" | "full";
  position: { x: number; y: number };
}

interface ReportConfig {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  dateRange: "today" | "yesterday" | "last_7" | "last_30" | "last_90" | "this_month" | "last_month" | "this_quarter" | "custom";
  startDate?: string;
  endDate?: string;
  widgets: ReportWidget[];
  schedule?: {
    frequency: "daily" | "weekly" | "monthly";
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    recipients: string[];
    format: "pdf" | "csv" | "json";
    lastSent?: string;
    nextSend?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export class ReportBuilderService {
  getDefaultWidgets(): ReportWidget[] {
    return [
      { id: "w_impressions", type: "metric_card", title: "Impressions", metric: "impressions", size: "small", position: { x: 0, y: 0 } },
      { id: "w_clicks", type: "metric_card", title: "Clicks", metric: "clicks", size: "small", position: { x: 1, y: 0 } },
      { id: "w_spend", type: "metric_card", title: "Spend", metric: "spend", size: "small", position: { x: 2, y: 0 } },
      { id: "w_conversions", type: "metric_card", title: "Conversions", metric: "conversions", size: "small", position: { x: 3, y: 0 } },
      { id: "w_performance_chart", type: "line_chart", title: "Performance Over Time", metric: "spend", dimension: "date", size: "large", position: { x: 0, y: 1 } },
      { id: "w_platform_pie", type: "pie_chart", title: "Spend by Platform", metric: "spend", dimension: "platform", size: "medium", position: { x: 0, y: 2 } },
      { id: "w_campaign_table", type: "table", title: "Campaign Performance", size: "full", position: { x: 0, y: 3 } },
    ];
  }

  createReport(tenantId: string, data: { name: string; description?: string; dateRange: string; startDate?: string; endDate?: string; widgets?: ReportWidget[] }): ReportConfig {
    const mem = DataStore["mem"]();
    const report: ReportConfig = {
      id: `report_${Date.now()}`,
      tenantId,
      name: data.name,
      description: data.description || "",
      dateRange: data.dateRange as any,
      startDate: data.startDate,
      endDate: data.endDate,
      widgets: data.widgets || this.getDefaultWidgets(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mem.insert("reports", report);
    return report;
  }

  getReports(tenantId: string): ReportConfig[] {
    const mem = DataStore["mem"]();
    return mem.find("reports", (r: any) => r.tenantId === tenantId) as ReportConfig[];
  }

  getReport(tenantId: string, id: string): ReportConfig | undefined {
    const mem = DataStore["mem"]();
    return mem.findOne("reports", (r: any) => r.tenantId === tenantId && r.id === id) as ReportConfig | undefined;
  }

  updateReport(tenantId: string, id: string, data: Partial<ReportConfig>): ReportConfig | null {
    const mem = DataStore["mem"]();
    const existing = mem.findOne("reports", (r: any) => r.tenantId === tenantId && r.id === id);
    if (!existing) return null;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    mem.update("reports", (r: any) => r.id === id, updated);
    return updated;
  }

  deleteReport(tenantId: string, id: string): boolean {
    const mem = DataStore["mem"]();
    return mem.delete("reports", (r: any) => r.tenantId === tenantId && r.id === id);
  }

  generateReportData(tenantId: string, reportId: string): { widgets: any[]; dateRange: string } {
    const mem = DataStore["mem"]();
    const report = mem.findOne("reports", (r: any) => r.tenantId === tenantId && r.id === reportId) as ReportConfig | undefined;
    if (!report) throw new Error("Report not found");

    const metrics = mem.find("metrics", (m: any) => true) as any[];

    const widgetData = report.widgets.map((w) => {
      let data: any = { widgetId: w.id, title: w.title, type: w.type };

      switch (w.type) {
        case "metric_card": {
          const values = metrics.map((m) => Number(m[w.metric || "impressions"]) || 0);
          const total = values.reduce((s: number, v: number) => s + v, 0);
          const avg = values.length > 0 ? total / values.length : 0;
          const prevValues = metrics.slice(-60, -30).map((m) => Number(m[w.metric || "impressions"]) || 0);
          const prevTotal = prevValues.reduce((s: number, v: number) => s + v, 0);
          const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;
          data = { ...data, total, avg, change };
          break;
        }
        case "line_chart": {
          const grouped = metrics.reduce((acc: any, m: any) => {
            const key = m.date || m.name || "unknown";
            if (!acc[key]) acc[key] = 0;
            acc[key] += Number(m[w.metric || "spend"]) || 0;
            return acc;
          }, {});
          data = { ...data, series: Object.entries(grouped).map(([label, value]) => ({ label, value })) };
          break;
        }
        case "pie_chart": {
          const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);
          const platformData: Record<string, number> = {};
          campaigns.forEach((c: any) => {
            const platforms = c.platforms || [];
            const avg = platforms.length > 0 ? (c.budget?.spent || 0) / platforms.length : 0;
            platforms.forEach((p: string) => { platformData[p] = (platformData[p] || 0) + avg; });
          });
          data = { ...data, segments: Object.entries(platformData).map(([label, value]) => ({ label, value })) };
          break;
        }
        case "table": {
          const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);
          data = { ...data, columns: ["Name", "Status", "Budget", "Spent", "Platforms", "Goal"], rows: campaigns.map((c: any) => [c.name, c.status, `$${(c.budget?.lifetime || 0).toLocaleString()}`, `$${(c.budget?.spent || 0).toLocaleString()}`, (c.platforms || []).join(", "), c.goal || ""]) };
          break;
        }
        case "funnel": {
          data = { ...data, stages: [
            { label: "Impressions", value: metrics.reduce((s: number, m: any) => s + (Number(m.impressions) || 0), 0) },
            { label: "Clicks", value: metrics.reduce((s: number, m: any) => s + (Number(m.clicks) || 0), 0) },
            { label: "Conversions", value: metrics.reduce((s: number, m: any) => s + (Number(m.conversions) || 0), 0) },
          ]};
          break;
        }
        case "comparison": {
          const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);
          const currentPeriod = metrics.slice(-30);
          const previousPeriod = metrics.slice(-60, -30);
          data = { ...data, current: currentPeriod.reduce((s: number, m: any) => s + (Number(m[w.metric || "spend"]) || 0), 0), previous: previousPeriod.reduce((s: number, m: any) => s + (Number(m[w.metric || "spend"]) || 0), 0) };
          break;
        }
      }
      return data;
    });

    return { widgets: widgetData, dateRange: report.dateRange };
  }

  scheduleReport(tenantId: string, reportId: string, schedule: { frequency: string; dayOfWeek?: number; dayOfMonth?: number; time: string; recipients: string[]; format: string }): ReportConfig | null {
    const mem = DataStore["mem"]();
    const report = mem.findOne("reports", (r: any) => r.tenantId === tenantId && r.id === reportId) as ReportConfig | undefined;
    if (!report) return null;

    const nextDate = new Date();
    if (schedule.frequency === "daily") nextDate.setDate(nextDate.getDate() + 1);
    else if (schedule.frequency === "weekly") nextDate.setDate(nextDate.getDate() + ((7 - nextDate.getDay() + (schedule.dayOfWeek || 1)) % 7 || 7));
    else if (schedule.frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);

    const [hours, minutes] = schedule.time.split(":").map(Number);
    nextDate.setHours(hours || 9, minutes || 0, 0, 0);

    const updated = {
      ...report,
      schedule: {
        frequency: schedule.frequency as any,
        dayOfWeek: schedule.dayOfWeek,
        dayOfMonth: schedule.dayOfMonth,
        time: schedule.time,
        recipients: schedule.recipients,
        format: schedule.format as any,
        nextSend: nextDate.toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
    mem.update("reports", (r: any) => r.id === reportId, updated);
    return updated;
  }

  removeSchedule(tenantId: string, reportId: string): ReportConfig | null {
    const mem = DataStore["mem"]();
    const report = mem.findOne("reports", (r: any) => r.tenantId === tenantId && r.id === reportId) as ReportConfig | undefined;
    if (!report) return null;
    const { schedule, ...rest } = report;
    mem.update("reports", (r: any) => r.id === reportId, { ...rest, updatedAt: new Date().toISOString() });
    return rest as ReportConfig;
  }

  getAvailableMetrics(): { key: string; label: string; category: string }[] {
    return [
      { key: "impressions", label: "Impressions", category: "volume" },
      { key: "clicks", label: "Clicks", category: "engagement" },
      { key: "ctr", label: "CTR", category: "engagement" },
      { key: "cpc", label: "CPC", category: "cost" },
      { key: "cpm", label: "CPM", category: "cost" },
      { key: "spend", label: "Spend", category: "cost" },
      { key: "conversions", label: "Conversions", category: "conversion" },
      { key: "cpa", label: "CPA", category: "conversion" },
      { key: "roas", label: "ROAS", category: "revenue" },
      { key: "revenue", label: "Revenue", category: "revenue" },
      { key: "reach", label: "Reach", category: "volume" },
      { key: "frequency", label: "Frequency", category: "engagement" },
      { key: "engagement", label: "Engagement Rate", category: "engagement" },
      { key: "videoViews", label: "Video Views", category: "engagement" },
      { key: "videoCompletion", label: "Video Completion", category: "engagement" },
    ];
  }

  getChartTypes(): { type: string; label: string; description: string }[] {
    return [
      { type: "metric_card", label: "Metric Card", description: "Single KPI with trend" },
      { type: "line_chart", label: "Line Chart", description: "Trend over time" },
      { type: "bar_chart", label: "Bar Chart", description: "Compare values" },
      { type: "pie_chart", label: "Pie Chart", description: "Distribution breakdown" },
      { type: "table", label: "Data Table", description: "Raw data in rows" },
      { type: "funnel", label: "Funnel", description: "Conversion funnel" },
      { type: "comparison", label: "Comparison", description: "Period-over-period" },
    ];
  }
}

export const reportBuilderService = new ReportBuilderService();
