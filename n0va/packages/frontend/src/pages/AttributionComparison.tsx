import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, Cell, PieChart, Pie } from "recharts";
import { api } from "../api/client";
import { TrendingUp, BarChart3, PieChart as PieChartIcon, RefreshCw } from "lucide-react";
import { SkeletonChart } from "../components/Skeleton";

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

export default function AttributionComparison() {
  const [comparison, setComparison] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(["last_click", "data_driven"]));
  const [viewMode, setViewMode] = useState<"roas" | "revenue" | "platform">("roas");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.attribution.compare();
      setComparison(res);
      setSelectedModels(new Set(Object.keys(res)));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonChart />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-3 w-16 bg-gray-800 rounded mb-3" />
              <div className="h-7 w-20 bg-gray-800 rounded mb-1" />
              <div className="h-3 w-12 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
        <SkeletonChart />
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="text-gray-400 text-center py-12">
        <p className="mb-4">No attribution data available</p>
        <button className="btn-secondary flex items-center gap-2 mx-auto" onClick={loadData}>
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const modelEntries = Object.entries(comparison) as [string, any][];
  const modelSummaryData = modelEntries
    .filter(([key]) => selectedModels.has(key))
    .map(([key, value]) => ({
      model: MODEL_LABELS[key] || key,
      key,
      roas: value.roas,
      totalRevenue: value.totalRevenue,
      totalCost: value.totalCost,
      totalConversions: value.totalConversions,
    }));

  const revenueByPlatform: Record<string, any> = {};
  const selectedEntries = modelEntries.filter(([key]) => selectedModels.has(key));
  for (const [model, data] of selectedEntries) {
    for (const [platform, pd] of Object.entries(data.platformBreakdown || {}) as [string, any][]) {
      if (!revenueByPlatform[platform]) revenueByPlatform[platform] = {};
      revenueByPlatform[platform][MODEL_LABELS[model]] = pd.roas;
    }
  }
  const platformData = Object.entries(revenueByPlatform).map(([platform, models]) => ({
    platform,
    ...models,
  }));

  const toggleModel = (key: string) => {
    const next = new Set(selectedModels);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelectedModels(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Attribution Comparison</h1>
          <p className="text-gray-500 mt-1">Compare 6 multi-touch attribution models side by side</p>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={loadData}>
          <RefreshCw className="w-4 h-4" /> New Sample
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {modelEntries.map(([key]) => (
          <button
            key={key}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              selectedModels.has(key)
                ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400"
                : "border-gray-700 text-gray-500 hover:text-gray-300"
            }`}
            onClick={() => toggleModel(key)}
          >
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: MODEL_COLORS[key] }} />
            {MODEL_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {modelEntries
          .filter(([key]) => selectedModels.has(key))
          .map(([key, data]) => (
            <div key={key} className="card" style={{ borderColor: MODEL_COLORS[key] + "40" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MODEL_COLORS[key] }} />
                <span className="text-xs text-gray-500 uppercase">{MODEL_LABELS[key]}</span>
              </div>
              <p className="text-2xl font-bold text-white">{data.roas.toFixed(2)}x</p>
              <p className="text-xs text-gray-500">ROAS</p>
              <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                <p>Revenue: ${data.totalRevenue.toLocaleString()}</p>
                <p>Cost: ${data.totalCost.toLocaleString()}</p>
              </div>
            </div>
          ))}
      </div>

      <div className="flex gap-2 border-b border-gray-800 pb-2">
        {(["roas", "revenue", "platform"] as const).map((mode) => (
          <button
            key={mode}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              viewMode === mode ? "bg-gray-800 text-white" : "text-gray-500"
            }`}
            onClick={() => setViewMode(mode)}
          >
            {mode === "roas" ? "ROAS Comparison" : mode === "revenue" ? "Revenue vs Cost" : "Platform ROAS"}
          </button>
        ))}
      </div>

      {viewMode === "roas" && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">ROAS by Attribution Model</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelSummaryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="model" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                <Bar dataKey="roas" radius={[4, 4, 0, 0]}>
                  {modelSummaryData.map((entry) => (
                    <Cell key={entry.key} fill={MODEL_COLORS[entry.key] || "#1a6dff"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {viewMode === "revenue" && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue vs Cost</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelSummaryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="model" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                <Legend />
                <Bar dataKey="totalRevenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="totalCost" fill="#ef4444" radius={[4, 4, 0, 0]} name="Cost" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {viewMode === "platform" && platformData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Platform ROAS by Model</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="platform" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                <Legend />
                {Array.from(selectedModels).map((key) => (
                  <Bar key={key} dataKey={MODEL_LABELS[key]} fill={MODEL_COLORS[key]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Attribution Model Definitions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {modelEntries.map(([key, _data]) => (
            <div key={key} className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MODEL_COLORS[key] }} />
                <span className="text-sm text-white font-medium">{MODEL_LABELS[key]}</span>
              </div>
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
    </div>
  );
}
