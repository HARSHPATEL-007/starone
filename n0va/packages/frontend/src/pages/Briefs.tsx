import { useState, useEffect } from "react";
import { FileText, Plus, X, Edit3, Trash2, Copy, Search, Calendar, User, Target, DollarSign, BarChart3, Megaphone, Globe, CheckCircle, Clock } from "lucide-react";
import { useToast } from "../components/Toast";

type BriefStatus = "draft" | "in_review" | "approved" | "archived";
type BriefObjective = "awareness" | "consideration" | "conversion" | "retention" | "engagement" | "other";

interface Brief {
  id: string;
  title: string;
  campaignName: string;
  objective: BriefObjective;
  status: BriefStatus;
  targetAudience: string;
  keyMessage: string;
  channels: string[];
  budget: number;
  startDate: string;
  endDate: string;
  creativeBrief: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "n0va_briefs";

const OBJECTIVES: { value: BriefObjective; label: string; icon: any; color: string }[] = [
  { value: "awareness", label: "Awareness", icon: Globe, color: "text-blue-400 bg-blue-500/10" },
  { value: "consideration", label: "Consideration", icon: Target, color: "text-cyan-400 bg-cyan-500/10" },
  { value: "conversion", label: "Conversion", icon: DollarSign, color: "text-green-400 bg-green-500/10" },
  { value: "retention", label: "Retention", icon: CheckCircle, color: "text-purple-400 bg-purple-500/10" },
  { value: "engagement", label: "Engagement", icon: BarChart3, color: "text-amber-400 bg-amber-500/10" },
  { value: "other", label: "Other", icon: FileText, color: "text-gray-400 bg-gray-500/10" },
];

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-600 text-gray-200" },
  in_review: { label: "In Review", color: "bg-yellow-500/20 text-yellow-400" },
  approved: { label: "Approved", color: "bg-green-500/20 text-green-400" },
  archived: { label: "Archived", color: "bg-gray-800 text-gray-500" },
};

const CHANNEL_OPTIONS = ["Google Ads", "Facebook", "Instagram", "LinkedIn", "Twitter/X", "TikTok", "YouTube", "Email", "Display", "Programmatic", "TV", "Radio", "Print", "Podcast", "SMS", "Affiliate", "SEO", "Organic Social"];

const DEFAULT_BRIEFS: Brief[] = [
  { id: "br-1", title: "Q3 Product Launch Campaign", campaignName: "Product Launch Q3", objective: "conversion", status: "approved", targetAudience: "Tech-savvy professionals 25-45", keyMessage: "Revolutionary features for modern workflows", channels: ["Google Ads", "LinkedIn", "YouTube"], budget: 125000, startDate: "2025-07-01", endDate: "2025-09-30", creativeBrief: "Focus on product demos and customer testimonials. Use clean, modern visuals with emphasis on time-saving features.", createdAt: new Date(Date.now() - 86400000 * 25).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "br-2", title: "Summer Sale Brand Awareness", campaignName: "Summer Sale 2025", objective: "awareness", status: "in_review", targetAudience: "Consumers 18-35 interested in lifestyle products", keyMessage: "Summer vibes at unbeatable prices", channels: ["Instagram", "TikTok", "Facebook"], budget: 75000, startDate: "2025-06-15", endDate: "2025-08-15", creativeBrief: "Bright, sunny aesthetics. User-generated content style. Short-form video emphasis for TikTok and Reels.", createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: "br-3", title: "Customer Retention Email Series", campaignName: "Loyalty Program Q3", objective: "retention", status: "draft", targetAudience: "Existing customers with 6+ months tenure", keyMessage: "You're valued — exclusive perks inside", channels: ["Email", "SMS"], budget: 15000, startDate: "2025-07-15", endDate: "2025-09-15", creativeBrief: "Warm, personal tone. Include loyalty points summary and exclusive offers. A/B test subject lines.", createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "br-4", title: "Enterprise Lead Gen Campaign", campaignName: "Enterprise Q3", objective: "consideration", status: "approved", targetAudience: "B2B decision-makers in IT and Operations", keyMessage: "Scale your infrastructure with zero friction", channels: ["LinkedIn", "Google Ads", "Programmatic"], budget: 200000, startDate: "2025-07-01", endDate: "2025-12-31", creativeBrief: "Professional, data-driven. Case studies and whitepapers as lead magnets. Focus on ROI and efficiency.", createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 7).toISOString() },
];

function load(): Brief[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BRIEFS));
    return DEFAULT_BRIEFS;
  } catch { return []; }
}

export default function Briefs() {
  const { addToast } = useToast();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<BriefStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [form, setForm] = useState<Brief>({
    id: "", title: "", campaignName: "", objective: "awareness", status: "draft",
    targetAudience: "", keyMessage: "", channels: [], budget: 0,
    startDate: "", endDate: "", creativeBrief: "", createdAt: "", updatedAt: "",
  });

  useEffect(() => { setBriefs(load()); }, []);

  function persist(updated: Brief[]) {
    setBriefs(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function resetForm(b?: Brief) {
    if (b) setForm({ ...b, channels: [...b.channels] });
    else setForm({ id: "", title: "", campaignName: "", objective: "awareness", status: "draft", targetAudience: "", keyMessage: "", channels: [], budget: 0, startDate: "", endDate: "", creativeBrief: "", createdAt: "", updatedAt: "" });
  }

  function toggleChannel(ch: string) {
    setForm(f => ({ ...f, channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch] }));
  }

  function handleSave() {
    if (!form.title.trim() || !form.campaignName.trim()) { addToast("error", "Title and campaign name are required"); return; }
    const now = new Date().toISOString();
    const brief: Brief = { ...form, title: form.title.trim(), campaignName: form.campaignName.trim(), id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6), createdAt: editingId ? briefs.find(b => b.id === editingId)!.createdAt : now, updatedAt: now };
    let updated: Brief[];
    if (editingId) { updated = briefs.map(b => b.id === editingId ? brief : b); addToast("success", "Brief updated"); }
    else { updated = [brief, ...briefs]; addToast("success", "Brief created"); }
    persist(updated);
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const name = briefs.find(b => b.id === id)?.title;
    persist(briefs.filter(b => b.id !== id));
    addToast("success", `"${name}" deleted`);
    if (viewingId === id) setViewingId(null);
  }

  function duplicateBrief(id: string) {
    const b = briefs.find(b => b.id === id);
    if (!b) return;
    const copy: Brief = { ...b, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: `${b.title} (Copy)`, status: "draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    persist([copy, ...briefs]);
    addToast("success", "Brief duplicated");
  }

  const filtered = briefs.filter(b => {
    if (filterStatus !== "all" && b.status !== filterStatus) return false;
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.campaignName.toLowerCase().includes(search.toLowerCase()) && !b.keyMessage.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const viewingBrief = viewingId ? briefs.find(b => b.id === viewingId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-6 h-6 text-n0va-400" />
            Campaign Briefs
          </h1>
          <p className="text-gray-400 mt-1">{briefs.length} briefs · {briefs.filter(b => b.status === "approved").length} approved · {briefs.filter(b => b.status === "draft").length} drafts</p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Brief</button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search briefs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input py-2 text-sm w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value as BriefStatus | "all")}>
          <option value="all">All Status</option>
          <option value="draft">Drafts</option>
          <option value="in_review">In Review</option>
          <option value="approved">Approved</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Brief" : "New Campaign Brief"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Brief Title</label><input className="input" placeholder="e.g. Q3 Product Launch" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus /></div>
                <div><label className="label">Campaign Name</label><input className="input" placeholder="e.g. Product Launch Q3" value={form.campaignName} onChange={e => setForm({ ...form, campaignName: e.target.value })} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Objective</label>
                  <div className="flex flex-wrap gap-1.5">
                    {OBJECTIVES.map(o => (
                      <button type="button" key={o.value} onClick={() => setForm({ ...form, objective: o.value })} className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded border ${form.objective === o.value ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400"}`}>
                        <o.icon className="w-3 h-3" /> {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div><label className="label">Status</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["draft", "in_review", "approved", "archived"].map(s => (
                      <button type="button" key={s} onClick={() => setForm({ ...form, status: s as BriefStatus })} className={`text-[11px] px-2.5 py-1 rounded border ${form.status === s ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400"}`}>{STATUS_META[s].label}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div><label className="label">Target Audience</label><input className="input" placeholder="e.g. B2B decision-makers in IT" value={form.targetAudience} onChange={e => setForm({ ...form, targetAudience: e.target.value })} /></div>
              <div><label className="label">Key Message</label><textarea className="input" rows={2} placeholder="Core message..." value={form.keyMessage} onChange={e => setForm({ ...form, keyMessage: e.target.value })} /></div>
              <div><label className="label">Channels</label>
                <div className="flex flex-wrap gap-1.5">
                  {CHANNEL_OPTIONS.map(ch => (
                    <button type="button" key={ch} onClick={() => toggleChannel(ch)} className={`text-[11px] px-2 py-1 rounded border ${form.channels.includes(ch) ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-300"}`}>{ch}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Budget ($)</label><input className="input" type="number" min="0" value={form.budget} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} /></div>
                <div><label className="label">Start Date</label><input className="input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                <div><label className="label">End Date</label><input className="input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
              </div>
              <div><label className="label">Creative Brief</label><textarea className="input" rows={3} placeholder="Direction for creative team..." value={form.creativeBrief} onChange={e => setForm({ ...form, creativeBrief: e.target.value })} /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Brief"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* View detail modal */}
      {viewingBrief && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setViewingId(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{viewingBrief.title}</h3>
              <button onClick={() => setViewingId(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Campaign</span><p className="text-white">{viewingBrief.campaignName}</p></div>
                <div><span className="text-gray-500">Status</span><p><span className={`inline-block text-[11px] px-2 py-0.5 rounded ${STATUS_META[viewingBrief.status].color}`}>{STATUS_META[viewingBrief.status].label}</span></p></div>
                <div><span className="text-gray-500">Objective</span><p className="text-white">{OBJECTIVES.find(o => o.value === viewingBrief.objective)?.label || viewingBrief.objective}</p></div>
                <div><span className="text-gray-500">Budget</span><p className="text-white">${viewingBrief.budget.toLocaleString()}</p></div>
                <div><span className="text-gray-500">Target Audience</span><p className="text-white">{viewingBrief.targetAudience}</p></div>
                <div><span className="text-gray-500">Duration</span><p className="text-white">{viewingBrief.startDate} → {viewingBrief.endDate}</p></div>
              </div>
              <div><span className="text-sm text-gray-500">Key Message</span><p className="text-white text-sm mt-1">{viewingBrief.keyMessage}</p></div>
              <div><span className="text-sm text-gray-500">Channels</span><div className="flex flex-wrap gap-1.5 mt-1">{viewingBrief.channels.map(ch => <span key={ch} className="text-[11px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-gray-700">{ch}</span>)}</div></div>
              <div><span className="text-sm text-gray-500">Creative Brief</span><p className="text-white text-sm mt-1 whitespace-pre-wrap">{viewingBrief.creativeBrief}</p></div>
              <div className="text-xs text-gray-600">Created {new Date(viewingBrief.createdAt).toLocaleDateString()} · Updated {new Date(viewingBrief.updatedAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <FileText className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No briefs found</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Create your first campaign brief to align your team."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Brief</button>}
        </div>
      )}

      {/* Brief cards */}
      {filtered.map(b => {
        const sm = STATUS_META[b.status];
        return (
          <div key={b.id} className="card p-5">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-base font-semibold text-white cursor-pointer hover:text-n0va-400" onClick={() => setViewingId(b.id)}>{b.title}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sm.color}`}>{sm.label}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Campaign: {b.campaignName}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 flex-wrap">
                  <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {OBJECTIVES.find(o => o.value === b.objective)?.label}</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${b.budget.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {b.startDate} → {b.endDate}</span>
                  {b.channels.length > 0 && <span className="flex items-center gap-1"><Megaphone className="w-3 h-3" /> {b.channels.slice(0, 3).join(", ")}{b.channels.length > 3 ? ` +${b.channels.length - 3}` : ""}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setViewingId(b.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><BarChart3 className="w-4 h-4" /></button>
                <button onClick={() => duplicateBrief(b.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><Copy className="w-4 h-4" /></button>
                <button onClick={() => { resetForm(b); setEditingId(b.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(b.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
