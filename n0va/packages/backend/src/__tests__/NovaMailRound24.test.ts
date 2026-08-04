import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { mailRealtime, MAIL_EVENTS } from "../services/MailRealtimeService";
import { mailMessage } from "../services/MailMessageService";
import { mailCollab } from "../services/MailCollaborationService";
import { mailVoiceNote } from "../services/MailVoiceNoteService";

const T = "nova-mail24";
const T2 = "nova-mail24b";

beforeAll(() => {
  mailRealtime.clearBuffer();
  DataStore.mem().insert("mailboxes", {
    _id: "mb_r24", tenantId: T, name: "Collab HQ", type: "work", email: "hq@r24.io",
    plan: "business", quotaBytes: 1024 * 1024 * 1024 * 10, usedBytes: 0, status: "active",
  });
  DataStore.mem().insert("mailboxes", {
    _id: "mb_r24b", tenantId: T2, name: "Voice Box", type: "work", email: "voice@r24b.io",
    plan: "business", quotaBytes: 1024 * 1024 * 1024 * 10, usedBytes: 0, status: "active",
  });
  mailMessage.receiveMessage(T, "mb_r24", { from: "jane@partner.io", subject: "Q3 invoice attached", body: "Please review the invoice for Q3." });
  mailMessage.receiveMessage(T2, "mb_r24b", { from: "bob@partner.io", subject: "Voice call notes", body: "Recording of our sync." });
});

describe("14-event realtime catalog (Â§4.3 extended)", () => {
  it("exposes all 14 events in spec order", () => {
    expect(MAIL_EVENTS).toHaveLength(14);
    const events = MAIL_EVENTS.map((e) => e.event);
    expect(events).toEqual([
      "mail.received", "mail.sent", "mail.read", "mail.thread_update",
      "mail.label_change", "mail.folder_change", "mail.spam_detected", "mail.ai_suggestion",
      "mail.presence", "mail.comment_added", "mail.reaction_added", "mail.voice_note",
      "mail.typing", "mail.cursor_position",
    ]);
  });

  it("marks the collaboration events as bidirectional where specified", () => {
    const byEvent: Record<string, string> = {};
    for (const e of MAIL_EVENTS) byEvent[e.event] = e.direction;
    expect(byEvent["mail.presence"]).toBe("bidirectional");
    expect(byEvent["mail.typing"]).toBe("bidirectional");
    expect(byEvent["mail.cursor_position"]).toBe("bidirectional");
    expect(byEvent["mail.comment_added"]).toBe("server_to_client");
    expect(byEvent["mail.reaction_added"]).toBe("server_to_client");
    expect(byEvent["mail.voice_note"]).toBe("server_to_client");
  });

  it("rejects unknown events with the full catalog hint", () => {
    expect(() => mailRealtime.emit("mail.unknown", T, {})).toThrow(/Unknown mail event/);
  });
});

describe("bidirectional typing broadcast", () => {
  it("throws when userId or threadId is missing", () => {
    expect(() => mailRealtime.sendTyping(T, {})).toThrow(/userId and threadId are required/);
    expect(() => mailRealtime.sendTyping(T, { userId: "u1" })).toThrow(/userId and threadId are required/);
    expect(() => mailRealtime.sendTyping(T, { threadId: "thr_x" })).toThrow(/userId and threadId are required/);
  });

  it("emits mail.typing with isTyping true by default", () => {
    mailRealtime.clearBuffer();
    const res = mailRealtime.sendTyping(T, { userId: "u1", threadId: "thr_x" });
    expect(res.event).toBe("mail.typing");
    expect(res.isTyping).toBe(true);
    expect(res.summary).toContain("Typing in thread thr_x");
    const events = mailRealtime.recentEvents(T, 10).filter((e: any) => e.event === "mail.typing");
    expect(events).toHaveLength(1);
    expect(events[0].payload.userId).toBe("u1");
    expect(events[0].payload.threadId).toBe("thr_x");
    expect(events[0].payload.at).toBeTruthy();
  });

  it("emits isTyping false when explicitly passed", () => {
    mailRealtime.clearBuffer();
    mailRealtime.sendTyping(T, { userId: "u1", threadId: "thr_x", isTyping: false });
    const events = mailRealtime.recentEvents(T, 10).filter((e: any) => e.event === "mail.typing");
    expect(events[0].payload.isTyping).toBe(false);
  });

  it("broadcasts to the tenant room when io is wired", () => {
    const rooms: string[] = [];
    const fakeIO = {
      to: (room: string) => ({ emit: (_ev: string, _pl: any) => rooms.push(room) }),
    };
    mailRealtime.setIO(fakeIO);
    mailRealtime.clearBuffer();
    mailRealtime.sendTyping(T, { userId: "u1", threadId: "thr_x" });
    expect(rooms).toEqual([`tenant:${T}`]);
    mailRealtime.setIO(null);
  });
});

describe("bidirectional presence broadcast", () => {
  it("throws when userId is missing", () => {
    expect(() => mailRealtime.sendPresence(T, {})).toThrow(/userId is required/);
  });

  it("rejects invalid status values", () => {
    expect(() => mailRealtime.sendPresence(T, { userId: "u1", status: "sleeping" })).toThrow(/Invalid presence status/);
    expect(() => mailRealtime.sendPresence(T, { userId: "u1", status: "sleeping" })).toThrow(/online, away, busy, offline/);
  });

  it("defaults to online and buffers the event", () => {
    mailRealtime.clearBuffer();
    const res = mailRealtime.sendPresence(T, { userId: "u1" });
    expect(res.status).toBe("online");
    expect(res.summary).toContain("u1 is now online");
    const events = mailRealtime.recentEvents(T, 10).filter((e: any) => e.event === "mail.presence");
    expect(events).toHaveLength(1);
    expect(events[0].payload.status).toBe("online");
  });

  it("carries the viewing subject when provided", () => {
    mailRealtime.clearBuffer();
    const res = mailRealtime.sendPresence(T, { userId: "u2", status: "busy", viewingSubject: "Q3 invoice attached" });
    expect(res.status).toBe("busy");
    expect(res.viewingSubject).toBe("Q3 invoice attached");
    const events = mailRealtime.recentEvents(T, 10).filter((e: any) => e.event === "mail.presence");
    expect(events[0].payload.viewingSubject).toBe("Q3 invoice attached");
  });

  it("accepts all four statuses", () => {
    for (const s of ["online", "away", "busy", "offline"]) {
      const res = mailRealtime.sendPresence(T, { userId: "u3", status: s });
      expect(res.status).toBe(s);
    }
  });
});

describe("bidirectional cursor broadcast", () => {
  it("throws when userId or threadId is missing", () => {
    expect(() => mailRealtime.sendCursor(T, { userId: "u1" })).toThrow(/userId and threadId are required/);
    expect(() => mailRealtime.sendCursor(T, { threadId: "thr_x" })).toThrow(/userId and threadId are required/);
  });

  it("emits cursor position with the provided position", () => {
    mailRealtime.clearBuffer();
    const res = mailRealtime.sendCursor(T, { userId: "u1", threadId: "thr_x", position: 42 });
    expect(res.position).toBe(42);
    expect(res.summary).toContain("cursor at 42");
    const events = mailRealtime.recentEvents(T, 10).filter((e: any) => e.event === "mail.cursor_position");
    expect(events).toHaveLength(1);
    expect(events[0].payload.position).toBe(42);
  });

  it("clamps negative or non-numeric positions to 0", () => {
    const neg = mailRealtime.sendCursor(T, { userId: "u1", threadId: "thr_x", position: -5 });
    expect(neg.position).toBe(0);
    const zero = mailRealtime.sendCursor(T, { userId: "u1", threadId: "thr_x", position: "abc" });
    expect(zero.position).toBe(0);
  });
});

describe("server-side collaboration emits", () => {
  it("emits mail.comment_added when a comment is posted", () => {
    mailRealtime.clearBuffer();
    const msgs = mailMessage.listMessages(T, { folder: "inbox" });
    const target = msgs.messages.find((m: any) => m.subject.includes("invoice"));
    const res = mailCollab.addComment(T, target._id, { text: "Approved, let's send", author: "u_approver" });
    const events = mailRealtime.recentEvents(T, 10).filter((e: any) => e.event === "mail.comment_added");
    expect(events).toHaveLength(1);
    expect(events[0].payload.messageId).toBe(target._id);
    expect(events[0].payload.commentId).toBe(res.commentId);
    expect(events[0].payload.author).toBe("u_approver");
    expect(events[0].payload.subject).toContain("invoice");
    expect(events[0].payload.text).toBe("Approved, let's send");
  });

  it("emits mail.reaction_added when a reaction is added", () => {
    mailRealtime.clearBuffer();
    const msgs = mailMessage.listMessages(T, { folder: "inbox" });
    const target = msgs.messages.find((m: any) => m.subject.includes("invoice"));
    const res = mailCollab.addReaction(T, target._id, { emoji: "👍", user: "u_fan" });
    const events = mailRealtime.recentEvents(T, 10).filter((e: any) => e.event === "mail.reaction_added");
    expect(events).toHaveLength(1);
    expect(events[0].payload.messageId).toBe(target._id);
    expect(events[0].payload.reactionId).toBe(res.reactionId);
    expect(events[0].payload.emoji).toBe("👍");
    expect(events[0].payload.user).toBe("u_fan");
  });

  it("does not emit reaction events for removals", () => {
    mailRealtime.clearBuffer();
    const msgs = mailMessage.listMessages(T, { folder: "inbox" });
    const target = msgs.messages.find((m: any) => m.subject.includes("invoice"));
    mailCollab.removeReaction(T, target._id, { emoji: "👍", user: "u_fan" });
    const events = mailRealtime.recentEvents(T, 10).filter((e: any) => e.event === "mail.reaction_added");
    expect(events).toHaveLength(0);
  });

  it("emits mail.voice_note when a voice note is created", () => {
    mailRealtime.clearBuffer();
    const msgs = mailMessage.listMessages(T2, { folder: "inbox" });
    const target = msgs.messages.find((m: any) => m.subject.includes("Voice"));
    const res = mailVoiceNote.createVoiceNote(T2, { messageId: target._id, durationSec: 90 });
    const events = mailRealtime.recentEvents(T2, 10).filter((e: any) => e.event === "mail.voice_note");
    expect(events).toHaveLength(1);
    expect(events[0].payload.messageId).toBe(target._id);
    expect(events[0].payload.noteId).toBe(res.noteId);
    expect(events[0].payload.durationSec).toBe(90);
    expect(events[0].payload.subject).toContain("Voice");
  });

  it("emits comment events even without io wired (buffered)", () => {
    mailRealtime.clearBuffer();
    mailRealtime.setIO(null);
    const msgs = mailMessage.listMessages(T, { folder: "inbox" });
    mailCollab.addComment(T, msgs.messages[0]._id, { text: "buffered check", author: "u_buf" });
    const events = mailRealtime.recentEvents(T, 10).filter((e: any) => e.event === "mail.comment_added");
    expect(events).toHaveLength(1);
  });
});

describe("overview + log with extended catalog", () => {
  it("overview exposes the 14-event catalog and counts new events", () => {
    mailRealtime.clearBuffer();
    mailRealtime.sendPresence(T, { userId: "u1", status: "busy" });
    mailRealtime.sendTyping(T, { userId: "u1", threadId: "thr_x" });
    mailRealtime.sendCursor(T, { userId: "u1", threadId: "thr_x", position: 7 });
    const overview = mailRealtime.realtimeOverview(T);
    expect(overview.eventCatalog).toHaveLength(14);
    expect(overview.counts["mail.presence"]).toBe(1);
    expect(overview.counts["mail.typing"]).toBe(1);
    expect(overview.counts["mail.cursor_position"]).toBe(1);
    expect(overview.total).toBe(3);
    expect(overview.summary).toContain("3 mail event(s)");
  });

  it("realtimeLog carries the broadcast payloads", () => {
    const log = mailRealtime.realtimeLog(T, 25);
    const typing = log.log.find((l: any) => l.event === "mail.typing");
    expect(typing).toBeTruthy();
    expect(typing.userId).toBe("u1");
    expect(typing.at).toBeTruthy();
  });

  it("presence payload round-trips through the log", () => {
    mailRealtime.clearBuffer();
    mailRealtime.sendPresence(T, { userId: "u9", status: "away", viewingSubject: "Q3 invoice attached" });
    const log = mailRealtime.realtimeLog(T, 25);
    const presence = log.log.find((l: any) => l.event === "mail.presence");
    expect(presence.status).toBe("away");
    expect(presence.viewingSubject).toBe("Q3 invoice attached");
  });
});
