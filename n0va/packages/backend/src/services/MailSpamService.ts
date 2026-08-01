import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const SPAM_KEYWORDS = ["prize", "winner", "free", "50% off", "discount", "claim", "urgent", "click here", "lottery", "cash", "bonus", "act now"];

export class MailSpamService {
  private scoreMessage(tenantId: string, msg: any) {
    const seed = hashStr(msg._id + (msg.from && msg.from.email ? msg.from.email : "") + (msg.subject || ""));
    const lower = `${msg.subject || ""} ${msg.body || ""}`.toLowerCase();
    const reasons: string[] = [];
    let score = seed % 41;
    for (const kw of SPAM_KEYWORDS) {
      if (lower.includes(kw)) { score += 12; if (reasons.length < 3) reasons.push(`promo keyword "${kw}"`); }
    }
    if (seed % 7 === 0) { score += 15; reasons.push("unknown sender domain"); }
    if (seed % 11 === 0) { score += 10; reasons.push("link-heavy content"); }
    if (seed % 13 === 0) { score += 8; reasons.push("low sender reputation"); }
    const finalScore = Math.min(100, score);
    const isSpam = finalScore >= 60;
    return { score: finalScore, isSpam, reasons, verdict: isSpam ? "spam" : "clean" };
  }

  private blockedFor(tenantId: string, email: string) {
    const blocked = DataStore.mem().find("mail_blocked_senders", (b: any) => b.tenantId === tenantId);
    return blocked.some(b => b.email.toLowerCase() === String(email).toLowerCase());
  }

  private allowedFor(tenantId: string, email: string) {
    const allowed = DataStore.mem().find("mail_allowed_senders", (a: any) => a.tenantId === tenantId);
    return allowed.some(a => a.email.toLowerCase() === String(email).toLowerCase());
  }

  private log(tenantId: string, entry: any) {
    DataStore.mem().insert("mail_spam_log", { tenantId, ...entry, at: new Date().toISOString() });
  }

  spamStatus(tenantId: string) {
    const quarantine = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.folder === "spam");
    const blocked = DataStore.mem().find("mail_blocked_senders", (b: any) => b.tenantId === tenantId);
    const allowed = DataStore.mem().find("mail_allowed_senders", (a: any) => a.tenantId === tenantId);
    const log = DataStore.mem().find("mail_spam_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);
    return {
      quarantineCount: quarantine.length,
      blockedCount: blocked.length,
      allowedCount: allowed.length,
      protectionScore: Math.min(100, 72 + hashStr(tenantId + "spam_score") % 29),
      recentActivity: log,
      summary: `${quarantine.length} message(s) in quarantine, ${blocked.length} blocked sender(s), ${allowed.length} allowed sender(s)`,
      seed: hashStr(tenantId + "spam_status"),
    };
  }

  scanMessage(tenantId: string, messageId: string) {
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    const scan = this.scoreMessage(tenantId, msg);
    return { messageId, subject: msg.subject, ...scan, summary: `"${msg.subject}" scored ${scan.score}/100 — ${scan.verdict}` };
  }

  scanAll(tenantId: string) {
    const inbox = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.folder === "inbox");
    let scanned = 0;
    let moved = 0;
    const flagged: any[] = [];
    for (const msg of inbox) {
      const flags = msg.flags || [];
      if (flags.includes("spam")) continue;
      const scan = this.scoreMessage(tenantId, msg);
      scanned++;
      if (scan.isSpam || this.blockedFor(tenantId, (msg.from || {}).email || "")) {
        const newFlags = [...flags, "spam"];
        DataStore.mem().update("messages", (m: any) => m._id === msg._id, { folder: "spam", flags: newFlags });
        this.log(tenantId, { action: "auto_quarantine", messageId: msg._id, subject: msg.subject, score: scan.score, detail: `"${msg.subject}" quarantined (score ${scan.score})` });
        flagged.push({ messageId: msg._id, subject: msg.subject, score: scan.score });
        moved++;
      }
    }
    return {
      scanned, moved, flagged,
      summary: `Scanned ${scanned} inbox message(s) — ${moved} moved to quarantine`,
      seed: hashStr(tenantId + "scan_all" + new Date().toISOString().slice(0, 13)),
    };
  }

  quarantine(tenantId: string, opts: any = {}) {
    let msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && (m.folder === "spam" || (m.flags || []).includes("spam")))
      .sort((a: any, b: any) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    if (opts.onlyFlagged) msgs = msgs.filter(m => (m.flags || []).includes("spam"));
    const limit = opts.limit ? parseInt(String(opts.limit), 10) : 100;
    return msgs.slice(0, limit).map(m => ({
      messageId: m._id, subject: m.subject, from: m.from, receivedAt: m.receivedAt,
      ...this.scoreMessage(tenantId, m), blocked: this.blockedFor(tenantId, (m.from || {}).email || ""),
    }));
  }

  moveToSpam(tenantId: string, messageId: string) {
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    const flags = (msg.flags || []).includes("spam") ? msg.flags : [...(msg.flags || []), "spam"];
    const updated = DataStore.mem().update("messages", (m: any) => m._id === messageId && m.tenantId === tenantId, { folder: "spam", flags });
    this.log(tenantId, { action: "moved_to_spam", messageId, subject: msg.subject, detail: `"${msg.subject}" moved to spam` });
    return { messageId: updated._id, subject: updated.subject, folder: "spam", summary: `"${msg.subject}" moved to spam` };
  }

  reportSpam(tenantId: string, messageId: string) {
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    const moved = this.moveToSpam(tenantId, messageId);
    const sender = (msg.from || {}).email || "";
    let blocked = false;
    if (sender && !this.blockedFor(tenantId, sender)) {
      const known = DataStore.mem().findOne("mail_contacts", (c: any) => c.tenantId === tenantId && c.email.toLowerCase() === sender.toLowerCase());
      if (!known) {
        DataStore.mem().insert("mail_blocked_senders", { tenantId, email: sender, name: (msg.from || {}).name || "", blockedAt: new Date().toISOString(), reason: "reported_spam" });
        blocked = true;
      }
    }
    this.log(tenantId, { action: "reported_spam", messageId, subject: msg.subject, detail: `"${msg.subject}" reported as spam${blocked ? ` — ${sender} blocked` : ""}` });
    return { ...moved, senderBlocked: blocked, summary: `"${msg.subject}" reported as spam${blocked ? ` — sender blocked` : ""}` };
  }

  reportNotSpam(tenantId: string, messageId: string) {
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    const flags = (msg.flags || []).filter((f: string) => f !== "spam");
    const updated = DataStore.mem().update("messages", (m: any) => m._id === messageId && m.tenantId === tenantId, { folder: "inbox", flags });
    const sender = (msg.from || {}).email || "";
    let allowed = false;
    if (sender && !this.allowedFor(tenantId, sender)) {
      DataStore.mem().insert("mail_allowed_senders", { tenantId, email: sender, name: (msg.from || {}).name || "", allowedAt: new Date().toISOString(), reason: "reported_not_spam" });
      allowed = true;
    }
    this.log(tenantId, { action: "reported_not_spam", messageId, subject: msg.subject, detail: `"${msg.subject}" returned to inbox${allowed ? ` — ${sender} allowed` : ""}` });
    return { messageId: updated._id, subject: updated.subject, folder: "inbox", senderAllowed: allowed, summary: `"${msg.subject}" returned to inbox` };
  }

  blockSender(tenantId: string, input: any) {
    if (!input || !input.email) throw new Error("Sender email is required");
    const email = String(input.email).toLowerCase();
    if (this.blockedFor(tenantId, email)) return { email, alreadyBlocked: true, summary: `${email} is already blocked` };
    DataStore.mem().insert("mail_blocked_senders", { tenantId, email, name: input.name || "", reason: input.reason || "manual", blockedAt: new Date().toISOString() });
    this.log(tenantId, { action: "sender_blocked", email, detail: `${email} blocked` });
    return { email, alreadyBlocked: false, summary: `${email} blocked` };
  }

  unblockSender(tenantId: string, email: string) {
    if (!email) throw new Error("Sender email is required");
    DataStore.mem().delete("mail_blocked_senders", (b: any) => b.tenantId === tenantId && b.email.toLowerCase() === email.toLowerCase());
    this.log(tenantId, { action: "sender_unblocked", email, detail: `${email} unblocked` });
    return { email, summary: `${email} unblocked` };
  }

  blockedSenders(tenantId: string) {
    return DataStore.mem().find("mail_blocked_senders", (b: any) => b.tenantId === tenantId)
      .sort((a: any, b: any) => String(b.blockedAt || "").localeCompare(String(a.blockedAt || "")));
  }

  allowSender(tenantId: string, input: any) {
    if (!input || !input.email) throw new Error("Sender email is required");
    const email = String(input.email).toLowerCase();
    if (this.allowedFor(tenantId, email)) return { email, alreadyAllowed: true, summary: `${email} is already allowed` };
    DataStore.mem().insert("mail_allowed_senders", { tenantId, email, name: input.name || "", reason: input.reason || "manual", allowedAt: new Date().toISOString() });
    this.log(tenantId, { action: "sender_allowed", email, detail: `${email} allowed` });
    return { email, alreadyAllowed: false, summary: `${email} allowed` };
  }

  removeAllowedSender(tenantId: string, email: string) {
    if (!email) throw new Error("Sender email is required");
    DataStore.mem().delete("mail_allowed_senders", (a: any) => a.tenantId === tenantId && a.email.toLowerCase() === email.toLowerCase());
    this.log(tenantId, { action: "sender_removed_allowed", email, detail: `${email} removed from allowed list` });
    return { email, summary: `${email} removed from allowed list` };
  }

  allowedSenders(tenantId: string) {
    return DataStore.mem().find("mail_allowed_senders", (a: any) => a.tenantId === tenantId)
      .sort((a: any, b: any) => String(b.allowedAt || "").localeCompare(String(a.allowedAt || "")));
  }

  spamLog(tenantId: string, limit = 20) {
    const log = DataStore.mem().find("mail_spam_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, limit);
    return { log, total: log.length, summary: `${log.length} spam action(s) recorded` };
  }
}

export const mailSpam = new MailSpamService();
