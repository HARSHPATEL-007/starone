import { Router, Request, Response, NextFunction } from "express";
import { adminService } from "../services/AdminService";
import { adminOrchestrator } from "../business-logic/AdminOrchestrator";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

function adminOnly(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") return next(new AppError(403, "Admin access required"));
  next();
}

router.use(adminOnly);

router.get("/stats", asyncHandler(async (_req, res) => {
  const stats = adminService.getAdminStats();
  sendSuccess(res, stats);
}));

router.get("/tenants", asyncHandler(async (_req, res) => {
  const tenants = adminService.getTenants();
  sendSuccess(res, tenants, { count: Array.isArray(tenants) ? tenants.length : 0 });
}));

router.get("/tenants/:id", asyncHandler(async (req, res) => {
  const t = adminService.getTenant(req.params.id);
  if (!t) throw new AppError(404, "Tenant not found");
  sendSuccess(res, t);
}));

router.patch("/tenants/:id", asyncHandler(async (req, res) => {
  const t = adminService.updateTenant(req.params.id, req.body);
  if (!t) throw new AppError(404, "Tenant not found");
  sendSuccess(res, t);
}));

router.get("/features", asyncHandler(async (_req, res) => {
  const features = adminService.getAvailableFeatures();
  sendSuccess(res, features);
}));

router.get("/audit-log", asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const log = adminService.getAuditLog(limit);
  sendSuccess(res, log, { count: Array.isArray(log) ? log.length : 0 });
}));

export default router;
