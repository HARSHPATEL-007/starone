import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function random6(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

export const TICKET_STATUSES = ["open", "pending", "resolved", "closed"];
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"];
export const DEFAULT_SLA_HOURS = 24;

export class MailTicketService {
  createTicket(tenantId: string, input: any) {
    if (!input || !input.subject) throw new Error("Ticket subject is required");
    const slaHours = Math.max(1, Number(input.slaHours) || DEFAULT_SLA_HOURS);
    const ticket = DataStore.mem().insert("mail_tickets", {
      tenantId,
      subject: input.subject,
      from: input.from || null,
      messageId: input.messageId || null,
      mailboxId: input.mailboxId || null,
      status: "open",
      priority: input.priority && TICKET_PRIORITIES.includes(input.priority) ? input.priority : "medium",
      assignee: input.assignee || null,
      tags: input.tags || [],
      slaHours,
      slaDeadline: new Date(Date.now() + slaHours * 3600000).toISOString(),
      notes: [],
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    });
    this.logEvent(tenantId, ticket._id, "created", { priority: ticket.priority });
    return { ticketId: ticket._id, ...ticket, summary: `Ticket "${input.subject}" created (${ticket.priority})` };
  }

  private logEvent(tenantId: string, ticketId: string, action: string, detail: any = {}) {
    DataStore.mem().insert("mail_ticket_events", { tenantId, ticketId, action, detail, at: new Date().toISOString() });
  }

  private all(tenantId: string) {
    return DataStore.mem().find("mail_tickets", (t: any) => t.tenantId === tenantId)
      .sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  listTickets(tenantId: string, filters: any = {}) {
    const list = this.all(tenantId).filter((t: any) => {
      if (filters.status && t.status !== filters.status) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.assignee && t.assignee !== filters.assignee) return false;
      if (filters.tag && !(t.tags || []).includes(filters.tag)) return false;
      if (filters.search) {
        const q = String(filters.search).toLowerCase();
        if (!String(t.subject).toLowerCase().includes(q) && !String(t.from || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
    return { tickets: list.map((t: any) => this.toPublic(t)), total: list.length, open: list.filter((t: any) => t.status === "open").length };
  }

  private toPublic(t: any) {
    return { ticketId: t._id, ...t };
  }

  getTicket(tenantId: string, ticketId: string) {
    const t = DataStore.mem().findOne("mail_tickets", (x: any) => x._id === ticketId && x.tenantId === tenantId);
    if (!t) throw new Error(`Ticket "${ticketId}" not found`);
    return this.toPublic(t);
  }

  updateTicket(tenantId: string, ticketId: string, patch: any) {
    const t = this.getTicket(tenantId, ticketId);
    const updated: any = DataStore.mem().update("mail_tickets", (x: any) => x._id === ticketId && x.tenantId === tenantId, {
      subject: patch.subject,
      priority: patch.priority && TICKET_PRIORITIES.includes(patch.priority) ? patch.priority : undefined,
      assignee: patch.assignee,
      status: patch.status && TICKET_STATUSES.includes(patch.status) ? patch.status : undefined,
      tags: patch.tags,
    });
    this.logEvent(tenantId, ticketId, "updated", { patch });
    return { ticketId, ...updated, summary: `Ticket "${updated.subject}" updated` };
  }

  assignTicket(tenantId: string, ticketId: string, assignee: string) {
    const t = this.getTicket(tenantId, ticketId);
    const updated: any = DataStore.mem().update("mail_tickets", (x: any) => x._id === ticketId && x.tenantId === tenantId, { assignee });
    this.logEvent(tenantId, ticketId, "assigned", { assignee });
    return { ticketId, assignee, summary: `Ticket "${updated.subject}" assigned to ${assignee}` };
  }

  setPriority(tenantId: string, ticketId: string, priority: string) {
    const t = this.getTicket(tenantId, ticketId);
    if (!TICKET_PRIORITIES.includes(priority)) throw new Error(`Priority must be one of ${TICKET_PRIORITIES.join("/")}`);
    const updated: any = DataStore.mem().update("mail_tickets", (x: any) => x._id === ticketId && x.tenantId === tenantId, { priority });
    this.logEvent(tenantId, ticketId, "priority", { priority });
    return { ticketId, priority, summary: `Ticket "${updated.subject}" priority set to ${priority}` };
  }

  tagTicket(tenantId: string, ticketId: string, tag: string) {
    const t = this.getTicket(tenantId, ticketId);
    if (!(t.tags || []).includes(tag)) {
      DataStore.mem().update("mail_tickets", (x: any) => x._id === ticketId && x.tenantId === tenantId, { tags: [...(t.tags || []), tag] });
    }
    return { ticketId, tags: [...(t.tags || []), tag], summary: `Tag "${tag}" added` };
  }

  untagTicket(tenantId: string, ticketId: string, tag: string) {
    const t = this.getTicket(tenantId, ticketId);
    const tags = (t.tags || []).filter((x: string) => x !== tag);
    DataStore.mem().update("mail_tickets", (x: any) => x._id === ticketId && x.tenantId === tenantId, { tags });
    return { ticketId, tags, summary: `Tag "${tag}" removed` };
  }

  addNote(tenantId: string, ticketId: string, note: string, author = "user_001") {
    const t = this.getTicket(tenantId, ticketId);
    if (!note || !String(note).trim()) throw new Error("Note is required");
    const notes = [...(t.notes || []), { author, body: String(note).trim(), at: new Date().toISOString() }];
    DataStore.mem().update("mail_tickets", (x: any) => x._id === ticketId && x.tenantId === tenantId, { notes });
    return { ticketId, notes, summary: `Note added to "${t.subject}"` };
  }

  resolveTicket(tenantId: string, ticketId: string) {
    const t = this.getTicket(tenantId, ticketId);
    DataStore.mem().update("mail_tickets", (x: any) => x._id === ticketId && x.tenantId === tenantId, { status: "resolved", resolvedAt: new Date().toISOString() });
    this.logEvent(tenantId, ticketId, "resolved");
    return { ticketId, status: "resolved", summary: `Ticket "${t.subject}" resolved` };
  }

  reopenTicket(tenantId: string, ticketId: string) {
    const t = this.getTicket(tenantId, ticketId);
    DataStore.mem().update("mail_tickets", (x: any) => x._id === ticketId && x.tenantId === tenantId, { status: "open", resolvedAt: null });
    this.logEvent(tenantId, ticketId, "reopened");
    return { ticketId, status: "open", summary: `Ticket "${t.subject}" reopened` };
  }

  escalateTicket(tenantId: string, ticketId: string) {
    const t = this.getTicket(tenantId, ticketId);
    const slaHours = Math.max(1, t.slaHours || DEFAULT_SLA_HOURS);
    DataStore.mem().update("mail_tickets", (x: any) => x._id === ticketId && x.tenantId === tenantId, {
      priority: "urgent",
      slaDeadline: new Date(Date.now() + Math.ceil(slaHours / 2) * 3600000).toISOString(),
    });
    this.logEvent(tenantId, ticketId, "escalated", { previousPriority: t.priority });
    return { ticketId, priority: "urgent", summary: `Ticket "${t.subject}" escalated to urgent with a fresh SLA` };
  }

  private slaStatus(t: any): string {
    if (t.status === "resolved" || t.status === "closed") return "done";
    const deadline = new Date(t.slaDeadline).getTime();
    const diff = deadline - Date.now();
    if (diff < 0) return "overdue";
    if (diff < 2 * 3600000) return "due_soon";
    return "healthy";
  }

  slaOverview(tenantId: string) {
    const tickets = this.all(tenantId);
    const active = tickets.filter((t: any) => t.status === "open" || t.status === "pending");
    const byStatus: Record<string, number> = { overdue: 0, due_soon: 0, healthy: 0, done: 0 };
    for (const t of tickets) byStatus[this.slaStatus(t)] = (byStatus[this.slaStatus(t)] || 0) + 1;
    return {
      active,
      byStatus,
      overdue: byStatus.overdue,
      dueSoon: byStatus.due_soon,
      healthy: byStatus.healthy,
      summary: `${active.length} active ticket(s), ${byStatus.overdue} overdue`,
    };
  }

  ticketDashboard(tenantId: string) {
    const tickets = this.all(tenantId);
    const byStatus: Record<string, number> = { open: 0, pending: 0, resolved: 0, closed: 0 };
    const byPriority: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    const byAssignee: Record<string, number> = {};
    for (const t of tickets) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      if (t.assignee) byAssignee[t.assignee] = (byAssignee[t.assignee] || 0) + 1;
    }
    const sla = this.slaOverview(tenantId);
    const resolved = tickets.filter((t: any) => t.status === "resolved" || t.status === "closed");
    const avgResolutionHours = resolved.length > 0
      ? Math.round((resolved.reduce((s: number, t: any) => s + (t.slaHours || DEFAULT_SLA_HOURS), 0) / resolved.length) * 10) / 10
      : hashStr(tenantId + "|avg") % 24;
    return {
      total: tickets.length,
      byStatus,
      byPriority,
      byAssignee,
      sla,
      avgResolutionHours,
      open: byStatus.open,
      urgent: byPriority.urgent,
      summary: `${byStatus.open} open · ${sla.overdue} overdue · ${byStatus.resolved} resolved`,
    };
  }

  ticketLog(tenantId: string, limit = 25) {
    const log = DataStore.mem().find("mail_ticket_events", (e: any) => e.tenantId === tenantId)
      .sort((a: any, b: any) => (a.at < b.at ? 1 : -1));
    return { entries: log.slice(0, limit).map((e: any) => ({ eventId: e._id, ...e })), total: log.length };
  }

  ticketEvents(tenantId: string, ticketId: string) {
    const t = this.getTicket(tenantId, ticketId);
    const events = DataStore.mem().find("mail_ticket_events", (e: any) => e.tenantId === tenantId && e.ticketId === ticketId)
      .sort((a: any, b: any) => (a.at < b.at ? 1 : -1));
    return { ticketId: t.ticketId, events, total: events.length };
  }
}

export const mailTicket = new MailTicketService();
