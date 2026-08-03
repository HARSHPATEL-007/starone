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

export const ADDONS: Record<string, any> = {
  storage_100gb: { id: "storage_100gb", name: "100 GB extra storage", category: "storage", monthlyPrice: 5, unit: "GB", amount: 100, dimension: "storageBytes" },
  storage_500gb: { id: "storage_500gb", name: "500 GB extra storage", category: "storage", monthlyPrice: 20, unit: "GB", amount: 500, dimension: "storageBytes" },
  domain_5: { id: "domain_5", name: "5 extra domains", category: "domains", monthlyPrice: 6, unit: "domains", amount: 5, dimension: "domains" },
  domain_20: { id: "domain_20", name: "20 extra domains", category: "domains", monthlyPrice: 20, unit: "domains", amount: 20, dimension: "domains" },
  mailbox_10: { id: "mailbox_10", name: "10 extra mailboxes", category: "mailboxes", monthlyPrice: 10, unit: "mailboxes", amount: 10, dimension: "mailboxes" },
  contact_1000: { id: "contact_1000", name: "1,000 extra contacts", category: "contacts", monthlyPrice: 4, unit: "contacts", amount: 1000, dimension: "contacts" },
};

export const OVERAGE_RATES: Record<string, number> = {
  storageBytes: 2,
  mailboxes: 3,
  contacts: 0.01,
  messagesPerDay: 0.001,
  domains: 5,
  webhooks: 0.5,
  agents: 2,
  campaigns: 1,
  integrations: 1,
};

export const DEFAULT_ALERT_THRESHOLD = 85;

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
    const limits = this.effectiveLimits(state);
    const usage = this.computeUsage(tenantId);
    return Object.keys(limits).map((dimension) => {
      const used = usage[dimension];
      const limit = limits[dimension];
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

  effectiveLimits(state: any): Record<string, number> {
    const plan = PLANS[state.plan];
    const limits: Record<string, number> = { ...plan.limits };
    for (const a of state.addons || []) {
      const def = ADDONS[a.addonId];
      if (!def) continue;
      const dim = def.dimension;
      limits[dim] = (limits[dim] || 0) + (dim === "storageBytes" ? def.amount * GB : def.amount);
    }
    return limits;
  }

  addonCatalog() {
    return { addons: Object.keys(ADDONS).map((id) => ADDONS[id]), total: Object.keys(ADDONS).length, summary: `${Object.keys(ADDONS).length} add-ons — storage, domains, mailboxes and contacts` };
  }

  listAddons(tenantId: string) {
    const state = this.tenantState(tenantId);
    const list = (state.addons || []).map((a: any) => {
      const def = ADDONS[a.addonId];
      return { addonId: a.addonId, name: def ? def.name : a.addonId, monthlyPrice: a.monthlyPrice, addedAt: a.addedAt, dimension: def ? def.dimension : null, amount: def ? def.amount : null };
    });
    const monthlyTotal = round2(list.reduce((s: number, a: any) => s + Number(a.monthlyPrice || 0), 0));
    return { addons: list, total: list.length, monthlyTotal, summary: `${list.length} add-on(s) — $${monthlyTotal.toFixed(2)}/mo` };
  }

  addAddon(tenantId: string, addonId: string) {
    const def = ADDONS[String(addonId || "")];
    if (!def) throw new Error(`Unknown add-on "${addonId}"`);
    const store = DataStore.mem();
    const state = this.tenantState(tenantId);
    if ((state.addons || []).some((a: any) => a.addonId === def.id)) throw new Error(`Add-on "${def.name}" already active`);
    const daysLeft = Math.max(0, Math.min(30, Math.ceil((new Date(state.cycleEnd).getTime() - Date.now()) / 86400000)));
    const prorated = round2(def.monthlyPrice * (daysLeft / 30));
    const invoice = {
      tenantId,
      kind: "addon" as string,
      number: invoiceNumber(tenantId),
      lines: [{ description: `Add-on: ${def.name} (prorated ${daysLeft} day(s))`, amount: prorated }],
      total: prorated,
      status: "open" as string,
      issuedAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      paidAt: null as string | null,
      createdAt: new Date().toISOString(),
    };
    const inserted = store.insert("mail_invoices", invoice);
    store.update("mail_billing", (b: any) => b.tenantId === tenantId, {
      addons: [...(state.addons || []), { addonId: def.id, monthlyPrice: def.monthlyPrice, addedAt: new Date().toISOString() }],
      updatedAt: new Date().toISOString(),
    });
    this.log(tenantId, "addon_added", `${def.name} added — prorated $${prorated.toFixed(2)}`);
    return { addonId: def.id, name: def.name, monthlyPrice: def.monthlyPrice, proration: prorated, invoice: { invoiceId: inserted._id, ...invoice }, summary: `${def.name} added — prorated $${prorated.toFixed(2)}` };
  }

  removeAddon(tenantId: string, addonId: string) {
    const store = DataStore.mem();
    const state = this.tenantState(tenantId);
    const active = (state.addons || []).find((a: any) => a.addonId === addonId);
    if (!active) throw new Error(`Add-on "${addonId}" is not active`);
    const def = ADDONS[addonId];
    const daysLeft = Math.max(0, Math.min(30, Math.ceil((new Date(state.cycleEnd).getTime() - Date.now()) / 86400000)));
    const refund = round2(Number(active.monthlyPrice || 0) * (daysLeft / 30));
    const credit = {
      tenantId,
      kind: "refund" as string,
      reason: `Add-on removal: ${def ? def.name : addonId}`,
      number: invoiceNumber(tenantId),
      lines: [{ description: `Refund — add-on ${def ? def.name : addonId} (prorated ${daysLeft} day(s))`, amount: -refund }],
      total: round2(-refund),
      status: "open" as string,
      issuedAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      paidAt: null as string | null,
      createdAt: new Date().toISOString(),
    };
    const inserted = store.insert("mail_invoices", credit);
    store.update("mail_billing", (b: any) => b.tenantId === tenantId, {
      addons: (state.addons || []).filter((a: any) => a.addonId !== addonId),
      updatedAt: new Date().toISOString(),
    });
    this.log(tenantId, "addon_removed", `${def ? def.name : addonId} removed — $${refund.toFixed(2)} credit`);
    return { addonId, refund, credit: { invoiceId: inserted._id, ...credit }, summary: `${def ? def.name : addonId} removed — $${refund.toFixed(2)} credit issued` };
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
    const contract = state.contractId
      ? DataStore.mem().findOne("mail_contracts", (c: any) => c._id === state.contractId && c.tenantId === tenantId)
      : null;
    const addonTotal = round2((state.addons || []).reduce((s: number, a: any) => s + Number(a.monthlyPrice || 0), 0));
    const effectivePrice = contract ? round2(Number(contract.annualPrice) / 12) : plan.priceMonthly;
    return {
      plan: state.plan,
      planName: plan.name,
      priceMonthly: plan.priceMonthly,
      effectiveMonthly: effectivePrice,
      addonMonthlyTotal: addonTotal,
      contractActive: !!contract,
      cycleStart: state.cycleStart,
      cycleEnd: state.cycleEnd,
      daysLeftInCycle: daysLeft,
      autoRenew: state.autoRenew,
      status,
      usage: rows,
      overLimits,
      recommendedPlan,
      nextInvoice: {
        amount: round2(effectivePrice + addonTotal),
        date: state.cycleEnd,
        autoRenew: state.autoRenew,
        paymentMethodId: state.paymentMethodId,
      },
      summary: `${plan.name} plan — ${status} — ${overLimits.length ? `${overLimits.length} limit(s) exceeded` : rows.every((r) => r.pct === 0) ? "no usage yet" : `${rows.filter((r) => r.pct > 0).length} dimension(s) in use`}${recommendedPlan ? ` — upgrade to ${PLANS[recommendedPlan].name} recommended` : ""}`,
    };
  }

  overagePolicy(tenantId: string, input: any = null) {
    const store = DataStore.mem();
    const state = this.tenantState(tenantId);
    if (input !== null && input !== undefined) {
      const mode = String(input.mode || state.overage?.mode || "warn");
      if (!["warn", "block", "bill"].includes(mode)) throw new Error(`overage mode must be one of warn, block, bill`);
      const rates = { ...OVERAGE_RATES, ...(input.rates && typeof input.rates === "object" ? input.rates : {}) };
      store.update("mail_billing", (b: any) => b.tenantId === tenantId, { overage: { mode, rates }, updatedAt: new Date().toISOString() });
      this.log(tenantId, "overage_policy", `Overage mode → ${mode}`);
      return { mode, rates, summary: `Overage mode: ${mode}` };
    }
    const policy = state.overage || { mode: "warn", rates: OVERAGE_RATES };
    return { mode: policy.mode, rates: policy.rates || OVERAGE_RATES, summary: `Overage mode: ${policy.mode || "warn"}` };
  }

  overageStatus(tenantId: string) {
    const state = this.tenantState(tenantId);
    const policy = state.overage || { mode: "warn", rates: OVERAGE_RATES };
    const rows = this.usageRows(tenantId);
    const daysLeft = Math.max(0, Math.min(30, Math.ceil((new Date(state.cycleEnd).getTime() - Date.now()) / 86400000)));
    const fraction = daysLeft / 30;
    const overages = rows
      .filter((r) => r.overLimit)
      .map((r) => {
        const rate = (policy.rates && policy.rates[r.dimension]) || OVERAGE_RATES[r.dimension] || 0;
        const units = r.dimension === "storageBytes" ? (r.used - r.limit) / GB : r.used - r.limit;
        const cost = round2(units * rate * fraction);
        return { dimension: r.dimension, label: r.label, overUnits: round2(units), rate, projectedCost: cost };
      });
    const projectedTotal = round2(overages.reduce((s, o) => s + o.projectedCost, 0));
    return {
      mode: policy.mode,
      overages,
      projectedTotal,
      count: overages.length,
      daysLeftInCycle: daysLeft,
      summary: overages.length === 0
        ? "No overages in the current cycle"
        : `${overages.length} dimension(s) over limit — projected $${projectedTotal.toFixed(2)} (mode: ${policy.mode})`,
    };
  }

  overageInvoice(tenantId: string) {
    const state = this.tenantState(tenantId);
    const policy = state.overage || { mode: "warn", rates: OVERAGE_RATES };
    if (policy.mode !== "bill") throw new Error("Overage billing is not enabled — set overage mode to 'bill' first");
    const status = this.overageStatus(tenantId);
    if (status.overages.length === 0) throw new Error("No overages to invoice");
    const store = DataStore.mem();
    const invoice = {
      tenantId,
      kind: "overage" as string,
      number: invoiceNumber(tenantId),
      lines: status.overages.map((o) => ({ description: `Overage: ${o.label} (${o.overUnits} unit(s) × $${o.rate})`, amount: o.projectedCost })),
      total: status.projectedTotal,
      status: "open" as string,
      issuedAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      paidAt: null as string | null,
      createdAt: new Date().toISOString(),
    };
    const inserted = store.insert("mail_invoices", invoice);
    this.log(tenantId, "overage_invoice", `Overage invoice ${invoice.number} issued — $${invoice.total.toFixed(2)}`);
    return { invoice: { invoiceId: inserted._id, ...invoice }, total: invoice.total, summary: `Overage invoice ${invoice.number} issued — $${invoice.total.toFixed(2)}` };
  }

  contracts(tenantId: string) {
    const list = DataStore.mem()
      .find("mail_contracts", (c: any) => c.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    return { contracts: list, total: list.length, summary: `${list.length} contract(s) on file` };
  }

  createContract(tenantId: string, input: any = {}) {
    const company = String(input.company || "").trim();
    const termMonths = Number(input.termMonths || 0);
    const annualPrice = Number(input.annualPrice || 0);
    const seats = Number(input.seats || 0);
    const email = String(input.contactEmail || "").trim();
    if (!company) throw new Error("company is required");
    if (![12, 24, 36].includes(termMonths)) throw new Error("termMonths must be 12, 24 or 36");
    if (!(annualPrice > 0)) throw new Error("annualPrice must be greater than 0");
    const store = DataStore.mem();
    const state = this.tenantState(tenantId);
    const standardAnnual = PLANS[state.plan].priceMonthly * 12;
    const discountPct = standardAnnual > 0 ? Math.round(100 * (1 - annualPrice / standardAnnual)) : 0;
    const start = new Date();
    const end = new Date(start.getTime() + termMonths * 30 * 86400000);
    const contract = {
      tenantId,
      company,
      termMonths,
      annualPrice,
      seats: seats || 1,
      contactEmail: email || "billing@company.com",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: "active" as string,
      discountPct: Math.max(0, discountPct),
      paymentSchedule: String(input.paymentSchedule || "annual"),
      createdAt: new Date().toISOString(),
    };
    const inserted = store.insert("mail_contracts", contract);
    store.update("mail_billing", (b: any) => b.tenantId === tenantId, { contractId: inserted._id, updatedAt: new Date().toISOString() });
    this.log(tenantId, "contract", `Contract created for ${company} — ${termMonths} mo @ $${annualPrice}/yr (${Math.max(0, discountPct)}% off standard)`);
    return { contractId: inserted._id, ...contract, summary: `Contract created for ${company} — $${annualPrice}/yr over ${termMonths} months` };
  }

  contractStatus(tenantId: string) {
    const state = this.tenantState(tenantId);
    const contract = state.contractId
      ? DataStore.mem().findOne("mail_contracts", (c: any) => c._id === state.contractId && c.tenantId === tenantId)
      : null;
    if (!contract) return { active: false, summary: "No enterprise contract — standard monthly billing applies" };
    const now = Date.now();
    const endMs = new Date(contract.endDate).getTime();
    const daysLeft = Math.max(0, Math.ceil((endMs - now) / 86400000));
    const effectivePrice = round2(contract.annualPrice / 12);
    return {
      active: true,
      company: contract.company,
      termMonths: contract.termMonths,
      annualPrice: contract.annualPrice,
      effectiveMonthly: effectivePrice,
      seats: contract.seats,
      contactEmail: contract.contactEmail,
      startDate: contract.startDate,
      endDate: contract.endDate,
      daysToRenewal: daysLeft,
      discountPct: contract.discountPct,
      paymentSchedule: contract.paymentSchedule,
      summary: `Enterprise contract with ${contract.company} — $${effectivePrice.toFixed(2)}/mo effective, renews in ${daysLeft} day(s)`,
    };
  }

  cancelContract(tenantId: string) {
    const state = this.tenantState(tenantId);
    const contract = state.contractId
      ? DataStore.mem().findOne("mail_contracts", (c: any) => c._id === state.contractId && c.tenantId === tenantId)
      : null;
    if (!contract || contract.status !== "active") throw new Error("No active contract");
    DataStore.mem().update("mail_contracts", (c: any) => c._id === contract._id, { status: "canceled", canceledAt: new Date().toISOString() });
    DataStore.mem().update("mail_billing", (b: any) => b.tenantId === tenantId, { contractId: null, updatedAt: new Date().toISOString() });
    this.log(tenantId, "contract", `Contract with ${contract.company} canceled`);
    return { contractId: contract._id, status: "canceled", summary: `Contract with ${contract.company} canceled` };
  }

  usageAlerts(tenantId: string) {
    const state = this.tenantState(tenantId);
    const cfg = state.alertThresholds || { enabled: true, thresholds: {} };
    const rows = this.usageRows(tenantId);
    const alerts = rows
      .map((r) => {
        const threshold = Number((cfg.thresholds && cfg.thresholds[r.dimension]) || DEFAULT_ALERT_THRESHOLD);
        if (r.overLimit) {
          return { type: r.dimension, dimension: r.dimension, severity: "critical", label: r.label, message: `${r.label} over limit — ${r.display}`, pct: r.pct };
        }
        if (r.pct >= threshold) {
          return { type: r.dimension, dimension: r.dimension, severity: "warning", label: r.label, message: `${r.label} at ${r.pct}% of limit — ${r.display}`, pct: r.pct };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (b.severity === "critical" ? 1 : 0) - (a.severity === "critical" ? 1 : 0));
    return {
      enabled: cfg.enabled,
      alerts,
      total: alerts.length,
      critical: alerts.filter((a: any) => a.severity === "critical").length,
      threshold: DEFAULT_ALERT_THRESHOLD,
      summary: `${alerts.length} usage alert(s) — ${alerts.filter((a: any) => a.severity === "critical").length} critical`,
    };
  }

  setAlertThresholds(tenantId: string, input: any = {}) {
    const store = DataStore.mem();
    const state = this.tenantState(tenantId);
    const cfg = state.alertThresholds || { enabled: true, thresholds: {} };
    const thresholds = { ...(cfg.thresholds || {}) };
    if (input.thresholds && typeof input.thresholds === "object") {
      for (const [k, v] of Object.entries(input.thresholds)) {
        const num = Number(v);
        if (num >= 0 && num <= 100) thresholds[k] = num;
      }
    }
    const enabled = input.enabled !== undefined ? !!input.enabled : cfg.enabled;
    store.update("mail_billing", (b: any) => b.tenantId === tenantId, { alertThresholds: { enabled, thresholds }, updatedAt: new Date().toISOString() });
    this.log(tenantId, "alert_settings", `Usage alerts ${enabled ? "enabled" : "disabled"} (${Object.keys(thresholds).length} custom threshold(s))`);
    return { enabled, thresholds, summary: `Usage alerts ${enabled ? "enabled" : "disabled"}` };
  }

  downgradePlan(tenantId: string, target: string) {
    const t = String(target || "").toLowerCase();
    if (!PLANS[t]) throw new Error(`Unknown plan "${target}"`);
    const state = this.tenantState(tenantId);
    if (state.plan === t) throw new Error(`Already on the ${PLANS[t].name} plan`);
    const from = state.plan;
    if (PLAN_ORDER.indexOf(t as PlanId) >= PLAN_ORDER.indexOf(from as PlanId)) throw new Error("Downgrade target must be a lower plan");
    const rows = this.usageRows(tenantId);
    const targetLimits = this.effectiveLimits({ ...state, plan: t });
    const violation = rows.find((r) => usageFits(r, targetLimits[r.dimension]) === false);
    if (violation) {
      const tl = targetLimits[violation.dimension];
      const display = violation.dimension === "storageBytes" ? `${formatBytes(violation.used)} of ${formatBytes(tl)}` : `${violation.used} / ${tl}`;
      throw new Error(`Cannot downgrade to ${PLANS[t].name}: ${violation.label} usage (${display}) exceeds the plan limit`);
    }
    const store = DataStore.mem();
    const daysLeft = Math.max(0, Math.min(30, Math.ceil((new Date(state.cycleEnd).getTime() - Date.now()) / 86400000)));
    const refund = round2((PLANS[from].priceMonthly - PLANS[t].priceMonthly) * (daysLeft / 30));
    const credit = {
      tenantId,
      kind: "refund" as string,
      reason: `Plan downgrade: ${PLANS[from].name} → ${PLANS[t].name}`,
      number: invoiceNumber(tenantId),
      lines: [{ description: `Refund — ${PLANS[from].name} → ${PLANS[t].name} (prorated ${daysLeft} day(s))`, amount: round2(-refund) }],
      total: round2(-refund),
      status: "open" as string,
      issuedAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      paidAt: null as string | null,
      createdAt: new Date().toISOString(),
    };
    const inserted = store.insert("mail_invoices", credit);
    store.update("mail_billing", (b: any) => b.tenantId === tenantId, { plan: t, status: "active", updatedAt: new Date().toISOString() });
    this.log(tenantId, "refund", `Downgrade ${PLANS[from].name} → ${PLANS[t].name} — $${refund.toFixed(2)} credit`);
    return {
      plan: t,
      planName: PLANS[t].name,
      refund,
      credit: { invoiceId: inserted._id, ...credit },
      summary: `Downgraded to ${PLANS[t].name} — $${refund.toFixed(2)} prorated credit issued`,
    };
  }

  setAutoRenew(tenantId: string, enabled: boolean) {
    const store = DataStore.mem();
    const state = this.tenantState(tenantId);
    const on = !!enabled;
    store.update("mail_billing", (b: any) => b.tenantId === tenantId, { autoRenew: on, status: on ? "active" : "canceling", updatedAt: new Date().toISOString() });
    this.log(tenantId, "auto_renew", `Auto-renew ${on ? "enabled" : "disabled"}`);
    return { autoRenew: on, status: on ? "active" : "canceling", summary: `Auto-renew ${on ? "enabled" : "disabled"} — subscription ${on ? "continues" : "ends at cycle close"}` };
  }

  cancelSubscription(tenantId: string) {
    const store = DataStore.mem();
    const state = this.tenantState(tenantId);
    store.update("mail_billing", (b: any) => b.tenantId === tenantId, { autoRenew: false, status: "canceling", updatedAt: new Date().toISOString() });
    this.log(tenantId, "subscription", "Subscription scheduled to cancel at cycle end");
    return { autoRenew: false, status: "canceling", cycleEnd: state.cycleEnd, summary: `Subscription cancels at cycle end (${new Date(state.cycleEnd).toLocaleDateString()})` };
  }

  creditBalance(tenantId: string) {
    const list = DataStore.mem().find("mail_invoices", (i: any) => i.tenantId === tenantId && Number(i.total || 0) < 0);
    const balance = round2(Math.abs(list.reduce((s, i) => s + Number(i.total || 0), 0)));
    return {
      balance,
      credits: list.map((i: any) => ({ invoiceId: i._id, number: i.number, amount: round2(Number(i.total)), reason: i.reason || i.lines?.[0]?.description || "credit", issuedAt: i.issuedAt })),
      total: list.length,
      summary: balance > 0 ? `$${balance.toFixed(2)} account credit — applies to next invoice` : "No outstanding credit",
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
      const targetLimits = this.effectiveLimits({ ...state, plan: target });
      const violation = rows.find((r) => usageFits(r, targetLimits[r.dimension]) === false);
      if (violation) {
        const tl = targetLimits[violation.dimension];
        const display = violation.dimension === "storageBytes" ? `${formatBytes(violation.used)} of ${formatBytes(tl)}` : `${violation.used} / ${tl}`;
        throw new Error(`Cannot downgrade to ${PLANS[target].name}: ${violation.label} usage (${display}) exceeds the plan limit`);
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
    const limits = this.effectiveLimits(state);
    const usage = this.computeUsage(tenantId);
    const growthPerDayMb = 1 + (hashStr(tenantId + "storage_growth") % 4);
    const growthPerDayBytes = growthPerDayMb * 1024 * 1024;
    const used = usage.storageBytes;
    const limit = limits.storageBytes;
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
      effectiveMonthly: summary.effectiveMonthly,
      addonMonthlyTotal: summary.addonMonthlyTotal,
      status: summary.status,
      summary: summary.summary,
      usage: summary.usage,
      overLimits: summary.overLimits,
      recommendedPlan: summary.recommendedPlan,
      nextInvoice: summary.nextInvoice,
      daysLeftInCycle: summary.daysLeftInCycle,
      autoRenew: summary.autoRenew,
      forecast,
      invoices: inv.invoices.slice(0, 10),
      invoiceTotals: { paidTotal: inv.paidTotal, openTotal: inv.openTotal },
      paymentMethods: pms.paymentMethods,
      defaultPaymentMethodId: pms.defaultMethodId,
      plans: Object.keys(PLANS).map((id) => PLANS[id]),
      addons: this.listAddons(tenantId),
      addonCatalog: this.addonCatalog(),
      overage: this.overageStatus(tenantId),
      contract: this.contractStatus(tenantId),
      alerts: this.usageAlerts(tenantId),
      credits: this.creditBalance(tenantId),
      log,
      generatedAt: new Date().toISOString(),
    };
  }
}

function usageFits(row: any, limit: number): boolean {
  return row.used <= limit;
}

export const mailBilling = new MailBillingService();
