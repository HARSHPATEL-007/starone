import { useEffect, useState, useCallback } from "react";
import {
  MessagesSquare, Hash, Lock, Users, Send, RefreshCw, Sparkles, Plus, Pin, CheckCircle2, Brain, Smile, CornerDownRight, Bot, X,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

function me(): string {
  try {
    const u = localStorage.getItem("n0va_user");
    if (u) return JSON.parse(u).userId || "user_001";
  } catch {}
  return "user_001";
}

const ROOM_TYPE_ICON: Record<string, typeof Hash> = {
  dm: Lock,
  group_dm: Users,
  public_channel: Hash,
  private_channel: Lock,
  announcement: Bot,
};

const SENDER_STYLE: Record<string, string> = {
  user: "bg-emerald-900/60 text-emerald-300 border border-emerald-700/40",
  bot: "bg-sky-900/60 text-sky-300 border border-sky-700/40",
  ai: "bg-violet-900/60 text-violet-300 border border-violet-700/40",
  system: "bg-gray-700/60 text-gray-300 border border-gray-600/40",
  external: "bg-amber-900/60 text-amber-300 border border-amber-700/40",
  neural: "bg-fuchsia-900/60 text-fuchsia-300 border border-fuchsia-700/40",
};

function fmtTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatHome() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [room, setRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [commands, setCommands] = useState<any[]>([]);
  const [pinned, setPinned] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("public_channel");
  const [threadMsg, setThreadMsg] = useState<any>(null);
  const [thread, setThread] = useState<any>(null);
  const [threadReply, setThreadReply] = useState("");

  const load = useCallback(async () => {
    const [o, r, c, p] = await Promise.all([
      api.adsMarketingModule.chat.overview(me()).catch(() => null),
      api.adsMarketingModule.chat.rooms({}).catch(() => null),
      api.adsMarketingModule.chat.commands().catch(() => null),
      api.adsMarketingModule.chat.pinned().catch(() => null),
    ]);
    setDash(unwrap(o));
    setRooms(unwrap(r)?.rooms || []);
    setCommands(unwrap(c)?.commands || []);
    setPinned(unwrap(p)?.messages || []);
    setLoading(false);
  }, []);

  const loadRoom = useCallback(async (roomId: string) => {
    setActiveRoomId(roomId);
    setThreadMsg(null);
    setThread(null);
    setLoading(true);
    const [rgb, m] = await Promise.all([
      api.adsMarketingModule.chat.room(roomId).catch(() => null),
      api.adsMarketingModule.chat.messages(roomId, {}).catch(() => null),
    ]);
    setRoom(unwrap(rgb));
    setMessages(unwrap(m)?.messages || []);
    setLoading(false);
    api.adsMarketingModule.chat.markRoomRead(roomId, me()).catch(() => null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openThread = useCallback(async (m: any) => {
    setThreadMsg(m);
    setThread(null);
    const t = unwrap(await api.adsMarketingModule.chat.thread(m.messageId, {}).catch(() => null));
    setThread(t);
  }, []);

  async function send() {
    const text = body.trim();
    if (!text || !activeRoomId) return;
    setBusy("send");
    const input: Record<string, any> = { userId: me(), displayName: "User", senderType: "user", contentType: "text", body: text };
    let r: any = null;
    if (text.startsWith("/")) r = unwrap(await api.adsMarketingModule.chat.runCommand({ ...input, raw: text }).catch(() => null));
    else r = unwrap(await api.adsMarketingModule.chat.sendMessage(activeRoomId, input).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBody("");
    setBusy(null);
    loadRoom(activeRoomId);
  }

  async function sendThreadReply() {
    const text = threadReply.trim();
    if (!text || !threadMsg) return;
    const r = unwrap(await api.adsMarketingModule.chat.replyThread(threadMsg.messageId, { userId: me(), displayName: "User", senderType: "user", contentType: "text", body: text }).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setThreadReply("");
    openThread(threadMsg);
  }

  async function toggleReaction(messageId: string, emoji: string) {
    const existing = messages.concat(thread?.replies || []).find((m) => m.messageId === messageId);
    const mine = existing?.reactions?.find((r: any) => r.emoji === emoji)?.users?.includes(me());
    setBusy("react");
    if (mine) await api.adsMarketingModule.chat.unreact(messageId, emoji, me()).catch(() => null);
    else await api.adsMarketingModule.chat.react(messageId, emoji, me()).catch(() => null);
    setBusy(null);
    if (threadMsg && (threadMsg.messageId === messageId || thread?.replies?.some((r: any) => r.messageId === messageId))) openThread(threadMsg);
    else loadRoom(activeRoomId!);
  }

  async function togglePin(m: any) {
    const r = unwrap(await api.adsMarketingModule.chat.pin(m.messageId, !m.is_pinned).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    load();
    loadRoom(activeRoomId!);
  }

  async function toggleDecision(m: any) {
    const r = unwrap(await api.adsMarketingModule.chat.markDecision(m.messageId, { summary: m.content?.body, decided_by: me() }).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    loadRoom(activeRoomId!);
  }

  async function summarizeThread() {
    if (!threadMsg) return;
    const r = unwrap(await api.adsMarketingModule.chat.threadSummary(threadMsg.messageId).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setThread((t: any) => (t ? { ...t, thread_info: { ...(t.thread_info || {}), summary: r?.summary } } : t));
  }

  async function createRoom() {
    if (!newName.trim()) return;
    const r = unwrap(await api.adsMarketingModule.chat.createRoom({ name: newName.trim(), type: newType }).catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setShowCreate(false);
    setNewName("");
    load();
    if (r?.room?.roomId) loadRoom(r.room.roomId);
  }

  const suggestions = messages.flatMap((m) => (m.ai_analysis?.suggested_reply ? [{ text: m.ai_analysis.suggested_reply, msg: m }] : []));
  const lastSuggestion = suggestions[suggestions.length - 1];
  const totalPinned = pinned.filter((p: any) => !activeRoomId || p.roomId === activeRoomId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><MessagesSquare className="w-6 h-6 text-n0va-400" /> N0VA CHAT</h1>
          <p className="text-gray-500 mt-1 text-sm">Channels, threads & DMs with N0VA ANI in every conversation</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary p-2" onClick={() => { load(); if (activeRoomId) loadRoom(activeRoomId); }} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary text-sm" onClick={() => setShowCreate((v) => !v)}><Plus className="w-4 h-4 inline mr-1" />New channel</button>
        </div>
      </div>

      {showCreate && (
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <input className="input flex-1" placeholder="Channel name (e.g. project-alpha)" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <select className="input" value={newType} onChange={(e) => setNewType(e.target.value)}>
              <option value="public_channel">Public channel</option>
              <option value="private_channel">Private channel</option>
              <option value="announcement">Announcement</option>
              <option value="dm">Direct message</option>
              <option value="group_dm">Group DM</option>
            </select>
            <button className="btn-primary" onClick={createRoom}>Create</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <div className="card !p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Channels & DMs</p>
              <span className="text-[10px] text-gray-500">{rooms.length}</span>
            </div>
            <div className="space-y-0.5 max-h-[55vh] overflow-y-auto">
              {loading && !activeRoomId && <div className="space-y-2"><SkeletonCard /><SkeletonCard /></div>}
              {rooms.map((x: any) => {
                const RoomIcon = ROOM_TYPE_ICON[x.type] || Hash;
                const unread = x.unread ?? ((dash?.rooms?.find((d: any) => d.roomId === x.roomId)?.unread) || 0);
                return (
                  <button
                    key={x.roomId}
                    onClick={() => loadRoom(x.roomId)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 transition-colors ${activeRoomId === x.roomId ? "bg-n0va-900/60 border border-n0va-700/40" : "hover:bg-gray-800/60"}`}
                  >
                    <RoomIcon className="w-4 h-4 text-gray-500 shrink-0" />
                    <span className="text-sm text-gray-200 truncate flex-1">{x.display_name || x.name || x.roomId}</span>
                    {unread > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-n0va-600 text-white shrink-0">{unread}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card !p-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Pin className="w-3 h-3" /> Pinned</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {totalPinned.length === 0 && <p className="text-xs text-gray-500">Nothing pinned yet.</p>}
              {totalPinned.map((p: any) => (
                <button key={p.messageId} onClick={() => loadRoom(p.roomId)} className="block w-full text-left text-xs text-gray-300 p-2 rounded-lg bg-gray-800/40 hover:bg-gray-800/70 truncate">
                  {p.content?.body}
                </button>
              ))}
            </div>
          </div>

          <div className="card !p-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Slash commands</p>
            <div className="space-y-1">
              {commands.slice(0, 6).map((c: any) => (
                <div key={c.command} className="flex items-center gap-2 text-xs">
                  <span className="text-n0va-300 font-mono shrink-0">{c.command}</span>
                  <span className="text-gray-500 truncate">{c.description}</span>
                </div>
              ))}
              <p className="text-[10px] text-gray-500 mt-1.5">Tip: start a message with / to run one.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {!activeRoomId ? (
            <div className="card min-h-[60vh] flex flex-col items-center justify-center text-center">
              <MessagesSquare className="w-10 h-10 text-gray-600" />
              <p className="text-sm text-gray-400 mt-3">Select a channel or DM to start talking</p>
              {lastSuggestion && (
                <div className="mt-4 max-w-md w-full">
                  <div className="rounded-xl bg-violet-900/30 border border-violet-700/40 p-3">
                    <p className="text-[10px] text-violet-300 uppercase tracking-wider mb-1 flex items-center gap-1"><Brain className="w-3 h-3" /> N0VA ANI suggests a reply</p>
                    <p className="text-sm text-gray-200">{lastSuggestion.text}</p>
                  </div>
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
          ) : (
            <div className="card flex flex-col min-h-[60vh] overflow-hidden">
              <div className="border-b border-gray-800 px-4 py-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                    <Hash className="w-4 h-4 text-gray-500" /> {room?.display_name || room?.name || activeRoomId}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {room?.type} · {room?.member_count ?? 0} members · {room?.description || room?.summary}
                  </p>
                </div>
                <button className="btn-secondary p-1.5 shrink-0" onClick={() => loadRoom(activeRoomId)} title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[48vh]">
                {messages.length === 0 && <p className="text-xs text-gray-500 text-center">No messages yet — say hi.</p>}
                {messages.map((m: any) => (
                  <div key={m.messageId} className="group">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-n0va-900/60 border border-n0va-700/40 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-n0va-300 uppercase">{(m.sender?.display_name || "?").slice(0, 2)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-200">{m.sender?.display_name || m.sender?.user_id}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide ${SENDER_STYLE[m.sender?.type] || "bg-gray-700/60 text-gray-300"}`}>{m.sender?.type || "user"}</span>
                          <span className="text-[10px] text-gray-500">{fmtTime(m.created_at)}{m.is_edited ? " · edited" : ""}</span>
                          {m.is_pinned && <Pin className="w-3 h-3 text-amber-400" />}
                          {m.is_decision && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/40">decision</span>}
                        </div>
                        <p className="text-sm text-gray-200 mt-1 whitespace-pre-wrap break-words">{m.content?.body}</p>
                        {m.ai_analysis?.sentiment !== undefined && (
                          <p className="text-[10px] text-gray-500 mt-1">
                            sentiment {m.ai_analysis.sentiment > 0.2 ? "positive" : m.ai_analysis.sentiment < -0.2 ? "negative" : "neutral"} · intent {m.ai_analysis.intent}
                            {m.ai_analysis.topics?.length ? ` · #${m.ai_analysis.topics.join(" #")}` : ""}
                          </p>
                        )}
                        {m.thread_info?.reply_count > 0 && (
                          <button onClick={() => openThread(m)} className="mt-1.5 text-[11px] text-n0va-300 hover:underline flex items-center gap-1">
                            <CornerDownRight className="w-3 h-3" /> {m.thread_info.reply_count} replies{m.thread_info.is_resolved ? " · resolved" : ""}
                          </button>
                        )}
                        {(m.reactions || []).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {m.reactions.map((r: any) => (
                              <button key={r.emoji} onClick={() => toggleReaction(m.messageId, r.emoji)} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-800/60 border border-gray-700 hover:border-n0va-500/50">
                                {r.emoji} {r.count}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0">
                        <button className="p-1.5 rounded hover:bg-gray-800" title="React ❤️" onClick={() => toggleReaction(m.messageId, "❤️")}><Smile className="w-3.5 h-3.5 text-gray-400" /></button>
                        <button className="p-1.5 rounded hover:bg-gray-800" title="Reply in thread" onClick={() => openThread(m)}><CornerDownRight className="w-3.5 h-3.5 text-gray-400" /></button>
                        <button className="p-1.5 rounded hover:bg-gray-800" title={m.is_pinned ? "Unpin" : "Pin"} onClick={() => togglePin(m)}><Pin className="w-3.5 h-3.5 text-gray-400" /></button>
                        <button className="p-1.5 rounded hover:bg-gray-800" title="Mark decision" onClick={() => toggleDecision(m)}><CheckCircle2 className="w-3.5 h-3.5 text-gray-400" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {lastSuggestion && (
                <div className="mx-4 mb-2">
                  <div className="rounded-xl bg-violet-900/30 border border-violet-700/40 p-2.5 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-violet-400 shrink-0" />
                    <p className="text-xs text-gray-200 truncate flex-1">ANI: {lastSuggestion.text}</p>
                    <button className="text-[11px] text-n0va-400 hover:underline shrink-0" onClick={() => setBody(lastSuggestion.text)}>Insert</button>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-800 p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    className="input flex-1 resize-none"
                    rows={2}
                    placeholder="Message... (try /help, /remind, /poll)"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  />
                  <button className="btn-primary" disabled={busy === "send" || !body.trim()} onClick={send}>
                    {busy === "send" ? "..." : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {threadMsg && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setThreadMsg(null)}>
          <div className="card w-full max-w-lg max-h-[75vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-bold text-white flex items-center gap-1.5"><CornerDownRight className="w-4 h-4 text-n0va-400" /> Thread</p>
              <div className="flex items-center gap-1">
                <button className="btn-secondary p-1.5" onClick={summarizeThread} title="ANI summary"><Sparkles className="w-3.5 h-3.5" /></button>
                <button className="btn-secondary p-1.5" onClick={() => openThread(threadMsg)} title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
                <button className="btn-secondary p-1.5" onClick={() => setThreadMsg(null)}><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="p-3 rounded-xl bg-gray-800/40">
                <p className="text-xs font-semibold text-gray-200">{threadMsg.sender?.display_name}</p>
                <p className="text-sm text-gray-300 mt-1">{threadMsg.content?.body}</p>
              </div>
              {thread?.thread_info?.summary && (
                <div className="rounded-xl bg-violet-900/30 border border-violet-700/40 p-3">
                  <p className="text-[10px] text-violet-300 uppercase tracking-wider mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> ANI summary</p>
                  <p className="text-xs text-gray-200">{thread.thread_info.summary}</p>
                </div>
              )}
              {(thread?.replies || []).map((r: any) => (
                <div key={r.messageId} className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-gray-400 uppercase">{(r.sender?.display_name || "?").slice(0, 2)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-gray-300">{r.sender?.display_name} <span className="text-gray-600 font-normal">{fmtTime(r.created_at)}</span></p>
                    <p className="text-xs text-gray-300 mt-0.5 whitespace-pre-wrap break-words">{r.content?.body}</p>
                    {(r.reactions || []).length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {r.reactions.map((rc: any) => (
                          <button key={rc.emoji} onClick={() => toggleReaction(r.messageId, rc.emoji)} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800/60 border border-gray-700">{rc.emoji} {rc.count}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-800 p-3 flex items-end gap-2">
              <input
                className="input flex-1"
                placeholder="Reply in thread..."
                value={threadReply}
                onChange={(e) => setThreadReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendThreadReply(); } }}
              />
              <button className="btn-primary" disabled={!threadReply.trim()} onClick={sendThreadReply}><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
