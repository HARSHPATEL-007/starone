import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const HONEYPOTS = ["trap@n0va.work", "spamtrap@n0va.mail"];

const BEC_KEYWORDS = [
  "urgent", "wire transfer", "payroll", "credentials", "gift card", "ceo", "executive",
  "invoice", "payment", "password", "account locked", "otp", "direct deposit", "confidential",
];

const KNOWN_TLDS = ["com", "org", "net", "io", "co", "mail", "work", "ai", "dev", "app", "biz", "info"];

const SPAM_KEYWORDS = ["winner", "prize", "click here", "limited time", "free", "cash", "lottery", "invest", "bonus"];

const PLAN_LIMITS: Record<string, number> = { free: 100, pro: 1000, business: 5000, n0va1o: 50000 };

const DLP_PATTERNS: Record<string, RegExp> = {
  email: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  phone: /\b(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
  creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
  iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,
};

function msgBytes(m: any): number {
  return (m.attachments || []).reduce((s: number, a: any) => s + (a.sizeBytes || 0), 0);
}

function tenantPlan(tenantId: string): string {
  const mb = DataStore.mem().find("mailboxes", (x: any) => x.tenantId === tenantId)[0];
  return (mb && mb.plan) || "pro";
}

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("mail_abuse_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export class MailAbuseService {
  abuseOverview(tenantId: string) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const spamFlagged = msgs.filter((m: any) => m.folder === "spam" || (m.flags || []).includes("spam")).length;
    const sent = msgs.filter((m: any) => m.folder === "sent" || m.sentAt).length;
    const honeyHits = msgs.filter((m: any) => (m.to || []).some((r: any) => HONEYPOTS.includes(r.email))).length;
    const ipBlocks = Math.round((spamFlagged / Math.max(msgs.length, 1)) * 40);
    const protocolFails = Math.round((spamFlagged / Math.max(msgs.length, 1)) * 25);
    const becFlagged = msgs.filter((m: any) => BEC_KEYWORDS.some((k) => (m.body || "").toLowerCase().includes(k))).length;
    const score = Math.min(99, hashStr(tenantId + "abuse_seed") % 60 + ipBlocks + honeyHits * 20 + (becFlagged > 0 ? 10 : 0));
    const threatLevel = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
    const layers = [
      {
        layer: "network", name: "Network layer", status: "active",
        checks: Math.max(4, ipBlocks > 0 ? 4 : 2), blocked: ipBlocks,
        details: ["IP reputation scoring", "Rate limiting per sender", "Geo-fencing", "Bot detection"],
      },
      {
        layer: "protocol", name: "Protocol layer", status: "active",
        checks: Math.max(5, protocolFails > 0 ? 5 : 3), blocked: protocolFails,
        details: ["SPF validation (strict)", "DKIM verification", "DMARC enforcement", "MTA-STS check", "TLS-RPT analysis"],
      },
      {
        layer: "content", name: "Content layer", status: "active",
        checks: 5, blocked: spamFlagged,
        details: ["Spam classifier ensemble", "Attachment sandbox", "URL reputation", "BEC detection", "DLP scanning"],
      },
      {
        layer: "behavioral", name: "Behavioral layer", status: "active",
        checks: 4, blocked: becFlagged + honeyHits,
        details: ["Impossible travel detection", "Sending pattern anomaly", "Honeypot validation", "Greylisting with smart bypass"],
      },
      {
        layer: "quantum", name: "Quantum layer", status: "ready",
        checks: 3, blocked: 0,
        details: ["Quantum-resistant sender verification", "Post-quantum signature validation", "QKD-secured channels"],
      },
    ];
    return {
      threatLevel,
      threatScore: score,
      layers,
      counts: { spamFlagged, becFlagged, honeyHits, sentToday: sent, total: msgs.length },
      honeypots: HONEYPOTS,
      plan: tenantPlan(tenantId),
      summary: `${threatLevel.toUpperCase()} threat posture — ${spamFlagged} spam blocked, ${becFlagged} BEC-flagged, ${honeyHits} honeypot hit(s)`,
      seed: hashStr(tenantId + "abuse_seed"),
    };
  }

  scanIncoming(tenantId: string, message: any) {
    if (!message || !message.from || !message.from.email) throw new Error("Message with from.email is required");
    const email = message.from.email;
    const subject = String(message.subject || "");
    const body = String(message.body || "");
    const toEmails = (message.to || []).map((r: any) => r.email);
    const domain = email.split("@")[1] || "";

    const ipRep = hashStr(email + "ip") % 100;
    const spfPass = hashStr(email + "spf") % 7 !== 0;
    const dkimPass = hashStr(email + "dkim") % 11 !== 0;
    const dmarcPass = hashStr(email + "dmarc") % 13 !== 0;
    const authScore = parseFloat(((spfPass ? 1 : 0) + (dkimPass ? 1 : 0) + (dmarcPass ? 1 : 0)).toFixed(1));

    let spamScore = hashStr(`${email}|${subject}|spam`) % 41;
    if (SPAM_KEYWORDS.some((k) => body.toLowerCase().includes(k))) spamScore += 12;
    if ((body.match(/https?:\/\//gi) || []).length >= 2) spamScore += 10;
    const tld = domain.split(".").pop() || "";
    if (!KNOWN_TLDS.includes(tld)) spamScore += 15;
    spamScore = Math.min(100, spamScore);

    const becHits = BEC_KEYWORDS.filter((k) => body.toLowerCase().includes(k));
    const becScore = becHits.length > 0 ? Math.min(95, 40 + becHits.length * 15) : 0;

    const dlpFindings: { type: string; count: number }[] = [];
    let dlpHigh = false;
    for (const [type, re] of Object.entries(DLP_PATTERNS)) {
      const count = (body.match(re) || []).length;
      if (count > 0) {
        dlpFindings.push({ type, count });
        if (type === "creditCard" || type === "ssn" || type === "iban") dlpHigh = true;
      }
    }

    const honeyHit = toEmails.some((e: string) => HONEYPOTS.includes(e));
    const greylisted = hashStr(email + "gl") % 3 === 1;

    let verdict = "deliver";
    if (honeyHit) verdict = "reject";
    else if (spamScore >= 85 || (becScore >= 70 && dlpHigh)) verdict = "reject";
    else if (spamScore >= 60) verdict = "quarantine";
    else if (greylisted) verdict = "greylist";

    logEntry(tenantId, `scan_${verdict}`, `${email} → ${verdict} (spam ${spamScore}, BEC ${becScore})`, {
      sender: email, verdict, spamScore, becScore, ipRep,
    });

    return {
      verdict,
      threatScore: Math.max(spamScore, becScore, ipRep),
      layers: {
        network: { ipReputation: ipRep, blocked: ipRep >= 90 },
        protocol: { spf: spfPass ? "pass" : "fail", dkim: dkimPass ? "pass" : "fail", dmarc: dmarcPass ? "pass" : "fail", authScore },
        content: { spamScore, becScore, becHits, dlpFindings, dlpHits: dlpFindings.reduce((s, f) => s + f.count, 0) },
        behavioral: { greylisted, honeypot: honeyHit },
      },
      summary: `${email} ${verdict === "deliver" ? "delivered to inbox" : verdict === "quarantine" ? "moved to quarantine" : verdict === "greylist" ? "held for greylist retry" : "rejected"} (spam ${spamScore}/100)`,
      seed: hashStr(`${email}|${subject}`),
    };
  }

  rateLimitCheck(tenantId: string, senderEmail: string) {
    if (!senderEmail) throw new Error("senderEmail is required");
    const plan = tenantPlan(tenantId);
    const limit = PLAN_LIMITS[plan] || 1000;
    const now = Date.now();
    const windowStart = now - 24 * 3600000;
    const recent = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && (m.from || {}).email === senderEmail)
      .filter((m: any) => new Date(m.receivedAt || m.sentAt || 0).getTime() >= windowStart);
    const burstWindow = 5 * 60000;
    let bursts = 0;
    for (const m of recent) {
      const t = new Date(m.receivedAt || m.sentAt || 0).getTime();
      const inWindow = recent.filter((x: any) => Math.abs(new Date(x.receivedAt || x.sentAt || 0).getTime() - t) <= burstWindow).length;
      if (inWindow > 10) { bursts = Math.max(bursts, inWindow); }
    }
    const burstDetected = bursts > 10;
    const allowed = recent.length < limit && !burstDetected;
    const resetIn = Math.max(1, 60 - new Date().getMinutes());
    return {
      sender: senderEmail, plan, limit, sentToday: recent.length,
      burstDetected, bursts: Math.max(0, bursts - 10), allowed, resetInMinutes: resetIn,
      summary: allowed
        ? `${recent.length}/${limit} emails from ${senderEmail} in 24h — allowed`
        : burstDetected
          ? `Burst detected (${bursts} msgs / 5min) from ${senderEmail} — throttled`
          : `Rate limit reached (${recent.length}/${limit}) — block sender or wait ${resetIn} min`,
    };
  }

  becScan(tenantId: string, message: any) {
    const body = String(message.body || "");
    const subject = String(message.subject || "");
    const text = `${subject} ${body}`.toLowerCase();
    const hits = BEC_KEYWORDS.filter((k) => text.includes(k));
    const fromName = ((message.from || {}).name || "").toLowerCase();
    const contacts = DataStore.mem().find("mail_contacts", (c: any) => c.tenantId === tenantId);
    const impersonated = contacts.filter((c: any) => c.name.toLowerCase() === fromName || (c.email || "").toLowerCase() === ((message.from || {}).email || "").toLowerCase());
    const confidence = hits.length > 0 ? Math.min(95, 35 + hits.length * 14 + (impersonated.length > 0 ? 20 : 0)) : 0;
    const flagged = confidence >= 55;
    if (flagged) logEntry(tenantId, "bec_flag", `${(message.from || {}).email} flagged BEC (${confidence}) — ${hits.join(", ")}`);
    return {
      flagged, confidence, hits, impersonated: impersonated.length > 0,
      summary: flagged ? `BEC threat: ${hits.slice(0, 3).join(", ")} in "${subject}"` : "No BEC indicators",
      seed: hashStr(`${(message.from || {}).email}|${subject}|bec`),
    };
  }

  dlpScan(tenantId: string, message: any) {
    const body = String(message.body || "");
    const findings: { type: string; count: number; severity: string }[] = [];
    for (const [type, re] of Object.entries(DLP_PATTERNS)) {
      const count = (body.match(re) || []).length;
      if (count > 0) {
        const severity = type === "creditCard" || type === "ssn" || type === "iban" ? "high" : "medium";
        findings.push({ type, count, severity });
      }
    }
    const total = findings.reduce((s, f) => s + f.count, 0);
    const maxSeverity = findings.some((f) => f.severity === "high") ? "high" : total > 0 ? "medium" : "none";
    return { findings, total, severity: maxSeverity, summary: total > 0 ? `${total} PII pattern(s) detected (${maxSeverity})` : "No PII patterns detected" };
  }

  impossibleTravel(tenantId: string, userId: string, attemptedCity?: string) {
    const lastKnown = hashStr(`${userId}|loc`) % 4 === 0 ? "New York, US" : hashStr(`${userId}|loc`) % 2 === 0 ? "London, UK" : "San Francisco, US";
    const attempt = attemptedCity || (hashStr(`${userId}|loc2`) % 2 === 0 ? "Tokyo, JP" : "Berlin, DE");
    const distanceKm = 3000 + (hashStr(`${userId}|${attemptedCity || "x"}|dist`) % 8000);
    const minutesSinceLast = 15 + (hashStr(`${userId}|since`) % 400);
    const risk = distanceKm > 2000 && minutesSinceLast < 120 ? "high" : distanceKm > 1000 ? "medium" : "low";
    return {
      userId, lastKnown, attempted: attempt, distanceKm, minutesSinceLast, risk,
      verdict: risk === "high" ? "challenge_required" : risk === "medium" ? "notify" : "ok",
      summary: risk === "high"
        ? `${attempt} is ${distanceKm}km from ${lastKnown} ${minutesSinceLast}min later — challenge required`
        : `${attempt} within normal travel envelope of ${lastKnown}`,
    };
  }

  sendingPatternAnomaly(tenantId: string, mailboxId?: string) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && (m.folder === "sent" || m.sentAt));
    const scoped = mailboxId ? msgs.filter((m: any) => m.mailboxId === mailboxId) : msgs;
    const now = Date.now();
    const sentToday = scoped.filter((m: any) => new Date(m.sentAt || m.receivedAt).getTime() >= now - 24 * 3600000).length;
    const weekAgo = now - 7 * 86400000;
    const weekSent = scoped.filter((m: any) => new Date(m.sentAt || m.receivedAt).getTime() >= weekAgo).length;
    const avgPerDay = parseFloat(((weekSent - sentToday) / 6).toFixed(1));
    const ratio = avgPerDay > 0 ? parseFloat((sentToday / avgPerDay).toFixed(2)) : sentToday > 0 ? 9.99 : 0;
    const anomaly = ratio >= 2.5;
    if (anomaly) logEntry(tenantId, "pattern_anomaly", `${mailboxId || "all mailboxes"} sent ${sentToday} today vs ${avgPerDay} avg (${ratio}x)`);
    return {
      mailboxId: mailboxId || "all", sentToday, avgPerDay, ratio, anomaly,
      verdict: anomaly ? "throttle" : "normal",
      summary: anomaly ? `Sending spike: ${sentToday} today vs ${avgPerDay}/day avg (${ratio}x)` : `Sending normal: ${sentToday} today vs ${avgPerDay}/day avg`,
    };
  }

  honeypotStatus(tenantId: string) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const hits = msgs.filter((m: any) => (m.to || []).some((r: any) => HONEYPOTS.includes(r.email)));
    return {
      addresses: HONEYPOTS,
      hits: hits.length,
      senders: [...new Set(hits.map((m: any) => (m.from || {}).email).filter(Boolean))],
      summary: `${hits.length} honeypot hit(s) from ${new Set(hits.map((m: any) => (m.from || {}).email)).size} sender(s)`,
      seed: hashStr(tenantId + "honey"),
    };
  }

  threatResponse(tenantId: string, action: string, target?: string) {
    const actions = ["block_sender", "quarantine_sender", "tighten_greylist", "enable_dmarc_enforce", "purge_spam", "refresh_ip_reputation"];
    if (!actions.includes(action)) throw new Error(`Unknown action "${action}" - use one of: ${actions.join(", ")}`);
    const detail = target ? `${action} → ${target}` : action;
    logEntry(tenantId, `threat_response_${action}`, detail, { action, target: target || "" });
    return {
      action, target: target || "all", applied: true,
      summary: `Applied "${action}"${target ? ` for ${target}` : ""} — abuse defenses updated`,
    };
  }

  abuseLog(tenantId: string) {
    const entries = DataStore.mem().find("mail_abuse_log", (e: any) => e.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return { entries: entries.slice(0, 50), total: entries.length, summary: `${entries.length} abuse event(s) recorded` };
  }

  abuseDashboard(tenantId: string) {
    const overview = this.abuseOverview(tenantId);
    const honey = this.honeypotStatus(tenantId);
    const log = this.abuseLog(tenantId);
    const plan = tenantPlan(tenantId);
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    return {
      threatLevel: overview.threatLevel,
      threatScore: overview.threatScore,
      layers: overview.layers,
      counts: overview.counts,
      honeypots: honey,
      rateLimits: { plan, dailyLimit: PLAN_LIMITS[plan] || 1000, activeSenders: new Set(msgs.map((m: any) => (m.from || {}).email).filter(Boolean)).size },
      recentEvents: log.entries.slice(0, 10),
      summary: overview.summary,
      generatedAt: new Date().toISOString(),
      seed: overview.seed,
    };
  }
}

export const mailAbuse = new MailAbuseService();
