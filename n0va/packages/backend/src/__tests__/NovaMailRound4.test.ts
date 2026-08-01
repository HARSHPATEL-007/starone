import { describe, it, expect, beforeAll } from "vitest";
import { DataStore } from "../services/DataStore";
import { MailboxService } from "../services/MailboxService";
import { MailMessageService } from "../services/MailMessageService";
import { MailCollaborationService } from "../services/MailCollaborationService";
import { MailPredictiveService } from "../services/MailPredictiveService";
import { MailCampaignService } from "../services/MailCampaignService";
import { MailDiscoveryService } from "../services/MailDiscoveryService";
import { MailDomainService } from "../services/MailDomainService";

const mailboxes = new MailboxService();
const mail = new MailMessageService();
const collab = new MailCollaborationService();
const predict = new MailPredictiveService();
const campaigns = new MailCampaignService();
const discovery = new MailDiscoveryService();
const domains = new MailDomainService();
const T = "nova-mail4";

let workId = "";
let draftMailboxId = "";
let msgInvoiceId = "";
let msgMeetingId = "";
let meetingThreadId = "";
let replyThreadId = "";
let campaignTemplateId = "";
let contactIds: string[] = [];

beforeAll(() => {
  const work = mailboxes.createMailbox(T, { name: "Nova Work", type: "work", email: "nova@n0va.work", plan: "business" });
  workId = work.mailboxId;
  const personal = mailboxes.createMailbox(T, { name: "Nova Personal", type: "personal", email: "nova@n0va.personal", plan: "free" });
  draftMailboxId = personal.mailboxId;

  const r1 = mail.receiveMessage(T, workId, {
    from: { name: "John Smith", email: "john.smith@partner.com" },
    subject: "Q3 invoice attached",
    body: "Hi, please find the Q3 invoice attached. Payment terms are 30 days net. This needs approval from finance.",
    importance: "high",
    attachments: [{ name: "q3-invoice.pdf", sizeBytes: 245760, type: "pdf" }],
    labels: ["Invoices"],
  });
  msgInvoiceId = r1.message._id;
  const r2 = mail.receiveMessage(T, workId, {
    from: { name: "Sarah Chen", email: "sarah@design.co" },
    subject: "Campaign creative review — Thu 10am",
    body: "We booked a review for Thursday at 10am. Please bring the Q3 assets. Here is the meeting link.",
    importance: "high",
  });
  msgMeetingId = r2.message._id;
  meetingThreadId = r2.message.threadId;

  mail.receiveMessage(T, workId, { from: { name: "Sarah Chen", email: "sarah@design.co" }, subject: "Re: sync up", body: "Yes, let's catch up on the campaign.", importance: "normal" });
  const syncReply = mail.receiveMessage(T, workId, { from: { name: "Sarah Chen", email: "sarah@design.co" }, subject: "Re: sync up", body: "Are you available Monday?", importance: "normal" });
  const reply = mail.composeSend(T, workId, { to: "sarah@design.co", subject: "Re: sync up", body: "Monday works. 10am?" });
  replyThreadId = reply.message.threadId;

  const now = Date.now();
  DataStore.mem().insert("messages", {
    tenantId: T, mailboxId: workId, threadId: "thr_stale_old", messageId: "<stale@n0va.mail>",
    from: { name: "Old Client", email: "old@client.com" }, to: [{ name: "Nova", email: "nova@n0va.work" }],
    subject: "Old pending request", body: "Please action this immediately.", preview: "Please action",
    folder: "inbox", labels: ["Inbox"], read: false, attachments: [], receivedAt: new Date(now - 30 * 86400000).toISOString(), importance: "high",
  });

  DataStore.mem().insert("mail_templates", {
    _id: "tpl_round4_campaign",
    tenantId: T, name: "Campaign outreach", category: "outreach",
    subject: "Hello {{firstName}} from {{company}}",
    body: "Hi {{firstName}},\n\nWe'd love to show you the N0VA platform. Best, Nova.",
  });
  campaignTemplateId = "tpl_round4_campaign";

  const contacts = [
    { name: "Alice Adams", email: "alice@one.com", tags: ["partners"] },
    { name: "Bob Brown", email: "bob@two.com", tags: ["partners"] },
    { name: "Carol Cruz", email: "carol@three.com", tags: ["leads"] },
    { name: "Dan Diaz", email: "dan@four.com", tags: ["leads"] },
    { name: "Eve Ellis", email: "eve@five.com", tags: ["newsletter"] },
    { name: "Frank Fox", email: "frank@six.com", tags: ["newsletter"] },
  ];
  contactIds = contacts.map(c => DataStore.mem().insert("mail_contacts", { tenantId: T, ...c })._id);
});

describe("MailCollaborationService (Round 19)", () => {
  it("adds a comment with mentions resolved from contacts", () => {
    const c = collab.addComment(T, msgInvoiceId, { text: "Alice Adams can you review this invoice?", author: "user_002" });
    expect(c.commentId).toBeTruthy();
    expect(c.mentions.length).toBe(1);
    expect(c.mentions[0].email).toBe("alice@one.com");
    expect(c.summary).toMatch(/Comment added/);
  });

  it("throws on invalid comment input or unknown message", () => {
    expect(() => collab.addComment(T, msgInvoiceId, { text: "" })).toThrow(/Comment text/);
    expect(() => collab.addComment(T, "nope", { text: "hi" })).toThrow(/not found/);
  });

  it("lists comments per message and per thread", () => {
    collab.addComment(T, msgMeetingId, { text: "I'll prepare the deck", author: "user_003" });
    const perMsg = collab.commentsForMessage(T, msgMeetingId);
    expect(perMsg.count).toBe(1);
    const perThread = collab.commentsForThread(T, meetingThreadId);
    expect(perThread.count).toBe(1);
    expect(perThread.comments[0].subject).toBe("Campaign creative review — Thu 10am");
  });

  it("deletes a comment and throws for unknown ids", () => {
    const c = collab.addComment(T, msgInvoiceId, { text: "tmp" });
    expect(collab.deleteComment(T, c.commentId).summary).toMatch(/deleted/);
    expect(() => collab.deleteComment(T, "nope")).toThrow(/not found/);
  });

  it("adds/removes reactions with dedup per user", () => {
    const r = collab.addReaction(T, msgInvoiceId, { emoji: "👍", user: "user_001" });
    expect(r.summary).toContain("👍");
    expect(() => collab.addReaction(T, msgInvoiceId, { emoji: "👍", user: "user_001" })).toThrow(/already added/);
    collab.addReaction(T, msgInvoiceId, { emoji: "🔥", user: "user_002" });
    const grouped = collab.messageReactions(T, msgInvoiceId);
    expect(grouped.total).toBe(2);
    expect(grouped.reactions[0].emoji).toBe("👍");
    expect(collab.removeReaction(T, msgInvoiceId, { emoji: "👍", user: "user_001" }).summary).toContain("Removed");
    expect(() => collab.removeReaction(T, msgInvoiceId, { emoji: "👍", user: "user_001" })).toThrow(/not found/);
  });

  it("creates a shared draft resolving collaborators from contacts", () => {
    const d = collab.createSharedDraft(T, workId, {
      subject: "Q3 report draft",
      collaborators: [{ email: "alice@one.com" }, { email: "ghost@nowhere.com" }],
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(d.draftId).toBeTruthy();
    expect(d.collaborators.length).toBe(2);
    expect(d.collaborators[0].contactId).toBeTruthy();
    expect(d.collaborators[1].contactId).toBeNull();
    expect(() => collab.createSharedDraft(T, workId, { subject: "No collabs" })).toThrow(/collaborator/);
  });

  it("lists and updates shared drafts with status transitions", () => {
    const list = collab.sharedDrafts(T);
    expect(list.byStatus.find(s => s.status === "draft")!.count).toBe(1);
    const d = list.drafts[0];
    const moved = collab.updateSharedDraft(T, d.draftId, { status: "in_review" });
    expect(moved.status).toBe("in_review");
    expect(() => collab.updateSharedDraft(T, d.draftId, { status: "bogus" })).toThrow(/Invalid draft status/);
  });

  it("deletes a shared draft", () => {
    const d = collab.createSharedDraft(T, workId, { subject: "Temp draft", collaborators: [{ email: "alice@one.com" }] });
    expect(collab.deleteSharedDraft(T, d.draftId).summary).toMatch(/deleted/);
  });

  it("reports deterministic team presence", () => {
    const p = collab.presence(T);
    expect(p.members.length).toBeGreaterThan(0);
    expect(p.online).toBeGreaterThan(0);
    const member = p.members[0];
    expect(["online", "away", "busy"]).toContain(member.status);
    expect(typeof member.viewingSubject === "string" || member.viewingSubject === null).toBe(true);
    expect(typeof member.typing === "string" || member.typing === null).toBe(true);
  });

  it("returns collaboration state and summary", () => {
    const state = collab.collaborationState(T, msgInvoiceId);
    expect(state.comments).toBe(1);
    expect(state.reactions).toBe(1);
    const summary = collab.collaborationSummary(T);
    expect(summary.comments).toBeGreaterThanOrEqual(2);
    expect(summary.activeThreads).toBeGreaterThan(0);
    expect(summary.topThreads.length).toBeGreaterThan(0);
  });
});

describe("MailPredictiveService (Round 19)", () => {
  it("predicts response time from an observed reply", () => {
    const p = predict.responseTimePrediction(T, replyThreadId);
    expect(p.basis).toBe("observed reply latency in this thread");
    expect(p.typicalResponseHours).toBeGreaterThan(0);
  });

  it("predicts response time for a fresh thread via sender model", () => {
    const p = predict.responseTimePrediction(T, meetingThreadId);
    expect(p.basis).toBe("sender behaviour model");
    expect(p.confidence).toBeGreaterThanOrEqual(60);
    expect(() => predict.responseTimePrediction(T, "nope")).toThrow(/not found/);
  });

  it("detects intent from keywords", () => {
    const p = predict.outcomePrediction(T, msgMeetingId);
    expect(p.intent).toBe("meeting_request");
    expect(p.probability).toBeGreaterThanOrEqual(40);
    expect(p.probability).toBeLessThanOrEqual(94);
    expect(p.suggestedAction).toBeTruthy();
  });

  it("detects approval intent from body keywords", () => {
    const p = predict.outcomePrediction(T, msgInvoiceId);
    expect(p.intent).toBe("approval_needed");
  });

  it("scores churn risk by thread age", () => {
    const fresh = predict.churnRisk(T, meetingThreadId);
    expect(fresh.risk).toBe("low");
    const stale = predict.churnRisk(T, "thr_stale_old");
    expect(stale.risk).toBe("high");
    expect(stale.lastActivityDays).toBeGreaterThanOrEqual(20);
  });

  it("finds the optimal send time from activity", () => {
    const t = predict.optimalSendTime(T);
    expect(t.hour).toBeGreaterThanOrEqual(0);
    expect(t.hour).toBeLessThanOrEqual(23);
    expect(t.label).toBeTruthy();
    expect(t.nextBest.label).toBeTruthy();
  });

  it("scores relationship health with level thresholds", () => {
    const h = predict.relationshipHealth(T, "john.smith@partner.com");
    expect(h.healthScore).toBeGreaterThanOrEqual(15);
    expect(h.messagesExchanged).toBeGreaterThan(0);
    expect(["strong", "healthy", "cooling", "at risk"]).toContain(h.level);
    expect(h.factors.length).toBeGreaterThanOrEqual(3);
  });

  it("returns a scored intent matrix with a top intent", () => {
    const m = predict.intentPrediction(T, msgInvoiceId);
    expect(m.predictions.length).toBe(6);
    expect(m.predictions[0].confidence).toBeGreaterThanOrEqual(m.predictions[5].confidence);
    expect(m.topLabel).toBeTruthy();
  });

  it("suggests nudges for stale high-priority threads", () => {
    const n = predict.nudgeSuggestions(T);
    const match = n.find(x => x.threadId === "thr_stale_old");
    expect(match).toBeTruthy();
    expect(match!.ageDays).toBeGreaterThanOrEqual(2);
    expect(match!.suggestedAction).toBeTruthy();
  });

  it("forecasts workload and send-time suggestion", () => {
    const w = predict.workloadForecast(T, 7);
    expect(w.projectedMessages).toBeGreaterThan(0);
    expect(w.busyScore).toBeGreaterThanOrEqual(0);
    expect(w.busyScore).toBeLessThanOrEqual(100);
    const s = predict.sendTimeSuggestion(T);
    expect(s.hour).toBeGreaterThanOrEqual(0);
    expect(s.tip).toBeTruthy();
  });

  it("builds a predictive dashboard", () => {
    const d = predict.predictiveDashboard(T);
    expect(d.sendTime.hour).toBeGreaterThanOrEqual(0);
    expect(d.churnRisks.length).toBeGreaterThan(0);
    expect(d.summary).toMatch(/Best send/);
  });
});

describe("MailCampaignService (Round 19)", () => {
  let campaignId = "";
  let bigCampaignId = "";

  it("creates a campaign and validates inputs", () => {
    const c = campaigns.createCampaign(T, workId, {
      name: "Partner outreach", templateId: campaignTemplateId,
      audience: { groups: ["partners"] },
    });
    campaignId = c.campaignId;
    expect(c.status).toBe("draft");
    expect(c.audience.groups).toEqual(["partners"]);
    expect(() => campaigns.createCampaign(T, workId, { name: "No tpl" })).toThrow(/templateId/);
    expect(() => campaigns.createCampaign(T, workId, { name: "Bad", templateId: "nope" })).toThrow(/not found/);
  });

  it("lists campaigns with audience size", () => {
    const list = campaigns.listCampaigns(T);
    expect(list.campaigns.length).toBe(1);
    expect(list.campaigns[0].recipients).toBe(2);
    expect(list.totals.draft).toBe(1);
  });

  it("refuses to launch a campaign with an empty audience", () => {
    const c = campaigns.createCampaign(T, workId, {
      name: "Empty audience", templateId: campaignTemplateId,
      audience: { query: "zzz-no-match" },
    });
    expect(() => campaigns.launchCampaign(T, c.campaignId)).toThrow(/no contacts/);
  });

  it("launches a small campaign end-to-end with deterministic events", () => {
    const res = campaigns.launchCampaign(T, campaignId);
    expect(res.approvalRequired).toBe(false);
    expect(res.stats.sent).toBe(2);
    expect(res.stats.sent + res.stats.failed).toBe(2);
    expect(res.status).toBe("completed");
    const stats = campaigns.campaignStats(T, campaignId);
    expect(stats.stats.delivered).toBeLessThanOrEqual(stats.stats.sent);
    expect(stats.stats.opened).toBeLessThanOrEqual(stats.stats.delivered);
    expect(stats.rates.openRate).toBeGreaterThanOrEqual(0);
  });

  it("queues campaigns over the approval threshold for HITL", () => {
    for (let i = 0; i < 60; i++) {
      DataStore.mem().insert("mail_contacts", { tenantId: T, name: `Bulk ${i}`, email: `bulk${i}@many.com`, tags: ["bulk"] });
    }
    const c = campaigns.createCampaign(T, workId, {
      name: "Big blast", templateId: campaignTemplateId,
      audience: { groups: ["bulk"] },
    });
    bigCampaignId = c.campaignId;
    const launched = campaigns.launchCampaign(T, bigCampaignId);
    expect(launched.approvalRequired).toBe(true);
    expect(launched.status).toBe("pending_approval");
  });

  it("approveCampaign executes the queued campaign; approving a non-pending one throws", () => {
    expect(() => campaigns.approveCampaign(T, campaignId)).toThrow(/not awaiting approval/);
    const res = campaigns.approveCampaign(T, bigCampaignId, "user_001");
    expect(res.stats.sent).toBeGreaterThan(0);
    expect(res.stats.complaints).toBeGreaterThan(0);
    expect(res.status).toBe("paused"); // deterministic auto-pause: bulk seed's complaint rate exceeds 2%
  });

  it("rejects a pending campaign with a reason", () => {
    const c = campaigns.createCampaign(T, workId, {
      name: "Reject me", templateId: campaignTemplateId,
      audience: { groups: ["bulk"] },
    });
    campaigns.launchCampaign(T, c.campaignId);
    const rejected = campaigns.rejectCampaign(T, c.campaignId, "copy not approved");
    expect(rejected.status).toBe("rejected");
    expect(() => campaigns.rejectCampaign(T, c.campaignId)).toThrow(/not awaiting approval/);
  });

  it("pauses and resumes a campaign", () => {
    const status = campaigns.getCampaignPublic(T, bigCampaignId).status;
    if (status !== "paused") campaigns.pauseCampaign(T, bigCampaignId);
    expect(campaigns.getCampaignPublic(T, bigCampaignId).status).toBe("paused");
    campaigns.resumeCampaign(T, bigCampaignId);
    expect(campaigns.getCampaignPublic(T, bigCampaignId).status).toBe("active");
  });

  it("runs an A/B subject test and reports a winner", () => {
    const c = campaigns.createCampaign(T, workId, {
      name: "AB test", templateId: campaignTemplateId,
      audience: { groups: ["leads"] },
      abSubject: "Exclusive preview: N0VA for {{firstName}}",
    });
    campaigns.launchCampaign(T, c.campaignId);
    const stats = campaigns.campaignStats(T, c.campaignId);
    expect(stats.ab).toBeTruthy();
    expect(stats.ab.summary).toMatch(/winning/);
  });

  it("classifies campaign replies into response handling buckets", () => {
    const h = campaigns.campaignResponseHandling(T, bigCampaignId);
    expect(h.campaignId).toBe(bigCampaignId);
    expect(Object.keys(h.categories).sort()).toEqual(["interested", "not_interested", "other", "question"]);
    expect(h.replies).toBe(h.categories.interested + h.categories.question + h.categories.not_interested + h.categories.other);
    expect(Array.isArray(h.suggestions)).toBe(true);
  });

  it("aggregates a campaigns dashboard and writes a log", () => {
    const d = campaigns.campaignsDashboard(T);
    expect(d.totals.total).toBeGreaterThanOrEqual(5);
    expect(d.sent).toBeGreaterThan(0);
    expect(d.summary).toMatch(/campaign/);
    const log = campaigns.campaignLog(T);
    expect(log.total).toBeGreaterThan(0);
    expect(log.log[0].action).toBeTruthy();
  });

  it("protects active/pending campaigns from deletion", () => {
    const c = campaigns.createCampaign(T, workId, {
      name: "Delete me", templateId: campaignTemplateId,
      audience: { groups: ["bulk"] },
    });
    campaigns.launchCampaign(T, c.campaignId);
    expect(() => campaigns.deleteCampaign(T, c.campaignId)).toThrow(/rejected or paused/);
    campaigns.pauseCampaign(T, c.campaignId);
    expect(campaigns.deleteCampaign(T, c.campaignId).summary).toMatch(/deleted/);
  });
});

describe("MailDiscoveryService (Round 19)", () => {
  it("searches by query, folder, from and attachments", () => {
    const byQuery = discovery.scopeSearch(T, { query: "invoice" });
    expect(byQuery.results.length).toBeGreaterThan(0);
    expect(byQuery.results[0].subject).toContain("invoice");
    const byFrom = discovery.scopeSearch(T, { from: "john.smith@partner.com" });
    expect(byFrom.total).toBeGreaterThan(0);
    const byAttach = discovery.scopeSearch(T, { hasAttachments: true });
    expect(byAttach.results.every(r => r.attachments.length > 0)).toBe(true);
    const byFolder = discovery.scopeSearch(T, { folder: "sent" });
    expect(byFolder.results.every(r => r.folder === "sent")).toBe(true);
  });

  it("searches by date range, label, attachment type and unread", () => {
    const byDate = discovery.scopeSearch(T, { dateFrom: new Date(Date.now() - 86400000).toISOString() });
    expect(byDate.total).toBeGreaterThan(0);
    const byLabel = discovery.scopeSearch(T, { label: "Invoices" });
    expect(byLabel.results.every(r => r.labels.includes("Invoices"))).toBe(true);
    const byType = discovery.scopeSearch(T, { attachmentType: "pdf" });
    expect(byType.total).toBeGreaterThan(0);
    const unread = discovery.scopeSearch(T, { unreadOnly: true });
    expect(unread.results.every(r => r.folder === "inbox")).toBe(true);
  });

  it("saves, lists, runs and deletes saved searches", () => {
    const s = discovery.saveSearch(T, { name: "Sarah threads", scope: { from: "sarah@design.co" } });
    expect(s.searchId).toBeTruthy();
    expect(() => discovery.saveSearch(T, { name: "No scope" })).toThrow(/scope/);
    const list = discovery.listSavedSearches(T);
    expect(list.count).toBe(1);
    const run = discovery.runSavedSearch(T, s.searchId);
    expect(run.results.length).toBeGreaterThan(0);
    expect(discovery.deleteSavedSearch(T, s.searchId).summary).toMatch(/deleted/);
    expect(() => discovery.runSavedSearch(T, s.searchId)).toThrow(/not found/);
  });

  it("creates a CSV export with Bates numbering", () => {
    const e = discovery.createExport(T, { name: "Invoice audit", format: "csv", scope: { query: "invoice" } });
    expect(e.exportId).toBeTruthy();
    expect(e.itemCount).toBeGreaterThan(0);
    expect(e.batesRange.from).toBe("BATES-0001");
    expect(e.download.filename).toBe("invoice_audit.csv");
    expect(e.download.content).toContain("Bates #");
  });

  it("redacts PII in exports when requested", () => {
    const e = discovery.createExport(T, { name: "Redacted", format: "csv", scope: { query: "invoice" }, redactPii: true });
    expect(e.redactPii).toBe(true);
    expect(e.download.content).not.toMatch(/john\.smith@partner\.com/);
    expect(e.download.content).toMatch(/\[email redacted\]|BATES/);
  });

  it("supports eml/mbox/pdf formats and rejects unknown ones", () => {
    const eml = discovery.createExport(T, { name: "raw", format: "eml", scope: { folder: "inbox" } });
    expect(eml.download.content).toContain("Subject:");
    const mbox = discovery.createExport(T, { name: "all", format: "mbox", scope: { folder: "inbox" } });
    expect(mbox.itemCount).toBeGreaterThan(0);
    const pdf = discovery.createExport(T, { name: "meta", format: "pdf", scope: { folder: "inbox" } });
    expect(pdf.download.content).toContain("eDiscovery Export");
    expect(() => discovery.createExport(T, { name: "x", format: "zip", scope: {} })).toThrow(/Unsupported/);
  });

  it("throws when an export scope matches nothing", () => {
    expect(() => discovery.createExport(T, { name: "empty", format: "csv", scope: { query: "zzz-no-match" } })).toThrow(/No messages match/);
  });

  it("lists, fetches and deletes exports", () => {
    const e = discovery.createExport(T, { name: "temp", format: "csv", scope: { folder: "inbox" } });
    const list = discovery.exports(T);
    expect(list.count).toBeGreaterThan(0);
    const got = discovery.getExport(T, e.exportId);
    expect(got.download.filename).toBe("temp.csv");
    expect(discovery.deleteExport(T, e.exportId).summary).toMatch(/deleted/);
    expect(() => discovery.getExport(T, e.exportId)).toThrow(/not found/);
  });

  it("builds a discovery summary", () => {
    const s = discovery.discoverySummary(T);
    expect(s.searchableMessages).toBeGreaterThan(0);
    expect(s.byFolder.length).toBeGreaterThan(0);
    expect(s.exports).toBeGreaterThan(0);
    expect(s.savedSearches).toBe(0);
  });
});

describe("MailDomainService (Round 19)", () => {
  let domainId = "";
  let businessDomainId = "";

  it("registers a domain with generated DNS records", () => {
    const d = domains.registerDomain(T, { domain: "nova-brands.com", plan: "free" });
    domainId = d.domainId;
    expect(d.status).toBe("pending");
    expect(Object.keys(d.dns)).toEqual(["mx", "spf", "dkim", "dmarc", "mtasts", "tlsrpt"]);
    expect(d.dns.mx.record).toContain("n0vamail.com");
    expect(d.dns.spf.record).toContain("spf1");
    expect(d.dns.dmarc.record).toContain("p=none");
    expect(d.dns.dkim.selector).toBe("n0va");
    expect(() => domains.registerDomain(T, { domain: "nova-brands.com" })).toThrow(/already registered/);
    expect(() => domains.registerDomain(T, { domain: "not a domain" })).toThrow(/not a valid domain/);
  });

  it("registers a business domain with stricter DMARC", () => {
    const d = domains.registerDomain(T, { domain: "enterprise.nova.co", plan: "business" });
    businessDomainId = d.domainId;
    expect(d.dns.dmarc.record).toContain("p=quarantine");
  });

  it("lists domains with status totals", () => {
    const list = domains.listDomains(T);
    expect(list.domains.length).toBe(2);
    expect(list.totals.pending).toBe(2);
    expect(list.totals.active).toBe(0);
  });

  it("verifies DNS records to active or action_required consistently", () => {
    const v = domains.verifyDomain(T, domainId);
    expect(v.verifiedCount).toBeGreaterThanOrEqual(0);
    expect(v.verifiedCount).toBeLessThanOrEqual(6);
    if (v.status === "active") expect(v.verifiedCount).toBe(6);
    if (v.status === "action_required") expect(v.failing.length).toBe(6 - v.verifiedCount);
  });

  it("reports domain health with reputation and blacklist status", () => {
    const h = domains.domainHealth(T, domainId);
    expect(h.uptimePercent).toBeGreaterThanOrEqual(99);
    expect(h.reputationScore).toBeGreaterThanOrEqual(40);
    expect(h.reputationScore).toBeLessThanOrEqual(99);
    expect(["healthy", "fair", "critical"]).toContain(h.health);
    expect(Array.isArray(h.blacklists)).toBe(true);
    if (h.blacklisted) expect(h.blacklists.length).toBeGreaterThan(0);
  });

  it("runs a reputation monitor across domains", () => {
    const m = domains.reputationMonitor(T);
    expect(m.monitored.length).toBe(2);
    expect(m.monitored[0].alerts).toBeDefined();
  });

  it("gates DMARC enforcement / MTA-STS behind the Business plan", () => {
    expect(() => domains.setDomainPolicy(T, domainId, { dmarcEnforce: true })).toThrow(/Business plan/);
    const applied = domains.setDomainPolicy(T, businessDomainId, { dmarcEnforce: true, mtaSts: true });
    expect(applied.policies.dmarcEnforce).toBe(true);
    expect(applied.policies.mtaSts).toBe(true);
    const d = domains.getDomainPublic(T, businessDomainId);
    expect(d.dns.dmarc.record).toContain("p=reject");
  });

  it("gates Brand Protection behind the Enterprise plan", () => {
    expect(() => domains.setDomainPolicy(T, businessDomainId, { brandProtection: true })).toThrow(/Enterprise/);
    expect(() => domains.setDomainPolicy(T, domainId, { brandProtection: true })).toThrow(/Enterprise/);
  });

  it("logs domain events and summarizes", () => {
    const log = domains.domainLog(T);
    expect(log.total).toBeGreaterThanOrEqual(2);
    const summary = domains.domainSummary(T);
    expect(summary.totals.total).toBe(2);
    expect(summary.avgReputation).toBeGreaterThanOrEqual(0);
  });

  it("deletes a domain", () => {
    const d = domains.registerDomain(T, { domain: "gone-away.com" });
    expect(domains.deleteDomain(T, d.domainId).summary).toMatch(/deleted/);
    expect(domains.listDomains(T).totals.total).toBe(2);
  });
});
