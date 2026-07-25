import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { ArrowLeft, BarChart3, DollarSign, TrendingUp, Search, CheckSquare, Square, ExternalLink, Download, Calendar } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";
import { useToast } from "../components/Toast";

const DATE_RANGES = [
  { label: "All Time", value: 0 },
  { label: "Last 30d", value: 30 },
  { label: "Last 90d", value: 90 },
];

export default function CampaignComparison() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(0);

  useEffect(() => {
    api.campaigns.list().then((r) => {
      const list = Array.isArray(r) ? r : r.campaigns || [];
      setCampaigns(list);
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        const name = (c.name || "").toLowerCase();
        const type = (c.type || "").toLowerCase();
        if (!name.includes(q) && !type.includes(q)) return false;
      }
      if (dateRange > 0) {
        const cutoff = Date.now() - dateRange * 86400000;
        const created = c.createdAt ? new Date(c.createdAt).getTime() : 0;
        if (created < cutoff) return false;
      }
      return true;
    });
  }, [campaigns, search, dateRange]);

  const compared = useMemo(() => {
    return campaigns.filter((c) => selected.has(c._id || c.id));
  }, [campaigns, selected]);

  const chartData = useMemo(() => compared.map((c) => ({
    name: c.name?.substring(0, 18) || "Unknown",
    Spend: c.budget?.spent || 0,
    Budget: c.budget?.lifetime || 0,
    Clicks: (c.performance?.clicks || c.metrics?.totalClicks || 0),
    ROAS: parseFloat((c.performance?.roas || c.metrics?.avgRoas || 0).toFixed(2)),
    Impressions: (c.performance?.impressions || c.metrics?.totalImpressions || 0),
  })), [compared]);

  const radarData = useMemo(() => {
    if (compared.length < 2) return [];
    const metrics = ["Budget", "Spend", "Clicks", "Impressions", "ROAS"];
    return metrics.map((metric) => {
      const entry: any = { metric };
      const vals = compared.map((c) => {
        if (metric === "Budget") return c.budget?.lifetime || 0;
        if (metric === "Spend") return c.budget?.spent || 0;
        if (metric === "Clicks") return c.performance?.clicks || c.metrics?.totalClicks || 0;
        if (metric === "Impressions") return c.performance?.impressions || c.metrics?.totalImpressions || 0;
        if (metric === "ROAS") return c.performance?.roas || c.metrics?.avgRoas || 0;
        return 0;
      });
      const max = Math.max(...vals, 1);
      compared.forEach((c, i) => {
        entry[c.name || `Campaign ${i + 1}`] = vals[i] / max * 100;
      });
      return entry;
    });
  }, [compared]);

  function getWinner(metric: string): string | null {
    if (compared.length < 2) return null;
    const vals = compared.map((c) => {
      if (metric === "Total Budget") return c.budget?.lifetime || 0;
      if (metric === "Spent") return c.budget?.spent || 0;
      if (metric === "Impressions") return c.performance?.impressions || 0;
      if (metric === "Clicks") return c.performance?.clicks || 0;
      if (metric === "CTR") { const imp = c.performance?.impressions || 0; return imp > 0 ? ((c.performance?.clicks || 0) / imp * 100) : 0; }
      if (metric === "Conversions") return c.performance?.conversions || 0;
      if (metric === "ROAS") return c.performance?.roas || 0;
      return 0;
    });
    const max = Math.max(...vals);
    if (max <= 0) return null;
    return compared[vals.indexOf(max)].name || null;
  }

  function handleExport() {
    const headers = ["Campaign", "Status", "Budget", "Spent", "Remaining", "Utilization", "Impressions", "Clicks", "CTR", "Conversions", "ROAS", "Type"];
    const rows = compared.map((c) => {
      const imp = c.performance?.impressions || 0;
      const clk = c.performance?.clicks || 0;
      const rem = (c.budget?.lifetime || 0) - (c.budget?.spent || 0);
      const util = c.budget?.lifetime ? ((c.budget?.spent || 0) / c.budget.lifetime * 100).toFixed(1) : "0";
      const ctr = imp > 0 ? ((clk / imp) * 100).toFixed(2) : "0";
      return [c.name || "Unknown", c.status || "", c.budget?.lifetime || 0, c.budget?.spent || 0, rem, util + "%", imp, clk, ctr + "%", c.performance?.conversions || 0, (c.performance?.roas || 0).toFixed(2), c.type || ""];
    });
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "campaign-comparison.csv"; a.click();
    URL.revokeObjectURL(url);
    addToast("success", `Exported ${compared.length} campaigns`);
  }

  const METRIC_COLUMNS = [
    { key: "status", label: "Status", render: (c: any) => <span className={`badge ${c.status === "active" ? "badge-active" : c.status === "paused" ? "badge-paused" : c.status === "draft" ? "badge-draft" : "badge-archived"}`}>{c.status}</span> },
    { key: "budget", label: "Total Budget", render: (c: any) => `$${(c.budget?.lifetime || 0).toLocaleString()}` },
    { key: "spent", label: "Spent", render: (c: any) => `$${(c.budget?.spent || 0).toLocaleString()}` },
    { key: "remaining", label: "Remaining", render: (c: any) => { const r = (c.budget?.lifetime || 0) - (c.budget?.spent || 0); return <span className={r < 0 ? "text-red-400" : "text-green-400"}>${r.toLocaleString()}</span>; } },
    { key: "spendPct", label: "Utilization", render: (c: any) => { const pct = c.budget?.lifetime ? ((c.budget?.spent || 0) / c.budget.lifetime * 100).toFixed(1) : "0"; return `${pct}%`; } },
    { key: "impressions", label: "Impressions", render: (c: any) => ((c.performance?.impressions || 0) / 1000).toFixed(0) + "K" },
    { key: "clicks", label: "Clicks", render: (c: any) => (c.performance?.clicks || 0).toLocaleString() },
    { key: "ctr", label: "CTR", render: (c: any) => { const imp = c.performance?.impressions || 0; const clk = c.performance?.clicks || 0; return imp > 0 ? ((clk / imp) * 100).toFixed(2) + "%" : "—"; } },
    { key: "conversions", label: "Conversions", render: (c: any) => (c.performance?.conversions || 0).toLocaleString() },
    { key: "roas", label: "ROAS", render: (c: any) => { const v = c.performance?.roas || 0; return <span className={v >= 2 ? "text-green-400" : v >= 1 ? "text-yellow-400" : "text-red-400"}>{v.toFixed(2)}x</span>; } },
    { key: "type", label: "Type", render: (c: any) => <span className="capitalize">{c.type || "—"}</span> },
  ];

  const RADAR_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#ec4899"];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Campaign Comparison</h1>
          <p className="text-sm text-gray-500">Select campaigns to compare performance side by side</p>
        </div>
        {compared.length >= 2 && (
          <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input className="input pl-10" placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5" /> Range:
            </div>
            {DATE_RANGES.map((r) => (
              <button key={r.value} className={`text-xs px-2.5 py-1 rounded-lg font-medium border ${dateRange === r.value ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:border-gray-600"}`} onClick={() => setDateRange(r.value)}>
                {r.label}
              </button>
            ))}
            <span className="text-xs text-gray-500">{selected.size} selected</span>
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())} className="btn-ghost text-xs">
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {filtered.map((c) => {
              const id = c._id || c.id;
              const isSel = selected.has(id);
              return (
                <button key={id} onClick={() => toggleSelect(id)} className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                  isSel ? "border-n0va-500 bg-n0va-600/10" : "border-gray-800 bg-gray-800/30 hover:border-gray-700"
                }`}>
                  {isSel ? <CheckSquare className="w-4 h-4 text-n0va-400 shrink-0" /> : <Square className="w-4 h-4 text-gray-600 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white font-medium truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-500 capitalize">{c.type} · ${c.budget?.daily || 0}/day</p>
                  </div>
                </button>
              );
            })}
          </div>

          {compared.length >= 2 && (
            <>
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Metric Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs uppercase">Campaign</th>
                        {METRIC_COLUMNS.map((col) => (
                          <th key={col.key} className="text-right py-2 px-3 text-gray-500 font-medium text-xs uppercase whitespace-nowrap">{col.label}</th>
                        ))}
                        <th className="py-2 px-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {compared.map((c) => (
                        <tr key={c._id || c.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                          <td className="py-2.5 px-3">
                            <span className="text-white font-medium text-xs">{c.name}</span>
                          </td>
                          {METRIC_COLUMNS.map((col) => {
                            const val = col.render(c);
                            const winner = getWinner(col.label);
                            const isWinner = winner === c.name;
                            return (
                              <td key={col.key} className={`text-right py-2.5 px-3 text-xs whitespace-nowrap ${isWinner ? "text-green-400 font-semibold" : "text-gray-300"}`}>
                                {val}{isWinner && <span className="ml-1 text-[10px] text-green-500">&#9733;</span>}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-2">
                            <button onClick={() => navigate(`/campaigns/${c._id || c.id}`)} className="text-gray-600 hover:text-n0va-400">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {compared.length >= 3 && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-4">Multi-Dimensional Radar</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <PolarRadiusAxis tick={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }} />
                      {compared.map((c, i) => (
                        <Radar key={i} name={c.name || `Campaign ${i + 1}`} dataKey={c.name || `Campaign ${i + 1}`} stroke={RADAR_COLORS[i % RADAR_COLORS.length]} fill={RADAR_COLORS[i % RADAR_COLORS.length]} fillOpacity={0.1} />
                      ))}
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-4 h-4 text-n0va-400" />
                    <h3 className="text-sm font-semibold text-white">Budget vs Spend</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="Budget" fill="#6366f1" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Spend" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="card">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-n0va-400" />
                    <h3 className="text-sm font-semibold text-white">Clicks & ROAS</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar yAxisId="left" dataKey="Clicks" fill="#a78bfa" radius={[3, 3, 0, 0]} />
                      <Bar yAxisId="right" dataKey="ROAS" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {compared.length === 0 && (
            <div className="card text-center py-12">
              <BarChart3 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Select 2 or more campaigns above to compare performance</p>
            </div>
          )}

          {compared.length === 1 && (
            <div className="card text-center py-8">
              <p className="text-gray-500 text-sm">Select at least one more campaign to compare (1 selected)</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
