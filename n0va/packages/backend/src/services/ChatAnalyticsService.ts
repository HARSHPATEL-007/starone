import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export class ChatAnalyticsService {
  messageVolume(tenantId: string, opts: any = {}) {
    const messages = DataStore.mem().find("chat_messages", (x: any) => x.tenantId === tenantId);
    const now = Date.now();
    const buckets: Record<string, number> = {};
    const windowMs = Number(opts.window) || 86400000;
    for (const m of messages) {
      const t = new Date(m.created_at).getTime();
      if (now - t > windowMs) continue;
      const k = new Date(t).toISOString().slice(0, opts.granularity === "hour" ? 13 : 10);
      buckets[k] = (buckets[k] || 0) + 1;
    }
    return {
      buckets: Object.entries(buckets).map(([date, count]) => ({ date, count })),
      total: Object.values(buckets).reduce((a, b) => a + b, 0),
      summary: `${Object.values(buckets).reduce((a, b) => a + b, 0)} message(s) in window`,
    };
  }

  topRooms(tenantId: string, opts: any = {}) {
    const counts: Record<string, number> = {};
    for (const m of DataStore.mem().find("chat_messages", (x: any) => x.tenantId === tenantId)) {
      counts[m.roomId] = (counts[m.roomId] || 0) + 1;
    }
    const rows = Object.entries(counts)
      .map(([roomId, count]) => {
        const room = DataStore.mem().findOne("chat_rooms", (r: any) => r.roomId === roomId);
        return { roomId, room_name: room?.display_name || room?.name || roomId, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, opts.limit || 10);
    return { rows, summary: `Top ${rows.length} room(s) by message volume` };
  }

  userActivity(tenantId: string, opts: any = {}) {
    const counts: Record<string, { sent: number; reactions: number; edits: number }> = {};
    for (const m of DataStore.mem().find("chat_messages", (x: any) => x.tenantId === tenantId)) {
      const uid = m.sender?.user_id || "unknown";
      counts[uid] = counts[uid] || { sent: 0, reactions: 0, edits: 0 };
      counts[uid].sent += 1;
      counts[uid].reactions += (m.reactions || []).length;
      if (m.edited_at) counts[uid].edits += 1;
    }
    const rows = Object.entries(counts)
      .map(([userId, v]) => ({ userId, ...v }))
      .sort((a, b) => b.sent - a.sent)
      .slice(0, opts.limit || 10);
    return { rows, total: rows.length, summary: `Activity for ${rows.length} user(s)` };
  }

  avgResponseTime(tenantId: string) {
    const messages = DataStore.mem().find("chat_messages", (x: any) => x.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const prev: Record<string, any> = {};
    const deltas: number[] = [];
    for (const m of messages) {
      const uid = m.sender?.user_id;
      if (uid && prev[uid]) deltas.push(new Date(m.created_at).getTime() - new Date(prev[uid]).getTime());
      prev[uid] = m.created_at;
    }
    const avg = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
    return {
      avg_ms: Math.round(avg),
      avg_minutes: Math.round(avg / 60000),
      samples: deltas.length,
      summary: `Avg response time ${Math.round(avg / 60000)} min (${deltas.length} samples)`,
    };
  }

  sentimentTrend(tenantId: string, opts: any = {}) {
    const messages = DataStore.mem().find("chat_messages", (x: any) => x.tenantId === tenantId)
      .filter((m: any) => m.ai_analysis?.sentiment !== undefined)
      .slice(-(opts.limit || 50));
    const positives = messages.filter((m: any) => m.ai_analysis.sentiment > 0.15).length;
    const negatives = messages.filter((m: any) => m.ai_analysis.sentiment < -0.15).length;
    const neutral = messages.length - positives - negatives;
    return {
      distribution: { positive: positives, neutral, negative: negatives },
      samples: messages.length,
      summary: `${positives} positive · ${neutral} neutral · ${negatives} negative (${messages.length} samples)`,
    };
  }

  report(tenantId: string) {
    const msgs = DataStore.mem().find("chat_messages", (x: any) => x.tenantId === tenantId);
    const rooms = DataStore.mem().find("chat_rooms", (x: any) => x.tenantId === tenantId);
    const activeUsers = new Set(msgs.map((m: any) => m.sender?.user_id)).size;
    const threads = msgs.filter((m: any) => m.threadId).length;
    const replies = msgs.filter((m: any) => m.parentId).length;
    const pinned = msgs.filter((m: any) => m.pinned).length;
    return {
      metrics: {
        messages: msgs.length,
        rooms: rooms.length,
        active_users: activeUsers,
        threads,
        thread_replies: replies,
        pinned_messages: pinned,
        avg_response_min: this.avgResponseTime(tenantId).avg_minutes,
      },
      summary: `${msgs.length} messages · ${rooms.length} rooms · ${activeUsers} active users`,
    };
  }

  dashboard(tenantId: string) {
    return {
      report: this.report(tenantId),
      volume_7d: this.messageVolume(tenantId, { window: 604800000 }),
      top_rooms: this.topRooms(tenantId, { limit: 5 }),
      top_users: this.userActivity(tenantId, { limit: 5 }),
      sentiment: this.sentimentTrend(tenantId),
      summary: this.report(tenantId).summary,
    };
  }
}

export const chatAnalytics = new ChatAnalyticsService();

export function generateSentiment(text: string): number {
  const positive = ["thanks", "great", "awesome", "love", "amazing", "excellent", "good", "nice", "perfect", "glad", "happy", "celebrate"];
  const negative = ["bug", "broken", "fail", "error", "crash", "hate", "terrible", "bad", "worst", "angry", "urgent", "frustrated"];
  const words = text.toLowerCase().split(/\W+/);
  let score = 0;
  for (const w of words) {
    if (positive.includes(w)) score += 0.2;
    if (negative.includes(w)) score -= 0.25;
  }
  return Math.max(-1, Math.min(1, score));
}

export function detectUrgency(text: string): number {
  const urgent = ["urgent", "asap", "critical", "immediately", "emergency", "fire", "down", "blocked", "broken", "deadline"];
  const words = text.toLowerCase().split(/\W+/);
  const hits = words.filter((w) => urgent.includes(w)).length;
  return Math.min(1, hits * 0.2);
}

export function detectLanguage(text: string): string {
  const markers: Array<[RegExp, string]> = [
    [/[\u4e00-\u9fff]/, "zh"],
    [/[\u3040-\u30ff]/, "ja"],
    [/[\uac00-\ud7af]/, "ko"],
    [/[\u0600-\u06ff]/, "ar"],
    [/[\u0400-\u04ff]/, "ru"],
    [/[\u0900-\u097f]/, "hi"],
    [/[àâäéèêëîïôöùûüç]/, "fr"],
    [/[áéíóúñ¿¡]/, "es"],
    [/[äöüß]/, "de"],
  ];
  for (const [re, lang] of markers) if (re.test(text)) return lang;
  return "en";
}

export function summarizeText(text: string, max: number = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}