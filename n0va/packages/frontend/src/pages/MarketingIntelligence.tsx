import { useState, useEffect } from "react";
import { BarChart3, GitCompare, TestTube, DollarSign, TrendingUp, RefreshCw, Loader, CheckCircle, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

type Tab = "attribution" | "models" | "incrementality" | "budget";

const MODEL_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"];

export default function MarketingIntelligence() {
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>("attribution");
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<any>(null);
  const [modelComparison, setModelComparison] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState("last_click");
  const [incrementality, setIncrementality] = useState<any>(null);
  const [campaignId, setCampaignId] = useState("");
  const [testDays, setTestDays] = useState(30);
  const [prediction, setPrediction] = useState<any>(null);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [predictPlatform, setPredictPlatform] = useState("google_ads");
  const [optPlatforms, setOptPlatforms] = useState([{ name: "google_ads", currentBudget: 5000 }, { name: "meta_ads", currentBudget: 3000 }]);
  const [totalBudget, setTotalBudget] = useState(10000);
  const [urgency, setUrgency] = useState("balanced");

  useEffect(() => { loadAttribution(); }, [selectedModel]);

  async function loadAttribution() {
    setLoading(true);
    try {
      const res = await api.marketingIntelligence.attributionDashboard(selectedModel);
      setDash(res.data || res);
    } catch { setDash(null); }
    setLoading(false);
  }

  async function loadModelComparison() {
    try {
      const res = await api.marketingIntelligence.attributionModels();
      setModelComparison(res.data || res);
    } catch { setModelComparison(null); }
  }

  async function handleIncrementality() {
    if (!campaignId) return;
    try {
      const res = await api.marketingIntelligence.incrementalityTest(campaignId, testDays);
      setIncrementality(res.data || res);
    } catch (e: any) { addToast("error", e.message); }
  }

  async function handlePredict() {
    try {
      const res = await api.marketingIntelligence.predictROAS(predictPlatform);
      setPrediction(res.data || res);
    } catch (e: any) { addToast("error", e.message); }
  }

  async function handleOptimize() {
    try {
      const res = await api.marketingIntelligence.optimizeBudget(optPlatforms, totalBudget, urgency);
      setAllocations(res.data || res || []);
    } catch (e: any) { addToast("error", e.message); }
  }

  async function handleForecast() {
    try {
      const res = await api.marketingIntelligence.budgetForecast(optPlatforms.map(p => p.name), totalBudget, 30);
      setForecast(res.data || res);
    } catch (e: any) { addToast("error", e.message); }
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "attribution", label: "Attribution Dashboard", icon: BarChart3 },
    { key: "models", label: "Model Comparison", icon: GitCompare },
    { key: "incrementality", label: "Incrementality", icon: TestTube },
    { key: "budget", label: "Budget Optimizer", icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-n0va-400" /> Marketing Intelligence
          </h1>
          <p className="text-gray-400 mt-1">Multi-touch attribution, model comparison, incrementality testing, and budget optimization</p>
        </div>
        <button onClick={loadAttribution} className="btn-secondary btn-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-800 pb-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key === "models") loadModelComparison(); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-n0va-400 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          ><t.icon className="w-4 h-4" /> {t.label}</button>
        ))}
      </div>

      {tab === "attribution" && (
        <div className="space-y-6">
          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-400">Attribution Model:</label>
            {["first_click", "last_click", "linear", "time_decay", "position_based"].map(m => (
              <button key={m} onClick={() => setSelectedModel(m)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  selectedModel === m ? "border-n0va-400 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-400 hover:text-gray-300"
                }`}
              >{m.replace(/_/g, " ")}</button>
            ))}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader className="w-6 h-6 animate-spin text-n0va-400" /></div>
          ) : dash ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="card p-5">
                <p className="text-sm text-gray-400">Total Conversions</p>
                <p className="text-2xl font-bold text-white">{dash.totalConversions || 0}</p>
              </div>
              <div className="card p-5">
                <p className="text-sm text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-green-400">${(dash.totalRevenue || 0).toLocaleString()}</p>
              </div>
              <div className="card p-5">
                <p className="text-sm text-gray-400">Overall ROAS</p>
                <p className="text-2xl font-bold text-n0va-400">{dash.overallROAS || 0}x</p>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-gray-500">No attribution data available. Create an attribution path first.</div>
          )}
          {dash?.channelCredits?.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Channel Credits</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={dash.channelCredits} dataKey="attributedRevenue" nameKey="channel" cx="50%" cy="50%" outerRadius={80}>
                      {dash.channelCredits.map((_: any, i: number) => <Cell key={i} fill={MODEL_COLORS[i % MODEL_COLORS.length]} />)}
                    </Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-gray-400 border-b border-gray-800">
                      <th className="text-left py-2">Channel</th>
                      <th className="text-right py-2">Revenue</th>
                      <th className="text-right py-2">ROAS</th>
                      <th className="text-right py-2">Share</th>
                    </tr></thead>
                    <tbody>
                      {dash.channelCredits.map((c: any) => (
                        <tr key={c.channel} className="border-b border-gray-800/50 text-gray-300">
                          <td className="py-2">{c.channel}</td>
                          <td className="py-2 text-right">${c.attributedRevenue?.toLocaleString()}</td>
                          <td className="py-2 text-right">{c.roi}x</td>
                          <td className="py-2 text-right">{c.creditShare}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "models" && (
        <div className="space-y-6">
          <button onClick={loadModelComparison} className="btn-secondary"><RefreshCw className="w-4 h-4" /> Load Model Comparison</button>
          {modelComparison ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {Object.entries(modelComparison).map(([model, data]: [string, any]) => (
                <div key={model} className="card p-5">
                  <h3 className="text-sm font-medium text-white capitalize mb-3">{model.replace(/_/g, " ")}</h3>
                  <p className="text-xs text-gray-400">Revenue</p>
                  <p className="text-lg font-bold text-green-400">${(data.totalRevenue || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-2">ROAS</p>
                  <p className="text-lg font-bold text-n0va-400">{data.roas}x</p>
                  <p className="text-xs text-gray-400 mt-2">Top Channel</p>
                  <p className="text-sm text-white">{data.topChannel}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-gray-500">Click "Load Model Comparison" to compare attribution models</div>
          )}
        </div>
      )}

      {tab === "incrementality" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Incrementality Test</h2>
            <div className="mb-4">
              <label className="label">Campaign ID</label>
              <input value={campaignId} onChange={e => setCampaignId(e.target.value)} className="input" placeholder="cmp_001" />
            </div>
            <div className="mb-4">
              <label className="label">Test Duration (days)</label>
              <input type="number" value={testDays} onChange={e => setTestDays(Number(e.target.value))} className="input" min={7} max={90} />
            </div>
            <button onClick={handleIncrementality} className="btn-primary" disabled={!campaignId}><TestTube className="w-4 h-4" /> Simulate Test</button>
          </div>
          {incrementality && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Results</h2>
              <div className="space-y-4">
                <div className="flex justify-between p-3 bg-gray-900 rounded-lg">
                  <span className="text-sm text-gray-400">Control Revenue</span>
                  <span className="text-sm font-medium text-white">${incrementality.controlRevenue?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-900 rounded-lg">
                  <span className="text-sm text-gray-400">Exposed Revenue</span>
                  <span className="text-sm font-medium text-green-400">${incrementality.exposedRevenue?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-900 rounded-lg">
                  <span className="text-sm text-gray-400">Incremental Revenue</span>
                  <span className="text-sm font-medium text-n0va-400">${incrementality.incrementalRevenue?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-900 rounded-lg">
                  <span className="text-sm text-gray-400">Lift</span>
                  <span className="text-sm font-medium text-white">{incrementality.liftPercent}%</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-900 rounded-lg">
                  <span className="text-sm text-gray-400">Significance</span>
                  <span className={`text-sm font-medium ${incrementality.significance === "significant" ? "text-green-400" : "text-yellow-400"}`}>
                    {incrementality.significance === "significant" ? <><CheckCircle className="w-4 h-4 inline mr-1" />Significant</> : <><AlertCircle className="w-4 h-4 inline mr-1" />Not Significant</>}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "budget" && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">ROAS Prediction</h2>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="label">Platform</label>
                <select value={predictPlatform} onChange={e => setPredictPlatform(e.target.value)} className="input">
                  {["google_ads", "meta_ads", "linkedin_ads", "tiktok_ads", "snapchat_ads", "pinterest_ads", "amazon_ads"].map(p => (
                    <option key={p} value={p}>{p.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <button onClick={handlePredict} className="btn-primary"><TrendingUp className="w-4 h-4" /> Predict</button>
            </div>
            {prediction && (
              <div className="mt-4 grid grid-cols-5 gap-3 p-4 bg-gray-900 rounded-lg">
                <div><p className="text-xs text-gray-400">Predicted ROAS</p><p className="text-lg font-bold text-n0va-400">{prediction.predictedROAS}x</p></div>
                <div><p className="text-xs text-gray-400">Lower Bound</p><p className="text-sm text-white">{prediction.lowerBound}x</p></div>
                <div><p className="text-xs text-gray-400">Upper Bound</p><p className="text-sm text-white">{prediction.upperBound}x</p></div>
                <div><p className="text-xs text-gray-400">Seasonality</p><p className="text-sm text-white">{prediction.seasonalityFactor}x</p></div>
                <div><p className="text-xs text-gray-400">Trend</p><p className={`text-sm capitalize ${prediction.trend === "improving" ? "text-green-400" : prediction.trend === "declining" ? "text-red-400" : "text-yellow-400"}`}>{prediction.trend}</p></div>
              </div>
            )}
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Budget Optimization</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Total Budget</label>
                <input type="number" value={totalBudget} onChange={e => setTotalBudget(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="label">Urgency</label>
                <select value={urgency} onChange={e => setUrgency(e.target.value)} className="input">
                  <option value="conservative">Conservative</option>
                  <option value="balanced">Balanced</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <p className="text-sm text-gray-400">Platform Budgets</p>
              {optPlatforms.map((p, i) => (
                <div key={i} className="flex gap-3">
                  <select value={p.name} onChange={e => { const next = [...optPlatforms]; next[i].name = e.target.value; setOptPlatforms(next); }} className="input flex-1">
                    {["google_ads", "meta_ads", "linkedin_ads", "tiktok_ads", "snapchat_ads", "pinterest_ads", "amazon_ads"].map(pn => (
                      <option key={pn} value={pn}>{pn.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
                    ))}
                  </select>
                  <input type="number" value={p.currentBudget} onChange={e => { const next = [...optPlatforms]; next[i].currentBudget = Number(e.target.value); setOptPlatforms(next); }} className="input w-32" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleOptimize} className="btn-primary"><DollarSign className="w-4 h-4" /> Optimize</button>
              <button onClick={handleForecast} className="btn-secondary"><BarChart3 className="w-4 h-4" /> Forecast</button>
            </div>
          </div>
          {allocations.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Allocation Results</h3>
              <div className="h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allocations}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="platform" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="allocated" fill="#6b7280" name="Current" />
                    <Bar dataKey="recommended" fill="#10b981" name="Recommended" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left py-2">Platform</th>
                    <th className="text-right py-2">Current</th>
                    <th className="text-right py-2">Recommended</th>
                    <th className="text-right py-2">Predicted ROAS</th>
                    <th className="text-right py-2">Confidence</th>
                  </tr></thead>
                  <tbody>
                    {allocations.map((a: any) => (
                      <tr key={a.platform} className="border-b border-gray-800/50 text-gray-300">
                        <td className="py-2">{a.platform.replace("_", " ")}</td>
                        <td className="py-2 text-right">${a.allocated?.toLocaleString()}</td>
                        <td className="py-2 text-right font-medium text-green-400">${a.recommended?.toLocaleString()}</td>
                        <td className="py-2 text-right">{a.predictedROAS}x</td>
                        <td className="py-2 text-right">{a.confidence}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {forecast && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">30-Day Forecast</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-gray-900 rounded-lg"><p className="text-xs text-gray-400">Daily Budget</p><p className="text-lg font-bold text-white">${forecast.dailyBudget?.toLocaleString()}</p></div>
                <div className="p-3 bg-gray-900 rounded-lg"><p className="text-xs text-gray-400">Avg ROAS</p><p className="text-lg font-bold text-n0va-400">{forecast.avgPredictedROAS}x</p></div>
                <div className="p-3 bg-gray-900 rounded-lg"><p className="text-xs text-gray-400">Expected Revenue</p><p className="text-lg font-bold text-green-400">${forecast.expectedRevenue?.toLocaleString()}</p></div>
                <div className="p-3 bg-gray-900 rounded-lg"><p className="text-xs text-gray-400">Expected ROI</p><p className="text-lg font-bold text-n0va-400">{forecast.expectedROI}x</p></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
