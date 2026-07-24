import { useState, useEffect } from "react";
import { Target, TrendingUp, Users, Award, Eye, Plus, X, Edit3, Trash2, ChevronDown, ChevronRight, Circle, CheckCircle2, AlertTriangle, Flag } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

interface KeyResult {
  id: string;
  description: string;
  target: number;
  current: number;
  unit: string;
}

interface Goal {
  id: string;
  name: string;
  description: string;
  quarter: string;
  year: number;
  type: "revenue" | "leads" | "brand" | "engagement" | "other";
  keyResults: KeyResult[];
  createdAt: string;
}

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const GOAL_TYPES = [
  { value: "revenue", label: "Revenue", icon: TrendingUp, color: "text-green-400 bg-green-500/10" },
  { value: "leads", label: "Leads", icon: Users, color: "text-blue-400 bg-blue-500/10" },
  { value: "brand", label: "Brand", icon: Award, color: "text-purple-400 bg-purple-500/10" },
  { value: "engagement", label: "Engagement", icon: Eye, color: "text-amber-400 bg-amber-500/10" },
  { value: "other", label: "Other", icon: Target, color: "text-gray-400 bg-gray-500/10" },
];

function progress(krs: KeyResult[]): number {
  if (krs.length === 0) return 0;
  const total = krs.reduce((s, kr) => s + Math.min(kr.current / kr.target, 1), 0);
  return Math.round((total / krs.length) * 100);
}

function statusLabel(pct: number): { label: string; color: string; icon: any } {
  if (pct >= 100) return { label: "Completed", color: "text-green-400 bg-green-500/10", icon: CheckCircle2 };
  if (pct >= 75) return { label: "On Track", color: "text-blue-400 bg-blue-500/10", icon: Circle };
  if (pct >= 40) return { label: "At Risk", color: "text-amber-400 bg-amber-500/10", icon: AlertTriangle };
  return { label: "Behind", color: "text-red-400 bg-red-500/10", icon: Flag };
}

const EMPTY_KR: KeyResult = { id: "", description: "", target: 0, current: 0, unit: "" };

export default function Goals() {
  const { addToast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", quarter: "Q3", year: 2026, type: "revenue" as Goal["type"], keyResults: [] as KeyResult[] });
  const [filterQuarter, setFilterQuarter] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    api.entities.list("goals").then(d => setGoals(d || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function persist(updated: Goal[]) {
    setGoals(updated);
    try {
      const existing = await api.entities.list("goals");
      if (existing && existing.length > 0) await api.entities.deleteAll("goals");
      for (const g of updated) await api.entities.create("goals", g as any);
    } catch {}
  }

  function toggle(id: string) {
    setExpanded((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  function resetForm(g?: Goal) {
    if (g) {
      setForm({ name: g.name, description: g.description, quarter: g.quarter, year: g.year, type: g.type, keyResults: g.keyResults.map((kr) => ({ ...kr })) });
    } else {
      setForm({ name: "", description: "", quarter: "Q3", year: 2026, type: "revenue", keyResults: [] });
    }
  }

  function openCreate() { resetForm(); setEditingGoal(null); setShowCreate(true); }
  function openEdit(g: Goal) { resetForm(g); setEditingGoal(g.id); setShowCreate(true); }

  function handleSave() {
    if (!form.name.trim()) { addToast("error", "Goal name is required"); return; }
    const validKRs = form.keyResults.filter((kr) => kr.description.trim());
    if (validKRs.length === 0) { addToast("error", "Add at least one key result"); return; }
    const goal: Goal = { id: editingGoal || Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: form.name.trim(), description: form.description.trim(), quarter: form.quarter, year: form.year, type: form.type, keyResults: validKRs.map((kr) => ({ ...kr, id: kr.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6) })), createdAt: editingGoal ? goals.find((g) => g.id === editingGoal)!.createdAt : new Date().toISOString() };
    let updated: Goal[];
    if (editingGoal) { updated = goals.map((g) => g.id === editingGoal ? goal : g); addToast("success", "Goal updated"); }
    else { updated = [goal, ...goals]; addToast("success", "Goal created"); }
    persist(updated);
    setShowCreate(false);
  }

  function handleDelete(id: string) {
    const name = goals.find((g) => g.id === id)?.name;
    persist(goals.filter((g) => g.id !== id));
    addToast("success", `"${name}" deleted`);
  }

  function addKR() {
    setForm((f) => ({ ...f, keyResults: [...f.keyResults, { ...EMPTY_KR, id: Date.now().toString(36) }] }));
  }

  function updateKR(krId: string, field: keyof KeyResult, value: any) {
    setForm((f) => ({ ...f, keyResults: f.keyResults.map((kr) => kr.id === krId ? { ...kr, [field]: field === "description" ? value : Number(value) || 0 } : kr) }));
  }

  function removeKR(krId: string) {
    setForm((f) => ({ ...f, keyResults: f.keyResults.filter((kr) => kr.id !== krId) }));
  }

  const filtered = goals.filter((g) => {
    if (filterQuarter !== "all" && g.quarter !== filterQuarter) return false;
    if (filterType !== "all" && g.type !== filterType) return false;
    return true;
  });

  const typeMeta = (type: string) => GOAL_TYPES.find((t) => t.value === type) || GOAL_TYPES[4];
  const allExpanded = expanded.size === filtered.length && filtered.length > 0;
  const totalProgress = filtered.length ? Math.round(filtered.reduce((s, g) => s + progress(g.keyResults), 0) / filtered.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Target className="w-6 h-6 text-n0va-400" />
            Goals & OKRs
          </h1>
          <p className="text-gray-400 mt-1">{goals.length} goals · {filtered.length} shown</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Goal</button>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Goals</p>
          <p className="text-2xl font-bold text-white">{goals.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Overall Progress</p>
          <p className="text-2xl font-bold text-white">{totalProgress}%</p>
          <div className="h-1.5 bg-gray-800 rounded-full mt-2"><div className="h-full bg-n0va-400 rounded-full transition-all" style={{ width: `${totalProgress}%` }} /></div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-400">{goals.filter((g) => progress(g.keyResults) >= 100).length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">At Risk</p>
          <p className="text-2xl font-bold text-amber-400">{goals.filter((g) => { const p = progress(g.keyResults); return p >= 40 && p < 75; }).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="input text-sm w-auto" value={filterQuarter} onChange={(e) => setFilterQuarter(e.target.value)}>
          <option value="all">All Quarters</option>
          {QUARTERS.map((q) => <option key={q} value={q}>{q} 2026</option>)}
        </select>
        <select className="input text-sm w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {GOAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {(filterQuarter !== "all" || filterType !== "all") && (
          <button onClick={() => { setFilterQuarter("all"); setFilterType("all"); }} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>
        )}
        {filtered.length > 0 && (
          <button onClick={() => { if (allExpanded) setExpanded(new Set()); else setExpanded(new Set(filtered.map((g) => g.id))); }} className="ml-auto text-xs text-gray-500 hover:text-gray-300">
            {allExpanded ? "Collapse All" : "Expand All"}
          </button>
        )}
      </div>

      {/* Create / Edit modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{editingGoal ? "Edit Goal" : "New Goal"}</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div>
                <label className="label">Goal Name</label>
                <input className="input" placeholder="e.g. Q3 Revenue Growth" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" placeholder="What do you want to achieve?" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Quarter</label>
                  <select className="input" value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })}>
                    {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Year</label>
                  <select className="input" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}>
                    {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Goal["type"] })}>
                    {GOAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Key Results</label>
                  <button type="button" onClick={addKR} className="text-xs text-n0va-400 hover:text-n0va-300">+ Add KR</button>
                </div>
                {form.keyResults.length === 0 && <p className="text-xs text-gray-600 py-2">No key results yet. Add at least one.</p>}
                <div className="space-y-2">
                  {form.keyResults.map((kr) => (
                    <div key={kr.id} className="flex items-start gap-2 p-3 bg-n0va-900 rounded-lg">
                      <div className="flex-1 space-y-2">
                        <input className="input text-sm w-full" placeholder="Key result description" value={kr.description} onChange={(e) => updateKR(kr.id, "description", e.target.value)} />
                        <div className="grid grid-cols-3 gap-2">
                          <input type="number" className="input text-sm" placeholder="Target" value={kr.target || ""} onChange={(e) => updateKR(kr.id, "target", e.target.value)} />
                          <input type="number" className="input text-sm" placeholder="Current" value={kr.current || ""} onChange={(e) => updateKR(kr.id, "current", e.target.value)} />
                          <input className="input text-sm" placeholder="Unit" value={kr.unit} onChange={(e) => updateKR(kr.id, "unit", e.target.value)} />
                        </div>
                      </div>
                      <button type="button" onClick={() => removeKR(kr.id)} className="p-1 text-gray-600 hover:text-red-400 mt-1"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingGoal ? "Save Changes" : "Create Goal"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card p-12 flex items-center justify-center text-center">
          <Target className="w-6 h-6 text-n0va-400 animate-pulse" />
          <span className="ml-3 text-gray-400">Loading goals...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Target className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No goals found</h3>
          <p className="text-sm text-gray-500">Set your first marketing goal to track progress.</p>
          <button onClick={openCreate} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Goal</button>
        </div>
      )}

      {/* Goal cards */}
      {filtered.map((goal) => {
        const pct = progress(goal.keyResults);
        const status = statusLabel(pct);
        const StatusIcon = status.icon;
        const TypeIcon = typeMeta(goal.type).icon;
        const isOpen = expanded.has(goal.id);
        return (
          <div key={goal.id} className="card overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <button onClick={() => toggle(goal.id)} className="p-1 mt-0.5 text-gray-600 hover:text-gray-300">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-white">{goal.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${status.color}`}><StatusIcon className="w-3 h-3" /> {status.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${typeMeta(goal.type).color}`}><TypeIcon className="w-3 h-3" /> {typeMeta(goal.type).label}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{goal.description || `${goal.quarter} ${goal.year}`}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">{goal.keyResults.length} key result{goal.keyResults.length !== 1 ? "s" : ""}</span>
                        <span className="text-white font-medium">{pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct >= 100 ? "#22c55e" : pct >= 75 ? "#3b82f6" : pct >= 40 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(goal)} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(goal.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Key Results */}
            {isOpen && (
              <div className="border-t border-gray-800">
                {goal.keyResults.map((kr, i) => {
                  const krPct = Math.min(Math.round((kr.current / kr.target) * 100), 100);
                  return (
                    <div key={kr.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-800/30 transition-colors">
                      <span className="text-xs text-gray-600 w-5">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{kr.description}</p>
                        <p className="text-xs text-gray-500">{kr.current.toLocaleString()} / {kr.target.toLocaleString()} {kr.unit}</p>
                      </div>
                      <div className="w-32">
                        <div className="h-1.5 bg-gray-800 rounded-full"><div className="h-full rounded-full transition-all" style={{ width: `${krPct}%`, background: krPct >= 100 ? "#22c55e" : "#6366f1" }} /></div>
                      </div>
                      <span className="text-sm font-mono text-gray-300 w-16 text-right">{krPct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
