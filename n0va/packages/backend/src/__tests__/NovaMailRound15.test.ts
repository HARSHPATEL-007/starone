import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailIntegrationService, CONNECTORS } from "../services/MailIntegrationService";
import { MailMigrationService, MIGRATION_PROVIDERS, MIGRATION_MODES } from "../services/MailMigrationService";

const integration = new MailIntegrationService();
const migration = new MailMigrationService();
const T = "nova-mail15";
const MB = "mb_mig15";
const SOURCE = "alice@old.io";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const seed = `gmail|${SOURCE}|${MB}`;
const expectedTotal = Math.round(1200 + (hashStr(seed + "|total") % 3800));
const expectedImport = Math.min(expectedTotal, 12 + (hashStr(seed + "|import_count") % 18));
const expectedFail = hashStr(seed + "|fail_count") % 3;
const expectedImported = expectedImport - 1 - expectedFail;
const dedupeId0 = `mig_gmail_0_${hashStr(`${seed}|msg|0`).toString(36)}`;

let connGmail = "";
let connDrive = "";
let connCrm = "";
let connNotion = "";
let migId = "";

beforeAll(() => {
  DataStore.mem().insert("mailboxes", {
    _id: MB, tenantId: T, name: "Mig Inbox", type: "work", email: "mig@r15.io", plan: "business",
    quotaBytes: 10 * 1024 * 1024 * 1024, usedBytes: 0, status: "active",
  });
  DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: MB, threadId: "thr_dup15", messageId: dedupeId0,
    from: { name: "Dup", email: "dup@old.io" }, to: [{ name: "Mig", email: "mig@r15.io" }],
    subject: "Already here", body: "dupe", folder: "inbox", labels: [], read: true,
    starred: false, attachments: [], receivedAt: new Date().toISOString(), sentAt: null,
    importance: "normal", flags: ["imported"], ai: {},
  });
  connGmail = integration.connectConnector(T, { connectorId: "gmail", mailboxId: MB }).connectionId;
  connDrive = integration.connectConnector(T, { connectorId: "drive", mailboxId: MB }).connectionId;
  connCrm = integration.connectConnector(T, { connectorId: "crm", mailboxId: MB }).connectionId;
  connNotion = integration.connectConnector(T, { connectorId: "notion", mailboxId: MB }).connectionId;
});

describe("OAuth 2.0 lifecycle", () => {
  it("oauthStart returns an authorization URL with state and scopes", () => {
    const r = integration.oauthStart(T, connGmail);
    expect(r.authorizationUrl).toContain("https://gmail.auth.n0va.io/authorize");
    expect(r.authorizationUrl).toContain(`state=${r.state}`);
    expect(r.state).toMatch(/^st_/);
    expect(r.scopes).toContain("mail.read");
    expect(r.expiresInSeconds).toBe(600);
    expect(r.summary).toContain("Open the authorization URL");
    const s = integration.oauthStatus(T, connGmail);
    expect(s.pendingAuth).toBe(true);
    expect(integration.getConnectionPublic(T, connGmail).status).toBe("needs_auth");
  });

  it("throws for unknown connections", () => {
    expect(() => integration.oauthStart(T, "nope")).toThrow(/not found/);
    expect(() => integration.oauthStatus(T, "nope")).toThrow(/not found/);
  });

  it("callback requires a code", () => {
    expect(() => integration.oauthCallback(T, connGmail, { state: "st_whatever" })).toThrow(/code is required/);
  });

  it("callback rejects a state mismatch", () => {
    expect(() => integration.oauthCallback(T, connGmail, { code: "abc", state: "st_wrong" })).toThrow(/State mismatch/);
  });

  it("callback rejects when no authorization was started", () => {
    const fresh = integration.connectConnector(T, { connectorId: "zoom", mailboxId: MB }).connectionId;
    expect(() => integration.oauthCallback(T, fresh, { code: "abc", state: "st_zoom" })).toThrow(/No pending authorization/);
  });

  it("callback with a valid code+state connects and issues tokens", () => {
    const start = integration.oauthStart(T, connGmail);
    const r = integration.oauthCallback(T, connGmail, { code: "auth_code_xyz", state: start.state });
    expect(r.status).toBe("connected");
    expect(r.accessToken).toMatch(/^oat_/);
    expect(r.summary).toContain("scopes granted");
    expect(new Date(r.tokenExpiresAt).getTime()).toBeGreaterThan(Date.now());
    const conn = integration.getConnectionPublic(T, connGmail);
    expect(conn.status).toBe("connected");
    expect(conn.oauthAuthorized).toBe(true);
  });

  it("oauthStatus reflects authorization state", () => {
    const s = integration.oauthStatus(T, connGmail);
    expect(s.authorized).toBe(true);
    expect(s.expired).toBe(false);
    expect(s.grantedScope).toContain("mail.read");
    expect(s.expiresInHours).toBeGreaterThanOrEqual(0);
    expect(s.summary).toContain("authorized");
  });

  it("oauthRefresh renews the token without a new authorization", () => {
    const before = new Date(integration.oauthStatus(T, connGmail).tokenExpiresAt).getTime();
    const r = integration.oauthRefresh(T, connGmail);
    expect(r.status).toBe("connected");
    expect(r.summary).toContain("refreshed");
    const after = new Date(integration.oauthStatus(T, connGmail).tokenExpiresAt).getTime();
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it("oauthRefresh throws when no refresh token exists", () => {
    const pend = integration.connectConnector(T, { connectorId: "teams", mailboxId: MB }).connectionId;
    integration.oauthStart(T, pend);
    expect(() => integration.oauthRefresh(T, pend)).toThrow(/No refresh token/);
  });

  it("oauthRevoke disconnects and clears tokens", () => {
    const r = integration.oauthRevoke(T, connGmail);
    expect(r.status).toBe("disconnected");
    expect(r.summary).toContain("revoked");
    const s = integration.oauthStatus(T, connGmail);
    expect(s.authorized).toBe(false);
    expect(s.tokenExpiresAt).toBeNull();
  });

  it("revoked connection can re-authorize from scratch", () => {
    const start = integration.oauthStart(T, connGmail);
    const r = integration.oauthCallback(T, connGmail, { code: "code2", state: start.state });
    expect(r.status).toBe("connected");
  });
});

describe("new provider actions", () => {
  it("share_link creates a provider share URL", () => {
    const r = integration.runAction(T, connDrive, "share_link", { name: "deck.pdf" });
    expect(r.shareId).toMatch(/^shr_/);
    expect(r.shareUrl).toContain("drive.n0va.link");
    expect(["view", "comment"]).toContain(r.permission);
    expect(r.summary).toContain("deck.pdf");
  });

  it("update_crm_deal moves a deal through the pipeline", () => {
    const r = integration.runAction(T, connCrm, "update_crm_deal", { dealId: "deal_123", value: 5000 });
    expect(r.dealId).toBe("deal_123");
    expect(["proposal", "negotiation", "won"]).toContain(r.stage);
    expect(r.value).toBe(5000);
    expect(r.summary).toContain("deal_123");
  });

  it("create_doc creates a document", () => {
    const r = integration.runAction(T, connNotion, "create_doc", { title: "Meeting notes" });
    expect(r.docId).toMatch(/^doc_/);
    expect(r.pageUrl).toContain("notion.n0va.link");
    expect(r.summary).toContain("Meeting notes");
  });

  it("connectors advertise the new actions; others reject them", () => {
    const drive = CONNECTORS.find((c) => c.id === "drive") as any;
    expect(drive.actions).toContain("share_link");
    expect(drive.actions).toContain("create_doc");
    const crm = CONNECTORS.find((c) => c.id === "crm") as any;
    expect(crm.actions).toContain("update_crm_deal");
    expect(() => integration.runAction(T, connGmail, "share_link", {})).toThrow(/does not support action/);
    expect(() => integration.runAction(T, connDrive, "schedule_meeting", {})).toThrow(/does not support action/);
  });

  it("catalog reflects the extended action lists", () => {
    const cat = integration.connectorCatalog(T);
    const g = cat.connectors.find((c: any) => c.id === "drive");
    expect(g.actions).toHaveLength(3);
    expect(g.actions).toContain("create_doc");
  });
});

describe("migration start", () => {
  it("throws on unknown provider / mode / mailbox", () => {
    expect(() => migration.startMigration(T, { provider: "aol", mailboxId: MB, sourceEmail: SOURCE })).toThrow(/Unknown provider/);
    expect(() => migration.startMigration(T, { provider: "gmail", mailboxId: MB })).toThrow(/sourceEmail is required/);
    expect(() => migration.startMigration(T, { provider: "gmail", sourceEmail: SOURCE })).toThrow(/mailboxId is required/);
    expect(() => migration.startMigration(T, { provider: "gmail", mailboxId: "nope", sourceEmail: SOURCE })).toThrow(/not found/);
    expect(() => migration.startMigration(T, { provider: "gmail", mailboxId: MB, sourceEmail: SOURCE, mode: "everything" })).toThrow(/Unknown mode/);
  });

  it("queues a full migration with per-folder estimates that sum to the total", () => {
    const r = migration.startMigration(T, { provider: "gmail", mailboxId: MB, sourceEmail: SOURCE });
    migId = r.migrationId;
    expect(r.status).toBe("scanning");
    expect(r.totalMessages).toBe(expectedTotal);
    expect(r.providerName).toBe("Google Workspace (Gmail)");
    const sum = Object.values(r.perFolder as Record<string, number>).reduce((s: number, n: number) => s + n, 0);
    expect(sum).toBe(expectedTotal);
    expect(Object.keys(r.perFolder)).toHaveLength(5);
  });

  it("last_30_days mode scales the estimate down", () => {
    const r = migration.startMigration(T, { provider: "outlook", mailboxId: MB, sourceEmail: "bob@old365.io", mode: "last_30_days" });
    expect(r.mode).toBe("last_30_days");
    expect(r.totalMessages).toBeLessThan(500);
    expect(MIGRATION_MODES).toContain("last_30_days");
  });

  it("catalog exposes the provider list", () => {
    expect(MIGRATION_PROVIDERS.map((p) => p.id)).toEqual(["gmail", "outlook", "yahoo", "imap"]);
  });
});

describe("scan and preview", () => {
  it("preview before scan throws", () => {
    expect(() => migration.migrationPreview(T, migId)).toThrow(/Scan the migration/);
  });

  it("scan maps folders with sizes", () => {
    const r = migration.migrationScan(T, migId);
    expect(r.status).toBe("mapped");
    expect(r.folders).toHaveLength(5);
    const sum = r.folders.reduce((s: number, f: any) => s + f.sizeBytes, 0);
    expect(sum).toBe(r.estimatedBytes);
    expect(r.estimatedMb).toMatch(/^\d+\.\d$/);
    const st = migration.migrationStatus(T, migId);
    expect(st.progressPct).toBe(60);
  });

  it("preview shows samples and folder mapping (junk/bulk → spam)", () => {
    const r = migration.migrationPreview(T, migId);
    expect(r.samples).toHaveLength(5);
    expect(r.samples[0].messageId).toMatch(/^mig_gmail_0_/);
    expect(r.folderMapping).toHaveLength(5);
    expect(r.dedupeEstimate).toBe(1);
  });
});

describe("import", () => {
  it("imports deterministically, dedupes the pre-existing message and skips failures", () => {
    const r = migration.runMigration(T, migId);
    expect(r.status).toBe("completed");
    expect(r.imported).toBe(expectedImported);
    expect(r.failed).toBe(expectedFail);
    expect(r.dedupeSkipped).toBe(1);
    expect(r.storageBytes).toBeGreaterThan(0);
    const total = Object.values(r.perFolder as Record<string, number>).reduce((s: number, n: number) => s + n, 0);
    expect(total).toBe(expectedImported);
    const imported = DataStore.mem().find("messages", (m: any) => m.tenantId === T && m.importedFrom === "gmail" && m.migrationId === migId);
    expect(imported).toHaveLength(expectedImported);
    expect(imported.every((m: any) => m.flags.includes("imported"))).toBe(true);
    expect(imported.some((m: any) => m.folder === "inbox")).toBe(true);
  });

  it("re-import throws once completed", () => {
    expect(() => migration.runMigration(T, migId)).toThrow(/already completed/);
  });

  it("status reports the batch run completed with remaining source messages", () => {
    const s = migration.migrationStatus(T, migId);
    expect(s.progressPct).toBe(Math.min(100, Math.round((expectedImported / expectedTotal) * 100)));
    expect(s.remaining).toBe(expectedTotal - expectedImported);
  });

  it("listMigrations returns mapped rows", () => {
    const rows = migration.listMigrations(T);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const done = rows.find((r: any) => r.migrationId === migId) as any;
    expect(done.migrationId).toBe(migId);
    expect(done.providerName).toBe("Google Workspace (Gmail)");
    expect(done.status).toBe("completed");
    expect(done.imported).toBe(expectedImported);
  });

  it("migrationSummary aggregates stats", () => {
    const s = migration.migrationSummary(T);
    expect(s.total).toBe(2);
    expect(s.completed).toBe(1);
    expect(s.importedTotal).toBe(expectedImported);
    expect(s.storageMb).toMatch(/^\d+\.\d$/);
    const gmail = s.providers.find((p: any) => p.providerId === "gmail") as any;
    expect(gmail.count).toBe(1);
  });

  it("migrationLog records the lifecycle", () => {
    const log = migration.migrationLog(T);
    const cats = log.map((l: any) => l.category);
    expect(cats).toContain("migration_started");
    expect(cats).toContain("migration_scanned");
    expect(cats).toContain("migration_imported");
  });

  it("deleteMigration removes the record and logs it", () => {
    const r = migration.deleteMigration(T, migId);
    expect(r.summary).toContain("removed");
    expect(migration.listMigrations(T).some((m: any) => m.migrationId === migId)).toBe(false);
    expect(migration.migrationLog(T).some((l: any) => l.category === "migration_deleted")).toBe(true);
    expect(() => migration.migrationStatus(T, migId)).toThrow(/not found/);
  });
});
