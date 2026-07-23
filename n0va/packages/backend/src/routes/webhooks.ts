import { Router, Request, Response, NextFunction } from "express";
import { webhookService } from "../services/WebhookService";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const webhooks = webhookService.listWebhooks(tenantId);
    res.json(webhooks);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, url, events, secret, headers, retryCount, timeout } = req.body;
    if (!name || !url || !events) {
      throw new AppError(400, "Missing required fields: name, url, events");
    }
    const webhook = webhookService.registerWebhook({
      tenantId,
      name,
      url,
      events,
      secret,
      headers,
      retryCount: retryCount || 3,
      timeout: timeout || 10000,
      enabled: true,
    });
    res.status(201).json(webhook);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const webhook = webhookService.getWebhook(req.params.id);
    if (!webhook) throw new AppError(404, "Webhook not found");
    res.json(webhook);
  })
);

router.get(
  "/:id/deliveries",
  asyncHandler(async (req: Request, res: Response) => {
    const deliveries = webhookService.getDeliveries(req.params.id);
    res.json(deliveries);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = webhookService.deleteWebhook(req.params.id);
    if (!deleted) throw new AppError(404, "Webhook not found");
    res.status(204).send();
  })
);

router.post(
  "/test-emit",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { type, source, payload } = req.body;
    if (!type || !payload) throw new AppError(400, "Missing required fields: type, payload");
    await webhookService.emit({ type, tenantId, source: source || "api", payload });
    res.json({ success: true, eventType: type });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const webhook = webhookService.updateWebhook(req.params.id, req.body);
    if (!webhook) throw new AppError(404, "Webhook not found");
    res.json(webhook);
  })
);

router.get(
  "/sample/config",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(webhookService.generateSampleConfig());
  })
);

export default router;
