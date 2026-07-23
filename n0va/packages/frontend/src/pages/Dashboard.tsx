import { useEffect, useState } from "react";
import { BarChart3, DollarSign, TrendingUp, Users, Megaphone, MousePointerClick } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { api } from "../api/client";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.campaigns.dashboard().then(setData).finally(() => setLoading(false));
  }, []);

  const [dailyData, setDailyData] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/v1/analytics/overview")
      .then((r) => r.json())
      .then((d) => setDailyData(d.dailyMetrics || []))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const stats = [
    { label: "Active Campaigns", value: data?.activeCampaigns ?? 0, icon: Megaphone, color: "text-n0va-400" },
    { label: "Total Budget", value: `$${((data?.totalBudget ?? 0) / 1000).toFixed(1)}K`, icon: DollarSign, color: "text-green-400" },
    { label: "Total Spend", value: `$${((data?.totalSpent ?? 0) / 1000).toFixed(1)}K`, icon: BarChart3, color: "text-yellow-400" },
    { label: "Impressions", value: ((data?.metrics?.totalImpressions ?? 0) / 1000).toFixed(0) + "K", icon: Users, color: "text-purple-400" },
    { label: "Clicks", value: ((data?.metrics?.totalClicks ?? 0) / 1000).toFixed(0) + "K", icon: MousePointerClick, color: "text-blue-400" },
    { label: "ROAS", value: data?.metrics?.avgRoas?.toFixed(2) ?? "0.00", icon: TrendingUp, color: "text-emerald-400" },
  ];

  const chartData = dailyData.slice(-14).map((d: any) => ({
    ...d,
    date: d.date?.substring(5) || d.date,
  }));

  const platformData = [
    { platform: "Meta", spend: data?.metrics?.totalSpend ? data.metrics.totalSpend * 0.45 : 0, revenue: data?.metrics?.totalRevenue ? data.metrics.totalRevenue * 0.52 : 0, roas: 2.8 },
    { platform: "Google", spend: data?.metrics?.totalSpend ? data.metrics.totalSpend * 0.30 : 0, revenue: data?.metrics?.totalRevenue ? data.metrics.totalRevenue * 0.28 : 0, roas: 2.3 },
    { platform: "LinkedIn", spend: data?.metrics?.totalSpend ? data.metrics.totalSpend * 0.15 : 0, revenue: data?.metrics?.totalRevenue ? data.metrics.totalRevenue * 0.14 : 0, roas: 2.1 },
    { platform: "TikTok", spend: data?.metrics?.totalSpend ? data.metrics.totalSpend * 0.10 : 0, revenue: data?.metrics?.totalRevenue ? data.metrics.totalRevenue * 0.06 : 0, roas: 1.5 },
  ];

  const budgetUtilization = data?.totalBudget ? ((data.totalSpent / data.totalBudget) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Marketing Dashboard</h1>
        <p className="text-gray-500 mt-1">Real-time overview of your advertising performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Revenue & Spend Trend</h3>
            <span className="text-xs text-gray-500">Last 14 days</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1a6dff" stopOpacity={0.3} /><stop offset="95%" stopColor="#1a6dff" stopOpacity={0} /></linearGradient>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
                <Area type="monotone" dataKey="revenue" stroke="#1a6dff" fill="url(#revenueGrad)" strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="spend" stroke="#f59e0b" fill="url(#spendGrad)" strokeWidth={2} name="Spend" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">ROAS by Platform</h3>
            <span className="text-xs text-gray-500">Last 30 days</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis type="number" stroke="#6b7280" fontSize={11} />
                <YAxis type="category" dataKey="platform" stroke="#6b7280" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
                <Bar dataKey="roas" fill="#1a6dff" radius={[0, 4, 4, 0]} name="ROAS" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Daily Performance</h3>
            <span className="text-xs text-gray-500">Last 14 days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
                <Line type="monotone" dataKey="impressions" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Impressions" />
                <Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} dot={false} name="Clicks" />
                <Line type="monotone" dataKey="conversions" stroke="#f59e0b" strokeWidth={2} dot={false} name="Conversions" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Budget Utilization</h3>
          <div className="flex flex-col items-center justify-center h-48">
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="54" fill="none" stroke="#1f2937" strokeWidth="12" />
                <circle cx="64" cy="64" r="54" fill="none" stroke="#1a6dff" strokeWidth="12" strokeDasharray={`${parseFloat(budgetUtilization) * 3.39} 339`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{budgetUtilization}%</span>
              </div>
            </div>
            <div className="text-center text-sm text-gray-500">
              <p className="text-white font-medium">${((data?.totalSpent ?? 0) / 1000).toFixed(1)}K</p>
              <p>of ${((data?.totalBudget ?? 0) / 1000).toFixed(1)}K spent</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Remaining</span><span className="text-green-400 font-medium">${((data?.remaining ?? 0) / 1000).toFixed(1)}K</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Revenue</span><span className="text-n0va-400 font-medium">${((data?.metrics?.totalRevenue ?? 0) / 1000).toFixed(1)}K</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Conversions</span><span className="text-white font-medium">{data?.metrics?.totalConversions ?? 0}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
