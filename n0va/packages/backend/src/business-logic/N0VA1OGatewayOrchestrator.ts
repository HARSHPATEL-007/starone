import { n0va1oGatewayEnhancedService } from "../services/N0VA1OGatewayEnhancedService";

export class N0VA1OGatewayOrchestrator {
  async getDashboard() {
    const catalog = n0va1oGatewayEnhancedService.getIntegrationCatalog();
    const modifiers = ["schema", "before_execution", "after_execution", "hitl_interrogation"];
    return { integrationCatalog: catalog, capabilities: Object.keys(catalog), totalCategories: Object.keys(catalog).length, activeModifiers: modifiers, generatedAt: new Date().toISOString() };
  }

  async provisionJIT(tenantId: string, platform: string, scopes: string[]) {
    return n0va1oGatewayEnhancedService.provisionJITAuth(tenantId, platform, scopes);
  }

  async getActiveSessions(tenantId: string) {
    return n0va1oGatewayEnhancedService.getActiveSessions(tenantId);
  }

  async createSandbox(script: string, runtime: string) {
    return n0va1oGatewayEnhancedService.createSandbox(script, runtime);
  }

  async resolveIntent(intent: string, tenantPlatforms: string[]) {
    return n0va1oGatewayEnhancedService.resolveIntent(intent, tenantPlatforms);
  }

  async getAvailableIntents(platform: string) {
    return n0va1oGatewayEnhancedService.getAvailableIntents(platform);
  }

  async registerWebhook(tenantId: string, source: string, eventType: string, callbackUrl: string) {
    return n0va1oGatewayEnhancedService.registerWebhook(tenantId, source, eventType, callbackUrl);
  }

  async getWebhooks(tenantId: string) {
    return n0va1oGatewayEnhancedService.getWebhooks(tenantId);
  }
}

export const n0va1oGatewayOrchestrator = new N0VA1OGatewayOrchestrator();
