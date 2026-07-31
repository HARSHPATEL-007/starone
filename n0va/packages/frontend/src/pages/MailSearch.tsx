import { useEffect, useState, useCallback } from "react";
import {
  Search, RefreshCw, AlertTriangle, Sparkles, Paperclip, Star, Filter, X,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const INTENT_LABEL: Record<string, string> = {
  unread_emails: "Unread emails",
  high_priority: "High priority",
  with_attachments: "With attachments",
  from_sender: "From a sender",
  about_topic: "About a topic",
  category: "By category",
  recent: "Recent messages",
  yesterday: "From yesterday",
  general_search: "General search",
};

function fmtTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MailSearch() {
  const { addToast } = useToast();
  const [query, setQuery] = useState("");
  const [semantic, setSemantic] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [results, setResults] = useState<any>(null);
  const [semanticRes, setSemanticRes] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadStats = useCallback(async () => {
    const s = unwrap(await api.adsMarketingModule.mailSearchStats().catch(() => null));
    setStats(s);
    setLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => {
    function refresh() { loadStats(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadStats]);

  async function runSearch() {
    if (!query.trim()) return;
    setBusy(true);
    const r = unwrap(await api.adsMarketingModule.mailSearch({ query, ...filters, limit: 50 }).catch(() => null));
    setResults(r);
    setSemanticRes(null);
    setBusy(false);
  }

  async function runSemantic() {
    if (!semantic.trim()) return;
    setBusy(true);
    const r = unwrap(await api.adsMarketingModule.mailSemanticSearch(semantic).catch(() => null));
    setSemanticRes(r);
    setResults(null);
    setBusy(false);
  }

  async function loadSuggestions(q: string) {
    if (!q.trim()) { setSuggestions([]); return; }
    const r = unwrap(await api.adsMarketingModule.mailSearchSuggestions(q).catch(() => null));
    setSuggestions(r?.suggestions || []);
  }

  function pickSuggestion(s: any) {
    setQuery(s.label);
    setSuggestions([]);
    if (s.value && s.type === "sender") setFilters({ from: s.value });
  }

  function clearAll() {
    setQuery(""); setSemantic(""); setResults(null); setSemanticRes(null); setFilters({});
  }

  const rows = semanticRes?.messages || results?.messages || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Search className="w-6 h-6 text-n0va-400" /> Mail Search</h1>
          <p className="text-gray-500 mt-1 text-sm">Plain-text search with semantic intent detection</p>
        </div>
        <div className="flex items-center gap-2">
          {stats && <span className="text-xs text-gray-500 hidden md:inline">{stats.totalMessages} messages indexed · {stats.unreadPercent}% unread</span>}
          <button className="btn-secondary p-2" onClick={() => { loadStats(); }} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="card space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1 flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-n0va-400" /> Semantic query</label>
              <div className="flex gap-2 flex-wrap">
                <input
                  className="input flex-1 min-w-[200px]"
                  placeholder='e.g. "unread emails with attachments" or "anything from Ani about invoices"'
                  value={semantic}
                  onChange={(e) => setSemantic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") runSemantic(); }}
                />
                <button className="btn-primary" disabled={busy || !semantic.trim()} onClick={runSemantic}>
                  <Sparkles className="w-4 h-4" /> Ask Ani
                </button>
              </div>
              {semanticRes && (
                <p className="text-xs text-n0va-400 mt-2">
                  Intent: {INTENT_LABEL[semanticRes.intent] || semanticRes.intent} · {semanticRes.total} result{semanticRes.total === 1 ? "" : "s"} — {semanticRes.explanation}
                </p>
              )}
            </div>

            <div className="border-t border-gray-800 pt-3">
              <label className="text-xs text-gray-400 block mb-1 flex items-center gap-1.5"><Filter className="w-3 h-3 text-n0va-400" /> Keyword search</label>
              <div className="flex gap-2 flex-wrap relative">
                <input
                  className="input flex-1 min-w-[200px]"
                  placeholder="Search subject, sender, body…"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); loadSuggestions(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
                />
                <button className="btn-secondary" disabled={busy || !query.trim()} onClick={runSearch}>Search</button>
              </div>
              {suggestions.length > 0 && (
                <div className="mt-2 border border-gray-700 rounded-lg bg-gray-800/60 overflow-hidden">
                  {suggestions.map((s: any, i: number) => (
                    <button key={i} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700/50 flex items-center gap-2" onClick={() => pickSuggestion(s)}>
                      <span className={`text-[9px] uppercase font-bold ${s.type === "contact" ? "text-emerald-400" : s.type === "sender" ? "text-sky-400" : "text-n0va-400"}`}>{s.type}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <select className="select text-xs !w-auto" value={filters.folder || ""} onChange={(e) => setFilters({ ...filters, folder: e.target.value })}>
                  <option value="">Any folder</option>
                  <option value="inbox">inbox</option>
                  <option value="sent">sent</option>
                  <option value="drafts">drafts</option>
                  <option value="archive">archive</option>
                  <option value="trash">trash</option>
                  <option value="spam">spam</option>
                </select>
                <select className="select text-xs !w-auto" value={filters.priority || ""} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
                  <option value="">Any priority</option>
                  <option value="critical">critical</option>
                  <option value="high">high</option>
                  <option value="normal">normal</option>
                  <option value="low">low</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                  <input type="checkbox" checked={filters.unread === "true"} onChange={(e) => setFilters({ ...filters, unread: e.target.value ? "" : "true" })} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
                  Unread only
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                  <input type="checkbox" checked={filters.hasAttachment === "true"} onChange={(e) => setFilters({ ...filters, hasAttachment: e.target.value ? "" : "true" })} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
                  <Paperclip className="w-3 h-3" /> Attachments
                </label>
                {(query || semantic || Object.keys(filters).length > 0) && (
                  <button className="btn-secondary text-xs px-2 py-1.5 flex items-center gap-1" onClick={clearAll}><X className="w-3 h-3" /> Clear</button>
                )}
              </div>
            </div>
          </div>

          {!stats && !rows.length && (
            <div className="card border-red-500/30 bg-red-500/5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-sm text-red-300 font-medium">Search data unavailable</p>
                  <p className="text-xs text-red-400/70">Check that the backend is running.</p>
                </div>
                <button className="btn-secondary text-xs ml-auto" onClick={loadStats}>Retry</button>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <div className="card !p-2">
              <div className="px-3 py-2 border-b border-gray-800/60 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{rows.length} result{rows.length === 1 ? "" : "s"}</span>
                {semanticRes && <span className="text-xs text-n0va-400 capitalize">{semanticRes.intent}</span>}
              </div>
              <ul className="divide-y divide-gray-800/50">
                {rows.map((m: any) => (
                  <li key={m._id} className="px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${m.read ? "text-gray-300" : "text-white font-semibold"}`}>{m.from?.name || m.from?.email}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        {m.starred && <Star className="w-3 h-3 text-amber-400" />}
                        {m.attachments?.length > 0 && <Paperclip className="w-3 h-3 text-gray-500" />}
                        <span className="text-[10px] text-gray-500">{fmtTime(m.receivedAt)}</span>
                      </span>
                    </div>
                    <p className={`text-sm truncate mt-0.5 ${m.read ? "text-gray-500" : "text-gray-300"}`}>{m.subject}</p>
                    <p className="text-xs text-gray-600 truncate mt-0.5">{m.preview || m.body?.slice(0, 140) || ""}</p>
                    {typeof m.score === "number" && (
                      <span className="text-[9px] text-n0va-500 mt-1 inline-block">match {(m.score * 100).toFixed(0)}%</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!rows.length && stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card">
                <div className="flex items-center gap-2 mb-3"><Search className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">By folder</span></div>
                <ul className="space-y-2">
                  {(stats.byFolder || []).map((f: any, i: number) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-gray-300 capitalize truncate">{f.name}</span>
                      <span className="text-xs text-gray-500 shrink-0">{f.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">By category</span></div>
                <ul className="space-y-2">
                  {(stats.byCategory || []).slice(0, 8).map((c: any, i: number) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-gray-300 capitalize truncate">{c.category}</span>
                      <span className="text-xs text-gray-500 shrink-0">{c.count}</span>
                    </li>
                  ))}
                  {stats.topSenders?.slice(0, 4).map((s: any, i: number) => (
                    <li key={`s${i}`} className="flex items-center justify-between gap-2 text-sm border-t border-gray-800/60 pt-2">
                      <span className="text-gray-400 truncate">{s.email}</span>
                      <span className="text-xs text-gray-500 shrink-0">{s.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
