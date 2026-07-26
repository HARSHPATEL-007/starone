import { enhancedAgentService } from "../services/EnhancedAgentService";

export class EnhancedAgentOrchestrator {
  async getDefinitions() {
    return enhancedAgentService.getAgentDefinitions();
  }

  async getDefinition(type: string) {
    return enhancedAgentService.getAgentDefinition(type);
  }

  async getSchedules(tenantId: string) {
    return enhancedAgentService.computeSchedules(tenantId);
  }

  async getDetailedStatus(tenantId: string) {
    return enhancedAgentService.getDetailedStatus(tenantId);
  }

  async getCompliance(tenantId: string) {
    return enhancedAgentService.getComplianceStatus(tenantId);
  }

  async getDashboard(tenantId: string) {
    const defs = enhancedAgentService.getAgentDefinitions();
    const schedules = enhancedAgentService.computeSchedules(tenantId);
    const statuses = enhancedAgentService.getDetailedStatus(tenantId);
    const availCount = statuses.filter((s) => s.health === "excellent" || s.health === "good").length;
    return {
      totalAgents: defs.length,
      availableAgents: availCount,
      healthBreakdown: { excellent: statuses.filter((s) => s.health === "excellent").length, good: statuses.filter((s) => s.health === "good").length, fair: statuses.filter((s) => s.health === "fair").length, critical: statuses.filter((s) => s.health === "critical").length },
      agentDefinitions: defs,
      schedules,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const enhancedAgentOrchestrator = new EnhancedAgentOrchestrator();
