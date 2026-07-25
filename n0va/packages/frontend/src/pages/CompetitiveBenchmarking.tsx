import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart3, TrendingUp, TrendingDown, Target, Award, Lightbulb, AlertTriangle, CheckCircle, Activity, RefreshCw } from "lucide-react";
import { useToast } from "../components/Toast";
import { SkeletonCard, SkeletonChart } from "../components/Skeleton";
import { api } from "../api/client";

interface Comparison {
  metric: string;
  label: string;
  yourValue: number;
  benchmark: number;
  difference: number;
  percentile: number;
  isBetter: boolean;
}

interface BenchmarkingData {
  industry: string;
  overallScore: number;
  comparisons: Comparison[];
  yourPerformance: Record<string, number>;
  industryBenchmarks: Record<string, number>;
  topWeaknesses: string[];
  topStrengths: string[];
  recommendations: string[];
}

interface Industry {
  id: string;
  name: string;
}

export default function CompetitiveBenchmarking() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [data, setData] = useState<BenchmarkingData | null>(null);

  useEffect(() => {
    api.competitiveBenchmarking.industries()
      .then((list) => {
        setIndustries(list || []);
        if (list && list.length > 0) setSelectedIndustry(list[0].id);
      })
      .catch(() => addToast("error", "Failed to load industries"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedIndustry) return;
    setLoading(true);
    api.competitiveBenchmarking.get(selectedIndustry)
      .then(setData)
      .catch(() => addToast("error", "Failed to load benchmarking data"))
      .finally(() => setLoading(false));
  }, [selectedIndustry]);

  async function handleRefresh() {
    if (!selectedIndustry) return;
    setRefreshing(true);
    try {
      const result = await api.competitiveBenchmarking.get(selectedIndustry);
      setData(result);
      addToast("success", "Benchmarking data refreshed");
    } catch {
      addToast("error", "Failed to refresh data");
    }
    setRefreshing(false);
  }

  const scoreColor = !data ? "text-gray-400" :
    data.overallScore >= 70 ? "text-green-400" :
    data.overallScore >= 40 ? "text-yellow-400" : "text-red-400";

  const scoreRingColor = !data ? "stroke-gray-600" :
    data.overallScore >= 70 ? "stroke-green-400" :
    data.overallScore >= 40 ? "stroke-yellow-400" : "stroke-red-400";

  const circumference = 2 * Math.PI * 54;
  const scoreOffset = data ? circumference - (data.overallScore / 100) * circumference : circumference;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-n0va-400" />
            Competitive Benchmarking
          </h1>
          <p className="text-gray-400 mt-1">Compare your performance against industry benchmarks</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input text-sm w-auto min-w-[180px]"
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            disabled={loading}
          >
            {industries.length === 0 && <option value="">Loading...</option>}
            {industries.map((ind) => (
              <option key={ind.id} value={ind.id}>{ind.name}</option>
            ))}
          </select>
          <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary text-sm flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
          <SkeletonChart />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : !data ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <BarChart3 className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No benchmarking data</h3>
          <p className="text-sm text-gray-500">Select an industry to view competitive benchmarks.</p>
        </div>
      ) : (
        <>
          {/* Overall Score + Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-6 flex items-center gap-6">
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#1f2937" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="54"
                    fill="none"
                    className={scoreRingColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={scoreOffset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${scoreColor}`}>{data.overallScore}</span>
                  <span className="text-[10px] text-gray-500 mt-0.5">SCORE</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Overall Benchmark Score</p>
                <p className="text-lg font-semibold text-white">{data.industry}</p>
                <div className="flex items-center gap-2 mt-2">
                  {data.overallScore >= 70 ? (
                    <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle className="w-3.5 h-3.5" /> Above Average</span>
                  ) : data.overallScore >= 40 ? (
                    <span className="flex items-center gap-1 text-xs text-yellow-400"><Activity className="w-3.5 h-3.5" /> Average</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-400"><AlertTriangle className="w-3.5 h-3.5" /> Needs Improvement</span>
                  )}
                </div>
              </div>
            </div>

            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Strengths</p>
                <p className="text-xl font-bold text-green-400">{data.topStrengths.length}</p>
                <p className="text-[10px] text-gray-600">areas performing above benchmark</p>
              </div>
            </div>

            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Weaknesses</p>
                <p className="text-xl font-bold text-red-400">{data.topWeaknesses.length}</p>
                <p className="text-[10px] text-gray-600">areas needing improvement</p>
              </div>
            </div>
          </div>

          {/* Metric Comparison Cards */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-n0va-400" />
              Your Performance vs Industry Benchmark
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {data.comparisons.map((c) => (
                <div key={c.metric} className="p-4 bg-gray-800/30 rounded-lg border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{c.label}</span>
                    <span
                      className={`flex items-center gap-1 text-xs font-semibold ${
                        c.isBetter ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {c.isBetter ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {c.isBetter ? "Better" : "Worse"}
                    </span>
                  </div>
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-[10px] text-gray-600">Your Value</p>
                      <p className="text-base font-bold text-white">{c.yourValue.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-600">Benchmark</p>
                      <p className="text-sm font-medium text-gray-400">{c.benchmark.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          c.isBetter ? "bg-green-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(c.percentile, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold ${c.isBetter ? "text-green-400" : "text-red-400"}`}>
                      {c.difference > 0 ? "+" : ""}{c.difference.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-600">
                    <span>0th</span>
                    <span className="text-gray-500">{c.percentile.toFixed(0)}th percentile</span>
                    <span>100th</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-n0va-400" />
              Metric Breakdown
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.comparisons.map((c) => ({ name: c.label, You: c.yourValue, Benchmark: c.benchmark }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                  <YAxis stroke="#6b7280" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="You" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Benchmark" fill="#374151" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-green-400" />
                Top Strengths
              </h3>
              {data.topStrengths.length === 0 ? (
                <p className="text-sm text-gray-600">No strengths identified yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.topStrengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-green-500/5 rounded-lg border border-green-500/10">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                      <span className="text-sm text-gray-300">{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-red-400" />
                Top Weaknesses
              </h3>
              {data.topWeaknesses.length === 0 ? (
                <p className="text-sm text-gray-600">No weaknesses identified yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.topWeaknesses.map((w, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <span className="text-sm text-gray-300">{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              AI Recommendations
            </h3>
            {data.recommendations.length === 0 ? (
              <p className="text-sm text-gray-600">No recommendations available yet.</p>
            ) : (
              <div className="space-y-3">
                {data.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
                    <div className="w-7 h-7 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-300">{rec}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
