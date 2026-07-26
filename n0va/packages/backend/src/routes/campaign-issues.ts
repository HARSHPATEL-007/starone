import { Router, Request, Response, NextFunction } from "express";
import { campaignIssueService } from "../services/CampaignIssueService";
import { campaignIssueOrchestrator } from "../business-logic/CampaignIssueOrchestrator";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/", asyncHandler(async (req, res) => {
  const { campaignId } = req.query;
  const issues = campaignIssueService.getIssues(req.user!.tenantId, campaignId as string);
  const arr = Array.isArray(issues) ? issues : [];
  const severityDist: Record<string, number> = {};
  for (const i of arr) severityDist[i.severity || "unknown"] = (severityDist[i.severity || "unknown"] || 0) + 1;
  sendSuccess(res, arr, { count: arr.length, severityDistribution: severityDist });
}));

router.get("/stats", asyncHandler(async (req, res) => {
  const stats = campaignIssueService.getStats(req.user!.tenantId);
  sendSuccess(res, stats);
}));

router.get("/orchestrate", asyncHandler(async (req, res) => {
  const report = campaignIssueOrchestrator.analyze(req.user!.tenantId);
  sendSuccess(res, report);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { campaignId, campaignName, title, description, severity, category } = req.body;
  if (!campaignId || !title) throw new AppError(400, "Campaign ID and title required");
  const issue = campaignIssueService.createIssue(req.user!.tenantId, { campaignId, campaignName, title, description, severity, category });
  sendCreated(res, issue);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const issue = campaignIssueService.updateIssue(req.user!.tenantId, req.params.id, req.body);
  if (!issue) throw new AppError(404, "Issue not found");
  sendSuccess(res, issue);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  campaignIssueService.deleteIssue(req.user!.tenantId, req.params.id);
  res.status(204).send();
}));

export default router;
