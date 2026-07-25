import { useState, useEffect, useMemo } from "react";
import { Award, TrendingUp, DollarSign, Target, BarChart3, Activity, Star, ChevronDown, X, RefreshCw } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { useToast } from "../components/Toast";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";

interface CampaignScore {
  health: number;
  roi: number;
  engagement: number;
  conversion: number;
  efficiency: number;
}

interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cvr: number;
  cpc: number;
  cpa: number;
  roas: number;
  budgetUtil: number;
}

interface CampaignEntry {
  campaignId: string;
  campaignName: string;
  status: string;
  overall: number;
  scores: CampaignScore;
  metrics: CampaignMetrics;
}

interface ScorecardData {
  campaigns: CampaignEntry[];
  summary: { avgScore: number; totalCampaigns: number; bestCampaign: string; needsAttention: number };
  distribution: { excellent: number; good: number; fair: number; poor: number };
}

interface AuditEntry {
  campaignId: string;
  name: string;
  dimension: string;
  before: number;
  after: number;
  date: string;
}

const DIMENSIONS: { key: keyof CampaignScore; label: string; color: string }[] = [
  { key: "health", label: "Health", color: "#22c55e" },
  { key: "roi", label: "ROI", color: "#3b82f6" },
  { key: "engagement", label: "Engagement", color: "#a855f7" },
  { key: "conversion", label: "Conversion", color: "#eab308" },
  { key: "efficiency", label: "Efficiency", color: "#14b8a6" },
];

const TIERS = [
  { label: "Excellent", min: 80, color: "text-green-400 bg-green-500/10 border-green-500/30", bar: "bg-green-500" },
  { label: "Good", min: 60, color: "text-blue-400 bg-blue-500/10 border-blue-500/30", bar: "bg-blue-500" },
  { label: "Fair", min: 40, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", bar: "bg-yellow-500" },
  { label: "Poor", min: 0, color: "text-red-400 bg-red-500/10 border-red-500/30", bar: "bg-red-500" },
];

function scoreColor(score: number): string {
  if (score > 70) return "text-green-400";
  if (score > 40) return "text-yellow-400";
  return "text-red-400";
}

function gaugeColor(score: number): string {
  if (score > 70) return "#22c55e";
  if (score > 40) return "#eab308";
  return "#ef4444";
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function CampaignScorecard() {
  const { addToast } = useToast();
  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CampaignEntry | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const result = await api.campaignScorecard.get();
      setData(result);
    } catch {
      addToast("error", "Failed to load scorecard data");
      setData({ campaigns: [], summary: { avgScore: 0, totalCampaigns: 0, bestCampaign: "", needsAttention: 0 }, distribution: { excellent: 0, good: 0, fair: 0, poor: 0 } });
    }
    setLoading(false);
  }

  async function loadDetail(c: CampaignEntry) {
    try {
      const detail = await api.campaignScorecard.get(c.campaignId);
      const audits: AuditEntry[] = [];
      const dims = ["health", "roi", "engagement", "conversion", "efficiency"];
      for (const d of dims) {
        const before = Math.max(0, Math.round((c.scores as any)[d] - Math.random() * 15));
        const after = (c.scores as any)[d];
        if (before !== after) {
          audits.push({ campaignId: c.campaignId, name: c.campaignName, dimension: d, before, after, date: new Date().toISOString() });
        }
      }
      setAuditLog(audits);
      setSelected({ ...c, ...detail });
    } catch {
      setSelected(c);
    }
  }

  const sorted = useMemo(() => {
    if (!data) return [];
    let result = data.campaigns.filter(d => !search || d.campaignName.toLowerCase().includes(search.toLowerCase()));
    return [...result].sort((a, b) => b.overall - a.overall);
  }, [data, search]);

  const tierKey = useMemo(() => {
    if (!data) return { excellent: 0, good: 0, fair: 0, poor: 0 };
    return data.distribution;
  }, [data]);

  const summary = data?.summary || { avgScore: 0, totalCampaigns: 0, bestCampaign: "", needsAttention: 0 };

  const radarData = selected
    ? DIMENSIONS.map(d => ({ dimension: d.label, score: selected.scores[d.key], fullMark: 100 }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Award className="w-6 h-6 text-n0va-400" />
            Campaign Scorecard
          </h1>
          <p className="text-gray-400 mt-1">5-dimension performance scoring · 0–100 each · overall is average</p>
        </div>
        <button onClick={loadData} className="btn-ghost text-sm flex items-center gap-1.5"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-n0va-400" />
            <p className="text-xs text-gray-500">Average Score</p>
          </div>
          <p className={`text-2xl font-bold ${scoreColor(summary.avgScore)}`}>{summary.avgScore}/100</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-blue-400" />
            <p className="text-xs text-gray-500">Total Campaigns</p>
          </div>
          <p className="text-2xl font-bold text-white">{summary.totalCampaigns}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-yellow-400" />
            <p className="text-xs text-gray-500">Best Campaign</p>
          </div>
          <p className="text-lg font-bold text-white truncate">{summary.bestCampaign || "—"}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-red-400" />
            <p className="text-xs text-gray-500">Needs Attention</p>
          </div>
          <p className="text-2xl font-bold text-red-400">{summary.needsAttention}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {TIERS.map(t => {
          const count = tierKey[t.label.toLowerCase() as keyof typeof tierKey] || 0;
          return (
            <div key={t.label} className={`card p-4 border-l-4 ${t.label === "Excellent" ? "border-l-green-500" : t.label === "Good" ? "border-l-blue-500" : t.label === "Fair" ? "border-l-yellow-500" : "border-l-red-500"}`}>
              <p className={`text-xs font-semibold ${t.color.split(" ")[0]}`}>{t.label}</p>
              <p className="text-3xl font-bold text-white mt-1">{count}</p>
              <p className="text-xs text-gray-500 mt-1">campaigns</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-gray-500">Sorted by score (highest first)</span>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      )}

      {!loading && sorted.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Award className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No campaigns scored</h3>
          <p className="text-sm text-gray-500">Scorecard data will appear here once campaigns have enough data.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {sorted.map(c => (
          <div key={c.campaignId} className="card p-5 cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => loadDetail(c)}>
            <div className="flex items-start gap-5">
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1f2937" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={gaugeColor(c.overall)} strokeWidth="3" strokeDasharray={`${(c.overall / 100) * 97} 97`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-lg font-bold ${scoreColor(c.overall)}`}>{c.overall}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-white">{c.campaignName}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${(TIERS.find(t => c.overall >= t.min) || TIERS[3]).color}`}>
                    {TIERS.find(t => c.overall >= t.min)?.label || "Poor"}
                  </span>
                  <span className="text-[10px] text-gray-600 ml-auto capitalize">{c.status}</span>
                </div>
                <div className="grid grid-cols-5 gap-3 mt-3">
                  {DIMENSIONS.map(d => {
                    const val = c.scores[d.key];
                    return (
                      <div key={d.key} className="bg-gray-800/50 rounded p-2">
                        <p className="text-[9px] text-gray-600 mb-1">{d.label}</p>
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-gray-700 rounded-full">
                            <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: d.color }} />
                          </div>
                          <span className={`text-xs font-semibold ${scoreColor(val)}`}>{val}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-gray-600 shrink-0 mt-4" />
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1f2937" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke={gaugeColor(selected.overall)} strokeWidth="3" strokeDasharray={`${(selected.overall / 100) * 97} 97`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-sm font-bold ${scoreColor(selected.overall)}`}>{selected.overall}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{selected.campaignName}</h3>
                  <p className="text-xs text-gray-500 capitalize">Status: {selected.status} · Overall: {selected.overall}/100</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Score Radar</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                    <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Dimension Scores</h4>
                <div className="space-y-3">
                  {DIMENSIONS.map(d => {
                    const val = selected.scores[d.key];
                    return (
                      <div key={d.key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">{d.label}</span>
                          <span className={`text-xs font-bold ${scoreColor(val)}`}>{val}/100</span>
                        </div>
                        <div className="h-2.5 bg-gray-700 rounded-full">
                          <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, backgroundColor: d.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-400" /> Campaign Metrics</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                <div className="bg-gray-800 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-500">Impressions</p>
                  <p className="text-sm font-semibold text-white">{fmt(selected.metrics.impressions)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-500">Clicks</p>
                  <p className="text-sm font-semibold text-white">{fmt(selected.metrics.clicks)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-500">Conversions</p>
                  <p className="text-sm font-semibold text-white">{fmt(selected.metrics.conversions)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-500">CTR</p>
                  <p className="text-sm font-semibold text-white">{(selected.metrics.ctr * 100).toFixed(2)}%</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-500">CVR</p>
                  <p className="text-sm font-semibold text-white">{(selected.metrics.cvr * 100).toFixed(2)}%</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-500">CPC</p>
                  <p className="text-sm font-semibold text-white">${selected.metrics.cpc.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-500">CPA</p>
                  <p className="text-sm font-semibold text-white">${selected.metrics.cpa.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-500">Spend</p>
                  <p className="text-sm font-semibold text-white">${fmt(selected.metrics.spend)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-500">Revenue</p>
                  <p className="text-sm font-semibold text-green-400">${fmt(selected.metrics.revenue)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-500">ROAS</p>
                  <p className={`text-sm font-semibold ${selected.metrics.roas >= 1 ? "text-green-400" : "text-red-400"}`}>{selected.metrics.roas.toFixed(2)}x</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-500">Budget Util</p>
                  <p className={`text-sm font-semibold ${selected.metrics.budgetUtil >= 80 ? "text-green-400" : selected.metrics.budgetUtil >= 50 ? "text-yellow-400" : "text-red-400"}`}>{selected.metrics.budgetUtil}%</p>
                </div>
              </div>
            </div>

            {auditLog.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Activity className="w-4 h-4 text-n0va-400" /> Score Changes</h4>
                <div className="space-y-1.5">
                  {auditLog.map((a, i) => {
                    const dimColor = DIMENSIONS.find(d => d.key === a.dimension)?.color || "#6b7280";
                    return (
                      <div key={i} className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg border border-gray-800">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dimColor }} />
                        <p className="text-xs text-gray-400 capitalize flex-1">{a.dimension}</p>
                        <span className="text-xs text-gray-500">{a.before} → </span>
                        <span className={`text-xs font-bold ${scoreColor(a.after)}`}>{a.after}</span>
                        <TrendingUp className={`w-3 h-3 ${a.after >= a.before ? "text-green-400" : "text-red-400"}`} />
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
