import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CheckSquare, Square, Megaphone, CheckCircle, AlertCircle, RefreshCw, RotateCcw, Loader, ExternalLink, Plus, X, Edit3, Trash2, Save, BarChart3, Clock, ListChecks, Filter, Zap, Play } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../api/client";
import { useLaunchChecklist, ChecklistItem } from "../hooks/useLaunchChecklist";
import { useToast } from "../components/Toast";

const categoryColors: Record<string, string> = {
  creative: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  audience: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  budget: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  schedule: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  platform: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  tracking: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  approval: "bg-red-500/10 text-red-400 border-red-500/20",
  custom: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const CATEGORIES = [
  { value: "creative", label: "Creative" }, { value: "audience", label: "Audience" },
  { value: "budget", label: "Budget" }, { value: "schedule", label: "Schedule" },
  { value: "platform", label: "Platform" }, { value: "tracking", label: "Tracking" },
  { value: "approval", label: "Approval" }, { value: "custom", label: "Custom" },
];

export default function LaunchChecklist() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { items, getChecklist, toggleItem, resetChecklist, addItem, updateItem, removeItem } = useLaunchChecklist();
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem, setEditItem] = useState<ChecklistItem | null>(null);
  const [itemForm, setItemForm] = useState({ label: "", description: "", category: "custom" });
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => { loadCampaigns(); }, []);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const res = await api.campaigns.list();
      setCampaigns(res.campaigns || res || []);
    } catch {}
    setLoading(false);
  }

  function resetForm(item?: ChecklistItem) {
    if (item) setItemForm({ label: item.label, description: item.description || "", category: item.category });
    else setItemForm({ label: "", description: "", category: "custom" });
  }

  function handleSaveItem() {
    if (!itemForm.label.trim()) { addToast("error", "Item label is required"); return; }
    const label = itemForm.label.trim();
    const description = itemForm.description.trim();
    const category = itemForm.category;
    if (editItem) {
      updateItem(editItem.id, { label, description, category });
      addToast("success", "Item updated");
    } else {
      addItem({ label, description, category });
      addToast("success", "Item added");
    }
    setShowItemForm(false);
    setEditItem(null);
  }

  function handleEdit(item: ChecklistItem) {
    setEditItem(item);
    resetForm(item);
    setShowItemForm(true);
  }

  function handleDelete(itemId: string) {
    removeItem(itemId);
    addToast("success", "Item removed");
  }

  function handleBulkToggle(campaignId: string, toggleTo: boolean) {
    const visibleItems = filteredItems;
    visibleItems.forEach(item => {
      const cl = getChecklist(campaignId);
      const isChecked = cl.completed.includes(item.id);
      if (isChecked !== toggleTo) {
        toggleItem(campaignId, item.id);
      }
    });
    addToast("success", `${visibleItems.length} items ${toggleTo ? "checked" : "unchecked"} for this campaign`);
  }

  function handleBulkLaunch() {
    const ids = [...selectedCampaigns];
    Promise.all(ids.map(id => api.campaigns.updateStatus(id, "active").catch(() => {})));
    addToast("success", `Launching ${ids.length} campaign(s)`);
    setSelectedCampaigns(new Set());
    setTimeout(loadCampaigns, 500);
  }

  const filteredItems = filterCategory === "all" ? items : items.filter(i => i.category === filterCategory);

  const checklistData = useMemo(() => campaigns.map((c) => {
    const id = c._id || c.id;
    const cl = getChecklist(id);
    const pct = items.length > 0 ? Math.round((cl.completed.length / items.length) * 100) : 0;
    const byCategory = CATEGORIES.map(cat => {
      const catItems = items.filter(i => i.category === cat.value);
      const done = catItems.filter(i => cl.completed.includes(i.id)).length;
      return { category: cat.label, done, total: catItems.length, pct: catItems.length > 0 ? Math.round((done / catItems.length) * 100) : 0 };
    });
    return { campaign: c, id, checklist: cl, pct, byCategory };
  }), [campaigns, items, getChecklist]);

  const readyToLaunch = checklistData.filter(d => d.pct === 100 && d.campaign.status === "draft");
  const needsWork = checklistData.filter(d => d.pct < 100 && d.campaign.status === "draft");
  const avgReadiness = checklistData.length > 0 ? Math.round(checklistData.reduce((s, d) => s + d.pct, 0) / checklistData.length) : 0;

  function toggleSelect(id: string) {
    setSelectedCampaigns(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CheckSquare className="w-6 h-6 text-n0va-400" />
            Launch Checklist
          </h1>
          <p className="text-gray-400 mt-1">{items.length} checklist items · {campaigns.length} campaigns · Avg readiness {avgReadiness}%</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditItem(null); resetForm(); setShowItemForm(true); }} className="btn-ghost text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Item</button>
          <button onClick={loadCampaigns} className="btn-ghost text-sm flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-2xl font-bold text-white">{campaigns.length}</p><p className="text-xs text-gray-500">Total Campaigns</p></div>
        <div className="card p-4"><p className="text-2xl font-bold text-emerald-400">{readyToLaunch.length}</p><p className="text-xs text-gray-500">Ready to Launch</p></div>
        <div className="card p-4"><p className="text-2xl font-bold text-amber-400">{needsWork.length}</p><p className="text-xs text-gray-500">Needs Attention</p></div>
        <div className="card p-4"><p className="text-2xl font-bold text-n0va-400">{avgReadiness}%</p><p className="text-xs text-gray-500">Avg Readiness</p></div>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-600" />
          <button className={`text-xs px-2.5 py-1 rounded-lg border ${filterCategory === "all" ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500"}`} onClick={() => setFilterCategory("all")}>All ({items.length})</button>
          {CATEGORIES.map(cat => {
            const count = items.filter(i => i.category === cat.value).length;
            if (count === 0) return null;
            return (
              <button key={cat.value} className={`text-xs px-2.5 py-1 rounded-lg border ${filterCategory === cat.value ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500"} ${categoryColors[cat.value]?.split(" ")[0] || ""}`}
                onClick={() => setFilterCategory(cat.value)}>
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {selectedCampaigns.size > 0 && (
        <div className="card p-3 flex items-center gap-3 bg-n0va-600/10 border-n0va-600/30">
          <span className="text-sm text-white font-medium">{selectedCampaigns.size} campaign(s) selected</span>
          <button onClick={() => { selectedCampaigns.forEach(id => handleBulkToggle(id, true)); }} className="btn-primary text-xs flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5" /> Check All Items
          </button>
          <button onClick={() => { selectedCampaigns.forEach(id => handleBulkToggle(id, false)); }} className="btn-secondary text-xs flex items-center gap-1.5">
            <Square className="w-3.5 h-3.5" /> Uncheck All
          </button>
          <button onClick={handleBulkLaunch} className="btn-primary text-xs flex items-center gap-1.5 bg-green-600 hover:bg-green-700">
            <Play className="w-3.5 h-3.5" /> Launch Selected
          </button>
          <button onClick={() => setSelectedCampaigns(new Set())} className="btn-ghost text-xs">Clear</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]"><Loader className="w-6 h-6 animate-spin text-n0va-400" /></div>
      ) : campaigns.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Megaphone className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No campaigns yet</h3>
          <p className="text-sm text-gray-500">Create a campaign to start using the launch checklist.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {checklistData.map(({ campaign, id, checklist, pct, byCategory }) => {
            const isComplete = pct === 100;
            const isActive = campaign.status === "active";
            const isSelected = selectedCampaigns.has(id);
            return (
              <div key={id} className={`card p-5 ${isActive ? "border-green-600/30" : isComplete ? "border-emerald-600/30" : isSelected ? "border-n0va-500/40" : ""}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 min-w-0">
                    {campaign.status === "draft" && (
                      <button onClick={() => toggleSelect(id)} className="mt-2 shrink-0 text-gray-600 hover:text-white">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-n0va-400" /> : <Square className="w-4 h-4" />}
                      </button>
                    )}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-green-500/10" : isComplete ? "bg-emerald-500/10" : "bg-gray-800"}`}>
                      {isActive ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Megaphone className={`w-5 h-5 ${isComplete ? "text-emerald-400" : "text-gray-500"}`} />}
                    </div>
                    <div className="min-w-0">
                      <Link to={`/campaigns/${id}`} className="text-sm font-medium text-white hover:text-n0va-400 flex items-center gap-1.5">
                        {campaign.name} <ExternalLink className="w-3 h-3 shrink-0" />
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500 capitalize">{campaign.status}</span>
                        <span className={`text-xs font-medium ${isComplete ? "text-emerald-400" : pct > 50 ? "text-amber-400" : "text-gray-500"}`}>{pct}%</span>
                        {isActive && <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">Live</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => resetChecklist(id)} className="text-gray-600 hover:text-gray-400" title="Reset checklist"><RotateCcw className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-gray-800 rounded-full mb-4 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${isComplete ? "bg-emerald-500" : "bg-n0va-500"}`} style={{ width: `${pct}%` }} />
                </div>

                {byCategory.some(b => b.total > 0) && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-[10px] text-gray-500">By Category</span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                      {byCategory.filter(b => b.total > 0).map(b => (
                        <div key={b.category} className="text-center">
                          <div className="h-12 bg-gray-800/50 rounded-sm overflow-hidden flex items-end">
                            <div className={`w-full rounded-sm transition-all ${b.pct >= 80 ? "bg-emerald-500" : b.pct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ height: `${b.pct}%`, minHeight: b.pct > 0 ? "4px" : "0" }} />
                          </div>
                          <p className="text-[8px] text-gray-600 mt-0.5 truncate">{b.category.slice(0, 4)}</p>
                          <p className="text-[8px] text-gray-500">{b.done}/{b.total}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredItems.map((item: ChecklistItem) => {
                    const checked = checklist.completed.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(id, item.id)}
                        disabled={isActive}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${
                          checked ? "border-emerald-500/20 bg-emerald-500/5" : "border-gray-800 hover:border-gray-700 bg-transparent"
                        } ${isActive ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {checked ? <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> : <Square className="w-4 h-4 text-gray-600 mt-0.5 shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-medium ${checked ? "text-emerald-300" : "text-gray-300"}`}>{item.label}</p>
                          {item.description && <p className="text-[10px] text-gray-600 mt-0.5">{item.description}</p>}
                          <span className={`text-[9px] px-1 py-0.5 rounded mt-1 inline-block ${categoryColors[item.category] || ""}`}>{item.category}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setShowItemForm(false); setEditItem(null); }}>
          <div className="w-full max-w-md bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{editItem ? "Edit Item" : "Add Checklist Item"}</h3>
              <button onClick={() => { setShowItemForm(false); setEditItem(null); }} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleSaveItem(); }} className="space-y-4">
              <div><label className="label">Label</label><input className="input w-full" placeholder="e.g. Creative assets approved" value={itemForm.label} onChange={e => setItemForm({ ...itemForm, label: e.target.value })} autoFocus /></div>
              <div><label className="label">Description (optional)</label><textarea className="input w-full min-h-[60px] resize-none" placeholder="Details about this checklist item" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} /></div>
              <div><label className="label">Category</label><select className="input w-full" value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })}>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowItemForm(false); setEditItem(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-1.5"><Save className="w-4 h-4" /> {editItem ? "Update" : "Add"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
