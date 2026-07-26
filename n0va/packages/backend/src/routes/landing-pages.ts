import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendCreated, sendPaginated, computePagination, safeInt } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { status, search } = req.query;
    const page = safeInt(req.query.page, 1);
    const limit = safeInt(req.query.limit, 20);
    const filter: Record<string, any> = { tenantId };
    if (status) filter.status = status;
    if (search) filter.$or = [{ title: { $regex: search, $options: "i" } }, { slug: { $regex: search, $options: "i" } }];
    const pages = await DataStore.findLandingPages(filter);
    const arr = Array.isArray(pages) ? pages : [];
    const total = arr.length;
    const paginated = arr.slice((page - 1) * limit, page * limit);
    const statusDist: Record<string, number> = {};
    for (const p of arr) statusDist[p.status || "unknown"] = (statusDist[p.status || "unknown"] || 0) + 1;
    sendPaginated(res, paginated, computePagination(page, limit, total), { statusDistribution: statusDist });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const pages = await DataStore.findLandingPages({ tenantId });
    const page = Array.isArray(pages) ? pages.find((p: any) => p._id === id) : null;
    if (!page) throw new AppError(404, "Landing page not found");
    sendSuccess(res, page);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { title, slug, content, templateId, campaignId, status } = req.body;
    if (!title || !slug) throw new AppError(400, "Missing required fields: title, slug");
    const page = await DataStore.createLandingPage({
      tenantId, title, slug, content: content || "", templateId, campaignId,
      status: status || "draft", createdBy: req.user!.userId, createdAt: new Date(),
    });
    sendCreated(res, page);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const update = req.body;
    delete update.tenantId;
    delete update._id;
    const updated = await DataStore.updateLandingPage(id, tenantId, update);
    if (!updated) throw new AppError(404, "Landing page not found");
    sendSuccess(res, updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const deleted = await DataStore.deleteLandingPage(id, tenantId);
    if (!deleted) throw new AppError(404, "Landing page not found");
    res.status(204).send();
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const pages = await DataStore.findLandingPages({ tenantId });
    const arr = Array.isArray(pages) ? pages : [];
    const byStatus: Record<string, number> = {};
    let totalVisits = 0, totalConversions = 0, totalSeoScore = 0;
    for (const p of arr) {
      byStatus[p.status || "unknown"] = (byStatus[p.status || "unknown"] || 0) + 1;
      totalVisits += p.visits || 0;
      totalConversions += p.conversions || 0;
      totalSeoScore += p.seoScore || 0;
    }
    const avgConversionRate = totalVisits > 0 ? parseFloat(((totalConversions / totalVisits) * 100).toFixed(2)) : 0;
    const avgSeoScore = arr.length > 0 ? parseFloat((totalSeoScore / arr.length).toFixed(2)) : 0;
    sendSuccess(res, {
      totalPages: arr.length,
      byStatus,
      avgConversionRate,
      totalVisits,
      totalConversions,
      avgSeoScore,
    });
  })
);

export default router;
