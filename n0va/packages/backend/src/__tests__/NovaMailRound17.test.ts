import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailAutomationService } from "../services/MailAutomationService";
import { MailDeliverabilityService, BOUNCE_CLASSES, SUPPRESSION_REASONS } from "../services/MailDeliverabilityService";
import { MailSequenceService, SEQUENCE_STATUSES } from "../services/MailSequenceService";
import { MailUnsubscribeService, PREFERENCE_CATEGORIES, UNSUBSCRIBE_REASONS } from "../services/MailUnsubscribeService";
import { MailTicketService, TICKET_STATUSES, TICKET_PRIORITIES, DEFAULT_SLA_HOURS } from "../services/MailTicketService";
import { MailBackupService, BACKUP_RETENTION_DAYS } from "../services/MailBackupService";
import { MailApiKeyService, API_KEY_SCOPES } from "../services/MailApiKeyService";

const automation = new MailAutomationService();
const deliverability = new MailDeliverabilityService();
const sequence = new MailSequenceService();
const unsub = new MailUnsubscribeService();
const tickets = new MailTicketService();
const backup = new MailBackupService();
const apiKey = new MailApiKeyService();

const T = "nova-mail17";
const MB17 = "mb_r17_main";
const MSG17 = "msg_r17_invoice";
const CONTACT17 = "ct_r17_dead";

function h(s: string): string {
  return String(Math.abs(s.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)));
}

beforeAll(() => {
  DataStore.mem().insert("mailboxes", {
    _id: MB17, tenantId: T, name: "Sequence Mailbox", type: "work", email: "seq@t17.io", plan: "business",
    quotaBytes: 10 * 1024 * 1024 * 1024, usedBytes: 0, status: "active",
  });
  DataStore.mem().insert("messages", {
    _id: MSG17, tenantId: T, mailboxId: MB17, threadId: "thr_r17_auto", messageId: "<inv@t17.mail>",
    from: { name: "Finance", email: "finance@n0va.mail" }, to: [{ name: "Me", email: "seq@t17.io" }],
    subject: "Invoice attached", body: "Please review the attached invoice before Friday.",
    preview: "Please review", folder: "inbox", labels: [], read: false, starred: false,
    attachments: [], receivedAt: new Date(Date.now() - 3600000).toISOString(), sentAt: null,
    importance: "normal", flags: [], ai: { category: "invoice" },
  });
  DataStore.mem().insert("mail_contacts", {
    _id: CONTACT17, tenantId: T, name: "Dead Address", email: "dead@t17.io", address: "dead@t17.io",
    group: "prospects", createdAt: new Date().toISOString(),
  });
});

describe("mail automation studio", () => {
  it("validates name, steps and actions", () => {
    expect(() => automation.createAutomation(T, {})).toThrow("Automation name is required");
    expect(() => automation.createAutomation(T, { name: "Bad" })).toThrow("Automation needs at least one step");
    expect(() => automation.createAutomation(T, { name: "Bad", steps: [{ actions: [] }] }))
      .toThrow("Step 1 needs at least one action");
  });

  it("creates an automation with steps and lists it", () => {
    const r = automation.createAutomation(T, {
      name: "Invoice handler",
      trigger: "on_receive",
      steps: [
        { name: "Label VIP", delayHours: 0, actions: [{ action: "label", target: "VIP" }] },
        { name: "Auto-read invoices", delayHours: 0, condition: { field: "subject", operator: "contains", value: "invoice" }, actions: [{ action: "mark_read" }] },
      ],
    });
    expect(r.automationId).toBeTruthy();
    expect(r.summary).toContain("2 step(s)");
    const all = automation.listAutomations(T);
    expect(all.length).toBe(1);
    expect(all[0].enabled).toBe(true);
    expect(all[0].trigger).toBe("on_receive");
  });

  it("runs an automation against a message and mutates it", () => {
    const auto = automation.listAutomations(T)[0];
    const r = automation.runAutomation(T, auto._id, MSG17);
    expect(r.matched).toBe(true);
    expect(r.actionsApplied).toContain('label "VIP"');
    expect(r.actionsApplied).toContain("marked read");
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === MSG17 && m.tenantId === T);
    expect(msg.labels).toContain("VIP");
    expect(msg.read).toBe(true);
    const refreshed = automation.getAutomation(T, auto._id);
    expect(refreshed.runCount).toBe(1);
    expect(refreshed.matchCount).toBe(1);
  });

  it("tests an automation without persisting changes", () => {
    const auto = automation.listAutomations(T)[0];
    const no = automation.testAutomation(T, auto._id, { subject: "Hello world" });
    expect(no.matchedSteps).toBe(1);
    expect(no.stepResults[1].wouldRun).toBe(false);
    const yes = automation.testAutomation(T, auto._id, { subject: "Invoice #12" });
    expect(yes.matchedSteps).toBe(2);
    expect(yes.stepResults[1].actionsToRun).toContain("mark_read");
  });

  it("schedules delayed steps and executes them when due", () => {
    const r = automation.createAutomation(T, {
      name: "Delayed star",
      steps: [{ name: "Star later", delayHours: 72, actions: [{ action: "star" }] }],
    });
    const run = automation.runAutomation(T, r.automationId, MSG17);
    expect(run.scheduledSteps).toBe(1);
    expect(run.actionsApplied).toHaveLength(0);
    DataStore.mem().insert("mail_automation_runs", {
      tenantId: T, automationId: r.automationId, automationName: "Delayed star",
      stepId: "st_due", stepName: "Star later", messageId: MSG17, status: "scheduled",
      runAt: new Date(Date.now() - 1000).toISOString(), actions: [{ action: "star" }],
    });
    const due = automation.dueRuns(T);
    expect(due.executed).toBe(1);
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === MSG17 && m.tenantId === T);
    expect(msg.starred).toBe(true);
    const none = automation.dueRuns(T);
    expect(none.executed).toBe(0);
    expect(none.summary).toBe("No scheduled steps due");
  });

  it("exposes dashboard, log and toggles", () => {
    const d = automation.automationDashboard(T);
    expect(d.total).toBe(2);
    expect(d.enabled).toBe(2);
    expect(d.totalRuns).toBeGreaterThanOrEqual(2);
    expect(d.scheduledPending).toBe(1);
    expect(d.byTrigger.on_receive).toBe(2);
    expect(d.recentLog.length).toBeGreaterThan(0);
    const log = automation.automationLog(T);
    expect(log.count).toBeGreaterThan(0);
    expect(log.entries[0].status).toBeTruthy();
    const auto = automation.listAutomations(T)[0];
    const toggled = automation.toggleAutomation(T, auto._id);
    expect(toggled.enabled).toBe(false);
    expect(toggled.summary).toContain("paused");
    const deleted = automation.deleteAutomation(T, auto._id);
    expect(deleted.deleted).toBe(true);
    expect(automation.listAutomations(T).length).toBe(1);
  });
});

describe("deliverability center", () => {
  it("records bounces and auto-suppresses hard ones", () => {
    const hard = deliverability.recordBounce(T, { email: "dead@t17.io", type: "hard", reason: "550 user unknown" });
    expect(hard.suppressed).toBe(true);
    expect(hard.summary).toContain("Hard bounce");
    const soft = deliverability.recordBounce(T, { email: "soft@t17.io", type: "soft", reason: "mailbox full" });
    expect(soft.suppressed).toBe(false);
    const complaint = deliverability.recordComplaint(T, { email: "angry@t17.io" });
    expect(complaint.suppressed).toBe(true);
    expect(complaint.bounceId).toBeTruthy();
    expect(() => deliverability.recordBounce(T, { email: "x@t17.io", type: "weird" })).toThrow("Bounce type must be one of");
    expect(() => deliverability.recordBounce(T, {})).toThrow("Email is required");
  });

  it("computes bounce stats and supports type filtering", () => {
    const stats = deliverability.bounceStats(T);
    expect(stats.total).toBe(3);
    expect(stats.byType).toEqual({ hard: 1, soft: 1, complaint: 1 });
    expect(stats.hardRate).toBe(66.7);
    const hard = deliverability.listBounces(T, "hard");
    expect(hard.total).toBe(1);
    expect(hard.bounces[0].bounceId).toBeTruthy();
    expect(deliverability.listBounces(T).total).toBe(3);
  });

  it("manages the suppression list", () => {
    const list = deliverability.suppressionList(T);
    expect(list.total).toBe(2);
    expect(list.entries.every((s: any) => !s.removed)).toBe(true);
    const hardOnly = deliverability.suppressionList(T, "hard_bounce");
    expect(hardOnly.total).toBe(1);
    const again = deliverability.suppressEmail(T, "dead@t17.io", "manual");
    expect(again.suppressed).toBe(false);
    expect(again.reason).toBe("already_suppressed");
    expect(() => deliverability.suppressEmail(T, "y@t17.io", "bogus")).toThrow("Suppression reason must be one of");
    expect(() => deliverability.suppressEmail(T, "")).toThrow("Email is required");
    const status = deliverability.suppressionStatus(T, "angry@t17.io");
    expect(status.suppressed).toBe(true);
    expect(status.reason).toBe("complaint");
    expect(deliverability.suppressionStatus(T, "clean@t17.io").suppressed).toBe(false);
  });

  it("flags contacts for list hygiene", () => {
    const hyg = deliverability.listHygiene(T);
    expect(hyg.total).toBe(1);
    expect(hyg.suggested[0].email).toBe("dead@t17.io");
    expect(hyg.suggested[0].reason).toBe("bounce_or_complaint");
  });

  it("frees addresses from the suppression list", () => {
    const freed = deliverability.unsuppressEmail(T, "dead@t17.io");
    expect(freed.unsuppressed).toBe(true);
    expect(() => deliverability.unsuppressEmail(T, "dead@t17.io")).toThrow("is not suppressed");
    expect(deliverability.listHygiene(T).total).toBe(0);
  });

  it("reports sending reputation deterministically", () => {
    const base = 85 + (parseInt(h(T + "|rep"), 10) % 11);
    const rep = deliverability.sendingReputation(T);
    expect(rep.score).toBe(Math.max(5, Math.min(100, base - 5 - 10)));
    expect(rep.hardBounces).toBe(1);
    expect(rep.complaints).toBe(1);
    expect(rep.level).toBe(rep.score >= 70 ? "good" : rep.score >= 40 ? "fair" : "poor");
  });

  it("builds the deliverability dashboard with alerts", () => {
    const d = deliverability.deliverabilityDashboard(T);
    expect(d.bounces.total).toBe(3);
    expect(d.suppression.total).toBe(1);
    expect(d.reputation.score).toBeGreaterThan(0);
    expect(d.alerts.some((a: any) => a.severity === "high" && a.message.includes("complaint"))).toBe(true);
    expect(d.alerts.some((a: any) => a.severity === "medium" && a.message.includes("hard bounce"))).toBe(true);
    expect(d.summary).toContain("Reputation");
    expect(d.generatedAt).toBeTruthy();
  });
});

describe("nurture sequences", () => {
  let seqId = "";

  it("creates a sequence with normalized steps", () => {
    expect(() => sequence.createSequence(T, {})).toThrow("Sequence name is required");
    expect(() => sequence.createSequence(T, { name: "Bad" })).toThrow("Sequence needs at least one step");
    const r = sequence.createSequence(T, {
      name: "Onboarding",
      description: "Welcome + follow-up",
      steps: [
        { name: "Welcome", subject: "Welcome aboard", body: "Hi!", delayHours: 0 },
        { name: "Follow up", subject: "How is it going?", body: "Checking in.", delayHours: 0 },
      ],
    });
    seqId = r.sequenceId;
    expect(r.status).toBe("draft");
    expect(r.steps).toHaveLength(2);
    const toggled = sequence.toggleSequence(T, seqId);
    expect(toggled.status).toBe("active");
    const listed = sequence.listSequences(T);
    expect(listed.length).toBe(1);
  });

  it("enrolls contacts (single + bulk) with dedupe", () => {
    const first = sequence.enrollContact(T, seqId, "one@t17.io");
    expect(first.enrolled).toBe(true);
    const dup = sequence.enrollContact(T, seqId, "ONE@T17.IO");
    expect(dup.enrolled).toBe(false);
    expect(dup.reason).toBe("already_enrolled");
    const many = sequence.enrollMany(T, seqId, ["two@t17.io", "three@t17.io", "one@t17.io"]);
    expect(many.enrolled).toBe(2);
    expect(many.requested).toBe(3);
    expect(() => sequence.enrollMany(T, seqId, [])).toThrow("At least one email is required");
  });

  it("advances due enrollments, sending through the mailbox", () => {
    const r1 = sequence.advanceSequence(T);
    expect(r1.sent).toBe(3);
    expect(r1.events).toHaveLength(3);
    const r2 = sequence.advanceSequence(T);
    expect(r2.sent).toBe(3);
    const r3 = sequence.advanceSequence(T);
    expect(r3.sent).toBe(0);
    expect(r3.summary).toBe("No sequence messages due");
    const sent = DataStore.mem().find("messages", (m: any) => m.tenantId === T && m.folder === "sent");
    expect(sent.length).toBe(6);
    expect(sent.every((m: any) => m.to && m.to[0].email === m.to[0].email)).toBe(true);
  });

  it("pauses, resumes and unenrolls contacts", () => {
    const en = sequence.enrollContact(T, seqId, "four@t17.io");
    expect(en.enrolled).toBe(true);
    const paused = sequence.pauseEnrollment(T, en.enrollmentId);
    expect(paused.status).toBe("paused");
    expect(sequence.advanceSequence(T).sent).toBe(0);
    const resumed = sequence.resumeEnrollment(T, en.enrollmentId);
    expect(resumed.status).toBe("active");
    const gone = sequence.unenrollContact(T, en.enrollmentId, "unsubscribed");
    expect(gone.summary).toContain("unsubscribed");
    expect(() => sequence.pauseEnrollment(T, "nope")).toThrow("Enrollment \"nope\" not found");
  });

  it("reports per-sequence progress", () => {
    const prog = sequence.sequenceProgress(T, seqId);
    expect(prog.total).toBe(4);
    expect(prog.byStatus.completed).toBe(3);
    expect(prog.byStatus.unsubscribed).toBe(1);
    expect(prog.byStatus.paused).toBeUndefined();
    expect(prog.completionRate).toBe(75);
    expect(prog.steps).toHaveLength(2);
    expect(prog.steps[1].reached).toBe(3);
  });

  it("aggregates the sequences dashboard and deletes with cascade", () => {
    const d = sequence.sequencesDashboard(T);
    expect(d.sequences).toBe(1);
    expect(d.byStatus.active).toBe(1);
    expect(d.sentCount).toBe(6);
    expect(d.totalEnrollments).toBe(4);
    expect(d.completionRate).toBe(75);
    expect(d.topSequences[0].name).toBe("Onboarding");
    expect(d.summary).toContain("6 sent");
    const del = sequence.deleteSequence(T, seqId);
    expect(del.deleted).toBe(true);
    expect(DataStore.mem().find("mail_sequence_enrollments", (e: any) => e.tenantId === T).length).toBe(0);
    expect(() => sequence.getSequence(T, seqId)).toThrow("not found");
  });
});

describe("unsubscribe center", () => {
  it("generates unsubscribe links", () => {
    const l = unsub.generateUnsubscribeLink(T, "user@t17.io");
    expect(l.token).toMatch(/^uns_/);
    expect(l.link).toContain(`/unsubscribe/${l.token}`);
    const cat = unsub.generateUnsubscribeLink(T, "opt@t17.io", "newsletter");
    expect(cat.link).toContain("?cat=newsletter");
    expect(() => unsub.generateUnsubscribeLink(T, "x@t17.io", "bogus")).toThrow("Category must be one of");
    expect(() => unsub.generateUnsubscribeLink(T, "")).toThrow("Email is required");
  });

  it("unsubscribes once and logs it once", () => {
    const r = unsub.unsubscribe(T, { email: "user@t17.io", reason: "not_relevant", source: "campaign" });
    expect(r.unsubscribed).toBe(true);
    const again = unsub.unsubscribe(T, { email: "user@t17.io", reason: "other" });
    expect(again.summary).toContain("already unsubscribed");
    const log = unsub.unsubscribeLog(T);
    expect(log.total).toBe(1);
    expect(log.entries[0].reason).toBe("not_relevant");
    expect(log.entries[0].source).toBe("campaign");
    expect(() => unsub.unsubscribe(T, {})).toThrow("Email or token is required");
  });

  it("supports category-level opt-outs without full unsubscribe", () => {
    const r = unsub.unsubscribe(T, { email: "opt@t17.io", category: "newsletter", source: "link" });
    expect(r.unsubscribed).toBe(true);
    const status = unsub.unsubscribeStatus(T, "opt@t17.io");
    expect(status.disabledCategories).toContain("newsletter");
    const prefs = unsub.getPreferences(T, "opt@t17.io");
    expect(prefs.categories.newsletter).toBe(false);
    expect(prefs.categories.promotions).toBe(true);
  });

  it("updates preferences for any email", () => {
    expect(() => unsub.updatePreferences(T, "", {})).toThrow("Email is required");
    const r = unsub.updatePreferences(T, "marketing@t17.io", { categories: { promotions: false, events: false } });
    expect(r.categories.promotions).toBe(false);
    expect(r.categories.newsletter).toBe(true);
    const p = unsub.getPreferences(T, "marketing@t17.io");
    expect(p.unsubscribed).toBe(false);
    expect(p.categories.events).toBe(false);
    const st = unsub.unsubscribeStatus(T, "fresh@t17.io");
    expect(st.unsubscribed).toBe(false);
    expect(st.disabledCategories).toHaveLength(0);
    expect(st.summary).toContain("subscribed");
  });

  it("links preferences into the suppression status", () => {
    const st = deliverability.suppressionStatus(T, "user@t17.io");
    expect(st.suppressed).toBe(true);
    expect(st.reason).toBe("unsubscribe");
  });

  it("builds the unsubscribe dashboard", () => {
    const d = unsub.unsubscribeDashboard(T);
    expect(d.total).toBe(2);
    expect(d.byReason.not_relevant).toBe(1);
    expect(d.bySource.campaign).toBe(1);
    expect(d.bySource.link).toBe(1);
    expect(d.unsubscribed).toBe(2);
    expect(d.subscribed).toBe(2);
    expect(d.recent.length).toBe(2);
    expect(d.summary).toContain("1 marked not relevant");
  });
});

describe("team ticketing", () => {
  let t1 = "";
  let t2 = "";

  it("creates tickets with SLA deadlines", () => {
    expect(() => tickets.createTicket(T, {})).toThrow("Ticket subject is required");
    const r = tickets.createTicket(T, { subject: "Refund request", priority: "high", slaHours: 8, from: "cust@t17.io" });
    t1 = r.ticketId;
    expect(r.status).toBe("open");
    expect(r.priority).toBe("high");
    expect(r.slaHours).toBe(8);
    expect(new Date(r.slaDeadline).getTime()).toBeGreaterThan(Date.now());
    expect(r.summary).toContain("(high)");
    const t = tickets.createTicket(T, { subject: "Feature idea", tags: ["ideas"] });
    t2 = t.ticketId;
    expect(t.tags).toContain("ideas");
  });

  it("lists with filters", () => {
    const all = tickets.listTickets(T);
    expect(all.total).toBe(2);
    expect(all.open).toBe(2);
    expect(tickets.listTickets(T, { status: "open" }).total).toBe(2);
    expect(tickets.listTickets(T, { priority: "high" }).total).toBe(1);
    expect(tickets.listTickets(T, { search: "refund" }).total).toBe(1);
    expect(tickets.listTickets(T, { search: "CUST@t17.io" }).total).toBe(1);
    expect(tickets.listTickets(T, { tag: "ideas" }).total).toBe(1);
  });

  it("assigns, prioritizes, tags and notes", () => {
    expect(() => tickets.setPriority(T, t1, "critical")).toThrow("Priority must be one of low/medium/high/urgent");
    const assigned = tickets.assignTicket(T, t1, "ana@n0va.io");
    expect(assigned.assignee).toBe("ana@n0va.io");
    const pr = tickets.setPriority(T, t1, "urgent");
    expect(pr.priority).toBe("urgent");
    const tagged = tickets.tagTicket(T, t1, "billing");
    expect(tagged.tags).toContain("billing");
    const untagged = tickets.untagTicket(T, t1, "billing");
    expect(untagged.tags).not.toContain("billing");
    expect(() => tickets.addNote(T, t1, "  ")).toThrow("Note is required");
    const noted = tickets.addNote(T, t1, "Waiting on bank details", "ana@n0va.io");
    expect(noted.notes).toHaveLength(1);
    expect(noted.notes[0].author).toBe("ana@n0va.io");
  });

  it("resolves, reopens and escalates", () => {
    const resolved = tickets.resolveTicket(T, t2);
    expect(resolved.status).toBe("resolved");
    const t2row = tickets.getTicket(T, t2);
    expect(t2row.resolvedAt).toBeTruthy();
    const reopened = tickets.reopenTicket(T, t2);
    expect(reopened.status).toBe("open");
    expect(tickets.getTicket(T, t2).resolvedAt).toBe(null);
    const escalated = tickets.escalateTicket(T, t2);
    expect(escalated.priority).toBe("urgent");
    expect(escalated.summary).toContain("fresh SLA");
    const sla = tickets.slaOverview(T);
    expect(sla.overdue).toBe(0);
    expect(sla.active).toHaveLength(2);
    expect(sla.byStatus.done).toBe(0);
  });

  it("summarizes SLA health and dashboard", () => {
    const dash = tickets.ticketDashboard(T);
    expect(dash.total).toBe(2);
    expect(dash.open).toBe(2);
    expect(dash.byPriority.urgent).toBe(2);
    expect(dash.byAssignee["ana@n0va.io"]).toBe(1);
    expect(dash.sla.healthy).toBe(2);
    expect(dash.avgResolutionHours).toBeGreaterThanOrEqual(0);
    expect(dash.summary).toContain("2 open");
  });

  it("logs events per ticket and globally", () => {
    const events = tickets.ticketEvents(T, t1);
    expect(events.total).toBe(3);
    expect(events.events[0].action).toBeTruthy();
    const log = tickets.ticketLog(T);
    expect(log.total).toBeGreaterThanOrEqual(6);
    expect(log.entries.some((e: any) => e.action === "resolved")).toBe(true);
  });
});

describe("backup & restore", () => {
  it("creates a snapshot backup", () => {
    const r = backup.createBackup(T, "Pre-launch");
    expect(r.backupId).toBeTruthy();
    expect(r.status).toBe("completed");
    expect(r.snapshot.mailboxes).toBe(1);
    expect(r.snapshot.messages).toBeGreaterThanOrEqual(7);
    expect(r.sizeBytes).toBeGreaterThan(0);
    expect(r.summary).toContain("message(s)");
    const list = backup.listBackups(T);
    expect(list.total).toBe(1);
    expect(list.backups[0].backupId).toBeTruthy();
    const one = backup.getBackup(T, r.backupId);
    expect(one.snapshot.contacts).toBe(1);
  });

  it("restores a backup and logs it", () => {
    const list = backup.listBackups(T);
    const r = backup.restoreBackup(T, list.backups[0].backupId);
    expect(r.restored).toBe(true);
    expect(r.snapshot.messages).toBeGreaterThan(0);
    const row = backup.getBackup(T, list.backups[0].backupId);
    expect(row.restoredAt).toBeTruthy();
    const dash = backup.backupsDashboard(T);
    expect(dash.recentRestores.length).toBe(1);
    expect(dash.recentRestores[0].action).toBe("restore");
  });

  it("manages the backup schedule", () => {
    const def = backup.backupSchedule(T);
    expect(def.autoBackup).toBe(false);
    expect(def.intervalHours).toBe(24);
    expect(def.retentionDays).toBe(BACKUP_RETENTION_DAYS);
    const set = backup.setBackupSchedule(T, { autoBackup: true, intervalHours: 6, retentionDays: 14 });
    expect(set.autoBackup).toBe(true);
    expect(set.intervalHours).toBe(6);
    expect(set.summary).toContain("every 6h");
    const read = backup.backupSchedule(T);
    expect(read.retentionDays).toBe(14);
  });

  it("caps retention at 10 backups", () => {
    for (let i = 0; i < 11; i++) backup.createBackup(T, `Bulk ${i}`);
    const list = backup.listBackups(T);
    expect(list.total).toBe(10);
    const dash = backup.backupsDashboard(T);
    expect(dash.total).toBe(10);
    expect(dash.lastBackup.label).toMatch(/^Bulk 10$/);
    expect(dash.totalBytes).toBeGreaterThan(0);
    const del = backup.deleteBackup(T, list.backups[0].backupId);
    expect(del.deleted).toBe(true);
    expect(backup.listBackups(T).total).toBe(9);
  });
});

describe("mail API keys", () => {
  let key = "";
  let keyId = "";

  it("creates keys with scopes and returns the plaintext once", () => {
    expect(() => apiKey.createApiKey(T, {})).toThrow("Key label is required");
    const r = apiKey.createApiKey(T, { label: "CI key", scopes: ["send", "read", "bogus"] });
    key = r.key;
    keyId = r.apiKeyId;
    expect(key.startsWith("n0va_mk_")).toBe(true);
    expect(key.length).toBe(40);
    expect(r.scopes).toEqual(["send", "read"]);
    const withDefault = apiKey.createApiKey(T, { label: "Default scope" });
    expect(withDefault.scopes).toEqual(["send"]);
    expect(() => apiKey.createApiKey(T, { label: "Nope", scopes: ["admin", "root"] }))
      .toThrow("Scopes must include at least one of send/read/webhook/campaigns");
  });

  it("never exposes the plaintext key after creation", () => {
    const list = apiKey.listApiKeys(T);
    expect(list.total).toBe(2);
    expect((list.keys[0] as any).key).toBeUndefined();
    const ci = list.keys.find((k: any) => k.label === "CI key") as any;
    expect(ci.last4).toBe(key.slice(-4));
    expect(ci.prefix).toBe(key.slice(0, 10));
    const one = apiKey.getApiKey(T, keyId);
    expect((one as any).key).toBeUndefined();
    expect(one.status).toBe("active");
  });

  it("verifies keys by hash", () => {
    const ok = apiKey.verifyApiKey(T, key);
    expect(ok.valid).toBe(true);
    expect(ok.apiKeyId).toBe(keyId);
    expect(ok.scopes).toContain("send");
    const bad = apiKey.verifyApiKey(T, "n0va_mk_wrongkey");
    expect(bad.valid).toBe(false);
    expect(bad.reason).toBe("invalid");
    expect(() => apiKey.verifyApiKey(T, "")).toThrow("API key is required");
  });

  it("records usage and reports per-key stats", () => {
    apiKey.recordUsage(T, keyId, "send_mail");
    apiKey.recordUsage(T, keyId, "send_mail");
    const usage = apiKey.apiKeyUsage(T, keyId);
    expect(usage.callsToday).toBe(2);
    expect(usage.callsTotal).toBe(2);
    expect(usage.byAction.send_mail).toBe(2);
    expect(usage.recent).toHaveLength(2);
    expect(usage.label).toBe("CI key");
  });

  it("revokes keys and invalidates verification", () => {
    const rev = apiKey.revokeApiKey(T, keyId);
    expect(rev.status).toBe("revoked");
    const check = apiKey.verifyApiKey(T, key);
    expect(check.valid).toBe(false);
    expect(check.reason).toBe("revoked");
    expect(apiKey.getApiKey(T, keyId).status).toBe("revoked");
  });

  it("summarizes the API key dashboard", () => {
    const d = apiKey.apiKeyDashboard(T);
    expect(d.keys).toBe(2);
    expect(d.active).toBe(1);
    expect(d.callsToday).toBe(2);
    expect(d.callsTotal).toBe(2);
    expect(d.byAction.send_mail).toBe(2);
    expect(d.lastUsed).toBeTruthy();
    expect(d.summary).toContain("2 call(s) today");
  });
});
