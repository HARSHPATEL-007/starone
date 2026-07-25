import { Router, Request, Response, NextFunction } from "express";
import { entityStore } from "../services/EntityStore";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

/* ---- Global Search ---- */
router.get(
  "/search",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const q = (req.query.q as string || "").trim().toLowerCase();
    if (!q) { res.json([]); return; }

    const allTypes = [
      "campaigns", "creatives", "audiences", "goals", "ab_tests",
      "competitive_intel", "funnels", "segments", "smart_lists",
      "content_library", "landing_pages", "social_posts", "keywords",
      "cost_tracker", "campaign_alerts", "automation_rules", "playbooks",
      "comments", "utm_links", "ad_copy", "campaign_snapshots",
      "surveys", "brand_kits", "media_kits", "team_members", "approvals",
    ];

    const results: { entityType: string; _id: string; label: string; subtitle: string }[] = [];

    for (const entityType of allTypes) {
      const items = entityStore.list(tenantId, entityType);
      for (const item of items) {
        const json = JSON.stringify(item.data).toLowerCase();
        if (json.includes(q)) {
          const name = item.data.name || item.data.title || item.data.label || item.data.email || item._id;
          const desc = item.data.description || item.data.role || item.data.platform || "";
          results.push({
            entityType,
            _id: item._id,
            label: String(name),
            subtitle: `${entityType}${desc ? ` — ${String(desc).slice(0, 80)}` : ""}`,
          });
        }
      }
    }

    res.json(results.slice(0, 50));
  })
);

/* ---- Team ---- */
router.get(
  "/team",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    res.json(entityStore.list(tenantId, "team_members").map((r) => ({ _id: r._id, ...r.data })));
  })
);

router.post(
  "/team",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const record = entityStore.create(tenantId, "team_members", req.body, req.user!.userId);
    res.status(201).json({ _id: record._id, ...record.data });
  })
);

router.patch(
  "/team/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const record = entityStore.get(req.params.id, tenantId);
    if (!record) throw new AppError(404, "Team member not found");
    const updated = entityStore.update(req.params.id, tenantId, req.body);
    res.json({ _id: updated!._id, ...updated!.data });
  })
);

router.delete(
  "/team/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!entityStore.delete(req.params.id, tenantId)) throw new AppError(404, "Team member not found");
    res.status(204).send();
  })
);

/* ---- Comments (per-entity scoped) ---- */
router.get(
  "/comments/:entityType/:entityId",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, entityId } = req.params;
    const results = entityStore.list(tenantId, "comments")
      .filter((r) => r.data.entityType === entityType && r.data.entityId === entityId)
      .map((r) => ({ _id: r._id, ...r.data }));
    res.json(results);
  })
);

router.post(
  "/comments/:entityType/:entityId",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, entityId } = req.params;
    const data = { ...req.body, entityType, entityId, authorId: req.user!.userId, createdAt: new Date().toISOString() };
    const record = entityStore.create(tenantId, "comments", data, req.user!.userId);
    res.status(201).json({ _id: record._id, ...record.data });
  })
);

router.delete(
  "/comments/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!entityStore.delete(req.params.id, tenantId)) throw new AppError(404, "Comment not found");
    res.status(204).send();
  })
);

/* ---- Approvals ---- */
router.get(
  "/approvals",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status as string;
    const results = entityStore.list(tenantId, "approvals", Object.keys(filter).length ? filter : undefined);
    res.json(results.map((r) => ({ _id: r._id, ...r.data })));
  })
);

router.post(
  "/approvals",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const data = { ...req.body, status: req.body.status || "pending", createdBy: req.user!.userId, createdAt: new Date().toISOString() };
    const record = entityStore.create(tenantId, "approvals", data, req.user!.userId);
    res.status(201).json({ _id: record._id, ...record.data });
  })
);

router.patch(
  "/approvals/:id/:action",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const record = entityStore.get(req.params.id, tenantId);
    if (!record) throw new AppError(404, "Approval not found");
    const { action } = req.params;
    if (!["approve", "reject", "pending"].includes(action)) throw new AppError(400, "Invalid action");
    const updated = entityStore.update(req.params.id, tenantId, { status: action, reviewedBy: req.user!.userId, reviewedAt: new Date().toISOString() });
    res.json({ _id: updated!._id, ...updated!.data });
  })
);

/* ---- Billing ---- */
router.get(
  "/billing/subscription",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      plan: "Transcendent",
      status: "active",
      periodStart: new Date(Date.now() - 86400000 * 30).toISOString(),
      periodEnd: new Date(Date.now() + 86400000 * 30).toISOString(),
      amount: 9999,
      currency: "USD",
      interval: "month",
      features: ["All Modules", "Unlimited Campaigns", "Unlimited Users", "Priority Support", "Custom Integration", "N0VA1O Gateway"],
    });
  })
);

router.get(
  "/billing/invoices",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    res.json(entityStore.list(tenantId, "billing_invoices").map((r) => ({ _id: r._id, ...r.data })));
  })
);

router.get(
  "/billing/invoices/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const record = entityStore.get(req.params.id, req.user!.tenantId);
    if (!record) throw new AppError(404, "Invoice not found");
    res.json({ _id: record._id, ...record.data });
  })
);

export default router;
