import { Router, Request, Response, NextFunction } from "express";
import { campaignExperimentation } from "../services/CampaignExperimentationService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/experiments", asyncHandler(async (req, res) => {
  const status = req.query.status as string | undefined;
  const list = campaignExperimentation.listExperiments(req.user!.tenantId, status as any);
  sendSuccess(res, list);
}));

router.get("/experiments/:expId", asyncHandler(async (req, res) => {
  const exp = campaignExperimentation.getExperiment(req.params.expId, req.user!.tenantId);
  sendSuccess(res, exp || { error: "Experiment not found" });
}));

router.post("/experiments", asyncHandler(async (req, res) => {
  const exp = campaignExperimentation.createExperiment(req.user!.tenantId, req.body);
  sendSuccess(res, exp);
}));

router.put("/experiments/:expId", asyncHandler(async (req, res) => {
  const exp = campaignExperimentation.updateExperiment(req.params.expId, req.user!.tenantId, req.body);
  sendSuccess(res, exp || { error: "Experiment not found" });
}));

router.delete("/experiments/:expId", asyncHandler(async (req, res) => {
  const deleted = campaignExperimentation.deleteExperiment(req.params.expId, req.user!.tenantId);
  sendSuccess(res, { deleted });
}));

router.post("/experiments/:expId/start", asyncHandler(async (req, res) => {
  const exp = campaignExperimentation.startExperiment(req.params.expId, req.user!.tenantId);
  sendSuccess(res, exp || { error: "Experiment cannot be started" });
}));

router.post("/experiments/:expId/complete", asyncHandler(async (req, res) => {
  const exp = campaignExperimentation.completeExperiment(req.params.expId, req.user!.tenantId);
  sendSuccess(res, exp || { error: "Experiment cannot be completed" });
}));

router.post("/experiments/:expId/metrics", asyncHandler(async (req, res) => {
  const { variantId, date, metrics } = req.body;
  const exp = campaignExperimentation.recordMetrics(req.params.expId, req.user!.tenantId, variantId, date, metrics);
  sendSuccess(res, exp || { error: "Metrics not recorded" });
}));

router.get("/summary", asyncHandler(async (req, res) => {
  const summary = campaignExperimentation.getExperimentSummary(req.user!.tenantId);
  sendSuccess(res, summary);
}));

export default router;