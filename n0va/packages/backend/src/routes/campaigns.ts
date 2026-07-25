import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { campaignService } from "../services/CampaignService";
import { AppError } from "../middleware/errorHandler";
import { webhookService } from "../services/WebhookService";
import { io } from "../index";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { status, type, search, page = "1", limit = "20" } = req.query;

    const filter: Record<string, any> = { tenantId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (search) filter.name = { $regex: search, $options: "i" };

    if (!DataStore.usingMemory()) {
      const result = await campaignService.find({
        tenantId,
        status: status as string | undefined,
        type: type as string | undefined,
        search: search as string | undefined,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      });
      res.json(result);
    } else {
      const p = parseInt(page as string, 10);
      const l = parseInt(limit as string, 10);
      const result = await DataStore.findCampaigns(filter, { createdAt: -1 }, (p - 1) * l, l);
      res.json(result);
    }
  })
);

router.get(
  "/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;

    if (!DataStore.usingMemory()) {
      const result = await campaignService.getDashboardMetrics(tenantId);
      res.json(result);
    } else {
      const campaigns = await DataStore.findCampaigns({ tenantId });
      const totalBudget = campaigns.campaigns.reduce((s: number, c: any) => s + (c.budget?.lifetime || 0), 0);
      const totalSpent = campaigns.campaigns.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0);
      const activeCampaigns = campaigns.campaigns.filter((c: any) => c.status === "active").length;
      const totalCampaigns = campaigns.total;

      const agg = await DataStore.aggregateMetrics([
        { $match: { tenantId } },
        { $group: { _id: null, totalImpressions: { $sum: "$impressions" }, totalClicks: { $sum: "$clicks" }, totalConversions: { $sum: "$conversions" }, totalSpend: { $sum: "$spend" }, totalRevenue: { $sum: "$revenue" } } },
      ]);

      const metrics = Array.isArray(agg) && agg.length > 0 ? agg[0] : { totalImpressions: 0, totalClicks: 0, totalConversions: 0, totalSpend: 0, totalRevenue: 0, avgCtr: 0, avgRoas: 0 };

      res.json({ totalCampaigns, activeCampaigns, totalBudget, totalSpent, remaining: totalBudget - totalSpent, metrics });
    }
  })
);

router.post(
  "/bulk",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { ids, action, value } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) throw new AppError(400, "Missing campaign IDs");
    if (!action) throw new AppError(400, "Missing action (status|budget|archive)");

    const results: { id: string; success: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        if (action === "status") {
          await DataStore.updateCampaign(id, tenantId, { status: value });
        } else if (action === "budget") {
          const c = await DataStore.findCampaignById(id, tenantId);
          if (c) {
            const update: any = { "budget.daily": value.daily || c.budget?.daily };
            if (value.lifetime) { update["budget.lifetime"] = value.lifetime; update["budget.remaining"] = value.lifetime - (c.budget?.spent || 0); }
            await DataStore.updateCampaign(id, tenantId, update);
          }
        } else if (action === "archive") {
          await DataStore.updateCampaign(id, tenantId, { status: "archived" });
        }
        results.push({ id, success: true });
      } catch (e: any) {
        results.push({ id, success: false, error: e.message });
      }
    }
    res.json({ results, total: ids.length, succeeded: results.filter((r) => r.success).length });
  })
);

router.get(
  "/metrics/timeseries",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { days = "30", granularity = "day" } = req.query;
    const dayCount = parseInt(days as string, 10);

    const metrics = await DataStore.findDailyMetrics(tenantId, dayCount);
    const campaigns = await DataStore.findCampaigns({ tenantId });

    const totalBudget = campaigns.campaigns.reduce((s: number, c: any) => s + (c.budget?.lifetime || 0), 0);
    const totalSpent = campaigns.campaigns.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0);

    const agg = await DataStore.aggregateMetrics([
      { $match: { tenantId } },
      { $group: { _id: null, totalImpressions: { $sum: "$impressions" }, totalClicks: { $sum: "$clicks" }, totalConversions: { $sum: "$conversions" }, totalSpend: { $sum: "$spend" }, totalRevenue: { $sum: "$revenue" } } },
    ]);

    const totals = Array.isArray(agg) && agg.length > 0 ? agg[0] : { totalImpressions: 0, totalClicks: 0, totalConversions: 0, totalSpend: 0, totalRevenue: 0 };

    const avgDailySpend = dayCount > 0 ? totals.totalSpend / dayCount : 0;
    const remaining = totalBudget - totalSpent;
    const daysRemaining = avgDailySpend > 0 ? Math.round(remaining / avgDailySpend) : 0;
    const projectedEndDate = new Date();
    projectedEndDate.setDate(projectedEndDate.getDate() + daysRemaining);

    res.json({
      daily: metrics,
      totals,
      budget: { total: totalBudget, spent: totalSpent, remaining, utilization: totalBudget > 0 ? parseFloat(((totalSpent / totalBudget) * 100).toFixed(1)) : 0 },
      forecast: { avgDailySpend, daysRemaining, projectedEndDate, willExceedBudget: daysRemaining <= dayCount * 0.7 },
      campaignCounts: { total: campaigns.campaigns.length, active: campaigns.campaigns.filter((c: any) => c.status === "active").length },
    });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    if (!DataStore.usingMemory()) {
      const campaign = await campaignService.findById(id, tenantId);
      if (!campaign) throw new AppError(404, "Campaign not found");
      res.json(campaign);
    } else {
      const campaign = await DataStore.findCampaignById(id, tenantId);
      if (!campaign) throw new AppError(404, "Campaign not found");
      res.json(campaign);
    }
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, type, budget, platforms, goal, startDate, endDate } = req.body;
    if (!name || !budget || !platforms) throw new AppError(400, "Missing required fields: name, budget, platforms");

    let campaign: any;
    if (!DataStore.usingMemory()) {
      campaign = await campaignService.create({
        tenantId,
        name,
        type: type || "performance",
        budget,
        platforms,
        goal,
        startDate,
        endDate,
        createdBy: req.user!.userId,
      });
    } else {
      campaign = await DataStore.createCampaign({
        tenantId,
        name,
        type: type || "performance",
        status: "draft",
        budget: { daily: budget.daily || 0, lifetime: budget.lifetime || 0, currency: budget.currency || "USD", spent: 0, remaining: budget.lifetime || 0 },
        platforms,
        goal,
        startDate,
        endDate,
        audiences: [],
        creatives: [],
        tags: [],
        kpis: {},
        hyperContext: { linkedTasks: [], linkedDocs: [], linkedSheets: [], linkedCalendar: [] },
        createdBy: req.user!.userId,
      });
    }

    webhookService.emit({
      type: "campaign.created",
      tenantId,
      source: "api",
      payload: { campaignId: campaign._id, name, type: type || "performance", platforms },
    });

    io.to(`tenant:${tenantId}`).emit("campaign:created", campaign);

    res.status(201).json(campaign);
  })
);

router.patch(
  "/:id/status",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { status } = req.body;
    if (!status) throw new AppError(400, "Missing status field");

    let campaign: any;
    if (!DataStore.usingMemory()) {
      campaign = await campaignService.updateStatus(id, tenantId, status);
      if (!campaign) throw new AppError(404, "Campaign not found");
    } else {
      campaign = await DataStore.updateCampaign(id, tenantId, { status });
      if (!campaign) throw new AppError(404, "Campaign not found");
    }

    const eventType = status === "active" ? "campaign.launched" : status === "paused" ? "campaign.paused" : "campaign.status_changed";
    webhookService.emit({
      type: eventType,
      tenantId,
      source: "api",
      payload: { campaignId: id, status, name: campaign.name },
    });

    io.to(`campaign:${id}`).emit(`campaign:${id}:update`, { status, updatedAt: new Date().toISOString() });

    res.json(campaign);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const update = req.body;
    const allowed = ["name", "type", "status", "goal", "platforms", "tags", "kpis", "hyperContext", "creatives", "audiences", "startDate", "endDate"];
    const filtered: Record<string, any> = {};
    for (const key of allowed) {
      if (update[key] !== undefined) filtered[key] = update[key];
    }
    const updated = await DataStore.updateCampaign(id, tenantId, filtered);
    if (!updated) throw new AppError(404, "Campaign not found");
    res.json(updated);
  })
);

router.patch(
  "/:id/budget",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { daily, lifetime } = req.body;

    let updated: any;
    if (!DataStore.usingMemory()) {
      updated = await campaignService.updateBudget(id, tenantId, { daily: daily || 0, lifetime: lifetime || 0 });
      if (!updated) throw new AppError(404, "Campaign not found");
    } else {
      const campaign = await DataStore.findCampaignById(id, tenantId);
      if (!campaign) throw new AppError(404, "Campaign not found");

      const update: any = {};
      if (daily !== undefined) update["budget.daily"] = daily;
      if (lifetime !== undefined) {
        update["budget.lifetime"] = lifetime;
        update["budget.remaining"] = lifetime - (campaign.budget?.spent || 0);
      }

      updated = await DataStore.updateCampaign(id, tenantId, update);
    }

    webhookService.emit({
      type: "campaign.budget_updated",
      tenantId,
      source: "api",
      payload: { campaignId: id, daily, lifetime },
    });

    res.json(updated);
  })
);

router.post(
  "/:id/clone",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    if (!DataStore.usingMemory()) {
      const original = await campaignService.findById(id, tenantId);
      if (!original) throw new AppError(404, "Campaign not found");
      const cloned = await campaignService.create({
        tenantId,
        name: `${original.name} (Copy)`,
        type: original.type,
        budget: original.budget,
        platforms: original.platforms,
        goal: original.goal,
        createdBy: req.user!.userId,
      });
      res.status(201).json(cloned);
    } else {
      const original = await DataStore.findCampaignById(id, tenantId);
      if (!original) throw new AppError(404, "Campaign not found");
      const cloned = await DataStore.createCampaign({
        tenantId,
        name: `${original.name} (Copy)`,
        type: original.type,
        status: "draft",
        budget: { ...original.budget, spent: 0, remaining: original.budget?.lifetime || 0 },
        platforms: [...(original.platforms || [])],
        goal: original.goal,
        audiences: [],
        creatives: [],
        tags: [...(original.tags || [])],
        kpis: {},
        hyperContext: { linkedTasks: [], linkedDocs: [], linkedSheets: [], linkedCalendar: [] },
        createdBy: req.user!.userId,
      });
      res.status(201).json(cloned);
    }
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    if (!DataStore.usingMemory()) {
      const deleted = await campaignService.delete(id, tenantId);
      if (!deleted) throw new AppError(404, "Campaign not found");
    } else {
      const deleted = await DataStore.deleteCampaign(id, tenantId);
      if (!deleted) throw new AppError(404, "Campaign not found");
    }
    res.status(204).send();
  })
);

export default router;


