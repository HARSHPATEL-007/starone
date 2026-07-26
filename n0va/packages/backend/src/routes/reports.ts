import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { sendPaginated, sendSuccess, sendCreated, safeInt, computePagination } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const VALID_TEMPLATES = ["campaign_performance", "creative_summary", "budget_analysis", "platform_comparison"];

router.post(
  "/generate",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { templateId, campaignIds, dateRange } = req.body;
    if (!templateId) throw new AppError(400, "Missing required field: templateId");
    if (!VALID_TEMPLATES.includes(templateId)) throw new AppError(400, `Invalid templateId. Must be one of: ${VALID_TEMPLATES.join(", ")}`);

    const days = dateRange?.days || 30;
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 86400000).toISOString();

    let sections: any[] = [];
    let summary = "";
    let totals: any = {};

    if (templateId === "campaign_performance") {
      const filter: any = { tenantId };
      if (campaignIds?.length) filter._id = { $in: campaignIds };
      const { campaigns } = await DataStore.findCampaigns(filter);
      const metrics = await DataStore.findMetrics({ tenantId, date: { $gte: startDate } });
      const total = metrics.reduce((acc: any, m: any) => { acc.impressions += m.impressions || 0; acc.clicks += m.clicks || 0; acc.conversions += m.conversions || 0; acc.spend += m.spend || 0; acc.revenue += m.revenue || 0; return acc; }, { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });
      totals = total;
      sections = [
        { title: "Campaign Performance Overview", type: "kpi", data: { campaigns: campaigns.length, ...total, ctr: total.impressions > 0 ? parseFloat(((total.clicks / total.impressions) * 100).toFixed(2)) : 0, roas: total.spend > 0 ? parseFloat((total.revenue / total.spend).toFixed(2)) : 0 } },
        { title: "Campaign Breakdown", type: "table", data: campaigns.map((c: any) => ({ id: c._id, name: c.name, status: c.status, platforms: c.platforms?.join(", "), budget: c.budget?.lifetime, spent: c.budget?.spent, utilization: c.budget?.lifetime > 0 ? parseFloat((((c.budget?.spent || 0) / c.budget?.lifetime) * 100).toFixed(1)) : 0 })) },
        { title: "Portfolio Metrics", type: "kpi", data: { totalBudget: campaigns.reduce((s: number, c: any) => s + (c.budget?.lifetime || 0), 0), totalSpent: campaigns.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0), activeCount: campaigns.filter((c: any) => c.status === "active").length, avgCtr: total.impressions > 0 ? parseFloat(((total.clicks / total.impressions) * 100).toFixed(2)) : 0, avgRoas: total.spend > 0 ? parseFloat((total.revenue / total.spend).toFixed(2)) : 0 } },
      ];
      summary = `Campaign performance report covering ${campaigns.length} campaigns over ${days} days. Total spend: $${total.spend.toLocaleString()}, Revenue: $${total.revenue.toLocaleString()}, ROAS: ${totals.roas || 0}x.`;
    } else if (templateId === "creative_summary") {
      const creatives = await DataStore.findCreatives({ tenantId });
      const byType = creatives.reduce((acc: Record<string, number>, c: any) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, {});
      const avgCtr = creatives.length > 0 ? parseFloat((creatives.reduce((s: number, c: any) => s + (c.performance?.ctr || 0), 0) / creatives.length).toFixed(4)) : 0;
      sections = [
        { title: "Creative Summary", type: "kpi", data: { total: creatives.length, active: creatives.filter((c: any) => c.status === "active").length, approved: creatives.filter((c: any) => c.status === "approved").length, draft: creatives.filter((c: any) => c.status === "draft").length, avgCtr, byType } },
        { title: "Creative List", type: "table", data: creatives.map((c: any) => ({ id: c._id, name: c.name, type: c.type, status: c.status, headline: c.headline, ctr: c.performance?.ctr, impressions: c.performance?.impressions })) },
        { title: "Creative Type Distribution", type: "chart_data", data: Object.entries(byType).map(([type, count]) => ({ type, count })) },
      ];
      totals = { total: creatives.length, active: creatives.filter((c: any) => c.status === "active").length, avgCtr };
      summary = `Creative summary report with ${creatives.length} creatives across ${Object.keys(byType).length} types. Average CTR: ${(avgCtr * 100).toFixed(2)}%.`;
    } else if (templateId === "budget_analysis") {
      const { campaigns } = await DataStore.findCampaigns({ tenantId });
      const totalBudget = campaigns.reduce((s: number, c: any) => s + (c.budget?.lifetime || 0), 0);
      const totalSpent = campaigns.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0);
      const remaining = totalBudget - totalSpent;
      const utilization = totalBudget > 0 ? parseFloat(((totalSpent / totalBudget) * 100).toFixed(1)) : 0;
      const concentration = totalBudget > 0 ? parseFloat(campaigns.reduce((s: number, c: any) => { const share = (c.budget?.lifetime || 0) / totalBudget; return s + share * share; }, 0).toFixed(4)) : 0;
      const overBudget = campaigns.filter((c: any) => (c.budget?.spent || 0) > (c.budget?.lifetime || 0));
      const atRisk = campaigns.filter((c: any) => c.budget?.lifetime > 0 && ((c.budget?.spent || 0) / c.budget?.lifetime) > 0.8);
      totals = { totalBudget, totalSpent, remaining, utilization, concentration };
      sections = [
        { title: "Budget Overview", type: "kpi", data: { ...totals, overBudgetCount: overBudget.length, atRiskCount: atRisk.length } },
        { title: "Campaign Budget Details", type: "table", data: campaigns.map((c: any) => ({ id: c._id, name: c.name, status: c.status, daily: c.budget?.daily, lifetime: c.budget?.lifetime, spent: c.budget?.spent, remaining: c.budget?.remaining, utilization: c.budget?.lifetime > 0 ? parseFloat((((c.budget?.spent || 0) / c.budget?.lifetime) * 100).toFixed(1)) : 0 })) },
        { title: "Budget Alerts", type: "kpi", data: { overBudget: overBudget.map((c: any) => c.name), atRisk: atRisk.map((c: any) => c.name) } },
      ];
      summary = `Budget analysis: $${totalSpent.toLocaleString()} spent of $${totalBudget.toLocaleString()} budget (${utilization}% utilization). ${overBudget.length} campaign(s) over budget.`;
    } else if (templateId === "platform_comparison") {
      const metrics = await DataStore.findMetrics({ tenantId, date: { $gte: startDate } });
      const byPlatform = metrics.reduce((acc: any, m: any) => {
        const p = m.platform || "unknown";
        if (!acc[p]) acc[p] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
        acc[p].impressions += m.impressions || 0;
        acc[p].clicks += m.clicks || 0;
        acc[p].conversions += m.conversions || 0;
        acc[p].spend += m.spend || 0;
        acc[p].revenue += m.revenue || 0;
        return acc;
      }, {});
      const platformData = Object.entries(byPlatform).map(([platform, data]: [string, any]) => ({
        platform, ...data, ctr: data.impressions > 0 ? parseFloat(((data.clicks / data.impressions) * 100).toFixed(2)) : 0, roas: data.spend > 0 ? parseFloat((data.revenue / data.spend).toFixed(2)) : 0, cpa: data.conversions > 0 ? parseFloat((data.spend / data.conversions).toFixed(2)) : 0, shareOfSpend: 0,
      }));
      const totalSpendP = platformData.reduce((s: number, p: any) => s + p.spend, 0);
      if (totalSpendP > 0) platformData.forEach(p => { p.shareOfSpend = parseFloat(((p.spend / totalSpendP) * 100).toFixed(1)); });
      const grandTotal = platformData.reduce((acc: any, p: any) => { acc.impressions += p.impressions; acc.clicks += p.clicks; acc.conversions += p.conversions; acc.spend += p.spend; acc.revenue += p.revenue; return acc; }, { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });
      totals = grandTotal;
      sections = [
        { title: "Platform Comparison", type: "kpi", data: { platforms: platformData.length, ...grandTotal, avgCtr: grandTotal.impressions > 0 ? parseFloat(((grandTotal.clicks / grandTotal.impressions) * 100).toFixed(2)) : 0, avgRoas: grandTotal.spend > 0 ? parseFloat((grandTotal.revenue / grandTotal.spend).toFixed(2)) : 0 } },
        { title: "Platform Breakdown", type: "chart_data", data: platformData },
        { title: "Platform Details", type: "table", data: platformData },
      ];
      summary = `Platform comparison across ${platformData.length} platforms over ${days} days. Top platform: ${platformData.sort((a: any, b: any) => b.spend - a.spend)[0]?.platform || "N/A"}.`;
    }

    const report = DataStore.mem().insert("report_history", {
      tenantId, templateId,
      title: `${templateId.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())} Report`,
      type: templateId, generatedAt: new Date().toISOString(),
      dateRange: { days, start: startDate, end: now.toISOString() },
      sections, summary, totals, campaignIds: campaignIds || [],
    });

    sendCreated(res, report, { templateId, sections: sections.length });
  })
);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const page = safeInt(req.query.page, 1);
    const limit = safeInt(req.query.limit, 20);
    let reports = DataStore.mem().find("report_history", (r: any) => r.tenantId === tenantId).reverse();
    const total = reports.length;
    const offset = (page - 1) * limit;
    const paged = reports.slice(offset, offset + limit);
    const byType = reports.reduce((acc: Record<string, number>, r: any) => { acc[r.templateId] = (acc[r.templateId] || 0) + 1; return acc; }, {});
    const pagination = computePagination(page, limit, total);
    sendPaginated(res, paged, pagination, { byType, totalReports: total });
  })
);

router.get(
  "/schedules",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const schedules = DataStore.mem().find("report_schedules", (s: any) => s.tenantId === tenantId).reverse();
    const activeCount = schedules.filter((s: any) => s.active).length;
    sendSuccess(res, schedules, { total: schedules.length, activeCount });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const report = DataStore.mem().findOne("report_history", (r: any) => r._id === id && r.tenantId === tenantId);
    if (!report) throw new AppError(404, "Report not found");
    sendSuccess(res, report, { since: report.dateRange?.start });
  })
);

router.post(
  "/:id/schedule",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { cronExpression, templateId, recipients } = req.body;
    const report = DataStore.mem().findOne("report_history", (r: any) => r._id === id && r.tenantId === tenantId);
    if (!report) throw new AppError(404, "Report not found");
    if (!cronExpression || !templateId || !recipients) throw new AppError(400, "Missing required fields: cronExpression, templateId, recipients");
    const existingSchedules = DataStore.mem().find("report_schedules", (s: any) => s.reportId === id && s.tenantId === tenantId);
    if (existingSchedules.length >= 5) throw new AppError(400, "Maximum 5 schedules per report");
    const schedule = DataStore.mem().insert("report_schedules", { tenantId, reportId: id, reportTitle: report.title, cronExpression, templateId, recipients, active: true, createdAt: new Date().toISOString() });
    sendCreated(res, schedule, { reportId: id, reportTitle: report.title });
  })
);

router.delete(
  "/schedules/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const ok = DataStore.mem().delete("report_schedules", (s: any) => s._id === id && s.tenantId === tenantId);
    if (!ok) throw new AppError(404, "Schedule not found");
    res.status(204).send();
  })
);

router.post(
  "/:id/export",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { format } = req.body;
    const report = DataStore.mem().findOne("report_history", (r: any) => r._id === id && r.tenantId === tenantId);
    if (!report) throw new AppError(404, "Report not found");
    if (format === "json") { sendSuccess(res, report); } else { throw new AppError(400, "Unsupported export format. Supported: json"); }
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const reports = DataStore.mem().find("report_history", (r: any) => r.tenantId === tenantId);
    sendSuccess(res, { reportCount: reports.length });
  })
);

export default router;
