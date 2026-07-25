import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { BarChart3, DollarSign, TrendingUp, Users, Megaphone, MousePointerClick, Shield, Bot, Target, Bell, Activity, RefreshCw, Download, ExternalLink, Clock } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";
import { useFraudAlerts, useBudgetAlerts, useTenantActivity } from "../hooks/useSocket";
import { useCsvExport } from "../hooks/useCsvExport";
import { SkeletonCard, SkeletonChart } from "../components/Skeleton";

const entityRoutes: Record<string, string> = {
  campaign: "/campaigns", creative: "/creatives", audience: "/audiences",
  agent: "/agents", recipe: "/recipes",
};

function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { exportToCsv } = useCsvExport();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [fraudHealth, setFraudHealth] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [attribution, setAttribution] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [days, setDays] = useState("30");
  const [crossPlatformData, setCrossPlatformData] = useState<any>(null);
  const [prevPeriodData, setPrevPeriodData] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const liveActivities = useTenantActivity("tenant_001");

  const liveFraudAlerts = useFraudAlerts();
  const liveBudgetAlerts = useBudgetAlerts();
  const liveAlertCount = liveFraudAlerts.length + liveBudgetAlerts.length;

  const loadData = useCallback(async () => {
    setLoading(true);
    Promise.all([
      api.campaigns.dashboard(),
      api.analytics.overview(days).catch(() => ({ dailyMetrics: [] })),
      api.fraud.health().catch(() => null),
      api.agents.list().catch(() => []),
      api.attribution.models().catch(() => null),
      api.analytics.crossPlatform(days).catch(() => ({ platforms: [] })),
      api.analytics.overview("60").catch(() => ({ dailyMetrics: [] })),
      api.campaigns.list().catch(() => []),
    ])
      .then(([d, analytics, fraud, agentList, attr, crossPlatform, prevAnalytics, campaignList]) => {
        setData(d); setDailyData(analytics.dailyMetrics || []); setFraudHealth(fraud); setAgents(agentList); setAttribution(attr);
        setCrossPlatformData(crossPlatform);
        setPrevPeriodData(prevAnalytics);
        setCampaigns(Array.isArray(campaignList) ? campaignList : campaignList?.campaigns || []);
      })
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => { loadData(); api.activity.list().then((r) => setActivities(r || [])).catch(() => {}); }, [loadData]);

  useEffect(() => {
    if (liveActivities.length > 0) {
      setActivities((prev) => {
        const existingIds = new Set(prev.map((a: any) => a._id));
        const newOnes = liveActivities.filter((a: any) => !existingIds.has(a._id));
        if (newOnes.length === 0) return prev;
        return [...newOnes, ...prev].slice(0, 200);
      });
    }
  }, [liveActivities]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const prevMetrics = prevPeriodData?.dailyMetrics?.length
    ? (() => {
        const dm = prevPeriodData.dailyMetrics;
        const half = Math.floor(dm.length / 2);
        const prev = dm.slice(0, half);
        const curr = dm.slice(half);
        const sum = (arr: any[], key: string) => arr.reduce((s: number, d: any) => s + (d[key] || 0), 0);
        const prevSpend = sum(prev, "spend");
        const currSpend = sum(curr, "spend");
        const prevRev = sum(prev, "revenue");
        const currRev = sum(curr, "revenue");
        const pct = (c: number, p: number) => p > 0 ? ((c - p) / p) * 100 : 0;
        return {
          spend: pct(currSpend, prevSpend),
          impressions: pct(sum(curr, "impressions"), sum(prev, "impressions")),
          clicks: pct(sum(curr, "clicks"), sum(prev, "clicks")),
          conversions: pct(sum(curr, "conversions"), sum(prev, "conversions")),
          roas: pct(currSpend > 0 ? currRev / currSpend : 0, prevSpend > 0 ? prevRev / prevSpend : 0),
        };
      })()
    : null;

  const topCampaigns = [...campaigns]
    .sort((a: any, b: any) => (b.spend || b.budget || 0) - (a.spend || a.budget || 0))
    .slice(0, 5);

  const stats = [
    { label: "Active Campaigns", value: data?.activeCampaigns ?? 0, icon: Megaphone, color: "text-n0va-400" },
    { label: "Total Budget", value: `$${((data?.totalBudget ?? 0) / 1000).toFixed(1)}K`, icon: DollarSign, color: "text-green-400" },
    { label: "Total Spend", value: `$${((data?.totalSpent ?? 0) / 1000).toFixed(1)}K`, icon: BarChart3, color: "text-yellow-400", change: prevMetrics?.spend },
    { label: "Impressions", value: ((data?.metrics?.totalImpressions ?? 0) / 1000).toFixed(0) + "K", icon: Users, color: "text-purple-400", change: prevMetrics?.impressions },
    { label: "Clicks", value: ((data?.metrics?.totalClicks ?? 0) / 1000).toFixed(0) + "K", icon: MousePointerClick, color: "text-blue-400", change: prevMetrics?.clicks },
    { label: "ROAS", value: data?.metrics?.avgRoas?.toFixed(2) ?? "0.00", icon: TrendingUp, color: "text-emerald-400", change: prevMetrics?.roas },
  ];

  const chartData = dailyData.slice(-14).map((d: any) => ({ ...d, date: d.date?.substring(5) || d.date }));

  const platformData = crossPlatformData?.platforms?.length
    ? crossPlatformData.platforms.map((p: any) => ({
        platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
        spend: p.spend || 0,
        revenue: p.revenue || 0,
        roas: p.roas || 0,
      }))
    : [
        { platform: "Meta", spend: data?.metrics?.totalSpend ? data.metrics.totalSpend * 0.45 : 0, revenue: data?.metrics?.totalRevenue ? data.metrics.totalRevenue * 0.52 : 0, roas: 2.8 },
        { platform: "Google", spend: data?.metrics?.totalSpend ? data.metrics.totalSpend * 0.30 : 0, revenue: data?.metrics?.totalRevenue ? data.metrics.totalRevenue * 0.28 : 0, roas: 2.3 },
        { platform: "LinkedIn", spend: data?.metrics?.totalSpend ? data.metrics.totalSpend * 0.15 : 0, revenue: data?.metrics?.totalRevenue ? data.metrics.totalRevenue * 0.14 : 0, roas: 2.1 },
        { platform: "TikTok", spend: data?.metrics?.totalSpend ? data.metrics.totalSpend * 0.10 : 0, revenue: data?.metrics?.totalRevenue ? data.metrics.totalRevenue * 0.06 : 0, roas: 1.5 },
      ];

  const budgetUtilization = data?.totalBudget ? ((data.totalSpent / data.totalBudget) * 100).toFixed(1) : "0";
  const runningAgents = agents.filter((a: any) => a.status === "running").length;
  const activeFlags = fraudHealth?.activeFlags || 0;
  const criticalFlags = fraudHealth?.criticalFlags || 0;

  const agentData = attribution?.models?.data_driven?.platformBreakdown
    ? Object.entries(attribution.models.data_driven.platformBreakdown).map(([platform, p]: [string, any]) => ({ platform, weight: parseFloat((p.weight * 100).toFixed(1)) }))
    : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Marketing Dashboard</h1><p className="text-gray-500 mt-1">Real-time overview of your advertising performance</p></div>
          <div className="animate-spin w-5 h-5 border-2 border-n0va-500 border-t-transparent rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i + 6} />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><SkeletonChart /><SkeletonChart /></div>
        <SkeletonChart />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketing Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time overview of your advertising performance</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-800 rounded-lg p-0.5">
            {["7", "30", "90"].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${days === d ? "bg-n0va-600 text-white" : "text-gray-400 hover:text-white"}`}
              >{d}d</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
            Auto (30s)
          </label>
          <button className="btn-ghost text-xs flex items-center gap-1" onClick={() => { exportToCsv(chartData.map((d: any) => ({ Date: d.date, Revenue: d.revenue || 0, Spend: d.spend || 0, Impressions: d.impressions || 0, Clicks: d.clicks || 0, Conversions: d.conversions || 0 })), "dashboard_daily"); }}><Download className="w-3 h-3" /> Export</button>
          <button className="btn-secondary p-2" onClick={loadData} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 rounded-lg text-xs text-gray-500">
            <kbd className="text-gray-400 bg-gray-700 px-1 rounded">Ctrl</kbd><span>+</span><kbd className="text-gray-400 bg-gray-700 px-1 rounded">K</kbd><span className="ml-1">Search</span>
          </div>
          {liveAlertCount > 0 && (
            <button onClick={() => navigate("/notifications")} className="relative">
              <Bell className="w-5 h-5 text-yellow-400" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">{liveAlertCount}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            {(stat as any).change !== undefined && (
              <p className={`text-xs mt-1 ${(stat as any).change >= 0 ? "text-green-400" : "text-red-400"}`}>
                {(stat as any).change >= 0 ? "+" : ""}{(stat as any).change.toFixed(1)}%
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card cursor-pointer hover:border-n0va-600/30" onClick={() => navigate("/agents")}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">AI Agents</span>
            <Bot className="w-4 h-4 text-n0va-400" />
          </div>
          <p className="text-2xl font-bold text-white">{runningAgents}/{agents.length}</p>
          <p className="text-xs text-green-400">{runningAgents > 0 ? `${runningAgents} active` : "No agents running"}</p>
        </div>
        <div className="card cursor-pointer hover:border-n0va-600/30" onClick={() => navigate("/war-room")}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Fraud Alerts</span>
            <Shield className={`w-4 h-4 ${criticalFlags > 0 ? "text-red-400" : "text-green-400"}`} />
          </div>
          <p className={`text-2xl font-bold ${criticalFlags > 0 ? "text-red-400" : "text-white"}`}>{activeFlags}</p>
          <p className="text-xs text-gray-500">{criticalFlags > 0 ? `${criticalFlags} critical` : "All clear"}</p>
        </div>
        <div className="card cursor-pointer hover:border-n0va-600/30" onClick={() => navigate("/war-room")}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Optimal Strategy</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">Balanced</p>
          <p className="text-xs text-gray-500">30% max shift per campaign</p>
        </div>
        <div className="card cursor-pointer hover:border-n0va-600/30" onClick={() => navigate("/analytics")}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Attribution</span>
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">Data-Driven</p>
          <p className="text-xs text-gray-500">{attribution?.totalPaths || 50} conversion paths</p>
        </div>
      </div>

      {topCampaigns.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Top Campaigns by Spend</h3>
            <Link to="/campaigns" className="text-xs text-n0va-400 hover:text-n0va-300">View All</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {topCampaigns.map((c: any) => (
              <Link
                key={c._id}
                to={`/campaigns/${c._id}`}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-n0va-500 shrink-0" />
                {c.name || c._id}
                <span className="text-gray-500">${((c.spend || c.budget || 0) / 1000).toFixed(1)}K</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {liveAlertCount > 0 && (
        <div className="card border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Activity className="w-5 h-5 text-yellow-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-yellow-300 font-medium">{liveAlertCount} live alert{liveAlertCount !== 1 ? "s" : ""} detected</p>
              <p className="text-xs text-yellow-400/70">{liveFraudAlerts.length > 0 && `${liveFraudAlerts.length} fraud · `}{liveBudgetAlerts.length > 0 && `${liveBudgetAlerts.length} budget`}</p>
            </div>
            <button className="btn-secondary text-xs" onClick={() => navigate("/notifications")}>View</button>
          </div>
        </div>
      )}

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
            <span className="text-xs text-gray-500">Last {days} days</span>
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
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl font-bold text-white">{budgetUtilization}%</span></div>
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

      {agentData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Attribution Weight by Platform (Data-Driven)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="platform" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
                <Bar dataKey="weight" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Attribution Weight %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Activity Widget */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-n0va-400" />
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          </div>
          <Link to="/activity" className="text-xs text-n0va-400 hover:text-n0va-300">View All</Link>
        </div>
        <div className="space-y-1">
          {activities.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No recent activity</p>
          ) : (
            activities.slice(0, 8).map((a: any) => {
              const route = entityRoutes[a.entityType];
              return (
                <div key={a._id} className="flex items-center gap-3 py-2 border-b border-gray-800/50 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-n0va-500 shrink-0" />
                  <span className="text-xs text-gray-500 min-w-[60px]">{getTimeAgo(a.timestamp)}</span>
                  <span className={`text-xs font-medium capitalize px-1.5 py-0.5 rounded ${a.action === "created" ? "text-green-400" : a.action === "launched" ? "text-n0va-400" : a.action === "paused" ? "text-yellow-400" : "text-gray-400"}`}>{a.action}</span>
                  {route ? (
                    <Link to={`${route}/${a.entityId}`} className="text-xs text-gray-300 hover:text-n0va-400 truncate flex items-center gap-1">
                      {a.entityName || a.entityId} <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-300 truncate">{a.entityName || a.entityType}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
