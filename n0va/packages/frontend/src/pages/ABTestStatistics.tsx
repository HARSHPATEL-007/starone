import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { Beaker, Sigma, Calculator, Clock, ArrowUpDown, CheckCircle, XCircle, RefreshCw, BarChart as BarChartIcon } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

type Tab = "test" | "sample" | "duration";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "test", label: "Test Calculator", icon: Beaker },
  { key: "sample", label: "Sample Size Calculator", icon: Calculator },
  { key: "duration", label: "Duration Estimator", icon: Clock },
];

function pValueColor(p: number): string {
  if (p < 0.05) return "text-green-400";
  if (p < 0.1) return "text-yellow-400";
  return "text-red-400";
}

export default function ABTestStatistics() {
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>("test");

  const [ci, setCi] = useState(0);
  const [cConv, setCConv] = useState(0);
  const [vi, setVi] = useState(0);
  const [vConv, setVConv] = useState(0);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [baselineRate, setBaselineRate] = useState(5);
  const [mde, setMde] = useState(2);
  const [sigLevel, setSigLevel] = useState(0.05);
  const [power, setPower] = useState(0.8);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleResult, setSampleResult] = useState<any>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);

  const [dailyVisitors, setDailyVisitors] = useState(10000);
  const [durBaseline, setDurBaseline] = useState(5);
  const [durMde, setDurMde] = useState(2);
  const [durSig, setDurSig] = useState(0.05);
  const [durPower, setDurPower] = useState(0.8);
  const [trafficAlloc, setTrafficAlloc] = useState(50);
  const [durLoading, setDurLoading] = useState(false);
  const [durResult, setDurResult] = useState<any>(null);
  const [durError, setDurError] = useState<string | null>(null);

  async function runTest() {
    if (!ci || !cConv || !vi || !vConv) {
      addToast("error", "Please fill in all fields");
      return;
    }
    setTestLoading(true);
    setTestError(null);
    setTestResult(null);
    try {
      const res = await api.abTestStatistics.test({
        controlImpressions: ci,
        controlConversions: cConv,
        variantImpressions: vi,
        variantConversions: vConv,
      });
      setTestResult(res);
    } catch (e: any) {
      setTestError(e.message || "Failed to run test");
      addToast("error", e.message || "Failed to run test");
    }
    setTestLoading(false);
  }

  async function calcSampleSize() {
    setSampleLoading(true);
    setSampleError(null);
    setSampleResult(null);
    try {
      const res = await api.abTestStatistics.sampleSize({
        baselineRate: baselineRate / 100,
        minimumDetectableEffect: mde / 100,
        significanceLevel: sigLevel,
        power,
      });
      setSampleResult(res);
    } catch (e: any) {
      setSampleError(e.message || "Failed to calculate sample size");
      addToast("error", e.message || "Failed to calculate sample size");
    }
    setSampleLoading(false);
  }

  async function estimateDuration() {
    setDurLoading(true);
    setDurError(null);
    setDurResult(null);
    try {
      const res = await api.abTestStatistics.estimateDuration({
        dailyVisitors,
        baselineRate: durBaseline / 100,
        minimumDetectableEffect: durMde / 100,
        significanceLevel: durSig,
        power: durPower,
        trafficAllocation: trafficAlloc / 100,
      });
      setDurResult(res);
    } catch (e: any) {
      setDurError(e.message || "Failed to estimate duration");
      addToast("error", e.message || "Failed to estimate duration");
    }
    setDurLoading(false);
  }

  function renderTabNav() {
    return (
      <div className="flex gap-1 border-b border-gray-800 mb-6">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "text-n0va-400 border-n0va-400"
                  : "text-gray-500 border-transparent hover:text-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>
    );
  }

  function renderStatCard(label: string, value: string | number, color = "text-white", sub?: string) {
    return (
      <div className="card p-4">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
    );
  }

  function renderTestTab() {
    return (
      <div className="space-y-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
            <Sigma className="w-4 h-4" /> Test Input
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Control Impressions</label>
              <input type="number" min={0} className="input" value={ci} onChange={(e) => setCi(Number(e.target.value))} placeholder="e.g. 10000" />
            </div>
            <div>
              <label className="label">Control Conversions</label>
              <input type="number" min={0} className="input" value={cConv} onChange={(e) => setCConv(Number(e.target.value))} placeholder="e.g. 500" />
            </div>
            <div>
              <label className="label">Variant Impressions</label>
              <input type="number" min={0} className="input" value={vi} onChange={(e) => setVi(Number(e.target.value))} placeholder="e.g. 10000" />
            </div>
            <div>
              <label className="label">Variant Conversions</label>
              <input type="number" min={0} className="input" value={vConv} onChange={(e) => setVConv(Number(e.target.value))} placeholder="e.g. 560" />
            </div>
          </div>
          <button onClick={runTest} disabled={testLoading} className="btn-primary mt-4 flex items-center gap-2">
            {testLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Beaker className="w-4 h-4" />}
            Run Test
          </button>
        </div>

        {testError && (
          <div className="card border-red-500/30 bg-red-500/5">
            <p className="text-red-400 text-sm">{testError}</p>
          </div>
        )}

        {testResult && (
          <>
            <div className="card border-b-0 rounded-b-none p-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Result</p>
                {testResult.significant ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 border border-green-500/30 text-green-400">
                    <CheckCircle className="w-4 h-4" /> Significant
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-400">
                    <XCircle className="w-4 h-4" /> Not Significant
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Lift</p>
                <p className={`text-2xl font-bold font-mono flex items-center gap-1 ${(testResult.lift || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  <ArrowUpDown className={`w-4 h-4 ${(testResult.lift || 0) >= 0 ? "text-green-400" : "text-red-400 rotate-180"}`} />
                  {testResult.lift != null ? `${(testResult.lift >= 0 ? "+" : "")}${(testResult.lift * 100).toFixed(2)}%` : "—"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {renderStatCard(
                "p-value",
                testResult.pValue != null ? testResult.pValue.toFixed(4) : "—",
                testResult.pValue != null ? pValueColor(testResult.pValue) : "text-white"
              )}
              {renderStatCard("Chi-squared", testResult.chiSquared != null ? testResult.chiSquared.toFixed(4) : "—")}
              {renderStatCard(
                "Confidence Interval",
                testResult.confidenceInterval != null
                  ? `[${testResult.confidenceInterval[0].toFixed(4)}, ${testResult.confidenceInterval[1].toFixed(4)}]`
                  : "—",
                "text-cyan-400"
              )}
              {renderStatCard("Odds Ratio", testResult.oddsRatio != null ? testResult.oddsRatio.toFixed(4) : "—", "text-purple-400")}
              {renderStatCard("Power", testResult.power != null ? `${(testResult.power * 100).toFixed(1)}%` : "—", "text-amber-400")}
              {renderStatCard(
                "Min Detectable Effect",
                testResult.minimumDetectableEffect != null ? `${(testResult.minimumDetectableEffect * 100).toFixed(2)}%` : "—",
                "text-pink-400"
              )}
              {renderStatCard(
                "Sample Size (Current)",
                testResult.sampleSize != null ? testResult.sampleSize.current.toLocaleString() : "—",
                testResult.sampleSize != null && testResult.sampleSize.current >= (testResult.sampleSize?.recommended || 0) ? "text-green-400" : "text-red-400",
                testResult.sampleSize?.recommended ? `Recommended: ${testResult.sampleSize.recommended.toLocaleString()}` : undefined
              )}
              {renderStatCard(
                "Sample Size (Required)",
                testResult.sampleSize?.recommended != null ? testResult.sampleSize.recommended.toLocaleString() : "—",
                "text-green-400"
              )}
            </div>

            {testResult.recommendation && (
              <div className={`card p-4 ${testResult.significant ? "border-green-500/20" : "border-amber-500/20"}`}>
                <div className="flex items-start gap-3">
                  {testResult.significant ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm text-gray-300">{testResult.recommendation}</p>
                </div>
              </div>
            )}

            <div className="card">
              <h4 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
                <BarChartIcon className="w-4 h-4" /> Conversion Rate Comparison
              </h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Control", rate: (cConv / ci) * 100, conversions: cConv, impressions: ci },
                      { name: "Variant", rate: (vConv / vi) * 100, conversions: vConv, impressions: vi },
                    ]}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                    <XAxis type="number" stroke="#6b7280" fontSize={11} unit="%" domain={[0, "auto"]} />
                    <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={11} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                      formatter={(value: number, name: string) => {
                        if (name === "rate") return [`${value.toFixed(2)}%`, "Conversion Rate"];
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="rate" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={32}>
                      <LabelList dataKey="rate" position="right" formatter={(v: number) => `${v.toFixed(2)}%`} fill="#9ca3af" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-3 rounded-lg bg-gray-800/50">
                  <p className="text-xs text-gray-500">Control Rate</p>
                  <p className="text-lg font-bold text-white font-mono">{(cConv / ci * 100).toFixed(2)}%</p>
                  <p className="text-xs text-gray-600">{cConv.toLocaleString()} / {ci.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-800/50">
                  <p className="text-xs text-gray-500">Variant Rate</p>
                  <p className="text-lg font-bold text-white font-mono">{(vConv / vi * 100).toFixed(2)}%</p>
                  <p className="text-xs text-gray-600">{vConv.toLocaleString()} / {vi.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  function renderSampleTab() {
    const mdeValues = [1, 2, 5, 10, 20];

    return (
      <div className="space-y-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
            <Calculator className="w-4 h-4" /> Input Parameters
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Baseline Conversion Rate (%)</label>
              <input type="number" min={0.1} max={99.9} step={0.1} className="input" value={baselineRate} onChange={(e) => setBaselineRate(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Minimum Detectable Effect (%)</label>
              <input type="number" min={0.1} max={50} step={0.1} className="input" value={mde} onChange={(e) => setMde(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Significance Level (α)</label>
              <select className="input" value={sigLevel} onChange={(e) => setSigLevel(Number(e.target.value))}>
                <option value={0.01}>0.01 (99% confidence)</option>
                <option value={0.05}>0.05 (95% confidence)</option>
                <option value={0.1}>0.10 (90% confidence)</option>
              </select>
            </div>
            <div>
              <label className="label">Power (1 − β)</label>
              <select className="input" value={power} onChange={(e) => setPower(Number(e.target.value))}>
                <option value={0.8}>0.80 (80%)</option>
                <option value={0.9}>0.90 (90%)</option>
                <option value={0.95}>0.95 (95%)</option>
              </select>
            </div>
          </div>
          <button onClick={calcSampleSize} disabled={sampleLoading} className="btn-primary mt-4 flex items-center gap-2">
            {sampleLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            Calculate
          </button>
        </div>

        {sampleError && (
          <div className="card border-red-500/30 bg-red-500/5">
            <p className="text-red-400 text-sm">{sampleError}</p>
          </div>
        )}

        {sampleResult && (
          <>
            <div className="card flex flex-col items-center justify-center py-10">
              <p className="text-xs text-gray-500 mb-2">Required Sample Size (per variant)</p>
              <p className="text-5xl font-bold text-n0va-400 font-mono">
                {sampleResult.sampleSize != null ? sampleResult.sampleSize.toLocaleString() : "—"}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Baseline: {baselineRate}% · MDE: {mde}% · α: {sigLevel} · Power: {power * 100}%
              </p>
            </div>

            <div className="card">
              <h4 className="text-sm font-semibold text-gray-400 mb-4">Sensitivity Table — Required Sample Size by MDE</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500">
                      <th className="text-left p-3">Minimum Detectable Effect</th>
                      {mdeValues.map((v) => (
                        <th key={v} className={`text-right p-3 font-mono ${v === mde ? "text-n0va-400" : ""}`}>{v}%</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-800/50">
                      <td className="p-3 text-gray-400 font-medium">Required Sample Size</td>
                      {(sampleResult.sensitivityTable || mdeValues.map(() => null)).map((val: any, i: number) => (
                        <td key={i} className={`p-3 text-right font-mono ${mdeValues[i] === mde ? "text-n0va-400 font-bold" : "text-gray-300"}`}>
                          {val != null ? val.toLocaleString() : "—"}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  function renderDurationTab() {
    return (
      <div className="space-y-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Traffic & Parameters
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Daily Visitors</label>
              <input type="number" min={1} className="input" value={dailyVisitors} onChange={(e) => setDailyVisitors(Number(e.target.value))} placeholder="e.g. 10000" />
            </div>
            <div>
              <label className="label">Baseline Conversion Rate (%)</label>
              <input type="number" min={0.1} max={99.9} step={0.1} className="input" value={durBaseline} onChange={(e) => setDurBaseline(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Minimum Detectable Effect (%)</label>
              <input type="number" min={0.1} max={50} step={0.1} className="input" value={durMde} onChange={(e) => setDurMde(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Significance Level (α)</label>
              <select className="input" value={durSig} onChange={(e) => setDurSig(Number(e.target.value))}>
                <option value={0.01}>0.01 (99% confidence)</option>
                <option value={0.05}>0.05 (95% confidence)</option>
                <option value={0.1}>0.10 (90% confidence)</option>
              </select>
            </div>
            <div>
              <label className="label">Power (1 − β)</label>
              <select className="input" value={durPower} onChange={(e) => setDurPower(Number(e.target.value))}>
                <option value={0.8}>0.80 (80%)</option>
                <option value={0.9}>0.90 (90%)</option>
                <option value={0.95}>0.95 (95%)</option>
              </select>
            </div>
            <div>
              <label className="label">Traffic Allocation to Variant (%)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={50}
                  step={5}
                  className="w-full accent-n0va-500"
                  value={trafficAlloc}
                  onChange={(e) => setTrafficAlloc(Number(e.target.value))}
                />
                <span className="text-sm font-mono text-white w-10 text-right">{trafficAlloc}%</span>
              </div>
            </div>
          </div>
          <button onClick={estimateDuration} disabled={durLoading} className="btn-primary mt-4 flex items-center gap-2">
            {durLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
            Estimate
          </button>
        </div>

        {durError && (
          <div className="card border-red-500/30 bg-red-500/5">
            <p className="text-red-400 text-sm">{durError}</p>
          </div>
        )}

        {durResult && (
          <>
            <div className="grid grid-cols-3 gap-4">
              {renderStatCard(
                "Required Sample Size",
                durResult.requiredSampleSize != null ? durResult.requiredSampleSize.toLocaleString() : "—",
                "text-n0va-400"
              )}
              {renderStatCard(
                "Estimated Days",
                durResult.estimatedDays != null ? durResult.estimatedDays.toString() : "—",
                "text-cyan-400",
                durResult.estimatedWeeks != null ? `≈ ${durResult.estimatedWeeks} weeks` : undefined
              )}
              {renderStatCard(
                "Estimated Weeks",
                durResult.estimatedWeeks != null ? durResult.estimatedWeeks.toString() : "—",
                "text-purple-400",
                durResult.estimatedDays != null ? `≈ ${durResult.estimatedDays} days` : undefined
              )}
            </div>

            {durResult.estimatedDays != null && (
              <div className="card">
                <h4 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Timeline
                </h4>
                <div className="relative h-12 bg-gray-800 rounded-lg overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-n0va-600 to-n0va-400 rounded-lg flex items-center justify-end pr-3 transition-all duration-500"
                    style={{ width: `${Math.min(100, durResult.estimatedDays / 90 * 100)}%` }}
                  >
                    <span className="text-xs font-medium text-white">{durResult.estimatedDays} days</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Day 0</span>
                  <span>Day {durResult.estimatedDays}</span>
                </div>
                {durResult.recommendation && (
                  <p className="text-sm text-gray-400 mt-4 italic">{durResult.recommendation}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Beaker className="w-6 h-6 text-n0va-400" />
            A/B Test Statistics
          </h1>
          <p className="text-gray-400 mt-1">Statistical analysis, sample size planning, and duration estimation</p>
        </div>
      </div>

      {renderTabNav()}

      {tab === "test" && renderTestTab()}
      {tab === "sample" && renderSampleTab()}
      {tab === "duration" && renderDurationTab()}
    </div>
  );
}
