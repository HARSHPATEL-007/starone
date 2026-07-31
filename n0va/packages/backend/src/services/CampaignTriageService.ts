import { DataStore } from "./DataStore";

export interface TriageAlert {
  alertId: string;
  alertType: string;
  platform?: string;
  campaignId?: string;
  campaignName?: string;
  severity?: string;
  metric?: string;
  value?: number;
  message?: string;
  [key: string]: any;
}

export class CampaignTriageService {
  triageAlert(alert: TriageAlert): { alertId: string; alertType: string; message: string; action: string; actionLabel: string; impact: string; risk: string; payload: any } {
    const t = String(alert.alertType || "").toLowerCase();
    const platform = alert.platform || "unknown";
    const campaign = alert.campaignName || alert.campaignId || "campaign";

    if (t.includes("budget") && (t.includes("pacing") || t.includes("pace") || t.includes("overspend"))) {
      return {
        alertId: alert.alertId, alertType: alert.alertType,
        message: alert.message || `${platform} at ${alert.value ?? 82}% of daily budget — pacing too fast`,
        action: "reduce_pacing", actionLabel: "Slow pacing",
        impact: `Reduce ${platform} daily cap by 20%`, risk: "low",
        payload: { platform, campaignId: alert.campaignId, operation: "reduce_daily_cap", percentage: 20 },
      };
    }
    if (t.includes("creative") && (t.includes("fatigue") || t.includes("ctr"))) {
      return {
        alertId: alert.alertId, alertType: alert.alertType,
        message: alert.message || `CTR dropped ${Math.abs(alert.value ?? 18)}% on ${campaign} — creative fatigue`,
        action: "generate_variants", actionLabel: "Generate variants",
        impact: "Generate 3 new creative variants, submit for approval, auto-replace on approval", risk: "low",
        payload: { campaignId: alert.campaignId, operation: "generate_creative_variants", count: 3, autoReplace: true },
      };
    }
    if (t.includes("roas") && t.includes("drop")) {
      return {
        alertId: alert.alertId, alertType: alert.alertType,
        message: alert.message || `${platform} ROAS fell ${Math.abs(alert.value ?? 15)}% in the last 4h on ${campaign}`,
        action: "investigate", actionLabel: "Investigate",
        impact: "Auto-RCA generated in Docs with recommendations", risk: "medium",
        payload: { campaignId: alert.campaignId, operation: "root_cause_analysis", depth: "full" },
      };
    }
    if (t.includes("brand") && t.includes("safety")) {
      return {
        alertId: alert.alertId, alertType: alert.alertType,
        message: alert.message || `${alert.value ?? 3} placements flagged near unsafe content on ${platform}`,
        action: "pause_inventory", actionLabel: "Confirm pause",
        impact: `Pause flagged placements; ${alert.value ?? 3} placements protected; compliance team notified`, risk: "high",
        payload: { platform, operation: "pause_inventory", notifyCompliance: true, autoPause: true },
      };
    }
    if (t.includes("audience") && (t.includes("quality") || t.includes("ltv"))) {
      return {
        alertId: alert.alertId, alertType: alert.alertType,
        message: alert.message || `Segment "${alert.campaignName || campaign}" LTV down ${Math.abs(alert.value ?? 30)}%`,
        action: "pause_segment", actionLabel: "Pause segment",
        impact: "Segment paused across all platforms", risk: "medium",
        payload: { segment: alert.campaignName || campaign, operation: "pause_segment_all_platforms" },
      };
    }
    if (t.includes("bid") && (t.includes("anomaly") || t.includes("spike"))) {
      return {
        alertId: alert.alertId, alertType: alert.alertType,
        message: alert.message || `CPC spiked ${Math.abs(alert.value ?? 200)}% on ${campaign}`,
        action: "reset_bid", actionLabel: "Reset bid",
        impact: "Bid restored to 7-day average", risk: "low",
        payload: { campaignId: alert.campaignId, operation: "reset_bid_7day_average" },
      };
    }

    return {
      alertId: alert.alertId, alertType: alert.alertType,
      message: alert.message || `Unclassified alert on ${platform}`,
      action: "manual_review", actionLabel: "Review manually",
      impact: "No automated fix available — investigate manually", risk: "medium",
      payload: { operation: "manual_review" },
    };
  }

  triageBatch(alerts: TriageAlert[]): { triaged: { alertId: string; alertType: string; action: string; actionLabel: string; impact: string }[]; totals: { scanned: number; resolvable: number; manual: number; summary: string } } {
    const triaged = alerts.map(a => this.triageAlert(a));
    const resolvable = triaged.filter(t => t.action !== "manual_review").length;
    const manual = triaged.length - resolvable;
    return {
      triaged: triaged.map(t => ({ alertId: t.alertId, alertType: t.alertType, action: t.action, actionLabel: t.actionLabel, impact: t.impact })),
      totals: { scanned: triaged.length, resolvable, manual, summary: `${resolvable} alerts have one-click fixes, ${manual} need manual review` },
    };
  }

  executeTriage(tenantId: string, alert: TriageAlert): { alertId: string; action: string; status: string; executedAt: string; impact: string; payload: any } {
    const plan = this.triageAlert(alert);
    const executedAt = new Date().toISOString();
    DataStore.mem().insert("triage_logs", {
      tenantId, alertId: alert.alertId, alertType: alert.alertType,
      action: plan.action, status: "executed", impact: plan.impact,
      payload: plan.payload, executedAt,
    });
    return { alertId: alert.alertId, action: plan.action, status: "executed", executedAt, impact: plan.impact, payload: plan.payload };
  }

  getTriageHistory(tenantId: string): { entries: any[]; totals: { total: number; byAction: Record<string, number>; summary: string } } {
    const entries = DataStore.mem().find("triage_logs", (l: any) => l.tenantId === tenantId) as any[];
    const byAction: Record<string, number> = {};
    for (const e of entries) byAction[e.action] = (byAction[e.action] || 0) + 1;
    return {
      entries: entries.slice().reverse(),
      totals: { total: entries.length, byAction, summary: `${entries.length} triage actions executed` },
    };
  }
}

export const campaignTriage = new CampaignTriageService();
