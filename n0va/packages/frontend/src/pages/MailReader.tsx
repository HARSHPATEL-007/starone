import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Mail, RefreshCw, X, ChevronLeft, Archive, Trash2, Star, Reply,
  Forward, Sparkles, Paperclip, Inbox, Send, Search,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

function fmtTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function fmtFull(iso: string | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function initials(name: string | undefined, email: string | undefined): string {
  const src = name || email || "?";
  const parts = src.split(/[\s@.]/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

const AVATAR_COLORS = ["bg-n0va-600/40 text-n0va-300", "bg-sky-600/30 text-sky-300", "bg-amber-600/30 text-amber-300", "bg-violet-600/30 text-violet-300", "bg-emerald-600/30 text-emerald-300", "bg-rose-600/30 text-rose-300"];

function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const SNOOZE_PRESETS: { label: string; until: string }[] = (() => {
  const at = (days: number, hour: number) => {
    const d = new Date(Date.now() + days * 86400000);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const laterToday = at(0, 18);
  if (laterToday <= new Date()) laterToday.setDate(laterToday.getDate() + 1);
  return [
    { label: "Later today", until: laterToday.toISOString() },
    { label: "Tomorrow", until: at(1, 9).toISOString() },
    { label: "Next week", until: at(7, 9).toISOString() },
  ];
})();

export default function MailReader() {
  const { addToast } = useToast();
  const [folders, setFolders] = useState<any[]>([]);
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [folder, setFolder] = useState<string>("inbox");
  const [messages, setMessages] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [fwdOpen, setFwdOpen] = useState(false);
  const [reply, setReply] = useState<any>(null);
  const [fwd, setFwd] = useState<any>(null);
  const [aiReplies, setAiReplies] = useState<any[] | null>(null);
  const [swipe, setSwipe] = useState<Record<string, { startX: number; dx: number; dragging: boolean }>>({});
  const [refreshOn, setRefreshOn] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const selectedMsg = useMemo(
    () => thread?.messages?.find((m: any) => m._id === selectedId) || thread?.messages?.[0] || null,
    [thread, selectedId],
  );
  const threadSubject = thread?.messages?.[0]?.subject || "(no subject)";

  const loadSummary = useCallback(async () => {
    const [sum, mb] = await Promise.all([
      api.adsMarketingModule.mailUnreadSummary().catch(() => null),
      api.adsMarketingModule.mailMailboxes().catch(() => null),
    ]);
    const s = unwrap(sum);
    setFolders(s?.folders || []);
    setMailboxes(Array.isArray(mb) ? mb : mb?.data || []);
  }, []);

  const loadMessages = useCallback(async (f: string) => {
    const r = unwrap(await api.adsMarketingModule.mailMessages({ folder: f, limit: 100 }).catch(() => null));
    setMessages(r?.messages || []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await loadSummary();
    await loadMessages(folder);
    if (selectedId) {
      const t = unwrap(await api.adsMarketingModule.mailThread(selectedId).catch(() => null));
      if (t?.messages?.length) setThread(t);
    }
    setLastUpdated(new Date().toISOString());
    setLoading(false);
  }, [folder, selectedId, loadSummary, loadMessages]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  useEffect(() => {
    if (!refreshOn) return;
    const t = setInterval(() => { loadAll(); }, 30000);
    return () => clearInterval(t);
  }, [refreshOn, loadAll]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable)) return;
      if (e.key === "Escape") { setSelectedId(null); setThread(null); }
      if (e.key === "j") { moveSelection(1); }
      if (e.key === "k") { moveSelection(-1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  function moveSelection(delta: number) {
    const filtered = filteredMessages();
    if (!filtered.length) return;
    const idx = filtered.findIndex((m) => m._id === selectedId);
    const next = filtered[Math.max(0, Math.min(filtered.length - 1, (idx < 0 ? (delta > 0 ? -1 : 0) : idx) + delta))];
    if (next) openMessage(next);
  }

  function filteredMessages() {
    const needle = q.trim().toLowerCase();
    if (!needle) return messages;
    return messages.filter((m) =>
      (m.subject || "").toLowerCase().includes(needle) ||
      (m.from?.email || "").toLowerCase().includes(needle) ||
      (m.from?.name || "").toLowerCase().includes(needle) ||
      (m.body || "").toLowerCase().includes(needle),
    );
  }

  async function openMessage(m: any) {
    if (!m.read) {
      api.adsMarketingModule.mailMarkRead(m._id, true).catch(() => null);
      setMessages((prev) => prev.map((x) => (x._id === m._id ? { ...x, read: true } : x)));
    }
    setSelectedId(m._id);
    setReplyOpen(false);
    setFwdOpen(false);
    setAiReplies(null);
    const t = unwrap(await api.adsMarketingModule.mailThread(m.threadId || m._id).catch(() => null));
    setThread(t);
  }

  async function act(fn: () => Promise<any>, msgId: string, doneMsg: string) {
    setBusy(true);
    try {
      const r = unwrap(await fn());
      addToast("success", doneMsg, r?.summary || "");
      if (selectedId === msgId) { setSelectedId(null); setThread(null); }
      await loadMessages(folder);
    } catch (e: any) {
      addToast("error", "Action failed", e?.message || "");
    } finally {
      setBusy(false);
    }
  }

  const doArchive = (id: string) => act(() => api.adsMarketingModule.mailArchive(id), id, "Archived");
  const doTrash = (id: string) => act(() => api.adsMarketingModule.mailTrash(id), id, "Moved to trash");
  const doStar = (m: any) => act(() => api.adsMarketingModule.mailToggleStar(m._id), "", m.starred ? "Unstarred" : "Starred");

  function startReply() {
    const from = thread?.messages?.[thread.messages.length - 1]?.from;
    const subject = threadSubject.startsWith("Re:")
      ? threadSubject
      : `Re: ${threadSubject}`;
    const last = thread?.messages?.[thread.messages.length - 1];
    const quote = `\n\n\nOn ${fmtFull(last?.receivedAt || last?.sentAt)}, ${last?.from?.name || last?.from?.email} wrote:\n${(last?.body || "").split("\n").map((l: string) => `> ${l}`).join("\n")}`;
    setFwdOpen(false);
    setReply({
      mailboxId: mailboxes[0]?.mailboxId || "",
      to: from?.email || "",
      subject,
      body: quote,
    });
    setReplyOpen(true);
  }

  function startForward() {
    const last = thread?.messages?.[thread.messages.length - 1];
    setReplyOpen(false);
    setFwd({
      mailboxId: mailboxes[0]?.mailboxId || "",
      to: "",
      subject: `Fwd: ${threadSubject}`,
      body: `\n\n---------- Forwarded message ----------\nFrom: ${last?.from?.name || last?.from?.email} <${last?.from?.email}>\nDate: ${fmtFull(last?.receivedAt || last?.sentAt)}\nSubject: ${last?.subject || threadSubject}\n\n${last?.body || ""}`,
    });
    setFwdOpen(true);
  }

  async function sendReply() {
    if (!reply?.to || !reply?.subject) { addToast("warning", "Missing fields", "Recipient and subject are required."); return; }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailSend(reply.mailboxId, {
        to: reply.to, subject: reply.subject, body: reply.body || "", importance: "normal",
      }));
      addToast("success", "Reply sent", r?.summary || "");
      setReplyOpen(false);
      await loadMessages(folder);
    } catch (e: any) {
      addToast("error", "Send failed", e?.message || "Check recipient address.");
    } finally {
      setBusy(false);
    }
  }

  async function sendForward() {
    if (!fwd?.to || !fwd?.subject) { addToast("warning", "Missing fields", "Recipient and subject are required."); return; }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailSend(fwd.mailboxId, {
        to: fwd.to, subject: fwd.subject, body: fwd.body || "", importance: "normal",
      }));
      addToast("success", "Forwarded", r?.summary || "");
      setFwdOpen(false);
      await loadMessages(folder);
    } catch (e: any) {
      addToast("error", "Send failed", e?.message || "Check recipient address.");
    } finally {
      setBusy(false);
    }
  }

  async function loadAiReplies() {
    if (!selectedMsg) return;
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailSmartReply(selectedMsg._id).catch(() => null));
      setAiReplies(r?.replies || r?.suggestions || []);
    } catch { setAiReplies([]); } finally { setBusy(false); }
  }

  function useAiReply(text: string) {
    setReply((prev: any) => prev || { mailboxId: mailboxes[0]?.mailboxId || "", to: thread?.messages?.[thread.messages.length - 1]?.from?.email || "", subject: threadSubject.startsWith("Re:") ? threadSubject : `Re: ${threadSubject}`, body: "" });
    setReply((prev: any) => ({ ...prev, body: text }));
    setReplyOpen(true);
    setAiReplies(null);
  }

  function onRowTouchStart(e: React.TouchEvent, id: string) {
    setSwipe((prev) => ({ ...prev, [id]: { startX: e.touches[0].clientX, dx: 0, dragging: true } }));
  }

  function onRowTouchMove(e: React.TouchEvent, id: string) {
    const s = swipe[id];
    if (!s?.dragging) return;
    const dx = e.touches[0].clientX - s.startX;
    setSwipe((prev) => ({ ...prev, [id]: { ...prev[id], dx: Math.max(-160, Math.min(160, dx)) } }));
  }

  function onRowTouchEnd(id: string) {
    const s = swipe[id];
    if (!s) return;
    if (s.dx < -60) { setSwipe((prev) => ({ ...prev, [id]: { ...prev[id], dragging: false, dx: 0 } })); doArchive(id); }
    else if (s.dx > 60) { setSwipe((prev) => ({ ...prev, [id]: { ...prev[id], dragging: false, dx: 0 } })); doTrash(id); }
    else setSwipe((prev) => ({ ...prev, [id]: { ...prev[id], dragging: false, dx: 0 } }));
  }

  const list = filteredMessages();
  const viewIsReader = !!selectedId && window.innerWidth < 1024;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Mail className="w-6 h-6 text-n0va-400" /> Mail Reader</h1>
          <p className="text-gray-500 mt-1 text-sm">Split-view reading, inline replies, and swipe gestures</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && <span className="text-xs text-gray-500 hidden md:inline">Updated {new Date(lastUpdated).toLocaleTimeString()}</span>}
          <button className={`text-xs px-2 py-1 rounded ${refreshOn ? "bg-n0va-600/20 text-n0va-400" : "bg-gray-800 text-gray-400"}`} onClick={() => setRefreshOn((v) => !v)} title="Auto-refresh 30s">
            {refreshOn ? "Auto on" : "Auto off"}
          </button>
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4 items-start">
          <aside className={`${viewIsReader ? "hidden" : "block"} lg:block`}>
            <div className="card !p-3 space-y-3">
              <div className="flex items-center gap-1.5 overflow-x-auto lg:flex-wrap">
                {(folders.length ? folders : []).map((f: any) => (
                  <button
                    key={f.name}
                    onClick={() => { setFolder(f.name); setSelectedId(null); setThread(null); }}
                    className={`text-xs px-2.5 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                      folder === f.name ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/30"
                      : "bg-gray-800 text-gray-400 border border-transparent hover:text-gray-200"
                    }`}
                  >
                    {f.name} {f.unread > 0 && <span className="text-n0va-400 font-semibold">({f.unread})</span>}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-600" />
                <input className="input !pl-8 text-xs" placeholder="Search subject, sender, body…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="space-y-1 max-h-[calc(100vh-340px)] min-h-[320px] overflow-y-auto">
                {list.length === 0 && (
                  <div className="text-center py-10 text-gray-500 text-sm">
                    <Inbox className="w-6 h-6 mx-auto mb-2 text-gray-700" /> No messages in {folder}
                  </div>
                )}
                {list.map((m: any) => {
                  const dx = swipe[m._id]?.dx || 0;
                  const dragging = !!swipe[m._id]?.dragging;
                  const active = m._id === selectedId;
                  const seed = m.from?.email || m.subject || m._id;
                  return (
                    <div key={m._id} className="relative overflow-hidden rounded-lg group">
                      <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-3 text-[10px] font-semibold bg-emerald-600/30 text-emerald-300">Archive</div>
                      <div className="absolute inset-y-0 left-0 flex items-center justify-start pl-3 text-[10px] font-semibold bg-red-600/30 text-red-300">Trash</div>
                      <div
                        onClick={() => openMessage(m)}
                        onTouchStart={(e) => onRowTouchStart(e, m._id)}
                        onTouchMove={(e) => onRowTouchMove(e, m._id)}
                        onTouchEnd={() => onRowTouchEnd(m._id)}
                        className={`relative flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors touch-pan-y ${
                          active ? "bg-n0va-600/20 border border-n0va-600/40" : "border border-transparent hover:bg-gray-800/60"
                        }`}
                        style={{
                          transform: dx ? `translateX(${dx}px)` : undefined,
                          transition: dragging ? "none" : "transform 0.2s ease",
                        }}
                      >
                        <span className={`flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold shrink-0 ${avatarColor(seed)}`}>
                          {initials(m.from?.name, m.from?.email)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs truncate ${m.read ? "text-gray-400" : "text-white font-semibold"}`}>
                              {m.from?.name || m.from?.email}
                            </p>
                            <span className="text-[10px] text-gray-600 shrink-0">{fmtTime(m.receivedAt)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs truncate ${m.read ? "text-gray-500" : "text-gray-200 font-medium"}`}>{m.subject || "(no subject)"}</p>
                            {m.attachments?.length > 0 && <Paperclip className="w-3 h-3 text-gray-600 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] text-gray-600 truncate flex-1">{(m.body || "").slice(0, 90)}</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); doStar(m); }}
                              className={`shrink-0 ${m.starred ? "text-amber-400" : "text-gray-600 hover:text-gray-400"} lg:opacity-0 lg:group-hover:opacity-100`}
                              title="Star"
                            >
                              <Star className={`w-3.5 h-3.5 ${m.starred ? "fill-amber-400" : ""}`} />
                            </button>
                            {!m.read && <span className="w-1.5 h-1.5 rounded-full bg-n0va-500 shrink-0" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className={`${viewIsReader ? "block" : "hidden"} lg:block`}>
            {!thread ? (
              <div className="card flex flex-col items-center justify-center text-center py-20">
                <Mail className="w-10 h-10 text-gray-800 mb-3" />
                <p className="text-gray-500 text-sm">Select a message to start reading</p>
                <p className="text-xs text-gray-700 mt-1">J / K navigate · swipe left to archive, right to trash</p>
              </div>
            ) : (
              <div className="card !p-0 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                  <button className="btn-secondary p-1.5 lg:hidden" onClick={() => { setSelectedId(null); setThread(null); }} title="Back"><ChevronLeft className="w-4 h-4" /></button>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-white truncate">{threadSubject}</h2>
                    <p className="text-[11px] text-gray-500">{thread.messages.length} message(s) · {selectedMsg?.from?.name || selectedMsg?.from?.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="btn-secondary p-1.5" disabled={busy} onClick={() => doStar(selectedMsg)} title={selectedMsg?.starred ? "Unstar" : "Star"}>
                      <Star className={`w-3.5 h-3.5 ${selectedMsg?.starred ? "text-amber-400 fill-amber-400" : ""}`} />
                    </button>
                    <button className="btn-secondary p-1.5" disabled={busy} onClick={() => doArchive(selectedMsg._id)} title="Archive"><Archive className="w-3.5 h-3.5" /></button>
                    <button className="btn-secondary p-1.5" disabled={busy} onClick={() => doTrash(selectedMsg._id)} title="Trash"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="p-4 space-y-4 max-h-[calc(100vh-420px)] min-h-[380px] overflow-y-auto">
                  {thread.messages.map((m: any) => (
                    <div key={m._id} className="border border-gray-800 rounded-lg p-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-bold shrink-0 ${avatarColor(m.from?.email || m.from?.name || m._id)}`}>
                          {initials(m.from?.name, m.from?.email)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">{m.from?.name || m.from?.email}</p>
                          <p className="text-[11px] text-gray-500 truncate">{m.to?.email ? `to ${m.to.email}` : m.from?.email} · {fmtFull(m.receivedAt || m.sentAt)}</p>
                        </div>
                        <button
                          onClick={() => act(() => api.adsMarketingModule.mailToggleStar(m._id), "", "Toggled")}
                          className={`shrink-0 ${m.starred ? "text-amber-400" : "text-gray-600 hover:text-gray-400"}`}
                          title="Star"
                        >
                          <Star className={`w-3.5 h-3.5 ${m.starred ? "fill-amber-400" : ""}`} />
                        </button>
                      </div>
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

                <div className="border-t border-gray-800 p-3">
                  {!replyOpen && !fwdOpen && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button className="btn-primary flex items-center gap-1.5 text-xs" disabled={busy} onClick={startReply}><Reply className="w-3.5 h-3.5" /> Reply</button>
                      <button className="btn-secondary flex items-center gap-1.5 text-xs" disabled={busy} onClick={startForward}><Forward className="w-3.5 h-3.5" /> Forward</button>
                      <button className="btn-secondary flex items-center gap-1.5 text-xs" disabled={busy} onClick={loadAiReplies}><Sparkles className="w-3.5 h-3.5 text-n0va-400" /> AI reply</button>
                      <div className="flex items-center gap-1.5 ml-auto">
                        {SNOOZE_PRESETS.map((s) => (
                          <button
                            key={s.label}
                            className="text-[10px] px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-white"
                            disabled={busy}
                            onClick={() => act(() => api.adsMarketingModule.mailSnooze(selectedMsg._id, s.until), "", `Snoozed ${s.label.toLowerCase()}`)}
                          >
                            Snooze {s.label.toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiReplies !== null && !replyOpen && !fwdOpen && (
                    <div className="mt-2.5 space-y-1.5">
                      <p className="text-[11px] text-n0va-400 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Smart replies — tap to use</p>
                      {aiReplies.length === 0 && <p className="text-xs text-gray-600">No suggestions for this message.</p>}
                      {aiReplies.map((r: any, i: number) => (
                        <button
                          key={i}
                          className="block w-full text-left text-xs text-gray-300 bg-gray-800/70 border border-gray-700 rounded-lg px-3 py-2 hover:border-n0va-600/50"
                          onClick={() => useAiReply(r.text || "")}
                        >
                          <span className="text-gray-500 uppercase tracking-wide text-[9px] mr-2">{r.tone || "reply"}</span>
                          <span className="line-clamp-2">{r.text}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {replyOpen && reply && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-white flex items-center gap-1"><Reply className="w-3.5 h-3.5 text-n0va-400" /> Reply</p>
                        <button className="ml-auto text-gray-500 hover:text-white" onClick={() => setReplyOpen(false)} title="Close"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">From</label>
                          <select className="select text-xs" value={reply.mailboxId} onChange={(e) => setReply({ ...reply, mailboxId: e.target.value })}>
                            {(mailboxes.length ? mailboxes : []).map((mb: any) => (
                              <option key={mb.mailboxId} value={mb.mailboxId}>{mb.name} — {mb.email}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">To</label>
                          <input className="input text-xs" value={reply.to} onChange={(e) => setReply({ ...reply, to: e.target.value })} />
                        </div>
                      </div>
                      <input className="input text-xs" placeholder="Subject" value={reply.subject} onChange={(e) => setReply({ ...reply, subject: e.target.value })} />
                      <textarea className="input text-xs !min-h-[120px]" placeholder="Write your reply…" value={reply.body} onChange={(e) => setReply({ ...reply, body: e.target.value })} />
                      <div className="flex items-center gap-2">
                        <button className="btn-primary flex items-center gap-1.5 text-xs" disabled={busy} onClick={sendReply}><Send className="w-3.5 h-3.5" /> Send reply</button>
                        {!busy && <span className="text-[10px] text-gray-600">Ctrl+Enter to send</span>}
                      </div>
                    </div>
                  )}
                  {fwdOpen && fwd && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-white flex items-center gap-1"><Forward className="w-3.5 h-3.5 text-n0va-400" /> Forward</p>
                        <button className="ml-auto text-gray-500 hover:text-white" onClick={() => setFwdOpen(false)} title="Close"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">From</label>
                          <select className="select text-xs" value={fwd.mailboxId} onChange={(e) => setFwd({ ...fwd, mailboxId: e.target.value })}>
                            {(mailboxes.length ? mailboxes : []).map((mb: any) => (
                              <option key={mb.mailboxId} value={mb.mailboxId}>{mb.name} — {mb.email}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">To</label>
                          <input className="input text-xs" placeholder="recipient@example.com" value={fwd.to} onChange={(e) => setFwd({ ...fwd, to: e.target.value })} />
                        </div>
                      </div>
                      <textarea className="input text-xs !min-h-[140px]" placeholder="Add a note…" value={fwd.body} onChange={(e) => setFwd({ ...fwd, body: e.target.value })} />
                      <button className="btn-primary flex items-center gap-1.5 text-xs" disabled={busy} onClick={sendForward}><Send className="w-3.5 h-3.5" /> Forward</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
