import { useState, useEffect } from "react";
import { BookTemplate, Plus, X, Search, Edit3, Trash2, ChevronDown, ChevronRight, BookOpen, FileText, Star, Eye, Clock, Filter, Copy, CheckCircle, ListChecks, GripVertical } from "lucide-react";
import { useToast } from "../components/Toast";

interface PlaybookSection {
  id: string;
  title: string;
  content: string;
}

interface Playbook {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  sections: PlaybookSection[];
  status: "draft" | "published" | "archived";
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "n0va_playbooks";
const CATEGORIES = [
  "Campaign Strategy", "Creative Process", "Audience Targeting", "Budget Planning",
  "Launch Procedure", "Post-Campaign Review", "Brand Guidelines", "Compliance",
  "Platform Setup", "Reporting",
];

const DEFAULT_PLAYBOOKS: Playbook[] = [
  {
    id: "pb-1", title: "Campaign Launch Playbook",
    description: "Standard operating procedure for launching a new campaign from draft to active.",
    category: "Launch Procedure", tags: ["launch", "checklist", "sop"], status: "published", favorite: true,
    sections: [
      { id: "s1", title: "Pre-Launch Checklist", content: "1. Verify all creatives are approved\n2. Confirm audience segments are built\n3. Validate budget allocation\n4. Check platform targeting settings\n5. Set up tracking and UTM parameters\n6. Review launch checklist in campaign detail" },
      { id: "s2", title: "Launch Steps", content: "1. Set campaign status to Active\n2. Monitor first-hour performance\n3. Verify delivery across all platforms\n4. Check for any tracking errors\n5. Notify team of launch" },
      { id: "s3", title: "Post-Launch Monitoring", content: "Monitor these KPIs in the first 24 hours:\n- Impression delivery rate\n- Click-through rate\n- Conversion rate\n- Budget burn rate\n- Platform distribution" },
    ],
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "pb-2", title: "Creative Brief Template",
    description: "Template for creating effective creative briefs that align with campaign goals.",
    category: "Creative Process", tags: ["creative", "brief", "template"], status: "published", favorite: true,
    sections: [
      { id: "s4", title: "Campaign Overview", content: "Campaign Name:\nObjective:\nTarget Audience:\nKey Message:\nTone of Voice:\nBudget Range:\nTimeline:" },
      { id: "s5", title: "Creative Requirements", content: "Format Requirements:\n- Display ads: 300x250, 728x90, 160x600\n- Social: 1080x1080, 1080x1350\n- Video: 16:9, 9:16\n\nBrand Elements:\n- Logo placement\n- Brand colors\n- Typography\n- CTA style" },
      { id: "s6", title: "Success Metrics", content: "Primary KPIs:\n- CTR ≥ 2%\n- Conversion rate ≥ 3%\n- Brand lift ≥ 5%\n\nSecondary KPIs:\n- Engagement rate\n- View-through rate\n- Cost per acquisition" },
    ],
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: "pb-3", title: "Budget Planning Framework",
    description: "Framework for planning and allocating campaign budgets across channels.",
    category: "Budget Planning", tags: ["budget", "planning", "allocation"], status: "draft", favorite: false,
    sections: [
      { id: "s7", title: "Budget Allocation Model", content: "Recommended allocation by channel:\n- Search: 30-40%\n- Social: 25-35%\n- Display: 15-20%\n- Video: 10-15%\n- Other: 5-10%\n\nAdjust based on historical performance and campaign objectives." },
      { id: "s8", title: "Phased Spend Strategy", content: "Phase 1 (Days 1-7): 15% of budget — Testing and optimization\nPhase 2 (Days 8-21): 50% of budget — Scale winning segments\nPhase 3 (Days 22-30): 35% of budget — Capture remaining conversions" },
    ],
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
  {
    id: "pb-4", title: "A/B Testing Best Practices",
    description: "Guidelines for setting up and analyzing A/B tests for maximum statistical significance.",
    category: "Campaign Strategy", tags: ["ab-testing", "optimization", "best-practices"], status: "published", favorite: false,
    sections: [
      { id: "s9", title: "Test Design", content: "1. Define clear hypothesis\n2. Test one variable at a time\n3. Ensure sufficient sample size\n4. Run test for minimum 7 days\n5. Avoid peeking at results" },
      { id: "s10", title: "Statistical Significance", content: "Minimum confidence level: 95%\nSample size: minimum 1,000 per variant\nWinning variant must maintain significance for 48+ hours" },
    ],
    createdAt: new Date(Date.now() - 86400000 * 35).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

function load(): Playbook[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PLAYBOOKS));
    return DEFAULT_PLAYBOOKS;
  } catch { return []; }
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function Playbooks() {
  const { addToast } = useToast();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [showFavorites, setShowFavorites] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", category: CATEGORIES[0], tags: "", status: "draft" as Playbook["status"], sections: [] as PlaybookSection[] });

  useEffect(() => { setPlaybooks(load()); }, []);

  function persist(updated: Playbook[]) {
    setPlaybooks(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function toggle(id: string) {
    setExpanded(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleFavorite(id: string) {
    persist(playbooks.map(p => p.id === id ? { ...p, favorite: !p.favorite } : p));
  }

  function resetForm(pb?: Playbook) {
    if (pb) setForm({ title: pb.title, description: pb.description, category: pb.category, tags: pb.tags.join(", "), status: pb.status, sections: pb.sections.map(s => ({ ...s })) });
    else setForm({ title: "", description: "", category: CATEGORIES[0], tags: "", status: "draft", sections: [] });
  }

  function addSection() {
    setForm(f => ({ ...f, sections: [...f.sections, { id: Date.now().toString(36), title: "", content: "" }] }));
  }

  function updateSection(id: string, field: keyof PlaybookSection, value: string) {
    setForm(f => ({ ...f, sections: f.sections.map(s => s.id === id ? { ...s, [field]: value } : s) }));
  }

  function removeSection(id: string) {
    setForm(f => ({ ...f, sections: f.sections.filter(s => s.id !== id) }));
  }

  function handleSave() {
    if (!form.title.trim()) { addToast("error", "Playbook title is required"); return; }
    const validSections = form.sections.filter(s => s.title.trim());
    const now = new Date().toISOString();
    const playbook: Playbook = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      sections: validSections.map(s => ({ ...s, id: s.id || Date.now().toString(36) })),
      status: form.status,
      favorite: editingId ? playbooks.find(p => p.id === editingId)?.favorite ?? false : false,
      createdAt: editingId ? playbooks.find(p => p.id === editingId)!.createdAt : now,
      updatedAt: now,
    };
    let updated: Playbook[];
    if (editingId) { updated = playbooks.map(p => p.id === editingId ? playbook : p); addToast("success", "Playbook updated"); }
    else { updated = [playbook, ...playbooks]; addToast("success", "Playbook created"); }
    persist(updated);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    const name = playbooks.find(p => p.id === id)?.title;
    persist(playbooks.filter(p => p.id !== id));
    if (viewingId === id) setViewingId(null);
    addToast("success", `"${name}" deleted`);
  }

  function duplicatePlaybook(id: string) {
    const pb = playbooks.find(p => p.id === id);
    if (!pb) return;
    const copy: Playbook = {
      ...pb, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: `${pb.title} (Copy)`, status: "draft", favorite: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    persist([copy, ...playbooks]);
    addToast("success", "Playbook duplicated");
  }

  let filtered = playbooks;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)) || p.category.toLowerCase().includes(q));
  }
  if (filterStatus !== "all") filtered = filtered.filter(p => p.status === filterStatus);
  if (filterCat !== "all") filtered = filtered.filter(p => p.category === filterCat);
  if (showFavorites) filtered = filtered.filter(p => p.favorite);

  const categories = [...new Set(playbooks.map(p => p.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BookTemplate className="w-6 h-6 text-n0va-400" />
            Campaign Playbooks
          </h1>
          <p className="text-gray-400 mt-1">{playbooks.length} playbooks · {playbooks.filter(p => p.status === "published").length} published</p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Playbook</button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm" placeholder="Search playbooks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select className="input text-sm w-auto" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setShowFavorites(!showFavorites)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showFavorites ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "border-gray-800 text-gray-500 hover:text-gray-300"}`}>
          <Star className="w-3 h-3 inline mr-1" /> Favorites
        </button>
        {(search || filterStatus !== "all" || filterCat !== "all" || showFavorites) && (
          <button onClick={() => { setSearch(""); setFilterStatus("all"); setFilterCat("all"); setShowFavorites(false); }} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Playbook" : "New Playbook"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="label">Title</label><input className="input" placeholder="e.g. Campaign Launch Playbook" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus /></div>
              </div>
              <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="What is this playbook for?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Category</label><select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="label">Status</label><select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Playbook["status"] })}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
              </div>
              <div><label className="label">Tags (comma-separated)</label><input className="input" placeholder="e.g. launch, checklist, sop" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
              <div>
                <div className="flex items-center justify-between mb-2"><label className="label mb-0">Sections</label><button type="button" onClick={addSection} className="text-xs text-n0va-400 hover:text-n0va-300">+ Add Section</button></div>
                {form.sections.length === 0 && <p className="text-xs text-gray-600 py-2">No sections yet. Sections are the building blocks of your playbook.</p>}
                <div className="space-y-3">
                  {form.sections.map((sec, i) => (
                    <div key={sec.id} className="p-3 bg-n0va-900 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 font-mono">{i + 1}.</span>
                        <input className="input text-sm flex-1" placeholder="Section title" value={sec.title} onChange={e => updateSection(sec.id, "title", e.target.value)} />
                        <button type="button" onClick={() => removeSection(sec.id)} className="p-1 text-gray-600 hover:text-red-400"><X className="w-4 h-4" /></button>
                      </div>
                      <textarea className="input text-sm w-full" rows={3} placeholder="Section content..." value={sec.content} onChange={e => updateSection(sec.id, "content", e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Playbook"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewingId && (() => {
        const pb = playbooks.find(p => p.id === viewingId);
        if (!pb) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setViewingId(null)}>
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-n0va-800 border-b border-gray-800 p-6 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-white">{pb.title}</h2>
                      <button onClick={() => toggleFavorite(pb.id)} className={`p-1 ${pb.favorite ? "text-amber-400" : "text-gray-600 hover:text-amber-400"}`}><Star className="w-4 h-4" /></button>
                    </div>
                    <p className="text-sm text-gray-500">{pb.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${pb.status === "published" ? "bg-green-500/10 text-green-400" : pb.status === "draft" ? "bg-amber-500/10 text-amber-400" : "bg-gray-500/10 text-gray-400"}`}>{pb.status}</span>
                      <span className="text-xs text-gray-600">{pb.category}</span>
                      <span className="text-xs text-gray-600">{pb.sections.length} sections</span>
                      <span className="text-xs text-gray-600">Updated {timeAgo(pb.updatedAt)}</span>
                    </div>
                  </div>
                  <button onClick={() => setViewingId(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {pb.sections.map((sec, i) => (
                  <div key={sec.id}>
                    <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2"><ListChecks className="w-4 h-4 text-n0va-400" /> {sec.title || `Section ${i + 1}`}</h3>
                    <div className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">{sec.content}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <BookTemplate className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No playbooks found</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Create your first playbook to document your processes."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Playbook</button>}
        </div>
      )}

      {/* Playbook cards */}
      {filtered.map(pb => {
        const isOpen = expanded.has(pb.id);
        return (
          <div key={pb.id} className="card overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <button onClick={() => toggle(pb.id)} className="p-1 mt-1 text-gray-600 hover:text-gray-300">{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-semibold text-white">{pb.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${pb.status === "published" ? "bg-green-500/10 text-green-400" : pb.status === "draft" ? "bg-amber-500/10 text-amber-400" : "bg-gray-500/10 text-gray-400"}`}>{pb.status}</span>
                    {pb.favorite && <Star className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{pb.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                    <span>{pb.category}</span>
                    <span>{pb.sections.length} section{pb.sections.length !== 1 ? "s" : ""}</span>
                    <span>Updated {timeAgo(pb.updatedAt)}</span>
                    {pb.tags.length > 0 && pb.tags.slice(0, 3).map(t => <span key={t} className="bg-gray-800 px-1.5 py-0.5 rounded text-[10px]">{t}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setViewingId(pb.id)} className="p-1.5 text-gray-600 hover:text-n0va-400"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => toggleFavorite(pb.id)} className={`p-1.5 ${pb.favorite ? "text-amber-400" : "text-gray-600 hover:text-amber-400"}`}><Star className="w-4 h-4" /></button>
                  <button onClick={() => duplicatePlaybook(pb.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><Copy className="w-4 h-4" /></button>
                  <button onClick={() => { resetForm(pb); setEditingId(pb.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(pb.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Expandable sections */}
              {isOpen && (
                <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                  {pb.sections.map((sec, i) => (
                    <div key={sec.id} className="pl-4 border-l-2 border-gray-800">
                      <p className="text-sm font-medium text-white flex items-center gap-2"><ListChecks className="w-3.5 h-3.5 text-n0va-400" /> {sec.title || `Section ${i + 1}`}</p>
                      <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap line-clamp-2">{sec.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
