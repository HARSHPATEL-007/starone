import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import { enhancedAgentOrchestrator } from "../business-logic/EnhancedAgentOrchestrator";
import { crossModuleIntegrationOrchestrator } from "../business-logic/CrossModuleIntegrationOrchestrator";
import { securityModifierOrchestrator } from "../business-logic/SecurityModifierOrchestrator";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

// ─── Enhanced Agent (section 6.2) ─────────────────────────────────

router.get(
  "/agents/definitions",
  asyncHandler(async (_req: Request, res: Response) => {
    const defs = await enhancedAgentOrchestrator.getDefinitions();
    sendSuccess(res, defs, { count: defs.length });
  })
);

router.get(
  "/agents/definitions/:type",
  asyncHandler(async (req: Request, res: Response) => {
    const def = await enhancedAgentOrchestrator.getDefinition(req.params.type);
    if (!def) throw new AppError(404, "Agent definition not found");
    sendSuccess(res, def);
  })
);

router.get(
  "/agents/schedules",
  asyncHandler(async (req: Request, res: Response) => {
    const schedules = await enhancedAgentOrchestrator.getSchedules(req.user!.tenantId);
    sendSuccess(res, schedules);
  })
);

router.get(
  "/agents/status",
  asyncHandler(async (req: Request, res: Response) => {
    const status = await enhancedAgentOrchestrator.getDetailedStatus(req.user!.tenantId);
    sendSuccess(res, status);
  })
);

router.get(
  "/agents/compliance",
  asyncHandler(async (req: Request, res: Response) => {
    const compliance = await enhancedAgentOrchestrator.getCompliance(req.user!.tenantId);
    sendSuccess(res, compliance);
  })
);

router.get(
  "/agents/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const dashboard = await enhancedAgentOrchestrator.getDashboard(req.user!.tenantId);
    sendSuccess(res, dashboard);
  })
);

// ─── Cross-Module Integration (section 5) ─────────────────────────

router.get(
  "/cross-module/matrix",
  asyncHandler(async (req: Request, res: Response) => {
    const action = req.query.action as string | undefined;
    const matrix = await crossModuleIntegrationOrchestrator.getMatrix(action);
    sendSuccess(res, matrix, { count: matrix.length });
  })
);

router.post(
  "/cross-module/execute",
  asyncHandler(async (req: Request, res: Response) => {
    const { sourceAction, sourceEntity } = req.body;
    if (!sourceAction || !sourceEntity) throw new AppError(400, "Missing required fields: sourceAction, sourceEntity");
    const log = await crossModuleIntegrationOrchestrator.executeAction(req.user!.tenantId, sourceAction, sourceEntity);
    sendSuccess(res, log);
  })
);

router.get(
  "/cross-module/history",
  asyncHandler(async (req: Request, res: Response) => {
    const history = await crossModuleIntegrationOrchestrator.getHistory(req.user!.tenantId);
    sendSuccess(res, history, { count: history.length });
  })
);

router.get(
  "/cross-module/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const dashboard = await crossModuleIntegrationOrchestrator.getDashboard(req.user!.tenantId);
    sendSuccess(res, dashboard);
  })
);

router.get(
  "/cross-module/summarize/:action",
  asyncHandler(async (req: Request, res: Response) => {
    const summary = await crossModuleIntegrationOrchestrator.summarize(req.params.action);
    if (!summary) throw new AppError(404, "Action not found in integration matrix");
    sendSuccess(res, summary);
  })
);

// ─── Security Modifiers (section 7.2) ─────────────────────────────

router.get(
  "/security/modifiers",
  asyncHandler(async (_req: Request, res: Response) => {
    const modifiers = await securityModifierOrchestrator.getModifiers();
    sendSuccess(res, modifiers, { count: modifiers.length });
  })
);

router.post(
  "/security/validate",
  asyncHandler(async (req: Request, res: Response) => {
    const { action, params } = req.body;
    if (!action) throw new AppError(400, "Missing required field: action");
    const result = await securityModifierOrchestrator.validateAction(action, params || {});
    sendSuccess(res, result);
  })
);

router.post(
  "/security/interrogate",
  asyncHandler(async (req: Request, res: Response) => {
    const { actionId, actionDescription, value, threshold } = req.body;
    if (!actionId || !actionDescription || value === undefined || !threshold) {
      throw new AppError(400, "Missing required fields: actionId, actionDescription, value, threshold");
    }
    const interrogation = await securityModifierOrchestrator.createInterrogation(actionId, actionDescription, value, threshold);
    sendCreated(res, interrogation);
  })
);

router.post(
  "/security/interrogate/:id/resolve",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { approved, signature } = req.body;
    if (approved === undefined || !signature) throw new AppError(400, "Missing required fields: approved, signature");
    const result = await securityModifierOrchestrator.resolveInterrogation(id, approved, signature);
    if (!result) throw new AppError(404, "Interrogation not found");
    sendSuccess(res, result);
  })
);

router.get(
  "/security/interrogate/pending",
  asyncHandler(async (_req: Request, res: Response) => {
    const pending = await securityModifierOrchestrator.getPendingInterrogations();
    sendSuccess(res, pending, { count: pending.length });
  })
);

export default router;
