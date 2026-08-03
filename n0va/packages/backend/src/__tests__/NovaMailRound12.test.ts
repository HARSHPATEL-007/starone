import { describe, it, expect } from "vitest";
import { mailBilling, ADDONS, OVERAGE_RATES } from "../services/MailBillingService";
import { DataStore } from "../services/DataStore";

let counter = 0;
function tenant(): string {
  counter += 1;
  return `nova-mail12_${counter}`;
}

function seedMailboxes(t: string, n: number) {
  const store = DataStore.mem();
  for (let i = 0; i < n; i++) {
    store.insert("mailboxes", {
      tenantId: t, name: `Box ${i}`, email: `box${i}@n0va.test`, type: "imap",
      enabled: true, createdAt: new Date().toISOString(),
    });
  }
}

describe("mailBilling add-ons (§3.3)", () => {
  it("exposes the add-on catalog", () => {
    const cat = mailBilling.addonCatalog();
    expect(cat.total).toBe(Object.keys(ADDONS).length);
    expect(cat.addons.map((a: any) => a.id)).toContain("storage_100gb");
    expect(cat.summary).toContain("add-ons");
  });

  it("lists no active add-ons on a fresh tenant", () => {
    const t = tenant();
    const r = mailBilling.listAddons(t);
    expect(r.total).toBe(0);
    expect(r.monthlyTotal).toBe(0);
  });

  it("adds an add-on with a prorated invoice and boosts effective limits", () => {
    const t = tenant();
    const r = mailBilling.addAddon(t, "storage_100gb");
    expect(r.addonId).toBe("storage_100gb");
    expect(r.proration).toBeGreaterThan(0);
    expect(r.invoice.kind).toBe("addon");
    expect(mailBilling.listAddons(t).total).toBe(1);
    const rows = mailBilling.usageRows(t);
    const storage = rows.find((x: any) => x.dimension === "storageBytes");
    expect(storage.limit).toBe(5 * 1024 * 1024 * 1024 + 100 * 1024 * 1024 * 1024);
  });

  it("rejects duplicates and unknown add-ons", () => {
    const t = tenant();
    mailBilling.addAddon(t, "domain_5");
    expect(() => mailBilling.addAddon(t, "domain_5")).toThrow(/already active/);
    expect(() => mailBilling.addAddon(t, "not_real")).toThrow(/Unknown add-on/);
  });

  it("removes an add-on and issues a prorated credit refund", () => {
    const t = tenant();
    mailBilling.addAddon(t, "mailbox_10");
    const r = mailBilling.removeAddon(t, "mailbox_10");
    expect(r.refund).toBeGreaterThan(0);
    expect(r.credit.total).toBeLessThan(0);
    expect(r.credit.kind).toBe("refund");
    expect(mailBilling.listAddons(t).total).toBe(0);
    expect(() => mailBilling.removeAddon(t, "mailbox_10")).toThrow(/not active/);
  });

  it("billingDashboard includes add-ons and catalog", () => {
    const t = tenant();
    mailBilling.addAddon(t, "storage_500gb");
    const d = mailBilling.billingDashboard(t);
    expect(d.addons.total).toBe(1);
    expect(d.addonCatalog.total).toBeGreaterThan(0);
    expect(d.addonMonthlyTotal).toBe(20);
  });

  it("billingDashboard exposes effective monthly price from an active contract", () => {
    const t = tenant();
    mailBilling.createContract(t, { company: "Acme", termMonths: 12, annualPrice: 480, seats: 5 });
    const d = mailBilling.billingDashboard(t);
    expect(d.contract.active).toBe(true);
    expect(d.effectiveMonthly).toBe(40);
  });
});

describe("mailBilling overage (§3.3)", () => {
  it("defaults to warn mode with no overages", () => {
    const t = tenant();
    const s = mailBilling.overageStatus(t);
    expect(s.mode).toBe("warn");
    expect(s.count).toBe(0);
    expect(s.projectedTotal).toBe(0);
  });

  it("computes projected overage cost when over a dimension", () => {
    const t = tenant();
    seedMailboxes(t, 3);
    const s = mailBilling.overageStatus(t);
    expect(s.count).toBe(1);
    const mb = s.overages.find((o: any) => o.dimension === "mailboxes");
    expect(mb.overUnits).toBe(2);
    expect(mb.rate).toBe(OVERAGE_RATES.mailboxes);
    expect(mb.projectedCost).toBeGreaterThan(0);
  });

  it("sets and persists the overage policy", () => {
    const t = tenant();
    const r = mailBilling.overagePolicy(t, { mode: "bill" });
    expect(r.mode).toBe("bill");
    expect(mailBilling.overagePolicy(t).mode).toBe("bill");
    expect(() => mailBilling.overagePolicy(t, { mode: "explode" })).toThrow(/must be one of/);
  });

  it("issues an overage invoice only in bill mode", () => {
    const t = tenant();
    seedMailboxes(t, 3);
    expect(() => mailBilling.overageInvoice(t)).toThrow(/not enabled/);
    mailBilling.overagePolicy(t, { mode: "bill" });
    const r = mailBilling.overageInvoice(t);
    expect(r.invoice.kind).toBe("overage");
    expect(r.total).toBeGreaterThan(0);
    expect(mailBilling.invoices(t).invoices.some((i: any) => i.kind === "overage")).toBe(true);
  });

  it("throws when invoicing with no overage", () => {
    const t = tenant();
    mailBilling.overagePolicy(t, { mode: "bill" });
    expect(() => mailBilling.overageInvoice(t)).toThrow(/No overages/);
  });
});

describe("mailBilling enterprise contracts (§3.3)", () => {
  it("creates an enterprise contract with discount vs standard pricing", () => {
    const t = tenant();
    mailBilling.upgradePlan(t, "business");
    const r = mailBilling.createContract(t, {
      company: "Acme Corp", termMonths: 12, annualPrice: 480, seats: 25, contactEmail: "it@acme.com",
    });
    expect(r.company).toBe("Acme Corp");
    expect(r.termMonths).toBe(12);
    expect(r.status).toBe("active");
    expect(r.discountPct).toBeGreaterThan(0);
  });

  it("validates contract input", () => {
    const t = tenant();
    expect(() => mailBilling.createContract(t, { company: "", termMonths: 12, annualPrice: 100 })).toThrow(/company is required/);
    expect(() => mailBilling.createContract(t, { company: "X", termMonths: 6, annualPrice: 100 })).toThrow(/termMonths must be/);
    expect(() => mailBilling.createContract(t, { company: "X", termMonths: 12, annualPrice: 0 })).toThrow(/annualPrice/);
  });

  it("reports contract status and applies effective pricing to the next invoice", () => {
    const t = tenant();
    expect(mailBilling.contractStatus(t).active).toBe(false);
    mailBilling.upgradePlan(t, "business");
    mailBilling.createContract(t, { company: "Acme Corp", termMonths: 12, annualPrice: 480, seats: 25 });
    const s = mailBilling.contractStatus(t);
    expect(s.active).toBe(true);
    expect(s.effectiveMonthly).toBe(40);
    expect(s.daysToRenewal).toBeGreaterThan(0);
    const sum = mailBilling.billingSummary(t);
    expect(sum.contractActive).toBe(true);
    expect(sum.nextInvoice.amount).toBe(40);
  });

  it("cancels an active contract", () => {
    const t = tenant();
    mailBilling.upgradePlan(t, "pro");
    mailBilling.createContract(t, { company: "Beta Inc", termMonths: 24, annualPrice: 200, seats: 10 });
    const r = mailBilling.cancelContract(t);
    expect(r.status).toBe("canceled");
    expect(() => mailBilling.cancelContract(t)).toThrow(/No active contract/);
  });
});

describe("mailBilling usage alerts (§3.3)", () => {
  it("flags over-limit dimensions as critical alerts", () => {
    const t = tenant();
    seedMailboxes(t, 3);
    const a = mailBilling.usageAlerts(t);
    expect(a.total).toBeGreaterThan(0);
    expect(a.critical).toBeGreaterThan(0);
    expect(a.alerts.find((x: any) => x.severity === "critical").dimension).toBe("mailboxes");
  });

  it("honors custom thresholds", () => {
    const t = tenant();
    mailBilling.setAlertThresholds(t, { thresholds: { mailboxes: 50 } });
    seedMailboxes(t, 1);
    const a = mailBilling.usageAlerts(t);
    expect(a.alerts.some((x: any) => x.severity === "warning" && x.dimension === "mailboxes")).toBe(true);
  });

  it("can be disabled and re-enabled", () => {
    const t = tenant();
    seedMailboxes(t, 3);
    mailBilling.setAlertThresholds(t, { enabled: false });
    expect(mailBilling.usageAlerts(t).enabled).toBe(false);
    mailBilling.setAlertThresholds(t, { enabled: true });
    expect(mailBilling.usageAlerts(t).enabled).toBe(true);
  });
});

describe("mailBilling downgrade & refunds (§3.3)", () => {
  it("downgrades and issues a prorated refund credit", () => {
    const t = tenant();
    mailBilling.upgradePlan(t, "business");
    const r = mailBilling.downgradePlan(t, "pro");
    expect(r.plan).toBe("pro");
    expect(r.refund).toBeGreaterThan(0);
    expect(r.credit.total).toBeLessThan(0);
    expect(mailBilling.billingSummary(t).plan).toBe("pro");
  });

  it("blocks downgrades that violate limits", () => {
    const t = tenant();
    mailBilling.upgradePlan(t, "business");
    seedMailboxes(t, 25);
    expect(() => mailBilling.downgradePlan(t, "free")).toThrow(/Cannot downgrade/);
  });

  it("rejects invalid downgrade targets", () => {
    const t = tenant();
    mailBilling.upgradePlan(t, "pro");
    expect(() => mailBilling.downgradePlan(t, "n0va1o")).toThrow(/must be a lower plan/);
    expect(() => mailBilling.downgradePlan(t, "ghost")).toThrow(/Unknown plan/);
  });

  it("tracks the credit balance from refunds", () => {
    const t = tenant();
    mailBilling.upgradePlan(t, "business");
    mailBilling.downgradePlan(t, "pro");
    const c = mailBilling.creditBalance(t);
    expect(c.balance).toBeGreaterThan(0);
    expect(c.total).toBeGreaterThan(0);
  });
});

describe("mailBilling auto-renew & cancel (§3.3)", () => {
  it("toggles auto-renew", () => {
    const t = tenant();
    expect(mailBilling.setAutoRenew(t, false).autoRenew).toBe(false);
    expect(mailBilling.setAutoRenew(t, true).autoRenew).toBe(true);
  });

  it("cancels the subscription at cycle end", () => {
    const t = tenant();
    const r = mailBilling.cancelSubscription(t);
    expect(r.status).toBe("canceling");
    expect(r.autoRenew).toBe(false);
    expect(r.cycleEnd).toBeTruthy();
  });

  it("dashboard carries all new sections", () => {
    const t = tenant();
    mailBilling.addAddon(t, "domain_5");
    mailBilling.createContract(t, { company: "Acme Corp", termMonths: 12, annualPrice: 100, seats: 5 });
    mailBilling.setAlertThresholds(t, { enabled: true });
    const d = mailBilling.billingDashboard(t);
    expect(d.addons.total).toBe(1);
    expect(d.contract.active).toBe(true);
    expect(d.overage.mode).toBeTruthy();
    expect(Array.isArray(d.alerts.alerts)).toBe(true);
    expect(d.credits).toBeTruthy();
    expect(d.autoRenew).toBe(true);
  });
});
