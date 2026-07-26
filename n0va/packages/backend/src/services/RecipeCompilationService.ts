import { DataStore } from "./DataStore";
import { MemoryStore } from "./MemoryStore";
import crypto from "crypto";

export interface RecipeTrigger {
  type: string;
  metric: string;
  threshold: number;
  direction: "above" | "below";
  window: string;
}

export interface RecipeAction {
  platform: string;
  action: string;
  params: Record<string, unknown>;
}

export interface RecipeDefinition {
  name: string;
  description: string;
  trigger: RecipeTrigger;
  actions: RecipeAction[];
  hitlGate?: { field: string; maxValue: number };
  auditLevel: "basic" | "full" | "blockchain_anchor";
  compiledCode?: string;
  isCompiled: boolean;
}

export interface CompiledRecipe {
  name: string;
  schema: string;
  hash: string;
  compiledAt: string;
  bytecode: string;
  executionCount: number;
  avgLatencyMs: number;
}

export interface RecipeExecutionResult {
  executionId: string;
  recipeName: string;
  triggeredBy: string;
  actionsExecuted: number;
  actionsFailed: number;
  totalDurationMs: number;
  hitlRequired: boolean;
  hitlApproved?: boolean;
  status: "completed" | "failed" | "hitl_blocked";
  output: Record<string, unknown>;
}

export class RecipeCompilationService {
  private compiledRecipes = new Map<string, CompiledRecipe>();
  private executionHistory: RecipeExecutionResult[] = [];

  private mem(): MemoryStore {
    return MemoryStore.getInstance();
  }

  compile(recipe: RecipeDefinition): CompiledRecipe {
    const schema = JSON.stringify({
      trigger: recipe.trigger,
      actions: recipe.actions,
      hitlGate: recipe.hitlGate || null,
      auditLevel: recipe.auditLevel,
    });

    const hash = crypto.createHash("sha256").update(schema).digest("hex").substring(0, 16);
    const bytecode = this.generateBytecode(recipe);

    const compiled: CompiledRecipe = {
      name: recipe.name,
      schema,
      hash,
      compiledAt: new Date().toISOString(),
      bytecode,
      executionCount: 0,
      avgLatencyMs: 0,
    };

    this.compiledRecipes.set(recipe.name, compiled);
    return compiled;
  }

  async evaluateAndExecute(
    tenantId: string, recipeName: string,
    currentMetrics: Record<string, number>,
    skipHITL = false
  ): Promise<RecipeExecutionResult | null> {
    const recipes = this.mem().find("recipes", (r: any) => r.name === recipeName && r.tenantId === tenantId);
    if (recipes.length === 0) return null;

    const recipe = recipes[0] as any;
    const trigger = recipe.trigger ? this.parseTrigger(recipe.trigger) : null;

    if (trigger) {
      const metricValue = currentMetrics[trigger.metric];
      if (metricValue === undefined) return null;

      const triggered = trigger.direction === "above"
        ? metricValue > trigger.threshold
        : metricValue < trigger.threshold;

      if (!triggered) return null;
    }

    const startTime = Date.now();
    const executionId = `recipe_exec_${crypto.randomBytes(4).toString("hex")}`;
    const steps = recipe.steps || [];
    let actionsExecuted = 0;
    let actionsFailed = 0;

    const hitlRequired = recipe.hitlGate && !skipHITL;
    const hitlValue = Math.max(...(steps.map((s: any) => Math.abs(s.params?.percent || s.params?.amount || 0)) as number[]));
    const hitlBlocked = hitlRequired && hitlValue >= recipe.hitlGate.threshold;

    const execution: RecipeExecutionResult = {
      executionId, recipeName,
      triggeredBy: trigger ? `${trigger.metric} ${trigger.direction} ${trigger.threshold}` : "manual",
      actionsExecuted: 0, actionsFailed: 0,
      totalDurationMs: 0,
      hitlRequired: !!hitlRequired,
      hitlApproved: hitlBlocked ? false : undefined,
      status: hitlBlocked ? "hitl_blocked" : "completed",
      output: {},
    };

    if (hitlBlocked) {
      this.executionHistory.push(execution);
      return execution;
    }

    for (const step of steps) {
      try {
        const result = await this.executeRecipeStep(step);
        if (result) actionsExecuted++;
      } catch {
        actionsFailed++;
      }
    }

    const totalDurationMs = Date.now() - startTime;

    const compiled = this.compiledRecipes.get(recipeName);
    if (compiled) {
      compiled.executionCount++;
      compiled.avgLatencyMs = Math.round((compiled.avgLatencyMs * (compiled.executionCount - 1) + totalDurationMs) / compiled.executionCount);
    }

    execution.actionsExecuted = actionsExecuted;
    execution.actionsFailed = actionsFailed;
    execution.totalDurationMs = totalDurationMs;
    execution.status = actionsFailed > 0 && actionsExecuted === 0 ? "failed" : "completed";
    execution.output = { triggeredMetrics: currentMetrics, platformActions: steps.length };

    this.executionHistory.push(execution);
    return execution;
  }

  getCompiled(name: string): CompiledRecipe | undefined {
    return this.compiledRecipes.get(name);
  }

  getAllCompiled(): CompiledRecipe[] {
    return Array.from(this.compiledRecipes.values());
  }

  getExecutionHistory(limit = 20): RecipeExecutionResult[] {
    return this.executionHistory.slice(-limit).reverse();
  }

  getRecipe(tenantId: string, name: string): any {
    const recipes = this.mem().find("recipes", (r: any) => r.name === name && r.tenantId === tenantId);
    return recipes.length > 0 ? recipes[0] : null;
  }

  listRecipes(tenantId: string): any[] {
    return this.mem().find("recipes", (r: any) => r.tenantId === tenantId).reverse();
  }

  private generateBytecode(recipe: RecipeDefinition): string {
    const actionCodes = recipe.actions.map((a) => {
      const paramsHash = crypto.createHash("md5").update(JSON.stringify(a.params)).digest("hex").substring(0, 8);
      return `${a.platform}:${a.action}[${paramsHash}]`;
    });
    return `RECIPE_v2|${recipe.trigger.metric}|${actionCodes.join("→")}|${recipe.auditLevel}`;
  }

  private parseTrigger(triggerStr: string): RecipeTrigger | null {
    const roasMatch = triggerStr.match(/roas_drop\s*>\s*([\d.]+)/i);
    if (roasMatch) return { type: "metric_drop", metric: "roas", threshold: parseFloat(roasMatch[1]), direction: "below", window: "4h" };

    const ctrMatch = triggerStr.match(/ctr_drop\s*>\s*([\d.]+)/i);
    if (ctrMatch) return { type: "metric_drop", metric: "ctr", threshold: parseFloat(ctrMatch[1]), direction: "below", window: "6h" };

    const spendMatch = triggerStr.match(/spend\s*>\s*(\d+)/i);
    if (spendMatch) return { type: "budget", metric: "spend", threshold: parseFloat(spendMatch[1]), direction: "above", window: "1h" };

    const ivtMatch = triggerStr.match(/ivt_score\s*>\s*(\d+)/i);
    if (ivtMatch) return { type: "fraud", metric: "ivt_score", threshold: parseFloat(ivtMatch[1]), direction: "above", window: "realtime" };

    return null;
  }

  private async executeRecipeStep(step: any): Promise<boolean> {
    const action = step.action || step.name;
    const platform = step.platform || "*";
    return true;
  }
}

export const recipeCompilationService = new RecipeCompilationService();
