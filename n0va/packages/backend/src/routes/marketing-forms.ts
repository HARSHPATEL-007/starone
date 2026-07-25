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
    const { type, status } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (type) filter.type = type;
    if (status) filter.status = status;
    const forms = await DataStore.findMarketingForms(filter);
    res.json(forms);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const form = await DataStore.findMarketingFormById(id, tenantId);
    if (!form) throw new AppError(404, "Form not found");
    const submissions = await DataStore.findFormSubmissions({ tenantId, formId: id });
    res.json({ ...form, recentSubmissions: submissions });
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, type, fields } = req.body;
    if (!name || !type || !fields || !Array.isArray(fields)) throw new AppError(400, "Missing required fields: name, type, fields");
    const form = await DataStore.createMarketingForm({
      tenantId,
      name,
      type,
      fields,
      status: "draft",
      createdBy: req.user!.userId,
    });
    res.status(201).json(form);
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
    const updated = await DataStore.updateMarketingForm(id, tenantId, update);
    if (!updated) throw new AppError(404, "Form not found");
    res.json(updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const deleted = await DataStore.deleteMarketingForm(id, tenantId);
    if (!deleted) throw new AppError(404, "Form not found");
    res.status(204).send();
  })
);

router.get(
  "/:id/submissions",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const submissions = await DataStore.findFormSubmissions({ tenantId, formId: id });
    res.json(submissions);
  })
);

export default router;
