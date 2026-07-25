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
      steps: data.steps.map((s, i) => ({
        id: `step_${i}_${Date.now()}`,
        status: "pending",
        ...s,
      })),
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
    const steps = exec.steps.map((s, i) => i === 0 ? { ...s, status: "running" as const, startedAt: new Date().toISOString() } : s);
    const updated = { ...exec, status: "running" as const, steps, currentStepIndex: 0, progress: 0, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    mem.update("playbook_executions", (e: any) => e.id === id, updated);
    return updated;
  }

  completeStep(tenantId: string, execId: string, stepId: string, result?: any): PlaybookExecution | null {
    const mem = DataStore["mem"]();
    const exec = mem.findOne("playbook_executions", (e: any) => e.tenantId === tenantId && e.id === execId) as PlaybookExecution | undefined;
    if (!exec) return null;
    const stepIdx = exec.steps.findIndex(s => s.id === stepId);
    if (stepIdx === -1) return null;
    const steps = [...exec.steps];
    steps[stepIdx] = { ...steps[stepIdx], status: "completed", result, completedAt: new Date().toISOString() };
    const nextIdx = stepIdx + 1;
    if (nextIdx < steps.length) {
      steps[nextIdx] = { ...steps[nextIdx], status: "running", startedAt: new Date().toISOString() };
    }
    const isComplete = steps.every(s => s.status === "completed" || s.status === "skipped");
    const progress = Math.round((steps.filter(s => s.status === "completed" || s.status === "skipped").length / steps.length) * 100);
    const updated = { ...exec, steps, progress, currentStepIndex: nextIdx, status: isComplete ? "completed" as const : "running" as const, completedAt: isComplete ? new Date().toISOString() : undefined, updatedAt: new Date().toISOString() };
    mem.update("playbook_executions", (e: any) => e.id === execId, updated);
    return updated;
  }

  failStep(tenantId: string, execId: string, stepId: string, error: string): PlaybookExecution | null {
    const mem = DataStore["mem"]();
    const exec = mem.findOne("playbook_executions", (e: any) => e.tenantId === tenantId && e.id === execId) as PlaybookExecution | undefined;
    if (!exec) return null;
    const steps = exec.steps.map(s => s.id === stepId ? { ...s, status: "failed" as const, result: { error }, completedAt: new Date().toISOString() } : s);
    const updated = { ...exec, steps, status: "failed" as const, progress: Math.round((steps.filter(s => s.status === "completed" || s.status === "skipped").length / steps.length) * 100), updatedAt: new Date().toISOString() };
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
}

export const playbookExecutionService = new PlaybookExecutionService();
