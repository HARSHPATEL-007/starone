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

interface TrendLine {
  slope: number;
  intercept: number;
  rSquared: number;
  direction: "up" | "down" | "flat";
  points: { label: string; actual: number; trend: number; lower: number; upper: number }[];
}

interface Insight {
  type: "trend" | "anomaly" | "comparison" | "distribution";
  title: string;
  description: string;
  severity: "positive" | "neutral" | "negative";
  metric: string;
  value: number;
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
    return DataStore["mem"]().find("reports", (r: any) => r.tenantId === tenantId) as ReportConfig[];
  }

  getReport(tenantId: string, id: string): ReportConfig | undefined {
    return DataStore["mem"]().findOne("reports", (r: any) => r.tenantId === tenantId && r.id === id) as ReportConfig | undefined;
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
    return DataStore["mem"]().delete("reports", (r: any) => r.tenantId === tenantId && r.id === id);
  }

  // ─── Enhanced Report Data Generation ─────────────────────────────────

  generateReportData(tenantId: string, reportId: string): { widgets: any[]; dateRange: string; insights: Insight[] } {
    const mem = DataStore["mem"]();
    const report = mem.findOne("reports", (r: any) => r.tenantId === tenantId && r.id === reportId) as ReportConfig | undefined;
    if (!report) throw new Error("Report not found");

    const metrics = mem.find("metrics", () => true) as any[];
    const insights: Insight[] = [];

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
          data = { ...data, total, avg, change, label: this.formatMetric(total, w.metric || "impressions") };
          if (Math.abs(change) > 20) insights.push({ type: "trend", title: `${w.metric} Change`, description: `${w.metric} ${change > 0 ? "increased" : "decreased"} by ${Math.abs(change).toFixed(0)}% vs previous period.`, severity: change > 0 ? "positive" : "negative", metric: w.metric || "", value: change });
          break;
        }
        case "line_chart": {
          const grouped = this.groupByDate(metrics, w.metric || "spend");
          const trend = this.computeTrendLine(grouped);
          const ma = this.movingAverage(grouped, 3);
          data = { ...data, series: grouped, trendLine: trend, movingAverage: ma };
          break;
        }
        case "bar_chart": {
          const grouped = this.groupByDate(metrics, w.metric || "spend");
          data = { ...data, series: grouped };
          break;
        }
        case "pie_chart": {
          const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);
          const platformData: Record<string, number> = {};
          campaigns.forEach((c: any) => {
            const platforms = c.platforms || [];
            const pAvg = platforms.length > 0 ? (c.budget?.spent || 0) / platforms.length : 0;
            platforms.forEach((p: string) => { platformData[p] = (platformData[p] || 0) + pAvg; });
          });
          const segments = Object.entries(platformData).map(([label, value]) => ({ label, value }));
          data = { ...data, segments };
          break;
        }
        case "table": {
          const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);
          const rows = campaigns.map((c: any) => [c.name, c.status, `$${(c.budget?.lifetime || 0).toLocaleString()}`, `$${(c.budget?.spent || 0).toLocaleString()}`, (c.platforms || []).join(", "), c.goal || ""]);
          data = { ...data, columns: ["Name", "Status", "Budget", "Spent", "Platforms", "Goal"], rows };
          break;
        }
        case "funnel": {
          const imp = metrics.reduce((s: number, m: any) => s + (Number(m.impressions) || 0), 0);
          const clicks = metrics.reduce((s: number, m: any) => s + (Number(m.clicks) || 0), 0);
          const conv = metrics.reduce((s: number, m: any) => s + (Number(m.conversions) || 0), 0);
          data = { ...data, stages: [
            { label: "Impressions", value: imp },
            { label: "Clicks", value: clicks },
            { label: "Conversions", value: conv },
          ]};
          if (imp > 0) insights.push({ type: "distribution", title: "Funnel Drop-off", description: `${((1 - clicks / imp) * 100).toFixed(0)}% drop from impressions to clicks.`, severity: (clicks / imp) < 0.1 ? "negative" : "neutral", metric: "conversion_funnel", value: Math.round((conv / imp) * 10000) / 100 });
          break;
        }
        case "comparison": {
          const currentPeriod = metrics.slice(-30);
          const previousPeriod = metrics.slice(-60, -30);
          const current = currentPeriod.reduce((s: number, m: any) => s + (Number(m[w.metric || "spend"]) || 0), 0);
          const previous = previousPeriod.reduce((s: number, m: any) => s + (Number(m[w.metric || "spend"]) || 0), 0);
          const pctChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;
          data = { ...data, current, previous, change: Math.round(pctChange * 100) / 100 };
          insights.push({ type: "comparison", title: "Period Comparison", description: `${w.metric} changed ${pctChange > 0 ? "+" : ""}${pctChange.toFixed(0)}% vs previous 30 days.`, severity: pctChange > 0 ? "positive" : pctChange < 0 ? "negative" : "neutral", metric: w.metric || "", value: pctChange });
          break;
        }
      }
      return data;
    });

    return { widgets: widgetData, dateRange: report.dateRange, insights };
  }

  // ─── Trend Line (Linear Regression) ──────────────────────────────────

  computeTrendLine(data: { label: string; value: number }[]): TrendLine {
    const n = data.length;
    if (n < 3) return { slope: 0, intercept: 0, rSquared: 0, direction: "flat", points: data.map((d) => ({ label: d.label, actual: d.value, trend: d.value, lower: d.value, upper: d.value })) };

    const x = data.map((_, i) => i);
    const y = data.map((d) => d.value);
    const meanX = (n - 1) / 2;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (x[i] - meanX) * (y[i] - meanY); den += (x[i] - meanX) ** 2; }
    const slope = den > 0 ? num / den : 0;
    const intercept = meanY - slope * meanX;

    const ssRes = y.reduce((s, yi, i) => s + (yi - (slope * x[i] + intercept)) ** 2, 0);
    const ssTot = y.reduce((s, yi) => s + (yi - meanY) ** 2, 0);
    const rSquared = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;

    const residuals = y.map((yi, i) => yi - (slope * x[i] + intercept));
    const rmse = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / n);

    const points = data.map((d, i) => {
      const trend = slope * i + intercept;
      return {
        label: d.label, actual: d.value,
        trend: Math.round(trend * 100) / 100,
        lower: Math.max(0, Math.round((trend - 1.96 * rmse) * 100) / 100),
        upper: Math.round((trend + 1.96 * rmse) * 100) / 100,
      };
    });

    const direction: "up" | "down" | "flat" = slope > 0.01 ? "up" : slope < -0.01 ? "down" : "flat";
    return { slope: Math.round(slope * 10000) / 10000, intercept: Math.round(intercept * 100) / 100, rSquared: Math.round(rSquared * 10000) / 10000, direction, points };
  }

  // ─── Moving Average ──────────────────────────────────────────────────

  movingAverage(data: { label: string; value: number }[], window: number): { label: string; value: number }[] {
    return data.map((d, i) => {
      if (i < window - 1) return { label: d.label, value: d.value };
      const slice = data.slice(i - window + 1, i + 1);
      return { label: d.label, value: Math.round(slice.reduce((s, p) => s + p.value, 0) / window * 100) / 100 };
    });
  }

  // ─── Forecast (Simple Exponential Smoothing) ─────────────────────────

  forecast(metric: string, data: { label: string; value: number }[], horizon = 7): { points: { label: string; value: number; lower: number; upper: number }[]; confidence: number } {
    if (data.length < 3) return { points: data.slice(0, horizon).map((d) => ({ label: d.label, value: d.value, lower: d.value, upper: d.value })), confidence: 0 };

    const alpha = 0.3;
    const values = data.map((d) => d.value);
    let level = values[0];
    for (let i = 1; i < values.length; i++) level = alpha * values[i] + (1 - alpha) * level;

    const residuals = values.map((v, i) => i === 0 ? 0 : v - level);
    const rmse = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / values.length);
    const lastLabel = data[data.length - 1].label;

    const points: { label: string; value: number; lower: number; upper: number }[] = [];
    for (let i = 1; i <= horizon; i++) {
      const pred = Math.max(0, level);
      const nextDate = this.advanceDate(lastLabel, i);
      points.push({
        label: nextDate,
        value: Math.round(pred * 100) / 100,
        lower: Math.max(0, Math.round((pred - 1.96 * rmse) * 100) / 100),
        upper: Math.round((pred + 1.96 * rmse) * 100) / 100,
      });
    }

    const confidence = level > 0 ? Math.max(0, Math.min(1, 1 - rmse / level)) : 0.5;
    return { points, confidence: Math.round(confidence * 100) / 100 };
  }

  // ─── Automated Insights ──────────────────────────────────────────────

  generateInsights(tenantId: string): Insight[] {
    const mem = DataStore["mem"]();
    const metrics = mem.find("metrics", () => true) as any[];
    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId) as any[];
    const insights: Insight[] = [];

    if (metrics.length === 0) return insights;

    // Overall ROAS trend
    const half = Math.floor(metrics.length / 2);
    const recent = metrics.slice(half);
    const earlier = metrics.slice(0, half);
    const sumRev = (arr: any[]) => arr.reduce((s: number, m: any) => s + (Number(m.revenue) || 0), 0);
    const sumSpend = (arr: any[]) => arr.reduce((s: number, m: any) => s + (Number(m.spend) || 0), 0);
    const recentRoas = sumSpend(recent) > 0 ? sumRev(recent) / sumSpend(recent) : 0;
    const earlierRoas = sumSpend(earlier) > 0 ? sumRev(earlier) / sumSpend(earlier) : 0;
    const roasChange = earlierRoas > 0 ? ((recentRoas - earlierRoas) / earlierRoas) * 100 : 0;
    if (Math.abs(roasChange) > 5) {
      insights.push({ type: "trend", title: "ROAS Trend", description: `ROAS ${roasChange > 0 ? "improved" : "declined"} by ${Math.abs(roasChange).toFixed(0)}%.`, severity: roasChange > 0 ? "positive" : "negative", metric: "roas", value: Math.round(roasChange * 100) / 100 });
    }

    // Spend velocity
    const totalSpend = metrics.reduce((s: number, m: any) => s + (Number(m.spend) || 0), 0);
    const activeCount = campaigns.filter((c) => c.status === "active").length;
    if (activeCount > 0) {
      insights.push({ type: "distribution", title: "Avg Spend per Active Campaign", description: `$${(totalSpend / activeCount).toLocaleString()} avg spend across ${activeCount} active campaigns.`, severity: "neutral", metric: "spend", value: totalSpend / activeCount });
    }

    // CTR anomaly
    const allCtr = metrics.filter((m: any) => m.impressions > 0).map((m: any) => (m.clicks || 0) / m.impressions);
    if (allCtr.length > 0) {
      const avgCtr = allCtr.reduce((a: number, b: number) => a + b, 0) / allCtr.length;
      const lastCtr = allCtr[allCtr.length - 1];
      const ctrZ = avgCtr > 0 ? (lastCtr - avgCtr) / avgCtr : 0;
      if (Math.abs(ctrZ) > 0.3) {
        insights.push({ type: "anomaly", title: "CTR Anomaly", description: `Latest CTR ${ctrZ > 0 ? "spiked" : "dropped"} ${Math.abs(ctrZ * 100).toFixed(0)}% vs average.`, severity: ctrZ > 0 ? "positive" : "negative", metric: "ctr", value: Math.round(lastCtr * 10000) / 100 });
      }
    }

    return insights;
  }

  // ─── Chart Data Helpers ──────────────────────────────────────────────

  private groupByDate(metrics: any[], metric: string): { label: string; value: number }[] {
    const grouped: Record<string, number> = {};
    for (const m of metrics) {
      const key = m.date || m.name || "unknown";
      grouped[key] = (grouped[key] || 0) + (Number(m[metric]) || 0);
    }
    return Object.entries(grouped).map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }));
  }

  private advanceDate(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return `day_${days}`;
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  private formatMetric(value: number, metric: string): string {
    if (metric === "spend" || metric === "revenue") return `$${value.toLocaleString()}`;
    if (metric === "ctr" || metric === "cvr") return `${(value * 100).toFixed(2)}%`;
    if (["impressions", "clicks", "conversions"].includes(metric)) return value.toLocaleString();
    return `${value}`;
  }

  // ─── Existing CRUD helpers ───────────────────────────────────────────

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
    const updated = { ...report, schedule: { frequency: schedule.frequency as any, dayOfWeek: schedule.dayOfWeek, dayOfMonth: schedule.dayOfMonth, time: schedule.time, recipients: schedule.recipients, format: schedule.format as any, nextSend: nextDate.toISOString() }, updatedAt: new Date().toISOString() };
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
