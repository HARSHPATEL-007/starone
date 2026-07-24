import { useState, useEffect } from "react";
import { Image, Video, File, Link, Plus, X, Search, Copy, Check, Trash2, ExternalLink, FolderOpen, LayoutGrid, List, RefreshCw } from "lucide-react";
import { useToast } from "../components/Toast";

interface Asset {
  id: string;
  name: string;
  url: string;
  type: "image" | "video" | "document" | "other";
  tags: string[];
  addedAt: string;
  viewCount: number;
}

const STORAGE_KEY = "n0va_content_library";
const DEFAULT_ASSETS: Asset[] = [
  { id: "demo-1", name: "Hero Banner", url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80", type: "image", tags: ["banner", "hero"], addedAt: new Date().toISOString(), viewCount: 12 },
  { id: "demo-2", name: "Product Shot", url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80", type: "image", tags: ["product", "lifestyle"], addedAt: new Date().toISOString(), viewCount: 8 },
  { id: "demo-3", name: "Brand Logo", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80", type: "image", tags: ["logo", "brand"], addedAt: new Date().toISOString(), viewCount: 24 },
];

function loadAssets(): Asset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ASSETS));
    return DEFAULT_ASSETS;
  } catch { return []; }
}

const typeIcons: Record<string, any> = { image: Image, video: Video, document: File, other: Link };
const typeColors: Record<string, string> = { image: "bg-blue-500/10 text-blue-400", video: "bg-purple-500/10 text-purple-400", document: "bg-amber-500/10 text-amber-400", other: "bg-gray-500/10 text-gray-400" };

export default function ContentLibrary() {
  const { addToast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", url: "", type: "image" as Asset["type"], tags: "" });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => { setAssets(loadAssets()); }, []);

  function persist(updated: Asset[]) {
    setAssets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function handleAdd() {
    if (!addForm.name.trim() || !addForm.url.trim()) { addToast("error", "Name and URL are required"); return; }
    const asset: Asset = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: addForm.name.trim(),
      url: addForm.url.trim(),
      type: addForm.type,
      tags: addForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
      addedAt: new Date().toISOString(),
      viewCount: 0,
    };
    persist([asset, ...assets]);
    setAddForm({ name: "", url: "", type: "image", tags: "" });
    setShowAdd(false);
    addToast("success", `"${asset.name}" added to library`);
  }

  function handleDelete(id: string) {
    const updated = assets.filter((a) => a.id !== id);
    persist(updated);
    addToast("success", "Asset removed from library");
  }

  function copyUrl(id: string, url: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    setAssets((prev) => prev.map((a) => a.id === id ? { ...a, viewCount: a.viewCount + 1 } : a));
  }

  function resetToDefaults() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ASSETS));
    setAssets([...DEFAULT_ASSETS]);
    addToast("success", "Reset to default assets");
  }

  const filtered = assets.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !a.tags.some((t) => t.toLowerCase().includes(q))) return false;
    }
    if (filterType !== "all" && a.type !== filterType) return false;
    return true;
  });

  const types = [...new Set(assets.map((a) => a.type))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FolderOpen className="w-6 h-6 text-n0va-400" />
            Content Library
          </h1>
          <p className="text-gray-400 mt-1">{assets.length} assets · {filtered.length} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-n0va-500/10 text-n0va-400" : "text-gray-500 hover:text-gray-300"}`}><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg ${viewMode === "list" ? "bg-n0va-500/10 text-n0va-400" : "text-gray-500 hover:text-gray-300"}`}><List className="w-4 h-4" /></button>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Asset</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm" placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {(search || filterType !== "all") && (
          <button onClick={() => { setSearch(""); setFilterType("all"); }} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>
        )}
        <button onClick={resetToDefaults} className="btn-ghost text-xs flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Reset</button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Asset</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input className="input" placeholder="e.g. Hero Banner" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} autoFocus />
              </div>
              <div>
                <label className="label">URL</label>
                <input className="input" placeholder="https://example.com/image.jpg" value={addForm.url} onChange={(e) => setAddForm({ ...addForm, url: e.target.value })} />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" value={addForm.type} onChange={(e) => setAddForm({ ...addForm, type: e.target.value as Asset["type"] })}>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Tags (comma-separated)</label>
                <input className="input" placeholder="e.g. banner, hero, campaign" value={addForm.tags} onChange={(e) => setAddForm({ ...addForm, tags: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add to Library</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <FolderOpen className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No assets found</h3>
          <p className="text-sm text-gray-500 max-w-sm">{search ? "Try different search terms" : "Add your first asset to get started."}</p>
          {!search && <button onClick={() => setShowAdd(true)} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Add Asset</button>}
        </div>
      )}

      {/* Grid view */}
      {filtered.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((asset) => {
            const Icon = typeIcons[asset.type];
            const colorClass = typeColors[asset.type];
            return (
              <div key={asset.id} className="card group relative overflow-hidden">
                <div className="aspect-[4/3] bg-gray-800/50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  {asset.type === "image" ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.classList.add("fallback"); }} />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-600">
                      <Icon className="w-10 h-10" />
                      <span className="text-xs">{asset.type}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white truncate">{asset.name}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colorClass}`}>{asset.type}</span>
                    <span className="text-[10px] text-gray-600">{asset.viewCount} views</span>
                  </div>
                  {asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {asset.tags.slice(0, 3).map((t) => <span key={t} className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{t}</span>)}
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl">
                  <a href={asset.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700"><ExternalLink className="w-4 h-4 text-gray-300" /></a>
                  <button onClick={() => copyUrl(asset.id, asset.url)} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700">{copiedId === asset.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-300" />}</button>
                  <button onClick={() => handleDelete(asset.id)} className="p-2 bg-gray-800 rounded-lg hover:bg-red-900/50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {filtered.length > 0 && viewMode === "list" && (
        <div className="space-y-1">
          {filtered.map((asset) => {
            const Icon = typeIcons[asset.type];
            const colorClass = typeColors[asset.type];
            return (
              <div key={asset.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800/50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {asset.type === "image" ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.classList.add("fallback"); }} />
                  ) : <Icon className="w-5 h-5 text-gray-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{asset.name}</p>
                  <p className="text-xs text-gray-500 truncate">{asset.url}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>{asset.type}</span>
                <span className="text-xs text-gray-600">{asset.viewCount} views</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={asset.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-500 hover:text-gray-300"><ExternalLink className="w-3.5 h-3.5" /></a>
                  <button onClick={() => copyUrl(asset.id, asset.url)} className="p-1.5 text-gray-500 hover:text-gray-300">{copiedId === asset.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}</button>
                  <button onClick={() => handleDelete(asset.id)} className="p-1.5 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
