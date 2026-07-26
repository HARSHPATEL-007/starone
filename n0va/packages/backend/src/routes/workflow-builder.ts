import { Router, Request, Response, NextFunction } from "express";
import { workflowBuilderService } from "../services/WorkflowBuilderService";
import { workflowBuilderOrchestrator } from "../business-logic/WorkflowBuilderOrchestrator";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "./route-utils";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/node-types", asyncHandler(async (_req, res) => res.json(workflowBuilderService.getNodeTypes())));
router.get("/categories", asyncHandler(async (_req, res) => res.json(workflowBuilderService.getCategories())));
router.get("/", asyncHandler(async (req, res) => res.json(workflowBuilderService.listWorkflows(req.user!.tenantId))));
router.get("/orchestrate", asyncHandler(async (req, res) => { sendSuccess(res, workflowBuilderOrchestrator.analyzeAll(req.user!.tenantId)); }));
router.get("/:id", asyncHandler(async (req, res) => { const w = workflowBuilderService.getWorkflow(req.user!.tenantId, req.params.id); if (!w) throw new AppError(404, "Workflow not found"); res.json(w); }));
router.post("/", asyncHandler(async (req, res) => { const { name, description, category, nodes, edges } = req.body; if (!name) throw new AppError(400, "Name required"); res.status(201).json(workflowBuilderService.saveWorkflow(req.user!.tenantId, { name, description, category, nodes, edges })); }));
router.put("/:id", asyncHandler(async (req, res) => { const w = workflowBuilderService.updateWorkflow(req.user!.tenantId, req.params.id, req.body); if (!w) throw new AppError(404, "Workflow not found"); res.json(w); }));
router.delete("/:id", asyncHandler(async (req, res) => { workflowBuilderService.deleteWorkflow(req.user!.tenantId, req.params.id); res.status(204).send(); }));
router.post("/:id/activate", asyncHandler(async (req, res) => { const w = workflowBuilderService.activateWorkflow(req.user!.tenantId, req.params.id); if (!w) throw new AppError(404, "Workflow not found"); res.json(w); }));
router.post("/:id/deactivate", asyncHandler(async (req, res) => { const w = workflowBuilderService.deactivateWorkflow(req.user!.tenantId, req.params.id); if (!w) throw new AppError(404, "Workflow not found"); res.json(w); }));
router.post("/:id/test-run", asyncHandler(async (req, res) => { try { const result = workflowBuilderService.testRun(req.user!.tenantId, req.params.id); res.json(result); } catch (e: any) { throw new AppError(400, e.message); } }));
router.post("/:id/execute", asyncHandler(async (req, res) => { try { const result = workflowBuilderService.executeWorkflow(req.user!.tenantId, req.params.id, req.body); res.json(result); } catch (e: any) { throw new AppError(400, e.message); } }));
router.get("/:id/executions", asyncHandler(async (req, res) => res.json(workflowBuilderService.getExecutions(req.user!.tenantId, req.params.id))));

export default router;
