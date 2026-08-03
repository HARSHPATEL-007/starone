import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const OPERATORS = [
  { op: "from", label: "Sender", example: "from:john@example.com", desc: "Sender email or name" },
  { op: "to", label: "Recipient", example: "to:team-alpha", desc: "Recipient email or name" },
  { op: "subject", label: "Subject", example: "subject:\"budget review\"", desc: "Subject line (quote phrases)" },
  { op: "has", label: "Attachments", example: "has:attachment", desc: "Messages with attachments" },
  { op: "has", label: "Voice note", example: "has:voice", desc: "Messages with voice notes" },
  { op: "has", label: "Poll", example: "has:poll", desc: "Messages with embedded polls" },
  { op: "collaborated", label: "Collaborated", example: "collaborated:with:jane@team.io", desc: "Messages with comments/reactions — optionally with:EMAIL" },
  { op: "ai", label: "AI suggested", example: "ai:suggested", desc: "Messages with AI suggestions (summary / smart reply)" },
  { op: "visual", label: "Visual content", example: "visual:contains:chart", desc: "Visual content — photo, chart, whiteboard, video (AI-tagged)" },
  { op: "type", label: "Attachment type", example: "type:pdf", desc: "Attachment file type (modifier for has:attachment)" },
  { op: "in", label: "Folder", example: "in:sent", desc: "Folder location" },
  { op: "label", label: "Label", example: "label:important", desc: "Label filter" },
  { op: "date", label: "Date", example: "date:2026-07", desc: "Date range — YYYY-MM, YYYY-MM-DD, today, yesterday, last7d, last30d" },
  { op: "size", label: "Size", example: "size:>10MB", desc: "Attachment size filter (KB/MB/GB with >, <, >=)" },
  { op: "is", label: "Status", example: "is:unread", desc: "Flags: unread, read, starred, important" },
  { op: "sentiment", label: "Sentiment", example: "sentiment:negative", desc: "AI sentiment — positive, negative, neutral" },
  { op: "priority", label: "Priority", example: "priority:high", desc: "AI priority — high, medium, low" },
  { op: "topic", label: "Topic", example: "topic:finance", desc: "AI topic / category classification" },
  { op: "near", label: "Natural language", example: "near:meeting tomorrow", desc: "Natural language context phrase" },
  { op: "related", label: "Thread", example: "related:thr_abc123", desc: "Thread / conversation id" },
];

const KNOWN_OPS = new Set(OPERATORS.map((o) => o.op));

function scoreMessage(msg: any, q: string): number {
  if (!q) return 1;
  const subject = (msg.subject || "").toLowerCase();
  const from = `${(msg.from || {}).email || ""} ${(msg.from || {}).name || ""}`.toLowerCase();
  const body = (msg.body || "").toLowerCase();
  const labels = (msg.labels || []).join(" ").toLowerCase();
  let score = 0;
  if (subject.includes(q)) score += 10;
  if (from.includes(q)) score += 8;
  if (labels.includes(q)) score += 4;
  if (body.includes(q)) score += 3;
  return score;
}

function parseSize(raw: string): { cmp: string; bytes: number } | null {
  const m = raw.match(/^(>=|<=|>|<|=)?\s*([\d.]+)\s*(kb|mb|gb)$/i);
  if (!m) return null;
  const mult = m[3].toLowerCase() === "kb" ? 1024 : m[3].toLowerCase() === "mb" ? 1024 * 1024 : 1024 * 1024 * 1024;
  return { cmp: m[1] || "=", bytes: parseFloat(m[2]) * mult };
}

function parseDate(raw: string): { start?: string; end?: string; label: string } {
  const v = raw.toLowerCase();
  if (v === "today") return { start: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(), label: "today" };
  if (v === "yesterday") {
    const end = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    return { start: new Date(new Date(end).getTime() - 86400000).toISOString(), end, label: "yesterday" };
  }
  if (v === "last7d" || v === "last7") return { start: new Date(Date.now() - 7 * 86400000).toISOString(), label: "last 7 days" };
  if (v === "last30d" || v === "last30") return { start: new Date(Date.now() - 30 * 86400000).toISOString(), label: "last 30 days" };
  if (/^\d{4}$/.test(v)) return { start: new Date(`${v}-01-01`).toISOString(), end: new Date(`${v}-12-31T23:59:59`).toISOString(), label: v };
  if (/^\d{4}-\d{2}$/.test(v)) {
    const [y, mo] = v.split("-").map(Number);
    return { start: new Date(y, mo - 1, 1).toISOString(), end: new Date(y, mo, 0, 23, 59, 59).toISOString(), label: v };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, mo, d] = v.split("-").map(Number);
    return { start: new Date(y, mo - 1, d).toISOString(), end: new Date(y, mo - 1, d + 1).toISOString(), label: v };
  }
  return { start: new Date(Date.now() - 7 * 86400000).toISOString(), label: `recent (${v})` };
}

export class MailSearchOperatorsService {
  parseQuery(query: string) {
    const input = String(query || "").trim();
    const operators: { op: string; raw: string; value: string }[] = [];
    const invalid: { op: string; raw: string; reason: string }[] = [];
    const textParts: string[] = [];
    const tokens = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    let i = 0;
    while (i < tokens.length) {
      const tok = tokens[i];
      const stripped = tok.replace(/^"|"$/g, "");
      const m = stripped.match(/^([a-z]+):(.*)$/i);
      if (m && KNOWN_OPS.has(m[1].toLowerCase())) {
        const op = m[1].toLowerCase();
        let value = m[2].replace(/^"|"$/g, "");
        if (op === "near") {
          const rest = tokens.slice(i + 1).map((t) => t.replace(/^"|"$/g, ""));
          value = [value, ...rest].filter(Boolean).join(" ");
          i = tokens.length;
        }
        if (!value) {
          invalid.push({ op, raw: tok, reason: "missing value" });
          i++;
          continue;
        }
        if (op === "is" && !["unread", "read", "starred", "important"].includes(value.toLowerCase())) {
          invalid.push({ op, raw: tok, reason: `unknown flag "${value}"` });
          i++;
          continue;
        }
        if (op === "has" && !["attachment", "voice", "poll"].includes(value.toLowerCase())) {
          invalid.push({ op, raw: tok, reason: `unknown has: value "${value}" (use attachment, voice, poll)` });
          i++;
          continue;
        }
        if (op === "size" && !parseSize(value)) {
          invalid.push({ op, raw: tok, reason: `bad size "${value}" (use e.g. size:>10MB)` });
          i++;
          continue;
        }
        if (op === "date" && !parseDate(value).start) {
          invalid.push({ op, raw: tok, reason: `bad date "${value}"` });
          i++;
          continue;
        }
        operators.push({ op, raw: op === "near" ? `near:${value}` : tok, value });
        i++;
        continue;
      }
      if (m && !KNOWN_OPS.has(m[1].toLowerCase())) {
        invalid.push({ op: m[1].toLowerCase(), raw: tok, reason: "unknown operator" });
        textParts.push(stripped);
        i++;
        continue;
      }
      textParts.push(stripped);
      i++;
    }
    const freeText = textParts.join(" ");
    const filters = this.buildFilters(operators);
    return {
      query: input,
      operators,
      freeText,
      filters,
      invalid,
      parsed: operators.length + (freeText ? 1 : 0),
      explanation: operators.map((o) => this.explainOperator(o.op, o.value)).concat(freeText ? [`Matching "${freeText}"`] : []),
      summary: `${operators.length} operator(s) applied${freeText ? ` + text "${freeText}"` : ""}`,
    };
  }

  private buildFilters(operators: { op: string; value: string }[]) {
    const f: any = {};
    for (const { op, value } of operators) {
      if (op === "from") f.from = value;
      if (op === "to") f.to = value;
      if (op === "subject") f.subject = value;
      if (op === "type") { f.hasAttachment = true; f.attachmentType = value.toLowerCase(); }
      if (op === "in") f.inFolder = value.toLowerCase();
      if (op === "label") f.label = value;
      if (op === "date") {
        const d = parseDate(value);
        f.startDate = d.start;
        f.endDate = d.end;
      }
      if (op === "size") {
        const s = parseSize(value)!;
        f.sizeCmp = s.cmp;
        f.sizeBytes = s.bytes;
      }
      if (op === "is") {
        const flag = value.toLowerCase();
        if (flag === "unread") f.unread = true;
        if (flag === "read") f.read = true;
        if (flag === "starred") f.starred = true;
        if (flag === "important") f.important = true;
      }
      if (op === "has") {
        const hv = value.toLowerCase();
        if (hv === "attachment") f.hasAttachment = true;
        if (hv === "voice") f.hasVoice = true;
        if (hv === "poll") f.hasPoll = true;
      }
      if (op === "collaborated") {
        f.collaborated = true;
        const v = value.toLowerCase().startsWith("with:") ? value.slice(5) : "";
        if (v) f.collabWith = v;
      }
      if (op === "ai") f.aiSuggested = true;
      if (op === "visual") f.visual = value.toLowerCase().startsWith("contains:") ? value.slice(9) : value;
      if (op === "sentiment") f.sentiment = value.toLowerCase();
      if (op === "priority") f.priority = value.toLowerCase();
      if (op === "topic") f.topic = value.toLowerCase();
      if (op === "near") f.near = value;
      if (op === "related") f.threadId = value;
    }
    return f;
  }

  explainOperator(op: string, value: string): string {
    const labels: Record<string, string> = {
      from: `From "${value}"`,
      to: `To "${value}"`,
      subject: `Subject contains "${value}"`,
      has: `With ${value}`,
      collaborated: value ? `Collaborated by "${value}"` : "With collaboration activity",
      ai: "With AI suggestions",
      visual: `Visual content "${value}"`,
      type: `Attachment type "${value}"`,
      in: `In folder "${value}"`,
      label: `Label "${value}"`,
      date: `Received around "${value}"`,
      size: `Attachment size ${value}`,
      is: `Flag "${value}"`,
      sentiment: `Sentiment "${value}"`,
      priority: `Priority "${value}"`,
      topic: `Topic "${value}"`,
      near: `About "${value}"`,
      related: `In thread "${value}"`,
    };
    return labels[op] || op;
  }

  operatorSearch(tenantId: string, query: string, opts: any = {}) {
    const parsed = this.parseQuery(query);
    const f = parsed.filters;
    let msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    if (opts.mailboxId) msgs = msgs.filter((m: any) => m.mailboxId === opts.mailboxId);
    if (f.from) msgs = msgs.filter((m: any) => `${(m.from || {}).email} ${(m.from || {}).name}`.toLowerCase().includes(String(f.from).toLowerCase()));
    if (f.to) msgs = msgs.filter((m: any) => (m.to || []).some((r: any) => `${r.email} ${r.name}`.toLowerCase().includes(String(f.to).toLowerCase())));
    if (f.subject) msgs = msgs.filter((m: any) => (m.subject || "").toLowerCase().includes(String(f.subject).toLowerCase()));
    if (f.hasAttachment) msgs = msgs.filter((m: any) => (m.attachments || []).length > 0);
    if (f.attachmentType) msgs = msgs.filter((m: any) => (m.attachments || []).some((a: any) => String(a.type || "").toLowerCase() === f.attachmentType));
    if (f.inFolder) msgs = msgs.filter((m: any) => (m.folder || "").toLowerCase() === f.inFolder || (m.labels || []).some((l: string) => l.toLowerCase() === f.inFolder));
    if (f.label) msgs = msgs.filter((m: any) => (m.labels || []).some((l: string) => l.toLowerCase().includes(String(f.label).toLowerCase())));
    if (f.startDate) msgs = msgs.filter((m: any) => new Date(m.receivedAt) >= new Date(f.startDate));
    if (f.endDate) msgs = msgs.filter((m: any) => new Date(m.receivedAt) <= new Date(f.endDate));
    if (f.sizeCmp) {
      msgs = msgs.filter((m: any) => {
        const bytes = (m.attachments || []).reduce((s: number, a: any) => s + (a.sizeBytes || 0), 0);
        if (f.sizeCmp === ">") return bytes > f.sizeBytes;
        if (f.sizeCmp === "<") return bytes < f.sizeBytes;
        if (f.sizeCmp === ">=") return bytes >= f.sizeBytes;
        if (f.sizeCmp === "<=") return bytes <= f.sizeBytes;
        return bytes === f.sizeBytes;
      });
    }
    if (f.unread) msgs = msgs.filter((m: any) => !m.read);
    if (f.read) msgs = msgs.filter((m: any) => !!m.read);
    if (f.starred) msgs = msgs.filter((m: any) => !!m.starred);
    if (f.important) msgs = msgs.filter((m: any) => (m.ai && m.ai.priority === "high") || m.importance === "high");
    if (f.sentiment) msgs = msgs.filter((m: any) => (m.ai && m.ai.sentiment || "").toLowerCase() === f.sentiment);
    if (f.priority) msgs = msgs.filter((m: any) => (m.ai && m.ai.priority) === f.priority || m.importance === f.priority);
    if (f.topic) msgs = msgs.filter((m: any) => String((m.ai && m.ai.category) || "").toLowerCase().includes(f.topic));
    if (f.near) {
      const phrase = String(f.near).toLowerCase();
      msgs = msgs.filter((m: any) => `${m.subject || ""} ${m.body || ""}`.toLowerCase().includes(phrase) || scoreMessage(m, phrase) > 0);
    }
    if (f.threadId) msgs = msgs.filter((m: any) => m.threadId === f.threadId);
    if (f.hasVoice) {
      const vn = new Set(DataStore.mem().find("mail_voice_notes", (n: any) => n.tenantId === tenantId).map((n: any) => n.messageId));
      msgs = msgs.filter((m: any) => vn.has(m._id) || (m.attachments || []).some((a: any) => ["voice", "audio"].includes(String(a.type || "").toLowerCase())));
    }
    if (f.hasPoll) {
      const pl = new Set(DataStore.mem().find("mail_polls", (p: any) => p.tenantId === tenantId).map((p: any) => p.messageId));
      msgs = msgs.filter((m: any) => pl.has(m._id));
    }
    if (f.collaborated) {
      const comments = DataStore.mem().find("mail_comments", (c: any) => c.tenantId === tenantId);
      const reactions = DataStore.mem().find("mail_reactions", (r: any) => r.tenantId === tenantId);
      const collab = new Set(comments.map((c: any) => c.messageId).concat(reactions.map((r: any) => r.messageId)));
      msgs = msgs.filter((m: any) => {
        if (!collab.has(m._id)) return false;
        if (f.collabWith) {
          const w = String(f.collabWith).toLowerCase();
          return comments.some((c: any) => c.messageId === m._id && `${c.author || ""}`.toLowerCase().includes(w))
            || reactions.some((r: any) => r.messageId === m._id && `${r.user || ""}`.toLowerCase().includes(w));
        }
        return true;
      });
    }
    if (f.aiSuggested) msgs = msgs.filter((m: any) => !!(m.ai && (m.ai.summary || m.ai.suggestedReply)) || ((m.aiSuggestions || []).length > 0));
    if (f.visual) {
      const v = String(f.visual).toLowerCase();
      msgs = msgs.filter((m: any) => {
        const visualAtts = (m.attachments || []).filter((a: any) => ["image", "video", "visual"].includes(String(a.type || "").toLowerCase()));
        if (!visualAtts.length) return false;
        const tags = `${(m.ai && (m.ai.visualTags || m.ai.tags)) || ""}`.toLowerCase();
        return visualAtts.some((a: any) => `${a.name || a.filename || ""}`.toLowerCase().includes(v)) || tags.includes(v);
      });
    }
    const q = parsed.freeText.toLowerCase();
    const scored = msgs
      .map((m: any) => ({ message: m, score: scoreMessage(m, q) }))
      .filter((r: any) => !q || r.score > 0)
      .sort((a: any, b: any) => b.score - a.score || new Date(b.message.receivedAt).getTime() - new Date(a.message.receivedAt).getTime());
    const messages = scored.map((r: any) => ({ ...r.message, score: r.score }));
    this.logQuery(tenantId, query, messages.length);
    return {
      query,
      parsed: { operators: parsed.operators, invalid: parsed.invalid, freeText: parsed.freeText, explanation: parsed.explanation },
      filters: f,
      messages,
      total: messages.length,
      summary: `${messages.length} result(s) for "${query || "all mail"}"`,
    };
  }

  private logQuery(tenantId: string, query: string, hits: number) {
    DataStore.mem().insert("mail_search_log", {
      tenantId, query, hits, at: new Date().toISOString(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }

  operatorReference() {
    return {
      operators: OPERATORS,
      syntax: "op:value — combine freely, e.g. from:john is:unread has:attachment size:>5MB",
      example: 'from:john.smith@partner.com subject:"budget review" is:unread',
      summary: `${OPERATORS.length} search operators available`,
    };
  }

  searchExamples(tenantId: string) {
    const examples: { query: string; explanation: string }[] = [
      { query: "is:unread", explanation: "Unread mail" },
      { query: "has:attachment type:pdf", explanation: "PDF attachments" },
      { query: "is:starred", explanation: "Starred mail" },
      { query: "in:sent", explanation: "Sent folder" },
      { query: "sentiment:negative", explanation: "Negative sentiment" },
      { query: "priority:high", explanation: "High priority" },
      { query: "size:>1MB", explanation: "Large attachments" },
      { query: "date:last7d", explanation: "Last 7 days" },
    ];
    return examples.map((e) => {
      const r = this.operatorSearch(tenantId, e.query);
      return {
        query: e.query,
        explanation: e.explanation,
        total: r.total,
        top: r.messages.slice(0, 3).map((m: any) => ({ subject: m.subject, from: (m.from || {}).email })),
      };
    });
  }

  recentQueries(tenantId: string) {
    const entries = DataStore.mem().find("mail_search_log", (e: any) => e.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return { queries: entries.slice(0, 25), total: entries.length, summary: `${entries.length} recent search(es)` };
  }

  clearHistory(tenantId: string) {
    const store = DataStore.mem();
    const entries = store.find("mail_search_log", (e: any) => e.tenantId === tenantId);
    for (const e of entries) store.delete("mail_search_log", (x: any) => x._id === e._id);
    return { cleared: entries.length, summary: `Cleared ${entries.length} search(es) from history` };
  }

  operatorStats(tenantId: string) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const stats = OPERATORS.map((o) => {
      let applicable = 0;
      if (o.op === "from") applicable = new Set(msgs.map((m: any) => (m.from || {}).email)).size;
      else if (o.op === "to") applicable = msgs.filter((m: any) => (m.to || []).length).length;
      else if (o.op === "subject") applicable = msgs.filter((m: any) => m.subject).length;
      else if (o.op === "has" && o.example === "has:attachment") applicable = msgs.filter((m: any) => (m.attachments || []).length > 0).length;
      else if (o.op === "has" && o.example === "has:voice") {
        const vn = new Set(DataStore.mem().find("mail_voice_notes", (n: any) => n.tenantId === tenantId).map((n: any) => n.messageId));
        applicable = msgs.filter((m: any) => vn.has(m._id) || (m.attachments || []).some((a: any) => ["voice", "audio"].includes(String(a.type || "").toLowerCase()))).length;
      }
      else if (o.op === "has" && o.example === "has:poll") {
        const pl = new Set(DataStore.mem().find("mail_polls", (p: any) => p.tenantId === tenantId).map((p: any) => p.messageId));
        applicable = msgs.filter((m: any) => pl.has(m._id)).length;
      }
      else if (o.op === "collaborated") {
        const comments = new Set(DataStore.mem().find("mail_comments", (c: any) => c.tenantId === tenantId).map((c: any) => c.messageId));
        const reactions = new Set(DataStore.mem().find("mail_reactions", (r: any) => r.tenantId === tenantId).map((r: any) => r.messageId));
        applicable = msgs.filter((m: any) => comments.has(m._id) || reactions.has(m._id)).length;
      }
      else if (o.op === "ai") applicable = msgs.filter((m: any) => !!(m.ai && (m.ai.summary || m.ai.suggestedReply)) || ((m.aiSuggestions || []).length > 0)).length;
      else if (o.op === "visual") applicable = msgs.filter((m: any) => (m.attachments || []).some((a: any) => ["image", "video", "visual"].includes(String(a.type || "").toLowerCase()))).length;
      else if (o.op === "type") applicable = new Set(msgs.flatMap((m: any) => (m.attachments || []).map((a: any) => a.type))).size;
      else if (o.op === "in") applicable = new Set(msgs.map((m: any) => m.folder)).size;
      else if (o.op === "label") applicable = new Set(msgs.flatMap((m: any) => m.labels || [])).size;
      else if (o.op === "date") applicable = msgs.length;
      else if (o.op === "size") applicable = msgs.filter((m: any) => (m.attachments || []).reduce((s: number, a: any) => s + (a.sizeBytes || 0), 0) > 0).length;
      else if (o.op === "is") applicable = msgs.filter((m: any) => !m.read || m.starred || (m.ai && m.ai.priority === "high")).length;
      else if (o.op === "sentiment") applicable = msgs.filter((m: any) => m.ai && m.ai.sentiment).length;
      else if (o.op === "priority") applicable = msgs.filter((m: any) => (m.ai && m.ai.priority) || m.importance).length;
      else if (o.op === "topic") applicable = msgs.filter((m: any) => m.ai && m.ai.category).length;
      else if (o.op === "near") applicable = msgs.length;
      else if (o.op === "related") applicable = new Set(msgs.map((m: any) => m.threadId)).size;
      return { op: o.op, label: o.label, example: o.example, messages: applicable, sharePct: msgs.length ? parseFloat(((applicable / msgs.length) * 100).toFixed(1)) : 0 };
    });
    return { stats, totalMessages: msgs.length, summary: `Operator coverage across ${msgs.length} message(s)`, seed: hashStr(tenantId + "opstats") };
  }
}

export const mailSearchOp = new MailSearchOperatorsService();
