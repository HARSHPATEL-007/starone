import { useState, useEffect } from "react";
import { Camera, Plus, X, Edit3, Trash2, Copy, Search, Calendar, BarChart3, DollarSign, Target, Eye, Download, Clock, TrendingUp, Users } from "lucide-react";
import { useToast } from "../components/Toast";

interface SnapshotMetric {
  label: string;
  value: number;
  format: "number" | "currency" | "percent" | "rate";
}

interface CampaignSnapshot {
  id: string;
  name: string;
  description: string;
  campaignName: string;
  metrics: SnapshotMetric[];
  notes: string;
  createdAt: string;
  tags: string[];
}

const STORAGE_KEY = "n0va_campaign_snapshots";

const DEFAULT_SNAPSHOTS: CampaignSnapshot[] = [
  {
    id: "cs-1", name: "Product Launch - Week 1", description: "First week performance snapshot", campaignName: "Product Launch Q3",
    metrics: [
      { label: "Impressions", value: 185000, format: "number" },
      { label: "Clicks", value: 6200, format: "number" },
      { label: "CTR", value: 3.35, format: "percent" },
      { label: "Spend", value: 12400, format: "currency" },
      { label: "Revenue", value: 48500, format: "currency" },
      { label: "ROAS", value: 3.91, format: "rate" },
      { label: "Conversions", value: 312, format: "number" },
      { label: "CPA", value: 39.74, format: "currency" },
    ],
    notes: "Strong start. CPC lower than expected at $2.00. Creative A outperforming B by 23%.", tags: ["product", "launch", "week-1"],
    createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
  },
  {
    id: "cs-2", name: "Summer Sale - Mid Campaign", description: "Mid-point check for summer campaign", campaignName: "Summer Sale 2025",
    metrics: [
      { label: "Impressions", value: 420000, format: "number" },
      { label: "Clicks", value: 15800, format: "number" },
      { label: "CTR", value: 3.76, format: "percent" },
      { label: "Spend", value: 22500, format: "currency" },
      { label: "Revenue", value: 89200, format: "currency" },
      { label: "ROAS", value: 3.96, format: "rate" },
      { label: "Conversions", value: 680, format: "number" },
      { label: "CPA", value: 33.09, format: "currency" },
    ],
    notes: "TikTok outperforming other channels. Instagram Stories driving strong engagement.", tags: ["summer", "sale", "mid-campaign"],
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: "cs-3", name: "Enterprise Q3 - Month 1", description: "First month results for enterprise campaign", campaignName: "Enterprise Q3",
    metrics: [
      { label: "Impressions", value: 95000, format: "number" },
      { label: "Clicks", value: 2850, format: "number" },
      { label: "CTR", value: 3.0, format: "percent" },
      { label: "Spend", value: 28500, format: "currency" },
      { label: "Revenue", value: 98000, format: "currency" },
      { label: "ROAS", value: 3.44, format: "rate" },
      { label: "Conversions", value: 180, format: "number" },
      { label: "CPA", value: 158.33, format: "currency" },
    ],
    notes: "Higher CPA than ideal but strong lead quality. 15 demo requests booked.", tags: ["enterprise", "q3", "month-1"],
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
];

function load(): CampaignSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SNAPSHOTS));
    return DEFAULT_SNAPSHOTS;
  } catch { return []; }
}

function fmtValue(val: number, format: string): string {
  if (format === "currency") return "$" + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (format === "percent") return val.toFixed(2) + "%";
  if (format === "rate") return val.toFixed(2) + "x";
  return val.toLocaleString();
}

const FORMAT_OPTIONS = ["number", "currency", "percent", "rate"] as const;

export default function CampaignSnapshots() {
  const { addToast } = useToast();
  const [snapshots, setSnapshots] = useState<CampaignSnapshot[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; campaignName: string; metrics: SnapshotMetric[]; notes: string; tags: string }>({
    name: "", description: "", campaignName: "", metrics: [
      { label: "Impressions", value: 0, format: "number" },
      { label: "Clicks", value: 0, format: "number" },
      { label: "CTR", value: 0, format: "percent" },
      { label: "Spend", value: 0, format: "currency" },
      { label: "Revenue", value: 0, format: "currency" },
      { label: "ROAS", value: 0, format: "rate" },
      { label: "Conversions", value: 0, format: "number" },
      { label: "CPA", value: 0, format: "currency" },
    ], notes: "", tags: "",
  });

  useEffect(() => { setSnapshots(load()); }, []);

  function persist(updated: CampaignSnapshot[]) {
    setSnapshots(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function resetForm(s?: CampaignSnapshot) {
    if (s) setForm({ name: s.name, description: s.description, campaignName: s.campaignName, metrics: s.metrics.map(m => ({ ...m })), notes: s.notes, tags: s.tags.join(", ") });
    else setForm({ name: "", description: "", campaignName: "", metrics: [
      { label: "Impressions", value: 0, format: "number" },
      { label: "Clicks", value: 0, format: "number" },
      { label: "CTR", value: 0, format: "percent" },
      { label: "Spend", value: 0, format: "currency" },
      { label: "Revenue", value: 0, format: "currency" },
      { label: "ROAS", value: 0, format: "rate" },
      { label: "Conversions", value: 0, format: "number" },
      { label: "CPA", value: 0, format: "currency" },
    ], notes: "", tags: "" });
  }

  function addMetric() {
    setForm(f => ({ ...f, metrics: [...f.metrics, { label: "", value: 0, format: "number" as const }] }));
  }

  function updateMetric(idx: number, field: keyof SnapshotMetric, value: any) {
    setForm(f => ({ ...f, metrics: f.metrics.map((m, i) => i === idx ? { ...m, [field]: value } : m) }));
  }

  function removeMetric(idx: number) {
    setForm(f => ({ ...f, metrics: f.metrics.filter((_, i) => i !== idx) }));
  }

  function handleSave() {
    if (!form.name.trim() || !form.campaignName.trim()) { addToast("error", "Name and campaign name required"); return; }
    const now = new Date().toISOString();
    const snap: CampaignSnapshot = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: form.name.trim(), description: form.description.trim(), campaignName: form.campaignName.trim(),
      metrics: form.metrics.filter(m => m.label.trim()).map(m => ({ ...m })),
      notes: form.notes.trim(), tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      createdAt: editingId ? snapshots.find(s => s.id === editingId)!.createdAt : now,
    };
    let updated: CampaignSnapshot[];
    if (editingId) { updated = snapshots.map(s => s.id === editingId ? snap : s); addToast("success", "Snapshot updated"); }
    else { updated = [snap, ...snapshots]; addToast("success", "Snapshot saved"); }
    persist(updated);
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const name = snapshots.find(s => s.id === id)?.name;
    persist(snapshots.filter(s => s.id !== id));
    if (viewingId === id) setViewingId(null);
    addToast("success", `"${name}" deleted`);
  }

  function cloneSnapshot(id: string) {
    const s = snapshots.find(sn => sn.id === id);
    if (!s) return;
    const copy: CampaignSnapshot = { ...s, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: `${s.name} (Copy)`, createdAt: new Date().toISOString() };
    persist([copy, ...snapshots]);
    addToast("success", "Snapshot duplicated");
  }

  const filtered = snapshots.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.campaignName.toLowerCase().includes(search.toLowerCase()) || s.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));
  const viewingSnap = viewingId ? snapshots.find(s => s.id === viewingId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Camera className="w-6 h-6 text-n0va-400" />
            Campaign Snapshots
          </h1>
          <p className="text-gray-400 mt-1">{snapshots.length} saved snapshots</p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Snapshot</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search snapshots..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Snapshot" : "New Snapshot"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Snapshot Name</label><input className="input" placeholder="e.g. Week 1 Results" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
                <div><label className="label">Campaign Name</label><input className="input" placeholder="e.g. Product Launch Q3" value={form.campaignName} onChange={e => setForm({ ...form, campaignName: e.target.value })} /></div>
              </div>
              <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="What does this snapshot capture?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><div className="flex items-center justify-between mb-2"><label className="label mb-0">Metrics</label><button type="button" onClick={addMetric} className="text-xs text-n0va-400 hover:text-n0va-300">+ Add Metric</button></div>
                {form.metrics.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs text-gray-600 w-5">{idx + 1}</span>
                    <input className="input text-xs py-1 flex-1" placeholder="Metric label" value={m.label} onChange={e => updateMetric(idx, "label", e.target.value)} />
                    <input className="input text-xs py-1 w-20" type="number" step="any" value={m.value} onChange={e => updateMetric(idx, "value", Number(e.target.value))} />
                    <select className="text-xs bg-gray-800 text-gray-300 rounded px-1 py-1 border border-gray-700 w-16" value={m.format} onChange={e => updateMetric(idx, "format", e.target.value as any)}>
                      {FORMAT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <button type="button" onClick={() => removeMetric(idx)} className="p-1 text-gray-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
              <div><label className="label">Notes</label><textarea className="input" rows={2} placeholder="Key observations..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <div><label className="label">Tags (comma-separated)</label><input className="input" placeholder="e.g. week-1, launch, q3" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Save Snapshot"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* View snapshot modal */}
      {viewingSnap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setViewingId(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-lg font-semibold text-white">{viewingSnap.name}</h3><p className="text-sm text-gray-500">{viewingSnap.campaignName}</p></div>
              <button onClick={() => setViewingId(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-400 mb-4">{viewingSnap.description}</p>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {viewingSnap.metrics.map((m, i) => (
                <div key={i} className="card p-3 text-center">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">{m.label}</p>
                  <p className="text-lg font-bold text-white mt-1">{fmtValue(m.value, m.format)}</p>
                </div>
              ))}
            </div>
            {viewingSnap.notes && (
              <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{viewingSnap.notes}</p>
              </div>
            )}
            {viewingSnap.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {viewingSnap.tags.map(t => <span key={t} className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded border border-gray-700">{t}</span>)}
              </div>
            )}
            <p className="text-xs text-gray-600">Captured {new Date(viewingSnap.createdAt).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Camera className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No snapshots yet</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Save snapshots of campaign performance at key moments."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Snapshot</button>}
        </div>
      )}

      {/* Cards */}
      {filtered.map(s => (
        <div key={s.id} className="card p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-n0va-500/10"><Camera className="w-5 h-5 text-n0va-400" /></div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white cursor-pointer hover:text-n0va-400" onClick={() => setViewingId(s.id)}>{s.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{s.description} · Campaign: {s.campaignName}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-600 flex-wrap">
                <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {s.metrics.length} metrics</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {s.metrics.slice(0, 4).map((m, i) => (
                  <div key={i} className="bg-gray-800/50 rounded p-1.5 text-center">
                    <p className="text-[9px] text-gray-600">{m.label}</p>
                    <p className="text-xs font-semibold text-white">{fmtValue(m.value, m.format)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => setViewingId(s.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><Eye className="w-3.5 h-3.5" /></button>
              <button onClick={() => cloneSnapshot(s.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><Copy className="w-3.5 h-3.5" /></button>
              <button onClick={() => { resetForm(s); setEditingId(s.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
