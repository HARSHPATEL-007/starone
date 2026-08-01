import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const PII_PATTERNS: { type: string; label: string; regex: RegExp }[] = [
  { type: "email", label: "Email address", regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { type: "phone", label: "Phone number", regex: /\b\d{3}[-.)\s]\d{3}[-.]\d{4}\b/g },
  { type: "ssn", label: "Social security number", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: "credit_card", label: "Credit card number", regex: /\b(?:\d[ -]*?){13,16}\b/g },
];

function holdMatches(hold: any, msg: any): boolean {
  if (hold.released) return false;
  if (hold.expiresAt && new Date(hold.expiresAt).getTime() < Date.now()) return false;
  if (hold.subject && !(msg.subject || "").toLowerCase().includes(String(hold.subject).toLowerCase())) return false;
  if (hold.from && !`${(msg.from || {}).email} ${(msg.from || {}).name}`.toLowerCase().includes(String(hold.from).toLowerCase())) return false;
  return true;
}

export class MailComplianceService {
  private audit(tenantId: string, action: string, detail: string, actor = "user_001") {
    DataStore.mem().insert("mail_audit_log", { tenantId, action, detail, actor, at: new Date().toISOString() });
  }

  setRetentionPolicy(tenantId: string, input: any) {
    if (!input || !input.folder || !input.days) throw new Error("folder and days are required");
    const days = parseInt(String(input.days), 10);
    if (!(days > 0)) throw new Error("days must be a positive number");
    const action = input.action === "delete" ? "delete" : "archive";
    const existing = DataStore.mem().findOne("mail_retention", (p: any) => p.tenantId === tenantId && p.folder === input.folder);
    let policy: any;
    if (existing) {
      policy = DataStore.mem().update("mail_retention", (p: any) => p._id === existing._id, { days, action });
      this.audit(tenantId, "update_retention_policy", `${input.folder}: ${days} days (${action})`);
    } else {
      policy = DataStore.mem().insert("mail_retention", { tenantId, folder: input.folder, days, action });
      this.audit(tenantId, "set_retention_policy", `${input.folder}: ${days} days (${action})`);
    }
    return { policyId: policy._id, folder: policy.folder, days: policy.days, action: policy.action, summary: `Retention policy: ${policy.folder} kept ${days} day(s) (${action} after)` };
  }

  retentionPolicies(tenantId: string) {
    const policies = DataStore.mem().find("mail_retention", (p: any) => p.tenantId === tenantId);
    return {
      policies,
      totals: { policies: policies.length, deleting: policies.filter(p => p.action === "delete").length },
      summary: `${policies.length} retention polic${policies.length === 1 ? "y" : "ies"} configured`,
    };
  }

  deleteRetentionPolicy(tenantId: string, policyId: string) {
    const policy = DataStore.mem().findOne("mail_retention", (p: any) => p._id === policyId && p.tenantId === tenantId);
    if (!policy) throw new Error(`Retention policy "${policyId}" not found`);
    DataStore.mem().delete("mail_retention", (p: any) => p._id === policyId && p.tenantId === tenantId);
    this.audit(tenantId, "delete_retention_policy", `${policy.folder} policy removed`);
    return { policyId, summary: `Retention policy for "${policy.folder}" deleted` };
  }

  applyRetention(tenantId: string) {
    const policies = DataStore.mem().find("mail_retention", (p: any) => p.tenantId === tenantId);
    const holds = this.listHolds(tenantId).holds;
    const now = Date.now();
    let swept = 0;
    let archived = 0;
    let deleted = 0;
    let skippedHeld = 0;
    const affected: string[] = [];
    for (const policy of policies) {
      const cutoff = now - policy.days * 86400000;
      const candidates = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.folder === policy.folder && new Date(m.receivedAt).getTime() < cutoff);
      for (const msg of candidates) {
        if (holds.some(h => holdMatches(h, msg))) { skippedHeld++; continue; }
        if (policy.action === "delete") {
          DataStore.mem().delete("messages", (m: any) => m._id === msg._id);
          deleted++;
          affected.push(`deleted "${msg.subject}"`);
        } else {
          DataStore.mem().update("messages", (m: any) => m._id === msg._id, { folder: "archive", labels: [...(msg.labels || []).filter((l: string) => l !== policy.folder), "Archive"] });
          archived++;
          affected.push(`archived "${msg.subject}"`);
        }
        swept++;
      }
    }
    this.audit(tenantId, "retention_sweep", `${swept} message(s) processed (${archived} archived, ${deleted} deleted, ${skippedHeld} held)`, "n0va1o");
    return {
      swept,
      archived,
      deleted,
      skippedHeld,
      affected: affected.slice(0, 10),
      summary: `Retention sweep: ${swept} message(s) processed — ${archived} archived, ${deleted} deleted, ${skippedHeld} protected by holds`,
    };
  }

  placeHold(tenantId: string, input: any) {
    if (!input || !input.reason) throw new Error("A reason is required to place a hold");
    if (!input.subject && !input.from) throw new Error("Provide subject or from to scope the hold");
    const hold = DataStore.mem().insert("mail_holds", {
      tenantId,
      subject: input.subject || null,
      from: input.from || null,
      reason: input.reason,
      expiresAt: input.expiresAt || null,
      released: false,
      placedBy: input.placedBy || "user_001",
    });
    this.audit(tenantId, "place_hold", `${hold.subject || "any subject"}${hold.from ? ` from ${hold.from}` : ""} — ${hold.reason}`);
    return { holdId: hold._id, subject: hold.subject, from: hold.from, reason: hold.reason, expiresAt: hold.expiresAt, summary: `Legal hold placed${hold.subject ? ` on "${hold.subject}"` : ""}${hold.from ? ` from ${hold.from}` : ""}` };
  }

  listHolds(tenantId: string) {
    const holds = DataStore.mem().find("mail_holds", (h: any) => h.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { holds, summary: `${holds.filter(h => !h.released).length} active hold(s)` };
  }

  releaseHold(tenantId: string, holdId: string) {
    const hold = DataStore.mem().findOne("mail_holds", (h: any) => h._id === holdId && h.tenantId === tenantId);
    if (!hold) throw new Error(`Hold "${holdId}" not found`);
    DataStore.mem().update("mail_holds", (h: any) => h._id === holdId, { released: true, releasedAt: new Date().toISOString() });
    this.audit(tenantId, "release_hold", `${hold.subject || "any subject"}${hold.from ? ` from ${hold.from}` : ""}`);
    return { holdId, summary: `Hold on "${hold.subject || "messages"}" released` };
  }

  holdStatus(tenantId: string) {
    const holds = this.listHolds(tenantId).holds;
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    return {
      holds: holds.map(h => {
        const matched = msgs.filter(m => holdMatches(h, m));
        return { holdId: h._id, subject: h.subject, from: h.from, reason: h.reason, expiresAt: h.expiresAt, released: h.released, protectedMessages: matched.length };
      }),
      protectedMessages: msgs.filter(m => holds.some(h => holdMatches(h, m))).length,
      summary: `${holds.filter(h => !h.released).length} hold(s) protecting mail from deletion`,
    };
  }

  auditLog(tenantId: string, limit = 30) {
    const log = DataStore.mem().find("mail_audit_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, limit);
    return { log, total: log.length, summary: `${log.length} compliance event(s) logged` };
  }

  scanForPii(tenantId: string) {
    const msgs = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const findings: any[] = [];
    const typeTotals: Record<string, number> = {};
    let messagesWithPii = 0;
    for (const msg of msgs) {
      const haystack = `${msg.subject || ""} ${msg.body || ""}`;
      const types: string[] = [];
      let count = 0;
      for (const pattern of PII_PATTERNS) {
        const matches = haystack.match(pattern.regex) || [];
        if (matches.length > 0) {
          types.push(pattern.type);
          count += matches.length;
          typeTotals[pattern.type] = (typeTotals[pattern.type] || 0) + matches.length;
        }
      }
      if (count > 0) {
        messagesWithPii++;
        findings.push({ messageId: msg._id, subject: msg.subject, from: (msg.from || {}).email, types, count });
      }
    }
    this.audit(tenantId, "scan_for_pii", `${messagesWithPii} message(s) with PII (${findings.length} finding(s))`, "n0va1o");
    const totalFindings = findings.reduce((s, f) => s + f.count, 0);
    return {
      findings,
      totals: {
        messagesScanned: msgs.length,
        messagesWithPii,
        findings: totalFindings,
        byType: PII_PATTERNS.map(p => ({ type: p.type, label: p.label, count: typeTotals[p.type] || 0 })).filter(t => t.count > 0),
      },
      riskLevel: totalFindings > 10 ? "high" : totalFindings > 0 ? "medium" : "low",
      summary: `Scanned ${msgs.length} message(s) — ${messagesWithPii} with sensitive data (${totalFindings} finding(s))`,
    };
  }

  complianceSummary(tenantId: string) {
    const policies = this.retentionPolicies(tenantId);
    const holds = this.listHolds(tenantId);
    const audit = DataStore.mem().find("mail_audit_log", (l: any) => l.tenantId === tenantId);
    const pii = this.scanForPii(tenantId);
    const recommendations: string[] = [];
    if (policies.totals.policies === 0) recommendations.push("Set a retention policy for inbox mail to stay GDPR-compliant");
    if (holds.holds.filter(h => !h.released).length === 0) recommendations.push("No legal holds active — fine for routine mail, place one before any litigation hold");
    if (pii.totals.messagesWithPii > 0) recommendations.push(`${pii.totals.messagesWithPii} message(s) contain PII — consider redaction rules or DLP alerts`);
    if (recommendations.length === 0) recommendations.push("Compliance posture is healthy — no action needed");
    return {
      policies,
      holds: holds.holds,
      activeHolds: holds.holds.filter(h => !h.released).length,
      auditEvents: audit.length,
      lastSweep: audit.filter(a => a.action === "retention_sweep").sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())[0]?.at || null,
      pii: { messagesWithPii: pii.totals.messagesWithPii, findings: pii.totals.findings, riskLevel: pii.totals.findings > 0 ? "medium" : "low" },
      recommendations,
      summary: `${policies.totals.policies} retention polic${policies.totals.policies === 1 ? "y" : "ies"}, ${holds.holds.filter(h => !h.released).length} active hold(s), ${audit.length} audit event(s)`,
      seed: hashStr(tenantId + "compliance_seed"),
    };
  }
}

export const mailCompliance = new MailComplianceService();
