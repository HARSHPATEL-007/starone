import { useEffect, useState, useCallback } from "react";
import {
  Share2, RefreshCw, Boxes, FolderTree, Link2, Search, X, Grid3X3,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function N0VA1OCatalog() {
  const { addToast } = useToast();
  const [catalog, setCatalog] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searchInfo, setSearchInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadData = useCallback(async () => {
    const c = unwrap((await api.adsMarketingModule.n0va1oGatewayCatalog().catch(() => null)) || null);
    setCatalog(c);
    setResults((prev) => (prev.length ? prev : (c?.platforms || []).slice(0, 50)));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const refresh = () => loadData();
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadData]);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  async function doSearch() {
    setBusy("search");
    try {
      const r = unwrap(await api.adsMarketingModule.n0va1oCatalogSearch(query, category || undefined));
      setResults(r.results || []);
      setSearchInfo(r);
    } catch (e: any) {
      addToast("error", "Search failed", e?.message);
    } finally {
      setBusy("");
    }
  }

  function clearSearch() {
    setQuery("");
    setSearchInfo(null);
    setResults((catalog?.platforms || []).slice(0, 50));
  }

  const cats = catalog?.categories || [];
  const stats = [
    { label: "Platforms", value: catalog?.totalPlatforms ?? 0, icon: Boxes },
    { label: "Categories", value: cats.length, icon: FolderTree },
    { label: "Connections", value: catalog?.totalConnections ?? 0, icon: Link2 },
    { label: "Connected", value: (catalog?.platforms || []).filter((p: any) => p.status === "connected").length, icon: Grid3X3 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Share2 className="w-5 h-5 text-n0va-300" /> Gateway Catalog</h1>
          <p className="text-sm text-gray-500">{catalog?.summary}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="accent-n0va-500" />
            Auto-refresh 30s
          </label>
          <button onClick={loadData} className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 text-gray-300" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-3">
                <p className="text-xs text-gray-500 flex items-center gap-1.5"><s.icon className="w-3.5 h-3.5" /> {s.label}</p>
                <p className="text-xl font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-48 flex items-center gap-2 rounded-lg bg-gray-900/60 border border-gray-700 px-3 py-2">
                <Search className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  className="bg-transparent outline-none text-sm text-gray-200 w-full"
                  placeholder="Search 200 platforms (name, id, capability)…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
                />
                {query && (
                  <button onClick={clearSearch} className="text-gray-500 hover:text-gray-300" title="Clear">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button onClick={doSearch} disabled={busy === "search"}
                className="px-4 py-2 rounded-lg bg-n0va-500 hover:bg-n0va-400 text-white text-sm font-medium">
                {busy === "search" ? "Searching…" : "Search"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setCategory(""); clearSearch(); }}
                className={`px-2.5 py-1 rounded-full text-[11px] border ${!category ? "bg-n0va-500/15 border-n0va-500 text-n0va-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                All ({catalog?.totalPlatforms ?? 0})
              </button>
              {cats.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => {
                    if (category === c.id) { setCategory(""); clearSearch(); return; }
                    setCategory(c.id);
                    const q = query;
                    setBusy("search");
                    api.adsMarketingModule.n0va1oCatalogSearch(q, c.id).then((r) => {
                      const rr = unwrap(r);
                      setResults(rr.results || []);
                      setSearchInfo(rr);
                    }).catch((e: any) => addToast("error", "Search failed", e?.message)).finally(() => setBusy(""));
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] border ${category === c.id ? "bg-n0va-500/15 border-n0va-500 text-n0va-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                  {c.name} ({c.platformCount ?? 0})
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500">
              {searchInfo
                ? `${searchInfo.count} result(s) for "${searchInfo.query || "all"}${searchInfo.category ? ` in ${searchInfo.category}` : ""}"`
                : `Showing first ${results.length} of ${catalog?.totalPlatforms ?? 0} platforms`}
              {searchInfo && <button onClick={clearSearch} className="ml-2 text-n0va-300 hover:underline">Reset</button>}
            </p>
          </section>

          <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p: any) => (
              <div key={p.id} className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-200 text-sm truncate">{p.name}</p>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${p.status === "connected" ? "bg-emerald-500/15 text-emerald-400" : p.status === "pending" ? "bg-amber-500/15 text-amber-400" : "bg-gray-700/60 text-gray-400"}`}>
                    {p.status}{p.connectedCount ? ` · ${p.connectedCount}` : ""}
                  </span>
                </div>
                <p className="text-[10px] text-gray-600 font-mono truncate">{p.id} · {p.category}</p>
                <div className="flex flex-wrap gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-gray-900/60 text-[9px] text-gray-500 uppercase">{p.authType}</span>
                  {(p.protocols || []).map((pr: string) => (
                    <span key={pr} className="px-1.5 py-0.5 rounded bg-gray-900/60 text-[9px] text-gray-500 uppercase">{pr}</span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(p.capabilities || []).slice(0, 4).map((cap: string) => (
                    <span key={cap} className="px-1.5 py-0.5 rounded bg-n0va-500/10 text-[9px] text-n0va-300">{cap}</span>
                  ))}
                  {(p.capabilities || []).length > 4 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] text-gray-500">+{(p.capabilities || []).length - 4}</span>
                  )}
                </div>
              </div>
            ))}
          </section>
          {results.length === 0 && (
            <div className="rounded-xl bg-gray-800/40 border border-dashed border-gray-700 p-8 text-center text-sm text-gray-500">
              No platforms match — try a different query.
            </div>
          )}
        </>
      )}
    </div>
  );
}
