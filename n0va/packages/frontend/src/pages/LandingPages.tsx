import { useState, useMemo } from "react";
import { ExternalLink, Plus, X, Edit3, Trash2, Copy, Search, Globe, Eye, Calendar, BarChart3, Smartphone, Monitor, Link2, MousePointerClick, TrendingUp, TrendingDown, Zap, Activity, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useToast } from "../components/Toast";
import { useEntityData } from "../hooks/useEntityData";

interface LandingPage {
  _id?: string;
  id: string;
  name: string;
  url: string;
  campaignName: string;
  description: string;
  tags: string[];
  views: number;
  conversions: number;
  createdAt: string;
  updatedAt: string;
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

const PAGE_SIZE = 12;

export default function LandingPages() {
  const { addToast } = useToast();
  const { data: pages, create, update, remove } = useEntityData<LandingPage>("landing_pages");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [filterTag, setFilterTag] = useState("all");
  const [form, setForm] = useState({ name: "", url: "", campaignName: "", description: "", tags: "", views: 0, conversions: 0 });

  const allTags = useMemo(() => [...new Set(pages.flatMap(p => p.tags))], [pages]);

  function resetForm(lp?: LandingPage) {
    if (lp) setForm({ name: lp.name, url: lp.url, campaignName: lp.campaignName, description: lp.description, tags: lp.tags.join(", "), views: lp.views, conversions: lp.conversions });
    else setForm({ name: "", url: "", campaignName: "", description: "", tags: "", views: 0, conversions: 0 });
  }

  async function handleSave() {
    if (!form.name.trim() || !form.url.trim()) { addToast("error", "Name and URL are required"); return; }
    const now = new Date().toISOString();
    const lp: LandingPage = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: form.name.trim(), url: form.url.trim(), campaignName: form.campaignName.trim(),
      description: form.description.trim(), tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      views: editingId ? pages.find(p => p.id === editingId)!.views : 0,
      conversions: editingId ? pages.find(p => p.id === editingId)!.conversions : 0,
      createdAt: editingId ? pages.find(p => p.id === editingId)!.createdAt : now, updatedAt: now,
    };
    if (editingId) { await update(editingId, lp as any); addToast("success", "Landing page updated"); }
    else { await create(lp as any); addToast("success", "Landing page added"); }
    setShowForm(false);
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    await remove(id);
    addToast("success", "Landing page deleted");
    if (selectedPage === id) setSelectedPage(null);
  }

  async function duplicatePage(id: string) {
    const p = pages.find(pp => pp.id === id);
    if (!p) return;
    const copy: LandingPage = { ...p, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: `${p.name} (Copy)`, views: 0, conversions: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await create(copy as any);
    addToast("success", "Landing page duplicated");
  }

  const filtered = pages.filter(p => {
    if (filterTag !== "all" && !p.tags.includes(filterTag)) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.url.toLowerCase().includes(search.toLowerCase()) && !p.campaignName.toLowerCase().includes(search.toLowerCase()) && !p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const displayed = filtered.slice(0, displayCount);
  const hasMore = displayCount < filtered.length;

  const selectedPageData = selectedPage ? pages.find(p => p.id === selectedPage) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ExternalLink className="w-6 h-6 text-n0va-400" />
            Landing Pages
          </h1>
          <p className="text-gray-400 mt-1">
            {pages.length} pages · {fmt(pages.reduce((s, p) => s + p.views, 0))} total views · {fmt(pages.reduce((s, p) => s + p.conversions, 0))} conversions
            · Avg CVR: {pages.reduce((s, p) => s + (p.views > 0 ? (p.conversions / p.views) * 100 : 0), 0) / Math.max(1, pages.filter(p => p.views > 0).length) > 0 ? pages.reduce((s, p) => s + (p.views > 0 ? (p.conversions / p.views) * 100 : 0), 0) / Math.max(1, pages.filter(p => p.views > 0).length) : 0}%
          </p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> Add Page</button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search landing pages..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1">
          <button className={`text-xs px-2 py-1 rounded border ${filterTag === "all" ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500"}`} onClick={() => setFilterTag("all")}>All</button>
          {allTags.map(t => (
            <button key={t} className={`text-xs px-2 py-1 rounded border ${filterTag === t ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500"}`} onClick={() => setFilterTag(t)}>{t}</button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Landing Page" : "Add Landing Page"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Page Name</label><input className="input" placeholder="e.g. Q3 Launch Signup" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
                <div><label className="label">Campaign</label><input className="input" placeholder="Related campaign" value={form.campaignName} onChange={e => setForm({ ...form, campaignName: e.target.value })} /></div>
              </div>
              <div><label className="label">Page URL</label><input className="input" placeholder="https://example.com/landing" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} /></div>
              <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="What's this page for?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><label className="label">Tags (comma-separated)</label><input className="input" placeholder="e.g. signup, product, launch" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Add Page"}</button></div>
            </form>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <ExternalLink className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No landing pages found</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Track and manage your campaign landing pages."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Add Page</button>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayed.map(lp => {
                  const convRate = lp.views > 0 ? ((lp.conversions / lp.views) * 100).toFixed(1) : "0.0";
                  const isSelected = selectedPage === lp.id;
                  return (
                    <div key={lp.id} className={`card p-4 cursor-pointer transition-all ${isSelected ? "border-n0va-500 ring-1 ring-n0va-500/30" : "hover:border-gray-700"}`} onClick={() => setSelectedPage(lp.id)}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-n0va-500/10 flex items-center justify-center shrink-0">
                          <Globe className="w-5 h-5 text-n0va-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white truncate">{lp.name}</h3>
                            <a href={lp.url} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-n0va-400 shrink-0" onClick={e => e.stopPropagation()}><ExternalLink className="w-3 h-3" /></a>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{lp.url}</p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {fmt(lp.views)} views</span>
                            <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {fmt(lp.conversions)} conv</span>
                            <span className={`${Number(convRate) > 5 ? "text-green-400" : Number(convRate) > 2 ? "text-yellow-400" : "text-gray-500"}`}>{convRate}%</span>
                          </div>
                          {lp.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {lp.tags.map(t => <span key={t} className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{t}</span>)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { resetForm(lp); setEditingId(lp.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => duplicatePage(lp.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><Copy className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(lp.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasMore && (
                <div className="text-center pt-2">
                  <button className="btn-secondary text-sm" onClick={() => setDisplayCount(c => c + PAGE_SIZE)}>
                    Show More ({filtered.length - displayCount} remaining)
                  </button>
                </div>
              )}
            </div>

            <div className="xl:col-span-1">
              {selectedPageData ? (
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-n0va-400" />
                    {selectedPageData.name}
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Views</p>
                        <p className="text-lg font-bold text-white">{fmt(selectedPageData.views)}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Conversions</p>
                        <p className="text-lg font-bold text-white">{fmt(selectedPageData.conversions)}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Conv. Rate</p>
                        <p className={`text-lg font-bold ${selectedPageData.views > 0 && (selectedPageData.conversions / selectedPageData.views) * 100 > 5 ? "text-green-400" : "text-yellow-400"}`}>
                          {selectedPageData.views > 0 ? ((selectedPageData.conversions / selectedPageData.views) * 100).toFixed(1) : "0.0"}%
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Campaign</p>
                        <p className="text-xs text-white font-medium truncate mt-1">{selectedPageData.campaignName || "—"}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-2">30-Day Performance Estimate</p>
                      <div className="h-28">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={Array.from({ length: 30 }, (_, i) => {
                            const d = new Date();
                            d.setDate(d.getDate() - (29 - i));
                            const avgDailyViews = selectedPageData.views / 30;
                            const avgDailyConv = selectedPageData.conversions / 30;
                            return {
                              date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                              views: Math.round(avgDailyViews * (0.5 + Math.random())),
                              conversions: Math.round(avgDailyConv * (0.5 + Math.random())),
                            };
                          })}>
                            <defs><linearGradient id="cv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b7280" }} tickCount={5} />
                            <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} />
                            <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", fontSize: "11px" }} />
                            <Area type="monotone" dataKey="views" stroke="#8b5cf6" fill="url(#cv)" strokeWidth={2} />
                            <Area type="monotone" dataKey="conversions" stroke="#22c55e" fill="none" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {selectedPageData.description && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Description</p>
                        <p className="text-xs text-gray-400">{selectedPageData.description}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <a href={selectedPageData.url} target="_blank" rel="noopener noreferrer" className="flex-1 btn-ghost text-xs flex items-center justify-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5" /> Open Page
                      </a>
                      <button onClick={() => duplicatePage(selectedPageData.id)} className="btn-secondary text-xs flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5" /> Duplicate
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card text-center py-12 text-gray-500">
                  <Target className="w-10 h-10 mx-auto mb-2 text-gray-700" />
                  <p className="text-sm">Select a landing page to see analytics</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
