import { Router, Request, Response, NextFunction } from "express";
import { competitiveBenchmarkingService } from "../services/CompetitiveBenchmarkingService";
import { competitiveBenchmarkingOrchestrator } from "../business-logic/CompetitiveBenchmarkingOrchestrator";
import { sendSuccess } from "./route-utils";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/", asyncHandler(async (req, res) => { const { industry } = req.query; res.json(competitiveBenchmarkingService.getBenchmarks(req.user!.tenantId, industry as string)); }));
router.get("/industries", asyncHandler(async (_req, res) => res.json(competitiveBenchmarkingService.getIndustries())));
router.get("/orchestrate", asyncHandler(async (req, res) => { const { industry } = req.query; sendSuccess(res, competitiveBenchmarkingOrchestrator.analyze(req.user!.tenantId, industry as string)); }));

export default router;
