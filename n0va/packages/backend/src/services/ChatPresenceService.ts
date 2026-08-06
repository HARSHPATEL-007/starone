import { DataStore } from "./DataStore";
import { chatRealtime } from "./ChatRealtimeService";

export const PRESENCE_STATUSES = ["online", "away", "busy", "dnd", "offline", "in_meeting", "on_call", "in_focus", "neural_flow"];
export const PLATFORMS = ["web", "mobile_ios", "mobile_android", "desktop", "tablet", "neural_lace", "ambient"];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export class ChatPresenceService {
  private get(tenantId: string, userId: string): any {
    const p = DataStore.mem().findOne("chat_presence", (x: any) => x.userId === userId && x.tenantId === tenantId);
    if (!p) throw new Error(`Presence for "${userId}" not found`);
    return p;
  }

  ensure(tenantId: string, userId: string): any {
    const existing = DataStore.mem().findOne("chat_presence", (x: any) => x.userId === userId && x.tenantId === tenantId);
    if (existing) return existing;
    const now = new Date().toISOString();
    return DataStore.mem().insert("chat_presence", {
      tenantId,
      module: "chat_presence",
      userId,
      status: "offline",
      custom_status: null,
      last_active_at: now,
      last_seen_platform: "web",
      devices: [],
      focus_mode: { enabled: false, start_time: null, end_time: null, allowed_interrupts: ["@mentions", "critical_alerts"] },
      calendar_status: { in_meeting: false, meeting_title: null, meeting_end: null, show_as: "free" },
      neural_state: { bci_connected: false, attention_level: 0.5, cognitive_load: 0.2, flow_state_probability: 0.3, preferred_communication_mode: "text" },
      biometric_indicators: { stress_level: 0.1, energy_level: 0.7, engagement_score: 0.6 },
      updated_at: now,
    });
  }

  getPresence(tenantId: string, userId: string) {
    const p = this.ensure(tenantId, userId);
    return { presence: p, summary: `${p.userId} is ${p.status}${p.custom_status ? ` — ${p.custom_status}` : ""}` };
  }

  listPresence(tenantId: string, userIds?: string[]) {
    const rows = DataStore.mem().find("chat_presence", (x: any) => x.tenantId === tenantId && (!userIds || !userIds.length || userIds.includes(x.userId)));
    const presence = rows.map((p) => ({ userId: p.userId, status: p.status, custom_status: p.custom_status, last_active_at: p.last_active_at, focus_mode: p.focus_mode }));
    const online = presence.filter((p) => !["offline", "dnd"].includes(p.status)).length;
    return { presence, total: presence.length, online, summary: `${online}/${presence.length} online` };
  }

  updatePresence(tenantId: string, userId: string, input: any) {
    const p = this.ensure(tenantId, userId);
    const status = input.status || p.status;
    if (!PRESENCE_STATUSES.includes(status)) throw new Error(`Invalid presence status "${status}" — use one of: ${PRESENCE_STATUSES.join(", ")}`);
    const updates: any = { status, updated_at: new Date().toISOString(), last_active_at: new Date().toISOString() };
    if (input.custom_status !== undefined) updates.custom_status = input.custom_status;
    if (input.platform) updates.last_seen_platform = input.platform;
    const updated = DataStore.mem().update("chat_presence", (x: any) => x.userId === userId && x.tenantId === tenantId, updates);
    chatRealtime.sendPresence(tenantId, { userId, status, customStatus: updated.custom_status });
    return { presence: updated, summary: `${userId} is now ${status}` };
  }

  setCustomStatus(tenantId: string, userId: string, statusText: string | null) {
    this.ensure(tenantId, userId);
    const updated = DataStore.mem().update("chat_presence", (x: any) => x.userId === userId && x.tenantId === tenantId, { custom_status: statusText, updated_at: new Date().toISOString() });
    return { presence: updated, summary: statusText ? `Status set: ${statusText}` : "Status cleared" };
  }

  registerDevice(tenantId: string, userId: string, device: any) {
    const p = this.ensure(tenantId, userId);
    if (!device || !device.platform) throw new Error("Device platform is required");
    const deviceId = device.deviceId || `dev_${hashStr(userId + device.platform + Date.now())}`;
    const devices = [...(p.devices || []).filter((d: any) => d.device_id !== deviceId), {
      device_id: deviceId,
      platform: device.platform,
      client_version: device.clientVersion || "2026.7.1",
      last_active: new Date().toISOString(),
    }];
    const updated = DataStore.mem().update("chat_presence", (x: any) => x.userId === userId && x.tenantId === tenantId, { devices, last_seen_platform: device.platform, updated_at: new Date().toISOString() });
    return { presence: updated, deviceId, summary: `Registered ${device.platform} device` };
  }

  setFocusMode(tenantId: string, userId: string, input: any) {
    const p = this.ensure(tenantId, userId);
    if (!input || input.enabled === undefined) throw new Error("enabled is required");
    const now = new Date().toISOString();
    const durationMinutes = input.durationMinutes || 120;
    const focus_mode = {
      enabled: !!input.enabled,
      start_time: input.enabled ? now : null,
      end_time: input.enabled ? new Date(Date.now() + durationMinutes * 60000).toISOString() : null,
      allowed_interrupts: input.allowedInterrupts || ["@mentions", "critical_alerts"],
    };
    const updates: any = { focus_mode, updated_at: now };
    if (input.enabled) updates.status = "in_focus";
    else updates.status = p.status === "in_focus" ? "online" : p.status;
    const updated = DataStore.mem().update("chat_presence", (x: any) => x.userId === userId && x.tenantId === tenantId, updates);
    chatRealtime.sendPresence(tenantId, { userId, status: updated.status, customStatus: updated.custom_status });
    return { presence: updated, summary: `Focus mode ${input.enabled ? `enabled for ${durationMinutes} min` : "disabled"}` };
  }

  updateCalendarStatus(tenantId: string, userId: string, input: any) {
    const p = this.ensure(tenantId, userId);
    const calendar_status = {
      in_meeting: input.inMeeting !== undefined ? !!input.inMeeting : p.calendar_status?.in_meeting,
      meeting_title: input.meetingTitle !== undefined ? input.meetingTitle : p.calendar_status?.meeting_title,
      meeting_end: input.meetingEnd !== undefined ? input.meetingEnd : p.calendar_status?.meeting_end,
      show_as: input.showAs || "busy",
    };
    const updates: any = { calendar_status, updated_at: new Date().toISOString() };
    if (calendar_status.in_meeting) updates.status = "in_meeting";
    else if (p.status === "in_meeting") updates.status = "online";
    const updated = DataStore.mem().update("chat_presence", (x: any) => x.userId === userId && x.tenantId === tenantId, updates);
    chatRealtime.sendPresence(tenantId, { userId, status: updated.status, customStatus: updated.custom_status });
    return { presence: updated, summary: calendar_status.in_meeting ? `In meeting: ${calendar_status.meeting_title || "Untitled"}` : "Calendar cleared" };
  }

  presenceDashboard(tenantId: string) {
    const rows = DataStore.mem().find("chat_presence", (x: any) => x.tenantId === tenantId);
    const byStatus: Record<string, number> = {};
    for (const p of rows) byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    const inFocus = rows.filter((p) => p.focus_mode?.enabled).length;
    const inMeetings = rows.filter((p) => p.calendar_status?.in_meeting).length;
    const devices = rows.reduce((s, p) => s + (p.devices?.length || 0), 0);
    return {
      byStatus,
      total: rows.length,
      inFocus,
      inMeetings,
      devices,
      online: rows.filter((p) => !["offline", "dnd"].includes(p.status)).length,
      statuses: PRESENCE_STATUSES,
      summary: `${rows.length} user(s) tracked · ${inFocus} in focus · ${inMeetings} in meetings`,
    };
  }
}

export const chatPresence = new ChatPresenceService();