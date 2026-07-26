import { schedulerService, ScheduledAction, RecurringSchedule } from "../services/SchedulerService";
import { decisionEngine } from "./DecisionEngine";

export interface ScheduleHealthDashboard {
  totalScheduled: number;
  totalRecurring: number;
  executedCount: number;
  pendingCount: number;
  executionRate: number;
  dependencyChains: number;
  conflictCount: number;
  topTypes: { type: string; count: number }[];
  recurringHealth: { enabled: number; disabled: number; avgScheduleScore: number };
  healthBand: string;
  recommendations: string[];
}

export interface DependencyChainReport {
  actionId: string;
  chain: { path: string[]; totalActions: number; estimatedMinutes: number };
  dependents: string[];
}

export class SchedulerOrchestrator {
  getDashboard(tenantId: string): ScheduleHealthDashboard {
    const actions = schedulerService.list(tenantId);
    const recurring = schedulerService.listRecurring(tenantId);
    const allDeps = schedulerService.listDependencies();

    const executed = actions.filter(a => a.executed).length;
    const pending = actions.filter(a => !a.executed).length;
    const executionRate = actions.length > 0 ? Math.round((executed / actions.length) * 10000) / 100 : 0;

    const typeCount: Record<string, number> = {};
    for (const a of actions) {
      typeCount[a.type] = (typeCount[a.type] || 0) + 1;
    }
    const topTypes = Object.entries(typeCount).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);

    const chainIds = new Set(allDeps.map(d => d.actionId));
    const dependencyChains = chainIds.size;
    const enabledRecurring = recurring.filter(r => r.enabled).length;
    const disabledRecurring = recurring.filter(r => !r.enabled).length;

    const resolutionScores = recurring.map(r => {
      let score = 50;
      if (r.enabled) score += 20;
      if (r.nextFire) score += 10;
      if (r.lastFired) score += 10;
      if (r.endDate && new Date(r.endDate).getTime() > Date.now()) score += 10;
      return score;
    });
    const avgScheduleScore = resolutionScores.length > 0 ? Math.round(resolutionScores.reduce((s, v) => s + v, 0) / resolutionScores.length) : 0;

    const conflictCount = this.estimateConflictCount(actions);

    const healthBand = decisionEngine.label(
      decisionEngine.band(Math.round(executionRate * 0.4 + avgScheduleScore * 0.3 + (dependencyChains > 0 ? 20 : 10) + (conflictCount === 0 ? 10 : 0)))
    );

    const recommendations: string[] = [];
    if (pending > 10) recommendations.push(`${pending} pending actions queued. Monitor scheduler throughput.`);
    if (conflictCount > 0) recommendations.push(`${conflictCount} scheduling conflict(s) detected. Review action timing overlaps.`);
    if (dependencyChains > 5) recommendations.push(`${dependencyChains} dependency chains active. Review DAG complexity.`);
    if (disabledRecurring > enabledRecurring && recurring.length > 0) recommendations.push(`${disabledRecurring} of ${recurring.length} recurring schedules are disabled. Review and clean up stale schedules.`);

    return { totalScheduled: actions.length, totalRecurring: recurring.length, executedCount: executed, pendingCount: pending, executionRate, dependencyChains, conflictCount, topTypes, recurringHealth: { enabled: enabledRecurring, disabled: disabledRecurring, avgScheduleScore }, healthBand, recommendations };
  }

  getDependencyReport(tenantId: string): DependencyChainReport[] {
    const actions = schedulerService.list(tenantId);
    const allDeps = schedulerService.listDependencies();
    const reports: DependencyChainReport[] = [];

    for (const dep of allDeps) {
      const depsForAction = allDeps.filter(d => d.actionId === dep.actionId);
      const criticalPath = schedulerService.getCriticalPath(dep.actionId);
      const dependents = allDeps.filter(d => d.dependsOn.includes(dep.actionId)).map(d => d.actionId);
      reports.push({ actionId: dep.actionId, chain: criticalPath, dependents });
    }
    return reports;
  }

  private estimateConflictCount(actions: ScheduledAction[]): number {
    let conflicts = 0;
    for (let i = 0; i < actions.length; i++) {
      for (let j = i + 1; j < actions.length; j++) {
        if (actions[i].campaignId === actions[j].campaignId) {
          const diff = Math.abs(new Date(actions[i].executeAt).getTime() - new Date(actions[j].executeAt).getTime());
          if (diff < 3600000 && diff > 0) conflicts++;
        }
      }
    }
    return conflicts;
  }
}

export const schedulerOrchestrator = new SchedulerOrchestrator();
