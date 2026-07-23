import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { N0VA1OService } from "../services/N0VA1OService";

const router = Router();
const n0va1o = new N0VA1OService();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const recipes = DataStore.findRecipes(tenantId);
    res.json(recipes);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const recipe = DataStore.findRecipes(tenantId).find((r: any) => r._id === id);
    if (!recipe) throw new AppError(404, "Recipe not found");
    res.json(recipe);
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

    res.status(201).json(recipe);
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

    res.json(updated);
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

    res.json({ recipeId: id, name: recipe.name, results });
  })
);

export default router;
