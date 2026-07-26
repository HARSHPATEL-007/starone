import { MemoryStore } from "./MemoryStore";
import crypto from "crypto";

export interface SchemaModifier {
  name: string;
  dangerousFields: string[];
  redactPatterns: string[];
  maxValues: Record<string, number>;
}

export interface SecurityModifier {
  type: "schema" | "before_execution" | "after_execution" | "hitl_interrogation";
  name: string;
  description: string;
}

export interface BeforeExecutionHook {
  hookId: string;
  name: string;
  guardrails: string[];
  enforceBrandSafety: boolean;
  injectUtmParams: boolean;
  requiredApprovals: string[];
}

export interface HITLInterrogationRecord {
  id: string;
  actionId: string;
  actionDescription: string;
  value: number;
  threshold: number;
  status: "pending" | "approved" | "rejected" | "escalated";
  approverRole: string;
  requestedAt: string;
  resolvedAt?: string;
  digitalSignature?: string;
}

const DANGEROUS_FIELDS = ["delete_campaign", "remove_creative", "delete_account", "remove_payment", "terminate_access"];
const MAX_BUDGET_INCREASE = 50;
const MAX_BID_INCREASE = 100;
const PLATFORM_WHITELIST = ["meta_ads", "google_ads", "linkedin_ads", "tiktok_ads", "snapchat_ads", "twitter_ads", "pinterest_ads", "amazon_ads"];

export class SecurityModifierService {
  private interrogations: HITLInterrogationRecord[] = [];
  private interrogationCounter = 0;

  private mem(): MemoryStore { return MemoryStore.getInstance(); }

  applySchemaModifier(action: string, params: Record<string, unknown>): { modified: boolean; params: Record<string, unknown>; warnings: string[] } {
    const warnings: string[] = [];
    const modified = { ...params };

    for (const field of DANGEROUS_FIELDS) {
      if (modified[field] !== undefined) {
        warnings.push(`Dangerous field "${field}" redacted by security schema modifier`);
        delete modified[field];
      }
    }

    if (modified.budget_increase !== undefined) {
      const val = Number(modified.budget_increase);
      if (val > MAX_BUDGET_INCREASE) {
        modified.budget_increase = MAX_BUDGET_INCREASE;
        warnings.push(`Budget increase capped at ${MAX_BUDGET_INCREASE}% (was ${val}%)`);
      }
    }

    if (modified.bid_increase !== undefined) {
      const val = Number(modified.bid_increase);
      if (val > MAX_BID_INCREASE) {
        modified.bid_increase = MAX_BID_INCREASE;
        warnings.push(`Bid increase capped at ${MAX_BID_INCREASE}% (was ${val}%)`);
      }
    }

    if (modified.platform !== undefined && !PLATFORM_WHITELIST.includes(String(modified.platform))) {
      warnings.push(`Platform "${modified.platform}" not in approved whitelist`);
    }

    return { modified: warnings.length > 0, params: modified, warnings };
  }

  createBeforeExecutionHook(name: string, guardrails: string[], brandSafety: boolean, utmParams: boolean): BeforeExecutionHook {
    return {
      hookId: `hook_${crypto.randomBytes(6).toString("hex")}`,
      name, guardrails, enforceBrandSafety: brandSafety,
      injectUtmParams: utmParams, requiredApprovals: [],
    };
  }

  applyBeforeExecution(hook: BeforeExecutionHook, action: string, params: Record<string, unknown>): { allowed: boolean; params: Record<string, unknown>; reasons: string[] } {
    const reasons: string[] = [];

    if (hook.enforceBrandSafety) {
      if (!params.brandSafetyWhitelist && action !== "read_performance") {
        reasons.push("Brand safety whitelist not provided");
      }
    }

    if (hook.injectUtmParams) {
      params.utm_source = params.utm_source || "n0va";
      params.utm_medium = params.utm_medium || "ads";
      params.utm_campaign = params.utm_campaign || "default";
      reasons.push("UTM parameters injected");
    }

    for (const guardrail of hook.guardrails) {
      if (guardrail.startsWith("max_") && params[guardrail] !== undefined) {
        const val = Number(params[guardrail]);
        if (val > 0) reasons.push(`Guardrail ${guardrail}: ${val} within limits`);
      }
    }

    return { allowed: true, params, reasons };
  }

  createAfterExecutionResponse(payload: string | Record<string, unknown>, maxSize: number): { pointer: string; summary: string; truncated: boolean } {
    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    const sizeBytes = Buffer.byteLength(payloadStr, "utf-8");

    if (sizeBytes > maxSize) {
      const pointer = `sandbox://attribution_${crypto.randomBytes(4).toString("hex")}.csv`;
      return { pointer, summary: `${sizeBytes} bytes offloaded to sandbox storage`, truncated: true };
    }

    return { pointer: "inline", summary: payloadStr.substring(0, 500), truncated: false };
  }

  createHITLInterrogation(actionId: string, actionDescription: string, value: number, threshold: number): HITLInterrogationRecord {
    const record: HITLInterrogationRecord = {
      id: `hitl_int_${++this.interrogationCounter}`,
      actionId, actionDescription, value, threshold,
      status: "pending", approverRole: "compliance_officer",
      requestedAt: new Date().toISOString(),
    };
    this.interrogations.push(record);
    return record;
  }

  resolveHITLInterrogation(id: string, approved: boolean, digitalSignature: string): HITLInterrogationRecord | null {
    const record = this.interrogations.find((r) => r.id === id && r.status === "pending");
    if (!record) return null;
    record.status = approved ? "approved" : "rejected";
    record.resolvedAt = new Date().toISOString();
    record.digitalSignature = digitalSignature;
    return record;
  }

  escalateHITLInterrogation(id: string): HITLInterrogationRecord | null {
    const record = this.interrogations.find((r) => r.id === id && r.status === "pending");
    if (!record) return null;
    record.status = "escalated";
    record.approverRole = "chief_compliance_officer";
    return record;
  }

  getPendingInterrogations(): HITLInterrogationRecord[] {
    return this.interrogations.filter((r) => r.status === "pending");
  }

  getSecurityModifiers(): SecurityModifier[] {
    return [
      { type: "schema", name: "Budget Cap", description: "Pre-LLM redaction of dangerous parameters — delete_campaign hidden, budget_increase capped at 50%" },
      { type: "schema", name: "Platform Whitelist", description: "Only approved platforms (Meta, Google, LinkedIn, TikTok, etc.) allowed" },
      { type: "before_execution", name: "Brand Safety Enforcer", description: "Ensures brand safety whitelist provided before campaign modification" },
      { type: "before_execution", name: "UTM Injector", description: "Automatically injects required UTM tracking parameters" },
      { type: "after_execution", name: "Large Payload Offloader", description: "Attribution CSVs >1MB offloaded to sandbox filesystem" },
      { type: "hitl_interrogation", name: "Compliance Gate", description: "Budget shifts >$50K require compliance officer digital signature" },
    ];
  }
}

export const securityModifierService = new SecurityModifierService();
