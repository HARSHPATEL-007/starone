import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, DollarSign, TrendingUp, PieChart as PieChartIcon, RefreshCw, Layers, AlertTriangle, Heart } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

const COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

export default function CustomerLifetimeValue() {
  const { addToast } = useToast();
  const [predictions, setPredictions] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"predict" | "cohort" | "segment">("predict");

  async function loadPrediction() {
    setLoading(true);
    try {
      const samples = await api.clv.sampleCustomers(20);
      const pred = await api.clv.batchPredict(samples.data);
      setPredictions(pred.data);
      setTab("predict");
    } catch { addToast("error", "Prediction failed"); }
    setLoading(false);
  }

  async function loadCohorts() {
    setLoading(true);
    try {
      const samples = await api.clv.sampleCustomers(50);
      const c = await api.clv.cohortAnalysis(samples.data);
      setCohorts(c.data);
      setTab("cohort");
    } catch { addToast("error", "Cohort analysis failed"); }
    setLoading(false);
  }

  async function loadSegments() {
    setLoading(true);
    try {
      const samples = await api.clv.sampleCustomers(40);
      const s = await api.clv.segment(samples.data);
      setSegments(s.data);
      setTab("segment");
    } catch { addToast("error", "Segmentation failed"); }
    setLoading(false);
  }

  const segmentPie = segments.map((s) => ({ name: s.segment.replace("_", " "), value: s.totalValue }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="w-8 h-8 text-green-400" />
        <div>
          <h1 className="text-2xl font-bold">Customer Lifetime Value</h1>
          <p className="text-gray-400 text-sm">BG/NBD predictive CLV modeling</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={loadPrediction} className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Predict CLV</button>
        <button onClick={loadCohorts} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"><Layers className="w-4 h-4" />Cohort Analysis</button>
        <button onClick={loadSegments} className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"><Users className="w-4 h-4" />Segments</button>
      </div>

      {tab === "predict" && predictions.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-400" />CLV Predictions</h3>
          <div className="overflow-auto max-h-80">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-400"><th className="p-2">Customer</th><th className="p-2">Predicted CLV</th><th className="p-2">Transactions</th><th className="p-2">P(Alive)</th><th className="p-2">Segment</th></tr></thead>
              <tbody>{predictions.map((p: any, i: number) => (
                <tr key={i} className="border-t border-gray-700">
                  <td className="p-2">{p.customerName}</td>
                  <td className="p-2 font-mono text-green-400">${p.predictedCLV.toFixed(2)}</td>
                  <td className="p-2">{p.predictedTransactions.toFixed(1)}</td>
                  <td className="p-2">{(p.probabilityAlive * 100).toFixed(0)}%</td>
                  <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${p.segment === "high_value" ? "bg-green-900 text-green-300" : p.segment === "at_risk" ? "bg-red-900 text-red-300" : p.segment === "new" ? "bg-blue-900 text-blue-300" : "bg-gray-700 text-gray-300"}`}>{p.segment.replace("_", " ")}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={predictions.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="customerName" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
              <YAxis stroke="#9CA3AF" />
              <Tooltip />
              <Bar dataKey="predictedCLV" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === "cohort" && cohorts.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Layers className="w-4 h-4 text-blue-400" />Cohort Analysis</h3>
          <div className="overflow-auto max-h-72">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-400"><th className="p-2">Cohort</th><th className="p-2">Customers</th><th className="p-2">Avg CLV</th><th className="p-2">Retention</th><th className="p-2">Avg Txns</th><th className="p-2">Revenue Share</th></tr></thead>
              <tbody>{cohorts.map((c: any, i: number) => (
                <tr key={i} className="border-t border-gray-700">
                  <td className="p-2 font-mono">{c.cohortName}</td>
                  <td className="p-2">{c.customerCount}</td>
                  <td className="p-2 font-mono text-green-400">${c.averageCLV.toFixed(2)}</td>
                  <td className="p-2">{(c.retentionRate).toFixed(1)}%</td>
                  <td className="p-2">{c.averageTransactions.toFixed(1)}</td>
                  <td className="p-2">{c.revenueShare.toFixed(1)}%</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "segment" && segments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-green-400" />Segment Breakdown</h3>
            {segments.map((s: any) => (
              <div key={s.segment} className="bg-gray-700 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold capitalize">{s.segment.replace("_", " ")}</span>
                  <span className="text-sm text-gray-400">{s.count} customers</span>
                </div>
                <div className="text-lg font-mono text-green-400">${s.totalValue.toFixed(2)}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.recommendations?.slice(0, 3).map((r: string, j: number) => (
                    <span key={j} className="text-xs bg-gray-600 px-2 py-0.5 rounded">{r}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {segmentPie.length > 0 && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-purple-400" />Value Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={segmentPie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {segmentPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
