import { useState, useMemo, useEffect } from "react";
import { ListFilter, Plus, X, Edit3, Trash2, Copy, Search, Tag, Eye, Users, Megaphone, Palette, BarChart3, Bot, FileJson, Target, Share2, Star, Download, Grid, List, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

type EntityType = "campaign" | "creative" | "audience" | "analytics" | "agent" | "recipe" | "platform" | "generic";

interface SmartList {
  id: string;
  name: string;
  description: string;
  entityType: EntityType;
  filters: FilterRule[];
  isFavorite: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FilterRule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

const ENTITY_TYPES: { value: EntityType; label: string; icon: any; color: string; route: string }[] = [
  { value: "campaign", label: "Campaigns", icon: Megaphone, color: "text-blue-400 bg-blue-500/10", route: "/campaigns" },
  { value: "creative", label: "Creatives", icon: Palette, color: "text-purple-400 bg-purple-500/10", route: "/creatives" },
  { value: "audience", label: "Audiences", icon: Users, color: "text-green-400 bg-green-500/10", route: "/audiences" },
  { value: "analytics", label: "Analytics", icon: BarChart3, color: "text-amber-400 bg-amber-500/10", route: "/analytics" },
  { value: "agent", label: "AI Agents", icon: Bot, color: "text-cyan-400 bg-cyan-500/10", route: "/agents" },
  { value: "recipe", label: "Recipes", icon: FileJson, color: "text-orange-400 bg-orange-500/10", route: "/recipes" },
  { value: "platform", label: "Platforms", icon: Share2, color: "text-indigo-400 bg-indigo-500/10", route: "/platforms" },
  { value: "generic", label: "Generic", icon: Target, color: "text-gray-400 bg-gray-500/10", route: "#" },
];

const FIELD_PRESETS = ["Status", "ROAS", "CTR", "CPC", "CPA", "Revenue", "Impressions", "Clicks", "Conversions", "Created Date", "Owner", "Platform", "Budget", "Spend", "Frequency"];

const FILTER_TEMPLATES = [
  { name: "High Performers", entityType: "campaign" as EntityType, filters: [{ id: "f1", field: "ROAS", operator: ">=", value: "3" }] },
  { name: "Underperforming", entityType: "campaign" as EntityType, filters: [{ id: "f1", field: "ROAS", operator: "<", value: "1" }] },
  { name: "High CPC", entityType: "campaign" as EntityType, filters: [{ id: "f1", field: "CPC", operator: ">", value: "5" }] },
  { name: "Recent Creatives", entityType: "creative" as EntityType, filters: [{ id: "f1", field: "Created Date", operator: "last_n_days", value: "30" }] },
];

export default function SmartLists() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [lists, setLists] = useState<SmartList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLists(); }, []);

  async function loadLists() {
    setLoading(true);
    try {
      const data = await api.entities.list("smart_lists");
      setLists(data || []);
    } catch { setLists([]); }
    setLoading(false);
  }
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<EntityType | "all">("all");
  const [showFavorites, setShowFavorites] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "usageCount" | "updatedAt">("updatedAt");
  const [sortDesc, setSortDesc] = useState(true);
  const [form, setForm] = useState<{ name: string; description: string; entityType: EntityType; filters: FilterRule[] }>({ name: "", description: "", entityType: "campaign", filters: [] });

  function resetForm(l?: SmartList) {
    if (l) setForm({ name: l.name, description: l.description, entityType: l.entityType, filters: l.filters.map(f => ({ ...f })) });
    else setForm({ name: "", description: "", entityType: "campaign", filters: [] });
  }

  function addFilter() {
    setForm(f => ({ ...f, filters: [...f.filters, { id: Date.now().toString(36), field: "", operator: "=", value: "" }] }));
  }

  function updateFilter(id: string, field: keyof FilterRule, value: any) {
    setForm(f => ({ ...f, filters: f.filters.map(fl => fl.id === id ? { ...fl, [field]: value } : fl) }));
  }

  function removeFilter(id: string) {
    setForm(f => ({ ...f, filters: f.filters.filter(fl => fl.id !== id) }));
  }

  function applyTemplate(tmpl: typeof FILTER_TEMPLATES[0]) {
    setForm({ name: tmpl.name, description: `Auto-generated: ${tmpl.name}`, entityType: tmpl.entityType, filters: tmpl.filters.map(f => ({ ...f, id: Date.now().toString(36) })) });
    addToast("success", `Template "${tmpl.name}" applied`);
  }

  async function handleSave() {
    if (!form.name.trim()) { addToast("error", "List name is required"); return; }
    const validFilters = form.filters.filter(f => f.field && f.value);
    const now = new Date().toISOString();
    const list: SmartList = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: form.name.trim(), description: form.description.trim(),
      entityType: form.entityType, filters: validFilters,
      isFavorite: editingId ? lists.find(l => l.id === editingId)!.isFavorite : false,
      usageCount: editingId ? lists.find(l => l.id === editingId)!.usageCount : 0,
      createdAt: editingId ? lists.find(l => l.id === editingId)!.createdAt : now, updatedAt: now,
    };
    try {
      if (editingId) {
        await api.entities.update("smart_lists", editingId, list as any);
        addToast("success", "Smart list updated");
      } else {
        await api.entities.create("smart_lists", list as any);
        addToast("success", "Smart list created");
      }
      await loadLists();
    } catch { addToast("error", "Save failed"); }
    setShowForm(false);
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const name = lists.find(l => l.id === id)?.name;
    try {
      await api.entities.delete("smart_lists", id);
      await loadLists();
      addToast("success", `"${name}" deleted`);
    } catch { addToast("error", "Delete failed"); }
  }

  async function toggleFavorite(id: string) {
    const list = lists.find(l => l.id === id);
    if (!list) return;
    try {
      await api.entities.update("smart_lists", id, { ...list, isFavorite: !list.isFavorite } as any);
      await loadLists();
    } catch { addToast("error", "Failed to update favorite"); }
  }

  async function duplicate(id: string) {
    const l = lists.find(li => li.id === id);
    if (!l) return;
    const copy: SmartList = { ...l, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: `${l.name} (Copy)`, usageCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    try {
      await api.entities.create("smart_lists", copy as any);
      await loadLists();
      addToast("success", "Smart list duplicated");
    } catch { addToast("error", "Duplicate failed"); }
  }

  function applyList(list: SmartList) {
    const et = ENTITY_TYPES.find(e => e.value === list.entityType);
    if (et && et.route !== "#") {
      navigate(et.route);
      addToast("success", `Filters applied: ${list.name}`);
    } else {
      addToast("info", `Filters applied: ${list.name} (navigate to ${list.entityType})`);
    }
  }

  function handleExport() {
    const headers = ["Name", "Description", "Entity Type", "Filters", "Favorite", "Usage", "Updated"];
    const rows = filtered.map(l => [l.name, l.description, l.entityType, l.filters.map(f => `${f.field} ${f.operator} ${f.value}`).join("; "), l.isFavorite ? "Yes" : "No", l.usageCount.toString(), new Date(l.updatedAt).toLocaleDateString()]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "smart-lists-export.csv"; a.click();
    URL.revokeObjectURL(url);
    addToast("success", "Exported smart lists");
  }

  let filtered = useMemo(() => {
    let result = lists;
    if (filterType !== "all") result = result.filter(l => l.entityType === filterType);
    if (showFavorites) result = result.filter(l => l.isFavorite);
    if (search) result = result.filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || l.description.toLowerCase().includes(search.toLowerCase()));
    return [...result].sort((a, b) => {
      if (sortBy === "name") return sortDesc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
      if (sortBy === "usageCount") return sortDesc ? b.usageCount - a.usageCount : a.usageCount - b.usageCount;
      return sortDesc ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() : new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    });
  }, [lists, filterType, showFavorites, search, sortBy, sortDesc]);

  const favCount = lists.filter(l => l.isFavorite).length;

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDesc(!sortDesc);
    else { setSortBy(col); setSortDesc(true); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ListFilter className="w-6 h-6 text-n0va-400" />
            Smart Lists
          </h1>
          <p className="text-gray-400 mt-1">{lists.length} saved lists · {favCount} favorites · {lists.reduce((s, l) => s + l.usageCount, 0)} total uses</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-xs flex items-center gap-1.5" onClick={handleExport}><Download className="w-3.5 h-3.5" /> Export</button>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Smart List</button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search lists..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input py-2 text-sm w-auto min-w-[130px]" value={filterType} onChange={e => setFilterType(e.target.value as EntityType | "all")}>
          <option value="all">All Types</option>
          {ENTITY_TYPES.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
        </select>
        <button onClick={() => setShowFavorites(!showFavorites)} className={`btn-secondary text-sm ${showFavorites ? "ring-1 ring-yellow-500/50" : ""}`}>
          <Star className={`w-3.5 h-3.5 mr-1.5 ${showFavorites ? "text-yellow-400" : ""}`} /> Favorites{favCount > 0 ? ` (${favCount})` : ""}
        </button>
        <div className="flex border border-gray-800 rounded-lg overflow-hidden ml-auto">
          <button className={`p-1.5 ${viewMode === "grid" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500"}`} onClick={() => setViewMode("grid")}><Grid className="w-3.5 h-3.5" /></button>
          <button className={`p-1.5 ${viewMode === "list" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500"}`} onClick={() => setViewMode("list")}><List className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Template presets */}
      {!search && !showFavorites && filterType === "all" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-600">Templates:</span>
          {FILTER_TEMPLATES.map(t => (
            <button key={t.name} onClick={() => { resetForm(); applyTemplate(t); setShowForm(true); }} className="text-[10px] px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-gray-300 border border-gray-700">
              {t.name}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Smart List" : "New Smart List"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div><label className="label">List Name</label><input className="input" placeholder="e.g. High Performers" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
              <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="What does this list capture?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><label className="label">Entity Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {ENTITY_TYPES.map(et => (
                    <button type="button" key={et.value} onClick={() => setForm({ ...form, entityType: et.value })} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors ${form.entityType === et.value ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400 hover:text-white"}`}>
                      <et.icon className="w-3 h-3" /> {et.label}
                    </button>
                  ))}
                </div>
              </div>
              <div><div className="flex items-center justify-between mb-2"><label className="label mb-0">Filters</label><button type="button" onClick={addFilter} className="text-xs text-n0va-400 hover:text-n0va-300">+ Add Filter</button></div>
                {form.filters.length === 0 && <p className="text-xs text-gray-600 py-2">No filters — this list will match all items of the selected type.</p>}
                {form.filters.map(f => (
                  <div key={f.id} className="flex items-center gap-1.5 mb-2">
                    <input list="field-presets" className="input text-xs py-1.5 w-28" placeholder="field" value={f.field} onChange={e => updateFilter(f.id, "field", e.target.value)} />
                    <datalist id="field-presets">{FIELD_PRESETS.map(fp => <option key={fp} value={fp} />)}</datalist>
                    <select className="text-xs bg-gray-800 text-gray-300 rounded px-1.5 py-1.5 border border-gray-700" value={f.operator} onChange={e => updateFilter(f.id, "operator", e.target.value)}>
                      {["=", "!=", ">", ">=", "<", "<=", "contains", "not_contains", "starts_with", "ends_with", "last_n_days", "in"].map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                    <input className="input text-xs py-1.5 flex-1" placeholder="value" value={f.value} onChange={e => updateFilter(f.id, "value", e.target.value)} />
                    <button type="button" onClick={() => removeFilter(f.id)} className="p-1 text-gray-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create List"}</button></div>
            </form>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <ListFilter className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No smart lists found</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Save your first filter configuration for quick access."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create List</button>}
        </div>
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(list => {
            const et = ENTITY_TYPES.find(e => e.value === list.entityType)!;
            const EtIcon = et.icon;
            return (
              <div key={list.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${et.color}`}><EtIcon className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white truncate">{list.name}</h3>
                      {list.isFavorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{list.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
                      <span>{list.filters.length} filter{list.filters.length !== 1 ? "s" : ""}</span>
                      <span>Used {list.usageCount} times</span>
                      <span>Updated {new Date(list.updatedAt).toLocaleDateString()}</span>
                    </div>
                    {list.filters.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {list.filters.map(f => <Tag key={f.id} className="w-3 h-3 text-gray-700" />)}
                        <span className="text-[10px] text-gray-600">{list.filters.map(f => `${f.field} ${f.operator} ${f.value}`).join(", ")}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => applyList(list)} className="p-1.5 text-gray-600 hover:text-n0va-400" title="Apply filters"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toggleFavorite(list.id)} className="p-1.5 text-gray-600 hover:text-yellow-400"><Star className={`w-3.5 h-3.5 ${list.isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} /></button>
                    <button onClick={() => duplicate(list.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><Copy className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { resetForm(list); setEditingId(list.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(list.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800 text-left text-xs text-gray-500">
              <th className="p-3 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("name")}>Name <ArrowUpDown className="w-3 h-3 inline" /></th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Filters</th>
              <th className="p-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => toggleSort("usageCount")}>Usage <ArrowUpDown className="w-3 h-3 inline" /></th>
              <th className="p-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => toggleSort("updatedAt")}>Updated <ArrowUpDown className="w-3 h-3 inline" /></th>
              <th className="p-3 w-24" />
            </tr></thead>
            <tbody>
              {filtered.map(list => {
                const et = ENTITY_TYPES.find(e => e.value === list.entityType)!;
                return (
                  <tr key={list.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {list.isFavorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                        <span className="text-white font-medium">{list.name}</span>
                      </div>
                    </td>
                    <td className="p-3"><span className={`text-[10px] px-1.5 py-0.5 rounded ${et.color}`}>{et.label}</span></td>
                    <td className="p-3 text-xs text-gray-500">{list.filters.length} rules</td>
                    <td className="p-3 text-right text-gray-300">{list.usageCount}</td>
                    <td className="p-3 text-right text-gray-500 text-xs">{new Date(list.updatedAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => applyList(list)} className="p-1 text-gray-600 hover:text-n0va-400"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { resetForm(list); setEditingId(list.id); setShowForm(true); }} className="p-1 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(list.id)} className="p-1 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
