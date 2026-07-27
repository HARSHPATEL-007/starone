import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { DollarSign, TrendingUp, BarChart3, RefreshCw, PieChart as PieIcon, Activity, Split } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

const MODEL_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#ec4899"];

const spendData = [{ channel: "tv", spend: [5000, 5200, 4800, 5500, 6000, 5800, 6200, 5900] }, { channel: "digital", spend: [3000, 3200, 3500, 3800, 4000, 4200, 4500, 4300] }, { channel: "print", spend: [1000, 1100, 900, 1200, 1100, 1300, 1400, 1200] }];
const conversionsMm = [200, 220, 210, 250, 280, 270, 300, 285];
const controlData = [5, 6, 4, 7, 5, 6, 4, 8, 5, 6];
const treatmentData = [8, 9, 10, 7, 9, 8, 10, 11, 9, 10];
const marginalChannelData = [
  { channel: "Search", spend: 8000, conversions: 320, conversionValue: 85 },
  { channel: "Social", spend: 5000, conversions: 180, conversionValue: 65 },
  { channel: "Display", spend: 3000, conversions: 90, conversionValue: 55 },
  { channel: "Email", spend: 2000, conversions: 140, conversionValue: 45 },
];
const decompositionCampaigns = [
  { name: "Q1 Launch", spend: 15000, incrementalConversions: 320, brandConversions: 120, directConversions: 80, conversionValue: 75 },
  { name: "Q2 Retarget", spend: 10000, incrementalConversions: 200, brandConversions: 80, directConversions: 60, conversionValue: 85 },
  { name: "Q3 Awareness", spend: 12000, incrementalConversions: 150, brandConversions: 200, directConversions: 40, conversionValue: 65 },
];

type Tab = "media-mix" | "incremental-lift" | "marginal-roi" | "decomposition";

export default function MarketingROIAnalyzer() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("media-mix");
  const [loadingMm, setLoadingMm] = useState(false);
  const [loadingLift, setLoadingLift] = useState(false);
  const [loadingMr, setLoadingMr] = useState(false);
  const [loadingDec, setLoadingDec] = useState(false);
  const [mmResult, setMmResult] = useState<any>(null);
  const [liftResult, setLiftResult] = useState<any>(null);
  const [mrResult, setMrResult] = useState<any>(null);
  const [decResult, setDecResult] = useState<any>(null);

  async function runMediaMix() {
    setLoadingMm(true);
    try {
      const res = await api.dsAlgorithms.mediaMixDecomposer({ spendData, conversions: conversionsMm, lambda: 0.1 });
      setMmResult(res.data);
    } catch { addToast("error", "Media mix analysis failed"); }
    setLoadingMm(false);
  }

  async function runLift() {
    setLoadingLift(true);
    try {
      const res = await api.dsAlgorithms.incrementalLiftAnalysis({ controlConversions: controlData, treatmentConversions: treatmentData });
      setLiftResult(res.data);
    } catch { addToast("error", "Lift analysis failed"); }
    setLoadingLift(false);
  }

  async function runMarginalRoi() {
    setLoadingMr(true);
    try {
      const res = await api.dsAlgorithms.marginalROICalculation({ channelData: marginalChannelData });
      setMrResult(res.data);
    } catch { addToast("error", "Marginal ROI calculation failed"); }
    setLoadingMr(false);
  }

  async function runDecomposition() {
    setLoadingDec(true);
    try {
      const res = await api.dsAlgorithms.marketingRoiDecomposition({ campaigns: decompositionCampaigns });
      setDecResult(res.data);
    } catch { addToast("error", "ROI decomposition failed"); }
    setLoadingDec(false);
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "media-mix", label: "Media Mix", icon: PieIcon },
    { id: "incremental-lift", label: "Incremental Lift", icon: TrendingUp },
    { id: "marginal-roi", label: "Marginal ROI", icon: Activity },
    { id: "decomposition", label: "ROI Decomposition", icon: Split },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="w-8 h-8 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Marketing ROI Analyzer</h1>
          <p className="text-gray-400 text-sm">Decompose ROI across channels and campaigns</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-800 p-1 rounded-lg w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === t.id ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "media-mix" && (
        <div className="space-y-6">
          <button onClick={runMediaMix} disabled={loadingMm}
            className="btn-primary flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> {loadingMm ? "Running..." : "Run Media Mix Decomposition"}
          </button>

          {mmResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="card p-4">
                  <p className="text-sm text-gray-400">R² Score</p>
                  <p className="text-2xl font-bold text-emerald-400">{mmResult.rSquared}</p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-gray-400">Intercept</p>
                  <p className="text-2xl font-bold">{mmResult.intercept}</p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-gray-400">Channels</p>
                  <p className="text-2xl font-bold">{mmResult.channels?.length || 0}</p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-gray-400">Algorithm</p>
                  <p className="text-xl font-bold text-blue-400 truncate">{mmResult.algorithm}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Channel Contribution</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={Object.entries(mmResult.contribution || {}).map(([k, v]) => ({ name: k, value: v as number }))}
                        cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }: any) => `${name}: ${value}`}>
                        {Object.keys(mmResult.contribution || {}).map((_, i) => (
                          <Cell key={i} fill={MODEL_COLORS[i % MODEL_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Channel Spend Over Time</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={Array.from({ length: 8 }, (_, w) => {
                      const obj: Record<string, any> = { week: `W${w + 1}` };
                      spendData.forEach((ch) => { obj[ch.channel] = ch.spend[w]; });
                      return obj;
                    })}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="week" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      {spendData.map((ch, i) => (
                        <Line key={ch.channel} type="monotone" dataKey={ch.channel}
                          stroke={MODEL_COLORS[i % MODEL_COLORS.length]} strokeWidth={2} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Channel Coefficients</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2">Channel</th>
                        <th className="text-right py-2">Coefficient</th>
                        <th className="text-right py-2">Contribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mmResult.channels?.map((ch: string, i: number) => (
                        <tr key={ch} className="border-b border-gray-800">
                          <td className="py-2 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length] }} />
                            {ch}
                          </td>
                          <td className="text-right py-2 font-mono">{mmResult.coefficients[i]}</td>
                          <td className="text-right py-2 font-mono">{mmResult.contribution?.[ch] ?? "-"}</td>
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

      {activeTab === "incremental-lift" && (
        <div className="space-y-6">
          <button onClick={runLift} disabled={loadingLift}
            className="btn-primary flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> {loadingLift ? "Running..." : "Run Incremental Lift Analysis"}
          </button>

          {liftResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="card p-4">
                  <p className="text-sm text-gray-400">Lift</p>
                  <p className={`text-2xl font-bold ${liftResult.lift > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {(liftResult.lift * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-gray-400">P-Value</p>
                  <p className="text-2xl font-bold">{liftResult.pValue}</p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-gray-400">Significance</p>
                  {liftResult.significant ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Significant
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/30">
                      Not Significant
                    </span>
                  )}
                </div>
                <div className="card p-4">
                  <p className="text-sm text-gray-400">Algorithm</p>
                  <p className="text-xl font-bold text-blue-400 truncate">{liftResult.algorithm}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Control vs Treatment</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={[
                      { name: "Control", mean: liftResult.controlMean, fill: MODEL_COLORS[0] },
                      { name: "Treatment", mean: liftResult.treatmentMean, fill: MODEL_COLORS[1] },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="mean" name="Mean Conversions" radius={[4, 4, 0, 0]}>
                        {[{ name: "Control", mean: liftResult.controlMean }, { name: "Treatment", mean: liftResult.treatmentMean }].map((e, i) => (
                          <Cell key={e.name} fill={MODEL_COLORS[i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Weekly Conversion Comparison</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={liftResult.controlConversions.map((v: number, i: number) => ({
                      week: `W${i + 1}`, control: v, treatment: liftResult.treatmentConversions[i],
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="week" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="control" fill={MODEL_COLORS[0]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="treatment" fill={MODEL_COLORS[1]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Summary Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Control Mean</p>
                    <p className="text-lg font-bold">{liftResult.controlMean}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Treatment Mean</p>
                    <p className="text-lg font-bold">{liftResult.treatmentMean}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "marginal-roi" && (
        <div className="space-y-6">
          <button onClick={runMarginalRoi} disabled={loadingMr}
            className="btn-primary flex items-center gap-2">
            <Activity className="w-4 h-4" /> {loadingMr ? "Running..." : "Calculate Marginal ROI"}
          </button>

          {mrResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="card p-4">
                  <p className="text-sm text-gray-400">Channels</p>
                  <p className="text-2xl font-bold">{mrResult.channels}</p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-gray-400">Algorithm</p>
                  <p className="text-xl font-bold text-blue-400 truncate">{mrResult.algorithm}</p>
                </div>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Current ROI vs Marginal ROI</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={mrResult.marginalRois?.map((r: any) => ({
                    name: r.channel, "Current ROI": r.currentRoi, "Marginal ROI": r.marginalRoi,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Current ROI" fill={MODEL_COLORS[0]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Marginal ROI" fill={MODEL_COLORS[2]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Optimal Spend Allocation</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2">Channel</th>
                        <th className="text-right py-2">Current ROI</th>
                        <th className="text-right py-2">Marginal ROI</th>
                        <th className="text-right py-2">Optimal Spend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mrResult.marginalRois?.map((r: any, i: number) => (
                        <tr key={r.channel} className="border-b border-gray-800">
                          <td className="py-2 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length] }} />
                            {r.channel}
                          </td>
                          <td className="text-right py-2 font-mono">{r.currentRoi}x</td>
                          <td className="text-right py-2 font-mono">{r.marginalRoi}x</td>
                          <td className="text-right py-2 font-mono">${r.optimalSpend.toLocaleString()}</td>
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

      {activeTab === "decomposition" && (
        <div className="space-y-6">
          <button onClick={runDecomposition} disabled={loadingDec}
            className="btn-primary flex items-center gap-2">
            <Split className="w-4 h-4" /> {loadingDec ? "Running..." : "Run ROI Decomposition"}
          </button>

          {decResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="card p-4">
                  <p className="text-sm text-gray-400">Aggregate Incremental ROI</p>
                  <p className="text-2xl font-bold text-emerald-400">{decResult.aggregateIncrementalRoi}x</p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-gray-400">Aggregate Brand ROI</p>
                  <p className="text-2xl font-bold text-blue-400">{decResult.aggregateBrandRoi}x</p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-gray-400">Aggregate Direct ROI</p>
                  <p className="text-2xl font-bold text-amber-400">{decResult.aggregateDirectRoi}x</p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-gray-400">Campaigns</p>
                  <p className="text-2xl font-bold">{decResult.campaigns}</p>
                </div>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">ROI Decomposition by Campaign</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={decResult.decomposition?.map((d: any) => ({
                    name: d.name, Incremental: d.incrementalRoi, Brand: d.brandRoi, Direct: d.directRoi,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Incremental" stackId="roi" fill={MODEL_COLORS[0]} />
                    <Bar dataKey="Brand" stackId="roi" fill={MODEL_COLORS[1]} />
                    <Bar dataKey="Direct" stackId="roi" fill={MODEL_COLORS[2]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Incrementality Share</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={decResult.decomposition?.map((d: any) => ({
                      name: d.name, value: d.incrementalityShare,
                    }))} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                      label={({ name, value }: any) => `${name}: ${(value * 100).toFixed(1)}%`}>
                      {decResult.decomposition?.map((_: any, i: number) => (
                        <Cell key={i} fill={MODEL_COLORS[i % MODEL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Decomposition Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2">Campaign</th>
                        <th className="text-right py-2">Incremental ROI</th>
                        <th className="text-right py-2">Brand ROI</th>
                        <th className="text-right py-2">Direct ROI</th>
                        <th className="text-right py-2">Total ROI</th>
                        <th className="text-right py-2">Incrementality Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decResult.decomposition?.map((d: any) => (
                        <tr key={d.name} className="border-b border-gray-800">
                          <td className="py-2 font-medium">{d.name}</td>
                          <td className="text-right py-2 font-mono text-emerald-400">{d.incrementalRoi}x</td>
                          <td className="text-right py-2 font-mono text-blue-400">{d.brandRoi}x</td>
                          <td className="text-right py-2 font-mono text-amber-400">{d.directRoi}x</td>
                          <td className="text-right py-2 font-mono">{d.totalRoi}x</td>
                          <td className="text-right py-2 font-mono">{(d.incrementalityShare * 100).toFixed(1)}%</td>
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
    </div>
  );
}
