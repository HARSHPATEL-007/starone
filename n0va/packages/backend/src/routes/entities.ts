import { Router, Request, Response, NextFunction } from "express";
import { entityStore } from "../services/EntityStore";
import { AppError } from "../middleware/errorHandler";

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
];

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

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
    const results = entityStore.list(tenantId, entityType, Object.keys(filter).length ? filter : undefined);
    res.json(results.map((r) => ({ _id: r._id, ...r.data })));
  })
);

router.get(
  "/:entityType/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, id } = req.params;
    const record = entityStore.get(id, tenantId);
    if (!record || record.entityType !== entityType) {
      throw new AppError(404, "Entity not found");
    }
    res.json({ _id: record._id, ...record.data });
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
    const record = entityStore.create(tenantId, entityType, req.body, req.user!.userId);
    res.status(201).json({ _id: record._id, ...record.data });
  })
);

router.patch(
  "/:entityType/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, id } = req.params;
    const record = entityStore.get(id, tenantId);
    if (!record || record.entityType !== entityType) {
      throw new AppError(404, "Entity not found");
    }
    const updated = entityStore.update(id, tenantId, req.body);
    res.json({ _id: updated!._id, ...updated!.data });
  })
);

router.delete(
  "/:entityType/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, id } = req.params;
    const deleted = entityStore.delete(id, tenantId);
    if (!deleted) throw new AppError(404, "Entity not found");
    res.status(204).send();
  })
);

router.delete(
  "/:entityType",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType } = req.params;
    const count = entityStore.deleteAll(tenantId, entityType);
    res.json({ deleted: count });
  })
);

export default router;
