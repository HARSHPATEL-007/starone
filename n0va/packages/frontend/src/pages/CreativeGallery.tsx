import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LayoutGrid, List, Search, Image, Video, Film, Type, RefreshCw, Trash2, Copy, ExternalLink, Filter, X, Eye } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const formatIcons: Record<string, any> = { image: Image, video: Video, carousel: Film, text: Type };
const formatColors: Record<string, string> = { image: "bg-blue-500/10 text-blue-400", video: "bg-purple-500/10 text-purple-400", carousel: "bg-amber-500/10 text-amber-400", text: "bg-gray-500/10 text-gray-400" };

export default function CreativeGallery() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try { setCreatives(await api.creatives.list()); }
    catch { addToast("error", "Failed to load creatives"); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string, name: string) {
    try { await api.creatives.delete(id); addToast("success", `"${name}" deleted`); loadData(); }
    catch { addToast("error", "Failed to delete"); }
  }

  async function handleClone(id: string) {
    try {
      const orig = await api.creatives.get(id);
      await api.creatives.create({ name: `${orig.name} (Copy)`, type: orig.type, headline: orig.headline, body: orig.body, cta: orig.cta, assetUrl: orig.assetUrl, tags: orig.tags || [] });
      addToast("success", "Creative cloned"); loadData();
    } catch { addToast("error", "Failed to clone"); }
  }

  const filtered = creatives.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.name?.toLowerCase().includes(q) && !c.headline?.toLowerCase().includes(q) && !c.body?.toLowerCase().includes(q)) return false;
    }
    if (filterType !== "all" && c.type !== filterType) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  const types = [...new Set(creatives.map((c) => c.type).filter(Boolean))];
  const statuses = [...new Set(creatives.map((c) => c.status).filter(Boolean))];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between"><div><div className="h-8 w-48 bg-gray-800 rounded animate-pulse" /><div className="h-4 w-64 bg-gray-800 rounded animate-pulse mt-2" /></div></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <LayoutGrid className="w-6 h-6 text-n0va-400" />
            Creative Gallery
          </h1>
          <p className="text-gray-400 mt-1">Visual library of all ad creatives — {filtered.length} of {creatives.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-n0va-500/10 text-n0va-400" : "text-gray-500 hover:text-gray-300"}`} title="Grid view"><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-n0va-500/10 text-n0va-400" : "text-gray-500 hover:text-gray-300"}`} title="List view"><List className="w-4 h-4" /></button>
          <button onClick={loadData} className="btn-ghost text-sm flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm" placeholder="Search creatives..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input text-sm w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || filterType !== "all" || filterStatus !== "all") && (
          <button onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); }} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"><X className="w-3 h-3" /> Clear</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Eye className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No creatives found</h3>
          <p className="text-sm text-gray-500 max-w-sm">{search ? "Try different search terms" : "Create your first creative to see it here."}</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((c) => {
            const FormatIcon = formatIcons[c.type] || Image;
            const fmtColor = formatColors[c.type] || formatColors.image;
            const id = c._id || c.id;
            return (
              <div key={id} className="card group relative overflow-hidden animate-slide-up">
                {/* Preview area */}
                <div className="aspect-[4/3] bg-gray-800/50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  {c.assetUrl ? (
                    c.type === "video" ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-gray-900">
                        <Video className="w-10 h-10 text-gray-700" />
                        <span className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-900/80 px-2 py-0.5 rounded">{c.type}</span>
                      </div>
                    ) : (
                      <img src={c.assetUrl} alt={c.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).style.display = "none"; }} />
                    )
                  ) : (
                    <div className="text-center p-4">
                      <FormatIcon className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                      <p className="text-xs text-gray-600 line-clamp-3">{c.body || c.headline || "No preview"}</p>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/creatives/${id}`} className="text-sm font-medium text-white hover:text-n0va-400 truncate flex-1">{c.name}</Link>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${fmtColor}`}>{c.type}</span>
                  </div>
                  {c.headline && <p className="text-xs text-gray-400 truncate">{c.headline}</p>}
                  {c.cta && <span className="text-[11px] text-n0va-400 bg-n0va-500/10 px-2 py-0.5 rounded-full inline-block">{c.cta}</span>}
                  <div className="flex items-center gap-2 pt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      c.status === "active" ? "bg-green-900/50 text-green-300" :
                      c.status === "draft" ? "bg-gray-700 text-gray-300" :
                      c.status === "pending_approval" ? "bg-amber-900/50 text-amber-300" :
                      c.status === "approved" ? "bg-blue-900/50 text-blue-300" :
                      c.status === "rejected" ? "bg-red-900/50 text-red-300" :
                      "bg-gray-800 text-gray-500"
                    }`}>{c.status}</span>
                    {c.tags?.length > 0 && <span className="text-[10px] text-gray-600 truncate flex-1 text-right">{c.tags.slice(0, 2).join(", ")}{c.tags.length > 2 ? ` +${c.tags.length - 2}` : ""}</span>}
                  </div>
                </div>

                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl">
                  <Link to={`/creatives/${id}`} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors" title="View"><Eye className="w-4 h-4 text-gray-300" /></Link>
                  <button onClick={() => handleClone(id)} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors" title="Clone"><Copy className="w-4 h-4 text-gray-300" /></button>
                  <button onClick={() => handleDelete(id, c.name)} className="p-2 bg-gray-800 rounded-lg hover:bg-red-900/50 transition-colors" title="Delete"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  <Link to={`/creatives/${id}`} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors" title="Open"><ExternalLink className="w-4 h-4 text-gray-300" /></Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="space-y-1">
          {filtered.map((c) => {
            const FormatIcon = formatIcons[c.type] || Image;
            const id = c._id || c.id;
            return (
              <div key={id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800/50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                  {c.assetUrl && c.type !== "video" ? <img src={c.assetUrl} alt="" className="w-full h-full object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <FormatIcon className="w-5 h-5 text-gray-600" />}
                </div>
                <Link to={`/creatives/${id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.name}</p>
                  <p className="text-xs text-gray-500 truncate">{c.headline || c.body || "—"}</p>
                </Link>
                <span className={`text-xs px-2 py-0.5 rounded-full ${formatColors[c.type] || formatColors.image}`}>{c.type}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  c.status === "active" ? "bg-green-900/50 text-green-300" :
                  c.status === "draft" ? "bg-gray-700 text-gray-300" :
                  c.status === "pending_approval" ? "bg-amber-900/50 text-amber-300" :
                  "bg-gray-800 text-gray-500"
                }`}>{c.status}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link to={`/creatives/${id}`} className="p-1.5 text-gray-500 hover:text-gray-300"><Eye className="w-3.5 h-3.5" /></Link>
                  <button onClick={() => handleClone(id)} className="p-1.5 text-gray-500 hover:text-gray-300"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(id, c.name)} className="p-1.5 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
