import { DataStore } from "./DataStore";
import { chatRoom } from "./ChatRoomService";
import { chatCompliance } from "./ChatComplianceService";
import { chatAnalytics } from "./ChatAnalyticsService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const DEFAULT_RESTRICTIONS = {
  allowed_roles: ["admin", "owner", "member"],
  allowed_rooms: [],
  max_invites_per_day: 100,
  allow_dms: true,
  allow_threads: true,
  allow_ai_features: true,
};

export class ChatAdminService {
  private requireAdmin(user: any) {
    if (!user) throw new Error("Authentication required");
    if (user.role !== "admin" && user.role !== "owner" && user.role !== "manager") {
      throw new Error("Admin role required");
    }
    return user;
  }

  assignAdmin(tenantId: string, userId: string, role: string, input: any = {}) {
    this.requireAdmin({ role: input.actorRole || "admin", userId: input.actorId });
    if (!["admin", "owner", "manager", "member"].includes(role)) throw new Error(`Invalid role "${role}"`);
    const existing = DataStore.mem().findOne("chat_admins", (x: any) => x.tenantId === tenantId && x.userId === userId);
    if (existing) {
      const updated = DataStore.mem().update("chat_admins", (x: any) => x.tenantId === tenantId && x.userId === userId, { role, updated_at: new Date().toISOString() });
      return { admin: updated, summary: `${userId} role updated to ${role}` };
    }
    const admin = DataStore.mem().insert("chat_admins", {
      tenantId,
      userId,
      role,
      permissions: input.permissions || [],
      assigned_by: input.actorId,
      created_at: new Date().toISOString(),
    });
    return { admin, summary: `${userId} promoted to ${role}` };
  }

  listAdmins(tenantId: string) {
    const rows = DataStore.mem().find("chat_admins", (x: any) => x.tenantId === tenantId);
    return { admins: rows, total: rows.length, summary: `${rows.length} admin(s)` };
  }

  workspaceSettings(tenantId: string) {
    const existing = DataStore.mem().findOne("chat_admin_settings", (x: any) => x.tenantId === tenantId);
    return { settings: existing || { ...DEFAULT_RESTRICTIONS, tenantId, restrictions: DEFAULT_RESTRICTIONS }, summary: "Workspace settings" };
  }

  updateSettings(tenantId: string, patch: any) {
    const existing = DataStore.mem().findOne("chat_admin_settings", (x: any) => x.tenantId === tenantId);
    const updates = { ...(existing || { tenantId }), restrictions: { ...DEFAULT_RESTRICTIONS, ...(existing?.restrictions || {}), ...(patch?.restrictions || {}) } };
    for (const k of ["allow_dms", "allow_threads", "allow_ai_features", "max_invites_per_day"]) {
      if (patch && patch[k] !== undefined) updates.restrictions[k] = patch[k];
    }
    const saved = existing
      ? DataStore.mem().update("chat_admin_settings", (x: any) => x.tenantId === tenantId, { restrictions: updates.restrictions, updated_at: new Date().toISOString() })
      : DataStore.mem().insert("chat_admin_settings", { ...updates, created_at: new Date().toISOString() });
    return { settings: saved, summary: "Workspace settings updated" };
  }

  memberAccess(tenantId: string, userId: string) {
    const presence = DataStore.mem().findOne("chat_presence", (x: any) => x.tenantId === tenantId && x.userId === userId);
    const rooms = DataStore.mem().find("chat_room_members", (x: any) => x.tenantId === tenantId && x.userId === userId);
    const admin = DataStore.mem().findOne("chat_admins", (x: any) => x.tenantId === tenantId && x.userId === userId);
    return {
      userId,
      role: admin?.role || presence?.role || "member",
      status: presence?.status || "offline",
      rooms: rooms.length,
      access: {
        can_send_dm: true,
        can_create_rooms: true,
        can_archive_rooms: false,
        can_manage_policies: !!admin,
        can_export_audit: !!admin,
      },
      summary: `${userId}: ${admin?.role || "member"} in ${rooms.length} room(s)`,
    };
  }

  exportAudit(tenantId: string, opts: any = {}) {
    const logs = DataStore.mem().find("chat_audit_logs", (x: any) => x.tenantId === tenantId)
      .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))
      .slice(0, opts.limit || 200);
    return {
      audit_logs: logs,
      export_format: opts.format || "json",
      export_id: `exp_${hashStr(tenantId + Date.now())}`,
      summary: `Exported ${logs.length} audit log(s)`,
    };
  }

  suspendUser(tenantId: string, userId: string, input: any = {}) {
    this.requireAdmin({ role: input.actorRole || "admin", userId: input.actorId });
    const updated = DataStore.mem().update("chat_presence", (x: any) => x.tenantId === tenantId && x.userId === userId, {
      status: "suspended",
      suspended_reason: input.reason || "Admin action",
      suspended_at: new Date().toISOString(),
    });
    if (!updated) throw new Error(`User "${userId}" not found`);
    return { userId, suspended: true, summary: `${userId} suspended` };
  }

  restoreUser(tenantId: string, userId: string) {
    const updated = DataStore.mem().update("chat_presence", (x: any) => x.tenantId === tenantId && x.userId === userId, {
      status: "available",
      suspended_at: undefined,
    });
    if (!updated) throw new Error(`User "${userId}" not found`);
    return { userId, suspended: false, summary: `${userId} restored` };
  }

  adminDashboard(tenantId: string) {
    this.requireAdmin({ role: "admin" });
    chatCompliance.ensureSeed(tenantId);
    const report = chatAnalytics.report(tenantId);
    const compliance = chatCompliance.complianceOverview(tenantId);
    const admins = DataStore.mem().find("chat_admins", (x: any) => x.tenantId === tenantId);
    const settings = this.workspaceSettings(tenantId).settings;
    return {
      stats: {
        messages: report.metrics.messages,
        rooms: report.metrics.rooms,
        active_users: report.metrics.active_users,
        admins: admins.length,
        pending_violations: compliance.pending.length,
      },
      admins,
      restrictions: settings.restrictions,
      summary: `${report.metrics.rooms} rooms · ${report.metrics.active_users} users · ${compliance.pending.length} pending violation(s)`,
    };
  }
}

export const chatAdmin = new ChatAdminService();