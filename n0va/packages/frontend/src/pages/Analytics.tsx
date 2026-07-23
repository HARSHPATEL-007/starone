import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import { TrendingUp, DollarSign, Target, Eye, MousePointerClick, BarChart3, RefreshCw } from "lucide-react";
import { SkeletonChart } from "../components/Skeleton";
import { api } from "../api/client";

const COLORS = ["#1a6dff", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#ec4899"];

export default function Analytics() {
  const [crossPlatform, setCrossPlatform] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.analytics.crossPlatform(String(days)).catch(() => null),
      api.analytics.overview(String(days)).catch(() => null),
    ])
      .then(([cp, ov]) => {
        setCrossPlatform(cp);
        setOverview(ov);
      })
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-white">Analytics</h1><p className="text-gray-500 mt-1">Cross-platform performance overview</p></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonChart key={i} />)}</div>
        <SkeletonChart />
      </div>
    );
  }

  const platforms = crossPlatform?.platforms || [];
  const budgets = crossPlatform?.budgetOverview || [];
  const metrics = overview?.metrics || {};
  const dailyMetrics = overview?.dailyMetrics || [];

  const spendPieData = platforms.map((p: any) => ({ name: p.platform, value: p.spend }));
  const revBarData = platforms.map((p: any) => ({ name: p.platform, Revenue: p.revenue, Spend: p.spend }));
  const availableDays = [7, 30, 90];

  const chartData = dailyMetrics.slice(-days).map((d: any) => ({
    ...d,
    date: d.date?.substring(5) || d.date,
  }));

  const kpiCards = [
    { label: "Total Revenue", value: `$${((metrics.totalRevenue || 0) / 1000).toFixed(1)}K`, icon: TrendingUp, color: "text-green-400", change: "+12.3%" },
    { label: "Total Spend", value: `$${((metrics.totalSpend || 0) / 1000).toFixed(1)}K`, icon: DollarSign, color: "text-yellow-400", change: "+8.1%" },
    { label: "Avg ROAS", value: (metrics.avgRoas || 0).toFixed(2) + "x", icon: Target, color: "text-n0va-400", change: "+3.8%" },
    { label: "Impressions", value: ((metrics.totalImpressions || 0) / 1000).toFixed(0) + "K", icon: Eye, color: "text-purple-400", change: "+15.2%" },
    { label: "Clicks", value: ((metrics.totalClicks || 0) / 1000).toFixed(0) + "K", icon: MousePointerClick, color: "text-blue-400", change: "+9.7%" },
    { label: "Avg CTR", value: (metrics.avgCtr || 0).toFixed(2) + "%", icon: BarChart3, color: "text-emerald-400", change: "-1.2%" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-500 mt-1">Cross-platform performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          {availableDays.map((d) => (
            <button key={d} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${days === d ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:text-gray-300"}`} onClick={() => setDays(d)}>
              {d}d
            </button>
          ))}
          <button className="btn-secondary p-2" onClick={() => setDays((p) => p)} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className="text-xl font-bold text-white">{kpi.value}</p>
            <p className={`text-xs ${kpi.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}>{kpi.change} vs prev</p>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Revenue & Spend Trend</h3>
            <span className="text-xs text-gray-500">Last {days} days</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="arevGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1a6dff" stopOpacity={0.3} /><stop offset="95%" stopColor="#1a6dff" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
                <Area type="monotone" dataKey="revenue" stroke="#1a6dff" fill="url(#arevGrad)" strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="spend" stroke="#f59e0b" fill="transparent" strokeWidth={2} name="Spend" strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue vs Spend by Platform</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
                <Bar dataKey="Revenue" fill="#1a6dff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spend" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Spend Distribution</h3>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={spendPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {spendPieData.map((_: any, i: number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Daily Performance</h3>
          <span className="text-xs text-gray-500">Last {days} days</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
              <Line type="monotone" dataKey="impressions" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Impressions" />
              <Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} dot={false} name="Clicks" />
              <Line type="monotone" dataKey="conversions" stroke="#f59e0b" strokeWidth={2} dot={false} name="Conversions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Platform Metrics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2">Platform</th>
                  <th className="text-right py-2">Spend</th>
                  <th className="text-right py-2">Revenue</th>
                  <th className="text-right py-2">ROAS</th>
                  <th className="text-right py-2">CTR</th>
                  <th className="text-right py-2">CPC</th>
                </tr>
              </thead>
              <tbody>
                {platforms.map((p: any, i: number) => (
                  <tr key={p.platform} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <span className="text-white">{p.platform}</span>
                    </td>
                    <td className="py-2 text-right text-gray-300">${(p.spend / 1000).toFixed(1)}K</td>
                    <td className="py-2 text-right text-green-400">${(p.revenue / 1000).toFixed(1)}K</td>
                    <td className="py-2 text-right text-n0va-400">{p.roas?.toFixed(2) || "0.00"}x</td>
                    <td className="py-2 text-right text-gray-300">{p.ctr?.toFixed(2) || "0.00"}%</td>
                    <td className="py-2 text-right text-gray-300">${p.cpc?.toFixed(2) || "0.00"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Budget Overview</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {budgets.length === 0 ? (
              <p className="text-gray-500 text-sm">No budget data available.</p>
            ) : (
              budgets.map((b: any) => (
                <div key={b.name} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white truncate">{b.name}</span>
                      <span className={`text-xs ${b.status === "active" ? "text-green-400" : b.status === "paused" ? "text-yellow-400" : "text-gray-500"}`}>{b.status}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div className="bg-n0va-600 h-1.5 rounded-full" style={{ width: `${b.budget > 0 ? (b.spent / b.budget) * 100 : 0}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                      <span>${(b.spent / 1000).toFixed(1)}K spent</span>
                      <span>${(b.remaining / 1000).toFixed(1)}K left</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-3">Campaign Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{overview?.totalCampaigns || 0}</p>
            <p className="text-xs text-gray-500">Total Campaigns</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{overview?.activeCampaigns || 0}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">${((overview?.totalBudget || 0) / 1000).toFixed(1)}K</p>
            <p className="text-xs text-gray-500">Total Budget</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">${((overview?.remaining || 0) / 1000).toFixed(1)}K</p>
            <p className="text-xs text-gray-500">Remaining</p>
          </div>
        </div>
      </div>
    </div>
  );
}
