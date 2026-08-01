import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailboxService } from "../services/MailboxService";
import { MailMessageService } from "../services/MailMessageService";
import { MailRulesService } from "../services/MailRulesService";
import { MailVoiceNoteService } from "../services/MailVoiceNoteService";
import { MailMultimodalService } from "../services/MailMultimodalService";
import { MailNeuralService } from "../services/MailNeuralService";

const mailboxes = new MailboxService();
const mail = new MailMessageService();
const rules = new MailRulesService();
const voice = new MailVoiceNoteService();
const multimodal = new MailMultimodalService();
const neural = new MailNeuralService();
const T = "nova-mail5";

let workId = "";
let msgInvoiceId = "";
let msgChecklistId = "";
let msgUrgentId = "";

beforeAll(() => {
  const work = mailboxes.createMailbox(T, { name: "Nova Voice", type: "work", email: "nova@n0va.voice", plan: "business" });
  workId = work.mailboxId;

  const r1 = mail.receiveMessage(T, workId, {
    from: { name: "John Smith", email: "john.smith@partner.com" },
    subject: "Q3 invoice attached",
    body: "Hi, please find the Q3 invoice attached. This needs approval from finance.",
    importance: "high",
    attachments: [{ name: "q3-invoice.pdf", sizeBytes: 245760, type: "pdf" }],
  });
  msgInvoiceId = r1.message._id;

  const now = Date.now();

  DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: workId, threadId: "thr_nl_1", messageId: "<nl1@n0va.mail>",
    from: { name: "Promo Desk", email: "promo@shop.xyz" }, to: [{ name: "Nova", email: "nova@n0va.voice" }],
    subject: "Weekly deals inside", body: "Check out this week's deals on the platform.",
    folder: "inbox", labels: [], read: false, attachments: [], receivedAt: new Date(now - 2 * 86400000).toISOString(), importance: "normal",
    ai: { category: "newsletter" },
  });
  DataStore.mem().findOne("messages", (m: any) => m.threadId === "thr_nl_1");
  DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: workId, threadId: "thr_nl_2", messageId: "<nl2@n0va.mail>",
    from: { name: "Promo Desk", email: "promo@shop.xyz" }, to: [{ name: "Nova", email: "nova@n0va.voice" }],
    subject: "Flash sale alert", body: "48 hours only — don't miss the flash sale.",
    folder: "inbox", labels: [], read: true, attachments: [], receivedAt: new Date(now - 9 * 86400000).toISOString(), importance: "normal",
    ai: { category: "newsletter" },
  });
  DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: workId, threadId: "thr_nl_3", messageId: "<nl3@n0va.mail>",
    from: { name: "Promo Desk", email: "promo@shop.xyz" }, to: [{ name: "Nova", email: "nova@n0va.voice" }],
    subject: "Your weekly roundup", body: "Here is what you missed this week.",
    folder: "inbox", labels: [], read: true, attachments: [], receivedAt: new Date(now - 16 * 86400000).toISOString(), importance: "normal",
    ai: { category: "newsletter" },
  });

  DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: workId, threadId: "thr_tasks", messageId: "<tasks@n0va.mail>",
    from: { name: "Ops Lead", email: "ops@one.com" }, to: [{ name: "Nova", email: "nova@n0va.voice" }],
    subject: "Action items from sync", body: "Please take care of:\n- [ ] Prepare Q4 deck\n- [x] Ship the mail module\n- [ ] Book the demo room",
    folder: "inbox", labels: [], read: false, attachments: [], receivedAt: new Date(now - 86400000).toISOString(), importance: "normal",
  });
  msgChecklistId = DataStore.mem().findOne("messages", (m: any) => m.threadId === "thr_tasks")._id;

  DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: workId, threadId: "thr_urgent", messageId: "<urgent@n0va.mail>",
    from: { name: "Compliance", email: "compliance@corp.com" }, to: [{ name: "Nova", email: "nova@n0va.voice" }],
    subject: "URGENT: compliance deadline", body: "Action required immediately — the deadline is today. Please respond asap.",
    folder: "inbox", labels: [], read: false, attachments: [], receivedAt: new Date(now - 2 * 3600000).toISOString(), importance: "high",
  });
  msgUrgentId = DataStore.mem().findOne("messages", (m: any) => m.threadId === "thr_urgent")._id;

  DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: workId, threadId: "thr_stale_old", messageId: "<oldread@n0va.mail>",
    from: { name: "Old Client", email: "old@client.com" }, to: [{ name: "Nova", email: "nova@n0va.voice" }],
    subject: "Old read request", body: "Thanks for the update.",
    folder: "inbox", labels: [], read: true, attachments: [], receivedAt: new Date(now - 40 * 86400000).toISOString(), importance: "normal",
  });

  DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: workId, threadId: "thr_stale_unanswered", messageId: "<stale35@n0va.mail>",
    from: { name: "Partner", email: "partner@acme.com" }, to: [{ name: "Nova", email: "nova@n0va.voice" }],
    subject: "Proposal follow-up", body: "Waiting on your decision.",
    folder: "inbox", labels: [], read: false, attachments: [], receivedAt: new Date(now - 35 * 86400000).toISOString(), importance: "normal",
    awaitingResponse: true,
  });
});

describe("MailVoiceNoteService (Round 20)", () => {
  it("validates messageId and attaches a note to a real message", () => {
    expect(() => voice.createVoiceNote(T, {})).toThrow(/messageId/);
    expect(() => voice.createVoiceNote(T, { messageId: "nope" })).toThrow(/not found/);
    const note = voice.createVoiceNote(T, {
      messageId: msgInvoiceId, durationSec: 90, language: "en",
      transcript: "Hi, please review the invoice and approve it by Friday. Schedule a follow-up call.",
    });
    expect(note.noteId).toBeTruthy();
    expect(note.messageId).toBe(msgInvoiceId);
    expect(note.durationSec).toBe(90);
    expect(note.language).toBe("en");
  });

  it("enriches notes with emotion, speakers, confidence and action items", () => {
    const note = voice.createVoiceNote(T, {
      messageId: msgInvoiceId, durationSec: 60,
      transcript: "Please review the invoice and approve it. Let's schedule a call to confirm next steps and share the draft.",
    });
    expect(["joy", "anger", "sadness", "neutral", "excitement"]).toContain(note.emotion);
    expect(note.speakers.length).toBeGreaterThanOrEqual(1);
    expect(note.speakers[0].name).toBe("Speaker A");
    expect(note.confidence).toBeGreaterThanOrEqual(78);
    expect(note.confidence).toBeLessThanOrEqual(97);
    expect(note.actionItems.length).toBeGreaterThanOrEqual(1);
    expect(note.actionItems[0]).toMatch(/Follow up:/);
    expect(note.summary.length).toBeGreaterThan(10);
  });

  it("generates a synthetic transcript when none is provided", () => {
    const note = voice.createVoiceNote(T, { messageId: msgInvoiceId, durationSec: 45 });
    expect(note.transcript).toContain("Speaker A");
    expect(note.generateTranscript).toBe(true);
  });

  it("is deterministic — identical inputs produce identical enrichment", () => {
    const a = voice.createVoiceNote(T, { messageId: msgInvoiceId, durationSec: 30, transcript: "Approve the budget and share the deck." });
    const b = voice.createVoiceNote(T, { messageId: msgInvoiceId, durationSec: 30, transcript: "Approve the budget and share the deck." });
    expect(a.emotion).toBe(b.emotion);
    expect(a.confidence).toBe(b.confidence);
    expect(a.speakers.map((s: any) => s.segments)).toEqual(b.speakers.map((s: any) => s.segments));
  });

  it("lists voice notes with message/mailbox filters and limit", () => {
    const all = voice.listVoiceNotes(T);
    expect(all.total).toBeGreaterThanOrEqual(4);
    const byMsg = voice.listVoiceNotes(T, { messageId: msgInvoiceId });
    expect(byMsg.notes.every((n: any) => n.messageId === msgInvoiceId)).toBe(true);
    const byMbx = voice.listVoiceNotes(T, { mailboxId: workId });
    expect(byMbx.total).toBe(all.total);
    const limited = voice.listVoiceNotes(T, { limit: 2 });
    expect(limited.notes.length).toBe(2);
  });

  it("gets a single note and rejects other tenants", () => {
    const first = voice.listVoiceNotes(T).notes[0];
    const got = voice.getVoiceNote(T, first._id);
    expect(got._id).toBe(first._id);
    expect(() => voice.getVoiceNote("other-tenant", first._id)).toThrow(/not found/);
  });

  it("deletes a voice note", () => {
    const note = voice.createVoiceNote(T, { messageId: msgInvoiceId, durationSec: 10, transcript: "Temp note to delete." });
    const del = voice.deleteVoiceNote(T, note.noteId);
    expect(del.summary).toMatch(/deleted/i);
    expect(() => voice.getVoiceNote(T, note.noteId)).toThrow(/not found/);
  });

  it("produces a dashboard with emotion mix, top speakers and action items", () => {
    const dash = voice.voiceNoteDashboard(T);
    expect(dash.totalNotes).toBeGreaterThanOrEqual(4);
    expect(dash.totalMinutes).toBeGreaterThan(0);
    expect(dash.emotionMix).toBeTruthy();
    expect(dash.topSpeakers.length).toBeGreaterThanOrEqual(1);
    expect(dash.actionItems.length).toBeGreaterThanOrEqual(1);
    expect(dash.summary).toMatch(/voice note/);
  });

  it("clamps duration to at least 1 second", () => {
    const note = voice.createVoiceNote(T, { messageId: msgInvoiceId, durationSec: 0 });
    expect(note.durationSec).toBeGreaterThanOrEqual(1);
  });

  it("writes to the voice log on record and delete", () => {
    const log = DataStore.mem().find("mail_voice_log", (l: any) => l.tenantId === T);
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log.some((l: any) => l.action === "recorded")).toBe(true);
  });

  it("skips transcript generation when generateTranscript is false", () => {
    const note = voice.createVoiceNote(T, { messageId: msgInvoiceId, durationSec: 20, generateTranscript: false, transcript: "Short." });
    expect(note.summary).toMatch(/transcript not generated/);
  });
});

describe("MailMultimodalService (Round 20)", () => {
  it("attaches a video with chapters and auto-summary", () => {
    const v = multimodal.attachVideo(T, { messageId: msgInvoiceId, title: "Q3 Walkthrough", url: "https://v.n0va/q3", durationSec: 300 });
    expect(v.type).toBe("video");
    expect(v.chapters.length).toBeGreaterThanOrEqual(3);
    expect(v.chapters[0].startSec).toBe(0);
    expect(v.transcriptSummary).toMatch(/chapters/);
    expect(v.processing).toBe("enriched");
  });

  it("validates video title and messageId", () => {
    expect(() => multimodal.attachVideo(T, {})).toThrow(/title/);
    expect(() => multimodal.attachVideo(T, { title: "X", messageId: "nope" })).toThrow(/not found/);
    const detached = multimodal.attachVideo(T, { title: "Standalone", durationSec: 60 });
    expect(detached.messageId).toBeNull();
  });

  it("processes a screen recording with compression, OCR and steps", () => {
    const r = multimodal.attachScreenRecording(T, { messageId: msgInvoiceId, title: "Bug repro", sizeMB: 200 });
    expect(r.type).toBe("screen_recording");
    expect(r.compressionPct).toBeGreaterThanOrEqual(40);
    expect(r.compressionPct).toBeLessThanOrEqual(94);
    expect(r.steps.length).toBeGreaterThanOrEqual(3);
    expect(r.uiElements.length).toBeGreaterThanOrEqual(3);
    expect(r.ocrText).toMatch(/detected/);
  });

  it("detects code language and line count", () => {
    const ts = multimodal.attachCodeSnippet(T, { name: "api.ts", code: "interface User { id: string }\nconst u: any[] = []" });
    expect(ts.language).toBe("TypeScript");
    expect(ts.lineCount).toBe(2);
    const sql = multimodal.attachCodeSnippet(T, { name: "q.sql", code: "SELECT * FROM users WHERE id = 1" });
    expect(sql.language).toBe("SQL");
  });

  it("scans code snippets for vulnerabilities", () => {
    const bad = multimodal.attachCodeSnippet(T, { name: "unsafe.js", code: "const x = eval(userInput);\ndocument.body.innerHTML = x;" });
    expect(bad.vulnerabilities.length).toBeGreaterThanOrEqual(2);
    const clean = multimodal.attachCodeSnippet(T, { name: "clean.ts", code: "export const sum = (a: number, b: number) => a + b;" });
    expect(clean.vulnerabilities.length).toBe(0);
  });

  it("creates polls with validation", () => {
    expect(() => multimodal.createPoll(T, {})).toThrow(/question/);
    expect(() => multimodal.createPoll(T, { question: "Q", options: ["only one"] })).toThrow(/2 options/);
    const p = multimodal.createPoll(T, { messageId: msgInvoiceId, question: "Which day for the review?", options: ["Mon", "Tue", "Wed"] });
    expect(p.options.length).toBe(3);
    expect(p.status).toBe("open");
  });

  it("tallies votes with per-voter dedupe", () => {
    const p = multimodal.createPoll(T, { question: "Ship now?", options: ["Yes", "No"] });
    const v1 = multimodal.votePoll(T, p.pollId, 0, "user_001");
    expect(v1.totalVotes).toBe(1);
    multimodal.votePoll(T, p.pollId, 1, "user_002");
    expect(() => multimodal.votePoll(T, p.pollId, 1, "user_001")).toThrow(/already voted/);
    expect(() => multimodal.votePoll(T, p.pollId, 5, "user_003")).toThrow(/out of range/);
    const closed = multimodal.createPoll(T, { question: "Closed q?", options: ["A", "B"], status: "closed" });
    expect(() => multimodal.votePoll(T, closed.pollId, 0, "user_003")).toThrow(/closed/);
  });

  it("reports poll results with percentages and sentiment", () => {
    const p = multimodal.createPoll(T, { question: "Lunch preference?", options: ["Pizza", "Sushi", "Salad"] });
    multimodal.votePoll(T, p.pollId, 0, "u1");
    multimodal.votePoll(T, p.pollId, 0, "u2");
    multimodal.votePoll(T, p.pollId, 1, "u3");
    const res = multimodal.pollResults(T, p.pollId);
    expect(res.totalVotes).toBe(3);
    expect(res.options[0].pct).toBe(67);
    expect(res.options.reduce((a: number, o: any) => a + o.pct, 0)).toBe(100);
    expect(["positive", "neutral", "negative"]).toContain(res.sentiment);
    expect(["rising", "stable"]).toContain(res.trend);
  });

  it("closes polls", () => {
    const p = multimodal.createPoll(T, { question: "Close me?", options: ["A", "B"] });
    const closed = multimodal.closePoll(T, p.pollId);
    expect(closed.status).toBe("closed");
  });

  it("lists and filters content blocks", () => {
    const all = multimodal.listContentBlocks(T);
    expect(all.total).toBeGreaterThanOrEqual(5);
    const vids = multimodal.listContentBlocks(T, { type: "video" });
    expect(vids.blocks.every((b: any) => b.type === "video")).toBe(true);
    const byMsg = multimodal.listContentBlocks(T, { messageId: msgInvoiceId });
    expect(byMsg.blocks.length).toBeGreaterThanOrEqual(1);
  });

  it("gets and deletes content blocks", () => {
    const block = multimodal.listContentBlocks(T).blocks[0];
    const got = multimodal.getContentBlock(T, block._id);
    expect(got._id).toBe(block._id);
    const del = multimodal.deleteContentBlock(T, block._id);
    expect(del.summary).toMatch(/deleted/);
    expect(() => multimodal.getContentBlock(T, block._id)).toThrow(/not found/);
  });

  it("aggregates a multimodal dashboard", () => {
    const dash = multimodal.multimodalDashboard(T);
    expect(dash.blocks).toBeGreaterThanOrEqual(4);
    expect(dash.byType.video).toBeGreaterThanOrEqual(1);
    expect(dash.polls).toBeGreaterThanOrEqual(4);
    expect(dash.totalVotes).toBeGreaterThanOrEqual(3);
    expect(dash.summary).toMatch(/content block/);
  });
});

describe("MailRulesService.aiGenerateRule (Round 20)", () => {
  it("requires natural language input", () => {
    expect(() => rules.aiGenerateRule(T, "")).toThrow(/natural language/);
  });

  it("parses archive + newsletter category", () => {
    const r = rules.aiGenerateRule(T, "Archive all emails from marketing newsletters and mark them read");
    expect(r.actions.some((a: any) => a.action === "archive")).toBe(true);
    expect(r.actions.some((a: any) => a.action === "mark_read")).toBe(true);
    expect(r.conditions.some((c: any) => c.field === "category" && c.value === "newsletter")).toBe(true);
    expect(r.enabled).toBe(true);
  });

  it("parses label + move + forward + star intents", () => {
    const label = rules.aiGenerateRule(T, "Label them as Invoices");
    expect(label.actions.some((a: any) => a.action === "label" && a.target === "invoices")).toBe(true);
    const move = rules.aiGenerateRule(T, "Move them to Social");
    expect(move.actions.some((a: any) => a.action === "move" && a.target === "social")).toBe(true);
    const fwd = rules.aiGenerateRule(T, "Forward to accounts@company.com and star it");
    expect(fwd.actions.some((a: any) => a.action === "forward" && a.target === "accounts@company.com")).toBe(true);
    expect(fwd.actions.some((a: any) => a.action === "star")).toBe(true);
  });

  it("parses importance and attachment conditions", () => {
    const r = rules.aiGenerateRule(T, "Notify on high importance emails with attachments");
    expect(r.conditions.some((c: any) => c.field === "importance" && c.value === "high")).toBe(true);
    expect(r.conditions.some((c: any) => c.field === "has_attachment")).toBe(true);
    expect(r.actions.some((a: any) => a.action === "notify")).toBe(true);
  });

  it("parses quoted subject keywords and from-addresses", () => {
    const quoted = rules.aiGenerateRule(T, 'Archive anything with "budget" in the subject');
    expect(quoted.conditions.some((c: any) => c.field === "subject" && c.value === "budget")).toBe(true);
    const from = rules.aiGenerateRule(T, "Label emails from @partner.com");
    expect(from.conditions.some((c: any) => c.field === "from" && c.value === "@partner.com")).toBe(true);
  });

  it("falls back to defaults for vague text", () => {
    const r = rules.aiGenerateRule(T, "deal with the noise please");
    expect(r.conditions.length).toBeGreaterThanOrEqual(1);
    expect(r.actions.length).toBeGreaterThanOrEqual(1);
    expect(r.conditions[0].field).toBe("subject");
  });

  it("test_before_enable keeps the rule paused and runs a dry run", () => {
    const r = rules.aiGenerateRule(T, "Archive all marketing newsletters", { testBeforeEnable: true });
    expect(r.enabled).toBe(false);
    expect(r.test.tested).toBe(true);
    expect(typeof r.test.wouldMatch).toBe("number");
    expect(r.test.scanned).toBeGreaterThan(0);
    expect(r.summary).toMatch(/dry run/);
  });

  it("generated rule actually matches real messages when evaluated", () => {
    const probe = DataStore.mem().insert("messages", {
      tenantId: T, mailboxId: workId, threadId: "thr_probe_nl", messageId: "<probe@n0va.mail>",
      from: { name: "Probe", email: "probe@probe.co" }, to: [{ name: "Nova", email: "nova@n0va.voice" }],
      subject: "Probe newsletter", body: "Probe body",
      folder: "inbox", labels: [], read: false, attachments: [], receivedAt: new Date().toISOString(), importance: "normal",
      ai: { category: "newsletter" },
    });
    const r = rules.aiGenerateRule(T, "Archive all marketing newsletters");
    const match = rules.evaluateRule(T, r.ruleId, probe._id);
    expect(match.matched).toBe(true);
    expect(match.applied).toContain("archived");
    const invoice = rules.evaluateRule(T, r.ruleId, msgInvoiceId);
    expect(invoice.matched).toBe(false);
  });

  it("delete intent maps to trash and appears in listRules", () => {
    const r = rules.aiGenerateRule(T, "Delete all social notifications");
    expect(r.actions.some((a: any) => a.action === "move" && a.target === "trash")).toBe(true);
    expect(rules.listRules(T).some((x: any) => x._id === r.ruleId)).toBe(true);
  });
});

describe("MailMessageService.batchOps (Round 20)", () => {
  it("validates inputs", () => {
    expect(() => mail.batchOps(T, "", ["a"])).toThrow(/operation/);
    expect(() => mail.batchOps(T, "archive", [])).toThrow(/non-empty/);
    expect(() => mail.batchOps(T, "nonsense", ["a"])).toThrow(/Unknown batch operation/);
  });

  it("moves a batch to a destination folder", () => {
    const ids = [msgInvoiceId, msgChecklistId];
    const res = mail.batchOps(T, "move", ids, { destination: "archive" });
    expect(res.processed).toBe(2);
    expect(res.skipped).toBe(0);
    expect(mail.getMessage(T, msgInvoiceId).folder).toBe("archive");
    expect(mail.getMessage(T, msgChecklistId).folder).toBe("archive");
    expect(res.summary).toMatch(/move to "archive"/);
  });

  it("archives and restores batches", () => {
    const res = mail.batchOps(T, "archive", [msgInvoiceId]);
    expect(mail.getMessage(T, msgInvoiceId).folder).toBe("archive");
    const restored = mail.batchOps(T, "restore", [msgInvoiceId]);
    expect(mail.getMessage(T, msgInvoiceId).folder).toBe("inbox");
  });

  it("trashes and restores batches", () => {
    mail.batchOps(T, "trash", [msgChecklistId]);
    expect(mail.getMessage(T, msgChecklistId).folder).toBe("trash");
    mail.batchOps(T, "restore", [msgChecklistId]);
    expect(mail.getMessage(T, msgChecklistId).folder).toBe("inbox");
  });

  it("deletes a batch permanently", () => {
    const r1 = mail.receiveMessage(T, workId, { from: { name: "Temp", email: "temp@x.com" }, subject: "Batch delete me", body: "gone soon" });
    const r2 = mail.receiveMessage(T, workId, { from: { name: "Temp2", email: "temp2@x.com" }, subject: "Batch delete me 2", body: "gone too" });
    const res = mail.batchOps(T, "delete", [r1.message._id, r2.message._id]);
    expect(res.processed).toBe(2);
    expect(() => mail.getMessage(T, r1.message._id)).toThrow(/not found/);
  });

  it("stars/unstars and marks read/unread in batch", () => {
    const ids = [msgInvoiceId, msgChecklistId];
    mail.batchOps(T, "star", ids);
    expect(mail.getMessage(T, msgInvoiceId).starred).toBe(true);
    expect(mail.getMessage(T, msgChecklistId).starred).toBe(true);
    mail.batchOps(T, "unstar", ids);
    expect(mail.getMessage(T, msgInvoiceId).starred).toBe(false);
    mail.batchOps(T, "mark_read", ids);
    expect(mail.getMessage(T, msgInvoiceId).read).toBe(true);
    mail.batchOps(T, "mark_unread", [msgInvoiceId]);
    expect(mail.getMessage(T, msgInvoiceId).read).toBe(false);
  });

  it("applies and removes labels in batch", () => {
    mail.batchOps(T, "apply_label", [msgInvoiceId, msgChecklistId], { label: "Batch" });
    expect(mail.getMessage(T, msgInvoiceId).labels).toContain("Batch");
    expect(mail.getMessage(T, msgChecklistId).labels).toContain("Batch");
    expect(() => mail.batchOps(T, "apply_label", [msgInvoiceId], {})).toThrow(/label/);
    mail.batchOps(T, "remove_label", [msgInvoiceId], { label: "Batch" });
    expect(mail.getMessage(T, msgInvoiceId).labels).not.toContain("Batch");
  });

  it("reports skipped ids and affected subjects", () => {
    const res = mail.batchOps(T, "star", [msgInvoiceId, "ghost_id"]);
    expect(res.processed).toBe(1);
    expect(res.skipped).toBe(1);
    expect(res.affected.length).toBe(1);
    expect(res.summary).toMatch(/1 skipped/);
  });
});

describe("MailNeuralService (Round 20)", () => {
  it("builds an auto-priority queue of unread inbox messages sorted by importance", () => {
    const overview = neural.neuralOverview(T);
    expect(overview.autoPriority.length).toBeGreaterThanOrEqual(1);
    expect(overview.autoPriority.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < overview.autoPriority.length; i++) {
      expect(overview.autoPriority[i - 1].predictedImportance).toBeGreaterThanOrEqual(overview.autoPriority[i].predictedImportance);
    }
    expect(overview.autoPriority.some((m: any) => m.subject === "URGENT: compliance deadline")).toBe(true);
  });

  it("suggests draft replies for top messages", () => {
    const s = neural.smartDraftSuggestions(T);
    expect(s.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(s.suggestions[0].suggestedReply.length).toBeGreaterThan(10);
    expect(["concise", "warm"]).toContain(s.suggestions[0].tone);
  });

  it("extracts checklist tasks from email bodies", () => {
    const tasks = neural.taskExtraction(T);
    expect(tasks.total).toBeGreaterThanOrEqual(2);
    const texts = tasks.tasks.map(t => t.task);
    expect(texts).toContain("Prepare Q4 deck");
    expect(texts).toContain("Book the demo room");
  });

  it("flags declining-value newsletter senders for unsubscribe", () => {
    const unsub = neural.predictiveUnsubscribe(T);
    const promo = unsub.offers.find((o: any) => o.sender === "promo@shop.xyz");
    expect(promo).toBeTruthy();
    expect(promo.messages).toBe(3);
    expect(promo.engagementScore).toBeLessThan(40);
    expect(promo.recommendation).toMatch(/unsubscribe/);
    expect(unsub.offers.every((o: any) => o.messages >= 3)).toBe(true);
  });

  it("finds read, old, low-priority messages for smart archive and can apply it", () => {
    const found = neural.smartArchive(T);
    expect(found.total).toBeGreaterThanOrEqual(1);
    expect(found.candidates.some((c: any) => c.subject === "Old read request")).toBe(true);
    const applied = neural.smartArchive(T, { apply: true });
    expect(applied.applied).toBe(found.total);
    expect(DataStore.mem().find("messages", (m: any) => m.tenantId === T && m.subject === "Old read request")[0].folder).toBe("archive");
  });

  it("alerts on stale conversations", () => {
    const health = neural.conversationHealth(T);
    expect(health.alerts.length).toBeGreaterThanOrEqual(1);
    expect(health.alerts.some((a: any) => a.subject === "Proposal follow-up" && a.level === "critical")).toBe(true);
    expect(health.alerts.every((a: any) => a.ageDays >= 7)).toBe(true);
  });

  it("escalates urgent high-importance mail to human review", () => {
    const esc = neural.escalationQueue(T);
    expect(esc.total).toBeGreaterThanOrEqual(1);
    expect(esc.queue.some((m: any) => m.subject === "URGENT: compliance deadline")).toBe(true);
    expect(esc.queue[0].urgencyScore).toBeGreaterThanOrEqual(70);
  });

  it("records learning-loop accept/reject and aggregates the dashboard", () => {
    expect(() => neural.learningLoop(T, "maybe", { subject: "x" })).toThrow(/accept or reject/);
    const acc = neural.learningLoop(T, "accept", { subject: "URGENT: compliance deadline", suggestion: "archive it" });
    expect(acc.summary).toMatch(/accepted/);
    neural.learningLoop(T, "reject", { subject: "Weekly deals inside", suggestion: "mark read" });
    const dash = neural.neuralMailboxDashboard(T);
    expect(dash.recentActions.length).toBeGreaterThanOrEqual(2);
    expect(dash.attention).toBeTruthy();
    expect(dash.summary).toMatch(/inbox messages/);
    const log = DataStore.mem().find("mail_neural_log", (l: any) => l.tenantId === T);
    expect(log.some((l: any) => l.category === "learning_accept")).toBe(true);
  });
});
