import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import { n0va1oGatewayOrchestrator } from "../business-logic/N0VA1OGatewayOrchestrator";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (_req: Request, res: Response) => {
    const dashboard = await n0va1oGatewayOrchestrator.getDashboard();
    sendSuccess(res, dashboard);
  })
);

router.post(
  "/orchestrate/jit",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { platform, scopes } = req.body;
    if (!platform || !scopes) throw new AppError(400, "Missing required fields: platform, scopes");
    const session = await n0va1oGatewayOrchestrator.provisionJIT(tenantId, platform, scopes);
    sendCreated(res, session);
  })
);

router.get(
  "/orchestrate/jit/sessions",
  asyncHandler(async (req: Request, res: Response) => {
    const sessions = await n0va1oGatewayOrchestrator.getActiveSessions(req.user!.tenantId);
    sendSuccess(res, sessions, { count: sessions.length });
  })
);

router.post(
  "/orchestrate/sandbox",
  asyncHandler(async (req: Request, res: Response) => {
    const { script, runtime } = req.body;
    if (!script || !runtime) throw new AppError(400, "Missing required fields: script, runtime");
    const sandbox = await n0va1oGatewayOrchestrator.createSandbox(script, runtime);
    sendCreated(res, sandbox);
  })
);

router.get(
  "/orchestrate/intents/:platform",
  asyncHandler(async (req: Request, res: Response) => {
    const intents = await n0va1oGatewayOrchestrator.getAvailableIntents(req.params.platform);
    sendSuccess(res, intents, { count: intents.length });
  })
);

router.post(
  "/orchestrate/intents/resolve",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { intent, tenantPlatforms } = req.body;
    if (!intent || !tenantPlatforms) throw new AppError(400, "Missing required fields: intent, tenantPlatforms");
    const route = await n0va1oGatewayOrchestrator.resolveIntent(intent, tenantPlatforms);
    if (!route) throw new AppError(404, "No route found for this intent");
    sendSuccess(res, route);
  })
);

router.post(
  "/orchestrate/webhooks",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { source, eventType, callbackUrl } = req.body;
    if (!source || !eventType || !callbackUrl) throw new AppError(400, "Missing required fields: source, eventType, callbackUrl");
    const webhook = await n0va1oGatewayOrchestrator.registerWebhook(tenantId, source, eventType, callbackUrl);
    sendCreated(res, webhook);
  })
);

router.get(
  "/orchestrate/webhooks",
  asyncHandler(async (req: Request, res: Response) => {
    const webhooks = await n0va1oGatewayOrchestrator.getWebhooks(req.user!.tenantId);
    sendSuccess(res, webhooks, { count: webhooks.length });
  })
);

router.get(
  "/orchestrate/catalog",
  asyncHandler(async (_req: Request, res: Response) => {
    const dashboard = await n0va1oGatewayOrchestrator.getDashboard();
    sendSuccess(res, dashboard.integrationCatalog);
  })
);

export default router;
