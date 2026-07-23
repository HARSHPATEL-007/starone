import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../api/client";
import { AlertTriangle, CheckCircle, RefreshCw, Palette, TrendingDown, Zap, ArrowUpRight } from "lucide-react";
import { SkeletonCard, SkeletonChart } from "../components/Skeleton";

export default function CreativeFatigue() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const result = await api.optimizer.creativeMock();
      setData(result);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <SkeletonChart />
      </div>
    );
  }

  if (!data) return null;

  const { creatives, analysis } = data;
  const fatiguedCount = analysis.filter((a: any) => a.isFatigued).length;
  const healthyCount = analysis.length - fatiguedCount;
  const avgFatigue = analysis.length > 0
    ? (analysis.reduce((s: number, a: any) => s + a.fatigueScore, 0) / analysis.length * 100).toFixed(0)
    : 0;

  const chartData = analysis.map((a: any) => ({
    name: a.creativeName.length > 12 ? a.creativeName.substring(0, 12) + "..." : a.creativeName,
    score: parseFloat((a.fatigueScore * 100).toFixed(0)),
    isFatigued: a.isFatigued,
  }));

  const recommendations = analysis
    .filter((a: any) => a.recommendation !== "none")
    .sort((a: any, b: any) => {
      const urgency: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return (urgency[b.urgency] || 0) - (urgency[a.urgency] || 0);
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Creative Fatigue Monitor</h1>
          <p className="text-gray-500 mt-1">Analyze ad fatigue across creatives and get rotation recommendations</p>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={loadData}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <Palette className="w-5 h-5 text-n0va-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{creatives?.length || 0}</p>
          <p className="text-xs text-gray-500">Total Creatives</p>
        </div>
        <div className="card text-center">
          <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-red-400">{fatiguedCount}</p>
          <p className="text-xs text-gray-500">Fatigued</p>
        </div>
        <div className="card text-center">
          <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-400">{healthyCount}</p>
          <p className="text-xs text-gray-500">Healthy</p>
        </div>
        <div className="card text-center">
          <TrendingDown className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-yellow-400">{avgFatigue}%</p>
          <p className="text-xs text-gray-500">Avg Fatigue</p>
        </div>
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
            {analysis.map((a: any) => (
              <div key={a.creativeName} className="p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {a.isFatigued ? (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                    <span className="text-sm text-white font-medium">{a.creativeName}</span>
                  </div>
                  <span className={`text-xs font-medium ${a.isFatigued ? "text-red-400" : "text-green-400"}`}>
                    {(a.fatigueScore * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all ${a.fatigueScore > 0.7 ? "bg-red-500" : a.fatigueScore > 0.4 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${(a.fatigueScore * 100).toFixed(0)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{a.details}</p>
                {a.recommendation !== "none" && (
                  <div className="flex items-center gap-2 mt-2">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs text-yellow-400 capitalize">{a.recommendation}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      a.urgency === "high" ? "bg-red-500/10 text-red-400" :
                      a.urgency === "medium" ? "bg-yellow-500/10 text-yellow-400" :
                      "bg-blue-500/10 text-blue-400"
                    }`}>{a.urgency}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((r: any) => (
                <div key={r.creativeName} className={`p-3 rounded-lg border-l-2 bg-gray-800/50 ${
                  r.urgency === "high" ? "border-red-500" : r.urgency === "medium" ? "border-yellow-500" : "border-blue-500"
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white font-medium">{r.creativeName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.urgency === "high" ? "bg-red-500/10 text-red-400" :
                      r.urgency === "medium" ? "bg-yellow-500/10 text-yellow-400" :
                      "bg-blue-500/10 text-blue-400"
                    }`}>{r.urgency}</span>
                  </div>
                  <p className="text-sm text-gray-400 capitalize">{r.recommendation.replace(/_/g, " ")}</p>
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
    </div>
  );
}
