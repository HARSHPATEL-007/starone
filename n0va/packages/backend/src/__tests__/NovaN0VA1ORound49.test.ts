import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { n0va1oCli } from "../services/N0VA1OClIService";
import { n0va1oAudit } from "../services/N0VA1OAuditService";
import { n0va1oGov } from "../services/N0VA1OGovernanceService";
import { n0va1oAuth } from "../services/N0VA1OAuthService";
import { n0va1oCompliance } from "../services/N0VA1OComplianceService";

const T = "nova49";
const T2 = "nova49b";
const T3 = "nova49c";
const T4 = "nova49d";
const T5 = "nova49e";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function pad4(n: number): string {
  return String(n % 10000).padStart(4, "0");
}

beforeAll(() => {
  // none — each describe uses isolated tenants
});

describe("N0VA1O Universal CLI — catalog + install lifecycle", () => {
  it("cliCatalog exposes 16 commands + 4 platforms + 1,384 integrations", () => {
    const c: any = n0va1oCli.cliCatalog();
    expect(c.totalCommands).toBe(16);
    expect(c.platforms.map((p: any) => p.id)).toEqual(["macos", "win32", "linux", "npm"]);
    expect(c.version).toBe("1.1384.0");
    expect(c.commands.map((x: any) => x.command)).toContain("discover");
    expect(c.commands.map((x: any) => x.command)).toContain("call");
    expect(c.summary).toContain("1384");
  });

  it("installCli validates platform and installs deterministically", () => {
    const s: any = n0va1oCli.installCli(T, { platform: "win32" });
    expect(s.installed).toBe(true);
    expect(s.platform).toBe("win32");
    expect(s.installCommand).toBe("irm https://n0va.io/cli/install.ps1 | iex");
    const expectedSeconds = 8 + (hashStr(`${T}|win32install`) % 23);
    const expectedSize = 24 + (hashStr(`${T}|win32size`) % 40);
    expect(s.installSeconds).toBe(expectedSeconds);
    expect(s.packageSizeMb).toBe(expectedSize);
  });

  it("installCli rejects unknown platforms", () => {
    expect(() => (n0va1oCli.installCli(T, { platform: "beos" }) as any)).toThrow(/Unknown platform/);
  });

  it("re-install updates the existing record and status reflects it", () => {
    n0va1oCli.installCli(T, { platform: "npm" });
    const status: any = n0va1oCli.cliInstallStatus(T);
    expect(status.installed).toBe(true);
    expect(status.platform).toBe("npm");
    expect(status.version).toBe("1.1384.0");
  });

  it("cliInstallStatus reports not-installed on a fresh tenant", () => {
    const s: any = n0va1oCli.cliInstallStatus(T4);
    expect(s.installed).toBe(false);
    expect(s.summary).toContain("not installed");
  });
});

describe("N0VA1O Universal CLI — device-code auth + sessions", () => {
  it("authenticateCli requires a valid email", () => {
    expect(() => (n0va1oCli.authenticateCli(T, { email: "nope" }) as any)).toThrow(/valid email/);
  });

  it("authenticateCli starts a pending device-code session", () => {
    const a: any = n0va1oCli.authenticateCli(T, { email: "ana@n0va.io" });
    expect(a.sessionId).toMatch(/^cli_/);
    expect(a.status).toBe("pending");
    expect(a.expiresInSeconds).toBe(600);
    const expectedCode = `n0va-${pad4(hashStr(`${T}|ana@n0va.iodc1`))}-${pad4(hashStr(`${T}|ana@n0va.iodc2`))}`;
    expect(a.deviceCode).toBe(expectedCode);
    expect(a.verificationUrl).toBe("https://n0va.io/cli/device");
    expect(a.scopes).toEqual(["tools.discover", "tools.execute", "gateway.read"]);
  });

  it("completeCliAuth flips the session to authenticated with cli_at_/cli_rt_ tokens", () => {
    const a: any = n0va1oCli.authenticateCli(T, { email: "ana@n0va.io" });
    const done: any = n0va1oCli.completeCliAuth(T, a.sessionId);
    expect(done.status).toBe("authenticated");
    expect(done.accessToken).toMatch(/^cli_at_/);
    expect(done.refreshToken).toMatch(/^cli_rt_/);
    expect(done.email).toBe("ana@n0va.io");
  });

  it("completeCliAuth rejects unknown or already-completed sessions", () => {
    expect(() => (n0va1oCli.completeCliAuth(T, "cli_missing") as any)).toThrow(/session not found/);
    const a: any = n0va1oCli.authenticateCli(T, { email: "bob@n0va.io" });
    n0va1oCli.completeCliAuth(T, a.sessionId);
    expect(() => (n0va1oCli.completeCliAuth(T, a.sessionId) as any)).toThrow(/already completed/);
  });

  it("cliSessions lists sessions with status filters", () => {
    const all: any = n0va1oCli.cliSessions(T);
    expect(all.authenticated).toBeGreaterThanOrEqual(2);
    const pending: any = n0va1oCli.cliSessions(T, "pending");
    expect(pending.total).toBeGreaterThanOrEqual(1);
    const sessions = all.sessions.filter((s: any) => s.status === "authenticated");
    expect(sessions.every((s: any) => s.sessionId && s.email)).toBe(true);
  });

  it("endCliSession ends a session and makes whoami fall back", () => {
    const a: any = n0va1oCli.authenticateCli(T2, { email: "carol@n0va.io" });
    const done: any = n0va1oCli.completeCliAuth(T2, a.sessionId);
    const ended: any = n0va1oCli.endCliSession(T2, done.sessionId);
    expect(ended.status).toBe("ended");
    const who: any = n0va1oCli.executeCliCommand(T2, { command: "n0va whoami" });
    expect(who.exitCode).toBe(1);
    expect(who.stderr).toContain("Not authenticated");
  });

  it("endCliSession throws on unknown sessions", () => {
    expect(() => (n0va1oCli.endCliSession(T, "cli_nope") as any)).toThrow(/session not found/);
  });
});

describe("N0VA1O Universal CLI — command execution", () => {
  it("version prints cli + gateway counts", () => {
    const r: any = n0va1oCli.executeCliCommand(T, { command: "n0va version" });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("n0va1o-cli/1.1384.0");
    expect(r.stdout).toContain("1384 platforms");
  });

  it("help prints the full command reference", () => {
    const r: any = n0va1oCli.executeCliCommand(T, { command: "n0va help" });
    expect(r.exitCode).toBe(0);
    expect(r.stdout.split("\n").length).toBe(16);
  });

  it("status reflects install + auth state without auth requirement", () => {
    const r: any = n0va1oCli.executeCliCommand(T, { command: "n0va status" });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("installed: yes (npm, 1.1384.0)");
    expect(r.stdout).toContain("authenticated: yes");
  });

  it("whoami requires an authenticated session", () => {
    const r: any = n0va1oCli.executeCliCommand(T4, { command: "whoami" });
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("Not authenticated");
  });

  it("discover requires a query argument", () => {
    const r: any = n0va1oCli.executeCliCommand(T, { command: "n0va discover" });
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("Usage: n0va discover <query>");
  });

  it("discover lists matching tools once authenticated", () => {
    const r: any = n0va1oCli.executeCliCommand(T, { command: "n0va discover crm" });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("hubspot_crm");
    expect(r.stdout).toContain("tool(s) matched");
  });

  it("cliDiscover returns tool cards with capabilities", () => {
    const d: any = n0va1oCli.cliDiscover(T, "hubspot");
    expect(d.returned).toBeGreaterThanOrEqual(1);
    const tool = d.tools.find((t: any) => t.toolId === "hubspot_crm");
    expect(tool).toBeTruthy();
    expect(Array.isArray(tool.capabilities)).toBe(true);
    expect(d.count).toBe(d.tools.length);
  });

  it("call rejects unknown tool ids", () => {
    const r: any = n0va1oCli.executeCliCommand(T, { command: "n0va call does_not_exist_xyz" });
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("tool not found");
  });

  it("call executes a real tool deterministically and stamps the audit chain", () => {
    const before: any = n0va1oGov.verifyAuditChain(T);
    const r: any = n0va1oCli.executeCliCommand(T, { command: "n0va call hubspot_crm" });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("✓ HubSpot CRM executed via gateway");
    const expectedMs = 20 + (hashStr(`${T}|hubspot_crm|call`) % 180);
    expect(r.stdout).toContain(`${expectedMs}ms`);
    const after: any = n0va1oGov.verifyAuditChain(T);
    expect(after.entries).toBe(before.entries + 1);
    expect(after.chainIntact).toBe(true);
  });

  it("call requires auth on a fresh tenant", () => {
    const r: any = n0va1oCli.executeCliCommand(T4, { command: "n0va call hubspot_crm" });
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("Not authenticated");
  });

  it("sessions lists sessions from the CLI", () => {
    const r: any = n0va1oCli.executeCliCommand(T, { command: "n0va sessions" });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("ana@n0va.io");
  });

  it("logout ends the active session", () => {
    const a: any = n0va1oCli.authenticateCli(T2, { email: "dana@n0va.io" });
    n0va1oCli.completeCliAuth(T2, a.sessionId);
    const r: any = n0va1oCli.executeCliCommand(T2, { command: "n0va logout" });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Logged out");
    const s: any = n0va1oCli.cliSessions(T2, "ended");
    expect(s.sessions.some((x: any) => x.email === "dana@n0va.io")).toBe(true);
  });

  it("unknown commands fail with guidance", () => {
    const r: any = n0va1oCli.executeCliCommand(T, { command: "n0va frobnicate" });
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain('Unknown command "frobnicate"');
  });

  it("empty command throws", () => {
    expect(() => (n0va1oCli.executeCliCommand(T, { command: "" }) as any)).toThrow(/command is required/);
  });
});

describe("N0VA1O Universal CLI — dashboard + log", () => {
  it("cliDashboard aggregates install/sessions/commands/integrations", () => {
    const d: any = n0va1oCli.cliDashboard(T);
    expect(d.installed).toBe(true);
    expect(d.installPlatform).toBe("npm");
    expect(d.activeSessions).toBeGreaterThanOrEqual(1);
    expect(d.commandsRun).toBeGreaterThan(5);
    expect(d.integrationsReachable).toBe(1384);
    expect(d.summary).toContain("command(s) run");
  });

  it("cliLog returns the most recent entries sorted desc", () => {
    const l: any = n0va1oCli.cliLog(T, 5);
    expect(l.total).toBeGreaterThan(0);
    const ats = l.entries.map((e: any) => new Date(e.at).getTime());
    expect([...ats].sort((a, b) => b - a)).toEqual(ats);
    const cats = l.entries.map((e: any) => e.category);
    expect(cats).toContain("cli_command");
  });

  it("cliLog on a fresh tenant is empty", () => {
    const l: any = n0va1oCli.cliLog(T5);
    expect(l.total).toBe(0);
  });
});

describe("Audit-aware compliance — policy + metadata-only enforcement", () => {
  it("default policy is metadata-only OFF, retention disabled, 365 days", () => {
    const p: any = n0va1oAudit.auditPolicy(T4);
    expect(p.metadataOnly).toBe(false);
    expect(p.retentionEnabled).toBe(false);
    expect(p.retentionDays).toBe(365);
  });

  it("setAuditPolicy persists metadataOnly + retention flags", () => {
    const p: any = n0va1oAudit.setAuditPolicy(T4, { metadataOnly: true, retentionEnabled: true, retentionDays: 90 });
    expect(p.metadataOnly).toBe(true);
    expect(p.retentionEnabled).toBe(true);
    expect(p.retentionDays).toBe(90);
    const again: any = n0va1oAudit.auditPolicy(T4);
    expect(again.metadataOnly).toBe(true);
    expect(again.retentionDays).toBe(90);
  });

  it("retentionDays clamps to 1..3285 (9 years)", () => {
    const low: any = n0va1oAudit.setAuditPolicy(T4, { retentionDays: 0 });
    expect(low.retentionDays).toBe(1);
    const high: any = n0va1oAudit.setAuditPolicy(T4, { retentionDays: 99999 });
    expect(high.retentionDays).toBe(3285);
    expect(high.expiryLabel).toBe("9 years");
  });

  it("appendAudit keeps full details when metadata-only is OFF", () => {
    n0va1oAudit.setAuditPolicy(T3, { metadataOnly: false });
    const e: any = n0va1oGov.appendAudit(T3, { action: "full_log", toolId: "t1", actor: "ana", details: { secret: "payload", amount: 42 } });
    expect(e.details).toEqual({ secret: "payload", amount: 42 });
    expect(n0va1oGov.verifyAuditChain(T3).chainIntact).toBe(true);
  });

  it("appendAudit redacts payloads when metadata-only is ON and the chain stays intact", () => {
    n0va1oAudit.setAuditPolicy(T4, { metadataOnly: true });
    const e: any = n0va1oGov.appendAudit(T4, { action: "redact_check", toolId: "t2", actor: "bob", details: { secret: "super-secret-payload", cc: "4111" } });
    expect(e.details).toEqual({ redacted: true });
    expect(JSON.stringify(e.details)).not.toContain("super-secret-payload");
    const v: any = n0va1oGov.verifyAuditChain(T4);
    expect(v.chainIntact).toBe(true);
    expect(v.entries).toBeGreaterThanOrEqual(1);
  });
});

describe("Audit-aware compliance — instant CSV exports", () => {
  it("exportAuditCsv emits a header + one row per audit entry", () => {
    const csv: any = n0va1oAudit.exportAuditCsv(T3, { kind: "audit" });
    expect(csv.kind).toBe("audit");
    expect(csv.filename).toBe(`n0va1o_audit_${T3}.csv`);
    const lines = csv.content.split("\n");
    expect(lines[0]).toContain("timestamp");
    expect(lines[0]).toContain("chainHash");
    expect(lines.length).toBe(csv.rows + 1);
    expect(lines[1]).toContain("full_log");
  });

  it("audit CSV escapes quotes in values", () => {
    n0va1oGov.appendAudit(T3, { action: 'quo"ted', toolId: "t3", actor: "ana", details: { x: 1 } });
    const csv: any = n0va1oAudit.exportAuditCsv(T3, { kind: "audit" });
    expect(csv.content).toContain('"quo""ted"');
  });

  it("evidence CSV spans all frameworks by default", () => {
    const csv: any = n0va1oAudit.exportAuditCsv(T3, { kind: "evidence" });
    expect(csv.filename).toBe("n0va1o_evidence_all.csv");
    const lines = csv.content.split("\n");
    expect(lines[0]).toContain("framework");
    expect(lines[0]).toContain("score");
    expect(csv.rows).toBeGreaterThan(20);
    const frameworks = new Set(lines.slice(1).map((l: string) => l.split(",")[0].replace(/"/g, "")));
    expect(frameworks.size).toBe(7);
  });

  it("evidence CSV filters to a single framework", () => {
    const csv: any = n0va1oAudit.exportAuditCsv(T3, { kind: "evidence", framework: "gdpr" });
    expect(csv.filename).toBe("n0va1o_evidence_gdpr.csv");
    const lines = csv.content.split("\n");
    expect(lines.length - 1).toBe(csv.rows);
    expect(lines.slice(1).every((l: string) => l.startsWith('"gdpr"'))).toBe(true);
  });

  it("unknown export kind falls back to audit", () => {
    const csv: any = n0va1oAudit.exportAuditCsv(T3, { kind: "bogus" });
    expect(csv.kind).toBe("audit");
  });
});

describe("Audit-aware compliance — flexible retention (1 day to 9 years)", () => {
  it("retentionStatus reports counts + cutoff when enabled", () => {
    n0va1oAudit.setAuditPolicy(T4, { retentionEnabled: true, retentionDays: 90 });
    const r: any = n0va1oAudit.retentionStatus(T4);
    expect(r.retentionEnabled).toBe(true);
    expect(r.cutoff).toBeTruthy();
    expect(r.counts["n0va1o_audit"]).toBeGreaterThanOrEqual(1);
    expect(r.summary).toContain("day(s)");
  });

  it("applyRetention no-ops when retention is disabled", () => {
    const r: any = n0va1oAudit.applyRetention(T3);
    expect(r.applied).toBe(false);
    expect(r.reason).toContain("disabled");
  });

  it("applyRetention purges only entries older than the cutoff", () => {
    const now = Date.now();
    const seed = [
      { action: "old_entry_1", at: new Date(now - 500 * 86400000).toISOString() },
      { action: "old_entry_2", at: new Date(now - 400 * 86400000).toISOString() },
      { action: "fresh_entry", at: new Date(now - 1000).toISOString() },
    ];
    for (const s of seed) {
      DataStore.mem().insert("n0va1o_audit", {
        tenantId: T2, action: s.action, toolId: "ret", actor: "auditor", details: {},
        contentHash: "c", chainHash: "h", previousHash: "GENESIS", merkleRoot: "m", at: s.at,
      });
    }
    n0va1oAudit.setAuditPolicy(T2, { retentionEnabled: true, retentionDays: 90 });
    const r: any = n0va1oAudit.applyRetention(T2);
    expect(r.applied).toBe(true);
    expect(r.purged["n0va1o_audit"]).toBe(2);
    expect(r.totalPurged).toBe(2);
    const remaining = DataStore.mem().find("n0va1o_audit", (a: any) => a.tenantId === T2);
    expect(remaining.map((a: any) => a.action)).toEqual(["fresh_entry"]);
  });

  it("retention purge is idempotent — second run purges nothing", () => {
    const r: any = n0va1oAudit.applyRetention(T2);
    expect(r.applied).toBe(true);
    expect(r.totalPurged).toBe(0);
  });

  it("9-year retention keeps everything", () => {
    n0va1oAudit.setAuditPolicy(T4, { retentionEnabled: true, retentionDays: 3285 });
    const r: any = n0va1oAudit.applyRetention(T4);
    expect(r.applied).toBe(true);
    expect(r.totalPurged).toBe(0);
  });
});

describe("Audit-aware compliance — directory access control + real-time de-provisioning", () => {
  it("syncDirectory upserts groups and users", () => {
    const r: any = n0va1oAudit.syncDirectory(T3, {
      groups: [{ name: "Engineering", roles: ["gateway.read", "tools.discover"] }, { name: "Finance", roles: ["audit.read"] }],
      users: [{ email: "dev@n0va.io", groups: ["engineering"], status: "active" }, { email: "fin@n0va.io", groups: ["finance"], status: "active" }],
    });
    expect(r.groups.created).toBe(2);
    expect(r.users.created).toBe(2);
    expect(r.deprovisionedCount).toBe(0);
    const g: any = n0va1oAudit.directoryGroups(T3);
    expect(g.total).toBe(2);
    expect(g.groups.map((x: any) => x.name)).toContain("engineering");
  });

  it("re-syncing updates rather than duplicates", () => {
    const r: any = n0va1oAudit.syncDirectory(T3, {
      groups: [{ name: "Engineering", roles: ["tools.execute"] }],
      users: [{ email: "dev@n0va.io", groups: ["engineering"], status: "active" }],
    });
    expect(r.groups.updated).toBe(1);
    expect(r.users.updated).toBe(1);
    expect(n0va1oAudit.directoryGroups(T3).total).toBe(2);
  });

  it("syncing with a fresh tenant does not touch other tenants' users", () => {
    const r: any = n0va1oAudit.syncDirectory(T4, { users: [{ email: "dev@n0va.io", status: "suspended" }] });
    expect(r.deprovisionedCount).toBe(0);
  });

  it("suspending a user deprovisions their agents, tokens, and CLI sessions in real time", () => {
    n0va1oAudit.syncDirectory(T, { users: [{ email: "ana@n0va.io", status: "active" }] });
    const agent: any = n0va1oAuth.registerAgent(T, {
      name: "Deprovision Me", scopes: ["gateway.read", "tools.execute"], ownerEmail: "ana@n0va.io",
    });
    n0va1oAuth.mintJitToken(T, { agentId: agent.agentId, ttlSec: 600 });
    const a: any = n0va1oCli.authenticateCli(T, { email: "ana@n0va.io" });
    n0va1oCli.completeCliAuth(T, a.sessionId);
    const r: any = n0va1oAudit.syncDirectory(T, { users: [{ email: "ana@n0va.io", status: "suspended" }] });
    expect(r.deprovisionedCount).toBe(1);
    const dep = r.deprovisioned[0];
    expect(dep.email).toBe("ana@n0va.io");
    expect(dep.revokedAgents).toBe(1);
    expect(dep.revokedTokens).toBe(1);
    expect(dep.endedSessions).toBeGreaterThanOrEqual(1);
    const agents: any = n0va1oAuth.listAgents(T);
    expect(agents.agents.find((x: any) => x.agentId === agent.agentId).status).toBe("inactive");
    const sessions: any = n0va1oCli.cliSessions(T);
    expect(sessions.sessions.filter((s: any) => s.email === "ana@n0va.io" && s.status === "ended").length).toBeGreaterThanOrEqual(1);
  });

  it("re-suspending an already-suspended user does not double-deprovision", () => {
    const r: any = n0va1oAudit.syncDirectory(T, { users: [{ email: "ana@n0va.io", status: "suspended" }] });
    expect(r.deprovisionedCount).toBe(0);
  });

  it("directoryDashboard summarizes groups/users and deprovision events", () => {
    const d: any = n0va1oAudit.directoryDashboard(T);
    expect(d.groups).toBeGreaterThanOrEqual(0);
    expect(d.users).toBeGreaterThanOrEqual(1);
    expect(d.suspendedUsers).toBeGreaterThanOrEqual(1);
    expect(d.deprovisionEvents).toBeGreaterThanOrEqual(1);
    expect(d.summary).toContain("suspended");
  });
});

describe("Audit-aware compliance — dashboard + log + pulse", () => {
  it("auditDashboard merges policy, retention, chain, and directory", () => {
    const d: any = n0va1oAudit.auditDashboard(T);
    expect(d.policy).toBeTruthy();
    expect(d.retention).toBeTruthy();
    expect(d.chain).toBeTruthy();
    expect(d.directory).toBeTruthy();
    expect(d.summary).toContain("Audit");
  });

  it("auditLog delegates to the governance chain log", () => {
    const l: any = n0va1oAudit.auditLog(T, 10);
    expect(l.total).toBeGreaterThanOrEqual(1);
    expect(l.entries[0].action).toBeTruthy();
  });

  it("directoryLog is sorted desc and includes deprovision entries", () => {
    const l: any = n0va1oAudit.directoryLog(T);
    expect(l.total).toBeGreaterThan(0);
    expect(l.entries.map((e: any) => e.category)).toContain("user_deprovisioned");
    const ats = l.entries.map((e: any) => new Date(e.at).getTime());
    expect([...ats].sort((a, b) => b - a)).toEqual(ats);
  });

  it("simulateDirectoryPulse reports the real-time sync heartbeat", () => {
    const p: any = n0va1oAudit.simulateDirectoryPulse(T, "ana@n0va.io");
    expect(p.email).toBe("ana@n0va.io");
    expect(p.heartbeatMs).toBeGreaterThan(29);
    expect(p.identity.directoryId).toMatch(/^dir_/);
    expect(p.nextSyncS).toBe(30);
    expect(p.summary).toContain("lifecycle sync armed");
  });

  it("compliance evidence still scores with the audit policy in place", () => {
    const ev: any = n0va1oCompliance.complianceEvidence(T, "gdpr");
    expect(ev.framework).toBe("gdpr");
    expect(ev.controls.length).toBeGreaterThan(0);
    expect(["pass", "warn", "fail"]).toContain(ev.status);
  });
});
