import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailboxService } from "../services/MailboxService";
import { MailMessageService } from "../services/MailMessageService";
import { MailOpsService } from "../services/MailOpsService";
import { MailStorageService } from "../services/MailStorageService";

const mailboxes = new MailboxService();
const mail = new MailMessageService();
const ops = new MailOpsService();
const storage = new MailStorageService();
const T = "nova-mail7";

let workId = "";
let msgRecentId = "";
let msgNewsletterId = "";
let msgBigId = "";
let msgFailedId = "";
let msgFrozenId = "";

beforeAll(() => {
  const work = mailboxes.createMailbox(T, { name: "Nova Ops", type: "work", email: "nova@r7.io", plan: "business" });
  workId = work.mailboxId;
  const now = Date.now();

  const r1 = mail.receiveMessage(T, workId, {
    from: { name: "Sync Bot", email: "sync@ops.io" },
    subject: "Recent sync",
    body: "Your sync completed successfully.",
    importance: "normal",
  });
  msgRecentId = r1.message._id;

  DataStore.mem().insert("messages", {
    _id: "r7_nl",
    tenantId: T, mailboxId: workId, threadId: "thr_r7_nl", messageId: "<nl@r7.io>",
    from: { name: "Digest Desk", email: "digest@daily.io" }, to: [{ name: "Nova", email: "nova@r7.io" }],
    subject: "Weekly digest", body: "Here is this week's reading list.",
    folder: "inbox", labels: [], read: true, attachments: [], receivedAt: new Date(now - 40 * 86400000).toISOString(), importance: "normal",
    ai: { category: "newsletter" },
  });
  msgNewsletterId = "r7_nl";

  DataStore.mem().insert("messages", {
    _id: "r7_big",
    tenantId: T, mailboxId: workId, threadId: "thr_r7_big", messageId: "<big@r7.io>",
    from: { name: "Finance", email: "finance@ops.io" }, to: [{ name: "Nova", email: "nova@r7.io" }],
    subject: "Big file report", body: "Full audit export attached.",
    folder: "inbox", labels: [], read: true, attachments: [{ name: "audit.zip", sizeBytes: 10 * 1024 * 1024 }],
    receivedAt: new Date(now - 10 * 86400000).toISOString(), importance: "normal",
  });
  msgBigId = "r7_big";

  DataStore.mem().insert("messages", {
    _id: "r7_failed",
    tenantId: T, mailboxId: workId, threadId: "thr_r7_fail", messageId: "<fail@r7.io>",
    from: { name: "Shipments", email: "ship@ops.io" }, to: [{ name: "Nova", email: "nova@r7.io" }],
    subject: "Failed shipment", body: "Your shipment notice is ready.",
    folder: "inbox", labels: [], read: false, attachments: [], receivedAt: new Date(now - 86400000).toISOString(), importance: "normal",
    deliveryStatus: "failed",
  });
  msgFailedId = "r7_failed";

  DataStore.mem().insert("messages", {
    _id: "r7_frozen",
    tenantId: T, mailboxId: workId, threadId: "thr_r7_frozen", messageId: "<frozen@r7.io>",
    from: { name: "Archive", email: "old@ops.io" }, to: [{ name: "Nova", email: "nova@r7.io" }],
    subject: "Frozen archive", body: "Legacy record from the early days.",
    folder: "inbox", labels: [], read: true, attachments: [], receivedAt: new Date(now - 100 * 86400000).toISOString(), importance: "normal",
  });
  msgFrozenId = "r7_frozen";

  for (let i = 0; i < 3; i++) {
    DataStore.mem().insert("messages", {
      _id: `r7_dup${i}`,
      tenantId: T, mailboxId: workId, threadId: `thr_r7_dup`, messageId: `<dup${i}@r7.io>`,
      from: { name: "Team", email: "team@ops.io" }, to: [{ name: "Nova", email: "nova@r7.io" }],
      subject: "Duplicate thread alpha", body: `Same thread copy ${i}.`,
      folder: "inbox", labels: [], read: true, attachments: [],
      receivedAt: new Date(now - (5 + i) * 86400000).toISOString(), importance: "normal",
    });
  }
});

describe("MailOpsService — operations dashboard (Round 22)", () => {
  it("returns health metrics with uptime, queue depth and error rate", () => {
    const d = ops.opsDashboard(T);
    expect(d.health.smtpUptime).toMatch(/^\d{2}\.\d{4}%$/);
    expect(d.health.imapUptime).toMatch(/^\d{2}\.\d{4}%$/);
    expect(d.health.queueDepth).toBe(0);
    expect(d.health.queueVerdict).toBe("normal");
    expect(d.health.errorRate).toMatch(/^\d+\.\d{4}%$/);
  });

  it("returns performance, security and business metric blocks", () => {
    const d = ops.opsDashboard(T);
    expect(typeof d.performance.avgDeliveryMs).toBe("number");
    expect(typeof d.performance.p99SearchMs).toBe("number");
    expect(typeof d.security.malwareBlocked).toBe("number");
    expect(typeof d.security.authAnomalies).toBe("number");
    expect(d.business.activeMailboxes).toBe(1);
    expect(d.business.messagesToday).toBeGreaterThan(0);
    expect(typeof d.business.storageUsedBytes).toBe("number");
  });

  it("builds deterministic alerts for queue and storage", () => {
    const d = ops.opsDashboard(T);
    expect(d.alerts.length).toBeGreaterThanOrEqual(2);
    expect(d.alerts.some((a: any) => a.title.includes("Queue"))).toBe(true);
    expect(d.alerts.some((a: any) => a.title.includes("Storage"))).toBe(true);
    expect(d.seed).toBeTypeOf("number");
    expect(d.summary).toContain("Mail ops");
  });
});

describe("MailOpsService — incident response lifecycle (Round 22)", () => {
  let incId = "";

  it("creates a P1 incident with the spec escalation plan", () => {
    const res = ops.createIncident(T, { severity: "P1", title: "SMTP degradation", description: "Delivery latency doubled" });
    incId = res.incident.incidentId;
    expect(res.incident.severity).toBe("P1");
    expect(res.incident.status).toBe("open");
    expect(res.incident.responsePlan).toBe("Page on-call + team lead");
  });

  it("rejects invalid severity and missing title", () => {
    expect(() => ops.createIncident(T, { severity: "P9", title: "x" })).toThrow(/P0-P4/);
    expect(() => ops.createIncident(T, { severity: "P2", title: "  " })).toThrow(/title is required/);
  });

  it("lists incidents sorted newest-first with open count", () => {
    const list = ops.incidents(T);
    expect(list.incidents.length).toBe(1);
    expect(list.open).toBe(1);
  });

  it("acknowledges an incident", () => {
    const res = ops.acknowledgeIncident(T, incId);
    expect(res.incident.status).toBe("acknowledged");
  });

  it("escalates an incident severity", () => {
    const p3 = ops.createIncident(T, { severity: "P3", title: "Slow search" });
    const escalated = ops.escalateIncident(T, p3.incident.incidentId);
    expect(escalated.incident.severity).toBe("P2");
    expect(escalated.incident.escalated).toBe(true);
  });

  it("resolves an incident and stamps resolvedAt", () => {
    const res = ops.resolveIncident(T, incId);
    expect(res.incident.status).toBe("resolved");
    expect(res.incident.resolvedAt).toBeTruthy();
    expect(ops.incidents(T).open).toBe(1);
  });

  it("throws for unknown incident ids", () => {
    expect(() => ops.acknowledgeIncident(T, "nope")).toThrow(/not found/i);
  });

  it("writes incident events to the incident log", () => {
    const log = ops.incidentLog(T);
    expect(log.entries.length).toBeGreaterThanOrEqual(5);
    expect(log.entries.map((e: any) => e.category)).toContain("incident_created");
    expect(log.entries.map((e: any) => e.category)).toContain("incident_resolved");
  });
});

describe("MailStorageService — tiering (Round 22)", () => {
  it("reports per-tier counts with default policy", () => {
    const s = storage.tieringStatus(T);
    expect(s.tierOrder).toEqual(["hot", "warm", "cool", "cold"]);
    expect(s.tiers.hot.count).toBe(4);
    expect(s.tiers.warm.count).toBe(2);
    expect(s.tiers.cool.count).toBe(1);
    expect(s.tiers.cold.count).toBe(1);
    expect(s.eligibleMessages).toBe(8);
    expect(s.policy.autoTier).toBe(false);
    expect(typeof s.quota.percentUsed).toBe("number");
  });

  it("validates the tiering policy (cool must be < cold)", () => {
    expect(() => storage.setTieringPolicy(T, { coolAfterDays: 90, coldAfterDays: 30 })).toThrow(/coldAfterDays must be greater/);
  });

  it("persists an updated policy", () => {
    const res = storage.setTieringPolicy(T, { autoTier: true, coolAfterDays: 20, coldAfterDays: 60 });
    expect(res.policy.autoTier).toBe(true);
    expect(res.policy.coolAfterDays).toBe(20);
    const status = storage.tieringStatus(T);
    expect(status.policy.autoTier).toBe(true);
    expect(status.policy.coldAfterDays).toBe(60);
  });

  it("moves old messages to cool and cold tiers", () => {
    const res = storage.runTiering(T);
    expect(res.moved).toBe(2);
    expect(res.byTier.cool).toBe(1);
    expect(res.byTier.cold).toBe(1);
    const nl = DataStore.mem().findOne("messages", (m: any) => m._id === msgNewsletterId);
    expect(nl.storageTier).toBe("cool");
    const frozen = DataStore.mem().findOne("messages", (m: any) => m._id === msgFrozenId);
    expect(frozen.storageTier).toBe("cold");
    expect(res.summary).toContain("Tiered 2 message(s)");
  });

  it("is idempotent on a second run", () => {
    const res = storage.runTiering(T);
    expect(res.moved).toBe(0);
  });
});

describe("MailStorageService — AI cleanup suggestions (Round 22)", () => {
  it("finds newsletters, large attachments and duplicate threads", () => {
    const list = storage.cleanupSuggestions(T);
    expect(list.total).toBe(3);
    const types = list.suggestions.map((s: any) => s.type);
    expect(types).toContain("newsletters");
    expect(types).toContain("large_attachments");
    expect(types).toContain("duplicates");
    const news = list.suggestions.find((s: any) => s.type === "newsletters");
    expect(news.count).toBe(1);
    const dupes = list.suggestions.find((s: any) => s.type === "duplicates");
    expect(dupes.count).toBe(2);
  });

  it("applies the newsletter cleanup (moves to trash)", () => {
    const news = storage.cleanupSuggestions(T).suggestions.find((s: any) => s.type === "newsletters");
    const res = storage.applyCleanup(T, news.suggestionId);
    expect(res.touched).toBe(1);
    const nl = DataStore.mem().findOne("messages", (m: any) => m._id === msgNewsletterId);
    expect(nl.folder).toBe("trash");
  });

  it("applies all remaining cleanups", () => {
    const res = storage.applyAllCleanups(T);
    expect(res.applied).toContain("large_attachments");
    expect(res.applied).toContain("duplicates");
    expect(res.touched).toBe(3);
    const big = DataStore.mem().findOne("messages", (m: any) => m._id === msgBigId);
    expect(big.storageTier).toBe("cold");
  });

  it("throws for unknown suggestions", () => {
    expect(() => storage.applyCleanup(T, "nope")).toThrow(/not found/i);
  });

  it("reports no suggestions after cleanup", () => {
    expect(storage.cleanupSuggestions(T).total).toBe(0);
  });
});

describe("MailStorageService — forecast & dashboard (Round 22)", () => {
  it("projects storage growth over 30/60/90 days", () => {
    const f = storage.storageForecast(T);
    expect(f.projected.length).toBe(3);
    expect(f.projected.map((p: any) => p.days)).toEqual([30, 60, 90]);
    expect(typeof f.quotaHitDays).toBe("number");
    expect(f.summary).toContain("MB/day");
  });

  it("merges tiers, suggestions and forecast into one dashboard", () => {
    const d = storage.storageDashboard(T);
    expect(d.tiers.hot).toBeTypeOf("object");
    expect(d.forecast.projected.length).toBe(3);
    expect(d.suggestionsTotal).toBe(0);
    expect(d.summary).toContain("Storage");
    expect(d.seed).toBeTypeOf("number");
  });
});

describe("MailOpsService — one-click operations (Round 22)", () => {
  it("retries the failed delivery queue", () => {
    const res = ops.retryFailedQueue(T);
    expect(res.retried).toBe(1);
    const m = DataStore.mem().findOne("messages", (x: any) => x._id === msgFailedId);
    expect(m.deliveryStatus).toBe("sent");
  });

  it("reports a clean queue on the second run", () => {
    const res = ops.retryFailedQueue(T);
    expect(res.retried).toBe(0);
    expect(res.summary).toContain("clean");
  });

  it("takes a recovery checkpoint with tenant counts", () => {
    const cp = ops.takeCheckpoint(T, "pre-sprint");
    expect(cp.checkpointId.startsWith("cp_")).toBe(true);
    expect(cp.label).toBe("pre-sprint");
    expect(cp.messages).toBe(8);
    expect(cp.mailboxes).toBe(1);
  });

  it("deploys a deterministic threat rule and rescans", () => {
    const res = ops.deployThreatRule(T);
    expect(res.rulesDeployed).toBeGreaterThanOrEqual(1);
    expect(res.rulesDeployed).toBeLessThanOrEqual(3);
    expect(res.signaturesUpdated).toBeGreaterThanOrEqual(40);
    expect(typeof res.rescan.scanned).toBe("number");
    expect(res.summary).toContain("threat rule");
  });

  it("runs all housekeeping stages in one click", () => {
    const res = ops.runHousekeeping(T);
    expect(res.stages.rules).toMatchObject({ matched: 0, actions: 0 });
    expect(res.stages.archive.archived).toBe(1);
    expect(res.stages.tiering.byTier).toBeTypeOf("object");
    expect(res.stages.agent).toMatchObject({ autoReplies: 0, schedulesSent: 0 });
    expect(res.touched).toBeGreaterThanOrEqual(1);
    expect(res.summary).toContain("Housekeeping done");
  });

  it("writes ops log entries for every action", () => {
    const log = ops.opsLog(T);
    const cats = log.entries.map((e: any) => e.category);
    expect(cats).toContain("housekeeping");
    expect(cats).toContain("checkpoint");
    expect(cats).toContain("threat_rule");
    expect(cats).toContain("queue_retry");
  });
});
