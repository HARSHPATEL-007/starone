import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Sparkles, User, Play, RotateCcw, Zap, Layers } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

export default function AdCopyPersonalization() {
  const { addToast } = useToast();
  const [elements, setElements] = useState<any[]>([]);
  const [userContext, setUserContext] = useState<any>(null);
  const [personalized, setPersonalized] = useState<any>(null);
  const [mvtResult, setMvtResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"personalize" | "mvt">("personalize");

  async function loadSamples() {
    setLoading(true);
    try {
      const [elRes, userRes] = await Promise.all([
        api.adCopyPersonalization.sampleElements(),
        api.adCopyPersonalization.sampleUser(),
      ]);
      setElements(elRes.data);
      setUserContext(userRes.data);
    } catch { addToast("error", "Failed to load samples"); }
    setLoading(false);
  }

  async function handlePersonalize() {
    if (!elements.length) await loadSamples();
    setLoading(true);
    try {
      const res = await api.adCopyPersonalization.personalize(elements, userContext);
      setPersonalized(res.data);
    } catch { addToast("error", "Personalization failed"); }
    setLoading(false);
  }

  async function handleMVT() {
    setLoading(true);
    try {
      const varRes = await api.adCopyPersonalization.sampleMVTVariants();
      const res = await api.adCopyPersonalization.mvt(varRes.data, 10000);
      setMvtResult(res.data);
      setTab("mvt");
    } catch { addToast("error", "MVT failed"); }
    setLoading(false);
  }

  const mvtChart = mvtResult?.variants?.map((v: any) => ({ name: v.name, cvr: v.conversionRate, prob: v.probabilityBest })) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="w-8 h-8 text-pink-400" />
        <div>
          <h1 className="text-2xl font-bold">Ad Copy Personalization</h1>
          <p className="text-gray-400 text-sm">Real-time element scoring and multivariate testing</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={loadSamples} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50">
          <RotateCcw className="w-4 h-4" /> Load Samples
        </button>
        <button onClick={handlePersonalize} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-pink-600 rounded-lg hover:bg-pink-500 disabled:opacity-50">
          <Zap className="w-4 h-4" /> Personalize
        </button>
        <button onClick={handleMVT} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-500 disabled:opacity-50">
          <Layers className="w-4 h-4" /> Run MVT
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab("personalize")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "personalize" ? "bg-pink-700" : "bg-gray-700"}`}>Personalization</button>
        <button onClick={() => setTab("mvt")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "mvt" ? "bg-pink-700" : "bg-gray-700"}`}>MVT Results</button>
      </div>

      {tab === "personalize" && userContext && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="flex items-center gap-2 font-semibold mb-2"><User className="w-4 h-4 text-blue-400" /> User Context</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="text-gray-400">Device:</span> <span>{userContext.deviceType}</span></div>
            <div><span className="text-gray-400">Hour:</span> <span>{userContext.timeOfDay}:00</span></div>
            <div><span className="text-gray-400">Segments:</span> <span>{userContext.segments?.join(", ")}</span></div>
            <div><span className="text-gray-400">Recent:</span> <span>{userContext.recentPages?.[0]}</span></div>
          </div>
        </div>
      )}

      {tab === "personalize" && personalized && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Personalization Score</p><p className="text-2xl font-bold text-pink-400">{personalized.personalizationScore}</p></div>
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Expected CTR</p><p className="text-2xl font-bold text-emerald-400">{personalized.expectedCtr}%</p></div>
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Expected CVR</p><p className="text-2xl font-bold text-blue-400">{personalized.expectedCvr}%</p></div>
          </div>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-gray-400 border-b border-gray-700">
                <th className="p-3 text-left">Element</th><th className="p-3 text-left">Selected Content</th>
              </tr></thead>
              <tbody>
                {Object.entries(personalized.elements || {}).map(([key, val]) => (
                  <tr key={key} className="border-b border-gray-700">
                    <td className="p-3 font-medium capitalize">{key}</td>
                    <td className="p-3 text-gray-300">{val as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "mvt" && mvtResult && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Winner</p><p className="text-lg font-bold text-emerald-400">{mvtResult.winner}</p></div>
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Significance</p><p className="text-lg font-bold">{mvtResult.significanceLevel}%</p></div>
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Total Visitors</p><p className="text-lg font-bold">{mvtResult.totalImpressions.toLocaleString()}</p></div>
            <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Variants</p><p className="text-lg font-bold">{mvtResult.variants.length}</p></div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-4">Variant Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mvtChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af" }} />
                <YAxis tick={{ fill: "#9ca3af" }} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                <Bar dataKey="cvr" name="CVR %" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
