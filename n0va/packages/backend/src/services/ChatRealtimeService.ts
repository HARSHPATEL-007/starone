export const CHAT_EVENTS = [
  { event: "message.new", direction: "server_to_client", payload: "Message ID + room + sender + content + timestamp", trigger: "New message received" },
  { event: "message.updated", direction: "server_to_client", payload: "Message ID + content + edit history", trigger: "Message edited" },
  { event: "message.deleted", direction: "server_to_client", payload: "Message ID + deleted_at", trigger: "Message deleted" },
  { event: "message.reaction", direction: "server_to_client", payload: "Message ID + emoji + user + action", trigger: "Reaction added/removed" },
  { event: "typing.active", direction: "server_to_client", payload: "Room ID + user + thread", trigger: "User typing" },
  { event: "typing.stop", direction: "server_to_client", payload: "Room ID + user", trigger: "User stopped typing" },
  { event: "presence.change", direction: "bidirectional", payload: "User ID + status + custom status", trigger: "Presence update" },
  { event: "room.member_joined", direction: "server_to_client", payload: "Room + user + role", trigger: "Member joined" },
  { event: "room.member_left", direction: "server_to_client", payload: "Room + user", trigger: "Member left" },
  { event: "huddle.started", direction: "server_to_client", payload: "Huddle + room + started_by", trigger: "Huddle started" },
  { event: "huddle.ended", direction: "server_to_client", payload: "Huddle + duration", trigger: "Huddle ended" },
  { event: "huddle.joined", direction: "server_to_client", payload: "Huddle + user", trigger: "User joined huddle" },
  { event: "huddle.left", direction: "server_to_client", payload: "Huddle + user", trigger: "User left huddle" },
  { event: "notification", direction: "server_to_client", payload: "Type + title + body + priority", trigger: "Push notification" },
  { event: "system.alert", direction: "server_to_client", payload: "Level + message", trigger: "System alert" },
];

const PRESENCE_STATUSES = ["online", "away", "busy", "dnd", "offline"];

const EVENT_SET = new Set(CHAT_EVENTS.map((e) => e.event));

export class ChatRealtimeService {
  private io: any = null;
  private buffer: { event: string; tenantId: string; roomId?: string; payload: any; at: string }[] = [];
  private readonly MAX_BUFFER = 300;

  setIO(io: any) {
    this.io = io;
  }

  isWired() {
    return this.io !== null;
  }

  private broadcast(event: string, tenantId: string, roomId: string | undefined, payload: any) {
    try {
      if (!this.io) return;
      this.io.to(`tenant:${tenantId}`).emit(event, payload);
      if (roomId) this.io.to(`room:${roomId}`).emit(event, payload);
    } catch (err) {
      console.error(`[chatRealtime] broadcast ${event} failed:`, err);
    }
  }

  emit(event: string, tenantId: string, payload: any = {}, roomId?: string) {
    if (!EVENT_SET.has(event)) throw new Error(`Unknown chat event "${event}" — use one of: ${CHAT_EVENTS.map((e) => e.event).join(", ")}`);
    this.broadcast(event, tenantId, roomId, payload);
    this.buffer.push({ event, tenantId, roomId, payload, at: new Date().toISOString() });
    if (this.buffer.length > this.MAX_BUFFER) this.buffer = this.buffer.slice(-this.MAX_BUFFER);
    return { event, tenantId, roomId, at: this.buffer[this.buffer.length - 1].at };
  }

  clearBuffer() {
    this.buffer = [];
  }

  sendTyping(tenantId: string, input: any) {
    if (!input || !input.userId || !input.roomId) throw new Error("userId and roomId are required");
    const payload = {
      userId: String(input.userId),
      roomId: String(input.roomId),
      threadId: input.threadId ? String(input.threadId) : null,
      isTyping: input.isTyping !== false,
      at: new Date().toISOString(),
    };
    this.emit(payload.isTyping ? "typing.active" : "typing.stop", tenantId, payload, payload.roomId);
    return { event: payload.isTyping ? "typing.active" : "typing.stop", ...payload, summary: `${payload.userId} is ${payload.isTyping ? "typing" : "no longer typing"}` };
  }

  sendPresence(tenantId: string, input: any) {
    if (!input || !input.userId) throw new Error("userId is required");
    const status = String(input.status || "online");
    if (!PRESENCE_STATUSES.includes(status)) {
      throw new Error(`Invalid presence status "${status}" — use one of: ${PRESENCE_STATUSES.join(", ")}`);
    }
    const payload = {
      userId: String(input.userId),
      status,
      customStatus: input.customStatus ? String(input.customStatus) : null,
      at: new Date().toISOString(),
    };
    this.emit("presence.change", tenantId, payload);
    return { event: "presence.change", ...payload, summary: `${payload.userId} is now ${payload.status}` };
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
      eventCatalog: CHAT_EVENTS,
      counts,
      total,
      wired: this.isWired(),
      recent,
      summary: `${total} chat event(s) observed · ${Object.keys(counts).length} event type(s)`,
    };
  }

  realtimeLog(tenantId: string, limit = 25) {
    const log = this.recentEvents(tenantId, limit).map((b) => ({ event: b.event, at: b.at, roomId: b.roomId, ...b.payload }));
    return { log, total: log.length };
  }
}

export const chatRealtime = new ChatRealtimeService();