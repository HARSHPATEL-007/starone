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
      id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, tenantId, name: data.name, description: data.description || "",
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

  /**
   * Executes a workflow using topological traversal, condition evaluation, and loop handling.
   */
  executeWorkflow(tenantId: string, id: string, input?: Record<string, any>): { execution: WorkflowExecution; log: string[] } {
    const wf = this.getWorkflow(tenantId, id);
    if (!wf) throw new Error("Workflow not found");
    if (wf.status !== "active" && wf.status !== "draft") throw new Error("Workflow must be active or draft to execute");

    // Build adjacency map and in-degree graph
    const nodeMap = new Map(wf.nodes.map((n) => [n.id, n]));
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const edgeMap = new Map<string, WorkflowEdge>();

    wf.nodes.forEach((n) => {
      adjacency.set(n.id, []);
      inDegree.set(n.id, 0);
    });
    wf.edges.forEach((e) => {
      adjacency.get(e.source)?.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      edgeMap.set(`${e.source}->${e.target}`, e);
    });

    // Kahn's algorithm for topological sort + cycle detection
    const sorted: string[] = [];
    const queue: string[] = [];
    const inDegCopy = new Map(inDegree);

    for (const [nid, deg] of inDegCopy) {
      if (deg === 0) queue.push(nid);
    }
    while (queue.length > 0) {
      const nid = queue.shift()!;
      sorted.push(nid);
      for (const target of adjacency.get(nid) || []) {
        const newDeg = (inDegCopy.get(target) || 1) - 1;
        inDegCopy.set(target, newDeg);
        if (newDeg === 0) queue.push(target);
      }
    }

    const hasCycle = sorted.length !== wf.nodes.length;

    const log: string[] = [];
    const startNode = wf.nodes.find((n) => n.type === "trigger");
    const ctx: Record<string, any> = { ...(input || {}), $workflow: { name: wf.name, id: wf.id }, $now: new Date().toISOString() };

    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      workflowId: id, tenantId,
      trigger: startNode?.config?.event || "manual",
      status: "running",
      results: [],
      input: { ...ctx },
      startedAt: new Date().toISOString(),
    };
    const mem = DataStore["mem"]();
    mem.insert("workflow_executions", execution);

    if (hasCycle) {
      log.push(`[CYCLE DETECTED] Workflow contains a cycle — executing in declaration order with cycle guards`);
    } else {
      log.push(`[TOPOLOGICAL SORT] Execution order: ${sorted.map((nid) => nodeMap.get(nid)?.label || nid).join(" → ")}`);
    }

    const order = hasCycle ? wf.nodes.map((n) => n.id) : sorted;

    const visited = new Set<string>();
    let failed = false;

    for (const nid of order) {
      if (failed) break;
      if (visited.has(nid)) {
        log.push(`[SKIP] Node ${nodeMap.get(nid)?.label || nid} already visited`);
        continue;
      }
      visited.add(nid);

      const node = nodeMap.get(nid);
      if (!node) continue;
      const startedAt = new Date().toISOString();
      const nodeLog = (msg: string) => log.push(`[${node!.type.toUpperCase()}] ${node!.label}: ${msg}`);

      try {
        switch (node.type) {
          case "trigger":
            nodeLog(`Fired by event "${node.config.event}"`);
            ctx.$event = { type: node.config.event, filter: node.config.filter };
            execution.results.push({ nodeId: nid, status: "completed", output: ctx.$event, startedAt, completedAt: new Date().toISOString() });
            break;

          case "condition": {
            const fieldVal = this.resolveField(ctx, node.config.field);
            const op = node.config.operator;
            const cmpVal = node.config.value;
            const result = this.evaluateCondition(fieldVal, op, cmpVal);
            nodeLog(`${node.config.field} (${fieldVal}) ${op} ${cmpVal} → ${result}`);

            execution.results.push({ nodeId: nid, status: "completed", output: { result }, startedAt, completedAt: new Date().toISOString() });
            ctx[`$condition_${nid}`] = result;

            // Resolve edges: only follow matching branch
            const outEdges = wf.edges.filter((e) => e.source === nid);
            for (const edge of outEdges) {
              const edgeResult = edge.label === "Yes" ? result : edge.label === "No" ? !result : true;
              if (!edgeResult) {
                visited.add(edge.target);
                nodeLog(`Pruned branch via "${edge.label}" edge to ${nodeMap.get(edge.target)?.label || edge.target}`);
              }
            }
            break;
          }

          case "action": {
            const actionType = node.config.actionType;
            nodeLog(`Executing ${actionType}`);
            const actionResult = this.executeAction(actionType, node.config.params, ctx);
            nodeLog(`Completed: ${JSON.stringify(actionResult).slice(0, 100)}`);
            execution.results.push({ nodeId: nid, status: "completed", output: actionResult, startedAt, completedAt: new Date().toISOString() });
            ctx[`$action_${nid}`] = actionResult;
            break;
          }

          case "delay": {
            const dur = Number(node.config.duration) || 1;
            const unit = node.config.unit || "hours";
            const ms = unit === "minutes" ? dur * 60000 : unit === "hours" ? dur * 3600000 : unit === "days" ? dur * 86400000 : dur * 3600000;
            nodeLog(`Waiting ${dur} ${unit} (${ms}ms)${ms > 60000 ? " — sleeping for 1s in test mode" : ""}`);
            if (ms <= 60000) {
              const startWait = Date.now();
              while (Date.now() - startWait < Math.min(ms, 2000)) {
                // Busy-wait for short delays (max 2s in test mode)
              }
            }
            execution.results.push({ nodeId: nid, status: "completed", output: { duration: dur, unit, ms }, startedAt, completedAt: new Date().toISOString() });
            break;
          }

          case "split":
            nodeLog(`Parallel split → ${node.config.paths || 2} paths`);
            execution.results.push({ nodeId: nid, status: "completed", output: { paths: node.config.paths || 2 }, startedAt, completedAt: new Date().toISOString() });
            break;

          case "merge":
            nodeLog(`Merging parallel paths`);
            execution.results.push({ nodeId: nid, status: "completed", output: { merged: true }, startedAt, completedAt: new Date().toISOString() });
            break;

          default:
            nodeLog(`Unknown node type "${node.type}" — skipping`);
            execution.results.push({ nodeId: nid, status: "skipped", output: null, startedAt, completedAt: new Date().toISOString() });
        }
      } catch (err: any) {
        nodeLog(`FAILED: ${err.message}`);
        execution.results.push({ nodeId: nid, status: "failed", output: { error: err.message }, startedAt, completedAt: new Date().toISOString() });
        failed = true;
      }
    }

    execution.status = failed ? "failed" : "completed";
    execution.completedAt = new Date().toISOString();
    execution.output = { stepsExecuted: execution.results.length, failed: failed ? execution.results.filter((r) => r.status === "failed").map((r) => r.nodeId) : [] };
    mem.update("workflow_executions", (e: any) => e.id === execution.id, execution);

    if (io) {
      io.to(`tenant:${tenantId}`).emit("workflow:executed", { workflowId: id, executionId: execution.id, status: execution.status });
    }

    const stats = wf.stats || { totalRuns: 0, successfulRuns: 0, failedRuns: 0 };
    this.updateWorkflow(tenantId, id, {
      stats: {
        ...stats,
        totalRuns: (stats.totalRuns || 0) + 1,
        successfulRuns: (stats.successfulRuns || 0) + (failed ? 0 : 1),
        failedRuns: (stats.failedRuns || 0) + (failed ? 1 : 0),
        lastRun: new Date().toISOString(),
      },
    });

    return { execution, log };
  }

  private resolveField(ctx: Record<string, any>, field: string): any {
    const parts = field.split(".");
    let val: any = ctx;
    for (const part of parts) {
      if (val === null || val === undefined) return undefined;
      val = val[part];
    }
    return val;
  }

  private evaluateCondition(fieldVal: any, operator: string, compareVal: any): boolean {
    switch (operator) {
      case "equals": return String(fieldVal) === String(compareVal);
      case "not_equals": return String(fieldVal) !== String(compareVal);
      case "greater_than": return Number(fieldVal) > Number(compareVal);
      case "less_than": return Number(fieldVal) < Number(compareVal);
      case "contains": return String(fieldVal).includes(String(compareVal));
      case "is_true": return Boolean(fieldVal) === true;
      case "is_false": return Boolean(fieldVal) === false;
      default: return true;
    }
  }

  private executeAction(actionType: string, params: any, ctx: Record<string, any>): Record<string, any> {
    const base = { actionType, timestamp: new Date().toISOString() };
    switch (actionType) {
      case "send_email":
        return { ...base, status: "sent", to: ctx.$event?.data?.email || "test@example.com", template: "default" };
      case "send_slack":
        return { ...base, status: "sent", channel: params?.channel || "#alerts", message: params?.message || "Workflow notification" };
      case "update_campaign":
        return { ...base, status: "updated", campaignId: ctx.$event?.campaignId, updates: params };
      case "create_audience":
        return { ...base, status: "created", audienceName: params?.name, size: Math.floor(Math.random() * 5000) + 100 };
      case "send_notification":
        return { ...base, status: "delivered", userId: ctx.$event?.userId, title: params?.title || "Notification" };
      case "create_lead":
        return { ...base, status: "created", leadId: `lead_${Date.now()}`, source: params?.source || "workflow" };
      case "update_profile":
        return { ...base, status: "updated", profileId: ctx.$event?.profileId, changes: params };
      case "api_call":
        return { ...base, status: "called", url: params?.url || "https://api.example.com/webhook", response: { ok: true } };
      case "adjust_budget":
        return { ...base, status: "adjusted", adjustment: params?.adjustment || 10, unit: params?.unit || "percent" };
      case "pause_campaign":
        return { ...base, status: "paused", campaignId: ctx.$event?.campaignId };
      default:
        return { ...base, status: "unknown_action" };
    }
  }

  /** Alias for executeWorkflow to maintain backward compatibility */
  testRun(tenantId: string, id: string): { execution: WorkflowExecution; log: string[] } {
    return this.executeWorkflow(tenantId, id, { test: true, timestamp: new Date().toISOString() });
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
