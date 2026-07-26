import { ruleEngine, ExecutionRecord } from "../services/RuleEngineService";
import { DataStore } from "../services/DataStore";
import { decisionEngine } from "./DecisionEngine";

export interface RuleEffectivenessScore {
  ruleId: string;
  ruleName: string;
  trigger: string;
  action: string;
  enabled: boolean;
  executionCount: number;
  successRate: number;
  effectivenessScore: number;
  band: string;
}

export interface TriggerFrequencyAnalysis {
  trigger: string;
  totalFires: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  successRate: number;
}

export interface RuleEngineDashboard {
  ruleScores: RuleEffectivenessScore[];
  triggerFrequency: TriggerFrequencyAnalysis[];
  overallSuccessRate: number;
  executionVelocity: number;
  topRule: RuleEffectivenessScore | null;
  worstRule: RuleEffectivenessScore | null;
  healthBand: string;
  recommendations: string[];
}

export class RuleEngineOrchestrator {
  getDashboard(tenantId: string): RuleEngineDashboard {
    const rules: any[] = DataStore.mem().find("automation_rules", (r: any) => r.tenantId === tenantId);
    const history = ruleEngine.getExecutionHistory(tenantId);

    const ruleScores: RuleEffectivenessScore[] = rules.map(r => {
      const execs = history.filter(e => e.ruleId === r._id);
      const executionCount = execs.length;
      const successCount = execs.filter(e => e.status === "success").length;
      const successRate = executionCount > 0 ? Math.round((successCount / executionCount) * 10000) / 100 : 0;
      const effectivenessScore = Math.round((successRate * 0.6 + (r.enabled ? 25 : 0) + (executionCount > 0 ? Math.min(15, executionCount * 3) : 0)));
      return {
        ruleId: r._id, ruleName: r.name, trigger: r.config?.trigger || "",
        action: r.config?.action || "", enabled: r.enabled !== false,
        executionCount, successRate,
        effectivenessScore: Math.min(100, effectivenessScore),
        band: decisionEngine.label(decisionEngine.band(Math.min(100, effectivenessScore))),
      };
    });

    const triggerFreq: Record<string, { totalFires: number; successCount: number; failedCount: number; skippedCount: number }> = {};
    for (const e of history) {
      const tg = e.trigger || "unknown";
      if (!triggerFreq[tg]) triggerFreq[tg] = { totalFires: 0, successCount: 0, failedCount: 0, skippedCount: 0 };
      triggerFreq[tg].totalFires++;
      if (e.status === "success") triggerFreq[tg].successCount++;
      else if (e.status === "failed") triggerFreq[tg].failedCount++;
      else if (e.status === "skipped") triggerFreq[tg].skippedCount++;
    }
    const triggerFrequency: TriggerFrequencyAnalysis[] = Object.entries(triggerFreq).map(([trigger, data]) => ({
      trigger, ...data,
      successRate: data.totalFires > 0 ? Math.round((data.successCount / data.totalFires) * 10000) / 100 : 0,
    })).sort((a, b) => b.totalFires - a.totalFires);

    const allExecs = history.length;
    const overallSuccessRate = allExecs > 0 ? Math.round((history.filter(e => e.status === "success").length / allExecs) * 10000) / 100 : 0;

    const sorted = [...ruleScores].sort((a, b) => b.effectivenessScore - a.effectivenessScore);
    const topRule = sorted.length > 0 ? sorted[0] : null;
    const worstRule = sorted.length > 1 ? sorted[sorted.length - 1] : null;

    const recommendations: string[] = [];
    if (topRule) recommendations.push(`Best performing rule: "${topRule.ruleName}" (score ${topRule.effectivenessScore}/100, ${topRule.successRate}% success rate).`);
    if (worstRule && worstRule.effectivenessScore < 40) recommendations.push(`Underperforming rule: "${worstRule.ruleName}" — consider reviewing trigger conditions or disabling.`);
    const highFailTriggers = triggerFrequency.filter(t => t.successRate < 50 && t.totalFires >= 3);
    if (highFailTriggers.length > 0) recommendations.push(`${highFailTriggers.length} trigger(s) have >50% failure rate. Review action configurations.`);

    return {
      ruleScores,
      triggerFrequency,
      overallSuccessRate,
      executionVelocity: history.length > 0 ? Math.round(history.length / Math.max(1, ...history.map(e => new Date(e.executedAt).getTime())) * 86400000 * 100) / 100 : 0,
      topRule, worstRule,
      healthBand: decisionEngine.label(decisionEngine.band(overallSuccessRate, { excellent: 90, good: 75, fair: 50, poor: 30 })),
      recommendations,
    };
  }
}

export const ruleEngineOrchestrator = new RuleEngineOrchestrator();
