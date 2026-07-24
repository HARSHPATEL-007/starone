import { useState, useEffect } from "react";
import { Search, Plus, X, Edit3, Trash2, Copy, TrendingUp, TrendingDown, Minus, Filter, Globe, Hash, Target } from "lucide-react";
import { useToast } from "../components/Toast";

interface Keyword {
  id: string;
  term: string;
  volume: number;
  difficulty: number;
  position: number;
  previousPosition: number;
  cpc: number;
  traffic: number;
  group: string;
  lastUpdated: string;
}

const STORAGE_KEY = "n0va_keywords";
const GROUPS = ["Brand", "Product", "Competitor", "Informational", "Long-tail", "Seasonal"];

const DEFAULT_KEYWORDS: Keyword[] = [
  { id: "kw-1", term: "marketing automation software", volume: 14200, difficulty: 72, position: 4, previousPosition: 6, cpc: 12.45, traffic: 2850, group: "Product", lastUpdated: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: "kw-2", term: "email marketing platform", volume: 9800, difficulty: 65, position: 3, previousPosition: 3, cpc: 8.90, traffic: 3200, group: "Product", lastUpdated: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "kw-3", term: "n0va ads", volume: 2400, difficulty: 18, position: 1, previousPosition: 1, cpc: 0, traffic: 1800, group: "Brand", lastUpdated: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: "kw-4", term: "best marketing tools 2025", volume: 8200, difficulty: 58, position: 7, previousPosition: 9, cpc: 5.20, traffic: 1100, group: "Competitor", lastUpdated: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "kw-5", term: "how to create ad campaign", volume: 5600, difficulty: 42, position: 5, previousPosition: 4, cpc: 3.75, traffic: 1400, group: "Informational", lastUpdated: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: "kw-6", term: "facebook ads manager tutorial", volume: 3800, difficulty: 35, position: 2, previousPosition: 2, cpc: 4.10, traffic: 2100, group: "Informational", lastUpdated: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "kw-7", term: "ppc campaign optimization", volume: 2900, difficulty: 55, position: 8, previousPosition: 11, cpc: 9.80, traffic: 650, group: "Product", lastUpdated: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "kw-8", term: "social media scheduling tool", volume: 6300, difficulty: 48, position: 6, previousPosition: 5, cpc: 6.50, traffic: 980, group: "Competitor", lastUpdated: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "kw-9", term: "a/b testing for landing pages", volume: 1800, difficulty: 28, position: 3, previousPosition: 3, cpc: 2.95, traffic: 780, group: "Long-tail", lastUpdated: new Date(Date.now() - 86400000 * 6).toISOString() },
  { id: "kw-10", term: "holiday email campaign ideas", volume: 3200, difficulty: 31, position: 10, previousPosition: 14, cpc: 3.40, traffic: 520, group: "Seasonal", lastUpdated: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: "kw-11", term: "retargeting strategies 2025", volume: 2100, difficulty: 38, position: 9, previousPosition: 12, cpc: 7.20, traffic: 410, group: "Long-tail", lastUpdated: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: "kw-12", term: "n0va vs hubspot", volume: 890, difficulty: 22, position: 2, previousPosition: 2, cpc: 0, traffic: 670, group: "Brand", lastUpdated: new Date(Date.now() - 86400000 * 3).toISOString() },
];

function load(): Keyword[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_KEYWORDS));
    return DEFAULT_KEYWORDS;
  } catch { return []; }
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function KeywordManager() {
  const { addToast } = useToast();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ term: string; volume: number; difficulty: number; position: number; previousPosition: number; cpc: number; group: string }>({ term: "", volume: 0, difficulty: 0, position: 0, previousPosition: 0, cpc: 0, group: "Product" });

  useEffect(() => { setKeywords(load()); }, []);

  function persist(updated: Keyword[]) {
    setKeywords(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  const avgPos = keywords.length > 0 ? (keywords.reduce((s, k) => s + k.position, 0) / keywords.length) : 0;
  const totalVolume = keywords.reduce((s, k) => s + k.volume, 0);
  const top10 = keywords.filter(k => k.position <= 10).length;

  function resetForm(k?: Keyword) {
    if (k) setForm({ term: k.term, volume: k.volume, difficulty: k.difficulty, position: k.position, previousPosition: k.previousPosition, cpc: k.cpc, group: k.group });
    else setForm({ term: "", volume: 0, difficulty: 0, position: 0, previousPosition: 0, cpc: 0, group: "Product" });
  }

  function handleSave() {
    if (!form.term.trim()) { addToast("error", "Keyword term is required"); return; }
    const now = new Date().toISOString();
    const kw: Keyword = { ...form, term: form.term.trim(), id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6), traffic: Math.floor(form.volume * (11 - Math.min(form.position, 10)) / 20), lastUpdated: now };
    let updated: Keyword[];
    if (editingId) { updated = keywords.map(k => k.id === editingId ? kw : k); addToast("success", "Keyword updated"); }
    else { updated = [kw, ...keywords]; addToast("success", "Keyword added"); }
    persist(updated);
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const name = keywords.find(k => k.id === id)?.term;
    persist(keywords.filter(k => k.id !== id));
    addToast("success", `"${name}" removed`);
  }

  const filtered = keywords.filter(k => {
    if (filterGroup !== "all" && k.group !== filterGroup) return false;
    if (search && !k.term.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Hash className="w-6 h-6 text-n0va-400" />
            Keyword Manager
          </h1>
          <p className="text-gray-400 mt-1">{keywords.length} keywords · {fmt(totalVolume)} total search volume · Avg position {avgPos.toFixed(1)} · {top10} in top 10</p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> Add Keyword</button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search keywords..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input py-2 text-sm w-auto" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
          <option value="all">All Groups</option>
          {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500">Avg. Position</p><p className="text-xl font-bold text-white mt-1">{avgPos.toFixed(1)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Top 10 Keywords</p><p className="text-xl font-bold text-white mt-1">{top10}/{keywords.length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Total Traffic Est.</p><p className="text-xl font-bold text-white mt-1">{fmt(keywords.reduce((s, k) => s + k.traffic, 0))}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Avg. CPC</p><p className="text-xl font-bold text-white mt-1">${(keywords.reduce((s, k) => s + k.cpc, 0) / keywords.length).toFixed(2)}</p></div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Keyword" : "Add Keyword"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div><label className="label">Keyword Term</label><input className="input" placeholder="e.g. email marketing platform" value={form.term} onChange={e => setForm({ ...form, term: e.target.value })} autoFocus /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Search Volume</label><input className="input" type="number" min="0" value={form.volume} onChange={e => setForm({ ...form, volume: Number(e.target.value) })} /></div>
                <div><label className="label">Difficulty (0-100)</label><input className="input" type="number" min="0" max="100" value={form.difficulty} onChange={e => setForm({ ...form, difficulty: Number(e.target.value) })} /></div>
                <div><label className="label">CPC ($)</label><input className="input" type="number" min="0" step="0.01" value={form.cpc} onChange={e => setForm({ ...form, cpc: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Current Position</label><input className="input" type="number" min="0" value={form.position} onChange={e => setForm({ ...form, position: Number(e.target.value) })} /></div>
                <div><label className="label">Previous Position</label><input className="input" type="number" min="0" value={form.previousPosition} onChange={e => setForm({ ...form, previousPosition: Number(e.target.value) })} /></div>
              </div>
              <div><label className="label">Group</label>
                <div className="flex flex-wrap gap-1.5">
                  {GROUPS.map(g => <button type="button" key={g} onClick={() => setForm({ ...form, group: g })} className={`text-xs px-2.5 py-1 rounded border ${form.group === g ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400"}`}>{g}</button>)}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Add Keyword"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Hash className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No keywords found</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Track your SEO and SEM keywords."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Add Keyword</button>}
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="p-3 font-medium">Keyword</th>
                <th className="p-3 font-medium">Group</th>
                <th className="p-3 font-medium text-right">Volume</th>
                <th className="p-3 font-medium text-right">Difficulty</th>
                <th className="p-3 font-medium text-right">Position</th>
                <th className="p-3 font-medium text-right">Change</th>
                <th className="p-3 font-medium text-right">CPC</th>
                <th className="p-3 font-medium text-right">Est. Traffic</th>
                <th className="p-3 w-20" />
              </tr></thead>
              <tbody>
                {filtered.map(kw => {
                  const posChange = kw.previousPosition - kw.position;
                  return (
                    <tr key={kw.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="p-3 text-white font-medium">{kw.term}</td>
                      <td className="p-3"><span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700">{kw.group}</span></td>
                      <td className="p-3 text-right text-gray-300">{fmt(kw.volume)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${kw.difficulty < 30 ? "bg-green-500" : kw.difficulty < 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${kw.difficulty}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-6 text-right">{kw.difficulty}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`text-sm font-semibold ${kw.position === 0 ? "text-gray-600" : kw.position <= 3 ? "text-green-400" : kw.position <= 10 ? "text-yellow-400" : "text-gray-400"}`}>
                          {kw.position === 0 ? "—" : `#${kw.position}`}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {kw.previousPosition > 0 && kw.position > 0 && kw.position !== kw.previousPosition ? (
                          <span className={`flex items-center justify-end gap-0.5 text-xs ${posChange > 0 ? "text-green-400" : "text-red-400"}`}>
                            {posChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(posChange)}
                          </span>
                        ) : kw.previousPosition === kw.position && kw.position > 0 ? (
                          <span className="text-xs text-gray-600 flex items-center justify-end gap-0.5"><Minus className="w-3 h-3" />0</span>
                        ) : <span className="text-xs text-gray-600">—</span>}
                      </td>
                      <td className="p-3 text-right text-gray-300">${kw.cpc.toFixed(2)}</td>
                      <td className="p-3 text-right text-gray-300">{fmt(kw.traffic)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => { resetForm(kw); setEditingId(kw.id); setShowForm(true); }} className="p-1 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(kw.id)} className="p-1 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
