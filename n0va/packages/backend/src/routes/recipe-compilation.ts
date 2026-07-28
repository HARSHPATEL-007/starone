import { Router, Request, Response, NextFunction } from "express";
import { recipeCompilationService } from "../services/RecipeCompilationService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.post("/compile", asyncHandler(async (req, res) => {
  const { recipe } = req.body;
  const result = recipeCompilationService.compile(recipe);
  sendSuccess(res, result);
}));

router.post("/evaluate", asyncHandler(async (req, res) => {
  const { recipeName, currentMetrics, skipHITL } = req.body;
  const result = await recipeCompilationService.evaluateAndExecute(req.user!.tenantId, recipeName, currentMetrics || {}, !!skipHITL);
  sendSuccess(res, result || { error: "Recipe not found or trigger not matched" });
}));

router.get("/compiled/:name", asyncHandler(async (req, res) => {
  const result = recipeCompilationService.getCompiled(req.params.name);
  sendSuccess(res, result || { error: "Recipe not found" });
}));

router.get("/compiled", asyncHandler(async (req, res) => {
  const result = recipeCompilationService.getAllCompiled();
  sendSuccess(res, result);
}));

router.get("/history", asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const result = recipeCompilationService.getExecutionHistory(limit);
  sendSuccess(res, result);
}));

router.get("/recipes/:name", asyncHandler(async (req, res) => {
  const result = recipeCompilationService.getRecipe(req.user!.tenantId, req.params.name);
  sendSuccess(res, result || { error: "Recipe not found" });
}));

router.get("/recipes", asyncHandler(async (req, res) => {
  const result = recipeCompilationService.listRecipes(req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
