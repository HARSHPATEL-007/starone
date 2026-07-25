import { Router, Request, Response, NextFunction } from "express";
import { campaignIssueService } from "../services/CampaignIssueService";
import { AppError } from "../middleware/errorHandler";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/", asyncHandler(async (req, res) => { const { campaignId } = req.query; res.json(campaignIssueService.getIssues(req.user!.tenantId, campaignId as string)); }));
router.get("/stats", asyncHandler(async (req, res) => res.json(campaignIssueService.getStats(req.user!.tenantId))));
router.post("/", asyncHandler(async (req, res) => { const { campaignId, campaignName, title, description, severity, category } = req.body; if (!campaignId || !title) throw new AppError(400, "Campaign ID and title required"); res.status(201).json(campaignIssueService.createIssue(req.user!.tenantId, { campaignId, campaignName, title, description, severity, category })); }));
router.patch("/:id", asyncHandler(async (req, res) => { const issue = campaignIssueService.updateIssue(req.user!.tenantId, req.params.id, req.body); if (!issue) throw new AppError(404, "Issue not found"); res.json(issue); }));
router.delete("/:id", asyncHandler(async (req, res) => { campaignIssueService.deleteIssue(req.user!.tenantId, req.params.id); res.status(204).send(); }));

export default router;
