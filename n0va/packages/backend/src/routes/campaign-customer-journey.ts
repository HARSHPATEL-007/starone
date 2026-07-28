import { Router, Request, Response, NextFunction } from "express";
import { campaignCustomerJourney } from "../services/CampaignCustomerJourneyService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/journeys", asyncHandler(async (req, res) => {
  const result = campaignCustomerJourney.analyzeCustomerJourneys(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/journey-segments", asyncHandler(async (req, res) => {
  const result = campaignCustomerJourney.analyzeJourneySegments(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/journey-optimizations", asyncHandler(async (req, res) => {
  const result = campaignCustomerJourney.generateJourneyOptimizations(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/journey-drop-offs", asyncHandler(async (req, res) => {
  const result = campaignCustomerJourney.analyzeJourneyDropOffs(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/journey-time-buckets", asyncHandler(async (req, res) => {
  const result = campaignCustomerJourney.analyzeJourneyTimeBuckets(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/common-paths", asyncHandler(async (req, res) => {
  const report = campaignCustomerJourney.analyzeCustomerJourneys(req.user!.tenantId);
  sendSuccess(res, report.commonPaths);
}));

export default router;
