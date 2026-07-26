import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Lightbulb, Play, RotateCcw, TrendingUp, Target, BarChart3, Layers } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

export default function CreativeAIEnhanced() {
  const { addToast } = useToast();
  const [mabVariants, setMabVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [fatigueResult, setFatigueResult] = useState<any>(null);
  const [abTestResult, setAbTestResult] = useState<any>(null);
  const [creativeHistory, setCreativeHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"mab" | "fatigue" | "abtest">("mab");

  async function handleMabSelect() {
    setLoading(true);
    try {
      const res = await api.creativeAI.mabSelect(["hero_a", "hero_b", "hero_c", "hero_d"]);
      setSelectedVariant(res.data);
    } catch { addToast("error", "MAB selection failed"); }
    setLoading(false);
  }

  async function handleMabVariants() {
    setLoading(true);
    try {
      const res = await api.creativeAI.mabVariants();
      setMabVariants(res.data);
    } catch { addToast("error", "Failed to load variants"); }
    setLoading(false);
  }

  async function handleFatigue() {
    setLoading(true);
    try {
      const res = await api.creativeAI.detectFatigue([{ creativeId: "img", dailyImpressions: [5000,5200,5100,4900,4700,4500,4300], dailyClicks: [100,105,98,90,80,68,55], channel: "social" }]);
      setFatigueResult(res.data);
      setTab("fatigue");
    } catch { addToast("error", "Fatigue detection failed"); }
    setLoading(false);
  }

  async function handleABTest() {
    setLoading(true);
    try {
      const variants = [
        { name: "Control", impressions: 5000, conversions: 200 },
        { name: "Variant A", impressions: 5000, conversions: 220 },
        { name: "Variant B", impressions: 5000, conversions: 195 },
      ];
      const res = await api.creativeAI.simulateABTest(variants, 5000, 14);
      setAbTestResult(res.data);
      setTab("abtest");
    } catch { addToast("error", "AB test simulation failed"); }
    setLoading(false);
  }

  const chartData = abTestResult?.variants?.map((v: any) => ({ name: v.name, cvr: v.conversionRate, pWin: v.probabilityBest })) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Lightbulb className="w-8 h-8 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold">Creative AI (Enhanced)</h1>
          <p className="text-gray-400 text-sm">Thompson sampling MAB | Fatigue detection | Bayesian A/B test simulator</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button onClick={handleMabSelect} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-amber-600 rounded-lg hover:bg-amber-500 disabled:opacity-50">
          <Play className="w-4 h-4" /> Sample MAB Select
        </button>
        <button onClick={handleMabVariants} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50">
          <RotateCcw className="w-4 h-4" /> Load MAB Variants
        </button>
        <button onClick={handleFatigue} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-rose-600 rounded-lg hover:bg-rose-500 disabled:opacity-50">
          <TrendingDown className="w-4 h-4" /> Detect Fatigue
        </button>
        <button onClick={handleABTest} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 disabled:opacity-50">
          <BarChart3 className="w-4 h-4" /> Simulate A/B Test
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab("mab")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "mab" ? "bg-amber-700" : "bg-gray-700"}`}>MAB</button>
        <button onClick={() => setTab("fatigue")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "fatigue" ? "bg-amber-700" : "bg-gray-700"}`}>Fatigue</button>
        <button onClick={() => setTab("abtest")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "abtest" ? "bg-amber-700" : "bg-gray-700"}`}>A/B Test</button>
      </div>

      {tab === "mab" && (
        <>
          {selectedVariant && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Selected Variant</h3>
              <div className="text-2xl font-bold text-amber-400">{selectedVariant.variantKey}</div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div><p className="text-sm text-gray-400">Selection Method</p><p className="font-medium">{selectedVariant.selectionMethod}</p></div>
                <div><p className="text-sm text-gray-400">Alpha</p><p className="font-medium">{selectedVariant.alpha}</p></div>
                <div><p className="text-sm text-gray-400">Beta</p><p className="font-medium">{selectedVariant.beta}</p></div>
              </div>
            </div>
          )}
          {mabVariants.length > 0 && (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-400 border-b border-gray-700">
                  <th className="p-3 text-left">Variant</th><th className="p-3 text-left">Impressions</th><th className="p-3 text-left">Conversions</th><th className="p-3 text-left">CTR</th><th className="p-3 text-left">Score</th>
                </tr></thead>
                <tbody>
                  {mabVariants.map((v: any) => (
                    <tr key={v.variantKey} className="border-b border-gray-700">
                      <td className="p-3 font-medium">{v.variantKey}</td>
                      <td className="p-3">{v.impressions}</td>
                      <td className="p-3">{v.conversions}</td>
                      <td className="p-3">{((v.conversions / v.impressions) * 100).toFixed(2)}%</td>
                      <td className="p-3"><span className="text-amber-400 font-bold">{v.score}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "fatigue" && fatigueResult && (
        <>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Fatigue Analysis</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><p className="text-sm text-gray-400">Stage</p><p className={`font-bold text-lg ${fatigueResult.stage === "exhausted" ? "text-red-400" : fatigueResult.stage === "decline" ? "text-orange-400" : "text-emerald-400"}`}>{fatigueResult.stage}</p></div>
              <div><p className="text-sm text-gray-400">CTR Decay</p><p className="font-bold">{fatigueResult.ctrDecay}</p></div>
              <div><p className="text-sm text-gray-400">Start CTR</p><p className="font-bold">{fatigueResult.startCtr}%</p></div>
              <div><p className="text-sm text-gray-400">Current CTR</p><p className="font-bold">{fatigueResult.currentCtr}%</p></div>
            </div>
          </div>
          {fatigueResult.recommendation && (
            <div className="bg-blue-900/30 border border-blue-500 p-4 rounded-lg">
              <p className="text-blue-400 font-semibold">Recommendation:</p>
              <p className="text-gray-300">{fatigueResult.recommendation}</p>
            </div>
          )}
        </>
      )}

      {tab === "abtest" && abTestResult && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Winner</p><p className="text-lg font-bold text-emerald-400">{abTestResult.winner}</p></div>
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">P(Win)</p><p className="text-lg font-bold">{abTestResult.probabilityBest}%</p></div>
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Days to Significance</p><p className="text-lg font-bold">{abTestResult.daysToSignificance}</p></div>
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Significant</p><p className={`text-lg font-bold ${abTestResult.isSignificant ? "text-emerald-400" : "text-yellow-400"}`}>{abTestResult.isSignificant ? "Yes" : "No"}</p></div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-4">Variant Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af" }} />
                <YAxis tick={{ fill: "#9ca3af" }} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                <Bar dataKey="cvr" name="CVR %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
