import { DataStore } from "../services/DataStore";
import { playbookExecutionService } from "../services/PlaybookExecutionService";
import { decisionEngine } from "./DecisionEngine";

export interface ExecutionAnalytics {
  executionId: string;
  playbookName: string;
  status: string;
  progress: number;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  runningSteps: number;
  pendingSteps: number;
  criticalPath: ReturnType<typeof playbookExecutionService.computeCriticalPath>;
  completionEstimate: ReturnType<typeof playbookExecutionService.estimateCompletion>;
  rollbackRisk: { affectedSteps: string[]; estimatedRevertTime: number; riskScore: number; recommendation: string } | null;
  efficiency: number;
  efficiencyBand: string;
}

export interface PlaybookHealthReport {
  generatedAt: string;
  executions: ExecutionAnalytics[];
  portfolioStats: {
    total: number;
    running: number;
    completed: number;
    failed: number;
    paused: number;
    draft: number;
  };
  avgEfficiency: number;
  avgCompletionPct: number;
  successRate: number;
  topBottlenecks: { stepType: string; avgDuration: number; failRate: number; count: number }[];
  recommendations: string[];
}

export class PlaybookExecutionOrchestrator {
  analyzeAll(tenantId: string): PlaybookHealthReport {
    const executions = playbookExecutionService.getExecutions(tenantId);
    const analytics: ExecutionAnalytics[] = executions.map(e => {
      const cp = playbookExecutionService.computeCriticalPath(e);
      const ce = playbookExecutionService.estimateCompletion(e);
      const completedSteps = e.steps.filter(s => s.status === "completed").length;
      const failedSteps = e.steps.filter(s => s.status === "failed").length;
      const runningSteps = e.steps.filter(s => s.status === "running").length;
      const pendingSteps = e.steps.filter(s => s.status === "pending").length;
      const totalSteps = e.steps.length;
      const elapsed = e.startedAt ? (Date.now() - new Date(e.startedAt).getTime()) / 1000 : 0;
      const expectedDur = ce.expected * 3600;
      const efficiency = expectedDur > 0 ? Math.round(Math.min(100, (expectedDur / Math.max(elapsed, 1)) * 50)) : 50;
      let rollbackRisk: { affectedSteps: string[]; estimatedRevertTime: number; riskScore: number; recommendation: string } | null = null;
      const failedStep = e.steps.find(s => s.status === "failed");
      if (failedStep) {
        rollbackRisk = playbookExecutionService.analyzeRollbackImpact(e, failedStep.id);
      }
      return {
        executionId: e.id, playbookName: e.playbookName, status: e.status, progress: e.progress,
        totalSteps, completedSteps, failedSteps, runningSteps, pendingSteps,
        criticalPath: cp, completionEstimate: ce, rollbackRisk,
        efficiency, efficiencyBand: decisionEngine.label(decisionEngine.band(efficiency)),
      };
    });
    const running = analytics.filter(a => a.status === "running").length;
    const completed = analytics.filter(a => a.status === "completed").length;
    const failed = analytics.filter(a => a.status === "failed").length;
    const paused = analytics.filter(a => a.status === "paused").length;
    const draft = analytics.filter(a => a.status === "draft").length;
    const total = analytics.length;
    const avgEfficiency = total > 0 ? Math.round(analytics.reduce((s, a) => s + a.efficiency, 0) / total) : 0;
    const avgCompletionPct = total > 0 ? Math.round(analytics.reduce((s, a) => s + a.progress, 0) / total) : 0;
    const successRate = (running + completed + failed) > 0 ? Math.round((completed / (running + completed + failed)) * 100) : 0;
    const stepTypeMap: Record<string, { durations: number[]; failures: number; count: number }> = {};
    for (const e of executions) {
      for (const s of e.steps) {
        if (!stepTypeMap[s.type]) stepTypeMap[s.type] = { durations: [], failures: 0, count: 0 };
        stepTypeMap[s.type].count++;
        if (s.completedAt && s.startedAt) {
          stepTypeMap[s.type].durations.push((new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 1000);
        }
        if (s.status === "failed") stepTypeMap[s.type].failures++;
      }
    }
    const topBottlenecks = Object.entries(stepTypeMap)
      .map(([stepType, d]) => ({
        stepType,
        avgDuration: d.durations.length > 0 ? Math.round(d.durations.reduce((s, v) => s + v, 0) / d.durations.length) : 0,
        failRate: d.count > 0 ? Math.round((d.failures / d.count) * 100) : 0,
        count: d.count,
      }))
      .sort((a, b) => b.failRate - a.failRate || b.avgDuration - a.avgDuration)
      .slice(0, 5);
    const recommendations: string[] = [];
    if (topBottlenecks.length > 0 && topBottlenecks[0].failRate > 20) {
      recommendations.push(`Step type "${topBottlenecks[0].stepType}" has ${topBottlenecks[0].failRate}% failure rate — investigate and improve reliability.`);
    }
    if (running > 0) recommendations.push(`${running} execution(s) in progress — monitor for completion.`);
    if (failed > 0) recommendations.push(`${failed} failed execution(s) — review rollback impact and retry.`);
    if (avgEfficiency < 50) recommendations.push("Average execution efficiency below 50 — optimize playbook step durations and dependencies.");
    return {
      generatedAt: new Date().toISOString(), executions: analytics,
      portfolioStats: { total, running, completed, failed, paused, draft },
      avgEfficiency, avgCompletionPct, successRate, topBottlenecks, recommendations,
    };
  }
}

export const playbookExecutionOrchestrator = new PlaybookExecutionOrchestrator();
