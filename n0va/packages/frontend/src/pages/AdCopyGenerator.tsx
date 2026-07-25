import { useState } from "react";
import { FileText, Plus, X, Edit3, Trash2, Copy, Search, Sparkles, Tag, Megaphone, Star, Heart, Target, Zap, Sun, Moon, Cloud, Flame, Smile, Frown, Download, PieChart as PieChartIcon } from "lucide-react";
import { useToast } from "../components/Toast";
import { useEntityData } from "../hooks/useEntityData";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Tone = "professional" | "casual" | "urgent" | "friendly" | "humorous" | "inspirational" | "luxury" | "edgy";

interface AdCopy {
  id: string;
  headline: string;
  body: string;
  cta: string;
  tone: Tone;
  campaignName: string;
  platform: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

const TONE_META: Record<string, { label: string; icon: any; color: string }> = {
  professional: { label: "Professional", icon: Target, color: "text-blue-400 bg-blue-500/10" },
  casual: { label: "Casual", icon: Smile, color: "text-green-400 bg-green-500/10" },
  urgent: { label: "Urgent", icon: Zap, color: "text-red-400 bg-red-500/10" },
  friendly: { label: "Friendly", icon: Heart, color: "text-pink-400 bg-pink-500/10" },
  humorous: { label: "Humorous", icon: Smile, color: "text-yellow-400 bg-yellow-500/10" },
  inspirational: { label: "Inspirational", icon: Star, color: "text-purple-400 bg-purple-500/10" },
  luxury: { label: "Luxury", icon: Sun, color: "text-amber-400 bg-amber-500/10" },
  edgy: { label: "Edgy", icon: Flame, color: "text-orange-400 bg-orange-500/10" },
};

const TONE_LIST: Tone[] = ["professional", "casual", "urgent", "friendly", "humorous", "inspirational", "luxury", "edgy"];

export default function AdCopyGenerator() {
  const { addToast } = useToast();
  const { data: copies, loading, create, update, remove, replaceAll } = useEntityData<AdCopy>("ad_copy");
  const [search, setSearch] = useState("");
  const [filterTone, setFilterTone] = useState<Tone | "all">("all");
  const [showFavorites, setShowFavorites] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState<{ headline: string; body: string; cta: string; tone: Tone; campaignName: string; platform: string; tags: string }>({
    headline: "", body: "", cta: "", tone: "professional", campaignName: "", platform: "", tags: "",
  });

  function resetForm(c?: AdCopy) {
    if (c) setForm({ headline: c.headline, body: c.body, cta: c.cta, tone: c.tone, campaignName: c.campaignName, platform: c.platform, tags: c.tags.join(", ") });
    else setForm({ headline: "", body: "", cta: "", tone: "professional", campaignName: "", platform: "", tags: "" });
  }

  function handleSave() {
    if (!form.headline.trim() || !form.body.trim()) { addToast("error", "Headline and body are required"); return; }
    const now = new Date().toISOString();
    const copy: AdCopy = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      headline: form.headline.trim(), body: form.body.trim(), cta: form.cta.trim(),
      tone: form.tone, campaignName: form.campaignName.trim(), platform: form.platform.trim(),
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      isFavorite: editingId ? copies.find(c => c.id === editingId)!.isFavorite : false,
      createdAt: editingId ? copies.find(c => c.id === editingId)!.createdAt : now, updatedAt: now,
    };
    if (editingId) { update(editingId, copy as any); addToast("success", "Copy updated"); }
    else { create(copy as any); addToast("success", "Copy saved"); }
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const name = copies.find(c => c.id === id)?.headline;
    remove(id);
    addToast("success", `"${name}" deleted`);
  }

  function toggleFavorite(id: string) {
    replaceAll(copies.map(c => c.id === id ? { ...c, isFavorite: !c.isFavorite } : c));
  }

  function duplicateCopy(id: string) {
    const c = copies.find(co => co.id === id);
    if (!c) return;
    const copy: AdCopy = { ...c, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), headline: `${c.headline} (Copy)`, isFavorite: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    replaceAll([copy, ...copies]);
    addToast("success", "Copy duplicated");
  }

  function aiGenerate() {
    setGenerating(true);
    setTimeout(() => {
      const suggestion: AdCopy = {
        id: "gen-" + Date.now().toString(36),
        headline: "Don't Just Market — Dominate",
        body: "AI-powered campaign optimization that turns every dollar into results. N0VA's marketing platform helps you create, manage, and optimize campaigns with unprecedented efficiency.",
        cta: "Get Started Free",
        tone: form.tone, campaignName: form.campaignName || "New Campaign",
        platform: form.platform || "Google Ads", tags: ["ai-generated"],
        isFavorite: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      replaceAll([suggestion, ...copies]);
      setGenerating(false);
      addToast("success", "AI copy generated!");
    }, 800);
  }

  const filtered = copies.filter(c => {
    if (filterTone !== "all" && c.tone !== filterTone) return false;
    if (showFavorites && !c.isFavorite) return false;
    if (search && !c.headline.toLowerCase().includes(search.toLowerCase()) && !c.body.toLowerCase().includes(search.toLowerCase()) && !c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const toneColors: Record<string, string> = { professional: "#6366f1", casual: "#10b981", urgent: "#ef4444", friendly: "#ec4899", humorous: "#f59e0b", inspirational: "#8b5cf6", luxury: "#f97316", edgy: "#dc2626" };
  const toneData = TONE_LIST.map(t => ({ name: TONE_META[t].label, value: copies.filter(c => c.tone === t).length, color: toneColors[t] })).filter(d => d.value > 0);

  function exportCopyCSV() {
    const rows = [["Headline", "Body", "CTA", "Tone", "Campaign", "Platform", "Tags", "Favorite", "Created"]];
    copies.forEach(c => rows.push([c.headline, c.body, c.cta, c.tone, c.campaignName, c.platform, c.tags.join("; "), String(c.isFavorite), c.createdAt]));
    const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ad-copy-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    addToast("success", `Exported ${copies.length} copies`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-6 h-6 text-n0va-400" />
            Ad Copy Generator
          </h1>
          <p className="text-gray-400 mt-1">{copies.length} copies · {copies.filter(c => c.isFavorite).length} favorites</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={aiGenerate} disabled={generating} className="btn-secondary text-sm"><Sparkles className={`w-3.5 h-3.5 mr-1.5 ${generating ? "animate-pulse" : ""}`} /> {generating ? "Generating..." : "AI Generate"}</button>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Copy</button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search copy..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input py-2 text-sm w-auto" value={filterTone} onChange={e => setFilterTone(e.target.value as Tone | "all")}>
          <option value="all">All Tones</option>
          {TONE_LIST.map(t => <option key={t} value={t}>{TONE_META[t].label}</option>)}
        </select>
        <button onClick={() => setShowFavorites(!showFavorites)} className={`btn-secondary text-sm ${showFavorites ? "ring-1 ring-yellow-500/50" : ""}`}>
          <Star className={`w-3.5 h-3.5 mr-1.5 ${showFavorites ? "text-yellow-400 fill-yellow-400" : ""}`} /> Favorites
        </button>
      </div>

      {/* Tone chart & export */}
      {copies.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-n0va-400" /> Tone Distribution</h3>
            <button onClick={exportCopyCSV} className="btn-ghost text-xs flex items-center gap-1"><Download className="w-3 h-3" /> Export CSV</button>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-44 h-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={toneData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {toneData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {toneData.map(d => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-400 w-20">{d.name}</span>
                  <span className="text-white font-medium">{d.value}</span>
                  <span className="text-gray-600">({((d.value / copies.length) * 100).toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Copy" : "New Ad Copy"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div><label className="label">Headline</label><input className="input" placeholder="Grab attention with a strong headline" value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} autoFocus /></div>
              <div><label className="label">Body Copy</label><textarea className="input" rows={3} placeholder="Persuasive body text..." value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Call to Action</label><input className="input" placeholder="e.g. Shop Now, Learn More" value={form.cta} onChange={e => setForm({ ...form, cta: e.target.value })} /></div>
                <div><label className="label">Tone</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TONE_LIST.map(t => {
                      const tm = TONE_META[t];
                      return <button key={t} type="button" onClick={() => setForm({ ...form, tone: t })} className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded border ${form.tone === t ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400"}`}><tm.icon className="w-3 h-3" />{tm.label}</button>;
                    })}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Campaign</label><input className="input" placeholder="Related campaign" value={form.campaignName} onChange={e => setForm({ ...form, campaignName: e.target.value })} /></div>
                <div><label className="label">Platform</label><input className="input" placeholder="Google Ads, Facebook, etc." list="platform-list" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} />
                  <datalist id="platform-list">{["Google Ads", "Facebook", "Instagram", "LinkedIn", "Twitter/X", "TikTok", "YouTube", "Email", "Display"].map(p => <option key={p} value={p} />)}</datalist>
                </div>
              </div>
              <div><label className="label">Tags (comma-separated)</label><input className="input" placeholder="e.g. product, launch, b2b" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Save Copy"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <FileText className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No ad copy found</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Generate and save ad copy for your campaigns."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Copy</button>}
        </div>
      )}

      {/* Copy cards - grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(c => {
          const tm = TONE_META[c.tone];
          const TI = tm.icon;
          return (
            <div key={c.id} className="card p-4">
              <div className="flex items-start gap-2 mb-2">
                <div className={`p-1.5 rounded ${tm.color}`}><TI className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white truncate">{c.headline}</h3>
                    {c.isFavorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-600 mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded ${tm.color}`}>{tm.label}</span>
                    {c.platform && <span>{c.platform}</span>}
                    {c.campaignName && <span>{c.campaignName}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => toggleFavorite(c.id)} className="p-1 text-gray-600 hover:text-yellow-400"><Star className={`w-3 h-3 ${c.isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} /></button>
                  <button onClick={() => duplicateCopy(c.id)} className="p-1 text-gray-600 hover:text-gray-300"><Copy className="w-3 h-3" /></button>
                  <button onClick={() => { resetForm(c); setEditingId(c.id); setShowForm(true); }} className="p-1 text-gray-600 hover:text-gray-300"><Edit3 className="w-3 h-3" /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="bg-gray-800/40 rounded-lg p-3 mb-2">
                <p className="text-sm text-gray-300 italic">"{c.body}"</p>
              </div>
              {c.cta && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600">CTA:</span>
                  <span className="text-xs bg-n0va-600/20 text-n0va-400 px-2 py-0.5 rounded">{c.cta}</span>
                </div>
              )}
              {c.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.tags.map(t => <span key={t} className="text-[9px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{t}</span>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
