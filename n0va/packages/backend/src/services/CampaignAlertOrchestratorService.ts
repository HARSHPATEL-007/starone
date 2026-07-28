import { DataStore } from "./DataStore";
import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";

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
}

export const campaignAlertOrchestrator = new CampaignAlertOrchestratorService();