import { useEffect, useState, useCallback } from "react";
import {
  Sparkles, RefreshCw, AlertTriangle, Zap, Reply, MessageSquareText,
  CalendarClock, ClipboardList, Copy, CheckCheck, ListTodo, BrainCircuit, Users,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  normal: "bg-n0va-500",
  low: "bg-gray-600",
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400",
  high: "bg-orange-500/15 text-orange-400",
  normal: "bg-gray-500/15 text-gray-400",
  low: "bg-gray-600/20 text-gray-500",
};

export default function MailAI() {
  const { addToast } = useToast();
  const [intel, setIntel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [enrich, setEnrich] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [copied, setCopied] = useState("");
  const [threadId, setThreadId] = useState("");
  const [threadInfo, setThreadInfo] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const i = unwrap(await api.adsMarketingModule.mailIntelligence().catch(() => null));
    setIntel(i);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    function refresh() { loadData(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadData]);

  async function openDigest(d: any) {
    setDetail(d);
    setEnrich(null);
    setReplies([]);
    const e = unwrap(await api.adsMarketingModule.mailEnrich(d.messageId).catch(() => null));
    setEnrich(e);
  }

  async function loadReplies(messageId: string) {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailSmartReply(messageId).catch(() => null));
      setReplies(r?.replies || []);
      addToast("success", "Smart replies ready", r?.summary || "");
    } catch (e: any) {
      addToast("error", "Smart reply failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard?.writeText(text).catch(() => null);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  }

  async function analyzeThread() {
    if (!threadId.trim()) return;
    setBusy(true);
    try {
      const [sum, prep] = await Promise.all([
        api.adsMarketingModule.mailSummarizeThread(threadId.trim()).catch(() => null),
        api.adsMarketingModule.mailMeetingPrep(threadId.trim()).catch(() => null),
      ]);
      setThreadInfo({ summary: unwrap(sum), prep: unwrap(prep) });
    } catch (e: any) {
      addToast("error", "Thread analysis failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Mail Intelligence</h1><p className="text-gray-500 mt-1">Ani AI — enrichment, smart replies, thread summaries</p></div>
          <div className="animate-spin w-5 h-5 border-2 border-n0va-500 border-t-transparent rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <SkeletonCard />
      </div>
    );
  }

  const digest = intel?.digest || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Sparkles className="w-6 h-6 text-n0va-400" /> Mail Intelligence</h1>
          <p className="text-gray-500 mt-1 text-sm">{intel?.summary || "Ani AI — enrichment, smart replies, thread summaries"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary p-2" onClick={loadData} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {!intel && (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-300 font-medium">Intelligence data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={loadData}>Retry</button>
          </div>
        </div>
      )}

      {intel && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Unread</span></div>
              <p className="text-3xl font-bold text-white">{intel.totalUnread}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-2"><Reply className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Needs reply</span></div>
              <p className="text-3xl font-bold text-white">{intel.needsReply || 0}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-2"><ClipboardList className="w-4 h-4 text-amber-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Action items</span></div>
              <p className="text-3xl font-bold text-white">{intel.actionItemsTotal || 0}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-2"><BrainCircuit className="w-4 h-4 text-emerald-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Replies ready</span></div>
              <p className="text-3xl font-bold text-white">{intel.suggestedRepliesReady || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 card">
              <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Needs attention</span></div>
              {intel.attentionItems?.length ? (
                <ul className="space-y-2">
                  {intel.attentionItems.slice(0, 6).map((a: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300 border-b border-gray-800/50 last:border-0 pb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Nothing needs attention — inbox is clear.</p>
              )}
              {intel.byCategory?.length > 0 && (
                <>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mt-4 mb-2">By category</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(intel.byCategory || []).map((c: any, i: number) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-gray-700/60 text-gray-300">{c.category}: {c.count}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Unread by priority</span></div>
              <div className="space-y-2">
                {Object.entries(intel.unreadByPriority || {}).map(([p, count]: any) => (
                  <div key={p} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 capitalize w-16 shrink-0">{p}</span>
                    <div className="h-1.5 bg-gray-800 rounded-full flex-1">
                      <div className={`h-1.5 rounded-full ${PRIORITY_COLORS[p] || "bg-gray-600"}`} style={{ width: `${intel.totalUnread ? (count / intel.totalUnread) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-6 text-right shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card !p-2">
            <div className="px-3 py-2 border-b border-gray-800/60">
              <span className="text-sm font-semibold text-white">Priority digest</span>
            </div>
            <ul className="divide-y divide-gray-800/50">
              {digest.map((d: any) => (
                <li key={d.messageId} className="px-3 py-3">
                  <button className="w-full text-left" onClick={() => openDigest(d)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-300 truncate">{d.subject}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ${PRIORITY_BADGE[d.priority] || ""}`}>{d.priority}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{d.from}</p>
                    <p className="text-xs text-n0va-400 mt-1 line-clamp-2">{d.summary}</p>
                  </button>
                  {detail?.messageId === d.messageId && (
                    <div className="mt-3 border-t border-gray-800 pt-3 space-y-3">
                      {enrich && (
                        <div className="rounded-lg bg-gray-800/40 p-3">
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${PRIORITY_BADGE[enrich.priority] || ""}`}>{enrich.priority}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold bg-gray-600/30 text-gray-300">sentiment: {enrich.sentiment}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold bg-n0va-600/20 text-n0va-400">{enrich.category}</span>
                            {enrich.isSpam && <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold bg-purple-500/15 text-purple-400">spam {enrich.spamScore}</span>}
                          </div>
                          <p className="text-xs text-gray-300">{enrich.summary}</p>
                          {enrich.actionItems?.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {enrich.actionItems.map((a: string, i: number) => (
                                <li key={i} className="flex items-center gap-1.5 text-xs text-amber-300/90"><ListTodo className="w-3 h-3 shrink-0" />{a}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button className="btn-secondary text-xs px-2 py-1.5 flex items-center gap-1.5" disabled={busy} onClick={() => loadReplies(d.messageId)}>
                          <BrainCircuit className="w-3.5 h-3.5" /> Smart replies
                        </button>
                      </div>
                      {replies.length > 0 && (
                        <div className="space-y-2">
                          {replies.map((r: any, i: number) => (
                            <div key={i} className="rounded-lg border border-gray-700 bg-gray-800/40 p-3">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold bg-n0va-600/20 text-n0va-400">{r.tone}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-500">{r.confidence}% confidence</span>
                                  <button className="text-gray-500 hover:text-white" onClick={() => copyText(r.text, `r${i}`)} title="Copy">
                                    {copied === `r${i}` ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-gray-300 whitespace-pre-wrap break-words">{r.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
              {digest.length === 0 && (
                <li className="px-3 py-10 text-center text-sm text-gray-500">No messages need attention right now.</li>
              )}
            </ul>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-3"><MessageSquareText className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Thread analysis</span></div>
            <div className="flex gap-2 flex-wrap">
              <input className="input flex-1 min-w-[200px]" placeholder="Thread id (e.g. thr_…)" value={threadId} onChange={(e) => setThreadId(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") analyzeThread(); }} />
              <button className="btn-primary" disabled={busy || !threadId.trim()} onClick={analyzeThread}>
                <Sparkles className="w-4 h-4" /> Analyze
              </button>
            </div>
            {threadInfo && (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Summary</p>
                  <p className="text-sm text-gray-300">{threadInfo.summary?.summary}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {threadInfo.summary?.messageCount} messages · {(threadInfo.summary?.participants || []).join(", ")}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <div>
                      <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">Decisions</p>
                      <ul className="space-y-1">{(threadInfo.summary?.decisions || []).map((x: string, i: number) => <li key={i} className="text-xs text-gray-400">· {x}</li>)}</ul>
                    </div>
                    <div>
                      <p className="text-[10px] text-sky-400 uppercase tracking-wider mb-1">Open questions</p>
                      <ul className="space-y-1">{(threadInfo.summary?.openQuestions || []).map((x: string, i: number) => <li key={i} className="text-xs text-gray-400">· {x}</li>)}</ul>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Next steps</p>
                      <ul className="space-y-1">{(threadInfo.summary?.nextSteps || []).map((x: string, i: number) => <li key={i} className="text-xs text-gray-400">· {x}</li>)}</ul>
                    </div>
                  </div>
                </div>
                {threadInfo.prep && (
                  <div className="border-t border-gray-800 pt-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><CalendarClock className="w-3 h-3" /> Meeting prep</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(threadInfo.prep.attendees || []).map((a: string, i: number) => (
                        <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-gray-700/60 text-gray-300"><Users className="w-2.5 h-2.5" />{a}</span>
                      ))}
                    </div>
                    {(threadInfo.prep.proposedTimes || []).length > 0 && (
                      <p className="text-xs text-gray-400 mb-2">Proposed: {threadInfo.prep.proposedTimes.join(" · ")}</p>
                    )}
                    <p className="text-[10px] text-n0va-400 uppercase tracking-wider mb-1">Agenda</p>
                    <ul className="space-y-1 mb-2">{(threadInfo.prep.agenda || []).map((x: string, i: number) => <li key={i} className="text-xs text-gray-400">· {x}</li>)}</ul>
                    <p className="text-[10px] text-n0va-400 uppercase tracking-wider mb-1">Prep notes</p>
                    <ul className="space-y-1">{(threadInfo.prep.prepNotes || []).map((x: string, i: number) => <li key={i} className="text-xs text-gray-400">· {x}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
