import { Router, Request, Response, NextFunction } from "express";
import { notificationDelivery } from "../services/NotificationDeliveryService";
import { sendSuccess, sendCreated, sendPaginated, computePagination, safeInt } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/send",
  asyncHandler(async (req: Request, res: Response) => {
    const { notificationId, title, message, channels } = req.body;
    if (!notificationId || !channels || !channels.length)
      return res.status(400).json({ error: "notificationId and channels required" });
    const results = await notificationDelivery.send({ notificationId, title, message, channels });
    const successCount = results.filter((r: any) => r.status === "sent" || r.status === "delivered").length;
    sendSuccess(res, { deliveries: results }, { totalChannels: channels.length, successCount, failureCount: results.length - successCount });
  })
);

router.post(
  "/retry/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const record = await notificationDelivery.retry(req.params.id);
    if (!record) return res.status(404).json({ error: "Delivery not found or max attempts reached" });
    sendSuccess(res, record);
  })
);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { channel, status } = req.query;
    const page = safeInt(req.query.page, 1);
    const limit = safeInt(req.query.limit, 20);
    const deliveries = notificationDelivery.listDeliveries({
      channel: channel as string, status: status as string, limit: undefined,
    });
    const arr = Array.isArray(deliveries) ? deliveries : [];
    const total = arr.length;
    const paginated = arr.slice((page - 1) * limit, page * limit);
    const channelDist: Record<string, number> = {};
    const statusDist: Record<string, number> = {};
    for (const d of arr) {
      channelDist[d.channel || "unknown"] = (channelDist[d.channel || "unknown"] || 0) + 1;
      statusDist[d.status || "unknown"] = (statusDist[d.status || "unknown"] || 0) + 1;
    }
    const meta: Record<string, unknown> = { totalDeliveries: total, channelDistribution: channelDist, statusDistribution: statusDist };
    sendPaginated(res, paginated, computePagination(page, limit, total), meta);
  })
);

router.get(
  "/stats",
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = notificationDelivery.getStats();
    sendSuccess(res, stats);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const delivery = notificationDelivery.getDelivery(req.params.id);
    if (!delivery) return res.status(404).json({ error: "Delivery not found" });
    sendSuccess(res, delivery);
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = notificationDelivery.getStats();
    sendSuccess(res, { status: "operational", ...stats });
  })
);

export default router;
