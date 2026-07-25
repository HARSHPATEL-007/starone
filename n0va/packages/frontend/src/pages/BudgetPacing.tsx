import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, Clock, RefreshCw } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard, SkeletonRow } from "../components/Skeleton";

const STATUS_COLORS: Record<string, string> = {
  on_track: "#10b981",
  ahead: "#3b82f6",
  behind: "#f59e0b",
  critical: "#ef4444",
  completed: "#6b7280",
};

const STATUS_BADGE: Record<string, string> = {
  on_track: "bg-green-500/10 text-green-400 border-green-500/20",
  ahead: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  behind: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  completed: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const CAMPAIGN_STATUS_BADGE: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  paused: "bg-amber-500/10 text-amber-400",
  draft: "bg-gray-500/10 text-gray-400",
};

const PACING_LABELS: Record<string, string> = {
  on_track: "On Track",
  ahead: "Ahead",
  behind: "Behind",
  critical: "Critical",
  completed: "Completed",
};

function fmt(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function pct(n: number): string {
  return n.toFixed(1) + "%";
}

export default function BudgetPacing() {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.pacing.summary().then(res => {
      setData(res.results);
      setSummary(res.summary);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Activity className="w-6 h-6 text-n0va-400" />
              Budget Pacing
            </h1>
            <p className="text-gray-400 mt-1">Campaign budget pacing against timeline</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="space-y-3">
          <SkeletonCard />
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  const totalCampaigns = summary?.totalCampaigns || data.length;
  const totalBudget = summary?.totalBudget || data.reduce((s: number, c: any) => s + (c.budget || 0), 0);
  const totalProjected = summary?.totalProjected || data.reduce((s: number, c: any) => s + (c.projectedSpend || 0), 0);
  const avgPacingDiff = summary?.avgPacingDiff ?? (data.length > 0 ? data.reduce((s: number, c: any) => s + (c.pacingDiff || 0), 0) / data.length : 0);

  const countByStatus = (status: string) =>
    data.filter((c: any) => c.pacingStatus === status).length;

  const sortedData = [...data].sort((a: any, b: any) => {
    const order = ["critical", "behind", "on_track", "ahead", "completed"];
    return order.indexOf(a.pacingStatus) - order.indexOf(b.pacingStatus);
  });

  const chartData = sortedData.map((c: any) => ({
    name: c.campaignName?.length > 15 ? c.campaignName.slice(0, 15) + "..." : c.campaignName || "Unknown",
    fullName: c.campaignName || "Unknown",
    id: c._id || c.id,
    timeElapsed: c.timeElapsedPct ?? (c.daysElapsed && c.daysTotal ? (c.daysElapsed / c.daysTotal) * 100 : 0),
    budgetUsed: c.budgetUsedPct ?? (c.spent && c.budget ? (c.spent / c.budget) * 100 : 0),
    pacingStatus: c.pacingStatus || "on_track",
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const entry = payload[0]?.payload;
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
        <p className="text-white font-semibold mb-1">{entry.fullName}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-gray-400">
            {p.name}: <span className="text-white">{p.value.toFixed(1)}%</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="w-6 h-6 text-n0va-400" />
            Budget Pacing
          </h1>
          <p className="text-gray-400 mt-1">Campaign budget pacing against timeline</p>
        </div>
        <button className="btn-ghost p-1.5" onClick={() => { setLoading(true); api.pacing.summary().then(res => { setData(res.results); setSummary(res.summary); }).finally(() => setLoading(false)); }}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Campaigns</p>
          <p className="text-2xl font-bold text-white">{totalCampaigns}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">On Track</p>
          <p className="text-2xl font-bold" style={{ color: "#10b981" }}>{countByStatus("on_track")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Ahead</p>
          <p className="text-2xl font-bold" style={{ color: "#3b82f6" }}>{countByStatus("ahead")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Behind</p>
          <p className="text-2xl font-bold" style={{ color: "#f59e0b" }}>{countByStatus("behind")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Critical</p>
          <p className="text-2xl font-bold" style={{ color: "#ef4444" }}>{countByStatus("critical")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Completed</p>
          <p className="text-2xl font-bold" style={{ color: "#6b7280" }}>{countByStatus("completed")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Budget</p>
            <DollarSign className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-xl font-bold text-white">{fmt(totalBudget)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Projected Spend</p>
            <TrendingUp className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-xl font-bold text-white">{fmt(totalProjected)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Avg Pacing Diff</p>
            <Activity className="w-4 h-4 text-gray-500" />
          </div>
          <p className={`text-xl font-bold flex items-center gap-1 ${avgPacingDiff > 5 ? "text-red-400" : avgPacingDiff < -5 ? "text-blue-400" : "text-green-400"}`}>
            {avgPacingDiff > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {avgPacingDiff > 0 ? "+" : ""}{pct(avgPacingDiff)}
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-n0va-400" />
          Budget Usage vs Time Elapsed
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" barSize={16} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} stroke="#6b7280" fontSize={10} tickFormatter={v => v + "%"} />
              <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={10} width={120} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "10px", color: "#9ca3af" }} />
              <Bar dataKey="timeElapsed" name="Time Elapsed" fill="#374151" radius={[0, 4, 4, 0]} />
              <Bar dataKey="budgetUsed" name="Budget Used" radius={[0, 4, 4, 0]}>
                {chartData.map((entry: any, idx: number) => (
                  <Cell key={idx} fill={STATUS_COLORS[entry.pacingStatus] || "#6b7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 pb-0 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-n0va-400" />
            Campaign Pacing Details
          </h3>
          <span className="text-xs text-gray-500">{data.length} campaigns</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="p-3 font-medium">Campaign</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Days</th>
                <th className="p-3 font-medium">Time Elapsed</th>
                <th className="p-3 font-medium">Budget Used</th>
                <th className="p-3 font-medium">Pacing</th>
                <th className="p-3 font-medium text-right">Avg Daily</th>
                <th className="p-3 font-medium text-right">Projected</th>
                <th className="p-3 font-medium text-right">vs Budget</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((c: any) => {
                const id = c._id || c.id;
                const campaignStatus = c.status || "active";
                const daysElapsed = c.daysElapsed ?? 0;
                const daysTotal = c.daysTotal ?? 1;
                const timePct = c.timeElapsedPct ?? (daysTotal > 0 ? (daysElapsed / daysTotal) * 100 : 0);
                const budget = c.budget || 0;
                const spent = c.spent || 0;
                const budgetPct = c.budgetUsedPct ?? (budget > 0 ? (spent / budget) * 100 : 0);
                const pacingStatus = c.pacingStatus || "on_track";
                const avgDaily = c.avgDailySpend ?? (daysElapsed > 0 ? spent / daysElapsed : 0);
                const projectedSpend = c.projectedSpend ?? (avgDaily * daysTotal);
                const vsBudget = projectedSpend - budget;
                const vsBudgetPct = budget > 0 ? (vsBudget / budget) * 100 : 0;

                return (
                  <tr key={id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="p-3">
                      <Link to={`/campaigns/${id}`} className="text-white font-medium hover:text-n0va-400 transition-colors">
                        {c.campaignName || "Unnamed Campaign"}
                      </Link>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CAMPAIGN_STATUS_BADGE[campaignStatus] || "bg-gray-500/10 text-gray-400"}`}>
                        {campaignStatus.charAt(0).toUpperCase() + campaignStatus.slice(1)}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400 whitespace-nowrap">
                      {daysElapsed} / {daysTotal}
                    </td>
                    <td className="p-3 pr-6">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-700 overflow-hidden max-w-[100px]">
                          <div className="h-full rounded-full bg-gray-500" style={{ width: `${Math.min(timePct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{pct(timePct)}</span>
                      </div>
                    </td>
                    <td className="p-3 pr-6">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-700 overflow-hidden max-w-[100px]">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(budgetPct, 100)}%`, backgroundColor: STATUS_COLORS[pacingStatus] || "#6b7280" }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{pct(budgetPct)}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_BADGE[pacingStatus] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                        {pacingStatus === "on_track" ? <CheckCircle className="w-3 h-3" /> : pacingStatus === "ahead" ? <TrendingUp className="w-3 h-3" /> : pacingStatus === "behind" ? <Clock className="w-3 h-3" /> : pacingStatus === "critical" ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        {PACING_LABELS[pacingStatus] || pacingStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right text-gray-300 whitespace-nowrap">{fmt(avgDaily)}</td>
                    <td className="p-3 text-right text-gray-300 whitespace-nowrap">{fmt(projectedSpend)}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <span className={`text-xs font-medium ${vsBudget > 0 ? "text-red-400" : vsBudget < 0 ? "text-green-400" : "text-gray-500"}`}>
                        {vsBudget > 0 ? "+" : ""}{pct(vsBudgetPct)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-gray-500">
                    No campaign pacing data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
