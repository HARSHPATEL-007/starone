import { useState, useEffect } from "react";
import { ExternalLink, Plus, X, Edit3, Trash2, Copy, Search, Globe, Eye, Calendar, BarChart3, Smartphone, Monitor, Link2, MousePointerClick } from "lucide-react";
import { useToast } from "../components/Toast";

interface LandingPage {
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

const STORAGE_KEY = "n0va_landing_pages";

const DEFAULT_PAGES: LandingPage[] = [
  { id: "lp-1", name: "Product Launch Q3 - Signup", url: "https://example.com/launch-q3", campaignName: "Product Launch Q3", description: "Early access signup page for Q3 product launch", tags: ["signup", "product", "launch"], views: 12450, conversions: 890, createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "lp-2", name: "Summer Sale - Main Offer", url: "https://example.com/summer-sale", campaignName: "Summer Sale 2025", description: "Landing page for summer promotional campaign", tags: ["sale", "seasonal", "promo"], views: 28300, conversions: 1450, createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "lp-3", name: "Enterprise Demo Request", url: "https://example.com/demo", campaignName: "Enterprise Q3", description: "Enterprise demo booking with case study highlights", tags: ["demo", "enterprise", "b2b"], views: 5200, conversions: 620, createdAt: new Date(Date.now() - 86400000 * 15).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: "lp-4", name: "Webinar Registration", url: "https://example.com/webinar-aug", campaignName: "Webinar Series", description: "Registration page for August product webinar", tags: ["webinar", "event", "registration"], views: 3800, conversions: 1100, createdAt: new Date(Date.now() - 86400000 * 12).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: "lp-5", name: "Holiday Campaign 2025", url: "https://example.com/holiday", campaignName: "Holiday 2025", description: "Main holiday season campaign landing page", tags: ["holiday", "seasonal", "gifts"], views: 0, conversions: 0, createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
];

function load(): LandingPage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PAGES));
    return DEFAULT_PAGES;
  } catch { return []; }
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function LandingPages() {
  const { addToast } = useToast();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "", campaignName: "", description: "", tags: "", views: 0, conversions: 0 });

  useEffect(() => { setPages(load()); }, []);

  function persist(updated: LandingPage[]) {
    setPages(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function resetForm(lp?: LandingPage) {
    if (lp) setForm({ name: lp.name, url: lp.url, campaignName: lp.campaignName, description: lp.description, tags: lp.tags.join(", "), views: lp.views, conversions: lp.conversions });
    else setForm({ name: "", url: "", campaignName: "", description: "", tags: "", views: 0, conversions: 0 });
  }

  function handleSave() {
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
    let updated: LandingPage[];
    if (editingId) { updated = pages.map(p => p.id === editingId ? lp : p); addToast("success", "Landing page updated"); }
    else { updated = [lp, ...pages]; addToast("success", "Landing page added"); }
    persist(updated);
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const name = pages.find(p => p.id === id)?.name;
    persist(pages.filter(p => p.id !== id));
    addToast("success", `"${name}" deleted`);
  }

  function incrementViews(id: string) {
    persist(pages.map(p => p.id === id ? { ...p, views: p.views + 1 } : p));
  }

  function duplicatePage(id: string) {
    const p = pages.find(pp => pp.id === id);
    if (!p) return;
    const copy: LandingPage = { ...p, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: `${p.name} (Copy)`, views: 0, conversions: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    persist([copy, ...pages]);
    addToast("success", "Landing page duplicated");
  }

  const filtered = pages.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.url.toLowerCase().includes(search.toLowerCase()) || p.campaignName.toLowerCase().includes(search.toLowerCase()) || p.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ExternalLink className="w-6 h-6 text-n0va-400" />
            Landing Pages
          </h1>
          <p className="text-gray-400 mt-1">{pages.length} pages · {pages.reduce((s, p) => s + p.views, 0).toLocaleString()} total views · {pages.reduce((s, p) => s + p.conversions, 0).toLocaleString()} conversions</p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> Add Page</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search landing pages..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Form modal */}
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

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <ExternalLink className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No landing pages found</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Track and manage your campaign landing pages."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Add Page</button>}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(lp => {
          const convRate = lp.views > 0 ? ((lp.conversions / lp.views) * 100).toFixed(1) : "0.0";
          return (
            <div key={lp.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-n0va-500/10 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-n0va-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white truncate">{lp.name}</h3>
                    <a href={lp.url} target="_blank" rel="noopener noreferrer" onClick={() => incrementViews(lp.id)} className="text-gray-600 hover:text-n0va-400"><ExternalLink className="w-3 h-3" /></a>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{lp.url}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {fmt(lp.views)} views</span>
                    <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {fmt(lp.conversions)} conv</span>
                    <span className={`${Number(convRate) > 5 ? "text-green-400" : "text-gray-500"}`}>{convRate}%</span>
                  </div>
                  {lp.campaignName && <p className="text-[10px] text-gray-700 mt-1">{lp.campaignName}</p>}
                  {lp.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {lp.tags.map(t => <span key={t} className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{t}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => { resetForm(lp); setEditingId(lp.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => duplicatePage(lp.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(lp.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
