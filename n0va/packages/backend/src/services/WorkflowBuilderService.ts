import { DataStore } from "./DataStore";
import { io } from "../index";

interface WorkflowNode {
  id: string;
  type: "trigger" | "condition" | "action" | "delay" | "split" | "merge";
  label: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

interface WorkflowDefinition {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  category: "lead" | "retention" | "onboarding" | "campaign" | "sales" | "custom";
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: "draft" | "active" | "paused" | "archived";
  version: number;
  stats: { totalRuns: number; successfulRuns: number; failedRuns: number; lastRun?: string; avgDuration?: number };
  createdAt: string;
  updatedAt: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  tenantId: string;
  trigger: string;
  status: "running" | "completed" | "failed" | "cancelled";
  currentNodeId?: string;
  results: { nodeId: string; status: string; output?: any; startedAt: string; completedAt?: string }[];
  input: Record<string, any>;
  output?: Record<string, any>;
  startedAt: string;
  completedAt?: string;
}

export class WorkflowBuilderService {
  getNodeTypes(): { type: string; label: string; description: string; color: string; configFields: { key: string; label: string; type: string; required: boolean; options?: string[] }[] }[] {
    return [
      { type: "trigger", label: "Trigger", description: "Starts the workflow", color: "#10b981", configFields: [
        { key: "event", label: "Event Type", type: "select", required: true, options: ["campaign.launched", "campaign.completed", "lead.created", "lead.converted", "form.submitted", "webhook.received", "schedule.cron"] },
        { key: "filter", label: "Event Filter", type: "text", required: false },
      ]},
      { type: "condition", label: "Condition", description: "Branch based on conditions", color: "#f59e0b", configFields: [
        { key: "field", label: "Field to Check", type: "text", required: true },
        { key: "operator", label: "Operator", type: "select", required: true, options: ["equals", "not_equals", "greater_than", "less_than", "contains", "is_true", "is_false"] },
        { key: "value", label: "Compare Value", type: "text", required: false },
      ]},
      { type: "action", label: "Action", description: "Execute an action", color: "#4f46e5", configFields: [
        { key: "actionType", label: "Action Type", type: "select", required: true, options: ["send_email", "send_slack", "update_campaign", "create_audience", "send_notification", "create_lead", "update_profile", "api_call", "adjust_budget", "pause_campaign"] },
        { key: "params", label: "Parameters (JSON)", type: "textarea", required: false },
      ]},
      { type: "delay", label: "Delay", description: "Wait before proceeding", color: "#8b5cf6", configFields: [
        { key: "duration", label: "Duration", type: "number", required: true },
        { key: "unit", label: "Unit", type: "select", required: true, options: ["minutes", "hours", "days"] },
      ]},
      { type: "split", label: "Split", description: "Parallel execution paths", color: "#ec4899", configFields: [
        { key: "paths", label: "Number of Paths", type: "number", required: true },
      ]},
      { type: "merge", label: "Merge", description: "Merge parallel paths", color: "#14b8a6", configFields: []},
    ];
  }

  listWorkflows(tenantId: string): WorkflowDefinition[] {
    const mem = DataStore["mem"]();
    let workflows = mem.find("workflows", (w: any) => w.tenantId === tenantId) as WorkflowDefinition[];
    if (!workflows.length) {
      const seed: Partial<WorkflowDefinition>[] = [
        { name: "Welcome Email Sequence", description: "Send welcome email when a new lead is created", category: "onboarding", nodes: [
          { id: "n1", type: "trigger", label: "Lead Created", config: { event: "lead.created" }, position: { x: 250, y: 0 } },
          { id: "n2", type: "condition", label: "Is Enterprise?", config: { field: "traits.tier", operator: "equals", value: "enterprise" }, position: { x: 250, y: 120 } },
          { id: "n3", type: "action", label: "Send Enterprise Welcome", config: { actionType: "send_email" }, position: { x: 100, y: 240 } },
          { id: "n4", type: "action", label: "Send Standard Welcome", config: { actionType: "send_email" }, position: { x: 400, y: 240 } },
          { id: "n5", type: "delay", label: "Wait 3 Days", config: { duration: 3, unit: "days" }, position: { x: 250, y: 360 } },
          { id: "n6", type: "action", label: "Send Follow-up", config: { actionType: "send_email" }, position: { x: 250, y: 480 } },
        ], edges: [
          { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3", label: "Yes" },
          { id: "e3", source: "n2", target: "n4", label: "No" }, { id: "e4", source: "n3", target: "n5" },
          { id: "e5", source: "n4", target: "n5" }, { id: "e6", source: "n5", target: "n6" },
        ]},
        { name: "Campaign Budget Alert", description: "Notify when campaign budget exceeds 80%", category: "campaign", nodes: [
          { id: "n1", type: "trigger", label: "Budget Threshold", config: { event: "campaign.budget_threshold" }, position: { x: 250, y: 0 } },
          { id: "n2", type: "condition", label: "Spend > 80%?", config: { field: "budget.spent_ratio", operator: "greater_than", value: 0.8 }, position: { x: 250, y: 120 } },
          { id: "n3", type: "action", label: "Slack Alert", config: { actionType: "send_slack" }, position: { x: 100, y: 240 } },
          { id: "n4", type: "action", label: "Pause Campaign", config: { actionType: "pause_campaign" }, position: { x: 400, y: 240 } },
        ], edges: [
          { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3", label: "Yes" },
          { id: "e3", source: "n2", target: "n4", label: "No" },
        ]},
      ];
      seed.forEach(s => {
        const wf: WorkflowDefinition = { id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, tenantId, ...s as any, status: "draft", version: 1, stats: { totalRuns: 0, successfulRuns: 0, failedRuns: 0 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        mem.insert("workflows", wf);
      });
      workflows = mem.find("workflows", (w: any) => w.tenantId === tenantId);
    }
    return workflows;
  }

  getWorkflow(tenantId: string, id: string): WorkflowDefinition | undefined {
    return DataStore["mem"]().findOne("workflows", (w: any) => w.tenantId === tenantId && w.id === id);
  }

  saveWorkflow(tenantId: string, data: { name: string; description?: string; category?: string; nodes?: WorkflowNode[]; edges?: WorkflowEdge[] }): WorkflowDefinition {
    const mem = DataStore["mem"]();
    const wf: WorkflowDefinition = {
      id: `wf_${Date.now()}`, tenantId, name: data.name, description: data.description || "",
      category: (data.category as any) || "custom", nodes: data.nodes || [], edges: data.edges || [],
      status: "draft", version: 1, stats: { totalRuns: 0, successfulRuns: 0, failedRuns: 0 },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    mem.insert("workflows", wf);
    return wf;
  }

  updateWorkflow(tenantId: string, id: string, data: Partial<WorkflowDefinition>): WorkflowDefinition | null {
    const mem = DataStore["mem"]();
    const existing = mem.findOne("workflows", (w: any) => w.tenantId === tenantId && w.id === id);
    if (!existing) return null;
    const updated = { ...existing, ...data, version: (existing.version || 1) + 1, updatedAt: new Date().toISOString() };
    mem.update("workflows", (w: any) => w.id === id, updated);
    return updated;
  }

  deleteWorkflow(tenantId: string, id: string): boolean {
    return DataStore["mem"]().delete("workflows", (w: any) => w.tenantId === tenantId && w.id === id);
  }

  activateWorkflow(tenantId: string, id: string): WorkflowDefinition | null {
    return this.updateWorkflow(tenantId, id, { status: "active" });
  }

  deactivateWorkflow(tenantId: string, id: string): WorkflowDefinition | null {
    return this.updateWorkflow(tenantId, id, { status: "paused" });
  }

  testRun(tenantId: string, id: string): { execution: WorkflowExecution; log: string[] } {
    const wf = this.getWorkflow(tenantId, id);
    if (!wf) throw new Error("Workflow not found");
    const log: string[] = [];
    const startNode = wf.nodes.find(n => n.type === "trigger");
    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}`, workflowId: id, tenantId, trigger: startNode?.config?.event || "manual",
      status: "completed", results: [], input: { test: true, timestamp: new Date().toISOString() },
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    };
    log.push(`[SIMULATE] Starting workflow "${wf.name}"`);
    for (const node of wf.nodes) {
      const startedAt = new Date().toISOString();
      log.push(`[${node.type.toUpperCase()}] ${node.label} → ${node.type === "trigger" ? "Event: " + node.config.event : node.type === "condition" ? "Check: " + node.config.field + " " + node.config.operator + " " + node.config.value : node.type === "action" ? "Execute: " + node.config.actionType : node.type === "delay" ? "Wait: " + node.config.duration + " " + node.config.unit : "Processing..."}`);
      execution.results.push({ nodeId: node.id, status: "completed", output: { simulated: true }, startedAt, completedAt: new Date().toISOString() });
    }
    log.push(`[COMPLETE] Workflow executed successfully (simulated)`);
    execution.output = { simulated: true, stepsExecuted: wf.nodes.length };
    const mem = DataStore["mem"]();
    mem.insert("workflow_executions", execution);
    if (io) io.to(`tenant:${tenantId}`).emit("workflow:executed", { workflowId: id, executionId: execution.id, status: "completed" });
    const stats = wf.stats || { totalRuns: 0, successfulRuns: 0, failedRuns: 0 };
    this.updateWorkflow(tenantId, id, { stats: { ...stats, totalRuns: (stats.totalRuns || 0) + 1, successfulRuns: (stats.successfulRuns || 0) + 1, lastRun: new Date().toISOString() } });
    return { execution, log };
  }

  getExecutions(tenantId: string, workflowId?: string): WorkflowExecution[] {
    const mem = DataStore["mem"]();
    let executions = mem.find("workflow_executions", (e: any) => e.tenantId === tenantId);
    if (workflowId) executions = executions.filter((e: any) => e.workflowId === workflowId);
    return executions.sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  getCategories(): { id: string; label: string; description: string }[] {
    return [
      { id: "lead", label: "Lead Management", description: "Lead capture, scoring, and nurturing" },
      { id: "retention", label: "Retention", description: "Customer retention and re-engagement" },
      { id: "onboarding", label: "Onboarding", description: "New user onboarding sequences" },
      { id: "campaign", label: "Campaign", description: "Campaign automation and alerts" },
      { id: "sales", label: "Sales", description: "Sales pipeline automation" },
      { id: "custom", label: "Custom", description: "Custom workflows" },
    ];
  }
}

export const workflowBuilderService = new WorkflowBuilderService();
