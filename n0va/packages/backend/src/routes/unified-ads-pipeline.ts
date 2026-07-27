import { Router, Request, Response, NextFunction } from "express";
import { unifiedAdsPipeline } from "../services/UnifiedAdsPipelineService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.post("/initialize", asyncHandler(async (req, res) => {
  const { campaignId } = req.body;
  const result = unifiedAdsPipeline.initializePipeline(campaignId, req.user!.tenantId);
  sendSuccess(res, result || { error: "Campaign not found" });
}));

router.get("/:pipelineId", asyncHandler(async (req, res) => {
  const result = unifiedAdsPipeline.getPipeline(req.params.pipelineId);
  sendSuccess(res, result || { error: "Pipeline not found" });
}));

router.get("/", asyncHandler(async (req, res) => {
  const { campaignId } = req.query;
  const result = unifiedAdsPipeline.listPipelines(campaignId as string, req.user!.tenantId);
  sendSuccess(res, result);
}));

router.post("/:pipelineId/advance", asyncHandler(async (req, res) => {
  const result = unifiedAdsPipeline.advanceStage(req.params.pipelineId);
  sendSuccess(res, result || { error: "Pipeline not found or already at final stage" });
}));

router.post("/:pipelineId/configure", asyncHandler(async (req, res) => {
  const result = unifiedAdsPipeline.configureStep(req.params.pipelineId, req.body.config || {});
  sendSuccess(res, result || { error: "Pipeline not found" });
}));

router.post("/:pipelineId/activate", asyncHandler(async (req, res) => {
  const result = unifiedAdsPipeline.runActivationChecks(req.params.pipelineId);
  sendSuccess(res, result || { error: "Pipeline not found" });
}));

router.get("/:pipelineId/monitor", asyncHandler(async (req, res) => {
  const result = unifiedAdsPipeline.runMonitoringCheck(req.params.pipelineId);
  sendSuccess(res, result || { error: "Pipeline not found" });
}));

router.post("/:pipelineId/optimize", asyncHandler(async (req, res) => {
  const result = unifiedAdsPipeline.runOptimizationCycle(req.params.pipelineId);
  sendSuccess(res, result || { error: "Pipeline not found" });
}));

router.get("/:pipelineId/report", asyncHandler(async (req, res) => {
  const result = unifiedAdsPipeline.generatePipelineReport(req.params.pipelineId);
  sendSuccess(res, result || { error: "Pipeline not found" });
}));

router.get("/:pipelineId/timeline", asyncHandler(async (req, res) => {
  const result = unifiedAdsPipeline.getPipelineTimeline(req.params.pipelineId);
  sendSuccess(res, result || { error: "Pipeline not found" });
}));

router.post("/:pipelineId/archive", asyncHandler(async (req, res) => {
  const result = unifiedAdsPipeline.archivePipeline(req.params.pipelineId);
  sendSuccess(res, result || { error: "Pipeline not found" });
}));

router.get("/:pipelineId/health", asyncHandler(async (req, res) => {
  const result = unifiedAdsPipeline.getPipelineHealth(req.params.pipelineId);
  sendSuccess(res, result || { error: "Pipeline not found" });
}));

router.get("/:pipelineId/validate", asyncHandler(async (req, res) => {
  const result = unifiedAdsPipeline.validatePipeline(req.params.pipelineId);
  sendSuccess(res, result || { error: "Pipeline not found" });
}));

router.post("/:pipelineId/rollback", asyncHandler(async (req, res) => {
  const result = unifiedAdsPipeline.rollbackStage(req.params.pipelineId);
  sendSuccess(res, result || { error: "Pipeline not found or at initial stage" });
}));

export default router;
