import { Router, Request, Response, NextFunction } from "express";
import { notificationDelivery } from "../services/NotificationDeliveryService";

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
    res.json({ deliveries: results });
  })
);

router.post(
  "/retry/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const record = await notificationDelivery.retry(req.params.id);
    if (!record) return res.status(404).json({ error: "Delivery not found or max attempts reached" });
    res.json(record);
  })
);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { channel, status, limit } = req.query;
    const deliveries = notificationDelivery.listDeliveries({
      channel: channel as string,
      status: status as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json(deliveries);
  })
);

router.get(
  "/stats",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(notificationDelivery.getStats());
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const delivery = notificationDelivery.getDelivery(req.params.id);
    if (!delivery) return res.status(404).json({ error: "Delivery not found" });
    res.json(delivery);
  })
);

export default router;
