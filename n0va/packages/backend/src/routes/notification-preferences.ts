import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const DEFAULT_PREFS = {
  email_alerts: true,
  push_alerts: true,
  fraud_alerts: true,
  budget_alerts: true,
  campaign_updates: true,
  agent_status: true,
  digest_frequency: "realtime",
  quiet_hours_start: "",
  quiet_hours_end: "",
};

router.get(
  "/defaults",
  asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, DEFAULT_PREFS);
  })
);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    let prefs = DataStore.mem().findOne("notification_prefs", (p: any) => p.tenantId === tenantId);
    if (!prefs) {
      prefs = DataStore.mem().insert("notification_prefs", { tenantId, ...DEFAULT_PREFS });
    }
    sendSuccess(res, prefs);
  })
);

router.put(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const allowed = [
      "email_alerts", "push_alerts", "fraud_alerts", "budget_alerts",
      "campaign_updates", "agent_status", "digest_frequency",
      "quiet_hours_start", "quiet_hours_end",
    ];
    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const existing = DataStore.mem().findOne("notification_prefs", (p: any) => p.tenantId === tenantId);
    if (existing) {
      const updated = DataStore.mem().update("notification_prefs", (p: any) => p.tenantId === tenantId, update);
      sendSuccess(res, updated);
    } else {
      const prefs = DataStore.mem().insert("notification_prefs", { tenantId, ...DEFAULT_PREFS, ...update });
      sendCreated(res, prefs);
    }
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const prefs = DataStore.mem().findOne("notification_prefs", (p: any) => p.tenantId === tenantId);
    const hasPrefs = !!prefs;
    const alertTypes = prefs ? Object.keys(prefs).filter((k) => k.endsWith("_alerts") && prefs[k] === true) : [];
    sendSuccess(res, { hasPrefs, digestFrequency: prefs?.digest_frequency || "none", alertTypes });
  })
);

export default router;
