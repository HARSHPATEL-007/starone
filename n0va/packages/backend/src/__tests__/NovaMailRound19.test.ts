import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import {
  MailFocusService,
  FOCUS_MODES,
  NOTIFICATION_TIERS,
  BATCH_SUGGESTIONS,
} from "../services/MailFocusService";

const focus = new MailFocusService();

const T = "nova-mail19";
const T2 = "nova-mail19b";
const T3 = "nova-mail19c";

beforeAll(() => {
  DataStore.mem().insert("mailboxes", {
    _id: "mb_mf_main", tenantId: T, name: "Focus Mailbox", type: "work", email: "focus@t19.io",
    plan: "business", quotaBytes: 10 * 1024 * 1024 * 1024, usedBytes: 0, status: "active",
  });
  DataStore.mem().insert("mailboxes", {
    _id: "mb_mf_alt", tenantId: T2, name: "Isolated Mailbox", type: "work", email: "iso@t19.io",
    plan: "business", quotaBytes: 10 * 1024 * 1024 * 1024, usedBytes: 0, status: "active",
  });
  const msgs = [
    { _id: "mf_m1", tenantId: T, folder: "inbox", subject: "Weekly newsletter", from: { email: "n@t19.io" }, ai: { category: "newsletter" }, read: false },
    { _id: "mf_m2", tenantId: T, folder: "inbox", subject: "Promo shot", from: { email: "p@t19.io" }, flags: ["spam"], read: false },
    { _id: "mf_m3", tenantId: T, folder: "inbox", subject: "Receipt 42", from: { email: "s@t19.io" }, ai: { category: "promo" }, read: true },
    { _id: "mf_m4", tenantId: T, folder: "inbox", subject: "SLA breach", from: { email: "al@t19.io" }, ai: { priority: "critical" }, read: false },
    { _id: "mf_m5", tenantId: T, folder: "inbox", subject: "CEO direct", from: { email: "ceo@t19.io" }, importance: "high", read: false },
    { _id: "mf_m6", tenantId: T, folder: "inbox", subject: "Budget approval", from: { email: "fn@t19.io" }, ai: { priority: "high" }, read: false },
    { _id: "mf_m7", tenantId: T, folder: "inbox", subject: "Needs reply", from: { email: "r@t19.io" }, awaitingResponse: true, read: false },
    { _id: "mf_m8", tenantId: T, folder: "inbox", subject: "Project status", from: { email: "s2@t19.io" }, read: false },
    { _id: "mf_m9", tenantId: T, folder: "inbox", subject: "Old read", from: { email: "o@t19.io" }, read: true },
    // batch intelligence candidates (own tenant so tier counts on T stay stable)
    { _id: "mf_b1", tenantId: T3, folder: "inbox", subject: "Daily digest", from: { email: "x@t19.io" }, ai: { category: "newsletter" }, read: false },
    { _id: "mf_b2", tenantId: T3, folder: "inbox", subject: "Invoice #99", from: { email: "i@t19.io" }, ai: { category: "invoice" }, read: false },
    { _id: "mf_b3", tenantId: T3, folder: "inbox", subject: "Calendar invite", from: { email: "c@t19.io" }, ai: { category: "meeting" }, read: false },
    { _id: "mf_b4", tenantId: T3, folder: "inbox", subject: "[TODO] Follow up vendor", from: { email: "v@t19.io" }, ai: { category: "general" }, read: false },
  ];
  for (const m of msgs) DataStore.mem().insert("messages", m as any);
});

describe("focus modes (§6.2)", () => {
  it("exposes 5 configurable focus modes", () => {
    expect(FOCUS_MODES.length).toBe(5);
    expect(FOCUS_MODES.map((m) => m.id)).toEqual(["deep_work", "meeting", "commute", "late_night", "vacation"]);
    expect(focus.focusModes().total).toBe(5);
  });

  it("activates a focus session with an end time", () => {
    const r = focus.activateFocus(T, "deep_work");
    expect(r.started).toBe(true);
    expect(r.session.mode).toBe("deep_work");
    expect(r.session.status).toBe("active");
    expect(r.session.durationMin).toBe(120);
    expect(r.summary).toContain("120 min");
  });

  it("rejects re-activation while a session is active", () => {
    const again = focus.activateFocus(T, "meeting");
    expect(again.started).toBe(false);
    expect(again.summary).toContain("already active");
  });

  it("supports open-ended vacation focus and rejects unknown modes", () => {
    expect(() => focus.activateFocus(T2, "nope")).toThrow("Unknown focus mode");
    const vac = focus.activateFocus(T2, "vacation");
    expect(vac.started).toBe(true);
    expect(vac.session.endsAt).toBeNull();
    expect(vac.session.durationMin).toBe(0);
  });

  it("validates focal activation duration", () => {
    expect(() => focus.activateFocus(T3, "deep_work", -1)).toThrow("durationMin must be a positive number");
    expect(() => focus.activateFocus(T3, "deep_work", 0)).toThrow("durationMin must be a positive number");
  });
});

describe("focus lifecycle", () => {
  it("reports focus status with stats and remaining time", () => {
    const s = focus.focusStatus(T);
    expect(s.active).toBe(true);
    expect(s.session.name).toBe("Deep Work");
    expect(typeof s.session.remainingMin).toBe("number");
    expect(s.session.remainingMin).toBeLessThanOrEqual(120);
    expect(s.stats.sessionsToday).toBeGreaterThanOrEqual(1);
    expect(typeof s.stats.focusScore).toBe("number");
  });

  it("returns an inactive status for a tenant with no session", () => {
    const idle = focus.focusStatus("nova-mail19-none");
    expect(idle.active).toBe(false);
    expect(idle.summary).toContain("No focus session active");
  });

  it("extends an active session", () => {
    const status = focus.focusStatus(T);
    const before = status.session.endsAt;
    const ext = focus.extendFocus(T, status.session.sessionId, 30);
    expect(ext.summary).toContain("extended by 30 min");
    expect(ext.session.endsAt).not.toBe(before);
    expect(() => focus.extendFocus(T, "nope", 10)).toThrow("Focus session not found");
  });

  it("ends a session deterministically and computes time saved", () => {
    const status = focus.focusStatus(T);
    const ended = focus.endFocus(T, status.session.sessionId);
    expect(ended.session.status).toBe("ended");
    expect(ended.session.emailsHandled).toBe(12);
    expect(ended.session.timeSavedMin).toBe(66);
    expect(ended.session.focusScore).toBe(92);
    expect(ended.summary).toContain("92/100");
    expect(() => focus.endFocus(T, status.session.sessionId)).toThrow("Focus session already ended");
  });
});

describe("notification tiers (§6.1)", () => {
  it("exposes 4 delivery tiers", () => {
    expect(NOTIFICATION_TIERS.length).toBe(4);
    expect(NOTIFICATION_TIERS.map((t) => t.name)).toEqual(["Silent Execution", "Digest Batch", "Smart Alert", "Breakthrough"]);
  });

  it("classifies inbox messages into tiers", () => {
    const t = focus.notificationTiers(T);
    expect(t.tiers.length).toBe(4);
    expect(t.silentExecution).toBe(2); // newsletter + spam
    expect(t.breakthrough).toBe(2); // critical priority + high importance
    expect(t.smartAlert).toBe(2); // high priority + awaiting response
    expect(t.digestBatch).toBe(3); // remaining unread (7 unread - 2 smart - 2 breakthrough)
    expect(t.total).toBe(9);
    expect(t.summary).toContain("breakthrough");
  });
});

describe("smart batching (§6.3)", () => {
  it("returns a deterministic batching policy based on context", () => {
    const b = focus.smartBatch(T);
    expect(typeof b.context).toBe("string");
    expect(typeof b.policy).toBe("string");
    expect(typeof b.mode).toBe("string");
    expect(["standard", "late_night", "deep_work", "meeting", "commute", "late_night", "vacation"]).toContain(b.mode);
    expect(b.summary).toContain("→");
  });
});

describe("batch intelligence (§4.3)", () => {
  it("suggests per-group actions for selected messages", () => {
    const result = focus.batchIntelligence(T3, ["mf_b1", "mf_b2", "mf_b3", "mf_b4"]);
    expect(result.total).toBe(4);
    const actions = result.groups.map((g: any) => g.action);
    expect(actions).toContain("archive"); // newsletter → auto-archive
    expect(actions).toContain("file_expenses"); // invoice → file
    expect(actions).toContain("accept_calendar"); // invite → accept
    expect(actions).toContain("create_task"); // [TODO] → task
    const g = result.groups.find((x: any) => x.action === "create_task");
    expect(g.messageIds).toContain("mf_b4");
    expect(result.summary).toContain("→");
  });

  it("requires a non-empty message list", () => {
    expect(() => focus.batchIntelligence(T3, [])).toThrow("messageIds must be a non-empty array");
    expect(() => focus.batchIntelligence(T3, ["missing-msg"])).toThrow("Message not found for");
  });

  it("applies batch suggestions to messages", () => {
    const applied = focus.executeBatchSuggestions(T3, [
      { messageId: "mf_b1", action: "archive" },
      { messageId: "mf_b2", action: "file_expenses" },
      { messageId: "mf_b3", action: "accept_calendar" },
      { messageId: "mf_b4", action: "create_task" },
    ]);
    expect(applied.applied).toBe(4);
    expect(applied.skipped).toBe(0);
    const b1 = DataStore.mem().findOne("messages", (m: any) => m._id === "mf_b1");
    expect(b1.folder).toBe("archive");
    const b2 = DataStore.mem().findOne("messages", (m: any) => m._id === "mf_b2");
    expect(b2.folder).toBe("archive");
    expect(b2.labels).toContain("expenses");
    const b3 = DataStore.mem().findOne("messages", (m: any) => m._id === "mf_b3");
    expect(b3.labels).toContain("calendar");
    const b4 = DataStore.mem().findOne("messages", (m: any) => m._id === "mf_b4");
    expect(b4.labels).toContain("task");
  });

  it("skips unknown actions and is tolerant", () => {
    const applied = focus.executeBatchSuggestions(T3, [
      { messageId: "mf_b1", action: "not_a_real_action" },
      { messageId: "missing", action: "archive" },
    ]);
    expect(applied.applied).toBe(0);
    expect(applied.skipped).toBe(2);
  });

  it("exposes the batch suggestion catalog", () => {
    expect(BATCH_SUGGESTIONS.length).toBe(6);
    expect(BATCH_SUGGESTIONS.map((s) => s.action)).toContain("quick_reply");
  });
});

describe("daily friction score (§12.2)", () => {
  it("computes the default score with minimal friction", () => {
    const f = focus.frictionScore(T);
    expect(f.score).toBe(394);
    expect(f.level).toBe("minimal");
    expect(f.baseline).toBe(3460);
    expect(f.reductionPct).toBe(89);
    expect(f.summary).toContain("89%");
  });

  it("increases the score for high-friction input", () => {
    const f = focus.frictionScore(T2, {
      clicksPerEmail: 1.5, decisionSeconds: 900, menuNavigations: 6, charsTyped: 220,
      contextSwitches: 12, notifications: 9, undoActions: 3, emailsHandled: 100,
    });
    expect(f.score).toBeGreaterThan(1000);
    expect(["low", "moderate", "high"]).toContain(f.level);
    expect(f.inputs.clicksPerEmail).toBe(1.5);
  });
});

describe("ROI calculator (§12.3)", () => {
  it("computes hours saved and ROI for a 1-user team", () => {
    const r = focus.roiCalculator(T, 1, 75);
    expect(r.emailsPerDay).toBe(100);
    expect(r.minutesSavedPerDay).toBe(99);
    expect(r.hoursSavedPerWeek).toBeCloseTo(8.25, 2);
    expect(r.hoursSavedPerYear).toBeCloseTo(412.5, 1);
    expect(r.annualValue).toBeCloseTo(30937.5, 1);
    expect(r.annualCost).toBe(240);
    expect(r.roiPct).toBe(12791);
    expect(r.breakdown.length).toBe(5);
    expect(r.summary).toContain("12791% ROI");
  });

  it("scales value with team size", () => {
    const r = focus.roiCalculator(T2, 10, 100);
    expect(r.annualValue).toBeCloseTo(412.5 * 100 * 10, 1);
    expect(r.roiPct).toBeGreaterThan(12791);
  });
});

describe("dashboard & log", () => {
  it("builds a focus dashboard with all sections", () => {
    const d = focus.focusDashboard(T);
    expect(d.modes.length).toBe(5);
    expect(d.status).toBeDefined();
    expect(d.tiers.tiers.length).toBe(4);
    expect(d.batching.policy).toBeTruthy();
    expect(d.friction.score).toBe(394);
    expect(d.recentLog.length).toBeGreaterThan(0);
    expect(typeof d.seed).toBe("number");
  });

  it("maintains a chronological focus log", () => {
    const log = focus.focusLog(T);
    expect(log.total).toBeGreaterThan(0);
    const cats = log.entries.map((e: any) => e.category);
    expect(cats).toContain("focus_started");
    expect(cats).toContain("focus_ended");
    expect(cats).toContain("friction_score");
    // sorted desc
    const times = log.entries.map((e: any) => new Date(e.at).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("keeps tenants isolated", () => {
    const idle = focus.focusStatus("nova-mail19-none");
    expect(idle.active).toBe(false);
    const log2 = focus.focusLog(T2);
    expect(log2.total).toBeGreaterThan(0); // friction logged for T2
    const b = focus.smartBatch(T2);
    expect(b.context).toBeTruthy();
  });
});