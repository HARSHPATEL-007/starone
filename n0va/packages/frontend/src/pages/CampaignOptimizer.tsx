import { useEffect, useState } from "react";
import { Zap, Lightbulb, TrendingUp, DollarSign, Target, BarChart3, CheckCircle, XCircle, RefreshCw, Sparkles, ArrowRight, Filter, AlertTriangle, Layers } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";
import { useToast } from "../components/Toast";

const TYPE_ICONS: Record<string, any> = {
  budget_reallocation: DollarSign,
  platform_shift: Layers,
  bid_adjustment: TrendingUp,
  audience_refinement: Target,
  creative_refresh: Sparkles,
  schedule_optimization: BarChart3,
  landing_page: Target,
  keyword_expansion: Filter,
};

const TYPE_COLORS: Record<string, string> = {
  budget_reallocation: "text-green-400 bg-green-500/10",
  platform_shift: "text-blue-400 bg-blue-500/10",
  bid_adjustment: "text-purple-400 bg-purple-500/10",
  audience_refinement: "text-yellow-400 bg-yellow-500/10",
  creative_refresh: "text-pink-400 bg-pink-500/10",
  schedule_optimization: "text-cyan-400 bg-cyan-500/10",
  landing_page: "text-orange-400 bg-orange-500/10",
  keyword_expansion: "text-indigo-400 bg-indigo-500/10",
};

export default function CampaignOptimizer() {
  const { addToast } = useToast();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("impact");

  async function load() {
    setLoading(true);
    try {
      const data = await api.optimizerV2.dashboard();
      setDashboard(data);
    } catch {
      addToast("error", "Failed to load optimizer data");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleApply(id: string) {
    try {
      await api.optimizerV2.applySuggestion(id);
      addToast("success", "Suggestion applied");
      load();
    } catch { addToast("error", "Failed to apply suggestion"); }
  }

  async function handleDismiss(id: string) {
    try {
      await api.optimizerV2.dismissSuggestion(id);
      load();
    } catch { addToast("error", "Failed to dismiss"); }
  }

  const filtered = (dashboard?.suggestions || []).filter((s: any) => {
    if (filter === "open") return !s.applied && !s.dismissed;
    if (filter === "applied") return s.applied;
    if (filter === "dismissed") return s.dismissed;
    return true;
  }).sort((a: any, b: any) => {
    if (sortBy === "impact") return b.impact === "high" ? 1 : -1;
    if (sortBy === "value") return b.potentialValue - a.potentialValue;
    if (sortBy === "confidence") return b.confidence - a.confidence;
    return 0;
  });

  const impactOrder = { high: 0, medium: 1, low: 2 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Zap className="w-6 h-6 text-yellow-400" />
            AI Campaign Optimizer
          </h1>
          <p className="text-gray-500 mt-1">Intelligent suggestions to maximize campaign performance</p>
        </div>
        <button className="btn-ghost text-xs p-1.5" onClick={load}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            <span className="text-2xl font-bold text-white">{dashboard?.totalOpen || 0}</span>
          </div>
          <p className="text-xs text-gray-500">Open Suggestions</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-2xl font-bold text-white">{dashboard?.counts?.high || 0}</span>
          </div>
          <p className="text-xs text-gray-500">High Impact</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-2xl font-bold text-white">${((dashboard?.totalPotentialValue || 0) / 1000).toFixed(0)}K</span>
          </div>
          <p className="text-xs text-gray-500">Potential Value</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-blue-400" />
            <span className="text-2xl font-bold text-white">{dashboard?.suggestions?.filter((s: any) => s.applied).length || 0}</span>
          </div>
          <p className="text-xs text-gray-500">Applied</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select className="input text-sm py-1.5 w-auto" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="applied">Applied</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gray-500" />
          <select className="input text-sm py-1.5 w-auto" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="impact">Impact</option>
            <option value="value">Value</option>
            <option value="confidence">Confidence</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Sparkles className="w-10 h-10 mx-auto mb-2" />
          <p>No suggestions found</p>
          <p className="text-xs mt-1">Everything looks optimized</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s: any) => {
            const Icon = TYPE_ICONS[s.type] || Lightbulb;
            const colorClass = TYPE_COLORS[s.type] || "text-gray-400 bg-gray-500/10";
            return (
              <div key={s.id} className={`card p-4 transition-all ${s.applied ? "opacity-60" : ""} ${s.dismissed ? "opacity-40" : ""}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{s.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        s.impact === "high" ? "bg-red-500/20 text-red-400" : s.impact === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-500/20 text-gray-400"
                      }`}>{s.impact}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-gray-800 text-gray-400">{s.effort}</span>
                      <span className="text-xs text-gray-500">{s.confidence}% confidence</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{s.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="truncate max-w-[200px]">{s.campaignName}</span>
                      {s.potentialValue > 0 && <span>Potential: <span className="text-green-400 font-medium">${s.potentialValue.toLocaleString()}</span></span>}
                    </div>
                    {!s.applied && !s.dismissed && s.actions?.length > 0 && (
                      <div className="flex items-center gap-2 mt-3">
                        <button onClick={() => handleApply(s.id)} className="btn-primary text-xs flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" /> Apply
                        </button>
                        <button onClick={() => handleDismiss(s.id)} className="btn-ghost text-xs">Dismiss</button>
                      </div>
                    )}
                    {s.applied && <span className="text-xs text-green-400 mt-2 inline-block"><CheckCircle className="w-3.5 h-3.5 inline mr-1" />Applied</span>}
                    {s.dismissed && <span className="text-xs text-gray-600 mt-2 inline-block"><XCircle className="w-3.5 h-3.5 inline mr-1" />Dismissed</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
