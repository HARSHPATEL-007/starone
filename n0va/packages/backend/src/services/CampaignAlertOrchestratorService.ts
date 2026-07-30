import { DataStore } from "./DataStore";
import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function seededRandom(seed: string): () => number {
  let state = hashStr(seed);
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

type AlertRuleType = "threshold" | "trend" | "anomaly" | "composite";
type AlertSeverity = "low" | "medium" | "high" | "critical";
type AlertStatus = "active" | "acknowledged" | "resolved" | "dismissed";
type RuleStatus = "enabled" | "disabled";

interface AlertRule {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  type: AlertRuleType;
  severity: AlertSeverity;
  status: RuleStatus;
  config: ThresholdConfig | TrendConfig | AnomalyConfig | CompositeConfig;
  channels: string[];
  cooldownMinutes: number;
  lastFiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ThresholdConfig {
  metric: string;
  operator: "gt" | "lt" | "gte" | "lte" | "eq";
  value: number;
  campaignScope: "all" | "specific";
  campaignIds?: string[];
}

interface TrendConfig {
  metric: string;
  direction: "up" | "down";
  days: number;
  changePercent: number;
  campaignScope: "all" | "specific";
  campaignIds?: string[];
}

interface AnomalyConfig {
  metrics: string[];
  minSeverity: string;
  campaignScope: "all" | "specific";
  campaignIds?: string[];
}

interface CompositeConfig {
  conditions: { ruleType: AlertRuleType; config: ThresholdConfig | TrendConfig | AnomalyConfig }[];
  logic: "and" | "or";
  campaignScope: "all" | "specific";
  campaignIds?: string[];
}

interface CampaignAlert {
  id: string;
  tenantId: string;
  ruleId: string;
  ruleName: string;
  campaignId: string;
  campaignName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  metric: string;
  actualValue: number;
  thresholdValue: number;
  triggeredAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

interface AlertSummary {
  totalActive: number;
  bySeverity: Record<string, number>;
  byCampaign: { campaignId: string; campaignName: string; count: number; maxSeverity: string }[];
  recentAlerts: CampaignAlert[];
  mostFrequentMetric: string;
  avgResolutionTime: number;
}

interface AlertSuggestion {
  id: string;
  type: AlertRuleType;
  name: string;
  description: string;
  severity: AlertSeverity;
  suggestedConfig: any;
  confidence: number;
  reason: string;
  campaignIds: string[];
}

interface AlertBatchResult {
  acknowledged: number;
  resolved: number;
  dismissed: number;
  skipped: number;
  errors: string[];
}

interface AlertPriorityItem {
  alert: CampaignAlert;
  priority: number;
  label: "critical_now" | "important_today" | "review_soon" | "monitor";
  timeSinceTriggered: string;
  campaignHealthImpact: string;
  suggestedAction: string;
}

interface AlertMuteRule {
  id: string;
  tenantId: string;
  pattern: { metric?: string; severity?: string; campaignId?: string; ruleId?: string };
  muteUntil: string;
  reason: string;
  createdAt: string;
}

interface EscalationEntry {
  alertId: string;
  severity: string;
  escalatedAt: string;
  escalatedTo: string;
  responseDeadline: string;
  status: "pending" | "acknowledged" | "resolved" | "overdue";
  notes: string;
}

interface AlertDailyDigest {
  tenantId: string;
  date: string;
  totalActive: number;
  newAlerts: number;
  resolvedAlerts: number;
  topSeverity: string;
  byCampaign: { campaignId: string; campaignName: string; activeCount: number; criticalCount: number }[];
  criticalUnresolved: CampaignAlert[];
  recommendations: string[];
  estimatedReviewTime: string;
}

let ruleCounter = 0;
let alertCounter = 0;

export class CampaignAlertOrchestratorService {
  createRule(tenantId: string, rule: Omit<AlertRule, "id" | "tenantId" | "status" | "lastFiredAt" | "createdAt" | "updatedAt">): AlertRule {
    const mem = DataStore.mem();
    const id = `alert_rule_${++ruleCounter}`;
    const newRule: AlertRule = {
      id,
      tenantId,
      status: "enabled",
      lastFiredAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...rule,
    };
    mem.insert("alert_rules", newRule);
    return newRule;
  }

  updateRule(ruleId: string, tenantId: string, updates: Partial<AlertRule>): AlertRule | null {
    const mem = DataStore.mem();
    return mem.update("alert_rules", (r: any) => r.id === ruleId && r.tenantId === tenantId, updates);
  }

  deleteRule(ruleId: string, tenantId: string): boolean {
    const mem = DataStore.mem();
    const rule = mem.findOne("alert_rules", (r: any) => r.id === ruleId && r.tenantId === tenantId);
    if (!rule) return false;
    mem.delete("alert_rules", (r: any) => r.id === ruleId);
    return true;
  }

  getRules(tenantId: string, status?: RuleStatus): AlertRule[] {
    const mem = DataStore.mem();
    const all = mem.find("alert_rules", (r: any) => r.tenantId === tenantId);
    if (status) return all.filter((r: any) => r.status === status);
    return all;
  }

  getRule(ruleId: string, tenantId: string): AlertRule | null {
    return DataStore.mem().findOne("alert_rules", (r: any) => r.id === ruleId && r.tenantId === tenantId) || null;
  }

  evaluateRules(tenantId: string): CampaignAlert[] {
    const mem = DataStore.mem();
    const rules = mem.find("alert_rules", (r: any) => r.tenantId === tenantId && r.status === "enabled");
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const now = new Date().toISOString();
    const newAlerts: CampaignAlert[] = [];
    for (const rule of rules) {
      if (rule.lastFiredAt) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (Date.now() - new Date(rule.lastFiredAt).getTime() < cooldownMs) continue;
      }
      const campaigns = rule.config.campaignScope === "specific"
        ? portfolio.analyses.filter(a => (rule.config as any).campaignIds?.includes(a.campaignId))
        : portfolio.analyses;
      for (const camp of campaigns) {
        const fired = this.evaluateRule(rule, camp);
        if (fired) {
          const alertId = `alert_${++alertCounter}`;
          newAlerts.push({
            id: alertId,
            tenantId,
            ruleId: rule.id,
            ruleName: rule.name,
            campaignId: camp.campaignId,
            campaignName: camp.campaignName,
            severity: rule.severity,
            status: "active",
            title: `${rule.name} — ${camp.campaignName}`,
            message: fired.message,
            metric: fired.metric,
            actualValue: fired.actualValue,
            thresholdValue: fired.thresholdValue,
            triggeredAt: now,
            acknowledgedAt: null, acknowledgedBy: null,
            resolvedAt: null, resolvedBy: null,
          });
        }
      }
      if (newAlerts.some(a => a.ruleId === rule.id)) {
        mem.update("alert_rules", (r: any) => r.id === rule.id, { lastFiredAt: now });
      }
    }
    for (const alert of newAlerts) {
      mem.insert("alerts", alert);
    }
    return newAlerts;
  }

  private evaluateRule(rule: AlertRule, campaign: any): { fired: boolean; message: string; metric: string; actualValue: number; thresholdValue: number } | null {
    const perf = campaign.performance;
    const metricMap: Record<string, number> = {
      roas: perf.roas, ctr: perf.ctr, cvr: perf.cvr,
      cpa: perf.cpa || 0, spend: perf.spend, revenue: perf.revenue,
      impressions: perf.impressions, clicks: perf.clicks, conversions: perf.conversions,
      budgetUtilization: perf.budgetUtilization || 0, healthScore: campaign.healthScore,
    };
    switch (rule.type) {
      case "threshold": {
        const cfg = rule.config as ThresholdConfig;
        const val = metricMap[cfg.metric];
        if (val === undefined) return null;
        const fired = this.compare(cfg.operator, val, cfg.value);
        if (!fired) return null;
        return {
          fired: true,
          message: `${cfg.metric.toUpperCase()} is ${cfg.operator} ${cfg.value} (actual: ${val.toFixed(2)})`,
          metric: cfg.metric, actualValue: val, thresholdValue: cfg.value,
        };
      }
      case "trend": {
        const cfg = rule.config as TrendConfig;
        const trend = campaign.trends?.find((t: any) => t.metric === cfg.metric);
        if (!trend) return null;
        const dirMatch = trend.direction === cfg.direction;
        const pctMatch = Math.abs(trend.changePercent) >= cfg.changePercent;
        if (!dirMatch || !pctMatch) return null;
        return {
          fired: true,
          message: `${cfg.metric.toUpperCase()} trending ${cfg.direction} ${Math.abs(trend.changePercent).toFixed(1)}% over ${cfg.days} days`,
          metric: cfg.metric, actualValue: trend.changePercent, thresholdValue: cfg.changePercent,
        };
      }
      case "anomaly": {
        const cfg = rule.config as AnomalyConfig;
        const anomalies = autonomousCampaignManager.detectAnomalies(campaign.campaignId, campaign.campaignId);
        const matched = anomalies.filter(a => cfg.metrics.includes(a.metric) && this.severityLevel(a.severity) >= this.severityLevel(cfg.minSeverity));
        if (matched.length === 0) return null;
        const worst = matched[0];
        return {
          fired: true,
          message: `Anomaly detected: ${worst.metric} ${worst.direction} (expected ${worst.expectedValue.toFixed(2)}, actual ${worst.actualValue.toFixed(2)})`,
          metric: worst.metric, actualValue: worst.actualValue, thresholdValue: worst.expectedValue,
        };
      }
      case "composite": {
        const cfg = rule.config as CompositeConfig;
        const results = cfg.conditions.map(c => {
          const subRule = { ...rule, type: c.ruleType, config: c.config };
          return this.evaluateRule(subRule, campaign);
        });
        const fire = cfg.logic === "and" ? results.every(r => r !== null) : results.some(r => r !== null);
        if (!fire) return null;
        const triggered = results.filter(r => r !== null);
        return {
          fired: true,
          message: `Composite rule fired: ${triggered.map(r => r!.metric).join(", ")}`,
          metric: triggered.map(r => r!.metric).join("+"),
          actualValue: triggered.length,
          thresholdValue: cfg.logic === "and" ? cfg.conditions.length : 1,
        };
      }
      default:
        return null;
    }
  }

  private compare(op: string, a: number, b: number): boolean {
    switch (op) { case "gt": return a > b; case "lt": return a < b; case "gte": return a >= b; case "lte": return a <= b; case "eq": return Math.abs(a - b) < 0.001; default: return false; }
  }

  private severityLevel(s: string): number {
    return { low: 0, medium: 1, high: 2, critical: 3 }[s] ?? 0;
  }

  getAlerts(tenantId: string, status?: AlertStatus, limit: number = 50): CampaignAlert[] {
    const mem = DataStore.mem();
    let alerts = mem.find("alerts", (a: any) => a.tenantId === tenantId);
    if (status) alerts = alerts.filter((a: any) => a.status === status);
    return alerts.sort((a: any, b: any) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()).slice(0, limit);
  }

  acknowledgeAlert(alertId: string, tenantId: string, userId: string): CampaignAlert | null {
    const mem = DataStore.mem();
    return mem.update("alerts", (a: any) => a.id === alertId && a.tenantId === tenantId && a.status === "active", {
      status: "acknowledged" as AlertStatus,
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: userId,
    });
  }

  resolveAlert(alertId: string, tenantId: string, userId: string): CampaignAlert | null {
    const mem = DataStore.mem();
    return mem.update("alerts", (a: any) => a.id === alertId && a.tenantId === tenantId, {
      status: "resolved" as AlertStatus,
      resolvedAt: new Date().toISOString(),
      resolvedBy: userId,
    });
  }

  dismissAlert(alertId: string, tenantId: string): CampaignAlert | null {
    const mem = DataStore.mem();
    return mem.update("alerts", (a: any) => a.id === alertId && a.tenantId === tenantId, {
      status: "dismissed" as AlertStatus,
    });
  }

  getAlertSummary(tenantId: string): AlertSummary {
    const mem = DataStore.mem();
    const all = mem.find("alerts", (a: any) => a.tenantId === tenantId);
    const active = all.filter((a: any) => a.status === "active");
    const bySeverity: Record<string, number> = {};
    const byCampaign = new Map<string, { name: string; count: number; maxSev: string }>();
    for (const a of all) {
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
      const existing = byCampaign.get(a.campaignId) || { name: a.campaignName, count: 0, maxSev: "low" };
      existing.count++;
      const sevOrder = ["low", "medium", "high", "critical"];
      if (sevOrder.indexOf(a.severity) > sevOrder.indexOf(existing.maxSev)) existing.maxSev = a.severity;
      byCampaign.set(a.campaignId, existing);
    }
    const resolved = all.filter((a: any) => a.resolvedAt && a.triggeredAt);
    const avgTime = resolved.length > 0
      ? resolved.reduce((s: number, a: any) => s + (new Date(a.resolvedAt).getTime() - new Date(a.triggeredAt).getTime()), 0) / resolved.length
      : 0;
    const metricFreq: Record<string, number> = {};
    for (const a of all) { metricFreq[a.metric] = (metricFreq[a.metric] || 0) + 1; }
    const mostFreq = Object.entries(metricFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || "none";
    return {
      totalActive: active.length,
      bySeverity,
      byCampaign: [...byCampaign.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10).map(([id, info]) => ({ campaignId: id, campaignName: info.name, count: info.count, maxSeverity: info.maxSev })),
      recentAlerts: all.sort((a: any, b: any) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()).slice(0, 10),
      mostFrequentMetric: mostFreq,
      avgResolutionTime: Math.round(avgTime),
    };
  }

  suggestAlertRules(tenantId: string): AlertSuggestion[] {
    const mem = DataStore.mem();
    const existing = mem.find("alert_rules", (r: any) => r.tenantId === tenantId);
    const existingNames = new Set(existing.map((r: any) => r.name));
    const seed = hashStr(tenantId + "suggest");
    const rng = seededRandom(seed + "_suggest");
    const suggestions: AlertSuggestion[] = [];
    const allCampaigns = autonomousCampaignManager.analyzePortfolio(tenantId).analyses.map((a: any) => a.campaignId);
    const templates = [
      { type: "threshold" as AlertRuleType, name: "ROAS Drop Alert", description: "Fires when ROAS drops below 1.0x (breakeven)", severity: "critical" as AlertSeverity, suggestedConfig: { metric: "roas", operator: "lt", value: 1.0, campaignScope: "all" }, confidence: 0.92, reason: "ROAS below breakeven indicates campaign is losing money" },
      { type: "threshold" as AlertRuleType, name: "CPA Spike Alert", description: "Fires when CPA exceeds 2x target", severity: "high" as AlertSeverity, suggestedConfig: { metric: "cpa", operator: "gt", value: 40, campaignScope: "all" }, confidence: 0.88, reason: "High CPA reduces campaign profitability" },
      { type: "trend" as AlertRuleType, name: "CTR Decline Trend", description: "Fires when CTR trends down 20% over 7 days", severity: "medium" as AlertSeverity, suggestedConfig: { metric: "ctr", direction: "down", days: 7, changePercent: 20, campaignScope: "all" }, confidence: 0.85, reason: "Declining CTR suggests creative fatigue" },
      { type: "anomaly" as AlertRuleType, name: "Spend Anomaly", description: "Fires when spend shows anomalous patterns", severity: "high" as AlertSeverity, suggestedConfig: { metrics: ["spend"], minSeverity: "high", campaignScope: "all" }, confidence: 0.9, reason: "Unexpected spend changes can indicate platform issues" },
      { type: "threshold" as AlertRuleType, name: "Budget Exhaustion Warning", description: "Fires when budget utilization exceeds 80%", severity: "medium" as AlertSeverity, suggestedConfig: { metric: "budgetUtilization", operator: "gt", value: 80, campaignScope: "all" }, confidence: 0.95, reason: "Budget running out faster than expected" },
      { type: "composite" as AlertRuleType, name: "Campaign Health Composite", description: "Fires when ROAS < 2.0 AND CPA > 30", severity: "critical" as AlertSeverity, suggestedConfig: { conditions: [{ ruleType: "threshold", config: { metric: "roas", operator: "lt", value: 2.0, campaignScope: "all" } }, { ruleType: "threshold", config: { metric: "cpa", operator: "gt", value: 30, campaignScope: "all" } }], logic: "and", campaignScope: "all" }, confidence: 0.87, reason: "Combined ROAS and CPA issues indicate systemic problem" },
    ];
    for (const t of templates) {
      if (existingNames.has(t.name)) continue;
      if (rng() > 0.3) {
        suggestions.push({ id: `suggest_${hashStr(t.name)}`, ...t, campaignIds: allCampaigns });
      }
    }
    return suggestions;
  }

  batchAlertAction(alertIds: string[], tenantId: string, action: "acknowledge" | "resolve" | "dismiss", userId?: string): AlertBatchResult {
    const mem = DataStore.mem();
    let acknowledged = 0, resolved = 0, dismissed = 0, skipped = 0;
    const errors: string[] = [];
    for (const id of alertIds) {
      const alert = mem.findOne("alerts", (a: any) => a.id === id && a.tenantId === tenantId);
      if (!alert) { errors.push(`Alert ${id} not found`); skipped++; continue; }
      if (action === "acknowledge" && alert.status === "active") {
        mem.update("alerts", (a: any) => a.id === id, { status: "acknowledged", acknowledgedAt: new Date().toISOString(), acknowledgedBy: userId || "system" });
        acknowledged++;
      } else if (action === "resolve" && (alert.status === "active" || alert.status === "acknowledged")) {
        mem.update("alerts", (a: any) => a.id === id, { status: "resolved", resolvedAt: new Date().toISOString(), resolvedBy: userId || "system" });
        resolved++;
      } else if (action === "dismiss") {
        mem.update("alerts", (a: any) => a.id === id, { status: "dismissed" });
        dismissed++;
      } else { skipped++; }
    }
    return { acknowledged, resolved, dismissed, skipped, errors };
  }

  getAlertPriorityInbox(tenantId: string): AlertPriorityItem[] {
    const all = DataStore.mem().find("alerts", (a: any) => a.tenantId === tenantId && a.status === "active");
    const now = Date.now();
    const items: AlertPriorityItem[] = all.map((a: CampaignAlert) => {
      const msSince = now - new Date(a.triggeredAt).getTime();
      const hoursSince = msSince / 3600000;
      const sevScores: Record<string, number> = { critical: 100, high: 60, medium: 30, low: 10 };
      const decay = Math.min(msSince / 86400000, 1);
      const priority = Math.round(sevScores[a.severity] * (1 + decay));
      let label: AlertPriorityItem["label"];
      let suggestedAction: string;
      if (a.severity === "critical" && hoursSince < 2) { label = "critical_now"; suggestedAction = "Investigate immediately — critical severity alert"; }
      else if (a.severity === "high" || (a.severity === "critical" && hoursSince < 24)) { label = "important_today"; suggestedAction = "Review today — escalating severity"; }
      else if (a.severity === "medium") { label = "review_soon"; suggestedAction = "Review within 48 hours"; }
      else { label = "monitor"; suggestedAction = "Monitor — low priority"; }
      return {
        alert: a, priority, label,
        timeSinceTriggered: hoursSince < 1 ? `${Math.round(msSince / 60000)}m ago` : `${Math.round(hoursSince)}h ago`,
        campaignHealthImpact: a.severity === "critical" ? "High impact on campaign performance" : a.severity === "high" ? "Moderate impact — may worsen" : "Low impact",
        suggestedAction,
      };
    });
    return items.sort((a, b) => b.priority - a.priority).slice(0, 20);
  }

  smartMuteNoisyAlerts(tenantId: string): AlertMuteRule[] {
    const mem = DataStore.mem();
    const all = mem.find("alerts", (a: any) => a.tenantId === tenantId);
    const patternCount = new Map<string, { metric?: string; severity?: string; campaignId?: string }>();
    for (const a of all) {
      const keys = [`metric:${a.metric}`, `severity:${a.severity}`, `campaign:${a.campaignId}`];
      for (const k of keys) {
        patternCount.set(k, (patternCount.get(k) || 0) + 1);
      }
    }
    const now = new Date();
    const muteRules: AlertMuteRule[] = [];
    let muteCounter = 0;
    for (const [pattern, count] of patternCount) {
      if (count > 15) {
        muteCounter++;
        const [field, value] = pattern.split(":");
        const muteUntil = new Date(now.getTime() + 7 * 86400000);
        const muteRule: AlertMuteRule = {
          id: `mute_auto_${muteCounter}_${hashStr(pattern)}`,
          tenantId,
          pattern: field === "metric" ? { metric: value } : field === "severity" ? { severity: value } : { campaignId: value },
          muteUntil: muteUntil.toISOString(),
          reason: `Auto-muted — ${count} alerts triggered, exceeds threshold of 15`,
          createdAt: now.toISOString(),
        };
        mem.insert("alert_mute_rules", muteRule);
        muteRules.push(muteRule);
      }
    }
    return muteRules;
  }

  escalateUnresolvedAlerts(tenantId: string, escalationContact: string): EscalationEntry[] {
    const mem = DataStore.mem();
    const now = new Date();
    const criticalOpen = mem.find("alerts", (a: any) => a.tenantId === tenantId && a.severity === "critical" && (a.status === "active" || a.status === "acknowledged"));
    const entries: EscalationEntry[] = [];
    for (const alert of criticalOpen) {
      const hoursSince = (now.getTime() - new Date(alert.triggeredAt).getTime()) / 3600000;
      if (hoursSince > 4) {
        const deadline = new Date(now.getTime() + 2 * 3600000);
        entries.push({
          alertId: alert.id, severity: alert.severity,
          escalatedAt: now.toISOString(),
          escalatedTo: escalationContact,
          responseDeadline: deadline.toISOString(),
          status: hoursSince > 8 ? "overdue" : "pending",
          notes: `Alert ${alert.ruleName} on ${alert.campaignName} unresolved after ${Math.round(hoursSince)}h`,
        });
      }
    }
    return entries;
  }

  getAlertDailyDigest(tenantId: string): AlertDailyDigest {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const all = DataStore.mem().find("alerts", (a: any) => a.tenantId === tenantId);
    const active = all.filter((a: any) => a.status === "active");
    const newToday = all.filter((a: any) => a.triggeredAt >= todayStart);
    const resolvedToday = all.filter((a: any) => a.resolvedAt && a.resolvedAt >= todayStart);
    const byCampMap = new Map<string, { name: string; active: number; critical: number }>();
    for (const a of all) {
      const existing = byCampMap.get(a.campaignId) || { name: a.campaignName, active: 0, critical: 0 };
      if (a.status === "active") existing.active++;
      if (a.severity === "critical" && a.status === "active") existing.critical++;
      byCampMap.set(a.campaignId, existing);
    }
    const sevOrder = ["critical", "high", "medium", "low"];
    const topSev = sevOrder.find(s => active.some(a => a.severity === s)) || "none";
    const criticalUnresolved = active.filter(a => a.severity === "critical").slice(0, 5);
    const recommendations: string[] = [];
    if (criticalUnresolved.length > 0) recommendations.push(`${criticalUnresolved.length} critical alerts need immediate attention`);
    if (newToday.length > 10) recommendations.push("High alert volume today — consider reviewing alert thresholds");
    if (resolvedToday.length > active.length * 0.5) recommendations.push("Good response rate — team resolving alerts efficiently");
    if (recommendations.length === 0) recommendations.push("No urgent issues — continue monitoring");
    return {
      tenantId, date: now.toISOString().slice(0, 10),
      totalActive: active.length, newAlerts: newToday.length, resolvedAlerts: resolvedToday.length,
      topSeverity: topSev,
      byCampaign: [...byCampMap.entries()].map(([id, info]) => ({ campaignId: id, campaignName: info.name, activeCount: info.active, criticalCount: info.critical })),
      criticalUnresolved, recommendations,
      estimatedReviewTime: `${Math.max(5, active.length * 2)} min`,
    };
  }
}

export const campaignAlertOrchestrator = new CampaignAlertOrchestratorService();