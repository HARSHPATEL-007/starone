import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailboxService } from "../services/MailboxService";
import { MailSearchOperatorsService } from "../services/MailSearchOperatorsService";
import { MailAbuseService } from "../services/MailAbuseService";

const mailboxes = new MailboxService();
const search = new MailSearchOperatorsService();
const abuse = new MailAbuseService();
const T = "nova-mail8";

let mbId = "";
let mbAbuse = "";
let mbCalm = "";
const now = Date.now();

function seedMessage(partial: any) {
  DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: partial.mailboxId || mbId, threadId: partial.threadId || `thr_${partial._id}`,
    messageId: `<${partial._id}@r8.io>`,
    from: partial.from || { name: "Nova", email: "nova@r8.io" },
    to: partial.to || [{ name: "Nova", email: "nova@r8.io" }],
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
  const mb = mailboxes.createMailbox(T, { name: "Nova Search", type: "work", email: "nova@r8.io", plan: "business" });
  mbId = mb.mailboxId;
  mbAbuse = mailboxes.createMailbox(T, { name: "Nova Abuse", type: "work", email: "abuse@r8.io", plan: "business" }).mailboxId;
  mbCalm = mailboxes.createMailbox(T, { name: "Nova Calm", type: "work", email: "calm@r8.io", plan: "business" }).mailboxId;

  seedMessage({
    _id: "r8_john", from: { name: "John Smith", email: "john.smith@partner.com" },
    subject: "Budget review Q3", body: "Meeting prep for the budget review tomorrow.",
    labels: ["work"], read: false, starred: true,
    attachments: [{ name: "q3.pdf", type: "pdf", sizeBytes: 2 * 1024 * 1024 }],
    receivedAt: new Date(now - 86400000).toISOString(), importance: "high",
    ai: { priority: "high", category: "finance", sentiment: "negative" },
  });
  seedMessage({
    _id: "r8_news", from: { name: "News Desk", email: "news@daily.io" },
    subject: "Weekly newsletter", body: "This week's top stories.", labels: ["newsletter"], read: true,
    receivedAt: new Date(now - 2 * 86400000).toISOString(),
    ai: { priority: "low", category: "newsletter", sentiment: "neutral" },
  });
  seedMessage({
    _id: "r8_invoice", from: { name: "Billing", email: "billing@vendo.co" },
    subject: "Invoice #42", body: "Your invoice is attached.", read: false,
    attachments: [{ name: "invoice.pdf", type: "pdf", sizeBytes: 512 * 1024 }],
    receivedAt: new Date(now - 3 * 3600000).toISOString(), importance: "high",
    ai: { priority: "high", category: "finance", sentiment: "neutral" },
  });
  seedMessage({
    _id: "r8_sent", folder: "sent", from: { name: "Nova", email: "nova@r8.io" },
    to: [{ name: "Alpha Team", email: "team-alpha@n0va.io" }],
    subject: "Re: budget review", body: "Sounds good.", read: true,
    receivedAt: new Date(now - 86400000).toISOString(), sentAt: new Date(now - 86400000).toISOString(),
  });
  seedMessage({
    _id: "r8_old", from: { name: "Storage", email: "storage@ops.io" },
    subject: "Archive dump", body: "Legacy archive.", read: true,
    attachments: [{ name: "archive.zip", type: "zip", sizeBytes: 12 * 1024 * 1024 }],
    receivedAt: new Date(now - 40 * 86400000).toISOString(),
  });
  seedMessage({ _id: "r8_dup0", subject: "Duplicate thread beta", body: "Copy one.", read: true, threadId: "thr_r8_dup", receivedAt: new Date(now - 3 * 86400000).toISOString() });
  seedMessage({ _id: "r8_dup1", subject: "Duplicate thread beta", body: "Copy two.", read: true, threadId: "thr_r8_dup", receivedAt: new Date(now - 4 * 86400000).toISOString() });
  seedMessage({
    _id: "r8_honey", from: { name: "Spammer", email: "spam@bad.net" },
    subject: "Hello", body: "buy cheap watches", to: [{ name: "Nova", email: "nova@r8.io" }, { email: "trap@n0va.work" }],
  });
  for (let i = 0; i < 12; i++) {
    seedMessage({
      _id: `r8_burst${i}`, mailboxId: mbAbuse, from: { name: "Burst", email: "burst@fake.io" },
      subject: "Burst", body: "burst",
      receivedAt: new Date(now - 60000).toISOString(),
    });
  }
  for (let i = 0; i < 8; i++) {
    seedMessage({
      _id: `r8_sentA${i}`, mailboxId: mbAbuse, folder: "sent",
      from: { name: "Nova", email: "nova@r8.io" }, to: [{ name: "X", email: "x@io" }],
      subject: "Sent today", body: "a", read: true,
      receivedAt: new Date(now - 3600000 * i).toISOString(), sentAt: new Date(now - 3600000 * i).toISOString(),
    });
  }
  for (let i = 0; i < 2; i++) {
    seedMessage({
      _id: `r8_sentB${i}`, mailboxId: mbCalm, folder: "sent",
      from: { name: "Nova", email: "nova@r8.io" }, to: [{ name: "Y", email: "y@io" }],
      subject: "Sent today calm", body: "b", read: true,
      receivedAt: new Date(now - 3600000 * i).toISOString(), sentAt: new Date(now - 3600000 * i).toISOString(),
    });
  }
  for (let i = 0; i < 10; i++) {
    seedMessage({
      _id: `r8_sentB_old${i}`, mailboxId: mbCalm, folder: "sent",
      from: { name: "Nova", email: "nova@r8.io" }, to: [{ name: "Y", email: "y@io" }],
      subject: "Sent days ago", body: "c", read: true,
      receivedAt: new Date(now - 3 * 86400000).toISOString(), sentAt: new Date(now - 3 * 86400000).toISOString(),
    });
  }
});

describe("search operators — parser", () => {
  it("parses combined operators with free text", () => {
    const p = search.parseQuery('from:john is:unread has:attachment size:>10MB budget');
    expect(p.operators.map((o: any) => o.op)).toEqual(["from", "is", "has", "size"]);
    expect(p.freeText).toBe("budget");
    expect(p.filters.from).toBe("john");
    expect(p.filters.unread).toBe(true);
    expect(p.filters.hasAttachment).toBe(true);
    expect(p.filters.sizeCmp).toBe(">");
    expect(p.filters.sizeBytes).toBe(10 * 1024 * 1024);
    expect(p.explanation.length).toBe(5);
    expect(p.invalid.length).toBe(0);
  });

  it("handles quoted subject values", () => {
    const p = search.parseQuery('subject:"budget review"');
    expect(p.operators).toEqual([{ op: "subject", raw: 'subject:"budget review"', value: "budget review" }]);
  });

  it("flags invalid values and unknown operators", () => {
    const p = search.parseQuery("size:banana bogus:x from:");
    expect(p.invalid.length).toBe(3);
    expect(p.invalid.some((x: any) => x.op === "size" && x.reason.includes("bad size"))).toBe(true);
    expect(p.invalid.some((x: any) => x.op === "bogus" && x.reason === "unknown operator")).toBe(true);
    expect(p.invalid.some((x: any) => x.op === "from" && x.reason === "missing value")).toBe(true);
  });

  it("treats near: as slurping the rest of the query", () => {
    const p = search.parseQuery("near:meeting tomorrow with finance");
    expect(p.operators).toEqual([{ op: "near", raw: "near:meeting tomorrow with finance", value: "meeting tomorrow with finance" }]);
    expect(p.freeText).toBe("");
  });
});

describe("search operators — filtering", () => {
  it("from: filters by sender", () => {
    const r = search.operatorSearch(T, "from:john");
    expect(r.total).toBe(1);
    expect(r.messages[0]._id).toBe("r8_john");
  });

  it("subject: matches quoted phrases", () => {
    const r = search.operatorSearch(T, 'subject:"budget review"');
    expect(r.total).toBe(2);
    expect(r.messages.map((m: any) => m._id).sort()).toEqual(["r8_john", "r8_sent"]);
  });

  it("has:attachment and type: filter", () => {
    expect(search.operatorSearch(T, "has:attachment").total).toBe(3);
    const pdf = search.operatorSearch(T, "has:attachment type:pdf");
    expect(pdf.total).toBe(2);
  });

  it("in: matches folder", () => {
    const r = search.operatorSearch(T, "in:sent");
    expect(r.total).toBe(21);
  });

  it("label: filters by label", () => {
    const r = search.operatorSearch(T, "label:newsletter");
    expect(r.total).toBe(1);
    expect(r.messages[0]._id).toBe("r8_news");
  });

  it("size: with comparators", () => {
    expect(search.operatorSearch(T, "size:>10MB").total).toBe(1);
    expect(search.operatorSearch(T, "size:<1MB").total).toBe(38);
  });

  it("is:unread / is:starred", () => {
    expect(search.operatorSearch(T, "is:unread").total).toBe(15);
    const starred = search.operatorSearch(T, "is:starred");
    expect(starred.total).toBe(1);
    expect(starred.messages[0]._id).toBe("r8_john");
  });

  it("sentiment / priority / topic from ai fields", () => {
    expect(search.operatorSearch(T, "sentiment:negative").total).toBe(1);
    expect(search.operatorSearch(T, "priority:high").total).toBe(2);
    const topic = search.operatorSearch(T, "topic:finance");
    expect(topic.total).toBe(2);
  });

  it("near: matches natural language phrase", () => {
    const r = search.operatorSearch(T, "near:meeting prep");
    expect(r.total).toBe(1);
    expect(r.messages[0]._id).toBe("r8_john");
  });

  it("related: matches thread id", () => {
    const r = search.operatorSearch(T, "related:thr_r8_dup");
    expect(r.total).toBe(2);
  });

  it("date:last7d excludes old messages", () => {
    const r = search.operatorSearch(T, "date:last7d");
    expect(r.total).toBe(39);
    expect(r.messages.some((m: any) => m._id === "r8_old")).toBe(false);
  });

  it("scopes to mailboxId when provided", () => {
    const r = search.operatorSearch(T, "subject:burst", { mailboxId: mbAbuse });
    expect(r.total).toBe(12);
  });

  it("scores free text matches", () => {
    const r = search.operatorSearch(T, "budget");
    expect(r.total).toBe(2);
    expect(r.messages[0].score).toBeGreaterThanOrEqual(10);
  });
});

describe("search operators — reference & history", () => {
  it("lists the 20 operators (enhanced §3.4.2)", () => {
    const ref = search.operatorReference();
    expect(ref.operators.length).toBe(20);
    expect(ref.operators.map((o: any) => o.op)).toContain("near");
    expect(ref.operators.map((o: any) => o.example)).toContain("has:voice");
    expect(ref.operators.map((o: any) => o.example)).toContain("collaborated:with:jane@team.io");
  });

  it("runs search examples", () => {
    const ex = search.searchExamples(T);
    expect(ex.length).toBe(8);
    expect(ex.every((e: any) => typeof e.total === "number")).toBe(true);
  });

  it("tracks and clears recent queries", () => {
    const before = search.recentQueries(T);
    expect(before.total).toBeGreaterThan(0);
    const cleared = search.clearHistory(T);
    expect(cleared.cleared).toBe(before.total);
    expect(search.recentQueries(T).total).toBe(0);
  });

  it("reports operator stats coverage", () => {
    const s = search.operatorStats(T);
    expect(s.stats.length).toBe(20);
    expect(s.totalMessages).toBeGreaterThan(0);
  });
});

describe("abuse — scanIncoming verdicts", () => {
  it("quarantines spammy unknown-TLD mail with links", () => {
    const r = abuse.scanIncoming(T, {
      from: { name: "Lottery", email: "lottery@quickwin.xyz" },
      subject: "You won!",
      body: "winner prize free cash, visit https://claim.now https://verify.xyz now",
      to: [{ email: "nova@r8.io" }],
    });
    expect(r.verdict).toBe("quarantine");
    expect(r.threatScore).toBe(76);
    expect(r.layers.content.spamScore).toBe(64);
    expect(r.layers.protocol.spf).toBeTruthy();
  });

  it("delivers clean corporate mail", () => {
    const r = abuse.scanIncoming(T, {
      from: { name: "John Smith", email: "john.smith@partner.com" },
      subject: "Budget review Q3",
      body: "Meeting prep for the budget review tomorrow.",
      to: [{ email: "nova@r8.io" }],
    });
    expect(r.verdict).toBe("deliver");
    expect(r.layers.behavioral.greylisted).toBe(false);
  });

  it("rejects honeypot-addressed mail", () => {
    const r = abuse.scanIncoming(T, {
      from: { name: "Spammer", email: "spam@bad.net" },
      subject: "Hello", body: "buy cheap watches",
      to: [{ email: "trap@n0va.work" }],
    });
    expect(r.verdict).toBe("reject");
    expect(r.layers.behavioral.honeypot).toBe(true);
  });

  it("requires a from email", () => {
    expect(() => abuse.scanIncoming(T, { subject: "x" } as any)).toThrow(/from/);
  });
});

describe("abuse — BEC, DLP, travel", () => {
  it("flags BEC keywords", () => {
    const r = abuse.becScan(T, {
      from: { email: "ceo-scam@fake.io", name: "Alex C" },
      subject: "Urgent payroll",
      body: "Urgent: wire transfer for payroll today, confirm credentials.",
    });
    expect(r.flagged).toBe(true);
    expect(r.confidence).toBeGreaterThanOrEqual(55);
    expect(r.hits).toContain("wire transfer");
  });

  it("passes clean mail through BEC", () => {
    const r = abuse.becScan(T, { from: { email: "john.smith@partner.com" }, subject: "Budget", body: "Meeting prep." });
    expect(r.flagged).toBe(false);
  });

  it("detects PII with severities", () => {
    const r = abuse.dlpScan(T, { body: "Call 555-123-4567 or email a@b.co card 4111-1111-1111-1111" });
    expect(r.total).toBe(3);
    expect(r.severity).toBe("high");
    expect(r.findings.some((f: any) => f.type === "creditCard" && f.severity === "high")).toBe(true);
  });

  it("impossible travel flags cross-continent hops", () => {
    const r = abuse.impossibleTravel(T, "user_r8", "Tokyo, JP");
    expect(r.risk).toBe("medium");
    expect(r.verdict).toBe("notify");
    expect(r.distanceKm).toBe(4700);
  });
});

describe("abuse — rate limits & patterns", () => {
  it("allows senders under the daily limit", () => {
    const r = abuse.rateLimitCheck(T, "john.smith@partner.com");
    expect(r.allowed).toBe(true);
    expect(r.limit).toBe(5000);
    expect(r.burstDetected).toBe(false);
  });

  it("detects 5-minute bursts", () => {
    const r = abuse.rateLimitCheck(T, "burst@fake.io");
    expect(r.burstDetected).toBe(true);
    expect(r.allowed).toBe(false);
    expect(r.sentToday).toBe(12);
  });

  it("flags sending spikes per mailbox", () => {
    expect(abuse.sendingPatternAnomaly(T, mbAbuse).anomaly).toBe(true);
  });

  it("stays normal for steady senders", () => {
    const r = abuse.sendingPatternAnomaly(T, mbCalm);
    expect(r.anomaly).toBe(false);
    expect(r.verdict).toBe("normal");
  });
});

describe("abuse — honeypots, responses, dashboard", () => {
  it("counts honeypot hits", () => {
    const h = abuse.honeypotStatus(T);
    expect(h.hits).toBe(1);
    expect(h.senders).toContain("spam@bad.net");
    expect(h.addresses.length).toBe(2);
  });

  it("applies valid threat responses and rejects unknown ones", () => {
    const ok = abuse.threatResponse(T, "block_sender", "spam@bad.net");
    expect(ok.applied).toBe(true);
    expect(() => abuse.threatResponse(T, "nuke_everything" as any)).toThrow(/Unknown action/);
  });

  it("logs abuse events", () => {
    const log = abuse.abuseLog(T);
    expect(log.total).toBeGreaterThanOrEqual(4);
    expect(log.entries.some((e: any) => e.category === "scan_quarantine")).toBe(true);
  });

  it("aggregates the abuse dashboard", () => {
    const d = abuse.abuseDashboard(T);
    expect(d.layers.length).toBe(5);
    expect(d.honeypots.hits).toBe(1);
    expect(d.counts.total).toBeGreaterThan(0);
    expect(d.threatLevel).toBeTruthy();
    expect(d.generatedAt).toBeTruthy();
  });
});
