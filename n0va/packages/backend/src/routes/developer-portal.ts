import { Router, Request, Response, NextFunction } from "express";
import { developerPortalService } from "../services/DeveloperPortalService";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/keys",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    res.json(developerPortalService.listKeys(tenantId));
  })
);

router.post(
  "/keys",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, scopes, expiresInDays } = req.body;
    if (!name) throw new AppError(400, "Key name is required");
    const key = developerPortalService.generateKey(tenantId, name, scopes || ["campaigns:read"], expiresInDays);
    res.status(201).json(key);
  })
);

router.post(
  "/keys/:id/revoke",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const revoked = developerPortalService.revokeKey(tenantId, req.params.id);
    if (!revoked) throw new AppError(404, "Key not found");
    res.json({ success: true });
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
    res.json(developerPortalService.getAvailableScopes());
  })
);

router.get(
  "/webhook-logs",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    res.json(developerPortalService.getWebhookLogs(tenantId));
  })
);

router.get(
  "/usage",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    res.json(developerPortalService.getApiUsageStats(tenantId));
  })
);

export default router;
