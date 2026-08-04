import { DataStore } from "./DataStore";
import { mailRealtime } from "./MailRealtimeService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export class MailCollaborationService {
  private getMessage(tenantId: string, messageId: string): any {
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    return msg;
  }

  private getDraft(tenantId: string, draftId: string): any {
    const d = DataStore.mem().findOne("mail_shared_drafts", (x: any) => x._id === draftId && x.tenantId === tenantId);
    if (!d) throw new Error(`Shared draft "${draftId}" not found`);
    return d;
  }

  private resolveMentions(tenantId: string, text: string): any[] {
    const contacts = DataStore.mem().find("mail_contacts", (c: any) => c.tenantId === tenantId);
    const found: any[] = [];
    for (const c of contacts) {
      const tokens = [c.name, c.email];
      if (tokens.some((t: any) => t && text.toLowerCase().includes(String(t).toLowerCase()))) {
        found.push({ contactId: c._id, name: c.name, email: c.email });
      }
    }
    return found.slice(0, 3);
  }

  addComment(tenantId: string, messageId: string, input: any) {
    const msg = this.getMessage(tenantId, messageId);
    if (!input || !input.text || !String(input.text).trim()) throw new Error("Comment text is required");
    const comment = DataStore.mem().insert("mail_comments", {
      tenantId,
      messageId,
      threadId: msg.threadId || msg._id,
      subject: msg.subject,
      text: String(input.text),
      author: input.author || "user_001",
      mentions: this.resolveMentions(tenantId, String(input.text)),
    });
    mailRealtime.emit("mail.comment_added", tenantId, {
      messageId,
      threadId: comment.threadId,
      commentId: comment._id,
      author: comment.author,
      subject: msg.subject,
      text: String(input.text),
    });
    return { commentId: comment._id, ...comment, summary: `Comment added on "${msg.subject}"` };
  }

  commentsForMessage(tenantId: string, messageId: string) {
    this.getMessage(tenantId, messageId);
    const comments = DataStore.mem().find("mail_comments", (c: any) => c.tenantId === tenantId && c.messageId === messageId)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return { messageId, comments, count: comments.length, summary: `${comments.length} comment(s) on this message` };
  }

  commentsForThread(tenantId: string, threadId: string) {
    const comments = DataStore.mem().find("mail_comments", (c: any) => c.tenantId === tenantId && c.threadId === threadId)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return { threadId, comments, count: comments.length, summary: `${comments.length} comment(s) in this thread` };
  }

  deleteComment(tenantId: string, commentId: string) {
    const comment = DataStore.mem().findOne("mail_comments", (c: any) => c._id === commentId && c.tenantId === tenantId);
    if (!comment) throw new Error(`Comment "${commentId}" not found`);
    DataStore.mem().delete("mail_comments", (c: any) => c._id === commentId && c.tenantId === tenantId);
    return { commentId, summary: "Comment deleted" };
  }

  addReaction(tenantId: string, messageId: string, input: any) {
    const msg = this.getMessage(tenantId, messageId);
    if (!input || !input.emoji) throw new Error("Reaction emoji is required");
    const user = input.user || "user_001";
    const existing = DataStore.mem().findOne("mail_reactions", (r: any) =>
      r.tenantId === tenantId && r.messageId === messageId && r.emoji === input.emoji && r.user === user);
    if (existing) throw new Error(`Reaction "${input.emoji}" already added by ${user}`);
    const reaction = DataStore.mem().insert("mail_reactions", { tenantId, messageId, threadId: msg.threadId || msg._id, emoji: input.emoji, user });
    mailRealtime.emit("mail.reaction_added", tenantId, {
      messageId,
      threadId: reaction.threadId,
      reactionId: reaction._id,
      emoji: input.emoji,
      user,
      subject: msg.subject,
    });
    return { reactionId: reaction._id, messageId, emoji: input.emoji, user, summary: `Added ${input.emoji} on "${msg.subject}"` };
  }

  removeReaction(tenantId: string, messageId: string, input: any) {
    const msg = this.getMessage(tenantId, messageId);
    const user = (input && input.user) || "user_001";
    const emoji = input && input.emoji;
    const reaction = DataStore.mem().findOne("mail_reactions", (r: any) =>
      r.tenantId === tenantId && r.messageId === messageId && r.emoji === emoji && r.user === user);
    if (!reaction) throw new Error(`Reaction "${emoji}" by ${user} not found`);
    DataStore.mem().delete("mail_reactions", (r: any) => r._id === reaction._id);
    return { messageId, emoji, user, summary: `Removed ${emoji} from "${msg.subject}"` };
  }

  messageReactions(tenantId: string, messageId: string) {
    this.getMessage(tenantId, messageId);
    const reactions = DataStore.mem().find("mail_reactions", (r: any) => r.tenantId === tenantId && r.messageId === messageId);
    const grouped: any[] = [];
    for (const r of reactions) {
      const g = grouped.find((x: any) => x.emoji === r.emoji);
      if (g) { g.count++; g.users.push(r.user); } else { grouped.push({ emoji: r.emoji, count: 1, users: [r.user] }); }
    }
    grouped.sort((a: any, b: any) => b.count - a.count);
    return { messageId, reactions: grouped, total: reactions.length };
  }

  createSharedDraft(tenantId: string, mailboxId: string, input: any) {
    const mailbox = DataStore.mem().findOne("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId);
    if (!mailbox) throw new Error(`Mailbox "${mailboxId}" not found`);
    if (!input || !input.subject) throw new Error("Draft subject is required");
    const contacts = DataStore.mem().find("mail_contacts", (c: any) => c.tenantId === tenantId);
    const collaborators: any[] = [];
    for (const spec of input.collaborators || []) {
      const email = typeof spec === "string" ? spec : spec.email;
      if (!email) continue;
      const contact = contacts.find((c: any) => c.email === email);
      collaborators.push(contact
        ? { contactId: contact._id, name: contact.name, email: contact.email }
        : { contactId: null, name: email.split("@")[0], email });
    }
    if (collaborators.length === 0) throw new Error("At least one collaborator is required");
    const draft = DataStore.mem().insert("mail_shared_drafts", {
      tenantId,
      mailboxId,
      subject: input.subject,
      body: input.body || "",
      collaborators,
      status: "draft",
      dueAt: input.dueAt ? new Date(input.dueAt).toISOString() : null,
      createdBy: input.createdBy || "user_001",
    });
    return { draftId: draft._id, ...draft, summary: `Shared draft "${input.subject}" created with ${collaborators.length} collaborator(s)` };
  }

  sharedDrafts(tenantId: string, opts: any = {}) {
    let drafts = DataStore.mem().find("mail_shared_drafts", (d: any) => d.tenantId === tenantId);
    if (opts.status) drafts = drafts.filter((d: any) => d.status === opts.status);
    const sorted = drafts.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      drafts: sorted.map((d: any) => ({ draftId: d._id, ...d })),
      byStatus: ["draft", "in_review", "approved"].map(s => ({ status: s, count: sorted.filter((d: any) => d.status === s).length })),
      summary: `${sorted.length} shared draft(s)`,
    };
  }

  updateSharedDraft(tenantId: string, draftId: string, patch: any) {
    const draft = this.getDraft(tenantId, draftId);
    if (patch.status && !["draft", "in_review", "approved"].includes(patch.status)) throw new Error(`Invalid draft status "${patch.status}"`);
    const updated = DataStore.mem().update("mail_shared_drafts", (d: any) => d._id === draftId && d.tenantId === tenantId, {
      ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
      ...(patch.body !== undefined ? { body: patch.body } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.dueAt !== undefined ? { dueAt: patch.dueAt ? new Date(patch.dueAt).toISOString() : null } : {}),
      ...(patch.collaborators !== undefined ? { collaborators: patch.collaborators } : {}),
    });
    return { draftId: updated._id, subject: updated.subject, status: updated.status, collaborators: updated.collaborators, summary: `Shared draft "${updated.subject}" ${patch.status ? `moved to ${patch.status}` : "updated"}` };
  }

  deleteSharedDraft(tenantId: string, draftId: string) {
    const draft = this.getDraft(tenantId, draftId);
    DataStore.mem().delete("mail_shared_drafts", (d: any) => d._id === draftId && d.tenantId === tenantId);
    return { draftId, summary: `Shared draft "${draft.subject}" deleted` };
  }

  presence(tenantId: string) {
    const contacts = DataStore.mem().find("mail_contacts", (c: any) => c.tenantId === tenantId);
    const messages = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const members = contacts.slice(0, 6).map((c: any) => {
      const roll = hashStr(c.email + "presence");
      const statuses = ["online", "online", "online", "away", "busy"] as const;
      const status = statuses[roll % statuses.length];
      const theirThread = messages.find((m: any) => m.from && m.from.email === c.email && m.folder !== "trash" && m.folder !== "spam");
      const typing = roll % 4 === 0 && theirThread ? theirThread.subject : null;
      return {
        name: c.name,
        email: c.email,
        status,
        viewing: theirThread ? theirThread.threadId : null,
        viewingSubject: theirThread ? theirThread.subject : null,
        typing,
        lastSeen: new Date(Date.now() - (roll % 30) * 60000).toISOString(),
      };
    });
    return { members, online: members.filter((m: any) => m.status === "online").length, summary: `${members.filter((m: any) => m.status === "online").length} of ${members.length} team members online` };
  }

  collaborationState(tenantId: string, messageId: string) {
    const msg = this.getMessage(tenantId, messageId);
    const comments = DataStore.mem().find("mail_comments", (c: any) => c.tenantId === tenantId && c.messageId === messageId);
    const reactions = DataStore.mem().find("mail_reactions", (r: any) => r.tenantId === tenantId && r.messageId === messageId);
    const drafts = DataStore.mem().find("mail_shared_drafts", (d: any) => d.tenantId === tenantId && d.mailboxId === msg.mailboxId)
      .filter((d: any) => String(d.subject).toLowerCase().includes(String(msg.subject).toLowerCase()) || String(msg.subject).toLowerCase().includes(String(d.subject).toLowerCase()));
    return {
      messageId,
      comments: comments.length,
      reactions: reactions.length,
      relatedSharedDrafts: drafts.length,
      summary: `${comments.length} comment(s), ${reactions.length} reaction(s)`,
    };
  }

  collaborationSummary(tenantId: string) {
    const comments = DataStore.mem().find("mail_comments", (c: any) => c.tenantId === tenantId);
    const reactions = DataStore.mem().find("mail_reactions", (r: any) => r.tenantId === tenantId);
    const drafts = DataStore.mem().find("mail_shared_drafts", (d: any) => d.tenantId === tenantId);
    const activeThreads = new Set(comments.map((c: any) => c.threadId));
    const topThreads = [...activeThreads].map((t: string) => {
      const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.threadId === t);
      const c = comments.filter((x: any) => x.threadId === t);
      const r = reactions.filter((x: any) => x.threadId === t);
      const subject = msgs[0] ? msgs[0].subject : c[0] ? c[0].subject : t;
      return { threadId: t, subject, comments: c.length, reactions: r.length };
    }).sort((a: any, b: any) => b.comments + b.reactions - (a.comments + a.reactions)).slice(0, 5);
    return {
      comments: comments.length,
      reactions: reactions.length,
      sharedDrafts: drafts.length,
      activeThreads: activeThreads.size,
      draftStatuses: ["draft", "in_review", "approved"].map(s => ({ status: s, count: drafts.filter((d: any) => d.status === s).length })),
      topThreads,
      summary: `${comments.length} comment(s), ${reactions.length} reaction(s), ${activeThreads.size} active thread(s)`,
      seed: hashStr(tenantId + "collab_summary"),
    };
  }
}

export const mailCollab = new MailCollaborationService();
