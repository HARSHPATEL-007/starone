import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailboxService } from "../services/MailboxService";
import { MailSearchOperatorsService } from "../services/MailSearchOperatorsService";
import { MailWebhookService, WEBHOOK_EVENTS } from "../services/MailWebhookService";
import { MailAgentRegistryService, AGENT_PERSONAS, AGENT_TOOLS } from "../services/MailAgentRegistryService";

const mailboxes = new MailboxService();
const search = new MailSearchOperatorsService();
const webhook = new MailWebhookService();
const agents = new MailAgentRegistryService();
const T = "nova-mail9";

let mbId = "";
const now = Date.now();

function seedMessage(partial: any) {
  DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: partial.mailboxId || mbId, threadId: partial.threadId || `thr_${partial._id}`,
    messageId: `<${partial._id}@r9.io>`,
    from: partial.from || { name: "Nova", email: "nova@r9.io" },
    to: partial.to || [{ name: "Nova", email: "nova@r9.io" }],
    subject: partial.subject || "No subject", body: partial.body || "",
    folder: partial.folder || "inbox", labels: partial.labels || [], read: partial.read ?? false,
    starred: partial.starred ?? false, attachments: partial.attachments || [],
    receivedAt: partial.receivedAt || new Date(now).toISOString(), sentAt: partial.sentAt,
    importance: partial.importance || "normal", flags: partial.flags || [],
    ai: partial.ai || {},
    ...partial,
  });
}

beforeAll(() => {
  mbId = mailboxes.createMailbox(T, { name: "Nova Round 9", type: "work", email: "nova@r9.io", plan: "business" }).mailboxId;

  seedMessage({
    _id: "r9_voice", from: { name: "Priya", email: "priya@team.io" },
    subject: "Voice update", body: "Quick voice note.",
  });
  DataStore.mem().insert("mail_voice_notes", {
    tenantId: T, messageId: DataStore.mem().findOne("messages", (m: any) => m.tenantId === T && (m as any)._id === "r9_voice")?._id as any,
    summary: "Voice note", durationSec: 45, emotion: "calm", speakers: ["Speaker A"],
  });
  seedMessage({
    _id: "r9_poll", from: { name: "Team", email: "team@team.io" },
    subject: "Lunch poll", body: "Pick a spot.",
  });
  DataStore.mem().insert("mail_polls", {
    tenantId: T, messageId: DataStore.mem().findOne("messages", (m: any) => m.tenantId === T && (m as any)._id === "r9_poll")?._id as any,
    question: "Lunch?", options: ["Sushi", "Tacos"], status: "open",
  });
  seedMessage({
    _id: "r9_collab", from: { name: "Maya", email: "maya@team.io" },
    subject: "Design review", body: "Please comment.",
  });
  const collabMsg = DataStore.mem().findOne("messages", (m: any) => m.tenantId === T && (m as any)._id === "r9_collab") as any;
  DataStore.mem().insert("mail_comments", {
    tenantId: T, messageId: collabMsg._id, threadId: collabMsg.threadId, subject: collabMsg.subject,
    text: "Looks good", author: "alice@team.io",
  });
  DataStore.mem().insert("mail_reactions", {
    tenantId: T, messageId: collabMsg._id, user: "alice@team.io", emoji: "thumbsup",
  });
  seedMessage({
    _id: "r9_ai", from: { name: "Slack", email: "slack@notify.io" },
    subject: "Smart draft", body: "Draft me.",
    ai: { summary: "Status update", suggestedReply: "Will do", priority: "medium", category: "team" },
  });
  seedMessage({
    _id: "r9_visual", from: { name: "Growth", email: "growth@metrics.io" },
    subject: "Charts attached", body: "See attached charts.",
    attachments: [{ name: "revenue-chart.png", type: "image", sizeBytes: 120000 }],
  });
  seedMessage({ _id: "r9_plain", from: { name: "Bob", email: "bob@plain.io" }, subject: "Plain hello", body: "hi" });
});

describe("search operators — new §3.4.2 operators", () => {
  it("parses has:voice and has:poll into filters", () => {
    const p = search.parseQuery("has:voice");
    expect(p.operators).toHaveLength(1);
    expect(p.filters.hasVoice).toBe(true);
    expect(p.filters.hasPoll).toBeUndefined();
    const p2 = search.parseQuery("has:poll");
    expect(p2.filters.hasPoll).toBe(true);
  });

  it("rejects unknown has: values", () => {
    const p = search.parseQuery("has:video");
    expect(p.invalid).toHaveLength(1);
    expect(p.invalid[0].reason).toContain("unknown has:");
  });

  it("parses collaborated:with:EMAIL", () => {
    const p = search.parseQuery("collaborated:with:alice@team.io");
    expect(p.filters.collaborated).toBe(true);
    expect(p.filters.collabWith).toBe("alice@team.io");
    const bare = search.parseQuery("collaborated:with:");
    expect(bare.filters.collaborated).toBe(true);
    expect(bare.filters.collabWith).toBeUndefined();
  });

  it("parses ai:suggested and visual:contains", () => {
    const p = search.parseQuery("ai:suggested visual:contains:chart");
    expect(p.filters.aiSuggested).toBe(true);
    expect(p.filters.visual).toBe("chart");
  });

  it("finds messages with voice notes", () => {
    const r = search.operatorSearch(T, "has:voice");
    expect(r.total).toBe(1);
    expect(r.messages[0].subject).toBe("Voice update");
  });

  it("finds messages with polls", () => {
    const r = search.operatorSearch(T, "has:poll");
    expect(r.total).toBe(1);
    expect(r.messages[0].subject).toBe("Lunch poll");
  });

  it("finds messages collaborated by a specific user", () => {
    const r = search.operatorSearch(T, "collaborated:with:alice@team.io");
    expect(r.total).toBe(1);
    expect(r.messages[0].subject).toBe("Design review");
  });

  it("does not match collaborated:with for a non-participant", () => {
    const r = search.operatorSearch(T, "collaborated:with:bob@nowhere.io");
    expect(r.total).toBe(0);
  });

  it("finds messages with AI suggestions", () => {
    const r = search.operatorSearch(T, "ai:suggested");
    expect(r.total).toBe(1);
    expect(r.messages[0].subject).toBe("Smart draft");
  });

  it("finds visual content by tag", () => {
    const r = search.operatorSearch(T, "visual:contains:chart");
    expect(r.total).toBe(1);
    expect(r.messages[0].subject).toBe("Charts attached");
  });

  it("exposes 20 operators in the reference", () => {
    const ref = search.operatorReference();
    expect(ref.operators).toHaveLength(20);
    const ops = ref.operators.map((o: any) => `${o.op}:${o.example}`);
    expect(ops).toContain("has:has:voice");
    expect(ops).toContain("has:has:poll");
    expect(ops).toContain("collaborated:collaborated:with:jane@team.io");
    expect(ops).toContain("ai:ai:suggested");
    expect(ops).toContain("visual:visual:contains:chart");
    expect(ref.summary).toContain("20");
  });

  it("reports coverage stats for the new operators", () => {
    const s = search.operatorStats(T);
    const byOp: Record<string, any> = {};
    for (const row of s.stats) byOp[row.example] = row;
    expect(byOp["has:voice"].messages).toBe(1);
    expect(byOp["has:poll"].messages).toBe(1);
    expect(byOp["collaborated:with:jane@team.io"].messages).toBe(1);
    expect(byOp["ai:suggested"].messages).toBe(1);
    expect(byOp["visual:contains:chart"].messages).toBe(1);
  });
});

describe("webhooks — subscription registry (§4.4)", () => {
  it("exposes the 11-event catalog", () => {
    const ev = webhook.webhookEvents();
    expect(ev.events).toHaveLength(11);
    expect(WEBHOOK_EVENTS).toContain("mail.received");
    expect(WEBHOOK_EVENTS).toContain("mail.ai_suggestion");
    expect(ev.events[0]).toHaveProperty("desc");
  });

  it("rejects invalid URLs", () => {
    expect(() => webhook.createWebhook(T, { url: "not-a-url", events: ["mail.received"] })).toThrow("http");
  });

  it("rejects unknown events", () => {
    expect(() => webhook.createWebhook(T, { url: "https://hooks.io/x", events: ["mail.teleport"] })).toThrow("Unknown event");
  });

  it("rejects empty event lists", () => {
    expect(() => webhook.createWebhook(T, { url: "https://hooks.io/x", events: [] })).toThrow("At least one event");
  });

  it("registers a webhook with a secret and subscriptions", () => {
    const w = webhook.createWebhook(T, { url: "https://hooks.io/nova", label: "Nova alerts", events: ["mail.received", "mail.sent"] });
    expect(w.webhookId).toBeTruthy();
    expect(w.secret.startsWith("whsec_")).toBe(true);
    expect(w.events).toEqual(["mail.received", "mail.sent"]);
    expect(w.active).toBe(true);
    expect(w.summary).toContain("2");
  });

  it("lists webhooks", () => {
    const list = webhook.listWebhooks(T);
    expect(list).toHaveLength(1);
    expect(list[0].url).toBe("https://hooks.io/nova");
  });

  it("updates and pauses a webhook", () => {
    const w = webhook.listWebhooks(T)[0];
    const paused = webhook.updateWebhook(T, w.webhookId, { active: false, events: ["mail.received"] });
    expect(paused.active).toBe(false);
    expect(paused.events).toEqual(["mail.received"]);
    expect(paused.summary).toContain("paused");
    webhook.updateWebhook(T, w.webhookId, { active: true, events: ["mail.received", "mail.sent"] });
  });

  it("sends a ping test with an HMAC signature", () => {
    const w = webhook.listWebhooks(T)[0];
    const r = webhook.testWebhook(T, w.webhookId);
    expect(r.deliveryId).toBeTruthy();
    expect(r.signature.startsWith("sha256=")).toBe(true);
    expect(r.summary).toContain("Ping");
  });

  it("fires events only to subscribed endpoints", () => {
    const w = webhook.createWebhook(T, { url: "https://hooks.io/other", label: "Other", events: ["mail.ai_suggestion"] });
    const r = webhook.triggerEvent(T, "mail.received", { from: "x@y.io" });
    expect(r.results.length).toBe(1);
    expect(r.results[0].event).toBe("mail.received");
    expect(r.results[0].signature.startsWith("sha256=")).toBe(true);
    webhook.deleteWebhook(T, w.webhookId);
  });

  it("throws on unknown events", () => {
    expect(() => webhook.triggerEvent(T, "mail.teleport")).toThrow("Unknown event");
  });

  it("logs deliveries newest-first", () => {
    const d = webhook.webhookDeliveries(T);
    expect(d.total).toBeGreaterThanOrEqual(2);
    const times = d.deliveries.map((x: any) => new Date(x.at).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
    for (const row of d.deliveries) {
      expect(row.status).toMatch(/^(delivered|failed)$/);
      expect(row.signature.startsWith("sha256=")).toBe(true);
    }
  });

  it("computes delivery stats", () => {
    const s = webhook.webhookStats(T);
    expect(s.webhooks).toBe(1);
    expect(s.active).toBe(1);
    expect(s.subscriptions).toBe(2);
    expect(s.delivered + s.failed).toBeGreaterThanOrEqual(2);
    expect(s.successRate).toBeGreaterThanOrEqual(0);
    expect(s.successRate).toBeLessThanOrEqual(100);
  });

  it("returns the dashboard overview", () => {
    const o = webhook.webhookOverview(T);
    expect(o.catalog).toHaveLength(11);
    expect(o.recent.length).toBeGreaterThanOrEqual(1);
    expect(o.summary).toContain("Webhook center");
    expect(typeof o.seed).toBe("number");
  });

  it("deletes webhooks", () => {
    const w = webhook.listWebhooks(T)[0];
    webhook.deleteWebhook(T, w.webhookId);
    expect(webhook.listWebhooks(T)).toHaveLength(0);
  });
});

describe("agent framework — personas & tools (§11)", () => {
  it("exposes 10 agent personas", () => {
    const p = agents.agentPersonas();
    expect(p.personas).toHaveLength(10);
    const types = p.personas.map((x: any) => x.type);
    expect(types).toContain("mail_concierge");
    expect(types).toContain("threat_hunter");
    expect(types).toContain("custom");
  });

  it("exposes the tool catalog", () => {
    const c = agents.toolCatalog();
    expect(c.total).toBe(AGENT_TOOLS.length);
    expect(c.total).toBeGreaterThanOrEqual(24);
    expect(c.categories.length).toBeGreaterThanOrEqual(6);
    expect(AGENT_TOOLS.some((t) => t.name === "mail.write.send")).toBe(true);
    expect(AGENT_TOOLS.some((t) => t.name === "mail.calendar.create_event")).toBe(true);
  });

  it("discovers tools by intent", () => {
    const r = agents.toolDiscover(T, "send reply");
    expect(r.total).toBeGreaterThanOrEqual(2);
    const names = r.tools.map((t: any) => t.name);
    expect(names).toContain("mail.write.send");
    expect(names).toContain("mail.write.reply");
    expect(r.suggestedWorkflow.length).toBeGreaterThanOrEqual(1);
  });

  it("returns a broad catalog for empty queries", () => {
    const r = agents.toolDiscover(T, "");
    expect(r.tools.length).toBe(6);
  });
});

describe("agent framework — registration & lifecycle", () => {
  it("requires an agent name", () => {
    expect(() => agents.registerAgent(T, { agentType: "mail_concierge" })).toThrow("agentName is required");
  });

  it("rejects unknown agent types", () => {
    expect(() => agents.registerAgent(T, { agentName: "X", agentType: "robo_butler" })).toThrow("Unknown agent type");
  });

  it("registers an agent with an API key", () => {
    const a = agents.registerAgent(T, { agentName: "Concierge One", agentType: "mail_concierge", description: "Keeps the inbox tidy" });
    expect(a.agentId).toBeTruthy();
    expect(a.apiKey.startsWith("n0va_ag_")).toBe(true);
    expect(a.persona).toBe("Mail Concierge");
    expect(a.status).toBe("active");
    expect(a.permissions).toContain("organize");
  });

  it("lists and fetches agents", () => {
    const list = agents.listAgents(T);
    expect(list).toHaveLength(1);
    const got = agents.getAgent(T, list[0].agentId);
    expect(got.agentName).toBe("Concierge One");
  });

  it("updates and deactivates agents", () => {
    const a = agents.listAgents(T)[0];
    agents.updateAgent(T, a.agentId, { maxDailyActions: 2 });
    expect(agents.getAgent(T, a.agentId).maxDailyActions).toBe(2);
    const de = agents.deactivateAgent(T, a.agentId);
    expect(de.summary).toContain("disabled");
    expect(() => agents.createSession(T, a.agentId, { context: "x" })).toThrow("not active");
    agents.updateAgent(T, a.agentId, { active: true });
  });
});

describe("agent framework — sessions & actions", () => {
  let a2: any;
  beforeAll(() => {
    a2 = agents.registerAgent(T, { agentName: "Reply Bot", agentType: "reply_assistant" });
  });

  it("opens and closes sessions", () => {
    const s = agents.createSession(T, a2.agentId, { context: "morning triage" });
    expect(s.sessionId).toBeTruthy();
    const all = agents.agentSessions(T);
    expect(all.active).toBeGreaterThanOrEqual(1);
    expect(all.sessions[0].context).toBe("morning triage");
    const closed = agents.endSession(T, s.sessionId);
    expect(closed.status).toBe("closed");
  });

  it("executes non-approval tools immediately", () => {
    const r: any = agents.agentAction(T, a2.agentId, { tool: "mail.read.search", params: { query: "invoices" } });
    expect(r.approved).toBe(true);
    expect(r.execution.status).toBe("ok");
    expect(r.execution.latencyMs).toBeGreaterThanOrEqual(8);
    expect(agents.getAgent(T, a2.agentId).actionsToday).toBe(1);
  });

  it("queues approval-required tools in the interrogation room", () => {
    const r = agents.agentAction(T, a2.agentId, { tool: "mail.write.send", params: { to: "x@y.io" } });
    expect(r.approved).toBe(false);
    expect(r.hitlId).toBeTruthy();
    expect(r.summary).toContain("approval");
    const q = agents.hitlQueue(T);
    expect(q.pending).toBe(1);
    expect(q.queue[0].tool).toBe("mail.write.send");
  });

  it("rejects unknown tools", () => {
    expect(() => agents.agentAction(T, a2.agentId, { tool: "mail.fly" })).toThrow("Unknown tool");
  });

  it("enforces the daily action limit", () => {
    const a3 = agents.registerAgent(T, { agentName: "Limited Bot", agentType: "task_extractor" });
    agents.updateAgent(T, a3.agentId, { maxDailyActions: 2 });
    agents.agentAction(T, a3.agentId, { tool: "mail.read.message" });
    agents.agentAction(T, a3.agentId, { tool: "mail.ai.summarize" });
    expect(() => agents.agentAction(T, a3.agentId, { tool: "mail.read.thread" })).toThrow("daily action limit");
    expect(agents.getAgent(T, a3.agentId).actionsToday).toBe(2);
  });

  it("resolves HITL items with approve/reject", () => {
    const q = agents.hitlQueue(T);
    const item = q.queue.find((x: any) => x.tool === "mail.write.send")!;
    const before = agents.getAgent(T, a2.agentId).actionsToday;
    const ok = agents.resolveHitl(T, item.hitlId, "approve");
    expect(ok.status).toBe("approved");
    expect(agents.getAgent(T, a2.agentId).actionsToday).toBe(before + 1);
    const r2 = agents.agentAction(T, a2.agentId, { tool: "mail.write.schedule" });
    const rej = agents.resolveHitl(T, r2.hitlId, "reject");
    expect(rej.status).toBe("rejected");
  });

  it("rejects unknown decisions", () => {
    const r = agents.agentAction(T, a2.agentId, { tool: "mail.write.schedule" });
    expect(() => agents.resolveHitl(T, r.hitlId, "maybe")).toThrow("Unknown decision");
  });
});

describe("agent framework — audit & dashboard", () => {
  it("records an audit trail", () => {
    const log = agents.agentAuditLog(T);
    expect(log.total).toBeGreaterThanOrEqual(5);
    expect(log.entries.some((e: any) => e.tool === "mail.read.search")).toBe(true);
    expect(log.entries[0]).toHaveProperty("riskScore");
    expect(log.entries[0]).toHaveProperty("latencyMs");
  });

  it("filters the audit trail by agent", () => {
    const a = agents.listAgents(T)[0];
    const log = agents.agentAuditLog(T, a.agentId);
    for (const e of log.entries) expect(e.agentId).toBe(a.agentId);
  });

  it("returns the framework dashboard", () => {
    const d = agents.agentFrameworkDashboard(T);
    expect(d.agents).toBeGreaterThanOrEqual(2);
    expect(d.active).toBeGreaterThanOrEqual(2);
    expect(d.actionsToday).toBeGreaterThanOrEqual(1);
    expect(d.personas).toHaveLength(10);
    expect(d.personas.find((p: any) => p.type === "reply_assistant")!.registered).toBe(1);
    expect(d.topTools.length).toBeGreaterThanOrEqual(1);
    expect(typeof d.seed).toBe("number");
    expect(d.summary).toContain("agent");
  });
});
