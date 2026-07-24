import { useState, useEffect } from "react";
import { Plus, X, Edit3, Trash2, Search, TrendingUp, Users, Target, Mail, Eye, MousePointerClick, ShoppingCart, Globe, Smartphone, Award, Clock } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

type ScoringField = "email_open" | "link_click" | "page_visit" | "form_submit" | "demo_request" | "download" | "purchase" | "social_share" | "support_ticket" | "website_time" | "page_depth" | "device_type" | "location" | "referral_source";

interface ScoringRule {
  id: string;
  field: ScoringField;
  operator: "equals" | "contains" | "gt" | "gte" | "lt" | "lte";
  value: string;
  points: number;
}

interface LeadScoreModel {
  id: string;
  name: string;
  description: string;
  rules: ScoringRule[];
  minThreshold: number;
  maxScore: number;
  isActive: boolean;
  leadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface LeadRecord {
  id: string;
  name: string;
  email: string;
  score: number;
  modelId: string;
  lastActivity: string;
  source: string;
}

const FIELD_META: Record<string, { label: string; icon: any }> = {
  email_open: { label: "Email Open", icon: Mail },
  link_click: { label: "Link Click", icon: MousePointerClick },
  page_visit: { label: "Page Visit", icon: Eye },
  form_submit: { label: "Form Submit", icon: Target },
  demo_request: { label: "Demo Request", icon: Award },
  download: { label: "Content Download", icon: TrendingUp },
  purchase: { label: "Purchase", icon: ShoppingCart },
  social_share: { label: "Social Share", icon: Globe },
  support_ticket: { label: "Support Ticket", icon: Users },
  website_time: { label: "Time on Site", icon: Clock },
  page_depth: { label: "Pages Visited", icon: Eye },
  device_type: { label: "Device Type", icon: Smartphone },
  location: { label: "Location", icon: Globe },
  referral_source: { label: "Referral Source", icon: Users },
};

export default function LeadScoring() {
  const { addToast } = useToast();
  const [models, setModels] = useState<LeadScoreModel[]>([]);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showLeads, setShowLeads] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ name: string; description: string; rules: ScoringRule[]; minThreshold: number; isActive: boolean }>({ name: "", description: "", rules: [], minThreshold: 50, isActive: true });

  useEffect(() => {
    (async () => {
      try {
        const m = await api.entities.list("lead_scoring_models");
        setModels(m || []);
      } catch { setModels([]); }
      try {
        const ls = await api.insights.leadScoring.sample();
        if (ls?.results) setLeads(ls.results);
      } catch { setLeads([]); }
      setLoading(false);
    })();
  }, []);

  async function persistModels(updated: LeadScoreModel[]) {
    setModels(updated);
    try {
      const existing = await api.entities.list("lead_scoring_models");
      if (existing && existing.length > 0) {
        await api.entities.deleteAll("lead_scoring_models");
      }
      for (const m of updated) {
        await api.entities.create("lead_scoring_models", m as any);
      }
    } catch {}
  }

  const activeModel = models.find(m => m.id === activeModelId) || models[0];
  const modelLeads = leads.filter(l => l.modelId === (activeModel?.id || ""));
  const hotLeads = modelLeads.filter(l => l.score >= (activeModel?.minThreshold || 50));
  const coldLeads = modelLeads.filter(l => l.score < (activeModel?.minThreshold || 50));

  function resetForm(m?: LeadScoreModel) {
    if (m) setForm({ name: m.name, description: m.description, rules: m.rules.map(r => ({ ...r })), minThreshold: m.minThreshold, isActive: m.isActive });
    else setForm({ name: "", description: "", rules: [], minThreshold: 50, isActive: true });
  }

  function addRule() {
    setForm(f => ({ ...f, rules: [...f.rules, { id: Date.now().toString(36), field: "email_open" as ScoringField, operator: "gte" as const, value: "", points: 0 }] }));
  }

  function updateRule(id: string, field: keyof ScoringRule, value: any) {
    setForm(f => ({ ...f, rules: f.rules.map(r => r.id === id ? { ...r, [field]: value } : r) }));
  }

  function removeRule(id: string) {
    setForm(f => ({ ...f, rules: f.rules.filter(r => r.id !== id) }));
  }

  function handleSave() {
    if (!form.name.trim()) { addToast("error", "Model name is required"); return; }
    if (form.rules.filter(r => r.value && r.points > 0).length === 0) { addToast("error", "Add at least one valid rule"); return; }
    const validRules = form.rules.filter(r => r.value && r.points > 0).map(r => ({ ...r }));
    const totalScore = validRules.reduce((s, r) => s + r.points, 0);
    const now = new Date().toISOString();
    const model: LeadScoreModel = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: form.name.trim(), description: form.description.trim(), rules: validRules,
      minThreshold: form.minThreshold, maxScore: totalScore, isActive: form.isActive,
      leadCount: editingId ? models.find(m => m.id === editingId)!.leadCount : 0,
      createdAt: editingId ? models.find(m => m.id === editingId)!.createdAt : now, updatedAt: now,
    };
    let updated: LeadScoreModel[];
    if (editingId) { updated = models.map(m => m.id === editingId ? model : m); addToast("success", "Model updated"); }
    else { updated = [model, ...models]; addToast("success", "Model created"); }
    persistModels(updated);
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const name = models.find(m => m.id === id)?.name;
    persistModels(models.filter(m => m.id !== id));
    if (activeModelId === id) setActiveModelId(null);
    addToast("success", `"${name}" deleted`);
  }

  function toggleActive(id: string) {
    persistModels(models.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m));
    addToast("success", "Model toggled");
  }

  const filtered = models;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Award className="w-6 h-6 text-n0va-400" />
            Lead Scoring
          </h1>
          <p className="text-gray-400 mt-1">{models.length} models · {leads.length} leads tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLeads(!showLeads)} className="btn-secondary text-sm"><Users className="w-3.5 h-3.5 mr-1.5" /> Lead View</button>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Model</button>
        </div>
      </div>

      {/* Model selector tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {filtered.map(m => (
          <button key={m.id} onClick={() => setActiveModelId(m.id)} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors ${activeModelId === m.id || (!activeModelId && m === filtered[0]) ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${m.isActive ? "bg-green-400" : "bg-gray-600"}`} />
            {m.name}
          </button>
        ))}
      </div>

      {activeModel && (
        <>
          {/* Model stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="card p-4"><p className="text-xs text-gray-500">Max Score</p><p className="text-xl font-bold text-white mt-1">{activeModel.maxScore}</p></div>
            <div className="card p-4"><p className="text-xs text-gray-500">Threshold</p><p className="text-xl font-bold text-white mt-1">{activeModel.minThreshold}</p></div>
            <div className="card p-4"><p className="text-xs text-gray-500">Hot Leads</p><p className="text-xl font-bold text-green-400 mt-1">{hotLeads.length}</p></div>
            <div className="card p-4"><p className="text-xs text-gray-500">Cold Leads</p><p className="text-xl font-bold text-gray-400 mt-1">{coldLeads.length}</p></div>
          </div>

          {/* Model detail card */}
          <div className="card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-white">{activeModel.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeModel.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-800 text-gray-500"}`}>{activeModel.isActive ? "Active" : "Inactive"}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{activeModel.description}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(activeModel.id)} className="p-1.5 text-gray-600 hover:text-yellow-400"><Target className="w-4 h-4" /></button>
                <button onClick={() => { resetForm(activeModel); setEditingId(activeModel.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(activeModel.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="space-y-2">
              {activeModel.rules.map(r => {
                const fm = FIELD_META[r.field];
                const FI = fm?.icon || Target;
                return (
                  <div key={r.id} className="flex items-center gap-3 py-2 px-3 bg-gray-800/40 rounded-lg">
                    <FI className="w-4 h-4 text-n0va-400" />
                    <span className="text-sm text-gray-300 min-w-[120px]">{fm?.label || r.field}</span>
                    <span className="text-xs text-gray-600">{r.operator} {r.value}</span>
                    <div className="flex-1" />
                    <span className="text-sm font-semibold text-n0va-400">+{r.points} pts</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 border-t border-gray-800 mt-2">
                <span className="text-sm text-gray-500">Total possible score</span>
                <span className="text-lg font-bold text-white">{activeModel.maxScore} pts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Qualification threshold</span>
                <span className="text-sm font-semibold text-yellow-400">{activeModel.minThreshold} pts</span>
              </div>
            </div>
          </div>

          {/* Lead list */}
          {showLeads && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Leads ({modelLeads.length})</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="text-green-400">{hotLeads.length} hot</span>
                  <span>{coldLeads.length} cold</span>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium text-right">Score</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Source</th>
                  <th className="p-3 font-medium">Last Activity</th>
                </tr></thead>
                <tbody>
                  {modelLeads.sort((a, b) => b.score - a.score).map(ld => (
                    <tr key={ld.id} className="border-b border-gray-800/50">
                      <td className="p-3 text-white font-medium">{ld.name}</td>
                      <td className="p-3 text-gray-400">{ld.email}</td>
                      <td className="p-3 text-right">
                        <span className={`text-sm font-bold ${ld.score >= activeModel.minThreshold ? "text-green-400" : ld.score >= activeModel.minThreshold * 0.7 ? "text-yellow-400" : "text-gray-400"}`}>{ld.score}</span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${ld.score >= activeModel.minThreshold ? "bg-green-500/20 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                          {ld.score >= activeModel.minThreshold ? "Hot" : "Cold"}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400">{ld.source}</td>
                      <td className="p-3 text-gray-500 text-xs">{new Date(ld.lastActivity).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Model" : "New Scoring Model"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div><label className="label">Model Name</label><input className="input" placeholder="e.g. B2B Lead Scoring" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
              <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="What does this model score?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex items-center gap-4">
                <div><label className="label">Qualification Threshold</label><input className="input w-24" type="number" min="0" value={form.minThreshold} onChange={e => setForm({ ...form, minThreshold: Number(e.target.value) })} /></div>
                <div className="mt-5"><button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })} className={`text-xs px-3 py-1.5 rounded border ${form.isActive ? "border-green-500 bg-green-500/10 text-green-400" : "border-gray-700 bg-gray-800 text-gray-500"}`}>{form.isActive ? "Active" : "Inactive"}</button></div>
              </div>
              <div><div className="flex items-center justify-between mb-2"><label className="label mb-0">Scoring Rules</label><button type="button" onClick={addRule} className="text-xs text-n0va-400 hover:text-n0va-300">+ Add Rule</button></div>
                {form.rules.length === 0 && <p className="text-xs text-gray-600 py-2">No rules yet. Add behaviors and assign point values.</p>}
                {form.rules.map(r => {
                  const fm = FIELD_META[r.field];
                  return (
                    <div key={r.id} className="flex items-center gap-1.5 mb-2">
                      <select className="text-xs bg-gray-800 text-gray-300 rounded px-1.5 py-1 border border-gray-700 min-w-[120px]" value={r.field} onChange={e => updateRule(r.id, "field", e.target.value as ScoringField)}>
                        {Object.entries(FIELD_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <select className="text-xs bg-gray-800 text-gray-300 rounded px-1 py-1 border border-gray-700" value={r.operator} onChange={e => updateRule(r.id, "operator", e.target.value as any)}>
                        {["gte", "gt", "equals", "lt", "lte", "contains"].map(op => <option key={op} value={op}>{op}</option>)}
                      </select>
                      <input className="input text-xs py-1 w-16" placeholder="val" value={r.value} onChange={e => updateRule(r.id, "value", e.target.value)} />
                      <span className="text-xs text-gray-600">→</span>
                      <input className="input text-xs py-1 w-16" type="number" min="0" placeholder="pts" value={r.points} onChange={e => updateRule(r.id, "points", Number(e.target.value))} />
                      <span className="text-xs text-gray-600">pts</span>
                      <button type="button" onClick={() => removeRule(r.id)} className="p-1 text-gray-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Model"}</button></div>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div className="card p-12 flex items-center justify-center text-center">
          <Award className="w-6 h-6 text-n0va-400 animate-pulse" />
          <span className="ml-3 text-gray-400">Loading scoring models...</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Award className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No scoring models</h3>
          <p className="text-sm text-gray-500">Create your first lead scoring model to qualify leads.</p>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Model</button>
        </div>
      )}
    </div>
  );
}
