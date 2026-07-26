import { Router, Request, Response, NextFunction } from "express";
import { MemoryStore } from "../services/MemoryStore";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendCreated, sendPaginated, computePagination, safeInt } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

function store() {
  return MemoryStore.getInstance();
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { type, read, page, limit } = req.query;
    const p = safeInt(page, 1);
    const lmt = safeInt(limit, 50);
    let notifications = store().find("notifications", (n: any) => n.tenantId === tenantId);
    if (type) notifications = notifications.filter((n: any) => n.type === type);
    if (read === "false") notifications = notifications.filter((n: any) => !n.read);
    if (read === "true") notifications = notifications.filter((n: any) => n.read);
    notifications.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = notifications.length;
    const paginated = notifications.slice((p - 1) * lmt, p * lmt);
    const unreadCount = notifications.filter((n: any) => !n.read).length;
    const typeCounts: Record<string, number> = {};
    for (const n of notifications) typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    const severityCounts: Record<string, number> = {};
    for (const n of notifications) severityCounts[n.severity || "info"] = (severityCounts[n.severity || "info"] || 0) + 1;
    sendPaginated(res, paginated, computePagination(p, lmt, total), { unreadCount, typeDistribution: typeCounts, severityDistribution: severityCounts });
  })
);

router.get(
  "/unread-count",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const count = store().find("notifications", (n: any) => n.tenantId === tenantId && !n.read).length;
    sendSuccess(res, { count });
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { type, title, message, severity, link } = req.body;
    if (!type || !title || !message) throw new AppError(400, "Missing required fields: type, title, message");
    const notification = store().insert("notifications", {
      tenantId,
      type,
      title,
      message,
      severity: severity || "info",
      read: false,
      link,
    });
    sendCreated(res, notification);
  })
);

router.patch(
  "/:id/read",
  asyncHandler(async (req: Request, res: Response) => {
    const updated = store().update("notifications", (n: any) => n._id === req.params.id, { read: true });
    if (!updated) throw new AppError(404, "Notification not found");
    sendSuccess(res, updated);
  })
);

router.patch(
  "/read-all",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const notifications = store().find("notifications", (n: any) => n.tenantId === tenantId && !n.read);
    for (const n of notifications) {
      store().update("notifications", (x: any) => x._id === n._id, { read: true });
    }
    sendSuccess(res, { markedRead: notifications.length });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const notification = store().find("notifications", (n: any) => n._id === req.params.id && n.tenantId === tenantId);
    if (!notification || notification.length === 0) throw new AppError(404, "Notification not found");
    sendSuccess(res, notification[0]);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const updated = store().update("notifications", (n: any) => n._id === req.params.id && n.tenantId === tenantId, req.body);
    if (!updated) throw new AppError(404, "Notification not found");
    sendSuccess(res, updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = store().delete("notifications", (n: any) => n._id === req.params.id);
    if (!deleted) throw new AppError(404, "Notification not found");
    res.status(204).send();
  })
);

export default router;
