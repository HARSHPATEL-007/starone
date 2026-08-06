import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const SEARCH_OPERATORS = [
  { op: "from:", example: "from:john@company.com", description: "Messages from a specific user" },
  { op: "in:", example: "in:#project-alpha", description: "Messages in a specific room" },
  { op: "has:", example: "has:file", description: "Messages with attachments" },
  { op: "is:", example: "is:thread", description: "Thread parent messages only" },
  { op: "before:", example: "before:2026-07-01", description: "Messages before a date" },
  { op: "after:", example: "after:2026-06-01", description: "Messages after a date" },
  { op: "sentiment:", example: "sentiment:negative", description: "Messages with a sentiment polarity" },
  { op: "language:", example: "language:zh", description: "Messages in a specific language" },
  { op: "type:", example: "type:code", description: "Messages of a content type" },
  { op: "reaction:", example: "reaction:fire", description: "Messages with a specific reaction" },
];

export class ChatSearchService {
  parseQuery(query: string) {
    const parts: Record<string, string> = {};
    let freeText = String(query || "").trim();
    const opRe = /\b(from|in|has|is|before|after|sentiment|language|type|reaction):(\S+)/g;
    let m: RegExpExecArray | null;
    while ((m = opRe.exec(freeText)) !== null) {
      parts[m[1]] = m[2].replace(/^#/, "");
      freeText = freeText.replace(m[0], " ").trim();
    }
    return { operators: parts, freeText: freeText.replace(/\s+/g, " ").trim() };
  }

  search(tenantId: string, opts: any) {
    const query = String(opts.query || "").trim();
    if (!query) throw new Error("query is required");
    const { operators, freeText } = this.parseQuery(query);
    const lower = freeText.toLowerCase();

    let rows = DataStore.mem().find("chat_messages", (m: any) => m.tenantId === tenantId && !m.deleted_at);
    if (operators.in) {
      const room = DataStore.mem().findOne("chat_rooms", (r: any) => r.tenantId === tenantId && (r.roomId === operators.in || r.name === operators.in || r.display_name === operators.in));
      if (!room) return { messages: [], total: 0, operators, summary: `No room found for in:${operators.in}` };
      rows = rows.filter((m) => m.roomId === room.roomId);
    }
    if (operators.from) rows = rows.filter((m) => String(m.sender.user_id).toLowerCase().includes(operators.from.toLowerCase()) || String(m.sender.display_name).toLowerCase().includes(operators.from.toLowerCase()));
    if (operators.has) {
      if (operators.has === "file" || operators.has === "attachment") rows = rows.filter((m) => (m.attachments || []).length > 0);
      else rows = rows.filter((m) => (m.attachments || []).some((a: any) => a.filename && a.filename.toLowerCase().includes(operators.has.toLowerCase())));
    }
    if (operators.is) {
      if (operators.is === "thread" || operators.is === "threads") rows = rows.filter((m) => m.thread_info && m.thread_info.reply_count > 0);
      if (operators.is === "pinned") rows = rows.filter((m) => m.is_pinned);
      if (operators.is === "decision") rows = rows.filter((m) => m.is_decision);
      if (operators.is === "unread") rows = rows.filter((m) => !m.read);
    }
    if (operators.before) rows = rows.filter((m) => m.created_at < new Date(operators.before).toISOString());
    if (operators.after) rows = rows.filter((m) => m.created_at > new Date(operators.after).toISOString());
    if (operators.sentiment) {
      const polarity = operators.sentiment.toLowerCase();
      rows = rows.filter((m) => (polarity === "negative" || polarity === "neg" ? (m.ai_analysis?.sentiment || 0) < -0.1 : polarity === "positive" || polarity === "pos" ? (m.ai_analysis?.sentiment || 0) > 0.1 : true));
    }
    if (operators.language) rows = rows.filter((m) => m.content.language === operators.language.toLowerCase());
    if (operators.type) rows = rows.filter((m) => m.content.type === operators.type.toLowerCase());
    if (operators.reaction) rows = rows.filter((m) => (m.reactions || []).some((r: any) => r.emoji === operators.reaction || r.emoji.includes(operators.reaction)));

    if (freeText) {
      const terms = freeText.toLowerCase().split(/\s+/);
      rows = rows.filter((m) => {
        const body = String(m.content.body || "").toLowerCase();
        return terms.every((t) => body.includes(t));
      });
    }

    rows = rows.sort((a: any, b: any) => {
      const sa = a.ai_analysis?.sentiment || 0;
      const sb = b.ai_analysis?.sentiment || 0;
      return sb - sa || b.created_at.localeCompare(a.created_at);
    });
    const limit = opts.limit ? Math.min(Math.max(1, parseInt(String(opts.limit), 10) || 50), 200) : 50;
    const total = rows.length;
    const messages = rows.slice(0, limit).map((m) => {
      const room = DataStore.mem().findOne("chat_rooms", (r: any) => r.roomId === m.roomId && r.tenantId === tenantId);
      return { ...m, room_name: room ? room.display_name || room.name : null };
    });
    return { messages, total, operators, query, summary: `${total} match(es) for "${query}"` };
  }

  semanticSearch(tenantId: string, query: string, opts: any = {}) {
    if (!query) throw new Error("query is required");
    const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    let rows = DataStore.mem().find("chat_messages", (m: any) => m.tenantId === tenantId && !m.deleted_at);
    const scored = rows.map((m) => {
      const body = String(m.content.body || "").toLowerCase();
      let score = 0;
      for (const t of terms) if (body.includes(t)) score += 1;
      const topicHits = (m.ai_analysis?.topics || []).filter((t: string) => terms.some((q) => t.includes(q))).length;
      score += topicHits * 2;
      const room = DataStore.mem().findOne("chat_rooms", (r: any) => r.roomId === m.roomId && r.tenantId === tenantId);
      if (room && terms.some((t) => String(room.name || "").toLowerCase().includes(t))) score += 3;
      return { msg: m, score };
    });
    scored.sort((a, b) => b.score - a.score || b.msg.created_at.localeCompare(a.msg.created_at));
    const matches = scored.filter((x) => x.score > 0);
    const limit = opts.limit ? Math.min(Math.max(1, parseInt(String(opts.limit), 10) || 20), 100) : 20;
    const results = matches.slice(0, limit).map(({ msg, score }) => {
      const room = DataStore.mem().findOne("chat_rooms", (r: any) => r.roomId === msg.roomId && r.tenantId === tenantId);
      return { ...msg, relevance: score, room_name: room ? room.display_name || room.name : null };
    });
    return { results, total: matches.length, query, summary: `${matches.length} semantic match(es) for "${query}"` };
  }

  saveSearch(tenantId: string, input: any) {
    if (!input || !input.name || !input.query) throw new Error("name and query are required");
    const id = `saved_${hashStr(tenantId + input.name)}`;
    if (DataStore.mem().findOne("chat_saved_searches", (s: any) => s.savedId === id && s.tenantId === tenantId)) throw new Error("A saved search with this name already exists");
    const saved = DataStore.mem().insert("chat_saved_searches", { tenantId, savedId: id, name: input.name, query: input.query, filters: input.filters || {}, created_at: new Date().toISOString() });
    return { saved, summary: `Saved search "${input.name}"` };
  }

  listSavedSearches(tenantId: string) {
    const rows = DataStore.mem().find("chat_saved_searches", (s: any) => s.tenantId === tenantId);
    return { searches: rows, total: rows.length, summary: `${rows.length} saved search(es)` };
  }

  deleteSavedSearch(tenantId: string, savedId: string) {
    const ok = DataStore.mem().delete("chat_saved_searches", (s: any) => s.savedId === savedId && s.tenantId === tenantId);
    if (!ok) throw new Error(`Saved search "${savedId}" not found`);
    return { savedId, summary: "Saved search deleted" };
  }

  searchStats(tenantId: string) {
    const msgs = DataStore.mem().find("chat_messages", (m: any) => m.tenantId === tenantId);
    const total = msgs.length;
    const withAttachments = msgs.filter((m) => (m.attachments || []).length > 0).length;
    const decisions = msgs.filter((m) => m.is_decision).length;
    const withThreads = msgs.filter((m) => m.thread_info && m.thread_info.reply_count > 0).length;
    return {
      total,
      withAttachments,
      decisions,
      withThreads,
      languages: Array.from(new Set(msgs.map((m) => m.content.language))).slice(0, 10),
      types: Array.from(new Set(msgs.map((m) => m.content.type))),
      operators: SEARCH_OPERATORS,
      summary: `${total} messages indexed`,
    };
  }
}

export const chatSearch = new ChatSearchService();