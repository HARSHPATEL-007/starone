import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Bot, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Activity, DollarSign, Target, BarChart3, Calendar, Clock, Play, Pause, Zap, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

const COLORS = ["#22c55e", "#eab308", "#ef4444", "#3b82f6", "#a855f7", "#06b6d4"];

export default function AutonomousCampaignManager() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [portfolio, setPortfolio] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any>(null);
  const [scheduledChanges, setScheduledChanges] = useState<any[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [executing, setExecuting] = useState(false);
  const [forecast, setForecast] = useState<any>(null);
  const [healthTrend, setHealthTrend] = useState<any>(null);
  const [budgetAlloc, setBudgetAlloc] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.autonomousCampaignManager.portfolio().catch(() => null),
      api.autonomousCampaignManager.executiveReport().catch(() => null),
      api.autonomousCampaignManager.actionItems().catch(() => null),
      api.autonomousCampaignManager.budgetAllocation().catch(() => null),
    ]).then(([p, r, a, b]) => {
      if (p) setPortfolio(p);
      if (r) setReport(r);
      if (a) setActionItems(a.items || a);
      if (b) setBudgetAlloc(b);
      setLoading(false);
    });
  }, []);

  function loadScheduled() {
    api.autonomousCampaignManager.scheduledChanges().then(setScheduledChanges).catch(() => {});
  }

  function loadAnomalies() {
    if (!campaignId) { addToast("warning", "Enter a campaign ID first"); return; }
    api.autonomousCampaignManager.anomalies(campaignId).then(setAnomalies).catch(() => addToast("error", "Failed to load anomalies"));
  }

  function loadForecast() {
    if (!campaignId) { addToast("warning", "Enter a campaign ID first"); return; }
    api.autonomousCampaignManager.forecast(campaignId, 30).then(setForecast).catch(() => addToast("error", "Failed to load forecast"));
  }

  function loadHealthTrend() {
    if (!campaignId) { addToast("warning", "Enter a campaign ID first"); return; }
    api.autonomousCampaignManager.healthTrend(campaignId).then(setHealthTrend).catch(() => addToast("error", "Failed to load health trend"));
  }

  function handleOptimize() {
    if (!campaignId) { addToast("warning", "Enter a campaign ID first"); return; }
    setExecuting(true);
    api.autonomousCampaignManager.optimize(campaignId).then(() => { addToast("success", "Optimization complete"); setExecuting(false); }).catch(() => { addToast("error", "Optimization failed"); setExecuting(false); });
  }

  function handleAutoPause() {
    setExecuting(true);
    api.autonomousCampaignManager.autoPause().then((r) => { addToast("success", `Auto-pause complete: ${r.paused?.length || 0} paused`); setExecuting(false); }).catch(() => { addToast("error", "Auto-pause failed"); setExecuting(false); });
  }

  function handleExecuteScheduled() {
    setExecuting(true);
    api.autonomousCampaignManager.executeScheduled().then((r) => { addToast("success", `Executed ${r.executed?.length || 0} changes`); loadScheduled(); setExecuting(false); }).catch(() => { addToast("error", "Execution failed"); setExecuting(false); });
  }

  function handleClearActions() {
    api.autonomousCampaignManager.actionItemsClear().then(() => { setActionItems([]); addToast("success", "Action items cleared"); }).catch(() => {});
  }

  const tabs = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "optimize", label: "Optimize", icon: Zap },
    { key: "anomalies", label: "Anomalies", icon: AlertTriangle },
    { key: "schedule", label: "Schedule", icon: Calendar },
    { key: "forecast", label: "Forecast", icon: TrendingUp },
    { key: "health", label: "Health Trend", icon: Activity },
  ];

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="h-8 bg-gray-800 rounded w-64 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-800 rounded animate-pulse" />)}
      </div>
      <div className="h-64 bg-gray-800 rounded animate-pulse" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-n0va-400" />
          <h1 className="text-2xl font-bold text-white">Autonomous Campaign Manager</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleAutoPause} disabled={executing} className="btn-secondary text-sm flex items-center gap-2">
            <Pause className="w-4 h-4" /> Auto-Pause
          </button>
          <button onClick={() => window.location.reload()} className="btn-ghost text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/30" : "text-gray-400 hover:text-gray-200"}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={campaignId} onChange={e => setCampaignId(e.target.value)} placeholder="Campaign ID (for actions)" className="input flex-1 max-w-md" />
      </div>

      {activeTab === "overview" && (
        <>
          {portfolio && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><Target className="w-4 h-4" /> Campaigns</div>
                  <p className="text-2xl font-bold text-white">{portfolio.totalCampaigns || portfolio.activeCampaigns || 0}</p>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><DollarSign className="w-4 h-4" /> Total Spend</div>
                  <p className="text-2xl font-bold text-white">${(portfolio.totalSpend || 0).toLocaleString()}</p>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><TrendingUp className="w-4 h-4" /> Total Revenue</div>
                  <p className="text-2xl font-bold text-green-400">${(portfolio.totalRevenue || 0).toLocaleString()}</p>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><BarChart3 className="w-4 h-4" /> Avg ROAS</div>
                  <p className="text-2xl font-bold text-n0va-400">{(portfolio.avgROAS || portfolio.overallROAS || 0).toFixed(2)}x</p>
                </div>
              </div>

              {portfolio.analyses && portfolio.analyses.length > 0 && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Campaign Performance</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={portfolio.analyses.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="campaignName" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }} />
                      <Bar dataKey="metrics.roas" fill="#6366f1" name="ROAS" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {report && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Executive Report</h3>
              <div className="space-y-2 text-sm text-gray-400">
                {Object.entries(report).filter(([k]) => !k.startsWith("_")).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize">{key.replace(/_/g, " ")}</span>
                    <span className="text-gray-200 font-medium">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {budgetAlloc && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Budget Allocation</h3>
              {budgetAlloc.allocations ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={budgetAlloc.allocations} dataKey="allocatedBudget" nameKey="campaignName" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {budgetAlloc.allocations.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-500 text-sm">{JSON.stringify(budgetAlloc)}</p>}
            </div>
          )}

          {actionItems.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-300">Action Items ({actionItems.length})</h3>
                <button onClick={handleClearActions} className="text-xs text-gray-500 hover:text-red-400">Clear All</button>
              </div>
              <div className="space-y-2">
                {actionItems.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                    <div className={`p-1.5 rounded-full ${item.priority === "high" || item.severity === "critical" ? "bg-red-500/20 text-red-400" : item.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"}`}>
                      <AlertTriangle className="w-3 h-3" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-200">{item.title || item.message || item.action}</p>
                      {item.campaignName && <p className="text-xs text-gray-500 mt-0.5">{item.campaignName}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "optimize" && (
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">Optimization Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={handleOptimize} disabled={executing || !campaignId} className="p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors text-left">
              <div className="flex items-center gap-2 text-n0va-400 mb-2"><Zap className="w-4 h-4" /> Optimize Campaign</div>
              <p className="text-xs text-gray-500">Run optimization algorithms on the selected campaign</p>
            </button>
            <button onClick={handleAutoPause} disabled={executing} className="p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors text-left">
              <div className="flex items-center gap-2 text-yellow-400 mb-2"><Pause className="w-4 h-4" /> Auto-Pause Underperformers</div>
              <p className="text-xs text-gray-500">Automatically pause campaigns below performance threshold</p>
            </button>
            <button onClick={handleExecuteScheduled} disabled={executing} className="p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors text-left">
              <div className="flex items-center gap-2 text-green-400 mb-2"><Play className="w-4 h-4" /> Execute Scheduled Changes</div>
              <p className="text-xs text-gray-500">Apply all pending scheduled changes</p>
            </button>
          </div>
          {executing && <p className="text-sm text-n0va-400 animate-pulse">Executing...</p>}
        </div>
      )}

      {activeTab === "anomalies" && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={loadAnomalies} className="btn-primary text-sm">Detect Anomalies</button>
          </div>
          {anomalies && (
            <div>
              <p className="text-sm text-gray-400 mb-3">Anomalies for {campaignId}</p>
              {anomalies.anomalies?.length > 0 ? anomalies.anomalies.map((a: any, i: number) => (
                <div key={i} className="p-3 bg-gray-800 rounded-lg mb-2 flex items-start gap-3">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${a.severity === "critical" ? "text-red-400" : "text-yellow-400"}`} />
                  <div>
                    <p className="text-sm text-gray-200">{a.message || a.type || a.metric}</p>
                    <p className="text-xs text-gray-500">{a.date || a.timestamp || ""}</p>
                  </div>
                </div>
              )) : <p className="text-sm text-gray-500">No anomalies detected</p>}
            </div>
          )}
        </div>
      )}

      {activeTab === "schedule" && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">Scheduled Changes</h3>
            <button onClick={loadScheduled} className="btn-ghost text-xs">Refresh</button>
          </div>
          {scheduledChanges.length > 0 ? (
            <div className="space-y-2">
              {scheduledChanges.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                  <Clock className="w-4 h-4 text-n0va-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-200">{s.type || s.action} — {s.campaignName || s.campaignId}</p>
                    <p className="text-xs text-gray-500">{s.scheduledDate ? new Date(s.scheduledDate).toLocaleString() : ""} {s.rationale ? `· ${s.rationale}` : ""}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : s.status === "executed" ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400"}`}>{s.status || "pending"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No scheduled changes. Load campaign data to create schedules.</p>
          )}
          <button onClick={handleExecuteScheduled} disabled={executing || scheduledChanges.length === 0} className="btn-primary text-sm flex items-center gap-2">
            <Play className="w-4 h-4" /> Execute All Pending
          </button>
        </div>
      )}

      {activeTab === "forecast" && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={loadForecast} className="btn-primary text-sm">Load Forecast (30d)</button>
          </div>
          {forecast && (
            <div>
              <p className="text-sm text-gray-400 mb-3">Forecast for {campaignId}</p>
              {forecast.predictions?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={forecast.predictions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
                    <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} name="Predicted" />
                    <Line type="monotone" dataKey="upper" stroke="#22c55e" strokeWidth={1} dot={false} strokeDasharray="4 4" name="Upper" />
                    <Line type="monotone" dataKey="lower" stroke="#ef4444" strokeWidth={1} dot={false} strokeDasharray="4 4" name="Lower" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-gray-500">{JSON.stringify(forecast).slice(0, 200)}</p>}
            </div>
          )}
        </div>
      )}

      {activeTab === "health" && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={loadHealthTrend} className="btn-primary text-sm">Load Health Trend</button>
          </div>
          {healthTrend && (
            <div>
              <p className="text-sm text-gray-400 mb-3">Health Trend for {campaignId}</p>
              {healthTrend.trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={healthTrend.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
                    <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={false} name="Health Score" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-gray-500">{JSON.stringify(healthTrend).slice(0, 200)}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
