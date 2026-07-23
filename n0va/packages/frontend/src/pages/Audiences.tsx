import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users, Search, Download, Filter, TrendingUp, DollarSign, Target, CheckSquare, Square } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { useCsvExport } from "../hooks/useCsvExport";
import { SkeletonRow } from "../components/Skeleton";

export default function Audiences() {
  const { addToast } = useToast();
  const { exportToCsv } = useCsvExport();
  const [audiences, setAudiences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [form, setForm] = useState({ name: "", description: "", type: "custom", platform: "meta", criteria: "", tags: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");

  useEffect(() => { loadAudiences(); }, []);

  async function loadAudiences() {
    setLoading(true);
    try { setAudiences(await api.audiences.list()); } finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.audiences.create({
        ...form,
        criteria: form.criteria ? JSON.parse(form.criteria) : {},
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setShowCreate(false);
      setForm({ name: "", description: "", type: "custom", platform: "meta", criteria: "", tags: "" });
      addToast("success", "Audience created");
      loadAudiences();
    } catch { addToast("error", "Failed to create audience"); }
  }

  async function handleDelete(id: string) {
    try { await api.audiences.delete(id); setDeleteId(null); addToast("success", "Deleted"); loadAudiences(); }
    catch { addToast("error", "Failed to delete"); }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    try { await Promise.all(Array.from(selected).map((id) => api.audiences.delete(id))); addToast("success", `${selected.size} audiences deleted`); setSelected(new Set()); loadAudiences(); } catch { addToast("error", "Bulk delete failed"); }
  }

  function toggleSelect(id: string) { setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }
  function toggleAll() { setSelected(new Set(selected.size === filtered.length ? [] : filtered.map((a) => a._id))); }

  function handleExport() {
    if (audiences.length === 0) return;
    const data = audiences.map((a: any) => ({
      Name: a.name,
      Type: a.type,
      Platform: a.platform,
      Size: a.size || 0,
      Status: a.status,
      Description: a.description || "",
      Impressions: a.performance?.impressions || 0,
      Conversions: a.performance?.conversions || 0,
      ROAS: a.performance?.roas || 0,
      Tags: (a.tags || []).join("; "),
    }));
    exportToCsv(data, "audiences_export");
    addToast("success", "Audiences exported");
  }

  const filtered = audiences.filter((a) => {
    if (filterType !== "all" && a.type !== filterType) return false;
    if (filterPlatform !== "all" && a.platform !== filterPlatform) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !(a.description || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const typeColors: Record<string, string> = { lookalike: "text-purple-400", retargeting: "text-blue-400", custom: "text-green-400", saved: "text-gray-400" };
  const statusBadge: Record<string, string> = { active: "badge-active", paused: "badge-paused", building: "badge-draft" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audiences</h1>
          <p className="text-gray-500 mt-1">Manage audience segments for targeting</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={handleExport} disabled={audiences.length === 0}>
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Audience
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input className="input pl-10" placeholder="Search audiences..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", "custom", "lookalike", "retargeting", "saved"].map((t) => (
          <button key={t} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${filterType === t ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500"}`} onClick={() => setFilterType(t)}>
            {t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div className="w-px h-6 bg-gray-800 mx-2" />
        {["all", "meta", "google", "linkedin", "tiktok"].map((p) => (
          <button key={p} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${filterPlatform === p ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500"}`} onClick={() => setFilterPlatform(p)}>
            {p === "all" ? "All Platforms" : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-n0va-600/10 border border-n0va-600/30 rounded-lg">
          <span className="text-sm text-gray-300">{selected.size} selected</span>
          <button className="btn-danger text-xs py-1.5" onClick={handleBulkDelete}>Delete All</button>
          <button className="btn-secondary text-xs py-1.5" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="card w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Create Audience</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="custom">Custom</option>
                    <option value="lookalike">Lookalike</option>
                    <option value="retargeting">Retargeting</option>
                    <option value="saved">Saved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Platform</label>
                  <select className="select" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                    <option value="meta">Meta</option>
                    <option value="google">Google</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Criteria (JSON)</label>
                <textarea className="input font-mono text-xs" rows={3} value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} placeholder='{"age_range": "25-45"}' />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tags (comma)</label>
                <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="high-value, retargeting" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No audience segments match your filters.</p>
        </div>
      ) : (
        <><div className="flex items-center gap-2 mb-3 px-1">
          <button onClick={toggleAll} className="text-gray-500 hover:text-white text-xs flex items-center gap-1.5">
            {selected.size === filtered.length ? <CheckSquare className="w-4 h-4 text-n0va-400" /> : <Square className="w-4 h-4" />}
            <span>{selected.size === filtered.length ? "Deselect all" : "Select all"}</span>
          </button>
        </div>
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a._id} className={`card hover:border-gray-700 transition-colors ${selected.has(a._id) ? "border-n0va-600/40" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button onClick={() => toggleSelect(a._id)} className="mt-1 text-gray-500 hover:text-white shrink-0">
                    {selected.has(a._id) ? <CheckSquare className="w-4 h-4 text-n0va-400" /> : <Square className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Link to={`/audiences/${a._id}`} className="text-white font-semibold hover:text-n0va-400">{a.name}</Link>
                    <span className={`text-xs font-medium ${typeColors[a.type] || ""}`}>{a.type}</span>
                    <span className="text-xs text-gray-500">{a.platform}</span>
                    <span className={statusBadge[a.status] || "badge-draft"}>{a.status}</span>
                  </div>
                  {a.description && <p className="text-sm text-gray-500 mb-2">{a.description}</p>}
                  {a.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {a.tags.map((tag: string) => <span key={tag} className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{tag}</span>)}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right ml-4">
                  <p className="text-lg font-bold text-white">{a.size?.toLocaleString() || 0}</p>
                  <p className="text-xs text-gray-500">users</p>
                </div>
              </div>
              {a.performance && (
                <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-6 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-n0va-400" /> {a.performance.impressions?.toLocaleString() || 0} impressions</span>
                  <span className="flex items-center gap-1"><Target className="w-3 h-3 text-green-400" /> {a.performance.conversions || 0} conversions</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-yellow-400" /> {a.performance.roas?.toFixed(2) || "0.00"}x ROAS</span>
                  <button className="btn-secondary text-xs py-1 ml-auto" onClick={() => setDeleteId(a._id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
        </>)}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Delete Audience</h3>
            <p className="text-sm text-gray-400 mb-4">Are you sure you want to delete this audience?</p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
