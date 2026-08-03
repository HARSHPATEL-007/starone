import { DataStore } from "./DataStore";
import { mailboxService } from "./MailboxService";
import { formatBytes } from "./MailboxService";

export const NOTIFICATION_TYPES = [
  "rule_triggered", "follow_up_due", "snooze_expired", "campaign_pending", "spam_detected",
  "storage_warning", "ops_alert", "webhook_failed", "domain_flag", "agent_hitl",
  "integration_error", "invoice_due",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const TYPE_LABELS: Record<string, string> = {
  rule_triggered: "Rule triggered",
  follow_up_due: "Follow-up due",
  snooze_expired: "Snooze expired",
  campaign_pending: "Campaign approval",
  spam_detected: "Spam detected",
  storage_warning: "Storage warning",
  ops_alert: "Ops alert",
  webhook_failed: "Webhook failed",
  domain_flag: "Domain flagged",
  agent_hitl: "Agent approval",
  integration_error: "Integration error",
  invoice_due: "Invoice due",
};

export const TYPE_SEVERITY: Record<string, string> = {
  rule_triggered: "info",
  follow_up_due: "warning",
  snooze_expired: "info",
  campaign_pending: "info",
  spam_detected: "warning",
  storage_warning: "warning",
  ops_alert: "critical",
  webhook_failed: "warning",
  domain_flag: "warning",
  agent_hitl: "info",
  integration_error: "warning",
  invoice_due: "info",
};

export const TYPE_LINKS: Record<string, string> = {
  rule_triggered: "/mail/rules",
  follow_up_due: "/mail/followups",
  snooze_expired: "/mail",
  campaign_pending: "/mail/campaigns",
  spam_detected: "/mail/spam",
  storage_warning: "/mail/mailboxes",
  ops_alert: "/mail/ops",
  webhook_failed: "/mail/webhooks",
  domain_flag: "/mail/domains",
  agent_hitl: "/mail/agents",
  integration_error: "/mail/integrations",
  invoice_due: "/mail/billing",
};

export class MailNotificationService {
  notify(tenantId: string, type: string, input: any = {}) {
    if (!NOTIFICATION_TYPES.includes(type as NotificationType)) {
      throw new Error(`Unknown notification type "${type}"`);
    }
    const store = DataStore.mem();
    const key = input.key ? String(input.key) : null;
    if (key) {
      const dup = store.find(
        "mail_notifications",
        (n: any) => n.tenantId === tenantId && n.type === type && n.key === key && !n.read
      );
      if (dup.length) {
        return { created: false, reason: "duplicate", notification: dup[0] };
      }
    }
    const notification = {
      tenantId,
      type,
      key,
      title: String(input.title || TYPE_LABELS[type]),
      message: String(input.message || ""),
      severity: String(input.severity || TYPE_SEVERITY[type]),
      link: String(input.link || TYPE_LINKS[type]),
      read: false,
      createdAt: new Date().toISOString(),
    };
    const inserted = store.insert("mail_notifications", notification);
    return { created: true, notification: { notificationId: inserted._id, ...inserted } };
  }

  listNotifications(tenantId: string, opts: any = {}) {
    let list = DataStore.mem()
      .find("mail_notifications", (n: any) => n.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (opts.unreadOnly) list = list.filter((n: any) => !n.read);
    if (opts.type) list = list.filter((n: any) => n.type === opts.type);
    const limit = Number(opts.limit || 50);
    const rows = list.slice(0, limit).map((n: any) => ({ notificationId: n._id, ...n }));
    return { notifications: rows, total: list.length, unread: list.filter((n: any) => !n.read).length };
  }

  markRead(notificationId: string) {
    const store = DataStore.mem();
    const n = store.findOne("mail_notifications", (x: any) => x._id === notificationId);
    if (!n) throw new Error("Notification not found");
    store.update("mail_notifications", (x: any) => x._id === notificationId, { read: true });
    return { notificationId, read: true, summary: "Notification marked read" };
  }

  markAllRead(tenantId: string) {
    const list = DataStore.mem().find("mail_notifications", (n: any) => n.tenantId === tenantId && !n.read);
    DataStore.mem().update("mail_notifications", (n: any) => n.tenantId === tenantId && !n.read, { read: true });
    return { marked: list.length, summary: `${list.length} notification(s) marked read` };
  }

  deleteNotification(notificationId: string) {
    const store = DataStore.mem();
    const n = store.findOne("mail_notifications", (x: any) => x._id === notificationId);
    if (!n) throw new Error("Notification not found");
    store.delete("mail_notifications", (x: any) => x._id === notificationId);
    return { notificationId, summary: "Notification deleted" };
  }

  clearAll(tenantId: string) {
    const list = DataStore.mem().find("mail_notifications", (n: any) => n.tenantId === tenantId);
    DataStore.mem().delete("mail_notifications", (n: any) => n.tenantId === tenantId);
    return { cleared: list.length, summary: `${list.length} notification(s) cleared` };
  }

  notificationSettings(tenantId: string) {
    const store = DataStore.mem();
    const existing = store.find("mail_notification_settings", (s: any) => s.tenantId === tenantId);
    if (existing.length) return existing[0];
    const settings = {
      tenantId,
      types: Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t, true])),
      updatedAt: new Date().toISOString(),
    };
    store.insert("mail_notification_settings", settings);
    return settings;
  }

  updateNotificationSettings(tenantId: string, patch: any = {}) {
    const types = patch.types && typeof patch.types === "object" ? patch.types : patch;
    const unknown = Object.keys(types).filter((k) => !NOTIFICATION_TYPES.includes(k as NotificationType));
    if (unknown.length) throw new Error(`Unknown notification type "${unknown[0]}"`);
    const current = this.notificationSettings(tenantId);
    const merged = { ...current.types, ...types };
    DataStore.mem().update("mail_notification_settings", (s: any) => s.tenantId === tenantId, {
      types: merged,
      updatedAt: new Date().toISOString(),
    });
    return { types: merged, updatedAt: new Date().toISOString(), summary: "Notification settings updated" };
  }

  collectAlerts(tenantId: string, opts: any = {}) {
    const now = opts.now ? String(opts.now) : new Date().toISOString();
    const today = now.slice(0, 10);
    const settings = this.notificationSettings(tenantId).types;
    const added: any[] = [];
    const skipped: any[] = [];
    const tryAdd = (type: string, key: string, title: string, message: string) => {
      if (settings[type] === false) { skipped.push({ type, key, reason: "disabled" }); return; }
      const dup = DataStore.mem().find(
        "mail_notifications",
        (n: any) => n.tenantId === tenantId && n.type === type && n.key === key && !n.read
      );
      if (dup.length) { skipped.push({ type, key, reason: "duplicate" }); return; }
      this.notify(tenantId, type, { key, title, message });
      added.push({ type, key, title, message });
    };

    DataStore.mem()
      .find("mail_follow_ups", (f: any) => f.tenantId === tenantId && f.status === "open" && f.dueAt && f.dueAt <= now)
      .forEach((f: any) => {
        tryAdd("follow_up_due", `follow_up_due|${f._id}`, "Follow-up due", `"${f.subject || "Follow-up"}"${f.contactEmail ? ` to ${f.contactEmail}` : ""} is waiting for a reply — due ${String(f.dueAt).slice(0, 10)}`);
      });

    DataStore.mem()
      .find("messages", (m: any) => m.tenantId === tenantId && m.snoozed === true && m.snoozedUntil && m.snoozedUntil <= now)
      .forEach((m: any) => {
        tryAdd("snooze_expired", `snooze_expired|${m._id}`, "Snooze expired", `"${m.subject || "(no subject)"}" is back in your inbox`);
      });

    DataStore.mem()
      .find("mail_campaigns", (c: any) => c.tenantId === tenantId && c.status === "pending_approval")
      .forEach((c: any) => {
        tryAdd("campaign_pending", `campaign_pending|${c._id}`, "Campaign awaiting approval", `"${c.name || "Campaign"}" needs review before sending (${c.audienceMode || "query"} audience)`);
      });

    const spamToday = DataStore.mem()
      .find("mail_spam_log", (l: any) => l.tenantId === tenantId && String(l.at || "").slice(0, 10) === today).length;
    if (spamToday > 0) {
      tryAdd("spam_detected", `spam_detected|${today}`, "Spam quarantined", `${spamToday} spam message(s) caught and quarantined today`);
    }

    mailboxService.listMailboxes(tenantId)
      .filter((mb: any) => mb.percentUsed >= 75)
      .forEach((mb: any) => {
        tryAdd("storage_warning", `storage_warning|${mb.mailboxId}`, "Storage threshold reached", `"${mb.name}" is at ${mb.percentUsed}% of ${formatBytes(mb.quotaBytes)} quota`);
      });

    DataStore.mem()
      .find("mail_ops_incidents", (i: any) => i.tenantId === tenantId && i.status !== "resolved")
      .forEach((i: any) => {
        tryAdd("ops_alert", `ops_alert|${i._id}`, `Ops incident ${i.severity || "P4"}`, `${i.title || "Incident"} — ${i.responsePlan || "monitoring"}`);
      });

    DataStore.mem()
      .find("mail_webhook_deliveries", (d: any) => d.tenantId === tenantId && d.status === "failed")
      .forEach((d: any) => {
        tryAdd("webhook_failed", `webhook_failed|${d._id}`, "Webhook delivery failed", `Event ${d.event || "unknown"} to ${d.url || "webhook"} — ${d.error || "5xx upstream timeout"}`);
      });

    DataStore.mem()
      .find("mail_domains", (d: any) => d.tenantId === tenantId && d.status === "action_required")
      .forEach((d: any) => {
        const pending = Math.max(0, 6 - Number(d.verifiedCount || 0));
        tryAdd("domain_flag", `domain_flag|${d._id}`, "Domain action required", `${d.domain || "Domain"} has ${pending} DNS record(s) still pending verification`);
      });

    DataStore.mem()
      .find("mail_agent_hitl", (h: any) => h.tenantId === tenantId && h.status === "pending_review")
      .forEach((h: any) => {
        tryAdd("agent_hitl", `agent_hitl|${h._id}`, "Agent action awaiting approval", `${h.agentName || "Agent"} wants to run "${h.tool || "action"}" (risk ${h.riskScore || "?"}/100)`);
      });

    DataStore.mem()
      .find("mail_connections", (c: any) => c.tenantId === tenantId && (c.status === "error" || c.status === "needs_auth"))
      .forEach((c: any) => {
        tryAdd("integration_error", `integration_error|${c._id}`, "Integration needs attention", `${c.name || c.connectorId || "Connection"} is ${c.status === "needs_auth" ? "waiting for authorization" : "in error state"}`);
      });

    DataStore.mem()
      .find("mail_invoices", (i: any) => i.tenantId === tenantId && i.status === "open" && i.dueAt && i.dueAt <= now)
      .forEach((i: any) => {
        tryAdd("invoice_due", `invoice_due|${i._id}`, `Invoice ${i.number || ""} due`, `$${Number(i.total || 0).toFixed(2)} due ${String(i.dueAt).slice(0, 10)}`);
      });

    return {
      added,
      skipped,
      total: added.length,
      alerts: added.map((a) => ({ type: a.type, key: a.key, title: a.title, message: a.message, link: TYPE_LINKS[a.type] })),
      summary: `${added.length} alert(s) created${skipped.length ? `, ${skipped.length} skipped` : ""}`,
      scannedAt: now,
    };
  }

  notificationCenter(tenantId: string) {
    const all = DataStore.mem().find("mail_notifications", (n: any) => n.tenantId === tenantId);
    const byType = NOTIFICATION_TYPES
      .map((type) => ({
        type,
        label: TYPE_LABELS[type],
        count: all.filter((n: any) => n.type === type).length,
        unread: all.filter((n: any) => n.type === type && !n.read).length,
      }))
      .filter((row) => row.count > 0);
    const recent = [...all]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map((n: any) => ({ notificationId: n._id, type: n.type, title: n.title, message: n.message, severity: n.severity, link: n.link, read: n.read, createdAt: n.createdAt }));
    return {
      total: all.length,
      unread: all.filter((n: any) => !n.read).length,
      byType,
      recent,
      summary: `${all.filter((n: any) => !n.read).length} unread of ${all.length} notification(s)`,
    };
  }
}

export const mailNotifications = new MailNotificationService();
