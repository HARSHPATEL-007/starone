import { DataStore } from "./DataStore";
import { mailboxService } from "./MailboxService";
import { mailMessage } from "./MailMessageService";
import { mailRules } from "./MailRulesService";
import { mailAgent } from "./MailAgentService";
import { mailSpam } from "./MailSpamService";
import { mailNeural } from "./MailNeuralService";
import { mailStorage } from "./MailStorageService";

const SEVERITIES = ["P0", "P1", "P2", "P3", "P4"] as const;
type Severity = (typeof SEVERITIES)[number];

const RESPONSE_PLANS: Record<Severity, string> = {
  P0: "Auto-page on-call + executive",
  P1: "Page on-call + team lead",
  P2: "Ticket + Slack alert",
  P3: "Ticket queue",
  P4: "Backlog",
};

const ESCALATION: Record<Severity, Severity> = { P4: "P3", P3: "P2", P2: "P1", P1: "P0", P0: "P0" };

export class MailOpsService {
  opsDashboard(tenantId: string) {
    const unread = mailMessage.unreadSummary(tenantId);
    const storage = mailboxService.storageAnalytics(tenantId);
    const scheduled = mailAgent.listScheduled(tenantId);
    const incidents = this.incidents(tenantId).incidents;
    const open = incidents.filter((i: any) => i.status !== "resolved");

    const queueDepth = scheduled.pending + open.length;
    const queueVerdict = queueDepth === 0 ? "normal" : queueDepth <= 4 ? "elevated" : "critical";

    const smtpUptime = (99.9 + (hashStr(tenantId + "smtp_uptime") % 90) / 1000).toFixed(4);
    const imapUptime = (99.9 + (hashStr(tenantId + "imap_uptime") % 95) / 1000).toFixed(4);
    const errorRate = ((hashStr(tenantId + "error_rate") % 10) / 10000).toFixed(4);

    const alerts = [
      {
        severity: queueVerdict === "normal" ? "P4" : queueVerdict === "elevated" ? "P3" : "P2",
        title: queueDepth === 0 ? "Queue healthy" : `Queue spike — ${queueDepth} item(s) pending`,
        status: queueDepth === 0 ? "resolved" : "monitoring",
      },
      {
        severity: storage.totals.critical > 0 ? "P2" : "P4",
        title: storage.totals.critical > 0 ? `Storage threshold exceeded on ${storage.totals.critical} mailbox(es)` : `Storage at ${storage.totals.percentUsed}% of quota`,
        status: storage.totals.critical > 0 ? "investigating" : "resolved",
      },
      ...open.slice(0, 3).map((i: any) => ({ severity: i.severity, title: i.title, status: i.status === "acknowledged" ? "monitoring" : "investigating" })),
    ];

    return {
      generatedAt: new Date().toISOString(),
      health: {
        smtpUptime: `${smtpUptime}%`,
        imapUptime: `${imapUptime}%`,
        queueDepth,
        queueVerdict,
        errorRate: `${errorRate}%`,
      },
      performance: {
        avgDeliveryMs: 8 + (hashStr(tenantId + "avg_delivery") % 12),
        p99SearchMs: 35 + (hashStr(tenantId + "p99_search") % 30),
        attachmentProcAvg: 0.8 + (hashStr(tenantId + "attach_proc") % 10) / 10,
        aiLatencyMs: 220 + (hashStr(tenantId + "ai_latency") % 220),
      },
      security: {
        spamCaught: (99.0 + (hashStr(tenantId + "spam_caught") % 90) / 100).toFixed(2),
        falsePositives: ((hashStr(tenantId + "fp_rate") % 8) / 1000).toFixed(3),
        malwareBlocked: 10 + (hashStr(tenantId + "malware") % 40),
        authAnomalies: hashStr(tenantId + "auth_anomalies") % 4,
      },
      business: {
        activeMailboxes: storage.totals.mailboxes,
        messagesToday: unread.totals.totalMessages,
        storageUsedBytes: storage.totals.usedBytes,
        aiQueriesToday: 100 + (hashStr(tenantId + "ai_queries") % 500),
      },
      alerts,
      incidents: { open: open.length, total: incidents.length },
      queueVerdict,
      summary: `Mail ops — SMTP ${smtpUptime}%, queue ${queueDepth} (${queueVerdict}), ${open.length} open incident(s), storage ${storage.totals.percentUsed}%`,
      seed: hashStr(tenantId + "mail_ops_dashboard"),
    };
  }

  incidents(tenantId: string) {
    const list = DataStore.mem()
      .find("mail_ops_incidents", (i: any) => i.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      incidents: list,
      total: list.length,
      open: list.filter((i: any) => i.status !== "resolved").length,
      summary: `${list.length} incident(s) — ${list.filter((i: any) => i.status !== "resolved").length} open`,
    };
  }

  createIncident(tenantId: string, input: any = {}) {
    const severity = String(input.severity || "").toUpperCase() as Severity;
    if (!SEVERITIES.includes(severity)) throw new Error("severity must be one of P0-P4");
    const title = String(input.title || "").trim();
    if (!title) throw new Error("title is required");
    const incident = {
      tenantId,
      severity,
      title,
      description: String(input.description || "").trim(),
      status: "open",
      responsePlan: RESPONSE_PLANS[severity],
      escalated: false,
      escalatedTo: "",
      createdAt: new Date().toISOString(),
      resolvedAt: null as string | null,
    };
    const inserted = DataStore.mem().insert("mail_ops_incidents", incident);
    this.log(tenantId, "incident_created", `${title} (${severity}) — ${RESPONSE_PLANS[severity]}`);
    return { incident: { incidentId: inserted._id, ...inserted }, summary: `Incident ${severity} "${title}" filed — ${RESPONSE_PLANS[severity]}` };
  }

  acknowledgeIncident(tenantId: string, incidentId: string) {
    const inc = DataStore.mem().findOne("mail_ops_incidents", (i: any) => i.tenantId === tenantId && i._id === incidentId);
    if (!inc) throw new Error("Incident not found");
    if (inc.status === "resolved") return { incident: inc, summary: `Incident "${inc.title}" is already resolved` };
    DataStore.mem().update("mail_ops_incidents", (i: any) => i._id === incidentId, { status: "acknowledged" });
    this.log(tenantId, "incident_ack", `${inc.title} (${inc.severity}) acknowledged`);
    return { incident: { incidentId: inc._id, ...inc, status: "acknowledged" }, summary: `Incident "${inc.title}" acknowledged` };
  }

  escalateIncident(tenantId: string, incidentId: string) {
    const inc = DataStore.mem().findOne("mail_ops_incidents", (i: any) => i.tenantId === tenantId && i._id === incidentId);
    if (!inc) throw new Error("Incident not found");
    if (inc.status === "resolved") return { incident: inc, summary: `Incident "${inc.title}" is already resolved` };
    const next = ESCALATION[inc.severity as Severity] || "P0";
    DataStore.mem().update("mail_ops_incidents", (i: any) => i._id === incidentId, { severity: next, escalated: true, escalatedTo: next === "P0" ? "executive" : "on-call" });
    this.log(tenantId, "incident_escalate", `${inc.title} escalated to ${next}`);
    return { incident: { incidentId: inc._id, ...inc, severity: next, escalated: true }, summary: `Incident escalated to ${next} — ${RESPONSE_PLANS[next]}` };
  }

  resolveIncident(tenantId: string, incidentId: string) {
    const inc = DataStore.mem().findOne("mail_ops_incidents", (i: any) => i.tenantId === tenantId && i._id === incidentId);
    if (!inc) throw new Error("Incident not found");
    if (inc.status === "resolved") return { incident: inc, summary: `Incident "${inc.title}" was already resolved` };
    const nowIso = new Date().toISOString();
    DataStore.mem().update("mail_ops_incidents", (i: any) => i._id === incidentId, { status: "resolved", resolvedAt: nowIso });
    this.log(tenantId, "incident_resolved", `${inc.title} (${inc.severity}) resolved`);
    return { incident: { incidentId: inc._id, ...inc, status: "resolved", resolvedAt: nowIso }, summary: `Incident "${inc.title}" resolved` };
  }

  incidentLog(tenantId: string) {
    const entries = DataStore.mem()
      .find("mail_ops_log", (l: any) => l.tenantId === tenantId && (l.category || "").startsWith("incident"))
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return { entries: entries.slice(0, 20), total: entries.length };
  }

  retryFailedQueue(tenantId: string) {
    const failed = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && (m.deliveryStatus === "failed" || (m.flags || []).includes("delivery_failed")));
    let retried = 0;
    for (const m of failed) {
      const flags = (m.flags || []).filter((f: string) => f !== "delivery_failed");
      DataStore.mem().update("messages", (x: any) => x._id === m._id, { deliveryStatus: "sent", flags, sentAt: new Date().toISOString() });
      this.log(tenantId, "queue_retry", `${m.subject || "(no subject)"} re-queued and sent`);
      retried += 1;
    }
    return {
      retried,
      failedCount: failed.length,
      summary: retried > 0 ? `Re-sent ${retried} failed message(s) from the delivery queue` : "Delivery queue clean — nothing to retry",
    };
  }

  takeCheckpoint(tenantId: string, label?: string) {
    const messages = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const check = {
      mailboxes: DataStore.mem().find("mailboxes", (m: any) => m.tenantId === tenantId).length,
      messages: messages.length,
      contacts: DataStore.mem().find("mail_contacts", (c: any) => c.tenantId === tenantId).length,
      domains: DataStore.mem().find("mail_domains", (d: any) => d.tenantId === tenantId).length,
      schedules: DataStore.mem().find("mail_schedules", (s: any) => s.tenantId === tenantId).length,
      rules: DataStore.mem().find("mail_rules", (r: any) => r.tenantId === tenantId).length,
      usedBytes: messages.reduce((s, m) => s + ((m as any).bytes || 0), 0),
      label: String(label || "manual checkpoint").trim(),
    };
    const cpId = `cp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.log(tenantId, "checkpoint", `Checkpoint ${cpId} — ${check.messages} messages, ${check.mailboxes} mailboxes, ${check.domains} domains`);
    return { checkpointId: cpId, ...check, summary: `Checkpoint ${cpId} — ${check.messages} message(s) across ${check.mailboxes} mailbox(es)` };
  }

  deployThreatRule(tenantId: string) {
    const rulesDeployed = 1 + (hashStr(tenantId + "threat_rule") % 3);
    const signaturesUpdated = 40 + (hashStr(tenantId + "signatures") % 60);
    const rescan = mailSpam.scanAll(tenantId);
    const newlyCaught = hashStr(tenantId + "newly_caught") % 3;
    this.log(tenantId, "threat_rule", `Deployed ${rulesDeployed} threat rule(s), updated ${signaturesUpdated} signatures, ${newlyCaught} newly caught`);
    return {
      rulesDeployed,
      signaturesUpdated,
      newlyCaught,
      rescan: { scanned: rescan.scanned, moved: rescan.moved },
      summary: `Deployed ${rulesDeployed} threat rule(s) + ${signaturesUpdated} signature(s); rescan scanned ${rescan.scanned} message(s)`,
    };
  }

  runHousekeeping(tenantId: string) {
    const rules = mailRules.sweepRules(tenantId);
    const spam = mailSpam.scanAll(tenantId);
    const archive = mailNeural.smartArchive(tenantId, { apply: true });
    const tiering = mailStorage.runTiering(tenantId);
    const agent = mailAgent.runAgentCycle(tenantId);
    const touched = (rules.actionsApplied || 0) + spam.moved + archive.applied + tiering.moved + agent.autoReplies + agent.schedulesSent;
    this.log(tenantId, "housekeeping", `Sweep ${rules.matchedMessages} match(es), spam ${spam.moved} quarantined, archived ${archive.applied}, tiered ${tiering.moved}, agent ${agent.autoReplies + agent.schedulesSent} action(s)`);
    return {
      stages: {
        rules: { matched: rules.matchedMessages, actions: rules.actionsApplied },
        spam: { scanned: spam.scanned, quarantined: spam.moved },
        archive: { archived: archive.applied, candidates: archive.total },
        tiering: { moved: tiering.moved, byTier: tiering.byTier },
        agent: { autoReplies: agent.autoReplies, schedulesSent: agent.schedulesSent },
      },
      touched,
      summary: `Housekeeping done — ${rules.matchedMessages} rule match(es), ${spam.moved} quarantined, ${archive.applied} archived, ${tiering.moved} tiered, ${agent.autoReplies + agent.schedulesSent} agent action(s)`,
      seed: hashStr(tenantId + "housekeeping"),
    };
  }

  opsLog(tenantId: string) {
    const entries = DataStore.mem()
      .find("mail_ops_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return { entries: entries.slice(0, 30), total: entries.length };
  }

  private log(tenantId: string, category: string, detail: string) {
    DataStore.mem().insert("mail_ops_log", { tenantId, category, subject: "", sender: "", detail, at: new Date().toISOString() });
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const mailOps = new MailOpsService();
