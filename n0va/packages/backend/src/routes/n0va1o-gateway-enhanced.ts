import { Router, Request, Response, NextFunction } from "express";
import { n0va1oGatewayEnhancedService } from "../services/N0VA1OGatewayEnhancedService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.post("/jit/provision", asyncHandler(async (req, res) => {
  const { platform, scopes } = req.body;
  const result = n0va1oGatewayEnhancedService.provisionJITAuth(req.user!.tenantId, platform, scopes || []);
  sendSuccess(res, result);
}));

router.post("/jit/validate", asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const result = n0va1oGatewayEnhancedService.validateJITSession(sessionId);
  sendSuccess(res, result || { error: "Session not found or expired" });
}));

router.post("/jit/revoke", asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const result = n0va1oGatewayEnhancedService.revokeJITSession(sessionId);
  sendSuccess(res, { revoked: result });
}));

router.get("/jit/sessions", asyncHandler(async (req, res) => {
  const result = n0va1oGatewayEnhancedService.getActiveSessions(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/sandbox", asyncHandler(async (req, res) => {
  const { script, runtime } = req.body;
  const result = n0va1oGatewayEnhancedService.createSandbox(script, runtime || "python");
  sendSuccess(res, result);
}));

router.get("/sandbox/:sandboxId", asyncHandler(async (req, res) => {
  const result = n0va1oGatewayEnhancedService.getSandbox(req.params.sandboxId);
  sendSuccess(res, result || { error: "Sandbox not found" });
}));

router.post("/intent/resolve", asyncHandler(async (req, res) => {
  const { intent, platforms } = req.body;
  const result = n0va1oGatewayEnhancedService.resolveIntent(intent, platforms || []);
  sendSuccess(res, result || { error: "No matching route found" });
}));

router.get("/intents/:platform", asyncHandler(async (req, res) => {
  const result = n0va1oGatewayEnhancedService.getAvailableIntents(req.params.platform);
  sendSuccess(res, result);
}));

router.get("/accounts", asyncHandler(async (req, res) => {
  const { platform } = req.query;
  const result = n0va1oGatewayEnhancedService.getAccounts(req.user!.tenantId, platform as string || undefined);
  sendSuccess(res, result);
}));

router.post("/accounts/switch", asyncHandler(async (req, res) => {
  const { fromAccountId, toAccountId } = req.body;
  const result = n0va1oGatewayEnhancedService.switchAccount(req.user!.tenantId, fromAccountId, toAccountId);
  sendSuccess(res, { switched: result });
}));

router.post("/webhooks", asyncHandler(async (req, res) => {
  const { source, eventType, callbackUrl } = req.body;
  const result = n0va1oGatewayEnhancedService.registerWebhook(req.user!.tenantId, source, eventType, callbackUrl);
  sendSuccess(res, result);
}));

router.delete("/webhooks/:id", asyncHandler(async (req, res) => {
  const result = n0va1oGatewayEnhancedService.unregisterWebhook(req.params.id);
  sendSuccess(res, { unregistered: result });
}));

router.post("/webhooks/trigger", asyncHandler(async (req, res) => {
  const { source, eventType, payload } = req.body;
  const result = n0va1oGatewayEnhancedService.triggerWebhook(source, eventType, payload || {});
  sendSuccess(res, result);
}));

router.get("/webhooks", asyncHandler(async (req, res) => {
  const result = n0va1oGatewayEnhancedService.getWebhooks(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/catalog", asyncHandler(async (req, res) => {
  const result = n0va1oGatewayEnhancedService.getIntegrationCatalog();
  sendSuccess(res, result);
}));

export default router;
