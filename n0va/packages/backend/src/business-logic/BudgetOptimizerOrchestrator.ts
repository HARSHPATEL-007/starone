import { budgetOptimizerService } from "../services/BudgetOptimizerService";

export class BudgetOptimizerOrchestrator {
  async predictROAS(platform: string, recentROAS?: number) {
    return budgetOptimizerService.predictROAS(platform, recentROAS);
  }

  async optimizeBudget(platforms: { name: string; currentBudget: number; recentROAS?: number }[], totalBudget: number, urgency?: string) {
    return budgetOptimizerService.optimizeBudget(platforms, totalBudget, urgency);
  }

  async getSpendPacing(tenantId: string, dailyBudgets: Record<string, number>) {
    return budgetOptimizerService.getSpendPacing(tenantId, dailyBudgets);
  }

  async getAdvice(tenantId: string, platforms: { name: string; currentBudget: number; recentROAS?: number }[], totalBudget: number) {
    return budgetOptimizerService.getOptimizationAdvice(tenantId, platforms, totalBudget);
  }

  async getForecast(tenantId: string, platforms: string[], totalBudget: number, days: number) {
    return budgetOptimizerService.getBudgetForecast(tenantId, platforms, totalBudget, days);
  }

  async getDashboard(tenantId: string) {
    return {
      generatedAt: new Date().toISOString(),
      message: "Budget Optimizer dashboard — use /predict, /optimize, /pacing, /advice, /forecast endpoints",
    };
  }
}

export const budgetOptimizerOrchestrator = new BudgetOptimizerOrchestrator();
