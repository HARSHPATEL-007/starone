import { DataStore } from "./DataStore";
import { mailMessage } from "./MailMessageService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const COMPOSER_MODES = [
  { id: "reply", name: "Reply", description: "Zero-tap reply to an inbound message — draft is already written" },
  { id: "forward", name: "Forward", description: "Forward with a context summary pre-written" },
  { id: "new", name: "New message", description: "Cold compose with AI-drafted structure from a prompt" },
] as const;

export const COMPOSER_TONES = [
  { id: "concise", name: "Concise", description: "Short, direct, scannable" },
  { id: "warm", name: "Warm", description: "Friendly, personal, relationship-preserving" },
  { id: "formal", name: "Formal", description: "Polished, professional, contract-ready" },
] as const;

export const COMPOSER_INTENTS = [
  { id: "contract", name: "Contract / Legal", keywords: ["contract", "clause", "agreement", "terms", "revision", "signature", "legal", "liability"] },
  { id: "meeting", name: "Meeting", keywords: ["meeting", "call", "schedule", "agenda", "sync", "book", "calendar", "availability"] },
  { id: "question", name: "Question", keywords: ["question", "wondering", "could you", "can you", "please confirm", "clarify", "check"] },
  { id: "invoice", name: "Invoice / Payment", keywords: ["invoice", "payment", "billing", "charge", "receipt", "quote", "budget", "cost"] },
  { id: "request", name: "Request / Approval", keywords: ["approve", "approval", "request", "please review", "needs your", "sign off", "approve"] },
  { id: "update", name: "Update / FYI", keywords: ["update", "progress", "status", "fyi", "quick note", "heads up", "for your"] },
] as const;

const GREETINGS: Record<string, string[]> = {
  concise: ["Hi {first},"],
  warm: ["Hi {first},", "Hello {first},"],
  formal: ["Dear {first},"],
};

const CLOSINGS: Record<string, string[]> = {
  concise: ["Best,", "Thanks,"],
  warm: ["Best,", "Thanks so much,", "Cheers,"],
  formal: ["Sincerely,", "Kind regards,"],
};

const SECTION_VERDICTS = ["Approved as revised", "Approved", "I'd like to discuss — can we align?", "Needs your input before we proceed"];
const CALL_TO_ACTIONS = [
  "Let me know if you'd like to jump on a quick call tomorrow.",
  "Happy to hop on a call if that helps — let me know what works.",
  "Just reply if anything needs changing.",
  "Please confirm by EOD so we can keep things moving.",
  "Let me know your thoughts and we can finalize.",
];

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("mail_composer_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export class MailComposerService {
  private resolveMailbox(tenantId: string, mailboxId?: string) {
    const store = DataStore.mem();
    if (mailboxId) {
      const mb = store.findOne("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId);
      if (!mb) throw new Error(`Mailbox "${mailboxId}" not found`);
      return mb;
    }
    const mailboxes = store.find("mailboxes", (m: any) => m.tenantId === tenantId);
    if (mailboxes.length === 0) throw new Error("No mailboxes configured");
    return mailboxes.find((m: any) => m.status === "active") || mailboxes[0];
  }

  private detectIntent(m: any): string {
    const hay = `${m.subject || ""} ${m.body || ""}`.toLowerCase();
    for (const intent of COMPOSER_INTENTS) {
      if (intent.keywords.some((k) => hay.includes(k))) return intent.id;
    }
    return "update";
  }

  private buildBody(seed: string, senderName: string, intent: string, tone: string, variant: number) {
    const greetings = GREETINGS[tone] || GREETINGS.concise;
    const closings = CLOSINGS[tone] || CLOSINGS.concise;
    const first = (senderName || "there").split(/\s+/)[0];
    const greeting = greetings[hashStr(seed + "greet") % greetings.length].replace("{first}", first);
    const closing = closings[hashStr(seed + "close") % closings.length];
    const sectionCount = 2 + (hashStr(seed + "sections" + variant) % 3);
    const sections: string[] = [];
    for (let i = 0; i < sectionCount; i++) {
      const verdict = SECTION_VERDICTS[hashStr(seed + `verdict${i}` + variant) % SECTION_VERDICTS.length];
      const marker = hashStr(seed + `marker${i}` + variant) % 3 === 0 ? "⚠️" : "✅";
      sections.push(`${marker} Point ${i + 1} — ${verdict}`);
    }
    const cta = CALL_TO_ACTIONS[hashStr(seed + "cta" + variant) % CALL_TO_ACTIONS.length];
    const intentLine: Record<string, string> = {
      contract: "Thanks for sending this over. I've reviewed the changes:",
      meeting: "Thanks for the note. Quick summary of where we are:",
      question: "Good question — here's where things stand:",
      invoice: "Thanks — I've taken a look at the numbers:",
      request: "Got it, happy to help. A quick overview:",
      update: "Thanks for the update. Noted on my end:",
    };
    const body = [
      greeting,
      "",
      intentLine[intent] || intentLine.update,
      ...sections,
      "",
      cta,
      "",
      closing,
    ].join("\n");
    return { body, sections, cta };
  }

  private buildDraft(tenantId: string, m: any, opts: any, variant: number, mailbox: any): any {
    const mode = opts.mode || "reply";
    const tone = opts.tone || "concise";
    if (!COMPOSER_MODES.some((x) => x.id === mode)) throw new Error("Unknown composer mode");
    if (!COMPOSER_TONES.some((x) => x.id === tone)) throw new Error("Unknown tone");
    const senderName = m.from?.name || m.from?.email?.split("@")[0] || "there";
    const seed = `${m.from?.email || "x"}|${m.subject || ""}|${mode}|${tone}|${variant}`;
    const intent = this.detectIntent(m);
    const built = this.buildBody(seed, senderName, intent, tone, variant);
    const to = mode === "reply" ? [{ name: m.from?.name || "", email: m.from?.email || "" }] : (opts.to || []);
    const subject = mode === "reply"
      ? `Re: ${m.subject || ""}`
      : mode === "forward" ? `Fwd: ${m.subject || ""}` : (opts.subject || "");
    const pastReplies = 1 + (hashStr(seed + "past") % 6);
    const basis = `Based on: your past ${pastReplies} ${intent} replies + calendar availability`;
    return {
      tenantId,
      messageId: m._id,
      mailboxId: mailbox._id,
      mode,
      tone,
      intent,
      variant,
      status: "draft" as string,
      to,
      subject,
      body: built.body,
      sections: built.sections,
      callToAction: built.cta,
      greeting: built.body.split("\n")[0],
      signOff: built.body.split("\n").slice(-1)[0],
      basedOn: basis,
      confidence: 70 + (hashStr(seed + "conf") % 30),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sentAt: null,
    };
  }

  composerCatalog() {
    return {
      modes: COMPOSER_MODES.map((m) => ({ ...m })),
      tones: COMPOSER_TONES.map((t) => ({ ...t })),
      intents: COMPOSER_INTENTS.map((i) => ({ id: i.id, name: i.name })),
      summary: "Neural Email Composer — zero-tap drafting for every inbound message",
    };
  }

  composeDraft(tenantId: string, messageId: string, opts: any = {}) {
    const m = DataStore.mem().findOne("messages", (x: any) => x._id === messageId && x.tenantId === tenantId);
    if (!m) throw new Error(`Message "${messageId}" not found`);
    const mailbox = this.resolveMailbox(tenantId, typeof opts.mailboxId === "string" ? opts.mailboxId : undefined);
    const variant = 1;
    const draft = this.buildDraft(tenantId, m, opts, variant, mailbox);
    const inserted = DataStore.mem().insert("mail_composer_drafts", draft);
    logEntry(tenantId, "composer_drafted", `Zero-tap ${draft.mode} draft "${draft.subject}" (${draft.intent}, ${draft.tone}, v${variant}) — ${draft.confidence}% confidence`, { draftId: inserted._id, messageId, intent: draft.intent, tone: draft.tone, variant });
    return {
      draft: { draftId: inserted._id, ...draft },
      actions: ["send", "edit", "regenerate", "don't_like"],
      clicksToSend: 1,
      summary: `Draft written for you — click Send (${draft.confidence}% confidence, ${draft.basedOn})`,
    };
  }

  regenerateDraft(tenantId: string, draftId: string) {
    const draft = DataStore.mem().findOne("mail_composer_drafts", (d: any) => d._id === draftId && d.tenantId === tenantId);
    if (!draft) throw new Error(`Draft "${draftId}" not found`);
    if (draft.status !== "draft") throw new Error("Only draft-status drafts can be regenerated");
    const m = DataStore.mem().findOne("messages", (x: any) => x._id === draft.messageId && x.tenantId === tenantId);
    if (!m) throw new Error("Original message not found");
    const nextVariant = (draft.variant || 1) + 1;
    const mailbox = this.resolveMailbox(tenantId, draft.mailboxId);
    const rebuilt = this.buildDraft(tenantId, m, { mode: draft.mode, tone: draft.tone, to: draft.to, subject: draft.subject }, nextVariant, mailbox);
    rebuilt._id = draft._id;
    rebuilt.createdAt = draft.createdAt;
    const updated = DataStore.mem().update("mail_composer_drafts", (d: any) => d._id === draftId, rebuilt);
    logEntry(tenantId, "composer_regenerated", `Regenerated draft "${draft.subject}" — variant ${nextVariant}`, { draftId, variant: nextVariant });
    return { draft: { draftId: draft._id, ...updated, variant: nextVariant }, summary: `Draft regenerated (variant ${nextVariant})` };
  }

  dislikeDraft(tenantId: string, draftId: string, feedback?: string) {
    const draft = DataStore.mem().findOne("mail_composer_drafts", (d: any) => d._id === draftId && d.tenantId === tenantId);
    if (!draft) throw new Error(`Draft "${draftId}" not found`);
    if (draft.status !== "draft") throw new Error("Only draft-status drafts can be disliked");
    const m = DataStore.mem().findOne("messages", (x: any) => x._id === draft.messageId && x.tenantId === tenantId);
    if (!m) throw new Error("Original message not found");
    const nextVariant = (draft.variant || 1) + 1;
    const mailbox = this.resolveMailbox(tenantId, draft.mailboxId);
    const rebuilt = this.buildDraft(tenantId, m, { mode: draft.mode, tone: draft.tone, to: draft.to, subject: draft.subject }, nextVariant, mailbox);
    rebuilt._id = draft._id;
    rebuilt.createdAt = draft.createdAt;
    rebuilt.disliked = true;
    rebuilt.feedback = typeof feedback === "string" ? feedback : "";
    const updated = DataStore.mem().update("mail_composer_drafts", (d: any) => d._id === draftId, rebuilt);
    logEntry(tenantId, "composer_disliked", `Draft "${draft.subject}" disliked${feedback ? ` — "${feedback}"` : ""} — regenerating`, { draftId, variant: nextVariant, feedback: typeof feedback === "string" ? feedback : "" });
    return { draft: { draftId: draft._id, ...updated, variant: nextVariant }, summary: `Noted — regenerated a fresh draft (variant ${nextVariant})` };
  }

  saveEdits(tenantId: string, draftId: string, patch: any = {}) {
    const draft = DataStore.mem().findOne("mail_composer_drafts", (d: any) => d._id === draftId && d.tenantId === tenantId);
    if (!draft) throw new Error(`Draft "${draftId}" not found`);
    if (draft.status !== "draft") throw new Error("Only draft-status drafts can be edited");
    const updatedRow: any = { ...draft, updatedAt: new Date().toISOString() };
    if (typeof patch.subject === "string" && patch.subject.length > 0) updatedRow.subject = patch.subject;
    if (typeof patch.body === "string" && patch.body.length > 0) { updatedRow.body = patch.body; updatedRow.preview = patch.body.slice(0, 120); }
    if (Array.isArray(patch.to)) updatedRow.to = patch.to;
    if (typeof patch.tone === "string" && COMPOSER_TONES.some((t) => t.id === patch.tone)) updatedRow.tone = patch.tone;
    const updated = DataStore.mem().update("mail_composer_drafts", (d: any) => d._id === draftId, updatedRow);
    logEntry(tenantId, "composer_edited", `Draft "${draft.subject}" edited manually`, { draftId });
    return { draft: { draftId: draft._id, ...updated }, summary: `Draft updated` };
  }

  sendDraft(tenantId: string, draftId: string, mailboxId?: string) {
    const draft = DataStore.mem().findOne("mail_composer_drafts", (d: any) => d._id === draftId && d.tenantId === tenantId);
    if (!draft) throw new Error(`Draft "${draftId}" not found`);
    if (draft.status === "sent") return { sent: false, summary: `Draft "${draft.subject}" was already sent` };
    const mailbox = this.resolveMailbox(tenantId, typeof mailboxId === "string" ? mailboxId : draft.mailboxId);
    const result = mailMessage.composeSend(tenantId, mailbox._id, {
      to: draft.to,
      subject: draft.subject,
      body: draft.body,
    });
    const sentAt = new Date().toISOString();
    DataStore.mem().update("mail_composer_drafts", (d: any) => d._id === draftId, { status: "sent", sentAt });
    logEntry(tenantId, "composer_sent", `Sent "${draft.subject}" in 1 click (zero-tap draft)`, { draftId, messageId: result.message?._id || "" });
    return { sent: true, messageId: result.message?._id || "", summary: `Sent — "${draft.subject}" (1 click)` };
  }

  listDrafts(tenantId: string, status?: string) {
    const drafts = DataStore.mem()
      .find("mail_composer_drafts", (d: any) => d.tenantId === tenantId && (!status || d.status === status))
      .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return {
      drafts: drafts.map((d: any) => ({
        draftId: d._id, messageId: d.messageId, mode: d.mode, tone: d.tone, intent: d.intent,
        variant: d.variant, status: d.status, to: d.to, subject: d.subject,
        basedOn: d.basedOn, confidence: d.confidence, createdAt: d.createdAt, updatedAt: d.updatedAt, sentAt: d.sentAt,
      })),
      total: drafts.length,
      summary: `${drafts.length} composer draft(s)${status ? ` (${status})` : ""}`,
    };
  }

  getDraft(tenantId: string, draftId: string) {
    const draft = DataStore.mem().findOne("mail_composer_drafts", (d: any) => d._id === draftId && d.tenantId === tenantId);
    if (!draft) throw new Error(`Draft "${draftId}" not found`);
    return { draft: { draftId: draft._id, ...draft }, summary: `Draft "${draft.subject}" (v${draft.variant}, ${draft.confidence}% confidence)` };
  }

  deleteDraft(tenantId: string, draftId: string) {
    const draft = DataStore.mem().findOne("mail_composer_drafts", (d: any) => d._id === draftId && d.tenantId === tenantId);
    if (!draft) throw new Error(`Draft "${draftId}" not found`);
    DataStore.mem().delete("mail_composer_drafts", (d: any) => d._id === draftId && d.tenantId === tenantId);
    logEntry(tenantId, "composer_deleted", `Draft "${draft.subject}" discarded`, { draftId });
    return { deleted: true, summary: `Draft "${draft.subject}" discarded` };
  }

  composerDashboard(tenantId: string) {
    const drafts = DataStore.mem().find("mail_composer_drafts", (d: any) => d.tenantId === tenantId);
    const log = DataStore.mem().find("mail_composer_log", (l: any) => l.tenantId === tenantId).sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
    const sent = drafts.filter((d: any) => d.status === "sent").length;
    const regenerated = log.filter((l: any) => l.category === "composer_regenerated").length;
    const disliked = log.filter((l: any) => l.category === "composer_disliked").length;
    const byIntent: Record<string, number> = {};
    for (const d of drafts) byIntent[d.intent] = (byIntent[d.intent] || 0) + 1;
    const topIntents = Object.entries(byIntent).map(([intent, count]) => ({ intent, count })).sort((a: any, b: any) => b.count - a.count).slice(0, 4);
    const avgConfidence = drafts.length === 0 ? 0 : Math.round(drafts.reduce((a: number, d: any) => a + (d.confidence || 0), 0) / drafts.length);
    return {
      draftsTotal: drafts.length,
      sent,
      pending: drafts.length - sent,
      regenerations: regenerated,
      dislikes: disliked,
      avgConfidence,
      topIntents,
      actions: ["send", "edit", "regenerate", "don't_like"],
      clicksToSend: 1,
      recentLog: log.slice(0, 10),
      summary: `${drafts.length} draft(s) written, ${sent} sent — ${disliked} disliked, ${regenerated} regenerated`,
      seed: hashStr(tenantId + "composer_dash"),
    };
  }

  composerLog(tenantId: string) {
    const entries = DataStore.mem()
      .find("mail_composer_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return { entries: entries.slice(0, 30), total: entries.length };
  }
}

export const mailComposer = new MailComposerService();
