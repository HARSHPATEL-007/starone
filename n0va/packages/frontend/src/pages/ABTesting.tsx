import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { GitCompare, Plus, X, Play, Square, Trophy, ChevronDown, ChevronRight, Trash2, BarChart3, Users, Target, RefreshCw, DollarSign, TrendingUp, Eye, PauseCircle, Copy } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

interface Variant {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cvr: number;
  roas: number;
  pValue?: number;
  uplift?: number;
}

interface ABTest {
  _id: string;
  testId: string;
  testName: string;
  testType: "creative" | "audience" | "landing_page" | "offer";
  status: "running" | "paused" | "completed";
  confidence: number;
  bayesianProbability?: number;
  pValue?: number;
  winner?: string;
  variants: Variant[];
  recommendation?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

const TEST_TYPES = [
  { value: "creative", label: "Creative" },
  { value: "audience", label: "Audience" },
  { value: "landing_page", label: "Landing Page" },
  { value: "offer", label: "Offer" },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  running: { label: "Running", color: "text-green-400 bg-green-500/10", icon: Play },
  paused: { label: "Paused", color: "text-amber-400 bg-amber-500/10", icon: Square },
  completed: { label: "Completed", color: "text-blue-400 bg-blue-500/10", icon: Trophy },
};

export default function ABTesting() {
  const { addToast } = useToast();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [form, setForm] = useState({ testName: "", testType: "creative" as ABTest["testType"] });

  useEffect(() => { loadTests(); }, []);

  async function loadTests() {
    setLoading(true);
    try {
      const data = await api.abTesting.list();
      setTests(data || []);
    } catch (e: any) {
      addToast("error", e.message || "Failed to load tests");
    }
    setLoading(false);
  }

  function toggle(id: string) {
    setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function handleCreate() {
    if (!form.testName.trim()) { addToast("error", "Test name is required"); return; }
    try {
      await api.abTesting.create({
        testName: form.testName.trim(),
        testType: form.testType,
        variants: [
          { id: "control", name: "Control" },
          { id: "variant_b", name: "Variant B" },
          { id: "variant_c", name: "Variant C" },
          { id: "variant_d", name: "Variant D" },
        ],
      });
      addToast("success", "A/B test created");
      setShowCreate(false);
      loadTests();
    } catch (e: any) {
      addToast("error", e.message || "Failed to create test");
    }
  }

  async function handleEndTest(test: ABTest) {
    try {
      const result = await api.abTesting.end(test._id);
      setTests(prev => prev.map(t => t._id === test._id ? { ...t, ...result } : t));
      addToast("success", "Test completed");
      loadTests();
    } catch (e: any) {
      addToast("error", e.message || "Failed to end test");
    }
  }

  async function handleDuplicate(test: ABTest) {
    try {
      await api.abTesting.create({
        testName: `${test.testName} (Copy)`,
        testType: test.testType,
        variants: test.variants.map(v => ({ id: v.id, name: v.name })),
      });
      addToast("success", "Test duplicated");
      loadTests();
    } catch (e: any) {
      addToast("error", e.message || "Failed to duplicate");
    }
  }

  async function handleTogglePause(test: ABTest) {
    const newStatus = test.status === "running" ? "paused" : "running";
    try {
      await api.abTesting.update(test._id, { status: newStatus });
      addToast("success", `Test ${newStatus}`);
      loadTests();
    } catch (e: any) {
      addToast("error", e.message || `Failed to ${newStatus} test`);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.abTesting.delete(id);
      addToast("success", "Test deleted");
      loadTests();
    } catch (e: any) {
      addToast("error", e.message || "Failed to delete");
    }
  }

  function bestMetric(variants: Variant[], metric: keyof Variant, higher = true): string {
    const sorted = [...variants].sort((a, b) => higher ? (b[metric] as number) - (a[metric] as number) : (a[metric] as number) - (b[metric] as number));
    return sorted[0]?.name || "—";
  }

  const filtered = tests.filter(t => {
    if (filterType !== "all" && t.testType !== filterType) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <GitCompare className="w-6 h-6 text-n0va-400" />
            A/B Testing
          </h1>
          <p className="text-gray-400 mt-1">{tests.length} tests · {filtered.length} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadTests} className="btn-ghost text-sm flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          <button onClick={() => { setForm({ testName: "", testType: "creative" }); setShowCreate(true); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Test</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Total Tests</p><p className="text-2xl font-bold text-white">{tests.length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Running</p><p className="text-2xl font-bold text-green-400">{tests.filter(t => t.status === "running").length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Completed</p><p className="text-2xl font-bold text-blue-400">{tests.filter(t => t.status === "completed").length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Avg Confidence</p><p className="text-2xl font-bold text-amber-400">
          {tests.filter(t => t.status === "completed" && t.confidence).length > 0
            ? `${(tests.filter(t => t.status === "completed").reduce((s, t) => s + (t.confidence || 0), 0) / tests.filter(t => t.status === "completed").length * 100).toFixed(1)}%`
            : "—"}
        </p></div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select className="input text-sm w-auto" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {TEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="input text-sm w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="running">Running</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">New A/B Test</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleCreate(); }} className="space-y-4">
              <div><label className="label">Test Name</label><input className="input" placeholder="e.g. Hero CTA Button" value={form.testName} onChange={e => setForm({ ...form, testName: e.target.value })} autoFocus /></div>
              <div><label className="label">Test Type</label><select className="input" value={form.testType} onChange={e => setForm({ ...form, testType: e.target.value as ABTest["testType"] })}>{TEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              <p className="text-xs text-gray-500">Creates 4 variants (Control, B, C, D) with auto-generated performance data.</p>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Test</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]"><RefreshCw className="w-6 h-6 animate-spin text-n0va-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <GitCompare className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No A/B tests found</h3>
          <p className="text-sm text-gray-500">Create your first test to start optimizing campaigns.</p>
          <button onClick={() => { setForm({ testName: "", testType: "creative" }); setShowCreate(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> New Test</button>
        </div>
      ) : (
        filtered.map(test => {
          const isOpen = expanded.has(test._id);
          const sc = statusConfig[test.status] || statusConfig.running;
          const StatusIcon = sc.icon;
          const bestVariant = [...test.variants].sort((a, b) => b.cvr - a.cvr)[0];
          return (
            <div key={test._id} className="card overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <button onClick={() => toggle(test._id)} className="p-1 mt-0.5 text-gray-600 hover:text-gray-300">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base font-semibold text-white">{test.testName}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.color}`}><StatusIcon className="w-3 h-3" /> {sc.label}</span>
                      <span className="text-xs text-gray-600">{TEST_TYPES.find(t => t.value === test.testType)?.label}</span>
                      {test.status === "completed" && test.confidence && (
                        <span className="text-xs text-amber-400">{(test.confidence * 100).toFixed(1)}% confidence</span>
                      )}
                      {test.status === "completed" && test.bayesianProbability && (
                        <span className="text-xs text-purple-400">{(test.bayesianProbability * 100).toFixed(1)}% Bayesian prob.</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-gray-500"><Users className="w-3 h-3 inline mr-1" />{test.variants.length} variants</span>
                      <span className="text-xs text-gray-500"><Target className="w-3 h-3 inline mr-1" />{test.variants.reduce((s, v) => s + v.impressions, 0).toLocaleString()} impressions</span>
                      {test.status === "completed" && test.winner && (
                        <span className="text-xs text-green-400"><Trophy className="w-3 h-3 inline mr-1" />Winner: {test.variants.find(v => v.id === test.winner)?.name || test.winner}</span>
                      )}
                    </div>
                    {test.recommendation && (
                      <p className="text-xs text-gray-500 mt-2 italic">{test.recommendation}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {test.status === "running" && <button onClick={() => handleEndTest(test)} className="btn-ghost text-xs py-1 px-2"><Trophy className="w-3 h-3 mr-1" />End</button>}
                    {(test.status === "running" || test.status === "paused") && (
                      <button onClick={() => handleTogglePause(test)} className={`p-1.5 ${test.status === "paused" ? "text-green-400 hover:bg-green-500/10" : "text-amber-400 hover:bg-amber-500/10"}`}>
                        {test.status === "paused" ? <Play className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                      </button>
                    )}
                    <button onClick={() => handleDuplicate(test)} className="p-1.5 text-gray-600 hover:text-gray-300"><Copy className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(test._id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-gray-800">
                  {test.status === "completed" && test.confidence && (
                    <div className="px-5 py-3 bg-gray-800/30 border-b border-gray-800">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Confidence: {(test.confidence * 100).toFixed(1)}%</span>
                        {test.bayesianProbability != null && <span>Bayesian Prob.: {(test.bayesianProbability * 100).toFixed(1)}%</span>}
                        {test.pValue != null && <span>p-value: {test.pValue.toFixed(4)}</span>}
                        <span>Status: {test.status}</span>
                        {test.completedAt && <span>Completed: {new Date(test.completedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  )}
                  <div className="p-5 border-b border-gray-800">
                    <h4 className="text-sm font-semibold text-gray-400 mb-3">Variant Comparison</h4>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={test.variants.map(v => ({ name: v.name, CVR: +(v.cvr * 100).toFixed(2), CTR: +(v.ctr * 100).toFixed(2), ROAS: +v.roas.toFixed(2) }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                          <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                          <YAxis stroke="#6b7280" fontSize={11} />
                          <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                          <Bar dataKey="CVR" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="CTR" fill="#1a6dff" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="ROAS" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-500" /> CVR</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500" /> CTR</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500" /> ROAS</span>
                      <span className="text-gray-600">Best CVR: {bestMetric(test.variants, "cvr")}</span>
                      <span className="text-gray-600">Best ROAS: {bestMetric(test.variants, "roas")}</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-xs text-gray-500">
                          <th className="text-left p-3 pl-5">Variant</th>
                          <th className="text-right p-3">Impressions</th>
                          <th className="text-right p-3">Clicks</th>
                          <th className="text-right p-3">CTR</th>
                          <th className="text-right p-3">Conversions</th>
                          <th className="text-right p-3">CVR</th>
                          <th className="text-right p-3">Spend</th>
                          <th className="text-right p-3">Revenue</th>
                          <th className="text-right p-3">ROAS</th>
                          <th className="text-right p-3">p-value</th>
                          <th className="text-right p-3">Uplift</th>
                        </tr>
                      </thead>
                      <tbody>
                        {test.variants.map(v => {
                          const isWinner = test.winner === v.id;
                          return (
                            <tr key={v.id} className={`border-b border-gray-800/50 ${isWinner ? "bg-green-500/5" : ""}`}>
                              <td className={`p-3 pl-5 font-medium ${isWinner ? "text-green-400" : "text-white"}`}>
                                {v.name} {isWinner && <Trophy className="w-3 h-3 inline ml-1 text-green-400" />}
                              </td>
                              <td className="p-3 text-right text-gray-300 font-mono">{v.impressions.toLocaleString()}</td>
                              <td className="p-3 text-right text-gray-300 font-mono">{v.clicks.toLocaleString()}</td>
                              <td className="p-3 text-right font-mono text-gray-300">{(v.ctr * 100).toFixed(2)}%</td>
                              <td className="p-3 text-right text-gray-300 font-mono">{v.conversions.toLocaleString()}</td>
                              <td className="p-3 text-right font-mono text-gray-300">{(v.cvr * 100).toFixed(2)}%</td>
                              <td className="p-3 text-right text-gray-300 font-mono">${v.spend.toLocaleString()}</td>
                              <td className="p-3 text-right text-gray-300 font-mono">${v.revenue.toLocaleString()}</td>
                              <td className="p-3 text-right font-mono"><span className={v.roas >= 1 ? "text-green-400" : "text-red-400"}>{v.roas.toFixed(2)}x</span></td>
                              <td className="p-3 text-right font-mono text-gray-400">{v.pValue != null ? v.pValue.toFixed(4) : "—"}</td>
                              <td className="p-3 text-right font-mono">{v.uplift != null ? <span className={v.uplift >= 0 ? "text-green-400" : "text-red-400"}>{(v.uplift * 100).toFixed(2)}%</span> : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
