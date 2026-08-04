import { useEffect, useState, useCallback } from "react";
import {
  PenLine, RefreshCw, AlertTriangle, Sparkles, Send, RotateCw, ThumbsDown, Pencil, Trash2, MessageSquarePlus, Hash, Activity, Zap,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function MailComposer() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [messageId, setMessageId] = useState("");
  const [tone, setTone] = useState("concise");
  const [mode, setMode] = useState("reply");
  const [dislikeFeedback, setDislikeFeedback] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editDraftId, setEditDraftId] = useState<string | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [fullDraft, setFullDraft] = useState<any>(null);

  const load = useCallback(async () => {
    const [d, c, m] = await Promise.all([
      api.adsMarketingModule.mailComposerDashboard().catch(() => null),
      api.adsMarketingModule.mailComposerCatalog().catch(() => null),
      api.adsMarketingModule.mailMessages({ folder: "inbox", limit: 20 }).catch(() => null),
    ]);
    setDash(unwrap(d));
    setCatalog(unwrap(c));
    setMessages(unwrap(m)?.messages || []);
    setLoading(false);
  }, []);

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

  async function act(kind: string, fn: () => Promise<any>) {
    setBusy(kind);
    const r = unwrap(await fn().catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function compose() {
    if (!messageId) { addToast("info", "Pick an inbox message to draft a reply to"); return; }
    const r = unwrap(await api.adsMarketingModule.mailComposeDraft(messageId, { mode, tone }).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    if (r?.draft) { setActiveDraftId(r.draft.draftId); setFullDraft(r.draft); setEditBody(r.draft.body); setEditSubject(r.draft.subject); setEditDraftId(null); }
    load();
  }

  async function openDraft(draftId: string) {
    const r = unwrap(await api.adsMarketingModule.mailComposerDraftById(draftId).catch(() => null));
    if (r?.draft) {
      setActiveDraftId(draftId);
      setFullDraft(r.draft);
      setEditBody(r.draft.body);
      setEditSubject(r.draft.subject);
      setEditDraftId(null);
      setTone(r.draft.tone || "concise");
      setMode(r.draft.mode || "reply");
    }
  }

  async function dislike() {
    if (!activeDraftId) return;
    const r = unwrap(await api.adsMarketingModule.mailComposerDislike(activeDraftId, dislikeFeedback || undefined).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    if (r?.draft) { setFullDraft(r.draft); setEditBody(r.draft.body); setEditSubject(r.draft.subject); setDislikeFeedback(""); }
    load();
  }

  async function saveEdits() {
    if (!activeDraftId) return;
    const r = unwrap(await api.adsMarketingModule.mailComposerSaveEdits(activeDraftId, { subject: editSubject, body: editBody }).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    if (r?.draft) { setFullDraft(r.draft); setEditBody(r.draft.body); setEditSubject(r.draft.subject); }
    setEditDraftId(null);
    load();
  }

  const [draftsState, setDraftsState] = useState<any[]>([]);
  useEffect(() => {
    if (!loading) api.adsMarketingModule.mailComposerDrafts().then((r) => setDraftsState(unwrap(r)?.drafts || [])).catch(() => {});
  }, [loading, dash?.draftsTotal]);
  const knownDrafts = draftsState;

  const activeDraft = fullDraft;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><PenLine className="w-6 h-6 text-n0va-400" /> Neural Email Composer</h1>
          <p className="text-gray-500 mt-1 text-sm">Zero-tap drafting — the reply is already written (spec §3.3 Smart Compose)</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
            Auto-refresh 30s
          </label>
          <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : !dash ? (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-300 font-medium">Composer data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={load}>Retry</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{dash.draftsTotal ?? 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Drafts written</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-emerald-400">{dash.sent ?? 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Sent in 1 click</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-amber-400">{dash.dislikes ?? 0}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Dislikes → regenerated</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-n0va-300">{dash.avgConfidence ?? 0}<span className="text-sm text-gray-500">%</span></p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Avg confidence</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-n0va-400" />Zero-tap compose</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              <select value={messageId} onChange={(e) => setMessageId(e.target.value)} className="input">
                <option value="">Select an inbox message…</option>
                {(messages || []).map((m: any) => (
                  <option key={m._id} value={m._id}>{m.subject}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select value={mode} onChange={(e) => setMode(e.target.value)} className="input">
                  {(catalog?.modes || []).map((mo: any) => <option key={mo.id} value={mo.id}>{mo.name}</option>)}
                </select>
                <select value={tone} onChange={(e) => setTone(e.target.value)} className="input">
                  {(catalog?.tones || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <button className="btn-primary" disabled={busy === "compose"} onClick={compose}>
                <MessageSquarePlus className="w-4 h-4 inline mr-1" />{busy === "compose" ? "Drafting..." : "Write draft"}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1.5"><Zap className="w-3 h-3 text-n0va-400" />1 click to send — the draft is already written. Tones: {catalog?.tones?.map((t: any) => t.name).join(" / ")}.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-1.5"><PenLine className="w-4 h-4 text-n0va-400" />Draft preview</h2>
                {(knownDrafts || []).length > 0 && (
                  <button className="text-[11px] text-n0va-300 hover:text-n0va-200" onClick={() => openDraft(knownDrafts[0].draftId)}>Open latest</button>
                )}
              </div>
              {!activeDraftId ? (
                <p className="text-xs text-gray-500">Pick a message above and write a draft — or open one from the list.</p>
              ) : (
                <div className="space-y-3">
                  {activeDraft && (
                    <div className="p-3 rounded-lg bg-gray-800/40 border border-gray-700/40">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-gray-400">To: {(activeDraft.to || []).map((t: any) => t.email).join(", ")}</span>
                        <span className="text-n0va-300">{activeDraft.confidence}% confident</span>
                      </div>
                      <p className="text-sm font-semibold text-white mt-1.5">{activeDraft.subject}</p>
                      {editDraftId === activeDraftId ? (
                        <>
                          <input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="input text-xs mt-2" />
                          <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={9} className="input text-xs mt-2" />
                          <div className="flex gap-2 mt-2">
                            <button className="btn-primary text-xs" disabled={busy === "save"} onClick={saveEdits}>Save</button>
                            <button className="btn-secondary text-xs" onClick={() => setEditDraftId(null)}>Cancel</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <pre className="text-xs text-gray-200 whitespace-pre-wrap font-sans mt-2 min-h-[160px] max-h-[280px] overflow-y-auto">{activeDraft.body}</pre>
                          {activeDraft.basedOn && <p className="text-[10px] text-gray-500 mt-2 italic flex items-center gap-1"><Sparkles className="w-3 h-3 text-n0va-400" />{activeDraft.basedOn}</p>}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <button className="btn-primary text-xs" disabled={busy === "send"} onClick={() => act("send", () => api.adsMarketingModule.mailComposerSend(activeDraft.draftId))}>
                              <Send className="w-3 h-3 inline mr-1" />{busy === "send" ? "Sending…" : `Send (${dash.clicksToSend || 1} click)`}
                            </button>
                            <button className="btn-secondary text-xs" disabled={busy === "regen"} onClick={() => act("regen", () => api.adsMarketingModule.mailComposerRegenerate(activeDraft.draftId))}>
                              <RotateCw className="w-3 h-3 inline mr-1" />{busy === "regen" ? "…" : "Regenerate"}
                            </button>
                            <button className="btn-secondary text-xs" onClick={() => { setEditDraftId(activeDraftId); }}>
                              <Pencil className="w-3 h-3 inline mr-1" />Edit
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <input value={dislikeFeedback} onChange={(e) => setDislikeFeedback(e.target.value)} placeholder="What's wrong? (optional)" className="input text-xs flex-1 min-w-[140px]" />
                            <button className="btn-danger text-xs" disabled={busy === "dislike"} onClick={dislike}>
                              <ThumbsDown className="w-3 h-3 inline mr-1" />{busy === "dislike" ? "…" : "Don't like"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="card">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Hash className="w-4 h-4 text-n0va-400" />Detected intent
                  {dash.topIntents?.length > 0 && <span className="text-[11px] font-normal text-gray-500">· recent drafts</span>}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {dash.topIntents?.map((i: any) => (
                    <span key={i.intent} className="text-[11px] px-2 py-1 rounded bg-gray-800/60 text-gray-200">{i.intent} <span className="text-gray-500">{i.count}</span></span>
                  ))}
                  {!dash.topIntents?.length && <span className="text-[11px] px-2 py-1 rounded bg-gray-800/60 text-gray-500">No drafts yet</span>}
                </div>
                <div className="mt-3">
                  <p className="text-[11px] text-gray-500 mb-1.5">Intent detection keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {(catalog?.intents || []).map((i: any) => (
                      <span key={i.id} className="text-[10px] px-1.5 py-0.5 rounded bg-n0va-900/60 text-n0va-300 border border-n0va-700/40">{i.id}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Activity className="w-4 h-4 text-n0va-400" />Recent composer activity</h2>
                <div className="space-y-1.5">
                  {!dash.recentLog?.length && <p className="text-xs text-gray-500">No composer activity yet — write your first zero-tap draft.</p>}
                  {dash.recentLog?.map((e: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300 shrink-0 mt-0.5">{e.category}</span>
                      <p className="text-gray-300 min-w-0 truncate flex-1">{e.detail}</p>
                      <span className="text-[10px] text-gray-500 shrink-0">{new Date(e.at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><PenLine className="w-4 h-4 text-n0va-400" />Composer drafts {knownDrafts.length > 0 && <span className="text-[11px] font-normal text-gray-500">· {knownDrafts.length}</span>}</h2>
            <div className="space-y-1.5">
              {knownDrafts.length === 0 && <p className="text-xs text-gray-500">No composer drafts yet — write your first one above.</p>}
              {knownDrafts.map((d: any) => (
                <div key={d.draftId} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/40 text-xs">
                  <PenLine className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-200 truncate">{d.subject}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{d.intent} · {d.tone} · v{d.variant} · {(d.to || []).map((t: any) => t.email).join(", ")}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${d.status === "sent" ? "bg-emerald-900/50 text-emerald-300" : "bg-n0va-900/60 text-n0va-300"}`}>{d.status}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button className="text-[10px] text-n0va-300 hover:text-n0va-200" onClick={() => openDraft(d.draftId)}>Open</button>
                    {d.status !== "sent" && (
                      <button className="text-[10px] text-emerald-400 hover:text-emerald-300 ml-1" disabled={busy === `send-${d.draftId}`} onClick={() => act(`send-${d.draftId}`, () => api.adsMarketingModule.mailComposerSend(d.draftId))}>
                        <Send className="w-3 h-3" />
                      </button>
                    )}
                    <button className="text-[10px] text-red-400 hover:text-red-300 ml-1" disabled={busy === `del-${d.draftId}`} onClick={() => act(`del-${d.draftId}`, () => api.adsMarketingModule.mailComposerDelete(d.draftId))}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {dash.summary && <p className="text-[11px] text-gray-500 mt-2">{dash.summary}</p>}
          </div>
        </>
      )}
    </div>
  );
}