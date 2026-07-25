import { DataStore } from "./DataStore";
import { Server } from "socket.io";
let _io: Server | null = null;
export function setRuleEngineIO(io: Server) { _io = io; }

export type TriggerType = "roas_drop" | "budget_exceeded" | "ctr_drop" | "conversions_drop" | "fraud_detected" | "campaign_ending" | "daily_spend_spike" | "creative_fatigue";
export type ActionType = "pause_campaign" | "adjust_budget" | "send_notification" | "shift_budget" | "pause_creative" | "create_task";

export interface RuleConfig {
  trigger: TriggerType;
  conditions: Record<string, number>;
  action: ActionType;
  actionParams: Record<string, any>;
  cooldownMinutes: number;
}

export interface RuleAction {
  actionType: ActionType;
  params: Record<string, any>;
  target: string;
  targetId?: string;
}

export interface ExecutionRecord {
  ruleId: string;
  ruleName: string;
  trigger: string;
  action: string;
  status: "success" | "failed" | "skipped";
  details: string;
  campaignId?: string;
  executedAt: string;
}

export class RuleEngineService {
  private executionHistory: ExecutionRecord[] = [];
  private cooldowns: Map<string, number> = new Map();

  async evaluateRule(rule: any, tenantId: string): Promise<{ triggered: boolean; actions: RuleAction[]; execution?: ExecutionRecord }> {
    const triggered = await this.checkTrigger(rule.config || {}, tenantId);
    if (!triggered) return { triggered: false, actions: [] };

    const cooldownKey = `${rule._id}_${triggered}`;
    const lastRun = this.cooldowns.get(cooldownKey);
    const cooldownMs = (rule.config?.cooldownMinutes || 30) * 60 * 1000;
    if (lastRun && Date.now() - lastRun < cooldownMs) {
      const exec: ExecutionRecord = { ruleId: rule._id, ruleName: rule.name, trigger: rule.config?.trigger || "", action: rule.config?.action || "", status: "skipped", details: "Skipped — within cooldown period", executedAt: new Date().toISOString() };
      this.executionHistory.push(exec);
      return { triggered: false, actions: [], execution: exec };
    }

    this.cooldowns.set(cooldownKey, Date.now());
    const actions = await this.executeAction(rule.config || {}, rule, tenantId);
    const status: "success" | "failed" = actions.length > 0 ? "success" : "failed";
    const exec: ExecutionRecord = { ruleId: rule._id, ruleName: rule.name, trigger: rule.config?.trigger || "", action: rule.config?.action || "", status, details: status === "success" ? `Executed ${actions.length} action(s)` : "No actions executed", campaignId: actions[0]?.targetId, executedAt: new Date().toISOString() };
    this.executionHistory.push(exec);

    try { DataStore.mem().insert("rule_executions", { ...exec, tenantId }); } catch {}

    if (_io) _io.to(`tenant:${tenantId}`).emit("rule:executed", exec);
    return { triggered: true, actions, execution: exec };
  }

  private async checkTrigger(config: any, tenantId: string): Promise<any> {
    const { trigger, conditions } = config;
    if (!trigger) return null;
    try {
      const campaigns = await DataStore.findCampaigns({ tenantId });
      const allMetrics = await DataStore.findMetrics({ tenantId });
      const metricsByCampaign: Record<string, any[]> = {};
      for (const m of allMetrics) { if (!metricsByCampaign[m.campaignId]) metricsByCampaign[m.campaignId] = []; metricsByCampaign[m.campaignId].push(m); }
      const recent = allMetrics.slice(-30);
      const avgSpend = recent.length > 0 ? recent.reduce((s: number, m: any) => s + (m.spend || 0), 0) / recent.length : 0;

      switch (trigger) {
        case "roas_drop": {
          const threshold = conditions.roasThreshold || 1.5;
          for (const c of campaigns.campaigns) {
            const ms = metricsByCampaign[c._id];
            if (!ms || ms.length < 2) continue;
            const recentM = ms.slice(-7);
            const olderM = ms.slice(-14, -7);
            const recentRoas = recentM.reduce((s: number, m: any) => s + (m.roas || 0), 0) / recentM.length;
            const olderRoas = olderM.reduce((s: number, m: any) => s + (m.roas || 0), 0) / olderM.length;
            if (olderRoas > 0 && recentRoas < olderRoas * threshold) return { campaignId: c._id, campaignName: c.name, metric: "roas", current: recentRoas, previous: olderRoas, threshold };
          }
          return null;
        }
        case "budget_exceeded": {
          const pct = (conditions.spendPercent || 80) / 100;
          for (const c of campaigns.campaigns) {
            if (c.budget?.lifetime && c.budget?.spent && (c.budget.spent / c.budget.lifetime) >= pct) return { campaignId: c._id, campaignName: c.name, metric: "budget", spent: c.budget.spent, total: c.budget.lifetime };
          }
          return null;
        }
        case "ctr_drop": {
          const threshold = conditions.ctrThreshold || 0.5;
          for (const c of campaigns.campaigns) {
            const ms = metricsByCampaign[c._id];
            if (!ms || ms.length < 2) continue;
            const recentM = ms.slice(-7);
            const olderM = ms.slice(-14, -7);
            const recentCtr = recentM.reduce((s: number, m: any) => s + (m.ctr || 0), 0) / recentM.length;
            const olderCtr = olderM.reduce((s: number, m: any) => s + (m.ctr || 0), 0) / olderM.length;
            if (olderCtr > 0 && recentCtr < olderCtr * (1 - threshold)) return { campaignId: c._id, campaignName: c.name, metric: "ctr", current: recentCtr, previous: olderCtr, threshold };
          }
          return null;
        }
        case "conversions_drop": {
          const threshold = conditions.conversionsThreshold || 0.5;
          for (const c of campaigns.campaigns) {
            const ms = metricsByCampaign[c._id];
            if (!ms || ms.length < 2) continue;
            const recentM = ms.slice(-7);
            const olderM = ms.slice(-14, -7);
            const recentConv = recentM.reduce((s: number, m: any) => s + (m.conversions || 0), 0);
            const olderConv = olderM.reduce((s: number, m: any) => s + (m.conversions || 0), 0);
            if (olderConv > 0 && recentConv < olderConv * threshold) return { campaignId: c._id, campaignName: c.name, metric: "conversions", current: recentConv, previous: olderConv, threshold };
          }
          return null;
        }
        case "fraud_detected": {
          const fraudData = await DataStore.mem().find("fraud_flags", (f: any) => f.tenantId === tenantId && f.status === "active");
          if (fraudData.length > (conditions.minFlags || 1)) return { campaignId: "fraud", metric: "fraud", count: fraudData.length };
          return null;
        }
        case "campaign_ending": {
          const daysLeft = conditions.daysLeft || 3;
          for (const c of campaigns.campaigns) {
            if (c.endDate && c.status === "active") {
              const remaining = (new Date(c.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
              if (remaining <= daysLeft && remaining > 0) return { campaignId: c._id, campaignName: c.name, metric: "ending", daysLeft: Math.ceil(remaining) };
            }
          }
          return null;
        }
        case "daily_spend_spike": {
          const spikeMultiplier = conditions.spikeMultiplier || 2;
          for (const c of campaigns.campaigns) {
            const ms = metricsByCampaign[c._id];
            if (!ms || ms.length < 7) continue;
            const sorted = ms.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const latest = sorted[0]?.spend || 0;
            const avgPrev = sorted.slice(1, 8).reduce((s: number, m: any) => s + (m.spend || 0), 0) / 7;
            if (avgPrev > 0 && latest > avgPrev * spikeMultiplier) return { campaignId: c._id, campaignName: c.name, metric: "spend_spike", current: latest, average: avgPrev, multiplier: spikeMultiplier };
          }
          return null;
        }
        case "creative_fatigue": {
          const fatigueThreshold = conditions.fatigueThreshold || 20;
          const creatives = await DataStore.findCreatives({ tenantId });
          for (const cr of creatives) {
            if (cr.performance?.ctr && cr.performance?.ctr > fatigueThreshold) continue;
            const ms = metricsByCampaign[cr.campaignId];
            if (!ms || ms.length < 2) continue;
            const sorted = ms.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const ctrDrop = sorted.length >= 2 ? ((sorted[0]?.ctr || 0) - (sorted[sorted.length - 1]?.ctr || 0)) / (sorted[sorted.length - 1]?.ctr || 1) * 100 : 0;
            if (ctrDrop < -fatigueThreshold) return { campaignId: cr.campaignId, creativeName: cr.name, metric: "fatigue", ctrDrop };
          }
          return null;
        }
        default: return null;
      }
    } catch { return null; }
  }

  private async executeAction(config: any, rule: any, tenantId: string): Promise<RuleAction[]> {
    const { action, actionParams } = config;
    const actions: RuleAction[] = [];
    try {
      switch (action) {
        case "pause_campaign": {
          const campaignId = actionParams?.campaignId;
          if (campaignId) {
            await DataStore.updateCampaign(campaignId, tenantId, { status: "paused" });
            actions.push({ actionType: "pause_campaign", params: {}, target: "campaign", targetId: campaignId });
          }
          break;
        }
        case "adjust_budget": {
          const campaignId = actionParams?.campaignId;
          const pct = actionParams?.adjustmentPercent || 10;
          if (campaignId) {
            const camp = await DataStore.findCampaignById(campaignId, tenantId);
            if (camp?.budget) {
              const daily = camp.budget.daily || 0;
              await DataStore.updateCampaign(campaignId, tenantId, { "budget.daily": Math.round(daily * (1 + pct / 100)) });
              actions.push({ actionType: "adjust_budget", params: { adjustmentPercent: pct }, target: "campaign", targetId: campaignId });
            }
          }
          break;
        }
        case "send_notification": {
          await DataStore.mem().insert("notifications", { tenantId, type: "automation", title: `Rule triggered: ${rule.name}`, message: actionParams?.message || `Automation rule "${rule.name}" was triggered.`, severity: "info", read: false, link: "/automation" });
          actions.push({ actionType: "send_notification", params: { message: actionParams?.message }, target: "notification" });
          break;
        }
        case "shift_budget": {
          const fromCampaignId = actionParams?.fromCampaignId;
          const toCampaignId = actionParams?.toCampaignId;
          const pct = actionParams?.shiftPercent || 20;
          if (fromCampaignId && toCampaignId) {
            const from = await DataStore.findCampaignById(fromCampaignId, tenantId);
            const to = await DataStore.findCampaignById(toCampaignId, tenantId);
            if (from?.budget && to?.budget) {
              const shiftAmount = Math.round((from.budget.daily || 0) * pct / 100);
              await DataStore.updateCampaign(fromCampaignId, tenantId, { "budget.daily": (from.budget.daily || 0) - shiftAmount, "budget.lifetime": (from.budget.lifetime || 0) - shiftAmount * 30 });
              await DataStore.updateCampaign(toCampaignId, tenantId, { "budget.daily": (to.budget.daily || 0) + shiftAmount, "budget.lifetime": (to.budget.lifetime || 0) + shiftAmount * 30 });
              actions.push({ actionType: "shift_budget", params: { shiftPercent: pct, amount: shiftAmount }, target: "campaign", targetId: fromCampaignId });
            }
          }
          break;
        }
        case "pause_creative": {
          const creativeId = actionParams?.creativeId;
          if (creativeId) {
            await DataStore.updateCreative(creativeId, tenantId, { status: "paused" });
            actions.push({ actionType: "pause_creative", params: {}, target: "creative", targetId: creativeId });
          }
          break;
        }
        case "create_task": {
          await DataStore.mem().insert("tasks", { tenantId, title: actionParams?.taskTitle || `Auto-task from rule: ${rule.name}`, status: "todo", priority: actionParams?.priority || "medium", assignee: actionParams?.assignee || "", source: "automation", createdBy: "rule_engine" });
          actions.push({ actionType: "create_task", params: { title: actionParams?.taskTitle }, target: "task" });
          break;
        }
      }
    } catch {}
    return actions;
  }

  async evaluateAllRules(tenantId: string): Promise<ExecutionRecord[]> {
    const rules = DataStore.mem().find("automation_rules", (r: any) => r.tenantId === tenantId && r.enabled !== false);
    const results: ExecutionRecord[] = [];
    for (const rule of rules) {
      const result = await this.evaluateRule(rule, tenantId);
      if (result.execution) results.push(result.execution);
    }
    return results;
  }

  getExecutionHistory(tenantId: string, limit = 50): ExecutionRecord[] {
    return this.executionHistory.filter((e) => e.ruleId && e.executedAt).reverse().slice(0, limit);
  }
}

export const ruleEngine = new RuleEngineService();
