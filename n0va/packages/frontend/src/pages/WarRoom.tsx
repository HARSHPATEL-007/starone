import { useEffect, useState } from "react";
import { Shield, AlertTriangle, DollarSign, RefreshCw, Bot, Play, Pause, TrendingUp, Target, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { api } from "../api/client";

interface FraudSummary {
  totalFlags: number;
  activeFlags: number;
  autoPaused: number;
  criticalFlags: number;
  highFlags: number;
  mediumFlags: number;
  lowFlags: number;
  topCategories: { category: string; count: number }[];
  riskByPlatform: Record<string, { avgIvt: number; avgViewability: number; avgBrandSafety: number; overallRisk: number }>;
}

export default function WarRoom() {
  const [fraudHealth, setFraudHealth] = useState<FraudSummary | null>(null);
  const [activeTab, setActiveTab] = useState<"fraud" | "budget" | "creative" | "alerts">("fraud");
  const [loading, setLoading] = useState(true);
  const [optimizationPlans, setOptimizationPlans] = useState<any>(null);
  const [creativeAnalysis, setCreativeAnalysis] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [fraud, budget, creative, sim] = await Promise.all([
        api.fraud.health().catch(() => null),
        api.optimizer.budgetMock().catch(() => null),
        api.optimizer.creativeMock().catch(() => null),
        api.fraud.simulate().catch(() => null),
      ]);
      setFraudHealth(fraud);
      setOptimizationPlans(budget);
      setCreativeAnalysis(creative);
      const generatedAlerts = sim?.placements?.filter((p: any) => p.overallRisk > 60).map((p: any) => ({
        id: p.placementId,
        type: "fraud",
        message: `High risk placement: ${p.placementId} (${p.overallRisk.toFixed(0)}%)`,
        severity: p.overallRisk > 80 ? "critical" : "high",
        timestamp: new Date().toISOString(),
      })) || [];
      setAlerts(generatedAlerts);
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulateFraud() {
    const res = await api.fraud.simulate();
    setFraudHealth(res.summary);
    const newAlerts = res.placements?.filter((p: any) => p.overallRisk > 60).map((p: any) => ({
      id: p.placementId + Date.now(),
      type: "fraud",
      message: `Risk: ${p.placementId} (${p.overallRisk.toFixed(0)}%)`,
      severity: p.overallRisk > 80 ? "critical" : "high",
      timestamp: new Date().toISOString(),
    })) || [];
    setAlerts((prev) => [...newAlerts, ...prev].slice(0, 20));
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between"><div className="w-48 h-7 bg-gray-800 rounded" /><div className="w-32 h-9 bg-gray-800 rounded" /></div>
        <div className="flex gap-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="w-28 h-9 bg-gray-800 rounded" />)}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="card p-4"><div className="w-12 h-7 bg-gray-800 rounded mx-auto mb-2" /><div className="w-16 h-3 bg-gray-800 rounded mx-auto" /></div>)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="card p-6"><div className="w-32 h-5 bg-gray-800 rounded mb-4" /><div className="h-64 bg-gray-800 rounded" /></div><div className="card p-6"><div className="w-36 h-5 bg-gray-800 rounded mb-4" /><div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-800 rounded" />)}</div></div></div>
      </div>
    );
  }

  const tabs = [
    { id: "fraud" as const, label: "Fraud Detection", icon: Shield },
    { id: "budget" as const, label: "Budget Optimization", icon: DollarSign },
    { id: "creative" as const, label: "Creative Fatigue", icon: Eye },
    { id: "alerts" as const, label: "Live Alerts", icon: AlertTriangle },
  ];

  const platformRiskData = fraudHealth?.riskByPlatform
    ? Object.entries(fraudHealth.riskByPlatform).map(([platform, data]) => ({
        platform,
        ivt: parseFloat(data.avgIvt.toFixed(1)),
        viewability: parseFloat(data.avgViewability.toFixed(1)),
        brandSafety: parseFloat(data.avgBrandSafety.toFixed(1)),
        overall: parseFloat(data.overallRisk.toFixed(1)),
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketing War Room</h1>
          <p className="text-gray-500 mt-1">Real-time monitoring and autonomous remediation</p>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={handleSimulateFraud}>
          <RefreshCw className="w-4 h-4" /> Simulate Scan
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-800 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/30" : "text-gray-400 hover:text-gray-200"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === "alerts" && alerts.length > 0 && (
              <span className="badge bg-red-900 text-red-300 text-xs">{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "fraud" && (
        <div className="space-y-6">
          {fraudHealth && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="card text-center"><p className="text-2xl font-bold text-white">{fraudHealth.totalFlags}</p><p className="text-xs text-gray-500">Total Flags</p></div>
              <div className="card text-center"><p className="text-2xl font-bold text-yellow-400">{fraudHealth.activeFlags}</p><p className="text-xs text-gray-500">Active</p></div>
              <div className="card text-center"><p className="text-2xl font-bold text-red-400">{fraudHealth.criticalFlags}</p><p className="text-xs text-gray-500">Critical</p></div>
              <div className="card text-center"><p className="text-2xl font-bold text-orange-400">{fraudHealth.highFlags}</p><p className="text-xs text-gray-500">High</p></div>
              <div className="card text-center"><p className="text-2xl font-bold text-green-400">{fraudHealth.autoPaused}</p><p className="text-xs text-gray-500">Auto-Paused</p></div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Risk by Platform</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformRiskData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="platform" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
                    <Bar dataKey="ivt" fill="#ef4444" radius={[4, 4, 0, 0]} name="IVT %" />
                    <Bar dataKey="overall" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Overall Risk" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Top Fraud Categories</h3>
              <div className="space-y-3">
                {fraudHealth?.topCategories?.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <span className="text-sm text-gray-300 capitalize">{cat.category.replace(/_/g, " ")}</span>
                    <span className="text-white font-bold">{cat.count}</span>
                  </div>
                ))}
                {(!fraudHealth?.topCategories || fraudHealth.topCategories.length === 0) && (
                  <p className="text-gray-500 text-sm">No fraud categories recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "budget" && (
        <div className="space-y-6">
          {optimizationPlans && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["conservative", "balanced", "aggressive"] as const).map((strategy) => {
                const plan = optimizationPlans[strategy];
                return (
                  <div key={strategy} className={`card ${strategy === "balanced" ? "border-n0va-600/30" : ""}`}>
                    <h3 className={`text-lg font-semibold mb-2 capitalize ${strategy === "aggressive" ? "text-red-400" : strategy === "balanced" ? "text-n0va-400" : "text-green-400"}`}>
                      {strategy}
                    </h3>
                    <p className="text-2xl font-bold text-white mb-2">
                      ${(plan.totalRecommendedBudget / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      {plan.totalChangePercent >= 0 ? "+" : ""}{plan.totalChangePercent.toFixed(1)}% vs current
                    </p>
                    <p className="text-sm text-gray-400">
                      Expected ROAS: <span className="text-white font-medium">{plan.expectedPortfolioRoas.toFixed(2)}x</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{plan.recommendations.length} recommendations</p>
                  </div>
                );
              })}
            </div>
          )}

          {optimizationPlans?.balanced?.recommendations && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Budget Recommendations (Balanced)</h3>
              <div className="space-y-3">
                {optimizationPlans.balanced.recommendations.map((rec: any) => (
                  <div key={rec.campaignId} className={`p-4 rounded-lg border ${rec.urgency === "critical" ? "border-red-600/30 bg-red-900/10" : rec.urgency === "high" ? "border-yellow-600/30 bg-yellow-900/10" : "border-gray-700 bg-gray-800"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white font-semibold">{rec.campaignName}</span>
                        <span className="text-xs text-gray-500 ml-2">{rec.platform}</span>
                      </div>
                      <span className={`badge ${rec.urgency === "critical" ? "badge-archived" : rec.urgency === "high" ? "badge-paused" : "badge-draft"}`}>
                        {rec.urgency}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm mb-2">
                      <span className="text-gray-400">${rec.currentDaily.toLocaleString()}/day</span>
                      <TrendingUp className={`w-4 h-4 ${rec.changePercent > 0 ? "text-green-400" : "text-red-400"}`} />
                      <span className={`font-medium ${rec.changePercent > 0 ? "text-green-400" : "text-red-400"}`}>
                        {rec.changePercent > 0 ? "+" : ""}{rec.changePercent}%
                      </span>
                      <span className="text-gray-400">→ ${rec.recommendedDaily.toLocaleString()}/day</span>
                    </div>
                    <p className="text-xs text-gray-500">{rec.reasoning}</p>
                    {rec.expectedImpact && (
                      <div className="flex gap-4 mt-2 text-xs">
                        <span>ROAS: <span className={rec.expectedImpact.roasChange.startsWith("+") ? "text-green-400" : "text-red-400"}>{rec.expectedImpact.roasChange}</span></span>
                        <span>Conversions: <span className={rec.expectedImpact.conversionChange.startsWith("+") ? "text-green-400" : "text-red-400"}>{rec.expectedImpact.conversionChange}</span></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "creative" && (
        <div className="space-y-6">
          {creativeAnalysis?.analysis && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creativeAnalysis.analysis.map((a: any) => (
                <div key={a.creativeId} className={`card ${a.isFatigued ? "border-yellow-600/30" : ""}`}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-white font-semibold">{a.creativeName}</h3>
                    <span className={`badge ${a.urgency === "critical" ? "badge-archived" : a.urgency === "high" ? "badge-paused" : "badge-draft"}`}>
                      {a.fatigueScore.toFixed(0)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div><span className="text-gray-500">CTR</span><p className="text-white">{a.currentCtr}%</p></div>
                    <div><span className="text-gray-500">Baseline</span><p className="text-white">{a.baselineCtr}%</p></div>
                    <div><span className="text-gray-500">Drop</span><p className={a.ctrDropPercent > 20 ? "text-red-400" : "text-green-400"}>{a.ctrDropPercent}%</p></div>
                    <div><span className="text-gray-500">Days</span><p className="text-white">{a.daysSinceFirstRun}</p></div>
                  </div>
                  {a.isFatigued && (
                    <div className="text-xs text-yellow-400 bg-yellow-900/10 rounded px-2 py-1">
                      Recommendation: {a.recommendation.replace(/_/g, " ")}
                    </div>
                  )}
                  {!a.isFatigued && (
                    <div className="text-xs text-green-400">Healthy — no action needed</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Live Alert Feed</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-gray-500 text-sm">No active alerts. System nominal.</p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                    alert.severity === "critical" ? "bg-red-900/20 border border-red-800/30" : "bg-yellow-900/10 border border-yellow-800/20"
                  }`}
                >
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${alert.severity === "critical" ? "text-red-400" : "text-yellow-400"}`} />
                  <div className="flex-1">
                    <p className="text-gray-200">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                  </div>
                  <span className={`badge text-xs ${alert.severity === "critical" ? "badge-archived" : "badge-paused"}`}>
                    {alert.severity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
