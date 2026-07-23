import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Palette, Search, Copy, Download, Image, Video, Layout, AlignLeft, CheckSquare, Square } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { useCsvExport } from "../hooks/useCsvExport";
import { SkeletonCard } from "../components/Skeleton";

export default function Creatives() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { exportToCsv } = useCsvExport();
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [form, setForm] = useState({ name: "", type: "image", headline: "", body: "", cta: "", tags: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");

  useEffect(() => { loadCreatives(); }, []);

  async function loadCreatives() {
    setLoading(true);
    try { setCreatives(await api.creatives.list()); } finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.creatives.create({ ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) });
      setShowCreate(false);
      setForm({ name: "", type: "image", headline: "", body: "", cta: "", tags: "" });
      addToast("success", "Creative created");
      loadCreatives();
    } catch { addToast("error", "Failed to create creative"); }
  }

  async function handleStatus(id: string, status: string) {
    try {
      await api.creatives.updateStatus(id, status);
      addToast("success", `Creative ${status}`);
      loadCreatives();
    } catch { addToast("error", `Failed to update`); }
  }

  async function handleDelete(id: string) {
    try { await api.creatives.delete(id); setDeleteId(null); addToast("success", "Deleted"); loadCreatives(); }
    catch { addToast("error", "Failed to delete"); }
  }

  async function handleBulkStatus() {
    if (!bulkStatus || selected.size === 0) return;
    try { await Promise.all(Array.from(selected).map((id) => api.creatives.updateStatus(id, bulkStatus))); addToast("success", `${selected.size} creatives ${bulkStatus}`); setSelected(new Set()); setBulkStatus(""); loadCreatives(); } catch { addToast("error", "Bulk update failed"); }
  }

  function toggleSelect(id: string) { setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }
  function toggleAll() { setSelected(new Set(selected.size === filtered.length ? [] : filtered.map((c) => c._id))); }

  function handleExport() {
    if (creatives.length === 0) return;
    const data = creatives.map((c: any) => ({
      Name: c.name,
      Type: c.type,
      Status: c.status,
      Headline: c.headline || "",
      CTA: c.cta || "",
      Impressions: c.performance?.impressions || 0,
      CTR: c.performance?.ctr || 0,
      Tags: (c.tags || []).join("; "),
    }));
    exportToCsv(data, "creatives_export");
    addToast("success", "Creatives exported");
  }

  const filtered = creatives.filter((c) => {
    if (filterType !== "all" && c.type !== filterType) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const typeIcons: Record<string, any> = { image: Image, video: Video, carousel: Layout, text: AlignLeft };
  const typeColors: Record<string, string> = { image: "text-blue-400", video: "text-purple-400", carousel: "text-orange-400", text: "text-green-400" };
  const statusBadge: Record<string, string> = { draft: "badge-draft", approved: "badge-active", active: "badge-active", paused: "badge-paused", rejected: "badge-archived", pending_approval: "badge-paused" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Creatives</h1>
          <p className="text-gray-500 mt-1">Manage your ad creatives and assets</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={handleExport} disabled={creatives.length === 0}>
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Creative
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input className="input pl-10" placeholder="Search creatives..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", "image", "video", "carousel", "text"].map((t) => (
          <button key={t} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${filterType === t ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500"}`} onClick={() => setFilterType(t)}>
            {t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div className="w-px h-6 bg-gray-800 mx-2" />
        {["all", "draft", "pending_approval", "approved", "active", "paused", "rejected"].map((s) => (
          <button key={s} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${filterStatus === s ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500"}`} onClick={() => setFilterStatus(s)}>
            {s === "all" ? "All Status" : s.replace("_", " ").charAt(0).toUpperCase() + s.replace("_", " ").slice(1)}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-n0va-600/10 border border-n0va-600/30 rounded-lg">
          <span className="text-sm text-gray-300">{selected.size} selected</span>
          <select className="select text-xs py-1" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
            <option value="">Action...</option>
            <option value="active">Activate</option>
            <option value="paused">Pause</option>
            <option value="approved">Approve</option>
            <option value="rejected">Reject</option>
          </select>
          <button className="btn-primary text-xs py-1.5" onClick={handleBulkStatus} disabled={!bulkStatus}>Apply</button>
          <button className="btn-secondary text-xs py-1.5" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="card w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Create Creative</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="carousel">Carousel</option>
                    <option value="text">Text</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Headline</label>
                <input className="input" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Body</label>
                <textarea className="input" rows={2} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">CTA</label>
                  <input className="input" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder="Learn More" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tags (comma)</label>
                  <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tag1, tag2" />
                </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Palette className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No creatives match your filters.</p>
        </div>
      ) : (
        <><div className="flex items-center gap-2 mb-3 px-1">
          <button onClick={toggleAll} className="text-gray-500 hover:text-white text-xs flex items-center gap-1.5">
            {selected.size === filtered.length ? <CheckSquare className="w-4 h-4 text-n0va-400" /> : <Square className="w-4 h-4" />}
            <span>{selected.size === filtered.length ? "Deselect all" : "Select all"}</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const TypeIcon = typeIcons[c.type] || Image;
            return (
              <div key={c._id} className={`card hover:border-gray-700 transition-colors ${selected.has(c._id) ? "border-n0va-600/40" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <button onClick={() => toggleSelect(c._id)} className="text-gray-500 hover:text-white mr-2 shrink-0">
                    {selected.has(c._id) ? <CheckSquare className="w-4 h-4 text-n0va-400" /> : <Square className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-2">
                    <TypeIcon className={`w-4 h-4 ${typeColors[c.type] || ""}`} />
                    <span className={`text-xs font-medium uppercase ${typeColors[c.type] || ""}`}>{c.type}</span>
                  </div>
                  <span className={statusBadge[c.status] || "badge-draft"}>{c.status.replace("_", " ")}</span>
                </div>
                <Link to={`/creatives/${c._id}`} className="text-white font-semibold hover:text-n0va-400 mb-1 block">{c.name}</Link>
                {c.headline && <p className="text-sm text-gray-400 mb-2 line-clamp-2">{c.headline}</p>}
                {c.cta && <span className="text-xs text-n0va-400 bg-n0va-600/10 px-2 py-0.5 rounded">{c.cta}</span>}
                {c.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.tags.slice(0, 3).map((tag: string) => <span key={tag} className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{tag}</span>)}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between text-xs text-gray-500">
                  <span>{c.performance?.impressions?.toLocaleString() || 0} impressions</span>
                  <span>{c.performance?.ctr?.toFixed(2) || 0}% CTR</span>
                </div>
                <div className="mt-3 flex gap-2">
                  {c.status === "draft" && <button className="btn-primary text-xs py-1 flex-1" onClick={() => handleStatus(c._id, "active")}>Activate</button>}
                  {c.status === "active" && <button className="btn-secondary text-xs py-1 flex-1" onClick={() => handleStatus(c._id, "paused")}>Pause</button>}
                  {c.status === "paused" && <button className="btn-primary text-xs py-1 flex-1" onClick={() => handleStatus(c._id, "active")}>Resume</button>}
                  <button className="btn-secondary text-xs py-1" onClick={() => setDeleteId(c._id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
        </>)}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Delete Creative</h3>
            <p className="text-sm text-gray-400 mb-4">Are you sure you want to delete this creative?</p>
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
