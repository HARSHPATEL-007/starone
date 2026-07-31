import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const MAILBOX_TYPES = ["personal", "work", "team", "shared", "alias", "neural", "archive", "auto"];

export const PLAN_QUOTAS: Record<string, number> = {
  free: 5 * 1024 * 1024 * 1024,
  pro: 100 * 1024 * 1024 * 1024,
  business: 1024 * 1024 * 1024 * 1024,
  n0va1o: 5 * 1024 * 1024 * 1024 * 1024,
};

export function estimateMessageBytes(m: any): number {
  const bodyBytes = (m.body || "").length * 2;
  const attachBytes = (m.attachments || []).reduce((s: number, a: any) => s + (a.sizeBytes || 0), 0);
  const overhead = 1024 + (m.subject || "").length * 2 + ((m.from || {}).email || "").length * 4 + (m.to || []).length * 60;
  return bodyBytes + attachBytes + overhead;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function safePct(used: number, quota: number): number {
  if (used <= 0 || quota <= 0) return 0;
  const pct = (used / quota) * 100;
  return pct < 0.01 ? 0.01 : parseFloat(pct.toFixed(2));
}

export class MailboxService {
  createMailbox(tenantId: string, input: any) {
    if (!input || !input.name) throw new Error("Mailbox name is required");
    const type = input.type || "personal";
    if (!MAILBOX_TYPES.includes(type)) throw new Error(`Unknown mailbox type "${type}" — use one of: ${MAILBOX_TYPES.join(", ")}`);
    const plan = input.plan || "pro";
    if (!PLAN_QUOTAS[plan]) throw new Error(`Unknown plan "${plan}" — use one of: free, pro, business, n0va1o`);
    const email = input.email || `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")}@${input.domain || "n0va.mail"}`;
    const mailbox = DataStore.mem().insert("mailboxes", {
      tenantId,
      name: input.name,
      type,
      email,
      displayName: input.displayName || input.name,
      plan,
      quotaBytes: PLAN_QUOTAS[plan],
      usedBytes: 0,
      signature: input.signature || "",
      aliases: input.aliases || [],
      settings: { autoEnrich: true, aiPriority: true, autoSummarize: true, smartReply: true, ...(input.settings || {}) },
      status: "active",
      createdBy: input.createdBy || "user_001",
    });
    return { mailboxId: mailbox._id, ...mailbox, summary: `Mailbox "${input.name}" created — ${type} on ${plan} plan (${formatBytes(PLAN_QUOTAS[plan])})` };
  }

  listMailboxes(tenantId: string) {
    const mailboxes = DataStore.mem().find("mailboxes", (m: any) => m.tenantId === tenantId);
    return mailboxes.map(mb => {
      const msgs = DataStore.mem().find("messages", (msg: any) => msg.tenantId === tenantId && msg.mailboxId === mb._id);
      const used = msgs.reduce((s, msg) => s + estimateMessageBytes(msg), 0);
      return {
        mailboxId: mb._id, name: mb.name, type: mb.type, email: mb.email, displayName: mb.displayName,
        plan: mb.plan, quotaBytes: mb.quotaBytes, usedBytes: used, percentUsed: safePct(used, mb.quotaBytes),
        messageCount: msgs.length, unreadCount: msgs.filter(m => !m.read && m.folder === "inbox").length,
        aliases: mb.aliases, settings: mb.settings, status: mb.status, createdBy: mb.createdBy, createdAt: mb.createdAt,
      };
    });
  }

  getMailbox(tenantId: string, mailboxId: string) {
    const mailbox = DataStore.mem().findOne("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId);
    if (!mailbox) throw new Error(`Mailbox "${mailboxId}" not found`);
    const msgs = DataStore.mem().find("messages", (msg: any) => msg.tenantId === tenantId && msg.mailboxId === mailboxId);
    const used = msgs.reduce((s, msg) => s + estimateMessageBytes(msg), 0);
    return { mailboxId: mailbox._id, ...mailbox, usedBytes: used, percentUsed: safePct(used, mailbox.quotaBytes), messageCount: msgs.length };
  }

  updateMailbox(tenantId: string, mailboxId: string, patch: any) {
    const mailbox = DataStore.mem().findOne("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId);
    if (!mailbox) throw new Error(`Mailbox "${mailboxId}" not found`);
    const updated = DataStore.mem().update("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId, {
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
      ...(patch.signature !== undefined ? { signature: patch.signature } : {}),
      ...(patch.aliases !== undefined ? { aliases: patch.aliases } : {}),
      ...(patch.settings !== undefined ? { settings: { ...mailbox.settings, ...patch.settings } } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    });
    return { mailboxId: updated._id, ...updated, summary: `Mailbox "${updated.name}" updated` };
  }

  deleteMailbox(tenantId: string, mailboxId: string) {
    const mailbox = DataStore.mem().findOne("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId);
    if (!mailbox) throw new Error(`Mailbox "${mailboxId}" not found`);
    const msgs = DataStore.mem().find("messages", (msg: any) => msg.tenantId === tenantId && msg.mailboxId === mailboxId);
    for (const msg of msgs) DataStore.mem().delete("messages", (m: any) => m._id === msg._id);
    DataStore.mem().delete("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId);
    return { mailboxId, deletedMessages: msgs.length, summary: `Mailbox "${mailbox.name}" deleted with ${msgs.length} messages` };
  }

  mailboxQuota(tenantId: string, mailboxId: string) {
    const mailbox = DataStore.mem().findOne("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId);
    if (!mailbox) throw new Error(`Mailbox "${mailboxId}" not found`);
    const msgs = DataStore.mem().find("messages", (msg: any) => msg.tenantId === tenantId && msg.mailboxId === mailboxId);
    const used = msgs.reduce((s, msg) => s + estimateMessageBytes(msg), 0);
    const pct = safePct(used, mailbox.quotaBytes);
    const breakdown = {
      messageBytes: msgs.reduce((s, msg) => s + (msg.body || "").length * 2, 0),
      attachmentBytes: msgs.reduce((s, msg) => s + (msg.attachments || []).reduce((a, at) => a + (at.sizeBytes || 0), 0), 0),
      messageCount: msgs.length,
      attachmentCount: msgs.reduce((s, msg) => s + (msg.attachments || []).length, 0),
    };
    const alerts: string[] = [];
    if (pct >= 90) alerts.push(`Storage critical: ${pct}% of ${formatBytes(mailbox.quotaBytes)} quota used`);
    else if (pct >= 75) alerts.push(`Storage warning: ${pct}% of quota used — archive old mail or upgrade`);
    else if (pct >= 50) alerts.push(`Storage healthy: ${pct}% used, ${formatBytes(mailbox.quotaBytes - used)} remaining`);
    else alerts.push(`Storage healthy: ${formatBytes(used)} of ${formatBytes(mailbox.quotaBytes)} used (${pct}%)`);
    return { mailboxId, name: mailbox.name, plan: mailbox.plan, quotaBytes: mailbox.quotaBytes, usedBytes: used, percentUsed: pct, breakdown, alerts, status: pct >= 90 ? "critical" : pct >= 75 ? "warning" : "ok" };
  }

  storageAnalytics(tenantId: string) {
    const mailboxes = this.listMailboxes(tenantId);
    const quotas = mailboxes.map(mb => this.mailboxQuota(tenantId, mb.mailboxId));
    const totalUsed = quotas.reduce((s, q) => s + q.usedBytes, 0);
    const totalQuota = quotas.reduce((s, q) => s + q.quotaBytes, 0);
    const allMsgs = DataStore.mem().find("messages", (msg: any) => msg.tenantId === tenantId);
    const senderCounts = new Map<string, { name: string; count: number }>();
    for (const msg of allMsgs) {
      const email = (msg.from || {}).email || "unknown";
      const existing = senderCounts.get(email) || { name: (msg.from || {}).name || email, count: 0 };
      existing.count++;
      senderCounts.set(email, existing);
    }
    const topSenders = [...senderCounts.entries()]
      .map(([email, v]) => ({ email, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const categoryCounts = new Map<string, number>();
    for (const msg of allMsgs) {
      const cat = (msg.ai && msg.ai.category) || "unclassified";
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }
    const byCategory = [...categoryCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    const attachmentBytes = allMsgs.reduce((s, msg) => s + (msg.attachments || []).reduce((a, at) => a + (at.sizeBytes || 0), 0), 0);
    const pct = totalQuota > 0 ? parseFloat(((totalUsed / totalQuota) * 100).toFixed(2)) : 0;
    const critical = quotas.filter(q => q.status === "critical").length;
    return {
      mailboxes: quotas,
      totals: { mailboxes: mailboxes.length, usedBytes: totalUsed, quotaBytes: totalQuota, percentUsed: pct, messages: allMsgs.length, attachmentBytes, critical },
      topSenders,
      byCategory,
      summary: `${mailboxes.length} mailboxes using ${formatBytes(totalUsed)} of ${formatBytes(totalQuota)} (${pct}%)${critical ? ` — ${critical} at critical level` : " — all healthy"}`,
      seed: hashStr(tenantId + "mailbox_seed"),
    };
  }
}

export const mailboxService = new MailboxService();
