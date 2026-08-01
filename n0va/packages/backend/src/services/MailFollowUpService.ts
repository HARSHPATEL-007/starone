import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export class MailFollowUpService {
  private getMessage(tenantId: string, messageId: string): any {
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    return msg;
  }

  private log(tenantId: string, entry: any) {
    DataStore.mem().insert("mail_follow_up_log", { tenantId, ...entry, at: new Date().toISOString() });
  }

  snooze(tenantId: string, messageId: string, until: string) {
    const msg = this.getMessage(tenantId, messageId);
    if (!until || !Date.parse(String(until))) throw new Error("snooze until date is required");
    const untilDate = new Date(until).toISOString();
    if (new Date(untilDate).getTime() <= Date.now()) throw new Error("Snooze date must be in the future");
    const updated = DataStore.mem().update("messages", (m: any) => m._id === messageId && m.tenantId === tenantId, { snoozedUntil: untilDate, snoozed: true });
    this.log(tenantId, { action: "snoozed", messageId, subject: msg.subject, detail: `"${msg.subject}" snoozed until ${new Date(untilDate).toLocaleString()}` });
    return { messageId: updated._id, subject: updated.subject, snoozedUntil: untilDate, summary: `"${updated.subject}" snoozed until ${new Date(untilDate).toLocaleString()}` };
  }

  unsnooze(tenantId: string, messageId: string) {
    const msg = this.getMessage(tenantId, messageId);
    const updated = DataStore.mem().update("messages", (m: any) => m._id === messageId && m.tenantId === tenantId, { snoozedUntil: null, snoozed: false });
    this.log(tenantId, { action: "unsnoozed", messageId, subject: msg.subject, detail: `"${msg.subject}" unsnoozed` });
    return { messageId: updated._id, subject: updated.subject, snoozedUntil: null, summary: `"${updated.subject}" unsnoozed` };
  }

  listSnoozed(tenantId: string) {
    const now = Date.now();
    const snoozed = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.snoozed && m.snoozedUntil)
      .map(m => ({ ...m, snoozedOverdue: new Date(m.snoozedUntil).getTime() <= now }))
      .sort((a: any, b: any) => new Date(a.snoozedUntil).getTime() - new Date(b.snoozedUntil).getTime());
    return { snoozed, count: snoozed.length, summary: `${snoozed.length} message(s) snoozed` };
  }

  markAwaitingResponse(tenantId: string, messageId: string, deadline?: string) {
    const msg = this.getMessage(tenantId, messageId);
    const deadlineIso = deadline && Date.parse(String(deadline)) ? new Date(deadline).toISOString() : null;
    const updated = DataStore.mem().update("messages", (m: any) => m._id === messageId && m.tenantId === tenantId, {
      awaitingResponse: true, responseDeadline: deadlineIso, followUpAt: deadlineIso || null, respondedAt: null,
    });
    this.log(tenantId, { action: "awaiting_response", messageId, subject: msg.subject, deadline: deadlineIso, detail: `"${msg.subject}" marked awaiting response${deadlineIso ? " (deadline " + new Date(deadlineIso).toLocaleString() + ")" : ""}` });
    return { messageId: updated._id, subject: updated.subject, awaitingResponse: true, responseDeadline: deadlineIso, summary: `"${updated.subject}" marked awaiting response${deadlineIso ? " — deadline " + new Date(deadlineIso).toLocaleString() : ""}` };
  }

  markResponded(tenantId: string, messageId: string) {
    const msg = this.getMessage(tenantId, messageId);
    const now = new Date().toISOString();
    const updated = DataStore.mem().update("messages", (m: any) => m._id === messageId && m.tenantId === tenantId, {
      awaitingResponse: false, responseDeadline: null, followUpAt: null, respondedAt: now,
    });
    DataStore.mem().update("mail_follow_ups", (f: any) => f.tenantId === tenantId && f.messageId === messageId && f.status === "open", { status: "done", completedAt: now });
    this.log(tenantId, { action: "responded", messageId, subject: msg.subject, detail: `"${msg.subject}" marked responded` });
    return { messageId: updated._id, subject: updated.subject, awaitingResponse: false, respondedAt: now, summary: `"${updated.subject}" marked responded` };
  }

  createFollowUp(tenantId: string, messageId: string, input: any) {
    const msg = this.getMessage(tenantId, messageId);
    if (!input || !input.at || !Date.parse(String(input.at))) throw new Error("Follow-up date (at) is required");
    const at = new Date(input.at).toISOString();
    const followUp = DataStore.mem().insert("mail_follow_ups", {
      tenantId,
      messageId,
      threadId: msg.threadId,
      subject: msg.subject,
      from: (msg.from || {}).email || "",
      at,
      note: input.note || "",
      status: "open",
      createdBy: input.createdBy || "user_001",
    });
    DataStore.mem().update("messages", (m: any) => m._id === messageId && m.tenantId === tenantId, { followUpAt: at, awaitingResponse: true });
    this.log(tenantId, { action: "follow_up_created", messageId, subject: msg.subject, detail: `Follow-up on "${msg.subject}" for ${new Date(at).toLocaleString()}` });
    return { followUpId: followUp._id, ...followUp, summary: `Follow-up on "${msg.subject}" set for ${new Date(at).toLocaleString()}` };
  }

  listFollowUps(tenantId: string, opts: any = {}) {
    const now = Date.now();
    let followUps = DataStore.mem().find("mail_follow_ups", (f: any) => f.tenantId === tenantId);
    if (opts.status) followUps = followUps.filter(f => f.status === opts.status);
    if (opts.due === "true" || opts.due === true) followUps = followUps.filter(f => f.status === "open" && new Date(f.at).getTime() <= now);
    const sorted = followUps.map(f => ({ ...f, overdue: f.status === "open" && new Date(f.at).getTime() <= now }))
      .sort((a: any, b: any) => new Date(a.at).getTime() - new Date(b.at).getTime());
    return { followUps: sorted, open: sorted.filter(f => f.status === "open").length, summary: `${sorted.filter(f => f.status === "open").length} open follow-up(s)` };
  }

  completeFollowUp(tenantId: string, followUpId: string) {
    const followUp = DataStore.mem().findOne("mail_follow_ups", (f: any) => f._id === followUpId && f.tenantId === tenantId);
    if (!followUp) throw new Error(`Follow-up "${followUpId}" not found`);
    const updated = DataStore.mem().update("mail_follow_ups", (f: any) => f._id === followUpId && f.tenantId === tenantId, { status: "done", completedAt: new Date().toISOString() });
    return { followUpId: updated._id, subject: updated.subject, status: "done", summary: `Follow-up on "${updated.subject}" completed` };
  }

  deleteFollowUp(tenantId: string, followUpId: string) {
    const followUp = DataStore.mem().findOne("mail_follow_ups", (f: any) => f._id === followUpId && f.tenantId === tenantId);
    if (!followUp) throw new Error(`Follow-up "${followUpId}" not found`);
    DataStore.mem().delete("mail_follow_ups", (f: any) => f._id === followUpId && f.tenantId === tenantId);
    return { followUpId, summary: `Follow-up on "${followUp.subject}" deleted` };
  }

  followUpSummary(tenantId: string) {
    const snoozed = this.listSnoozed(tenantId);
    const followUps = this.listFollowUps(tenantId);
    const now = Date.now();
    const awaiting = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.awaitingResponse && m.folder !== "trash" && m.folder !== "spam");
    const overdueFollowUps = followUps.followUps.filter(f => f.status === "open" && new Date(f.at).getTime() <= now);
    const dueToday = followUps.followUps.filter(f => f.status === "open" && new Date(f.at).getTime() <= now + 86400000);
    return {
      snoozedCount: snoozed.count,
      awaitingCount: awaiting.length,
      openFollowUps: followUps.open,
      overdue: overdueFollowUps.length,
      dueToday: dueToday.length,
      summary: `${followUps.open} open follow-up(s), ${snoozed.count} snoozed, ${awaiting.length} awaiting response`,
      seed: hashStr(tenantId + "followup_summary"),
    };
  }

  suggestions(tenantId: string, limit = 5) {
    const now = Date.now();
    const candidates = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.folder === "inbox" && !m.read && m.importance === "high")
      .map(m => ({ ...m, ageHours: (now - new Date(m.receivedAt).getTime()) / 3600000 }))
      .filter(m => m.ageHours >= 12)
      .sort((a: any, b: any) => b.ageHours - a.ageHours)
      .slice(0, limit);
    return candidates.map(m => ({
      messageId: m._id,
      subject: m.subject,
      from: m.from,
      ageHours: Math.round(m.ageHours * 10) / 10,
      reason: m.ageHours >= 48 ? "Unanswered high-priority email for 2+ days" : "Unanswered high-priority email",
      action: "Follow up",
    }));
  }
}

export const mailFollowUp = new MailFollowUpService();
