import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { ruleEngine } from "../services/RuleEngineService";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { status } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (status === "enabled") filter.enabled = true;
    else if (status === "disabled") filter.enabled = false;
    const rules: any[] = DataStore.mem().find("automation_rules", (r: any) => {
      for (const [k, v] of Object.entries(filter)) if (r[k] !== v) return false;
      return true;
    }).reverse();
    const enabled = rules.filter(r => r.enabled).length;
    const disabled = rules.filter(r => !r.enabled).length;
    sendSuccess(res, rules, { count: rules.length, enabledCount: enabled, disabledCount: disabled });
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, description, enabled, config } = req.body;
    if (!name) throw new AppError(400, "Missing required field: name");
    const rule = DataStore.mem().insert("automation_rules", {
      tenantId, name, description: description || "", enabled: enabled !== undefined ? enabled : true,
      config: { trigger: config?.trigger || "", conditions: config?.conditions || {}, action: config?.action || "", actionParams: config?.actionParams || {}, cooldownMinutes: config?.cooldownMinutes ?? 30 },
      createdBy: req.user!.userId,
    });
    sendCreated(res, rule);
  })
);

router.get(
  "/executions",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const history = ruleEngine.getExecutionHistory(tenantId);
    sendSuccess(res, history, { count: Array.isArray(history) ? history.length : 0 });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const rule = DataStore.mem().findOne("automation_rules", (r: any) => r._id === req.params.id && r.tenantId === tenantId);
    if (!rule) throw new AppError(404, "Automation rule not found");
    sendSuccess(res, rule);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const allowed = ["name", "description", "enabled", "config"];
    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const updated = DataStore.mem().update("automation_rules", (r: any) => r._id === req.params.id && r.tenantId === tenantId, update);
    if (!updated) throw new AppError(404, "Automation rule not found");
    sendSuccess(res, updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const deleted = DataStore.mem().delete("automation_rules", (r: any) => r._id === req.params.id && r.tenantId === tenantId);
    if (!deleted) throw new AppError(404, "Automation rule not found");
    res.status(204).send();
  })
);

router.post(
  "/:id/evaluate",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const rule = DataStore.mem().findOne("automation_rules", (r: any) => r._id === req.params.id && r.tenantId === tenantId);
    if (!rule) throw new AppError(404, "Automation rule not found");
    const result = await ruleEngine.evaluateRule(rule, tenantId);
    sendSuccess(res, result);
  })
);

router.post(
  "/evaluate-all",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const results = await ruleEngine.evaluateAllRules(tenantId);
    sendSuccess(res, results, { count: Array.isArray(results) ? results.length : 0 });
  })
);

router.post(
  "/:id/toggle",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const rule = DataStore.mem().findOne("automation_rules", (r: any) => r._id === req.params.id && r.tenantId === tenantId);
    if (!rule) throw new AppError(404, "Automation rule not found");
    const updated = DataStore.mem().update("automation_rules", (r: any) => r._id === req.params.id && r.tenantId === tenantId, { enabled: !rule.enabled });
    sendSuccess(res, updated);
  })
);

export default router;
