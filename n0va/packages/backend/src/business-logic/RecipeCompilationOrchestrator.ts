import { recipeCompilationService } from "../services/RecipeCompilationService";
import { RecipeDefinition } from "../services/RecipeCompilationService";

export class RecipeCompilationOrchestrator {
  async compileRecipe(recipe: RecipeDefinition) {
    return recipeCompilationService.compile(recipe);
  }

  async evaluateAndExecute(
    tenantId: string, recipeName: string,
    currentMetrics: Record<string, number>,
    skipHITL = false
  ) {
    return recipeCompilationService.evaluateAndExecute(tenantId, recipeName, currentMetrics, skipHITL);
  }

  async getCompiled(name: string) {
    return recipeCompilationService.getCompiled(name);
  }

  async getAllCompiled() {
    return recipeCompilationService.getAllCompiled();
  }

  async getExecutionHistory(limit = 20) {
    return recipeCompilationService.getExecutionHistory(limit);
  }

  async getRecipe(tenantId: string, name: string) {
    return recipeCompilationService.getRecipe(tenantId, name);
  }

  async listRecipes(tenantId: string) {
    return recipeCompilationService.listRecipes(tenantId);
  }

  async getDashboard(tenantId: string) {
    const recipes = recipeCompilationService.listRecipes(tenantId);
    const allCompiled = recipeCompilationService.getAllCompiled();
    const execHistory = recipeCompilationService.getExecutionHistory(5);

    const totalRecipes = recipes.length;
    const compiledCount = allCompiled.length;
    const executedCount = execHistory.length;
    const avgLatencyMs = allCompiled.length > 0
      ? allCompiled.reduce((s, c) => s + c.avgLatencyMs, 0) / allCompiled.length
      : 0;

    return {
      totalRecipes,
      compiledCount,
      executedCount,
      avgLatencyMs: Math.round(avgLatencyMs * 100) / 100,
      recentExecutions: execHistory,
      compiledSchemas: allCompiled.map((c) => ({ name: c.name, hash: c.hash, compiledAt: c.compiledAt, executionCount: c.executionCount })),
      generatedAt: new Date().toISOString(),
    };
  }
}

export const recipeCompilationOrchestrator = new RecipeCompilationOrchestrator();
