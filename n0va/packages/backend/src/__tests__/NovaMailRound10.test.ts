import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailboxService } from "../services/MailboxService";
import { MailIntegrationService, CONNECTORS, BRIDGE_EVENTS, INTEGRATION_CATEGORIES } from "../services/MailIntegrationService";

const mailboxes = new MailboxService();
const integration = new MailIntegrationService();
const T = "nova-mail10";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

let mbId = "";
let connGmail = "";
let connSlack = "";

function seedMessage(partial: any) {
  DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: partial.mailboxId || mbId, threadId: partial.threadId || `thr_${partial._id}`,
    messageId: `<${partial._id}@r10.io>`,
    from: partial.from || { name: "Nova", email: "nova@r10.io" },
    to: partial.to || [{ name: "Nova", email: "nova@r10.io" }],
    subject: partial.subject || "No subject", body: partial.body || "",
    folder: partial.folder || "inbox", labels: partial.labels || [], read: partial.read ?? false,
    starred: partial.starred ?? false, attachments: partial.attachments || [],
    receivedAt: partial.receivedAt || new Date().toISOString(), sentAt: partial.sentAt,
    importance: partial.importance || "normal", flags: partial.flags || [],
    ai: partial.ai || {},
    ...partial,
  });
}

beforeAll(() => {
  mbId = mailboxes.createMailbox(T, { name: "Nova Round 10", type: "work", email: "nova@r10.io", plan: "business" }).mailboxId;
  DataStore.mem().insert("mail_contacts", {
    tenantId: T, name: "Priya", email: "priya@r10.io", role: "vendor", company: "Priya Co", tags: ["vendor"], status: "active",
  });
  DataStore.mem().insert("mail_contacts", {
    tenantId: T, name: "Bob", email: "bob@r10.io", role: "customer", company: "Bob Inc", tags: ["customer"], status: "active",
  });
  seedMessage({
    _id: "r10_lead", from: { name: "New Lead", email: "lead@prospect.io" },
    subject: "Interested in your product", body: "Please send a quote.",
  });
  seedMessage({
    _id: "r10_attach", from: { name: "Docs", email: "docs@send.io" },
    subject: "Contract draft", body: "See attached.",
    attachments: [{ name: "contract.pdf", type: "pdf", sizeBytes: 250000 }],
  });

  connGmail = integration.connectConnector(T, { connectorId: "gmail", mailboxId: mbId }).connectionId;
  connSlack = integration.connectConnector(T, { connectorId: "slack", mailboxId: mbId }).connectionId;
});

describe("connector catalog", () => {
  it("exposes 10 connectors across 6 categories", () => {
    const cat = integration.connectorCatalog(T);
    expect(cat.connectors).toHaveLength(10);
    expect(cat.categories).toHaveLength(6);
    expect(CONNECTORS.map((c) => c.id)).toContain("gmail");
    expect(CONNECTORS.map((c) => c.id)).toContain("notion");
    expect(INTEGRATION_CATEGORIES).toContain("storage");
  });

  it("catalog reflects installed connection status", () => {
    const cat = integration.connectorCatalog(T);
    const gmail = cat.connectors.find((c: any) => c.id === "gmail");
    const slack = cat.connectors.find((c: any) => c.id === "slack");
    expect(gmail.status).toBe("connected");
    expect(gmail.connectedCount).toBe(1);
    expect(slack.status).toBe("connected");
    const dropbox = cat.connectors.find((c: any) => c.id === "dropbox");
    expect(dropbox.status).toBe("disconnected");
    expect(dropbox.connectedCount).toBe(0);
  });
});

describe("connect / disconnect lifecycle", () => {
  it("throws on unknown connector", () => {
    expect(() => integration.connectConnector(T, { connectorId: "myspace", mailboxId: mbId })).toThrow(/Unknown connector/);
  });

  it("throws when mailboxId is missing or invalid", () => {
    expect(() => integration.connectConnector(T, { connectorId: "zoom" })).toThrow(/mailboxId is required/);
    expect(() => integration.connectConnector(T, { connectorId: "zoom", mailboxId: "nope" })).toThrow(/not found/);
  });

  it("returns existing connection instead of duplicating", () => {
    const again = integration.connectConnector(T, { connectorId: "gmail", mailboxId: mbId });
    expect(again.connectionId).toBe(connGmail);
    expect(again.summary).toContain("Already connected");
    expect(integration.listConnections(T)).toHaveLength(2);
  });

  it("lists connections with mapped ids and connector names", () => {
    const conns = integration.listConnections(T);
    expect(conns).toHaveLength(2);
    const g = conns.find((c: any) => c.connectorId === "gmail");
    expect(g.connectionId).toBeDefined();
    expect(g.connectorName).toBe("Gmail");
    expect(g.status).toBe("connected");
    expect(g.scopes).toContain("mail.read");
    expect(g.mailboxId).toBe(mbId);
  });

  it("authorizes a needs_auth connection", () => {
    const conn = integration.connectConnector(T, { connectorId: "notion", mailboxId: mbId });
    DataStore.mem().update("mail_connections", (c: any) => c._id === conn.connectionId, { status: "needs_auth", error: "token_expired" });
    const r = integration.authorizeConnector(T, conn.connectionId);
    expect(r.status).toBe("connected");
    expect(r.summary).toContain("authorized");
    const refreshed = integration.getConnectionPublic(T, conn.connectionId);
    expect(refreshed.status).toBe("connected");
    expect(refreshed.error).toBeNull();
  });

  it("authorize on a connected connection is a no-op", () => {
    const r = integration.authorizeConnector(T, connGmail);
    expect(r.status).toBe("connected");
    expect(r.summary).toContain("nothing to authorize");
  });

  it("refreshes a session and renews the token", () => {
    const r = integration.refreshConnector(T, connSlack);
    expect(r.summary).toContain("renewed");
    const conn = integration.getConnectionPublic(T, connSlack);
    expect(conn.tokenExpiresAt).toBeTruthy();
  });

  it("refresh throws for disconnected connections", () => {
    const conn = integration.connectConnector(T, { connectorId: "drive", mailboxId: mbId });
    integration.disconnectConnector(T, conn.connectionId);
    expect(() => integration.refreshConnector(T, conn.connectionId)).toThrow(/disconnected/);
  });

  it("updates connection settings", () => {
    const r = integration.updateConnection(T, connGmail, { settings: { autoSync: false, notifyOnNew: false } });
    expect(r.settings.autoSync).toBe(false);
    expect(r.settings.notifyOnError).toBe(true);
  });

  it("disconnects a connector and logs it", () => {
    const conn = integration.connectConnector(T, { connectorId: "dropbox", mailboxId: mbId });
    const r = integration.disconnectConnector(T, conn.connectionId);
    expect(r.status).toBe("disconnected");
    expect(integration.getConnectionPublic(T, conn.connectionId).status).toBe("disconnected");
    const log = integration.integrationLog(T);
    expect(log.some((l: any) => l.category === "connection_disconnected" && l.detail.includes("Dropbox"))).toBe(true);
  });
});

describe("sync jobs", () => {
  it("runs a deterministic sync and creates a job", () => {
    const before = integration.getConnectionPublic(T, connGmail).syncCount;
    const r = integration.syncNow(T, connGmail);
    const expectedFailed = hashStr(`${connGmail}|sync`) % 11 === 0;
    if (expectedFailed) {
      expect(r.status).toBe("failed");
      expect(r.error).toBeTruthy();
      expect(r.items).toBe(0);
    } else {
      expect(r.status).toBe("success");
      expect(r.items).toBeGreaterThan(0);
      expect(r.items).toBeLessThanOrEqual(14);
      expect(r.summary).toContain("synced");
    }
    const after = integration.getConnectionPublic(T, connGmail);
    expect(after.syncCount).toBe(before + 1);
    expect(after.lastSyncAt).toBeTruthy();
    expect(after.lastSyncStatus).toBe(r.status);
  });

  it("sync throws for non-connected connections", () => {
    const conn = integration.connectConnector(T, { connectorId: "teams", mailboxId: mbId });
    integration.disconnectConnector(T, conn.connectionId);
    expect(() => integration.syncNow(T, conn.connectionId)).toThrow(/authorize it before syncing/);
  });

  it("sync throws for unknown connections", () => {
    expect(() => integration.syncNow(T, "nope")).toThrow(/not found/);
  });

  it("lists sync history sorted desc with connector names", () => {
    const r = integration.syncHistory(T);
    expect(r.total).toBeGreaterThanOrEqual(1);
    const first = r.jobs[0];
    expect(first.connectorName).toBeDefined();
    expect(first.kind).toMatch(/pull|push/);
    const filtered = integration.syncHistory(T, connGmail);
    expect(filtered.jobs.every((j: any) => j.connectionId === connGmail)).toBe(true);
  });

  it("syncStatus reports connected connectors with overdue flag", () => {
    const r = integration.syncStatus(T);
    expect(r.connectors.length).toBeGreaterThanOrEqual(2);
    const g = r.connectors.find((c: any) => c.connectionId === connGmail);
    expect(g).toBeDefined();
    expect(g.autoSync).toBe(false);
    expect(g.itemsSynced).toBeGreaterThan(0);
    expect(typeof g.overdue).toBe("boolean");
  });
});

describe("integration actions", () => {
  it("pushes a message to CRM as a lead", () => {
    const r = integration.runAction(T, connGmail.endsWith("x") ? connGmail : connGmail, "sync_contacts", {});
    expect(r.summary).toContain("contact(s) pushed");
    const lead = integration.runAction(T, integration.connectConnector(T, { connectorId: "crm", mailboxId: mbId }).connectionId, "push_to_crm", { messageId: DataStore.mem().findOne("messages", (m: any) => (m as any)._id === "r10_lead")?._id as any });
    expect(lead.leadId).toBeDefined();
    expect(lead.stage).toBe("new");
    expect(lead.contactEmail).toBe("lead@prospect.io");
    expect(lead.score).toBeGreaterThanOrEqual(20);
    expect(lead.score).toBeLessThanOrEqual(89);
  });

  it("posts to chat and forwards to channel", () => {
    const post = integration.runAction(T, connSlack, "post_to_chat", { channel: "alerts", text: "Deploy done" });
    expect(post.ts).toBeDefined();
    expect(post.channel).toBe("alerts");
    expect(post.summary).toContain("#alerts");
    const fwd = integration.runAction(T, connSlack, "forward_to_channel", { channel: "ops" });
    expect(fwd.summary).toContain("#ops");
  });

  it("uploads a message attachment", () => {
    const r = integration.runAction(T, integration.connectConnector(T, { connectorId: "drive", mailboxId: mbId }).connectionId, "upload_file", { messageId: DataStore.mem().findOne("messages", (m: any) => (m as any)._id === "r10_attach")?._id as any });
    expect(r.fileId).toBeDefined();
    expect(r.name).toBe("contract.pdf");
    expect(r.sizeBytes).toBe(250000);
  });

  it("schedules meetings and creates events", () => {
    const zoom = integration.connectConnector(T, { connectorId: "zoom", mailboxId: mbId }).connectionId;
    const mtg = integration.runAction(T, zoom, "schedule_meeting", { title: "QBR" });
    expect(mtg.meetingId).toBeDefined();
    expect(mtg.joinUrl).toContain("zoom.n0va.link");
    expect(mtg.durationMin).toBeGreaterThanOrEqual(30);
    const cal = integration.connectConnector(T, { connectorId: "calendar", mailboxId: mbId }).connectionId;
    const evt = integration.runAction(T, cal, "create_event", { title: "Sync" });
    expect(evt.eventId).toBeDefined();
    expect(evt.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("creates tasks from emails", () => {
    const notion = integration.connectConnector(T, { connectorId: "notion", mailboxId: mbId }).connectionId;
    const r = integration.runAction(T, notion, "create_task", { title: "Follow up with Priya" });
    expect(r.taskId).toBeDefined();
    expect(r.status).toBe("todo");
  });

  it("throws for unsupported actions on a connector", () => {
    expect(() => integration.runAction(T, connSlack, "push_to_crm", {})).toThrow(/does not support action/);
  });

  it("throws for unknown actions and unknown connections", () => {
    expect(() => integration.runAction(T, connGmail, "beam_me_up", {})).toThrow(/does not support action/);
    expect(() => integration.runAction(T, "nope", "sync_mail", {})).toThrow(/not found/);
  });

  it("tracks actionsRun on the connection", () => {
    const conn = integration.getConnectionPublic(T, connSlack);
    expect(conn.actionsRun).toBeGreaterThanOrEqual(2);
    const log = integration.integrationLog(T);
    expect(log.some((l: any) => l.category === "action_post_to_chat")).toBe(true);
  });
});

describe("alerts & overview", () => {
  it("flags needs_auth and error connections", () => {
    const conn = integration.connectConnector(T, { connectorId: "outlook", mailboxId: mbId });
    DataStore.mem().update("mail_connections", (c: any) => c._id === conn.connectionId, { status: "needs_auth" });
    const bad = integration.connectConnector(T, { connectorId: "teams2x" === "teams2x" ? "dropbox" : "dropbox", mailboxId: mbId });
    DataStore.mem().update("mail_connections", (c: any) => c._id === bad.connectionId, { status: "error", error: "rate limited" });
    const r = integration.integrationAlerts(T);
    expect(r.total).toBeGreaterThanOrEqual(2);
    expect(r.alerts.some((a: any) => a.text.includes("re-authorization"))).toBe(true);
    expect(r.alerts.some((a: any) => a.text.includes("rate limited"))).toBe(true);
  });

  it("flags stale connected connections without recent sync", () => {
    const conn = integration.connectConnector(T, { connectorId: "calendar", mailboxId: mbId });
    DataStore.mem().update("mail_connections", (c: any) => c._id === conn.connectionId, {
      lastSyncAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    });
    const r = integration.integrationAlerts(T);
    expect(r.alerts.some((a: any) => a.text.includes("hasn't synced in over 24h"))).toBe(true);
  });

  it("reports healthy when there are no alerts for fresh connections", () => {
    const conn = integration.connectConnector(T, { connectorId: "gmail2x" === "gmail2x" ? "teams" : "teams", mailboxId: mbId });
    integration.syncNow(T, conn.connectionId);
    const r = integration.integrationAlerts(T);
    const teams = r.alerts.find((a: any) => a.connectionId === conn.connectionId);
    expect(teams).toBeUndefined();
  });

  it("integrationOverview merges stats, connections, alerts and log", () => {
    const o = integration.integrationOverview(T);
    expect(o.totalConnections).toBeGreaterThanOrEqual(6);
    expect(o.connected).toBeGreaterThanOrEqual(5);
    expect(o.itemsSynced).toBeGreaterThan(0);
    expect(o.actionsRun).toBeGreaterThan(0);
    expect(o.catalog.connectors).toHaveLength(10);
    expect(o.connections.length).toBe(o.totalConnections);
    expect(o.summary).toContain("connection(s) active");
    expect(o.seed).toBeGreaterThan(0);
  });

  it("integrationDashboard is an alias of overview", () => {
    const d = integration.integrationDashboard(T);
    expect(d.totalConnections).toBe(integration.integrationOverview(T).totalConnections);
  });

  it("logs integration activity", () => {
    const log = integration.integrationLog(T);
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].at).toBeDefined();
    const filtered = integration.integrationLog(T, "slack");
    expect(filtered.every((l: any) => l.detail.includes("Slack") || l.connectionId === connSlack || !l.connectionId)).toBe(true);
  });
});

describe("integration bridges (§9 ↔ §4.4)", () => {
  it("exposes bridge events from the mail event catalog", () => {
    expect(BRIDGE_EVENTS).toContain("mail.received");
    expect(BRIDGE_EVENTS).toContain("mail.sent");
    expect(BRIDGE_EVENTS).toHaveLength(7);
  });

  it("creates a bridge mapping an event to a connector action", () => {
    const r = integration.createBridge(T, { name: "Slack alerts", event: "mail.received", connectorId: "slack", action: "post_to_chat", target: "alerts" });
    expect(r.bridgeId).toBeDefined();
    expect(r.summary).toContain("mail.received");
    const bridges = integration.listBridges(T);
    expect(bridges).toHaveLength(1);
    expect(bridges[0].connectorName).toBe("Slack");
    expect(bridges[0].triggerCount).toBe(0);
  });

  it("validates bridge events and connector actions", () => {
    expect(() => integration.createBridge(T, { name: "bad", event: "mail.ufo", connectorId: "slack", action: "post_to_chat" })).toThrow(/Unknown event/);
    expect(() => integration.createBridge(T, { name: "bad2", event: "mail.received", connectorId: "gmail", action: "post_to_chat" })).toThrow(/does not support action/);
    expect(() => integration.createBridge(T, { name: "", event: "mail.received", connectorId: "slack", action: "post_to_chat" })).toThrow(/Bridge name is required/);
  });

  it("fires a bridge and increments trigger count", () => {
    const bridge = integration.listBridges(T)[0];
    const r = integration.triggerBridge(T, bridge.bridgeId);
    expect(r.triggerCount).toBe(1);
    expect(r.result.summary).toContain("#alerts");
    const after = integration.listBridges(T)[0];
    expect(after.triggerCount).toBe(1);
    expect(after.lastTriggerAt).toBeTruthy();
  });

  it("refuses to fire a bridge without an active connection", () => {
    const r = integration.createBridge(T, { name: "Lonely", event: "mail.sent", connectorId: "outlook", action: "sync_mail" });
    expect(() => integration.triggerBridge(T, r.bridgeId)).toThrow(/No active outlook connection/);
  });

  it("deletes bridges", () => {
    const r = integration.createBridge(T, { name: "Temp", event: "mail.spam_detected", connectorId: "slack", action: "forward_to_channel" });
    const del = integration.deleteBridge(T, r.bridgeId);
    expect(del.summary).toContain("deleted");
    expect(integration.listBridges(T)).toHaveLength(1);
    expect(() => integration.deleteBridge(T, r.bridgeId)).toThrow(/not found/);
  });
});
