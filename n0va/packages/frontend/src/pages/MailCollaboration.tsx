import { useEffect, useState, useCallback } from "react";
import {
  MessagesSquare, RefreshCw, Plus, X, Send, Trash2, Users, Smile, Eye, Pencil, FilePen,
  CheckCircle2, XCircle, ShieldCheck, UserCog, AtSign, DoorOpen, KeyRound, Radio, MousePointer2,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";
import { useMailRealtime } from "../hooks/useSocket";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const RT_LABELS: Record<string, string> = {
  "mail.received": "Received", "mail.sent": "Sent", "mail.read": "Read", "mail.thread_update": "Thread",
  "mail.label_change": "Label", "mail.folder_change": "Folder", "mail.spam_detected": "Spam", "mail.ai_suggestion": "AI",
  "mail.presence": "Presence", "mail.comment_added": "Comment", "mail.reaction_added": "Reaction", "mail.voice_note": "Voice",
  "mail.typing": "Typing", "mail.cursor_position": "Cursor",
};

const RT_COLORS: Record<string, string> = {
  "mail.received": "bg-blue-100 text-blue-700",
  "mail.sent": "bg-emerald-100 text-emerald-700",
  "mail.read": "bg-slate-100 text-slate-600",
  "mail.thread_update": "bg-violet-100 text-violet-700",
  "mail.label_change": "bg-amber-100 text-amber-700",
  "mail.folder_change": "bg-cyan-100 text-cyan-700",
  "mail.spam_detected": "bg-rose-100 text-rose-700",
  "mail.ai_suggestion": "bg-fuchsia-100 text-fuchsia-700",
  "mail.presence": "bg-teal-100 text-teal-700",
  "mail.comment_added": "bg-indigo-100 text-indigo-700",
  "mail.reaction_added": "bg-pink-100 text-pink-700",
  "mail.voice_note": "bg-orange-100 text-orange-700",
  "mail.typing": "bg-lime-100 text-lime-700",
  "mail.cursor_position": "bg-sky-100 text-sky-700",
};

const emptyDraft = { subject: "", body: "", collaborators: "", dueAt: "" };
const emptyApproval = { subject: "", approvers: "", requiredCount: "1", reason: "" };
const emptyDelegate = { mailboxId: "", granteeEmail: "", permission: "read", reason: "" };
const emptyRole = { member: "", role: "editor" };

export default function MailCollaboration() {
  const { addToast } = useToast();
  const { connected: rtConnected, events: rtEvents } = useMailRealtime(
    (() => { try { return JSON.parse(localStorage.getItem("n0va_user") || "{}").tenantId || "tenant_001"; } catch { return "tenant_001"; } })()
  );
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
  const [collab2, setCollab2] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [delegations, setDelegations] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [roleMatrix, setRoleMatrix] = useState<any[]>([]);
  const [mentions, setMentions] = useState<any[]>([]);
  const [mentionsSum, setMentionsSum] = useState<any>(null);
  const [showApproval, setShowApproval] = useState(false);
  const [approvalForm, setApprovalForm] = useState(emptyApproval);
  const [showDelegate, setShowDelegate] = useState(false);
  const [delegateForm, setDelegateForm] = useState(emptyDelegate);
  const [showRole, setShowRole] = useState(false);
  const [roleForm, setRoleForm] = useState(emptyRole);
  const [mentionText, setMentionText] = useState("");
  const [mentionSel, setMentionSel] = useState<any>(null);

  const loadAll = useCallback(async () => {
    const [s, p, d, m, mb, c2, ap, dl, rl, rm, mn, ms] = await Promise.all([
      api.adsMarketingModule.mailCollaborationSummary().catch(() => null),
      api.adsMarketingModule.mailPresence().catch(() => null),
      api.adsMarketingModule.mailSharedDrafts({}).catch(() => null),
      api.adsMarketingModule.mailMessages({ folder: "inbox", limit: 10 }).catch(() => null),
      api.adsMarketingModule.mailMailboxes().catch(() => null),
      api.adsMarketingModule.mailCollab2Dashboard().catch(() => null),
      api.adsMarketingModule.mailCollab2Approvals().catch(() => null),
      api.adsMarketingModule.mailCollab2Delegations({}).catch(() => null),
      api.adsMarketingModule.mailCollab2Roles().catch(() => null),
      api.adsMarketingModule.mailCollab2RoleMatrix().catch(() => null),
      api.adsMarketingModule.mailCollab2Mentions({ limit: 10 }).catch(() => null),
      api.adsMarketingModule.mailCollab2MentionsSummary().catch(() => null),
    ]);
    setSummary(unwrap(s));
    setPresence(unwrap(p));
    const draftsR = unwrap(d);
    setDrafts(Array.isArray(draftsR) ? draftsR : draftsR?.drafts || []);
    const msgs = unwrap(m);
    setThreads(Array.isArray(msgs) ? msgs : msgs?.messages || msgs?.data || []);
    const mbs = unwrap(mb);
    setMailboxes(Array.isArray(mbs) ? mbs : mbs?.data || []);
    setCollab2(unwrap(c2));
    const apR = unwrap(ap);
    setApprovals(Array.isArray(apR) ? apR : apR?.approvals || []);
    const dlR = unwrap(dl);
    setDelegations(Array.isArray(dlR) ? dlR : dlR?.delegations || []);
    const rlR = unwrap(rl);
    setRoles(Array.isArray(rlR) ? rlR : rlR?.roles || []);
    const rmR = unwrap(rm);
    setRoleMatrix(Array.isArray(rmR) ? rmR : rmR?.roles || []);
    const mnR = unwrap(mn);
    setMentions(Array.isArray(mnR) ? mnR : mnR?.mentions || []);
    setMentionsSum(unwrap(ms));
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

  async function broadcastPresence(status: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailRealtimePresence({ userId: "user_001", status }));
      addToast("success", "Presence updated", r?.summary || "");
    } catch (e: any) {
      addToast("error", "Presence failed", e?.message);
    }
  }

  async function broadcastTyping() {
    const t = threads[0];
    if (!t) { addToast("warning", "No thread", "Open an inbox message first."); return; }
    try {
      const r = unwrap(await api.adsMarketingModule.mailRealtimeTyping({ userId: "user_001", threadId: t.threadId, isTyping: true }));
      addToast("success", "Typing ping", r?.summary || "");
    } catch (e: any) {
      addToast("error", "Typing failed", e?.message);
    }
  }

  async function broadcastCursor() {
    const t = threads[0];
    if (!t) { addToast("warning", "No thread", "Open an inbox message first."); return; }
    try {
      const r = unwrap(await api.adsMarketingModule.mailRealtimeCursor({ userId: "user_001", threadId: t.threadId, position: 24 }));
      addToast("success", "Cursor ping", r?.summary || "");
    } catch (e: any) {
      addToast("error", "Cursor failed", e?.message);
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

  async function createApproval() {
    const approvers = approvalForm.approvers.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    if (!approvalForm.subject.trim() || approvers.length === 0) {
      addToast("warning", "Missing fields", "Subject and at least one approver are required.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailCollab2CreateApproval({
        subject: approvalForm.subject.trim(),
        approvers,
        requiredCount: Number(approvalForm.requiredCount) || 1,
        reason: approvalForm.reason || undefined,
      }));
      addToast("success", "Approval created", r?.summary || "");
      setShowApproval(false);
      setApprovalForm(emptyApproval);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function approvalAction(id: string, action: "approve" | "reject" | "withdraw") {
    try {
      let r: any;
      if (action === "approve") r = unwrap(await api.adsMarketingModule.mailCollab2Approve(id, { email: "user_001@n0va.io" }));
      else if (action === "reject") r = unwrap(await api.adsMarketingModule.mailCollab2Reject(id, { email: "user_001@n0va.io" }));
      else r = unwrap(await api.adsMarketingModule.mailCollab2Withdraw(id));
      addToast("success", "Approval updated", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Action failed", e?.message);
    }
  }

  async function createDelegate() {
    if (!delegateForm.mailboxId || !delegateForm.granteeEmail.trim()) {
      addToast("warning", "Missing fields", "Mailbox and grantee email are required.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailCollab2Delegate({
        mailboxId: delegateForm.mailboxId,
        granteeEmail: delegateForm.granteeEmail.trim(),
        permission: delegateForm.permission,
        reason: delegateForm.reason || undefined,
      }));
      addToast("success", "Delegation requested", r?.summary || "");
      setShowDelegate(false);
      setDelegateForm(emptyDelegate);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Delegate failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function delegationAction(id: string, action: "accept" | "revoke") {
    try {
      const r = unwrap(await api.adsMarketingModule[action === "accept" ? "mailCollab2AcceptDelegation" : "mailCollab2RevokeDelegation"](id));
      addToast("success", "Delegation updated", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Action failed", e?.message);
    }
  }

  async function assignRole() {
    if (!roleForm.member.trim()) {
      addToast("warning", "Missing member", "Member email is required.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailCollab2AssignRole({ member: roleForm.member.trim(), role: roleForm.role }));
      addToast("success", "Role assigned", r?.summary || "");
      setShowRole(false);
      setRoleForm(emptyRole);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Assign failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeRole(id: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailCollab2RemoveRole(id));
      addToast("success", "Role removed", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Remove failed", e?.message);
    }
  }

  async function sendMention() {
    if (!mentionText.trim()) return;
    try {
      const ctx = mentionSel || { contextType: "comment", contextId: "thread_manual" };
      const r = unwrap(await api.adsMarketingModule.mailCollab2CreateMention({ text: mentionText.trim(), contextType: ctx.contextType, contextId: ctx.contextId, author: "user_001" }));
      addToast("success", "Mention sent", r?.summary || "");
      setMentionText("");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Mention failed", e?.message);
    }
  }

  async function markMentionRead(id: string) {
    try {
      await api.adsMarketingModule.mailCollab2MarkMentionRead(id);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Mark failed", e?.message);
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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{collab2?.approvals?.pending || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Approvals pending</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{collab2?.delegation?.active || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Active delegations</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{collab2?.team?.members || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Team members</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{collab2?.mentions?.unread || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Unread mentions</p>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Radio className="w-4 h-4 text-n0va-400" /> Live collaboration <span className={`text-[10px] px-1.5 py-0.5 rounded ${rtConnected ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/10 text-gray-500"}`}>{rtConnected ? "connected" : "offline"}</span></h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["online", "away", "busy", "offline"] as const).map((s) => (
                  <button key={s} className="btn-secondary text-[11px] px-2 py-1" onClick={() => broadcastPresence(s)}>Set {s}</button>
                ))}
                <button className="btn-secondary text-[11px] px-2 py-1 flex items-center gap-1" onClick={broadcastTyping}><Send className="w-3 h-3" /> Typing</button>
                <button className="btn-secondary text-[11px] px-2 py-1 flex items-center gap-1" onClick={broadcastCursor}><MousePointer2 className="w-3 h-3" /> Cursor</button>
              </div>
            </div>
            <p className="text-[11px] text-gray-500">Bidirectional §3.8 events — presence, typing and cursor pings broadcast to the whole tenant room.</p>
            <div className="flex flex-wrap gap-1.5">
              {rtEvents.slice(0, 6).map((e: any, i: number) => (
                <span key={i} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${RT_COLORS[e.event] || "bg-gray-100 text-gray-600"}`}>
                  {RT_LABELS[e.event] || e.event}
                  <span className="font-normal opacity-70">{e.payload?.userId ? e.payload.userId : e.payload?.author ? e.payload.author : e.event.split(".")[1]}</span>
                </span>
              ))}
              {rtEvents.length === 0 && <span className="text-xs text-gray-600">No live events yet — add a comment, react, or ping a status above.</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-n0va-400" /> Approval workflows</h3>
                <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => { setApprovalForm(emptyApproval); setShowApproval(true); }}>
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>
              <div className="flex items-center gap-2 text-[11px] flex-wrap">
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">{collab2?.approvals?.pending || 0} pending</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{collab2?.approvals?.approved || 0} approved</span>
                <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400">{collab2?.approvals?.rejected || 0} rejected</span>
                <span className="text-gray-500 ml-auto">{collab2?.approvals?.approvalRate || 0}% approval rate</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {approvals.map((a: any) => (
                  <div key={a.approvalId} className="border border-gray-800 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${a.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : a.status === "rejected" ? "bg-red-500/15 text-red-400" : a.status === "withdrawn" ? "bg-gray-500/10 text-gray-400" : "bg-amber-500/15 text-amber-400"}`}>{a.status}</span>
                      <span className="text-sm font-medium text-white truncate">{a.subject}</span>
                    </div>
                    <p className="text-[11px] text-gray-500">{a.approvers?.filter((x: any) => x.status === "approved").length}/{a.requiredCount} required — {a.approvers?.map((x: any) => x.email).join(", ")}</p>
                    {a.reason && <p className="text-[11px] text-gray-600">“{a.reason}”</p>}
                    {a.status === "pending" && (
                      <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                        <button className="btn-secondary text-[11px] flex items-center gap-1" onClick={() => approvalAction(a.approvalId, "approve")}><CheckCircle2 className="w-3 h-3" /> Approve</button>
                        <button className="btn-secondary text-[11px] flex items-center gap-1" onClick={() => approvalAction(a.approvalId, "reject")}><XCircle className="w-3 h-3" /> Reject</button>
                        <button className="text-gray-600 hover:text-white text-[11px] ml-auto" onClick={() => approvalAction(a.approvalId, "withdraw")}>Withdraw</button>
                      </div>
                    )}
                  </div>
                ))}
                {approvals.length === 0 && <p className="text-xs text-gray-600">No approval requests yet.</p>}
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><DoorOpen className="w-4 h-4 text-n0va-400" /> Inbox delegation</h3>
                <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => { setDelegateForm({ ...emptyDelegate, mailboxId: mailboxes[0]?.mailboxId || "" }); setShowDelegate(true); }}>
                  <Plus className="w-3 h-3" /> Delegate
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {delegations.map((d: any) => (
                  <div key={d.delegationId} className="border border-gray-800 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${d.status === "accepted" || d.status === "active" ? "bg-emerald-500/15 text-emerald-400" : d.status === "revoked" ? "bg-gray-500/10 text-gray-400" : "bg-amber-500/15 text-amber-400"}`}>{d.status}</span>
                      <span className="text-white truncate">{d.grantee}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-n0va-500/15 text-n0va-300 ml-auto shrink-0">{d.permission}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{d.mailboxName}</p>
                    {(d.status === "pending" || d.status === "accepted" || d.status === "active") && (
                      <div className="flex gap-1.5 pt-0.5">
                        {d.status === "pending" && (
                          <button className="btn-secondary text-[11px]" onClick={() => delegationAction(d.delegationId, "accept")}>Accept</button>
                        )}
                        <button className="text-gray-600 hover:text-red-400 text-[11px] ml-auto" onClick={() => delegationAction(d.delegationId, "revoke")}>Revoke</button>
                      </div>
                    )}
                  </div>
                ))}
                {delegations.length === 0 && <p className="text-xs text-gray-600">No delegations — grant inbox access to teammates.</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><UserCog className="w-4 h-4 text-n0va-400" /> Team roles</h3>
                <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => { setRoleForm(emptyRole); setShowRole(true); }}>
                  <Plus className="w-3 h-3" /> Assign
                </button>
              </div>
              <div className="space-y-2">
                {roles.map((r: any) => (
                  <div key={r.roleId} className="flex items-center gap-2 text-sm border border-gray-800 rounded-lg px-3 py-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-n0va-500/15 text-n0va-300 uppercase">{r.role}</span>
                    <span className="text-white truncate">{r.member}</span>
                    <button className="text-gray-600 hover:text-red-400 ml-auto p-1" onClick={() => removeRole(r.roleId)}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {roles.length === 0 && <p className="text-xs text-gray-600">No roles assigned yet.</p>}
              </div>
              <div className="pt-1">
                <p className="text-[11px] text-gray-500 mb-1.5">Permission matrix</p>
                <div className="flex flex-wrap gap-1">
                  {roleMatrix.map((m: any) => (
                    <span key={m.role} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{m.role} · {m.permissions?.length} perms</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="card p-4 lg:col-span-2 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><AtSign className="w-4 h-4 text-n0va-400" /> Mentions {mentionsSum?.unread > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-n0va-500/20 text-n0va-300">{mentionsSum?.unread} unread</span>}</h3>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="Mention someone — @email or @contact name…" value={mentionText} onChange={(e) => setMentionText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendMention(); }} />
                <button className="btn-primary" onClick={sendMention}><Send className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {mentions.map((x: any) => (
                  <div key={x.mentionId} className={`flex items-center gap-2 text-sm border rounded-lg px-3 py-2 ${x.read ? "border-gray-800 opacity-60" : "border-n0va-500/40 bg-n0va-500/5"}`}>
                    <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-400" />
                    <span className="text-white truncate">{x.targetName}</span>
                    <span className="text-[10px] text-gray-500 uppercase">{x.contextType}</span>
                    <span className="text-[10px] text-gray-600 truncate ml-auto max-w-[140px]">{x.text?.slice(0, 40)}</span>
                    {!x.read && (
                      <button className="text-[11px] text-n0va-300 shrink-0" onClick={() => markMentionRead(x.mentionId)}>Mark read</button>
                    )}
                  </div>
                ))}
                {mentions.length === 0 && <p className="text-xs text-gray-600">No mentions yet — ping a teammate from a comment.</p>}
              </div>
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
      {showApproval && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-n0va-400" /> New approval request</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowApproval(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Subject</label>
                <input className="input" placeholder="Approve Q3 newsletter send" value={approvalForm.subject} onChange={(e) => setApprovalForm({ ...approvalForm, subject: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Approvers <span className="text-gray-600">(emails, comma separated)</span></label>
                <input className="input" placeholder="bob@partner.com, alice@partner.com" value={approvalForm.approvers} onChange={(e) => setApprovalForm({ ...approvalForm, approvers: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Required approvals</label>
                  <input type="number" min={1} className="input" value={approvalForm.requiredCount} onChange={(e) => setApprovalForm({ ...approvalForm, requiredCount: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Reason <span className="text-gray-600">(optional)</span></label>
                  <input className="input" placeholder="Campaign send gate" value={approvalForm.reason} onChange={(e) => setApprovalForm({ ...approvalForm, reason: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setShowApproval(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={createApproval}>Create request</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDelegate && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><KeyRound className="w-4 h-4 text-n0va-400" /> Delegate inbox access</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowDelegate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Mailbox</label>
                <select className="select" value={delegateForm.mailboxId} onChange={(e) => setDelegateForm({ ...delegateForm, mailboxId: e.target.value })}>
                  <option value="">Pick a mailbox…</option>
                  {mailboxes.map((m: any) => <option key={m.mailboxId || m._id} value={m.mailboxId || m._id}>{m.name || m.email}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Grantee email</label>
                <input className="input" placeholder="assistant@partner.com" value={delegateForm.granteeEmail} onChange={(e) => setDelegateForm({ ...delegateForm, granteeEmail: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Permission</label>
                  <select className="select" value={delegateForm.permission} onChange={(e) => setDelegateForm({ ...delegateForm, permission: e.target.value })}>
                    <option value="read">read</option>
                    <option value="respond">respond</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Reason <span className="text-gray-600">(optional)</span></label>
                  <input className="input" placeholder="Coverage" value={delegateForm.reason} onChange={(e) => setDelegateForm({ ...delegateForm, reason: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setShowDelegate(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={createDelegate}>Request delegation</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRole && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><UserCog className="w-4 h-4 text-n0va-400" /> Assign team role</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowRole(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Member email</label>
                <input className="input" placeholder="john@partner.com" value={roleForm.member} onChange={(e) => setRoleForm({ ...roleForm, member: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Role</label>
                <select className="select" value={roleForm.role} onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })}>
                  <option value="owner">owner</option>
                  <option value="admin">admin</option>
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setShowRole(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={assignRole}>Assign role</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
