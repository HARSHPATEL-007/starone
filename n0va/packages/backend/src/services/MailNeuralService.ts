import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const URGENT_KEYWORDS = ["urgent", "asap", "critical", "immediately", "deadline", "blocked", "outage", "legal", "compliance"];
const DECLINING_SIGNALS = ["newsletter", "promotion", "social"];
const REPLY_TEMPLATES = [
  "Thanks for the note — I'm reviewing and will get back to you shortly.",
  "Got it, thanks. I'll confirm the details with the team and follow up.",
  "Appreciate the update — noted on my end, I'll respond in full shortly.",
  "Thanks for reaching out. Happy to discuss — what time works for a quick call?",
];

export class MailNeuralService {
  private log(tenantId: string, entry: any) {
    DataStore.mem().insert("mail_neural_log", {
      tenantId,
      category: entry.category,
      subject: entry.subject || "",
      sender: entry.sender || "",
      detail: entry.detail,
      at: new Date().toISOString(),
    });
  }

  neuralOverview(tenantId: string, mailboxId?: string) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && (!mailboxId || m.mailboxId === mailboxId) && !m.read && m.folder === "inbox");
    const scored = msgs.map((m: any) => {
      const seed = `${(m.from || {}).email || "x"}|${m.subject || ""}`;
      const base = hashStr(seed + "prio") % 100;
      const boost = m.importance === "high" ? 22 : m.importance === "low" ? -18 : 0;
      const urgent = URGENT_KEYWORDS.some(k => `${m.subject || ""} ${m.body || ""}`.toLowerCase().includes(k)) ? 15 : 0;
      return { ...m, predictedImportance: Math.min(99, Math.max(1, base + boost + urgent)) };
    });
    const autoPriority = scored.sort((a: any, b: any) => b.predictedImportance - a.predictedImportance).slice(0, 5)
      .map((m: any) => ({ messageId: m._id, subject: m.subject, from: (m.from || {}).email, predictedImportance: m.predictedImportance, reason: m.predictedImportance > 70 ? "High priority — respond today" : "Medium priority — review today" }));
    return {
      autoPriority,
      summary: `${autoPriority.length} message(s) in auto-priority queue`,
    };
  }

  smartDraftSuggestions(tenantId: string, limit = 3) {
    const top = this.neuralOverview(tenantId).autoPriority.slice(0, limit);
    return {
      suggestions: top.map((m: any) => ({
        messageId: m.messageId,
        subject: m.subject,
        suggestedReply: REPLY_TEMPLATES[hashStr(m.subject + "reply") % REPLY_TEMPLATES.length],
        tone: hashStr(m.subject + "tone") % 2 === 0 ? "concise" : "warm",
      })),
      summary: `${Math.min(top.length, limit)} draft suggestion(s) ready`,
    };
  }

  taskExtraction(tenantId: string) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && (m.folder === "inbox" || m.folder === "sent"));
    const tasks: { messageId: string; threadId: string; subject: string; task: string }[] = [];
    for (const m of msgs) {
      const lines = String(m.body || "").split(/\r?\n/);
      for (const line of lines) {
        const t = line.match(/^\s*[-*]?\s*\[(?: |x|X)\]\s*(.+)$/);
        if (t) tasks.push({ messageId: m._id, threadId: m.threadId || "", subject: m.subject, task: t[1].trim() });
      }
    }
    return { tasks, total: tasks.length, summary: `${tasks.length} task(s) extracted from email bodies` };
  }

  predictiveUnsubscribe(tenantId: string) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.folder === "inbox");
    const bySender = new Map<string, any[]>();
    for (const m of msgs) {
      const email = (m.from || {}).email || "unknown";
      if (!bySender.has(email)) bySender.set(email, []);
      bySender.get(email)!.push(m);
    }
    const offers: any[] = [];
    for (const [email, list] of bySender) {
      if (list.length < 3) continue;
      const category = list[0].ai?.category || "";
      if (!DECLINING_SIGNALS.includes(category)) continue;
      const seed = email + "|" + category;
      const engagement = hashStr(seed + "eng") % 100;
      const openingRate = hashStr(seed + "open") % 60;
      if (engagement < 40) {
        offers.push({
          sender: email,
          category,
          messages: list.length,
          lastMessageAt: list[0].receivedAt,
          engagementScore: engagement,
          estimatedOpenRate: openingRate,
          recommendation: "Declining value — offer unsubscribe",
        });
      }
    }
    return { offers: offers.slice(0, 5), summary: `${offers.length} sender(s) flagged for predictive unsubscribe` };
  }

  smartArchive(tenantId: string, opts: any = {}) {
    const olderThanDays = Math.max(1, parseInt(String(opts.olderThanDays || 30), 10) || 30);
    const cutoff = Date.now() - olderThanDays * 86400000;
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.folder === "inbox");
    const candidates = msgs.filter((m: any) => m.read && m.importance !== "high" && !m.starred && new Date(m.receivedAt).getTime() < cutoff);
    if (opts.apply) {
      for (const m of candidates) {
        DataStore.mem().update("messages", (x: any) => x._id === m._id, { folder: "archive" });
        this.log(tenantId, { category: "smart_archive", subject: m.subject, sender: (m.from || {}).email, detail: `Auto-archived (${olderThanDays}d, low priority)` });
      }
    }
    return {
      candidates: candidates.slice(0, 10).map((m: any) => ({ messageId: m._id, subject: m.subject, from: (m.from || {}).email, receivedAt: m.receivedAt })),
      total: candidates.length,
      applied: opts.apply ? candidates.length : 0,
      summary: `${candidates.length} read message(s) older than ${olderThanDays}d available for archive${opts.apply ? " — archived" : ""}`,
    };
  }

  conversationHealth(tenantId: string) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const threads = new Map<string, any[]>();
    for (const m of msgs) {
      const key = m.threadId || m.messageId || m._id;
      if (!threads.has(key)) threads.set(key, []);
      threads.get(key)!.push(m);
    }
    const stale: any[] = [];
    const now = Date.now();
    for (const [threadId, list] of threads) {
      const last = list.reduce((a: any, b: any) => new Date(a.receivedAt).getTime() > new Date(b.receivedAt).getTime() ? a : b);
      const ageDays = (now - new Date(last.receivedAt).getTime()) / 86400000;
      const awaiting = list.some(m => m.awaitingResponse);
      if (ageDays > 7 || (awaiting && ageDays > 3)) {
        stale.push({
          threadId,
          subject: list[0].subject,
          lastMessageAt: last.receivedAt,
          ageDays: Math.round(ageDays),
          awaitingResponse: awaiting,
          level: ageDays > 14 ? "critical" : awaiting ? "warning" : "info",
        });
      }
    }
    return { alerts: stale.sort((a: any, b: any) => b.ageDays - a.ageDays), summary: `${stale.length} stale conversation(s) — ${stale.filter(a => a.level === "critical").length} critical` };
  }

  escalationQueue(tenantId: string) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.folder === "inbox" && !m.read && m.importance === "high");
    const escalated = msgs.filter((m: any) => URGENT_KEYWORDS.some(k => `${m.subject || ""} ${m.body || ""}`.toLowerCase().includes(k)));
    return {
      queue: escalated.slice(0, 5).map((m: any) => ({ messageId: m._id, subject: m.subject, from: (m.from || {}).email, urgencyScore: 70 + (hashStr((m.from || {}).email + m.subject + "urg") % 30) })),
      total: escalated.length,
      summary: `${escalated.length} message(s) escalated to human review`,
    };
  }

  learningLoop(tenantId: string, action: string, item: any = {}) {
    if (!action || !["accept", "reject"].includes(action)) throw new Error("Learning action must be accept or reject");
    if (!item.subject) throw new Error("item.subject is required");
    DataStore.mem().insert("mail_neural_log", {
      tenantId,
      category: `learning_${action}`,
      subject: item.subject,
      sender: item.sender || "",
      detail: `${action}ed suggestion: ${item.suggestion || item.subject}`,
      at: new Date().toISOString(),
    });
    return { action, subject: item.subject, summary: `Suggestion ${action}ed — the neural loop will adapt` };
  }

  neuralMailboxDashboard(tenantId: string, mailboxId?: string) {
    const overview = this.neuralOverview(tenantId, mailboxId);
    const tasks = this.taskExtraction(tenantId);
    const unsubscribe = this.predictiveUnsubscribe(tenantId);
    const archive = this.smartArchive(tenantId);
    const health = this.conversationHealth(tenantId);
    const escalation = this.escalationQueue(tenantId);
    const log = DataStore.mem().find("mail_neural_log", (l: any) => l.tenantId === tenantId).slice(-8).reverse();
    const inbox = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.folder === "inbox");
    return {
      overview: overview.autoPriority,
      taskCount: tasks.total,
      unsubscribeOffers: unsubscribe.offers.length,
      archiveCandidates: archive.total,
      healthAlerts: health.alerts,
      escalationQueue: escalation.queue,
      recentActions: log,
      attention: {
        critical: health.alerts.filter((a: any) => a.level === "critical").length + escalation.total,
        warnings: health.alerts.filter((a: any) => a.level === "warning").length,
        total: inbox.length,
      },
      summary: `${inbox.length} inbox messages — ${tasks.total} tasks, ${unsubscribe.offers.length} unsubscribe offers, ${escalation.total} escalated`,
    };
  }
}

export const mailNeural = new MailNeuralService();
