import { Router, Request, Response, NextFunction } from "express";
import { MemoryStore } from "../services/MemoryStore";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

function store() {
  return MemoryStore.getInstance();
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { type, read, limit = "50" } = req.query;
    let notifications = store().find("notifications", (n: any) => n.tenantId === tenantId);
    if (type) notifications = notifications.filter((n: any) => n.type === type);
    if (read === "false") notifications = notifications.filter((n: any) => !n.read);
    if (read === "true") notifications = notifications.filter((n: any) => n.read);
    notifications.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(notifications.slice(0, parseInt(limit as string, 10)));
  })
);

router.get(
  "/unread-count",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const count = store().find("notifications", (n: any) => n.tenantId === tenantId && !n.read).length;
    res.json({ count });
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
    res.status(201).json(notification);
  })
);

router.patch(
  "/:id/read",
  asyncHandler(async (req: Request, res: Response) => {
    const updated = store().update("notifications", (n: any) => n._id === req.params.id, { read: true });
    if (!updated) throw new AppError(404, "Notification not found");
    res.json(updated);
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
    res.json({ success: true, markedRead: notifications.length });
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
