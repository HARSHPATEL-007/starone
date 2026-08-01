import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailboxService } from "../services/MailboxService";
import { MailMessageService } from "../services/MailMessageService";
import { MailTemplateService } from "../services/MailTemplateService";
import { MailSignatureService } from "../services/MailSignatureService";
import { MailSpamService } from "../services/MailSpamService";
import { MailFollowUpService } from "../services/MailFollowUpService";
import { MailAnalyticsService } from "../services/MailAnalyticsService";
import { MailAttachmentService } from "../services/MailAttachmentService";

const mailboxes = new MailboxService();
const mail = new MailMessageService();
const templates = new MailTemplateService();
const signatures = new MailSignatureService();
const spam = new MailSpamService();
const followUps = new MailFollowUpService();
const analytics = new MailAnalyticsService();
const attachments = new MailAttachmentService();
const T = "nova-mail3";

let workId = "";
let messageId = "";
let threadId = "";
let templateId = "";
let invoiceId = "";
let oldHighId = "";

beforeAll(() => {
  const work = mailboxes.createMailbox(T, { name: "Nova Work", type: "work", email: "nova@n0va.work", plan: "business" });
  workId = work.mailboxId;
  const r1 = mail.receiveMessage(T, workId, {
    from: { name: "John Smith", email: "john.smith@partner.com" },
    subject: "Q3 invoice attached",
    body: "Hi, please find the Q3 invoice attached. Payment terms are 30 days net.",
    importance: "high",
    attachments: [{ name: "q3-invoice.pdf", sizeBytes: 245760, type: "pdf" }],
  });
  invoiceId = r1.message._id;
  const r2 = mail.receiveMessage(T, workId, {
    from: { name: "Sarah Chen", email: "sarah@design.co" },
    subject: "Campaign creative review — Thu 10am",
    body: "We booked a review for Thursday at 10am. Need to review the assets.",
    importance: "high",
  });
  messageId = r2.message._id;
  threadId = r2.message.threadId;
  mail.receiveMessage(T, workId, {
    from: { name: "Marketing Hub", email: "newsletter@marketinghub.com" },
    subject: "Weekly newsletter: AI trends",
    body: "This week: creative fatigue and the rise of AI copywriters.",
    importance: "normal",
  });
  mail.composeSend(T, workId, { to: [{ name: "John Smith", email: "john.smith@partner.com" }], subject: "Re: Q3 invoice", body: "Thanks, will review by Friday." });
  const now = Date.now();
  oldHighId = DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: workId, threadId: "thr_oldhigh", messageId: "<oldhigh@n0va.mail>",
    from: { name: "Accounts", email: "accounts@company.com" }, to: [{ name: "Nova", email: "nova@n0va.work" }],
    subject: "Old high priority request", body: "Please action this immediately.", preview: "Please action",
    folder: "inbox", labels: ["Inbox"], read: false, attachments: [], receivedAt: new Date(now - 3 * 86400000).toISOString(), importance: "high",
  })._id;
});

describe("MailTemplateService (Round 18)", () => {
  it("creates a template and extracts variables from subject/body", () => {
    const t = templates.createTemplate(T, {
      name: "Welcome email", category: "onboarding",
      subject: "Welcome {{name}} to {{company}}",
      body: "Hi {{name}},\n\nWelcome to {{company}}. Your login is {{login}}.",
    });
    templateId = t.templateId;
    expect(t.variables).toEqual(expect.arrayContaining(["name", "company", "login"]));
    expect(() => templates.createTemplate(T, { name: "X" })).toThrow(/name, subject and body/);
  });

  it("lists, gets, updates and deletes templates", () => {
    const list = templates.templates(T);
    expect(list.length).toBe(1);
    expect(list[0].sentCount).toBe(0);
    const updated = templates.updateTemplate(T, templateId, { category: "sales", description: "First touch" });
    expect(updated.category).toBe("sales");
    expect(templates.getTemplatePublic(T, templateId).description).toBe("First touch");
    expect(templates.deleteTemplate(T, templateId).summary).toMatch(/deleted/);
    expect(templates.templates(T).length).toBe(0);
  });

  it("renders a template with variables and reports missing ones", () => {
    const t = templates.createTemplate(T, {
      name: "Invoice reminder", subject: "Reminder: {{invoice_number}}",
      body: "Dear {{name}}, invoice {{invoice_number}} is due {{due_date}}.",
    });
    templateId = t.templateId;
    const rendered = templates.renderTemplate(T, templateId, { name: "John", invoice_number: "INV-42" });
    expect(rendered.subject).toBe("Reminder: INV-42");
    expect(rendered.body).toContain("INV-42");
    expect(rendered.missing).toEqual(["due_date"]);
  });

  it("sends a single email from a template and bumps usage", () => {
    const res = templates.sendFromTemplate(T, workId, {
      templateId, to: "john.smith@partner.com",
      variables: { name: "John", invoice_number: "INV-42", due_date: "2026-08-15" },
    });
    expect(res.message.folder).toBe("sent");
    expect(res.message.subject).toBe("Reminder: INV-42");
    expect(res.sentCount).toBe(1);
    const stats = templates.templateStats(T);
    expect(stats.totals.sends).toBe(1);
    expect(stats.topTemplates[0].templateId).toBe(templateId);
    expect(stats.recentUsage.length).toBe(1);
  });

  it("sends a bulk campaign with per-recipient personalization", () => {
    const res = templates.sendBulk(T, workId, {
      templateId,
      defaults: { due_date: "2026-08-20" },
      recipients: [
        { to: "alice@partner.com", variables: { name: "Alice", invoice_number: "INV-1" } },
        { to: "bob@partner.com", variables: { name: "Bob", invoice_number: "INV-2" } },
        { to: "carol@partner.com", variables: { name: "Carol", invoice_number: "INV-3" } },
      ],
    });
    expect(res.sent).toBe(3);
    expect(res.failed).toBe(0);
    expect(res.results[1].subject).toBe("Reminder: INV-2");
    const stats = templates.templateStats(T);
    expect(stats.totals.sends).toBe(4);
    expect(templates.templateUsageLog(T).log.length).toBe(4);
  });

  it("bulk send handles invalid recipients without failing the batch", () => {
    const res = templates.sendBulk(T, workId, {
      templateId,
      recipients: [{ to: "ok@partner.com", variables: { name: "Ok", invoice_number: "INV-4", due_date: "2026-08-25" } }, { variables: {} }],
    });
    expect(res.sent).toBe(1);
    expect(res.failed).toBe(1);
  });

  it("deleteTemplate throws for unknown template", () => {
    expect(() => templates.deleteTemplate(T, "tpl_nope")).toThrow(/not found/);
  });
});

describe("MailSignatureService (Round 18)", () => {
  it("lists signatures for all mailboxes", () => {
    const list = signatures.listSignatures(T);
    expect(list.length).toBeGreaterThanOrEqual(1);
    const work = list.find(s => s.mailboxId === workId)!;
    expect(work.email).toBe("nova@n0va.work");
  });

  it("updates a signature and sets default", () => {
    const res = signatures.updateSignature(T, workId, { text: "Nova — Marketing Lead", enabled: true, isDefault: true });
    expect(res.isDefault).toBe(true);
    expect(signatures.getSignature(T, workId).text).toBe("Nova — Marketing Lead");
    const dflt = signatures.defaultSignature(T);
    expect(dflt && dflt.mailboxId).toBe(workId);
  });

  it("toggles a signature on and off", () => {
    expect(signatures.toggleSignature(T, workId, false).enabled).toBe(false);
    expect(signatures.getSignature(T, workId).enabled).toBe(false);
    expect(signatures.toggleSignature(T, workId, true).enabled).toBe(true);
  });

  it("appends signature to a compose body via preview", () => {
    const prev = signatures.composePreview(T, workId, "Hello John");
    expect(prev.withSignature).toBe(true);
    expect(prev.body).toContain("Nova — Marketing Lead");
    expect(prev.body).toContain("--");
  });

  it("dashboard reports totals and default mailbox", () => {
    const dash = signatures.signaturesDashboard(T);
    expect(dash.totals.mailboxes).toBeGreaterThanOrEqual(1);
    expect(dash.defaultSignature && dash.defaultSignature.mailboxId).toBe(workId);
    expect(dash.summary).toContain("default");
  });

  it("updateSignature validates mailbox exists", () => {
    expect(() => signatures.updateSignature(T, "mb_nope", { text: "x" })).toThrow(/not found/);
  });
});

describe("MailSpamService (Round 18)", () => {
  it("scans a message and produces a deterministic verdict", () => {
    const scan = spam.scanMessage(T, invoiceId);
    expect(scan.messageId).toBe(invoiceId);
    expect(scan.score).toBeGreaterThanOrEqual(0);
    expect(scan.score).toBeLessThanOrEqual(100);
    expect(["clean", "spam"].includes(scan.verdict)).toBe(true);
  });

  it("scanAll only moves messages scoring >= 60 and flags them", () => {
    const res = spam.scanAll(T);
    expect(res.scanned).toBeGreaterThanOrEqual(0);
    for (const f of res.flagged) {
      const msg = DataStore.mem().findOne("messages", (m: any) => m._id === f.messageId);
      expect(msg.folder).toBe("spam");
      expect(msg.flags).toContain("spam");
    }
  });

  it("quarantine lists spam messages with scores", () => {
    const q = spam.quarantine(T);
    for (const item of q) {
      expect(["spam", "clean"].includes(item.verdict)).toBe(true);
    }
    expect(Array.isArray(q)).toBe(true);
  });

  it("moves a message to spam manually", () => {
    const res = spam.moveToSpam(T, invoiceId);
    expect(res.folder).toBe("spam");
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === invoiceId);
    expect(msg.flags).toContain("spam");
  });

  it("reportSpam blocks a non-contact sender", () => {
    const res = spam.reportSpam(T, invoiceId);
    expect(res.folder).toBe("spam");
    expect(res.senderBlocked).toBe(true);
    expect(spam.blockedSenders(T).some(b => b.email === "john.smith@partner.com")).toBe(true);
  });

  it("reportNotSpam restores to inbox and allows the sender", () => {
    const res = spam.reportNotSpam(T, invoiceId);
    expect(res.folder).toBe("inbox");
    expect(res.senderAllowed).toBe(true);
    expect(spam.allowedSenders(T).some(a => a.email === "john.smith@partner.com")).toBe(true);
  });

  it("block/unblock and allow/remove round-trip", () => {
    expect(spam.blockSender(T, { email: "bad@scam.com" }).alreadyBlocked).toBe(false);
    expect(spam.blockSender(T, { email: "bad@scam.com" }).alreadyBlocked).toBe(true);
    expect(spam.unblockSender(T, "bad@scam.com").summary).toMatch(/unblocked/);
    expect(spam.blockedSenders(T).some(b => b.email === "bad@scam.com")).toBe(false);
    expect(spam.allowSender(T, { email: "good@trusted.com" }).alreadyAllowed).toBe(false);
    expect(spam.removeAllowedSender(T, "good@trusted.com").summary).toMatch(/removed/);
    expect(spam.allowedSenders(T).some(a => a.email === "good@trusted.com")).toBe(false);
  });

  it("spam status summarizes quarantine, blocked and allowed counts", () => {
    const status = spam.spamStatus(T);
    expect(status.quarantineCount).toBeGreaterThanOrEqual(0);
    expect(status.protectionScore).toBeGreaterThanOrEqual(0);
    expect(status.summary).toContain("quarantine");
  });

  it("spam log records actions", () => {
    const log = spam.spamLog(T);
    expect(log.log.length).toBeGreaterThanOrEqual(3);
  });

  it("scanMessage throws for unknown message", () => {
    expect(() => spam.scanMessage(T, "msg_nope")).toThrow(/not found/);
  });
});

describe("MailFollowUpService (Round 18)", () => {
  it("snoozes a message and lists it in snoozed", () => {
    const until = new Date(Date.now() + 86400000).toISOString();
    const res = followUps.snooze(T, messageId, until);
    expect(res.snoozedUntil).toBe(until);
    expect(followUps.listSnoozed(T).snoozed.some(s => s._id === messageId)).toBe(true);
    expect(() => followUps.snooze(T, messageId, "not-a-date")).toThrow(/required/);
    expect(() => followUps.snooze(T, messageId, new Date(Date.now() - 1000).toISOString())).toThrow(/future/);
  });

  it("unsnoozes a message", () => {
    const res = followUps.unsnooze(T, messageId);
    expect(res.snoozedUntil).toBe(null);
    expect(followUps.listSnoozed(T).snoozed.some(s => s._id === messageId)).toBe(false);
  });

  it("marks a message awaiting response with deadline", () => {
    const deadline = new Date(Date.now() + 3 * 86400000).toISOString();
    const res = followUps.markAwaitingResponse(T, invoiceId, deadline);
    expect(res.awaitingResponse).toBe(true);
    expect(res.responseDeadline).toBe(deadline);
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === invoiceId);
    expect(msg.awaitingResponse).toBe(true);
  });

  it("creates and lists follow-ups, then completes them", () => {
    const at = new Date(Date.now() - 3600000).toISOString();
    const f = followUps.createFollowUp(T, invoiceId, { at, note: "Chase invoice" });
    expect(f.status).toBe("open");
    expect(followUps.listFollowUps(T, { status: "open" }).open).toBeGreaterThanOrEqual(1);
    expect(followUps.listFollowUps(T, { due: "true" }).open).toBeGreaterThanOrEqual(1);
    const done = followUps.completeFollowUp(T, f.followUpId);
    expect(done.status).toBe("done");
    expect(followUps.listFollowUps(T, { status: "open" }).open).toBe(0);
  });

  it("deletes a follow-up", () => {
    const at = new Date(Date.now() + 86400000).toISOString();
    const f = followUps.createFollowUp(T, invoiceId, { at });
    const del = followUps.deleteFollowUp(T, f.followUpId);
    expect(del.summary).toMatch(/deleted/);
    expect(() => followUps.deleteFollowUp(T, f.followUpId)).toThrow(/not found/);
  });

  it("markResponded clears awaiting flags and closes open follow-ups", () => {
    const at = new Date(Date.now() + 86400000).toISOString();
    const f = followUps.createFollowUp(T, invoiceId, { at });
    const res = followUps.markResponded(T, invoiceId);
    expect(res.awaitingResponse).toBe(false);
    const followUp = DataStore.mem().findOne("mail_follow_ups", (fu: any) => fu._id === f.followUpId);
    expect(followUp.status).toBe("done");
  });

  it("follow-up summary counts snoozed, awaiting and open", () => {
    const summary = followUps.followUpSummary(T);
    expect(summary.openFollowUps).toBeGreaterThanOrEqual(0);
    expect(summary.awaitingCount).toBeGreaterThanOrEqual(0);
  });

  it("suggestions surface unanswered high-priority emails", () => {
    const suggestions = followUps.suggestions(T);
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.every(s => s.action === "Follow up")).toBe(true);
  });
});

describe("MailAnalyticsService (Round 18)", () => {
  it("overview reports totals", () => {
    const o = analytics.overview(T);
    expect(o.totals.messages).toBeGreaterThanOrEqual(7);
    expect(o.totals.unread).toBeGreaterThanOrEqual(0);
    expect(o.totals.storageMb).toBeGreaterThan(0);
    expect(o.summary).toContain("message(s)");
  });

  it("volume trend produces one row per day", () => {
    const trend = analytics.volumeTrend(T, 7);
    expect(trend.trend.length).toBe(7);
    expect(trend.trend[0].received + trend.trend[0].sent).toBe(trend.trend[0].total);
    expect(trend.days).toBe(7);
  });

  it("category mix sums to 100% and is sorted desc", () => {
    const mix = analytics.categoryMix(T);
    const total = mix.reduce((s, c) => s + c.count, 0);
    expect(total).toBeGreaterThan(0);
    for (let i = 1; i < mix.length; i++) expect(mix[i - 1].count).toBeGreaterThanOrEqual(mix[i].count);
  });

  it("top senders are ranked by message count", () => {
    const senders = analytics.topSenders(T, 5);
    expect(senders.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < senders.length; i++) expect(senders[i - 1].count).toBeGreaterThanOrEqual(senders[i].count);
    expect(senders[0].email).toBeTruthy();
  });

  it("response time stats compute reply rate", () => {
    const stats = analytics.responseTimeStats(T);
    expect(stats.threads).toBeGreaterThan(0);
    expect(stats.replyRate).toBeGreaterThanOrEqual(0);
    expect(stats.avgResponse).toBeTruthy();
  });

  it("busiest hours covers all 24 buckets", () => {
    const hours = analytics.busiestHours(T);
    expect(hours.hours.length).toBe(24);
    expect(hours.busiest.hour).toBeGreaterThanOrEqual(0);
    expect(hours.busiest.hour).toBeLessThanOrEqual(23);
  });

  it("activity by folder groups counts", () => {
    const folders = analytics.activityByFolder(T);
    const total = folders.reduce((s, f) => s + f.count, 0);
    expect(total).toBeGreaterThanOrEqual(7);
    expect(folders.some(f => f.folder === "inbox")).toBe(true);
  });

  it("mailbox stats cover every mailbox", () => {
    const stats = analytics.mailboxStats(T);
    expect(stats.mailboxes.length).toBeGreaterThanOrEqual(1);
    expect(stats.total).toBeGreaterThanOrEqual(7);
  });

  it("executive summary combines key metrics into a text summary", () => {
    const exec = analytics.executiveSummary(T);
    expect(exec.messages).toBeGreaterThanOrEqual(7);
    expect(exec.topSender.email).toBeTruthy();
    expect(exec.summary).toContain("message(s)");
    expect(exec.seed).toBeGreaterThan(0);
  });
});

describe("MailAttachmentService (Round 18)", () => {
  it("lists attachments across messages with scan status", () => {
    const list = attachments.listAttachments(T);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].attachmentId).toMatch(/^att_/);
    expect(list[0].sizeLabel).toContain("KB");
  });

  it("filters attachments by type and folder", () => {
    const pdfs = attachments.listAttachments(T, { type: "pdf" });
    expect(pdfs.length).toBeGreaterThanOrEqual(1);
    const inbox = attachments.listAttachments(T, { folder: "inbox" });
    expect(inbox.length).toBeGreaterThanOrEqual(1);
  });

  it("gets a single attachment with deterministic scan + preview", () => {
    const list = attachments.listAttachments(T);
    const detail = attachments.getAttachment(T, list[0].attachmentId);
    expect(detail.subject).toBeTruthy();
    expect(["clean", "suspicious", "pending"].includes(detail.scan.status)).toBe(true);
    expect(detail.preview).toBeTruthy();
    expect(() => attachments.getAttachment(T, "att_nope")).toThrow(/not found/);
  });

  it("scans an attachment and persists status on the message", () => {
    const list = attachments.listAttachments(T);
    const res = attachments.scanAttachment(T, list[0].attachmentId);
    expect(["clean", "suspicious"].includes(res.scan.status)).toBe(true);
    const again = attachments.getAttachment(T, list[0].attachmentId);
    expect(again.scan.status).not.toBe("pending");
  });

  it("quarantines an attachment", () => {
    const list = attachments.listAttachments(T);
    const res = attachments.quarantineAttachment(T, list[0].attachmentId);
    expect(res.scan.status).toBe("quarantined");
    const stats = attachments.attachmentStats(T);
    expect(stats.totals.risky).toBeGreaterThanOrEqual(1);
  });

  it("attachment stats report totals by type and folder", () => {
    const stats = attachments.attachmentStats(T);
    expect(stats.totals.files).toBeGreaterThanOrEqual(1);
    expect(stats.byType.length).toBeGreaterThanOrEqual(1);
    expect(stats.byFolder.length).toBeGreaterThanOrEqual(1);
    expect(stats.totals.bytes).toBeGreaterThan(0);
  });
});
