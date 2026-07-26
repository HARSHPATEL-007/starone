import { Router, Request, Response, NextFunction } from "express";
import { landingPageBuilderService } from "../services/LandingPageBuilderService";
import { landingPageOrchestrator } from "../business-logic/LandingPageOrchestrator";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/templates", asyncHandler(async (_req, res) => {
  const templates = landingPageBuilderService.getTemplates();
  sendSuccess(res, templates, { count: Array.isArray(templates) ? templates.length : 0 });
}));

router.get("/", asyncHandler(async (req, res) => {
  const pages = landingPageBuilderService.getPages(req.user!.tenantId);
  sendSuccess(res, pages, { count: Array.isArray(pages) ? pages.length : 0 });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const p = landingPageBuilderService.getPage(req.user!.tenantId, req.params.id);
  if (!p) throw new AppError(404, "Page not found");
  sendSuccess(res, p);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { name, slug, template, campaignId } = req.body;
  if (!name || !template) throw new AppError(400, "Name and template required");
  const page = landingPageBuilderService.createPage(req.user!.tenantId, { name, slug, template, campaignId });
  sendCreated(res, page);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const p = landingPageBuilderService.updatePage(req.user!.tenantId, req.params.id, req.body);
  if (!p) throw new AppError(404, "Page not found");
  sendSuccess(res, p);
}));

router.post("/:id/publish", asyncHandler(async (req, res) => {
  const p = landingPageBuilderService.publishPage(req.user!.tenantId, req.params.id);
  if (!p) throw new AppError(404, "Page not found");
  sendSuccess(res, p, { action: "published" });
}));

router.get("/orchestrate/dashboard", asyncHandler(async (req, res) => {
  const dashboard = landingPageOrchestrator.getDashboard(req.user!.tenantId);
  sendSuccess(res, dashboard, {
    totalPages: dashboard.totalPages,
    pagesNeedingAttention: dashboard.pagesNeedingAttention.length,
    avgConversionPrediction: dashboard.avgConversionPrediction,
    avgSeoScore: dashboard.avgSeoScore,
  });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  landingPageBuilderService.deletePage(req.user!.tenantId, req.params.id);
  res.status(204).send();
}));

export default router;
