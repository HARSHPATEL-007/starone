import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { N0VA1OService } from "../services/N0VA1OService";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();
const n0va1o = new N0VA1OService();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const recipes = DataStore.findRecipes(tenantId);
    sendSuccess(res, recipes, { count: recipes.length });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const recipe = DataStore.findRecipes(tenantId).find((r: any) => r._id === id);
    if (!recipe) throw new AppError(404, "Recipe not found");
    sendSuccess(res, recipe);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, description, trigger, steps, hitlGate } = req.body;

    if (!name || !trigger || !steps) {
      throw new AppError(400, "Missing required fields: name, trigger, steps");
    }

    const recipe = DataStore.createRecipe({
      tenantId,
      name,
      description,
      trigger,
      steps,
      hitlGate,
      isCompiled: false,
      compiledCode: null,
      createdBy: req.user!.userId,
    });

    sendCreated(res, recipe);
  })
);

router.post(
  "/:id/compile",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const recipe = DataStore.findRecipes(tenantId).find((r: any) => r._id === id);
    if (!recipe) throw new AppError(404, "Recipe not found");

    const compiledId = await n0va1o.compileRecipe(id, recipe.steps);
    const updated = DataStore.updateRecipe(id, tenantId, {
      isCompiled: true,
      compiledCode: `# N0VA1O Compiled Recipe: ${recipe.name}\n# Generated: ${new Date().toISOString()}\n# Compiled ID: ${compiledId}\n# Bypasses LLM inference — deterministic execution <100ms p99`,
    });

    sendSuccess(res, updated);
  })
);

router.post(
  "/:id/execute",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const recipe = DataStore.findRecipes(tenantId).find((r: any) => r._id === id);
    if (!recipe) throw new AppError(404, "Recipe not found");
    if (!recipe.isCompiled) throw new AppError(400, "Recipe must be compiled first");

    const results: any[] = [];
    for (const step of recipe.steps || []) {
      if (step.platform === "n0va" || step.platform === "n0va_diffusion") {
        results.push({ platform: step.platform, action: step.action, status: "simulated" });
      } else {
        try {
          const result = await n0va1o.executeAction(tenantId, step.platform, step.action, step.params);
          results.push(result);
        } catch (e: any) {
          results.push({ platform: step.platform, action: step.action, error: e.message });
        }
      }
    }

    sendSuccess(res, { recipeId: id, name: recipe.name, results });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const updated = DataStore.updateRecipe(id, tenantId, req.body);
    if (!updated) throw new AppError(404, "Recipe not found");
    sendSuccess(res, updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const deleted = DataStore.deleteRecipe(id, tenantId);
    if (!deleted) throw new AppError(404, "Recipe not found");
    res.status(204).send();
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const recipes = DataStore.findRecipes(tenantId);
    const totalRecipes = recipes.length;
    const compiledCount = recipes.filter((r: any) => r.isCompiled).length;
    const executableCount = recipes.filter((r: any) => r.isCompiled).length;
    const byTriggerType: Record<string, number> = {};
    for (const r of recipes) {
      const t = r.trigger?.type || "unknown";
      byTriggerType[t] = (byTriggerType[t] || 0) + 1;
    }
    sendSuccess(res, { totalRecipes, compiledCount, executableCount, byTriggerType });
  })
);

export default router;


