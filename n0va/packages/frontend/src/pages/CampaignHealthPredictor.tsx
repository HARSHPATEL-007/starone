import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";
import { HeartPulse, AlertTriangle, Activity, TrendingDown, Shield, Play, RotateCcw, BarChart3 } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

export default function CampaignHealthPredictor() {
  const { addToast } = useToast();
  const [metrics, setMetrics] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState("camp_demo");

  async function loadMetrics() {
    setLoading(true);
    try {
      const res = await api.campaignHealth.sampleMetrics(30);
      setMetrics(res.data);
    } catch { addToast("error", "Failed to load sample metrics"); }
    setLoading(false);
  }

  async function handleFullReport() {
    if (!metrics.length) await loadMetrics();
    setLoading(true);
    try {
      const res = await api.campaignHealth.report(campaignId, metrics);
      setReport(res.data);
    } catch { addToast("error", "Health analysis failed"); }
    setLoading(false);
  }

  const healthColor = (cat: string) =>
    cat === "excellent" ? "text-emerald-400" : cat === "good" ? "text-blue-400" : cat === "fair" ? "text-yellow-400" : cat === "poor" ? "text-orange-400" : "text-red-400";

  const severityColor = (sev: string) =>
    sev === "critical" ? "bg-red-900/50 border-red-500" : sev === "high" ? "bg-orange-900/30 border-orange-500" : sev === "medium" ? "bg-yellow-900/20 border-yellow-500" : "bg-gray-800 border-gray-600";

  const survivalData = report?.survivalAnalysis?.kaplanMeier || [];

  const trendData = report?.trend || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <HeartPulse className="w-8 h-8 text-red-400" />
        <div>
          <h1 className="text-2xl font-bold">Campaign Health Predictor</h1>
          <p className="text-gray-400 text-sm">Predictive health scoring with survival analysis and early warnings</p>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <input type="text" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} placeholder="Campaign ID" className="p-2 bg-gray-700 rounded text-sm max-w-xs" />
        <button onClick={loadMetrics} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50">
          <RotateCcw className="w-4 h-4" /> Load Metrics
        </button>
        <button onClick={handleFullReport} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-500 disabled:opacity-50">
          <Play className="w-4 h-4" /> Run Full Report
        </button>
      </div>

      {report && (
        <>
          <div className={`p-4 rounded-lg border ${report.currentHealth.overall >= 70 ? "bg-emerald-900/20 border-emerald-500" : report.currentHealth.overall >= 50 ? "bg-yellow-900/20 border-yellow-500" : "bg-red-900/30 border-red-500"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Overall Health Score</p>
                <p className={`text-4xl font-bold ${healthColor(report.currentHealth.category)}`}>{report.currentHealth.overall}</p>
                <p className={`text-sm capitalize ${healthColor(report.currentHealth.category)}`}>{report.currentHealth.category}</p>
              </div>
              <div className="grid grid-cols-5 gap-3 text-center">
                {Object.entries(report.currentHealth.components).map(([key, val]) => (
                  <div key={key} className="bg-gray-800/50 p-2 rounded">
                    <p className="text-xs text-gray-400 capitalize">{key}</p>
                    <p className="font-bold text-lg">{val as number}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="flex items-center gap-2 font-semibold mb-4"><AlertTriangle className="w-4 h-4 text-red-400" /> Risk Factors</h3>
              <div className="space-y-2">
                {report.riskFactors.map((rf: any, i: number) => (
                  <div key={i} className={`p-3 rounded-lg border ${severityColor(rf.severity)}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{rf.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full uppercase ${rf.severity === "critical" ? "bg-red-600" : rf.severity === "high" ? "bg-orange-600" : "bg-gray-600"}`}>{rf.severity}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-1">{rf.description}</p>
                    <p className="text-xs text-blue-400">{rf.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="flex items-center gap-2 font-semibold mb-4"><Shield className="w-4 h-4 text-cyan-400" /> Survival Analysis</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={survivalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <YAxis domain={[0, 1]} tick={{ fill: "#9ca3af" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="survivalProbability" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div><p className="text-xs text-gray-400">Median Lifetime</p><p className="font-bold">{report.survivalAnalysis.medianLifetime} days</p></div>
                <div><p className="text-xs text-gray-400">Predicted Remaining</p><p className="font-bold">{report.survivalAnalysis.predictedRemainingDays} days</p></div>
                <div><p className="text-xs text-gray-400">Hazard Rate</p><p className="font-bold">{report.survivalAnalysis.hazardRate}</p></div>
              </div>
            </div>
          </div>

          {report.earlyWarning.triggered && (
            <div className="bg-red-900/30 border border-red-500 p-4 rounded-lg">
              <h3 className="flex items-center gap-2 font-bold text-red-400 mb-3"><AlertTriangle className="w-4 h-4" /> Early Warning (Risk Score: {report.earlyWarning.riskScore})</h3>
              <div className="space-y-2">
                {report.earlyWarning.warnings.map((w: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${w.severity === "critical" ? "bg-red-600" : "bg-orange-600"}`}>{w.severity}</span>
                    <span className="text-gray-300">{w.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-4">Health Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" tick={{ fill: "#9ca3af" }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#9ca3af" }} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                <Line type="monotone" dataKey="healthScore" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Recommendations</h3>
            <ul className="space-y-2">
              {report.recommendations.map((rec: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-emerald-400 mt-0.5">&#9655;</span> {rec}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
