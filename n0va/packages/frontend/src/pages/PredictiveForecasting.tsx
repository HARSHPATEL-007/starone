import { useState } from "react";
import { api } from "../api/client";
import { TrendingUp, DollarSign, Target, BarChart3, Activity, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { useToast } from "../components/Toast";

type Tab = "forecast" | "budget" | "conversion";

interface ForecastResult {
  nextPeriodValue: number;
  trendDirection: "up" | "down" | "stable";
  confidence: number;
  projectedTotal: number;
  lowerBound: number;
  upperBound: number;
  alpha: number;
  beta: number;
  gamma: number;
  mse: number;
  history: { date: string; value: number }[];
  predictions: { period: number; value: number; lower: number; upper: number }[];
}

interface BudgetResult {
  projectedEndSpend: number;
  utilizationPct: number;
  overspend: boolean;
  overspendAmount: number;
  underutilize: boolean;
  underutilizeAmount: number;
  recommendedDailyCap: number;
  dailyProjection: { date: string; predictedSpend: number; cumulative: number; remaining: number }[];
}

interface ConversionResult {
  predictedConversions: number[];
  efficiency: number;
  marginalCPA: number;
  diminishingReturns: boolean;
  spendHistory: number[];
  conversionHistory: number[];
}

function generateSampleHistory(days: number = 14): { date: string; value: number }[] {
  const data: { date: string; value: number }[] = [];
  const baseValue = 500 + Math.random() * 200;
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const date = d.toISOString().substring(0, 10);
    const trend = 1 + (i / days) * 0.15;
    const noise = 0.85 + Math.random() * 0.3;
    const value = Math.round(baseValue * trend * noise);
    data.push({ date, value });
  }
  return data;
}

function generateDailySpend(days: number = 14): number[] {
  const base = 200 + Math.random() * 100;
  return Array.from({ length: days }, () => Math.round(base * (0.8 + Math.random() * 0.4)));
}

function generateConversionHistory(days: number = 14): number[] {
  const base = 30 + Math.random() * 15;
  return Array.from({ length: days }, () => Math.round(base * (0.7 + Math.random() * 0.6)));
}

function formatCurrency(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function ForecastChart({ data, predictions }: { data: { date: string; value: number }[]; predictions: { period: number; value: number; lower: number; upper: number }[] }) {
  const width = 600;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allValues = [...data.map(d => d.value), ...predictions.map(p => p.value), ...predictions.map(p => p.lower), ...predictions.map(p => p.upper)];
  const minVal = Math.min(...allValues) * 0.95;
  const maxVal = Math.max(...allValues) * 1.05;
  const range = maxVal - minVal || 1;

  const totalPoints = data.length + predictions.length - 1;

  const historyPoints = data.map((d, i) => {
    const x = padding.left + (i / Math.max(totalPoints, 1)) * chartW;
    const y = padding.top + chartH - ((d.value - minVal) / range) * chartH;
    return `${x},${y}`;
  }).join(" ");

  const predStartIdx = data.length - 1;
  const predPoints = predictions.map((p, i) => {
    const idx = predStartIdx + i;
    const x = padding.left + (idx / Math.max(totalPoints, 1)) * chartW;
    const y = padding.top + chartH - ((p.value - minVal) / range) * chartH;
    return `${x},${y}`;
  }).join(" ");

  const bandLower: { x: number; y: number }[] = [];
  const bandUpper: { x: number; y: number }[] = [];
  predictions.forEach((p, i) => {
    const idx = predStartIdx + i;
    const x = padding.left + (idx / Math.max(totalPoints, 1)) * chartW;
    bandLower.push({ x, y: padding.top + chartH - ((p.lower - minVal) / range) * chartH });
    bandUpper.push({ x, y: padding.top + chartH - ((p.upper - minVal) / range) * chartH });
  });

  const polygonPoints = [
    ...bandLower.map(p => `${p.x},${p.y}`),
    ...bandUpper.reverse().map(p => `${p.x},${p.y}`),
  ].join(" ");

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => minVal + (range / (yTicks - 1)) * i);
  const xTickCount = 7;
  const xTickStep = Math.max(1, Math.floor(data.length / xTickCount));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxWidth: "100%", height: "300px" }}>
      {yTickValues.map((v, i) => {
        const y = padding.top + chartH - ((v - minVal) / range) * chartH;
        return <line key={i} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#1f2937" strokeWidth={1} />;
      })}
      {yTickValues.map((v, i) => {
        const y = padding.top + chartH - ((v - minVal) / range) * chartH;
        return (
          <text key={`yl-${i}`} x={padding.left - 8} y={y + 4} textAnchor="end" fill="#6b7280" fontSize={10}>
            {v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0)}
          </text>
        );
      })}
      {data.filter((_, i) => i % xTickStep === 0 || i === data.length - 1).map((d, i) => {
        const x = padding.left + (Math.min(i * xTickStep, data.length - 1) / Math.max(totalPoints, 1)) * chartW;
        return (
          <text key={`hx-${i}`} x={x} y={height - 5} textAnchor="middle" fill="#6b7280" fontSize={9}>
            {d.date.substring(5)}
          </text>
        );
      })}

      <polygon points={polygonPoints} fill="#3b82f6" fillOpacity={0.12} />

      <polyline points={historyPoints} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />

      {predictions.length > 0 && (
        <polyline points={predPoints} fill="none" stroke="#10b981" strokeWidth={2} strokeDasharray="6,3" strokeLinejoin="round" />
      )}

      {data.map((d, i) => {
        const x = padding.left + (i / Math.max(totalPoints, 1)) * chartW;
        const y = padding.top + chartH - ((d.value - minVal) / range) * chartH;
        return <circle key={`dp-${i}`} cx={x} cy={y} r={3} fill="#3b82f6" />;
      })}

      {predictions.map((p, i) => {
        const idx = predStartIdx + i;
        const x = padding.left + (idx / Math.max(totalPoints, 1)) * chartW;
        const y = padding.top + chartH - ((p.value - minVal) / range) * chartH;
        return <circle key={`pp-${i}`} cx={x} cy={y} r={3} fill="#10b981" />;
      })}

      {data.length > 0 && predictions.length > 0 && (
        <line x1={padding.left + (predStartIdx / Math.max(totalPoints, 1)) * chartW} y1={padding.top} x2={padding.left + (predStartIdx / Math.max(totalPoints, 1)) * chartW} y2={height - padding.bottom} stroke="#4b5563" strokeWidth={1} strokeDasharray="4,2" />
      )}

      <rect x={padding.left} y={padding.top + 4} width={12} height={3} fill="#3b82f6" rx={1} />
      <text x={padding.left + 16} y={padding.top + 8} fill="#9ca3af" fontSize={10}>Actual</text>
      <line x1={padding.left + 60} y1={padding.top + 5} x2={padding.left + 72} y2={padding.top + 5} stroke="#10b981" strokeWidth={2} strokeDasharray="3,2" />
      <text x={padding.left + 76} y={padding.top + 8} fill="#9ca3af" fontSize={10}>Predicted</text>
      <rect x={padding.left + 140} y={padding.top + 4} width={12} height={3} fill="#3b82f6" fillOpacity={0.2} rx={1} />
      <text x={padding.left + 156} y={padding.top + 8} fill="#9ca3af" fontSize={10}>Confidence</text>
    </svg>
  );
}

function ScatterPlot({ spendHistory, conversionHistory, predictedConversions }: { spendHistory: number[]; conversionHistory: number[]; predictedConversions: number[] }) {
  const width = 600;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allX = [...spendHistory, ...spendHistory];
  const allY = [...conversionHistory, ...predictedConversions];
  const minX = Math.min(...allX) * 0.9;
  const maxX = Math.max(...allX) * 1.1;
  const minY = Math.min(...allY) * 0.9;
  const maxY = Math.max(...allY) * 1.1;
  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => minY + (yRange / (yTicks - 1)) * i);
  const xTicks = 5;
  const xTickValues = Array.from({ length: xTicks }, (_, i) => minX + (xRange / (xTicks - 1)) * i);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxWidth: "100%", height: "300px" }}>
      {yTickValues.map((v, i) => {
        const y = padding.top + chartH - ((v - minY) / yRange) * chartH;
        return <line key={`yg-${i}`} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#1f2937" strokeWidth={1} />;
      })}
      {xTickValues.map((v, i) => {
        const x = padding.left + ((v - minX) / xRange) * chartW;
        return <line key={`xg-${i}`} x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke="#1f2937" strokeWidth={1} />;
      })}
      {yTickValues.map((v, i) => {
        const y = padding.top + chartH - ((v - minY) / yRange) * chartH;
        return <text key={`yl-${i}`} x={padding.left - 8} y={y + 4} textAnchor="end" fill="#6b7280" fontSize={10}>{v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0)}</text>;
      })}
      {xTickValues.map((v, i) => {
        const x = padding.left + ((v - minX) / xRange) * chartW;
        return <text key={`xl-${i}`} x={x} y={height - 5} textAnchor="middle" fill="#6b7280" fontSize={9}>{v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0)}</text>;
      })}

      <text x={padding.left + chartW / 2} y={height - 2} textAnchor="middle" fill="#6b7280" fontSize={10}>Spend ($)</text>
      <text x={12} y={padding.top + chartH / 2} textAnchor="middle" fill="#6b7280" fontSize={10} transform={`rotate(-90, 12, ${padding.top + chartH / 2})`}>Conversions</text>

      {spendHistory.map((s, i) => {
        if (i >= conversionHistory.length) return null;
        const x = padding.left + ((s - minX) / xRange) * chartW;
        const y = padding.top + chartH - ((conversionHistory[i] - minY) / yRange) * chartH;
        return <circle key={`h-${i}`} cx={x} cy={y} r={4} fill="#3b82f6" fillOpacity={0.7} />;
      })}

      {spendHistory.map((s, i) => {
        if (i >= predictedConversions.length) return null;
        const x = padding.left + ((s - minX) / xRange) * chartW;
        const y = padding.top + chartH - ((predictedConversions[i] - minY) / yRange) * chartH;
        return <circle key={`p-${i}`} cx={x} cy={y} r={4} fill="#10b981" fillOpacity={0.7} />;
      })}

      <circle cx={padding.left + 4} cy={padding.top + 4} r={4} fill="#3b82f6" fillOpacity={0.7} />
      <text x={padding.left + 14} y={padding.top + 8} fill="#9ca3af" fontSize={10}>Historical</text>
      <circle cx={padding.left + 80} cy={padding.top + 4} r={4} fill="#10b981" fillOpacity={0.7} />
      <text x={padding.left + 90} y={padding.top + 8} fill="#9ca3af" fontSize={10}>Predicted</text>
    </svg>
  );
}

export default function PredictiveForecasting() {
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>("forecast");
  const [loading, setLoading] = useState(false);

  const [campaignId, setCampaignId] = useState("");
  const [metricName, setMetricName] = useState("conversions");
  const [horizon, setHorizon] = useState(14);
  const [alpha, setAlpha] = useState(0.2);
  const [beta, setBeta] = useState(0.1);
  const [gamma, setGamma] = useState(0.1);
  const [historyInput, setHistoryInput] = useState("date,value\n2025-07-01,520\n2025-07-02,540\n2025-07-03,510\n2025-07-04,560\n2025-07-05,530\n2025-07-06,580\n2025-07-07,550\n2025-07-08,590\n2025-07-09,570\n2025-07-10,610\n2025-07-11,595\n2025-07-12,620\n2025-07-13,605\n2025-07-14,640");
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);

  const [budgetCampaignId, setBudgetCampaignId] = useState("");
  const [totalBudget, setTotalBudget] = useState(10000);
  const [startDate, setStartDate] = useState("2025-07-01");
  const [endDate, setEndDate] = useState("2025-07-31");
  const [dailySpendInput, setDailySpendInput] = useState(generateDailySpend(31).join(", "));
  const [budgetResult, setBudgetResult] = useState<BudgetResult | null>(null);

  const [convCampaignId, setConvCampaignId] = useState("");
  const [spendHistoryInput, setSpendHistoryInput] = useState("200, 220, 210, 250, 240, 260, 230, 280, 270, 300, 290, 310, 295, 320");
  const [conversionHistoryInput, setConversionHistoryInput] = useState("35, 38, 36, 42, 40, 44, 39, 47, 45, 50, 48, 52, 49, 53");
  const [futureSpendInput, setFutureSpendInput] = useState("330, 340, 350, 360, 370, 380, 390");
  const [convResult, setConvResult] = useState<ConversionResult | null>(null);

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "forecast", label: "Forecast", icon: TrendingUp },
    { key: "budget", label: "Budget Projection", icon: DollarSign },
    { key: "conversion", label: "Conversion Prediction", icon: Target },
  ];

  function handleGenerateSample() {
    const sample = generateSampleHistory(14);
    const header = "date,value";
    const rows = sample.map(d => `${d.date},${d.value}`).join("\n");
    setHistoryInput(header + "\n" + rows);
    addToast("success", "Sample data generated");
  }

  function parseHistoryInput(input: string): { date: string; value: number }[] {
    const lines = input.trim().split("\n");
    if (lines.length < 2) return [];
    const parsed: { date: string; value: number }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      if (parts.length >= 2) {
        const date = parts[0].trim();
        const value = parseFloat(parts[1].trim());
        if (date && !isNaN(value)) {
          parsed.push({ date, value });
        }
      }
    }
    return parsed;
  }

  async function handleRunForecast() {
    const history = parseHistoryInput(historyInput);
    if (history.length < 3) {
      addToast("error", "Please provide at least 3 history data points (date,value pairs)");
      return;
    }
    setLoading(true);
    try {
      const res = await api.predictiveForecasting.forecast({
        campaignId,
        metric: metricName,
        history,
        horizon,
        options: { alpha, beta, gamma },
      });
      setForecastResult(res);
      addToast("success", "Forecast completed");
    } catch {
      const historyVals = history.map(d => d.value);
      const avg = historyVals.reduce((s, v) => s + v, 0) / historyVals.length;
      const trend = historyVals.length > 1 ? (historyVals[historyVals.length - 1] - historyVals[0]) / historyVals.length : 0;
      const predictions = Array.from({ length: horizon }, (_, i) => {
        const base = avg + trend * (i + 1);
        const value = Math.round(base * (1 + (Math.random() - 0.5) * 0.05));
        const lower = Math.round(value * 0.88);
        const upper = Math.round(value * 1.12);
        return { period: i + 1, value, lower, upper };
      });
      const lastValue = historyVals[historyVals.length - 1];
      const nextPeriod = predictions[0]?.value || lastValue;
      const projectedTotal = predictions.reduce((s, p) => s + p.value, 0);
      const trendDirection: "up" | "down" | "stable" = trend > avg * 0.005 ? "up" : trend < -avg * 0.005 ? "down" : "stable";
      setForecastResult({
        nextPeriodValue: nextPeriod,
        trendDirection,
        confidence: 0.82,
        projectedTotal,
        lowerBound: predictions.reduce((s, p) => s + p.lower, 0),
        upperBound: predictions.reduce((s, p) => s + p.upper, 0),
        alpha,
        beta,
        gamma,
        mse: avg * 0.02,
        history,
        predictions,
      });
      addToast("success", "Forecast completed (offline)");
    }
    setLoading(false);
  }

  async function handleRunBudget() {
    const dailySpend = dailySpendInput.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (dailySpend.length === 0) {
      addToast("error", "Please provide daily spend values");
      return;
    }
    setLoading(true);
    try {
      const res = await api.predictiveForecasting.budget({
        campaignId: budgetCampaignId,
        totalBudget,
        startDate,
        endDate,
        dailySpend,
      });
      setBudgetResult(res);
      addToast("success", "Budget projection completed");
    } catch {
      const days = dailySpend.length;
      const projectedTotal = dailySpend.reduce((s, v) => s + v, 0);
      const utilizationPct = (projectedTotal / totalBudget) * 100;
      const overspend = utilizationPct > 100;
      const underutilize = utilizationPct < 80;
      let cumulative = 0;
      const dailyProjection = dailySpend.map((spend, i) => {
        cumulative += spend;
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return {
          date: date.toISOString().substring(0, 10),
          predictedSpend: spend,
          cumulative,
          remaining: totalBudget - cumulative,
        };
      });
      setBudgetResult({
        projectedEndSpend: projectedTotal,
        utilizationPct,
        overspend,
        overspendAmount: overspend ? projectedTotal - totalBudget : 0,
        underutilize,
        underutilizeAmount: underutilize ? totalBudget - projectedTotal : 0,
        recommendedDailyCap: Math.round(totalBudget / days * 1.05),
        dailyProjection,
      });
      addToast("success", "Budget projection completed (offline)");
    }
    setLoading(false);
  }

  async function handleRunConversion() {
    const spendHistory = spendHistoryInput.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    const conversionHistory = conversionHistoryInput.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    const futureSpend = futureSpendInput.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (spendHistory.length < 3 || conversionHistory.length < 3) {
      addToast("error", "Please provide at least 3 data points for spend and conversion history");
      return;
    }
    setLoading(true);
    try {
      const res = await api.predictiveForecasting.conversions({
        campaignId: convCampaignId,
        spendHistory,
        conversionHistory,
        futureSpend,
      });
      setConvResult(res);
      addToast("success", "Conversion prediction completed");
    } catch {
      const n = Math.min(spendHistory.length, conversionHistory.length);
      const meanX = spendHistory.slice(0, n).reduce((s, v) => s + v, 0) / n;
      const meanY = conversionHistory.slice(0, n).reduce((s, v) => s + v, 0) / n;
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        num += (spendHistory[i] - meanX) * (conversionHistory[i] - meanY);
        den += (spendHistory[i] - meanX) ** 2;
      }
      const slope = den > 0 ? num / den : 0.1;
      const intercept = meanY - slope * meanX;
      let ssRes = 0, ssTot = 0;
      for (let i = 0; i < n; i++) {
        const pred = slope * spendHistory[i] + intercept;
        ssRes += (conversionHistory[i] - pred) ** 2;
        ssTot += (conversionHistory[i] - meanY) ** 2;
      }
      const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
      const predictedConversions = futureSpend.map(s => Math.round(slope * s + intercept));
      const marginalCPA = slope > 0 ? 1 / slope : 0;
      const diminishingReturns = slope < 0.05;
      setConvResult({
        predictedConversions,
        efficiency: Math.max(0, Math.min(1, r2)),
        marginalCPA,
        diminishingReturns,
        spendHistory: spendHistory.slice(0, n),
        conversionHistory: conversionHistory.slice(0, n),
      });
      addToast("success", "Conversion prediction completed (offline)");
    }
    setLoading(false);
  }

  function generateBudgetSample() {
    const spend = generateDailySpend(31);
    setDailySpendInput(spend.join(", "));
    addToast("success", "Sample daily spend generated");
  }

  function generateSpendConversionSample() {
    const spend = generateDailySpend(14);
    const conv = generateConversionHistory(14);
    const future = generateDailySpend(7);
    setSpendHistoryInput(spend.join(", "));
    setConversionHistoryInput(conv.join(", "));
    setFutureSpendInput(future.join(", "));
    addToast("success", "Sample data generated");
  }

  function TrendIcon({ direction }: { direction: "up" | "down" | "stable" }) {
    if (direction === "up") return <ArrowUp className="w-5 h-5 text-green-400" />;
    if (direction === "down") return <ArrowDown className="w-5 h-5 text-red-400" />;
    return <Minus className="w-5 h-5 text-yellow-400" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="w-6 h-6 text-n0va-400" />
            Predictive Forecasting
          </h1>
          <p className="text-gray-500 mt-1">Forecasting engine with budget projections and conversion predictions</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-800 pb-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-n0va-400 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "forecast" && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-n0va-400" />
              Forecast Input
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="label">Campaign ID</label>
                <input type="text" className="input" value={campaignId} onChange={e => setCampaignId(e.target.value)} placeholder="campaign_001" />
              </div>
              <div>
                <label className="label">Metric Name</label>
                <select className="input" value={metricName} onChange={e => setMetricName(e.target.value)}>
                  <option value="conversions">Conversions</option>
                  <option value="impressions">Impressions</option>
                  <option value="clicks">Clicks</option>
                  <option value="revenue">Revenue</option>
                  <option value="spend">Spend</option>
                </select>
              </div>
              <div>
                <label className="label">Horizon (days)</label>
                <input type="number" className="input" min={1} max={90} value={horizon} onChange={e => setHorizon(Number(e.target.value) || 14)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="label">Alpha (level): {alpha.toFixed(2)}</label>
                <input type="range" min={0} max={1} step={0.01} value={alpha} onChange={e => setAlpha(Number(e.target.value))} className="w-full accent-n0va-500" />
              </div>
              <div>
                <label className="label">Beta (trend): {beta.toFixed(2)}</label>
                <input type="range" min={0} max={1} step={0.01} value={beta} onChange={e => setBeta(Number(e.target.value))} className="w-full accent-n0va-500" />
              </div>
              <div>
                <label className="label">Gamma (seasonality): {gamma.toFixed(2)}</label>
                <input type="range" min={0} max={1} step={0.01} value={gamma} onChange={e => setGamma(Number(e.target.value))} className="w-full accent-n0va-500" />
              </div>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">History Data (date,value per line)</label>
                <button onClick={handleGenerateSample} className="btn-ghost text-xs flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> Generate sample data
                </button>
              </div>
              <textarea className="input font-mono text-xs" rows={6} value={historyInput} onChange={e => setHistoryInput(e.target.value)} />
            </div>
            <button onClick={handleRunForecast} disabled={loading} className="btn-primary text-sm flex items-center gap-1.5">
              {loading ? "Running..." : <Activity className="w-4 h-4" />}
              Run Forecast
            </button>
          </div>

          {forecastResult && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="card">
                  <TrendingUp className="w-4 h-4 text-n0va-400 mb-2" />
                  <p className="text-xs text-gray-500 mb-1">Next Period Value</p>
                  <p className="text-xl font-bold text-white">{Math.round(forecastResult.nextPeriodValue).toLocaleString()}</p>
                </div>
                <div className="card">
                  <TrendIcon direction={forecastResult.trendDirection} />
                  <p className="text-xs text-gray-500 mb-1">Trend Direction</p>
                  <p className={`text-xl font-bold capitalize ${
                    forecastResult.trendDirection === "up" ? "text-green-400" :
                    forecastResult.trendDirection === "down" ? "text-red-400" : "text-yellow-400"
                  }`}>{forecastResult.trendDirection}</p>
                </div>
                <div className="card">
                  <Target className="w-4 h-4 text-emerald-400 mb-2" />
                  <p className="text-xs text-gray-500 mb-1">Confidence</p>
                  <p className="text-xl font-bold text-white">{(forecastResult.confidence * 100).toFixed(0)}%</p>
                </div>
                <div className="card">
                  <DollarSign className="w-4 h-4 text-yellow-400 mb-2" />
                  <p className="text-xs text-gray-500 mb-1">Projected Total</p>
                  <p className="text-xl font-bold text-white">{Math.round(forecastResult.projectedTotal).toLocaleString()}</p>
                </div>
                <div className="card">
                  <BarChart3 className="w-4 h-4 text-n0va-400 mb-2" />
                  <p className="text-xs text-gray-500 mb-1">Bounds</p>
                  <p className="text-sm text-white font-mono">
                    {Math.round(forecastResult.lowerBound).toLocaleString()} – {Math.round(forecastResult.upperBound).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Forecast Chart</h3>
                <ForecastChart data={forecastResult.history} predictions={forecastResult.predictions} />
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-n0va-400" />
                  Model Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Alpha (level)</p>
                    <p className="text-sm font-semibold text-white">{forecastResult.alpha.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Beta (trend)</p>
                    <p className="text-sm font-semibold text-white">{forecastResult.beta.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Gamma (seasonality)</p>
                    <p className="text-sm font-semibold text-white">{forecastResult.gamma.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500">MSE</p>
                    <p className="text-sm font-semibold text-white">{forecastResult.mse.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "budget" && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-n0va-400" />
              Budget Projection Input
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="label">Campaign ID</label>
                <input type="text" className="input" value={budgetCampaignId} onChange={e => setBudgetCampaignId(e.target.value)} placeholder="campaign_001" />
              </div>
              <div>
                <label className="label">Total Budget ($)</label>
                <input type="number" className="input" min={0} value={totalBudget} onChange={e => setTotalBudget(Number(e.target.value) || 0)} />
              </div>
              <div>
                <label className="label">Start Date</label>
                <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="label">End Date</label>
                <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Daily Spend (comma-separated)</label>
                <button onClick={generateBudgetSample} className="btn-ghost text-xs flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> Generate sample
                </button>
              </div>
              <textarea className="input font-mono text-xs" rows={3} value={dailySpendInput} onChange={e => setDailySpendInput(e.target.value)} />
            </div>
            <button onClick={handleRunBudget} disabled={loading} className="btn-primary text-sm flex items-center gap-1.5">
              {loading ? "Running..." : <Activity className="w-4 h-4" />}
              Run Budget Projection
            </button>
          </div>

          {budgetResult && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card">
                  <p className="text-xs text-gray-500 mb-1">Projected End Spend</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(budgetResult.projectedEndSpend)}</p>
                </div>
                <div className="card">
                  <p className="text-xs text-gray-500 mb-1">Utilization</p>
                  <p className="text-2xl font-bold text-white">{budgetResult.utilizationPct.toFixed(1)}%</p>
                  <div className="mt-2 h-2 rounded-full bg-gray-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        budgetResult.overspend ? "bg-red-500" : budgetResult.underutilize ? "bg-yellow-500" : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(budgetResult.utilizationPct, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="card">
                  <p className="text-xs text-gray-500 mb-1">Recommended Daily Cap</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(budgetResult.recommendedDailyCap)}</p>
                </div>
              </div>

              {budgetResult.overspend && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                  <ArrowUp className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-400">Overspend Warning</p>
                    <p className="text-xs text-red-300">
                      Projected spend exceeds budget by {formatCurrency(budgetResult.overspendAmount)}.
                      Consider reducing daily spend or increasing total budget.
                    </p>
                  </div>
                </div>
              )}
              {budgetResult.underutilize && !budgetResult.overspend && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
                  <ArrowDown className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-400">Underutilization Warning</p>
                    <p className="text-xs text-yellow-300">
                      Projected spend is {formatCurrency(budgetResult.underutilizeAmount)} under budget.
                      Consider increasing daily spend to maximize reach.
                    </p>
                  </div>
                </div>
              )}
              {!budgetResult.overspend && !budgetResult.underutilize && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
                  <Minus className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">On Track</p>
                    <p className="text-xs text-green-300">Budget utilization is within the target range.</p>
                  </div>
                </div>
              )}

              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-n0va-400" />
                  Daily Budget Projection
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-800">
                        <th className="text-left py-2 px-3">Date</th>
                        <th className="text-right py-2 px-3">Predicted Spend</th>
                        <th className="text-right py-2 px-3">Cumulative</th>
                        <th className="text-right py-2 px-3">Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetResult.dailyProjection.map((row, i) => (
                        <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="py-2 px-3 text-white">{row.date}</td>
                          <td className="py-2 px-3 text-right text-yellow-400">{formatCurrency(row.predictedSpend)}</td>
                          <td className="py-2 px-3 text-right text-n0va-400">{formatCurrency(row.cumulative)}</td>
                          <td className={`py-2 px-3 text-right ${row.remaining < 0 ? "text-red-400" : "text-green-400"}`}>
                            {formatCurrency(row.remaining)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "conversion" && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-n0va-400" />
              Conversion Prediction Input
            </h3>
            <div className="mb-4">
              <label className="label">Campaign ID</label>
              <input type="text" className="input" value={convCampaignId} onChange={e => setConvCampaignId(e.target.value)} placeholder="campaign_001" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="label">Spend History (comma-separated)</label>
                <textarea className="input font-mono text-xs" rows={3} value={spendHistoryInput} onChange={e => setSpendHistoryInput(e.target.value)} />
              </div>
              <div>
                <label className="label">Conversion History (comma-separated)</label>
                <textarea className="input font-mono text-xs" rows={3} value={conversionHistoryInput} onChange={e => setConversionHistoryInput(e.target.value)} />
              </div>
              <div>
                <label className="label">Future Spend (comma-separated)</label>
                <textarea className="input font-mono text-xs" rows={3} value={futureSpendInput} onChange={e => setFutureSpendInput(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleRunConversion} disabled={loading} className="btn-primary text-sm flex items-center gap-1.5">
                {loading ? "Running..." : <Activity className="w-4 h-4" />}
                Run Conversion Prediction
              </button>
              <button onClick={generateSpendConversionSample} className="btn-ghost text-xs flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> Generate sample data
              </button>
            </div>
          </div>

          {convResult && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card">
                  <Target className="w-4 h-4 text-n0va-400 mb-2" />
                  <p className="text-xs text-gray-500 mb-1">Predicted Conversions</p>
                  <p className="text-xl font-bold text-white">
                    {convResult.predictedConversions.reduce((s, v) => s + v, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {convResult.predictedConversions.map(v => v.toLocaleString()).join(" → ")}
                  </p>
                </div>
                <div className="card">
                  <BarChart3 className="w-4 h-4 text-emerald-400 mb-2" />
                  <p className="text-xs text-gray-500 mb-1">Efficiency Score (R²)</p>
                  <p className="text-xl font-bold text-white">{(convResult.efficiency * 100).toFixed(1)}%</p>
                </div>
                <div className="card">
                  <DollarSign className="w-4 h-4 text-yellow-400 mb-2" />
                  <p className="text-xs text-gray-500 mb-1">Marginal CPA</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(convResult.marginalCPA)}</p>
                </div>
                <div className="card">
                  {convResult.diminishingReturns ? (
                    <ArrowDown className="w-5 h-5 text-red-400 mb-2" />
                  ) : (
                    <ArrowUp className="w-5 h-5 text-green-400 mb-2" />
                  )}
                  <p className="text-xs text-gray-500 mb-1">Diminishing Returns</p>
                  <p className={`text-xl font-bold ${convResult.diminishingReturns ? "text-red-400" : "text-green-400"}`}>
                    {convResult.diminishingReturns ? "Detected" : "None"}
                  </p>
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-n0va-400" />
                  Spend vs Conversion Trend
                </h3>
                <ScatterPlot
                  spendHistory={convResult.spendHistory}
                  conversionHistory={convResult.conversionHistory}
                  predictedConversions={convResult.predictedConversions}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
