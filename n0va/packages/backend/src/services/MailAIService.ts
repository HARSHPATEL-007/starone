import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const CATEGORIES = ["business", "personal", "newsletter", "social", "promotion", "billing", "notification", "travel"];
const SENTIMENTS = ["positive", "neutral", "negative", "neutral"];
const ACTION_POOL = [
  "Reply with availability",
  "Review and approve",
  "Schedule a follow-up call",
  "Send the requested documents",
  "Update the tracker",
  "Confirm the terms",
];

function wordsOf(subject: string): string[] {
  return subject.split(/\s+/).filter(w => w.length > 3).map(w => w.toLowerCase());
}

export class MailAIService {
  enrichMessage(tenantId: string, messageId: string) {
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    const seed = hashStr(msg.subject + (msg.body || "").slice(0, 80) + (msg.from || {}).email);
    const importance = msg.importance || "normal";
    let priority = "normal";
    const roll = seed % 20;
    if (importance === "high") priority = roll % 3 === 0 ? "critical" : "high";
    else if (roll % 7 === 0) priority = "critical";
    else if (roll % 3 === 0) priority = "high";
    const sentiment = SENTIMENTS[seed % 4];
    const category = CATEGORIES[seed % 8];
    const spamScore = hashStr(msg.subject + "spam") % 100;
    const topic = wordsOf(msg.subject).slice(0, 3).join(" ") || "your request";
    const summary = `"${msg.subject}" — ${(msg.from || {}).name || "the sender"} covers ${topic}, ${sentiment === "negative" ? "raising concerns that need attention" : sentiment === "positive" ? "with a positive outlook" : "with practical details and next steps"}.`;
    const actionItems: string[] = [];
    const nItems = seed % 4;
    for (let i = 0; i < nItems; i++) {
      const item = ACTION_POOL[(seed + i * 17) % ACTION_POOL.length];
      if (!actionItems.includes(item)) actionItems.push(item);
    }
    const replySuggestions = this.buildReplies(msg, seed);
    const ai = {
      priority,
      sentiment,
      summary,
      category,
      actionItems,
      spamScore,
      isSpam: spamScore > 85,
      replySuggestions,
      enrichedAt: new Date().toISOString(),
    };
    DataStore.mem().update("messages", (m: any) => m._id === msg._id && m.tenantId === tenantId, { ai });
    return { messageId: msg._id, ...ai };
  }

  smartReply(tenantId: string, messageId: string) {
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    let replies = msg.ai && msg.ai.replySuggestions;
    if (!replies) {
      const seed = hashStr(msg.subject + msg.body);
      replies = this.buildReplies(msg, seed);
      DataStore.mem().update("messages", (m: any) => m._id === msg._id && m.tenantId === tenantId, { ai: { ...(msg.ai || {}), replySuggestions: replies } });
    }
    return { messageId: msg._id, subject: msg.subject, replies, summary: `${replies.length} AI replies drafted` };
  }

  summarizeThread(tenantId: string, threadId: string) {
    const messages = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.threadId === threadId)
      .sort((a: any, b: any) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
    if (messages.length === 0) throw new Error(`Thread "${threadId}" not found`);
    const subject = messages[0].subject;
    const seed = hashStr(threadId + subject);
    const participants = [...new Set(messages.map(m => (m.from || {}).email).filter(Boolean))];
    const last = messages[messages.length - 1];
    const lastAction = (last.ai && last.ai.actionItems[0]) || "respond to the latest message";
    const decisionsPool = ["Proceed with the current plan", "Approve the proposed budget", "Use the updated timeline", "Adopt the new design direction"];
    const questionsPool = ["Who owns the final approval?", "What is the deadline?", "Do we need external sign-off?"];
    const stepsPool = ["Reply to confirm next steps", "Add action items to the tracker", "Schedule the follow-up meeting"];
    const decisions: string[] = [];
    const openQuestions: string[] = [];
    const nextSteps: string[] = [];
    const nDec = seed % 3;
    const nQ = seed % 3;
    const nS = 1 + (seed % 2);
    for (let i = 0; i < nDec; i++) { const d = decisionsPool[(seed + i * 7) % decisionsPool.length]; if (!decisions.includes(d)) decisions.push(d); }
    for (let i = 0; i < nQ; i++) { const q = questionsPool[(seed + i * 5) % questionsPool.length]; if (!openQuestions.includes(q)) openQuestions.push(q); }
    for (let i = 0; i < nS; i++) { const s = stepsPool[(seed + i * 3) % stepsPool.length]; if (!nextSteps.includes(s)) nextSteps.push(s); }
    return {
      threadId,
      subject,
      messageCount: messages.length,
      participants,
      summary: `"${subject}" — ${messages.length} messages from ${participants.length} people. ${lastAction}.`,
      decisions,
      openQuestions,
      nextSteps,
    };
  }

  meetingPrep(tenantId: string, threadId: string) {
    const messages = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.threadId === threadId)
      .sort((a: any, b: any) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
    if (messages.length === 0) throw new Error(`Thread "${threadId}" not found`);
    const subject = messages[0].subject;
    const seed = hashStr(threadId + "meeting");
    const attendees = [...new Set(messages.map(m => `${(m.from || {}).name || "unknown"} <${(m.from || {}).email}>`))];
    const timesPool = ["Mon 10:00", "Tue 14:30", "Wed 11:00", "Thu 15:00", "Fri 09:30"];
    const proposedTimes = [timesPool[seed % 5], timesPool[(seed + 2) % 5]].filter((v, i, arr) => arr.indexOf(v) === i);
    const agenda = [
      `Review "${subject}" status`,
      "Decide on action items",
      "Assign owners and deadlines",
    ];
    const prepNotes = [
      `Re-read "${subject}" thread before the call`,
      `Bring the latest numbers for ${wordsOf(subject).slice(0, 2).join(" ") || "the project"}`,
      `Confirm availability of ${attendees.length} attendees`,
    ];
    const actionItems = (messages[messages.length - 1].ai && messages[messages.length - 1].ai.actionItems) || ["Confirm meeting time", "Prepare talking points"];
    return { threadId, subject, attendees, proposedTimes, agenda, prepNotes, actionItems };
  }

  emailIntelligence(tenantId: string) {
    const messages = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.folder === "inbox");
    const unread = messages.filter(m => !m.read);
    const byPriority: Record<string, number> = { critical: 0, high: 0, normal: 0, low: 0 };
    let actionItemsTotal = 0;
    for (const msg of unread) {
      const p = (msg.ai && msg.ai.priority) || "normal";
      byPriority[p] = (byPriority[p] || 0) + 1;
      actionItemsTotal += (msg.ai && msg.ai.actionItems.length) || 0;
    }
    const categoryCounts = new Map<string, number>();
    for (const msg of messages) {
      const cat = (msg.ai && msg.ai.category) || "unclassified";
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }
    const byCategory = [...categoryCounts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count).slice(0, 6);
    const digest = unread
      .sort((a, b) => {
        const rank = (p: string) => (p === "critical" ? 3 : p === "high" ? 2 : p === "normal" ? 1 : 0);
        return rank((b.ai && b.ai.priority) || "normal") - rank((a.ai && a.ai.priority) || "normal");
      })
      .slice(0, 3)
      .map(m => ({ messageId: m._id, subject: m.subject, from: (m.from || {}).name || (m.from || {}).email, priority: (m.ai && m.ai.priority) || "normal", summary: (m.ai && m.ai.summary) || m.preview }));
    const attention = (byPriority.critical || 0) + (byPriority.high || 0);
    const needsReply = unread.length;
    return {
      totalUnread: unread.length,
      unreadByPriority: byPriority,
      attentionItems: attention,
      needsReply,
      actionItemsTotal,
      byCategory,
      digest,
      suggestedRepliesReady: unread.filter(m => m.ai && m.ai.replySuggestions && m.ai.replySuggestions.length > 0).length,
      summary: `${unread.length} unread in inbox — ${attention} need attention${attention > 0 ? ", start with critical" : ", inbox is clear"}`,
      seed: hashStr(tenantId + "ai_seed"),
    };
  }

  private buildReplies(msg: any, seed: number) {
    const category = (msg.ai && msg.ai.category) || "business";
    const sender = (msg.from || {}).name || "there";
    const templates: Record<string, string[]> = {
      business: [
        `Hi ${sender}, thanks for reaching out — I'll review and get back to you shortly.`,
        `Thanks ${sender}, this looks good on my end. Let's move forward.`,
        `Appreciate the update, ${sender}. I'll confirm the details by the end of the day.`,
      ],
      personal: [
        `Hey ${sender}, sounds good — works for me!`,
        `Hi ${sender}, thanks for the note — let's catch up soon.`,
        `That's great to hear, ${sender}! Happy to help.`,
      ],
      billing: [
        `Hi ${sender}, I'll review the invoice and process it within the payment terms.`,
        `Thanks for sending the invoice — I'll flag any questions before the due date.`,
        `Received, ${sender}. Payment is scheduled within 30 days net.`,
      ],
      notification: [
        `Thanks for the alert, ${sender} — I'll take a look.`,
        `Noted, ${sender}. I'll follow up if anything looks off.`,
        `Appreciate the heads-up. Will action shortly.`,
      ],
    };
    const pool = templates[category] || templates.business;
    const tones = ["concise", "friendly", "professional"];
    return [0, 1, 2].map(i => ({
      tone: tones[(seed + i) % 3],
      text: pool[(seed + i * 13) % pool.length],
      confidence: 72 + ((seed + i * 29) % 24),
    }));
  }
}

export const mailAI = new MailAIService();
