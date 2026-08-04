import { DataStore } from "./DataStore";
import { estimateMessageBytes } from "./MailboxService";
import { mailAI } from "./MailAIService";
import { mailRules } from "./MailRulesService";
import { mailRealtime } from "./MailRealtimeService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const SYSTEM_FOLDERS = ["inbox", "sent", "drafts", "archive", "trash", "spam"];

function normalizeRecipients(rcpt: any): { name: string; email: string }[] {
  const out: { name: string; email: string }[] = [];
  const push = (r: any) => {
    if (!r) return;
    if (typeof r === "string") out.push({ name: "", email: r });
    else if (r.email) out.push({ name: r.name || "", email: r.email });
  };
  if (Array.isArray(rcpt)) rcpt.forEach(push);
  else push(rcpt);
  return out;
}

export class MailMessageService {
  private getMailbox(tenantId: string, mailboxId: string): any {
    const mb = DataStore.mem().findOne("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId);
    if (!mb) throw new Error(`Mailbox "${mailboxId}" not found`);
    return mb;
  }

  private touchUsage(tenantId: string, mailboxId: string) {
    const msgs = DataStore.mem().find("messages", (msg: any) => msg.tenantId === tenantId && msg.mailboxId === mailboxId);
    const used = msgs.reduce((s, msg) => s + estimateMessageBytes(msg), 0);
    DataStore.mem().update("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId, { usedBytes: used });
  }

  composeSend(tenantId: string, mailboxId: string, input: any) {
    const mb = this.getMailbox(tenantId, mailboxId);
    if (!input || !input.to) throw new Error("Recipient (to) is required");
    if (!input.subject) throw new Error("Subject is required");
    const to = normalizeRecipients(input.to);
    if (to.length === 0) throw new Error("At least one valid recipient is required");
    const body = input.body || "";
    const threadId = `thr_${hashStr(mailboxId + input.subject)}`;
    const msgId = `msg_${hashStr(tenantId + mailboxId + input.subject + body.slice(0, 40))}`;
    const now = new Date().toISOString();
    const msg = DataStore.mem().insert("messages", {
      tenantId,
      mailboxId,
      threadId,
      messageId: `<${msgId}@n0va.mail>`,
      from: { name: mb.displayName, email: mb.email },
      to,
      cc: normalizeRecipients(input.cc),
      bcc: normalizeRecipients(input.bcc),
      subject: input.subject,
      body,
      preview: body.slice(0, 120),
      folder: "sent",
      labels: ["Sent"],
      read: true,
      starred: false,
      attachments: input.attachments || [],
      receivedAt: now,
      sentAt: now,
      importance: input.importance || "normal",
      flags: [],
    });
    this.touchUsage(tenantId, mailboxId);
    mailRealtime.emit("mail.sent", tenantId, {
      messageId: msg._id,
      threadId,
      from: { name: mb.displayName, email: mb.email },
      to,
      subject: msg.subject,
      preview: msg.preview,
      mailboxId,
    });
    return { message: msg, summary: `Sent to ${to.length} recipient${to.length > 1 ? "s" : ""} — "${input.subject}"` };
  }

  saveDraft(tenantId: string, mailboxId: string, input: any) {
    this.getMailbox(tenantId, mailboxId);
    if (!input || !input.subject) throw new Error("Subject is required for a draft");
    const body = input.body || "";
    const now = new Date().toISOString();
    const msg = DataStore.mem().insert("messages", {
      tenantId,
      mailboxId,
      threadId: `thr_${hashStr(mailboxId + input.subject)}`,
      messageId: `<draft_${hashStr(tenantId + input.subject + body.slice(0, 20))}@n0va.mail>`,
      from: { name: this.getMailbox(tenantId, mailboxId).displayName, email: this.getMailbox(tenantId, mailboxId).email },
      to: normalizeRecipients(input.to),
      cc: normalizeRecipients(input.cc),
      subject: input.subject,
      body,
      preview: body.slice(0, 120),
      folder: "drafts",
      labels: ["Drafts"],
      read: true,
      starred: false,
      attachments: input.attachments || [],
      receivedAt: now,
      sentAt: undefined,
      importance: input.importance || "normal",
      flags: [],
    });
    this.touchUsage(tenantId, mailboxId);
    return { message: msg, summary: `Draft saved — "${input.subject}"` };
  }

  sendDraft(tenantId: string, messageId: string) {
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Draft "${messageId}" not found`);
    if (msg.folder !== "drafts") throw new Error("Only drafts can be sent");
    const now = new Date().toISOString();
    const updated = DataStore.mem().update("messages", (m: any) => m._id === messageId && m.tenantId === tenantId, {
      folder: "sent", labels: ["Sent"], read: true, sentAt: now, receivedAt: now,
    });
    this.touchUsage(tenantId, msg.mailboxId);
    mailRealtime.emit("mail.sent", tenantId, { messageId, threadId: msg.threadId, subject: msg.subject, preview: msg.preview, mailboxId: msg.mailboxId });
    return { message: updated, summary: `Draft sent — "${msg.subject}"` };
  }

  receiveMessage(tenantId: string, mailboxId: string, input: any) {
    const mb = this.getMailbox(tenantId, mailboxId);
    if (!input || !input.from) throw new Error("Sender (from) is required");
    if (!input.subject) throw new Error("Subject is required");
    const from = typeof input.from === "string" ? { name: "", email: input.from } : input.from;
    const body = input.body || "";
    const threadId = `thr_${hashStr(mailboxId + input.subject)}`;
    const msgId = `msg_${hashStr(tenantId + mailboxId + "in" + input.subject + body.slice(0, 40))}`;
    const now = new Date().toISOString();
    const msg = DataStore.mem().insert("messages", {
      tenantId,
      mailboxId,
      threadId,
      messageId: `<${msgId}@n0va.mail>`,
      from,
      to: [{ name: mb.displayName, email: mb.email }],
      cc: [],
      bcc: [],
      subject: input.subject,
      body,
      preview: body.slice(0, 120),
      folder: "inbox",
      labels: ["Inbox"],
      read: false,
      starred: false,
      attachments: input.attachments || [],
      receivedAt: now,
      sentAt: undefined,
      importance: input.importance || "normal",
      flags: [],
    });
    this.touchUsage(tenantId, mailboxId);
    if (mb.settings && mb.settings.autoEnrich !== false) mailAI.enrichMessage(tenantId, msg._id);
    mailRules.evaluateAllRules(tenantId, msg._id);
    mailRules.runAllScriptRules(tenantId, msg._id);
    const final = DataStore.mem().findOne("messages", (m: any) => m._id === msg._id);
    mailRealtime.emit("mail.received", tenantId, {
      messageId: msg._id,
      threadId,
      from,
      subject: msg.subject,
      preview: msg.preview,
      hasAttachments: (msg.attachments || []).length > 0,
      aiPriority: final && final.ai ? final.ai.priority : undefined,
      folder: final ? final.folder : "inbox",
      mailboxId,
    });
    return { message: final, summary: `Received "${input.subject}" from ${from.name || from.email}` };
  }

  listMessages(tenantId: string, opts: any = {}) {
    let msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    if (opts.mailboxId) msgs = msgs.filter(m => m.mailboxId === opts.mailboxId);
    if (opts.folder) msgs = msgs.filter(m => m.folder === opts.folder);
    if (opts.label) msgs = msgs.filter(m => (m.labels || []).includes(opts.label));
    if (opts.unread) msgs = msgs.filter(m => !m.read);
    if (opts.starred) msgs = msgs.filter(m => m.starred);
    msgs = msgs.sort((a: any, b: any) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    const total = msgs.length;
    const unread = msgs.filter(m => !m.read).length;
    const limit = opts.limit ? parseInt(String(opts.limit), 10) : 100;
    return { messages: msgs.slice(0, limit), total, unread };
  }

  getMessage(tenantId: string, messageId: string) {
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    return msg;
  }

  getThread(tenantId: string, threadId: string) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.threadId === threadId)
      .sort((a: any, b: any) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
    if (msgs.length === 0) throw new Error(`Thread "${threadId}" not found`);
    const participants = [...new Set(msgs.map(m => `${(m.from || {}).name || (m.from || {}).email}`))];
    return { threadId, subject: msgs[0].subject, messages: msgs, messageCount: msgs.length, participants };
  }

  markRead(tenantId: string, messageId: string, read = true) {
    const msg = this.getMessage(tenantId, messageId);
    const updated = DataStore.mem().update("messages", (m: any) => m._id === messageId && m.tenantId === tenantId, { read: !!read });
    mailRealtime.emit("mail.read", tenantId, { messageId, threadId: msg.threadId, read: !!read, timestamp: new Date().toISOString() });
    return { messageId, read: !!read, summary: `Marked ${!!read ? "read" : "unread"} — "${msg.subject}"` };
  }

  toggleStar(tenantId: string, messageId: string) {
    const msg = this.getMessage(tenantId, messageId);
    const updated = DataStore.mem().update("messages", (m: any) => m._id === messageId && m.tenantId === tenantId, { starred: !msg.starred });
    return { messageId, starred: updated.starred, summary: updated.starred ? "Starred" : "Unstarred" };
  }

  moveToFolder(tenantId: string, messageId: string, folder: string) {
    const msg = this.getMessage(tenantId, messageId);
    const valid = SYSTEM_FOLDERS.includes(folder) || !!DataStore.mem().findOne("mail_folders", (f: any) => f.tenantId === tenantId && f.name === folder);
    if (!valid) throw new Error(`Unknown folder "${folder}"`);
    const updated = DataStore.mem().update("messages", (m: any) => m._id === messageId && m.tenantId === tenantId, { folder });
    mailRealtime.emit("mail.folder_change", tenantId, { folder: updated.folder, messageIds: [messageId], threadId: msg.threadId, action: "moved" });
    return { messageId, folder: updated.folder, summary: `Moved to ${folder}` };
  }

  archiveMessage(tenantId: string, messageId: string) {
    return this.moveToFolder(tenantId, messageId, "archive");
  }

  trashMessage(tenantId: string, messageId: string) {
    return this.moveToFolder(tenantId, messageId, "trash");
  }

  restoreMessage(tenantId: string, messageId: string) {
    const msg = this.getMessage(tenantId, messageId);
    const target = msg.labels && msg.labels.includes("Sent") ? "sent" : "inbox";
    return this.moveToFolder(tenantId, messageId, target);
  }

  deleteMessage(tenantId: string, messageId: string) {
    const msg = this.getMessage(tenantId, messageId);
    DataStore.mem().delete("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    this.touchUsage(tenantId, msg.mailboxId);
    return { messageId, summary: `Deleted — "${msg.subject}" (permanent)` };
  }

  applyLabel(tenantId: string, messageId: string, label: string) {
    const msg = this.getMessage(tenantId, messageId);
    if (!label) throw new Error("Label is required");
    const labels = (msg.labels || []).includes(label) ? msg.labels : [...(msg.labels || []), label];
    const updated = DataStore.mem().update("messages", (m: any) => m._id === messageId && m.tenantId === tenantId, { labels });
    mailRealtime.emit("mail.label_change", tenantId, { label, messageIds: [messageId], threadId: msg.threadId, action: "applied" });
    return { messageId, labels: updated.labels, summary: `Label "${label}" applied` };
  }

  removeLabel(tenantId: string, messageId: string, label: string) {
    const msg = this.getMessage(tenantId, messageId);
    const labels = (msg.labels || []).filter(l => l !== label);
    const updated = DataStore.mem().update("messages", (m: any) => m._id === messageId && m.tenantId === tenantId, { labels });
    mailRealtime.emit("mail.label_change", tenantId, { label, messageIds: [messageId], threadId: msg.threadId, action: "removed" });
    return { messageId, labels: updated.labels, summary: `Label "${label}" removed` };
  }

  listFolders(tenantId: string, mailboxId?: string) {
    const folders: { name: string; system: boolean; total: number; unread: number }[] = SYSTEM_FOLDERS.map(name => ({ name, system: true, total: 0, unread: 0 }));
    const custom = DataStore.mem().find("mail_folders", (f: any) => f.tenantId === tenantId)
      .map(f => ({ name: f.name, system: false, total: 0, unread: 0 }));
    const all = [...folders, ...custom];
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && (!mailboxId || m.mailboxId === mailboxId));
    for (const f of all) {
      const inFolder = msgs.filter(m => m.folder === f.name);
      f.total = inFolder.length;
      f.unread = inFolder.filter(m => !m.read).length;
    }
    return all;
  }

  createFolder(tenantId: string, input: any) {
    if (!input || !input.name) throw new Error("Folder name is required");
    if (SYSTEM_FOLDERS.includes(input.name)) throw new Error(`"${input.name}" is a system folder`);
    if (DataStore.mem().findOne("mail_folders", (f: any) => f.tenantId === tenantId && f.name === input.name)) {
      throw new Error(`Folder "${input.name}" already exists`);
    }
    const folder = DataStore.mem().insert("mail_folders", { tenantId, name: input.name, system: false });
    return { folderId: folder._id, name: folder.name, summary: `Folder "${input.name}" created` };
  }

  deleteFolder(tenantId: string, folderId: string) {
    const folder = DataStore.mem().findOne("mail_folders", (f: any) => f._id === folderId && f.tenantId === tenantId);
    if (!folder) throw new Error(`Folder "${folderId}" not found`);
    if (folder.system) throw new Error("System folders cannot be deleted");
    DataStore.mem().delete("mail_folders", (f: any) => f._id === folderId && f.tenantId === tenantId);
    return { folderId, summary: `Folder "${folder.name}" deleted` };
  }

  unreadSummary(tenantId: string) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const folders = this.listFolders(tenantId);
    const totalUnread = msgs.filter(m => !m.read && m.folder === "inbox").length;
    return {
      folders,
      totals: {
        totalMessages: msgs.length,
        totalUnread,
        drafts: msgs.filter(m => m.folder === "drafts").length,
        sent: msgs.filter(m => m.folder === "sent").length,
        starred: msgs.filter(m => m.starred).length,
        trash: msgs.filter(m => m.folder === "trash").length,
        archive: msgs.filter(m => m.folder === "archive").length,
      },
      summary: `${totalUnread} unread across ${folders.length} folders`,
    };
  }

  batchOps(tenantId: string, operation: string, messageIds: string[], opts: any = {}) {
    if (!operation) throw new Error("Batch operation is required");
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) throw new Error("messageIds must be a non-empty array");
    const ops = ["move", "archive", "trash", "restore", "delete", "star", "unstar", "mark_read", "mark_unread", "apply_label", "remove_label"];
    if (!ops.includes(operation)) throw new Error(`Unknown batch operation "${operation}" — use one of: ${ops.join(", ")}`);
    const all = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const subjects: string[] = [];
    let processed = 0;
    const found: any[] = [];
    for (const id of messageIds) {
      const msg = all.find((m: any) => m._id === id);
      if (msg) { found.push(msg); subjects.push(msg.subject); }
    }
    const skipped = messageIds.length - found.length;
    for (const msg of found) {
      switch (operation) {
        case "move": this.moveToFolder(tenantId, msg._id, opts.destination); break;
        case "archive": this.archiveMessage(tenantId, msg._id); break;
        case "trash": this.trashMessage(tenantId, msg._id); break;
        case "restore": this.restoreMessage(tenantId, msg._id); break;
        case "delete": this.deleteMessage(tenantId, msg._id); break;
        case "star": DataStore.mem().update("messages", (m: any) => m._id === msg._id, { starred: true }); break;
        case "unstar": DataStore.mem().update("messages", (m: any) => m._id === msg._id, { starred: false }); break;
        case "mark_read": DataStore.mem().update("messages", (m: any) => m._id === msg._id, { read: true }); break;
        case "mark_unread": DataStore.mem().update("messages", (m: any) => m._id === msg._id, { read: false }); break;
        case "apply_label":
          if (!opts.label) throw new Error("apply_label needs a label");
          this.applyLabel(tenantId, msg._id, opts.label); break;
        case "remove_label":
          if (!opts.label) throw new Error("remove_label needs a label");
          this.removeLabel(tenantId, msg._id, opts.label); break;
      }
      processed++;
    }
    const detail = operation === "move" ? ` to "${opts.destination}"` : operation.includes("label") ? ` "${opts.label}"` : "";
    return {
      operation,
      processed,
      skipped,
      affected: subjects,
      summary: `${processed} message(s) ${operation.replace(/_/g, " ")}${detail}${skipped > 0 ? ` — ${skipped} skipped (not found)` : ""}`,
    };
  }
}

export const mailMessage = new MailMessageService();
