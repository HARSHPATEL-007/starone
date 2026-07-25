import { useState, useEffect } from "react";
import { Activity, AlertTriangle, TrendingDown, BarChart3, Eye, Target, Clock } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard, SkeletonTable } from "../components/Skeleton";
import { useToast } from "../components/Toast";

interface FatigueFreq {
  range: string;
  conversionRate: number;
}

interface FatigueData {
  frequencyData: FatigueFreq[];
  correlationCoefficient: number;
  severity: string;
  optimalFrequency: number;
  wearoutDate: string | null;
}

interface CurveParams {
  a: number;
  b: number;
  rSquared: number;
}

interface SaturationDetail {
  campaignId: string;
  campaignName: string;
  saturationScore: number;
  saturationLevel: string;
  marginalROI: number;
  marginalROITrend: string;
  curveModel: string;
  curveParams: CurveParams;
  estimatedSaturationPoint: number;
  currentSpend: number;
  fatigue: FatigueData;
  recommendation: string;
}

interface SaturationItem {
  campaignId: string;
  campaignName: string;
  saturationScore: number;
  saturationLevel: string;
  fatigueSeverity: string;
  marginalROI: number;
  recommendation: string;
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

function fmtCurrency(n: number): string {
  if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return "$" + (n / 1000).toFixed(1) + "K";
  return "$" + n.toLocaleString();
}

function saturationStyle(level: string): { bg: string; text: string; border: string } {
  const l = level?.toLowerCase() || "";
  if (l === "critical" || l === "high")
    return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" };
  if (l === "moderate")
    return { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" };
  return { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" };
}

function fatigueSeverityStyle(sev: string): { bg: string; text: string } {
  const s = sev?.toLowerCase() || "";
  if (s === "critical") return { bg: "bg-red-500/10", text: "text-red-400" };
  if (s === "high") return { bg: "bg-orange-500/10", text: "text-orange-400" };
  if (s === "moderate") return { bg: "bg-yellow-500/10", text: "text-yellow-400" };
  if (s === "low") return { bg: "bg-blue-500/10", text: "text-blue-400" };
  return { bg: "bg-green-500/10", text: "text-green-400" };
}

function scoreColor(s: number): string {
  if (s >= 90) return "#ef4444";
  if (s >= 70) return "#f97316";
  if (s >= 40) return "#eab308";
  return "#22c55e";
}

function scoreTextColor(s: number): string {
  if (s >= 90) return "text-red-400";
  if (s >= 70) return "text-orange-400";
  if (s >= 40) return "text-yellow-400";
  return "text-green-400";
}

function SaturationGauge({ score }: { score: number }) {
  const r = 80;
  const cx = 120;
  const cy = 110;
  const strokeWidth = 18;
  const arcRad = Math.PI;
  const segments = [
    { from: 0, to: 40, color: "#22c55e", label: "None" },
    { from: 40, to: 70, color: "#eab308", label: "Moderate" },
    { from: 70, to: 90, color: "#f97316", label: "High" },
    { from: 90, to: 100, color: "#ef4444", label: "Critical" },
  ];

  function polar(percent: number): { x: number; y: number } {
    const angle = (percent / 100) * arcRad;
    const x = cx - r * Math.cos(angle);
    const y = cy - r * Math.sin(angle);
    return { x, y };
  }

  function arcPath(from: number, to: number): string {
    const s = polar(from);
    const e = polar(to);
    const large = to - from > 50 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const clamped = Math.max(0, Math.min(100, score));
  const indicatorAngle = (clamped / 100) * arcRad;
  const ix = cx - r * Math.cos(indicatorAngle);
  const iy = cy - r * Math.sin(indicatorAngle);

  return (
    <svg width="240" height="130" viewBox="0 0 240 130" className="shrink-0">
      {segments.map((seg) => (
        <path
          key={seg.from}
          d={arcPath(seg.from, seg.to)}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          opacity={0.35}
        />
      ))}
      <line x1={cx} y1={cy} x2={ix} y2={iy} stroke="white" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={ix} cy={iy} r={5} fill="white" />
      <circle cx={cx} cy={cy} r={3} fill="white" />
      <text x={cx} y={cy + 28} textAnchor="middle" fill="white" fontSize="22" fontWeight="bold">
        {clamped}
      </text>
      <text x={cx} y={cy + 46} textAnchor="middle" fill="#9ca3af" fontSize="10">
        /100
      </text>
    </svg>
  );
}

function FatigueBarChart({ data }: { data: FatigueFreq[] }) {
  if (!data || data.length === 0) return <p className="text-xs text-gray-500 py-4 text-center">No frequency data available</p>;

  const maxRate = Math.max(...data.map((d) => d.conversionRate), 0.01);

  return (
    <svg width="100%" height={data.length * 36 + 20} className="overflow-visible">
      {data.map((d, i) => {
        const barWidth = (d.conversionRate / maxRate) * 60;
        const ratio = i / Math.max(data.length - 1, 1);
        const r = Math.round(34 + ratio * 221);
        const g = Math.round(197 + ratio * (94 - 197));
        const b = Math.round(94 + ratio * (44 - 94));
        const color = `rgb(${r}, ${g}, ${b})`;
        const yPos = i * 36;
        return (
          <g key={d.range}>
            <text x={0} y={yPos + 14} fill="#9ca3af" fontSize="10" textAnchor="start">
              {d.range}
            </text>
            <rect x={0} y={yPos + 20} width={`${barWidth}%`} height={14} rx={3} fill={color} opacity={0.85} />
            <text x={`${barWidth + 2}%`} y={yPos + 32} fill="#d1d5db" fontSize="10">
              {pct(d.conversionRate)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function CampaignSaturation() {
  const { addToast } = useToast();
  const [tab, setTab] = useState<"overview" | "detail">("overview");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SaturationItem[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<SaturationDetail | null>(null);

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    setLoading(true);
    try {
      const res = await api.campaignSaturation.analyzeAll();
      const list: SaturationItem[] = res?.campaigns || res || [];
      setItems(list);
    } catch {
      addToast("error", "Failed to load saturation data");
      setItems([]);
    }
    setLoading(false);
  }

  async function handleAnalyze() {
    const id = campaignId.trim();
    if (!id) {
      addToast("warning", "Enter a campaign ID");
      return;
    }
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await api.campaignSaturation.analyze(id);
      setDetail(res);
    } catch {
      addToast("error", "Analysis failed for campaign " + id);
    }
    setDetailLoading(false);
  }

  const totalCampaigns = items.length;
  const criticalCount = items.filter((i) => i.saturationLevel === "critical").length;
  const highCount = items.filter((i) => i.saturationLevel === "high").length;
  const moderateCount = items.filter((i) => i.saturationLevel === "moderate").length;
  const noneCount = items.filter((i) => i.saturationLevel === "none").length;
  const fatiguedCount = items.filter((i) => i.fatigueSeverity === "high" || i.fatigueSeverity === "critical").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="w-6 h-6 text-n0va-400" />
            Campaign Saturation & Fatigue Analyzer
          </h1>
          <p className="text-gray-400 mt-1">Detect diminishing returns and ad fatigue across campaigns</p>
        </div>
        <div className="flex bg-gray-900 rounded-lg p-0.5 border border-gray-800">
          <button
            className={`px-3 py-1.5 text-xs rounded-md ${tab === "overview" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500"}`}
            onClick={() => setTab("overview")}
          >
            Overview
          </button>
          <button
            className={`px-3 py-1.5 text-xs rounded-md ${tab === "detail" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500"}`}
            onClick={() => setTab("detail")}
          >
            Detail
          </button>
        </div>
      </div>

      {tab === "overview" && (
        <>
          {loading ? (
            <div className="grid grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              <div className="card p-4 text-center">
                <BarChart3 className="w-5 h-5 text-n0va-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{totalCampaigns}</p>
                <p className="text-xs text-gray-500">Total Campaigns</p>
              </div>
              <div className="card p-4 text-center">
                <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
                <p className="text-xs text-gray-500">Critical</p>
              </div>
              <div className="card p-4 text-center">
                <AlertTriangle className="w-5 h-5 text-orange-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-400">{highCount}</p>
                <p className="text-xs text-gray-500">High</p>
              </div>
              <div className="card p-4 text-center">
                <Activity className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-400">{moderateCount}</p>
                <p className="text-xs text-gray-500">Moderate</p>
              </div>
              <div className="card p-4 text-center">
                <Target className="w-5 h-5 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-400">{noneCount}</p>
                <p className="text-xs text-gray-500">None</p>
              </div>
              <div className="card p-4 text-center">
                <TrendingDown className="w-5 h-5 text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-400">{fatiguedCount}</p>
                <p className="text-xs text-gray-500">Fatigued</p>
              </div>
            </div>
          )}

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-500" /> Campaign Saturation Overview
            </h3>
            {loading ? (
              <SkeletonTable rows={4} />
            ) : items.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Activity className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                <p className="text-sm">No saturation data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 text-xs border-b border-gray-800">
                      <th className="pb-3 pr-4 font-medium">Campaign</th>
                      <th className="pb-3 pr-4 font-medium">Saturation Level</th>
                      <th className="pb-3 pr-4 font-medium">Saturation Score</th>
                      <th className="pb-3 pr-4 font-medium">Fatigue Severity</th>
                      <th className="pb-3 pr-4 font-medium">Marginal ROI</th>
                      <th className="pb-3 pr-4 font-medium">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const ss = saturationStyle(item.saturationLevel);
                      const fs = fatigueSeverityStyle(item.fatigueSeverity);
                      return (
                        <tr key={item.campaignId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="py-3 pr-4 text-white font-medium whitespace-nowrap">{item.campaignName || item.campaignId}</td>
                          <td className="py-3 pr-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ss.bg} ${ss.text} ${ss.border}`}>
                              {item.saturationLevel || "—"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-700 rounded-full max-w-[80px]">
                                <div
                                  className="h-2 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, item.saturationScore || 0))}%`, backgroundColor: scoreColor(item.saturationScore || 0) }}
                                />
                              </div>
                              <span className={`text-xs font-medium ${scoreTextColor(item.saturationScore || 0)}`}>
                                {Math.round(item.saturationScore || 0)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${fs.bg} ${fs.text}`}>
                              {item.fatigueSeverity || "—"}
                            </span>
                          </td>
                          <td className={`py-3 pr-4 text-xs font-medium ${(item.marginalROI || 0) < 1 ? "text-red-400" : "text-green-400"}`}>
                            {(item.marginalROI || 0).toFixed(2)}x
                          </td>
                          <td className="py-3 pr-4 text-xs text-gray-400 max-w-[200px] truncate">{item.recommendation || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "detail" && (
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <input
                className="input flex-1 text-sm"
                placeholder="Enter campaign ID..."
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAnalyze(); }}
              />
              <button className="btn-primary text-sm flex items-center gap-2" onClick={handleAnalyze} disabled={detailLoading}>
                {detailLoading ? <Clock className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                {detailLoading ? "Analyzing..." : "Analyze"}
              </button>
            </div>
          </div>

          {detailLoading && (
            <div className="grid grid-cols-2 gap-6">
              <SkeletonCard />
              <SkeletonCard />
              <div className="col-span-2"><SkeletonCard /></div>
            </div>
          )}

          {detail && !detailLoading && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">Saturation Score</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${saturationStyle(detail.saturationLevel).bg} ${saturationStyle(detail.saturationLevel).text} ${saturationStyle(detail.saturationLevel).border}`}>
                      {detail.saturationLevel || "—"}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    <SaturationGauge score={detail.saturationScore} />
                  </div>
                </div>

                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-gray-500" /> Marginal ROI
                  </h3>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl font-bold text-white">{(detail.marginalROI || 0).toFixed(2)}x</span>
                    {detail.marginalROITrend === "decreasing" && <TrendingDown className="w-5 h-5 text-red-400" />}
                    {detail.marginalROITrend === "increasing" && <Activity className="w-5 h-5 text-green-400" />}
                    {detail.marginalROITrend === "stable" && <Activity className="w-5 h-5 text-yellow-400" />}
                    <span className="text-xs text-gray-500 capitalize">({detail.marginalROITrend || "stable"})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500">Model</p>
                      <p className="text-sm font-medium text-white capitalize">{detail.curveModel || "—"}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500">R-squared</p>
                      <p className="text-sm font-medium text-white">{(detail.curveParams?.rSquared || 0).toFixed(4)}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500">a</p>
                      <p className="text-sm font-medium text-white">{(detail.curveParams?.a || 0).toFixed(4)}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500">b</p>
                      <p className="text-sm font-medium text-white">{(detail.curveParams?.b || 0).toFixed(4)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500">Est. Saturation Point</p>
                      <p className="text-sm font-medium text-yellow-400">{fmtCurrency(detail.estimatedSaturationPoint || 0)}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500">Current Spend</p>
                      <p className="text-sm font-medium text-white">{fmtCurrency(detail.currentSpend || 0)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-gray-500" /> Fatigue Analysis
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-3">Frequency vs Conversion Rate</p>
                    {detail.fatigue?.frequencyData && detail.fatigue.frequencyData.length > 0 ? (
                      <FatigueBarChart data={detail.fatigue.frequencyData} />
                    ) : (
                      <p className="text-xs text-gray-500 py-6 text-center">No frequency data available</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-gray-500">Correlation:</span>
                      <span className={`text-xs font-medium ${(detail.fatigue?.correlationCoefficient || 0) < 0 ? "text-red-400" : "text-green-400"}`}>
                        {(detail.fatigue?.correlationCoefficient || 0).toFixed(3)}
                        {(detail.fatigue?.correlationCoefficient || 0) < 0 ? " (negative)" : " (positive)"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-[10px] text-gray-500">Fatigue Severity</p>
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${fatigueSeverityStyle(detail.fatigue?.severity || "").bg} ${fatigueSeverityStyle(detail.fatigue?.severity || "").text}`}>
                          {detail.fatigue?.severity || "—"}
                        </span>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-[10px] text-gray-500">Optimal Frequency</p>
                        <p className="text-sm font-medium text-white mt-1">{detail.fatigue?.optimalFrequency ?? "—"}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-[10px] text-gray-500">Wearout Date</p>
                        <p className={`text-sm font-medium mt-1 ${detail.fatigue?.wearoutDate ? "text-red-400" : "text-green-400"}`}>
                          {detail.fatigue?.wearoutDate || "Not detected"}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-[10px] text-gray-500">Campaign</p>
                        <p className="text-sm font-medium text-white truncate mt-1">{detail.campaignName || detail.campaignId}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-500" /> Recommendation
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">{detail.recommendation || "No recommendation available."}</p>
              </div>
            </>
          )}

          {!detail && !detailLoading && (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <Activity className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No campaign selected</h3>
              <p className="text-sm text-gray-500">Enter a campaign ID above and click Analyze to view saturation details.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
