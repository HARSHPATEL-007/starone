import { useEffect, useState, useCallback } from "react";
import {
  GitMerge, RefreshCw, Inbox, Star, Pin, Tag, Search, X, ChevronRight, MessageSquare, Loader2, AlertTriangle, CheckCircle2, Clock, Layers,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const STATES = ["open", "pending", "done"];
const PRIORITIES = ["high", "normal", "low"];

const STATE_COLOR: Record<string, string> = {
  open: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  done: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const PRIO_COLOR: Record<string, string> = {
  high: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  normal: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  low: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function MailThreads() {
  const { addToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [log, setLog] = useState<any[]>([]);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ state: string; priority: string; tag: string; search: string; unreadOnly: boolean; starredOnly: boolean; pinnedOnly: boolean }>({
    state: "", priority: "", tag: "", search: "", unreadOnly: false, starredOnly: false, pinnedOnly: false,
  });
  const [tagInput, setTagInput] = useState<string>("");
  const [mergeFor, setMergeFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    const opts: any = {};
    if (filters.state) opts.state = filters.state;
    if (filters.priority) opts.priority = filters.priority;
    if (filters.tag) opts.tag = filters.tag;
    if (filters.search) opts.search = filters.search;
    if (filters.unreadOnly) opts.unreadOnly = true;
    if (filters.starredOnly) opts.starredOnly = true;
    if (filters.pinnedOnly) opts.pinnedOnly = true;
    const [t, l] = await Promise.all([
      api.adsMarketingModule.mailThreads(opts).catch(() => null),
      api.adsMarketingModule.mailThreadLog().catch(() => null),
    ]);
    setData(unwrap(t));
    setLog(unwrap(l)?.entries || []);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    function refresh() { load(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  async function openThread(threadId: string) {
    const r = unwrap(await api.adsMarketingModule.mailThreadWorkspace(threadId).catch(() => null));
    if (r) setWorkspace(r);
    else addToast("error", "Thread not found");
  }

  async function act(key: string, fn: () => Promise<any>, ok?: string) {
    setBusy(key);
    const r = unwrap(await fn().catch(() => null));
    setBusy(null);
    if (r) {
      if (ok) addToast("success", r.summary || ok);
      load();
    } else addToast("error", "Action failed");
  }

  async function addTag(threadId: string) {
    if (!tagInput.trim()) return;
    await act(`tag-${threadId}`, () => api.adsMarketingModule.mailThreadTag(threadId, tagInput.trim()), "Tag applied");
    setTagInput("");
  }

  async function mergeThreads(targetId: string, sourceId: string) {
    const r = unwrap(await api.adsMarketingModule.mailThreadMerge(targetId, sourceId).catch(() => null));
    setMergeFor(null);
    if (r) { addToast("success", r.summary); load(); }
    else addToast("error", "Merge failed");
  }

  const dash = data?.threads ? {
    totalThreads: data.total, open: data.states?.open || 0, pending: data.states?.pending || 0, done: data.states?.done || 0,
    unread: data.unreadThreads || 0,
  } : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Mail Threads</h1>
          <p className="text-sm text-slate-400">Conversation workspaces — state, pin, tags, priority and merge</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="h-3.5 w-3.5" />
            Auto 30s
          </label>
        </div>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : !data ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">Could not load thread data.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard label="Total threads" value={dash?.totalThreads ?? data.total ?? 0} icon={Inbox} />
            <StatCard label="Open" value={dash?.open ?? 0} icon={Layers} />
            <StatCard label="Awaiting" value={dash?.pending ?? 0} icon={Clock} />
            <StatCard label="Done" value={dash?.done ?? 0} icon={CheckCircle2} />
            <StatCard label="With unread" value={dash?.unread ?? 0} icon={MessageSquare} />
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <select
              value={filters.state}
              onChange={(e) => setFilters({ ...filters, state: e.target.value })}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-300"
            >
              <option value="">All states</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-300"
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              value={filters.tag}
              onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
              placeholder="Tag filter"
              className="w-28 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-300 placeholder-slate-500"
            />
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-500" />
              <input
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search subject…"
                className="w-40 rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-8 pr-2 text-xs text-slate-300 placeholder-slate-500"
              />
            </div>
            {(["unreadOnly", "starredOnly", "pinnedOnly"] as const).map((k) => (
              <label key={k} className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={filters[k]}
                  onChange={(e) => setFilters({ ...filters, [k]: e.target.checked })}
                  className="h-3.5 w-3.5"
                />
                {k === "unreadOnly" ? "Unread" : k === "starredOnly" ? "Starred" : "Pinned"}
              </label>
            ))}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">{data.threads?.length || 0} threads</h2>
              <span className="text-xs text-slate-500">{data.summary}</span>
            </div>
            {!data.threads?.length ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">No threads match the current filters.</p>
            ) : (
              data.threads.map((t: any) => (
                <div key={t.threadId} className="flex flex-col gap-2 border-b border-slate-800/70 px-4 py-3 last:border-0 md:flex-row md:items-center">
                  <button onClick={() => openThread(t.threadId)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-semibold text-indigo-300`}>
                      {(t.subject || "?").slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
                        <span className="truncate">{t.subject}</span>
                        {t.pinned && <Pin className="h-3 w-3 shrink-0 text-amber-400" />}
                        {t.starred && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                        {t.unreadCount > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-400" />}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{t.participants.join(", ")}</span>
                    </span>
                  </button>
                  <div className="flex flex-wrap items-center gap-1.5 pl-11 md:pl-0">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATE_COLOR[t.state] || STATE_COLOR.open}`}>{t.state}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${PRIO_COLOR[t.priority] || PRIO_COLOR.normal}`}>{t.priority}</span>
                    {t.tags.map((tag: string) => (
                      <span key={tag} className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-300">#{tag}</span>
                    ))}
                    <span className="text-[10px] text-slate-500">{t.messageCount} msg · {t.unreadCount} unread · {ago(t.lastAt)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <select
                      value={t.state}
                      onChange={(e) => act(`state-${t.threadId}`, () => api.adsMarketingModule.mailThreadSetState(t.threadId, e.target.value))}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 text-[10px] text-slate-300"
                    >
                      {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button
                      onClick={() => act(`pin-${t.threadId}`, () => t.pinned ? api.adsMarketingModule.mailThreadUnpin(t.threadId) : api.adsMarketingModule.mailThreadPin(t.threadId))}
                      className={`rounded-lg border px-2 py-1 text-[10px] ${t.pinned ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-slate-700 text-slate-400 hover:bg-slate-800"}`}
                      title={t.pinned ? "Unpin" : "Pin"}
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                    <select
                      value={t.priority}
                      onChange={(e) => act(`prio-${t.threadId}`, () => api.adsMarketingModule.mailThreadPriority(t.threadId, e.target.value))}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 text-[10px] text-slate-300"
                    >
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button
                      onClick={() => setMergeFor(t.threadId)}
                      className="rounded-lg border border-slate-700 px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-800"
                      title="Merge another thread into this one"
                    >
                      <GitMerge className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 pl-11 md:pl-0">
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addTag(t.threadId); }}
                      placeholder="tag + Enter"
                      className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 placeholder-slate-500"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Recent thread activity</h2>
            </div>
            {!log.length ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No activity yet.</p>
            ) : (
              <div className="max-h-64 divide-y divide-slate-800/70 overflow-y-auto">
                {log.map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-4 py-2">
                    <span className="truncate text-xs text-slate-300">{e.detail}</span>
                    <span className="shrink-0 text-[10px] text-slate-500">{ago(e.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {mergeFor && data?.threads && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:items-center" onClick={() => setMergeFor(null)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Merge thread into this one</h3>
              <button onClick={() => setMergeFor(null)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-3 text-xs text-slate-400">Pick a source thread whose messages move into the target:</p>
            <div className="space-y-2">
              {data.threads.filter((t: any) => t.threadId !== mergeFor).map((t: any) => (
                <button
                  key={t.threadId}
                  disabled={busy === `merge-${mergeFor}`}
                  onClick={() => mergeThreads(mergeFor, t.threadId)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800"
                >
                  <span className="truncate">{t.subject}</span>
                  <span className="ml-2 shrink-0 text-[10px] text-slate-500">{t.messageCount} msg</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {workspace && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:items-center" onClick={() => setWorkspace(null)}>
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-700 bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-white">{workspace.subject}</h3>
                <p className="text-[10px] text-slate-500">{workspace.participants?.join(", ")}</p>
              </div>
              <button onClick={() => setWorkspace(null)} className="ml-3 shrink-0 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-5 py-2 text-[10px]">
              <span className={`rounded-full border px-2 py-0.5 ${STATE_COLOR[workspace.state] || STATE_COLOR.open}`}>{workspace.state}</span>
              <span className={`rounded-full border px-2 py-0.5 ${PRIO_COLOR[workspace.priority] || PRIO_COLOR.normal}`}>{workspace.priority}</span>
              {workspace.tags?.map((tag: string) => <span key={tag} className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-indigo-300">#{tag}</span>)}
              <span className="text-slate-500">{workspace.summary}</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span className="text-indigo-300">{workspace.suggestedNext}</span>
            </div>
            <div className="min-h-0 flex-1 divide-y divide-slate-800/70 overflow-y-auto">
              {workspace.messages?.map((m: any, i: number) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-200">{(m.from?.name || m.from?.email || "?")} <span className="font-normal text-slate-500">&lt;{m.from?.email || ""}&gt;</span></span>
                    <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-slate-500">
                      {!m.read && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
                      {m.starred && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                      {ago(m.receivedAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-300">{m.subject}</p>
                  <p className="mt-1 text-xs text-slate-400">{m.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
