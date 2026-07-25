import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { entityStore } from "../services/EntityStore";
import { EntityRecord } from "../models/EntityRecord";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
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

    if (mongoose.connection.readyState === 1) {
      const regex = new RegExp(q, "i");
      const results = await EntityRecord.find({
        tenantId,
        entityType: { $in: allTypes },
        $or: [
          { "data.name": regex },
          { "data.title": regex },
          { "data.label": regex },
          { "data.email": regex },
          { "data.description": regex },
        ],
      }).sort({ createdAt: -1 }).limit(50).lean();
      return res.json(results.map((r: any) => ({
        entityType: r.entityType,
        _id: r._id.toString(),
        label: r.data.name || r.data.title || r.data.label || r.data.email || r._id.toString(),
        subtitle: `${r.entityType}${r.data.description ? ` — ${String(r.data.description).slice(0, 80)}` : ""}`,
      })));
    }

    const results: { entityType: string; _id: string; label: string; subtitle: string }[] = [];
    for (const entityType of allTypes) {
      const items = await entityStore.list(tenantId, entityType);
      for (const item of items) {
        const json = JSON.stringify(item).toLowerCase();
        if (json.includes(q)) {
          const name = (item as any).name || (item as any).title || (item as any).label || (item as any).email || item._id;
          const desc = (item as any).description || (item as any).role || (item as any).platform || "";
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
    const results = await entityStore.list(tenantId, "team_members");
    res.json(results);
  })
);

router.post(
  "/team",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const record = await entityStore.create(tenantId, "team_members", req.body, req.user!.userId);
    res.status(201).json(record);
  })
);

router.patch(
  "/team/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const record = await entityStore.get(req.params.id, tenantId);
    if (!record) throw new AppError(404, "Team member not found");
    const updated = await entityStore.update(req.params.id, tenantId, req.body);
    res.json(updated);
  })
);

router.delete(
  "/team/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const deleted = await entityStore.delete(req.params.id, tenantId);
    if (!deleted) throw new AppError(404, "Team member not found");
    res.status(204).send();
  })
);

/* ---- Comments (per-entity scoped) ---- */
router.get(
  "/comments/:entityType/:entityId",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, entityId } = req.params;
    if (mongoose.connection.readyState === 1) {
      const results = await EntityRecord.find({
        tenantId, entityType: "comments",
        "data.entityType": entityType, "data.entityId": entityId,
      }).sort({ createdAt: -1 }).lean();
      return res.json(results.map((r: any) => ({ _id: r._id.toString(), ...r.data })));
    }
    const items = await entityStore.list(tenantId, "comments");
    const results = items.filter((r: any) => r.entityType === entityType && r.entityId === entityId);
    res.json(results);
  })
);

router.post(
  "/comments/:entityType/:entityId",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entityType, entityId } = req.params;
    const data = { ...req.body, entityType, entityId, authorId: req.user!.userId, createdAt: new Date().toISOString() };
    const record = await entityStore.create(tenantId, "comments", data, req.user!.userId);
    res.status(201).json(record);
  })
);

router.delete(
  "/comments/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const deleted = await entityStore.delete(req.params.id, tenantId);
    if (!deleted) throw new AppError(404, "Comment not found");
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
    const results = await entityStore.list(tenantId, "approvals", Object.keys(filter).length ? filter : undefined);
    res.json(results);
  })
);

router.post(
  "/approvals",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const data = { ...req.body, status: req.body.status || "pending", createdBy: req.user!.userId, createdAt: new Date().toISOString() };
    const record = await entityStore.create(tenantId, "approvals", data, req.user!.userId);
    res.status(201).json(record);
  })
);

router.patch(
  "/approvals/:id/:action",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const record = await entityStore.get(req.params.id, tenantId);
    if (!record) throw new AppError(404, "Approval not found");
    const { action } = req.params;
    if (!["approve", "reject", "pending"].includes(action)) throw new AppError(400, "Invalid action");
    const updated = await entityStore.update(req.params.id, tenantId, {
      status: action, reviewedBy: req.user!.userId, reviewedAt: new Date().toISOString(),
    });
    res.json(updated);
  })
);

/* ---- Billing ---- */
router.get(
  "/billing/subscription",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (mongoose.connection.readyState === 1) {
      const subs = await EntityRecord.find({ tenantId, entityType: "billing_subscriptions" })
        .sort({ createdAt: -1 }).limit(1).lean();
      if (subs.length > 0) {
        const s: any = subs[0];
        return res.json({ _id: s._id.toString(), ...s.data });
      }
    }
    res.json({
      plan: "Transcendent", status: "active",
      periodStart: new Date(Date.now() - 86400000 * 30).toISOString(),
      periodEnd: new Date(Date.now() + 86400000 * 30).toISOString(),
      amount: 9999, currency: "USD", interval: "month",
      features: ["All Modules", "Unlimited Campaigns", "Unlimited Users", "Priority Support", "Custom Integration", "N0VA1O Gateway"],
    });
  })
);

router.post(
  "/billing/subscription",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const record = await entityStore.create(tenantId, "billing_subscriptions", req.body, req.user!.userId);
    res.status(201).json(record);
  })
);

router.get(
  "/billing/invoices",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const results = await entityStore.list(tenantId, "billing_invoices");
    res.json(results);
  })
);

router.get(
  "/billing/invoices/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const record = await entityStore.get(req.params.id, req.user!.tenantId);
    if (!record) throw new AppError(404, "Invoice not found");
    res.json(record);
  })
);

router.post(
  "/billing/invoices",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const record = await entityStore.create(tenantId, "billing_invoices", req.body, req.user!.userId);
    res.status(201).json(record);
  })
);

export default router;


