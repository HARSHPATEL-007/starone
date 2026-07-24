import { useState, useEffect } from "react";
import { GitCompare, Plus, X, Play, Square, Trophy, BarChart3, ChevronDown, ChevronRight, ExternalLink, Trash2, TrendingUp, Users, Clock, Target } from "lucide-react";
import { useToast } from "../components/Toast";

interface Variant {
  id: string;
  name: string;
  description: string;
  impressions: number;
  conversions: number;
}

interface ABTest {
  id: string;
  name: string;
  description: string;
  metric: "conversion_rate" | "ctr" | "revenue_per_visit" | "engagement";
  variants: Variant[];
  status: "draft" | "running" | "completed";
  sampleSize: number;
  createdAt: string;
  winnerId: string | null;
}

const STORAGE_KEY = "n0va_ab_tests";
const METRICS = [
  { value: "conversion_rate", label: "Conversion Rate" },
  { value: "ctr", label: "Click-Through Rate (CTR)" },
  { value: "revenue_per_visit", label: "Revenue per Visit" },
  { value: "engagement", label: "Engagement" },
];

const DEFAULT_TESTS: ABTest[] = [
  {
    id: "demo-1", name: "Hero CTA Button Text",
    description: "Compare 'Get Started' vs 'Try Free' vs 'See Plans' on the hero section CTA",
    metric: "conversion_rate", status: "running", sampleSize: 2500,
    winnerId: null,
    variants: [
      { id: "v1", name: "Control (A)", description: "'Get Started' button", impressions: 4500, conversions: 225 },
      { id: "v2", name: "Variant B", description: "'Try Free' button", impressions: 4420, conversions: 287 },
      { id: "v3", name: "Variant C", description: "'See Plans' button", impressions: 4480, conversions: 201 },
    ],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "demo-2", name: "Landing Page Headline",
    description: "Testing value-prop headline variations",
    metric: "ctr", status: "completed", sampleSize: 5000,
    winnerId: "v2",
    variants: [
      { id: "v1", name: "Control (A)", description: "'Grow Your Business'", impressions: 8200, conversions: 410 },
      { id: "v2", name: "Winner (B)", description: "'10x Your Revenue in 30 Days'", impressions: 8150, conversions: 570 },
    ],
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: "demo-3", name: "Pricing Page Layout",
    description: "Side-by-side vs stacked pricing cards",
    metric: "revenue_per_visit", status: "draft", sampleSize: 1000,
    winnerId: null,
    variants: [
      { id: "v1", name: "Control (A)", description: "Side-by-side cards", impressions: 0, conversions: 0 },
      { id: "v2", name: "Variant B", description: "Stacked cards with comparison", impressions: 0, conversions: 0 },
    ],
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

function load(): ABTest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TESTS));
    return DEFAULT_TESTS;
  } catch { return []; }
}

function rate(impressions: number, conversions: number): number {
  if (impressions === 0) return 0;
  return Math.round((conversions / impressions) * 10000) / 100;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  running: { label: "Running", color: "text-green-400 bg-green-500/10", icon: Play },
  completed: { label: "Completed", color: "text-blue-400 bg-blue-500/10", icon: Trophy },
  draft: { label: "Draft", color: "text-gray-400 bg-gray-500/10", icon: Square },
};

export default function ABTesting() {
  const { addToast } = useToast();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [form, setForm] = useState({ name: "", description: "", metric: "conversion_rate" as ABTest["metric"], sampleSize: 1000, variants: [] as Variant[] });

  useEffect(() => { setTests(load()); }, []);

  function persist(updated: ABTest[]) {
    setTests(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function toggle(id: string) {
    setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function resetForm(t?: ABTest) {
    if (t) {
      setForm({ name: t.name, description: t.description, metric: t.metric, sampleSize: t.sampleSize, variants: t.variants.map(v => ({ ...v })) });
    } else {
      setForm({ name: "", description: "", metric: "conversion_rate", sampleSize: 1000, variants: [] });
    }
  }

  function addVariant() {
    setForm(f => ({ ...f, variants: [...f.variants, { id: Date.now().toString(36), name: "", description: "", impressions: 0, conversions: 0 }] }));
  }

  function updateVariant(id: string, field: keyof Variant, value: any) {
    setForm(f => ({ ...f, variants: f.variants.map(v => v.id === id ? { ...v, [field]: field === "name" || field === "description" ? value : Number(value) || 0 } : v) }));
  }

  function removeVariant(id: string) {
    setForm(f => ({ ...f, variants: f.variants.filter(v => v.id !== id) }));
  }

  function handleSave() {
    if (!form.name.trim()) { addToast("error", "Test name is required"); return; }
    if (form.variants.length < 2) { addToast("error", "Add at least 2 variants"); return; }
    if (form.variants.some(v => !v.name.trim())) { addToast("error", "All variants need a name"); return; }
    const now = new Date().toISOString();
    const test: ABTest = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: form.name.trim(),
      description: form.description.trim(),
      metric: form.metric,
      sampleSize: form.sampleSize,
      variants: form.variants.map(v => ({ ...v, id: v.id || Date.now().toString(36) })),
      status: "draft",
      winnerId: null,
      createdAt: editingId ? tests.find(t => t.id === editingId)!.createdAt : now,
    };
    let updated: ABTest[];
    if (editingId) { updated = tests.map(t => t.id === editingId ? test : t); addToast("success", "Test updated"); }
    else { updated = [test, ...tests]; addToast("success", "Test created"); }
    persist(updated);
    setShowCreate(false);
  }

  function handleDelete(id: string) {
    const name = tests.find(t => t.id === id)?.name;
    persist(tests.filter(t => t.id !== id));
    addToast("success", `"${name}" deleted`);
  }

  function updateTestStatus(id: string, status: ABTest["status"]) {
    persist(tests.map(t => {
      if (t.id !== id) return t;
      if (status === "completed") {
        const best = [...t.variants].sort((a, b) => rate(b.impressions, b.conversions) - rate(a.impressions, a.conversions))[0];
        return { ...t, status, winnerId: best?.id || null };
      }
      return { ...t, status };
    }));
    addToast("success", status === "running" ? "Test started" : "Test completed");
  }

  const filtered = tests.filter(t => filterStatus === "all" || t.status === filterStatus);

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
        <button onClick={() => { resetForm(); setEditingId(null); setShowCreate(true); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Test</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Total Tests</p><p className="text-2xl font-bold text-white">{tests.length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Running</p><p className="text-2xl font-bold text-green-400">{tests.filter(t => t.status === "running").length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Completed</p><p className="text-2xl font-bold text-blue-400">{tests.filter(t => t.status === "completed").length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Winning Rate</p><p className="text-2xl font-bold text-amber-400">
          {tests.filter(t => t.status === "completed").length > 0
            ? `${Math.round(tests.filter(t => t.status === "completed" && t.winnerId).length / tests.filter(t => t.status === "completed").length * 100)}%`
            : "—"}
        </p></div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="input text-sm w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="draft">Drafts</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
        </select>
        {filterStatus !== "all" && <button onClick={() => setFilterStatus("all")} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>}
      </div>

      {/* Create / Edit modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{editingId ? "Edit Test" : "New A/B Test"}</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div><label className="label">Test Name</label><input className="input" placeholder="e.g. Hero CTA Button" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
              <div><label className="label">Description</label><textarea className="input" placeholder="What are you testing?" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Metric</label><select className="input" value={form.metric} onChange={e => setForm({ ...form, metric: e.target.value as ABTest["metric"] })}>{METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
                <div><label className="label">Sample Size</label><input type="number" className="input" value={form.sampleSize || ""} onChange={e => setForm({ ...form, sampleSize: Number(e.target.value) || 0 })} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><label className="label mb-0">Variants</label><button type="button" onClick={addVariant} className="text-xs text-n0va-400 hover:text-n0va-300">+ Add Variant</button></div>
                {form.variants.length === 0 && <p className="text-xs text-gray-600 py-2">Add at least 2 variants.</p>}
                <div className="space-y-2">
                  {form.variants.map(v => (
                    <div key={v.id} className="flex items-start gap-2 p-3 bg-n0va-900 rounded-lg">
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input className="input text-sm" placeholder="Variant name" value={v.name} onChange={e => updateVariant(v.id, "name", e.target.value)} />
                          <input className="input text-sm" placeholder="Description" value={v.description} onChange={e => updateVariant(v.id, "description", e.target.value)} />
                        </div>
                        {editingId && (
                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" className="input text-sm" placeholder="Impressions" value={v.impressions || ""} onChange={e => updateVariant(v.id, "impressions", e.target.value)} />
                            <input type="number" className="input text-sm" placeholder="Conversions" value={v.conversions || ""} onChange={e => updateVariant(v.id, "conversions", e.target.value)} />
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => removeVariant(v.id)} className="p-1 text-gray-600 hover:text-red-400 mt-1"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Test"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <GitCompare className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No tests found</h3>
          <p className="text-sm text-gray-500">Create your first A/B test to start optimizing.</p>
          <button onClick={() => { resetForm(); setEditingId(null); setShowCreate(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> New Test</button>
        </div>
      )}

      {/* Test cards */}
      {filtered.map(test => {
        const isOpen = expanded.has(test.id);
        const sc = statusConfig[test.status];
        const StatusIcon = sc.icon;
        const bestVariant = [...test.variants].sort((a, b) => rate(b.impressions, b.conversions) - rate(a.impressions, a.conversions))[0];
        return (
          <div key={test.id} className="card overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <button onClick={() => toggle(test.id)} className="p-1 mt-0.5 text-gray-600 hover:text-gray-300">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-semibold text-white">{test.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.color}`}><StatusIcon className="w-3 h-3" /> {sc.label}</span>
                    <span className="text-xs text-gray-600">{METRICS.find(m => m.value === test.metric)?.label}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{test.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-gray-500"><Users className="w-3 h-3 inline mr-1" />{test.variants.length} variants</span>
                    <span className="text-xs text-gray-500"><Target className="w-3 h-3 inline mr-1" />n={test.sampleSize.toLocaleString()}</span>
                    {test.status === "completed" && test.winnerId && (
                      <span className="text-xs text-green-400"><Trophy className="w-3 h-3 inline mr-1" />Winner: {test.variants.find(v => v.id === test.winnerId)?.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {test.status === "draft" && <button onClick={() => updateTestStatus(test.id, "running")} className="btn-ghost text-xs py-1 px-2"><Play className="w-3 h-3 mr-1" />Start</button>}
                  {test.status === "running" && <button onClick={() => updateTestStatus(test.id, "completed")} className="btn-ghost text-xs py-1 px-2"><Trophy className="w-3 h-3 mr-1" />End</button>}
                  {test.status === "draft" && <button onClick={() => { resetForm(test); setEditingId(test.id); setShowCreate(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><BarChart3 className="w-4 h-4" /></button>}
                  <button onClick={() => handleDelete(test.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* Expanded variants */}
            {isOpen && (
              <div className="border-t border-gray-800">
                {(test.status === "running" || test.status === "completed") && (
                  <div className="px-5 py-3 bg-gray-800/30 border-b border-gray-800">
                    <div className="flex items-center gap-6 text-xs text-gray-500">
                      <span>Sample: {test.variants.reduce((s, v) => s + v.impressions, 0).toLocaleString()} / {test.sampleSize.toLocaleString()}</span>
                      <span>Confidence: {test.variants.reduce((s, v) => s + v.impressions, 0) >= test.sampleSize ? "✓ Reached" : `${Math.round(test.variants.reduce((s, v) => s + v.impressions, 0) / test.sampleSize * 100)}%`}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full mt-2">
                      <div className="h-full bg-n0va-400 rounded-full transition-all" style={{ width: `${Math.min(test.variants.reduce((s, v) => s + v.impressions, 0) / test.sampleSize * 100, 100)}%` }} />
                    </div>
                  </div>
                )}
                <div className={`grid ${test.variants.length <= 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {test.variants.map(v => {
                    const r = rate(v.impressions, v.conversions);
                    const isWinner = test.winnerId === v.id;
                    const isBest = !test.winnerId && bestVariant?.id === v.id && test.status === "running";
                    return (
                      <div key={v.id} className={`p-4 border-r border-gray-800 last:border-r-0 ${isWinner ? "bg-green-500/5" : isBest ? "bg-n0va-500/5" : ""}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-white">{v.name}</p>
                          {isWinner && <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Trophy className="w-2.5 h-2.5" /> Winner</span>}
                          {isBest && !isWinner && <span className="text-[10px] text-n0va-400 bg-n0va-500/10 px-1.5 py-0.5 rounded-full">Leading</span>}
                        </div>
                        <p className="text-xs text-gray-600 mb-3">{v.description}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs"><span className="text-gray-500">Rate</span><span className={`font-mono font-medium ${isWinner ? "text-green-400" : "text-white"}`}>{r}%</span></div>
                          <div className="flex justify-between text-xs"><span className="text-gray-500">Impressions</span><span className="font-mono text-gray-300">{v.impressions.toLocaleString()}</span></div>
                          <div className="flex justify-between text-xs"><span className="text-gray-500">Conversions</span><span className="font-mono text-gray-300">{v.conversions.toLocaleString()}</span></div>
                          {(test.status === "running" || test.status === "completed") && (
                            <div className="h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${isWinner ? "bg-green-500" : "bg-gray-600"}`} style={{ width: `${Math.min(r * 10, 100)}%` }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
