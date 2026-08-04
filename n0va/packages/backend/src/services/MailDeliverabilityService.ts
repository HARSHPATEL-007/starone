import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const BOUNCE_CLASSES = [
  { id: "hard", label: "Hard bounce", description: "Permanent failure (invalid address, unknown domain)" },
  { id: "soft", label: "Soft bounce", description: "Temporary failure (mailbox full, server busy)" },
  { id: "complaint", label: "Complaint", description: "Recipient marked the message as spam" },
];

export const SUPPRESSION_REASONS = [
  { id: "hard_bounce", label: "Hard bounce", auto: true },
  { id: "complaint", label: "Complaint", auto: true },
  { id: "manual", label: "Manual block", auto: false },
  { id: "unsubscribe", label: "Unsubscribed", auto: false },
];

export const REPUTATION_LEVELS = [
  { id: "good", label: "Good", min: 70 },
  { id: "fair", label: "Fair", min: 40 },
  { id: "poor", label: "Poor", min: 0 },
];

function reputationLevel(score: number): string {
  if (score >= 70) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

export class MailDeliverabilityService {
  private bounceList(tenantId: string) {
    return DataStore.mem().find("mail_bounces", (b: any) => b.tenantId === tenantId)
      .sort((a: any, b: any) => (a.at < b.at ? 1 : -1));
  }

  recordBounce(tenantId: string, input: any) {
    if (!input || !input.email) throw new Error("Email is required");
    const type = input.type || "soft";
    if (!BOUNCE_CLASSES.some((c) => c.id === type)) throw new Error(`Bounce type must be one of ${BOUNCE_CLASSES.map((c) => c.id).join("/")}`);
    const bounce = DataStore.mem().insert("mail_bounces", {
      tenantId,
      email: String(input.email).toLowerCase(),
      mailboxId: input.mailboxId || null,
      type,
      reason: input.reason || "",
      messageId: input.messageId || null,
      at: new Date().toISOString(),
    });
    let suppressed = false;
    if (type === "hard" || type === "complaint") {
      this.suppressEmail(tenantId, input.email, type === "hard" ? "hard_bounce" : "complaint", `${type === "hard" ? "Hard bounce" : "Complaint"} recorded`);
      suppressed = true;
    }
    return { bounceId: bounce._id, ...bounce, suppressed, summary: `${BOUNCE_CLASSES.find((c) => c.id === type)!.label} recorded for ${input.email}` };
  }

  recordComplaint(tenantId: string, input: any) {
    return this.recordBounce(tenantId, { ...input, type: "complaint" });
  }

  bounceStats(tenantId: string) {
    const bounces = this.bounceList(tenantId);
    const byType: Record<string, number> = { hard: 0, soft: 0, complaint: 0 };
    for (const b of bounces) byType[b.type] = (byType[b.type] || 0) + 1;
    const total = bounces.length;
    const hardPlusComplaint = byType.hard + byType.complaint;
    return {
      total,
      byType,
      hardRate: total > 0 ? Math.round((hardPlusComplaint / total) * 1000) / 10 : 0,
      lastBounce: bounces[0] || null,
      summary: `${total} bounce(s) recorded`,
    };
  }

  listBounces(tenantId: string, type?: string) {
    const list = this.bounceList(tenantId).filter((b: any) => !type || b.type === type);
    return { bounces: list.map((b: any) => ({ bounceId: b._id, ...b })), total: list.length };
  }

  suppressEmail(tenantId: string, email: string, reason = "manual", note = "") {
    const em = String(email).toLowerCase();
    if (!em) throw new Error("Email is required");
    if (!SUPPRESSION_REASONS.some((r) => r.id === reason)) throw new Error(`Suppression reason must be one of ${SUPPRESSION_REASONS.map((r) => r.id).join("/")}`);
    const existing = DataStore.mem().findOne("mail_suppression", (s: any) => s.tenantId === tenantId && s.email === em && !s.removed);
    if (existing) return { suppressed: false, reason: "already_suppressed", summary: `${em} is already suppressed` };
    const row = DataStore.mem().insert("mail_suppression", {
      tenantId,
      email: em,
      reason,
      note,
      source: "deliverability",
      createdAt: new Date().toISOString(),
      removed: false,
    });
    return { suppressionId: row._id, suppressed: true, summary: `${em} suppressed (${reason})` };
  }

  unsuppressEmail(tenantId: string, email: string) {
    const em = String(email).toLowerCase();
    const row = DataStore.mem().findOne("mail_suppression", (s: any) => s.tenantId === tenantId && s.email === em && !s.removed);
    if (!row) throw new Error(`${em} is not suppressed`);
    DataStore.mem().update("mail_suppression", (s: any) => s._id === row._id && s.tenantId === tenantId, { removed: true, removedAt: new Date().toISOString() });
    return { unsuppressed: true, summary: `${em} removed from the suppression list` };
  }

  suppressionList(tenantId: string, reason?: string) {
    const list = DataStore.mem().find("mail_suppression", (s: any) => s.tenantId === tenantId && !s.removed && (!reason || s.reason === reason))
      .sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1));
    return { entries: list.map((s: any) => ({ suppressionId: s._id, ...s })), total: list.length };
  }

  suppressionStatus(tenantId: string, email: string) {
    const em = String(email || "").toLowerCase();
    const row = DataStore.mem().findOne("mail_suppression", (s: any) => s.tenantId === tenantId && s.email === em && !s.removed);
    const pref = DataStore.mem().findOne("mail_preferences", (p: any) => p.tenantId === tenantId && p.email === em);
    const unsubscribed = !!(pref && pref.unsubscribed);
    return {
      email: em,
      suppressed: !!row || unsubscribed,
      reason: row ? row.reason : unsubscribed ? "unsubscribe" : null,
      source: row ? row.source : null,
      since: row ? row.createdAt : pref ? pref.updatedAt : null,
      summary: (row || unsubscribed) ? `${em} is suppressed` : `${em} is allowed`,
    };
  }

  sendingReputation(tenantId: string) {
    const bounces = this.bounceList(tenantId);
    const hard = bounces.filter((b: any) => b.type === "hard").length;
    const complaints = bounces.filter((b: any) => b.type === "complaint").length;
    const base = 85 + (hashStr(tenantId + "|rep") % 11);
    const score = Math.max(5, Math.min(100, base - hard * 5 - complaints * 10));
    return {
      score,
      level: reputationLevel(score),
      hardBounces: hard,
      complaints,
      summary: `Sending reputation ${reputationLevel(score)} (${score}/100)`,
    };
  }

  listHygiene(tenantId: string) {
    const contacts = DataStore.mem().find("mail_contacts", (c: any) => c.tenantId === tenantId);
    const suppression = this.suppressionList(tenantId);
    const bad = new Set(suppression.entries.filter((s: any) => s.reason === "hard_bounce" || s.reason === "complaint").map((s: any) => s.email));
    const suggested = contacts
      .filter((c: any) => bad.has(String(c.email || c.address || "").toLowerCase()))
      .map((c: any) => ({ contactId: c._id, name: c.name || "", email: c.email || c.address || "", reason: "bounce_or_complaint" }));
    return {
      suggested,
      total: suggested.length,
      stale: suppression.entries.filter((s: any) => s.reason === "manual").length,
      summary: `${suggested.length} contact(s) flagged for list hygiene`,
    };
  }

  deliverabilityDashboard(tenantId: string) {
    const bounces = this.bounceStats(tenantId);
    const suppression = this.suppressionList(tenantId);
    const reputation = this.sendingReputation(tenantId);
    const hygiene = this.listHygiene(tenantId);
    const alerts: any[] = [];
    if (reputation.score < 60) alerts.push({ severity: "high", message: `Sending reputation is ${reputation.level} (${reputation.score}/100)` });
    if (bounces.byType.hard > 0) alerts.push({ severity: "medium", message: `${bounces.byType.hard} hard bounce(s) — senders auto-suppressed` });
    if (bounces.byType.complaint > 0) alerts.push({ severity: "high", message: `${bounces.byType.complaint} complaint(s) recorded` });
    if (hygiene.total > 0) alerts.push({ severity: "low", message: `${hygiene.total} contact(s) should be removed from lists` });
    return {
      bounces,
      suppression: { total: suppression.total, byReason: suppression.entries.reduce((acc: any, s: any) => { acc[s.reason] = (acc[s.reason] || 0) + 1; return acc; }, {}) },
      reputation,
      hygiene,
      alerts,
      generatedAt: new Date().toISOString(),
      summary: `Reputation ${reputation.level} · ${suppression.total} suppressed · ${bounces.total} bounce(s)`,
    };
  }
}

export const mailDeliverability = new MailDeliverabilityService();
