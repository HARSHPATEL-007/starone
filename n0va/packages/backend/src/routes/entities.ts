import { Router, Request, Response, NextFunction } from "express";
import { entityStore } from "../services/EntityStore";
import { entityStoreOrchestrator } from "../business-logic/EntityStoreOrchestrator";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();

const VALID_ENTITY_TYPES = [
  "campaign_health",
  "lead_scoring_models",
  "lead_scores",
  "roi_scenarios",
  "goals",
  "competitive_intel",
  "customer_journeys",
  "funnels",
  "segments",
  "smart_lists",
  "channel_performance",
  "ab_tests",
  "content_library",
  "landing_pages",
  "social_posts",
  "keywords",
  "cost_tracker",
  "campaign_alerts",
  "automation_rules",
  "playbooks",
  "comments",
  "utm_links",
  "ad_copy",
  "campaign_snapshots",
  "campaign_archive",
  "surveys",
  "brand_kits",
  "media_kits",
  "team_members",
  "approvals",
  "campaign_boards",
  "launch_readiness",
  "marketing_forms",
  "audit_log",
  "user_profile",
  "report_history",
  "billing_invoices",
  "approval_history",
  "campaign_templates",
  "rule_executions",
  "billing_subscriptions",
];

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const dashboard = await entityStoreOrchestrator.getDashboard(req.user!.tenantId);
    sendSuccess(res, dashboard, { totalRecords: dashboard.totalRecords, entityTypes: dashboard.entityTypes.length, healthBand: dashboard.healthBand });
  })
);

router.get(
  "/:entityType",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType } = req.params;
    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      throw new AppError(400, `Invalid entity type: ${entityType}`);
    }
    const { search, ...rest } = req.query;
    const filter: Record<string, unknown> = {};
    if (search) filter.search = search as string;
    for (const [k, v] of Object.entries(rest)) {
      if (typeof v === "string") filter[k] = v;
    }
    const results = await entityStore.list(tenantId, entityType, Object.keys(filter).length ? filter : undefined);
    sendSuccess(res, results, { count: results.length, entityType });
  })
);

router.get(
  "/:entityType/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, id } = req.params;
    const record = await entityStore.get(id, tenantId);
    if (!record) {
      throw new AppError(404, "Entity not found");
    }
    sendSuccess(res, record);
  })
);

router.post(
  "/:entityType",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType } = req.params;
    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      throw new AppError(400, `Invalid entity type: ${entityType}`);
    }
    const record = await entityStore.create(tenantId, entityType, req.body, req.user!.userId);
    sendCreated(res, record);
  })
);

router.patch(
  "/:entityType/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, id } = req.params;
    const record = await entityStore.get(id, tenantId);
    if (!record) {
      throw new AppError(404, "Entity not found");
    }
    const updated = await entityStore.update(id, tenantId, req.body);
    sendSuccess(res, updated);
  })
);

router.delete(
  "/:entityType/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, id } = req.params;
    const deleted = await entityStore.delete(id, tenantId);
    if (!deleted) throw new AppError(404, "Entity not found");
    res.status(204).send();
  })
);

router.delete(
  "/:entityType",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType } = req.params;
    const count = await entityStore.deleteAll(tenantId, entityType);
    sendSuccess(res, { deleted: count });
  })
);

export default router;


