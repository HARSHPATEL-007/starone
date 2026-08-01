import { DataStore } from "./DataStore";
import { mailMessage } from "./MailMessageService";
import { mailTemplates } from "./MailTemplateService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const APPROVAL_THRESHOLD = 50;
const RATE_LIMIT_PER_HOUR = 200;

export class MailCampaignService {
  private getMailbox(tenantId: string, mailboxId?: string): any {
    if (mailboxId) {
      const mb = DataStore.mem().findOne("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId);
      if (mb) return mb;
      throw new Error(`Mailbox "${mailboxId}" not found`);
    }
    const mailboxes = DataStore.mem().find("mailboxes", (m: any) => m.tenantId === tenantId);
    if (mailboxes.length === 0) throw new Error("No mailboxes configured");
    return mailboxes.find((m: any) => m.status === "active") || mailboxes[0];
  }

  private getCampaign(tenantId: string, campaignId: string): any {
    const c = DataStore.mem().findOne("mail_campaigns", (x: any) => x._id === campaignId && x.tenantId === tenantId);
    if (!c) throw new Error(`Campaign "${campaignId}" not found`);
    return c;
  }

  private log(tenantId: string, entry: any) {
    DataStore.mem().insert("mail_campaign_log", { tenantId, ...entry, at: new Date().toISOString() });
  }

  private resolveRecipients(tenantId: string, audience: any): any[] {
    const contacts = DataStore.mem().find("mail_contacts", (c: any) => c.tenantId === tenantId);
    let pool = contacts;
    if (!audience || audience.all) {
      // all contacts
    } else if (audience.contacts && Array.isArray(audience.contacts)) {
      pool = contacts.filter(c => audience.contacts.includes(c._id));
    } else if (audience.groups && Array.isArray(audience.groups)) {
      pool = contacts.filter(c => (c.tags || []).some((t: string) => audience.groups.includes(t)));
    } else if (audience.query) {
      const q = String(audience.query).toLowerCase();
      pool = contacts.filter(c =>
        [c.name, c.email, c.company || ""].some(v => String(v).toLowerCase().includes(q)));
    } else {
      pool = contacts;
    }
    return pool.map(c => {
      const parts = (c.name || "").split(" ");
      return {
        contactId: c._id,
        name: c.name,
        email: c.email,
        tags: c.tags || [],
        company: c.company || "",
        variables: { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "", name: c.name, company: c.company || "", email: c.email },
      };
    });
  }

  createCampaign(tenantId: string, mailboxId: string, input: any) {
    const mb = this.getMailbox(tenantId, mailboxId);
    if (!input || !input.name) throw new Error("Campaign name is required");
    if (!input.templateId) throw new Error("templateId is required");
    mailTemplates.getTemplatePublic(tenantId, input.templateId);
    const campaign = DataStore.mem().insert("mail_campaigns", {
      tenantId,
      mailboxId: mb._id,
      name: input.name,
      templateId: input.templateId,
      audience: input.audience || { all: true },
      variables: input.variables || {},
      abSubject: input.abSubject || null,
      scheduleAt: input.scheduleAt ? new Date(input.scheduleAt).toISOString() : null,
      followUpAfterDays: input.followUpAfterDays || 0,
      rateLimitPerHour: input.rateLimitPerHour || RATE_LIMIT_PER_HOUR,
      status: "draft",
      recipientsCount: 0,
      stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, complaints: 0, failed: 0 },
      createdBy: input.createdBy || "user_001",
      launchedAt: null,
    });
    this.log(tenantId, { action: "created", campaignId: campaign._id, name: input.name, detail: `Campaign "${input.name}" created` });
    return { campaignId: campaign._id, ...campaign, summary: `Campaign "${input.name}" created` };
  }

  listCampaigns(tenantId: string) {
    const campaigns = DataStore.mem().find("mail_campaigns", (c: any) => c.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      campaigns: campaigns.map(c => ({ ...c, campaignId: c._id, recipients: this.resolveRecipients(tenantId, c.audience).length })),
      totals: {
        total: campaigns.length,
        draft: campaigns.filter(c => c.status === "draft").length,
        pendingApproval: campaigns.filter(c => c.status === "pending_approval").length,
        active: campaigns.filter(c => c.status === "active" || c.status === "sent" || c.status === "completed").length,
        paused: campaigns.filter(c => c.status === "paused").length,
      },
      summary: `${campaigns.length} campaign(s) — ${campaigns.filter(c => c.status === "pending_approval").length} awaiting approval`,
    };
  }

  getCampaignPublic(tenantId: string, campaignId: string) {
    const c = this.getCampaign(tenantId, campaignId);
    return { ...c, campaignId: c._id, recipients: this.resolveRecipients(tenantId, c.audience).length };
  }

  deleteCampaign(tenantId: string, campaignId: string) {
    const c = this.getCampaign(tenantId, campaignId);
    if (c.status === "active" || c.status === "pending_approval") throw new Error("Active or pending campaigns must be rejected or paused before deletion");
    DataStore.mem().delete("mail_campaigns", (x: any) => x._id === campaignId && x.tenantId === tenantId);
    this.log(tenantId, { action: "deleted", campaignId, name: c.name, detail: `Campaign "${c.name}" deleted` });
    return { campaignId, summary: `Campaign "${c.name}" deleted` };
  }

  launchCampaign(tenantId: string, campaignId: string) {
    const c = this.getCampaign(tenantId, campaignId);
    if (c.status !== "draft" && c.status !== "rejected") throw new Error(`Only draft campaigns can be launched (current: ${c.status})`);
    const recipients = this.resolveRecipients(tenantId, c.audience);
    if (recipients.length === 0) throw new Error("Campaign audience matched no contacts — add recipients first");
    if (recipients.length > APPROVAL_THRESHOLD) {
      const updated = DataStore.mem().update("mail_campaigns", (x: any) => x._id === campaignId && x.tenantId === tenantId, {
        status: "pending_approval", recipientsCount: recipients.length,
      });
      this.log(tenantId, { action: "approval_requested", campaignId, name: c.name, detail: `Campaign "${c.name}" (${recipients.length} recipients) queued for approval` });
      return { ...updated, recipients: recipients.length, approvalRequired: true, summary: `Campaign "${c.name}" targets ${recipients.length} recipients — approval required` };
    }
    return this.executeCampaign(tenantId, c, recipients);
  }

  private executeCampaign(tenantId: string, campaign: any, recipients: any[]) {
    const tpl = mailTemplates.getTemplatePublic(tenantId, campaign.templateId);
    const limit = campaign.rateLimitPerHour || RATE_LIMIT_PER_HOUR;
    const rateLimited = recipients.length > limit;
    const events: any[] = [];
    let sent = 0, delivered = 0, opened = 0, clicked = 0, replied = 0, complaints = 0, failed = 0;
    const seed = `${campaign.name}|${campaign.templateId}|${JSON.stringify(campaign.audience || {})}|${campaign.abSubject || ""}`;
    recipients.forEach((rcpt, i) => {
      const email = rcpt.email;
      if (!email) { failed++; return; }
      const roll = hashStr(email + "|" + seed);
      if (roll % 13 === 0) {
        failed++;
        events.push({ contactId: rcpt.contactId, email, event: "failed", at: new Date().toISOString(), subject: campaign.abSubject && roll % 2 === 0 ? campaign.abSubject : tpl.subject });
        return;
      }
      const vars = { ...campaign.variables, ...rcpt.variables };
      let rendered;
      try {
        rendered = mailTemplates.renderTemplate(tenantId, campaign.templateId, vars);
      } catch (e: any) {
        failed++;
        events.push({ contactId: rcpt.contactId, email, event: "failed", at: new Date().toISOString(), subject: tpl.subject, error: e.message || "render failed" });
        return;
      }
      const subject = campaign.abSubject && roll % 2 === 0 ? campaign.abSubject : rendered.subject;
      const at = new Date(Date.now() + i * 60000).toISOString();
      try {
        mailMessage.composeSend(tenantId, campaign.mailboxId, { to: email, subject, body: rendered.body, importance: "normal" });
      } catch (e: any) {
        failed++;
        events.push({ contactId: rcpt.contactId, email, event: "failed", at, subject });
        return;
      }
      sent++;
      events.push({ contactId: rcpt.contactId, email, event: "sent", at, subject });
      if (hashStr(email + "|" + seed + "del") % 8 !== 0) {
        delivered++;
        events.push({ contactId: rcpt.contactId, email, event: "delivered", at, subject });
        if (hashStr(email + "|" + seed + "open") % 10 < 6) {
          opened++;
          events.push({ contactId: rcpt.contactId, email, event: "opened", at: new Date(Date.now() + i * 60000 + 300000).toISOString(), subject });
          if (hashStr(email + "|" + seed + "click") % 5 < 2) {
            clicked++;
            events.push({ contactId: rcpt.contactId, email, event: "clicked", at: new Date(Date.now() + i * 60000 + 900000).toISOString(), subject });
          }
          if (hashStr(email + "|" + seed + "reply") % 9 < 2) {
            replied++;
            events.push({ contactId: rcpt.contactId, email, event: "replied", at: new Date(Date.now() + i * 60000 + 1800000).toISOString(), subject });
          }
        }
      }
      if (hashStr(email + "|" + seed + "complaint") % 23 === 0) {
        complaints++;
        events.push({ contactId: rcpt.contactId, email, event: "complaint", at, subject });
      }
    });
    for (const ev of events) DataStore.mem().insert("mail_campaign_events", { tenantId, campaignId: campaign._id, ...ev });
    const stats = { sent, delivered, opened, clicked, replied, complaints, failed };
    const complaintRate = sent > 0 ? complaints / sent : 0;
    const autoPaused = complaintRate > 0.02;
    const status = autoPaused ? "paused" : "completed";
    const updated = DataStore.mem().update("mail_campaigns", (x: any) => x._id === campaign._id && x.tenantId === tenantId, {
      status, recipientsCount: recipients.length, stats, launchedAt: new Date().toISOString(),
      ...(campaign.abSubject ? { abWinner: this.abWinner(tenantId, campaign._id, campaign.abSubject) } : {}),
    });
    this.log(tenantId, { action: autoPaused ? "auto_paused" : "launched", campaignId: campaign._id, name: campaign.name, detail: `Campaign "${campaign.name}" — ${sent} sent, ${failed} failed${autoPaused ? " (auto-paused: complaint rate too high)" : ""}` });
    return {
      campaignId: campaign._id,
      name: campaign.name,
      status: updated.status,
      recipients: recipients.length,
      stats,
      rateLimited,
      approvalRequired: false,
      summary: `Campaign "${campaign.name}" — ${sent} sent, ${failed} failed${autoPaused ? " — auto-paused (complaint rate > 2%)" : ""}`,
    };
  }

  private abWinner(tenantId: string, campaignId: string, abSubject: string) {
    const events = DataStore.mem().find("mail_campaign_events", (e: any) => e.tenantId === tenantId && e.campaignId === campaignId);
    const base = events.filter((e: any) => e.event === "opened");
    const variantOpens = base.filter((e: any) => e.subject === abSubject).length;
    const baseOpens = base.length - variantOpens;
    return baseOpens >= variantOpens
      ? { subject: "original", opens: baseOpens, summary: "Original subject is winning" }
      : { subject: abSubject, opens: variantOpens, summary: `Variant "${abSubject}" is winning` };
  }

  approveCampaign(tenantId: string, campaignId: string, approver?: string) {
    const c = this.getCampaign(tenantId, campaignId);
    if (c.status !== "pending_approval") throw new Error(`Campaign "${c.name}" is not awaiting approval`);
    this.log(tenantId, { action: "approved", campaignId, name: c.name, detail: `Campaign "${c.name}" approved by ${approver || "approver"}` });
    const recipients = this.resolveRecipients(tenantId, c.audience);
    return this.executeCampaign(tenantId, c, recipients);
  }

  rejectCampaign(tenantId: string, campaignId: string, reason?: string) {
    const c = this.getCampaign(tenantId, campaignId);
    if (c.status !== "pending_approval") throw new Error(`Campaign "${c.name}" is not awaiting approval`);
    const updated = DataStore.mem().update("mail_campaigns", (x: any) => x._id === campaignId && x.tenantId === tenantId, { status: "rejected", rejectionReason: reason || "" });
    this.log(tenantId, { action: "rejected", campaignId, name: c.name, detail: `Campaign "${c.name}" rejected${reason ? ` — ${reason}` : ""}` });
    return { campaignId, name: c.name, status: "rejected", summary: `Campaign "${c.name}" rejected` };
  }

  pauseCampaign(tenantId: string, campaignId: string) {
    const c = this.getCampaign(tenantId, campaignId);
    if (c.status === "draft" || c.status === "rejected" || c.status === "paused") throw new Error(`Campaign "${c.name}" cannot be paused from "${c.status}"`);
    const updated = DataStore.mem().update("mail_campaigns", (x: any) => x._id === campaignId && x.tenantId === tenantId, { status: "paused" });
    this.log(tenantId, { action: "paused", campaignId, name: c.name, detail: `Campaign "${c.name}" paused` });
    return { campaignId, name: c.name, status: "paused", summary: `Campaign "${c.name}" paused` };
  }

  resumeCampaign(tenantId: string, campaignId: string) {
    const c = this.getCampaign(tenantId, campaignId);
    if (c.status !== "paused") throw new Error(`Campaign "${c.name}" is not paused`);
    const updated = DataStore.mem().update("mail_campaigns", (x: any) => x._id === campaignId && x.tenantId === tenantId, { status: "active" });
    this.log(tenantId, { action: "resumed", campaignId, name: c.name, detail: `Campaign "${c.name}" resumed` });
    return { campaignId, name: c.name, status: "active", summary: `Campaign "${c.name}" resumed` };
  }

  campaignStats(tenantId: string, campaignId: string) {
    const c = this.getCampaign(tenantId, campaignId);
    const s = c.stats || { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, complaints: 0, failed: 0 };
    const openRate = s.delivered > 0 ? Math.round((s.opened / s.delivered) * 1000) / 10 : 0;
    const clickRate = s.opened > 0 ? Math.round((s.clicked / s.opened) * 1000) / 10 : 0;
    const replyRate = s.opened > 0 ? Math.round((s.replied / s.opened) * 1000) / 10 : 0;
    const complaintRate = s.sent > 0 ? Math.round((s.complaints / s.sent) * 10000) / 100 : 0;
    const recent = DataStore.mem().find("mail_campaign_events", (e: any) => e.tenantId === tenantId && e.campaignId === campaignId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);
    return {
      campaignId,
      name: c.name,
      status: c.status,
      stats: s,
      rates: { openRate, clickRate, replyRate, complaintRate },
      ab: c.abWinner || null,
      recentEvents: recent,
      summary: `${s.sent} sent · ${openRate}% open · ${clickRate}% click · ${replyRate}% reply`,
    };
  }

  campaignsDashboard(tenantId: string) {
    const list = this.listCampaigns(tenantId);
    const all = list.campaigns;
    const sum = (fn: (c: any) => number) => all.reduce((acc, c) => acc + fn(c.stats || {}), 0);
    const totalRecipients = all.reduce((acc, c) => acc + (c.recipients || 0), 0);
    return {
      totals: list.totals,
      totalRecipients,
      sent: sum(s => s.sent || 0),
      delivered: sum(s => s.delivered || 0),
      opened: sum(s => s.opened || 0),
      clicked: sum(s => s.clicked || 0),
      replied: sum(s => s.replied || 0),
      complaints: sum(s => s.complaints || 0),
      recent: all.slice(0, 5).map(c => ({ campaignId: c._id, name: c.name, status: c.status, sent: (c.stats || {}).sent || 0 })),
      summary: `${all.length} campaign(s), ${totalRecipients} total recipients, ${sum(s => s.sent || 0)} messages sent`,
      seed: hashStr(tenantId + "campaign_dash"),
    };
  }

  campaignResponseHandling(tenantId: string, campaignId: string) {
    const c = this.getCampaign(tenantId, campaignId);
    const replies = DataStore.mem().find("mail_campaign_events", (e: any) => e.tenantId === tenantId && e.campaignId === campaignId && e.event === "replied");
    const categories: Record<string, number> = { interested: 0, question: 0, not_interested: 0, other: 0 };
    for (const r of replies) {
      const roll = hashStr(r.email + campaignId + "resp") % 4;
      const key = roll === 0 ? "interested" : roll === 1 ? "question" : roll === 2 ? "not_interested" : "other";
      categories[key]++;
    }
    const suggestions: string[] = [];
    if (categories.interested > 0) suggestions.push("Reply with next steps and a calendar link — these leads are warm");
    if (categories.question > 0) suggestions.push("Prepare an FAQ reply from your template library");
    if (categories.not_interested > 0) suggestions.push("Move not-interested contacts to a nurture group, not spam");
    return {
      campaignId,
      name: c.name,
      replies: replies.length,
      categories,
      suggestions,
      summary: `${replies.length} reply(ies) — ${categories.interested} interested, ${categories.question} questions`,
    };
  }

  campaignLog(tenantId: string, limit = 20) {
    const log = DataStore.mem().find("mail_campaign_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, limit);
    return { log, total: log.length, summary: `${log.length} campaign event(s) recorded` };
  }
}

export const mailCampaign = new MailCampaignService();
