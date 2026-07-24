import { useState, useEffect } from "react";
import { HeartPulse, Plus, Search, TrendingUp, TrendingDown, DollarSign, Eye, MousePointerClick, Target, Megaphone, BarChart3, Users, AlertTriangle, CheckCircle, Clock, Activity } from "lucide-react";
import { useToast } from "../components/Toast";

interface CampaignHealth {
  id: string;
  name: string;
  status: "healthy" | "warning" | "critical" | "inactive";
  score: number;
  metrics: { ctr: number; cpc: number; cpa: number; roas: number; spendUtilization: number; frequency: number };
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  issues: string[];
  lastChecked: string;
}

const STORAGE_KEY = "n0va_campaign_health";

const DEFAULT_HEALTH: CampaignHealth[] = [
  { id: "ch-1", name: "Product Launch Q3", status: "healthy", score: 86, metrics: { ctr: 3.8, cpc: 1.92, cpa: 38.46, roas: 4.2, spendUtilization: 72, frequency: 1.5 }, budget: 125000, spent: 58700, impressions: 485000, clicks: 18430, conversions: 890, revenue: 285000, issues: [], lastChecked: new Date().toISOString() },
  { id: "ch-2", name: "Summer Sale 2025", status: "healthy", score: 82, metrics: { ctr: 4.1, cpc: 1.58, cpa: 34.38, roas: 3.8, spendUtilization: 58, frequency: 1.3 }, budget: 75000, spent: 35000, impressions: 320000, clicks: 13120, conversions: 620, revenue: 186000, issues: [], lastChecked: new Date().toISOString() },
  { id: "ch-3", name: "Enterprise Q3", status: "warning", score: 65, metrics: { ctr: 2.9, cpc: 9.82, cpa: 158.33, roas: 3.4, spendUtilization: 81, frequency: 1.2 }, budget: 200000, spent: 121000, impressions: 95000, clicks: 2850, conversions: 180, revenue: 98000, issues: ["CPA exceeds $150 threshold", "Low CTR below 3%", "High CPC above $8"], lastChecked: new Date().toISOString() },
  { id: "ch-4", name: "Retargeting Q3", status: "warning", score: 58, metrics: { ctr: 5.2, cpc: 1.85, cpa: 45.67, roas: 2.8, spendUtilization: 92, frequency: 2.8, }, budget: 45000, spent: 41400, impressions: 210000, clicks: 10920, conversions: 450, revenue: 115000, issues: ["Budget nearly exhausted (92%)", "High frequency (2.8) - fatigue risk"], lastChecked: new Date().toISOString() },
  { id: "ch-5", name: "Webinar Series", status: "critical", score: 35, metrics: { ctr: 1.2, cpc: 4.50, cpa: 180.00, roas: 0.8, spendUtilization: 45, frequency: 1.1, }, budget: 20000, spent: 9000, impressions: 45000, clicks: 540, conversions: 12, revenue: 7200, issues: ["ROAS below 1x - losing money", "CTR critically low at 1.2%", "Conversions below target"], lastChecked: new Date().toISOString() },
  { id: "ch-6", name: "Holiday 2025", status: "inactive", score: 0, metrics: { ctr: 0, cpc: 0, cpa: 0, roas: 0, spendUtilization: 0, frequency: 0, }, budget: 100000, spent: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, issues: ["Campaign not started"], lastChecked: new Date().toISOString() },
];

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  healthy: { label: "Healthy", color: "text-green-400 bg-green-500/10 border-green-500/30", icon: CheckCircle },
  warning: { label: "Warning", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", icon: AlertTriangle },
  critical: { label: "Critical", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: AlertTriangle },
  inactive: { label: "Inactive", color: "text-gray-500 bg-gray-800 border-gray-700", icon: Activity },
};

function load(): CampaignHealth[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_HEALTH));
    return DEFAULT_HEALTH;
  } catch { return []; }
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function CampaignHealth() {
  const { addToast } = useToast();
  const [data, setData] = useState<CampaignHealth[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { setData(load()); }, []);

  const healthy = data.filter(d => d.status === "healthy").length;
  const warning = data.filter(d => d.status === "warning").length;
  const critical = data.filter(d => d.status === "critical").length;
  const avgScore = data.filter(d => d.status !== "inactive").length > 0
    ? Math.round(data.filter(d => d.status !== "inactive").reduce((s, d) => s + d.score, 0) / data.filter(d => d.status !== "inactive").length)
    : 0;

  const filtered = data.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()));

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

      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <HeartPulse className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No campaigns found</h3>
          <p className="text-sm text-gray-500">Campaign health data will appear here.</p>
        </div>
      )}

      {filtered.map(c => {
        const sm = STATUS_META[c.status];
        const SI = sm.icon;
        return (
          <div key={c.id} className={`card p-5 border-l-4 ${c.status === "healthy" ? "border-l-green-500" : c.status === "warning" ? "border-l-yellow-500" : c.status === "critical" ? "border-l-red-500" : "border-l-gray-700"}`}>
            <div className="flex items-start gap-4">
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1f2937" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={c.status === "healthy" ? "#22c55e" : c.status === "warning" ? "#eab308" : c.status === "critical" ? "#ef4444" : "#6b7280"} strokeWidth="3" strokeDasharray={`${(c.score / 100) * 97} 97`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-bold ${c.status === "inactive" ? "text-gray-600" : "text-white"}`}>{c.status === "inactive" ? "—" : c.score}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-white">{c.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${sm.color}`}>{sm.label}</span>
                </div>
                {/* Metric row */}
                <div className="grid grid-cols-4 gap-3 mt-3">
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-[9px] text-gray-600">CTR</p>
                    <p className="text-xs font-semibold text-white">{c.metrics.ctr.toFixed(1)}%</p>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-[9px] text-gray-600">CPC</p>
                    <p className="text-xs font-semibold text-white">${c.metrics.cpc.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-[9px] text-gray-600">CPA</p>
                    <p className="text-xs font-semibold text-white">${c.metrics.cpa.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-[9px] text-gray-600">ROAS</p>
                    <p className={`text-xs font-semibold ${c.metrics.roas >= 3 ? "text-green-400" : c.metrics.roas >= 1.5 ? "text-yellow-400" : "text-red-400"}`}>{c.metrics.roas.toFixed(1)}x</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-[9px] text-gray-600">Spend</p>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.metrics.spendUtilization > 90 ? "bg-red-500" : c.metrics.spendUtilization > 75 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${c.metrics.spendUtilization}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400">{c.metrics.spendUtilization}%</span>
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-[9px] text-gray-600">Frequency</p>
                    <p className="text-xs font-semibold text-white">{c.metrics.frequency.toFixed(1)}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-[9px] text-gray-600">Budget</p>
                    <p className="text-xs font-semibold text-white">${fmt(c.spent)} / ${fmt(c.budget)}</p>
                  </div>
                </div>
                {c.issues.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {c.issues.map((issue, i) => (
                      <p key={i} className="flex items-center gap-1 text-[10px] text-red-400"><AlertTriangle className="w-3 h-3" />{issue}</p>
                    ))}
                  </div>
                )}
                <p className="text-[9px] text-gray-700 mt-2">Last checked: {new Date(c.lastChecked).toLocaleString()}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
