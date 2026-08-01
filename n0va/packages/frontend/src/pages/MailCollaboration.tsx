import { useEffect, useState, useCallback } from "react";
import {
  MessagesSquare, RefreshCw, Plus, X, Send, Trash2, Users, Smile, Eye, Pencil, FilePen,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const emptyDraft = { subject: "", body: "", collaborators: "", dueAt: "" };

export default function MailCollaboration() {
  const { addToast } = useToast();
  const [summary, setSummary] = useState<any>(null);
  const [presence, setPresence] = useState<any>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [reactions, setReactions] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [showDraft, setShowDraft] = useState(false);
  const [draftForm, setDraftForm] = useState(emptyDraft);
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const [s, p, d, m, mb] = await Promise.all([
      api.adsMarketingModule.mailCollaborationSummary().catch(() => null),
      api.adsMarketingModule.mailPresence().catch(() => null),
      api.adsMarketingModule.mailSharedDrafts({}).catch(() => null),
      api.adsMarketingModule.mailMessages({ folder: "inbox", limit: 10 }).catch(() => null),
      api.adsMarketingModule.mailMailboxes().catch(() => null),
    ]);
    setSummary(unwrap(s));
    setPresence(unwrap(p));
    const draftsR = unwrap(d);
    setDrafts(Array.isArray(draftsR) ? draftsR : draftsR?.drafts || []);
    const msgs = unwrap(m);
    setThreads(Array.isArray(msgs) ? msgs : msgs?.messages || msgs?.data || []);
    const mbs = unwrap(mb);
    setMailboxes(Array.isArray(mbs) ? mbs : mbs?.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  const loadThread = useCallback(async (msg: any) => {
    setSelectedMsg(msg);
    const [c, r] = await Promise.all([
      api.adsMarketingModule.mailCommentsForThread(msg.threadId).catch(() => null),
      api.adsMarketingModule.mailMessageReactions(msg._id).catch(() => null),
    ]);
    const cR = unwrap(c);
    setComments(Array.isArray(cR) ? cR : cR?.comments || []);
    setReactions(unwrap(r));
    setCommentText("");
  }, []);

  async function addComment() {
    if (!commentText.trim() || !selectedMsg) return;
    try {
      const r = unwrap(await api.adsMarketingModule.mailAddComment(selectedMsg._id, { text: commentText.trim(), author: "user_001" }));
      addToast("success", "Comment added", r?.summary || "");
      await loadThread(selectedMsg);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Comment failed", e?.message);
    }
  }

  async function toggleReaction(emoji: string) {
    if (!selectedMsg) return;
    try {
      const existing = reactions?.reactions?.find((r: any) => r.emoji === emoji && r.users.includes("user_001"));
      if (existing) {
        await api.adsMarketingModule.mailRemoveReaction(selectedMsg._id, emoji, "user_001");
        addToast("success", "Reaction removed", "");
      } else {
        const r = unwrap(await api.adsMarketingModule.mailAddReaction(selectedMsg._id, emoji, "user_001"));
        addToast("success", "Reacted", r?.summary || "");
      }
      await loadThread(selectedMsg);
    } catch (e: any) {
      addToast("error", "Reaction failed", e?.message);
    }
  }

  async function deleteComment(id: string) {
    try {
      await api.adsMarketingModule.mailDeleteComment(id);
      if (selectedMsg) await loadThread(selectedMsg);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Delete failed", e?.message);
    }
  }

  async function saveDraft() {
    if (!draftForm.subject.trim() || !draftForm.collaborators.trim()) {
      addToast("warning", "Missing fields", "Subject and at least one collaborator email are required.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailCreateSharedDraft(mailboxes[0]?.mailboxId || "", {
        subject: draftForm.subject.trim(),
        body: draftForm.body,
        collaborators: draftForm.collaborators.split(/[,\n]/).map(s => s.trim()).filter(Boolean).map(email => ({ email })),
        dueAt: draftForm.dueAt || undefined,
      }));
      addToast("success", "Shared draft created", r?.summary || "");
      setShowDraft(false);
      setDraftForm(emptyDraft);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function advanceDraft(d: any) {
    const next = d.status === "draft" ? "in_review" : d.status === "in_review" ? "approved" : null;
    if (!next) return;
    try {
      const r = unwrap(await api.adsMarketingModule.mailUpdateSharedDraft(d.draftId, { status: next }));
      addToast("success", "Draft updated", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Update failed", e?.message);
    }
  }

  async function deleteDraft(id: string) {
    try {
      await api.adsMarketingModule.mailDeleteSharedDraft(id);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Delete failed", e?.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><MessagesSquare className="w-6 h-6 text-n0va-400" /> Mail collaboration</h1>
          <p className="text-gray-500 mt-1 text-sm">{summary?.summary || "Comments, reactions, presence and shared drafts"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary flex items-center gap-2" onClick={() => { setDraftForm(emptyDraft); setShowDraft(true); }}>
            <Plus className="w-4 h-4" /> Shared draft
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{summary?.comments || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Comments</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{summary?.reactions || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Reactions</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{summary?.sharedDrafts || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Shared drafts</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{presence?.online || 0}/{presence?.members?.length || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Team online</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-4 space-y-3 lg:col-span-1">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Users className="w-4 h-4 text-n0va-400" /> Live presence</h3>
              {presence?.members?.map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${m.status === "online" ? "bg-emerald-400" : m.status === "busy" ? "bg-red-400" : "bg-amber-400"}`} />
                  <span className="text-white truncate">{m.name}</span>
                  <span className="text-[10px] text-gray-500 uppercase ml-auto shrink-0">{m.status}</span>
                  {m.viewingSubject && <span className="text-[10px] text-n0va-300 truncate max-w-[120px]"><Eye className="w-3 h-3 inline mr-0.5" />{m.viewingSubject}</span>}
                  {m.typing && <span className="text-[10px] text-emerald-400 animate-pulse shrink-0">typing…</span>}
                </div>
              ))}
              {!presence?.members?.length && <p className="text-xs text-gray-600">No team members yet — add contacts first.</p>}
            </div>

            <div className="card p-4 lg:col-span-2 space-y-3">
              <h3 className="text-sm font-semibold text-white">Thread discussions</h3>
              <select className="select" value={selectedMsg?._id || ""} onChange={(e) => {
                const msg = threads.find((t: any) => t._id === e.target.value);
                if (msg) loadThread(msg);
              }}>
                <option value="">Pick an inbox thread…</option>
                {threads.map((t: any) => <option key={t._id} value={t._id}>{t.subject}</option>)}
              </select>

              {selectedMsg && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 truncate">{selectedMsg.subject}</span>
                    <div className="flex items-center gap-1 ml-auto">
                      {["👍", "🔥", "🎉", "❤️"].map((e: string) => {
                        const active = reactions?.reactions?.some((r: any) => r.emoji === e && r.users.includes("user_001"));
                        return (
                          <button key={e} onClick={() => toggleReaction(e)} title={`React ${e}`}
                            className={`text-sm px-1.5 py-0.5 rounded border ${active ? "bg-n0va-500/20 border-n0va-500/50" : "bg-gray-800 border-gray-700"}`}>
                            {e}
                            {(() => { const g = reactions?.reactions?.find((r: any) => r.emoji === e); return g ? <span className="text-[10px] text-gray-400 ml-0.5">{g.count}</span> : null; })()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {comments.map((c: any) => (
                      <div key={c.commentId} className="bg-gray-800/50 border border-gray-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-n0va-300 font-semibold">{c.author}</span>
                          <span className="text-gray-600">{new Date(c.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          <button className="text-gray-600 hover:text-red-400 ml-auto" onClick={() => deleteComment(c.commentId)}><Trash2 className="w-3 h-3" /></button>
                        </div>
                        <p className="text-sm text-gray-300 mt-1">{c.text}</p>
                        {c.mentions?.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {c.mentions.map((mn: any, i: number) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-n0va-500/15 text-n0va-300">@{mn.email}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {comments.length === 0 && <p className="text-xs text-gray-600">No comments on this thread yet.</p>}
                  </div>

                  <div className="flex gap-2">
                    <input className="input flex-1" placeholder="Add a comment — mention @email to notify…" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addComment(); }} />
                    <button className="btn-primary" onClick={addComment}><Send className="w-4 h-4" /></button>
                  </div>
                </>
              )}
              {threads.length === 0 && <p className="text-xs text-gray-600">No inbox threads available.</p>}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><FilePen className="w-4 h-4 text-n0va-400" /> Shared drafts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {drafts.map((d: any) => (
                <div key={d.draftId} className="border border-gray-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${d.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : d.status === "in_review" ? "bg-amber-500/15 text-amber-400" : "bg-gray-500/10 text-gray-400"}`}>{d.status.replace("_", " ")}</span>
                    <span className="text-xs text-gray-500 ml-auto">{d.collaborators?.length || 0} collab(s)</span>
                  </div>
                  <p className="text-sm font-medium text-white truncate">{d.subject}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {d.collaborators?.map((c: any, i: number) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 truncate max-w-[140px]">{c.email}</span>
                    ))}
                  </div>
                  {d.dueAt && <p className="text-[10px] text-amber-400">Due {new Date(d.dueAt).toLocaleDateString()}</p>}
                  <div className="flex items-center gap-2 pt-1">
                    {d.status !== "approved" && (
                      <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => advanceDraft(d)}>
                        <Pencil className="w-3 h-3" /> {d.status === "draft" ? "Send for review" : "Approve"}
                      </button>
                    )}
                    <button className="text-gray-500 hover:text-red-400 p-1 ml-auto" onClick={() => deleteDraft(d.draftId)}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              {drafts.length === 0 && <p className="text-xs text-gray-600 col-span-full">No shared drafts — create one to collaborate on a message.</p>}
            </div>
          </div>
        </>
      )}

      {showDraft && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><Smile className="w-4 h-4 text-n0va-400" /> New shared draft</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowDraft(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Subject</label>
                <input className="input" placeholder="Q3 report draft" value={draftForm.subject} onChange={(e) => setDraftForm({ ...draftForm, subject: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Collaborators <span className="text-gray-600">(emails, comma separated)</span></label>
                <input className="input" placeholder="alice@partner.com, bob@partner.com" value={draftForm.collaborators} onChange={(e) => setDraftForm({ ...draftForm, collaborators: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Body</label>
                <textarea className="input min-h-[120px]" value={draftForm.body} onChange={(e) => setDraftForm({ ...draftForm, body: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Due date <span className="text-gray-600">(optional)</span></label>
                <input type="date" className="input" value={draftForm.dueAt} onChange={(e) => setDraftForm({ ...draftForm, dueAt: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setShowDraft(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={saveDraft}>Create draft</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
