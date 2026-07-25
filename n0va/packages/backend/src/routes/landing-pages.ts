import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { status, search } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }
    const pages = await DataStore.findLandingPages(filter);
    res.json(pages);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const page = await DataStore.findLandingPageById(id, tenantId);
    if (!page) throw new AppError(404, "Landing page not found");
    res.json(page);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { title, slug, template } = req.body;
    if (!title || !slug || !template) throw new AppError(400, "Missing required fields: title, slug, template");
    const page = await DataStore.createLandingPage({
      tenantId,
      title,
      slug,
      template,
      status: "draft",
      createdBy: req.user!.userId,
    });
    res.status(201).json(page);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { title, slug, template, status, content, seo } = req.body;
    const update: Record<string, any> = {};
    if (title) update.title = title;
    if (slug) update.slug = slug;
    if (template) update.template = template;
    if (status) update.status = status;
    if (content) update.content = content;
    if (seo) update.seo = seo;
    const updated = await DataStore.updateLandingPage(id, tenantId, update);
    if (!updated) throw new AppError(404, "Landing page not found");
    res.json(updated);
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

export default router;
