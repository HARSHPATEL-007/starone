import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function random6(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("n0va1o_trigger_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export const TRIGGER_EVENTS = [
  { event: "n0va1o.connection_established", description: "A connector connection was authorized", direction: "outbound" },
  { event: "n0va1o.agent_registered", description: "A new agent was registered with the gateway", direction: "outbound" },
  { event: "n0va1o.tool_discovered", description: "Intent-driven tool discovery injected tools", direction: "outbound" },
  { event: "n0va1o.recipe_compiled", description: "A recipe compiled to a deterministic API", direction: "outbound" },
  { event: "n0va1o.recipe_executed", description: "A recipe finished executing", direction: "outbound" },
  { event: "n0va1o.sandbox_created", description: "An ephemeral sandbox spawned", direction: "outbound" },
  { event: "n0va1o.sandbox_terminated", description: "An ephemeral sandbox terminated", direction: "outbound" },
  { event: "n0va1o.file_offloaded", description: "A >10MB payload offloaded to virtual filesystem", direction: "outbound" },
  { event: "n0va1o.hitl_escalated", description: "A tool call escalated for human review", direction: "outbound" },
  { event: "n0va1o.security_alert", description: "A security policy was triggered", direction: "outbound" },
] as const;

export const TRIGGER_SOURCES = [
  { id: "slack", name: "Slack", latencyTargetMs: 500 },
  { id: "github", name: "GitHub", latencyTargetMs: 5000 },
  { id: "webhook", name: "Generic Webhook", latencyTargetMs: 200 },
  { id: "internal", name: "N0VA1O Internal", latencyTargetMs: 50 },
] as const;

export class N0VA1OTriggerService {
  triggerCatalog() {
    return {
      events: TRIGGER_EVENTS,
      sources: TRIGGER_SOURCES,
      totalEvents: TRIGGER_EVENTS.length,
      summary: `${TRIGGER_EVENTS.length} bidirectional trigger events`,
    };
  }

  createTrigger(tenantId: string, input: any) {
    const event = String(input?.event || "");
    const catalogEvent = TRIGGER_EVENTS.find((e) => e.event === event);
    if (!catalogEvent) throw new Error(`Unknown trigger event — available: ${TRIGGER_EVENTS.map((e) => e.event).join(", ")}`);
    const sourceId = String(input?.source || "webhook");
    const source = TRIGGER_SOURCES.find((s) => s.id === sourceId);
    if (!source) throw new Error(`Unknown source — available: ${TRIGGER_SOURCES.map((s) => s.id).join(", ")}`);
    const targetUrl = String(input?.targetUrl || "").trim();
    if (!/^https?:\/\//.test(targetUrl)) throw new Error("targetUrl must be a valid http(s) URL");
    const row: any = {
      tenantId, event, source: source.id, sourceName: source.name,
      targetUrl,
      name: String(input?.name || `${source.name} → ${event}`),
      enabled: input?.enabled !== false,
      secret: `whsec_n0va1o_${hashStr(tenantId + event + targetUrl + "sec").toString(36)}${random6()}`,
      latencyTargetMs: source.latencyTargetMs,
      deliveryCount: 0, successCount: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const inserted = DataStore.mem().insert("n0va1o_triggers", row);
    logEntry(tenantId, "trigger_created", `Trigger "${row.name}" on ${event}`, { triggerId: inserted._id, source: row.source });
    return { triggerId: inserted._id, ...row, summary: `Trigger "${row.name}" created — fires on ${event}` };
  }

  listTriggers(tenantId: string) {
    const triggers = DataStore.mem().find("n0va1o_triggers", (t: any) => t.tenantId === tenantId);
    return {
      triggers: triggers.map((t: any) => ({ triggerId: t._id, name: t.name, event: t.event, source: t.source, targetUrl: t.targetUrl, enabled: t.enabled, latencyTargetMs: t.latencyTargetMs, deliveryCount: t.deliveryCount, successCount: t.successCount })),
      total: triggers.length,
      enabled: triggers.filter((t: any) => t.enabled).length,
    };
  }

  getTrigger(tenantId: string, triggerId: string) {
    const trigger = DataStore.mem().findOne("n0va1o_triggers", (t: any) => t.tenantId === tenantId && t._id === triggerId);
    if (!trigger) throw new Error("Trigger not found");
    return { triggerId: trigger._id, ...trigger };
  }

  toggleTrigger(tenantId: string, triggerId: string) {
    const trigger = DataStore.mem().findOne("n0va1o_triggers", (t: any) => t.tenantId === tenantId && t._id === triggerId);
    if (!trigger) throw new Error("Trigger not found");
    DataStore.mem().update("n0va1o_triggers", (t: any) => t._id === triggerId, { enabled: !trigger.enabled, updatedAt: new Date().toISOString() });
    logEntry(tenantId, "trigger_toggled", `Trigger "${trigger.name}" ${trigger.enabled ? "disabled" : "enabled"}`, { triggerId });
    return { triggerId, enabled: !trigger.enabled, summary: `Trigger "${trigger.name}" ${trigger.enabled ? "disabled" : "enabled"}` };
  }

  deleteTrigger(tenantId: string, triggerId: string) {
    const trigger = DataStore.mem().findOne("n0va1o_triggers", (t: any) => t.tenantId === tenantId && t._id === triggerId);
    if (!trigger) throw new Error("Trigger not found");
    DataStore.mem().delete("n0va1o_triggers", (t: any) => t._id === triggerId);
    logEntry(tenantId, "trigger_deleted", `Trigger "${trigger.name}" deleted`, {});
    return { triggerId, deleted: true, summary: `Trigger "${trigger.name}" deleted` };
  }

  fireEvent(tenantId: string, input: any) {
    const event = String(input?.event || "");
    const catalogEvent = TRIGGER_EVENTS.find((e) => e.event === event);
    if (!catalogEvent) throw new Error(`Unknown trigger event — available: ${TRIGGER_EVENTS.map((e) => e.event).join(", ")}`);
    const payload = input?.payload || {};
    const sourceId = String(input?.source || "internal");
    const source = TRIGGER_SOURCES.find((s) => s.id === sourceId) || TRIGGER_SOURCES[3];
    const matches = DataStore.mem().find("n0va1o_triggers", (t: any) => t.tenantId === tenantId && t.event === event && t.enabled);
    const deliveries = matches.map((t: any) => {
      const seed = `${tenantId}|${event}|${t._id}|${hashStr(JSON.stringify(payload))}`;
      const fail = hashStr(seed + "fail") % 7 === 0;
      const latencyMs = Math.min(t.latencyTargetMs, Math.max(20, (hashStr(seed + "lat") % t.latencyTargetMs) + 15));
      const signature = `sha256=${hashStr(seed + "sig").toString(16).padStart(64, "0")}`;
      const delivery: any = {
        tenantId, triggerId: t._id, triggerName: t.name, event,
        source: source.id, status: fail ? "failed" : "delivered",
        latencyMs, signature, targetUrl: t.targetUrl,
        payload, at: new Date().toISOString(),
      };
      const inserted = DataStore.mem().insert("n0va1o_deliveries", delivery);
      DataStore.mem().update("n0va1o_triggers", (x: any) => x._id === t._id, {
        deliveryCount: (t.deliveryCount || 0) + 1,
        successCount: (t.successCount || 0) + (fail ? 0 : 1),
        updatedAt: new Date().toISOString(),
      });
      return { deliveryId: inserted._id, ...delivery, deliveryIdRaw: inserted._id };
    });
    logEntry(tenantId, "event_fired", `${event} fired via ${source.id} — ${deliveries.length} trigger(s) matched`, { payload });
    return {
      event, source: source.id, matchedTriggers: deliveries.length,
      deliveries,
      summary: `${event} fired — ${deliveries.length} delivery(ies), ${deliveries.filter((d: any) => d.status === "delivered").length} succeeded`,
    };
  }

  listDeliveries(tenantId: string, limit = 25) {
    const deliveries = DataStore.mem().find("n0va1o_deliveries", (d: any) => d.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
    return { deliveries, total: deliveries.length };
  }

  triggerStats(tenantId: string) {
    const triggers = DataStore.mem().find("n0va1o_triggers", (t: any) => t.tenantId === tenantId);
    const deliveries = DataStore.mem().find("n0va1o_deliveries", (d: any) => d.tenantId === tenantId);
    const delivered = deliveries.filter((d: any) => d.status === "delivered");
    return {
      totalTriggers: triggers.length,
      enabledTriggers: triggers.filter((t: any) => t.enabled).length,
      totalDeliveries: deliveries.length,
      successRate: deliveries.length === 0 ? 100 : Math.round((delivered.length / deliveries.length) * 100),
      avgLatencyMs: deliveries.length === 0 ? 0 : Math.round(delivered.reduce((a, d: any) => a + d.latencyMs, 0) / deliveries.length),
      byEvent: TRIGGER_EVENTS.map((e) => ({ event: e.event, count: deliveries.filter((d: any) => d.event === e.event).length })),
      bySource: TRIGGER_SOURCES.map((s) => ({ source: s.id, count: deliveries.filter((d: any) => d.source === s.id).length })),
      summary: `${deliveries.length} delivery(ies) across ${triggers.length} trigger(s)`,
    };
  }

  triggerLog(tenantId: string, limit = 50) {
    const entries = DataStore.mem().find("n0va1o_trigger_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
    return { entries, total: entries.length };
  }

  triggerOverview(tenantId: string) {
    const triggers = DataStore.mem().find("n0va1o_triggers", (t: any) => t.tenantId === tenantId);
    return {
      events: TRIGGER_EVENTS.map((e) => ({ ...e, triggerCount: triggers.filter((t: any) => t.event === e.event).length })),
      sources: TRIGGER_SOURCES,
      totalTriggers: triggers.length,
      enabled: triggers.filter((t: any) => t.enabled).length,
      summary: `${triggers.filter((t: any) => t.enabled).length}/${triggers.length} trigger(s) active`,
    };
  }
}

export const n0va1oTrigger = new N0VA1OTriggerService();
