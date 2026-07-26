import { DataStore } from "./DataStore";
import { agentService } from "./AgentService";
import { MemoryStore } from "./MemoryStore";

export interface SwarmExecution {
  id: string;
  agentName: string;
  agentType: string;
  action: string;
  platform: string;
  params: Record<string, unknown>;
  status: "pending" | "executing" | "completed" | "failed" | "hitl_blocked";
  result?: string;
  error?: string;
  hitlRequired: boolean;
  hitlApproved?: boolean;
  hitlApprover?: string;
  crossModuleOutput: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
}

export interface HITLRequest {
  id: string;
  agentName: string;
  agentType: string;
  action: string;
  value: number;
  threshold: number;
  rationale: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  resolvedAt?: string;
  approver?: string;
}

export interface AgentSwarmStatus {
  swarmId: string;
  agents: { name: string; type: string; status: string; lastRun: string | null; healthScore: number; successRate: number; uptime: number }[];
  recentExecutions: SwarmExecution[];
  pendingHITL: HITLRequest[];
  totalExecutionsToday: number;
  swarmHealth: string;
}

const AGENT_COLORS: Record<string, string> = {
  budget: "#1a6dff",
  creative: "#8b5cf6",
  audience: "#10b981",
  bid: "#f59e0b",
  fraud: "#ef4444",
};

export class AgentSwarmService {
  private executions: SwarmExecution[] = [];
  private hitlQueue: HITLRequest[] = [];
  private executionCounter = 0;

  private mem(): MemoryStore {
    return MemoryStore.getInstance();
  }

  async executeAgentAction(
    tenantId: string, agentName: string, agentType: string,
    action: string, platform: string, params: Record<string, unknown>,
    hitlThreshold?: number
  ): Promise<SwarmExecution> {
    const id = `swarm_exec_${++this.executionCounter}`;
    const now = new Date().toISOString();

    const value = Math.abs((params.value as number) || (params.amount as number) || 0);
    const hitlRequired = hitlThreshold !== undefined && hitlThreshold > 0 && value >= hitlThreshold;

    const execution: SwarmExecution = {
      id, agentName, agentType, action, platform, params,
      status: hitlRequired ? "hitl_blocked" : "executing",
      hitlRequired, hitlApproved: undefined,
      crossModuleOutput: {},
      startedAt: now,
    };

    if (hitlRequired) {
      this.hitlQueue.push({
        id, agentName, agentType, action, value, threshold: hitlThreshold!, rationale: `${agentName}: ${action} on ${platform} ($${value.toLocaleString()}) exceeds HITL threshold ($${hitlThreshold!.toLocaleString()})`,
        status: "pending", requestedAt: now,
      });
      this.executions.push(execution);
      return execution;
    }

    try {
      execution.status = "completed";
      execution.result = `Executed ${action} on ${platform} successfully`;
      execution.completedAt = new Date().toISOString();

      this.generateCrossModuleOutput(execution, tenantId);
      this.executions.push(execution);
      this.logExecutionToStore(tenantId, execution);
    } catch (err) {
      execution.status = "failed";
      execution.error = err instanceof Error ? err.message : String(err);
      execution.completedAt = new Date().toISOString();
      this.executions.push(execution);
    }

    return execution;
  }

  async resolveHITL(id: string, approved: boolean, approver: string): Promise<HITLRequest | null> {
    const idx = this.hitlQueue.findIndex((h) => h.id === id && h.status === "pending");
    if (idx === -1) return null;

    const request = this.hitlQueue[idx];
    request.status = approved ? "approved" : "rejected";
    request.resolvedAt = new Date().toISOString();
    request.approver = approver;
    this.hitlQueue[idx] = request;

    const execIdx = this.executions.findIndex((e) => e.id === id);
    if (execIdx !== -1) {
      this.executions[execIdx].hitlApproved = approved;
      this.executions[execIdx].hitlApprover = approver;
      if (approved) {
        this.executions[execIdx].status = "completed";
        this.executions[execIdx].result = `${this.executions[execIdx].agentName} action approved by ${approver}`;
        this.executions[execIdx].completedAt = new Date().toISOString();
      } else {
        this.executions[execIdx].status = "failed";
        this.executions[execIdx].error = `Rejected by ${approver}`;
        this.executions[execIdx].completedAt = new Date().toISOString();
      }
    }

    return request;
  }

  getSwarmStatus(tenantId: string): AgentSwarmStatus {
    const agents = this.mem().find("agents", (a: any) => a.tenantId === tenantId);
    const today = new Date().toISOString().split("T")[0];
    const recentExecutions = this.executions.slice(-20).reverse();
    const totalExecutionsToday = this.executions.filter((e) => e.startedAt.startsWith(today)).length;

    const agentStatuses = agents.map((a: any) => {
      const m = a.metrics || { runs: 0, successes: 0, failures: 0 };
      const total = m.runs || 0;
      const sr = total > 0 ? (m.successes / total) * 100 : 0;
      const healthScore = total > 0 ? Math.round(Math.min(100, sr * 0.7 + (m.actionsTaken || 0) / Math.max(1, total) * 10 + (total > 10 ? 20 : 0))) : 0;
      return {
        name: a.name, type: a.type, status: a.status,
        lastRun: a.lastRun || null, healthScore, successRate: Math.round(sr * 100) / 100,
        uptime: a.lastRun ? Math.round((Date.now() - new Date(a.lastRun).getTime()) / 3600000 * 10) / 10 : 0,
      };
    });

    const pendingHITL = this.hitlQueue.filter((h) => h.status === "pending");
    const avgHealth = agentStatuses.length > 0 ? agentStatuses.reduce((s, a) => s + a.healthScore, 0) / agentStatuses.length : 0;
    const swarmHealth = avgHealth > 80 ? "Excellent" : avgHealth > 60 ? "Good" : avgHealth > 40 ? "Fair" : "Critical";

    return {
      swarmId: `swarm_${tenantId}`,
      agents: agentStatuses,
      recentExecutions,
      pendingHITL,
      totalExecutionsToday,
      swarmHealth,
    };
  }

  getHITLQueue(): HITLRequest[] {
    return this.hitlQueue.filter((h) => h.status === "pending");
  }

  private generateCrossModuleOutput(execution: SwarmExecution, tenantId: string): void {
    const output: Record<string, unknown> = {};

    switch (execution.agentType) {
      case "budget":
        output.sheets_update = { sheet: "budget_tracker", action: execution.action, platform: execution.platform, amount: execution.params.amount };
        output.finance_alert = execution.params.amount && Number(execution.params.amount) > 5000 ? { severity: "info", action: "create_accrual" } : undefined;
        break;
      case "creative":
        output.task_create = { title: `Review creative variants for ${execution.platform}`, priority: "medium", module: "creative" };
        output.docs_update = { doc: "creative_brief", note: `${execution.action} triggered on ${execution.platform}` };
        break;
      case "audience":
        output.crm_sync = { platform: execution.platform, action: "sync_segments" };
        output.contacts_enrich = execution.params.segmentSize && Number(execution.params.segmentSize) > 50000 ? { priority: "high" } : undefined;
        break;
      case "bid":
        output.vault_log = { action: "bid_adjustment", platform: execution.platform, change: execution.params.bidChange };
        output.command_center_kpi = { metric: "avg_cpc", platform: execution.platform };
        break;
      case "fraud":
        output.task_create = { title: `Review fraud flags on ${execution.platform}`, priority: "critical", module: "compliance" };
        output.chat_alert = { channel: "security", message: `Fraud action: ${execution.action} on ${execution.platform}` };
        output.vault_legal_hold = execution.params.flaggedCount && Number(execution.params.flaggedCount) > 5 ? { reason: "brand_safety_crisis" } : undefined;
        break;
    }

    execution.crossModuleOutput = output;
  }

  private logExecutionToStore(tenantId: string, execution: SwarmExecution): void {
    this.mem().insert("swarm_executions", {
      tenantId, swarmId: `swarm_${tenantId}`,
      agentName: execution.agentName, agentType: execution.agentType,
      action: execution.action, platform: execution.platform,
      status: execution.status, params: execution.params,
      crossModuleOutput: execution.crossModuleOutput,
      startedAt: execution.startedAt, completedAt: execution.completedAt,
    });
  }
}

export const agentSwarmService = new AgentSwarmService();
