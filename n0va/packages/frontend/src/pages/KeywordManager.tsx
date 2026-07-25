import { useState, useMemo, useEffect } from "react";
import { Search, Plus, X, Edit3, Trash2, TrendingUp, TrendingDown, Minus, Filter, Hash, Upload, Download, CheckSquare, Square, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell } from "recharts";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

interface Keyword {
  _id?: string;
  id: string;
  term: string;
  volume: number;
  difficulty: number;
  position: number;
  previousPosition: number;
  cpc: number;
  bid: number;
  traffic: number;
  group: string;
  status: string;
  matchType: string;
  impressions: number;
  clicks: number;
  conversions: number;
  lastUpdated: string;
}

const GROUPS = ["Brand", "Product", "Competitor", "Informational", "Long-tail", "Seasonal"];
const STATUSES = ["active", "paused", "archived"];
const MATCH_TYPES = ["exact", "phrase", "broad"];
const PAGE_SIZE = 20;

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
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMatchType, setFilterMatchType] = useState<string>("all");
  const [editBidId, setEditBidId] = useState<string | null>(null);
  const [editBidVal, setEditBidVal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<keyof Keyword | null>(null);
  const [sortDesc, setSortDesc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ term: string; volume: number; difficulty: number; position: number; previousPosition: number; cpc: number; bid: number; group: string; status: string; matchType: string }>({ term: "", volume: 0, difficulty: 0, position: 0, previousPosition: 0, cpc: 0, bid: 0, group: "Product", status: "active", matchType: "exact" });

  useEffect(() => { api.keywords.list().then(setKeywords); }, []);

  const avgPos = keywords.length > 0 ? (keywords.reduce((s, k) => s + k.position, 0) / keywords.length) : 0;
  const totalVolume = keywords.reduce((s, k) => s + k.volume, 0);
  const top10 = keywords.filter(k => k.position <= 10).length;

  function resetForm(k?: Keyword) {
    if (k) setForm({ term: k.term, volume: k.volume, difficulty: k.difficulty, position: k.position, previousPosition: k.previousPosition, cpc: k.cpc, bid: k.bid, group: k.group, status: k.status, matchType: k.matchType });
    else setForm({ term: "", volume: 0, difficulty: 0, position: 0, previousPosition: 0, cpc: 0, bid: 0, group: "Product", status: "active", matchType: "exact" });
  }

  async function handleSave() {
    if (!form.term.trim()) { addToast("error", "Keyword term is required"); return; }
    const now = new Date().toISOString();
    const kw = { ...form, term: form.term.trim(), traffic: Math.floor(form.volume * (11 - Math.min(form.position, 10)) / 20), lastUpdated: now };
    if (editingId) { await api.keywords.update(editingId, kw); addToast("success", "Keyword updated"); }
    else { await api.keywords.create(kw); addToast("success", "Keyword added"); }
    setKeywords(await api.keywords.list());
    setShowForm(false);
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const name = keywords.find(k => k.id === id)?.term;
    await api.keywords.delete(id);
    setKeywords(prev => prev.filter(k => k.id !== id));
    addToast("success", `"${name}" removed`);
  }

  async function handleBulkDelete() {
    const count = selected.size;
    for (const id of selected) await api.keywords.delete(id);
    setKeywords(await api.keywords.list());
    addToast("success", `Deleted ${count} keywords`);
    setSelected(new Set());
  }

  async function handleBulkGroup(group: string) {
    const count = selected.size;
    for (const id of selected) {
      const kw = keywords.find(k => k.id === id);
      if (kw) await api.keywords.update(id, { ...kw, group });
    }
    setKeywords(await api.keywords.list());
    addToast("success", `Moved ${count} keywords to ${group}`);
    setSelected(new Set());
  }

  const filtered = useMemo(() => {
    let result = keywords.filter(k => {
      if (filterGroup !== "all" && k.group !== filterGroup) return false;
      if (filterStatus !== "all" && k.status !== filterStatus) return false;
      if (filterMatchType !== "all" && k.matchType !== filterMatchType) return false;
      if (search && !k.term.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sortBy) {
      result = [...result].sort((a, b) => {
        const aV = a[sortBy] as number;
        const bV = b[sortBy] as number;
        return sortDesc ? bV - aV : aV - bV;
      });
    }
    return result;
  }, [keywords, filterGroup, filterStatus, filterMatchType, search, sortBy, sortDesc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(col: keyof Keyword) {
    if (sortBy === col) setSortDesc(!sortDesc);
    else { setSortBy(col); setSortDesc(false); }
  }

  function SortIcon({ col }: { col: keyof Keyword }) {
    if (sortBy !== col) return null;
    return sortDesc ? <TrendingDown className="w-3 h-3 inline ml-0.5" /> : <TrendingUp className="w-3 h-3 inline ml-0.5" />;
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleSelectAll() {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map(k => k.id)));
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split("\n").filter(l => l.trim());
        const headers = lines[0].split(",");
        const imported: Keyword[] = [];
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(",");
          const entry: any = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), lastUpdated: new Date().toISOString() };
          headers.forEach((h, idx) => { entry[h.trim()] = vals[idx]?.trim(); });
          entry.volume = Number(entry.volume) || 0;
          entry.difficulty = Number(entry.difficulty) || 0;
          entry.position = Number(entry.position) || 0;
          entry.previousPosition = Number(entry.previousPosition) || 0;
          entry.cpc = Number(entry.cpc) || 0;
          entry.bid = Number(entry.bid) || 0;
          entry.impressions = Number(entry.impressions) || 0;
          entry.clicks = Number(entry.clicks) || 0;
          entry.conversions = Number(entry.conversions) || 0;
          entry.status = entry.status || "active";
          entry.matchType = entry.matchType || "exact";
          entry.traffic = Math.floor(entry.volume * (11 - Math.min(entry.position, 10)) / 20);
          if (entry.term) imported.push(entry as Keyword);
        }
        for (const kw of imported) await api.keywords.create(kw as any);
        setKeywords(await api.keywords.list());
        addToast("success", `Imported ${imported.length} keywords`);
      } catch { addToast("error", "Failed to parse CSV"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleExport() {
    const csv = [
      ["term", "volume", "difficulty", "position", "previousPosition", "cpc", "bid", "traffic", "group", "status", "matchType", "impressions", "clicks", "conversions"],
      ...filtered.map((k) => [k.term, k.volume, k.difficulty, k.position, k.previousPosition, k.cpc, k.bid, k.traffic, k.group, k.status, k.matchType, k.impressions, k.clicks, k.conversions]),
    ].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "keywords-export.csv"; a.click();
    URL.revokeObjectURL(url);
    addToast("success", `Exported ${filtered.length} keywords`);
  }

  const scatterData = keywords.map(k => ({ name: k.term, volume: k.volume, difficulty: k.difficulty, cpc: k.cpc, group: k.group }));

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
        <div className="flex items-center gap-2">
          <label className="btn-ghost text-xs flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
          <button className="btn-ghost text-xs flex items-center gap-1.5" onClick={handleExport}><Download className="w-3.5 h-3.5" /> Export</button>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> Add Keyword</button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search keywords..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input py-2 text-sm w-auto" value={filterGroup} onChange={e => { setFilterGroup(e.target.value); setPage(0); }}>
          <option value="all">All Groups</option>
          {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="input py-2 text-sm w-auto" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }}>
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select className="input py-2 text-sm w-auto" value={filterMatchType} onChange={e => { setFilterMatchType(e.target.value); setPage(0); }}>
          <option value="all">All Match Types</option>
          {MATCH_TYPES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500">Avg. Position</p><p className="text-xl font-bold text-white mt-1">{avgPos.toFixed(1)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Top 10 Keywords</p><p className="text-xl font-bold text-white mt-1">{top10}/{keywords.length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Total Traffic Est.</p><p className="text-xl font-bold text-white mt-1">{fmt(keywords.reduce((s, k) => s + k.traffic, 0))}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Avg. CPC</p><p className="text-xl font-bold text-white mt-1">${(keywords.reduce((s, k) => s + k.cpc, 0) / keywords.length).toFixed(2)}</p></div>
      </div>

      {scatterData.length > 1 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-n0va-400" />
            <h3 className="text-sm font-semibold text-white">Volume vs Difficulty</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="volume" tick={{ fontSize: 10, fill: "#9ca3af" }} name="Volume" />
              <YAxis dataKey="difficulty" tick={{ fontSize: 10, fill: "#9ca3af" }} name="Difficulty" domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }} />
              <Scatter data={scatterData} fill="#6366f1">
                {scatterData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.difficulty < 30 ? "#22c55e" : entry.difficulty < 60 ? "#eab308" : "#ef4444"} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

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
                <div><label className="label">Bid ($)</label><input className="input" type="number" min="0" step="0.01" value={form.bid} onChange={e => setForm({ ...form, bid: Number(e.target.value) })} /></div>
                <div><label className="label">Match Type</label>
                  <select className="input" value={form.matchType} onChange={e => setForm({ ...form, matchType: e.target.value })}>
                    {MATCH_TYPES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                </div>
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
              <div><label className="label">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map(s => <button type="button" key={s} onClick={() => setForm({ ...form, status: s })} className={`text-xs px-2.5 py-1 rounded border ${form.status === s ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400"}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>)}
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

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-n0va-600/10 border border-n0va-600/30 rounded-lg">
          <span className="text-xs text-n0va-400">{selected.size} selected</span>
          <div className="w-px h-4 bg-gray-700" />
          <button className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1" onClick={handleBulkDelete}><Trash2 className="w-3 h-3" /> Delete</button>
          {GROUPS.map(g => (
            <button key={g} className="text-xs text-gray-400 hover:text-white" onClick={() => handleBulkGroup(g)}>Move to {g}</button>
          ))}
          <button className="text-xs text-gray-500 ml-auto hover:text-gray-300" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="p-3 w-8">
                  <button onClick={toggleSelectAll} className="text-gray-600 hover:text-gray-400">
                    {selected.size === paged.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  </button>
                </th>
                <th className="p-3 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("term")}>Keyword<SortIcon col="term" /></th>
                <th className="p-3 font-medium">Group</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Match</th>
                <th className="p-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => toggleSort("volume")}>Volume<SortIcon col="volume" /></th>
                <th className="p-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => toggleSort("difficulty")}>Difficulty<SortIcon col="difficulty" /></th>
                <th className="p-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => toggleSort("position")}>Position<SortIcon col="position" /></th>
                <th className="p-3 font-medium text-right">Change</th>
                <th className="p-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => toggleSort("cpc")}>CPC<SortIcon col="cpc" /></th>
                <th className="p-3 font-medium text-right">Bid</th>
                <th className="p-3 font-medium text-right">Impr.</th>
                <th className="p-3 font-medium text-right">Clicks</th>
                <th className="p-3 font-medium text-right">Conv.</th>
                <th className="p-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => toggleSort("traffic")}>Est. Traffic<SortIcon col="traffic" /></th>
                <th className="p-3 w-20" />
              </tr></thead>
              <tbody>
                {paged.map(kw => {
                  const posChange = kw.previousPosition - kw.position;
                  const isSel = selected.has(kw.id);
                  return (
                    <tr key={kw.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${isSel ? "bg-n0va-600/5" : ""}`}>
                      <td className="p-3">
                        <button onClick={() => toggleSelect(kw.id)} className="text-gray-600 hover:text-gray-400">
                          {isSel ? <CheckSquare className="w-3.5 h-3.5 text-n0va-400" /> : <Square className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                      <td className="p-3 text-white font-medium">{kw.term}</td>
                      <td className="p-3"><span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700">{kw.group}</span></td>
                      <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded border ${kw.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/30" : kw.status === "paused" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-gray-800 text-gray-500 border-gray-700"}`}>{kw.status}</span></td>
                      <td className="p-3"><span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700">{kw.matchType}</span></td>
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
                      <td className="p-3 text-right">
                        {editBidId === kw.id ? (
                          <input className="input text-xs py-0.5 w-20 text-right" type="number" min="0" step="0.01"
                            value={editBidVal} autoFocus
                            onChange={e => setEditBidVal(Number(e.target.value))}
                            onBlur={async () => { await api.keywords.updateBid(kw.id, editBidVal); setEditBidId(null); }}
                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditBidId(null); }}
                          />
                        ) : (
                          <button className="text-gray-300 hover:text-n0va-400" onClick={() => { setEditBidId(kw.id); setEditBidVal(kw.bid || 0); }}>
                            ${(kw.bid || 0).toFixed(2)}
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-right text-gray-300">{fmt(kw.impressions || 0)}</td>
                      <td className="p-3 text-right text-gray-300">{fmt(kw.clicks || 0)}</td>
                      <td className="p-3 text-right text-gray-300">{fmt(kw.conversions || 0)}</td>
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-800">
              <span className="text-xs text-gray-500">Page {page + 1} of {totalPages} ({filtered.length} total)</span>
              <div className="flex items-center gap-1">
                <button className="p-1 text-gray-600 hover:text-white disabled:opacity-30" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  const pNum = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                  if (pNum >= totalPages) return null;
                  return (
                    <button key={pNum} className={`w-7 h-7 rounded text-xs ${pNum === page ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/40" : "text-gray-500 hover:text-gray-300"}`} onClick={() => setPage(pNum)}>
                      {pNum + 1}
                    </button>
                  );
                })}
                <button className="p-1 text-gray-600 hover:text-white disabled:opacity-30" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
