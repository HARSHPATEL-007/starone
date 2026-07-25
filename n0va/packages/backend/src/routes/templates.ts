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
    const { type, goal, tag } = req.query;
    const filter: Record<string, any> = { tenantId };
    if (type) filter.type = type;
    if (goal) filter.goal = goal;
    if (tag) filter.tags = tag;
    const templates = DataStore.mem().find("campaign_templates", (t: any) => {
      for (const [k, v] of Object.entries(filter)) {
        if (k === "tags") { if (!t.tags?.includes(v)) return false; }
        else if (t[k] !== v) return false;
      }
      return true;
    }).reverse();
    res.json(templates);
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, description, type, dailyBudget, lifetimeBudget, platforms, goal, tags, creatives, audiences } = req.body;
    if (!name) throw new AppError(400, "Missing required field: name");
    const template = DataStore.mem().insert("campaign_templates", {
      tenantId,
      name,
      description: description || "",
      type: type || "performance",
      dailyBudget: dailyBudget || 0,
      lifetimeBudget: lifetimeBudget || 0,
      platforms: platforms || [],
      goal: goal || "",
      tags: tags || [],
      creatives: creatives || [],
      audiences: audiences || [],
      useCount: 0,
      createdBy: req.user!.userId,
    });
    res.status(201).json(template);
  })
);

router.get(
  "/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const templates = DataStore.mem().find("campaign_templates", (t: any) => t.tenantId === tenantId);
    const total = templates.length;
    const mostUsed = templates.slice().sort((a: any, b: any) => b.useCount - a.useCount)[0] || null;
    const usageByType: Record<string, number> = {};
    for (const t of templates) {
      usageByType[t.type] = (usageByType[t.type] || 0) + t.useCount;
    }
    res.json({ total, mostUsed, usageByType });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const template = DataStore.mem().findOne("campaign_templates", (t: any) => t._id === req.params.id && t.tenantId === tenantId);
    if (!template) throw new AppError(404, "Template not found");
    res.json(template);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const allowed = ["name", "description", "type", "dailyBudget", "lifetimeBudget", "platforms", "goal", "tags", "creatives", "audiences"];
    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const updated = DataStore.mem().update("campaign_templates", (t: any) => t._id === req.params.id && t.tenantId === tenantId, update);
    if (!updated) throw new AppError(404, "Template not found");
    res.json(updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const deleted = DataStore.mem().delete("campaign_templates", (t: any) => t._id === req.params.id && t.tenantId === tenantId);
    if (!deleted) throw new AppError(404, "Template not found");
    res.status(204).send();
  })
);

router.post(
  "/:id/apply",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const template = DataStore.mem().findOne("campaign_templates", (t: any) => t._id === req.params.id && t.tenantId === tenantId);
    if (!template) throw new AppError(404, "Template not found");
    const campaignName = req.body.campaignName || `${template.name} (from template)`;
    const campaign = await DataStore.createCampaign({
      tenantId,
      name: campaignName,
      status: "draft",
      type: template.type,
      budget: {
        daily: template.dailyBudget || 0,
        lifetime: template.lifetimeBudget || 0,
        currency: "USD",
        spent: 0,
        remaining: template.lifetimeBudget || 0,
      },
      platforms: [...(template.platforms || [])],
      goal: template.goal,
      audiences: [...(template.audiences || [])],
      creatives: [...(template.creatives || [])],
      tags: [...(template.tags || [])],
      createdBy: req.user!.userId,
    });
    DataStore.mem().update("campaign_templates", (t: any) => t._id === req.params.id && t.tenantId === tenantId, { useCount: template.useCount + 1 });
    res.status(201).json(campaign);
  })
);

export default router;
