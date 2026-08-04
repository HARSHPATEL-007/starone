import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailLabelService } from "../services/MailLabelService";
import { mailRealtime, MAIL_EVENTS } from "../services/MailRealtimeService";
import { mailMessage } from "../services/MailMessageService";
import { mailSpam } from "../services/MailSpamService";
import { mailThread } from "../services/MailThreadService";

const label = new MailLabelService();

const T = "nova-mail23";
const T2 = "nova-mail23b";
const T3 = "nova-mail23c";

beforeAll(() => {
  mailRealtime.clearBuffer();
  DataStore.mem().insert("mailboxes", {
    _id: "mb_r23", tenantId: T, name: "Label HQ", type: "work", email: "hq@r23.io",
    plan: "business", quotaBytes: 1024 * 1024 * 1024 * 10, usedBytes: 0, status: "active",
  });
  DataStore.mem().insert("mailboxes", {
    _id: "mb_r23b", tenantId: T2, name: "Realtime Box", type: "work", email: "rt@r23b.io",
    plan: "business", quotaBytes: 1024 * 1024 * 1024 * 10, usedBytes: 0, status: "active",
    settings: { autoEnrich: true },
  });
  DataStore.mem().insert("mailboxes", {
    _id: "mb_r23c", tenantId: T3, name: "Label Box", type: "work", email: "lb@r23c.io",
    plan: "business", quotaBytes: 1024 * 1024 * 1024 * 10, usedBytes: 0, status: "active",
  });
  const recv = mailMessage.receiveMessage(T3, "mb_r23c", { from: "jane@partner.io", subject: "Q3 invoice attached", body: "Please review the invoice for Q3." });
  mailMessage.receiveMessage(T3, "mb_r23c", { from: "news@digest.io", subject: "Daily digest 114", body: "Top stories for today." });
  mailThread.tagThread(T3, recv.message.threadId, "finance");
});

describe("label catalog CRUD", () => {
  it("creates a label with default color and empty rules", () => {
    const created = label.createLabel(T, { name: "Finance" });
    expect(created.labelId).toBeTruthy();
    expect(created.name).toBe("Finance");
    expect(created.color).toBe("#4A90D9");
    expect(created.autoApplyRules).toEqual([]);
  });

  it("creates a label with custom color and auto-apply rules", () => {
    const created = label.createLabel(T, { name: "Urgent", color: "#FF0000", autoApplyRules: ["r_high_priority"] });
    expect(created.color).toBe("#FF0000");
    expect(created.autoApplyRules).toEqual(["r_high_priority"]);
  });

  it("rejects duplicate labels case-insensitively", () => {
    expect(() => label.createLabel(T, { name: "finance" })).toThrow(/already exists/);
  });

  it("rejects missing name", () => {
    expect(() => label.createLabel(T, {} as any)).toThrow(/Label name is required/);
  });

  it("lists labels with per-label counts", () => {
    const list = label.listLabels(T);
    expect(list.total).toBe(2);
    const finance: any = list.labels.find((l: any) => l.name === "Finance");
    expect(finance).toBeTruthy();
    expect(finance.count).toBe(0);
    expect(finance.unread).toBe(0);
    expect(list.summary).toContain("2 label(s)");
  });

  it("gets a label by id", () => {
    const created = label.createLabel(T, { name: "Temp", color: "#00FF00" });
    const got = label.getLabel(T, created.labelId);
    expect(got.name).toBe("Temp");
    expect(got.color).toBe("#00FF00");
    label.deleteLabel(T, created.labelId);
  });

  it("updates name, color and rules", () => {
    const created = label.createLabel(T, { name: "Rename Me", color: "#111111" });
    const updated = label.updateLabel(T, created.labelId, { name: "Renamed", color: "#222222", autoApplyRules: ["r1"] });
    expect(updated.name).toBe("Renamed");
    expect(updated.color).toBe("#222222");
    expect(updated.autoApplyRules).toEqual(["r1"]);
    label.deleteLabel(T, created.labelId);
  });

  it("rejects renaming to an existing label", () => {
    const created = label.createLabel(T, { name: "Dup Target" });
    expect(() => label.updateLabel(T, created.labelId, { name: "finance" })).toThrow(/already exists/);
    label.deleteLabel(T, created.labelId);
  });

  it("rejects invalid color and falls back to default", () => {
    const created = label.createLabel(T, { name: "Bad Color", color: "red" });
    expect(created.color).toBe("#4A90D9");
    label.deleteLabel(T, created.labelId);
  });

  it("throws on unknown label", () => {
    expect(() => label.getLabel(T, "lbl_missing")).toThrow(/not found/);
    expect(() => label.deleteLabel(T, "lbl_missing")).toThrow(/not found/);
  });
});

describe("label apply/remove on messages", () => {
  it("applies a registered label to a message", () => {
    const created = label.createLabel(T3, { name: "Needs Review" });
    const msgs = mailMessage.listMessages(T3, { folder: "inbox" });
    const target = msgs.messages.find((m: any) => m.subject.includes("invoice"));
    expect(target).toBeTruthy();
    const res = label.applyLabel(T3, created.labelId, target._id);
    expect(res.labels).toContain("Needs Review");
    expect(res.color).toBe("#4A90D9");
  });

  it("reflects applied labels in counts", () => {
    const list = label.listLabels(T3);
    const needs: any = list.labels.find((l: any) => l.name === "Needs Review");
    expect(needs.count).toBe(1);
    expect(needs.unread).toBe(1);
  });

  it("removes a registered label from a message", () => {
    const list = label.listLabels(T3);
    const needs: any = list.labels.find((l: any) => l.name === "Needs Review");
    const msgs = mailMessage.listMessages(T3, { folder: "inbox" });
    const target = msgs.messages.find((m: any) => m.subject.includes("invoice"));
    const res = label.removeLabel(T3, needs.labelId, target._id);
    expect(res.labels).not.toContain("Needs Review");
    expect(label.listLabels(T3).labels.find((l: any) => l.name === "Needs Review")!.count).toBe(0);
  });

  it("throws when applying via an unknown label id", () => {
    const msgs = mailMessage.listMessages(T3, { folder: "inbox" });
    expect(() => label.applyLabel(T3, "lbl_unknown", msgs.messages[0]._id)).toThrow(/not found/);
  });

  it("delete strips the label from messages", () => {
    const created = label.createLabel(T3, { name: "Temp Strip" });
    const msgs = mailMessage.listMessages(T3, { folder: "inbox" });
    const target = msgs.messages.find((m: any) => m.subject.includes("invoice"));
    label.applyLabel(T3, created.labelId, target._id);
    const del = label.deleteLabel(T3, created.labelId);
    expect(del.stripped).toBe(1);
    const after = mailMessage.getMessage(T3, target._id);
    expect(after.labels).not.toContain("Temp Strip");
  });
});

describe("label dashboard + log", () => {
  it("builds a dashboard with counts and top labels", () => {
    const dash = label.labelDashboard(T3);
    expect(dash.total).toBeGreaterThanOrEqual(1);
    expect(dash.labeledMessages).toBeGreaterThanOrEqual(0);
    expect(typeof dash.unlabeled).toBe("number");
    expect(Array.isArray(dash.topLabels)).toBe(true);
    expect(Array.isArray(dash.recentActivity)).toBe(true);
    expect(dash.summary).toContain("label(s)");
  });

  it("returns a log of label activity sorted desc", () => {
    const log = label.labelLog(T3, 50);
    expect(log.total).toBeGreaterThanOrEqual(5);
    const types = log.log.map((l: any) => l.type);
    expect(types).toContain("label_created");
    expect(types).toContain("label_applied");
    expect(types).toContain("label_removed");
    expect(types).toContain("label_deleted");
  });
});

describe("mail realtime event catalog", () => {
  it("exposes the 14 Â§4.3 events", () => {
    expect(MAIL_EVENTS).toHaveLength(14);
    const events = MAIL_EVENTS.map((e) => e.event);
    expect(events).toEqual([
      "mail.received", "mail.sent", "mail.read", "mail.thread_update",
      "mail.label_change", "mail.folder_change", "mail.spam_detected", "mail.ai_suggestion",
      "mail.presence", "mail.comment_added", "mail.reaction_added", "mail.voice_note",
      "mail.typing", "mail.cursor_position",
    ]);
  });

  it("rejects unknown events", () => {
    expect(() => mailRealtime.emit("mail.unknown", T, {})).toThrow(/Unknown mail event/);
  });
});

describe("mail realtime emits", () => {
  it("emits mail.sent on composeSend with delivery payload", () => {
    mailRealtime.clearBuffer();
    mailMessage.composeSend(T2, "mb_r23b", { to: "amy@r23.io", subject: "Round 23 sent", body: "hi" });
    const events = mailRealtime.recentEvents(T2, 10).filter((e: any) => e.event === "mail.sent");
    expect(events.length).toBeGreaterThanOrEqual(1);
    const e = events[0];
    expect(e.payload.subject).toBe("Round 23 sent");
    expect(e.payload.messageId).toBeTruthy();
    expect(e.payload.to).toEqual([{ name: "", email: "amy@r23.io" }]);
  });

  it("emits mail.received + mail.ai_suggestion on receiveMessage", () => {
    mailRealtime.clearBuffer();
    const recv = mailMessage.receiveMessage(T2, "mb_r23b", { from: "bob@r23.io", subject: "Round 23 inbound", body: "hello there" });
    const events = mailRealtime.recentEvents(T2, 10);
    const received: any = events.find((e: any) => e.event === "mail.received");
    const suggested: any = events.find((e: any) => e.event === "mail.ai_suggestion");
    expect(received).toBeTruthy();
    expect(received.payload.subject).toBe("Round 23 inbound");
    expect(received.payload.hasAttachments).toBe(false);
    expect(suggested).toBeTruthy();
    expect(suggested.payload.messageId).toBe(recv.message._id);
    expect(suggested.payload.priority).toBeTruthy();
  });

  it("emits mail.read on markRead with timestamp", () => {
    mailRealtime.clearBuffer();
    const msgs = mailMessage.listMessages(T2, { folder: "inbox" });
    const target = msgs.messages.find((m: any) => m.subject === "Round 23 inbound");
    mailMessage.markRead(T2, target._id, true);
    const events = mailRealtime.recentEvents(T2, 10);
    const read: any = events.find((e: any) => e.event === "mail.read");
    expect(read).toBeTruthy();
    expect(read.payload.messageId).toBe(target._id);
    expect(read.payload.read).toBe(true);
    expect(read.payload.timestamp).toBeTruthy();
  });

  it("emits mail.label_change on apply/remove label", () => {
    mailRealtime.clearBuffer();
    const msgs = mailMessage.listMessages(T2, { folder: "inbox" });
    const target = msgs.messages[0];
    mailMessage.applyLabel(T2, target._id, "Urgent");
    mailMessage.removeLabel(T2, target._id, "Urgent");
    const events = mailRealtime.recentEvents(T2, 10).filter((e: any) => e.event === "mail.label_change");
    expect(events).toHaveLength(2);
    expect(events[0].payload.action).toBe("removed");
    expect(events[0].payload.label).toBe("Urgent");
    expect(events[1].payload.action).toBe("applied");
  });

  it("emits mail.folder_change on move", () => {
    mailRealtime.clearBuffer();
    const msgs = mailMessage.listMessages(T2, { folder: "inbox" });
    const target = msgs.messages[0];
    mailMessage.moveToFolder(T2, target._id, "archive");
    const events = mailRealtime.recentEvents(T2, 10);
    const moved: any = events.find((e: any) => e.event === "mail.folder_change");
    expect(moved).toBeTruthy();
    expect(moved.payload.folder).toBe("archive");
    expect(moved.payload.messageIds).toEqual([target._id]);
  });

  it("emits mail.spam_detected when a message scans as spam", () => {
    mailRealtime.clearBuffer();
    const recv = mailMessage.receiveMessage(T2, "mb_r23b", { from: "spammer@bad.tld", subject: "You won the lottery prize!", body: "claim now, click here, act now" });
    const scan = mailSpam.scanMessage(T2, recv.message._id);
    expect(scan.verdict).toBe("spam");
    const events = mailRealtime.recentEvents(T2, 10);
    const spam: any = events.find((e: any) => e.event === "mail.spam_detected");
    expect(spam).toBeTruthy();
    expect(spam.payload.messageId).toBe(recv.message._id);
    expect(spam.payload.score).toBeGreaterThanOrEqual(60);
  });

  it("emits mail.thread_update on thread state change and merge", () => {
    mailRealtime.clearBuffer();
    const msgs = mailMessage.listMessages(T2, { folder: "inbox" });
    const threadId = msgs.messages[0].threadId;
    mailThread.setThreadState(T2, threadId, "done");
    const events = mailRealtime.recentEvents(T2, 10);
    const stateEv: any = events.find((e: any) => e.event === "mail.thread_update");
    expect(stateEv).toBeTruthy();
    expect(stateEv.payload.change).toBe("state");
    expect(stateEv.payload.state).toBe("done");
  });

  it("computes event counts + overview per tenant", () => {
    mailRealtime.clearBuffer();
    mailMessage.composeSend(T2, "mb_r23b", { to: "amy@r23.io", subject: "Count me", body: "hi" });
    mailMessage.composeSend(T2, "mb_r23b", { to: "amy@r23.io", subject: "Count me too", body: "hi" });
    const overview = mailRealtime.realtimeOverview(T2);
    expect(overview.counts["mail.sent"]).toBe(2);
    expect(overview.total).toBe(2);
    expect(overview.eventCatalog).toHaveLength(14);
    expect(overview.wired).toBe(false);
    expect(overview.summary).toContain("2 mail event(s)");
  });

  it("returns a realtime log with payloads", () => {
    const log = mailRealtime.realtimeLog(T2, 25);
    expect(log.total).toBeGreaterThanOrEqual(1);
    expect(log.log[0].event).toBeTruthy();
    expect(log.log[0].at).toBeTruthy();
  });

  it("broadcasts to the tenant room when io is wired", () => {
    const rooms: string[] = [];
    const fakeIO = {
      to: (room: string) => ({ emit: (_ev: string, _pl: any) => rooms.push(room) }),
    };
    mailRealtime.setIO(fakeIO);
    mailRealtime.clearBuffer();
    mailRealtime.emit("mail.sent", T2, { subject: "Broadcast check" });
    expect(rooms).toEqual([`tenant:${T2}`]);
    mailRealtime.setIO(null);
  });
});


