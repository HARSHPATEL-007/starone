import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const PREFERENCE_CATEGORIES = [
  { id: "newsletter", label: "Newsletters" },
  { id: "promotions", label: "Promotions & offers" },
  { id: "product_updates", label: "Product updates" },
  { id: "security", label: "Security alerts" },
  { id: "events", label: "Events & webinars" },
  { id: "billing", label: "Billing & invoices" },
];

export const UNSUBSCRIBE_REASONS = [
  { id: "too_many", label: "Too many emails" },
  { id: "not_relevant", label: "Content not relevant" },
  { id: "never_signed_up", label: "I didn't sign up" },
  { id: "other", label: "Other" },
];

function defaultPrefs(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const c of PREFERENCE_CATEGORIES) out[c.id] = true;
  return out;
}

export class MailUnsubscribeService {
  private prefsFor(tenantId: string, email: string): any {
    const existing = DataStore.mem().findOne("mail_preferences", (p: any) => p.tenantId === tenantId && p.email === email);
    if (existing) return existing;
    const row = DataStore.mem().insert("mail_preferences", {
      tenantId,
      email,
      categories: defaultPrefs(),
      unsubscribed: false,
      unsubscribedAt: null,
      reason: null,
      source: null,
      updatedAt: new Date().toISOString(),
    });
    return row;
  }

  generateUnsubscribeLink(tenantId: string, email: string, category?: string) {
    const em = String(email || "").toLowerCase();
    if (!em) throw new Error("Email is required");
    if (category && !PREFERENCE_CATEGORIES.some((c) => c.id === category)) throw new Error(`Category must be one of ${PREFERENCE_CATEGORIES.map((c) => c.id).join("/")}`);
    const token = `uns_${hashStr(`${tenantId}|${em}|${category || "all"}`).toString(36)}`;
    const link = `https://n0va.io/unsubscribe/${token}${category ? `?cat=${category}` : ""}`;
    DataStore.mem().insert("mail_unsubscribe_links", { tenantId, email: em, token, category: category || null, createdAt: new Date().toISOString() });
    return { token, link, email: em, summary: `Unsubscribe link generated for ${em}` };
  }

  unsubscribe(tenantId: string, input: any) {
    const em = String((input && (input.email || input.token)) || "").toLowerCase();
    if (!em) throw new Error("Email or token is required");
    const prefs = this.prefsFor(tenantId, em);
    const already = prefs.unsubscribed;
    const reason = (input && input.reason) || "other";
    const categories = defaultPrefs();
    if (input.category && PREFERENCE_CATEGORIES.some((c) => c.id === input.category)) categories[input.category] = false;
    DataStore.mem().update("mail_preferences", (p: any) => p._id === prefs._id && p.tenantId === tenantId, {
      categories,
      unsubscribed: true,
      unsubscribedAt: new Date().toISOString(),
      reason,
      source: (input && input.source) || "link",
      updatedAt: new Date().toISOString(),
    });
    if (!already) {
      DataStore.mem().insert("mail_unsubscribes", { tenantId, email: em, reason, category: input.category || null, source: (input && input.source) || "link", at: new Date().toISOString() });
    }
    return { email: em, unsubscribed: true, summary: already ? `${em} was already unsubscribed` : `${em} unsubscribed${input.category ? ` from ${input.category}` : ""}` };
  }

  getPreferences(tenantId: string, email: string) {
    const prefs = this.prefsFor(tenantId, String(email || "").toLowerCase());
    return { email: prefs.email, categories: prefs.categories, unsubscribed: prefs.unsubscribed, updatedAt: prefs.updatedAt };
  }

  updatePreferences(tenantId: string, email: string, patch: any) {
    const em = String(email || "").toLowerCase();
    if (!em) throw new Error("Email is required");
    const prefs = this.prefsFor(tenantId, em);
    const categories = { ...prefs.categories, ...(patch.categories || {}) };
    const unsubscribed = patch.unsubscribed !== undefined ? !!patch.unsubscribed : prefs.unsubscribed;
    DataStore.mem().update("mail_preferences", (p: any) => p._id === prefs._id && p.tenantId === tenantId, {
      categories,
      unsubscribed,
      unsubscribedAt: unsubscribed ? prefs.unsubscribedAt || new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    });
    return { email: em, categories, unsubscribed, summary: `Preferences updated for ${em}` };
  }

  unsubscribeStatus(tenantId: string, email: string) {
    const em = String(email || "").toLowerCase();
    const prefs = this.prefsFor(tenantId, em);
    const disabled = PREFERENCE_CATEGORIES.filter((c) => !prefs.categories[c.id]).map((c) => c.id);
    return {
      email: em,
      unsubscribed: prefs.unsubscribed,
      categories: prefs.categories,
      disabledCategories: disabled,
      since: prefs.unsubscribedAt,
      summary: prefs.unsubscribed ? `${em} is unsubscribed` : `${em} is subscribed${disabled.length ? ` (opted out of ${disabled.length})` : ""}`,
    };
  }

  unsubscribeLog(tenantId: string, limit = 25) {
    const log = DataStore.mem().find("mail_unsubscribes", (u: any) => u.tenantId === tenantId)
      .sort((a: any, b: any) => (a.at < b.at ? 1 : -1));
    return { entries: log.slice(0, limit).map((u: any) => ({ unsubscribeId: u._id, ...u })), total: log.length };
  }

  unsubscribeDashboard(tenantId: string) {
    const log = this.unsubscribeLog(tenantId);
    const byReason: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const u of log.entries) {
      byReason[u.reason] = (byReason[u.reason] || 0) + 1;
      bySource[u.source] = (bySource[u.source] || 0) + 1;
    }
    const prefs = DataStore.mem().find("mail_preferences", (p: any) => p.tenantId === tenantId);
    return {
      total: log.total,
      byReason,
      bySource,
      subscribed: prefs.filter((p: any) => !p.unsubscribed).length,
      unsubscribed: prefs.filter((p: any) => p.unsubscribed).length,
      recent: log.entries.slice(0, 5),
      summary: `${log.total} unsubscribe(s), ${byReason.not_relevant || 0} marked not relevant`,
    };
  }
}

export const mailUnsubscribe = new MailUnsubscribeService();
