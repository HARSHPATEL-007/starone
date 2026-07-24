import { useState, useEffect } from "react";
import { Crosshair, Plus, X, Edit3, Trash2, ExternalLink, Globe, TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3, Search, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "../components/Toast";

interface CompetitorAd {
  id: string;
  name: string;
  description: string;
  url: string;
  platform: string;
  observedAt: string;
}

interface Competitor {
  id: string;
  name: string;
  website: string;
  logoUrl: string;
  description: string;
  strength: string;
  weakness: string;
  position: "leader" | "challenger" | "niche" | "emerging";
  trend: "up" | "down" | "stable";
  ads: CompetitorAd[];
  createdAt: string;
}

const STORAGE_KEY = "n0va_competitive_intel";
const POSITIONS = [
  { value: "leader", label: "Market Leader", color: "text-green-400 bg-green-500/10" },
  { value: "challenger", label: "Challenger", color: "text-blue-400 bg-blue-500/10" },
  { value: "niche", label: "Niche Player", color: "text-purple-400 bg-purple-500/10" },
  { value: "emerging", label: "Emerging", color: "text-amber-400 bg-amber-500/10" },
];
const PLATFORMS = ["Google Ads", "Meta", "LinkedIn", "TikTok", "Twitter/X", "YouTube", "Programmatic", "CTV", "Print", "Other"];

const DEFAULT_COMPETITORS: Competitor[] = [
  {
    id: "comp-1", name: "AdSwift", website: "https://adswift.io", logoUrl: "",
    description: "AI-powered ad optimization platform targeting SMBs with automated campaign management.",
    strength: "Strong ML algorithms, easy onboarding, competitive pricing",
    weakness: "Limited enterprise features, no offline attribution, smaller ad network",
    position: "challenger", trend: "up",
    ads: [
      { id: "ad-1", name: "SMB Growth Campaign", description: "Facebook carousel ad targeting small business owners with '10x your ROI' messaging", url: "https://adswift.io/campaigns/smb-growth", platform: "Meta", observedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: "ad-2", name: "Free Trial Push", description: "Google Search ad 'Try AdSwift Free - No Credit Card' with landing page demo", url: "https://adswift.io/free-trial", platform: "Google Ads", observedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    ],
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: "comp-2", name: "MarketPulse", website: "https://marketpulse.com", logoUrl: "",
    description: "Enterprise marketing suite with end-to-end campaign management and analytics.",
    strength: "Comprehensive platform, Fortune 500 clientele, advanced analytics",
    weakness: "High price point, steep learning curve, slow feature releases",
    position: "leader", trend: "stable",
    ads: [
      { id: "ad-3", name: "Enterprise Webinar", description: "LinkedIn lead gen ad promoting 'The Future of Marketing Analytics' webinar with C-suite speakers", url: "https://marketpulse.com/webinars/analytics-future", platform: "LinkedIn", observedAt: new Date(Date.now() - 86400000 * 7).toISOString() },
    ],
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
  },
  {
    id: "comp-3", name: "GrowthEngine", website: "https://growthengine.co", logoUrl: "",
    description: "Growth marketing platform focused on conversion rate optimization and A/B testing.",
    strength: "Best-in-class testing tools, strong community, excellent documentation",
    weakness: "Narrow focus, no multi-channel campaigns, limited reporting",
    position: "niche", trend: "down",
    ads: [],
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
];

function load(): Competitor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COMPETITORS));
    return DEFAULT_COMPETITORS;
  } catch { return []; }
}

const positionMeta = (pos: string) => POSITIONS.find(p => p.value === pos) || POSITIONS[0];
const trendIcon: Record<string, any> = { up: TrendingUp, down: TrendingDown, stable: Minus };
const trendColor: Record<string, string> = { up: "text-green-400", down: "text-red-400", stable: "text-gray-400" };

export default function CompetitiveIntel() {
  const { addToast } = useToast();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [search, setSearch] = useState("");
  const [filterPos, setFilterPos] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdForm, setShowAdForm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", website: "", logoUrl: "", description: "", strength: "", weakness: "", position: "challenger" as Competitor["position"], trend: "stable" as Competitor["trend"] });
  const [adForm, setAdForm] = useState({ name: "", description: "", url: "", platform: "Google Ads" });

  useEffect(() => { setCompetitors(load()); }, []);

  function persist(updated: Competitor[]) {
    setCompetitors(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function toggle(id: string) {
    setExpanded(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function resetForm(c?: Competitor) {
    if (c) setForm({ name: c.name, website: c.website, logoUrl: c.logoUrl, description: c.description, strength: c.strength, weakness: c.weakness, position: c.position, trend: c.trend });
    else setForm({ name: "", website: "", logoUrl: "", description: "", strength: "", weakness: "", position: "challenger", trend: "stable" });
  }

  function handleSave() {
    if (!form.name.trim()) { addToast("error", "Competitor name is required"); return; }
    const competitor: Competitor = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: form.name.trim(),
      website: form.website.trim(),
      logoUrl: form.logoUrl.trim(),
      description: form.description.trim(),
      strength: form.strength.trim(),
      weakness: form.weakness.trim(),
      position: form.position,
      trend: form.trend,
      ads: editingId ? competitors.find(c => c.id === editingId)?.ads || [] : [],
      createdAt: editingId ? competitors.find(c => c.id === editingId)!.createdAt : new Date().toISOString(),
    };
    let updated: Competitor[];
    if (editingId) { updated = competitors.map(c => c.id === editingId ? competitor : c); addToast("success", "Competitor updated"); }
    else { updated = [competitor, ...competitors]; addToast("success", "Competitor added"); }
    persist(updated);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    const name = competitors.find(c => c.id === id)?.name;
    persist(competitors.filter(c => c.id !== id));
    addToast("success", `"${name}" removed`);
  }

  function handleAddAd(compId: string) {
    if (!adForm.name.trim()) { addToast("error", "Ad name is required"); return; }
    const ad: CompetitorAd = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: adForm.name.trim(), description: adForm.description.trim(), url: adForm.url.trim(), platform: adForm.platform, observedAt: new Date().toISOString() };
    persist(competitors.map(c => c.id === compId ? { ...c, ads: [...c.ads, ad] } : c));
    setAdForm({ name: "", description: "", url: "", platform: "Google Ads" });
    setShowAdForm(null);
    addToast("success", "Ad tracked");
  }

  function handleDeleteAd(compId: string, adId: string) {
    persist(competitors.map(c => c.id === compId ? { ...c, ads: c.ads.filter(a => a.id !== adId) } : c));
    addToast("success", "Ad removed");
  }

  const filtered = competitors.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPos !== "all" && c.position !== filterPos) return false;
    return true;
  });

  const allAds = competitors.reduce((s, c) => s + c.ads.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Crosshair className="w-6 h-6 text-n0va-400" />
            Competitive Intelligence
          </h1>
          <p className="text-gray-400 mt-1">{competitors.length} competitors · {allAds} ads tracked</p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Competitor</button>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Total Tracked</p><p className="text-2xl font-bold text-white">{competitors.length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Ads Monitored</p><p className="text-2xl font-bold text-white">{allAds}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Market Leaders</p><p className="text-2xl font-bold text-green-400">{competitors.filter(c => c.position === "leader").length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Rising</p><p className="text-2xl font-bold text-blue-400">{competitors.filter(c => c.trend === "up").length}</p></div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm" placeholder="Search competitors..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm w-auto" value={filterPos} onChange={e => setFilterPos(e.target.value)}>
          <option value="all">All Positions</option>
          {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {(search || filterPos !== "all") && <button onClick={() => { setSearch(""); setFilterPos("all"); }} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>}
      </div>

      {/* Competitor form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Competitor" : "Add Competitor"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Name</label><input className="input" placeholder="e.g. AdSwift" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
                <div><label className="label">Website</label><input className="input" placeholder="https://..." value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
              </div>
              <div><label className="label">Logo URL</label><input className="input" placeholder="https://..." value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })} /></div>
              <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="Who are they and what do they do?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Strengths</label><textarea className="input" rows={2} placeholder="What do they do well?" value={form.strength} onChange={e => setForm({ ...form, strength: e.target.value })} /></div>
                <div><label className="label">Weaknesses</label><textarea className="input" rows={2} placeholder="Where are they vulnerable?" value={form.weakness} onChange={e => setForm({ ...form, weakness: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Market Position</label><select className="input" value={form.position} onChange={e => setForm({ ...form, position: e.target.value as Competitor["position"] })}>{POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                <div><label className="label">Trend</label><select className="input" value={form.trend} onChange={e => setForm({ ...form, trend: e.target.value as Competitor["trend"] })}><option value="up">Rising</option><option value="down">Declining</option><option value="stable">Stable</option></select></div>
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Add Competitor"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Crosshair className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No competitors tracked</h3>
          <p className="text-sm text-gray-500">Add your first competitor to start monitoring.</p>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Add Competitor</button>
        </div>
      )}

      {/* Competitor cards */}
      {filtered.map(comp => {
        const isOpen = expanded.has(comp.id);
        const pm = positionMeta(comp.position);
        const TrendIcon = trendIcon[comp.trend];
        const useIcon = !comp.logoUrl;
        return (
          <div key={comp.id} className="card overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <button onClick={() => toggle(comp.id)} className="p-1 mt-1 text-gray-600 hover:text-gray-300">{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 text-lg overflow-hidden">
                  {useIcon ? <Globe className="w-5 h-5 text-gray-600" /> : <img src={comp.logoUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-semibold text-white">{comp.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${pm.color}`}>{pm.label}</span>
                    <span className={trendColor[comp.trend]}><TrendIcon className="w-4 h-4" /></span>
                    {comp.website && <a href={comp.website} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-n0va-400 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Website</a>}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{comp.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                    <span>{comp.ads.length} ad{comp.ads.length !== 1 ? "s" : ""} tracked</span>
                    {comp.strength && <span className="text-green-400/70">+ {comp.strength.split(",")[0].trim()}</span>}
                    {comp.weakness && <span className="text-red-400/70">- {comp.weakness.split(",")[0].trim()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { resetForm(comp); setEditingId(comp.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(comp.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* Expanded: SWOT + Ads */}
            {isOpen && (
              <div className="border-t border-gray-800">
                {/* SWOT */}
                <div className="grid grid-cols-2 gap-px bg-gray-800">
                  <div className="p-4 bg-n0va-900"><p className="text-xs font-medium text-green-400 mb-1">Strengths</p><p className="text-sm text-gray-300">{comp.strength || "—"}</p></div>
                  <div className="p-4 bg-n0va-900"><p className="text-xs font-medium text-red-400 mb-1">Weaknesses</p><p className="text-sm text-gray-300">{comp.weakness || "—"}</p></div>
                </div>

                {/* Ads */}
                <div className="p-4 bg-n0va-900">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-gray-400">Tracked Ads ({comp.ads.length})</p>
                    <button onClick={() => { setShowAdForm(comp.id); }} className="text-xs text-n0va-400 hover:text-n0va-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Track Ad</button>
                  </div>
                  {comp.ads.length === 0 && <p className="text-xs text-gray-600">No ads tracked yet.</p>}
                  {comp.ads.length > 0 && (
                    <div className="space-y-2">
                      {comp.ads.map(ad => (
                        <div key={ad.id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white">{ad.name}</p>
                              <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{ad.platform}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{ad.description}</p>
                            {ad.url && <a href={ad.url} target="_blank" rel="noopener noreferrer" className="text-xs text-n0va-400 hover:text-n0va-300 mt-1 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View Ad</a>}
                          </div>
                          <button onClick={() => handleDeleteAd(comp.id, ad.id)} className="p-1 text-gray-600 hover:text-red-400 mt-1"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Track Ad sub-modal */}
                {showAdForm === comp.id && (
                  <div className="p-4 border-t border-gray-800 bg-gray-800/30">
                    <form onSubmit={e => { e.preventDefault(); handleAddAd(comp.id); }} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input className="input text-sm" placeholder="Ad name" value={adForm.name} onChange={e => setAdForm({ ...adForm, name: e.target.value })} autoFocus />
                        <select className="input text-sm" value={adForm.platform} onChange={e => setAdForm({ ...adForm, platform: e.target.value })}>{PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select>
                      </div>
                      <input className="input text-sm" placeholder="Description" value={adForm.description} onChange={e => setAdForm({ ...adForm, description: e.target.value })} />
                      <input className="input text-sm" placeholder="URL (optional)" value={adForm.url} onChange={e => setAdForm({ ...adForm, url: e.target.value })} />
                      <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAdForm(null)} className="btn-secondary text-xs py-1.5">Cancel</button><button type="submit" className="btn-primary text-xs py-1.5">Track Ad</button></div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
