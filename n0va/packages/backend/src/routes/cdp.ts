import { Router, Request, Response, NextFunction } from "express";
import { cdpService } from "../services/CDPService";
import { cdpOrchestrator } from "../business-logic/CDPOrchestrator";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendCreated, sendPaginated, computePagination, safeInt } from "./route-utils";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/stats", asyncHandler(async (req, res) => {
  const stats = cdpService.getStats(req.user!.tenantId);
  sendSuccess(res, stats);
}));

router.get("/profiles", asyncHandler(async (req, res) => {
  const { search, segment } = req.query;
  const page = safeInt(req.query.page, 1);
  const limit = safeInt(req.query.limit, 20);
  const profiles = cdpService.getProfiles(req.user!.tenantId, search as string, segment as string);
  const arr = Array.isArray(profiles) ? profiles : [];
  const total = arr.length;
  const paginated = arr.slice((page - 1) * limit, page * limit);
  sendPaginated(res, paginated, computePagination(page, limit, total));
}));

router.get("/profiles/:id", asyncHandler(async (req, res) => {
  const p = cdpService.getProfile(req.user!.tenantId, req.params.id);
  if (!p) throw new AppError(404, "Profile not found");
  sendSuccess(res, p);
}));

router.patch("/profiles/:id", asyncHandler(async (req, res) => {
  const p = cdpService.updateProfile(req.user!.tenantId, req.params.id, req.body);
  if (!p) throw new AppError(404, "Profile not found");
  sendSuccess(res, p);
}));

router.get("/events", asyncHandler(async (req, res) => {
  const { profileId, type } = req.query;
  const page = safeInt(req.query.page, 1);
  const limit = safeInt(req.query.limit, 20);
  const events = cdpService.getEvents(req.user!.tenantId, profileId as string, type as string, 10000);
  const arr = Array.isArray(events) ? events : [];
  const total = arr.length;
  const paginated = arr.slice((page - 1) * limit, page * limit);
  const typeDist: Record<string, number> = {};
  for (const e of arr) typeDist[e.type || "unknown"] = (typeDist[e.type || "unknown"] || 0) + 1;
  sendPaginated(res, paginated, computePagination(page, limit, total), { typeDistribution: typeDist });
}));

router.get("/event-types", asyncHandler(async (req, res) => {
  const types = cdpService.getEventTypes(req.user!.tenantId);
  sendSuccess(res, types);
}));

router.get("/event-type-stats", asyncHandler(async (req, res) => {
  const stats = cdpService.getEventTypeStats(req.user!.tenantId);
  sendSuccess(res, stats);
}));

router.post("/events", asyncHandler(async (req, res) => {
  const { profileId, type, properties, channel, source, campaignId } = req.body;
  if (!profileId || !type) throw new AppError(400, "Missing required fields");
  const event = cdpService.trackEvent(req.user!.tenantId, { profileId, type, properties, channel, source, campaignId });
  sendCreated(res, event);
}));

router.get("/segments", asyncHandler(async (req, res) => {
  const segments = cdpService.getSegments(req.user!.tenantId);
  sendSuccess(res, segments, { count: Array.isArray(segments) ? segments.length : 0 });
}));

router.patch("/segments/:id", asyncHandler(async (req, res) => {
  const s = cdpService.updateSegment(req.user!.tenantId, req.params.id, req.body);
  if (!s) throw new AppError(404, "Segment not found");
  sendSuccess(res, s);
}));

router.delete("/segments/:id", asyncHandler(async (req, res) => {
  cdpService.deleteSegment(req.user!.tenantId, req.params.id);
  res.status(204).send();
}));

router.get("/identity/resolve", asyncHandler(async (req, res) => {
  const identities = cdpService.resolveIdentities(req.user!.tenantId);
  sendSuccess(res, identities);
}));

router.post("/identity/merge", asyncHandler(async (req, res) => {
  const { targetId, sourceId } = req.body;
  if (!targetId || !sourceId) throw new AppError(400, "targetId and sourceId required");
  const merged = cdpService.mergeProfiles(req.user!.tenantId, targetId, sourceId);
  if (!merged) throw new AppError(404, "One or both profiles not found");
  sendSuccess(res, merged);
}));

router.post("/lookalike", asyncHandler(async (req, res) => {
  const { seedProfileIds, options } = req.body;
  if (!seedProfileIds?.length) throw new AppError(400, "seedProfileIds required");
  const result = cdpService.generateLookalike(req.user!.tenantId, seedProfileIds, options);
  const profiles = Array.isArray(result) ? result : [];
  sendCreated(res, profiles, { count: profiles.length });
}));

router.get("/ltv/:id", asyncHandler(async (req, res) => {
  try {
    const ltv = cdpService.predictLTV(req.user!.tenantId, req.params.id);
    sendSuccess(res, ltv);
  } catch (e: any) {
    throw new AppError(404, e.message);
  }
}));

router.get("/ltv-batch", asyncHandler(async (req, res) => {
  const batch = cdpService.batchPredictLTV(req.user!.tenantId);
  sendSuccess(res, batch);
}));

router.get("/intelligence", asyncHandler(async (req, res) => {
  const report = cdpOrchestrator.getIntelligenceReport(req.user!.tenantId);
  sendSuccess(res, report);
}));

router.post("/lookalike/effectiveness", asyncHandler(async (req, res) => {
  const { seedProfileIds } = req.body;
  if (!seedProfileIds?.length) throw new AppError(400, "seedProfileIds required");
  const report = cdpOrchestrator.getLookalikeEffectiveness(req.user!.tenantId, seedProfileIds);
  sendSuccess(res, report);
}));

export default router;
