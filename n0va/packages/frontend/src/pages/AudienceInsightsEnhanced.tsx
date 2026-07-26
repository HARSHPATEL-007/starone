import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell } from "recharts";
import { Users, Play, RotateCcw, Sigma, Layers, Target, TrendingUp } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

export default function AudienceInsightsEnhanced() {
  const { addToast } = useToast();
  const [pcaResult, setPcaResult] = useState<any>(null);
  const [gmmResult, setGmmResult] = useState<any>(null);
  const [rfmResult, setRfmResult] = useState<any>(null);
  const [lookalikeResult, setLookalikeResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"pca" | "gmm" | "rfm" | "lookalike">("rfm");

  function generateData(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => Math.random() * 100)
    );
  }

  function generateCustomers() {
    return Array.from({ length: 100 }, (_, i) => ({
      customerId: `c_${i + 1}`,
      recencyDays: Math.floor(Math.random() * 365),
      frequency: Math.floor(Math.random() * 50),
      monetaryValue: Math.random() * 5000,
    }));
  }

  async function handlePCA() {
    setLoading(true);
    try {
      const res = await api.audienceInsights.pca(generateData(50, 8), 2);
      setPcaResult(res.data);
      setTab("pca");
    } catch { addToast("error", "PCA failed"); }
    setLoading(false);
  }

  async function handleGMM() {
    setLoading(true);
    try {
      const res = await api.audienceInsights.gmm(generateData(100, 3), 4);
      setGmmResult(res.data);
      setTab("gmm");
    } catch { addToast("error", "GMM failed"); }
    setLoading(false);
  }

  async function handleRFM() {
    setLoading(true);
    try {
      const res = await api.audienceInsights.rfm(generateCustomers());
      setRfmResult(res.data);
      setTab("rfm");
    } catch { addToast("error", "RFM failed"); }
    setLoading(false);
  }

  async function handleLookalike() {
    setLoading(true);
    try {
      const pool = Array.from({ length: 200 }, (_, i) => ({
        id: `user_${i + 1}`,
        features: Array.from({ length: 5 }, () => Math.random()),
      }));
      const seed = pool.slice(0, 10);
      const res = await api.audienceInsights.lookalike(seed, pool, 30);
      setLookalikeResult(res.data);
      setTab("lookalike");
    } catch { addToast("error", "Lookalike failed"); }
    setLoading(false);
  }

  const scatterData = pcaResult?.projected?.map((p: any, i: number) => ({
    x: p[0], y: p[1], cluster: gmmResult?.labels?.[i] ?? 0,
  })) || [];

  const COLORS = ["#ec4899", "#06b6d4", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-8 h-8 text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold">Audience Insights (Enhanced)</h1>
          <p className="text-gray-400 text-sm">PCA dimensionality reduction | GMM clustering | RFM scoring | Lookalike expansion</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button onClick={handleRFM} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-500 disabled:opacity-50">
          <Target className="w-4 h-4" /> RFM Scoring
        </button>
        <button onClick={handlePCA} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 disabled:opacity-50">
          <Sigma className="w-4 h-4" /> PCA
        </button>
        <button onClick={handleGMM} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-amber-600 rounded-lg hover:bg-amber-500 disabled:opacity-50">
          <Layers className="w-4 h-4" /> GMM Clustering
        </button>
        <button onClick={handleLookalike} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-50">
          <TrendingUp className="w-4 h-4" /> Lookalike
        </button>
      </div>

      <div className="flex gap-2">
        {(["rfm", "pca", "gmm", "lookalike"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm capitalize ${tab === t ? "bg-purple-700" : "bg-gray-700"}`}>{t}</button>
        ))}
      </div>

      {tab === "rfm" && rfmResult && (
        <>
          <div className="grid grid-cols-5 gap-3">
            {rfmResult.segments?.map((s: any) => (
              <div key={s.name} className="bg-gray-800 p-3 rounded-lg text-center">
                <p className="text-sm font-semibold capitalize">{s.name}</p>
                <p className="text-2xl font-bold text-purple-400">{s.count}</p>
                <p className="text-xs text-gray-400">{s.pct}%</p>
              </div>
            ))}
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Sample Customers</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-400 border-b border-gray-700">
                  <th className="p-3 text-left">Customer</th><th className="p-3 text-left">R</th><th className="p-3 text-left">F</th><th className="p-3 text-left">M</th><th className="p-3 text-left">RFM Score</th><th className="p-3 text-left">Segment</th>
                </tr></thead>
                <tbody>
                  {rfmResult.customers?.slice(0, 10).map((c: any) => (
                    <tr key={c.customerId} className="border-b border-gray-700">
                      <td className="p-3">{c.customerId}</td>
                      <td className="p-3">{c.recencyDays}</td>
                      <td className="p-3">{c.frequency}</td>
                      <td className="p-3">${c.monetaryValue.toFixed(0)}</td>
                      <td className="p-3 font-bold">{c.rfmScore}</td>
                      <td className="p-3 capitalize">{c.segment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "pca" && pcaResult && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">PCA Projection</h3>
            <p className="text-sm text-gray-400 mb-3">Explained variance: {(pcaResult.explainedVariance * 100).toFixed(1)}%</p>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="x" tick={{ fill: "#9ca3af" }} />
                <YAxis dataKey="y" tick={{ fill: "#9ca3af" }} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none" }} />
                <Scatter data={scatterData}>
                  {scatterData.map((entry, i) => (
                    <Cell key={i} fill={COLORS[entry.cluster % COLORS.length]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Component Loadings</h3>
            {pcaResult.components?.map((comp: number[], i: number) => (
              <div key={i} className="mb-2">
                <p className="text-xs text-gray-400">PC{i + 1}: [{comp.map((v) => v.toFixed(2)).join(", ")}]</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "gmm" && gmmResult && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">GMM Clustering Results</h3>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div><p className="text-sm text-gray-400">Clusters (K)</p><p className="font-bold">{gmmResult.k}</p></div>
            <div><p className="text-sm text-gray-400">BIC</p><p className="font-bold">{gmmResult.bic}</p></div>
            <div><p className="text-sm text-gray-400">Log Likelihood</p><p className="font-bold">{gmmResult.logLikelihood}</p></div>
            <div><p className="text-sm text-gray-400">AIC</p><p className="font-bold">{gmmResult.aic}</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-gray-400 border-b border-gray-700">
                <th className="p-3 text-left">Cluster</th><th className="p-3 text-left">Weight</th><th className="p-3 text-left">Mean Vector</th>
              </tr></thead>
              <tbody>
                {gmmResult.weights?.map((w: number, i: number) => (
                  <tr key={i} className="border-b border-gray-700">
                    <td className="p-3"><span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: COLORS[i] }}>C{i}</span></td>
                    <td className="p-3">{w.toFixed(3)}</td>
                    <td className="p-3">[{gmmResult.means[i].map((m: number) => m.toFixed(1)).join(", ")}]</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "lookalike" && lookalikeResult && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Seed Size</p><p className="text-2xl font-bold">{lookalikeResult.seedSize}</p></div>
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Expanded</p><p className="text-2xl font-bold">{lookalikeResult.expandedSize}</p></div>
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Avg Similarity</p><p className="text-2xl font-bold text-emerald-400">{lookalikeResult.averageSimilarity}</p></div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Lookalike Users</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-400 border-b border-gray-700">
                  <th className="p-3 text-left">User</th><th className="p-3 text-left">Score</th><th className="p-3 text-left">Similarity</th>
                </tr></thead>
                <tbody>
                  {lookalikeResult.lookalikes?.map((l: any) => (
                    <tr key={l.id} className="border-b border-gray-700">
                      <td className="p-3">{l.id}</td>
                      <td className="p-3"><span className="font-bold text-purple-400">{l.score}</span></td>
                      <td className="p-3">{l.similarity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
