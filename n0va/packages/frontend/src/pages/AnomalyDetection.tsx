import { useState, useMemo } from "react";
import { AlertTriangle, Activity, TrendingUp, TrendingDown, Search, Eye, BarChart3 } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

type Tab = "single" | "campaign";

type Severity = "low" | "medium" | "high" | "critical";
type Direction = "up" | "down" | "normal";

interface AnomalyResult {
  date: string;
  value: number;
  expected: number;
  deviation: number;
  zScore: number;
  severity: Severity;
  direction: Direction;
}

interface SingleMetricResult {
  metric: string;
  entityId: string;
  totalPoints: number;
  flaggedCount: number;
  flagRate: number;
  highestZScore: number;
  dominantDirection: Direction;
  dominantSeverity: Severity;
  recommendation: string;
  values: number[];
  expected: number[];
  anomalies: AnomalyResult[];
  config: { zScoreThreshold: number; smoothingWindow: number; seasonalBaseline: boolean };
}

interface CampaignMetricResult {
  metric: string;
  values: number[];
  expected: number[];
  anomalies: AnomalyResult[];
  flaggedCount: number;
  totalPoints: number;
  flagRate: number;
  severity: Severity;
  direction: Direction;
}

interface CampaignScanResult {
  campaignId: string;
  overallHealth: Severity;
  metrics: CampaignMetricResult[];
  recommendation: string;
}

const SEVERITY_COLORS: Record<Severity, string> = { low: "text-gray-400 bg-gray-500/10 border-gray-500/30", medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", high: "text-orange-400 bg-orange-500/10 border-orange-500/30", critical: "text-red-400 bg-red-500/10 border-red-500/30" };
const SEVERITY_CHART: Record<Severity, string> = { low: "#9ca3af", medium: "#eab308", high: "#f97316", critical: "#ef4444" };
const HEALTH_LABEL: Record<Severity, string> = { low: "Healthy", medium: "Attention", high: "Attention", critical: "Critical" };
const HEALTH_COLOR: Record<Severity, string> = { low: "text-green-400 bg-green-500/10 border-green-500/30", medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", high: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", critical: "text-red-400 bg-red-500/10 border-red-500/30" };

function severityFromZ(z: number): Severity {
  if (z < 2) return "low";
  if (z < 3) return "medium";
  if (z < 4) return "high";
  return "critical";
}

function smooth(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(data.length, i + Math.ceil(window / 2));
    const slice = data.slice(start, end);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

function zScoreDetect(values: number[], expected: number[], threshold: number): AnomalyResult[] {
  const results: AnomalyResult[] = [];
  for (let i = 0; i < values.length; i++) {
    const diff = values[i] - expected[i];
    const std = Math.sqrt(expected[i] + 1);
    const z = std > 0 ? Math.abs(diff) / std : 0;
    const direction: Direction = diff > 0 ? "up" : diff < 0 ? "down" : "normal";
    const severity = severityFromZ(z);
    results.push({
      date: `Day ${i + 1}`,
      value: values[i],
      expected: expected[i],
      deviation: diff,
      zScore: Math.round(z * 100) / 100,
      severity,
      direction,
    });
  }
  return results;
}

function generateSampleData(min = 30, max = 60): { values: number[]; expected: number[]; anomalies: AnomalyResult[] } {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const base = 100 + Math.random() * 50;
  const values: number[] = [];
  const raw: number[] = [];
  for (let i = 0; i < count; i++) {
    const trend = Math.sin((i / count) * Math.PI * 4) * 20;
    const noise = (Math.random() - 0.5) * 20;
    raw.push(base + trend + noise);
  }
  const expected = smooth(raw, 5);
  const anomalyCount = 1 + Math.floor(Math.random() * 3);
  const anomalyIndices = new Set<number>();
  while (anomalyIndices.size < anomalyCount) {
    anomalyIndices.add(Math.floor(Math.random() * count));
  }
  for (const idx of anomalyIndices) {
    const spike = (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 60);
    raw[idx] += spike;
  }
  for (let i = 0; i < count; i++) {
    values.push(Math.round(raw[i] * 100) / 100);
  }
  const anomalies = zScoreDetect(values, expected, 2.5);
  return { values, expected, anomalies };
}

function generateCampaignSampleData(): Record<string, number[]> {
  function genMetric(base: number, amplitude: number, anomalyVal: number): number[] {
    const pts = 30 + Math.floor(Math.random() * 15);
    const data: number[] = [];
    for (let i = 0; i < pts; i++) {
      const trend = Math.sin((i / pts) * Math.PI * 3) * amplitude * 0.3;
      const noise = (Math.random() - 0.5) * amplitude * 0.5;
      data.push(Math.max(0, Math.round((base + trend + noise) * 100) / 100));
    }
    const idx = Math.floor(Math.random() * pts);
    data[idx] = Math.max(0, Math.round((base + anomalyVal) * 100) / 100);
    if (pts > 10) {
      const idx2 = Math.floor(Math.random() * pts);
      if (idx2 !== idx) data[idx2] = Math.max(0, Math.round((base - anomalyVal * 0.7) * 100) / 100);
    }
    return data;
  }
  return {
    spend: genMetric(5000, 1000, 3500),
    ctr: genMetric(2.5, 1, 5.5),
    cvr: genMetric(3.2, 1.5, 6.8),
    cpa: genMetric(45, 15, 95),
  };
}

function runLocalDetection(values: number[], threshold: number, window: number, seasonal: boolean): SingleMetricResult {
  const count = values.length;
  const expected = smooth(values, window);
  const allAnomalies = zScoreDetect(values, expected, threshold);
  const filtered = allAnomalies.filter((a) => a.zScore >= threshold);
  const highestZ = filtered.length > 0 ? Math.max(...filtered.map((a) => a.zScore)) : 0;
  const upCount = filtered.filter((a) => a.direction === "up").length;
  const downCount = filtered.filter((a) => a.direction === "down").length;
  const dominantDirection: Direction = upCount > downCount ? "up" : downCount > upCount ? "down" : "normal";
  const maxSev = filtered.length > 0 ? filtered.reduce((a, b) => (a.zScore > b.zScore ? a : b)).severity : "low";
  return {
    metric: "",
    entityId: "",
    totalPoints: count,
    flaggedCount: filtered.length,
    flagRate: count > 0 ? Math.round((filtered.length / count) * 10000) / 100 : 0,
    highestZScore: Math.round(highestZ * 100) / 100,
    dominantDirection,
    dominantSeverity: maxSev,
    recommendation: maxSev === "low" ? "No significant anomalies detected. Data looks normal." : upCount > downCount ? "Upward spikes detected — investigate potential spend surges or tracking errors." : "Downward drops detected — check for campaign pauses or delivery issues.",
    values,
    expected,
    anomalies: filtered,
    config: { zScoreThreshold: threshold, smoothingWindow: window, seasonalBaseline: seasonal },
  };
}

function runLocalCampaignScan(campaignId: string, metrics: Record<string, number[]>, threshold: number, window: number): CampaignScanResult {
  const metricNames = Object.keys(metrics);
  const results: CampaignMetricResult[] = metricNames.map((name) => {
    const vals = metrics[name];
    const expected = smooth(vals, window);
    const all = zScoreDetect(vals, expected, threshold);
    const filtered = all.filter((a) => a.zScore >= threshold);
    const upCount = filtered.filter((a) => a.direction === "up").length;
    const downCount = filtered.filter((a) => a.direction === "down").length;
    const dominantDirection: Direction = upCount > downCount ? "up" : downCount > upCount ? "down" : "normal";
    const maxSev = filtered.length > 0 ? (filtered.length >= 3 ? "critical" : filtered.length >= 2 ? "high" : "medium") : "low";
    return {
      metric: name,
      values: vals,
      expected,
      anomalies: filtered,
      flaggedCount: filtered.length,
      totalPoints: vals.length,
      flagRate: vals.length > 0 ? Math.round((filtered.length / vals.length) * 10000) / 100 : 0,
      severity: maxSev,
      direction: dominantDirection,
    };
  });
  const worst = results.reduce((a, b) => {
    const order: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return order[a.severity] > order[b.severity] ? a : b;
  });
  const flagged = results.filter((r) => r.flaggedCount > 0);
  return {
    campaignId,
    overallHealth: worst.severity,
    metrics: results,
    recommendation: flagged.length === 0 ? "All metrics look healthy." : `${flagged.length} metric(s) flagged. ${flagged.map((r) => `${r.metric} (${r.flaggedCount} anomalies)`).join(", ")}.`,
  };
}

function SparklineChart({ data, expected, anomalies, width = 300, height = 80 }: { data: number[]; expected: number[]; anomalies: AnomalyResult[]; width?: number; height?: number }) {
  const min = Math.min(...data, ...expected) * 0.9;
  const max = Math.max(...data, ...expected) * 1.1;
  const range = max - min || 1;
  const padX = 30; const padY = 10;
  const chartW = width - padX * 2; const chartH = height - padY * 2;
  function xPos(i: number) { return padX + (i / (data.length - 1 || 1)) * chartW; }
  function yPos(v: number) { return padY + chartH - ((v - min) / range) * chartH; }
  const valuePoints = data.map((v, i) => `${xPos(i)},${yPos(v)}`).join(" ");
  const expectedPoints = expected.map((v, i) => `${xPos(i)},${yPos(v)}`).join(" ");
  const anomalyIndices = new Set(anomalies.map((a) => parseInt(a.date.replace("Day ", "")) - 1).filter((i) => i >= 0 && i < data.length));
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={valuePoints} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round" />
      <polyline points={expectedPoints} fill="none" stroke="#6b7280" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
      {data.map((v, i) => {
        if (!anomalyIndices.has(i)) return null;
        const a = anomalies.find((an) => (parseInt(an.date.replace("Day ", "")) - 1) === i);
        const cx = xPos(i); const cy = yPos(v);
        return <circle key={i} cx={cx} cy={cy} r={4} fill="#ef4444" stroke="#7f1d1d" strokeWidth={1} />;
      })}
    </svg>
  );
}

function LargeChart({ data, expected, anomalies, width = 400, height = 200 }: { data: number[]; expected: number[]; anomalies: AnomalyResult[]; width?: number; height?: number }) {
  const min = Math.min(...data, ...expected) * 0.9;
  const max = Math.max(...data, ...expected) * 1.1;
  const range = max - min || 1;
  const padX = 45; const padY = 15;
  const chartW = width - padX * 2; const chartH = height - padY * 2;
  function xPos(i: number) { return padX + (i / (data.length - 1 || 1)) * chartW; }
  function yPos(v: number) { return padY + chartH - ((v - min) / range) * chartH; }
  const valuePoints = data.map((v, i) => `${xPos(i)},${yPos(v)}`).join(" ");
  const expectedPoints = expected.map((v, i) => `${xPos(i)},${yPos(v)}`).join(" ");
  const yTicks: number[] = [];
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) yTicks.push(min + (range * i) / tickCount);
  return (
    <svg width={width} height={height} className="overflow-visible">
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={padX} y1={yPos(v)} x2={width - padX} y2={yPos(v)} stroke="#1f2937" strokeWidth={1} />
          <text x={padX - 6} y={yPos(v) + 3} textAnchor="end" fill="#6b7280" fontSize={9}>{v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(1)}</text>
        </g>
      ))}
      <polyline points={valuePoints} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />
      <polyline points={expectedPoints} fill="none" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.6} />
      {data.map((v, i) => {
        const a = anomalies.find((an) => (parseInt(an.date.replace("Day ", "")) - 1) === i);
        if (!a) return null;
        const cx = xPos(i); const cy = yPos(v);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#7f1d1d" strokeWidth={1.5} />
            <text x={cx} y={cy - 8} textAnchor="middle" fill="#ef4444" fontSize={9}>{a.direction === "up" ? "▲" : "▼"}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AnomalyDetection() {
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>("single");

  // Single Metric state
  const [metricName, setMetricName] = useState("");
  const [entityId, setEntityId] = useState("");
  const [dataPoints, setDataPoints] = useState("");
  const [zThreshold, setZThreshold] = useState(2.5);
  const [smoothingWindow, setSmoothingWindow] = useState(5);
  const [seasonalBaseline, setSeasonalBaseline] = useState(false);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<SingleMetricResult | null>(null);
  const [sampleData, setSampleData] = useState<{ values: number[]; expected: number[]; anomalies: AnomalyResult[] } | null>(null);

  // Campaign Scan state
  const [campaignId, setCampaignId] = useState("");
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignResult, setCampaignResult] = useState<CampaignScanResult | null>(null);
  const [campaignMetrics, setCampaignMetrics] = useState<Record<string, number[]> | null>(null);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  function handleGenerateSample() {
    if (!metricName.trim()) { addToast("warning", "Please enter a metric name"); return; }
    if (!entityId.trim()) { addToast("warning", "Please enter an entity ID"); return; }
    const data = generateSampleData();
    setSampleData(data);
    setDataPoints(data.values.join(", "));
    setSingleResult(null);
    addToast("success", `Generated ${data.values.length} data points with ${data.anomalies.filter((a) => a.zScore >= 2.5).length} injected anomalies`);
  }

  async function handleDetect() {
    if (!metricName.trim() || !entityId.trim()) { addToast("warning", "Please fill in metric name and entity ID"); return; }
    let values: number[];
    if (dataPoints.trim()) {
      values = dataPoints.split(",").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
    } else if (sampleData) {
      values = sampleData.values;
    } else {
      addToast("warning", "Please generate or paste data points");
      return;
    }
    if (values.length < 5) { addToast("warning", "Need at least 5 data points"); return; }
    setSingleLoading(true);
    try {
      const payload = { metric: metricName, entityId, values, config: { zScoreThreshold: zThreshold, smoothingWindow, seasonalBaseline, } };
      const res = await api.anomalyDetection.detect(payload);
      setSingleResult({
        metric: metricName,
        entityId,
        totalPoints: res.totalPoints || values.length,
        flaggedCount: res.flaggedCount || 0,
        flagRate: res.flagRate || 0,
        highestZScore: res.highestZScore || 0,
        dominantDirection: res.dominantDirection || "normal",
        dominantSeverity: res.dominantSeverity || "low",
        recommendation: res.recommendation || "",
        values: res.values || values,
        expected: res.expected || smooth(values, smoothingWindow),
        anomalies: res.anomalies || zScoreDetect(values, smooth(values, smoothingWindow), zThreshold).filter((a) => a.zScore >= zThreshold),
        config: { zScoreThreshold: zThreshold, smoothingWindow, seasonalBaseline },
      });
      addToast("success", `Detection complete — ${res.flaggedCount || 0} anomalies found`);
    } catch {
      const local = runLocalDetection(values, zThreshold, smoothingWindow, seasonalBaseline);
      setSingleResult(local);
      addToast("info", "API unavailable — used local detection");
    }
    setSingleLoading(false);
  }

  function handleGenerateCampaign() {
    if (!campaignId.trim()) { addToast("warning", "Please enter a campaign ID"); return; }
    const data = generateCampaignSampleData();
    setCampaignMetrics(data);
    setCampaignResult(null);
    setExpandedMetric(null);
    addToast("success", "Generated sample campaign metrics");
  }

  async function handleScanCampaign() {
    if (!campaignId.trim()) { addToast("warning", "Please enter a campaign ID"); return; }
    let metrics: Record<string, number[]>;
    if (campaignMetrics) {
      metrics = campaignMetrics;
    } else {
      metrics = generateCampaignSampleData();
      setCampaignMetrics(metrics);
    }
    setCampaignLoading(true);
    try {
      const res = await api.anomalyDetection.scanCampaign({ campaignId, metrics, config: { zScoreThreshold: zThreshold, smoothingWindow, seasonalBaseline } });
      setCampaignResult({
        campaignId,
        overallHealth: res.overallHealth || "low",
        metrics: res.metrics || Object.keys(metrics).map((name) => {
          const vals = metrics[name];
          const exp = smooth(vals, smoothingWindow);
          const all = zScoreDetect(vals, exp, zThreshold);
          const filtered = all.filter((a) => a.zScore >= zThreshold);
          const upCount = filtered.filter((a) => a.direction === "up").length;
          const downCount = filtered.filter((a) => a.direction === "down").length;
          const dominantDirection: Direction = upCount > downCount ? "up" : downCount > upCount ? "down" : "normal";
          const maxSev = filtered.length >= 3 ? "critical" : filtered.length >= 2 ? "high" : filtered.length >= 1 ? "medium" : "low";
          return { metric: name, values: vals, expected: exp, anomalies: filtered, flaggedCount: filtered.length, totalPoints: vals.length, flagRate: vals.length > 0 ? Math.round((filtered.length / vals.length) * 10000) / 100 : 0, severity: maxSev, direction: dominantDirection };
        }),
        recommendation: res.recommendation || "",
      });
      addToast("success", "Campaign scan complete");
    } catch {
      const local = runLocalCampaignScan(campaignId, metrics, zThreshold, smoothingWindow);
      setCampaignResult(local);
      addToast("info", "API unavailable — used local scan");
    }
    setCampaignLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="w-6 h-6 text-n0va-400" />
            Anomaly Detection
          </h1>
          <p className="text-gray-400 mt-1">Detect spikes, drops, and unusual patterns in your metrics</p>
        </div>
      </div>

      <div className="flex items-center border-b border-gray-800 gap-0">
        <button onClick={() => setTab("single")} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "single" ? "border-n0va-400 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
          <BarChart3 className="w-4 h-4" /> Single Metric
        </button>
        <button onClick={() => setTab("campaign")} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "campaign" ? "border-n0va-400 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
          <Search className="w-4 h-4" /> Campaign Scan
        </button>
      </div>

      {tab === "single" && (
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Input</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="label">Metric Name</label>
                <input className="input w-full" placeholder="e.g. Spend, CTR, CVR" value={metricName} onChange={(e) => setMetricName(e.target.value)} />
              </div>
              <div>
                <label className="label">Entity ID</label>
                <input className="input w-full" placeholder="e.g. campaign_123" value={entityId} onChange={(e) => setEntityId(e.target.value)} />
              </div>
              <div className="flex items-end">
                <button className="btn-secondary text-sm flex items-center gap-1.5" onClick={handleGenerateSample}>
                  <BarChart3 className="w-3.5 h-3.5" /> Generate Sample Data
                </button>
              </div>
            </div>
            <div>
              <label className="label">Data Points <span className="text-gray-500 font-normal">(comma-separated, or generate above)</span></label>
              <textarea className="input w-full h-20 resize-none" placeholder="120.5, 118.3, 145.2, ..." value={dataPoints} onChange={(e) => setDataPoints(e.target.value)} />
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="label">Z-Score Threshold: <span className="text-n0va-400">{zThreshold.toFixed(1)}</span></label>
                <input type="range" min={1} max={5} step={0.1} value={zThreshold} onChange={(e) => setZThreshold(parseFloat(e.target.value))} className="w-full accent-n0va-500" />
                <div className="flex justify-between text-[10px] text-gray-600 mt-1"><span>1.0 (sensitive)</span><span>5.0 (strict)</span></div>
              </div>
              <div>
                <label className="label">Smoothing Window: <span className="text-n0va-400">{smoothingWindow}</span></label>
                <input type="range" min={3} max={30} step={1} value={smoothingWindow} onChange={(e) => setSmoothingWindow(parseInt(e.target.value))} className="w-full accent-n0va-500" />
                <div className="flex justify-between text-[10px] text-gray-600 mt-1"><span>3 (min)</span><span>30 (max)</span></div>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={seasonalBaseline} onChange={(e) => setSeasonalBaseline(e.target.checked)} />
                  <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:bg-n0va-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                </label>
                <span className="text-sm text-gray-300">Seasonal Baseline</span>
              </div>
            </div>
            <div className="mt-4">
              <button className="btn-primary text-sm flex items-center gap-1.5" onClick={handleDetect} disabled={singleLoading}>
                {singleLoading ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                {singleLoading ? "Detecting..." : "Detect Anomalies"}
              </button>
            </div>
          </div>

          {singleResult && (
            <div className="space-y-6">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-n0va-400" /> Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-500">Total Points</p>
                    <p className="text-lg font-bold text-white">{singleResult.totalPoints}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-500">Flagged</p>
                    <p className="text-lg font-bold text-red-400">{singleResult.flaggedCount}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-500">Flag Rate</p>
                    <p className="text-lg font-bold text-yellow-400">{singleResult.flagRate}%</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-500">Highest Z-Score</p>
                    <p className="text-lg font-bold text-orange-400">{singleResult.highestZScore}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-3 flex items-center gap-3">
                    <span className="text-xs text-gray-500">Direction:</span>
                    {singleResult.dominantDirection === "up" ? <TrendingUp className="w-4 h-4 text-red-400" /> : singleResult.dominantDirection === "down" ? <TrendingDown className="w-4 h-4 text-red-400" /> : <span className="text-gray-400 text-sm">Normal</span>}
                    <span className="text-sm font-medium text-white capitalize">{singleResult.dominantDirection}</span>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 flex items-center gap-3">
                    <span className="text-xs text-gray-500">Severity:</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SEVERITY_COLORS[singleResult.dominantSeverity]}`}>{singleResult.dominantSeverity}</span>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 col-span-full md:col-span-1">
                    <p className="text-xs text-gray-500 mb-1">Recommendation</p>
                    <p className="text-sm text-gray-300">{singleResult.recommendation}</p>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-n0va-400" /> Chart
                </h3>
                <div className="flex justify-center bg-gray-900/50 rounded-lg p-4">
                  <LargeChart data={singleResult.values} expected={singleResult.expected} anomalies={singleResult.anomalies} />
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> Values</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0 border-t border-dashed border-gray-500 inline-block" /> Expected</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Anomaly</span>
                </div>
              </div>

              {singleResult.anomalies.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-n0va-400" /> Anomalies ({singleResult.anomalies.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left p-3 text-gray-500 font-medium text-xs">Date</th>
                          <th className="text-right p-3 text-gray-500 font-medium text-xs">Value</th>
                          <th className="text-right p-3 text-gray-500 font-medium text-xs">Expected</th>
                          <th className="text-right p-3 text-gray-500 font-medium text-xs">Deviation</th>
                          <th className="text-right p-3 text-gray-500 font-medium text-xs">Z-Score</th>
                          <th className="text-center p-3 text-gray-500 font-medium text-xs">Severity</th>
                          <th className="text-center p-3 text-gray-500 font-medium text-xs">Direction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {singleResult.anomalies.map((a, i) => (
                          <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="p-3 text-gray-300">{a.date}</td>
                            <td className="p-3 text-right text-white font-mono">{Math.round(a.value * 100) / 100}</td>
                            <td className="p-3 text-right text-gray-400 font-mono">{Math.round(a.expected * 100) / 100}</td>
                            <td className={`p-3 text-right font-mono ${a.deviation > 0 ? "text-red-400" : a.deviation < 0 ? "text-red-400" : "text-gray-500"}`}>{a.deviation > 0 ? "+" : ""}{Math.round(a.deviation * 100) / 100}</td>
                            <td className="p-3 text-right font-mono text-orange-400">{a.zScore}</td>
                            <td className="p-3 text-center">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${SEVERITY_COLORS[a.severity]}`}>{a.severity}</span>
                            </td>
                            <td className="p-3 text-center">
                              {a.direction === "up" ? <TrendingUp className="w-4 h-4 text-red-400 inline" /> : a.direction === "down" ? <TrendingDown className="w-4 h-4 text-red-400 inline" /> : <span className="text-gray-500">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "campaign" && (
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Campaign Input</h3>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="label">Campaign ID</label>
                <input className="input w-full" placeholder="e.g. campaign_456" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
              </div>
              <button className="btn-secondary text-sm flex items-center gap-1.5" onClick={handleGenerateCampaign}>
                <BarChart3 className="w-3.5 h-3.5" /> Generate Sample Metrics
              </button>
              <button className="btn-primary text-sm flex items-center gap-1.5" onClick={handleScanCampaign} disabled={campaignLoading}>
                {campaignLoading ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                {campaignLoading ? "Scanning..." : "Scan Campaign"}
              </button>
            </div>
          </div>

          {campaignResult && (
            <div className="space-y-6">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-n0va-400" /> Campaign Health
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  <span className={`text-sm px-3 py-1.5 rounded-full border font-medium ${HEALTH_COLOR[campaignResult.overallHealth]}`}>
                    {HEALTH_LABEL[campaignResult.overallHealth]}
                  </span>
                  <p className="text-sm text-gray-400">{campaignResult.recommendation}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {campaignResult.metrics.map((m) => {
                    const isFlagged = m.flaggedCount > 0;
                    return (
                      <div key={m.metric} className={`bg-gray-800/50 rounded-lg p-3 border cursor-pointer transition-colors ${isFlagged ? "border-red-500/20 hover:bg-gray-800" : "border-gray-800 hover:border-gray-700"}`} onClick={() => setExpandedMetric(expandedMetric === m.metric ? null : m.metric)}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-300 capitalize">{m.metric}</span>
                          {isFlagged && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                        </div>
                        <SparklineChart data={m.values} expected={m.expected} anomalies={m.anomalies} />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-gray-500">{m.flaggedCount}/{m.totalPoints} flagged</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${SEVERITY_COLORS[m.severity]}`}>{m.severity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {campaignResult.metrics.map((m) => (
                <div key={m.metric}>
                  {expandedMetric === m.metric && (
                    <div className="card p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white capitalize flex items-center gap-2">
                          <Activity className="w-4 h-4 text-n0va-400" /> {m.metric} Detail
                        </h3>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SEVERITY_COLORS[m.severity]}`}>{m.severity}</span>
                          <span className="text-xs text-gray-500">{m.flaggedCount} anomalies · {m.flagRate}% flag rate</span>
                        </div>
                      </div>
                      <div className="flex justify-center bg-gray-900/50 rounded-lg p-4 mb-4">
                        <LargeChart data={m.values} expected={m.expected} anomalies={m.anomalies} />
                      </div>
                      {m.anomalies.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-800">
                                <th className="text-left p-3 text-gray-500 font-medium text-xs">Date</th>
                                <th className="text-right p-3 text-gray-500 font-medium text-xs">Value</th>
                                <th className="text-right p-3 text-gray-500 font-medium text-xs">Expected</th>
                                <th className="text-right p-3 text-gray-500 font-medium text-xs">Deviation</th>
                                <th className="text-right p-3 text-gray-500 font-medium text-xs">Z-Score</th>
                                <th className="text-center p-3 text-gray-500 font-medium text-xs">Severity</th>
                                <th className="text-center p-3 text-gray-500 font-medium text-xs">Direction</th>
                              </tr>
                            </thead>
                            <tbody>
                              {m.anomalies.map((a, i) => (
                                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                  <td className="p-3 text-gray-300">{a.date}</td>
                                  <td className="p-3 text-right text-white font-mono">{Math.round(a.value * 100) / 100}</td>
                                  <td className="p-3 text-right text-gray-400 font-mono">{Math.round(a.expected * 100) / 100}</td>
                                  <td className={`p-3 text-right font-mono ${a.deviation > 0 ? "text-red-400" : a.deviation < 0 ? "text-red-400" : "text-gray-500"}`}>{a.deviation > 0 ? "+" : ""}{Math.round(a.deviation * 100) / 100}</td>
                                  <td className="p-3 text-right font-mono text-orange-400">{a.zScore}</td>
                                  <td className="p-3 text-center">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${SEVERITY_COLORS[a.severity]}`}>{a.severity}</span>
                                  </td>
                                  <td className="p-3 text-center">
                                    {a.direction === "up" ? <TrendingUp className="w-4 h-4 text-red-400 inline" /> : a.direction === "down" ? <TrendingDown className="w-4 h-4 text-red-400 inline" /> : <span className="text-gray-500">—</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
