import { useState, useEffect } from "react";
import { TrendingDown, Plus, X, Edit3, Trash2, Users, Eye, MousePointerClick, ShoppingCart, DollarSign, Target, ChevronDown, ChevronRight, BarChart3, RefreshCw } from "lucide-react";
import { useToast } from "../components/Toast";

interface FunnelStage {
  id: string;
  name: string;
  count: number;
  color: string;
}

interface Funnel {
  id: string;
  name: string;
  stages: FunnelStage[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "n0va_funnels";

const STAGE_COLORS = [
  "bg-blue-500", "bg-cyan-500", "bg-teal-500", "bg-green-500",
  "bg-yellow-500", "bg-orange-500", "bg-red-500", "bg-purple-500",
  "bg-pink-500", "bg-indigo-500",
];

const DEFAULT_FUNNELS: Funnel[] = [
  {
    id: "funnel-1", name: "Main Marketing Funnel",
    stages: [
      { id: "fs-1", name: "Visitors", count: 125000, color: "bg-blue-500" },
      { id: "fs-2", name: "Leads", count: 42000, color: "bg-cyan-500" },
      { id: "fs-3", name: "MQLs", count: 18500, color: "bg-teal-500" },
      { id: "fs-4", name: "SQLs", count: 7200, color: "bg-green-500" },
      { id: "fs-5", name: "Opportunities", count: 3100, color: "bg-yellow-500" },
      { id: "fs-6", name: "Customers", count: 1200, color: "bg-green-600" },
    ],
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "funnel-2", name: "Paid Ads Funnel",
    stages: [
      { id: "fs-7", name: "Impressions", count: 890000, color: "bg-blue-500" },
      { id: "fs-8", name: "Clicks", count: 28500, color: "bg-cyan-500" },
      { id: "fs-9", name: "Landing Page", count: 22300, color: "bg-teal-500" },
      { id: "fs-10", name: "Form Starts", count: 8400, color: "bg-green-500" },
      { id: "fs-11", name: "Submissions", count: 3100, color: "bg-yellow-500" },
      { id: "fs-12", name: "Conversions", count: 890, color: "bg-green-600" },
    ],
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "funnel-3", name: "Email Campaign Funnel",
    stages: [
      { id: "fs-13", name: "Sent", count: 250000, color: "bg-blue-500" },
      { id: "fs-14", name: "Delivered", count: 242500, color: "bg-cyan-500" },
      { id: "fs-15", name: "Opened", count: 65475, color: "bg-teal-500" },
      { id: "fs-16", name: "Clicked", count: 18333, color: "bg-green-500" },
      { id: "fs-17", name: "Converted", count: 2750, color: "bg-green-600" },
    ],
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

function load(): Funnel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FUNNELS));
    return DEFAULT_FUNNELS;
  } catch { return []; }
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function Funnel() {
  const { addToast } = useToast();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; stages: FunnelStage[] }>({ name: "", stages: [] });
  const [editStageIdx, setEditStageIdx] = useState<number | null>(null);

  useEffect(() => { setFunnels(load()); }, []);

  function persist(updated: Funnel[]) {
    setFunnels(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function resetForm(f?: Funnel) {
    if (f) setForm({ name: f.name, stages: f.stages.map(s => ({ ...s })) });
    else setForm({ name: "", stages: [
      { id: Date.now().toString(36), name: "Visitors", count: 100000, color: "bg-blue-500" },
      { id: Date.now().toString(36) + "1", name: "Leads", count: 30000, color: "bg-cyan-500" },
      { id: Date.now().toString(36) + "2", name: "MQLs", count: 12000, color: "bg-teal-500" },
      { id: Date.now().toString(36) + "3", name: "SQLs", count: 5000, color: "bg-green-500" },
      { id: Date.now().toString(36) + "4", name: "Opportunities", count: 2000, color: "bg-yellow-500" },
      { id: Date.now().toString(36) + "5", name: "Customers", count: 800, color: "bg-green-600" },
    ] });
  }

  function addStage() {
    setForm(f => ({ ...f, stages: [...f.stages, { id: Date.now().toString(36), name: "", count: 0, color: STAGE_COLORS[f.stages.length % STAGE_COLORS.length] }] }));
  }

  function removeStage(idx: number) {
    setForm(f => ({ ...f, stages: f.stages.filter((_, i) => i !== idx) }));
  }

  function updateStage(idx: number, field: keyof FunnelStage, value: any) {
    setForm(f => ({ ...f, stages: f.stages.map((s, i) => i === idx ? { ...s, [field]: value } : s) }));
  }

  function handleSave() {
    if (!form.name.trim()) { addToast("error", "Funnel name is required"); return; }
    if (form.stages.length < 2) { addToast("error", "Add at least 2 stages"); return; }
    if (form.stages.some(s => !s.name.trim() || s.count < 0)) { addToast("error", "All stages need a name and valid count"); return; }
    const validStages = form.stages.map((s, i) => ({ ...s, name: s.name.trim(), color: s.color || STAGE_COLORS[i % STAGE_COLORS.length] }));
    const now = new Date().toISOString();
    const funnel: Funnel = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: form.name.trim(),
      stages: validStages,
      createdAt: editingId ? funnels.find(f => f.id === editingId)!.createdAt : now, updatedAt: now,
    };
    let updated: Funnel[];
    if (editingId) { updated = funnels.map(f => f.id === editingId ? funnel : f); addToast("success", "Funnel updated"); }
    else { updated = [funnel, ...funnels]; addToast("success", "Funnel created"); }
    persist(updated);
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const name = funnels.find(f => f.id === id)?.name;
    persist(funnels.filter(f => f.id !== id));
    addToast("success", `"${name}" deleted`);
    if (expandedId === id) setExpandedId(null);
  }

  const maxFunnelWidth = 400;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <TrendingDown className="w-6 h-6 text-n0va-400" />
            Funnel Visualizer
          </h1>
          <p className="text-gray-400 mt-1">{funnels.length} funnels configured</p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Funnel</button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Funnel" : "New Funnel"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div><label className="label">Funnel Name</label><input className="input" placeholder="e.g. Main Marketing Funnel" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
              <div><div className="flex items-center justify-between mb-2"><label className="label mb-0">Stages (top to bottom)</label><button type="button" onClick={addStage} className="text-xs text-n0va-400 hover:text-n0va-300">+ Add Stage</button></div>
                {form.stages.map((stage, idx) => (
                  <div key={stage.id} className="flex items-center gap-2 mb-2 p-2 bg-gray-800/50 rounded-lg">
                    <span className="text-xs text-gray-600 font-mono w-6">{idx + 1}</span>
                    <input className="input text-xs py-1.5 flex-1" placeholder="Stage name" value={stage.name} onChange={e => updateStage(idx, "name", e.target.value)} />
                    <input className="input text-xs py-1.5 w-24" type="number" min="0" placeholder="Count" value={stage.count} onChange={e => updateStage(idx, "count", Number(e.target.value))} />
                    <div className="flex items-center gap-1">
                      {STAGE_COLORS.map(c => <button key={c} type="button" onClick={() => updateStage(idx, "color", c)} className={`w-4 h-4 rounded-full ${c} ${stage.color === c ? "ring-2 ring-white ring-offset-1 ring-offset-n0va-800" : "opacity-50 hover:opacity-100"}`} />)}
                    </div>
                    {form.stages.length > 2 && <button type="button" onClick={() => removeStage(idx)} className="p-1 text-gray-600 hover:text-red-400"><X className="w-3 h-3" /></button>}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Funnel"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Funnels */}
      {funnels.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <TrendingDown className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No funnels yet</h3>
          <p className="text-sm text-gray-500">Create your first marketing funnel visualization.</p>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Funnel</button>
        </div>
      )}

      {funnels.map(funnel => {
        const isOpen = expandedId === funnel.id;
        const maxCount = Math.max(...funnel.stages.map(s => s.count));
        return (
          <div key={funnel.id} className="card overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <button onClick={() => setExpandedId(isOpen ? null : funnel.id)} className="p-1 mt-1 text-gray-600 hover:text-gray-300">{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-white">{funnel.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{funnel.stages.length} stages · {fmt(funnel.stages[0].count)} total top-of-funnel</p>
                  <div className="text-xs text-gray-600 mt-1">Updated {new Date(funnel.updatedAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { resetForm(funnel); setEditingId(funnel.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(funnel.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* Collapsed: mini funnel bars */}
            {!isOpen && (
              <div className="px-5 pb-5">
                {funnel.stages.map((stage, idx) => {
                  const pct = stage.count / maxCount;
                  return (
                    <div key={stage.id} className="flex items-center gap-3 mb-1.5 last:mb-0">
                      <span className="text-xs text-gray-500 w-24 text-right truncate">{stage.name}</span>
                      <div className="flex-1 h-5 bg-gray-800 rounded-sm overflow-hidden flex">
                        <div className={`${stage.color} h-full transition-all`} style={{ width: `${Math.max(2, pct * 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-16 text-right">{fmt(stage.count)}</span>
                      {idx > 0 && <span className="text-xs text-gray-600 w-14 text-right">{(stage.count / funnel.stages[0].count * 100).toFixed(1)}%</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Expanded: funnel visualization */}
            {isOpen && (
              <div className="border-t border-gray-800 p-6">
                <div className="flex flex-col items-center">
                  {funnel.stages.map((stage, idx) => {
                    const pct = stage.count / maxCount;
                    const width = Math.max(20, pct * maxFunnelWidth);
                    const conversionFromPrev = idx > 0 ? (stage.count / funnel.stages[idx - 1].count * 100) : 100;
                    const dropOff = idx > 0 ? 100 - conversionFromPrev : 0;
                    return (
                      <div key={stage.id} className="flex flex-col items-center mb-1">
                        <div className="flex items-center gap-4 w-full justify-center">
                          <div className="text-right w-20">
                            <p className="text-sm font-semibold text-white">{fmt(stage.count)}</p>
                            {idx > 0 && <p className="text-[10px] text-gray-600">{conversionFromPrev.toFixed(1)}%</p>}
                          </div>
                          <div
                            className={`${stage.color} rounded-sm flex items-center justify-center text-white text-xs font-semibold transition-all`}
                            style={{ width: `${width}px`, height: "36px", minWidth: "60px" }}
                          >
                            {stage.name}
                          </div>
                          <div className="w-20">
                            {idx > 0 && (
                              <div className="flex items-center gap-1">
                                <TrendingDown className="w-3 h-3 text-red-400" />
                                <span className="text-xs text-red-400">{dropOff.toFixed(1)}% drop</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {idx < funnel.stages.length - 1 && (
                          <div className="border-l-2 border-dashed border-gray-700 h-6 my-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Metrics table */}
                <div className="mt-6 border-t border-gray-800 pt-4">
                  <table className="w-full text-xs">
                    <thead><tr className="text-gray-500 text-left border-b border-gray-800">
                      <th className="pb-2 font-medium">Stage</th>
                      <th className="pb-2 font-medium text-right">Count</th>
                      <th className="pb-2 font-medium text-right">% of Top</th>
                      <th className="pb-2 font-medium text-right">Prev Stage Conv.</th>
                      <th className="pb-2 font-medium text-right">Drop-off</th>
                    </tr></thead>
                    <tbody>
                      {funnel.stages.map((stage, idx) => {
                        const convFromPrev = idx > 0 ? (stage.count / funnel.stages[idx - 1].count * 100) : 100;
                        const dropOff = idx > 0 ? 100 - convFromPrev : 0;
                        return (
                          <tr key={stage.id} className="border-b border-gray-800/50">
                            <td className="py-2 text-gray-300 flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                              {stage.name}
                            </td>
                            <td className="py-2 text-right text-gray-400">{fmt(stage.count)}</td>
                            <td className="py-2 text-right text-gray-400">{(stage.count / funnel.stages[0].count * 100).toFixed(1)}%</td>
                            <td className="py-2 text-right">{idx === 0 ? <span className="text-gray-600">—</span> : <span className="text-green-400">{convFromPrev.toFixed(1)}%</span>}</td>
                            <td className="py-2 text-right">{idx === 0 ? <span className="text-gray-600">—</span> : <span className="text-red-400">{dropOff.toFixed(1)}%</span>}</td>
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
      })}
    </div>
  );
}
