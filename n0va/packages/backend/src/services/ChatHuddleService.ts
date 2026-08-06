import { DataStore } from "./DataStore";
import { chatRealtime } from "./ChatRealtimeService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const HUDDLE_TYPES = ["instant", "scheduled", "persistent", "breakout", "external", "neural"];
const STATE_POOL = ["connecting", "active", "ending", "ended"];

export class ChatHuddleService {
  private get(tenantId: string, huddleId: string): any {
    const h = DataStore.mem().findOne("chat_huddles", (x: any) => x.huddleId === huddleId && x.tenantId === tenantId);
    if (!h) throw new Error(`Huddle "${huddleId}" not found`);
    return h;
  }

  getRoom(tenantId: string, roomId: string): any {
    const room = DataStore.mem().findOne("chat_rooms", (r: any) => r.roomId === roomId && r.tenantId === tenantId);
    if (!room) throw new Error(`Room "${roomId}" not found`);
    return room;
  }

  startHuddle(tenantId: string, roomId: string, input: any = {}) {
    const room = this.getRoom(tenantId, roomId);
    const type = input.type || "instant";
    if (!HUDDLE_TYPES.includes(type)) throw new Error(`Unknown huddle type "${type}"`);
    const now = new Date().toISOString();
    const huddleId = `huddle_${hashStr(tenantId + roomId + now + (input.topic || "huddle"))}`;
    const huddle = DataStore.mem().insert("chat_huddles", {
      tenantId,
      huddleId,
      roomId,
      topic: input.topic || `${room.display_name || room.name} huddle`,
      type,
      state: "active",
      started_by: input.userId || "user_001",
      participants: [{ user_id: input.userId || "user_001", joined_at: now, role: "host" }],
      participant_count: 1,
      max_participants: type === "webinar" ? 1000 : 100,
      is_recording: false,
      recording: null,
      started_at: now,
      ended_at: null,
      signals: [],
      created_at: now,
      updated_at: now,
    });
    chatRealtime.emit("huddle.started", tenantId, { huddleId, roomId, started_by: input.userId || "user_001", topic: huddle.topic }, roomId);
    return { huddle, summary: `Started huddle "${huddle.topic}" (${type})` };
  }

  getHuddle(tenantId: string, huddleId: string) {
    return this.get(tenantId, huddleId);
  }

  listHuddles(tenantId: string, roomId?: string) {
    const rows = DataStore.mem().find("chat_huddles", (h: any) => h.tenantId === tenantId && (!roomId || h.roomId === roomId));
    const active = rows.filter((h) => h.state === "active");
    return { huddles: rows, active: active.length, total: rows.length, summary: `${active.length} active huddle(s)` };
  }

  joinHuddle(tenantId: string, huddleId: string, userId: string = "user_001") {
    const h = this.get(tenantId, huddleId);
    if (h.state !== "active") throw new Error(`Huddle "${huddleId}" is not active`);
    if (h.participant_count >= h.max) throw new Error(`Huddle "${huddleId}" is full`);
    if (h.participants.some((p: any) => p.user_id === userId)) return { huddle: h, already: true, summary: `Already in huddle "${h.topic}"` };
    const now = new Date().toISOString();
    const participants = [...h.participants, { user_id: userId, joined_at: now, role: "participant" }];
    const updated = DataStore.mem().update("chat_huddles", (x: any) => x.huddleId === huddleId && x.tenantId === tenantId, { participants, participant_count: participants.length, updated_at: now });
    chatRealtime.emit("huddle.joined", tenantId, { huddleId, user_id: userId, topic: h.topic }, h.roomId);
    return { huddle: updated, summary: `Joined huddle "${h.topic}"` };
  }

  leaveHuddle(tenantId: string, huddleId: string, userId: string = "user_001") {
    const h = this.get(tenantId, huddleId);
    if (!h.participants.some((p: any) => p.user_id === userId)) throw new Error(`User ${userId} is not in this huddle`);
    const now = new Date().toISOString();
    const participants = h.participants.filter((p: any) => p.user_id !== userId);
    const updates: any = { participants, participant_count: participants.length, updated_at: now };
    if (participants.length === 0) {
      updates.state = "ended";
      updates.ended_at = now;
      updates.duration = Math.round((Date.now() - new Date(h.started_at).getTime()) / 1000);
      chatRealtime.emit("huddle.ended", tenantId, { huddleId, roomId: h.roomId, duration: updates.duration, recording_url: h.recording?.url || null }, h.roomId);
    } else {
      chatRealtime.emit("huddle.left", tenantId, { huddleId, userId, topic: h.topic }, h.roomId);
    }
    const updated = DataStore.mem().update("chat_huddles", (x: any) => x.huddleId === huddleId && x.tenantId === tenantId, updates);
    return { huddle: updated, summary: updated.state === "ended" ? `Huddle ended after ${updated.duration}s` : `Left huddle "${h.topic}"` };
  }

  endHuddle(tenantId: string, huddleId: string) {
    const h = this.get(tenantId, huddleId);
    const now = new Date().toISOString();
    const duration = Math.round((Date.now() - new Date(h.started_at).getTime()) / 1000);
    const updated = DataStore.mem().update("chat_huddles", (x: any) => x.huddleId === huddleId && x.tenantId === tenantId, {
      state: "ended",
      ended_at: now,
      duration,
      "is_recording": false,
      updated_at: now,
    });
    chatRealtime.emit("huddle.ended", tenantId, { huddleId, roomId: h.roomId, duration, recording_url: h.recording?.url || null }, h.roomId);
    return { huddle: updated, summary: `Ended huddle "${h.topic}" after ${duration}s` };
  }

  startRecording(tenantId: string, huddleId: string) {
    const h = this.get(tenantId, huddleId);
    if (h.state !== "active") throw new Error(`Huddle "${huddleId}" is not active`);
    const recId = `rec_${hashStr(tenantId + huddleId + Date.now())}`;
    const updated = DataStore.mem().update("chat_huddles", (x: any) => x.huddleId === huddleId && x.tenantId === tenantId, {
      is_recording: true,
      recording: { recording_id: recId, started_at: new Date().toISOString(), url: null, status: "recording" },
    });
    return { huddle: updated, summary: `Recording started (${recId})` };
  }

  stopRecording(tenantId: string, huddleId: string) {
    const h = this.get(tenantId, huddleId);
    if (!h.is_recording) throw new Error("No active recording on this huddle");
    const recId = h.recording?.recording_id || `recv_${hashStr(tenantId + huddleId + Date.now())}`;
    const url = `https://storage.n0va.ai/recordings/${recId}.mp4`;
    const updated = DataStore.mem().update("chat_huddles", (x: any) => x.huddleId === huddleId && x.tenantId === tenantId, {
      is_recording: false,
      "recording.url": url,
      "recording.ended_at": new Date().toISOString(),
      "recording.format": "mp4",
    });
    return { huddle: updated, recording: { recording_id: recId, url, format: "mp4" }, summary: "Recording finalized" };
  }

  getRecording(tenantId: string, huddleId: string) {
    const h = this.get(tenantId, huddleId);
    if (!h.recording) throw new Error(`No recording on huddle "${huddleId}"`);
    return { recording: h.recording, summary: `Recording ${h.recording.url ? "ready" : "in progress"}` };
  }

  huddleWall(tenantId: string) {
    const monthly = Array.from({ length: 4 }, (_, i) => {
      const count = Math.max(2, Math.round(10 + Math.sin(i) * 4));
      return { month: `M-${3 - i}`, count, participants: count * (2 + Math.round(Math.abs(Math.sin(i * 2)) * 3)) };
    });
    return {
      monthly,
      avgDuration: 24,
      total: DataStore.mem().find("chat_huddles", (h: any) => h.tenantId === tenantId).length,
      live: DataStore.mem().find("chat_huddles", (h: any) => h.tenantId === tenantId && h.state === "active").length,
      wall: monthly.reduce((s, m) => s + m.count, 0),
      summary: "Huddle velocity and participation snapshot",
    };
  }
}

export const chatHuddle = new ChatHuddleService();