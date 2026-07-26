import { Router, Request, Response, NextFunction } from "express";
import { developerPortalService } from "../services/DeveloperPortalService";
import { developerPortalOrchestrator } from "../business-logic/DeveloperPortalOrchestrator";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/keys",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const keys = developerPortalService.listKeys(tenantId);
    sendSuccess(res, keys, { count: keys.length });
  })
);

router.post(
  "/keys",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, scopes, expiresInDays } = req.body;
    if (!name) throw new AppError(400, "Key name is required");
    const key = developerPortalService.generateKey(tenantId, name, scopes || ["campaigns:read"], expiresInDays);
    sendCreated(res, key);
  })
);

router.post(
  "/keys/:id/revoke",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const revoked = developerPortalService.revokeKey(tenantId, req.params.id);
    if (!revoked) throw new AppError(404, "Key not found");
    sendSuccess(res, { success: true });
  })
);

router.delete(
  "/keys/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const deleted = developerPortalService.deleteKey(tenantId, req.params.id);
    if (!deleted) throw new AppError(404, "Key not found");
    res.status(204).send();
  })
);

router.get(
  "/scopes",
  asyncHandler(async (_req: Request, res: Response) => {
    const scopes = developerPortalService.getAvailableScopes();
    sendSuccess(res, scopes, { count: scopes.length });
  })
);

router.get(
  "/webhook-logs",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const logs = developerPortalService.getWebhookLogs(tenantId);
    sendSuccess(res, logs, { count: logs.length });
  })
);

router.get(
  "/usage",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const stats = developerPortalService.getApiUsageStats(tenantId);
    sendSuccess(res, stats);
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const dashboard = developerPortalOrchestrator.getDashboard(req.user!.tenantId);
    sendSuccess(res, dashboard, { healthBand: dashboard.healthBand, keysDueRotation: dashboard.apiHealth.keysDueRotation, anomalies: dashboard.usageAnomalies.filter(a => a.flagged).length });
  })
);

export default router;
