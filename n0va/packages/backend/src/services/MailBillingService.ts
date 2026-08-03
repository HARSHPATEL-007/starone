import { DataStore } from "./DataStore";
import { mailboxService } from "./MailboxService";
import { estimateMessageBytes, formatBytes } from "./MailboxService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const GB = 1024 * 1024 * 1024;

export const PLAN_ORDER = ["free", "pro", "business", "n0va1o"] as const;
export type PlanId = (typeof PLAN_ORDER)[number];

export const PLANS: Record<string, any> = {
  free: {
    id: "free", name: "Free", priceMonthly: 0,
    limits: { mailboxes: 1, storageBytes: 5 * GB, contacts: 50, messagesPerDay: 100, domains: 0, webhooks: 1, agents: 1, campaigns: 2, integrations: 2 },
    features: ["1 mailbox", "5 GB storage", "100 messages / day", "Basic rules", "Community support"],
  },
  pro: {
    id: "pro", name: "Pro", priceMonthly: 12,
    limits: { mailboxes: 5, storageBytes: 100 * GB, contacts: 500, messagesPerDay: 1000, domains: 1, webhooks: 5, agents: 3, campaigns: 5, integrations: 5 },
    features: ["5 mailboxes", "100 GB storage", "1,000 messages / day", "Advanced rules", "Email priority support"],
  },
  business: {
    id: "business", name: "Business", priceMonthly: 49,
    limits: { mailboxes: 20, storageBytes: GB, contacts: 5000, messagesPerDay: 10000, domains: 5, webhooks: 20, agents: 10, campaigns: 20, integrations: 10 },
    features: ["20 mailboxes", "1 TB storage", "10,000 messages / day", "Custom domains", "Webhooks & integrations", "Priority support"],
  },
  n0va1o: {
    id: "n0va1o", name: "N0VA1O", priceMonthly: 199,
    limits: { mailboxes: 100, storageBytes: 5 * 1024 * GB, contacts: 50000, messagesPerDay: 100000, domains: 50, webhooks: 100, agents: 50, campaigns: 100, integrations: 25 },
    features: ["100 mailboxes", "5 TB storage", "100,000 messages / day", "Neural mailbox + agents", "Advanced security & compliance", "Dedicated success manager"],
  },
};

const USAGE_LABELS: Record<string, string> = {
  mailboxes: "Mailboxes",
  storageBytes: "Storage",
  contacts: "Contacts",
  messagesPerDay: "Messages / day",
  domains: "Domains",
  webhooks: "Webhooks",
  agents: "Agents",
  campaigns: "Campaigns",
  integrations: "Integrations",
};

const CARD_BRANDS = ["visa", "mastercard", "amex"];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function invoiceNumber(tenantId: string): string {
  const existing = DataStore.mem().find("mail_invoices", (i: any) => i.tenantId === tenantId);
  return `INV-${String(1000 + existing.length + 1).padStart(6, "0")}`;
}

export class MailBillingService {
  planCatalog() {
    return {
      order: PLAN_ORDER,
      plans: Object.keys(PLANS).map((id) => PLANS[id]),
      summary: `${PLAN_ORDER.length} plans — Free to N0VA1O`,
    };
  }

  tenantState(tenantId: string): any {
    const store = DataStore.mem();
    const existing = store.find("mail_billing", (b: any) => b.tenantId === tenantId);
    if (existing.length) return existing[0];
    const now = Date.now();
    const state = {
      tenantId,
      plan: "free" as PlanId,
      cycleStart: new Date(now).toISOString(),
      cycleEnd: new Date(now + 30 * 86400000).toISOString(),
      status: "active",
      autoRenew: true,
      paymentMethodId: null as string | null,
      updatedAt: new Date(now).toISOString(),
    };
    store.insert("mail_billing", state);
    return state;
  }

  computeUsage(tenantId: string) {
    const store = DataStore.mem();
    const mailboxes = mailboxService.listMailboxes(tenantId);
    const messages = store.find("messages", (m: any) => m.tenantId === tenantId);
    const today = new Date().toISOString().slice(0, 10);
    return {
      mailboxes: mailboxes.length,
      storageBytes: messages.reduce((s, m) => s + estimateMessageBytes(m), 0),
      contacts: store.find("mail_contacts", (c: any) => c.tenantId === tenantId).length,
      messagesPerDay: messages.filter((m: any) => {
        const d = String(m.receivedAt || m.sentAt || m.createdAt || "");
        return d.slice(0, 10) === today;
      }).length,
      domains: store.find("mail_domains", (d: any) => d.tenantId === tenantId).length,
      webhooks: store.find("mail_webhooks", (w: any) => w.tenantId === tenantId).length,
      agents: store.find("mail_agents", (a: any) => a.tenantId === tenantId).length,
      campaigns: store.find("mail_campaigns", (c: any) => c.tenantId === tenantId).length,
      integrations: store.find("mail_connections", (c: any) => c.tenantId === tenantId).length,
    };
  }

  usageRows(tenantId: string) {
    const state = this.tenantState(tenantId);
    const plan = PLANS[state.plan];
    const usage = this.computeUsage(tenantId);
    return Object.keys(plan.limits).map((dimension) => {
      const used = usage[dimension];
      const limit = plan.limits[dimension];
      const pct = limit === 0 ? (used > 0 ? 100 : 0) : Math.round((used / limit) * 100);
      return {
        dimension,
        label: USAGE_LABELS[dimension] || dimension,
        used,
        limit,
        pct,
        overLimit: used > limit,
        display: dimension === "storageBytes" ? `${formatBytes(used)} of ${formatBytes(limit)}` : `${used} / ${limit}`,
      };
    });
  }

  billingSummary(tenantId: string) {
    const state = this.tenantState(tenantId);
    const plan = PLANS[state.plan];
    const rows = this.usageRows(tenantId);
    const overLimits = rows.filter((r) => r.overLimit);
    const near = rows.filter((r) => !r.overLimit && r.pct >= 85);
    const status = overLimits.length ? "critical" : near.length ? "warning" : "ok";
    const rank = PLAN_ORDER.indexOf(state.plan as PlanId);
    let recommendedPlan: string | null = null;
    for (let i = rank + 1; i < PLAN_ORDER.length; i++) {
      const candidate = PLAN_ORDER[i];
      const fits = rows.every((r) => usageFits(r, PLANS[candidate].limits[r.dimension]));
      if (fits) { recommendedPlan = candidate; break; }
    }
    const daysLeft = Math.max(0, Math.min(30, Math.ceil((new Date(state.cycleEnd).getTime() - Date.now()) / 86400000)));
    return {
      plan: state.plan,
      planName: plan.name,
      priceMonthly: plan.priceMonthly,
      cycleStart: state.cycleStart,
      cycleEnd: state.cycleEnd,
      daysLeftInCycle: daysLeft,
      autoRenew: state.autoRenew,
      status,
      usage: rows,
      overLimits,
      recommendedPlan,
      nextInvoice: {
        amount: plan.priceMonthly,
        date: state.cycleEnd,
        autoRenew: state.autoRenew,
        paymentMethodId: state.paymentMethodId,
      },
      summary: `${plan.name} plan — ${status} — ${overLimits.length ? `${overLimits.length} limit(s) exceeded` : rows.every((r) => r.pct === 0) ? "no usage yet" : `${rows.filter((r) => r.pct > 0).length} dimension(s) in use`}${recommendedPlan ? ` — upgrade to ${PLANS[recommendedPlan].name} recommended` : ""}`,
    };
  }

  upgradePlan(tenantId: string, planId: string) {
    const target = String(planId || "").toLowerCase();
    if (!PLANS[target]) throw new Error(`Unknown plan "${planId}"`);
    const store = DataStore.mem();
    const state = this.tenantState(tenantId);
    if (state.plan === target) throw new Error(`Already on the ${PLANS[target].name} plan`);
    const from = state.plan;
    const rows = this.usageRows(tenantId);
    const fromRank = PLAN_ORDER.indexOf(from as PlanId);
    const toRank = PLAN_ORDER.indexOf(target as PlanId);
    if (toRank < fromRank) {
      const targetLimits = PLANS[target].limits;
      const violation = rows.find((r) => usageFits(r, targetLimits[r.dimension]) === false);
      if (violation) {
        throw new Error(`Cannot downgrade to ${PLANS[target].name}: ${violation.label} usage (${violation.display}) exceeds the plan limit`);
      }
    }
    const priceDiff = PLANS[target].priceMonthly - PLANS[from].priceMonthly;
    const daysLeft = Math.max(0, Math.min(30, Math.ceil((new Date(state.cycleEnd).getTime() - Date.now()) / 86400000)));
    const proration = round2(priceDiff * (daysLeft / 30));
    const invoice = {
      tenantId,
      number: invoiceNumber(tenantId),
      lines: [{ description: `Plan change: ${PLANS[from].name} → ${PLANS[target].name} (prorated ${daysLeft} day(s))`, amount: proration }],
      total: proration,
      status: "open" as string,
      issuedAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      paidAt: null as string | null,
      createdAt: new Date().toISOString(),
    };
    store.insert("mail_invoices", invoice);
    state.plan = target;
    state.status = "active";
    state.updatedAt = new Date().toISOString();
    store.update("mail_billing", (b: any) => b.tenantId === tenantId, { plan: target, status: "active", updatedAt: state.updatedAt });
    this.log(tenantId, "plan_change", `Plan ${PLANS[from].name} → ${PLANS[target].name} (prorated $${proration.toFixed(2)})`);
    return {
      plan: state.plan,
      planName: PLANS[target].name,
      proration,
      invoice,
      summary: `Plan changed to ${PLANS[target].name} — prorated charge $${proration.toFixed(2)}`,
    };
  }

  setPaymentMethod(tenantId: string, input: any = {}) {
    const store = DataStore.mem();
    const brand = String(input.brand || CARD_BRANDS[hashStr(tenantId + "card_brand") % CARD_BRANDS.length]).toLowerCase();
    const last4 = String(input.last4 || String(hashStr(tenantId + "card_last4") % 10000).padStart(4, "0"));
    const expMonth = Number(input.expMonth || ((hashStr(tenantId + "card_exp_m") % 12) + 1));
    const expYear = Number(input.expYear || new Date().getFullYear() + 3);
    if (!/^\d{4}$/.test(last4)) throw new Error("last4 must be exactly 4 digits");
    if (expMonth < 1 || expMonth > 12) throw new Error("expMonth must be 1-12");
    const method = {
      tenantId,
      brand,
      last4,
      expMonth,
      expYear,
      billingName: String(input.billingName || "Account owner").trim(),
      isDefault: true,
      createdAt: new Date().toISOString(),
    };
    const inserted = store.insert("mail_payment_methods", method);
    store.update("mail_payment_methods", (pm: any) => pm.tenantId === tenantId && pm._id !== inserted._id, { isDefault: false });
    const state = this.tenantState(tenantId);
    store.update("mail_billing", (b: any) => b.tenantId === tenantId, { paymentMethodId: inserted._id, updatedAt: new Date().toISOString() });
    this.log(tenantId, "payment_method", `${brand} •••• ${last4} added as default`);
    return { methodId: inserted._id, ...method, summary: `${brand} •••• ${last4} added as default payment method` };
  }

  paymentMethods(tenantId: string) {
    const list = DataStore.mem()
      .find("mail_payment_methods", (pm: any) => pm.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { paymentMethods: list, total: list.length, defaultMethodId: list.find((pm: any) => pm.isDefault)?._id || null };
  }

  getPaymentMethod(methodId: string) {
    const method = DataStore.mem().findOne("mail_payment_methods", (pm: any) => pm._id === methodId);
    if (!method) throw new Error("Payment method not found");
    return { methodId: method._id, ...method };
  }

  removePaymentMethod(methodId: string) {
    const store = DataStore.mem();
    const method = store.findOne("mail_payment_methods", (pm: any) => pm._id === methodId);
    if (!method) throw new Error("Payment method not found");
    store.delete("mail_payment_methods", (pm: any) => pm._id === methodId);
    store.update("mail_billing", (b: any) => b.tenantId === method.tenantId && b.paymentMethodId === methodId, { paymentMethodId: null });
    this.log(method.tenantId, "payment_method", `${method.brand} •••• ${method.last4} removed`);
    return { methodId, summary: `${method.brand} •••• ${method.last4} removed` };
  }

  createInvoice(tenantId: string, input: any = {}) {
    const lines = Array.isArray(input.lines) && input.lines.length ? input.lines : [{ description: String(input.description || "Manual charge").trim(), amount: Number(input.amount || 0) }];
    const invoice = {
      tenantId,
      number: invoiceNumber(tenantId),
      lines,
      total: round2(lines.reduce((s: number, l: any) => s + Number(l.amount || 0), 0)),
      status: "open" as string,
      issuedAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      paidAt: null as string | null,
      createdAt: new Date().toISOString(),
    };
    const inserted = DataStore.mem().insert("mail_invoices", invoice);
    this.log(tenantId, "invoice", `Invoice ${invoice.number} issued — $${invoice.total.toFixed(2)}`);
    return { invoice: { invoiceId: inserted._id, ...inserted }, summary: `Invoice ${invoice.number} issued — $${invoice.total.toFixed(2)}` };
  }

  invoices(tenantId: string) {
    const list = DataStore.mem()
      .find("mail_invoices", (i: any) => i.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
    const paid = list.filter((i: any) => i.status === "paid");
    const open = list.filter((i: any) => i.status === "open");
    return {
      invoices: list,
      total: list.length,
      paidTotal: round2(paid.reduce((s, i) => s + Number(i.total || 0), 0)),
      openTotal: round2(open.reduce((s, i) => s + Number(i.total || 0), 0)),
      summary: `${list.length} invoice(s) — $${round2(open.reduce((s, i) => s + Number(i.total || 0), 0)).toFixed(2)} open`,
    };
  }

  getInvoice(invoiceId: string) {
    const invoice = DataStore.mem().findOne("mail_invoices", (i: any) => i._id === invoiceId);
    if (!invoice) throw new Error("Invoice not found");
    return { invoiceId: invoice._id, ...invoice };
  }

  payInvoice(invoiceId: string) {
    const store = DataStore.mem();
    const invoice = store.findOne("mail_invoices", (i: any) => i._id === invoiceId);
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "paid") {
      return { invoiceId, status: "paid", summary: `Invoice ${invoice.number} already paid` };
    }
    const paidAt = new Date().toISOString();
    store.update("mail_invoices", (i: any) => i._id === invoiceId, { status: "paid", paidAt });
    this.log(invoice.tenantId, "invoice_paid", `Invoice ${invoice.number} paid — $${invoice.total.toFixed(2)}`);
    return { invoiceId, status: "paid", paidAt, summary: `Invoice ${invoice.number} paid — $${invoice.total.toFixed(2)}` };
  }

  usageForecast(tenantId: string) {
    const state = this.tenantState(tenantId);
    const plan = PLANS[state.plan];
    const usage = this.computeUsage(tenantId);
    const growthPerDayMb = 1 + (hashStr(tenantId + "storage_growth") % 4);
    const growthPerDayBytes = growthPerDayMb * 1024 * 1024;
    const used = usage.storageBytes;
    const limit = plan.limits.storageBytes;
    const daysToQuota = used >= limit ? 0 : Math.ceil((limit - used) / growthPerDayBytes);
    const projectedDate = daysToQuota === 0 ? null : new Date(Date.now() + daysToQuota * 86400000).toISOString().slice(0, 10);
    const projected90 = used + growthPerDayBytes * 90;
    const atRisk = daysToQuota > 0 && daysToQuota <= 90;
    let recommendedPlan: string | null = null;
    for (let i = PLAN_ORDER.indexOf(state.plan as PlanId) + 1; i < PLAN_ORDER.length; i++) {
      if (projected90 <= PLANS[PLAN_ORDER[i]].limits.storageBytes) { recommendedPlan = PLAN_ORDER[i]; break; }
    }
    return {
      growthPerDayBytes,
      growthPerDayMb,
      usedBytes: used,
      limitBytes: limit,
      daysToQuota,
      projectedDate,
      projected90Bytes: projected90,
      atRisk,
      recommendedPlan,
      summary: `~${growthPerDayMb} MB/day growth — ${daysToQuota === 0 ? "quota exhausted" : `quota hit in ${daysToQuota} day(s)${projectedDate ? ` (${projectedDate})` : ""}`}${atRisk ? " — under 90 days, consider upgrading" : ""}`,
    };
  }

  log(tenantId: string, category: string, detail: string) {
    DataStore.mem().insert("mail_billing_log", {
      tenantId, category, detail, at: new Date().toISOString(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }

  billingLog(tenantId: string) {
    const log = DataStore.mem()
      .find("mail_billing_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 50);
    return { entries: log, total: log.length, summary: `${log.length} billing event(s)` };
  }

  billingDashboard(tenantId: string) {
    const summary = this.billingSummary(tenantId);
    const forecast = this.usageForecast(tenantId);
    const inv = this.invoices(tenantId);
    const pms = this.paymentMethods(tenantId);
    const log = this.billingLog(tenantId).entries.slice(0, 8);
    return {
      plan: summary.plan,
      planName: summary.planName,
      priceMonthly: summary.priceMonthly,
      status: summary.status,
      summary: summary.summary,
      usage: summary.usage,
      overLimits: summary.overLimits,
      recommendedPlan: summary.recommendedPlan,
      nextInvoice: summary.nextInvoice,
      daysLeftInCycle: summary.daysLeftInCycle,
      forecast,
      invoices: inv.invoices.slice(0, 10),
      invoiceTotals: { paidTotal: inv.paidTotal, openTotal: inv.openTotal },
      paymentMethods: pms.paymentMethods,
      defaultPaymentMethodId: pms.defaultMethodId,
      plans: Object.keys(PLANS).map((id) => PLANS[id]),
      log,
      generatedAt: new Date().toISOString(),
    };
  }
}

function usageFits(row: any, limit: number): boolean {
  return row.used <= limit;
}

export const mailBilling = new MailBillingService();
