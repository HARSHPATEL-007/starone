import { Router, Request, Response, NextFunction } from "express";
import { landingPageBuilderService } from "../services/LandingPageBuilderService";
import { AppError } from "../middleware/errorHandler";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/templates", asyncHandler(async (_req, res) => res.json(landingPageBuilderService.getTemplates())));
router.get("/", asyncHandler(async (req, res) => res.json(landingPageBuilderService.getPages(req.user!.tenantId))));
router.get("/:id", asyncHandler(async (req, res) => { const p = landingPageBuilderService.getPage(req.user!.tenantId, req.params.id); if (!p) throw new AppError(404, "Page not found"); res.json(p); }));
router.post("/", asyncHandler(async (req, res) => { const { name, slug, template, campaignId } = req.body; if (!name || !template) throw new AppError(400, "Name and template required"); res.status(201).json(landingPageBuilderService.createPage(req.user!.tenantId, { name, slug, template, campaignId })); }));
router.patch("/:id", asyncHandler(async (req, res) => { const p = landingPageBuilderService.updatePage(req.user!.tenantId, req.params.id, req.body); if (!p) throw new AppError(404, "Page not found"); res.json(p); }));
router.post("/:id/publish", asyncHandler(async (req, res) => { const p = landingPageBuilderService.publishPage(req.user!.tenantId, req.params.id); if (!p) throw new AppError(404, "Page not found"); res.json(p); }));
router.delete("/:id", asyncHandler(async (req, res) => { landingPageBuilderService.deletePage(req.user!.tenantId, req.params.id); res.status(204).send(); }));

export default router;
