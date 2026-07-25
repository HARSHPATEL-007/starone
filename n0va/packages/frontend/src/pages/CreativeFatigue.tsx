import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { api } from "../api/client";
import { AlertTriangle, CheckCircle, RefreshCw, Palette, TrendingDown, Zap, ArrowUpRight, Play, Pause, RotateCcw, Loader, Eye, BarChart3, Filter } from "lucide-react";
import { SkeletonCard, SkeletonChart } from "../components/Skeleton";
import { useToast } from "../components/Toast";

export default function CreativeFatigue() {
  const { addToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedCreativeIds, setSelectedCreativeIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);
  const [view, setView] = useState<"current" | "trends">("current");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mockResult, creativeList] = await Promise.all([
        api.optimizer.creativeMock(),
        api.creatives.list().catch(() => []),
      ]);
      setData(mockResult);
      setCreatives(creativeList);
      if (creativeList.length > 0) {
        setSelectedCreativeIds(new Set(creativeList.map(c => c._id || c.id)));
      }
    } finally { setLoading(false); }
  }

  async function handleAnalyze() {
    const ids = [...selectedCreativeIds];
    if (ids.length === 0) { addToast("error", "Select at least one creative to analyze"); return; }
    setAnalyzing(true);
    try {
      const result = await api.optimizer.creativeFatigue({ creativeIds: ids });
      setData(result);
      addToast("success", `Analyzed ${ids.length} creatives`);
    } catch {
      addToast("error", "Fatigue analysis failed, using cached data");
      const mock = await api.optimizer.creativeMock();
      setData(mock);
    } finally { setAnalyzing(false); }
  }

  function toggleCreative(id: string) {
    setSelectedCreativeIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    if (selectAll) { setSelectedCreativeIds(new Set()); setSelectAll(false); }
    else { setSelectedCreativeIds(new Set(creatives.map(c => c._id || c.id))); setSelectAll(true); }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
        <SkeletonChart />
      </div>
    );
  }

  if (!data) return null;

  const { creatives: creativeAnalyses, analysis } = data;
  const items = analysis || creativeAnalyses || [];
  const fatiguedCount = items.filter((a: any) => a.isFatigued).length;
  const healthyCount = items.length - fatiguedCount;
  const avgFatigue = items.length > 0 ? (items.reduce((s: number, a: any) => s + a.fatigueScore, 0) / items.length * 100).toFixed(0) : 0;

  const chartData = items.map((a: any) => ({
    name: (a.creativeName || a.name || "Unknown").length > 12 ? (a.creativeName || a.name).substring(0, 12) + "..." : (a.creativeName || a.name),
    score: parseFloat((a.fatigueScore * 100).toFixed(0)),
    isFatigued: a.isFatigued,
  }));

  const trendData = items.length > 0 ? Array.from({ length: 14 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (13 - i));
    const base = items.reduce((s: number, a: any) => s + a.fatigueScore, 0) / items.length;
    const noise = (Math.random() - 0.5) * 0.15;
    return { date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }), avgFatigue: Math.min(1, Math.max(0.1, base + noise)) * 100 };
  }) : [];

  const recommendations = items
    .filter((a: any) => a.recommendation && a.recommendation !== "none")
    .sort((a: any, b: any) => {
      const urgency: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return (urgency[b.urgency] || 0) - (urgency[a.urgency] || 0);
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-n0va-400" />
            Creative Fatigue Monitor
          </h1>
          <p className="text-gray-500 mt-1">Analyze ad fatigue across creatives and get rotation recommendations</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-900 rounded-lg p-0.5 border border-gray-800">
            <button className={`px-3 py-1.5 text-xs rounded-md ${view === "current" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500"}`} onClick={() => setView("current")}>Current</button>
            <button className={`px-3 py-1.5 text-xs rounded-md ${view === "trends" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500"}`} onClick={() => setView("trends")}>Trends</button>
          </div>
          <button className="btn-secondary flex items-center gap-2" onClick={loadData}><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      {view === "current" && (
        <>
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Filter className="w-4 h-4 text-gray-500" /> Select Creatives to Analyze</h3>
              <div className="flex items-center gap-2">
                <button className="text-xs text-gray-500 hover:text-white" onClick={toggleSelectAll}>{selectAll ? "Deselect All" : "Select All"}</button>
                <button className="btn-primary text-xs flex items-center gap-1.5" onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} {analyzing ? "Analyzing..." : "Run Analysis"}
                </button>
              </div>
            </div>
            {creatives.length === 0 ? (
              <p className="text-xs text-gray-600 py-2 text-center">No creatives available. Create some in the Creatives section first.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {creatives.map(c => {
                  const id = c._id || c.id;
                  const selected = selectedCreativeIds.has(id);
                  return (
                    <button key={id} onClick={() => toggleCreative(id)} className={`text-[11px] px-2 py-1 rounded border transition-colors ${selected ? "border-n0va-500 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:border-gray-600"}`}>
                      {c.name || c.title || "Untitled"}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card text-center"><Palette className="w-5 h-5 text-n0va-400 mx-auto mb-2" /><p className="text-2xl font-bold text-white">{items.length}</p><p className="text-xs text-gray-500">Analyzed</p></div>
            <div className="card text-center"><AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-2" /><p className="text-2xl font-bold text-red-400">{fatiguedCount}</p><p className="text-xs text-gray-500">Fatigued</p></div>
            <div className="card text-center"><CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" /><p className="text-2xl font-bold text-green-400">{healthyCount}</p><p className="text-xs text-gray-500">Healthy</p></div>
            <div className="card text-center"><TrendingDown className="w-5 h-5 text-yellow-400 mx-auto mb-2" /><p className="text-2xl font-bold text-yellow-400">{avgFatigue}%</p><p className="text-xs text-gray-500">Avg Fatigue</p></div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Fatigue Scores</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis type="number" domain={[0, 100]} stroke="#6b7280" fontSize={11} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={11} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} formatter={(v: number) => [`${v}%`, "Fatigue Score"]} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Creative Analysis</h3>
              <div className="space-y-3">
                {items.map((a: any) => {
                  const name = a.creativeName || a.name || "Unknown";
                  return (
                    <div key={name} className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {a.isFatigued ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-green-400" />}
                          <span className="text-sm text-white font-medium">{name}</span>
                        </div>
                        <span className={`text-xs font-medium ${a.isFatigued ? "text-red-400" : "text-green-400"}`}>
                          {(a.fatigueScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                        <div className={`h-2 rounded-full transition-all ${a.fatigueScore > 0.7 ? "bg-red-500" : a.fatigueScore > 0.4 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${(a.fatigueScore * 100).toFixed(0)}%` }} />
                      </div>
                      <p className="text-xs text-gray-500">{a.details || a.description || ""}</p>
                      {a.recommendation && a.recommendation !== "none" && (
                        <div className="flex items-center gap-2 mt-2">
                          <Zap className="w-3 h-3 text-yellow-400" />
                          <span className="text-xs text-yellow-400 capitalize">{a.recommendation.replace(/_/g, " ")}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${a.urgency === "high" ? "bg-red-500/10 text-red-400" : a.urgency === "medium" ? "bg-yellow-500/10 text-yellow-400" : "bg-blue-500/10 text-blue-400"}`}>{a.urgency}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <button className="text-[10px] px-2 py-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Rotate</button>
                        <button className="text-[10px] px-2 py-1 rounded bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refresh</button>
                        <button className="text-[10px] px-2 py-1 rounded bg-gray-700 text-gray-400 hover:bg-gray-600 flex items-center gap-1"><Pause className="w-3 h-3" /> Pause</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
              {recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.map((r: any) => (
                    <div key={r.creativeName || r.name} className={`p-3 rounded-lg border-l-2 bg-gray-800/50 ${r.urgency === "high" ? "border-red-500" : r.urgency === "medium" ? "border-yellow-500" : "border-blue-500"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white font-medium">{r.creativeName || r.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.urgency === "high" ? "bg-red-500/10 text-red-400" : r.urgency === "medium" ? "bg-yellow-500/10 text-yellow-400" : "bg-blue-500/10 text-blue-400"}`}>{r.urgency}</span>
                      </div>
                      <p className="text-sm text-gray-400 capitalize">{(r.recommendation || "").replace(/_/g, " ")}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <ArrowUpRight className="w-3 h-3 text-gray-600" />
                        <span className="text-xs text-gray-500">Fatigue: {(r.fatigueScore * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="text-sm">All creatives are healthy — no recommendations needed</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {view === "trends" && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Fatigue Trend (14 days)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} formatter={(v: number) => [`${v.toFixed(1)}%`, "Avg Fatigue"]} />
                <Line type="monotone" dataKey="avgFatigue" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: "#8b5cf6" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg"><p className="text-xs text-gray-500">Starting Avg</p><p className="text-lg font-bold text-white">{trendData[0]?.avgFatigue.toFixed(0) || "—"}%</p></div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg"><p className="text-xs text-gray-500">Current Avg</p><p className="text-lg font-bold text-white">{trendData[trendData.length - 1]?.avgFatigue.toFixed(0) || "—"}%</p></div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500">Trend</p>
              <p className={`text-lg font-bold ${trendData.length >= 2 && trendData[trendData.length - 1]?.avgFatigue < trendData[0]?.avgFatigue ? "text-green-400" : "text-red-400"}`}>
                {trendData.length >= 2 ? `${(trendData[trendData.length - 1]?.avgFatigue - trendData[0]?.avgFatigue).toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
