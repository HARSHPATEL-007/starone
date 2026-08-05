import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { n0va1oCatalog } from "../services/N0VA1OCatalogService";
import { n0va1oAuth } from "../services/N0VA1OAuthService";
import { n0va1oRouting } from "../services/N0VA1ORoutingService";
import { n0va1oExec } from "../services/N0VA1OExecutionService";
import { n0va1oTrigger } from "../services/N0VA1OTriggerService";
import { n0va1oGov } from "../services/N0VA1OGovernanceService";
import { n0va1oPlugin } from "../services/N0VA1OPluginService";

const T = "nova-n0va1o";

beforeAll(() => {
  DataStore.mem().insert("n0va1o_state", { tenantId: T, plan: "growth", createdAt: new Date().toISOString() });
});

describe("N0VA1O gateway catalog & plans", () => {
  it("exposes 17 categories and 200+ platforms", () => {
    const cat: any = n0va1oCatalog.gatewayCatalog(T);
    expect(cat.totalPlatforms).toBeGreaterThanOrEqual(200);
    expect(cat.categories).toHaveLength(17);
    expect(cat.categories[0].id).toBe("ads_marketing");
    expect(cat.categories[0].platformCount).toBeGreaterThanOrEqual(15);
    expect(cat.summary).toContain("platforms");
  });

  it("categoryCatalog lists raw category rows", () => {
    const cat: any = n0va1oCatalog.categoryCatalog();
    expect(cat.total).toBe(17);
    expect(cat.categories[0].categoryId || cat.categories[0].id).toBe("ads_marketing");
    expect(cat.categories[0].name).toContain("Ads");
  });

  it("catalogSearch filters by token and category", () => {
    const byName: any = n0va1oCatalog.catalogSearch(T, "slack");
    expect(byName.count).toBeGreaterThanOrEqual(1);
    byName.results.forEach((p: any) => {
      expect(`${p.name} ${p.id}`.toLowerCase()).toContain("slack");
    });
    const crm: any = n0va1oCatalog.catalogSearch(T, "hubspot", "crm");
    expect(crm.count).toBeGreaterThanOrEqual(1);
    expect(crm.results.map((r: any) => r.id)).toContain("hubspot_crm");
    const none: any = n0va1oCatalog.catalogSearch(T, "zzzz-not-a-platform");
    expect(none.count).toBe(0);
  });

  it("planCatalog exposes 5 tiers with monotonically increasing limits", () => {
    const plans: any = n0va1oCatalog.planCatalog(T);
    expect(plans.tiers).toHaveLength(5);
    const agents = plans.tiers.map((t: any) => t.limits.agents);
    for (let i = 1; i < agents.length; i++) expect(agents[i]).toBeGreaterThan(agents[i - 1]);
    const calls = plans.tiers.map((t: any) => t.limits.toolCallsPerDay);
    for (let i = 1; i < calls.length; i++) expect(calls[i]).toBeGreaterThan(calls[i - 1]);
    expect(plans.currentPlan).toBe("growth");
    expect(plans.current.monthlyPrice).toBe(29);
  });

  it("setPlan updates state and rejects unknown tiers", () => {
    const set: any = n0va1oCatalog.setPlan(T, "enterprise");
    expect(set.plan).toBe("enterprise");
    expect(set.limits.agents).toBe(250);
    expect(() => n0va1oCatalog.setPlan(T, "bogus_tier")).toThrow(/Unknown plan tier/);
    const plans: any = n0va1oCatalog.planCatalog(T);
    expect(plans.currentPlan).toBe("enterprise");
  });

  it("usageStatus reports enterprise usage rows with plan limits", () => {
    const usage: any = n0va1oCatalog.usageStatus(T);
    expect(usage.plan).toBe("enterprise");
    expect(usage.status).toBe("within_limits");
    expect(usage.usage).toHaveLength(6);
    expect(usage.usage[0].dimension).toBe("agents");
    expect(usage.usage[0].limit).toBe(250);
    usage.usage.forEach((u: any) => expect(typeof u.used).toBe("number"));
    expect(usage.summary).toContain("Enterprise");
  });

  it("gatewayOverview aggregates counts and performance", () => {
    const o: any = n0va1oCatalog.gatewayOverview(T);
    expect(o.plan).toBe("enterprise");
    expect(typeof o.counts.agents).toBe("number");
    expect(typeof o.counts.totalConnections).toBe("number");
    expect(o.counts.hitlPending).toBe(0);
    expect(o.performance.jitAuthMs).toBe(120);
    expect(o.performance.toolDiscoveryP99Ms).toBe(45);
    expect(o.performance.sandboxColdStartMs).toBe(200);
    expect(o.performance.recipeCompileMs).toBe(85);
    expect(o.performance.webhookDeliveryMs).toBe(50);
    expect(o.performance.accountSwitchMs).toBe(15);
    expect(o.summary).toContain("N0VA1O gateway");
  });
});

describe("N0VA1O JIT auth", () => {
  it("authCatalog exposes 5 methods and 15 scopes", () => {
    const cat: any = n0va1oAuth.authCatalog();
    expect(cat.methods).toHaveLength(5);
    expect(cat.scopes).toHaveLength(15);
    expect(cat.scopes).toContain("tools.execute");
    expect(cat.scopes).not.toContain("messages.send");
  });

  it("registerAgent returns an API key and scopes", () => {
    const agent: any = n0va1oAuth.registerAgent(T, {
      name: "Gateway Agent",
      scopes: ["gateway.read", "tools.discover", "tools.execute"],
      description: "Round 44 smoke agent",
    });
    expect(agent.apiKey).toMatch(/^n0va1o_ag_/);
    expect(agent.scopes).toHaveLength(3);
    expect(agent.status).toBe("active");
    expect(agent.authMethod).toBe("mcp_token");
    expect(agent.summary).toContain("3 scope(s)");
  });

  it("registerAgent rejects unknown scopes", () => {
    expect(() => n0va1oAuth.registerAgent(T, { name: "Bad Agent", scopes: ["gateway.read", "bogus.scope"] }))
      .toThrow(/Unknown scope/);
  });

  it("mintJitToken prunes to agent scopes and clamps TTL", () => {
    const agents: any = n0va1oAuth.listAgents(T);
    const agent = agents.agents.find((a: any) => a.name === "Gateway Agent");
    const mint: any = n0va1oAuth.mintJitToken(T, {
      agentId: agent.agentId,
      scopes: ["tools.execute", "gateway.read", "hitl.review"],
      ttlSec: 999999,
    });
    expect(mint.tokenId).toMatch(/^jit_/);
    expect(mint.scopes).toEqual(["tools.execute", "gateway.read"]);
    expect(new Date(mint.expiresAt).getTime() - new Date(mint.issuedAt).getTime()).toBe(86400000);
    expect(mint.envelope.status).toBe("sealed");
    expect(mint.jitLatencyMs).toBe(120);
  });

  it("tokenStatus reports valid, revoked and rotated tokens", () => {
    const agents: any = n0va1oAuth.listAgents(T);
    const agent = agents.agents.find((a: any) => a.name === "Gateway Agent");
    const mint: any = n0va1oAuth.mintJitToken(T, { agentId: agent.agentId, ttlSec: 600 });
    expect(n0va1oAuth.tokenStatus(T, mint.tokenId).status).toBe("active");
    n0va1oAuth.revokeToken(T, mint.tokenId);
    expect(n0va1oAuth.tokenStatus(T, mint.tokenId).status).toBe("revoked");
    const rotated: any = n0va1oAuth.rotateToken(T, mint.tokenId);
    expect(rotated.rotated.tokenId).toMatch(/^jit_/);
    expect(rotated.oldToken).toBe(mint.tokenId);
    const tokens: any = n0va1oAuth.listTokens(T, agent.agentId);
    expect(tokens.tokens.some((t: any) => t.status === "rotated")).toBe(true);
    expect(n0va1oAuth.tokenStatus(T, rotated.rotated.tokenId).status).toBe("active");
  });

  it("deactivateAgent blocks token minting", () => {
    const dead: any = n0va1oAuth.registerAgent(T, { name: "Dead Agent", scopes: ["gateway.read"] });
    const deactivated: any = n0va1oAuth.deactivateAgent(T, dead.agentId);
    expect(deactivated.status).toBe("inactive");
    expect(() => n0va1oAuth.mintJitToken(T, { agentId: dead.agentId })).toThrow(/inactive/);
  });

  it("createConnection + authorize + disconnect lifecycle", () => {
    const agents: any = n0va1oAuth.listAgents(T);
    const agent = agents.agents.find((a: any) => a.name === "Gateway Agent");
    const conn: any = n0va1oAuth.createConnection(T, { platformId: "slack", agentId: agent.agentId, label: "Smoke Slack" });
    expect(conn.connectionId).toMatch(/^ca_/);
    expect(conn.status).toBe("pending");
    const auth: any = n0va1oAuth.authorizeConnection(T, conn.connectionId);
    expect(auth.status).toBe("connected");
    expect(n0va1oAuth.getConnection(T, conn.connectionId).status).toBe("connected");
    const disc: any = n0va1oAuth.disconnectConnection(T, conn.connectionId);
    expect(disc.status).toBe("disconnected");
    const list: any = n0va1oAuth.listConnections(T);
    expect(list.total).toBe(1);
    expect(list.byStatus.find((s: any) => s.status === "disconnected").count).toBe(1);
  });

  it("addAccount + switchAccount manages an account pool", () => {
    const list: any = n0va1oAuth.listConnections(T);
    const conn = list.connections[0];
    const acct1: any = n0va1oAuth.addAccount(T, { connectionId: conn.connectionId, accountName: "Acme Corp" });
    const acct2: any = n0va1oAuth.addAccount(T, { connectionId: conn.connectionId, accountName: "Globex Inc" });
    expect(acct1.accountId).toMatch(/^ac_/);
    expect(acct1.status).toBe("active");
    const switched: any = n0va1oAuth.switchAccount(T, acct2.accountId);
    expect(switched.accountId).toBe(acct2.accountId);
    expect(switched.switchLatencyMs).toBe(15);
    const accounts: any = n0va1oAuth.listAccounts(T, conn.connectionId);
    expect(accounts.total).toBe(2);
    expect(accounts.activeAccount).toBe(acct2.accountId);
    expect(accounts.accounts.find((a: any) => a.active).accountName).toBe("Globex Inc");
  });

  it("authDashboard aggregates counts and recent log", () => {
    const d: any = n0va1oAuth.authDashboard(T);
    expect(d.counts.agents).toBeGreaterThanOrEqual(2);
    expect(d.counts.connections).toBe(1);
    expect(d.counts.connected).toBe(0);
    expect(d.counts.accounts).toBe(2);
    expect(d.authMethods).toHaveLength(5);
    expect(d.recent.length).toBeGreaterThan(0);
    const log: any = n0va1oAuth.authLog(T, 20);
    expect(log.total).toBeGreaterThan(0);
    expect(log.entries[0].category).toBeTruthy();
  });
});

describe("N0VA1O intent routing & MCP mesh", () => {
  it("mcpCatalog exposes 3 transports and 4 protocol translators", () => {
    const mcp: any = n0va1oRouting.mcpCatalog();
    expect(mcp.transports.map((t: any) => t.id)).toEqual(["stdio", "http_sse", "websocket"]);
    expect(mcp.protocolTranslators.map((t: any) => t.target)).toEqual(["REST", "GraphQL", "SOAP", "gRPC"]);
    expect(mcp.endpoints.length).toBeGreaterThanOrEqual(2);
    expect(mcp.summary).toContain("MCP mesh");
  });

  it("discoverTools maps 'list my messages' to read intent with 4 tools", () => {
    const found: any = n0va1oRouting.discoverTools(T, "list my messages");
    expect(found.intent).toBe("read");
    expect(found.tools).toHaveLength(4);
    expect(found.injectedCount).toBe(4);
    expect(found.discoveryP99Ms).toBe(45);
    found.tools.forEach((t: any) => {
      expect(t.toolId).toBeTruthy();
      expect(t.protocols.length).toBeGreaterThan(0);
      expect(t.risk).toBeTruthy();
    });
    const post: any = n0va1oRouting.discoverTools(T, "post announcement");
    expect(post.intent).toBe("post");
    expect(post.tools[0].toolId).toBe("social.post");
  });

  it("discoverTools with explicit intent filters to that intent", () => {
    const found: any = n0va1oRouting.discoverTools(T, "whatever", { intent: "schedule" });
    expect(found.tools.length).toBeGreaterThan(0);
    found.tools.forEach((t: any) => expect(t.toolId).toMatch(/^schedule\./));
  });

  it("translateRequest REST→GraphQL stamps a translation", () => {
    const out: any = n0va1oRouting.translateRequest(T, {
      toolId: "email.send",
      targetProtocol: "graphql",
      payload: { subject: "Hello", to: "client@x.io" },
    });
    expect(out.targetProtocol).toBe("GraphQL");
    expect(out.sourceProtocol).toBe("rest");
    expect(out.translated.translationId).toMatch(/^tr_/);
    expect(out.translated.url).toContain("email/send/graphql");
    expect(out.translated.headers["x-n0va1o-proto"]).toBe("GRAPHQL");
    expect(out.summary).toMatch(/GRAPHQL/i);
    expect(() => n0va1oRouting.translateRequest(T, { toolId: "email.send", targetProtocol: "xmlrpc" }))
      .toThrow(/Unknown target protocol/);
  });

  it("routing policy CRUD per team", () => {
    const created: any = n0va1oRouting.createRoutingPolicy(T, {
      teamId: "team-eng",
      whitelist: ["email.send", "crm.*"],
      approvalRequired: ["crm.update_deal"],
      rateLimits: { perMin: 30 },
    });
    expect(created.policyId).toBeTruthy();
    expect(created.endpoint).toContain("team-eng");
    expect(created.transport).toBe("http_sse");
    expect(() => n0va1oRouting.createRoutingPolicy(T, { teamId: "team-eng" })).toThrow(/already exists/);
    const updated: any = n0va1oRouting.updateRoutingPolicy(T, "team-eng", { whitelist: ["email.read"] });
    expect(updated.whitelist).toEqual(["email.read"]);
    expect(n0va1oRouting.getRoutingPolicy(T, "team-eng").whitelist).toEqual(["email.read"]);
    expect(n0va1oRouting.listRoutingPolicies(T).total).toBe(1);
    const del: any = n0va1oRouting.deleteRoutingPolicy(T, "team-eng");
    expect(del.deleted).toBe(true);
    expect(() => n0va1oRouting.getRoutingPolicy(T, "team-eng")).toThrow(/Policy not found/);
    expect(n0va1oRouting.listRoutingPolicies(T).total).toBe(0);
  });

  it("evaluateToolAccess enforces whitelist and HITL defaults", () => {
    n0va1oRouting.createRoutingPolicy(T, { teamId: "team-eng2", whitelist: ["email.send"] });
    const allow: any = n0va1oRouting.evaluateToolAccess(T, { toolId: "email.send", teamId: "team-eng2" });
    expect(allow.allowed).toBe(true);
    expect(allow.verdict).toBe("allowed");
    const deny: any = n0va1oRouting.evaluateToolAccess(T, { toolId: "storage.delete_file", teamId: "team-eng2" });
    expect(deny.allowed).toBe(false);
    expect(deny.verdict).toBe("denied");
    expect(deny.reason).toContain("whitelist");
    const noPolicy: any = n0va1oRouting.evaluateToolAccess(T, { toolId: "social.read_feed", teamId: "team-nopolicy" });
    expect(noPolicy.allowed).toBe(true);
    expect(noPolicy.verdict).toBe("allowed");
    expect(() => n0va1oRouting.evaluateToolAccess(T, { toolId: "bogus.tool", teamId: "team-eng2" }))
      .toThrow(/Tool not found/);
  });

  it("access requests resolve and overview aggregates", () => {
    const req: any = n0va1oRouting.requestAccess(T, { toolId: "storage.delete_file", teamId: "team-eng2", requester: "nova-admin", reason: "Cleanup" });
    expect(req.requestId).toBeTruthy();
    expect(req.status).toBe("pending");
    expect(n0va1oRouting.listAccessRequests(T).pending).toBe(1);
    const resolved: any = n0va1oRouting.resolveAccessRequest(T, req.requestId, "approve");
    expect(resolved.status).toBe("approved");
    expect(n0va1oRouting.listAccessRequests(T, "approved").total).toBe(1);
    expect(n0va1oRouting.listAccessRequests(T).pending).toBe(0);
    const o: any = n0va1oRouting.routingOverview(T);
    expect(o.toolCount).toBe(30);
    expect(o.intents).toHaveLength(9);
    expect(o.teams).toHaveLength(1);
    expect(o.pendingAccessRequests).toBe(0);
    expect(o.discoveries).toBeGreaterThanOrEqual(1);
    expect(o.translations).toBeGreaterThanOrEqual(1);
    expect(o.discoveryP99Ms).toBe(45);
  });
});

describe("N0VA1O execution & virtual filesystem", () => {
  it("sandboxCatalog exposes 3 runtimes with 200ms cold start", () => {
    const cat: any = n0va1oExec.sandboxCatalog();
    expect(cat.runtimes).toHaveLength(3);
    expect(cat.coldStartP99Ms).toBe(200);
    expect(cat.runtimes[0].id).toBe("python311");
  });

  it("spawnSandbox + execInSandbox runs code", () => {
    const sb: any = n0va1oExec.spawnSandbox(T, { runtimeId: "python311", label: "smoke", ttlSec: 999999 });
    expect(sb.sandboxId).toMatch(/^sess_/);
    expect(sb.status).toBe("running");
    expect(sb.ttlSec).toBe(3600);
    const out: any = n0va1oExec.execInSandbox(T, sb.sandboxId, { code: "print(1)" });
    expect(out.stdout).toContain("executed");
    expect([0, 1]).toContain(out.exitCode);
    expect(out.execMs).toBeGreaterThanOrEqual(20);
    expect(n0va1oExec.getSandbox(T, sb.sandboxId).status).toBe("running");
  });

  it("terminateSandbox flips status", () => {
    const sb2: any = n0va1oExec.spawnSandbox(T, { runtimeId: "bash52", label: "short" });
    const term: any = n0va1oExec.terminateSandbox(T, sb2.sandboxId);
    expect(term.status).toBe("terminated");
    expect(term.lifetimeSec).toBeGreaterThanOrEqual(0);
    expect(() => n0va1oExec.terminateSandbox(T, sb2.sandboxId)).toThrow(/already terminated/);
  });

  it("execInSandbox rejects unknown sandboxes", () => {
    expect(() => n0va1oExec.execInSandbox(T, "sess_missing", { code: "x" })).toThrow(/Sandbox not found/);
  });

  it("putFile offloads >10MB to the virtual filesystem", () => {
    const small: any = n0va1oExec.putFile(T, { filename: "config.json", content: "{}", sizeBytes: 42 });
    expect(small.fileId).toMatch(/^fl_/);
    expect(small.storage).toBe("inline");
    expect(small.offloaded).toBe(false);
    expect(small.pointer).toBeNull();
    const bigSize = 10 * 1024 * 1024 + 1024;
    const big: any = n0va1oExec.putFile(T, { filename: "big.bin", content: "", sizeBytes: bigSize });
    expect(big.offloaded).toBe(true);
    expect(big.storage).toBe("virtual_fs");
    expect(big.pointer).toMatch(/^vfs:\/\//);
    expect(big.checksum).toMatch(/^sha256_/);
    expect(n0va1oExec.getFile(T, big.fileId).sizeBytes).toBe(bigSize);
    const list: any = n0va1oExec.listFiles(T);
    expect(list.total).toBe(2);
    expect(list.offloaded).toBe(1);
    expect(list.totalBytes).toBe(bigSize + 42);
    const del: any = n0va1oExec.deleteFile(T, small.fileId);
    expect(del.deleted).toBe(true);
    expect(n0va1oExec.listFiles(T).total).toBe(1);
  });

  it("vfsOverview reports offloaded bytes", () => {
    const bigSize = 10 * 1024 * 1024 + 1024;
    const vfs: any = n0va1oExec.vfsOverview(T);
    expect(vfs.totalFiles).toBe(1);
    expect(vfs.offloaded).toBe(1);
    expect(vfs.inline).toBe(0);
    expect(vfs.totalBytes).toBe(bigSize);
    expect(vfs.offloadedBytes).toBe(bigSize);
    expect(vfs.thresholdMB).toBe(10);
  });

  it("recipes compile with validation and execute deterministically", () => {
    const cat: any = n0va1oExec.recipeCatalog();
    expect(cat.steps).toHaveLength(10);
    expect(cat.compileP99Ms).toBe(85);
    const compiled: any = n0va1oExec.compileRecipe(T, {
      name: "Follow-up flow",
      steps: [
        { action: "email_send", params: { subject: "Follow-up" } },
        { action: "schedule_book", params: { title: "Sync" } },
      ],
    });
    expect(compiled.recipeId).toBeTruthy();
    expect(compiled.status).toBe("compiled");
    expect(compiled.steps).toHaveLength(2);
    expect(compiled.steps[0].tool).toBe("email.send");
    expect(compiled.steps[0].validated).toBe(true);
    expect(() => n0va1oExec.compileRecipe(T, { name: "Bad", steps: [{ action: "bogus_action", params: {} }] }))
      .toThrow(/unknown action/);
    expect(() => n0va1oExec.compileRecipe(T, { name: "Missing", steps: [{ action: "email_send", params: {} }] }))
      .toThrow(/missing required param/);
    const exec: any = n0va1oExec.executeRecipe(T, compiled.recipeId);
    expect(exec.transactionId).toMatch(/^tr_/);
    expect(["completed", "partial"]).toContain(exec.status);
    expect(exec.stepResults).toHaveLength(2);
    expect(exec.stepsSucceeded).toBeGreaterThanOrEqual(1);
    expect(n0va1oExec.getRecipe(T, compiled.recipeId).name).toBe("Follow-up flow");
    expect(n0va1oExec.listExecutions(T).total).toBe(1);
    const dash: any = n0va1oExec.execDashboard(T);
    expect(dash.counts.runningSandboxes).toBe(1);
    expect(dash.counts.totalSandboxes).toBe(2);
    expect(dash.counts.files).toBe(1);
    expect(dash.counts.offloadedFiles).toBe(1);
    expect(dash.counts.recipes).toBe(1);
    expect(dash.counts.executions).toBe(1);
  });
});

describe("N0VA1O triggers", () => {
  it("triggerCatalog exposes 10 bidirectional events", () => {
    const cat: any = n0va1oTrigger.triggerCatalog();
    expect(cat.events).toHaveLength(10);
    expect(cat.events[0].event).toBe("n0va1o.connection_established");
    expect(cat.sources).toHaveLength(4);
    expect(cat.totalEvents).toBe(10);
  });

  it("createTrigger validates event, source and target URL", () => {
    const trig: any = n0va1oTrigger.createTrigger(T, {
      event: "n0va1o.connection_established",
      source: "webhook",
      targetUrl: "https://hook.example.com/events",
      name: "Webhook → Slack",
    });
    expect(trig.triggerId).toBeTruthy();
    expect(trig.secret).toMatch(/^whsec_n0va1o_/);
    expect(trig.enabled).toBe(true);
    expect(trig.latencyTargetMs).toBe(200);
    expect(() => n0va1oTrigger.createTrigger(T, { event: "n0va1o.connection_established", targetUrl: "file:///tmp/x" }))
      .toThrow(/http/);
    expect(() => n0va1oTrigger.createTrigger(T, { event: "bogus.event", targetUrl: "https://x.io" }))
      .toThrow(/Unknown trigger event/);
    expect(() => n0va1oTrigger.createTrigger(T, { event: "n0va1o.agent_registered", source: "bogus", targetUrl: "https://x.io" }))
      .toThrow(/Unknown source/);
  });

  it("fireEvent delivers to matching enabled triggers and stats aggregate", () => {
    const trig2: any = n0va1oTrigger.createTrigger(T, { event: "n0va1o.recipe_executed", source: "internal", targetUrl: "https://hooks.n0va.io/recipes" });
    const fired: any = n0va1oTrigger.fireEvent(T, { event: "n0va1o.recipe_executed", payload: { recipe: "follow-up" } });
    expect(fired.matchedTriggers).toBe(1);
    expect(fired.deliveries).toHaveLength(1);
    expect(["delivered", "failed"]).toContain(fired.deliveries[0].status);
    expect(fired.deliveries[0].signature).toMatch(/^sha256=/);
    const off: any = n0va1oTrigger.toggleTrigger(T, trig2.triggerId);
    expect(off.enabled).toBe(false);
    expect(n0va1oTrigger.fireEvent(T, { event: "n0va1o.recipe_executed", payload: {} }).matchedTriggers).toBe(0);
    n0va1oTrigger.toggleTrigger(T, trig2.triggerId);
    expect(n0va1oTrigger.getTrigger(T, trig2.triggerId).enabled).toBe(true);
    expect(n0va1oTrigger.listDeliveries(T).total).toBe(1);
    const stats: any = n0va1oTrigger.triggerStats(T);
    expect(stats.totalTriggers).toBe(2);
    expect(stats.totalDeliveries).toBe(1);
    expect(stats.byEvent.find((e: any) => e.event === "n0va1o.recipe_executed").count).toBe(1);
    const del: any = n0va1oTrigger.deleteTrigger(T, trig2.triggerId);
    expect(del.deleted).toBe(true);
    expect(n0va1oTrigger.listTriggers(T).total).toBe(1);
    const o: any = n0va1oTrigger.triggerOverview(T);
    expect(o.events).toHaveLength(10);
    expect(o.totalTriggers).toBe(1);
    expect(o.enabled).toBe(1);
  });
});

describe("N0VA1O governance & audit", () => {
  it("zeroTrustStatus scores 4 layers", () => {
    const zt: any = n0va1oGov.zeroTrustStatus(T);
    expect(zt.layers.map((l: any) => l.id)).toEqual(["identity", "authorization", "execution", "audit"]);
    expect(zt.layers[0].passRate).toBeGreaterThanOrEqual(88);
    expect(zt.layers[0].passRate).toBeLessThanOrEqual(99);
    expect(zt.overallScore).toBeGreaterThan(0);
    expect(["review", "strong", "hardened"]).toContain(zt.level);
    expect(zt.summary).toContain("Zero-trust");
  });

  it("schema modifiers CRUD", () => {
    const cat: any = n0va1oGov.schemaModifierCatalog();
    expect(cat.types).toHaveLength(3);
    const mod: any = n0va1oGov.createModifier(T, { type: "schema", toolPattern: "email.*", transform: "redact PII", name: "PII guard" });
    expect(mod.modifierId).toBeTruthy();
    expect(mod.summary).toContain("registered");
    expect(n0va1oGov.listModifiers(T).total).toBe(1);
    expect(() => n0va1oGov.createModifier(T, { type: "bogus", toolPattern: "x" })).toThrow(/Unknown modifier type/);
    const del: any = n0va1oGov.deleteModifier(T, mod.modifierId);
    expect(del.deleted).toBe(true);
    expect(n0va1oGov.listModifiers(T).total).toBe(0);
  });

  it("evaluateCall auto-executes low risk", () => {
    const low: any = n0va1oGov.evaluateCall(T, { toolId: "email.read", riskLevel: "low" });
    expect(low.verdict).toBe("auto_execute");
    expect(low.riskScore).toBeGreaterThanOrEqual(35);
    expect(low.riskScore).toBeLessThanOrEqual(94);
    expect(low.summary).toContain("auto-executed");
  });

  it("evaluateCall escalates critical to an interrogation room", () => {
    const critical: any = n0va1oGov.evaluateCall(T, { toolId: "devops.deploy", riskLevel: "critical", action: "Deploy v42", reasoning: "Scheduled release" });
    expect(critical.verdict).toBe("escalated");
    expect(critical.hitlId).toBeTruthy();
    expect(critical.deadline).toBeTruthy();
    expect(critical.interrogationRoom.roomId).toBeTruthy();
    expect(critical.interrogationRoom.panels).toHaveLength(6);
    expect(critical.summary).toMatch(/critical/i);
    const queue: any = n0va1oGov.hitlQueue(T);
    expect(queue.total).toBe(1);
    expect(queue.queue[0].toolId).toBe("devops.deploy");
    const got: any = n0va1oGov.getHitl(T, critical.hitlId);
    expect(got.interrogationRoom.roomId).toBe(critical.interrogationRoom.roomId);
    expect(n0va1oGov.hitlStatus(T).pending).toBe(1);
    expect(n0va1oGov.hitlStatus(T).matrix).toHaveLength(4);
    const resolved: any = n0va1oGov.resolveHitl(T, critical.hitlId, "approve", { reviewer: "nova-admin" });
    expect(resolved.status).toBe("approved");
    expect(resolved.decision).toBe("approve");
    expect(resolved.summary).toContain("approved");
    const status: any = n0va1oGov.hitlStatus(T);
    expect(status.pending).toBe(0);
    expect(status.approved).toBe(1);
  });

  it("evaluateCall validates risk and resolveHitl validates decisions", () => {
    expect(() => n0va1oGov.evaluateCall(T, { toolId: "email.read", riskLevel: "insane" })).toThrow(/Unknown risk level/);
    const high: any = n0va1oGov.evaluateCall(T, { toolId: "storage.delete_file", riskLevel: "high" });
    expect(() => n0va1oGov.resolveHitl(T, high.hitlId, "maybe")).toThrow(/one of approve/);
    expect(() => n0va1oGov.resolveHitl(T, high.hitlId, "override")).toThrow(/Override only allowed for medium/);
    const medium: any = n0va1oGov.evaluateCall(T, { toolId: "crm.create_lead", riskLevel: "medium" });
    const overridden: any = n0va1oGov.resolveHitl(T, medium.hitlId, "override", { overrideParams: { dryRun: true } });
    expect(overridden.decision).toBe("override");
    expect(overridden.status).toBe("approved");
  });

  it("audit chain verifies and detects tampering", () => {
    const a1: any = n0va1oGov.appendAudit(T, { action: "campaign.create", toolId: "ads.create_campaign", actor: "gateway-agent", details: { budget: 100 } });
    expect(a1.previousHash).toBe("GENESIS");
    expect(a1.chainHash).toHaveLength(32);
    expect(a1.merkleRoot).toHaveLength(32);
    const a2: any = n0va1oGov.appendAudit(T, { action: "campaign.launch", toolId: "ads.create_campaign", actor: "gateway-agent" });
    expect(a2.previousHash).toBe(a1.chainHash);
    const verified: any = n0va1oGov.verifyAuditChain(T);
    expect(verified.entries).toBe(2);
    expect(verified.chainIntact).toBe(true);
    expect(verified.brokenAt).toBeNull();
    expect(verified.merkleRoot).toBeTruthy();
    DataStore.mem().update("n0va1o_audit", (x: any) => x._id === a2.auditId, { actor: "intruder", updatedAt: new Date().toISOString() });
    const tampered: any = n0va1oGov.verifyAuditChain(T);
    expect(tampered.chainIntact).toBe(false);
    expect(tampered.brokenAt).toBe(1);
    expect(n0va1oGov.auditLog(T).total).toBe(2);
  });

  it("governanceDashboard merges zero-trust, hitl, audit and panels", () => {
    const d: any = n0va1oGov.governanceDashboard(T);
    expect(d.zeroTrust.layers).toHaveLength(4);
    expect(d.hitl.matrix).toHaveLength(4);
    expect(d.hitl.total).toBeGreaterThanOrEqual(3);
    expect(d.audit.chainIntact).toBe(false);
    expect(d.modifiers.total).toBe(0);
    expect(d.interrogationPanels).toHaveLength(6);
    expect(d.recent.length).toBeGreaterThan(0);
    expect(d.generatedAt).toBeTruthy();
  });
});

describe("N0VA1O self-improving plugin architecture", () => {
  it("pluginCatalog exposes 8 slots", () => {
    const cat: any = n0va1oPlugin.pluginCatalog();
    expect(cat.slots).toHaveLength(8);
    expect(cat.totalSlots).toBe(8);
    const ids = cat.slots.map((s: any) => s.id);
    expect(ids).toContain("auth_optimizer");
    expect(ids).toContain("cost_optimizer");
    expect(ids).toContain("security_hardening");
    expect(cat.slots[7].slot).toBe(8);
  });

  it("pluginStatus defaults enabled and togglePlugin persists", () => {
    const status: any = n0va1oPlugin.pluginStatus(T);
    expect(status).toHaveLength(8);
    status.forEach((s: any) => {
      expect(s.enabled).toBe(true);
      expect(s.status).toBe("active");
      expect(typeof s.runs).toBe("number");
    });
    const toggled: any = n0va1oPlugin.togglePlugin(T, "auth_optimizer");
    expect(toggled.enabled).toBe(false);
    const after: any = n0va1oPlugin.pluginStatus(T);
    expect(after.find((s: any) => s.id === "auth_optimizer").enabled).toBe(false);
    expect(after.find((s: any) => s.id === "auth_optimizer").status).toBe("disabled");
    expect(after.filter((s: any) => s.enabled)).toHaveLength(7);
    expect(() => n0va1oPlugin.togglePlugin(T, "bogus_slot")).toThrow(/Unknown plugin slot/);
    const re: any = n0va1oPlugin.togglePlugin(T, "auth_optimizer");
    expect(re.enabled).toBe(true);
  });

  it("runPluginCycle generates insights for enabled slots only", () => {
    n0va1oPlugin.togglePlugin(T, "cost_optimizer");
    const cycle: any = n0va1oPlugin.runPluginCycle(T);
    expect(cycle.insights).toHaveLength(7);
    expect(cycle.totalRuns).toBe(7);
    expect(cycle.summary).toContain("7 insight(s)");
    cycle.insights.forEach((i: any) => {
      expect(i.slotId).toBeTruthy();
      expect(i.detail.length).toBeGreaterThan(5);
      expect(i.runs).toBeGreaterThanOrEqual(1);
    });
    expect(n0va1oPlugin.pluginLog(T).total).toBeGreaterThanOrEqual(7);
  });

  it("pluginDashboard aggregates slots, runs, insights and recent log", () => {
    const re: any = n0va1oPlugin.togglePlugin(T, "cost_optimizer");
    expect(re.enabled).toBe(true);
    const d: any = n0va1oPlugin.pluginDashboard(T);
    expect(d.slots).toHaveLength(8);
    expect(d.enabledCount).toBe(8);
    expect(d.totalRuns).toBe(7);
    expect(d.totalInsights).toBe(7);
    expect(d.recent.length).toBeGreaterThan(0);
    expect(d.generatedAt).toBeTruthy();
  });
});
