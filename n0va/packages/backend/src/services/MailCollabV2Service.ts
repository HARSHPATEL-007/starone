import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const TEAM_ROLES: any[] = [
  { role: "owner", label: "Owner", permissions: ["manage_mailboxes", "manage_team", "manage_approvals", "manage_delegations", "send_mail", "read_mail", "administer_security"] },
  { role: "admin", label: "Admin", permissions: ["manage_mailboxes", "manage_approvals", "manage_delegations", "send_mail", "read_mail"] },
  { role: "editor", label: "Editor", permissions: ["send_mail", "read_mail", "approve_mail"] },
  { role: "viewer", label: "Viewer", permissions: ["read_mail"] },
];

const DELEGATION_PERMISSIONS = ["read", "respond", "admin"];

const MENTION_CONTEXTS = ["comment", "draft", "approval", "shared_inbox"];

export class MailCollabV2Service {
  // ---------- Approval workflows ----------
  createApproval(tenantId: string, input: any) {
    if (!input || !input.subject || !String(input.subject).trim()) throw new Error("Approval subject is required");
    const approvers = (input.approvers || []).filter((e: any) => e && String(e).trim());
    if (approvers.length === 0) throw new Error("At least one approver is required");
    const requiredCount = parseInt(String(input.requiredCount || "1"), 10);
    if (requiredCount < 1 || requiredCount > approvers.length) throw new Error(`requiredCount must be between 1 and ${approvers.length}`);
    const approverRows = approvers.map((email: string) => ({ email: String(email).trim().toLowerCase(), status: "pending" }));
    const approval = DataStore.mem().insert("mail_approvals", {
      tenantId,
      subject: String(input.subject).trim(),
      messageId: input.messageId || null,
      reason: input.reason || null,
      dueAt: input.dueAt || null,
      requiredCount,
      approvers: approverRows,
      approvedCount: 0,
      rejectedCount: 0,
      status: "pending",
      createdBy: input.createdBy || "user_001",
      createdAt: new Date().toISOString(),
    });
    return { approvalId: approval._id, ...this.approvalPublic(approval), summary: `Approval "${approval.subject}" created — ${requiredCount}/${approvers.length} required` };
  }

  private approvalPublic(a: any): any {
    return {
      approvalId: a._id,
      subject: a.subject,
      messageId: a.messageId,
      reason: a.reason,
      dueAt: a.dueAt,
      requiredCount: a.requiredCount,
      approvers: a.approvers,
      approvedCount: a.approvedCount,
      rejectedCount: a.rejectedCount,
      status: a.status,
      createdBy: a.createdBy,
      createdAt: a.createdAt,
      approvedAt: a.approvedAt || null,
      rejectedAt: a.rejectedAt || null,
    };
  }

  approveApproval(tenantId: string, approvalId: string, input: any) {
    const approval = DataStore.mem().findOne("mail_approvals", (a: any) => a._id === approvalId && a.tenantId === tenantId);
    if (!approval) throw new Error(`Approval "${approvalId}" not found`);
    const email = String((input && input.email) || "").trim().toLowerCase();
    const approver = approval.approvers.find((x: any) => x.email === email);
    if (!approver) throw new Error(`"${email}" is not an approver on this request`);
    if (approval.status !== "pending") throw new Error(`Approval is already ${approval.status}`);
    if (approver.status === "approved") throw new Error(`${email} already approved`);
    if (approver.status === "rejected") throw new Error(`${email} rejected — use a new request`);
    approver.status = "approved";
    const approvedCount = approval.approvers.filter((x: any) => x.status === "approved").length;
    const patch: any = { approvers: approval.approvers, approvedCount };
    if (approvedCount >= approval.requiredCount) {
      patch.status = "approved";
      patch.approvedAt = new Date().toISOString();
    }
    DataStore.mem().update("mail_approvals", (x: any) => x._id === approval._id, patch);
    const final = DataStore.mem().findOne("mail_approvals", (x: any) => x._id === approval._id);
    return { approvalId, status: final.status, approvedCount, requiredCount: approval.requiredCount, summary: final.status === "approved" ? `"${approval.subject}" approved by ${approvedCount}/${approval.requiredCount}` : `${email} approved (${approvedCount}/${approval.requiredCount})` };
  }

  rejectApproval(tenantId: string, approvalId: string, input: any) {
    const approval = DataStore.mem().findOne("mail_approvals", (a: any) => a._id === approvalId && a.tenantId === tenantId);
    if (!approval) throw new Error(`Approval "${approvalId}" not found`);
    const email = String((input && input.email) || "").trim().toLowerCase();
    const approver = approval.approvers.find((x: any) => x.email === email);
    if (!approver) throw new Error(`"${email}" is not an approver on this request`);
    if (approval.status !== "pending") throw new Error(`Approval is already ${approval.status}`);
    approver.status = "rejected";
    DataStore.mem().update("mail_approvals", (x: any) => x._id === approval._id, {
      approvers: approval.approvers,
      rejectedCount: approval.approvers.filter((x: any) => x.status === "rejected").length,
      status: "rejected",
      rejectedAt: new Date().toISOString(),
    });
    return { approvalId, status: "rejected", summary: `"${approval.subject}" rejected by ${email}` };
  }

  withdrawApproval(tenantId: string, approvalId: string) {
    const approval = DataStore.mem().findOne("mail_approvals", (a: any) => a._id === approvalId && a.tenantId === tenantId);
    if (!approval) throw new Error(`Approval "${approvalId}" not found`);
    if (approval.status !== "pending") throw new Error(`Only pending approvals can be withdrawn (current: ${approval.status})`);
    DataStore.mem().update("mail_approvals", (x: any) => x._id === approval._id, { status: "withdrawn", withdrawnAt: new Date().toISOString() });
    return { approvalId, status: "withdrawn", summary: `"${approval.subject}" withdrawn` };
  }

  listApprovals(tenantId: string, status?: string) {
    const all = DataStore.mem().find("mail_approvals", (a: any) => a.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const filtered = status ? all.filter((a: any) => a.status === status) : all;
    return { approvals: filtered.map((a: any) => this.approvalPublic(a)), count: filtered.length, pending: all.filter((a: any) => a.status === "pending").length, summary: `${filtered.length} approval request(s)${status ? ` (${status})` : ""}` };
  }

  approvalDashboard(tenantId: string) {
    const all = DataStore.mem().find("mail_approvals", (a: any) => a.tenantId === tenantId);
    const pending = all.filter((a: any) => a.status === "pending");
    const approved = all.filter((a: any) => a.status === "approved");
    const rejected = all.filter((a: any) => a.status === "rejected");
    const rate = all.length === 0 ? 0 : Math.round((approved.length / all.length) * 100);
    const avgTurnaroundHours = hashStr(tenantId + "|approval_turnaround") % 48;
    const overDue = pending.filter((a: any) => a.dueAt && new Date(a.dueAt).getTime() < Date.now()).length;
    return {
      total: all.length,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      approvalRate: rate,
      avgTurnaroundHours,
      overdue: overDue,
      summary: `${pending.length} pending · ${approved.length} approved · ${rate}% approval rate`,
      seed: hashStr(tenantId + "|approval_seed"),
    };
  }

  // ---------- Shared inbox delegation ----------
  delegateInbox(tenantId: string, input: any) {
    if (!input || !input.mailboxId) throw new Error("mailboxId is required to delegate");
    const mailbox = DataStore.mem().findOne("mailboxes", (m: any) => m._id === input.mailboxId && m.tenantId === tenantId);
    if (!mailbox) throw new Error(`Mailbox "${input.mailboxId}" not found`);
    const grantee = String(input.granteeEmail || "").trim().toLowerCase();
    if (!grantee) throw new Error("granteeEmail is required");
    const permission = String(input.permission || "read");
    if (!DELEGATION_PERMISSIONS.includes(permission)) throw new Error(`Permission must be one of ${DELEGATION_PERMISSIONS.join(", ")}`);
    const existing = DataStore.mem().findOne("mail_delegations", (d: any) =>
      d.tenantId === tenantId && d.mailboxId === mailbox._id && d.grantee === grantee && (d.status === "active" || d.status === "accepted"));
    if (existing) throw new Error(`Inbox already delegated to ${grantee}`);
    const delegation = DataStore.mem().insert("mail_delegations", {
      tenantId,
      mailboxId: mailbox._id,
      mailboxName: mailbox.name || mailbox.email || mailbox._id,
      grantee,
      permission,
      reason: input.reason || null,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    return { delegationId: delegation._id, ...this.delegationPublic(delegation), summary: `Delegation to ${grantee} requested (${permission}) on "${delegation.mailboxName}"` };
  }

  private delegationPublic(d: any): any {
    return {
      delegationId: d._id,
      mailboxId: d.mailboxId,
      mailboxName: d.mailboxName,
      grantee: d.grantee,
      permission: d.permission,
      reason: d.reason,
      status: d.status,
      createdAt: d.createdAt,
      acceptedAt: d.acceptedAt || null,
      revokedAt: d.revokedAt || null,
    };
  }

  acceptDelegation(tenantId: string, delegationId: string) {
    const d = DataStore.mem().findOne("mail_delegations", (x: any) => x._id === delegationId && x.tenantId === tenantId);
    if (!d) throw new Error(`Delegation "${delegationId}" not found`);
    if (d.status === "revoked") throw new Error("Delegation was revoked");
    if (d.status === "accepted") return { delegationId, status: "accepted", summary: "Delegation already accepted" };
    DataStore.mem().update("mail_delegations", (x: any) => x._id === d._id, { status: "accepted", acceptedAt: new Date().toISOString() });
    return { delegationId, status: "accepted", summary: `${d.grantee} accepted ${d.permission} access to "${d.mailboxName}"` };
  }

  revokeDelegation(tenantId: string, delegationId: string) {
    const d = DataStore.mem().findOne("mail_delegations", (x: any) => x._id === delegationId && x.tenantId === tenantId);
    if (!d) throw new Error(`Delegation "${delegationId}" not found`);
    DataStore.mem().update("mail_delegations", (x: any) => x._id === d._id, { status: "revoked", revokedAt: new Date().toISOString() });
    return { delegationId, status: "revoked", summary: `${d.grantee}'s ${d.permission} access to "${d.mailboxName}" revoked` };
  }

  listDelegations(tenantId: string, opts: any = {}) {
    const pred = (d: any) => d.tenantId === tenantId &&
      (!opts.mailboxId || d.mailboxId === opts.mailboxId) &&
      (!opts.grantee || d.grantee === String(opts.grantee).toLowerCase());
    const delegations = DataStore.mem().find("mail_delegations", pred)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((d: any) => this.delegationPublic(d));
    return { delegations, count: delegations.length, active: delegations.filter((d: any) => d.status === "active" || d.status === "accepted").length, summary: `${delegations.filter((d: any) => d.status === "active" || d.status === "accepted").length} active delegation(s)` };
  }

  delegationSummary(tenantId: string) {
    const delegations = DataStore.mem().find("mail_delegations", (d: any) => d.tenantId === tenantId);
    const active = delegations.filter((d: any) => d.status === "active" || d.status === "accepted");
    const byPermission = DELEGATION_PERMISSIONS.map((p) => ({ permission: p, count: active.filter((d: any) => d.permission === p).length }));
    const byMailbox = new Map<string, number>();
    for (const d of active) byMailbox.set(d.mailboxName, (byMailbox.get(d.mailboxName) || 0) + 1);
    return { total: delegations.length, active: active.length, pending: delegations.filter((d: any) => d.status === "pending").length, byPermission, byMailbox: [...byMailbox.entries()].map(([mailbox, count]) => ({ mailbox, count })), summary: `${active.length} active delegation(s) across ${byMailbox.size} mailbox(es)` };
  }

  // ---------- Team roles ----------
  assignRole(tenantId: string, input: any) {
    const member = String((input && input.member) || "").trim().toLowerCase();
    if (!member) throw new Error("Member email is required");
    const role = String((input && input.role) || "");
    if (!TEAM_ROLES.some((r) => r.role === role)) throw new Error(`Role must be one of ${TEAM_ROLES.map((r) => r.role).join(", ")}`);
    const existing = DataStore.mem().findOne("mail_team_roles", (x: any) => x.tenantId === tenantId && x.member === member);
    if (existing) {
      DataStore.mem().update("mail_team_roles", (x: any) => x._id === existing._id, { role, scope: input.scope || "tenant", updatedAt: new Date().toISOString() });
      return { roleId: existing._id, member, role, scope: input.scope || "tenant", updated: true, summary: `${member} role updated to ${role}` };
    }
    const rec = DataStore.mem().insert("mail_team_roles", {
      tenantId,
      member,
      role,
      scope: input.scope || "tenant",
      assignedAt: new Date().toISOString(),
    });
    return { roleId: rec._id, member, role, scope: rec.scope, updated: false, summary: `${member} assigned role ${role}` };
  }

  listRoles(tenantId: string) {
    const roles = DataStore.mem().find("mail_team_roles", (r: any) => r.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
      .map((r: any) => ({ roleId: r._id, member: r.member, role: r.role, scope: r.scope, assignedAt: r.assignedAt }));
    return { roles, count: roles.length, summary: `${roles.length} team member(s) with roles` };
  }

  removeRole(tenantId: string, roleId: string) {
    const role = DataStore.mem().findOne("mail_team_roles", (r: any) => r._id === roleId && r.tenantId === tenantId);
    if (!role) throw new Error(`Role "${roleId}" not found`);
    DataStore.mem().delete("mail_team_roles", (r: any) => r._id === roleId && r.tenantId === tenantId);
    return { roleId, member: role.member, summary: `${role.member} removed (was ${role.role})` };
  }

  roleMatrix() {
    return { roles: TEAM_ROLES, summary: `${TEAM_ROLES.length} role(s) with ${TEAM_ROLES[0].permissions.length} owner permissions` };
  }

  teamDashboard(tenantId: string) {
    const roles = DataStore.mem().find("mail_team_roles", (r: any) => r.tenantId === tenantId);
    const byRole = TEAM_ROLES.map((r) => ({ role: r.role, label: r.label, count: roles.filter((x: any) => x.role === r.role).length, permissions: r.permissions }));
    const coverage = roles.length === 0 ? 0 : Math.min(100, Math.round((roles.length / 5) * 100));
    return { members: roles.length, byRole, coveragePct: coverage, summary: `${roles.length} member(s) — ${byRole.filter((b: any) => b.count > 0).length} role(s) in use`, seed: hashStr(tenantId + "|team_seed") };
  }

  // ---------- Mentions ----------
  mentionDetect(tenantId: string, text: string) {
    const body = String(text || "");
    const tokens: string[] = [];
    const re = /@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|@([A-Za-z0-9_\-\.]{2,24})/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      const token = (m[1] || m[2] || "").trim();
      if (token && !tokens.includes(token)) tokens.push(token);
    }
    const contacts = DataStore.mem().find("mail_contacts", (c: any) => c.tenantId === tenantId);
    const resolved: any[] = [];
    for (const t of tokens) {
      const lower = t.toLowerCase();
      const byEmail = contacts.find((c: any) => c.email && String(c.email).toLowerCase() === lower);
      const byName = contacts.find((c: any) => c.name && (String(c.name).toLowerCase() === lower || String(c.name).toLowerCase().startsWith(lower)));
      if (byEmail) resolved.push({ token: t, contactId: byEmail._id, name: byEmail.name, email: byEmail.email, resolved: true });
      else if (byName) resolved.push({ token: t, contactId: byName._id, name: byName.name, email: byName.email, resolved: true });
      else resolved.push({ token: t, contactId: null, name: t, email: t.includes("@") ? t : null, resolved: false });
    }
    return { tokens, resolved, resolvedCount: resolved.filter((r) => r.resolved).length, summary: `${resolved.filter((r) => r.resolved).length}/${tokens.length} mention(s) resolved to contacts` };
  }

  createMention(tenantId: string, input: any) {
    const text = String((input && input.text) || "");
    if (!text.trim()) throw new Error("Mention text is required");
    const contextType = String((input && input.contextType) || "comment");
    if (!MENTION_CONTEXTS.includes(contextType)) throw new Error(`Context must be one of ${MENTION_CONTEXTS.join(", ")}`);
    const contextId = String((input && input.contextId) || "");
    if (!contextId) throw new Error("contextId is required");
    const detection = this.mentionDetect(tenantId, text);
    const created: any[] = [];
    for (const r of detection.resolved) {
      if (!r.resolved || !r.email) continue;
      const rec = DataStore.mem().insert("mail_mentions", {
        tenantId,
        target: r.email.toLowerCase(),
        targetName: r.name,
        token: r.token,
        contextType,
        contextId,
        text,
        author: input.author || "user_001",
        read: false,
        createdAt: new Date().toISOString(),
      });
      created.push({ mentionId: rec._id, target: rec.target, targetName: rec.targetName, contextType, contextId });
    }
    if (created.length === 0) throw new Error("No mentionable recipients found in text — use @email or @contact name");
    return { created, count: created.length, summary: `${created.length} mention notification(s) created` };
  }

  listMentions(tenantId: string, opts: any = {}) {
    const pred = (x: any) => x.tenantId === tenantId &&
      (opts.unreadOnly ? x.read === false : true) &&
      (!opts.contextType || x.contextType === opts.contextType);
    const mentions = DataStore.mem().find("mail_mentions", pred)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, parseInt(String(opts.limit || "50"), 10))
      .map((x: any) => ({ mentionId: x._id, target: x.target, targetName: x.targetName, contextType: x.contextType, contextId: x.contextId, author: x.author, read: x.read, createdAt: x.createdAt }));
    return { mentions, count: mentions.length, summary: `${mentions.filter((x: any) => !x.read).length} unread mention(s)` };
  }

  markMentionRead(tenantId: string, mentionId: string) {
    const mention = DataStore.mem().findOne("mail_mentions", (x: any) => x._id === mentionId && x.tenantId === tenantId);
    if (!mention) throw new Error(`Mention "${mentionId}" not found`);
    DataStore.mem().update("mail_mentions", (x: any) => x._id === mention._id, { read: true, readAt: new Date().toISOString() });
    return { mentionId, read: true, summary: `Mention for ${mention.targetName} marked read` };
  }

  mentionsSummary(tenantId: string) {
    const mentions = DataStore.mem().find("mail_mentions", (x: any) => x.tenantId === tenantId);
    const unread = mentions.filter((x: any) => !x.read);
    const byContext = MENTION_CONTEXTS.map((c) => ({ context: c, count: mentions.filter((x: any) => x.contextType === c).length })).filter((c) => c.count > 0);
    return { total: mentions.length, unread: unread.length, byContext, summary: `${unread.length} unread mention(s) of ${mentions.length} total` };
  }

  // ---------- Combined dashboard ----------
  collab2Dashboard(tenantId: string) {
    const approvals = this.approvalDashboard(tenantId);
    const delegation = this.delegationSummary(tenantId);
    const team = this.teamDashboard(tenantId);
    const mentions = this.mentionsSummary(tenantId);
    return {
      approvals,
      delegation,
      team,
      mentions,
      attentionScore: approvals.pending + delegation.pending + mentions.unread,
      summary: `${approvals.pending} approval(s) pending · ${delegation.active} delegation(s) · ${mentions.unread} unread mention(s)`,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const mailCollab2 = new MailCollabV2Service();
