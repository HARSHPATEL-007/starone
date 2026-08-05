import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { n0va1oCatalog } from "../services/N0VA1OCatalogService";
import { n0va1oAuth } from "../services/N0VA1OAuthService";
import { n0va1oRouting } from "../services/N0VA1ORoutingService";
import { n0va1oExec } from "../services/N0VA1OExecutionService";
import { n0va1oGov } from "../services/N0VA1OGovernanceService";
import { n0va1oCompliance } from "../services/N0VA1OComplianceService";

const T = "nova45";
const T2 = "nova45b";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

beforeAll(() => {
  n0va1oCatalog.setPlan(T, "growth");
  n0va1oCatalog.setPlan(T2, "free");
});

describe("N0VA1O gateway catalog v2 — throughput, latency, auth methods", () => {
  it("throughputStatus exposes plan targets and utilization", () => {
    const s: any = n0va1oCatalog.throughputStatus(T);
    expect(s.plan).toBe("growth");
    expect(s.target.requestsPerMinute).toBe(100);
    expect(s.target.concurrentSandboxes).toBe(5);
    const expectedRpm = Math.min(Math.floor((hashStr(`${T}|throughput|growth`) % 1000) / 100) + 1, 100);
    expect(s.current.requestsPerMinute).toBe(expectedRpm);
    expect(s.current.requestsPerHour).toBe(expectedRpm * 60);
    expect(s.utilizationPct).toBe(Math.min(100, Math.round((expectedRpm / 100) * 100)));
    expect(s.headroomPct).toBe(Math.max(0, 100 - s.utilizationPct));
    expect(["healthy", "elevated", "critical"]).toContain(s.verdict);
    expect(s.summary).toContain("req/min");
  });

  it("throughputStatus on transcendent plan is always healthy (tiny rpm share)", () => {
    n0va1oCatalog.setPlan(T, "transcendent");
    const s: any = n0va1oCatalog.throughputStatus(T);
    expect(s.target.requestsPerMinute).toBe(10000);
    expect(s.utilizationPct).toBeLessThan(70);
    expect(s.verdict).toBe("healthy");
    n0va1oCatalog.setPlan(T, "growth");
  });

  it("latencyBenchmarks returns 4 regions with per-tenant shift and global averages", () => {
    const b: any = n0va1oCatalog.latencyBenchmarks(T);
    expect(b.regions).toHaveLength(4);
    expect(b.regions.map((r: any) => r.region)).toEqual(["us-east", "us-west", "eu-west", "ap-south"]);
    const BASE: Record<string, number> = { "us-east": 45, "us-west": 47, "eu-west": 49, "ap-south": 55 };
    for (const r of b.regions) {
      const shift = (hashStr(`${T}|${r.region}`) % 7) - 3;
      expect(r.discoveryP99Ms).toBe(Math.max(12, BASE[r.region] + shift));
    }
    expect(b.global.discoveryP99Ms).toBe(Math.round(b.regions.reduce((a: number, r: any) => a + r.discoveryP99Ms, 0) / 4));
    expect(b.global.jitAuthP99Ms).toBeGreaterThan(50);
    expect(b.global.compileP99Ms).toBeGreaterThan(30);
    expect(b.plan).toBe("growth");
    expect(b.summary).toContain("regions");
  });

  it("latencyBenchmarks shifts are deterministic across calls", () => {
    const a: any = n0va1oCatalog.latencyBenchmarks(T);
    const b: any = n0va1oCatalog.latencyBenchmarks(T);
    expect(a.regions).toEqual(b.regions);
    expect(a.global).toEqual(b.global);
  });

  it("authMethodCatalog exposes 11 methods incl. oauth2/mTLS/service_account", () => {
    const c: any = n0va1oCatalog.authMethodCatalog();
    expect(c.total).toBe(11);
    const ids = c.methods.map((m: any) => m.id);
    expect(ids).toContain("oauth2");
    expect(ids).toContain("oidc");
    expect(ids).toContain("saml2");
    expect(ids).toContain("mTLS");
    expect(ids).toContain("device_flow");
    expect(ids).toContain("zero_trust");
    expect(ids).toContain("service_account");
    expect(new Set(ids).size).toBe(11);
    expect(c.methods.find((m: any) => m.id === "oauth2").standard).toContain("RFC");
    expect(c.methods.find((m: any) => m.id === "basic").jitEligible).toBe(false);
    expect(c.summary).toContain("11");
  });
});

describe("N0VA1O agent spec shape + session lifecycle", () => {
  it("registerAgent accepts the full v2 spec shape", () => {
    const agent: any = n0va1oAuth.registerAgent(T, {
      name: "Round45 Agent",
      scopes: ["gateway.read", "tools.discover", "tools.execute", "hitl.review"],
      permissions: ["mail.read", "crm.read", "compliance.review"],
      autonomyLevel: "manual",
      approvalRequiredFor: ["tools.execute"],
      maxDailyActions: 25,
      webhookUrl: "https://hooks.n0va.io/round45",
      description: "v2 shape agent",
    });
    expect(agent.apiKey).toMatch(/^n0va1o_ag_/);
    expect(agent.api_key).toBe(agent.apiKey);
    expect(agent.permissions).toEqual(["mail.read", "crm.read", "compliance.review"]);
    expect(agent.autonomyLevel).toBe("manual");
    expect(agent.approvalRequiredFor).toEqual(["tools.execute"]);
    expect(agent.maxDailyActions).toBe(25);
    expect(agent.webhookUrl).toBe("https://hooks.n0va.io/round45");
    expect(agent.actionsToday).toBe(0);
    expect(agent.status).toBe("active");
    expect(agent.summary).toContain("3 permission(s)");
    expect(agent.summary).toContain("manual");
  });

  it("registerAgent validates permissions, autonomy and webhook URL", () => {
    expect(() => n0va1oAuth.registerAgent(T, { name: "Bad Perm", scopes: ["gateway.read"], permissions: ["mail.read", "bogus.perm"] }))
      .toThrow(/Unknown permission/);
    expect(() => n0va1oAuth.registerAgent(T, { name: "Bad Autonomy", scopes: ["gateway.read"], autonomyLevel: "rogue" }))
      .toThrow(/Unknown autonomy level/);
    expect(() => n0va1oAuth.registerAgent(T, { name: "Bad Hook", scopes: ["gateway.read"], webhookUrl: "http://insecure" }))
      .toThrow(/https/);
  });

  it("registerAgent clamps maxDailyActions to 1..1000", () => {
    const hi: any = n0va1oAuth.registerAgent(T, { name: "Clamp Hi", scopes: ["gateway.read"], maxDailyActions: 99999 });
    expect(hi.maxDailyActions).toBe(1000);
    const lo: any = n0va1oAuth.registerAgent(T, { name: "Clamp Lo", scopes: ["gateway.read"], maxDailyActions: 0 });
    expect(lo.maxDailyActions).toBe(1);
    const dflt: any = n0va1oAuth.registerAgent(T, { name: "Default Cap", scopes: ["gateway.read"] });
    expect(dflt.maxDailyActions).toBe(100);
    expect(dflt.autonomyLevel).toBe("assisted");
    expect(dflt.permissions).toEqual([]);
  });

  it("createSession returns ses_ id, wss endpoint and context tokens", () => {
    const agents: any = n0va1oAuth.listAgents(T);
    const agent = agents.agents.find((a: any) => a.name === "Round45 Agent");
    const ses: any = n0va1oAuth.createSession(T, { agentId: agent.agentId, ttlSeconds: 7200, userDefinedId: "u-45", sandboxConfig: { runtime: "node20", memoryMB: 1024 } });
    expect(ses.session_id).toMatch(/^ses_/);
    expect(ses.sessionId).toBe(ses.session_id);
    expect(ses.endpoint).toMatch(/^wss:\/\/gateway\.n0va\.io\/v1\/sessions\/.+\/events$/);
    expect(ses.endpoint).toContain(ses.sessionId);
    expect(ses.agentId).toBe(agent.agentId);
    expect(ses.agentName).toBe("Round45 Agent");
    expect(ses.context_tokens).toBe(4000 + (hashStr(`${T}|${agent.agentId}|context`) % 12000));
    expect(ses.context_tokens).toBeGreaterThanOrEqual(4000);
    expect(ses.context_tokens).toBeLessThanOrEqual(15999);
    expect(ses.sandboxConfig.runtime).toBe("node20");
    expect(ses.sandboxConfig.memoryMB).toBe(1024);
    expect(ses.sandboxConfig.ttlSeconds).toBe(7200);
    expect(new Date(ses.expiresAt).getTime() - Date.now()).toBeGreaterThan(7100000);
    expect(ses.summary).toContain("context tokens");
    expect(n0va1oAuth.listSessions(T).total).toBe(1);
  });

  it("createSession clamps ttl and memory and requires an agent", () => {
    const agents: any = n0va1oAuth.listAgents(T);
    const agent = agents.agents.find((a: any) => a.name === "Round45 Agent");
    const ses: any = n0va1oAuth.createSession(T, { agentId: agent.agentId, ttlSeconds: 5, sandboxConfig: { memoryMB: 1 } });
    expect(ses.sandboxConfig.ttlSeconds).toBe(60);
    expect(ses.sandboxConfig.memoryMB).toBe(64);
    expect(() => n0va1oAuth.createSession(T, { agentId: "nope" })).toThrow(/Agent not found/);
  });

  it("listSessions filters by status and marks expiry", () => {
    const agents: any = n0va1oAuth.listAgents(T);
    const agent = agents.agents.find((a: any) => a.name === "Round45 Agent");
    n0va1oAuth.createSession(T, { agentId: agent.agentId, ttlSeconds: 60 });
    const list: any = n0va1oAuth.listSessions(T);
    expect(list.total).toBe(3);
    expect(list.active).toBe(3);
    expect(list.sessions.every((s: any) => s.expired === false)).toBe(true);
    const ended: any = n0va1oAuth.endSession(T, list.sessions[0].sessionId);
    expect(ended.status).toBe("ended");
    const active: any = n0va1oAuth.listSessions(T, "active");
    expect(active.total).toBe(2);
    expect(active.sessions.every((s: any) => s.status === "active")).toBe(true);
  });

  it("getSession/endSession enforce lifecycle invariants", () => {
    const list: any = n0va1oAuth.listSessions(T);
    const id = list.sessions[0].sessionId;
    const got: any = n0va1oAuth.getSession(T, id);
    expect(got.status).toBe("ended");
    expect(got.endedAt).toBeTruthy();
    expect(() => n0va1oAuth.endSession(T, id)).toThrow(/already ended/);
    expect(() => n0va1oAuth.getSession(T, "ses_nope")).toThrow(/Session not found/);
    expect(() => n0va1oAuth.endSession(T, "ses_nope")).toThrow(/Session not found/);
  });
});

describe("N0VA1O VFS operations", () => {
  it("putFile stores inline with checksum when under threshold", () => {
    const f: any = n0va1oExec.putFile(T, { filename: "r45_data.csv", sizeBytes: 2048, content: "a,b\n1,2\n3,4\n" });
    expect(f.fileId).toMatch(/^fl_/);
    expect(f.checksum).toMatch(/^sha256_[0-9a-f]{32}$/);
    expect(f.offloaded).toBe(false);
    expect(f.storage).toBe("inline");
    expect(f.summary).toContain("stored inline");
    const stats: any = n0va1oExec.vfsSummarizeStats(T, f.fileId);
    expect(stats.checksumVerified).toBe(true);
    expect(stats.lines).toBe(4);
    expect(stats.words).toBeGreaterThan(0);
  });

  it("putFile offloads payloads above 10MB to the virtual filesystem", () => {
    const f: any = n0va1oExec.putFile(T, { filename: "r45_big.bin", sizeBytes: 11 * 1024 * 1024, content: "" });
    expect(f.offloaded).toBe(true);
    expect(f.storage).toBe("virtual_fs");
    expect(f.pointer).toMatch(/^vfs:\/\//);
    expect(f.summary).toContain("offloaded");
    const o: any = n0va1oExec.vfsOverview(T);
    expect(o.offloaded).toBe(1);
    expect(o.thresholdMB).toBe(10);
  });

  it("vfsChunkRead slices content with chk_ ids and bounds validation", () => {
    const f: any = n0va1oExec.putFile(T, { filename: "r45_text.txt", sizeBytes: 100, content: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" });
    const c: any = n0va1oExec.vfsChunkRead(T, f.fileId, 5, 10);
    expect(c.chunkId).toMatch(/^chk_/);
    expect(c.content).toBe("56789abcde");
    expect(c.actualLength).toBe(10);
    expect(c.offset).toBe(5);
    expect(c.totalBytes).toBe(62);
    expect(c.summary).toContain("10 byte(s)");
    expect(() => n0va1oExec.vfsChunkRead(T, f.fileId, -1, 10)).toThrow(/offset/);
    expect(() => n0va1oExec.vfsChunkRead(T, f.fileId, 0, 0)).toThrow(/length/);
    expect(() => n0va1oExec.vfsChunkRead(T, f.fileId, 1000, 10)).toThrow(/out of bounds/);
    expect(() => n0va1oExec.vfsChunkRead(T, "fl_nope", 0, 10)).toThrow(/File not found/);
  });

  it("vfsGrepSearch reports line matches and validates the pattern", () => {
    const f: any = n0va1oExec.putFile(T, { filename: "r45_log.txt", sizeBytes: 100, content: "line one: ok\nline two: warn\nline three: ok\nline four: error\n" });
    const g: any = n0va1oExec.vfsGrepSearch(T, f.fileId, "ok");
    expect(g.matchCount).toBe(2);
    expect(g.matches.map((m: any) => m.line)).toEqual([1, 3]);
    expect(g.matches[0].text.length).toBeLessThanOrEqual(160);
    const none: any = n0va1oExec.vfsGrepSearch(T, f.fileId, "zzz");
    expect(none.matchCount).toBe(0);
    expect(none.summary).toBe("No matches");
    expect(() => n0va1oExec.vfsGrepSearch(T, f.fileId, "[")).toThrow(/Invalid regex/);
  });

  it("vfsPandasQuery infers schema and stats for tabular content", () => {
    const f: any = n0va1oExec.putFile(T, { filename: "r45_tab.csv", sizeBytes: 100, content: "10,20\n30,40\n50,60\n" });
    const q: any = n0va1oExec.vfsPandasQuery(T, f.fileId, "df.describe()");
    expect(q.detected.tabular).toBe(true);
    expect(q.detected.rows).toBe(3);
    expect(q.detected.columns).toBe(2);
    expect(q.columns).toEqual(["col_0", "col_1"]);
    expect(q.columnStats[0]).toEqual({ column: "col_0", numeric: true, mean: 30 });
    expect(q.columnStats[1]).toEqual({ column: "col_1", numeric: true, mean: 40 });
    expect(q.summary).toContain("3 row(s) × 2 column(s)");
    const notTab: any = n0va1oExec.vfsPandasQuery(T, f.fileId, "nope");
    expect(notTab.query).toBe("nope");
    const plain: any = n0va1oExec.vfsPandasQuery(T, "fl_" + n0va1oExec.putFile(T, { filename: "r45_plain.txt", sizeBytes: 10, content: "just some prose here\n" }).fileIdRaw, "df");
    expect(plain.detected.tabular).toBe(false);
    expect(plain.summary).toContain("not tabular");
  });

  it("vfsSummarizeStats computes counts and verifies checksum for inline files", () => {
    const f: any = n0va1oExec.putFile(T, { filename: "r45_count.txt", sizeBytes: 100, content: "one two three\nfour five\n" });
    const s: any = n0va1oExec.vfsSummarizeStats(T, f.fileId);
    expect(s.filename).toBe("r45_count.txt");
    expect(s.offloaded).toBe(false);
    expect(s.lines).toBe(3);
    expect(s.words).toBe(5);
    expect(s.chars).toBe(24);
    expect(s.checksumVerified).toBe(true);
    expect(s.summary).toContain("checksum verified");
  });

  it("vfs ops require the fl_ prefix tolerance and throw on missing files", () => {
    const f: any = n0va1oExec.putFile(T, { filename: "r45_raw.bin", sizeBytes: 10, content: "raw" });
    const s: any = n0va1oExec.vfsSummarizeStats(T, f.fileId);
    expect(s.fileId).toBe(f.fileId);
    expect(() => n0va1oExec.vfsGrepSearch(T, "fl_nope", "x")).toThrow(/File not found/);
    expect(() => n0va1oExec.vfsPandasQuery(T, "fl_nope", "df")).toThrow(/File not found/);
  });
});

describe("N0VA1O recipes v2 — schedule, failover, phases", () => {
  const baseRecipe = {
    name: "r45_scheduled",
    steps: [
      { action: "email_send", params: { to: "ops@n0va.io", subject: "Round 45" } },
      { action: "crm_create_lead", params: { name: "Lead 45" } },
    ],
  };

  it("compileRecipe accepts schedule + failover + notification channels", () => {
    const r: any = n0va1oExec.compileRecipe(T, { ...baseRecipe, schedule: "0 9 * * 1-5", failoverEnabled: true, notificationChannels: ["https://hooks.n0va.io/r45"] });
    expect(r.recipeId).toBeTruthy();
    expect(r.schedule).toBe("0 9 * * 1-5");
    expect(r.failoverEnabled).toBe(true);
    expect(r.notificationChannels).toEqual(["https://hooks.n0va.io/r45"]);
    expect(r.phases).toHaveLength(3);
    expect(r.phases.map((p: any) => p.phase)).toEqual(["compile", "validate", "execute"]);
    expect(r.compileTimeMs).toBe(r.phases.reduce((a: number, p: any) => a + p.durationMs, 0));
    expect(r.compileTimeMs).toBeGreaterThanOrEqual(40);
    expect(r.summary).toContain("scheduled");
    expect(r.summary).toContain("failover enabled");
  });

  it("compileRecipe validates cron and notification channel formats", () => {
    expect(() => n0va1oExec.compileRecipe(T, { ...baseRecipe, schedule: "every morning" })).toThrow(/cron/);
    expect(() => n0va1oExec.compileRecipe(T, { ...baseRecipe, notificationChannels: ["http://insecure"] })).toThrow(/https/);
  });

  it("compileRecipe defaults schedule/failover/channels when omitted", () => {
    const r: any = n0va1oExec.compileRecipe(T, { name: "r45_plain", steps: [{ action: "email_send", params: { to: "a@b.co", subject: "x" } }] });
    expect(r.schedule).toBeNull();
    expect(r.failoverEnabled).toBe(false);
    expect(r.notificationChannels).toEqual([]);
    expect(r.phases).toHaveLength(3);
    expect(r.compileMs).toBeGreaterThanOrEqual(40);
  });

  it("recipe phases are deterministic for the same name/steps", () => {
    const a: any = n0va1oExec.compileRecipe(T, { name: "r45_det", steps: [{ action: "docs_create", params: { title: "Doc 45" } }] });
    const b: any = n0va1oExec.compileRecipe(T, { name: "r45_det", steps: [{ action: "docs_create", params: { title: "Doc 45" } }] });
    expect(a.phases).toEqual(b.phases);
    expect(a.compileTimeMs).toBe(b.compileTimeMs);
    expect(a.compileMs).toBe(b.compileMs);
  });

  it("executeRecipe still works end-to-end on a scheduled recipe", () => {
    const r: any = n0va1oExec.compileRecipe(T, { ...baseRecipe, schedule: "0 6 * * *" });
    const ex: any = n0va1oExec.executeRecipe(T, r.recipeId);
    expect(ex.transactionId).toMatch(/^tr_/);
    expect(ex.stepResults).toHaveLength(2);
    expect(ex.stepsTotal).toBe(2);
    expect(["completed", "partial"]).toContain(ex.status);
  });
});

describe("N0VA1O routing v2 — discoverTools options", () => {
  it("discoverTools clamps maxTools to 1..50", () => {
    const hi: any = n0va1oRouting.discoverTools(T, "read inbox", { maxTools: 9999 });
    expect(hi.injectedCount).toBe(11);
    expect(hi.tools).toHaveLength(11);
    const cap: any = n0va1oRouting.discoverTools(T, "read inbox", { maxTools: 50 });
    expect(cap.injectedCount).toBe(hi.injectedCount);
    const lo: any = n0va1oRouting.discoverTools(T, "read inbox", { maxTools: 0 });
    expect(lo.injectedCount).toBe(1);
  });

  it("discoverTools clamps contextWindowSize to 512..1e6", () => {
    const hi: any = n0va1oRouting.discoverTools(T, "create campaign", { contextWindowSize: 999999999 });
    expect(hi.context_window_size).toBe(1000000);
    const lo: any = n0va1oRouting.discoverTools(T, "create campaign", { contextWindowSize: 1 });
    expect(lo.context_window_size).toBe(512);
    expect(lo.context_window_size).toBeGreaterThanOrEqual(512);
  });

  it("riskTolerance low restricts to low-risk tools, medium excludes critical", () => {
    const low: any = n0va1oRouting.discoverTools(T, "read inbox", { riskTolerance: "low", maxTools: 25 });
    expect(low.risk_tolerance).toBe("low");
    expect(low.injectedCount).toBe(11);
    low.tools.forEach((t: any) => expect(t.risk_level).toBe("low"));
    const med: any = n0va1oRouting.discoverTools(T, "create campaign", { riskTolerance: "medium", maxTools: 25 });
    expect(med.injectedCount).toBe(6);
    med.tools.forEach((t: any) => expect(t.risk_level).not.toBe("critical"));
    const ids = med.tools.map((t: any) => t.toolId);
    expect(ids).not.toContain("finance.create_payment");
    expect(ids).not.toContain("devops.deploy");
  });

  it("preferredLatency surfaces latency_p99 and permissions_required maps risk", () => {
    const d: any = n0va1oRouting.discoverTools(T, "create campaign", { preferredLatency: 30, maxTools: 25 });
    expect(d.preferred_latency).toBe(30);
    expect(d.injectedCount).toBe(8);
    d.tools.forEach((t: any) => {
      expect(t.latency_p99).toBe(30);
      expect(["gateway.write", "gateway.read"]).toContain(t.permissions_required[0]);
    });
    d.tools.forEach((t: any) => {
      expect(t.permissions_required).toEqual(t.risk_level === "high" || t.risk_level === "critical" ? ["gateway.write"] : ["gateway.read"]);
    });
    const critical = d.tools.find((t: any) => t.risk_level === "critical");
    expect(critical.toolId).toBe("finance.create_payment");
  });

  it("discoverTools includes metadata on every tool row", () => {
    const d: any = n0va1oRouting.discoverTools(T, "search documents", { maxTools: 5 });
    d.tools.forEach((t: any) => {
      expect(t.toolId).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(Array.isArray(t.protocols)).toBe(true);
      expect(t.risk_level).toBeTruthy();
    });
    expect(d.reasoning).toContain("candidate tools");
    expect(d.summary).toContain("injected");
  });
});

describe("N0VA1O modifier pipeline", () => {
  it("runModifierPipeline applies schema-phase modifiers with transform-driven props", () => {
    n0va1oGov.createModifier(T2, { type: "schema", toolPattern: "email.read", name: "Schema Enrich", transform: "priority, confidence" });
    const run: any = n0va1oGov.runModifierPipeline(T2, { toolId: "email.read", phase: "schema", payload: {} });
    expect(run.runId).toMatch(/^modrun_/);
    expect(run.appliedCount).toBe(1);
    expect(run.applied[0].name).toBe("Schema Enrich");
    expect(run.applied[0].effect.schemaVersion).toBe(2);
    expect(run.applied[0].effect.addedProps).toEqual(["priority", "confidence"]);
    expect(run.applied[0].effect.injectedAt).toBe("schema:email.read");
    expect(run.skippedCount).toBe(0);
    expect(run.summary).toContain("1 modifier(s) applied");
  });

  it("before-phase modifiers wrap the payload with _prepared markers", () => {
    n0va1oGov.createModifier(T2, { type: "before", toolPattern: "email.read", name: "Payload Sanitizer" });
    const run: any = n0va1oGov.runModifierPipeline(T2, { toolId: "email.read", phase: "before", payload: { subject: "hi" } });
    expect(run.appliedCount).toBe(1);
    const tp = run.applied[0].effect.transformedPayload;
    expect(tp._prepared).toBe(true);
    expect(tp._modifier).toBe("Payload Sanitizer");
    expect(tp.subject).toBe("hi");
    expect(tp._preparedAtMs).toBeGreaterThanOrEqual(5);
    expect(tp._preparedAtMs).toBeLessThan(45);
  });

  it("after-phase modifiers post-process the response", () => {
    n0va1oGov.createModifier(T2, { type: "after", toolPattern: "email.read", name: "Response Summarizer" });
    const run: any = n0va1oGov.runModifierPipeline(T2, { toolId: "email.read", phase: "after", payload: { result: 42 } });
    expect(run.appliedCount).toBe(1);
    expect(run.applied[0].effect.postProcessed).toBe(true);
    expect(run.applied[0].effect.resultSummary).toContain("Response Summarizer");
    expect(run.applied[0].effect._elapsedMs).toBeLessThan(28);
  });

  it("wildcard patterns match but non-matching modifiers are skipped with reasons", () => {
    n0va1oGov.createModifier(T2, { type: "before", toolPattern: "storage.*", name: "Storage Audit" });
    const run: any = n0va1oGov.runModifierPipeline(T2, { toolId: "storage.read", phase: "before", payload: {} });
    expect(run.applied.map((a: any) => a.name)).toContain("Storage Audit");
    const miss: any = n0va1oGov.runModifierPipeline(T2, { toolId: "email.read", phase: "before", payload: {} });
    expect(miss.applied.map((a: any) => a.name)).not.toContain("Storage Audit");
    expect(miss.skipped.map((s: any) => s.name)).toContain("Storage Audit");
    expect(miss.skipped[0].reason).toContain("does not match");
  });

  it("runModifierPipeline validates toolId and phase", () => {
    expect(() => n0va1oGov.runModifierPipeline(T2, { phase: "schema" })).toThrow(/toolId is required/);
    expect(() => n0va1oGov.runModifierPipeline(T2, { toolId: "email.read", phase: "sideways" })).toThrow(/phase must be/);
  });

  it("modifierPipelineStatus reports by-phase counts and run totals", () => {
    const st: any = n0va1oGov.modifierPipelineStatus(T2);
    expect(st.byPhase).toHaveLength(3);
    expect(st.byPhase.map((p: any) => p.phase)).toEqual(["schema", "before", "after"]);
    const schema = st.byPhase.find((p: any) => p.phase === "schema");
    expect(schema.modifiers).toBe(1);
    expect(schema.enabled).toBe(1);
    expect(schema.runs).toBe(1);
    expect(st.totalModifiers).toBe(4);
    expect(st.totalRuns).toBe(5);
    expect(st.summary).toContain("5 pipeline run(s)");
  });
});

describe("N0VA1O compliance evidence & audit trail", () => {
  it("framework catalog exposes 7 frameworks with control counts", () => {
    const c: any = n0va1oCompliance.complianceFrameworkCatalog();
    expect(c.total).toBe(7);
    const ids = c.frameworks.map((f: any) => f.id);
    expect(ids).toEqual(["gdpr", "hipaa", "soc2", "fedramp", "pci", "nis2", "iso27001"]);
    const counts: Record<string, number> = {};
    c.frameworks.forEach((f: any) => { counts[f.id] = f.controls; });
    expect(counts).toEqual({ gdpr: 5, hipaa: 4, soc2: 4, fedramp: 4, pci: 4, nis2: 4, iso27001: 5 });
    expect(c.summary).toContain("7 compliance frameworks");
  });

  it("control mapping crosses frameworks (audit/encryption/vuln)", () => {
    const m: any = n0va1oCompliance.complianceMapping(T2);
    expect(m.totalControls).toBe(30);
    expect(m.frameworks).toHaveLength(7);
    const audit = m.mapping.find((r: any) => r.control === "audit");
    expect(audit.frameworks).toEqual(expect.arrayContaining(["hipaa", "fedramp", "pci", "soc2"]));
    expect(audit.coverage).toBe(4);
    const enc = m.mapping.find((r: any) => r.control === "encryption");
    expect(enc.coverage).toBe(3);
    const breach = m.mapping.find((r: any) => r.control === "breach");
    expect(breach.frameworks).toEqual(["gdpr", "nis2"]);
    expect(m.summary).toContain("30 control(s)");
  });

  it("complianceEvidence scores deterministically and validates framework", () => {
    expect(() => n0va1oCompliance.complianceEvidence(T2, "cobra")).toThrow(/Unknown framework/);
    const ev: any = n0va1oCompliance.complianceEvidence(T2, "gdpr");
    expect(ev.framework).toBe("gdpr");
    expect(ev.controls).toHaveLength(5);
    for (const c of ev.controls) {
      const base = hashStr(`${T2}|gdpr|${c.id}`) % 100;
      expect(c.score).toBe(base);
      expect(c.status).toBe(base >= 80 ? "pass" : base >= 50 ? "warn" : "fail");
      expect(c.evidence).toContain("/100");
    }
    const weighted = ev.controls.reduce((a: number, c: any, i: number) => a + c.score * [1, 0.5, 1, 1, 0.5][i], 0);
    const weightTotal = 4;
    expect(ev.score).toBe(Math.round(weighted / weightTotal));
    expect(ev.passing + ev.failing).toBeLessThanOrEqual(5);
    expect(["pass", "warn", "fail"]).toContain(ev.status);
    expect(ev.summary).toContain("GDPR");
  });

  it("evidence boosters lift controls when audit entries / agents / modifiers exist", () => {
    const agent: any = n0va1oAuth.registerAgent(T2, { name: "Compliance Agent", scopes: ["gateway.read"] });
    n0va1oGov.appendAudit(T2, { action: "compliance.scan", toolId: "compliance.review", actor: agent.agentId, details: { run: 1 } });
    n0va1oGov.createModifier(T2, { type: "before", toolPattern: "compliance.review", name: "Guardrail" });
    const ev: any = n0va1oCompliance.complianceEvidence(T2, "gdpr");
    const consent = ev.controls.find((c: any) => c.id === "consent");
    expect(consent.score).toBe(Math.min(100, (hashStr(`${T2}|gdpr|consent`) % 100) + 15));
    const soc2: any = n0va1oCompliance.complianceEvidence(T2, "soc2");
    const security = soc2.controls.find((c: any) => c.id === "security");
    expect(security.score).toBe(Math.min(100, (hashStr(`${T2}|soc2|security`) % 100) + 10));
  });

  it("complianceReports averages all 7 frameworks", () => {
    const r: any = n0va1oCompliance.complianceReports(T2);
    expect(r.reports).toHaveLength(7);
    const expectedAvg = Math.round(r.reports.reduce((a: number, x: any) => a + x.score, 0) / 7);
    expect(r.average).toBe(expectedAvg);
    expect(r.reports.every((x: any) => ["pass", "warn", "fail"].includes(x.status))).toBe(true);
    expect(r.summary).toContain("7 frameworks");
  });

  it("complianceDashboard merges reports and recent evidence log", () => {
    const d: any = n0va1oCompliance.complianceDashboard(T2);
    expect(d.byFramework).toHaveLength(7);
    expect(d.average).toBe(d.reports.average);
    expect(d.recent.length).toBeGreaterThanOrEqual(1);
    expect(d.recent[0].category).toBe("evidence_collected");
    expect(d.generatedAt).toBeTruthy();
  });

  it("agentAuditTrail returns reasoning chain, tokens, merkle root and quantum signature", () => {
    const agents: any = n0va1oAuth.listAgents(T2);
    const agent = agents.agents.find((a: any) => a.name === "Compliance Agent");
    n0va1oGov.appendAudit(T2, { action: "compliance.scan2", toolId: "compliance.review", actor: agent.agentId, details: { run: 2 } });
    const trail: any = n0va1oCompliance.agentAuditTrail(T2, agent.agentId);
    expect(trail.agentName).toBe("Compliance Agent");
    expect(trail.entriesCount).toBe(2);
    expect(trail.trail).toHaveLength(2);
    expect(trail.trail[0].action).toBe("compliance.scan2");
    expect(trail.trail[0].chainHash).toHaveLength(32);
    expect(trail.reasoning_chain).toHaveLength(2);
    expect(trail.reasoning_chain[0].chainStep).toHaveLength(12);
    const seed = `${T2}|${agent.agentId}|trail`;
    expect(trail.tokens_consumed).toBe(250 + (hashStr(seed + "tokens") % 1750) + 2 * 40);
    expect(trail.merkle_root).toHaveLength(32);
    expect(trail.chain_hash).toHaveLength(32);
    expect(trail.quantum_signature).toMatch(/^qs_[0-9a-f]{32}$/);
    expect(trail.summary).toContain("2 audit entr(ies)");
  });

  it("agentAuditTrail validates agent and handles empty trails", () => {
    expect(() => n0va1oCompliance.agentAuditTrail(T2, "ag_nope")).toThrow(/Agent not found/);
    const fresh: any = n0va1oAuth.registerAgent(T2, { name: "Quiet Agent", scopes: ["gateway.read"] });
    const trail: any = n0va1oCompliance.agentAuditTrail(T2, fresh.agentId);
    expect(trail.entriesCount).toBe(0);
    expect(trail.trail).toEqual([]);
    expect(trail.reasoning_chain).toEqual([]);
    expect(trail.merkle_root).toBe("00000000000000000000000000000000");
    expect(trail.chain_hash).toBe("GENESIS");
  });

  it("complianceLog records evidence collection with limits", () => {
    const log: any = n0va1oCompliance.complianceLog(T2);
    expect(log.total).toBeGreaterThanOrEqual(3);
    expect(log.entries[0].category).toBeTruthy();
    const limited: any = n0va1oCompliance.complianceLog(T2, 2);
    expect(limited.entries).toHaveLength(2);
  });
});
