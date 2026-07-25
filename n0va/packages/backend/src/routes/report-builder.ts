import { Router, Request, Response, NextFunction } from "express";
import { reportBuilderService } from "../services/ReportBuilderService";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/reports",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const reports = reportBuilderService.getReports(tenantId);
    res.json(reports);
  })
);

router.get(
  "/reports/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const report = reportBuilderService.getReport(tenantId, req.params.id);
    if (!report) throw new AppError(404, "Report not found");
    res.json(report);
  })
);

router.post(
  "/reports",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, description, dateRange, startDate, endDate, widgets } = req.body;
    if (!name) throw new AppError(400, "Report name is required");
    const report = reportBuilderService.createReport(tenantId, { name, description, dateRange, startDate, endDate, widgets });
    res.status(201).json(report);
  })
);

router.patch(
  "/reports/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const report = reportBuilderService.updateReport(tenantId, req.params.id, req.body);
    if (!report) throw new AppError(404, "Report not found");
    res.json(report);
  })
);

router.delete(
  "/reports/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const deleted = reportBuilderService.deleteReport(tenantId, req.params.id);
    if (!deleted) throw new AppError(404, "Report not found");
    res.status(204).send();
  })
);

router.post(
  "/reports/:id/generate",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const data = reportBuilderService.generateReportData(tenantId, req.params.id);
    res.json(data);
  })
);

router.post(
  "/reports/:id/schedule",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { frequency, dayOfWeek, dayOfMonth, time, recipients, format } = req.body;
    if (!frequency || !time || !recipients?.length) throw new AppError(400, "Missing schedule fields");
    const report = reportBuilderService.scheduleReport(tenantId, req.params.id, { frequency, dayOfWeek, dayOfMonth, time, recipients, format });
    if (!report) throw new AppError(404, "Report not found");
    res.json(report);
  })
);

router.post(
  "/reports/:id/unschedule",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const report = reportBuilderService.removeSchedule(tenantId, req.params.id);
    if (!report) throw new AppError(404, "Report not found");
    res.json(report);
  })
);

router.get(
  "/metrics",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ metrics: reportBuilderService.getAvailableMetrics(), chartTypes: reportBuilderService.getChartTypes() });
  })
);

router.get(
  "/default-widgets",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(reportBuilderService.getDefaultWidgets());
  })
);

export default router;
