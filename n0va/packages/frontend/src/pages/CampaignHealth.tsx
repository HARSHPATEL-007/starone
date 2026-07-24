import { useState, useEffect } from "react";
import { HeartPulse, Search, TrendingUp, TrendingDown, DollarSign, Eye, MousePointerClick, Target, Users, AlertTriangle, CheckCircle, Clock, Activity } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

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

export default function CampaignHealth() {
  const { addToast } = useToast();
  const [data, setData] = useState<CampaignHealth[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.insights.health.all()
      .then(setData)
      .catch(() => api.insights.health.sample().then(setData))
      .finally(() => setLoading(false));
  }, []);

  const healthy = data.filter(d => d.overall >= 80).length;
  const warning = data.filter(d => d.overall >= 60 && d.overall < 80).length;
  const critical = data.filter(d => d.overall < 60).length;
  const avgScore = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.overall, 0) / data.length) : 0;

  const filtered = data.filter(d => !search || d.campaignName.toLowerCase().includes(search.toLowerCase()));

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
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500">Average Score</p><p className="text-xl font-bold text-white mt-1">{avgScore}/100</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Healthy</p><p className="text-xl font-bold text-green-400 mt-1">{healthy}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Warning</p><p className="text-xl font-bold text-yellow-400 mt-1">{warning}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Critical</p><p className="text-xl font-bold text-red-400 mt-1">{critical}</p></div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading && (
        <div className="card p-12 flex items-center justify-center text-center">
          <Activity className="w-6 h-6 text-n0va-400 animate-spin" />
          <span className="ml-3 text-gray-400">Loading campaign health data...</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <HeartPulse className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No campaigns found</h3>
          <p className="text-sm text-gray-500">Campaign health data will appear here.</p>
        </div>
      )}

      {filtered.map(c => {
        const sm = statusFromScore(c.overall);
        const SI = sm.icon;
        return (
          <div key={c.campaignId} className={`card p-5 border-l-4 ${sm.border}`}>
            <div className="flex items-start gap-4">
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1f2937" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={c.overall >= 80 ? "#22c55e" : c.overall >= 60 ? "#eab308" : "#ef4444"} strokeWidth="3" strokeDasharray={`${(c.overall / 100) * 97} 97`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{c.overall}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-white">{c.campaignName}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${sm.color}`}>{sm.label}</span>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-3">
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-[9px] text-gray-600">Budget</p>
                    <p className={`text-xs font-semibold ${c.budget >= 80 ? "text-green-400" : c.budget >= 60 ? "text-yellow-400" : "text-red-400"}`}>{c.budget}/100</p>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-[9px] text-gray-600">Performance</p>
                    <p className={`text-xs font-semibold ${c.performance >= 80 ? "text-green-400" : c.performance >= 60 ? "text-yellow-400" : "text-red-400"}`}>{c.performance}/100</p>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-[9px] text-gray-600">Engagement</p>
                    <p className={`text-xs font-semibold ${c.engagement >= 80 ? "text-green-400" : c.engagement >= 60 ? "text-yellow-400" : "text-red-400"}`}>{c.engagement}/100</p>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-[9px] text-gray-600">Efficiency</p>
                    <p className={`text-xs font-semibold ${c.efficiency >= 80 ? "text-green-400" : c.efficiency >= 60 ? "text-yellow-400" : "text-red-400"}`}>{c.efficiency}/100</p>
                  </div>
                </div>
                {c.issues.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {c.issues.map((issue, i) => (
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
  );
}
