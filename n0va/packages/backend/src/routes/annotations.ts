import { Router, Request, Response, NextFunction } from "express";

const router = Router();

interface Annotation {
  id: string;
  tenantId: string;
  campaignId: string;
  date: string;
  text: string;
  type: "note" | "event" | "milestone" | "change";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const annotations: Annotation[] = [];

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/campaign/:campaignId",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { campaignId } = req.params;
    const result = annotations.filter(
      (a) => a.tenantId === tenantId && a.campaignId === campaignId
    );
    res.json(result);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { campaignId, date, text, type } = req.body;
    if (!campaignId || !date || !text) return res.status(400).json({ error: "campaignId, date, and text required" });
    const annotation: Annotation = {
      id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      campaignId,
      date,
      text,
      type: type || "note",
      createdBy: req.user!.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    annotations.push(annotation);
    res.status(201).json(annotation);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const idx = annotations.findIndex((a) => a.id === req.params.id && a.tenantId === tenantId);
    if (idx === -1) return res.status(404).json({ error: "Annotation not found" });
    const { text, type, date } = req.body;
    if (text) annotations[idx].text = text;
    if (type) annotations[idx].type = type;
    if (date) annotations[idx].date = date;
    annotations[idx].updatedAt = new Date().toISOString();
    res.json(annotations[idx]);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const idx = annotations.findIndex((a) => a.id === req.params.id && a.tenantId === tenantId);
    if (idx === -1) return res.status(404).json({ error: "Annotation not found" });
    annotations.splice(idx, 1);
    res.json({ success: true });
  })
);

export default router;
