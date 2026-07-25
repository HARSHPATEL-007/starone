import { useState, useEffect } from "react";
import { Rocket, Plus, X, Edit3, Trash2, Search, CheckCircle, Circle, AlertTriangle, CheckSquare, Clock, Users, Target, ListChecks, ArrowRight, Square } from "lucide-react";
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
}

interface ReadinessCheck {
  id: string;
  campaignName: string;
  launchDate: string;
  items: ReadinessItem[];
  status: "draft" | "in_progress" | "ready" | "blocked";
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ["Creative", "Audience", "Budget", "Tracking", "Platform", "Compliance", "Content", "Team"];

export default function LaunchReadiness() {
  const { addToast } = useToast();
  const { data: checks, loading, create, update, remove, replaceAll } = useEntityData<ReadinessCheck>("launch_readiness");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ campaignName: string; launchDate: string; notes: string }>({ campaignName: "", launchDate: "", notes: "" });

  const activeCheck = checks.find(c => c.id === activeId) || checks[0];
  const completedItems = activeCheck?.items.filter(i => i.completed).length || 0;
  const totalItems = activeCheck?.items.length || 0;
  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  function resetForm(c?: ReadinessCheck) {
    if (c) setForm({ campaignName: c.campaignName, launchDate: c.launchDate, notes: c.notes });
    else setForm({ campaignName: "", launchDate: "", notes: "" });
  }

  function toggleItem(itemId: string) {
    if (!activeCheck) return;
    const now = new Date().toISOString();
    replaceAll(checks.map(c => c.id === activeCheck.id ? ({
      ...c, items: c.items.map(i => i.id === itemId ? { ...i, completed: !i.completed, completedAt: !i.completed ? now : "", completedBy: !i.completed ? "You" : "" } : i),
      updatedAt: now,
    }) : c));
  }

  function addItem() {
    if (!activeCheck) return;
    const label = prompt("Task description:");
    if (!label) return;
    const category = prompt("Category (Creative, Audience, Budget, Tracking, Platform, Compliance, Content, Team):") || "Other";
    replaceAll(checks.map(c => c.id === activeCheck.id ? {
      ...c, items: [...c.items, { id: Date.now().toString(36), task: label, category, completed: false, assignedTo: "", completedBy: "", completedAt: "" }],
      updatedAt: new Date().toISOString(),
    } : c));
    addToast("success", "Task added");
  }

  function removeItem(itemId: string) {
    if (!activeCheck) return;
    replaceAll(checks.map(c => c.id === activeCheck.id ? { ...c, items: c.items.filter(i => i.id !== itemId), updatedAt: new Date().toISOString() } : c));
    addToast("success", "Task removed");
  }

  function handleSave() {
    if (!form.campaignName.trim()) { addToast("error", "Campaign name required"); return; }
    const now = new Date().toISOString();
    const check: ReadinessCheck = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      campaignName: form.campaignName.trim(), launchDate: form.launchDate, notes: form.notes.trim(),
      items: editingId ? checks.find(c => c.id === editingId)!.items.map(i => ({ ...i })) : [],
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
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Rocket className="w-6 h-6 text-n0va-400" />
            Launch Readiness
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            <input className="input pl-8 pr-3 py-1.5 text-xs w-48" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-xs py-1.5"><Plus className="w-3 h-3 mr-1" /> New</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {filtered.map(c => (
          <div key={c.id} className="flex items-center gap-1">
            <button onClick={() => setActiveId(c.id)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${c.id === activeCheck.id ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400"}`}>{c.campaignName}</button>
            <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-600 hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-white">{activeCheck.campaignName}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${pct === 100 ? "bg-green-500/20 text-green-400" : pct >= 70 ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-800 text-gray-500"}`}>{pct === 100 ? "Ready" : pct >= 70 ? "Almost Ready" : "In Progress"}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-400" />{completedItems}/{totalItems}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Launch: {new Date(activeCheck.launchDate).toLocaleDateString()}</span>
            <button onClick={() => { resetForm(activeCheck); setEditingId(activeCheck.id); setShowForm(true); }} className="p-1 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-n0va-500"}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-2">{pct}% complete</p>
      </div>

      {/* Category groups */}
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
                    {item.assignedTo && <span className="text-[9px] text-gray-700">{item.assignedTo}</span>}
                    <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-600 hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={addItem} className="btn-secondary text-xs"><Plus className="w-3 h-3 mr-1" /> Add Task</button>

      {activeCheck.notes && (
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Notes</p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{activeCheck.notes}</p>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">{editingId ? "Edit Checklist" : "New Checklist"}</h3>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-3">
              <div><label className="label">Campaign Name</label><input className="input" value={form.campaignName} onChange={e => setForm({ ...form, campaignName: e.target.value })} autoFocus /></div>
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
