import { DataStore } from "./DataStore";
import { chatRealtime } from "./ChatRealtimeService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const ROOM_TYPES = ["dm", "group_dm", "public_channel", "private_channel", "announcement", "external_shared", "customer", "neural"];
export const ROLE_ROLES = ["owner", "admin", "member", "guest", "bot", "ai"];
const DEFAULT_OWNERS: Record<string, string> = {
  general: "General",
  engineering: "Engineering",
  marketing: "Marketing",
  sales: "Sales",
  random: "Random",
};

const DEFAULT_ROOMS = [
  { type: "public_channel", name: "general", description: "Company-wide announcements and general discussion" },
  { type: "public_channel", name: "engineering", description: "Engineering coordination, code reviews and architecture" },
  { type: "public_channel", name: "marketing", description: "Marketing campaigns, brand, and growth" },
  { type: "public_channel", name: "sales", description: "Pipeline, deals, and revenue conversations" },
  { type: "public_channel", name: "random", description: "Off-topic, water cooler, and fun" },
];

export const ROOM_TEMPLATES = [
  { id: "project_kickoff", name: "Project Kickoff", description: "Task integration, calendar events, doc linking, approval workflow", actions: ["link_tasks", "link_calendar", "invite_team"] },
  { id: "incident_response", name: "Incident Response", description: "War room mode, priority notifications, auto-escalation, status page", actions: ["war_room", "priority_alert", "auto_escalate"] },
  { id: "customer_onboarding", name: "Customer Onboarding", description: "Welcome bot, FAQ auto-response, progress tracking, handoff triggers", actions: ["welcome_bot", "faq_auto", "handoff"] },
  { id: "all_hands", name: "All-Hands", description: "Announcement-only, Q&A moderation, poll integration, recording", actions: ["announce_only", "qa_moderation", "recording"] },
  { id: "devops_war_room", name: "DevOps War Room", description: "Alert aggregation, runbook linking, metric dashboards, rollback triggers", actions: ["alert_aggregation", "runbook", "metrics"] },
  { id: "sales_pipeline", name: "Sales Pipeline", description: "CRM integration, deal tracking, competitor alerts, forecast updates", actions: ["crm_sync", "deal_tracking", "forecast"] },
];

export class ChatRoomService {
  private id(tenantId: string, name: string, type: string): string {
    return `room_${hashStr(tenantId + name + type)}`;
  }

  private get(tenantId: string, roomId: string): any {
    const room = DataStore.mem().findOne("chat_rooms", (r: any) => r.roomId === roomId && r.tenantId === tenantId);
    if (!room) throw new Error(`Room "${roomId}" not found`);
    return room;
  }

  seedRooms(tenantId: string) {
    for (const def of DEFAULT_ROOMS) {
      const roomId = this.id(tenantId, def.name, def.type);
      if (!DataStore.mem().findOne("chat_rooms", (r: any) => r.roomId === roomId && r.tenantId === tenantId)) {
        DataStore.mem().insert("chat_rooms", this.baseRoom(tenantId, roomId, def.type, def.name, def.description, "system", ["member"]));
      }
    }
    return { seeded: DEFAULT_ROOMS.length, summary: `Seeded ${DEFAULT_ROOMS.length} default channel(s)` };
  }

  private baseRoom(tenantId: string, roomId: string, type: string, name: string, description: string, ownerId: string, memberIds: string[] = []): any {
    const now = new Date().toISOString();
    const members = [{ user_id: ownerId, role: "owner", joined_at: now, last_read_at: now }];
    for (const mid of memberIds) {
      if (mid === ownerId) continue;
      members.push({ user_id: mid, role: "member", joined_at: now, last_read_at: now });
    }
    return {
      tenantId,
      module: "chat_rooms",
      roomId,
      name,
      display_name: name,
      description: description || "",
      type,
      members,
      member_count: members.length,
      threads_enabled: true,
      thread_archive_after_days: 30,
      content_policy: { allowed_types: ["text", "code", "image", "video", "file", "interactive"], max_message_length: 50000, file_upload_limit: 10737418240, ephemeral_allowed: true, external_sharing: "invite_only" },
      ai_config: { smart_reply_enabled: true, auto_summary_enabled: true, sentiment_monitoring: true, toxicity_detection: "auto_moderate", bot_personas: [] },
      retention_policy: "standard",
      legal_hold_until: null,
      dlp_rules: ["pii_detection", "confidential_markers"],
      hyper_context: { linked_mail_threads: [], linked_calendar_events: [], linked_tasks: [], linked_docs: [], linked_crm_opportunities: [], linked_erp_projects: [] },
      analytics: { message_count: 0, last_message_at: null, daily_active_users: 0, weekly_active_users: 0, sentiment_trend: 0, engagement_score: 0 },
      is_archived: false,
      archive_stage: null,
      version: 1,
      created_at: now,
      updated_at: now,
    };
  }

  listRooms(tenantId: string, opts: any = {}) {
    const rows = DataStore.mem().find("chat_rooms", (r: any) => r.tenantId === tenantId && (!opts.type || r.type === opts.type) && (!opts.includeArchived ? !r.is_archived : true));
    const rooms = rows.map((r: any) => this.decorate(r)).sort((a: any, b: any) => b.analytics.last_message_at?.localeCompare(a.analytics.last_message_at || "") || a.name.localeCompare(b.name));
    return { rooms, total: rooms.length, types: ROOM_TYPES, summary: `${rooms.length} room(s) available` };
  }

  private decorate(room: any): any {
    return {
      ...room,
      summary: `#${room.display_name ?? room.name} — ${room.type} · ${room.member_count} member(s) · ${room.analytics.message_count} message(s)`,
    };
  }

  getRoom(tenantId: string, roomId: string) {
    return this.decorate(this.get(tenantId, roomId));
  }

  createRoom(tenantId: string, input: any) {
    if (!input || !input.name || !input.type) throw new Error("name and type are required");
    if (!ROOM_TYPES.includes(input.type)) throw new Error(`Unknown room type "${input.type}" — use one of: ${ROOM_TYPES.join(", ")}`);
    const roomId = this.id(tenantId, input.name, input.type);
    if (DataStore.mem().findOne("chat_rooms", (r: any) => r.roomId === roomId && r.tenantId === tenantId)) throw new Error(`A room named "${input.name}" already exists`);
    const owner = input.createdBy || "user_001";
    const room = DataStore.mem().insert("chat_rooms", this.baseRoom(tenantId, roomId, input.type, input.name, input.description, owner));
    if (input.members && Array.isArray(input.members)) {
      for (const userId of input.members) this.addMember(tenantId, roomId, userId);
    }
    chatRealtime.emit("room.member_joined", tenantId, { roomId, user_id: owner, role: "owner", name: room.name }, roomId);
    return { room: this.decorate(room), summary: `Created ${input.type} room #${input.name}` };
  }

  updateRoom(tenantId: string, roomId: string, patch: any) {
    const room = this.get(tenantId, roomId);
    const updates: any = {};
    for (const k of ["name", "display_name", "description", "type", "content_policy", "ai_config", "retention_policy", "legal_hold_until", "dlp_rules", "hyper_context", "threads_enabled", "thread_archive_after_days"]) {
      if (patch && patch[k] !== undefined) updates[k] = patch[k];
    }
    if (updates.name) updates.display_name = updates.display_name || updates.name;
    if (updates.retention_policy && !["standard", "extended", "compliance", "legal_hold", "ephemeral"].includes(updates.retention_policy)) {
      throw new Error(`Invalid retention policy "${updates.retention_policy}"`);
    }
    const updated = DataStore.mem().update("chat_rooms", (r: any) => r.roomId === roomId && r.tenantId === tenantId, { ...updates, version: (room.version || 1) + 1 });
    return { room: this.decorate(updated), summary: `Updated room #${updated.display_name ?? updated.name}` };
  }

  archiveRoom(tenantId: string, roomId: string, opts: any = {}) {
    const room = this.get(tenantId, roomId);
    const stage = opts.stage || "manual";
    const updated = DataStore.mem().update("chat_rooms", (r: any) => r.roomId === roomId && r.tenantId === tenantId, {
      is_archived: true,
      archive_stage: stage,
      archived_at: new Date().toISOString(),
    });
    return { room: this.decorate(updated), summary: `Archived #${room.display_name ?? room.name} (${stage})` };
  }

  restoreRoom(tenantId: string, roomId: string) {
    this.get(tenantId, roomId);
    const updated = DataStore.mem().update("chat_rooms", (r: any) => r.roomId === roomId && r.tenantId === tenantId, { is_archived: false, archive_stage: null, archived_at: null });
    return { room: this.decorate(updated), summary: `Restored #${updated.display_name ?? updated.name}` };
  }

  addMember(tenantId: string, roomId: string, userId: string, role: string = "member") {
    const room = this.get(tenantId, roomId);
    if (room.members.some((m: any) => m.user_id === userId)) throw new Error(`User ${userId} is already a member`);
    if (room.type === "announcement" && role !== "admin" && role !== "owner") role = "member";
    const now = new Date().toISOString();
    const members = [...room.members, { user_id: userId, role, joined_at: now, last_read_at: now, notification_preferences: { mute: false, notify_on_mention: true, notify_on_thread: true, digest_frequency: "immediate" } }];
    const updated = DataStore.mem().update("chat_rooms", (r: any) => r.roomId === roomId && r.tenantId === tenantId, { members, member_count: members.length });
    chatRealtime.emit("room.member_joined", tenantId, { roomId, user_id: userId, role, name: updated.name }, roomId);
    return { room: this.decorate(updated), member: { user_id: userId, role }, summary: `Added ${userId} as ${role} to #${room.display_name ?? room.name}` };
  }

  removeMember(tenantId: string, roomId: string, userId: string) {
    const room = this.get(tenantId, roomId);
    const member = room.members.find((m: any) => m.user_id === userId);
    if (!member) throw new Error(`User ${userId} is not a member of this room`);
    if (member.role === "owner") throw new Error("Cannot remove the room owner");
    const members = room.members.filter((m: any) => m.user_id !== userId);
    const updated = DataStore.mem().update("chat_rooms", (r: any) => r.roomId === roomId && r.tenantId === tenantId, { members, member_count: members.length });
    chatRealtime.emit("room.member_left", tenantId, { room_id: roomId, user_id: userId }, roomId);
    return { room: this.decorate(updated), summary: `Removed ${userId} from #${room.display_name ?? room.name}` };
  }

  setMemberRole(tenantId: string, roomId: string, userId: string, role: string) {
    if (!ROLE_ROLES.includes(role)) throw new Error(`Unknown role "${role}"`);
    const room = this.get(tenantId, roomId);
    if (!room.members.some((m: any) => m.user_id === userId)) throw new Error(`User ${userId} is not a member`);
    const members = room.members.map((m: any) => (m.user_id === userId ? { ...m, role } : m));
    const updated = DataStore.mem().update("chat_rooms", (r: any) => r.roomId === roomId && r.tenantId === tenantId, { members });
    return { room: this.decorate(updated), summary: `Set ${userId} as ${role} in #${room.display_name ?? room.name}` };
  }

  markRead(tenantId: string, roomId: string, userId: string) {
    const room = this.get(tenantId, roomId);
    const members = room.members.map((m: any) => (m.user_id === userId ? { ...m, last_read_at: new Date().toISOString() } : m));
    DataStore.mem().update("chat_rooms", (r: any) => r.roomId === roomId && r.tenantId === tenantId, { members });
    return { roomId, userId, summary: `Marked read` };
  }

  myRooms(tenantId: string, userId: string) {
    const rows = DataStore.mem().find("chat_rooms", (r: any) => r.tenantId === tenantId && !r.is_archived && r.members.some((m: any) => m.user_id === userId));
    const rooms = rows.map((r) => {
      const member = r.members.find((m: any) => m.user_id === userId);
      const unread = Math.max(0, (r.analytics.message_count || 0) - (member?.last_read_count || 0));
      return this.decorate({ ...r, unread, role: member?.role });
    }).sort((a, b) => (b.unread || 0) - (a.unread || 0) || a.name.localeCompare(b.name));
    const totalUnread = rooms.reduce((s, r) => s + (r.unread || 0), 0);
    return { rooms, total: rooms.length, totalUnread, summary: `${rooms.length} room(s), ${totalUnread} unread` };
  }

  roomTemplates(tenantId: string) {
    return { templates: ROOM_TEMPLATES, total: ROOM_TEMPLATES.length, summary: `${ROOM_TEMPLATES.length} room template(s)` };
  }

  instantiateTemplate(tenantId: string, templateId: string, input: any = {}) {
    const tpl = ROOM_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) throw new Error(`Unknown template "${templateId}"`);
    const name = input.name || `${tpl.name.toLowerCase().replace(/\s+/g, "_")}_${hashStr(tenantId + templateId).toString(36).slice(0, 4)}`;
    const type = input.type || "private_channel";
    const room = this.createRoom(tenantId, { ...input, name, type, description: input.description || tpl.description });
    const updated = DataStore.mem().update("chat_rooms", (r: any) => r.roomId === room.room.roomId && r.tenantId === tenantId, { template: templateId, template_features: tpl.actions });
    return { room: this.decorate(updated), template: tpl, applied: tpl.actions, summary: `Instantiated template "${tpl.name}" as #${name}` };
  }

  autoArchiveSweep(tenantId: string) {
    const now = Date.now();
    const day = 86400000;
    let moved = 0;
    const rows = DataStore.mem().find("chat_rooms", (r: any) => r.tenantId === tenantId && !r.is_archived);
    for (const room of rows) {
      const last = room.analytics.last_message_at ? new Date(room.analytics.last_message_at).getTime() : new Date(room.created_at).getTime();
      if (room.legal_hold_until) continue;
      const daysIdle = (now - last) / day;
      let stage: string | null = null;
      if (daysIdle >= 365) stage = "erased";
      else if (daysIdle >= 180) stage = "cold";
      else if (daysIdle >= 90) stage = "warm";
      if (stage) {
        DataStore.mem().update("chat_rooms", (rr: any) => rr.roomId === room.roomId, { is_archived: true, archive_stage: stage, archived_at: new Date().toISOString() });
        moved++;
      }
    }
    return { scanned: rows.length, moved, summary: `Auto-archived ${moved}/${rows.length} idle room(s)` };
  }

  hyperContextLinks(tenantId: string, roomId: string) {
    const room = this.get(tenantId, roomId);
    const hc = room.hyper_context || {};
    const totals: Record<string, number> = {};
    for (const k of Object.keys(hc)) totals[k] = Array.isArray(hc[k]) ? hc[k].length : 0;
    return { roomId, links: hc, totals, summary: `${totals.linked_tasks || 0} task(s), ${totals.linked_calendar_events || 0} event(s), ${totals.linked_docs || 0} doc(s) linked` };
  }
}

export const chatRoom = new ChatRoomService();