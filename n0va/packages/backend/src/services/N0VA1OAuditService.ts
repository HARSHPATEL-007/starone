import { DataStore } from "./DataStore";
import { n0va1oGov } from "./N0VA1OGovernanceService";
import { n0va1oCompliance } from "./N0VA1OComplianceService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function random6(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("n0va1o_directory_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export const MAX_RETENTION_DAYS = 3285; // 9 years

export const DIRECTORY_GROUPS = [
  { name: "engineering", defaultRoles: ["gateway.read", "tools.discover"] },
  { name: "marketing", defaultRoles: ["gateway.read", "tools.discover", "tools.execute"] },
  { name: "finance", defaultRoles: ["gateway.read", "audit.read"] },
  { name: "compliance", defaultRoles: ["audit.read", "hitl.review"] },
  { name: "admin", defaultRoles: ["gateway.write", "connections.manage", "hitl.review", "audit.read"] },
] as const;

export const RETENTION_COLLECTIONS = ["n0va1o_audit", "n0va1o_gov_log", "n0va1o_compliance_log", "n0va1o_cli_log", "n0va1o_auth_log"] as const;

function csvCell(v: any): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function pad4(n: number): string {
  return String(n % 10000).padStart(4, "0");
}

export class N0VA1OAuditService {
  private policyRow(tenantId: string): any {
    return DataStore.mem().findOne("n0va1o_audit_policy", (p: any) => p.tenantId === tenantId);
  }

  auditPolicy(tenantId: string) {
    const p = this.policyRow(tenantId);
    const policy = {
      metadataOnly: p?.metadataOnly === true,
      retentionEnabled: p?.retentionEnabled === true,
      retentionDays: p?.retentionDays ?? 365,
      updatedAt: p?.updatedAt || null,
    };
    return {
      ...policy,
      expiryLabel: policy.retentionDays >= 365 * 9 ? "9 years" : policy.retentionDays >= 365 ? `${Math.round(policy.retentionDays / 365)} year(s)` : `${policy.retentionDays} day(s)`,
      summary: `Audit policy — metadata-only ${policy.metadataOnly ? "ON" : "OFF"}, retention ${policy.retentionEnabled ? policy.retentionDays + " day(s)" : "disabled"}`,
    };
  }

  setAuditPolicy(tenantId: string, input: any) {
    const current = this.policyRow(tenantId);
    const retentionDays = Number.isFinite(input?.retentionDays)
      ? Math.max(1, Math.min(Math.floor(input.retentionDays), MAX_RETENTION_DAYS))
      : (current?.retentionDays ?? 365);
    const policy = {
      metadataOnly: input?.metadataOnly === true,
      retentionEnabled: input?.retentionEnabled === true,
      retentionDays,
    };
    const now = new Date().toISOString();
    if (current) {
      DataStore.mem().update("n0va1o_audit_policy", (p: any) => p._id === current._id, { ...policy, updatedAt: now });
    } else {
      DataStore.mem().insert("n0va1o_audit_policy", { tenantId, ...policy, createdAt: now, updatedAt: now });
    }
    logEntry(tenantId, "audit_policy_updated", `Audit policy updated — metadata-only ${policy.metadataOnly ? "ON" : "OFF"}, retention ${policy.retentionDays} day(s)`, { metadataOnly: policy.metadataOnly, retentionDays: policy.retentionDays });
    return { ...this.auditPolicy(tenantId), summary: `Audit policy saved — metadata-only ${policy.metadataOnly ? "ON" : "OFF"}, retention ${policy.retentionEnabled ? `${policy.retentionDays} day(s)` : "disabled"}` };
  }

  exportAuditCsv(tenantId: string, opts: any = {}) {
    const kind = String(opts?.kind || "audit") === "evidence" ? "evidence" : "audit";
    let content = "";
    let rows = 0;
    let filename = "";
    if (kind === "evidence") {
      const frameworkId = String(opts?.framework || "");
      const frameworks = frameworkId
        ? [n0va1oCompliance.complianceEvidence(tenantId, frameworkId)]
        : n0va1oCompliance.complianceReports(tenantId).reports.map((r: any) => n0va1oCompliance.complianceEvidence(tenantId, r.framework));
      const header = ["framework", "control", "control_name", "status", "score", "evidence"].map(csvCell).join(",");
      const body = frameworks.flatMap((f: any) => f.controls.map((c: any) => [f.framework, c.id, c.name, c.status, c.score, c.evidence].map(csvCell).join(",")));
      rows = body.length;
      content = [header, ...body].join("\n");
      filename = `n0va1o_evidence_${frameworkId || "all"}.csv`;
    } else {
      const entries = DataStore.mem().find("n0va1o_audit", (a: any) => a.tenantId === tenantId)
        .sort((a: any, b: any) => new Date(a.at).getTime() - new Date(b.at).getTime());
      const header = ["timestamp", "action", "toolId", "actor", "contentHash", "previousHash", "chainHash", "merkleRoot"].map(csvCell).join(",");
      const body = entries.map((e: any) => [e.at, e.action, e.toolId || "", e.actor, e.contentHash, e.previousHash || "GENESIS", e.chainHash, e.merkleRoot].map(csvCell).join(","));
      rows = body.length;
      content = [header, ...body].join("\n");
      filename = `n0va1o_audit_${tenantId}.csv`;
    }
    const policy = this.auditPolicy(tenantId);
    logEntry(tenantId, "audit_exported", `${kind} CSV exported — ${rows} row(s)`, { kind, rows, filename });
    return {
      filename, content, rows, bytes: content.length, kind,
      metadataOnly: policy.metadataOnly,
      summary: `${kind === "evidence" ? "Evidence" : "Audit"} CSV exported — ${rows} row(s), ${content.length} bytes`,
    };
  }

  retentionStatus(tenantId: string) {
    const policy = this.auditPolicy(tenantId);
    const cutoff = policy.retentionEnabled ? new Date(Date.now() - policy.retentionDays * 86400000).toISOString() : null;
    const counts: Record<string, number> = {};
    for (const c of RETENTION_COLLECTIONS) counts[c] = DataStore.mem().find(c, (x: any) => x.tenantId === tenantId).length;
    return {
      ...policy,
      cutoff,
      counts,
      expiryLabel: policy.expiryLabel,
      summary: policy.retentionEnabled
        ? `Retention ON — entries older than ${policy.retentionDays} day(s) (${policy.expiryLabel}) are purged`
        : "Retention disabled — logs kept indefinitely",
    };
  }

  applyRetention(tenantId: string) {
    const policy = this.auditPolicy(tenantId);
    if (!policy.retentionEnabled) {
      return { applied: false, reason: "Retention is disabled — enable it in the audit policy first", summary: "Retention disabled — nothing purged" };
    }
    const cutoffMs = Date.now() - policy.retentionDays * 86400000;
    const purged: Record<string, number> = {};
    for (const c of RETENTION_COLLECTIONS) {
      let n = 0;
      const stale = DataStore.mem().find(c, (x: any) => x.tenantId === tenantId && new Date(x.at || x.createdAt || 0).getTime() < cutoffMs);
      for (const row of stale) {
        DataStore.mem().delete(c, (x: any) => x.tenantId === tenantId && x._id === row._id);
        n++;
      }
      purged[c] = n;
    }
    const totalPurged = Object.values(purged).reduce((a, b) => a + b, 0);
    logEntry(tenantId, "retention_purged", `Retention purge — ${totalPurged} entr(ies) older than ${policy.retentionDays} day(s) removed`, { retentionDays: policy.retentionDays, purged });
    return {
      applied: true, retentionDays: policy.retentionDays, cutoff: new Date(cutoffMs).toISOString(),
      purged, totalPurged,
      summary: `Retention purge complete — ${totalPurged} entr(ies) removed`,
    };
  }

  directoryGroups(tenantId: string) {
    const groups = DataStore.mem().find("n0va1o_directory_groups", (g: any) => g.tenantId === tenantId);
    return {
      groups: groups.map((g: any) => ({ groupId: g._id, name: g.name, roles: g.roles, members: g.members || 0, updatedAt: g.updatedAt })),
      total: groups.length,
      summary: `${groups.length} directory group(s) mapped`,
    };
  }

  syncDirectory(tenantId: string, input: any) {
    const groups = Array.isArray(input?.groups) ? input.groups : [];
    const users = Array.isArray(input?.users) ? input.users : [];
    let groupsCreated = 0, groupsUpdated = 0, usersCreated = 0, usersUpdated = 0;
    const deprovisioned: any[] = [];
    for (const g of groups) {
      const name = String(g?.name || "").trim().toLowerCase();
      if (!name) continue;
      const roles = Array.isArray(g?.roles) ? g.roles.map(String) : [];
      const existing = DataStore.mem().findOne("n0va1o_directory_groups", (x: any) => x.tenantId === tenantId && x.name === name);
      if (existing) {
        DataStore.mem().update("n0va1o_directory_groups", (x: any) => x._id === existing._id, { roles, updatedAt: new Date().toISOString() });
        groupsUpdated++;
      } else {
        DataStore.mem().insert("n0va1o_directory_groups", {
          tenantId, name, roles, members: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
        groupsCreated++;
      }
    }
    for (const u of users) {
      const email = String(u?.email || "").toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      const userGroups = Array.isArray(u?.groups) ? u.groups.map(String).map((s: string) => s.toLowerCase()) : [];
      const status = String(u?.status || "active") === "suspended" ? "suspended" : "active";
      const existing = DataStore.mem().findOne("n0va1o_directory_users", (x: any) => x.tenantId === tenantId && x.email === email);
      const wasActive = existing?.status === "active";
      const now = new Date().toISOString();
      if (existing) {
        DataStore.mem().update("n0va1o_directory_users", (x: any) => x._id === existing._id, { groups: userGroups, status, updatedAt: now });
        usersUpdated++;
      } else {
        DataStore.mem().insert("n0va1o_directory_users", { tenantId, email, groups: userGroups, status, createdAt: now, updatedAt: now });
        usersCreated++;
      }
      if (status === "suspended" && wasActive) {
        const agents = DataStore.mem().find("n0va1o_agents", (a: any) => a.tenantId === tenantId && a.ownerEmail === email && a.status === "active");
        const agentIds = agents.map((a: any) => a._id);
        for (const a of agents) {
          DataStore.mem().update("n0va1o_agents", (x: any) => x._id === a._id, { status: "inactive", deprovisionedAt: now, updatedAt: now });
        }
        let revokedTokens = 0;
        const tokens = DataStore.mem().find("n0va1o_tokens", (t: any) => t.tenantId === tenantId && agentIds.includes(t.agentId) && t.status === "active");
        for (const t of tokens) {
          DataStore.mem().update("n0va1o_tokens", (x: any) => x._id === t._id, { status: "revoked", updatedAt: now });
          revokedTokens++;
        }
        let endedSessions = 0;
        const sessions = DataStore.mem().find("n0va1o_cli_sessions", (s: any) => s.tenantId === tenantId && s.email === email && s.status === "authenticated");
        for (const s of sessions) {
          DataStore.mem().update("n0va1o_cli_sessions", (x: any) => x._id === s._id, { status: "ended", endedAt: now, updatedAt: now });
          endedSessions++;
        }
        deprovisioned.push({ email, revokedAgents: agents.length, revokedTokens, endedSessions });
        logEntry(tenantId, "user_deprovisioned", `${email} suspended — ${agents.length} agent(s) deactivated, ${revokedTokens} token(s) revoked, ${endedSessions} session(s) ended`, { email });
      }
    }
    logEntry(tenantId, "directory_synced", `Directory sync — ${groupsCreated + groupsUpdated} group(s), ${usersCreated + usersUpdated} user(s), ${deprovisioned.length} deprovisioned`, { groupsCreated, groupsUpdated, usersCreated, usersUpdated, deprovisioned: deprovisioned.length });
    return {
      groups: { created: groupsCreated, updated: groupsUpdated },
      users: { created: usersCreated, updated: usersUpdated },
      deprovisioned,
      deprovisionedCount: deprovisioned.length,
      summary: `Directory synced — ${groupsCreated + groupsUpdated} group(s), ${usersCreated + usersUpdated} user(s), ${deprovisioned.length} user(s) deprovisioned in real time`,
    };
  }

  directoryDashboard(tenantId: string) {
    const groups = DataStore.mem().find("n0va1o_directory_groups", (g: any) => g.tenantId === tenantId);
    const users = DataStore.mem().find("n0va1o_directory_users", (u: any) => u.tenantId === tenantId);
    const recent = DataStore.mem().find("n0va1o_directory_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 10);
    return {
      groups: groups.length,
      users: users.length,
      activeUsers: users.filter((u: any) => u.status === "active").length,
      suspendedUsers: users.filter((u: any) => u.status === "suspended").length,
      deprovisionEvents: recent.filter((l: any) => l.category === "user_deprovisioned").length,
      recent,
      summary: `${groups.length} group(s), ${users.length} user(s) (${users.filter((u: any) => u.status === "suspended").length} suspended)`,
    };
  }

  directoryLog(tenantId: string, limit = 50) {
    const entries = DataStore.mem().find("n0va1o_directory_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
    return { entries, total: entries.length };
  }

  auditDashboard(tenantId: string) {
    const policy = this.auditPolicy(tenantId);
    const retention = this.retentionStatus(tenantId);
    const chain = n0va1oGov.verifyAuditChain(tenantId);
    const directory = this.directoryDashboard(tenantId);
    return {
      policy, retention, chain, directory,
      generatedAt: new Date().toISOString(),
      summary: `Audit — chain ${chain.chainIntact ? "intact" : "BROKEN"} (${chain.entries} entr(ies)), metadata-only ${policy.metadataOnly ? "ON" : "OFF"}, retention ${policy.retentionEnabled ? `${policy.retentionDays} day(s)` : "disabled"}`,
    };
  }

  auditLog(tenantId: string, limit = 50) {
    return n0va1oGov.auditLog(tenantId, limit);
  }

  simulateDirectoryPulse(tenantId: string, email: string) {
    const seed = `${tenantId}|${email}|pulse`;
    return {
      email, heartbeatMs: 30 + (hashStr(seed) % 240),
      syncLatencyMs: 12 + (hashStr(seed + "sync") % 40),
      identity: { directoryId: `dir_${pad4(hashStr(seed + "id1"))}-${pad4(hashStr(seed + "id2"))}` },
      nextSyncS: 30,
      summary: `Directory pulse for ${email} — real-time lifecycle sync armed`,
    };
  }
}

export const n0va1oAudit = new N0VA1OAuditService();
