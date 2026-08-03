import { describe, it, expect } from "vitest";
import { DataStore } from "../services/DataStore";
import { mailBilling, PLANS, PLAN_ORDER } from "../services/MailBillingService";
import { mailNotifications, NOTIFICATION_TYPES } from "../services/MailNotificationService";

let tenantSeq = 0;
const T = () => `nova-mail11_${++tenantSeq}`;

const iso = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86400000).toISOString();

function seedMailbox(tenantId: string, partial: any = {}) {
  return DataStore.mem().insert("mailboxes", {
    tenantId, name: "Mailbox", type: "personal", plan: "free", quotaBytes: 5 * 1024 * 1024 * 1024,
    active: true, createdAt: iso(), ...partial,
  });
}

function seedMessage(tenantId: string, partial: any = {}) {
  return DataStore.mem().insert("messages", {
    tenantId, mailboxId: "mb_x", subject: "Test", body: "Hello",
    from: { email: "a@x.io", name: "A" }, to: [{ email: "me@x.io", name: "Me" }],
    receivedAt: iso(), ...partial,
  });
}

describe("MailBillingService", () => {
  it("catalogs 4 plans in order with prices", () => {
    const cat = mailBilling.planCatalog();
    expect(cat.order).toEqual(["free", "pro", "business", "n0va1o"]);
    expect(cat.plans.length).toBe(4);
    expect(PLAN_ORDER.length).toBe(4);
    expect(PLANS.free.priceMonthly).toBe(0);
    expect(PLANS.pro.priceMonthly).toBe(12);
    expect(PLANS.business.priceMonthly).toBe(49);
    expect(PLANS.n0va1o.priceMonthly).toBe(199);
  });

  it("defaults a tenant to the free plan with 9 usage dimensions", () => {
    const t = T();
    const s = mailBilling.billingSummary(t);
    expect(s.plan).toBe("free");
    expect(s.planName).toBe("Free");
    expect(s.status).toBe("ok");
    expect(s.usage.length).toBe(9);
    expect(s.usage.find((u: any) => u.dimension === "mailboxes").used).toBe(0);
    expect(s.summary).toContain("Free");
  });

  it("meters real usage and flags over-limit dimensions", () => {
    const t = T();
    seedMailbox(t, { name: "One" });
    seedMailbox(t, { name: "Two" });
    seedMessage(t, { subject: "Today", receivedAt: iso() });
    DataStore.mem().insert("mail_contacts", { tenantId: t, email: "c@x.io" });
    DataStore.mem().insert("mail_campaigns", { tenantId: t, name: "C1", status: "active" });
    DataStore.mem().insert("mail_webhooks", { tenantId: t, url: "https://x.io/h", event: "message.new" });
    const s = mailBilling.billingSummary(t);
    const mb = s.usage.find((u: any) => u.dimension === "mailboxes");
    expect(mb.used).toBe(2);
    expect(mb.limit).toBe(1);
    expect(mb.overLimit).toBe(true);
    expect(s.status).toBe("critical");
    expect(s.overLimits.map((o: any) => o.dimension)).toContain("mailboxes");
    expect(s.usage.find((u: any) => u.dimension === "contacts").used).toBe(1);
    expect(s.usage.find((u: any) => u.dimension === "messagesPerDay").used).toBe(1);
    expect(s.usage.find((u: any) => u.dimension === "campaigns").used).toBe(1);
    expect(s.usage.find((u: any) => u.dimension === "webhooks").used).toBe(1);
  });

  it("upgrades with prorated invoice and logs the change", () => {
    const t = T();
    const r = mailBilling.upgradePlan(t, "pro");
    expect(r.plan).toBe("pro");
    expect(r.proration).toBeGreaterThanOrEqual(0);
    expect(r.invoice.status).toBe("open");
    expect(r.invoice.number).toMatch(/^INV-\d{6}$/);
    expect(r.summary).toContain("Pro");
    expect(mailBilling.billingSummary(t).plan).toBe("pro");
    const log = mailBilling.billingLog(t).entries;
    expect(log.some((e: any) => e.category === "plan_change")).toBe(true);
  });

  it("rejects same-plan upgrades and unknown plans", () => {
    const t = T();
    mailBilling.upgradePlan(t, "pro");
    expect(() => mailBilling.upgradePlan(t, "pro")).toThrow(/Already on/);
    expect(() => mailBilling.upgradePlan(t, "ultimate")).toThrow(/Unknown plan/);
  });

  it("blocks downgrades that would exceed limits", () => {
    const t = T();
    mailBilling.upgradePlan(t, "pro");
    seedMailbox(t);
    seedMailbox(t);
    expect(() => mailBilling.upgradePlan(t, "free")).toThrow(/Cannot downgrade/);
  });

  it("allows downgrades when usage fits", () => {
    const t = T();
    mailBilling.upgradePlan(t, "pro");
    expect(mailBilling.upgradePlan(t, "free").plan).toBe("free");
  });

  it("recommends a plan when limits are exceeded", () => {
    const t = T();
    seedMailbox(t);
    seedMailbox(t);
    expect(mailBilling.billingSummary(t).recommendedPlan).toBe("pro");
  });

  it("manages invoices end to end", () => {
    const t = T();
    const created = mailBilling.createInvoice(t, { lines: [{ description: "Add-on", amount: 5.5 }], amount: 5.5 });
    const inv = created.invoice;
    expect(inv.number).toMatch(/^INV-/);
    expect(inv.status).toBe("open");
    expect(inv.total).toBe(5.5);
    const listed = mailBilling.invoices(t);
    expect(listed.invoices.length).toBe(1);
    expect(listed.openTotal).toBe(5.5);
    const got = mailBilling.getInvoice(inv.invoiceId);
    expect(got.invoiceId).toBe(inv.invoiceId);
    const paid = mailBilling.payInvoice(inv.invoiceId);
    expect(paid.status).toBe("paid");
    expect(paid.paidAt).toBeTruthy();
    expect(mailBilling.payInvoice(inv.invoiceId).summary).toContain("already paid");
    expect(mailBilling.invoices(t).paidTotal).toBe(5.5);
    expect(() => mailBilling.getInvoice("missing")).toThrow(/Invoice not found/);
    expect(() => mailBilling.payInvoice("missing")).toThrow(/Invoice not found/);
  });

  it("adds, lists and removes payment methods with defaults", () => {
    const t = T();
    const pm = mailBilling.setPaymentMethod(t, { brand: "visa", last4: "4242", expMonth: 12, expYear: 2028 });
    expect(pm.methodId).toBeTruthy();
    expect(pm.isDefault).toBe(true);
    const pm2 = mailBilling.setPaymentMethod(t, { brand: "mastercard", last4: "1111", expMonth: 6, expYear: 2029 });
    const list = mailBilling.paymentMethods(t);
    expect(list.total).toBe(2);
    expect(list.defaultMethodId).toBe(pm2.methodId);
    expect(mailBilling.getPaymentMethod(pm.methodId).last4).toBe("4242");
    expect(mailBilling.removePaymentMethod(pm.methodId).summary).toContain("removed");
    expect(mailBilling.paymentMethods(t).total).toBe(1);
    expect(() => mailBilling.removePaymentMethod("missing")).toThrow(/Payment method not found/);
  });

  it("validates payment method input", () => {
    const t = T();
    expect(() => mailBilling.setPaymentMethod(t, { last4: "12" })).toThrow(/last4/);
    expect(() => mailBilling.setPaymentMethod(t, { last4: "4242", expMonth: 13 })).toThrow(/expMonth/);
  });

  it("generates deterministic forecast without flags on a fresh tenant", () => {
    const t = T();
    const f = mailBilling.usageForecast(t);
    expect(f.growthPerDayMb).toBeGreaterThanOrEqual(1);
    expect(f.growthPerDayMb).toBeLessThanOrEqual(4);
    expect(f.daysToQuota).toBeGreaterThan(0);
    expect(f.atRisk).toBe(false);
    expect(f.summary).toContain("quota hit");
  });

  it("returns a full billing dashboard", () => {
    const t = T();
    mailBilling.upgradePlan(t, "business");
    mailBilling.setPaymentMethod(t, { brand: "amex", last4: "3005", expMonth: 1, expYear: 2030 });
    const d = mailBilling.billingDashboard(t);
    expect(d.plan).toBe("business");
    expect(d.plans.length).toBe(4);
    expect(d.invoices.length).toBe(1);
    expect(d.paymentMethods.length).toBe(1);
    expect(d.forecast.daysToQuota).toBeGreaterThan(0);
    expect(d.generatedAt).toBeTruthy();
    expect(Array.isArray(d.log)).toBe(true);
  });
});

describe("MailNotificationService", () => {
  it("creates notifications and validates types", () => {
    const t = T();
    const r = mailNotifications.notify(t, "follow_up_due", { key: "k1", title: "Due", message: "Reply now" });
    expect(r.created).toBe(true);
    expect(r.notification.notificationId).toBeTruthy();
    expect(r.notification.severity).toBe("warning");
    expect(r.notification.link).toBe("/mail/followups");
    expect(() => mailNotifications.notify(t, "bogus", {})).toThrow(/Unknown notification type/);
  });

  it("lists sorted desc with filters", () => {
    const t = T();
    mailNotifications.notify(t, "rule_triggered", { key: "a", title: "A" });
    mailNotifications.notify(t, "rule_triggered", { key: "b", title: "B" });
    mailNotifications.notify(t, "storage_warning", { key: "c", title: "C" });
    const all = mailNotifications.listNotifications(t);
    expect(all.total).toBe(3);
    expect(all.notifications.map((n: any) => n.title).sort()).toEqual(["A", "B", "C"]);
    expect(mailNotifications.listNotifications(t, { type: "rule_triggered" }).total).toBe(2);
    expect(mailNotifications.listNotifications(t, { unreadOnly: true }).total).toBe(3);
    expect(mailNotifications.listNotifications(t, { limit: 1 }).notifications.length).toBe(1);
  });

  it("dedupes by key while unread", () => {
    const t = T();
    mailNotifications.notify(t, "rule_triggered", { key: "same", title: "First" });
    const second = mailNotifications.notify(t, "rule_triggered", { key: "same", title: "Second" });
    expect(second.created).toBe(false);
    expect(second.reason).toBe("duplicate");
    expect(mailNotifications.listNotifications(t).total).toBe(1);
  });

  it("marks read and all-read", () => {
    const t = T();
    const n = mailNotifications.notify(t, "rule_triggered", { key: "r1", title: "R" }).notification;
    const n2 = mailNotifications.notify(t, "rule_triggered", { key: "r2", title: "R2" }).notification;
    expect(mailNotifications.markRead(n.notificationId).read).toBe(true);
    expect(mailNotifications.listNotifications(t, { unreadOnly: true }).total).toBe(1);
    expect(mailNotifications.markAllRead(t).marked).toBe(1);
    expect(mailNotifications.listNotifications(t, { unreadOnly: true }).total).toBe(0);
    expect(() => mailNotifications.markRead("missing")).toThrow(/Notification not found/);
    expect(mailNotifications.deleteNotification(n2.notificationId).summary).toContain("deleted");
    expect(() => mailNotifications.deleteNotification("missing")).toThrow(/Notification not found/);
  });

  it("clears all", () => {
    const t = T();
    mailNotifications.notify(t, "rule_triggered", { key: "x", title: "X" });
    expect(mailNotifications.clearAll(t).cleared).toBe(1);
    expect(mailNotifications.listNotifications(t).total).toBe(0);
  });

  it("defaults all settings on and updates per type", () => {
    const t = T();
    const s = mailNotifications.notificationSettings(t);
    expect(Object.keys(s.types).length).toBe(NOTIFICATION_TYPES.length);
    expect(s.types.follow_up_due).toBe(true);
    const updated = mailNotifications.updateNotificationSettings(t, { follow_up_due: false });
    expect(updated.types.follow_up_due).toBe(false);
    expect(() => mailNotifications.updateNotificationSettings(t, { nonsense: true })).toThrow(/Unknown notification type/);
  });

  it("collects nothing on a clean tenant", () => {
    const t = T();
    const r = mailNotifications.collectAlerts(t);
    expect(r.total).toBe(0);
    expect(r.summary).toContain("0 alert(s) created");
  });

  it("collects follow-up due and snooze expired alerts", () => {
    const t = T();
    DataStore.mem().insert("mail_follow_ups", { tenantId: t, subject: "Deal", contactEmail: "b@x.io", status: "open", dueAt: iso(-1), createdAt: iso(-3) });
    DataStore.mem().insert("mail_follow_ups", { tenantId: t, subject: "Later", contactEmail: "c@x.io", status: "open", dueAt: iso(5), createdAt: iso(-3) });
    seedMessage(t, { subject: "Snoozed", snoozed: true, snoozedUntil: iso(-1) });
    seedMessage(t, { subject: "Still snoozed", snoozed: true, snoozedUntil: iso(3) });
    const r = mailNotifications.collectAlerts(t);
    expect(r.added.map((a: any) => a.type).sort()).toEqual(["follow_up_due", "snooze_expired"]);
    expect(mailNotifications.listNotifications(t).total).toBe(2);
  });

  it("collects campaign approval alerts only for pending campaigns", () => {
    const t = T();
    DataStore.mem().insert("mail_campaigns", { tenantId: t, name: "Wait", status: "pending_approval", audienceMode: "query" });
    DataStore.mem().insert("mail_campaigns", { tenantId: t, name: "Live", status: "active", audienceMode: "query" });
    const r = mailNotifications.collectAlerts(t);
    expect(r.added.length).toBe(1);
    expect(r.added[0].type).toBe("campaign_pending");
  });

  it("collects storage warnings from small-quota mailboxes", () => {
    const t = T();
    const mb = seedMailbox(t, { name: "Tiny", quotaBytes: 2000 });
    seedMessage(t, { mailboxId: mb._id, body: "x".repeat(4000) });
    const r = mailNotifications.collectAlerts(t);
    expect(r.added.map((a: any) => a.type)).toContain("storage_warning");
  });

  it("collects ops alerts only for unresolved incidents", () => {
    const t = T();
    DataStore.mem().insert("mail_ops_incidents", { tenantId: t, severity: "P2", title: "Queue spike", status: "open", createdAt: iso() });
    DataStore.mem().insert("mail_ops_incidents", { tenantId: t, severity: "P4", title: "Done", status: "resolved", createdAt: iso() });
    const r = mailNotifications.collectAlerts(t);
    expect(r.added.length).toBe(1);
    expect(r.added[0].type).toBe("ops_alert");
    expect(r.added[0].title).toContain("P2");
  });

  it("collects webhook failures but not delivered deliveries", () => {
    const t = T();
    DataStore.mem().insert("mail_webhook_deliveries", { tenantId: t, webhookId: "w1", url: "https://x.io/h", event: "message.new", status: "failed", error: "5xx upstream timeout", createdAt: iso() });
    DataStore.mem().insert("mail_webhook_deliveries", { tenantId: t, webhookId: "w2", url: "https://x.io/h2", event: "message.sent", status: "delivered", createdAt: iso() });
    const r = mailNotifications.collectAlerts(t);
    expect(r.added.length).toBe(1);
    expect(r.added[0].type).toBe("webhook_failed");
  });

  it("collects domain flags only when action is required", () => {
    const t = T();
    DataStore.mem().insert("mail_domains", { tenantId: t, domain: "x.io", status: "action_required", verifiedCount: 3, plan: "free", createdAt: iso() });
    DataStore.mem().insert("mail_domains", { tenantId: t, domain: "y.io", status: "active", verifiedCount: 6, plan: "business", createdAt: iso() });
    const r = mailNotifications.collectAlerts(t);
    expect(r.added.length).toBe(1);
    expect(r.added[0].title).toContain("action required");
    expect(r.added[0].message).toContain("3 DNS record(s)");
  });

  it("collects agent HITL requests still pending review", () => {
    const t = T();
    DataStore.mem().insert("mail_agent_hitl", { tenantId: t, agentId: "a1", agentName: "n0va_ops", tool: "run_housekeeping", riskScore: 80, status: "pending_review", requestedAt: iso() });
    DataStore.mem().insert("mail_agent_hitl", { tenantId: t, agentId: "a2", agentName: "n0va_ops", tool: "run_tiering", riskScore: 40, status: "approved", requestedAt: iso() });
    const r = mailNotifications.collectAlerts(t);
    expect(r.added.length).toBe(1);
    expect(r.added[0].type).toBe("agent_hitl");
  });

  it("collects integration errors for error/needs_auth connections", () => {
    const t = T();
    DataStore.mem().insert("mail_connections", { tenantId: t, connectorId: "slack", name: "Slack", status: "needs_auth", createdAt: iso() });
    DataStore.mem().insert("mail_connections", { tenantId: t, connectorId: "crm", name: "CRM", status: "connected", createdAt: iso() });
    const r = mailNotifications.collectAlerts(t);
    expect(r.added.length).toBe(1);
    expect(r.added[0].type).toBe("integration_error");
    expect(r.added[0].message).toContain("waiting for authorization");
  });

  it("aggregates today's spam into a single alert", () => {
    const t = T();
    DataStore.mem().insert("mail_spam_log", { tenantId: t, messageId: "m1", sender: "s@x.io", score: 80, verdict: "spam", at: new Date().toISOString() });
    DataStore.mem().insert("mail_spam_log", { tenantId: t, messageId: "m2", sender: "s2@x.io", score: 90, verdict: "spam", at: new Date().toISOString() });
    DataStore.mem().insert("mail_spam_log", { tenantId: t, messageId: "m3", sender: "s3@x.io", score: 70, verdict: "spam", at: iso(-1) });
    const r = mailNotifications.collectAlerts(t);
    expect(r.added.length).toBe(1);
    expect(r.added[0].type).toBe("spam_detected");
    expect(r.added[0].message).toContain("2 spam message(s)");
  });

  it("collects overdue invoices only", () => {
    const t = T();
    DataStore.mem().insert("mail_invoices", { tenantId: t, number: "INV-000001", total: 12, status: "open", dueAt: iso(-2), issuedAt: iso(-9) });
    DataStore.mem().insert("mail_invoices", { tenantId: t, number: "INV-000002", total: 49, status: "open", dueAt: iso(5), issuedAt: iso(-1) });
    const r = mailNotifications.collectAlerts(t);
    expect(r.added.length).toBe(1);
    expect(r.added[0].type).toBe("invoice_due");
    expect(r.added[0].title).toContain("INV-000001");
  });

  it("dedupes on the second collect run", () => {
    const t = T();
    seedMessage(t, { subject: "Snoozed", snoozed: true, snoozedUntil: iso(-1) });
    mailNotifications.collectAlerts(t);
    const second = mailNotifications.collectAlerts(t);
    expect(second.added.length).toBe(0);
    expect(second.skipped.length).toBe(1);
    expect(second.skipped[0].reason).toBe("duplicate");
  });

  it("respects disabled alert types", () => {
    const t = T();
    DataStore.mem().insert("mail_follow_ups", { tenantId: t, subject: "Deal", contactEmail: "b@x.io", status: "open", dueAt: iso(-1), createdAt: iso(-3) });
    mailNotifications.updateNotificationSettings(t, { follow_up_due: false });
    const r = mailNotifications.collectAlerts(t);
    expect(r.added.length).toBe(0);
    expect(r.skipped.length).toBe(1);
    expect(r.skipped[0].reason).toBe("disabled");
  });

  it("returns a notification center with by-type breakdown", () => {
    const t = T();
    mailNotifications.notify(t, "rule_triggered", { key: "n1", title: "N1" });
    mailNotifications.notify(t, "rule_triggered", { key: "n2", title: "N2" });
    mailNotifications.notify(t, "storage_warning", { key: "n3", title: "N3" });
    const c = mailNotifications.notificationCenter(t);
    expect(c.total).toBe(3);
    expect(c.unread).toBe(3);
    expect(c.byType.find((x: any) => x.type === "rule_triggered").count).toBe(2);
    expect(c.byType.find((x: any) => x.type === "storage_warning").count).toBe(1);
    expect(c.recent.length).toBe(3);
    expect(c.recent[0].link).toBeTruthy();
    expect(c.summary).toContain("3 unread");
  });
});
