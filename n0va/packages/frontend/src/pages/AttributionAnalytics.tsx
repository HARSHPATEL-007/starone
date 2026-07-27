import { useState } from "react";
import { BarChart3, GitBranch, Clock, PieChart as PieChartIcon, RefreshCw, Loader, Plus, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

type Tab = "shapley" | "markov" | "timedecay";

const MODEL_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#ec4899"];

const DEFAULT_CHANNELS = ["email", "social", "search", "display", "video"];

function randomConversion() {
  const channelCount = 1 + Math.floor(Math.random() * 3);
  const shuffled = [...DEFAULT_CHANNELS].sort(() => Math.random() - 0.5);
  return {
    userId: `user_${Math.random().toString(36).slice(2, 6)}`,
    conversionValue: Math.round(Math.random() * 500 + 50),
    interactions: shuffled.slice(0, channelCount),
    timestamp: new Date(Date.now() - Math.floor(Math.random() * 30 * 86400000)).toISOString(),
  };
}

function defaultConversions() {
  return Array.from({ length: 5 }, () => randomConversion());
}

function defaultPaths() {
  return Array.from({ length: 8 }, (_, i) => ({
    path: [...DEFAULT_CHANNELS].sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 3)),
    conversion: Math.random() > 0.3,
    value: Math.round(Math.random() * 400 + 50),
    userId: `path_user_${i}`,
  }));
}

export default function AttributionAnalytics() {
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>("shapley");
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [shapleyResult, setShapleyResult] = useState<any>(null);
  const [markovResult, setMarkovResult] = useState<any>(null);
  const [timeDecayResult, setTimeDecayResult] = useState<any>(null);
  const [conversions, setConversions] = useState<any[]>(defaultConversions);
  const [channels] = useState<string[]>(DEFAULT_CHANNELS);
  const [paths] = useState<any[]>(defaultPaths);
  const [halfLife, setHalfLife] = useState(7);

  async function runShapley() {
    setLoading(l => ({ ...l, shapley: true }));
    try {
      const res = await api.dsAlgorithms.campaignAttributionShapley({ channels, conversions });
      const data = res.data || res;
      setShapleyResult(data);
      if (!data || Object.keys(data).length === 0) addToast("error", "Shapley returned empty");
    } catch (e: any) { addToast("error", e.message); }
    setLoading(l => ({ ...l, shapley: false }));
  }

  async function runMarkov() {
    setLoading(l => ({ ...l, markov: true }));
    try {
      const res = await api.dsAlgorithms.conversionAttributionMarkov({ paths });
      const data = res.data || res;
      setMarkovResult(data);
      if (!data || Object.keys(data).length === 0) addToast("error", "Markov returned empty");
    } catch (e: any) { addToast("error", e.message); }
    setLoading(l => ({ ...l, markov: false }));
  }

  async function runTimeDecay() {
    setLoading(l => ({ ...l, timedecay: true }));
    try {
      const res = await api.dsAlgorithms.multiTouchAttributionTimeDecay({ paths, halfLife });
      const data = res.data || res;
      setTimeDecayResult(data);
      if (!data || Object.keys(data).length === 0) addToast("error", "Time decay returned empty");
    } catch (e: any) { addToast("error", e.message); }
    setLoading(l => ({ ...l, timedecay: false }));
  }

  function addConversion() {
    setConversions(c => [...c, randomConversion()]);
  }

  function removeConversion(i: number) {
    setConversions(c => c.filter((_, idx) => idx !== i));
  }

  function shapleyAttributionData(): { name: string; value: number }[] {
    if (!shapleyResult) return [];
    const val = shapleyResult.attribution || shapleyResult.scores || shapleyResult;
    if (Array.isArray(val)) return val.map((v: any) => ({ name: v.channel || v.name || v.key, value: v.value || v.score || v.attribution || 0 }));
    return Object.entries(val).map(([k, v]) => ({ name: k, value: Number(v) || 0 }));
  }

  function markovChannelData(): { name: string; importance: number }[] {
    if (!markovResult) return [];
    const channels = markovResult.channelImportance || markovResult.channels || markovResult;
    if (Array.isArray(channels)) return channels.map((c: any) => ({ name: c.channel || c.name || c.key, importance: c.importance || c.value || c.score || 0 }));
    return [];
  }

  function markovRemovalData(): { name: string; removalEffect: number }[] {
    if (!markovResult) return [];
    const effects = markovResult.removalEffects || markovResult.effects || [];
    if (Array.isArray(effects)) return effects.map((e: any) => ({ name: e.channel || e.name || e.key, removalEffect: e.removalEffect || e.effect || e.value || 0 }));
    return [];
  }

  function timeDecayData(): { name: string; value: number }[] {
    if (!timeDecayResult) return [];
    const val = timeDecayResult.attribution || timeDecayResult.scores || timeDecayResult;
    if (Array.isArray(val)) return val.map((v: any) => ({ name: v.channel || v.name || v.key, value: v.value || v.score || v.attribution || 0 }));
    return Object.entries(val).map(([k, v]) => ({ name: k, value: Number(v) || 0 }));
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "shapley", label: "Shapley Attribution", icon: PieChartIcon },
    { key: "markov", label: "Markov Attribution", icon: GitBranch },
    { key: "timedecay", label: "Time Decay", icon: Clock },
  ];

  const shapleyData = shapleyAttributionData();
  const markovChannels = markovChannelData();
  const markovRemovals = markovRemovalData();
  const timeDecayChartData = timeDecayData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-n0va-400" /> Attribution Analytics
          </h1>
          <p className="text-gray-400 mt-1">Multi-touch attribution models — Shapley, Markov chains, and time-decay analysis</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-800 pb-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-n0va-400 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          ><t.icon className="w-4 h-4" /> {t.label}</button>
        ))}
      </div>

      {tab === "shapley" && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Shapley Value Attribution</h2>
              <div className="flex gap-2">
                <button onClick={addConversion} className="btn-secondary"><Plus className="w-4 h-4" /> Add Conversion</button>
                <button onClick={runShapley} className="btn-primary" disabled={loading.shapley}>
                  {loading.shapley ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Calculate
                </button>
              </div>
            </div>
            <div className="overflow-x-auto mb-4 max-h-48 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2">User</th>
                  <th className="text-left py-2">Interactions</th>
                  <th className="text-right py-2">Value</th>
                  <th className="text-right py-2"></th>
                </tr></thead>
                <tbody>
                  {conversions.map((c, i) => (
                    <tr key={i} className="border-b border-gray-800/50 text-gray-300">
                      <td className="py-2">{c.userId}</td>
                      <td className="py-2">{c.interactions.join(", ")}</td>
                      <td className="py-2 text-right">${c.conversionValue}</td>
                      <td className="py-2 text-right">
                        <button onClick={() => removeConversion(i)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {shapleyData.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Attribution Results</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={shapleyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {shapleyData.map((_, i) => <Cell key={i} fill={MODEL_COLORS[i % MODEL_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-gray-400 border-b border-gray-800">
                      <th className="text-left py-2">Channel</th>
                      <th className="text-right py-2">Attribution</th>
                      <th className="text-right py-2">Share</th>
                    </tr></thead>
                    <tbody>
                      {shapleyData.map((d, i) => {
                        const total = shapleyData.reduce((s, x) => s + x.value, 0);
                        return (
                          <tr key={i} className="border-b border-gray-800/50 text-gray-300">
                            <td className="py-2 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length] }} />{d.name}</td>
                            <td className="py-2 text-right font-medium text-white">${d.value.toFixed(2)}</td>
                            <td className="py-2 text-right">{(total > 0 ? (d.value / total * 100) : 0).toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {shapleyData.length === 0 && !loading.shapley && (
            <div className="card p-8 text-center text-gray-500">Click "Calculate" to run Shapley value attribution</div>
          )}
        </div>
      )}

      {tab === "markov" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={runMarkov} className="btn-primary" disabled={loading.markov}>
              {loading.markov ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Run Markov
            </button>
          </div>
          {markovChannels.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Channel Importance</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={markovChannels} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: "#9ca3af", fontSize: 12 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="importance" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {markovRemovals.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Removal Effects</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left py-2">Channel</th>
                    <th className="text-right py-2">Removal Effect</th>
                  </tr></thead>
                  <tbody>
                    {markovRemovals.map((d, i) => (
                      <tr key={i} className="border-b border-gray-800/50 text-gray-300">
                        <td className="py-2 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length] }} />{d.name}</td>
                        <td className="py-2 text-right font-medium text-white">{(d.removalEffect * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {markovChannels.length === 0 && !loading.markov && (
            <div className="card p-8 text-center text-gray-500">Click "Run Markov" to compute conversion attribution</div>
          )}
        </div>
      )}

      {tab === "timedecay" && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-end gap-6 mb-4">
              <div className="flex-1">
                <label className="label">Decay Half-Life (days)</label>
                <div className="flex items-center gap-4">
                  <input type="range" min={3} max={30} value={halfLife} onChange={e => setHalfLife(Number(e.target.value))} className="w-full accent-n0va-400" />
                  <span className="text-white font-medium text-sm w-8 text-right">{halfLife}d</span>
                </div>
              </div>
              <button onClick={runTimeDecay} className="btn-primary" disabled={loading.timedecay}>
                {loading.timedecay ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Calculate
              </button>
            </div>
          </div>
          {timeDecayChartData.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Time-Decay Attribution (half-life: {halfLife}d)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeDecayChartData} margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {timeDecayChartData.map((_, i) => <Cell key={i} fill={MODEL_COLORS[i % MODEL_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead><tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left py-2">Channel</th>
                    <th className="text-right py-2">Attribution</th>
                    <th className="text-right py-2">Share</th>
                  </tr></thead>
                  <tbody>
                    {timeDecayChartData.map((d, i) => {
                      const total = timeDecayChartData.reduce((s, x) => s + x.value, 0);
                      return (
                        <tr key={i} className="border-b border-gray-800/50 text-gray-300">
                          <td className="py-2">{d.name}</td>
                          <td className="py-2 text-right font-medium text-white">${d.value.toFixed(2)}</td>
                          <td className="py-2 text-right">{(total > 0 ? (d.value / total * 100) : 0).toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {timeDecayChartData.length === 0 && !loading.timedecay && (
            <div className="card p-8 text-center text-gray-500">Click "Calculate" to run time-decay attribution</div>
          )}
        </div>
      )}
    </div>
  );
}
