import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { n0va1oExec } from "../services/N0VA1OExecutionService";
import { n0va1oRouting } from "../services/N0VA1ORoutingService";
import { n0va1oGov } from "../services/N0VA1OGovernanceService";
import { n0va1oTrigger } from "../services/N0VA1OTriggerService";
import { n0va1oCatalog } from "../services/N0VA1OCatalogService";
import { n0va1oAuth } from "../services/N0VA1OAuthService";

const T = "nova50";
const T2 = "nova50b";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

beforeAll(() => {
  DataStore.mem().insert("n0va1o_state", { tenantId: T, plan: "growth", createdAt: new Date().toISOString() });
  DataStore.mem().insert("n0va1o_agents", { tenantId: T, name: "Depth Agent", status: "active", scopes: ["gateway.read"], createdAt: new Date().toISOString() });
});

describe("N0VA1O depth — VFS v2 (awk / convert / stream)", () => {
  it("vfsAwkProcess runs field programs deterministically", () => {
    const put: any = n0va1oExec.putFile(T, {
      filename: "revenue.csv",
      sizeBytes: 4096,
      content: "name,dept,amount\nalice,eng,10\nbob,sales,20\ncarol,eng,30",
    });
    const files: any = n0va1oExec.listFiles(T);
    const file = files.files.find((f: any) => f.fileId === put.fileId);
    const sum = n0va1oExec.vfsAwkProcess(T, file.fileId, "sum $3");
    expect(sum.fileId).toBe(file.fileId);
    expect(sum.output[0]).toBe("sum = 60 (3 numeric value(s))");
    const count = n0va1oExec.vfsAwkProcess(T, file.fileId, "/count/i");
    expect(count.output[0]).toBe("count = 4");
    const pass = n0va1oExec.vfsAwkProcess(T, file.fileId, "print $1");
    expect(pass.program).toBe("print $1");
    expect(() => n0va1oExec.vfsAwkProcess(T, "fl_missing", "sum $1")).toThrow("File not found");
  });

  it("vfsConvertFormat converts between formats with source sniffing", () => {
    const put: any = n0va1oExec.putFile(T, {
      filename: "ledger.csv",
      sizeBytes: 512,
      content: "id,owner\na1,jane\na2,john",
    });
    const files: any = n0va1oExec.listFiles(T);
    const file = files.files.find((f: any) => f.fileId === put.fileId);
    const conv = n0va1oExec.vfsConvertFormat(T, file.fileId, "json");
    expect(conv.sourceFormat).toBe("csv");
    expect(conv.targetFormat).toBe("json");
    expect(conv.convertedChars).toBeGreaterThan(0);
    expect(conv.summary).toContain("CSV → JSON");
    expect(() => n0va1oExec.vfsConvertFormat(T, file.fileId, "bogus")).toThrow(/targetFormat must be one of/);
  });

  it("vfsStreamExport chunks a file to the export vault", () => {
    const put: any = n0va1oExec.putFile(T, { filename: "big.txt", sizeBytes: 4096, content: "payload" });
    const files: any = n0va1oExec.listFiles(T);
    const file = files.files.find((f: any) => f.fileId === put.fileId);
    const exp = n0va1oExec.vfsStreamExport(T, file.fileId, { chunkSize: 2048 });
    expect(exp.exportId).toMatch(/^exp_/);
    expect(exp.chunkSize).toBe(4096);
    expect(exp.totalChunks).toBe(1);
    expect(exp.transferBytes).toBe(4096);
    expect(exp.destination).toContain("vfs://exports/");
    expect(exp.summary).toContain("Streamed");
  });
});

describe("N0VA1O depth — protocol translation pairs", () => {
  it("translationCatalog exposes all 9 spec pairs", () => {
    const cat: any = n0va1oRouting.translationCatalog();
    expect(cat.pairs).toHaveLength(9);
    const ids = cat.pairs.map((p: any) => p.id);
    expect(ids).toContain("rest_to_soap");
    expect(ids).toContain("rest_to_graphql");
    expect(ids).toContain("rest_to_grpc");
    expect(ids).toContain("webdav_to_rest");
    expect(ids).toContain("ftp_to_rest");
    expect(ids).toContain("odata_to_rest");
    expect(cat.total).toBe(9);
    expect(cat.summary).toContain("9");
  });

  it("mcpCatalog surfaces translation pairs and translator transport", () => {
    const cat: any = n0va1oRouting.mcpCatalog();
    expect(cat.translationPairs).toHaveLength(9);
    expect(cat.translators.some((t: any) => t.protocol === "webdav")).toBe(true);
    expect(cat.translators.some((t: any) => t.protocol === "odata")).toBe(true);
  });

  it("discoverTools v2 supports fallback + include_deprecated + require_sandbox", () => {
    const r1: any = n0va1oRouting.discoverTools(T, "definitely no tool matches this", { maxTools: 2 });
    expect(Array.isArray(r1.tools)).toBe(true);
    expect(r1.fallback_used).toBe(true);
    expect(r1.fallback_tools.length).toBeGreaterThanOrEqual(1);
    const r2: any = n0va1oRouting.discoverTools(T, "slack", { include_deprecated: true, require_sandbox: false });
    expect(r2.include_deprecated).toBe(true);
    expect(r2.require_sandbox).toBe(false);
  });
});

describe("N0VA1O depth — policy modifiers (7 types)", () => {
  it("modifierTypeCatalog exposes 7 policy types", () => {
    const cat: any = n0va1oGov.modifierTypeCatalog();
    expect(cat.total).toBe(7);
    const ids = cat.types.map((t: any) => t.id);
    expect(ids).toEqual(["field_redaction", "value_capping", "action_blocking", "pii_masking", "scope_filtering", "temporal_gating", "geographic_fencing"]);
  });

  it("schemaModifierCatalog totals 10 (3 phases + 7 policy)", () => {
    const cat: any = n0va1oGov.schemaModifierCatalog();
    expect(cat.total).toBe(10);
    expect(cat.phases).toEqual(["schema", "before", "after"]);
  });

  it("runModifierPipeline applies policy modifiers with typed effects", () => {
    const redact: any = n0va1oGov.createModifier(T, { type: "field_redaction", name: "Redact Card", toolPattern: "*", transform: "cardNumber, cvv" });
    const cap: any = n0va1oGov.createModifier(T, { type: "value_capping", name: "Cap 1000", toolPattern: "*", transform: "1000" });
    const block: any = n0va1oGov.createModifier(T, { type: "action_blocking", name: "Block Deletes", toolPattern: "storage.delete*", transform: "destructive calls blocked" });
    const pii: any = n0va1oGov.createModifier(T, { type: "pii_masking", name: "Mask PII", toolPattern: "*", transform: "" });
    const run = n0va1oGov.runModifierPipeline(T, { toolId: "storage.delete_file", phase: "before", payload: { cardNumber: "4111-1111-1111-1111", cvv: "123", name: "Jane" } });
    expect(run.runId).toMatch(/^modrun_/);
    expect(run.appliedCount).toBe(4);
    const blocked = run.applied.find((a: any) => a.type === "action_blocking");
    expect(blocked.effect.blocked).toBe(true);
    expect(run.blocked).toBe(true);
    expect(run.summary).toContain("BLOCKED");
    const redactRun = n0va1oGov.runModifierPipeline(T, { toolId: "crm.read", phase: "before", payload: { cardNumber: "4111-1111-1111-1111", cvv: "123", name: "Jane" } });
    const redacted = redactRun.applied.find((a: any) => a.type === "field_redaction");
    expect(redacted.effect.redactedFields).toEqual(["cardNumber", "cvv"]);
    const capRun = n0va1oGov.runModifierPipeline(T, { toolId: "crm.read", phase: "before", payload: { amount: 5000 } });
    const capped = capRun.applied.find((a: any) => a.type === "value_capping");
    expect(capped.effect.cappedValues).toEqual(["amount"]);
    const piiRun = n0va1oGov.runModifierPipeline(T, { toolId: "crm.read", phase: "before", payload: { email: "jane@n0va.io" } });
    const masked = piiRun.applied.find((a: any) => a.type === "pii_masking");
    expect(masked.effect.piiPatterns.map((p: any) => p.pattern)).toEqual(["email"]);
    expect(masked.effect.totalMasked).toBe(1);
  });

  it("createModifier rejects unknown types", () => {
    expect(() => n0va1oGov.createModifier(T, { type: "teleport", name: "X", toolPattern: "*" })).toThrow(/Unknown modifier type/);
  });
});

describe("N0VA1O depth — webhook ingest security (replay + rate limit)", () => {
  it("ingestWebhook accepts verified fresh payloads and rejects replays", () => {
    const payload = { recipe: "follow-up" };
    const body = JSON.stringify(payload);
    const timestamp = Date.now();
    const signature = `sha256=${hashStr(`${T}|n0va1o.recipe_executed|${timestamp}|${body}`).toString(16).padStart(64, "0")}`;
    const ok = n0va1oTrigger.ingestWebhook(T, { event: "n0va1o.recipe_executed", payload, body, timestamp, signature });
    expect(ok.accepted).toBe(true);
    expect(ok.signatureVerified).toBe(true);
    expect(ok.replayDetected).toBe(false);
    expect(ok.summary).toContain("accepted");
    const replay = n0va1oTrigger.ingestWebhook(T, { event: "n0va1o.recipe_executed", payload, body, timestamp, signature });
    expect(replay.accepted).toBe(false);
    expect(replay.replayDetected).toBe(true);
    expect(replay.verdict).toBe("replay");
  });

  it("ingestWebhook rejects bad signatures and stale timestamps", () => {
    const bad = n0va1oTrigger.ingestWebhook(T, { event: "n0va1o.recipe_executed", payload: {}, body: "x", timestamp: Date.now(), signature: "sha256=deadbeef" });
    expect(bad.accepted).toBe(false);
    expect(bad.signatureVerified).toBe(false);
    expect(bad.verdict).toBe("rejected");
    const stale = n0va1oTrigger.ingestWebhook(T, { event: "n0va1o.recipe_executed", payload: {}, body: "x", timestamp: Date.now() - 600000, signature: `sha256=${"0".repeat(64)}` });
    expect(stale.accepted).toBe(false);
  });

  it("ingestWebhook enforces per-event rate limits", () => {
    const event = "n0va1o.agent_registered";
    const base = Date.now();
    let accepted = 0;
    for (let i = 0; i < 4; i++) {
      const body = `payload-${i}`;
      const sig = `sha256=${hashStr(`${T}|${event}|${base + i}|${body}`).toString(16).padStart(64, "0")}`;
      const r: any = n0va1oTrigger.ingestWebhook(T, { event, payload: { i }, body, timestamp: base + i, signature: sig, limitPerMinute: 2 });
      if (r.accepted) accepted++;
    }
    expect(accepted).toBe(2);
    expect(n0va1oTrigger.ingestOverview(T).ingested).toBeGreaterThanOrEqual(3);
  });

  it("ingestWebhook rejects unknown events", () => {
    expect(() => n0va1oTrigger.ingestWebhook(T, { event: "bogus.event", payload: {} })).toThrow(/Unknown trigger event/);
  });
});

describe("N0VA1O depth — 13-metric throughput matrix", () => {
  it("throughputStatus exposes the full matrix on every plan", () => {
    const s: any = n0va1oCatalog.throughputStatus(T);
    expect(s.matrix).toHaveLength(13);
    expect(s.metrics).toBe(13);
    const ids = s.matrix.map((m: any) => m.metric);
    expect(ids).toContain("executionsPerDay");
    expect(ids).toContain("concurrentAgents");
    expect(ids).toContain("workflowSteps");
    expect(ids).toContain("sandboxSeconds");
    expect(ids).toContain("toolCallP99Ms");
    expect(ids).toContain("endToEndLatencyMs");
    expect(ids).toContain("apiCallsPerDay");
    expect(ids).toContain("webhookIngestPerSec");
    expect(ids).toContain("multiAccountSwitch");
    expect(s.target.requestsPerMinute).toBe(100);
    const rpm = s.matrix.find((m: any) => m.metric === "requestsPerMinute");
    expect(rpm.utilizationPct).toBe(s.utilizationPct);
    expect(s.target.executionsPerDay).toBe(2000);
  });

  it("targets are monotonic across all plans", () => {
    const targets: any = n0va1oCatalog.gatewayCatalog(T);
    const plans: any = n0va1oCatalog.planCatalog(T);
    expect(plans.plans).toHaveLength(5);
  });
});

describe("N0VA1O depth — account pool health + LRU eviction", () => {
  it("accountHealth scores accounts and refresh writes statuses", () => {
    const agents: any = n0va1oAuth.listAgents(T);
    const conn: any = n0va1oAuth.createConnection(T, { platformId: "slack", agentId: agents.agents[0].agentId, label: "Depth Slack" });
    const a1: any = n0va1oAuth.addAccount(T, { connectionId: conn.connectionId, accountName: "Health One" });
    const a2: any = n0va1oAuth.addAccount(T, { connectionId: conn.connectionId, accountName: "Health Two" });
    expect(a1.status).toBe("active");
    const refreshed: any = n0va1oAuth.refreshAccountHealth(T);
    expect(refreshed.checked).toBe(2);
    expect(refreshed.accounts.every((a: any) => ["healthy", "degraded", "critical"].includes(a.healthStatus))).toBe(true);
    const health: any = n0va1oAuth.accountHealth(T);
    expect(health.total).toBe(2);
    expect(health.summary).toMatch(/account\(s\) healthy/);
  });

  it("accountLru orders oldest-first and evicts with the active account protected", () => {
    n0va1oAuth.switchAccount(T, n0va1oAuth.listAccounts(T).accounts[0].accountId);
    const lru: any = n0va1oAuth.accountLru(T, { limit: 2 });
    expect(lru.poolSize).toBe(2);
    expect(lru.evictionCandidates.length).toBeGreaterThanOrEqual(1);
    const evicted: any = n0va1oAuth.evictAccounts(T, { limit: 2 });
    expect(evicted.evictedCount).toBeGreaterThanOrEqual(1);
    const after: any = n0va1oAuth.listAccounts(T);
    expect(after.accounts.some((a: any) => a.status === "evicted")).toBe(true);
    const stillActive = after.accounts.find((a: any) => a.active);
    expect(stillActive && stillActive.status !== "evicted").toBe(true);
    expect(n0va1oAuth.accountLru(T).summary).toContain("in pool");
  });
});
