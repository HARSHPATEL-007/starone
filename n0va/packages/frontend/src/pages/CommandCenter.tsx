import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Minus, Bell, Sparkles, Shield, RefreshCw,
  Wallet, Users, Zap, AlertTriangle, CheckCircle2, Target, Wrench, Palette,
} from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard, SkeletonChart } from "../components/Skeleton";

const PLATFORM_COLORS: Record<string, string> = {
  meta: "bg-blue-500", google: "bg-amber-500", tiktok: "bg-cyan-400", linkedin: "bg-sky-600",
};

const READY_ACTIONS = [
  { key: "bidAdjustments", label: "Bid adjustments", icon: Zap, route: "/campaign-optimizer" },
  { key: "saturationMitigation", label: "Saturation mitigation", icon: Shield, route: "/campaign-saturation" },
  { key: "fixPlans", label: "Diagnostics fix plans", icon: Wrench, route: "/campaign-issues" },
  { key: "creativeRefresh", label: "Creative refresh", icon: Palette, route: "/creative-fatigue" },
  { key: "budgetRebalance", label: "Budget rebalance", icon: Wallet, route: "/budget-strategy" },
  { key: "goalFollowUp", label: "Goal follow-up", icon: Target, route: "/goals" },
];

function fmtMoney(n: number | undefined): string {
  const v = n || 0;
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${Math.round(v).toLocaleString()}`;
}

function roasColor(roas: number): string {
  return roas >= 3 ? "text-emerald-400" : roas >= 2 ? "text-amber-400" : "text-red-400";
}

function verdictStyles(v: string): string {
  if (v === "All clear") return "bg-green-500/10 text-green-400";
  if (v === "Fair") return "bg-amber-500/10 text-amber-400";
  return "bg-red-500/10 text-red-400";
}

function severityDot(severity: string): string {
  if (severity === "critical") return "bg-red-500";
  if (severity === "high") return "bg-orange-500";
  if (severity === "medium") return "bg-amber-400";
  return "bg-gray-500";
}

export default function CommandCenter() {
  const [summary, setSummary] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [crossPlatform, setCrossPlatform] = useState<any>(null);
  const [autopilot, setAutopilot] = useState<any>(null);
  const [audiences, setAudiences] = useState<any>(null);
  const [fraud, setFraud] = useState<any>(null);
  const [attribution, setAttribution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);
    Promise.all([
      api.adsMarketingModule.commandCenterSummary().catch(() => null),
      api.adsMarketingModule.dailyExecutionDashboard().catch(() => null),
      api.adsMarketingModule.crossPlatformPerformance().catch(() => null),
      api.adsMarketingModule.autopilotStatus().catch(() => null),
      api.adsMarketingModule.audienceSyncStatus().catch(() => null),
      api.adsMarketingModule.fraudProtectionStatus().catch(() => null),
      api.adsMarketingModule.attributionReport().catch(() => null),
    ])
      .then(([s, d, xp, ap, aus, fp, attr]) => {
        setSummary(unwrap(s)); setDashboard(unwrap(d)); setCrossPlatform(unwrap(xp)); setAutopilot(unwrap(ap));
        setAudiences(unwrap(aus)); setFraud(unwrap(fp)); setAttribution(unwrap(attr));
        setLastUpdated(new Date().toISOString());
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    function refresh() { loadData(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Command Center</h1><p className="text-gray-500 mt-1">Your only screen — morning dashboard, live platforms, one-click actions</p></div>
          <div className="animate-spin w-5 h-5 border-2 border-n0va-500 border-t-transparent rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><SkeletonChart /><SkeletonCard /></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><SkeletonChart /><SkeletonCard /></div>
      </div>
    );
  }

  const cards = summary?.cards;
  const ready = dashboard?.readyActions;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-gray-500 mt-1">Your only screen — morning dashboard, live platforms, one-click actions</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-xs text-gray-500 hidden md:inline">Updated {new Date(lastUpdated).toLocaleTimeString()}</span>}
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
            Auto (30s)
          </label>
          <button className="btn-secondary p-2" onClick={loadData} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {!cards && !dashboard && !crossPlatform && (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-300 font-medium">Command Center data unavailable</p>
              <p className="text-xs text-red-400/70">All data sources failed to load — check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={loadData}>Retry</button>
          </div>
        </div>
      )}

      {cards && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Today's ROAS</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white">{cards.roas.value}x</p>
            <p className={`text-xs mt-1 flex items-center gap-1 ${cards.roas.direction === "up" ? "text-green-400" : cards.roas.direction === "down" ? "text-red-400" : "text-gray-400"}`}>
              {cards.roas.direction === "up" ? <TrendingUp className="w-3 h-3" /> : cards.roas.direction === "down" ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {cards.roas.changePercent >= 0 ? "+" : ""}{cards.roas.changePercent}% vs previous period
            </p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Budget Pacing</span>
              <Wallet className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-3xl font-bold text-white">{cards.budgetPacing.percent}%</p>
            <div className="h-1.5 bg-gray-800 rounded-full mt-3 overflow-hidden">
              <div className={`h-full rounded-full ${cards.budgetPacing.percent >= 90 ? "bg-red-500" : cards.budgetPacing.percent >= 70 ? "bg-amber-400" : "bg-n0va-500"}`} style={{ width: `${cards.budgetPacing.percent}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">{fmtMoney(cards.budgetPacing.spentToday)} of {fmtMoney(cards.budgetPacing.dailyBudget)} daily budget</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Alerts</span>
              <Bell className={`w-4 h-4 ${cards.alerts.count > 0 ? "text-red-400" : "text-gray-500"}`} />
            </div>
            <p className={`text-3xl font-bold ${cards.alerts.count > 0 ? "text-red-400" : "text-white"}`}>{cards.alerts.count}</p>
            <div className="mt-2 space-y-1">
              {cards.alerts.top.map((a: any) => (
                <div key={a.id} className="flex items-center gap-1.5 text-xs text-gray-400 truncate">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDot(a.severity)}`} />
                  <span className="truncate">{a.title}</span>
                </div>
              ))}
              {cards.alerts.top.length === 0 && <p className="text-xs text-gray-600">No active alerts</p>}
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider">AI Suggestions</span>
              <Sparkles className="w-4 h-4 text-n0va-400" />
            </div>
            <p className="text-3xl font-bold text-white">{cards.aiSuggestions.count}</p>
            <div className="mt-2 space-y-1">
              {cards.aiSuggestions.top.map((s: any) => (
                <p key={s.title} className="text-xs text-gray-400 truncate">→ {s.action}</p>
              ))}
              {cards.aiSuggestions.top.length === 0 && <p className="text-xs text-gray-600">Nothing to do</p>}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {crossPlatform && (
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Cross-Platform Performance</h3>
              <span className="text-xs text-gray-500">{crossPlatform.totals.summary}</span>
            </div>
            <div className="space-y-3">
              {crossPlatform.platforms.map((p: any) => (
                <div key={p.platform} className="flex items-center gap-3">
                  <span className="w-16 text-sm text-gray-300 capitalize">{p.platform}</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${PLATFORM_COLORS[p.platform] || "bg-n0va-500"}`} style={{ width: `${Math.max(p.share, 1.5)}%` }} />
                  </div>
                  <span className="w-16 text-right text-sm text-white">{fmtMoney(p.spend)}</span>
                  <span className={`w-14 text-right text-sm font-medium ${roasColor(p.roas)}`}>{p.roas.toFixed(1)}x</span>
                  <span className="w-12 text-right text-xs text-gray-500">{p.share}%</span>
                  {p.trend === "up" ? <TrendingUp className="w-4 h-4 text-green-400" /> : p.trend === "down" ? <TrendingDown className="w-4 h-4 text-red-400" /> : <Minus className="w-4 h-4 text-gray-500" />}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-gray-500">Total spend <span className="text-white font-medium">{fmtMoney(crossPlatform.totals.spend)}</span></span>
              <span className="text-gray-500">Revenue <span className="text-n0va-400 font-medium">{fmtMoney(crossPlatform.totals.revenue)}</span></span>
              <span className="text-gray-500">ROAS <span className="text-emerald-400 font-medium">{crossPlatform.totals.roas.toFixed(2)}x</span></span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {dashboard && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Morning Report</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${verdictStyles(dashboard.healthVerdict)}`}>{dashboard.healthVerdict}</span>
              </div>
              <p className="text-sm text-gray-300">{dashboard.morningReport}</p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-amber-400">{dashboard.atRiskCampaigns}</p>
                  <p className="text-xs text-gray-500">Campaigns at risk</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-green-400">{dashboard.actionsReady}</p>
                  <p className="text-xs text-gray-500">Actions ready (1-click)</p>
                </div>
              </div>
              {dashboard.topActions?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-800 space-y-1.5">
                  {dashboard.topActions.map((t: any) => (
                    <div key={t.action} className="flex items-center gap-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${t.priority === "high" ? "bg-red-500/10 text-red-400" : t.priority === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-gray-700 text-gray-400"}`}>{t.priority}</span>
                      <span className="text-gray-300 flex-1">{t.action}</span>
                      <span className="text-gray-500">{t.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {fraud && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Silent Guardian</h3>
                <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-[10px] font-semibold uppercase">Active</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">{fraud.summary}</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Monitored placements</span><span className="text-white font-medium">{fraud.monitoredPlacements}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Spend protected</span><span className="text-green-400 font-medium">{fmtMoney(fraud.protectedSpend)}</span></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {fraud.capabilities?.slice(0, 3).map((c: any) => (
                  <span key={c.name} className="px-2 py-0.5 bg-gray-800 rounded text-[11px] text-gray-400">{c.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {dashboard && (
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Ready Actions</h3>
              <span className="text-xs text-gray-500">One-click execution layer</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {READY_ACTIONS.map((ra) => {
                const a = ready?.[ra.key];
                return (
                  <div key={ra.key} className={`rounded-lg border p-3 ${a?.count > 0 ? "border-n0va-600/30 bg-n0va-600/5" : "border-gray-800 bg-gray-800/30"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <ra.icon className={`w-4 h-4 ${a?.count > 0 ? "text-n0va-400" : "text-gray-600"}`} />
                      <span className="text-xs text-gray-400 truncate">{ra.label}</span>
                    </div>
                    <p className={`text-xl font-bold ${a?.count > 0 ? "text-white" : "text-gray-600"}`}>{a?.count ?? 0}</p>
                    <p className="text-[11px] text-gray-600">{a?.campaigns ?? 0} campaigns</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {autopilot && (
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Budget Autopilot</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${autopilot.enabled ? "bg-green-500/10 text-green-400" : "bg-gray-800 text-gray-500"}`}>{autopilot.enabled ? "On" : "Off"}</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">{autopilot.summary}</p>
            <div className="space-y-3">
              {autopilot.allocation?.map((a: any) => (
                <div key={a.platform}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 capitalize">{a.platform}</span>
                    <span className="text-gray-400">{a.percent}% · {fmtMoney(a.monthly)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${PLATFORM_COLORS[a.platform] || "bg-n0va-500"}`} style={{ width: `${a.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Cycles run</span><span className="text-white font-medium">{autopilot.cyclesRun}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Last cycle</span><span className="text-gray-300">{autopilot.lastCycleAt ? new Date(autopilot.lastCycleAt).toLocaleString() : "Never"}</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {audiences && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Audience Sync Status</h3>
              <span className="text-xs text-gray-500">Set it and forget it</span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-n0va-400" />
                <span className="text-gray-500">Fully synced</span>
                <span className="text-green-400 font-medium">{audiences.totals.fullySynced}/{audiences.totals.total}</span>
              </div>
              <span className="text-xs text-gray-500 flex-1 text-right">{audiences.totals.summary}</span>
            </div>
            <div className="space-y-2">
              {audiences.audiences?.slice(0, 5).map((a: any) => (
                <div key={a.audienceId} className="flex items-center gap-3 py-1.5 border-b border-gray-800/50 last:border-0">
                  <span className="text-sm text-gray-300 flex-1 truncate">{a.name}</span>
                  <span className="text-xs text-gray-500">{a.estimatedSize?.toLocaleString()} · {a.platforms?.join(", ")}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${a.qualityScore >= 70 ? "bg-green-500/10 text-green-400" : a.qualityScore >= 40 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>Q{a.qualityScore}</span>
                  {a.autoStatus && <span className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] text-gray-400">{a.autoStatus}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {attribution && (
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Attribution — One Page</h3>
              <span className="text-xs text-gray-500">{attribution.model.replace(/_/g, " ")}</span>
            </div>
            <p className="text-sm text-gray-300">{attribution.executiveSummary}</p>
            <div className="mt-3">
              {attribution.topPaths?.map((t: any) => (
                <div key={t.path} className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-gray-800/50 last:border-0">
                  <span className="text-gray-400 truncate">{t.path}</span>
                  <span className="text-white shrink-0">{t.conversions} conv · {fmtMoney(t.value)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {attribution.plainLanguage?.map((p: any) => (
                <p key={p.metric} className="text-xs text-gray-400">
                  <span className="text-n0va-400 font-medium">{p.metric}:</span> {p.explanation}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
