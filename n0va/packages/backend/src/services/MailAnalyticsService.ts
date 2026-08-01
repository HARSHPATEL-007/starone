import { DataStore } from "./DataStore";
import { estimateMessageBytes } from "./MailboxService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export class MailAnalyticsService {
  private msgs(tenantId: string) {
    return DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
  }

  overview(tenantId: string) {
    const msgs = this.msgs(tenantId);
    const threads = new Set(msgs.map(m => m.threadId).filter(Boolean));
    const attachments = msgs.reduce((s, m) => s + (m.attachments || []).length, 0);
    const attachmentBytes = msgs.reduce((s, m) => s + (m.attachments || []).reduce((a, at) => a + (at.sizeBytes || 0), 0), 0);
    const storageBytes = msgs.reduce((s, m) => s + estimateMessageBytes(m), 0);
    return {
      totals: {
        messages: msgs.length,
        received: msgs.filter(m => m.folder === "inbox").length,
        sent: msgs.filter(m => m.folder === "sent").length,
        drafts: msgs.filter(m => m.folder === "drafts").length,
        unread: msgs.filter(m => !m.read && m.folder === "inbox").length,
        threads: threads.size,
        attachments,
        attachmentBytes,
        storageBytes,
        storageMb: Math.round((storageBytes / (1024 * 1024)) * 100) / 100,
      },
      summary: `${msgs.length} message(s) across ${threads.size} thread(s) — ${msgs.filter(m => !m.read && m.folder === "inbox").length} unread`,
      seed: hashStr(tenantId + "analytics_overview"),
    };
  }

  volumeTrend(tenantId: string, days = 14) {
    const msgs = this.msgs(tenantId);
    const trend: any[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = dayKey(d);
      const received = msgs.filter(m => m.receivedAt && dayKey(new Date(m.receivedAt)) === key).length;
      const sent = msgs.filter(m => m.sentAt && dayKey(new Date(m.sentAt)) === key).length;
      trend.push({ date: key, received, sent, total: received + sent });
    }
    const weekTotal = trend.reduce((s, t) => s + t.total, 0);
    return { trend, days, summary: `${weekTotal} message(s) in the last ${days} days`, seed: hashStr(tenantId + "volume_trend" + days) };
  }

  categoryMix(tenantId: string) {
    const msgs = this.msgs(tenantId);
    const counts = new Map<string, number>();
    for (const m of msgs) {
      const cat = (m.ai && m.ai.category) || "uncategorized";
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    const total = msgs.length || 1;
    return [...counts.entries()].map(([category, count]) => ({ category, count, pct: Math.round((count / total) * 1000) / 10 }))
      .sort((a, b) => b.count - a.count);
  }

  topSenders(tenantId: string, limit = 5) {
    const msgs = this.msgs(tenantId);
    const counts = new Map<string, { name: string; email: string; count: number; unread: number; avgPriority: number }>();
    for (const m of msgs) {
      const from = m.from || {};
      if (!from.email) continue;
      const entry = counts.get(from.email) || { name: from.name || "", email: from.email, count: 0, unread: 0, avgPriority: 0 };
      entry.count++;
      if (!m.read) entry.unread++;
      const prio = m.importance === "high" ? 2 : m.importance === "low" ? 0 : 1;
      entry.avgPriority += prio;
      counts.set(from.email, entry);
    }
    return [...counts.values()]
      .map(e => ({ ...e, avgPriority: Math.round((e.avgPriority / e.count) * 10) / 10 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  responseTimeStats(tenantId: string) {
    const msgs = this.msgs(tenantId);
    const byThread = new Map<string, { received: string[]; sent: string[] }>();
    for (const m of msgs) {
      if (!m.threadId) continue;
      const t = byThread.get(m.threadId) || { received: [], sent: [] };
      if (m.folder === "sent" && m.sentAt) t.sent.push(m.sentAt);
      else if (m.receivedAt) t.received.push(m.receivedAt);
      byThread.set(m.threadId, t);
    }
    const deltas: number[] = [];
    let repliedThreads = 0;
    for (const t of byThread.values()) {
      if (t.received.length === 0) continue;
      const firstReceived = new Date(t.received.sort()[0]).getTime();
      const firstReply = t.sent.map(s => new Date(s).getTime()).filter(ts => ts > firstReceived).sort((a, b) => a - b)[0];
      if (firstReply !== undefined) { deltas.push(firstReply - firstReceived); repliedThreads++; }
    }
    const fmt = (ms: number) => {
      const h = ms / 3600000;
      return h >= 24 ? `${Math.round(h / 24 * 10) / 10}d` : `${Math.round(h * 10) / 10}h`;
    };
    const total = byThread.size;
    return {
      threads: total,
      repliedThreads,
      replyRate: total ? Math.round((repliedThreads / total) * 1000) / 10 : 0,
      avgResponse: deltas.length ? fmt(deltas.reduce((s, d) => s + d, 0) / deltas.length) : "—",
      minResponse: deltas.length ? fmt(Math.min(...deltas)) : "—",
      maxResponse: deltas.length ? fmt(Math.max(...deltas)) : "—",
      summary: `${repliedThreads}/${total} thread(s) replied — avg ${deltas.length ? fmt(deltas.reduce((s, d) => s + d, 0) / deltas.length) : "—"}`,
      seed: hashStr(tenantId + "response_times"),
    };
  }

  busiestHours(tenantId: string) {
    const msgs = this.msgs(tenantId);
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    for (const m of msgs) {
      if (!m.receivedAt) continue;
      const h = new Date(m.receivedAt).getHours();
      hours[h].count++;
    }
    const busiest = [...hours].sort((a, b) => b.count - a.count)[0];
    return { hours, busiest, summary: busiest.count ? `Busiest hour: ${busiest.hour}:00 (${busiest.count} message(s))` : "No activity recorded yet" };
  }

  activityByFolder(tenantId: string) {
    const msgs = this.msgs(tenantId);
    const counts = new Map<string, number>();
    for (const m of msgs) counts.set(m.folder || "inbox", (counts.get(m.folder || "inbox") || 0) + 1);
    return [...counts.entries()].map(([folder, count]) => ({ folder, count })).sort((a, b) => b.count - a.count);
  }

  mailboxStats(tenantId: string) {
    const mailboxes = DataStore.mem().find("mailboxes", (m: any) => m.tenantId === tenantId);
    const msgs = this.msgs(tenantId);
    const perMailbox = mailboxes.map(mb => {
      const boxMsgs = msgs.filter(m => m.mailboxId === mb._id);
      const senders = new Map<string, number>();
      for (const m of boxMsgs) if ((m.from || {}).email) senders.set(m.from.email, (senders.get(m.from.email) || 0) + 1);
      const topSender = [...senders.entries()].sort((a, b) => b[1] - a[1])[0];
      return {
        mailboxId: mb._id, mailboxName: mb.name, email: mb.email, plan: mb.plan, status: mb.status,
        messages: boxMsgs.length,
        unread: boxMsgs.filter(m => !m.read && m.folder === "inbox").length,
        sent: boxMsgs.filter(m => m.folder === "sent").length,
        storageBytes: boxMsgs.reduce((s, m) => s + estimateMessageBytes(m), 0),
        topSender: topSender ? { email: topSender[0], count: topSender[1] } : null,
      };
    });
    const total = perMailbox.reduce((s, mb) => s + mb.messages, 0);
    return { mailboxes: perMailbox, total, summary: `${perMailbox.length} mailbox(es) — ${total} message(s)`, seed: hashStr(tenantId + "mailbox_stats") };
  }

  executiveSummary(tenantId: string) {
    const overview = this.overview(tenantId);
    const senders = this.topSenders(tenantId, 3);
    const trend = this.volumeTrend(tenantId, 7);
    const category = this.categoryMix(tenantId);
    const response = this.responseTimeStats(tenantId);
    const busiest = this.busiestHours(tenantId);
    const topSender = senders[0];
    const topCategory = category[0];
    const parts = [
      `${overview.totals.messages} message(s) — ${overview.totals.unread} unread`,
      topSender ? `top sender ${topSender.name || topSender.email} (${topSender.count} email(s))` : "no sender activity yet",
      topCategory ? `most common category "${topCategory.category}" (${topCategory.pct}%)` : "",
      `reply rate ${response.replyRate}% (avg ${response.avgResponse})`,
    ].filter(Boolean);
    return {
      ...overview.totals,
      topSender,
      topCategory,
      weekActivity: trend.trend.filter(t => t.total > 0).length,
      busiestHour: busiest.busiest,
      replyRate: response.replyRate,
      avgResponse: response.avgResponse,
      summary: parts.join(" · "),
      seed: hashStr(tenantId + "executive_summary"),
    };
  }
}

export const mailAnalytics = new MailAnalyticsService();
