import { Router, Request, Response, NextFunction } from "express";
import { playbookExecutionService } from "../services/PlaybookExecutionService";
import { playbookExecutionOrchestrator } from "../business-logic/PlaybookExecutionOrchestrator";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "./route-utils";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/templates", asyncHandler(async (_req, res) => res.json(playbookExecutionService.getStepTemplates())));
router.get("/", asyncHandler(async (req, res) => res.json(playbookExecutionService.getExecutions(req.user!.tenantId))));
router.get("/orchestrate", asyncHandler(async (req, res) => { sendSuccess(res, playbookExecutionOrchestrator.analyzeAll(req.user!.tenantId)); }));
router.get("/:id", asyncHandler(async (req, res) => { const e = playbookExecutionService.getExecution(req.user!.tenantId, req.params.id); if (!e) throw new AppError(404, "Execution not found"); res.json(e); }));
router.post("/", asyncHandler(async (req, res) => { const { playbookId, playbookName, campaignId, steps } = req.body; if (!playbookId || !steps) throw new AppError(400, "Missing required fields"); const exec = playbookExecutionService.createExecution(req.user!.tenantId, { playbookId, playbookName: playbookName || "Playbook", campaignId, steps, createdBy: req.user!.userId }); res.status(201).json(exec); }));
router.post("/:id/start", asyncHandler(async (req, res) => { const e = playbookExecutionService.startExecution(req.user!.tenantId, req.params.id); if (!e) throw new AppError(400, "Cannot start execution"); res.json(e); }));
router.post("/:execId/steps/:stepId/complete", asyncHandler(async (req, res) => { const e = playbookExecutionService.completeStep(req.user!.tenantId, req.params.execId, req.params.stepId, req.body.result); if (!e) throw new AppError(404, "Execution or step not found"); res.json(e); }));
router.post("/:execId/steps/:stepId/fail", asyncHandler(async (req, res) => { const e = playbookExecutionService.failStep(req.user!.tenantId, req.params.execId, req.params.stepId, req.body.error || "Unknown error"); if (!e) throw new AppError(404, "Execution or step not found"); res.json(e); }));
router.post("/:id/pause", asyncHandler(async (req, res) => { const e = playbookExecutionService.pauseExecution(req.user!.tenantId, req.params.id); if (!e) throw new AppError(400, "Cannot pause execution"); res.json(e); }));
router.post("/:id/resume", asyncHandler(async (req, res) => { const e = playbookExecutionService.resumeExecution(req.user!.tenantId, req.params.id); if (!e) throw new AppError(400, "Cannot resume execution"); res.json(e); }));
router.delete("/:id", asyncHandler(async (req, res) => { playbookExecutionService.deleteExecution(req.user!.tenantId, req.params.id); res.status(204).send(); }));

export default router;
