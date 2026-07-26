import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Brain, Zap, TrendingUp, Target, Play, RotateCcw, DollarSign, Activity, Table, BarChart as BarChartIcon } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

export default function PredictiveBidding() {
  const { addToast } = useToast();
  const [config, setConfig] = useState<any>(null);
  const [state, setState] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [qtable, setQtable] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [tab, setTab] = useState<"recommend" | "simulate" | "qtable" | "history">("recommend");

  async function loadConfig() {
    setLoading(true);
    try {
      const res = await api.predictiveBidding.config();
      setConfig(res.data);
    } catch { addToast("error", "Failed to load config"); }
    setLoading(false);
  }

  async function handleRecommend() {
    setLoading(true);
    try {
      const stateRes = await api.predictiveBidding.sampleState("meta");
      setState(stateRes.data);
      const rec = await api.predictiveBidding.recommend(stateRes.data, "demo_campaign");
      setRecommendation(rec.data);
    } catch { addToast("error", "Recommendation failed"); }
    setLoading(false);
  }

  async function handleSimulate() {
    setLoading(true);
    try {
      const stateRes = await api.predictiveBidding.sampleState("google");
      const sim = await api.predictiveBidding.simulate("demo_sim", stateRes.data, 8);
      setSimResult(sim.data);
    } catch { addToast("error", "Simulation failed"); }
    setLoading(false);
  }

  async function loadQTable() {
    setLoading(true);
    try {
      if (!simResult) await handleSimulate();
      const qt = await api.predictiveBidding.qtable("demo_sim");
      setQtable(Array.isArray(qt.data) ? qt.data : []);
      setTab("qtable");
    } catch { addToast("error", "Failed to load Q-table"); }
    setLoading(false);
  }

  async function loadHistory() {
    setLoading(true);
    try {
      if (!simResult) await handleSimulate();
      const h = await api.predictiveBidding.history("demo_sim");
      setHistory(Array.isArray(h.data) ? h.data : []);
      setTab("history");
    } catch { addToast("error", "Failed to load history"); }
    setLoading(false);
  }

  const simChart = simResult?.steps?.length ? simResult.steps.map((s: any, i: number) => ({ step: i + 1, reward: s.reward, action: s.action })) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="w-8 h-8 text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold">Predictive Bidding</h1>
          <p className="text-gray-400 text-sm">Q-learning based bid optimization</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={handleRecommend} className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-2"><Target className="w-4 h-4" />Get Recommendation</button>
        <button onClick={handleSimulate} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"><Play className="w-4 h-4" />Simulate Episode</button>
        <button onClick={loadQTable} className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"><Table className="w-4 h-4" />Q-Table</button>
        <button onClick={loadHistory} className="px-4 py-2 bg-amber-600 rounded-lg hover:bg-amber-700 flex items-center gap-2"><Activity className="w-4 h-4" />History</button>
        <button onClick={loadConfig} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 flex items-center gap-2"><Brain className="w-4 h-4" />Config</button>
      </div>

      {config && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(config.config || {}).map(([k, v]) => (
            <div key={k} className="bg-gray-800 p-3 rounded-lg">
              <div className="text-xs text-gray-400 capitalize">{k.replace(/([A-Z])/g, " $1")}</div>
              <div className="text-lg font-semibold">{typeof v === "number" ? v : String(v)}</div>
            </div>
          ))}
        </div>
      )}

      {recommendation && (
        <div className="bg-gray-800 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" />Bid Recommendation</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><span className="text-xs text-gray-400">Platform</span><p className="font-mono">{recommendation.platformId}</p></div>
            <div><span className="text-xs text-gray-400">Current Bid</span><p className="font-mono">${recommendation.currentBid}</p></div>
            <div><span className="text-xs text-gray-400">Recommended</span><p className="font-mono text-green-400">${recommendation.recommendedBid}</p></div>
            <div><span className="text-xs text-gray-400">Action</span><p className="font-mono text-yellow-400">{recommendation.action}</p></div>
            <div><span className="text-xs text-gray-400">Q-Value</span><p className="font-mono">{recommendation.qValue}</p></div>
            <div><span className="text-xs text-gray-400">Confidence</span><p className="font-mono">{(recommendation.confidence * 100).toFixed(0)}%</p></div>
            <div><span className="text-xs text-gray-400">Expected Clicks</span><p className="font-mono">{recommendation.expectedClicks}</p></div>
            <div><span className="text-xs text-gray-400">Expected Cost</span><p className="font-mono">${recommendation.expectedCost}</p></div>
          </div>
        </div>
      )}

      {simResult && (
        <div className="bg-gray-800 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-400" />Simulation Results</h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-gray-700 p-2 rounded"><span className="text-xs text-gray-400">Total Reward</span><p className="text-lg font-semibold text-green-400">{simResult.episodeReward}</p></div>
            <div className="bg-gray-700 p-2 rounded"><span className="text-xs text-gray-400">Steps</span><p className="text-lg font-semibold">{simResult.steps?.length || 0}</p></div>
            <div className="bg-gray-700 p-2 rounded"><span className="text-xs text-gray-400">Learned Strategy</span><p className="text-lg font-semibold text-purple-400 capitalize">{simResult.learnedStrategy}</p></div>
          </div>
          {simChart.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={simChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="step" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip />
                <Line type="monotone" dataKey="reward" stroke="#8B5CF6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {tab === "qtable" && qtable.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Table className="w-4 h-4 text-green-400" />Q-Table ({qtable.length} states)</h3>
          <div className="overflow-auto max-h-80">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-400"><th className="p-2">State</th><th className="p-2">Best Action</th><th className="p-2">Top Q-Value</th></tr></thead>
              <tbody>{qtable.slice(0, 20).map((e: any, i: number) => (
                <tr key={i} className="border-t border-gray-700"><td className="p-2 font-mono text-xs">{e.state}</td><td className="p-2 text-yellow-400">{e.bestAction}</td><td className="p-2">{Math.max(...e.qValues).toFixed(4)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "history" && history.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-amber-400" />Action History ({history.length} entries)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={history.map((h: any, i: number) => ({ ...h, index: i }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="index" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip />
              <Bar dataKey="reward" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
