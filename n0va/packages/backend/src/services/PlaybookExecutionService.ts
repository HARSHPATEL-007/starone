import { DataStore } from "./DataStore";

interface PlaybookStep {
  id: string;
  type: "create_campaign" | "create_creative" | "create_audience" | "set_budget" | "launch_campaign" | "pause_campaign" | "send_notification" | "wait" | "custom";
  label: string;
  description?: string;
  config: Record<string, any>;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  result?: any;
  startedAt?: string;
  completedAt?: string;
  dependsOn?: string[];
  estimatedDuration?: number;
}

interface PlaybookExecution {
  id: string;
  tenantId: string;
  playbookId: string;
  playbookName: string;
  campaignId?: string;
  steps: PlaybookStep[];
  status: "draft" | "running" | "paused" | "completed" | "failed";
  progress: number;
  currentStepIndex: number;
  startedAt?: string;
  completedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CriticalPath {
  path: string[];
  totalDuration: number;
  criticalSteps: { id: string; label: string; duration: number; slack: number }[];
  isOnCriticalPath: Record<string, boolean>;
}

interface CompletionEstimate {
  optimistic: number;
  mostLikely: number;
  pessimistic: number;
  expected: number;
  variance: number;
  confidence: "high" | "medium" | "low";
}

export class PlaybookExecutionService {
  private stepTypes(): { type: string; label: string; description: string; configSchema: Record<string, any> }[] {
    return [
      { type: "create_campaign", label: "Create Campaign", description: "Create a new campaign", configSchema: { name: "string", type: "string", budget: "number", platforms: "string[]" } },
      { type: "create_creative", label: "Create Creative", description: "Create ad creative assets", configSchema: { headline: "string", body: "string", cta: "string", imageUrl: "string" } },
      { type: "create_audience", label: "Create Audience", description: "Build an audience segment", configSchema: { name: "string", type: "string", size: "number" } },
      { type: "set_budget", label: "Set Budget", description: "Update campaign budget", configSchema: { amount: "number", daily: "boolean" } },
      { type: "launch_campaign", label: "Launch Campaign", description: "Activate a campaign", configSchema: { campaignId: "string" } },
      { type: "pause_campaign", label: "Pause Campaign", description: "Pause an active campaign", configSchema: { campaignId: "string" } },
      { type: "send_notification", label: "Send Notification", description: "Notify team members", configSchema: { message: "string", channel: "string" } },
      { type: "wait", label: "Wait", description: "Wait for specified duration", configSchema: { duration: "number", unit: "string" } },
      { type: "custom", label: "Custom Action", description: "Define a custom action", configSchema: { action: "string", params: "object" } },
    ];
  }

  getStepTemplates() { return this.stepTypes(); }

  createExecution(tenantId: string, data: { playbookId: string; playbookName: string; campaignId?: string; steps: any[]; createdBy: string }): PlaybookExecution {
    const mem = DataStore["mem"]();
    const exec: PlaybookExecution = {
      id: `exec_${Date.now()}`,
      tenantId, playbookId: data.playbookId, playbookName: data.playbookName,
      campaignId: data.campaignId,
      steps: data.steps.map((s, i) => ({ id: `step_${i}_${Date.now()}`, status: "pending", estimatedDuration: this.defaultDuration(s.type), ...s })),
      status: "draft", progress: 0, currentStepIndex: 0,
      createdBy: data.createdBy,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    mem.insert("playbook_executions", exec);
    return exec;
  }

  getExecutions(tenantId: string): PlaybookExecution[] {
    return DataStore["mem"]().find("playbook_executions", (e: any) => e.tenantId === tenantId);
  }

  getExecution(tenantId: string, id: string): PlaybookExecution | undefined {
    return DataStore["mem"]().findOne("playbook_executions", (e: any) => e.tenantId === tenantId && e.id === id);
  }

  startExecution(tenantId: string, id: string): PlaybookExecution | null {
    const mem = DataStore["mem"]();
    const exec = mem.findOne("playbook_executions", (e: any) => e.tenantId === tenantId && e.id === id) as PlaybookExecution | undefined;
    if (!exec || exec.status !== "draft") return null;
    const ready = this.getReadySteps(exec.steps);
    const steps = exec.steps.map((s) => ready.find((r) => r.id === s.id) ? { ...s, status: "running" as const, startedAt: new Date().toISOString() } : s);
    const updated = { ...exec, status: "running" as const, steps, currentStepIndex: 0, progress: 0, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    mem.update("playbook_executions", (e: any) => e.id === id, updated);
    return updated;
  }

  completeStep(tenantId: string, execId: string, stepId: string, result?: any): PlaybookExecution | null {
    const mem = DataStore["mem"]();
    const exec = mem.findOne("playbook_executions", (e: any) => e.tenantId === tenantId && e.id === execId) as PlaybookExecution | undefined;
    if (!exec) return null;
    const steps = exec.steps.map((s) => {
      if (s.id !== stepId) return s;
      return { ...s, status: "completed" as const, result, completedAt: new Date().toISOString() };
    });
    const ready = this.getReadySteps(steps);
    const nextSteps = steps.map((s) => ready.find((r) => r.id === s.id) ? { ...s, status: "running" as const, startedAt: s.startedAt || new Date().toISOString() } : s);
    const isComplete = nextSteps.every((s) => s.status === "completed" || s.status === "skipped");
    const progress = Math.round((nextSteps.filter((s) => s.status === "completed" || s.status === "skipped").length / nextSteps.length) * 100);
    const updated = { ...exec, steps: nextSteps, progress, status: isComplete ? "completed" as const : "running" as const, completedAt: isComplete ? new Date().toISOString() : undefined, updatedAt: new Date().toISOString() };
    mem.update("playbook_executions", (e: any) => e.id === execId, updated);
    return updated;
  }

  failStep(tenantId: string, execId: string, stepId: string, error: string): PlaybookExecution | null {
    const mem = DataStore["mem"]();
    const exec = mem.findOne("playbook_executions", (e: any) => e.tenantId === tenantId && e.id === execId) as PlaybookExecution | undefined;
    if (!exec) return null;
    const steps = exec.steps.map((s) => s.id === stepId ? { ...s, status: "failed" as const, result: { error }, completedAt: new Date().toISOString() } : s);
    const updated = { ...exec, steps, status: "failed" as const, progress: Math.round((steps.filter((s) => s.status === "completed" || s.status === "skipped").length / steps.length) * 100), updatedAt: new Date().toISOString() };
    mem.update("playbook_executions", (e: any) => e.id === execId, updated);
    return updated;
  }

  pauseExecution(tenantId: string, id: string): PlaybookExecution | null {
    const mem = DataStore["mem"]();
    const exec = mem.findOne("playbook_executions", (e: any) => e.tenantId === tenantId && e.id === id);
    if (!exec || exec.status !== "running") return null;
    const updated = { ...exec, status: "paused" as const, updatedAt: new Date().toISOString() };
    mem.update("playbook_executions", (e: any) => e.id === id, updated);
    return updated;
  }

  resumeExecution(tenantId: string, id: string): PlaybookExecution | null {
    const mem = DataStore["mem"]();
    const exec = mem.findOne("playbook_executions", (e: any) => e.tenantId === tenantId && e.id === id);
    if (!exec || exec.status !== "paused") return null;
    const updated = { ...exec, status: "running" as const, updatedAt: new Date().toISOString() };
    mem.update("playbook_executions", (e: any) => e.id === id, updated);
    return updated;
  }

  deleteExecution(tenantId: string, id: string): boolean {
    return DataStore["mem"]().delete("playbook_executions", (e: any) => e.tenantId === tenantId && e.id === id);
  }

  // ─── DAG-based step ordering: get steps whose dependencies are met ────
  private getReadySteps(steps: PlaybookStep[]): PlaybookStep[] {
    const completed = new Set(steps.filter((s) => s.status === "completed" || s.status === "skipped").map((s) => s.id));
    return steps.filter((s) =>
      s.status === "pending" &&
      (!s.dependsOn || s.dependsOn.length === 0 || s.dependsOn.every((d) => completed.has(d)))
    );
  }

  // ─── Critical Path Analysis ──────────────────────────────────────────

  computeCriticalPath(execution: PlaybookExecution): CriticalPath {
    const steps = execution.steps;
    const n = steps.length;

    // Topological order (respect dependencies)
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const s of steps) {
      inDegree.set(s.id, 0);
      adj.set(s.id, []);
    }
    for (const s of steps) {
      if (s.dependsOn) {
        for (const d of s.dependsOn) {
          if (adj.has(d)) adj.get(d)!.push(s.id);
          inDegree.set(s.id, (inDegree.get(s.id) || 0) + 1);
        }
      }
    }

    const topo: string[] = [];
    const queue = steps.filter((s) => (inDegree.get(s.id) || 0) === 0).map((s) => s.id);
    while (queue.length > 0) {
      const node = queue.shift()!;
      topo.push(node);
      for (const neighbor of adj.get(node) || []) {
        const deg = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, deg);
        if (deg === 0) queue.push(neighbor);
      }
    }

    const duration = (s: PlaybookStep) => s.estimatedDuration || this.defaultDurationValue(s.type);
    const durations = new Map(steps.map((s) => [s.id, duration(s)]));

    // Forward pass: earliest start/finish
    const es = new Map<string, number>();
    const ef = new Map<string, number>();
    for (const id of topo) {
      const step = steps.find((s) => s.id === id)!;
      const predEF = (step.dependsOn || []).map((d) => ef.get(d) || 0);
      const maxPred = predEF.length > 0 ? Math.max(...predEF) : 0;
      es.set(id, maxPred);
      ef.set(id, maxPred + (durations.get(id) || 0));
    }

    // Backward pass: latest start/finish
    const lf = new Map<string, number>();
    const ls = new Map<string, number>();
    const projectEnd = Math.max(...Array.from(ef.values()));
    for (const id of [...topo].reverse()) {
      const successors = adj.get(id) || [];
      const succES = successors.map((s) => ls.get(s) || projectEnd);
      const minSucc = successors.length > 0 ? Math.min(...succES) : projectEnd;
      lf.set(id, minSucc);
      ls.set(id, minSucc - (durations.get(id) || 0));
    }

    // Slack = LS - ES
    const slack = new Map<string, number>();
    for (const id of topo) slack.set(id, (ls.get(id) || 0) - (es.get(id) || 0));

    const criticalSteps = steps
      .map((s) => ({ id: s.id, label: s.label, duration: durations.get(s.id) || 0, slack: slack.get(s.id) || 0 }))
      .filter((s) => s.slack < 0.1)
      .sort((a, b) => (es.get(a.id) || 0) - (es.get(b.id) || 0));

    const isOnCriticalPath: Record<string, boolean> = {};
    for (const s of steps) isOnCriticalPath[s.id] = (slack.get(s.id) || Infinity) < 0.1;

    return {
      path: criticalSteps.map((s) => s.id),
      totalDuration: Math.round(projectEnd * 100) / 100,
      criticalSteps,
      isOnCriticalPath,
    };
  }

  // ─── PERT Completion Estimate ───────────────────────────────────────

  estimateCompletion(execution: PlaybookExecution): CompletionEstimate {
    const steps = execution.steps;
    const remaining = steps.filter((s) => s.status !== "completed" && s.status !== "skipped");
    if (remaining.length === 0) {
      return { optimistic: 0, mostLikely: 0, pessimistic: 0, expected: 0, variance: 0, confidence: "high" };
    }

    // PERT: estimated duration per step with default variance
    let optimistic = 0, mostLikely = 0, pessimistic = 0, variance = 0;
    for (const s of remaining) {
      const base = s.estimatedDuration || this.defaultDurationValue(s.type);
      const opt = base * 0.5;
      const ml = base;
      const pes = base * 2;
      optimistic += opt;
      mostLikely += ml;
      pessimistic += pes;
      variance += ((pes - opt) / 6) ** 2;
    }

    // Expected = (O + 4M + P) / 6
    const expected = (optimistic + 4 * mostLikely + pessimistic) / 6;
    const stdDev = Math.sqrt(variance);

    const totalSteps = steps.length;
    const completedCount = steps.filter((s) => s.status === "completed" || s.status === "skipped").length;
    const confidence: "high" | "medium" | "low" = completedCount > totalSteps * 0.5 ? "high" : completedCount > totalSteps * 0.25 ? "medium" : "low";

    return {
      optimistic: Math.round(optimistic * 10) / 10,
      mostLikely: Math.round(mostLikely * 10) / 10,
      pessimistic: Math.round(pessimistic * 10) / 10,
      expected: Math.round(expected * 10) / 10,
      variance: Math.round(variance * 100) / 100,
      confidence,
    };
  }

  // ─── Step Success Probability ────────────────────────────────────────

  estimateSuccessProbability(stepType: string): { probability: number; historicalCount: number; factors: { name: string; impact: number }[] } {
    const mem = DataStore["mem"]();
    const executions = mem.find("playbook_executions", () => true) as PlaybookExecution[];
    const allSteps = executions.flatMap((e) => e.steps);

    const typeSteps = allSteps.filter((s) => s.type === stepType);
    const completed = typeSteps.filter((s) => s.status === "completed");
    const failed = typeSteps.filter((s) => s.status === "failed");
    const total = completed.length + failed.length;

    const baseProb = total > 0 ? completed.length / total : 0.8;

    const factors: { name: string; impact: number }[] = [];
    if (total > 0) factors.push({ name: "Historical success rate", impact: baseProb * 0.5 });
    factors.push({ name: "Step complexity", impact: this.stepComplexity(stepType) * 0.3 });
    factors.push({ name: "Base probability", impact: 0.2 });

    const probability = baseProb * 0.5 + this.stepComplexity(stepType) * 0.3 + 0.2;

    return { probability: Math.round(probability * 10000) / 100, historicalCount: total, factors };
  }

  // ─── Rollback Impact Analysis ────────────────────────────────────────

  analyzeRollbackImpact(execution: PlaybookExecution, failedStepId: string): {
    affectedSteps: string[];
    estimatedRevertTime: number;
    riskScore: number;
    recommendation: string;
  } {
    const steps = execution.steps;
    const failedIdx = steps.findIndex((s) => s.id === failedStepId);
    if (failedIdx === -1) return { affectedSteps: [], estimatedRevertTime: 0, riskScore: 0, recommendation: "Step not found." };

    const completedBefore = steps.filter((s, i) => i < failedIdx && (s.status === "completed" || s.status === "skipped"));
    const affectedSteps = completedBefore.map((s) => s.label);

    const estimatedRevertTime = completedBefore.reduce((sum, s) => {
      return sum + (s.estimatedDuration || this.defaultDurationValue(s.type)) * 0.3;
    }, 0);

    const destructiveTypes = ["create_campaign", "create_creative", "create_audience", "set_budget", "launch_campaign"];
    const destructiveCount = completedBefore.filter((s) => destructiveTypes.includes(s.type)).length;
    const riskScore = Math.round(Math.min(100, (completedBefore.length * 10 + destructiveCount * 15 + estimatedRevertTime * 2)));

    const recommendation = riskScore > 70
      ? `High rollback risk (${riskScore}/100). ${completedBefore.length} steps completed, ${destructiveCount} of which created/modified resources. Automated rollback may have partial coverage.`
      : riskScore > 40
      ? `Moderate rollback risk (${riskScore}/100). ${completedBefore.length} steps need reverting with ~${estimatedRevertTime.toFixed(0)}s estimated revert time.`
      : `Low rollback risk (${riskScore}/100). Few steps completed. Manual revert is straightforward.`;

    return { affectedSteps, estimatedRevertTime: Math.round(estimatedRevertTime * 100) / 100, riskScore, recommendation };
  }

  // ─── Heuristics ──────────────────────────────────────────────────────

  private defaultDuration(type: string): number | undefined {
    return this.defaultDurationValue(type);
  }

  private defaultDurationValue(type: string): number {
    const map: Record<string, number> = {
      create_campaign: 30, create_creative: 45, create_audience: 20,
      set_budget: 10, launch_campaign: 15, pause_campaign: 10,
      send_notification: 5, wait: 60, custom: 30,
    };
    return map[type] || 20;
  }

  private stepComplexity(type: string): number {
    const map: Record<string, number> = {
      create_campaign: 0.7, create_creative: 0.8, create_audience: 0.6,
      set_budget: 0.4, launch_campaign: 0.5, pause_campaign: 0.3,
      send_notification: 0.2, wait: 0.1, custom: 0.6,
    };
    return map[type] || 0.5;
  }
}

export const playbookExecutionService = new PlaybookExecutionService();
