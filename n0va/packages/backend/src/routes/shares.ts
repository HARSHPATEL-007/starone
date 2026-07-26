import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { sendSuccess, sendCreated } from "./route-utils";
import { AppError } from "../middleware/errorHandler";

const router = Router();

interface ShareLink {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  token: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  passwordHash?: string;
  permissions: "view" | "edit";
  visits: number;
  lastVisited?: string;
}

const shares: ShareLink[] = [];

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

function generateToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, entityId, expiresInHours, password, permissions } = req.body;
    if (!entityType || !entityId) throw new AppError(400, "entityType and entityId required");

    const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3600000).toISOString() : undefined;
    const passwordHash = password ? crypto.createHash("sha256").update(password).digest("hex") : undefined;

    const share: ShareLink = {
      id: `sh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      entityType,
      entityId,
      token: generateToken(),
      createdBy: req.user!.userId,
      createdAt: new Date().toISOString(),
      expiresAt,
      passwordHash,
      permissions: permissions || "view",
      visits: 0,
    };

    shares.push(share);
    sendCreated(res, share);
  })
);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userShares = shares.filter((s) => s.tenantId === tenantId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    sendSuccess(res, userShares, { count: userShares.length });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const share = shares.find((s) => s.id === req.params.id && s.tenantId === tenantId);
    if (!share) throw new AppError(404, "Share link not found");
    sendSuccess(res, share);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const idx = shares.findIndex((s) => s.id === req.params.id && s.tenantId === tenantId);
    if (idx === -1) throw new AppError(404, "Share link not found");
    shares.splice(idx, 1);
    sendSuccess(res, { success: true });
  })
);

router.get(
  "/access/:token",
  asyncHandler(async (req: Request, res: Response) => {
    const share = shares.find((s) => s.token === req.params.token);
    if (!share) throw new AppError(404, "Share link not found or expired");
    if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now())
      throw new AppError(410, "Share link has expired");
    const { password } = req.query;
    if (share.passwordHash) {
      if (!password) throw new AppError(401, "Password required");
      const inputHash = crypto.createHash("sha256").update(String(password)).digest("hex");
      if (inputHash !== share.passwordHash) throw new AppError(403, "Invalid password");
    }
    share.visits++;
    share.lastVisited = new Date().toISOString();
    sendSuccess(res, { entityType: share.entityType, entityId: share.entityId, permissions: share.permissions });
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const tenantShares = shares.filter((s) => s.tenantId === tenantId);
    const now = Date.now();
    const activeShares = tenantShares.filter((s) => !s.expiresAt || new Date(s.expiresAt).getTime() > now).length;
    const expiredShares = tenantShares.filter((s) => s.expiresAt && new Date(s.expiresAt).getTime() <= now).length;
    const totalVisits = tenantShares.reduce((sum, s) => sum + (s.visits || 0), 0);
    const avgVisitsPerShare = tenantShares.length > 0 ? parseFloat((totalVisits / tenantShares.length).toFixed(2)) : 0;
    sendSuccess(res, { totalShares: tenantShares.length, activeShares, expiredShares, totalVisits, avgVisitsPerShare });
  })
);

export default router;
