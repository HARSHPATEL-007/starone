import { Router, Request, Response, NextFunction } from "express";
import { adminService } from "../services/AdminService";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

function adminOnly(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") return next(new AppError(403, "Admin access required"));
  next();
}

router.use(adminOnly);

router.get("/stats", asyncHandler(async (_req, res) => res.json(adminService.getAdminStats())));
router.get("/tenants", asyncHandler(async (_req, res) => res.json(adminService.getTenants())));
router.get("/tenants/:id", asyncHandler(async (req, res) => { const t = adminService.getTenant(req.params.id); if (!t) throw new AppError(404, "Tenant not found"); res.json(t); }));
router.patch("/tenants/:id", asyncHandler(async (req, res) => { const t = adminService.updateTenant(req.params.id, req.body); if (!t) throw new AppError(404, "Tenant not found"); res.json(t); }));
router.get("/features", asyncHandler(async (_req, res) => res.json(adminService.getAvailableFeatures())));
router.get("/audit-log", asyncHandler(async (req, res) => { const limit = req.query.limit ? Number(req.query.limit) : 50; res.json(adminService.getAuditLog(limit)); }));

export default router;
