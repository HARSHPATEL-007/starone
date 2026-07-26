import { securityModifierService } from "../services/SecurityModifierService";

export class SecurityModifierOrchestrator {
  async getModifiers() {
    return securityModifierService.getSecurityModifiers();
  }

  async validateAction(action: string, params: Record<string, unknown>) {
    return securityModifierService.applySchemaModifier(action, params);
  }

  async createInterrogation(actionId: string, actionDescription: string, value: number, threshold: number) {
    return securityModifierService.createHITLInterrogation(actionId, actionDescription, value, threshold);
  }

  async resolveInterrogation(id: string, approved: boolean, signature: string) {
    return securityModifierService.resolveHITLInterrogation(id, approved, signature);
  }

  async getPendingInterrogations() {
    return securityModifierService.getPendingInterrogations();
  }

  async getDashboard() {
    const modifiers = securityModifierService.getSecurityModifiers();
    return {
      totalModifiers: modifiers.length,
      byType: modifiers.reduce((acc: Record<string, number>, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1; return acc;
      }, {} as Record<string, number>),
      modifiers,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const securityModifierOrchestrator = new SecurityModifierOrchestrator();
