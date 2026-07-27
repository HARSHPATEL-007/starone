import { Router, Request, Response, NextFunction } from "express";
import { incrementalityTestingService } from "../services/IncrementalityTestingService";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/did",
  asyncHandler(async (req: Request, res: Response) => {
    const { experimentId, name, treatmentRegions, controlRegions, metric, treatmentStart, treatmentEnd, prePeriodData, postPeriodData } = req.body;
    if (!experimentId || !treatmentRegions || !controlRegions) return res.status(400).json({ error: "experimentId, treatmentRegions, controlRegions required" });
    const result = incrementalityTestingService.runDiD(experimentId, name || "experiment", treatmentRegions, controlRegions, metric || "conversions", treatmentStart, treatmentEnd, prePeriodData || [], postPeriodData || []);
    sendSuccess(res, result);
  }),
);

router.post(
  "/synthetic-control",
  asyncHandler(async (req: Request, res: Response) => {
    const { experimentId, name, treatedRegion, donorPool, metric, treatmentStart, treatmentEnd, prePeriodData, postPeriodData } = req.body;
    if (!experimentId || !treatedRegion || !donorPool) return res.status(400).json({ error: "experimentId, treatedRegion, donorPool required" });
    const result = incrementalityTestingService.runSyntheticControl(experimentId, name || "experiment", treatedRegion, donorPool, metric || "conversions", treatmentStart, treatmentEnd, prePeriodData || [], postPeriodData || []);
    sendSuccess(res, result);
  }),
);

router.post(
  "/cuped",
  asyncHandler(async (req: Request, res: Response) => {
    const { experimentId, name, metric, prePeriodData, postPeriodData } = req.body;
    if (!experimentId || !prePeriodData || !postPeriodData) return res.status(400).json({ error: "experimentId, prePeriodData, postPeriodData required" });
    const result = incrementalityTestingService.runCUPED(experimentId, name || "experiment", metric || "conversions", prePeriodData, postPeriodData);
    sendSuccess(res, result);
  }),
);

router.post(
  "/power-analysis",
  asyncHandler(async (req: Request, res: Response) => {
    const { baselineMean, baselineStd, minimumLift, alpha, beta, sampleSizePerArm } = req.body;
    if (!baselineMean || !baselineStd) return res.status(400).json({ error: "baselineMean and baselineStd required" });
    const result = incrementalityTestingService.powerAnalysis(baselineMean, baselineStd, minimumLift || 0.1, alpha || 0.05, beta || 0.2, sampleSizePerArm);
    sendSuccess(res, result);
  }),
);

router.post(
  "/geo-experiment",
  asyncHandler(async (req: Request, res: Response) => {
    const { experimentId, name, treatmentRegions, controlRegions, metric, treatmentStart, treatmentEnd, prePeriodData, postPeriodData, method } = req.body;
    if (!experimentId || !treatmentRegions || !controlRegions) return res.status(400).json({ error: "experimentId, treatmentRegions, controlRegions required" });
    const result = incrementalityTestingService.runGeoExperiment(experimentId, name || "experiment", treatmentRegions, controlRegions, metric || "conversions", treatmentStart, treatmentEnd, prePeriodData || [], postPeriodData || [], method || "did");
    sendSuccess(res, result);
  }),
);

router.get(
  "/sample-data",
  asyncHandler(async (req: Request, res: Response) => {
    const regions = req.query.regions ? (req.query.regions as string).split(",") : ["us_east", "us_west", "us_central", "eu_west", "eu_north"];
    const days = parseInt(req.query.days as string) || 30;
    const treatmentRegions = req.query.treatment ? (req.query.treatment as string).split(",") : ["us_east"];
    const preData = incrementalityTestingService.generateSamplePrePeriodData(regions, days);
    const postData = incrementalityTestingService.generateSamplePostPeriodData(regions, treatmentRegions, Math.min(days, 14), 15);
    sendSuccess(res, { prePeriodData: preData, postPeriodData: postData, regions, treatmentRegions });
  }),
);

export default router;
