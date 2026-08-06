import { chatRealtime } from "./ChatRealtimeService";
import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const COMPLIANCE_POLICIES = [
  { policy_name: "Data Retention", description: "Define retention periods for messages, files, and metadata", config: { messages: "90d", files: "365d", metadata: "730d", archive: "7y" } },
  { policy_name: "Content Moderation", description: "Block sensitive categories and auto-sanitize", config: { block: ["sensitive_phrases", "credit_card_numbers", "ssn"], sanitize: true, allowlist: [] } },
  { policy_name: "IP Protection", description: "Block company confidential keywords and IP", config: { keywords: ["confidential", "internal-only", "proprietary"], action: "block" } },
  { policy_name: "Access Controls", description: "Role-based access, allowlists, and sandbox zones", config: { role_based: true, allowlist: [], sandbox_zones: ["dm", "group_dm"] } },
  { policy_name: "Audit Trail", description: "Immutable audit logs with hashes and export", config: { immutable: true, hash_chain: true, export: "csv" } },
  { policy_name: "AI Safety", description: "Regulate AI features and personas", config: { ai_features: true, persona_controls: ["ani"], llm_provider: "none" } },
  { policy_name: "Legal Hold", description: "Place holds on conversations and enforce DLP", config: { held_rooms: [], dlp_rules: true } },
  { policy_name: "Data Privacy", description: "Minimize collection, encryption, GDPR export/delete", config: { minimization: true, encryption: "aes-256", gdpr: { export: true, delete: true } } },
];

const BLOCKED_SENSITIVE = /(\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b|\b\d{3}-?\d{2}-?\d{4}\b)/;

export class ChatComplianceService {
  private get(tenantId: string, policyId: string): any {
    const p = DataStore.mem().findOne("chat_compliance_policies", (x: any) => x.policyId === policyId && x.tenantId === tenantId);
    if (!p) throw new Error(`Policy "${policyId}" not found`);
    return p;
  }

  ensureSeed(tenantId: string) {
    for (const tpl of COMPLIANCE_POLICIES) {
      const policyId = `pol_${hashStr(tenantId + tpl.policy_name)}`;
      if (!DataStore.mem().findOne("chat_compliance_policies", (x: any) => x.policyId === policyId && x.tenantId === tenantId)) {
        DataStore.mem().insert("chat_compliance_policies", {
          tenantId,
          policyId,
          policy_name: tpl.policy_name,
          description: tpl.description,
          config: tpl.config,
          enabled: true,
          from_template: true,
          created_at: new Date().toISOString(),
        });
      }
    }
    return { seeded: COMPLIANCE_POLICIES.length };
  }

  listPolicies(tenantId: string) {
    this.ensureSeed(tenantId);
    const rows = DataStore.mem().find("chat_compliance_policies", (x: any) => x.tenantId === tenantId);
    return { policies: rows, total: rows.length, summary: `${rows.length} compliance policy(s)` };
  }

  getPolicy(tenantId: string, policyId: string) {
    return this.get(tenantId, policyId);
  }

  updatePolicy(tenantId: string, policyId: string, patch: any) {
    this.get(tenantId, policyId);
    const updates: Record<string, any> = {};
    for (const k of ["config", "enabled", "description"]) {
      if (patch && patch[k] !== undefined) updates[k] = patch[k];
    }
    const updated = DataStore.mem().update("chat_compliance_policies", (x: any) => x.policyId === policyId && x.tenantId === tenantId, updates);
    return { policy: updated, summary: `Policy "${updated.policy_name}" updated` };
  }

  evaluateMessage(tenantId: string, message: any) {
    const body = String(message?.content?.body || message?.body || "");
    const violations: string[] = [];
    const policies = DataStore.mem().find("chat_compliance_policies", (x: any) => x.tenantId === tenantId && x.enabled);

    for (const pol of policies) {
      const cfg = pol.config || {};
      if (cfg.block && cfg.block.includes("credit_card_numbers") && BLOCKED_SENSITIVE.test(body)) violations.push("Blocked sensitive data (credit card/SSN)");
      const kw = cfg.keywords || [];
      for (const k of kw) {
        if (body.toLowerCase().includes(k.toLowerCase())) violations.push(`Matched keyword "${k}" under ${pol.policy_name}`);
      }
    }

    const flagged = violations.length > 0;
    if (flagged) {
      DataStore.mem().insert("chat_compliance_violations", {
        tenantId,
        violationId: `vio_${hashStr(tenantId + body.length + Date.now())}`,
        messageId: message?.messageId || "unknown",
        senderId: message?.sender?.user_id || "unknown",
        roomId: message?.roomId || "unknown",
        reason: violations,
        severity: violations.length > 1 ? "critical" : "high",
        status: "pending",
        created_at: new Date().toISOString(),
      });
      chatRealtime.emit("compliance", tenantId, {
        type: "message_blocked",
        reason: violations.join("; "),
        messageId: message?.messageId,
      });
    }
    return { allowed: !flagged, violations, summary: flagged ? `Blocked: ${violations.length} violation(s)` : "Message passed compliance checks" };
  }

  listViolations(tenantId: string, opts: any = {}) {
    let rows = DataStore.mem().find("chat_compliance_violations", (x: any) => x.tenantId === tenantId);
    if (opts.status) rows = rows.filter((v) => v.status === opts.status);
    rows = rows.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
    return { violations: rows.slice(0, opts.limit || 50), total: rows.length, summary: `${rows.length} violation(s)` };
  }

  resolveViolation(tenantId: string, violationId: string, action: string) {
    const v = DataStore.mem().findOne("chat_compliance_violations", (x: any) => x.violationId === violationId && x.tenantId === tenantId);
    if (!v) throw new Error(`Violation "${violationId}" not found`);
    const updated = DataStore.mem().update("chat_compliance_violations", (x: any) => x.violationId === violationId && x.tenantId === tenantId, {
      status: "resolved",
      resolved_with: action,
      resolved_at: new Date().toISOString(),
    });
    return { violation: updated, summary: `Violation ${violationId} resolved via ${action}` };
  }

  searchAudit(tenantId: string, query: string, opts: any = {}) {
    const q = String(query || "").toLowerCase();
    let rows = DataStore.mem().find("chat_audit_logs", (x: any) => x.tenantId === tenantId);
    if (q) rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
    if (opts.actor) rows = rows.filter((r) => r.actor?.user_id === opts.actor);
    rows = rows.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
    return { logs: rows.slice(0, opts.limit || 50), total: rows.length, summary: `${rows.length} audit log(s)` };
  }

  legalHolds(tenantId: string) {
    const holds = DataStore.mem().find("chat_legal_holds", (x: any) => x.tenantId === tenantId);
    return { holds, total: holds.length, summary: `${holds.length} active legal hold(s)` };
  }

  placeHold(tenantId: string, input: any) {
    if (!input || !input.roomId) throw new Error("roomId is required");
    const holdId = `hold_${hashStr(tenantId + input.roomId + Date.now())}`;
    const hold = DataStore.mem().insert("chat_legal_holds", {
      tenantId,
      holdId,
      roomId: input.roomId,
      reason: input.reason || "Court order",
      placed_by: input.placedBy || "system",
      status: "active",
      created_at: new Date().toISOString(),
    });
    return { hold, summary: `Legal hold placed on room ${input.roomId}` };
  }

  releaseHold(tenantId: string, holdId: string) {
    const h = DataStore.mem().findOne("chat_legal_holds", (x: any) => x.holdId === holdId && x.tenantId === tenantId);
    if (!h) throw new Error(`Legal hold "${holdId}" not found`);
    const updated = DataStore.mem().update("chat_legal_holds", (x: any) => x.holdId === holdId && x.tenantId === tenantId, { status: "released", released_at: new Date().toISOString() });
    return { hold: updated, summary: `Legal hold ${holdId} released` };
  }

  complianceOverview(tenantId: string) {
    this.ensureSeed(tenantId);
    const policies = DataStore.mem().find("chat_compliance_policies", (x: any) => x.tenantId === tenantId);
    const violations = DataStore.mem().find("chat_compliance_violations", (x: any) => x.tenantId === tenantId);
    const pending = violations.filter((v) => v.status === "pending");
    return {
      policies: policies.length,
      enabled: policies.filter((p) => p.enabled).length,
      violations: violations.length,
      pending,
      audit_logs: DataStore.mem().find("chat_audit_logs", (x: any) => x.tenantId === tenantId).length,
      legal_holds: DataStore.mem().find("chat_legal_holds", (x: any) => x.tenantId === tenantId && x.status === "active").length,
      summary: `${policies.filter((p) => p.enabled).length}/${policies.length} policies active · ${pending.length} pending violation(s)`,
    };
  }
}

export const chatCompliance = new ChatComplianceService();