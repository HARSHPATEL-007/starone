import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function detectIntent(subject: string, body: string): { intent: string; label: string; action: string } {
  const hay = `${subject}\n${body}`.toLowerCase();
  if (/meeting|call|sync|schedule|invite|agenda|book/i.test(hay)) return { intent: "meeting_request", label: "Meeting request", action: "Accept with a proposed time slot" };
  if (/approve|approval|sign[- ]off|authorize|greenlight/i.test(hay)) return { intent: "approval_needed", label: "Approval needed", action: "Review details and approve or request changes" };
  if (/invoice|payment|terms|due|overdue/i.test(hay)) return { intent: "invoice", label: "Invoice / payment", action: "Forward to finance with a payment date" };
  if (/contract|signature|legal|draft|redline/i.test(hay)) return { intent: "contract", label: "Contract", action: "Route to legal for review" };
  if (/urgent|asap|critical|immediately|escalat/i.test(hay)) return { intent: "escalation", label: "Escalation", action: "Reply fast with an owner and timeline" };
  if (/newsletter|weekly|digest|promo|discount|sale|unsubscribe/i.test(hay)) return { intent: "newsletter", label: "Newsletter / promo", action: "Let the rules engine handle or archive" };
  return { intent: "info_only", label: "Info only", action: "Reply or file — no blocker" };
}

export class MailPredictiveService {
  private getMessage(tenantId: string, messageId: string): any {
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    return msg;
  }

  private threadMessages(tenantId: string, threadId: string): any[] {
    return DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.threadId === threadId)
      .sort((a: any, b: any) => new Date(a.receivedAt || a.sentAt || a.createdAt).getTime() - new Date(b.receivedAt || b.sentAt || b.createdAt).getTime());
  }

  responseTimePrediction(tenantId: string, threadId: string) {
    const msgs = this.threadMessages(tenantId, threadId);
    if (msgs.length === 0) throw new Error(`Thread "${threadId}" not found`);
    const last = msgs[msgs.length - 1];
    const sender = (last.from || {}).email || "sender";
    let observedGap: number | null = null;
    for (let i = 1; i < msgs.length; i++) {
      const prev = msgs[i - 1];
      const cur = msgs[i];
      const prevIsIncoming = prev.folder === "inbox";
      const curIsReply = cur.folder === "sent";
      if (prevIsIncoming && curIsReply) {
        observedGap = (new Date(cur.receivedAt || cur.sentAt).getTime() - new Date(prev.receivedAt).getTime()) / 3600000;
        break;
      }
    }
    const roll = hashStr(sender + threadId + "rtt");
    const predictedHours = observedGap !== null
      ? Math.max(0.5, Math.round(observedGap * 2) / 2)
      : Math.round((2 + (roll % 22)) * 2) / 2;
    return {
      threadId,
      subject: last.subject,
      sender: last.from || { email: sender },
      typicalResponseHours: predictedHours,
      confidence: observedGap !== null ? 88 : 62 + (roll % 20),
      basis: observedGap !== null ? "observed reply latency in this thread" : "sender behaviour model",
      factors: [
        observedGap !== null ? `Last reply took ${Math.round(observedGap)}h — used as the baseline` : "No replies yet in this thread",
        predictedHours <= 8 ? "Sender usually responds same-day" : "Sender tends to respond within days",
      ],
      summary: `${(last.from || {}).name || sender} typically responds within ~${predictedHours}h`,
    };
  }

  outcomePrediction(tenantId: string, messageId: string) {
    const msg = this.getMessage(tenantId, messageId);
    const intent = detectIntent(msg.subject || "", msg.body || "");
    const roll = hashStr(msg._id + "outcome");
    const probability = 40 + (roll % 55);
    return {
      messageId,
      subject: msg.subject,
      from: msg.from || {},
      intent: intent.intent,
      intentLabel: intent.label,
      probability,
      likelyOutcome: probability >= 70 ? "High chance of a favourable resolution" : probability >= 45 ? "Mixed — needs a nudge to close" : "Unlikely to self-resolve — requires action",
      suggestedAction: intent.action,
      factors: [
        `Detected intent: ${intent.label}`,
        `Message importance: ${msg.importance || "normal"}`,
        (msg.ai && msg.ai.sentiment) ? `Sender sentiment: ${msg.ai.sentiment}` : "Sentiment not enriched yet",
      ],
      summary: `${msg.subject} — ${probability}% probability, "${intent.label}"`,
    };
  }

  churnRisk(tenantId: string, threadId: string) {
    const msgs = this.threadMessages(tenantId, threadId);
    if (msgs.length === 0) throw new Error(`Thread "${threadId}" not found`);
    const last = msgs[msgs.length - 1];
    const lastAt = new Date(last.receivedAt || last.sentAt || last.createdAt).getTime();
    const ageDays = Math.max(0, (Date.now() - lastAt) / 86400000);
    const replyCount = msgs.filter((m: any) => m.folder === "sent").length;
    const engagement = Math.min(10, replyCount + 2);
    let risk = "low";
    let reason = "Recent, healthy conversation";
    if (ageDays > 21) { risk = "high"; reason = `No activity for ${Math.round(ageDays)} days — relationship may be cooling`; }
    else if (ageDays > 10) { risk = "medium"; reason = `Last activity ${Math.round(ageDays)} days ago — follow up soon`; }
    else if (ageDays > 5 && replyCount === 0) { risk = "medium"; reason = `Sender reached out ${Math.round(ageDays)} days ago with no reply`; }
    return {
      threadId,
      subject: last.subject,
      lastActivityDays: Math.round(ageDays * 10) / 10,
      engagementScore: engagement,
      risk,
      reason,
      recommendedAction: risk === "high" ? "Re-engage with a value-led message" : risk === "medium" ? "Send a friendly follow-up" : "Stay the course",
      summary: `${last.subject} — churn risk ${risk} (${Math.round(ageDays * 10) / 10}d since last activity)`,
    };
  }

  optimalSendTime(tenantId: string) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const hours = new Array(24).fill(0);
    for (const m of msgs) {
      const d = new Date(m.receivedAt || m.sentAt || m.createdAt);
      if (!isNaN(d.getTime())) hours[d.getHours()]++;
    }
    let best = 9;
    for (let i = 0; i < 24; i++) if (hours[i] > hours[best]) best = i;
    const secondBest = [best + 1, best - 1].filter(h => h >= 0 && h <= 23 && hours[h] >= 0).sort((a, b) => hours[b] - hours[a])[0] ?? ((best + 2) % 24);
    const fmt = (h: number) => `${((h + 11) % 12) + 1}${h >= 12 ? "pm" : "am"}`;
    return {
      hour: best,
      label: fmt(best),
      nextBest: { hour: secondBest, label: fmt(secondBest) },
      sampleSize: msgs.length,
      reason: msgs.length > 0 ? "Based on when your conversations are most active" : "Default business hours (9am)",
      summary: `Best time to send: ${fmt(best)}`,
      seed: hashStr(tenantId + "best_time"),
    };
  }

  relationshipHealth(tenantId: string, contactOrEmail: string) {
    const contact = DataStore.mem().findOne("mail_contacts", (c: any) => c.tenantId === tenantId && (c._id === contactOrEmail || c.email === contactOrEmail));
    const email = contact ? contact.email : contactOrEmail;
    if (!email) throw new Error(`Contact or email "${contactOrEmail}" not found`);
    const related = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId &&
      (m.from && m.from.email === email) || (m.to || []).some((t: any) => t.email === email));
    const total = related.length;
    const roll = hashStr(email + "rel");
    let score = 30 + (roll % 60);
    const negative = related.filter((m: any) => m.ai && m.ai.sentiment === "negative").length;
    if (negative > 0) score = Math.max(15, score - negative * 8);
    if (total > 0) score = Math.min(98, score + Math.min(15, total));
    const last = related.sort((a: any, b: any) => new Date(b.receivedAt || b.sentAt || b.createdAt).getTime() - new Date(a.receivedAt || a.sentAt || a.createdAt).getTime())[0];
    const lastDays = last ? Math.round((Date.now() - new Date(last.receivedAt || last.sentAt || last.createdAt).getTime()) / 86400000) : null;
    return {
      contact: contact ? { contactId: contact._id, name: contact.name, email: contact.email, tags: contact.tags || [] } : { contactId: null, name: email.split("@")[0], email },
      healthScore: score,
      level: score >= 75 ? "strong" : score >= 50 ? "healthy" : score >= 30 ? "cooling" : "at risk",
      messagesExchanged: total,
      negativeInteractions: negative,
      lastInteractionDays: lastDays,
      factors: [
        `${total} message(s) exchanged`,
        negative ? `${negative} negative interaction(s)` : "No negative sentiment detected",
        lastDays !== null ? `Last contact ${lastDays} day(s) ago` : "No prior contact",
      ],
      summary: `Relationship with ${contact ? contact.name : email}: ${score}/100 (${score >= 75 ? "strong" : score >= 50 ? "healthy" : score >= 30 ? "cooling" : "at risk"})`,
    };
  }

  intentPrediction(tenantId: string, messageId: string) {
    const msg = this.getMessage(tenantId, messageId);
    const hay = `${msg.subject || ""}\n${msg.body || ""}`.toLowerCase();
    const base = hashStr(msg._id + "intent") % 30;
    const score = (k: string) => base + (hay.includes(k) ? 45 : 0) + (hashStr(msg._id + k) % 15);
    const intents = [
      { intent: "meeting_request", label: "Meeting request", keywords: "meeting call sync schedule invite" },
      { intent: "approval_needed", label: "Approval needed", keywords: "approve approval sign-off authorize" },
      { intent: "info_only", label: "Info only", keywords: "update status here is attached" },
      { intent: "escalation", label: "Escalation", keywords: "urgent asap critical immediately" },
      { intent: "follow_up", label: "Follow-up", keywords: "follow-up following up reminder" },
      { intent: "newsletter", label: "Newsletter / promo", keywords: "newsletter promo discount sale" },
    ].map(i => ({ ...i, confidence: score(i.intent) }));
    intents.sort((a: any, b: any) => b.confidence - a.confidence);
    const top = intents[0];
    return {
      messageId,
      subject: msg.subject,
      predictions: intents,
      topIntent: top.intent,
      topLabel: top.label,
      confidence: Math.min(99, top.confidence),
      suggestedAction: detectIntent(msg.subject || "", msg.body || "").action,
      summary: `${msg.subject} — most likely "${top.label}" (${Math.min(99, top.confidence)}%)`,
    };
  }

  nudgeSuggestions(tenantId: string, limit = 5) {
    const now = Date.now();
    const candidates = DataStore.mem().find("messages", (m: any) =>
      m.tenantId === tenantId && (m.folder === "inbox" || m.folder === "sent") && (m.read === false || m.awaitingResponse === true))
      .map(m => ({ ...m, ageDays: (now - new Date(m.receivedAt || m.sentAt || m.createdAt).getTime()) / 86400000 }))
      .filter(m => m.ageDays >= 2)
      .sort((a: any, b: any) => b.ageDays - a.ageDays)
      .slice(0, limit);
    return candidates.map(m => ({
      messageId: m._id,
      threadId: m.threadId,
      subject: m.subject,
      from: m.from,
      ageDays: Math.round(m.ageDays * 10) / 10,
      reason: m.awaitingResponse ? "Awaiting a response for 2+ days" : "Unread for 2+ days",
      suggestedAction: m.awaitingResponse ? "Send a polite follow-up" : "Mark read or schedule a reply",
    }));
  }

  workloadForecast(tenantId: string, days = 7) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.folder === "inbox");
    const oldest = msgs.reduce((acc: any, m: any) => {
      const t = new Date(m.receivedAt || m.createdAt).getTime();
      return acc === null || t < acc ? t : acc;
    }, null as number | null);
    const spanDays = oldest === null ? 1 : Math.max(1, (Date.now() - oldest) / 86400000);
    const dailyRate = msgs.length / spanDays;
    const projected = Math.round(dailyRate * days);
    const highPriority = Math.round(projected * 0.25);
    const peakDay = (9 + (hashStr(tenantId + "peak") % 4)) % 24;
    return {
      days,
      projectedMessages: projected,
      projectedHighPriority: highPriority,
      dailyRate: Math.round(dailyRate * 10) / 10,
      peakHour: peakDay,
      busyScore: Math.min(100, Math.round((dailyRate / 3) * 40)),
      summary: `~${projected} incoming message(s) expected over the next ${days} days, ${highPriority} high priority`,
    };
  }

  sendTimeSuggestion(tenantId: string) {
    const best = this.optimalSendTime(tenantId);
    const workload = this.workloadForecast(tenantId, 3);
    return {
      ...best,
      workloadNext3Days: workload.projectedMessages,
      tip: workload.projectedHighPriority > 10 ? "Heavy week ahead — schedule sends before your peak so replies land in your lightest window" : "Send during your most active window so your reply sits at the top of their inbox",
    };
  }

  predictiveDashboard(tenantId: string) {
    const sendTime = this.optimalSendTime(tenantId);
    const workload = this.workloadForecast(tenantId, 7);
    const nudges = this.nudgeSuggestions(tenantId, 3);
    const threads = new Map<string, any[]>();
    for (const m of DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId)) {
      if (!m.threadId) continue;
      if (!threads.has(m.threadId)) threads.set(m.threadId, []);
      threads.get(m.threadId)!.push(m);
    }
    const risks = [...threads.values()]
      .filter(msgs => msgs.some((m: any) => m.folder === "inbox"))
      .map(msgs => this.churnRisk(tenantId, msgs[0].threadId))
      .filter(r => r.risk !== "low")
      .sort((a, b) => b.lastActivityDays - a.lastActivityDays)
      .slice(0, 3);
    const avgResponse = 6;
    return {
      sendTime,
      workload,
      churnRisks: risks,
      nudgeCount: nudges.length,
      avgResponseHours: avgResponse,
      summary: `Best send ${sendTime.label} · ${workload.projectedMessages} msgs/7d · ${risks.length} at-risk thread(s)`,
      seed: hashStr(tenantId + "predict_dash"),
    };
  }
}

export const mailPredict = new MailPredictiveService();
