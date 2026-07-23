import { useEffect, useState, useMemo } from "react";
import { BarChart3, Download, FileText, Calendar, RefreshCw, Clock, CheckCircle } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { useCsvExport } from "../hooks/useCsvExport";
import { SkeletonCard } from "../components/Skeleton";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: string;
  fields: string[];
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: "campaign-performance", name: "Campaign Performance", description: "Spend, revenue, ROAS, and key metrics per campaign", icon: BarChart3, category: "Performance", fields: ["Name", "Type", "Status", "Budget", "Spent", "Revenue", "ROAS", "Impressions", "Clicks", "CTR", "Conversions"] },
  { id: "creative-summary", name: "Creative Summary", description: "All creatives with type, status, and performance data", icon: FileText, category: "Creative", fields: ["Name", "Type", "Status", "Headline", "CTA", "Impressions", "CTR", "Tags"] },
  { id: "audience-overview", name: "Audience Overview", description: "Audience segments with size, type, and platform data", icon: BarChart3, category: "Audience", fields: ["Name", "Type", "Platform", "Size", "Status", "Source"] },
  { id: "budget-analysis", name: "Budget Analysis", description: "Budget utilization, pacing, and remaining per campaign", icon: BarChart3, category: "Budget", fields: ["Campaign", "Status", "Daily Budget", "Lifetime Budget", "Spent", "Remaining", "Utilization %"] },
  { id: "platform-comparison", name: "Platform Comparison", description: "Cross-platform performance metrics side-by-side", icon: BarChart3, category: "Platform", fields: ["Platform", "Impressions", "Clicks", "Conversions", "Spend", "Revenue", "CTR", "ROAS", "CPC"] },
  { id: "agent-activity", name: "Agent Activity", description: "AI agent run history and performance metrics", icon: RefreshCw, category: "Automation", fields: ["Name", "Type", "Status", "Runs", "Successes", "Failures", "Actions"] },
  { id: "full-export", name: "Full Platform Export", description: "All campaigns, creatives, audiences in one file", icon: Download, category: "Export", fields: ["Type", "Name", "Status", "Metrics"] },
];

const DATE_RANGES = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
];

export default function ReportCenter() {
  const { addToast } = useToast();
  const { exportToCsv } = useCsvExport();
  const [running, setRunning] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; name: string; time: string; rows: number }[]>([]);
  const [selectedRange, setSelectedRange] = useState(30);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [audiences, setAudiences] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.campaigns.list().then((r) => Array.isArray(r) ? r : r.campaigns || []).catch(() => []),
      api.creatives.list().catch(() => []),
      api.audiences.list().catch(() => []),
      api.agents.list().catch(() => []),
    ]).then(([c, cr, a, ag]) => {
      setCampaigns(c);
      setCreatives(cr);
      setAudiences(a);
      setAgents(ag);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("n0va_report_history");
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  function saveHistory(entry: { id: string; name: string; time: string; rows: number }) {
    const updated = [entry, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem("n0va_report_history", JSON.stringify(updated));
  }

  async function generateCampaignPerformance() {
    const data = campaigns.map((c: any) => ({
      Name: c.name,
      Type: c.type,
      Status: c.status,
      Budget: c.budget?.lifetime || 0,
      Spent: c.budget?.spent || 0,
      Revenue: "$0",
      ROAS: "0.0",
      Impressions: 0,
      Clicks: 0,
      CTR: "0%",
      Conversions: 0,
    }));
    const analyticsResults = await Promise.allSettled(
      campaigns.map((c: any) => api.analytics.campaign(c._id || c.id, String(selectedRange)))
    );
    analyticsResults.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value) {
        const daily = result.value.daily || [];
        data[i].Revenue = `$${daily.reduce((s: number, d: any) => s + (d.revenue || 0), 0).toLocaleString()}`;
        data[i].Impressions = daily.reduce((s: number, d: any) => s + (d.impressions || 0), 0);
        data[i].Clicks = daily.reduce((s: number, d: any) => s + (d.clicks || 0), 0);
        data[i].Conversions = daily.reduce((s: number, d: any) => s + (d.conversions || 0), 0);
        const totalSpend = daily.reduce((s: number, d: any) => s + (d.spend || 0), 0);
        const totalRevenue = daily.reduce((s: number, d: any) => s + (d.revenue || 0), 0);
        data[i].ROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : "0.0";
        data[i].CTR = data[i].Impressions > 0 ? `${((data[i].Clicks / data[i].Impressions) * 100).toFixed(2)}%` : "0%";
      }
    });
    return data;
  }

  async function generateReport(template: ReportTemplate) {
    setRunning(template.id);
    try {
      let data: Record<string, any>[] = [];
      switch (template.id) {
        case "campaign-performance":
          data = await generateCampaignPerformance();
          break;
        case "creative-summary":
          data = creatives.map((c: any) => ({
            Name: c.name, Type: c.type, Status: c.status,
            Headline: c.headline || "", CTA: c.cta || "",
            Impressions: c.performance?.impressions || 0,
            CTR: c.performance?.ctr || 0,
            Tags: (c.tags || []).join("; "),
          }));
          break;
        case "audience-overview":
          data = audiences.map((a: any) => ({
            Name: a.name, Type: a.type, Platform: a.platform,
            Size: a.size || 0, Status: a.status,
            Source: a.criteria?.source || a.platform || "",
          }));
          break;
        case "budget-analysis":
          data = campaigns.map((c: any) => {
            const budget = c.budget?.lifetime || 0;
            const spent = c.budget?.spent || 0;
            return {
              Campaign: c.name, Status: c.status,
              "Daily Budget": c.budget?.daily || 0,
              "Lifetime Budget": budget,
              Spent: spent,
              Remaining: Math.max(0, budget - spent),
              "Utilization %": budget > 0 ? ((spent / budget) * 100).toFixed(1) : "0.0",
            };
          });
          break;
        case "platform-comparison": {
          const crossPlatform = await api.analytics.crossPlatform(String(selectedRange)).catch(() => null);
          data = crossPlatform?.platforms || [];
          break;
        }
        case "agent-activity":
          data = agents.map((a: any) => ({
            Name: a.name, Type: a.type, Status: a.status,
            Runs: a.metrics?.runs || 0,
            Successes: a.metrics?.successes || 0,
            Failures: a.metrics?.failures || 0,
            Actions: a.metrics?.actionsTaken || 0,
          }));
          break;
        case "full-export": {
          const allRows: Record<string, any>[] = [];
          campaigns.forEach((c: any) => allRows.push({ Type: "Campaign", Name: c.name, Status: c.status, Metrics: `${c.type} · $${c.budget?.lifetime || 0} budget` }));
          creatives.forEach((c: any) => allRows.push({ Type: "Creative", Name: c.name, Status: c.status, Metrics: `${c.type} · ${c.performance?.impressions || 0} impressions` }));
          audiences.forEach((a: any) => allRows.push({ Type: "Audience", Name: a.name, Status: a.status, Metrics: `${a.type} · ${(a.size || 0).toLocaleString()} users` }));
          data = allRows;
          break;
        }
      }
      if (data.length > 0) {
        const filename = `${template.id}_${new Date().toISOString().split("T")[0]}`;
        exportToCsv(data, filename);
        saveHistory({ id: template.id, name: template.name, time: new Date().toISOString(), rows: data.length });
        addToast("success", `${template.name} exported (${data.length} rows)`);
      } else {
        addToast("error", "No data available for this report");
      }
    } catch {
      addToast("error", `Failed to generate ${template.name}`);
    } finally {
      setRunning(null);
    }
  }

  const categories = useMemo(() => {
    const cats = new Set(REPORT_TEMPLATES.map((t) => t.category));
    return ["all", ...Array.from(cats)];
  }, []);

  const filteredTemplates = categoryFilter === "all"
    ? REPORT_TEMPLATES
    : REPORT_TEMPLATES.filter((t) => t.category === categoryFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Report Center</h1>
          <p className="text-gray-500 mt-1">Generate and export custom reports from your data</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="select text-xs py-1" value={selectedRange} onChange={(e) => setSelectedRange(Number(e.target.value))}>
            {DATE_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button key={cat} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${categoryFilter === cat ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:border-gray-600"}`} onClick={() => setCategoryFilter(cat)}>
            {cat === "all" ? "All Reports" : cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const isRunning = running === template.id;
            return (
              <div key={template.id} className="card flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-n0va-600/20 rounded-lg flex items-center justify-center">
                    <template.icon className="w-5 h-5 text-n0va-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{template.name}</h3>
                    <span className="text-xs text-gray-600">{template.category}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 flex-1 mb-4">{template.description}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.fields.slice(0, 4).map((f) => (
                    <span key={f} className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{f}</span>
                  ))}
                  {template.fields.length > 4 && <span className="text-[10px] text-gray-600">+{template.fields.length - 4}</span>}
                </div>
                <button className="btn-primary text-sm w-full flex items-center justify-center gap-2" onClick={() => generateReport(template)} disabled={isRunning}>
                  {isRunning ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                  ) : (
                    <><Download className="w-3.5 h-3.5" /> Export CSV</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Reports</h3>
          <div className="divide-y divide-gray-800">
            {history.map((entry, i) => (
              <div key={`${entry.id}-${i}`} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <div>
                    <p className="text-sm text-white">{entry.name}</p>
                    <p className="text-xs text-gray-500">{entry.rows} rows</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {new Date(entry.time).toLocaleDateString()} {new Date(entry.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800">
            <button className="btn-secondary text-xs" onClick={() => { setHistory([]); localStorage.removeItem("n0va_report_history"); }}>
              Clear History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
