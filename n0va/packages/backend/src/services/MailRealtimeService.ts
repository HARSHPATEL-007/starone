export const MAIL_EVENTS = [
  { event: "mail.received", direction: "server_to_client", payload: "Message metadata", trigger: "New inbound message" },
  { event: "mail.sent", direction: "server_to_client", payload: "Delivery status", trigger: "Outbound message status" },
  { event: "mail.read", direction: "bidirectional", payload: "Message ID + timestamp", trigger: "Read receipt" },
  { event: "mail.thread_update", direction: "server_to_client", payload: "Thread diff", trigger: "Thread modification" },
  { event: "mail.label_change", direction: "server_to_client", payload: "Label + message IDs", trigger: "Label applied/removed" },
  { event: "mail.folder_change", direction: "server_to_client", payload: "Folder + message IDs", trigger: "Message moved" },
  { event: "mail.spam_detected", direction: "server_to_client", payload: "Message ID + score", trigger: "Spam classification" },
  { event: "mail.ai_suggestion", direction: "server_to_client", payload: "Suggestion + context", trigger: "AI-generated content" },
];

const EVENT_SET = new Set(MAIL_EVENTS.map((e) => e.event));

export class MailRealtimeService {
  private io: any = null;
  private buffer: { event: string; tenantId: string; payload: any; at: string }[] = [];
  private readonly MAX_BUFFER = 200;

  setIO(io: any) {
    this.io = io;
  }

  isWired() {
    return this.io !== null;
  }

  private broadcast(event: string, tenantId: string, payload: any) {
    try {
      if (this.io) this.io.to(`tenant:${tenantId}`).emit(event, payload);
    } catch (err) {
      console.error(`[mailRealtime] broadcast ${event} failed:`, err);
    }
  }

  emit(event: string, tenantId: string, payload: any = {}) {
    if (!EVENT_SET.has(event)) throw new Error(`Unknown mail event "${event}" — use one of: ${MAIL_EVENTS.map((e) => e.event).join(", ")}`);
    this.broadcast(event, tenantId, payload);
    this.buffer.push({ event, tenantId, payload, at: new Date().toISOString() });
    if (this.buffer.length > this.MAX_BUFFER) this.buffer = this.buffer.slice(-this.MAX_BUFFER);
    return { event, tenantId, at: this.buffer[this.buffer.length - 1].at };
  }

  clearBuffer() {
    this.buffer = [];
  }

  recentEvents(tenantId?: string, limit = 20) {
    const filtered = tenantId ? this.buffer.filter((b) => b.tenantId === tenantId) : this.buffer;
    return filtered.slice(-limit).reverse();
  }

  eventCounts(tenantId?: string) {
    const filtered = tenantId ? this.buffer.filter((b) => b.tenantId === tenantId) : this.buffer;
    const counts: Record<string, number> = {};
    for (const b of filtered) counts[b.event] = (counts[b.event] || 0) + 1;
    return counts;
  }

  realtimeOverview(tenantId: string) {
    const counts = this.eventCounts(tenantId);
    const recent = this.recentEvents(tenantId, 10);
    const total = Object.values(counts).reduce((s: number, n) => s + n, 0);
    return {
      eventCatalog: MAIL_EVENTS,
      counts,
      total,
      wired: this.isWired(),
      recent,
      summary: `${total} mail event(s) observed · ${Object.keys(counts).length} event type(s)`,
    };
  }

  realtimeLog(tenantId: string, limit = 25) {
    const log = this.recentEvents(tenantId, limit).map((b) => ({ event: b.event, at: b.at, ...b.payload }));
    return { log, total: log.length };
  }
}

export const mailRealtime = new MailRealtimeService();
