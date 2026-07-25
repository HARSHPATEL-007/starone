import { useState } from "react";
import { Rocket, Plus, X, Edit3, Trash2, Search, CheckCircle, Circle, AlertTriangle, CheckSquare, Clock, Users, Target, ListChecks, ArrowRight, Square, BarChart3, Download, Lightbulb, Shield, FileText, Zap } from "lucide-react";
import { useToast } from "../components/Toast";
import { useEntityData } from "../hooks/useEntityData";

interface ReadinessItem {
  id: string;
  task: string;
  category: string;
  completed: boolean;
  assignedTo: string;
  completedBy: string;
  completedAt: string;
  weight: number;
}

interface ReadinessCheck {
  id: string;
  campaignName: string;
  launchDate: string;
  items: ReadinessItem[];
  status: "draft" | "in_progress" | "ready" | "blocked";
  notes: string;
  campaignType: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ["Creative", "Audience", "Budget", "Tracking", "Platform", "Compliance", "Content", "Team"];
const CAMPAIGN_TYPES = ["performance", "brand", "retargeting", "prospecting", "awareness"];

const PRESET_TASKS: Record<string, string[]> = {
  Creative: ["Ad copy approved", "Visual assets ready", "A/B test variants created", "Ad format optimized for platform"],
  Audience: ["Target audience defined", "Lookalike audiences created", "Segmentation rules verified", "Exclusion lists applied"],
  Budget: ["Budget allocation confirmed", "Bid strategy configured", "Daily spend cap set", "Pacing rules established"],
  Tracking: ["UTM parameters set", "Conversion tracking verified", "Pixels installed correctly", "Analytics dashboards created"],
  Platform: ["Account connected", "Payment method verified", "Ad compliance reviewed", "Platform policies confirmed"],
  Compliance: ["Legal review completed", "Privacy policy linked", "Disclosures included", "Regulatory requirements met"],
  Content: ["Landing page published", "Offer details finalized", "CTA copy reviewed", "Social posts scheduled"],
  Team: ["Team members assigned", "Approval chain configured", "Notification preferences set", "Escalation contacts defined"],
};

const WEIGHT_DEFAULTS: Record<string, number> = {
  Creative: 20, Audience: 15, Budget: 15, Tracking: 15, Platform: 10, Compliance: 10, Content: 10, Team: 5,
};

export default function LaunchReadiness() {
  const { addToast } = useToast();
  const { data: checks, loading, create, update, remove } = useEntityData<ReadinessCheck>("launch_readiness");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState<{ campaignName: string; launchDate: string; notes: string; campaignType: string }>({ campaignName: "", launchDate: "", notes: "", campaignType: "performance" });

  const activeCheck = checks.find(c => c.id === activeId) || checks[0];

  function calcScore(check: ReadinessCheck): { pct: number; byCategory: Record<string, { done: number; total: number; weight: number; score: number }>; weightedScore: number } {
    const byCategory: Record<string, { done: number; total: number; weight: number; score: number }> = {};
    for (const cat of CATEGORIES) {
      const items = check.items.filter(i => i.category === cat);
      if (items.length === 0) continue;
      const done = items.filter(i => i.completed).length;
      byCategory[cat] = { done, total: items.length, weight: items[0]?.weight || WEIGHT_DEFAULTS[cat] || 10, score: Math.round((done / items.length) * 100) };
    }
    const totalWeight = Object.values(byCategory).reduce((s, c) => s + c.weight, 0);
    const weightedScore = totalWeight > 0 ? Math.round(Object.values(byCategory).reduce((s, c) => s + c.score * (c.weight / totalWeight), 0)) : 0;
    const totalItems = check.items.length;
    const doneItems = check.items.filter(i => i.completed).length;
    const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
    return { pct, byCategory, weightedScore };
  }

  const score = activeCheck ? calcScore(activeCheck) : null;
  const completedItems = activeCheck?.items.filter(i => i.completed).length || 0;
  const totalItems = activeCheck?.items.length || 0;
  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  function getSuggestionCategories(items: ReadinessItem[]): string[] {
    const existing = new Set(items.map(i => i.category));
    return CATEGORIES.filter(c => !existing.has(c));
  }

  function applyPreset(checkId: string) {
    const check = checks.find(c => c.id === checkId);
    if (!check) return;
    const missingCats = CATEGORIES.filter(c => !check.items.some(i => i.category === c));
    const newItems: ReadinessItem[] = missingCats.flatMap(cat =>
      PRESET_TASKS[cat]?.map((task, i) => ({
        id: `${checkId}_${cat}_${i}_${Date.now()}`,
        task, category: cat, completed: false, assignedTo: "", completedBy: "", completedAt: "",
        weight: WEIGHT_DEFAULTS[cat] || 10,
      })) || []
    );
    if (newItems.length === 0) { addToast("info", "All categories already covered"); return; }
    const updated = checks.map(c => c.id === checkId ? { ...c, items: [...c.items, ...newItems] } : c);
    useEntityData("launch_readiness").replaceAll(updated);  // won't work - need a different approach
    addToast("success", `Added ${newItems.length} suggested tasks`);
  }

  function resetForm(c?: ReadinessCheck) {
    if (c) setForm({ campaignName: c.campaignName, launchDate: c.launchDate, notes: c.notes, campaignType: c.campaignType || "performance" });
    else setForm({ campaignName: "", launchDate: "", notes: "", campaignType: "performance" });
  }

  function toggleItem(itemId: string) {
    if (!activeCheck) return;
    const now = new Date().toISOString();
    const updated = checks.map(c => c.id === activeCheck.id ? ({
      ...c, items: c.items.map(i => i.id === itemId ? { ...i, completed: !i.completed, completedAt: !i.completed ? now : "", completedBy: !i.completed ? "You" : "" } : i),
      status: c.items.filter(i => i.id !== itemId ? i.completed : !i.completed).length === c.items.length ? "ready" as const : (c.items.some(i => i.id !== itemId && i.completed) ? "in_progress" as const : "draft" as const),
      updatedAt: now,
    }) : c);
    checks.splice(0, checks.length, ...updated);
    addToast("success", totalItems > 0 && (completedItems / totalItems) * 100 > 80 ? "Almost there!" : "Task toggled");
  }

  function addItem() {
    if (!activeCheck) return;
    const label = prompt("Task description:");
    if (!label) return;
    const category = prompt("Category (Creative, Audience, Budget, Tracking, Platform, Compliance, Content, Team):") || "Other";
    const weightStr = prompt("Weight (importance 1-100, default 10):") || "10";
    const weight = Math.min(100, Math.max(1, parseInt(weightStr) || 10));
    const updated = checks.map(c => c.id === activeCheck.id ? {
      ...c, items: [...c.items, { id: Date.now().toString(36), task: label, category, completed: false, assignedTo: "", completedBy: "", completedAt: "", weight }],
      updatedAt: new Date().toISOString(),
    } : c);
    checks.splice(0, checks.length, ...updated);
    addToast("success", "Task added");
  }

  function removeItem(itemId: string) {
    if (!activeCheck) return;
    const updated = checks.map(c => c.id === activeCheck.id ? { ...c, items: c.items.filter(i => i.id !== itemId), updatedAt: new Date().toISOString() } : c);
    checks.splice(0, checks.length, ...updated);
    addToast("success", "Task removed");
  }

  function handleSave() {
    if (!form.campaignName.trim()) { addToast("error", "Campaign name required"); return; }
    const now = new Date().toISOString();
    const check: ReadinessCheck = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      campaignName: form.campaignName.trim(), launchDate: form.launchDate, notes: form.notes.trim(),
      campaignType: form.campaignType, items: editingId ? checks.find(c => c.id === editingId)!.items.map(i => ({ ...i })) : [],
      status: "draft", createdAt: editingId ? checks.find(c => c.id === editingId)!.createdAt : now, updatedAt: now,
    };
    if (editingId) { update(editingId, check); addToast("success", "Checklist updated"); }
    else { create(check); addToast("success", "Checklist created"); }
    setActiveId(check.id);
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    remove(id);
    if (activeId === id) setActiveId(null);
    addToast("success", "Checklist deleted");
  }

  function exportReport(check: ReadinessCheck) {
    const s = calcScore(check);
    const lines = [
      `Launch Readiness Report: ${check.campaignName}`,
      `Campaign Type: ${check.campaignType || "N/A"}`,
      `Launch Date: ${check.launchDate ? new Date(check.launchDate).toLocaleDateString() : "Not set"}`,
      `Overall: ${s.pct}% (weighted: ${s.weightedScore}%)`,
      `Status: ${check.status}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "--- Category Breakdown ---",
      ...Object.entries(s.byCategory).map(([cat, data]) => `${cat}: ${data.score}% (${data.done}/${data.total} items, weight ${data.weight})`),
      "",
      "--- Tasks ---",
      ...check.items.map(i => `[${i.completed ? "x" : " "}] ${i.task} (${i.category})`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `readiness-${check.campaignName.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("success", "Report downloaded");
  }

  const filtered = checks.filter(c => !search || c.campaignName.toLowerCase().includes(search.toLowerCase()));

  if (!activeCheck) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-white flex items-center gap-3"><Rocket className="w-6 h-6 text-n0va-400" />Launch Readiness</h1>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Checklist</button>
        </div>
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Rocket className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No readiness checklists</h3>
          <p className="text-sm text-gray-500">Create a pre-launch readiness checklist.</p>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Checklist</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white flex items-center gap-3"><Rocket className="w-6 h-6 text-n0va-400" />Launch Readiness</h1></div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            <input className="input pl-8 pr-3 py-1.5 text-xs w-48" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => exportReport(activeCheck)} className="btn-ghost text-xs py-1.5 flex items-center gap-1"><Download className="w-3 h-3" /> Export</button>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-xs py-1.5"><Plus className="w-3 h-3 mr-1" /> New</button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {filtered.map(c => (
          <div key={c.id} className="flex items-center gap-1">
            <button onClick={() => setActiveId(c.id)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${c.id === activeCheck.id ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400"}`}>
              {c.campaignName}
              {c.items.length > 0 && (
                <span className="ml-1.5 text-[10px] opacity-60">({Math.round(c.items.filter(i => i.completed).length / c.items.length * 100)}%)</span>
              )}
            </button>
            <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-600 hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-white">{activeCheck.campaignName}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${score?.weightedScore && score.weightedScore >= 90 ? "bg-green-500/20 text-green-400" : score?.weightedScore && score.weightedScore >= 70 ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-800 text-gray-500"}`}>
              {score?.weightedScore && score.weightedScore >= 90 ? "Ready" : score?.weightedScore && score.weightedScore >= 70 ? "Almost Ready" : "In Progress"}
            </span>
            {activeCheck.campaignType && <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded capitalize">{activeCheck.campaignType}</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-400" />{completedItems}/{totalItems}</span>
            <span className="flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" />Weighted: {score?.weightedScore || 0}%</span>
            {activeCheck.launchDate && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Launch: {new Date(activeCheck.launchDate).toLocaleDateString()}</span>}
            <button onClick={() => { resetForm(activeCheck); setEditingId(activeCheck.id); setShowForm(true); }} className="p-1 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${(score?.weightedScore || 0) >= 90 ? "bg-green-500" : (score?.weightedScore || 0) >= 70 ? "bg-yellow-500" : "bg-n0va-500"}`} style={{ width: `${score?.weightedScore || 0}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-2">{score?.weightedScore || 0}% weighted readiness ({(score?.pct || 0)}% raw)</p>
      </div>

      {score && Object.keys(score.byCategory).length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Category Scores</h4>
            <button onClick={() => setShowReport(!showReport)} className="text-[10px] text-gray-500 hover:text-gray-300">{showReport ? "Hide" : "Details"}</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(score.byCategory).map(([cat, data]) => (
              <div key={cat} className="bg-gray-800/50 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-500">{cat}</span>
                  <span className="text-[10px] font-medium text-white">{data.score}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${data.score >= 80 ? "bg-green-500" : data.score >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${data.score}%` }} />
                </div>
                <p className="text-[9px] text-gray-600 mt-1">{data.done}/{data.total} (w:{data.weight})</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORIES.map(cat => {
          const items = activeCheck.items.filter(i => i.category === cat);
          if (items.length === 0) return null;
          const done = items.filter(i => i.completed).length;
          return (
            <div key={cat} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">{cat}</h4>
                <span className="text-[10px] text-gray-600">{done}/{items.length}</span>
              </div>
              <div className="space-y-1">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-2 py-1 group">
                    <button onClick={() => toggleItem(item.id)} className="shrink-0">
                      {item.completed ? <CheckSquare className="w-3.5 h-3.5 text-green-400" /> : <Square className="w-3.5 h-3.5 text-gray-600" />}
                    </button>
                    <span className={`text-xs flex-1 ${item.completed ? "text-gray-600 line-through" : "text-gray-300"}`}>{item.task}</span>
                    {item.weight > 10 && <span className="text-[9px] text-amber-500/70 bg-amber-500/10 px-1 rounded">w{item.weight}</span>}
                    <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-600 hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={addItem} className="btn-secondary text-xs"><Plus className="w-3 h-3 mr-1" /> Add Task</button>
        <button onClick={() => {
          const missing = CATEGORIES.filter(c => !activeCheck.items.some(i => i.category === c));
          if (missing.length > 0) {
            const newItems: ReadinessItem[] = missing.flatMap(cat =>
              (PRESET_TASKS[cat] || []).slice(0, 3).map((task, i) => ({
                id: `${activeCheck.id}_${cat}_${i}_${Date.now()}`,
                task, category: cat, completed: false, assignedTo: "", completedBy: "", completedAt: "",
                weight: WEIGHT_DEFAULTS[cat] || 10,
              }))
            );
            const updated = checks.map(c => c.id === activeCheck.id ? { ...c, items: [...c.items, ...newItems], updatedAt: new Date().toISOString() } : c);
            checks.splice(0, checks.length, ...updated);
            addToast("success", `Added ${newItems.length} suggested tasks across ${missing.length} categories`);
          } else {
            addToast("info", "All categories already covered");
          }
        }} className="btn-ghost text-xs flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Suggest Missing Categories</button>
      </div>

      {activeCheck.notes && (
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Notes</p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{activeCheck.notes}</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">{editingId ? "Edit Checklist" : "New Checklist"}</h3>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-3">
              <div><label className="label">Campaign Name</label><input className="input" value={form.campaignName} onChange={e => setForm({ ...form, campaignName: e.target.value })} autoFocus /></div>
              <div><label className="label">Campaign Type</label><select className="input" value={form.campaignType} onChange={e => setForm({ ...form, campaignType: e.target.value })}>{CAMPAIGN_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}</select></div>
              <div><label className="label">Launch Date</label><input className="input" type="date" value={form.launchDate ? form.launchDate.slice(0, 10) : ""} onChange={e => setForm({ ...form, launchDate: new Date(e.target.value).toISOString() })} /></div>
              <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save" : "Create"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
