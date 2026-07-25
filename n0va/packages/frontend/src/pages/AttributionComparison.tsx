import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { api } from "../api/client";
import { TrendingUp, BarChart3, PieChart as PieChartIcon, RefreshCw, X, Plus, History, GitCompare, Eye, DollarSign, Download } from "lucide-react";
import { SkeletonChart } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import { useCsvExport } from "../hooks/useCsvExport";

const MODEL_COLORS: Record<string, string> = {
  first_click: "#8b5cf6",
  last_click: "#1a6dff",
  linear: "#10b981",
  time_decay: "#f59e0b",
  position_based: "#ec4899",
  data_driven: "#06b6d4",
};

const MODEL_LABELS: Record<string, string> = {
  first_click: "First Click",
  last_click: "Last Click",
  linear: "Linear",
  time_decay: "Time Decay",
  position_based: "Position Based",
  data_driven: "Data Driven",
};

type Tab = "compare" | "paths" | "reports";

export default function AttributionComparison() {
  const { addToast } = useToast();
  const { exportToCsv } = useCsvExport();
  const [tab, setTab] = useState<Tab>("compare");
  const [comparison, setComparison] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(["last_click", "data_driven"]));
  const [viewMode, setViewMode] = useState<"roas" | "revenue" | "platform">("roas");

  const [paths, setPaths] = useState<any[]>([]);
  const [pathsLoading, setPathsLoading] = useState(false);
  const [showPathForm, setShowPathForm] = useState(false);
  const [pathForm, setPathForm] = useState({ userId: "", campaignName: "", platform: "", channel: "", revenue: "" });

  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.attribution.compare();
      setComparison(res);
      setSelectedModels(new Set(Object.keys(res)));
    } catch (e: any) { addToast("error", e.message || "Failed to load"); }
    setLoading(false);
  }

  async function loadPaths() {
    setPathsLoading(true);
    try {
      const res = await api.attribution.getPaths();
      setPaths(res || []);
    } catch (e: any) { addToast("error", e.message || "Failed to load paths"); }
    setPathsLoading(false);
  }

  async function loadReports() {
    setReportsLoading(true);
    try {
      const res = await api.attribution.getReports();
      setReports(res || []);
    } catch (e: any) { addToast("error", e.message || "Failed to load reports"); }
    setReportsLoading(false);
  }

  useEffect(() => { if (tab === "paths") loadPaths(); if (tab === "reports") loadReports(); }, [tab]);

  async function handleSavePath() {
    if (!pathForm.userId.trim() || !pathForm.campaignName.trim()) { addToast("error", "User ID and campaign name required"); return; }
    try {
      const path = {
        conversionId: `conv_${Date.now()}`,
        userId: pathForm.userId.trim(),
        totalRevenue: Number(pathForm.revenue) || 0,
        conversionDate: new Date().toISOString(),
        touchpoints: [{
          id: `tp_${Date.now()}`,
          campaignId: `camp_${Date.now()}`,
          campaignName: pathForm.campaignName.trim(),
          platform: pathForm.platform.trim() || "web",
          channel: pathForm.channel.trim() || "organic",
          timestamp: new Date().toISOString(),
          type: "click",
          weight: 1,
          cost: 0,
          revenue: Number(pathForm.revenue) || 0,
        }],
      };
      await api.attribution.savePath({ paths: [path] });
      addToast("success", "Conversion path saved");
      setShowPathForm(false);
      setPathForm({ userId: "", campaignName: "", platform: "", channel: "", revenue: "" });
      loadPaths();
    } catch (e: any) { addToast("error", e.message || "Failed to save path"); }
  }

  async function handleCompareWithSaved() {
    setLoading(true);
    try {
      const res = await api.attribution.compare();
      setComparison(res);
      setSelectedModels(new Set(Object.keys(res)));
      addToast("success", "Comparison updated with saved paths");
      setTab("compare");
    } catch (e: any) { addToast("error", e.message || "Failed"); }
    setLoading(false);
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "compare", label: "Model Comparison", icon: GitCompare },
    { key: "paths", label: "Conversion Paths", icon: Eye },
    { key: "reports", label: "Report History", icon: History },
  ];

  const modelEntries = comparison ? Object.entries(comparison) as [string, any][] : [];
  const modelSummaryData = modelEntries.filter(([key]) => selectedModels.has(key)).map(([key, value]) => ({
    model: MODEL_LABELS[key] || key, key, roas: value.roas, totalRevenue: value.totalRevenue,
    totalCost: value.totalCost, totalConversions: value.totalConversions,
  }));

  const revenueByPlatform: Record<string, any> = {};
  for (const [model, data] of modelEntries.filter(([key]) => selectedModels.has(key))) {
    for (const [platform, pd] of Object.entries(data.platformBreakdown || {}) as [string, any][]) {
      if (!revenueByPlatform[platform]) revenueByPlatform[platform] = {};
      revenueByPlatform[platform][MODEL_LABELS[model]] = pd.roas;
    }
  }
  const platformData = Object.entries(revenueByPlatform).map(([platform, models]) => ({ platform, ...models }));

  function toggleModel(key: string) {
    const next = new Set(selectedModels);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelectedModels(next);
  }

  function getTypeColor(type: string) {
    const colors: Record<string, string> = { impression: "text-blue-400 bg-blue-500/10", click: "text-green-400 bg-green-500/10", view_through: "text-purple-400 bg-purple-500/10", engagement: "text-amber-400 bg-amber-500/10", conversion: "text-emerald-400 bg-emerald-500/10" };
    return colors[type] || "text-gray-400 bg-gray-500/10";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-n0va-400" />
            Attribution Comparison
          </h1>
          <p className="text-gray-500 mt-1">Multi-touch attribution with 6 models, conversion paths, and report history</p>
        </div>
        {tab === "compare" && <><button className="btn-secondary text-sm flex items-center gap-1.5" onClick={loadData}><RefreshCw className="w-3.5 h-3.5" /> Refresh</button><button className="btn-secondary text-sm flex items-center gap-1.5" onClick={() => { exportToCsv(modelSummaryData, "attribution_comparison"); addToast("success", "Comparison data exported"); }}><Download className="w-3.5 h-3.5" /> Export CSV</button></>}
      </div>

      <div className="flex gap-1 border-b border-gray-800 pb-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-n0va-400 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "compare" && (
        <>
          {loading ? (
            <div className="space-y-6">
              <SkeletonChart />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card animate-pulse"><div className="h-3 w-16 bg-gray-800 rounded mb-3" /><div className="h-7 w-20 bg-gray-800 rounded mb-1" /><div className="h-3 w-12 bg-gray-800 rounded" /></div>
                ))}
              </div>
              <SkeletonChart />
            </div>
          ) : !comparison ? (
            <div className="text-gray-400 text-center py-12"><p className="mb-4">No attribution data available</p><button className="btn-secondary flex items-center gap-2 mx-auto" onClick={loadData}><RefreshCw className="w-4 h-4" /> Retry</button></div>
          ) : (
            <>
              {paths.length > 0 && (
                <div className="card p-4 flex items-center justify-between">
                  <div><p className="text-sm text-white font-medium">{paths.length} saved conversion paths</p><p className="text-xs text-gray-500">Using real data for analysis</p></div>
                  <button onClick={handleCompareWithSaved} className="btn-ghost text-xs flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Re-analyze with saved paths</button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {modelEntries.map(([key]) => (
                  <button key={key} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${selectedModels.has(key) ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:text-gray-300"}`} onClick={() => toggleModel(key)}>
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: MODEL_COLORS[key] }} />{MODEL_LABELS[key]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {modelEntries.filter(([key]) => selectedModels.has(key)).map(([key, data]) => (
                  <div key={key} className="card" style={{ borderColor: MODEL_COLORS[key] + "40" }}>
                    <div className="flex items-center gap-2 mb-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: MODEL_COLORS[key] }} /><span className="text-xs text-gray-500 uppercase">{MODEL_LABELS[key]}</span></div>
                    <p className="text-2xl font-bold text-white">{data.roas.toFixed(2)}x</p>
                    <p className="text-xs text-gray-500">ROAS</p>
                    <div className="mt-2 text-xs text-gray-500 space-y-0.5"><p>Revenue: ${data.totalRevenue.toLocaleString()}</p><p>Cost: ${data.totalCost.toLocaleString()}</p></div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 border-b border-gray-800 pb-2">
                {(["roas", "revenue", "platform"] as const).map((mode) => (
                  <button key={mode} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${viewMode === mode ? "bg-gray-800 text-white" : "text-gray-500"}`} onClick={() => setViewMode(mode)}>
                    {mode === "roas" ? "ROAS Comparison" : mode === "revenue" ? "Revenue vs Cost" : "Platform ROAS"}
                  </button>
                ))}
              </div>

              {viewMode === "roas" && (
                <div className="card"><h3 className="text-lg font-semibold text-white mb-4">ROAS by Attribution Model</h3>
                  <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={modelSummaryData}><CartesianGrid strokeDasharray="3 3" stroke="#1f2937" /><XAxis dataKey="model" stroke="#6b7280" fontSize={11} /><YAxis stroke="#6b7280" fontSize={11} /><Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} /><Bar dataKey="roas" radius={[4, 4, 0, 0]}>{modelSummaryData.map((entry) => (<Cell key={entry.key} fill={MODEL_COLORS[entry.key] || "#1a6dff"} />))}</Bar></BarChart></ResponsiveContainer></div></div>
              )}

              {viewMode === "revenue" && (
                <div className="card"><h3 className="text-lg font-semibold text-white mb-4">Revenue vs Cost</h3>
                  <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={modelSummaryData}><CartesianGrid strokeDasharray="3 3" stroke="#1f2937" /><XAxis dataKey="model" stroke="#6b7280" fontSize={11} /><YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} /><Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} /><Legend /><Bar dataKey="totalRevenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" /><Bar dataKey="totalCost" fill="#ef4444" radius={[4, 4, 0, 0]} name="Cost" /></BarChart></ResponsiveContainer></div></div>
              )}

              {viewMode === "platform" && platformData.length > 0 && (
                <div className="card"><h3 className="text-lg font-semibold text-white mb-4">Platform ROAS by Model</h3>
                  <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={platformData}><CartesianGrid strokeDasharray="3 3" stroke="#1f2937" /><XAxis dataKey="platform" stroke="#6b7280" fontSize={11} /><YAxis stroke="#6b7280" fontSize={11} /><Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} /><Legend />{Array.from(selectedModels).map((key) => (<Bar key={key} dataKey={MODEL_LABELS[key]} fill={MODEL_COLORS[key]} radius={[4, 4, 0, 0]} />))}</BarChart></ResponsiveContainer></div></div>
              )}

              <div className="card"><h3 className="text-lg font-semibold text-white mb-4">Attribution Model Definitions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {modelEntries.map(([key, _data]) => (
                    <div key={key} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MODEL_COLORS[key] }} /><span className="text-sm text-white font-medium">{MODEL_LABELS[key]}</span></div>
                      <p className="text-xs text-gray-500">
                        {key === "first_click" && "100% credit to first interaction. Best for understanding top-of-funnel effectiveness."}
                        {key === "last_click" && "100% credit to last interaction before conversion. Standard baseline model."}
                        {key === "linear" && "Equal credit across all touchpoints. Best for nurturing-heavy funnels."}
                        {key === "time_decay" && "More recent touchpoints get more credit. Weighted by recency."}
                        {key === "position_based" && "40% to last click, 30% to first click, 30% distributed to middle. Best for multi-channel funnels."}
                        {key === "data_driven" && "Algorithmic weights based on platform, engagement type, and recency. Most accurate for complex funnels."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === "paths" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">{paths.length} conversion paths saved</p>
            <div className="flex items-center gap-2">
              <button onClick={loadPaths} className="btn-ghost text-sm flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
              <button onClick={() => setShowPathForm(true)} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Path</button>
            </div>
          </div>

          {showPathForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowPathForm(false)}>
              <div className="w-full max-w-md bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">New Conversion Path</h3><button onClick={() => setShowPathForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
                <form onSubmit={e => { e.preventDefault(); handleSavePath(); }} className="space-y-4">
                  <div><label className="label">User ID</label><input className="input" placeholder="e.g. user_abc123" value={pathForm.userId} onChange={e => setPathForm({ ...pathForm, userId: e.target.value })} autoFocus /></div>
                  <div><label className="label">Campaign Name</label><input className="input" placeholder="e.g. Q3 Product Launch" value={pathForm.campaignName} onChange={e => setPathForm({ ...pathForm, campaignName: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Platform</label><input className="input" placeholder="e.g. google, meta" value={pathForm.platform} onChange={e => setPathForm({ ...pathForm, platform: e.target.value })} /></div>
                    <div><label className="label">Channel</label><input className="input" placeholder="e.g. paid, organic" value={pathForm.channel} onChange={e => setPathForm({ ...pathForm, channel: e.target.value })} /></div>
                  </div>
                  <div><label className="label">Revenue ($)</label><input type="number" className="input" placeholder="0.00" value={pathForm.revenue} onChange={e => setPathForm({ ...pathForm, revenue: e.target.value })} /></div>
                  <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowPathForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Save Path</button></div>
                </form>
              </div>
            </div>
          )}

          {pathsLoading ? (
            <div className="flex items-center justify-center min-h-[200px]"><RefreshCw className="w-6 h-6 animate-spin text-n0va-400" /></div>
          ) : paths.length === 0 ? (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <Eye className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No conversion paths</h3>
              <p className="text-sm text-gray-500">Save conversion paths to power attribution analysis with real data.</p>
              <button onClick={() => setShowPathForm(true)} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Add Path</button>
            </div>
          ) : (
            <div className="space-y-3">
              {paths.map((p: any) => (
                <div key={p._id || p.conversionId} className="card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-white">{p.userId}</p>
                      <p className="text-xs text-gray-500">{p.touchpoints?.length || 0} touchpoints · ${(p.totalRevenue || 0).toLocaleString()} revenue</p>
                    </div>
                    <span className="text-xs text-gray-500">{p.conversionDate ? new Date(p.conversionDate).toLocaleDateString() : "—"}</span>
                  </div>
                  {p.touchpoints && p.touchpoints.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.touchpoints.map((tp: any, i: number) => (
                        <span key={tp.id || i} className={`text-[10px] px-2 py-0.5 rounded-full ${getTypeColor(tp.type)}`}>
                          {tp.type} · {tp.platform} · ${tp.revenue || 0}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">{reports.length} saved reports</p>
            <button onClick={loadReports} className="btn-ghost text-sm flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          </div>

          {reportsLoading ? (
            <div className="flex items-center justify-center min-h-[200px]"><RefreshCw className="w-6 h-6 animate-spin text-n0va-400" /></div>
          ) : reports.length === 0 ? (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <History className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No saved reports</h3>
              <p className="text-sm text-gray-500">Run an attribution analysis to generate reports.</p>
              <button onClick={() => { setTab("compare"); loadData(); }} className="btn-primary text-sm mt-4 flex items-center gap-1.5"><GitCompare className="w-4 h-4" /> Run Analysis</button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r: any) => (
                <div key={r._id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-white capitalize">{r.model || "data_driven"} Analysis</p>
                      <p className="text-xs text-gray-500">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</p>
                    </div>
                    <span className="text-xs text-gray-500">{r.pathsAnalyzed || 0} paths</span>
                  </div>
                  {r.result && (
                    <div className="grid grid-cols-4 gap-3 mt-3">
                      <div className="bg-gray-800 rounded-lg p-2"><p className="text-[10px] text-gray-500">Conv</p><p className="text-sm font-semibold text-white">{r.result.totalConversions?.toLocaleString() || "—"}</p></div>
                      <div className="bg-gray-800 rounded-lg p-2"><p className="text-[10px] text-gray-500">Revenue</p><p className="text-sm font-semibold text-white">${(r.result.totalRevenue || 0).toLocaleString()}</p></div>
                      <div className="bg-gray-800 rounded-lg p-2"><p className="text-[10px] text-gray-500">Cost</p><p className="text-sm font-semibold text-white">${(r.result.totalCost || 0).toLocaleString()}</p></div>
                      <div className="bg-gray-800 rounded-lg p-2"><p className="text-[10px] text-gray-500">ROAS</p><p className="text-sm font-semibold text-emerald-400">{(r.result.roas || 0).toFixed(2)}x</p></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
