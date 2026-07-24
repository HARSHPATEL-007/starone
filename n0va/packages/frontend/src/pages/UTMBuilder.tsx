import { useState, useEffect } from "react";
import { Link2, Copy, Check, Trash2, Plus, X, Search, ExternalLink, Clock, Hash, Globe, Mail, Smartphone, ShoppingCart, Share2 } from "lucide-react";
import { useToast } from "../components/Toast";

interface UTMLink {
  id: string;
  name: string;
  url: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  fullUrl: string;
  createdAt: string;
  clicks: number;
}

const STORAGE_KEY = "n0va_utm_links";
const PRESETS = [
  { label: "Google Ads", source: "google", medium: "cpc", campaign: "", term: "", content: "" },
  { label: "Facebook", source: "facebook", medium: "social", campaign: "", term: "", content: "" },
  { label: "LinkedIn", source: "linkedin", medium: "social", campaign: "", term: "", content: "" },
  { label: "Twitter/X", source: "twitter", medium: "social", campaign: "", term: "", content: "" },
  { label: "Email Newsletter", source: "newsletter", medium: "email", campaign: "", term: "", content: "" },
  { label: "Instagram", source: "instagram", medium: "social", campaign: "", term: "", content: "" },
  { label: "TikTok", source: "tiktok", medium: "social", campaign: "", term: "", content: "" },
  { label: "YouTube", source: "youtube", medium: "social", campaign: "", term: "", content: "" },
  { label: "Display Ads", source: "display", medium: "display", campaign: "", term: "", content: "" },
  { label: "Affiliate", source: "affiliate", medium: "referral", campaign: "", term: "", content: "" },
  { label: "SMS", source: "sms", medium: "sms", campaign: "", term: "", content: "" },
  { label: "Podcast", source: "podcast", medium: "audio", campaign: "", term: "", content: "" },
];

const MEDIUM_OPTIONS = [
  "cpc", "cpm", "cpa", "cpp", "social", "email", "display", "organic", "referral",
  "sms", "push", "audio", "video", "banner", "native", "sponsor", "affiliate",
];

function load(): UTMLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    const defaults: UTMLink[] = [
      { id: "utm-1", name: "Spring Sale - Google Ads", url: "https://example.com/sale", source: "google", medium: "cpc", campaign: "spring_sale_2025", term: "spring+deals", content: "hero_banner_a", fullUrl: "", createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), clicks: 234 },
      { id: "utm-2", name: "Newsletter - Product Launch", url: "https://example.com/product", source: "newsletter", medium: "email", campaign: "product_launch_q3", term: "", content: "header_cta", fullUrl: "", createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), clicks: 89 },
      { id: "utm-3", name: "Facebook - Retargeting", url: "https://example.com/offers", source: "facebook", medium: "social", campaign: "retarget_q3", term: "abandoned+cart", content: "carousel_v2", fullUrl: "", createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), clicks: 412 },
    ];
    defaults.forEach(l => { l.fullUrl = buildUrl(l.url, l.source, l.medium, l.campaign, l.term, l.content); });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  } catch { return []; }
}

function buildUrl(base: string, source: string, medium: string, campaign: string, term: string, content: string): string {
  const params = new URLSearchParams();
  if (source) params.set("utm_source", source);
  if (medium) params.set("utm_medium", medium);
  if (campaign) params.set("utm_campaign", campaign);
  if (term) params.set("utm_term", term);
  if (content) params.set("utm_content", content);
  const qs = params.toString();
  if (!qs) return base;
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${qs}`;
}

export default function UTMBuilder() {
  const { addToast } = useToast();
  const [links, setLinks] = useState<UTMLink[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "", source: "", medium: "", campaign: "", term: "", content: "" });

  useEffect(() => { setLinks(load()); }, []);

  function persist(updated: UTMLink[]) {
    setLinks(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function resetForm(l?: UTMLink) {
    if (l) setForm({ name: l.name, url: l.url, source: l.source, medium: l.medium, campaign: l.campaign, term: l.term, content: l.content });
    else setForm({ name: "", url: "", source: "", medium: "", campaign: "", term: "", content: "" });
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    setForm(f => ({ ...f, source: preset.source, medium: preset.medium }));
  }

  function handleSave() {
    if (!form.name.trim() || !form.url.trim()) { addToast("error", "Name and URL are required"); return; }
    const fullUrl = buildUrl(form.url, form.source, form.medium, form.campaign, form.term, form.content);
    const now = new Date().toISOString();
    const link: UTMLink = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
      name: form.name.trim(), url: form.url.trim(),
      source: form.source, medium: form.medium, campaign: form.campaign, term: form.term, content: form.content,
      fullUrl, createdAt: editingId ? links.find(l => l.id === editingId)!.createdAt : now, clicks: editingId ? links.find(l => l.id === editingId)!.clicks : 0,
    };
    let updated: UTMLink[];
    if (editingId) { updated = links.map(l => l.id === editingId ? link : l); addToast("success", "UTM link updated"); }
    else { updated = [link, ...links]; addToast("success", "UTM link created"); }
    persist(updated);
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const name = links.find(l => l.id === id)?.name;
    persist(links.filter(l => l.id !== id));
    addToast("success", `"${name}" deleted`);
  }

  function handleCopy(fullUrl: string, id: string) {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedId(id);
      persist(links.map(l => l.id === id ? { ...l, clicks: l.clicks + 1 } : l));
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => addToast("error", "Failed to copy"));
  }

  const previewUrl = form.url ? buildUrl(form.url, form.source, form.medium, form.campaign, form.term, form.content) : "";
  const filtered = links.filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.campaign.toLowerCase().includes(search.toLowerCase()) || l.source.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Link2 className="w-6 h-6 text-n0va-400" />
            UTM Builder
          </h1>
          <p className="text-gray-400 mt-1">{links.length} tracking URLs · {links.reduce((s, l) => s + l.clicks, 0).toLocaleString()} total copy events</p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New UTM Link</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search UTM links..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{editingId ? "Edit UTM Link" : "New UTM Link"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Link Name</label><input className="input" placeholder="e.g. Spring Sale - Google" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
                <div><label className="label">Base URL</label><input className="input" placeholder="https://example.com/page" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} /></div>
              </div>

              {/* Presets */}
              <div><label className="label mb-2">Quick Presets</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map(p => (
                    <button key={p.label} type="button" onClick={() => applyPreset(p)} className="text-[11px] px-2 py-1 bg-gray-800 text-gray-400 rounded-md border border-gray-700 hover:border-gray-600 hover:text-white">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Source (utm_source) *</label>
                  <input className="input" placeholder="google, facebook, newsletter" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
                </div>
                <div><label className="label">Medium (utm_medium) *</label>
                  <div className="flex gap-1">
                    <input className="input flex-1" placeholder="cpc, email, social" list="medium-list" value={form.medium} onChange={e => setForm({ ...form, medium: e.target.value })} />
                    <datalist id="medium-list">{MEDIUM_OPTIONS.map(m => <option key={m} value={m} />)}</datalist>
                  </div>
                </div>
              </div>
              <div><label className="label">Campaign (utm_campaign) *</label>
                <input className="input" placeholder="e.g. spring_sale_2025" value={form.campaign} onChange={e => setForm({ ...form, campaign: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Term (utm_term)</label><input className="input" placeholder="Keywords (paid search)" value={form.term} onChange={e => setForm({ ...form, term: e.target.value })} /></div>
                <div><label className="label">Content (utm_content)</label><input className="input" placeholder="Ad variant or CTA" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></div>
              </div>

              {previewUrl && (
                <div className="bg-n0va-900 rounded-lg p-3 border border-gray-800">
                  <label className="label text-xs mb-1">Live Preview</label>
                  <p className="text-xs text-gray-300 break-all font-mono">{previewUrl}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create UTM Link"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Link2 className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No UTM links found</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Create your first campaign tracking URL."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create UTM Link</button>}
        </div>
      )}

      {/* Link cards */}
      {filtered.map(l => (
        <div key={l.id} className="card p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-n0va-500/10 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5 text-n0va-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-white">{l.name}</h3>
              <p className="text-sm text-gray-500 mt-1 font-mono break-all">{l.fullUrl}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 flex-wrap">
                <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {l.source}</span>
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {l.medium}</span>
                <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {l.campaign}</span>
                {l.term && <span className="flex items-center gap-1"><Search className="w-3 h-3" /> {l.term}</span>}
                {l.content && <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> {l.content}</span>}
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(l.createdAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> {l.clicks} copies</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => handleCopy(l.fullUrl, l.id)} className="p-2 text-gray-600 hover:text-n0va-400" title="Copy URL">
                {copiedId === l.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button onClick={() => { resetForm(l); setEditingId(l.id); setShowForm(true); }} className="p-2 text-gray-600 hover:text-gray-300"><Plus className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(l.id)} className="p-2 text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
