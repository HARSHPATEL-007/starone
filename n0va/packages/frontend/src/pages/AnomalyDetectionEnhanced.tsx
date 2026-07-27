import { useState } from "react";
import { api } from "../api/client";
import { AlertTriangle, Activity, ScanLine, GitCompare, Layers } from "lucide-react";

const tabs = [
  { id: "detect", label: "Detect", icon: AlertTriangle },
  { id: "multivariate", label: "Multivariate", icon: Activity },
  { id: "drift", label: "Drift", icon: GitCompare },
  { id: "scan-campaign", label: "Scan Campaign", icon: ScanLine },
  { id: "ensemble", label: "Ensemble", icon: Layers },
];

export default function AnomalyDetectionEnhanced() {
  const [activeTab, setActiveTab] = useState("detect");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleValues = Array.from({ length: 60 }, (_, i) => {
    const base = 100 + Math.sin(i * 0.4) * 15 + Math.random() * 8;
    return i === 30 ? base + 80 : i === 45 ? base - 60 : base;
  });
  const sampleMetrics = {
    impressions: Array.from({ length: 30 }, (_, i) => 5000 + Math.sin(i * 0.5) * 1000 + Math.random() * 500 + (i === 20 ? 8000 : 0)),
    clicks: Array.from({ length: 30 }, (_, i) => 200 + Math.sin(i * 0.5) * 50 + Math.random() * 30 + (i === 20 ? 400 : 0)),
    conversions: Array.from({ length: 30 }, (_, i) => 20 + Math.sin(i * 0.5) * 5 + Math.random() * 3 + (i === 20 ? 40 : 0)),
    spend: Array.from({ length: 30 }, (_, i) => 500 + Math.sin(i * 0.5) * 100 + Math.random() * 50 + (i === 20 ? 800 : 0)),
  };

  async function handleTabAction() {
    setLoading(true); setError(null); setResult(null);
    try {
      const multivariateSeries = sampleValues.map((v, i) => ({
        date: new Date(2025, 0, i + 1).toISOString().slice(0, 10),
        metrics: { impressions: v * 50, clicks: v * 2, conversions: v * 0.2, spend: v * 3 },
      }));
      let res: any;
      switch (activeTab) {
        case "detect":
          res = await api.anomalyDetectionEnhanced.detect({ metric: "conversions", entityId: "camp_001", values: sampleValues });
          break;
        case "multivariate":
          res = await api.anomalyDetectionEnhanced.multivariate({ metric: "multiple", entityId: "camp_001", timeSeries: multivariateSeries, alpha: 0.01 });
          break;
        case "drift":
          res = await api.anomalyDetectionEnhanced.drift({ metric: "conversions", entityId: "camp_001", values: sampleValues, windowSize: 14, alpha: 0.05 });
          break;
        case "scan-campaign":
          res = await api.anomalyDetectionEnhanced.scanCampaign({ campaignId: "camp_001", metrics: sampleMetrics });
          break;
        case "ensemble":
          res = await api.anomalyDetectionEnhanced.ensemble({ metric: "conversions", entityId: "camp_001", values: sampleValues });
          break;
      }
      setResult(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function renderResult() {
    if (!result) return null;
    if (activeTab === "detect" || activeTab === "ensemble") {
      const r = result as any;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/50 p-3 rounded-lg text-center">
              <div className="text-xs text-gray-500">Flagged</div>
              <div className="text-2xl font-bold text-red-400">{r.summary?.flaggedCount || 0}</div>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg text-center">
              <div className="text-xs text-gray-500">Total Points</div>
              <div className="text-2xl font-bold text-white">{r.points?.length || 0}</div>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg text-center">
              <div className="text-xs text-gray-500">Flag Rate</div>
              <div className="text-2xl font-bold text-yellow-400">{r.summary?.flagRate ? `${(r.summary.flagRate * 100).toFixed(1)}%` : "0%"}</div>
            </div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-lg max-h-60 overflow-y-auto">
            {(r.points || []).map((p: any, i: number) => (
              <div key={i} className={`flex justify-between py-0.5 text-xs ${p.isAnomaly ? "text-red-400" : "text-gray-400"}`}>
                <span>{i}</span>
                <span>{p.value?.toFixed(2)}</span>
                {p.isAnomaly && <span className="text-red-500">ANOMALY</span>}
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (activeTab === "multivariate") {
      const r = result as any;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/50 p-3 rounded-lg text-center">
              <div className="text-xs text-gray-500">Flagged</div>
              <div className="text-2xl font-bold text-red-400">{r.summary?.totalFlagged || 0}</div>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg text-center">
              <div className="text-xs text-gray-500">Points</div>
              <div className="text-2xl font-bold text-white">{r.scores?.length || 0}</div>
            </div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-lg max-h-60 overflow-y-auto">
            {(r.topContributors || []).map((tc: any, i: number) => (
              <div key={i} className="flex justify-between py-0.5 text-xs text-gray-400">
                <span className="text-white">{tc.date}</span>
                <span className="text-n0va-400">{tc.topMetric}: {(tc.topContribution * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (activeTab === "drift") {
      const r = result as any;
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {r.driftDetected !== undefined && (
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <div className="text-xs text-gray-500">Drift Detected</div>
                <div className={`text-xl font-bold ${r.driftDetected ? "text-red-400" : "text-green-400"}`}>{r.driftDetected ? "YES" : "NO"}</div>
              </div>
            )}
            {r.driftType && (
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <div className="text-xs text-gray-500">Drift Type</div>
                <div className="text-xl font-bold text-yellow-400">{r.driftType}</div>
              </div>
            )}
            {r.pValue !== undefined && (
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <div className="text-xs text-gray-500">p-value</div>
                <div className="text-xl font-bold text-white">{r.pValue.toFixed(4)}</div>
              </div>
            )}
          </div>
          {r.stats && (
            <div className="bg-gray-800/50 p-3 rounded-lg text-xs text-gray-400">
              {Object.entries(r.stats).map(([k, v]) => (
                <div key={k} className="flex justify-between py-1">
                  <span className="capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                  <span className="text-white">{(v as number).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (activeTab === "scan-campaign") {
      const r = result as any;
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(r.results || {}).map(([metricName, metricResult]: [string, any]) => (
            <div key={metricName} className="bg-gray-800/50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-white capitalize mb-2">{metricName}</h3>
              <div className="text-xs text-gray-400 space-y-1">
                <div className="flex justify-between"><span>Anomalies</span><span className="text-red-400">{metricResult.anomalyCount || 0}</span></div>
                <div className="flex justify-between"><span>Rate</span><span>{metricResult.anomalyRate ? `${(metricResult.anomalyRate * 100).toFixed(1)}%` : "0%"}</span></div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Anomaly Detection (Enhanced)</h1>
        <p className="text-gray-400 text-sm mt-1">Isolation forest, multivariate detection, drift monitoring, campaign scanning & ensemble</p>
      </div>
      <div className="flex gap-2 border-b border-gray-800 pb-2 flex-wrap">
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
          {loading ? "Running..." : `Run ${activeTab}`}
        </button>
        {error && <div className="bg-red-900/30 border border-red-800 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        {renderResult()}
      </div>
    </div>
  );
}
