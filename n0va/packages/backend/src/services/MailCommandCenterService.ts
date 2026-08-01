import { DataStore } from "./DataStore";
import { mailboxService } from "./MailboxService";
import { mailMessage } from "./MailMessageService";
import { mailRules } from "./MailRulesService";
import { mailAgent } from "./MailAgentService";
import { mailFollowUp } from "./MailFollowUpService";
import { mailSpam } from "./MailSpamService";
import { mailCampaign } from "./MailCampaignService";
import { mailNeural } from "./MailNeuralService";
import { mailDomain } from "./MailDomainService";

export class MailCommandCenterService {
  mailCommandCenter(tenantId: string) {
    const unread = mailMessage.unreadSummary(tenantId);
    const neural = mailNeural.neuralMailboxDashboard(tenantId);
    const followUpSummary = mailFollowUp.followUpSummary(tenantId);
    const openFollowUps = mailFollowUp.listFollowUps(tenantId).followUps.filter((f: any) => f.status === "open").slice(0, 5);
    const scheduled = mailAgent.listScheduled(tenantId);
    const tasks = mailAgent.listTasks(tenantId);
    const spam = mailSpam.spamStatus(tenantId);
    const campaigns = mailCampaign.campaignsDashboard(tenantId);
    const storage = mailboxService.storageAnalytics(tenantId);
    const domains = mailDomain.domainSummary(tenantId);
    const escalation = mailNeural.escalationQueue(tenantId);
    const health = mailNeural.conversationHealth(tenantId);
    const archive = mailNeural.smartArchive(tenantId);

    const pendingApprovals = campaigns.recent.filter((c: any) => c.status === "pending_approval").slice(0, 5);
    const dueScheduled = scheduled.schedules.filter((s: any) => s.status === "scheduled").slice(0, 5);
    const criticalMailboxes = storage.totals.critical;
    const healthCritical = health.alerts.filter((a: any) => a.level === "critical").length;

    const attentionScore = followUpSummary.overdue + escalation.total + criticalMailboxes + healthCritical + campaigns.totals.pendingApproval;
    const verdict = attentionScore === 0 ? "Good to go" : attentionScore <= 3 ? "Mostly clear" : "Needs attention";

    const morningReport = [
      `${unread.totals.totalUnread} unread email(s) in your inbox — ${neural.overview.length} in the auto-priority queue.`,
      `${followUpSummary.openFollowUps} open follow-up(s) (${followUpSummary.overdue} overdue, ${followUpSummary.dueToday} due today).`,
      `${scheduled.pending} scheduled send(s) waiting — ${escalation.total} escalated to human review.`,
      `${tasks.totals.open} open task(s) extracted from mail, ${spam.quarantineCount} in quarantine.`,
      `${campaigns.totals.pendingApproval} campaign(s) awaiting approval, ${archive.total} smart-archive candidate(s).`,
      `Storage at ${storage.totals.percentUsed}% across ${storage.totals.mailboxes} mailbox(es)${domains.totals.active ? `, ${domains.totals.active} active domain(s) at reputation ${domains.avgReputation}/100` : ""}.`,
    ];

    return {
      generatedAt: new Date().toISOString(),
      cards: {
        unread: { value: unread.totals.totalUnread, label: "unread in inbox" },
        priority: { value: neural.overview.length, label: "in auto-priority queue" },
        followUpsDue: { value: followUpSummary.dueToday, label: "follow-ups due today" },
        scheduledToday: { value: scheduled.pending, label: "scheduled sends pending" },
      },
      sections: {
        priorityQueue: neural.overview,
        followUps: openFollowUps,
        scheduled: dueScheduled,
        escalations: escalation.queue,
        healthAlerts: health.alerts.slice(0, 5),
        campaignApprovals: pendingApprovals,
      },
      counts: {
        openTasks: tasks.totals.open,
        quarantine: spam.quarantineCount,
        archiveCandidates: archive.total,
        storageCritical: criticalMailboxes,
        domainsFlagged: domains.flagged,
        healthCritical,
      },
      storage: { percentUsed: storage.totals.percentUsed, mailboxes: storage.totals.mailboxes, messages: storage.totals.messages, usedBytes: storage.totals.usedBytes },
      domains: { active: domains.totals.active, total: domains.totals.total, avgReputation: domains.avgReputation, flagged: domains.flagged },
      readyActions: {
        priorityQueue: neural.overview.length,
        completeFollowUps: followUpSummary.openFollowUps,
        sendScheduled: scheduled.pending,
        approveCampaigns: campaigns.totals.pendingApproval,
        quarantine: spam.quarantineCount,
        smartArchive: archive.total,
      },
      attentionScore,
      verdict,
      morningReport,
      summary: `Mail command center — ${unread.totals.totalUnread} unread, ${followUpSummary.dueToday} follow-ups due today, verdict: ${verdict}`,
      seed: hashStr(tenantId + "mail_command_center"),
    };
  }

  completeFollowUp(tenantId: string, followUpId: string) {
    return mailFollowUp.completeFollowUp(tenantId, followUpId);
  }

  sendScheduledNow(tenantId: string, scheduleId: string) {
    return mailAgent.sendScheduleNow(tenantId, scheduleId);
  }

  approveCampaign(tenantId: string, campaignId: string, approver?: string) {
    return mailCampaign.approveCampaign(tenantId, campaignId, approver);
  }

  rejectCampaign(tenantId: string, campaignId: string, reason?: string) {
    return mailCampaign.rejectCampaign(tenantId, campaignId, reason);
  }

  runRulesSweep(tenantId: string) {
    return mailRules.sweepRules(tenantId);
  }

  rescanSpam(tenantId: string) {
    return mailSpam.scanAll(tenantId);
  }

  runAgentCycle(tenantId: string, mailboxId?: string) {
    return mailAgent.runAgentCycle(tenantId, mailboxId);
  }

  smartArchiveNow(tenantId: string, olderThanDays?: number) {
    return mailNeural.smartArchive(tenantId, { apply: true, olderThanDays });
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const mailCommand = new MailCommandCenterService();
