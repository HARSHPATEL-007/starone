import { createHmac } from "crypto";
import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function random6(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

export const WEBHOOK_EVENTS = [
  "mail.received", "mail.sent", "mail.read", "mail.thread_update", "mail.label_change",
  "mail.folder_change", "mail.spam_detected", "mail.delivery_failed", "mail.rule_triggered",
  "mail.attachment_scanned", "mail.ai_suggestion",
];

const EVENT_CATALOG: Record<string, { desc: string; example: string }> = {
  "mail.received": { desc: "New message received", example: "new inbox message" },
  "mail.sent": { desc: "Message sent", example: "outbound message delivered" },
  "mail.read": { desc: "Message marked read", example: "message opened" },
  "mail.thread_update": { desc: "Thread updated (reply/comment)", example: "new reply in thread" },
  "mail.label_change": { desc: "Label applied or removed", example: "label 'important' applied" },
  "mail.folder_change": { desc: "Folder / mailbox moved", example: "moved to archive" },
  "mail.spam_detected": { desc: "Spam quarantined", example: "sender blocked" },
  "mail.delivery_failed": { desc: "Outbound delivery failed", example: "bounced address" },
  "mail.rule_triggered": { desc: "Rule engine fired", example: "newsletter archived" },
  "mail.attachment_scanned": { desc: "Attachment scan completed", example: "clean / suspicious" },
  "mail.ai_suggestion": { desc: "AI suggestion generated", example: "smart reply ready" },
};

function signPayload(secret: string, timestamp: string, payload: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
}

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("mail_webhook_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export class MailWebhookService {
  webhookEvents() {
    return {
      events: WEBHOOK_EVENTS.map((e) => ({ event: e, desc: EVENT_CATALOG[e].desc, example: EVENT_CATALOG[e].example })),
      summary: `${WEBHOOK_EVENTS.length} webhook event types available`,
    };
  }

  listWebhooks(tenantId: string) {
    const hooks = DataStore.mem().find("mail_webhooks", (w: any) => w.tenantId === tenantId);
    const sorted = [...hooks].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted.map((w: any) => ({
      webhookId: w._id,
      url: w.url,
      label: w.label,
      events: w.events,
      active: w.active,
      secret: w.secret,
      createdAt: w.createdAt,
      lastDeliveryAt: w.lastDeliveryAt || null,
      deliveryCounts: w.deliveryCounts || { delivered: 0, failed: 0, retried: 0 },
    }));
  }

  createWebhook(tenantId: string, input: any) {
    const url = String((input && input.url) || "").trim();
    if (!/^https?:\/\/.+/.test(url)) throw new Error("webhook URL must start with http:// or https://");
    const events = Array.isArray(input && input.events) ? input.events : [];
    if (!events.length) throw new Error("At least one event is required");
    for (const e of events) {
      if (!WEBHOOK_EVENTS.includes(e)) throw new Error(`Unknown event "${e}"`);
    }
    const secret = `whsec_${hashStr(url + events.join(",")).toString(16)}_${random6()}`;
    const hook = DataStore.mem().insert("mail_webhooks", {
      tenantId,
      url,
      label: String((input && input.label) || url),
      events: [...new Set(events)],
      active: (input && input.active === false) ? false : true,
      secret,
      createdAt: new Date().toISOString(),
      lastDeliveryAt: null,
      deliveryCounts: { delivered: 0, failed: 0, retried: 0 },
    });
    logEntry(tenantId, "webhook_created", `Webhook for ${events.length} event(s) → ${url}`, { webhookId: hook._id });
    return {
      webhookId: hook._id,
      url: hook.url,
      label: hook.label,
      events: hook.events,
      active: hook.active,
      secret: hook.secret,
      summary: `Webhook registered for ${hook.events.length} event(s)`,
    };
  }

  updateWebhook(tenantId: string, webhookId: string, input: any) {
    const hook = DataStore.mem().findOne("mail_webhooks", (w: any) => w._id === webhookId && w.tenantId === tenantId);
    if (!hook) throw new Error(`Webhook "${webhookId}" not found`);
    const patch: any = {};
    if (input && input.url !== undefined) {
      const url = String(input.url).trim();
      if (!/^https?:\/\/.+/.test(url)) throw new Error("webhook URL must start with http:// or https://");
      patch.url = url;
    }
    if (input && input.label !== undefined) patch.label = String(input.label);
    if (input && input.events !== undefined) {
      const events = Array.isArray(input.events) ? input.events : [];
      if (!events.length) throw new Error("At least one event is required");
      for (const e of events) {
        if (!WEBHOOK_EVENTS.includes(e)) throw new Error(`Unknown event "${e}"`);
      }
      patch.events = [...new Set(events)];
    }
    if (input && input.active !== undefined) patch.active = !!input.active;
    const updated = DataStore.mem().update("mail_webhooks", (w: any) => w._id === webhookId && w.tenantId === tenantId, patch);
    const row = updated || { ...hook, ...patch };
    return {
      webhookId: row._id,
      url: row.url,
      label: row.label,
      events: row.events,
      active: row.active,
      summary: `Webhook ${row.active ? "enabled" : "paused"} — ${row.events.length} event(s)`,
    };
  }

  deleteWebhook(tenantId: string, webhookId: string) {
    const hook = DataStore.mem().findOne("mail_webhooks", (w: any) => w._id === webhookId && w.tenantId === tenantId);
    if (!hook) throw new Error(`Webhook "${webhookId}" not found`);
    DataStore.mem().delete("mail_webhooks", (w: any) => w._id === webhookId && w.tenantId === tenantId);
    logEntry(tenantId, "webhook_deleted", `Webhook ${webhookId} deleted`);
    return { webhookId, url: hook.url, summary: "Webhook deleted" };
  }

  private deliver(tenantId: string, hook: any, event: string, payload: any): any {
    const store = DataStore.mem();
    const deliveryId = `del_${Date.now()}_${random6()}`;
    const ts = new Date().toISOString();
    const body = JSON.stringify({ event, payload, deliveredAt: ts });
    const failed = hashStr(`${hook._id}|${event}|${(hook.events || []).join(",")}`) % 7 === 0;
    const attempts = failed ? 3 : 1;
    const retries = failed ? 2 : 0;
    const latencyMs = failed ? 0 : 40 + (hashStr(`${hook._id}|${event}|lat`) % 360);
    const signature = `sha256=${signPayload(hook.secret, ts, body)}`;
    store.insert("mail_webhook_deliveries", {
      tenantId,
      webhookId: hook._id,
      url: hook.url,
      event,
      deliveryId,
      status: failed ? "failed" : "delivered",
      attempts,
      retries,
      latencyMs,
      signature,
      timestamp: ts,
      error: failed ? "5xx upstream timeout" : null,
      payloadSample: body.slice(0, 160),
      at: ts,
      createdAt: ts,
      updatedAt: ts,
    });
    const counts = { ...(hook.deliveryCounts || { delivered: 0, failed: 0, retried: 0 }) };
    if (failed) counts.failed += 1;
    else counts.delivered += 1;
    counts.retried += retries;
    store.update("mail_webhooks", (w: any) => w._id === hook._id, {
      deliveryCounts: counts,
      lastDeliveryAt: ts,
    });
    return { deliveryId, event, status: failed ? "failed" : "delivered", signature, retries, summary: `${event} → ${failed ? "delivery failed after retries" : "delivered 200 OK"}` };
  }

  triggerEvent(tenantId: string, event: string, payload: any = {}) {
    if (!WEBHOOK_EVENTS.includes(event) && event !== "ping") throw new Error(`Unknown event "${event}"`);
    const hooks = DataStore.mem().find("mail_webhooks", (w: any) => w.tenantId === tenantId && w.active && w.events.includes(event));
    const results = hooks.map((h: any) => this.deliver(tenantId, h, event, payload));
    logEntry(tenantId, `event_${event}`, `Fired ${event} to ${results.length} endpoint(s)`, { fired: results.length });
    return {
      event,
      delivered: results.filter((r: any) => r.status === "delivered").length,
      failed: results.filter((r: any) => r.status === "failed").length,
      results,
      summary: `${event} fired → ${results.filter((r: any) => r.status === "delivered").length} delivered, ${results.filter((r: any) => r.status === "failed").length} failed`,
    };
  }

  testWebhook(tenantId: string, webhookId: string) {
    const hook = DataStore.mem().findOne("mail_webhooks", (w: any) => w._id === webhookId && w.tenantId === tenantId);
    if (!hook) throw new Error(`Webhook "${webhookId}" not found`);
    const r = this.deliver(tenantId, hook, "ping", { hello: "from n0va mail" });
    return { ...r, url: hook.url, summary: `Ping sent to ${hook.url} — ${r.status}` };
  }

  webhookDeliveries(tenantId: string, webhookId?: string) {
    const items = DataStore.mem().find("mail_webhook_deliveries", (d: any) => d.tenantId === tenantId && (!webhookId || d.webhookId === webhookId));
    const sorted = [...items].sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return {
      deliveries: sorted.slice(0, 50).map((d: any) => ({
        deliveryId: d.deliveryId,
        webhookId: d.webhookId,
        url: d.url,
        event: d.event,
        status: d.status,
        attempts: d.attempts,
        retries: d.retries,
        latencyMs: d.latencyMs,
        signature: d.signature,
        error: d.error || null,
        at: d.at,
      })),
      total: sorted.length,
      summary: `${sorted.length} delivery(ies)`,
    };
  }

  webhookStats(tenantId: string) {
    const hooks = DataStore.mem().find("mail_webhooks", (w: any) => w.tenantId === tenantId);
    const deliveries = DataStore.mem().find("mail_webhook_deliveries", (d: any) => d.tenantId === tenantId);
    const delivered = deliveries.filter((d: any) => d.status === "delivered").length;
    const failed = deliveries.filter((d: any) => d.status === "failed").length;
    const retried = deliveries.reduce((s: number, d: any) => s + (d.retries || 0), 0);
    const successRate = deliveries.length ? parseFloat(((delivered / deliveries.length) * 100).toFixed(1)) : 0;
    const subscriptions = hooks.reduce((s: number, h: any) => s + (h.active ? h.events.length : 0), 0);
    const fired = new Set(deliveries.map((d: any) => d.event)).size;
    return {
      webhooks: hooks.length,
      active: hooks.filter((h: any) => h.active).length,
      subscriptions,
      delivered,
      failed,
      retried,
      successRate,
      eventsFired: fired,
      totalDeliveries: deliveries.length,
      summary: `${hooks.length} endpoint(s) — ${subscriptions} subscription(s), ${successRate}% success rate`,
    };
  }

  webhookOverview(tenantId: string) {
    const stats = this.webhookStats(tenantId);
    const hooks = this.listWebhooks(tenantId);
    const deliveries = DataStore.mem().find("mail_webhook_deliveries", (d: any) => d.tenantId === tenantId);
    const catalog = WEBHOOK_EVENTS.map((e) => ({
      event: e,
      desc: EVENT_CATALOG[e].desc,
      example: EVENT_CATALOG[e].example,
      fired: deliveries.filter((d: any) => d.event === e).length,
      subscribers: hooks.filter((h: any) => h.active && h.events.includes(e)).length,
    }));
    const log = DataStore.mem().find("mail_webhook_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 20);
    return {
      ...stats,
      catalog,
      recent: this.webhookDeliveries(tenantId).deliveries.slice(0, 10),
      log: log.map((l: any) => ({ category: l.category, detail: l.detail, at: l.at })),
      generatedAt: new Date().toISOString(),
      summary: `Webhook center — ${stats.active} active endpoint(s), ${stats.successRate}% delivery success`,
      seed: hashStr(tenantId + "webhook_seed"),
    };
  }
}

export const mailWebhook = new MailWebhookService();
