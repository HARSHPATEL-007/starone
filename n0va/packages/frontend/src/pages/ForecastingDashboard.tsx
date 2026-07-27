import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area
} from "recharts";
import {
  TrendingUp, DollarSign, BarChart3, Play, RotateCcw,
  Sliders, Table
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

const MODEL_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#ec4899"];

const TABS = [
  { id: "demand", label: "Demand Forecast", icon: TrendingUp },
  { id: "revenue", label: "Revenue Monte Carlo", icon: DollarSign },
  { id: "creative", label: "Creative Forecast", icon: BarChart3 },
];

const demandData = [120, 135, 110, 150, 180, 165, 145, 160, 140, 155, 130, 170, 190, 210, 185, 220, 250, 230, 200, 215, 195, 210, 185, 225];
const revenueData = [50000, 52000, 48000, 55000, 62000, 58000, 56000, 59000, 61000, 64000, 60000, 65000];
const creativeData = [3.2, 3.5, 3.8, 3.6, 4.1, 3.9, 4.3, 4.0, 4.5, 4.2];

interface ForecastResult {
  forecast: number[];
  seasonalFactors?: number[];
  smoothed?: number[];
  trend?: number[];
  meanForecast?: number[];
  lowerBound?: number[];
  upperBound?: number[];
}

export default function ForecastingDashboard() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("demand");
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);

  const [seasonLength, setSeasonLength] = useState(12);
  const [horizon, setHorizon] = useState(6);

  const [nSimulations, setNSimulations] = useState(1000);

  const [alpha, setAlpha] = useState(0.3);
  const [beta, setBeta] = useState(0.1);
  const [creativeHorizon, setCreativeHorizon] = useState(5);

  const runDemandForecast = async () => {
    setLoading(true);
    try {
      const res = await api.dsAlgorithms.demandForecastSeasonal({
        data: demandData, seasonLength, horizon
      });
      const forecast = res.forecast || [];
      const factors = res.seasonalFactors || [];
      setResult({ forecast, seasonalFactors: factors });
      showToast("Demand forecast complete", "success");
    } catch {
      showToast("Demand forecast failed", "error");
    }
    setLoading(false);
  };

  const runRevenueMonteCarlo = async () => {
    setLoading(true);
    try {
      const res = await api.dsAlgorithms.revenueForecastMonteCarlo({
        historicalRevenue: revenueData, nSimulations
      });
      setResult({
        meanForecast: res.meanForecast || [],
        lowerBound: res.lowerBound || [],
        upperBound: res.upperBound || [],
      });
      showToast("Revenue simulation complete", "success");
    } catch {
      showToast("Revenue simulation failed", "error");
    }
    setLoading(false);
  };

  const runCreativeForecast = async () => {
    setLoading(true);
    try {
      const res = await api.dsAlgorithms.creativePerformanceForecast({
        historicalData: creativeData, alpha, beta, horizon: creativeHorizon
      });
      setResult({
        forecast: res.forecast || [],
        smoothed: res.smoothed || [],
        trend: res.trend || [],
      });
      showToast("Creative forecast complete", "success");
    } catch {
      showToast("Creative forecast failed", "error");
    }
    setLoading(false);
  };

  const reset = () => {
    setResult(null);
  };

  const demandChartData = () => {
    const data: { name: string; Historical?: number; Forecast?: number }[] = [];
    demandData.forEach((v, i) => data.push({ name: `M${i + 1}`, Historical: v }));
    if (result) {
      for (let i = 0; i < result.forecast.length; i++) {
        const idx = demandData.length + i;
        data.push({ name: `M${idx + 1}`, Forecast: result.forecast[i] });
      }
    }
    return data;
  };

  const seasonalChartData = () => {
    if (!result?.seasonalFactors) return [];
    return result.seasonalFactors.map((v, i) => ({ name: `S${i + 1}`, factor: v }));
  };

  const revenueChartData = () => {
    const data: { name: string; Historical?: number; Mean?: number; Lower?: number; Upper?: number }[] = [];
    revenueData.forEach((v, i) => data.push({ name: `M${i + 1}`, Historical: v }));
    if (result?.meanForecast) {
      for (let i = 0; i < result.meanForecast.length; i++) {
        const idx = revenueData.length + i;
        data.push({
          name: `M${idx + 1}`,
          Mean: result.meanForecast[i],
          Lower: result.lowerBound?.[i],
          Upper: result.upperBound?.[i],
        });
      }
    }
    return data;
  };

  const creativeChartData = () => {
    const data: { name: string; Historical?: number; Smoothed?: number; Trend?: number; Forecast?: number }[] = [];
    creativeData.forEach((v, i) => data.push({ name: `W${i + 1}`, Historical: v }));
    if (result) {
      if (result.smoothed) {
        result.smoothed.forEach((v, i) => {
          if (!data[i]) data.push({ name: `W${i + 1}` });
          data[i].Smoothed = v;
        });
      }
      if (result.trend) {
        result.trend.forEach((v, i) => {
          if (!data[i]) data.push({ name: `W${i + 1}` });
          data[i].Trend = v;
        });
      }
      if (result.forecast) {
        for (let i = 0; i < result.forecast.length; i++) {
          const idx = creativeData.length + i;
          data.push({ name: `W${idx + 1}`, Forecast: result.forecast[i] });
        }
      }
    }
    return data;
  };

  const renderDemandTab = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Demand Forecast (Seasonal Decomposition)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={demandChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Historical" stroke={MODEL_COLORS[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Forecast" stroke={MODEL_COLORS[2]} strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {result?.seasonalFactors && result.seasonalFactors.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Seasonal Factors</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonalChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="factor" fill={MODEL_COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Season Length</label>
            <select className="input" value={seasonLength} onChange={e => setSeasonLength(Number(e.target.value))}>
              <option value={4}>4</option>
              <option value={6}>6</option>
              <option value={12}>12</option>
            </select>
          </div>
          <div>
            <label className="label">Forecast Horizon</label>
            <input className="input" type="number" min={3} max={12} value={horizon} onChange={e => setHorizon(Number(e.target.value))} />
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn-primary" onClick={runDemandForecast} disabled={loading}>
            <Play className="w-4 h-4 mr-2" /> Run Forecast
          </button>
          <button className="btn-secondary" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </button>
        </div>
      </div>
    </div>
  );

  const renderRevenueTab = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue Monte Carlo Simulation</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="Upper" stroke="transparent" fill={MODEL_COLORS[1]} fillOpacity={0.15} />
              <Area type="monotone" dataKey="Lower" stroke="transparent" fill={MODEL_COLORS[1]} fillOpacity={0.15} />
              <Line type="monotone" dataKey="Historical" stroke={MODEL_COLORS[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Mean" stroke={MODEL_COLORS[1]} strokeWidth={2} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="Upper" stroke={MODEL_COLORS[3]} strokeWidth={1} strokeDasharray="3 3" dot={false} />
              <Line type="monotone" dataKey="Lower" stroke={MODEL_COLORS[3]} strokeWidth={1} strokeDasharray="3 3" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {result?.meanForecast && result.meanForecast.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Table className="w-4 h-4" /> Forecast Table</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Period</th>
                  <th className="text-right py-2 px-3">Mean Forecast</th>
                  <th className="text-right py-2 px-3">Lower Bound</th>
                  <th className="text-right py-2 px-3">Upper Bound</th>
                </tr>
              </thead>
              <tbody>
                {result.meanForecast.map((v, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 px-3 font-medium">M{revenueData.length + i + 1}</td>
                    <td className="text-right py-2 px-3">${Math.round(v).toLocaleString()}</td>
                    <td className="text-right py-2 px-3 text-red-500">${Math.round(result.lowerBound?.[i] || 0).toLocaleString()}</td>
                    <td className="text-right py-2 px-3 text-green-500">${Math.round(result.upperBound?.[i] || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="mb-4">
          <label className="label">
            <Sliders className="w-4 h-4 mr-1 inline" /> Simulations (200–2000)
          </label>
          <input className="input" type="range" min={200} max={2000} step={100} value={nSimulations} onChange={e => setNSimulations(Number(e.target.value))} />
          <span className="ml-3 text-sm font-medium">{nSimulations}</span>
        </div>
        <div className="flex gap-3">
          <button className="btn-primary" onClick={runRevenueMonteCarlo} disabled={loading}>
            <Play className="w-4 h-4 mr-2" /> Run Simulation
          </button>
          <button className="btn-secondary" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </button>
        </div>
      </div>
    </div>
  );

  const renderCreativeTab = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Creative Performance Forecast (Holt Linear)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={creativeChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Historical" stroke={MODEL_COLORS[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Smoothed" stroke={MODEL_COLORS[1]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Trend" stroke={MODEL_COLORS[2]} strokeWidth={1} strokeDasharray="3 3" dot={false} />
              <Line type="monotone" dataKey="Forecast" stroke={MODEL_COLORS[3]} strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label">Alpha (level)</label>
            <input className="input" type="range" min={0.1} max={0.9} step={0.05} value={alpha} onChange={e => setAlpha(Number(e.target.value))} />
            <span className="ml-2 text-sm font-medium">{alpha.toFixed(2)}</span>
          </div>
          <div>
            <label className="label">Beta (trend)</label>
            <input className="input" type="range" min={0.01} max={0.5} step={0.01} value={beta} onChange={e => setBeta(Number(e.target.value))} />
            <span className="ml-2 text-sm font-medium">{beta.toFixed(2)}</span>
          </div>
          <div>
            <label className="label">Forecast Horizon</label>
            <input className="input" type="number" min={1} max={10} value={creativeHorizon} onChange={e => setCreativeHorizon(Number(e.target.value))} />
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn-primary" onClick={runCreativeForecast} disabled={loading}>
            <Play className="w-4 h-4 mr-2" /> Run Forecast
          </button>
          <button className="btn-secondary" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Forecasting Dashboard</h1>

      <div className="flex gap-2 mb-6 border-b pb-2 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setResult(null); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {!loading && activeTab === "demand" && renderDemandTab()}
      {!loading && activeTab === "revenue" && renderRevenueTab()}
      {!loading && activeTab === "creative" && renderCreativeTab()}
    </div>
  );
}
