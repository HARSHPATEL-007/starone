import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Plus, Trash2, Copy, Check, Search, Megaphone, X, FolderOpen, Grid, List, Download, Upload, Tag, Star, Clock, Edit3, Play } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta Ads", google: "Google Ads", linkedin: "LinkedIn Ads",
  tiktok: "TikTok Ads", snapchat: "Snapchat Ads", x: "X/Twitter",
};

const TYPE_OPTIONS = [
  { id: "performance", label: "Performance", desc: "Drive conversions and ROAS" },
  { id: "brand", label: "Brand Awareness", desc: "Maximize reach and impressions" },
  { id: "retargeting", label: "Retargeting", desc: "Re-engage past visitors" },
  { id: "prospecting", label: "Prospecting", desc: "Find new audiences" },
];

const TEMPLATE_CATEGORIES = [
  { id: "all", label: "All Templates" },
  { id: "performance", label: "Performance" },
  { id: "brand", label: "Brand" },
  { id: "retargeting", label: "Retargeting" },
  { id: "prospecting", label: "Prospecting" },
];

const TYPE_COLORS: Record<string, string> = {
  performance: "bg-emerald-500", brand: "bg-blue-500", retargeting: "bg-purple-500", prospecting: "bg-amber-500",
};

export default function CampaignTemplates() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState({
    name: "", description: "", type: "performance", dailyBudget: 100, lifetimeBudget: 3000,
    currency: "USD", platforms: [] as string[], goal: "", tags: "", category: "performance",
  });
  const [applyTpl, setApplyTpl] = useState<any>(null);
  const [applyForm, setApplyForm] = useState({ campaignName: "", dailyBudget: "", lifetimeBudget: "" });
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [tpls, st] = await Promise.all([api.templates.list(), api.templates.stats()]);
      setTemplates(tpls);
      setStats(st);
    } catch {
      addToast("error", "Failed to load templates");
    }
    setLoading(false);
  }

  function togglePlatform(id: string) {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(id) ? prev.platforms.filter(p => p !== id) : [...prev.platforms, id],
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) { addToast("error", "Name is required"); return; }
    try {
      await api.templates.create({
        name: form.name,
        description: form.description,
        type: form.type,
        dailyBudget: form.dailyBudget,
        lifetimeBudget: form.lifetimeBudget,
        currency: form.currency,
        platforms: form.platforms,
        goal: form.goal,
        tags: form.tags,
      });
      setShowCreate(false);
      setForm({ name: "", description: "", type: "performance", dailyBudget: 100, lifetimeBudget: 3000, currency: "USD", platforms: [], goal: "", tags: "", category: "performance" });
      addToast("success", "Template created");
      loadData();
    } catch { addToast("error", "Failed to create template"); }
  }

  async function handleUse(tpl: any) {
    try {
      await api.templates.apply(tpl.id, {
        campaignName: `${tpl.name} — ${new Date().toLocaleDateString()}`,
        budgetOverrides: {},
      });
      addToast("success", `Campaign "${tpl.name}" created`);
      navigate("/campaigns");
    } catch { addToast("error", "Failed to create campaign from template"); }
  }

  async function handleDelete(id: string) {
    try {
      await api.templates.delete(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      addToast("success", "Template deleted");
    } catch { addToast("error", "Failed to delete template"); }
  }

  function handleExport() {
    const json = JSON.stringify(templates, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `campaign-templates-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("success", `${templates.length} templates exported`);
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (Array.isArray(imported)) {
          for (const t of imported) {
            await api.templates.create(t);
          }
          addToast("success", `${imported.length} templates imported`);
          loadData();
        }
      } catch { addToast("error", "Invalid template file"); }
    };
    input.click();
  }

  function openApply(tpl: any) {
    setApplyTpl(tpl);
    setApplyForm({
      campaignName: `${tpl.name} — ${new Date().toLocaleDateString()}`,
      dailyBudget: "",
      lifetimeBudget: "",
    });
  }

  async function handleApply() {
    if (!applyTpl) return;
    setApplying(true);
    try {
      const budgetOverrides: Record<string, number> = {};
      if (applyForm.dailyBudget) budgetOverrides.dailyBudget = Number(applyForm.dailyBudget);
      if (applyForm.lifetimeBudget) budgetOverrides.lifetimeBudget = Number(applyForm.lifetimeBudget);
      const result = await api.templates.apply(applyTpl.id, {
        campaignName: applyForm.campaignName,
        budgetOverrides: Object.keys(budgetOverrides).length ? budgetOverrides : undefined,
      });
      addToast("success", `Campaign "${result.name || applyForm.campaignName}" created`);
      setApplyTpl(null);
      if (result.id) navigate(`/campaigns/${result.id}`);
    } catch { addToast("error", "Failed to apply template"); }
    setApplying(false);
  }

  const filtered = useMemo(() => {
    return templates.filter(t => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCat !== "all" && t.type !== filterCat) return false;
      return true;
    });
  }, [templates, search, filterCat]);

  const allTags = useMemo(() => [...new Set(templates.flatMap((t: any) => t.tags ? (Array.isArray(t.tags) ? t.tags : t.tags.split(",").map((s: string) => s.trim())) : []))], [templates]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-white">Campaign Templates</h1>
            <p className="text-sm text-gray-500">{templates.length} templates · {filtered.length} shown</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-900 rounded-lg p-0.5 border border-gray-800">
            <button className={`p-1.5 rounded-md ${viewMode === "grid" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500"}`} onClick={() => setViewMode("grid")}><Grid className="w-3.5 h-3.5" /></button>
            <button className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500"}`} onClick={() => setViewMode("list")}><List className="w-3.5 h-3.5" /></button>
          </div>
          <button onClick={handleExport} className="btn-ghost text-xs flex items-center gap-1"><Download className="w-3 h-3" /> Export</button>
          <button onClick={handleImport} className="btn-ghost text-xs flex items-center gap-1"><Upload className="w-3 h-3" /> Import</button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Template</button>
        </div>
      </div>

      {stats && (
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-n0va-600/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-n0va-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalTemplates ?? templates.length}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Templates</p>
              </div>
            </div>
            {stats.mostUsedTemplate && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white truncate max-w-[160px]">{stats.mostUsedTemplate.name}</p>
                  <p className="text-[10px] text-gray-500">Most Used · {stats.mostUsedTemplate.count} times</p>
                </div>
              </div>
            )}
            {stats.usageDistribution && (
              <div className="flex-1 min-w-[200px]">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Usage by type</p>
                <div className="flex gap-1 h-5">
                  {(() => {
                    const total = Object.values(stats.usageDistribution).reduce((a: number, b: any) => a + (typeof b === "number" ? b : 0), 0) || 1;
                    return Object.entries(stats.usageDistribution).map(([type, count]) => (
                      <div
                        key={type}
                        className={`${TYPE_COLORS[type] || "bg-gray-600"} rounded-sm transition-all hover:opacity-80 relative group/bar`}
                        style={{ width: `${((count as number) / total) * 100}%` }}
                        title={`${type}: ${count}`}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-[10px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 whitespace-nowrap pointer-events-none">{type} ({String(count)})</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input className="input pl-10" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1">
          {TEMPLATE_CATEGORIES.map(cat => (
            <button key={cat.id} className={`text-xs px-2.5 py-1 rounded-lg border ${filterCat === cat.id ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:border-gray-600"}`} onClick={() => setFilterCat(cat.id)}>
              {cat.label} ({cat.id === "all" ? templates.length : templates.filter(t => t.type === cat.id).length})
            </button>
          ))}
        </div>
      </div>

      {templates.length === 0 && !showCreate ? (
        <div className="card text-center py-12">
          <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">No templates yet. Save a campaign configuration to reuse later.</p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>Create Your First Template</button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tpl: any) => {
            const tagList = tpl.tags ? (Array.isArray(tpl.tags) ? tpl.tags : tpl.tags.split(",").map((s: string) => s.trim()).filter(Boolean)) : [];
            return (
              <div key={tpl.id} className="card hover:border-gray-700 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-n0va-600/20 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-n0va-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">{tpl.name}</h3>
                      <p className="text-[10px] text-gray-500 capitalize">{tpl.type} template</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openApply(tpl)} className="p-1.5 text-gray-500 hover:text-n0va-400" title="Apply template"><Play className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleUse(tpl)} className="p-1.5 text-gray-500 hover:text-n0va-400" title="Use template"><Copy className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(tpl.id)} className="p-1.5 text-gray-500 hover:text-red-400" title="Delete template"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {tpl.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{tpl.description}</p>}

                <div className="flex flex-wrap gap-1 mb-3">
                  {tpl.platforms.map((p: string) => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{PLATFORM_LABELS[p] || p}</span>
                  ))}
                </div>

                {tagList.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {tagList.slice(0, 3).map((t: string) => <span key={t} className="text-[9px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Tag className="w-2 h-2" />{t}</span>)}
                    {tagList.length > 3 && <span className="text-[9px] text-gray-600">+{tagList.length - 3}</span>}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-800/50 rounded p-2"><p className="text-gray-600">Daily</p><p className="text-white font-medium">${tpl.dailyBudget}</p></div>
                  <div className="bg-gray-800/50 rounded p-2"><p className="text-gray-600">Lifetime</p><p className="text-white font-medium">${tpl.lifetimeBudget.toLocaleString()}</p></div>
                </div>

                {tpl.goal && <p className="text-[10px] text-gray-600 mt-2 flex items-center gap-1"><Star className="w-2.5 h-2.5" /> {tpl.goal}</p>}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
                  <span className="text-[10px] text-gray-600 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Used {tpl.usedCount || 0} times</span>
                  <button onClick={() => openApply(tpl)} className="text-xs text-n0va-400 hover:text-n0va-300 flex items-center gap-1">
                    <Play className="w-3 h-3" /> Apply
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full card text-center py-8">
              <p className="text-gray-500 text-sm">No templates match your search</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Platforms</th>
                <th className="p-3 font-medium text-right">Daily</th>
                <th className="p-3 font-medium text-right">Lifetime</th>
                <th className="p-3 font-medium text-right">Used</th>
                <th className="p-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(tpl => (
                <tr key={tpl.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-n0va-400 shrink-0" />
                      <span className="text-white font-medium">{tpl.name}</span>
                    </div>
                  </td>
                  <td className="p-3 capitalize text-gray-400">{tpl.type}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {tpl.platforms.map((p: string) => <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">{PLATFORM_LABELS[p] || p}</span>)}
                    </div>
                  </td>
                  <td className="p-3 text-right text-gray-300">${tpl.dailyBudget}</td>
                  <td className="p-3 text-right text-gray-300">${tpl.lifetimeBudget.toLocaleString()}</td>
                  <td className="p-3 text-right text-gray-500">{tpl.usedCount || 0}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openApply(tpl)} className="p-1 text-gray-600 hover:text-n0va-400" title="Apply"><Play className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleUse(tpl)} className="p-1 text-gray-600 hover:text-n0va-400" title="Use"><Copy className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(tpl.id)} className="p-1 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">New Template</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-1">Template Name *</label><input className="input" placeholder="e.g., Q4 Performance Template" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea className="input h-16 resize-none" placeholder="What is this template for?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><label className="block text-sm text-gray-400 mb-2">Campaign Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map(t => (
                    <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))} className={`p-2 rounded-lg border text-left text-xs transition-all ${form.type === t.id ? "border-n0va-500 bg-n0va-600/10" : "border-gray-800 bg-gray-800/50"}`}>
                      <p className="text-white font-medium">{t.label}</p>
                      <p className="text-gray-500 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-gray-400 mb-1">Daily Budget ($)</label><input type="number" className="input" value={form.dailyBudget} onChange={e => setForm(f => ({ ...f, dailyBudget: Number(e.target.value) }))} /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Lifetime Budget ($)</label><input type="number" className="input" value={form.lifetimeBudget} onChange={e => setForm(f => ({ ...f, lifetimeBudget: Number(e.target.value) }))} /></div>
              </div>
              <div><label className="block text-sm text-gray-400 mb-2">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PLATFORM_LABELS).map(([id, label]) => (
                    <button key={id} onClick={() => togglePlatform(id)} className={`px-2.5 py-1 rounded-lg text-xs transition-all ${form.platforms.includes(id) ? "bg-n0va-600 text-white" : "bg-gray-800 text-gray-400"}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div><label className="block text-sm text-gray-400 mb-1">Goal</label><input className="input" placeholder="e.g., Drive Q4 revenue" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Tags</label><input className="input" placeholder="e.g., q4, evergreen, high-budget" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-800">
              <button onClick={() => setShowCreate(false)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={handleSave} disabled={!form.name.trim()} className="btn-primary text-sm">Save Template</button>
            </div>
          </div>
        </div>
      )}

      {applyTpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setApplyTpl(null)}>
          <div className="w-full max-w-md bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Apply Template</h3>
              <button onClick={() => setApplyTpl(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Creating campaign from <span className="text-white font-medium">{applyTpl.name}</span></p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Campaign Name</label>
                <input className="input" value={applyForm.campaignName} onChange={e => setApplyForm(f => ({ ...f, campaignName: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Daily Budget (optional)</label>
                  <input type="number" className="input" placeholder={String(applyTpl.dailyBudget)} value={applyForm.dailyBudget} onChange={e => setApplyForm(f => ({ ...f, dailyBudget: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Lifetime Budget (optional)</label>
                  <input type="number" className="input" placeholder={String(applyTpl.lifetimeBudget)} value={applyForm.lifetimeBudget} onChange={e => setApplyForm(f => ({ ...f, lifetimeBudget: e.target.value }))} />
                </div>
              </div>
              <div className="text-[11px] text-gray-600 bg-gray-800/50 rounded-lg p-3">
                <p>Template: <span className="text-gray-300">{applyTpl.name}</span></p>
                <p>Type: <span className="text-gray-300 capitalize">{applyTpl.type}</span></p>
                <p>Platforms: <span className="text-gray-300">{applyTpl.platforms?.map((p: string) => PLATFORM_LABELS[p] || p).join(", ") || "None"}</span></p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-800">
              <button onClick={() => setApplyTpl(null)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={handleApply} disabled={!applyForm.campaignName.trim() || applying} className="btn-primary text-sm flex items-center gap-1">
                {applying ? "Applying..." : <><Play className="w-3.5 h-3.5" /> Create Campaign</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
