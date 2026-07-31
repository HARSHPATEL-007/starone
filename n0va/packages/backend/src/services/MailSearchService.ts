import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

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

export class MailSearchService {
  searchMessages(tenantId: string, opts: any = {}) {
    const q = String(opts.query || "").toLowerCase().trim();
    let msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    if (opts.mailboxId) msgs = msgs.filter(m => m.mailboxId === opts.mailboxId);
    if (opts.folder) msgs = msgs.filter(m => m.folder === opts.folder);
    if (opts.label) msgs = msgs.filter(m => (m.labels || []).includes(opts.label));
    if (opts.from) msgs = msgs.filter(m => `${(m.from || {}).email} ${(m.from || {}).name}`.toLowerCase().includes(String(opts.from).toLowerCase()));
    if (opts.to) msgs = msgs.filter(m => (m.to || []).some((r: any) => `${r.email} ${r.name}`.toLowerCase().includes(String(opts.to).toLowerCase())));
    if (opts.hasAttachment) msgs = msgs.filter(m => (m.attachments || []).length > 0);
    if (opts.unread) msgs = msgs.filter(m => !m.read);
    if (opts.priority) msgs = msgs.filter(m => (m.ai && m.ai.priority) === opts.priority || m.importance === opts.priority);
    if (opts.startDate) msgs = msgs.filter(m => new Date(m.receivedAt) >= new Date(opts.startDate));
    if (opts.endDate) msgs = msgs.filter(m => new Date(m.receivedAt) <= new Date(opts.endDate));
    const scored = msgs
      .map(m => ({ message: m, score: scoreMessage(m, q) }))
      .filter(r => !q || r.score > 0)
      .sort((a, b) => b.score - a.score || new Date(b.message.receivedAt).getTime() - new Date(a.message.receivedAt).getTime());
    const results = scored.map(r => ({ ...r.message, score: r.score }));
    return { query: opts.query || "", filters: opts, messages: results, total: results.length, summary: `${results.length} result(s) for "${opts.query || "all mail"}"` };
  }

  semanticQuery(tenantId: string, q: string) {
    const query = String(q || "").trim();
    if (!query) throw new Error("Search query is required");
    const lower = query.toLowerCase();
    let intent = "general_search";
    let explanation = `Searching for "${query}"`;
    const filters: any = {};

    if (/\bunread\b/.test(lower)) {
      intent = "unread_emails";
      filters.unread = true;
      explanation = "Showing unread emails";
    }
    if (/\b(high.?priority|important|urgent)\b/.test(lower)) {
      intent = "high_priority";
      filters.priority = "high";
      explanation = "Highlighting high-priority mail";
    }
    if (/\b(attachments?|files|docs)\b/.test(lower)) {
      intent = "with_attachments";
      filters.hasAttachment = true;
      explanation = "Showing emails with attachments";
    }
    const fromMatch = lower.match(/\bfrom\s+([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|[a-z ]{2,})/);
    if (fromMatch) {
      intent = "from_sender";
      filters.from = fromMatch[1].trim();
      explanation = `Showing emails from "${filters.from}"`;
    }
    const aboutMatch = lower.match(/\b(about|regarding|re:|on)\s+(.+)/);
    if (aboutMatch && !fromMatch) {
      intent = "about_topic";
      filters.query = aboutMatch[2].trim();
      explanation = `Searching emails about "${filters.query}"`;
    }
    if (/\b(newsletter|promo|billing|travel|social)\b/.test(lower)) {
      const cat = lower.match(/\b(newsletter|promo|billing|travel|social)\b/)![1];
      intent = "category";
      filters.label = cat[0].toUpperCase() + cat.slice(1);
      explanation = `Showing ${cat} emails`;
    }
    if (/\b(this week|last 7 days|past week|recent)\b/.test(lower)) {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      filters.startDate = since;
      explanation = "Showing emails from the last 7 days";
    }
    if (/\byesterday\b/.test(lower)) {
      filters.startDate = new Date(Date.now() - 2 * 86400000).toISOString();
      filters.endDate = new Date(Date.now() - 86400000).toISOString();
      explanation = "Showing emails received yesterday";
    }

    const result = this.searchMessages(tenantId, { ...filters, query: filters.query || "" });
    return {
      intent,
      explanation,
      filters,
      messages: result.messages,
      total: result.total,
      summary: `${explanation} — ${result.total} found`,
    };
  }

  searchSuggestions(tenantId: string, q: string) {
    const query = String(q || "").toLowerCase().trim();
    const suggestions: { type: string; label: string; value: string }[] = [];
    const contacts = DataStore.mem().find("mail_contacts", (c: any) => c.tenantId === tenantId);
    if (!query) {
      for (const c of contacts.slice(0, 5)) suggestions.push({ type: "contact", label: `${c.name} <${c.email}>`, value: c.email });
      return { query, suggestions };
    }
    for (const c of contacts) {
      if (c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)) {
        suggestions.push({ type: "contact", label: `${c.name} <${c.email}>`, value: c.email });
      }
    }
    const senders = [...new Set(DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId).map(m => `${(m.from || {}).name} ${(m.from || {}).email}`.trim()))];
    for (const s of senders) {
      if (s.toLowerCase().includes(query) && suggestions.length < 8) {
        suggestions.push({ type: "sender", label: s, value: s.split(" ").pop() || s });
      }
    }
    suggestions.push({ type: "query", label: `Search "${q}"`, value: q });
    return { query, suggestions: suggestions.slice(0, 8) };
  }

  searchStats(tenantId: string) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const byFolder = new Map<string, number>();
    const senderCounts = new Map<string, { name: string; count: number }>();
    const categoryCounts = new Map<string, number>();
    for (const m of msgs) {
      byFolder.set(m.folder, (byFolder.get(m.folder) || 0) + 1);
      const email = (m.from || {}).email || "unknown";
      const existing = senderCounts.get(email) || { name: (m.from || {}).name || email, count: 0 };
      existing.count++;
      senderCounts.set(email, existing);
      const cat = (m.ai && m.ai.category) || "unclassified";
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }
    const folders = [...byFolder.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const topSenders = [...senderCounts.entries()].map(([email, v]) => ({ email, name: v.name, count: v.count })).sort((a, b) => b.count - a.count).slice(0, 5);
    const categories = [...categoryCounts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count).slice(0, 6);
    const unreadPct = msgs.length ? parseFloat(((msgs.filter(m => !m.read && m.folder === "inbox").length / msgs.length) * 100).toFixed(1)) : 0;
    return {
      totalMessages: msgs.length,
      byFolder: folders,
      topSenders,
      byCategory: categories,
      unreadPercent: unreadPct,
      summary: `${msgs.length} messages indexed — ${folders[0] ? `${folders[0].name} is your busiest folder` : "no mail yet"}`,
      seed: hashStr(tenantId + "search_seed"),
    };
  }
}

export const mailSearch = new MailSearchService();
