import { enhancedAttributionService } from "../services/EnhancedAttributionService";

export class EnhancedAttributionOrchestrator {
  async getDashboard(tenantId: string, model: string) { return enhancedAttributionService.getChannelDashboard(tenantId, model); }
  async createPath(conversionId: string, campaignIds: string[], touchpoints: any[], conversionValue: number, model: string) { return enhancedAttributionService.createPath(conversionId, campaignIds, touchpoints, conversionValue, model); }
  async getModelComparison(tenantId: string) { return enhancedAttributionService.getModelComparison(tenantId); }
  async simulateIncrementality(tenantId: string, campaignId: string, testDays: number) { return enhancedAttributionService.simulateIncrementalityTest(tenantId, campaignId, testDays); }
  async getChannelCredits(tenantId: string, model: string) { const d = await this.getDashboard(tenantId, model); return d.channelCredits; }
}

export const enhancedAttributionOrchestrator = new EnhancedAttributionOrchestrator();
