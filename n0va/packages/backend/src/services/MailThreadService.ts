import { DataStore } from "./DataStore";
import { mailRealtime } from "./MailRealtimeService";

export const THREAD_STATES = ["open", "pending", "done"] as const;
export const THREAD_PRIORITIES = ["high", "normal", "low"] as const;

const STATE_LABELS: Record<string, string> = {
  open: "Open",
  pending: "Awaiting action",
  done: "Done",
};

export class MailThreadService {
  private meta(tenantId: string, threadId: string): any {
    return DataStore.mem().findOne("mail_threads", (t: any) => t.tenantId === tenantId && t.threadId === threadId);
  }

  private upsertMeta(tenantId: string, threadId: string, patch: any): any {
    const store = DataStore.mem();
    const existing = this.meta(tenantId, threadId);
    const now = new Date().toISOString();
    if (existing) {
      return store.update("mail_threads", (t: any) => t._id === existing._id, { ...patch, updatedAt: now });
    }
    return store.insert("mail_threads", {
      tenantId, threadId, state: "open", pinned: false, tags: [], priority: "normal",
      createdAt: now, updatedAt: now, ...patch,
    });
  }

  private log(tenantId: string, category: string, detail: string, extra: any = {}) {
    DataStore.mem().insert("mail_threads_log", {
      tenantId, category, detail, at: new Date().toISOString(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
    });
  }

  private threadMessages(tenantId: string, threadId: string): any[] {
    return DataStore.mem()
      .find("messages", (m: any) => m.tenantId === tenantId && m.threadId === threadId)
      .sort((a: any, b: any) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
  }

  private aggregate(tenantId: string, threadId: string): any {
    const msgs = this.threadMessages(tenantId, threadId);
    if (msgs.length === 0) throw new Error(`Thread "${threadId}" not found`);
    const meta = this.meta(tenantId, threadId);
    const last = msgs[msgs.length - 1];
    const folders = [...new Set(msgs.map((m) => m.folder))];
    const labels = [...new Set(msgs.flatMap((m) => m.labels || []))];
    const participants = [...new Set(msgs.map((m) => `${(m.from && (m.from.name || m.from.email)) || "?"}`))];
    return {
      threadId,
      subject: msgs[0].subject,
      participants,
      messageCount: msgs.length,
      unreadCount: msgs.filter((m) => !m.read).length,
      starred: msgs.some((m) => m.starred),
      folder: folders.includes("inbox") ? "inbox" : folders[0],
      folders,
      labels,
      mailboxIds: [...new Set(msgs.map((m) => m.mailboxId))],
      lastAt: last.receivedAt,
      firstAt: msgs[0].receivedAt,
      state: meta ? meta.state || "open" : "open",
      pinned: meta ? !!meta.pinned : false,
      tags: meta ? meta.tags || [] : [],
      priority: meta ? meta.priority || "normal" : "normal",
    };
  }

  threadList(tenantId: string, opts: any = {}) {
    const store = DataStore.mem();
    const threadsBy = new Map<string, any>();
    let msgs = store.find("messages", (m: any) => m.tenantId === tenantId && (!opts.mailboxId || m.mailboxId === opts.mailboxId));
    for (const m of msgs) {
      const t = threadsBy.get(m.threadId) || { threadId: m.threadId, messages: [] };
      t.messages.push(m);
      threadsBy.set(m.threadId, t);
    }
    let rows = [...threadsBy.values()].map((t) => {
      t.messages.sort((a: any, b: any) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
      const meta = this.meta(tenantId, t.threadId);
      const folders = [...new Set(t.messages.map((m: any) => m.folder))];
      return {
        threadId: t.threadId,
        subject: t.messages[0].subject,
        participants: [...new Set(t.messages.map((m: any) => `${(m.from && (m.from.name || m.from.email)) || "?"}`))],
        messageCount: t.messages.length,
        unreadCount: t.messages.filter((m: any) => !m.read).length,
        starred: t.messages.some((m: any) => m.starred),
        folder: folders.includes("inbox") ? "inbox" : folders[0],
        folders,
        labels: [...new Set(t.messages.flatMap((m: any) => m.labels || []))],
        lastAt: t.messages[t.messages.length - 1].receivedAt,
        firstAt: t.messages[0].receivedAt,
        state: meta ? meta.state || "open" : "open",
        pinned: meta ? !!meta.pinned : false,
        tags: meta ? meta.tags || [] : [],
        priority: meta ? meta.priority || "normal" : "normal",
      };
    });
    if (opts.folder) rows = rows.filter((r) => r.folders.includes(opts.folder));
    if (opts.state) rows = rows.filter((r) => r.state === opts.state);
    if (opts.tag) rows = rows.filter((r) => r.tags.includes(opts.tag));
    if (opts.priority) rows = rows.filter((r) => r.priority === opts.priority);
    if (opts.unreadOnly) rows = rows.filter((r) => r.unreadCount > 0);
    if (opts.starredOnly) rows = rows.filter((r) => r.starred);
    if (opts.pinnedOnly) rows = rows.filter((r) => r.pinned);
    if (opts.search) {
      const q = String(opts.search).toLowerCase();
      rows = rows.filter((r) => r.subject.toLowerCase().includes(q) || (r.participants as string[]).some((p: string) => p.toLowerCase().includes(q)));
    }
    rows.sort((a: any, b: any) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    return {
      threads: rows,
      total: rows.length,
      unreadThreads: rows.filter((r) => r.unreadCount > 0).length,
      states: { open: rows.filter((r) => r.state === "open").length, pending: rows.filter((r) => r.state === "pending").length, done: rows.filter((r) => r.state === "done").length },
      summary: `${rows.length} thread(s) — ${rows.filter((r) => r.unreadCount > 0).length} with unread`,
    };
  }

  threadWorkspace(tenantId: string, threadId: string) {
    const t = this.aggregate(tenantId, threadId);
    const meta = this.meta(tenantId, threadId);
    const suggestedNext =
      t.state === "done" ? "Reopen if follow-up is still needed" :
      t.state === "pending" ? "Send a follow-up or mark the thread done" :
      t.unreadCount > 0 ? "Read the unread message(s) then reply or triage" : "Reply, or mark the thread done";
    return {
      ...t,
      messages: this.threadMessages(tenantId, threadId),
      suggestedNext,
      meta: meta || null,
      summary: `${t.messageCount} message(s) · ${t.unreadCount} unread · ${STATE_LABELS[t.state] || t.state}`,
    };
  }

  setThreadState(tenantId: string, threadId: string, state: string) {
    if (!THREAD_STATES.includes(state as any)) throw new Error(`State must be one of: ${THREAD_STATES.join(", ")}`);
    const t = this.aggregate(tenantId, threadId);
    this.upsertMeta(tenantId, threadId, { state });
    if (state === "done") {
      const unread = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.threadId === threadId && !m.read);
      for (const m of unread) {
        DataStore.mem().update("messages", (x: any) => x._id === m._id, { read: true });
      }
    }
    this.log(tenantId, "thread_state", `Thread "${t.subject}" → ${STATE_LABELS[state]}`, { threadId, state });
    mailRealtime.emit("mail.thread_update", tenantId, { threadId, change: "state", state, subject: t.subject });
    return { threadId, state, summary: `Thread marked ${STATE_LABELS[state]}` };
  }

  pinThread(tenantId: string, threadId: string) {
    const t = this.aggregate(tenantId, threadId);
    this.upsertMeta(tenantId, threadId, { pinned: true });
    this.log(tenantId, "thread_pin", `Thread "${t.subject}" pinned`, { threadId });
    mailRealtime.emit("mail.thread_update", tenantId, { threadId, change: "pin", pinned: true, subject: t.subject });
    return { threadId, pinned: true, summary: `Thread pinned — "${t.subject}"` };
  }

  unpinThread(tenantId: string, threadId: string) {
    const t = this.aggregate(tenantId, threadId);
    this.upsertMeta(tenantId, threadId, { pinned: false });
    this.log(tenantId, "thread_pin", `Thread "${t.subject}" unpinned`, { threadId });
    mailRealtime.emit("mail.thread_update", tenantId, { threadId, change: "pin", pinned: false, subject: t.subject });
    return { threadId, pinned: false, summary: `Thread unpinned — "${t.subject}"` };
  }

  tagThread(tenantId: string, threadId: string, tag: string) {
    if (!tag) throw new Error("Tag is required");
    const t = this.aggregate(tenantId, threadId);
    const tags = [...new Set([...(this.meta(tenantId, threadId)?.tags || []), tag])];
    this.upsertMeta(tenantId, threadId, { tags });
    this.log(tenantId, "thread_tag", `Thread "${t.subject}" tagged "${tag}"`, { threadId, tag });
    mailRealtime.emit("mail.thread_update", tenantId, { threadId, change: "tag", tag, added: true, subject: t.subject });
    return { threadId, tags, summary: `Tag "${tag}" applied` };
  }

  untagThread(tenantId: string, threadId: string, tag: string) {
    if (!tag) throw new Error("Tag is required");
    const t = this.aggregate(tenantId, threadId);
    const tags = (this.meta(tenantId, threadId)?.tags || []).filter((x: string) => x !== tag);
    this.upsertMeta(tenantId, threadId, { tags });
    this.log(tenantId, "thread_tag", `Thread "${t.subject}" untagged "${tag}"`, { threadId, tag });
    mailRealtime.emit("mail.thread_update", tenantId, { threadId, change: "tag", tag, added: false, subject: t.subject });
    return { threadId, tags, summary: `Tag "${tag}" removed` };
  }

  setThreadPriority(tenantId: string, threadId: string, priority: string) {
    if (!THREAD_PRIORITIES.includes(priority as any)) throw new Error(`Priority must be one of: ${THREAD_PRIORITIES.join(", ")}`);
    const t = this.aggregate(tenantId, threadId);
    this.upsertMeta(tenantId, threadId, { priority });
    this.log(tenantId, "thread_priority", `Thread "${t.subject}" priority → ${priority}`, { threadId, priority });
    mailRealtime.emit("mail.thread_update", tenantId, { threadId, change: "priority", priority, subject: t.subject });
    return { threadId, priority, summary: `Priority set to ${priority}` };
  }

  mergeThreads(tenantId: string, targetThreadId: string, sourceThreadId: string) {
    if (targetThreadId === sourceThreadId) throw new Error("Target and source thread must be different");
    const target = this.aggregate(tenantId, targetThreadId);
    const source = this.aggregate(tenantId, sourceThreadId);
    const moving = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.threadId === sourceThreadId);
    for (const m of moving) {
      DataStore.mem().update("messages", (x: any) => x._id === m._id, { threadId: targetThreadId });
    }
    const merged = this.aggregate(tenantId, targetThreadId);
    this.log(tenantId, "thread_merge", `Threads merged — "${source.subject}" into "${target.subject}" (${moving.length} message(s))`, { targetThreadId, sourceThreadId, moved: moving.length });
    mailRealtime.emit("mail.thread_update", tenantId, { threadId: targetThreadId, change: "merge", sourceThreadId, moved: moving.length, subject: target.subject });
    return {
      targetThreadId,
      sourceThreadId,
      mergedMessages: moving.length,
      messageCount: merged.messageCount,
      summary: `Merged ${moving.length} message(s) — "${source.subject}" into "${target.subject}"`,
    };
  }

  threadDashboard(tenantId: string) {
    const all = this.threadList(tenantId);
    const open = all.threads.filter((t) => t.state !== "done");
    const oldestOpen = open.length
      ? open.reduce((min: any, t: any) => (new Date(t.firstAt) < new Date(min.firstAt) ? t : min), open[0])
      : null;
    const tags = new Map<string, number>();
    for (const t of all.threads) for (const tag of t.tags) tags.set(tag, (tags.get(tag) || 0) + 1);
    const topTags = [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => ({ tag, count }));
    const done = all.threads.filter((t) => t.state === "done").length;
    return {
      totalThreads: all.total,
      byState: all.states,
      pinned: all.threads.filter((t) => t.pinned).length,
      highPriority: all.threads.filter((t) => t.priority === "high").length,
      unreadThreads: all.unreadThreads,
      starred: all.threads.filter((t) => t.starred).length,
      doneRate: all.total ? Math.round((done / all.total) * 100) : 0,
      oldestOpen: oldestOpen ? { threadId: oldestOpen.threadId, subject: oldestOpen.subject, firstAt: oldestOpen.firstAt, daysOld: Math.max(0, Math.floor((Date.now() - new Date(oldestOpen.firstAt).getTime()) / 86400000)) } : null,
      topTags,
      summary: `${all.total} thread(s) — ${all.states.open} open, ${all.states.pending} pending, ${done} done`,
      generatedAt: new Date().toISOString(),
    };
  }

  threadLog(tenantId: string, limit = 50) {
    const entries = DataStore.mem()
      .find("mail_threads_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, limit);
    return { entries, total: entries.length, summary: `${entries.length} thread event(s)` };
  }
}

export const mailThread = new MailThreadService();
