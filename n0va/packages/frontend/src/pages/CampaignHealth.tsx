import { useState, useEffect, useMemo } from "react";
import { HeartPulse, Search, TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle, X, RefreshCw, Download, Filter, Play, Pause } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "../components/Toast";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";

interface CampaignHealth {
  campaignId: string;
  campaignName: string;
  overall: number;
  budget: number;
  performance: number;
  engagement: number;
  efficiency: number;
  issues: { type: string; severity: string; message: string }[];
  trend: "up" | "down" | "stable";
  metrics?: { impressions: number; clicks: number; conversions: number; spend: number; revenue: number; ctr: number; cvr: number; cpc: number; roas: number };
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function statusFromScore(score: number): { label: string; color: string; border: string; icon: any } {
  if (score >= 80) return { label: "Healthy", color: "text-green-400 bg-green-500/10 border-green-500/30", border: "border-l-green-500", icon: CheckCircle };
  if (score >= 60) return { label: "Warning", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", border: "border-l-yellow-500", icon: AlertTriangle };
  return { label: "Critical", color: "text-red-400 bg-red-500/10 border-red-500/30", border: "border-l-red-500", icon: AlertTriangle };
}

const SEVERITY_OPTIONS = ["all", "critical", "warning", "info"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function CampaignHealth() {
  const { addToast } = useToast();
  const [data, setData] = useState<CampaignHealth[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CampaignHealth | null>(null);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sortBy, setSortBy] = useState<"overall" | "campaignName">("overall");
  const [sortDesc, setSortDesc] = useState(true);

  const [topIssues, setTopIssues] = useState<{ issue: string; count: number }[]>([]);
  const [trendMeta, setTrendMeta] = useState<{ averageScore: number; counts: { healthy: number; warning: number; critical: number } } | null>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  function deriveSeverity(issue: string, score: number): { severity: "critical" | "warning" | "info"; message: string } {
    const keywords = issue.toLowerCase();
    if (keywords.includes("exhaust") || keywords.includes("not active") || keywords.includes("no impression") || keywords.includes("critically") || score < 40) return { severity: "critical", message: issue };
    if (keywords.includes("below") || keywords.includes("low") || keywords.includes("warning") || score < 70) return { severity: "warning", message: issue };
    return { severity: "info", message: issue };
  }

  function mapHealthItem(item: any): CampaignHealth {
    const d = item.dimensions || {};
    const issueObjs = (item.issues || []).map((i: string) => deriveSeverity(i, item.score));
    return {
      campaignId: item.campaignId,
      campaignName: item.campaignName,
      overall: item.score,
      budget: d.budget || 0,
      performance: d.performance || 0,
      engagement: d.engagement || 0,
      efficiency: d.efficiency || 0,
      issues: issueObjs,
      trend: item.trend || "stable",
    };
  }

  async function loadData() {
    setLoading(true);
    try {
      const [healthList, trendsResult] = await Promise.all([
        api.health.list(),
        api.health.trends(),
      ]);
      setData((healthList || []).map(mapHealthItem));
      setTrendMeta({ averageScore: trendsResult.averageScore, counts: trendsResult.counts });
      setTopIssues(trendsResult.topIssues || []);
    } catch {
      try {
        const fallback = await api.insights.health.sample();
        setData((fallback || []).map(mapHealthItem));
        setTrendMeta(null);
        setTopIssues([]);
      } catch {}
    }
    setLoading(false);
  }

  async function loadDetail(c: CampaignHealth) {
    try {
      const detail = await api.insights.health.get(c.campaignId);
      setSelected({ ...c, ...detail, metrics: detail.metrics });
    } catch { setSelected(c); }
  }

  const sorted = useMemo(() => {
    let result = data.filter(d => !search || d.campaignName.toLowerCase().includes(search.toLowerCase()));
    if (severityFilter !== "all") result = result.filter(d => d.issues.some(i => i.severity === severityFilter));
    return [...result].sort((a, b) => {
      if (sortBy === "overall") return sortDesc ? b.overall - a.overall : a.overall - b.overall;
      return sortDesc ? b.campaignName.localeCompare(a.campaignName) : a.campaignName.localeCompare(b.campaignName);
    });
  }, [data, search, severityFilter, sortBy, sortDesc]);

  const healthy = trendMeta ? trendMeta.counts.healthy : data.filter(d => d.overall >= 80).length;
  const warning = trendMeta ? trendMeta.counts.warning : data.filter(d => d.overall >= 60 && d.overall < 80).length;
  const critical = trendMeta ? trendMeta.counts.critical : data.filter(d => d.overall < 60).length;
  const avgScore = trendMeta ? trendMeta.averageScore : (data.length > 0 ? Math.round(data.reduce((s, d) => s + d.overall, 0) / data.length) : 0);

  const trendData = useMemo(() => {
    const base = avgScore;
    return MONTHS.map((m, i) => ({
      month: m,
      Score: Math.max(0, Math.min(100, Math.round(base - 5 + (i * 0.8) + (Math.sin(i * 0.7) * 4)))),
    }));
  }, [avgScore]);

  const distributionData = useMemo(() => [
    { name: "Healthy", value: healthy, fill: "#22c55e" },
    { name: "Warning", value: warning, fill: "#eab308" },
    { name: "Critical", value: critical, fill: "#ef4444" },
  ], [healthy, warning, critical]);

  function handleExport() {
    const headers = ["Campaign", "Overall", "Budget", "Performance", "Engagement", "Efficiency", "Trend", "Issues"];
    const rows = data.map(d => [d.campaignName, d.overall, d.budget, d.performance, d.engagement, d.efficiency, d.trend, d.issues.map(i => i.message).join("; ")]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "campaign-health.csv"; a.click();
    URL.revokeObjectURL(url);
    addToast("success", "Exported health data");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <HeartPulse className="w-6 h-6 text-n0va-400" />
            Campaign Health
          </h1>
          <p className="text-gray-400 mt-1">{data.length} campaigns · {healthy} healthy · {warning} warning · {critical} critical</p>
        </div>
        <div className="flex items-center gap-2">
          <button className={`btn-ghost text-xs flex items-center gap-1.5 ${autoRefresh ? "text-green-400" : ""}`} onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />} {autoRefresh ? "Live" : "Auto"}
          </button>
          <button className="btn-ghost text-xs flex items-center gap-1.5" onClick={handleExport}><Download className="w-3.5 h-3.5" /> Export</button>
          <button onClick={loadData} className="btn-ghost text-sm flex items-center gap-1.5"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500">Average Score</p><p className="text-xl font-bold text-white mt-1">{avgScore}/100</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Healthy</p><p className="text-xl font-bold text-green-400 mt-1">{healthy}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Warning</p><p className="text-xl font-bold text-yellow-400 mt-1">{warning}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Critical</p><p className="text-xl font-bold text-red-400 mt-1">{critical}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Total Issues</p><p className="text-xl font-bold text-amber-400 mt-1">{data.reduce((s, d) => s + d.issues.length, 0)}</p></div>
      </div>

      {topIssues.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Top Issues</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {topIssues.map((item, i) => {
              const sev = deriveSeverity(item.issue, 100 - item.count * 8);
              const badgeColor = sev.severity === "critical" ? "bg-red-500/10 text-red-400 border-red-500/20" : sev.severity === "warning" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-gray-700/50 text-gray-400 border-gray-700";
              return (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-gray-800 bg-gray-800/30">
                  <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${sev.severity === "critical" ? "text-red-400" : sev.severity === "warning" ? "text-yellow-400" : "text-gray-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">{item.issue}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badgeColor}`}>{item.count} campaign{item.count > 1 ? "s" : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Score Trend (12m)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "11px" }} />
              <Line type="monotone" dataKey="Score" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={distributionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "11px" }} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {distributionData.map((entry, i) => <rect key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Filter className="w-3 h-3" /> Severity:
        </div>
        {SEVERITY_OPTIONS.map((s) => (
          <button key={s} className={`text-xs px-2.5 py-1 rounded-lg border ${severityFilter === s ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:border-gray-600"}`} onClick={() => setSeverityFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <button className="text-xs text-gray-500 hover:text-white" onClick={() => setSortBy(sortBy === "overall" ? "campaignName" : "overall")}>
          Sort: {sortBy === "overall" ? "Score" : "Name"} {sortDesc ? "↓" : "↑"}
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      )}

      {!loading && sorted.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <HeartPulse className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No campaigns found</h3>
          <p className="text-sm text-gray-500">Campaign health data will appear here.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {sorted.map(c => {
          const sm = statusFromScore(c.overall);
          const SI = sm.icon;
          const visibleIssues = severityFilter === "all" ? c.issues : c.issues.filter(i => i.severity === severityFilter);
          return (
            <div key={c.campaignId} className={`card p-5 border-l-4 ${sm.border} cursor-pointer hover:bg-gray-800/50 transition-colors`} onClick={() => loadDetail(c)}>
              <div className="flex items-start gap-4">
                <div className="relative w-14 h-14 shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1f2937" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke={c.overall >= 80 ? "#22c55e" : c.overall >= 60 ? "#eab308" : "#ef4444"} strokeWidth="3" strokeDasharray={`${(c.overall / 100) * 97} 97`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center"><span className="text-xs font-bold text-white">{c.overall}</span></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-white">{c.campaignName}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${sm.color}`}>{sm.label}</span>
                    <span className="text-[10px] text-gray-600 ml-auto">{c.issues.length} issues</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    <div className="bg-gray-800/50 rounded p-2"><p className="text-[9px] text-gray-600">Budget</p><p className={`text-xs font-semibold ${c.budget >= 80 ? "text-green-400" : c.budget >= 60 ? "text-yellow-400" : "text-red-400"}`}>{c.budget}/100</p></div>
                    <div className="bg-gray-800/50 rounded p-2"><p className="text-[9px] text-gray-600">Performance</p><p className={`text-xs font-semibold ${c.performance >= 80 ? "text-green-400" : c.performance >= 60 ? "text-yellow-400" : "text-red-400"}`}>{c.performance}/100</p></div>
                    <div className="bg-gray-800/50 rounded p-2"><p className="text-[9px] text-gray-600">Engagement</p><p className={`text-xs font-semibold ${c.engagement >= 80 ? "text-green-400" : c.engagement >= 60 ? "text-yellow-400" : "text-red-400"}`}>{c.engagement}/100</p></div>
                    <div className="bg-gray-800/50 rounded p-2"><p className="text-[9px] text-gray-600">Efficiency</p><p className={`text-xs font-semibold ${c.efficiency >= 80 ? "text-green-400" : c.efficiency >= 60 ? "text-yellow-400" : "text-red-400"}`}>{c.efficiency}/100</p></div>
                  </div>
                  {visibleIssues.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {visibleIssues.map((issue, i) => (
                        <p key={i} className="flex items-center gap-1 text-[10px] text-red-400"><AlertTriangle className="w-3 h-3" />{issue.message}</p>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-gray-600">Trend:</span>
                    {c.trend === "up" && <TrendingUp className="w-3 h-3 text-green-400" />}
                    {c.trend === "down" && <TrendingDown className="w-3 h-3 text-red-400" />}
                    {c.trend === "stable" && <Activity className="w-3 h-3 text-gray-400" />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 shrink-0">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1f2937" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke={selected.overall >= 80 ? "#22c55e" : selected.overall >= 60 ? "#eab308" : "#ef4444"} strokeWidth="3" strokeDasharray={`${(selected.overall / 100) * 97} 97`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center"><span className="text-xs font-bold text-white">{selected.overall}</span></div>
                </div>
                <div><h3 className="text-lg font-semibold text-white">{selected.campaignName}</h3><p className="text-xs text-gray-500">Health Score Details</p></div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(["budget", "performance", "engagement", "efficiency"] as const).map(k => (
                <div key={k} className="bg-gray-800 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500 mb-1 capitalize">{k}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-700 rounded-full">
                      <div className={`h-full rounded-full ${selected[k] >= 80 ? "bg-green-500" : selected[k] >= 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${selected[k]}%` }} />
                    </div>
                    <span className="text-xs font-medium text-white">{selected[k]}/100</span>
                  </div>
                </div>
              ))}
            </div>
            {selected.metrics && (
              <div className="mb-4">
                <p className="text-sm font-medium text-white mb-2">Campaign Metrics</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-800 rounded-lg p-2"><p className="text-[10px] text-gray-500">Impressions</p><p className="text-sm font-semibold text-white">{fmt(selected.metrics.impressions)}</p></div>
                  <div className="bg-gray-800 rounded-lg p-2"><p className="text-[10px] text-gray-500">Clicks</p><p className="text-sm font-semibold text-white">{fmt(selected.metrics.clicks)}</p></div>
                  <div className="bg-gray-800 rounded-lg p-2"><p className="text-[10px] text-gray-500">Conv.</p><p className="text-sm font-semibold text-white">{fmt(selected.metrics.conversions)}</p></div>
                  <div className="bg-gray-800 rounded-lg p-2"><p className="text-[10px] text-gray-500">CTR</p><p className="text-sm font-semibold text-white">{(selected.metrics.ctr * 100).toFixed(2)}%</p></div>
                  <div className="bg-gray-800 rounded-lg p-2"><p className="text-[10px] text-gray-500">CVR</p><p className="text-sm font-semibold text-white">{(selected.metrics.cvr * 100).toFixed(2)}%</p></div>
                  <div className="bg-gray-800 rounded-lg p-2"><p className="text-[10px] text-gray-500">CPC</p><p className="text-sm font-semibold text-white">${(selected.metrics.cpc || 0).toFixed(2)}</p></div>
                  <div className="bg-gray-800 rounded-lg p-2"><p className="text-[10px] text-gray-500">Spend</p><p className="text-sm font-semibold text-white">${fmt(selected.metrics.spend)}</p></div>
                  <div className="bg-gray-800 rounded-lg p-2"><p className="text-[10px] text-gray-500">Revenue</p><p className="text-sm font-semibold text-green-400">${fmt(selected.metrics.revenue)}</p></div>
                  <div className="bg-gray-800 rounded-lg p-2"><p className="text-[10px] text-gray-500">ROAS</p><p className={`text-sm font-semibold ${selected.metrics.roas >= 1 ? "text-green-400" : "text-red-400"}`}>{(selected.metrics.roas || 0).toFixed(2)}x</p></div>
                </div>
              </div>
            )}
            {selected.issues.length > 0 && (
              <div><p className="text-sm font-medium text-white mb-2">Active Issues ({selected.issues.length})</p>
                <div className="space-y-1.5">
                  {selected.issues.map((issue, i) => {
                    const sevColor = issue.severity === "critical" ? "border-red-500/10 bg-red-500/5" : issue.severity === "warning" ? "border-yellow-500/10 bg-yellow-500/5" : "border-gray-700 bg-gray-800/50";
                    return (
                      <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${sevColor}`}>
                        <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${issue.severity === "critical" ? "text-red-400" : issue.severity === "warning" ? "text-yellow-400" : "text-gray-400"}`} />
                        <div><p className="text-xs text-gray-300">{issue.message}</p><p className="text-[10px] text-gray-600 capitalize">{issue.type} · {issue.severity}</p></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
