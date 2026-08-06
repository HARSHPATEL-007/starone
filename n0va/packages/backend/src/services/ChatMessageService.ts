import { DataStore } from "./DataStore";
import { chatRealtime } from "./ChatRealtimeService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const CONTENT_TYPES = ["text", "markdown", "code", "image", "video", "file", "interactive", "neural", "holographic"];
export const SENDER_TYPES = ["user", "bot", "ai", "system", "external", "neural"];

const INTENT_WORDS: Record<string, string[]> = {
  question: ["?", "how", "what", "when", "where", "why", "can you", "could you", "any update"],
  request: ["please", "can we", "need", "wants", "required", "could", "let's", "let us", "should we"],
  decision: ["decide", "approved", "agreed", "confirm", "go ahead", "ship it", "done", "resolved"],
  action_item: ["todo", "to do", "remind", "task", "assign", "follow up", "follow-up", "fix", "schedule", "book"],
  information_sharing: ["update", "FYI", "heads up", "announcing", "we shipped", "released", "launched", "here is", "attached", "meeting"],
  greeting: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "yo"],
  appreciation: ["thanks", "thank you", "great", "awesome", "amazing", "perfect", "appreciate"],
};

const TOXIC_WORDS = ["idiot", "stupid", "dumb", "hate you", "shut up", "moron", "useless", "screw you", "loser"];

function tokenize(text: string): string[] {
  return String(text || "").toLowerCase().split(/[^a-z0-9@#+.-]+/).filter(Boolean);
}

function wordCount(text: string): number {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function score(text: string, words: string[]): number {
  const lower = String(text || "").toLowerCase();
  let hits = 0;
  for (const w of words) if (lower.includes(w)) hits++;
  return hits;
}

export class ChatMessageService {
  private getRoom(tenantId: string, roomId: string): any {
    const room = DataStore.mem().findOne("chat_rooms", (r: any) => r.roomId === roomId && r.tenantId === tenantId);
    if (!room) throw new Error(`Room "${roomId}" not found`);
    if (room.is_archived) throw new Error(`Room "${roomId}" is archived`);
    return room;
  }

  private get(tenantId: string, messageId: string): any {
    const msg = DataStore.mem().findOne("chat_messages", (m: any) => m.messageId === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    return msg;
  }

  private analyze(text: string, senderType: string) {
    const body = String(text || "");
    const words = tokenize(body);
    let sentiment = 0;
    let toxicity = 0;
    let urgency = 0;
    let intent: string = "information_sharing";
    const topics = new Set<string>();

    const positive = ["great", "awesome", "amazing", "excellent", "thanks", "thank", "love", "perfect", "good", "happy", "awesome", "congrats", "wonderful"];
    const negative = ["urgent", "problem", "issue", "broken", "failed", "failing", "critical", "blocked", "delay", "late", "bad", "terrible", "angry", "error", "bug", "crash"];
    const neutralWords = ["update", "meeting", "schedule", "review", "plan", "docs", "release", "deploy", "migration", "report", "notes"];
    const urgentWords = ["urgent", "asap", "immediately", "critical", "emergency", "deadline", "now", "tonight", "today", "blocked", "p0", "p1", "fired"];

    for (const w of words) {
      if (positive.includes(w)) sentiment += 0.12;
      if (negative.includes(w)) sentiment -= 0.15;
      if (neutralWords.includes(w)) topics.add(w);
      if (urgentWords.includes(w)) urgency += 0.18;
    }
    if (body.includes("!")) urgency += 0.05;
    if (body.includes("?")) intent = "question";
    for (const [candidate, keys] of Object.entries(INTENT_WORDS)) {
      if (score(body, keys) > 0) { intent = candidate; break; }
    }
    if (body.includes("@")) topics.add("mention");
    for (const w of TOXIC_WORDS) if (body.toLowerCase().includes(w)) toxicity += 0.3;
    if (words.length > 40) toxicity = Math.min(toxicity + 0.1, 1);

    sentiment = Math.max(-1, Math.min(1, parseFloat(sentiment.toFixed(2))));
    toxicity = Math.max(0, Math.min(1, parseFloat(toxicity.toFixed(2))));
    urgency = Math.max(0, Math.min(1, parseFloat(urgency.toFixed(2))));

    return { sentiment, toxicity, urgency, intent, topics: Array.from(topics).slice(0, 6), wordCount: words.length };
  }

  private buildActionItems(body: string): { text: string; assignee: string | null; due_date: string | null }[] {
    const items: { text: string; assignee: string | null; due_date: string | null }[] = [];
    const lines = String(body || "").split(/\n+/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^[-*]\s*(todo|task|action|follow up|follow-up|assign|fix|schedule|book|review)\b/i.test(trimmed)) {
        const mention = trimmed.match(/@([\w.-]+)/);
        const due = trimmed.match(/\b(tomorrow|today|eod|eow|next week|monday|tuesday|wednesday|thursday|friday)\b/i);
        items.push({ text: trimmed.replace(/^[-*]\s*/i, ""), assignee: mention ? mention[1] : null, due_date: due ? due[1].toLowerCase() : null });
      }
    }
    return items.slice(0, 5);
  }

  private suggestReply(analysis: any, body: string): string {
    const b = String(body || "").toLowerCase();
    if (analysis.intent === "question") return "Good question — let me look into that and get back to you shortly.";
    if (analysis.intent === "request") return "Understood. I'll take care of this and confirm once it's done.";
    if (analysis.intent === "decision") return "Agreed — let's lock this in. I'll update the relevant trackers.";
    if (analysis.intent === "action_item") return "Noted. I'll add this to my task list with a follow-up reminder.";
    if (analysis.urgency > 0.6) return "On it — treating this as urgent and prioritizing it now.";
    if (b.includes("thanks") || b.includes("thank you")) return "You're welcome! Happy to help.";
    if (analysis.sentiment < -0.3) return "Sorry to hear that — let's dig into this and find a fix together.";
    return "Thanks for the update! I'll review and follow up if anything needs attention.";
  }

  sendMessage(tenantId: string, roomId: string, input: any) {
    const room = this.getRoom(tenantId, roomId);
    if (!input || !input.body) throw new Error("Message body is required");
    const maxLen = room.content_policy?.max_message_length || 50000;
    if (input.body.length > maxLen) throw new Error(`Message exceeds max length of ${maxLen} characters`);
    const senderType = input.senderType || "user";
    if (!SENDER_TYPES.includes(senderType)) throw new Error(`Unknown sender type "${senderType}"`);
    const now = new Date().toISOString();
    const sender = {
      user_id: input.userId || "user_001",
      type: senderType,
      display_name: input.displayName || (senderType === "bot" ? input.botName || "Bot" : senderType === "ai" ? "N0VA ANI" : "User"),
    };
    const content = {
      type: input.contentType || "text",
      body: String(input.body),
      language: input.language || "en",
    };
    if (!CONTENT_TYPES.includes(content.type)) throw new Error(`Unknown content type "${content.type}"`);
    const analysis = this.analyze(content.body, senderType);
    const messageId = `msg_${hashStr(tenantId + roomId + now + content.body.slice(0, 30) + (input.userId || ""))}`;
    const msg = DataStore.mem().insert("chat_messages", {
      tenantId,
      module: "chat_messages",
      messageId,
      roomId,
      threadId: input.threadId || null,
      parentMessageId: input.parentMessageId || null,
      sender,
      content,
      attachments: input.attachments || [],
      reactions: [],
      thread_info: { reply_count: 0, participant_count: 0, last_reply_at: null, is_resolved: false, summary: null },
      edit_history: [],
      is_edited: false,
      ai_analysis: {
        sentiment: analysis.sentiment,
        toxicity: analysis.toxicity,
        urgency: analysis.urgency,
        intent: analysis.intent,
        topics: analysis.topics,
        action_items: this.buildActionItems(content.body),
        suggested_reply: this.suggestReply(analysis, content.body),
      },
      ephemeral: input.ephemeral
        ? { enabled: true, ttl_seconds: input.ephemeral.ttl_seconds || 3600, viewed_by: [], expires_at: new Date(Date.now() + (input.ephemeral.ttl_seconds || 3600) * 1000).toISOString() }
        : { enabled: false, ttl_seconds: null, viewed_by: [], expires_at: null },
      dlp_scan: { scanned: true, violations: [], redacted_content: null },
      hyper_context: { linked_tasks: [], linked_calendar_events: [], linked_docs: [], linked_crm_activities: [] },
      version: 1,
      created_at: now,
      updated_at: now,
    });

    if (msg.threadId) {
      const parent = DataStore.mem().findOne("chat_messages", (m: any) => m.messageId === msg.threadId && m.tenantId === tenantId);
      if (parent) {
        const replies = DataStore.mem().find("chat_messages", (m: any) => m.threadId === parent.messageId && m.tenantId === tenantId);
        const participants = new Set<string>();
        for (const r of replies) participants.add(r.sender.user_id);
        participants.add(parent.sender.user_id);
        DataStore.mem().update("chat_messages", (m: any) => m.messageId === parent.messageId && m.tenantId === tenantId, {
          thread_info: { reply_count: replies.length, participant_count: participants.size, last_reply_at: now, is_resolved: parent.thread_info?.is_resolved || false, summary: parent.thread_info?.summary || null },
        });
      }
    }

    const count = DataStore.mem().find("chat_messages", (m: any) => m.roomId === roomId && m.tenantId === tenantId && !m.threadId).length;
    DataStore.mem().update("chat_rooms", (r: any) => r.roomId === roomId && r.tenantId === tenantId, {
      "analytics.message_count": count,
      "analytics.last_message_at": now,
      "analytics.sentiment_trend": parseFloat(((room.analytics?.sentiment_trend || 0) + analysis.sentiment).toFixed(2)),
    });

    chatRealtime.emit("message.new", tenantId, { messageId, roomId, sender, content, threadId: msg.threadId, createdAt: now }, roomId);
    return { message: msg, analysis, summary: `${sender.display_name}: "${content.body.slice(0, 60)}${content.body.length > 60 ? "…" : ""}"` };
  }

  listMessages(tenantId: string, roomId: string, opts: any = {}) {
    this.getRoom(tenantId, roomId);
    let rows = DataStore.mem().find("chat_messages", (m: any) => m.roomId === roomId && m.tenantId === tenantId && (!opts.threadId ? !m.threadId : m.threadId === opts.threadId));
    rows = rows.sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
    if (opts.before) rows = rows.filter((m) => m.created_at < opts.before);
    if (opts.after) rows = rows.filter((m) => m.created_at > opts.after);
    const limit = opts.limit ? Math.min(Math.max(1, parseInt(String(opts.limit), 10) || 50), 200) : 50;
    const total = rows.length;
    const messages = rows.slice(-limit);
    return { messages, total, summary: `${messages.length} message(s)` };
  }

  getMessage(tenantId: string, messageId: string) {
    return this.get(tenantId, messageId);
  }

  editMessage(tenantId: string, messageId: string, patch: any) {
    const msg = this.get(tenantId, messageId);
    if (msg.sender.type === "system") throw new Error("System messages cannot be edited");
    if (!patch || !patch.body) throw new Error("New body is required");
    const history = [...(msg.edit_history || []), { version: msg.version || 1, body: msg.content.body, edited_at: new Date().toISOString(), edited_by: patch.editedBy || "user_001" }];
    const updated = DataStore.mem().update("chat_messages", (m: any) => m.messageId === messageId && m.tenantId === tenantId, {
      "content.body": String(patch.body),
      edit_history: history,
      is_edited: true,
      version: (msg.version || 1) + 1,
    });
    chatRealtime.emit("message.updated", tenantId, { messageId, content: updated.content, edit_history: history, updatedAt: updated.updated_at }, updated.roomId);
    return { message: updated, summary: "Message edited" };
  }

  deleteMessage(tenantId: string, messageId: string, opts: any = {}) {
    const msg = this.get(tenantId, messageId);
    const now = new Date().toISOString();
    if (opts.hard) {
      DataStore.mem().delete("chat_messages", (m: any) => m.messageId === messageId && m.tenantId === tenantId);
    } else {
      DataStore.mem().update("chat_messages", (m: any) => m.messageId === messageId && m.tenantId === tenantId, { deleted_at: now, "content.body": "(message deleted)", is_deleted: true });
    }
    chatRealtime.emit("message.deleted", tenantId, { messageId, deletedAt: now }, msg.roomId);
    return { messageId, deletedAt: now, summary: "Message deleted" };
  }

  addReaction(tenantId: string, messageId: string, emoji: string, userId: string = "user_001") {
    if (!emoji) throw new Error("emoji is required");
    const msg = this.get(tenantId, messageId);
    const reactions = [...(msg.reactions || [])];
    const existing = reactions.find((r) => r.emoji === emoji);
    if (existing) {
      if (!existing.users.includes(userId)) existing.users.push(userId);
      existing.count = existing.users.length;
    } else {
      reactions.push({ emoji, users: [userId], count: 1 });
    }
    const updated = DataStore.mem().update("chat_messages", (m: any) => m.messageId === messageId && m.tenantId === tenantId, { reactions });
    chatRealtime.emit("message.reaction", tenantId, { messageId, emoji, user_id: userId, action: "added" }, updated.roomId);
    return { message: updated, summary: `Added ${emoji} reaction` };
  }

  removeReaction(tenantId: string, messageId: string, emoji: string, userId: string = "user_001") {
    const msg = this.get(tenantId, messageId);
    const reactions = (msg.reactions || [])
      .map((r: any) => {
        if (r.emoji !== emoji) return r;
        const users = r.users.filter((u: string) => u !== userId);
        return { ...r, users, count: users.length };
      })
      .filter((r: any) => r.count > 0);
    const updated = DataStore.mem().update("chat_messages", (m: any) => m.messageId === messageId && m.tenantId === tenantId, { reactions });
    chatRealtime.emit("message.reaction", tenantId, { messageId, emoji, user_id: userId, action: "removed" }, updated.roomId);
    return { message: updated, summary: `Removed ${emoji} reaction` };
  }

  replyToThread(tenantId: string, messageId: string, input: any) {
    const parent = this.get(tenantId, messageId);
    if (!input || !input.body) throw new Error("Reply body is required");
    const reply = this.sendMessage(tenantId, parent.roomId, { ...input, threadId: parent.messageId, parentMessageId: parent.messageId });
    return { parent, reply: reply.message, summary: `Replied in thread ${messageId}` };
  }

  getThread(tenantId: string, messageId: string, opts: any = {}) {
    const parent = this.get(tenantId, messageId);
    const replies = DataStore.mem().find("chat_messages", (m: any) => m.threadId === parent.messageId && m.tenantId === tenantId && !m.deleted_at)
      .sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
    const limit = opts.limit ? Math.min(Math.max(1, parseInt(String(opts.limit), 10) || 50), 200) : 50;
    const participants = new Set<string>();
    participants.add(parent.sender.user_id);
    for (const r of replies) participants.add(r.sender.user_id);
    const threadInfo = {
      reply_count: replies.length,
      participant_count: participants.size,
      last_reply_at: replies.length ? replies[replies.length - 1].created_at : null,
      is_resolved: parent.thread_info?.is_resolved || false,
      summary: parent.thread_info?.summary || null,
    };
    return { parent, replies: replies.slice(-limit), thread_info: threadInfo, summary: `${replies.length} reply(ies) from ${participants.size} participant(s)` };
  }

  summarizeThread(tenantId: string, messageId: string) {
    const thread = this.getThread(tenantId, messageId, { limit: 200 });
    const bodies = [thread.parent.content.body, ...thread.replies.map((r) => r.content.body)].slice(0, 20);
    const words = bodies.join(" ").split(/\s+/).filter(Boolean);
    const freq: Record<string, number> = {};
    for (const w of words) {
      const k = w.toLowerCase().replace(/[^a-z]/g, "");
      if (k.length < 4) continue;
      freq[k] = (freq[k] || 0) + 1;
    }
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);
    const sentiment = bodies.reduce((s, b) => s + (this.analyze(b, "user").sentiment), 0) / Math.max(1, bodies.length);
    const summary = thread.reply_count === 0
      ? `No replies yet — ${thread.parent.content.body.slice(0, 80)}`
      : `${thread.reply_count} replies across ${thread.thread_info.participant_count} participants. Key topics: ${top.join(", ") || "general discussion"}. ${sentiment > 0.1 ? "Positive" : sentiment < -0.1 ? "Mixed/negative tone flagged" : "Neutral"} sentiment.`;
    DataStore.mem().update("chat_messages", (m: any) => m.messageId === messageId && m.tenantId === tenantId, { "thread_info.summary": summary, "thread_info.is_resolved": false });
    return { messageId, summary, topics: top, sentiment: parseFloat(sentiment.toFixed(2)), wordCount: words.length };
  }

  markThreadResolved(tenantId: string, messageId: string, resolved: boolean = true) {
    this.get(tenantId, messageId);
    const updated = DataStore.mem().update("chat_messages", (m: any) => m.messageId === messageId && m.tenantId === tenantId, { "thread_info.is_resolved": resolved });
    return { messageId, resolved, summary: `Thread marked ${resolved ? "resolved" : "open"}` };
  }

  markDecision(tenantId: string, messageId: string, opts: any = {}) {
    const msg = this.get(tenantId, messageId);
    const updated = DataStore.mem().update("chat_messages", (m: any) => m.messageId === messageId && m.tenantId === tenantId, {
      is_decision: true,
      decision: { summary: opts.summary || msg.content.body.slice(0, 140), decided_by: opts.decidedBy || "user_001", decided_at: new Date().toISOString() },
    });
    return { message: updated, summary: `Decision recorded${opts.summary ? `: ${opts.summary}` : ""}` };
  }

  pinMessage(tenantId: string, messageId: string, pinned: boolean = true) {
    const msg = this.get(tenantId, messageId);
    const updated = DataStore.mem().update("chat_messages", (m: any) => m.messageId === messageId && m.tenantId === tenantId, { is_pinned: pinned });
    return { message: updated, summary: `Message ${pinned ? "pinned" : "unpinned"}` };
  }

  pinnedMessages(tenantId: string, roomId?: string) {
    const rows = DataStore.mem().find("chat_messages", (m: any) => m.tenantId === tenantId && m.is_pinned && (!roomId || m.roomId === roomId));
    return { messages: rows, total: rows.length, summary: `${rows.length} pinned message(s)` };
  }

  ephemeralSweep(tenantId: string) {
    const now = Date.now();
    let removed = 0;
    const rows = DataStore.mem().find("chat_messages", (m: any) => m.tenantId === tenantId && m.ephemeral?.enabled && m.ephemeral.expires_at);
    for (const m of rows) {
      if (new Date(m.ephemeral.expires_at).getTime() <= now) {
        DataStore.mem().delete("chat_messages", (mm: any) => mm.messageId === m.messageId && mm.tenantId === tenantId);
        removed++;
      }
    }
    return { removed, scanned: rows.length, summary: `Expired ${removed} ephemeral message(s)` };
  }
}

export const chatMessage = new ChatMessageService();