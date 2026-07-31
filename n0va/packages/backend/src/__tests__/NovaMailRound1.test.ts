import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailboxService, MAILBOX_TYPES, PLAN_QUOTAS } from "../services/MailboxService";
import { MailMessageService } from "../services/MailMessageService";
import { MailRulesService } from "../services/MailRulesService";
import { MailSearchService } from "../services/MailSearchService";
import { MailAIService } from "../services/MailAIService";

const mailboxes = new MailboxService();
const mail = new MailMessageService();
const rules = new MailRulesService();
const search = new MailSearchService();
const ai = new MailAIService();
const T = "nova-mail";

let personalId = "";
let workId = "";
let sentId = "";
let threadId = "";
let ruleId = "";

beforeAll(() => {
  const mem = DataStore.mem();
  const personal = mailboxes.createMailbox(T, { name: "Alex Personal", type: "personal", email: "alex@n0va.mail", plan: "pro" });
  const work = mailboxes.createMailbox(T, { name: "Alex Work", type: "work", email: "alex@n0va.work", plan: "business" });
  personalId = personal.mailboxId;
  workId = work.mailboxId;
  const msg = mail.receiveMessage(T, workId, {
    from: { name: "Jordan Lee", email: "jordan@partner.com" },
    subject: "Q3 invoice attached",
    body: "Hi Alex, please find the Q3 invoice attached. Payment terms are 30 days net.",
    importance: "high",
    attachments: [{ name: "q3-invoice.pdf", sizeBytes: 245760, type: "pdf" }],
  });
  threadId = msg.message.threadId;
  mem.insert("messages", { tenantId: T, mailboxId: workId, threadId: "thr_reply_1", messageId: "<r1@n0va.mail>", from: { name: "Casey", email: "casey@design.co" }, to: [{ name: "Alex", email: "alex@n0va.work" }], subject: "Re: reply thread", body: "A reply thread message", preview: "A reply", folder: "inbox", labels: ["Inbox"], read: false, attachments: [], receivedAt: new Date(Date.now() - 3600000).toISOString(), importance: "normal" });
  mem.insert("messages", { tenantId: T, mailboxId: workId, threadId: "thr_reply_1", messageId: "<r2@n0va.mail>", from: { name: "Alex", email: "alex@n0va.work" }, to: [{ name: "Casey", email: "casey@design.co" }], subject: "Re: reply thread", body: "Second message in reply thread", preview: "Second", folder: "sent", labels: ["Sent"], read: true, attachments: [], receivedAt: new Date(Date.now() - 1800000).toISOString(), importance: "normal" });
  mem.insert("mail_contacts", { tenantId: T, name: "Jordan Lee", email: "jordan@partner.com", tags: ["partner"] });
});

describe("MailboxService", () => {
  it("creates a mailbox with a deterministic email and quota", () => {
    const r = mailboxes.createMailbox(T, { name: "Team Sync", type: "team", plan: "business" });
    expect(r.mailboxId).toMatch(/^mem_/);
    expect(r.type).toBe("team");
    expect(r.quotaBytes).toBe(PLAN_QUOTAS.business);
    expect(r.email).toContain("@n0va.mail");
    expect(r.summary).toContain("business plan");
  });

  it("supports all 8 mailbox types", () => {
    for (const type of MAILBOX_TYPES) {
      const r = mailboxes.createMailbox(T, { name: `MB ${type}`, type });
      expect(MAILBOX_TYPES).toContain(r.type);
    }
  });

  it("rejects invalid types, plans and missing names", () => {
    expect(() => mailboxes.createMailbox(T, {})).toThrow(/name is required/);
    expect(() => mailboxes.createMailbox(T, { name: "X", type: "hologram" })).toThrow(/Unknown mailbox type/);
    expect(() => mailboxes.createMailbox(T, { name: "X", plan: "gold" })).toThrow(/Unknown plan/);
  });

  it("lists mailboxes with computed usage and unread counts", () => {
    const list = mailboxes.listMailboxes(T);
    expect(list.length).toBeGreaterThanOrEqual(2);
    const work = list.find(m => m.mailboxId === workId)!;
    expect(work).toBeTruthy();
    expect(work.usedBytes).toBeGreaterThan(0);
    expect(work.percentUsed).toBeGreaterThan(0);
    expect(work.unreadCount).toBeGreaterThan(0);
  });

  it("gets and updates a mailbox", () => {
    const mb = mailboxes.getMailbox(T, workId);
    expect(mb.name).toBe("Alex Work");
    const upd = mailboxes.updateMailbox(T, workId, { signature: "— Alex", settings: { aiPriority: false } });
    expect(upd.signature).toBe("— Alex");
    expect(upd.settings.aiPriority).toBe(false);
    expect(() => mailboxes.getMailbox(T, "nope")).toThrow(/not found/);
  });

  it("reports quota per plan with status and alerts", () => {
    const q = mailboxes.mailboxQuota(T, workId);
    expect(q.plan).toBe("business");
    expect(q.quotaBytes).toBe(PLAN_QUOTAS.business);
    expect(q.breakdown.messageCount).toBeGreaterThan(0);
    expect(["ok", "warning", "critical"]).toContain(q.status);
    expect(q.alerts.length).toBeGreaterThan(0);
  });

  it("computes storage analytics across mailboxes", () => {
    const a = mailboxes.storageAnalytics(T);
    expect(a.mailboxes.length).toBeGreaterThanOrEqual(2);
    expect(a.totals.usedBytes).toBeGreaterThan(0);
    expect(a.totals.messages).toBeGreaterThan(0);
    expect(a.topSenders.length).toBeGreaterThan(0);
    expect(a.byCategory.length).toBeGreaterThan(0);
    expect(a.summary).toMatch(/mailboxes using/);
  });

  it("deletes a mailbox with its messages", () => {
    const extra = mailboxes.createMailbox(T, { name: "Doomed", type: "alias", plan: "free" });
    mail.receiveMessage(T, extra.mailboxId, { from: "x@y.com", subject: "temp", body: "bye" });
    const r = mailboxes.deleteMailbox(T, extra.mailboxId);
    expect(r.deletedMessages).toBe(1);
    expect(mailboxes.listMailboxes(T).find(m => m.mailboxId === extra.mailboxId)).toBeUndefined();
  });
});

describe("MailMessageService", () => {
  it("sends a message into the sent folder with thread id", () => {
    const r = mail.composeSend(T, workId, { to: "jordan@partner.com", subject: "Re: Q3 invoice", body: "Received, thanks!" });
    expect(r.message.folder).toBe("sent");
    expect(r.message.threadId).toMatch(/^thr_/);
    expect(r.message.from.email).toBe("alex@n0va.work");
    expect(r.summary).toContain("1 recipient");
    sentId = r.message._id;
  });

  it("validates send inputs", () => {
    expect(() => mail.composeSend(T, workId, { to: "a@b.com" })).toThrow(/Subject/);
    expect(() => mail.composeSend(T, workId, { subject: "X" })).toThrow(/Recipient/);
    expect(() => mail.composeSend(T, "nope", { to: "a@b.com", subject: "X" })).toThrow(/not found/);
  });

  it("saves and sends drafts", () => {
    const d = mail.saveDraft(T, workId, { to: "casey@design.co", subject: "Draft plan", body: "WIP" });
    expect(d.message.folder).toBe("drafts");
    const s = mail.sendDraft(T, d.message._id);
    expect(s.message.folder).toBe("sent");
    expect(s.message.sentAt).toBeTruthy();
    expect(() => mail.sendDraft(T, d.message._id)).toThrow(/Only drafts/);
  });

  it("receives mail into inbox, enriches via AI and runs rules", () => {
    const r = mail.receiveMessage(T, workId, {
      from: { name: "News Hub", email: "news@hub.com" },
      subject: "Weekly digest",
      body: "The weekly AI marketing digest is ready.",
    });
    expect(r.message.folder).toBe("inbox");
    expect(r.message.read).toBe(false);
    expect(r.message.ai).toBeTruthy();
    expect(r.message.ai.category).toBeTruthy();
    expect(r.message.ai.priority).toBeTruthy();
  });

  it("lists messages with folder filters and unread counts", () => {
    const all = mail.listMessages(T);
    expect(all.total).toBeGreaterThan(0);
    const inbox = mail.listMessages(T, { folder: "inbox" });
    expect(inbox.messages.every(m => m.folder === "inbox")).toBe(true);
    const unread = mail.listMessages(T, { unread: true });
    expect(unread.messages.every(m => !m.read)).toBe(true);
    const byMailbox = mail.listMessages(T, { mailboxId: personalId });
    expect(byMailbox.messages.length).toBe(0);
  });

  it("gets a message and throws for unknown ids", () => {
    const msg = mail.getMessage(T, sentId);
    expect(msg.subject).toBe("Re: Q3 invoice");
    expect(() => mail.getMessage(T, "ghost")).toThrow(/not found/);
  });

  it("builds threads from messages", () => {
    const t = mail.getThread(T, threadId);
    expect(t.messages.length).toBe(1);
    expect(t.subject).toContain("invoice");
    const t2 = mail.getThread(T, "thr_reply_1");
    expect(t2.messageCount).toBe(2);
    expect(t2.participants).toContain("Casey");
  });

  it("marks read/unread and stars", () => {
    const m = mail.markRead(T, sentId, false);
    expect(m.read).toBe(false);
    expect(mail.getMessage(T, sentId).read).toBe(false);
    mail.markRead(T, sentId, true);
    const s = mail.toggleStar(T, sentId);
    expect(s.starred).toBe(true);
    expect(mail.getMessage(T, sentId).starred).toBe(true);
  });

  it("moves, archives, trashes, restores and deletes", () => {
    const msg = mail.receiveMessage(T, workId, { from: "t@t.com", subject: "Move me", body: "x" }).message;
    mail.moveToFolder(T, msg._id, "archive");
    expect(mail.getMessage(T, msg._id).folder).toBe("archive");
    mail.archiveMessage(T, msg._id);
    expect(mail.getMessage(T, msg._id).folder).toBe("archive");
    mail.restoreMessage(T, msg._id);
    expect(mail.getMessage(T, msg._id).folder).toBe("inbox");
    mail.trashMessage(T, msg._id);
    expect(mail.getMessage(T, msg._id).folder).toBe("trash");
    expect(() => mail.moveToFolder(T, msg._id, "void")).toThrow(/Unknown folder/);
    const del = mail.deleteMessage(T, msg._id);
    expect(del.summary).toContain("permanent");
    expect(() => mail.getMessage(T, msg._id)).toThrow(/not found/);
  });

  it("applies and removes labels", () => {
    const msg = mail.receiveMessage(T, workId, { from: "l@l.com", subject: "Label me", body: "y" }).message;
    mail.applyLabel(T, msg._id, "VIP");
    expect(mail.getMessage(T, msg._id).labels).toContain("VIP");
    mail.removeLabel(T, msg._id, "VIP");
    expect(mail.getMessage(T, msg._id).labels).not.toContain("VIP");
    expect(() => mail.applyLabel(T, msg._id, "")).toThrow(/Label is required/);
  });

  it("lists folders with counts and manages custom folders", () => {
    const f = mail.listFolders(T);
    expect(f.map(x => x.name)).toEqual(expect.arrayContaining(["inbox", "sent", "drafts", "archive", "trash"]));
    const inbox = f.find(x => x.name === "inbox");
    expect(inbox!.total).toBeGreaterThan(0);
    const created = mail.createFolder(T, { name: "Projects" });
    expect(created.summary).toContain("created");
    expect(() => mail.createFolder(T, { name: "Projects" })).toThrow(/already exists/);
    expect(() => mail.createFolder(T, { name: "inbox" })).toThrow(/system folder/);
    const removed = mail.deleteFolder(T, created.folderId);
    expect(removed.summary).toContain("deleted");
  });

  it("summarizes unread state across folders", () => {
    const u = mail.unreadSummary(T);
    expect(u.folders.length).toBeGreaterThanOrEqual(6);
    expect(u.totals.totalMessages).toBeGreaterThan(0);
    expect(u.totals.drafts).toBe(0);
    expect(u.summary).toMatch(/unread across/);
  });
});

describe("MailRulesService", () => {
  it("creates a visual rule with validation", () => {
    const r = rules.createRule(T, {
      name: "Urgent clients",
      conditions: [{ field: "importance", operator: "is", value: "high" }],
      actions: [{ action: "star", target: "" }, { action: "notify", target: "" }],
    });
    ruleId = r.ruleId;
    expect(r.enabled).toBe(true);
    expect(r.kind).toBe("visual");
    expect(() => rules.createRule(T, { name: "No conds" })).toThrow(/condition/);
    expect(() => rules.createRule(T, { name: "No act", conditions: [{ field: "subject", operator: "contains", value: "x" }] })).toThrow(/action/);
  });

  it("lists, gets, toggles, updates and deletes rules", () => {
    const list = rules.listRules(T);
    expect(list.some(r => r._id === ruleId)).toBe(true);
    const toggled = rules.toggleRule(T, ruleId);
    expect(toggled.enabled).toBe(false);
    const reEnabled = rules.toggleRule(T, ruleId, true);
    expect(reEnabled.enabled).toBe(true);
    const upd = rules.updateRule(T, ruleId, { name: "Urgent clients v2" });
    expect(upd.name).toBe("Urgent clients v2");
    expect(() => rules.getRule(T, "ghost")).toThrow(/not found/);
    const temp = rules.createRule(T, { name: "Temp", conditions: [{ field: "subject", operator: "contains", value: "x" }], actions: [{ action: "star", target: "" }] });
    const del = rules.deleteRule(T, temp.ruleId);
    expect(del.summary).toContain("deleted");
  });

  it("provides 6 rule templates and instantiates them", () => {
    const tpls = rules.ruleTemplates();
    expect(tpls.length).toBe(6);
    const created = rules.instantiateTemplate(T, "newsletters");
    expect(created.templateId).toBe("newsletters");
    expect(created.actions.length).toBe(2);
    expect(() => rules.instantiateTemplate(T, "ghost")).toThrow(/Unknown rule template/);
  });

  it("evaluates a rule against a message and applies actions", () => {
    const msg = mail.receiveMessage(T, workId, {
      from: "boss@corp.com",
      subject: "URGENT — meeting at 10",
      body: "We need the numbers today.",
      importance: "high",
    }).message;
    const r = rules.evaluateRule(T, ruleId, msg._id);
    expect(r.matched).toBe(true);
    expect(r.applied.length).toBeGreaterThan(0);
    expect(mail.getMessage(T, msg._id).starred).toBe(true);
    const log = DataStore.mem().find("mail_rules_log", (l: any) => l.tenantId === T && l.ruleId === ruleId);
    expect(log.length).toBeGreaterThan(0);
  });

  it("evaluates all enabled rules and reports the summary", () => {
    const msg = mail.receiveMessage(T, workId, { from: "n@n.com", subject: "Invoice #42", body: "Invoice attached" }).message;
    const r = rules.evaluateAllRules(T, msg._id);
    expect(r.rulesChecked).toBeGreaterThan(0);
    expect(r.summary).toMatch(/rules matched/);
  });

  it("tests a rule without mutating", () => {
    const t = rules.testRule(T, ruleId, { subject: "URGENT", importance: "high", body: "x" });
    expect(t.wouldMatch).toBe(true);
    const miss = rules.testRule(T, ruleId, { subject: "coffee", importance: "normal", body: "x" });
    expect(miss.wouldMatch).toBe(false);
    expect(miss.failedConditions.length).toBeGreaterThan(0);
    expect(() => rules.testRule(T, ruleId, null)).toThrow(/Sample/);
  });

  it("runs App Script style rules with the small DSL", () => {
    const scriptRule = rules.createRule(T, {
      name: "Scripty",
      kind: "script",
      script: 'if subject contains "invoice" then label "Invoices"\nif subject contains "invoice" then forward "accounts@corp.com"\nif has_attachment then mark_read',
    });
    const msg = DataStore.mem().insert("messages", {
      tenantId: T, mailboxId: workId, threadId: "thr_script_1", messageId: "<inv77@n0va.mail>",
      from: { name: "Billing", email: "billing@vendor.com" }, to: [{ name: "Alex", email: "alex@n0va.work" }],
      subject: "Invoice #77", body: "Payment due.", preview: "Payment", folder: "inbox", labels: ["Inbox"],
      read: false, starred: false, attachments: [{ name: "inv.pdf", sizeBytes: 1000, type: "pdf" }],
      receivedAt: new Date().toISOString(), importance: "normal", flags: [],
    });
    const r = rules.runScriptRule(T, scriptRule.ruleId, msg._id);
    expect(r.matchedLines).toBe(3);
    expect(r.applied).toEqual(expect.arrayContaining(['label "Invoices"', "marked read"]));
    expect(mail.getMessage(T, msg._id).labels).toContain("Invoices");
    expect(mail.getMessage(T, msg._id).flags.some((f: string) => f.startsWith("forwarded:"))).toBe(true);
    expect(() => rules.runScriptRule(T, ruleId, msg._id)).toThrow(/not a script rule/);
  });

  it("produces a rules dashboard", () => {
    const d = rules.rulesDashboard(T);
    expect(d.totals.total).toBeGreaterThan(0);
    expect(d.totals.matches).toBeGreaterThan(0);
    expect(d.recentActivity.length).toBeGreaterThan(0);
    expect(d.summary).toMatch(/rules active/);
  });
});

describe("MailSearchService", () => {
  it("searches messages with scoring and filters", () => {
    const r = search.searchMessages(T, { query: "invoice" });
    expect(r.total).toBeGreaterThan(0);
    expect(r.messages[0].score).toBeGreaterThanOrEqual(8);
    const unread = search.searchMessages(T, { query: "invoice", unread: true });
    expect(unread.messages.every(m => !m.read)).toBe(true);
    const attachments = search.searchMessages(T, { hasAttachment: true });
    expect(attachments.total).toBeGreaterThan(0);
    expect(attachments.messages.every(m => m.attachments.length > 0)).toBe(true);
    const from = search.searchMessages(T, { from: "jordan" });
    expect(from.total).toBeGreaterThan(0);
  });

  it("parses semantic queries into intents", () => {
    const unread = search.semanticQuery(T, "show me unread emails");
    expect(unread.intent).toBe("unread_emails");
    expect(unread.messages.every(m => !m.read)).toBe(true);
    const from = search.semanticQuery(T, "emails from jordan@partner.com");
    expect(from.intent).toBe("from_sender");
    const urgent = search.semanticQuery(T, "high priority mail");
    expect(urgent.intent).toBe("high_priority");
    const attach = search.semanticQuery(T, "emails with attachments this week");
    expect(attach.intent).toBe("with_attachments");
    expect(() => search.semanticQuery(T, "   ")).toThrow(/query is required/);
  });

  it("suggests contacts and queries", () => {
    const s = search.searchSuggestions(T, "jor");
    expect(s.suggestions.length).toBeGreaterThan(0);
    expect(s.suggestions[0].type).toBe("contact");
    expect(s.suggestions[0].value).toContain("jordan");
    const all = search.searchSuggestions(T, "");
    expect(all.suggestions.length).toBeGreaterThan(0);
  });

  it("computes search stats", () => {
    const s = search.searchStats(T);
    expect(s.totalMessages).toBeGreaterThan(0);
    expect(s.byFolder.length).toBeGreaterThan(0);
    expect(s.topSenders.length).toBeGreaterThan(0);
    expect(s.unreadPercent).toBeGreaterThan(0);
  });
});

describe("MailAIService", () => {
  it("enriches a message with deterministic AI fields", () => {
    const msg = mail.receiveMessage(T, workId, {
      from: { name: "Boss", email: "boss@corp.com" },
      subject: "Board deck deadline",
      body: "We need the board deck by Friday. Please prioritize.",
      importance: "high",
    }).message;
    const r = ai.enrichMessage(T, msg._id);
    expect(["critical", "high"]).toContain(r.priority);
    expect(["positive", "neutral", "negative"]).toContain(r.sentiment);
    expect(r.summary).toContain("Board deck deadline");
    expect(r.category).toBeTruthy();
    expect(r.spamScore).toBeGreaterThanOrEqual(0);
    expect(r.replySuggestions.length).toBe(3);
    expect(mail.getMessage(T, msg._id).ai.priority).toBe(r.priority);
    expect(() => ai.enrichMessage(T, "ghost")).toThrow(/not found/);
  });

  it("drafts smart replies with tones and confidence", () => {
    const msg = mail.receiveMessage(T, workId, { from: "friend@mail.com", subject: "Catch up?", body: "Free Friday?" }).message;
    const r = ai.smartReply(T, msg._id);
    expect(r.replies.length).toBe(3);
    expect(r.replies[0].text.length).toBeGreaterThan(10);
    expect(r.replies[0].confidence).toBeGreaterThanOrEqual(70);
    expect(new Set(r.replies.map(x => x.tone)).size).toBeGreaterThanOrEqual(2);
  });

  it("summarizes a thread with decisions and next steps", () => {
    const s = ai.summarizeThread(T, "thr_reply_1");
    expect(s.messageCount).toBe(2);
    expect(s.participants.length).toBe(2);
    expect(s.summary).toContain("2 messages");
    expect(s.nextSteps.length).toBeGreaterThan(0);
    expect(() => ai.summarizeThread(T, "thr_ghost")).toThrow(/not found/);
  });

  it("prepares meeting notes from a thread", () => {
    const p = ai.meetingPrep(T, "thr_reply_1");
    expect(p.attendees.length).toBe(2);
    expect(p.proposedTimes.length).toBeGreaterThan(0);
    expect(p.agenda.length).toBeGreaterThan(0);
    expect(p.prepNotes.length).toBeGreaterThan(0);
  });

  it("aggregates email intelligence for the inbox", () => {
    const i = ai.emailIntelligence(T);
    expect(i.totalUnread).toBeGreaterThan(0);
    expect(i.unreadByPriority).toHaveProperty("critical");
    expect(i.attentionItems).toBeGreaterThan(0);
    expect(i.byCategory.length).toBeGreaterThan(0);
    expect(i.digest.length).toBeGreaterThan(0);
    expect(i.summary).toMatch(/unread in inbox/);
  });
});
