import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";

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
    if (!entityType || !entityId) return res.status(400).json({ error: "entityType and entityId required" });

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
    res.status(201).json(share);
  })
);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userShares = shares.filter((s) => s.tenantId === tenantId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(userShares);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const share = shares.find((s) => s.id === req.params.id && s.tenantId === tenantId);
    if (!share) return res.status(404).json({ error: "Share link not found" });
    res.json(share);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const idx = shares.findIndex((s) => s.id === req.params.id && s.tenantId === tenantId);
    if (idx === -1) return res.status(404).json({ error: "Share link not found" });
    shares.splice(idx, 1);
    res.json({ success: true });
  })
);

router.get(
  "/access/:token",
  asyncHandler(async (req: Request, res: Response) => {
    const share = shares.find((s) => s.token === req.params.token);
    if (!share) return res.status(404).json({ error: "Share link not found or expired" });
    if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now())
      return res.status(410).json({ error: "Share link has expired" });
    const { password } = req.query;
    if (share.passwordHash) {
      if (!password) return res.status(401).json({ error: "Password required" });
      const inputHash = crypto.createHash("sha256").update(String(password)).digest("hex");
      if (inputHash !== share.passwordHash) return res.status(403).json({ error: "Invalid password" });
    }
    share.visits++;
    share.lastVisited = new Date().toISOString();
    res.json({ entityType: share.entityType, entityId: share.entityId, permissions: share.permissions });
  })
);

export default router;
