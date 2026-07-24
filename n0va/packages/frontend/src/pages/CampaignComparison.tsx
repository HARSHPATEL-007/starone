import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ArrowLeft, BarChart3, DollarSign, TrendingUp, Users, MousePointerClick, Target, Search, CheckSquare, Square, ExternalLink } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";

export default function CampaignComparison() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.campaigns.list().then((r) => {
      const list = Array.isArray(r) ? r : r.campaigns || [];
      setCampaigns(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const filtered = campaigns.filter((c) => {
    if (search) return c.name?.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const compared = campaigns.filter((c) => selected.has(c._id || c.id));

  const chartData = compared.map((c) => ({
    name: c.name?.substring(0, 18) || "Unknown",
    Spend: c.budget?.spent || 0,
    Budget: c.budget?.lifetime || 0,
    Impressions: ((c.performance?.impressions || c.metrics?.totalImpressions || 0) / 1000).toFixed(0),
    Clicks: (c.performance?.clicks || c.metrics?.totalClicks || 0),
    ROAS: parseFloat((c.performance?.roas || c.metrics?.avgRoas || 0).toFixed(2)),
  }));

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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Campaign Comparison</h1>
          <p className="text-sm text-gray-500">Select campaigns to compare performance side by side</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input className="input pl-10" placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
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
                            <div className="flex items-center gap-2">
                              <Target className="w-3.5 h-3.5 text-n0va-400 shrink-0" />
                              <span className="text-white font-medium text-xs truncate max-w-[140px]">{c.name}</span>
                            </div>
                          </td>
                          {METRIC_COLUMNS.map((col) => (
                            <td key={col.key} className="text-right py-2.5 px-3 text-xs text-gray-300 whitespace-nowrap">
                              {col.render(c)}
                            </td>
                          ))}
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
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="Clicks" fill="#a78bfa" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="ROAS" fill="#f59e0b" radius={[3, 3, 0, 0]} />
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
