import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { n0va1oMigration } from "../services/N0VA1OMigrationService";
import { n0va1oAuth } from "../services/N0VA1OAuthService";
import { n0va1oGov } from "../services/N0VA1OGovernanceService";

const T = "nova52";
const T2 = "nova52b";
const T3 = "nova52c";
const T4 = "nova52d";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

beforeAll(() => {
  DataStore.mem().insert("n0va1o_state", { tenantId: T, plan: "growth", createdAt: new Date().toISOString() });
  DataStore.mem().insert("n0va1o_state", { tenantId: T2, plan: "growth", createdAt: new Date().toISOString() });
  DataStore.mem().insert("n0va1o_agents", { tenantId: T3, name: "OAuth Agent", status: "active", scopes: ["gateway.read"], createdAt: new Date().toISOString() });
});

describe("Migration assistant — catalog & start (spec §16)", () => {
  it("migrationCatalog exposes 4 legacy sources × 6 phases", () => {
    const cat: any = n0va1oMigration.migrationCatalog();
    expect(cat.targets.map((t: any) => t.id)).toEqual(["zapier", "mulesoft", "workato", "tray"]);
    expect(cat.phases.map((p: any) => p.id)).toEqual(["audit_export", "agents", "recipes", "connections", "webhooks", "validate"]);
    expect(cat.summary).toContain("4 legacy gateway source(s) × 6 migration phases");
  });

  it("startMigration rejects unknown sources", () => {
    expect(() => n0va1oMigration.startMigration(T, { source: "bogus" })).toThrow(/Unknown migration source/);
    expect(() => n0va1oMigration.startMigration(T, {})).toThrow(/Unknown migration source/);
  });

  it("startMigration creates migration + 6 phase rows with deterministic estimates", () => {
    const m: any = n0va1oMigration.startMigration(T, { source: "zapier", label: "Smoke Zapier import" });
    expect(m.migrationId).toMatch(/^mig_/);
    expect(m.source).toBe("zapier");
    expect(m.status).toBe("in_progress");
    expect(m.phases).toHaveLength(6);
    expect(m.transferSizeEstimateMB).toBeGreaterThan(400);
    expect(m.durationEstimateMin).toBeGreaterThanOrEqual(18);
    const list: any = n0va1oMigration.listMigrations(T);
    expect(list.total).toBe(1);
    expect(list.inProgress).toBe(1);
    const phases = DataStore.mem().find("n0va1o_migration_phases", (p: any) => p.migrationId === m.migrationId);
    expect(phases).toHaveLength(6);
    expect(phases.find((p: any) => p.order === 0)?.status).toBe("ready");
    expect(phases.filter((p: any) => p.status === "blocked")).toHaveLength(5);
  });
});

describe("Migration — plan & phase execution", () => {
  it("migrationPlan lists phases with dependency chain", () => {
    const m: any = n0va1oMigration.startMigration(T2, { source: "workato", label: "Plan check" });
    const plan: any = n0va1oMigration.migrationPlan(T2, m.migrationId);
    expect(plan.phases).toHaveLength(6);
    expect(plan.phases[1].dependsOn).toBe("audit_export");
    expect(plan.dependencyChain).toContain("recipes");
    expect(plan.phases.every((p: any) => p.transferSizeEstimateMB > 0 && p.durationEstimateMin > 0)).toBe(true);
  });

  it("runMigrationPhase blocks on unmet dependencies", () => {
    const m: any = n0va1oMigration.startMigration(T2, { source: "tray", label: "Blocked check" });
    expect(() => n0va1oMigration.runMigrationPhase(T2, m.migrationId, "recipes")).toThrow(/blocked/);
    expect(() => n0va1oMigration.runMigrationPhase(T2, m.migrationId, "bogus")).toThrow(/Phase not found/);
  });

  it("sequential phase runs complete the migration deterministically", () => {
    const m: any = n0va1oMigration.startMigration(T2, { source: "mulesoft", label: "Full run" });
    for (const phaseId of ["audit_export", "agents", "recipes", "connections", "webhooks", "validate"]) {
      let pct = 0;
      let status = "";
      for (let i = 0; i < 2; i++) {
        const r: any = n0va1oMigration.runMigrationPhase(T2, m.migrationId, phaseId);
        pct = r.transferPct;
        status = r.status;
        if (status === "done") break;
      }
      expect(status).toBe("done");
      expect(pct).toBe(100);
      expect(() => n0va1oMigration.runMigrationPhase(T2, m.migrationId, phaseId)).toThrow(/already completed|not in progress/);
    }
    const status: any = n0va1oMigration.migrationStatus(T2, m.migrationId);
    expect(status.status).toBe("completed");
    expect(status.progressPct).toBe(100);
    expect(status.remaining).toBe(0);
    expect(status.summary).toContain("Migration complete");
  });
});

describe("Migration — status, dashboard, log, delete", () => {
  it("migrationStatus reports progress and remaining", () => {
    const m: any = n0va1oMigration.startMigration(T, { source: "zapier" });
    let r: any = { status: "" };
    for (let i = 0; i < 2 && r.status !== "done"; i++) {
      r = n0va1oMigration.runMigrationPhase(T, m.migrationId, "audit_export");
    }
    const status: any = n0va1oMigration.migrationStatus(T, m.migrationId);
    expect(status.progressPct).toBeGreaterThan(0);
    expect(status.progressPct).toBeLessThanOrEqual(100);
    expect(status.remaining).toBe(5);
    expect(r.transferPct).toBeGreaterThanOrEqual(60);
    expect(r.transferPct).toBeLessThanOrEqual(100);
    expect(r.itemsImported).toBeGreaterThanOrEqual(8);
  });

  it("migrationDashboard aggregates counts and by-source", () => {
    const d: any = n0va1oMigration.migrationDashboard(T);
    expect(d.counts.total).toBe(2);
    expect(d.counts.inProgress).toBe(2);
    expect(d.counts.phasesTotal).toBe(12);
    expect(d.counts.phasesDone).toBe(1);
    expect(d.bySource.find((s: any) => s.source === "zapier")?.count).toBe(2);
  });

  it("migrationLog records started + phase events", () => {
    const log: any = n0va1oMigration.migrationLog(T);
    expect(log.entries.some((e: any) => e.category === "migration_started")).toBe(true);
    expect(log.entries.some((e: any) => e.category === "phase_run")).toBe(true);
  });

  it("deleteMigration removes migration + phases", () => {
    const m: any = n0va1oMigration.startMigration(T, { source: "tray", label: "Doomed" });
    const before: any = n0va1oMigration.listMigrations(T);
    const del: any = n0va1oMigration.deleteMigration(T, m.migrationId);
    expect(del.removed).toBe(true);
    const after: any = n0va1oMigration.listMigrations(T);
    expect(after.total).toBe(before.total - 1);
    expect(DataStore.mem().find("n0va1o_migration_phases", (p: any) => p.migrationId === m.migrationId)).toHaveLength(0);
    expect(() => n0va1oMigration.getMigration(T, m.migrationId)).toThrow(/Migration not found/);
  });
});

describe("OAuth 2.0 lifecycle (spec §7.2)", () => {
  let connectionId = "";

  it("oauthAuthorizeUrl issues state-bound URL with clamped TTL", () => {
    const agents: any = n0va1oAuth.listAgents(T3);
    const conn: any = n0va1oAuth.createConnection(T3, { platformId: "slack", agentId: agents.agents[0].agentId, label: "OAuth Slack" });
    connectionId = conn.connectionId;
    const url: any = n0va1oAuth.oauthAuthorizeUrl(T3, { connectionId, redirectUri: "https://app.n0va.io/cb", expiresInSeconds: 99999 });
    expect(url.authorizationUrl).toContain("oauth2/authorize");
    expect(url.authorizationUrl).toContain(`state=${url.state}`);
    expect(url.state).toMatch(/^st_/);
    expect(url.expiresInSeconds).toBe(900);
    expect(url.expiresAt).toBeDefined();
  });

  it("oauthCallback validates state and issues oat_/rft_ tokens", () => {
    const url: any = n0va1oAuth.oauthAuthorizeUrl(T3, { connectionId });
    expect(() => n0va1oAuth.oauthCallback(T3, { connectionId, state: url.state })).toThrow(/Authorization code is required/);
    expect(() => n0va1oAuth.oauthCallback(T3, { connectionId, code: "c1", state: "st_wrong" })).toThrow(/state mismatch/);
    const cb: any = n0va1oAuth.oauthCallback(T3, { connectionId, code: "authcode123", state: url.state });
    expect(cb.accessToken).toMatch(/^oat_/);
    expect(cb.refreshToken).toMatch(/^rft_/);
    expect(cb.tokenType).toBe("Bearer");
    expect(cb.expiresIn).toBeGreaterThanOrEqual(3000);
    expect(cb.expiresIn).toBeLessThanOrEqual(5940);
    const status: any = n0va1oAuth.oauthStatus(T3, connectionId);
    expect(status.oauthAuthorized).toBe(true);
    expect(status.status).toBe("connected");
  });

  it("oauthRefresh never shortens token expiry", () => {
    const s1: any = n0va1oAuth.oauthStatus(T3, connectionId);
    const r1: any = n0va1oAuth.oauthRefresh(T3, connectionId);
    expect(r1.refreshed).toBe(true);
    expect(r1.neverShorted).toBe(true);
    expect(new Date(r1.tokenExpiresAt).getTime()).toBeGreaterThanOrEqual(new Date(s1.tokenExpiresAt).getTime());
    const r2: any = n0va1oAuth.oauthRefresh(T3, connectionId);
    expect(new Date(r2.tokenExpiresAt).getTime()).toBeGreaterThanOrEqual(new Date(r1.tokenExpiresAt).getTime());
  });

  it("oauthRevoke disconnects and clears authorization", () => {
    const rev: any = n0va1oAuth.oauthRevoke(T3, connectionId);
    expect(rev.revoked).toBe(true);
    const status: any = n0va1oAuth.oauthStatus(T3, connectionId);
    expect(status.oauthAuthorized).toBe(false);
    expect(status.status).toBe("disconnected");
    expect(() => n0va1oAuth.oauthRefresh(T3, connectionId)).toThrow(/no active OAuth refresh token/);
  });
});

describe("Audit trail forensics (spec §9.1)", () => {
  it("appendAudit stores the full forensics field set", () => {
    const a: any = n0va1oGov.appendAudit(T4, {
      action: "tool.execute", toolId: "crm.read", actor: "gateway-agent", agentId: "ag_1",
      input: { query: "contacts" }, output: { rows: 3 },
      latencyMs: 88, status: "success", tokensConsumed: 4123, costUsd: 0.05,
      reasoningChain: ["intent_classified", "tool_selected"], ipAddress: "203.0.113.7",
      mfaVerified: true, riskScore: 72,
    });
    expect(a.auditId).toBeDefined();
    expect(a.forensics.tokensConsumed).toBe(4123);
    expect(a.forensics.costUsd).toBe(0.05);
    expect(a.forensics.ipAddress).toBe("203.0.113.7");
    expect(a.forensics.mfaVerified).toBe(true);
    expect(a.forensics.riskScore).toBe(72);
    expect(a.forensics.latencyMs).toBe(88);
    expect(a.forensics.status).toBe("success");
    expect(a.forensics.reasoningChain).toEqual(["intent_classified", "tool_selected"]);
    expect(a.forensics.agentId).toBe("ag_1");
  });

  it("forensics entries keep the hash chain intact", () => {
    const a2: any = n0va1oGov.appendAudit(T4, { action: "catalog.search", toolId: "catalog_search", tokensConsumed: 300, costUsd: 0.01 });
    expect(a2.forensics.tokensConsumed).toBe(300);
    expect(a2.forensics.mfaVerified).toBe(false);
    expect(a2.forensics.reasoningChain).toEqual([]);
    expect(a2.forensics.ipAddress).toBeNull();
    const verified: any = n0va1oGov.verifyAuditChain(T4);
    expect(verified.chainIntact).toBe(true);
    expect(verified.entries).toBe(2);
  });

  it("tampering with forensics alone does not break the chain (metadata-only safe)", () => {
    const entries = DataStore.mem().find("n0va1o_audit", (a: any) => a.tenantId === T4);
    const first = entries[0];
    DataStore.mem().update("n0va1o_audit", (x: any) => x._id === first._id, { forensics: { ...first.forensics, tokensConsumed: 999999 } });
    const verified: any = n0va1oGov.verifyAuditChain(T4);
    expect(verified.chainIntact).toBe(true);
    const log: any = n0va1oGov.auditLog(T4);
    expect(log.entries.find((e: any) => e.action === "catalog.search")?.forensics.tokensConsumed).toBe(300);
  });
});
