import { crossModuleIntegrationService } from "../services/CrossModuleIntegrationService";

export class CrossModuleIntegrationOrchestrator {
  async getMatrix(action?: string) {
    return crossModuleIntegrationService.getIntegrationMatrix(action);
  }

  async executeAction(tenantId: string, sourceAction: string, sourceEntity: string) {
    return crossModuleIntegrationService.executeAction(tenantId, sourceAction, sourceEntity);
  }

  async getHistory(tenantId: string) {
    return crossModuleIntegrationService.getActionHistory(tenantId);
  }

  async getDashboard(tenantId: string) {
    return crossModuleIntegrationService.getDashboard(tenantId);
  }

  async summarize(action: string) {
    return crossModuleIntegrationService.summarizeImpact(action);
  }
}

export const crossModuleIntegrationOrchestrator = new CrossModuleIntegrationOrchestrator();
