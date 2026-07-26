import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { campaignService } from "../services/CampaignService";
import { AppError } from "../middleware/errorHandler";
import { webhookService } from "../services/WebhookService";
import { io } from "../index";
import { computePagination, sendPaginated, sendSuccess, sendCreated, safeInt, pickAllowed } from "./route-utils";
import { campaignLaunchOrchestrator } from "../business-logic/CampaignLaunchOrchestrator";
import { portfolioHealthOrchestrator } from "../business-logic/PortfolioHealthOrchestrator";
import { budgetAlertOrchestrator } from "../business-logic/BudgetAlertOrchestrator";
import { campaignLifecycleOrchestrator } from "../business-logic/CampaignLifecycleOrchestrator";
import { budgetOptimizationOrchestrator } from "../business-logic/BudgetOptimizationOrchestrator";
import { roasDecompositionOrchestrator } from "../business-logic/ROASDecompositionOrchestrator";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { status, type, search } = req.query;
    const page = safeInt(req.query.page, 1);
    const limit = safeInt(req.query.limit, 20);

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
        page,
        limit,
      });
      const total = (result as any).total || 0;
      const items = (result as any).campaigns || result;
      const pagination = computePagination(page, limit, total);
      sendPaginated(res, items, pagination, { tenantId });
    } else {
      const offset = (page - 1) * limit;
      const result = await DataStore.findCampaigns(filter, { createdAt: -1 }, offset, limit);
      const total = result.total;
      const pagination = computePagination(page, limit, total);
      sendPaginated(res, result.campaigns, pagination, { tenantId });
    }
  })
);

router.get(
  "/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;

    if (!DataStore.usingMemory()) {
      const result = await campaignService.getDashboardMetrics(tenantId);
      sendSuccess(res, result);
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

      const metrics = Array.isArray(agg) && agg.length > 0
        ? { ...agg[0], avgCtr: agg[0].totalImpressions > 0 ? parseFloat(((agg[0].totalClicks / agg[0].totalImpressions) * 100).toFixed(2)) : 0, avgRoas: agg[0].totalSpend > 0 ? parseFloat((agg[0].totalRevenue / agg[0].totalSpend).toFixed(2)) : 0 }
        : { totalImpressions: 0, totalClicks: 0, totalConversions: 0, totalSpend: 0, totalRevenue: 0, avgCtr: 0, avgRoas: 0 };

      const utilization = totalBudget > 0 ? parseFloat(((totalSpent / totalBudget) * 100).toFixed(1)) : 0;
      const concentration = totalBudget > 0 ? parseFloat(campaigns.campaigns.reduce((s: number, c: any) => { const share = (c.budget?.lifetime || 0) / totalBudget; return s + share * share; }, 0).toFixed(4)) : 0;

      sendSuccess(res, { totalCampaigns, activeCampaigns, totalBudget, totalSpent, remaining: totalBudget - totalSpent, utilization, concentration, metrics });
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
    const successCount = results.filter((r) => r.success).length;
    sendSuccess(res, { results, total: ids.length, succeeded: successCount, failed: ids.length - successCount, successRate: parseFloat(((successCount / ids.length) * 100).toFixed(1)) });
  })
);

router.post(
  "/validate",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const validation = await campaignLaunchOrchestrator.validate(tenantId, req.body, req.user!.userId);
    sendSuccess(res, validation, { action: "validation_complete" });
  })
);

router.post(
  "/launch",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await campaignLaunchOrchestrator.launch(tenantId, req.body, req.user!.userId);
    if (!result.campaign) throw new AppError(400, `Campaign launch blocked: ${result.validation.recommendations.join(" ")}`);
    sendSuccess(res, result, { action: "launched" });
  })
);

router.get(
  "/portfolio/health",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const report = await portfolioHealthOrchestrator.generatePortfolioReport(tenantId);
    sendSuccess(res, report);
  })
);

router.get(
  "/budget/alerts",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const alerts = await budgetAlertOrchestrator.monitor(tenantId);
    sendSuccess(res, alerts);
  })
);

router.get(
  "/budget/alerts/critical",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const alerts = await budgetAlertOrchestrator.getCriticalAlerts(tenantId);
    sendSuccess(res, alerts, { count: alerts.length });
  })
);

router.get(
  "/metrics/timeseries",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const dayCount = safeInt(req.query.days, 30);
    const { granularity = "day" } = req.query;

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
    const utilization = totalBudget > 0 ? parseFloat(((totalSpent / totalBudget) * 100).toFixed(1)) : 0;
    const concentration = totalBudget > 0 ? parseFloat(campaigns.campaigns.reduce((s: number, c: any) => { const share = (c.budget?.lifetime || 0) / totalBudget; return s + share * share; }, 0).toFixed(4)) : 0;

    sendSuccess(res, {
      daily: metrics,
      totals: { ...totals, avgCtr: totals.totalImpressions > 0 ? parseFloat(((totals.totalClicks / totals.totalImpressions) * 100).toFixed(2)) : 0, avgRoas: totals.totalSpend > 0 ? parseFloat((totals.totalRevenue / totals.totalSpend).toFixed(2)) : 0 },
      budget: { total: totalBudget, spent: totalSpent, remaining, utilization, concentration },
      forecast: { avgDailySpend, daysRemaining, projectedEndDate, willExceedBudget: daysRemaining <= dayCount * 0.7, monthlyBurn: parseFloat((avgDailySpend * 30).toFixed(2)) },
      campaignCounts: { total: campaigns.campaigns.length, active: campaigns.campaigns.filter((c: any) => c.status === "active").length, byStatus: campaigns.campaigns.reduce((acc: Record<string, number>, c: any) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {} as Record<string, number>) },
      granularity,
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
      sendSuccess(res, campaign);
    } else {
      const campaign = await DataStore.findCampaignById(id, tenantId);
      if (!campaign) throw new AppError(404, "Campaign not found");
      const budgetUtil = (campaign as any).budget?.lifetime > 0 ? parseFloat((((campaign as any).budget?.spent || 0) / (campaign as any).budget?.lifetime * 100).toFixed(1)) : 0;
      sendSuccess(res, { ...campaign, _budgetUtilization: budgetUtil });
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
        audiences: [], creatives: [], tags: [], kpis: {},
        hyperContext: { linkedTasks: [], linkedDocs: [], linkedSheets: [], linkedCalendar: [] },
        createdBy: req.user!.userId,
      });
    }

    webhookService.emit({ type: "campaign.created", tenantId, source: "api", payload: { campaignId: campaign._id, name, type: type || "performance", platforms } });
    io.to(`tenant:${tenantId}`).emit("campaign:created", campaign);
    sendCreated(res, campaign, { action: "created" });
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
    webhookService.emit({ type: eventType, tenantId, source: "api", payload: { campaignId: id, status, name: campaign.name } });
    io.to(`campaign:${id}`).emit(`campaign:${id}:update`, { status, updatedAt: new Date().toISOString() });
    sendSuccess(res, campaign, { event: eventType });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const update = req.body;
    const allowed = ["name", "type", "status", "goal", "platforms", "tags", "kpis", "hyperContext", "creatives", "audiences", "startDate", "endDate"];
    const filtered = pickAllowed(update, allowed);
    const updated = await DataStore.updateCampaign(id, tenantId, filtered);
    if (!updated) throw new AppError(404, "Campaign not found");
    sendSuccess(res, updated, { updatedFields: Object.keys(filtered) });
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
      if (lifetime !== undefined) { update["budget.lifetime"] = lifetime; update["budget.remaining"] = lifetime - (campaign.budget?.spent || 0); }
      updated = await DataStore.updateCampaign(id, tenantId, update);
    }

    webhookService.emit({ type: "campaign.budget_updated", tenantId, source: "api", payload: { campaignId: id, daily, lifetime } });
    sendSuccess(res, updated, { action: "budget_updated" });
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
        tenantId, name: `${original.name} (Copy)`, type: original.type, budget: original.budget, platforms: original.platforms, goal: original.goal, createdBy: req.user!.userId,
      });
      sendCreated(res, cloned, { source: id });
    } else {
      const original = await DataStore.findCampaignById(id, tenantId);
      if (!original) throw new AppError(404, "Campaign not found");
      const cloned = await DataStore.createCampaign({
        tenantId, name: `${original.name} (Copy)`, type: original.type, status: "draft",
        budget: { ...original.budget, spent: 0, remaining: original.budget?.lifetime || 0 },
        platforms: [...(original.platforms || [])], goal: original.goal,
        audiences: [], creatives: [], tags: [...(original.tags || [])], kpis: {},
        hyperContext: { linkedTasks: [], linkedDocs: [], linkedSheets: [], linkedCalendar: [] },
        createdBy: req.user!.userId,
      });
      sendCreated(res, cloned, { source: id });
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

router.get(
  "/lifecycle/assess/:id",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const assessment = await campaignLifecycleOrchestrator.assessCampaign(req.params.id, req.user!.tenantId);
      sendSuccess(res, assessment);
    } catch (e: any) {
      throw new AppError(404, e.message);
    }
  })
);

router.get(
  "/lifecycle/portfolio",
  asyncHandler(async (req: Request, res: Response) => {
    const report = await campaignLifecycleOrchestrator.assessPortfolio(req.user!.tenantId);
    sendSuccess(res, report);
  })
);

router.get(
  "/budget/optimize",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const totalBudget = req.query.totalBudget ? safeInt(req.query.totalBudget, 0) : undefined;
      const report = await budgetOptimizationOrchestrator.optimize(req.user!.tenantId, totalBudget);
      sendSuccess(res, report);
    } catch (e: any) {
      throw new AppError(400, e.message);
    }
  })
);

router.get(
  "/roas/decompose/:id",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const decomposition = await roasDecompositionOrchestrator.decompose(req.params.id, req.user!.tenantId);
      sendSuccess(res, decomposition);
    } catch (e: any) {
      throw new AppError(404, e.message);
    }
  })
);

export default router;
