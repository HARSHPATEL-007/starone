import { Router, Request, Response, NextFunction } from "express";
import { exportService } from "../services/ExportService";
import { exportOrchestrator } from "../business-logic/ExportOrchestrator";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, fields, format, filters, sample } = req.body;
    if (!entityType) return res.status(400).json({ error: "entityType is required" });
    const result = await exportService.exportData({
      entityType, tenantId, fields, format: format || "csv", filters, sample,
    });
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.send(result.data);
  })
);

router.get(
  "/fields/:entityType",
  asyncHandler(async (req: Request, res: Response) => {
    const { entityType } = req.params;
    const { ExportService } = await import("../services/ExportService");
    const svc = new ExportService();
    const fields = (svc as any).getDefaultFields(entityType);
    sendSuccess(res, { entityType, fields });
  })
);

router.get("/audit", asyncHandler(async (req: Request, res: Response) => {
  const audit = await exportOrchestrator.crossEntityAudit(req.user!.tenantId);
  sendSuccess(res, audit);
}));

router.get("/statistics", asyncHandler(async (req: Request, res: Response) => {
  const overview = await exportOrchestrator.statisticalOverview(req.user!.tenantId);
  sendSuccess(res, overview);
}));

export default router;
