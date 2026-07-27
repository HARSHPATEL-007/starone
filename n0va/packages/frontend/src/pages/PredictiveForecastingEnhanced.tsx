import { useState } from "react";
import { api } from "../api/client";
import { BarChart3, TrendingUp, AlertTriangle, Split } from "lucide-react";

const tabs = [
  { id: "decompose", label: "Decompose", icon: Split },
  { id: "changepoints", label: "Changepoints", icon: AlertTriangle },
  { id: "arima", label: "ARIMA", icon: TrendingUp },
  { id: "ensemble", label: "Ensemble", icon: BarChart3 },
];

export default function PredictiveForecastingEnhanced() {
  const [activeTab, setActiveTab] = useState("decompose");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleHistory = Array.from({ length: 60 }, (_, i) => ({
    date: new Date(2025, 0, i + 1).toISOString().slice(0, 10),
    value: 100 + Math.sin(i * 0.4) * 20 + (i % 7 === 0 ? 30 : 0) + Math.random() * 10,
  }));

  async function handleTabAction() {
    setLoading(true); setError(null); setResult(null);
    try {
      const values = sampleHistory.map((d) => d.value);
      let res: any;
      switch (activeTab) {
        case "decompose":
          res = await api.predictiveForecastingEnhanced.decompose({ values, seasonLength: 7 });
          break;
        case "changepoints":
          res = await api.predictiveForecastingEnhanced.changepoints({ values, minSegmentSize: 5 });
          break;
        case "arima":
          res = await api.predictiveForecastingEnhanced.arima({
            campaignId: "camp_001", metric: "impressions", history: values, horizon: 14, options: { p: 2, d: 1, q: 2 },
          });
          break;
        case "ensemble":
          res = await api.predictiveForecastingEnhanced.ensemble({
            campaignId: "camp_001", metric: "impressions", history: values, horizon: 14,
          });
          break;
      }
      setResult(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function renderResult() {
    if (!result) return null;
    if (activeTab === "decompose") {
      const d = result as any;
      return (
        <div className="space-y-4">
          <div><span className="text-gray-400">Trend Strength:</span> <span className="text-white font-bold">{(d.trendStrength * 100).toFixed(1)}%</span></div>
          <div><span className="text-gray-400">Seasonal Strength:</span> <span className="text-white font-bold">{(d.seasonalStrength * 100).toFixed(1)}%</span></div>
          <div className="grid grid-cols-3 gap-4">
            {["trend", "seasonal", "residual"].map((comp) => (
              <div key={comp} className="bg-gray-800/50 p-3 rounded-lg">
                <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">{comp}</h4>
                <div className="text-xs text-gray-400 max-h-40 overflow-y-auto">
                  {d[comp]?.map((v: number, i: number) => (
                    <div key={i} className="flex justify-between py-0.5">
                      <span>{i}</span><span>{v.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (activeTab === "changepoints") {
      const cps = result as any[];
      return (
        <div>
          <div className="text-gray-400 mb-3">Changepoints found: <span className="text-white font-bold">{cps.length}</span></div>
          {cps.length > 0 && (
            <div className="bg-gray-800/50 p-3 rounded-lg max-h-60 overflow-y-auto">
              {cps.map((cp: any, i: number) => (
                <div key={i} className="flex justify-between py-1 text-xs text-gray-400">
                  <span>Index {cp.index}</span>
                  <span className="text-yellow-400">{cp.magnitude.toFixed(4)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (activeTab === "arima") {
      const f = result as any;
      return (
        <div className="space-y-3">
          <div><span className="text-gray-400">Horizon:</span> <span className="text-white">{f.forecast?.length}</span></div>
          <div className="bg-gray-800/50 p-3 rounded-lg max-h-60 overflow-y-auto">
            {f.forecast?.map((v: number, i: number) => (
              <div key={i} className="flex justify-between py-0.5 text-xs">
                <span className="text-gray-400">t+{i + 1}</span>
                <span className="text-n0va-400">{v.toFixed(2)}</span>
              </div>
            ))}
          </div>
          {f.diagnostics && (
            <div className="text-xs text-gray-400 space-y-1">
              <div>AIC: {f.diagnostics.aic?.toFixed(2)}</div>
            </div>
          )}
        </div>
      );
    }
    if (activeTab === "ensemble") {
      const e = result as any;
      return (
        <div className="space-y-3">
          <div><span className="text-gray-400">Models used:</span> <span className="text-white">{e.models?.length}</span></div>
          <div className="bg-gray-800/50 p-3 rounded-lg max-h-60 overflow-y-auto">
            {e.forecast?.map((v: number, i: number) => (
              <div key={i} className="flex justify-between py-0.5 text-xs">
                <span className="text-gray-400">t+{i + 1}</span>
                <span className="text-green-400">{v.toFixed(2)}</span>
              </div>
            ))}
          </div>
          {e.modelWeights && (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(e.modelWeights).map(([k, w]) => (
                <div key={k} className="bg-gray-800/50 p-2 rounded text-xs">
                  <span className="text-gray-500">{k}:</span> <span className="text-white">{(w as number * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Predictive Forecasting (Enhanced)</h1>
        <p className="text-gray-400 text-sm mt-1">ARIMA, time series decomposition, changepoint detection & ensemble forecasting</p>
      </div>
      <div className="flex gap-2 border-b border-gray-800 pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/30" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <button onClick={handleTabAction} disabled={loading} className="bg-n0va-600 hover:bg-n0va-500 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 mb-6">
          {loading ? "Running..." : `Run ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
        </button>
        {error && <div className="bg-red-900/30 border border-red-800 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        {renderResult()}
      </div>
    </div>
  );
}
