import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";
import { Play, RotateCcw, TrendingUp, DollarSign, Activity, AlertTriangle, BarChart3, Layers } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

export default function CampaignSimulation() {
  const { addToast } = useToast();
  const [channels, setChannels] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [trials, setTrials] = useState(500);

  async function loadSamples() {
    setLoading(true);
    try {
      const [chRes, scRes] = await Promise.all([
        api.campaignSimulation.sampleChannels(),
        api.campaignSimulation.sampleScenarios(),
      ]);
      setChannels(chRes.data);
      setScenarios(scRes.data);
    } catch { addToast("error", "Failed to load sample data"); }
    setLoading(false);
  }

  async function handleSimulate(scenario: any) {
    setLoading(true);
    try {
      const res = await api.campaignSimulation.simulate(channels, scenario, trials);
      setResults((prev) => {
        const existing = prev.findIndex((r) => r.name === scenario.name);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = res.data;
          return updated;
        }
        return [...prev, res.data];
      });
      setSelectedResult(res.data);
    } catch { addToast("error", `Simulation failed: ${scenario.name}`); }
    setLoading(false);
  }

  async function handleMultiSimulate() {
    setLoading(true);
    try {
      const res = await api.campaignSimulation.multiScenario(channels, scenarios, Math.min(trials, 300));
      setResults(res.data);
    } catch { addToast("error", "Multi-scenario simulation failed"); }
    setLoading(false);
  }

  const revenueDist = selectedResult?.trials
    ? Array.from({ length: 20 }, (_, i) => {
        const binSize = (selectedResult.summary.maxRevenue - selectedResult.summary.minRevenue) / 20;
        const lower = selectedResult.summary.minRevenue + i * binSize;
        const upper = lower + binSize;
        const count = selectedResult.trials.filter((t: any) => t.totalRevenue >= lower && t.totalRevenue < upper).length;
        return { bin: `$${(lower / 1000).toFixed(0)}k`, count: Math.round(count / selectedResult.trials.length * 10000) / 100 };
      })
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Layers className="w-8 h-8 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold">Campaign Simulation</h1>
          <p className="text-gray-400 text-sm">Monte Carlo what-if analysis for budget scenarios</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={loadSamples} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50">
          <RotateCcw className="w-4 h-4" /> Load Samples
        </button>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Trials:</label>
          <input type="number" value={trials} onChange={(e) => setTrials(parseInt(e.target.value) || 100)} className="w-20 p-2 bg-gray-700 rounded text-sm" min={10} max={5000} />
        </div>
      </div>

      {scenarios.length > 0 && (
        <>
          <div className="flex gap-2 flex-wrap">
            {scenarios.map((s) => (
              <button key={s.name} onClick={() => handleSimulate(s)} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm disabled:opacity-50">
                <Play className="w-3 h-3" /> {s.name}
              </button>
            ))}
            <button onClick={handleMultiSimulate} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-700 rounded-lg hover:bg-cyan-600 text-sm disabled:opacity-50">
              <Layers className="w-3 h-3" /> All Scenarios
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {results.map((r) => (
              <div key={r.name} onClick={() => setSelectedResult(r)} className={`bg-gray-800 p-4 rounded-lg cursor-pointer border-2 ${selectedResult?.name === r.name ? "border-cyan-500" : "border-transparent"} hover:border-gray-600`}>
                <h3 className="font-semibold mb-2 capitalize">{r.name.replace(/_/g, " ")}</h3>
                <p className="text-xs text-gray-400 mb-2">{r.description}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div><span className="text-gray-400">Mean Rev</span><p className="font-bold text-emerald-400">${r.summary.meanRevenue.toLocaleString()}</p></div>
                  <div><span className="text-gray-400">±σ</span><p className="font-bold">${r.summary.stdRevenue.toLocaleString()}</p></div>
                  <div><span className="text-gray-400">P(Positive)</span><p className="font-bold text-blue-400">{r.summary.probabilityPositiveROI}%</p></div>
                </div>
              </div>
            ))}
          </div>

          {selectedResult && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Mean Revenue</p><p className="text-xl font-bold text-emerald-400">${selectedResult.summary.meanRevenue.toLocaleString()}</p></div>
                <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Median Revenue</p><p className="text-xl font-bold">${selectedResult.summary.medianRevenue.toLocaleString()}</p></div>
                <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Std Deviation</p><p className="text-xl font-bold">${selectedResult.summary.stdRevenue.toLocaleString()}</p></div>
                <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">VaR (95%)</p><p className="text-xl font-bold text-red-400">${selectedResult.summary.valueAtRisk95.toLocaleString()}</p></div>
                <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">CVaR (95%)</p><p className="text-xl font-bold text-red-400">${selectedResult.summary.conditionalVaR95.toLocaleString()}</p></div>
                <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Mean ROAS</p><p className="text-xl font-bold text-emerald-400">{selectedResult.summary.meanROAS}x</p></div>
                <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">P(Positive ROI)</p><p className="text-xl font-bold text-blue-400">{selectedResult.summary.probabilityPositiveROI}%</p></div>
                <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Uplift</p><p className={`text-xl font-bold ${selectedResult.baseComparison.uplift >= 0 ? "text-emerald-400" : "text-red-400"}`}>{selectedResult.baseComparison.uplift > 0 ? "+" : ""}{selectedResult.baseComparison.uplift}%</p></div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="flex items-center gap-2 font-semibold mb-4"><BarChart3 className="w-4 h-4 text-cyan-400" /> Revenue Distribution</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={revenueDist}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="bin" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#9ca3af" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                      <Area type="monotone" dataKey="count" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="flex items-center gap-2 font-semibold mb-4"><TrendingUp className="w-4 h-4 text-emerald-400" /> Channel Contribution</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={selectedResult.summary.channelBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="channel" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#9ca3af" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                      <Bar dataKey="contributionPct" name="Contribution %" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
