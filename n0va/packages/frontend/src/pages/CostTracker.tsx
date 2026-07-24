import { useState, useEffect } from "react";
import { DollarSign, Plus, X, Edit3, Trash2, Copy, Search, Calendar, BarChart3, TrendingUp, TrendingDown, PieChart, Download } from "lucide-react";
import { useToast } from "../components/Toast";

type Channel = "google_ads" | "facebook" | "instagram" | "linkedin" | "twitter" | "tiktok" | "youtube" | "email" | "display" | "programmatic" | "other";

interface CostEntry {
  id: string;
  campaignName: string;
  channel: Channel;
  month: string;
  year: number;
  budgeted: number;
  actual: number;
  notes: string;
  createdAt: string;
}

const STORAGE_KEY = "n0va_cost_tracker";

const CHANNEL_META: Record<string, { label: string; color: string }> = {
  google_ads: { label: "Google Ads", color: "bg-blue-500/20 text-blue-400" },
  facebook: { label: "Facebook", color: "bg-indigo-500/20 text-indigo-400" },
  instagram: { label: "Instagram", color: "bg-pink-500/20 text-pink-400" },
  linkedin: { label: "LinkedIn", color: "bg-blue-600/20 text-blue-300" },
  twitter: { label: "Twitter/X", color: "bg-sky-500/20 text-sky-400" },
  tiktok: { label: "TikTok", color: "bg-rose-500/20 text-rose-400" },
  youtube: { label: "YouTube", color: "bg-red-500/20 text-red-400" },
  email: { label: "Email", color: "bg-green-500/20 text-green-400" },
  display: { label: "Display", color: "bg-amber-500/20 text-amber-400" },
  programmatic: { label: "Programmatic", color: "bg-purple-500/20 text-purple-400" },
  other: { label: "Other", color: "bg-gray-500/20 text-gray-400" },
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CHANNELS = Object.keys(CHANNEL_META) as Channel[];

const DEFAULT_ENTRIES: CostEntry[] = [
  { id: "ce-1", campaignName: "Product Launch Q3", channel: "google_ads", month: "July", year: 2025, budgeted: 40000, actual: 38500, notes: "Slightly under budget due to lower CPC", createdAt: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: "ce-2", campaignName: "Product Launch Q3", channel: "linkedin", month: "July", year: 2025, budgeted: 25000, actual: 28700, notes: "Over budget - competitive bidding", createdAt: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: "ce-3", campaignName: "Summer Sale 2025", channel: "instagram", month: "July", year: 2025, budgeted: 30000, actual: 28500, notes: "Good performance, optimized delivery", createdAt: new Date(Date.now() - 86400000 * 15).toISOString() },
  { id: "ce-4", campaignName: "Summer Sale 2025", channel: "tiktok", month: "July", year: 2025, budgeted: 15000, actual: 16200, notes: "Testing new creative formats", createdAt: new Date(Date.now() - 86400000 * 15).toISOString() },
  { id: "ce-5", campaignName: "Enterprise Q3", channel: "linkedin", month: "July", year: 2025, budgeted: 50000, actual: 52100, notes: "", createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: "ce-6", campaignName: "Enterprise Q3", channel: "programmatic", month: "July", year: 2025, budgeted: 35000, actual: 31200, notes: "Under budget - paused underperforming placements", createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: "ce-7", campaignName: "Product Launch Q3", channel: "youtube", month: "August", year: 2025, budgeted: 20000, actual: 21500, notes: "Pre-launch teaser campaign", createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "ce-8", campaignName: "Loyalty Program Q3", channel: "email", month: "August", year: 2025, budgeted: 8000, actual: 7200, notes: "Low cost channel, high ROI", createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
];

function load(): CostEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ENTRIES));
    return DEFAULT_ENTRIES;
  } catch { return []; }
}

function fmt(n: number): string { return "$" + n.toLocaleString(); }

export default function CostTracker() {
  const { addToast } = useToast();
  const [entries, setEntries] = useState<CostEntry[]>([]);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState<number | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ campaignName: "", channel: "google_ads" as Channel, month: MONTHS[new Date().getMonth()], year: new Date().getFullYear(), budgeted: 0, actual: 0, notes: "" });

  useEffect(() => { setEntries(load()); }, []);

  function persist(updated: CostEntry[]) {
    setEntries(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function resetForm(e?: CostEntry) {
    if (e) setForm({ campaignName: e.campaignName, channel: e.channel, month: e.month, year: e.year, budgeted: e.budgeted, actual: e.actual, notes: e.notes });
    else setForm({ campaignName: "", channel: "google_ads", month: MONTHS[new Date().getMonth()], year: new Date().getFullYear(), budgeted: 0, actual: 0, notes: "" });
  }

  function handleSave() {
    if (!form.campaignName.trim()) { addToast("error", "Campaign name is required"); return; }
    const now = new Date().toISOString();
    const entry: CostEntry = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      campaignName: form.campaignName.trim(), channel: form.channel, month: form.month, year: form.year,
      budgeted: form.budgeted, actual: form.actual, notes: form.notes.trim(), createdAt: editingId ? entries.find(e => e.id === editingId)!.createdAt : now,
    };
    let updated: CostEntry[];
    if (editingId) { updated = entries.map(e => e.id === editingId ? entry : e); addToast("success", "Entry updated"); }
    else { updated = [entry, ...entries]; addToast("success", "Cost entry added"); }
    persist(updated);
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const name = entries.find(e => e.id === id)?.campaignName;
    persist(entries.filter(e => e.id !== id));
    addToast("success", `Entry for "${name}" deleted`);
  }

  function duplicateEntry(id: string) {
    const e = entries.find(et => et.id === id);
    if (!e) return;
    const copy: CostEntry = { ...e, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), createdAt: new Date().toISOString() };
    persist([copy, ...entries]);
    addToast("success", "Entry duplicated");
  }

  function exportCSV() {
    const headers = "Campaign,Channel,Month,Year,Budgeted,Actual,Variance,Notes";
    const rows = filtered.map(e => `${e.campaignName},${CHANNEL_META[e.channel].label},${e.month},${e.year},${e.budgeted},${e.actual},${e.actual - e.budgeted},"${e.notes}"`);
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `cost-tracker-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    addToast("success", "CSV exported");
  }

  const years = [...new Set(entries.map(e => e.year))].sort((a, b) => b - a);
  const filtered = entries.filter(e => {
    if (filterYear !== "all" && e.year !== filterYear) return false;
    if (search && !e.campaignName.toLowerCase().includes(search.toLowerCase()) && !e.notes.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalBudgeted = filtered.reduce((s, e) => s + e.budgeted, 0);
  const totalActual = filtered.reduce((s, e) => s + e.actual, 0);
  const totalVariance = totalActual - totalBudgeted;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-n0va-400" />
            Campaign Cost Tracker
          </h1>
          <p className="text-gray-400 mt-1">{entries.length} entries · {years.length} years tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm"><Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV</button>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> Add Entry</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500">Total Budgeted</p><p className="text-xl font-bold text-white mt-1">{fmt(totalBudgeted)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Total Actual</p><p className="text-xl font-bold text-white mt-1">{fmt(totalActual)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Variance</p><p className={`text-xl font-bold mt-1 ${totalVariance > 0 ? "text-red-400" : "text-green-400"}`}>{totalVariance > 0 ? "+" : ""}{fmt(totalVariance)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Avg. per Entry</p><p className="text-xl font-bold text-white mt-1">{fmt(totalActual / (filtered.length || 1))}</p></div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search by campaign..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input py-2 text-sm w-auto" value={filterYear === "all" ? "all" : filterYear} onChange={e => setFilterYear(e.target.value === "all" ? "all" : Number(e.target.value))}>
          <option value="all">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Cost Entry" : "Add Cost Entry"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div><label className="label">Campaign Name</label><input className="input" placeholder="e.g. Product Launch Q3" value={form.campaignName} onChange={e => setForm({ ...form, campaignName: e.target.value })} autoFocus /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Channel</label>
                  <select className="input" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value as Channel })}>
                    {CHANNELS.map(ch => <option key={ch} value={ch}>{CHANNEL_META[ch].label}</option>)}
                  </select>
                </div>
                <div><label className="label">Month</label>
                  <select className="input" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Year</label><input className="input" type="number" min={2020} max={2030} value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="label">Budgeted ($)</label><input className="input" type="number" min="0" value={form.budgeted} onChange={e => setForm({ ...form, budgeted: Number(e.target.value) }) } /></div>
                  <div><label className="label">Actual ($)</label><input className="input" type="number" min="0" value={form.actual} onChange={e => setForm({ ...form, actual: Number(e.target.value) }) } /></div>
                </div>
              </div>
              <div><label className="label">Notes</label><textarea className="input" rows={2} placeholder="Optional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              {form.budgeted > 0 && <div className="bg-gray-800/50 rounded-lg p-3 text-sm">
                <span className="text-gray-500">Variance: </span>
                <span className={form.actual > form.budgeted ? "text-red-400" : "text-green-400"}>
                  {form.actual > form.budgeted ? "+" : ""}${(form.actual - form.budgeted).toLocaleString()} ({((form.actual - form.budgeted) / form.budgeted * 100).toFixed(1)}%)
                </span>
              </div>}
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Add Entry"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <DollarSign className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No cost entries found</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Track campaign costs and compare budget vs actual."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Add Entry</button>}
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800 text-left text-xs text-gray-500">
              <th className="p-3 font-medium">Campaign</th>
              <th className="p-3 font-medium">Channel</th>
              <th className="p-3 font-medium">Period</th>
              <th className="p-3 font-medium text-right">Budgeted</th>
              <th className="p-3 font-medium text-right">Actual</th>
              <th className="p-3 font-medium text-right">Variance</th>
              <th className="p-3 font-medium">Notes</th>
              <th className="p-3 w-20" />
            </tr></thead>
            <tbody>
              {filtered.map(e => {
                const variance = e.actual - e.budgeted;
                const varPct = e.budgeted > 0 ? (variance / e.budgeted * 100) : 0;
                const cm = CHANNEL_META[e.channel];
                return (
                  <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="p-3 text-white font-medium">{e.campaignName}</td>
                    <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${cm.color}`}>{cm.label}</span></td>
                    <td className="p-3 text-gray-400">{e.month.slice(0, 3)} {e.year}</td>
                    <td className="p-3 text-right text-gray-300">{e.budgeted.toLocaleString()}</td>
                    <td className="p-3 text-right text-gray-300">{e.actual.toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <span className={variance > 0 ? "text-red-400" : variance < 0 ? "text-green-400" : "text-gray-500"}>
                        {variance > 0 ? "+" : ""}{variance.toLocaleString()} ({varPct > 0 ? "+" : ""}{varPct.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="p-3 text-gray-500 text-xs max-w-[180px] truncate">{e.notes || "—"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => { resetForm(e); setEditingId(e.id); setShowForm(true); }} className="p-1 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => duplicateEntry(e.id)} className="p-1 text-gray-600 hover:text-gray-300"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(e.id)} className="p-1 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
