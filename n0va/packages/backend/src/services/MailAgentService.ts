import { DataStore } from "./DataStore";
import { mailMessage } from "./MailMessageService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export class MailAgentService {
  private getMailbox(tenantId: string, mailboxId?: string): any {
    if (mailboxId) {
      const mb = DataStore.mem().findOne("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId);
      if (mb) return mb;
      throw new Error(`Mailbox "${mailboxId}" not found`);
    }
    const mailboxes = DataStore.mem().find("mailboxes", (m: any) => m.tenantId === tenantId);
    if (mailboxes.length === 0) throw new Error("No mailboxes configured");
    return mailboxes.find((m: any) => m.status === "active") || mailboxes[0];
  }

  private log(tenantId: string, entry: any) {
    DataStore.mem().insert("mail_agent_log", { tenantId, ...entry, at: new Date().toISOString() });
  }

  setOutOfOffice(tenantId: string, mailboxId: string, input: any) {
    this.getMailbox(tenantId, mailboxId);
    if (!input || input.enabled === undefined) throw new Error("enabled is required");
    const ooo = {
      enabled: !!input.enabled,
      message: input.message || "I'm currently out of the office and will reply when I return.",
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      updatedAt: new Date().toISOString(),
    };
    DataStore.mem().update("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId, { ooo });
    this.log(tenantId, { action: "ooo_update", mailboxId, detail: `Out of office ${ooo.enabled ? "enabled" : "disabled"}` });
    return { mailboxId, ...ooo, summary: ooo.enabled ? "Out of office auto-reply enabled" : "Out of office auto-reply disabled" };
  }

  outOfOfficeStatus(tenantId: string, mailboxId: string) {
    const mb = this.getMailbox(tenantId, mailboxId);
    const ooo = mb.ooo || { enabled: false, message: "", startDate: null, endDate: null };
    const now = Date.now();
    const active = ooo.enabled && (!ooo.endDate || new Date(ooo.endDate).getTime() > now) && (!ooo.startDate || new Date(ooo.startDate).getTime() <= now);
    return {
      mailboxId,
      mailboxName: mb.name,
      enabled: !!ooo.enabled,
      active: !!active,
      message: ooo.message,
      startDate: ooo.startDate,
      endDate: ooo.endDate,
      autoRepliesSent: DataStore.mem().find("mail_agent_log", (l: any) => l.tenantId === tenantId && l.mailboxId === mailboxId && l.action === "ooo_auto_reply").length,
      summary: active ? "Out of office active — auto-replies are being sent" : ooo.enabled ? "Out of office configured (not active right now)" : "Out of office is off",
    };
  }

  scheduleSend(tenantId: string, mailboxId: string, input: any) {
    this.getMailbox(tenantId, mailboxId);
    if (!input || !input.to || !input.subject || !input.sendAt) throw new Error("to, subject and sendAt are required");
    if (!Date.parse(String(input.sendAt))) throw new Error("sendAt must be a valid date");
    const schedule = DataStore.mem().insert("mail_schedules", {
      tenantId,
      mailboxId,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      body: input.body || "",
      sendAt: new Date(input.sendAt).toISOString(),
      status: "scheduled",
      importance: input.importance || "normal",
      createdBy: input.createdBy || "user_001",
    });
    this.log(tenantId, { action: "schedule_created", mailboxId, detail: `"${input.subject}" scheduled for ${new Date(schedule.sendAt).toLocaleString()}` });
    return { scheduleId: schedule._id, ...schedule, summary: `Email "${input.subject}" scheduled for ${new Date(schedule.sendAt).toLocaleString()}` };
  }

  listScheduled(tenantId: string, mailboxId?: string) {
    let schedules = DataStore.mem().find("mail_schedules", (s: any) => s.tenantId === tenantId && (!mailboxId || s.mailboxId === mailboxId));
    schedules = schedules.sort((a: any, b: any) => new Date(a.sendAt).getTime() - new Date(b.sendAt).getTime());
    return {
      schedules,
      pending: schedules.filter(s => s.status === "scheduled").length,
      summary: `${schedules.filter(s => s.status === "scheduled").length} email(s) waiting to be sent`,
    };
  }

  cancelSchedule(tenantId: string, scheduleId: string) {
    const schedule = DataStore.mem().findOne("mail_schedules", (s: any) => s._id === scheduleId && s.tenantId === tenantId);
    if (!schedule) throw new Error(`Schedule "${scheduleId}" not found`);
    const updated = DataStore.mem().update("mail_schedules", (s: any) => s._id === scheduleId && s.tenantId === tenantId, { status: "cancelled", cancelledAt: new Date().toISOString() });
    return { scheduleId: updated._id, subject: updated.subject, status: "cancelled", summary: `Scheduled email "${updated.subject}" cancelled` };
  }

  extractTasks(tenantId: string, messageId: string) {
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    const titles: string[] = [];
    for (const item of (msg.ai && msg.ai.actionItems) || []) {
      if (!titles.includes(item)) titles.push(item);
    }
    const body = msg.body || "";
    const pattern = /(?:^|[.\n])\s*(?:todo|to-do|action item|need to|remember to|follow up|please review|must)([^.\n]{4,80})/gi;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(body)) !== null && titles.length < 5) {
      const t = m[1].trim().replace(/[.,;:]+$/, "");
      if (t && !titles.includes(t)) titles.push(t);
    }
    const created: any[] = [];
    for (const title of titles.slice(0, 5)) {
      const dup = DataStore.mem().findOne("mail_tasks", (t: any) => t.tenantId === tenantId && t.messageId === messageId && t.title === title);
      if (dup) continue;
      const task = DataStore.mem().insert("mail_tasks", {
        tenantId,
        messageId,
        threadId: msg.threadId,
        subject: msg.subject,
        title,
        status: "open",
        source: "ai",
        createdBy: "n0va1o",
      });
      created.push(task);
    }
    return { messageId, extracted: created.length, tasks: created, summary: `${created.length} task(s) extracted from "${msg.subject}"` };
  }

  listTasks(tenantId: string) {
    const tasks = DataStore.mem().find("mail_tasks", (t: any) => t.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const open = tasks.filter(t => t.status === "open");
    return {
      tasks,
      totals: { open: open.length, done: tasks.length - open.length, total: tasks.length },
      summary: `${open.length} open task(s) from your mail`,
    };
  }

  completeTask(tenantId: string, taskId: string) {
    const task = DataStore.mem().findOne("mail_tasks", (t: any) => t._id === taskId && t.tenantId === tenantId);
    if (!task) throw new Error(`Task "${taskId}" not found`);
    const updated = DataStore.mem().update("mail_tasks", (t: any) => t._id === taskId && t.tenantId === tenantId, { status: "done", completedAt: new Date().toISOString() });
    return { taskId: updated._id, title: updated.title, status: "done", summary: `Task "${updated.title}" completed` };
  }

  runAgentCycle(tenantId: string, mailboxId?: string) {
    const mailboxes = DataStore.mem().find("mailboxes", (m: any) => m.tenantId === tenantId && (!mailboxId || m._id === mailboxId));
    let autoReplies = 0;
    let schedulesSent = 0;
    const now = new Date();
    for (const mb of mailboxes) {
      const ooo = mb.ooo || { enabled: false, endDate: null, startDate: null, message: "" };
      const oooActive = ooo.enabled && (!ooo.endDate || new Date(ooo.endDate).getTime() > now.getTime()) && (!ooo.startDate || new Date(ooo.startDate).getTime() <= now.getTime());
      const inbox = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.mailboxId === mb._id && m.folder === "inbox" && !m.read);
      for (const msg of inbox) {
        const flags = msg.flags || [];
        if (oooActive && !flags.includes("ooo_replied") && !flags.includes("auto_replied")) {
          DataStore.mem().update("messages", (m: any) => m._id === msg._id, { flags: [...flags, "ooo_replied"] });
          this.log(tenantId, { action: "ooo_auto_reply", mailboxId: mb._id, messageId: msg._id, subject: msg.subject, detail: `Auto-replied to ${(msg.from || {}).email || "sender"}` });
          autoReplies++;
        }
      }
      const due = DataStore.mem().find("mail_schedules", (s: any) => s.tenantId === tenantId && s.mailboxId === mb._id && s.status === "scheduled" && new Date(s.sendAt).getTime() <= now.getTime());
      for (const s of due) {
        mailMessage.composeSend(tenantId, mb._id, { to: s.to, subject: s.subject, body: s.body, importance: s.importance });
        DataStore.mem().update("mail_schedules", (sch: any) => sch._id === s._id, { status: "sent", sentAt: now.toISOString() });
        this.log(tenantId, { action: "schedule_sent", mailboxId: mb._id, scheduleId: s._id, subject: s.subject, detail: `"${s.subject}" sent on schedule` });
        schedulesSent++;
      }
    }
    const summaryParts: string[] = [];
    if (autoReplies) summaryParts.push(`${autoReplies} out-of-office auto-repl` + (autoReplies > 1 ? "ies" : "y") + " sent");
    if (schedulesSent) summaryParts.push(`${schedulesSent} scheduled email(s) sent`);
    if (!summaryParts.length) summaryParts.push("nothing to do this cycle");
    return {
      autoReplies,
      schedulesSent,
      summary: "Agent cycle complete — " + summaryParts.join(", "),
      ranAt: now.toISOString(),
      seed: hashStr(tenantId + "agent_cycle" + now.toISOString().slice(0, 13)),
    };
  }

  agentLog(tenantId: string, limit = 20) {
    const log = DataStore.mem().find("mail_agent_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, limit);
    return { log, total: log.length, summary: `${log.length} agent action(s) recorded` };
  }

  agentStatus(tenantId: string) {
    const mailboxes = DataStore.mem().find("mailboxes", (m: any) => m.tenantId === tenantId);
    const ooo = mailboxes.map(mb => this.outOfOfficeStatus(tenantId, mb._id));
    const scheduled = this.listScheduled(tenantId);
    const tasks = this.listTasks(tenantId);
    const log = this.agentLog(tenantId, 5);
    return {
      ooo,
      activeOutOfOffice: ooo.filter(o => o.active).length,
      scheduled: scheduled.schedules,
      pendingSchedules: scheduled.pending,
      tasks: tasks.tasks,
      openTasks: tasks.totals.open,
      recentActivity: log.log,
      lastCycleAt: (log.log[0] || {}).at || null,
      summary: `${ooo.filter(o => o.active).length} mailbox(es) out of office, ${scheduled.pending} scheduled, ${tasks.totals.open} open task(s)`,
      seed: hashStr(tenantId + "agent_status"),
    };
  }
}

export const mailAgent = new MailAgentService();
