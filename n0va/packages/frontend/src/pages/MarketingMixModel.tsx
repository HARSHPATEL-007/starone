import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart3, TrendingUp, DollarSign, PieChart as PieChartIcon, Play, RotateCcw, Target } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6"];

export default function MarketingMixModel() {
  const { addToast } = useToast();
  const [mmmResult, setMmmResult] = useState<any>(null);
  const [sampleData, setSampleData] = useState<any>(null);
  const [scenarioResult, setScenarioResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [scenarioChanges, setScenarioChanges] = useState<Record<string, string>>({});

  async function loadSampleData() {
    setLoading(true);
    try {
      const res = await api.marketingMixModel.sampleData();
      setSampleData(res.data);
    } catch { addToast("error", "Failed to load sample data"); }
    setLoading(false);
  }

  async function handleRunMMM() {
    if (!sampleData) await loadSampleData();
    setLoading(true);
    try {
      const res = await api.marketingMixModel.run(sampleData.channels, sampleData.historicalData);
      setMmmResult(res.data);
    } catch { addToast("error", "MMM analysis failed"); }
    setLoading(false);
  }

  async function handleRunScenario() {
    if (!mmmResult) return;
    setLoading(true);
    try {
      const changes: Record<string, number> = {};
      for (const [ch, val] of Object.entries(scenarioChanges)) {
        const num = parseFloat(val as string);
        if (!isNaN(num)) changes[ch] = num;
      }
      const baseSpend: Record<string, number> = {};
      for (const c of mmmResult.contributions) {
        baseSpend[c.channel] = c.totalSpend;
      }
      const scenario = { name: "custom_scenario", budgetChanges: changes, description: "User-defined budget reallocation" };
      const res = await api.marketingMixModel.scenario(mmmResult, scenario, baseSpend);
      setScenarioResult(res.data);
    } catch { addToast("error", "Scenario simulation failed"); }
    setLoading(false);
  }

  const contributionData = mmmResult?.contributions?.map((c: any) => ({
    name: c.channel, ROAS: c.ROAS, Spend: c.totalSpend, Revenue: c.attributedRevenue, MarginalROAS: c.marginalROAS,
  })) || [];

  const shareData = mmmResult?.contributions?.map((c: any) => ({
    name: c.channel, value: c.shareOfRevenue,
  })) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-8 h-8 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Marketing Mix Model</h1>
          <p className="text-gray-400 text-sm">Econometric MMM with adstock, saturation, and ROI decomposition</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={loadSampleData} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50">
          <RotateCcw className="w-4 h-4" /> Load Sample Data
        </button>
        <button onClick={handleRunMMM} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-50">
          <Play className="w-4 h-4" /> Run MMM Analysis
        </button>
      </div>

      {sampleData && !mmmResult && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Sample Data Loaded</h3>
          <p className="text-sm text-gray-400">{sampleData.channels.length} channels, {sampleData.historicalData.length} weeks of data</p>
        </div>
      )}

      {mmmResult && (
        <>
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Total Revenue</p><p className="text-xl font-bold">${mmmResult.totalRevenue.toLocaleString()}</p></div>
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Total Spend</p><p className="text-xl font-bold">${mmmResult.totalSpend.toLocaleString()}</p></div>
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Overall ROAS</p><p className="text-xl font-bold text-emerald-400">{mmmResult.overallROAS}x</p></div>
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Base Revenue</p><p className="text-xl font-bold">${mmmResult.baseRevenue.toLocaleString()}</p></div>
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">R² Fit</p><p className="text-xl font-bold text-blue-400">{mmmResult.R2}</p></div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="flex items-center gap-2 font-semibold mb-4"><BarChart3 className="w-4 h-4 text-emerald-400" /> Channel ROAS</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={contributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#9ca3af" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                  <Bar dataKey="ROAS" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="flex items-center gap-2 font-semibold mb-4"><PieChartIcon className="w-4 h-4 text-purple-400" /> Revenue Share</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={shareData} dataKey="value" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {shareData.map((_: any, i: number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-gray-400 border-b border-gray-700">
                <th className="p-3 text-left">Channel</th><th className="p-3 text-right">Spend</th><th className="p-3 text-right">Revenue</th>
                <th className="p-3 text-right">ROAS</th><th className="p-3 text-right">Marginal ROAS</th><th className="p-3 text-right">Saturation</th>
                <th className="p-3 text-right">Share %</th>
              </tr></thead>
              <tbody>
                {mmmResult.contributions.map((c: any, i: number) => (
                  <tr key={c.channel} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="p-3 font-medium"><span className="w-2 h-2 inline-block rounded-full mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />{c.channel}</td>
                    <td className="p-3 text-right">${c.totalSpend.toLocaleString()}</td>
                    <td className="p-3 text-right">${c.attributedRevenue.toLocaleString()}</td>
                    <td className="p-3 text-right text-emerald-400">{c.ROAS}x</td>
                    <td className="p-3 text-right text-yellow-400">{c.marginalROAS}x</td>
                    <td className="p-3 text-right">{(c.saturation * 100).toFixed(1)}%</td>
                    <td className="p-3 text-right">{c.shareOfRevenue}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-yellow-400" /> What-If Scenario</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
              {mmmResult.contributions.map((c: any) => (
                <div key={c.channel}>
                  <label className="text-xs text-gray-400">{c.channel}</label>
                  <input type="number" placeholder="% change" value={scenarioChanges[c.channel] || ""} onChange={(e) => setScenarioChanges((p) => ({ ...p, [c.channel]: e.target.value }))} className="w-full p-2 bg-gray-700 rounded text-sm" />
                </div>
              ))}
            </div>
            <button onClick={handleRunScenario} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 rounded-lg hover:bg-yellow-500 disabled:opacity-50">
              <Play className="w-4 h-4" /> Run Scenario
            </button>
            {scenarioResult && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                <div className="bg-gray-700 p-3 rounded"><p className="text-xs text-gray-400">Projected Revenue</p><p className="font-bold text-lg">${scenarioResult.projectedRevenue.toLocaleString()}</p></div>
                <div className="bg-gray-700 p-3 rounded"><p className="text-xs text-gray-400">Projected ROAS</p><p className="font-bold text-lg text-emerald-400">{scenarioResult.projectedROAS}x</p></div>
                <div className="bg-gray-700 p-3 rounded"><p className="text-xs text-gray-400">Change from Base</p><p className={`font-bold text-lg ${scenarioResult.changeFromBase >= 0 ? "text-emerald-400" : "text-red-400"}`}>{scenarioResult.changeFromBase > 0 ? "+" : ""}{scenarioResult.changeFromBase}%</p></div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
