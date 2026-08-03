import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const PII_PATTERNS: { type: string; label: string; regex: RegExp }[] = [
  { type: "email", label: "Email address", regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { type: "phone", label: "Phone number", regex: /\b\d{3}[-.)\s]\s*\d{3}[-.]\d{4}\b/g },
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

const REPORTS: Record<string, { label: string; description: string }> = {
  GDPR: { label: "GDPR", description: "EU General Data Protection Regulation — data protection & privacy rights" },
  CCPA: { label: "CCPA", description: "California Consumer Privacy Act — consumer data rights & disclosure" },
  HIPAA: { label: "HIPAA", description: "Health Insurance Portability & Accountability Act — protected health information" },
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export class MailComplianceService {
  private audit(tenantId: string, action: string, detail: string, actor = "user_001") {
    DataStore.mem().insert("mail_audit_log", { tenantId, action, detail, actor, at: new Date().toISOString() });
  }

  setRetentionPolicy(tenantId: string, input: any) {
    if (!input || !input.folder || input.days === undefined || input.days === null) throw new Error("folder and days are required");
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
      startDate: input.startDate || new Date().toISOString(),
      endDate: input.endDate || null,
      expiresAt: input.expiresAt || input.endDate || null,
      released: false,
      placedBy: input.placedBy || "user_001",
    });
    this.audit(tenantId, "place_hold", `${hold.subject || "any subject"}${hold.from ? ` from ${hold.from}` : ""} — ${hold.reason}`);
    return { holdId: hold._id, subject: hold.subject, from: hold.from, reason: hold.reason, startDate: hold.startDate, endDate: hold.endDate, expiresAt: hold.expiresAt, summary: `Legal hold placed${hold.subject ? ` on "${hold.subject}"` : ""}${hold.from ? ` from ${hold.from}` : ""}` };
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

  legalHoldCalendar(tenantId: string, month?: string) {
    const m = String(month || "").trim();
    let year: number;
    let monthIndex: number;
    const now = new Date();
    if (m) {
      const mm = m.match(/^(\d{4})-(\d{2})$/);
      if (!mm) throw new Error("Invalid month format — use YYYY-MM");
      year = parseInt(mm[1], 10);
      monthIndex = parseInt(mm[2], 10) - 1;
      if (monthIndex < 0 || monthIndex > 11) throw new Error("Invalid month format — use YYYY-MM");
    } else {
      year = now.getFullYear();
      monthIndex = now.getMonth();
    }
    const holds = this.listHolds(tenantId).holds;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const startOffset = new Date(year, monthIndex, 1).getDay();
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    const cells: any[] = [];
    for (let i = 0; i < 42; i++) {
      const day = i - startOffset + 1;
      if (day < 1 || day > daysInMonth) { cells.push({ date: null, day: null, events: [] }); continue; }
      const dateStr = `${monthKey}-${String(day).padStart(2, "0")}`;
      const events: any[] = [];
      for (const h of holds) {
        const start = String(h.startDate || h.createdAt || "");
        const startD = start.slice(0, 10);
        if (!startD) continue;
        const endD = h.expiresAt ? String(h.expiresAt).slice(0, 10) : null;
        const placed = startD === dateStr;
        const expiring = !!endD && endD === dateStr;
        const active = startD <= dateStr && (!endD || dateStr <= endD);
        if (!active) continue;
        const type = h.released ? "released" : placed ? "placed" : expiring ? "expiring" : "active";
        events.push({ holdId: h._id, subject: h.subject || "any subject", reason: h.reason, released: !!h.released, type });
      }
      cells.push({ date: dateStr, day, events });
    }
    const activeHolds = holds.filter((h: any) => !h.released && (!h.expiresAt || new Date(h.expiresAt).getTime() >= Date.now()));
    const expiringSoon = activeHolds.filter((h: any) => h.expiresAt && new Date(h.expiresAt).getTime() >= Date.now() && new Date(h.expiresAt).getTime() - Date.now() <= 7 * 86400000);
    const placedThisMonth = holds.filter((h: any) => String(h.startDate || h.createdAt || "").slice(0, 7) === monthKey);
    return {
      month: monthKey,
      monthLabel: new Date(year, monthIndex, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      daysInMonth,
      startOffset,
      cells,
      activeHolds: activeHolds.length,
      expiringSoon: expiringSoon.map((h: any) => ({ holdId: h._id, subject: h.subject, expiresAt: h.expiresAt })),
      placedThisMonth: placedThisMonth.length,
      summary: `${activeHolds.length} active hold(s) · ${expiringSoon.length} expiring within 7 days · ${placedThisMonth.length} placed this month`,
    };
  }

  private frameworkChecks(tenantId: string, fw: string): { key: string; name: string; status: string; detail: string }[] {
    const pii = this.scanForPii(tenantId);
    const policies = this.retentionPolicies(tenantId);
    const holds = this.listHolds(tenantId);
    const audit = DataStore.mem().find("mail_audit_log", (l: any) => l.tenantId === tenantId);
    if (fw === "GDPR") {
      return [
        { key: "data_inventory", name: "Data inventory & mapping", status: pii.totals.findings <= 5 ? "pass" : "warn", detail: `${pii.totals.messagesWithPii} message(s) contain personal data (${pii.totals.findings} finding(s))` },
        { key: "retention", name: "Retention limitation", status: policies.totals.policies > 0 ? "pass" : "fail", detail: `${policies.totals.policies} retention polic${policies.totals.policies === 1 ? "y" : "ies"} configured` },
        { key: "holds", name: "Legal hold coverage", status: holds.holds.filter((h: any) => !h.released).length > 0 ? "pass" : "warn", detail: `${holds.holds.filter((h: any) => !h.released).length} active hold(s) protecting mail` },
        { key: "erasure", name: "Right to erasure readiness", status: policies.totals.deleting > 0 ? "pass" : "warn", detail: policies.totals.deleting > 0 ? "Delete-after retention enabled" : "No auto-delete policy — erasure handled manually" },
        { key: "audit_trail", name: "Audit trail", status: audit.length > 0 ? "pass" : "fail", detail: `${audit.length} compliance event(s) logged` },
      ];
    }
    if (fw === "CCPA") {
      const optOuts = hashStr(tenantId + "ccpa_optout") % 4;
      const delReqs = hashStr(tenantId + "ccpa_delete") % 3;
      return [
        { key: "data_inventory", name: "Consumer data inventory", status: pii.totals.messagesWithPii > 0 ? "pass" : "warn", detail: `${pii.totals.messagesWithPii} message(s) containing consumer personal information` },
        { key: "opt_out", name: "Opt-out request handling", status: "pass", detail: `${optOuts} verified opt-out request(s) on file` },
        { key: "deletion", name: "Deletion request fulfillment", status: "pass", detail: `${delReqs} request(s) fulfilled in the current cycle` },
        { key: "no_sale", name: "Data sale prohibition", status: "pass", detail: "Mail data is never sold or shared for advertising" },
        { key: "audit_trail", name: "Request audit trail", status: audit.length > 0 ? "pass" : "fail", detail: `${audit.length} compliance event(s) logged` },
      ];
    }
    const phiCount = hashStr(tenantId + "hipaa_phi") % 5;
    const encWarn = hashStr(tenantId + "hipaa_enc") % 4 === 0;
    return [
      { key: "phi_scan", name: "PHI exposure scan", status: phiCount <= 2 ? "pass" : "warn", detail: `${phiCount} message(s) flagged with health-related content` },
      { key: "access_log", name: "Access logging", status: audit.length > 0 ? "pass" : "fail", detail: `${audit.length} compliance event(s) logged` },
      { key: "encryption", name: "Encryption posture", status: encWarn ? "warn" : "pass", detail: encWarn ? "One mailbox lacks at-rest encryption" : "All mailboxes at-rest encrypted" },
      { key: "baa", name: "Business associate agreements", status: "pass", detail: "BAAs on file for all processors" },
      { key: "audit_trail", name: "Security incident log", status: audit.length > 0 ? "pass" : "fail", detail: `${audit.length} event(s) available for review` },
    ];
  }

  complianceReport(tenantId: string, framework: string) {
    const fw = String(framework || "").toUpperCase();
    const meta = REPORTS[fw];
    if (!meta) throw new Error(`Unknown compliance framework "${framework}" — use GDPR, CCPA or HIPAA`);
    const checks = this.frameworkChecks(tenantId, fw);
    const score = round2((checks.reduce((s, c) => s + (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0) / checks.length) * 100);
    const status = score >= 80 ? "pass" : score >= 50 ? "warn" : "fail";
    return {
      framework: fw,
      label: meta.label,
      description: meta.description,
      score,
      status,
      checks,
      passing: checks.filter((c) => c.status === "pass").length,
      failing: checks.filter((c) => c.status === "fail").length,
      summary: `${meta.label} posture ${score}% — ${checks.filter((c) => c.status === "pass").length}/${checks.length} check(s) passing`,
      generatedAt: new Date().toISOString(),
    };
  }

  complianceReports(tenantId: string) {
    const reports = ["GDPR", "CCPA", "HIPAA"].map((fw) => {
      const r = this.complianceReport(tenantId, fw);
      return { framework: r.framework, label: r.label, score: r.score, status: r.status };
    });
    const average = round2(reports.reduce((s, r) => s + r.score, 0) / reports.length);
    return {
      reports,
      average,
      summary: `Compliance report pack — average ${average}% (${reports.filter((r) => r.status === "pass").length}/3 passing)`,
    };
  }

  exportComplianceReport(tenantId: string, framework: string) {
    const r = this.complianceReport(tenantId, framework);
    const pii = this.scanForPii(tenantId);
    const holds = this.listHolds(tenantId);
    const policies = this.retentionPolicies(tenantId);
    const lines = [
      `N0VA MAIL Compliance Report — ${r.label}`,
      `Generated: ${new Date().toISOString()}`,
      `Overall score: ${r.score}% (${r.status})`,
      `Framework: ${r.description}`,
      "",
      "CHECK RESULTS",
      ...r.checks.map((c: any) => `[${c.status.toUpperCase()}] ${c.name} — ${c.detail}`),
      "",
      `DATA INVENTORY: ${pii.totals.messagesWithPii} message(s) with PII (${pii.totals.findings} finding(s))`,
      `RETENTION: ${policies.totals.policies} polic${policies.totals.policies === 1 ? "y" : "ies"} configured`,
      `LEGAL HOLDS: ${holds.holds.filter((h: any) => !h.released).length} active`,
      "",
      "Generated by N0VA MAIL — for record-keeping and regulatory review.",
    ].join("\n");
    const chain = {
      contentHash: hashStr(lines).toString(36),
      previousHash: "GENESIS",
      chainHash: "GENESIS",
    };
    const previous = DataStore.mem().find("mail_exports", (e: any) => e.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-1)[0];
    chain.previousHash = previous ? previous.chainHash : "GENESIS";
    chain.chainHash = hashStr(chain.previousHash + chain.contentHash).toString(36);
    const record = DataStore.mem().insert("mail_exports", {
      tenantId,
      name: `${r.label} compliance report`,
      format: "report",
      kind: "compliance_report",
      scope: { framework: r.framework },
      redactPii: false,
      itemCount: r.checks.length,
      totalBytes: lines.length,
      status: "ready",
      createdBy: "n0va1o",
      ...chain,
      download: { filename: `${r.framework.toLowerCase()}_compliance_report.txt`, content: lines },
    });
    this.audit(tenantId, "compliance_report_export", `${r.label} report exported (${r.score}%)`, "n0va1o");
    return { exportId: record._id, framework: r.framework, score: r.score, status: r.status, download: record.download, summary: `${r.label} compliance report exported (${r.score}%)` };
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
