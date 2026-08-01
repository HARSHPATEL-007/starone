import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailboxService } from "../services/MailboxService";
import { MailMessageService } from "../services/MailMessageService";
import { MailRulesService } from "../services/MailRulesService";
import { MailAgentService } from "../services/MailAgentService";
import { MailFollowUpService } from "../services/MailFollowUpService";
import { MailSpamService } from "../services/MailSpamService";
import { MailCampaignService } from "../services/MailCampaignService";
import { MailCommandCenterService } from "../services/MailCommandCenterService";

const mailboxes = new MailboxService();
const mail = new MailMessageService();
const rules = new MailRulesService();
const agent = new MailAgentService();
const followUp = new MailFollowUpService();
const spam = new MailSpamService();
const campaigns = new MailCampaignService();
const command = new MailCommandCenterService();
const T = "nova-mail6";

let workId = "";
let msgUrgentId = "";
let msgProposalId = "";
let fuDueId = "";
let fuFutureId = "";
let schNowId = "";
let schDueId = "";
let bigApproveId = "";
let bigRejectId = "";

beforeAll(() => {
  const work = mailboxes.createMailbox(T, { name: "Nova Command", type: "work", email: "nova@r6.io", plan: "business" });
  workId = work.mailboxId;
  const now = Date.now();

  const r1 = mail.receiveMessage(T, workId, {
    from: { name: "Client", email: "client@acme.com" },
    subject: "URGENT: client escalation",
    body: "This is urgent — please act immediately. The account is blocked, respond asap.",
    importance: "high",
  });
  msgUrgentId = r1.message._id;

  DataStore.mem().insert("messages", {
    _id: "r6_nl",
    tenantId: T, mailboxId: workId, threadId: "thr_r6_nl", messageId: "<nl@r6.io>",
    from: { name: "Promo Desk", email: "promo@shop.xyz" }, to: [{ name: "Nova", email: "nova@r6.io" }],
    subject: "Weekly newsletter", body: "Here is what you missed this week.",
    folder: "inbox", labels: [], read: false, attachments: [], receivedAt: new Date(now - 2 * 86400000).toISOString(), importance: "normal",
    ai: { category: "newsletter" },
  });

  DataStore.mem().insert("messages", {
    _id: "r6_oldread",
    tenantId: T, mailboxId: workId, threadId: "thr_r6_old", messageId: "<old@r6.io>",
    from: { name: "Old Client", email: "old@client.com" }, to: [{ name: "Nova", email: "nova@r6.io" }],
    subject: "Old read request", body: "Thanks for the update.",
    folder: "inbox", labels: [], read: true, attachments: [], receivedAt: new Date(now - 40 * 86400000).toISOString(), importance: "normal",
  });

  const r5 = mail.receiveMessage(T, workId, {
    from: { name: "Partner", email: "partner@acme.com" },
    subject: "Proposal follow-up",
    body: "Waiting on your decision about the proposal.",
    importance: "normal",
    receivedAt: new Date(now - 5 * 86400000).toISOString(),
  });
  msgProposalId = r5.message._id;
  followUp.markAwaitingResponse(T, msgProposalId);

  const fu1 = followUp.createFollowUp(T, msgProposalId, { at: new Date(now - 3600000).toISOString(), note: "Overdue — chase now" });
  fuDueId = fu1.followUpId;
  const fu2 = followUp.createFollowUp(T, msgProposalId, { at: new Date(now + 2 * 86400000).toISOString(), note: "Future check-in" });
  fuFutureId = fu2.followUpId;
  const fu3 = followUp.createFollowUp(T, msgProposalId, { at: new Date(now - 3 * 86400000).toISOString(), note: "Already handled" });
  followUp.completeFollowUp(T, fu3.followUpId);

  const s1 = agent.scheduleSend(T, workId, { to: "nina@acme.com", subject: "R6 scheduled now", body: "Sending ahead of schedule.", sendAt: new Date(now + 3 * 3600000).toISOString() });
  schNowId = s1.scheduleId;
  const s2 = agent.scheduleSend(T, workId, { to: "bob@acme.com", subject: "R6 due send", body: "This one is due.", sendAt: new Date(now - 3600000).toISOString() });
  schDueId = s2.scheduleId;

  DataStore.mem().insert("mail_templates", {
    _id: "tpl_round6_campaign",
    tenantId: T, name: "R6 outreach", category: "outreach",
    subject: "Hello {{firstName}}",
    body: "Hi {{firstName}},\n\nWelcome to N0VA. Best, Nova.",
  });
  for (let i = 0; i < 60; i++) {
    DataStore.mem().insert("mail_contacts", { tenantId: T, name: `Bulk ${i}`, email: `bulk${i}@many.com`, tags: ["bulk"] });
  }
  const c1 = campaigns.createCampaign(T, workId, { name: "Big approval", templateId: "tpl_round6_campaign", audience: { groups: ["bulk"] } });
  bigApproveId = c1.campaignId;
  campaigns.launchCampaign(T, bigApproveId);
  const c2 = campaigns.createCampaign(T, workId, { name: "Big reject", templateId: "tpl_round6_campaign", audience: { groups: ["bulk"] } });
  bigRejectId = c2.campaignId;
  campaigns.launchCampaign(T, bigRejectId);
});

describe("MailCommandCenter — daily execution dashboard (Round 21)", () => {
  it("returns the four stat cards with deterministic values", () => {
    const dash = command.mailCommandCenter(T);
    expect(dash.cards.unread).toEqual({ value: 3, label: "unread in inbox" });
    expect(dash.cards.priority.value).toBe(3);
    expect(dash.cards.followUpsDue.value).toBe(1);
    expect(dash.cards.scheduledToday.value).toBe(2);
  });

  it("builds the auto-priority queue section from unread inbox mail", () => {
    const dash = command.mailCommandCenter(T);
    expect(dash.sections.priorityQueue.length).toBe(3);
    expect(dash.sections.priorityQueue.map((p: any) => p.messageId)).toContain(msgUrgentId);
  });

  it("surfaces follow-ups, schedules, escalations and approvals in sections", () => {
    const dash = command.mailCommandCenter(T);
    expect(dash.sections.followUps.length).toBe(2);
    expect(dash.sections.followUps.some((f: any) => f.overdue)).toBe(true);
    expect(dash.sections.scheduled.length).toBe(2);
    expect(dash.sections.escalations.length).toBe(1);
    expect(dash.sections.campaignApprovals.length).toBe(2);
    expect(dash.sections.campaignApprovals.every((c: any) => c.status === "pending_approval")).toBe(true);
  });

  it("reports counts: tasks, quarantine, archive candidates, storage and domain health", () => {
    const dash = command.mailCommandCenter(T);
    expect(dash.counts.openTasks).toBe(0);
    expect(dash.counts.quarantine).toBe(0);
    expect(dash.counts.archiveCandidates).toBe(1);
    expect(dash.counts.storageCritical).toBe(0);
    expect(dash.counts.domainsFlagged).toBe(0);
    expect(dash.counts.healthCritical).toBe(1);
    expect(dash.storage.mailboxes).toBe(1);
    expect(dash.domains.total).toBe(0);
  });

  it("computes readyActions counts for one-click execution", () => {
    const dash = command.mailCommandCenter(T);
    expect(dash.readyActions).toEqual({
      priorityQueue: 3,
      completeFollowUps: 2,
      sendScheduled: 2,
      approveCampaigns: 2,
      quarantine: 0,
      smartArchive: 1,
    });
  });

  it("derives an attention score and health verdict", () => {
    const dash = command.mailCommandCenter(T);
    expect(dash.attentionScore).toBe(5);
    expect(dash.verdict).toBe("Needs attention");
  });

  it("produces a morning report with daily sentences", () => {
    const dash = command.mailCommandCenter(T);
    expect(dash.morningReport.length).toBe(6);
    expect(dash.morningReport[0]).toContain("unread");
    expect(dash.morningReport[3]).toContain("quarantine");
    expect(dash.morningReport[4]).toContain("approval");
  });

  it("is deterministic across consecutive calls", () => {
    const a = command.mailCommandCenter(T);
    const b = command.mailCommandCenter(T);
    expect(a.seed).toBe(b.seed);
    expect(a.cards).toEqual(b.cards);
    expect(a.morningReport).toEqual(b.morningReport);
    expect(a.verdict).toBe(b.verdict);
  });
});

describe("MailAgentService.sendScheduleNow (Round 21)", () => {
  it("sends a scheduled email immediately via the command center delegation", () => {
    const res = command.sendScheduledNow(T, schNowId);
    expect(res.status).toBe("sent");
    expect(res.summary).toContain("sent now");
    const sent = DataStore.mem().findOne("messages", (m: any) => m.tenantId === T && m.folder === "sent" && m.subject === "R6 scheduled now");
    expect(sent).toBeTruthy();
  });

  it("is a no-op when the schedule is already sent", () => {
    const res = agent.sendScheduleNow(T, schNowId);
    expect(res.status).toBe("sent");
    expect(res.summary).toContain("nothing to send");
  });

  it("is a no-op when the schedule is cancelled", () => {
    const s = agent.scheduleSend(T, workId, { to: "x@acme.com", subject: "R6 cancelled", body: "nope", sendAt: new Date(Date.now() + 3600000).toISOString() });
    agent.cancelSchedule(T, s.scheduleId);
    const res = agent.sendScheduleNow(T, s.scheduleId);
    expect(res.status).toBe("cancelled");
    expect(res.summary).toContain("nothing to send");
  });

  it("throws for an unknown schedule", () => {
    expect(() => agent.sendScheduleNow(T, "nope_schedule")).toThrow(/not found/);
  });
});

describe("MailCommandCenter — one-click actions (Round 21)", () => {
  it("completes a follow-up in one click", () => {
    const res = command.completeFollowUp(T, fuDueId);
    expect(res.status).toBe("done");
    expect(res.summary).toContain("completed");
    const summary = followUp.followUpSummary(T);
    expect(summary.openFollowUps).toBe(1);
  });

  it("approves a queued campaign in one click", () => {
    const res = command.approveCampaign(T, bigApproveId, "user_001");
    expect(res.stats.sent).toBeGreaterThan(0);
    expect(["completed", "paused"]).toContain(res.status);
  });

  it("rejects a queued campaign in one click", () => {
    const res = command.rejectCampaign(T, bigRejectId, "not ready");
    expect(res.status).toBe("rejected");
    expect(res.summary).toContain("rejected");
    const dash = campaigns.campaignsDashboard(T);
    expect(dash.totals.pendingApproval).toBe(0);
  });

  it("runs the agent cycle to send due schedules", () => {
    const res = command.runAgentCycle(T);
    expect(res.schedulesSent).toBe(1);
    expect(res.summary).toContain("1 scheduled email(s) sent");
    const schedule = DataStore.mem().findOne("mail_schedules", (s: any) => s._id === schDueId);
    expect(schedule.status).toBe("sent");
  });

  it("smart-archives read low-priority mail in one click", () => {
    const res = command.smartArchiveNow(T);
    expect(res.applied).toBe(1);
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === "r6_oldread");
    expect(msg.folder).toBe("archive");
  });

  it("rescans spam and quarantines flagged mail", () => {
    DataStore.mem().insert("messages", {
      _id: "r6_spamprobe",
      tenantId: T, mailboxId: workId, threadId: "thr_r6_spam", messageId: "<spam@r6.io>",
      from: { name: "Lottery", email: "winner@lotto.xyz" }, to: [{ name: "Nova", email: "nova@r6.io" }],
      subject: "Claim your prize — act now", body: "You won! Claim your free cash bonus today, click here.",
      folder: "inbox", labels: [], read: false, attachments: [], receivedAt: new Date().toISOString(), importance: "low",
    });
    const res = command.rescanSpam(T);
    expect(res).toBeTruthy();
    const status = spam.spamStatus(T);
    expect(status.quarantineCount).toBeGreaterThanOrEqual(1);
    const probe = DataStore.mem().findOne("messages", (m: any) => m._id === "r6_spamprobe");
    expect(probe.folder).toBe("spam");
  });

  it("rescans spam deterministically on stable state", () => {
    const a = spam.scanAll(T);
    const b = spam.scanAll(T);
    expect(a).toEqual(b);
  });
});

describe("MailRulesService.sweepRules (Round 21)", () => {
  it("reports cleanly when no enabled rules exist", () => {
    const zero = mailboxes.createMailbox("nova-sweep0", { name: "Sweep Zero", type: "work", email: "zero@sweep0.io", plan: "free" });
    DataStore.mem().insert("messages", {
      _id: "r6_s0a", tenantId: "nova-sweep0", mailboxId: zero.mailboxId, threadId: "thr_s0", messageId: "<s0@sweep0.io>",
      from: { name: "A", email: "a@sweep0.io" }, to: [{ name: "Z", email: "zero@sweep0.io" }],
      subject: "No rules here", body: "clean", folder: "inbox", labels: [], read: false, attachments: [], receivedAt: new Date().toISOString(), importance: "normal",
    });
    const res = rules.sweepRules("nova-sweep0");
    expect(res.rulesChecked).toBe(0);
    expect(res.summary).toContain("No enabled rules to run");
  });

  it("creates visual, script and paused rule fixtures", () => {
    rules.createRule(T, {
      name: "Sweep archive", conditions: [{ field: "from", operator: "contains", value: "sweep@" }],
      actions: [{ action: "label", target: "Sweep" }, { action: "archive", target: "" }],
    });
    rules.createRule(T, { name: "Sweep script", kind: "script", script: 'if subject contains "sweepscript" then label "ScriptSweep"' });
    rules.createRule(T, {
      name: "Sweep paused", enabled: false, conditions: [{ field: "from", operator: "contains", value: "paused@" }],
      actions: [{ action: "archive", target: "" }],
    });
    const list = rules.listRules(T);
    expect(list.length).toBe(3);
  });

  it("sweeps the whole inbox applying visual and script rules", () => {
    DataStore.mem().insert("messages", {
      _id: "r6_sw1", tenantId: T, mailboxId: workId, threadId: "thr_r6_sw1", messageId: "<sw1@sweep.io>",
      from: { name: "Sweep Sender", email: "sweep@source.com" }, to: [{ name: "Nova", email: "nova@r6.io" }],
      subject: "Sweep target one", body: "Please review the sweep target.",
      folder: "inbox", labels: [], read: false, attachments: [], receivedAt: new Date().toISOString(), importance: "normal",
    });
    DataStore.mem().insert("messages", {
      _id: "r6_sw2", tenantId: T, mailboxId: workId, threadId: "thr_r6_sw2", messageId: "<sw2@sweep.io>",
      from: { name: "Other Sender", email: "other@source.com" }, to: [{ name: "Nova", email: "nova@r6.io" }],
      subject: "Sweepscript target", body: "Script target.",
      folder: "inbox", labels: [], read: false, attachments: [], receivedAt: new Date().toISOString(), importance: "normal",
    });
    DataStore.mem().insert("messages", {
      _id: "r6_sw3", tenantId: T, mailboxId: workId, threadId: "thr_r6_sw3", messageId: "<sw3@paused.io>",
      from: { name: "Paused Sender", email: "paused@source.com" }, to: [{ name: "Nova", email: "nova@r6.io" }],
      subject: "Paused rule target", body: "Should stay untouched.",
      folder: "inbox", labels: [], read: false, attachments: [], receivedAt: new Date().toISOString(), importance: "normal",
    });
    const res = rules.sweepRules(T);
    expect(res.rulesChecked).toBe(2);
    expect(res.matchedMessages).toBe(2);
    expect(res.actionsApplied).toBe(3);
    expect(res.summary).toContain("2 matched");
    const sw1 = DataStore.mem().findOne("messages", (m: any) => m._id === "r6_sw1");
    expect(sw1.folder).toBe("archive");
    expect(sw1.labels).toContain("Sweep");
    const sw2 = DataStore.mem().findOne("messages", (m: any) => m._id === "r6_sw2");
    expect(sw2.labels).toContain("ScriptSweep");
    const result1 = res.results.find((r: any) => r.messageId === "r6_sw1");
    expect(result1.actions).toEqual(["label \"Sweep\"", "archived"]);
  });

  it("skips paused rules and is deterministic on stable state", () => {
    const res = rules.sweepRules(T);
    const sw3 = DataStore.mem().findOne("messages", (m: any) => m._id === "r6_sw3");
    expect(sw3.folder).toBe("inbox");
    const res2 = rules.sweepRules(T);
    expect(res2).toEqual(res);
  });
});
