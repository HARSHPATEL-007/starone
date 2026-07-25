import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Camera, Plus, X, Edit3, Trash2, Copy, Search, Calendar, BarChart3, DollarSign, Target, Eye, Download, Clock, TrendingUp, Users, GitCompare, Activity } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

interface SnapshotMetric {
  label: string;
  value: number;
  format: "number" | "currency" | "percent" | "rate";
}

interface CampaignSnapshot {
  _id?: string;
  id: string;
  name: string;
  description: string;
  campaignName: string;
  metrics: SnapshotMetric[];
  notes: string;
  createdAt: string;
  tags: string[];
}

function fmtValue(val: number, format: string): string {
  if (format === "currency") return "$" + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (format === "percent") return val.toFixed(2) + "%";
  if (format === "rate") return val.toFixed(2) + "x";
  return val.toLocaleString();
}

const FORMAT_OPTIONS = ["number", "currency", "percent", "rate"] as const;

const METRIC_LABELS: Record<string, string> = {
  impressions: "Impressions", clicks: "Clicks", conversions: "Conversions",
  spend: "Spend", revenue: "Revenue", ctr: "CTR", cpc: "CPC", roas: "ROAS", cvr: "CVR",
};

export default function CampaignSnapshots() {
  const { addToast } = useToast();
  const [snapshots, setSnapshots] = useState<CampaignSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparison, setComparison] = useState<any>(null);
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

  async function loadSnapshots() {
    setLoading(true);
    try {
      const data = await api.entities.list("campaign_snapshots");
      setSnapshots(data || []);
    } catch (e: any) {
      addToast("error", "Failed to load snapshots");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSnapshots(); }, []);

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

  async function handleSave() {
    if (!form.name.trim() || !form.campaignName.trim()) { addToast("error", "Name and campaign name required"); return; }
    const now = new Date().toISOString();
    const snap: CampaignSnapshot = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: form.name.trim(), description: form.description.trim(), campaignName: form.campaignName.trim(),
      metrics: form.metrics.filter(m => m.label.trim()).map(m => ({ ...m })),
      notes: form.notes.trim(), tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      createdAt: editingId ? snapshots.find(s => s.id === editingId)!.createdAt : now,
    };
    try {
      if (editingId) {
        await api.entities.update("campaign_snapshots", editingId, snap as any);
        addToast("success", "Snapshot updated");
      } else {
        await api.entities.create("campaign_snapshots", snap as any);
        addToast("success", "Snapshot saved");
      }
      await loadSnapshots();
    } catch {
      addToast("error", "Failed to save snapshot");
    }
    setShowForm(false);
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const name = snapshots.find(s => s.id === id)?.name;
    try {
      await api.snapshots.delete(id);
      if (viewingId === id) setViewingId(null);
      await loadSnapshots();
      addToast("success", `"${name}" deleted`);
    } catch {
      addToast("error", "Failed to delete snapshot");
    }
  }

  async function cloneSnapshot(id: string) {
    const s = snapshots.find(sn => sn.id === id);
    if (!s) return;
    const copy: CampaignSnapshot = { ...s, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: `${s.name} (Copy)`, createdAt: new Date().toISOString() };
    try {
      await api.entities.create("campaign_snapshots", copy as any);
      await loadSnapshots();
      addToast("success", "Snapshot duplicated");
    } catch {
      addToast("error", "Failed to duplicate snapshot");
    }
  }

  async function handleCompare() {
    if (selectedForCompare.length !== 2) { addToast("error", "Select exactly 2 snapshots to compare"); return; }
    try {
      const result = await api.snapshots.compare(selectedForCompare[0], selectedForCompare[1]);
      setComparison(result);
    } catch {
      addToast("error", "Failed to compare snapshots");
    }
  }

  async function handleAutoCapture() {
    try {
      const result = await api.snapshots.autoCapture();
      addToast("success", `Captured ${result.count || result.captured || "new"} snapshots`);
      await loadSnapshots();
    } catch {
      addToast("error", "Auto-capture failed");
    }
  }

  function toggleCompareSelection(id: string) {
    setSelectedForCompare(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  }

  function closeComparison() {
    setComparison(null);
    setSelectedForCompare([]);
    setCompareMode(false);
  }

  const filtered = snapshots.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.campaignName.toLowerCase().includes(search.toLowerCase()) || s.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));
  const viewingSnap = viewingId ? snapshots.find(s => s.id === viewingId) : null;

  function exportSnapshotsCSV() {
    const header = "Name,Campaign,Description,Metrics,Notes,Tags,Created";
    const rows = snapshots.map(s => `"${s.name}","${s.campaignName}","${s.description.replace(/"/g, '""')}","${s.metrics.map(m => `${m.label}: ${m.value}${m.format === "currency" ? "$" : m.format === "percent" ? "%" : m.format === "rate" ? "x" : ""}`).join("; ")}","${s.notes.replace(/"/g, '""')}","${s.tags.join("; ")}","${new Date(s.createdAt).toLocaleDateString()}"`).join("\n");
    const blob = new Blob(["\ufeff" + header + "\n" + rows], { type: "text/csv;charset=utf-8" });
    const el = document.createElement("a"); el.href = URL.createObjectURL(blob); el.download = "snapshots.csv"; el.click();
    addToast("success", "Snapshots exported");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Camera className="w-6 h-6 text-n0va-400" />
              Campaign Snapshots
            </h1>
          </div>
        </div>
        <div className="card p-12 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-n0va-400 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          <button onClick={handleAutoCapture} className="btn-ghost text-xs flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Auto-Capture</button>
          <button onClick={() => { setCompareMode(!compareMode); setSelectedForCompare([]); setComparison(null); }} className={`btn-ghost text-xs flex items-center gap-1 ${compareMode ? "text-n0va-400" : ""}`}><GitCompare className="w-3.5 h-3.5" /> Compare</button>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Snapshot</button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search snapshots..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={exportSnapshotsCSV} className="btn-ghost text-xs flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Export CSV</button>
        {compareMode && (
          <button onClick={handleCompare} className="btn-primary text-xs flex items-center gap-1" disabled={selectedForCompare.length !== 2}>
            <GitCompare className="w-3.5 h-3.5" /> Compare Selected
          </button>
        )}
      </div>

      {/* Comparison result */}
      {comparison && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2"><GitCompare className="w-4 h-4 text-n0va-400" /> Snapshot Comparison</h3>
            <button onClick={closeComparison} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          {comparison.summary && (
            <div className="bg-n0va-500/10 border border-n0va-500/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-n0va-300">{comparison.summary}</p>
            </div>
          )}
          <div className="flex items-center gap-6 text-xs text-gray-500 mb-4">
            <span>Before: <strong className="text-white">{comparison.snapshot1?.name || comparison.snapshot1}</strong></span>
            <span>After: <strong className="text-white">{comparison.snapshot2?.name || comparison.snapshot2}</strong></span>
          </div>
          {comparison.diff && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-500 font-medium py-2 pr-4">Metric</th>
                    <th className="text-right text-gray-500 font-medium py-2 px-4">Before</th>
                    <th className="text-right text-gray-500 font-medium py-2 px-4">After</th>
                    <th className="text-right text-gray-500 font-medium py-2 px-4">Change</th>
                    <th className="text-right text-gray-500 font-medium py-2 pl-4">Change %</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(comparison.diff).map(([key, val]: any) => {
                    if (!val || typeof val !== "object" || val.change === undefined) return null;
                    const pos = val.change > 0;
                    const isPct = key === "ctr" || key === "cvr" || key === "roas";
                    return (
                      <tr key={key} className="border-b border-gray-800/50">
                        <td className="py-2 pr-4 text-gray-300 capitalize">{METRIC_LABELS[key] || key}</td>
                        <td className={`text-right py-2 px-4 text-white`}>{isPct ? `${val.before}%` : fmtValue(val.before, key === "spend" || key === "revenue" ? "currency" : "number")}</td>
                        <td className={`text-right py-2 px-4 text-white`}>{isPct ? `${val.after}%` : fmtValue(val.after, key === "spend" || key === "revenue" ? "currency" : "number")}</td>
                        <td className={`text-right py-2 px-4 font-medium ${pos ? "text-green-400" : val.change < 0 ? "text-red-400" : "text-gray-400"}`}>
                          {pos ? "+" : ""}{isPct ? `${val.change}%` : fmtValue(Math.abs(val.change), key === "spend" || key === "revenue" ? "currency" : "number")}
                        </td>
                        <td className={`text-right py-2 pl-4 font-medium ${pos ? "text-green-400" : val.changePercent < 0 ? "text-red-400" : "text-gray-400"}`}>
                          {val.changePercent > 0 ? "+" : ""}{Number(val.changePercent).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {snapshots.length > 1 && !comparison && (
        <div className="card">
          <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5 text-n0va-400" /> Metric Comparison (latest snapshots)</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(() => {
                const snap = [...snapshots].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);
                return snap.map(s => ({ name: s.name.length > 12 ? s.name.substring(0, 12) + "..." : s.name, Metrics: s.metrics.length }));
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={9} />
                <YAxis stroke="#6b7280" fontSize={9} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                <Bar dataKey="Metrics" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
            {compareMode && (
              <div className="pt-2">
                <input
                  type="checkbox"
                  checked={selectedForCompare.includes(s.id)}
                  onChange={() => toggleCompareSelection(s.id)}
                  className="w-4 h-4 accent-n0va-500"
                />
              </div>
            )}
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
