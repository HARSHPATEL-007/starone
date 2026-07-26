import { agentSwarmService } from "../services/AgentSwarmService";
import { DataStore } from "../services/DataStore";

export class AgentSwarmOrchestrator {
  async getDashboard(tenantId: string) {
    const status = agentSwarmService.getSwarmStatus(tenantId);
    const agents = await DataStore.findAgents({ tenantId });
    const arr = Array.isArray(agents) ? agents : [];
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const a of arr) {
      byType[a.type] = (byType[a.type] || 0) + 1;
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    }
    return {
      ...status,
      agentCount: arr.length,
      byType, byStatus,
      generatedAt: new Date().toISOString(),
    };
  }

  async executeAction(
    tenantId: string, agentName: string, agentType: string,
    action: string, platform: string, params: Record<string, unknown>,
    hitlThreshold?: number
  ) {
    return agentSwarmService.executeAgentAction(tenantId, agentName, agentType, action, platform, params, hitlThreshold);
  }

  async resolveHITL(id: string, approved: boolean, approver: string) {
    return agentSwarmService.resolveHITL(id, approved, approver);
  }

  async getHITLQueue() {
    return agentSwarmService.getHITLQueue();
  }

  async getExecutionHistory(tenantId: string) {
    return agentSwarmService.getSwarmStatus(tenantId).recentExecutions;
  }
}

export const agentSwarmOrchestrator = new AgentSwarmOrchestrator();
