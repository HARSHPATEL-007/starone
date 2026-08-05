import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { n0va1oSdk } from "../services/N0VA1OSdkService";
import { n0va1oDeployment } from "../services/N0VA1ODeploymentService";
import { n0va1oObservability } from "../services/N0VA1OObservabilityService";
import { n0va1oAuth } from "../services/N0VA1OAuthService";

const T = "nova51";
const T2 = "nova51b";

let agentId = "";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

beforeAll(() => {
  DataStore.mem().insert("n0va1o_state", { tenantId: T, plan: "growth", createdAt: new Date().toISOString() });
  const agent = DataStore.mem().insert("n0va1o_agents", { tenantId: T, name: "SDK Agent", status: "active", scopes: ["gateway.read"], createdAt: new Date().toISOString() });
  agentId = agent._id;
});

describe("N0VA1O SDK reference (spec 11)", () => {
  it("sdkCatalog exposes 3 languages + 15 features with gateway version", () => {
    const cat: any = n0va1oSdk.sdkCatalog();
    expect(cat.languages).toHaveLength(3);
    expect(cat.features).toHaveLength(15);
    expect(cat.totalLanguages).toBe(3);
    expect(cat.totalFeatures).toBe(15);
    const langs = cat.languages.map((l: any) => l.id);
    expect(langs).toEqual(["python", "javascript", "golang"]);
    expect(cat.gatewayVersion).toBe("1.1384.0");
    expect(cat.integrations).toBe(1384);
    expect(cat.summary).toContain("3 official SDKs");
  });

  it("generateSdkSnippet produces runnable feature snippets per language", () => {
    const s: any = n0va1oSdk.generateSdkSnippet(T, { language: "python", feature: "auth", scopePrefix: "mail.*" });
    expect(s.language).toBe("python");
    expect(s.featureName).toBe("auth");
    expect(s.code).toContain("from n0va1o import Gateway");
    expect(s.code).toContain("gw.agent.authenticate()");
    expect(s.code).toContain('scope prefix: "mail.*"');
    expect(s.lines).toBeGreaterThan(5);
    expect(s.snippetId).toMatch(/^snip_/);
    expect(s.summary).toMatch(/Python snippet/);
    const go: any = n0va1oSdk.generateSdkSnippet(T, { language: "golang", feature: "recipes" });
    expect(go.code).toContain("github.com/n0va1o/gateway-go");
    expect(() => n0va1oSdk.generateSdkSnippet(T, { language: "rust" })).toThrow(/Unknown SDK language/);
    expect(() => n0va1oSdk.generateSdkSnippet(T, { language: "python", feature: "nope" })).toThrow(/Unknown SDK feature/);
  });

  it("sdkInstallGuide gives per-language install + env vars", () => {
    const g: any = n0va1oSdk.sdkInstallGuide(T, "javascript");
    expect(g.language).toBe("javascript");
    expect(g.package).toBe("@n0va1o/gateway");
    expect(g.installCommand).toBe("npm install @n0va1o/gateway");
    expect(g.minRuntime).toContain("Node.js");
    expect(g.version).toBe("1.1384.0");
    expect(g.authEnvVars).toContain("N0VA1O_API_KEY");
    expect(g.summary).toContain("ready in ~");
    expect(() => n0va1oSdk.sdkInstallGuide(T, "ruby")).toThrow(/Unknown SDK language/);
  });

  it("checkSdkVersion reports current or outdated with upgrade command", () => {
    const v: any = n0va1oSdk.checkSdkVersion(T, "python");
    expect(v.language).toBe("python");
    expect(v.installed).toBe("1.1384.0");
    expect(typeof v.outdated).toBe("boolean");
    expect(v.upgradeCommand).toContain("pip install n0va1o");
  });

  it("createSdkProject validates + returns project + API key", () => {
    const p: any = n0va1oSdk.createSdkProject(T, { name: "My App", language: "python" });
    expect(p.projectId).toBeTruthy();
    expect(p.status).toBe("active");
    expect(p.version).toBe("1.1384.0");
    expect(p.apiKeyId).toMatch(/^n0va1o_ag_/);
    expect(p.summary).toContain("ready");
    expect(() => n0va1oSdk.createSdkProject(T, { name: "  " })).toThrow(/Project name is required/);
    expect(() => n0va1oSdk.createSdkProject(T, { name: "X", language: "rust" })).toThrow(/Unknown SDK language/);
  });

  it("recordSdkUsage increments per-project call counts", () => {
    const p: any = n0va1oSdk.createSdkProject(T, { name: "Analytics", language: "javascript" });
    const u1 = n0va1oSdk.recordSdkUsage(T, { projectId: p.projectId });
    expect(u1.calls).toBe(1);
    const u2 = n0va1oSdk.recordSdkUsage(T, { projectId: p.projectId });
    expect(u2.calls).toBe(2);
    expect(u2.summary).toContain("2 SDK call(s)");
    expect(() => n0va1oSdk.recordSdkUsage(T, { projectId: "missing" })).toThrow(/SDK project not found/);
  });

  it("sdkUsage + sdkProjects aggregate by language", () => {
    const usage: any = n0va1oSdk.sdkUsage(T);
    expect(usage.totalCalls).toBe(2);
    expect(usage.totalProjects).toBe(2);
    const py = usage.byLanguage.find((b: any) => b.language === "python");
    expect(py.calls).toBe(0);
    expect(py.projects).toBe(1);
    const projects: any = n0va1oSdk.sdkProjects(T);
    expect(projects.total).toBe(2);
    expect(projects.active).toBe(2);
  });

  it("sdkDashboard + sdkLog merge everything with activity", () => {
    const dash: any = n0va1oSdk.sdkDashboard(T);
    expect(dash.catalog.totalLanguages).toBe(3);
    expect(dash.projects.total).toBe(2);
    expect(dash.usage.totalCalls).toBe(2);
    expect(dash.installGuides).toHaveLength(3);
    expect(dash.log.entries.length).toBeGreaterThanOrEqual(1);
    const log: any = n0va1oSdk.sdkLog(T2);
    expect(log.entries).toHaveLength(0);
  });
});

describe("N0VA1O deployment architecture (spec 12 + 17)", () => {
  it("deploymentCatalog exposes 4 modes / 5 targets / 4 regions / 5 stages", () => {
    const cat: any = n0va1oDeployment.deploymentCatalog();
    expect(cat.modes).toHaveLength(4);
    expect(cat.targets).toHaveLength(5);
    expect(cat.regions).toHaveLength(4);
    expect(cat.stages).toHaveLength(5);
    const modes = cat.modes.map((m: any) => m.id);
    expect(modes).toEqual(["managed", "byoc", "vpc_peered", "hybrid"]);
    const targets = cat.targets.map((t: any) => t.id);
    expect(targets).toContain("aws");
    expect(targets).toContain("kubernetes");
    const regions = cat.regions.map((r: any) => r.id);
    expect(regions).toContain("us-east");
    expect(cat.summary).toContain("4 modes");
  });

  it("createDeployment validates mode/target/region requirements", () => {
    const d: any = n0va1oDeployment.createDeployment(T, { name: "Prod", mode: "managed", target: "aws", region: "us-east" });
    expect(d.deploymentId).toMatch(/^dep_/);
    expect(d.status).toBe("provisioning");
    expect(d.progress).toBe(0);
    expect(d.stages).toHaveLength(5);
    expect(d.stages.every((s: any) => s.status === "pending")).toBe(true);
    expect(() => n0va1oDeployment.createDeployment(T, { name: "X", mode: "onprem" })).toThrow(/Unknown deployment mode/);
    expect(() => n0va1oDeployment.createDeployment(T, { name: "X", target: "bogus" })).toThrow(/Unknown deployment target/);
    expect(() => n0va1oDeployment.createDeployment(T, { name: "X", region: "mars" })).toThrow(/Unknown region/);
    expect(() => n0va1oDeployment.createDeployment(T, { name: "X", mode: "byoc", target: "aws" })).toThrow(/cloudAccountId is required for BYOC/);
    expect(() => n0va1oDeployment.createDeployment(T, { name: "X", mode: "vpc_peered", target: "aws" })).toThrow(/vpcId is required for VPC-based modes/);
  });

  it("VPC modes create a peering record", () => {
    const d: any = n0va1oDeployment.createDeployment(T, { name: "Peered", mode: "vpc_peered", target: "aws", region: "us-east", vpcId: "vpc-0abc" });
    expect(d.vpcPeering).toBeTruthy();
    expect(d.vpcPeering.peeringId).toMatch(/^pcx_/);
    expect(d.vpcPeering.state).toMatch(/^(active|pending)$/);
  });

  it("listDeployments + getDeployment track lifecycle", () => {
    const list: any = n0va1oDeployment.listDeployments(T);
    expect(list.total).toBeGreaterThanOrEqual(1);
    expect(list.deployments[0].deploymentId).toMatch(/^dep_/);
    const got: any = n0va1oDeployment.getDeployment(T, list.deployments[0].deploymentId);
    expect(got.summary).toContain("provisioning (0%)");
    expect(() => n0va1oDeployment.getDeployment(T, "dep_missing")).toThrow(/Deployment not found/);
  });

  it("runProvision advances stages deterministically (active or failed branch)", () => {
    const d: any = n0va1oDeployment.createDeployment(T, { name: "Branch", mode: "managed", target: "docker", region: "us-east" });
    const prov: any = n0va1oDeployment.runProvision(T, d.deploymentId);
    if (prov.status === "active") {
      expect(prov.progress).toBe(100);
      expect(prov.healthScore).toBeGreaterThanOrEqual(88);
      expect(prov.endpoints.gatewayUrl).toContain("https://gw-");
      expect(prov.endpoints.websocketUrl).toContain("wss://");
      expect(prov.stages.every((s: any) => s.status === "complete")).toBe(true);
      const again: any = n0va1oDeployment.runProvision(T, d.deploymentId);
      expect(again.summary).toContain("already active");
    } else {
      expect(prov.status).toBe("failed");
      expect(prov.progress).toBeLessThan(100);
      expect(prov.healthScore).toBeNull();
      expect(prov.stages.some((s: any) => s.status === "failed")).toBe(true);
      expect(prov.summary).toContain("failed at stage");
      const again: any = n0va1oDeployment.runProvision(T, d.deploymentId);
      expect(again.status).toBe("failed");
    }
  });

  it("deploymentHealth reports uptime/latency/cert for active deployments", () => {
    const h: any = n0va1oDeployment.deploymentHealth(T);
    expect(h.total).toBeGreaterThanOrEqual(0);
    expect(h.averageHealth).toBeGreaterThanOrEqual(0);
    expect(h.summary).toContain("active deployment(s)");
    if (h.total > 0) {
      expect(h.deployments[0].uptimePct).toBeGreaterThan(99);
      expect(h.deployments[0].latencyMs).toBeGreaterThan(0);
      expect(h.deployments[0].certificateStatus).toMatch(/^(valid|expiring_soon)$/);
    }
  });

  it("migrateConnections moves existing connections between deployments", () => {
    const to: any = n0va1oDeployment.createDeployment(T, { name: "Target", mode: "managed", target: "aws", region: "us-east" });
    const conn: any = n0va1oAuth.createConnection(T, { platformId: "slack", agentId, label: "Migrate Me", authMethod: "oauth2" });
    const res: any = n0va1oDeployment.migrateConnections(T, { toDeploymentId: to.deploymentId, connectionIds: [conn.connectionId] });
    expect(res.requested).toBe(1);
    expect(res.migrated).toBe(1);
    expect(res.connections).toHaveLength(1);
    expect(res.connections[0]).toMatch(/^ca_/);
    expect(res.summary).toContain("1/1 connection(s) moved");
    const conn2: any = n0va1oAuth.createConnection(T, { platformId: "slack", agentId, label: "Moved", authMethod: "oauth2" });
    const res2: any = n0va1oDeployment.migrateConnections(T, { toDeploymentId: to.deploymentId, connectionIds: ["ca_bogus", conn2.connectionId] });
    expect(res2.requested).toBe(2);
    expect(res2.migrated).toBe(1);
    expect(res2.summary).toContain("1/2 connection(s) moved");
    expect(() => n0va1oDeployment.migrateConnections(T, { toDeploymentId: "dep_missing", connectionIds: [] })).toThrow(/Deployment not found/);
  });

  it("onboardingChecklist maps the 7-step spec checklist", () => {
    const o: any = n0va1oDeployment.onboardingChecklist(T);
    expect(o.steps).toHaveLength(7);
    expect(o.total).toBe(7);
    const ids = o.steps.map((s: any) => s.id);
    expect(ids).toEqual(["create_agent", "connect_platform", "mint_token", "compile_recipe", "open_session", "set_policy", "deploy_gateway"]);
    expect(o.phase).toMatch(/^(not_started|in_progress|complete)$/);
    expect(o.progressPct).toBeGreaterThanOrEqual(0);
    expect(o.progressPct).toBeLessThanOrEqual(100);
    expect(o.summary).toContain("Onboarding");
  });

  it("troubleshootingCatalog + troubleshoot cover the 8 documented issues", () => {
    const cat: any = n0va1oDeployment.troubleshootingCatalog();
    expect(cat.issues).toHaveLength(8);
    expect(cat.total).toBe(8);
    expect(cat.summary).toContain("8 documented issues");
    const rl: any = n0va1oDeployment.troubleshoot(T, "rate_limited");
    expect(rl.issueId).toBeTruthy();
    expect(rl.diagnosis).toContain("requests-per-minute");
    expect(rl.severity).toBe("medium");
    expect(rl.retryable).toBe(true);
    expect(rl.summary).toContain("rate_limited");
    const auth: any = n0va1oDeployment.troubleshoot(T, "auth_failure");
    expect(auth.severity).toBe("high");
    expect(auth.retryable).toBe(true);
    const jit: any = n0va1oDeployment.troubleshoot(T, "jit_expired");
    expect(jit.retryable).toBe(true);
    const schema: any = n0va1oDeployment.troubleshoot(T, "schema_mismatch");
    expect(schema.retryable).toBe(false);
    expect(() => n0va1oDeployment.troubleshoot(T, "not_an_issue")).toThrow(/Unknown issue/);
  });

  it("resolveIssue + issuesList track open/resolved", () => {
    const rl: any = n0va1oDeployment.troubleshoot(T, "sandbox_oom");
    const res: any = n0va1oDeployment.resolveIssue(T, rl.issueId);
    expect(res.status).toBe("resolved");
    expect(res.summary).toContain("resolved");
    const list: any = n0va1oDeployment.issuesList(T);
    expect(list.total).toBeGreaterThanOrEqual(3);
    expect(list.open).toBeGreaterThanOrEqual(2);
    expect(() => n0va1oDeployment.resolveIssue(T, "missing")).toThrow(/Issue not found/);
  });

  it("deleteDeployment terminates and blocks further provisioning", () => {
    const d: any = n0va1oDeployment.createDeployment(T, { name: "Doomed", mode: "managed", target: "docker", region: "us-east" });
    const del: any = n0va1oDeployment.deleteDeployment(T, d.deploymentId);
    expect(del.status).toBe("terminated");
    const got: any = n0va1oDeployment.getDeployment(T, d.deploymentId);
    expect(got.summary).toContain("terminated");
    expect(() => n0va1oDeployment.runProvision(T, d.deploymentId)).toThrow(/Deployment is terminated/);
  });

  it("deploymentDashboard merges catalog/deployments/health/onboarding/issues/log", () => {
    const dash: any = n0va1oDeployment.deploymentDashboard(T);
    expect(dash.catalog.modes).toHaveLength(4);
    expect(dash.deployments.total).toBeGreaterThanOrEqual(1);
    expect(dash.health.total).toBeGreaterThanOrEqual(0);
    expect(dash.onboarding.total).toBe(7);
    expect(dash.issues.total).toBeGreaterThanOrEqual(1);
    expect(dash.log.entries.length).toBeGreaterThanOrEqual(1);
    expect(dash.summary).toContain("deployment(s)");
    const log: any = n0va1oDeployment.deploymentLog(T2);
    expect(log.entries).toHaveLength(0);
  });
});

describe("N0VA1O observability & error handling (spec 13 + 14)", () => {
  it("observabilityCatalog exposes 5 signals + 5 error classes", () => {
    const cat: any = n0va1oObservability.observabilityCatalog();
    expect(cat.signals).toHaveLength(5);
    expect(cat.errorClasses).toHaveLength(5);
    const signals = cat.signals.map((s: any) => s.id);
    expect(signals).toEqual(["traces", "metrics", "logs", "events", "alerts"]);
    const classes = cat.errorClasses.map((e: any) => e.id);
    expect(classes).toEqual(["transient", "system", "persistent", "user_error", "unknown"]);
    expect(cat.summary).toContain("5 observability signals");
  });

  it("recordTelemetry stores any signal with scope + duration", () => {
    const t: any = n0va1oObservability.recordTelemetry(T, { signal: "metrics", scope: "gateway", durationMs: 42, status: "ok" });
    expect(t.telemetryId).toBeTruthy();
    expect(t.signal).toBe("metrics");
    expect(t.durationMs).toBe(42);
    expect(t.summary).toContain("metrics");
    expect(t.summary).toContain("42ms");
    const log: any = n0va1oObservability.recordTelemetry(T, { signal: "logs", scope: "sandbox", message: "oom", severity: "error" });
    expect(log.summary).toContain("logs");
    expect(() => n0va1oObservability.recordTelemetry(T, { signal: "bogus" })).toThrow(/Unknown signal/);
  });

  it("recordTrace builds span trees with status", () => {
    const tr: any = n0va1oObservability.recordTrace(T, { name: "compile", durationMs: 150 });
    expect(tr.traceId).toMatch(/^tr_/);
    expect(tr.durationMs).toBe(150);
    expect(tr.spans.length).toBeGreaterThanOrEqual(2);
    expect(tr.spans.length).toBeLessThanOrEqual(5);
    expect(tr.spans[0].name).toBe("compile");
    expect(tr.status).toMatch(/^(ok|error)$/);
    expect(tr.summary).toContain("150ms");
    expect(() => n0va1oObservability.recordTrace(T, { name: "  " })).toThrow(/Trace name is required/);
  });

  it("tracesList + getTrace support retrieval", () => {
    const list: any = n0va1oObservability.tracesList(T);
    expect(list.total).toBeGreaterThanOrEqual(1);
    expect(list.errors).toBeGreaterThanOrEqual(0);
    expect(list.traces[0].traceId).toMatch(/^tr_/);
    const got: any = n0va1oObservability.getTrace(T, list.traces[0].traceId);
    expect(got.summary).toContain("ms");
    expect(() => n0va1oObservability.getTrace(T, "tr_missing")).toThrow(/Trace not found/);
  });

  it("telemetryStats aggregates by signal with avg duration", () => {
    const stats: any = n0va1oObservability.telemetryStats(T);
    expect(stats.total).toBeGreaterThanOrEqual(2);
    const metrics = stats.bySignal.find((s: any) => s.signal === "metrics");
    expect(metrics.count).toBeGreaterThanOrEqual(1);
    const logs = stats.bySignal.find((s: any) => s.signal === "logs");
    expect(logs.count).toBeGreaterThanOrEqual(1);
    expect(stats.avgDurationMs).toBeGreaterThan(0);
    expect(stats.summary).toContain("telemetry record(s)");
  });

  it("reportError classifies severity + retryability", () => {
    const tr: any = n0va1oObservability.reportError(T, { errorClass: "transient", message: "upstream 502", scope: "gateway" });
    expect(tr.errorId).toMatch(/^err_/);
    expect(tr.retryable).toBe(true);
    expect(tr.severity).toBe("low");
    expect(tr.status).toBe("open");
    const pers: any = n0va1oObservability.reportError(T, { errorClass: "persistent", message: "Token expired" });
    expect(pers.retryable).toBe(false);
    expect(pers.severity).toBe("high");
    const sys: any = n0va1oObservability.reportError(T, { errorClass: "system", message: "disk full" });
    expect(sys.severity).toBe("medium");
    expect(() => n0va1oObservability.reportError(T, { errorClass: "bogus" })).toThrow(/Unknown error class/);
    expect(() => n0va1oObservability.reportError(T, { errorClass: "transient", message: "  " })).toThrow(/Error message is required/);
  });

  it("retryDecision applies exponential backoff then gives up", () => {
    const tr: any = n0va1oObservability.reportError(T, { errorClass: "transient", message: "flaky call", scope: "exec" });
    const d1: any = n0va1oObservability.retryDecision(tr.errorId, 1);
    expect(d1.verdict).toBe("retry");
    expect(d1.backoffMs).toBeGreaterThanOrEqual(200);
    expect(d1.backoffMs).toBeLessThan(60000);
    expect(d1.maxAttempts).toBe(5);
    expect(d1.strategy).toBe("exponential");
    const d2: any = n0va1oObservability.retryDecision(tr.errorId, 2);
    expect(d2.verdict).toBe("retry");
    expect(d2.backoffMs).toBeGreaterThanOrEqual(d1.backoffMs);
    const d5: any = n0va1oObservability.retryDecision(tr.errorId, 5);
    expect(d5.verdict).toBe("give_up");
    expect(d5.backoffMs).toBe(0);
    expect(d5.summary).toContain("Giving up");
    const pers: any = n0va1oObservability.reportError(T, { errorClass: "persistent", message: "bad schema" });
    const pd: any = n0va1oObservability.retryDecision(pers.errorId, 1);
    expect(pd.verdict).toBe("give_up");
    expect(pd.strategy).toBe("none");
    expect(() => n0va1oObservability.retryDecision("err_missing", 1)).toThrow(/Error not found/);
  });

  it("resolveError closes open errors", () => {
    const err: any = n0va1oObservability.reportError(T, { errorClass: "user_error", message: "bad request body" });
    const res: any = n0va1oObservability.resolveError(err.errorId);
    expect(res.status).toBe("resolved");
    expect(res.summary).toContain("resolved");
    expect(() => n0va1oObservability.resolveError("err_missing")).toThrow(/Error not found/);
  });

  it("errorsList aggregates by class with open counts", () => {
    const list: any = n0va1oObservability.errorsList(T);
    expect(list.total).toBeGreaterThanOrEqual(4);
    expect(list.open).toBeGreaterThanOrEqual(3);
    const transient = list.byClass.find((c: any) => c.errorClass === "transient");
    expect(transient.count).toBeGreaterThanOrEqual(1);
    const closed: any = n0va1oObservability.errorsList(T, "resolved");
    expect(closed.total).toBeGreaterThanOrEqual(1);
  });

  it("observabilityDashboard + log merge signals/traces/errors", () => {
    const dash: any = n0va1oObservability.observabilityDashboard(T);
    expect(dash.catalog.totalSignals).toBe(5);
    expect(dash.telemetry.total).toBeGreaterThanOrEqual(2);
    expect(dash.traces.total).toBeGreaterThanOrEqual(1);
    expect(dash.errors.open).toBeGreaterThanOrEqual(1);
    expect(dash.alerts.id).toBe("alerts");
    expect(dash.summary).toContain("telemetry record(s)");
    const log: any = n0va1oObservability.observabilityLog(T);
    expect(log.entries.length).toBeGreaterThanOrEqual(1);
    const log2: any = n0va1oObservability.observabilityLog(T2);
    expect(log2.entries).toHaveLength(0);
  });
});
