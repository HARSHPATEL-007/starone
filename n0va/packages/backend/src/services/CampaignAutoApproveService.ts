import { DataStore } from "./DataStore";

interface ApprovalAction {
  actionId: string;
  type: string;
  description: string;
  amount?: number;
  changePercent?: number;
  recordsAffected?: number;
  risk?: string;
  [key: string]: any;
}

interface ApprovalSettings {
  budgetShiftAutoLimit: number;
  bidChangeAutoLimitPercent: number;
  creativeRefreshAuto: boolean;
  audiencePauseAuto: boolean;
  audiencePauseMaxRecords: number;
  brandSafetyAutoPause: boolean;
  campaignPauseAuto: boolean;
}

const DEFAULT_SETTINGS: ApprovalSettings = {
  budgetShiftAutoLimit: 10000,
  bidChangeAutoLimitPercent: 50,
  creativeRefreshAuto: true,
  audiencePauseAuto: true,
  audiencePauseMaxRecords: 50000,
  brandSafetyAutoPause: true,
  campaignPauseAuto: false,
};

export class CampaignAutoApproveService {
  private settingsFor(tenantId: string): ApprovalSettings {
    const existing = DataStore.mem().findOne("approval_settings", (s: any) => s.tenantId === tenantId) as any;
    return existing ? { ...DEFAULT_SETTINGS, ...existing.settings } : { ...DEFAULT_SETTINGS };
  }

  getApprovalSettings(tenantId: string): { settings: ApprovalSettings; summary: string } {
    const settings = this.settingsFor(tenantId);
    const autoCount = [
      settings.budgetShiftAutoLimit >= 0, settings.creativeRefreshAuto,
      settings.bidChangeAutoLimitPercent >= 0, settings.audiencePauseAuto,
      settings.brandSafetyAutoPause, settings.campaignPauseAuto,
    ].filter(Boolean).length;
    return { settings, summary: `${autoCount}/6 action categories set to auto-approve` };
  }

  updateApprovalSettings(tenantId: string, updates: Partial<ApprovalSettings>): { settings: ApprovalSettings; summary: string } {
    const current = this.settingsFor(tenantId);
    const next: ApprovalSettings = { ...current, ...updates };
    const existing = DataStore.mem().findOne("approval_settings", (s: any) => s.tenantId === tenantId) as any;
    if (existing) {
      DataStore.mem().update("approval_settings", (s: any) => s.tenantId === tenantId, { settings: next });
    } else {
      DataStore.mem().insert("approval_settings", { tenantId, settings: next, updatedAt: new Date().toISOString() });
    }
    return this.getApprovalSettings(tenantId);
  }

  evaluateAction(tenantId: string, action: ApprovalAction): { actionId: string; type: string; description: string; decision: "auto_approve" | "requires_click"; reason: string; thresholdDetails?: any } {
    const s = this.settingsFor(tenantId);
    const t = String(action.type || "").toLowerCase();
    let decision: "auto_approve" | "requires_click" = "requires_click";
    let reason = "Not recognized — manual review required";
    let thresholdDetails: any = null;

    if (t.includes("budget_shift") || t.includes("budget shift")) {
      const amount = action.amount ?? 0;
      thresholdDetails = { amount, autoLimit: s.budgetShiftAutoLimit };
      decision = amount <= s.budgetShiftAutoLimit ? "auto_approve" : "requires_click";
      reason = decision === "auto_approve" ? `Budget shift of $${amount.toLocaleString()} under $${s.budgetShiftAutoLimit.toLocaleString()} auto-approve limit` : `Budget shift of $${amount.toLocaleString()} exceeds $${s.budgetShiftAutoLimit.toLocaleString()} — requires your click`;
    } else if (t.includes("bid_change") || t.includes("bid change") || t.includes("bid_adjust")) {
      const pct = Math.abs(action.changePercent ?? 0);
      thresholdDetails = { changePercent: pct, autoLimitPercent: s.bidChangeAutoLimitPercent };
      decision = pct < s.bidChangeAutoLimitPercent ? "auto_approve" : "requires_click";
      reason = decision === "auto_approve" ? `Bid change of ${pct.toFixed(1)}% under ${s.bidChangeAutoLimitPercent}% limit` : `Bid change of ${pct.toFixed(1)}% at or over ${s.bidChangeAutoLimitPercent}% — requires your click`;
    } else if (t.includes("creative_refresh")) {
      thresholdDetails = { auto: s.creativeRefreshAuto };
      decision = s.creativeRefreshAuto ? "auto_approve" : "requires_click";
      reason = decision === "auto_approve" ? "Creative refresh auto-approved when fatigue detected" : "Creative refresh requires approval in current settings";
    } else if (t.includes("audience_pause") || t.includes("audience pause")) {
      const records = action.recordsAffected ?? 0;
      thresholdDetails = { recordsAffected: records, autoLimit: s.audiencePauseMaxRecords, auto: s.audiencePauseAuto };
      decision = s.audiencePauseAuto && records <= s.audiencePauseMaxRecords ? "auto_approve" : "requires_click";
      reason = decision === "auto_approve" ? `Audience pause with ${records} records affected under ${s.audiencePauseMaxRecords} limit` : `Audience pause ${!s.audiencePauseAuto ? "disabled in settings" : `affects ${records} records (limit ${s.audiencePauseMaxRecords})`} — requires your click`;
    } else if (t.includes("brand_safety")) {
      thresholdDetails = { auto: s.brandSafetyAutoPause };
      decision = s.brandSafetyAutoPause ? "auto_approve" : "requires_click";
      reason = decision === "auto_approve" ? "Brand safety pause auto-approved (risk is immediate)" : "Brand safety auto-pause disabled — requires your click";
    } else if (t.includes("campaign_pause")) {
      thresholdDetails = { auto: s.campaignPauseAuto };
      decision = s.campaignPauseAuto ? "auto_approve" : "requires_click";
      reason = decision === "auto_approve" ? "Performance campaign pause auto-approved in settings" : "Performance-related campaign pause requires your click";
    }

    this.logDecision(tenantId, action, decision, reason);
    return { actionId: action.actionId, type: action.type, description: action.description || "", decision, reason, thresholdDetails };
  }

  evaluateBatch(tenantId: string, actions: ApprovalAction[]): { results: { actionId: string; type: string; decision: string; reason: string }[]; totals: { evaluated: number; autoApproved: number; requiresClick: number; summary: string } } {
    const results = actions.map(a => this.evaluateAction(tenantId, a));
    const autoApproved = results.filter(r => r.decision === "auto_approve").length;
    const requiresClick = results.length - autoApproved;
    return {
      results: results.map(r => ({ actionId: r.actionId, type: r.type, decision: r.decision, reason: r.reason })),
      totals: { evaluated: results.length, autoApproved, requiresClick, summary: `${autoApproved} auto-approved, ${requiresClick} need your click` },
    };
  }

  approveAll(tenantId: string, actions: ApprovalAction[]): { approved: { actionId: string; type: string; description: string }[]; pendingHuman: { actionId: string; type: string; description: string; reason: string }[]; totals: { evaluated: number; approved: number; pending: number; summary: string } } {
    const results = this.evaluateBatch(tenantId, actions);
    const approved = actions.filter((a, i) => results.results[i].decision === "auto_approve").map(a => ({ actionId: a.actionId, type: a.type, description: a.description || "" }));
    const pendingHuman = actions
      .map((a, i) => ({ action: a, r: results.results[i] }))
      .filter(x => x.r.decision === "requires_click")
      .map(x => ({ actionId: x.action.actionId, type: x.action.type, description: x.action.description || "", reason: x.r.reason }));
    for (const a of approved) {
      DataStore.mem().insert("approval_decisions", { tenantId, actionId: a.actionId, type: a.type, decision: "approved", decidedAt: new Date().toISOString(), via: "approve_all" });
    }
    return {
      approved, pendingHuman,
      totals: {
        evaluated: results.totals.evaluated,
        approved: approved.length,
        pending: pendingHuman.length,
        summary: `Approved ${approved.length} automatically, ${pendingHuman.length} held for your review`,
      },
    };
  }

  decideAction(tenantId: string, actionId: string, decision: "approve" | "reject"): { actionId: string; decision: string; loggedAt: string } {
    const loggedAt = new Date().toISOString();
    DataStore.mem().insert("approval_decisions", { tenantId, actionId, decision: decision === "approve" ? "approved" : "rejected", decidedAt: loggedAt, via: "manual" });
    return { actionId, decision: decision === "approve" ? "approved" : "rejected", loggedAt };
  }

  getDecisionLog(tenantId: string): { entries: any[]; totals: { total: number; approved: number; rejected: number; summary: string } } {
    const entries = DataStore.mem().find("approval_decisions", (d: any) => d.tenantId === tenantId) as any[];
    const approved = entries.filter(d => d.decision === "approved").length;
    const rejected = entries.filter(d => d.decision === "rejected").length;
    return {
      entries: entries.slice().reverse(),
      totals: { total: entries.length, approved, rejected, summary: `${approved} approved, ${rejected} rejected, ${entries.length} total decisions` },
    };
  }

  private logDecision(tenantId: string, action: ApprovalAction, decision: string, reason: string) {
    DataStore.mem().insert("approval_decisions", {
      tenantId, actionId: action.actionId, type: action.type,
      decision: decision === "auto_approve" ? "approved" : "pending",
      reason, decidedAt: new Date().toISOString(), via: "auto_evaluation",
    });
  }
}

export const campaignAutoApprove = new CampaignAutoApproveService();
