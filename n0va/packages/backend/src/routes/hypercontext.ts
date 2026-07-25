import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Task } from "../models/Task";
import { Doc } from "../models/Doc";
import { Sheet } from "../models/Sheet";
import { CalendarEvent } from "../models/CalendarEvent";
import { AppError } from "../middleware/errorHandler";
import { MemoryStore } from "../services/MemoryStore";

const router = Router();

function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

function mem() {
  return MemoryStore.getInstance();
}

const tenantedFilter = (req: Request) => ({ tenantId: req.user!.tenantId });

// ---- Tasks ----
router.get(
  "/tasks",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (isConnected()) {
      const tasks = await Task.find({ tenantId }).sort({ createdAt: -1 }).lean();
      return res.json(tasks);
    }
    res.json(mem().find("tasks", (t: any) => t.tenantId === tenantId));
  })
);

router.get(
  "/tasks/:id",
  asyncHandler(async (req: Request, res: Response) => {
    if (isConnected()) {
      const task = await Task.findById(req.params.id).lean();
      if (!task) throw new AppError(404, "Task not found");
      return res.json(task);
    }
    const task = mem().findOne("tasks", (t: any) => t._id === req.params.id);
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
    if (isConnected()) {
      const task = await Task.create({
        tenantId, title, description, campaignId,
        status: "todo", priority: priority || "medium",
        assignee, dueDate, source: "n0va",
        createdBy: new mongoose.Types.ObjectId(req.user!.userId),
      });
      return res.status(201).json(task);
    }
    const task = mem().insert("tasks", {
      tenantId, title, description, campaignId,
      status: "todo", priority: priority || "medium",
      assignee, dueDate, source: "n0va", createdBy: req.user!.userId,
    });
    res.status(201).json(task);
  })
);

router.patch(
  "/tasks/:id",
  asyncHandler(async (req: Request, res: Response) => {
    if (isConnected()) {
      const task = await Task.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }).lean();
      if (!task) throw new AppError(404, "Task not found");
      return res.json(task);
    }
    const task = mem().update("tasks", (t: any) => t._id === req.params.id, req.body);
    if (!task) throw new AppError(404, "Task not found");
    res.json(task);
  })
);

router.delete(
  "/tasks/:id",
  asyncHandler(async (req: Request, res: Response) => {
    if (isConnected()) {
      const result = await Task.findByIdAndDelete(req.params.id);
      if (!result) throw new AppError(404, "Task not found");
      return res.status(204).send();
    }
    const deleted = mem().delete("tasks", (t: any) => t._id === req.params.id);
    if (!deleted) throw new AppError(404, "Task not found");
    res.status(204).send();
  })
);

// ---- Docs ----
router.get(
  "/docs",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (isConnected()) {
      const docs = await Doc.find({ tenantId }).sort({ createdAt: -1 }).lean();
      return res.json(docs);
    }
    res.json(mem().find("docs", (d: any) => d.tenantId === tenantId));
  })
);

router.get(
  "/docs/:id",
  asyncHandler(async (req: Request, res: Response) => {
    if (isConnected()) {
      const doc = await Doc.findById(req.params.id).lean();
      if (!doc) throw new AppError(404, "Doc not found");
      return res.json(doc);
    }
    const doc = mem().findOne("docs", (d: any) => d._id === req.params.id);
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
    if (isConnected()) {
      const doc = await Doc.create({
        tenantId, title, content,
        type: type || "other", campaignId, source: "n0va",
        tags: tags || [],
        createdBy: new mongoose.Types.ObjectId(req.user!.userId),
      });
      return res.status(201).json(doc);
    }
    const doc = mem().insert("docs", {
      tenantId, title, content, type: type || "other",
      campaignId, source: "n0va", tags: tags || [], createdBy: req.user!.userId,
    });
    res.status(201).json(doc);
  })
);

router.patch(
  "/docs/:id",
  asyncHandler(async (req: Request, res: Response) => {
    if (isConnected()) {
      const doc = await Doc.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }).lean();
      if (!doc) throw new AppError(404, "Doc not found");
      return res.json(doc);
    }
    const doc = mem().update("docs", (d: any) => d._id === req.params.id, req.body);
    if (!doc) throw new AppError(404, "Doc not found");
    res.json(doc);
  })
);

router.delete(
  "/docs/:id",
  asyncHandler(async (req: Request, res: Response) => {
    if (isConnected()) {
      const result = await Doc.findByIdAndDelete(req.params.id);
      if (!result) throw new AppError(404, "Doc not found");
      return res.status(204).send();
    }
    const deleted = mem().delete("docs", (d: any) => d._id === req.params.id);
    if (!deleted) throw new AppError(404, "Doc not found");
    res.status(204).send();
  })
);

// ---- Sheets ----
router.get(
  "/sheets",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (isConnected()) {
      const sheets = await Sheet.find({ tenantId }).sort({ createdAt: -1 }).lean();
      return res.json(sheets);
    }
    res.json(mem().find("sheets", (s: any) => s.tenantId === tenantId));
  })
);

router.get(
  "/sheets/:id",
  asyncHandler(async (req: Request, res: Response) => {
    if (isConnected()) {
      const sheet = await Sheet.findById(req.params.id).lean();
      if (!sheet) throw new AppError(404, "Sheet not found");
      return res.json(sheet);
    }
    const sheet = mem().findOne("sheets", (s: any) => s._id === req.params.id);
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
    if (isConnected()) {
      const sheet = await Sheet.create({
        tenantId, title, type: type || "custom",
        campaignId, rows: rows || 0, columns: columns || 0,
        source: "n0va", createdBy: new mongoose.Types.ObjectId(req.user!.userId),
      });
      return res.status(201).json(sheet);
    }
    const sheet = mem().insert("sheets", {
      tenantId, title, type: type || "custom",
      campaignId, rows: rows || 0, columns: columns || 0,
      source: "n0va", createdBy: req.user!.userId,
    });
    res.status(201).json(sheet);
  })
);

router.patch(
  "/sheets/:id",
  asyncHandler(async (req: Request, res: Response) => {
    if (isConnected()) {
      const sheet = await Sheet.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }).lean();
      if (!sheet) throw new AppError(404, "Sheet not found");
      return res.json(sheet);
    }
    const sheet = mem().update("sheets", (s: any) => s._id === req.params.id, req.body);
    if (!sheet) throw new AppError(404, "Sheet not found");
    res.json(sheet);
  })
);

router.delete(
  "/sheets/:id",
  asyncHandler(async (req: Request, res: Response) => {
    if (isConnected()) {
      const result = await Sheet.findByIdAndDelete(req.params.id);
      if (!result) throw new AppError(404, "Sheet not found");
      return res.status(204).send();
    }
    const deleted = mem().delete("sheets", (s: any) => s._id === req.params.id);
    if (!deleted) throw new AppError(404, "Sheet not found");
    res.status(204).send();
  })
);

// ---- Calendar Events ----
router.get(
  "/calendar",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (isConnected()) {
      const events = await CalendarEvent.find({ tenantId }).sort({ startDate: 1 }).lean();
      return res.json(events);
    }
    res.json(mem().find("calendar_events", (e: any) => e.tenantId === tenantId));
  })
);

router.get(
  "/calendar/:id",
  asyncHandler(async (req: Request, res: Response) => {
    if (isConnected()) {
      const event = await CalendarEvent.findById(req.params.id).lean();
      if (!event) throw new AppError(404, "Calendar event not found");
      return res.json(event);
    }
    const event = mem().findOne("calendar_events", (e: any) => e._id === req.params.id);
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
    if (isConnected()) {
      const event = await CalendarEvent.create({
        tenantId, title, description,
        startDate: new Date(startDate), endDate: new Date(endDate),
        type: type || "other", campaignId, source: "n0va",
        createdBy: new mongoose.Types.ObjectId(req.user!.userId),
      });
      return res.status(201).json(event);
    }
    const event = mem().insert("calendar_events", {
      tenantId, title, description,
      startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(),
      type: type || "other", campaignId, source: "n0va", createdBy: req.user!.userId,
    });
    res.status(201).json(event);
  })
);

router.patch(
  "/calendar/:id",
  asyncHandler(async (req: Request, res: Response) => {
    if (isConnected()) {
      const event = await CalendarEvent.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }).lean();
      if (!event) throw new AppError(404, "Calendar event not found");
      return res.json(event);
    }
    const event = mem().update("calendar_events", (e: any) => e._id === req.params.id, req.body);
    if (!event) throw new AppError(404, "Calendar event not found");
    res.json(event);
  })
);

router.delete(
  "/calendar/:id",
  asyncHandler(async (req: Request, res: Response) => {
    if (isConnected()) {
      const result = await CalendarEvent.findByIdAndDelete(req.params.id);
      if (!result) throw new AppError(404, "Calendar event not found");
      return res.status(204).send();
    }
    const deleted = mem().delete("calendar_events", (e: any) => e._id === req.params.id);
    if (!deleted) throw new AppError(404, "Calendar event not found");
    res.status(204).send();
  })
);

export default router;


