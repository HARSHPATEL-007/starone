import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailAliasService } from "../services/MailAliasService";
import { MailContactBulkService } from "../services/MailContactBulkService";

const alias = new MailAliasService();
const bulk = new MailContactBulkService();

const T = "nova-mail22";
const TB = "nova-mail22b";
const TC = "nova-mail22c";
const TD = "nova-mail22d";
const TE = "nova-mail22e";

beforeAll(() => {
  DataStore.mem().insert("mailboxes", {
    _id: "mb_r22_main", tenantId: T, name: "Ani HQ", type: "work", email: "ani@r22.io",
    plan: "business", quotaBytes: 1024 * 1024 * 1024 * 10, usedBytes: 0, status: "active",
  });
  DataStore.mem().insert("mailboxes", {
    _id: "mb_r22_team", tenantId: T, name: "Team Inbox", type: "work", email: "team@r22.io",
    plan: "business", quotaBytes: 1024 * 1024 * 1024 * 10, usedBytes: 0, status: "active",
  });
  DataStore.mem().insert("mailboxes", {
    _id: "mb_r22b_main", tenantId: TB, name: "R22B Box", type: "work", email: "b@r22b.io",
    plan: "free", quotaBytes: 1024 * 1024 * 1024, usedBytes: 0, status: "active",
  });
  DataStore.mem().insert("mailboxes", {
    _id: "mb_r22c_main", tenantId: TC, name: "Merge Box", type: "work", email: "c@r22c.io",
    plan: "free", quotaBytes: 1024 * 1024 * 1024, usedBytes: 0, status: "active",
  });
  DataStore.mem().insert("mail_contacts", {
    _id: "ct_r22_ada", tenantId: TB, name: "Ada Lovelace", email: "ada@r22b.io",
    tags: ["team"], company: "Analytical Engines", createdAt: "2026-01-05T00:00:00.000Z",
  });
  DataStore.mem().insert("mail_contacts", {
    _id: "ct_r22_keep", tenantId: TC, name: "Kept One", email: "keep@r22c.io",
    tags: ["a"], notes: "keep note", createdAt: "2026-01-01T00:00:00.000Z",
  });
  DataStore.mem().insert("mail_contacts", {
    _id: "ct_r22_merge", tenantId: TC, name: "Merge Two", email: "merge@r22c.io",
    tags: ["b"], notes: "merge note", createdAt: "2026-01-02T00:00:00.000Z",
  });
  DataStore.mem().insert("mail_contacts", {
    _id: "ct_r22_da", tenantId: TD, name: "Dup Old", email: "dup@r22d.io", createdAt: "2026-01-01T00:00:00.000Z",
  });
  DataStore.mem().insert("mail_contacts", {
    _id: "ct_r22_db", tenantId: TD, name: "Dup New", email: "dup@r22d.io", createdAt: "2026-06-01T00:00:00.000Z",
  });
  DataStore.mem().insert("mail_contacts", {
    _id: "ct_r22_1", tenantId: TE, name: "One", email: "one@r22e.io", tags: ["hot"], createdAt: "2026-02-01T00:00:00.000Z",
  });
  DataStore.mem().insert("mail_contacts", {
    _id: "ct_r22_2", tenantId: TE, name: "Two", email: "two@r22e.io", tags: ["team"], createdAt: "2026-02-01T00:00:00.000Z",
  });
  DataStore.mem().insert("mail_contacts", {
    _id: "ct_r22_3", tenantId: TE, name: "Three", email: "two@r22e.io", tags: [], createdAt: "2026-03-01T00:00:00.000Z",
  });
  const msgs = [
    { _id: "m_r22_1", tenantId: TC, mailboxId: "mb_r22c_main", folder: "inbox", subject: "Re: merge 1", from: { name: "Merge Two", email: "merge@r22c.io" }, to: [{ email: "c@r22c.io" }], receivedAt: "2026-01-03T00:00:00.000Z" },
    { _id: "m_r22_2", tenantId: TC, mailboxId: "mb_r22c_main", folder: "inbox", subject: "Re: merge 2", from: { name: "Merge Two", email: "merge@r22c.io" }, to: [{ email: "c@r22c.io" }], receivedAt: "2026-01-04T00:00:00.000Z" },
    { _id: "m_r22_3", tenantId: TC, mailboxId: "mb_r22c_main", folder: "sent", subject: "Fwd: merge 3", from: { email: "c@r22c.io" }, to: [{ email: "merge@r22c.io", name: "Merge Two" }], sentAt: "2026-01-05T00:00:00.000Z" },
  ];
  for (const m of msgs) DataStore.mem().insert("messages", m as any);
});

describe("aliases — create & list", () => {
  it("rejects invalid addresses and unknown mailboxes", () => {
    expect(() => alias.createAlias(T, { address: "not-an-email", mailboxId: "mb_r22_main" })).toThrow(/not a valid email address/);
    expect(() => alias.createAlias(T, { address: "x@unknown.io", mailboxId: "nope" })).toThrow(/not found/);
    expect(() => alias.createAlias(T, {})).toThrow(/address and mailboxId are required/);
  });

  it("creates aliases and rejects duplicates", () => {
    const a1 = alias.createAlias(T, { address: "Sales@r22.io", mailboxId: "mb_r22_main" });
    expect(a1.aliasId).toBeTruthy();
    expect(a1.address).toBe("sales@r22.io");
    expect(a1.mailboxName).toBe("Ani HQ");
    expect(a1.status).toBe("active");
    const a2 = alias.createAlias(T, { address: "hello@r22.io", mailboxId: "mb_r22_team", label: "Catch-all" });
    expect(a2.mailboxName).toBe("Team Inbox");
    expect(a2.label).toBe("Catch-all");
    expect(() => alias.createAlias(T, { address: "SALES@r22.io", mailboxId: "mb_r22_main" })).toThrow(/already exists/);
  });

  it("lists aliases with totals and active counts", () => {
    const list = alias.listAliases(T);
    expect(list.total).toBe(2);
    expect(list.active).toBe(2);
    expect(list.aliases.map((a: any) => a.address)).toEqual(expect.arrayContaining(["sales@r22.io", "hello@r22.io"]));
    const filtered = alias.listAliases(T, { status: "paused" });
    expect(filtered.total).toBe(0);
  });
});

describe("aliases — lifecycle", () => {
  it("gets, toggles and deletes an alias", () => {
    const created = alias.createAlias(T, { address: "lifecycle@r22.io", mailboxId: "mb_r22_main" });
    const a1 = alias.getAlias(T, created.aliasId);
    expect(a1.address).toBe("lifecycle@r22.io");
    const paused = alias.toggleAlias(T, created.aliasId);
    expect(paused.status).toBe("paused");
    const resumed = alias.toggleAlias(T, created.aliasId);
    expect(resumed.status).toBe("active");
    const gone = alias.deleteAlias(T, created.aliasId);
    expect(gone.summary).toContain("deleted");
    expect(() => alias.getAlias(T, created.aliasId)).toThrow(/not found/);
  });
});

describe("aliases — recipient resolution", () => {
  it("resolves an active alias to its mailbox", () => {
    alias.createAlias(T, { address: "resolved@r22.io", mailboxId: "mb_r22_main" });
    const r = alias.resolveRecipient(T, "RESOLVED@r22.io");
    expect(r.resolved).toBe(true);
    expect(r.mailboxId).toBe("mb_r22_main");
    expect(r.primaryAddress).toBe("ani@r22.io");
  });

  it("reports a non-alias as unresolved", () => {
    const r = alias.resolveRecipient(T, "nobody@r22.io");
    expect(r.resolved).toBe(false);
    expect(r.summary).toContain("not an active alias");
  });
});

describe("aliases — forwarding", () => {
  it("rejects invalid targets and unknown mailboxes", () => {
    expect(() => alias.enableForwarding(T, "mb_r22_main", { target: "bad" })).toThrow(/not a valid email address/);
    expect(() => alias.enableForwarding(T, "nope", { target: "ok@x.io" })).toThrow(/not found/);
  });

  it("enables, gets, lists and disables forwarding", () => {
    const f = alias.enableForwarding(T, "mb_r22_main", { target: "backup@sec.io", mode: "move" });
    expect(f.forwardingId).toBeTruthy();
    expect(f.target).toBe("backup@sec.io");
    expect(f.mode).toBe("move");
    const get = alias.getForwarding(T, "mb_r22_main");
    expect(get.enabled).toBe(true);
    const upd = alias.enableForwarding(T, "mb_r22_main", { target: "new@backup.io" });
    expect(upd.mode).toBe("keep");
    const list = alias.listForwarding(T);
    expect(list.enabled).toBe(1);
    const off = alias.disableForwarding(T, "mb_r22_main");
    expect(off.enabled).toBe(false);
    expect(alias.getForwarding(T, "mb_r22_main").enabled).toBe(false);
  });
});

describe("aliases — dashboard & log", () => {
  it("exposes totals, forwarding and recent log events", () => {
    const dash = alias.aliasDashboard(T);
    expect(dash.active).toBeGreaterThanOrEqual(0);
    expect(dash.forwardingEnabled).toBeGreaterThanOrEqual(0);
    expect(dash.deliverability.score).toBeGreaterThanOrEqual(80);
    expect(dash.recentLog).toBeInstanceOf(Array);
    const log = alias.aliasLog(T, 50);
    expect(log.log.length).toBeGreaterThanOrEqual(4);
    expect(log.log[0]).toHaveProperty("category");
  });
});

describe("contacts bulk — import", () => {
  it("imports new rows, skips duplicates and flags invalid ones", () => {
    const r = bulk.importContacts(TB, {
      rows: [
        { name: "Newton", email: "newton@r22b.io" },
        { email: "boole@r22b.io", company: "Logic Co" },
        { email: "ada@r22b.io" },
        { email: "bad-email" },
      ],
      group: "vip",
    });
    expect(r.imported).toBe(2);
    expect(r.skipped).toBe(1);
    expect(r.invalid).toBe(1);
    expect(r.group).toBe("vip");
    const dup = DataStore.mem().findOne("mail_contacts", (c: any) => c.tenantId === TB && c.email === "ada@r22b.io");
    expect(dup.tags).toEqual(["team"]);
  });

  it("overwrite mode updates existing rows", () => {
    const r = bulk.importContacts(TB, { rows: [{ name: "Ada Brill", email: "ada@r22b.io" }], mode: "overwrite", group: "vip" });
    expect(r.imported).toBe(0);
    expect(r.updated).toBe(1);
    const dup = DataStore.mem().findOne("mail_contacts", (c: any) => c.tenantId === TB && c.email === "ada@r22b.io");
    expect(dup.name).toBe("Ada Brill");
    expect(dup.tags).toContain("vip");
  });

  it("throws on an empty import", () => {
    expect(() => bulk.importContacts(TB, { rows: [] })).toThrow(/At least one contact row is required/);
  });
});

describe("contacts bulk — export", () => {
  it("exports CSV contacts", () => {
    const r = bulk.exportContacts(TB, { format: "csv" });
    expect(r.format).toBe("csv");
    expect(r.filename).toBe("contacts.csv");
    expect(r.content).toContain("name,email,company,tags");
    expect(r.content).toContain('"Ada Brill","ada@r22b.io","Analytical Engines","team|vip"');
    expect(r.rows).toBe(3);
    expect(r.checksum).toMatch(/^sha256_/);
  });

  it("exports JSON contacts and filters by group", () => {
    const all = bulk.exportContacts(TB, { format: "json" });
    expect(all.format).toBe("json");
    expect(Array.isArray(JSON.parse(all.content))).toBe(true);
    const vip = bulk.exportContacts(TB, { format: "csv", group: "vip" });
    expect(vip.rows).toBe(3);
  });
});

describe("contacts bulk — merge & dedupe", () => {
  it("merges a contact into another and reassigns messages", () => {
    const r = bulk.mergeContacts(TC, { keepContactId: "ct_r22_keep", mergeContactId: "ct_r22_merge" });
    expect(r.messagesReassigned).toBe(3);
    expect(r.tags.sort()).toEqual(["a", "b"]);
    expect(DataStore.mem().findOne("mail_contacts", (c: any) => c._id === "ct_r22_merge")).toBeUndefined();
    const m1 = DataStore.mem().findOne("messages", (m: any) => m._id === "m_r22_1");
    expect(m1.from.email).toBe("keep@r22c.io");
    const m3 = DataStore.mem().findOne("messages", (m: any) => m._id === "m_r22_3");
    expect(m3.to[0].email).toBe("keep@r22c.io");
  });

  it("rejects merging a contact into itself", () => {
    expect(() => bulk.mergeContacts(TC, { keepContactId: "ct_r22_keep", mergeContactId: "ct_r22_keep" })).toThrow(/Cannot merge a contact into itself/);
  });

  it("dedupes duplicate emails keeping the newest", () => {
    const r = bulk.dedupeContacts(TD);
    expect(r.duplicates).toBe(1);
    expect(r.removed).toBe(1);
    const kept = DataStore.mem().findOne("mail_contacts", (c: any) => c.tenantId === TD && c.email === "dup@r22d.io");
    expect(kept.name).toBe("Dup New");
    expect(() => {
      const gone = DataStore.mem().findOne("mail_contacts", (c: any) => c._id === "ct_r22_da");
      if (gone) throw new Error("old dup still present");
    }).not.toThrow();
  });
});

describe("contacts bulk — dashboard, tagging, delete & log", () => {
  it("reports a bulk dashboard with totals, duplicates and groups", () => {
    const r = bulk.bulkDashboard(TE);
    expect(r.total).toBe(3);
    expect(r.duplicates).toBe(1);
    expect(r.groups.some((g: any) => g.name === "team")).toBe(true);
    expect(r.generatedAt).toBeTruthy();
  });

  it("applies and removes a tag across contacts", () => {
    const r = bulk.bulkTagContacts(TE, { contactIds: ["ct_r22_1", "ct_r22_2", "missing"], tag: "hot" });
    expect(r.updated).toBe(2);
    expect(r.action).toBe("applied");
    const rem = bulk.bulkTagContacts(TE, { contactIds: ["ct_r22_1"], tag: "hot", remove: true });
    expect(rem.updated).toBe(1);
    expect(rem.action).toBe("removed");
  });

  it("deletes contacts in bulk", () => {
    const r = bulk.bulkDeleteContacts(TE, { contactIds: ["ct_r22_2"] });
    expect(r.deleted).toBe(1);
    expect(() => bulk.bulkDeleteContacts(TE, { contactIds: [] })).toThrow(/At least one contactId is required/);
  });

  it("logs at least 3 bulk operations", () => {
    const log = bulk.bulkLog(TE, 100);
    expect(log.log.length).toBeGreaterThanOrEqual(3);
  });
});