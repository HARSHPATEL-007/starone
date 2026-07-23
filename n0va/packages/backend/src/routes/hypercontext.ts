import { Router, Request, Response, NextFunction } from "express";
import { MemoryStore } from "../services/MemoryStore";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

function store() {
  return MemoryStore.getInstance();
}

// ---- Tasks ----
router.get(
  "/tasks",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const tasks = store().find("tasks", (t: any) => t.tenantId === tenantId);
    res.json(tasks);
  })
);

router.get(
  "/tasks/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const task = store().findOne("tasks", (t: any) => t._id === req.params.id);
    if (!task) throw new AppError(404, "Task not found");
    res.json(task);
  })
);

router.post(
  "/tasks",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { title, description, campaignId, priority, assignee, dueDate } = req.body;
    if (!title) throw new AppError(400, "Missing required field: title");
    const task = store().insert("tasks", {
      tenantId, title, description, campaignId,
      status: "todo",
      priority: priority || "medium",
      assignee, dueDate,
      source: "n0va",
      createdBy: req.user!.userId,
    });
    res.status(201).json(task);
  })
);

router.patch(
  "/tasks/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const task = store().update("tasks", (t: any) => t._id === req.params.id, req.body);
    if (!task) throw new AppError(404, "Task not found");
    res.json(task);
  })
);

router.delete(
  "/tasks/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = store().delete("tasks", (t: any) => t._id === req.params.id);
    if (!deleted) throw new AppError(404, "Task not found");
    res.status(204).send();
  })
);

// ---- Docs ----
router.get(
  "/docs",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const docs = store().find("docs", (d: any) => d.tenantId === tenantId);
    res.json(docs);
  })
);

router.get(
  "/docs/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const doc = store().findOne("docs", (d: any) => d._id === req.params.id);
    if (!doc) throw new AppError(404, "Doc not found");
    res.json(doc);
  })
);

router.post(
  "/docs",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { title, content, type, campaignId, tags } = req.body;
    if (!title) throw new AppError(400, "Missing required field: title");
    const doc = store().insert("docs", {
      tenantId, title, content,
      type: type || "other",
      campaignId,
      source: "n0va",
      tags: tags || [],
      createdBy: req.user!.userId,
    });
    res.status(201).json(doc);
  })
);

router.delete(
  "/docs/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = store().delete("docs", (d: any) => d._id === req.params.id);
    if (!deleted) throw new AppError(404, "Doc not found");
    res.status(204).send();
  })
);

// ---- Sheets ----
router.get(
  "/sheets",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const sheets = store().find("sheets", (s: any) => s.tenantId === tenantId);
    res.json(sheets);
  })
);

router.get(
  "/sheets/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const sheet = store().findOne("sheets", (s: any) => s._id === req.params.id);
    if (!sheet) throw new AppError(404, "Sheet not found");
    res.json(sheet);
  })
);

router.post(
  "/sheets",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { title, type, campaignId, rows, columns } = req.body;
    if (!title) throw new AppError(400, "Missing required field: title");
    const sheet = store().insert("sheets", {
      tenantId, title,
      type: type || "custom",
      campaignId,
      rows: rows || 0, columns: columns || 0,
      source: "n0va",
      createdBy: req.user!.userId,
    });
    res.status(201).json(sheet);
  })
);

router.delete(
  "/sheets/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = store().delete("sheets", (s: any) => s._id === req.params.id);
    if (!deleted) throw new AppError(404, "Sheet not found");
    res.status(204).send();
  })
);

// ---- Calendar Events ----
router.get(
  "/calendar",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const events = store().find("calendar_events", (e: any) => e.tenantId === tenantId);
    res.json(events);
  })
);

router.get(
  "/calendar/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const event = store().findOne("calendar_events", (e: any) => e._id === req.params.id);
    if (!event) throw new AppError(404, "Calendar event not found");
    res.json(event);
  })
);

router.post(
  "/calendar",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { title, description, startDate, endDate, type, campaignId } = req.body;
    if (!title || !startDate || !endDate) throw new AppError(400, "Missing required fields: title, startDate, endDate");
    const event = store().insert("calendar_events", {
      tenantId, title, description,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      type: type || "other",
      campaignId,
      source: "n0va",
      createdBy: req.user!.userId,
    });
    res.status(201).json(event);
  })
);

router.delete(
  "/calendar/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = store().delete("calendar_events", (e: any) => e._id === req.params.id);
    if (!deleted) throw new AppError(404, "Calendar event not found");
    res.status(204).send();
  })
);

export default router;
