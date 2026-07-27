import { useState } from "react";
import { api } from "../api/client";
import { GitCompare, Beaker, TrendingUp, Sigma, Globe } from "lucide-react";

const tabs = [
  { id: "did", label: "DiD", icon: GitCompare },
  { id: "synthetic-control", label: "Synth Control", icon: Beaker },
  { id: "cuped", label: "CUPED", icon: TrendingUp },
  { id: "power-analysis", label: "Power Analysis", icon: Sigma },
  { id: "geo-experiment", label: "Geo Experiment", icon: Globe },
];

export default function IncrementalityTesting() {
  const [activeTab, setActiveTab] = useState("did");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [regions] = useState(["us_east", "us_west", "us_central", "eu_west", "eu_north"]);
  const [error, setError] = useState<string | null>(null);

  async function handleTabAction() {
    setLoading(true); setError(null); setResult(null);
    try {
      const preData = Array.from({ length: 30 }, (_, d) => {
        const entry: any = { date: new Date(2025, 0, d + 1).toISOString().slice(0, 10) };
        regions.forEach((r) => { entry[r] = 50 + Math.sin(d * 0.3) * 10 + Math.random() * 15; });
        return entry;
      });
      const postData = Array.from({ length: 14 }, (_, d) => {
        const entry: any = { date: new Date(2025, 1, d + 1).toISOString().slice(0, 10) };
        regions.forEach((r) => { entry[r] = 50 + Math.sin(d * 0.3) * 10 + Math.random() * 15 + (r === "us_east" ? 25 : 0); });
        return entry;
      });
      let res: any;
      switch (activeTab) {
        case "did":
          res = await api.incrementalityTesting.did({ experimentId: "exp_001", name: "Test Campaign", treatmentRegions: ["us_east"], controlRegions: ["us_west", "us_central"], metric: "conversions", treatmentStart: "2025-02-01", treatmentEnd: "2025-02-14", prePeriodData: preData, postPeriodData: postData });
          break;
        case "synthetic-control":
          res = await api.incrementalityTesting.syntheticControl({ experimentId: "exp_001", name: "Test Campaign", treatedRegion: "us_east", donorPool: ["us_west", "us_central", "eu_west", "eu_north"], metric: "conversions", treatmentStart: "2025-02-01", treatmentEnd: "2025-02-14", prePeriodData: preData, postPeriodData: postData });
          break;
        case "cuped":
          res = await api.incrementalityTesting.cuped({ experimentId: "exp_001", name: "Test Campaign", metric: "conversions", prePeriodData: preData.slice(0, 30), postPeriodData: postData });
          break;
        case "power-analysis":
          res = await api.incrementalityTesting.powerAnalysis({ baselineMean: 50, baselineStd: 15, minimumLift: 0.1, alpha: 0.05, beta: 0.2 });
          break;
        case "geo-experiment":
          res = await api.incrementalityTesting.geoExperiment({ experimentId: "exp_001", name: "Test Campaign", treatmentRegions: ["us_east"], controlRegions: ["us_west", "us_central"], metric: "conversions", treatmentStart: "2025-02-01", treatmentEnd: "2025-02-14", prePeriodData: preData, postPeriodData: postData, method: "did" });
          break;
      }
      setResult(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function renderResult() {
    if (!result) return null;
    return (
      <div className="space-y-3 text-sm">
        {Object.entries(result).map(([key, val]) => {
          if (key === "preFit" || key === "synthWeights" || key === "syntheticControlValues") return null;
          return (
            <div key={key} className="flex justify-between border-b border-gray-800 py-2">
              <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
              <span className="text-white font-mono">
                {typeof val === "number" ? (val % 1 === 0 ? val : (val * 100).toFixed(2) + "%") : String(val)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Incrementality Testing</h1>
        <p className="text-gray-400 text-sm mt-1">DiD, Synthetic Control, CUPED, Power Analysis & Geo Experiments</p>
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
