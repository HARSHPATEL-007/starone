import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailThreadService, THREAD_STATES, THREAD_PRIORITIES } from "../services/MailThreadService";
import { MailIntegrationService, CONNECTORS, INTEGRATION_CATEGORIES } from "../services/MailIntegrationService";
import { MailBillingService, COUPONS } from "../services/MailBillingService";
import { MailboxService } from "../services/MailboxService";

const threads = new MailThreadService();
const integration = new MailIntegrationService();
const billing = new MailBillingService();
const mailbox = new MailboxService();

const T = "nova-mail16";
const MB_A = "mb_thr16a";
const MB_B = "mb_thr16b";

const THR_A = "thr_round16_contract";
const THR_B = "thr_round16_budget";
const THR_C = "thr_round16_lunch";

function h(s: string): string {
  return String(Math.abs(s.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)));
}

beforeAll(() => {
  const mk = (id: string, name: string, email: string, plan: string) =>
    DataStore.mem().insert("mailboxes", {
      _id: id, tenantId: T, name, type: "work", email, plan,
      quotaBytes: 10 * 1024 * 1024 * 1024, usedBytes: 0, status: "active",
    });
  mk(MB_A, "Thread A", "a@t16.io", "business");
  mk(MB_B, "Thread B", "b@t16.io", "business");

  const msg = (over: any) => DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: MB_A, threadId: over.threadId, messageId: `<${h(over.subject + over.receivedAt)}@t16.mail>`,
    from: { name: over.fromName, email: over.from }, to: [{ name: "Me", email: "a@t16.io" }],
    subject: over.subject, body: over.body || "body", preview: (over.body || "body").slice(0, 40),
    folder: over.folder || "inbox", labels: over.labels || ["Inbox"], read: !!over.read,
    starred: !!over.starred, attachments: [], receivedAt: over.receivedAt, sentAt: null,
    importance: over.importance || "normal", flags: [], ai: {},
  });

  const d = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
  msg({ threadId: THR_A, subject: "Q3 contract review", from: "john@partner.com", fromName: "John Smith", receivedAt: d(-5), read: false });
  msg({ threadId: THR_A, subject: "Re: Q3 contract review", from: "maya@n0va.mail", fromName: "Maya Lee", receivedAt: d(-3), read: false });
  msg({ threadId: THR_A, subject: "RE: Q3 contract review", from: "john@partner.com", fromName: "John Smith", receivedAt: d(-1), read: true, folder: "archive", labels: ["Inbox", "Contract"] });
  msg({ threadId: THR_B, subject: "Budget approval needed", from: "finance@n0va.mail", fromName: "Finance", receivedAt: d(-2), read: false, starred: true });
  msg({ threadId: THR_B, subject: "Re: Budget approval needed", from: "me@n0va.mail", fromName: "Me", receivedAt: new Date(Date.now() - 2 * 3600000).toISOString(), read: true });
  msg({ threadId: THR_C, subject: "Team lunch Friday", from: "hr@n0va.mail", fromName: "HR", receivedAt: d(-1), read: true });
});

describe("thread list & workspace", () => {
  it("aggregates tenant messages into threads with counts", () => {
    const r = threads.threadList(T);
    expect(r.total).toBe(3);
    expect(r.threads.map((t: any) => t.threadId)).toContain(THR_A);
    const a = r.threads.find((t: any) => t.threadId === THR_A) as any;
    expect(a.messageCount).toBe(3);
    expect(a.unreadCount).toBe(2);
    expect(a.subject).toBe("Q3 contract review");
    expect(a.participants).toContain("John Smith");
    expect(a.folders).toContain("archive");
    expect(a.labels).toContain("Contract");
    expect(r.unreadThreads).toBe(2);
    expect(r.states.open).toBe(3);
    expect(r.summary).toContain("3 thread(s)");
  });

  it("sorts by last activity (pinned first after pinning)", () => {
    const before = threads.threadList(T);
    expect(before.threads[0].threadId).toBe(THR_B);
    threads.pinThread(T, THR_A);
    const after = threads.threadList(T);
    expect(after.threads[0].threadId).toBe(THR_A);
    threads.unpinThread(T, THR_A);
  });

  it("filters by folder, state, tag, priority, flags and search", () => {
    expect(threads.threadList(T, { folder: "archive" }).total).toBe(1);
    expect(threads.threadList(T, { state: "open" }).total).toBe(3);
    expect(threads.threadList(T, { state: "done" }).total).toBe(0);
    expect(threads.threadList(T, { unreadOnly: true }).total).toBe(2);
    expect(threads.threadList(T, { starredOnly: true }).threads[0].threadId).toBe(THR_B);
    expect(threads.threadList(T, { search: "budget" }).total).toBe(1);
    expect(threads.threadList(T, { search: "john smith" }).total).toBe(1);
    threads.tagThread(T, THR_B, "urgent");
    expect(threads.threadList(T, { tag: "urgent" }).total).toBe(1);
    threads.setThreadPriority(T, THR_B, "high");
    expect(threads.threadList(T, { priority: "high" }).threads[0].threadId).toBe(THR_B);
    threads.untagThread(T, THR_B, "urgent");
    threads.setThreadPriority(T, THR_B, "normal");
  });

  it("workspace returns sorted messages, participants and a next-step suggestion", () => {
    const w = threads.threadWorkspace(T, THR_A);
    expect(w.messages).toHaveLength(3);
    expect(w.messages[0].receivedAt < w.messages[2].receivedAt).toBe(true);
    expect(w.unreadCount).toBe(2);
    expect(w.suggestedNext).toContain("unread");
    expect(w.summary).toContain("3 message(s)");
  });

  it("throws on unknown thread", () => {
    expect(() => threads.threadWorkspace(T, "thr_nope")).toThrow(/not found/);
  });
});

describe("thread state machine", () => {
  it("validates state transitions", () => {
    expect(() => threads.setThreadState(T, THR_A, "sideways")).toThrow(/State must be one of/);
    expect(THREAD_STATES).toContain("pending");
  });

  it("marking done clears unread and feeds the dashboard", () => {
    const r = threads.setThreadState(T, THR_A, "done");
    expect(r.state).toBe("done");
    expect(r.summary).toContain("Done");
    const w = threads.threadWorkspace(T, THR_A);
    expect(w.unreadCount).toBe(0);
    const dash = threads.threadDashboard(T);
    expect(dash.byState.done).toBe(1);
    threads.setThreadState(T, THR_A, "open");
  });
});

describe("pin / tags / priority", () => {
  it("pins and unpins threads", () => {
    expect(threads.pinThread(T, THR_C).pinned).toBe(true);
    expect(threads.threadList(T, { pinnedOnly: true }).total).toBe(1);
    expect(threads.unpinThread(T, THR_C).pinned).toBe(false);
  });

  it("manages tags with validation", () => {
    expect(() => threads.tagThread(T, THR_C, "")).toThrow(/Tag is required/);
    threads.tagThread(T, THR_C, "social");
    threads.tagThread(T, THR_C, "social");
    expect(threads.threadWorkspace(T, THR_C).tags).toEqual(["social"]);
    threads.untagThread(T, THR_C, "social");
    expect(threads.threadWorkspace(T, THR_C).tags).toEqual([]);
  });

  it("manages priority with validation", () => {
    expect(() => threads.setThreadPriority(T, THR_C, "urgent")).toThrow(/Priority must be one of/);
    expect(THREAD_PRIORITIES).toContain("high");
    const r = threads.setThreadPriority(T, THR_C, "high");
    expect(r.priority).toBe("high");
    expect(threads.threadWorkspace(T, THR_C).priority).toBe("high");
  });
});

describe("thread merge", () => {
  it("merges a source thread into a target", () => {
    const r = threads.mergeThreads(T, THR_A, THR_C);
    expect(r.mergedMessages).toBe(1);
    expect(r.messageCount).toBe(4);
    const list = threads.threadList(T);
    expect(list.total).toBe(2);
    expect(() => threads.threadWorkspace(T, THR_C)).toThrow(/not found/);
  });

  it("guards self-merge and unknown threads", () => {
    expect(() => threads.mergeThreads(T, THR_A, THR_A)).toThrow(/must be different/);
    expect(() => threads.mergeThreads(T, THR_A, "thr_ghost")).toThrow(/not found/);
  });
});

describe("thread dashboard & log", () => {
  it("reports state counts, pinned, top tags and oldest open thread", () => {
    threads.tagThread(T, THR_A, "contract");
    threads.tagThread(T, THR_A, "contract");
    threads.tagThread(T, THR_B, "finance");
    const dash = threads.threadDashboard(T);
    expect(dash.totalThreads).toBe(2);
    expect(dash.byState.open).toBe(2);
    expect(dash.topTags).toEqual(expect.arrayContaining([
      { tag: "contract", count: 1 },
      { tag: "finance", count: 1 },
    ]));
    expect(dash.topTags.length).toBe(2);
    expect(dash.oldestOpen!.threadId).toBe(THR_A);
    expect(dash.oldestOpen!.daysOld).toBeGreaterThanOrEqual(4);
    expect(dash.summary).toContain("thread(s)");
    expect(dash.generatedAt).toBeDefined();
  });

  it("logs thread events newest-first", () => {
    const log = threads.threadLog(T);
    expect(log.total).toBeGreaterThanOrEqual(8);
    for (let i = 1; i < log.entries.length; i++) {
      expect(new Date(log.entries[i - 1].at).getTime()).toBeGreaterThanOrEqual(new Date(log.entries[i].at).getTime());
    }
    expect(log.entries.some((e: any) => e.category === "thread_merge")).toBe(true);
    expect(log.entries.some((e: any) => e.category === "thread_state")).toBe(true);
  });
});

describe("integration catalog expansion", () => {
  it("exposes 15 connectors across 7 categories", () => {
    const cat = integration.connectorCatalog(T);
    expect(cat.connectors).toHaveLength(15);
    expect(cat.categories).toHaveLength(7);
    expect(INTEGRATION_CATEGORIES).toContain("finance");
    expect(CONNECTORS.map((c) => c.id)).toContain("google_sheets");
    expect(CONNECTORS.map((c) => c.id)).toContain("xero");
  });

  it("new connectors advertise their actions", () => {
    const sheets = CONNECTORS.find((c) => c.id === "google_sheets") as any;
    expect(sheets.actions).toContain("push_to_sheets");
    const asana = CONNECTORS.find((c) => c.id === "asana") as any;
    expect(asana.actions).toEqual(expect.arrayContaining(["create_ticket", "post_comment", "create_task"]));
    const wa = CONNECTORS.find((c) => c.id === "whatsapp") as any;
    expect(wa.actions).toContain("send_sms");
    const webex = CONNECTORS.find((c) => c.id === "webex") as any;
    expect(webex.actions).toContain("schedule_meeting");
    const xero = CONNECTORS.find((c) => c.id === "xero") as any;
    expect(xero.actions).toContain("create_invoice");
    const drive = CONNECTORS.find((c) => c.id === "drive") as any;
    expect(drive.actions).toContain("read_from_drive");
  });

  it("runs push_to_sheets deterministically", () => {
    const id = integration.connectConnector(T, { connectorId: "google_sheets", mailboxId: MB_A }).connectionId;
    const r = integration.runAction(T, id, "push_to_sheets", { tab: "Q3 leads" });
    expect(r.sheetId).toMatch(/^sht_/);
    expect(r.tab).toBe("Q3 leads");
    expect(r.rowsWritten).toBeGreaterThanOrEqual(2);
    expect(r.summary).toContain("Q3 leads");
  });

  it("runs create_ticket and post_comment on asana", () => {
    const id = integration.connectConnector(T, { connectorId: "asana", mailboxId: MB_A }).connectionId;
    const t = integration.runAction(T, id, "create_ticket", { title: "Invoice dispute" });
    expect(t.ticketId).toMatch(/^tic_/);
    expect(["low", "medium", "high"]).toContain(t.priority);
    expect(t.summary).toContain("Invoice dispute");
    const c = integration.runAction(T, id, "post_comment", { thread: "dispute-42", text: "Need detail" });
    expect(c.commentId).toMatch(/^cmm_/);
    expect(c.thread).toBe("dispute-42");
  });

  it("runs send_sms on whatsapp", () => {
    const id = integration.connectConnector(T, { connectorId: "whatsapp", mailboxId: MB_A }).connectionId;
    const r = integration.runAction(T, id, "send_sms", { phone: "+15551234567", text: "Heads up" });
    expect(r.smsId).toMatch(/^sms_/);
    expect(r.phone).toBe("+15551234567");
    expect(r.delivered).toBe(true);
  });

  it("runs create_invoice on xero and read_from_drive on drive", () => {
    const xero = integration.connectConnector(T, { connectorId: "xero", mailboxId: MB_A }).connectionId;
    const inv = integration.runAction(T, xero, "create_invoice", { amount: 425 });
    expect(inv.invoiceId).toMatch(/^inv_/);
    expect(inv.amount).toBe(425);
    const drive = integration.connectConnector(T, { connectorId: "drive", mailboxId: MB_A }).connectionId;
    const rd = integration.runAction(T, drive, "read_from_drive", { name: "contract.pdf" });
    expect(rd.fileId).toMatch(/^file_/);
    expect(rd.contentPreview).toContain("contract.pdf");
  });

  it("rejects new actions from connectors that do not support them", () => {
    const gmail = integration.connectConnector(T, { connectorId: "gmail", mailboxId: MB_A }).connectionId;
    expect(() => integration.runAction(T, gmail, "create_invoice", {})).toThrow(/does not support action/);
    expect(() => integration.runAction(T, gmail, "read_from_drive", {})).toThrow(/does not support action/);
  });

  it("increments actionsRun and logs the action", () => {
    const sheets = integration.listConnections(T).find((c: any) => c.connectorId === "google_sheets") as any;
    expect(sheets.actionsRun).toBeGreaterThanOrEqual(1);
    const log = DataStore.mem().find("mail_integration_log", (l: any) => l.tenantId === T && l.category === "action_push_to_sheets");
    expect(log.length).toBeGreaterThanOrEqual(1);
  });
});

describe("billing coupons", () => {
  const T2 = "nova-mail16_coupon";

  it("catalogs 4 coupons with usage remaining", () => {
    const cat = billing.couponCatalog();
    expect(cat.coupons).toHaveLength(4);
    expect(cat.coupons[0].code).toBe("SPRING20");
    expect(cat.coupons[0].remaining).toBe(cat.coupons[0].maxUses);
    expect(COUPONS.TEAM10.pctOff).toBe(10);
    expect(COUPONS.N0VA1O.flatOff).toBe(100);
  });

  it("applies a valid coupon and reports status", () => {
    const r = billing.applyCoupon(T2, "spring20");
    expect(r.code).toBe("SPRING20");
    expect(r.summary).toContain("applied");
    const s = billing.couponStatus(T2);
    expect(s.active).toBe(true);
    expect(s.expired).toBe(false);
    expect(s.pctOff).toBe(20);
  });

  it("rejects unknown coupons", () => {
    expect(() => billing.applyCoupon(T2, "HACKZ")).toThrow(/Unknown coupon/);
  });

  it("discounts plan-change proration", () => {
    billing.removeCoupon(T2);
    billing.applyCoupon(T2, "TEAM10");
    const r = billing.upgradePlan(T2, "pro");
    expect(r.invoice.subtotal).toBe(r.proration);
    expect(r.invoice.discount).toBeGreaterThan(0);
    expect(r.invoice.total).toBe(Math.round(r.proration * 0.9 * 100) / 100);
    expect(r.invoice.kind).toBe("upgrade");
  });

  it("flat-off coupon can zero a small proration", () => {
    const T3 = "nova-mail16_flat";
    billing.applyCoupon(T3, "N0VA1O");
    const r = billing.upgradePlan(T3, "pro");
    expect(r.invoice.discount).toBe(r.proration);
    expect(r.invoice.total).toBe(0);
  });

  it("discounts add-on purchases", () => {
    const T4 = "nova-mail16_addon";
    billing.applyCoupon(T4, "VIP25");
    const r = billing.addAddon(T4, "storage_100gb");
    expect(r.invoice.discount).toBeGreaterThan(0);
    expect(r.invoice.total).toBe(Math.round(r.proration * 0.75 * 100) / 100);
  });

  it("removes the active coupon", () => {
    const T5 = "nova-mail16_remove";
    billing.applyCoupon(T5, "TEAM10");
    const r = billing.removeCoupon(T5);
    expect(r.active).toBe(false);
    expect(billing.couponStatus(T5).active).toBe(false);
  });
});

describe("billing tax", () => {
  const T6 = "nova-mail16_tax";

  it("defaults to no tax and validates the range", () => {
    expect(billing.billingTaxRate(T6).taxRate).toBe(0);
    expect(() => billing.setTaxRate(T6, 40)).toThrow(/between 0 and 30/);
    expect(() => billing.setTaxRate(T6, -1)).toThrow(/between 0 and 30/);
  });

  it("sets the tax rate and reports it", () => {
    const r = billing.setTaxRate(T6, 21);
    expect(r.taxRate).toBe(21);
    expect(billing.billingTaxRate(T6).taxRate).toBe(21);
    expect(billing.billingTaxRate(T6).summary).toContain("21%");
  });

  it("applies tax to new invoices as subtotal + tax = total", () => {
    const r = billing.createInvoice(T6, { description: "Setup fee", amount: 100 });
    expect(r.invoice.subtotal).toBe(100);
    expect(r.invoice.taxRate).toBe(21);
    expect(r.invoice.taxAmount).toBe(21);
    expect(r.invoice.total).toBe(121);
    expect(r.summary).toContain("$121.00");
  });

  it("applies tax on top of coupon discount", () => {
    const T7 = "nova-mail16_both";
    billing.setTaxRate(T7, 10);
    billing.applyCoupon(T7, "SPRING20");
    const r = billing.upgradePlan(T7, "pro");
    expect(r.invoice.subtotal).toBe(r.proration);
    expect(r.invoice.discount).toBe(Math.round(r.proration * 0.2 * 100) / 100);
    expect(r.invoice.taxAmount).toBe(Math.round(r.invoice.total / 11 * 100) / 100);
  });

  it("exposes coupon and tax in summary and dashboard", () => {
    const s = billing.billingSummary(T6);
    expect(s.taxRate).toBe(21);
    expect(s.coupon.active).toBe(false);
    const dash = billing.billingDashboard(T6);
    expect(dash.taxRate).toBe(21);
    expect(dash.coupon).toBeDefined();
  });
});
