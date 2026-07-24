import { useState, useEffect } from "react";
import { BookOpen, Plus, X, Edit3, Trash2, Copy, Search, Download, Users, Eye, BarChart3, Globe, DollarSign, Smartphone, Monitor, Target, Share2 } from "lucide-react";
import { useToast } from "../components/Toast";

interface MediaKitSection {
  id: string;
  title: string;
  content: string;
}

interface MediaKit {
  id: string;
  brandName: string;
  tagline: string;
  description: string;
  website: string;
  logoUrl: string;
  sections: MediaKitSection[];
  audience: string;
  reach: number;
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "n0va_media_kits";

const DEFAULT_KITS: MediaKit[] = [
  {
    id: "mk-1", brandName: "N0VA", tagline: "AI-Powered Marketing Platform",
    description: "N0VA is the all-in-one marketing platform that helps businesses create, manage, and optimize campaigns with AI-powered insights and automation.",
    website: "https://n0va.ai", logoUrl: "",
    sections: [
      { id: "mks-1", title: "About Us", content: "Founded in 2024, N0VA has grown to serve over 10,000 marketing teams worldwide. Our platform combines AI-driven analytics, campaign automation, and cross-channel optimization to deliver measurable results." },
      { id: "mks-2", title: "Key Features", content: "• AI Campaign Optimization\n• Cross-Channel Analytics\n• Automated Workflows\n• Audience Segmentation\n• Creative Testing & Optimization\n• Real-time Reporting" },
      { id: "mks-3", title: "Press Contact", content: "Media Relations\npress@n0va.ai\n1-800-N0VA-HELP" },
    ],
    audience: "Marketing professionals, agencies, enterprise marketing teams", reach: 50000, categories: ["Marketing Technology", "AI/ML", "SaaS"],
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "mk-2", brandName: "StarOne", tagline: "Next-Gen Creative Suite",
    description: "StarOne empowers creative teams to design, preview, and deploy stunning ad creatives across all digital platforms.",
    website: "https://starone.io", logoUrl: "",
    sections: [
      { id: "mks-4", title: "About StarOne", content: "StarOne is a creative technology company focused on transforming how marketing teams design and deploy advertising creatives." },
      { id: "mks-5", title: "Audience Demographics", content: "Primary: Creative directors, marketing managers\nAge: 25-54\nIndustries: Advertising, marketing, media, technology" },
    ],
    audience: "Creative teams, ad agencies, brand managers", reach: 25000, categories: ["Creative Tech", "Design", "AdTech"],
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

function load(): MediaKit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_KITS));
    return DEFAULT_KITS;
  } catch { return []; }
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function MediaKit() {
  const { addToast } = useToast();
  const [kits, setKits] = useState<MediaKit[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ brandName: string; tagline: string; description: string; website: string; logoUrl: string; sections: MediaKitSection[]; audience: string; reach: number; categories: string }>({
    brandName: "", tagline: "", description: "", website: "", logoUrl: "", sections: [], audience: "", reach: 0, categories: "",
  });

  useEffect(() => { setKits(load()); }, []);

  function persist(updated: MediaKit[]) {
    setKits(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function resetForm(k?: MediaKit) {
    if (k) setForm({ brandName: k.brandName, tagline: k.tagline, description: k.description, website: k.website, logoUrl: k.logoUrl, sections: k.sections.map(s => ({ ...s })), audience: k.audience, reach: k.reach, categories: k.categories.join(", ") });
    else setForm({ brandName: "", tagline: "", description: "", website: "", logoUrl: "", sections: [], audience: "", reach: 0, categories: "" });
  }

  function addSection() {
    setForm(f => ({ ...f, sections: [...f.sections, { id: Date.now().toString(36), title: "", content: "" }] }));
  }

  function updateSection(id: string, field: keyof MediaKitSection, value: string) {
    setForm(f => ({ ...f, sections: f.sections.map(s => s.id === id ? { ...s, [field]: value } : s) }));
  }

  function removeSection(id: string) {
    setForm(f => ({ ...f, sections: f.sections.filter(s => s.id !== id) }));
  }

  function handleSave() {
    if (!form.brandName.trim()) { addToast("error", "Brand name is required"); return; }
    const validSections = form.sections.filter(s => s.title.trim()).map(s => ({ ...s, title: s.title.trim(), content: s.content.trim() }));
    const now = new Date().toISOString();
    const kit: MediaKit = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      brandName: form.brandName.trim(), tagline: form.tagline.trim(), description: form.description.trim(),
      website: form.website.trim(), logoUrl: form.logoUrl.trim(), sections: validSections,
      audience: form.audience.trim(), reach: form.reach, categories: form.categories.split(",").map(c => c.trim()).filter(Boolean),
      createdAt: editingId ? kits.find(k => k.id === editingId)!.createdAt : now, updatedAt: now,
    };
    let updated: MediaKit[];
    if (editingId) { updated = kits.map(k => k.id === editingId ? kit : k); addToast("success", "Media kit updated"); }
    else { updated = [kit, ...kits]; addToast("success", "Media kit created"); }
    persist(updated);
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const name = kits.find(k => k.id === id)?.brandName;
    persist(kits.filter(k => k.id !== id));
    if (viewingId === id) setViewingId(null);
    addToast("success", `"${name}" deleted`);
  }

  function exportKit(id: string) {
    const kit = kits.find(k => k.id === id);
    if (!kit) return;
    const content = `# ${kit.brandName}\n${kit.tagline}\n\n${kit.description}\n\nWebsite: ${kit.website}\nAudience: ${kit.audience}\nReach: ${fmt(kit.reach)}\n\n${kit.sections.map(s => `## ${s.title}\n${s.content}`).join("\n\n")}`;
    const blob = new Blob([content], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${kit.brandName.toLowerCase().replace(/\s+/g, "-")}-media-kit.md`; a.click();
    URL.revokeObjectURL(blob);
    addToast("success", "Media kit exported as Markdown");
  }

  const filtered = kits.filter(k => !search || k.brandName.toLowerCase().includes(search.toLowerCase()) || k.description.toLowerCase().includes(search.toLowerCase()) || k.categories.some(c => c.toLowerCase().includes(search.toLowerCase())));

  const viewingKit = viewingId ? kits.find(k => k.id === viewingId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-n0va-400" />
            Media Kit Builder
          </h1>
          <p className="text-gray-400 mt-1">{kits.length} media kits</p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Media Kit</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search media kits..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Builder modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Media Kit" : "New Media Kit"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Brand Name</label><input className="input" placeholder="e.g. N0VA" value={form.brandName} onChange={e => setForm({ ...form, brandName: e.target.value })} autoFocus /></div>
                <div><label className="label">Tagline</label><input className="input" placeholder="e.g. AI-Powered Marketing" value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} /></div>
              </div>
              <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="Brand description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Website</label><input className="input" placeholder="https://example.com" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
                <div><label className="label">Logo URL</label><input className="input" placeholder="https://example.com/logo.png" value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Target Audience</label><input className="input" placeholder="Who do you reach?" value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} /></div>
                <div><label className="label">Monthly Reach</label><input className="input" type="number" min="0" value={form.reach} onChange={e => setForm({ ...form, reach: Number(e.target.value) })} /></div>
              </div>
              <div><label className="label">Categories (comma-separated)</label><input className="input" placeholder="e.g. SaaS, AI, Marketing" value={form.categories} onChange={e => setForm({ ...form, categories: e.target.value })} /></div>
              <div><div className="flex items-center justify-between mb-2"><label className="label mb-0">Sections</label><button type="button" onClick={addSection} className="text-xs text-n0va-400 hover:text-n0va-300">+ Add Section</button></div>
                {form.sections.length === 0 && <p className="text-xs text-gray-600 py-2">Add sections to your media kit (About, Features, Contact, etc.)</p>}
                {form.sections.map(s => (
                  <div key={s.id} className="bg-n0va-900 rounded-lg p-3 mb-2 border border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <input className="input text-xs py-1 flex-1" placeholder="Section title" value={s.title} onChange={e => updateSection(s.id, "title", e.target.value)} />
                      <button type="button" onClick={() => removeSection(s.id)} className="p-1 text-gray-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                    <textarea className="input text-xs py-1.5 w-full" rows={3} placeholder="Section content..." value={s.content} onChange={e => updateSection(s.id, "content", e.target.value)} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Media Kit"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewingKit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setViewingId(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl p-8" onClick={e => e.stopPropagation()} style={{ color: "#111" }}>
            <div className="flex items-center justify-between mb-6">
              <div><h2 className="text-2xl font-bold">{viewingKit.brandName}</h2><p className="text-gray-600">{viewingKit.tagline}</p></div>
              <button onClick={() => setViewingId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-gray-700 mb-6">{viewingKit.description}</p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Website</p><p className="text-sm font-medium text-n0va-600">{viewingKit.website.replace("https://", "")}</p></div>
              <div className="bg-gray-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Audience</p><p className="text-sm font-medium text-gray-800">{viewingKit.audience.slice(0, 30)}{viewingKit.audience.length > 30 ? "..." : ""}</p></div>
              <div className="bg-gray-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Monthly Reach</p><p className="text-sm font-semibold text-gray-800">{fmt(viewingKit.reach)}</p></div>
            </div>
            {viewingKit.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-6">{viewingKit.categories.map(c => <span key={c} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{c}</span>)}</div>
            )}
            {viewingKit.sections.map(s => (
              <div key={s.id} className="mb-4">
                <h3 className="text-lg font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.content}</p>
              </div>
            ))}
            <p className="text-[10px] text-gray-400 mt-6">Updated {new Date(viewingKit.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <BookOpen className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No media kits yet</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Build media kits for press and partner outreach."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Media Kit</button>}
        </div>
      )}

      {/* Cards */}
      {filtered.map(k => (
        <div key={k.id} className="card p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-n0va-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {k.brandName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white cursor-pointer hover:text-n0va-400" onClick={() => setViewingId(k.id)}>{k.brandName}</h3>
              <p className="text-xs text-gray-500">{k.tagline}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-600 flex-wrap">
                <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Reach: {fmt(k.reach)}</span>
                <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{k.website.replace("https://", "").slice(0, 25)}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{k.audience.slice(0, 25)}{k.audience.length > 25 ? "..." : ""}</span>
              </div>
              {k.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">{k.categories.map(c => <span key={c} className="text-[9px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">{c}</span>)}</div>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => exportKit(k.id)} className="p-1.5 text-gray-600 hover:text-gray-300" title="Export Markdown"><Download className="w-3.5 h-3.5" /></button>
              <button onClick={() => { resetForm(k); setEditingId(k.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDelete(k.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
