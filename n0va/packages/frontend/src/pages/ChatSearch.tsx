import { useEffect, useState, useCallback } from "react";
import {
  Search as SearchIcon, RefreshCw, Save, Trash2, BarChart3, Hash, Filter, CornerDownRight, Sparkles, Pin,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function ChatSearch() {
  const { addToast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [semantic, setSemantic] = useState<any>(null);
  const [operators, setOperators] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [savedName, setSavedName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [o, s, st] = await Promise.all([
      api.adsMarketingModule.chat.searchOperators("").catch(() => null),
      api.adsMarketingModule.chat.savedSearches().catch(() => null),
      api.adsMarketingModule.chat.searchStats().catch(() => null),
    ]);
    setOperators(unwrap(o)?.operators || unwrap(o) || []);
    setSaved(unwrap(s)?.searches || []);
    setStats(unwrap(st));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function runSearch(useSemantic = false) {
    if (!query.trim()) return;
    setBusy(true);
    if (useSemantic) {
      const r = unwrap(await api.adsMarketingModule.chat.semanticSearch(query, {}).catch(() => null));
      setSemantic(r);
    } else {
      const r = unwrap(await api.adsMarketingModule.chat.search({ query }).catch(() => null));
      setResults(r);
    }
    setBusy(false);
  }

  async function saveSearch() {
    if (!query.trim() || !savedName.trim()) return;
    const r = unwrap(await api.adsMarketingModule.chat.saveSearch({ name: savedName.trim(), query, search: { query } }).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setSavedName("");
    load();
  }

  async function deleteSaved(id: string) {
    await api.adsMarketingModule.chat.deleteSavedSearch(id).catch(() => null);
    load();
  }

  const items = results?.messages || [];
  const semanticItems = semantic?.results || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><SearchIcon className="w-6 h-6 text-n0va-400" /> Chat Search</h1>
          <p className="text-gray-500 mt-1 text-sm">Full-text, semantic and operator-driven search across every channel</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="input flex-1"
            placeholder='Search chat... try "from:user in:#general has:file is:thread sentiment:negative"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runSearch(false); }}
          />
          <button className="btn-primary" disabled={busy || !query.trim()} onClick={() => runSearch(false)}>
            {busy ? "..." : "Search"}
          </button>
          <button className="btn-secondary" disabled={busy || !query.trim()} onClick={() => runSearch(true)}>
            <Sparkles className="w-4 h-4 inline mr-1" />Semantic
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <input className="input !w-48 text-xs" placeholder="Save as..." value={savedName} onChange={(e) => setSavedName(e.target.value)} />
          <button className="btn-secondary text-xs" disabled={!query.trim() || !savedName.trim()} onClick={saveSearch}>
            <Save className="w-3.5 h-3.5 inline mr-1" />Save
          </button>
          <span className="text-[11px] text-gray-500 ml-auto">{stats ? `${stats.total ?? 0} messages indexed · ${stats.decisions ?? 0} decisions · ${stats.withThreads ?? 0} threads` : ""}</span>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1.5">
          {operators.map((op: any) => (
            <button
              key={op.op}
              className="text-left p-2 rounded-lg bg-gray-800/40 hover:bg-gray-800/70"
              onClick={() => setQuery((q) => (q ? `${q} ${op.op}` : op.op))}
            >
              <p className="text-[11px] font-mono text-n0va-300">{op.op}</p>
              <p className="text-[10px] text-gray-500 truncate" title={op.description}>{op.example}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {items.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><SearchIcon className="w-4 h-4 text-n0va-400" /> Results <span className="text-[11px] text-gray-500">· {results?.total ?? items.length} for “{results?.query || query}”</span></h2>
              <div className="space-y-2">
                {items.map((m: any) => (
                  <div key={m.messageId} className="p-3 rounded-xl bg-gray-800/40">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-n0va-900/60 text-n0va-300 border border-n0va-700/40"><Hash className="w-2.5 h-2.5 inline -mt-0.5" /> {m.room_name}</span>
                      <span className="text-xs font-semibold text-gray-200">{m.sender?.display_name}</span>
                      <span className="text-[10px] text-gray-500">{new Date(m.created_at).toLocaleString()}</span>
                      {m.is_pinned && <Pin className="w-3 h-3 text-amber-400" />}
                    </div>
                    <p className="text-sm text-gray-300 mt-1.5 whitespace-pre-wrap break-words">{m.content?.body}</p>
                    {(m.reactions || []).length > 0 && (
                      <div className="mt-1.5 flex gap-1">
                        {m.reactions.map((r: any) => <span key={r.emoji} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800/60 border border-gray-700">{r.emoji} {r.count}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {semanticItems.length > 0 && (
            <div className="card border-violet-700/30">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-violet-400" /> Semantic matches <span className="text-[11px] text-gray-500">· {semantic?.total ?? semanticItems.length} for “{semantic?.query || query}”</span></h2>
              <div className="space-y-2">
                {semanticItems.map((m: any) => (
                  <div key={m.messageId} className="p-3 rounded-xl bg-gray-800/40">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/60 text-violet-300 border border-violet-700/40"><Hash className="w-2.5 h-2.5 inline -mt-0.5" /> {m.room_name}</span>
                      <span className="text-[11px] font-semibold text-gray-200">{m.sender?.display_name}</span>
                      <span className="text-[10px] text-violet-300">relevance {(m.relevance ?? 0).toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-gray-300 mt-1.5 whitespace-pre-wrap break-words">{m.content?.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {busy && <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>}
          {!busy && items.length === 0 && semanticItems.length === 0 && !loading && <p className="text-xs text-gray-500">Run a search to see results. Operator chips above insert search syntax.</p>}
        </div>

        <div className="space-y-4">
          <div className="card !p-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><BarChart3 className="w-3 h-3" /> Index stats</p>
            {loading ? <SkeletonCard /> : stats ? (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Messages</span><span className="text-gray-200 font-semibold">{stats.total ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">With attachments</span><span className="text-gray-200 font-semibold">{stats.withAttachments ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Decisions</span><span className="text-gray-200 font-semibold">{stats.decisions ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Threads</span><span className="text-gray-200 font-semibold">{stats.withThreads ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Languages</span><span className="text-gray-200 font-semibold">{(stats.languages || []).length}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Types</span><span className="text-gray-200 font-semibold">{(stats.types || []).join(", ")}</span></div>
              </div>
            ) : null}
          </div>

          <div className="card !p-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Saved searches</p>
            <div className="space-y-1.5">
              {saved.length === 0 && <p className="text-xs text-gray-500">Nothing saved yet.</p>}
              {saved.map((s: any) => (
                <div key={s.savedId} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-800/40">
                  <button className="flex-1 min-w-0 text-left" onClick={() => setQuery(s.query)}>
                    <p className="text-gray-200 font-semibold truncate">{s.name}</p>
                    <p className="text-[10px] text-gray-500 font-mono truncate">{s.query}</p>
                  </button>
                  <button className="p-1 text-gray-500 hover:text-red-400" onClick={() => deleteSaved(s.savedId)}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="card !p-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Filter className="w-3 h-3" /> Operators</p>
            <div className="space-y-1 text-[11px] text-gray-400">
              <p><span className="font-mono text-n0va-300">from:</span> user · <span className="font-mono text-n0va-300">in:</span> room</p>
              <p><span className="font-mono text-n0va-300">has:</span> file/attachment</p>
              <p><span className="font-mono text-n0va-300">is:</span> thread / pinned / decision / unread</p>
              <p><span className="font-mono text-n0va-300">before:/after:</span> dates</p>
              <p><span className="font-mono text-n0va-300">sentiment:</span> positive|negative</p>
              <p><span className="font-mono text-n0va-300">type:</span> code|image|...</p>
              <p><span className="font-mono text-n0va-300">reaction:</span> fire</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
