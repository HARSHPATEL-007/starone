import { useEffect, useState, useCallback } from "react";
import {
  Inbox, Send, FileText, Archive, Trash2, Star, RotateCcw, AlertTriangle,
  SquarePen, RefreshCw, X, Tag, Paperclip, ChevronLeft, Folder, ShieldAlert,
  Reply, CheckCheck, Mail,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const FOLDER_ICONS: Record<string, any> = {
  inbox: Inbox, sent: Send, drafts: FileText, archive: Archive,
  trash: Trash2, spam: ShieldAlert,
};

const FOLDER_BADGE: Record<string, string> = {
  inbox: "bg-n0va-600/20 text-n0va-400 border border-n0va-600/30",
  sent: "bg-sky-500/10 text-sky-400",
  drafts: "bg-gray-500/10 text-gray-400",
  archive: "bg-amber-500/10 text-amber-400",
  trash: "bg-red-500/10 text-red-400",
  spam: "bg-purple-500/10 text-purple-400",
};

function fmtTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function priorityBadge(p: string): string {
  if (p === "critical") return "bg-red-500/15 text-red-400";
  if (p === "high") return "bg-orange-500/15 text-orange-400";
  if (p === "low") return "bg-gray-500/15 text-gray-400";
  return "";
}

export default function MailInbox() {
  const { addToast } = useToast();
  const [folders, setFolders] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [folder, setFolder] = useState<string>("inbox");
  const [messages, setMessages] = useState<any[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listUnread, setListUnread] = useState(0);
  const [thread, setThread] = useState<any>(null);
  const [threadMsgId, setThreadMsgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [compose, setCompose] = useState<any>(null);
  const [newLabel, setNewLabel] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const loadSummary = useCallback(async () => {
    const [sum, mb] = await Promise.all([
      api.adsMarketingModule.mailUnreadSummary().catch(() => null),
      api.adsMarketingModule.mailMailboxes().catch(() => null),
    ]);
    const s = unwrap(sum);
    setFolders(s?.folders || []);
    setTotals(s?.totals || null);
    setMailboxes(Array.isArray(mb) ? mb : mb?.data || []);
    return s;
  }, []);

  const loadMessages = useCallback(async (f: string) => {
    const r = unwrap(await api.adsMarketingModule.mailMessages({ folder: f, limit: 100 }).catch(() => null));
    setMessages(r?.messages || []);
    setListTotal(r?.total || 0);
    setListUnread(r?.unread || 0);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await loadSummary();
    await loadMessages(folder);
    setLastUpdated(new Date().toISOString());
    setLoading(false);
  }, [folder, loadSummary, loadMessages]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeThread();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setCompose((prev: any) => prev || { mailboxId: mailboxes[0]?.mailboxId || "", to: "", subject: "", body: "", importance: "normal" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mailboxes]);

  async function openMessage(m: any) {
    if (!m.read) {
      api.adsMarketingModule.mailMarkRead(m._id, true).catch(() => null);
      setMessages((prev) => prev.map((x) => (x._id === m._id ? { ...x, read: true } : x)));
    }
    setThreadMsgId(m._id);
    const t = unwrap(await api.adsMarketingModule.mailThread(m.threadId || m._id).catch(() => null));
    setThread(t);
    await loadSummary();
  }

  function closeThread() { setThread(null); setThreadMsgId(null); }

  async function act(fn: Promise<any>, okMsg: string) {
    setBusy(true);
    try {
      const r = unwrap(await fn);
      addToast("success", okMsg, r?.summary || "");
      closeThread();
      await loadAll();
    } catch (e: any) {
      addToast("error", "Action failed", e?.message || "Try again.");
    } finally {
      setBusy(false);
    }
  }

  function toggleStarLocal(m: any) {
    api.adsMarketingModule.mailToggleStar(m._id).catch(() => null);
    setMessages((prev) => prev.map((x) => (x._id === m._id ? { ...x, starred: !x.starred } : x)));
  }

  async function applyLabel(m: any) {
    const label = newLabel.trim();
    if (!label) return;
    try {
      const r = unwrap(await api.adsMarketingModule.mailApplyLabel(m._id, label));
      addToast("success", "Label added", r?.summary || "");
      setNewLabel("");
      const t = unwrap(await api.adsMarketingModule.mailThread(m.threadId || m._id).catch(() => null));
      setThread(t);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Failed to label", e?.message);
    }
  }

  async function removeLabel(m: any, label: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailRemoveLabel(m._id, label));
      addToast("success", "Label removed", r?.summary || "");
      const t = unwrap(await api.adsMarketingModule.mailThread(m.threadId || m._id).catch(() => null));
      setThread(t);
    } catch (e: any) {
      addToast("error", "Failed to remove label", e?.message);
    }
  }

  async function moveTo(m: any, target: string) {
    await act(api.adsMarketingModule.mailMove(m._id, target), `Moved to ${target}`);
  }

  async function sendMail() {
    if (!compose?.to || !compose?.subject) {
      addToast("warning", "Missing fields", "Recipient and subject are required.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailSend(compose.mailboxId, {
        to: compose.to, subject: compose.subject, body: compose.body || "",
        importance: compose.importance || "normal",
      }));
      addToast("success", "Message sent", r?.summary || "");
      setCompose(null);
      await loadAll();
      if (folder === "inbox") await loadMessages("inbox");
    } catch (e: any) {
      addToast("error", "Send failed", e?.message || "Check recipient address.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailSaveDraft(compose.mailboxId, {
        to: compose.to || "", subject: compose.subject || "", body: compose.body || "",
      }));
      addToast("success", "Draft saved", r?.summary || "");
      setCompose(null);
    } catch (e: any) {
      addToast("error", "Draft failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  const summaryText = totals
    ? `${totals.totalMessages} messages · ${totals.totalUnread} unread · ${totals.drafts} drafts · ${totals.starred} starred`
    : "";
  const selectedMsg = thread?.messages?.find((m: any) => m._id === threadMsgId) || thread?.messages?.[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Mail className="w-6 h-6 text-n0va-400" /> N0VA Mail</h1>
          <p className="text-gray-500 mt-1 text-sm">Inbox, threads, and one-click triage — {summaryText}</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && <span className="text-xs text-gray-500 hidden md:inline">Updated {new Date(lastUpdated).toLocaleTimeString()}</span>}
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setCompose({ mailboxId: mailboxes[0]?.mailboxId || "", to: "", subject: "", body: "", importance: "normal" })}>
            <SquarePen className="w-4 h-4" /> <span className="hidden sm:inline">Compose</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-4">
          <aside>
            <div className="card !p-2">
              <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
                {(folders.length ? folders : []).map((f: any) => {
                  const Icon = FOLDER_ICONS[f.name] || Folder;
                  const active = folder === f.name;
                  return (
                    <button
                      key={f.name}
                      onClick={() => { setFolder(f.name); closeThread(); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                        active ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/30"
                        : "text-gray-400 hover:bg-gray-800/60 border border-transparent"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="capitalize">{f.name}</span>
                      {f.unread > 0 && (
                        <span className="ml-auto text-[10px] font-bold bg-n0va-600 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{f.unread}</span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          <div className="space-y-4">
            {!folders.length && !messages.length && (
              <div className="card border-red-500/30 bg-red-500/5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-sm text-red-300 font-medium">Mail data unavailable</p>
                    <p className="text-xs text-red-400/70">Check that the backend is running.</p>
                  </div>
                  <button className="btn-secondary text-xs ml-auto" onClick={loadAll}>Retry</button>
                </div>
              </div>
            )}

            <div className="card !p-2">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white capitalize">{folder}</span>
                  {listUnread > 0 && <span className="text-xs text-n0va-400">{listUnread} unread</span>}
                </div>
                <span className="text-xs text-gray-500">{listTotal} messages</span>
              </div>
              <ul className="divide-y divide-gray-800/50">
                {(messages.length ? messages : []).map((m: any) => (
                  <li key={m._id}>
                    <button
                      onClick={() => openMessage(m)}
                      className={`w-full text-left px-3 py-3 hover:bg-gray-800/40 transition-colors flex gap-3 ${m.read ? "" : "bg-n0va-600/[0.07]"}`}
                    >
                      <span
                        onClick={(e) => { e.stopPropagation(); toggleStarLocal(m); }}
                        className={`mt-0.5 shrink-0 ${m.starred ? "text-amber-400" : "text-gray-600 hover:text-gray-400"}`}
                        title={m.starred ? "Unstar" : "Star"}
                      >
                        <Star className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${m.read ? "text-gray-300" : "text-white font-semibold"}`}>
                            {m.from?.name || m.from?.email || "Unknown"}
                          </span>
                          <span className="text-[10px] text-gray-500 shrink-0">{fmtTime(m.receivedAt)}</span>
                        </span>
                        <span className="flex items-center gap-1.5 mt-0.5">
                          {!m.read && <span className="w-1.5 h-1.5 rounded-full bg-n0va-500 shrink-0" />}
                          <span className={`text-sm truncate ${m.read ? "text-gray-500" : "text-gray-300"}`}>{m.subject}</span>
                          {m.importance === "high" && m.ai?.priority !== "normal" && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ${priorityBadge(m.ai?.priority || (m.importance === "high" ? "high" : ""))}`}>
                              {m.ai?.priority || "high"}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1 mt-0.5 text-xs text-gray-600 truncate">
                          <span className="truncate">{m.preview || m.body?.slice(0, 120) || ""}</span>
                          {m.attachments?.length > 0 && <Paperclip className="w-3 h-3 shrink-0 text-gray-500" />}
                          {m.ai?.isSpam && <span className="shrink-0 text-purple-400">spam</span>}
                        </span>
                        {(m.labels || []).filter((l: string) => l !== "Inbox").length > 0 && (
                          <span className="flex flex-wrap gap-1 mt-1">
                            {(m.labels || []).filter((l: string) => l !== "Inbox").map((l: string) => (
                              <span key={l} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300">{l}</span>
                            ))}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
                {!loading && messages.length === 0 && (
                  <li className="px-3 py-10 text-center text-sm text-gray-500">No messages in {folder}</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {thread && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={closeThread} />
          <div className="fixed inset-x-0 bottom-0 z-50 lg:static lg:z-auto bg-gray-900 border-t lg:border border-gray-800 rounded-t-2xl lg:rounded-xl max-h-[85vh] lg:max-h-none overflow-y-auto shadow-2xl">
            <div className="p-4 lg:p-6">
              <div className="flex items-center gap-2 lg:hidden mb-3">
                <button className="btn-secondary p-2" onClick={closeThread}><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm font-semibold text-white">Thread</span>
              </div>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-white break-words">{thread.subject}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {thread.messageCount} message{thread.messageCount === 1 ? "" : "s"} · {(thread.participants || []).join(", ")}
                  </p>
                </div>
                {selectedMsg?.ai?.priority && (
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${priorityBadge(selectedMsg.ai.priority)}`}>{selectedMsg.ai.priority}</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap mt-3">
                <button className="btn-secondary text-xs px-2 py-1.5" disabled={busy} onClick={() => {
                  const m = selectedMsg;
                  setCompose({ mailboxId: m?.mailboxId || mailboxes[0]?.mailboxId || "", to: m?.from?.email || "", subject: `Re: ${thread.subject}`, body: "", importance: "normal" });
                }}><Reply className="w-3.5 h-3.5" /></button>
                <button className="btn-secondary text-xs px-2 py-1.5" disabled={busy} onClick={() => selectedMsg && act(api.adsMarketingModule.mailMarkRead(selectedMsg._id, !selectedMsg.read), selectedMsg.read ? "Marked unread" : "Marked read")}>
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
                <button className="btn-secondary text-xs px-2 py-1.5" disabled={busy} onClick={() => selectedMsg && toggleStarLocal(selectedMsg)}>
                  <Star className={`w-3.5 h-3.5 ${selectedMsg?.starred ? "text-amber-400" : ""}`} />
                </button>
                {folder !== "archive" && (
                  <button className="btn-secondary text-xs px-2 py-1.5" disabled={busy} onClick={() => selectedMsg && act(api.adsMarketingModule.mailArchive(selectedMsg._id), "Archived")}>
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                )}
                {folder === "trash" ? (
                  <>
                    <button className="btn-secondary text-xs px-2 py-1.5" disabled={busy} onClick={() => selectedMsg && act(api.adsMarketingModule.mailRestore(selectedMsg._id), "Restored")}>
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button className="btn-danger text-xs px-2 py-1.5" disabled={busy} onClick={() => selectedMsg && act(api.adsMarketingModule.mailDeleteMessage(selectedMsg._id), "Deleted forever")}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button className="btn-secondary text-xs px-2 py-1.5" disabled={busy} onClick={() => selectedMsg && act(api.adsMarketingModule.mailTrash(selectedMsg._id), "Moved to trash")}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {folder !== "trash" && (
                  <select
                    className="select text-xs !w-auto !py-1.5"
                    value=""
                    disabled={busy}
                    onChange={(e) => { if (e.target.value && selectedMsg) moveTo(selectedMsg, e.target.value); e.target.value = ""; }}
                  >
                    <option value="">Move to…</option>
                    {folders.filter((f: any) => f.name !== folder && !["sent", "drafts"].includes(f.name)).map((f: any) => (
                      <option key={f.name} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {selectedMsg && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <Tag className="w-3.5 h-3.5 text-gray-500" />
                  {(selectedMsg.labels || []).filter((l: string) => l !== "Inbox").map((l: string) => (
                    <span key={l} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-gray-700/60 text-gray-300">
                      {l}
                      <button onClick={() => removeLabel(selectedMsg, l)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  <input
                    className="input text-xs !py-1 !w-32"
                    placeholder="New label…"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") applyLabel(selectedMsg); }}
                  />
                  <button className="btn-secondary text-xs px-2 py-1" disabled={busy || !newLabel.trim()} onClick={() => applyLabel(selectedMsg)}>Add</button>
                </div>
              )}

              <div className="space-y-4 mt-4">
                {(thread.messages || []).map((m: any) => (
                  <div key={m._id} className="border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{m.from?.name || m.from?.email}</p>
                        <p className="text-xs text-gray-500 truncate">{m.from?.email}</p>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(m.receivedAt || m.sentAt).toLocaleString()}</span>
                    </div>
                    {(m.labels || []).filter((l: string) => l !== "Inbox").length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(m.labels || []).filter((l: string) => l !== "Inbox").map((l: string) => (
                          <span key={l} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300">{l}</span>
                        ))}
                      </div>
                    )}
                    {m.ai?.summary && (
                      <p className="text-xs text-n0va-400 mt-2 italic">Ani: {m.ai.summary}</p>
                    )}
                    <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap break-words">{m.body}</p>
                    {m.attachments?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {(m.attachments || []).map((a: any, i: number) => (
                          <span key={i} className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-700">
                            <Paperclip className="w-3 h-3" /> {a.name} · {(a.sizeBytes / 1024).toFixed(0)} KB
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {compose && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><SquarePen className="w-4 h-4 text-n0va-400" /> New message</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setCompose(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">From</label>
                  <select className="select" value={compose.mailboxId} onChange={(e) => setCompose({ ...compose, mailboxId: e.target.value })}>
                    {(mailboxes.length ? mailboxes : []).map((mb: any) => (
                      <option key={mb.mailboxId} value={mb.mailboxId}>{mb.name} — {mb.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Importance</label>
                  <select className="select" value={compose.importance} onChange={(e) => setCompose({ ...compose, importance: e.target.value })}>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">To</label>
                <input className="input" placeholder="recipient@company.com" value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Subject</label>
                <input className="input" placeholder="Subject" value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Body</label>
                <textarea className="input min-h-[140px]" placeholder="Write your message…" value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 justify-end pt-1">
                <button className="btn-secondary text-sm" disabled={busy} onClick={saveDraft}>Save draft</button>
                <button className="btn-primary text-sm flex items-center gap-2" disabled={busy} onClick={sendMail}>
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
