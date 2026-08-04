import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import {
  MailComposerService,
  COMPOSER_MODES,
  COMPOSER_TONES,
  COMPOSER_INTENTS,
} from "../services/MailComposerService";

const composer = new MailComposerService();

const T = "nova-mail20";
const T2 = "nova-mail20b";
const T3 = "nova-mail20c";

beforeAll(() => {
  DataStore.mem().insert("mailboxes", {
    _id: "mb_mc_main", tenantId: T, name: "Composer Mailbox", type: "work", email: "ani@t20.io",
    plan: "business", quotaBytes: 10 * 1024 * 1024 * 1024, usedBytes: 0, status: "active",
  });
  DataStore.mem().insert("mailboxes", {
    _id: "mb_mc_alt", tenantId: T2, name: "Isolated Mailbox", type: "work", email: "iso@t20.io",
    plan: "business", quotaBytes: 10 * 1024 * 1024 * 1024, usedBytes: 0, status: "active",
  });
  const msgs = [
    { _id: "mc_c1", tenantId: T, folder: "inbox", subject: "Contract Revision — Section 4.2 liability clause", from: { name: "Sarah Chen", email: "sarah@partner.io" }, body: "Please review the revised contract and the liability clause changes." },
    { _id: "mc_c2", tenantId: T, folder: "inbox", subject: "Q3 review meeting — do you have availability?", from: { name: "John Smith", email: "john@partner.io" }, body: "Can we schedule a call this week?" },
    { _id: "mc_c3", tenantId: T, folder: "inbox", subject: "Question about the budget numbers", from: { name: "Mia Lopez", email: "mia@finance.io" }, body: "Could you clarify the Q3 spend breakdown?" },
    { _id: "mc_c4", tenantId: T, folder: "inbox", subject: "Invoice #1042 attached", from: { name: "Bill Turner", email: "bill@vend.io" }, body: "Invoice for the last month of services is attached." },
    { _id: "mc_c5", tenantId: T, folder: "inbox", subject: "Please approve the new vendor", from: { name: "Anita Rao", email: "anita@ops.io" }, body: "We need your approval to proceed with the vendor deal." },
    { _id: "mc_c6", tenantId: T, folder: "inbox", subject: "Weekly project status update", from: { name: "Dev Team", email: "dev@team.io" }, body: "Quick update: everything is on track for the release." },
    { _id: "mc_f1", tenantId: T, folder: "inbox", subject: "Forward me the final deck please", from: { name: "Leo Grant", email: "leo@board.io" }, body: "Please send the final presentation when ready." },
  ];
  for (const m of msgs) DataStore.mem().insert("messages", m as any);
  DataStore.mem().insert("mailboxes", {
    _id: "mb_mc_t3", tenantId: T3, name: "Empty Mailbox", type: "work", email: "empty@t20.io",
    plan: "free", quotaBytes: 1024 * 1024 * 1024, usedBytes: 0, status: "active",
  });
});

describe("composer catalog", () => {
  it("exposes modes, tones and intents", () => {
    expect(COMPOSER_MODES.length).toBe(3);
    expect(COMPOSER_MODES.map((m) => m.id)).toEqual(["reply", "forward", "new"]);
    expect(COMPOSER_TONES.length).toBe(3);
    expect(COMPOSER_TONES.map((t) => t.id)).toEqual(["concise", "warm", "formal"]);
    expect(COMPOSER_INTENTS.length).toBe(6);
    const cat = composer.composerCatalog();
    expect(cat.modes.length).toBe(3);
    expect(cat.tones.length).toBe(3);
    expect(cat.intents.length).toBe(6);
  });
});

describe("zero-tap composeDraft", () => {
  it("writes a complete reply draft for a message", () => {
    const r = composer.composeDraft(T, "mc_c1");
    expect(r.clicksToSend).toBe(1);
    expect(r.actions).toEqual(["send", "edit", "regenerate", "don't_like"]);
    const d = r.draft;
    expect(d.draftId).toBeTruthy();
    expect(d.mode).toBe("reply");
    expect(d.subject).toBe("Re: Contract Revision — Section 4.2 liability clause");
    expect(d.to).toEqual([{ name: "Sarah Chen", email: "sarah@partner.io" }]);
    expect(d.intent).toBe("contract");
    expect(d.status).toBe("draft");
    expect(d.confidence).toBeGreaterThanOrEqual(70);
    expect(d.confidence).toBeLessThanOrEqual(99);
    expect(d.body).toContain("Hi Sarah,");
    expect(d.body).toMatch(/Best,|Thanks,|Cheers,|Sincerely,|Kind regards,/);
    expect(d.sections.length).toBeGreaterThanOrEqual(2);
    expect(d.sections.length).toBeLessThanOrEqual(4);
    expect(d.sections.every((s: string) => s.includes("✅") || s.includes("⚠️"))).toBe(true);
    expect(d.basedOn).toContain("Based on: your past");
    expect(d.basedOn).toContain("contract replies");
    expect(d.callToAction).toBeTruthy();
    expect(d.greeting).toBe("Hi Sarah,");
  });

  it("detects intent from subject/body keywords", () => {
    expect(composer.composeDraft(T, "mc_c2").draft.intent).toBe("meeting");
    expect(composer.composeDraft(T, "mc_c3").draft.intent).toBe("question");
    expect(composer.composeDraft(T, "mc_c4").draft.intent).toBe("invoice");
    expect(composer.composeDraft(T, "mc_c5").draft.intent).toBe("request");
    expect(composer.composeDraft(T, "mc_c6").draft.intent).toBe("update");
  });

  it("is deterministic for the same message and tone", () => {
    const a = composer.composeDraft(T, "mc_c1").draft;
    const b = composer.composeDraft(T, "mc_c1").draft;
    expect(b.body).toBe(a.body);
    expect(b.confidence).toBe(a.confidence);
    expect(b.basedOn).toBe(a.basedOn);
  });

  it("tone changes the greeting and closing", () => {
    const concise = composer.composeDraft(T, "mc_c2", { tone: "concise" }).draft;
    const formal = composer.composeDraft(T, "mc_c2", { tone: "formal" }).draft;
    expect(concise.greeting).toBe("Hi John,");
    expect(formal.greeting).toBe("Dear John,");
    expect(formal.body).not.toBe(concise.body);
  });

  it("forward mode prefixes Fwd:", () => {
    const r = composer.composeDraft(T, "mc_f1", { mode: "forward" });
    expect(r.draft.subject).toBe("Fwd: Forward me the final deck please");
    expect(r.draft.mode).toBe("forward");
  });

  it("throws on unknown message or invalid options", () => {
    expect(() => composer.composeDraft(T, "nope")).toThrow("not found");
    expect(() => composer.composeDraft(T, "mc_c1", { mode: "fax" })).toThrow("Unknown composer mode");
    expect(() => composer.composeDraft(T, "mc_c1", { tone: "shouty" })).toThrow("Unknown tone");
    expect(() => composer.composeDraft(T3, "mc_c1")).toThrow("not found");
  });
});

describe("draft lifecycle", () => {
  it("regenerates to the next variant with a fresh body", () => {
    const first = composer.composeDraft(T, "mc_c3", { tone: "warm" }).draft;
    const r = composer.regenerateDraft(T, first.draftId);
    expect(r.draft.variant).toBe(2);
    expect(r.draft.body).not.toBe(first.body);
    expect(r.draft.status).toBe("draft");
    expect(r.summary).toContain("variant 2");
    const again = composer.regenerateDraft(T, first.draftId);
    expect(again.draft.variant).toBe(3);
  });

  it("dislike records feedback and regenerates a fresh draft", () => {
    const d = composer.composeDraft(T, "mc_c4").draft;
    const r = composer.dislikeDraft(T, d.draftId, "too formal");
    expect(r.summary).toContain("regenerated a fresh draft");
    expect(r.draft.disliked).toBe(true);
    expect(r.draft.feedback).toBe("too formal");
    expect(r.draft.variant).toBe(d.variant + 1);
  });

  it("saveEdits applies subject/body/tone patches", () => {
    const d = composer.composeDraft(T, "mc_c5").draft;
    const r = composer.saveEdits(T, d.draftId, { subject: "Edited subject", body: "Custom body line", tone: "formal" });
    expect(r.draft.subject).toBe("Edited subject");
    expect(r.draft.body).toBe("Custom body line");
    expect(r.draft.tone).toBe("formal");
  });

  it("lists drafts with status filter", () => {
    const all = composer.listDrafts(T);
    expect(all.total).toBeGreaterThan(0);
    expect(all.drafts[0].draftId).toBeTruthy();
    expect(all.drafts[0].basedOn).toBeTruthy();
    const drafts = composer.listDrafts(T, "draft");
    expect(drafts.total).toBe(all.drafts.filter((d: any) => d.status === "draft").length);
    const sent = composer.listDrafts(T, "sent");
    expect(sent.drafts.every((d: any) => d.status === "sent")).toBe(true);
  });

  it("fetches a single draft with full body", () => {
    const d = composer.composeDraft(T, "mc_c6").draft;
    const r = composer.getDraft(T, d.draftId);
    expect(r.draft.body).toBe(d.body);
    expect(r.draft.sections.length).toBe(d.sections.length);
    expect(r.summary).toContain("confidence");
  });

  it("deletes a draft", () => {
    const d = composer.composeDraft(T, "mc_f1").draft;
    const r = composer.deleteDraft(T, d.draftId);
    expect(r.deleted).toBe(true);
    expect(() => composer.getDraft(T, d.draftId)).toThrow("not found");
    expect(() => composer.deleteDraft(T, d.draftId)).toThrow("not found");
  });

  it("throws on unknown drafts", () => {
    expect(() => composer.regenerateDraft(T, "nope")).toThrow("not found");
    expect(() => composer.dislikeDraft(T, "nope")).toThrow("not found");
    expect(() => composer.sendDraft(T, "nope")).toThrow("not found");
  });
});

describe("sendDraft — one-click send", () => {
  it("sends the draft via the mail engine in one call", () => {
    const d = composer.composeDraft(T, "mc_c1").draft;
    const r = composer.sendDraft(T, d.draftId);
    expect(r.sent).toBe(true);
    expect(r.messageId).toBeTruthy();
    expect(r.summary).toContain("1 click");
    const sentMsg = DataStore.mem().findOne("messages", (m: any) => m._id === r.messageId);
    expect(sentMsg).toBeTruthy();
    expect(sentMsg.folder).toBe("sent");
    expect(sentMsg.subject).toBe("Re: Contract Revision — Section 4.2 liability clause");
    expect(sentMsg.body).toBe(d.body);
    expect(sentMsg.to).toEqual([{ name: "Sarah Chen", email: "sarah@partner.io" }]);
  });

  it("marks the draft as sent and refuses a second send", () => {
    const d = composer.composeDraft(T, "mc_c2").draft;
    const first = composer.sendDraft(T, d.draftId);
    expect(first.sent).toBe(true);
    const second = composer.sendDraft(T, d.draftId);
    expect(second.sent).toBe(false);
    expect(second.summary).toContain("already sent");
    const after = composer.getDraft(T, d.draftId).draft;
    expect(after.status).toBe("sent");
    expect(after.sentAt).toBeTruthy();
  });
});

describe("dashboard + log", () => {
  it("aggregates composer statistics", () => {
    const dash = composer.composerDashboard(T);
    expect(dash.draftsTotal).toBeGreaterThan(0);
    expect(dash.sent).toBeGreaterThanOrEqual(2);
    expect(dash.regenerations).toBeGreaterThanOrEqual(2);
    expect(dash.dislikes).toBeGreaterThanOrEqual(1);
    expect(dash.avgConfidence).toBeGreaterThanOrEqual(70);
    expect(dash.actions).toEqual(["send", "edit", "regenerate", "don't_like"]);
    expect(dash.clicksToSend).toBe(1);
    expect(dash.topIntents.length).toBeGreaterThan(0);
    expect(dash.topIntents.every((t: any) => t.count >= 1 && t.intent)).toBe(true);
    expect(dash.recentLog.length).toBeGreaterThan(0);
    expect(typeof dash.seed).toBe("number");
  });

  it("logs all composer activity chronologically", () => {
    const log = composer.composerLog(T);
    expect(log.total).toBeGreaterThan(0);
    const cats = log.entries.map((e: any) => e.category);
    expect(cats).toContain("composer_drafted");
    expect(cats).toContain("composer_sent");
    expect(cats).toContain("composer_regenerated");
    expect(cats).toContain("composer_disliked");
    expect(cats).toContain("composer_edited");
    const times = log.entries.map((e: any) => new Date(e.at).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("keeps tenants isolated", () => {
    const idle = composer.composerDashboard(T2);
    expect(idle.draftsTotal).toBe(0);
    expect(idle.avgConfidence).toBe(0);
    expect(composer.listDrafts(T2).total).toBe(0);
    expect(() => composer.composeDraft("nova-mail20-none", "mc_c1")).toThrow("not found");
  });
});
