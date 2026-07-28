import { Router, Request, Response, NextFunction } from "express";
import { campaignAlertOrchestrator } from "../services/CampaignAlertOrchestratorService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/rules", asyncHandler(async (req, res) => {
  const status = req.query.status as string | undefined;
  const rules = campaignAlertOrchestrator.getRules(req.user!.tenantId, status as any);
  sendSuccess(res, rules);
}));

router.get("/rules/:ruleId", asyncHandler(async (req, res) => {
  const rule = campaignAlertOrchestrator.getRule(req.params.ruleId, req.user!.tenantId);
  sendSuccess(res, rule || { error: "Rule not found" });
}));

router.post("/rules", asyncHandler(async (req, res) => {
  const rule = campaignAlertOrchestrator.createRule(req.user!.tenantId, req.body);
  sendSuccess(res, rule);
}));

router.put("/rules/:ruleId", asyncHandler(async (req, res) => {
  const rule = campaignAlertOrchestrator.updateRule(req.params.ruleId, req.user!.tenantId, req.body);
  sendSuccess(res, rule || { error: "Rule not found" });
}));

router.delete("/rules/:ruleId", asyncHandler(async (req, res) => {
  const deleted = campaignAlertOrchestrator.deleteRule(req.params.ruleId, req.user!.tenantId);
  sendSuccess(res, { deleted });
}));

router.post("/evaluate", asyncHandler(async (req, res) => {
  const alerts = campaignAlertOrchestrator.evaluateRules(req.user!.tenantId);
  sendSuccess(res, { generated: alerts.length, alerts });
}));

router.get("/alerts", asyncHandler(async (req, res) => {
  const status = req.query.status as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const alerts = campaignAlertOrchestrator.getAlerts(req.user!.tenantId, status as any, limit);
  sendSuccess(res, alerts);
}));

router.post("/alerts/:alertId/acknowledge", asyncHandler(async (req, res) => {
  const userId = req.body.userId || req.user!.id || "system";
  const alert = campaignAlertOrchestrator.acknowledgeAlert(req.params.alertId, req.user!.tenantId, userId);
  sendSuccess(res, alert || { error: "Alert not found or already acknowledged" });
}));

router.post("/alerts/:alertId/resolve", asyncHandler(async (req, res) => {
  const userId = req.body.userId || req.user!.id || "system";
  const alert = campaignAlertOrchestrator.resolveAlert(req.params.alertId, req.user!.tenantId, userId);
  sendSuccess(res, alert || { error: "Alert not found" });
}));

router.post("/alerts/:alertId/dismiss", asyncHandler(async (req, res) => {
  const alert = campaignAlertOrchestrator.dismissAlert(req.params.alertId, req.user!.tenantId);
  sendSuccess(res, alert || { error: "Alert not found" });
}));

router.get("/summary", asyncHandler(async (req, res) => {
  const summary = campaignAlertOrchestrator.getAlertSummary(req.user!.tenantId);
  sendSuccess(res, summary);
}));

export default router;