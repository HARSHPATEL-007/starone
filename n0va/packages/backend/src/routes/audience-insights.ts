import { Router, Request, Response, NextFunction } from "express";
import { audienceInsightsService } from "../services/AudienceInsightsService";
import { audienceInsightsOrchestrator } from "../business-logic/AudienceInsightsOrchestrator";
import { sendSuccess, sendPaginated, computePagination, safeInt } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/insights",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const audienceId = req.query.audienceId as string | undefined;
    const page = safeInt(req.query.page, 1);
    const limit = safeInt(req.query.limit, 20);
    const insights = audienceInsightsService.getInsights(tenantId, audienceId);
    const arr = Array.isArray(insights) ? insights : [insights];
    const total = arr.length;
    const start = (page - 1) * limit;
    const paginated = arr.slice(start, start + limit);
    const meta: Record<string, unknown> = {};
    const valid = arr.filter((i: any) => i && typeof i === "object" && i.reach != null);
    const avgROAS = valid.length > 0 ? Math.round(valid.reduce((s: number, i: any) => s + (i.roas || 0), 0) / valid.length * 100) / 100 : 0;
    const totalSpend = valid.reduce((s: number, i: any) => s + (i.estimatedSpend || 0), 0);
    if (valid.length > 0) { meta.avgROAS = avgROAS; meta.totalSpend = Math.round(totalSpend * 100) / 100; meta.totalSegments = valid.length; }
    sendPaginated(res, paginated, computePagination(page, limit, total), Object.keys(meta).length > 0 ? meta : undefined);
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const dashboard = audienceInsightsOrchestrator.getDashboard(req.user!.tenantId);
    sendSuccess(res, dashboard, {
      totalAudiences: dashboard.totalAudiences,
      clusterCount: dashboard.clusters.length,
      overlapWarnings: dashboard.overlapWarnings.length,
      topAudience: dashboard.topAudience,
    });
  })
);

router.get(
  "/lookalike",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const insights = audienceInsightsService.getLookalikeInsights(tenantId);
    const arr = Array.isArray(insights) ? insights : [insights];
    const meta: Record<string, unknown> = {};
    const valid = arr.filter((i: any) => i && i.sourceAudience);
    meta.totalLookalikes = arr.length;
    const totalPotential = valid.reduce((s: number, i: any) => s + (i.potentialReach || 0), 0);
    meta.totalPotentialReach = totalPotential;
    sendSuccess(res, arr, meta);
  })
);

export default router;
