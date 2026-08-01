import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailboxService } from "../services/MailboxService";
import { MailMessageService } from "../services/MailMessageService";
import { MailContactService } from "../services/MailContactService";
import { MailAgentService } from "../services/MailAgentService";
import { MailComplianceService } from "../services/MailComplianceService";
import { MailVoiceService } from "../services/MailVoiceService";

const mailboxes = new MailboxService();
const mail = new MailMessageService();
const contacts = new MailContactService();
const agent = new MailAgentService();
const compliance = new MailComplianceService();
const voice = new MailVoiceService();
const T = "nova-mail2";

let workId = "";
let messageId = "";
let threadId = "";
let oldInboxId = "";
let oldSentId = "";

beforeAll(() => {
  const work = mailboxes.createMailbox(T, { name: "Alex Work", type: "work", email: "alex@n0va.work", plan: "business" });
  workId = work.mailboxId;
  const r1 = mail.receiveMessage(T, workId, {
    from: { name: "John Smith", email: "john.smith@partner.com" },
    subject: "Q3 invoice attached",
    body: "Hi Alex, please find the Q3 invoice attached. Need to review the payment terms by Friday.",
    importance: "high",
    attachments: [{ name: "q3-invoice.pdf", sizeBytes: 245760, type: "pdf" }],
  });
  messageId = r1.message._id;
  threadId = r1.message.threadId;
  mail.receiveMessage(T, workId, {
    from: { name: "Marketing Hub", email: "newsletter@marketinghub.com" },
    subject: "Weekly newsletter: AI trends",
    body: "This week: creative fatigue and AI copywriters.",
    importance: "normal",
  });
  mail.receiveMessage(T, workId, {
    from: { name: "Sarah Chen", email: "sarah@design.co" },
    subject: "Campaign creative review",
    body: "Please review the Q3 assets before Thursday.",
    importance: "high",
  });
  const now = Date.now();
  oldInboxId = DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: workId, threadId: "thr_oldlegal", messageId: "<oldlegal@n0va.mail>",
    from: { name: "Old Counsel", email: "counsel@lawfirm.com" }, to: [{ name: "Alex", email: "alex@n0va.work" }],
    subject: "Legal hold matter", body: "Please preserve all records related to the dispute.", preview: "Preserve all records",
    folder: "inbox", labels: ["Inbox"], read: true, attachments: [], receivedAt: new Date(now - 10 * 86400000).toISOString(), importance: "high",
  })._id;
  oldSentId = DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: workId, threadId: "thr_oldquote", messageId: "<oldquote@n0va.mail>",
    from: { name: "Alex", email: "alex@n0va.work" }, to: [{ name: "Vendor", email: "vendor@supply.co" }],
    subject: "Old quote", body: "Outdated quote from last quarter.", preview: "Outdated quote",
    folder: "sent", labels: ["Sent"], read: true, attachments: [], receivedAt: new Date(now - 30 * 86400000).toISOString(), importance: "normal",
  })._id;
  DataStore.mem().insert("mail_contacts", { tenantId: T, name: "John Smith", email: "john.smith@partner.com", tags: ["partner"], company: "Partner Co" });
  DataStore.mem().insert("mail_contacts", { tenantId: T, name: "Marketing Hub", email: "newsletter@marketinghub.com", tags: ["newsletter"] });
});

describe("MailContactService (Round 17)", () => {
  it("creates a contact with validation and duplicate detection", () => {
    const c = contacts.createContact(T, { name: "Jordan Lee", email: "jordan@design.co", tags: ["vendor"], company: "Design Co" });
    expect(c.contactId).toMatch(/^mem_/);
    expect(c.tags).toEqual(["vendor"]);
    expect(() => contacts.createContact(T, { name: "X" })).toThrow(/name and email/);
    expect(() => contacts.createContact(T, { name: "Dup", email: "john.smith@partner.com" })).toThrow(/already exists/);
  });

  it("lists contacts with message stats and last contact", () => {
    const list = contacts.listContacts(T);
    expect(list.length).toBeGreaterThanOrEqual(3);
    const john = list.find(c => c.email === "john.smith@partner.com")!;
    expect(john.messageCount).toBeGreaterThan(0);
    expect(john.lastContact).toBeTruthy();
  });

  it("filters contacts by query and group", () => {
    expect(contacts.listContacts(T, { query: "john" }).length).toBeGreaterThanOrEqual(1);
    expect(contacts.listContacts(T, { group: "newsletter" }).length).toBe(1);
  });

  it("gets, updates and deletes a contact", () => {
    const c = contacts.getContact(T, contacts.listContacts(T).find(x => x.email === "jordan@design.co")!.contactId);
    const upd = contacts.updateContact(T, c.contactId, { notes: "VIP", tags: ["vendor", "vip"] });
    expect(upd.notes).toBe("VIP");
    expect(upd.tags).toContain("vip");
    const del = contacts.deleteContact(T, c.contactId);
    expect(del.summary).toContain("deleted");
    expect(() => contacts.getContact(T, c.contactId)).toThrow(/not found/);
  });

  it("derives contact groups from tags", () => {
    const groups = contacts.contactGroups(T);
    const partner = groups.find(g => g.name === "partner");
    expect(partner && partner.count).toBeGreaterThanOrEqual(1);
  });

  it("computes most contacted people from message flow", () => {
    const top = contacts.mostContacted(T, 3);
    expect(top.length).toBeGreaterThanOrEqual(1);
    expect(top[0].count).toBeGreaterThan(0);
    const john = top.find(t => t.email === "john.smith@partner.com");
    expect(john).toBeTruthy();
  });

  it("builds a contact profile with threads and sentiment", () => {
    const list = contacts.listContacts(T);
    const john = list.find(c => c.email === "john.smith@partner.com")!;
    const profile = contacts.contactProfile(T, john.contactId);
    expect(profile.messageCount).toBeGreaterThan(0);
    expect(profile.threadCount).toBeGreaterThanOrEqual(1);
    expect(profile.relationship).toMatch(/key_account|frequent|regular/);
    expect(profile.sentiment.length).toBeGreaterThan(0);
  });

  it("returns a contacts dashboard with totals", () => {
    const dash = contacts.contactsDashboard(T);
    expect(dash.totals.contacts).toBeGreaterThanOrEqual(2);
    expect(dash.groups.length).toBeGreaterThan(0);
    expect(dash.mostContacted.length).toBeGreaterThan(0);
    expect(dash.summary).toMatch(/contacts in your address book/);
  });
});

describe("MailAgentService — N0VA1O (Round 17)", () => {
  it("enables and disables out of office", () => {
    const on = agent.setOutOfOffice(T, workId, { enabled: true, message: "Away until Monday" });
    expect(on.enabled).toBe(true);
    expect(on.message).toBe("Away until Monday");
    const off = agent.setOutOfOffice(T, workId, { enabled: false });
    expect(off.enabled).toBe(false);
    expect(() => agent.setOutOfOffice(T, workId, {})).toThrow(/enabled is required/);
  });

  it("reports out of office status (off / configured / active)", () => {
    agent.setOutOfOffice(T, workId, { enabled: true, endDate: new Date(Date.now() + 86400000).toISOString() });
    const active = agent.outOfOfficeStatus(T, workId);
    expect(active.enabled).toBe(true);
    expect(active.active).toBe(true);
    agent.setOutOfOffice(T, workId, { enabled: true, endDate: new Date(Date.now() - 86400000).toISOString() });
    expect(agent.outOfOfficeStatus(T, workId).active).toBe(false);
    agent.setOutOfOffice(T, workId, { enabled: false });
    expect(agent.outOfOfficeStatus(T, workId).active).toBe(false);
  });

  it("schedules emails with validation", () => {
    const s = agent.scheduleSend(T, workId, { to: "accounts@company.com", subject: "Q3 payment", body: "Please process.", sendAt: "2026-08-02T09:00:00Z" });
    expect(s.scheduleId).toMatch(/^mem_/);
    expect(s.status).toBe("scheduled");
    expect(() => agent.scheduleSend(T, workId, { to: "x@y.com", subject: "X", sendAt: "not-a-date" })).toThrow(/valid date/);
    expect(() => agent.scheduleSend(T, workId, { to: "x@y.com" })).toThrow(/required/);
  });

  it("lists and cancels scheduled emails", () => {
    const s = agent.scheduleSend(T, workId, { to: "a@b.co", subject: "Later note", sendAt: "2026-09-01T10:00:00Z" });
    const list = agent.listScheduled(T);
    expect(list.pending).toBeGreaterThanOrEqual(2);
    const cancelled = agent.cancelSchedule(T, s.scheduleId);
    expect(cancelled.status).toBe("cancelled");
  });

  it("extracts tasks from AI action items and body scan", () => {
    const tasks = agent.extractTasks(T, messageId);
    expect(tasks.extracted).toBeGreaterThanOrEqual(1);
    const open = agent.listTasks(T);
    expect(open.totals.open).toBeGreaterThanOrEqual(1);
    expect(open.tasks.some(t => t.title.toLowerCase().includes("review"))).toBe(true);
    const dup = agent.extractTasks(T, messageId);
    expect(dup.extracted).toBe(0);
  });

  it("completes open tasks", () => {
    const open = agent.listTasks(T).tasks.find(t => t.status === "open")!;
    const done = agent.completeTask(T, open._id);
    expect(done.status).toBe("done");
    expect(agent.listTasks(T).totals.done).toBeGreaterThanOrEqual(1);
  });

  it("runs an agent cycle: OOO auto-replies to unread inbox mail", () => {
    agent.setOutOfOffice(T, workId, { enabled: true });
    mail.receiveMessage(T, workId, {
      from: { name: "Casey", email: "casey@client.com" },
      subject: "Urgent question",
      body: "Can you confirm the delivery date?",
    });
    const cycle = agent.runAgentCycle(T);
    expect(cycle.autoReplies).toBeGreaterThanOrEqual(1);
    const msg = DataStore.mem().findOne("messages", (m: any) => m.tenantId === T && m.subject === "Urgent question");
    expect((msg.flags || []).includes("ooo_replied")).toBe(true);
    const log = agent.agentLog(T);
    expect(log.log.some(l => l.action === "ooo_auto_reply")).toBe(true);
    const after = agent.runAgentCycle(T);
    expect(after.autoReplies).toBe(0);
  });

  it("runs an agent cycle: fires due scheduled emails", () => {
    const s = agent.scheduleSend(T, workId, { to: "accounts@company.com", subject: "Due now", body: "Sent by agent.", sendAt: new Date(Date.now() - 60000).toISOString() });
    const cycle = agent.runAgentCycle(T);
    expect(cycle.schedulesSent).toBeGreaterThanOrEqual(1);
    const sent = DataStore.mem().findOne("messages", (m: any) => m.tenantId === T && m.subject === "Due now" && m.folder === "sent");
    expect(sent).toBeTruthy();
    expect(agent.listScheduled(T).schedules.find(x => x._id === s.scheduleId)!.status).toBe("sent");
  });

  it("exposes agent status with recent activity", () => {
    const status = agent.agentStatus(T);
    expect(status.activeOutOfOffice).toBeGreaterThanOrEqual(1);
    expect(status.recentActivity.length).toBeGreaterThan(0);
    expect(status.summary).toMatch(/out of office/);
  });
});

describe("MailComplianceService (Round 17)", () => {
  it("sets and upserts retention policies", () => {
    const p = compliance.setRetentionPolicy(T, { folder: "inbox", days: 7, action: "archive" });
    expect(p.folder).toBe("inbox");
    expect(p.days).toBe(7);
    const upd = compliance.setRetentionPolicy(T, { folder: "inbox", days: 30 });
    expect(upd.days).toBe(30);
    expect(() => compliance.setRetentionPolicy(T, { folder: "x" })).toThrow(/required/);
    expect(() => compliance.setRetentionPolicy(T, { folder: "x", days: 0 })).toThrow(/positive/);
  });

  it("lists and deletes retention policies", () => {
    const list = compliance.retentionPolicies(T);
    expect(list.totals.policies).toBeGreaterThanOrEqual(1);
    const policy = compliance.setRetentionPolicy(T, { folder: "spam", days: 2, action: "delete" });
    const del = compliance.deleteRetentionPolicy(T, policy.policyId);
    expect(del.summary).toContain("deleted");
  });

  it("applies retention: archives expired inbox mail", () => {
    compliance.setRetentionPolicy(T, { folder: "inbox", days: 5 });
    const result = compliance.applyRetention(T);
    expect(result.swept).toBeGreaterThanOrEqual(1);
    const old = DataStore.mem().findOne("messages", (m: any) => m._id === oldInboxId);
    expect(old.folder).toBe("archive");
  });

  it("applies retention: skips messages under legal hold", () => {
    compliance.placeHold(T, { subject: "old quote", reason: "Pending litigation" });
    const before = DataStore.mem().findOne("messages", (m: any) => m._id === oldSentId);
    compliance.setRetentionPolicy(T, { folder: "sent", days: 1, action: "delete" });
    const result = compliance.applyRetention(T);
    expect(result.skippedHeld).toBeGreaterThanOrEqual(1);
    const after = DataStore.mem().findOne("messages", (m: any) => m._id === oldSentId);
    expect(after.folder).toBe("sent");
    compliance.releaseHold(T, compliance.listHolds(T).holds[0].holdId);
  });

  it("applies retention: deletes expired mail without a hold", () => {
    const result = compliance.applyRetention(T);
    expect(result.deleted).toBeGreaterThanOrEqual(1);
    expect(DataStore.mem().findOne("messages", (m: any) => m._id === oldSentId)).toBeFalsy();
  });

  it("places, lists, releases holds and reports protected mail", () => {
    const hold = compliance.placeHold(T, { subject: "invoice", from: "john.smith", reason: "Audit in progress" });
    expect(hold.holdId).toMatch(/^mem_/);
    const status = compliance.holdStatus(T);
    expect(status.holds.length).toBeGreaterThanOrEqual(1);
    expect(status.protectedMessages).toBeGreaterThanOrEqual(1);
    const rel = compliance.releaseHold(T, hold.holdId);
    expect(rel.summary).toContain("released");
    expect(() => compliance.placeHold(T, { reason: "x" })).toThrow(/subject or from/);
  });

  it("keeps an audit log of compliance events", () => {
    const log = compliance.auditLog(T);
    expect(log.total).toBeGreaterThanOrEqual(4);
    const actions = log.log.map(l => l.action);
    expect(actions).toContain("retention_sweep");
    expect(actions).toContain("place_hold");
  });

  it("scans messages for PII with regex detection", () => {
    DataStore.mem().insert("messages", {
      tenantId: T, mailboxId: workId, threadId: "thr_pii1", messageId: "<pii1@n0va.mail>",
      from: { name: "Fraud Watch", email: "watch@bank.com" }, to: [{ name: "Alex", email: "alex@n0va.work" }],
      subject: "Card on file", body: "Your card 4111 1111 1111 1111 was used. Call (555) 123-4567 or report 123-45-6789.",
      folder: "inbox", labels: ["Inbox"], read: false, attachments: [], receivedAt: new Date().toISOString(), importance: "high",
    });
    const scan = compliance.scanForPii(T);
    expect(scan.totals.messagesWithPii).toBeGreaterThanOrEqual(1);
    const finding = scan.findings.find(f => f.subject === "Card on file")!;
    expect(finding.types).toContain("credit_card");
    expect(finding.types).toContain("phone");
    expect(finding.types).toContain("ssn");
    expect(["low", "medium", "high"]).toContain(scan.riskLevel);
  });

  it("produces a compliance summary with recommendations", () => {
    const summary = compliance.complianceSummary(T);
    expect(summary.policies.totals.policies).toBeGreaterThanOrEqual(1);
    expect(summary.auditEvents).toBeGreaterThanOrEqual(4);
    expect(summary.recommendations.length).toBeGreaterThan(0);
    expect(summary.summary).toMatch(/retention polic/);
  });
});

describe("MailVoiceService (Round 17)", () => {
  it("parses send and schedule email commands", () => {
    const send = voice.parseMailCommand(T, "send email to john.smith@partner.com about Q3 invoice");
    expect(send.intent).toBe("send_email");
    expect(send.params.to).toEqual(["john.smith@partner.com"]);
    expect(send.params.subject).toBe("Q3 invoice");
    const sched = voice.parseMailCommand(T, "schedule email to accounts@company.com at 2026-08-02T09:00:00Z");
    expect(sched.intent).toBe("schedule_email");
    expect(sched.params.sendAt).toBe("2026-08-02T09:00:00Z");
  });

  it("parses read, search, mark, star and count commands", () => {
    expect(voice.parseMailCommand(T, "read my unread emails").intent).toBe("read_unread");
    expect(voice.parseMailCommand(T, "search for invoice").intent).toBe("search_mail");
    expect(voice.parseMailCommand(T, "mark the last email read").intent).toBe("mark_read");
    expect(voice.parseMailCommand(T, "mark all email read").intent).toBe("mark_all_read");
    expect(voice.parseMailCommand(T, "star the last email").intent).toBe("toggle_star");
    expect(voice.parseMailCommand(T, "unread count").intent).toBe("unread_count");
  });

  it("parses out of office, summarize and rule commands", () => {
    expect(voice.parseMailCommand(T, "turn on out of office").intent).toBe("out_of_office");
    expect(voice.parseMailCommand(T, "turn off out of office").params.enabled).toBe(false);
    expect(voice.parseMailCommand(T, "summarize the latest thread").intent).toBe("summarize_thread");
    const rule = voice.parseMailCommand(T, "create rule from newsletters");
    expect(rule.intent).toBe("create_rule");
    expect(rule.params.template).toBe("newsletters");
  });

  it("resolves named recipients to contacts", () => {
    const parsed = voice.parseMailCommand(T, "send email to John Smith about the contract");
    expect(parsed.params.to).toEqual(["john.smith@partner.com"]);
  });

  it("executes send_email into the sent folder", () => {
    const r = voice.executeMailCommand(T, "send email to john.smith@partner.com about Q3 invoice");
    expect(r.intent).toBe("send_email");
    expect(r.executed).toBe(true);
    const msg = DataStore.mem().findOne("messages", (m: any) => m.tenantId === T && m.subject === "Q3 invoice" && m.folder === "sent");
    expect(msg).toBeTruthy();
    expect((msg.to || [])[0].email).toBe("john.smith@partner.com");
  });

  it("executes read_unread and unread_count", () => {
    const r = voice.executeMailCommand(T, "read my unread emails");
    expect(r.intent).toBe("read_unread");
    expect(r.result.unread).toBeGreaterThanOrEqual(1);
    const c = voice.executeMailCommand(T, "unread count");
    expect(c.result.unread).toBeGreaterThanOrEqual(1);
  });

  it("executes mark_read on the latest inbox email", () => {
    const r = voice.executeMailCommand(T, "mark the last email read");
    expect(r.intent).toBe("mark_read");
    expect(r.result.read).toBe(true);
  });

  it("executes search_mail", () => {
    const r = voice.executeMailCommand(T, "search for invoice");
    expect(r.intent).toBe("search_mail");
    expect(r.result.total).toBeGreaterThanOrEqual(1);
  });

  it("executes out_of_office toggle", () => {
    const r = voice.executeMailCommand(T, "turn on out of office");
    expect(r.intent).toBe("out_of_office");
    expect(r.result.enabled).toBe(true);
    const off = voice.executeMailCommand(T, "turn off out of office");
    expect(off.result.enabled).toBe(false);
  });

  it("executes create_rule from a template", () => {
    const r = voice.executeMailCommand(T, "create rule from invoices");
    expect(r.intent).toBe("create_rule");
    expect(r.result.templateId).toBe("invoices");
  });

  it("executes summarize_thread on the latest conversation", () => {
    const r = voice.executeMailCommand(T, "summarize the latest thread");
    expect(r.intent).toBe("summarize_thread");
    expect(r.result.messageCount).toBeGreaterThanOrEqual(1);
  });

  it("provides voice command help and rejects empty commands", () => {
    const help = voice.voiceCommandHelp();
    expect(help.commands.length).toBeGreaterThanOrEqual(10);
    expect(() => voice.parseMailCommand(T, "")).toThrow(/Command is required/);
  });
});
